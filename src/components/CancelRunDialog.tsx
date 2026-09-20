import { useEffect, useRef } from "react";

export default function CancelRunDialog({
  stopping,
  error,
  onKeepWaiting,
  onCancelRun,
}: {
  stopping: boolean;
  error: string;
  onKeepWaiting: () => void;
  onCancelRun: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="key-dialog cancel-run-dialog"
      aria-labelledby="cancel-run-heading"
      onCancel={(event) => {
        event.preventDefault();
        if (!stopping) onKeepWaiting();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !stopping) onKeepWaiting();
      }}
    >
      <h2 id="cancel-run-heading">Cancel this run?</h2>
      <p>
        This stops the studio from tracking the run. BFL may still finish it and
        charge for it, so check your BFL usage before starting another.
      </p>
      {error && (
        <p className="cancel-run-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button
          type="button"
          className="text-button"
          disabled={stopping}
          onClick={onKeepWaiting}
        >
          No, keep waiting
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={stopping}
          onClick={onCancelRun}
        >
          {stopping ? "Cancelling…" : "Yes, cancel"}
        </button>
      </div>
    </dialog>
  );
}
