/**
 * engine299Graded.test.js — writer-level proof for engine.299 Task 1 (builder 2026-10-18:
 * "every event that exists must move a dial"). Runs the real generateCitizensEvents_ on a
 * synthetic row and checks what reaches the LifeHistory cell:
 *   - a history bare kind still resolves to {} (never re-valued),
 *   - no NEW written line carries a bare {} kind,
 *   - a line whose fact is negative never comes out Up,
 *   - a line with no signed fact is not written (the skip counter moves).
 * Run: node scripts/engine299Graded.test.js
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

const GRIEF = { griefDurationCycles: 3, griefHolidayDurationCycles: 5, griefParticipationMultiplier: 0.80, griefPublicActivityMultiplier: 0.75, griefSupportMultiplier: 1.25, griefResponseChance: 0 };
function mulberry32(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const HEADERS = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'BirthYear', 'Occupation', 'TierRole', 'Type', 'TraitProfile', 'UsageCount', 'MemoryRegisters', 'Status', 'DialState'];
function ctxFor(seed, sentiment) {
  const row = ['POP-00002', 'Synthetic', 'Citizen', 3, 'ENGINE', '', '', 'Temescal', 1990, 'teacher', '', '', '', 0, '', 'active', C.serializeDialState_(E.newCitizen_())];
  return { now: new Date(0), rng: mulberry32(seed),
    config: { ...GRIEF, cycleCount: 101, gcSurfaceChance: 0.06, hoodFloorSurfaceQuota: 0 },
    ss: { getSheetByName: () => null },
    summary: { cycleId: 101, season: 'Summer', economicMood: 50, cycleActiveCitizens: ['POP-00002'], cityDynamics: { sentiment, culturalActivity: 1, communityEngagement: 1 } },
    ledger: { headers: HEADERS.slice(), rows: [row], dirty: false } };
}
let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { console.log(`  ok   ${label}`); passed++; } else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; } }

// the negative sentiment pool's texts, read from the source so the test follows the pool
const negTexts = [];
genFile.split('\n').forEach((l) => { if (l.indexOf('"sentiment:negative"') >= 0) { const m = /makeEntry\("([^"]+)"/.exec(l); if (m) negTexts.push(m[1]); } });

console.log('═══ engine.299 Task 1 — the writer');
const BARE = ['Civic', 'Civic Perception', 'Neighborhood', 'Team', 'Season', 'Lifestyle', 'Death', 'Background', 'Daily', 'Micro-Event', 'Life Event', 'Life', 'Personal', 'PrevEvening', 'FirstFriday', 'Holiday', 'CreationDay', 'Sports', 'Weather', 'Faith-Drift'];
assert('T1 the 20 history bare kinds still resolve to {} (never re-valued)', BARE.every((k) => Object.keys(M.nudgesForEvent_(k, 1)).length === 0));
assert('T0 the negative sentiment pool was found in the source', negTexts.length >= 2, String(negTexts.length));

let written = 0, bareWritten = [], negUp = [], negSeen = 0, graded = 0, skipped = 0, skippedBySource = {};
for (let seed = 1; seed <= 400; seed++) {
  for (const sentiment of [-0.6, 0.6]) {
    const ctx = ctxFor(seed, sentiment);
    GEN.generateCitizensEvents_(ctx);
    const cell = String(ctx.ledger.rows[0][5] || '');
    if (ctx.summary.engine299) { skipped += ctx.summary.engine299.noDial; for (const k in ctx.summary.engine299.noDialBySource) skippedBySource[k] = (skippedBySource[k] || 0) + ctx.summary.engine299.noDialBySource[k]; }
    cell.split('\n').filter(Boolean).forEach((line) => {
      const m = /^C101 — \[([^\]]+)\] (.*)$/.exec(line); if (!m) return;
      written++;
      const tag = m[1], text = m[2];
      if (Object.keys(M.nudgesForEvent_(tag, 1, text)).length === 0) bareWritten.push(tag);
      if (M.gradedParts_(tag)) graded++;
      if (negTexts.some((t) => text.indexOf(t) >= 0)) { negSeen++; if (!/-Down-/.test(tag)) negUp.push(tag + ' :: ' + text); }
    });
  }
}
assert('T2 lines were written and some are graded', written > 50 && graded > 0, `${written} written, ${graded} graded`);
assert('T3 no new written line carries a tag that moves nothing', bareWritten.length === 0, JSON.stringify(bareWritten.slice(0, 5)));
assert('T4 a negative-sentiment line never comes out Up', negSeen > 0 && negUp.length === 0, `${negSeen} seen; ${JSON.stringify(negUp.slice(0, 3))}`);
assert('T5 every hardcoded pool carries a sign today: nothing skipped across 800 runs', skipped === 0, JSON.stringify(skippedBySource));

// T6: an entry with NO signed fact (a bespoke hood-texture line, as the pool helper hands them in) is not written,
// and the skip is counted by its source. The stub returns one heavy unsigned entry so the draw lands on it often.
global.hoodTexturePool_ = () => [{ text: 'noticed the creative energy shifting on the block', tags: ['source:neighborhood'], weight: 500, template: false }];
let unsignedWritten = 0, skips = 0, bySrc = {};
for (let seed = 1; seed <= 200; seed++) {
  const ctx = ctxFor(seed, 0);
  GEN.generateCitizensEvents_(ctx);
  const cell = String(ctx.ledger.rows[0][5] || '');
  if (cell.indexOf('creative energy shifting') >= 0) unsignedWritten++;
  if (ctx.summary.engine299) { skips += ctx.summary.engine299.noDial; for (const k in ctx.summary.engine299.noDialBySource) bySrc[k] = (bySrc[k] || 0) + ctx.summary.engine299.noDialBySource[k]; }
}
assert('T6 an unsigned entry is never written and the skip is counted by source', unsignedWritten === 0 && skips > 0 && bySrc['source:neighborhood'] > 0, JSON.stringify({ unsignedWritten, skips, bySrc }));
console.log('  T6 skips by source:', JSON.stringify(bySrc));
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
