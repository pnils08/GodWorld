#!/bin/bash
# PROD fix 2026-11-21 (research-build): @198 (all of main at 4479a1483) carried 12 world-view/ files; world-view/build.js's
# require() kills every Apps Script load ("ReferenceError: require is not defined (line 4, file world-view/build)").
# Push = @198's tree minus world-view/ — every engine file byte-identical to @198. Back out: push prod198.sha256's tree.
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BASEMAN=/root/GodWorld/output/engine-sheet/2026-11-21-e340/prod198.sha256
OUT=/root/GodWorld/output/research-build/2026-11-21-e351; MAN=$OUT/prod199-noworldview.sha256
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$BASEMAN" >/dev/null || { echo "PROD pull is not @198 (prod198.sha256) — stop"; exit 1; }
echo "PROD pull = prod198.sha256"
rm -rf "$W/stage/world-view"
grep -v ' \./world-view/' "$BASEMAN" > "$W/expect"
tree "$W/stage" | diff -q - "$W/expect" >/dev/null || { echo "staged tree is not @198 minus world-view — stop"; exit 1; }
[ "$(( $(wc -l < "$BASEMAN") - $(wc -l < "$W/expect") ))" = "12" ] || { echo "not exactly 12 files removed — stop"; exit 1; }
cp "$W/expect" "$MAN"; echo "manifest: $MAN ($(wc -l < "$MAN") files; 12 world-view files removed, nothing else changed)"
[ "${1:-}" = "--dry-run" ] && { echo "dry run: stop"; exit 0; }
# clasp 3.3 push skips when no LOCAL file changed (a removed file is not a change): push once with one blank line on
# appsscript.json (forces the whole-set upload, so the 12 files go), then the exact bytes back.
cp "$W/stage/appsscript.json" "$W/manifest.orig"; printf '\n' >> "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
cp "$W/manifest.orig" "$W/stage/appsscript.json"
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4); [ -n "$DEP" ] || { echo "no PROD deployment id — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "prod = @198 minus world-view/ (its require() killed every Apps Script load)" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — PROD is not the manifest"; exit 1; }
echo "pull-back byte-identical to prod199-noworldview.sha256 (prod)"
