#!/bin/bash
# engine.350 bench push: SANDBOX 1004 script project = stage 55 = stage 54 (PROD @189, manifest stage54-e350.sha256)
# + three files at <commit> (a coming-of-age line is not a graduation; the `employer` content condition).
# The tree is built from a pull of PROD, which must be exactly stage 54; each of the three files on PROD must be
# the repo copy at the stage-54 commit, and <commit> must change no other engine file.
# Copied from 2026-11-17-push-e347b-bench.sh.
#   bash output/research-build/2026-11-18-push-e350b-bench.sh <commit> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/research-build
S53=$OUT/stage54-e350.sha256; MAN=$OUT/stage55-e350b.sha256
BASE=0c85bcd03
FILES="phase02-world-state/loadEventContentLedger.js phase04-events/generationalEventsEngine.js phase05-citizens/generateCitizensEvents.js"
SRC=${1:?commit}; DRY=${2:-}
[ "$(git diff --name-only "$BASE" "$SRC" -- 'phase*' utilities appsscript.json | sort | tr '\n' ' ')" = "$(echo $FILES | tr ' ' '\n' | sort | tr '\n' ' ')" ] \
  || { echo "$SRC changes a different set of engine files than the three — stop"; git diff --name-only "$BASE" "$SRC" -- 'phase*' utilities appsscript.json; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S53" >/dev/null || { echo "PROD pull is not stage 54 — stop"; exit 1; }
echo "PROD pull = stage 54"
for f in $FILES; do
  git show "$BASE:$f" | sha256sum | cut -d' ' -f1 | grep -q "$(sha256sum "$W/stage/$f" | cut -d' ' -f1)" \
    || { echo "$f on PROD is not the repo copy at $BASE — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
  node --check "$W/stage/$f" || { echo "$f does not parse — stop"; exit 1; }
done
G() { grep -q -- "$1" "$W/stage/$2" || { echo "staged $2 lacks: $1 — stop"; exit 1; }; }
G() { grep -q -- "$1" "$W/stage/$2" || { echo "staged $2 lacks: $1 — stop"; exit 1; }; }
G "if (hasGraduated_(lifeHistory)) return null;" phase04-events/generationalEventsEngine.js
G "employer:     { kind: 'str' }," phase02-world-state/loadEventContentLedger.js
G 'var iEmployerBizCond = idx("EmployerBizId");' phase05-citizens/generateCitizensEvents.js
tree "$W/stage" > "$MAN"
PAT=$(echo $FILES | sed 's/ /$|/g')'$'
grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S53") >/dev/null || { echo "differs from stage 54 outside the three files — stop"; exit 1; }
[ "$(wc -l < "$MAN")" = "$(wc -l < "$S53")" ] || { echo "file count differs from stage 54 — stop"; exit 1; }
[ "$(diff <(cut -d' ' -f1 "$MAN") <(cut -d' ' -f1 "$S53") | grep -c '^<')" = "3" ] || { echo "not exactly three files differ from stage 54 — stop"; exit 1; }
DESC="stage 55: stage 54 + engine.350 a coming-of-age line is not a graduation; the employer content condition (3 files) at $SRC"
echo "$DESC; 3 files changed; manifest $MAN"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > "$W/stage/.clasp.json"
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "bench 1004 = $DESC" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back byte-identical to $(basename "$MAN")"
