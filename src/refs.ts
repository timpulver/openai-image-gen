import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expandHome, inputsDir, projectDir, writeFileAtomic } from "./config.js";
import { MIME, isSupportedInput, toUploadable } from "./images.js";
import { RefRecord, ensureLocal, imagePath, isImageId, resolveOne } from "./library.js";

export interface ResolvedRef {
  record: RefRecord;
  dataUrl: string;
}

const PASTE_RE = /^(?:paste:|\[?image\s*#?)(\d+)\]?$/i;

function dataUrl(data: Buffer, ext: string): string {
  return `data:${MIME[ext] ?? "image/png"};base64,${data.toString("base64")}`;
}

/** Content-addressed copy in inputs/, so references survive temp files and dead URLs. */
function storeInput(data: Buffer, ext: string): string {
  const name = `${createHash("sha256").update(data).digest("hex").slice(0, 16)}.${ext}`;
  const file = path.join(inputsDir(), name);
  if (!fs.existsSync(file)) writeFileAtomic(file, data);
  return name;
}

export async function resolveRef(ref: string): Promise<ResolvedRef> {
  const raw = ref.trim();
  const key = raw.replace(/^#|^img:/, "").toLowerCase();

  if (key === "last" || isImageId(key)) {
    const r = await resolveOne(key);
    const file = imagePath(r);
    await ensureLocal(file);
    const { data, ext } = await toUploadable(file);
    return { record: { kind: "library", source: raw, stored: r.id }, dataUrl: dataUrl(data, ext) };
  }

  const paste = PASTE_RE.exec(raw);
  if (paste) {
    const { data, ext } = await pastedImage(Number(paste[1]));
    return { record: { kind: "paste", source: `paste:${paste[1]}`, stored: storeInput(data, ext) }, dataUrl: dataUrl(data, ext) };
  }

  if (/^https?:\/\//i.test(raw)) {
    const res = await fetch(raw, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`Could not download ${raw}: HTTP ${res.status}`);
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    const ext = Object.entries(MIME).find(([, m]) => m === type)?.[0];
    if (!ext) throw new Error(`${raw} is not a png/jpeg/webp/gif image (content-type: ${type || "unknown"}).`);
    const data = Buffer.from(await res.arrayBuffer());
    return { record: { kind: "url", source: raw, stored: storeInput(data, ext) }, dataUrl: dataUrl(data, ext) };
  }

  const file = path.resolve(projectDir(), expandHome(raw.replace(/^file:\/\//, "")));
  if (!fs.existsSync(file)) throw new Error(`Reference not found: ${raw} (looked for ${file})`);
  if (!isSupportedInput(file)) throw new Error(`Unsupported reference image type: ${file}`);
  const { data, ext } = await toUploadable(file);
  return { record: { kind: "file", source: file, stored: storeInput(data, ext) }, dataUrl: dataUrl(data, ext) };
}

/**
 * Images pasted into Claude Code are never written to disk on their own; they
 * live as base64 blocks in the session transcript. We find the transcript for
 * this project and take the Nth image of the most recent user message that has
 * images.
 */
async function pastedImage(n: number): Promise<{ data: Buffer; ext: string }> {
  const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  const dir = path.join(configDir, "projects", projectDir().replace(/[^a-zA-Z0-9]/g, "-"));
  let files: { file: string; mtime: number }[] = [];
  try {
    files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => ({ file: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    // no transcripts
  }
  // The active session's transcript is the one being written right now.
  const recent = files.filter((f) => Date.now() - f.mtime < 30 * 60_000).slice(0, 3);
  for (const { file } of recent) {
    const images = lastUserImages(file);
    if (!images) continue;
    const img = images[n - 1];
    if (!img) throw new Error(`Your last message with images has ${images.length} image(s); there is no image #${n}.`);
    const ext = Object.entries(MIME).find(([, m]) => m === img.mediaType)?.[0] ?? "png";
    return { data: Buffer.from(img.data, "base64"), ext };
  }
  throw new Error(
    `Could not find pasted image #${n} in this session's transcript (${dir}). ` +
      "Ask the user to drag the file in (which inserts its path) or give a file path instead.",
  );
}

type Img = { mediaType: string; data: string };

/** Scan a JSONL transcript from the end, growing the window until a match or the start of the file. */
function lastUserImages(file: string): Img[] | undefined {
  const size = fs.statSync(file).size;
  const fd = fs.openSync(file, "r");
  try {
    for (let window = 8 << 20; ; window *= 4) {
      const start = Math.max(0, size - window);
      const buf = Buffer.alloc(size - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      const lines = buf.toString("utf8").split("\n");
      if (start > 0) lines.shift(); // first line is probably cut off
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (!line.includes('"image"') || !line.includes('"user"')) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.type !== "user" || !Array.isArray(entry.message?.content)) continue;
          const imgs: Img[] = entry.message.content
            .filter((b: any) => b?.type === "image" && b.source?.type === "base64")
            .map((b: any) => ({ mediaType: b.source.media_type, data: b.source.data }));
          if (imgs.length) return imgs;
        } catch {
          // partial or malformed line
        }
      }
      if (start === 0 || window > 512 << 20) return undefined;
    }
  } finally {
    fs.closeSync(fd);
  }
}
