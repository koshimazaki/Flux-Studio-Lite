import type { Generator, Job } from "../../shared/types";
import { isTerminal } from "../../shared/types";
import GenerationIndicator from "./GenerationIndicator";
import Icon from "./Icon";

export default function GenerateButton({
  generator,
  submitting,
  activeJob,
  hasKey,
  disabled,
  onSubmit,
  onResume,
  onCancel,
}: {
  generator: Generator;
  submitting: boolean;
  activeJob?: Job;
  hasKey: boolean;
  disabled: boolean;
  onSubmit: () => void;
  onResume: () => void;
  onCancel: () => void;
}) {
  const waiting = activeJob && !isTerminal(activeJob.status);
  const needsKey = waiting && activeJob.keyMode === "byo" && !hasKey;
  const busy = submitting || Boolean(waiting && !needsKey);
  const label = submitting
    ? "Sending…"
    : needsKey
      ? "Resume"
      : waiting
        ? activeJob.status === "copying"
          ? "Saving…"
          : activeJob.status === "Pending"
            ? "Queued…"
            : activeJob.status === "Reasoning"
              ? "Planning…"
              : generator === "upscale"
                ? "Upscaling…"
                : "Generating…"
        : generator === "video"
          ? "Generate"
          : "Upscale";
  return (
    <>
      <button
        className={`generate-button${busy ? " is-generating" : ""}`}
        onClick={needsKey ? onResume : waiting ? onCancel : onSubmit}
        disabled={submitting || (!waiting && !needsKey && disabled)}
        aria-busy={busy}
        title={
          needsKey
            ? "Reconnect your key to finish this job"
            : waiting
              ? "Stop tracking this run"
              : undefined
        }
      >
        <span>{label}</span>
        <span className="generate-button-icon" aria-hidden="true">
          {busy ? <GenerationIndicator /> : <Icon name="arrow" size={18} />}
        </span>
      </button>
      {needsKey && (
        <button className="text-button" onClick={onCancel}>
          Cancel run
        </button>
      )}
    </>
  );
}
