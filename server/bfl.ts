import { AppError } from "./errors";

export interface ProviderSubmission {
  id: string;
  polling_url: string;
  cost?: number | null;
}
export interface ProviderResult {
  id: string;
  status: string;
  progress?: number | null;
  cost?: number | null;
  result?: { sample?: string };
}
export type Fetcher = typeof fetch;

export function providerUrl(value: unknown, kind: "poll" | "media"): URL {
  let url: URL;
  try {
    url = new URL(String(value));
  } catch {
    throw new AppError(502, "The provider returned an invalid URL.");
  }
  const host = url.hostname.toLowerCase();
  const bflHost =
    host === "api.bfl.ai" || /^api\.[a-z0-9-]+\.bfl\.ai$/.test(host);
  const deliveryHost =
    host === "delivery.bfl.ai" || /^delivery\.[a-z0-9-]+\.bfl\.ai$/.test(host);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    (kind === "poll"
      ? !bflHost || url.pathname !== "/v1/get_result"
      : !deliveryHost)
  ) {
    throw new AppError(
      502,
      "The provider returned an unsupported delivery location.",
    );
  }
  return url;
}

export class BflClient {
  constructor(private readonly fetcher: Fetcher = fetch) {}

  async submit(
    generator: "video" | "upscale",
    body: object,
    key: string,
  ): Promise<ProviderSubmission> {
    const endpoint =
      generator === "video" ? "flux-3-video" : "flux-tools/video-upscale-v1";
    let response: Response;
    try {
      // An uncertain POST is never retried: it may already have incurred a charge.
      response = await this.fetcher(`https://api.bfl.ai/v1/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-key": key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(90_000),
        redirect: "error",
      });
    } catch {
      throw new AppError(
        502,
        "Submission could not be confirmed. Check BFL usage before trying again.",
        "submission_unknown",
      );
    }
    if (response.status >= 500)
      throw new AppError(
        502,
        "Submission could not be confirmed. Check BFL usage before trying again.",
        "submission_unknown",
      );
    const result = await this.readJson<ProviderSubmission>(response);
    if (!result.id || !result.polling_url)
      throw new AppError(
        502,
        "Submission could not be confirmed. Check BFL usage before trying again.",
        "submission_unknown",
      );
    providerUrl(result.polling_url, "poll");
    return result;
  }

  async poll(pollingUrl: string, key: string): Promise<ProviderResult> {
    const url = providerUrl(pollingUrl, "poll");
    const response = await this.fetcher(url, {
      headers: { "x-key": key },
      signal: AbortSignal.timeout(20_000),
      redirect: "error",
    });
    return this.readJson<ProviderResult>(response);
  }

  async download(url: string): Promise<Response> {
    const response = await this.fetcher(providerUrl(url, "media"), {
      signal: AbortSignal.timeout(60_000),
      redirect: "error",
    });
    if (response.status === 403 || response.status === 404)
      throw new AppError(
        410,
        "The provider’s video link expired before it could be saved.",
        "delivery_expired",
      );
    if (!response.ok || !response.body)
      throw new AppError(502, "The video download failed. We will try again.");
    return response;
  }

  private async readJson<T>(response: Response): Promise<T> {
    const messages: Record<number, string> = {
      401: "The API key was not accepted.",
      403: "This key does not have access to this endpoint.",
      402: "Your BFL account does not have enough credits.",
      429: "BFL is busy. Please wait before trying again.",
      422: "BFL could not accept these settings or this source video.",
    };
    if (!response.ok)
      throw new AppError(
        response.status === 429 ? 429 : 502,
        messages[response.status] ?? "BFL could not complete the request.",
        `provider_${response.status}`,
      );
    try {
      return (await response.json()) as T;
    } catch {
      throw new AppError(502, "BFL returned an unreadable response.");
    }
  }
}
