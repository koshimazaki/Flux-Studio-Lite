import type { PresetId } from "../../shared/types";

type Props = { preset: PresetId; size?: number };

const movementPaths: Record<PresetId, string> = {
  orbit_l: "M39 16c3 15-29 18-32 4m0 0-1 6m1-6 6 2",
  orbit_r: "M9 16c-3 15 29 18 32 4m0 0 1 6m-1-6-6 2",
  orbit_360: "M8 16C8 2 40 2 40 18S8 34 8 23m0 0-3 4m3-4 5 1",
  dolly_in: "M30 18h12m-4-4 4 4-4 4",
  dolly_out: "M43 18H31m4-4-4 4 4 4",
  crane_up: "M31 28V14c0-5 4-7 9-7m-4-3 4 3-3 4",
  low: "M30 25 40 15m-6 0h6v6",
  top: "M24 23v7m-4-4 4 4 4-4",
};

const cameraTransforms: Record<PresetId, string> = {
  orbit_l: "translate(24 15)",
  orbit_r: "translate(24 15)",
  orbit_360: "translate(24 18) scale(.86)",
  dolly_in: "translate(16 18)",
  dolly_out: "translate(16 18)",
  crane_up: "translate(16 25)",
  low: "translate(16 25) rotate(-26)",
  top: "translate(24 12) rotate(90) scale(.85)",
};

/** A shared camera silhouette; the arrow explains motion and the tilt explains framing. */
export default function CameraGlyph({ preset, size = 42 }: Props) {
  const dolly = preset === "dolly_in" || preset === "dolly_out";
  return (
    <svg
      width={size}
      height={size * 0.75}
      viewBox="0 0 48 36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <g transform={cameraTransforms[preset]}>
        <rect x="-9" y="-5" width="12" height="10" rx="1.6" />
        <path d="M3-2 9-5V5L3 2M-6-5v-3h6v3" />
        <path d="M-6-1h3" opacity=".45" />
      </g>
      <path d={movementPaths[preset]} />
      {dolly && <path d="M46 10v16" opacity=".35" />}
      {preset === "low" && <path d="M5 34h36" opacity=".35" />}
      {preset === "top" && <path d="M15 31v3h18v-3" opacity=".45" />}
    </svg>
  );
}
