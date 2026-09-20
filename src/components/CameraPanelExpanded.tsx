import { lazy, Suspense, useState, type CSSProperties } from "react";
import {
  cameraSections,
  cameraClauses,
  cameraLabel,
  CAMERA_GUIDE_URL,
  CAMERA_GUIDE_SECTION_COUNT,
  type CameraSelection,
  type CameraTermId,
} from "../../shared/camera";
import CameraGlyph from "./CameraGlyph";
import Icon from "./Icon";
const CameraPreview = lazy(() => import("../scene/CameraPreview"));
export default function CameraPanelExpanded({
  selected,
  onSelect,
}: {
  selected: CameraSelection;
  onSelect: (selection: CameraSelection) => void;
}) {
  const [replay, setReplay] = useState(0);
  const [exampleId, setExampleId] = useState<CameraTermId>("orbit");
  const active = cameraClauses(selected);
  const example =
    active.find(({ term }) => term.id === exampleId) ?? active.at(-1);
  return (
    <section className="camera-panel" aria-label="Camera direction">
      <div className="camera-choices">
        {cameraSections.map((section) => (
          <div
            className="camera-section"
            key={section.id}
            style={
              { "--section-color": `var(${section.color})` } as CSSProperties
            }
          >
            <div className="section-eyebrow">
              <a
                href={`${CAMERA_GUIDE_URL}#${section.anchor}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {section.label} <Icon name="arrow" size={10} />
              </a>
              <span>{section.terms.length} terms · choose one</span>
            </div>
            <div className="preset-row" role="group" aria-label={section.label}>
              <button
                className={`preset preset-none ${selected[section.id] === null ? "selected" : ""}`}
                aria-pressed={selected[section.id] === null}
                onClick={() => onSelect({ ...selected, [section.id]: null })}
              >
                <span aria-hidden="true">—</span>
                <span>None</span>
              </button>
              {section.terms.map((term) => (
                <button
                  key={term.id}
                  className={`preset ${selected[section.id] === term.id ? "selected" : ""}`}
                  aria-pressed={selected[section.id] === term.id}
                  title={term.description}
                  onClick={() => {
                    onSelect({ ...selected, [section.id]: term.id });
                    setExampleId(term.id);
                    setReplay((v) => v + 1);
                  }}
                >
                  <CameraGlyph section={section} term={term} />
                  <span>{term.label}</span>
                  <i className="selection-dot" />
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="camera-note">
          <a href={CAMERA_GUIDE_URL} target="_blank" rel="noopener noreferrer">
            {cameraSections.length} of {CAMERA_GUIDE_SECTION_COUNT} sections
            from the BFL guide <Icon name="arrow" size={10} />
          </a>
        </p>
      </div>
      <div className="camera-preview-column">
        <div className="preview-wrap">
          <Suspense
            fallback={
              <div className="preview-fallback">Preparing the camera…</div>
            }
          >
            <CameraPreview selection={selected} replay={replay} />
          </Suspense>
          <div className="preview-caption">
            <div>
              <span className="section-eyebrow">COMBINED PREVIEW</span>
              <strong>{cameraLabel(selected)}</strong>
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
        {example && (
          <details className="camera-example">
            <summary>{example.term.label} · example</summary>
            <p>{example.term.description}</p>
            <p>{example.term.example}</p>
            <a
              href={`${CAMERA_GUIDE_URL}#${example.section.anchor}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Studio example · see BFL’s examples ↗
            </a>
          </details>
        )}
      </div>
    </section>
  );
}
