import { describe, expect, it } from "vitest";
import {
  CAMERA_PRESETS,
  cameraPath,
  cameraPose,
} from "../src/scene/camera-paths";

describe("camera paths", () => {
  it("keeps every sample finite, above the ground and aimed at the same subject", () => {
    for (const preset of CAMERA_PRESETS) {
      for (let step = 0; step <= 100; step++) {
        const pose = cameraPose(preset, step / 100);
        expect(pose.position.every(Number.isFinite)).toBe(true);
        expect(pose.position[1]).toBeGreaterThan(0);
        expect(pose.target).toEqual([0, 0.9, 0]);
      }
    }
  });

  it("mirrors left and right orbits and preserves the radius", () => {
    for (let step = 1; step <= 10; step++) {
      const left = cameraPose("orbit_l", step / 10).position;
      const right = cameraPose("orbit_r", step / 10).position;
      expect(left[0]).toBeCloseTo(-right[0]);
      expect(left[2]).toBeCloseTo(right[2]);
      expect(Math.hypot(left[0], left[2])).toBeCloseTo(2.7);
    }
  });

  it("completes a full orbit without drifting from the initial pose", () => {
    const start = cameraPose("orbit_360", 0).position;
    cameraPose("orbit_360", 1).position.forEach((value, i) =>
      expect(value).toBeCloseTo(start[i]),
    );
    expect(cameraPose("orbit_360", 0.5).position[2]).toBeLessThan(0);
  });

  it("makes dolly in and dolly out reciprocal paths at constant height", () => {
    for (let step = 0; step <= 10; step++) {
      const inward = cameraPose("dolly_in", step / 10).position;
      const outward = cameraPose("dolly_out", 1 - step / 10).position;
      inward.forEach((value, i) => expect(value).toBeCloseTo(outward[i]));
    }
  });

  it("distinguishes low, high, and overhead framing", () => {
    expect(cameraPose("low", 1).position[1]).toBeLessThan(0.9);
    expect(cameraPose("crane_up", 1).position[1]).toBeGreaterThan(0.9);
    expect(cameraPose("top", 1).position[2]).toBeLessThan(0.5);
  });

  it("clamps progress and falls back to a neutral pose for unknown presets", () => {
    expect(cameraPose("low", -2)).toEqual(cameraPose("low", 0));
    expect(cameraPose("low", 2)).toEqual(cameraPose("low", 1));
    expect(cameraPose("low", NaN)).toEqual(cameraPose("low", 0));
    expect(cameraPose("unknown", 1)).toEqual(cameraPose("unknown", 0));
    expect(cameraPath("top", 0)).toHaveLength(2);
    expect(cameraPath("top", Infinity)).toHaveLength(49);
  });
});
