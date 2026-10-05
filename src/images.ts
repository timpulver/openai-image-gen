import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { cacheDir } from "./config.js";
import { randomToken } from "./library.js";

const run = promisify(execFile);
const isMac = process.platform === "darwin";

export const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/** Formats OpenAI doesn't take directly but sips can convert. */
const CONVERTIBLE = new Set(["heic", "heif", "tif", "tiff", "bmp", "avif"]);

export function extOf(file: string): string {
  return path.extname(file).slice(1).toLowerCase();
}

export function isSupportedInput(file: string): boolean {
  const ext = extOf(file);
  return ext in MIME || (isMac && CONVERTIBLE.has(ext));
}

function tmpFile(ext: string): string {
  return path.join(cacheDir(), `tmp-${process.pid}-${randomToken(8)}.${ext}`);
}

async function withTmp<T>(ext: string, fn: (tmp: string) => Promise<T>): Promise<T> {
  const tmp = tmpFile(ext);
  try {
    return await fn(tmp);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

/** Returns bytes + ext usable as an OpenAI input image (converting HEIC etc. to PNG). */
export async function toUploadable(file: string): Promise<{ data: Buffer; ext: string }> {
  const ext = extOf(file);
  if (ext in MIME) return { data: fs.readFileSync(file), ext };
  if (isMac && CONVERTIBLE.has(ext)) {
    return withTmp("png", async (tmp) => {
      await run("sips", ["-s", "format", "png", file, "--out", tmp]);
      return { data: fs.readFileSync(tmp), ext: "png" };
    });
  }
  throw new Error(`Unsupported image format ".${ext}" (${file}). Use png, jpeg, webp or gif.`);
}

export async function dimensions(file: string): Promise<{ width: number; height: number } | undefined> {
  if (isMac) {
    try {
      const { stdout } = await run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]);
      const w = /pixelWidth: (\d+)/.exec(stdout)?.[1];
      const h = /pixelHeight: (\d+)/.exec(stdout)?.[1];
      if (w && h) return { width: +w, height: +h };
    } catch {
      // fall through to header parsing
    }
  }
  const buf = fs.readFileSync(file);
  if (buf.subarray(1, 4).toString() === "PNG") return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  return undefined;
}

export interface Rendered {
  data: string; // base64
  mimeType: string;
  width?: number;
  height?: number;
}

/**
 * A downscaled render for Claude to look at. JPEG keeps it small; PNG is used
 * when the image may have transparency, so a transparent logo doesn't turn
 * into a black square.
 */
export async function preview(file: string, maxEdge: number, keepAlpha: boolean): Promise<Rendered> {
  if (!isMac) {
    return { data: fs.readFileSync(file).toString("base64"), mimeType: MIME[extOf(file)] ?? "image/png" };
  }
  const fmt = keepAlpha ? "png" : "jpeg";
  return withTmp(fmt, async (tmp) => {
    const src = await dimensions(file);
    const shrink = !src || Math.max(src.width, src.height) > maxEdge;
    const args = [...(shrink ? ["-Z", String(maxEdge)] : []), "-s", "format", fmt];
    if (fmt === "jpeg") args.push("-s", "formatOptions", "85");
    await run("sips", [...args, file, "--out", tmp]);
    const dims = await dimensions(tmp);
    return { data: fs.readFileSync(tmp).toString("base64"), mimeType: MIME[fmt], ...dims };
  });
}

export type Region =
  | "full"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "center";

/** [x, y, w, h] as fractions of the image. */
const REGIONS: Record<Region, [number, number, number, number]> = {
  full: [0, 0, 1, 1],
  "top-left": [0, 0, 0.5, 0.5],
  "top-right": [0.5, 0, 0.5, 0.5],
  "bottom-left": [0, 0.5, 0.5, 0.5],
  "bottom-right": [0.5, 0.5, 0.5, 0.5],
  top: [0, 0, 1, 0.5],
  bottom: [0, 0.5, 1, 0.5],
  left: [0, 0, 0.5, 1],
  right: [0.5, 0, 0.5, 1],
  center: [0.25, 0.25, 0.5, 0.5],
};

/**
 * Crop a region at native resolution, then cap the long edge. Claude's vision
 * input is downscaled to roughly 1.15 MP anyway, so zooming via crops is how
 * fine detail (text, hands, edges) actually becomes visible.
 */
export async function crop(
  file: string,
  region: Region | [number, number, number, number],
  maxEdge: number,
  keepAlpha: boolean,
): Promise<Rendered & { box: { x: number; y: number; w: number; h: number } }> {
  const dims = await dimensions(file);
  if (!dims) throw new Error("Could not read image dimensions.");
  const [fx, fy, fw, fh] = Array.isArray(region) ? region : REGIONS[region];
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const x = Math.round(clamp(fx) * dims.width);
  const y = Math.round(clamp(fy) * dims.height);
  const w = Math.max(1, Math.min(dims.width - x, Math.round(clamp(fw) * dims.width)));
  const h = Math.max(1, Math.min(dims.height - y, Math.round(clamp(fh) * dims.height)));
  const box = { x, y, w, h };
  if (!isMac) return { ...(await preview(file, maxEdge, keepAlpha)), box: { x: 0, y: 0, w: dims.width, h: dims.height } };
  return withTmp("png", async (cropped) => {
    // sips takes height/width and offsetY/offsetX, in that order.
    await run("sips", ["-c", String(h), String(w), "--cropOffset", String(y), String(x), file, "--out", cropped]);
    return { ...(await preview(cropped, Math.min(maxEdge, Math.max(w, h)), keepAlpha)), box };
  });
}
