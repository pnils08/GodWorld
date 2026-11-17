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

  // engine.347 Task 4: the ordinary-bad events. Each is an exact DIAL_MAP key (the loop above), and on
  // the reflection path (event tag = its non-composure dials) none of them moves a dial up.
  const BAD = ['Stumble', 'Spat', 'TrustGuarded', 'ConnectionWithdrawn'];
  const inEvent = new Set(rc.EVENT_VOCAB.map((v) => v[0]));
  assert('the four ordinary-bad events are in EVENT_VOCAB', BAD.every((t) => inEvent.has(t)),
    BAD.filter((t) => !inEvent.has(t)).join(','));
  const ups = BAD.filter((t) => Object.values(dm.nudgesForReflection_(t, '', 1, '')).some((v) => v > 0));
  assert('no ordinary-bad event moves a dial up', ups.length === 0, ups.join(','));
  const moves = { Stumble: { drive: -1 }, Spat: { warmth: -1 }, TrustGuarded: { warmth: -1 }, ConnectionWithdrawn: { sociability: -1 } };
  const wrong = BAD.filter((t) => JSON.stringify(dm.nudgesForReflection_(t, '', 1, '')) !== JSON.stringify(moves[t]));
  assert('each ordinary-bad event moves what the cut says it moves', wrong.length === 0, wrong.join(','));
  // an event tag whose only dial is composure moves nothing on this path — never offer one as "bad"
  const inert = BAD.filter((t) => Object.keys(dm.nudgesForReflection_(t, '', 1, '')).length === 0);
  assert('every ordinary-bad event moves a dial down', inert.length === 0, inert.join(','));
  assert('Disappointment (composure-only: inert here) is not offered', !inEvent.has('Disappointment'));
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
  assert('AFFECT_TAGS has the 9 moods + Flat', rc.AFFECT_TAGS.length === 10 && rc.AFFECT_TAGS.filter((t) => t !== 'Flat').length === 9);
  assert('AFFECT_VOCAB rows all in AFFECT_TAGS', rc.AFFECT_VOCAB.every((v) => affectSet.has(v[0].toLowerCase())));
  assert('EVENT_VOCAB excludes all affect tags', rc.EVENT_VOCAB.every((v) => !affectSet.has(v[0].toLowerCase())));
  assert('event + affect vocab partitions full VOCAB', rc.EVENT_VOCAB.length + rc.AFFECT_VOCAB.length === rc.VOCAB.length);
  assert('dual prompt asks for both tags + pipe',
    /EVENT TAGS/.test(rc.buildDualPrompt_('x')) && /AFFECT TAGS/.test(rc.buildDualPrompt_('x')) && /EventTag \| AffectTag/.test(rc.buildDualPrompt_('x')));
}

console.log('\nTest 6b: the flat affect + prompt wording (engine.347 Task 4)');
{
  const dual = rc.buildDualPrompt_('x');
  const triple = rc.buildTriplePrompt_('x', ['an open question']);
  assert('Flat is offered in both affect lists', /\n  Flat — /.test(dual) && /\n  Flat — /.test(triple));
  assert('Flat is an affect tag and an exact DIAL_MAP key that moves nothing',
    rc.AFFECT_TAGS.indexOf('Flat') >= 0 && dm.DIAL_MAP.hasOwnProperty('Flat') && Object.keys(dm.DIAL_MAP.Flat).length === 0);
  assert('Flat is never an event', rc.EVENT_VOCAB.every((v) => v[0] !== 'Flat') && rc.extractEvent_('Flat') === null);
  assert('no prompt calls every text "a reflection on their day"',
    !/reflection on their day/.test(dual) && !/reflection on their day/.test(triple));
  assert('both prompts carry the speaker rule', /SPEAKER'S OWN life/.test(dual) && /SPEAKER'S OWN life/.test(triple));
  // the rule block is one function: the two prompts cannot drift apart
  const block = (p) => p.slice(p.indexOf('1. the EVENT tag'), p.indexOf('AFFECT TAGS:'));
  assert('dual and triple share one rule block', block(dual) === block(triple) && block(dual).length > 200);

  const f = rc.parseDualRaw_('Civic | Flat');
  assert('Civic | Flat -> event Civic, affect Flat', f.event === 'Civic' && f.affect === 'Flat' && f.affectFallback === false);
  const n = rc.parseDualRaw_('Career | Neutral');
  assert('Neutral falls back to Flat (flagged)', n.affect === 'Flat' && n.affectFallback === true);
  const miss = rc.parseDualRaw_('Banana | Splat');
  assert('off-vocab affect is still null (tripwire survives)', miss.affect === null);
  const t = rc.parseTripleRaw_('Stumble | Flat\nTENSION: NONE', 0);
  assert('triple parse carries Flat', t.event === 'Stumble' && t.affect === 'Flat' && t.tension === null);
  // what the fold does with it: event dials only, zero composure — and the snippet's words are not read
  const fx = dm.nudgesForReflection_(t.event, t.affect, 1, 'a snippet with hospital, community and promoted in it');
  assert('a flat row moves the event dials and no composure', fx.drive === -1 && Object.keys(fx).length === 1);
  const none = dm.nudgesForReflection_('Civic', 'Flat', 1, 'a snippet with hospital, community and promoted in it');
  assert('Civic | Flat moves nothing, whatever the snippet says', Object.keys(none).length === 0);
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
