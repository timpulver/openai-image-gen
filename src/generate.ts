import fs from "node:fs";
import path from "node:path";
import { cacheDir, loadSettings, writeFileAtomic } from "./config.js";
import { dimensions, toUploadable, MIME } from "./images.js";
import {
  ImageRecord,
  baseName,
  ensureLocal,
  imagePath,
  newIds,
  newRecordBase,
  randomToken,
  rememberBatch,
  resolveOne,
  saveRecord,
} from "./library.js";
import { OpenAIError, createResponse } from "./openai.js";
import { ResolvedRef, resolveRef } from "./refs.js";
import { gallery } from "./gallery/hub.js";

export interface GenerateArgs {
  prompt: string;
  count: number;
  /** Parent image id or "last": iterate on it. */
  from?: string;
  /** Extra reference images: ids, paths, URLs, paste:N. */
  refs?: string[];
  size?: string;
  quality?: string;
  format?: "png" | "jpeg" | "webp";
  background?: "auto" | "transparent" | "opaque";
  action?: "auto" | "generate" | "edit";
  /** Open the gallery for the user. */
  show: boolean;
}

export type SlotResult = { id: string; ok: true; record: ImageRecord } | { id: string; ok: false; error: string };

export interface BatchResult {
  batch: string;
  url: string;
  parent?: ImageRecord;
  refs: ResolvedRef[];
  results: SlotResult[];
  seconds: number;
}

// Stored responses expire after ~30 days; past that, skip straight to re-uploading the parent.
const RESPONSE_TTL_MS = 29 * 24 * 3600_000;

export async function generate(
  args: GenerateArgs,
  onProgress?: (done: number, total: number, message: string) => void,
): Promise<BatchResult> {
  const settings = loadSettings();
  const started = Date.now();
  const parent = args.from ? await resolveOne(args.from) : undefined;
  const refs = await Promise.all((args.refs ?? []).map(resolveRef));

  const tool: Record<string, unknown> = { type: "image_generation", model: settings.imageModel };
  const params: Record<string, string | null | undefined> = {
    size: args.size ?? settings.size,
    quality: args.quality ?? settings.quality,
    output_format: args.format ?? settings.outputFormat,
    background: args.background ?? settings.background,
    moderation: settings.moderation,
    action: args.action,
  };
  for (const [k, v] of Object.entries(params)) if (v) tool[k] = v;

  let parentDataUrl: Promise<string> | undefined;
  const getParentDataUrl = () =>
    (parentDataUrl ??= (async () => {
      const file = imagePath(parent!);
      await ensureLocal(file);
      const { data, ext } = await toUploadable(file);
      return `data:${MIME[ext]};base64,${data.toString("base64")}`;
    })());

  const canUsePrevious =
    !!parent?.openai.responseId && Date.now() - Date.parse(parent.createdAt) < RESPONSE_TTL_MS;

  async function request(mode: ImageRecord["context"]) {
    let text = args.prompt;
    const content: Record<string, unknown>[] = [];
    if (mode === "previous_response" && refs.length) {
      // Without this, the model may edit one of the attached references instead of the previous image.
      text = `Modify the previously generated image. The attached images are references only.\n\n${text}`;
    }
    if (mode === "parent_image") {
      text = `The first attached image is the image to modify${refs.length ? "; the others are references" : ""}.\n\n${text}`;
      content.push({ type: "input_image", image_url: await getParentDataUrl() });
    }
    for (const r of refs) content.push({ type: "input_image", image_url: r.dataUrl });
    content.unshift({ type: "input_text", text });
    const body: Record<string, unknown> = {
      model: settings.mainlineModel,
      input: [{ role: "user", content }],
      tools: [tool],
      tool_choice: { type: "image_generation" },
    };
    if (mode === "previous_response") body.previous_response_id = parent!.openai.responseId;
    return createResponse(body);
  }

  const batch = randomToken(6);
  const batchStarted = new Date();
  const ids = newIds(args.count);
  const url = await gallery.notify({
    type: "batch",
    batch,
    ids,
    prompt: args.prompt,
    parent: parent?.id,
    imageModel: settings.imageModel,
    createdAt: new Date().toISOString(),
  });
  if (args.show && settings.openGallery) gallery.open(url);

  let done = 0;
  const tick = setInterval(
    () => onProgress?.(done, args.count, `${done}/${args.count} done after ${Math.round((Date.now() - started) / 1000)}s`),
    5000,
  );

  async function runSlot(id: string, index: number): Promise<SlotResult> {
    try {
      let mode: ImageRecord["context"] = parent ? (canUsePrevious ? "previous_response" : "parent_image") : "none";
      let response: any;
      try {
        response = await request(mode);
      } catch (e) {
        if (!(mode === "previous_response" && e instanceof OpenAIError && e.isMissingPrevious)) throw e;
        mode = "parent_image";
        response = await request(mode);
      }
      if (process.env.CLAUDE_IMAGE_GEN_DEBUG) dumpResponse(id, response);

      const call = (response.output ?? []).find((o: any) => o.type === "image_generation_call" && o.result);
      if (!call) {
        const said = (response.output ?? [])
          .filter((o: any) => o.type === "message")
          .flatMap((o: any) => o.content ?? [])
          .map((c: any) => c.text)
          .filter(Boolean)
          .join(" ");
        throw new Error(`No image was returned.${said ? ` The model said: ${said}` : ""}`);
      }

      const ext = call.output_format || (tool.output_format as string) || "png";
      const file = `${baseName(id, args.prompt, batchStarted)}.${ext}`; // one date per batch, even across midnight
      const record: ImageRecord = {
        id,
        file,
        createdAt: new Date().toISOString(),
        batch,
        batchIndex: index,
        batchSize: args.count,
        prompt: args.prompt,
        revisedPrompt: call.revised_prompt,
        parent: parent?.id,
        refs: refs.map((r) => r.record),
        mainlineModel: settings.mainlineModel,
        imageModel: settings.imageModel,
        params: Object.fromEntries(
          ["size", "quality", "background", "output_format", "action"]
            .map((k) => [k, call[k] ?? tool[k]])
            .filter(([, v]) => v),
        ),
        context: mode,
        openai: { responseId: response.id, imageCallId: call.id, usage: { mainline: response.usage, image: response.tool_usage?.image_gen } },
        ...newRecordBase(),
      };
      writeFileAtomic(imagePath(record), Buffer.from(call.result, "base64"));
      const dims = await dimensions(imagePath(record));
      if (dims) Object.assign(record, dims);
      saveRecord(record);
      await gallery.notify({ type: "image", batch, id });
      return { id, ok: true, record };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      await gallery.notify({ type: "error", batch, id, message: error });
      return { id, ok: false, error };
    } finally {
      done++;
      onProgress?.(done, args.count, `${done}/${args.count} done`);
    }
  }

  try {
    const results = await Promise.all(ids.map(runSlot));
    rememberBatch(results.filter((r) => r.ok).map((r) => r.id));
    return { batch, url, parent, refs, results, seconds: Math.round((Date.now() - started) / 1000) };
  } finally {
    clearInterval(tick);
  }
}

export function fileSize(file: string): string {
  const bytes = fs.statSync(file).size;
  return bytes > 1 << 20 ? `${(bytes / (1 << 20)).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** CLAUDE_IMAGE_GEN_DEBUG=1: keep raw API responses (minus image data) for troubleshooting. */
function dumpResponse(id: string, response: any): void {
  const strip = (v: any): any =>
    Array.isArray(v)
      ? v.map(strip)
      : v && typeof v === "object"
        ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "result" && typeof x === "string" ? `<${x.length} base64 chars>` : strip(x)]))
        : v;
  const dir = path.join(cacheDir(), "debug");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(strip(response), null, 2));
}
