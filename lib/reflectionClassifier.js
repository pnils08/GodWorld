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
  ['Frustrated', 'an irritating, friction-filled day where things went wrong'],
  ['Irritable', 'short-tempered, on edge, snapping at small things'],
  ['Anxious', 'worried, on edge, unable to shake a low-grade dread'],
  ['Angry', 'genuine anger at someone, still hot about it'],
  ['Resentful', 'lingering bitterness, passed over, holding a grudge'],
  ['Excited', 'thrilled, buzzing, looking forward to something'],
  ['Energized', 'capable, productive, full of momentum'],
  ['Content', 'quietly satisfied, an ordinary day that felt right'],
  ['Calm', 'settled, peaceful, at ease'],
  ['Personal', 'introspection, a private thought, a quiet personal moment'],
  ['Daily', 'a quiet ordinary day at home'],
  ['Background', 'an unremarkable day, nothing major'],
  ['Sports', 'at or following a game'],
  ['Weather', 'the weather, the season, the light'],
  ['Arrival', 'arriving / new to Oakland, a new start'],
];
const VALID = new Set(VOCAB.map((v) => v[0].toLowerCase()));

// ---- dual-tag split (citizen-loop write-back, research.14): a reflection gets BOTH an EVENT tag
// (the concrete thing) AND an AFFECT tag (the mood). Single-tag dropped the affect when an event
// was present ("event beats mood" — a resentful promotion tagged Promotion, composure went UP).
// The 9 affect tags are the negative-pole mechanism; EVENT_VOCAB is everything else.
const AFFECT_TAGS = ['Frustrated', 'Irritable', 'Anxious', 'Angry', 'Resentful', 'Excited', 'Energized', 'Content', 'Calm'];
const AFFECT_SET = new Set(AFFECT_TAGS.map((t) => t.toLowerCase()));
const AFFECT_VOCAB = VOCAB.filter((v) => AFFECT_SET.has(v[0].toLowerCase()));
const EVENT_VOCAB = VOCAB.filter((v) => !AFFECT_SET.has(v[0].toLowerCase()));
const EVENT_VALID = new Set(EVENT_VOCAB.map((v) => v[0].toLowerCase()));

// Off-vocab affect fallback: near-miss mood words the model emits instead of the canonical 9,
// each with one unambiguous valence. Seeded from the live Travis Golin miss (Restless -> Anxious);
// extend empirically from the fallback-fired log, never speculatively. A word NOT here stays
// off-vocab (affect=null) — that null is the classifier-drift tripwire and must survive.
const AFFECT_FALLBACK = {
  restless: 'Anxious', worried: 'Anxious', nervous: 'Anxious', stressed: 'Anxious', uneasy: 'Anxious', dread: 'Anxious', apprehensive: 'Anxious',
  bitter: 'Resentful', resentment: 'Resentful', slighted: 'Resentful',
  annoyed: 'Irritable', irritated: 'Irritable', cranky: 'Irritable', testy: 'Irritable',
  mad: 'Angry', furious: 'Angry', livid: 'Angry', enraged: 'Angry',
  frustration: 'Frustrated', exhausted: 'Frustrated', drained: 'Frustrated', depleted: 'Frustrated', defeated: 'Frustrated',
  thrilled: 'Excited', ecstatic: 'Excited', elated: 'Excited',
  motivated: 'Energized', productive: 'Energized', driven: 'Energized',
  satisfied: 'Content', happy: 'Content', glad: 'Content', pleased: 'Content',
  peaceful: 'Calm', serene: 'Calm', settled: 'Calm', relaxed: 'Calm', tranquil: 'Calm',
};

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

// ---- dual-tag extraction ----------------------------------------------------------------
// First token in `text` that is an exact EVENT-vocab tag (affect words excluded), else null.
function extractEvent_(text) {
  const toks = String(text || '').split(/[\s\n.,;:"'`*()|]+/).filter(Boolean);
  for (const t of toks) if (EVENT_VALID.has(t.toLowerCase())) return t;
  return null;
}

// First token that is an exact AFFECT tag; else first token in the off-vocab fallback map
// (records that a fallback fired); else null (the drift tripwire). -> { tag, fallback }.
function extractAffect_(text) {
  const toks = String(text || '').split(/[\s\n.,;:"'`*()|]+/).filter(Boolean);
  for (const t of toks) if (AFFECT_SET.has(t.toLowerCase())) return { tag: t, fallback: false };
  for (const t of toks) {
    const hit = AFFECT_FALLBACK[t.toLowerCase()];
    if (hit) return { tag: hit, fallback: true };
  }
  return { tag: null, fallback: false };
}

// Pure parse of a model's "EventTag | AffectTag" line -> { event, affect, affectFallback }.
// Pipe-aware but robust to a missing pipe: extracts an event from the left/whole and an affect
// from the right/whole. Exposed for offline tests (no API). Either tag may be null.
function parseDualRaw_(raw) {
  const s = String(raw || '');
  const pipe = s.indexOf('|');
  const eventPart = pipe >= 0 ? s.slice(0, pipe) : s;
  const affectPart = pipe >= 0 ? s.slice(pipe + 1) : s;
  let event = extractEvent_(eventPart);
  if (event === null && pipe >= 0) event = extractEvent_(s);
  let aff = extractAffect_(affectPart);
  if (aff.tag === null && pipe >= 0) aff = extractAffect_(s);
  return { event, affect: aff.tag, affectFallback: aff.fallback };
}

function buildDualPrompt_(text) {
  const eventList = EVENT_VOCAB.map((v) => `  ${v[0]} — ${v[1]}`).join('\n');
  const affectList = AFFECT_VOCAB.map((v) => `  ${v[0]} — ${v[1]}`).join('\n');
  return `You are a precise text classifier. Read a person's short reflection on their day, then choose TWO tags:
1. the EVENT tag — the concrete thing that happened, or what the day was mostly about.
2. the AFFECT tag — the dominant emotional tone, judged from HOW they write, regardless of whether the event itself was good or bad. A good event described bitterly is still a negative affect.

Rule: if the person was tempted to do wrong but chose NOT to act, the EVENT is Resisted (a moral win) — never a Transgression. A Transgression means they actually did the wrong thing.

EVENT TAGS:
${eventList}

AFFECT TAGS:
${affectList}

TEXT:
"""${text}"""

Output EXACTLY one line, both tags with exact spellings from the lists, separated by a pipe:
EventTag | AffectTag`;
}

// classifyDualReflection_(text) -> { event, affect, affectFallback, raw }
//   event : in-vocab EVENT tag or null. affect : in-vocab AFFECT tag (possibly via fallback) or null.
//   affectFallback : true if affect came from the off-vocab fallback map (log it; gate counts it
//                    separately from a hard-null off-vocab miss). raw : verbatim model output.
async function classifyDualReflection_(text) {
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
        max_tokens: 24,
        temperature: TEMP,
        messages: [{ role: 'user', content: buildDualPrompt_(text) }],
      }),
    });
    const j = await r.json();
    if (j.error) return { event: null, affect: null, affectFallback: false, raw: '[err] ' + (j.error.message || JSON.stringify(j.error)) };
    raw = String(j.choices?.[0]?.message?.content || '').trim();
  } catch (e) {
    return { event: null, affect: null, affectFallback: false, raw: '[err] ' + e.message };
  }
  return { ...parseDualRaw_(raw), raw };
}

// ---- triple-tag extraction (B2 tension register — seams plan Task 3) ---------------------
// The dual pass gains a third OPTIONAL, NULLABLE field: TENSION — an unresolved question the
// citizen is still sitting with (≤120 chars, their voice) — plus, when open tensions are passed
// in, a RESOLVES check (does this reflection settle one of them?). Same single API call.
// NONE-preserving: a null tension is the drift tripwire and must survive (same discipline as
// the affect null). Tensions NEVER touch Reflection_Intake — voice-memory, not dial input.

function buildTriplePrompt_(text, openTensions) {
  const eventList = EVENT_VOCAB.map((v) => `  ${v[0]} — ${v[1]}`).join('\n');
  const affectList = AFFECT_VOCAB.map((v) => `  ${v[0]} — ${v[1]}`).join('\n');
  const open = (openTensions || []).filter(Boolean);
  const openBlock = open.length
    ? `\nOPEN QUESTIONS this person has been carrying:\n${open.map((q, i) => `  ${i + 1}. ${q}`).join('\n')}\n`
    : '';
  // Every output line carries a <placeholder> — a bare literal line gets echoed verbatim by the
  // model (caught live S282: "EventTag | AffectTag" came back as-is, nulling both tags).
  const resolvesLine = open.length
    ? `\nRESOLVES: <if the reflection clearly settles one of the numbered OPEN QUESTIONS, output just its number; otherwise NONE>`
    : '';
  return `You are a precise text classifier. Read a person's short reflection on their day, then choose TWO tags and answer the follow-up field(s):
1. the EVENT tag — the concrete thing that happened, or what the day was mostly about.
2. the AFFECT tag — the dominant emotional tone, judged from HOW they write, regardless of whether the event itself was good or bad. A good event described bitterly is still a negative affect.

Rule: if the person was tempted to do wrong but chose NOT to act, the EVENT is Resisted (a moral win) — never a Transgression. A Transgression means they actually did the wrong thing.

EVENT TAGS:
${eventList}

AFFECT TAGS:
${affectList}
${openBlock}
TEXT:
"""${text}"""

Output EXACTLY these lines and nothing else:
<the one best EVENT tag, exact spelling from the list> | <the one best AFFECT tag, exact spelling from the list>
TENSION: <if this reflection leaves a NEW unresolved question the person is still sitting with, state it in their own voice in under 120 characters; otherwise NONE>${resolvesLine}`;
}

// Pure parse -> { event, affect, affectFallback, tension, resolves }.
//   tension  : string ≤120 chars or null (NONE / absent / empty all -> null).
//   resolves : zero-based index into the open-tension list, or null. Validated against nOpen.
// Dual parse runs ONLY on the text before the TENSION marker — tension prose can legally
// contain vocab words ("should I take the promotion?") and must never feed the tag scan.
function parseTripleRaw_(raw, nOpen) {
  const s = String(raw || '');
  const tIdx = s.search(/^\s*TENSION\s*:/im);
  const dualPart = tIdx >= 0 ? s.slice(0, tIdx) : s;
  const dual = parseDualRaw_(dualPart);
  let tension = null;
  const tm = s.match(/^\s*TENSION\s*:\s*(.+)$/im);
  if (tm) {
    const val = tm[1].trim().replace(/^["'`]+|["'`]+$/g, '').trim();
    if (val && !/^NONE\b/i.test(val)) tension = val.slice(0, 120);
  }
  let resolves = null;
  const rm = s.match(/^\s*RESOLVES\s*:\s*(.+)$/im);
  if (rm && nOpen > 0) {
    const num = parseInt(String(rm[1]).replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(num) && num >= 1 && num <= nOpen) resolves = num - 1;
  }
  return { ...dual, tension, resolves };
}

// classifyTripleReflection_(text, openTensions) -> { event, affect, affectFallback, tension, resolves, raw }
//   Superset of classifyDualReflection_ (which stays untouched for the probe harnesses).
async function classifyTripleReflection_(text, openTensions) {
  const open = (openTensions || []).filter(Boolean);
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
        max_tokens: 80,
        temperature: TEMP,
        messages: [{ role: 'user', content: buildTriplePrompt_(text, open) }],
      }),
    });
    const j = await r.json();
    if (j.error) return { event: null, affect: null, affectFallback: false, tension: null, resolves: null, raw: '[err] ' + (j.error.message || JSON.stringify(j.error)) };
    raw = String(j.choices?.[0]?.message?.content || '').trim();
  } catch (e) {
    return { event: null, affect: null, affectFallback: false, tension: null, resolves: null, raw: '[err] ' + e.message };
  }
  return { ...parseTripleRaw_(raw, open.length), raw };
}

module.exports = {
  MODEL,
  VOCAB,
  VALID,
  AFFECT_TAGS,
  AFFECT_VOCAB,
  EVENT_VOCAB,
  AFFECT_FALLBACK,
  buildPrompt_,
  buildDualPrompt_,
  extractTag_,
  extractEvent_,
  extractAffect_,
  parseDualRaw_,
  classifyReflection_,
  classifyDualReflection_,
  buildTriplePrompt_,
  parseTripleRaw_,
  classifyTripleReflection_,
};
