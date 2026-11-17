#!/bin/bash
# engine.349 bench push: SANDBOX 1004 script project = stage 50 (PROD @185, manifest stage50-buildnotes.sha256) + engine.349 files.
#   keys : stage 51a = stage 50 + the five Task 6 files at 4e2e075b0 (speed keys, Dial_Moves / Dial_Pulse) — no change in the fold
#   all  : stage 51  = stage 50 + the eight Task 6 + Task 2 files at d8b7a951a + processAdvancementIntake.js staged from the
#          stage-50 copy with the two Media lines only (HEAD carries engine.339, which is not live)
#   s50  : back to stage 50
# The tree is built from a pull of PROD, which must be exactly stage 50. Copied from 2026-11-16-push-e289-bench.sh.
#   bash output/research-build/2026-11-16-push-e349-bench.sh <keys|all|s50> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/research-build
S50_MAN=$OUT/stage50-buildnotes.sha256
BASE=71975a90f
KEYFILES="phase01-config/engine94SheetContract.js phase01-config/godWorldEngine2.js phase01-config/initSimulationLedger.js utilities/citizenMemory.js utilities/compressLifeHistory.js"
ALLFILES="$KEYFILES utilities/citizenDialMap.js phase05-citizens/generateCitizensEvents.js phase05-citizens/generationalWealthEngine.js"
PAI=phase05-citizens/processAdvancementIntake.js
MODE=${1:?keys|all|s50}; DRY=${2:-}
case "$MODE" in
  keys) FILES="$KEYFILES"; SRC=4e2e075b0; MAN=$OUT/stage51a-e349-keys.sha256; DESC="stage 51a: stage 50 + engine.349 speed keys and dial moves at $SRC" ;;
  all)  FILES="$ALLFILES"; SRC=d8b7a951a; MAN=$OUT/stage51-e349.sha256; DESC="stage 51: stage 50 + engine.349 Tasks 6 and 2 at $SRC" ;;
  s50)  FILES=""; SRC=""; MAN=$S50_MAN; DESC="stage 50 (= PROD @185)" ;;
  *) echo "mode?"; exit 1 ;;
esac
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S50_MAN" >/dev/null || { echo "PROD pull is not stage 50 — stop"; exit 1; }
echo "PROD pull = stage 50"
CHANGED=""
for f in $FILES; do
  git show "$BASE:$f" | sha256sum | cut -d' ' -f1 | grep -q "$(sha256sum "$W/stage/$f" | cut -d' ' -f1)" \
    || { echo "$f on PROD is not the repo copy at $BASE — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"; CHANGED="$CHANGED $f"
done
if [ "$MODE" = "all" ]; then
  [ "$(sha256sum "$OUT/stage50/processAdvancementIntake.js" | cut -d' ' -f1)" = "$(sha256sum "$W/stage/$PAI" | cut -d' ' -f1)" ] || { echo "$PAI on PROD is not the stage-50 copy — stop"; exit 1; }
  [ "$(diff "$OUT/stage50/processAdvancementIntake.js" "$OUT/stage51/processAdvancementIntake.js" | grep -c '^[<>]')" = "6" ] || { echo "staged $PAI differs from stage 50 by more than the two Media lines — stop"; exit 1; }
  cp "$OUT/stage51/processAdvancementIntake.js" "$W/stage/$PAI"; CHANGED="$CHANGED $PAI"
  grep -q "Media-Composure-Down-M" "$W/stage/$PAI" || { echo "staged intake lacks the signed hard-light line — stop"; exit 1; }
  grep -q "'Intake':" "$W/stage/utilities/citizenDialMap.js" || { echo "staged dial map lacks Intake — stop"; exit 1; }
  grep -q "Business-Composure-Down-L" "$W/stage/phase05-citizens/generationalWealthEngine.js" || { echo "staged wealth engine lacks the signed draw line — stop"; exit 1; }
fi
if [ "$MODE" != "s50" ]; then
  grep -q "ensureEngine349Config_(ss)" "$W/stage/phase01-config/godWorldEngine2.js" || { echo "staged engine lacks the 349 config call — stop"; exit 1; }
  grep -q "function buildDialMoves_" "$W/stage/utilities/compressLifeHistory.js" || { echo "staged fold lacks the dial-moves recorder — stop"; exit 1; }
  grep -q "ctx.dialOpen" "$W/stage/phase01-config/initSimulationLedger.js" || { echo "staged ledger init lacks the open copy — stop"; exit 1; }
  tree "$W/stage" > "$MAN"
  PAT=$(echo $CHANGED | sed 's/ /$|/g')'$'
  grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S50_MAN") >/dev/null || { echo "differs from stage 50 outside the named files — stop"; exit 1; }
  [ "$(wc -l < "$MAN")" = "$(wc -l < "$S50_MAN")" ] || { echo "file count differs from stage 50 — stop"; exit 1; }
fi
echo "$DESC; $(echo $CHANGED | wc -w) file(s) changed; manifest $MAN"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > "$W/stage/.clasp.json"
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "bench 1004 = $DESC" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back byte-identical to $(basename "$MAN")"
