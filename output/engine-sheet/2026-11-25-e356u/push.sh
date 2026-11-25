#!/bin/bash
# engine.356 stage 86 PROD push — cut B, the part of the day on a line (2 files) on top of PROD stage 88 (e356t-prod.sha256). Only after the sandbox read and the comparison pass on the same commit.
#   bash output/engine-sheet/2026-11-25-e356u/push.sh <commit> [--dry-run]
# Benched: the sandbox, the exact tree (e356u.sha256) — two labelled runs (base, full) and compare.js. Builder's standing go (TERMINAL.md: a PROD clasp push with its smoke note).
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}; DRY=${2:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet/2026-11-25-e356u; BENCHMAN=$OUT/e356u.sha256; MAN=$OUT/e356u-prod.sha256
BASEMAN=/root/GodWorld/output/engine-sheet/2026-11-25-e356t/e356t-prod.sha256; BASEC=f45764d8a
FILES="phase05-citizens/bondEngine.js"
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$BASEMAN" >/dev/null || { echo "PROD pull is not stage 88 (e356t-prod.sha256) — stop"; exit 1; }
echo "PROD pull = stage 88 (e356t-prod.sha256)"
for F in $FILES; do
  [ "$(git show "$BASEC:$F" | sha256sum | cut -d' ' -f1)" = "$(sha256sum "$W/stage/$F" | cut -d' ' -f1)" ] || { echo "$F on PROD is not the repo copy at $BASEC — stop"; exit 1; }
  git show "$SRC:$F" > "$W/stage/$F"; node --check "$W/stage/$F" || { echo "$F does not parse — stop"; exit 1; }
done
CHG=$(join -j 2 <(tree "$W/stage" | sort -k2) <(sort -k2 "$BASEMAN") | awk '$2 != $3' | wc -l)
[ "$CHG" = "2" ] && grep -q "householdTypeById_" "$W/stage/phase05-citizens/bondEngine.js" || { echo "$CHG files changed vs base, expected exactly two with the cut B code — stop"; exit 1; }
tree "$W/stage" > "$MAN"; diff -q "$MAN" "$BENCHMAN" >/dev/null || { echo "built tree is not the benched tree (e356u.sha256) — stop"; exit 1; }
echo "built tree = the benched tree (e356u.sha256)"
DESC="engine.356 cut B: a bond from a shared moment (2 files at $SRC)"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > "$W/stage/.clasp.json"
cp "$W/stage/appsscript.json" "$W/manifest.orig"; printf '\n' >> "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
cp "$W/manifest.orig" "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — PROD is not the manifest"; exit 1; }
echo "pull-back byte-identical to e356u-prod.sha256 (prod)"
PDEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4); [ -n "$PDEP" ] || { echo "no PROD deployment id — version not cut"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$PDEP" -d "prod = stage 89: $DESC" | tail -1 )
