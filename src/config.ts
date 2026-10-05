import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const APP_NAME = "claude-image-gen";
export const VERSION = "0.1.0";

/** Name of the env var AND of the macOS Keychain item (service) holding the OpenAI key. */
export const KEY_NAME = "OPENAI_API_KEY_FOR_CLAUDE_IMAGE_GEN";

export function expandHome(p: string): string {
  return p === "~" || p.startsWith("~/") ? path.join(os.homedir(), p.slice(1)) : p;
}

/**
 * The library holds every generated image. It defaults to iCloud Drive (so all
 * Macs share it) and falls back to ~/Pictures. Override with CLAUDE_IMAGE_GEN_LIBRARY.
 */
export function libraryDir(): string {
  const override = process.env.CLAUDE_IMAGE_GEN_LIBRARY;
  if (override) return path.resolve(expandHome(override));
  const icloud = path.join(os.homedir(), "Library/Mobile Documents/com~apple~CloudDocs");
  if (process.platform === "darwin" && fs.existsSync(icloud)) return path.join(icloud, "Claude Images");
  return path.join(os.homedir(), "Pictures", "Claude Images");
}

export const imagesDir = () => path.join(libraryDir(), "images");
export const inputsDir = () => path.join(libraryDir(), "inputs");

/** Machine-local scratch space (never synced): preview renders, etc. */
export function cacheDir(): string {
  if (process.env.CLAUDE_IMAGE_GEN_CACHE) {
    fs.mkdirSync(process.env.CLAUDE_IMAGE_GEN_CACHE, { recursive: true });
    return process.env.CLAUDE_IMAGE_GEN_CACHE;
  }
  const base =
    process.platform === "darwin"
      ? path.join(os.homedir(), "Library/Caches")
      : process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  const dir = path.join(base, APP_NAME);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export interface Settings {
  /** Top-level Responses API model that orchestrates the image tool. */
  mainlineModel: string;
  /** Model used by the image_generation tool. */
  imageModel: string;
  /** null = don't send, let the API pick its default. */
  size: string | null;
  quality: string | null;
  outputFormat: "png" | "jpeg" | "webp" | null;
  background: "auto" | "transparent" | "opaque" | null;
  moderation: "auto" | "low" | null;
  /** Open the gallery in the browser when a user-visible batch starts. */
  openGallery: boolean;
  galleryPort: number;
}

export const DEFAULT_SETTINGS: Settings = {
  mainlineModel: "gpt-6-astra",
  imageModel: "gpt-image-2.5-sunburst",
  size: null,
  quality: null,
  outputFormat: null,
  background: null,
  moderation: null,
  openGallery: true,
  galleryPort: 47821,
};

/** Settings live inside the library so model choices follow you to every Mac... */
const settingsPath = () => path.join(libraryDir(), "settings.json");

/** ...except these, which are about this machine (a port taken on one Mac says nothing about the others). */
const LOCAL_KEYS = ["galleryPort", "openGallery"] as const satisfies readonly (keyof Settings)[];
type LocalKey = (typeof LOCAL_KEYS)[number];
const isLocalKey = (k: string): k is LocalKey => (LOCAL_KEYS as readonly string[]).includes(k);

export function localSettingsPath(): string {
  const base =
    process.env.CLAUDE_IMAGE_GEN_LOCAL_CONFIG ||
    (process.platform === "darwin"
      ? path.join(os.homedir(), "Library/Application Support", APP_NAME)
      : path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config"), APP_NAME));
  return path.join(base, "local.json");
}

function loadLocalSettings(): Partial<Settings> {
  const file = localSettingsPath();
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e: any) {
    if (e?.code === "ENOENT") return {};
    throw new Error(`${file} is unreadable or not valid JSON. Fix or delete it; nothing was changed.`);
  }
}

/**
 * Only a missing file means "no settings yet". Anything else (unreadable,
 * half-synced, invalid JSON) is an error: silently falling back to defaults
 * would generate with the wrong models, and the next save would overwrite the
 * user's real settings with those defaults.
 */
export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...loadSharedSettings(), ...loadLocalSettings() };
}

function loadSharedSettings(): Partial<Settings> {
  const file = settingsPath();
  let text: string;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch (e: any) {
    if (e?.code !== "ENOENT") throw explainFsError(e, file);
    // No settings.json yet is normal: changing only galleryPort/openGallery never creates it.
    const placeholder = path.join(path.dirname(file), `.${path.basename(file)}.icloud`);
    if (!fs.existsSync(placeholder)) return {};
    text = downloadFromICloudSync(file);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${file} is not valid JSON (perhaps a half-synced iCloud copy). Fix or delete it; nothing was changed.`);
  }
}

/** Older macOS versions offload files as ".name.icloud" placeholders; fetch one synchronously. */
function downloadFromICloudSync(file: string, timeoutMs = 30_000): string {
  try {
    execFileSync("brctl", ["download", file], { stdio: "ignore" });
  } catch {
    // keep polling; the download may already be in progress
  }
  const deadline = Date.now() + timeoutMs;
  while (!fs.existsSync(file)) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for iCloud to download ${file}.`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  return fs.readFileSync(file, "utf8");
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const current = loadSettings(); // throws (and writes nothing) if a current file is unreadable
  const local: Record<string, unknown> = {};
  const shared: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) (isLocalKey(k) ? local : shared)[k] = v;
  if (Object.keys(shared).length) {
    const next: Record<string, unknown> = { ...current, ...shared };
    for (const k of LOCAL_KEYS) delete next[k];
    writeFileAtomic(settingsPath(), JSON.stringify(next, null, 2) + "\n");
  }
  if (Object.keys(local).length) {
    writeFileAtomic(localSettingsPath(), JSON.stringify({ ...loadLocalSettings(), ...local }, null, 2) + "\n");
  }
  return { ...current, ...patch };
}

/**
 * macOS privacy controls (TCC) can block the app running Claude Code from iCloud Drive; the
 * raw EPERM says nothing about how to fix that.
 */
export function explainFsError(e: any, file: string): Error {
  if ((e?.code === "EPERM" || e?.code === "EACCES") && file.includes("/Library/Mobile Documents/")) {
    return new Error(
      `macOS blocked access to iCloud Drive (${file}). Allow the app that runs Claude Code (Terminal, iTerm, ` +
        "VS Code, ...) in System Settings > Privacy & Security > Files & Folders (iCloud Drive) or Full Disk Access, " +
        "then restart it. Or set CLAUDE_IMAGE_GEN_LIBRARY to a folder outside iCloud Drive.",
    );
  }
  return e instanceof Error ? e : new Error(String(e));
}

/** Write via temp file + rename so iCloud never syncs a half-written file. */
export function writeFileAtomic(file: string, data: string | Buffer): void {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, file);
  } catch (e) {
    throw explainFsError(e, file);
  }
}

let cachedKey: string | undefined;

/** Env var first, then the macOS Keychain item of the same name. */
export function getApiKey(): string {
  if (cachedKey) return cachedKey;
  const fromEnv = process.env[KEY_NAME]?.trim();
  if (fromEnv) return (cachedKey = fromEnv);
  if (process.platform === "darwin") {
    try {
      const fromKeychain = execFileSync("security", ["find-generic-password", "-s", KEY_NAME, "-w"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
      if (fromKeychain) return (cachedKey = fromKeychain);
    } catch {
      // not in keychain, fall through
    }
  }
  throw new Error(
    `No OpenAI API key found. Set the env var ${KEY_NAME}` +
      (process.platform === "darwin"
        ? ` or store it in the Keychain (copy the key first): security add-generic-password -U -a "$USER" -s ${KEY_NAME} -w "$(pbpaste)"`
        : "") +
      ".",
  );
}

export function clearCachedKey(): void {
  cachedKey = undefined;
}

/** The user's project (Claude Code's working dir). Relative paths resolve against it. */
export function projectDir(): string {
  const fromEnv = process.env.CLAUDE_PROJECT_DIR;
  // Ignore an unexpanded "${...}" placeholder in case the client didn't substitute it.
  return fromEnv && !fromEnv.includes("${") ? fromEnv : process.cwd();
}
