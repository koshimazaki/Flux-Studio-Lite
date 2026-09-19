import { useEffect, useRef, useState } from "react";
import { createCameraScene } from "./create-camera-scene";

type Props = { preset: string; replay?: number };
type CameraScene = ReturnType<typeof createCameraScene>;

export default function CameraPreview({ preset, replay = 0 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<CameraScene | null>(null);
  const latestPreset = useRef(preset);
  latestPreset.current = preset;
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!canvas.current) return;
    const element = canvas.current;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    try {
      scene.current = createCameraScene(element);
    } catch {
      setUnavailable(true);
      return;
    }
    const visibility = () => scene.current?.setVisible(!document.hidden);
    const motion = () =>
      scene.current?.play(latestPreset.current, media.matches);
    const contextLost = (event: Event) => {
      event.preventDefault();
      scene.current?.dispose();
      scene.current = null;
      setUnavailable(true);
    };
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    element.addEventListener("webglcontextlost", contextLost);
    return () => {
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
      element.removeEventListener("webglcontextlost", contextLost);
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  useEffect(() => {
    scene.current?.play(
      preset,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, [preset, replay]);

  return (
    <div
      role="img"
      aria-label={`Illustrative camera path: ${preset.replaceAll("_", " ")}`}
      style={{ height: 270, width: "100%", position: "relative" }}
    >
      <canvas
        ref={canvas}
        aria-hidden="true"
        style={{
          display: unavailable ? "none" : "block",
          height: "100%",
          width: "100%",
        }}
      />
      {unavailable && (
        <p
          style={{
            padding: "72px 24px",
            textAlign: "center",
            color: "#a9b7b4",
          }}
        >
          3D preview unavailable. Your camera selection still applies.
        </p>
      )}
    </div>
  );
}
