#!/bin/bash
# engine.307 PROD push (stage 20): PROD (stage 19, @156, manifest stage18-e310-B3.sha256) + the 4 engine.307 files at <commit> (sports
# orgs hire their building staff, never a player or coach row), which must equal the benched stage byte for byte (<manifest>:
# stage19-e307-B8.sha256, leg B8). Lands before C113 when codex gate 2 SHIPs: live Neighborhood_Map must still read Cycle 112.
# Copied from 2026-10-21-push-e310-prod.sh.
#   bash output/engine-sheet/2026-10-22-push-e307-prod.sh <commit> <manifest> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=$1; MAN=$2; DRY=${3:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet
PRE=d86cdaeb^   # the parent of the first engine.307 commit: its copies of FILES are stage 19's
FILES="phase05-citizens/runCareerEngine.js phase05-citizens/generationalWealthEngine.js phase05-citizens/processAdvancementIntake.js phase05-citizens/applyBusinessDynamics.js"
[ -f "$MAN" ] || { echo "no benched manifest $MAN — stop"; exit 1; }
[ "$(realpath "$MAN")" = "$OUT/stage19-e307-B8.sha256" ] || { echo "manifest must be the benched stage19-e307-B8.sha256 — stop"; exit 1; }
git ls-files --error-unmatch "$MAN" >/dev/null 2>&1 && git diff --quiet HEAD -- "$MAN" || { echo "manifest $MAN is not committed as-is — stop"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage18-e310-B3.sha256" >/dev/null \
  || { echo "PROD drifted from stage 19 since the bench — stop"; exit 1; }
echo "fresh PROD pull = stage 19 (no drift)"
for f in $FILES; do
  git show "$PRE:$f" | cmp -s - "$W/stage/$f" || { echo "$f on PROD is not the stage-19 copy — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "built stage does not match the benched manifest $MAN — stop"; exit 1; }
echo "stage = the benched tree ($MAN), byte for byte"
# Pre-C113 precondition: C113 has not fired — every live Neighborhood_Map row still reads Cycle 112.
node -e '
require("/root/GodWorld/lib/env");
const L = process.env.GODWORLD_SHEET_ID;
if (!L || L === "1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA" || L === "1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA") process.exit(1);
require("/root/GodWorld/lib/sheets").getSheetData("Neighborhood_Map").then(nm => {
  const iN = nm[0].indexOf("Neighborhood"), iC = nm[0].indexOf("Cycle");
  const c = [...new Set(nm.slice(1).filter(r => r[iN]).map(r => Number(String(r[iC]).replace(/^C/, ""))))];
  process.exit(iN >= 0 && iC >= 0 && c.length === 1 && c[0] === 112 ? 0 : 1);
}, () => process.exit(1));' || { echo "live Neighborhood_Map is not all Cycle 112 (C113 fired, or the read failed) — stop"; exit 1; }
echo "live Neighborhood_Map = Cycle 112 (C113 not yet fired)"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no pinned deploymentId in the repo .clasp.json — STOP"; exit 1; }
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep -q "$DEP" || { echo "pinned deployment $DEP not in the listing — STOP"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
VER=$( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "engine.307 = stage 19 + 4 files at $SRC (sports orgs hire building staff, never a player or coach row) — bench 1004 leg B8" | tail -1 | grep -o '@[0-9]*$' )
[ -n "$VER" ] || { echo "deploy printed no version — STOP, read the deployment listing by hand"; exit 1; }
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep "$DEP" | grep -qE " ${VER}( |$)" \
  || { echo "pinned deployment $DEP does not serve $VER — STOP"; exit 1; }
echo "pinned deployment $DEP serves $VER"
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — PROD is not the benched stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
echo "$(date -Iseconds) engine.307 sports staff hiring on PROD at $SRC; pull-back = $MAN" > "$OUT/push-e307-prod.DONE"
