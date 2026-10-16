/**
 * contentLedgerCompose.test.js — engine.38 Design A composer + pool injection
 * (seams Task 11, S289). Full pipeline: real loader (mock sheet rows) → real
 * generateCitizensEvents_ (mock ctx), proving:
 *   - empty ledger -> zero ledger lines drawn, no throw (additive no-op)
 *   - seeded ledger + fixed seed -> byte-identical output across two runs
 *   - $SLOT fills from fragments; NO raw $TOKEN ever reaches LifeHistory
 *   - conditions gate per citizen (wealth<=3 line never lands on a rich citizen)
 *   - fragment conditions gate (hood-gated fragment never renders for wrong hood)
 *   - unfillable line (slot with zero eligible fragments) never enters pool
 *   - routing: source:qol first tag -> [QoL] primary in LifeHistory
 *   - entity slot $VENUE resolves code-side, no double "near" append
 *
 * Run: node scripts/contentLedgerCompose.test.js
 */

const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
const M = require('../utilities/citizenDialMap.js');
const C = require('../utilities/compressLifeHistory.js');
global.getCitizenDialBands_ = () => null;
global.hoodTexturePool_ = (ctx, hood, byLabel, bespoke) => (bespoke && bespoke[hood] ? bespoke[hood].slice() : []); // engine.148 P3: hood texture stubbed to the bespoke lines
global.getGriefConfig_ = C.getGriefConfig_;
global.activeGriefFromRegisters_ = C.activeGriefFromRegisters_;

const GRIEF_CONFIG = {
  griefDurationCycles: 3,
  griefHolidayDurationCycles: 5,
  griefParticipationMultiplier: 0.80,
  griefPublicActivityMultiplier: 0.75,
  griefSupportMultiplier: 1.25,
  griefResponseChance: 0.35
};
global.Utilities = { formatDate: () => 'STAMP' };
global.Session = { getScriptTimeZone: () => 'UTC' };
global.inWorldStamp_ = (ctx) => 'C' + ((ctx && ctx.config && ctx.config.cycleCount) || 0);

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// engine.164: only the calendar's two sim-year functions ride into this sandbox (the whole file would shadow the stubs above)
const simYearSrc_ = () => { const s = fs.readFileSync(path.resolve(__dirname, '../phase01-config/advanceSimulationCalendar.js'), 'utf8'); return s.match(/function simYearFromCycle_[\s\S]*?\n}\n/)[0] + s.match(/function simYearOf_[\s\S]*?\n}\n/)[0]; };
const genSrc = fs.readFileSync(path.resolve(__dirname, '../utilities/sportsWeekRecord.js'), 'utf8') + simYearSrc_() + fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/generateCitizensEvents.js'), 'utf8');
const generateCitizensEvents_ = new Function(genSrc + '\nreturn generateCitizensEvents_;')();
const loaderSrc = fs.readFileSync(path.resolve(__dirname, '../phase02-world-state/loadEventContentLedger.js'), 'utf8');
const loadEventContentLedger_ = new Function(loaderSrc + '\nreturn loadEventContentLedger_;')();
const loadUndockedFeed_ = new Function(loaderSrc + '\nreturn loadUndockedFeed_;')(); // engine.291: the board + the airing pilots

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const HEADERS = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'LifeHistory', 'LastUpdated',
  'Neighborhood', 'BirthYear', 'Occupation', 'TierRole', 'Type', 'TraitProfile', 'UsageCount',
  'MemoryRegisters', 'Status', 'MaritalStatus', 'NumChildren', 'WealthLevel', 'DisplacementRisk'];

function makeRow(popId, opts) {
  const o = opts || {};
  return [popId, 'Test', popId, 3, 'ENGINE', o.life || '', '',
    o.hood || 'Temescal', 1990, o.occ || 'teacher', '', '', '', 0,
    '', o.status || '', o.marital || '', o.children || 0,
    o.wealth != null ? o.wealth : '', o.displ || 0];
}

const LEDGER_HDR = ['Kind', 'PoolKey', 'Slot', 'Text', 'Weight', 'Conditions', 'Tags', 'Grain', 'Active'];

function makeCtx(rows, rng, ledgerRows, feedRows) {
  const ctx = {
    now: new Date(0),
    rng,
    config: { ...GRIEF_CONFIG, gcSurfaceChance: 0.06, hoodFloorSurfaceQuota: 0 }, // engine.148 dials (self-armed on World_Config in prod)
    ss: {
      getSheetByName: (name) => {
        if (name === 'Event_Content_Ledger' && ledgerRows) {
          return { getDataRange: () => ({ getValues: () => ledgerRows }) };
        }
        if (name === 'Undocked_Feed' && feedRows) {
          return { getDataRange: () => ({ getValues: () => feedRows }) };
        }
        return null;
      }
    },
    summary: { cycleId: 100, season: 'Summer', economicMood: 50 },
    ledger: { headers: HEADERS.slice(), rows, dirty: false }
  };
  loadEventContentLedger_(ctx); // real Phase-2 loader feeds the generator
  return ctx;
}

function emittedLines(ctx) {
  const out = [];
  for (const r of ctx.ledger.rows) out.push(String(r[5] || ''));
  return out;
}

// Ledger fixture: high weights so seeded lines actually get drawn in trials.
const FIXTURE = [
  LEDGER_HDR,
  ['line', 'test.tight', '', 'counted the register twice, $MOOD', '50', 'wealth<=3', 'source:economy', '', ''],
  ['line', 'test.venue', '', 'lingered at $VENUE past closing, $MOOD', '50', '', 'source:neighborhood', '', ''],
  ['line', 'test.unfillable', '', 'stared into $VOID for an hour', '50', '', 'source:qol', '', ''],
  ['fragment', '', 'MOOD', 'satisfied with the small win', '', '', '', '', ''],
  ['fragment', '', 'MOOD', 'uneasy about the week ahead', '', '', '', '', ''],
  ['fragment', '', 'MOOD', 'temescal-only calm settling in', '', 'hood=Temescal', '', '', '']
  // note: no fragments registered for VOID — test.unfillable must never enter a pool
];

console.log('═══ Empty ledger = additive no-op');
{
  let threw = false;
  const rows = [makeRow('POP-T0'), makeRow('POP-T1')];
  const ctx = makeCtx(rows, mulberry32(42), null); // missing tab
  try { generateCitizensEvents_(ctx); } catch (e) { threw = true; }
  assert('missing tab: generator runs clean', !threw);
  const ctx2 = makeCtx([makeRow('POP-T0')], mulberry32(42), [LEDGER_HDR]); // header-only tab
  try { generateCitizensEvents_(ctx2); } catch (e) { threw = true; }
  assert('header-only tab: generator runs clean', !threw);
}

console.log('═══ Determinism: fixed seed × fixed ledger = identical output');
{
  const run = (seed) => {
    const rows = [makeRow('POP-T0', { wealth: 2 }), makeRow('POP-T1', { wealth: 9 }), makeRow('POP-T2')];
    const ctx = makeCtx(rows, mulberry32(seed), FIXTURE);
    generateCitizensEvents_(ctx);
    return emittedLines(ctx).join('||');
  };
  assert('two runs, same seed -> byte-identical', run(777) === run(777));
  assert('different seed -> different output (sanity)', run(777) !== run(778));
}

console.log('═══ Composition + fail-closed rules (300 citizen-cycles)');
{
  let rawToken = 0, tightOnRich = 0, temescalFragElsewhere = 0, voidLines = 0, composedSeen = 0, venueComposed = 0, doubleNear = 0;
  for (let s = 1; s <= 100; s++) {
    const rows = [
      makeRow('POP-P0', { wealth: 2, hood: 'Temescal' }),   // poor, Temescal
      makeRow('POP-R1', { wealth: 9, hood: 'Temescal' }),   // rich
      makeRow('POP-E2', { wealth: 2, hood: 'Fruitvale' })   // poor, elsewhere
    ];
    const ctx = makeCtx(rows, mulberry32(s * 7919), FIXTURE);
    generateCitizensEvents_(ctx);
    const lines = emittedLines(ctx);
    for (let i = 0; i < lines.length; i++) {
      const txt = lines[i];
      if (/\$[A-Z_]+/.test(txt)) rawToken++;
      if (txt.indexOf('stared into') >= 0) voidLines++;
      if (i === 1 && txt.indexOf('counted the register') >= 0) tightOnRich++;
      if (i === 2 && txt.indexOf('temescal-only calm') >= 0) temescalFragElsewhere++;
      if (txt.indexOf('counted the register') >= 0 || txt.indexOf('lingered at') >= 0) composedSeen++;
      if (txt.indexOf('lingered at') >= 0) {
        venueComposed++;
        // $VENUE filled AND generic append suppressed -> at most one venue mention
        const nearCount = (txt.match(/ near /g) || []).length;
        if (txt.indexOf('lingered at $VENUE') >= 0) rawToken++;
        const lineOfInterest = txt.split('\n').find(l => l.indexOf('lingered at') >= 0) || '';
        if (/ near .* near /.test(lineOfInterest)) doubleNear++;
      }
    }
  }
  assert('composed ledger lines were drawn in trials', composedSeen > 0, `composed=${composedSeen}`);
  // S289 C102 rehearsal fix: same skeleton must never emit twice for one
  // citizen in one cycle, even when weight dominance makes re-draws likely.
  {
    let skeletonRepeats = 0;
    for (let s = 1; s <= 60; s++) {
      const rows = [makeRow('POP-D0', { wealth: 2, hood: 'Temescal' })];
      const ctx = makeCtx(rows, mulberry32(s * 31337), FIXTURE);
      generateCitizensEvents_(ctx);
      const lines = emittedLines(ctx)[0].split('\n');
      const hits = lines.filter(l => l.indexOf('counted the register twice') >= 0).length
        + 0; // skeleton-1 occurrences for this citizen this cycle
      const hits2 = lines.filter(l => l.indexOf('lingered at') >= 0).length;
      if (hits > 1 || hits2 > 1) skeletonRepeats++;
    }
    assert('same skeleton never emits twice per citizen per cycle', skeletonRepeats === 0, `repeats=${skeletonRepeats}`);
  }
  assert('NO raw $TOKEN ever reaches LifeHistory', rawToken === 0, `raw=${rawToken}`);
  assert('wealth<=3 line never lands on wealth=9 citizen', tightOnRich === 0, `hits=${tightOnRich}`);
  assert('hood-gated fragment never renders outside Temescal', temescalFragElsewhere === 0, `hits=${temescalFragElsewhere}`);
  assert('line with zero eligible fragments never enters pool', voidLines === 0, `hits=${voidLines}`);
  assert('$VENUE line was composed (entity slot resolves code-side)', venueComposed > 0, `venue=${venueComposed}`);
  assert('no double-venue append on $VENUE lines', doubleNear === 0, `hits=${doubleNear}`);
}

console.log('═══ Routing: ledger line primary tag');
{
  // qol-sourced ledger line must carry [QoL] primary in the LifeHistory line.
  const QOL_FIXTURE = [
    LEDGER_HDR,
    ['line', 'test.qol', '', 'noticed the block feeling looked-after', '80', '', 'source:qol', '', '']
  ];
  let taggedLine = null;
  for (let s = 1; s <= 200 && !taggedLine; s++) {
    const ctx = makeCtx([makeRow('POP-T0')], mulberry32(s * 104729), QOL_FIXTURE);
    generateCitizensEvents_(ctx);
    const line = emittedLines(ctx)[0].split('\n').find(l => l.indexOf('looked-after') >= 0);
    if (line) taggedLine = line;
  }
  assert('source:qol ledger line routes [QoL] primary',
    taggedLine !== null && taggedLine.indexOf('[QoL]') >= 0, taggedLine || 'never drawn in 200 seeds');
}

console.log('═══ engine.94 B.2a: memory rows route through the dial vocabulary');
{
  // First tag source:continuity (the loader whitelist); the memory: tag picks the
  // primary that moves the dial. No memory: tag = a plain day, as before.
  const ROUTES = [
    ['memory:strain', '[Strain]', 'checked the lock twice since the spring'],
    ['memory:community', '[Community]', 'brought a plate to the block table again'],
    ['memory:rivalry', '[Rivalry]', 'crossed the street rather than share the corner'],
    ['', '[Continuity]', 'kept the receipt in the kitchen drawer']
  ];
  for (const [tag, primary, text] of ROUTES) {
    const FIX = [LEDGER_HDR, ['line', 'test.memory', '', text, '80', '', 'source:continuity' + (tag ? ',' + tag : ''), '', '']];
    let drawn = null;
    for (let s = 1; s <= 200 && !drawn; s++) {
      const ctx = makeCtx([makeRow('POP-T0')], mulberry32(s * 7919), FIX);
      generateCitizensEvents_(ctx);
      drawn = emittedLines(ctx)[0].split('\n').find(l => l.indexOf(text) >= 0) || null;
    }
    assert((tag || 'bare source:continuity') + ' routes ' + primary,
      drawn !== null && drawn.indexOf(primary) >= 0, drawn || 'never drawn in 200 seeds');
  }
}

console.log('═══ engine.208 C5: the sports picker');
{
  global.SPORTS_WEEK_TAG_ = require('../utilities/sportsWeekRecord.js').SPORTS_WEEK_TAG_;
  const SPORTS_FIXTURE = [
    LEDGER_HDR,
    ['line', 'sports.as', '', 'wore the green cap to the corner store', '80', '', 'source:sports', '', ''],
    ['line', 'sports.oaks', '', 'argued the Oaks rotation at the barbershop', '80', '', 'source:sports', '', ''],
    ['line', 'sports.citywide', '', 'heard a game through an open window', '80', '', 'source:sports', '', ''],
    ['line', 'test.fan', '', 'planned the whole night around the game', '80', 'fandom>=60', 'source:neighborhood', '', '']
  ];
  const weeks = { "A's": { cls: 'TITLE' }, Oaks: { cls: 'LOSING_WEEK' } };
  const prevBands = global.getCitizenDialBands_;
  const mult = { drive: 1, sociability: 1, warmth: 1, openness: 1, composure: 1, integrity: 1, family: 1, outabout: 1, fandom: 1 };
  global.getCitizenDialBands_ = (ctx, popId) => ({ mult, current: { warmth: 50, drive: 50, fandom: popId === 'POP-FAN' ? 70 : 40 } });
  const seen = { as: null, oaks: null, city: null }; let gameSports = 0, fanGateWrong = 0, fanGateRight = 0;
  for (let s = 1; s <= 200; s++) {
    const player = makeRow('POP-GAME'); player[4] = 'GAME';
    const rows = [makeRow('POP-FAN'), makeRow('POP-COLD'), player];
    const ctx = makeCtx(rows, mulberry32(s * 2741), SPORTS_FIXTURE);
    ctx.summary.sportsWeek = weeks;
    generateCitizensEvents_(ctx);
    const L = emittedLines(ctx).map((t) => t.split('\n'));
    for (const line of L[0].concat(L[1])) {
      if (line.indexOf('green cap') >= 0) seen.as = seen.as || line;
      if (line.indexOf('Oaks rotation') >= 0) seen.oaks = seen.oaks || line;
      if (line.indexOf('open window') >= 0) seen.city = seen.city || line;
    }
    gameSports += L[2].filter((l) => /green cap|Oaks rotation|open window/.test(l)).length;
    fanGateRight += L[0].filter((l) => l.indexOf('planned the whole night') >= 0).length;
    fanGateWrong += L[1].filter((l) => l.indexOf('planned the whole night') >= 0).length;
  }
  global.getCitizenDialBands_ = prevBands;
  assert('an A\'s pool line in a title week reads [Sports-Title]', seen.as && seen.as.indexOf('[Sports-Title]') >= 0, seen.as || 'never drawn');
  assert('an Oaks pool line in a losing week reads [Sports-LosingWeek]', seen.oaks && seen.oaks.indexOf('[Sports-LosingWeek]') >= 0, seen.oaks || 'never drawn');
  assert('a citywide sports line stays a plain [Sports] day', seen.city && seen.city.indexOf('[Sports]') >= 0, seen.city || 'never drawn');
  assert('a GAME-clock citizen never draws a spectator line', gameSports === 0, `hits=${gameSports}`);
  assert('fandom>=60 row reaches the fan', fanGateRight > 0, `hits=${fanGateRight}`);
  assert('fandom>=60 row never reaches fandom 40', fanGateWrong === 0, `hits=${fanGateWrong}`);
}

console.log('═══ engine.94 B.1: one bounded history build from fixtures');
{
  const owner = makeRow('POP-TEST-OWNER', { hood: 'Fixture Hood',
    life: 'Y2C48 — [RoutineRetrenched] a synthetic closure' });
  const fallback = makeRow('POP-TEST-FALLBACK', { hood: '' });
  fallback[7] = '';
  const ctx = makeCtx([owner, fallback], mulberry32(94), [LEDGER_HDR]);
  ctx.config.folkMemoryWindow = 8;
  ctx.ss.getSheetByName = name => name === 'LifeHistory_Log' ? {
    getLastRow: () => 7,
    getRange: () => ({ setValues: () => {} }),
    getDataRange: () => ({ getValues: () => [
      ['POPID', 'EventTag', 'Neighborhood', 'Cycle'],
      ['POP-TEST-OWNER', 'Death|source:death', '', 93],
      ['POP-TEST-OWNER', 'Critical|source:health', 'Wrong Log Hood', 100],
      ['POP-TEST-OWNER', 'Death|source:death', '', 92],
      ['POP-TEST-OWNER', 'Death|source:death', '', 89],
      ['POP-TEST-OWNER', 'Death|source:death', '', 88],
      ['POP-TEST-FALLBACK', 'Hospitalized|source:health', 'Fallback Fixture Hood', 99]
    ] })
  } : null;
  ctx.cache = { getData: name => name === 'Judicial_Ledger' ? {
    exists: true, values: [
      ['POPID', 'Neighborhood', 'ArrestCycle'],
      ['POP-TEST-OWNER', 'Fixture Hood', 99],
      ['POP-TEST-OWNER', 'Fixture Hood', 90]
    ]
  } : null };
  generateCitizensEvents_(ctx);
  const m = ctx.summary.folkMemory;
  assert('ledger hood wins over log; window excludes C92',
    m.byHood['Fixture Hood'].Death === 1 && m.byHood['Fixture Hood'].Critical === 1 &&
    !m.byHood['Wrong Log Hood']);
  assert('blank ledger hood falls back to log Neighborhood',
    m.byHood['Fallback Fixture Hood'].Hospitalized === 1);
  assert('closure stamp and Judicial_Ledger arrest contribute once in window',
    m.byHood['Fixture Hood'].RoutineRetrenched === 1 && m.byHood['Fixture Hood'].Charged === 1 &&
    m.byCitizen['POP-TEST-OWNER'].Charged === 99);
  const capped = makeCtx([makeRow('POP-TEST-OWNER', { hood: 'Fixture Hood' })], mulberry32(95), [LEDGER_HDR]);
  capped.config.folkMemoryWindow = 52;
  capped.ss = ctx.ss;
  capped.cache = ctx.cache;
  generateCitizensEvents_(capped);
  assert('operator window above 12 is capped to 12 Cycles',
    capped.summary.folkMemory.byHood['Fixture Hood'].Death === 3 &&
    capped.summary.folkMemory.byHood['Fixture Hood'].Charged === 2);
}

console.log('═══ engine.290 move 6: transit commute lines from the ledger');
{
  const parse = new Function(loaderSrc + '\nreturn parseContentConditions_;')();
  const terms = parse('transitdisrupted');
  assert('loader accepts the transitdisrupted flag', Array.isArray(terms) && terms.length === 1 && terms[0].op === 'flag');
  assert('the flag takes no operator', parse('transitdisrupted=1') === null);
  const mass = new Function(genSrc + '\nreturn transitCommuteMass_;')();
  const pool = [{ weight: 1.15, transitCommute: true }, { weight: 1.15, transitCommute: true }, { weight: 2.3, transitCommute: true }, { weight: 1, text: 'other' }];
  mass(pool);
  const tm = pool.filter(e => e.transitCommute).reduce((a, e) => a + e.weight, 0);
  assert('commute rows hold the old single line\'s 1.15 mass, split by Weight', Math.abs(tm - 1.15) < 1e-9 && Math.abs(pool[2].weight - 0.575) < 1e-9 && pool[3].weight === 1);
  const trainHoods = new Function(genSrc + '\nreturn transitChaosTrainHoods_;')();
  assert('a chaos-train hit with a delay makes its hood affected; a clean run does not',
    trainHoods({ chaosTransit: { hits: [{ h: 'Fruitvale', d: 0.06 }, { h: 'Rockridge', d: 0 }] } }).join() === 'Fruitvale');

  const TP = require('./transitEclPool');
  const commuteTexts = TP.ROWS.filter(r => r.PoolKey === 'occupation.transit').map(r => r.Text);
  const ledger = [LEDGER_HDR].concat(TP.toSheetValues());
  const hadLS = global.deriveLifeState_;
  global.deriveLifeState_ = (o) => String(o.status || '').toLowerCase() === 'retired'
    ? { working: 'retired', band: 'senior', ageBand: 'senior', age: 70, isMinor: false }
    : { working: 'working', band: 'adult', ageBand: 'adult', age: 35, isMinor: false };
  const genLS = new Function(genSrc + '\nreturn generateCitizensEvents_;')();
  const commuteCount = (ctx) => emittedLines(ctx).filter(l => commuteTexts.some(t => l.indexOf(t) >= 0)).length;
  const runWith = (rows, transitState, seed) => {
    const ctx = makeCtx(rows, mulberry32(seed), ledger);
    ctx.summary.transitState = transitState;
    genLS(ctx);
    return ctx;
  };
  let working = 0, quiet = 0, retired = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const rows = []; for (let i = 0; i < 60; i++) rows.push(makeRow('POP-W' + seed + '-' + i, { hood: 'Temescal' }));
    working += commuteCount(runWith(rows, { disruptionOngoing: true, affectedHoods: ['Temescal'] }, seed));
    const qrows = []; for (let i = 0; i < 60; i++) qrows.push(makeRow('POP-Q' + seed + '-' + i, { hood: 'Temescal' }));
    quiet += commuteCount(runWith(qrows, { disruptionOngoing: false, affectedHoods: [] }, seed));
    const rrows = []; for (let i = 0; i < 60; i++) rrows.push(makeRow('POP-R' + seed + '-' + i, { hood: 'Temescal', status: 'retired' }));
    retired += commuteCount(runWith(rrows, { disruptionOngoing: true, affectedHoods: ['Temescal'] }, seed));
  }
  let train = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const rows = []; for (let i = 0; i < 60; i++) rows.push(makeRow('POP-T' + seed + '-' + i, { hood: 'Temescal' }));
    const ctx = makeCtx(rows, mulberry32(seed), ledger);
    ctx.summary.transitState = { disruptionOngoing: false, affectedHoods: [] };
    ctx.summary.chaosTransit = { cycle: 100, hits: [{ h: 'Temescal', s: ['MacArthur'], o: 'signal_failure', d: 0.06 }] };
    genLS(ctx);
    train += commuteCount(ctx);
  }
  assert('a chaos-train week on the hood draws commute lines with no system disruption (' + train + ')', train > 0);
  assert('a disruption cycle: working citizens draw commute lines from the ledger (' + working + ')', working > 0);
  assert('no disruption, no chaos train: no commute line ever', quiet === 0, String(quiet));
  assert('a retiree never draws a commute line', retired === 0, String(retired));
  const genSrcNow = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/generateCitizensEvents.js'), 'utf8');
  // a malformed sheet row under the commute PoolKey (no Conditions) still draws only behind the gate
  const loose = [LEDGER_HDR, ['line', 'occupation.transit', '', 'stood under the departures board reading the same delay twice', '50', '', 'source:occupation,transit:disruption', 'citizen', 'yes']];
  let looseQuiet = 0;
  for (let seed = 1; seed <= 4; seed++) {
    const rows = []; for (let i = 0; i < 60; i++) rows.push(makeRow('POP-L' + seed + '-' + i, { hood: 'Temescal' }));
    const ctx = makeCtx(rows, mulberry32(seed), loose);
    ctx.summary.transitState = { disruptionOngoing: false, affectedHoods: [] };
    genLS(ctx);
    looseQuiet += emittedLines(ctx).filter(l => l.indexOf('reading the same delay twice') >= 0).length;
  }
  assert('a commute-PoolKey row with no Conditions never draws when the gate is shut', looseQuiet === 0, String(looseQuiet));
  assert('the inline commute pool is gone from the generator', genSrcNow.indexOf('pickOne([\n        "lost an hour of the morning') < 0 && genSrcNow.indexOf('"waited out the delays with everyone else on the platform"') < 0);
  if (hadLS === undefined) delete global.deriveLifeState_; else global.deriveLifeState_ = hadLS;
}

console.log('═══ engine.291 (research.29 Move 4): the city names who is flying');
{
  // Live Undocked_Feed header (2026-10-16). Holder blank on most rows, as on the
  // C108–C110 pushes — the name must come from the ledger.
  const FEED_HDR = ['TargetCycle', 'Cycle', 'EventType', 'POPID', 'Holder', 'EpisodeId', 'CreditsDelta', 'Systems', 'CombatEvents', 'MishapCount', 'Magnitude', 'Flags'];
  const ep = (target, pop, credits, holder) => [target, target - 1, 'undocked-episode', pop, holder || '', 'ep-' + pop + '-' + target, credits == null ? '' : credits, '', '', '', '', ''];
  const FEED = [
    FEED_HDR,
    ep(98, 'POP-P2', 300),        // aired earlier: 300, not flying tonight
    ep(99, 'POP-P1', 250),        // aired earlier
    ep(100, 'POP-P1', null),      // airing: blank is NOT zero
    ep(100, 'POP-P3', 100),       // airing
    ep(100, 'POP-P1', 50),        // airing: P1 cumulative 300 — ties P2, lower POPID leads
    ep(100, 'POP-P4', null),      // airing, nothing settled
    ep(100, 'POP-P9', 1, 'Ghost Holder'), // airing, no ledger row: Holder is the fallback name
    ep(101, 'POP-P3', 5000)       // approved for NEXT cycle: not aired, must not count
  ];
  const TOKEN_ROWS = [
    ['line', 'culture.spacemolt-show', '', 'watched $PILOT the $PILOTROLE fly and argued about it', '50', 'undocked', 'source:undocked,show:undocked,ecl:kind:watch', '', ''],
    ['line', 'culture.spacemolt-show', '', 'heard $PILOT was in the chair tonight', '50', 'undocked', 'source:undocked,show:undocked,ecl:kind:watch', '', ''],
    ['line', 'culture.spacemolt-show', '', 'said $LEADER still leads the board', '50', 'undocked', 'source:undocked,show:undocked,ecl:kind:argue', '', '']
  ];
  const NOFLAG_ROW = ['line', 'test.noflag', '', 'told everyone $PILOT would be on tonight', '5000', '', 'source:undocked,show:undocked,ecl:kind:watch', '', ''];
  const citizens = (n) => {
    const rows = [
      makeRow('POP-P1', { occ: 'DISTRICT ATTORNEY' }),
      makeRow('POP-P2', { occ: 'Dishwasher' }),
      makeRow('POP-P3', { occ: 'Second Baseman, Oakland A\'s' }),
      makeRow('POP-P4', { occ: 'CBA Compliance Monitor, Fruitvale Transit Hub' })
    ];
    for (let i = 0; i < n; i++) rows.push(makeRow('POP-A' + i, { hood: i % 2 ? 'Temescal' : 'Fruitvale' }));
    return rows;
  };
  const run = (seed, ledgerRows, feedRows, n) => {
    const ctx = makeCtx(citizens(n || 60), mulberry32(seed), ledgerRows, feedRows);
    ctx.config.cycleCount = 100; // loadUndockedFeed_ matches TargetCycle against S.cycle || config.cycleCount
    loadUndockedFeed_(ctx);
    generateCitizensEvents_(ctx);
    return ctx;
  };

  // The loader's board
  const ctxB = run(1, FIXTURE, FEED, 2);
  const board = ctxB.summary.undockedBoard;
  assert('board: leader is cumulative known credits over aired rows, tie -> lower POPID', board.leaderPopId === 'POP-P1' && board.leaderCredits === 300, JSON.stringify(board));
  assert('board: a row approved for a later cycle does not count yet', board.totals['POP-P3'] === 100, JSON.stringify(board.totals));
  assert('board: blank CreditsDelta is not zero', board.totals['POP-P4'] === undefined, JSON.stringify(board.totals));
  assert('airing index holds tonight\'s pilots only', ctxB.summary.undockedPilots['POP-P1'] && ctxB.summary.undockedPilots['POP-P4'] && ctxB.summary.undockedPilots['POP-P9'] && !ctxB.summary.undockedPilots['POP-P2'], JSON.stringify(ctxB.summary.undockedPilots));

  // The composer
  const ROLE = { 'Test POP-P1': 'district attorney', 'Test POP-P3': 'second baseman', 'Test POP-P4': 'CBA compliance monitor' };
  let pairLines = 0, badPair = 0, ghost = 0, notAiring = 0, leaderOk = 0, leaderBad = 0, raw = 0, pilotOnly = 0, firstBad = '';
  let selfNamed = 0, pilotAudience = 0; // a pilot draws audience rows too (the pool is undocked-gated) — never about themselves
  let leaderSelf = 0; // the leader is a pilot most weeks and a pilot's pool is show-only — a $LEADER line never lands on the leader
  for (let seed = 11; seed < 16; seed++) {
    const ctxS = run(seed, FIXTURE.concat(TOKEN_ROWS), FEED);
    for (const r of ctxS.ledger.rows) {
      const pop = String(r[0]), cell = String(r[5] || '');
      if (!/^POP-P[134]$/.test(pop)) continue;
      const own = 'Test ' + pop;
      for (const ln of cell.split('\n')) {
        if (!/in the chair tonight|fly and argued/.test(ln)) continue;
        pilotAudience++;
        if (ln.indexOf(own + ' was in the chair') >= 0 || ln.indexOf('watched ' + own + ' the ') >= 0) selfNamed++;
      }
      if (cell.indexOf('said ' + own + ' still leads the board') >= 0) leaderSelf++;
    }
    const lines = emittedLines(ctxS);
    for (const l of lines) {
      if (/\$[A-Z_]+/.test(l)) raw++;
      let m = l.match(/watched (.+?) the (.+?) fly and argued/);
      if (m) {
        pairLines++;
        if (ROLE[m[1]] !== m[2]) { badPair++; if (!firstBad) firstBad = l; }
      }
      m = l.match(/heard (.+?) was in the chair tonight/);
      if (m) {
        pilotOnly++;
        if (m[1] === 'Ghost Holder') ghost++;
        else if (m[1] === 'Test POP-P2' || !/^Test POP-P[134]$/.test(m[1])) notAiring++;
      }
      m = l.match(/said (.+?) still leads the board/);
      if (m) { if (m[1] === 'Test POP-P1') leaderOk++; else leaderBad++; }
    }
  }
  assert('$PILOT + $PILOTROLE lines were drawn (' + pairLines + ')', pairLines > 0);
  assert('$PILOT and $PILOTROLE in one line are the same pilot; the role reads mid-clause', badPair === 0, 'bad=' + badPair + ' e.g. ' + firstBad);
  assert('a pilot with no ledger row names the feed Holder (' + ghost + ')', ghost > 0);
  assert('$PILOT never names a pilot who is not flying tonight', notAiring === 0, 'hits=' + notAiring);
  assert('$LEADER is the board leader (' + leaderOk + ')', leaderOk > 0 && leaderBad === 0, 'bad=' + leaderBad);
  assert('no raw $PILOT/$PILOTROLE/$LEADER reaches LifeHistory', raw === 0, 'raw=' + raw);
  assert('a pilot draws audience lines about the OTHER pilots (' + pilotAudience + ')', pilotAudience > 0);
  assert('a pilot never draws an audience line naming themselves', selfNamed === 0, 'self=' + selfNamed);
  assert('the board leader never draws a $LEADER line naming themselves', leaderSelf === 0, 'self=' + leaderSelf);
  const d1 = emittedLines(run(777, FIXTURE.concat(TOKEN_ROWS), FEED)).join('||');
  const d2 = emittedLines(run(777, FIXTURE.concat(TOKEN_ROWS), FEED)).join('||');
  assert('token lines: same seed -> byte-identical', d1 === d2);

  // Inert when nothing names a pilot: the feed alone moves no draw
  const i1 = emittedLines(run(555, FIXTURE, FEED)).join('||');
  const i2 = emittedLines(run(555, FIXTURE, null)).join('||');
  assert('a loaded feed with no token rows changes no draw (no eager roll)', i1 === i2);

  // No show tonight: token rows never enter a pool, flag or no flag
  const EMPTY_FEED = [FEED_HDR];
  const q = emittedLines(run(99, FIXTURE.concat(TOKEN_ROWS, [NOFLAG_ROW]), EMPTY_FEED));
  assert('empty feed: zero pilot/leader lines', q.filter(l => /in the chair tonight|leads the board|fly and argued|would be on tonight/.test(l)).length === 0);
  const n1 = emittedLines(run(99, FIXTURE.concat([NOFLAG_ROW]), EMPTY_FEED)).join('||');
  const n2 = emittedLines(run(99, FIXTURE, EMPTY_FEED)).join('||');
  assert('a $PILOT row without the undocked flag never enters the pool when no one flies (byte-identical with the row absent)', n1 === n2);
  // Past-only board, nobody flying: $LEADER still resolves (the board outlives the night), $PILOT does not
  const PAST_FEED = [FEED_HDR, ep(98, 'POP-P2', 300)];
  const LEADER_ANYWEEK = ['line', 'culture.spacemolt-show', '', 'said $LEADER still leads the board', '50', '', 'source:undocked,show:undocked,ecl:kind:argue', '', ''];
  const p = emittedLines(run(31, FIXTURE.concat(TOKEN_ROWS, [LEADER_ANYWEEK]), PAST_FEED));
  assert('no pilot tonight: $PILOT rows silent; an unflagged $LEADER row names the board leader from past nights', p.filter(l => /in the chair tonight|fly and argued/.test(l)).length === 0 && p.some(l => l.indexOf('said Test POP-P2 still leads the board') >= 0), p.filter(l => /leads the board/.test(l)).slice(0, 2).join(' || '));
  const z = emittedLines(run(31, FIXTURE.concat([LEADER_ANYWEEK]), EMPTY_FEED));
  assert('no board at all: an unflagged $LEADER row never enters the pool', z.filter(l => /leads the board/.test(l)).length === 0);

  // agy hunt 5: a roleless airing pilot (POP-P9 has no ledger row) must never make a
  // $PILOTROLE line compose-null. Capture the Content_Telemetry intent's ComposeNullJSON.
  const hadQ = global.queueAppendIntent_, hadE = global.queueEnsureTabIntent_;
  const telemetry = [];
  global.queueEnsureTabIntent_ = () => {};
  global.queueAppendIntent_ = (ctx, tab, row) => { if (tab === 'Content_Telemetry') telemetry.push(row); };
  let pairNulls = 0, pairDraws = 0;
  for (let seed = 21; seed < 26; seed++) {
    telemetry.length = 0;
    run(seed, FIXTURE.concat(TOKEN_ROWS), FEED);
    const row = telemetry[0];
    if (!row) { pairNulls = -1; break; }
    const nulls = JSON.parse(row[7] || '{}'), draws = JSON.parse(row[6] || '{}');
    for (const k of Object.keys(nulls)) if (k.indexOf('watched $PILOT the $PILOTROLE') >= 0) pairNulls += nulls[k]; // eclRowKey_ = poolKey#text[0:40]
    for (const k of Object.keys(draws)) if (k.indexOf('watched $PILOT the $PILOTROLE') >= 0) pairDraws += draws[k];
  }
  assert('telemetry captured (Content_Telemetry intent queued)', pairNulls >= 0);
  assert('$PILOT + $PILOTROLE lines drew (' + pairDraws + ') and never compose-nulled on the roleless pilot', pairDraws > 0 && pairNulls === 0, 'nulls=' + pairNulls);
  // only roleless pilots airing: $PILOTROLE rows stay out of the pool; $PILOT alone still names the Holder
  const GHOST_FEED = [FEED_HDR, ep(100, 'POP-P9', 1, 'Ghost Holder')];
  const PAIR_ONLY = TOKEN_ROWS.slice(0, 1), NAME_ONLY = TOKEN_ROWS.slice(1, 2);
  const g1 = emittedLines(run(41, FIXTURE.concat(PAIR_ONLY, NAME_ONLY), GHOST_FEED)).join('||');
  const g2 = emittedLines(run(41, FIXTURE.concat(NAME_ONLY), GHOST_FEED)).join('||');
  assert('only roleless pilots airing: the $PILOTROLE row never enters the pool (byte-identical with it absent)', g1 === g2);
  assert('only roleless pilots airing: $PILOT alone still names the feed Holder', g2.indexOf('heard Ghost Holder was in the chair') >= 0);
  if (hadQ === undefined) delete global.queueAppendIntent_; else global.queueAppendIntent_ = hadQ;
  if (hadE === undefined) delete global.queueEnsureTabIntent_; else global.queueEnsureTabIntent_ = hadE;

  // "a $PILOTROLE" takes its article from the role: an electrician, a second baseman
  // (live R848/R852 shape; Briar Soto's role is Electrician at C112)
  const ART_ROW = ['line', 'culture.spacemolt-show', '', 'said a $PILOTROLE flies like a $PILOTROLE', '5000', 'undocked', 'source:undocked,show:undocked,ecl:kind:argue', '', ''];
  const ART_FEED = [FEED_HDR, ep(100, 'POP-P5', 10), ep(100, 'POP-P3', 20)];
  let anOk = 0, aOk = 0, artBad = 0, artFirstBad = '';
  for (let seed = 61; seed < 64; seed++) {
    const rows = [makeRow('POP-P5', { occ: 'Electrician' }), makeRow('POP-P3', { occ: 'Second Baseman, Oakland A\'s' })];
    for (let i = 0; i < 40; i++) rows.push(makeRow('POP-A' + i, { hood: 'Temescal' }));
    const ctxA = makeCtx(rows, mulberry32(seed), FIXTURE.concat([ART_ROW]), ART_FEED);
    ctxA.config.cycleCount = 100;
    loadUndockedFeed_(ctxA);
    generateCitizensEvents_(ctxA);
    for (const l of emittedLines(ctxA)) {
      if (l.indexOf('flies like') < 0) continue;
      if (l.indexOf('said an electrician flies like an electrician') >= 0) anOk++;
      else if (l.indexOf('said a second baseman flies like a second baseman') >= 0) aOk++;
      else { artBad++; if (!artFirstBad) artFirstBad = l; }
    }
  }
  assert('"a $PILOTROLE" reads "an electrician" (' + anOk + ') and "a second baseman" (' + aOk + ')', anOk > 0 && aOk > 0 && artBad === 0, 'bad=' + artBad + ' e.g. ' + artFirstBad);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
