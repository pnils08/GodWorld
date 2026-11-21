#!/bin/bash
# engine.356 bond-line push: <bench|prod> — one file on top of PROD stage 67 (output/engine-sheet/2026-11-21-e356/e356.sha256):
#   phase05-citizens/bondEngine.js (every bond life line also lands on LifeHistory_Log).
#   bash output/engine-sheet/2026-11-21-e356b/push.sh <bench|prod> <commit> [--dry-run]
# Pattern: output/engine-sheet/2026-11-21-e356/push.sh. bench writes e356b.sha256; prod must build that manifest byte for byte.
# prod mode pushes HEAD, pulls back, then cuts a version on the PROD deployment (the version limit was cleared 2026-11-21).
set -euo pipefail
cd /root/GodWorld
MODE=${1:?bench|prod}; SRC=${2:?commit}; DRY=${3:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet/2026-11-21-e356b; MAN=$OUT/e356b.sha256
BASEMAN=/root/GodWorld/output/engine-sheet/2026-11-21-e356/e356.sha256; BASEC=fbf6a0707^
FILES="phase05-citizens/bondEngine.js"
GONE=""
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$BASEMAN" >/dev/null || { echo "PROD pull is not stage 67 (e356.sha256) — stop"; exit 1; }
echo "PROD pull = stage 67 (e356.sha256)"
for F in $FILES; do
  [ "$(git show "$BASEC:$F" | sha256sum | cut -d' ' -f1)" = "$(sha256sum "$W/stage/$F" | cut -d' ' -f1)" ] || { echo "$F on PROD is not the repo copy at $BASEC — stop"; exit 1; }
  git show "$SRC:$F" > "$W/stage/$F"; node --check "$W/stage/$F" || { echo "$F does not parse — stop"; exit 1; }
done
for F in $GONE; do
  [ -f "$W/stage/$F" ] || { echo "$F is not on PROD — stop"; exit 1; }
  git cat-file -e "$SRC:$F" 2>/dev/null && { echo "$F still exists at $SRC — stop"; exit 1; }
  rm "$W/stage/$F"
done
grep -q "engine.356 bond line" "$W/stage/phase05-citizens/bondEngine.js" || { echo "engine.356 bond marker missing — stop"; exit 1; }
if [ "$MODE" = "bench" ]; then tree "$W/stage" > "$MAN"; echo "manifest written: $MAN";
else tree "$W/stage" | diff -q - "$MAN" >/dev/null || { echo "built tree differs from the benched e356b.sha256 — stop"; exit 1; }; echo "built tree = the benched manifest, byte for byte"; fi
[ "$(tree "$W/stage" | wc -l)" = "$(wc -l < "$BASEMAN")" ] || { echo "file count differs from base — stop"; exit 1; }
CHG=$(join -j 2 <(tree "$W/stage" | sort -k2) <(sort -k2 "$BASEMAN") | awk '$2 != $3' | wc -l)
[ "$CHG" = "1" ] || { echo "$CHG files changed vs base, expected one — stop"; exit 1; }
DESC="engine.356: every bond life line also lands on LifeHistory_Log (1 file at $SRC)"
echo "$DESC; vs stage 67"
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
echo "pull-back byte-identical to e356b.sha256 ($MODE)"
if [ "$MODE" = "prod" ]; then PDEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4); [ -n "$PDEP" ] || { echo "no PROD deployment id — version not cut"; exit 1; }; ( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$PDEP" -d "prod = stage 68: $DESC" | tail -1 ); fi
