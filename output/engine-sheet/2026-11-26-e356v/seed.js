// engine.356 cut C bench seed — BENCH ONLY (bench.js pins the sheet id): the Spot_Picks tab, made fresh, and picks
// for the picks run. good: up to 5 active citizens a hood (hoods with 2+ spots), each given a spot of
// their hood's list (lib/spotPick — what a wake would offer) that is NOT the engine's fixed-hash pick.
// wronghood: 3 citizens given a spot of another hood. bogus: 2 given BIZ-99999. Appended as rows, read back.
const { sheets, fs, U } = require('./bench');
const vm = require('vm'), sp = require('/root/GodWorld/lib/spotPick');
(async () => {
  const eng = vm.createContext({}); vm.runInContext(fs.readFileSync('/root/GodWorld/phase05-citizens/generateCitizensEvents.js', 'utf8'), eng);
  const rules = sp.engineRules(await sheets.getRawSheetData('Neighborhood_Map'));
  const hs = sp.hoodSpots(await sheets.getSheetAsObjects('Business_Ledger'), rules);
  const led = await sheets.getRawSheetData('Simulation_Ledger'), h = led[0];
  const iPop = h.indexOf('POPID'), iHood = h.indexOf('Neighborhood'), iSt = h.indexOf('Status');
  const picks = [], perHood = {}; let wrong = 0, bogus = 0;
  const hoods = Object.keys(hs);
  for (let i = 1; i < led.length; i++) {
    const pop = U(led[i][iPop]); if (!pop || String(led[i][iSt] || 'active').toLowerCase() !== 'active') continue;
    const hk = rules.hood(String(led[i][iHood] || '').trim()), list = hs[hk] || []; if (list.length < 2) continue;
    const hash = eng.citizenSpotFor_(list, led[i][iPop]);
    if ((perHood[hk] = perHood[hk] || 0) < 5) { const pk = list.find(x => x.id !== hash.id); perHood[hk]++; picks.push({ pop, kind: 'good', biz: pk.id, name: pk.name, hashBiz: hash.id, hashName: hash.name, hood: hk }); }
    else if (wrong < 3) { const oh = hoods.find(x => x !== hk && hs[x].length); wrong++; picks.push({ pop, kind: 'wronghood', biz: hs[oh][0].id, name: hs[oh][0].name, hashBiz: hash.id, hashName: hash.name, hood: hk }); }
    else if (bogus < 2) { bogus++; picks.push({ pop, kind: 'bogus', biz: 'BIZ-99999', name: '', hashBiz: hash.id, hashName: hash.name, hood: hk }); }
  }
  // each good citizen first gets a row naming their hash spot, then the pick — the last row must win
  const rows = picks.filter(p => p.kind === 'good').map(p => ['seed', p.pop.toLowerCase() + ' ', p.hashBiz, 118, p.hashName]).concat(picks.map(p => ['seed', p.pop, p.biz, 118, p.name]));
  if ((await sheets.listSheets()).some(x => (x.title || x) === sp.PICK_TAB)) await sheets.deleteSheet(sp.PICK_TAB);
  await sheets.createSheet(sp.PICK_TAB, sp.PICK_HEADERS);
  await sheets.appendRows(sp.PICK_TAB, rows);
  const back = await sheets.getRawSheetData(sp.PICK_TAB);
  const bad = back.length === rows.length + 1 && sp.PICK_HEADERS.every((k, i) => back[0][i] === k) ? 0 : 1;
  fs.writeFileSync(__dirname + '/seed.json', JSON.stringify(picks));
  console.log(JSON.stringify({ tabRows: back.length - 1, good: picks.filter(p => p.kind === 'good').length, wronghood: wrong, bogus, readBackMismatch: bad }));
  process.exit(bad ? 2 : 0);
})().catch(e => { console.error(e.message || e); process.exit(2); });
