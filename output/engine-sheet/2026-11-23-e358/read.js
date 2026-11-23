// engine.358 bench read: the run record for Cycle <C> on SANDBOX 1004, read the way Step 3.5 reads it.
// usage: node read.js <C> [expectRows]   exit 0 = PASS
require('/root/GodWorld/lib/env');
process.env.GODWORLD_SHEET_ID = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
const sheets = require('/root/GodWorld/lib/sheets');
const f = require('/root/GodWorld/scripts/fetchExecutionLog');
const C = Number(process.argv[2]);
(async () => {
  const data = await sheets.getSheetData('Engine_Run_Log');
  const rows = (data || []).slice(1);
  const recs = f.recordsFromRows(rows);
  const mine = recs.filter(r => Number(r.cycle) === C);
  const rec = f.pickRecord(recs, C);
  const out = { rowsTotal: rows.length, recordsTotal: recs.length, recordsForCycle: mine.map(r => ({ state: r.state, lifecycle: r.lifecycle, start: r.runStartedAt })) };
  if (!rec) { console.log(JSON.stringify(Object.assign(out, { verdict: 'NO DONE RECORD' }), null, 1)); process.exit(1); }
  const txt = f.renderRecord(rec), s = f.summarize(txt);
  const has = re => rec.log.some(l => re.test(l));
  const checks = {
    cellsTilde: rows.every(r => String(r[6] || '').charAt(0) === '~'),
    parts: rows.filter(r => String(r[0]).replace('~', '') === String(C)).length,
    phases: s.phases, failedPhases: s.failedPhases, totalMs: s.totalMs, wallMs: rec.wallMs,
    gate: /Execution started/.test(txt) && /Cycle completed\./.test(txt) && s.failedPhases.length === 0 && s.phases > 100,
    logLines: rec.log.length, recordChars: JSON.stringify(rec).length,
    noTimingInLog: !rec.log.some(l => /"totalMs"|PHASE_TIMING|Cycle completed\./.test(l)),
    compressLine: has(/compressLifeHistory_/), promotionsLine: has(/checkForPromotions_|applyTierLadderState_/), familyLine: has(/checkFamilyMatchPromotions_/),
    engineErrors: rec.engineErrors, rngDraws: rec.rngDraws, state: rec.state, lifecycle: rec.lifecycle
  };
  try {   // the engine's own web response for this fire (benchfire-raw) carries the same timing payload
    const raw = JSON.parse(require('fs').readFileSync('/root/GodWorld/output/engine-sheet/benchfire-raw/e358-a-c' + C + '.json', 'utf8'));
    const rt = raw.timing || (raw.resp && raw.resp.timing) || null;
    checks.timingEqualsWebResponse = rt ? JSON.stringify(rt) === JSON.stringify(rec.timing) : 'no timing in the saved response';
  } catch (e) { checks.timingEqualsWebResponse = 'raw not read: ' + e.message; }
  const pass = checks.cellsTilde && checks.gate && checks.noTimingInLog && checks.compressLine && checks.promotionsLine && rec.rngDraws > 0 && rec.engineErrors !== null && checks.timingEqualsWebResponse === true;
  require('fs').writeFileSync('/root/GodWorld/output/engine-sheet/2026-11-23-e358/bench_execution_log_c' + C + '.txt', txt);
  console.log(JSON.stringify(Object.assign(out, { checks, verdict: pass ? 'PASS' : 'FAIL' }), null, 1));
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('read ERR', e.message); process.exit(2); });
