'use strict';

/**
 * Civic must-decide — HIGH stuck initiatives require a phase move.
 *
 * The ledger already publishes current state. Civic crons exist to change it.
 * Restating construction-planning, or filing trackerUpdates: {}, is not a
 * decision. Advance the phase or take a fail phase.
 */

const FAIL_PHASES = Object.freeze(['stalled', 'blocked', 'suspended', 'defunded']);
const FAIL_PHASE_SET = new Set(FAIL_PHASES);

const PHASES = new Set([
  'announced', 'legislation-filed', 'vote-scheduled', 'vote-ready',
  'visioning', 'visioning-complete', 'design-phase', 'construction-planning',
  'construction-active', 'implementation-active', 'disbursement-active',
  'dispatch-live', 'pilot-active', 'pilot_evaluation', 'operational',
  'complete', ...FAIL_PHASES
]);

function isStuckDiagnosis(text) {
  return /\bstuck-initiative\b/i.test(String(text || ''));
}

function phaseOf(init) {
  if (!init) return '';
  const raw = init.ImplementationPhase
    || (init.implementation && init.implementation.phase)
    || init.phase
    || '';
  return String(raw).trim().toLowerCase();
}

function trackerById(tracker) {
  const map = new Map();
  const rows = (tracker && tracker.initiatives)
    || (tracker && tracker.snapshots && tracker.snapshots.Initiative_Tracker)
    || [];
  for (const row of rows) {
    const id = String(row.InitiativeID || row.id || '').trim();
    if (id) map.set(id, row);
  }
  return map;
}

/**
 * HIGH stuck-initiative patterns → decision demands.
 * @param {object} audit engine_audit_cN.json
 * @param {object} [tracker] initiative_tracker.json or audit (for current phase)
 */
function demandsFromAudit(audit, tracker) {
  const byId = trackerById(tracker || audit);
  const out = [];
  const seen = new Set();
  for (const p of (audit && audit.patterns) || []) {
    if (!p || p.severity !== 'high' || p.type !== 'stuck-initiative') continue;
    for (const rawId of (p.affectedEntities && p.affectedEntities.initiatives) || []) {
      const id = String(rawId || '').trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const row = byId.get(id) || {};
      out.push({
        id,
        name: String(row.Name || row.name || id),
        currentPhase: phaseOf(row),
        cyclesInState: Number(p.cyclesInState) || 0
      });
    }
  }
  return out;
}

function isPhaseMove(currentPhase, nextPhase) {
  const next = String(nextPhase || '').trim();
  if (!PHASES.has(next)) return false;
  const cur = String(currentPhase || '').trim().toLowerCase();
  return next !== cur;
}

function writePhase(update) {
  if (!update || typeof update !== 'object') return '';
  return String(update.ImplementationPhase || '').trim();
}

function writeInitiativeId(update, fallback) {
  if (update && update.initiative) return String(update.initiative).trim();
  return String(fallback || '').trim();
}

/**
 * Flatten trackerUpdates (flat contract or keyed-by-name) into phase writes.
 */
function collectPhaseWrites(statements) {
  const writes = [];
  for (const st of statements || []) {
    const tu = st && st.trackerUpdates;
    if (!tu || typeof tu !== 'object') continue;
    if (tu.ImplementationPhase || tu.initiative) {
      writes.push({
        initiative: writeInitiativeId(tu, st.initiative),
        phase: writePhase(tu)
      });
      continue;
    }
    for (const [key, u] of Object.entries(tu)) {
      if (!u || typeof u !== 'object') continue;
      writes.push({
        initiative: writeInitiativeId(u, st.initiative || key),
        phase: writePhase(u)
      });
    }
  }
  return writes;
}

function writesFromAssembled(writeSet) {
  const writes = [];
  for (const item of writeSet || []) {
    const d = item.d || item;
    const tu = d.trackerUpdates || {};
    writes.push({
      initiative: String(d.initiativeId || tu.initiative || item.slug || '').trim(),
      phase: writePhase(tu)
    });
  }
  return writes;
}

/**
 * Every demand must have a write that changes ImplementationPhase.
 * Restating the current phase fails.
 */
function checkMustDecide(demands, writes) {
  const missing = [];
  for (const demand of demands || []) {
    const hit = (writes || []).find(w =>
      w.initiative === demand.id || w.initiative === demand.name);
    if (!hit || !isPhaseMove(demand.currentPhase, hit.phase)) {
      missing.push(demand);
    }
  }
  return {
    ok: missing.length === 0,
    missing,
    failPhases: FAIL_PHASES.slice()
  };
}

function packetBody(demand) {
  const cycles = demand.cyclesInState
    ? ' for ' + demand.cyclesInState + ' cycles'
    : '';
  const phase = demand.currentPhase || 'its current stage';
  return [
    demand.name + ' (' + demand.id + ') has sat in ' + phase + cycles + '.',
    'The ledger already says that. Do not restate it.',
    'THIS CYCLE you must MOVE the tracker: set ImplementationPhase to the next legal stage, or take a fail phase (' + FAIL_PHASES.join(' / ') + ') and own the hit.',
    'Empty trackerUpdates, or writing the same phase again, fails the apply gate.'
  ].join('\n');
}

function vacantOfficesFromApprovals(approvals) {
  const out = [];
  for (const rec of Object.values(approvals || {})) {
    if (!rec || typeof rec !== 'object') continue;
    if (String(rec.status || '').toLowerCase() !== 'vacant') continue;
    out.push({ office: rec.office || '', holder: rec.holder || '', district: rec.district || '' });
  }
  return out;
}

function isMayorVacant(approvals) {
  return vacantOfficesFromApprovals(approvals).some(o =>
    /^mayor$/i.test(String(o.office || '').trim()));
}

const VAGUE_CIVIC = /\b(nothing (is |has )?happening|no (real |visible )?change|status quo|continue to monitor|wait and see|same as last cycle|no movement|watching (and waiting|the situation)|keep (an eye|watching))\b/i;

function isVagueCivicReply(text) {
  return VAGUE_CIVIC.test(String(text || ''));
}

function checkDatawakeMove(rec, demandInSlice) {
  const statement = rec && rec.statement;
  const action = rec && rec.action;
  if (!statement || !String(statement).trim()) return { ok: false, reason: 'empty-statement' };
  if (isVagueCivicReply(statement) || isVagueCivicReply(action)) return { ok: false, reason: 'vague-nothing' };
  if (demandInSlice && (!action || String(action).trim().toLowerCase() === 'null')) {
    return { ok: false, reason: 'no-action' };
  }
  return { ok: true };
}

function contractAddendum(demands) {
  if (!demands || !demands.length) return '';
  const lines = demands.map(d =>
    '- ' + d.id + ' (' + d.name + ') — current phase "' + (d.currentPhase || '?') +
    '". Write a DIFFERENT ImplementationPhase (advance, or ' + FAIL_PHASES.join('/') + ').');
  return [
    '',
    'MUST-DECIDE this cycle (apply gate fails without a phase change on each):',
    ...lines,
    'Silence is not a filing. Restating the current phase is not a filing.',
    ''
  ].join('\n');
}

module.exports = {
  FAIL_PHASES,
  FAIL_PHASE_SET,
  PHASES,
  isStuckDiagnosis,
  phaseOf,
  demandsFromAudit,
  isPhaseMove,
  collectPhaseWrites,
  writesFromAssembled,
  checkMustDecide,
  packetBody,
  contractAddendum,
  vacantOfficesFromApprovals,
  isMayorVacant,
  isVagueCivicReply,
  checkDatawakeMove
};
