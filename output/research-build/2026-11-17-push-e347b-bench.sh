#!/bin/bash
# engine.347 Tasks 12+13 bench push: SANDBOX 1004 script project = stage 53 = stage 52 (PROD @187, manifest
# stage52-e347.sha256) + utilities/citizenDialMap.js ('Sad', REFLECTION_ECHO) and utilities/compressLifeHistory.js
# (AFFECT_VALENCE sad: 0) at <commit>. The tree is built from a pull of PROD, which must be exactly stage 52.
# Copied from 2026-11-17-push-e347-bench.sh.
#   bash output/research-build/2026-11-17-push-e347b-bench.sh <commit> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/research-build
S51=$OUT/stage52-e347.sha256; MAN=$OUT/stage53-e347b.sha256
BASE=b426c40c8
FILES="utilities/citizenDialMap.js utilities/compressLifeHistory.js"
SRC=${1:?commit}; DRY=${2:-}
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S51" >/dev/null || { echo "PROD pull is not stage 52 — stop"; exit 1; }
echo "PROD pull = stage 52"
for f in $FILES; do
  git show "$BASE:$f" | sha256sum | cut -d' ' -f1 | grep -q "$(sha256sum "$W/stage/$f" | cut -d' ' -f1)" \
    || { echo "$f on PROD is not the repo copy at $BASE — stop"; exit 1; }
  [ "$(git diff "$BASE" "$SRC" -- "$f" | grep -c '^[+-][^+-]')" -le 12 ] || { echo "$f changed by more than the Sad and echo lines between $BASE and $SRC — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
grep -q "'Sad': *{ composure: -3, outabout: -1 }" "$W/stage/utilities/citizenDialMap.js" && grep -q "REFLECTION_ECHO\[baseTag_(eventTag)\] === true" "$W/stage/utilities/citizenDialMap.js" || { echo "staged dial map lacks Sad or the echo rule — stop"; exit 1; }
grep -q "sad: 0" "$W/stage/utilities/compressLifeHistory.js" || { echo "staged fold lacks the sad valence — stop"; exit 1; }
tree "$W/stage" > "$MAN"
PAT='utilities/citizenDialMap.js$|utilities/compressLifeHistory.js$'
grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S51") >/dev/null || { echo "differs from stage 52 outside the two files — stop"; exit 1; }
[ "$(wc -l < "$MAN")" = "$(wc -l < "$S51")" ] || { echo "file count differs from stage 52 — stop"; exit 1; }
DESC="stage 53: stage 52 + engine.347 the Sad mood and the retirement echo at $SRC"
echo "$DESC; 2 files changed; manifest $MAN"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > "$W/stage/.clasp.json"
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "bench 1004 = $DESC" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back byte-identical to $(basename "$MAN")"
