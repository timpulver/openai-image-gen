#!/bin/sh
# Starts the MCP server with whatever Node.js is available. Claude Code started
# from the Dock or a GUI editor often lacks the shell's PATH (nvm, volta, ...),
# so we also look in the usual install locations.
DIR="$(cd "$(dirname "$0")/.." && pwd)"

find_node() {
  command -v node 2>/dev/null && return
  for candidate in \
    /opt/homebrew/bin/node \
    /usr/local/bin/node \
    "$HOME/.volta/bin/node" \
    "$HOME/.vite-plus/bin/node" \
    "$HOME/.local/share/fnm/aliases/default/bin/node" \
    $(ls -d "$HOME"/.nvm/versions/node/*/bin/node 2>/dev/null | sort -V | tail -1); do
    [ -x "$candidate" ] && echo "$candidate" && return
  done
}

NODE="$(find_node)"
if [ -z "$NODE" ]; then
  echo "image-gen: Node.js (>= 20) not found. Install it, e.g. 'brew install node'." >&2
  exit 1
fi
exec "$NODE" "$DIR/dist/server.js" "$@"
