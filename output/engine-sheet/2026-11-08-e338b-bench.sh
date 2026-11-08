#!/bin/bash
# engine.338 Tasks 2b–2d (+ Task 3's dry wake) sandbox proof on SANDBOX 1004: push stage 43 (stage 42 + the six 338b files at
# <commit>), sync from live, append the six pool rows to the bench's Economic_Parameters, then three fires: fire 1 = the
# question trigger (+ the three retirements), fire 2 = four Advancement_Intake1 rows through the whole door, fire 3 = the same
# four rows again (idempotent). Between fire 1 and fire 2 the wake runs DRY against the bench on the asked player (Acceptance 5).
# The final sync from live removes every bench row. Copied from 2026-11-07-e338a-bench.sh.
#   usage: bash output/engine-sheet/2026-11-08-e338b-bench.sh <commit>
set -uo pipefail
cd /root/GodWorld
O=output/engine-sheet; B=1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA
SP=/tmp/claude-0/-root-GodWorld/01da4ba3-fe39-4267-a36a-19c514e8819d/scratchpad
TAG=${TAG:-e338b}
SRC=${1:?commit}
q() { grep -v "injected env"; }
cc() { node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; require('/root/GodWorld/lib/sheets').getSheetData('World_Config').then(d=>console.log((d.find(r=>r[0]==='cycleCount')||[])[1]))" 2>&1 | q; }
fire() { # <label>
  local C; C=$(cc); echo "bench cycleCount $C"
  node $O/2026-10-19-benchfire.js "$C" "$1" > $SP/$TAG.$1.out 2>&1; local rc=$?
  local v; v=$(grep -o '"verdict": "[^"]*"' $SP/$TAG.$1.out | head -1)
  echo "fire C$(( C + 1 )) rc=$rc $v $(grep -o '"wallS": [0-9]*' $SP/$TAG.$1.out)"
  if [ $rc -ne 0 ] || ! echo "$v" | grep -q '"PASS"'; then echo "HALT fire"; q < $SP/$TAG.$1.out | tail -30; exit 2; fi
  node $O/2026-11-08-e338b-bench.js read "$1" $(( C + 1 )) > $SP/$TAG.$1.read 2>&1; local rr=$?
  tail -1 $SP/$TAG.$1.read
  [ $rr -eq 0 ] || { echo "HALT read"; grep -o '"name": "[^"]*",\s*"ok": false' $SP/$TAG.$1.read | head; exit 7; }
}
plant() { # <fire>
  local C; C=$(cc); local N=$(( C + 1 ))
  echo "== plant fire $1 at C$N"; node $O/2026-11-08-e338b-bench.js plant $N $1 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT plant"; exit 6; }
  node scripts/seedSandboxFeeds.js --sheet-id $B --apply 2>&1 | q | grep -E "^(Edition|Citizen|Oakland|appended|CHECK)" ; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT seed"; exit 6; }
}
AIM=$(node $O/2026-10-19-aimcheck.js 2>&1 | q); echo "$AIM" | tail -1
echo "$AIM" | grep -q "^AIM = BENCH" || { echo "HALT aim not proven"; exit 5; }
echo "== push stage 43"; bash $O/2026-11-08-push-e338b-bench.sh "$SRC" $O/stage43-e338b.sha256 || { echo "HALT push"; exit 4; }
echo "== sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/$TAG.sync.out 2>&1 || { echo "HALT sync"; tail -20 $SP/$TAG.sync.out; exit 3; }
tail -2 $SP/$TAG.sync.out | q
echo "== Economic_Parameters on the bench: append the six pool rows (JSON -> tab, append-only)"
node scripts/syncEconomicParameters.js --sheet-id $B 2>&1 | q | tail -2
node scripts/syncEconomicParameters.js --check --sheet-id $B 2>&1 | q | grep -q "matches JSON\|missing 0 " || { echo "HALT bench catalog not in sync"; exit 3; }
node $O/2026-11-05-e330-bench.js guard0 2>&1 | q; [ ${PIPESTATUS[0]} -eq 0 ] || { echo "HALT guard/cycleCount format"; exit 3; }
D=$(node $O/2026-10-30-e317-door.js bench 2>&1 | q | tail -1); echo "door: $D"
RC=$(echo "$D" | grep -o '"record":{"cycle":[0-9]*' | grep -o '[0-9]*$')
[ -n "$RC" ] && echo "clearfire $RC: $(node $O/2026-10-19-benchclear.js $RC 2>&1 | q)"
echo "clearcheckpoint: $(node $O/2026-11-05-e330-bench.js clearcp 2>&1 | q)"
plant 1; fire $TAG-f1
echo "== Task 3 dry wake against the bench on the asked player (writes nothing; two model calls)"
C=$(cc)
node -e "require('/root/GodWorld/lib/env'); process.env.GODWORLD_SHEET_ID='$B'; process.argv=['node','citizen-wake.js','--dry-run','--wake=evening','--cycle=$C','--pop=POP-99338']; require('/root/GodWorld/scripts/citizen-wake.js');" > $SP/$TAG.wake.out 2>&1
echo "wake rc=$? — lines of note:"; grep -E "woke |owed |next-chapter|MOVE|provocation=question|dry-run\] would" $SP/$TAG.wake.out | q | cut -c1-240 | head -14
grep -q "next-chapter: POP-99338 answered" $SP/$TAG.wake.out || echo "HOLD: the dry wake did not carry the question (see $SP/$TAG.wake.out)"
plant 2; fire $TAG-f2
plant 3; fire $TAG-f3
echo "== final sync from live"; node scripts/syncSandboxFromLive.js $B --apply > $SP/$TAG.sync.final.out 2>&1 || echo "HOLD final sync failed"
tail -2 $SP/$TAG.sync.final.out | q
echo "engine.338b bench done"
