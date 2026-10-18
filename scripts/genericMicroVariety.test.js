/**
 * genericMicroVariety.test.js — engine.299 Task 13 (SIM_DOCTRINE §1 + review 2026-10-18): the generic micro-event
 * engine has no output cap — every citizen who wins their roll gets a line — and its texts spread across the pool
 * before any repeats (prefer a line no one drew this Cycle; repeat only when every line is taken).
 * Run: node scripts/genericMicroVariety.test.js
 */
const fs = require('fs');
const path = require('path');
const M = require('../utilities/citizenDialMap.js');
let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { console.log(`  ok   ${label}`); passed++; } else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; } }

const src = fs.readFileSync(path.resolve(__dirname, '../phase04-events/generateGenericCitizenMicroEvent.js'), 'utf8');
const stubs = {
  getCitizenDialBands_: () => null, hoodNamesWithScene_: () => [], getNeighborhoodDynamics_: () => null,
  inWorldStamp_: () => 'C112', queueBatchAppendIntent_: () => {}, queueAppendIntent_: () => {}, recordPulse_: () => {},
  nudgesForEvent_: M.nudgesForEvent_, baseTag_: M.baseTag_, Logger: { log() {} }
};
const run = new Function(...Object.keys(stubs), src + '\nreturn generateGenericCitizenMicroEvents_;')(...Object.values(stubs));
const H = ['POPID', 'First', 'Last', 'Tier', 'ClockMode', 'LifeHistory', 'LastUpdated', 'Neighborhood', 'Status'];
const rows = [];
for (let i = 0; i < 400; i++) rows.push(['POP-' + i, 'S', 'C' + i, 3, 'ENGINE', 'x\nx\nx\nx\nx\nx\nx\nx\nx\nx\nx', '', '', 'active']);
const ctx = { ledger: { headers: H, rows, dirty: false }, summary: { cycleId: 112, season: 'Winter', weather: {}, weatherMood: {}, cityDynamics: {} },
  config: { cycleCount: 112 }, rng: (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })(), now: new Date(0) };
run(ctx);
const lines = rows.map(r => String(r[5]).split('\n').filter(l => l.startsWith('C112'))).flat();
const texts = lines.map(l => l.replace(/^C112 — \[[^\]]+\] /, ''));
const distinct = new Set(texts).size;
assert('no output cap: more lines than the old cap of 25', lines.length > 25, String(lines.length));
assert('every written line moves a dial', lines.every(l => Object.keys(M.nudgesForEvent_(/\[([^\]]+)\]/.exec(l)[1], 1)).length > 0));
// spread: the most-repeated text appears at most ceil(lines / distinct) + 1 times (prefer-unused before any repeat)
const counts = {}; texts.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
const maxRep = Math.max(...Object.values(counts));
assert('texts spread across the pool before repeating', maxRep <= Math.ceil(texts.length / distinct) + 1, JSON.stringify({ lines: lines.length, distinct, maxRep }));
console.log(`  (${lines.length} lines, ${distinct} distinct texts, max repeat ${maxRep})`);
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
