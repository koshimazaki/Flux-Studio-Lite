import { useEffect, useRef } from "react";
import { drawGenerationCube } from "../effects/generation-cube";

export default function GenerationSculpture() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      previous = 0,
      seconds = 0,
      visible = true;
    let colors = { accent: "", secondary: "", surface: "" };
    const paint = () => drawGenerationCube(ctx, seconds, colors);
    const tick = (now: number) => {
      if (now - previous >= 1000 / 30) {
        seconds += previous ? Math.min(now - previous, 100) / 1000 : 0;
        previous = now;
        paint();
      }
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      paint();
      if (!motion.matches && !document.hidden && visible)
        frame = requestAnimationFrame(tick);
    };
    const theme = () => {
      const style = getComputedStyle(canvas);
      colors = {
        accent: style.getPropertyValue("--accent").trim(),
        secondary:
          style.getPropertyValue("--camera-shot").trim() || style.color,
        surface: style.getPropertyValue("--surface").trim(),
      };
      paint();
    };
    const resize = new ResizeObserver(() => {
      const { width, height } = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      paint();
    });
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    const themes = new MutationObserver(theme);
    themes.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    resize.observe(canvas);
    intersection.observe(canvas);
    motion.addEventListener("change", resume);
    document.addEventListener("visibilitychange", resume);
    theme();
    resume();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      themes.disconnect();
      motion.removeEventListener("change", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
  return (
    <canvas ref={ref} className="generation-sculpture" aria-hidden="true" />
  );
}
