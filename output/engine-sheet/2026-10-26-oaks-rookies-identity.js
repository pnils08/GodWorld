// engine.319 identity correction (builder go 2026-10-26, "Does Harry Hayward mint as an Oaks player?"):
//   the C113 advancement-intake mint wrote POP-01223 Hayward and POP-01224 Henderson with ClockMode `Game`
//   (the intake cell verbatim) and no EmployerBizId. Every other Oaks row reads `GAME` / `BIZ-00074`.
//   Four cells: ClockMode → GAME, EmployerBizId → BIZ-00074, for exactly those two rows, checked before the write
//   (POPID + name + current values) and read back after. Receipt: …-oaks-rookies-identity-receipt.json (old → new).
require('/root/GodWorld/lib/env');
const fs = require('fs');
const PINNED_LIVE = (fs.readFileSync('/root/GodWorld/utilities/utilityFunctions.js', 'utf8').match(/DEFAULT_SIM_SSID = '([^']+)'/) || [])[1];
if (process.env.GODWORLD_SHEET_ID !== PINNED_LIVE) throw new Error('env sheet is not the live sheet the engine code pins — stop');
const sh = require('/root/GodWorld/lib/sheets');
const TAB = 'Simulation_Ledger';
const OAKS = 'BIZ-00074';
const TARGETS = [
  { popid: 'POP-01223', first: 'Harry', last: 'Hayward' },
  { popid: 'POP-01224', first: 'Trevor', last: 'Henderson' },
];
const FIELDS = { ClockMode: 'GAME', EmployerBizId: OAKS };

(async () => {
  const d = await sh.getSheetData(TAB);
  const h = d[0];
  const ix = Object.fromEntries(['POPID', 'First', 'Last', 'ClockMode', 'EmployerBizId'].map(n => {
    const i = h.indexOf(n); if (i < 0) throw new Error('no column ' + n); return [n, i];
  }));
  const receipt = { tab: TAB, writtenAt: new Date().toISOString(), cells: [] };
  for (const t of TARGETS) {
    const i = d.findIndex((r, k) => k > 0 && r[ix.POPID] === t.popid);
    if (i < 0) throw new Error(t.popid + ' not on the ledger');
    const r = d[i], row = i + 1;
    if (r[ix.First] !== t.first || r[ix.Last] !== t.last) throw new Error(t.popid + ' name mismatch: ' + r[ix.First] + ' ' + r[ix.Last]);
    if (r[ix.ClockMode] !== 'Game' || (r[ix.EmployerBizId] || '') !== '') {
      throw new Error(t.popid + ' is not in the C113 mint shape (ClockMode=' + r[ix.ClockMode] + ', EmployerBizId=' + r[ix.EmployerBizId] + ') — nothing written');
    }
    const res = await sh.updateRowFields(TAB, row, FIELDS);
    for (const w of res) {
      const colName = Object.keys(FIELDS).find(n => w.range.endsWith(colLetterOf(ix[n]) + row));
      receipt.cells.push({ popid: t.popid, row, column: colName, range: w.range, old: r[ix[colName]] || '', new: FIELDS[colName] });
    }
  }
  const back = await sh.getSheetData(TAB);
  for (const c of receipt.cells) {
    const v = back[c.row - 1][ix[c.column]];
    if (v !== c.new) throw new Error('readback mismatch ' + c.range + ': ' + v);
  }
  const out = '/root/GodWorld/output/engine-sheet/2026-10-26-oaks-rookies-identity-receipt.json';
  fs.writeFileSync(out, JSON.stringify(receipt, null, 2));
  console.log('readback PASS: ' + receipt.cells.length + ' cells → ' + out);
  function colLetterOf(i) { let s = ''; i += 1; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
})().catch(e => { console.error('oaks identity failed: ' + e.message); process.exit(1); });
