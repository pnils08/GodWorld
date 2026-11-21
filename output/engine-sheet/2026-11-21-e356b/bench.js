// engine.356 bond-line bench read — SANDBOX 1004 only. node bench.js <cycle>
// The bond engine's lines for <cycle>: in the citizens' own LifeHistory cells (stamped Y?C?) against the rows on
// LifeHistory_Log carrying source:bond. Every cell line must have its log row (same person, same words).
// Exit 1 on a cell line with no log row or a log row with no cell line; 2 when the cycle has no bond line at all.
require('/root/GodWorld/lib/env');
const B = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
process.env.GODWORLD_SHEET_ID = B;
const sheets = require('/root/GodWorld/lib/sheets');
const cycle = Number(process.argv[2] || 0);
const TAGS = ['ConnectionWithdrawn', 'ConnectionMaintained', 'TrustGuarded', 'Bond', 'Wedding', 'Faith', 'Faith-Drift'];
(async () => {
  if (!cycle) { console.log('usage: bench.js <cycle>'); process.exit(3); }
  const stamp = 'Y' + (Math.floor((cycle - 1) / 52) + 1) + 'C' + (((cycle - 1) % 52) + 1);
  const led = await sheets.getRawSheetData('Simulation_Ledger');
  const h = led[0], iP = h.indexOf('POPID'), iF = h.indexOf('First'), iL = h.indexOf('Last'), iLife = h.indexOf('LifeHistory');
  const cell = {};
  for (const r of led.slice(1)) {
    for (const line of String(r[iLife] || '').split('\n')) {
      if (line.indexOf(stamp + ' ') !== 0) continue;
      const m = line.match(/\[([A-Za-z-]+)\]\s*(.*)$/);
      if (!m || TAGS.indexOf(m[1]) < 0) continue;
      cell[r[iP] + '|' + m[1] + '|' + m[2]] = ((r[iF] || '') + ' ' + (r[iL] || '')).trim();
    }
  }
  const lh = await sheets.getRawSheetData('LifeHistory_Log');
  const lhh = lh[0], lC = lhh.indexOf('Cycle'), lT = lhh.indexOf('EventTag'), lX = lhh.indexOf('EventText'), lP = lhh.indexOf('POPID'), lN = lhh.indexOf('Name'), lH = lhh.indexOf('Neighborhood');
  const log = {}; const byTag = {}; let withContact = 0; const show = [];
  for (const r of lh.slice(1)) {
    if (Number(r[lC]) !== cycle) continue;
    const tag = String(r[lT] || '');
    if (tag.indexOf('source:bond') < 0) continue;
    const prim = tag.split('|')[0];
    log[r[lP] + '|' + prim + '|' + r[lX]] = 1;
    byTag[prim] = (byTag[prim] || 0) + 1;
    if (/contactPopId:POP-\d+/.test(tag)) withContact++;
    if (show.length < 12) show.push('  ' + r[lP] + ' ' + r[lN] + ' (' + r[lH] + ') [' + tag + '] ' + r[lX]);
  }
  const cellKeys = Object.keys(cell), logKeys = Object.keys(log);
  const missing = cellKeys.filter((k) => !log[k]); const extra = logKeys.filter((k) => !(k in cell));
  // Faith lines are written by another engine too; a log-only Faith row is not this cut's.
  console.log('C' + cycle + ' (' + stamp + '): bond lines in cells ' + cellKeys.length + ' | log rows with source:bond ' + logKeys.length + ' ' + JSON.stringify(byTag) + ' | carrying the other person ' + withContact);
  console.log('cell lines with no log row: ' + missing.length + ' | log rows with no cell line: ' + extra.length);
  missing.slice(0, 5).forEach((k) => console.log('  MISSING ' + k));
  extra.slice(0, 5).forEach((k) => console.log('  EXTRA ' + k));
  show.forEach((l) => console.log(l));
  process.exit((missing.length || extra.length) ? 1 : (logKeys.length ? 0 : 2));
})().catch((e) => { console.log('bench read failed: ' + e.message); process.exit(4); });
