import type { CameraTerm, CameraSection } from "../../shared/camera";
/** Three parametric glyphs read the same pose data as the 3D rig. */
export default function CameraGlyph({
  section,
  term,
}: {
  section: CameraSection;
  term: CameraTerm;
}) {
  const {
    distance = 2.7,
    elevation = 0,
    roll = 0,
    motion,
    amount = 0,
  } = term.pose;
  return (
    <svg
      width="2.625em"
      height="1.969em"
      viewBox="0 0 48 36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {section.glyph === "frame" ? (
        <>
          <path d="M5 12V5h9m20 0h9v7M5 24v7h9m20 0h9v-7" />
          <g
            transform={`translate(24 18) scale(${Math.min(2, 2.7 / distance)})`}
          >
            <circle cy="-6" r="2.5" />
            <path d="M-4 4v-6q4-3 8 0v6M-2 4v5m4-5v5" />
          </g>
        </>
      ) : section.glyph === "angle" ? (
        <>
          <path d="M4 31h40" opacity=".3" />
          <circle cx="24" cy="18" r="3" />
          <g transform={`translate(24 18) rotate(${-elevation + roll})`}>
            <path d="M-17 0h10m24 0h-9" strokeDasharray="2 3" />
            <rect x="-22" y="-4" width="7" height="8" rx="1" />
          </g>
        </>
      ) : (
        <>
          <rect x="18" y="13" width="11" height="10" rx="2" />
          <path d="m29 16 6-3v10l-6-3M21 13v-3h5v3" />
          {motion === "orbit" || motion === "arc" || motion === "subject" ? (
            <path
              d={`M8 17C8 3 40 3 40 18S8 32 8 23m0 0-3 4m3-4 5 1`}
              strokeDasharray={amount < 360 ? "18 4" : undefined}
            />
          ) : (
            <g
              transform={`rotate(${motion === "tilt" || motion === "crane" ? -90 : 0} 24 18)`}
            >
              <path d="M6 29h34m-4-4 4 4-4 4" />
            </g>
          )}
        </>
      )}
    </svg>
  );
}
