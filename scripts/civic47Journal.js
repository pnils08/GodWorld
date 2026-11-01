'use strict';

// Pure reconciliation contract for the proposed Civic_Action_Ledger export.
// It never writes a Sheet or treats a local pending move as an applied effect.
const { actionIdFor, hash } = require('./civicActionSession');
const { normalizeActionRow } = require('./civic47OutcomeFeed');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sha = body => crypto.createHash('sha256').update(body).digest('hex');

function reconcileActions(localRows, journalRows, cycle) {
  if (!Array.isArray(localRows) || !Array.isArray(journalRows) ||
      !Number.isInteger(Number(cycle)) || Number(cycle) < 1)
    return { available: false, reason: 'local moves, action journal or Cycle unavailable' };
  const journal = new Map();
  const byMove = new Set();
  for (const row of journalRows) {
    const parsed = normalizeActionRow(row, cycle);
    if (!parsed.available) return { available: false, reason: parsed.reason };
    if (journal.has(parsed.actionId))
      return { available: false, reason: 'duplicate action ID in authoritative journal' };
    if (row.ClientMoveId && byMove.has(row.ClientMoveId))
      return { available: false, reason: 'one local decision has multiple authoritative actions' };
    if (row.ClientMoveId) byMove.add(row.ClientMoveId);
    journal.set(parsed.actionId, { raw: row, parsed });
  }
  const actions = [];
  const localIds = new Set();
  for (const row of localRows) {
    if (row && row.status === 'rejected') continue;
    if (!row || row.status !== 'pending' || !row.moveId || !row.officeId ||
        !/^POP-[A-Z0-9]+$/.test(String(row.popid || '')) ||
        !row.payload || typeof row.payload !== 'object' || Array.isArray(row.payload) ||
        row.payloadHash !== hash({ type: row.type, payload: row.payload }) ||
        !Number.isInteger(Number(row.cycle)) || Number(row.cycle) < 1 || Number(row.cycle) > Number(cycle))
      return { available: false, reason: 'local pending action malformed' };
    const actionId = actionIdFor(row.moveId, row.popid, row.payloadHash);
    if ((row.actionId && row.actionId !== actionId) || localIds.has(actionId))
      return { available: false, reason: 'local action identity conflict' };
    localIds.add(actionId);
    const entry = journal.get(actionId);
    if (!entry) {
      actions.push({ actionId, moveId: row.moveId, officeId: row.officeId,
        status: 'submitted-local-only', authoritative: false });
      continue;
    }
    const raw = entry.raw;
    if (raw.ClientMoveId !== row.moveId || raw.PayloadHash !== row.payloadHash ||
        raw.OfficeId !== row.officeId || raw.HolderPopid !== row.popid ||
        Number(raw.RequestedCycle) !== Number(row.cycle))
      return { available: false, reason: 'authoritative journal does not match original decision' };
    actions.push({ actionId, moveId: row.moveId, officeId: row.officeId,
      status: entry.parsed.status, authoritative: true,
      effectiveCycle: entry.parsed.effectiveCycle,
      effectReceiptIds: entry.parsed.effectReceiptIds,
      result: entry.parsed.result, reason: entry.parsed.reason });
  }
  return { schema: 'CIVIC-ACTION-RECONCILIATION/1', available: true,
    cycle: Number(cycle), actions,
    localOnly: actions.filter(a => !a.authoritative).length };
}

function loadReconciliation(root, cycle) {
  try {
    const c = Number(cycle);
    const beats = path.join(root, 'output', 'beats');
    const meta = JSON.parse(fs.readFileSync(path.join(beats, 'meta.json'), 'utf8'));
    if (!Number.isInteger(c) || c < 1 || Number(meta.cycle) !== c)
      return { available: false, reason: 'action journal dump Cycle mismatch' };
    const journalFile = path.join(beats, 'Civic_Action_Ledger.jsonl');
    const body = fs.readFileSync(journalFile, 'utf8');
    if (!meta.sourceHashes || meta.sourceHashes.Civic_Action_Ledger !== sha(body))
      return { available: false, reason: 'action journal dump hash mismatch or missing' };
    const { readRows, parseRows } = require('./buildCivicOutcomeFeed');
    const journalRows = parseRows(body, journalFile);
    const movesDir = path.join(root, 'output', 'cron-civic', 'moves');
    const localRows = fs.existsSync(movesDir) ? fs.readdirSync(movesDir)
      .flatMap(name => {
        const match = /^moves_c([1-9][0-9]*)\.jsonl$/.exec(name);
        return match && Number(match[1]) <= c ? [{ name, cycle: Number(match[1]) }] : [];
      }).sort((a, b) => a.cycle - b.cycle || a.name.localeCompare(b.name))
      .flatMap(file => readRows(path.join(movesDir, file.name), true))
      .filter(row => row.clientActionId && row.status === 'pending') : [];
    return reconcileActions(localRows, journalRows, c);
  } catch (e) {
    return { available: false, reason: e.message };
  }
}

module.exports = { reconcileActions, loadReconciliation };
