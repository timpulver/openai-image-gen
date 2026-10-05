// End-to-end smoke test: runs the built MCP server against a mock OpenAI API
// with a throwaway library. Run with `npm test` (after `npm run build`).
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
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
fs.writeFileSync(
  path.join(transcriptDir, "session.jsonl"),
  [
    { type: "user", message: { role: "user", content: [img(10)] } },
    { type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "ok" }] } },
    { type: "user", message: { role: "user", content: [{ type: "text", text: "like these [Image #1] [Image #2]" }, img(32), img(48)] } },
  ]
    .map((l) => JSON.stringify(l))
    .join("\n") + "\n",
);

const mock = await startMock();
const port = 47000 + Math.floor(Math.random() * 900);
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
      CLAUDE_IMAGE_GEN_API_BASE: mock.url,
      OPENAI_API_KEY_FOR_CLAUDE_IMAGE_GEN: "test-key",
      CLAUDE_PROJECT_DIR: proj,
      CLAUDE_CONFIG_DIR: claudeDir,
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
  let r = await call("image_settings", { galleryPort: port, openGallery: false, quality: "low" });
  assert.match(r.text, new RegExp(`"galleryPort": ${port}`));
  ok("settings persist into the library");

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
  const [c] = ids(r.text);
  const cj = sidecar(c).json;
  assert.equal(cj.parent, a);
  assert.equal(cj.context, "previous_response");
  assert.deepEqual(cj.refs.map((x) => x.kind), ["paste", "file"]);
  // paste:2 must be the 48px image from the LAST message with images
  const pasted = fs.readFileSync(path.join(lib, "inputs", cj.refs[0].stored));
  assert.equal(pasted.readUInt32BE(16), 48);
  ok("refine via previous_response_id + pasted image + file reference");

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
  ok("export copies into the project, stars, refuses overwrite, converts format");

  r = await call("list_image_models");
  assert.match(r.text, /gpt-image-2\.5-flare/);
  assert.doesNotMatch(r.text, /tts-1/);
  ok("list_image_models");

  const base = `http://127.0.0.1:${port}`;
  assert.equal((await (await fetch(`${base}/api/ping`)).json()).app, "claude-image-gen");
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
  ok("gallery: feed, thumbnails, starring, and request guards");

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
