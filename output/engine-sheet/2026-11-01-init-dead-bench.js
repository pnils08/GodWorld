// Bench the six rejected initiatives on SANDBOX 1004. Bench sheet only; live is never written.
//   node 2026-11-01-init-dead-bench.js plant          same eight fields the live write set; INIT-013 appended from the live copy
//   node 2026-11-01-init-dead-bench.js check <label>  every tracker column of the six against the baseline, plus treasury and approval
require('/root/GodWorld/lib/env');
const fs = require('fs');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === BENCH) process.exit(9);
process.env.GODWORLD_SHEET_ID = BENCH;
const s = require('/root/GodWorld/lib/sheets');
const T = 'Initiative_Tracker';
const O = '/root/GodWorld/output/engine-sheet';
const LIVE_COPY = O + '/2026-11-01-init-008-013-before.json';
const BASE = O + '/2026-11-01-init-dead-bench-baseline.json';
const IDS = ['INIT-008', 'INIT-009', 'INIT-010', 'INIT-011', 'INIT-012', 'INIT-013'];
const OFFICES = ['MAYOR-01', 'COUNCIL-D1', 'COUNCIL-D2', 'COUNCIL-D4'];
const toA = n => { let a = ''; n++; while (n > 0) { const m = (n - 1) % 26; a = String.fromCharCode(65 + m) + a; n = (n - m - 1) / 26; } return a; };
const rowOf = (d, id) => d.findIndex(r => r[0] === id);

async function sideState() {
  const cfg = await s.getSheetData('World_Config');
  const off = await s.getSheetData('Civic_Office_Ledger');
  const oh = off[0], iId = oh.indexOf('OfficeId'), iAp = oh.indexOf('Approval');
  const approval = {};
  for (const r of off.slice(1)) if (OFFICES.includes(r[iId])) approval[r[iId]] = r[iAp];
  const tr = await s.getSheetData('City_Treasury');
  const iCp = tr[0].indexOf('Counterparty');
  return { cycleCount: (cfg.find(r => r[0] === 'cycleCount') || [])[1], approval, treasuryRows: tr.length, treasuryHits: tr.slice(1).filter(r => IDS.includes(r[iCp])).map(r => r.join('|')) };
}

async function plant() {
  const live = JSON.parse(fs.readFileSync(LIVE_COPY, 'utf8'));
  let d = await s.getSheetData(T);
  if (d[0].join('|') !== live.header.join('|')) throw new Error('bench header differs from live');
  if (rowOf(d, 'INIT-013') < 0) { await s.appendRows(T, [live.rows['INIT-013'].values]); d = await s.getSheetData(T); }
  const h = d[0], col = k => { const i = h.indexOf(k); if (i < 0) throw new Error('no col ' + k); return i; };
  for (const id of IDS) {
    const i = rowOf(d, id);
    if (i < 0) throw new Error('missing ' + id);
    const r = d[i], notes = String(r[col('Notes')] || '');
    const phase = r[col('ImplementationPhase')] === 'vote-scheduled' ? 'vote-scheduled' : 'announced';
    const set = { Status: 'failed', Outcome: 'FAILED', Consequences: 'Initiative rejected.', Notes: (notes ? notes + '\n' : '') + 'Cycle 128: Rejected.', LastUpdated: '11/01/2026', ImplementationPhase: phase, NextScheduledAction: '', NextActionCycle: '' };
    for (const [k, v] of Object.entries(set)) await s.updateRange(T + '!' + toA(col(k)) + (i + 1), [[v]]);
  }
  const after = await s.getSheetData(T);
  fs.writeFileSync(BASE, JSON.stringify({ header: after[0], rows: Object.fromEntries(IDS.map(id => [id, after[rowOf(after, id)]])), side: await sideState() }, null, 1));
  console.log('planted', IDS.length, 'rows on bench');
}

async function check(label) {
  const base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  const d = await s.getSheetData(T);
  const h = d[0], side = await sideState();
  let bad = 0;
  console.log('== ' + label + ' | bench cycle ' + side.cycleCount);
  for (const id of IDS) {
    const r = d[rowOf(d, id)], o = base.rows[id];
    const changed = h.filter((k, i) => String(o[i] ?? '') !== String(r[i] ?? '')).map(k => k + ': ' + JSON.stringify(String(o[h.indexOf(k)] ?? '').slice(-50)) + ' -> ' + JSON.stringify(String(r[h.indexOf(k)] ?? '').slice(-50)));
    if (changed.length) bad++;
    console.log(id, '|', r[h.indexOf('Status')], '|', r[h.indexOf('Outcome')], '|', r[h.indexOf('ImplementationPhase')], '| stage', r[h.indexOf('Stage')], '| changed:', changed.join('; ') || 'nothing');
  }
  const newTreasury = side.treasuryHits.filter(x => !base.side.treasuryHits.includes(x));
  console.log('treasury lines naming the six, new since plant:', newTreasury.length, newTreasury.join(' || '));
  console.log('approval at plant', JSON.stringify(base.side.approval));
  console.log('approval now     ', JSON.stringify(side.approval));
  if (newTreasury.length) bad++;
  console.log(bad ? 'DEAD CHECK FAILED: ' + bad : 'DEAD CHECK PASS');
  process.exit(bad ? 3 : 0);
}

(process.argv[2] === 'plant' ? plant() : check(process.argv[3] || 'check')).catch(e => { console.log('ERR', e.message); process.exit(1); });
