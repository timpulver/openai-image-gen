# img: OpenAI image generation for Claude Code

A Claude Code plugin that lets Claude generate and **iterate on** images with OpenAI's Responses API
(`image_generation` tool). It also gives you:

- **Variations in parallel**: `/img:new 4 minimalist otter logo`
- **Iteration and branching**: refine any earlier image by its short id (`k7f2`), not just the last one
- **References**: pasted screenshots, local files, URLs or other library images
- **A live local gallery** that opens as soon as you ask for images, shows a loading tile for each one, and fills
  them in as they finish
- **A permanent library** in iCloud Drive, so every image and its id work on all your Macs

```
/img:new 4 minimalist otter logo          → 4 variations, gallery opens with 4 loading tiles
/img:refine k7f2 thicker lines            → iterate on k7f2 (keeps the OpenAI conversation context)
/img:new 2 an app UI like these [Image #1] [Image #2]   → pasted images as references
/img:keep k7f2 ./public/logo.png          → copy into the project (for git) and star it
/img:model flare                          → switch the default image model, for all sessions
```

You can also just talk: *"make the third one warmer"*, *"go back to p3m9 and try a red scarf"*,
*"use ~/Desktop/moodboard.png as a reference"*.

## Setup (once per Mac)

### 1. Create a dedicated OpenAI API key

Create a separate OpenAI **project** for this (e.g. `claude-image-gen`) at
<https://platform.openai.com/settings/organization/projects>, generate a key there, and set a **monthly budget**
for the project. Its costs then show up separately, and a runaway loop can't drain your main account.

A **restricted** key is enough. Under *Permissions → Restricted*, set:

| Permission | Setting |
|---|---|
| Responses (`/v1/responses`) | **Request** |
| List models | **Read** (for `list_image_models`) |
| everything else | None |

The Images endpoint (`/v1/images`) isn't needed: images are generated through the Responses API's
`image_generation` tool.

Image generation may require a [verified organization](https://help.openai.com/en/articles/10910291).

### 2. Make the key available as `OPENAI_API_KEY_FOR_CLAUDE_IMAGE_GEN`

The server looks for the key in this order:

1. The environment variable **`OPENAI_API_KEY_FOR_CLAUDE_IMAGE_GEN`**
2. On macOS: a **Keychain** item with that same name. **Recommended**, because it works however Claude Code was
   started (terminal, Dock, VS Code), and the key never sits in a plaintext file:

   Copy the key to the clipboard, then:

   ```sh
   # -U updates an existing entry; the trailing pbcopy clears the clipboard
   security add-generic-password -U -a "$USER" -s OPENAI_API_KEY_FOR_CLAUDE_IMAGE_GEN -w "$(pbpaste)" && pbcopy </dev/null
   ```

   Don't use the interactive form (`-w` without a value): its prompt silently cuts input off at 128 characters,
   and OpenAI project keys are longer. Check with
   `security find-generic-password -s OPENAI_API_KEY_FOR_CLAUDE_IMAGE_GEN -w | wc -c` (a full key gives about 165).
   Passing the key as an argument makes it visible to `ps` for the moment the command runs; on a personal Mac that's
   an acceptable trade-off for getting the whole key stored.

   Keys added this way stay in the Mac's login keychain and don't sync, so run this on each Mac.

Alternatively, `export OPENAI_API_KEY_FOR_CLAUDE_IMAGE_GEN=sk-...` in `~/.zshenv`. Claude Code then only sees it
when started from a shell.

### 3. Install the plugin

In Claude Code:

```
/plugin marketplace add timpulver/openai-image-gen
/plugin install img@timpulver
```

Choose **user scope** so it's available in every project. To get updates later, run
`/plugin marketplace update timpulver`.

You need Node.js ≥ 20.19 (any 22 or 24 works). The launcher also finds Homebrew, nvm, volta, fnm and vite-plus installs when Claude Code was
started without your shell's `PATH`.

### 4. Optional: a bare `/img` shortcut

Plugin skills are always namespaced (`/img:new`). To also get a plain `/img` that generates or refines depending on
whether you start with an id:

```sh
~/.claude/plugins/marketplaces/timpulver/bin/install-shortcut.sh
```

Then `/img 4 minimalist otter logo` and `/img k7f2 make it warmer` both work.

## Commands

| Command | What it does |
|---|---|
| `/img:new [count] <prompt>` | New image(s). A leading number is the variation count (1–8). |
| `/img:refine [id] [count] <change>` | Iterate on an image (default: the last one). Refining an older image starts a new branch. |
| `/img:model [name]` | Show the current image and mainline models, or switch them (`flare`, `sunburst`, `gpt-6-astra`, …). The choice is saved for future sessions on all Macs. Also takes `quality high`, `size 1536x1024`, etc. |
| `/img:keep <id> [dest]` | Copy the image into the current project and star it. |
| `/img:gallery [id]` | Open the gallery. |

### References: pasted images, files, URLs, ids

- **Pasted images** (`[Image #1]`): Claude passes them as `paste:1`, `paste:2`, …, meaning images from your most
  recent message that contains images. Claude Code doesn't save pasted images as files, so the server reads them
  from the session transcript.
- **Files**: any path (`~/Desktop/a.png`, `./mockups/b.jpg`). HEIC/TIFF/AVIF are converted automatically on macOS.
  Dragging a file into the terminal inserts its path.
- **URLs**: downloaded once.
- **Library ids**: `k7f2` or `img:k7f2`, to use an earlier image as a style or content reference.

Every reference is copied into the library (`inputs/`, de-duplicated by content). That way the image's history stays
complete even after a temp file or URL is gone.

## How iteration works

The Responses API runs two models. A **mainline model** (default `gpt-6-astra`) reads the conversation and calls the
`image_generation` tool, which runs on the **image model** (default `gpt-image-2.5-sunburst`, the more precise editor;
`gpt-image-2.5-flare` is faster for everyday images).

When you refine an image, the server sends the parent's `previous_response_id`, so the model sees the whole chain of
prompts and images. OpenAI only keeps stored responses for about 30 days. After that, or if that fails, the server
re-uploads the parent image from the library instead. **Any image can always be refined, no matter how old.** Each
image's details show which method was used ("continued conversation" or "parent image re-uploaded").

## The library

```
~/Library/Mobile Documents/com~apple~CloudDocs/Claude Images/   (iCloud Drive → "Claude Images")
├── images/2026-10-05-k7f2-minimalist-otter-logo.png
├── images/2026-10-05-k7f2-minimalist-otter-logo.json   ← prompt, revised prompt, parent, refs, models, OpenAI ids, usage
├── inputs/3f1c9a…e2.png                                 ← stored reference images
└── settings.json                                        ← default models etc., shared by all Macs
```

`galleryPort` and `openGallery` describe a single machine, so they're stored per Mac in
`~/Library/Application Support/claude-image-gen/local.json` instead.

- **Ids** are 4 random characters mixing letters and digits (`k7f2`), with no look-alike characters (`0/o`, `1/l/i`).
  They're random rather than sequential, so two Macs generating before iCloud syncs practically never create the same
  id. If it ever happens, using that id reports both files instead of picking one.
- **One folder, date-prefixed names.** Finder sorts them by date, and a few thousand files in one folder is no problem.
- **Each image has its own JSON sidecar and there is no shared index file.** iCloud handles concurrent edits to a
  single file by creating `file 2.json` conflict copies, so the server never keeps one.
- **Offloaded files**: if macOS "Optimise Mac Storage" evicts images, the server downloads them on demand. To avoid
  the wait, right-click the folder in Finder and choose **Keep Downloaded**.
- Without iCloud Drive, the library goes to `~/Pictures/Claude Images` instead. To use a different location, set
  `CLAUDE_IMAGE_GEN_LIBRARY=/path/to/folder`.

### Permanent for you, exported for everyone else

| Referenced from | Use |
|---|---|
| Your own notes, plans, handoff files, later Claude sessions on any of your Macs | the id: `img:k7f2` |
| Anything committed to git or shared with others | `/img:keep k7f2 ./assets/` to copy it into the repo, then reference that copy |

Claude is instructed to follow this rule (via the server's instructions), so library paths shouldn't end up in
committed files. It's guidance to the model, not a hard check, so keep an eye on it when reviewing commits.

## The gallery

`http://localhost:47821` is a live view of the library, opened automatically for images you ask for:

- loading tiles with timers, filled in as each image finishes; failures (e.g. moderation) show inline
- click an image for full size, prompt, revised prompt, lineage (parent ↔ children), references and details
- copy an id or `img:` reference, star images, search, filter by starred
- one tab: when a new gallery tab opens, older tabs opened this way close themselves

The gallery is served by whichever Claude session started first; the other sessions forward their updates to it. To
browse without a Claude session running: `node dist/server.js --gallery` in this repo (or `npm run gallery`).

## How Claude sees the results

Claude gets a preview of every generated image so it can judge the results. For details like text, hands or edges,
it uses `inspect_image` to zoom into a region at native resolution. Claude's vision input is limited to about
1.15 megapixels, so cropping is how fine detail actually becomes visible.

## MCP tools

| Tool | Purpose |
|---|---|
| `generate_images` | prompt, count, `from` (parent id / `last`), `refs`, size, quality, format, background, action, `show` |
| `inspect_image` | zoom: `region` (`top-left`, `center`, …) or `box` [x, y, w, h] as fractions |
| `list_images` | `query` (prompt or id text), `starred`, `parent` (refinements of an image) |
| `export_image` | copy into the project (converts format by extension), stars it |
| `image_settings` | show or change persistent defaults |
| `list_image_models` | models available to your key |
| `open_gallery` | open the gallery at a batch or image |

## Privacy

- Prompts and reference images are sent to OpenAI. Pasted images are only read from the transcript when you
  reference them.
- Responses are stored by OpenAI (the Responses API default, `store: true`; about 30 days). Refining via
  `previous_response_id` depends on that; after it expires, the parent image is re-uploaded instead.
- The gallery listens on `127.0.0.1` only, rejects requests for other host names, and requires a custom header for
  writes, so websites can't post to it. Other user accounts on the same Mac can still reach it locally.

## How it's built

The plugin is an MCP server (`src/main.ts`) plus five skills (`skills/*/SKILL.md`) that become the `/img:…`
commands. The rules Claude follows (show the gallery, use `img:<id>` in notes, export before committing) live in the
server's instructions. `bin/run.sh` finds a suitable Node.js and starts the server.

| Part | Built with |
|---|---|
| MCP server | [`@modelcontextprotocol/server`](https://www.npmjs.com/package/@modelcontextprotocol/server) (TypeScript SDK v2), tool schemas in [zod](https://zod.dev) 4 |
| OpenAI requests | [ofetch](https://github.com/unjs/ofetch) 2 on native `fetch`. Retries 429/5xx, but never a request that got no answer, since it may already have been billed |
| Gallery | [h3](https://h3.dev) v2 on `node:http`, live updates via server-sent events, plain HTML/JS page (`src/gallery/page.html`) |
| Image previews, crops, conversion | macOS `sips` (no native dependencies) |
| Bundle | [Rolldown](https://rolldown.rs) → one ESM file, `dist/server.js` |

**Why `dist/` is committed:** Claude Code installs plugins with `git clone` and never runs `npm install`, so the
server and all its dependencies are bundled into `dist/server.js` and checked in. `.gitattributes` marks it as
generated, so GitHub hides it in diffs. The build also swaps out the MCP SDK's bundled ajv validator (unused here)
for the SDK's lighter one (`src/mcp-shims.ts`).

**One gallery for all sessions:** every Claude session runs its own server, but only the first one to bind the
gallery port serves it. The others forward their updates to it over HTTP. If that session ends, the next update
elects a new one.

## Development

```sh
nvm use && npm install
npm run build        # bundles src/ into dist/server.js (committed, so installs need no npm install)
npm test             # end-to-end test against a mock OpenAI API; no key or credits needed
npm run typecheck
claude --plugin-dir . # try the plugin from this checkout
```

Commit `dist/` after changing `src/`. Plugins are installed straight from git, with no build step.

## Troubleshooting

- **"Incorrect API key provided"**: re-store the key with the `security add-generic-password -U … "$(pbpaste)"` command
  above. The interactive prompt truncates keys to 128 characters.
  Check that the key belongs to an active project. An env var, if set, takes precedence over the Keychain.
- **"macOS blocked access to iCloud Drive"**: the app running Claude Code (Terminal, iTerm, VS Code, …) isn't allowed
  into iCloud Drive. Allow it in System Settings → Privacy & Security → Files & Folders (iCloud Drive) or Full Disk
  Access and restart it, or set `CLAUDE_IMAGE_GEN_LIBRARY` to a folder outside iCloud Drive.
- **"macOS blocked access to the Downloads folder"** (or Desktop, Documents): same cause, for a reference image.
  Allow the app under Files & Folders, copy the file elsewhere, or paste the image instead.
- **Tools don't show up**: run `/mcp` in Claude Code and look for `plugin:img:images`. If it failed, it's usually
  because Node.js wasn't found.
- **Odd results or API errors**: set `CLAUDE_IMAGE_GEN_DEBUG=1` to keep OpenAI's raw responses (without the image data)
  in `~/Library/Caches/claude-image-gen/debug/`.
- **Port 47821 is taken**: `/img:model galleryPort 47900` (or ask Claude to change `galleryPort`). This only affects
  the current Mac.
