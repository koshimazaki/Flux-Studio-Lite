import { useEffect, useRef } from "react";
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
  const ref = useRef<HTMLDialogElement>(null);
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
        Used through this studio to contact BFL. Held only in this open page’s
        memory; never saved to browser storage or the server. Reloading
        disconnects it.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const key = new FormData(e.currentTarget).get("apiKey");
          onSave(typeof key === "string" ? key.trim() : "");
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
          name="apiKey"
          defaultValue={value}
          placeholder="Enter your API key"
          maxLength={512}
        />
        <div className="dialog-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              onSave("");
              onClose();
            }}
          >
            Disconnect
          </button>
          <button className="primary-button" type="submit">
            Use key <Icon name="arrow" />
          </button>
        </div>
      </form>
      <p className="key-footnote">
        {serverKey
          ? "A local server key is also configured. Disconnecting returns to the local connection."
          : "Library clips need no key. Live runs use your BFL credits."}
      </p>
    </dialog>
  );
}
