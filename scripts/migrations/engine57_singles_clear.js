// Clear SL HouseholdId for unmarried adults in minor-less households.
// Mike's model: only married households + households with kids exist.
// Usage: node clearSinglesLive.js --sheet-id <ID> [--apply]
const sheetIdArg = process.argv.find(a => a.startsWith('--sheet-id='));
const SHEET_ID = sheetIdArg ? sheetIdArg.split('=')[1]
  : (process.argv.includes('--sheet-id') ? process.argv[process.argv.indexOf('--sheet-id') + 1] : null);
if (!SHEET_ID) { console.error('--sheet-id required'); process.exit(1); }
process.env.GODWORLD_SHEET_ID = SHEET_ID;
const s = require('/root/GodWorld/lib/sheets.js');
const APPLY = process.argv.includes('--apply');

function colLetter(i) {
  let n = i + 1, out = '';
  while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); }
  return out;
}

(async () => {
  const led = await s.getRawSheetData('Simulation_Ledger');
  const h = led[0];
  const iHH = h.indexOf('HouseholdId'), iMar = h.indexOf('MaritalStatus'),
        iBY = h.indexOf('BirthYear'), iSt = h.indexOf('Status');
  const alive = r => String(r[iSt] || '').toLowerCase() !== 'deceased';
  const ageOf = r => { const b = Number(r[iBY]) || 0; return b > 0 ? 2041 - b : 30; };

  const countByHH = {};
  led.slice(1).forEach(r => {
    const hid = (r[iHH] || '').trim();
    if (hid && alive(r)) countByHH[hid] = (countByHH[hid] || 0) + 1;
  });

  // Only the unambiguous model violation: an unmarried adult ALONE in a
  // household. Shared households (single parent + 16-17yo, adult co-residents)
  // are left for an explicit ruling.
  const updates = [], log = [];
  led.slice(1).forEach((r, j) => {
    if (!alive(r)) return;
    const hid = (r[iHH] || '').trim();
    if (!hid) return;
    if (countByHH[hid] !== 1) return;                           // shared households stay
    if (ageOf(r) < 16) return;                                  // orphan minors stay (P8)
    const mar = String(r[iMar] || '').toLowerCase();
    if (mar === 'married' || mar === 'partnered') return;       // off-camera-spouse couples stay
    updates.push({ range: `Simulation_Ledger!${colLetter(iHH)}${j + 2}`, values: [['']] });
    log.push(`${r[0]} (${mar || 'no-marital'}) <- ${hid}`);
  });

  console.log(`unmarried adults ALONE in a household: ${updates.length}`);
  log.slice(0, 10).forEach(l => console.log('  clear', l));
  if (updates.length > 10) console.log(`  ... +${updates.length - 10} more`);
  if (!APPLY) { console.log('DRY RUN — no writes. Re-run with --apply.'); return; }

  for (let i = 0; i < updates.length; i += 500) await s.batchUpdate(updates.slice(i, i + 500));
  const after = await s.getRawSheetData('Simulation_Ledger');
  const cAfter = {};
  after.slice(1).forEach(r => {
    const hid = (r[iHH] || '').trim();
    if (hid && alive(r)) cAfter[hid] = (cAfter[hid] || 0) + 1;
  });
  let remain = 0;
  after.slice(1).forEach(r => {
    if (!alive(r)) return;
    const hid = (r[iHH] || '').trim();
    if (!hid || cAfter[hid] !== 1 || ageOf(r) < 16) return;
    const mar = String(r[iMar] || '').toLowerCase();
    if (mar !== 'married' && mar !== 'partnered') remain++;
  });
  console.log('read-back: remaining =', remain, remain === 0 ? '(CLEAN)' : '(CHECK)');
})().catch(e => { console.error(e.stack); process.exit(1); });
