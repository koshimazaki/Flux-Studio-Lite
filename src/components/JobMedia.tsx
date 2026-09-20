import { useEffect, useRef, useState } from "react";
import type { Job } from "../../shared/types";
import { isTerminal } from "../../shared/types";
import { WaitField } from "./WaitField";

export const statusLabel = (status: string) =>
  (
    ({
      submitting: "Sending to BFL",
      Pending: "Queued",
      Reasoning: "Planning the scene",
      Generating: "Generating",
      copying: "Saving your clip",
      expired: "Result expired",
      Error: "Could not finish",
      "Request Moderated": "Prompt moderated",
      "Content Moderated": "Result moderated",
    }) as Record<string, string>
  )[status] || status;

export default function JobMedia({ job }: { job: Job }) {
  const video = useRef<HTMLVideoElement>(null);
  const arrivedHere = useRef(job.status !== "Ready");
  const [decoded, setDecoded] = useState(false);
  const [revealed, setRevealed] = useState(!arrivedHere.current);
  const [mediaError, setMediaError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const waiting = !isTerminal(job.status);
  const unavailable = job.status === "Ready" && job.mediaAvailable === false;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waiting]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) video.current?.pause();
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  return (
    <div className="job-placeholder">
      {!unavailable && job.status === "Ready" && job.resultUrl && (
        <video
          ref={video}
          src={job.resultUrl}
          preload="auto"
          muted
          playsInline
          loop
          controls={decoded}
          aria-label={job.description}
          onLoadedData={() => setDecoded(true)}
          onError={() => setMediaError(true)}
          onPlay={() =>
            document.querySelectorAll("video").forEach((item) => {
              if (item !== video.current) item.pause();
            })
          }
        />
      )}
      {!unavailable &&
        (waiting || (!revealed && !mediaError && job.status === "Ready")) && (
          <WaitField
            active={waiting || !decoded}
            onDone={() => setRevealed(true)}
          />
        )}
      {(waiting || job.status !== "Ready" || mediaError || unavailable) && (
        <div className="job-message" role="status">
          {!waiting && <span className="status-dot" />}
          {!waiting && (
            <strong>
              {unavailable
                ? "Video no longer stored"
                : mediaError
                  ? "Video could not load"
                  : statusLabel(job.status)}
            </strong>
          )}
          <p>
            {mediaError && !unavailable
              ? "Your saved clip is still available. Try loading it again."
              : job.error ||
                (job.status === "copying"
                  ? "Your clip is almost ready."
                  : job.generator === "upscale"
                    ? "Bringing out the finer details."
                    : "Your scene is taking shape.")}
          </p>
          {waiting && (
            <span className="elapsed">
              {Math.max(
                0,
                Math.floor((now - new Date(job.createdAt).getTime()) / 1000),
              )}
              s elapsed ·{" "}
              {job.keyMode === "byo"
                ? "keep this tab open to save your clip"
                : "you can keep exploring"}
            </span>
          )}
          {mediaError && !unavailable && (
            <button
              className="text-button"
              onClick={() => {
                setMediaError(false);
                video.current?.load();
              }}
            >
              Reload video
            </button>
          )}
        </div>
      )}
    </div>
  );
}
