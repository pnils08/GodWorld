/**
 * homeSocialLineSign.test.js — engine.350 Task 7, the engines that still wrote a home, social, culture or
 * retired-player line at a fixed size whatever it said (builder 2026-11-18: "we fixing all this").
 *   1. the lists: every line a pool can hold is listed, nothing is listed that no pool holds, each sign is a real
 *      dial, each written tag folds exactly one step on that dial.
 *   2. the writers, run for real: no bare Relationship / Household / PostCareer / Cultural / Community line and no
 *      calendar-suffixed one is written; a line that says the down side is written down; a plain line is drawn,
 *      counted and not written; lines with kinds of their own are untouched.
 *   3. the generic writer's culture and community lines, the neighborhood engine's First Friday lines, and the
 *      generator's follow-up lines carry their own sign.
 * Run: node scripts/homeSocialLineSign.test.js
 */
const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
global.Utilities = { formatDate: () => 'STAMP' };
global.Session = { getScriptTimeZone: () => 'UTC' };
global.queueAppendIntent_ = () => {};
global.queueBatchAppendIntent_ = () => {};
global.inWorldStamp_ = () => 'C101';
global.getCitizenDialBands_ = () => null;
const M = require('../utilities/citizenDialMap.js');
const E = require('../utilities/citizenMemory.js');
Object.assign(global, E);   // the fold's helpers (applyCycleEffects_, settleCycle_ …) are globals in Apps Script
global.nudgesForEvent_ = M.nudgesForEvent_; global.baseTag_ = M.baseTag_;
const C = require('../utilities/compressLifeHistory.js');

function mulberry32(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
let rngImpl = mulberry32(1);
global.safeRand_ = () => rngImpl;

let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { console.log(`  ok   ${label}`); passed++; } else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; } }
const read = (f) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
const strings = (src) => [...src.matchAll(/"([a-z][^"]{10,})"/g)].map((m) => m[1]).filter((t) => / /.test(t));
const flat = (o) => { const out = []; (function w(x) { if (Array.isArray(x)) x.forEach(w); else if (x && typeof x === 'object') Object.values(x).forEach(w); else if (typeof x === 'string') out.push(x); })(o); return out; };
const DIALS = M.GRADED_DIALS;
const lifeLines = (rows, iLife) => { const out = []; rows.forEach((r) => String(r[iLife] || '').split('\n').filter(Boolean).forEach((l) => { const m = /^C101 — \[([^\]]+)\] (.*)$/.exec(l); if (m) out.push({ tag: m[1], text: m[2] }); })); return out; };

// the list of one engine against the pools it can draw from
function checkList(name, kind, byText, poolTexts, tagFn) {
  const listed = Object.keys(byText);
  const unlisted = [...new Set(poolTexts.filter((t) => !(t in byText)))];
  const orphan = listed.filter((t) => poolTexts.indexOf(t) < 0);
  assert(`${name}: every pool line is listed (${new Set(poolTexts).size} lines)`, poolTexts.length > 20 && unlisted.length === 0, JSON.stringify(unlisted.slice(0, 4)));
  assert(`${name}: nothing is listed that no pool holds`, orphan.length === 0, JSON.stringify(orphan.slice(0, 4)));
  const bad = [], counts = { up: 0, down: 0, plain: 0 };
  listed.forEach((t) => {
    const sign = byText[t];
    if (sign === null) { counts.plain++; if (tagFn(t).tag !== '' || tagFn(t).why !== 'plain') bad.push(t); return; }
    const m = /^([a-z]+):(up|down)$/.exec(sign);
    if (!m || DIALS.indexOf(m[1]) < 0) { bad.push(t + ' ' + sign); return; }
    counts[m[2]]++;
    const tag = tagFn(t).tag, fx = M.nudgesForEvent_(tag, 1, t);
    if (tag !== M.gradedTag_(kind, m[1], m[2] === 'up', 'S') || M.baseTag_(tag) !== kind || Object.keys(fx).length !== 1 || fx[m[1]] !== (m[2] === 'up' ? 1 : -1)) bad.push(t + ' -> ' + tag + ' ' + JSON.stringify(fx));
  });
  assert(`${name}: each listed line is a real dial, written ${kind}-<Dial>-<Up|Down>-S, folding one step (${counts.up} up, ${counts.down} down, ${counts.plain} plain)`, bad.length === 0, JSON.stringify(bad.slice(0, 3)));
  assert(`${name}: a line with no entry is not written and says why`, tagFn('a line nobody wrote').tag === '' && tagFn('a line nobody wrote').why === 'unlisted');
  return counts;
}

// ── relationship engine
console.log('═══ runRelationshipEngine — social lines');
{
  const src = read('phase05-citizens/runRelationshipEngine.js');
  const R = new Function(src + '\nreturn { run: runRelationshipEngine_, byText: RELATIONSHIP_SIGN_BY_TEXT_, tag: relationshipLineTag_ };')();
  const body = src.slice(src.indexOf('function runRelationshipEngine_'), src.indexOf('  var rivalryRels'));
  const poolTexts = strings(body).filter((t) => !/ctx\.ledger/.test(t));
  checkList('relationship', 'Relationship', R.byText, poolTexts, (t) => R.tag('Relationship', t));
  assert('"felt distant from people around them" is sociability down (was +5 sociability, +2 warmth)',
    R.tag('Relationship', 'felt distant from people around them').tag === 'Relationship-Sociability-Down-S' && JSON.stringify(M.nudgesForEvent_('Relationship', 1, '')) === '{"sociability":5,"warmth":2}');
  assert('"had a minor disagreement with someone they know" is warmth down', R.tag('Relationship', 'had a minor disagreement with someone they know').tag === 'Relationship-Warmth-Down-S');

  // the weather and media engines are present, as on a real Cycle (agy 2026-11-18: with them absent the harness hid
  // that every line they handed in was unlisted): a heat wave with specials, a weather line and a media line on offer
  const OUTSIDE = ['walked through drizzle, unbothered', 'sought shade during the heat wave', 'read an anxious headline twice'];
  global.getWeatherEvent_ = () => ({ text: OUTSIDE[0] });
  global.hasWeatherCondition_ = (ctx, c) => c === 'heat_wave';
  global.getMediaInfluencedEvent_ = () => ({ text: OUTSIDE[2] });
  const HEADERS = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'DialState', 'Status'];
  const lines = []; let dropped = 0, active = 0, written = 0, overCap = 0, fullWithDrops = 0; const bySrc = {};
  for (let seed = 1; seed <= 500; seed++) {
    rngImpl = mulberry32(seed * 7919);
    const rows = []; for (let i = 0; i < 150; i++) rows.push(['POP-R' + i, 'T', 'R' + i, 3, 'ENGINE', 'n', 'n', 'n', '', '', 'Temescal', '', 'active']);
    const season = ['Winter', 'Spring', 'Summer', 'Fall'][seed % 4];
    const ctx = { now: new Date(0), config: {}, ledger: { headers: HEADERS.slice(), rows, dirty: false },
      summary: { season, holiday: seed % 5 === 0 ? 'Thanksgiving' : 'none', isFirstFriday: seed % 3 === 0, isCreationDay: seed % 7 === 0,
        weather: { type: ['clear', 'rain', 'fog', 'hot', 'wind'][seed % 5], impact: 1 }, worldEvents: seed % 2 ? [{ domain: 'CIVIC' }] : [],
        weatherEventPools: { special: [OUTSIDE[1]], base: [OUTSIDE[0]] }, mediaEffects: { eventPools: { anxious: [OUTSIDE[2]] } },
        cityDynamics: { sentiment: seed % 4 === 0 ? -0.5 : 0.5, culturalActivity: 1.5, communityEngagement: 1.4 }, eventsGenerated: 0, cycleId: 101 } };
    R.run(ctx);
    const got = lifeLines(ctx.ledger.rows, 8); written += got.length; got.forEach((l) => lines.push(l));
    if (got.length > 8) overCap++;
    if (got.length === 8 && ctx.summary.engine299 && ctx.summary.engine299.noDial > 0) fullWithDrops++;
    if (ctx.summary.engine299) { dropped += ctx.summary.engine299.noDial; for (const k in ctx.summary.engine299.noDialBySource) bySrc[k] = (bySrc[k] || 0) + ctx.summary.engine299.noDialBySource[k]; }
    active += ctx.summary.cycleActiveCitizens.length;
  }
  const bare = lines.filter((l) => /^(Relationship|Cultural|Community|Media)$/.test(l.tag) || /^Relationship-(Holiday|FirstFriday|CreationDay|Weather)$/.test(l.tag));
  assert(`the engine writes no bare or calendar-suffixed social line, and no Media line (${written} lines in 500 runs)`, written > 1500 && bare.length === 0 && !lines.some((l) => /^Media/.test(l.tag)), JSON.stringify(bare.slice(0, 3)));
  const wrong = lines.filter((l) => { const want = (l.text in R.byText) ? R.tag(/^Cultural/.test(l.tag) ? 'Cultural' : (/^Community/.test(l.tag) ? 'Community' : 'Relationship'), l.text).tag : null; return want !== l.tag; });
  assert('every written line carries the tag its sentence is listed under', wrong.length === 0, JSON.stringify(wrong.slice(0, 3)));
  const down = lines.filter((l) => /-Down-S$/.test(l.tag)).length;
  assert(`the down side is written (${down} of ${written} lines)`, down > written * 0.08);
  const plainWritten = lines.filter((l) => R.byText[l.text] === null);
  assert(`a plain line is drawn, counted and not written (${dropped} draws)`, dropped > 50 && plainWritten.length === 0 && bySrc['runRelationshipEngine:Relationship:plain'] === dropped && !bySrc['runRelationshipEngine:Relationship:unlisted'], JSON.stringify(bySrc));
  assert('no weather or media line is taken into the social pool: none written, none drawn and dropped', !lines.some((l) => OUTSIDE.indexOf(l.text) >= 0) && !bySrc['runRelationshipEngine:Relationship:unlisted']);
  assert(`the cap is on lines written: no run wrote more than 8, and ${fullWithDrops} runs wrote all 8 with plain draws beside them`, overCap === 0 && fullWithDrops > 20);
  delete global.getWeatherEvent_; delete global.hasWeatherCondition_; delete global.getMediaInfluencedEvent_;
  assert('a citizen whose draw was plain still counts as out among people (the bond engine\'s pool)', active === written + dropped, active + ' vs ' + (written + dropped));
  assert('the culture and community lines keep their kinds, graded', lines.some((l) => /^Cultural-(Openness|Sociability)-Up-S$/.test(l.tag)) && lines.some((l) => /^Community-(Sociability|Warmth)-Up-S$/.test(l.tag)));
}

// ── household engine
console.log('═══ runHouseholdEngine — home lines');
{
  global.hoodTexturePool_ = (ctx, hood, byLabel, bespoke) => flat(byLabel).concat(flat(bespoke));   // every texture line reachable
  const src = read('phase05-citizens/runHouseholdEngine.js');
  const H = new Function(src + '\nreturn { run: runHouseholdEngine_, byText: HOUSEHOLD_SIGN_BY_TEXT_, tag: householdLineTag_, T: HOUSEHOLD_TEXTURE_BY_CHARACTER_, B: HOUSEHOLD_TEXTURE_BESPOKE_ };')();
  const body = src.slice(src.indexOf('function runHouseholdEngine_('));
  const poolTexts = strings(body.slice(body.indexOf('  var baseHousehold'), body.indexOf('  var ailmentPool'))).concat(flat(H.T), flat(H.B));
  checkList('household', 'Household', H.byText, poolTexts, H.tag);
  assert('"heard an ambulance pass in the night" is composure down; "felt slight tension among household members" family down (each was family +5)',
    H.tag('heard an ambulance pass in the night').tag === 'Household-Composure-Down-S' && H.tag('felt slight tension among household members').tag === 'Household-Family-Down-S' &&
    JSON.stringify(M.nudgesForEvent_('Household', 1, '')) === '{"family":5}');

  const HEADERS = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'MaritalStatus', 'NumChildren', 'Status'];
  const events = []; let dropped = 0; const bySrc = {};
  for (let i = 0; i < 20000; i++) {
    rngImpl = mulberry32(i + 11);
    const ctx = { now: new Date(0), config: {}, ledger: { headers: HEADERS.slice(), rows: [['POP-H' + i, 'T', 'H', 3, 'ENGINE', 'n', 'n', 'n', '', '', 'Temescal', i % 2 ? 'married' : '', i % 3 ? 0 : 2, 'active']], dirty: false },
      summary: { absoluteCycle: 100, economicMood: i % 4 === 0 ? 30 : 50, season: ['Winter', 'Spring', 'Summer', 'Fall'][i % 4], isFirstFriday: i % 5 === 0, isCreationDay: i % 11 === 0,
        holiday: i % 7 === 0 ? 'Thanksgiving' : 'none', worldEvents: i % 2 ? [{ domain: 'CIVIC' }] : [], cityDynamics: { sentiment: 0, culturalActivity: 1.5, communityEngagement: 1.4 } } };
    H.run(ctx);
    for (const ev of (ctx.summary.householdEvents || [])) events.push(ev);
    if (ctx.summary.engine299) { dropped += ctx.summary.engine299.noDial; for (const k in ctx.summary.engine299.noDialBySource) bySrc[k] = (bySrc[k] || 0) + ctx.summary.engine299.noDialBySource[k]; }
  }
  const bare = events.filter((e) => /^Household(-FirstFriday|-CreationDay|-Holiday)?$/.test(e.tag));
  assert(`the engine writes no bare or calendar-suffixed home line (${events.length} lines)`, events.length > 200 && bare.length === 0, JSON.stringify(bare.slice(0, 3)));
  const home = events.filter((e) => /^Household-/.test(e.tag) && !/GameNight/.test(e.tag));
  const wrong = home.filter((e) => H.tag(e.event).tag !== e.tag);
  assert(`every written home line carries the tag its sentence is listed under (${home.length})`, home.length > 200 && wrong.length === 0, JSON.stringify(wrong.slice(0, 3)));
  assert('the ailment and recovery lines are untouched', events.some((e) => e.tag === 'Health') && events.some((e) => e.tag === 'Recovering'));
  const dials = {}; home.forEach((e) => { const g = M.gradedParts_(e.tag); dials[g.dial + (g.up ? '+' : '-')] = (dials[g.dial + (g.up ? '+' : '-')] || 0) + 1; });
  assert('home lines land on more than the family dial, and composure both ways', dials['family+'] > 0 && dials['composure+'] > 0 && dials['composure-'] > 0 && Object.keys(dials).length >= 6, JSON.stringify(dials));
  assert(`a plain line is drawn, counted and not written (${dropped} draws)`, dropped > 50 && bySrc['runHouseholdEngine:Household:plain'] === dropped && !bySrc['runHouseholdEngine:Household:unlisted'] && !events.some((e) => H.byText[e.event] === null), JSON.stringify(bySrc));
}

// ── retired players
console.log('═══ runAsUniversePipeline — a retired player\'s everyday lines');
{
  global.hoodTexturePool_ = (ctx, hood, byLabel, bespoke) => flat(byLabel).concat(flat(bespoke));
  const src = read('phase05-citizens/runAsUniversePipeline.js');
  const P = new Function(src + '\nreturn { run: runAsUniversePipeline_, byText: POSTCAREER_SIGN_BY_TEXT_, tag: postCareerLineTag_, T: POSTCAREER_TEXTURE_BY_CHARACTER_, B: POSTCAREER_TEXTURE_BESPOKE_ };')();
  const body = src.slice(src.indexOf('function runAsUniversePipeline_('));
  const poolTexts = strings(body.slice(body.indexOf('  var sportsAtmosphereNotes'), body.indexOf('  var influencePool')) + body.slice(body.indexOf('  var holidayPools'), body.indexOf('  var postCareerEvents')))
    .concat(flat(P.T), flat(P.B), ['continuing to adjust to post-career life']);
  checkList('post-career', 'PostCareer', P.byText, poolTexts, P.tag);

  const HEADERS = ['POPID', 'First', 'Last', 'UNI (y/n)', 'ClockMode', 'Status', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'Tier'];
  const lines = []; let dropped = 0; const bySrc = {};
  for (let seed = 1; seed <= 120; seed++) {
    rngImpl = mulberry32(seed * 104729);
    const rows = []; for (let i = 0; i < 300; i++) rows.push(['POP-U' + i, 'T', 'U' + i, 'yes', 'ENGINE', 'retired', '', '', 'Temescal', 2]);
    const ctx = { now: new Date(0), config: {}, rng: rngImpl, ss: { getSheetByName: () => null }, ledger: { headers: HEADERS.slice(), rows, dirty: false },
      summary: { season: ['Winter', 'Spring', 'Summer', 'Fall'][seed % 4], holiday: seed % 5 === 0 ? 'Thanksgiving' : 'none', isFirstFriday: seed % 3 === 0, isCreationDay: seed % 7 === 0,
        weather: { type: 'clear', impact: 1 }, cityDynamics: { sentiment: 0, culturalActivity: 1, communityEngagement: 1 }, cycleId: 101, absoluteCycle: 101 } };
    P.run(ctx);
    lifeLines(ctx.ledger.rows, 6).forEach((l) => lines.push(l));
    if (ctx.summary.engine299) { dropped += ctx.summary.engine299.noDial; for (const k in ctx.summary.engine299.noDialBySource) bySrc[k] = (bySrc[k] || 0) + ctx.summary.engine299.noDialBySource[k]; }
  }
  const bare = lines.filter((l) => /^PostCareer(-FirstFriday|-CreationDay|-Holiday|-Sports)?$/.test(l.tag));
  assert(`the engine writes no bare or calendar-suffixed everyday line (${lines.length} lines)`, lines.length > 300 && bare.length === 0, JSON.stringify(bare.slice(0, 3)));
  const everyday = lines.filter((l) => /^PostCareer-[A-Za-z]+-(Up|Down)-S$/.test(l.tag));
  const wrong = everyday.filter((l) => P.tag(l.text).tag !== l.tag);
  assert(`every written everyday line carries the tag its sentence is listed under (${everyday.length})`, everyday.length > 100 && wrong.length === 0, JSON.stringify(wrong.slice(0, 3)));
  const own = lines.filter((l) => /^PostCareer-(Travel|Influence|Community|Fundraiser|Wellness)$/.test(l.tag));
  assert(`the appearance, clinic, fundraiser, getaway and training lines keep their kinds (${own.length})`, own.length > 100 && own.length + everyday.length === lines.length);
  assert(`a plain line is drawn, counted and not written (${dropped} draws)`, dropped > 20 && bySrc['runAsUniversePipeline:PostCareer:plain'] === dropped && !lines.some((l) => P.byText[l.text] === null), JSON.stringify(bySrc));
}

// ── the generic writer, the neighborhood engine's First Friday, the generator's follow-up lines
console.log('═══ the other three');
{
  const g = read('phase04-events/generateGenericCitizenMicroEvent.js');
  assert('generic writer: no kind keeps a bare tag', /var KIND_HAS_DELTAS_ = \{\};/.test(g));
  const pools = /var culturalActivityPool = [^\[]*\[([^\]]*)\][\s\S]*?var communityPool = [^\[]*\[([^\]]*)\]/.exec(g);
  const texts = strings(pools[1] + pools[2]);
  const signOf = (t) => { const m = new RegExp('"' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '": "dial:([a-z]+):(up|down)"').exec(g); return m ? m[1] + ':' + m[2] : null; };
  const signed = texts.filter((t) => signOf(t));
  assert('generic writer: the six culture and community lines each carry a sign (openness for the three culture lines, sociability for the three community lines)',
    texts.length === 6 && signed.length === 6 && texts.slice(0, 3).every((t) => signOf(t) === 'openness:up') && texts.slice(3).every((t) => signOf(t) === 'sociability:up'), JSON.stringify(texts.map(signOf)));
  assert('generic writer: each sign is listed once', texts.every((t) => g.split('"' + t + '": "dial:').length === 2));
  assert('generic writer: a Cultural or Community line folds one step (was +4 / +3 and +4 / +2)',
    JSON.stringify(M.nudgesForEvent_('Cultural-Openness-Up-S', 1, '')) === '{"openness":1}' && JSON.stringify(M.nudgesForEvent_('Community-Sociability-Up-S', 1, '')) === '{"sociability":1}');

  const n = read('phase05-citizens/runNeighborhoodEngine.js');
  const ff = new Function(n.slice(n.indexOf('  var firstFridaySigns = {'), n.indexOf('  var firstFridayEvents = {};')) + '\nreturn firstFridaySigns;')();
  const all = flat(Object.values(ff).map((rows) => rows.map((r) => r[1])));
  const perHood = Object.keys(ff).map((h) => ({ h, up: ff[h].filter((r) => /:up$/.test(r[1])).length, down: ff[h].filter((r) => /:down$/.test(r[1])).length }));
  assert('neighborhood engine: each First Friday line carries its own sign; none is sociability up; each hood has both sides',
    all.length === 16 && all.every((s) => /^dial:(outabout|openness|sociability|composure):(up|down)$/.test(s)) && all.indexOf('dial:sociability:up') < 0 && perHood.every((p) => p.up > 0 && p.down > 0), JSON.stringify(perHood));
  assert('neighborhood engine: the pool takes each line with its own sign', n.indexOf("eventPool.push({ t: firstFridaySigns[neighborhood][ffp][0], d: firstFridaySigns[neighborhood][ffp][1] });") > 0 && n.indexOf("signed_(firstFridayEvents[neighborhood], 'dial:sociability:up')") < 0);

  const c = read('phase05-citizens/generateCitizensEvents.js');
  assert('generator: Continuity is written graded only', /var GRADED_ONLY_KIND_ = \{[^}]*"Continuity": true/.test(c));
  const follow = [...c.matchAll(/makeEntry\("([^"]+)", \["source:continuity", "continuity:(rivalry|alliance|arc)", "dial:([a-z]+):(up|down)"\]/g)];
  assert('generator: the three follow-up lines carry a sign (they were drawn and dropped)', follow.length === 3 && follow.every((m) => DIALS.indexOf(m[3]) >= 0), String(follow.length));
  // a retiree's everyday lines (the coded pool; the tab's retirement rows are scripts/contentTabReads.js)
  assert('generator: a retiree\'s line is written graded only (was a bare PostCareer: family +4, openness +2)', /var GRADED_ONLY_KIND_ = \{[^}]*"PostCareer": true/.test(c) && JSON.stringify(M.nudgesForEvent_('PostCareer', 1, '')) === '{"family":4,"openness":2}');
  const ret = new Function(c.slice(c.indexOf('      var retiredPool = ['), c.indexOf('      for (var rpi = 0;')) + '\nreturn retiredPool;')();
  const retSigns = ret.map((r) => /^dial:([a-z]+):(up|down)$/.exec(r[1]));
  assert('generator: each of the seven retiree lines carries its own sign, five up and two down, the pool at the mass of five',
    ret.length === 7 && retSigns.every((m) => m && DIALS.indexOf(m[1]) >= 0) && retSigns.filter((m) => m[2] === 'down').length === 2 && c.indexOf('5 / retiredPool.length') > 0, JSON.stringify(ret.map((r) => r[1])));
  assert('generator: a retiree line folds one step under PostCareer', ret.every((r, i) => { const m = retSigns[i], fx = M.nudgesForEvent_(M.gradedTag_('PostCareer', m[1], m[2] === 'up', 'S'), 1, r[0]); return Object.keys(fx).length === 1 && Math.abs(fx[m[1]]) === 1; }));
}

// ── what one step a line does in the fold itself (the real foldNewEntries_, stamped Cycles)
console.log('═══ the fold — one step a line, today\'s speed and the ruled speed');
{
  const everyFifth = (tag, tune, gap) => { const c = E.newCitizen_(); c.folded = 0; const es = []; for (let i = 1; i <= 8; i++) es.push({ tag, text: 'x', cycle: i * (gap || 5) }); C.foldNewEntries_(c, es, null, tune, null, 8 * (gap || 5)); return c.base.family; };
  const SEED = { lineScale: 1, directShare: 0 }, MIDDLE = { lineScale: 2, directShare: 0.25 };
  const oldUp = everyFifth('Household', SEED), newUp = everyFifth('Household-Family-Up-S', SEED), weekly = everyFifth('Household-Family-Up-S', SEED, 1);
  const midUp = everyFifth('Household-Family-Up-S', MIDDLE), midDown = everyFifth('Household-Family-Down-S', MIDDLE);
  assert(`a bare Household (+5) every fifth Cycle hardened family at today's speed (50 -> ${oldUp.toFixed(1)}) — the old behaviour, whatever the line said`, oldUp > 53);
  assert(`a one-step home line every fifth Cycle does not (50 -> ${newUp.toFixed(1)}); every Cycle it does (${weekly.toFixed(1)})`, newUp === 50 && weekly > 51);
  assert(`at the ruled speed (lines doubled, a quarter sticks) the same line moves family for good, either way (${midUp.toFixed(1)} up, ${midDown.toFixed(1)} down)`,
    midUp > 52 && midDown < 48 && Math.abs((midUp - 50) + (midDown - 50)) < 1e-9);
}

// ── a reader that matched the bare tag (agy 2026-11-18): the world summary's "Who Lived It"
console.log('═══ readers');
{
  const BWS = require('./buildWorldSummary.js');
  const row = (tag, text) => ({ Cycle: '117', EventTag: tag, POPID: 'POP-00001', Name: 'A B', EventText: text, Neighborhood: 'Temescal' });
  const out = BWS.emitWhoLivedIt([row('Household-Family-Up-S', 'shared quiet time at home with household members'), row('Household-Composure-Down-S', 'heard an ambulance pass in the night'),
    row('Relationship-Sociability-Down-S', 'felt distant from people around them'), row('Health', 'slept badly for a few nights running'), row('Neighborhood-Outabout-Up-S|source:x', 'a composite texture row')], [], 117).join('\n');
  assert('the world summary lists a graded home or social line under its kind', /### Household \(2\)/.test(out) && /### Relationship \(1\)/.test(out) && /### Health \(1\)/.test(out) && !/Neighborhood/.test(out.replace(/\(Temescal\)/g, '')), out.slice(0, 300));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
