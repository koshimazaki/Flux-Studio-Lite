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
      <h2>Connect for this visit.</h2>
      <p>
        Paste your BFL API key to check credits and generate. It stays in this
        page’s memory and is cleared when you refresh or disconnect. The app
        never saves it.
      </p>
      <p className="key-footnote">
        Requests pass through our server to BFL. Finished clips remain in this
        browser’s library after refresh, without reconnecting your key.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const key = new FormData(e.currentTarget).get("apiKey");
          onSave(typeof key === "string" ? key.trim() : "");
          onClose();
        }}
      >
        <label htmlFor="api-key">BFL API key</label>
        <input
          id="api-key"
          type="password"
          autoComplete="off"
          name="apiKey"
          defaultValue={value}
          placeholder="Enter your API key"
          maxLength={512}
          minLength={8}
          required
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
            Connect key <Icon name="arrow" />
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
