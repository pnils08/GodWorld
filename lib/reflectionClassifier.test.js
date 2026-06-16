/**
 * reflectionClassifier.test.js — offline coverage for the citizen-loop classifier.
 *
 * Run: node lib/reflectionClassifier.test.js   (exits 0 pass / 1 fail)
 *
 * NO live API here — deterministic CI. Two guards:
 *   1. extractTag_ behaviour (prose preamble, exact, off-vocab -> null, case).
 *   2. VOCAB drift guard: every presented tag MUST resolve via the EXACT DIAL_MAP branch
 *      in citizenDialMap — NOT the DEFAULT_AMBIENT fallback. A renamed/typo'd tag (e.g.
 *      Promotion -> Promotions) would silently fall through to an ambient nudge, turning a
 *      drive+8 win into noise. This test fails loud the moment that happens.
 * The live Set-B dial-delta gate (14/14) is scripts/_probe_classifier.js, run manually.
 */

const rc = require('./reflectionClassifier');
const dm = require('../utilities/citizenDialMap');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

console.log('Test 1: extractTag_ extraction');
{
  assert('exact tag passes through', rc.extractTag_('Promotion') === 'Promotion');
  assert('prose preamble -> first vocab token',
    rc.extractTag_('Based on the reflection provided, Promotion.') === 'Promotion');
  assert('lowercase model output stays valid', rc.extractTag_('promotion') === 'promotion');
  assert('hyphenated tag extracted', rc.extractTag_('Transgression-Petty') === 'Transgression-Petty');
  assert('off-vocab -> null', rc.extractTag_('Banana split') === null);
  assert('empty -> null', rc.extractTag_('') === null);
  assert('null input -> null', rc.extractTag_(null) === null);
  assert('quoted/punctuated tag extracted', rc.extractTag_('"Divorce".') === 'Divorce');
}

console.log('\nTest 2: VOCAB shape');
{
  const tags = rc.VOCAB.map((v) => v[0]);
  assert('VOCAB non-empty', tags.length >= 30);
  assert('no duplicate tags', new Set(tags.map((t) => t.toLowerCase())).size === tags.length);
  assert('VALID set matches VOCAB size', rc.VALID.size === tags.length);
  assert('every VOCAB row is [tag, gloss]', rc.VOCAB.every((v) => v.length === 2 && v[0] && v[1]));
}

console.log('\nTest 3: VOCAB drift guard — every tag resolves via EXACT DIAL_MAP branch');
{
  const offenders = [];
  for (const [tag] of rc.VOCAB) {
    const norm = dm.baseTag_(tag);
    const exact = !!dm.DIAL_MAP[norm] && dm.STRUCTURAL[norm] !== true;
    if (!exact) offenders.push(tag);
  }
  assert('all VOCAB tags are exact DIAL_MAP keys (no ambient fallthrough)',
    offenders.length === 0, offenders.length ? 'fall through: ' + offenders.join(', ') : '');
}

console.log('\nTest 4: buildPrompt_ presents the closed vocab + tag-only instruction');
{
  const p = rc.buildPrompt_('I got the promotion today.');
  assert('prompt embeds the text', p.includes('I got the promotion today.'));
  assert('prompt lists a sample tag + gloss', p.includes('Promotion — '));
  assert('prompt instructs single/exact tag output', /SINGLE tag/.test(p) && /Output ONLY/.test(p));
}

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
