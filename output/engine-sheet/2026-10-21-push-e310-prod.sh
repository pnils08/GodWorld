#!/bin/bash
# engine.310 PROD push (stage 19): PROD (stage 18, @155) + phase08-v3-chicago/v3NeighborhoodWriter.js at <commit> (event draw counts
# every staged city event once, whole words for the rest), which must equal the benched stage byte for byte (<manifest>:
# stage18-e310-B3.sha256, leg B3). Runs only after the C113 live read: the stage-18 live-watch diff for C113 must exist and read
# ACCEPT-CANDIDATE (codex diff gate 2026-10-21 item 4). No sheet precondition. Copied from 2026-10-21-push-e306-prod.sh.
#   bash output/engine-sheet/2026-10-21-push-e310-prod.sh <commit> <manifest> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=$1; MAN=$2; DRY=${3:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet
PRE=2896c46c
FILES="phase08-v3-chicago/v3NeighborhoodWriter.js"
WATCH=$OUT/2026-10-21-e306-livewatch-diff-c113.json
[ -f "$MAN" ] || { echo "no benched manifest $MAN — stop"; exit 1; }
[ "$(realpath "$MAN")" = "$OUT/stage18-e310-B3.sha256" ] || { echo "manifest must be the benched stage18-e310-B3.sha256 — stop"; exit 1; } # codex final gate 2026-10-20
git ls-files --error-unmatch "$MAN" >/dev/null 2>&1 && git diff --quiet HEAD -- "$MAN" || { echo "manifest $MAN is not committed as-is — stop"; exit 1; } # codex Cut C final gate: the path is pinned, its bytes must be too
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage18-e306.sha256" >/dev/null \
  || { echo "PROD drifted from stage 18 since the bench — stop"; exit 1; }
echo "fresh PROD pull = stage 18 (no drift)"
for f in $FILES; do
  git show "$PRE:$f" | cmp -s - "$W/stage/$f" || { echo "$f on PROD is not the stage-18 copy — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "built stage does not match the benched manifest $MAN — stop"; exit 1; }
echo "stage = the benched tree ($MAN), byte for byte"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
# The C113 gate sits after the dry run so the build check can be proven before Sunday; the push itself never runs without it.
[ -f "$WATCH" ] || { echo "no C113 live-watch diff ($WATCH) — read C113 first — stop"; exit 1; }
node -e '   // codex diff gate 2 item 1: the right Cycle, an empty hold list, the read-back fields present — not the verdict string alone
const d = require(process.argv[1]);
// codex diff gate 3 item 1: typed, non-empty read-backs — a field present as null proves nothing
const fin = v => typeof v === "number" && isFinite(v), obj = v => !!v && typeof v === "object" && !Array.isArray(v);
const ea = obj(d.ea) ? Object.values(d.ea) : [];
const typed = ea.length === 22 && ea.every(v => Array.isArray(v) && v.length === 3 && v.every(fin)) &&
  obj(d.eaComponents) && obj(d.eaComponents["112"]) && obj(d.eaComponents["113"]) &&
  Array.isArray(d.bizAdded) && Array.isArray(d.employerMoves) &&
  obj(d.spotLines) && fin(d.spotLines.drawn) && Array.isArray(d.spotLines.notTheirSpot) && Array.isArray(d.spotLines.strays) &&
  Array.isArray(d.highWater) && d.highWater.length === 2 && d.highWater.every(fin);
const ok = d.cycle === 113 && d.vs === 112 && Array.isArray(d.hold) && d.hold.length === 0 && d.verdict === "ACCEPT-CANDIDATE" && typed;
process.exit(ok ? 0 : 1);' "$WATCH" || { echo "C113 live watch is not a clean C112→C113 ACCEPT-CANDIDATE — clear it first — stop"; exit 1; }
echo "C113 live watch = ACCEPT-CANDIDATE"
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no pinned deploymentId in the repo .clasp.json — STOP"; exit 1; }
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep -q "$DEP" || { echo "pinned deployment $DEP not in the listing — STOP"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
VER=$( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "engine.310 = stage 18 + v3NeighborhoodWriter.js at $SRC (event draw: staged city events once, whole words) — bench 1004 C113 leg B3" | tail -1 | grep -o '@[0-9]*$' )
[ -n "$VER" ] || { echo "deploy printed no version — STOP, read the deployment listing by hand"; exit 1; }
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep "$DEP" | grep -qE " ${VER}( |$)" \
  || { echo "pinned deployment $DEP does not serve $VER — STOP"; exit 1; } # codex final gate 2026-10-20
echo "pinned deployment $DEP serves $VER"
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — PROD is not the benched stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
echo "$(date -Iseconds) engine.310 event draw on PROD at $SRC; pull-back = $MAN" > "$OUT/push-e310-prod.DONE"
