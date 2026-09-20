import { useEffect, useRef, useState } from "react";
import type { Job } from "../../shared/types";
import { isTerminal } from "../../shared/types";
import { WaitField } from "./WaitField";
import Clip from "./Clip";

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

export default function JobMedia({
  job,
  onOpen,
}: {
  job: Job;
  /** Passing this gives a finished job the same contract as a library clip:
   * a play button that opens the lightbox rather than inline controls. */
  onOpen?: () => void;
}) {
  const arrivedHere = useRef(job.status !== "Ready");
  const [decoded, setDecoded] = useState(false);
  const [revealed, setRevealed] = useState(!arrivedHere.current);
  const [mediaError, setMediaError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const waiting = !isTerminal(job.status);
  const unavailable = job.status === "Ready" && job.mediaAvailable === false;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waiting]);
  return (
    <div className="job-placeholder">
      {!unavailable && job.status === "Ready" && job.resultUrl && (
        <Clip
          // Remounting is how "Reload video" retries: one element, one source.
          key={attempt}
          url={job.resultUrl}
          label={job.description || "Your latest generation"}
          // The reveal waits on the first frame, which metadata alone is not.
          preload="auto"
          onReady={() => setDecoded(true)}
          onError={() => setMediaError(true)}
          onOpen={onOpen}
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
                setAttempt((value) => value + 1);
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
