#!/bin/bash
# engine.350 bench push: SANDBOX 1004 script project = stage 56 = stage 55 (PROD @190, manifest stage55-e350b.sha256)
# + one file at <commit> (engine.350 Task 7: the down side of the coded pools; First Friday by what each line says; QoL graded-only).
# The tree is built from a pull of PROD, which must be exactly stage 55; the file on PROD must be
# the repo copy at the stage-55 commit, and <commit> must change no other engine file.
# Copied from 2026-11-18-push-e350b-bench.sh.
#   bash output/research-build/2026-11-18-push-e350c-bench.sh <commit> [--dry-run]
set -euo pipefail
cd /root/GodWorld
CLASP=/root/GodWorld/node_modules/.bin/clasp
PROD_ID=1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5
BENCH_ID=1gbJmGeDilxIhe25TC8SrSei89uJTEgVYgN2aOClEHHKJiykADzPVAIC2
BENCH_DEP=AKfycbxxCwKERRGb3Gk6SYg6T2nrGKf8NrKQ-pY-BOG5sdaKclEkf2jGqS3IBhgrs5IDdlmC
OUT=/root/GodWorld/output/research-build
S53=$OUT/stage55-e350b.sha256; MAN=$OUT/stage56-e350c.sha256
BASE=8252c6f57
FILES="phase05-citizens/generateCitizensEvents.js"
SRC=${1:?commit}; DRY=${2:-}
[ "$(git diff --name-only "$BASE" "$SRC" -- 'phase*' utilities appsscript.json | sort | tr '\n' ' ')" = "$(echo $FILES | tr ' ' '\n' | sort | tr '\n' ' ')" ] \
  || { echo "$SRC changes a different set of engine files than the one — stop"; git diff --name-only "$BASE" "$SRC" -- 'phase*' utilities appsscript.json; exit 1; }
W=$(mktemp -d); mkdir -p "$W/stage" "$W/pullback"
tree() { ( cd "$1" && find . -type f ! -name .clasp.json | sort | xargs sha256sum ); }
( cd "$W/stage" && printf '{"scriptId":"%s","rootDir":""}' "$PROD_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/stage" | diff -q - "$S53" >/dev/null || { echo "PROD pull is not stage 55 — stop"; exit 1; }
echo "PROD pull = stage 55"
for f in $FILES; do
  git show "$BASE:$f" | sha256sum | cut -d' ' -f1 | grep -q "$(sha256sum "$W/stage/$f" | cut -d' ' -f1)" \
    || { echo "$f on PROD is not the repo copy at $BASE — stop"; exit 1; }
  git show "$SRC:$f" > "$W/stage/$f"
  node --check "$W/stage/$f" || { echo "$f does not parse — stop"; exit 1; }
done
G() { grep -q -- "$1" "$W/stage/$2" || { echo "staged $2 lacks: $1 — stop"; exit 1; }; }
G() { grep -q -- "$1" "$W/stage/$2" || { echo "staged $2 lacks: $1 — stop"; exit 1; }; }
G 'var DOMAIN_MOMENT_MASS_LINES_ = 8;' phase05-citizens/generateCitizensEvents.js
G 'var GRADED_ONLY_KIND_ = { "Work": true, "Media": true, "QoL": true };' phase05-citizens/generateCitizensEvents.js
G 'var firstFridayLines = \[' phase05-citizens/generateCitizensEvents.js
tree "$W/stage" > "$MAN"
PAT=$(echo $FILES | sed 's/ /$|/g')'$'
grep -vE "$PAT" "$MAN" | diff -q - <(grep -vE "$PAT" "$S53") >/dev/null || { echo "differs from stage 55 outside the one file — stop"; exit 1; }
[ "$(wc -l < "$MAN")" = "$(wc -l < "$S53")" ] || { echo "file count differs from stage 55 — stop"; exit 1; }
[ "$(diff <(cut -d' ' -f1 "$MAN") <(cut -d' ' -f1 "$S53") | grep -c '^<')" = "1" ] || { echo "not exactly one file differs from stage 55 — stop"; exit 1; }
DESC="stage 56: stage 55 + engine.350 the down side of the coded pools (1 file) at $SRC"
echo "$DESC; 1 file changed; manifest $MAN"
if [ "$DRY" = "--dry-run" ]; then echo "dry run: stopping before the push"; exit 0; fi
printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > "$W/stage/.clasp.json"
grep -q "$BENCH_ID" "$W/stage/.clasp.json" || { echo "staged .clasp.json is not the bench — stop"; exit 1; }
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" push --force | tail -1 )
( cd "$W/stage" && CLAUDE_CTL=1 "$CLASP" deploy -i "$BENCH_DEP" -d "bench 1004 = $DESC" | tail -1 )
( cd "$W/pullback" && printf '{"scriptId":"%s","rootDir":""}' "$BENCH_ID" > .clasp.json && "$CLASP" pull >/dev/null )
tree "$W/pullback" | diff -q - "$MAN" >/dev/null || { echo "PULL-BACK MISMATCH — bench is not the stage"; exit 1; }
echo "pull-back byte-identical to $(basename "$MAN")"
