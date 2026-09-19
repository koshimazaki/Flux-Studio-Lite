import type { CSSProperties } from "react";

interface Props {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  valueLabel: string;
  compact?: boolean;
}

/** Native range behavior with the instrument's channel, rimmed thumb and ruled scale. */
export default function TickFader({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueLabel,
  compact = false,
}: Props) {
  const intervals = Math.max(1, Math.round((max - min) / step));
  const fill = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div className={`tick-fader${compact ? " tick-fader--compact" : ""}`}>
      <div className="tick-fader__heading">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{valueLabel}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueLabel}
        onChange={(event) => onChange(event.target.valueAsNumber)}
        style={{ "--fader-fill": `${fill}%` } as CSSProperties}
      />
      <div className="tick-fader__ruler" aria-hidden="true">
        {Array.from({ length: intervals + 1 }, (_, index) => (
          <i
            key={index}
            className={
              index % 5 === 0 || index === intervals ? "major" : undefined
            }
            style={{ left: `${(index / intervals) * 100}%` }}
          />
        ))}
      </div>
      <div className="tick-fader__limits" aria-hidden="true">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
