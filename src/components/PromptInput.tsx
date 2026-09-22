import {
  cameraClauses,
  type CameraSelection,
  type CameraEdits,
} from "../../shared/camera";
import PromptField from "./PromptField";

export default function PromptInput({
  description,
  onChange,
  cameraEnabled,
  camera,
  cameraEdits,
  onOpenCamera,
}: {
  description: string;
  onChange: (description: string) => void;
  cameraEnabled: boolean;
  camera: CameraSelection;
  cameraEdits: CameraEdits;
  onOpenCamera: () => void;
}) {
  return (
    <div className="prompt-editor" role="group" aria-label="Video prompt">
      <PromptField
        id="description"
        label="Describe your scene"
        value={description}
        onChange={onChange}
        maxLength={1200}
        placeholder="Describe a scene…"
      />
      {cameraEnabled && cameraClauses(camera, cameraEdits).length > 0 && (
        <button
          className="camera-sentences"
          onClick={onOpenCamera}
          aria-label="Edit camera direction"
        >
          {cameraClauses(camera, cameraEdits).map(({ section, term, text }) => (
            <span key={term.id} style={{ color: `var(${section.color})` }}>
              {text}{" "}
            </span>
          ))}
        </button>
      )}
    </div>
  );
}
