#!/bin/bash
# engine.356 — put PROD stage 72 (e356f.sha256), byte for byte, on SANDBOX 1004, so tonight's stack (stages 69-72)
# fires once before the live C117 fire. Pulls PROD, checks it is the stage-72 manifest, pushes that tree to the
# bench script, cuts the bench deployment, pulls the bench back and compares. Never pushes to PROD.
#   bash output/engine-sheet/2026-11-21-e356g/bench-push.sh [--dry-run]
set -euo pipefail
cd /root/GodWorld
DRY=${1:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
MAN=/root/GodWorld/output/engine-sheet/2026-11-21-e356f/e356f.sha256
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$MAN" >/dev/null || { echo "PROD pull is not stage 72 (e356f.sha256) — stop"; exit 1; }
echo "PROD pull = stage 72 (e356f.sha256)"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the bench push"; exit 0; fi
printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > "$W/stage/.clasp.json"
grep -q "$PROD_ID" "$W/stage/.clasp.json" && { echo "bench staging carries the PROD id — stop"; exit 1; }
cp "$W/stage/appsscript.json" "$W/manifest.orig"; printf '\n' >> "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
cp "$W/manifest.orig" "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "bench = PROD stage 72 (engine.356 stack 69-72)" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "BENCH PULL-BACK MISMATCH"; exit 1; }
echo "bench pull-back byte-identical to e356f.sha256 (= PROD stage 72)"
