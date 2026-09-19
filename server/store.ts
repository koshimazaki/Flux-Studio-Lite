import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Job, Source } from "../shared/types";

export interface StoredJob extends Job {
  sessionId: string;
  idempotencyKey: string;
  providerId?: string;
  pollingUrl?: string;
  resultRemoteUrl?: string;
  lastPolledAt?: number;
}
export interface StoredSource extends Source {
  sessionId: string;
  filePath: string;
}
interface Data {
  jobs: StoredJob[];
  sources: StoredSource[];
}

// A single local process owns this file. The cloud adapter will use D1 transactions.
export class Store {
  data: Data = { jobs: [], sources: [] };
  private writes = Promise.resolve();
  constructor(readonly directory: string) {}

  async load() {
    await mkdir(path.join(this.directory, "media"), {
      recursive: true,
      mode: 0o700,
    });
    try {
      this.data = JSON.parse(
        await readFile(path.join(this.directory, "jobs.json"), "utf8"),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    // Never automatically repeat a submission whose acceptance was not recorded.
    for (const job of this.data.jobs) {
      if (job.status === "submitting") {
        job.status = "Error";
        job.error =
          "Submission was interrupted. Check your BFL usage before starting another generation.";
      }
    }
    await this.save();
  }

  save(): Promise<void> {
    const snapshot = JSON.stringify(this.data, null, 2);
    const write = this.writes
      .catch(() => {})
      .then(async () => {
        const temporary = path.join(this.directory, "jobs.json.tmp");
        await writeFile(temporary, snapshot, { mode: 0o600 });
        await rename(temporary, path.join(this.directory, "jobs.json"));
      });
    this.writes = write;
    return write;
  }
}

export function publicJob(job: StoredJob): Job {
  const {
    sessionId: _session,
    idempotencyKey: _request,
    providerId: _provider,
    pollingUrl: _poll,
    resultRemoteUrl: _result,
    lastPolledAt: _last,
    ...visible
  } = job;
  return visible;
}
export function publicSource(source: StoredSource): Source {
  const { sessionId: _session, filePath: _file, ...visible } = source;
  return visible;
}
