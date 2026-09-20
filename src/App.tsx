import { useEffect, useRef, useState } from "react";
import type {
  Generator,
  PresetId,
  Job,
  Source,
  AspectRatio,
  VideoResolution,
} from "../shared/types";
import {
  presets,
  composePrompt,
  estimateVideoUsd,
  estimateUpscaleUsd,
  estimateUpscaleOutput,
} from "../shared/presets";
import { request, useJobs } from "./useJobs";
import CameraPanel from "./components/CameraPanel";
import Gallery from "./components/Gallery";
import KeyDialog from "./components/KeyDialog";
import Icon from "./components/Icon";
import PromptInput, { DEFAULT_PROMPT } from "./components/PromptInput";
import UpscaleControls from "./components/UpscaleControls";
import GenerationControls from "./components/GenerationControls";
import ThemePicker from "./components/ThemePicker";
import SelectMenu from "./components/SelectMenu";
export default function App() {
  const [generator, setGenerator] = useState<Generator>("video"),
    [description, setDescription] = useState(DEFAULT_PROMPT),
    [presetId, setPresetId] = useState<PresetId>("orbit_l"),
    [cameraEnabled, setCameraEnabled] = useState(true),
    [draft, setDraft] = useState(false),
    [duration, setDuration] = useState(5),
    [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9"),
    [resolution, setResolution] = useState<VideoResolution>("hd"),
    [cameraEdits, setCameraEdits] = useState<Partial<Record<PresetId, string>>>(
      {},
    ),
    [sourceId, setSourceId] = useState(""),
    [upscaleFactor, setUpscaleFactor] = useState(2),
    [upscaleCreativity, setUpscaleCreativity] = useState<0 | 1>(0),
    [showPrompt, setShowPrompt] = useState(false),
    [copied, setCopied] = useState(false);
  const [key, setKey] = useState(() => {
      try {
        return sessionStorage.getItem("flux-studio-lite-key") || "";
      } catch {
        return "";
      }
    }),
    [showKey, setShowKey] = useState(false),
    [hasServerKey, setHasServerKey] = useState(false),
    [submitting, setSubmitting] = useState(false),
    [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null),
    composerRef = useRef<HTMLDivElement>(null);
  const { jobs, sources, error, setError, needsKey, refresh, generate } =
    useJobs(key);
  useEffect(() => {
    request<{ hasServerKey: boolean }>("/api/health")
      .then((h) => setHasServerKey(h.hasServerKey))
      .catch(() => setError("The local connection is unavailable."));
  }, [setError]);
  const selected = presets.find((p) => p.id === presetId)!;
  const cameraText = cameraEdits[presetId] ?? selected.clause;
  const source = sources.find((s) => s.id === sourceId);
  const output = source ? estimateUpscaleOutput(source, upscaleFactor) : null;
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
      ? composePrompt({
          generator,
          description,
          cameraEnabled,
          presetId: selected.id,
          cameraText,
        })
      : `${upscaleMode} ${upscaleFactor}× upscale. ${upscaleCreativity === 0 ? "Preserve original detail." : "Reimagine finer detail."}`;
  function saveKey(value: string) {
    setKey(value);
    try {
      if (value) {
        sessionStorage.setItem("flux-studio-lite-key", value);
      } else {
        sessionStorage.removeItem("flux-studio-lite-key");
      }
    } catch {
      setError(
        "Your browser could not retain the key for refresh. It remains in memory for this page.",
      );
    }
  }
  function chooseUpscale(id: string) {
    setSourceId(id);
    setGenerator("upscale");
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
        generator,
        description:
          generator === "video" ? description : source?.label || "Upscale",
        presetId,
        cameraEnabled: generator === "video" && cameraEnabled,
        cameraText,
        duration,
        aspectRatio,
        resolution: draft ? "hd" : resolution,
        draft: generator === "video" && draft,
        sourceId: generator === "upscale" ? sourceId : undefined,
        upscaleFactor,
        upscaleCreativity,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The generation could not start.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  async function upload(file: File) {
    setUploading(true);
    setError("");
    let objectUrl = "";
    try {
      if (
        file.size > 50 * 1024 * 1024 ||
        !file.name.toLowerCase().endsWith(".mp4")
      )
        throw new Error("Choose an MP4 file under 50 MB.");
      objectUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Could not read video metadata.")),
          5000,
        );
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };
        video.onerror = () => {
          clearTimeout(timeout);
          reject(new Error("This video cannot be read."));
        };
        video.src = objectUrl;
      });
      if (
        video.duration > 20 ||
        video.videoWidth > 2560 ||
        video.videoHeight > 1440 ||
        !Number.isFinite(video.duration)
      )
        throw new Error("Choose a clip up to 20 seconds and 2560 × 1440.");
      const query = new URLSearchParams({
        filename: file.name,
        width: String(video.videoWidth),
        height: String(video.videoHeight),
        duration: String(video.duration),
      });
      const { source: uploaded } = await request<{ source: Source }>(
        `/api/uploads?${query}`,
        {
          method: "POST",
          headers: { "Content-Type": "video/mp4" },
          body: file,
        },
      );
      await refresh();
      setSourceId(uploaded.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed.");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  function retry(job: Job) {
    setGenerator(job.generator);
    setDescription(job.description);
    setPresetId(job.presetId);
    setCameraEnabled(job.cameraEnabled);
    setDraft(job.draft);
    setDuration(job.duration);
    setAspectRatio(job.aspectRatio ?? "16:9");
    setResolution(job.resolution);
    setCameraEdits((edits) => ({
      ...edits,
      [job.presetId]:
        job.cameraText ?? presets.find((p) => p.id === job.presetId)!.clause,
    }));
    setUpscaleFactor(job.upscaleFactor);
    setUpscaleCreativity(job.upscaleCreativity ?? 0);
    if (job.sourceId) setSourceId(job.sourceId);
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
          <span className="local-label">
            <i />
            LOCAL PREVIEW
          </span>
          <ThemePicker />
          <button
            className="connection-button"
            onClick={() => setShowKey(true)}
          >
            <Icon name="key" size={15} />
            {key ? "Your key" : hasServerKey ? "Connected" : "Connect key"}
            <span
              className={`connection-dot ${key || hasServerKey ? "connected" : ""}`}
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
              {generator === "video" && (
                <button
                  className={`parameter camera-toggle ${cameraEnabled ? "enabled" : ""}`}
                  aria-pressed={cameraEnabled}
                  onClick={() => setCameraEnabled(!cameraEnabled)}
                >
                  Camera
                  <span className="switch-track">
                    <i />
                  </span>
                </button>
              )}
            </div>
            {generator === "video" ? (
              <PromptInput
                description={description}
                onChange={setDescription}
                cameraEnabled={cameraEnabled}
                cameraText={cameraText}
                onCameraChange={(text) =>
                  setCameraEdits((edits) => ({ ...edits, [presetId]: text }))
                }
              />
            ) : (
              <div className="upscale-input">
                <div className="source-icon">
                  <Icon name="expand" size={30} />
                </div>
                <div className="source-content">
                  <h2>Give a clip a closer look.</h2>
                  <SelectMenu
                    id="source"
                    label="Source clip"
                    value={sourceId}
                    onChange={setSourceId}
                    options={[
                      { value: "", label: "Choose a clip from your gallery" },
                      ...sources.map((s) => ({
                        value: s.id,
                        label: s.label,
                        icon: <Icon name="play" size={12} />,
                      })),
                    ]}
                  />
                  <span>
                    {source
                      ? `${source.width} × ${source.height} → ≈ ${output!.width} × ${output!.height}${output!.capped ? " (size limit)" : ""} · ${Number(source.duration.toFixed(1))}s`
                      : "Up to 20 seconds · MP4 · 50 MB"}
                  </span>
                </div>
                <button
                  className="icon-button upload-button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  aria-label="Upload video"
                >
                  <Icon name="upload" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/mp4,.mp4"
                  hidden
                  onChange={(e) => {
                    if (e.target.files?.[0]) void upload(e.target.files[0]);
                  }}
                />
              </div>
            )}
            <div className="composer-toolbar">
              <div className="parameters">
                <GenerationControls
                  generator={generator}
                  onGeneratorChange={setGenerator}
                  duration={duration}
                  onDurationChange={setDuration}
                  aspectRatio={aspectRatio}
                  onAspectRatioChange={setAspectRatio}
                  resolution={resolution}
                  onResolutionChange={setResolution}
                  draft={draft}
                  onDraftChange={setDraft}
                />
                {generator === "upscale" && (
                  <UpscaleControls
                    factor={upscaleFactor}
                    creativity={upscaleCreativity}
                    onFactorChange={setUpscaleFactor}
                    onCreativityChange={setUpscaleCreativity}
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
            <CameraPanel selected={presetId} onSelect={setPresetId} />
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
