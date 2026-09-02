/**
 * citizensEventsFame.t3.test.js — measured verification of the engine.32 T3
 * fame seam in phase05-citizens/generateCitizensEvents.js:
 *   - UsageCount >= 8 joins the public-recognition pool (tag 'Reputation')
 *   - below threshold / blank / missing column -> zero fame lines
 *   - fame makes a citizen slightly MORE eventful (+0.005 pre-cap)
 *   - 'Reputation' resolves to positive integrity+sociability nudges (loop closes)
 *
 * Same loader pattern as conductEngine.test.js / householdEngine.t4.test.js.
 *
 * Run: node scripts/citizensEventsFame.t3.test.js
 */

const fs = require('fs');
const path = require('path');

global.Logger = { log() {} };
const M = require('../utilities/citizenDialMap.js');
const C = require('../utilities/compressLifeHistory.js');
// dial seam: null bands -> base rates, matching live pre-deploy
global.getCitizenDialBands_ = () => null;
global.getGriefConfig_ = C.getGriefConfig_;
global.activeGriefFromRegisters_ = C.activeGriefFromRegisters_;

const GRIEF_CONFIG = {
  griefDurationCycles: 3,
  griefHolidayDurationCycles: 5,
  griefParticipationMultiplier: 0.80,
  griefPublicActivityMultiplier: 0.75,
  griefSupportMultiplier: 1.25,
  griefResponseChance: 0.35
};

global.Utilities = { formatDate: () => 'STAMP' };
global.Session = { getScriptTimeZone: () => 'UTC' };
// inWorldStamp_ lives in phase01 advanceSimulationCalendar.js (not loaded here)
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
  'Neighborhood', 'BirthYear', 'Occupation', 'TierRole', 'Type', 'TraitProfile', 'UsageCount'];

function makeRow(popId, usage) {
  return [popId, 'Test', popId, 3, 'ENGINE', '', '', 'Temescal', 2005, 'teacher', '', '', '', usage];
}

function makeCtx(rows, rng) {
  return {
    now: new Date(0),
    rng,
    config: { ...GRIEF_CONFIG },
    ss: { getSheetByName: () => null }, // lifeLog path guarded
    summary: { cycleId: 100, season: 'Summer', economicMood: 50 },
    ledger: { headers: HEADERS.slice(), rows, dirty: false }
  };
}

// exact pool texts mirrored from the engine (substring markers collide with
// ambient lines — householdEngine.t4 lesson)
const FAME_LINES = [
  "got recognized by a stranger who'd read about them in the Tribune",
  "fielded questions at the corner store about the story they'd appeared in",
  "was greeted by name by someone they'd never met",
  "overheard their own name in a conversation outside the cafe"
];

// run N independent single-citizen cycles; return parsed LifeHistory lines
function trials(n, usage, headersOverride) {
  const lines = [];
  let eventCount = 0;
  for (let i = 0; i < n; i++) {
    const rows = [makeRow('POP-F' + i, usage)];
    const ctx = makeCtx(rows, mulberry32(i + 13));
    if (headersOverride) ctx.ledger.headers = headersOverride;
    generateCitizensEvents_(ctx);
    const life = (rows[0][HEADERS.indexOf('LifeHistory')] || '').toString();
    if (life) {
      for (const ln of life.split('\n')) { lines.push(ln); eventCount++; }
    }
  }
  return { lines, eventCount };
}

const isFameLine = ln => FAME_LINES.some(t => ln.indexOf(t) >= 0);

console.log('═══ engine.144 loop 3 — youth-mode gate (S411)');
{
  function trialsAge(n, birthYear, simYear) {
    let events = 0, skipped = 0;
    for (let i = 0; i < n; i++) {
      const rows = [makeRow('POP-Y' + i, 0)]; rows[0][HEADERS.indexOf('BirthYear')] = birthYear;
      const ctx = makeCtx(rows, mulberry32(i + 7)); if (simYear) ctx.summary.simYear = simYear;
      generateCitizensEvents_(ctx);
      const life = (rows[0][HEADERS.indexOf('LifeHistory')] || '').toString();
      if (life) events += life.split('\n').length;
      skipped += ctx.summary.minorsSkippedTexture || 0;
    }
    return { events, skipped };
  }
  const minor = trialsAge(400, 2030, 2042), teen = trialsAge(400, 2025, 2042), adult = trialsAge(400, 2000, 2042), blank = trialsAge(400, '', 2042), justAdult = trialsAge(400, 2024, 2042);
  assert('Y.1 minor (12) draws zero adult-deck lines', minor.events === 0 && minor.skipped === 400, minor.events + ' lines, skipped ' + minor.skipped);
  assert('Y.2 teen (17) draws zero adult-deck lines', teen.events === 0 && teen.skipped === 400, teen.events + ' lines');
  assert('Y.3 adult still fires', adult.events > 100 && adult.skipped === 0, String(adult.events));
  assert('Y.4 blank BirthYear reads as adult (fail-open, as every other age read)', blank.events > 100 && blank.skipped === 0, String(blank.events));
  assert('Y.5 the 18th birthday opens the decks (2024 at simYear 2042)', justAdult.events > 100 && justAdult.skipped === 0, String(justAdult.events));
  assert('Y.6 age is computed from BirthYear at the writer, not a stored Age', /simYear - birthYear\) < 18/.test(src) && /lifeState\.isMinor/.test(src));
  const H2 = HEADERS.concat(['HouseholdId', 'Status']);
  const mk = (pop, by) => { const r = makeRow(pop, 0).concat(['HH-1', 'active']); r[HEADERS.indexOf('BirthYear')] = by; return r; };
  let kidHH = 0;
  for (let i = 0; i < 300; i++) {
    const rows = [mk('POP-A' + i, 1990), mk('POP-K' + i, 2032)];
    const ctx = makeCtx(rows, mulberry32(i + 99)); ctx.ledger.headers = H2.slice(); ctx.summary.simYear = 2042;
    generateCitizensEvents_(ctx);
    if (/\[Daily\]/.test(String(rows[1][HEADERS.indexOf('LifeHistory')] || ''))) kidHH++;
  }
  assert('Y.7 household shared moment still lands on the kid (family-level)', kidHH > 0, String(kidHH));
}

console.log('═══ T3 Section 1 — fame gate');
{
  const famous = trials(8000, 12);
  const fameLines = famous.lines.filter(isFameLine);
  assert('1.1 famous citizen (UsageCount 12) fires events', famous.eventCount > 100, String(famous.eventCount));
  assert('1.2 famous citizen draws recognition lines', fameLines.length > 0,
    'of ' + famous.eventCount + ' events');
  assert('1.3 recognition lines carry [Reputation] primary tag',
    fameLines.length > 0 && fameLines.every(ln => ln.indexOf('[Reputation]') >= 0),
    JSON.stringify(fameLines.slice(0, 2)));
  assert('1.4 recognition is a minority share of a famous citizen\'s life (<0.5)',
    fameLines.length / famous.eventCount < 0.5, (fameLines.length / famous.eventCount).toFixed(3));

  const normal = trials(8000, 0);
  assert('1.5 UsageCount 0: ZERO recognition lines',
    normal.lines.filter(isFameLine).length === 0,
    JSON.stringify(normal.lines.filter(isFameLine).slice(0, 2)));

  const blank = trials(8000, '');
  assert('1.6 blank UsageCount: ZERO recognition lines',
    blank.lines.filter(isFameLine).length === 0);

  const sub = trials(8000, 5);
  assert('1.7 sub-threshold (UsageCount 5): ZERO recognition lines',
    sub.lines.filter(isFameLine).length === 0);

  // same seeds -> the +0.005 chance bump makes famous a strict superset
  assert('1.8 fame makes a citizen MORE eventful (same seeds)',
    famous.eventCount > normal.eventCount,
    famous.eventCount + ' vs ' + normal.eventCount);
}

console.log('═══ T3 Section 2 — missing-column guard');
{
  const headers = HEADERS.filter(h => h !== 'UsageCount');
  let threw = false, res = null;
  try { res = trials(2000, 12, headers); } catch (e) { threw = true; }
  assert('2.1 engine runs clean when UsageCount column absent', !threw);
  assert('2.2 no recognition lines without the column',
    res && res.lines.filter(isFameLine).length === 0, res && String(res.eventCount));
}

console.log('═══ T3 Section 3 — dial-map loop closure');
{
  const fx = M.nudgesForEvent_('Reputation', 1, '');
  assert('3.1 Reputation -> integrity-positive nudge', fx && fx.integrity > 0, JSON.stringify(fx));
  assert('3.2 Reputation -> sociability-positive nudge', fx && fx.sociability > 0, JSON.stringify(fx));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
