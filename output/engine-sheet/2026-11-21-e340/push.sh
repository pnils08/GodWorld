#!/bin/bash
# engine.340 PROD push (builder 2026-11-21: "Commit and push live") — two files on top of PROD stage 62:
#   phase07-evening-media/buildContractSeeds.js, phase10-persistence/saveV3Seeds.js at <commit>.
#   bash output/engine-sheet/2026-11-21-e340/push.sh <commit> [--dry-run]
# No bench run backs this push (the builder's order); C117 is the first fire. Back out: push the stage 62 tree
# (output/engine-sheet/2026-11-20-e354/e354.sha256) and cut a version.
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}; DRY=${2:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BASEMAN=/root/GodWorld/output/engine-sheet/2026-11-20-e354/e354.sha256
BASEC=4f9f07734
OUT=/root/GodWorld/output/engine-sheet/2026-11-21-e340; MAN=$OUT/e340.sha256
FILES="phase07-evening-media/buildContractSeeds.js phase10-persistence/saveV3Seeds.js"
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$BASEMAN" >/dev/null || { echo "PROD pull is not stage 62 (e354.sha256) — stop"; exit 1; }
echo "PROD pull = stage 62 (e354.sha256)"
for F in $FILES; do
  [ "$(git show "$BASEC:$F" | sha256sum | cut -d' ' -f1)" = "$(sha256sum "$W/stage/$F" | cut -d' ' -f1)" ] \
    || { echo "$F on PROD is not the repo copy at $BASEC — stop"; exit 1; }
  git show "$SRC:$F" > "$W/stage/$F"
  node --check "$W/stage/$F" || { echo "$F does not parse — stop"; exit 1; }
  grep -q 'engine.340' "$W/stage/$F" || { echo "staged $F lacks the engine.340 marker — stop"; exit 1; }
done
[ "$(tree "$W/stage" | wc -l)" = "$(wc -l < "$BASEMAN")" ] || { echo "file count differs from base — stop"; exit 1; }
[ "$(diff <(tree "$W/stage" | cut -d' ' -f1) <(cut -d' ' -f1 "$BASEMAN") | grep -c '^<')" = "2" ] || { echo "not exactly two files differ from base — stop"; exit 1; }
tree "$W/stage" > "$MAN"; echo "manifest written: $MAN (2 files differ from stage 62)"
DESC="engine.340: seed class per kind, one seed per initiative, SeedID kept as text (2 files at $SRC)"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4); [ -n "$DEP" ] || { echo "no PROD deployment id — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "prod = $DESC" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — PROD is not the manifest"; exit 1; }
echo "pull-back byte-identical to e340.sha256 (prod)"
