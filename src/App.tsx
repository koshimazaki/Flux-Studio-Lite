import { useEffect, useRef, useState } from "react";
import type { Job } from "../shared/types";
import { usePageKey } from "./usePageKey";
import { useComposer, composerInput } from "./useComposer";
import AccountBalance from "./components/AccountBalance";
import FeaturedVideo from "./components/FeaturedVideo";
import {
  composePrompt,
  estimateVideoUsd,
  estimateUpscaleUsd,
} from "../shared/presets";
import { request, useJobs } from "./useJobs";
import CameraPanel from "./components/CameraPanel";
import Gallery from "./components/Gallery";
import KeyDialog from "./components/KeyDialog";
import Icon from "./components/Icon";
import PromptInput from "./components/PromptInput";
import UpscaleControls from "./components/UpscaleControls";
import GenerationControls from "./components/GenerationControls";
import ThemePicker from "./components/ThemePicker";
import SourceInput from "./components/SourceInput";
export default function App() {
  const { state, set, dispatch } = useComposer();
  const {
    generator,
    description,
    camera,
    cameraEdits,
    cameraEnabled,
    draft,
    duration,
    aspectRatio,
    resolution,
    sourceId,
    upscaleFactor,
    upscaleCreativity,
  } = state;
  const [showPrompt, setShowPrompt] = useState(false),
    [copied, setCopied] = useState(false);
  const [key, setKey] = usePageKey();
  const [showKey, setShowKey] = useState(false),
    [hasServerKey, setHasServerKey] = useState(false),
    [keyVerified, setKeyVerified] = useState(false),
    [submitting, setSubmitting] = useState(false),
    [uploading, setUploading] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const {
    jobs,
    sources,
    error,
    setError,
    needsKey,
    refresh,
    generate,
    featuredJob,
    selectJob,
  } = useJobs(key);
  useEffect(() => {
    request<{ hasServerKey: boolean }>("/api/health")
      .then((h) => setHasServerKey(h.hasServerKey))
      .catch(() => setError("The studio connection is unavailable."));
  }, [setError]);
  const source = sources.find((s) => s.id === sourceId);
  const upscaleMode = upscaleCreativity === 0 ? "Precise" : "Creative";
  const estimate =
    generator === "video"
      ? estimateVideoUsd(draft, duration, resolution)
      : source
        ? estimateUpscaleUsd(source, upscaleFactor, upscaleCreativity)
        : null;
  const total = jobs.reduce(
    (sum, job) => sum + (job.costActualUsd ?? job.costEstimateUsd),
    0,
  );
  const composed =
    generator === "video"
      ? composePrompt(composerInput(state))
      : `${upscaleMode} ${upscaleFactor}× upscale. ${upscaleCreativity === 0 ? "Preserve original detail." : "Reimagine finer detail."}`;
  function saveKey(value: string) {
    if (value !== key) setKeyVerified(false);
    setKey(value);
  }

  function chooseUpscale(id: string) {
    set("sourceId", id);
    set("generator", "upscale");
    composerRef.current?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
  }
  async function submit() {
    if (!key && !hasServerKey) {
      setShowKey(true);
      return;
    }
    setSubmitting(true);
    try {
      await generate({
        ...composerInput(state),
        description:
          generator === "video" ? description : source?.label || "Upscale",
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The generation could not start.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  function retry(job: Job) {
    dispatch({ type: "restore", job });
    composerRef.current?.scrollIntoView({ block: "center" });
  }
  return (
    <>
      <header className="topbar">
        <a href="/" className="wordmark" aria-label="FLUX Studio Lite home">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          flux studio<span className="brand-beta">LITE / 01</span>
        </a>
        <div className="topbar-right">
          <AccountBalance
            apiKey={key}
            onVerified={setKeyVerified}
            hasServerKey={hasServerKey}
            revision={jobs
              .map(
                (job) => `${job.id}:${job.status}:${job.costActualUsd ?? ""}`,
              )
              .join("|")}
          />
          <ThemePicker />
          <button
            className="connection-button"
            onClick={() => setShowKey(true)}
          >
            <Icon name="key" size={15} />
            {key ? "Your key" : hasServerKey ? "Server key" : "Connect key"}
            <span
              className={`connection-dot ${keyVerified ? "connected" : ""}`}
            />
          </button>
        </div>
      </header>
      <main>
        <section className="intro">
          <div className="intro-kicker">
            <span /> STUDIO FOR MOVING IMAGES
          </div>
        </section>
        <FeaturedVideo
          job={featuredJob}
          source={sources.find((s) => s.origin === "sample")}
          onRetry={retry}
        />
        <div className="studio" ref={composerRef}>
          <section className="composer" aria-label="Video composer">
            <div className="composer-top">
              <div className="mode-badge" aria-live="polite">
                <Icon
                  name={generator === "video" ? "camera" : "expand"}
                  size={17}
                />
                <span>
                  {generator === "video" ? "Text to video" : "Video upscale"}
                </span>
              </div>
            </div>
            {generator === "video" ? (
              <PromptInput
                description={description}
                onChange={(value) => set("description", value)}
                cameraEnabled={cameraEnabled}
                camera={camera}
                cameraEdits={cameraEdits}
                onCameraChange={(id, text) =>
                  dispatch({ type: "edit-camera", id, text })
                }
              />
            ) : (
              <SourceInput
                apiKey={key}
                sources={sources}
                sourceId={sourceId}
                factor={upscaleFactor}
                onSelect={(id) => set("sourceId", id)}
                refresh={refresh}
                onError={setError}
                onBusy={setUploading}
              />
            )}
            <div className="composer-toolbar">
              <div className="parameters">
                <GenerationControls
                  generator={generator}
                  onGeneratorChange={(value) => set("generator", value)}
                  duration={duration}
                  onDurationChange={(value) => set("duration", value)}
                  aspectRatio={aspectRatio}
                  onAspectRatioChange={(value) => set("aspectRatio", value)}
                  resolution={resolution}
                  onResolutionChange={(value) => set("resolution", value)}
                  cameraEnabled={cameraEnabled}
                  onCameraEnabledChange={(value) => set("cameraEnabled", value)}
                  draft={draft}
                  onDraftChange={(value) => set("draft", value)}
                />
                {generator === "upscale" && (
                  <UpscaleControls
                    factor={upscaleFactor}
                    creativity={upscaleCreativity}
                    onFactorChange={(value) => set("upscaleFactor", value)}
                    onCreativityChange={(value) =>
                      set("upscaleCreativity", value)
                    }
                  />
                )}
              </div>
              <div className="generate-group">
                <div className="cost">
                  <strong>
                    {estimate === null ? "—" : `$${estimate.toFixed(2)}`}
                  </strong>
                  <span>EST. / RUN</span>
                </div>
                <button
                  className="generate-button"
                  onClick={() => void submit()}
                  disabled={
                    submitting ||
                    uploading ||
                    (generator === "video" ? !description.trim() : !sourceId)
                  }
                >
                  {submitting
                    ? "Sending…"
                    : generator === "video"
                      ? "Generate"
                      : "Upscale"}
                  <Icon name="arrow" size={18} />
                </button>
              </div>
            </div>
          </section>
          {generator === "video" && cameraEnabled && (
            <CameraPanel
              selected={camera}
              onSelect={(value) => set("camera", value)}
            />
          )}
          <div className="studio-foot">
            <button
              className="text-button"
              aria-expanded={showPrompt}
              onClick={() => setShowPrompt(!showPrompt)}
            >
              <span className="prompt-dot" />
              {showPrompt ? "Hide" : "View"}{" "}
              {generator === "video" ? "composed prompt" : "upscale settings"}
              <Icon
                name="chevron"
                size={12}
                style={{ transform: showPrompt ? "rotate(180deg)" : undefined }}
              />
            </button>
            <span>
              {generator === "video"
                ? "FLUX 3 · no audio"
                : `FLUX Video Upscale · ${upscaleMode.toLowerCase()}`}
              <i />
              Session ${total.toFixed(2)}
            </span>
          </div>
          {showPrompt && (
            <div className="composed-prompt">
              <p>{composed}</p>
              <button
                className="icon-button"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(composed)
                    .then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    })
                    .catch(() =>
                      setError(
                        "Clipboard access is unavailable. Select the prompt to copy it.",
                      ),
                    )
                }
                aria-label={
                  generator === "video"
                    ? "Copy composed prompt"
                    : "Copy upscale settings"
                }
              >
                <Icon name={copied ? "check" : "copy"} size={16} />
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="error-message">
              <span>{error}</span>
              <button
                className="icon-button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <Icon name="close" size={15} />
              </button>
            </div>
          )}
          {needsKey && (
            <div className="error-message">
              <span>Re-enter your key to resume this generation.</span>
              <button className="text-button" onClick={() => setShowKey(true)}>
                Connect key
              </button>
            </div>
          )}
        </div>
        <Gallery
          jobs={jobs}
          sources={sources}
          onUpscale={chooseUpscale}
          onRetry={retry}
          onSelect={selectJob}
        />
      </main>
      <footer>
        <span>Independent FLUX experiment · built on the BFL API</span>
        <a href="/api/health" target="_blank" rel="noopener">
          Connection status <Icon name="arrow" size={12} />
        </a>
      </footer>
      {showKey && (
        <KeyDialog
          value={key}
          onSave={saveKey}
          onClose={() => setShowKey(false)}
          serverKey={hasServerKey}
        />
      )}
    </>
  );
}
