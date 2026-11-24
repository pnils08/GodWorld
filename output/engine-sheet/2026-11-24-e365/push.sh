#!/bin/bash
# engine.365 stage 78 PROD push — arrests read right (4 files) on top of PROD stage 77 (e364-prod.sha256).
#   bash output/engine-sheet/2026-11-24-e365/push.sh <commit> [--dry-run]
# Benched: SANDBOX 1004, the exact tree (e365.sha256) — bench.log, two fires. Builder's standing go (TERMINAL.md: a PROD clasp push with its smoke note).
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}; DRY=${2:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet/2026-11-24-e365; BENCHMAN=$OUT/e365.sha256; MAN=$OUT/e365-prod.sha256
BASEMAN=/root/GodWorld/output/engine-sheet/2026-11-23-e364/e364-prod.sha256; BASEC=219c118e7
FILES="phase04-events/careJusticeService.js phase09-digest/finalizeCycleState.js phase01-config/loadPreviousEvening.js phase03-population/updateCrimeMetrics.js"
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$BASEMAN" >/dev/null || { echo "PROD pull is not stage 77 (e364-prod.sha256) — stop"; exit 1; }
echo "PROD pull = stage 77 (e364-prod.sha256)"
for F in $FILES; do
  [ "$(git show "$BASEC:$F" | sha256sum | cut -d' ' -f1)" = "$(sha256sum "$W/stage/$F" | cut -d' ' -f1)" ] || { echo "$F on PROD is not the repo copy at $BASEC — stop"; exit 1; }
  git show "$SRC:$F" > "$W/stage/$F"; node --check "$W/stage/$F" || { echo "$F does not parse — stop"; exit 1; }
done
grep -q "crimeResidentFactor_" "$W/stage/phase03-population/updateCrimeMetrics.js" || { echo "engine.365 marker missing — stop"; exit 1; }
CHG=$(join -j 2 <(tree "$W/stage" | sort -k2) <(sort -k2 "$BASEMAN") | awk '$2 != $3' | wc -l)
[ "$CHG" = "4" ] || { echo "$CHG files changed vs base, expected four — stop"; exit 1; }
tree "$W/stage" > "$MAN"; diff -q "$MAN" "$BENCHMAN" >/dev/null || { echo "built tree is not the benched tree (e365.sha256) — stop"; exit 1; }
echo "built tree = the benched tree (e365.sha256)"
DESC="engine.365 arrests read right (4 files at $SRC)"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > "$W/stage/.clasp.json"
cp "$W/stage/appsscript.json" "$W/manifest.orig"; printf '\n' >> "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
cp "$W/manifest.orig" "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — PROD is not the manifest"; exit 1; }
echo "pull-back byte-identical to e365-prod.sha256 (prod)"
PDEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4); [ -n "$PDEP" ] || { echo "no PROD deployment id — version not cut"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$PDEP" -d "prod = stage 78: $DESC" | tail -1 )
