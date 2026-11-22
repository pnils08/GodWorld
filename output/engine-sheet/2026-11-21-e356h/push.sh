#!/bin/bash
# engine.356 stage 73 PROD push — the two hood-data gap fixes (7 files) on top of PROD stage 72 (e356f.sha256).
#   bash output/engine-sheet/2026-11-21-e356h/push.sh <commit> [--dry-run]
# No bench (builder's block 2026-11-21: tests and sandbox runs blocked; the code read and the agy reads are the check).
# Pushes to PROD only on the builder's go ("I already told you the job", 2026-11-21). Pattern: ../2026-11-21-e356b/push.sh.
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}; DRY=${2:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet/2026-11-21-e356h; MAN=$OUT/e356h.sha256
BASEMAN=/root/GodWorld/output/engine-sheet/2026-11-21-e356f/e356f.sha256; BASEC=56fb48160
FILES="phase05-citizens/neighborhoodTrajectoryEngine.js phase06-analysis/applyMigrationDrift.js phase02-world-state/loadNeighborhoodState.js phase05-citizens/generateCitizensEvents.js phase03-population/generateCrisisSpikes.js phase01-config/engine94SheetContract.js phase01-config/godWorldEngine2.js"
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$BASEMAN" >/dev/null || { echo "PROD pull is not stage 72 (e356f.sha256) — stop"; exit 1; }
echo "PROD pull = stage 72 (e356f.sha256)"
for F in $FILES; do
  [ "$(git show "$BASEC:$F" | sha256sum | cut -d' ' -f1)" = "$(sha256sum "$W/stage/$F" | cut -d' ' -f1)" ] || { echo "$F on PROD is not the repo copy at $BASEC — stop"; exit 1; }
  git show "$SRC:$F" > "$W/stage/$F"; node --check "$W/stage/$F" || { echo "$F does not parse — stop"; exit 1; }
done
grep -q "ensureEngine356Config_(ss);" "$W/stage/phase01-config/godWorldEngine2.js" || { echo "fold marker missing — stop"; exit 1; }
[ "$(tree "$W/stage" | wc -l)" = "$(wc -l < "$BASEMAN")" ] || { echo "file count differs from base — stop"; exit 1; }
CHG=$(join -j 2 <(tree "$W/stage" | sort -k2) <(sort -k2 "$BASEMAN") | awk '$2 != $3' | wc -l)
[ "$CHG" = "7" ] || { echo "$CHG files changed vs base, expected seven — stop"; exit 1; }
tree "$W/stage" > "$MAN"; echo "manifest written: $MAN"
DESC="engine.356 gaps: crime counts in the hood trajectory and migration; a blank hood-map cell is missing (7 files at $SRC)"
echo "$DESC; vs stage 72"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > "$W/stage/.clasp.json"
cp "$W/stage/appsscript.json" "$W/manifest.orig"; printf '\n' >> "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
cp "$W/manifest.orig" "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — PROD is not the manifest"; exit 1; }
echo "pull-back byte-identical to e356h.sha256 (prod)"
PDEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4); [ -n "$PDEP" ] || { echo "no PROD deployment id — version not cut"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$PDEP" -d "prod = stage 73: $DESC" | tail -1 )
