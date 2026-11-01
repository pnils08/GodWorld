'use strict';

const fs = require('fs');
const path = require('path');
const { getNeighborhoodsForDistricts } = require('../lib/districtMap');
const { loadEventView, eventsForSeat, sha } = require('./civicEventView');
const { loadOutcomeFeed } = require('./civic47OutcomeFeed');

function priorAudit(root, cycle) {
  const file = path.join(root, 'output', 'engine_audit_c' + (Number(cycle) - 1) + '.json');
  try {
    const audit = JSON.parse(fs.readFileSync(file, 'utf8'));
    const c = Number(audit.cycle || audit.Cycle || audit.meta && audit.meta.cycle);
    return c === Number(cycle) - 1 ? audit : null;
  } catch (_) { return null; }
}

function districtState(audit, earlier, district) {
  const hoods = getNeighborhoodsForDistricts(district);
  if (!hoods.length) return { available: false, district, reason: 'no canonical district geography' };
  const rows = audit && audit.snapshots && audit.snapshots.Neighborhood_Map;
  if (!Array.isArray(rows)) return { available: false, district, reason: 'Neighborhood_Map audit unavailable' };
  const previous = new Map((((earlier || {}).snapshots || {}).Neighborhood_Map || [])
    .map(r => [String(r.Neighborhood || '').toLowerCase(), r]));
  const byHood = new Map(rows.map(r => [String(r.Neighborhood || '').toLowerCase(), r]));
  const metrics = ['Sentiment', 'CrimeIndex', 'RetailVitality', 'HousingPressure', 'NeighborhoodTrajectory', 'TrajectoryMomentum'];
  const neighborhoods = hoods.map(hood => {
    const row = byHood.get(hood.toLowerCase());
    if (!row) return { hood, available: false, reason: 'row missing from audit' };
    const old = previous.get(hood.toLowerCase());
    const measured = {};
    for (const key of metrics) {
      const value = row[key];
      if (value === undefined || value === null || value === '') continue;
      const prior = old && old[key];
      const numeric = Number(value), priorNumeric = Number(prior);
      measured[key] = {
        value,
        previous: prior === undefined || prior === null || prior === '' ? null : prior,
        change: prior !== undefined && prior !== null && prior !== '' &&
          Number.isFinite(numeric) && Number.isFinite(priorNumeric) ? numeric - priorNumeric : null,
      };
    }
    return { hood, available: true, measured, sourceRef: 'engine_audit snapshots.Neighborhood_Map' };
  });
  return { available: neighborhoods.every(n => n.available), district, neighborhoods,
    previousCycleAvailable: !!earlier };
}

function eventOverview(ev, cycle) {
  return {
    eventId: ev.eventId, status: ev.status, occurredCycle: ev.occurredCycle,
    ageCycles: Number(cycle) - ev.occurredCycle, category: ev.category,
    significance: ev.significance, hoods: ev.hoods,
    citywideRelevance: ev.citywideRelevance, sourceRef: ev.sourceRef,
    fact: ev.facts[0] || '', retrievalKey: 'event/' + ev.eventId,
  };
}

function makeBrief({ root, cycle, office, pack, audit }) {
  const view = loadEventView(root, cycle);
  const relevant = eventsForSeat(view, office);
  const ownDistrict = /^D\d$/.test(String(office.district || '')) ? office.district : null;
  const selected = pack.pulse && pack.pulse.initiative || null;
  const board = (pack.game && pack.game.board) || [];
  const start = board.length ? parseInt(sha(String(cycle) + ':' + String(office.officeId)).slice(0, 8), 16) % board.length : 0;
  const page = board.length <= 8 ? board.slice() : Array.from({ length: 8 }, (_, n) => board[(start + n) % board.length]);
  if (selected && !page.some(b => b.id === selected)) {
    const selectedRow = board.find(b => b.id === selected);
    if (selectedRow) page[page.length - 1] = selectedRow;
  }
  const earlier = priorAudit(root, cycle);
  const districts = ownDistrict ? [ownDistrict] : Array.from({ length: 9 }, (_, n) => 'D' + (n + 1));
  const state = Object.fromEntries(districts.map(d => [d, districtState(audit, earlier, d)]));
  const evidence = {
    event: Object.fromEntries(relevant.map(e => [e.eventId, e])),
    district: state,
    project: Object.fromEntries(board.filter(b => b.id).map(b => [b.id, b])),
    budget: {
      authority: {
        officeId: office.officeId || null, district: office.district || null,
        categories: ((pack.game || {}).categories || {}).list || [],
        resourceBalance: null, resourceBalanceAvailable: false,
        note: 'Category bands are filing constraints. Spendable treasury balance requires typed current allocation evidence.',
      },
    },
    prior: Object.fromEntries((((pack.game || {}).lastMove || {}).moves || [])
      .filter(m => m.moveId).map(m => [m.moveId, m])),
  };
  const currentOutcomes = loadOutcomeFeed(root, cycle);
  const outcomeFeeds = [currentOutcomes].filter(x => x.available);
  const myOutcomes = outcomeFeeds.flatMap(x => x.officialFeedback || [])
    .filter(x => x.officeId === office.officeId);
  for (const outcome of myOutcomes) evidence.prior[outcome.actionId] = outcome;
  const boardPage = page.map(b => ({ ...b, retrievalKey: 'project/' + b.id }));
  const freshness = {
    ...view.generation,
    statement: view.generation.issues.length
      ? 'Event coverage unavailable or incomplete; absence of a listed event does not mean no news.'
      : 'Events reflect the saved export as of its refresh watermark; later same-Cycle events require a new export.',
  };
  const brief = {
    version: 'CIVIC-BRIEF/2', cycle: Number(cycle), generation: freshness,
    sections: {
      events: {
        available: relevant.length > 0 || view.generation.issues.length === 0,
        items: relevant.slice(0, 8).map(e => eventOverview(e, cycle)),
        omittedCount: Math.max(0, relevant.length - 8),
        retrievalKeys: relevant.map(e => 'event/' + e.eventId),
      },
      measuredState: {
        districts: Object.values(state).map(s => ({ district: s.district, available: s.available,
          retrievalKey: 'district/' + s.district,
          neighborhoods: (s.neighborhoods || []).map(n => ({ hood: n.hood, available: n.available,
            measured: n.measured || null })) })),
        previousCycleAvailable: !!earlier,
      },
      commitments: {
        priorMoves: (((pack.game || {}).lastMove || {}).moves || []).map(m => ({
          moveId: m.moveId, type: m.type, status: m.status, cycle: m.cycle,
          retrievalKey: 'prior/' + m.moveId })),
        evidenceAvailable: ((pack.game || {}).lastMove || {}).available !== false,
        outcomeFeedAvailable: outcomeFeeds.length > 0,
        actionOutcomes: myOutcomes,
      },
      opportunities: {
        board: boardPage, omittedCount: Math.max(0, board.length - page.length),
        boardRetrievalKeys: board.filter(b => b.id).map(b => 'project/' + b.id),
        selectedInitiative: selected, resourceBalanceAvailable: false,
        budgetAuthorityKey: 'budget/authority',
        openChoice: !selected ? 'No selected initiative; a reasoned no-op or a grounded opportunity is available.' : null,
      },
      response: {
        petitionWindow: ((pack.game || {}).petitionPool || {}).window || null,
        complaints: (((pack.game || {}).petitionPool || {}).complaints || []).length,
        participation: (((pack.game || {}).petitionPool || {}).participation || []).length,
        mediaOutcomeAvailable: myOutcomes.some(o => (o.publishedCoverage || []).length > 0),
        committedResponseAvailable: outcomeFeeds.some(f => f.sourceAvailability &&
          f.sourceAvailability.experiences && f.sourceAvailability.reactions),
        committedResponse: myOutcomes.map(o => ({ actionId: o.actionId,
          sampleCount: o.sampleCount, reactions: o.reactions,
          publishedCoverage: o.publishedCoverage })),
        note: 'Response counts require saved experience and reaction receipts, and are not a representative poll. Only published receipts appear as coverage.',
      },
      authorizedActions: {
        categoriesAvailable: ((pack.game || {}).categories || {}).available !== false,
        categoryKeys: (((pack.game || {}).categories || {}).list || []).map(c => c.key),
        detailKey: 'budget/authority',
        note: 'Move validation and later execution decide authority. An accepted request is not an applied outcome.',
      },
    },
  };
  return { brief, evidence };
}

const KINDS = new Set(['event', 'district', 'project', 'budget', 'prior']);
function readBriefEvidence(pack, request) {
  const type = String(request && request.type || '');
  const id = String(request && request.id || '');
  const key = type + '/' + id;
  if (!KINDS.has(type) || !/^[A-Za-z0-9_-]{1,80}$/.test(id))
    return { key, available: false, reason: 'invalid evidence request' };
  const value = pack && pack._briefEvidence && pack._briefEvidence[type] && pack._briefEvidence[type][id];
  if (!value) return { key, available: false, reason: 'not in this seat snapshot' };
  if (value.available === false) return { key, available: false, reason: value.reason || 'source unavailable' };
  return { key, available: true, generationHash: pack.brief && pack.brief.generation.hash, data: value };
}

function promptBrief(pack) {
  if (!pack) return pack;
  const { _briefEvidence, ...visible } = pack;
  return visible;
}

function filterEvidenceDependentMoves(moves, readRounds) {
  const available = new Set((readRounds || []).flatMap(r => r.replies || [])
    .filter(r => r.available && r.key).map(r => r.key));
  const rejected = [];
  const eligible = (moves || []).filter(move => {
    const needs = Array.isArray(move && move.requiresEvidence) ? move.requiresEvidence : [];
    const missing = needs.filter(key => !available.has(key));
    if (!missing.length) return true;
    rejected.push({ move, reason: 'required evidence not retrieved and available: ' + missing.join(', ') });
    return false;
  });
  return { eligible, rejected };
}

module.exports = { makeBrief, readBriefEvidence, promptBrief, filterEvidenceDependentMoves, districtState };
