#!/bin/bash
# clasp-gate — deploy gate for the live Apps Script engine (S282, Mike-directed).
#
# Same class as the .githooks/pre-commit control-plane gate (S274): an opt-in speed bump,
# not a cryptographic barrier. Gemini/Aider/any agent shell runs as root here and could
# read this file — the point is that an agent following instructions hits a hard stop with
# a clear message, and only a Claude engine-sheet session (or Mike deliberately) opts in.
#
# Gated subcommands: push, deploy/create-deployment, redeploy/update-deployment,
# undeploy/delete-deployment, delete/delete-script. Everything else (pull, status, login,
# deployments, apis...) passes through ungated.
#
# Install: .githooks/install-clasp-gate.sh (wraps node_modules/.bin/clasp; re-run by
# package.json postinstall so npm install cannot silently remove the gate).

REAL="$(dirname "$0")/clasp-real"

case "$1" in
  push|deploy|create-deployment|redeploy|update-deployment|undeploy|delete-deployment|delete|delete-script)
    if [ "$CLAUDE_CTL" != "1" ]; then
      echo "" >&2
      echo "BLOCKED — 'clasp $1' deploys to / mutates the LIVE GodWorld engine." >&2
      echo "Deploys are the engine-sheet terminal's function (S282). Other agents:" >&2
      echo "propose, don't deploy (CONVENTIONS §6 / S274 Aider policy)." >&2
      echo "" >&2
      echo "If you are the engine-sheet session (or Mike) deliberately deploying:" >&2
      echo "  CLAUDE_CTL=1 npx clasp $1" >&2
      echo "" >&2
      exit 1
    fi
    ;;
esac

exec "$REAL" "$@"
