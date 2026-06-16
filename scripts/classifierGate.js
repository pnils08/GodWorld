#!/usr/bin/env node
/* classifierGate — committed live gate for the citizen-loop reflection classifier (engine-sheet, S262).
 *
 * Exercises the PRODUCTION classify path (lib/reflectionClassifier.js, imported — NOT a copy, so a
 * green run actually certifies what ships) against the 14 hand-labeled high-magnitude reflections —
 * the dangerous cases the categorical bridge cannot tolerate getting wrong (Promotion/Divorce/Birth/
 * Critical/Setback/Transgression/Resisted/Recovery...). Scored in DIAL-DELTA space, not tag-string
 * match (advisor S262): a mislabel only matters if it moves the WRONG dial. Personal<->Daily is
 * harmless; Divorce(family-8) read as Arrival(openness+3) is the real failure.
 *
 * GATE (the S262 bar DeepSeek V3 cleared): 14/14 exact, zero sign-flips, zero missed-big-shifts,
 * zero off-vocab. Exits 0 pass / 1 fail. Run: node scripts/classifierGate.js  (needs OPENROUTER_API_KEY)
 *
 * NOTE: live LLM call — costs cents, NOT in CI. The offline deterministic guard is
 * lib/reflectionClassifier.test.js (extraction + VOCAB drift). This is the manual go/no-go.
 * Provenance: dial-delta metric + the SYNTH set originate in research-build's scripts/_probe_classifier.js
 * (the frozen validation artifact); this committed harness re-homes the gate onto production code.
 */
const rc = require('/root/GodWorld/lib/reflectionClassifier');
const dm = require('/root/GodWorld/utilities/citizenDialMap'); // SCORING ONLY (harness-side, never production)

const DIALS = ['drive', 'sociability', 'warmth', 'openness', 'composure', 'integrity', 'family', 'outabout'];

// the dangerous cases — high-magnitude reflections, hand-labeled with the truth tag.
const SYNTH = [
  ['Promotion', "They finally gave me the lead role at the firm today. Years of grinding and it's mine. I can barely sit still."],
  ['Divorce', "We signed the papers. After eleven years it's done. The house feels enormous and empty tonight."],
  ['Birth', "Our daughter arrived this morning. I held her and forgot every other thing I've ever worried about."],
  ['Wedding', "Married Elena under the oak by the lake. Everyone I love in one place. I keep grinning like a fool."],
  ['Critical', "The doctor said the word serious and the room went quiet. I'm scared in a way I don't have language for."],
  ['Setback', "Lost the contract I'd staked the whole year on. I don't know how I tell the crew in the morning."],
  ['Transgression-Serious', "I took money that wasn't mine from the register. I keep telling myself I'll put it back before anyone notices."],
  ['Resisted', "Had the chance to cut the corner and pocket the difference. I didn't. Walked away clean and I'm glad."],
  ['Recovery', "First real week back on my feet after months laid low. The light looks different when you almost lose it."],
  ['Mentorship', "Spent the whole evening teaching the new kid everything I know. Felt like the most useful I've been in years."],
  ['Relationship', "Met someone at the cafe. We talked until they turned the chairs up and I still didn't want to leave."],
  ['Faith', "Sat in the back pew long after the service ended. Something in me finally settled."],
  ['Graduation', "Walked the stage today. Four years of night classes and my mother crying in the third row."],
  ['Hospitalized', "Three days in the ward now. The ceiling tiles have a pattern I've memorized. They say maybe tomorrow."],
];

const nudges_ = (tag) => (tag ? dm.nudgesForEvent_(tag, 1, '') : {});
function l1_(a, b) { let s = 0; for (const d of DIALS) s += Math.abs((a[d] || 0) - (b[d] || 0)); return s; }
function signFlip_(p, t) {
  for (const d of DIALS) { const a = p[d] || 0, b = t[d] || 0; if (a !== 0 && b !== 0 && Math.sign(a) !== Math.sign(b)) return true; }
  return false;
}
function missedBig_(p, t) {
  for (const d of DIALS) { const b = t[d] || 0, a = p[d] || 0; if (Math.abs(b) >= 6 && (Math.abs(a) < 3 || Math.sign(a) !== Math.sign(b))) return true; }
  return false;
}

(async () => {
  let exact = 0, flips = 0, missed = 0, offvocab = 0, l1sum = 0;
  const misses = [];
  console.log(`# classifierGate  model=${rc.MODEL}  n=${SYNTH.length}\n`);
  for (const [truth, text] of SYNTH) {
    const { tag, raw } = await rc.classifyReflection_(text);
    const valid = tag !== null;
    if (!valid) offvocab++;
    const pn = nudges_(valid ? tag : ''), tn = nudges_(truth);
    const l1 = l1_(pn, tn); l1sum += l1;
    const isExact = valid && dm.baseTag_(tag).toLowerCase() === dm.baseTag_(truth).toLowerCase();
    const sf = signFlip_(pn, tn), mb = missedBig_(pn, tn);
    if (isExact) exact++;
    if (sf) flips++;
    if (mb) missed++;
    const flag = isExact ? 'ok  ' : 'MISS';
    console.log(`  ${flag} truth=${truth.padEnd(22)} pred=${(valid ? tag : '[off:' + raw + ']').padEnd(22)} L1=${l1}${sf ? ' SIGNFLIP' : ''}${mb ? ' MISSEDBIG' : ''}`);
    if (!isExact) misses.push({ truth, pred: valid ? tag : `[off]${raw}`, l1, sf, mb });
  }
  const n = SYNTH.length;
  console.log(`\n  exact:            ${exact}/${n}`);
  console.log(`  mean L1 dial dist: ${(l1sum / n).toFixed(2)}`);
  console.log(`  sign-flips:        ${flips}   <- DANGER`);
  console.log(`  missed big-shift:  ${missed}   <- DANGER`);
  console.log(`  off-vocab:         ${offvocab}`);

  // GATE: the dangerous cases must all map perfectly. Sign-flips / missed-big-shifts are
  // categorical failures even at exact<14 — they're what break a citizen's dials.
  const pass = exact === n && flips === 0 && missed === 0 && offvocab === 0;
  console.log(`\n${pass ? 'GATE GREEN' : 'GATE RED'} — ${pass ? 'classifier certified on production path' : 'DO NOT wire write-back'}`);
  if (!pass && misses.length) console.log('  misses:', JSON.stringify(misses));
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
