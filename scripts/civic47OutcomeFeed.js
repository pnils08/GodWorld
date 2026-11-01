'use strict';

const crypto = require('crypto');

const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const TERMINAL = new Set(['applied', 'failed', 'cancelled', 'expired']);
const EXPOSURE = new Set(['attended', 'enrolled', 'used-service', 'worked']);

function normalizeActionRow(row, cycle) {
  if (!row || !/^CA-[A-Za-z0-9_-]+$/.test(String(row.ActionId || '')) ||
      !/^POP-[A-Z0-9]+$/.test(String(row.HolderPopid || '')) || !row.OfficeId ||
      !['submitted', 'validated', 'reserved', 'scheduled', 'reconciling',
        'applied', 'failed', 'cancelled', 'expired'].includes(String(row.Status || '')))
    return { available: false, reason: 'malformed action journal row' };
  const effective = row.EffectiveCycle === '' || row.EffectiveCycle == null ? null : Number(row.EffectiveCycle);
  const requested = Number(row.RequestedCycle);
  const cost = row.Cost === '' || row.Cost == null ? null : Number(row.Cost);
  if (!Number.isInteger(requested) || requested > Number(cycle) ||
      (effective != null && (!Number.isInteger(effective) || effective < requested || effective > Number(cycle))) ||
      (cost != null && (!Number.isFinite(cost) || cost < 0)))
    return { available: false, reason: 'action Cycle invalid or future' };
  const receipts = String(row.EffectReceiptIds || '').split(',').map(x => x.trim()).filter(Boolean);
  const applied = row.Status === 'applied';
  if (applied && (!effective || !receipts.length || String(row.ReadbackVerified).toLowerCase() !== 'true'))
    return { available: false, reason: 'applied action lacks typed effect/readback receipt' };
  return { available: true,
    actionId: row.ActionId, officeId: row.OfficeId, holderPopid: row.HolderPopid,
    kind: row.ActionKind || null, status: row.Status, requestedCycle: requested,
    effectiveCycle: effective, sourceEvidenceHash: row.SourceEvidenceHash || null,
    eventId: row.EventId || null, initiativeId: row.InitiativeId || null,
    targetHoods: String(row.TargetHoods || '').split(',').map(x => x.trim()).filter(Boolean),
    cost,
    effectReceiptIds: receipts, result: row.Result || null, reason: row.Reason || null,
    sourceRevision: hash(row), sourceRef: 'Civic_Action_Ledger:' + row.ActionId };
}

function responseForAction(actionId, reactions, publications, experiences) {
  const response = [];
  const seen = new Set();
  const byExperience = new Map((experiences || []).filter(e => e.actionId === actionId)
    .map(e => [e.experienceId, e]));
  for (const row of reactions || []) {
    const experience = byExperience.get(row.ExperienceId);
    if (row.ActionId !== actionId || !row.ExperienceId || !row.ReactionId ||
        !experience || row.POPID !== experience.popid) continue;
    const key = row.ExperienceId + ':' + row.ReactionId;
    if (seen.has(key)) continue;
    seen.add(key);
    response.push({ experienceId: row.ExperienceId, reactionId: row.ReactionId,
      popid: row.POPID || null, stance: row.Stance || null,
      sourceRef: row.SourceRef || null, available: true });
  }
  const coverage = [];
  const pubs = new Set();
  for (const row of publications || []) {
    if (row.ActionId !== actionId || String(row.Status).toLowerCase() !== 'published' ||
        !row.PublicationReceiptId || pubs.has(row.PublicationReceiptId)) continue;
    pubs.add(row.PublicationReceiptId);
    coverage.push({ publicationReceiptId: row.PublicationReceiptId,
      sourceRef: row.SourceRef || null, stance: row.Stance || null });
  }
  return { reactions: response, publishedCoverage: coverage,
    reactionAvailable: Array.isArray(reactions) && Array.isArray(experiences),
    publicationAvailable: Array.isArray(publications),
    sampleCount: Array.isArray(reactions) && Array.isArray(experiences) ? response.length : null,
    representativePoll: false };
}

function buildOutcomeFeed(rows, experienceRows, reactionRows, publicationRows, cycle) {
  if (!Array.isArray(rows)) return { available: false, reason: 'action journal export missing' };
  const parsed = rows.map(r => normalizeActionRow(r, cycle));
  const bad = parsed.filter(x => !x.available);
  if (bad.length) return { available: false, reason: 'action journal export malformed',
    issues: bad.map(x => x.reason) };
  const actions = parsed;
  const byId = new Map(actions.map(a => [a.actionId, a]));
  if (byId.size !== actions.length) return { available: false, reason: 'duplicate action IDs in export' };
  const experiences = [];
  const experienceSeen = new Set();
  for (const row of experienceRows || []) {
    const action = byId.get(row.ActionId);
    if (!action || action.status !== 'applied' || !EXPOSURE.has(row.Mode)) continue;
    const occurred = Number(row.OccurredCycle);
    if (!row.ExperienceId || !row.POPID || !row.ReceiptId ||
        !Number.isInteger(occurred) || occurred < action.effectiveCycle || occurred > Number(cycle))
      return { available: false, reason: 'applied action has malformed experience receipt' };
    const key = row.ActionId + ':' + row.POPID + ':' + row.Mode;
    if (experienceSeen.has(key)) continue;
    experienceSeen.add(key);
    experiences.push({ experienceId: row.ExperienceId, actionId: action.actionId,
      popid: row.POPID, mode: row.Mode, receiptId: row.ReceiptId,
      occurredCycle: occurred,
      sourceRef: 'Civic_Experience:' + row.ExperienceId });
  }
  const mediaSources = actions.filter(a => TERMINAL.has(a.status)).map(a => ({
    sourceId: 'CIVIC-SOURCE-' + a.actionId, actionId: a.actionId,
    eventId: a.eventId, initiativeId: a.initiativeId,
    officeId: a.officeId, status: a.status, effectiveCycle: a.effectiveCycle,
    sourceRef: a.sourceRef, effectReceiptIds: a.effectReceiptIds,
    result: a.result, reason: a.reason,
    published: false, quote: null,
  }));
  const officialFeedback = actions.map(a => ({
    actionId: a.actionId, officeId: a.officeId, status: a.status,
    requestedCycle: a.requestedCycle, effectiveCycle: a.effectiveCycle,
    effectReceiptIds: a.effectReceiptIds,
    result: a.result, reason: a.reason,
    experienceCount: Array.isArray(experienceRows) ? experiences.filter(e => e.actionId === a.actionId).length : null,
    ...responseForAction(a.actionId, reactionRows, publicationRows, Array.isArray(experienceRows) ? experiences : null),
  }));
  return { schema: 'CIVIC-OUTCOME-FEED/1', available: true, cycle: Number(cycle),
    sourceAvailability: { actionJournal: true, experiences: Array.isArray(experienceRows),
      reactions: Array.isArray(reactionRows), publications: Array.isArray(publicationRows) },
    generationHash: hash({ rows, experienceRows, reactionRows, publicationRows }),
    actions, experiences, mediaSources, officialFeedback };
}

function loadOutcomeFeed(root, cycle) {
  try {
    // Recompute from the current Cycle-stamped source. A saved feed alone may
    // predate a journal correction and cannot certify the latest world state.
    return require('./buildCivicOutcomeFeed').buildLocal(root, cycle);
  } catch (e) { return { available: false, reason: e.message }; }
}

module.exports = { normalizeActionRow, responseForAction, buildOutcomeFeed, loadOutcomeFeed };
