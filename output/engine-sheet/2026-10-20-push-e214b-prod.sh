#!/bin/bash
# engine.214 8a Cut B PROD push: PROD (stage 14, @151) + the 1 Cut B Apps Script file at <commit>, which must equal the
# benched stage byte for byte (<manifest>, written by the bench push of the same commit: stage15-e214b.sha256).
# No sheet precondition (pool-only change). Copied from 2026-10-19-push-e305-prod.sh.
#   bash output/engine-sheet/2026-10-20-push-e214b-prod.sh <commit> <manifest> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=$1; MAN=$2; DRY=${3:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet
PRE=ea777cae
FILES="phase05-citizens/generateCitizensEvents.js"
[ -f "$MAN" ] || { echo "no benched manifest $MAN — stop"; exit 1; }
[ "$(realpath "$MAN")" = "$OUT/stage15-e214b.sha256" ] || { echo "manifest must be the benched stage15-e214b.sha256 — stop"; exit 1; } # codex final gate 2026-10-20
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage14-e305.sha256" >/dev/null \
  || { echo "PROD drifted from stage 14 since the bench — stop"; exit 1; }
echo "fresh PROD pull = stage 14 (no drift)"
for f in $FILES; do
  git show "$PRE:$f" | cmp -s - "$W/stage/$f" || { echo "$f on PROD is not the stage-14 copy — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "built stage does not match the benched manifest $MAN — stop"; exit 1; }
echo "stage = the benched tree ($MAN), byte for byte"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no pinned deploymentId in the repo .clasp.json — STOP"; exit 1; }
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep -q "$DEP" || { echo "pinned deployment $DEP not in the listing — STOP"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
VER=$( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "engine.214 Cut B = stage 14 + 1 file at $SRC (hood lines as dial-gated reactions) — bench 1004 pair C113" | tail -1 | grep -o '@[0-9]*$' )
[ -n "$VER" ] || { echo "deploy printed no version — STOP, read the deployment listing by hand"; exit 1; }
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep "$DEP" | grep -qE " ${VER}( |$)" \
  || { echo "pinned deployment $DEP does not serve $VER — STOP"; exit 1; } # codex final gate 2026-10-20
echo "pinned deployment $DEP serves $VER"
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — PROD is not the benched stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
echo "$(date -Iseconds) engine.214 Cut B on PROD at $SRC; pull-back = $MAN" > "$OUT/push-e214b-prod.DONE"
