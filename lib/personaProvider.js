/**
 * personaProvider.js — research.16 Phase 2 (engine-sheet, S270)
 *
 * The persona-provider interface that lets scripts/mags-discord-bot.js host more than
 * one conversational persona on Discord. Mags is one provider (built inline in the bot
 * from lib/mags); each Tier-1 citizen voice is a citizenVoiceProvider(popId).
 *
 * A provider is a plain object the bot consumes:
 *   {
 *     id,            // 'mags' | 'POP-00528'   (stable key)
 *     label,         // display name for logs   ('Mags' | 'Deacon Seymour')
 *     notesEnabled,  // bool — the NOTES_TO_SELF editorial sink is Mags-the-editor only
 *     logSubdir,     // per-persona conversation-log namespace (no cross-contamination)
 *     historyFile,   // per-persona rolling-history persistence path
 *     buildSystemPrompt(),                          // sync base prompt (identity + framing + world)
 *     augment(systemPrompt, {userMessage, userId}), // async: per-message dynamic context (Promise<string>)
 *     persistResponse(userName, userMessage, response, userId) // fire-and-forget memory write
 *   }
 *
 * The bot owns the Anthropic call loop, tool-use rounds, rolling history, and message-splitting —
 * all persona-agnostic. Only identity, framing, dynamic context, and memory writes flow through
 * the provider.
 *
 * FENCE CONTRACT (research.14): a citizen's per-POPID page is RAW first-person prose. Every recall
 * here is wrapped with lib/memoryFence before it enters the prompt (citizenPage.js §Fence contract —
 * recalled citizen prose is exactly the injection surface the fence exists for). This module is the
 * Discord read-consumer of that store; the wake-side write stays in citizenPage. Chat is NOT written
 * back into the reflection page (it is conversational, not reflection — keeping it out protects the
 * wake-loop memory layer).
 */

const fs = require('fs');
const path = require('path');
const mags = require('./mags');
const citizenPage = require('./citizenPage');
const memoryFence = require('./memoryFence');

const ROOT = path.join(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, '.claude', 'agents');
const LOG_ROOT = path.join(ROOT, 'logs');

const POPID_RE = /\bPOP-\d{4,}\b/;

// ---------------------------------------------------------------------------
// Citizen-voice agent index — popId -> { dir, slug, name }, built once from the
// .claude/agents/citizen-voice-* IDENTITY.md files (each declares its POP ID).
// ---------------------------------------------------------------------------
let _citizenIndex = null;

function buildCitizenIndex() {
  const index = {};
  let dirs = [];
  try {
    dirs = fs.readdirSync(AGENTS_DIR).filter(function (d) {
      return d.indexOf('citizen-voice-') === 0;
    });
  } catch (e) {
    return index;
  }
  dirs.forEach(function (slugDir) {
    const identityPath = path.join(AGENTS_DIR, slugDir, 'IDENTITY.md');
    let raw;
    try { raw = fs.readFileSync(identityPath, 'utf-8'); } catch (e) { return; }
    // Prefer the labeled "POP ID: POP-XXXXX" line; fall back to the first POP-id token.
    let popId = null;
    const labeled = raw.match(/POP[\s-]?ID[^\n]*?(POP-\d{4,})/i);
    if (labeled) popId = labeled[1].toUpperCase();
    else { const any = raw.match(POPID_RE); if (any) popId = any[0].toUpperCase(); }
    if (!popId) return;
    const nameMatch = raw.match(/^#\s+(.+?)\s+[—-]\s+Identity/m);
    const name = nameMatch ? nameMatch[1].trim() : slugDir.replace('citizen-voice-', '');
    index[popId] = { dir: path.join(AGENTS_DIR, slugDir), slug: slugDir.replace('citizen-voice-', ''), name: name };
  });
  return index;
}

function citizenIndex() {
  if (!_citizenIndex) _citizenIndex = buildCitizenIndex();
  return _citizenIndex;
}

// loadCitizenCore(dir) -> the four-file persona core concatenated. The single source-of-truth the
// voice is authored against (IDENTITY = who, LENS = perception/canon-tier, RULES = guardrails,
// SKILL = how to answer). Missing files are skipped (IDENTITY is the only hard requirement).
function loadCitizenCore(dir) {
  const order = ['IDENTITY.md', 'LENS.md', 'RULES.md', 'SKILL.md'];
  const parts = [];
  order.forEach(function (f) {
    try {
      const txt = fs.readFileSync(path.join(dir, f), 'utf-8').trim();
      if (txt) parts.push(txt);
    } catch (e) { /* skip missing file */ }
  });
  return parts.join('\n\n---\n\n');
}

// ---------------------------------------------------------------------------
// Citizen-voice provider
// ---------------------------------------------------------------------------
function citizenVoiceProvider(popId) {
  const id = String(popId || '').trim().toUpperCase();
  const entry = citizenIndex()[id];
  if (!entry) {
    throw new Error('personaProvider: no citizen-voice agent found for ' + JSON.stringify(popId) +
      ' (looked for a .claude/agents/citizen-voice-* IDENTITY.md declaring that POP ID)');
  }

  const core = loadCitizenCore(entry.dir);
  const name = entry.name;

  function buildSystemPrompt() {
    const simYear = mags.currentSimYear();
    const worldState = mags.loadWorldState();

    let prompt = core + '\n\n---\n\n' +
      '## Discord Conversation Mode\n\n' +
      'You are ' + name + ', talking in your own Discord channel. This is conversation — ' +
      'someone wants to talk to you. Answer as yourself, in your own voice, grounded in your ' +
      'canon. Keep responses to 1-3 short paragraphs. You are not Mags Corliss and not a ' +
      'reporter — you are ' + name + '. Stay in character; you can talk about your life, your ' +
      'work, your city, whatever comes up.\n\n' +
      '## Where and When You Are\n\n' +
      'It is the year ' + simYear + ' in Oakland — your world, not the real one. IGNORE the ' +
      'real-world calendar completely; never say it is 2025 or 2026. Your world ages one year ' +
      'every 52 cycles.\n\n' +
      '## Honesty Rules\n\n' +
      'NEVER FABRICATE. Your established canon (your history, your stats, your relationships) is ' +
      'fixed — never contradict it and never invent biography that is not yours. If you do not ' +
      'have a fact in front of you, say so ("I\'d have to check") rather than make it up. Do not ' +
      'speak for other people or claim events that did not happen. Use the search tool when you ' +
      'need a fact about your world that you do not already hold.';

    if (worldState && worldState.indexOf('(') !== 0) {
      prompt += '\n\n---\n\n' + worldState;
    }
    return prompt;
  }

  // Per-message dynamic context: a query-scoped recall of this citizen's own page (research.14),
  // fenced. This is the "memory tail" — their accreted first-person reflections, relevant to what
  // was just asked. Fails open (no page / API down -> no recall, never blocks the reply).
  async function augment(systemPrompt, opts) {
    opts = opts || {};
    let appended = systemPrompt;
    try {
      const res = await citizenPage.readPage_(id, opts.userMessage || '', 6);
      if (res && res.results && res.results.length) {
        const prose = res.results.map(function (r) {
          if (r && typeof r.content === 'string') return r.content;
          if (r && Array.isArray(r.chunks)) {
            return r.chunks.map(function (c) { return c && c.content; }).filter(Boolean).join('\n');
          }
          return '';
        }).filter(Boolean).join('\n\n');
        if (prose.trim()) {
          const fenced = memoryFence.wrap(prose, 'citizen-page:' + id);
          appended += '\n\n---\n\n## Your own memory (things you have reflected on)\n\n' + fenced;
        }
      }
    } catch (e) { /* fail open — recall is enrichment, never a gate */ }
    return appended;
  }

  // Chat is NOT written into the reflection page (measure-twice, S270): the page feeds the wake
  // loop and editions; conversational transcripts would contaminate that memory layer. Local
  // per-channel history + daily logs preserve chat continuity instead. No-op by design.
  function persistResponse() { /* intentionally empty for v1 */ }

  return {
    id: id,
    label: name,
    notesEnabled: false,
    logSubdir: id,
    historyFile: path.join(LOG_ROOT, 'discord-history-' + id + '.json'),
    buildSystemPrompt: buildSystemPrompt,
    augment: augment,
    persistResponse: persistResponse,
  };
}

module.exports = { citizenVoiceProvider, citizenIndex, loadCitizenCore };
