#!/bin/bash
# Stage 4c isolated PROD push. Stage 4c = PROD stage 4 + pipeline.73 mint flags (63ade2f8, one file:
# phase05-citizens/processAdvancementIntake.js). Bench 1004 @25: C112 on BASELINE-1004-C111 ok, persist
# PROD before this = stage 4b (8d449968, pushed 2026-10-14).
# The fresh PROD pull must match stage4b-mintflags.sha256 (no drift); the built stage must match stage4c-mintflags.sha256.
#   bash output/engine-sheet/push-stage4c-prod.sh [--dry-run]
set -euo pipefail
cd /root/GodWorld
DRY=${1:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet
W=$(mktemp -d)
mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage4b-mintflags.sha256" >/dev/null \
  || { echo "PROD drifted from stage 4b since the bench — stop"; exit 1; }
echo "fresh PROD pull = stage 4b (no drift)"
git show 63ade2f8:phase05-citizens/processAdvancementIntake.js > "$W/stage/phase05-citizens/processAdvancementIntake.js"
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage4c-mintflags.sha256" >/dev/null \
  || { echo "built stage does not match the benched stage 4c — stop"; exit 1; }
echo "stage = the benched stage 4c, byte for byte (1 file over PROD)"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage4c-mintflags.sha256" >/dev/null \
  || { echo "PULL-BACK MISMATCH — PROD is not the benched stage"; exit 1; }
N=$(find "$W/pullback" -name '*.js' | wc -l)
echo "pull-back $N js + manifest byte-identical to stage 4c"
echo "$(date -Iseconds) stage4c on PROD; pull-back $N js + manifest = stage4c-mintflags.sha256" > "$OUT/push-stage4c-prod.DONE"
