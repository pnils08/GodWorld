/**
 * citizenDials.test.js — offline coverage for the dial-read + disposition logic.
 * Run: node lib/citizenDials.test.js   (exits 0 pass / 1 fail)
 */
const cd = require('./citizenDials');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: currentDials parse');
{
  const j = JSON.stringify({ base: { drive: 90, family: 20 }, mood: { drive: 5, composure: -8 } });
  const cur = cd.currentDials(j);
  assert('base+mood applied (drive 90+5=95)', cur.drive === 95);
  assert('missing dial -> 50 neutral', cur.sociability === 50);
  assert('mood-only dial (composure 50-8=42)', cur.composure === 42);
  assert('family base 20', cur.family === 20);
  assert('clamps to 100', cd.currentDials(JSON.stringify({ base: { drive: 98 }, mood: { drive: 10 } })).drive === 100);
  assert('clamps to 0', cd.currentDials(JSON.stringify({ base: { drive: 5 }, mood: { drive: -20 } })).drive === 0);
  assert('bad JSON -> null', cd.currentDials('{not json') === null);
  assert('empty -> null', cd.currentDials('') === null);
}

console.log('\nTest 2: disposition phrasing');
{
  const cur = cd.currentDials(JSON.stringify({ base: { drive: 95, warmth: 85, family: 15 } }));
  const disp = cd.disposition(cur);
  assert('high drive -> relentless', /relentless/.test(disp));
  assert('high warmth -> big-hearted', /big-hearted/.test(disp));
  assert('low family -> family distant', /family distant/.test(disp));
  assert('neutral dials omitted (no sociability phrase)', !/loner|magnetic|private|draws people/.test(disp));
  const flat = cd.disposition(cd.currentDials(JSON.stringify({ base: {} })));
  assert('all-neutral -> even-keeled', flat === 'even-keeled, unremarkable');
}

console.log('\nTest 3: deviation + l1 (selection signals)');
{
  const shaped = cd.currentDials(JSON.stringify({ base: { drive: 95, family: 10, warmth: 90 } }));
  const flat = cd.currentDials(JSON.stringify({ base: {} }));
  assert('shaped citizen has high deviation', cd.deviation(shaped) > 60);
  assert('neutral citizen has zero deviation', cd.deviation(flat) === 0);
  assert('l1 distance is symmetric', cd.l1(shaped, flat) === cd.l1(flat, shaped));
  assert('l1 to self is zero', cd.l1(shaped, shaped) === 0);
}

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
