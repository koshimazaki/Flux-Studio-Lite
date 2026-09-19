export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "request_failed",
  ) {
    super(message);
  }
}

export function requireKey(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 8 ||
    value.length > 512 ||
    /[\s\x00-\x1f]/.test(value)
  ) {
    throw new AppError(400, "Enter a valid BFL API key.", "invalid_key");
  }
  return value;
}
