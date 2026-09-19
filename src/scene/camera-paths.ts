export const CAMERA_PRESETS = [
  "orbit_l",
  "orbit_r",
  "orbit_360",
  "dolly_in",
  "dolly_out",
  "crane_up",
  "low",
  "top",
] as const;

export type CameraPreset = (typeof CAMERA_PRESETS)[number];
export type Point3 = [number, number, number];
export type CameraPose = { position: Point3; target: Point3 };

const TARGET: Point3 = [0, 0.9, 0];
const RADIUS = 2.7;

/** Deterministic paths describe camera movement, not a promise about model output. */
export function cameraPose(preset: string, progress: number): CameraPose {
  const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const eased = t * t * (3 - 2 * t);
  const target: Point3 = [...TARGET];
  let position: Point3 = [0, 1.3, RADIUS];

  switch (preset) {
    case "orbit_l":
    case "orbit_r":
    case "orbit_360": {
      const angle =
        eased *
        (preset === "orbit_360" ? 2 * Math.PI : Math.PI / 4) *
        (preset === "orbit_l" ? -1 : 1);
      position = [Math.sin(angle) * RADIUS, 1.3, Math.cos(angle) * RADIUS];
      break;
    }
    case "dolly_in":
      position = [0, 1.3, RADIUS - eased * 1.1];
      break;
    case "dolly_out":
      position = [0, 1.3, 1.6 + eased * 1.1];
      break;
    case "crane_up":
      position = [0, 1.3 + eased * 1.7, RADIUS];
      break;
    case "low":
      position = [0, 1.3 - eased * 1.03, RADIUS];
      break;
    case "top":
      position = [0, 1.3 + eased * 2.1, RADIUS - eased * 2.35];
      break;
  }

  return { position, target };
}

export function cameraPath(preset: string, segments = 48): Point3[] {
  const count = Number.isFinite(segments)
    ? Math.max(1, Math.min(128, Math.floor(segments)))
    : 48;
  return Array.from(
    { length: count + 1 },
    (_, i) => cameraPose(preset, i / count).position,
  );
}
