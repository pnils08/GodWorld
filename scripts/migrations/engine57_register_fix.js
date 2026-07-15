// Register fix: Corliss kids into Child1/2; Foster family row (off-camera husband).
// Usage: node registerFix.js --sheet-id <ID> [--apply]
const sheetIdArg = process.argv.find(a => a.startsWith('--sheet-id='));
const SHEET_ID = sheetIdArg ? sheetIdArg.split('=')[1]
  : (process.argv.includes('--sheet-id') ? process.argv[process.argv.indexOf('--sheet-id') + 1] : null);
if (!SHEET_ID) { console.error('--sheet-id required'); process.exit(1); }
process.env.GODWORLD_SHEET_ID = SHEET_ID;
const s = require('/root/GodWorld/lib/sheets.js');
const APPLY = process.argv.includes('--apply');

(async () => {
  const reg = await s.getRawSheetData('Family_Relationships');
  const corlissIdx = reg.findIndex(r => r[0] === 'HH-0084-001');
  if (corlissIdx < 1) throw new Error('Corliss register row not found');
  const corlissRow = corlissIdx + 1;
  const hasFoster = reg.some(r => r[0] === 'HH-0084-256');
  console.log('Corliss row at sheet row', corlissRow, '| current Child1/2:', JSON.stringify([reg[corlissIdx][6], reg[corlissIdx][7]]));
  console.log('Foster row exists already:', hasFoster);
  if (!APPLY) { console.log('DRY RUN'); return; }

  await s.batchUpdate([
    { range: `Family_Relationships!G${corlissRow}`, values: [['POP-00595 Sarah Corliss']] },
    { range: `Family_Relationships!H${corlissRow}`, values: [['POP-00596 Michael Corliss']] }
  ]);
  if (!hasFoster) {
    await s.appendRows('Family_Relationships', [[
      'HH-0084-256', '(off-camera spouse)', 'POP-00348 Melony Foster', 'married', 101, 'active',
      'POP-00316 Chris Foster', '', '', '', ''
    ]]);
  }
  const after = await s.getRawSheetData('Family_Relationships');
  const c = after.find(r => r[0] === 'HH-0084-001');
  const f = after.find(r => r[0] === 'HH-0084-256');
  console.log('read-back Corliss:', c[6], '|', c[7]);
  console.log('read-back Foster:', f ? f.slice(0, 7).join(' | ') : 'MISSING');
})().catch(e => { console.error(e.stack); process.exit(1); });
