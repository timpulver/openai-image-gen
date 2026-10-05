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

/** Settings live inside the library so model choices follow you to every Mac. */
const settingsPath = () => path.join(libraryDir(), "settings.json");

export function loadSettings(): Settings {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    return { ...DEFAULT_SETTINGS, ...raw };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch };
  writeFileAtomic(settingsPath(), JSON.stringify(next, null, 2) + "\n");
  return next;
}

/** Write via temp file + rename so iCloud never syncs a half-written file. */
export function writeFileAtomic(file: string, data: string | Buffer): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
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
