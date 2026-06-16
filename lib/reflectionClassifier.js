/* reflectionClassifier — citizen-loop Phase 2 substrate (engine-sheet, S262).
 *
 * PURE text -> tag. Maps a citizen-reflection (or any short life-prose) to exactly
 * ONE tag from the closed DIAL_MAP vocab. Emits the TAG ONLY — it does NOT estimate
 * severity (the caller owns the reflection-discount mult, on the gated applyTaggedEvent_
 * wiring). This file imports NOTHING from the engine (no citizenDialMap, no citizenMemory):
 * the classifier physically cannot touch dials because it never imports the door. That is
 * the write-back gate enforced structurally, not by convention.
 *
 * Determinism: classification is INPUT-SIDE — outside the cycle, same class as media intake.
 * Non-reproducible LLM output here is fine; only the categorical tag (later, gated) reaches
 * the pure tag->delta lookup. No prose ever touches engine state.
 *
 * Model: OpenRouter deepseek/deepseek-chat (gate-validated S262: Set B 14/14 exact, L1 0.00,
 * zero sign-flips, zero off-vocab; the local qwen2.5:3b FAILED — emitted prose, sign-flipped
 * Resisted->Transgression). See plan §"Classifier gate" + §"Classifier contract".
 *
 * Gate harness (live Set-B re-run, dial-delta scored): scripts/_probe_classifier.js imports
 * VOCAB/buildPrompt_/extractTag_/classifyReflection_ FROM THIS FILE — single source, can't drift.
 */
require('/root/GodWorld/lib/env'); // OPENROUTER_API_KEY

const MODEL = process.env.CLASSIFIER_MODEL || 'deepseek/deepseek-chat';
const TEMP = 0;
const MAX_TOKENS = 16;

// ---- the closed vocab presented to the model: canonical tag + one-line gloss.
// Curated from DIAL_MAP (drops space/case duplicates the resolver folds anyway). The TEST
// (reflectionClassifier.test.js) asserts every tag here still resolves in citizenDialMap, so
// this list cannot silently drift out of sync with the engine's dial vocabulary.
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
  ['Personal', 'introspection, a private thought, a quiet personal moment'],
  ['Daily', 'a quiet ordinary day at home'],
  ['Background', 'an unremarkable day, nothing major'],
  ['Sports', 'at or following a game'],
  ['Weather', 'the weather, the season, the light'],
  ['Arrival', 'arriving / new to Oakland, a new start'],
];
const VALID = new Set(VOCAB.map((v) => v[0].toLowerCase()));

function buildPrompt_(text) {
  const list = VOCAB.map((v) => `  ${v[0]} — ${v[1]}`).join('\n');
  return `You are a precise text classifier. Read a person's short reflection or a logged life event, then choose the SINGLE tag from the list below that best captures the dominant event or feeling. Output ONLY the exact tag, nothing else.

TAGS:
${list}

TEXT:
"""${text}"""

The one best tag (exact spelling from the list):`;
}

// Extract the first token that exactly matches a vocab tag (robust to prose preamble).
// Returns a valid tag, or null if nothing in the model's output is in-vocab.
function extractTag_(raw) {
  const toks = String(raw || '').split(/[\s\n.,;:"'`*()]+/).filter(Boolean);
  for (const t of toks) if (VALID.has(t.toLowerCase())) return t;
  return null;
}

// classifyReflection_(text) -> { tag, raw }
//   tag : an in-vocab tag string, or null on off-vocab / API error (caller skips + logs raw
//         as the drift tripwire — gate saw 0/94 off-vocab; any non-null-raw-with-null-tag is signal).
//   raw : the model's verbatim output (or '[err] ...' on failure) — always present, for logging.
async function classifyReflection_(text) {
  let raw;
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://godworld.local',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMP,
        messages: [{ role: 'user', content: buildPrompt_(text) }],
      }),
    });
    const j = await r.json();
    if (j.error) return { tag: null, raw: '[err] ' + (j.error.message || JSON.stringify(j.error)) };
    raw = String(j.choices?.[0]?.message?.content || '').trim();
  } catch (e) {
    return { tag: null, raw: '[err] ' + e.message };
  }
  return { tag: extractTag_(raw), raw };
}

module.exports = {
  MODEL,
  VOCAB,
  VALID,
  buildPrompt_,
  extractTag_,
  classifyReflection_,
};
