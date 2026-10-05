import { FetchError, ofetch } from "ofetch";
import { clearCachedKey, getApiKey } from "./config.js";

// Override only for testing or proxies; a dedicated name so a general OPENAI_BASE_URL never redirects this key.
const BASE = process.env.CLAUDE_IMAGE_GEN_API_BASE || "https://api.openai.com/v1";

export class OpenAIError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }

  /** previous_response_id no longer usable (expired, deleted, or store=false). */
  get isMissingPrevious(): boolean {
    return (
      this.code === "previous_response_not_found" ||
      ((this.status === 400 || this.status === 404) && /previous[_ ]response/i.test(this.message))
    );
  }
}

const RETRIES = 2;

const openai = ofetch.create({
  baseURL: BASE,
  retry: RETRIES,
  // Rate limits and transient server errors only.
  retryStatusCodes: [429, 500, 502, 503, 504],
  // Honour Retry-After; otherwise back off 2 s, then 8 s.
  retryDelay: (ctx) =>
    Number(ctx.response?.headers.get("retry-after")) * 1000 || 2000 * (RETRIES + 1 - Number(ctx.options.retry ?? RETRIES)) ** 2,
  onRequest: (ctx) => {
    ctx.options.headers.set("authorization", `Bearer ${getApiKey()}`);
  },
  // Never retry when no response arrived (timeout, network error): an image request may
  // already have run and been billed, and a timeout has already cost five minutes.
  onRequestError: (ctx) => {
    ctx.options.retry = false;
  },
  onResponseError: (ctx) => {
    // A 429 for an exhausted quota won't get better by waiting.
    if (ctx.response._data?.error?.code === "insufficient_quota") ctx.options.retry = false;
  },
});

/** Turn ofetch errors into OpenAIError with OpenAI's own message (and moderation details). */
async function request<T>(path: string, options: { method: "GET" | "POST"; body?: Record<string, unknown>; timeout: number }): Promise<T> {
  try {
    return await openai<T>(path, options);
  } catch (e) {
    if (!(e instanceof FetchError)) throw e;
    if (!e.response) {
      const timedOut = (e.cause as Error | undefined)?.name === "TimeoutError";
      throw new Error(timedOut ? `OpenAI didn't answer within ${options.timeout / 1000}s.` : `Could not reach OpenAI: ${e.message}`);
    }
    const status = e.response.status;
    const err = (e.data as any)?.error ?? {};
    if (status === 401) clearCachedKey();
    let message = err.message || `OpenAI request failed with HTTP ${status}`;
    if (err.code === "moderation_blocked") {
      const d = err.moderation_details;
      message = `Blocked by OpenAI moderation${d?.moderation_stage ? ` (${d.moderation_stage} stage)` : ""}${
        d?.categories?.length ? `: ${d.categories.join(", ")}` : ""
      }.`;
    }
    throw new OpenAIError(status, err.code, message, err);
  }
}

export const createResponse = (body: Record<string, unknown>) => request<any>("/responses", { method: "POST", body, timeout: 300_000 });

export async function listModels(): Promise<string[]> {
  const json = await request<{ data: { id: string }[] }>("/models", { method: "GET", timeout: 30_000 });
  return json.data.map((m) => m.id).sort();
}
