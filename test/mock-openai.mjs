// Minimal stand-in for the OpenAI Responses + Models API, for offline tests.
import http from "node:http";
import zlib from "node:zlib";

/** A small gradient PNG (red = x, green = y) so crops can be verified by eye. */
export function gradientPng(w = 400, h = 200) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    const row = Buffer.alloc(1 + w * 3);
    for (let x = 0; x < w; x++) row.set([Math.floor((x * 255) / w), Math.floor((y * 255) / h), 128], 1 + x * 3);
    rows.push(row);
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function startMock() {
  const requests = [];
  let n = 0;
  const png = gradientPng().toString("base64");
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const send = (status, json) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(json));
      };
      if (req.url === "/big.png") {
        // 51 MB, chunked, no Content-Length: only a byte counter can stop it.
        res.writeHead(200, { "Content-Type": "image/png" });
        const block = Buffer.alloc(1 << 20);
        let sent = 0;
        const pump = () => {
          while (sent < 51 && res.write(block)) sent++;
          if (sent < 51) res.once("drain", pump);
          else res.end();
        };
        res.on("error", () => {});
        return pump();
      }
      if (req.url === "/v1/models") {
        return send(200, { data: ["gpt-6-astra", "gpt-image-2.5-sunburst", "gpt-image-2.5-flare", "tts-1"].map((id) => ({ id })) });
      }
      if (req.url !== "/v1/responses") return send(404, { error: { message: "not found" } });
      const json = JSON.parse(body);
      requests.push(json);
      const text = json.input[0].content.find((c) => c.type === "input_text").text;
      if (json.previous_response_id === "resp_expired") {
        return send(400, { error: { code: "previous_response_not_found", message: "Previous response with id 'resp_expired' not found." } });
      }
      if (text.includes("BLOCK")) {
        return send(400, {
          error: { code: "moderation_blocked", message: "blocked", moderation_details: { moderation_stage: "input", categories: ["violence"] } },
        });
      }
      const i = ++n;
      setTimeout(
        () =>
          send(200, {
            id: `resp_${i}`,
            output: [
              { type: "image_generation_call", id: `ig_${i}`, result: png, revised_prompt: `revised: ${text}`, output_format: json.tools[0].output_format ?? "png", size: "400x200" },
            ],
            usage: { input_tokens: 10, output_tokens: 20 },
          }),
        200,
      );
    });
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ server, requests, url: `http://127.0.0.1:${server.address().port}/v1` })),
  );
}
