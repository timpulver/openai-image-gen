import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { APP_NAME, VERSION, cacheDir, inputsDir, loadSettings } from "../config.js";
import {
  ImageRecord,
  allRecords,
  childrenOf,
  ensureLocal,
  getRecord,
  imagePath,
  isImageId,
  updateRecord,
} from "../library.js";
import { MIME, extOf } from "../images.js";
import { PAGE_HTML } from "./page.js";

const run = promisify(execFile);

export type GalleryEvent =
  | {
      type: "batch";
      batch: string;
      ids: string[];
      prompt: string;
      parent?: string;
      imageModel: string;
      createdAt: string;
    }
  | { type: "image"; batch: string; id: string }
  | { type: "error"; batch: string; id: string; message: string }
  | { type: "updated"; id: string };

interface PendingBatch {
  meta: Extract<GalleryEvent, { type: "batch" }>;
  errors: Record<string, string>;
}

const AUTH_HEADER = "x-claude-image-gen";

/**
 * Every Claude session runs its own MCP server, but there is only one gallery
 * port. The first server to bind it becomes the owner; the others forward
 * their events over HTTP. If the owner exits, the next event re-elects.
 */
class Gallery {
  private server?: http.Server;
  private role?: "owner" | "remote";
  private clients = new Set<http.ServerResponse>();
  private pending = new Map<string, PendingBatch>();

  get port(): number {
    return loadSettings().galleryPort;
  }

  url(params: Record<string, string> = {}): string {
    const q = new URLSearchParams(params).toString();
    return `http://localhost:${this.port}/${q ? `?${q}` : ""}`;
  }

  private async ping(): Promise<boolean> {
    try {
      const res = await fetch(`http://127.0.0.1:${this.port}/api/ping`, { signal: AbortSignal.timeout(1500) });
      return (await res.json()).app === APP_NAME;
    } catch {
      return false;
    }
  }

  async ensure(): Promise<"owner" | "remote"> {
    if (this.role === "owner") return "owner";
    if (this.role === "remote" || (await this.ping())) return (this.role = "remote");
    try {
      await this.listen();
      return (this.role = "owner");
    } catch (e: any) {
      if (e?.code === "EADDRINUSE" && (await this.ping())) return (this.role = "remote");
      throw new Error(
        e?.code === "EADDRINUSE"
          ? `Port ${this.port} is used by another program. Change galleryPort with the image_settings tool.`
          : String(e),
      );
    }
  }

  /** Record an event and return the gallery URL for its batch. Never throws: the gallery is optional. */
  async notify(ev: GalleryEvent): Promise<string> {
    const url = "batch" in ev ? this.url({ batch: ev.batch }) : this.url();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if ((await this.ensure()) === "owner") {
          this.apply(ev);
        } else {
          const res = await fetch(`http://127.0.0.1:${this.port}/api/event`, {
            method: "POST",
            headers: { "Content-Type": "application/json", [AUTH_HEADER]: "1" },
            body: JSON.stringify(ev),
            signal: AbortSignal.timeout(3000),
          });
          if (!res.ok) throw new Error(`gallery responded ${res.status}`);
        }
        break;
      } catch (e) {
        this.role = undefined; // owner may have exited; re-elect on retry
        if (attempt === 1) console.error(`[gallery] could not deliver event: ${e}`);
      }
    }
    return url;
  }

  open(url: string): void {
    const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
    spawn(cmd, [url], { detached: true, stdio: "ignore" }).on("error", () => {}).unref();
  }

  private apply(ev: GalleryEvent): void {
    if (ev.type === "batch") {
      this.pending.set(ev.batch, { meta: ev, errors: {} });
      // Keep a bounded window; finished images are on disk anyway.
      while (this.pending.size > 100) this.pending.delete(this.pending.keys().next().value!);
    } else if (ev.type === "error") {
      const p = this.pending.get(ev.batch);
      if (p) p.errors[ev.id] = ev.message;
    }
    const data = `data: ${JSON.stringify(ev)}\n\n`;
    for (const c of this.clients) c.write(data);
  }

  private listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        this.handle(req, res).catch((e) => {
          if (!res.headersSent) res.writeHead(e?.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain" });
          res.end(String(e?.message ?? e));
        });
      });
      server.once("error", reject);
      server.listen(this.port, "127.0.0.1", () => {
        server.off("error", reject);
        // Don't keep the MCP process alive just for the gallery.
        server.unref();
        this.server = server;
        resolve();
      });
    });
  }

  private feed(params: URLSearchParams) {
    const limit = Math.min(Number(params.get("limit")) || 30, 200);
    const before = params.get("before");
    const q = params.get("q")?.toLowerCase().trim();
    const starred = params.get("starred") === "1";

    const groups = new Map<string, { batch: string; createdAt: string; prompt: string; parent?: string; imageModel: string; items: any[] }>();
    for (const r of allRecords()) {
      if (starred && !r.starred) continue;
      if (q && !`${r.id} ${r.prompt} ${r.revisedPrompt ?? ""}`.toLowerCase().includes(q)) continue;
      let g = groups.get(r.batch);
      if (!g) {
        g = { batch: r.batch, createdAt: r.createdAt, prompt: r.prompt, parent: r.parent, imageModel: r.imageModel, items: [] };
        groups.set(r.batch, g);
      }
      if (r.createdAt < g.createdAt) g.createdAt = r.createdAt;
      g.items.push({ id: r.id, status: "done", index: r.batchIndex, record: summary(r) });
    }
    if (!starred && !q) {
      for (const { meta, errors } of this.pending.values()) {
        let g = groups.get(meta.batch);
        if (!g) {
          g = { batch: meta.batch, createdAt: meta.createdAt, prompt: meta.prompt, parent: meta.parent, imageModel: meta.imageModel, items: [] };
          groups.set(meta.batch, g);
        }
        g.createdAt = meta.createdAt;
        meta.ids.forEach((id, index) => {
          if (g!.items.some((i) => i.id === id)) return;
          g!.items.push(errors[id] ? { id, index, status: "error", message: errors[id] } : { id, index, status: "pending" });
        });
      }
    }
    let list = [...groups.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    if (before) list = list.filter((g) => g.createdAt < before);
    for (const g of list) g.items.sort((a, b) => a.index - b.index);
    return { batches: list.slice(0, limit), more: list.length > limit };
  }

  private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Only answer to localhost names (blocks DNS-rebinding tricks from websites).
    const host = (req.headers.host ?? "").replace(/:\d+$/, "");
    if (host !== "localhost" && host !== "127.0.0.1") return void res.writeHead(403).end();

    const url = new URL(req.url ?? "/", "http://localhost");
    const p = url.pathname;
    const json = (body: unknown, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify(body));
    };

    if (req.method === "POST") {
      // A custom header forces a CORS preflight we never approve, so other websites can't post here.
      if (req.headers[AUTH_HEADER] !== "1") return void res.writeHead(403).end();
      let body: any;
      try {
        body = JSON.parse((await readBody(req)) || "{}");
      } catch (e: any) {
        return json({ error: e?.message ?? "invalid body" }, 400);
      }
      if (p === "/api/event") {
        // Other sessions may run a different plugin version: drop anything we don't understand
        // rather than storing it, where it would break every later /api/feed.
        if (!isGalleryEvent(body)) return json({ error: "invalid event" }, 400);
        this.apply(body);
        return json({ ok: true });
      }
      if (p === "/api/star" && isImageId(body.id)) {
        const r = await updateRecord(body.id, (r) => void (r.starred = !!body.starred));
        this.apply({ type: "updated", id: r.id });
        return json({ ok: true, starred: !!r.starred });
      }
      return json({ error: "not found" }, 404);
    }

    if (p === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return void res.end(PAGE_HTML);
    }
    if (p === "/api/ping") return json({ app: APP_NAME, version: VERSION, pid: process.pid });
    if (p === "/api/feed") return json(this.feed(url.searchParams));
    if (p.startsWith("/api/image/")) {
      const r = await getRecord(p.slice("/api/image/".length));
      if (!r) return json({ error: "not found" }, 404);
      return json({ record: r, path: imagePath(r), children: childrenOf(r.id).map((c) => c.id) });
    }
    if (p === "/events") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
      res.write(`data: ${JSON.stringify({ type: "hello", loadedAt: Number(url.searchParams.get("loadedAt")) || 0 })}\n\n`);
      // Tell older tabs a newer one exists; tabs we opened with `open` can close themselves.
      const announce = `data: ${JSON.stringify({ type: "newer-tab", loadedAt: Number(url.searchParams.get("loadedAt")) || 0 })}\n\n`;
      for (const c of this.clients) c.write(announce);
      this.clients.add(res);
      const keepAlive = setInterval(() => res.write(": ping\n\n"), 25_000);
      keepAlive.unref();
      req.on("close", () => {
        clearInterval(keepAlive);
        this.clients.delete(res);
      });
      return;
    }

    const fileMatch = /^\/(file|thumb)\/([a-z2-9]{4})$/.exec(p);
    if (fileMatch) {
      const r = await getRecord(fileMatch[2]);
      if (!r) return void res.writeHead(404).end();
      const file = imagePath(r);
      await ensureLocal(file);
      const served = fileMatch[1] === "thumb" ? await thumbnail(r, file) : file;
      return sendFile(res, served, {
        "Content-Type": MIME[extOf(served)] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      });
    }
    const inputMatch = /^\/input\/([a-f0-9]{16}\.[a-z]+)$/.exec(p);
    if (inputMatch) {
      const file = path.join(inputsDir(), inputMatch[1]);
      await ensureLocal(file);
      return sendFile(res, file, { "Content-Type": MIME[extOf(file)] ?? "application/octet-stream", "Cache-Control": "max-age=31536000" });
    }
    res.writeHead(404).end();
  }
}

/**
 * Stream a file without risking the process: the file is opened before headers
 * are sent (so a missing file becomes a 404 via the handler's catch), and
 * pipeline() handles read errors mid-stream instead of throwing an uncaught
 * 'error' event that would kill this MCP server.
 */
async function sendFile(res: http.ServerResponse, file: string, headers: http.OutgoingHttpHeaders): Promise<void> {
  const stream = fs.createReadStream(file);
  await new Promise<void>((resolve, reject) => {
    stream.once("open", () => resolve());
    stream.once("error", reject);
  });
  res.writeHead(200, headers);
  pipeline(stream, res, (err) => {
    if (err) res.destroy();
  });
}

function summary(r: ImageRecord) {
  return {
    id: r.id,
    width: r.width,
    height: r.height,
    starred: !!r.starred,
    parent: r.parent,
    prompt: r.prompt,
    params: r.params,
  };
}

/** Machine-local thumbnail cache, so the feed doesn't ship multi-MB PNGs. Falls back to the original. */
async function thumbnail(r: ImageRecord, file: string): Promise<string> {
  if (process.platform !== "darwin") return file;
  const keepAlpha = r.params.background === "transparent" && extOf(file) !== "jpeg";
  const dir = path.join(cacheDir(), "thumbs");
  // Keyed by the full file name (date + id + slug), so ids reused across libraries never collide.
  const out = path.join(dir, `${path.parse(r.file).name}-640.${keepAlpha ? "png" : "jpeg"}`);
  if (fs.existsSync(out)) return out;
  fs.mkdirSync(dir, { recursive: true });
  try {
    await run("sips", ["-Z", "640", "-s", "format", keepAlpha ? "png" : "jpeg", file, "--out", out]);
    return out;
  } catch {
    return file;
  }
}

function isGalleryEvent(v: any): v is GalleryEvent {
  const str = (x: unknown) => typeof x === "string";
  if (!v || typeof v !== "object") return false;
  switch (v.type) {
    case "batch":
      return (
        str(v.batch) && Array.isArray(v.ids) && v.ids.every(str) && str(v.prompt) && str(v.imageModel) &&
        str(v.createdAt) && (v.parent === undefined || str(v.parent))
      );
    case "image":
      return str(v.batch) && str(v.id);
    case "error":
      return str(v.batch) && str(v.id) && str(v.message);
    case "updated":
      return str(v.id);
    default:
      return false;
  }
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1 << 20) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export const gallery = new Gallery();

/** Standalone mode: `node dist/server.js --gallery` keeps the gallery up without a Claude session. */
export async function runStandaloneGallery(): Promise<void> {
  const role = await gallery.ensure();
  const url = gallery.url();
  if (role === "remote") {
    console.log(`Gallery already running at ${url}`);
    gallery.open(url);
    return;
  }
  setInterval(() => {}, 1 << 30); // keep the process alive (the server itself is unref'd)
  console.log(`Gallery running at ${url} (Ctrl+C to stop)`);
  gallery.open(url);
}
