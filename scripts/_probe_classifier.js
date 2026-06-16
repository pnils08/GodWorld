#!/usr/bin/env node
/* THROWAWAY reflection->tag classifier probe (S262, research-build).
 * Validation GATE for citizen-loop Phase 2: prove a cheap/local model can map
 * reflection prose -> one tag in the closed DIAL_MAP vocab consistently enough
 * that engine-sheet can wire it to applyTaggedEvent_. NO engine write-back here.
 *
 * Metric = DIAL-DELTA space, not tag-string match (advisor S262): a mislabel
 * only matters if it moves the wrong dial. Personal<->Daily is harmless; a
 * Promotion(drive+8) or Divorce(family-8) read as ambient is the real failure.
 * Reports: L1 dial distance, sign-flip rate, missed-big-shift rate, per-tag
 * recall, off-vocab rate, N=3 consistency.
 *
 * Three sets:
 *   A. real LifeHistory entries (labeled by engine convention), stratified
 *   B. synthetic high-magnitude reflections (hand-labeled — the dangerous cases)
 *   C. real Mags journal paragraphs (unlabeled — face validity on deploy dist)
 *
 * Model: qwen2.5:3b local (free; plan says 3B is fine for LABELING, not voice).
 * Run: node scripts/_probe_classifier.js   (ollama must be up on :11434)
 */
require('/root/GodWorld/lib/env');
const fs = require('fs');
const sheets = require('/root/GodWorld/lib/sheets');
const dm = require('/root/GodWorld/utilities/citizenDialMap.js');

const MODEL = process.env.PROBE_MODEL || 'deepseek/deepseek-chat';  // S262: qwen2.5:3b emits prose not tags -> DeepSeek
const ONLY_SET = (process.env.SET || 'all').toLowerCase();          // 'all' | 'a' | 'b' | 'c'
const TEMP = 0;
const CONSISTENCY_N = 3;
const PER_TAG_CAP = 4;     // real-set: up to N examples per tag (stratify)
const DIALS = ['drive','sociability','warmth','openness','composure','integrity','family','outabout'];

// ---- the closed vocab presented to the model: canonical tags + one-line gloss.
// Curated from DIAL_MAP (drop space/case duplicates the resolver folds anyway).
const VOCAB = [
  ['Career', 'ordinary work effort / a day on the job'],
  ['Career-Transition', 'changing jobs, a new role, starting fresh work'],
  ['Promotion', 'a raise, promotion, big career win'],
  ['Education', 'studying, learning, a course or training'],
  ['Graduation', 'finishing a degree or program'],
  ['Civic', 'civic duty, local government, community organizing'],
  ['Relationship', 'a new romance, a date, growing close to someone'],
  ['Community', 'neighbors, gatherings, helping the community'],
  ['Neighborhood', 'something about the block / local place'],
  ['Reputation', 'standing, trust, how others see you'],
  ['Media', 'press, coverage, being quoted, journalism work'],
  ['Public', 'public recognition, the spotlight, an award'],
  ['Cultural', 'a cultural night out, art, music, festival'],
  ['Mentorship', 'teaching, guiding, mentoring someone'],
  ['Faith', 'church, prayer, spiritual grounding'],
  ['Household', 'home life, chores, moving, the house'],
  ['Wedding', 'getting married'],
  ['Birth', 'a child being born'],
  ['Divorce', 'separation, divorce, a relationship ending'],
  ['Retirement', 'retiring from work'],
  ['Health', 'feeling unwell, a minor health issue'],
  ['Critical', 'a serious diagnosis / grave health crisis'],
  ['Hospitalized', 'being hospitalized'],
  ['Setback', 'a major loss, failure, things falling apart'],
  ['Recovery', 'recovering, healing, getting back on your feet'],
  ['Transgression-Petty', 'a small dishonest act, cutting a minor corner'],
  ['Transgression-Serious', 'theft, a serious betrayal of trust'],
  ['Transgression-Grave', 'a grave crime or moral failure'],
  ['Resisted', 'being tempted to do wrong and choosing not to'],
  ['Mentorship', 'teaching or guiding someone'],
  ['Personal', 'introspection, a private thought, a quiet personal moment'],
  ['Daily', 'a quiet ordinary day at home'],
  ['Background', 'an unremarkable day, nothing major'],
  ['Sports', 'at or following a game'],
  ['Weather', 'the weather, the season, the light'],
  ['Arrival', 'arriving / new to Oakland, a new start'],
];
const VALID = new Set(VOCAB.map(v => v[0].toLowerCase()));

function prompt_(text) {
  const list = VOCAB.map(v => `  ${v[0]} — ${v[1]}`).join('\n');
  return `You are a precise text classifier. Read a person's short reflection or a logged life event, then choose the SINGLE tag from the list below that best captures the dominant event or feeling. Output ONLY the exact tag, nothing else.

TAGS:
${list}

TEXT:
"""${text}"""

The one best tag (exact spelling from the list):`;
}

async function rawClassify_(text) {
  if (MODEL.includes('/')) {  // OpenRouter (DeepSeek etc.)
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
      body: JSON.stringify({ model: MODEL, max_tokens: 16, temperature: TEMP, messages: [{ role: 'user', content: prompt_(text) }] }),
    });
    const j = await r.json();
    if (j.error) return '[err]' + (j.error.message || '');
    return String(j.choices?.[0]?.message?.content || '').trim();
  }
  const r = await fetch('http://localhost:11434/api/generate', {  // ollama (local)
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt: prompt_(text), stream: false, options: { temperature: TEMP, num_predict: 16 } }),
  });
  const j = await r.json();
  return String(j.response || '').trim();
}

// extract the first token that exactly matches a vocab tag (robust to prose preamble)
function extractTag_(raw) {
  const toks = raw.split(/[\s\n.,;:"'`*()]+/).filter(Boolean);
  for (const t of toks) if (VALID.has(t.toLowerCase())) return t;
  return toks[0] || raw;  // fall back to first token -> will count as off-vocab
}
async function classify_(text) { return extractTag_(await rawClassify_(text)); }

// dial-delta comparison: predicted tag vs truth tag, both at mult=1, text empty
function nudges_(tag, text) { return dm.nudgesForEvent_(tag, 1, text || ''); }
function l1_(a, b) {
  let s = 0;
  for (const d of DIALS) s += Math.abs((a[d] || 0) - (b[d] || 0));
  return s;
}
function signFlip_(pred, truth) {
  for (const d of DIALS) {
    const p = pred[d] || 0, t = truth[d] || 0;
    if (p !== 0 && t !== 0 && Math.sign(p) !== Math.sign(t)) return true;
  }
  return false;
}
// truth has a big move (|>=6|) on a dial that pred fails to capture (mag<3 or wrong sign)
function missedBig_(pred, truth) {
  for (const d of DIALS) {
    const t = truth[d] || 0, p = pred[d] || 0;
    if (Math.abs(t) >= 6) {
      if (Math.abs(p) < 3 || Math.sign(p) !== Math.sign(t)) return true;
    }
  }
  return false;
}

// ---------- Set B: synthetic high-magnitude (hand-labeled) ----------
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

async function runSet_(label, items, getText, getTruth) {
  console.log('\n' + '='.repeat(78) + `\n# SET ${label}  (n=${items.length}, model=${MODEL})\n` + '='.repeat(78));
  let l1sum = 0, flips = 0, missed = 0, offvocab = 0, exact = 0, n = 0;
  const perTag = {};   // truth -> {total, recall}
  const confus = [];
  for (const it of items) {
    const text = getText(it);
    const truth = getTruth ? getTruth(it) : null;
    const pred = await classify_(text);
    const valid = VALID.has(pred.toLowerCase());
    n++;
    if (!valid) offvocab++;
    if (truth) {
      perTag[truth] = perTag[truth] || { total: 0, hit: 0 };
      perTag[truth].total++;
      const pn = nudges_(valid ? pred : '', ''), tn = nudges_(truth, '');
      const l1 = l1_(pn, tn);
      l1sum += l1;
      const isExact = dm.baseTag_(pred).toLowerCase() === dm.baseTag_(truth).toLowerCase();
      if (isExact) { exact++; perTag[truth].hit++; }
      const sf = signFlip_(pn, tn), mb = missedBig_(pn, tn);
      if (sf) flips++;
      if (mb) missed++;
      if (!isExact && (l1 >= 6 || sf || mb)) confus.push({ truth, pred: valid ? pred : `[off:${pred}]`, l1, sf, mb, text: text.slice(0, 70) });
    } else {
      // unlabeled (Set C): just show
      console.log(`  ${valid ? pred.padEnd(22) : ('[off:' + pred + ']').padEnd(22)} <- ${text.slice(0, 90).replace(/\n/g, ' ')}`);
    }
  }
  if (getTruth) {
    console.log(`\n  exact-tag:        ${exact}/${n} (${(100*exact/n).toFixed(0)}%)`);
    console.log(`  mean L1 dial dist: ${(l1sum/n).toFixed(2)}   (0 = identical dial effect)`);
    console.log(`  sign-flips:        ${flips}/${n} (${(100*flips/n).toFixed(0)}%)  <- DANGER`);
    console.log(`  missed big-shift:  ${missed}/${n} (${(100*missed/n).toFixed(0)}%)  <- DANGER`);
    console.log(`  off-vocab:         ${offvocab}/${n}`);
    console.log('\n  per-tag recall:');
    Object.entries(perTag).sort().forEach(([t, v]) => console.log(`    ${t.padEnd(24)} ${v.hit}/${v.total}`));
    if (confus.length) {
      console.log('\n  notable misses (exact-miss with real dial divergence):');
      confus.forEach(c => console.log(`    truth=${c.truth} pred=${c.pred} L1=${c.l1}${c.sf?' SIGNFLIP':''}${c.mb?' MISSEDBIG':''}  | ${c.text}`));
    }
  }
  return { exact, n, l1sum, flips, missed, offvocab };
}

async function consistency_(items, getText) {
  console.log('\n' + '='.repeat(78) + `\n# CONSISTENCY  (N=${CONSISTENCY_N} runs/item, temp=${TEMP})\n` + '='.repeat(78));
  let stable = 0;
  for (const it of items) {
    const text = getText(it);
    const seen = {};
    for (let k = 0; k < CONSISTENCY_N; k++) { const p = (await classify_(text)).toLowerCase(); seen[p] = (seen[p]||0)+1; }
    const variants = Object.keys(seen).length;
    if (variants === 1) stable++;
    else console.log(`    UNSTABLE (${variants} variants): ${JSON.stringify(seen)}  | ${text.slice(0,60).replace(/\n/g,' ')}`);
  }
  console.log(`\n  stable items: ${stable}/${items.length}`);
}

(async () => {
  // ---- Set A: real LifeHistory, stratified across available tags ----
  const rows = await sheets.getRawSheetData('Simulation_Ledger');
  const h = rows[0];
  const iLife = h.findIndex(x => String(x).toLowerCase() === 'lifehistory');
  const byTag = {};
  for (let i = 1; i < rows.length; i++) {
    const life = String(rows[i][iLife] || '');
    const lines = life.split('\n').filter(Boolean);
    for (const ln of lines) {
      const m = ln.match(/\[([^\]]+)\]\s*(.+)$/);
      if (!m) continue;
      const tag = m[1].trim(), text = m[2].trim();
      if (dm.STRUCTURAL[dm.baseTag_(tag)] === true) continue;  // skip Compressed/CareerState
      if (text.length < 12) continue;
      byTag[tag] = byTag[tag] || [];
      if (byTag[tag].length < PER_TAG_CAP) byTag[tag].push({ tag, text });
    }
  }
  const realSet = [];
  Object.values(byTag).forEach(arr => arr.forEach(x => realSet.push(x)));
  console.log(`MODEL=${MODEL}  SET=${ONLY_SET}  | Set A pool: ${realSet.length} entries across ${Object.keys(byTag).length} tags`);
  const run = s => ONLY_SET === 'all' || ONLY_SET === s;

  let rA = null, rB = null;
  if (run('a')) rA = await runSet_('A — real LifeHistory (engine-labeled)', realSet, it => it.text, it => it.tag);
  if (run('b')) rB = await runSet_('B — synthetic high-magnitude (hand-labeled, the dangerous cases)', SYNTH, it => it[1], it => it[0]);

  if (run('c')) {
    let jp = [];
    try {
      const jr = fs.readFileSync('/root/GodWorld/docs/mags-corliss/JOURNAL_RECENT.md', 'utf8');
      jp = jr.split(/\n\s*\n/).map(s => s.trim())
        .filter(s => s.length > 120 && s.length < 700 && !s.startsWith('#') && !s.startsWith('---') && !s.startsWith('—'))
        .slice(0, 8);
    } catch (e) {}
    await runSet_('C — real Mags reflections (face validity, no ground truth)', jp, s => s, null);
  }

  if (ONLY_SET === 'all') await consistency_(SYNTH.concat(realSet.slice(0, 10)), it => Array.isArray(it) ? it[1] : it.text);

  console.log('\n' + '#'.repeat(78));
  if (rA) console.log(`SUMMARY  Set A exact ${rA.exact}/${rA.n} L1 ${(rA.l1sum/rA.n).toFixed(2)} flips ${rA.flips} missedBig ${rA.missed}`);
  if (rB) console.log(`         Set B exact ${rB.exact}/${rB.n} L1 ${(rB.l1sum/rB.n).toFixed(2)} flips ${rB.flips} missedBig ${rB.missed}  <- the gate`);
  console.log('#'.repeat(78));
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
