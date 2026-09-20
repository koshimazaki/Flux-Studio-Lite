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
}: {
  generator: Generator;
  submitting: boolean;
  activeJob?: Job;
  hasKey: boolean;
  disabled: boolean;
  onSubmit: () => void;
  onResume: () => void;
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
    <button
      className={`generate-button${busy ? " is-generating" : ""}`}
      onClick={needsKey ? onResume : onSubmit}
      // A run in flight cannot be called off: BFL has no cancel endpoint, so
      // the only thing a button here could stop is collecting what you paid
      // for. Hide the card instead; the poller keeps going.
      disabled={busy || (!needsKey && disabled)}
      aria-busy={busy}
      title={
        needsKey
          ? "Reconnect your key to finish this job"
          : waiting
            ? "BFL is still working on this run"
            : undefined
      }
    >
      <span>{label}</span>
      <span className="generate-button-icon" aria-hidden="true">
        {busy ? <GenerationIndicator /> : <Icon name="arrow" size={18} />}
      </span>
    </button>
  );
}
