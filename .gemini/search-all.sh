#!/usr/bin/env bash
# agy's "search everything" — one command sweeps every memory container agy may read.
# Usage:  .gemini/search-all.sh "your query"
# Writes go ONLY to the `gemini` container (see AGENTS.md); this is read-only.
set -e
Q="$1"
[ -z "$Q" ] && { echo 'usage: search-all.sh "query"'; exit 1; }
export SUPERMEMORY_API_KEY="${SUPERMEMORY_API_KEY:-$(grep -oP 'SUPERMEMORY_CC_API_KEY=\K.*' /root/.config/godworld/.env)}"
# gemini = agy's own memory; the rest are read-only depth (primary editor's layers).
for C in gemini mags bay-tribune world-data; do
  echo "===== $C ====="
  npx --no-install supermemory search "$Q" --tag "$C" --limit 5 2>/dev/null || echo "(no results / error)"
done
