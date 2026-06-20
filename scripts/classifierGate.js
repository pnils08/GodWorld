#!/usr/bin/env node
/* classifierGate — committed live gate for the citizen-loop reflection classifier (engine-sheet).
 *
 * S262: single-tag gate. research.14 (S264): DUAL-TAG. Exercises the PRODUCTION dual-tag path
 * (lib/reflectionClassifier.classifyDualReflection_, imported — NOT a copy) and scores in the
 * PRODUCTION composite-dial space (utilities/citizenDialMap.nudgesForReflection_, the exact
 * composure-as-affect-only composer the cycle write-back will use) — so a green run certifies
 * what ships. A mislabel only matters if it moves the WRONG dial.
 *
 * Composition under test (nudgesForReflection_): EVENT tag -> its NON-composure dials; AFFECT tag
 * -> composure (sole authority) + its own deltas; additive. The bug this gate exists to catch:
 * a resentful promotion must net composure DOWN (single-tag scored it Promotion -> composure UP,
 * hardening a resentful citizen toward 'unshakable'). COMBINED set asserts that sign explicitly.
 *
 * GATE: DANGEROUS event-exact === n, zero sign-flips, zero missed-big, zero hard-off; AFFECT zero
 * sign-flips + zero hard-off; COMBINED every composure-sign assertion holds. Off-vocab is split:
 * hard-null (gated) vs fallback-fired (logged, allowed). Exits 0 pass / 1 fail.
 * Run: node scripts/classifierGate.js  (needs OPENROUTER_API_KEY — live LLM, costs cents, NOT in CI)
 * Offline deterministic guard: lib/reflectionClassifier.test.js (extraction + parse + VOCAB drift).
 */
const rc = require('/root/GodWorld/lib/reflectionClassifier');
const dm = require('/root/GodWorld/utilities/citizenDialMap'); // SCORING ONLY (harness-side, never production)

const DIALS = ['drive', 'sociability', 'warmth', 'openness', 'composure', 'integrity', 'family', 'outabout'];

// DANGEROUS — high-magnitude life events. [eventTruth, affectTruth(null = not asserted), text].
// affectTruth left null: these certify EVENT-tag accuracy + big-dial integrity; composure is the
// AFFECT set's + COMBINED set's job.
const SYNTH = [
  ['Promotion', null, "They finally gave me the lead role at the firm today. Years of grinding and it's mine. I can barely sit still."],
  ['Divorce', null, "We signed the papers. After eleven years it's done. The house feels enormous and empty tonight."],
  ['Birth', null, "Our daughter arrived this morning. I held her and forgot every other thing I've ever worried about."],
  ['Wedding', null, "Married Elena under the oak by the lake. Everyone I love in one place. I keep grinning like a fool."],
  ['Critical', null, "The doctor said the word serious and the room went quiet. I'm scared in a way I don't have language for."],
  ['Setback', null, "Lost the contract I'd staked the whole year on. I don't know how I tell the crew in the morning."],
  ['Transgression-Serious', null, "I took money that wasn't mine from the register. I keep telling myself I'll put it back before anyone notices."],
  ['Resisted', null, "Had the chance to cut the corner and pocket the difference. I didn't. Walked away clean and I'm glad."],
  ['Recovery', null, "First real week back on my feet after months laid low. The light looks different when you almost lose it."],
  ['Mentorship', null, "Spent the whole evening teaching the new kid everything I know. Felt like the most useful I've been in years."],
  ['Relationship', null, "Met someone at the cafe. We talked until they turned the chairs up and I still didn't want to leave."],
  ['Faith', null, "Sat in the back pew long after the service ended. Something in me finally settled."],
  ['Graduation', null, "Walked the stage today. Four years of night classes and my mother crying in the third row."],
  ['Hospitalized', null, "Three days in the ward now. The ceiling tiles have a pattern I've memorized. They say maybe tomorrow."],
];

// AFFECT — ordinary-day subjective reactions (negative-pole mechanism). [eventTruth(null), affectTruth, text].
// Near-synonyms tolerated; the HARD criterion is no composure SIGN-FLIP (a frustrated day read as
// Content is the failure that manufactures the wrong disposition over weeks).
const AFFECT = [
  [null, 'Frustrated', "The bus was late again, the printer jammed twice, and every small thing fought me today. I just want it over."],
  [null, 'Irritable', "Everyone needed something and none of it could wait. I snapped at the kid at the counter and I'm still on edge."],
  [null, 'Anxious', "Can't shake the worry about the rent notice. I keep checking my account like the number's going to change."],
  [null, 'Angry', "He took credit for my work in the meeting and smiled doing it. Hours later and I'm still furious."],
  [null, 'Resentful', "Passed over again. I smile and nod in the hallway but I haven't forgotten, and I won't."],
  [null, 'Excited', "The festival tickets came through for next month. I've been bouncing off the walls telling everyone who'll listen."],
  [null, 'Energized', "Up before the alarm, knocked out the whole list before noon. I feel like I could take on anything today."],
  [null, 'Content', "Nothing special happened and that was exactly right. Tea, the window, the long afternoon light."],
  [null, 'Calm', "The house went quiet after everyone left. I sat with my coffee and felt the whole day finally settle."],
];

// COMBINED — the load-bearing discriminators: event and affect pull composure in DIFFERENT directions.
// [eventTruth, affectTruth, text, expectComposureSign]. The whole point of dual-tag + affect-only.
const COMBINED = [
  ['Promotion', 'Resentful', "They handed me the promotion I've chased for years. More responsibility, same pay. Typical. I said thank you and meant none of it.", -1],
  ['Wedding', 'Frustrated', "It was my own wedding and all I felt was the weight — the bills, both families, the noise. I love her but I'm running on empty and snapped at everyone.", -1],
  ['Promotion', 'Anxious', "Got the team-lead job. Everyone's congratulating me and all I can think is that I'll be found out, that I can't carry it. Didn't sleep.", -1],
  ['Career-Transition', 'Excited', "First day at the new firm. Terrifying and I can't wait — I kept grinning on the train the whole way in.", +1],
];

// PRODUCTION composer — single source, can't drift from what the cycle write-back will apply.
const compose_ = (eventTag, affectTag) => dm.nudgesForReflection_(eventTag || '', affectTag || '', 1, '');
function l1_(a, b) { let s = 0; for (const d of DIALS) s += Math.abs((a[d] || 0) - (b[d] || 0)); return s; }
function signFlip_(p, t) {
  for (const d of DIALS) { const a = p[d] || 0, b = t[d] || 0; if (a !== 0 && b !== 0 && Math.sign(a) !== Math.sign(b)) return true; }
  return false;
}
function missedBig_(p, t) {
  for (const d of DIALS) { const b = t[d] || 0, a = p[d] || 0; if (Math.abs(b) >= 6 && (Math.abs(a) < 3 || Math.sign(a) !== Math.sign(b))) return true; }
  return false;
}

async function runSet_(label, set, { requireEventExact = false } = {}) {
  let eventExact = 0, eventN = 0, affectExact = 0, affectN = 0;
  let flips = 0, missed = 0, hardOff = 0, fallback = 0, l1sum = 0;
  const misses = [];
  console.log(`\n# ${label}  model=${rc.MODEL}  n=${set.length}\n`);
  for (const [eventTruth, affectTruth, text] of set) {
    const pred = await rc.classifyDualReflection_(text);
    const pc = compose_(pred.event, pred.affect);
    const tc = compose_(eventTruth, affectTruth);
    const l1 = l1_(pc, tc); l1sum += l1;

    if (pred.affectFallback) fallback++;
    // hard-off = a truth tag the model failed to recover at all (affect via fallback does NOT count)
    const eventOff = eventTruth && !pred.event;
    const affectOff = affectTruth && !pred.affect; // pred.affect is non-null when fallback fires
    if (eventOff || affectOff) hardOff++;

    let evOk = true, afOk = true;
    if (eventTruth) { eventN++; evOk = !!pred.event && dm.baseTag_(pred.event).toLowerCase() === dm.baseTag_(eventTruth).toLowerCase(); if (evOk) eventExact++; }
    if (affectTruth) { affectN++; afOk = !!pred.affect && dm.baseTag_(pred.affect).toLowerCase() === dm.baseTag_(affectTruth).toLowerCase(); if (afOk) affectExact++; }

    const sf = signFlip_(pc, tc), mb = missedBig_(pc, tc);
    if (sf) flips++;
    if (mb) missed++;

    const flag = (eventOff || affectOff) ? 'OFF ' : (sf ? 'FLIP' : ((evOk && afOk) ? 'ok  ' : 'syn '));
    const predStr = `${pred.event || '-'}|${pred.affect || '-'}${pred.affectFallback ? '*' : ''}`;
    const truthStr = `${eventTruth || '-'}|${affectTruth || '-'}`;
    console.log(`  ${flag} truth=${truthStr.padEnd(26)} pred=${predStr.padEnd(26)} cmpComposure=${(pc.composure || 0)} L1=${l1}${sf ? ' SIGNFLIP' : ''}${mb ? ' MISSEDBIG' : ''}`);
    if (sf || mb || eventOff || affectOff || (eventTruth && !evOk)) misses.push({ truth: truthStr, pred: predStr, raw: pred.raw, l1, sf, mb });
  }
  const exactStr = requireEventExact ? `eventExact ${eventExact}/${eventN}` : `eventExact ${eventExact}/${eventN} affectExact ${affectExact}/${affectN} (informational)`;
  console.log(`\n  ${exactStr}  meanL1 ${(l1sum / set.length).toFixed(2)}  flips ${flips}  missedBig ${missed}  hardOff ${hardOff}  fallbackFired ${fallback}`);
  return { eventExact, eventN, affectExact, affectN, flips, missed, hardOff, fallback, n: set.length, misses };
}

async function runCombined_(set) {
  let badSign = 0, flips = 0, hardOff = 0, fallback = 0;
  const fails = [];
  console.log(`\n# COMBINED — composure-conflict discriminators (event vs affect pull opposite ways)  n=${set.length}\n`);
  for (const [eventTruth, affectTruth, text, wantSign] of set) {
    const pred = await rc.classifyDualReflection_(text);
    const pc = compose_(pred.event, pred.affect);
    const tc = compose_(eventTruth, affectTruth);
    if (pred.affectFallback) fallback++;
    const off = (!pred.event) || (!pred.affect);
    if (off) hardOff++;
    const sf = signFlip_(pc, tc);
    if (sf) flips++;
    const gotSign = Math.sign(pc.composure || 0);
    const signOk = gotSign === wantSign;
    if (!signOk) badSign++;
    const flag = off ? 'OFF ' : (signOk ? 'ok  ' : 'BAD ');
    console.log(`  ${flag} ${eventTruth}|${affectTruth} -> composite composure=${pc.composure || 0} (want ${wantSign > 0 ? '>0' : '<0'})  pred=${pred.event || '-'}|${pred.affect || '-'}${pred.affectFallback ? '*' : ''}`);
    if (!signOk || off) fails.push({ want: wantSign, got: pc.composure || 0, pred: `${pred.event || '-'}|${pred.affect || '-'}`, raw: pred.raw });
  }
  console.log(`\n  composureSign-correct ${set.length - badSign}/${set.length}  flips ${flips}  hardOff ${hardOff}  fallbackFired ${fallback}`);
  return { badSign, flips, hardOff, fallback, n: set.length, fails };
}

(async () => {
  const d = await runSet_('DANGEROUS — high-magnitude life events (event-exact required)', SYNTH, { requireEventExact: true });
  const a = await runSet_('AFFECT — ordinary-day mood (no composure sign-flip; synonyms ok)', AFFECT);
  const c = await runCombined_(COMBINED);

  const dangerOk = d.eventExact === d.eventN && d.flips === 0 && d.missed === 0 && d.hardOff === 0;
  const affectOk = a.flips === 0 && a.hardOff === 0;
  const combinedOk = c.badSign === 0 && c.flips === 0 && c.hardOff === 0;
  const pass = dangerOk && affectOk && combinedOk;

  console.log(`\n  DANGEROUS ${dangerOk ? 'GREEN' : 'RED'}  (eventExact ${d.eventExact}/${d.eventN}, flips ${d.flips}, missedBig ${d.missed}, hardOff ${d.hardOff}, fallback ${d.fallback})`);
  console.log(`  AFFECT    ${affectOk ? 'GREEN' : 'RED'}  (flips ${a.flips}, hardOff ${a.hardOff}; affectExact ${a.affectExact}/${a.affectN} informational, fallback ${a.fallback})`);
  console.log(`  COMBINED  ${combinedOk ? 'GREEN' : 'RED'}  (composureSign ${c.n - c.badSign}/${c.n}, flips ${c.flips}, hardOff ${c.hardOff}, fallback ${c.fallback})`);
  // NOTE: a single GREEN is NOT write-back authorization. DANGEROUS event-exact is a non-deterministic
  // LLM match (re-runs flip), and this gate is tautological on the COMPOSER (compose_ is the production
  // composer on both pred+truth, so it cannot catch a composer bug). Composer-correctness is certified
  // by scripts/citizenReflectionWriteback.test.js (offline). Before WIRING the write-back: require N
  // consecutive GREEN (or certify on the stable sign criteria — COMBINED/AFFECT) AND cite the offline test.
  console.log(`\n${pass ? 'GATE GREEN' : 'GATE RED'} — ${pass ? 'classifier path GREEN this run; re-run + pair with citizenReflectionWriteback.test.js before wiring write-back' : 'DO NOT wire write-back'}`);
  if (!pass) console.log('  misses:', JSON.stringify([...d.misses, ...a.misses, ...c.fails]));
  process.exit(pass ? 0 : 1);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
