// engine.305 bench readback for one fire on SANDBOX 1004: per hood, the saved Neighborhood_Map Sentiment and the
// written Neighborhood-kind lines of that Cycle by grade (LifeHistory_Log EventTag Neighborhood-<Dial>-Up|Down-<Band>).
// usage: node 2026-10-19-e305-read.js <cycle> <label>   → output/engine-sheet/2026-10-19-e305-<label>-c<cycle>.json
require('/root/GodWorld/lib/env');
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA';
if (process.env.GODWORLD_SHEET_ID === BENCH) throw new Error('env already points at the bench');
const LIVE = process.env.GODWORLD_SHEET_ID;
process.env.GODWORLD_SHEET_ID = BENCH;
const sheets = require('/root/GodWorld/lib/sheets');
const fs = require('fs');
const cyc = Number(process.argv[2]), label = process.argv[3] || 'read';
(async () => {
  if (!cyc || BENCH === LIVE) throw new Error('usage / target');
  const nm = await sheets.getSheetData('Neighborhood_Map'); const h = nm[0];
  const sent = {}; nm.slice(1).forEach(r => { sent[r[h.indexOf('Neighborhood')]] = Number(r[h.indexOf('Sentiment')]); });
  const lh = await sheets.getSheetData('LifeHistory_Log'); const lhh = lh[0];
  const iC = lhh.indexOf('Cycle'), iT = lhh.indexOf('EventTag'), iN = lhh.indexOf('Neighborhood'), iP = lhh.indexOf('POPID');
  const sl = await sheets.getSheetData('Simulation_Ledger'); const slh = sl[0];
  const hoodOf = {}; sl.slice(1).forEach(r => { hoodOf[r[slh.indexOf('POPID')]] = r[slh.indexOf('Neighborhood')]; });
  const lines = {}; let total = 0;
  lh.slice(1).forEach(r => {
    if (Number(String(r[iC]).replace(/^C/, '')) !== cyc) return;
    const m = /^Neighborhood-[A-Z][a-z]+-(Up|Down)-[SML](?:\||$)/.exec(String(r[iT] || '')); if (!m) return; // EventTag = graded tag | context tags
    const hood = (iN >= 0 && r[iN]) || hoodOf[r[iP]] || '(none)';
    lines[hood] = lines[hood] || { Up: 0, Down: 0 }; lines[hood][m[1]]++; total++;
  });
  const out = { cycle: cyc, label, sentiment: sent, neighborhoodLines: lines, neighborhoodLineTotal: total };
  const f = '/root/GodWorld/output/engine-sheet/2026-10-19-e305-' + label + '-c' + cyc + '.json';
  fs.writeFileSync(f, JSON.stringify(out, null, 1));
  console.log('wrote ' + f + ' — ' + total + ' Neighborhood-kind lines, ' + Object.keys(sent).length + ' hoods');
})().catch(e => { console.error(e.message); process.exit(1); });
