#!/bin/bash
# engine.356 push: <bench|prod> — two files on top of PROD stage 66 (output/engine-sheet/2026-11-21-e341/e341.sha256):
#   phase05-citizens/generateCitizensEvents.js, phase09-digest/finalizeCycleState.js (last night's places and programmes reach the lines).
#   bash output/engine-sheet/2026-11-21-e356/push.sh <bench|prod> <commit> [--dry-run]
# Pattern: output/engine-sheet/2026-11-21-e341/push.sh. bench writes e356.sha256; prod must build that manifest byte for byte.
# PROD has no version left to cut (200 reached, stage 65): prod mode pushes HEAD and pulls back, no deploy.
set -euo pipefail
cd /root/GodWorld
MODE=${1:?bench|prod}; SRC=${2:?commit}; DRY=${3:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet/2026-11-21-e356; MAN=$OUT/e356.sha256
BASEMAN=/root/GodWorld/output/engine-sheet/2026-11-21-e341/e341.sha256; BASEC=a15dbb895^
FILES="phase05-citizens/generateCitizensEvents.js phase09-digest/finalizeCycleState.js"
GONE=""
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$BASEMAN" >/dev/null || { echo "PROD pull is not stage 66 (e341.sha256) — stop"; exit 1; }
echo "PROD pull = stage 66 (e341.sha256)"
for F in $FILES; do
  [ "$(git show "$BASEC:$F" | sha256sum | cut -d' ' -f1)" = "$(sha256sum "$W/stage/$F" | cut -d' ' -f1)" ] || { echo "$F on PROD is not the repo copy at $BASEC — stop"; exit 1; }
  git show "$SRC:$F" > "$W/stage/$F"; node --check "$W/stage/$F" || { echo "$F does not parse — stop"; exit 1; }
done
for F in $GONE; do
  [ -f "$W/stage/$F" ] || { echo "$F is not on PROD — stop"; exit 1; }
  git cat-file -e "$SRC:$F" 2>/dev/null && { echo "$F still exists at $SRC — stop"; exit 1; }
  rm "$W/stage/$F"
done
grep -q "evening:dinedOut" "$W/stage/phase05-citizens/generateCitizensEvents.js" || { echo "engine.356 marker missing in the generator — stop"; exit 1; }
grep -q "function eveningCarryPlaces_" "$W/stage/phase09-digest/finalizeCycleState.js" || { echo "engine.356 marker missing in the snapshot — stop"; exit 1; }
if [ "$MODE" = "bench" ]; then tree "$W/stage" > "$MAN"; echo "manifest written: $MAN";
else tree "$W/stage" | diff -q - "$MAN" >/dev/null || { echo "built tree differs from the benched e356.sha256 — stop"; exit 1; }; echo "built tree = the benched manifest, byte for byte"; fi
[ "$(tree "$W/stage" | wc -l)" = "$(wc -l < "$BASEMAN")" ] || { echo "file count differs from base — stop"; exit 1; }
CHG=$(join -j 2 <(tree "$W/stage" | sort -k2) <(sort -k2 "$BASEMAN") | awk '$2 != $3' | wc -l)
[ "$CHG" = "2" ] || { echo "$CHG files changed vs base, expected two — stop"; exit 1; }
DESC="engine.356: last night's real places, programmes and sightings reach the lines (2 files at $SRC)"
echo "$DESC; vs stage 66"
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
if [ "$MODE" = "bench" ]; then ( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "bench = $DESC" | tail -1 ); fi
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$TID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — $MODE is not the manifest"; exit 1; }
echo "pull-back byte-identical to e356.sha256 ($MODE)"
