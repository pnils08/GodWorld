// Builder 2026-10-19 (engine.304 statement 16, "fix to get bio"): POP-00057 Rachel Torres — CitizenBio says
// "divorced, no children"; NumChildren 1 with no ChildrenIds left an open child spot for the family lottery.
// NumChildren 1 → 0 on the LIVE ledger, one cell, backup + read back. Dry run unless --apply.
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
const fs = require('fs');
(async () => {
  const sl = await sheets.getSheetData('Simulation_Ledger'); const H = sl[0]; const S = n => H.indexOf(n);
  const i = sl.findIndex(r => r[S('POPID')] === 'POP-00057');
  if (i < 1) throw new Error('POP-00057 not found');
  const r = sl[i];
  console.log(['POPID','First','Last','Tier','Status','BirthYear','MaritalStatus','SpouseId','NumChildren','ChildrenIds','CitizenBio'].map(n => n + '=' + r[S(n)]).join(' | '));
  if (r[S('First')] !== 'Rachel' || r[S('Last')] !== 'Torres') throw new Error('name mismatch — stop');
  if (String(r[S('NumChildren')]) !== '1' || String(r[S('ChildrenIds')] || '').match(/POP-/)) throw new Error('state is not NumChildren 1 / no ChildrenIds — stop');
  if (!process.argv.includes('--apply')) { console.log('dry run'); return; }
  const backup = '/root/GodWorld/output/engine-sheet/2026-10-19-rachel-torres-numchildren-backup.json';
  fs.writeFileSync(backup, JSON.stringify({ row: i + 1, col: sheets.columnIndexToLetter ? sheets.columnIndexToLetter(S('NumChildren')) : S('NumChildren'), before: r[S('NumChildren')] }));
  await sheets.updateCell('Simulation_Ledger', i + 1, 'NumChildren', 0);
  const back = (await sheets.getSheetData('Simulation_Ledger'))[i];
  console.log('read back NumChildren =', back[S('NumChildren')], back[S('POPID')], '| backup', backup);
  if (String(back[S('NumChildren')]) !== '0') process.exit(2);
})().catch(e => { console.error(e.message); process.exit(1); });
