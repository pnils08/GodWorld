/**
 * codedPoolDownSide.test.js — engine.350 Task 7, the down side of the coded pools (builder 2026-11-16:
 * a line moves a dial by what it says, "down as often as up").
 *   1. the pools as written: every domain-moment and First Friday line carries one well-formed sign;
 *      sociability, warmth and openness each have a down side within 40–60 by draw weight; a source keeps
 *      the draw mass it had; no line asserts the citizen's family; no down line trips a content word rule.
 *   2. the writer: the real generateCitizensEvents_ writes each new line under its own dial and direction,
 *      one step; First Friday lines no longer all read sociability up; a QoL line is never written bare.
 * Run: node scripts/codedPoolDownSide.test.js
 */
const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
global.Utilities = { formatDate: () => 'STAMP', getUuid: () => '00000000-test' };
global.Session = { getScriptTimeZone: () => 'UTC' };
global.inWorldStamp_ = (ctx) => 'C' + ((ctx.summary && ctx.summary.cycleId) || 0);

const E = require('../utilities/citizenMemory.js');
const M = require('../utilities/citizenDialMap.js');
global.nudgesForEvent_ = M.nudgesForEvent_;
global.baseTag_ = M.baseTag_;
const C = require('../utilities/compressLifeHistory.js');
global.getGriefConfig_ = C.getGriefConfig_;
global.activeGriefFromRegisters_ = C.activeGriefFromRegisters_;
global.getCitizenDialBands_ = () => null;
global.hoodTexturePool_ = () => [];

const simYearSrc_ = () => { const s = fs.readFileSync(path.resolve(__dirname, '../phase01-config/advanceSimulationCalendar.js'), 'utf8'); return s.match(/function simYearFromCycle_[\s\S]*?\n}\n/)[0] + s.match(/function simYearOf_[\s\S]*?\n}\n/)[0]; };
const genFile = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/generateCitizensEvents.js'), 'utf8');
const genSrc = fs.readFileSync(path.resolve(__dirname, '../utilities/sportsWeekRecord.js'), 'utf8') + simYearSrc_() + genFile;
const GEN = new Function(genSrc + '\nreturn { generateCitizensEvents_: generateCitizensEvents_ };')();

let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { console.log(`  ok   ${label}`); passed++; } else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; } }

// ── the pools, cut out of the source by text and built by the engine's own lines (if a block moves, this fails loudly)
function cut(from, to) { const a = genFile.indexOf(from), b = genFile.indexOf(to, a); if (a < 0 || b <= a) throw new Error('block not found: ' + from); return genFile.slice(a, b); }
const makeEntry = (text, tags, weight) => ({ text, tags, weight });
const dm = new Function('makeEntry', cut('  var DOMAIN_MOMENT_MASS_LINES_ = ', '  var seasonal = [];') + '\nreturn { DOMAIN_MOMENTS: DOMAIN_MOMENTS, baseDaily: baseDaily, MASS: DOMAIN_MOMENT_MASS_LINES_ };')(makeEntry);
const ff = new Function('makeEntry', cut('  var firstFridayLines = [', '  var creationDayTexts = ') + '\nreturn { lines: firstFridayLines, pool: firstFridayPool };')(makeEntry);

const DIALS = M.GRADED_DIALS;
const SIGN = /^dial:([a-z]+):(up|down)$/;
const KIND_BY_SOURCE = { 'source:familyLife': 'Daily', 'source:homeLife': 'Background', 'source:reflection': 'Personal', 'source:identity': 'Personal',
  'source:listening': 'Personal', 'source:curiosity': 'Lifestyle', 'source:communityLife': 'Neighborhood', 'source:groove': 'Micro-Event' };

console.log('═══ engine.350 — the coded pools as written');
{
  const all = dm.baseDaily.concat(ff.pool);
  const bad = all.filter((e) => e.tags.length !== 2 || !SIGN.test(e.tags[1]) || DIALS.indexOf(SIGN.exec(e.tags[1])[1]) < 0);
  assert('every domain-moment and First Friday line carries one well-formed sign on a real dial', all.length > 80 && bad.length === 0, JSON.stringify(bad.slice(0, 3)));
  const form = all.filter((e) => /^[A-Z]/.test(e.text) || /[.!?]$/.test(e.text) || e.text !== e.text.trim());
  assert('every line is a clause: lowercase start, no closing mark', form.length === 0, JSON.stringify(form.map((e) => e.text).slice(0, 3)));
  const seen = {}, dup = [];
  all.forEach((e) => { const k = e.text.toLowerCase(); if (seen[k]) dup.push(e.text); seen[k] = 1; });
  assert('no line is written twice', dup.length === 0, JSON.stringify(dup));

  // a source keeps the draw mass it had: eight lines at 0.9 (the routine pool, five lines, is as it was)
  const mass = {}, n = {};
  dm.baseDaily.forEach((e) => { mass[e.tags[0]] = (mass[e.tags[0]] || 0) + e.weight; n[e.tags[0]] = (n[e.tags[0]] || 0) + 1; });
  const off = Object.keys(mass).filter((k) => Math.abs(mass[k] - 0.9 * Math.min(n[k], dm.MASS)) > 1e-9);
  assert('each source draws as it did: 0.9 x min(lines, 8)', Object.keys(mass).length === 8 && off.length === 0, JSON.stringify(mass));
  assert('the routine pool is untouched: five lines at 0.9', n['source:groove'] === 5 && dm.baseDaily.filter((e) => e.tags[0] === 'source:groove').every((e) => e.weight === 0.9));
  const ffMass = ff.pool.reduce((a, e) => a + e.weight, 0);
  assert('First Friday keeps the mass of its six lines at 1.2', Math.abs(ffMass - 7.2) < 1e-9, String(ffMass));

  // the down side, by draw weight
  const w = {}; DIALS.forEach((d) => w[d] = { up: 0, down: 0, nUp: 0, nDown: 0 });
  dm.baseDaily.forEach((e) => { const m = SIGN.exec(e.tags[1]); w[m[1]][m[2]] += e.weight; w[m[1]][m[2] === 'up' ? 'nUp' : 'nDown']++; });
  ['sociability', 'warmth', 'openness'].forEach((d) => {
    const share = w[d].up / (w[d].up + w[d].down);
    assert(`${d}: the domain moments push up ${Math.round(100 * share)}% by draw weight (${w[d].nUp} lines up, ${w[d].nDown} down) — inside 40–60`, share >= 0.4 && share <= 0.6);
  });
  assert('drive has a down side in the domain moments', w.drive.nDown >= 2 && w.drive.nUp >= 2, JSON.stringify(w.drive));
  const compShare = w.composure.up / (w.composure.up + w.composure.down);
  assert(`composure keeps its lines (${w.composure.nUp} up, ${w.composure.nDown} down) and its balance`, w.composure.nUp === 9 && w.composure.nDown === 10 && compShare >= 0.4 && compShare <= 0.6, JSON.stringify(w.composure));
  const ffSign = {}; ff.lines.forEach((l) => { ffSign[l[1]] = (ffSign[l[1]] || 0) + 1; });
  assert('First Friday reads by what each line says: sociability 2 up / 1 down, openness 3 / 1, out-and-about 2 up',
    ff.lines.length === 9 && ffSign['dial:sociability:up'] === 2 && ffSign['dial:sociability:down'] === 1 && ffSign['dial:openness:up'] === 3 && ffSign['dial:openness:down'] === 1 &&
    ffSign['dial:outabout:up'] === 2 && !ffSign['dial:outabout:down'], JSON.stringify(ffSign));
  // the pool reaches every adult in every hood and its draw rides out-and-about (agy 2026-11-18): no line about
  // staying in or about living near the galleries
  const ffHome = ff.lines.filter((l) => /stayed in|stayed home|shut the window|blocks? (off|away)|from (the|their) (window|porch)/i.test(l[0]));
  assert('no First Friday line is a night stayed in or a home near the galleries', ffHome.length === 0, JSON.stringify(ffHome));

  // canon guard (S280): a line never asserts the citizen's own family
  const FAMILY = /\b(their|his|her|my)\s+(late\s+)?(spouse|wife|husband|partner|son|daughter|child|children|kid|kids|sister|brother|mother|father|mom|dad)\b/i;
  const fam = all.filter((e) => FAMILY.test(e.text));
  assert('no line gives the citizen a spouse, child, sibling or parent of their own (possessive forms; a stranger\'s kid is not one)', fam.length === 0, JSON.stringify(fam.map((e) => e.text)));
  // a down line carries no word a heavy content rule reads (hospital, promotion, business, wedding, a move, a hiring).
  // The last rule (relative / friend / neighbor / community / gathering) is the one these lines are about; it
  // reads only a line with no kind of its own, and these are written graded.
  const NEIGHBORLY = JSON.stringify({ sociability: 3, warmth: 2 });
  const loaded = all.filter((e) => { const fx = JSON.stringify(M.nudgesForEvent_('Untagged', 1, e.text)); return /:down$/.test(e.tags[1]) && fx !== '{}' && fx !== NEIGHBORLY; });
  assert('no down line carries a word a heavy content rule reads', loaded.length === 0, JSON.stringify(loaded.map((e) => e.text)));
  // each written tag folds one step on the line's own dial
  const wrong = [];
  dm.baseDaily.forEach((e) => {
    const m = SIGN.exec(e.tags[1]), tag = M.gradedTag_(KIND_BY_SOURCE[e.tags[0]], m[1], m[2] === 'up', 'S'), fx = M.nudgesForEvent_(tag, 1, e.text);
    if (Object.keys(fx).length !== 1 || fx[m[1]] !== (m[2] === 'up' ? 1 : -1)) wrong.push(tag + ' ' + JSON.stringify(fx));
  });
  assert('every domain-moment line folds one step on its own dial, its own way', wrong.length === 0, JSON.stringify(wrong.slice(0, 3)));
  Object.keys(KIND_BY_SOURCE).forEach((src) => {
    if (src !== 'source:familyLife') assert(`${src} still routes to ${KIND_BY_SOURCE[src]}`, genFile.indexOf('has("' + src + '")) return "' + KIND_BY_SOURCE[src] + '"') > 0);
    assert(`bare ${KIND_BY_SOURCE[src]} moves nothing (so the line is written graded)`, Object.keys(M.nudgesForEvent_(KIND_BY_SOURCE[src], 1, '')).length === 0);
  });
}

// ── the writer
const GRIEF = { griefDurationCycles: 3, griefHolidayDurationCycles: 5, griefParticipationMultiplier: 0.80, griefPublicActivityMultiplier: 0.75, griefSupportMultiplier: 1.25, griefResponseChance: 0 };
function mulberry32(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const HEADERS = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'BirthYear', 'Occupation', 'TierRole', 'Type', 'TraitProfile', 'UsageCount', 'MemoryRegisters', 'Status', 'DialState'];
function ctxFor(seed, opts) {
  const o = opts || {};
  const row = ['POP-00002', 'Synthetic', 'Citizen', 3, 'ENGINE', '', '', 'Temescal', 1990, 'teacher', '', '', '', 0, '', 'active', C.serializeDialState_(E.newCitizen_())];
  const summary = { cycleId: 101, season: 'Summer', economicMood: 50, cycleActiveCitizens: ['POP-00002'], isFirstFriday: !!o.firstFriday,
    cityDynamics: { sentiment: 0, culturalActivity: 1, communityEngagement: 1 } };
  if (o.qol != null) summary.crimeMetrics = { context: { city: {}, byHood: { Temescal: { qualityOfLifeIndex: o.qol } } } };
  return { now: new Date(0), rng: mulberry32(seed), config: { ...GRIEF, cycleCount: 101, gcSurfaceChance: 0.06, hoodFloorSurfaceQuota: 0 },
    ss: { getSheetByName: () => null }, summary, ledger: { headers: HEADERS.slice(), rows: [row], dirty: false } };
}
function run(seeds, opts) {
  const lines = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const ctx = ctxFor(seed, opts);
    GEN.generateCitizensEvents_(ctx);
    String(ctx.ledger.rows[0][5] || '').split('\n').filter(Boolean).forEach((l) => { const m = /^C101 — \[([^\]]+)\] (.*)$/.exec(l); if (m) lines.push({ tag: m[1], text: m[2] }); });
  }
  return lines;
}
const findLine = (lines, text) => lines.filter((l) => l.text.indexOf(text) === 0);

console.log('═══ engine.350 — the writer');
{
  const lines = run(3000);
  const bySrcText = {}; dm.baseDaily.forEach((e) => { bySrcText[e.text] = e; });
  const push = {}; ['sociability', 'warmth', 'openness'].forEach((d) => push[d] = { up: 0, down: 0 });
  let seenDown = 0, misTagged = [];
  const downs = dm.baseDaily.filter((e) => /:down$/.test(e.tags[1]));
  const seenText = {};
  lines.forEach((l) => {
    const e = Object.keys(bySrcText).find((t) => l.text.indexOf(t) === 0); if (!e) return;
    const ent = bySrcText[e], m = SIGN.exec(ent.tags[1]);
    const want = M.gradedTag_(KIND_BY_SOURCE[ent.tags[0]], m[1], m[2] === 'up', 'S');
    const wfx = M.nudgesForEvent_(l.tag, 1, l.text);   // the written line itself, as the fold reads it
    if (l.tag !== want || Object.keys(wfx).length !== 1 || wfx[m[1]] !== (m[2] === 'up' ? 1 : -1)) misTagged.push(l.tag + ' ' + JSON.stringify(wfx) + ' :: ' + l.text);
    seenText[e] = 1;
    if (push[m[1]]) push[m[1]][m[2]]++;
    if (m[2] === 'down') seenDown++;
  });
  assert('domain-moment lines are written under their own dial and direction, one step', misTagged.length === 0 && seenDown > 100, `${seenDown} down lines; ${JSON.stringify(misTagged.slice(0, 3))}`);
  const neverDrawn = downs.filter((e) => !seenText[e.text]).map((e) => e.text);
  assert(`every one of the ${downs.length} down lines reaches a life in 3,000 runs`, neverDrawn.length === 0, JSON.stringify(neverDrawn));
  ['sociability', 'warmth', 'openness'].forEach((d) => {
    const share = push[d].up / (push[d].up + push[d].down);
    assert(`${d}: written domain moments ${push[d].up} up / ${push[d].down} down (${Math.round(100 * share)}% up) — inside 40–60`, share >= 0.4 && share <= 0.6);
  });
  assert('no First Friday line outside a First Friday week', lines.filter((l) => /^FirstFriday/.test(l.tag)).length === 0);
}
{
  const lines = run(3000, { firstFriday: true }).filter((l) => /^FirstFriday/.test(l.tag));
  const byTag = {}; lines.forEach((l) => { byTag[l.tag] = (byTag[l.tag] || 0) + 1; });
  const soc = (byTag['FirstFriday-Sociability-Up-S'] || 0) + (byTag['FirstFriday-Sociability-Down-S'] || 0);
  assert('First Friday lines are written, and not all as sociability', lines.length > 100 && soc < lines.length * 0.5, JSON.stringify(byTag));
  assert('a gallery looked at is a night out', findLine(lines, 'checked out First Friday galleries').length > 0 && findLine(lines, 'checked out First Friday galleries').every((l) => l.tag === 'FirstFriday-Outabout-Up-S'));
  assert('an artist found is something new', findLine(lines, 'discovered new local artists').length > 0 && findLine(lines, 'discovered new local artists').every((l) => l.tag === 'FirstFriday-Openness-Up-S'));
  assert('the art walk alone is sociability down', findLine(lines, 'went to the art walk alone').length > 0 && findLine(lines, 'went to the art walk alone').every((l) => l.tag === 'FirstFriday-Sociability-Down-S'));
  const ffWrong = [];
  ff.lines.forEach((l) => {
    const m = SIGN.exec(l[1]), want = M.gradedTag_('FirstFriday', m[1], m[2] === 'up', 'S'), got = findLine(lines, l[0]);
    if (!got.length || !got.every((g) => g.tag === want)) ffWrong.push(l[0] + ' -> ' + (got[0] ? got[0].tag : 'never drawn'));
  });
  assert('each of the nine First Friday lines is drawn and written under its own sign', ffWrong.length === 0, JSON.stringify(ffWrong));
  assert('every First Friday tag folds one step', Object.keys(byTag).every((t) => { const fx = M.nudgesForEvent_(t, 1, ''); const k = Object.keys(fx); return k.length === 1 && Math.abs(fx[k[0]]) === 1; }), JSON.stringify(byTag));
  assert('no bare [FirstFriday] line', !byTag.FirstFriday);
}
{
  // a hood low on quality of life speaks in its cause; the line is written by that, never by a word in it
  const low = run(1500, { qol: 0.2 }), high = run(1500, { qol: 0.8 });
  const q = (ls) => ls.filter((l) => /^QoL/.test(l.tag));
  const bare = q(low).concat(q(high)).filter((l) => l.tag === 'QoL');
  assert('a QoL line is never written bare', q(low).length > 20 && q(high).length > 20 && bare.length === 0, `${q(low).length} low, ${q(high).length} high, bare ${JSON.stringify(bare.slice(0, 2))}`);
  assert('a low hood\'s line reads down, a high hood\'s up', q(low).every((l) => /-Down-S$/.test(l.tag)) && q(high).every((l) => /-Up-S$/.test(l.tag)), JSON.stringify(q(low).concat(q(high)).filter((l) => !/-(Up|Down)-S$/.test(l.tag)).slice(0, 2)));
  const tension = findLine(low, 'felt the neighborhood tension in small interactions');
  assert('"felt the neighborhood tension in small interactions" is composure down (was sociability +3, warmth +2 on the word "neighbor")',
    tension.length > 0 && tension.every((l) => l.tag === 'QoL-Composure-Down-S') && JSON.stringify(M.nudgesForEvent_('QoL', 1, 'felt the neighborhood tension in small interactions')) === '{"sociability":3,"warmth":2}',
    JSON.stringify(tension.slice(0, 2)) + ' ' + JSON.stringify(M.nudgesForEvent_('QoL', 1, 'felt the neighborhood tension in small interactions')));
}

{
  // the cause decides the dial (agy 2026-11-18: the runs above carry no qolParts, so only the mood lines were drawn).
  // A hood low on work and housing: "heard another neighbor was between jobs" is drive down, never the word "neighbor".
  const lines = [];
  for (let seed = 1; seed <= 1500; seed++) {
    const ctx = ctxFor(seed, { qol: 0.2 });
    ctx.summary.crimeMetrics.context.byHood.Temescal.qolParts = { safety: 0.1, work: -0.4, health: 0.05, street: 0.02, housing: -0.3, mood: 0.0 };
    GEN.generateCitizensEvents_(ctx);
    String(ctx.ledger.rows[0][5] || '').split('\n').filter(Boolean).forEach((l) => { const m = /^C101 — \[([^\]]+)\] (.*)$/.exec(l); if (m) lines.push({ tag: m[1], text: m[2] }); });
  }
  const jobs = findLine(lines, 'heard another neighbor was between jobs'), rent = findLine(lines, 'watched a neighbor pack up for somewhere cheaper');
  assert('"heard another neighbor was between jobs" is drive down, one step', jobs.length > 0 && jobs.every((l) => l.tag === 'QoL-Drive-Down-S' && JSON.stringify(M.nudgesForEvent_(l.tag, 1, l.text)) === '{"drive":-1}'), JSON.stringify(jobs.slice(0, 2)));
  assert('"watched a neighbor pack up for somewhere cheaper" is composure down, one step', rent.length > 0 && rent.every((l) => l.tag === 'QoL-Composure-Down-S' && JSON.stringify(M.nudgesForEvent_(l.tag, 1, l.text)) === '{"composure":-1}'), JSON.stringify(rent.slice(0, 2)));
  assert('no bare [QoL] line with the causes in', lines.filter((l) => l.tag === 'QoL').length === 0);
}
{
  // the dial-band path (stubbed off above): with real bands the First Friday draw rides out-and-about, and every
  // line is still written under its own sign
  const bandsFor = (oa) => () => { const mult = {}, current = {}; DIALS.forEach((d) => { mult[d] = 1; current[d] = 50; }); mult.outabout = oa; return { mult, current, bands: {} }; };
  const count = (oa) => { global.getCitizenDialBands_ = bandsFor(oa); const ls = run(2000, { firstFriday: true }); global.getCitizenDialBands_ = () => null; return ls; };
  const hi = count(1.5), lo = count(0.5);
  const ffN = (ls) => ls.filter((l) => /^FirstFriday/.test(l.tag)).length;
  const odd = hi.concat(lo).filter((l) => /^FirstFriday/.test(l.tag) && !/^FirstFriday-(Sociability|Openness|Outabout)-(Up|Down)-S$/.test(l.tag));
  assert(`someone out and about draws First Friday more than a homebody (${ffN(hi)} against ${ffN(lo)} lines), every line graded`, ffN(hi) > ffN(lo) * 1.5 && ffN(lo) > 0 && odd.length === 0, JSON.stringify(odd.slice(0, 2)));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
