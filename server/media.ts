import { execFile } from "node:child_process";
import { readFile, realpath, rename, stat, unlink } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { promisify } from "node:util";
import { MAX_RESULT_BYTES } from "../shared/lifecycle";
import { parseLibrary } from "../shared/library";
import type { Source } from "../shared/types";
import { AppError } from "./errors";

const execute = promisify(execFile);
export const MAX_INPUT_BYTES = 50_000_000;

export async function probeVideo(
  file: string,
): Promise<Pick<Source, "width" | "height" | "duration">> {
  try {
    const { stdout } = await execute(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height:format=duration,format_name",
        "-of",
        "json",
        file,
      ],
      { timeout: 15_000, maxBuffer: 100_000 },
    );
    const value = JSON.parse(stdout);
    const width = Number(value.streams?.[0]?.width);
    const height = Number(value.streams?.[0]?.height);
    const duration = Number(value.format?.duration);
    if (
      !String(value.format?.format_name).includes("mp4") ||
      ![width, height, duration].every((n) => Number.isFinite(n) && n > 0)
    )
      throw new Error("Invalid media");
    return { width, height, duration };
  } catch {
    throw new AppError(
      400,
      "This file is not a readable MP4 video. Local video inspection requires ffprobe.",
    );
  }
}

export async function validateUpscaleSource(file: string) {
  const metadata = await probeVideo(file);
  const { width, height, duration } = metadata;
  if (
    (await stat(file)).size > MAX_INPUT_BYTES ||
    duration > 20 ||
    width * height > 2560 * 1440 ||
    Math.max(width, height) > 2560
  ) {
    throw new AppError(
      400,
      "Use an MP4 up to 20 seconds, 50 MB, and 2560 × 1440 pixels.",
    );
  }
  return metadata;
}

export async function loadSamples(publicDirectory: string): Promise<Source[]> {
  try {
    // The Worker imports the same catalogue at build time; one parser validates both.
    return parseLibrary(
      JSON.parse(
        await readFile(
          path.join(publicDirectory, "media/gallery.json"),
          "utf8",
        ),
      ),
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

export async function sampleFile(
  source: Source,
  publicDirectory: string,
): Promise<string> {
  const base = await realpath(path.join(publicDirectory, "media"));
  const file = await realpath(path.resolve(publicDirectory, `.${source.url}`));
  if (!file.startsWith(`${base}${path.sep}`))
    throw new AppError(400, "Invalid sample path.");
  return file;
}

export async function saveDownload(
  response: Response,
  destination: string,
): Promise<void> {
  const maxBytes = MAX_RESULT_BYTES;
  if (Number(response.headers.get("content-length")) > maxBytes)
    throw new AppError(
      502,
      "The generated file exceeds this prototype’s download limit.",
    );
  let bytes = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      callback(
        bytes > maxBytes ? new Error("Download limit exceeded") : null,
        chunk,
      );
    },
  });
  const temporary = `${destination}.part`;
  try {
    await pipeline(
      Readable.fromWeb(response.body as never),
      limit,
      createWriteStream(temporary, { mode: 0o600 }),
    );
    if (!bytes) throw new Error("Empty video");
    await rename(temporary, destination);
  } catch {
    await unlink(temporary).catch(() => {});
    throw new AppError(
      502,
      "The video download was interrupted. It will be retried.",
    );
  }
}
