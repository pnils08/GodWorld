// engine.364 bench-only plant on SANDBOX 1004: one open Hospital_Ledger stay for a citizen whose
// ledger Status is Active, so the ghost-bed release closes it on the next fire with the new stamp.
//   node plant.js plant        → writes the row at column A, reads it back, prints the POPID
//   node plant.js read <C> <POPID> → the row after the fire: StatusNow / DischargeCycle / Outcome
// Marker: Cause 'E364-BENCH NON-CANON'. Never run against PROD (the id below is the bench sheet).
require('/root/GodWorld/lib/env');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
process.env.GODWORLD_SHEET_ID = BENCH;
const sheets = require('/root/GodWorld/lib/sheets');
const MARK = 'E364-BENCH NON-CANON';
(async () => {
  const mode = process.argv[2];
  if (mode === 'plant') {
    // The pick reads the C117 snapshot (= live = the bench after its sync); getSheetAsObjects on the
    // bench ledger came back with keys off by a column (Name blank, a newsroom POPID picked).
    const led = require('fs').readFileSync('/root/GodWorld/output/simulation_ledger_snapshot.jsonl', 'utf8').trim().split('\n').map(JSON.parse);
    const hl = await sheets.getSheetData('Hospital_Ledger');
    const inHosp = new Set(hl.slice(1).map(r => String(r[1])));
    // An ordinary resident: Tier 3/4, a name on the row, never an authored or newsroom citizen.
    const pick = led.find(r => String(r.Status).trim() === 'Active' && r.Neighborhood === 'Lake Merritt' &&
      !inHosp.has(String(r.POPID)) && /^POP-\d+$/.test(String(r.POPID)) && /^[34]$/.test(String(r.Tier).trim()) &&
      String(r.Name || '').trim() && String(r['MED (y/n)']).trim() !== 'yes');
    if (!pick) throw new Error('no Active Lake Merritt citizen to plant');
    const row = ['H-C117-' + pick.POPID, pick.POPID, String(pick.Name || ''), 'Lake Merritt', MARK, 117, 'hospitalized', 117, '', '', '', 'unclassified', 'reconcile', 'E364-BENCH:' + pick.POPID, '', ''];
    const at = hl.length + 1;
    await sheets.updateRangeByPosition('Hospital_Ledger', at, 0, [row]); // startCol is 0-based (columnIndexToLetter(0) = A)
    const back = await sheets.getSheetData('Hospital_Ledger');
    const got = back.find(r => String(r[13]) === 'E364-BENCH:' + pick.POPID);
    if (!got || String(got[0]) !== row[0] || String(got[6]) !== 'hospitalized') throw new Error('plant did not read back at column A');
    console.log('PLANTED ' + pick.POPID + ' row ' + at); return;
  }
  if (mode === 'read') {
    const C = Number(process.argv[3]), pop = process.argv[4];
    const hl = await sheets.getSheetAsObjects('Hospital_Ledger');
    const r = hl.find(x => x.SourceEventId === 'E364-BENCH:' + pop);
    const pass = r && String(r.StatusNow) === 'discharged' && Number(r.DischargeCycle) === C && /^recovered/.test(String(r.Outcome));
    console.log(JSON.stringify({ pop, row: r && { StatusNow: r.StatusNow, DischargeCycle: r.DischargeCycle, Outcome: r.Outcome, CyclesInCare: r.CyclesInCare }, verdict: pass ? 'PASS' : 'FAIL' }));
    process.exit(pass ? 0 : 1);
  }
  throw new Error('mode plant | read');
})().catch(e => { console.error('plant ERR', e.message); process.exit(2); });
