import { defineConfig } from "rolldown";

// Bundles the server and its two dependencies into one ESM file: plugins are
// installed with `git clone`, so nothing runs `npm install` on the user's machine.
export default defineConfig({
  input: "src/main.ts",
  platform: "node",
  output: { file: "dist/server.js", format: "esm" },
  moduleTypes: { ".html": "text" },
  resolve: {
    // See src/mcp-shims.ts: drop the SDK's vendored ajv (unused elicitation validator).
    alias: { "@modelcontextprotocol/server/_shims": new URL("./src/mcp-shims.ts", import.meta.url).pathname },
  },
});
