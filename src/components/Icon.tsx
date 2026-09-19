import type { CSSProperties } from "react";
const paths: Record<string, string> = {
  arrow: "M5 12h14m-5-5 5 5-5 5",
  turn: "M4 4v9h15m-5-5 5 5-5 5",
  palette:
    "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.6-3.2c-.9-1.2-.1-2.8 1.4-2.8h2a3 3 0 0 0 3-3 9 9 0 0 0-9-9ZM7 10h.01M10 6.5h.01M15 7.5h.01M6.5 14h.01",
  plus: "M12 5v14M5 12h14",
  camera:
    "M4 8h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Zm12 4 6-4v12l-6-4M6 8V4h6v4M5 12h3",
  chevron: "m8 10 4 4 4-4",
  expand: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5",
  key: "M14 10a4 4 0 1 0 0 .1M10 14l-7 7m3-3 2 2",
  copy: "M8 8h12v13H8zM4 16H2V2h13v3",
  close: "m6 6 12 12M6 18 18 6",
  play: "m9 5 11 7-11 7z",
  check: "m5 12 4 4L19 6",
  upload: "M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5",
  refresh: "M20 9a8 8 0 1 0 0 7M20 3v6h-6",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
};
export default function Icon({
  name,
  size = 18,
  style,
}: {
  name: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name] || paths.camera} />
    </svg>
  );
}
