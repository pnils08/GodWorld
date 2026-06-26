/**
 * engine.33 GATE — citizen <-> neighborhood texture loop integration harness.
 *
 * The loop under test is the one engine.33 built: citizen events record an
 * emit-time neighborhood pulse (T1/T2/T3/T10) -> Phase 8 folds the pulse into
 * Neighborhood_Map (T4, dampened + capped) -> next cycle's Phase 2 loader
 * (T5) hydrates S.neighborhoodState -> Phase 5 generators flavor citizen
 * events from it (T6 state texture, T7 hood microclimate, T8 hood-grain
 * conduct counterweight, T9 same-cycle faith fan-out) -> dials move -> pulse.
 *
 * Five acceptance criteria from docs/plans/2026-06-10-engine33-neighborhood-
 * citizen-loop.md, asserted against the REAL engine functions (loaded whole-
 * file, Apps Script global surface injected — same pattern as
 * scripts/engine32MultiCycle.test.js):
 *
 *   C1  loader — seeded Neighborhood_Map rows hydrate S.neighborhoodState
 *       at hood grain, accessor-contract nulls for missing fields/hoods.
 *   C2  pulse + texture — over a 250-cycle accumulation on a static divergent
 *       4-hood city, the pulse populates from real emitted events, and the
 *       hood-conditioned pools land ONLY where their state says they should:
 *       faith fan-out + heavy-rain + fog/cool-pocket + displacement texture
 *       in Fruitvale, warm-pocket + high-retail texture in Rockridge.
 *   C3  fold — paired same-seed writer runs (with pulse vs without) differ
 *       per metric by <= the PULSE_FOLD cap, in the pulse's direction, and
 *       not at all in no-pulse hoods.
 *   C4  conduct — hood-grain crime blend: the high-crime hood (spike -> lean
 *       positive, fewer tests fire) fires measurably fewer moral tests than
 *       the quiet hood across 800 paired cycles.
 *   C5  determinism — two identical-seed runs of the full closed loop
 *       (writer output feeding the next cycle's loader) are byte-identical.
 *
 * Run: node scripts/testNeighborhoodLoop.js
 */

const fs = require('fs');
const path = require('path');

// --- inject the Apps Script global surface ---
global.Logger = { log() {} };
global.Utilities = { formatDate: () => '2041-01-01 10:00' };
global.Session = { getScriptTimeZone: () => 'UTC' };
global.queueAppendIntent_ = () => {};
global.queueBatchAppendIntent_ = () => {};
// inWorldStamp_ lives in phase01 advanceSimulationCalendar.js (not loaded here);
// stub the in-world cycle stamp so generateCitizensEvents_ runs in the harness.
global.inWorldStamp_ = (ctx) => 'C' + ((ctx && ctx.config && ctx.config.cycleCount) || 0);

const E = require('../utilities/citizenMemory.js');
Object.keys(E).forEach(k => { global[k] = E[k]; });
const C = require('../utilities/compressLifeHistory.js');
global.getCitizenDialBands_ = C.getCitizenDialBands_;
const P = require('../utilities/neighborhoodPulseMap.js');
global.recordPulse_ = P.recordPulse_;
global.pulseForEvent_ = P.pulseForEvent_;

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rngImpl = mulberry32(2026);
const rngWrap = () => rngImpl();
global.safeRand_ = () => rngWrap;

const loadEngine = (rel, fnName) => {
  const src = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
  return new Function(src + '\nreturn ' + fnName + ';')();
};
const loadNeighborhoodState_ = loadEngine('../phase02-world-state/loadNeighborhoodState.js', 'loadNeighborhoodState_');
const generateCitizensEvents_ = loadEngine('../phase05-citizens/generateCitizensEvents.js', 'generateCitizensEvents_');
const generateGenericCitizenMicroEvents_ = loadEngine('../phase04-events/generateGenericCitizenMicroEvent.js', 'generateGenericCitizenMicroEvents_');
const runConductEngine_ = loadEngine('../phase05-citizens/runConductEngine.js', 'runConductEngine_');
const saveV3NeighborhoodMap_ = loadEngine('../phase08-v3-chicago/v3NeighborhoodWriter.js', 'saveV3NeighborhoodMap_');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// --- in-memory sheet stub (4-arg getRange + getDataRange, auto-expanding) ---
function memSheet(name, data) {
  function ensure(rows, cols) {
    while (data.length < rows) data.push([]);
    for (const row of data) while (row.length < cols) row.push('');
  }
  return {
    getName: () => name,
    getLastRow: () => data.length,
    getLastColumn: () => data.reduce((m, r) => Math.max(m, r.length), 0),
    getDataRange: () => ({ getValues: () => data.map(r => r.slice()) }),
    insertRowsAfter: (after, n) => { const w = data.reduce((m, r) => Math.max(m, r.length), 0); for (let i = 0; i < n; i++) data.push(new Array(w).fill('')); },
    insertColumnsAfter: (after, n) => { for (const row of data) for (let i = 0; i < n; i++) row.push(''); },
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        ensure(r + nr - 1, c + nc - 1);
        const out = [];
        for (let i = 0; i < nr; i++) out.push(data[r - 1 + i].slice(c - 1, c - 1 + nc));
        return out;
      },
      setValues: (vals) => {
        ensure(r + vals.length - 1, c + (vals[0] ? vals[0].length : 0) - 1);
        for (let i = 0; i < vals.length; i++) {
          for (let j = 0; j < vals[i].length; j++) data[r - 1 + i][c - 1 + j] = vals[i][j];
        }
      }
    }),
    _data: data
  };
}
function memSS(sheets) {
  return {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => { sheets[n] = memSheet(n, []); return sheets[n]; }
  };
}

// --- the divergent 4-hood city ---
const LOADER_HEADERS = ['Cycle', 'Neighborhood', 'CrimeIndex', 'RetailVitality',
  'EventAttractiveness', 'Sentiment', 'GentrificationPhase', 'DisplacementPressure',
  'MedianRent', 'MigrationFlow'];
// Fruitvale: high crime, low sentiment, accelerating gentrification, high
// displacement, weak retail. Rockridge: quiet, happy, strong retail.
function seedLoaderMapData() {
  return [
    LOADER_HEADERS.slice(),
    [94, 'Fruitvale', 2, 7, 30, 0.15, 'accelerating', 7, 2400, -10],
    [94, 'Rockridge', 0, 14, 45, 0.75, '', 1, 3800, 5],
    [94, 'West Oakland', 1, 9, 25, 0.5, 'early', 4, 2100, 0],
    [94, 'Temescal', 0.5, 12, 50, 0.6, '', 3, 3200, 3]
  ];
}

const CITY_WEATHER = { type: 'clear', temp: 62, impact: 1, windSpeed: 5, precipitationIntensity: 0, visibility: 'normal' };
// Fruitvale: fog microclimate, cool pocket (-4F), heavy local rain while the
// city stays dry. Rockridge: warm pocket (+4F), clear.
const HOOD_WEATHER = {
  'Fruitvale': { temp: 58, type: 'fog', microClimate: 'fog belt', humidity: 85, windSpeed: 8, windDirection: 'W', precipitationIntensity: 0.7 },
  'Rockridge': { temp: 66, type: 'clear', microClimate: 'sun pocket', humidity: 50, windSpeed: 3, windDirection: 'NW', precipitationIntensity: 0 }
};
// Same-cycle faith fan-out source — both events in Fruitvale (T9).
const FAITH_EVENTS = [
  { organization: 'St. Columba Parish', tradition: 'Catholic', neighborhood: 'Fruitvale', eventType: 'community_program', description: 'food pantry expansion', attendance: 60 },
  { organization: 'St. Columba Parish', tradition: 'Catholic', neighborhood: 'Fruitvale', eventType: 'holy_day', holyDay: 'feast day', description: 'feast day observance', attendance: 110 }
];

const HEADERS = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)',
  'LifeHistory', 'LastUpdated', 'Neighborhood', 'BirthYear', 'MaritalStatus', 'NumChildren',
  'TraitProfile', 'DialState'];
const iLife = HEADERS.indexOf('LifeHistory');
const iHood = HEADERS.indexOf('Neighborhood');

function dialState(overrides) {
  const c = global.newCitizen_();
  Object.keys(overrides).forEach(k => { c.base[k] = overrides[k]; });
  return C.serializeDialState_(c);
}

// perHood citizens in each of the 4 hoods, all Tier-3 ENGINE adults with a
// neutral DialState (conduct-eligible, crime NOT reachable -> all Resisted).
function buildLedger(hoods, perHood) {
  const rows = [];
  let n = 0;
  for (const hood of hoods) {
    const tag = hood.replace(/[^A-Za-z]/g, '').slice(0, 4);
    for (let i = 0; i < perHood; i++) {
      rows.push(['POP-' + tag + i, tag, String(i), 3, 'ENGINE', 'n', 'n', 'n', '', '',
        hood, 1985, n % 2 === 0 ? 'married' : 'single', 0, '', dialState({})]);
      n++;
    }
  }
  return rows;
}

function makeCtx(cycle, rows, ss) {
  const ctx = {
    now: new Date(0),
    config: { cycleCount: cycle },
    mode: {},
    rng: rngWrap,
    ss: ss,
    summary: {
      cycleId: cycle,
      season: 'Spring',
      economicMood: 50,
      weather: Object.assign({}, CITY_WEATHER),
      neighborhoodWeather: HOOD_WEATHER,
      faithEvents: { generated: FAITH_EVENTS.length, cycle: cycle, events: FAITH_EVENTS },
      crimeMetrics: { cityWide: { avgPropertyCrime: 50, avgViolentCrime: 50 } },
      cityDynamics: { sentiment: 0.3, traffic: 1, retail: 1.5, publicSpaces: 1, nightlife: 0.7, culturalActivity: 1, communityEngagement: 1 },
      worldEvents: [],
      storySeeds: [],
      storyHooks: []
    },
    ledger: { headers: HEADERS.slice(), rows, dirty: false }
  };
  loadNeighborhoodState_(ctx); // T5 — prev cycle's Neighborhood_Map -> S
  return ctx;
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ C1 — T5 loader hydrates S.neighborhoodState from Neighborhood_Map');
{
  const ss = memSS({ 'Neighborhood_Map': memSheet('Neighborhood_Map', seedLoaderMapData()) });
  const ctx = makeCtx(95, buildLedger(['Fruitvale'], 1), ss);
  const st = ctx.summary.neighborhoodState;
  assert('C1a 4 hoods loaded', ctx.summary.neighborhoodStateCount === 4, String(ctx.summary.neighborhoodStateCount));
  assert('C1b Fruitvale fields at hood grain',
    st['Fruitvale'] && st['Fruitvale'].crimeIndex === 2 && st['Fruitvale'].gentrificationPhase === 'accelerating' &&
    st['Fruitvale'].displacementPressure === 7 && st['Fruitvale'].sentiment === 0.15,
    JSON.stringify(st['Fruitvale']));
  assert('C1c Rockridge fields at hood grain',
    st['Rockridge'] && st['Rockridge'].retailVitality === 14 && st['Rockridge'].sentiment === 0.75 && st['Rockridge'].crimeIndex === 0,
    JSON.stringify(st['Rockridge']));
  assert('C1d unknown hood -> undefined (accessor contract, citywide fallback path)',
    st['Montclair'] === undefined);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ C2 — 400-cycle accumulation: pulse populates, hood texture lands where the state says');
const HOODS = ['Fruitvale', 'Rockridge', 'West Oakland', 'Temescal'];
rngImpl = mulberry32(2026);
{
  // 20/hood x 400 cycles: faith fan-out is ~2 pool entries in an ~80-entry
  // weighted pool (~2.7% share), so the expected hit count needs volume to
  // be assertable (P(zero) < 1% at this size; 12x250 left it at ~13%).
  const rows = buildLedger(HOODS, 20);
  const pulseTally = { hoods: new Set(), events: 0, cyclesWithPulse: 0 };
  for (let cy = 1; cy <= 400; cy++) {
    const ss = memSS({
      'Neighborhood_Map': memSheet('Neighborhood_Map', seedLoaderMapData()),
      'LifeHistory_Log': memSheet('LifeHistory_Log', [['Timestamp', 'Cycle', 'POPID', 'Name', 'Event', 'Tag']])
    });
    const ctx = makeCtx(94 + cy, rows, ss);
    generateCitizensEvents_(ctx);        // Phase 5 — T6/T7/T9 pools live
    generateGenericCitizenMicroEvents_(ctx); // Phase 4 micro — T7 divergence
    runConductEngine_(ctx);              // Phase 5 — T8 hood-grain blend
    const pulse = ctx.summary.neighborhoodPulse || {};
    const hoods = Object.keys(pulse);
    if (hoods.length) pulseTally.cyclesWithPulse++;
    for (const h of hoods) { pulseTally.hoods.add(h); pulseTally.events += pulse[h].events || 0; }
  }
  const lifeByHood = {};
  for (const h of HOODS) lifeByHood[h] = '';
  for (const row of rows) lifeByHood[row[iHood]] += '\n' + (row[iLife] || '');
  const inHoods = (needle) => HOODS.filter(h => lifeByHood[h].indexOf(needle) >= 0);

  console.log('   pulse: ' + pulseTally.events + ' events across ' + pulseTally.hoods.size +
    ' hoods, ' + pulseTally.cyclesWithPulse + '/400 cycles');
  assert('C2a pulse populated from real emitted events (>=2 hoods, >0 events)',
    pulseTally.hoods.size >= 2 && pulseTally.events > 0,
    pulseTally.hoods.size + ' hoods / ' + pulseTally.events + ' events');

  // T9 faith fan-out — Fruitvale-only faith events land in Fruitvale lives only
  const faithHits = inHoods('St. Columba Parish');
  assert('C2b faith fan-out lands in Fruitvale LifeHistory', faithHits.indexOf('Fruitvale') >= 0, faithHits.join(','));
  assert('C2c faith fan-out does NOT leak to other hoods',
    faithHits.every(h => h === 'Fruitvale'), faithHits.join(','));

  // T7 microclimate — local rain/fog/cool-pocket only where the hood weather says
  const rainHits = [...new Set(inHoods('got caught in heavy rain').concat(inHoods('watched the downpour')))];
  assert('C2d heavy-rain lines ONLY in Fruitvale (city is dry, hood precip 0.7)',
    rainHits.length === 1 && rainHits[0] === 'Fruitvale', rainHits.join(',') || 'none');
  const fogHits = [...new Set(inHoods('watched fog settle over Fruitvale')
    .concat(inHoods('fog that had settled over Fruitvale'), inHoods('felt the cool pocket')))];
  assert('C2e fog/cool-pocket divergence lines ONLY in Fruitvale',
    fogHits.length === 1 && fogHits[0] === 'Fruitvale', fogHits.join(',') || 'none');
  const warmHits = [...new Set(inHoods('holding the heat').concat(inHoods('running warmer')))];
  assert('C2f warm-pocket divergence lines ONLY in Rockridge (+4F)',
    warmHits.length === 1 && warmHits[0] === 'Rockridge', warmHits.join(',') || 'none');

  // T6 neighborhood-state texture — displacement in Fruitvale, retail in Rockridge
  const dispHits = [...new Set(inHoods("tenants' meeting").concat(inHoods('rents going up in')))];
  assert('C2g displacement/gentrification texture ONLY in Fruitvale (disp 7, accelerating)',
    dispHits.length === 1 && dispHits[0] === 'Fruitvale', dispHits.join(',') || 'none');
  const retailHits = [...new Set(inHoods('new shop that just opened').concat(inHoods('busy weekend market')))];
  assert('C2h high-retail texture ONLY in Rockridge (retail 14 >= 13)',
    retailHits.length === 1 && retailHits[0] === 'Rockridge', retailHits.join(',') || 'none');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ C3 — T4 fold: paired same-seed writer runs, deltas bounded + directional');
{
  // Oversized raw pulse — proves the caps clamp. Fruitvale dark, Rockridge warm.
  const PULSE = {
    'Fruitvale': { sentiment: -40, crime: 12, vitality: -30, attractiveness: -25, events: 9 },
    'Rockridge': { sentiment: 3, crime: 0, vitality: 4, attractiveness: 6, events: 4 }
  };
  const CAPS = { sentiment: 0.15, crime: 0.10, vitality: 1.00, attractiveness: 4.00 };
  function writerRun(seed, pulse) {
    rngImpl = mulberry32(seed);
    const sheets = {};
    const ss = memSS(sheets);
    const ctx = {
      now: new Date(0), config: { cycleCount: 95 }, mode: {}, ss,
      summary: {
        cityDynamics: { sentiment: 0.3, traffic: 1, retail: 1.5, publicSpaces: 1, nightlife: 0.7 },
        weather: Object.assign({}, CITY_WEATHER), worldEvents: [], storySeeds: [], storyHooks: [],
        neighborhoodPulse: pulse
      }
    };
    saveV3NeighborhoodMap_(ctx);
    const data = sheets['Neighborhood_Map']._data;
    const header = data[0];
    const byHood = {};
    for (let r = 1; r < data.length; r++) {
      if (data[r][header.indexOf('Neighborhood')]) byHood[data[r][header.indexOf('Neighborhood')]] = data[r];
    }
    return { header, byHood };
  }
  const withPulse = writerRun(777, PULSE);
  const noPulse = writerRun(777, undefined);
  const col = (n) => withPulse.header.indexOf(n);
  const METRICS = [['Sentiment', 'sentiment'], ['CrimeIndex', 'crime'], ['RetailVitality', 'vitality'], ['EventAttractiveness', 'attractiveness']];
  let boundedOK = true, directionOK = true, detail = [];
  for (const hood of Object.keys(PULSE)) {
    for (const [colName, key] of METRICS) {
      const d = withPulse.byHood[hood][col(colName)] - noPulse.byHood[hood][col(colName)];
      const raw = PULSE[hood][key];
      if (Math.abs(d) > CAPS[key] + 0.011) { boundedOK = false; detail.push(hood + '.' + key + ' d=' + d); }
      // direction: sign of delta matches sign of raw pulse (floor-at-0 metrics
      // can absorb a negative delta to 0 movement, so allow |d|==0)
      if (raw !== 0 && d !== 0 && Math.sign(d) !== Math.sign(raw)) { directionOK = false; detail.push(hood + '.' + key + ' dir d=' + d + ' raw=' + raw); }
    }
  }
  assert('C3a fold deltas bounded by PULSE_FOLD caps (oversized raw pulse clamps)', boundedOK, detail.join(' '));
  assert('C3b fold deltas directional (sign follows the pulse)', directionOK, detail.join(' '));
  const fvSent = withPulse.byHood['Fruitvale'][col('Sentiment')] - noPulse.byHood['Fruitvale'][col('Sentiment')];
  assert('C3c oversized sentiment pulse clamps AT the cap (-0.15)', Math.abs(fvSent + 0.15) < 0.011, String(fvSent));
  let untouchedOK = true;
  for (const hood of ['Downtown', 'Temescal', 'Laurel']) {
    for (const [colName] of METRICS) {
      if (withPulse.byHood[hood][col(colName)] !== noPulse.byHood[hood][col(colName)]) untouchedOK = false;
    }
  }
  assert('C3d no-pulse hoods byte-identical between paired runs', untouchedOK);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ C4 — T8 conduct: high-crime hood fires fewer moral tests (hood-grain blend)');
{
  // 30 citizens each in Fruitvale (crimeIndex 2 -> blend 0.8 >= 0.6, spike,
  // chance x0.7) and Rockridge (crimeIndex 0 -> blend 0.2, no spike).
  rngImpl = mulberry32(424242);
  const rows = buildLedger(['Fruitvale', 'Rockridge'], 30);
  const fires = { Frui: 0, Rock: 0 };
  const ss = memSS({ 'Neighborhood_Map': memSheet('Neighborhood_Map', seedLoaderMapData()) });
  for (let cy = 1; cy <= 800; cy++) {
    const ctx = makeCtx(94 + cy, rows, ss);
    runConductEngine_(ctx);
    for (const ev of (ctx.summary.conductEvents || [])) {
      if (/^Frui/.test(ev.citizen)) fires.Frui++;
      if (/^Rock/.test(ev.citizen)) fires.Rock++;
    }
  }
  console.log('   conduct fires over 800 cycles: Fruitvale=' + fires.Frui + ' Rockridge=' + fires.Rock);
  assert('C4a high-crime Fruitvale fires FEWER tests than quiet Rockridge',
    fires.Frui < fires.Rock, fires.Frui + ' vs ' + fires.Rock);
  const ratio = fires.Frui / Math.max(1, fires.Rock);
  assert('C4b fire ratio in the x0.7 counterweight band (0.4 < ratio < 0.95)',
    ratio > 0.4 && ratio < 0.95, ratio.toFixed(3));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ C5 — determinism: two identical-seed closed-loop runs are byte-identical');
{
  // The TRUE closed loop: each cycle's writer output IS the next cycle's
  // loader input (one-cycle lag, replace-pattern rows 2:N).
  function closedLoopRun(seed) {
    rngImpl = mulberry32(seed);
    const rows = buildLedger(HOODS, 8);
    const mapData = seedLoaderMapData();
    const sheets = {
      'Neighborhood_Map': memSheet('Neighborhood_Map', mapData),
      'LifeHistory_Log': memSheet('LifeHistory_Log', [['Timestamp', 'Cycle', 'POPID', 'Name', 'Event', 'Tag']])
    };
    const ss = memSS(sheets);
    for (let cy = 1; cy <= 40; cy++) {
      const ctx = makeCtx(94 + cy, rows, ss);
      generateCitizensEvents_(ctx);
      generateGenericCitizenMicroEvents_(ctx);
      runConductEngine_(ctx);
      saveV3NeighborhoodMap_(ctx); // folds this cycle's pulse -> next loader read
    }
    return JSON.stringify({
      life: rows.map(r => r[iLife]),
      map: sheets['Neighborhood_Map']._data,
      log: sheets['LifeHistory_Log']._data
    });
  }
  const runA = closedLoopRun(99);
  const runB = closedLoopRun(99);
  assert('C5a same seed -> byte-identical ledger + map + log', runA === runB);
  const runC = closedLoopRun(100);
  assert('C5b different seed -> different trace (harness is not vacuous)', runA !== runC);
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ C6 — G-EC33: per-hood sentiment breaks citywide lockstep (S273 fix)');
{
  // Two cycles. The citywide scalar swings UNIFORMLY +0.16 (the old lockstep
  // driver). Per-hood dynamics move DIFFERENTLY: Fruitvale drops (e.g. crime),
  // Rockridge ticks up, Downtown is flat. Pre-fix every hood's delta == +0.16
  // (output = citywide + frozen offset). Post-fix the per-hood track is the base
  // and the citywide scalar is demoted to a CITY_SENTIMENT_NUDGE (0.15) shade.
  function sentRun(seed, citySent, nhoodDyn) {
    rngImpl = mulberry32(seed);
    const sheets = {};
    const ss = memSS(sheets);
    const ctx = {
      now: new Date(0), config: { cycleCount: 95 }, mode: {}, ss,
      summary: {
        cityDynamics: { sentiment: citySent, traffic: 1, retail: 1.5, publicSpaces: 1, nightlife: 0.7 },
        weather: Object.assign({}, CITY_WEATHER), worldEvents: [], storySeeds: [], storyHooks: [],
        neighborhoodDynamics: nhoodDyn
      }
    };
    saveV3NeighborhoodMap_(ctx);
    const data = sheets['Neighborhood_Map']._data;
    const header = data[0];
    const sCol = header.indexOf('Sentiment');
    const nCol = header.indexOf('Neighborhood');
    const byHood = {};
    for (let r = 1; r < data.length; r++) if (data[r][nCol]) byHood[data[r][nCol]] = Number(data[r][sCol]);
    return byHood;
  }
  // Same seed both cycles -> per-hood variance() draws identical -> cancels in delta.
  const dynA = { 'Fruitvale': { sentiment: 0.30 }, 'Rockridge': { sentiment: 0.60 }, 'Downtown': { sentiment: 0.45 } };
  const dynB = { 'Fruitvale': { sentiment: 0.20 }, 'Rockridge': { sentiment: 0.62 }, 'Downtown': { sentiment: 0.45 } };
  const A = sentRun(555, 0.40, dynA);
  const B = sentRun(555, 0.56, dynB);  // citywide +0.16 uniform swing
  const dFrui = B['Fruitvale'] - A['Fruitvale'];
  const dRock = B['Rockridge'] - A['Rockridge'];
  const dDown = B['Downtown'] - A['Downtown'];
  console.log(`   deltas — Fruitvale=${dFrui.toFixed(3)} Rockridge=${dRock.toFixed(3)} Downtown=${dDown.toFixed(3)} (citywide swing +0.160)`);
  const spread = Math.max(dFrui, dRock, dDown) - Math.min(dFrui, dRock, dDown);
  assert('C6a per-hood deltas NON-uniform (lockstep broken; pre-fix spread==0)', spread > 0.05, 'spread=' + spread.toFixed(3));
  assert('C6b a hood can fall while the city rises (Fruitvale down, citywide up)', dFrui < 0, 'dFrui=' + dFrui.toFixed(3));
  assert('C6c flat-dynamics hood moves only ~nudge*swing (0.024), NOT full 0.16', Math.abs(dDown) < 0.05, 'dDown=' + dDown.toFixed(3));
  // Fallback: a hood with NO neighborhoodDynamics entry still writes a finite sentiment.
  const F = sentRun(555, 0.40, dynA);
  assert('C6d hood with no dynamics entry falls back to citywide scalar (finite)', isFinite(F['Temescal']), String(F['Temescal']));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
