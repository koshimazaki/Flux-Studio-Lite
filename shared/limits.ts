/**
 * Every API route has a ceiling, and the numbers live here so the two backends
 * cannot drift: the Worker counts in D1 (shared across isolates), the local
 * Express server counts in one in-memory map.
 *
 * These protect this studio's own Cloudflare and upstream quota. They are not a
 * spending control: generation is always paid for with the visitor's own BFL
 * key, which the per-request balance check covers separately.
 */
export const RATE_WINDOW_MS = 60_000;

/** Requests per window, per browser session unless noted. */
export const RATE_LIMITS = {
  /** POST /api/jobs, /api/uploads and /api/jobs/:id/stop: state-changing requests. */
  submit: 8,
  /** The same writes counted per client IP, bounding one visitor's many sessions. */
  submitPerIp: 20,
  /** GET /api/credits: one upstream BFL call each. */
  credits: 20,
  /** GET /api/jobs/:id: the studio polls every 4s for each unfinished job. */
  poll: 120,
  /** GET /api/history: one D1 read pair each. */
  history: 60,
  /** Media reads. Players issue many small Range requests, so this stays loose. */
  media: 600,
} as const;

export type RateBucket = keyof typeof RATE_LIMITS;

export const RATE_LIMIT_MESSAGE = "Please wait a moment before trying again.";
