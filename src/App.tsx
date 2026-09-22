import { useEffect, useRef, useState } from "react";
import { isTerminal } from "../shared/types";
import GenerateButton from "./components/GenerateButton";
import type { Job, Source } from "../shared/types";
import { usePageKey } from "./usePageKey";
import { useComposer, composerInput, upscaleSource } from "./useComposer";
import AccountBalance from "./components/AccountBalance";
import FeaturedVideo from "./components/FeaturedVideo";
import {
  composePrompt,
  estimateVideoUsd,
  estimateUpscaleUsd,
} from "../shared/presets";
import { request, useJobs } from "./useJobs";
import { librarySetupJob } from "./library";
import CameraDialog from "./components/CameraDialog";
import Gallery from "./components/Gallery";
import KeyDialog from "./components/KeyDialog";
import Icon from "./components/Icon";
import PromptInput from "./components/PromptInput";
import UpscaleControls from "./components/UpscaleControls";
import GenerationControls from "./components/GenerationControls";
import ModeBadge from "./components/ModeBadge";
import Wordmark from "./components/Wordmark";
import ThemePicker from "./components/ThemePicker";
import SourceInput from "./components/SourceInput";
import { useHiddenJobs } from "./useHiddenJobs";
import { heroMedia, activeRunId } from "./hero";
import { generatorFoot } from "./generators";
export default function App() {
  const { state, set, dispatch, edited } = useComposer();
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
    upscalePrompt,
    upscaleFactor,
    upscaleCreativity,
  } = state;
  const [showCamera, setShowCamera] = useState(false);
  /**
   * The catalogue clip a Recreate or a title click loaded, while the composer
   * holds its run. `heroMedia` gives it the main view until one of the visitor's
   * own runs becomes what the composer holds, so the scene on screen is always
   * the one whose prompt and camera direction are being edited below it.
   *
   * It is the only piece of state about what the view shows: the run on screen
   * is derived from what the composer is operating on, not kept in step with it
   * by a second flag.
   */
  const [activeCatalogueId, setActiveCatalogueId] = useState<string | null>(
    null,
  );
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
    selectJob,
    selectedId,
  } = useJobs(key);
  const { hiddenIds, hide, restoreAll } = useHiddenJobs();
  const visibleJobs = jobs.filter((job) => !hiddenIds.has(job.id));
  // The run the screen holds: the linked one, otherwise the newest visible run.
  const selectedRun = visibleJobs.find(
    (job) => job.id === activeRunId(selectedId, visibleJobs),
  );
  const samples = sources.filter((source) => source.origin === "sample");
  const source = upscaleSource(state.sourceId, jobs, sources);
  const hero = heroMedia({
    generator,
    catalogueId: activeCatalogueId,
    upscale: source,
    selected: selectedRun,
    runs: visibleJobs,
    samples,
  });
  const hiddenCount = jobs.filter((job) => hiddenIds.has(job.id)).length;
  const restoredRun = useRef<string | null>(null);
  useEffect(() => {
    // Selecting a run of your own ends a catalogue clip's turn in the main view.
    if (selectedId) setActiveCatalogueId(null);
  }, [selectedId]);
  useEffect(() => {
    // The composer opens on the run the main view shows — the linked run, or the
    // newest visible one — so the two cannot open on different runs. It stops
    // once the visitor changes a control here: that edit is theirs to keep.
    if (activeCatalogueId || edited.current || !selectedRun) return;
    if (restoredRun.current === selectedRun.id) return;
    restoredRun.current = selectedRun.id;
    dispatch({ type: "restore", job: selectedRun });
  }, [activeCatalogueId, edited, selectedRun, dispatch]);
  useEffect(() => {
    request<{ hasServerKey: boolean }>("/api/health")
      .then((h) => setHasServerKey(h.hasServerKey))
      .catch(() => setError("The studio connection is unavailable."));
  }, [setError]);
  const sourceId = source?.id ?? "";
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
      : `${upscaleMode} ${upscaleFactor}× upscale. ${upscaleCreativity === 0 ? "Preserve original detail." : "Reimagine finer detail."}${upscalePrompt.trim() ? `\n\n${upscalePrompt.trim()}` : ""}`;
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
        ...composerInput({ ...state, sourceId }),
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
    setActiveCatalogueId(null);
    restoredRun.current = job.id;
    dispatch({ type: "restore", job });
    selectJob(job.id);
  }
  function applyPrompt(job: Job) {
    // This explicit choice must not trigger the full reload/legacy-link restore.
    setActiveCatalogueId(null);
    restoredRun.current = job.id;
    dispatch({ type: "restore-prompt", job });
    selectJob(job.id);
  }
  /**
   * A library clip restores its recorded run into the composer and takes over
   * the main view, so the clip and the prompt describing it are the same run.
   * It is still never selected as a job: its id names a catalogue entry, so
   * polling or linking it would look for a session job that does not exist.
   */
  function applyLibrarySetup(source: Source, full: boolean) {
    const job = librarySetupJob(source);
    if (!job) return;
    setActiveCatalogueId(source.id);
    dispatch({ type: full ? "restore" : "restore-prompt", job });
    composerRef.current?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
  }
  return (
    <>
      <header className="topbar">
        <Wordmark />
        <div className="topbar-right">
          <AccountBalance
            apiKey={key}
            onVerified={setKeyVerified}
            hasServerKey={hasServerKey}
            revision={jobs
              .filter((job) => isTerminal(job.status))
              .map((job) => `${job.id}:${job.costActualUsd ?? ""}`)
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
      {showCamera && (
        <CameraDialog
          selected={camera}
          edits={cameraEdits}
          onClose={() => setShowCamera(false)}
          onApply={(selection, edits) => {
            dispatch({
              type: "update",
              patch: {
                camera: selection,
                cameraEdits: edits,
                cameraEnabled: true,
              },
            });
            setShowCamera(false);
          }}
        />
      )}
      <main>
        <FeaturedVideo job={hero.job} source={hero.source} onRetry={retry} />
        <div className="studio" ref={composerRef}>
          <section className="composer" aria-label="Video composer">
            <div className="composer-top">
              <ModeBadge generator={generator} />
              {generator === "video" && (
                <button
                  className="camera-open text-button"
                  onClick={() => setShowCamera(true)}
                  aria-haspopup="dialog"
                >
                  <Icon name="camera" size={15} /> Camera controls{" "}
                  <Icon name="chevron" size={12} />
                </button>
              )}
            </div>
            {generator === "video" ? (
              <PromptInput
                description={description}
                onChange={(value) => set("description", value)}
                cameraEnabled={cameraEnabled}
                camera={camera}
                cameraEdits={cameraEdits}
                onOpenCamera={() => setShowCamera(true)}
              />
            ) : (
              <SourceInput
                apiKey={key}
                sources={sources}
                sourceId={sourceId}
                prompt={upscalePrompt}
                onPromptChange={(value) => set("upscalePrompt", value)}
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
                <GenerateButton
                  generator={generator}
                  submitting={submitting}
                  activeJob={jobs.find(
                    (job) =>
                      job.generator === generator && !isTerminal(job.status),
                  )}
                  hasKey={Boolean(key)}
                  disabled={
                    uploading ||
                    (generator === "video" ? !description.trim() : !sourceId)
                  }
                  onSubmit={() => void submit()}
                  onResume={() => setShowKey(true)}
                />
              </div>
            </div>
          </section>
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
              {generatorFoot(generator, upscaleMode)}
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
          jobs={visibleJobs}
          sources={sources}
          onUpscale={chooseUpscale}
          onRetry={retry}
          onSelect={(id) => {
            const job = jobs.find((item) => item.id === id);
            if (job) applyPrompt(job);
          }}
          onLibrarySetup={applyLibrarySetup}
          onHide={hide}
          hiddenCount={hiddenCount}
          onRestoreHidden={restoreAll}
        />
      </main>
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
