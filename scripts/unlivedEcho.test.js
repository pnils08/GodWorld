/**
 * unlivedEcho.test.js — engine.38 B3 generator-side read (seams Task 9, S283).
 * Drives the FULL generateCitizensEvents_ with a mock ctx (same loader pattern
 * as citizensEventsFame.t3.test.js) and proves:
 *   - seeded unlived register + rhyming LifeHistory tail -> echo line can be
 *     drawn (vague voice, never the stored specifics)
 *   - no rhyme in the tail -> echo NEVER appears (structural, not statistical)
 *   - blank / corrupt / unknown-tag registers -> silent, no throw
 *   - echo routes source:identity (Personal ambient key)
 *
 * Run: node scripts/unlivedEcho.test.js
 */

const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
const M = require('../utilities/citizenDialMap.js');
global.getCitizenDialBands_ = () => null;
global.Utilities = { formatDate: () => 'STAMP' };
global.Session = { getScriptTimeZone: () => 'UTC' };
global.inWorldStamp_ = (ctx) => 'C' + ((ctx && ctx.config && ctx.config.cycleCount) || 0);

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const src = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/generateCitizensEvents.js'), 'utf8');
const generateCitizensEvents_ = new Function(src + '\nreturn generateCitizensEvents_;')();

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const HEADERS = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'LifeHistory', 'LastUpdated',
  'Neighborhood', 'BirthYear', 'Occupation', 'TierRole', 'Type', 'TraitProfile', 'UsageCount', 'MemoryRegisters'];

const RHYMING_TAIL = [
  'C95 — [Work] pulled a double shift and felt it in the shoulders',
  'C96 — [Daily] took the long way home past the yards',
  'C97 — [Promotion] heard talk of an opening upstairs',
].join('\n');
const FLAT_TAIL = [
  'C95 — [Weather] noticed the fog hang late over the flats',
  'C96 — [Daily] took a moment of rest',
  'C97 — [Sports] followed the standings over coffee',
].join('\n');
const CAREER_REG = JSON.stringify({ biases: [], unlived: [{ tag: 'CareerShift', txt: 'turned down the foreman job in Sacramento', cy: 60 }] });

function makeRow(popId, life, memReg) {
  return [popId, 'Test', popId, 3, 'ENGINE', life, '', 'Temescal', 1990, 'teacher', '', '', '', 0, memReg];
}

function makeCtx(rows, rng) {
  return {
    now: new Date(0),
    rng,
    config: {},
    ss: { getSheetByName: () => null },
    summary: { cycleId: 100, season: 'Summer', economicMood: 50 },
    ledger: { headers: HEADERS.slice(), rows, dirty: false }
  };
}

// run N seeded cycles over K citizens; count echo lines + collect emitted text
function runTrials(life, memReg, seeds, citizensPerRun) {
  let echoes = 0, threw = false, leakedSpecifics = 0;
  for (let s = 1; s <= seeds; s++) {
    const rows = [];
    for (let k = 0; k < citizensPerRun; k++) rows.push(makeRow(`POP-T${k}`, life, memReg));
    const ctx = makeCtx(rows, mulberry32(s * 7919));
    try { generateCitizensEvents_(ctx); } catch (e) { threw = true; break; }
    for (const r of ctx.ledger.rows) {
      const emitted = String(r[5] || '').slice(life.length); // new lines only
      if (emitted.indexOf("the job they didn't take") >= 0) echoes++;
      if (emitted.indexOf('Sacramento') >= 0) leakedSpecifics++;
    }
  }
  return { echoes, threw, leakedSpecifics };
}

console.log('═══ Rhyme -> echo (end-to-end)');
{
  const r = runTrials(RHYMING_TAIL, CAREER_REG, 40, 25); // 1000 citizen-cycles
  assert('rhyming tail + CareerShift register -> echo line drawn', !r.threw && r.echoes > 0, `echoes=${r.echoes}`);
  assert('stored specifics NEVER leak into the echo (vague-voice rule)', r.leakedSpecifics === 0);
  console.log(`       (${r.echoes} echoes / 1000 citizen-cycles — rare by design: 0.3 gate × pool dilution)`);
}

console.log('═══ No rhyme -> structural silence');
{
  const r = runTrials(FLAT_TAIL, CAREER_REG, 40, 25);
  assert('flat tail (Weather/Daily/Sports) -> echo never appears', !r.threw && r.echoes === 0, `echoes=${r.echoes}`);
}

console.log('═══ Register edge cases');
{
  let r = runTrials(RHYMING_TAIL, '', 10, 10);
  assert('blank register -> silent', !r.threw && r.echoes === 0);
  r = runTrials(RHYMING_TAIL, '{corrupt!!', 10, 10);
  assert('corrupt register JSON -> silent, no throw', !r.threw && r.echoes === 0);
  r = runTrials(RHYMING_TAIL, JSON.stringify({ biases: [], unlived: [{ tag: 'Wedding', txt: 'x', cy: 60 }] }), 10, 10);
  assert('non-branch unlived tag -> silent (whitelist only)', !r.threw && r.echoes === 0);
  r = runTrials(RHYMING_TAIL, JSON.stringify({ biases: [], unlived: [] }), 10, 10);
  assert('empty unlived array -> silent', !r.threw && r.echoes === 0);
}

console.log('═══ Routing');
{
  // find one echo emission and check its LifeHistory primary tag is Personal
  let tagged = null;
  for (let s = 1; s <= 200 && !tagged; s++) {
    const rows = [makeRow('POP-T0', RHYMING_TAIL, CAREER_REG)];
    const ctx = makeCtx(rows, mulberry32(s * 104729));
    generateCitizensEvents_(ctx);
    const emitted = String(ctx.ledger.rows[0][5] || '').slice(RHYMING_TAIL.length);
    const line = emitted.split('\n').find((l) => l.indexOf("the job they didn't take") >= 0);
    if (line) tagged = line;
  }
  assert('echo line routes [Personal] (source:identity ambient key)',
    tagged !== null && tagged.indexOf('[Personal]') >= 0, tagged || 'no echo in 200 single-citizen seeds');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
