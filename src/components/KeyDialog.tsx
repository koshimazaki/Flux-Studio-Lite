import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
export default function KeyDialog({
  value,
  onSave,
  onClose,
  serverKey,
}: {
  value: string;
  onSave: (key: string) => void;
  onClose: () => void;
  serverKey: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [draft, setDraft] = useState(value);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="key-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-heading">
        <span className="section-eyebrow">YOUR CONNECTION</span>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close key settings"
        >
          <Icon name="close" />
        </button>
      </div>
      <h2>Bring your own key.</h2>
      <p>
        Sent to BFL for each request. Kept in this tab’s session only; never
        saved to the server.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft.trim());
          onClose();
        }}
      >
        <input
          name="username"
          autoComplete="username"
          value="bfl-api-key"
          readOnly
          className="sr-only"
          tabIndex={-1}
        />
        <label htmlFor="api-key">BFL API key</label>
        <input
          id="api-key"
          type="password"
          autoComplete="current-password"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Enter your API key"
          maxLength={512}
        />
        <div className="dialog-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setDraft("");
              onSave("");
              onClose();
            }}
          >
            Forget key
          </button>
          <button className="primary-button" type="submit">
            Use key <Icon name="arrow" />
          </button>
        </div>
      </form>
      <p className="key-footnote">
        {serverKey
          ? "A local server key is also connected. Forgetting your key returns to the local connection."
          : "Library clips need no key. Live runs use your BFL credits."}
      </p>
    </dialog>
  );
}
