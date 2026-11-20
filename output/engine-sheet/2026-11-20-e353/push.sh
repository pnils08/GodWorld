#!/bin/bash
# engine.353 push: <bench|prod> — one engine file, phase05-citizens/runYouthEngine.js, on top of whatever PROD is now.
#   bash output/engine-sheet/2026-11-20-e353/push.sh <bench|prod> <commit> <base-manifest> <base-commit> [--dry-run]
# base-manifest = the sha256 tree manifest of the PROD stage this builds on; base-commit = the commit whose copy of the file PROD holds.
# bench: PROD pull must equal base-manifest; the file on PROD must be the repo copy at base-commit; build the tree with <commit>'s file,
#        write the new manifest (e353.sha256), push to SANDBOX 1004, bump its deployment, pull back and compare.
# prod:  the same base check; the built tree must equal e353.sha256 (what the bench ran) byte for byte; push, deploy, pull back.
set -euo pipefail
cd /root/GodWorld
MODE=${1:?bench|prod}; SRC=${2:?commit}; BASEMAN=${3:?base manifest}; BASEC=${4:?base commit}; DRY=${5:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/engine-sheet/2026-11-20-e353; MAN=$OUT/e353.sha256
F=phase05-citizens/runYouthEngine.js
[ -f "$BASEMAN" ] || BASEMAN=/root/GodWorld/output/research-build/$BASEMAN
[ -f "$BASEMAN" ] || { echo "no base manifest $3 — stop"; exit 1; }
[ "$(git log --format=%h "$BASEC..$SRC" -- "$F" | wc -l)" = "1" ] \
  || { echo "$F changed in $BASEC..$SRC by other than the one engine.353 commit — stop"; git log --format=%h "$BASEC..$SRC" -- "$F"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$BASEMAN" >/dev/null || { echo "PROD pull is not the base manifest $(basename "$BASEMAN") — stop"; exit 1; }
echo "PROD pull = $(basename "$BASEMAN")"
git show "$BASEC:$F" | sha256sum | cut -d' ' -f1 | grep -q "$(sha256sum "$W/stage/$F" | cut -d' ' -f1)" \
  || { echo "$F on PROD is not the repo copy at $BASEC — stop"; exit 1; }
git show "$SRC:$F" > "$W/stage/$F"
node --check "$W/stage/$F" || { echo "$F does not parse — stop"; exit 1; }
grep -q 'engine.353: a GAME-clock row lives the game' "$W/stage/$F" || { echo "staged $F lacks the engine.353 marker — stop"; exit 1; }
if [ "$MODE" = "bench" ]; then tree "$W/stage" > "$MAN"; echo "manifest written: $MAN";
else tree "$W/stage" | diff -q - "$MAN" >/dev/null || { echo "built tree differs from the benched e353.sha256 — stop"; exit 1; }; echo "built tree = the benched manifest, byte for byte"; fi
DESC="engine.353: the youth engine skips the game clock (1 file at $SRC)"
[ "$(tree "$W/stage" | wc -l)" = "$(wc -l < "$BASEMAN")" ] || { echo "file count differs from base — stop"; exit 1; }
[ "$(diff <(tree "$W/stage" | cut -d' ' -f1) <(cut -d' ' -f1 "$BASEMAN") | grep -c '^<')" = "1" ] || { echo "not exactly one file differs from base — stop"; exit 1; }
echo "$DESC; 1 file differs from base"
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
echo "pull-back byte-identical to e353.sha256 ($MODE)"
