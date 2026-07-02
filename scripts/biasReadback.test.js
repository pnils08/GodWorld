/**
 * biasReadback.test.js — engine.38 B1 read path (seams Task 7, S283).
 * Proves lib/resonanceRecall.biasReadback: an opinion from MemoryRegisters
 * .biases joins the wake prompt ONLY when today's perception mentions the
 * target — name match, no scoring, cap 2, undecided (s==0) silent,
 * corrupt/blank register inert.
 *
 * Run: node scripts/biasReadback.test.js
 */

const R = require('../lib/resonanceRecall.js');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const reg = (biases) => JSON.stringify({ biases, unlived: [] });

// ── match gating ──
console.log('═══ Match gating');
{
  const r = reg([{ t: 'Marcus Webb', s: -2, o: '', r: 0, c: 0, cy: 101 }]);
  assert('mentioned target -> line renders',
    R.biasReadback(r, 'ran into Marcus Webb outside the fund office') !== '');
  assert('case-insensitive match',
    R.biasReadback(r, 'MARCUS WEBB was on the news') !== '');
  assert('unmentioned target -> silent',
    R.biasReadback(r, 'a quiet day at the lake') === '');
  assert('empty perception -> silent', R.biasReadback(r, '') === '');
}

// ── sentiment bands + qualifiers ──
console.log('═══ Sentiment bands + qualifiers');
{
  const hay = 'Marcus Webb again';
  assert('s<=-2 -> never trusted',
    /never trusted Marcus Webb/.test(R.biasReadback(reg([{ t: 'Marcus Webb', s: -2 }]), hay)));
  assert('-2<s<0 -> don\'t much care for',
    /don't much care for Marcus Webb/.test(R.biasReadback(reg([{ t: 'Marcus Webb', s: -0.5 }]), hay)));
  assert('0<s<2 -> soft spot',
    /soft spot for Marcus Webb/.test(R.biasReadback(reg([{ t: 'Marcus Webb', s: 1 }]), hay)));
  assert('s>=2 -> think highly',
    /think highly of Marcus Webb/.test(R.biasReadback(reg([{ t: 'Marcus Webb', s: 3 }]), hay)));
  assert('s==0 undecided -> silent',
    R.biasReadback(reg([{ t: 'Marcus Webb', s: 0 }]), hay) === '');
  assert('challenged (c>=1) carries doubt',
    /less sure/.test(R.biasReadback(reg([{ t: 'Marcus Webb', s: 2, c: 1 }]), hay)));
  assert('reinforced (r>=2) carries certainty',
    /nothing has changed your mind/.test(R.biasReadback(reg([{ t: 'Marcus Webb', s: 2, r: 3 }]), hay)));
  assert('doubt outranks certainty when both',
    /less sure/.test(R.biasReadback(reg([{ t: 'Marcus Webb', s: 2, r: 3, c: 1 }]), hay)));
}

// ── cap + multiple targets ──
console.log('═══ Cap + multiple');
{
  const r = reg([
    { t: 'Marcus Webb', s: -2 }, { t: 'Keisha Ramos', s: 2 }, { t: 'Avery Santana', s: 1 },
  ]);
  const hay = 'Marcus Webb met Keisha Ramos and Avery Santana downtown';
  const out = R.biasReadback(r, hay);
  assert('cap 2: only first two matched biases render',
    /Marcus Webb/.test(out) && /Keisha Ramos/.test(out) && !/Avery Santana/.test(out), out);
  assert('only-mentioned renders when others absent',
    !/Marcus Webb/.test(R.biasReadback(r, 'saw Avery Santana at the pergola')));
}

// ── defensive parse ──
console.log('═══ Defensive parse');
{
  assert('blank register -> silent', R.biasReadback('', 'Marcus Webb') === '');
  assert('corrupt JSON -> silent, no throw', R.biasReadback('{nope!!', 'Marcus Webb') === '');
  assert('missing biases array -> silent', R.biasReadback('{"unlived":[]}', 'Marcus Webb') === '');
  assert('malformed records skipped',
    R.biasReadback(reg([null, {}, { s: 2 }]), 'Marcus Webb') === '');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
