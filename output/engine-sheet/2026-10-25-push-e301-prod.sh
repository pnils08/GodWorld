#!/bin/bash
# engine.301 F1 PROD push (stage 26): PROD (stage 25, @162, manifest stage24-e315-G3.sha256) + applyCityDynamics.js + finalizeCycleState.js at
# <commit> (the crime level published on success, the wave carried), which must equal the benched stage byte for byte (<manifest>:
# stage26-e301.sha256, bench 1004 legs P + S). Same live fire-state gate as stages 24 / 25: cycleCount / every Neighborhood_Map Cycle /
# Riley_Digest last Cycle = 112 and no _CycleCheckpoint right before the push, right after the pull-back and 8 minutes later. Copied from
# 2026-10-25-push-e315-prod.sh.
#   bash output/engine-sheet/2026-10-25-push-e301-prod.sh <commit> <manifest> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=$1; MAN=$2; DRY=${3:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet
PRE=e3266c44^   # stage 25 copies of the two files
FILES="phase02-world-state/applyCityDynamics.js phase09-digest/finalizeCycleState.js"
[ -f "$MAN" ] || { echo "no benched manifest $MAN — stop"; exit 1; }
[ "$(realpath "$MAN")" = "$OUT/stage26-e301.sha256" ] || { echo "manifest must be the benched stage26-e301.sha256 — stop"; exit 1; }
git ls-files --error-unmatch "$MAN" >/dev/null 2>&1 && git diff --quiet HEAD -- "$MAN" || { echo "manifest $MAN is not committed as-is — stop"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$OUT/stage24-e315-G3.sha256" >/dev/null \
  || { echo "PROD drifted from stage 25 since the bench — stop"; exit 1; }
echo "fresh PROD pull = stage 25 (no drift)"
for f in $FILES; do
  git show "$PRE:$f" | cmp -s - "$W/stage/$f" || { echo "$f on PROD is not the stage-25 copy — stop"; exit 1; }
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
  // codex gate 3: an admitted C113 that failed or never persisted its counter leaves its footprint here — a Phase1-FireGuard /
  // Phase11-FireGuardClose row or a phase error stamped Cycle >= 113 (godWorldEngine2.js:343-345,376-438; logEngineError_ is
  // best effort). FIRE_ADMISSION_JSON itself has no read door from outside the script (webTrigger getprop is whitelisted to the
  // carry-forward keys; a GET fires a Cycle), so this is the typed sheet-side proxy, read at all three points.
  const ee = await sh.getSheetData("Engine_Errors"), iEC = ee[0].indexOf("Cycle"), iEP = ee[0].indexOf("Phase");
  const fired = ee.slice(1).filter(r => num(r[iEC]) >= 113).length;   // any row stamped C113+, FireGuard or phase
  let cp = ""; try { const c = await sh.getSheetData("_CycleCheckpoint"); cp = c && c[0] ? String(c[0][0] || "") : ""; } catch (e) { if (!/Unable to parse range|not found/i.test(e.message)) throw e; cp = ""; } // no tab = no checkpoint; any other failure is not clean
  const ok = cc === 112 && iN >= 0 && iC >= 0 && nmc.length === 1 && nmc[0] === 112 && rl === 112 && cp === "" && iEC >= 0 && fired === 0;
  console.log("live fire state " + process.env.WHEN + ": cycleCount " + cc + ", Neighborhood_Map " + JSON.stringify(nmc) + ", Riley last " + rl + ", checkpoint " + (cp ? "HELD" : "none") + ", Engine_Errors at C113+ " + fired + " — " + (ok ? "C113 not fired" : "NOT CLEAN"));
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
VER=$( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "engine.301 F1 = stage 25 + 2 files at $SRC (crime carry reaches citizens; back-to-back rise = wave) — bench 1004 legs P + S" | tail -1 | grep -o '@[0-9]*$' )
[ -n "$VER" ] || { echo "deploy printed no version — STOP, read the deployment listing by hand"; exit 1; }
served=0; for t in 1 2 3 4 5 6; do   # the listing lags the deploy by seconds (stage 22 push stopped on it)
  /root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep "$DEP" | grep -qE " ${VER}( |$)" && { served=1; break; }; sleep 10; done
[ $served = 1 ] || { echo "pinned deployment $DEP does not serve $VER after 60 s — STOP"; exit 1; }
echo "pinned deployment $DEP serves $VER"
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — PROD is not the benched stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
fire_state "after the pull-back" || { echo "STOP: live moved off Cycle 112 across the deploy — C113 straddled it; read which version ran before anything else"; exit 3; }
echo "waiting 480 s: a fire admitted before the deploy would persist inside this window"; sleep 480
fire_state "8 minutes after" || { echo "STOP: C113 persisted inside the window — it may have run stage 25; read which version ran before anything else"; exit 3; }
echo "$(date -Iseconds) engine.301 F1 on PROD at $SRC; pull-back = $MAN; live still Cycle 112 eight minutes after the deploy" > "$OUT/push-e301-prod.DONE"
