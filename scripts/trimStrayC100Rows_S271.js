// S271 one-shot: trim the stray C100 rows from the failed run so the clean
// re-run doesn't double-append. Recomputes each C100 tail range LIVE, asserts
// it's contiguous-at-tail before deleting, verifies after. Safe to re-run
// (no-op once C100 rows are gone). Delete this file after use.
require('../lib/env');
const { getClient, getRawSheetData } = require('../lib/sheets');
const SID = process.env.GODWORLD_SHEET_ID;

(async () => {
  const sheets = await getClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SID, fields: 'sheets.properties(sheetId,title)' });
  const gid = {};
  for (const s of meta.data.sheets) gid[s.properties.title] = s.properties.sheetId;

  const targets = ['LifeHistory_Log', 'Relationship_Bond_Ledger', 'Cycle_Packet'];
  for (const t of targets) {
    const d = await getRawSheetData(t);
    const hdr = d[0] || [];
    const ci = hdr.findIndex(h => /^cycle$/i.test(String(h).trim()));
    let first = -1, last = -1, c = 0;
    for (let i = 1; i < d.length; i++) {
      if (parseInt(d[i][ci]) === 100) { c++; if (first < 0) first = i; last = i; }
    }
    if (c === 0) { console.log(`${t}: no C100 rows — skip`); continue; }
    const contiguousTail = (last - first + 1 === c) && (last === d.length - 1);
    if (!contiguousTail) { console.log(`${t}: C100 rows NOT contiguous-at-tail — ABORT (${c} rows)`); continue; }
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SID,
      requestBody: { requests: [{ deleteDimension: { range: { sheetId: gid[t], dimension: 'ROWS', startIndex: first, endIndex: last + 1 } } }] }
    });
    // verify
    const d2 = await getRawSheetData(t);
    const left = d2.slice(1).filter(r => parseInt(r[ci]) === 100).length;
    console.log(`${t}: deleted ${c} C100 rows | remaining C100 rows now = ${left} ${left === 0 ? '✓' : '✗ CHECK'}`);
  }
  console.log('\nTrim complete. Now run the Step-2 GAS snippet (clear carry-forward keys), then re-run C100.');
})().catch(e => console.log('ERR', e.message));
