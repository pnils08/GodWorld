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
  getNeighborhoodDemographics_: () => ({
    'East Oakland': { adults: 100, students: 0, seniors: 0 },
    'Fruitvale': { adults: 60, students: 20, seniors: 20 }
  })
};
const T = new Function(...Object.keys(sandbox),
  R('utilities/ensureTransitMetrics.js') + '\n' + R('phase02-world-state/updateTransitMetrics.js') +
  '\nreturn { updateTransitMetrics_Phase2_, getTransitStorySignals_, isGameDay_, gameDayHoodsFor_, initiativeTransitEffects_, OAKLAND_BART_STATIONS, TRAFFIC_CORRIDORS, TRANSIT_METRICS_HEADERS };'
)(...Object.values(sandbox));

function run(S, opts) {
  appends.length = 0; ripples.length = 0;
  const ctx = { ss: fakeSS(opts || {}), summary: Object.assign({ absoluteCycle: 107, season: 'spring', weather: { type: 'clear' } }, S), rng: () => 0.5 };
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
  eq(r.by['12th St Oakland City Center'].factors, 'ordinary weekday', 'a quiet row still names its frame');
}

// 3. Feed row in Baylight → Coliseum + I-880 take the game, Broadway/12th St do not
{
  const base = run({ sportsFeedEntries: [], sportsZones: ['Baylight District'] });
  const r = run({ sportsFeedEntries: [{ homeNeighborhood: 'Baylight District' }], sportsZones: ['Baylight District'] });
  eq(r.S.transitMetrics.factors.gameDay, true, 'feed row → game day');
  eq(r.S.transitMetrics.factors.gameDayHoods.join(','), 'Baylight District', 'game-day hoods from the feed');
  ok(r.by['Coliseum'].factors.indexOf('game day (Baylight District)') >= 0, 'Coliseum row names the game');
  ok(r.by['Coliseum'].notes.indexOf('game day crowds') >= 0, 'Coliseum notes: game day crowds');
  eq(r.by['Coliseum'].ridershipVolume, Math.round(base.by['Coliseum'].ridershipVolume * 1.3), 'Coliseum +30% on game day');
  ok(r.by['12th St Oakland City Center'].factors.indexOf('game day') < 0, '12th St unaffected by a Baylight game');
  ok(r.by['I-880 North'].factors.indexOf('game day') >= 0 && r.by['I-880 South'].factors.indexOf('game day') >= 0, 'I-880 both directions carry the game');
  ok(r.by['I-880 North'].notes.indexOf('event traffic') >= 0, 'I-880 notes: event traffic');
  ok(r.by['Broadway'].factors.indexOf('game day') < 0 && r.by['Grand Ave'].factors.indexOf('game day') < 0, 'Broadway / Grand Ave do not');
}

// 4. Legacy zones (feed row without a hood) → Jack London / Downtown stations + corridors
{
  const r = run({ sportsFeedEntries: [{ teamsUsed: "A's" }], sportsZones: ['Jack London', 'Downtown'] });
  eq(r.S.transitMetrics.factors.gameDayHoods.join(','), 'Jack London,Downtown', 'zones fill in when the feed row has no hood');
  ok(r.by['12th St Oakland City Center'].factors.indexOf('game day') >= 0, '12th St takes the legacy game');
  ok(r.by['West Oakland'].factors.indexOf('game day') >= 0, 'West Oakland station (Jack London corridor) too');
  ok(r.by['Coliseum'].factors.indexOf('game day') < 0, 'Coliseum does not');
  ok(r.by['I-980'].factors.indexOf('game day') >= 0 && r.by['Broadway'].factors.indexOf('game day') >= 0, 'I-980 + Broadway load');
  ok(r.by['I-880 South'].factors.indexOf('game day') < 0, 'I-880 South does not');
}

// 5. Coliseum uses East Oakland demographics (adults ratio 1.0 → ×1.2, not the 0.6 default → ×1.0)
{
  const r = run({ sportsFeedEntries: [] });
  eq(r.by['Coliseum'].ridershipVolume, Math.round(6000 * 1.2), 'Coliseum ridership priced off East Oakland adults');
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
  eq(r.by['Rockridge'].ridershipVolume, Math.round(base.by['Rockridge'].ridershipVolume * 1.10), 'Rockridge takes only the city-wide modifier');
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

  // Baylight under construction on the site → the station serving it + the freeways; the street does not
  const bay = (phase, hoods) => ({ sportsFeedEntries: [], initiativeImplementationEffects: { transit: [{ name: 'Baylight District — Final Council Vote', phase, intensity: 0.3, domain: 'sports', hoods, baylight: true }] } });
  r = run(bay('construction-planning', ['Baylight District']));
  eq(r.by['Coliseum'].ridershipVolume, Math.round(base.by['Coliseum'].ridershipVolume * 1.05), 'Baylight build: Coliseum ×1.05');
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
  const r = run({ sportsFeedEntries: [{ homeNeighborhood: 'Baylight District' }], sportsZones: ['Baylight District'],
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

console.log('transitCauses: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
