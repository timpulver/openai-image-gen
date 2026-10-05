// End-to-end smoke test: runs the built MCP server against a mock OpenAI API
// with a throwaway library. Run with `npm test` (after `npm run build`).
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
// v2 client: speaks the 2026-07-28 (stateless) protocol. The v1 SDK below plays an older,
// handshake-based client, which must keep working too.
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { Client as LegacyClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport as LegacyStdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { gradientPng, startMock } from "./mock-openai.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "image-gen-test-"));
const lib = path.join(root, "library");
const proj = path.join(root, "project");
const claudeDir = path.join(root, "claude");
fs.mkdirSync(proj, { recursive: true });
const refFile = path.join(proj, "ref.png");
fs.writeFileSync(refFile, gradientPng(64, 64));

// A fake Claude Code transcript whose last user message carries two pasted images.
const transcriptDir = path.join(claudeDir, "projects", proj.replace(/[^a-zA-Z0-9]/g, "-"));
fs.mkdirSync(transcriptDir, { recursive: true });
const img = (w) => ({ type: "image", source: { type: "base64", media_type: "image/png", data: gradientPng(w, w).toString("base64") } });
const now = new Date().toISOString();
const jsonl = (entries) => entries.map((l) => JSON.stringify({ timestamp: now, ...l })).join("\n") + "\n";
fs.writeFileSync(
  path.join(transcriptDir, "session.jsonl"),
  jsonl([
    { type: "user", message: { role: "user", content: [img(10)] } },
    { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "ok" }] } },
    { type: "user", message: { role: "user", content: [{ type: "text", text: "like these [Image #1] [Image #2]" }, img(32), img(48)] } },
    // Tool output with an image (e.g. a screenshot Claude read) is not a paste and must be skipped.
    { type: "user", message: { role: "user", content: [{ type: "tool_result", content: [img(16)] }] } },
    // Padding so the backwards scan has to cross chunk boundaries.
    { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "x".repeat(6 << 20) }] } },
  ]),
);
// Another session in the same project that pasted more recently: must not be used when the session id is known.
fs.writeFileSync(
  path.join(transcriptDir, "other.jsonl"),
  jsonl([{ type: "user", message: { role: "user", content: [img(20), img(24)] } }]),
);

const mock = await startMock();
const port = 47000 + Math.floor(Math.random() * 800); // stays below the real default, 47821
const client = new Client({ name: "smoke", version: "1" });
await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: [path.resolve("dist/server.js")],
    cwd: proj,
    env: {
      ...process.env,
      CLAUDE_IMAGE_GEN_LIBRARY: lib,
      CLAUDE_IMAGE_GEN_CACHE: path.join(root, "cache"),
      CLAUDE_IMAGE_GEN_LOCAL_CONFIG: path.join(root, "local"),
      CLAUDE_IMAGE_GEN_API_BASE: mock.url,
      OPENAI_API_KEY_FOR_CLAUDE_IMAGE_GEN: "test-key",
      CLAUDE_PROJECT_DIR: proj,
      CLAUDE_CONFIG_DIR: claudeDir,
      CLAUDE_CODE_SESSION_ID: "session",
    },
    stderr: "inherit",
  }),
);

const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
  return { ...res, text, images: res.content.filter((c) => c.type === "image") };
};
const ids = (text) => [...text.matchAll(/^• ([a-z2-9]{4}):/gm)].map((m) => m[1]);
const sidecar = (id) => {
  const f = fs.readdirSync(path.join(lib, "images")).find((n) => n.includes(`-${id}-`) && n.endsWith(".json"));
  return { file: path.join(lib, "images", f), json: JSON.parse(fs.readFileSync(path.join(lib, "images", f), "utf8")) };
};
let step = 0;
const ok = (msg) => console.log(`  ✓ ${++step}. ${msg}`);

try {
  // Protocol: tools are listed, instructions are delivered, and a 2025-era client still works.
  const tools = (await client.listTools()).tools.map((t) => t.name);
  assert.deepEqual(tools.sort(), ["export_image", "generate_images", "image_settings", "inspect_image", "list_image_models", "list_images", "open_gallery"]);
  const legacy = new LegacyClient({ name: "legacy", version: "1" });
  await legacy.connect(new LegacyStdioClientTransport({ command: process.execPath, args: [path.resolve("dist/server.js")], cwd: proj,
    env: { ...process.env, CLAUDE_IMAGE_GEN_LIBRARY: lib, CLAUDE_IMAGE_GEN_LOCAL_CONFIG: path.join(root, "local"),
      CLAUDE_IMAGE_GEN_CACHE: path.join(root, "cache-legacy") }, stderr: "inherit" }));
  try {
    assert.match(legacy.getInstructions() ?? "", /img:<id>/, "server instructions reach handshake-based clients");
    assert.equal((await legacy.listTools()).tools.length, 7);
    const res = await legacy.callTool({ name: "list_images", arguments: {} });
    assert.ok(!res.isError, "list_images works over the legacy protocol");
  } finally {
    await legacy.close();
  }
  ok("protocol: 7 tools via the 2026-07-28 client; a 2025-era client (initialize handshake) also works");

  let r = await call("image_settings", { galleryPort: port, openGallery: false, quality: "low" });
  assert.match(r.text, new RegExp(`"galleryPort": ${port}`));
  const shared = JSON.parse(fs.readFileSync(path.join(lib, "settings.json"), "utf8"));
  assert.equal(shared.quality, "low");
  assert.ok(!("galleryPort" in shared), "machine-local settings must not go into the synced library");
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "local", "local.json"), "utf8")).galleryPort, port);
  ok("settings persist: models etc. in the library, galleryPort/openGallery on this machine");

  // A corrupt settings file must be reported, never silently replaced by defaults.
  const settingsFile = path.join(lib, "settings.json");
  const good = fs.readFileSync(settingsFile, "utf8");
  fs.writeFileSync(settingsFile, '{"imageModel": "half-synced');
  r = await call("image_settings", { quality: "high" });
  assert.equal(r.isError, true);
  assert.match(r.text, /not valid JSON/);
  assert.equal(fs.readFileSync(settingsFile, "utf8"), '{"imageModel": "half-synced', "must not overwrite");
  r = await call("generate_images", { prompt: "x", show: false });
  assert.equal(r.isError, true, "must not generate with default models");
  fs.writeFileSync(settingsFile, good);
  ok("corrupt settings.json is reported and left untouched");

  r = await call("generate_images", { prompt: "minimalist otter logo", count: 2, show: false });
  assert.equal(r.isError, false, r.text);
  const [a, b] = ids(r.text);
  assert.ok(a && b, r.text);
  assert.equal(r.images.length, 2);
  assert.equal(mock.requests.at(-1).tools[0].quality, "low");
  assert.equal(mock.requests.at(-1).tools[0].model, "gpt-image-2.5-sunburst");
  assert.ok(!("size" in mock.requests.at(-1).tools[0]), "unset params must not be sent");
  assert.equal(sidecar(a).json.revisedPrompt, "revised: minimalist otter logo");
  ok("2 variations generated, previews returned, sidecars written");

  r = await call("generate_images", { prompt: "now blue", from: "last", show: false });
  assert.equal(r.isError, true);
  assert.match(r.text, /ambiguous/);
  ok('"last" refuses to guess after a multi-image batch');

  r = await call("generate_images", { prompt: "now blue", from: a, refs: ["paste:2", refFile], show: false });
  assert.equal(r.isError, false, r.text);
  let req = mock.requests.at(-1);
  assert.equal(req.previous_response_id, sidecar(a).json.openai.responseId);
  assert.equal(req.input[0].content.filter((c) => c.type === "input_image").length, 2);
  assert.match(req.input[0].content[0].text, /^Modify the previously generated image\. The attached images are references only\./);
  const [c] = ids(r.text);
  const cj = sidecar(c).json;
  assert.equal(cj.parent, a);
  assert.equal(cj.context, "previous_response");
  assert.deepEqual(cj.refs.map((x) => x.kind), ["paste", "file"]);
  // paste:2 must be the 48px image from the LAST message with images
  const pasted = fs.readFileSync(path.join(lib, "inputs", cj.refs[0].stored));
  assert.equal(pasted.readUInt32BE(16), 48, "paste:2 must come from this session, not the newer other.jsonl");
  assert.match(r.text, /paste:2 \(pasted .* in session session\)/);
  ok("refine via previous_response_id + pasted image (from this session) + file reference");

  const s = sidecar(b);
  s.json.openai.responseId = "resp_expired";
  fs.writeFileSync(s.file, JSON.stringify(s.json));
  r = await call("generate_images", { prompt: "warmer", from: b, show: false });
  assert.equal(r.isError, false, r.text);
  req = mock.requests.at(-1);
  assert.equal(req.previous_response_id, undefined);
  assert.equal(req.input[0].content.filter((c) => c.type === "input_image").length, 1);
  assert.equal(sidecar(ids(r.text)[0]).json.context, "parent_image");
  ok("expired stored context falls back to re-uploading the parent image");

  r = await call("generate_images", { prompt: "x", refs: [mock.url.replace("/v1", "/big.png")], show: false });
  assert.equal(r.isError, true);
  assert.match(r.text, /larger than 50 MB/);
  ok("URL references are capped at 50 MB");

  r = await call("generate_images", { prompt: "BLOCK me", show: false });
  assert.equal(r.isError, true);
  assert.match(r.text, /moderation \(input stage\): violence/);
  ok("moderation errors are reported clearly");

  r = await call("generate_images", { prompt: "x", from: "last", show: false });
  assert.equal(r.isError, false, "failed batches must not become 'last'");
  ok('"last" skips failed batches');

  r = await call("inspect_image", { id: a, region: "bottom-right" });
  assert.match(r.text, /x=200 y=100 w=200 h=100 of 400×200/);
  assert.equal(r.images.length, 1);
  ok("inspect_image crops regions at native resolution");

  r = await call("list_images", { parent: a });
  assert.match(r.text, new RegExp(`^${c} `, "m"));
  ok("list_images filters by parent");

  r = await call("export_image", { id: a, dest: "assets/" });
  const exported = path.join(proj, "assets", "minimalist-otter-logo.png");
  assert.ok(fs.existsSync(exported), r.text);
  assert.ok(fs.existsSync(sidecar(a).file.replace(".json", ".png")), "export must copy, not move");
  assert.equal(sidecar(a).json.starred, true);
  r = await call("export_image", { id: a, dest: "assets/" });
  assert.equal(r.isError, true, "no silent overwrite");
  if (process.platform === "darwin") {
    await call("export_image", { id: a, dest: "assets/logo.jpg" });
    assert.equal(fs.readFileSync(path.join(proj, "assets/logo.jpg")).subarray(0, 2).toString("hex"), "ffd8");
  }
  await call("export_image", { id: a, dest: "assets/noext" });
  assert.ok(fs.existsSync(path.join(proj, "assets/noext.png")), "extensionless destination gets the source extension");
  if (process.platform === "darwin") {
    // A JPEG exported as .jpg must be a byte-identical copy, not a lossy re-encode.
    const jpegId = ids((await call("generate_images", { prompt: "jpeg source", format: "jpeg", show: false })).text)[0];
    await call("export_image", { id: jpegId, dest: "assets/photo.jpg" });
    const src = fs.readdirSync(path.join(lib, "images")).find((n) => n.includes(`-${jpegId}-`) && !n.endsWith(".json"));
    assert.ok(fs.readFileSync(path.join(proj, "assets/photo.jpg")).equals(fs.readFileSync(path.join(lib, "images", src))));
  }
  ok("export copies into the project, stars, refuses overwrite, converts format, keeps .jpg copies lossless");

  r = await call("list_image_models");
  assert.match(r.text, /gpt-image-2\.5-flare/);
  assert.doesNotMatch(r.text, /tts-1/);
  ok("list_image_models");

  const base = `http://127.0.0.1:${port}`;
  assert.equal((await (await fetch(`${base}/api/ping`)).json()).app, "claude-image-gen");
  const page = await fetch(`${base}/`);
  assert.match(page.headers.get("content-type"), /^text\/html/);
  assert.match(await page.text(), /^<!doctype html>[\s\S]*<script>/, "page must be served as markup, not escaped text");
  const feed = await (await fetch(`${base}/api/feed`)).json();
  assert.ok(feed.batches.length >= 4);
  assert.ok(feed.batches.some((g) => g.items.some((i) => i.status === "error")), "failed slot visible in gallery");
  const thumb = await fetch(`${base}/thumb/${a}`);
  assert.equal(thumb.status, 200);
  assert.match(thumb.headers.get("content-type"), /^image\//);
  assert.equal((await fetch(`${base}/api/star`, { method: "POST", body: JSON.stringify({ id: a, starred: false }) })).status, 403);
  // fetch() ignores custom Host headers, so use http.request to simulate DNS rebinding.
  const rebound = await new Promise((resolve) =>
    http.get({ host: "127.0.0.1", port, path: "/api/ping", headers: { Host: "evil.example" } }, (res) => resolve(res.statusCode)),
  );
  assert.equal(rebound, 403);
  const star = await fetch(`${base}/api/star`, {
    method: "POST",
    headers: { "x-claude-image-gen": "1", "Content-Type": "application/json" },
    body: JSON.stringify({ id: a, starred: false }),
  });
  assert.equal((await star.json()).starred, false);
  const bad = await fetch(`${base}/api/event`, {
    method: "POST",
    headers: { "x-claude-image-gen": "1", "Content-Type": "application/json" },
    body: JSON.stringify({ type: "batch", batch: "broken" }),
  });
  assert.equal(bad.status, 400);
  assert.equal((await fetch(`${base}/api/feed`)).status, 200, "a malformed event must not break the feed");
  ok("gallery: feed, thumbnails, starring, request guards, malformed events rejected");

  // A second session (another MCP process): forwards its events to the gallery owner, and without a
  // session id it must refuse to guess which of two recent pastes is meant.
  const client2 = new Client({ name: "smoke2", version: "1" });
  await client2.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [path.resolve("dist/server.js")],
      cwd: proj,
      env: { ...process.env, CLAUDE_IMAGE_GEN_LIBRARY: lib, CLAUDE_IMAGE_GEN_CACHE: path.join(root, "cache2"), CLAUDE_IMAGE_GEN_LOCAL_CONFIG: path.join(root, "local"),
        CLAUDE_IMAGE_GEN_API_BASE: mock.url, OPENAI_API_KEY_FOR_CLAUDE_IMAGE_GEN: "test-key", CLAUDE_PROJECT_DIR: proj,
        CLAUDE_CONFIG_DIR: claudeDir, CLAUDE_CODE_SESSION_ID: "" },
      stderr: "inherit",
    }),
  );
  try {
    const r2 = await client2.callTool({ name: "generate_images", arguments: { prompt: "x", refs: ["paste:1"], show: false } });
    assert.equal(r2.isError, true);
    assert.match(r2.content[0].text, /Several Claude sessions/);
    const r3 = await client2.callTool({ name: "generate_images", arguments: { prompt: "from the second session", show: false } });
    assert.equal(r3.isError, false);
    // A fresh process has no session history, so "last" falls back to the newest library batch
    // (here a 2-image batch from another session) and must apply the same ambiguity rule.
    await client2.callTool({ name: "generate_images", arguments: { prompt: "pair", count: 2, show: false } });
    const client3 = new Client({ name: "smoke3", version: "1" });
    await client3.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve("dist/server.js")], cwd: proj,
      env: { ...process.env, CLAUDE_IMAGE_GEN_LIBRARY: lib, CLAUDE_IMAGE_GEN_CACHE: path.join(root, "cache3"), CLAUDE_IMAGE_GEN_LOCAL_CONFIG: path.join(root, "local"),
        CLAUDE_IMAGE_GEN_API_BASE: mock.url, OPENAI_API_KEY_FOR_CLAUDE_IMAGE_GEN: "test-key" }, stderr: "inherit" }));
    const r4 = await client3.callTool({ name: "generate_images", arguments: { prompt: "x", from: "last", show: false } });
    await client3.close();
    assert.equal(r4.isError, true);
    assert.match(r4.content[0].text, /newest batch has 2 images/);
    const feed2 = await (await fetch(`${base}/api/feed`)).json();
    assert.ok(feed2.batches.some((g) => g.prompt === "from the second session"), "second process's batch reaches the gallery");
  } finally {
    await client2.close();
  }
  ok("second session: forwards gallery events, refuses ambiguous pastes; new session's \"last\" is ambiguity-checked");

  // Changing the port moves the running gallery instead of splitting it across two ports.
  const port2 = port + 1;
  await call("image_settings", { galleryPort: port2 });
  await call("generate_images", { prompt: "after port change", show: false });
  const moved = await (await fetch(`http://127.0.0.1:${port2}/api/feed`)).json();
  assert.ok(moved.batches.some((g) => g.prompt === "after port change"));
  await assert.rejects(fetch(`http://127.0.0.1:${port}/api/ping`), "old port must be released");
  await call("image_settings", { galleryPort: port });
  await call("generate_images", { prompt: "back on the first port", show: false }); // re-elects on the old port
  ok("changing galleryPort moves the gallery");

  // Same id created on two Macs before syncing: report it, don't pick one.
  const dup = sidecar(c);
  const twin = dup.file.replace(`-${c}-`, `-${c}-other-mac-`);
  fs.copyFileSync(dup.file, twin);
  r = await call("inspect_image", { id: c });
  assert.equal(r.isError, true);
  assert.match(r.text, /exists more than once/);
  fs.rmSync(twin);
  ok("duplicate ids are reported, not resolved arbitrarily");

  // A library macOS won't let us read (iCloud Drive privacy block) must say so, not look empty.
  const blocked = path.join(root, "Library", "Mobile Documents");
  fs.mkdirSync(path.join(blocked, "Claude Images", "images"), { recursive: true });
  fs.chmodSync(blocked, 0o000);
  const client4 = new Client({ name: "smoke4", version: "1" });
  await client4.connect(new StdioClientTransport({ command: process.execPath, args: [path.resolve("dist/server.js")], cwd: proj,
    env: { ...process.env, CLAUDE_IMAGE_GEN_LIBRARY: path.join(blocked, "Claude Images"),
      CLAUDE_IMAGE_GEN_LOCAL_CONFIG: path.join(root, "local"), CLAUDE_IMAGE_GEN_CACHE: path.join(root, "cache4") }, stderr: "inherit" }));
  try {
    for (const [tool, args] of [["list_images", {}], ["generate_images", { prompt: "x", show: false }]]) {
      const res = await client4.callTool({ name: tool, arguments: args });
      assert.equal(res.isError, true, `${tool} must fail on a blocked library`);
      assert.match(res.content[0].text, /Privacy & Security/);
    }
  } finally {
    await client4.close();
    fs.chmodSync(blocked, 0o755);
  }
  ok("a blocked iCloud library explains the macOS permission instead of looking empty");

  // A file deleted behind the server's back must give a 404, not crash the MCP server.
  fs.rmSync(sidecar(b).file.replace(".json", ".png"));
  assert.equal((await fetch(`${base}/file/${b}`)).status, 404);
  assert.equal((await (await fetch(`${base}/api/ping`)).json()).app, "claude-image-gen");
  assert.match((await call("list_images", { limit: 1 })).text, /^[a-z2-9]{4} /m);
  ok("missing image files give a 404 and the server survives");

  console.log(`\nAll ${step} checks passed.`);
} finally {
  await client.close();
  mock.server.close();
  fs.rmSync(root, { recursive: true, force: true });
}
