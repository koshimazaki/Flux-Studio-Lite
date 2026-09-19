import { lazy, Suspense, useState } from "react";
import { presets, CAMERA_GUIDE_URL } from "../../shared/presets";
import type { PresetId } from "../../shared/types";
import CameraGlyph from "./CameraGlyph";
import Icon from "./Icon";
const CameraPreview = lazy(() => import("../scene/CameraPreview"));
export default function CameraPanel({
  selected,
  onSelect,
}: {
  selected: PresetId;
  onSelect: (id: PresetId) => void;
}) {
  const [replay, setReplay] = useState(0);
  const preset = presets.find((p) => p.id === selected)!;
  return (
    <section className="camera-panel" aria-label="Camera movement">
      <div className="camera-choices">
        <div className="section-eyebrow">
          <span>01 / CAMERA DIRECTION</span>
          <span>8 moves</span>
        </div>
        <div className="preset-grid">
          {presets.map((p) => (
            <button
              key={p.id}
              className={`preset ${p.id === selected ? "selected" : ""}`}
              aria-pressed={p.id === selected}
              onClick={() => {
                onSelect(p.id);
                setReplay((v) => v + 1);
              }}
            >
              <CameraGlyph preset={p.id} />
              <span>{p.label}</span>
              <i className="selection-dot" />
            </button>
          ))}
        </div>
        <p className="camera-note">
          <a href={CAMERA_GUIDE_URL} target="_blank" rel="noopener noreferrer">
            BFL camera guide <Icon name="arrow" size={10} />
          </a>
          <span>
            {preset.wording === "documented"
              ? "Editable camera wording"
              : "Editable direction variant"}
          </span>
        </p>
      </div>
      <div className="preview-wrap">
        <Suspense
          fallback={
            <div className="preview-fallback">Preparing the camera…</div>
          }
        >
          <CameraPreview preset={selected} replay={replay} />
        </Suspense>
        <div className="preview-caption">
          <div>
            <span className="section-eyebrow">PRESET PREVIEW</span>
            <strong>{preset.label}</strong>
          </div>
          <button
            className="icon-button"
            aria-label="Replay camera preview"
            onClick={() => setReplay((v) => v + 1)}
          >
            <Icon name="refresh" size={15} />
          </button>
        </div>
        <span className="preview-disclaimer">
          Motion guide · results may vary
        </span>
      </div>
    </section>
  );
}
