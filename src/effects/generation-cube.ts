type Point = [number, number, number];
const corners: Point[] = [
  [-1, -1, -1],
  [1, -1, -1],
  [1, 1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
  [1, -1, 1],
  [1, 1, 1],
  [-1, 1, 1],
];
const sides = [
  [0, 3, 2, 1],
  [4, 5, 6, 7],
  [0, 4, 7, 3],
  [1, 2, 6, 5],
  [0, 1, 5, 4],
  [3, 7, 6, 2],
];
function turn([x, y, z]: Point, angle: number, axis: "x" | "y"): Point {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return axis === "y"
    ? [x * c + z * s, y, z * c - x * s]
    : [x, y * c - z * s, y * s + z * c];
}

/** Small projected 3D sculpture; decorative motion, never a progress estimate. */
export function drawGenerationCube(
  ctx: CanvasRenderingContext2D,
  seconds: number,
  colors: { accent: string; secondary: string; surface: string },
) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  const scale = Math.min(width, height) * 0.235;
  const phase = (seconds % 8) / 8;
  const progress = Math.max(0, Math.min(1, ((phase % 0.5) - 0.08) / 0.34));
  const eased = progress * progress * (3 - 2 * progress);
  const twist = (eased * Math.PI) / 2;
  const axis = phase < 0.5 ? "y" : "x";
  const gap = 0.55 + Math.sin(progress * Math.PI) * 0.12;
  const view = (p: Point) =>
    turn(turn(p, 0.65 + seconds * 0.12, "y"), -0.48, "x");
  const project = ([x, y, z]: Point) => {
    const perspective = 5 / (5 - z);
    return [
      width / 2 + x * scale * perspective,
      height / 2 - y * scale * perspective,
    ];
  };
  const faces: { vertices: Point[]; depth: number; tone: number }[] = [];
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1]) {
        const vertices = corners.map(([a, b, c]) => {
          let p: Point = [
            x * gap + a * 0.44,
            y * gap + b * 0.44,
            z * gap + c * 0.44,
          ];
          if ((axis === "y" ? y : x) > 0) p = turn(p, twist, axis);
          return view(p);
        });
        sides.forEach((indices, tone) => {
          const points = indices.map((i) => vertices[i]);
          const [a, b, c] = points;
          const normal: Point = [
            (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
            (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
            (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
          ];
          if (
            normal[0] * -a[0] + normal[1] * -a[1] + normal[2] * (5 - a[2]) >
            0
          )
            faces.push({
              vertices: points,
              depth: points.reduce((sum, p) => sum + p[2], 0) / 4,
              tone,
            });
        });
      }
  ctx.lineWidth = Math.max(0.75, width / 140);
  ctx.lineJoin = "round";
  for (const face of faces.sort((a, b) => a.depth - b.depth)) {
    ctx.beginPath();
    face.vertices.forEach((p, i) => {
      const [x, y] = project(p);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.surface;
    ctx.fill();
    ctx.fillStyle = face.tone % 2 ? colors.accent : colors.secondary;
    ctx.globalAlpha = 0.15 + (face.depth + 2) * 0.08;
    ctx.fill();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = face.tone % 2 ? colors.accent : colors.secondary;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
