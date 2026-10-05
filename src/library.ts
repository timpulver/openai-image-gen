import { execFile } from "node:child_process";
import { randomInt } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { explainFsError, imagesDir, projectDir, writeFileAtomic } from "./config.js";

export interface RefRecord {
  /** library = another image in the library, file/url/paste = stored copy in inputs/ */
  kind: "library" | "file" | "url" | "paste";
  /** What the user pointed at: an image id, a path, a URL, or "paste:N". */
  source: string;
  /** Library image id (kind=library) or file name inside inputs/. */
  stored: string;
  /** For pastes: which session/message the image came from, so mix-ups are visible. */
  origin?: string;
}

export interface ImageRecord {
  id: string;
  /** File name inside images/ */
  file: string;
  createdAt: string;
  batch: string;
  batchIndex: number;
  batchSize: number;
  prompt: string;
  revisedPrompt?: string;
  parent?: string;
  refs: RefRecord[];
  mainlineModel: string;
  imageModel: string;
  params: Record<string, string>;
  width?: number;
  height?: number;
  /** How the parent was passed: stored OpenAI context, or the parent image re-uploaded. */
  context: "none" | "previous_response" | "parent_image";
  openai: { responseId?: string; imageCallId?: string; usage?: unknown };
  machine: string;
  cwd: string;
  starred?: boolean;
  exports?: { path: string; at: string }[];
}

// No 0/1/i/l/o: easy to read and type. IDs always mix letters and digits,
// which also keeps them from colliding with ordinary words like "cats".
const LETTERS = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";
const ALPHABET = LETTERS + DIGITS;
export const ID_RE = /^[a-z2-9]{4}$/;

export function isImageId(s: string): boolean {
  return ID_RE.test(s) && /[a-z]/.test(s) && /[2-9]/.test(s);
}

function randomId(): string {
  for (;;) {
    let id = "";
    for (let i = 0; i < 4; i++) id += ALPHABET[randomInt(ALPHABET.length)];
    if (isImageId(id)) return id;
  }
}

export function randomToken(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

// File names: 2026-10-05-k7f2-minimalist-otter-logo.png (+ .json sidecar)
const NAME_RE = /^(\d{4}-\d{2}-\d{2})-([a-z2-9]{4})(?:-[^.]*)?\.([a-z0-9]+)$/;

/** iCloud replaces offloaded files with ".<name>.icloud" placeholders. */
function realName(entry: string): string {
  return entry.startsWith(".") && entry.endsWith(".icloud") ? entry.slice(1, -".icloud".length) : entry;
}

interface DirIndex {
  dir: string;
  mtimeMs: number;
  /** Raw directory entries (including iCloud placeholders). */
  entries: string[];
  /** id -> sidecar file names (real names, placeholders resolved). */
  sidecars: Map<string, string[]>;
}
let cachedIndex: DirIndex | undefined;

/**
 * The images/ listing, re-read only when the directory's mtime changes (adding,
 * removing or renaming a file updates it; editing a sidecar in place doesn't
 * need to). Saves a full readdir per lookup: the gallery resolves every tile by id.
 */
function dirIndex(): DirIndex {
  const dir = imagesDir();
  let mtimeMs: number;
  let entries: string[];
  try {
    mtimeMs = fs.statSync(dir).mtimeMs;
    if (cachedIndex?.dir === dir && cachedIndex.mtimeMs === mtimeMs) return cachedIndex;
    entries = fs.readdirSync(dir);
  } catch (e: any) {
    // Only a missing folder means "empty library"; a blocked one must not look empty.
    if (e?.code === "ENOENT") return { dir, mtimeMs: -1, entries: [], sidecars: new Map() };
    throw explainFsError(e, dir);
  }
  const sidecars = new Map<string, string[]>();
  for (const e of entries) {
    const name = realName(e);
    const m = NAME_RE.exec(name);
    if (m && m[3] === "json") sidecars.set(m[2], [...(sidecars.get(m[2]) ?? []), name]);
  }
  return (cachedIndex = { dir, mtimeMs, entries, sidecars });
}

function listEntries(): string[] {
  return dirIndex().entries.map(realName);
}

const reserved = new Set<string>();

/** IDs already on disk or handed out by this process but not yet written. */
export function newIds(count: number): string[] {
  const taken = new Set(listEntries().map((e) => NAME_RE.exec(e)?.[2]).filter(Boolean) as string[]);
  const out: string[] = [];
  while (out.length < count) {
    const id = randomId();
    if (taken.has(id) || reserved.has(id)) continue;
    reserved.add(id);
    out.push(id);
  }
  return out;
}

export function slugify(text: string, maxWords = 6): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, maxWords)
      .join("-")
      .slice(0, 48)
      .replace(/-+$/, "") || "image"
  );
}

/** The date is local (an image made at 00:30 in Berlin belongs to that day, not the previous UTC one). */
export function baseName(id: string, prompt: string, date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${day}-${id}-${slugify(prompt)}`;
}

/**
 * Make sure an iCloud file is actually on disk. If it was offloaded ("Optimise
 * Mac Storage"), ask iCloud to download it and wait.
 */
export async function ensureLocal(file: string, timeoutMs = 90_000): Promise<void> {
  if (fs.existsSync(file)) return;
  const placeholder = path.join(path.dirname(file), `.${path.basename(file)}.icloud`);
  if (!fs.existsSync(placeholder)) throw Object.assign(new Error(`File not found: ${file}`), { code: "ENOENT" });
  await new Promise<void>((resolve) => execFile("brctl", ["download", file], () => resolve()));
  const start = Date.now();
  while (!fs.existsSync(file)) {
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for iCloud to download ${file}`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

const recordCache = new Map<string, { mtimeMs: number; record: ImageRecord }>();

function readRecordSync(jsonName: string): ImageRecord | undefined {
  const file = path.join(imagesDir(), jsonName);
  try {
    const { mtimeMs } = fs.statSync(file);
    const hit = recordCache.get(jsonName);
    if (hit && hit.mtimeMs === mtimeMs) return hit.record;
    const record = JSON.parse(fs.readFileSync(file, "utf8")) as ImageRecord;
    recordCache.set(jsonName, { mtimeMs, record });
    return record;
  } catch {
    return undefined;
  }
}

const downloadRequested = new Set<string>();

/** Ask iCloud for an offloaded file once per process (the feed reloads often; brctl is a process spawn). */
function requestDownload(file: string): void {
  if (downloadRequested.has(file)) return;
  downloadRequested.add(file);
  execFile("brctl", ["download", file], () => {});
}

/** All records, newest first. Sidecars that iCloud offloaded are requested and skipped this time. */
export function allRecords(): ImageRecord[] {
  const out: ImageRecord[] = [];
  for (const entry of dirIndex().entries) {
    if (entry.endsWith(".json.icloud")) {
      requestDownload(path.join(imagesDir(), realName(entry)));
      continue;
    }
    if (!entry.endsWith(".json") || entry.startsWith(".")) continue;
    const r = readRecordSync(entry);
    if (r) out.push(r);
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.batchIndex - b.batchIndex));
}

function jsonNameFor(id: string): string | undefined {
  const names = dirIndex().sidecars.get(id);
  // Two Macs can (very rarely) pick the same id before iCloud syncs. Never guess which one is meant.
  if (names && names.length > 1)
    throw new Error(`Image id "${id}" exists more than once: ${names.join(", ")}. Rename one of the files (both .json and image) to a new id.`);
  return names?.[0];
}

export async function getRecord(id: string): Promise<ImageRecord | undefined> {
  const name = jsonNameFor(id);
  if (!name) return undefined;
  await ensureLocal(path.join(imagesDir(), name));
  return readRecordSync(name);
}

export function imagePath(record: ImageRecord): string {
  return path.join(imagesDir(), record.file);
}

export function saveRecord(record: ImageRecord): void {
  const json = record.file.replace(/\.[a-z0-9]+$/, ".json");
  writeFileAtomic(path.join(imagesDir(), json), JSON.stringify(record, null, 2) + "\n");
}

export async function updateRecord(id: string, patch: (r: ImageRecord) => void): Promise<ImageRecord> {
  const r = await getRecord(id);
  if (!r) throw new Error(`Unknown image id "${id}"`);
  patch(r);
  saveRecord(r);
  return r;
}

export function childrenOf(id: string): ImageRecord[] {
  return allRecords().filter((r) => r.parent === id);
}

/** Batches generated by this process, most recent last. Backs "last". */
const sessionBatches: string[][] = [];

export function rememberBatch(ids: string[]): void {
  if (ids.length) sessionBatches.push(ids);
}

/**
 * Resolve "last" (or an id) to exactly one record. "last" prefers this
 * session's most recent batch and falls back to the newest image in the library.
 */
export async function resolveOne(ref: string): Promise<ImageRecord> {
  const key = ref.trim().replace(/^#|^img:/, "").toLowerCase();
  if (key === "last") {
    const batch = sessionBatches.at(-1);
    if (batch && batch.length > 1)
      throw new Error(`"last" is ambiguous: the last batch has ${batch.length} images (${batch.join(", ")}). Pick one.`);
    let id = batch?.[0];
    if (!id) {
      // Nothing generated in this session yet: use the newest image in the library, with the same ambiguity rule.
      const all = allRecords();
      const newest = all[0];
      if (!newest) throw new Error("The library is empty, so there is no last image yet.");
      const siblings = all.filter((r) => r.batch === newest.batch).map((r) => r.id);
      if (siblings.length > 1)
        throw new Error(`"last" is ambiguous: the newest batch has ${siblings.length} images (${siblings.join(", ")}). Pick one.`);
      id = newest.id;
    }
    const r = await getRecord(id);
    if (!r) throw new Error(`Image ${id} is missing from the library.`);
    return r;
  }
  if (!isImageId(key)) throw new Error(`"${ref}" is not an image id (ids look like k7f2).`);
  const r = await getRecord(key);
  if (!r) throw new Error(`No image with id "${key}" in the library.`);
  return r;
}

export function newRecordBase(): Pick<ImageRecord, "machine" | "cwd"> {
  return { machine: os.hostname(), cwd: projectDir() };
}
