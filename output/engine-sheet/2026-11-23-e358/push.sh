#!/bin/bash
# engine.358 stage 74 PROD push — godWorldEngine2.js (the run record) on top of PROD stage 73 (e356h.sha256).
#   bash output/engine-sheet/2026-11-23-e358/push.sh <commit> [--dry-run]
# Benched: SANDBOX 1004, the exact tree (e358.sha256) — bench2.log PASS C118. Builder's standing go (TERMINAL.md: a PROD clasp push with its smoke note).
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}; DRY=${2:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet/2026-11-23-e358; BENCHMAN=$OUT/e358.sha256; MAN=$OUT/e358-prod.sha256
BASEMAN=/root/GodWorld/output/engine-sheet/2026-11-21-e356h/e356h.sha256; BASEC=49262adfd
FILES="phase01-config/godWorldEngine2.js"
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$BASEMAN" >/dev/null || { echo "PROD pull is not stage 73 (e356h.sha256) — stop"; exit 1; }
echo "PROD pull = stage 73 (e356h.sha256)"
for F in $FILES; do
  [ "$(git show "$BASEC:$F" | sha256sum | cut -d' ' -f1)" = "$(sha256sum "$W/stage/$F" | cut -d' ' -f1)" ] || { echo "$F on PROD is not the repo copy at $BASEC — stop"; exit 1; }
  git show "$SRC:$F" > "$W/stage/$F"; node --check "$W/stage/$F" || { echo "$F does not parse — stop"; exit 1; }
done
grep -q "writeRunRecord_(ss, fire, outcome);" "$W/stage/phase01-config/godWorldEngine2.js" || { echo "engine.358 marker missing — stop"; exit 1; }
CHG=$(join -j 2 <(tree "$W/stage" | sort -k2) <(sort -k2 "$BASEMAN") | awk '$2 != $3' | wc -l)
[ "$CHG" = "1" ] || { echo "$CHG files changed vs base, expected one — stop"; exit 1; }
tree "$W/stage" > "$MAN"; diff -q "$MAN" "$BENCHMAN" >/dev/null || { echo "built tree is not the benched tree (e358.sha256) — stop"; exit 1; }
echo "built tree = the benched tree (e358.sha256)"
DESC="engine.358: the engine writes its run record to Engine_Run_Log (godWorldEngine2.js at $SRC)"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > "$W/stage/.clasp.json"
cp "$W/stage/appsscript.json" "$W/manifest.orig"; printf '\n' >> "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
cp "$W/manifest.orig" "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — PROD is not the manifest"; exit 1; }
echo "pull-back byte-identical to e358-prod.sha256 (prod)"
PDEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4); [ -n "$PDEP" ] || { echo "no PROD deployment id — version not cut"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$PDEP" -d "prod = stage 74: $DESC" | tail -1 )
