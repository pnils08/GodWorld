'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { actionLines } = require('./civicActionSession');
const { reconcileActions, loadReconciliation } = require('./civic47Journal');
const { makeBrief, readBriefEvidence } = require('./civicBrief');

const office = { officeId: 'COUNCIL-D2', agentDir: 'synthetic-d2', popid: 'POP-SYN01' };
const verdict = { accepted: [{ type: 'work', payload: {
  type: 'work', initiativeId: 'INIT-SYN', clientActionId: 'D1',
} }], rejected: [] };
const [local] = actionLines(office, 120, '2026-11-02', verdict, 'synthetic-evidence');
const base = {
  ActionId: local.actionId, ClientMoveId: local.moveId, PayloadHash: local.payloadHash,
  OfficeId: office.officeId, HolderPopid: office.popid, ActionKind: 'work',
  RequestedCycle: '120', Status: 'reserved', Cost: '3',
};

assert.strictEqual(actionLines(office, 120, '2026-11-02', verdict, 'synthetic-evidence')[0].actionId,
  local.actionId, 'a replay derives the same action identity');
assert.strictEqual(reconcileActions([local], null, 120).available, false,
  'an absent authoritative export is unavailable, not an empty success');
const waiting = reconcileActions([local], [], 120);
assert(waiting.available && waiting.actions[0].status === 'submitted-local-only' &&
  waiting.actions[0].authoritative === false);
const reserved = reconcileActions([local], [base], 120);
assert(reserved.available && reserved.actions[0].status === 'reserved' &&
  reserved.actions[0].authoritative === true);
assert.strictEqual(reconcileActions([local], [{ ...base, Status: 'applied',
  EffectiveCycle: '120', EffectReceiptIds: 'RCPT-SYN' }], 120).available, false,
  'a journal label without typed readback cannot become applied');
const applied = reconcileActions([local], [{ ...base, Status: 'applied',
  EffectiveCycle: '120', EffectReceiptIds: 'RCPT-SYN', ReadbackVerified: 'true',
  Result: 'Synthetic work recorded' }], 121);
assert(applied.available && applied.actions[0].status === 'applied' &&
  applied.actions[0].effectReceiptIds[0] === 'RCPT-SYN');
assert.strictEqual(reconcileActions([local], [{ ...base, HolderPopid: 'POP-SYN02' }], 120).available,
  false, 'a changed holder cannot inherit an earlier action');
assert.strictEqual(reconcileActions([local], [{ ...base, PayloadHash: 'altered' }], 120).available,
  false, 'the authoritative row must preserve the immutable choice');
assert.strictEqual(reconcileActions([local], [base, base], 120).available,
  false, 'duplicate authoritative writes fail closed');
assert.strictEqual(reconcileActions([{ ...local, payload: { ...local.payload, initiativeId: 'INIT-OTHER' } }],
  [base], 120).available, false, 'a changed local payload cannot be reconciled');
assert(reconcileActions([{ ...local, actionId: undefined }], [base], 120).available,
  'an older local row can derive its stable action ID without rewriting the ledger');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'civic47-reconcile-'));
try {
  const beats = path.join(root, 'output', 'beats');
  const moves = path.join(root, 'output', 'cron-civic', 'moves');
  fs.mkdirSync(beats, { recursive: true });
  fs.mkdirSync(moves, { recursive: true });
  const body = JSON.stringify(base) + '\n';
  fs.writeFileSync(path.join(beats, 'Civic_Action_Ledger.jsonl'), body);
  fs.writeFileSync(path.join(beats, 'meta.json'), JSON.stringify({ cycle: 120,
    sourceHashes: { Civic_Action_Ledger: crypto.createHash('sha256').update(body).digest('hex') } }));
  fs.writeFileSync(path.join(moves, 'moves_c120.jsonl'), JSON.stringify(local) + '\n');
  assert(loadReconciliation(root, 120).available);
  const situation = makeBrief({ root, cycle: 120, office: { officeId: office.officeId, district: 'D2' },
    pack: { game: { board: [], lastMove: { available: true, moves: [] } } },
    audit: { snapshots: { Neighborhood_Map: [] } },
  });
  assert.strictEqual(situation.brief.sections.commitments.reconciledActions[0].status, 'reserved');
  assert(readBriefEvidence({ brief: situation.brief, _briefEvidence: situation.evidence },
    { type: 'prior', id: local.moveId }).available,
  'a journal-matched result can be retrieved by the original move ID');
  fs.writeFileSync(path.join(beats, 'Civic_Action_Ledger.jsonl'), body + body);
  assert.strictEqual(loadReconciliation(root, 120).available, false,
    'a torn or changed journal export cannot certify status using old metadata');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
console.log('civic47 journal reconciliation: ok');
