import {
  cameraClauses,
  type CameraSelection,
  type CameraEdits,
} from "../../shared/camera";
import PromptField from "./PromptField";
import Icon from "./Icon";

export const DEFAULT_PROMPT =
  "A solitary red cabin on a rocky island. Early morning mist, still water and a soft overcast sky.";
const ideas = [
  {
    label: "Quiet architecture",
    text: "A sculptural chrome chair in a quiet concrete gallery. Soft afternoon light falls across the floor.",
  },
  {
    label: "Studio object",
    text: "A matte ivory ceramic vessel on a pale stone plinth. Warm studio light, delicate shadows, a seamless background.",
  },
  {
    label: "A world outside",
    text: DEFAULT_PROMPT,
  },
];

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
    <>
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
            {cameraClauses(camera, cameraEdits).map(
              ({ section, term, text }) => (
                <span key={term.id} style={{ color: `var(${section.color})` }}>
                  {text}{" "}
                </span>
              ),
            )}
          </button>
        )}
      </div>
      <div className="prompt-suggestions">
        <span>Try a scene</span>
        {ideas.map((idea) => (
          <button key={idea.label} onClick={() => onChange(idea.text)}>
            {idea.label}
            <Icon name="arrow" size={12} />
          </button>
        ))}
      </div>
    </>
  );
}
