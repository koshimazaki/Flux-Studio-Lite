import {
  cameraClauses,
  type CameraSelection,
  type CameraEdits,
} from "../../shared/camera";
import { useLayoutEffect, useRef } from "react";
import Icon from "./Icon";

export const DEFAULT_PROMPT =
  "A sculptural chrome chair in a quiet concrete gallery. Soft afternoon light falls across the floor.";
const ideas = [
  { label: "Quiet architecture", text: DEFAULT_PROMPT },
  {
    label: "Studio object",
    text: "A matte ivory ceramic vessel on a pale stone plinth. Warm studio light, delicate shadows, a seamless background.",
  },
  {
    label: "A world outside",
    text: "A solitary red cabin on a rocky island. Early morning mist, still water and a soft overcast sky.",
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
            {cameraClauses(camera, cameraEdits).map(({ term, text }) => (
              <span key={term.id}>{text} </span>
            ))}
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

function PromptField({
  id,
  label,
  value,
  onChange,
  maxLength,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (text: string) => void;
  maxLength: number;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const field = ref.current!;
    const resize = () => {
      field.style.height = "auto";
      const height = field.scrollHeight;
      field.style.height = `${Math.min(height, 240)}px`;
      field.style.overflowY = height > 240 ? "auto" : "hidden";
    };
    resize();
    let width = field.clientWidth;
    const observer = new ResizeObserver(() => {
      if (field.clientWidth !== width) {
        width = field.clientWidth;
        resize();
      }
    });
    observer.observe(field);
    return () => observer.disconnect();
  }, [value]);
  return (
    <>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        value={value}
        rows={1}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </>
  );
}
