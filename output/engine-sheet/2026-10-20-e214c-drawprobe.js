// engine.214 8a Cut C draw probe (codex Cut C recheck, reach HOLD: "measure T, participation, availability and actual draws").
// The real generator source (HEAD), in the testNeighborhoodLoop harness, on the REAL population and hood map of
// BASELINE-1004-C112b, one Cycle per seed. S.hoodSpots is built the way applyBusinessDynamics_ builds it, from the baseline's
// Business_Ledger (open food / retail rows, parent hood), streak = the baseline's carried C112 streak, last Cycle's = C111 —
// plus stubs so every line is seen: a minor_fire on Ivy Hill's first spot, a major_blaze_contained on Downtown's first,
// a transformer_blowout on Temescal's first, a forced_temporary_closure on Lake Merritt's only spot, a recovery on Rockridge's
// first (last Cycle's streak 3, now 0), and the game-week lift on every food spot in Jack London, Downtown and Uptown.
// Two read-only taps: after the T5 loop (offered spot weight by event) and at each draw slot after the recent-text and
// within-Cycle filters (spot weight vs the whole usable pool). The harness pool is thinner than the sheet's (it lacks earlier
// phases' S fields), so the spot share here is an upper bound; the per-event split and who-draws-what are the read.
// usage: node 2026-10-20-e214c-drawprobe.js [seeds=100]   → output/engine-sheet/2026-10-20-e214c-drawprobe.json
require('/root/GodWorld/lib/env');
const BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
if (process.env.GODWORLD_SHEET_ID === BASE) throw new Error('env already points at the baseline');
process.env.GODWORLD_SHEET_ID = BASE;
const sheets = require('/root/GodWorld/lib/sheets');
const fs = require('fs'), Module = require('module');
global.Logger = { log() {} };
const BD = require('/root/GodWorld/phase05-citizens/applyBusinessDynamics.js');
const SEEDS = Number(process.argv[2]) || 100;
const testSrc = fs.readFileSync('/root/GodWorld/scripts/testNeighborhoodLoop.js', 'utf8');
const PRE = testSrc.slice(0, testSrc.indexOf("console.log('═══ C1"));
if (PRE.length < 1000) throw new Error('harness preamble not found');
const MAIN = String.raw`
  const genSrc = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/generateCitizensEvents.js'), 'utf8');
  const T5_AT = '    // engine.94 Task 3: grief biases the already-built ordinary pool once per';
  const DRAW_AT = '    var entry = null;\n    if (reservedGriefEntry) {';
  if (genSrc.split(T5_AT).length !== 2 || genSrc.split(DRAW_AT).length !== 2) throw new Error('probe anchors not found exactly once');
  const probed = genSrc.replace(T5_AT, '    if (global.__t5Tap) global.__t5Tap(pool);\n' + T5_AT)
                       .replace(DRAW_AT, '    if (global.__drawTap) global.__drawTap(usePool, pool);\n' + DRAW_AT);
  const gen = new Function(SCOPE_SRC + '\n' + probed + '\nreturn generateCitizensEvents_;')();
  const evOf = (e) => { const t = (e.tags || []).find(x => x.indexOf('spot:') === 0); return t ? t.slice(5) : null; };
  const acc = { offered: {}, offeredCitizens: 0, slots: 0, slotsWithSpot: 0, spotShareAtDraw: 0, poolMassAtDraw: 0, filteredOut: 0, drawn: {}, drawnByHood: {} };
  global.__t5Tap = (pool) => { let any = false; for (const e of pool) { const ev = evOf(e); if (ev) { acc.offered[ev] = (acc.offered[ev] || 0) + e.weight; any = true; } } if (any) acc.offeredCitizens++; };
  global.__drawTap = (usePool, pool) => {
    let tot = 0, sp = 0; for (const e of usePool) { tot += (e.weight || 0); if (evOf(e)) sp += e.weight; }
    if (sp === 0) { for (const e of pool) if (evOf(e)) acc.filteredOut++; return; }
    acc.slots++; acc.slotsWithSpot++; acc.spotShareAtDraw += sp / tot; acc.poolMassAtDraw += tot;
    const inUse = new Set(usePool); for (const e of pool) if (evOf(e) && !inUse.has(e)) acc.filteredOut++;
  };
  const TXT = [['had a small fire this week', 'minor_fire'], ['had a fire this week — contained', 'major_blaze_contained'],
    ['went dark when a transformer blew', 'transformer_blowout'], ['was temporarily shut pending an inspection', 'forced_temporary_closure'],
    ['go quiet lately', 'quiet'], ['let some staff go', 'shed'], ['steadier again', 'recovery'], ['felt a lift at ', 'lift']];
  const hoodOf = {}; LEDGER.forEach(r => { hoodOf[r[0]] = r[10]; });
  for (let seed = 1; seed <= SEEDS; seed++) {
    rngImpl = mulberry32(7000 + seed);
    const rows = LEDGER.map(r => r.slice());
    const ss = memSS({ 'Neighborhood_Map': memSheet('Neighborhood_Map', MAP.map(r => r.slice())),
      'LifeHistory_Log': memSheet('LifeHistory_Log', [['Timestamp', 'Cycle', 'POPID', 'Name', 'Event', 'Tag']]) });
    const ctx = makeCtx(113, rows, ss);
    ctx.summary.hoodSpots = SPOTS;
    gen(ctx);
    for (const r of rows) for (const line of String(r[iLife] || '').split('\n')) {
      const t = TXT.find(([n]) => line.indexOf(n) >= 0); if (!t) continue;
      acc.drawn[t[1]] = (acc.drawn[t[1]] || 0) + 1;
      const k = hoodOf[r[0]] + ':' + t[1]; acc.drawnByHood[k] = (acc.drawnByHood[k] || 0) + 1;
    }
  }
  delete global.__t5Tap; delete global.__drawTap;
  return acc;
`;
const num = (v) => Number(String(v).replace(/^C/, ''));
(async () => {
  const nm = await sheets.getSheetData('Neighborhood_Map'), nh = nm[0];
  const canon = {}, child = {};
  nm.slice(1).forEach(r => {
    const hood = String(r[nh.indexOf('Neighborhood')]).trim(); canon[hood.toLowerCase()] = hood;
    String(r[nh.indexOf('ChildAreas')] || '').split(',').map(s => s.trim()).filter(Boolean).forEach(c => { if (!child[c.toLowerCase()]) child[c.toLowerCase()] = hood; });
  });
  const fold = (h) => { const k = String(h || '').trim().toLowerCase(); return canon[k] || child[k] || null; };
  const cf = await sheets.getSheetData('Carry_Forward_Store');
  const blob = (c) => { const r = cf.slice(1).find(x => x[0] === 'PREV_CYCLE_STATE_JSON' && num(x[1]) === c); return r ? (JSON.parse(r[3]).businessDynamics || {}) : {}; };
  const b112 = blob(112), b111 = blob(111);
  const bl = await sheets.getSheetData('Business_Ledger'), bh = bl[0];
  const SPOTS = {};
  bl.slice(1).forEach(r => {
    const id = String(r[bh.indexOf('BIZ_ID')] || '').trim(), name = String(r[bh.indexOf('Name')] || '').trim();
    const cls = BD.bizSectorClass_(r[bh.indexOf('Sector')]), hood = fold(r[bh.indexOf('Neighborhood')]);
    const st = b112[id] || [0, 0, 0], ps = b111[id] || [0, 0, 0];
    if (!id || !name || !hood || (cls !== 'food' && cls !== 'retail') || st[2]) return;
    const streak = Number(st[0]) || 0;
    (SPOTS[hood] = SPOTS[hood] || []).push({ id, name, cls, streak, prevStreak: Number(ps[0]) || 0, shed: streak > 4 ? 1 : 0, lift: false, chaos: [] });
  });
  const stub = { 'Ivy Hill': (s) => s.chaos.push('minor_fire'), 'Downtown': (s) => s.chaos.push('major_blaze_contained'),
    'Temescal': (s) => s.chaos.push('transformer_blowout'), 'Lake Merritt': (s) => s.chaos.push('forced_temporary_closure'),
    'Rockridge': (s) => { s.prevStreak = 3; s.streak = 0; } };
  for (const [h, f] of Object.entries(stub)) if (SPOTS[h]) f(SPOTS[h][0]);
  for (const h of ['Jack London', 'Downtown', 'Uptown']) (SPOTS[h] || []).forEach(s => { if (s.cls === 'food') s.lift = true; });
  const sl = await sheets.getSheetData('Simulation_Ledger'), s = sl[0];
  const HEAD = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'BirthYear', 'MaritalStatus', 'NumChildren', 'TraitProfile', 'DialState'];
  const LEDGER = sl.slice(1).filter(r => r[s.indexOf('Status')] === 'Active')
    .map(r => HEAD.map(hh => hh === 'LifeHistory' || hh === 'LastUpdated' ? '' : (s.indexOf(hh) >= 0 ? r[s.indexOf(hh)] : '')));
  const req = Module.createRequire('/root/GodWorld/scripts/testNeighborhoodLoop.js');
  const fn = new Function('require', '__dirname', 'MAP', 'LEDGER', 'SEEDS', 'SPOTS', PRE + '\n' + MAIN);
  const t0 = Date.now();
  const acc = fn(req, '/root/GodWorld/scripts', nm, LEDGER, SEEDS, SPOTS);
  const per = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +(v / SEEDS).toFixed(2)]));
  const out = { seeds: SEEDS, citizens: LEDGER.length, ms: Date.now() - t0,
    spotStates: Object.fromEntries(Object.entries(SPOTS).map(([h, l]) => [h, l.filter(x => x.streak >= 2 || x.shed || x.lift || x.chaos.length || (x.prevStreak >= 2 && x.streak === 0)).map(x => x.name)]).filter(([, l]) => l.length)),
    citizensOfferedASpotLinePerCycle: +(acc.offeredCitizens / SEEDS).toFixed(1), offeredWeightPerCycle: per(acc.offered),
    drawSlotsWithASpotLineAvailablePerCycle: +(acc.slotsWithSpot / SEEDS).toFixed(1),
    meanSpotShareOfUsablePoolAtThoseSlots: acc.slotsWithSpot ? +(acc.spotShareAtDraw / acc.slotsWithSpot).toFixed(4) : 0,
    meanUsablePoolMassAtThoseSlots: acc.slotsWithSpot ? +(acc.poolMassAtDraw / acc.slotsWithSpot).toFixed(1) : 0,
    spotEntriesFilteredOutAtDrawPerCycle: +(acc.filteredOut / SEEDS).toFixed(1),
    drawnPerCycle: per(acc.drawn), drawnPerCycleByHood: per(acc.drawnByHood) };
  fs.writeFileSync('/root/GodWorld/output/engine-sheet/2026-10-20-e214c-drawprobe.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
