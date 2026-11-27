// engine.356 cut C bench read for Cycle <C>, label base | full | picks. Every label: dump the week (after-<label>.json).
// picks only — against seed.json. NOT a row-by-row comparison with the unseeded week: a different spot changes what
// that citizen's pool holds (citizenSpotLines_), so their draw and every roll after it move (agy 2026-11-26 1.3).
//   1. A good pick is the citizen's spot: every line of theirs carrying a spot: tag names the picked business and
//      not the fixed-hash one. (0 such lines = NOT PROVEN.)
//   2. A wrong-hood or unknown pick is ignored: no line of that citizen is placed at it, and a spot: line of theirs
//      names the fixed-hash spot.
//   3. The picks are still on the bench Spot_Picks tab after the fire.
//   4. The week is a week: row count within 15% of the unseeded run's.
//   Counted: good-pick citizens' lines placed at their pick (PlaceId), the half-the-time venue path.
const { sheets, fs, U } = require('./bench');
const C = String(process.argv[2]), LABEL = String(process.argv[3] || 'full');
(async () => {
  const log = (await sheets.getSheetAsObjects('LifeHistory_Log')).filter(r => String(r.Cycle) === C).map(r => [U(r.POPID), String(r.EventTag || ''), String(r.EventText || ''), String(r.PlaceId || '')]);
  const bonds = (await sheets.getSheetAsObjects('Relationship_Bonds')).map(b => [b.BondId, b.CitizenA, b.CitizenB, b.BondType, b.Intensity, b.Status]);
  fs.writeFileSync(__dirname + '/after-' + LABEL + '.json', JSON.stringify({ bonds, log }));
  if (LABEL !== 'picks') { console.log(JSON.stringify({ label: LABEL, cycle: C, logRows: log.length, bonds: bonds.length, verdict: log.length ? 'DUMPED' : 'FAIL no rows' })); process.exit(log.length ? 0 : 1); }
  const seed = JSON.parse(fs.readFileSync(__dirname + '/seed.json', 'utf8')), full = JSON.parse(fs.readFileSync(__dirname + '/after-full.json', 'utf8')).log;
  const by = {}; for (const p of seed) by[p.pop] = p;
  const problems = [], notProven = [];
  const t = { good: seed.filter(p => p.kind === 'good').length, ignored: seed.filter(p => p.kind !== 'good').length, spotLinesOnPick: 0, placedAtPick: 0, ignoredSpotLinesOnHash: 0, ignoredLines: 0, cellsKept: 0 };
  const isSpot = r => r[1].split('|').some(x => x.indexOf('spot:') === 0);
  for (const r of log) { const p = by[r[0]]; if (!p) continue;
    if (p.kind === 'good') {
      if (isSpot(r)) { const onPick = r[2].indexOf(p.name) >= 0, onHash = p.name.indexOf(p.hashName) < 0 && r[2].indexOf(p.hashName) >= 0;
        if (onPick && !onHash) t.spotLinesOnPick++; else problems.push(r[0] + ' spot line not at the pick ' + p.name + ' (hash ' + p.hashName + '): ' + r[2].slice(0, 120)); }
      if (r[3] === p.biz) t.placedAtPick++;
    } else { t.ignoredLines++;
      if (r[3] === p.biz || r[1].indexOf('place:' + p.biz) >= 0) problems.push(r[0] + ' (' + p.kind + ') placed at the ignored pick ' + p.biz);
      if (isSpot(r)) { if (r[2].indexOf(p.hashName) >= 0) t.ignoredSpotLinesOnHash++; else problems.push(r[0] + ' (' + p.kind + ') spot line not at the hash spot ' + p.hashName + ': ' + r[2].slice(0, 120)); } }
  }
  let tab = null; try { tab = await sheets.getRawSheetData('Spot_Picks'); } catch (e) { problems.push('Spot_Picks is gone from the bench after the fire'); }
  if (tab) { const last = {}; for (let i = 1; i < tab.length; i++) last[U(tab[i][1])] = String(tab[i][2] || '');
    for (const p of seed) { if (last[p.pop] === p.biz) t.cellsKept++; else problems.push(p.pop + ' last row after the fire: "' + last[p.pop] + '", seeded ' + p.biz); } }
  if (Math.abs(log.length - full.length) > 0.15 * full.length) problems.push('row count ' + log.length + ' vs the unseeded run ' + full.length);
  if (!t.spotLinesOnPick) notProven.push('no good-pick citizen drew a spot line');
  if (!t.placedAtPick) notProven.push('no good-pick citizen had a line placed at the pick');
  if (!t.ignoredLines) notProven.push('no ignored-pick citizen drew a line');
  console.log(JSON.stringify({ label: LABEL, cycle: C, logRows: log.length, unseededRows: full.length, tally: t, problems: problems.length, first: problems.slice(0, 12), notProven, verdict: problems.length ? 'FAIL' : (notProven.length ? 'PASS, NOT PROVEN: ' + notProven.join('; ') : 'PASS') }, null, 1));
  process.exit(problems.length ? 1 : (notProven.length ? 3 : 0));
})().catch(e => { console.error(e); process.exit(2); });
