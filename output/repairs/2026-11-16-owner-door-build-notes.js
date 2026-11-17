// Builder 2026-11-16 ("yes on both"): cut the engine.96 build note from the two C116 owner-door citizens' records, to the
// wording the fixed writer (9c3996a58) produces. Six cells: Simulation_Ledger.LifeHistory for POP-01248 / POP-01249,
// four LifeHistory_Log.EventText rows. Each found by its exact old text at write time; before/after saved; read back.
//   node output/repairs/2026-11-16-owner-door-build-notes.js [--apply]
require('/root/GodWorld/lib/env');
const fs = require('fs');
const s = require('/root/GodWorld/lib/sheets');
const APPLY = process.argv.includes('--apply');
const OUT = '/root/GodWorld/output/repairs/2026-11-16-owner-door-build-notes.json';
const colL = (i) => { let r = '', n = i + 1; while (n > 0) { const m = (n - 1) % 26; r = String.fromCharCode(65 + m) + r; n = Math.floor((n - 1) / 26); } return r; };
const NOTE = ' (engine.96 Task 12: the business is the reason; authored, not a pool draw)';
const clean = (t) => String(t).split(NOTE).join('').split(' — the business is the reason').join('').split(' (engine.96 Task 12)').join('');
(async () => {
  const plan = [];
  const led = await s.getSheetData('Simulation_Ledger'); const lh = led[0]; const iP = lh.indexOf('POPID'), iL = lh.indexOf('LifeHistory');
  led.forEach((r, i) => { if (i && /^POP-0124[89]$/.test(r[iP]) && /engine\.96|business is the reason/.test(String(r[iL]))) plan.push({ tab: 'Simulation_Ledger', row: i + 1, col: iL, key: r[iP], old: String(r[iL]), next: clean(r[iL]) }); });
  const log = await s.getSheetData('LifeHistory_Log'); const gh = log[0]; const iE = gh.indexOf('EventText');
  log.forEach((r, i) => { if (i && /engine\.96 Task 12/.test(String(r[iE]))) plan.push({ tab: 'LifeHistory_Log', row: i + 1, col: iE, key: r[gh.indexOf('POPID')] || r[1], old: String(r[iE]), next: clean(r[iE]) }); });
  plan.forEach((p) => console.log(p.tab, p.row, p.key, '\n   was:', JSON.stringify(p.old), '\n   now:', JSON.stringify(p.next)));
  if (plan.length !== 6) { console.log('expected 6 cells, found ' + plan.length + ' — stop'); process.exit(1); }
  if (plan.some((p) => /engine\.|business is the reason|pool draw/.test(p.next))) { console.log('a cleaned value still carries the note — stop'); process.exit(1); }
  if (!APPLY) { console.log('dry run, nothing written'); return; }
  fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), cells: plan }, null, 1));
  for (const p of plan) {
    const cur = (await s.getSheetData(p.tab))[p.row - 1][p.col];
    if (String(cur) !== p.old) { console.log('changed since the read — stop at', p.tab, p.row); process.exit(1); }
    await s.updateRange(`${p.tab}!${colL(p.col)}${p.row}`, [[p.next]]);
    const back = (await s.getSheetData(p.tab))[p.row - 1][p.col];
    console.log(String(back) === p.next ? 'ok' : 'READ-BACK MISMATCH', p.tab, p.row, p.key);
    if (String(back) !== p.next) process.exit(1);
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log('before/after saved: ' + OUT);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
