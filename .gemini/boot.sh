#!/usr/bin/env bash
# Boot the GodWorld assistant (agy) with repo context + memory access.
# Launch from anywhere:  /root/GodWorld/.gemini/boot.sh   [extra agy args]
set -e
cd /root/GodWorld
# Supermemory CLI expects SUPERMEMORY_API_KEY; map it from the canonical env file
# so agy's tool-subshells inherit it (npx supermemory search ... just works).
export SUPERMEMORY_API_KEY="$(grep -oP 'SUPERMEMORY_CC_API_KEY=\K.*' /root/.config/godworld/.env)"
# agy reads AGENTS.md from this cwd; AGENTS.md points it at .gemini/SESSION_CONTEXT.md.
exec agy "$@"
