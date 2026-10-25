#!/bin/bash
# engine.312 PROD push (stage 27): PROD + engine.312's four files at <commit>, which must equal the benched stage byte for byte
# (<manifest>: stage27-e312.sha256, bench 1004 leg R). PROD may stand at stage 26 (engine.301 pushed first — the planned order) or
# still at stage 25 (one go carrying both: engine.301's two files at 1e6beff5 are laid too); either way the built tree must equal the
# benched stage-27 manifest, so nothing unbenched rides. Live fire-state gate (shape of 2026-10-25-push-e301-prod.sh) at <cycle> =
# the live Cycle now: cycleCount / every Neighborhood_Map Cycle / Riley_Digest last Cycle = <cycle>, no _CycleCheckpoint, no
# Engine_Errors row stamped <cycle>+1 or later — right before the push, right after the pull-back and 8 minutes later.
# The reads are bound to the sheet the pulled PROD code aims at (DEFAULT_SIM_SSID; codex engine.312 gate 3).
# Stated limit (codex engine.301 gate 3): FIRE_ADMISSION_JSON has no outside read door, so the gate is the sheet-side proxy; a
# push needs the builder's go as a named exception until engine.317 lands.
#   bash output/engine-sheet/2026-10-25-push-e312-prod.sh <commit> <manifest> <cycle> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}; MAN=${2:?manifest}; CYC=${3:?live cycle}; DRY=${4:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet
F301="phase02-world-state/applyCityDynamics.js phase09-digest/finalizeCycleState.js"
FILES="phase07-evening-media/culturalLedger.js phase05-citizens/processAdvancementIntake.js phase07-evening-media/mediaRoomIntake.js phase01-config/godWorldEngine2.js"
[[ "$CYC" =~ ^[0-9]+$ ]] && [ "$CYC" -ge 112 ] || { echo "cycle must be the live Cycle (>= 112) — stop"; exit 1; }
[ "$(realpath "$MAN")" = "$OUT/stage27-e312.sha256" ] || { echo "manifest must be the benched stage27-e312.sha256 — stop"; exit 1; }
git ls-files --error-unmatch "$MAN" >/dev/null 2>&1 && git diff --quiet HEAD -- "$MAN" || { echo "manifest $MAN is not committed as-is — stop"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
TREE=$( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum )
# codex gate 3: the fire-state reads are bound to the sheet PROD's own code aims at — DEFAULT_SIM_SSID in the utilities file just
# pulled from PROD (AIM-GUARD keeps the container-bound PROD script on that sheet unless a SIM_SSID property overrides it, which no
# outside read can see — stated). An env file pointing anywhere else stops the push.
LIVE_ID=$(grep -o "DEFAULT_SIM_SSID = '[^']*'" "$W/stage/utilities/utilityFunctions.js" | cut -d"'" -f2)
[ ${#LIVE_ID} -gt 20 ] || { echo "no DEFAULT_SIM_SSID in the PROD pull — stop"; exit 1; }
if diff -q <(echo "$TREE") "$OUT/stage26-e301.sha256" >/dev/null; then BASE="stage 26 (engine.301 on PROD)"
elif diff -q <(echo "$TREE") "$OUT/stage24-e315-G3.sha256" >/dev/null; then BASE="stage 25 (engine.301 rides this push)"
  for f in $F301; do git show "1e6beff5:$f" > "$W/stage/$f"; done
else echo "PROD is neither stage 25 nor stage 26 — drifted; stop"; exit 1; fi
echo "fresh PROD pull = $BASE"
for f in $FILES; do git show "$SRC:$f" > "$W/stage/$f"; done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "built stage does not match the benched manifest $MAN — stop"; exit 1; }
echo "stage = the benched tree ($MAN), byte for byte"
fire_state() {   # fire_state <when> — exit 0 only when live reads Cycle $CYC everywhere, no checkpoint, no error stamped past it
  WHEN="$1" CYC="$CYC" LIVE_ID="$LIVE_ID" node -e '
require("/root/GodWorld/lib/env");
const L = process.env.GODWORLD_SHEET_ID, C = Number(process.env.CYC), P = process.env.LIVE_ID;
if (!L || L !== P) { console.error("env sheet " + (L ? L.slice(0, 6) + "…" : "(none)") + " is not the sheet the PROD code aims at — stop"); process.exit(2); }
if (P === "1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA" || P === "1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA") process.exit(2);
process.env.GODWORLD_SHEET_ID = P;
const sh = require("/root/GodWorld/lib/sheets"), num = v => Number(String(v).replace(/^C/, ""));
(async () => {
  const wc = await sh.getSheetData("World_Config"), cc = num((wc.find(r => String(r[0]).trim() === "cycleCount") || [])[1]);
  const nm = await sh.getSheetData("Neighborhood_Map"), iN = nm[0].indexOf("Neighborhood"), iC = nm[0].indexOf("Cycle");
  const nmc = [...new Set(nm.slice(1).filter(r => r[iN]).map(r => num(r[iC])))];
  const rd = await sh.getSheetData("Riley_Digest"), rl = num(rd[rd.length - 1][rd[0].indexOf("Cycle")]);
  const ee = await sh.getSheetData("Engine_Errors"), iEC = ee[0].indexOf("Cycle");
  const fired = ee.slice(1).filter(r => num(r[iEC]) >= C + 1).length;
  let cp = ""; try { const c = await sh.getSheetData("_CycleCheckpoint"); cp = c && c[0] ? String(c[0][0] || "") : ""; } catch (e) { if (!/Unable to parse range|not found/i.test(e.message)) throw e; cp = ""; }
  const ok = cc === C && iN >= 0 && iC >= 0 && nmc.length === 1 && nmc[0] === C && rl === C && cp === "" && iEC >= 0 && fired === 0;
  console.log("live fire state " + process.env.WHEN + ": cycleCount " + cc + ", Neighborhood_Map " + JSON.stringify(nmc) + ", Riley last " + rl + ", checkpoint " + (cp ? "HELD" : "none") + ", Engine_Errors at C" + (C + 1) + "+ " + fired + " — " + (ok ? "C" + (C + 1) + " not fired" : "NOT CLEAN"));
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e.message); process.exit(2); });' 2>&1 | grep -v "injected env"
  return ${PIPESTATUS[0]}
}
fire_state "before the push" || { echo "the next Cycle fired, a checkpoint is held, or the read failed — stop"; exit 1; }
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no pinned deploymentId in the repo .clasp.json — STOP"; exit 1; }
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep -q "$DEP" || { echo "pinned deployment $DEP not in the listing — STOP"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
VER=$( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "engine.312 = $BASE + 4 files at $SRC (fame from the paper) — bench 1004 leg R" | tail -1 | grep -o '@[0-9]*$' )
[ -n "$VER" ] || { echo "deploy printed no version — STOP, read the deployment listing by hand"; exit 1; }
served=0; for t in 1 2 3 4 5 6; do
  /root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep "$DEP" | grep -qE " ${VER}( |$)" && { served=1; break; }; sleep 10; done
[ $served = 1 ] || { echo "pinned deployment $DEP does not serve $VER after 60 s — STOP"; exit 1; }
echo "pinned deployment $DEP serves $VER"
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — PROD is not the benched stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
fire_state "after the pull-back" || { echo "STOP: live moved off Cycle $CYC across the deploy; read which version ran before anything else"; exit 3; }
echo "waiting 480 s: a fire admitted before the deploy would persist inside this window"; sleep 480
fire_state "8 minutes after" || { echo "STOP: a Cycle persisted inside the window — read which version ran before anything else"; exit 3; }
echo "$(date -Iseconds) engine.312 on PROD at $SRC ($BASE); pull-back = $MAN; live still Cycle $CYC eight minutes after the deploy" > "$OUT/push-e312-prod.DONE"
