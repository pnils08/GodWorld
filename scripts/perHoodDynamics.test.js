#!/usr/bin/env node
'use strict';

/**
 * perHoodDynamics.test.js — engine.214 Task 9: mood per hood, the clusters gone.
 *
 * Every hood's dynamics start from its own authored Neighborhood_Map row
 * (EmployerCharacter, BoomIndex, WeatherZone, Scenes, Adjacent) and move on its
 * own live inputs; the city is the equal mean of the 22. Offline proof, no
 * Sheet: the real Phase-1 canon loader, the real Phase-2 dynamics and the real
 * Phase-8 hood writer's calendar helpers in a vm over the fixture map. Every
 * number is a fixture.
 * Run: node scripts/perHoodDynamics.test.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const load = (sb, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });
const src = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const G = require('./fixtures/hood-geography.json');
const SC = require('./fixtures/hood-scenes.json').scenes;
const HOODS = Object.keys(G.zone);
const METRICS = ['traffic', 'retail', 'tourism', 'nightlife', 'publicSpaces', 'sentiment', 'culturalActivity', 'communityEngagement'];

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}
const near = (a, b, e) => Math.abs(a - b) <= (e === undefined ? 1e-9 : e);
const throwsLike = (fn, re) => { try { fn(); } catch (e) { return re.test(String(e && e.message)); } return false; };

function canonRows(over) {
  over = over || {};
  const rows = [['Neighborhood', 'WeatherZone', 'Adjacent', 'AttentionWeight', 'EmployerCharacter', 'Scenes']]
    .concat(HOODS.map(h => [h, over.zone && h in over.zone ? over.zone[h] : G.zone[h], G.adjacent[h], G.attention[h],
      over.chr && h in over.chr ? over.chr[h] : G.character[h], over.sc && h in over.sc ? over.sc[h] : SC[h]]));
  if (over.noAdjacent) return rows.map(r => r.filter((_, i) => i !== 2));   // the Adjacent column absent: adjacency is null (engine.148 P2)
  return rows;
}
function world() {
  const ripples = [];
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat,
    recordRipple_: (ctx, e) => { ripples.push(e); return true; } };
  vm.createContext(sb);
  load(sb, 'phase01-config/canonNeighborhoodLoader.js');
  load(sb, 'phase06-analysis/economicRippleEngine.js');
  load(sb, 'phase02-world-state/applyCityDynamics.js');
  return { sb, ripples };
}
// over: { chr, zone, sc, boom, state, summary }
function run(over) {
  over = over || {};
  const w = world();
  const rows = canonRows(over);
  const ctx = { config: { cycleCount: 120 }, writeIntents: [], mode: {},
    ss: { getSheetByName: n => n === 'Neighborhood_Map' ? { getDataRange: () => ({ getValues: () => rows }) } : null },
    summary: Object.assign({ cycleId: 120, season: 'Fall', holiday: 'none', holidayPriority: 'none', sportsSeason: 'off-season',
      weather: { type: 'clear', impact: 1, front: 'CLEAR' }, neighborhoodEconomies: {}, neighborhoodDemographics: {},
      worldEvents: [], storySeeds: [], crimeByNeighborhood: {}, sportsCity: {}, sportsWeek: {} }, over.summary || {}) };
  w.sb.loadCanonNeighborhoods_(ctx);
  ctx.summary.neighborhoodState = {};
  HOODS.forEach(h => {
    ctx.summary.neighborhoodState[h] = Object.assign({ employerCharacter: over.chr && h in over.chr ? over.chr[h] : G.character[h],
      boomIndex: over.boom && h in over.boom ? over.boom[h] : G.boomIndex[h] }, over.state && over.state[h] ? over.state[h] : {});
  });
  w.sb.applyCityDynamics_(ctx);
  return { S: ctx.summary, nd: ctx.summary.neighborhoodDynamics, city: ctx.summary.cityDynamics, ripples: w.ripples, sb: w.sb, ctx };
}
const adj = h => G.adjacent[h].split(',').map(x => x.trim());

console.log('engine.214 — mood per hood');

// ── 1. shape ──────────────────────────────────────────────────────────────────
{
  const r = run();
  check('22 hood entries, eight metrics each, S.neighborhoodDynamics shape unchanged',
    Object.keys(r.nd).length === 22 && HOODS.every(h => METRICS.every(k => typeof r.nd[h][k] === 'number') && Object.keys(r.nd[h]).length === 8));
  check('S.cityDynamics keeps its eight metrics', METRICS.every(k => typeof r.city[k] === 'number') && Object.keys(r.city).length === 8);
  check('no cluster output remains on the summary', r.S.clusterDynamics === undefined && r.S.clusterDefinitions === undefined && r.S.previousClusterDynamics === undefined);
  check('seed signals are keyed by hood', r.S.storySeedSignals && Object.keys(r.S.storySeedSignals.byHood).length === 22 && r.S.storySeedSignals.byCluster === undefined);
}

// ── 2. the base is the sheet row ─────────────────────────────────────────────
{
  // Uptown (nightlife) vs Adams Point (residential): same zone (urban-corridor), same boom, no scenes in play off-holiday
  const r = run({ boom: { Uptown: 0.4, 'Adams Point': 0.4 }, sc: { Uptown: '', 'Adams Point': '' } });
  check('two hoods of different EmployerCharacter differ on nightlife and tourism on identical inputs',
    r.nd.Uptown.nightlife > r.nd['Adams Point'].nightlife * 1.15 && r.nd.Uptown.tourism > r.nd['Adams Point'].tourism * 1.1,
    r.nd.Uptown.nightlife + ' vs ' + r.nd['Adams Point'].nightlife);
  const a = run(), b = run({ boom: { Dimond: 1.0 } });   // Dimond −0.4 → +1.0
  check('BoomIndex warms retail and tourism on its own hood: Dimond +1.0 vs −0.4 = ×1.10/0.96', near(b.nd.Dimond.retail / a.nd.Dimond.retail, 1.10 / 0.96, 1e-6) && near(b.nd.Dimond.tourism / a.nd.Dimond.tourism, 1.10 / 0.96, 1e-6),
    b.nd.Dimond.retail / a.nd.Dimond.retail);
  const far = HOODS.filter(h => h !== 'Dimond' && adj('Dimond').indexOf(h) < 0);
  check('…and no other hood\'s base moves (non-neighbours byte-identical)', far.every(h => JSON.stringify(a.nd[h]) === JSON.stringify(b.nd[h])));
  check('an unknown EmployerCharacter label throws (no silent default)', throwsLike(() => run({ chr: { Laurel: 'spaceport' } }), /engine\.214.*"spaceport".*HOOD_CHARACTER_BY_EMPLOYER/));
  check('a blank label throws', throwsLike(() => run({ chr: { Laurel: '' } }), /engine\.214.*EmployerCharacter is blank/));
  check('a WeatherZone this engine does not key throws', throwsLike(() => run({ zone: { Laurel: 'tundra' } }), /engine\.214.*WeatherZone "tundra"/));
  // codex impl review F7: an inherited object key is not a row — it must throw like any unknown label, and publish nothing
  ['constructor', '__proto__', 'hasOwnProperty'].forEach(k => check('an inherited key as a label ("' + k + '") throws, no silent multiplier 1', throwsLike(() => run({ chr: { Laurel: k } }), /engine\.214.*no row in HOOD_CHARACTER_BY_EMPLOYER/)));
  // codex impl review F7: a missing Adjacent column throws BEFORE any receipt — a failed phase leaves no Ripple_Ledger row
  check('no Adjacent column: throws before any receipt is queued (two-spike hood, zero ripple rows)', (() => {
    const w = world(); const rows = canonRows({ noAdjacent: true });
    const ctx = { config: { cycleCount: 120 }, writeIntents: [], mode: {}, ss: { getSheetByName: n => n === 'Neighborhood_Map' ? { getDataRange: () => ({ getValues: () => rows }) } : null },
      summary: { cycleId: 120, season: 'Fall', holiday: 'none', sportsSeason: 'off-season', weather: { type: 'clear', impact: 1 }, neighborhoodEconomies: {}, neighborhoodDemographics: {}, worldEvents: [], storySeeds: [], crimeByNeighborhood: { Dimond: 2 }, sportsCity: {}, sportsWeek: {} } };
    w.sb.loadCanonNeighborhoods_(ctx); ctx.summary.neighborhoodState = {}; HOODS.forEach(h => { ctx.summary.neighborhoodState[h] = { employerCharacter: G.character[h], boomIndex: G.boomIndex[h] }; });
    const threw = throwsLike(() => w.sb.applyCityDynamics_(ctx), /Adjacent/);
    return threw && w.ripples.length === 0 && ctx.summary.neighborhoodDynamics === undefined && ctx.summary.cityDynamics === undefined;
  })());
  check('canon not seeded throws (no embedded hood list)', (() => { const w = world(); const ctx = { config: {}, summary: { neighborhoodState: {} }, ss: { getSheetByName: () => null } };
    return throwsLike(() => w.sb.applyCityDynamics_(ctx), /canonical hood set not seeded/); })());
}

// ── 3. weather fronts by zone ────────────────────────────────────────────────
{
  const clear = run({ summary: { weather: { type: 'fog', impact: 1, front: 'FOG' } } });
  const marine = run({ summary: { weather: { type: 'fog', impact: 1, front: 'MARINE' } } });
  // West Oakland is bay-fog: tourism ×0.92 × 0.94 (place-bias wind/marine line), publicSpaces ×0.88; Fruitvale is inland: untouched
  check('MARINE hits bay-fog (West Oakland publicSpaces ×0.88, tourism ×0.92×0.94), not inland (Fruitvale unchanged)',
    near(marine.nd['West Oakland'].publicSpaces / clear.nd['West Oakland'].publicSpaces, 0.88, 1e-6) &&
    near(marine.nd['West Oakland'].tourism / clear.nd['West Oakland'].tourism, 0.92 * 0.94, 1e-6) &&
    near(marine.nd.Fruitvale.publicSpaces, clear.nd.Fruitvale.publicSpaces) && near(marine.nd.Fruitvale.tourism, clear.nd.Fruitvale.tourism),
    JSON.stringify([marine.nd['West Oakland'].publicSpaces / clear.nd['West Oakland'].publicSpaces, marine.nd.Fruitvale.tourism / clear.nd.Fruitvale.tourism]));
  check('MARINE on the lake zone: Grand Lake publicSpaces ×0.94', near(marine.nd['Grand Lake'].publicSpaces / clear.nd['Grand Lake'].publicSpaces, 0.94, 1e-6));
  const heat = run({ summary: { weather: { type: 'hot', impact: 1, front: 'HEAT' } } });
  const hot = run({ summary: { weather: { type: 'hot', impact: 1, front: 'HOT' } } });
  check('HEAT hits inland / valley (Laurel publicSpaces ×0.92), not hills (Rockridge unchanged)',
    near(heat.nd.Laurel.publicSpaces / hot.nd.Laurel.publicSpaces, 0.92, 1e-6) && near(heat.nd.Rockridge.publicSpaces, hot.nd.Rockridge.publicSpaces));
}

// ── 4. calendar by Scenes ────────────────────────────────────────────────────
{
  const off = run(), ff = run({ summary: { isFirstFriday: true } });
  const lift = h => ff.nd[h].nightlife / off.nd[h].nightlife;
  check('First Friday: Scenes.FirstFriday 4 (Uptown) is the epicenter, 1 (Downtown) spillover, blank (Dimond) the modest lift',
    lift('Uptown') > lift('Downtown') && lift('Downtown') > lift('Dimond') && lift('Dimond') > 1.1,
    [lift('Uptown'), lift('Downtown'), lift('Dimond')].map(x => x.toFixed(3)).join(' > '));
  check('…epicenter and spillover sit at the authored magnitudes (×1.5 / ×1.3 / ×1.2 before capacity)',
    near(lift('Uptown') / lift('Dimond'), 1.5 / 1.2, 0.02) && near(lift('Downtown') / lift('Dimond'), 1.3 / 1.2, 0.02));
  const cd = run({ summary: { isCreationDay: true, holiday: 'CreationDay', holidayPriority: 'major' } });
  const cdLift = h => cd.nd[h].communityEngagement / off.nd[h].communityEngagement;
  check('Creation Day: a hood with Scenes.CreationDay (West Oakland 2) takes the extra ×1.1 over one without (Laurel)',
    near(cdLift('West Oakland') / cdLift('Laurel'), 1.1, 1e-6), (cdLift('West Oakland') / cdLift('Laurel')).toFixed(4));
}

// ── 5. seeds: hood grain, active median ──────────────────────────────────────
{
  const seed = (hood, p, dom) => ({ text: 'x', neighborhood: hood, priority: p, domain: dom || 'GENERAL' });
  const none = run();
  // engine.214 Task 18: Phase 2 reads LAST NIGHT's seeds (S.storySeedsCarried, Phase 9 → PREV_STORY_SEEDS_JSON → Phase 1);
  // this Cycle's S.storySeeds is Phase 7's and is not read here — on every live fire before the carry it was [].
  const stale = run({ summary: { storySeeds: [seed('Dimond', 20), seed('Laurel', 4), seed('Glenview', 4)] } });
  check('Task 18a: this Cycle\'s S.storySeeds (Phase 7\'s key) is not the input — only the carried seeds are',
    HOODS.every(h => JSON.stringify(stale.nd[h]) === JSON.stringify(none.nd[h])) && stale.S.storySeedSignals.totalWeighted === 0);
  // a citywide seed (no hood, or a hood off the map) goes to citywideWeighted; with no baseline yet the ratio is 1 and no hood moves
  const cw = run({ summary: { storySeedsCarried: [seed('', 20), seed('Narnia', 20)] } });
  check('Task 18b: a citywide seed (no hood, or a hood off the map) goes to citywideWeighted, not to any hood; with no baseline yet (the key is new) the ratio reads 1 and no hood moves',
    cw.S.storySeedSignals.citywideWeighted > 0 && HOODS.every(h => cw.S.storySeedSignals.byHood[h].weighted === 0) &&
    cw.S.storySeedSignals.citywideBaseline === null && cw.S.storySeedSignals.citywideX === 1 &&
    HOODS.every(h => JSON.stringify(cw.nd[h]) === JSON.stringify(none.nd[h])));
  // the term's own middle: three carried Cycles read 10 → a 20-weight citywide week is 2.0× (top tier), 14 is 1.4× (mid), 10 is 1.0 (nothing)
  const hist = { activityObservations: { history: [{ cycle: 117, citywideSeedWeight: 10 }, { cycle: 118, citywideSeedWeight: 10 }, { cycle: 119, citywideSeedWeight: 10 }] } };
  const flat = run({ summary: Object.assign({ storySeedsCarried: [seed('', 10)] }, hist) });
  const top = run({ summary: Object.assign({ storySeedsCarried: [seed('', 20)] }, hist) });
  const mid = run({ summary: Object.assign({ storySeedsCarried: [seed('', 14)] }, hist) });
  check('Task 18b: the baseline is the carried reads (10), the ratio is this Cycle\'s citywide weight over it — 2.0 / 1.4 / 1.0 shown as numbers',
    flat.S.storySeedSignals.citywideBaseline === 10 && near(top.S.storySeedSignals.citywideX, 2) && near(mid.S.storySeedSignals.citywideX, 1.4) && near(flat.S.storySeedSignals.citywideX, 1),
    [flat.S.storySeedSignals.citywideBaseline, top.S.storySeedSignals.citywideX, mid.S.storySeedSignals.citywideX].join(' '));
  check('Task 18b: an ordinary citywide week (1.0×) moves no hood', HOODS.every(h => JSON.stringify(flat.nd[h]) === JSON.stringify(none.nd[h])));
  check('Task 18b: a 2.0× citywide week lifts EVERY hood a top tier — cultural ×1.08, engagement ×1.04 (±0.01 at run level), sentiment up on all 22',
    HOODS.every(h => near(top.nd[h].culturalActivity / flat.nd[h].culturalActivity, 1.08, 0.01) && near(top.nd[h].communityEngagement / flat.nd[h].communityEngagement, 1.04, 0.01) && top.nd[h].sentiment > flat.nd[h].sentiment),
    (top.nd.Dimond.culturalActivity / flat.nd.Dimond.culturalActivity).toFixed(4) + ' ' + (top.nd.Dimond.communityEngagement / flat.nd.Dimond.communityEngagement).toFixed(4));
  check('Task 18b: a 1.4× week is the mid tier — cultural ×1.05 on every hood, and less sentiment than the 2.0× week',
    HOODS.every(h => near(mid.nd[h].culturalActivity / flat.nd[h].culturalActivity, 1.05, 0.01) && mid.nd[h].sentiment > flat.nd[h].sentiment && mid.nd[h].sentiment < top.nd[h].sentiment));
  // engine.288: the newsroom's contract deck (S.contractSeedsCarried) reads through the same gates, on the same scale
  const dk = (hood, p, dom) => ({ text: 'carried seed', neighborhood: hood, priority: p, domain: dom || 'GENERAL', seedType: p >= 3 ? 'contract-major' : 'contract-texture' });
  const deckOnly = run({ summary: { contractSeedsCarried: [dk('Dimond', 3, 'SAFETY'), dk('Laurel', 2), dk('Glenview', 2), dk('Citywide', 3, 'COMMUNITY')] } });
  check('288: the deck alone feeds the hood grain (seedMix 2 = deck, deckSeeds 4) — Dimond (3) at 1.5× the active median (2) fires the mid tier (cultural ×1.05), Laurel at the median nothing; `Citywide` goes to the citywide term',
    deckOnly.S.storySeedSignals.seedMix === 2 && deckOnly.S.storySeedSignals.listsRead === 1 && deckOnly.S.storySeedSignals.deckSeeds === 4 && deckOnly.S.storySeedSignals.byHood.Dimond.weighted === 3 && deckOnly.S.storySeedSignals.citywideWeighted === 3 &&
    near(deckOnly.nd.Dimond.culturalActivity / none.nd.Dimond.culturalActivity, 1.05, 0.01) && near(deckOnly.nd.Laurel.culturalActivity / none.nd.Laurel.culturalActivity, 1, 0.01), (deckOnly.nd.Dimond.culturalActivity / none.nd.Dimond.culturalActivity).toFixed(4));
  const both = run({ summary: { storySeedsCarried: [seed('Laurel', 2)], contractSeedsCarried: [dk('Laurel', 3, 'SAFETY'), dk('Dimond', 2), dk('Glenview', 2)] } });
  check('288: both lists sum per hood (Laurel 2 + 3 = 5), seedMix 3', both.S.storySeedSignals.seedMix === 3 && both.S.storySeedSignals.listsRead === 2 && both.S.storySeedSignals.byHood.Laurel.weighted === 5 && both.S.storySeedSignals.byHood.Laurel.count === 2);
  const mixHist = { activityObservations: { history: [{ cycle: 116, citywideSeedWeight: 10 }, { cycle: 117, citywideSeedWeight: 10, seedMix: 1 }, { cycle: 118, citywideSeedWeight: 4, seedMix: 2 }, { cycle: 119, citywideSeedWeight: 40, seedMix: 3 }] } };
  const mixBoth = run({ summary: Object.assign({ storySeedsCarried: [seed('', 20)], contractSeedsCarried: [dk('Citywide', 3)] }, mixHist) });
  const mixEng = run({ summary: Object.assign({ storySeedsCarried: [seed('', 20)] }, mixHist) });
  const mixDeck = run({ summary: Object.assign({ contractSeedsCarried: [dk('Citywide', 3)] }, mixHist) });
  check('288 (codex F2): the citywide baseline reads only entries of the SAME list identity — both (3) sees 40 → 23/40; engine-only (1) sees the two engine entries 10 → 2.0 (an entry without the field is engine-only); deck-only (2) sees 4 → 0.75, never the engine series',
    mixBoth.S.storySeedSignals.citywideBaseline === 40 && near(mixBoth.S.storySeedSignals.citywideX, 23 / 40) && mixEng.S.storySeedSignals.citywideBaseline === 10 && near(mixEng.S.storySeedSignals.citywideX, 2) &&
    mixDeck.S.storySeedSignals.seedMix === 2 && mixDeck.S.storySeedSignals.citywideBaseline === 4 && near(mixDeck.S.storySeedSignals.citywideX, 0.75),
    JSON.stringify([mixBoth.S.storySeedSignals.citywideBaseline, mixEng.S.storySeedSignals.citywideBaseline, mixDeck.S.storySeedSignals.citywideBaseline, mixDeck.S.storySeedSignals.citywideX]));
  check('Task 18b: the citywide lift is uniform — no hood moves against another (the spread of sentiment across hoods is unchanged within 0.001)', (() => {
    const spread = r => { const v = HOODS.map(h => r.nd[h].sentiment); return Math.max(...v) - Math.min(...v); };
    return Math.abs(spread(top) - spread(flat)) < 0.001;
  })());
  // two active hoods (< 3): the median is null, the relative gates read 1 — a weight of 20 fires nothing
  const sparse = run({ summary: { storySeedsCarried: [seed('Dimond', 20), seed('Laurel', 1)] } });
  check('a null seed median (fewer than 3 active hoods) fires no relative gate', near(sparse.nd.Dimond.sentiment, none.nd.Dimond.sentiment) && near(sparse.nd.Dimond.culturalActivity, none.nd.Dimond.culturalActivity),
    sparse.nd.Dimond.sentiment + ' vs ' + none.nd.Dimond.sentiment);
  // three active: Dimond at 20 against a median of 4 fires the top tier (cultural ×1.08); Laurel at the median gets nothing
  const dense = run({ summary: { storySeedsCarried: [seed('Dimond', 20), seed('Laurel', 4), seed('Glenview', 4)] } });
  check('with 3+ active hoods the hood above the active median fires; a hood at the median does not',
    near(dense.nd.Dimond.culturalActivity / none.nd.Dimond.culturalActivity, 1.08, 1e-6) && near(dense.nd.Laurel.culturalActivity, none.nd.Laurel.culturalActivity),
    dense.nd.Dimond.culturalActivity / none.nd.Dimond.culturalActivity);
  // absolute domain gates read the hood's own weight: CIVIC 6 on one hood costs it −0.04 regardless of the median
  const civic = run({ summary: { storySeedsCarried: [seed('Dimond', 6, 'CIVIC')] } });
  check('CIVIC+SAFETY >= 6 is absolute on the hood\'s own weight (Dimond sentiment −0.04 before momentum/bleed)',
    civic.nd.Dimond.sentiment < none.nd.Dimond.sentiment - 0.02 && near(civic.nd.Dimond.publicSpaces / none.nd.Dimond.publicSpaces, 0.98, 1e-6));
}

// ── 6. crime ladder per hood + the receipt ───────────────────────────────────
{
  const none = run();
  // One hood carries at most two counted spikes a Cycle — property and violent increases only (finalizeCycleState.js
  // compactCrimeSpikes_). Level 3 is the carried wave (engine.301 F1, builder 2026-10-25: a rise in back-to-back
  // Cycles; block 6c proves the live path); this stub feeds the levels directly.
  const r = run({ summary: { previousCycleState: { cycle: 119, crimeWaveHoods: ['Glenview'], crimeSpikes: [
    { neighborhood: 'Laurel', metric: 'propertyCrime', magnitude: 5, newValue: 30 },
    { neighborhood: 'Dimond', metric: 'propertyCrime', magnitude: 2, newValue: 7 }, { neighborhood: 'Dimond', metric: 'violentCrime', magnitude: 6, newValue: 25 },
    { neighborhood: 'Glenview', metric: 'crime', magnitude: 3 }] } } });
  check('the carried spikes set the levels: Laurel 1, Dimond 2 (property + violent), Glenview 3 (a carried wave)',
    JSON.stringify(r.S.crimeByNeighborhood) === '{"Laurel":1,"Dimond":2,"Glenview":3}', JSON.stringify(r.S.crimeByNeighborhood));
  const ratio = (h, k) => r.nd[h][k] / none.nd[h][k];
  check('1 spike: nightlife ×0.96, tourism and publicSpaces untouched', near(ratio('Laurel', 'nightlife'), 0.96, 1e-6) && near(ratio('Laurel', 'tourism'), 1, 1e-6) && near(ratio('Laurel', 'publicSpaces'), 1, 1e-6));
  check('2 spikes: nightlife ×0.90, tourism ×0.88, publicSpaces untouched', near(ratio('Dimond', 'nightlife'), 0.90, 1e-6) && near(ratio('Dimond', 'tourism'), 0.88, 1e-6) && near(ratio('Dimond', 'publicSpaces'), 1, 1e-6));
  check('level 3 (the wave): nightlife ×0.90, tourism ×0.88, publicSpaces ×0.88', near(ratio('Glenview', 'nightlife'), 0.90, 1e-6) && near(ratio('Glenview', 'tourism'), 0.88, 1e-6) && near(ratio('Glenview', 'publicSpaces'), 0.88, 1e-6));
  check('sentiment steps down the ladder (1 < 2 < 3 spikes)',
    none.nd.Laurel.sentiment - r.nd.Laurel.sentiment > 0.03 && (none.nd.Dimond.sentiment - r.nd.Dimond.sentiment) > (none.nd.Laurel.sentiment - r.nd.Laurel.sentiment) &&
    (none.nd.Glenview.sentiment - r.nd.Glenview.sentiment) > (none.nd.Dimond.sentiment - r.nd.Dimond.sentiment));
  const rows = r.ripples.filter(e => e.causeType === 'crime');
  check('one Ripple_Ledger receipt per Cycle naming the hoods at >= 2, with the spikes as prose',
    rows.length === 1 && JSON.stringify(rows[0].targetIds.slice().sort()) === JSON.stringify(['Dimond', 'Glenview']) && rows[0].magnitude === 3 &&
    /Dimond property crime \+2 \(now 7\); Dimond violent crime \+6 \(now 25\); Glenview crime \+3, rising two Cycles running/.test(rows[0].causeDetail), JSON.stringify(rows[0]));
  check('no receipt when no hood reaches 2', none.ripples.filter(e => e.causeType === 'crime').length === 0);
  const preset = run({ summary: { crimeByNeighborhood: { Dimond: 3 } } });
  check('engine.301: a pre-set map is never read — the level comes from the carry only (no fabricated wave)',
    JSON.stringify(preset.S.crimeByNeighborhood) === '{}' && near(preset.nd.Dimond.publicSpaces, none.nd.Dimond.publicSpaces, 1e-9));
}

// ── 6c. engine.301 F1: the ladder level is published, a carried wave takes rung 3, the chain ──────────
{
  const fcs = require('../phase09-digest/finalizeCycleState.js');   // the real Phase-9 compactors and snapshot
  const none = run();
  const spike = (h, metric, mag, now) => ({ neighborhood: h, metric: metric, magnitude: mag, newValue: now });
  const one = run({ summary: { previousCycleState: { cycle: 119, crimeSpikes: [spike('Dimond', 'propertyCrime', 6, 40)] } } });
  check('engine.301: the derived ladder level is published on S (Phase 5 crime carry reads it)',
    JSON.stringify(one.S.crimeByNeighborhood) === '{"Dimond":1}', JSON.stringify(one.S.crimeByNeighborhood));
  check('engine.301: one carried rise is rung 1', near(one.nd.Dimond.nightlife / none.nd.Dimond.nightlife, 0.96, 1e-6));
  const wave = run({ summary: { previousCycleState: { cycle: 119, crimeSpikes: [spike('Dimond', 'propertyCrime', 6, 40)], crimeWaveHoods: ['Dimond'] } } });
  const wr = k => wave.nd.Dimond[k] / none.nd.Dimond[k];
  check('engine.301: a carried wave hood reads level 3 and takes rung 3 (nightlife ×0.90, tourism ×0.88, publicSpaces ×0.88)',
    wave.S.crimeByNeighborhood.Dimond === 3 && near(wr('nightlife'), 0.90, 1e-6) && near(wr('tourism'), 0.88, 1e-6) && near(wr('publicSpaces'), 0.88, 1e-6));
  check('engine.301: the wave costs the hood more sentiment than one rise',
    (none.nd.Dimond.sentiment - wave.nd.Dimond.sentiment) > (none.nd.Dimond.sentiment - one.nd.Dimond.sentiment));
  const wrow = wave.ripples.filter(e => e.causeType === 'crime');
  check('engine.301: the receipt names the wave hood as rising two Cycles running',
    wrow.length === 1 && wrow[0].targetIds.join() === 'Dimond' && wrow[0].magnitude === 3 &&
    /Dimond property crime \+6 \(now 40\), rising two Cycles running/.test(wrow[0].causeDetail), JSON.stringify(wrow));
  const bad = run({ summary: { previousCycleState: { cycle: 119, crimeSpikes: [spike('Dimond', 'propertyCrime', 6, 40)], crimeWaveHoods: 'Dimond' } } });
  check('engine.301: a non-array crimeWaveHoods is ignored (level stays 1)', bad.S.crimeByNeighborhood.Dimond === 1);
  // The chain: Cycle N's Phase-2 level × Cycle N's rises → the carried list → Cycle N+1 at rung 3.
  const shifts = [
    { neighborhood: 'Dimond', metric: 'propertyCrime', direction: 'increase', magnitude: 7, newValue: 47 },
    { neighborhood: 'Laurel', metric: 'violentCrime', direction: 'increase', magnitude: 5, newValue: 30 },
    { neighborhood: 'Glenview', metric: 'propertyCrime', direction: 'decrease', magnitude: 9, newValue: 20 },
    { neighborhood: 'Dimond', metric: 'responseTime', direction: 'slower', magnitude: 2, newValue: 11 }
  ];
  const carry = fcs.compactCrimeSpikes_({ shifts: shifts });
  check('engine.301: compactCrimeWaveHoods_ keeps only a hood that rose now and the Cycle before',
    JSON.stringify(fcs.compactCrimeWaveHoods_(carry, one.S.crimeByNeighborhood)) === '["Dimond"]');
  check('engine.301: no wave without a prior level; empty on bad input',
    fcs.compactCrimeWaveHoods_(carry, {}).length === 0 && fcs.compactCrimeWaveHoods_(null, { Dimond: 1 }).length === 0 &&
    fcs.compactCrimeWaveHoods_(carry, null).length === 0);
  const fctx = { now: 'test-now', summary: { cycleId: 120, crimeMetrics: { shifts: shifts }, crimeByNeighborhood: one.S.crimeByNeighborhood } };
  fcs.finalizeCycleState_(fctx);
  const snap = JSON.parse(JSON.stringify(fctx.summary.previousCycleState));
  check('engine.301: finalizeCycleState_ carries crimeWaveHoods beside crimeSpikes, from the same list',
    JSON.stringify(snap.crimeWaveHoods) === '["Dimond"]' && snap.crimeSpikes.length === 2, JSON.stringify(snap.crimeWaveHoods));
  const next = run({ summary: { previousCycleState: { cycle: 120, crimeSpikes: snap.crimeSpikes, crimeWaveHoods: snap.crimeWaveHoods } } });
  check('engine.301: the chain — next Cycle reads Dimond at 3 (wave, rung 3), Laurel at 1',
    next.S.crimeByNeighborhood.Dimond === 3 && next.S.crimeByNeighborhood.Laurel === 1 &&
    near(next.nd.Dimond.publicSpaces / none.nd.Dimond.publicSpaces, 0.88, 1e-6), JSON.stringify(next.S.crimeByNeighborhood));
  // The Cycle after: Dimond does not rise again → not carried as a wave, back to level 0 (no decay rung, plan §engine.301 F1).
  const calm = { now: 'test-now', summary: { cycleId: 121, crimeMetrics: { shifts: [shifts[1]] }, crimeByNeighborhood: next.S.crimeByNeighborhood } };
  fcs.finalizeCycleState_(calm);
  const snap2 = JSON.parse(JSON.stringify(calm.summary.previousCycleState));
  const after = run({ summary: { previousCycleState: { cycle: 121, crimeSpikes: snap2.crimeSpikes, crimeWaveHoods: snap2.crimeWaveHoods } } });
  check('engine.301: the Cycle after a wave with no new rise — Dimond drops to level 0; Laurel, rising again, is the wave',
    !('Dimond' in after.S.crimeByNeighborhood) && after.S.crimeByNeighborhood.Laurel === 3 && JSON.stringify(snap2.crimeWaveHoods) === '["Laurel"]',
    JSON.stringify(after.S.crimeByNeighborhood));
  // A rise dropped at the 12-spike cap is not carried, so it cannot make a wave (the two carried fields agree).
  const many = [];
  for (let i = 0; i < 12; i++) many.push({ neighborhood: 'H' + i, metric: 'propertyCrime', direction: 'increase', magnitude: 10 + i, newValue: 60 });
  many.push({ neighborhood: 'Laurel', metric: 'propertyCrime', direction: 'increase', magnitude: 5, newValue: 35 });
  const capped = fcs.compactCrimeSpikes_({ shifts: many });
  check('engine.301: a hood whose rise fell past the 12-spike cap is in neither carried field',
    capped.length === 12 && !capped.some(sp => sp.neighborhood === 'Laurel') && fcs.compactCrimeWaveHoods_(capped, { Laurel: 1 }).length === 0);
  // Phase2-CityDynamics failed: the level was never published, so Phase 9 carries no wave.
  const failed2 = { now: 'test-now', summary: { cycleId: 122, crimeMetrics: { shifts: shifts } } };
  fcs.finalizeCycleState_(failed2);
  check('engine.301: no published level (Phase 2 failed) → no wave carried', JSON.stringify(failed2.summary.previousCycleState.crimeWaveHoods) === '[]');
}

// ── 6b. engine.214 Task 17 (north-hills nightlife split) + Task 19 / engine.287 (citywide crime floor + share) ──
{
  const w = world();
  const T = w.sb.HOOD_CHARACTER_BY_EMPLOYER;
  check('Task 17: `clinic` nightlife 1.10 sits above `professional` 1.05 (builder 2026-10-10: Temescal carries the Scenes, Rockridge does not)',
    T.clinic.nightlife === 1.10 && T.professional.nightlife === 1.05);
  const asClinic = run({ chr: { Laurel: 'clinic' } }), asPro = run({ chr: { Laurel: 'professional' } });
  check('Task 17: the same hood on the same inputs reads more nightlife as `clinic` than as `professional`',
    asClinic.nd.Laurel.nightlife > asPro.nd.Laurel.nightlife, asClinic.nd.Laurel.nightlife + ' vs ' + asPro.nd.Laurel.nightlife);

  check('engine.287: floor 3 carried spikes, citywide share 0.5 — declared constants', w.sb.CITYWIDE_CRIME_FLOOR === 3 && w.sb.CITYWIDE_CRIME_SHARE === 0.5);
  const none = run();
  // last night = the last carried entry; the baseline is the three before it: (2 + 0 + 0) / 3 = 0.67
  const hist = now => ({ activityObservations: { history: [{ cycle: 116, crime: 2 }, { cycle: 117, crime: 0 }, { cycle: 118, crime: 0 }, { cycle: 119, crime: now }] } });
  const one = run({ summary: hist(1) });
  check('engine.287: 1 carried spike vs a 0.67 baseline (ratio 1.5) reads under the floor — no citywide wave, every hood identical to the no-history Cycle',
    HOODS.every(h => JSON.stringify(one.nd[h]) === JSON.stringify(none.nd[h])), JSON.stringify(one.nd.Dimond) + ' vs ' + JSON.stringify(none.nd.Dimond));
  const wave = run({ summary: hist(3) });
  const wr = (h, k) => wave.nd[h][k] / none.nd[h][k];
  check('engine.287: 3 carried spikes vs 0.67 (ratio 4.5) is a real rise — the wave lands on every hood at the half share: nightlife ×0.94, publicSpaces ×0.95, tourism ×0.96',
    HOODS.every(h => near(wr(h, 'nightlife'), 0.94, 0.01) && near(wr(h, 'publicSpaces'), 0.95, 0.01) && near(wr(h, 'tourism'), 0.96, 0.01)),   // within 0.01 at run level: capacity friction reads the city load; exact numbers in sentimentRestingLevel.test.js
    [wr('Dimond', 'nightlife'), wr('Dimond', 'publicSpaces'), wr('Dimond', 'tourism')].map(x => x.toFixed(4)).join(' '));
  check('engine.287: the citywide wave moves sentiment down on every hood, and by less than the own-hood two-spike rung (−0.20) moves a hood',
    HOODS.every(h => wave.nd[h].sentiment < none.nd[h].sentiment) && (() => {
      const two = run({ summary: { previousCycleState: { cycle: 119, crimeSpikes: [{ neighborhood: 'Dimond', metric: 'propertyCrime', magnitude: 6, newValue: 40 }, { neighborhood: 'Dimond', metric: 'violentCrime', magnitude: 5, newValue: 25 }] } } });
      return (none.nd.Dimond.sentiment - wave.nd.Dimond.sentiment) < (none.nd.Dimond.sentiment - two.nd.Dimond.sentiment);
    })(), (none.nd.Dimond.sentiment - wave.nd.Dimond.sentiment).toFixed(4));
  const stretch = run({ summary: hist(4) });   // 4 vs a (2+0+0+... ) baseline — ratio 6: still the wave band; the bad-stretch band needs 1.25 ≤ x < 1.5
  const bad = run({ summary: { activityObservations: { history: [{ cycle: 116, crime: 3 }, { cycle: 117, crime: 3 }, { cycle: 118, crime: 3 }, { cycle: 119, crime: 4 }] } } });   // 4 / 3 = 1.33
  check('engine.287: a bad stretch (4 vs 3, ratio 1.33) lands at the half share: nightlife ×0.975, tourism ×0.985, publicSpaces untouched',
    HOODS.every(h => near(bad.nd[h].nightlife / none.nd[h].nightlife, 0.975, 0.005) && near(bad.nd[h].tourism / none.nd[h].tourism, 0.985, 0.005) && near(bad.nd[h].publicSpaces / none.nd[h].publicSpaces, 1, 0.005)) &&
    stretch.nd.Dimond.nightlife < bad.nd.Dimond.nightlife);
}

// ── 7. bleed before the fold; momentum bootstrap ─────────────────────────────
{
  const none = run();
  const d = 0.2;
  const fold = run({ summary: { initiativeNeighborhoodEffects: { Dimond: { sentiment: d } } } });
  check('bleed runs before the fold: a targeted +0.2 lands at the full 0.2 on its hood', near(fold.nd.Dimond.sentiment - none.nd.Dimond.sentiment, d, 1e-9),
    (fold.nd.Dimond.sentiment - none.nd.Dimond.sentiment).toFixed(4));
  check('…and none of it is exported to its neighbours this Cycle', adj('Dimond').every(h => near(fold.nd[h].sentiment, none.nd[h].sentiment)));
  // bleed itself: a hood carried far below its neighbours is pulled 12% toward their mean
  const low = run({ summary: { previousCycleState: { cycle: 119, neighborhoodDynamics: { Dimond: { sentiment: -0.9 } } } } });
  check('bleed pulls a low hood toward its neighbours (sentiment above the unbled momentum value)', low.nd.Dimond.sentiment > none.nd.Dimond.sentiment * 0.7 + (-0.9) * 0.3 + 0.01,
    low.nd.Dimond.sentiment + ' vs unbled ' + (none.nd.Dimond.sentiment * 0.7 - 0.27));
  // missing carry: the hood bootstraps its own prior mood from the persisted Sentiment column (sentiment only)
  const boot = run({ state: { Dimond: { sentiment: 0.9 } } });
  check('missing carry: a hood bootstraps its own prior mood from last Cycle\'s Sentiment (30% carry)', boot.nd.Dimond.sentiment > none.nd.Dimond.sentiment + 0.1 && near(boot.nd.Dimond.nightlife, none.nd.Dimond.nightlife));
  // normal carry wins over the bootstrap
  const carry = run({ state: { Dimond: { sentiment: 0.9 } }, summary: { previousCycleState: { cycle: 119, neighborhoodDynamics: { Dimond: { sentiment: -0.9 } } } } });
  check('normal carry: the carried dynamics win over the Sentiment column', carry.nd.Dimond.sentiment < none.nd.Dimond.sentiment && near(carry.nd.Dimond.sentiment, low.nd.Dimond.sentiment));
}

// ── 8. the city is its hoods ─────────────────────────────────────────────────
{
  const r = run();
  const mean = METRICS.reduce((o, k) => { o[k] = HOODS.reduce((s, h) => s + r.nd[h][k], 0) / 22; return o; }, {});
  check('city = the equal mean of the 22 final hood values, every metric (no carried city, no boosts)',
    METRICS.every(k => near(r.city[k], Math.round(mean[k] * 100) / 100, 0.0051)), JSON.stringify([r.city.sentiment, mean.sentiment]));
  const scalar = run({ summary: { initiativeImplementationEffects: { sentimentBoost: 0.15 } } });
  check('the initiative city scalar is retired: sentimentBoost alone moves nothing', near(scalar.city.sentiment, r.city.sentiment) && HOODS.every(h => near(scalar.nd[h].sentiment, r.nd[h].sentiment)));
  const viaHood = run({ summary: { initiativeNeighborhoodEffects: { Dimond: { sentiment: 0.22 } } } });
  check('an initiative moves the city only through its hoods: +0.22 on one hood = +0.01 on the city (0.22 / 22)', near(viaHood.city.sentiment - r.city.sentiment, 0.01, 0.0051),
    (viaHood.city.sentiment - r.city.sentiment).toFixed(4));
  const sports = run({ summary: { sportsSentimentBoost: 0.08 } });
  check('the sports / edition city adds stay (no hood path)', near(sports.city.sentiment - r.city.sentiment, 0.08, 0.0051));
  check('city momentum still blends against the carried city', (() => { const p = run({ summary: { previousCityDynamics: Object.assign({}, r.city, { sentiment: -1 }) } }); return p.city.sentiment < r.city.sentiment - 0.3; })());
}

// ── 9. no cluster surface anywhere ───────────────────────────────────────────
{
  const cd = src('phase02-world-state/applyCityDynamics.js');
  check('no cluster name, anchor list or clusterAnchors_ key in the engine', !/DOWNTOWN_CORE|WATERFRONT_WEST|LAKE_CORRIDOR|NORTH_HILLS|EAST_OAKLAND|clusterAnchors_|CLUSTERS\b|CLUSTER_ADJACENCY|seedClusterAnchors_|buildHoodClusterAssignment_|getClusterDynamics_/.test(cd));
  check('no hood name in the engine', HOODS.every(h => cd.indexOf("'" + h + "'") < 0 && cd.indexOf('"' + h + '"') < 0));
  check('the self-arm and its seeds are gone', !/ensureEngine214Config_|ENGINE214_CONFIG_SEEDS/.test(src('phase01-config/engine94SheetContract.js')) && !/ensureEngine214Config_/.test(src('phase01-config/godWorldEngine2.js')));
  check('every live label has a character row, every live zone is keyed', (() => { const w = world(); return Object.values(G.character).every(c => w.sb.HOOD_CHARACTER_BY_EMPLOYER[c]) && Object.values(G.zone).every(z => w.sb.HOOD_WEATHER_ZONES.indexOf(z) >= 0); })());
  check('the character table stays inside the authored range (0.80–1.25, sensitivity 0.6–1.4)', (() => { const w = world(); return Object.values(w.sb.HOOD_CHARACTER_BY_EMPLOYER).every(r =>
    ['traffic', 'retail', 'tourism', 'nightlife', 'publicSpaces', 'culturalActivity', 'communityEngagement'].every(k => r[k] >= 0.80 && r[k] <= 1.25) && r.capacitySensitivity >= 0.6 && r.capacitySensitivity <= 1.4); })());
}

// ── 10. Task 14: the hood writer keys its calendar literals on Scenes ────────
{
  const sb = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat };
  vm.createContext(sb);
  load(sb, 'phase01-config/canonNeighborhoodLoader.js');
  load(sb, 'phase08-v3-chicago/v3NeighborhoodWriter.js');
  const rows = canonRows();
  const ctx = { summary: {}, ss: { getSheetByName: n => n === 'Neighborhood_Map' ? { getDataRange: () => ({ getValues: () => rows }) } : null } };
  sb.loadCanonNeighborhoods_(ctx);
  const ff = sb.buildHolidayNeighborhoodMods_(ctx, 'none', true, false, 'off-season', {});
  check('First Friday mods: Scenes.FirstFriday >= 3 (Uptown 4, KONO 3) event ×1.8 nightlife ×1.4; 1–2 (Downtown, Temescal, Jack London) event ×1.4; blank hoods none',
    ff.Uptown && ff.Uptown.eventMod === 1.8 && ff.Uptown.nightlifeMod === 1.4 && ff.KONO && ff.KONO.eventMod === 1.8 &&
    ff.Downtown && ff.Downtown.eventMod === 1.4 && ff.Temescal.eventMod === 1.4 && ff['Jack London'].eventMod === 1.4 && !ff.Dimond && !ff.Laurel, JSON.stringify(ff));
  const cd = sb.buildHolidayNeighborhoodMods_(ctx, 'CreationDay', false, true, 'off-season', {});
  check('Creation Day mods: Scenes.CreationDay >= 3 (Downtown 3) event ×1.5 +0.1 sentiment; 1–2 (West Oakland, Lake Merritt, Jack London) event ×1.3',
    cd.Downtown && cd.Downtown.eventMod === 1.5 && near(cd.Downtown.sentimentMod, 0.1) && cd['West Oakland'].eventMod === 1.3 && cd['Lake Merritt'].eventMod === 1.3 && cd['Jack London'].eventMod === 1.3 && !cd.Dimond, JSON.stringify(cd));
  const S = ctx.summary;
  S.neighborhoodState = {}; HOODS.forEach(h => { S.neighborhoodState[h] = { employerCharacter: G.character[h] }; });
  const marker = (h, o) => sb.getDemographicMarkerV35_(h, 'base', {}, Object.assign({}, S, o || {}), 'none', !!(o && o.ff), !!(o && o.cd));
  check('markers: the top FirstFriday weight (Uptown) is the arts walk zone, Temescal is not', marker('Uptown', { ff: true }) === 'First Friday arts walk zone' && marker('Temescal', { ff: true }) === 'base');
  check('markers: the top CreationDay weight (Downtown) is the celebration zone', marker('Downtown', { cd: true }) === 'Creation Day celebration zone' && marker('West Oakland', { cd: true }) === 'base');
  check('markers: the shock zone is the institutional hood, by label', marker('Downtown', { shockFlag: 'shock-flag' }) === 'Shock event zone' && marker('Uptown', { shockFlag: 'shock-flag' }) === 'base');
  const ws = src('phase08-v3-chicago/v3NeighborhoodWriter.js');
  const fn = ws.slice(ws.indexOf('function buildHolidayNeighborhoodMods_'), ws.indexOf('// engine.204/205 §2.2'));
  const calendarPart = fn.slice(fn.indexOf('if (isFirstFriday)'));   // agy 2026-10-19 F5: the holiday blocks now come first
  check('no First Friday / Creation Day hood literal remains in the writer\'s calendar mods', calendarPart.length > 100 && !/'Temescal'|'Downtown'|'Jack London'|'West Oakland'/.test(calendarPart) && /hoodsWithScene_\(ctx, 'FirstFriday'\)/.test(calendarPart) && /hoodsWithScene_\(ctx, 'CreationDay'\)/.test(calendarPart));
  // agy 2026-10-19 F5: New Year's Eve / Halloween assign whole objects, so they run first and the Scenes
  // boosts multiply on top (the @147 order) — a coinciding First Friday / Creation Day is never erased.
  for (const hol of ['NewYearsEve', 'Halloween']) {
    const only = sb.buildHolidayNeighborhoodMods_(ctx, hol, false, false, 'off-season', {});
    const ffo = sb.buildHolidayNeighborhoodMods_(ctx, 'none', true, false, 'off-season', {});
    const cdo = sb.buildHolidayNeighborhoodMods_(ctx, 'none', false, true, 'off-season', {});
    const both = sb.buildHolidayNeighborhoodMods_(ctx, hol, true, true, 'off-season', {});
    const hoods = Object.keys(only);
    check('calendar mods (agy F5): ' + hol + ' + First Friday + Creation Day compose — each holiday hood keeps its own eventMod times the Scenes factors',
      hoods.length >= 3 && hoods.every(h => near(both[h].eventMod, only[h].eventMod * ((ffo[h] && ffo[h].eventMod) || 1) * ((cdo[h] && cdo[h].eventMod) || 1))) &&
      Object.keys(ffo).every(h => both[h] && both[h].eventMod >= ffo[h].eventMod),
      JSON.stringify(hoods.map(h => [h, both[h].eventMod, only[h].eventMod, ffo[h] && ffo[h].eventMod, cdo[h] && cdo[h].eventMod])));
  }
}

// ── 11. the real phase wrapper: a throw is an Engine_Errors row, nothing published, nothing queued ───
{
  const sbw = { Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, Date, isFinite, isNaN, parseFloat, console };
  vm.createContext(sbw);
  load(sbw, 'phase01-config/godWorldEngine2.js');   // safePhaseCall_, logEngineError_, computeShortHash_, recordPhaseTiming_
  load(sbw, 'phase01-config/canonNeighborhoodLoader.js');
  load(sbw, 'phase06-analysis/economicRippleEngine.js');
  load(sbw, 'phase02-world-state/applyCityDynamics.js');
  const wrapped = (over) => {
    const ripples = [], errors = []; sbw.recordRipple_ = (c, e) => { ripples.push(e); return true; };
    const rows = canonRows(over);
    const ctx = { config: { cycleCount: 120 }, writeIntents: [], mode: {},
      ss: { getSheetByName: n => n === 'Neighborhood_Map' ? { getDataRange: () => ({ getValues: () => rows }) } : (n === 'Engine_Errors' ? { appendRow: r => errors.push(r) } : null) },
      summary: { cycleId: 120, season: 'Fall', holiday: 'none', sportsSeason: 'off-season', weather: { type: 'clear', impact: 1 }, neighborhoodEconomies: {}, neighborhoodDemographics: {}, worldEvents: [], storySeeds: [],
        previousCycleState: { cycle: 119, crimeSpikes: [{ neighborhood: 'Dimond', metric: 'propertyCrime', magnitude: 6, newValue: 40 }, { neighborhood: 'Dimond', metric: 'violentCrime', magnitude: 5, newValue: 25 }] },
        sportsCity: {}, sportsWeek: {} } };
    sbw.loadCanonNeighborhoods_(ctx); ctx.summary.neighborhoodState = {};
    HOODS.forEach(h => { ctx.summary.neighborhoodState[h] = { employerCharacter: over.chr && h in over.chr ? over.chr[h] : G.character[h], boomIndex: G.boomIndex[h] }; });
    const ok = sbw.safePhaseCall_(ctx, 'Phase2-CityDynamics', () => sbw.applyCityDynamics_(ctx));
    return { ok, errors, ripples, S: ctx.summary };
  };
  const good = wrapped({});
  check('wrapper: the ordinary Cycle publishes 22 hoods, one crime receipt (Dimond at 2), no Engine_Errors row', good.ok === true && good.errors.length === 0 && Object.keys(good.S.neighborhoodDynamics).length === 22 && good.ripples.filter(e => e.causeType === 'crime').length === 1);
  const bad = wrapped({ chr: { Laurel: '__proto__' } });
  check('wrapper: an inherited-key label → false, one Engine_Errors row naming the label, S.cityDynamics and S.neighborhoodDynamics unset, zero ripple rows',
    bad.ok === false && bad.errors.length === 1 && /no row in HOOD_CHARACTER_BY_EMPLOYER/.test(String(bad.errors[0][3])) && bad.S.cityDynamics === undefined && bad.S.neighborhoodDynamics === undefined && bad.ripples.length === 0, JSON.stringify(bad.errors[0] && bad.errors[0].slice(1, 4)));
  const noAdj = wrapped({ noAdjacent: true });
  check('wrapper: no Adjacent column with a two-spike hood → false, one Engine_Errors row, nothing published, zero ripple rows (no orphan receipt)',
    noAdj.ok === false && noAdj.errors.length === 1 && /Adjacent/.test(String(noAdj.errors[0][3])) && noAdj.S.cityDynamics === undefined && noAdj.S.neighborhoodDynamics === undefined && noAdj.ripples.length === 0, JSON.stringify(noAdj.errors[0] && noAdj.errors[0].slice(1, 4)));
  const zone = wrapped({ zone: { Laurel: 'tundra' } });
  check('wrapper: an unlisted WeatherZone → false, one Engine_Errors row, nothing published', zone.ok === false && zone.errors.length === 1 && /WeatherZone "tundra"/.test(String(zone.errors[0][3])) && zone.S.neighborhoodDynamics === undefined && zone.ripples.length === 0);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
