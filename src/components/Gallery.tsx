import { isTerminal } from "../../shared/types";
import { useState } from "react";
import type { Job, Source } from "../../shared/types";
import Clip from "./Clip";
import VideoLightbox, { type ViewingClip } from "./VideoLightbox";
import Icon from "./Icon";
import JobMedia, { statusLabel } from "./JobMedia";
export default function Gallery({
  jobs,
  sources,
  onUpscale,
  onRetry,
  onSelect,
}: {
  jobs: Job[];
  sources: Source[];
  onUpscale: (id: string) => void;
  onRetry: (job: Job) => void;
  onSelect: (id: string) => void;
}) {
  const [viewing, setViewing] = useState<ViewingClip | null>(null);
  const [filter, setFilter] = useState<"all" | "session">("all");
  const generated = new Set(jobs.map((j) => j.resultUrl).filter(Boolean));
  const library = sources.filter(
    (s) => s.origin === "sample" && !generated.has(s.url),
  );
  return (
    <section className="gallery" aria-label="Generation gallery">
      <header className="gallery-heading">
        <div>
          <span className="section-eyebrow">02 / THE OUTPUT</span>
          <h2>
            Your motion studies
            <span>
              {jobs.length + library.length > 0
                ? String(jobs.length + library.length).padStart(2, "0")
                : ""}
            </span>
          </h2>
        </div>
        <div className="gallery-filters" aria-label="Gallery filter">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All clips
          </button>
          <button
            className={filter === "session" ? "active" : ""}
            onClick={() => setFilter("session")}
          >
            This session
          </button>
        </div>
      </header>
      <div className="gallery-grid">
        {jobs.map((job) => (
          <article className="clip-card" key={job.id}>
            <div className="clip-media">
              {job.status === "Ready" && job.resultUrl ? (
                <Clip
                  url={job.resultUrl}
                  label={job.description || "Untitled study"}
                  onOpen={() =>
                    setViewing({
                      url: job.resultUrl!,
                      label: job.description || "Untitled study",
                    })
                  }
                />
              ) : (
                <JobMedia job={job} />
              )}
              <span className="clip-badge">
                {job.generator === "upscale" ? "UPSCALED" : "FLUX 3"}
              </span>
            </div>
            <div className="clip-info">
              <h3>
                <button
                  className="clip-title-button"
                  onClick={() => onSelect(job.id)}
                >
                  {job.description || "Untitled study"}
                </button>
              </h3>
              <div className="clip-meta">
                <span>
                  {job.status === "Ready" ? "Ready" : statusLabel(job.status)} ·
                  ${Number(job.costActualUsd ?? job.costEstimateUsd).toFixed(2)}
                  {job.costActualUsd === undefined ? " est." : ""}
                </span>
                {job.status === "Ready" && job.generator === "video" ? (
                  <button
                    onClick={() => {
                      const source = sources.find(
                        (s) => s.url === job.resultUrl || s.id === job.id,
                      );
                      if (source) onUpscale(source.id);
                    }}
                    title="Use this clip in Upscale"
                  >
                    Upscale <Icon name="expand" size={12} />
                  </button>
                ) : isTerminal(job.status) && job.status !== "Ready" ? (
                  <button onClick={() => onRetry(job)}>
                    Try again <Icon name="refresh" size={12} />
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {filter === "all" &&
          library.map((source, index) => (
            <article className="clip-card" key={source.id}>
              <div className="clip-media">
                <Clip
                  url={source.url}
                  poster={(source as Source & { poster?: string }).poster}
                  label={source.label}
                  onOpen={() =>
                    setViewing({ url: source.url, label: source.label })
                  }
                />
                <span className="clip-badge">
                  LIBRARY / {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="clip-info">
                <h3>{source.label}</h3>
                <div className="clip-meta">
                  <span>
                    {Number(source.duration.toFixed(1))}s · {source.width} ×{" "}
                    {source.height}
                  </span>
                  <button onClick={() => onUpscale(source.id)}>
                    Upscale <Icon name="expand" size={12} />
                  </button>
                </div>
              </div>
            </article>
          ))}
      </div>
      {jobs.length === 0 && (filter === "session" || library.length === 0) && (
        <div className="gallery-empty">
          <Icon name="grid" size={24} />
          <h3>A space for what comes next.</h3>
          <p>Your first generation will appear here.</p>
        </div>
      )}
      {filter === "all" && library.length > 0 && (
        <p className="gallery-footnote">
          Library clips are existing studio generations. Camera experiments in
          this session appear above.
        </p>
      )}
      <VideoLightbox clip={viewing} onClose={() => setViewing(null)} />
    </section>
  );
}
