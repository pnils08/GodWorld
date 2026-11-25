// engine.356 (builder 2026-11-24): "first 3 are aid … Darrin Davis is a youth program - west Oakland and put a chapter
// in fruitvale as well, give them their own lines if needed … put the deed registery downtown". Live, checked, read back.
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
(async () => {
  const cp = await sheets.getSheetData('Community_Programs');
  if (cp[0][7] !== 'Place_Kind' || cp[0][3] !== 'Neighborhood' || cp[0][4] !== 'Type') throw new Error('header moved');
  const row = id => { const i = cp.findIndex(r => r[0] === id); if (i < 0) throw new Error('no ' + id); return i + 1; };
  const up = [];
  for (const id of ['PRG-010', 'PRG-014', 'PRG-015']) { const r = cp[row(id) - 1]; if (r[7] && r[7] !== 'aid') throw new Error(id + ' kind ' + r[7]); if (r[7] !== 'aid') up.push({ range: 'Community_Programs!H' + row(id), values: [['aid']] }); }
  const d = cp[row('PRG-018') - 1]; if (d[3] === 'City-wide') up.push({ range: 'Community_Programs!D' + row('PRG-018'), values: [['Downtown']] }); else if (d[3] !== 'Downtown') throw new Error('PRG-018 hood ' + d[3]);
  const dd = cp[row('PRG-033') - 1];
  if (dd[1] !== 'Darrin Davis Youth Community Events' || dd[3] !== 'West Oakland') throw new Error('PRG-033 is ' + JSON.stringify(dd));
  if (!dd[4]) up.push({ range: 'Community_Programs!E' + row('PRG-033'), values: [['youth']] });
  if (!dd[7]) up.push({ range: 'Community_Programs!H' + row('PRG-033'), values: [['youth program']] });
  if (!cp.some(r => r[0] === 'PRG-034')) {
    if (cp[cp.length - 1][0] !== 'PRG-033') throw new Error('last row is ' + cp[cp.length - 1][0]);
    const at = cp.length + 1;
    up.push({ range: 'Community_Programs!A' + at + ':H' + at, values: [['PRG-034', 'Darrin Davis Youth Community Events — Fruitvale', dd[2], 'Fruitvale', 'youth', dd[5] || '', 'active', 'youth program']] });
  }
  if (up.length) await sheets.batchUpdate(up);
  const b = await sheets.getSheetData('Community_Programs');
  console.log('written', up.length, 'rows', b.length - 1);
  b.filter(r => ['PRG-010', 'PRG-014', 'PRG-015', 'PRG-016', 'PRG-018', 'PRG-019', 'PRG-033', 'PRG-034'].includes(r[0])).forEach(r => console.log(JSON.stringify(r)));
})().catch(e => { console.error(e.message || e); process.exit(2); });
