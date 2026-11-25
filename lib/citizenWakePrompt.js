'use strict';
/**
 * lib/citizenWakePrompt.js — what a woken citizen is shown, as one builder (pipeline.111; builder 2026-11-25: "Why
 * wouldn't the citizens wake as the Cron ?"). Moved unchanged out of scripts/citizen-wake.js (the daily citizen wake),
 * so an interview wakes the same person the cron wakes: scripts/citizenVoice.js builds a seat-file reporter's interview
 * here, with the reporter's question as the wake's question (engine.338's question mode). The wake's part of day is a
 * parameter (was the script's --wake). No reads, no writes: the caller gathers the pieces.
 */
const fs = require('fs');
const path = require('path');
const dials = require('./citizenDials');
const resonance = require('./resonanceRecall');
const { dialTrajectory, renderStanding, renderOwnRecord, loadOwnFeedLines, stationLine, identityLine } = require('./wakePerception');
const { selectProvocation } = require('./provocationBank');

const WAKE_FRAME = {
  morning: 'It is early morning',
  midday: 'It is the middle of the day',
  afternoon: 'It is mid-afternoon',
  evening: 'It is evening',
  night: 'It is late night',
};

function loadEditionSlice(popId, name, nh, cycle) {
  try {
    const dir = path.join(__dirname, '..', 'editions');
    let best = null;
    for (const f of fs.readdirSync(dir).filter((x) => /^cycle_pulse_edition_(\d+)\.txt$/.test(x))) {
      const n = Number(f.match(/_(\d+)\.txt$/)[1]);
      if (cycle != null && n > cycle) continue; // no reading next week's paper
      if (!best || n > best.n) best = { n, f };
    }
    if (!best) return '';
    const txt = fs.readFileSync(path.join(dir, best.f), 'utf8');
    const idx = txt.indexOf('NAMES INDEX');
    if (idx >= 0) {
      for (const line of txt.slice(idx).split('\n')) {
        const m = line.match(/^(POP-\d{5})\s*\|\s*([^|]+)\|\s*(.+)$/);
        if (m && m[1].toUpperCase() === popId) {
          return `The Tribune wrote about you this week: ${m[3].trim()}.`;
        }
      }
    }
    const body = idx >= 0 ? txt.slice(0, idx) : txt;
    if (nh && new RegExp(`\\b${String(nh).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(body)) {
      return `The Tribune ran a piece touching ${nh} this week.`;
    }
    return '';
  } catch (e) { return ''; }
}

function buildVoicePrompts(c, neighbors, sportsLine, lifeArc, textureLine, bondsLine, familyLine, healthLine, pageMemory, cycle, tensionBlock, editionLine, rippleLine, cardBlock, voiceLine, livedLine, showBlock, questionText, wake) {
  const disp = dials.disposition(c.cur);
  const who = neighbors.length
    ? `\n\nPeople around you in ${c.nh}: ${neighbors.map((n) => `${n.name}${n.occupation ? ' (' + n.occupation + ')' : ''}`).join(', ')}.`
    : '';
  const bonds = bondsLine ? `\n\nPeople you have history with: ${bondsLine}.` : ''; // relationships-with-texture (ingredient 3)
  const family = familyLine ? `\n\n${familyLine}` : ''; // loop doctrine — the ledger's structural family, ahead of neighbors/bonds
  const standingLine = renderStanding(c); // engine.147 seam — the family line's standing + the posture, plain words, no numbers
  const standing = standingLine ? `\n\n${standingLine}` : '';
  const health = healthLine ? `\n\n${healthLine}` : ''; // engine.101 health slice — "in a hospital bed NOW" self-state, rides with continuity
  // B1 bias readback (seams Task 7): opinions the citizen carries join the voice ONLY
  // when today's perception mentions the target — carried history surfacing, not a
  // recital. Match text = the UNfenced perception slices (fenced page/tension prose
  // deliberately excluded — recalled memory must not trigger opinion lines). Fed from
  // MemoryRegisters .biases (Task-6 fold); sentiment is bias-local, never dials.
  const biasLine = resonance.biasReadback(c.memReg,
    [c.life, c.dayMoments, neighbors.map((n) => n.name).join(' '), bondsLine, familyLine, healthLine, sportsLine, textureLine, lifeArc, livedLine].filter(Boolean).join(' '));
  const opinions = biasLine ? `\n\nOpinions you carry: ${biasLine}` : '';
  const traj = dialTrajectory(c.baseDials, c.cur);                    // T1a trajectory (dormant until drain)
  const arcLine = (lifeArc ? `\n\nYour life so far: ${lifeArc}.` : '') // T1a self-state read-back (Log-sourced)
    + (livedLine ? `\n\n${livedLine}.` : ''); // pipeline.73 — the lived wake's event, the day it happened
  const trajLine = traj ? ` Lately you've been ${traj}.` : '';
  const sports = sportsLine ? `\n\nAround Oakland: ${sportsLine}` : ''; // T1b world-larger-than-self
  const paper = editionLine ? `\n\nIn the paper: ${editionLine}` : ''; // engine.48 T3 — the edition flywheel (world-larger-than-self group)
  const ripple = rippleLine ? `\n\n${rippleLine}` : ''; // engine.48 T4 — a bonded citizen thought about you recently
  const texture = textureLine ? `\n\nAround your neighborhood: ${textureLine}` : ''; // T2 immediate world
  // T1c own-page memory — already fenced (memoryFence) by loadOwnPageReadback; appended as a distinct
  // tail so the fence block stays intact (mirrors lib/personaProvider.augment).
  const memory = pageMemory ? `\n\n---\n\nWhat's been on your mind lately, from your own private reflections:\n${pageMemory}` : '';
  // B2 open tensions — unresolved questions carried between wakes; fenced upstream (main flow)
  const tensions = tensionBlock ? `\n\nQuestions you've been sitting with, still unresolved:\n${tensionBlock}` : '';
  // immersion-ingredient order: continuity (T1a state + T1c own-memory) -> people (around you + history-with) -> world/A's (T1b) -> surroundings (T2)
  // engine.48 T10 — card anchor FIRST: identity precedes perception. Fenced upstream; canon
  // facts never compete with page recall. T11 — authored speech texture rides beside it.
  const anchor = cardBlock ? `\n\nWho you are:\n${cardBlock}` : '';
  const talk = voiceLine ? `\n\nHow you talk: ${voiceLine}` : '';
  // engine.286 R2-6 (builder 2026-10-12) — the citizen knows its own record, numbers included.
  const recordLine = renderOwnRecord(c);
  const record = recordLine ? `\n\n${recordLine}` : '';
  // pipeline.95 — a pilot's nights on UNDOCKED, fenced upstream (a captain's log is model-written text); continuity group.
  const show = showBlock ? `\n\nYour time on UNDOCKED:\n${showBlock}` : '';
  // pipeline.110 — a citizen the sports feed names this Cycle wakes knowing it (his own rows, whole), and a citizen of
  // station is not told he is ordinary. Local beats read; '' for everyone the feed does not name.
  let ownFeed = '';
  try { ownFeed = loadOwnFeedLines(c.name, cycle).block; } catch (e) { ownFeed = ''; }
  const feedLine = ownFeed ? `\n\n${ownFeed}` : '';
  const system = `${identityLine(c)} ${stationLine(c, !!ownFeed)} Your temperament: ${disp}.${trajLine}${arcLine}${health}${anchor}${talk}${record}${show}${feedLine}\n\nReal things from your life recently:\n${c.life}${c.dayMoments ? '\n\n' + c.dayMoments : ''}${family}${standing}${who}${bonds}${ripple}${opinions}${sports}${paper}${texture}${memory}${tensions}`;
  // T5 — varied-provocation question bank. The fixed "small things on your mind"
  // prompt becomes a deterministically-seeded pick latching a real signal this
  // citizen perceives, so two citizens woken the same cycle are prompted
  // DIFFERENTLY (fixes vector-2: the shared question that converges the mode).
  const prov = selectProvocation(c.popId, cycle, wake, {
    citizen: { name: c.name, occ: c.occ, nh: c.nh, age: c.age, disp: disp },
    neighbors: neighbors, sportsLine: sportsLine, lifeArc: lifeArc,
    textureLine: textureLine, bondsLine: bondsLine, traj: traj, livedLine: livedLine,
  });
  // engine.338: a wake that carries the builder's question asks THAT — the question is the provocation. Builder
  // 2026-11-21: "The question is to wake them to that question" — no job pick, no MOVE line, nothing filed.
  if (questionText) {
    const userQ = `${WAKE_FRAME[wake] || WAKE_FRAME.evening}. ${questionText}`;
    return { system, user: userQ, disp, prov: { id: 'question', route: 'owed', text: questionText } };
  }
  const user = `${WAKE_FRAME[wake] || WAKE_FRAME.evening}. ${prov.text}`;
  return { system, user, disp, prov };
}

module.exports = { WAKE_FRAME, loadEditionSlice, buildVoicePrompts };
