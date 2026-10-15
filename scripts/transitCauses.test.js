'use strict';
// engine.183 (S440) — THE NUMBERS CARRY THEIR CAUSES.
// Proves: game day is the sports feed (no rng, no dead domain scan) and lands
// by hood intersection; Coliseum station is keyed to East Oakland (real
// demographics, a hood citizens carry in affectedHoods); previous-cycle events
// come from WorldEvents_V3_Ledger and lift the stations serving their hoods;
// initiative phases move the stations/corridors they build (via the slice
// applyInitiativeImplementationEffects_ publishes — one tracker read); every
// row carries a Factors string; the story signals name the drivers.
// Run: node scripts/transitCauses.test.js
const fs = require('fs'), path = require('path');
const R = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('  FAIL: ' + msg); } }
function eq(a, b, msg) { ok(a === b, msg + ' (got ' + JSON.stringify(a) + ', want ' + JSON.stringify(b) + ')'); }
// engine.290: the base is a ledger share (non-integer), so a ×mult comparison
// against an already-rounded row can land one rider off.
function near(a, b, msg) { ok(Math.abs(a - b) <= 1, msg + ' (got ' + a + ', want ' + b + ' ±1)'); }

// ── fake spreadsheet ────────────────────────────────────────────────────────
function fakeSheet(rows) {
  return {
    getLastRow: () => rows.length,
    getLastColumn: () => (rows[0] || []).length,
    getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
    getRange: (r, c, nr, nc) => ({
      getValues: () => [rows[0].slice(c - 1, c - 1 + (nc || 1))],
      setValue: (v) => { rows[0][c - 1] = v; }
    }),
    appendRow: (r) => rows.push(r)
  };
}
const V3_HEADER = ['Timestamp', 'Cycle', 'Description', 'Type', 'Domain', 'Severity', 'Neighborhood'];
function fakeSS(opts) {
  const tabs = {
    Transit_Metrics: fakeSheet([['Timestamp', 'Cycle', 'Station', 'RidershipVolume', 'OnTimePerformance', 'TrafficIndex', 'Corridor', 'Notes']]),
    WorldEvents_V3_Ledger: fakeSheet([V3_HEADER].concat(opts.v3 || [])),
    Initiative_Tracker: fakeSheet(opts.tracker || [['InitiativeID', 'Name']])
  };
  return { getSheetByName: (n) => tabs[n] || null, _tabs: tabs };
}

// engine.290 — the C111 22-hood fixture (Neighborhood_Demographics Adults,
// commute-inbound workers from the ledger snapshot, Neighborhood_Map
// RetailVitality + ChildAreas), read 2026-10-15 for the Task 3 read-before.
const C111 = {"hoods":{"Downtown":[2286,154,11.9],"Temescal":[2118,53,5.5],"Laurel":[1494,25,6.47],"West Oakland":[1651,96,8.65],"Fruitvale":[1546,45,10.55],"Jack London":[2176,71,13.75],"Rockridge":[1489,24,10.2],"Adams Point":[1781,3,5.58],"Grand Lake":[1638,5,10.39],"Piedmont Ave":[1492,17,11.55],"Chinatown":[1485,26,9.27],"Brooklyn":[1483,5,7.63],"Eastlake":[1636,7,6.72],"Glenview":[1481,6,4.38],"Dimond":[1481,9,9.78],"Ivy Hill":[1334,6,4.53],"San Antonio":[1513,5,4.88],"KONO":[420,6,8.48],"Lake Merritt":[453,22,8.07],"Uptown":[500,64,12.49],"Baylight District":[411,125,5.72],"East Oakland":[1530,4,5.99]},"children":{"old oakland":"Downtown","city center":"Downtown","telegraph corridor":"Temescal","longfellow":"Temescal","shafter":"Temescal","maxwell park":"Laurel","golden gate":"West Oakland","mcclymonds":"West Oakland","prescott":"West Oakland","hoover-foster":"West Oakland","jack london square":"Jack London","brooklyn basin":"Jack London","claremont":"Rockridge","montclair":"Piedmont Ave","koreatown-northgate":"KONO","koreatown":"KONO","northgate":"KONO","lakeshore":"Lake Merritt","coliseum":"East Oakland","elmhurst":"East Oakland"}};
function c111Summary() {
  const list = Object.keys(C111.hoods), set = {}, ns = {}, inbound = {};
  list.forEach(h => { set[h.toLowerCase()] = true; ns[h] = { retailVitality: C111.hoods[h][2] }; inbound[h] = C111.hoods[h][1]; });
  return { canonHoods: { list, set, children: C111.children, core: list }, neighborhoodState: ns, commuteInbound: inbound };
}

// engine.290 move 4 — a Simulation_Ledger slice for the crew read
const LEDGER_H = ['POPID', 'First', 'Last', 'RoleType', 'Status', 'EmployerBizId'];
function ledgerOf(rows) { return { headers: LEDGER_H.slice(), rows: rows.map(r => r.slice()) }; }
const BART_MGR = ['POP-00617', 'Eleanor', 'Rivera', 'BART Station Manager', 'Active', 'BIZ-00014'];
const BART_PR = ['POP-01039', 'Ximena', 'Mehta', 'Bart Transit PR', 'Active', 'BIZ-00014'];
const crewRow = (id, first, role, status) => [id, first, 'Test', role, status, 'BIZ-00014'];

// ── transit engine harness ──────────────────────────────────────────────────
const appends = [], ripples = [];
const sandbox = {
  Logger: { log() {} },
  SHEET_NAMES: { WORLD_EVENTS_V3_LEDGER: 'WorldEvents_V3_Ledger' },
  safeRand_: (ctx) => ctx.rng,
  requireTab_: (ss, name) => ss.getSheetByName(name),
  queueBatchAppendIntent_: (ctx, tab, rows) => appends.push({ tab, rows }),
  queueAppendIntent_: (ctx, tab, row) => appends.push({ tab, rows: [row] }),
  recordRipple_: (ctx, r) => ripples.push(r),
  inWorldStamp_: () => 'Y3C2',
  getNeighborhoodDemographics_: () => {
    const out = {};
    Object.keys(C111.hoods).forEach(h => { out[h] = { adults: C111.hoods[h][0], students: 0, seniors: 0 }; });
    return out;
  }
};
const T = new Function(...Object.keys(sandbox),
  R('phase01-config/engine94SheetContract.js') + '\n' +
  R('phase01-config/canonNeighborhoodLoader.js') + '\n' +
  R('utilities/ensureTransitMetrics.js') + '\n' + R('phase02-world-state/updateTransitMetrics.js') +
  '\nreturn { transitStaffing_, transitCrewClass_, ENGINE290_CONFIG_SEEDS, transitDials_, transitStationShares_, updateTransitMetrics_Phase2_, getTransitStorySignals_, isGameDay_, gameDayHoodsFor_, initiativeTransitEffects_, OAKLAND_BART_STATIONS, TRAFFIC_CORRIDORS, TRANSIT_METRICS_HEADERS };'
)(...Object.values(sandbox));

function run(S, opts) {
  appends.length = 0; ripples.length = 0;
  const ctx = { ss: fakeSS(opts || {}), ledger: (opts && opts.ledger) || ledgerOf([]), summary: Object.assign({ absoluteCycle: 107, season: 'spring', weather: { type: 'clear' } }, c111Summary(), S), rng: () => 0.5 };
  const all = T.updateTransitMetrics_Phase2_(ctx);
  const by = {}; all.forEach(m => { by[m.station || m.corridor] = m; });
  return { ctx, S: ctx.summary, all, by };
}

// 1. Static: Coliseum keyed to East Oakland, serves Baylight; Factors header; corridor hoods
{
  const col = T.OAKLAND_BART_STATIONS.filter(s => s.station === 'Coliseum')[0];
  eq(col.neighborhood, 'East Oakland', 'Coliseum station keyed to East Oakland');
  ok(col.corridors.indexOf('Baylight District') >= 0, 'Coliseum station serves Baylight District');
  eq(T.TRANSIT_METRICS_HEADERS[8], 'Factors', 'Factors is the 9th header');
  ok(T.TRAFFIC_CORRIDORS.every(c => Array.isArray(c.hoods) && c.hoods.length && typeof c.freeway === 'boolean'), 'every corridor carries hoods + freeway flag');
}

// 2. No feed rows → no game day, no rng involvement
{
  const r = run({ sportsFeedEntries: [], sportsZones: ['Jack London', 'Downtown'] });
  eq(r.S.transitMetrics.factors.gameDay, false, 'no feed row → no game day');
  eq(r.S.transitMetrics.factors.gameDayHoods.length, 0, 'no game-day hoods');
  ok(r.all.every(m => m.factors.indexOf('game day') < 0), 'no row claims game day');
  eq(r.all.length, 18, '18 rows (8 stations + 10 corridors)');
  ok(r.all.every(m => typeof m.factors === 'string' && m.factors.length > 0), 'every row carries a Factors string');
  eq(appends[0].rows.length, 18, 'batch append queued 18 rows');
  eq(appends[0].rows[0].length, 9, 'row has 9 cells (Factors last)');
  eq(appends[0].rows[0][8], r.all[0].factors, 'Factors cell = the row factors');
  eq(Object.keys(r.S.transitMetrics.causes).length, 18, 'S.transitMetrics.causes keyed per row');
  eq(r.by['12th St Oakland City Center'].factors, 'base: ledger; rebased', 'a quiet row still names its frame (first Cycle on the ledger base)');
  const q = run({ sportsFeedEntries: [], previousCycleState: { transitBaseVersion: 2 } });
  eq(q.by['12th St Oakland City Center'].factors, 'base: ledger', 'a quiet row after the rebase names only its base');
}

// 3. Feed row in Baylight → Coliseum + I-880 take the game, Broadway/12th St do not
{
  const base = run({ sportsFeedEntries: [], sportsZones: ['Baylight District'] });
  const r = run({ sportsWeek: { Oaks: { h: 3, g: 3, unsigned: 1, venueShare: 1, venue: ['Baylight District'] } }, sportsZones: ['Baylight District'] });
  eq(r.S.transitMetrics.factors.gameDay, true, 'a home week → game day');
  eq(r.S.transitMetrics.factors.gameDayHoods.join(','), 'Baylight District', 'game-day hoods = the franchise venue');
  ok(r.by['Coliseum'].factors.indexOf('game day (Baylight District)') >= 0, 'Coliseum row names the game');
  ok(r.by['Coliseum'].notes.indexOf('game day crowds') >= 0, 'Coliseum notes: game day crowds');
  eq(r.by['Coliseum'].ridershipVolume, Math.round(base.by['Coliseum'].ridershipVolume * 1.3), 'Coliseum +30% on game day');
  ok(r.by['12th St Oakland City Center'].factors.indexOf('game day') < 0, '12th St unaffected by a Baylight game');
  ok(r.by['I-880 North'].factors.indexOf('game day') >= 0 && r.by['I-880 South'].factors.indexOf('game day') >= 0, 'I-880 both directions carry the game');
  ok(r.by['I-880 North'].notes.indexOf('event traffic') >= 0, 'I-880 notes: event traffic');
  ok(r.by['Broadway'].factors.indexOf('game day') < 0 && r.by['Grand Ave'].factors.indexOf('game day') < 0, 'Broadway / Grand Ave do not');
}


// engine.204/205: an away week is no game day; a partial home week scales the bump
{
  const base = run({ sportsFeedEntries: [], sportsZones: ['Baylight District'] });
  const away = run({ sportsFeedEntries: [{ homeNeighborhood: 'Baylight District' }], sportsWeek: { Oaks: { h: 0, g: 2, unsigned: 0.4, venueShare: 0, venue: ['Baylight District'] } }, sportsZones: ['Baylight District'] });
  eq(away.S.transitMetrics.factors.gameDay, false, 'an away week (typed hood or not) → no game day');
  const half = run({ sportsWeek: { Oaks: { h: 1, g: 2, unsigned: 0.5, venueShare: 0.5, venue: ['Baylight District'] } }, sportsZones: ['Baylight District'] });
  near(half.by['Coliseum'].ridershipVolume, Math.round(base.by['Coliseum'].ridershipVolume * 1.075), 'Coliseum +30% × home volume .25 = +7.5%');
}

// 4. Legacy zones (feed row without a hood) → Jack London / Downtown stations + corridors
{
  const r = run({ sportsWeek: { "A's": { h: 2, g: 2, unsigned: 1, venueShare: 1, venue: ['Jack London', 'Downtown'] } }, sportsZones: ['Jack London', 'Downtown'] });
  eq(r.S.transitMetrics.factors.gameDayHoods.join(','), 'Jack London,Downtown', 'a home week lands on the franchise\'s own venue');
  ok(r.by['12th St Oakland City Center'].factors.indexOf('game day') >= 0, '12th St takes the legacy game');
  ok(r.by['West Oakland'].factors.indexOf('game day') >= 0, 'West Oakland station (Jack London corridor) too');
  ok(r.by['Coliseum'].factors.indexOf('game day') < 0, 'Coliseum does not');
  ok(r.by['I-980'].factors.indexOf('game day') >= 0 && r.by['Broadway'].factors.indexOf('game day') >= 0, 'I-980 + Broadway load');
  ok(r.by['I-880 South'].factors.indexOf('game day') < 0, 'I-880 South does not');
}

// 5. engine.290: the Coliseum station's base is its ledger share (East Oakland
// primary + Baylight District catchment), not the authored table's 6000.
{
  const r = run({ sportsFeedEntries: [] });
  ok(r.by['Coliseum'].ridershipVolume !== 6000 && /^base: ledger/.test(r.by['Coliseum'].factors), 'Coliseum ridership priced off the ledger share');
}

// 6. V3 events lift the stations serving their hoods; major count includes domain
{
  const v3 = [
    ['Y3C1', 106, 'Street fair', 'community', 'CELEBRATION', 'low', 'Fruitvale'],
    ['Y3C1', 106, 'Second thing', 'community', 'CULTURE', 'low', 'Fruitvale'],
    ['Y3C1', 106, 'Water main', 'infrastructure', 'CIVIC', 'high', 'Temescal'],
    ['Y3C1', 105, 'Old cycle', 'x', 'SPORTS', 'high', 'Fruitvale']
  ];
  const base = run({ sportsFeedEntries: [] });
  const r = run({ sportsFeedEntries: [] }, { v3 });
  eq(r.S.transitMetrics.factors.majorEvents, 2, 'major = CELEBRATION (domain) + high (severity); low CULTURE not; prior cycle not');
  eq(JSON.stringify(r.S.transitMetrics.factors.eventHoods), JSON.stringify({ Fruitvale: 2, Temescal: 1 }), 'per-hood tally');
  ok(r.by['Fruitvale'].factors.indexOf('events in Fruitvale ×2') >= 0, 'Fruitvale row names its events');
  // ×1.10 = the existing city-wide major-event modifier (2 × 5%); ×1.08 = the hood lift (2 × 4%) — the served-hood list counts Fruitvale once
  eq(r.by['Fruitvale'].ridershipVolume, Math.round(base.by['Fruitvale'].ridershipVolume * 1.10 * 1.08), 'Fruitvale +8% for two events on top of the city-wide event modifier');
  near(r.by['Rockridge'].ridershipVolume, Math.round(base.by['Rockridge'].ridershipVolume * 1.10), 'Rockridge takes only the city-wide modifier');
  ok(r.by['MacArthur'].factors.indexOf('events in Temescal') >= 0, 'MacArthur (Temescal) names its event');
  ok(r.by['Rockridge'].factors.indexOf('events') < 0, 'Rockridge unaffected');
  // Coliseum serves 'East Oakland' — and Fruitvale station's corridors include East Oakland, not the other way round
  ok(r.by['Coliseum'].factors.indexOf('events') < 0, 'Coliseum unaffected');
}

// 7. Initiative slice → station / corridor effects by phase
{
  const base = run({ sportsFeedEntries: [] });
  const hub = (phase) => ({ sportsFeedEntries: [], initiativeImplementationEffects: { transit: [{ name: 'Fruitvale Transit Hub Phase II', phase, intensity: 0.2, domain: 'transit', hoods: ['Fruitvale'], baylight: false }] } });
  let r = run(hub('design-phase'));
  ok(r.by['Fruitvale'].factors.indexOf('Fruitvale Transit Hub Phase II: design-phase') >= 0, 'design phase names itself on the Fruitvale row');
  eq(r.by['Fruitvale'].ridershipVolume, base.by['Fruitvale'].ridershipVolume, 'design phase moves nothing');
  eq(r.by['International Blvd'].trafficIndex, base.by['International Blvd'].trafficIndex, 'design phase: street unchanged');
  eq(r.S.transitMetrics.factors.initiatives.join('|'), 'Fruitvale Transit Hub Phase II: design-phase', 'summary carries the tag');

  r = run(hub('construction-active'));
  eq(r.by['Fruitvale'].ridershipVolume, Math.round(base.by['Fruitvale'].ridershipVolume * 0.95), 'construction: Fruitvale ×0.95');
  eq(r.by['Fruitvale'].onTimePerformance, Math.round((base.by['Fruitvale'].onTimePerformance - 0.03) * 100) / 100, 'construction: on-time −0.03');
  eq(r.by['International Blvd'].trafficIndex, base.by['International Blvd'].trafficIndex + 8, 'construction: International Blvd +8');
  eq(r.by['I-880 South'].trafficIndex, base.by['I-880 South'].trafficIndex, 'construction: the freeway is not the build street');
  ok(r.by['International Blvd'].factors.indexOf('construction-active') >= 0, 'street row names the build');

  r = run(hub('operational'));
  eq(r.by['Fruitvale'].ridershipVolume, Math.round(base.by['Fruitvale'].ridershipVolume * 1.2), 'open: Fruitvale ×1.20');
  eq(r.by['Fruitvale'].onTimePerformance, Math.round((base.by['Fruitvale'].onTimePerformance + 0.02) * 100) / 100, 'open: on-time +0.02');

  // civic.38 ruling (g): the open lift scales with upkeep; the phase stays the gate.
  const tended = (phase, tend) => ({ sportsFeedEntries: [], initiativeImplementationEffects: { transit: [{ name: 'Fruitvale Transit Hub Phase II', phase, intensity: 0.9 * tend, tend, domain: 'transit', hoods: ['Fruitvale'], baylight: false }] } });
  r = run(tended('operational', 1));
  eq(r.by['Fruitvale'].ridershipVolume, Math.round(base.by['Fruitvale'].ridershipVolume * 1.2), 'upkeep 1: a tended hub pays the full ×1.20');
  ok(r.by['Fruitvale'].factors.indexOf('upkeep') < 0, 'upkeep 1: a tended hub carries no upkeep note');
  r = run(tended('operational', 0.3));
  near(r.by['Fruitvale'].ridershipVolume, Math.round(base.by['Fruitvale'].ridershipVolume * 1.06), 'upkeep floor 0.3: the lift fades to ×1.06');
  ok(r.by['Fruitvale'].ridershipVolume > base.by['Fruitvale'].ridershipVolume, 'a neglected hub is never below an ordinary station');
  ok(r.by['Fruitvale'].factors.indexOf('Fruitvale Transit Hub Phase II: operational (upkeep 0.30)') >= 0, 'the Fruitvale row names the slip');
  r = run(tended('construction-active', 0.3));
  eq(r.by['Fruitvale'].ridershipVolume, Math.round(base.by['Fruitvale'].ridershipVolume * 0.95), 'construction stays all-or-nothing under neglect');
  eq(T.initiativeTransitEffects_(tended('operational', 0.55)).stations[0].ridershipMult, 1 + (1.2 - 1) * 0.55, 'upkeep 0.55: ridership multiplier is 1 + 0.20 × 0.55');

  // Baylight under construction on the site → the station serving it + the freeways; the street does not
  const bay = (phase, hoods) => ({ sportsFeedEntries: [], initiativeImplementationEffects: { transit: [{ name: 'Baylight District — Final Council Vote', phase, intensity: 0.3, domain: 'sports', hoods, baylight: true }] } });
  r = run(bay('construction-planning', ['Baylight District']));
  near(r.by['Coliseum'].ridershipVolume, Math.round(base.by['Coliseum'].ridershipVolume * 1.05), 'Baylight build: Coliseum ×1.05');
  eq(r.by['I-880 North'].trafficIndex, base.by['I-880 North'].trafficIndex + 6, 'Baylight build: I-880 North +6');
  eq(r.by['I-880 South'].trafficIndex, base.by['I-880 South'].trafficIndex + 6, 'Baylight build: I-880 South +6');
  eq(r.by['International Blvd'].trafficIndex, base.by['International Blvd'].trafficIndex, 'Baylight build: street unchanged');
  r = run(bay('operational', ['Baylight District']));
  eq(r.by['Coliseum'].ridershipVolume, base.by['Coliseum'].ridershipVolume, 'Baylight open: no extra effect (the feed carries it)');
  eq(r.S.transitMetrics.factors.initiatives.length, 0, 'Baylight open: no tag');
}

// 8. Disruption puts a hood citizens carry into affectedHoods
{
  const r = run({ sportsFeedEntries: [], weather: { type: 'rain', frontState: 'STORM' },
    initiativeImplementationEffects: { transit: [{ name: 'Coliseum Works', phase: 'construction-active', intensity: 0.8, domain: 'transit', hoods: ['East Oakland'], baylight: false }] } });
  eq(r.S.transitState.disruptionOngoing, true, 'storm → disruption');
  // Coliseum AND Fruitvale serve East Oakland, so both are under the build and both are worst; both hoods are canon
  ok(r.S.transitState.affectedHoods.indexOf('East Oakland') >= 0, 'affectedHoods carries East Oakland (a hood citizens carry)');
  ok(r.S.transitState.affectedHoods.indexOf('Coliseum') < 0, 'no ghost hood in affectedHoods');
  eq(r.by['Coliseum'].onTimePerformance, 0.67, 'Coliseum on-time 0.85 − 0.15 storm − 0.03 build');
  ok(ripples[0].targetIds.indexOf('East Oakland') >= 0, 'ripple targets the canon hood');
}

// 9. Story signals name the drivers
{
  const v3 = [['Y3C1', 106, 'Fair', 'community', 'CELEBRATION', 'low', 'Fruitvale']];
  const r = run({ sportsWeek: { Oaks: { h: 3, g: 3, unsigned: 1, venueShare: 1, venue: ['Baylight District'] } }, sportsZones: ['Baylight District'],
    initiativeImplementationEffects: { transit: [{ name: 'Fruitvale Transit Hub Phase II', phase: 'design-phase', intensity: 0.2, domain: 'transit', hoods: ['Fruitvale'], baylight: false }] } }, { v3 });
  const sig = T.getTransitStorySignals_(r.ctx);
  const gd = sig.filter(s => s.type === 'gameday_transit')[0];
  ok(gd && gd.headline === 'Baylight District crowds impact transit', 'game-day headline names the hood');
  eq(gd.data.drivers, 'game day in Baylight District; events in Fruitvale; Fruitvale Transit Hub Phase II: design-phase', 'drivers phrase');
  eq(gd.data.causes['Coliseum'], r.by['Coliseum'].factors, 'signal carries per-row causes');
  const rid = sig.filter(s => s.type === 'transit_ridership')[0];
  ok(rid && rid.headline.indexOf('game day in Baylight District') > 0, 'ridership headline names the drivers');
}

// ── applyInitiativeImplementationEffects_ publishes the transit slice ────────
{
  const cells = [];
  const sb2 = {
    Logger: { log() {} },
    recordRipple_: () => {},
    queueCellIntent_: (ctx, tab, row, col, value) => cells.push({ tab, row, col, value })
  };
  const I = new Function(...Object.keys(sb2), R('phase02-world-state/applyInitiativeImplementationEffects.js') + '\nreturn { applyInitiativeImplementationEffects_ };')(...Object.values(sb2));
  const tracker = [
    ['InitiativeID', 'Name', 'Status', 'ImplementationPhase', 'PolicyDomain', 'AffectedNeighborhoods', 'Budget'],
    ['INIT-001', 'Temescal Community Health Center', 'passed', 'dispatch-live', 'health', 'Temescal', 45000000],
    ['INIT-003', 'Fruitvale Transit Hub Phase II — Visioning', 'visioning-complete', 'visioning-complete', 'transit', 'Fruitvale', 230000000],
    ['INIT-006', 'Baylight District — Final Council Vote', 'passed', 'construction-planning', 'sports', 'Jack London, Downtown', 2100000000],
    ['INIT-009', 'Announced hub', 'announced', 'announced', 'transit', 'Dimond', 0]
  ];
  let ctx = { ss: fakeSS({ tracker }), summary: { sportsZones: ['Jack London', 'Downtown'] }, config: {} };
  I.applyInitiativeImplementationEffects_(ctx);
  let t = ctx.summary.initiativeImplementationEffects.transit;
  eq(t.length, 3, 'slice = the two transit rows + Baylight (health excluded)');
  eq(t[0].name + '|' + t[0].phase + '|' + t[0].hoods.join(',') + '|' + t[0].baylight, 'Fruitvale Transit Hub Phase II — Visioning|visioning-complete|Fruitvale|false', 'INIT-003 as the tracker says');
  eq(t[1].phase + '|' + t[1].hoods.join(',') + '|' + t[1].baylight, 'construction-planning|Jack London,Downtown|true', 'Baylight before the sport opens it: tracker phase + hoods');
  eq(t[2].phase + '|' + t[2].intensity, 'announced|0', 'a zero-intensity phase still publishes (names itself, moves nothing)');
  eq(cells.length, 0, 'no T7 write when Baylight is not open');
  // the transit engine maps it: planning → freeway + station effects on the tracker's hoods
  const fx = T.initiativeTransitEffects_(ctx.summary);
  eq(fx.corridors.length, 1, 'one corridor effect (Baylight build)');
  eq(fx.corridors[0].freeway + '|' + fx.corridors[0].traffic, 'true|6', 'freeway +6');
  eq(fx.stations.length, 3, 'three station entries (hub tag-only, Baylight ×1.05, announced tag-only)');

  ctx = { ss: fakeSS({ tracker }), summary: { sportsZones: ['Baylight District'] }, config: {} };
  I.applyInitiativeImplementationEffects_(ctx);
  t = ctx.summary.initiativeImplementationEffects.transit;
  eq(t[1].phase + '|' + t[1].hoods.join(','), 'operational|Baylight District', 'sport in Baylight → slice carries the T7-corrected phase + hoods');
  eq(cells.length, 1, 'T7 wrote the tracker cell');
  eq(T.initiativeTransitEffects_(ctx.summary).corridors.length, 0, 'operational Baylight: no corridor effect');
}

// engine.206 — a homestand is a transit seed: one ripple per franchise home week at venue[0]
{
  const crowds = () => ripples.filter(r => r.effectType === 'game-day-crowds');
  run({ sportsWeek: { Oaks: { h: 3, g: 3, unsigned: 1, venueShare: 1, venue: ['Baylight District'] } }, sportsZones: ['Baylight District'] });
  let c = crowds();
  eq(c.length, 1, 'a home week → one game-day-crowds ripple');
  eq(c[0].causeType, 'transit-event', 'causeType transit-event (→ CIVIC seed)');
  eq(c[0].neighborhood, 'Baylight District', 'at the franchise venue');
  eq(c[0].magnitude, 0.3, 'magnitude = GAMEDAY_RIDERSHIP_BOOST × unsigned × venueShare (.3 × 1 × 1)');
  eq(c[0].causeId, 'game-day-c107:Oaks', 'causeId names the cycle and the franchise');
  ok(/Oaks home week — 3 home games; game-day crowds through Baylight District, station ridership up to \+30%/.test(c[0].causeDetail), 'detail names the franchise, home games, venue, lift: ' + c[0].causeDetail);
  run({ sportsWeek: { "A's": { h: 2, g: 3, unsigned: 0.6, venueShare: 2 / 3, venue: ['Jack London', 'Downtown'] } }, sportsZones: ['Jack London', 'Downtown'] });
  c = crowds();
  eq(c.length, 1, 'a two-hood venue → still ONE ripple (one homestand, one seed)');
  eq(c[0].neighborhood, 'Jack London', 'at venue[0], where the economy\'s SPORTS_WEEK also sits');
  eq(c[0].targetIds.join(','), 'Jack London,Downtown', 'both venue hoods as targets');
  eq(c[0].magnitude, 0.12, '.3 × .6 × 2/3 = .12');
  run({ sportsWeek: { Oaks: { h: 0, g: 2, unsigned: 0.4, venueShare: 0, venue: ['Baylight District'] } }, sportsZones: ['Baylight District'] });
  eq(crowds().length, 0, 'an away week → no game-day ripple');
  run({ sportsZones: ['Baylight District'] });
  eq(crowds().length, 0, 'no week → none');
  run({ sportsWeek: { "A's": { h: 3, g: 3, unsigned: 0.8, venueShare: 1, venue: ['Jack London', 'Downtown'] }, Oaks: { h: 1, g: 2, unsigned: 0.2, venueShare: 0.5, venue: ['Baylight District'] } }, sportsZones: ['Jack London', 'Downtown', 'Baylight District'] });
  c = crowds();
  eq(c.length, 2, 'two franchises home → two ripples, one each');
  eq(c.map(r => r.neighborhood).sort().join(','), 'Baylight District,Jack London', 'each at its own primary venue');
}

// engine.290 move 1 — a row writes only the columns its kind computes
{
  run({});
  const rows = appends.filter(a => a.tab === 'Transit_Metrics').reduce((x, a) => x.concat(a.rows), []);
  const st = rows.filter(r => r[2] !== ''), co = rows.filter(r => r[2] === '');
  eq(st.length, 8, '8 station rows written');
  eq(co.length, 10, '10 corridor rows written');
  ok(st.every(r => r[5] === ''), 'every station row: TrafficIndex blank');
  ok(st.every(r => typeof r[3] === 'number' && typeof r[4] === 'number'), 'every station row: ridership + on-time are numbers');
  ok(co.every(r => r[3] === '' && r[4] === ''), 'every corridor row: ridership + on-time blank');
  ok(co.every(r => typeof r[5] === 'number' && r[6] !== ''), 'every corridor row: TrafficIndex a number + corridor named');
}

// engine.290 move 2 — same clocks: dayType is S.isWeekend; only a major holiday cuts
{
  eq(T.ENGINE290_CONFIG_SEEDS.length, 16, 'engine.290 seeds sixteen dials');
  eq(T.ENGINE290_CONFIG_SEEDS.filter(x => x[0] === 'transitStaffingGovernor')[0][1], 0, 'governor seeds 0');
  eq(T.transitDials_({ config: { transitWeekendMult: 0.5 } }).transitWeekendMult, 0.5, 'a World_Config cell is read');
  eq(T.transitDials_({ config: { transitWeekendMult: 9 } }).transitWeekendMult, 0.6, 'an out-of-range cell reads the seed');
  const st = (r, n) => r.by[n].ridershipVolume;
  const base = run({ isWeekend: false });
  eq(base.S.transitMetrics.factors.dayType, 'weekday', 'isWeekend false → weekday');
  const wk = run({ isWeekend: true });
  eq(wk.S.transitMetrics.factors.dayType, 'weekend', 'isWeekend true → weekend');
  eq(st(wk, 'Fruitvale'), Math.round(st(base, 'Fruitvale') * 0.6) , 'weekend → ×transitWeekendMult on ridership');
  ok(/weekend/.test(wk.by['Fruitvale'].factors), 'weekend named in Factors');
  const minor = run({ isWeekend: false, holiday: 'Valentine', holidayLabel: "Valentine's", holidayPriority: 'minor', holidayNeighborhood: null });
  eq(st(minor, 'Fruitvale'), st(base, 'Fruitvale'), 'a minor holiday leaves ridership uncut');
  ok(/holiday: Valentine's \(no cut\)/.test(minor.by['Fruitvale'].factors), 'a minor holiday is tagged: ' + minor.by['Fruitvale'].factors);
  eq(minor.S.transitMetrics.factors.dayType, 'weekday', 'a holiday no longer overwrites dayType');
  const major = run({ isWeekend: true, holiday: 'Easter', holidayLabel: 'Easter', holidayPriority: 'major', holidayNeighborhood: null });
  eq(st(major, 'Fruitvale'), Math.round(st(base, 'Fruitvale') * 0.4), 'a major holiday cuts by transitMajorHolidayMult (outranks the weekend, never stacks)');
  ok(/holiday: Easter \(major\)/.test(major.by['Fruitvale'].factors), 'a major holiday is tagged major');
  const corBase = base.by['Grand Ave'].trafficIndex, corMajor = major.by['Grand Ave'].trafficIndex;
  ok(corMajor < corBase, 'a major holiday cuts corridor traffic too (' + corBase + ' → ' + corMajor + ')');
  const hal = run({ isWeekend: false, holiday: 'Halloween', holidayLabel: 'Halloween', holidayPriority: 'major', holidayNeighborhood: 'Temescal' });
  const majorNoHood = run({ isWeekend: false, holiday: 'Easter', holidayLabel: 'Easter', holidayPriority: 'major', holidayNeighborhood: null });
  ok(st(hal, 'MacArthur') > st(majorNoHood, 'MacArthur'), 'the holiday hood lifts its primary station (MacArthur → Temescal)');
  ok(/Halloween in Temescal/.test(hal.by['MacArthur'].factors), 'holiday-hood lift named');
  eq(st(hal, 'Fruitvale'), st(majorNoHood, 'Fruitvale'), 'a station outside the holiday hood gets no hood lift');
  ok(/Halloween in Temescal/.test(hal.by['Telegraph Ave'].factors) || T.TRAFFIC_CORRIDORS.filter(c => c.corridor === 'Telegraph Ave')[0].hoods.indexOf('Temescal') < 0, 'the surface street through the holiday hood is lifted');
  ok(!/Halloween in Temescal/.test(hal.by['I-580 West'].factors), 'a freeway through the holiday hood is not');
  const ff = run({ isWeekend: false, isFirstFriday: true });
  ok(st(ff, '19th St Oakland') > st(base, '19th St Oakland'), 'First Friday lifts 19th St');
  ok(/First Friday/.test(ff.by['19th St Oakland'].factors), 'First Friday named on 19th St');
  eq(st(ff, 'Rockridge'), st(base, 'Rockridge'), 'First Friday leaves Rockridge alone');
  ok(ff.by['Telegraph Ave'].trafficIndex >= base.by['Telegraph Ave'].trafficIndex && /First Friday/.test(ff.by['Broadway'].factors), 'First Friday on Telegraph + Broadway');
  const n19 = T.OAKLAND_BART_STATIONS.filter(x => x.station === '19th St Oakland')[0];
  ok(n19.corridors.indexOf('Uptown') >= 0 && n19.corridors.indexOf('KONO') >= 0, '19th St catchment carries Uptown + KONO');
}

// engine.290 move 3 — ridership share from the ledgers (C111 22-hood fixture)
{
  const r = run({ sportsFeedEntries: [], previousCycleState: { transitBaseVersion: 2 } });
  const sh = T.transitStationShares_(r.ctx, (() => { const o = {}; Object.keys(C111.hoods).forEach(h => o[h] = { adults: C111.hoods[h][0] }); return o; })(), T.transitDials_({}), T.OAKLAND_BART_STATIONS);
  const total = Object.values(sh.byStation).reduce((a, b) => a + b, 0);
  ok(Math.abs(total - 1) < 1e-9, 'shares sum to 1 over the 8 stations (' + total + ')');
  eq(Object.keys(sh.byStation).length, 8, 'a share per station');
  ok(sh.byStation['12th St Oakland City Center'] > sh.byStation['West Oakland'], '12th St ranks above West Oakland station (' + sh.byStation['12th St Oakland City Center'].toFixed(3) + ' vs ' + sh.byStation['West Oakland'].toFixed(3) + ')');
  const n12 = T.OAKLAND_BART_STATIONS.filter(x => x.station === '12th St Oakland City Center')[0];
  const nWO = T.OAKLAND_BART_STATIONS.filter(x => x.station === 'West Oakland')[0];
  eq(n12.neighborhood, 'Downtown', '12th St is a Downtown primary');
  ok(nWO.corridors.indexOf('Downtown') < 0, 'West Oakland station no longer splits Downtown');
  ok(n12.corridors.indexOf('Jack London') >= 0, '12th St serves Jack London');
  eq(sh.missing['MacArthur'].join(','), 'North Oakland', 'a served name with no hood row is named (North Oakland is not a ChildArea on the map)');
  ok(/no row: North Oakland/.test(r.by['MacArthur'].factors), 'MacArthur row says so: ' + r.by['MacArthur'].factors);
  eq(sh.missing['Coliseum'].length, 0, 'Coliseum / Elmhurst fold to East Oakland');
  eq(sh.missing['Rockridge'].length, 0, 'Montclair folds to Piedmont Ave');
  const sumRiders = Object.keys(sh.byStation).reduce((a, k) => a + 60000 * sh.byStation[k], 0);
  ok(Math.abs(sumRiders - 60000) < 1e-6, 'base riders sum to transitCityRiders');
  // retail is a bounded lift (±transitRetailWeight×0.5): Temescal from below the median to the cap
  const hot = run({ sportsFeedEntries: [], previousCycleState: { transitBaseVersion: 2 }, neighborhoodState: Object.assign({}, c111Summary().neighborhoodState, { Temescal: { retailVitality: 99 } }) });
  ok(hot.by['MacArthur'].ridershipVolume > r.by['MacArthur'].ridershipVolume, 'a retail hot spot lifts the station serving it');
  // no demographics → the authored table, tagged
  const T0 = T.transitStationShares_(r.ctx, {}, T.transitDials_({}), T.OAKLAND_BART_STATIONS);
  eq(T0, null, 'no demographics → no share (table fallback)');
  // corridor base from the hoods' traffic multiplier against the city mean
  const nd = {}; Object.keys(C111.hoods).forEach(h => nd[h] = { traffic: 1 });
  const flat = run({ sportsFeedEntries: [], previousCycleState: { transitBaseVersion: 2 }, neighborhoodDynamics: nd });
  ok(Math.abs(flat.by['Grand Ave'].trafficIndex - 50) <= 8, 'a city at mean traffic → a surface street near transitCityTraffic (' + flat.by['Grand Ave'].trafficIndex + ')');
  ok(Math.abs(flat.by['I-580 East'].trafficIndex - 60) <= 8, 'a freeway at mean → ×transitFreewayMult (' + flat.by['I-580 East'].trafficIndex + ')');
  const nd2 = Object.assign({}, nd, { Fruitvale: { traffic: 3 } });
  const busy = run({ sportsFeedEntries: [], previousCycleState: { transitBaseVersion: 2 }, neighborhoodDynamics: nd2 });
  ok(busy.by['International Blvd'].trafficIndex > flat.by['International Blvd'].trafficIndex || T.TRAFFIC_CORRIDORS.filter(c => c.corridor === 'International Blvd')[0].hoods.indexOf('Fruitvale') < 0, 'a busy hood raises the street through it');
  ok(/^base: ledger/.test(flat.by['Grand Ave'].factors), 'corridor rows carry base: ledger');
  const noDyn = run({ sportsFeedEntries: [], previousCycleState: { transitBaseVersion: 2 } });
  ok(/^base: table/.test(noDyn.by['Grand Ave'].factors), 'no dynamics → corridor base: table');
  // congestion replaces the events>2 hardcode
  const cong = run({ sportsFeedEntries: [], previousCycleState: { transitBaseVersion: 2 }, cityDynamicsCapacity: { transitCongestion: 0.38 } });
  eq(cong.by['Fruitvale'].onTimePerformance, Math.round((r.by['Fruitvale'].onTimePerformance - 0.38 * 0.25) * 100) / 100, 'on-time loses transitCongestion × transitCongestionOnTimeMult');
  // rebase cycle
  const reb = run({ sportsFeedEntries: [] });
  ok(reb.all.every(m => /rebased/.test(m.factors)), 'first Cycle on the ledger base: every row says rebased');
  eq(reb.S.transitMetrics.baseVersion, 2, 'S.transitMetrics.baseVersion = 2 (carried by finalizeCycleState)');
  ok(r.all.every(m => !/rebased/.test(m.factors)), 'after the carry reads 2: no row says rebased');
}

// engine.290 move 4 — the crew is felt (governor) and named (always)
{
  const today = ledgerOf([BART_MGR, BART_PR]);
  const st = T.transitStaffing_({ ledger: today });
  eq(st.stationManager, 1, 'today: one station manager');
  eq(st.conductor + st.operator + st.dispatcher + st.maintenance, 0, 'today: no conductor / operator / dispatcher / maintenance');
  eq(st.total, 1, 'the PR specialist is not crew');
  eq(T.transitCrewClass_('BART Train Conductor'), 'conductor', 'class: conductor');
  eq(T.transitCrewClass_('BART Train Operator'), 'operator', 'class: operator');
  eq(T.transitCrewClass_('BART Rail Dispatcher'), 'dispatcher', 'class: dispatcher');
  eq(T.transitCrewClass_('BART Track Maintenance Technician'), 'maintenance', 'class: maintenance');
  const prev = { previousCycleState: { transitBaseVersion: 2 } };
  const off = run(Object.assign({ sportsFeedEntries: [] }, prev), { ledger: today });
  const armed = run(Object.assign({ sportsFeedEntries: [] }, prev), { ledger: today });
  // arm through ctx.config: re-run with the dial at 1
  appends.length = 0;
  const ctxA = { ss: fakeSS({}), ledger: today, config: { transitStaffingGovernor: 1 }, summary: Object.assign({ absoluteCycle: 107, season: 'spring', weather: { type: 'clear' }, sportsFeedEntries: [] }, c111Summary(), prev), rng: () => 0.5 };
  const allA = T.updateTransitMetrics_Phase2_(ctxA); const byA = {}; allA.forEach(m => { byA[m.station || m.corridor] = m; });
  eq(byA['Fruitvale'].onTimePerformance, Math.round((off.by['Fruitvale'].onTimePerformance - 0.10 - 0.05) * 100) / 100, 'governor 1, no crew + no dispatcher: on-time −0.10 −0.05');
  near(byA['Fruitvale'].ridershipVolume, Math.round(off.by['Fruitvale'].ridershipVolume * 0.85), 'governor 1, no crew: ridership ×0.85');
  ok(/no crew: no conductor or operator on the ledger/.test(byA['Fruitvale'].factors) && /no dispatcher/.test(byA['Fruitvale'].factors), 'governor 1: Factors say why');
  ok(!/no crew|no dispatcher/.test(off.by['Fruitvale'].factors), 'governor 0: nothing named');
  eq(off.by['Fruitvale'].onTimePerformance, armed.by['Fruitvale'].onTimePerformance, 'governor 0: nothing moves');
  const full = ledgerOf([BART_MGR, crewRow('P1', 'Ana', 'BART Train Conductor', 'Active'), crewRow('P2', 'Ben', 'BART Train Operator', 'Active'), crewRow('P3', 'Cy', 'BART Rail Dispatcher', 'Active'), crewRow('P4', 'Di', 'BART Track Maintenance Technician', 'Active')]);
  const ctxF = Object.assign({}, ctxA, { ledger: full, summary: Object.assign({}, ctxA.summary) });
  const allF = T.updateTransitMetrics_Phase2_(ctxF); const byF = {}; allF.forEach(m => { byF[m.station || m.corridor] = m; });
  eq(byF['Fruitvale'].onTimePerformance, off.by['Fruitvale'].onTimePerformance, 'governor 1 with a full crew: nothing moves');
  const sick = ledgerOf([BART_MGR, crewRow('P1', 'Ana', 'BART Train Conductor', 'hospitalized'), crewRow('P5', 'Ed', 'BART Train Conductor', 'Retired')]);
  const hs = run(Object.assign({ sportsFeedEntries: [] }, prev), { ledger: sick });
  ok(/crew short: Ana Test \(conductor\)/.test(hs.by['Fruitvale'].factors), 'a hospitalized conductor is named on the station rows: ' + hs.by['Fruitvale'].factors);
  ok(!/Ed Test/.test(hs.by['Fruitvale'].factors), 'a retired conductor is not');
  eq(hs.S.transitStaffing.conductor, 0, 'a hospitalized conductor is not on shift');
  eq(hs.S.transitStaffing.short.length, 1, 'S.transitStaffing.short names one');
  const stormSick = run(Object.assign({ sportsFeedEntries: [], weather: { type: 'rain', frontState: 'STORM' } }, prev), { ledger: sick });
  ok(stormSick.S.transitState.disruptionOngoing === true && /^storm conditions; crew short: Ana Test \(conductor\)$/.test(stormSick.S.transitState.disruptionCause), 'a storm disruption names the crew member out: ' + stormSick.S.transitState.disruptionCause);
  let threw = false; try { T.transitStaffing_({}); } catch (e) { threw = true; }
  ok(threw, 'no ledger → throws (fail loud)');
}

console.log('transitCauses: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
