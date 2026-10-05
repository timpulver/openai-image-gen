#!/bin/sh
# Installs a personal /img skill (plugin skills are always namespaced, e.g. /img:new).
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills/img"
mkdir -p "$DEST"
cp "$DIR/shortcut/img/SKILL.md" "$DEST/SKILL.md"
echo "Installed /img shortcut to $DEST (restart Claude Code or run /reload-plugins)."
