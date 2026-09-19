import { useEffect, useRef, useState } from "react";
import type {
  AspectRatio,
  Generator,
  VideoResolution,
} from "../../shared/types";
import Icon from "./Icon";
import SelectMenu from "./SelectMenu";
import TickFader from "./TickFader";
import AspectRatioIcon from "./AspectRatioIcon";

interface Props {
  generator: Generator;
  onGeneratorChange: (generator: Generator) => void;
  duration: number;
  onDurationChange: (duration: number) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  resolution: VideoResolution;
  onResolutionChange: (resolution: VideoResolution) => void;
  cameraEnabled: boolean;
  onCameraEnabledChange: (enabled: boolean) => void;
  draft: boolean;
  onDraftChange: (draft: boolean) => void;
}

const modelOptions = [
  {
    value: "video",
    label: "FLUX 3 · Text to video",
    icon: <Icon name="camera" size={13} />,
  },
  {
    value: "upscale",
    label: "FLUX · Video upscale",
    icon: <Icon name="expand" size={13} />,
  },
];
const aspectOptions: AspectRatio[] = [
  "21:9",
  "2:1",
  "16:9",
  "4:3",
  "1:1",
  "3:4",
  "9:16",
];
const resolutionOptions: VideoResolution[] = ["hd", "fhd", "qhd", "uhd"];

export default function GenerationControls({
  generator,
  onGeneratorChange,
  duration,
  onDurationChange,
  aspectRatio,
  onAspectRatioChange,
  resolution,
  onResolutionChange,
  draft,
  onDraftChange,
  cameraEnabled,
  onCameraEnabledChange,
}: Props) {
  return (
    <div className="generation-controls">
      <div className="generation-controls__model">
        <SelectMenu
          id="generator"
          label="Model"
          value={generator}
          options={modelOptions}
          onChange={(value) => onGeneratorChange(value as Generator)}
        />
      </div>
      {generator === "video" && (
        <>
          <DurationControl value={duration} onChange={onDurationChange} />
          <div className="generation-controls__aspect">
            <SelectMenu
              id="aspect-ratio"
              label="Aspect ratio"
              value={aspectRatio}
              compact
              options={aspectOptions.map((value) => ({
                value,
                label: value,
                icon: <AspectRatioIcon ratio={value} />,
              }))}
              onChange={(value) => onAspectRatioChange(value as AspectRatio)}
            />
          </div>
          <div
            className="generation-controls__resolution"
            title={
              draft
                ? "Draft uses HD. Turn it off to restore your selected resolution."
                : undefined
            }
          >
            <SelectMenu
              id="resolution"
              label="Resolution"
              value={draft ? "hd" : resolution}
              compact
              disabled={draft}
              options={resolutionOptions.map((value) => ({
                value,
                label: value === "fhd" ? "Full HD" : value.toUpperCase(),
              }))}
              onChange={(value) => onResolutionChange(value as VideoResolution)}
            />
            {draft && (
              <span className="sr-only">
                Draft uses HD. Your preferred resolution is retained.
              </span>
            )}
          </div>
          <div className="instrument-field generation-controls__draft">
            <span id="draft-label" className="instrument-label">
              Draft
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={draft}
              aria-labelledby="draft-label"
              className="instrument-trigger draft-trigger"
              onClick={() => onDraftChange(!draft)}
            >
              <span>{draft ? "On" : "Off"}</span>
              <span className="draft-trigger__track" aria-hidden="true">
                <i />
              </span>
            </button>
          </div>
          <div className="instrument-field generation-controls__camera">
            <span id="camera-label" className="instrument-label">
              Camera
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={cameraEnabled}
              aria-labelledby="camera-label"
              className="instrument-trigger draft-trigger"
              onClick={() => onCameraEnabledChange(!cameraEnabled)}
            >
              <span>{cameraEnabled ? "On" : "Off"}</span>
              <span className="draft-trigger__track" aria-hidden="true">
                <i />
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DurationControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLInputElement>("input")?.focus();
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target)
      ) {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  return (
    <div
      ref={root}
      className="instrument-field generation-controls__duration"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <span id="duration-label" className="instrument-label">
        Duration
      </span>
      <button
        ref={trigger}
        type="button"
        className="instrument-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? "duration-panel" : undefined}
        aria-labelledby="duration-label duration-value"
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (!open && event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span id="duration-value">{value}s</span>
        <Icon name="chevron" size={11} />
      </button>
      {open && (
        <div
          ref={panel}
          id="duration-panel"
          role="dialog"
          aria-labelledby="duration-label"
          className="instrument-popover duration-popover"
        >
          <TickFader
            id="duration-fader"
            label="Duration"
            value={value}
            min={5}
            max={20}
            step={1}
            valueLabel={`${value}s`}
            onChange={onChange}
          />
        </div>
      )}
    </div>
  );
}
