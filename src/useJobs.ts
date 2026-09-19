import { useCallback, useEffect, useRef, useState } from "react";
import type { Job, Source, GenerateInput } from "../shared/types";
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || data.message || "The request could not be completed.",
    );
  return data;
}
const terminal = new Set([
  "Ready",
  "Error",
  "expired",
  "Request Moderated",
  "Content Moderated",
]);
export function useJobs(key: string) {
  const [jobs, setJobs] = useState<Job[]>([]),
    [sources, setSources] = useState<Source[]>([]),
    [error, setError] = useState("");
  const needsKey =
    !key &&
    jobs.some((job) => job.keyMode === "byo" && !terminal.has(job.status));
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const refresh = useCallback(async () => {
    const data = await request<{ jobs: Job[]; sources: Source[] }>(
      "/api/history",
    );
    setJobs(data.jobs);
    setSources(data.sources);
  }, []);
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  useEffect(() => {
    let cancelled = false,
      inFlight = false,
      timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function poll() {
      if (inFlight || cancelled) return;
      inFlight = true;
      if (!document.hidden) {
        for (const job of jobsRef.current.filter(
          (j) => !terminal.has(j.status),
        )) {
          try {
            const result = await request<{ job: Job; needsKey?: boolean }>(
              `/api/jobs/${job.id}`,
              {
                headers: key ? { "x-byo-key": key } : {},
                signal: controller.signal,
              },
            );
            if (cancelled) return;
            setJobs((current) =>
              current.map((j) => (j.id === result.job.id ? result.job : j)),
            );
            if (result.job.status === "Ready") await refresh();
          } catch (e) {
            if (!cancelled)
              setError(
                e instanceof Error ? e.message : "Could not refresh the job.",
              );
          }
        }
      }
      inFlight = false;
      if (!cancelled) timer = setTimeout(poll, 4000);
    }
    const visibility = () => {
      if (!document.hidden) {
        clearTimeout(timer);
        void poll();
      }
    };
    timer = setTimeout(poll, 700);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [key, refresh]);
  async function generate(input: GenerateInput) {
    setError("");
    const { job } = await request<{ job: Job }>("/api/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
        ...(key ? { "x-byo-key": key } : {}),
      },
      body: JSON.stringify(input),
    });
    setJobs((current) => [job, ...current.filter((j) => j.id !== job.id)]);
    history.replaceState(null, "", `?job=${encodeURIComponent(job.id)}`);
    return job;
  }
  return { jobs, sources, error, setError, needsKey, refresh, generate };
}
