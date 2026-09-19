import { useEffect, useRef, useState } from "react";
import {
  cameraClauses,
  type CameraSelection,
  type CameraEdits,
} from "../../shared/camera";
import CameraPanel from "./CameraPanel";
import Icon from "./Icon";

export default function CameraDialog({
  selected,
  edits,
  onApply,
  onClose,
}: {
  selected: CameraSelection;
  edits: CameraEdits;
  onApply: (selected: CameraSelection, edits: CameraEdits) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(selected);
  const [phrases, setPhrases] = useState(edits);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="camera-dialog"
      aria-labelledby="camera-heading"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <div>
          <h2 id="camera-heading">Camera controls</h2>
          <p>Choose any combination. Leave the rest at None.</p>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Cancel camera changes"
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="camera-dialog-body">
        <CameraPanel selected={draft} onSelect={setDraft} />
        <div className="camera-phrases">
          {cameraClauses(draft, phrases).map(({ section, term, text }) => (
            <label key={term.id}>
              {section.label}
              <input
                value={text}
                maxLength={600}
                onChange={(e) =>
                  setPhrases({ ...phrases, [term.id]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
      </div>
      <div className="camera-dialog-actions">
        <button className="text-button" onClick={onClose}>
          Cancel
        </button>
        <button
          className="primary-button"
          onClick={() => onApply(draft, phrases)}
        >
          Done <Icon name="arrow" size={16} />
        </button>
      </div>
    </dialog>
  );
}
