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
  assert('high drive -> working themselves thin (engine.182: the top band reads as a cost)', /working themselves thin/.test(disp));
  assert('high warmth -> big-hearted', /big-hearted/.test(disp));
  assert('low family -> family distant', /family distant/.test(disp));
  assert('neutral dials omitted (no sociability phrase)', !/loner|magnetic|private|draws people/.test(disp));
  const flat = cd.disposition(cd.currentDials(JSON.stringify({ base: {} })));
  assert('all-neutral -> even-keeled', flat === 'even-keeled, unremarkable');
  // engine.349 Task 14: the middle counts
  const at = (base) => cd.disposition(cd.currentDials(JSON.stringify({ base })));
  assert('within 4 of 50 still says nothing', at({ drive: 53, warmth: 47 }) === 'even-keeled, unremarkable');
  assert('drive 55 is somewhat ambitious, 45 somewhat unhurried', at({ drive: 55 }) === 'somewhat ambitious' && at({ drive: 45 }) === 'somewhat unhurried');
  assert('the lean stops at the pole: 59 leans, 60 is the pole phrase', at({ warmth: 59 }) === 'somewhat warm' && at({ warmth: 60 }) === 'warm, tender with people');
  assert('poles first, then leans', at({ drive: 95, sociability: 44 }) === "can't switch off, working themselves thin; somewhat private");
  assert('leans: furthest from 50 first, three at most', at({ drive: 54, warmth: 58, family: 43, outabout: 56, openness: 45 }) === 'somewhat warm; somewhat apart from family; somewhat inclined to go out');
  assert('mood counts: base 50 + mood 6 leans', cd.disposition(cd.currentDials(JSON.stringify({ base: {}, mood: { composure: -6 } }))) === 'slightly on edge');
  assert('phraseFor: pole, lean, nothing, not a number', cd.phraseFor('drive', 70) === 'driven, hard to sit still' && cd.phraseFor('drive', 56) === 'somewhat ambitious' && cd.phraseFor('drive', 51) === '' && cd.phraseFor('drive', null) === '');
  assert('every dial has a pole table and two leans', cd.DIALS.every((d) => cd.POLES[d].length === 4 && cd.LEANS[d].length === 2));
  // agy 2026-11-18 §6b: a lean is set into three prompt frames; it must read in each. No article, no verb of its own.
  const leanWords = cd.DIALS.reduce((a, d) => a.concat(cd.LEANS[d]), []);
  assert('no lean starts with an article or carries its own verb', leanWords.every((w) => !/^(a|an|the)\s/i.test(w) && !/\b(leans|will|follows|is|are|keeps|bends|out a)\b/i.test(w)), leanWords.join(' | '));
  assert('a lean opens with a degree word (somewhat / slightly / fairly / only loosely / casually)', leanWords.every((w) => /^(somewhat|slightly|fairly|only loosely|casually)\s/.test(w)), leanWords.join(' | '));
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
