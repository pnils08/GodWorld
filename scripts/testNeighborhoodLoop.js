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
 *       faith fan-out + heavy-rain + fog/cool-pocket + housing-strain texture
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
global.getGriefConfig_ = C.getGriefConfig_;                 // engine.94 grief (the generator reads it every Cycle)
global.activeGriefFromRegisters_ = C.activeGriefFromRegisters_;
global.conductCohortRow_ = C.conductCohortRow_; // engine.272 shared cohort predicate
const P = require('../utilities/neighborhoodPulseMap.js');
global.recordPulse_ = P.recordPulse_;
global.pulseForEvent_ = P.pulseForEvent_;
global.pulseKindForLine_ = P.pulseKindForLine_; // engine.305

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

// World_Config at the contract's seeded defaults (phase01-config/engine94SheetContract.js *_SEEDS).
const CONTRACT_DEFAULTS = (() => {
  const src = fs.readFileSync(path.resolve(__dirname, '../phase01-config/engine94SheetContract.js'), 'utf8');
  const names = [...src.matchAll(/^var ([A-Z_0-9]+SEEDS) = \[/gm)].map(m => m[1]);
  const o = {};
  new Function(src + '\nreturn [' + names.join(',') + '];')().flat()
    .forEach(r => { if (Array.isArray(r) && typeof r[0] === 'string') o[r[0]] = r[1]; });
  return o;
})();

// Apps Script runs every file in one global scope. Each engine here is loaded with the helpers it
// calls as globals: sportsWeekRecord (engine.208), the sim-year helpers (engine.164), canon hoods,
// the city's-middle bars, event class and the weather PRNG.
const simYearSrc_ = () => { const s = fs.readFileSync(path.resolve(__dirname, '../phase01-config/advanceSimulationCalendar.js'), 'utf8'); return s.match(/function simYearFromCycle_[\s\S]*?\n}\n/)[0] + s.match(/function simYearOf_[\s\S]*?\n}\n/)[0]; };
const SCOPE_SRC = ['../utilities/sportsWeekRecord.js', '../phase01-config/canonNeighborhoodLoader.js',
  '../phase05-citizens/runNeighborhoodEngine.js', '../phase05-citizens/citizenContextBuilder.js',
  '../phase02-world-state/applyWeatherModel.js', '../utilities/utilityFunctions.js']
  .map(rel => fs.readFileSync(path.resolve(__dirname, rel), 'utf8')).join('\n') + simYearSrc_();
const DM = require('../utilities/citizenDialMap.js');
global.pressureBar_ = DM.pressureBar_;
global.nudgesForEvent_ = DM.nudgesForEvent_; // engine.299: without the resolver the generator fails closed and drops every
global.baseTag_ = DM.baseTag_;               // line whose kind moves a dial on its own (faith, ...) as unsigned
const loadEngine = (rel, fnName) => {
  const src = fs.readFileSync(path.resolve(__dirname, rel), 'utf8');
  return new Function(SCOPE_SRC + '\n' + src + '\nreturn ' + fnName + ';')();
};
const loadCanonNeighborhoods_ = loadEngine('../phase01-config/canonNeighborhoodLoader.js', 'loadCanonNeighborhoods_');
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
// Schema-true header (S315 trajectory block) — the writer's positional-write
// guard verifies cols 1-15 against the real texture layout, so the fixture
// must carry it. Loader reads by name.
const LOADER_HEADERS = ['Timestamp', 'Cycle', 'Neighborhood', 'NightlifeProfile', 'NoiseIndex',
  'CrimeIndex', 'RetailVitality', 'EventAttractiveness', 'Sentiment', 'DemographicMarker',
  'Holiday', 'HolidayPriority', 'FirstFriday', 'CreationDay', 'SportsSeason',
  'MigrationFlow', 'NeighborhoodTrajectory', 'HousingPressure', 'TrajectoryStartCycle',
  'MedianIncome', 'MedianRent', 'TrajectoryMomentum', 'District',
  // Phase1-CanonHoods columns (engine.148): live C112 values, Adjacent kept inside the fixture's four hoods
  'Adjacent', 'AttentionWeight', 'ChildAreas', 'CoreSimRank', 'EmployerCharacter', 'Scenes', 'WeatherZone'];
// Fruitvale: high crime, low sentiment, decay trajectory, high housing
// pressure, weak retail. Rockridge: quiet, happy, strong retail (growth).
function seedLoaderMapData() {
  const row = (hood, crime, retail, evt, sent, traj, mom, press, income, rent, flow, canon) =>
    ['t0', 94, hood, 1, 5, crime, retail, evt, sent, 'zone', 'none', 'none', false, false,
      'off-season', flow, traj, press, 90, income, rent, mom, ''].concat(canon);
  return [
    LOADER_HEADERS.slice(),
    row('Fruitvale', 2, 7, 30, 0.15, 'decay', 2, 7, 60000, 2400, -10, ['West Oakland', 1, '', 3, 'transit-retail', 'CincoDeMayo:5, DiaDeMuertos:5', 'inland']),
    row('Rockridge', 0, 14, 45, 0.75, 'growth', 8, 1, 114000, 3800, 5, ['Temescal', 0.5, 'Claremont', 7, 'professional', 'Halloween:2', 'hills']),
    row('West Oakland', 1, 9, 25, 0.5, '', 5, 4, 81000, 2100, 0, ['Fruitvale, Temescal', 1.5, '', 5, 'campus', 'CreationDay:2, Juneteenth:4', 'bay-fog']),
    row('Temescal', 0.5, 12, 50, 0.6, '', 5, 3, 74000, 3200, 3, ['Rockridge, West Oakland', 1, '', 1, 'clinic', 'arts, FirstFriday:2, Halloween:3', 'moderate'])
  ];
}

// The Phase-8 writer writes every hood on its own 22-name list (v3NeighborhoodWriter NMAP_NEIGHBORHOODS),
// so its runs get the four fixture hoods plus 18 neutral rows (EmployerCharacter / WeatherZone / District
// as live C112). The generator sections keep the four-hood city, so their city-middle bars do not move.
const NEUTRAL_HOODS = [
  ['Downtown', 'institutional', 'urban-core', 'D2'], ['Laurel', 'schools-retail', 'valley', 'D9'],
  ['Jack London', 'nightlife', 'waterfront', 'D2'], ['Adams Point', 'residential', 'urban-corridor', 'D8'],
  ['Grand Lake', 'retail', 'lake', 'D8'], ['Piedmont Ave', 'medical', 'piedmont-edge', 'D6'],
  ['Chinatown', 'family-retail', 'urban-core', 'D2'], ['Brooklyn', 'residential', 'waterfront', 'D1'],
  ['Eastlake', 'mixed', 'lake', 'D8'], ['Glenview', 'residential', 'hills', 'D4'],
  ['Dimond', 'village-retail', 'valley', 'D4'], ['Ivy Hill', 'residential', 'hills', 'D4'],
  ['San Antonio', 'service-labor', 'inland', 'D3'], ['KONO', 'arts', 'urban-corridor', 'D7'],
  ['Lake Merritt', 'residential', 'lake', 'D8'], ['Uptown', 'nightlife', 'urban-corridor', 'D9'],
  ['Baylight District', 'stadium', 'waterfront', 'D2'], ['East Oakland', 'construction', 'inland', 'D5']
];
function writerMapData() {
  const data = seedLoaderMapData();
  for (const [hood, character, zone, district] of NEUTRAL_HOODS) {
    data.push(['t0', 94, hood, 1, 5, 0.5, 9, 30, 0.5, 'zone', 'none', 'none', false, false,
      'off-season', 0, '', 3, 90, 80000, 2500, 5, district,
      hood === 'Downtown' ? 'Chinatown' : 'Downtown', 1, '', 9, character, '', zone]);
  }
  return data;
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
    // Every World_Config key at its contract default (each reader throws on a missing key, ADR-0015);
    // no GC forced across — the harness has no Generic_Citizens tab.
    config: Object.assign({}, CONTRACT_DEFAULTS, { cycleCount: cycle, hoodFloorSurfaceQuota: 0 }),
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
  loadCanonNeighborhoods_(ctx); // Phase1-CanonHoods — S.canonHoods (resolveHoodOrChild_ throws without it, ADR-0016)
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
    st['Fruitvale'] && st['Fruitvale'].crimeIndex === 2 && st['Fruitvale'].trajectory === 'decay' &&
    st['Fruitvale'].housingPressure === 7 && st['Fruitvale'].trajectoryMomentum === 2 && st['Fruitvale'].sentiment === 0.15,
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

  // T6 neighborhood-state texture — decay/housing strain in Fruitvale, retail in Rockridge
  // The rent line's bar is World_Config dialHoodPressureBar (2026-09-19; contract 3), not the old literal 6:
  // Fruitvale 7, West Oakland 4, Temescal 3 clear it; Rockridge 1 does not.
  const rentHits = inHoods('compared rent notes').sort();
  assert('C2g housing-pressure line ONLY where HousingPressure >= dialHoodPressureBar (Fruitvale 7, Temescal 3, West Oakland 4)',
    rentHits.join(',') === 'Fruitvale,Temescal,West Oakland', rentHits.join(',') || 'none');
  // engine.214 8a Cut B: the trajectory reaches a citizen as a reaction, each side in its own hood, each line
  // written with its own sign (growth fixture Rockridge, decay fixture Fruitvale).
  const REACT = {
    Rockridge: [['caught themselves bragging a little about the neighborhood lately', 'Up'], ['felt quietly lucky to call Rockridge home', 'Up'],
      ['grumbled about the neighborhood over coffee', 'Down'], ['griped about Rockridge over dinner', 'Down']],
    Fruitvale: [["complained about the neighborhood to anyone who'd listen", 'Down'], ['vented about Fruitvale on the walk home', 'Down'],
      ['shrugged off the grumbling about Fruitvale and got on with the week', 'Up'], ['stuck up for the neighborhood to a friend across town', 'Up']]
  };
  const reactMiss = [];
  for (const home of Object.keys(REACT)) {
    for (const [txt] of REACT[home]) {
      const hits = inHoods(txt);
      if (hits.length !== 1 || hits[0] !== home) reactMiss.push(home + ': ' + txt + ' -> ' + (hits.join(',') || 'none'));
    }
  }
  assert('C2g2 every reaction line lands, and only in its trajectory hood (growth Rockridge, decay Fruitvale)', reactMiss.length === 0, reactMiss.join(' | '));
  const signMiss = [];
  let signChecked = 0, signSuffixed = 0;
  for (const home of Object.keys(REACT)) {
    for (const line of lifeByHood[home].split('\n')) {
      const m = /\[([^\]]+)\] (.*)$/.exec(line);
      if (!m) continue;
      // a non-template line may carry the generator's ' near <venue>' suffix (generateCitizensEvents.js, chosenVenue)
      const r = REACT[home].find(([txt]) => m[2] === txt || m[2].indexOf(txt + ' near ') === 0);
      if (!r) continue;
      signChecked++; if (m[2] !== r[0]) signSuffixed++;
      if (!new RegExp('^Neighborhood-Outabout-' + r[1] + '-[SML]$').test(m[1])) signMiss.push(m[1] + ' ' + m[2]);
    }
  }
  assert('C2g3 every reaction line, venue-suffixed or not, is written with its own sign (Neighborhood-Outabout-Up|Down)',
    signMiss.length === 0 && signChecked > 0 && signSuffixed > 0, signMiss.slice(0, 3).join(' | ') + ' checked ' + signChecked + ' suffixed ' + signSuffixed);
  const retired = ['never reopened in', "where the block's energy went", 'another new spot opening up'].filter(t => inHoods(t).length);
  assert('C2g4 the storefront, block-energy and new-spot lines are gone', retired.length === 0, retired.join(','));
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
    // engine.119: the cycle never creates tabs — the map exists before the writer runs
    const sheets = { 'Neighborhood_Map': memSheet('Neighborhood_Map', writerMapData()) };
    const ss = memSS(sheets);
    const ctx = {
      now: new Date(0), config: Object.assign({}, CONTRACT_DEFAULTS, { cycleCount: 95 }), mode: {}, ss,
      summary: {
        cityDynamics: { sentiment: 0.3, traffic: 1, retail: 1.5, publicSpaces: 1, nightlife: 0.7 },
        weather: Object.assign({}, CITY_WEATHER), worldEvents: [], storySeeds: [], storyHooks: [],
        neighborhoodPulse: pulse
      }
    };
    loadCanonNeighborhoods_(ctx); loadNeighborhoodState_(ctx); // Phases 1–2, as the cycle runs them before the writer
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
    const mapData = writerMapData(); // the loop runs the writer, which writes all 22 hoods
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
  // Rockridge ticks up, West Oakland is flat. Pre-fix every hood's delta == +0.16
  // (output = citywide + frozen offset). Post-fix the per-hood track is the base
  // and the citywide scalar is demoted to a CITY_SENTIMENT_NUDGE (0.15) shade.
  function sentRun(seed, citySent, nhoodDyn) {
    rngImpl = mulberry32(seed);
    // engine.119: the cycle never creates tabs — the map exists before the writer runs
    const sheets = { 'Neighborhood_Map': memSheet('Neighborhood_Map', writerMapData()) };
    const ss = memSS(sheets);
    const ctx = {
      now: new Date(0), config: Object.assign({}, CONTRACT_DEFAULTS, { cycleCount: 95 }), mode: {}, ss,
      summary: {
        cityDynamics: { sentiment: citySent, traffic: 1, retail: 1.5, publicSpaces: 1, nightlife: 0.7 },
        weather: Object.assign({}, CITY_WEATHER), worldEvents: [], storySeeds: [], storyHooks: [],
        neighborhoodDynamics: nhoodDyn
      }
    };
    loadCanonNeighborhoods_(ctx); loadNeighborhoodState_(ctx); // Phases 1–2, as the cycle runs them before the writer
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
  const dynA = { 'Fruitvale': { sentiment: 0.30 }, 'Rockridge': { sentiment: 0.60 }, 'West Oakland': { sentiment: 0.45 } };
  const dynB = { 'Fruitvale': { sentiment: 0.20 }, 'Rockridge': { sentiment: 0.62 }, 'West Oakland': { sentiment: 0.45 } };
  const A = sentRun(555, 0.40, dynA);
  const B = sentRun(555, 0.56, dynB);  // citywide +0.16 uniform swing
  const dFrui = B['Fruitvale'] - A['Fruitvale'];
  const dRock = B['Rockridge'] - A['Rockridge'];
  const dDown = B['West Oakland'] - A['West Oakland'];
  console.log(`   deltas — Fruitvale=${dFrui.toFixed(3)} Rockridge=${dRock.toFixed(3)} WestOakland=${dDown.toFixed(3)} (citywide swing +0.160)`);
  const spread = Math.max(dFrui, dRock, dDown) - Math.min(dFrui, dRock, dDown);
  assert('C6a per-hood deltas NON-uniform (lockstep broken; pre-fix spread==0)', spread > 0.05, 'spread=' + spread.toFixed(3));
  assert('C6b a hood can fall while the city rises (Fruitvale down, citywide up)', dFrui < 0, 'dFrui=' + dFrui.toFixed(3));
  assert('C6c flat-dynamics hood moves only ~nudge*swing (0.024), NOT full 0.16', Math.abs(dDown) < 0.05, 'dDown=' + dDown.toFixed(3));
  // Fallback: a hood with NO neighborhoodDynamics entry still writes a finite sentiment.
  const F = sentRun(555, 0.40, dynA);
  assert('C6d hood with no dynamics entry falls back to citywide scalar (finite)', isFinite(F['Temescal']), String(F['Temescal']));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ C7 — engine.305: the hood pulse follows the written line\'s sign');
{
  const K = P.pulseKindForLine_;
  assert('C7a Neighborhood line graded Down -> Neighborhood-Down', K('Neighborhood', 'Neighborhood-Outabout-Down-S') === 'Neighborhood-Down');
  assert('C7b Neighborhood line graded Up -> Neighborhood', K('Neighborhood', 'Neighborhood-Outabout-Up-M') === 'Neighborhood');
  assert('C7c other kinds pass through (Lifestyle / Community / Faith, graded or not)',
    K('Lifestyle', 'Lifestyle-Outabout-Down-S') === 'Lifestyle' && K('Community', 'Community-Sociability-Up-S') === 'Community' && K('Faith', 'Faith') === 'Faith');
  assert('C7d Neighborhood-Down pulses sentiment -1', JSON.stringify(P.pulseForEvent_('Neighborhood-Down', [], '')) === '{"sentiment":-1}');
  const S0 = {};
  P.recordPulse_(S0, 'Fruitvale', 'Neighborhood-Down', [], 'a down line');
  P.recordPulse_(S0, 'Fruitvale', 'Neighborhood', [], 'an up line');
  assert('C7e a down + an up line: sentiment 0 over 2 events (events count kept)',
    S0.neighborhoodPulse.Fruitvale.sentiment === 0 && S0.neighborhoodPulse.Fruitvale.events === 2, JSON.stringify(S0.neighborhoodPulse.Fruitvale));

  // The real generator on the four-hood city: every first-draw pulse on the three routes into the
  // Neighborhood kind (generateCitizensEvents.js:1016 / 1019 / 1038), checked against the tag the line
  // was WRITTEN with (pulseKindForLine_ is evaluated as the call's argument, so its writtenTag is this pulse's).
  const ROUTES = ['source:nbhdState', 'source:neighborhood', 'source:communityLife'];
  const realPulse = global.recordPulse_, realKind = global.pulseKindForLine_;
  const byRoute = {}; ROUTES.forEach(r => { byRoute[r] = { Down: 0, Up: 0, mismatch: 0 }; });
  let lastWritten = '', textureDropped = 0;
  global.pulseKindForLine_ = (lineKind, writtenTag) => { lastWritten = String(writtenTag || ''); return realKind(lineKind, writtenTag); };
  global.recordPulse_ = (S, hood, kind, tags, text) => {
    const route = ROUTES.find(r => tags && tags.indexOf(r) >= 0);
    const g = /^Neighborhood-[A-Z][a-z]+-(Up|Down)-[SML]$/.exec(lastWritten);
    if (route && g) {
      byRoute[route][g[1]]++;
      if (kind !== (g[1] === 'Down' ? 'Neighborhood-Down' : 'Neighborhood')) byRoute[route].mismatch++;
    }
    return realPulse(S, hood, kind, tags, text);
  };
  rngImpl = mulberry32(305);
  const rows = buildLedger(HOODS, 20);
  for (let cy = 1; cy <= 60; cy++) {
    const ss = memSS({
      'Neighborhood_Map': memSheet('Neighborhood_Map', seedLoaderMapData()),
      'LifeHistory_Log': memSheet('LifeHistory_Log', [['Timestamp', 'Cycle', 'POPID', 'Name', 'Event', 'Tag']])
    });
    const c7 = makeCtx(94 + cy, rows, ss);
    generateCitizensEvents_(c7);
    const nd = c7.summary.engine299 && c7.summary.engine299.noDialBySource;
    textureDropped += (nd && nd['source:neighborhood']) || 0;
  }
  global.recordPulse_ = realPulse; global.pulseKindForLine_ = realKind;
  console.log('   first-draw Neighborhood pulses by route: ' + JSON.stringify(byRoute));
  const mism = ROUTES.reduce((n, r) => n + byRoute[r].mismatch, 0);
  assert('C7f the generator path reaches hood-state Down lines (Fruitvale decay / rent / crime watch)', byRoute['source:nbhdState'].Down > 0, JSON.stringify(byRoute['source:nbhdState']));
  assert('C7g every first-draw Neighborhood pulse matches its written grade (Down -> Neighborhood-Down, Up -> Neighborhood), all three routes', mism === 0, JSON.stringify(byRoute));
  assert('C7h the generator path reaches hood-state Up lines too (Rockridge growth)', byRoute['source:nbhdState'].Up > 0, JSON.stringify(byRoute['source:nbhdState']));
  assert('C7i the community-life route reaches both grades (Down and Up)', byRoute['source:communityLife'].Down > 0 && byRoute['source:communityLife'].Up > 0, JSON.stringify(byRoute['source:communityLife']));
  // In this harness the source:neighborhood route offers only the hardcoded texture strings
  // (CITIZEN_EVENT_TEXTURE_BY_CHARACTER_), which carry no signed fact, so the engine.299 admission drops them —
  // drawn, never written, never pulsed. On a live sheet the same route also writes Event_Content_Ledger library
  // rows with an explicit dial tag (bench C113: Neighborhood-Outabout-Up-S|source:neighborhood|auth:library-s325|
  // dial:outabout:up); there is no ECL tab here, and C7g's kind rule covers those rows the same way.
  assert('C7j harness: the hardcoded hood-texture strings are drawn but write no graded line (admission drops them, noDial moves)',
    textureDropped > 0 && byRoute['source:neighborhood'].Down + byRoute['source:neighborhood'].Up === 0,
    'dropped ' + textureDropped + ' / written ' + JSON.stringify(byRoute['source:neighborhood']));
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('═══ C8 — engine.214 8a Cut B: the trajectory as dial-gated reactions');
{
  const hoodReactionSet_ = loadEngine('../phase05-citizens/generateCitizensEvents.js', 'hoodReactionSet_');
  const hoodReactionMult_ = loadEngine('../phase05-citizens/generateCitizensEvents.js', 'hoodReactionMult_');
  const pw = (b, i) => Math.min(6, b * (1 + 4 * Math.max(0, Math.min(1, i)))); // generateCitizensEvents.js neighborhoodStatePool_
  // [reaction, sign, share of M] per entry, in order (plan step 8, recheck 3 contract)
  const WANT = {
    growth: [['brag', 'up', 1 / 3], ['humble', 'up', 1 / 3], ['complain', 'down', 1 / 6], ['complain', 'down', 1 / 6]],
    decay: [['complain', 'down', 1 / 3], ['complain', 'down', 1 / 3], ['humble', 'up', 1 / 6], ['defend', 'up', 1 / 6]]
  };
  const massMiss = [];
  for (const traj of ['growth', 'decay']) {
    const dir = traj === 'growth' ? 'up' : 'down';
    for (const mi of [0, 0.2, 0.4, 0.6, 1]) {
      const M = pw(1.1, mi) + pw(1.0, mi);
      const set = hoodReactionSet_(traj, M, 'Glenview');
      const sum = set.reduce((n, e) => n + e.weight, 0);
      if (set.length !== 4 || Math.abs(sum - M) > 1e-9) massMiss.push(traj + ' mi ' + mi + ': n ' + set.length + ' sum ' + sum + ' of ' + M);
      set.forEach((e, k) => {
        const [react, sign, share] = WANT[traj][k] || [];
        const want = ['source:nbhdState', 'state:trajectory-' + dir, 'react:' + react, 'dial:outabout:' + sign];
        if (Math.abs(e.weight - M * share) > 1e-9 || JSON.stringify(e.tags) !== JSON.stringify(want) || e.weight * 1.5 > 6) {
          massMiss.push(traj + ' mi ' + mi + ' entry ' + k + ': ' + e.weight + ' ' + e.tags.join(','));
        }
      });
    }
  }
  assert('C8a four entries per direction, each its own reaction / sign / weight (with M/3, against M/6; total = today\'s branch mass; x1.5 under 6), mi 0 / .2 / .4 / .6 / 1',
    massMiss.length === 0, massMiss.slice(0, 3).join(' | '));
  assert('C8b steady, blank and prototype-named trajectories offer nothing',
    hoodReactionSet_('steady', 10.5, 'X').length === 0 && hoodReactionSet_('', 10.5, 'X').length === 0 && hoodReactionSet_('constructor', 10.5, 'X').length === 0);

  const HOOD_NAMES = HOODS.concat(NEUTRAL_HOODS.map(h => h[0]));
  const neutralFx = (k) => JSON.stringify(P.pulseForEvent_(k, [], 'a plain day'));
  const textMiss = [];
  for (const h of HOOD_NAMES) {
    for (const traj of ['growth', 'decay']) {
      for (const e of hoodReactionSet_(traj, 10.5, h)) {
        if (/coordinated|noticed|work/.test(e.text)) textMiss.push('archetype boost: ' + e.text);
        if (e.text.indexOf('<hood>') >= 0) textMiss.push('unrendered: ' + e.text);
        for (const k of ['Neighborhood', 'Neighborhood-Down']) {
          if (JSON.stringify(P.pulseForEvent_(k, e.tags, e.text)) !== neutralFx(k)) textMiss.push('pulse content/tag rule: ' + e.text);
        }
      }
    }
  }
  assert('C8c every reaction text, rendered for all 22 hoods, is clear of the archetype text boosts and the pulse content / tag rules', textMiss.length === 0, textMiss.slice(0, 3).join(' | '));

  const dm = { sociability: 1.5, warmth: 0.5, composure: 1.5 };
  let threw = false; try { hoodReactionMult_('react:shrug', dm); } catch (e) { threw = true; }
  assert('C8d one dial per reaction: brag / defend x sociability, humble x warmth, complain x (2 - composure), both ways; unknown throws',
    hoodReactionMult_('react:brag', dm) === 1.5 && hoodReactionMult_('react:defend', dm) === 1.5 && hoodReactionMult_('react:humble', dm) === 0.5 &&
    hoodReactionMult_('react:complain', dm) === 0.5 && hoodReactionMult_('react:complain', { composure: 0.5 }) === 1.5 && threw);

  // The real generator, through the real T5 pass: one hood's citizens at a dial's extremes, everything else neutral.
  // Each reaction's share of the reaction set must move with its own dial (both directions).
  const RX = {
    Rockridge: { brag: ['caught themselves bragging a little about the neighborhood lately'], humble: ['felt quietly lucky to call Rockridge home'],
      complain: ['grumbled about the neighborhood over coffee', 'griped about Rockridge over dinner'] },
    Fruitvale: { complain: ["complained about the neighborhood to anyone who'd listen", 'vented about Fruitvale on the walk home'],
      humble: ['shrugged off the grumbling about Fruitvale and got on with the week'], defend: ['stuck up for the neighborhood to a friend across town'] }
  };
  const tilt = (hood, dial, value) => {
    rngImpl = mulberry32(214);
    const rows = buildLedger([hood], 20).map(r => { r[HEADERS.indexOf('DialState')] = dialState({ [dial]: value }); return r; });
    for (let cy = 1; cy <= 60; cy++) {
      const ss = memSS({
        'Neighborhood_Map': memSheet('Neighborhood_Map', seedLoaderMapData()),
        'LifeHistory_Log': memSheet('LifeHistory_Log', [['Timestamp', 'Cycle', 'POPID', 'Name', 'Event', 'Tag']])
      });
      generateCitizensEvents_(makeCtx(94 + cy, rows, ss));
    }
    const all = rows.map(r => r[iLife] || '').join('\n');
    const out = {};
    for (const [rx, txts] of Object.entries(RX[hood])) out[rx] = txts.reduce((n, t) => n + all.split(t).length - 1, 0);
    return out;
  };
  const share = (o, rx) => o[rx] / Math.max(1, Object.values(o).reduce((a, b) => a + b, 0));
  const CASES = [['Fruitvale', 'composure', 'complain', 'low'], ['Rockridge', 'sociability', 'brag', 'high'],
    ['Rockridge', 'warmth', 'humble', 'high'], ['Fruitvale', 'sociability', 'defend', 'high']];
  for (const [hood, dial, rx, leansWhen] of CASES) {
    const lo = tilt(hood, dial, 5), hi = tilt(hood, dial, 95);
    console.log('   ' + hood + ' ' + dial + ' 5 vs 95, 20 citizens x 60 Cycles: ' + JSON.stringify(lo) + ' / ' + JSON.stringify(hi));
    const [more, less] = leansWhen === 'low' ? [lo, hi] : [hi, lo];
    assert('C8e ' + dial + ' tilts ' + rx + ' (' + hood + '): its share of the reaction set is higher at ' + leansWhen + ' ' + dial,
      more[rx] > 0 && share(more, rx) > share(less, rx), JSON.stringify({ lo, hi }));
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
