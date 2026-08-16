'use strict';

/**
 * civic.22 — mint an Initiative_Tracker row any seated mayor/council office can author.
 * Node mirror of createInitiative_ (engine drop-in: scripts/createInitiative_.engine.js).
 * Does not write a sheet. LeadFaction comes from the proposing seat, never a default OPP.
 */

const path = require('path');
const C = require('../lib/initiativePhaseContract');
const { CANONICAL_HOODS } = require('../lib/canonNeighborhoods');

const AUTHORSHIP_HEADERS = ['Proposer', 'ProposingOffice', 'ProposedCycle'];

const TRACKER_HEADERS_31 = [
  'InitiativeID', 'Name', 'Type', 'Status', 'Budget',
  'VoteRequirement', 'VoteCycle', 'Projection', 'LeadFaction', 'OppositionFaction',
  'SwingVoter', 'Outcome', 'SwingVoter2', 'SwingVoter2Lean', 'Consequences',
  'Notes', 'LastUpdated', 'AffectedNeighborhoods', 'PolicyDomain',
  'MayoralAction', 'MayoralActionCycle', 'VetoReason', 'OverrideVoteCycle', 'OverrideOutcome',
  'ImplementationPhase', 'MilestoneNotes', 'NextScheduledAction', 'NextActionCycle',
  'Proposer', 'ProposingOffice', 'ProposedCycle',
];

const POLICY_DOMAINS = [
  'health', 'transit', 'economic', 'housing', 'safety',
  'sports', 'workforce', 'environment', 'education',
];

const AUTHOR_OFFICE = /^(MAYOR-01|COUNCIL-D[1-9])$/;
const TYPES = ['vote', 'visioning', 'program'];

function openingPhase(type) {
  const arc = C.LIFECYCLE[type];
  if (!arc) throw new Error('createInitiative: unknown Type "' + type + '"');
  const first = arc[0];
  return Array.isArray(first) ? first[0] : first;
}

function nextInitiativeId(rows) {
  let max = 0;
  (rows || []).forEach(function (r) {
    const m = String(r.InitiativeID || r[0] || '').match(/^INIT-(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  });
  const n = max + 1;
  if (n < 1) throw new Error('createInitiative: could not mint InitiativeID');
  return 'INIT-' + String(n).padStart(3, '0');
}

function requireAuthorshipHeaders(headers) {
  const missing = AUTHORSHIP_HEADERS.filter(function (h) {
    return (headers || []).indexOf(h) < 0;
  });
  if (missing.length) {
    throw new Error('createInitiative: tracker missing authorship headers: ' + missing.join(', '));
  }
}

function parseHoods(raw) {
  return String(raw || '')
    .split(',')
    .map(function (n) { return n.trim(); })
    .filter(Boolean);
}

function resolveSeat(seats, proposingOffice) {
  const office = String(proposingOffice || '').trim();
  if (!AUTHOR_OFFICE.test(office)) {
    throw new Error('createInitiative: proposingOffice must be MAYOR-01 or COUNCIL-D1..D9, got "' + office + '"');
  }
  const seat = (seats || []).find(function (s) { return s.officeId === office; });
  if (!seat) throw new Error('createInitiative: unknown proposingOffice ' + office);
  const status = String(seat.status || 'active').toLowerCase();
  if (status === 'vacant') {
    throw new Error('createInitiative: vacant seat cannot author (' + office + ')');
  }
  return seat;
}

function createInitiative(opts) {
  const headers = (opts && opts.headers) || TRACKER_HEADERS_31;
  const rows = (opts && opts.rows) || [];
  const seats = (opts && opts.seats) || [];
  const spec = (opts && opts.spec) || {};

  requireAuthorshipHeaders(headers);

  const name = String(spec.name || '').trim();
  if (!name) throw new Error('createInitiative: name required');

  const type = String(spec.type || '').trim().toLowerCase();
  if (TYPES.indexOf(type) < 0) {
    throw new Error('createInitiative: type must be vote|visioning|program');
  }

  const domain = String(spec.policyDomain || '').trim().toLowerCase();
  if (POLICY_DOMAINS.indexOf(domain) < 0) {
    throw new Error('createInitiative: policyDomain must be one of ' + POLICY_DOMAINS.join(', '));
  }

  const hoods = parseHoods(spec.affectedNeighborhoods);
  if (!hoods.length) throw new Error('createInitiative: AffectedNeighborhoods required');
  hoods.forEach(function (h) {
    if (!CANONICAL_HOODS.has(h.toLowerCase())) {
      throw new Error('createInitiative: non-canon neighborhood "' + h + '"');
    }
  });

  const cycle = Number(spec.proposedCycle);
  if (!Number.isFinite(cycle) || cycle < 1) {
    throw new Error('createInitiative: proposedCycle must be a positive cycle number');
  }

  const seat = resolveSeat(seats, spec.proposingOffice);
  const holder = String(seat.holder || '').trim();
  if (spec.proposer && String(spec.proposer).trim() !== holder) {
    throw new Error('createInitiative: proposer "' + spec.proposer + '" does not match holder "' + holder + '"');
  }
  const faction = String(seat.faction || '').trim().toUpperCase();
  if (!faction || faction === 'STAFF') {
    throw new Error('createInitiative: seat has no authoring faction');
  }

  const row = {};
  headers.forEach(function (h) { row[h] = ''; });
  row.InitiativeID = nextInitiativeId(rows);
  row.Name = name;
  row.Type = type;
  row.Status = 'proposed';
  row.Budget = spec.budget != null ? String(spec.budget) : '';
  row.LeadFaction = faction;
  row.AffectedNeighborhoods = hoods.join(', ');
  row.PolicyDomain = domain;
  row.MayoralAction = 'none';
  row.ImplementationPhase = openingPhase(type);
  row.NextScheduledAction = spec.nextScheduledAction != null
    ? String(spec.nextScheduledAction)
    : 'legislation-filed';
  row.NextActionCycle = String(cycle);
  row.Notes = spec.notes != null ? String(spec.notes) : '';
  row.MilestoneNotes = '';
  row.Proposer = holder;
  row.ProposingOffice = seat.officeId;
  row.ProposedCycle = String(cycle);

  const values = headers.map(function (h) { return row[h]; });
  return { row: row, values: values, headers: headers.slice() };
}

function loadOfficeSeats(mapPath) {
  const p = mapPath || path.join(__dirname, 'civic-office-map.json');
  const map = require(p);
  return (map.offices || []).map(function (o) {
    return {
      officeId: o.officeId,
      holder: o.holder,
      faction: o.faction,
      district: o.district,
      popid: o.popid,
      status: 'active',
    };
  });
}

module.exports = {
  AUTHORSHIP_HEADERS,
  TRACKER_HEADERS_31,
  POLICY_DOMAINS,
  openingPhase,
  nextInitiativeId,
  requireAuthorshipHeaders,
  createInitiative,
  loadOfficeSeats,
};
