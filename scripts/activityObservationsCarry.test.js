#!/usr/bin/env node
'use strict';

/**
 * engine.228 — the relative gates get a real baseline.
 *
 * applyCityDynamics_ builds S.activityObservations fresh every Cycle and nothing carried it, so
 * the "6-Cycle rolling average" every engine.185/188 relative gate divides by was this Cycle's
 * own count: every ratio read exactly 1 and none of those gates ever fired. Offline proof, no
 * Sheet: the real Phase-1 loader, the real Phase-2 city dynamics and the real Phase-10 saver in a
 * vm with the carry layers stubbed (the engine.219 harness). Every number is a fixture.
 * Run: node scripts/activityObservationsCarry.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const load = (sb, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });
const G = require('./fixtures/hood-geography.json');
const SC = require('./fixtures/hood-scenes.json').scenes;
const HOODS = Object.keys(G.zone);
// engine.214: the dynamics read every hood's authored row — canon from the fixture map, character + boom on neighborhoodState
const canonRows = () => [['Neighborhood', 'WeatherZone', 'Adjacent', 'AttentionWeight', 'EmployerCharacter', 'Scenes']].concat(HOODS.map(h => [h, G.zone[h], G.adjacent[h], G.attention[h], G.character[h], SC[h]]));
const mapSheet = { getDataRange: () => ({ getValues: () => canonRows() }) };
function hoodState() { const o = {}; HOODS.forEach(h => { o[h] = { employerCharacter: G.character[h], boomIndex: G.boomIndex[h] }; }); return o; }

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}
function world() {
  const props = {}; const store = { rows: [['Key', 'Cycle', 'UpdatedAt', 'JSON']] };
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat,
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props) ? props[k] : null,
      setProperty: (k, v) => { if (String(v).length > 9216) throw new Error('Argument too large: value'); props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) },
    persistWithRetry_: fn => fn(), appendRowWithRetry_: (sh, row) => sh.appendRow(row),
    safeRand_: () => () => 0.5, recordRipple_: () => true, safePhaseCall_: (ctx, label, fn) => fn(), compactMediaEffects_: () => null, compactCrisisArcs_: x => x, compactCrimeSpikes_: () => [] };
  vm.createContext(sb);
  load(sb, 'phase01-config/canonNeighborhoodLoader.js');
  load(sb, 'phase01-config/loadPreviousEvening.js');
  load(sb, 'phase06-analysis/economicRippleEngine.js');
  load(sb, 'phase02-world-state/applyCityDynamics.js');
  load(sb, 'phase09-digest/finalizeCycleState.js');
  return { sb, props, store };
}
function ctxFor(cycle, extra) {
  const ctx = { config: { cycleCount: cycle, rngSeed: 5, econMoodInertia: 0.3 }, ss: { getSheetByName: n => n === 'Neighborhood_Map' ? mapSheet : null }, writeIntents: [], mode: {},
    summary: Object.assign({ cycleId: cycle, season: 'Spring', month: 4, simMonth: 4, holiday: 'none', sportsSeason: 'off-season', weather: { type: 'clear', impact: 1 },
      neighborhoodState: hoodState(), neighborhoodEconomies: {}, neighborhoodDemographics: {}, economicMood: 55, economicRipples: [], worldEvents: [], storySeeds: [], crimeByNeighborhood: {} }, extra || {}) };
  return ctx;
}
// the canon loader needs the sandbox; seed it the first time a world runs Phase 2
const seedCanon = (sb, ctx) => { if (!ctx.summary.canonHoods) sb.loadCanonNeighborhoods_(ctx); return ctx; };
const obs = (cycle, events, seeds) => ({ cycle, events, storySeedCount: seeds, media: 8, crime: 5, shockCount: 10 });   // shockCount held flat: engine.185's shock ratio is a separate gate on world-event volume

console.log('engine.228 — activity observations carry');

// ── compact: taken at Phase 9 from the end-of-Cycle counts ───────────────────
{
  const w = world();
  const S = { cycleId: 108, eventsGenerated: 12, storySeeds: new Array(31), worldEvents: new Array(9), crimeSpikes: [1, 2], activityObservations: { history: [] } };
  const c = w.sb.compactActivityObservations_(S);
  check('compact: one entry from this Cycle\'s real counts', c && c.history.length === 1 && JSON.stringify(c.history[0]) === JSON.stringify({ cycle: 108, events: 12, storySeedCount: 31, media: 0, crime: 2, shockCount: 9, coverage: 0 }), JSON.stringify(c));
  const hist = []; for (let cy = 90; cy < 108; cy++) hist.push(Object.assign(obs(cy, 10, 30), { extra: 'dropped' }));
  const c2 = w.sb.compactActivityObservations_(Object.assign({}, S, { activityObservations: { history: hist } }));
  check('compact: appends to the carried history, keeps the last 12', c2.history.length === 12 && c2.history[11].cycle === 108 && c2.history[0].cycle === 97, c2.history.length);
  // engine.193 `coverage` and engine.227 `coverageScore` are absent on entries that predate them, never a fake 0.
  check('compact: six numbers per carried entry, nothing else; the new entry adds coverage', c2.history.slice(0, 11).every(o => Object.keys(o).length === 6 && o.extra === undefined) && Object.keys(c2.history[11]).length === 7);
  const full = []; for (let cy = 97; cy < 108; cy++) full.push(Object.assign(obs(cy, 10, 30), { coverage: 1.25, coverageScore: 1.04 }));
  const c2f = w.sb.compactActivityObservations_(Object.assign({}, S, { mediaEffects: { coverageIntensityScore: 1.04 }, activityObservations: { history: full } }));
  check('compact: 12 full entries fit well under 2 KB of the own 9 KB key (' + JSON.stringify(c2f).length + ' chars)', JSON.stringify(c2f).length < 2000);
  const c3 = w.sb.compactActivityObservations_(Object.assign({}, S, { activityObservations: { history: [obs(108, 0, 0)] } }));
  check('compact: never two entries for one Cycle (a stale same-Cycle entry is replaced)', c3.history.length === 1 && c3.history[0].events === 12);
}

// ── seed ─────────────────────────────────────────────────────────────────────
{
  const w = world();
  const ctxNo = ctxFor(108);
  w.sb.loadPreviousCycleState_(ctxNo);
  check('seed: no blob → S.activityObservations absent, no throw (first fire is graceful)', ctxNo.summary.activityObservations === undefined);
  const w2 = world();
  w2.props.PREV_CYCLE_STATE_JSON = JSON.stringify({ cycle: 107, econMood: 55 }); w2.props.PREV_CYCLE_STATE_JSON_CYCLE = '107';
  w2.props.PREV_ACTIVITY_OBS_JSON = JSON.stringify({ history: [obs(105, 9, 30), obs(106, 11, 33), obs(107, 10, 31)] }); w2.props.PREV_ACTIVITY_OBS_JSON_CYCLE = '107';
  const ctx = ctxFor(108);
  w2.sb.loadPreviousCycleState_(ctx);
  const ao = ctx.summary.activityObservations;
  check('seed: three Cycles of history opened', ao && ao.history.length === 3 && ao.history[2].cycle === 107 && ao.carried === true, JSON.stringify(ao));
}

// ── the defect, then the fix: Phase 2 on a carried history ───────────────────
{
  // first fire: nothing carried, nothing happened yet → one empty observation, ratio 1 by construction
  const w0 = world();
  const A0 = ctxFor(108);
  w0.sb.applyCityDynamics_(seedCanon(w0.sb, A0));
  const ao0 = A0.summary.activityObservations;
  check('first fire: Phase 2 records nothing (no push), latest is this Cycle\'s empty counts, rolling == latest', ao0.history.length === 0 && ao0.latest.events === 0 && ao0.rolling.events === ao0.latest.events, JSON.stringify(ao0));

  // carried: three ordinary nights (10 events) then a busy one (15) → "now" = last night 15, baseline = the three before = 10
  const w = world();
  w.props.PREV_CYCLE_STATE_JSON = JSON.stringify({ cycle: 107, econMood: 55 }); w.props.PREV_CYCLE_STATE_JSON_CYCLE = '107';
  w.props.PREV_ACTIVITY_OBS_JSON = JSON.stringify({ history: [obs(104, 10, 30), obs(105, 10, 30), obs(106, 10, 30), obs(107, 15, 45)] }); w.props.PREV_ACTIVITY_OBS_JSON_CYCLE = '107';
  const A = ctxFor(108);
  w.sb.loadPreviousCycleState_(A);
  w.sb.applyCityDynamics_(seedCanon(w.sb, A));
  const ao = A.summary.activityObservations;
  check('carried: Phase 2 leaves the history as carried (4 entries, no Phase-2 push)', ao.history.length === 4 && ao.history[3].cycle === 107, ao.history.length);
  check('carried: latest = last night (15), rolling = the nights before it (10) — the ratio is 1.5, no longer 1', ao.latest.events === 15 && ao.rolling.events === 10, JSON.stringify(ao.rolling) + ' ' + JSON.stringify(ao.latest));
  // engine.188's 1.5 tier: publicSpaces ×1.08, culturalActivity ×1.06, sentiment +0.05 vs the same Cycle on a flat baseline
  const flat = world();
  flat.props.PREV_CYCLE_STATE_JSON = JSON.stringify({ cycle: 107, econMood: 55 }); flat.props.PREV_CYCLE_STATE_JSON_CYCLE = '107';
  flat.props.PREV_ACTIVITY_OBS_JSON = JSON.stringify({ history: [obs(104, 15, 45), obs(105, 15, 45), obs(106, 15, 45), obs(107, 15, 45)] }); flat.props.PREV_ACTIVITY_OBS_JSON_CYCLE = '107';
  const F = ctxFor(108);
  flat.sb.loadPreviousCycleState_(F);
  flat.sb.applyCityDynamics_(seedCanon(flat.sb, F));
  check('the relative gate fires: a night 1.5× its own baseline lifts public spaces, cultural activity and sentiment vs the same night on a flat baseline',
    A.summary.cityDynamics.publicSpaces > F.summary.cityDynamics.publicSpaces && A.summary.cityDynamics.culturalActivity > F.summary.cityDynamics.culturalActivity && A.summary.cityDynamics.sentiment > F.summary.cityDynamics.sentiment,
    A.summary.cityDynamics.sentiment + ' vs ' + F.summary.cityDynamics.sentiment);

  // Phase 9 takes this Cycle's observation from the real counts and saves it on its own key
  A.summary.eventsGenerated = 12; A.summary.storySeeds = new Array(31); A.summary.worldEvents = new Array(9);
  w.sb.finalizeCycleState_(A);
  w.sb.savePreviousCycleState_(A);
  check('save: PREV_ACTIVITY_OBS_JSON written for cycle 108, not inside PREV_CYCLE_STATE_JSON',
    typeof w.props.PREV_ACTIVITY_OBS_JSON === 'string' && w.props.PREV_ACTIVITY_OBS_JSON_CYCLE === '108' && JSON.parse(w.props.PREV_CYCLE_STATE_JSON).activityObservations === undefined);
  const saved = JSON.parse(w.props.PREV_ACTIVITY_OBS_JSON).history;
  check('save: five entries, the new one carrying the real end-of-Cycle counts', saved.length === 5 && saved[4].cycle === 108 && saved[4].events === 12 && saved[4].storySeedCount === 31 && saved[4].shockCount === 9, JSON.stringify(saved[4]));
  const B = ctxFor(109);
  w.sb.loadPreviousCycleState_(B);
  w.sb.applyCityDynamics_(seedCanon(w.sb, B));
  const aoB = B.summary.activityObservations;
  check('next Cycle: latest = Cycle 108\'s real observation (12 events), rolling over the four nights before it (11.25)', aoB.latest.events === 12 && aoB.rolling.events === 11.25, JSON.stringify(aoB.latest) + ' ' + JSON.stringify(aoB.rolling));
}

// ── engine.227: coverage level is relative to the city's own last six Cycles ─────
{
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat };
  vm.createContext(sb);
  load(sb, 'phase07-evening-media/mediaFeedbackEngine.js');
  load(sb, 'phase09-digest/finalizeCycleState.js');
  const hist = scores => scores.map((s, i) => ({ cycle: 100 + i, events: 10, storySeedCount: 30, media: 0, crime: 2, shockCount: 10, coverageScore: s }));
  const level = (events, scores, extra) => {
    const S = Object.assign({ cycleId: 108, worldEvents: new Array(events), eventArcs: [], shockFlag: 'shock-flag', patternFlag: 'none',
      mediaEffects: { crisisSaturation: 0, celebrityBuzz: 0 }, activityObservations: { history: scores ? hist(scores) : [] } }, extra || {});
    sb.calculateCoverageIntensity_({ summary: S, mediaCalendarContext: { holiday: 'none', sportsSeason: 'off-season' } });
    return S.mediaEffects;
  };
  // Live shape: 8–13 events every Cycle scored 0.64–1.04 on the event term alone — saturated 100% under the old bar.
  const ordinary = level(10, [0.8, 0.88, 0.8, 0.72, 0.8, 0.8]);
  check('227: an ordinary 10-event week against a 10-event baseline reads moderate, not saturated', ordinary.coverageIntensity === 'moderate' && ordinary.coverageIntensityRatio === 1, JSON.stringify(ordinary));
  check('227: a week half again as loud reads saturated', level(15, [0.8, 0.8, 0.8, 0.8, 0.8, 0.8]).coverageIntensity === 'saturated');
  check('227: a week a quarter louder reads heavy', level(13, [0.8, 0.8, 0.8, 0.8, 0.8, 0.8]).coverageIntensity === 'heavy');
  check('227: a quiet week reads minimal (the gate fires downward too)', level(5, [0.8, 0.8, 0.8, 0.8, 0.8, 0.8]).coverageIntensity === 'minimal');
  check('227: first fire with nothing carried reads moderate', level(13, null).coverageIntensity === 'moderate');
  check('227: an active shock no longer raises the score (the ratchet is cut)', level(10, [0.8]).coverageIntensityScore === 0.8, String(level(10, [0.8]).coverageIntensityScore));
  check('227: this Cycle\'s own stale entry is not its own baseline', level(15, [0.8]).coverageIntensity === 'saturated' && level(15, [], { activityObservations: { history: [{ cycle: 108, coverageScore: 1.2 }] } }).coverageIntensity === 'moderate');
  const S9 = { cycleId: 108, eventsGenerated: 10, worldEvents: [], storySeeds: [], mediaEffects: { coverageIntensityScore: 0.96, coverageIntensity: 'heavy' }, activityObservations: { history: [] } };
  check('227: Phase 9 carries the score as next Cycle\'s baseline', sb.compactActivityObservations_(S9).history[0].coverageScore === 0.96);
  check('227: no score written → no key (never a fake 0)', sb.compactActivityObservations_(Object.assign({}, S9, { mediaEffects: {} })).history[0].coverageScore === undefined);
  check('227: previousCycleState carries last night\'s level for Phase 2/6', sb.compactMediaEffects_({ coverageIntensity: 'heavy', crisisSaturation: 0.3 }).coverageIntensity === 'heavy');
}

// ── engine.214 Task 18a/18b: the story seeds carry — Phase 2's seed gates get their first input ──
{
  const near = (a, b, e) => Math.abs(a - b) <= (e === undefined ? 1e-9 : e);
  const w = world();
  const mk = (hood, p, dom, type, extra) => Object.assign({ text: 'seed text', neighborhood: hood, priority: p, domain: dom || 'GENERAL', seedType: type || 'signal',
    calendarContext: { holiday: 'none', isFirstFriday: true, isCreationDay: false, sportsSeason: 'off-season' }, suggestedCitizens: ['POP-1'], seedId: 'abcd1234' }, extra || {});
  const S = { cycleId: 108, storySeeds: [mk('Dimond', 3, 'COMMUNITY'), mk('', 5, 'HEALTH', 'shock'), mk('Laurel', 1), { text: '', neighborhood: 'Glenview', priority: 9 }, mk('Narnia', 2)] };
  const c = w.sb.compactStorySeeds_(S);
  check('compact: four fields per seed (n/d/p/t), the Cycle\'s calendarContext once, textless seeds skipped, sorted by priority',
    c && c.cycle === 108 && c.count === 5 && c.seeds.length === 4 && c.seeds[0].p === 5 && c.seeds[0].n === '' && c.seeds[0].t === 'shock' && Object.keys(c.seeds[0]).length === 4 &&
    c.calendarContext.isFirstFriday === true && c.calendarContext.holiday === 'none', JSON.stringify(c));
  check('compact: no seeds → null (nothing saved, nothing to load)', w.sb.compactStorySeeds_({ storySeeds: [] }) === null && w.sb.compactStorySeeds_({}) === null);
  const many = []; for (let i = 0; i < 80; i++) many.push(mk('Dimond', (i % 7) + 1));
  const cm = w.sb.compactStorySeeds_({ cycleId: 108, storySeeds: many });
  check('compact: capped at 60 by priority, the count records the real deck size, and 60 seeds sit well under the 9 KB prop cap (' + JSON.stringify(cm).length + ' chars)',
    cm.seeds.length === 60 && cm.count === 80 && cm.seeds[0].p === 7 && JSON.stringify(cm).length < 4000);

  // Cycle 108: Phase 2 ran with nothing carried (the first fire on this code) → no seed input, no citywideSeedWeight recorded (never a fake 0)
  const A = ctxFor(108);
  w.sb.loadPreviousCycleState_(A);
  w.sb.applyCityDynamics_(seedCanon(w.sb, A));
  check('first fire: nothing carried → Phase 2 reads no seeds (totalWeighted 0), the citywide ratio is 1', A.summary.storySeedsCarried === undefined && A.summary.storySeedSignals.totalWeighted === 0 && A.summary.storySeedSignals.citywideX === 1);
  A.summary.eventsGenerated = 12; A.summary.worldEvents = new Array(9);
  A.summary.storySeeds = [mk('Dimond', 3, 'COMMUNITY'), mk('Dimond', 4, 'COMMUNITY'), mk('Laurel', 2), mk('Glenview', 2), mk('', 5, 'HEALTH', 'shock'), mk('Citywide', 2)];
  w.sb.finalizeCycleState_(A);
  w.sb.savePreviousCycleState_(A);
  check('save: PREV_STORY_SEEDS_JSON written for cycle 108 on its own key, not inside PREV_CYCLE_STATE_JSON',
    typeof w.props.PREV_STORY_SEEDS_JSON === 'string' && w.props.PREV_STORY_SEEDS_JSON_CYCLE === '108' && JSON.parse(w.props.PREV_STORY_SEEDS_JSON).seeds.length === 6 &&
    JSON.parse(w.props.PREV_CYCLE_STATE_JSON).storySeeds === undefined && JSON.parse(w.props.PREV_CYCLE_STATE_JSON).storySeedsCarried === undefined);
  const e108 = JSON.parse(w.props.PREV_ACTIVITY_OBS_JSON).history.slice(-1)[0];
  check('save: a Cycle whose Phase 2 had no carried seeds records no citywideSeedWeight (never a fake 0 into the baseline)', e108.cycle === 108 && e108.citywideSeedWeight === undefined && e108.seedHoodsActive === undefined, JSON.stringify(e108));

  // Cycle 109: Phase 1 opens last night's seeds; Phase 2's seed gates have input for the first time
  const B = ctxFor(109);
  w.sb.loadPreviousCycleState_(B);
  const carried = B.summary.storySeedsCarried;
  check('load: S.storySeedsCarried opened from the blob — 6 seeds re-shaped to what seedWeight_ reads, S.storySeeds untouched (Phase 7\'s key)',
    Array.isArray(carried) && carried.length === 6 && carried[0].priority === 5 && carried[0].seedType === 'shock' && carried[0].neighborhood === '' && carried[0].calendarContext.isFirstFriday === true &&
    carried[0].carriedFromCycle === 108 && B.summary.storySeeds.length === 0, JSON.stringify(carried && carried[0]));
  w.sb.applyCityDynamics_(seedCanon(w.sb, B));
  const sig = B.summary.storySeedSignals;
  check('Phase 2: the per-hood path has input — Dimond carries weight from its two seeds, Laurel and Glenview theirs; "Citywide" and the hood-less seed go to citywideWeighted',
    sig.byHood.Dimond.weighted > sig.byHood.Laurel.weighted && sig.byHood.Laurel.weighted > 0 && sig.byHood.Glenview.weighted > 0 && sig.byHood.Dimond.count === 2 && sig.citywideWeighted > 0 && sig.totalWeighted > sig.citywideWeighted,
    JSON.stringify({ D: sig.byHood.Dimond, L: sig.byHood.Laurel, cw: sig.citywideWeighted }));
  check('Phase 2: first Cycle with input — no citywide baseline yet, ratio 1', sig.citywideBaseline === null && sig.citywideX === 1);
  B.summary.eventsGenerated = 12; B.summary.worldEvents = new Array(9); B.summary.storySeeds = A.summary.storySeeds.slice();
  w.sb.finalizeCycleState_(B);
  w.sb.savePreviousCycleState_(B);
  const e109 = JSON.parse(w.props.PREV_ACTIVITY_OBS_JSON).history.slice(-1)[0];
  check('save: the Cycle that read carried seeds records the citywide read + the active hood count on the activity entry (the numbers for the builder)',
    e109.cycle === 109 && near(e109.citywideSeedWeight, Math.round(sig.citywideWeighted * 100) / 100) && e109.seedHoodsActive === 3, JSON.stringify(e109));

  // Cycle 110: the baseline exists — the same citywide week reads 1.0; a heavier one lifts every hood
  const C = ctxFor(110);
  w.sb.loadPreviousCycleState_(C);
  w.sb.applyCityDynamics_(seedCanon(w.sb, C));
  const sigC = C.summary.storySeedSignals;
  check('next Cycle: the baseline is last Cycle\'s read; the same citywide seeds read ratio 1.0 — an ordinary week pays nothing',
    near(sigC.citywideBaseline, e109.citywideSeedWeight) && near(sigC.citywideX, sigC.citywideWeighted / sigC.citywideBaseline) && Math.abs(sigC.citywideX - 1) < 0.01, JSON.stringify([sigC.citywideBaseline, sigC.citywideX]));
  const heavy = world();
  heavy.props.PREV_CYCLE_STATE_JSON = w.props.PREV_CYCLE_STATE_JSON; heavy.props.PREV_CYCLE_STATE_JSON_CYCLE = w.props.PREV_CYCLE_STATE_JSON_CYCLE;
  heavy.props.PREV_ACTIVITY_OBS_JSON = w.props.PREV_ACTIVITY_OBS_JSON; heavy.props.PREV_ACTIVITY_OBS_JSON_CYCLE = w.props.PREV_ACTIVITY_OBS_JSON_CYCLE;
  const heavyBlob = JSON.parse(w.props.PREV_STORY_SEEDS_JSON); heavyBlob.seeds.push({ n: '', d: 'HEALTH', p: 9, t: 'shock' }, { n: '', d: 'CIVIC', p: 6, t: 'event' });
  heavy.props.PREV_STORY_SEEDS_JSON = JSON.stringify(heavyBlob); heavy.props.PREV_STORY_SEEDS_JSON_CYCLE = w.props.PREV_STORY_SEEDS_JSON_CYCLE;
  const H = ctxFor(110);
  heavy.sb.loadPreviousCycleState_(H);
  heavy.sb.applyCityDynamics_(seedCanon(heavy.sb, H));
  const sigH = H.summary.storySeedSignals;
  check('next Cycle: a citywide health crisis + a civic event on top of the same week (ratio ≥ 1.75) lifts every hood — cultural and sentiment above the ordinary week on all 22, by the same amount everywhere',
    sigH.citywideX >= 1.75 && HOODS.every(h => H.summary.neighborhoodDynamics[h].culturalActivity > C.summary.neighborhoodDynamics[h].culturalActivity && H.summary.neighborhoodDynamics[h].sentiment > C.summary.neighborhoodDynamics[h].sentiment) &&
    H.summary.cityDynamics.sentiment > C.summary.cityDynamics.sentiment, 'ratio ' + sigH.citywideX.toFixed(2));
  // the recorded keys survive compaction on later Cycles
  H.summary.eventsGenerated = 12; H.summary.worldEvents = new Array(9); H.summary.storySeeds = A.summary.storySeeds.slice();
  heavy.sb.finalizeCycleState_(H); heavy.sb.savePreviousCycleState_(H);
  const histH = JSON.parse(heavy.props.PREV_ACTIVITY_OBS_JSON).history;
  check('compact: citywideSeedWeight / seedHoodsActive ride the carried entries (109 kept its read; 110 recorded its own)',
    histH.length === 3 && histH[0].citywideSeedWeight === undefined && near(histH[1].citywideSeedWeight, e109.citywideSeedWeight) && histH[1].seedHoodsActive === 3 && histH[2].citywideSeedWeight > histH[1].citywideSeedWeight, JSON.stringify(histH));
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
