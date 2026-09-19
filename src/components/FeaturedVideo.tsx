import type { Job, Source } from "../../shared/types";
import { isTerminal } from "../../shared/types";
import JobMedia, { statusLabel } from "./JobMedia";
import Clip from "./Clip";
import { useState } from "react";
import VideoLightbox, { type ViewingClip } from "./VideoLightbox";
import Icon from "./Icon";
export default function FeaturedVideo({
  job,
  source,
  onRetry,
}: {
  job?: Job;
  source?: Source;
  onRetry: (job: Job) => void;
}) {
  const [viewing, setViewing] = useState<ViewingClip | null>(null);
  const url =
    job?.status === "Ready" ? job.resultUrl : !job ? source?.url : undefined;
  return (
    <section id="main-video" className="featured-video" aria-label="Main video">
      <div className="featured-media">
        {job ? (
          <JobMedia key={job.id} job={job} />
        ) : source ? (
          <Clip
            key={source.id}
            url={source.url}
            poster={source.poster}
            label={source.label}
          />
        ) : (
          <div className="job-message">
            <Icon name="play" />
            <p>Your next scene begins here.</p>
          </div>
        )}
        {(job || source) && (
          <span className="clip-badge">
            {job
              ? job.generator === "video"
                ? "FLUX 3"
                : "UPSCALED"
              : "FROM THE LIBRARY"}
          </span>
        )}
        {url && (
          <button
            className="expand-video icon-button"
            aria-label="Enlarge video"
            onClick={() =>
              setViewing({
                url,
                label: job?.description || source?.label || "Video",
                prompt: job?.prompt,
              })
            }
          >
            <Icon name="expand" />
          </button>
        )}
      </div>
      <div className="featured-caption">
        <span>
          {job ? statusLabel(job.status) : source?.label || "Studio preview"}
        </span>
        {job && isTerminal(job.status) && job.status !== "Ready" ? (
          <button className="text-button" onClick={() => onRetry(job)}>
            Edit and try again <Icon name="refresh" size={12} />
          </button>
        ) : (
          <span>
            {job
              ? "Your latest generation"
              : "Make something of your own below"}
          </span>
        )}
      </div>
      <VideoLightbox clip={viewing} onClose={() => setViewing(null)} />
    </section>
  );
}
