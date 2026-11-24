// engine.356 A1 bench read for Cycle <C> on SANDBOX 1004.
//   node read.js <C>
// LifeHistory_Log rows of the Cycle: lines carrying place:<BIZ_ID>; every id a Business_Ledger row whose
// name is in the text and whose hood is the line's hood; venue:local lines with no place:; the stock
// place names (CITIZEN_VENUES_* in generateCitizensEvents.js) still named.
// Bench sheet id: taken from the engine.366 read (same sandbox), not repeated here.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const prior = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-24-e366/read.js', 'utf8');
const idm = prior.match(/GODWORLD_SHEET_ID = '([^']+)'/);
if (!idm) { console.error('no bench sheet id'); process.exit(2); }
process.env.GODWORLD_SHEET_ID = idm[1];
const sheets = require('/root/GodWorld/lib/sheets');
const C = String(process.argv[2]);
(async () => {
  const log = (await sheets.getSheetAsObjects('LifeHistory_Log')).filter(r => String(r.Cycle) === C);
  const biz = await sheets.getSheetAsObjects('Business_Ledger');
  const byId = Object.fromEntries(biz.map(b => [b.BIZ_ID, b]));
  const src = fs.readFileSync('/root/GodWorld/phase05-citizens/generateCitizensEvents.js', 'utf8');
  const tbl = n => { const i = src.indexOf('var ' + n); const j = src.indexOf('\n};', i); return [...src.slice(i, j).matchAll(/"([^"]{4,60})"/g)].map(m => m[1]); };
  const stock = [...new Set([...tbl('CITIZEN_VENUES_BY_CHARACTER_'), ...tbl('CITIZEN_VENUES_BESPOKE_')])].sort((a, b) => b.length - a.length);
  const problems = [], out = { cycle: +C, lines: log.length, people: new Set(log.map(r => r.POPID)).size };
  let placed = 0, near = 0, nearPlaced = 0, venueNoPlace = 0, stockHit = 0, otherHood = 0;
  const places = {}, placedPeople = new Set(), stockByHood = {}, noPlaceHood = {}, otherHoodEx = [], ex = [];
  for (const r of log) {
    const t = r.EventText || '', tag = r.EventTag || '';
    const m = tag.match(/(?:^|\|)place:([^|]+)/);
    const isNear = / near /.test(t); if (isNear) near++;
    if (m) {
      placed++; placedPeople.add(r.POPID); if (isNear) nearPlaced++;
      const b = byId[m[1]];
      if (!b) { problems.push('place id not on Business_Ledger: ' + m[1]); continue; }
      places[b.Name] = (places[b.Name] || 0) + 1;
      if (!t.includes(b.Name)) problems.push(m[1] + ' name not in the text: ' + t.slice(0, 90));
      if (b.Neighborhood !== r.Neighborhood) { otherHood++; if (otherHoodEx.length < 5) otherHoodEx.push(r.Neighborhood + ' -> ' + b.Name + ' (' + b.Neighborhood + ')'); }
      if (ex.length < 8) ex.push(r.Name + ' (' + r.Neighborhood + '): ' + t.slice(0, 120) + '  [' + m[1] + ' ' + b.Sector + ']');
    } else if (/(?:^|\|)venue:local/.test(tag)) { venueNoPlace++; noPlaceHood[r.Neighborhood] = (noPlaceHood[r.Neighborhood] || 0) + 1; }
    if (stock.find(s => t.includes(s))) { stockHit++; stockByHood[r.Neighborhood] = (stockByHood[r.Neighborhood] || 0) + 1; }
  }
  Object.assign(out, { linesWithPlace: placed, peopleWithPlace: placedPeople.size, distinctPlaces: Object.keys(places).length,
    nearLines: near, nearWithPlace: nearPlaced, venueLocalNoPlace: venueNoPlace, venueLocalNoPlaceByHood: noPlaceHood,
    placeInAnotherHoodLabel: otherHood, otherHoodExamples: otherHoodEx,
    stockNamesStillNamed: stockHit, stockByHood, topPlaces: Object.entries(places).sort((a, b) => b[1] - a[1]).slice(0, 12), examples: ex });
  if (!log.length) problems.push('no log rows for C' + C);
  if (!placed) problems.push('0 lines carry place:');
  out.problems = problems; out.verdict = problems.length ? 'FAIL' : 'PASS';
  console.log(JSON.stringify(out, null, 1));
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
