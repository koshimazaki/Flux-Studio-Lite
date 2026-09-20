import { isTerminal } from "../shared/types";
import { selectedJob, cleanJobUrl, jobHistoryState } from "./job-links";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Job, Source, GenerateInput } from "../shared/types";
export function preserveStoppedJobs(current: Job[], incoming: Job[]): Job[] {
  const stopped = new Map(
    current
      .filter((job) => job.status === "stopped")
      .map((job) => [job.id, job]),
  );
  const merged = incoming.map((job) => stopped.get(job.id) ?? job);
  for (const job of stopped.values())
    if (!merged.some((candidate) => candidate.id === job.id)) merged.push(job);
  return merged;
}

function preserveStoppedUpdate(current: Job, incoming: Job): Job {
  return current.status === "stopped" ? current : incoming;
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, { ...options, cache: "no-store" });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || data.message || "The request could not be completed.",
    );
  return data;
}
export function useJobs(key: string) {
  const [jobs, setJobs] = useState<Job[]>([]),
    [sources, setSources] = useState<Source[]>([]),
    [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(() =>
    selectedJob(location.href, history.state),
  );
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  const keyRef = useRef(key);
  keyRef.current = key;
  const needsKey =
    !key &&
    jobs.some((job) => job.keyMode === "byo" && !isTerminal(job.status));
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const pollError = useRef("");
  const refresh = useCallback(async () => {
    const data = await request<{ jobs: Job[]; sources: Source[] }>(
      "/api/history",
    );
    const linkedId = selectedRef.current;
    if (linkedId && !data.jobs.some((job) => job.id === linkedId)) {
      try {
        const linked = await request<{ job: Job }>(
          `/api/jobs/${encodeURIComponent(linkedId)}`,
          { headers: keyRef.current ? { "x-byo-key": keyRef.current } : {} },
        );
        data.jobs.push(linked.job);
      } catch {
        setError(
          "That job is unavailable in this browser session. Showing your latest clip.",
        );
        setSelectedId(null);
        history.replaceState(
          jobHistoryState(history.state, null),
          "",
          cleanJobUrl(location.href),
        );
      }
    }
    setJobs((current) => preserveStoppedJobs(current, data.jobs));
    setSources(data.sources);
  }, []);
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
          (j) => !isTerminal(j.status),
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
              current.map((j) =>
                j.id === result.job.id
                  ? preserveStoppedUpdate(j, result.job)
                  : j,
              ),
            );
            // A poll that recovers retracts its own banner. Errors raised
            // elsewhere stay until their own owner clears them.
            if (pollError.current) {
              const recovered = pollError.current;
              pollError.current = "";
              setError((current) => (current === recovered ? "" : current));
            }
            if (result.job.status === "Ready") await refresh();
          } catch (e) {
            if (!cancelled) {
              const message =
                e instanceof Error ? e.message : "Could not refresh the job.";
              pollError.current = message;
              setError(message);
            }
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
  useEffect(() => {
    const navigate = () => {
      setSelectedId(selectedJob(location.href, history.state));
    };
    // Migrate old ?job links without losing the selected clip on reload.
    history.replaceState(
      jobHistoryState(history.state, selectedRef.current),
      "",
      cleanJobUrl(location.href),
    );
    window.addEventListener("popstate", navigate);
    return () => window.removeEventListener("popstate", navigate);
  }, []);
  useEffect(() => {
    void refresh().catch((e) => setError(e.message));
  }, [selectedId, refresh]);
  function selectJob(id: string) {
    setSelectedId(id);
    history.replaceState(
      jobHistoryState(history.state, id),
      "",
      cleanJobUrl(location.href),
    );
    document.getElementById("main-video")?.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
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
    selectJob(job.id);
    return job;
  }
  async function stop(id: string) {
    setError("");
    const { job } = await request<{ job: Job }>(
      `/api/jobs/${encodeURIComponent(id)}/stop`,
      { method: "POST" },
    );
    setJobs((current) =>
      current.map((candidate) => (candidate.id === job.id ? job : candidate)),
    );
    return job;
  }
  return {
    jobs,
    sources,
    error,
    setError,
    needsKey,
    refresh,
    generate,
    stop,
    selectJob,
    selectedId,
    featuredJob: jobs.find((job) => job.id === selectedId) ?? jobs[0],
  };
}
