#!/bin/bash
# engine.349 Task 14 bench push: SANDBOX 1004 script project = stage 58 = stage 57 (PROD, manifest stage57-e350d.sha256)
# + thirteen files at <commit> (the middle counts: every reader of a dial band reads the number).
# The tree is built from a pull of PROD, which must be exactly stage 57; each of the thirteen files on PROD must be
# the repo copy at the stage-57 commit, and <commit> must change no other engine file.
# Copied from 2026-11-18-push-e350d-bench.sh.
#   bash output/research-build/2026-11-18-push-e349m-bench.sh <commit> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/research-build
S53=$OUT/stage57-e350d.sha256; MAN=$OUT/stage58-e349m.sha256
BASE=5c0c090bd
FILES="phase02-world-state/loadEventContentLedger.js phase04-events/generationalEventsEngine.js phase05-citizens/applyBusinessDynamics.js phase05-citizens/bondEngine.js phase05-citizens/casinoLedgerEngine.js phase05-citizens/generateCitizensEvents.js phase05-citizens/generationalWealthEngine.js phase05-citizens/migrationTrackingEngine.js phase05-citizens/runCareerEngine.js phase05-citizens/runConductEngine.js phase05-citizens/updateCivicApprovalRatings.js utilities/citizenMemory.js utilities/compressLifeHistory.js"
SRC=${1:?commit}; DRY=${2:-}
# OTHERS: engine files another lane has committed since stage 57 and not yet shipped. They are NOT in this stage
# (the tree is PROD's pull plus the thirteen); named here so a fourteenth file of this job cannot slip by unseen.
OTHERS="phase05-citizens/civicInitiativeEngine.js"   # engine-sheet, civic.49 (f99ad848a), waiting on this bench
[ "$(git diff --name-only "$BASE" "$SRC" -- 'phase*' utilities appsscript.json | grep -vxF "$OTHERS" | sort | tr '\n' ' ')" = "$(echo $FILES | tr ' ' '\n' | sort | tr '\n' ' ')" ] \
  || { echo "$SRC changes a different set of engine files than the thirteen — stop"; git diff --name-only "$BASE" "$SRC" -- 'phase*' utilities appsscript.json; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S53" >/dev/null || { echo "PROD pull is not stage 57 — stop"; exit 1; }
echo "PROD pull = stage 57"
for f in $FILES; do
  git show "$BASE:$f" | sha256sum | cut -d' ' -f1 | grep -q "$(sha256sum "$W/stage/$f" | cut -d' ' -f1)" \
    || { echo "$f on PROD is not the repo copy at $BASE — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
  node --check "$W/stage/$f" || { echo "$f does not parse — stop"; exit 1; }
done
G() { grep -q -- "$1" "$W/stage/$2" || { echo "staged $2 lacks: $1 — stop"; exit 1; }; }
G() { grep -q -- "$1" "$W/stage/$2" || { echo "staged $2 lacks: $1 — stop"; exit 1; }; }
G 'function dialLadder_(v, table) {' utilities/citizenMemory.js
G 'crimeReach: Math.max(dialLow_(current.integrity, 2),' utilities/compressLifeHistory.js
G 'var CONDUCT_SLIP_P_ = ' phase05-citizens/runConductEngine.js
G 'function bondDialPos_(ctx, popId, dial) {' phase05-citizens/bondEngine.js
G 'function bizOwnerDials_(ctx, keyPersonnelCell) {' phase05-citizens/applyBusinessDynamics.js
G 'var CASINO_DRIVE_F_ = ' phase05-citizens/casinoLedgerEngine.js
G 'function holderIntegrityPos_(ctx, holderName) {' phase05-citizens/updateCivicApprovalRatings.js
G 'var rigid = headBands ? dialLow_(headBands.current.openness, 2) : 0;' phase05-citizens/migrationTrackingEngine.js
G 'var burnout = hb ? dialLow_(hb.current.composure, 2) : 0;' phase04-events/generationalEventsEngine.js
G 'var overworkP = (dialBands && iLife >= 0)' phase05-citizens/runCareerEngine.js
G 'gb.pos.drive : 0, integrity: gb ? gb.pos.integrity : 0' phase05-citizens/generationalWealthEngine.js
G 'function contentDialShare_(terms, scopes) {' phase05-citizens/generateCitizensEvents.js
G "numTerm.soft = true;" phase02-world-state/loadEventContentLedger.js
if grep -n "\.bands\b\|crimeReachable\b" $(for f in $FILES; do echo "$W/stage/$f"; done) | grep -v "^[^:]*:[0-9]*: *//\|^[^:]*:[0-9]*: *\*\|contract, same shape as engine.31"; then echo "a staged file still reads a band — stop"; exit 1; fi
tree "$W/stage" > "$MAN"
PAT=$(echo $FILES | sed 's/ /$|/g')'$'
grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S53") >/dev/null || { echo "differs from stage 57 outside the thirteen files — stop"; exit 1; }
[ "$(wc -l < "$MAN")" = "$(wc -l < "$S53")" ] || { echo "file count differs from stage 57 — stop"; exit 1; }
[ "$(diff <(cut -d' ' -f1 "$MAN") <(cut -d' ' -f1 "$S53") | grep -c '^<')" = "13" ] || { echo "not exactly thirteen files differ from stage 57 — stop"; exit 1; }
DESC="stage 58: stage 57 + engine.349 Task 14 the middle counts (13 files) at $SRC"
echo "$DESC; 13 files changed; manifest $MAN"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > "$W/stage/.clasp.json"
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "bench 1004 = $DESC" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back byte-identical to $(basename "$MAN")"
