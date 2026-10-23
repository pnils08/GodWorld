#!/bin/bash
# engine.297 PROD push (stage 22): PROD (stage 21, @158, manifest stage20-e308-H1.sha256) + buildEveningFamous.js + culturalLedger.js at <commit>
# (fame sightings draw from Active Cultural_Ledger rows, living linked citizens only), which must equal the benched
# stage byte for byte (<manifest>: stage21-e297-F1.sha256, leg F1). Lands before C113. Same live fire-state gate as stage 20 (codex
# engine.307 diff gate 2 item 5): cycleCount / every Neighborhood_Map Cycle / Riley_Digest's last Cycle = 112 and no _CycleCheckpoint
# right before the push, right after the pull-back and 8 minutes later; a C113 persisting inside the window is a straddle (exit 3).
# Copied from 2026-10-22-push-e308-prod.sh.
#   bash output/engine-sheet/2026-10-22-push-e297-prod.sh <commit> <manifest> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=$1; MAN=$2; DRY=${3:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet
PRE=c88b5012   # stage 21's copy of both files (unchanged since 01ea836f)
FILES="phase07-evening-media/buildEveningFamous.js phase07-evening-media/culturalLedger.js"
[ -f "$MAN" ] || { echo "no benched manifest $MAN — stop"; exit 1; }
[ "$(realpath "$MAN")" = "$OUT/stage21-e297-F1.sha256" ] || { echo "manifest must be the benched stage21-e297-F1.sha256 — stop"; exit 1; }
git ls-files --error-unmatch "$MAN" >/dev/null 2>&1 && git diff --quiet HEAD -- "$MAN" || { echo "manifest $MAN is not committed as-is — stop"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage20-e308-H1.sha256" >/dev/null \
  || { echo "PROD drifted from stage 21 since the bench — stop"; exit 1; }
echo "fresh PROD pull = stage 21 (no drift)"
for f in $FILES; do
  git show "$PRE:$f" | cmp -s - "$W/stage/$f" || { echo "$f on PROD is not the stage-21 copy — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "built stage does not match the benched manifest $MAN — stop"; exit 1; }
echo "stage = the benched tree ($MAN), byte for byte"
fire_state() {   # fire_state <when> — exit 0 only when live reads Cycle 112 everywhere and no checkpoint is held
  WHEN="$1" node -e '
require("/root/GodWorld/lib/env");
const L = process.env.GODWORLD_SHEET_ID;
if (!L || L === "1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA" || L === "1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA") process.exit(2);
const sh = require("/root/GodWorld/lib/sheets"), num = v => Number(String(v).replace(/^C/, ""));
(async () => {
  const wc = await sh.getSheetData("World_Config"), cc = num((wc.find(r => String(r[0]).trim() === "cycleCount") || [])[1]);
  const nm = await sh.getSheetData("Neighborhood_Map"), iN = nm[0].indexOf("Neighborhood"), iC = nm[0].indexOf("Cycle");
  const nmc = [...new Set(nm.slice(1).filter(r => r[iN]).map(r => num(r[iC])))];
  const rd = await sh.getSheetData("Riley_Digest"), rl = num(rd[rd.length - 1][rd[0].indexOf("Cycle")]);
  let cp = ""; try { const c = await sh.getSheetData("_CycleCheckpoint"); cp = c && c[0] ? String(c[0][0] || "") : ""; } catch (e) { if (!/Unable to parse range|not found/i.test(e.message)) throw e; cp = ""; } // no tab = no checkpoint; any other failure is not clean
  const ok = cc === 112 && iN >= 0 && iC >= 0 && nmc.length === 1 && nmc[0] === 112 && rl === 112 && cp === "";
  console.log("live fire state " + process.env.WHEN + ": cycleCount " + cc + ", Neighborhood_Map " + JSON.stringify(nmc) + ", Riley last " + rl + ", checkpoint " + (cp ? "HELD" : "none") + " — " + (ok ? "C113 not fired" : "NOT CLEAN"));
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e.message); process.exit(2); });' 2>&1 | grep -v "injected env"
  return ${PIPESTATUS[0]}
}
fire_state "before the push" || { echo "C113 fired, a checkpoint is held, or the read failed — stop"; exit 1; }
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no pinned deploymentId in the repo .clasp.json — STOP"; exit 1; }
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep -q "$DEP" || { echo "pinned deployment $DEP not in the listing — STOP"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
VER=$( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "engine.297 = stage 21 + buildEveningFamous.js + culturalLedger.js at $SRC (fame sightings from the Cultural_Ledger) — bench 1004 leg F1" | tail -1 | grep -o '@[0-9]*$' )
[ -n "$VER" ] || { echo "deploy printed no version — STOP, read the deployment listing by hand"; exit 1; }
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep "$DEP" | grep -qE " ${VER}( |$)" \
  || { echo "pinned deployment $DEP does not serve $VER — STOP"; exit 1; }
echo "pinned deployment $DEP serves $VER"
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — PROD is not the benched stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
fire_state "after the pull-back" || { echo "STOP: live moved off Cycle 112 across the deploy — C113 straddled it; read which version ran before anything else"; exit 3; }
echo "waiting 480 s: a fire admitted before the deploy would persist inside this window"; sleep 480
fire_state "8 minutes after" || { echo "STOP: C113 persisted inside the window — it may have run stage 21; read which version ran before anything else"; exit 3; }
echo "$(date -Iseconds) engine.297 fame sightings from the Cultural_Ledger on PROD at $SRC; pull-back = $MAN; live still Cycle 112 eight minutes after the deploy" > "$OUT/push-e297-prod.DONE"
