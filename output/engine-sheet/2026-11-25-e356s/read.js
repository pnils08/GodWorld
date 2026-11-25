// engine.356 cut A5 bench read for Cycle <C> on the sandbox — PlaceId / WithPopId on LifeHistory_Log.
//   node read.js <C> <base|full>
// Saves the week (after-<label>.json: bonds, and each log row's POPID, EventTag, EventText, PlaceId, WithPopId)
// for compare.js. full, each row of the Cycle:
//   1. the header ends ... Cycle, PlaceId, WithPopId (the sync brought it from live);
//   2. WithPopId = the row's contactPopId: tag, blank when it has none — on every writer's rows;
//   3. PlaceId = the row's first place:<id> tag when the id is an id, blank otherwise; never the words
//      employer / their-home / congregation;
//   4. a PlaceId is a Business_Ledger BIZ_ID, a Community_Programs Program_ID or a Household_Ledger id;
//      a WithPopId is a Simulation_Ledger POPID and not the row's own;
//   5. no cell right of WithPopId holds anything.
// base: the two cells are blank on every row (stage 86 writes seven cells).
// A check with 0 cases is NOT PROVEN.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const idm = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-24-e366/read.js', 'utf8').match(/GODWORLD_SHEET_ID = '([^']+)'/);
if (!idm) { console.error('no bench sheet id'); process.exit(2); }
process.env.GODWORLD_SHEET_ID = idm[1];
const sheets = require('/root/GodWorld/lib/sheets');
const C = String(process.argv[2]), LABEL = String(process.argv[3] || 'full');
(async () => {
  const raw = await sheets.getSheetData('LifeHistory_Log');
  const H = raw[0], ix = n => H.indexOf(n);
  const rows = raw.slice(1).filter(r => String(r[ix('Cycle')]) === C);
  const bonds = await sheets.getSheetAsObjects('Relationship_Bonds');
  const col = (r, n) => String(r[ix(n)] == null ? '' : r[ix(n)]).trim();
  fs.writeFileSync(__dirname + '/after-' + LABEL + '.json', JSON.stringify({ bonds: bonds.map(b => [b.BondId, b.CitizenA, b.CitizenB, b.BondType, b.Intensity, b.Status]),
    log: rows.map(r => [r[ix('POPID')], r[ix('EventTag')], r[ix('EventText')], ix('PlaceId') >= 0 ? col(r, 'PlaceId') : '', ix('WithPopId') >= 0 ? col(r, 'WithPopId') : '']) }));
  const problems = [], notProven = [];
  if (JSON.stringify(H.slice(0, 9)) !== JSON.stringify(['Timestamp', 'POPID', 'Name', 'EventTag', 'EventText', 'Neighborhood', 'Cycle', 'PlaceId', 'WithPopId'])) problems.push('header: ' + JSON.stringify(H));
  const t = { rows: rows.length, withPlace: 0, withPerson: 0, both: 0, placeKinds: {}, bondEngineRows: 0, wider: 0 };
  if (LABEL !== 'full') {
    const filled = rows.filter(r => col(r, 'PlaceId') || col(r, 'WithPopId')).length;
    if (filled) problems.push(filled + ' base rows carry a PlaceId or WithPopId');
    console.log(JSON.stringify({ label: LABEL, cycle: C, rows: rows.length, filled, problems: problems.length, first: problems.slice(0, 5) }, null, 1));
    process.exit(problems.length ? 1 : 0);
  }
  const ids = new Set(), pops = new Set();
  for (const r of await sheets.getSheetAsObjects('Business_Ledger')) ids.add(String(r.BIZ_ID || '').trim());
  for (const r of await sheets.getSheetAsObjects('Community_Programs')) ids.add(String(r.Program_ID || '').trim());
  for (const r of await sheets.getSheetAsObjects('Household_Ledger')) ids.add(String(r.HouseholdId || r.HouseholdID || r.Household_ID || '').trim());
  for (const r of await sheets.getSheetAsObjects('Simulation_Ledger')) pops.add(String(r.POPID || '').trim().toUpperCase());
  ids.delete('');
  const WORDS = { employer: 1, 'their-home': 1, congregation: 1 };
  for (const r of rows) {
    const tags = String(r[ix('EventTag')] || '').split('|'), who = String(r[ix('POPID')] || '').trim().toUpperCase();
    const pl = col(r, 'PlaceId'), wp = col(r, 'WithPopId'), txt = String(r[ix('EventText')] || '').slice(0, 70);
    const tagPlaces = tags.filter(x => x.indexOf('place:') === 0).map(x => x.slice(6).trim());
    const wantPlace = (tagPlaces.find(x => x && !WORDS[x]) && tagPlaces[0] && !WORDS[tagPlaces[0]]) ? tagPlaces[0] : (tagPlaces.find(x => x && !WORDS[x]) || '');
    const firstId = (() => { for (const x of tagPlaces) { if (x && !WORDS[x]) return x; } return ''; })();
    const wantWith = (tags.find(x => x.indexOf('contactPopId:') === 0) || '').slice(13).trim();
    if (pl !== firstId) problems.push('PlaceId "' + pl + '" vs tag "' + firstId + '": ' + who + ' | ' + txt);
    if (wp !== wantWith) problems.push('WithPopId "' + wp + '" vs tag "' + wantWith + '": ' + who + ' | ' + txt);
    if (WORDS[pl]) problems.push('PlaceId is a word: ' + pl + ' ' + who);
    if (pl) { t.withPlace++; const k = pl.replace(/[-_]?\d.*$/, ''); t.placeKinds[k] = (t.placeKinds[k] || 0) + 1; if (!ids.has(pl)) problems.push('PlaceId not on Business_Ledger / Community_Programs / Household_Ledger: ' + pl + ' | ' + who + ' | ' + txt); }
    if (wp) { t.withPerson++; if (!pops.has(wp.toUpperCase())) problems.push('WithPopId not on the ledger: ' + wp); if (wp.toUpperCase() === who) problems.push('WithPopId is the row\'s own: ' + who); }
    if (pl && wp) t.both++;
    if (wp && /^(TrustGuarded|ConnectionMaintained|ConnectionWithdrawn)/.test(tags[0])) t.bondEngineRows++;
    if (r.slice(9).some(v => String(v == null ? '' : v).trim())) t.wider++;
    void wantPlace;
  }
  if (t.wider) problems.push(t.wider + ' rows hold something right of WithPopId');
  if (!t.withPlace) notProven.push('no row with a PlaceId');
  if (!t.withPerson) notProven.push('no row with a WithPopId');
  if (!t.bondEngineRows) notProven.push('no bond-engine row with a WithPopId');
  if (!Object.keys(t.placeKinds).some(k => /^HH/i.test(k))) notProven.push('no household as a place (place:their-home)');
  console.log(JSON.stringify({ label: LABEL, cycle: C, tally: t, problems: problems.length, first: problems.slice(0, 15), notProven, verdict: problems.length ? 'FAIL' : (notProven.length ? 'PASS, NOT PROVEN: ' + notProven.join('; ') : 'PASS') }, null, 1));
  process.exit(problems.length ? 1 : (notProven.length ? 3 : 0));
})().catch(e => { console.error(e); process.exit(2); });
