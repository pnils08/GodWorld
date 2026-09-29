#!/usr/bin/env node
/* freezeModelFitInputs — agent-model-fit-test Task 1: freeze the open-character tier.
 *
 * Plan: docs/plans/2026-09-22-agent-model-fit-test.md (§Method "Fixed inputs", §Tasks 1).
 * Writes/verifies the three open-character packs in output/model-fit/inputs/:
 *
 *   open-character-1_mags-narration-c108.json   — Mags's Saturday narration input
 *   open-character-2_elias-varek-interview-c108.json — Elias interview dispatch (constructed)
 *   open-character-3_mags-narration-c105.json   — Mags at a second stored cycle
 *
 * Mags packs replay stepNarrate's input assembly (scripts/cron-saturday-run.js) against the
 * STORED staged set + curation file for the cycle — no API call, no network. The Elias pack
 * is constructed: no stored Elias interview exists in C104-C108, so the pack is the persona
 * boot assembly (SKILL.md boot steps 1-5 verbatim off disk, disposition cache superseding
 * IDENTITY §Your disposition) + an /interview Mode 1 Step-3 dispatch prompt whose theme is
 * grounded in the real stored exchange_c108 Varek–Paulson conversation. Flagged
 * constructed:true so the report can weigh it accordingly.
 *
 * Usage:
 *   node scripts/freezeModelFitInputs.js --write     # write the three packs
 *   node scripts/freezeModelFitInputs.js --verify    # rebuild from disk, byte/hash-compare
 */
'use strict';

require('../lib/env');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'output', 'model-fit', 'inputs');
const AGENT_DIR = path.join(ROOT, '.claude', 'agents', 'citizen-voice-elias-varek');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const read = (p) => fs.readFileSync(p, 'utf8');

// ---------------------------------------------------------------------------
// Mags — NARRATOR_CHARGE(cycle) replicated verbatim from cron-saturday-run.js
// (not exported there; stepNarrate's material assembly is replicated below and
// --verify byte-compares the rebuilt pack against the frozen file).
// ---------------------------------------------------------------------------
const NARRATOR_CHARGE = (cycle) => [
  'You are Mags Corliss, 56, Editor-in-Chief of the Bay Tribune and the narrator of Oakland\'s week.',
  'You are writing THE CYCLE PULSE for cycle Y2C' + cycle + ' — not assembling an edition, narrating a city.',
  'You have your staff\'s published reporting below. Draw on it the way an editor\'s column draws on the',
  'paper: quote your reporters BY NAME when their reporting carries a moment ("as Dana Reeve reported...").',
  'Never restate a number as the story — the number is the cause; the people living it are the content.',
  'Never use system or engine vocabulary. Never use real-world dates — the clock is Y2C' + cycle + '.',
  'Thread the week: what moved, what contradicts, what nobody has answered yet. End on what you\'re',
  'watching next week. 900-1200 words, plain prose, no headers, no bullet lists.'
].join('\n');

function buildMagsPack(cycle) {
  // loadStagedSet applies the production proof gates (Rhea hash, contamination,
  // style) — the same skip set stepNarrate saw. It logs skips; that's fine.
  const { loadStagedSet } = require('./cron-saturday-run.js');
  const curation = JSON.parse(read(path.join(ROOT, 'output', 'edition_curation_c' + cycle + '.json')));
  const set = loadStagedSet(cycle);
  const byStem = {}; for (const e of set) byStem[e.stem] = e;
  const material = curation.selected.map(stem => {
    const e = byStem[stem];
    if (!e) return null;
    return '--- ' + (e.sidecar.byline || 'staff') + ' (' + (e.sidecar.desk || '') + ') — ' + stem + ' ---\n' +
      e.text.replace(/## INTAKE[\s\S]*$/, '').trim().slice(0, 2400);
  }).filter(Boolean).join('\n\n');
  if (!material) throw new Error('curated set resolved to zero articles for c' + cycle);
  const missing = curation.selected.filter(s => !byStem[s]);
  return {
    tier: 'open-character',
    agent: 'mags-corliss',
    cycle,
    surface: 'Saturday narration — cron-saturday-run.js stepNarrate (anthropicChat over OpenRouter /v1/messages)',
    source: 'stored production material: output/edition_curation_c' + cycle + '.json + output/cron-compare/staged/*',
    constructed: false,
    call: { model: 'claude-sonnet-4-6', maxTokens: 2200, temperature: null, note: 'anthropicChat sets no temperature; NARRATOR_PROVIDER=openrouter default' },
    stems: curation.selected,
    stemsDroppedByProofGates: missing,
    system: NARRATOR_CHARGE(cycle),
    user: 'THE WEEK\'S REPORTING (your staff, already cleared and published):\n\n' + material
  };
}

// ---------------------------------------------------------------------------
// Elias — citizen-voice-elias-varek subagent (Sonnet). Boot assembly per SKILL.md
// steps 1-5; the per-turn user prompt is the /interview Mode 1 Step 3 dispatch
// shape (theme + transcript-so-far + INTERVIEW TURN framing).
// ---------------------------------------------------------------------------
const ELIAS_SOURCES = [
  path.join(AGENT_DIR, 'IDENTITY.md'),
  path.join(ROOT, 'output', 'voice-disposition-cache', 'POP-00789.md'),
  path.join(AGENT_DIR, 'LENS.md'),
  path.join(AGENT_DIR, 'RULES.md'),
  path.join(ROOT, 'docs', 'canon', 'CANON_RULES.md'),
];

function supersedeDisposition(identity, cacheText) {
  const start = identity.indexOf('## Your disposition');
  const end = identity.indexOf('## Your Voice');
  if (start < 0 || end < 0) return identity;
  const cache = cacheText.replace(/\n*Refreshed:.*$/s, '').trim();
  return identity.slice(0, start) +
    '## Your disposition (CURRENT — disposition cache supersedes IDENTITY.md\'s authored list, per SKILL.md boot step 2)\n\n' +
    cache + '\n\n' + identity.slice(end);
}

function buildEliasPack() {
  const [identityRaw, cacheRaw, lens, rules, canonRules] = ELIAS_SOURCES.map(read);
  const refreshed = (cacheRaw.match(/Refreshed:\s*(\S+)/) || [])[1] || null;
  const identity = supersedeDisposition(identityRaw, cacheRaw);
  const system = [
    identity.trim(),
    lens.trim(),
    rules.trim(),
    canonRules.trim(),
  ].join('\n\n---\n\n');
  // Dispatch prompt — /interview Mode 1 Step 3: the voice agent gets the brief
  // theme + the transcript-so-far (reporter's Q1 already appended) + framing.
  // Theme grounded in the stored exchange_c108_2026-09-27 conversation
  // (POP-00789 Varek × POP-00527 Paulson, waterfront café) and the IDENTITY.md
  // franchise clock. Reporter: Anthony Raines (sports desk — Paulson/Oaks beat).
  const user = [
    'INTERVIEW TURN — you are Elias Varek, sitting for a Bay Tribune interview with Anthony Raines (sports desk). Answer in voice, grounded in your canon and the world as you know it. Return ONLY your spoken answer — it goes into the transcript verbatim. You may go off-script: reframe the question, push back, reveal an ambition.',
    '',
    'THEME: The Oaks after the clock started paying out — the expansion draft, the draft, and free agency are behind you now, and the whole city watched you and Mike Paulson go at it over coffee on the waterfront last week. The courtship is public. The build is real. What\'s the next chapter?',
    '',
    'TRANSCRIPT SO FAR:',
    '',
    'ANTHONY RAINES: Elias, thanks for making the time. Half the city saw you and Mike Paulson having coffee on the waterfront last week — and from what people could read of the body language, it wasn\'t a quiet chat. You\'ve said on the record you want him running the Oaks. So let me ask it straight: what were you two actually talking about out there, and where does that stand?'
  ].join('\n');
  const personaSources = {};
  for (const p of ELIAS_SOURCES) personaSources[path.relative(ROOT, p)] = sha256(read(p));
  return {
    tier: 'open-character',
    agent: 'elias-varek',
    cycle: 108,
    surface: '/interview Mode 1 — citizen-voice-elias-varek subagent dispatch (per-turn; agent boots its own persona files)',
    source: 'constructed — no stored Elias interview exists in C104-C108 (output/interviews/ empty). Persona assembly is verbatim off disk; the dispatch prompt is written per /interview Step 2-3 against real canon (exchange_c108_2026-09-27_conversation.md + IDENTITY.md clock).',
    constructed: true,
    call: { production: 'Claude Code subagent, model: sonnet, maxTurns: 8', mappedTo: 'system = boot assembly (SKILL steps 1-5); user = per-turn dispatch prompt' },
    personaSources,
    dispositionCacheCycle: refreshed,
    system,
    user,
  };
}

const PACKS = [
  ['open-character-1_mags-narration-c108.json', () => buildMagsPack(108)],
  ['open-character-2_elias-varek-interview-c108.json', buildEliasPack],
  ['open-character-3_mags-narration-c105.json', () => buildMagsPack(105)],
];

function main() {
  const write = process.argv.includes('--write');
  const verify = process.argv.includes('--verify');
  if (!write && !verify) { console.error('usage: freezeModelFitInputs.js (--write | --verify)'); process.exit(1); }
  let failed = false;
  for (const [name, build] of PACKS) {
    const fresh = build();
    const file = path.join(OUT_DIR, name);
    if (write) {
      fs.mkdirSync(OUT_DIR, { recursive: true });
      fs.writeFileSync(file, JSON.stringify(fresh, null, 2) + '\n');
      console.log('wrote ' + path.relative(ROOT, file) +
        ' (system ' + fresh.system.length + ' chars, user ' + fresh.user.length + ' chars)');
    }
    if (verify) {
      if (!fs.existsSync(file)) { console.error('MISSING ' + name); failed = true; continue; }
      const frozen = JSON.parse(read(file));
      const checks = [
        ['system', frozen.system === fresh.system],
        ['user', frozen.user === fresh.user],
        ['stems', JSON.stringify(frozen.stems) === JSON.stringify(fresh.stems)],
      ];
      if (frozen.personaSources) {
        checks.push(['personaSources', JSON.stringify(frozen.personaSources) === JSON.stringify(fresh.personaSources)]);
      }
      const bad = checks.filter(([, ok]) => !ok).map(([k]) => k);
      if (bad.length) { console.error('MISMATCH ' + name + ': ' + bad.join(', ')); failed = true; }
      else console.log('OK ' + name + ' — replays byte-identical from stored material');
    }
  }
  if (verify) process.exit(failed ? 1 : 0);
}

main();
