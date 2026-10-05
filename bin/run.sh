#!/bin/sh
# Starts the MCP server with a suitable Node.js (>= 20). Claude Code started
# from the Dock or a GUI editor often lacks the shell's PATH (nvm, volta, ...),
# so we also look in the usual install locations.
DIR="$(cd "$(dirname "$0")/.." && pwd)"

# A candidate counts only if it runs and is new enough; an old system node
# would otherwise start and fail in confusing ways.
usable() {
  [ -x "$1" ] && "$1" -e 'process.exit(+process.versions.node.split(".")[0] >= 20 ? 0 : 1)' 2>/dev/null
}

find_node() {
  candidate="$(command -v node 2>/dev/null)"
  if [ -n "$candidate" ] && usable "$candidate"; then echo "$candidate"; return; fi
  for candidate in \
    /opt/homebrew/bin/node \
    /usr/local/bin/node \
    "$HOME/.volta/bin/node" \
    "$HOME/.vite-plus/bin/node" \
    "${FNM_DIR:-$HOME/Library/Application Support/fnm}/aliases/default/bin/node" \
    "$HOME/.local/share/fnm/aliases/default/bin/node" \
    "$HOME/.fnm/aliases/default/bin/node"; do
    if usable "$candidate"; then echo "$candidate"; return; fi
  done
  # Newest nvm install first (read line by line so paths with spaces survive).
  ls -d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V -r | while IFS= read -r candidate; do
    if usable "$candidate"; then echo "$candidate"; break; fi
  done
}

NODE="$(find_node)"
if [ -z "$NODE" ]; then
  echo "image-gen: Node.js >= 20 not found. Install it, e.g. 'brew install node'." >&2
  exit 1
fi
exec "$NODE" "$DIR/dist/server.js" "$@"
