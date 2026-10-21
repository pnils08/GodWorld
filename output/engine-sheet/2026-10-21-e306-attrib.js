// engine.306 A/B attribution, row by row (codex diff gate 2 item 3): reads 2026-10-21-e306-readers-<A>-c113.json and -<B>-c113.json
// (the extended readers) and lays each hood's saved deltas beside what the Cycle did there in each leg — chaos rows (business targets
// placed by the row's Neighborhood), LifeHistory lines (the pulse-fold input), and how many of the 103 rows the hood gained. Both legs
// run seed 113 (utilities/cycleModes.js:186-195), so every delta is the rows' doing; this names the path in each hood.
// Writes 2026-10-21-e306-attrib-<A>-<B>.json; prints one line per hood. Reads files only.
// usage: node output/engine-sheet/2026-10-21-e306-attrib.js A2 B2
const fs = require('fs');
const [a, b] = process.argv.slice(2);
const O = '/root/GodWorld/output/engine-sheet/2026-10-21-e306-';
const A = JSON.parse(fs.readFileSync(O + 'readers-' + a + '-c113.json', 'utf8')), B = JSON.parse(fs.readFileSync(O + 'readers-' + b + '-c113.json', 'utf8'));
const r2 = n => Math.round(n * 100) / 100;
const chaosTxt = l => (l || []).map(c => (c.scope === 'business' ? c.name || c.id : c.scope) + ' ' + c.outcome + ' ' + c.metric + ' ' + c.magnitude).join('; ') || '-';
const gained = {}; (B.newLedgerRows || []).forEach(r => { gained[r.hood] = (gained[r.hood] || 0) + 1; });
const hoods = Object.keys(B.hoods).sort();
const out = { a, b, lifeHistory: { [a]: A.lifeHistory, [b]: B.lifeHistory }, newLedgerRows: B.newLedgerRows,
  offRoster: (B.newLedgerRows || []).filter(r => !/^BIZ-00(18[7-9]|19\d|2[0-8]\d)$/.test(r.id)), hoods: {} };
hoods.forEach(h => {
  const x = A.hoods[h] || {}, y = B.hoods[h];
  out.hoods[h] = { rowsGained: gained[h] || 0,
    retail: [x.retail, y.retail, r2(y.retail - x.retail)], event: [x.event, y.event, r2(y.event - x.event)],
    sentiment: [x.sentiment, y.sentiment, r2(y.sentiment - x.sentiment)], unemployed: [x.unemployed, y.unemployed, y.unemployed - x.unemployed],
    lifeHistoryLines: [(A.lifeHistoryByHood || {})[h] || 0, (B.lifeHistoryByHood || {})[h] || 0],
    chaos: { [a]: (A.chaosByHood || {})[h] || [], [b]: (B.chaosByHood || {})[h] || [] } };
});
out.chaosOffMap = { [a]: Object.keys(A.chaosByHood || {}).filter(h => !B.hoods[h]).map(h => [h, A.chaosByHood[h]]),
  [b]: Object.keys(B.chaosByHood || {}).filter(h => !B.hoods[h]).map(h => [h, B.chaosByHood[h]]) };
fs.writeFileSync(O + 'attrib-' + a + '-' + b + '.json', JSON.stringify(out, null, 1));
console.log('LifeHistory ' + a + ' ' + A.lifeHistory.rows + ' sha ' + A.lifeHistory.linesSha256.slice(0, 16) + ' | ' + b + ' ' + B.lifeHistory.rows + ' sha ' + B.lifeHistory.linesSha256.slice(0, 16));
console.log('ledger rows the baseline lacks: ' + (B.newLedgerRows || []).length + '; off the roster: ' + JSON.stringify(out.offRoster));
console.log(['hood', '+rows', 'RV A→B', 'Event A→B', 'LH lines A/B', 'chaos ' + a, 'chaos ' + b].join('\t'));
hoods.forEach(h => { const v = out.hoods[h];
  console.log([h, v.rowsGained, v.retail[0] + '→' + v.retail[1] + ' (' + v.retail[2] + ')', v.event[0] + '→' + v.event[1] + ' (' + v.event[2] + ')',
    v.lifeHistoryLines.join('/'), chaosTxt(v.chaos[a]), chaosTxt(v.chaos[b])].join('\t')); });
console.log('→ ' + O + 'attrib-' + a + '-' + b + '.json');
