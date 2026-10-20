#!/bin/bash
# engine.304 PROD push: PROD (stage 9, @149) + the 9 engine.304 Apps Script files at <commit>, which must equal the
# benched stage byte for byte (<manifest>, written by the bench push of the same commit). The live Generic_Citizens
# M–O header must already be written and read back (2026-10-19-e304-gc-header.js --target live --apply --go): the
# family door throws without it.
#   bash output/engine-sheet/push-e304-prod.sh <commit> <manifest> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=$1; MAN=$2; DRY=${3:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet
PRE=25ee233c^
FILES="phase01-config/engine94SheetContract.js phase05-citizens/generateGenericCitizens.js phase05-citizens/checkForPromotions.js phase05-citizens/bondEngine.js phase05-citizens/processAdvancementIntake.js phase05-citizens/generateCitizensEvents.js phase07-evening-media/mediaRoomIntake.js phase05-citizens/citizenContextBuilder.js phase05-citizens/householdFormationEngine.js"
[ -f "$MAN" ] || { echo "no benched manifest $MAN — stop"; exit 1; }
node "$OUT/2026-10-19-e304-gc-header.js" --target live 2>&1 | grep -q "missing: none" \
  || { echo "live Generic_Citizens has no FamilyOf/FamilyRole/MaidenName header — write it first — stop"; exit 1; }
echo "live Generic_Citizens M–O header present"
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage9-e302.sha256" >/dev/null \
  || { echo "PROD drifted from stage 9 since the bench — stop"; exit 1; }
echo "fresh PROD pull = stage 9 (no drift)"
for f in $FILES; do
  git show "$PRE:$f" | cmp -s - "$W/stage/$f" || { echo "$f on PROD is not the pre-304 parent — stop"; exit 1; }
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
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "engine.304 = stage 9 + 9 files at $SRC (family lottery, kids in the pool, the dead keep their family) — bench 1004" | tail -1 )
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep "$DEP"
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — PROD is not the benched stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
echo "$(date -Iseconds) engine.304 on PROD at $SRC; pull-back = $MAN" > "$OUT/push-e304-prod.DONE"
