// Initiative_Tracker ImplementationPhase contract — shared module (S265 civic.14
// Phase 2/3, engine-sheet). One source for the pre-assembly validator AND the
// applyTrackerUpdates write-normalization gate so the two never diverge.
//
// Mirrors docs/mara-vance/INITIATIVE_TRACKER_CONTRACT.md §2 (vocab + intensity),
// §3 (per-Type lifecycle), §5 (drift→canonical variant map). The contract doc +
// the engine's phase02 PHASE_INTENSITY map are the dual source-of-truth; this
// module is the Node-pipeline mirror. When §2/§5 change, this file changes in the
// same spirit (engine rule S250 keep-docs-true). A phase not resolvable here is
// what the engine silently zeroes — the whole point of the contract is to stop a
// non-canonical string from reaching the sheet.

'use strict';

// §2 — the 20 canonical phases and their ripple intensities (the ONLY valid
// ImplementationPhase strings).
const PHASE_INTENSITY = {
  'announced': 0.00,
  'legislation-filed': 0.05,
  'vote-scheduled': 0.00,
  'vote-ready': 0.15,
  'visioning': 0.10,
  'visioning-complete': 0.15,
  'design-phase': 0.20,
  'construction-planning': 0.30,
  'construction-active': 0.80,
  'implementation-active': 0.80,
  'disbursement-active': 1.00,
  'dispatch-live': 1.00,
  'pilot-active': 0.60,
  'pilot_evaluation': 0.60,
  'operational': 0.90,
  'complete': 0.50,
  'stalled': -0.50,
  'blocked': -0.70,
  'suspended': -0.60,
  'defunded': -1.00,
};

const CANONICAL_PHASES = Object.keys(PHASE_INTENSITY);

// §3 — per-Type lifecycle arcs (ordered). The `vote` arc branches after
// vote-ready into one of the operational phases; modeled as an array of valid
// successors at that step.
const LIFECYCLE = {
  vote: [
    'announced', 'legislation-filed', 'vote-scheduled', 'vote-ready',
    ['implementation-active', 'disbursement-active', 'dispatch-live', 'pilot-active'],
    'operational', 'complete',
  ],
  visioning: [
    'visioning', 'visioning-complete', 'design-phase', 'construction-planning',
    'construction-active', 'operational', 'complete',
  ],
  program: [
    'announced', 'legislation-filed', 'pilot-active', 'pilot_evaluation',
    'operational', 'complete',
  ],
};

// Negative phases — enterable from any active phase, exited back to the arc.
const NEGATIVE_PHASES = ['stalled', 'blocked', 'suspended', 'defunded'];

// §5 — explicit drift→canonical variant map. Primary normalization path (auditable).
// Includes the contract §5 entries + the real C96/C97 observed drifts. Extend as
// encountered; reflect additions in the contract doc §5 (dual source-of-truth).
const VARIANT_MAP = {
  'phase-two-activation': 'implementation-active',
  'rollout-active': 'implementation-active',
  'retail-recovery': 'implementation-active',
  'expansion': 'implementation-active',
  'parcel-close': 'construction-planning',
  'groundbreaking-authorization': 'construction-planning',
  'groundbreaking-planning': 'construction-planning',
  'phase-ii-technical-eval': 'design-phase',
  'technical-evaluation': 'design-phase',
  'design-development-active': 'design-phase',                 // C96 real drift
  'active-construction-phase-2-planning': 'construction-planning', // C96 real drift
  'disbursement-recovery': 'disbursement-active',              // C98 G-R1 (mayor INIT-001)
  'implementation': 'implementation-active',
};

// Conservative token fallback (the engine's partial-match, made explicit). Each
// token maps to the LOWEST-intensity canonical phase carrying it, so a partial
// guess never over-states the ripple — flagged 'partial' (low confidence) for
// operator review. Ordered: most-specific / negative first.
const PHASE_TOKENS = [
  [/defund/, 'defunded'],
  [/block/, 'blocked'],
  [/suspend|paused?/, 'suspended'],
  [/stall/, 'stalled'],
  [/disburs/, 'disbursement-active'],
  [/dispatch|crews?|on-the-street/, 'dispatch-live'],
  [/pilot/, 'pilot-active'],
  [/construction/, 'construction-planning'],
  [/implement|rollout|deploy/, 'implementation-active'],
  [/design|engineering/, 'design-phase'],
  [/visioning/, 'visioning'],
  [/legislation|filed/, 'legislation-filed'],
  [/vote-?ready/, 'vote-ready'],
  [/vote-?sched/, 'vote-scheduled'],
  [/operational|steady/, 'operational'],
  [/complete|delivered/, 'complete'],
  [/announce/, 'announced'],
];

function normKey(raw) {
  return String(raw == null ? '' : raw).trim().toLowerCase();
}

function isCanonical(raw) {
  return Object.prototype.hasOwnProperty.call(PHASE_INTENSITY, normKey(raw));
}

function intensityOf(phase) {
  var k = normKey(phase);
  return Object.prototype.hasOwnProperty.call(PHASE_INTENSITY, k) ? PHASE_INTENSITY[k] : null;
}

// Resolve a raw ImplementationPhase to a canonical §2 value.
// Returns { canonical, how, original } where how is:
//   'exact'   — already canonical
//   'variant' — mapped via the explicit §5 variant map (high confidence)
//   'partial' — mapped via a contained canonical substring or a token (review it)
//   'none'    — unresolvable; this is what the engine would zero (hard violation)
function canonicalizePhase(raw) {
  var original = raw == null ? '' : String(raw);
  var k = normKey(raw);
  if (!k) return { canonical: null, how: 'none', original: original };
  if (Object.prototype.hasOwnProperty.call(PHASE_INTENSITY, k)) {
    return { canonical: k, how: 'exact', original: original };
  }
  if (Object.prototype.hasOwnProperty.call(VARIANT_MAP, k)) {
    return { canonical: VARIANT_MAP[k], how: 'variant', original: original };
  }
  // contained canonical phase as a substring (engine partial-match), longest first
  var contained = CANONICAL_PHASES
    .filter(function (p) { return k.indexOf(p) >= 0; })
    .sort(function (a, b) { return b.length - a.length; });
  if (contained.length) return { canonical: contained[0], how: 'partial', original: original };
  // token fallback
  for (var i = 0; i < PHASE_TOKENS.length; i++) {
    if (PHASE_TOKENS[i][0].test(k)) return { canonical: PHASE_TOKENS[i][1], how: 'partial', original: original };
  }
  return { canonical: null, how: 'none', original: original };
}

// The valid next phase(s) for a given current phase under a Type's arc. Returns
// an array (the vote arc branches after vote-ready). [] if current is terminal,
// unknown, or a negative phase. Informational — used to sanity-check advances.
function nextPhase(current, type) {
  var arc = LIFECYCLE[normKey(type)];
  if (!arc) return [];
  var cur = normKey(current);
  for (var i = 0; i < arc.length; i++) {
    var step = arc[i];
    var matchesHere = Array.isArray(step) ? step.indexOf(cur) >= 0 : step === cur;
    if (matchesHere) {
      var nxt = arc[i + 1];
      if (nxt == null) return [];
      return Array.isArray(nxt) ? nxt.slice() : [nxt];
    }
  }
  return [];
}

// civic.38 Task 4 step 0 — the closed intervention catalog. A seat proposing a
// row names a KEY from here and nothing else: the seat never names its own
// metric. One catalog, shared by every script gate (cron-civic-run,
// validateTrackerUpdates, applyTrackerUpdates, buildCivicOfficeSlice), so the
// gates cannot drift. lib/ is claspignored: when the engine's stage-3 check
// lands (Task 4 step 1) it carries a mirror, pinned to this table by a parity
// test in the same cut.
//
// Entry: { label, policyDomain, type, effectChannel, stage3Metric, playable }
//   policyDomain — one of createInitiative POLICY_DOMAINS; also selects the
//                  engine's DOMAIN_EFFECTS row.
//   type         — createInitiative Type; picks the LIFECYCLE arc and opening phase.
//   effectChannel— the code path that carries the initiative to the metric TODAY.
//   stage3Metric — { tab, column, direction, scope }: what must move the right way
//                  from the vote-time baseline for the row to reach Delivering.
//   playable     — true only where effectChannel exists in code. A gate whose
//                  input the initiative cannot move is a trick (SIM_DOCTRINE §15),
//                  so safety and housing are listed and refused until their engine
//                  levers land (housing first — builder ruling 2026-09-20).
// Environment is deliberately absent: no stage-3 metric has been ruled for it.
// The metrics on the two non-playable entries are provisional — the engine row
// that builds each lever fixes its column.
const INTERVENTION_CATALOG = {
  'health-service': {
    label: 'Clinic, health center or care program',
    policyDomain: 'health', type: 'vote', playable: true,
    effectChannel: 'S.initiativeHealthRelief → updateNeighborhoodDemographics_ illness relief (delivering phases only)',
    stage3Metric: { tab: 'Neighborhood_Demographics', column: 'Sick', direction: 'down', scope: 'hood' },
  },
  'transit-project': {
    label: 'Station, line or transit hub',
    policyDomain: 'transit', type: 'visioning', playable: true,
    effectChannel: 'S.initiativeImplementationEffects.transit → updateTransitMetrics_ (open phases lift the station)',
    stage3Metric: { tab: 'Transit_Metrics', column: 'RidershipVolume', direction: 'up', scope: 'station-serving-hood' },
  },
  'school-program': {
    label: 'School funding or education program',
    policyDomain: 'education', type: 'program', playable: true,
    effectChannel: 'S.initiativeNeighborhoodEffects.schoolQuality → driftNeighborhoodEducation_ (live since engine.250)',
    stage3Metric: { tab: 'Neighborhood_Demographics', column: 'SchoolQualityIndex', direction: 'up', scope: 'hood' },
  },
  'economic-program': {
    label: 'Business support, stabilization or economic development fund',
    policyDomain: 'economic', type: 'vote', playable: true,
    effectChannel: 'S.initiativeNeighborhoodEffects.retail → applyCityDynamics_ fold → Neighborhood_Map; phase transitions → applyBusinessDynamics_ (engine.250)',
    stage3Metric: { tab: 'Neighborhood_Map', column: 'RetailVitality', direction: 'up', scope: 'hood' },
  },
  'workforce-program': {
    label: 'Jobs, apprenticeship or training pipeline',
    policyDomain: 'workforce', type: 'program', playable: true,
    effectChannel: 'S.initiativeNeighborhoodEffects.retail → applyCityDynamics_ fold → Neighborhood_Map; phase transitions → applyBusinessDynamics_ (engine.250)',
    stage3Metric: { tab: 'Neighborhood_Map', column: 'RetailVitality', direction: 'up', scope: 'hood' },
  },
  'sports-district': {
    label: 'Stadium or sports-district development',
    policyDomain: 'sports', type: 'vote', playable: true,
    effectChannel: 'S.initiativeNeighborhoodEffects.retail/nightlife → applyCityDynamics_ fold → Neighborhood_Map',
    // builder ruling 2026-09-20 (INIT-006): district retail/nightlife activity vs baseline
    stage3Metric: { tab: 'Neighborhood_Map', column: ['RetailVitality', 'NightlifeProfile'], direction: 'up', scope: 'hood' },
  },
  'safety-program': {
    label: 'Public safety or alternative response program',
    policyDomain: 'safety', type: 'vote', playable: false,
    effectChannel: null,   // no initiative path reaches a Crime_Metrics column
    stage3Metric: { tab: 'Crime_Metrics', column: 'ViolentLevel', direction: 'down', scope: 'hood' },
  },
  'housing-program': {
    label: 'Rent relief, tenant protection or housing construction',
    policyDomain: 'housing', type: 'vote', playable: false,
    effectChannel: null,   // no writer of MonthlyRent reads an initiative
    stage3Metric: { tab: 'Household_Ledger', column: 'MonthlyRent*12/HouseholdIncome', direction: 'down', scope: 'hood' },
  },
};

module.exports = {
  INTERVENTION_CATALOG,
  PHASE_INTENSITY,
  CANONICAL_PHASES,
  LIFECYCLE,
  NEGATIVE_PHASES,
  VARIANT_MAP,
  isCanonical,
  intensityOf,
  canonicalizePhase,
  nextPhase,
};
