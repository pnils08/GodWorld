// engine.356 (builder 2026-11-24): "Post Martum is also aid and you can place it in temesacal"; Civic Fellows — "Make a decision what this is".
require('/root/GodWorld/lib/env');
const sheets = require('/root/GodWorld/lib/sheets');
(async () => {
  const cp = await sheets.getSheetData('Community_Programs');
  if (cp[0][7] !== 'Place_Kind' || cp[0][3] !== 'Neighborhood') throw new Error('header moved');
  const i16 = cp.findIndex(r => r[0] === 'PRG-016'), i19 = cp.findIndex(r => r[0] === 'PRG-019');
  if (cp[i16][1] !== 'Postpartum Oakland Network' || cp[i19][1] !== 'Civis Systems Civic Fellows Program') throw new Error('rows moved');
  if (!['Fruitvale', 'Temescal'].includes(cp[i16][3]) || (cp[i16][7] && cp[i16][7] !== 'aid') || (cp[i19][7] && cp[i19][7] !== 'office')) throw new Error('unexpected values');
  await sheets.batchUpdate([
    { range: 'Community_Programs!D' + (i16 + 1), values: [['Temescal']] },
    { range: 'Community_Programs!H' + (i16 + 1), values: [['aid']] },
    { range: 'Community_Programs!H' + (i19 + 1), values: [['office']] }]);
  const b = await sheets.getSheetData('Community_Programs');
  console.log(JSON.stringify(b[i16]), JSON.stringify(b[i19]), 'blank kinds', b.slice(1).filter(r => !r[7]).length);
})().catch(e => { console.error(e.message || e); process.exit(2); });
