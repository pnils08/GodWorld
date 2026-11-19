// civic.49 N1 bench fixture — SANDBOX 1004 ONLY. Modes: set | read <label> | check
//   set    : INIT-009, 011, 013 (IND-led) and INIT-015 (OPP-led control) go to vetoed, MayoralAction vetoed, OverrideVoteCycle 117, VoteCycle blank — on the BENCH tab.
//   read   : save the tracker to $OUT/<label>.json
//   check  : after the C117 fire — each fixture row took an override vote, nine seats cast (yes+no = 9); the other rows unchanged but for LastUpdated / gate columns.
require('/root/GodWorld/lib/env');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', LIVE = process.env.GODWORLD_SHEET_ID;
if (BENCH === LIVE) throw new Error('bench id equals live id — stop');
process.env.GODWORLD_SHEET_ID = BENCH;                       // after the loader: lib/env override would undo a shell prefix
const fs = require('fs'), S = require('/root/GodWorld/lib/sheets');
const OUT = '/root/GodWorld/output/engine-sheet/2026-11-19-civic49-n1';
const FIX = ['INIT-009', 'INIT-011', 'INIT-013', 'INIT-015'];
(async () => {
  const mode = process.argv[2];
  const T = await S.getSheetData('Initiative_Tracker'), h = T[0], ix = (n) => h.indexOf(n);
  const wc = await S.getSheetData('World_Config'); const cc = (wc.find((r) => r[0] === 'cycleCount') || [])[1];
  console.log('target BENCH', BENCH, 'cycleCount', cc);
  const rowNum = (id) => T.findIndex((r) => r[0] === id) + 1;
  const snap = () => Object.fromEntries(T.slice(1).map((r) => [r[0], Object.fromEntries(h.map((k, i) => [k, r[i]]))]));
  if (mode === 'read') { fs.writeFileSync(`${OUT}/${process.argv[3]}.json`, JSON.stringify(snap(), null, 1)); console.log('saved', process.argv[3]); return; }
  if (mode === 'set') {
    if (Number(cc) !== 116) throw new Error('bench cycleCount is ' + cc + ', expected 116 (a fresh sync from live) — stop');
    for (const id of FIX) {
      const row = rowNum(id), cur = T[row - 1];
      const notes = String(cur[ix('Notes')] || '').split('\n').filter((l) => !/^Cycle (113: Rejected|116: Failed)/.test(l)).join('\n');
      const f = { Status: 'vetoed', VoteCycle: '', Outcome: '', Consequences: '', Stage: 'Proposed', Notes: notes, MayoralAction: 'vetoed', OverrideVoteCycle: '117', OverrideOutcome: '' };
      console.log(id, 'row', row, JSON.stringify({ Status: cur[ix('Status')], VoteCycle: cur[ix('VoteCycle')], Lead: cur[ix('LeadFaction')] }), '->', 'vetoed, override @117');
      await S.updateRowFields('Initiative_Tracker', row, f);
    }
    return;
  }
  if (mode === 'check') {
    const before = JSON.parse(fs.readFileSync(`${OUT}/before.json`, 'utf8')), now = snap();
    let bad = 0;
    for (const id of FIX) {
      const n = String(now[id].OverrideOutcome || ''), m = n.match(/OVERRIDE (PASSED|FAILED) \((\d+)-(\d+)\)/);
      const ok = m && Number(m[2]) + Number(m[3]) === 9;
      console.log(id, now[id].LeadFaction, '| Status', now[id].Status, '| Outcome', now[id].Outcome, '| OverrideOutcome', now[id].OverrideOutcome, '|', m ? m[0] : 'NO OVERRIDE VOTE', ok ? '| nine seats ✓' : '| NOT NINE ✗');
      if (!ok) bad++;
    }
    const skip = new Set(['LastUpdated', 'Notes', 'MilestoneNotes', 'NextScheduledAction', 'NextActionCycle', 'LastWorkCycle', 'LastWorkSeat']);
    for (const id of Object.keys(before)) { if (FIX.includes(id)) continue;
      const d = Object.keys(before[id]).filter((k) => !skip.has(k) && String(before[id][k]) !== String(now[id][k]));
      console.log(id, d.length ? 'CHANGED ' + d.map((k) => `${k}: ${before[id][k]} -> ${now[id][k]}`).join('; ') : 'unchanged'); }
    process.exit(bad ? 1 : 0);
  }
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
