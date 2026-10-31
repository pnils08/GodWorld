#!/bin/bash
# engine.316 PROD push (stage 34): PROD (stage 33, @169) + phase05-citizens/runNeighborhoodEngine.js at <commit> (signed drift
# lines for the five hoods with none one way or both), which must equal the benched stage byte for byte (<manifest>:
# stage34-e316.sha256, bench 1004). Copied from 2026-10-30-push-e317-prod.sh: the door now reads PROD's fire record before
# the push as well as after. Live fire-state gate at <cycle> = the live Cycle now, right before the push, after the pull-back,
# 8 and 16 minutes later; reads bound to the sheet the pulled PROD code aims at (DEFAULT_SIM_SSID).
#   bash output/engine-sheet/2026-10-30-push-e316-prod.sh <commit> <manifest> <cycle> [--dry-run]
set -euo pipefail
cd /root/GodWorld
SRC=${1:?commit}; MAN=${2:?manifest}; CYC=${3:?live cycle}; DRY=${4:-}
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
OUT=/root/GodWorld/output/engine-sheet
F316="phase05-citizens/runNeighborhoodEngine.js"
[[ "$CYC" =~ ^[0-9]+$ ]] && [ "$CYC" -ge 113 ] || { echo "cycle must be the live Cycle (>= 113) — stop"; exit 1; }
[ "$(realpath "$MAN")" = "$OUT/stage34-e316.sha256" ] || { echo "manifest must be the benched stage34-e316.sha256 — stop"; exit 1; }
door() {   # door <when> — PROD still has no fire key, and its fire record through the read-only door of the PINNED
           # deployment is valid (HTTP 200, writer shape, clock bound), Cycle $CYC done, and byte-identical to the first read
  local n; n=$(DOOR_EXPECT_DEP="$DEP" node $OUT/2026-10-30-e317-door.js prod-nofire 2>&1 | grep -v "injected env")
  echo "fire key $1: $n"; echo "$n" | grep -q '"noFireKey":true' || return 1
  local j; j=$(DOOR_EXPECT_DEP="$DEP" DOOR_EXPECT_CYCLE="$CYC" node $OUT/2026-10-30-e317-door.js prod 2>&1 | grep -v "injected env")
  echo "fire record $1: $j"
  echo "$j" | grep -q '"valid":true' || return 1
  echo "$j" | grep -q '"expectOk":true' || return 1   # typed top-level cycle + state (re-review F2), not a text search
  [ -f "$W/door" ] || echo "$j" > "$W/door"      # the whole line: same record => same line
  [ "$j" = "$(cat "$W/door")" ] || return 1
}
git ls-files --error-unmatch "$MAN" >/dev/null 2>&1 && git diff --quiet HEAD -- "$MAN" || { echo "manifest $MAN is not committed as-is — stop"; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
TREE=$( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum )
LIVE_ID=$(grep -o "DEFAULT_SIM_SSID = '[^']*'" "$W/stage/utilities/utilityFunctions.js" | cut -d"'" -f2)
[ ${#LIVE_ID} -gt 20 ] || { echo "no DEFAULT_SIM_SSID in the PROD pull — stop"; exit 1; }
diff -q <(echo "$TREE") "$OUT/stage33-e317.sha256" >/dev/null && BASE="stage 33" || { echo "PROD is not stage 33 — drifted; stop"; exit 1; }
echo "fresh PROD pull = $BASE"
for f in $F316; do git show "$SRC:$f" > "$W/stage/$f"; done
( cd "$W/stage" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "built stage does not match the benched manifest $MAN — stop"; exit 1; }
echo "stage = the benched tree ($MAN), byte for byte"
fire_state() {   # fire_state <when> — exit 0 only when live reads Cycle $CYC everywhere, no checkpoint, no error stamped past it,
                 # Advancement_Intake1 identical to the first read ($W/q) and the ledger row count unchanged
  WHEN="$1" CYC="$CYC" LIVE_ID="$LIVE_ID" Q_FILE="$W/q" node -e '
require("/root/GodWorld/lib/env");
const L = process.env.GODWORLD_SHEET_ID, C = Number(process.env.CYC), P = process.env.LIVE_ID;
if (!L || L !== P) { console.error("env sheet " + (L ? L.slice(0, 6) + "…" : "(none)") + " is not the sheet the PROD code aims at — stop"); process.exit(2); }
if (P === "1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA" || P === "1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA") process.exit(2);
process.env.GODWORLD_SHEET_ID = P;
const sh = require("/root/GodWorld/lib/sheets"), fs = require("fs"), num = v => Number(String(v).replace(/^C/, ""));
const hash = x => require("crypto").createHash("sha256").update(JSON.stringify(x)).digest("hex");
(async () => {
  const wc = await sh.getSheetData("World_Config"), cc = num((wc.find(r => String(r[0]).trim() === "cycleCount") || [])[1]);
  const nm = await sh.getSheetData("Neighborhood_Map"), iN = nm[0].indexOf("Neighborhood"), iC = nm[0].indexOf("Cycle");
  const nmc = [...new Set(nm.slice(1).filter(r => r[iN]).map(r => num(r[iC])))];
  const rd = await sh.getSheetData("Riley_Digest"), rl = num(rd[rd.length - 1][rd[0].indexOf("Cycle")]);
  const ee = await sh.getSheetData("Engine_Errors"), iEC = ee[0].indexOf("Cycle");
  const fired = ee.slice(1).filter(r => num(r[iEC]) >= C + 1).length;
  let cp = ""; try { const c = await sh.getSheetData("_CycleCheckpoint"); cp = c && c[0] ? String(c[0][0] || "") : ""; } catch (e) { if (!/Unable to parse range|not found/i.test(e.message)) throw e; cp = ""; }
  const q = await sh.getSheetData("Advancement_Intake1"), led = await sh.getSheetData("Simulation_Ledger");
  // codex engine.319 recheck §4: an empty read is not a stable one — both tabs must read with their headers and rows
  const qh = q[0] || [], lh = led[0] || [];
  const readOk = ["First", "Last", "ClockMode"].every(c => qh.indexOf(c) >= 0) && ["POPID", "First", "Last", "ClockMode"].every(c => lh.indexOf(c) >= 0) && led.length > 1000;
  if (!readOk) { console.error("Advancement_Intake1 or Simulation_Ledger read without its header or rows (ledger " + (led.length - 1) + ") — stop"); process.exit(2); }
  // cycleCount / map / Riley / checkpoint / errors certify no Cycle ran; the queue + ledger stop (from engine.320) is kept as
  // a stop on any intake run across the window.
  const now = { q: hash(q), qRows: q.length - 1, ledgerRows: led.length - 1 };
  if (!fs.existsSync(process.env.Q_FILE)) fs.writeFileSync(process.env.Q_FILE, JSON.stringify(now));
  const first = JSON.parse(fs.readFileSync(process.env.Q_FILE, "utf8"));
  const queueSame = now.q === first.q && now.ledgerRows === first.ledgerRows;
  const ok = cc === C && iN >= 0 && iC >= 0 && nmc.length === 1 && nmc[0] === C && rl === C && cp === "" && iEC >= 0 && fired === 0 && queueSame;
  console.log("live fire state " + process.env.WHEN + ": cycleCount " + cc + ", Neighborhood_Map " + JSON.stringify(nmc) + ", Riley last " + rl + ", checkpoint " + (cp ? "HELD" : "none") + ", Engine_Errors at C" + (C + 1) + "+ " + fired + ", intake queue " + now.qRows + " rows " + (now.q === first.q ? "identical" : "MOVED") + ", ledger rows " + now.ledgerRows + " (first read " + first.ledgerRows + ") — " + (ok ? "C" + (C + 1) + " not fired, queue still" : "NOT CLEAN"));
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e.message); process.exit(2); });' 2>&1 | grep -v "injected env"; return ${PIPESTATUS[0]}
}
node -e 'require("/root/GodWorld/lib/env"); process.exit(process.env.ADMISSION_READ_TOKEN ? 0 : 1)' 2>/dev/null \
  || { echo "ADMISSION_READ_TOKEN is not in the env — the builder sets it (PROD Script Properties + the env) before this push; stop"; exit 1; }
fire_state "before the push" || { echo "the next Cycle fired, a checkpoint is held, the queue or ledger moved, or a read failed — stop"; exit 1; }
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push ($W/stage)"; exit 0; fi
DEP=$(grep -o '"deploymentId": "[^"]*"' /root/GodWorld/.clasp.json | cut -d'"' -f4)
[ -n "$DEP" ] || { echo "no pinned deploymentId in the repo .clasp.json — STOP"; exit 1; }
/root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep -q "$DEP" || { echo "pinned deployment $DEP not in the listing — STOP"; exit 1; }
N0=$(DOOR_EXPECT_DEP="$DEP" node $OUT/2026-10-30-e317-door.js prod-nofire 2>&1 | grep -v "injected env"); echo "fire key before the push: $N0"
echo "$N0" | grep -q '"noFireKey":true' || { echo "PROD answers with a fire key, or the door's deployment is not the pinned one — STOP"; exit 1; }
door "before the push" || { echo "PROD's fire record through the door is not a valid Cycle $CYC done record — STOP"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
VER=$( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$DEP" -d "engine.316 = $BASE + runNeighborhoodEngine.js at $SRC (the five hoods hold a line each way) — bench 1004" | tail -1 | grep -o '@[0-9]*$' )
[ -n "$VER" ] || { echo "deploy printed no version — STOP, read the deployment listing by hand"; exit 1; }
served=0; for t in 1 2 3 4 5 6; do
  /root/GodWorld/node_modules/.bin/clasp-real deployments 2>/dev/null | grep "$DEP" | grep -qE " ${VER}( |$)" && { served=1; break; }; sleep 10; done
[ $served = 1 ] || { echo "pinned deployment $DEP does not serve $VER after 60 s — STOP"; exit 1; }
echo "pinned deployment $DEP serves $VER"
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
( cd "$W/pullback" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ) | diff -q - "$MAN" >/dev/null \
  || { echo "PULL-BACK MISMATCH — PROD is not the benched stage"; exit 1; }
echo "pull-back $(find "$W/pullback" -name '*.js' | wc -l) js + manifest byte-identical to $MAN"
fire_state "after the pull-back" || { echo "STOP: live moved off Cycle $CYC, or the queue / ledger moved, across the deploy; read which version ran before anything else"; exit 3; }
echo "waiting 300 s: /exec serves the old version for minutes after a cut (2026-10-30, @169)"; sleep 300
door "after the pull-back" || { echo "STOP: PROD's fire record through the door is not a valid Cycle $CYC done record — read it before anything else"; exit 3; }
echo "waiting 480 s: a fire or intake run admitted before the deploy would persist inside this window"; sleep 480
fire_state "8 minutes after" || { echo "STOP: a Cycle or an intake run persisted inside the window — read which version ran before anything else"; exit 3; }
door "8 minutes after" || { echo "STOP: PROD's fire record moved inside the window — a Cycle was admitted"; exit 3; }
echo "waiting 480 s more: an old-version call admitted late in the /exec propagation window ends inside this one"; sleep 480
fire_state "16 minutes after" || { echo "STOP: a Cycle or an intake run persisted inside the propagation window — read which version ran before anything else"; exit 3; }
door "16 minutes after" || { echo "STOP: PROD's fire record moved inside the propagation window — a Cycle was admitted"; exit 3; }
echo "$(date -Iseconds) engine.316 on PROD at $SRC ($BASE); pull-back = $MAN; live still Cycle $CYC, queue and ledger unchanged, the fire record (read through the door) Cycle $CYC done and unchanged, sixteen minutes after the deploy" > "$OUT/push-e317-prod.DONE"
