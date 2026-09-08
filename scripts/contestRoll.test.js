/**
 * engine.179 (S438) — contests resolved by character. Pure proof: the curve, the
 * clamps, the two-term rule, the bookkeeping, the credential band, and the
 * romantic-triangle helpers. Site behaviour (job slot, heritage stake, civic
 * challenger, triangle tick) is read on the bench via S.contests.
 * Run: node scripts/contestRoll.test.js
 */
const fs = require('fs'), path = require('path');
global.Logger = { log() {} };
const E = require('../utilities/citizenMemory.js');
let passed = 0, failed = 0;
function assert(label, cond, detail) { if (cond) { console.log(`  ok   ${label}`); passed++; } else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; } }
function mulberry32(seed) { return function () { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- the curve
const r0 = () => 0.999;
assert('gap 0 -> p 0.5', E.contestRoll_(null, r0, { a: 0, b: 0 }, { a: 0, b: 0 }, 't').p === 0.5);
assert('gap +2 -> p 0.66', Math.abs(E.contestRoll_(null, r0, { a: 1, b: 1 }, { a: 0, b: 0 }, 't').p - 0.66) < 1e-9);
assert('gap +4 -> clamped 0.8', E.contestRoll_(null, r0, { a: 2, b: 2 }, { a: 0, b: 0 }, 't').p === 0.8);
assert('gap +8 (fully polar) -> 0.8', E.contestRoll_(null, r0, { a: 2, b: 2 }, { a: -2, b: -2 }, 't').p === 0.8);
assert('gap -8 -> 0.2', E.contestRoll_(null, r0, { a: -2, b: -2 }, { a: 2, b: 2 }, 't').p === 0.2);
assert('gap -3 -> 0.26', Math.abs(E.contestRoll_(null, r0, { a: -2, b: 0 }, { a: 1, b: 0 }, 't').p - 0.26) < 1e-9);
assert('out-of-range terms clamp to the band scale', E.contestRoll_(null, r0, { a: 9, b: 0 }, { a: 0, b: 0 }, 't').gap === 2);
assert('exactly two terms enforced', (() => { try { E.contestRoll_(null, r0, { a: 1 }, { a: 0 }, 't'); return false; } catch (e) { return /two terms/.test(e.message); } })());
assert('roll below p wins', E.contestRoll_(null, () => 0.1, { a: 0, b: 0 }, { a: 0, b: 0 }, 't').aWins === true);
assert('roll at/above p loses', E.contestRoll_(null, () => 0.5, { a: 0, b: 0 }, { a: 0, b: 0 }, 't').aWins === false);

// ---- distribution at gap +2: 0.66 ± 0.02 over 10k
{
  const rng = mulberry32(2026); let wins = 0;
  for (let i = 0; i < 10000; i++) if (E.contestRoll_(null, rng, { a: 1, b: 1 }, { a: 0, b: 0 }, 't').aWins) wins++;
  assert('10k rolls at gap +2 land 0.66 ± 0.02', Math.abs(wins / 10000 - 0.66) < 0.02, String(wins / 10000));
}
// ---- the underdog wins ~20% at the floor
{
  const rng = mulberry32(7); let wins = 0;
  for (let i = 0; i < 10000; i++) if (E.contestRoll_(null, rng, { a: -2, b: -2 }, { a: 2, b: 2 }, 't').aWins) wins++;
  assert('fully polar underdog still wins ~20%', Math.abs(wins / 10000 - 0.2) < 0.02, String(wins / 10000));
}
// ---- bookkeeping
{
  const S = {}; const rng = mulberry32(3);
  for (let i = 0; i < 200; i++) E.contestRoll_(S, rng, { a: 1, b: 0 }, { a: 0, b: 0 }, 'job-slot', 'A', 'B');
  for (let i = 0; i < 50; i++) E.contestRoll_(S, rng, { a: 0, b: 0 }, { a: 0, b: 0 }, 'civic', 'A', 'B');
  assert('S.contests counts every contest', S.contests.n === 250 && S.contests.bySite['job-slot'] === 200 && S.contests.bySite.civic === 50);
  assert('S.contests gap distribution kept', S.contests.gaps['1'] === 200 && S.contests.gaps['0'] === 50);
  assert('underdog wins counted only when a gap exists', S.contests.underdogWins > 40 && S.contests.underdogWins < 100, String(S.contests.underdogWins));
}

// ---- credential band
assert('none -> -2', E.credentialBand_('none') === -2);
assert('hs-diploma -> -1', E.credentialBand_('hs-diploma') === -1);
assert('some-college -> 0', E.credentialBand_('some-college') === 0);
assert('associates -> 0', E.credentialBand_('associates') === 0);
assert('bachelors -> +1', E.credentialBand_('bachelors') === 1);
assert("Bachelor's -> +1", E.credentialBand_("Bachelor's") === 1);
assert('masters -> +2', E.credentialBand_('masters') === 2);
assert('doctorate -> +2', E.credentialBand_('Doctorate') === 2);
assert('blank -> 0', E.credentialBand_('') === 0);
assert('unknown -> 0', E.credentialBand_('wizardry') === 0);

// ---- triangle helpers (bondEngine)
{
  const src = fs.readFileSync(path.resolve(__dirname, '../phase05-citizens/bondEngine.js'), 'utf8');
  const B = new Function(src + '\nreturn { romanceRivalOf_, romanceSuitorOf_, romanceTriangleIndex_, BOND_TYPES, BOND_STATUS };')();
  const R = B.BOND_TYPES.ROMANTIC, A = B.BOND_STATUS.ACTIVE;
  const bonds = [
    { citizenA: 'POP-T', citizenB: 'POP-S1', bondType: R, status: A },
    { citizenA: 'POP-S2', citizenB: 'POP-T', bondType: R, status: A },
    { citizenA: 'POP-X', citizenB: 'POP-Y', bondType: R, status: A },
    { citizenA: 'POP-T', citizenB: 'POP-S3', bondType: R, status: 'dormant' },
  ];
  const ctx = {};
  assert('triangle: S1 sees rival S2', B.romanceRivalOf_(ctx, bonds, bonds[0]) === 'POP-S2');
  assert('triangle: S2 sees rival S1', B.romanceRivalOf_(ctx, bonds, bonds[1]) === 'POP-S1');
  assert('triangle: a lone romance has no rival', B.romanceRivalOf_(ctx, bonds, bonds[2]) === null);
  assert('triangle: dormant romance does not count', B.romanceRivalOf_(ctx, bonds, bonds[3]) === null);
  assert('triangle: suitor resolved (T is the target)', B.romanceSuitorOf_(ctx, bonds, bonds[0], 'POP-S2') === 'POP-S1' && B.romanceSuitorOf_(ctx, bonds, bonds[1], 'POP-S1') === 'POP-S2');
  assert('triangle: index cached per ctx', B.romanceTriangleIndex_(ctx, bonds) === ctx._romTriangles);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
