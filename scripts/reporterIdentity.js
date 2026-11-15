'use strict';

/**
 * scripts/reporterIdentity.js — who a reporter is, for the write wake (docs/reference/AGENT_BOOT_TEMPLATES.md §4,
 * parts 1 and 2; builder 2026-11-15: "lets make the fixes that give the journalists their identity not just theri
 * sheet … make that addition per the template plan to the existing").
 *
 * Part 1, the sheet line: the daily wake's own opening sentence (lib/wakePerception identityLine) and the dials'
 * temperament, read live. Part 2, the written background: the §Essence of the reporter's own voice file
 * (docs/media/voices/<name>.md) — who they are, how they work, how they talk. None of the file's Opening Pattern,
 * Exemplar, Signature Moves or DO NOT sections is read: those say how to open and close a piece.
 *
 * Which voice file is a reporter's comes from the reporter's own folder: the first docs/media/voices/*.md path its
 * IDENTITY / LENS / RULES names. No second map. A folder that names none, or a file with no "## Essence", gets the
 * sheet line alone. Everything fails open: an unreadable sheet or file is '' and a reason, never a thrown wake.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const VOICE_REF = /docs\/media\/voices\/([a-z0-9_]+\.md)/i;

// The voice file a reporter folder points at. '' when the folder names none or the file is gone.
function voiceFileFor(agentDir, root) {
  const base = root || ROOT;
  for (const f of ['IDENTITY.md', 'LENS.md', 'RULES.md']) {
    let text = '';
    try { text = fs.readFileSync(path.join(agentDir, f), 'utf8'); } catch (e) { continue; }
    const m = VOICE_REF.exec(text);
    if (!m) continue;
    const p = path.join(base, 'docs', 'media', 'voices', m[1]);
    if (fs.existsSync(p)) return p;
  }
  return '';
}

// The body under "## Essence", up to the next "## " heading. Pure. '' when the file has no such section.
function essenceOf(text) {
  const lines = String(text || '').split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+Essence\s*$/i.test(l));
  if (start < 0) return '';
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n').trim();
}

// The sheet line + temperament for one POPID, as the worker template builds it (workerWake.whoTheyAre). A reporter
// holds no office, so the sentence is name, age, role and home. `deps` is injectable for tests.
async function sheetLine(popid, deps) {
  const d = deps || {};
  const wp = d.wp || require('../lib/wakePerception');
  const dials = d.dials || require('../lib/citizenDials');
  const id = String(popid || '').toUpperCase();
  if (!/^POP-\d{5}$/.test(id)) return { line: '', error: 'no POPID for this seat' };
  try {
    const pool = await wp.buildPool({ shapedMin: 0, lifeMinChars: 0 });
    const c = pool.find((x) => x.popId === id);
    if (!c) return { line: '', error: id + ' is not on the citizen ledger' };
    let disp = ''; try { disp = dials.disposition(c.cur) || ''; } catch (e) { /* no dials: the line stands alone */ }
    return { line: wp.identityLine(c) + (disp ? ' Your temperament: ' + disp + '.' : ''), error: '' };
  } catch (e) { return { line: '', error: (e && e.message) || String(e) }; }
}

// Both parts as the block that opens the write wake's system turn. { block, sheet, essence, voiceFile, notes }.
async function reporterIdentity(opts, deps) {
  const o = opts || {};
  const notes = [];
  const sl = await sheetLine(o.popid, deps);
  if (sl.error) notes.push('sheet line: ' + sl.error);
  const voiceFile = o.agentDir ? voiceFileFor(o.agentDir, o.root) : '';
  let essence = '';
  if (!voiceFile) notes.push('written background: the folder names no voice file');
  else {
    try { essence = essenceOf(fs.readFileSync(voiceFile, 'utf8')); } catch (e) { notes.push('written background: ' + e.message); }
    if (!essence && !notes.some((n) => /^written background/.test(n))) notes.push('written background: no Essence section in ' + path.basename(voiceFile));
  }
  const block = [sl.line, essence].filter(Boolean).join('\n\n');
  return { block, sheet: sl.line, essence, voiceFile, notes };
}

// The written background for a POPID that holds a newsroom seat (scripts/persona-map.json), '' for everyone else.
// For the wakes that run a reporter down the citizen path (the morning pick): the same Essence the write wake opens on.
function essenceForPop(popid, opts) {
  const o = opts || {};
  const id = String(popid || '').toUpperCase();
  if (!id) return '';
  let map = o.personaMap;
  if (!map) { try { map = JSON.parse(fs.readFileSync(path.join(__dirname, 'persona-map.json'), 'utf8')); } catch (e) { return ''; } }
  const root = o.root || ROOT;
  for (const slug of Object.keys(map)) {
    const m = map[slug];
    if (!m || typeof m !== 'object' || String(m.popid || '').toUpperCase() !== id) continue;
    const vf = voiceFileFor(path.join(root, '.claude', 'agents', m.voiceDir || slug), root);
    if (!vf) continue;
    try { const e = essenceOf(fs.readFileSync(vf, 'utf8')); if (e) return e; } catch (e) { /* next seat of the same person */ }
  }
  return '';
}

module.exports = { voiceFileFor, essenceOf, sheetLine, reporterIdentity, essenceForPop };
