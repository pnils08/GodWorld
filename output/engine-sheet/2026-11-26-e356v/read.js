// engine.356 cut C bench read for Cycle <C>, label base | full | picks. Every label: dump the week (after-<label>.json).
// picks only — against seed.json and after-full.json (same code, same sync, no picks):
//   1. A good pick is the citizen's spot: every line of theirs carrying a spot: tag names the picked business,
//      never the fixed-hash one. (0 such lines = NOT PROVEN.)
//   2. A wrong-hood or bogus pick is ignored: that citizen's rows equal the full run's.
//   3. Nobody else moved: the row count is the full run's (no roll added or dropped), and a row that differs from
//      the full run at the same position belongs to a good-pick citizen or carries a good pick's place:<BIZ> / name
//      (a moment shared with one).
//   Counted: good-pick citizens' lines with place:<their pick> (the half-the-time venue path).
const { sheets, fs, U } = require('./bench');
const C = String(process.argv[2]), LABEL = String(process.argv[3] || 'full');
(async () => {
  const log = (await sheets.getSheetAsObjects('LifeHistory_Log')).filter(r => String(r.Cycle) === C).map(r => [U(r.POPID), String(r.EventTag || ''), String(r.EventText || ''), String(r.PlaceId || '')]);
  const bonds = (await sheets.getSheetAsObjects('Relationship_Bonds')).map(b => [b.BondId, b.CitizenA, b.CitizenB, b.BondType, b.Intensity, b.Status]);
  fs.writeFileSync(__dirname + '/after-' + LABEL + '.json', JSON.stringify({ bonds, log }));
  if (LABEL !== 'picks') { console.log(JSON.stringify({ label: LABEL, cycle: C, logRows: log.length, bonds: bonds.length, verdict: log.length ? 'DUMPED' : 'FAIL no rows' })); process.exit(log.length ? 0 : 1); }
  const seed = JSON.parse(fs.readFileSync(__dirname + '/seed.json', 'utf8')), full = JSON.parse(fs.readFileSync(__dirname + '/after-full.json', 'utf8')).log;
  const by = {}; for (const p of seed) by[p.pop] = p;
  const good = seed.filter(p => p.kind === 'good'), problems = [], notProven = [];
  const t = { good: good.length, spotLines: 0, spotLinesOnPick: 0, venueLinesOnPick: 0, ignoredChecked: 0, rowsDiffer: 0, rowsDifferOthers: 0 };
  for (const r of log) { const p = by[r[0]]; if (!p || p.kind !== 'good') continue;
    if (r[1].split('|').some(x => x.indexOf('spot:') === 0)) { t.spotLines++; if (r[2].indexOf(p.name) >= 0) t.spotLinesOnPick++; else problems.push(r[0] + ' spot line not at the pick ' + p.name + ': ' + r[2].slice(0, 120)); }
    else if (r[1].indexOf('place:' + p.biz) >= 0) t.venueLinesOnPick++; }
  const rowsOf = (L, pop) => L.filter(r => r[0] === pop).map(r => r.slice(0, 3).join('~'));
  for (const p of seed) if (p.kind !== 'good') { t.ignoredChecked++; if (JSON.stringify(rowsOf(log, p.pop)) !== JSON.stringify(rowsOf(full, p.pop))) problems.push(p.pop + ' (' + p.kind + ') rows moved'); }
  if (log.length !== full.length) problems.push('row count ' + log.length + ' vs the full run ' + full.length);
  const goodBiz = good.map(p => 'place:' + p.biz), goodNames = good.map(p => p.name);
  for (let i = 0; i < Math.min(log.length, full.length); i++) { const a = log[i], b = full[i]; if (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) continue; t.rowsDiffer++;
    if (by[a[0]] && by[a[0]].kind === 'good' && a[0] === b[0]) continue; t.rowsDifferOthers++;
    if (!(a[0] === b[0] && (goodBiz.some(x => a[1].indexOf(x) >= 0) || goodNames.some(n => a[2].indexOf(n) >= 0)))) problems.push('row ' + i + ' moved, not a pick: ' + a.slice(0, 3).join(' ~ ').slice(0, 160) + ' || ' + b.slice(0, 3).join(' ~ ').slice(0, 160)); }
  if (!t.spotLinesOnPick) notProven.push('no good-pick citizen drew a spot line');
  if (!t.venueLinesOnPick) notProven.push('no good-pick citizen drew a venue line at the pick');
  if (!t.ignoredChecked) notProven.push('no ignored pick seeded');
  console.log(JSON.stringify({ label: LABEL, cycle: C, logRows: log.length, tally: t, problems: problems.length, first: problems.slice(0, 12), notProven, verdict: problems.length ? 'FAIL' : (notProven.length ? 'PASS, NOT PROVEN: ' + notProven.join('; ') : 'PASS') }, null, 1));
  process.exit(problems.length ? 1 : (notProven.length ? 3 : 0));
})().catch(e => { console.error(e); process.exit(2); });
