import Icon from "./Icon";

export default function ClipActions({
  url,
  filename,
  onRecreate,
  onUpscale,
}: {
  url: string;
  filename: string;
  onRecreate?: () => void;
  onUpscale?: () => void;
}) {
  return (
    <div className="clip-actions">
      {onRecreate && (
        <button
          onClick={onRecreate}
          title="Load this clip’s prompt and settings"
        >
          Recreate <Icon name="refresh" size={12} />
        </button>
      )}
      <a className="download-clip" href={url} download={filename}>
        Download ↓
      </a>
      {onUpscale && (
        <button onClick={onUpscale} title="Use this clip in Upscale">
          Upscale <Icon name="expand" size={12} />
        </button>
      )}
    </div>
  );
}
