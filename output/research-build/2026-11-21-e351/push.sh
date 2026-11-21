#!/bin/bash
# engine.351 push: <bench|prod> — three engine files on top of PROD @200 (main at 4479a1483 minus world-view; prod199-noworldview.sha256).
#   bash output/research-build/2026-11-21-e351/push.sh <bench|prod> <commit> [--dry-run]
# Pattern: output/research-build/2026-11-20-e339/push.sh. bench writes e351.sha256; prod must build that manifest byte for byte.
set -euo pipefail
cd /root/GodWorld
MODE=${1:?bench|prod}; SRC=${2:?commit}; DRY=${3:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/research-build/2026-11-21-e351; MAN=$OUT/e351.sha256
BASEMAN=/root/GodWorld/output/research-build/2026-11-21-e351/prod199-noworldview.sha256; BASEC=4479a1483
FILES="phase01-config/godWorldEngine2.js phase05-citizens/processAdvancementIntake.js utilities/compressLifeHistory.js"
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$BASEMAN" >/dev/null || { echo "PROD pull is not @200 (prod199-noworldview.sha256) — stop"; exit 1; }
echo "PROD pull = prod199-noworldview.sha256 (@200)"
for F in $FILES; do
  [ "$(git show "$BASEC:$F" | sha256sum | cut -d' ' -f1)" = "$(sha256sum "$W/stage/$F" | cut -d' ' -f1)" ] || { echo "$F on PROD is not the repo copy at $BASEC — stop"; exit 1; }
  git show "$SRC:$F" > "$W/stage/$F"; node --check "$W/stage/$F" || { echo "$F does not parse — stop"; exit 1; }
  grep -q 'engine.351' "$W/stage/$F" || { echo "staged $F lacks the engine.351 marker — stop"; exit 1; }
done
grep -q 'function arrivalStartDials_' "$W/stage/utilities/compressLifeHistory.js" || { echo "start-dial marker missing — stop"; exit 1; }
grep -q ': 2003;' "$W/stage/phase05-citizens/processAdvancementIntake.js" && { echo "the 2003 default is still there — stop"; exit 1; }
if [ "$MODE" = "bench" ]; then tree "$W/stage" > "$MAN"; echo "manifest written: $MAN";
else tree "$W/stage" | diff -q - "$MAN" >/dev/null || { echo "built tree differs from the benched e351.sha256 — stop"; exit 1; }; echo "built tree = the benched manifest, byte for byte"; fi
[ "$(tree "$W/stage" | wc -l)" = "$(wc -l < "$BASEMAN")" ] || { echo "file count differs from base — stop"; exit 1; }
[ "$(diff <(tree "$W/stage" | cut -d' ' -f1) <(cut -d' ' -f1 "$BASEMAN") | grep -c '^<')" = "3" ] || { echo "not exactly three files differ from base — stop"; exit 1; }
DESC="engine.351: an incomplete intake waits on its tab; an adult arrival's dials start from age, work and household (3 files at $SRC)"
echo "$DESC; 3 files differ from @200"
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
echo "pull-back byte-identical to e351.sha256 ($MODE)"
