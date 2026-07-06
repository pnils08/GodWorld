#!/usr/bin/env node
/* citizenVoice — voice one citizen through the wake mechanism, on demand (Mike-direct S300).
 *
 * The first edition-run offload agent: when an edition needs a citizen's voice (a letter to
 * the editor, a street quote, a reaction), the desk calls THIS per citizen instead of one
 * premium LLM ventriloquizing them all. The citizen speaks from the same perception the wake
 * crons assemble — dials → disposition, real LifeHistory tail, co-residents, bonds, sports,
 * neighborhood texture, fenced own-page memory — via lib/wakePerception (Task 5 extraction),
 * generated on a cheap OpenRouter call (DeepSeek, same model/params family as the wake).
 * Same mechanism, many mouths; this is also the doorway to agent-to-agent conversation
 * (citizen-loop-deepening Task 6 reuses exactly this assembly).
 *
 * ── CANON GUARD (hard) ─────────────────────────────────────────────────────────────────────
 * READ-ONLY. This script writes NOTHING — no page docs, no Reflection_Intake, no dials, no
 * LifeHistory, no local state. A voiced line becomes canon only if the edition publishes it
 * (the existing subjective→canon wall). Recall staleness is untouched (no markRecalled).
 *
 * Usage:
 *   node scripts/citizenVoice.js --pop=POP-00123 --ask="The Tribune ran a story about rising
 *     rents on your block. Write a short letter to the editor reacting to it." [--cycle=N]
 *     [--dry-run] [--json] [--max-tokens=260] [--stdin]
 *   --dry-run : print the assembled prompts, no API call.
 *   --json    : emit {popId,name,nh,occ,disposition,text} instead of plain text.
 *   --stdin   : read the ask from stdin (long briefs).
 *   Exit 2 when the citizen can't be voiced (no dials / not in ledger) — caller falls back.
 *
 * Plan: docs/plans/2026-07-06-citizen-loop-deepening.md (engine.48; voicing offload Mike-direct S300).
 */
require('/root/GodWorld/lib/env');
const dials = require('/root/GodWorld/lib/citizenDials');
const memoryFence = require('/root/GodWorld/lib/memoryFence');
const getCurrentCycle = require('/root/GodWorld/lib/getCurrentCycle');
const { buildPool, coResidents, loadLifeArc, loadSportsSlice, loadNeighborhoodTexture,
  loadBonds, loadOwnPageReadback, dialTrajectory } = require('/root/GodWorld/lib/wakePerception');

const ARGV = process.argv.slice(2);
const DRY = ARGV.includes('--dry-run');
const JSON_OUT = ARGV.includes('--json');
const arg = (k, d) => { const m = ARGV.find((a) => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };

async function readStdin() {
  let buf = '';
  for await (const chunk of process.stdin) buf += chunk;
  return buf.trim();
}

async function generate(system, user, maxTokens) {
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://godworld.local' },
    body: JSON.stringify({ model: 'deepseek/deepseek-chat', max_tokens: maxTokens, temperature: 0.85, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  });
  const j = await r.json();
  if (j.error) throw new Error('voice: ' + (j.error.message || JSON.stringify(j.error)));
  return String(j.choices?.[0]?.message?.content || '').trim();
}

(async () => {
  const popId = String(arg('pop', '') || '').toUpperCase();
  let ask = arg('ask', null);
  if (!ask && ARGV.includes('--stdin')) ask = await readStdin();
  if (!popId || !ask) { console.error('usage: citizenVoice.js --pop=POP-XXXXX (--ask="..." | --stdin) [--cycle=N] [--dry-run] [--json]'); process.exit(1); }
  const cycle = Number(arg('cycle', null)) || (() => { try { return getCurrentCycle(); } catch (e) { return null; } })();
  const maxTokens = Number(arg('max-tokens', 260)) || 260;

  // No shaped floor for edition voicing — a citizen the Tribune touched deserves a voice even at
  // mild dial deviation. Dials + a name + a neighborhood are still required (no dials = no
  // temperament = confabulation risk; exit 2 so the caller falls back).
  const pool = await buildPool({ shapedMin: 0, lifeMinChars: 0 });
  const c = pool.find((p) => p.popId === popId);
  if (!c) { console.error(`citizenVoice: ${popId} not voiceable (no DialState / not in ledger / no name+hood)`); process.exit(2); }

  const [neighbors, sportsLine, lifeArc, bondsLine] = await Promise.all([
    coResidents(c.nh, c.popId), loadSportsSlice(), loadLifeArc(c.popId), loadBonds(c.popId),
  ]);
  const textureLine = loadNeighborhoodTexture(c.nh, cycle);
  const pageRead = await loadOwnPageReadback(c.popId, {
    cycle, wake: 'VOICE',
    contextText: [ask, textureLine, sportsLine, bondsLine, c.nh, c.occ].filter(Boolean).join(' '),
  });

  // Citizen-self system prompt — same block structure and immersion-ingredient order as the
  // wake's buildVoicePrompts (continuity -> people -> world -> surroundings -> memory).
  const disp = dials.disposition(c.cur);
  const traj = dialTrajectory(c.baseDials, c.cur);
  const who = neighbors.length ? `\n\nPeople around you in ${c.nh}: ${neighbors.map((n) => `${n.name}${n.occupation ? ' (' + n.occupation + ')' : ''}`).join(', ')}.` : '';
  const bonds = bondsLine ? `\n\nPeople you have history with: ${bondsLine}.` : '';
  const arcLine = lifeArc ? `\n\nYour life so far: ${lifeArc}.` : '';
  const trajLine = traj ? ` Lately you've been ${traj}.` : '';
  const sports = sportsLine ? `\n\nAround Oakland: ${sportsLine}` : '';
  const texture = textureLine ? `\n\nAround your neighborhood: ${textureLine}` : '';
  const memory = pageRead.block ? `\n\n---\n\nWhat's been on your mind lately, from your own private reflections:\n${pageRead.block}` : '';
  const system = `You are ${c.name}, ${c.age ? c.age + ', ' : ''}a ${c.occ || 'resident'} living in ${c.nh}, Oakland. You are an ordinary person, not a writer. Your temperament: ${disp}.${trajLine}${arcLine}\n\nReal things from your life recently:\n${c.life}${who}${bonds}${sports}${texture}${memory}`;

  // The ask arrives from the caller (letters desk, interview brief). Fence it — desk-authored
  // context is instructions TO the citizen, but anything quoted inside it must not be able to
  // rewrite who they are. The speech guard rides outside the fence.
  const user = `${memoryFence.sanitize(ask)}\n\nSpeak as yourself, plainly, in first person — your temperament and your history shape what you say and what you leave out. Never mention data, records, or that you were asked by a system.`;

  if (DRY) {
    console.log('--- system ---\n' + system + '\n--- user ---\n' + user + '\n--- (dry-run: no API call, no writes) ---');
    process.exit(0);
  }
  const text = await generate(system, user, maxTokens);
  if (!text) { console.error('citizenVoice: empty generation'); process.exit(3); }
  if (JSON_OUT) console.log(JSON.stringify({ popId: c.popId, name: c.name, nh: c.nh, occ: c.occ, disposition: disp, text }, null, 2));
  else console.log(text);
})().catch((e) => { console.error('citizenVoice ERR: ' + e.message); process.exit(1); });
