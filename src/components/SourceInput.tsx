import { useRef, useState } from "react";
import type { Source } from "../../shared/types";
import { estimateUpscaleOutput } from "../../shared/presets";
import { request } from "../useJobs";
import Icon from "./Icon";
import PromptField from "./PromptField";
import SelectMenu from "./SelectMenu";
export default function SourceInput({
  apiKey,
  sources,
  sourceId,
  factor,
  prompt,
  onPromptChange,
  onSelect,
  refresh,
  onError,
  onBusy,
}: {
  apiKey: string;
  sources: Source[];
  sourceId: string;
  factor: number;
  prompt: string;
  onPromptChange: (text: string) => void;
  onSelect: (id: string) => void;
  refresh: () => Promise<void>;
  onError: (error: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const source = sources.find((item) => item.id === sourceId);
  const output = source ? estimateUpscaleOutput(source, factor) : null;
  async function upload(file: File) {
    setUploading(true);
    onBusy(true);
    onError("");
    let objectUrl = "";
    try {
      if (file.size > 50_000_000 || !file.name.toLowerCase().endsWith(".mp4"))
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
        video.videoWidth * video.videoHeight > 2560 * 1440 ||
        Math.max(video.videoWidth, video.videoHeight) > 2560 ||
        video.duration <= 0 ||
        video.videoWidth <= 0 ||
        video.videoHeight <= 0 ||
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
          headers: {
            "Content-Type": "video/mp4",
            ...(apiKey ? { "x-byo-key": apiKey } : {}),
          },
          body: file,
        },
      );
      await refresh();
      onSelect(uploaded.id);
    } catch (e) {
      onError(e instanceof Error ? e.message : "The upload failed.");
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUploading(false);
      onBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  return (
    <div className="upscale-input">
      <div className="upscale-source">
        <div className="source-icon">
          <Icon name="expand" size={30} />
        </div>
        <div className="source-content">
          <h2>Give a clip a closer look.</h2>
          <SelectMenu
            id="source"
            label="Source clip"
            value={sourceId}
            onChange={onSelect}
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
      </div>
      <div className="upscale-prompt">
        <PromptField
          id="upscale-prompt"
          label="Prompt · optional"
          labelClassName="upscale-prompt-label"
          value={prompt}
          onChange={onPromptChange}
          maxLength={1200}
          placeholder="Describe the details to bring into focus…"
        />
      </div>
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
  );
}
