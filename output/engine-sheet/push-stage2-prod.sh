#!/bin/bash
# engine.203d isolated PROD push (builder runs: ! bash output/engine-sheet/push-stage2-prod.sh)
# Stage 2 (bench 1004 @21, C111+C112 clean) = fresh PROD pull (63754ca8, no drift at 03:40) + whole-file
# applySportsSeason.js, sportsWeekRecord.js, generateCitizensEvents.js (engine.203d), getSimHoliday.js,
# applyCompressionDigestSummary.js (Open Court Week), applyBusinessDynamics.js (engine.193 b) at e3a85853
# + engine94SheetContract.js (PROD + sportsFadeRate + bizSettleRate + bizSettleMinStaff seeds).
set -euo pipefail
SP=/tmp/claude-0/-root-GodWorld/72de0808-a2ce-436f-9058-6a090cfbc310/scratchpad
ST=/tmp/claude-0/-root-GodWorld/72de0808-a2ce-436f-9058-6a090cfbc310/scratchpad/stage2.pXXA
P3=$(mktemp -d $SP/prodcheck.XXXX)
( cd $P3 && printf '{"scriptId":"1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5","rootDir":""}' > .clasp.json && /root/GodWorld/node_modules/.bin/clasp pull >/dev/null )
if diff -rq $SP/prodpull $P3 | grep -v clasp.json; then echo "PROD drifted since the stage pull — stop"; exit 1; fi
PS=$(mktemp -d $SP/prodstage.XXXX)
( cd $ST && tar cf - --exclude=.clasp.json . ) | ( cd $PS && tar xf - )
N=$(diff -rq $SP/prodpull $PS | grep -vc clasp.json || true); echo "delta files: $N (expect 7)"; [ "$N" = 7 ] || exit 1
cd $PS && printf '{"scriptId":"1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5","rootDir":""}' > .clasp.json
CLAUDE_CTL=1 /root/GodWorld/node_modules/.bin/clasp push --force | tail -1
PB=$(mktemp -d $SP/pullback.XXXX)
( cd $PB && printf '{"scriptId":"1hL59VnByrXfWdz6EKZZQ1ss8DH1PFfDT9vVDvmjqHY_pwLyTB_N1iKW5","rootDir":""}' > .clasp.json && /root/GodWorld/node_modules/.bin/clasp pull >/dev/null )
if diff -rq $PS $PB | grep -v clasp.json; then echo "PULL-BACK MISMATCH"; exit 1; fi
echo "pull-back $(find $PB -name '*.js' | wc -l) js + manifest byte-identical to the stage"
