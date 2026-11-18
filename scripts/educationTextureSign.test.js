/**
 * educationTextureSign.test.js — engine.350 Task 7: Education lines read by what they say.
 * Adults (runEducationEngine.js): every text the loop can draw has an entry in EDUCATION_SIGN_BY_TEXT_
 * (a dial and a direction, or null = a bare mention, not written); a signed line is written as
 * Education-<Dial>-<Up|Down>-S and folds to exactly one step on that dial.
 * Minors (runYouthEngine.js): Education is a bare kind — every school line has a sign in
 * YOUTH_SIGN_BY_TEXT; a line that names a program carries its template's sign.
 * The field settlement (educationCareerEngine.js settleYouthCounts_) counts the kind in either form.
 *
 * Run: node scripts/educationTextureSign.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const M = require('../utilities/citizenDialMap.js');

const R = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// ── adults ──────────────────────────────────────────────────────────────────
const src = R('phase05-citizens/runEducationEngine.js');
const box = {}; vm.createContext(box); vm.runInContext(src, box);
const SIGN = box.EDUCATION_SIGN_BY_TEXT_;
ok(SIGN && typeof box.educationTextureTag_ === 'function', 'table and tag function at file scope');

// 1. every text the loop can draw is listed
const pooled = [];
Object.keys(box.EDUCATION_TEXTURE_BY_CHARACTER_).forEach(k => box.EDUCATION_TEXTURE_BY_CHARACTER_[k].forEach(t => pooled.push(t)));
Object.keys(box.EDUCATION_TEXTURE_BESPOKE_).forEach(k => box.EDUCATION_TEXTURE_BESPOKE_[k].forEach(t => pooled.push(t)));
// the in-function pools: every string literal between the base pool and the final concat
const a = src.indexOf('  var baseEdu = ['), b = src.indexOf('  var basePool = [].concat(');
ok(a > 0 && b > a, 'in-function pools found');
const inFn = (src.slice(a, b).match(/"(?:[^"\\]|\\.)*"/g) || []).map(q => JSON.parse(q))
  .filter(t => !/^(Winter|Spring|Summer|Fall|rain|fog|hot|cold|wind|spring-training|post-season|playoffs|BackToSchool)$/.test(t));
ok(inFn.length >= 35, 'in-function pool texts read: ' + inFn.length);
inFn.concat(pooled).forEach(t => ok(Object.prototype.hasOwnProperty.call(SIGN, t), 'unlisted texture line: ' + t));
// and nothing listed that no pool holds (a stale entry would hide a renamed line)
const all = new Set(inFn.concat(pooled));
Object.keys(SIGN).forEach(t => ok(all.has(t), 'listed but in no pool: ' + t));

// 2. each entry is one dial one way, or plain; the tag folds to exactly one step
let up = 0, down = 0, plain = 0; const byDial = {};
Object.keys(SIGN).forEach(t => {
  const v = SIGN[t], r = box.educationTextureTag_(t);
  if (v === null) { plain++; ok(r.tag === '' && r.why === 'plain', 'plain line writes nothing: ' + t); return; }
  const m = /^dial:([a-z]+):(up|down)$/.exec(v);
  ok(m && M.GRADED_DIALS.indexOf(m[1]) >= 0, 'bad sign for: ' + t);
  const fx = M.nudgesForEvent_(r.tag, 1, t), keys = Object.keys(fx);
  ok(keys.length === 1 && keys[0] === m[1] && fx[m[1]] === (m[2] === 'up' ? 1 : -1), t + ' -> ' + r.tag + ' ' + JSON.stringify(fx));
  ok(M.baseTag_(r.tag) === 'Education', 'kind stays Education: ' + r.tag);
  byDial[m[1]] = byDial[m[1]] || [0, 0]; byDial[m[1]][m[2] === 'up' ? 0 : 1]++;
  if (m[2] === 'up') up++; else down++;
});
ok(box.educationTextureTag_('a line nobody wrote').why === 'unlisted', 'an unlisted text is not written');

// 3. the cases that started this: an uneasy line no longer lifts drive and openness
ok(box.educationTextureTag_('reflected inward due to tense atmosphere').tag === 'Education-Composure-Down-S', 'a tense week reads down');
ok(box.educationTextureTag_('stayed inside and browsed educational media').tag === 'Education-Outabout-Down-S', 'staying in reads down on going out');
ok(box.educationTextureTag_('engaged lightly with educational or informational content').tag === '', 'a bare mention is not a line');
ok(box.educationTextureTag_('took a night class after a shift').tag === 'Education-Drive-Up-S', 'a night class is one step of drive');

// 4. the old bare tags are gone from the texture writer
['"Education-FirstFriday"', '"Education-CreationDay"', '"Education-Holiday"', '"Education-Cultural"', 'var eventTag = "Education";'].forEach(lit => ok(src.indexOf(lit) < 0, 'still in the writer: ' + lit));

// 5. the writer end to end: a signed draw lands one graded line; a plain draw lands nothing and is counted
{
  const H = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'UNI (y/n)', 'MED (y/n)', 'CIV (y/n)', 'BirthYear', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'DialState', 'Status'];
  const mk = (pop) => { const r = H.map(() => ''); r[0] = pop; r[3] = 4; r[4] = 'ENGINE'; r[8] = 2010; r[11] = 'Temescal'; r[13] = 'active'; return r; };
  const run = (pickAt) => {
    const b2 = {
      safeRand_: (ctx) => ctx.rng, simYearOf_: () => 2042, inWorldStamp_: () => 'Y3C13',
      getCitizenDialBands_: () => null, hoodTexturePool_: () => [], Logger: { log() {} }
    };
    vm.createContext(b2); vm.runInContext(src, b2);
    let i = 0; const seq = [0, pickAt];                 // draw 1 passes the chance gate, draw 2 picks the line
    const ctx = { rng: () => (i < seq.length ? seq[i++] : 0.999), now: 'now', config: {}, ss: { getSheetByName() { return null; } },
      summary: { season: 'Summer', absoluteCycle: 117 }, ledger: { headers: H.slice(), rows: [mk('P1')], dirty: false } };
    b2.runEducationEngine_(ctx);
    return ctx;
  };
  // Summer, no weather / chaos / mood: the pool is the 5 base lines + 1 seasonal line (6)
  const signedRun = run(0 / 6 + 0.01);                  // "spent time learning new skills informally"
  const life = String(signedRun.ledger.rows[0][9]);
  ok(life === 'Y3C13 — [Education-Drive-Up-S] spent time learning new skills informally', 'signed draw written graded: ' + life);
  ok(signedRun.ledger.dirty === true && signedRun.summary.educationEvents === 1 && signedRun.summary.eventsGenerated === 1, 'signed draw counted as written');
  ok(!signedRun.summary.engine299, 'a signed draw is not counted as dial-less');
  const plainRun = run(1 / 6 + 0.01);                   // "engaged lightly with educational or informational content"
  ok(String(plainRun.ledger.rows[0][9]) === '' && plainRun.ledger.dirty === false, 'plain draw writes nothing');
  ok(plainRun.summary.educationEvents === 0 && !plainRun.summary.eventsGenerated, 'plain draw is not an event');
  ok(plainRun.summary.engine299.noDialBySource['runEducationEngine:Education:plain'] === 1, 'plain draw counted by source');
}

// ── minors ──────────────────────────────────────────────────────────────────
const ysrc = R('phase05-citizens/runYouthEngine.js');
const Y = new Function(ysrc + '\nreturn { YOUTH_TEXTURE_POOLS, YOUTH_SIGN_BY_TEXT, YOUTH_BARE_KINDS, YOUTH_DIAL_TAG, youthWrittenTag_, recordYouthLifeHistory_, generateYouthEventForCitizen_ };')();
ok(Y.YOUTH_BARE_KINDS.Education === true, 'Education is a bare kind for minors');
ok(Y.YOUTH_DIAL_TAG.achievement === 'Education', 'the recognized-at-a-program line has its own route');

// 6. every line of a bare kind has a sign; each folds one step on one dial
const bareTypes = Object.keys(Y.YOUTH_DIAL_TAG).filter(t => Y.YOUTH_BARE_KINDS[Y.YOUTH_DIAL_TAG[t]]);
let yUp = 0, yDown = 0, school = 0;
Object.keys(Y.YOUTH_TEXTURE_POOLS).forEach(stage => bareTypes.forEach(type => (Y.YOUTH_TEXTURE_POOLS[stage][type] || []).forEach(t => {
  const kind = Y.YOUTH_DIAL_TAG[type], tag = Y.youthWrittenTag_(kind, t);
  ok(tag, 'unsigned ' + type + ' line: ' + t);
  const fx = M.nudgesForEvent_(tag, 1, t), keys = Object.keys(fx);
  ok(keys.length === 1 && Math.abs(fx[keys[0]]) === 1 && M.baseTag_(tag) === kind, t + ' -> ' + tag + ' ' + JSON.stringify(fx));
  if (type === 'academic') { school++; if (fx[keys[0]] > 0) yUp++; else yDown++; }
})));
ok(school === 16 && yDown >= 3, 'school lines signed: ' + school + ', down ' + yDown);
ok(Y.youthWrittenTag_('Education', 'read the syllabus twice and the assigned reading once') === 'Education-Drive-Down-S', 'the minimum reads down');
ok(Y.youthWrittenTag_('Education', 'pulled an all-nighter for the midterm and swore it was the last one') === 'Education-Composure-Down-S', 'an all-nighter reads down');
ok(Y.youthWrittenTag_('Education', 'youth activity') === '', 'a line with no sign is not written');
ok(Y.youthWrittenTag_('Graduation', 'anything') === 'Graduation', 'a real graduation passes through with its own dials');
// every kind the texture draws is bare: a coming-of-age or hard-week line is the youth's own day, never a milestone tag
ok(Y.YOUTH_DIAL_TAG.coming_of_age === 'Personal' && Y.YOUTH_DIAL_TAG.resilience === 'Personal', 'coming of age and a hard week are Personal');
Object.keys(Y.YOUTH_TEXTURE_POOLS).forEach(stage => Object.keys(Y.YOUTH_TEXTURE_POOLS[stage]).forEach(type => ok(Y.YOUTH_BARE_KINDS[Y.YOUTH_DIAL_TAG[type]] === true, 'a drawn type on a fixed kind: ' + type)));
ok(Y.youthWrittenTag_('Community', 'rewrote a text three times before sending it') === 'Community-Composure-Down-S', 'a nervous text is not sociability +4');
ok(Y.youthWrittenTag_('Personal', 'came home for the weekend and noticed the house felt smaller') === 'Personal-Family-Down-S', 'the house felt smaller reads down on family');
ok(Y.youthWrittenTag_('Personal', 'sat for the senior portrait and did not recognize the adult in it') === 'Personal-Composure-Down-S', 'the senior portrait is not a graduation');
let allYouth = 0, allDown = 0;
Object.keys(Y.YOUTH_TEXTURE_POOLS).forEach(stage => Object.keys(Y.YOUTH_TEXTURE_POOLS[stage]).forEach(type => Y.YOUTH_TEXTURE_POOLS[stage][type].forEach(t => { allYouth++; if (/-Down-S$/.test(Y.youthWrittenTag_(Y.YOUTH_DIAL_TAG[type], t))) allDown++; })));
// and nothing in the sign table that no pool holds
const yPooled = new Set([].concat(...Object.values(Y.YOUTH_TEXTURE_POOLS).map(st => [].concat(...Object.values(st)))));
Object.keys(Y.YOUTH_SIGN_BY_TEXT).forEach(t => ok(yPooled.has(t), 'signed but in no youth pool: ' + t));

// 7. program lines: the template's sign is the line's sign (the text is not fixed)
ok(Y.youthWrittenTag_('Education', 'was recognized at Some Program', 'composure:up') === 'Education-Composure-Up-S', 'recognized at a program');
ok(Y.youthWrittenTag_('Team', 'joined the Some Program season', 'sociability:up') === 'Team-Sociability-Up-S', 'joined a season');
ok(Y.youthWrittenTag_('Team', 'joined the Some Program season', 'nonsense') === '', 'a malformed sign writes nothing');
// every template of a bare kind in the source carries a sign field
const templates = ysrc.match(/\{ text: '[^}]*type: '(sports|civic_participation|achievement|arts|community_support)'[^}]*\}/g) || [];
ok(templates.length === 10, 'program templates found: ' + templates.length);
templates.forEach(t => ok(/sign: '[a-z]+:(up|down)'/.test(t), 'program template without a sign: ' + t));
// the event layer: a drawn program template reaches the written line
{
  // rng order in generateYouthEventForCitizen_: type roll, text pick, program gate, program pick, template pick, outcome
  const mkRng = (templateAt) => { const seq = [0, 0, 0, 0, templateAt, 0.9]; let i = 0; return () => (i < seq.length ? seq[i++] : 0.5); };
  const g = {}; g.ACADEMIC_CALENDAR = {};
  const Yg = new Function('ACADEMIC_CALENDAR', ysrc + '\nreturn { generateYouthEventForCitizen_, recordYouthLifeHistory_ };')({});
  const intents = [];
  global.inWorldStamp_ = () => 'Y3C13';
  global.queueAppendIntent_ = (ctx, tab, row) => intents.push({ tab, row });
  const youth = { id: 'K1', name: 'K One', age: 15, neighborhood: 'Temescal', source: 'ledger' };
  const want = ['Team-Sociability-Up-S', 'Team-Drive-Up-S', 'Civic-Warmth-Up-S', 'Education-Composure-Up-S'];
  [0.01, 0.26, 0.51, 0.76].forEach((at, k) => {
    const ev = Yg.generateYouthEventForCitizen_(youth, 1, mkRng(at), { qol: 0.5, isHotspot: false }, { Temescal: ['Test Yard'] });
    ok(ev.program === 'Test Yard' && /Test Yard/.test(ev.description) && ev.sign, 'program template drawn: ' + ev.description);
    const ctx = { summary: { absoluteCycle: 117 }, ledger: { headers: ['POPID', 'LifeHistory', 'LastUpdated'], rows: [['K1', '', '']], dirty: false } };
    Yg.recordYouthLifeHistory_(ctx, [ev]);
    ok(ctx.ledger.rows[0][1] === 'Y3C13 — [' + want[k] + '] ' + ev.description, 'program line written: ' + ctx.ledger.rows[0][1]);
    ok(!ctx.summary.engine299, 'and not counted as dial-less');
  });
  delete global.inWorldStamp_; delete global.queueAppendIntent_;
}

// ── the field settlement counts a school year in either form ────────────────
const E = new Function(R('phase05-citizens/educationCareerEngine.js') + '\nreturn { settleYouthCounts_ };')();
const yc = E.settleYouthCounts_([
  'Y1C1 — [Education] read (good)', 'Y3C13 — [Education-Drive-Up-S] studied', 'Y3C14 — [Education-Composure-Down-S] all-nighter',
  'Y3C13 — [Team-Drive-Up-S] ran', 'Y3C13 — [Civic-Warmth-Up-S] volunteered', 'Y3C13 — [Community] club', 'Y3C13 — [Cultural] drew',
  'Y3C13 — [CivicRole-Up-S] adult line', 'Y3C13 — [Sports] adult leak', 'Y3C13 — [Education-Cultural] an authored row'
].join('\n'));
ok(yc.Education === 3 && yc.Team === 1 && yc.Civic === 1 && yc.Community === 1 && yc.Cultural === 1, 'graded and bare youth lines both count: ' + JSON.stringify(yc));
ok(Object.keys(yc).length === 5, 'nothing else counted: ' + JSON.stringify(yc));

console.log('educationTextureSign.test.js: ' + n + ' assertions passed — adults ' + Object.keys(SIGN).length + ' lines: ' + up + ' up, ' + down + ' down, ' + plain + ' plain; by dial ' + JSON.stringify(byDial) + '; school lines ' + school + ': ' + yUp + ' up, ' + yDown + ' down; all youth lines ' + allYouth + ', down ' + allDown);
