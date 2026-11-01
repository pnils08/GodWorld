'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { acquireFileLock } = require('../lib/wakePerception');

const hash = value => crypto.createHash('sha256').update(JSON.stringify(value === undefined ? null : value)).digest('hex');

function normalizeEnvelope(output) {
  if (!output || typeof output !== 'object') return { statement: '', moves: [], issue: 'decision object missing' };
  const statement = typeof output.statement === 'string' ? output.statement.trim() :
    Array.isArray(output.statements) ? output.statements.map(x => typeof x === 'string' ? x : x && x.text)
      .filter(Boolean).join('\n').trim() : '';
  if (!Array.isArray(output.decisions) && !Array.isArray(output.answers) && !Array.isArray(output.upkeep)) {
    return { statement, moves: Array.isArray(output.moves) ? output.moves : [], issue: null };
  }
  const decisions = Array.isArray(output.decisions) ? output.decisions : [];
  const answers = Array.isArray(output.answers) ? output.answers : [];
  const upkeep = Array.isArray(output.upkeep) ? output.upkeep : [];
  const moves = [
    ...answers.map((x, i) => ({ ...x, type: 'answer', segment: 'answer', clientActionId: x.clientActionId || 'A' + (i + 1) })),
    ...decisions.map((x, i) => ({ ...x, segment: 'decision', clientActionId: x.clientActionId || 'D' + (i + 1) })),
    ...upkeep.map((x, i) => ({ ...x, type: 'work', segment: 'upkeep', clientActionId: x.clientActionId || 'U' + (i + 1) })),
  ];
  return { statement, moves, issue: null };
}

function actionLines(office, cycle, sessionId, moves, evidenceHash) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(sessionId))) throw new Error('invalid civic session date');
  const base = 'MV-' + cycle + '-' + String(office.officeId || office.agentDir) + '-' + sessionId;
  const at = new Date().toISOString();
  return [
    ...moves.accepted.map((m) => {
      const payloadHash = hash({ type: m.type, payload: m.payload });
      const clientActionId = String(m.payload && m.payload.clientActionId || '');
      if (!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(clientActionId)) throw new Error('accepted action lacks stable clientActionId');
      return { moveId: base + ':a:' + clientActionId, sessionId, clientActionId,
        payloadHash, evidenceHash: evidenceHash || null,
        cycle: Number(cycle), agentDir: office.agentDir, officeId: office.officeId || null,
        popid: office.popid || null, type: m.type, payload: m.payload,
        status: 'pending', at };
    }),
    ...moves.rejected.map((r, i) => ({ moveId: base + ':r' + (i + 1), sessionId,
      cycle: Number(cycle), agentDir: office.agentDir, officeId: office.officeId || null,
      popid: office.popid || null, type: r.move && r.move.type || null,
      payload: r.move && typeof r.move === 'object' ? r.move : { raw: String(r.move) },
      payloadHash: hash(r.move), status: 'rejected', detail: r.reason, at })),
  ];
}

function appendSession(root, cycle, lines) {
  if (!lines.length) return { file: null, appended: 0, replayed: 0 };
  const dir = path.join(root, 'output', 'cron-civic', 'moves');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'moves_c' + cycle + '.jsonl');
  const release = acquireFileLock(file + '.civic47.lock');
  if (!release) throw new Error('civic action ledger lock unavailable; retry later');
  try {
    const existing = new Map();
    if (fs.existsSync(file)) {
      for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        if (!line.trim()) continue;
        let row;
        try { row = JSON.parse(line); } catch (_) { throw new Error('move ledger has unreadable line; admission held'); }
        if (row.moveId && row.payloadHash) existing.set(row.moveId, row);
      }
    }
    const add = [];
    let replayed = 0;
    const seen = new Set();
    for (const row of lines) {
      if (!row.moveId || seen.has(row.moveId)) throw new Error('duplicate/missing action identity in session');
      seen.add(row.moveId);
      const old = existing.get(row.moveId);
      if (old) {
        if (old.payloadHash !== row.payloadHash || old.popid !== row.popid)
          throw new Error('action identity conflict; prior choice cannot be overwritten');
        replayed++;
      } else add.push(row);
    }
    if (add.length) fs.appendFileSync(file, add.map(x => JSON.stringify(x)).join('\n') + '\n');
    return { file, appended: add.length, replayed };
  } finally { release(); }
}

module.exports = { normalizeEnvelope, actionLines, appendSession, hash };
