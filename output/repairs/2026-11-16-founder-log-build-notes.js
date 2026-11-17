// Builder 2026-11-16 (clean build logic out of citizens' records): six C107 LifeHistory_Log.EventText rows for founders
// minted by hand carry "— builder-authored, closes the Owner's Draw / engine.178 resolution gap (…)" (and one a sheet-cell
// naming note). Their ledger rows were cut 2026-11-15 (9c3996a58); these log rows were not. Each row found by its exact old
// text at write time; before/after saved; read back.   node output/repairs/2026-11-16-founder-log-build-notes.js [--apply]
require('/root/GodWorld/lib/env');
const fs = require('fs');
const s = require('/root/GodWorld/lib/sheets');
const APPLY = process.argv.includes('--apply');
const OUT = '/root/GodWorld/output/repairs/2026-11-16-founder-log-build-notes.json';
const colL = (i) => { let r = '', n = i + 1; while (n > 0) { const m = (n - 1) % 26; r = String.fromCharCode(65 + m) + r; n = Math.floor((n - 1) / 26); } return r; };
(async () => {
  const d = await s.getSheetData('LifeHistory_Log'); const h = d[0], iE = h.indexOf('EventText');
  const plan = [];
  d.forEach((r, i) => { const t = String(r[iE]); if (i && / — builder-authored, /.test(t)) plan.push({ row: i + 1, pop: r[h.indexOf('POPID')], old: t, next: t.slice(0, t.indexOf(' — builder-authored, ')) }); });
  plan.forEach((p) => console.log(p.row, p.pop, '->', JSON.stringify(p.next)));
  if (plan.length !== 6 || plan.some((p) => /builder|engine\.|Business_Ledger cell/.test(p.next))) { console.log('unexpected plan — stop'); process.exit(1); }
  if (!APPLY) { console.log('dry run'); return; }
  fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), rows: plan }, null, 1));
  for (const p of plan) {
    const cur = (await s.getSheetData('LifeHistory_Log'))[p.row - 1][iE];
    if (String(cur) !== p.old) { console.log('changed since the read — stop at', p.row); process.exit(1); }
    await s.updateRange(`LifeHistory_Log!${colL(iE)}${p.row}`, [[p.next]]);
    const back = (await s.getSheetData('LifeHistory_Log'))[p.row - 1][iE];
    console.log(String(back) === p.next ? 'ok' : 'READ-BACK MISMATCH', p.row, p.pop); if (String(back) !== p.next) process.exit(1);
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.log('saved ' + OUT);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
