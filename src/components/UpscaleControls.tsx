import TickFader from "./TickFader";

export default function UpscaleControls({
  factor,
  creativity,
  onFactorChange,
  onCreativityChange,
}: {
  factor: number;
  creativity: 0 | 1;
  onFactorChange: (factor: number) => void;
  onCreativityChange: (creativity: 0 | 1) => void;
}) {
  return (
    <div className="upscale-controls">
      <div className="upscale-amount">
        <TickFader
          id="upscale-factor"
          label="Upscale amount"
          value={factor}
          min={1.5}
          max={3}
          step={0.1}
          onChange={onFactorChange}
          valueLabel={`${factor}×`}
        />
      </div>
      <fieldset className="upscale-mode">
        <legend className="sr-only">Upscale mode</legend>
        <div className="mode-segments">
          {([0, 1] as const).map((mode) => (
            <label key={mode}>
              <input
                type="radio"
                name="upscale-mode"
                value={mode}
                checked={creativity === mode}
                onChange={() => onCreativityChange(mode)}
              />
              <span>{mode === 0 ? "Precise" : "Creative"}</span>
            </label>
          ))}
        </div>
        <p className="sr-only">
          {creativity === 0
            ? "Preserves original detail"
            : "Reimagines finer detail"}
        </p>
      </fieldset>
    </div>
  );
}
