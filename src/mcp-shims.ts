// Build-time replacement for "@modelcontextprotocol/server/_shims" (aliased in rolldown.config.ts).
// The SDK's Node shim defaults to a vendored ajv (265 KB of CommonJS) to validate
// elicitation responses, a feature this server never uses. The SDK's own lighter,
// ESM validator does the same job; `process` stays the real Node one (stdio needs it).
export { CfWorkerJsonSchemaValidator as DefaultJsonSchemaValidator } from "@modelcontextprotocol/server/validators/cf-worker";
export { default as process } from "node:process";
