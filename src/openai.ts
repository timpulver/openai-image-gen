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

async function request(method: string, path: string, body?: unknown, timeoutMs = 300_000): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(BASE + path, {
      method,
      headers: { Authorization: `Bearer ${getApiKey()}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json: any = await res.json().catch(() => undefined);
    if (res.ok) return json;

    const err = json?.error ?? {};
    // Rate limits and transient server errors: back off and retry twice.
    if ((res.status === 429 || res.status >= 500) && attempt < 2 && err.code !== "insufficient_quota") {
      const wait = Number(res.headers.get("retry-after")) * 1000 || 2000 * (attempt + 1) ** 2;
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (res.status === 401) clearCachedKey();
    let message = err.message || `OpenAI request failed with HTTP ${res.status}`;
    if (err.code === "moderation_blocked") {
      const d = err.moderation_details;
      message = `Blocked by OpenAI moderation${d?.moderation_stage ? ` (${d.moderation_stage} stage)` : ""}${
        d?.categories?.length ? `: ${d.categories.join(", ")}` : ""
      }.`;
    }
    throw new OpenAIError(res.status, err.code, message, err);
  }
}

export const createResponse = (body: unknown) => request("POST", "/responses", body);

export async function listModels(): Promise<string[]> {
  const json = await request("GET", "/models", undefined, 30_000);
  return (json.data as { id: string }[]).map((m) => m.id).sort();
}
