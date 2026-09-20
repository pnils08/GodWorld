#!/usr/bin/env node
'use strict';

/**
 * engine.243 (S474) — a crisis gets a NAME, an END the newsroom can see, and a
 * city that remembers it.
 *
 * SIM_DOCTRINE §15 ends its chain on "can it be referenced afterwards as that
 * event." Before this cut an arc had an arcId and a summary rebuilt from
 * scratch every cycle; peak and resolution reached the ripple ledger and the
 * Event_Arc_Ledger but never S.worldEvents, so the desks could report a crisis
 * starting and never report it ending.
 *
 * Offline proof, no Sheet: the real Phase-3 detector runs in a vm sandbox with
 * queueAppendIntent_/recordRipple_ captured, driven cycle by cycle through the
 * same previousCycleState carry the live engine uses (compactCrisisArcs_ is the
 * REAL one, loaded from phase09). Every hood/number below is a fixture.
 * Run: node scripts/crisisNaming.test.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const load = (sb, rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });

const NM = ['Downtown', 'Temescal', 'Laurel', 'West Oakland', 'Fruitvale', 'Jack London', 'Rockridge',
  'Adams Point', 'Grand Lake', 'Piedmont Ave', 'Chinatown', 'Brooklyn', 'Eastlake', 'Glenview', 'Dimond',
  'Ivy Hill', 'San Antonio', 'KONO', 'Lake Merritt', 'Uptown', 'Baylight District', 'East Oakland'];

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ok  ' + name); }
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

// ── sandbox ─────────────────────────────────────────────────────────────────
let rngDraws = 0;
function sandbox() {
  const sb = {
    Logger: { log: () => {} }, Math, Object, Array, Number, String, JSON, isFinite, isNaN,
    console,
    intents: [], ripples: [],
    queueAppendIntent_: (ctx, tab, row, note, lane) => sb.intents.push({ tab, row, note, lane }),
    recordRipple_: (ctx, r) => sb.ripples.push(r),
    inWorldStamp_: (ctx) => (ctx.summary && ctx.summary.cycleRef) || ''
  };
  vm.createContext(sb);
  load(sb, 'phase03-population/generateCrisisBuckets.js');
  load(sb, 'phase09-digest/finalizeCycleState.js');
  load(sb, 'phase03-population/updateCrimeMetrics.js');
  return sb;
}

// A hood's channel state. Defaults are healthy, city-typical.
function hoodState(o) {
  return Object.assign({
    sentiment: 0.36, retailVitality: 8.4, crimeIndex: 0.55,
    migrationFlow: 0, housingPressure: 0
  }, o || {});
}

/**
 * Run one detector cycle. `bad` maps hood -> state overrides; everything else
 * sits at the healthy default so the z-scores have a real city to stand against.
 */
function runCycle(sb, cycle, opts) {
  opts = opts || {};
  const nbState = {};
  NM.forEach(h => { nbState[h] = hoodState((opts.bad || {})[h]); });
  const S = {
    absoluteCycle: cycle,
    cycleRef: opts.cycleRef || ('Y5C' + cycle),
    neighborhoodState: nbState,
    previousCycleState: opts.prev || {},
    crisisMemory: undefined,          // seeded from prev by the engine
    weatherEvents: opts.weatherEvents || [],
    transitState: opts.transitState || {},
    worldEvents: [],
    eventArcs: [],
    auditIssues: [],
    season: opts.season || 'Autumn',
    holiday: 'none', holidayPriority: 'none'
  };
  const ctx = {
    summary: S,
    now: new Date('2026-09-20T00:00:00Z'),
    rng: () => { rngDraws++; return 0.5; },
    config: { cycleCount: cycle }
  };
  sb.intents.length = 0; sb.ripples.length = 0;
  sb.generateCrisisBuckets_(ctx);
  // the real carry: compactCrisisArcs_ + the crisisMemory snapshot line
  const carried = {
    crisisArcs: sb.compactCrisisArcs_(S.crisisArcsActive),
    crisisMemory: (S.crisisMemoryActive || S.crisisMemory || []),
    hospitalEvents: []
  };
  return { S, ctx, carried, intents: sb.intents.slice(), ripples: sb.ripples.slice() };
}

// A hood bad enough on crime AND retail to clear two channels.
const CRIME_RETAIL = { crimeIndex: 1.18, retailVitality: 3.5 };
// Back inside city range.
const CLEAR = {};

console.log('\nengine.243 — crisis naming, the end of a crisis, and city memory\n');

// ── 1. the name is derived from the dominant channel, in priority order ─────
{
  const sb = sandbox();
  check('crime outranks retail in the name',
    sb.crisisArcName_('West Oakland', ['retail vitality 3.5 (city 6.4)', 'crime index 1.18 (city 0.71)']) === 'The West Oakland Crime Spike',
    sb.crisisArcName_('West Oakland', ['retail vitality 3.5 (city 6.4)', 'crime index 1.18 (city 0.71)']));
  check('a heat wave outranks a hospital run',
    sb.crisisArcName_('Laurel', ['3 hospitalizations last cycle', 'heat wave hit']) === 'The Laurel Heat Wave');
  check('flood conditions name the flood',
    sb.crisisArcName_('Fruitvale', ['flood conditions hit', 'transit disruption']) === 'The Fruitvale Flood');
  check('a storm names the storm',
    sb.crisisArcName_('Jack London', ['storm hit', 'sentiment 0.10 (city 0.36)']) === 'The Jack London Storm');
  check('retail alone is a retail slide',
    sb.crisisArcName_('Temescal', ['retail vitality 3.1 (city 8.4)']) === 'The Temescal Retail Slide');
  check('sentiment alone is a hard stretch',
    sb.crisisArcName_('Brooklyn', ['sentiment 0.08 (city 0.36)']) === 'The Brooklyn Hard Stretch');
  check('housing pressure names the squeeze',
    sb.crisisArcName_('Eastlake', ['housing pressure 9.10 (city 3.10)']) === 'The Eastlake Housing Squeeze');
  check('unrecognised evidence yields NO name rather than an invented one',
    sb.crisisArcName_('Downtown', ['something the detector never emits']) === '');
  check('no name means the summary is left exactly as written',
    sb.crisisNamed_({ name: '' }, 'Downtown under strain: x') === 'Downtown under strain: x');
  check('the name never welds two channels into a phenomenon',
    sb.crisisArcName_('Laurel', ['heat wave hit', '4 hospitalizations last cycle']).indexOf('Sickness') < 0 &&
    sb.crisisArcName_('Laurel', ['heat wave hit', '4 hospitalizations last cycle']) === 'The Laurel Heat Wave');
}

// ── 2. one name, minted at onset, unchanged for the whole life of the arc ───
{
  const sb = sandbox();
  let prev = {};
  const names = [];
  const phases = [];
  // C1 onset, C2 rising, C3 peak — three straight bad cycles
  for (let c = 1; c <= 3; c++) {
    const r = runCycle(sb, c, { prev, bad: { 'West Oakland': CRIME_RETAIL } });
    const arc = r.S.eventArcs[0];
    names.push(arc.name); phases.push(arc.phase);
    prev = r.carried;
  }
  check('onset mints the name', names[0] === 'The West Oakland Crime Spike', names[0]);
  check('the name survives the carry unchanged', names[1] === names[0] && names[2] === names[0],
    JSON.stringify(names));
  check('the arc still reaches peak on three bad cycles', phases.join('>') === 'early>rising>peak', phases.join('>'));

  // C4-C6 clear → resolved
  let last = null;
  for (let c = 4; c <= 6; c++) {
    last = runCycle(sb, c, { prev, bad: { 'West Oakland': CLEAR } });
    prev = last.carried;
  }
  const resolvedArc = last.S.eventArcs[0];
  check('the arc resolves after three clear cycles', resolvedArc.phase === 'resolved', resolvedArc.phase);
  check('the name is still the same at resolution', resolvedArc.name === names[0], resolvedArc.name);
  check('every phase summary carries the name',
    resolvedArc.summary.indexOf('The West Oakland Crime Spike — ') === 0, resolvedArc.summary);
}

// ── 3. peak and resolution reach the newsroom, not just the ledger ──────────
{
  const sb = sandbox();
  let prev = {}, peakCycle = null, resolvedCycle = null;
  for (let c = 1; c <= 3; c++) { peakCycle = runCycle(sb, c, { prev, bad: { 'West Oakland': CRIME_RETAIL } }); prev = peakCycle.carried; }
  const peakEvents = peakCycle.S.worldEvents.filter(e => e.subdomain === 'crisis-lifecycle' && e.stage === 'peak');
  check('the peak emits a world event (it emitted none before)', peakEvents.length === 1, String(peakEvents.length));
  check('the peak event carries the name', peakEvents[0] && peakEvents[0].arcName === 'The West Oakland Crime Spike');
  check('the peak event carries the arcId for linkage', peakEvents[0] && /^CRISIS-/.test(peakEvents[0].arcId));

  for (let c = 4; c <= 6; c++) { resolvedCycle = runCycle(sb, c, { prev, bad: { 'West Oakland': CLEAR } }); prev = resolvedCycle.carried; }
  const endEvents = resolvedCycle.S.worldEvents.filter(e => e.subdomain === 'crisis-lifecycle' && e.stage === 'resolved');
  check('the end of the crisis emits a world event', endEvents.length === 1, String(endEvents.length));
  check('the end event is low severity, not a new alarm', endEvents[0] && endEvents[0].severity === 'low');
  check('the end event says it eased, in the named arc',
    endEvents[0] && endEvents[0].description.indexOf('The West Oakland Crime Spike — ') === 0 &&
    endEvents[0].description.indexOf('eased') > 0, endEvents[0] && endEvents[0].description);

  // ── 4. the city remembers it ──────────────────────────────────────────────
  check('the resolved crisis enters city memory', prev.crisisMemory.length === 1, JSON.stringify(prev.crisisMemory));
  check('memory records the name, hood and in-world stamp',
    prev.crisisMemory[0].name === 'The West Oakland Crime Spike' &&
    prev.crisisMemory[0].hood === 'West Oakland' &&
    prev.crisisMemory[0].cycleRef === 'Y5C6', JSON.stringify(prev.crisisMemory[0]));
  check('memory carries no Gregorian date (no real-world clock in the sim)',
    !/20\d\d-\d\d-\d\d|\b20[2-9]\d\b/.test(JSON.stringify(prev.crisisMemory)));

  // ── 5. the next crisis in that hood references the last one ───────────────
  const again = runCycle(sb, 9, { prev, bad: { 'West Oakland': CRIME_RETAIL } });
  const newArc = again.S.eventArcs[0];
  check('a later onset in the same hood references the remembered crisis',
    newArc.summary.indexOf('first crisis here since The West Oakland Crime Spike (Y5C6)') > 0, newArc.summary);
  const elsewhere = runCycle(sb, 9, { prev, bad: { 'Temescal': CRIME_RETAIL } });
  check('a hood with no remembered crisis gets no reference line',
    elsewhere.S.eventArcs[0].summary.indexOf('first crisis here since') < 0,
    elsewhere.S.eventArcs[0].summary);
}

// ── 5b. an arc already in flight when naming shipped still gets its name ───
{
  const sb = sandbox();
  // exactly the bench state: CRISIS-110-ROCKRIDG carried in with NO name, detected
  // on hospitalizations + housing pressure (hospital is the dominant channel).
  const prev = { crisisArcs: [{
    arcId: 'CRISIS-110-ROCKRIDG', type: 'crisis', phase: 'early', tension: 5,
    neighborhood: 'Rockridge', domainTag: 'HEALTH', domain: 'HEALTH',
    summary: 'Rockridge under strain: 2 hospitalizations last cycle; housing pressure 6.00 (city 1.95)',
    citizens: [], consecutiveBad: 1, consecutiveGood: 0, cycleCreated: 110,
    phaseStartCycle: 110, source: 'DETECTED'
  }], crisisMemory: [], hospitalEvents: [] };
  const r = runCycle(sb, 112, { prev, bad: { 'Rockridge': { housingPressure: 6.0, crimeIndex: 1.15 } } });
  const arc = r.S.eventArcs[0];
  check('an arc carried in nameless is named on its next evaluation',
    arc.name === 'The Rockridge Hospital Run', arc.name);
  check('the backfilled name comes from what it was DETECTED on, not the last live channel',
    arc.nameChannel === 'hospital', arc.nameChannel);
  check('the backfilled name reaches the summary',
    arc.summary.indexOf('The Rockridge Hospital Run — ') === 0, arc.summary);
}

// ── 6. memory is capped and most-recent-first ──────────────────────────────
{
  const sb = sandbox();
  const S = { cycleRef: 'Y5C1' };
  for (let i = 1; i <= 9; i++) {
    sb.rememberCrisis_(S, { name: 'The Hood' + i + ' Flood', neighborhood: 'Hood' + i, nameChannel: 'flood' }, i);
  }
  check('city memory is capped at 6', S.crisisMemory.length === 6, String(S.crisisMemory.length));
  check('city memory is most-recent-first', S.crisisMemory[0].name === 'The Hood9 Flood', S.crisisMemory[0].name);
  check('the oldest crises fall off the end', S.crisisMemory.map(m => m.name).join().indexOf('Hood1 ') < 0);
  check('a full memory stays small against the 9KB snapshot budget',
    JSON.stringify(S.crisisMemory).length < 700, JSON.stringify(S.crisisMemory).length + ' bytes');
  check('an unnamed arc is never remembered',
    (sb.rememberCrisis_(S, { name: '', neighborhood: 'X' }, 10), S.crisisMemory.length === 6));
}

// ── 7. the carry keeps the name (the whole thing dies without this) ────────
{
  const sb = sandbox();
  const compacted = sb.compactCrisisArcs_([{
    arcId: 'CRISIS-9-WESTOAKL', name: 'The West Oakland Crime Spike', nameChannel: 'crime',
    type: 'crisis', phase: 'rising', tension: 5, neighborhood: 'West Oakland', domainTag: 'SAFETY',
    domain: 'SAFETY', summary: 'x', citizens: [], consecutiveBad: 2, consecutiveGood: 0,
    cycleCreated: 8, phaseStartCycle: 9, source: 'DETECTED'
  }]);
  check('compactCrisisArcs_ whitelists the name', compacted[0].name === 'The West Oakland Crime Spike');
  check('compactCrisisArcs_ whitelists the naming channel', compacted[0].nameChannel === 'crime');
  check('compactCrisisArcs_ still keeps the engine.186 recovery counter',
    compacted[0].consecutiveGood === 0 && 'consecutiveGood' in compacted[0]);
}

// ── 8. a crisis ENDING must never push crime up (engine.212 interaction) ───
{
  const sb = sandbox();
  const lifecycleEnd = {
    cycle: 6, domain: 'SAFETY', subdomain: 'crisis-lifecycle', stage: 'resolved',
    neighborhood: 'West Oakland', severity: 'low'
  };
  const realSpike = {
    cycle: 6, domain: 'SAFETY', subdomain: 'crisis-spike',
    neighborhood: 'West Oakland', severity: 'high'
  };
  const src = fs.readFileSync(path.join(ROOT, 'phase03-population/updateCrimeMetrics.js'), 'utf8');
  check('updateCrimeMetrics_ skips crisis-lifecycle events before the SAFETY gate',
    /crisis-lifecycle'\) continue;[\s\S]{0,80}domain === 'CHAOS'/.test(src));
  check('the guard sits inside the world-event loop, above the SAFETY branch',
    src.indexOf("=== 'crisis-lifecycle'") > src.indexOf('for (var e = 0; e < worldEvents.length') &&
    src.indexOf("=== 'crisis-lifecycle'") < src.indexOf("domain === 'CHAOS'"));
  check('a real crisis spike is still a crime cause (the old path is untouched)',
    realSpike.subdomain !== 'crisis-lifecycle' && lifecycleEnd.subdomain === 'crisis-lifecycle');
}

// ── 9. no dice were added ──────────────────────────────────────────────────
{
  rngDraws = 0;
  const sb = sandbox();
  let prev = {};
  for (let c = 1; c <= 6; c++) {
    const r = runCycle(sb, c, { prev, bad: c <= 3 ? { 'West Oakland': CRIME_RETAIL } : {} });
    prev = r.carried;
  }
  check('the detector draws zero rng across a full crisis life (no downstream draw moves)',
    rngDraws === 0, String(rngDraws) + ' draws');
}

// ── 10. a quiet city stays quiet ───────────────────────────────────────────
{
  const sb = sandbox();
  let prev = {};
  let events = 0, arcs = 0;
  for (let c = 1; c <= 20; c++) {
    const r = runCycle(sb, c, { prev, bad: {} });
    events += r.S.worldEvents.length; arcs += r.S.eventArcs.length;
    prev = r.carried;
  }
  check('20 healthy cycles produce no crisis, no name, no bulletin',
    events === 0 && arcs === 0, events + ' events / ' + arcs + ' arcs');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed ? 1 : 0);
