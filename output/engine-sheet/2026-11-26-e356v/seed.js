// engine.356 cut C bench seed — BENCH ONLY (bench.js pins the sheet id): the SpotBizId header at the ledger's right
// edge and picks for the picks run. good: up to 5 active citizens a hood (hoods with 2+ spots), each given a spot of
// their hood's list (lib/spotPick — what a wake would offer) that is NOT the engine's fixed-hash pick.
// wronghood: 3 citizens given a spot of another hood. bogus: 2 given BIZ-99999. Written as one column, read back.
const { sheets, fs, U } = require('./bench');
const vm = require('vm'), sp = require('/root/GodWorld/lib/spotPick');
(async () => {
  const eng = vm.createContext({}); vm.runInContext(fs.readFileSync('/root/GodWorld/phase05-citizens/generateCitizensEvents.js', 'utf8'), eng);
  const rules = sp.engineRules(await sheets.getRawSheetData('Neighborhood_Map'));
  const hs = sp.hoodSpots(await sheets.getSheetAsObjects('Business_Ledger'), rules);
  const led = await sheets.getRawSheetData('Simulation_Ledger'), h = led[0];
  const iPop = h.indexOf('POPID'), iHood = h.indexOf('Neighborhood'), iSt = h.indexOf('Status');
  let iPick = h.indexOf('SpotBizId'); if (iPick < 0) iPick = h.length;
  const col = led.map((r, i) => [i === 0 ? 'SpotBizId' : '']);
  const picks = [], perHood = {}; let wrong = 0, bogus = 0;
  const hoods = Object.keys(hs);
  for (let i = 1; i < led.length; i++) {
    const pop = U(led[i][iPop]); if (!pop || String(led[i][iSt] || 'active').toLowerCase() !== 'active') continue;
    const hk = rules.hood(String(led[i][iHood] || '').trim()), list = hs[hk] || []; if (list.length < 2) continue;
    const hash = eng.citizenSpotFor_(list, led[i][iPop]);
    if ((perHood[hk] = perHood[hk] || 0) < 5) { const pk = list.find(x => x.id !== hash.id); perHood[hk]++; col[i] = [pk.id]; picks.push({ pop, kind: 'good', biz: pk.id, name: pk.name, hashBiz: hash.id, hashName: hash.name, hood: hk }); }
    else if (wrong < 3) { const oh = hoods.find(x => x !== hk && hs[x].length); wrong++; col[i] = [hs[oh][0].id]; picks.push({ pop, kind: 'wronghood', biz: hs[oh][0].id, name: hs[oh][0].name, hashBiz: hash.id, hashName: hash.name, hood: hk }); }
    else if (bogus < 2) { bogus++; col[i] = ['BIZ-99999']; picks.push({ pop, kind: 'bogus', biz: 'BIZ-99999', name: '', hashBiz: hash.id, hashName: hash.name, hood: hk }); }
  }
  const a1 = 'Simulation_Ledger!' + sheets.columnIndexToLetter(iPick) + '1';
  try { await sheets.updateRange(a1, col); } catch (e) { await sheets.resizeSheet('Simulation_Ledger', iPick + 1); await sheets.updateRange(a1, col); }
  const back = await sheets.getRawSheetData('Simulation_Ledger');
  let bad = back[0][iPick] === 'SpotBizId' ? 0 : 1; for (let i = 1; i < led.length; i++) if (String((back[i] || [])[iPick] || '') !== col[i][0]) bad++;
  fs.writeFileSync(__dirname + '/seed.json', JSON.stringify(picks));
  console.log(JSON.stringify({ column: iPick + 1, good: picks.filter(p => p.kind === 'good').length, wronghood: wrong, bogus, readBackMismatch: bad }));
  process.exit(bad ? 2 : 0);
})().catch(e => { console.error(e.message || e); process.exit(2); });
