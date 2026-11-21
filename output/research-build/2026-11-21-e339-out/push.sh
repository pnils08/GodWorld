#!/bin/bash
# engine.339 code out: <bench|prod> — four engine files on top of PROD stage 66 (e341.sha256). The tree is stage 66 minus the three engine.339 commits; engine.351 kept.
#   bash output/research-build/2026-11-21-e339-out/push.sh <bench|prod> <commit> [--dry-run]
# Pattern: output/research-build/2026-11-20-e339/push.sh. bench writes e339out.sha256; prod must build that manifest byte for byte.
set -euo pipefail
cd /root/GodWorld
MODE=${1:?bench|prod}; SRC=${2:?commit}; DRY=${3:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/research-build/2026-11-21-e339-out; MAN=$OUT/e339out.sha256
BASEMAN=/root/GodWorld/output/engine-sheet/2026-11-21-e341/e341.sha256; BASEC=cd52ebb13
FILES="phase04-events/generationalEventsEngine.js phase05-citizens/generateGenericCitizens.js phase05-citizens/processAdvancementIntake.js phase05-citizens/bondEngine.js"
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$BASEMAN" >/dev/null || { echo "PROD pull is not stage 66 (e341.sha256) — stop"; exit 1; }
echo "PROD pull = e341.sha256 (stage 66)"
for F in $FILES; do
  [ "$(git show "$BASEC:$F" | sha256sum | cut -d' ' -f1)" = "$(sha256sum "$W/stage/$F" | cut -d' ' -f1)" ] || { echo "$F on PROD is not the repo copy at $BASEC — stop"; exit 1; }
  git show "$SRC:$F" > "$W/stage/$F"; node --check "$W/stage/$F" || { echo "$F does not parse — stop"; exit 1; }
done
grep -q 'engine.351 Task 11' "$W/stage/phase05-citizens/processAdvancementIntake.js" || { echo "engine.351 hold missing from the intake file — stop"; exit 1; }
grep -q 'one background citizen, blind\|A child is a fresh mint\|mintFamilyGcRow_' "$W/stage/phase05-citizens/processAdvancementIntake.js" && { echo "engine.339 code still in the intake file — stop"; exit 1; }
grep -q 'BIRTH: { min: 26, max: 40 }' "$W/stage/phase04-events/generationalEventsEngine.js" && { echo "engine.339 birth cap still there — stop"; exit 1; }
grep -q ': 2003;' "$W/stage/phase05-citizens/processAdvancementIntake.js" && { echo "the 2003 default is still there — stop"; exit 1; }
if [ "$MODE" = "bench" ]; then tree "$W/stage" > "$MAN"; echo "manifest written: $MAN";
else tree "$W/stage" | diff -q - "$MAN" >/dev/null || { echo "built tree differs from the benched e339out.sha256 — stop"; exit 1; }; echo "built tree = the benched manifest, byte for byte"; fi
[ "$(tree "$W/stage" | wc -l)" = "$(wc -l < "$BASEMAN")" ] || { echo "file count differs from base — stop"; exit 1; }
[ "$(diff <(tree "$W/stage" | cut -d' ' -f1) <(cut -d' ' -f1 "$BASEMAN") | grep -c '^<')" = "4" ] || { echo "not exactly four files differ from base — stop"; exit 1; }
DESC="engine.339 code out: the lottery, family rows, name rule and births as before 2026-11-20; engine.351 kept (4 files at $SRC)"
echo "$DESC; 4 files differ from stage 66"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
if [ "$MODE" = "bench" ]; then TID=$BENCH_ID; else TID=$PROD_ID; fi
printf '{"scriptId":"%s","rootDir":""}' "$TID" > "$W/stage/.clasp.json"
if [ "$MODE" = "bench" ]; then grep -q "$PROD_ID" "$W/stage/.clasp.json" && { echo "bench staging carries the PROD id — stop"; exit 1; }; fi
# clasp 3.3 push skips when no LOCAL file changed (a removed remote file is not a change): one blank line on
# appsscript.json forces the whole-set upload, then the exact bytes back (prod-fix-worldview.sh).
cp "$W/stage/appsscript.json" "$W/manifest.orig"; printf '\n' >> "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
cp "$W/manifest.orig" "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
if [ "$MODE" = "bench" ]; then DEP=$BENCH_DEP; else DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4); [ -n "$DEP" ] || { echo "no PROD deployment id — stop"; exit 1; }; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "$MODE = $DESC" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$TID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — $MODE is not the manifest"; exit 1; }
echo "pull-back byte-identical to e339out.sha256 ($MODE)"
