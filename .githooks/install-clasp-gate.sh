#!/bin/bash
# install-clasp-gate — wrap node_modules/.bin/clasp with the deploy gate (S282).
# Idempotent: safe to run repeatedly. Wired into package.json "postinstall" so every
# npm install re-arms the gate (npm recreates the .bin shim, which would otherwise
# silently remove it).

set -e
BIN="$(dirname "$0")/../node_modules/.bin"
GATE="$(cd "$(dirname "$0")" && pwd)/clasp-gate.sh"

[ -e "$BIN/clasp" ] || { echo "clasp-gate: no node_modules/.bin/clasp (run npm install first?)"; exit 0; }

# Already armed? (clasp is our gate script)
if [ -f "$BIN/clasp" ] && grep -q "clasp-gate" "$BIN/clasp" 2>/dev/null; then
  # refresh gate body in place (picks up gate-script edits)
  cp "$GATE" "$BIN/clasp"
  chmod +x "$BIN/clasp"
  echo "clasp-gate: already armed (refreshed)"
  exit 0
fi

# Arm: preserve the real entrypoint as clasp-real, install the gate as clasp.
mv "$BIN/clasp" "$BIN/clasp-real"
cp "$GATE" "$BIN/clasp"
chmod +x "$BIN/clasp" "$BIN/clasp-real"
echo "clasp-gate: armed (real binary at .bin/clasp-real)"
