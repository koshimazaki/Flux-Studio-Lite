import { lazy, Suspense, useRef, useState, type CSSProperties } from "react";
import {
  cameraSections,
  cameraLabel,
  CAMERA_GUIDE_URL,
  type CameraSelection,
} from "../../shared/camera";
import CameraPanelExpanded from "./CameraPanelExpanded";
import CameraPresetGrid from "./CameraPresetGrid";
import CameraGlyph from "./CameraGlyph";
import Icon from "./Icon";
const CameraPreview = lazy(() => import("../scene/CameraPreview"));

export default function CameraPanel({
  selected,
  onSelect,
}: {
  selected: CameraSelection;
  onSelect: (selection: CameraSelection) => void;
}) {
  const [expanded, setExpanded] = useState(
    () =>
      new URLSearchParams(location.search).get("camera-layout") === "expanded",
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [replay, setReplay] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const section = cameraSections[activeIndex];
  const example = section.terms.find(
    (term) => term.id === selected[section.id],
  );
  function compare() {
    const next = !expanded;
    setExpanded(next);
    const url = new URL(location.href);
    if (next) url.searchParams.set("camera-layout", "expanded");
    else url.searchParams.delete("camera-layout");
    history.replaceState(null, "", url);
  }
  return (
    <>
      {expanded ? (
        <CameraPanelExpanded selected={selected} onSelect={onSelect} />
      ) : (
        <section
          className="camera-panel camera-panel--tabs"
          aria-label="Camera direction"
        >
          <div className="camera-choices">
            <div
              className="camera-tabs"
              role="tablist"
              aria-label="Camera sections"
              style={
                {
                  "--active-tab": activeIndex,
                  "--section-color": `var(${section.color})`,
                } as CSSProperties
              }
            >
              <span className="camera-tab-indicator" aria-hidden="true" />
              {cameraSections.map((item, index) => {
                const choice = item.terms.find(
                  (term) => term.id === selected[item.id],
                );
                return (
                  <button
                    key={item.id}
                    ref={(element) => {
                      tabs.current[index] = element;
                    }}
                    type="button"
                    role="tab"
                    id={`tab-${item.id}`}
                    aria-controls={
                      activeIndex === index ? `panel-${item.id}` : undefined
                    }
                    aria-label={`${item.label}: ${choice?.label ?? "None"}`}
                    title={`${item.label}: ${choice?.label ?? "None"}`}
                    aria-selected={activeIndex === index}
                    tabIndex={activeIndex === index ? 0 : -1}
                    style={
                      {
                        "--section-color": `var(${item.color})`,
                      } as CSSProperties
                    }
                    onClick={() => setActiveIndex(index)}
                    onKeyDown={(event) => {
                      const next =
                        event.key === "ArrowRight"
                          ? (index + 1) % 3
                          : event.key === "ArrowLeft"
                            ? (index + 2) % 3
                            : event.key === "Home"
                              ? 0
                              : event.key === "End"
                                ? 2
                                : null;
                      if (next !== null) {
                        event.preventDefault();
                        setActiveIndex(next);
                        tabs.current[next]?.focus();
                      }
                    }}
                  >
                    <span className="camera-tab-label">
                      <span>{item.label}</span>
                      <strong>{choice?.label ?? "None"}</strong>
                    </span>
                    <span
                      className={`camera-tab-choice ${choice ? "has-choice" : ""}`}
                      aria-hidden="true"
                    >
                      {choice ? (
                        <CameraGlyph section={item} term={choice} />
                      ) : (
                        "—"
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              key={section.id}
              className="camera-tab-panel"
              role="tabpanel"
              id={`panel-${section.id}`}
              aria-labelledby={`tab-${section.id}`}
              style={
                { "--section-color": `var(${section.color})` } as CSSProperties
              }
            >
              <CameraPresetGrid
                section={section}
                selected={selected[section.id]}
                onSelect={(id) => {
                  onSelect({ ...selected, [section.id]: id });
                  setReplay((value) => value + 1);
                }}
              />
            </div>
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
                  onClick={() => setReplay((value) => value + 1)}
                >
                  <Icon name="refresh" size={15} />
                </button>
              </div>
              <span className="preview-disclaimer">
                Motion guide · results may vary
              </span>
            </div>
            {example && (
              <details key={example.id} className="camera-example">
                <summary>{example.label} · example</summary>
                <p>{example.description}</p>
                <p>{example.example}</p>
                <a
                  href={`${CAMERA_GUIDE_URL}#${section.anchor}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Studio example · see BFL’s examples ↗
                </a>
              </details>
            )}
          </div>
        </section>
      )}
      <div className="camera-layout-compare">
        <button className="text-button" onClick={compare}>
          {expanded ? "Try tabbed view" : "Compare expanded view"}
          <Icon name="grid" size={11} />
        </button>
      </div>
    </>
  );
}
