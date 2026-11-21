#!/bin/bash
# engine.339 push: <bench|prod> — five engine files on top of PROD stage 61 (engine.353's e353.sha256).
#   bash output/research-build/2026-11-20-e339/push.sh <bench|prod> <commit> [--dry-run]
# Pattern: output/engine-sheet/2026-11-20-e353/push.sh. The staged tree is PROD + this commit's diff + the 2026-11-08 intake-die
# deletion that never shipped (cdf7ed12a's intake hunk, 6ead67356's utilities/citizenDerivation.js — builder 11-08 "Delete it"):
#   generationalEventsEngine.js, generateGenericCitizens.js: PROD = 1d74b2e49~1 (the kid-mint commit's parent)
#   processAdvancementIntake.js: PROD vs 1d74b2e49~1 = exactly prod-vs-parent-intake.diff (the cdf7ed12a hunk)
#   bondEngine.js: PROD = df0052132~1 (the name-rule commit's parent)
#   utilities/citizenDerivation.js: PROD = 6ead67356~1
# <commit> = the commit whose five files go up (kid mint + name rule + the one-grab lottery).
# bench writes e339.sha256; prod must build that manifest byte for byte.
set -euo pipefail
cd /root/GodWorld
MODE=${1:?bench|prod}; SRC=${2:?commit}; DRY=${3:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/research-build/2026-11-20-e339; MAN=$OUT/e339.sha256
BASEMAN=/root/GodWorld/output/engine-sheet/2026-11-20-e353/e353.sha256
FILES="phase04-events/generationalEventsEngine.js phase05-citizens/generateGenericCitizens.js phase05-citizens/processAdvancementIntake.js phase05-citizens/bondEngine.js utilities/citizenDerivation.js"
KID=1d74b2e49; NAME=df0052132
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$BASEMAN" >/dev/null || { echo "PROD pull is not stage 61 (e353.sha256) — stop"; exit 1; }
echo "PROD pull = e353.sha256 (stage 61)"
same() { [ "$(git show "$1:$2" | sha256sum | cut -d' ' -f1)" = "$(sha256sum "$W/stage/$2" | cut -d' ' -f1)" ]; }
same "$KID~1" phase04-events/generationalEventsEngine.js || { echo "generationalEventsEngine.js on PROD is not $KID~1 — stop"; exit 1; }
same "$KID~1" phase05-citizens/generateGenericCitizens.js || { echo "generateGenericCitizens.js on PROD is not $KID~1 — stop"; exit 1; }
same "$NAME~1" phase05-citizens/bondEngine.js || { echo "bondEngine.js on PROD is not $NAME~1 — stop"; exit 1; }
same 6ead67356~1 utilities/citizenDerivation.js || { echo "citizenDerivation.js on PROD is not 6ead67356~1 — stop"; exit 1; }
{ diff "$W/stage/phase05-citizens/processAdvancementIntake.js" <(git show "$KID~1:phase05-citizens/processAdvancementIntake.js") || true; } | diff -q - "$OUT/prod-vs-parent-intake.diff" >/dev/null \
  || { echo "processAdvancementIntake.js on PROD differs from $KID~1 by more than the 11-08 intake-die hunk — stop"; exit 1; }
echo "base checks: PROD = repo parents, plus only the unshipped 11-08 intake-die deletion"
for F in $FILES; do
  git show "$SRC:$F" > "$W/stage/$F"; node --check "$W/stage/$F" || { echo "$F does not parse — stop"; exit 1; }
done
grep -q 'engine.339: no arrival takes the profile' "$W/stage/phase05-citizens/processAdvancementIntake.js" || { echo "intake-die marker missing — stop"; exit 1; }
grep -q 'deriveNumChildren' "$W/stage/utilities/citizenDerivation.js" && { echo "the child-count die is still in citizenDerivation.js — stop"; exit 1; }
grep -q 'engine.339 (builder 2026-11-20): "A child is a fresh mint' "$W/stage/phase05-citizens/processAdvancementIntake.js" || { echo "intake marker missing — stop"; exit 1; }
grep -q 'FAMILY_LOTTERY_SHARE' "$W/stage/phase05-citizens/processAdvancementIntake.js" && { echo "the 1% share is still in the intake file — stop"; exit 1; }
grep -q 'one background citizen, blind' "$W/stage/phase05-citizens/processAdvancementIntake.js" || { echo "one-grab marker missing — stop"; exit 1; }
grep -q 'a woman takes his surname (her own kept as MaidenName); a man keeps his' "$W/stage/phase05-citizens/bondEngine.js" || { echo "courtship name-rule marker missing — stop"; exit 1; }
grep -q 'BIRTH: { min: 26, max: 40 }' "$W/stage/phase04-events/generationalEventsEngine.js" || { echo "birth marker missing — stop"; exit 1; }
grep -q '^var GC_OCCUPATIONS = \[' "$W/stage/phase05-citizens/generateGenericCitizens.js" || { echo "generator marker missing — stop"; exit 1; }
if [ "$MODE" = "bench" ]; then tree "$W/stage" > "$MAN"; echo "manifest written: $MAN";
else tree "$W/stage" | diff -q - "$MAN" >/dev/null || { echo "built tree differs from the benched e339.sha256 — stop"; exit 1; }; echo "built tree = the benched manifest, byte for byte"; fi
[ "$(tree "$W/stage" | wc -l)" = "$(wc -l < "$BASEMAN")" ] || { echo "file count differs from base — stop"; exit 1; }
[ "$(diff <(tree "$W/stage" | cut -d' ' -f1) <(cut -d' ' -f1 "$BASEMAN") | grep -c '^<')" = "5" ] || { echo "not exactly five files differ from base — stop"; exit 1; }
DESC="engine.339: the lottery grabs two; a child is a fresh mint; only a wife takes the name; births top at 40; the arrival dice gone (5 files at $SRC)"
echo "$DESC; 5 files differ from stage 61"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
if [ "$MODE" = "bench" ]; then TID=$BENCH_ID; else TID=$PROD_ID; fi
printf '{"scriptId":"%s","rootDir":""}' "$TID" > "$W/stage/.clasp.json"
grep -q "$TID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the target — stop"; exit 1; }
if [ "$MODE" = "bench" ]; then grep -q "$PROD_ID" "$W/stage/.clasp.json" && { echo "bench staging carries the PROD id — stop"; exit 1; }; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
if [ "$MODE" = "bench" ]; then DEP=$BENCH_DEP; else DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4); [ -n "$DEP" ] || { echo "no PROD deployment id — stop"; exit 1; }; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "$MODE = $DESC" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$TID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — $MODE is not the manifest"; exit 1; }
echo "pull-back byte-identical to e339.sha256 ($MODE)"
