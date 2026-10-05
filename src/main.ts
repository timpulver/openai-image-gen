import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KEY_NAME, Settings, VERSION, expandHome, libraryDir, loadSettings, localSettingsPath, projectDir, saveSettings } from "./config.js";
import { BatchResult, generate } from "./generate.js";
import { gallery, runStandaloneGallery } from "./gallery/hub.js";
import { crop, extOf, preview } from "./images.js";
import { ImageRecord, allRecords, ensureLocal, imagePath, resolveOne, slugify, updateRecord } from "./library.js";
import { listModels } from "./openai.js";

const INSTRUCTIONS = `
Image generation via OpenAI (Responses API). Every image is kept permanently in the user's library
(${libraryDir()}, synced via iCloud across their Macs) and has a short id like "k7f2".

Rules:
- Images the USER asked for: always call generate_images with show=true so the live gallery opens for them,
  and give them the gallery link and the new ids. For images you generate as an intermediate step of a bigger task,
  use show=false and show the user only what matters (open_gallery).
- Iterating: pass from="<id>" (or "last") to refine an earlier image. Any earlier image can be refined, which branches.
  "last" fails if the last batch had several images; then ask which one (or pick and say so).
- References: pass images to use as references in refs: library ids, absolute file paths, URLs, or "paste:N" for the
  Nth image the user pasted into their most recent message that contains images ("[Image #2]" -> "paste:2").
  If a pasted image comes with a source path (e.g. "[Image: source: /path/to/file.png]"), pass that path instead.
- Shorthand: a leading number in a request means the variation count ("4 minimalist otter logo" -> count=4,
  prompt "minimalist otter logo"). Write a good prompt from the user's words; do not pad it with unrelated style.
- You get a preview of each result. Look at it critically. Use inspect_image with a region to zoom into details
  (text, hands, edges) before claiming an image is correct.
- Referencing images: in notes, plans and handoff documents for this user, refer to images as "img:<id>"; any session on
  any of the user's Macs can resolve them. Library paths must NOT appear in files committed to git or shared with others:
  use export_image to copy the image into the project first, then reference the exported copy.
`.trim();

const server = new McpServer({ name: "image-gen", version: VERSION }, { instructions: INSTRUCTIONS });

const text = (t: string) => ({ type: "text" as const, text: t });
const fail = (e: unknown) => ({ content: [text(`Error: ${e instanceof Error ? e.message : String(e)}`)], isError: true });
const home = (p: string) => p.replace(process.env.HOME ?? "\u0000", "~");
// The API reports the background it actually used, so only truly transparent images need a PNG preview.
const keepsAlpha = (r: ImageRecord) => r.params.background === "transparent" && extOf(r.file) !== "jpeg";

function describe(r: ImageRecord): string {
  const dims = r.width ? `${r.width}×${r.height}` : (r.params.size ?? "");
  const d = new Date(r.createdAt);
  const when = `${d.toLocaleDateString("sv-SE")} ${d.toTimeString().slice(0, 5)}`; // local time, YYYY-MM-DD HH:MM
  return `${r.id}  ${when}  ${r.starred ? "★ " : ""}${dims}  "${r.prompt.slice(0, 90)}${
    r.prompt.length > 90 ? "…" : ""
  }"${r.parent ? `  (from ${r.parent})` : ""}`;
}

server.registerTool(
  "generate_images",
  {
    title: "Generate images",
    description:
      "Generate one or more images (variations run in parallel). Optionally refine an earlier image (from) and/or pass reference images (refs). Returns ids, file paths, the gallery link and a preview of each image.",
    inputSchema: {
      prompt: z.string().min(1).describe("What to generate, or for a refinement: what to change."),
      count: z.number().int().min(1).max(8).default(1).describe("Number of variations."),
      from: z.string().optional().describe('Image id to refine, or "last".'),
      refs: z
        .array(z.string())
        .optional()
        .describe('Reference images: library ids, absolute paths, URLs, or "paste:N" for images pasted into the chat.'),
      size: z.string().optional().describe('e.g. "1024x1024", "1536x1024", "1024x1536", or WxH (multiples of 16, ≤3840, ratio ≤3:1).'),
      quality: z.enum(["low", "medium", "high", "xhigh", "max", "auto"]).optional(),
      format: z.enum(["png", "jpeg", "webp"]).optional(),
      background: z.enum(["auto", "transparent", "opaque"]).optional(),
      action: z.enum(["auto", "generate", "edit"]).optional().describe("Force editing vs. fresh generation; default lets the model decide."),
      show: z.boolean().default(true).describe("Open the gallery for the user. true for anything the user asked for."),
    },
    annotations: { readOnlyHint: false, openWorldHint: true },
  },
  async (args, extra) => {
    const token = extra._meta?.progressToken;
    const progress = (done: number, total: number, message: string) => {
      if (token === undefined) return;
      extra
        .sendNotification({ method: "notifications/progress", params: { progressToken: token, progress: done, total, message } })
        .catch(() => {});
    };
    let result: BatchResult;
    try {
      result = await generate(args as any, progress);
    } catch (e) {
      return fail(e);
    }
    const ok = result.results.filter((r) => r.ok);
    const lines = [
      `Batch ${result.batch}: ${ok.length}/${result.results.length} image(s) in ${result.seconds}s. Gallery: ${result.url}`,
    ];
    if (result.parent) lines.push(`Refined from ${result.parent.id}.`);
    if (result.refs.length) lines.push(`References: ${result.refs.map((r) => r.record.source + (r.record.origin ? ` (${r.record.origin})` : "")).join(", ")}`);
    const content: any[] = [];
    const edge = result.results.length === 1 ? 1024 : result.results.length <= 4 ? 768 : 512;
    for (const r of result.results) {
      if (!r.ok) {
        lines.push(`• ${r.id}: FAILED: ${r.error}`);
        continue;
      }
      const rec = r.record;
      lines.push(
        `• ${rec.id}: ${rec.width ?? "?"}×${rec.height ?? "?"}, ${home(imagePath(rec))}` +
          (rec.context === "parent_image" ? " (parent re-uploaded: stored context had expired)" : ""),
      );
      if (rec.revisedPrompt) lines.push(`  revised prompt: ${rec.revisedPrompt}`);
    }
    content.push(text(lines.join("\n")));
    for (const r of result.results) {
      if (!r.ok) continue;
      try {
        const p = await preview(imagePath(r.record), edge, keepsAlpha(r.record));
        content.push(text(`Preview of ${r.id}:`), { type: "image", data: p.data, mimeType: p.mimeType });
      } catch (e) {
        content.push(text(`(preview of ${r.id} unavailable: ${e})`));
      }
    }
    return { content, isError: ok.length === 0 };
  },
);

server.registerTool(
  "inspect_image",
  {
    title: "Inspect image",
    description:
      "Look at a library image in detail. region zooms into part of it at native resolution (use it to check text, faces, hands, edges). box gives a custom crop as fractions [x, y, width, height].",
    inputSchema: {
      id: z.string().describe('Image id or "last".'),
      region: z
        .enum(["full", "top-left", "top-right", "bottom-left", "bottom-right", "top", "bottom", "left", "right", "center"])
        .default("full"),
      box: z.array(z.number().min(0).max(1)).length(4).optional(),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ id, region, box }) => {
    try {
      const r = await resolveOne(id);
      const file = imagePath(r);
      await ensureLocal(file);
      const out = await crop(file, (box as [number, number, number, number]) ?? region, 1568, keepsAlpha(r));
      return {
        content: [
          text(`${r.id} ${box ? `box ${JSON.stringify(box)}` : region}: pixels x=${out.box.x} y=${out.box.y} w=${out.box.w} h=${out.box.h} of ${out.image.width}×${out.image.height}`),
          { type: "image" as const, data: out.data, mimeType: out.mimeType },
        ],
      };
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "list_images",
  {
    title: "List images",
    description: "List library images, newest first. Optionally filter by text, starred, or parent (to see refinements of an image).",
    inputSchema: {
      limit: z.number().int().min(1).max(200).default(20),
      query: z.string().optional(),
      starred: z.boolean().optional(),
      parent: z.string().optional().describe("Only images refined from this id."),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ limit, query, starred, parent }) => {
    const q = query?.toLowerCase();
    const rows = allRecords()
      .filter((r) => !starred || r.starred)
      .filter((r) => !parent || r.parent === parent)
      .filter((r) => !q || `${r.id} ${r.prompt} ${r.revisedPrompt ?? ""}`.toLowerCase().includes(q))
      .slice(0, limit);
    return { content: [text(rows.length ? rows.map(describe).join("\n") : "No matching images.")] };
  },
);

server.registerTool(
  "export_image",
  {
    title: "Export image",
    description:
      "Copy (never move) a library image into the project, e.g. for committing to git. dest may be a directory or a file path; a different extension converts the format (macOS). Stars the image by default.",
    inputSchema: {
      id: z.string(),
      dest: z.string().describe("Destination file or directory, relative to the project or absolute."),
      star: z.boolean().default(true),
      overwrite: z.boolean().default(false),
    },
    annotations: { readOnlyHint: false },
  },
  async ({ id, dest, star, overwrite }) => {
    try {
      const r = await resolveOne(id);
      const src = imagePath(r);
      await ensureLocal(src);
      let out = path.resolve(projectDir(), expandHome(dest));
      const isDir = dest.endsWith("/") || (fs.existsSync(out) && fs.statSync(out).isDirectory());
      if (isDir) out = path.join(out, `${slugify(r.prompt)}.${extOf(src)}`);
      else if (!extOf(out)) out += `.${extOf(src)}`; // "assets/logo" -> "assets/logo.png"
      if (fs.existsSync(out) && !overwrite) throw new Error(`${out} already exists (pass overwrite: true to replace it).`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const format = (ext: string) => (ext === "jpg" ? "jpeg" : ext);
      const want = format(extOf(out));
      if (want === format(extOf(src))) {
        fs.copyFileSync(src, out); // same format (incl. .jpg vs .jpeg): copy, never re-encode
      } else if (process.platform === "darwin") {
        execFileSync("sips", ["-s", "format", want, src, "--out", out], { stdio: "ignore" });
      } else {
        throw new Error(`Converting .${extOf(src)} to .${want} needs macOS; use a .${extOf(src)} destination.`);
      }
      await updateRecord(r.id, (rec) => {
        rec.exports = [...(rec.exports ?? []), { path: out, at: new Date().toISOString() }];
        if (star) rec.starred = true;
      });
      await gallery.notify({ type: "updated", id: r.id });
      return { content: [text(`Copied ${r.id} to ${out}${star ? " and starred it" : ""}.`)] };
    } catch (e) {
      return fail(e);
    }
  },
);

const nullable = (s: z.ZodTypeAny) => s.or(z.literal("default")).optional();

server.registerTool(
  "image_settings",
  {
    title: "Image settings",
    description:
      'Show or change persistent defaults (stored in the library, so they apply to all future sessions on all Macs). Pass only what should change; "default" resets a value to the API default.',
    inputSchema: {
      mainlineModel: z.string().optional().describe("Responses API model that drives the image tool."),
      imageModel: z.string().optional().describe("Image model, e.g. gpt-image-2.5-sunburst or gpt-image-2.5-flare."),
      size: nullable(z.string()),
      quality: nullable(z.enum(["low", "medium", "high", "xhigh", "max", "auto"])),
      outputFormat: nullable(z.enum(["png", "jpeg", "webp"])),
      background: nullable(z.enum(["auto", "transparent", "opaque"])),
      moderation: nullable(z.enum(["auto", "low"])),
      openGallery: z.boolean().optional(),
      galleryPort: z.number().int().min(1024).max(65535).optional(),
    },
    annotations: { readOnlyHint: false },
  },
  async (args) => {
    try {
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(args)) if (v !== undefined) patch[k] = v === "default" ? null : v;
      const s = Object.keys(patch).length ? saveSettings(patch as Partial<Settings>) : loadSettings();
      const keySource = process.env[KEY_NAME] ? `env var ${KEY_NAME}` : `Keychain item ${KEY_NAME} (if present)`;
      return {
        content: [
          text(
            `${Object.keys(patch).length ? "Saved. " : ""}Settings (null = API default):\n${JSON.stringify(s, null, 2)}\n` +
              `Library: ${libraryDir()} (settings shared by all Macs)\n` +
              `This Mac only: galleryPort, openGallery (${localSettingsPath()})\nAPI key from: ${keySource}`,
          ),
        ],
      };
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "list_image_models",
  {
    title: "List image models",
    description: "Ask OpenAI which image models (and candidate mainline models) this API key can use.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async () => {
    try {
      const ids = await listModels();
      const s = loadSettings();
      const image = ids.filter((m) => /image|dall-e/.test(m));
      const mainline = ids.filter((m) => /^(gpt-[4-9]|o\d)/.test(m) && !/image|audio|realtime|transcribe|tts|search|embedding/.test(m));
      return {
        content: [
          text(
            `Current: mainline=${s.mainlineModel}, image=${s.imageModel}\n\nImage models:\n${image.join("\n") || "(none)"}\n\n` +
              `Mainline candidates (not all support the image tool):\n${mainline.join("\n")}`,
          ),
        ],
      };
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "open_gallery",
  {
    title: "Open gallery",
    description: "Open the live gallery in the user's browser, optionally focused on a batch or an image.",
    inputSchema: { id: z.string().optional(), batch: z.string().optional() },
    annotations: { readOnlyHint: true },
  },
  async ({ id, batch }) => {
    try {
      if (id && !batch) batch = (await resolveOne(id)).batch;
      await gallery.ensure();
      const url = gallery.url(batch ? { batch } : {});
      gallery.open(url);
      return { content: [text(`Opened ${url}`)] };
    } catch (e) {
      return fail(e);
    }
  },
);

if (process.argv.includes("--gallery")) {
  await runStandaloneGallery();
} else {
  // The gallery's open sockets would otherwise keep us alive after Claude Code exits.
  process.stdin.on("close", () => process.exit(0));
  await server.connect(new StdioServerTransport());
}
