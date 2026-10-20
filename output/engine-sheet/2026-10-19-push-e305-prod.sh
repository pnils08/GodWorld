#!/bin/bash
# engine.305 PROD push: PROD (stage 13, @150) + the 2 engine.305 Apps Script files at <commit>, which must equal the
# benched stage byte for byte (<manifest>, written by the bench push of the same commit: stage14-e305.sha256).
# No sheet precondition (pulse-only change). Copied from push-e304-prod.sh.
#   bash output/engine-sheet/2026-10-19-push-e305-prod.sh <commit> <manifest> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=$1; MAN=$2; DRY=${3:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet
PRE=ac5acf2a
FILES="phase05-citizens/generateCitizensEvents.js utilities/neighborhoodPulseMap.js"
[ -f "$MAN" ] || { echo "no benched manifest $MAN — stop"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage13-e304.sha256" >/dev/null \
  || { echo "PROD drifted from stage 13 since the bench — stop"; exit 1; }
echo "fresh PROD pull = stage 13 (no drift)"
for f in $FILES; do
  git show "$PRE:$f" | cmp -s - "$W/stage/$f" || { echo "$f on PROD is not the stage-13 copy — stop"; exit 1; }
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
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "engine.305 = stage 13 + 2 files at $SRC (hood pulse follows the line's sign) — bench 1004 @67" | tail -1 )
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep "$DEP"
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — PROD is not the benched stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
echo "$(date -Iseconds) engine.305 on PROD at $SRC; pull-back = $MAN" > "$OUT/push-e305-prod.DONE"
