// engine.307 bench read for one fire (plan §engine.307 design, bench watch): read-only. Diffs the bench Simulation_Ledger against
// the previous Cycle's snapshot (C112 = BASELINE-1004-C112b, else the snapshot this script saved after the last fire) and reports:
// rows that moved onto / off the 8 sports BIZ_IDs (with ClockMode, EconomicProfileKey, Tier, RoleType), every GAME / SPORTS_OVERRIDE
// row whose EmployerBizId or Income changed (the athlete guard: expect 0 career moves), this Cycle's LifeHistory_Log career rows
// (Career-Hired / Career-FieldChange / Promotion / Career-Layoff) split sports vs elsewhere, and the sports rows' Employee_Count.
// Writes nothing to any sheet; saves output/engine-sheet/2026-10-22-e307-snap-<label>-c<cycle>.json + -check-<label>-c<cycle>.json.
// usage: node 2026-10-22-e307-check.js <cycle> <label> [<prev-label>]   (prev-label omitted at 113 = the baseline sheet)
// LIVE (the C113 watch, read-only): label `live` reads the live sheet. Before the fire: `snap <cycle> live` saves the snapshot only;
// after: `<cycle+1> live live` diffs against it.
require('/root/GodWorld/lib/env');
const LIVE = process.env.GODWORLD_SHEET_ID;
const BENCH = '1tByPpT8QIgJppabjpEdAqPlTjcq2RBSkL_QDrGk8YcA', BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
if (process.env.GODWORLD_SHEET_ID === BENCH || process.env.GODWORLD_SHEET_ID === BASE) throw new Error('env already points at a bench sheet');
const fs = require('fs');
const O = '/root/GodWorld/output/engine-sheet/';
const snapOnly = process.argv[2] === 'snap', argv = snapOnly ? process.argv.slice(1) : process.argv;
const cyc = Number(argv[2]), label = argv[3], prevLabel = argv[4];
if (!(cyc >= (snapOnly ? 112 : 113)) || !label) throw new Error('usage: [snap] <cycle> <label> [<prev-label>]');
const SHEET = label === 'live' ? LIVE : BENCH;
if (label === 'live' && (!LIVE || LIVE === BENCH || LIVE === BASE)) throw new Error('env does not point at live');
const SPORTS = ['BIZ-00005', 'BIZ-00008', 'BIZ-00041', 'BIZ-00063', 'BIZ-00074', 'BIZ-00103', 'BIZ-00274', 'BIZ-00278'];
async function tab(id, name) {
  process.env.GODWORLD_SHEET_ID = id; delete require.cache[require.resolve('/root/GodWorld/lib/sheets')];
  return require('/root/GodWorld/lib/sheets').getSheetData(name);
}
function snapOf(led) {
  const h = led[0], c = n => h.indexOf(n), s = {};
  for (const r of led.slice(1)) {
    const p = String(r[c('POPID')] || '').trim(); if (!p) continue;
    s[p] = { emp: String(r[c('EmployerBizId')] || '').trim(), inc: Number(r[c('Income')]) || 0, clock: String(r[c('ClockMode')] || '').trim(),
      econ: String(r[c('EconomicProfileKey')] || '').trim(), tier: Number(r[c('Tier')]) || 4, role: String(r[c('RoleType')] || '').trim(),
      status: String(r[c('Status')] || '').trim(), tags: String(r[c('SkillTags')] || '').trim() };
  }
  return s;
}
(async () => {
  const led = await tab(SHEET, 'Simulation_Ledger');
  const now = snapOf(led);
  if (snapOnly) { fs.writeFileSync(O + '2026-10-22-e307-snap-' + label + '-c' + cyc + '.json', JSON.stringify(now)); console.log('snap ' + label + ' C' + cyc + ': ' + Object.keys(now).length + ' rows'); return; }
  const prev = prevLabel ? JSON.parse(fs.readFileSync(O + '2026-10-22-e307-snap-' + prevLabel + '-c' + (cyc - 1) + '.json', 'utf8'))
    : snapOf(await tab(BASE, 'Simulation_Ledger'));
  const bl = await tab(SHEET, 'Business_Ledger'), bh = bl[0];
  const name = {}, stated = {};
  for (const r of bl.slice(1)) { const id = String(r[bh.indexOf('BIZ_ID')]).trim(); name[id] = r[bh.indexOf('Name')]; if (SPORTS.includes(id)) stated[id] = r[bh.indexOf('Employee_Count')]; }
  const out = { cycle: cyc, label, prev: prevLabel || 'BASELINE-1004-C112b', ontoSports: [], offSports: [], athleteGuard: { careerMoves: [], incomeOnly: 0 }, log: { sports: [], elsewhere: {} }, statedSports: stated };
  for (const p in now) {
    const a = prev[p], b = now[p]; if (!a) continue;
    // codex gate item 2/4: the sports layer's markers, or a row that reads as a player or coach (runCareerEngine.js sportsHireBars_)
    const athlete = b.clock === 'GAME' || b.econ === 'SPORTS_OVERRIDE' || b.tags.split('|').some(t => t.trim().toLowerCase() === 'athlete') ||
      /\b(athlete|player|pitcher|catcher|infielder|outfielder|shortstop|closer|point guard|quarterback|coach|scout)\b/i.test(a.role);
    if (a.emp !== b.emp) {
      const rec = { pop: p, from: a.emp, to: b.emp, toName: name[b.emp] || '', clock: b.clock, econ: b.econ, tier: b.tier, role: b.role, roleBefore: a.role };
      if (SPORTS.includes(b.emp)) out.ontoSports.push(rec);
      if (SPORTS.includes(a.emp)) out.offSports.push(rec);
      if (athlete) out.athleteGuard.careerMoves.push(rec);
    } else if (athlete && a.inc !== b.inc) out.athleteGuard.incomeOnly++;
  }
  const lg = await tab(SHEET, 'LifeHistory_Log'), lh = lg[0];
  const iP = 1, iT = 3, iX = 4, iC = lh.length - 1;
  for (const r of lg.slice(1)) {
    if (Number(String(r[iC]).replace(/^C/, '')) !== cyc) continue;
    const tag = String(r[iT] || '');
    if (!/^(Career-Hired|Career-FieldChange|Promotion|Career-Layoff)/.test(tag)) continue;
    const pop = String(r[iP] || '').trim(), emp = (now[pop] || {}).emp, text = String(r[iX] || '');
    const atSports = SPORTS.some(id => text.indexOf(String(name[id])) >= 0) || (SPORTS.includes(emp) && /Promotion/.test(tag));
    if (atSports) out.log.sports.push({ pop, tag, text, clock: (now[pop] || {}).clock, econ: (now[pop] || {}).econ, roleBefore: (prev[pop] || {}).role, tags: (now[pop] || {}).tags });
    else out.log.elsewhere[tag] = (out.log.elsewhere[tag] || 0) + 1;
  }
  fs.writeFileSync(O + '2026-10-22-e307-snap-' + label + '-c' + cyc + '.json', JSON.stringify(now));
  fs.writeFileSync(O + '2026-10-22-e307-check-' + label + '-c' + cyc + '.json', JSON.stringify(out, null, 1));
  // FAIL: a sports-layer row (GAME / SPORTS_OVERRIDE) moved anywhere, or any athlete-shaped row moved onto a sports org. An ENGINE
  // player-shaped row hired at a shop is the pre-307 path, reported in careerMoves, not failed.
  const verdict = out.athleteGuard.careerMoves.filter(m => SPORTS.includes(m.to) || m.clock === 'GAME' || m.econ === 'SPORTS_OVERRIDE').length === 0 &&
    out.log.sports.every(x => x.clock !== 'GAME' && x.econ !== 'SPORTS_OVERRIDE' && !/\b(athlete|player|pitcher|catcher|infielder|outfielder|shortstop|closer|point guard|quarterback|coach|scout)\b/i.test(x.roleBefore || '')) ? 'PASS' : 'FAIL';
  console.log('C' + cyc + ' ' + label + ': onto sports ' + out.ontoSports.length + ', off sports ' + out.offSports.length + ', sports career lines ' + out.log.sports.length +
    ', elsewhere ' + JSON.stringify(out.log.elsewhere) + ', athlete career moves ' + out.athleteGuard.careerMoves.length + ' (income-only ' + out.athleteGuard.incomeOnly + ') — athlete guard ' + verdict);
  if (verdict !== 'PASS') process.exit(4);
})().catch(e => { console.error(e.message); process.exit(1); });
