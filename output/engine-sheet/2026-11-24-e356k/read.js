// engine.356 A1+A2 bench read for Cycle <C> on SANDBOX 1004.
//   node read.js <C>
// LifeHistory_Log rows of the Cycle: act: lines by kind; place: lines by how the place got there
// ($VENUE / template, a place on the line's row, the employer); every place id a Business_Ledger row;
// an employer place = the citizen's EmployerBizId; a $VENUE place on an act:meal|drink|errand line fits
// the act; no " near " tail with venue:local left; no raw place:employer.
require('/root/GodWorld/lib/env');
const fs = require('fs');
const idm = fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-24-e366/read.js', 'utf8').match(/GODWORLD_SHEET_ID = '([^']+)'/);
if (!idm) { console.error('no bench sheet id'); process.exit(2); }
process.env.GODWORLD_SHEET_ID = idm[1];
const sheets = require('/root/GodWorld/lib/sheets');
const C = String(process.argv[2]);
const list = JSON.parse(fs.readFileSync('/root/GodWorld/output/engine-sheet/2026-11-24-e356j/ecl-act-tags.json', 'utf8'));
const rowPlace = {}; for (const o of list) { const p = o.add.find(t => /^place:BIZ-/.test(t)); if (p) rowPlace[o.text] = p.slice(6); }
for (const o of JSON.parse(fs.readFileSync(__dirname + '/ecl-place-names.json', 'utf8'))) rowPlace[o.newText] = o.place.slice(6);
(async () => {
  const log = (await sheets.getSheetAsObjects('LifeHistory_Log')).filter(r => String(r.Cycle) === C);
  const biz = await sheets.getSheetAsObjects('Business_Ledger');
  const led = await sheets.getSheetAsObjects('Simulation_Ledger');
  const byId = Object.fromEntries(biz.map(b => [b.BIZ_ID, b]));
  const emp = Object.fromEntries(led.map(r => [r.POPID, String(r.EmployerBizId || '').trim()]));
  const problems = [], acts = {}, how = { venue: 0, row: 0, employer: 0, other: 0 }, ex = { venue: [], row: [], employer: [] };
  let placed = 0, tails = 0, rawEmp = 0, shiftNoPlace = 0; const people = new Set(), places = new Set();
  for (const r of log) {
    const t = r.EventText || '', tag = r.EventTag || '', parts = tag.split('|');
    const act = (parts.find(p => p.indexOf('act:') === 0) || '').slice(4);
    if (act) acts[act] = (acts[act] || 0) + 1;
    if (parts.indexOf('place:employer') >= 0) rawEmp++;
    for (const p of parts) if (p.indexOf('place:') === 0 && !/^place:BIZ-\d+$/.test(p) && p !== 'place:employer') problems.push('malformed place tag: ' + p);
    if (/ near /.test(t) && parts.indexOf('venue:local') >= 0) tails++;
    const pl = (parts.find(p => /^place:BIZ-/.test(p)) || '').slice(6);
    if (!pl) { if (act === 'shift') shiftNoPlace++; continue; }
    placed++; people.add(r.POPID); places.add(pl);
    const b = byId[pl];
    if (!b) { problems.push('place id not on Business_Ledger: ' + pl); continue; }
    let k;
    if (parts.indexOf('venue:local') >= 0) {
      k = 'venue';
      if (!t.includes(b.Name)) problems.push(pl + ' name not in the text: ' + t.slice(0, 80));
      const sec = String(b.Sector || ''), bar = /bar\b|pubs?\b|brewery|lounge|nightlife|tap\s?room|social club/i.test(sec);
      const food = /cafe|coffee|bakery|restaurant|dining|diner|food|bar\b|pubs?\b|brewery|lounge|nightlife|club|market|kitchen|ramen|grill/i.test(sec) && !/retail|shop|store|boutique|grocery/i.test(sec);
      if (act === 'drink' && !bar) problems.push('drink line at a place that is no bar: ' + b.Name + ' [' + sec + ']');
      if (act === 'meal' && !food) problems.push('meal line at a place that serves none: ' + b.Name + ' [' + sec + ']');
      if (act === 'errand' && food && !/bakery|patisserie|roaster|market|grocer/i.test(sec)) problems.push('errand line at a place that is no shop: ' + b.Name + ' [' + sec + ']');
    } else if (rowPlace[t] === pl) { k = 'row'; if (!t.includes(b.Name)) problems.push(pl + ' row place not named: ' + t.slice(0, 80)); }
    else if (act === 'shift') { k = 'employer'; if (emp[r.POPID] !== pl) problems.push(r.POPID + ' shift place ' + pl + ' is not their employer ' + emp[r.POPID]); }
    else { k = 'other'; problems.push('place with no known path: ' + tag.slice(0, 80)); }
    how[k]++;
    if (ex[k] && ex[k].length < 5) ex[k].push(r.Name + ' (' + r.Neighborhood + '): ' + t.slice(0, 100) + '  [' + b.Name + '; ' + b.Sector + ']');
  }
  if (!log.length) problems.push('no log rows for C' + C);
  if (tails) problems.push(tails + ' " near " tails left');
  if (rawEmp) problems.push(rawEmp + ' raw place:employer tags on the log');
  if (!Object.keys(acts).length) problems.push('0 lines carry act:');
  const out = { cycle: +C, lines: log.length, people: new Set(log.map(r => r.POPID)).size, actLines: acts,
    linesWithPlace: placed, peopleWithPlace: people.size, distinctPlaces: places.size, placeBy: how, shiftLinesNoEmployer: shiftNoPlace,
    nearTailsLeft: tails, examples: ex, problems, verdict: problems.length ? 'FAIL' : 'PASS' };
  console.log(JSON.stringify(out, null, 1));
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
