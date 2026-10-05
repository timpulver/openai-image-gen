import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { promisify } from "node:util";
import { type EventStream, H3, HTTPError, bodyLimit, createEventStream, getRouterParam, readValidatedBody, toNodeHandler } from "h3";
import { z } from "zod";
import { APP_NAME, VERSION, cacheDir, inputsDir, loadSettings } from "../config.js";
import { type ImageRecord, allRecords, childrenOf, ensureLocal, getRecord, imagePath, isImageId, updateRecord } from "../library.js";
import { MIME, extOf } from "../images.js";
import { PAGE_HTML } from "./page.js";

const run = promisify(execFile);

/**
 * Events from this or other sessions. Other sessions may run a different plugin version, so
 * forwarded events are validated against this schema (which also defines the type).
 */
const GalleryEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("batch"),
    batch: z.string(),
    ids: z.array(z.string()),
    prompt: z.string(),
    parent: z.string().optional(),
    imageModel: z.string(),
    createdAt: z.string(),
  }),
  z.object({ type: z.literal("image"), batch: z.string(), id: z.string() }),
  z.object({ type: z.literal("error"), batch: z.string(), id: z.string(), message: z.string() }),
  z.object({ type: z.literal("updated"), id: z.string() }),
]);
export type GalleryEvent = z.infer<typeof GalleryEventSchema>;

const StarSchema = z.object({ id: z.string().refine(isImageId), starred: z.boolean() });

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
  /** Port the current role applies to; a galleryPort change triggers a new election. */
  private rolePort?: number;
  private electing?: Promise<"owner" | "remote">;
  private clients = new Set<EventStream>();
  private pending = new Map<string, PendingBatch>();

  get port(): number {
    return loadSettings().galleryPort;
  }

  url(params: Record<string, string> = {}): string {
    const q = new URLSearchParams(params).toString();
    return `http://localhost:${this.port}/${q ? `?${q}` : ""}`;
  }

  private async ping(port = this.port): Promise<boolean> {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/ping`, { signal: AbortSignal.timeout(1500) });
      return (await res.json()).app === APP_NAME;
    } catch {
      return false;
    }
  }

  async ensure(): Promise<"owner" | "remote"> {
    const port = this.port;
    if (this.role && this.rolePort !== port) this.resign();
    if (this.role) return this.role;
    // Concurrent callers share one election; otherwise the second one hits EADDRINUSE on our own
    // server and wrongly concludes it is "remote".
    this.electing ??= this.elect(port).finally(() => (this.electing = undefined));
    return this.electing;
  }

  private async elect(port: number): Promise<"owner" | "remote"> {
    this.rolePort = port;
    if (await this.ping(port)) return (this.role = "remote");
    try {
      await this.listen(port);
      return (this.role = "owner");
    } catch (e: any) {
      if (e?.code === "EADDRINUSE" && (await this.ping(port))) return (this.role = "remote");
      throw new Error(
        e?.code === "EADDRINUSE"
          ? `Port ${this.port} is used by another program. Change galleryPort with the image_settings tool.`
          : String(e),
      );
    }
  }

  /** Give up the current role (port changed): stop serving on the old port and disconnect its tabs. */
  private resign(): void {
    if (this.server) {
      for (const c of this.clients) void c.close();
      this.clients.clear();
      this.server.close();
      this.server = undefined;
    }
    this.role = undefined;
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

  /** Open a gallery tab. auto=1 marks it as ours, so the page may close it when a newer one replaces it. */
  open(url: string): void {
    const u = new URL(url);
    u.searchParams.set("auto", "1");
    url = u.toString();
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
    const data = JSON.stringify(ev);
    for (const c of this.clients) void c.push(data);
  }

  private listen(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      // h3 handles the requests; a plain node:http server owns the port so the election can
      // see EADDRINUSE, bind to 127.0.0.1 only, and unref() the socket.
      const server = http.createServer(toNodeHandler(this.routes()));
      server.once("error", reject);
      server.listen(port, "127.0.0.1", () => {
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

  private routes(): H3 {
    const app = new H3();

    app.use((event) => {
      // Only answer to localhost names (blocks DNS-rebinding tricks from websites).
      const host = (event.req.headers.get("host") ?? "").replace(/:\d+$/, "");
      if (host !== "localhost" && host !== "127.0.0.1") throw HTTPError.status(403);
      // A custom header forces a CORS preflight we never approve, so other websites can't post here.
      if (event.req.method === "POST" && event.req.headers.get(AUTH_HEADER) !== "1") throw HTTPError.status(403);
      event.res.headers.set("cache-control", "no-store");
    });

    // Not html(): in h3 v2 it escapes plain strings (it's meant for templates with dynamic values).
    app.get("/", () => new Response(PAGE_HTML, { headers: { "content-type": "text/html; charset=utf-8" } }));
    app.get("/api/ping", () => ({ app: APP_NAME, version: VERSION, pid: process.pid }));
    app.get("/api/feed", (event) => this.feed(event.url.searchParams));
    app.get("/api/image/:id", async (event) => {
      const r = await getRecord(getRouterParam(event, "id") ?? "");
      if (!r) throw HTTPError.status(404);
      return { record: r, path: imagePath(r), children: childrenOf(r.id).map((c) => c.id) };
    });

    app.get("/events", (event) => {
      const stream = createEventStream(event);
      const loadedAt = Number(event.url.searchParams.get("loadedAt")) || 0;
      void stream.push(JSON.stringify({ type: "hello", loadedAt }));
      // Tell older tabs a newer one exists; tabs the plugin opened can close themselves.
      for (const c of this.clients) void c.push(JSON.stringify({ type: "newer-tab", loadedAt }));
      this.clients.add(stream);
      const keepAlive = setInterval(() => void stream.pushComment("ping"), 25_000);
      keepAlive.unref();
      stream.onClosed(() => {
        clearInterval(keepAlive);
        this.clients.delete(stream);
      });
      return stream.send();
    });

    const imageRoute = (kind: "file" | "thumb") => async (event: Parameters<typeof getRouterParam>[0]) => {
      const id = getRouterParam(event, "id") ?? "";
      const r = isImageId(id) ? await getRecord(id) : undefined;
      if (!r) throw HTTPError.status(404);
      const file = imagePath(r);
      await ensureLocal(file).catch(() => {
        throw HTTPError.status(404);
      });
      const served = kind === "thumb" ? await thumbnail(r, file) : file;
      return fileResponse(served, "public, max-age=31536000, immutable");
    };
    app.get("/file/:id", imageRoute("file"));
    app.get("/thumb/:id", imageRoute("thumb"));
    app.get("/input/:name", async (event) => {
      const name = getRouterParam(event, "name") ?? "";
      if (!/^[a-f0-9]{16}\.[a-z]+$/.test(name)) throw HTTPError.status(404);
      const file = path.join(inputsDir(), name);
      await ensureLocal(file).catch(() => {
        throw HTTPError.status(404);
      });
      return fileResponse(file, "max-age=31536000");
    });

    const small = { middleware: [bodyLimit(1 << 20)] };
    app.post(
      "/api/event",
      async (event) => {
        this.apply(await readValidatedBody(event, GalleryEventSchema));
        return { ok: true };
      },
      small,
    );
    app.post(
      "/api/star",
      async (event) => {
        const { id, starred } = await readValidatedBody(event, StarSchema);
        const r = await updateRecord(id, (r) => void (r.starred = starred));
        this.apply({ type: "updated", id: r.id });
        return { ok: true, starred: !!r.starred };
      },
      small,
    );
    return app;
  }
}

/**
 * Gallery files are local and at most a few MB (a 4K PNG is ~20 MB), so they're read whole:
 * a missing or vanished file becomes a clean 404 instead of an error halfway through a stream.
 */
async function fileResponse(file: string, cacheControl: string): Promise<Response> {
  let data: Buffer;
  try {
    data = await fs.promises.readFile(file);
  } catch (e: any) {
    throw e?.code === "ENOENT" ? HTTPError.status(404) : e;
  }
  return new Response(new Uint8Array(data), {
    headers: { "content-type": MIME[extOf(file)] ?? "application/octet-stream", "cache-control": cacheControl },
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
