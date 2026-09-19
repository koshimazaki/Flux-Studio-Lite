import type { Job, Source } from "../../shared/types";
import { isTerminal } from "../../shared/types";
import JobMedia, { statusLabel } from "./JobMedia";
import { Clip } from "./Gallery";
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
        <span className="clip-badge">
          {job
            ? job.generator === "video"
              ? "FLUX 3"
              : "UPSCALED"
            : "FROM THE LIBRARY"}
        </span>
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
            {job ? "Your latest selection" : "Make something of your own below"}
          </span>
        )}
      </div>
    </section>
  );
}
