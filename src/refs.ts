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
    const { data, ext, origin } = await pastedImage(Number(paste[1]));
    return {
      record: { kind: "paste", source: `paste:${paste[1]}`, origin, stored: storeInput(data, ext) },
      dataUrl: dataUrl(data, ext),
    };
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
 * live as base64 blocks in the session transcript. We take the Nth image of the
 * most recent user message that has images.
 *
 * Which transcript: Claude Code exposes CLAUDE_CODE_SESSION_ID to processes it
 * starts, and the transcript is named after it. Without it we fall back to the
 * project's recently active transcripts, and refuse to guess when more than one
 * session pasted images recently (two sessions open in the same project).
 */
async function pastedImage(n: number): Promise<{ data: Buffer; ext: string; origin: string }> {
  const projectsDir = path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "projects");
  const dir = path.join(projectsDir, projectDir().replace(/[^a-zA-Z0-9]/g, "-"));

  let found: Found | undefined;
  const sessionId = process.env.CLAUDE_CODE_SESSION_ID;
  const sessionFile = sessionId ? findSessionTranscript(projectsDir, dir, sessionId) : undefined;
  if (sessionFile) {
    found = await lastUserImages(sessionFile);
    if (!found) throw new Error("No pasted images found in this session. Ask the user to paste the image again or give a file path.");
  } else {
    const recent = listTranscripts(dir).filter((f) => Date.now() - f.mtime < 30 * 60_000);
    const hits = (await Promise.all(recent.map((f) => lastUserImages(f.file)))).filter((h): h is Found => !!h);
    hits.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    const fresh = hits.filter((h) => Date.now() - Date.parse(h.timestamp) < 10 * 60_000);
    if (fresh.length > 1)
      throw new Error(
        "Several Claude sessions in this project pasted images in the last 10 minutes, so it's unclear which paste is meant. " +
          "Ask the user for a file path instead (dragging the file into the terminal inserts it).",
      );
    found = hits[0];
  }
  if (!found)
    throw new Error(
      `Could not find pasted image #${n} in this session's transcript (${dir}). ` +
        "Ask the user to drag the file in (which inserts its path) or give a file path instead.",
    );

  const img = found.images[n - 1];
  if (!img) throw new Error(`The last message with images has ${found.images.length} image(s); there is no image #${n}.`);
  const ext = Object.entries(MIME).find(([, m]) => m === img.mediaType)?.[0] ?? "png";
  const origin = `pasted ${found.timestamp.slice(0, 16).replace("T", " ")} UTC in session ${path.basename(found.file, ".jsonl").slice(0, 8)}${sessionFile ? "" : ", matched by recency"}`;
  return { data: Buffer.from(img.data, "base64"), ext, origin };
}

function listTranscripts(dir: string): { file: string; mtime: number }[] {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => ({ file: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return [];
  }
}

/** The session's transcript, usually in this project's folder; otherwise search all projects (e.g. cwd mismatch). */
function findSessionTranscript(projectsDir: string, dir: string, sessionId: string): string | undefined {
  const name = `${sessionId}.jsonl`;
  if (fs.existsSync(path.join(dir, name))) return path.join(dir, name);
  try {
    for (const d of fs.readdirSync(projectsDir)) {
      const candidate = path.join(projectsDir, d, name);
      if (fs.existsSync(candidate)) return candidate;
    }
  } catch {
    // no projects dir
  }
  return undefined;
}

type Img = { mediaType: string; data: string };
type Found = { file: string; images: Img[]; timestamp: string };

const CHUNK = 4 << 20;
const MAX_SCAN = 256 << 20; // give up after reading this much of a transcript
const MAX_LINE = 128 << 20; // well below V8's ~512 MB string limit

/**
 * Scan a JSONL transcript backwards in fixed-size async chunks (transcripts can
 * be gigabytes; this keeps memory bounded and doesn't block the gallery server).
 * Only top-level image blocks of user messages count: images inside tool_result
 * blocks are tool output (e.g. screenshots Claude looked at), not pastes.
 */
async function lastUserImages(file: string): Promise<Found | undefined> {
  const fh = await fs.promises.open(file, "r");
  try {
    let pos = (await fh.stat()).size;
    let carry = Buffer.alloc(0); // start of a line whose beginning we haven't read yet
    let scanned = 0;
    while (pos > 0 && scanned < MAX_SCAN) {
      const len = Math.min(CHUNK, pos);
      pos -= len;
      scanned += len;
      const chunk = Buffer.alloc(len);
      await fh.read(chunk, 0, len, pos);
      const buf = Buffer.concat([chunk, carry]);
      let end = buf.length;
      while (end > 0) {
        const nl = buf.lastIndexOf(10, end - 1);
        if (nl < 0) break;
        const hit = parseLine(buf.subarray(nl + 1, end), file);
        if (hit) return hit;
        end = nl;
      }
      carry = Buffer.from(buf.subarray(0, end));
      if (carry.length > MAX_LINE) return undefined;
    }
    return pos === 0 ? parseLine(carry, file) : undefined;
  } finally {
    await fh.close();
  }
}

function parseLine(line: Buffer, file: string): Found | undefined {
  if (!line.length || !line.includes('"image"') || !line.includes('"user"')) return undefined;
  try {
    const entry = JSON.parse(line.toString("utf8"));
    if (entry.type !== "user" || !Array.isArray(entry.message?.content)) return undefined;
    const images: Img[] = entry.message.content
      .filter((b: any) => b?.type === "image" && b.source?.type === "base64")
      .map((b: any) => ({ mediaType: b.source.media_type, data: b.source.data }));
    return images.length ? { file, images, timestamp: entry.timestamp ?? "" } : undefined;
  } catch {
    return undefined; // partial or malformed line
  }
}
