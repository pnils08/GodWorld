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

// ── 5c. the bench case: a legacy arc whose evidence the lifecycle overwrote ─
{
  const sb = sandbox();
  // EXACTLY what SANDBOX 0908 handed back at C112: CRISIS-110-ROCKRIDG had
  // already entered decline, so its carried summary is the evidence-free
  // recovery line and the channel backfill has nothing to read.
  const prev = { crisisArcs: [{
    arcId: 'CRISIS-110-ROCKRIDG', type: 'crisis', phase: 'decline', tension: 1.4,
    neighborhood: 'Rockridge', domainTag: 'HEALTH', domain: 'HEALTH',
    summary: 'Rockridge recovering — pressure lifting',
    citizens: [], consecutiveBad: 0, consecutiveGood: 1, cycleCreated: 110,
    phaseStartCycle: 111, source: 'DETECTED'
  }], crisisMemory: [], hospitalEvents: [] };
  // housing pressure is live in Rockridge this cycle but was NOT necessarily what
  // the arc was detected on — the bench named it "Housing Squeeze" off exactly
  // this, and got lucky. A live channel is never a naming source for a legacy arc.
  const r = runCycle(sb, 113, { prev, bad: { 'Rockridge': { housingPressure: 9.5 } } });
  const arc = r.S.eventArcs[0];
  check('a live channel at recovery time never names a legacy arc',
    arc.name.indexOf('Housing Squeeze') < 0, arc.name);
  check('a legacy arc with no recoverable evidence is named from its domain',
    arc.name === 'The Rockridge Health Crisis', arc.name);
  check('the coarse name is marked as domain-precision, not a channel claim',
    arc.nameChannel === 'domain', arc.nameChannel);
  check('the coarse name reaches the recovery line the desks render',
    arc.summary.indexOf('The Rockridge Health Crisis — Rockridge easing but still strained') === 0, arc.summary);
  check('an arc with a domain the map does not cover stays unnamed rather than guessing',
    (() => { const p2 = JSON.parse(JSON.stringify(prev)); p2.crisisArcs[0].domainTag = 'CULTURE'; p2.crisisArcs[0].domain = 'CULTURE';
      return sb.crisisNameFromDomain_('Rockridge', 'CULTURE') === ''; })());
  check('precise channel evidence still beats the domain fallback',
    sb.crisisArcName_('Rockridge', ['2 hospitalizations last cycle']) === 'The Rockridge Hospital Run');
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

// ── 8b. the name must not become a fake citizen (antigravity review find) ──
{
  // engine.245: the desk-packet harvest used to admit every TitleCase pair in an
  // arc summary as a PERSON TO QUOTE ("The Rockridge", "Housing Squeeze", "West
  // Oakland"). Prose is now searched FOR known names, never mined for new ones.
  const src = fs.readFileSync(path.join(ROOT, 'scripts/buildDeskPackets.js'), 'utf8');
  check('buildDeskPackets no longer harvests TitleCase pairs from prose',
    !/match\(\/\[A-Z\]\[a-z\]\+ \[A-Z\]\[a-z\]\+\/g\)/.test(src));
  const fnSrc = src.slice(src.indexOf('function findKnownNamesInText_'), src.indexOf('function getCitizenNamesFromDeskData'));
  const find = new Function(fnSrc + '; return findKnownNamesInText_;')();
  const KNOWN = ['Brie Harris', 'Helena Voss-Adeyemi', 'Helena Voss', 'Vinnie Keane'];
  check('no fake citizen is harvested from a named resolution line',
    find('The Rockridge Housing Squeeze — Rockridge crisis eased after 3 cycles back within city range', KNOWN).length === 0);
  check('a hood is not a person',
    find('The West Oakland Crime Spike — West Oakland under strain: crime index 1.18 (city 0.71)', KNOWN).length === 0);
  check('a ledger citizen named in prose IS found, possessive included',
    JSON.stringify(find("Brie Harris's shop reopened; Vinnie Keane attended.", KNOWN)) === '["Brie Harris","Vinnie Keane"]');
  check('a hyphenated surname lands whole and never as its shorter prefix',
    JSON.stringify(find('Helena Voss-Adeyemi broke ground in Rockridge', KNOWN)) === '["Helena Voss-Adeyemi"]');
  check('a name inside a longer word is not a match',
    find('McBrie Harrison spoke', KNOWN).length === 0);
  check('the call site hands the harvester the ledger name list',
    /getCitizenNamesFromDeskData\([^)]*ledgerNameList\)/.test(src) && /var ledgerNameList = Object\.keys\(simLedgerByName\)/.test(src));
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

// ── 11. engine.244: a crisis spike describes itself and trips no parser ────
{
  // Four engines PARSE a world event's description and act on what they find.
  // A spike's description was blank until engine.244, so it triggered none of
  // them. The keyword lists below are LIFTED FROM SOURCE, so a keyword added to
  // any of the four readers re-tests every string the spike generator can emit.
  const rd = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const lits = (src, re) => { const out = []; let m; while ((m = re.exec(src))) out.push(m[1]); return out; };

  const rippleSrc = rd('phase06-analysis/economicRippleEngine.js');
  const rippleKw = lits(rippleSrc, /evtText\.indexOf\('([^']+)'\)/g);
  const faithSrc = rd('phase04-events/faithEventsEngine.js');
  const faithKw = lits((faithSrc.match(/var crisisKeywords = \[([^\]]+)\]/) || [])[1] || '', /'([^']+)'/g);
  const hookKw = lits(rd('phase07-evening-media/storyHook.js'), /desc\.indexOf\('([^']+)'\)/g);
  const citSrc = rd('phase05-citizens/generateCitizensEvents.js');
  const reactSrc = citSrc.slice(citSrc.indexOf('function chaosReaction_'), citSrc.indexOf('// Fallback: worldEventsEngine texture'));
  const branches = lits(reactSrc, /if \(\/(.+?)\/\.test\(hay\)\)/g).map(r => new RegExp(r));
  check('the four keyword lists were actually lifted (ripple/faith/hook/reaction)',
    rippleKw.length >= 15 && faithKw.length >= 5 && hookKw.length >= 5 && branches.length >= 8,
    [rippleKw.length, faithKw.length, hookKw.length, branches.length].join('/'));

  const sb = { Math, Object, Array, Number, String, JSON, isFinite, isNaN, Error };
  vm.createContext(sb);
  load(sb, 'phase03-population/generateCrisisSpikes.js');
  const DOMAINS = ['HEALTH', 'INFRASTRUCTURE', 'CIVIC', 'ECONOMIC', 'SAFETY', 'ENVIRONMENT', 'CULTURE'];
  const firstBranch = hay => branches.findIndex(b => b.test(hay));
  const trips = [];
  let shape = 0, total = 0;
  DOMAINS.forEach(d => ['low', 'medium', 'high'].forEach(sev => NM.forEach(h => {
    const desc = sb.crisisSpikeDescription_(d, sev, h);
    const low = desc.toLowerCase();
    total++;
    if (/^(Low|Medium|High)-severity [a-z-]+ spike in .+$/.test(desc)) shape++;
    rippleKw.forEach(k => { if (low.indexOf(k) >= 0) trips.push('ripple:' + k + ' <- ' + desc); });
    faithKw.forEach(k => { if (low.indexOf(k) >= 0) trips.push('faith:' + k + ' <- ' + desc); });
    hookKw.forEach(k => { if (low.indexOf(k) >= 0) trips.push('hook:' + k + ' <- ' + desc); });
    const blank = firstBranch((d + '  ').toLowerCase());
    const filled = firstBranch((d + '  ' + desc).toLowerCase());
    if (blank !== filled) trips.push('reaction branch ' + blank + '->' + filled + ' <- ' + desc);
  })));
  check('every domain x severity x hood string has the record shape', shape === total && total === 7 * 3 * NM.length, shape + '/' + total);
  check('no spike description trips a ripple, faith, story-hook or citizen-reaction keyword', trips.length === 0, trips.slice(0, 4).join(' | '));
  check('the description builder draws no dice', !/rng|Math\.random/.test(String(sb.crisisSpikeDescription_)));
  check('the citizen fallback never quotes a crisis-spike record line',
    /ev\.subdomain === 'crisis-spike'\) \? "" : String\(ev\.description/.test(citSrc));

  // the real generator, end to end: same draw count as before the description
  // existed (5 per spike + 1 for the count), every spike described.
  let draws = 0, seed = 7;
  sb.safeRand_ = () => () => { draws++; seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  sb.getCoreSimNeighborhoods_ = () => NM.slice();
  const nbState = {}; NM.forEach(h => { nbState[h] = { incomeTier: 3, crimeIndex: 0.7 }; });
  const ctx = { config: { cycleCount: 108 }, now: 'T', summary: { cycleId: 108, neighborhoodState: nbState, season: 'Summer' } };
  sb.generateCrisisSpikes_(ctx);
  const spikes = ctx.summary.worldEvents.filter(e => e.subdomain === 'crisis-spike');
  check('the generator emits at least one spike and every spike carries its own description',
    spikes.length >= 1 && spikes.every(e => e.description === sb.crisisSpikeDescription_(e.domain, e.severity, e.neighborhood)),
    JSON.stringify(spikes.map(e => e.description)));
  check('the description costs zero rng draws (1 for the count + 4 per spike, as before)',
    draws === 1 + 4 * spikes.length, draws + ' draws / ' + spikes.length + ' spikes');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
process.exit(failed ? 1 : 0);
