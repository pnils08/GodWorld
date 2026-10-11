#!/bin/bash
# engine.203d isolated PROD push (builder runs: ! bash output/engine-sheet/push-203d-prod.sh)
# Stage = fresh PROD pull (63754ca8, no drift at 03:40) + applySportsSeason.js, sportsWeekRecord.js,
# generateCitizensEvents.js (whole file, HEAD e34c8b19) + engine94SheetContract.js (PROD + one seed row).
set -euo pipefail
SP=/tmp/claude-0/-root-GodWorld/72de0808-a2ce-436f-9058-6a090cfbc310/scratchpad
ST=/tmp/claude-0/-root-GodWorld/72de0808-a2ce-436f-9058-6a090cfbc310/scratchpad/stage203d.vmvb
P3=$(mktemp -d $SP/prodcheck.XXXX)
( cd $P3 && printf '{"scriptId":"1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5","rootDir":""}' > .clasp.json && /root/GodWorld/node_modules/.bin/clasp pull >/dev/null )
if diff -rq $SP/prodpull $P3 | grep -v clasp.json; then echo "PROD drifted since the stage pull — stop"; exit 1; fi
PS=$(mktemp -d $SP/prodstage.XXXX)
( cd $ST && tar cf - --exclude=.clasp.json . ) | ( cd $PS && tar xf - )
N=$(diff -rq $SP/prodpull $PS | grep -vc clasp.json || true); echo "delta files: $N (expect 4)"; [ "$N" = 4 ] || exit 1
cd $PS && printf '{"scriptId":"1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5","rootDir":""}' > .clasp.json
CLAUDE_CTL=1 /root/GodWorld/node_modules/.bin/clasp push --force | tail -1
PB=$(mktemp -d $SP/pullback.XXXX)
( cd $PB && printf '{"scriptId":"1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5","rootDir":""}' > .clasp.json && /root/GodWorld/node_modules/.bin/clasp pull >/dev/null )
if diff -rq $PS $PB | grep -v clasp.json; then echo "PULL-BACK MISMATCH"; exit 1; fi
echo "pull-back $(find $PB -name '*.js' | wc -l) js + manifest byte-identical to the stage"
