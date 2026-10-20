// engine.214 8a Cut B draw probe (codex final gate 2: "measure offered/filtered reaction weights at each real draw").
// The real generator source (HEAD), run in the testNeighborhoodLoop harness on the REAL population and hood map of
// BASELINE-1004-C112b (every Active citizen: hood, tier, clock, DialState, TraitProfile, BirthYear, marital), one Cycle per
// seed, many seeds. Two read-only taps: after the engine.32 T5 loop (offered reaction weights) and at each draw slot after
// the recent-text / within-Cycle filters (available reaction weight vs the whole usable pool). Drawn lines are read from the
// rows' LifeHistory. The harness has none of the earlier phases' S fields beyond its fixture, so the rest of each citizen's
// pool is thinner than on the sheet — the absolute rate is not the bench's; the with:against inside the reaction set is.
// usage: node 2026-10-20-e214b-drawprobe.js [seeds=200]   → output/engine-sheet/2026-10-20-e214b-drawprobe.json
require('/root/GodWorld/lib/env');
const BASE = '1Mbz-sE13iu1RU4qo-rzsczjjPRKAU-KSfnQnrJNXCgA';
if (process.env.GODWORLD_SHEET_ID === BASE) throw new Error('env already points at the baseline');
process.env.GODWORLD_SHEET_ID = BASE;
const sheets = require('/root/GodWorld/lib/sheets');
const fs = require('fs'), Module = require('module');
const SEEDS = Number(process.argv[2]) || 200;
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
  const side = (e) => { const up = e.tags.indexOf('dial:outabout:up') >= 0, growth = e.tags.indexOf('state:trajectory-up') >= 0; return (up === growth) ? 'with' : 'against'; };
  const isReact = (e) => (e.tags || []).some(t => t.indexOf('react:') === 0);
  const acc = { offered: { with: 0, against: 0 }, availProb: { with: 0, against: 0 }, slots: 0, slotsWithReact: 0, filteredOut: { with: 0, against: 0 }, drawn: { growth: { with: 0, against: 0 }, decay: { with: 0, against: 0 } }, byReaction: {} };
  global.__t5Tap = (pool) => { for (const e of pool) if (isReact(e)) acc.offered[side(e)] += e.weight; };
  global.__drawTap = (usePool, pool) => {
    acc.slots++;
    let tot = 0; const av = { with: 0, against: 0 };
    for (const e of usePool) { tot += (e.weight || 0); if (isReact(e)) av[side(e)] += e.weight; }
    if (av.with + av.against > 0) acc.slotsWithReact++;
    if (tot > 0) { acc.availProb.with += av.with / tot; acc.availProb.against += av.against / tot; }
    const inUse = new Set(usePool);
    for (const e of pool) if (isReact(e) && !inUse.has(e)) acc.filteredOut[side(e)]++;
  };
  const TXT = [['caught themselves bragging a little about the neighborhood lately', 'growth', 'with', 'brag'], ['felt quietly lucky to call ', 'growth', 'with', 'humble'],
    ['grumbled about the neighborhood over coffee', 'growth', 'against', 'complain'], ['griped about ', 'growth', 'against', 'complain'],
    ["complained about the neighborhood to anyone who'd listen", 'decay', 'with', 'complain'], ['vented about ', 'decay', 'with', 'complain'],
    ['shrugged off the grumbling about ', 'decay', 'against', 'humble'], ['stuck up for the neighborhood to a friend across town', 'decay', 'against', 'defend']];
  for (let seed = 1; seed <= SEEDS; seed++) {
    rngImpl = mulberry32(9000 + seed);
    const rows = LEDGER.map(r => r.slice());
    const ss = memSS({ 'Neighborhood_Map': memSheet('Neighborhood_Map', MAP.map(r => r.slice())),
      'LifeHistory_Log': memSheet('LifeHistory_Log', [['Timestamp', 'Cycle', 'POPID', 'Name', 'Event', 'Tag']]) });
    gen(makeCtx(113, rows, ss));
    for (const r of rows) for (const line of String(r[iLife] || '').split('\n')) {
      const m = /\] (.*)$/.exec(line); if (!m) continue;
      const t = TXT.find(([n]) => m[1].indexOf(n) === 0); if (!t) continue;
      acc.drawn[t[1]][t[2]]++; acc.byReaction[t[1] + ':' + t[3]] = (acc.byReaction[t[1] + ':' + t[3]] || 0) + 1;
    }
  }
  delete global.__t5Tap; delete global.__drawTap;
  return acc;
`;
(async () => {
  const nm = await sheets.getSheetData('Neighborhood_Map');
  const sl = await sheets.getSheetData('Simulation_Ledger'), s = sl[0];
  const HEAD = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'BirthYear', 'MaritalStatus', 'NumChildren', 'TraitProfile', 'DialState'];
  const LEDGER = sl.slice(1).filter(r => r[s.indexOf('Status')] === 'Active')
    .map(r => HEAD.map(hh => hh === 'LifeHistory' || hh === 'LastUpdated' ? '' : (s.indexOf(hh) >= 0 ? r[s.indexOf(hh)] : '')));
  const req = Module.createRequire('/root/GodWorld/scripts/testNeighborhoodLoop.js');
  const fn = new Function('require', '__dirname', 'MAP', 'LEDGER', 'SEEDS', PRE + '\n' + MAIN);
  const t0 = Date.now();
  const acc = fn(req, '/root/GodWorld/scripts', nm, LEDGER, SEEDS);
  const share = (o) => (o.with / Math.max(1e-9, o.with + o.against));
  const d = acc.drawn, gw = share(d.growth), dw = share(d.decay);
  const out = { seeds: SEEDS, citizens: LEDGER.length, ms: Date.now() - t0,
    offeredWithShare: +share(acc.offered).toFixed(4), expectedWithShareAtDraw: +share(acc.availProb).toFixed(4),
    drawnWithShare: +share({ with: d.growth.with + d.decay.with, against: d.growth.against + d.decay.against }).toFixed(4),
    growthSide: Object.assign({ withShare: +gw.toFixed(4) }, d.growth), decaySide: Object.assign({ withShare: +dw.toFixed(4) }, d.decay),
    byReaction: acc.byReaction, slots: acc.slots, slotsWithReactionAvailable: acc.slotsWithReact, reactionEntriesFilteredOutAtDraw: acc.filteredOut };
  fs.writeFileSync('/root/GodWorld/output/engine-sheet/2026-10-20-e214b-drawprobe.json', JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
