#!/bin/bash
# PROD push (stage 48): PROD (stage 47 = off-season, @182) + phase01-config/godWorldEngine2.js at c4c929b40, which adds ONE
# function, clearFireRecordAfterRollback (hand-run from the Apps Script editor; clears the fire record only when it is
# finished and the sheet's cycleCount is behind it). Run by the builder on the night of 2026-11-15: live was rewound from
# C116 to C115 and the Script Properties page did not keep the delete. No sandbox fire (bench at the 200-version cap),
# no watch windows (his order). Two checks kept: the live script is exactly stage 47 before, exactly stage 48 after.
#   bash output/engine-sheet/2026-11-15-push-clearfire-prod.sh
set -euo pipefail
cd /root/GodWorld
SRC=c4c929b40
O=/root/GodWorld/output/engine-sheet
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
F=phase01-config/godWorldEngine2.js
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$O/stage47-e346-offseason.sha256" >/dev/null \
  || { echo "LIVE IS NOT STAGE 47 — stop, nothing pushed"; exit 1; }
echo "live pull = stage 47 (off-season)"
# the one file must differ from live ONLY by the new function
git show "$SRC:$F" > "$W/new.js"
ADDED=$(diff "$W/stage/$F" "$W/new.js" | grep -c '^>' || true); GONE=$(diff "$W/stage/$F" "$W/new.js" | grep -c '^<' || true)
echo "godWorldEngine2.js vs live: +$ADDED lines, -$GONE lines"
[ "$GONE" = "0" ] || { echo "the repo file removes lines live has — stop, nothing pushed"; exit 1; }
cp "$W/new.js" "$W/stage/$F"
grep -q "^function clearFireRecordAfterRollback" "$W/stage/$F" || { echo "staged file lacks the function — stop"; exit 1; }
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) > "$O/stage48-clearfire.sha256"
grep -v "godWorldEngine2.js$" "$O/stage48-clearfire.sha256" | diff -q - <(grep -v "godWorldEngine2.js$" "$O/stage47-e346-offseason.sha256") >/dev/null \
  || { echo "differs outside the one file — stop, nothing pushed"; exit 1; }
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "stage 48 = stage 47 + clearFireRecordAfterRollback at $SRC (hand-run clear for a rolled-back sheet)" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$O/stage48-clearfire.sha256" >/dev/null \
  && echo "PULL-BACK: live = stage 48, byte for byte ($(date +%H:%M:%S)). In the Apps Script editor: pick clearFireRecordAfterRollback, press Run, then fire the cycle." \
  || { echo "PULL-BACK MISMATCH — read the live script before anything else"; exit 1; }
