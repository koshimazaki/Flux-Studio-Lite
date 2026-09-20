import {
  open,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { MAX_RESULT_BYTES } from "../shared/lifecycle";
import { parseLibrary } from "../shared/library";
import { MAX_INPUT_BYTES, checkUpscaleLimits, inspectMp4 } from "../shared/mp4";
import type { Source } from "../shared/types";
import { AppError } from "./errors";

export { MAX_INPUT_BYTES };

/**
 * Inspect an MP4 with the same bounded reader the Worker uses. This used to
 * shell out to ffprobe, which meant two implementations of one job: they
 * disagreed on duration, and the binary is absent from a stock CI runner.
 * One reader keeps local and hosted estimates equal by construction.
 */
export async function probeVideo(
  file: string,
): Promise<Pick<Source, "width" | "height" | "duration">> {
  let handle;
  try {
    handle = await open(file, "r");
  } catch {
    // The callers hand this a file the server just wrote or received, so a
    // file it cannot open is its own problem, not a bad upload.
    throw new AppError(500, "The server could not open the stored video.");
  }
  try {
    const { size } = await handle.stat();
    return await inspectMp4(size, async (offset, length) => {
      const bytes = new Uint8Array(length);
      const { bytesRead } = await handle.read(bytes, 0, length, offset);
      return bytes.buffer.slice(0, bytesRead);
    });
  } catch {
    throw new AppError(400, "This file is not a readable MP4 video.");
  } finally {
    await handle.close();
  }
}

export async function validateUpscaleSource(file: string) {
  const metadata = await probeVideo(file);
  try {
    // shared/mp4.ts holds the one copy of these ceilings, so an upload is
    // judged by the same rule whichever adapter received it.
    checkUpscaleLimits(metadata, (await stat(file)).size);
  } catch (error) {
    throw new AppError(400, (error as Error).message);
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
