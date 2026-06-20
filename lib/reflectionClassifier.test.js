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

console.log('\nTest 5: affect-tag calibration lock (negative-pole mechanism)');
{
  const NEG = ['Frustrated', 'Irritable', 'Anxious', 'Angry', 'Resentful'];
  const POS = ['Excited', 'Energized', 'Content', 'Calm'];
  const inVocab = new Set(rc.VOCAB.map((v) => v[0]));
  assert('all affect tags present in VOCAB', [...NEG, ...POS].every((t) => inVocab.has(t)));
  assert('negative affect lowers composure',
    NEG.every((t) => (dm.DIAL_MAP[t] || {}).composure < 0),
    NEG.filter((t) => !((dm.DIAL_MAP[t] || {}).composure < 0)).join(','));
  assert('positive affect raises composure',
    POS.every((t) => (dm.DIAL_MAP[t] || {}).composure > 0),
    POS.filter((t) => !((dm.DIAL_MAP[t] || {}).composure > 0)).join(','));
  const maxPos = Math.max(...POS.map((t) => dm.DIAL_MAP[t].composure));
  const maxNegMag = Math.max(...NEG.map((t) => Math.abs(dm.DIAL_MAP[t].composure)));
  assert('negative pole at least as strong as positive (slightly negative-weighted)', maxNegMag >= maxPos);
}

console.log('\nTest 6: dual-tag vocab split');
{
  const affectSet = new Set(rc.AFFECT_TAGS.map((t) => t.toLowerCase()));
  assert('AFFECT_TAGS has the 9 negative-pole moods', rc.AFFECT_TAGS.length === 9);
  assert('AFFECT_VOCAB rows all in AFFECT_TAGS', rc.AFFECT_VOCAB.every((v) => affectSet.has(v[0].toLowerCase())));
  assert('EVENT_VOCAB excludes all affect tags', rc.EVENT_VOCAB.every((v) => !affectSet.has(v[0].toLowerCase())));
  assert('event + affect vocab partitions full VOCAB', rc.EVENT_VOCAB.length + rc.AFFECT_VOCAB.length === rc.VOCAB.length);
  assert('dual prompt asks for both tags + pipe',
    /EVENT TAGS/.test(rc.buildDualPrompt_('x')) && /AFFECT TAGS/.test(rc.buildDualPrompt_('x')) && /EventTag \| AffectTag/.test(rc.buildDualPrompt_('x')));
}

console.log('\nTest 7: parseDualRaw_ (the offline parse of the model line)');
{
  const a = rc.parseDualRaw_('Promotion | Resentful');
  assert('clean dual parse: event', a.event === 'Promotion');
  assert('clean dual parse: affect', a.affect === 'Resentful');
  assert('clean dual parse: no fallback', a.affectFallback === false);
  const b = rc.parseDualRaw_('Wedding | Frustrated');
  assert('second case event', b.event === 'Wedding' && b.affect === 'Frustrated');
  // event word must not be picked up as the affect, and vice-versa
  const c = rc.parseDualRaw_('Background | Calm');
  assert('event side excludes affect words', c.event === 'Background' && c.affect === 'Calm');
  // missing pipe: extract both from whole string
  const d = rc.parseDualRaw_('Promotion Excited');
  assert('no-pipe still recovers event', d.event === 'Promotion');
  assert('no-pipe still recovers affect', d.affect === 'Excited');
  // hard off-vocab -> null affect (the drift tripwire survives)
  const e = rc.parseDualRaw_('Banana | Splat');
  assert('hard off-vocab affect -> null', e.affect === null && e.affectFallback === false);
}

console.log('\nTest 8: off-vocab affect fallback (Restless -> Anxious, must log/flag)');
{
  const r = rc.extractAffect_('Restless');
  assert('Restless maps to Anxious', r.tag === 'Anxious');
  assert('fallback flagged true', r.fallback === true);
  const exact = rc.extractAffect_('Anxious');
  assert('exact affect is not flagged as fallback', exact.tag === 'Anxious' && exact.fallback === false);
  const none = rc.extractAffect_('zxqwv');
  assert('unmapped word -> null (drift tripwire)', none.tag === null && none.fallback === false);
  // every fallback target must itself be a canonical affect tag
  const affectSet = new Set(rc.AFFECT_TAGS);
  assert('all fallback targets are canonical affect tags',
    Object.values(rc.AFFECT_FALLBACK).every((t) => affectSet.has(t)),
    Object.values(rc.AFFECT_FALLBACK).filter((t) => !affectSet.has(t)).join(','));
  // event extractor must reject affect words
  assert('extractEvent_ ignores affect-only token', rc.extractEvent_('Calm') === null);
  assert('extractEvent_ finds event token', rc.extractEvent_('Promotion') === 'Promotion');
}

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} — ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
