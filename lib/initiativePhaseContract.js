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
//                  Every seat-proposed row mints as `vote`: the stage model's Funded
//                  clears on a vote passing, and the visioning / program arcs have no
//                  vote step. After passage a built project holds construction phases
//                  under Type vote, as INIT-005 and INIT-006 do on the live tracker.
//                  visioning / program stay valid Types for rows a seat did not propose.
//   effectChannel— the code path that carries the initiative to the metric TODAY.
//   stage3Metric — { tab, column, direction, scope }: what must move the right way
//                  from the vote-time baseline for the row to reach Delivering.
//   playable     — true only where effectChannel exists in code. A gate whose
//                  input the initiative cannot move is a trick (SIM_DOCTRINE §15),
//                  so safety and housing are listed and refused until their engine
//                  levers land (housing first — builder ruling 2026-09-20).
// economic, workforce and sports are listed and refused since the 2026-09-21
// matched-control bench pair (output/engine-sheet/2026-09-21-matched-control-c108-c112.json,
// builder ruling (b)): an economic program at full strength moved its hood's
// RetailVitality by nothing distinguishable from noise — untreated hoods differed
// between the two arms by a median 0.46 points from the random draw order alone.
// Code that carries an effect is not a lever if the effect cannot open the gate.
// They turn playable again when engine.252 gives each a channel that can, or a
// gate metric a program actually moves.
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
    policyDomain: 'transit', type: 'vote', playable: true,
    effectChannel: 'S.initiativeImplementationEffects.transit → updateTransitMetrics_ (open phases lift the station)',
    stage3Metric: { tab: 'Transit_Metrics', column: 'RidershipVolume', direction: 'up', scope: 'station-serving-hood' },
  },
  'school-program': {
    label: 'School funding or education program',
    policyDomain: 'education', type: 'vote', playable: true,
    effectChannel: 'S.initiativeNeighborhoodEffects.schoolQuality → driftNeighborhoodEducation_ (live since engine.250)',
    stage3Metric: { tab: 'Neighborhood_Demographics', column: 'SchoolQualityIndex', direction: 'up', scope: 'hood' },
  },
  'economic-program': {
    label: 'Business support, stabilization or economic development fund',
    policyDomain: 'economic', type: 'vote', playable: false,
    effectChannel: null,   // a channel exists in code but is too weak to open this gate — measured 2026-09-21, see WEAK_CHANNELS
    stage3Metric: { tab: 'Neighborhood_Map', column: 'RetailVitality', direction: 'up', scope: 'hood' },
  },
  'workforce-program': {
    label: 'Jobs, apprenticeship or training pipeline',
    policyDomain: 'workforce', type: 'vote', playable: false,
    effectChannel: null,   // a channel exists in code but is too weak to open this gate — measured 2026-09-21, see WEAK_CHANNELS
    stage3Metric: { tab: 'Neighborhood_Map', column: 'RetailVitality', direction: 'up', scope: 'hood' },
  },
  'sports-district': {
    label: 'Stadium or sports-district development',
    policyDomain: 'sports', type: 'vote', playable: false,
    effectChannel: null,   // a channel exists in code but is too weak to open this gate — measured 2026-09-21, see WEAK_CHANNELS
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

// civic.38 Task 4 step 1 — the stage model. Machine state lives in columns
// (mechanism decision 2): seven on Initiative_Tracker, self-armed by the engine's
// ensureInitiativeStageColumns_ on the cycle path.
//   Stage                — '' | Proposed | Funded | Standing | Delivering
//   StageBaseline        — versioned JSON descriptor of the stage-3 observation
//   LastStageChangeCycle — engine-written; the ONLY clock a staged row runs on
//   LastWorkCycle / LastWorkSeat — gate-written by the Sunday fold (Task 2)
//   PriorPhase           — engine-written on first stall entry (step 3)
//   StageHold            — engine-written JSON: the Delivering streak, first-delivered
//                          and last-regress Cycles, and `st` — the Cycle the row entered
//                          `stalled` (0 = not stalled). Kept OUT of StageBaseline so the
//                          baseline cell is written once and never again (ruling 4)
// Stage names the row's CURRENT stage (a Delivering row can regress to Standing;
// ever-delivered lives in StageHold.first). A blank Stage is a legacy
// row the stage model never touches — so a seat-proposed row mints as `Proposed`,
// never blank, or "new and pre-vote" would be indistinguishable from "legacy".
const STAGE_COLUMNS = ['Stage', 'StageBaseline', 'LastStageChangeCycle', 'LastWorkCycle', 'LastWorkSeat', 'PriorPhase', 'StageHold'];
const STAGES = ['Proposed', 'Funded', 'Standing', 'Delivering'];

// ---------------------------------------------------------------------------
// civic.38 Task 4 step 4 — the six-row legacy conversion (plan §Task 4 step 4,
// rulings 4/12, open-question rulings on INIT-003 and INIT-006). One explicit
// entry per live row, keyed by InitiativeID, never inferred from a phase or a
// populated VoteCycle (INIT-003 shows Outcome COMPLETED on a visioning row that
// never had a council passage; INIT-007 runs `operational` with no vote).
// The conversion sets Stage + LastStageChangeCycle only; the engine stamps a
// `conversion` baseline at the next fire (ruling 12). Rows the machine cannot
// judge are left unstaged on purpose — a Stage with no working exit is a trick
// (SIM_DOCTRINE §15):
//   INIT-006 Baylight  — sports is not playable and the Phase-2 construction
//                        handler (engine.131 T7) yields on any staged row
//                        (ruling 24): staged, it would deadlock in construction.
//   INIT-007 Apprenticeship — `announced`, never voted; every stage operation
//                        (step, deliver, stall, revive) reads passed+signed, so a
//                        Stage on it would never move.
// `signAtConversion`: INIT-001 (C78) and INIT-005 (C80) passed before the v1.7
// mayoral-action step existed, so MayoralAction reads `none` on two of the
// mayor's own bills that have been in service since. Every stage operation is
// gated on passed+signed (ruling 6); staged as-is they would be immune to
// delivery, stall and revival. The conversion records the signing at the vote
// Cycle and says so in MilestoneNotes — a fact the world already lived, made
// legible, never erased.
const LEGACY_STAGE_CONVERSION = {
  'INIT-001': { stage: 'Standing', signAtConversion: true,  why: 'Stabilization Fund, disbursement-active since C78 (economic — not playable, no Delivering gate yet; the untended clock still runs)' },
  'INIT-002': { stage: 'Standing', signAtConversion: false, why: 'OARI, dispatch-live, signed C82 (safety — not playable until the safety lever lands; the untended clock still runs)' },
  'INIT-003': { stage: 'Proposed', petitionPending: true,   why: 'Fruitvale transit hub never had a council vote (builder ruling 2026-09-21): petition-pending, history kept, vote via petition band or a call-vote move' },
  'INIT-005': { stage: 'Standing', signAtConversion: true,  why: 'Temescal health center, construction-active since C80 (health — playable; delivers once a treating phase moves hood Sick against its conversion baseline)' },
  'INIT-006': { stage: null,       why: 'Baylight stays unstaged: sports not playable and T7 owns its construction phase (ruling 24)' },
  'INIT-007': { stage: null,       why: 'Apprenticeship stays unstaged: announced, never voted — no stage operation could ever act on it' },
};

// Pure: one live row object (header-keyed) + the conversion Cycle → the field
// updates to write, or null when the row is left alone. Idempotent: a row that
// already carries the target Stage returns null, so a rerun writes nothing.
// Throws on an InitiativeID the table does not name — a seventh row is a
// decision, not a default.
function legacyStageConversion(row, cycle) {
  var id = String((row && row.InitiativeID) || '').trim();
  var rule = LEGACY_STAGE_CONVERSION[id];
  if (!rule) throw new Error('legacyStageConversion: no ruling for ' + (id || '(blank InitiativeID)'));
  var c = Number(cycle);
  if (!Number.isInteger(c) || c < 1) throw new Error('legacyStageConversion: bad cycle ' + cycle);
  if (!rule.stage) return null;
  var currentStage = String(row.Stage == null ? '' : row.Stage).trim();
  if (currentStage) return null; // already converted (or minted staged) — never restage
  var notes = String(row.MilestoneNotes == null ? '' : row.MilestoneNotes).trim();
  var lines = [];
  var updates = { Stage: rule.stage, LastStageChangeCycle: c };
  if (rule.signAtConversion) {
    var ma = String(row.MayoralAction == null ? '' : row.MayoralAction).trim().toLowerCase();
    if (ma !== 'signed') {
      var voteCycle = Number(row.VoteCycle);
      if (!Number.isInteger(voteCycle) || voteCycle < 1) throw new Error('legacyStageConversion: ' + id + ' has no VoteCycle to sign at');
      updates.MayoralAction = 'signed';
      updates.MayoralActionCycle = voteCycle;
      lines.push('C' + c + ' conversion: passed C' + voteCycle + ' before the mayoral-action step existed; the mayor\'s own bill, recorded signed at C' + voteCycle + '.');
    }
  }
  if (rule.petitionPending) {
    var hist = [];
    if (String(row.VoteCycle == null ? '' : row.VoteCycle).trim()) hist.push('VoteCycle ' + String(row.VoteCycle).trim());
    if (String(row.Outcome == null ? '' : row.Outcome).trim()) hist.push('Outcome ' + String(row.Outcome).trim());
    if (String(row.Status == null ? '' : row.Status).trim()) hist.push('Status ' + String(row.Status).trim());
    lines.push('C' + c + ' conversion: no council passage on record (' + (hist.join(', ') || 'no history') + ') — enters petition-pending; history above kept, VoteCycle cleared.');
    updates.Status = 'proposed';
    updates.VoteCycle = '';
  }
  lines.push('C' + c + ' conversion: Stage ' + rule.stage + ' — ' + rule.why + '.');
  updates.MilestoneNotes = (notes ? notes + '\n' : '') + lines.join('\n');
  return updates;
}

// The machine-read subset of the catalog, keyed by policyDomain — the only
// thing a tracker row carries (there is no intervention-key column). This is
// what the engine mirrors (CIVIC_STAGE_CATALOG_ in civicInitiativeEngine.js);
// label / effectChannel prose stays Node-side so a wording edit never forces
// an engine deploy. `column` is always an array: sports-district reads two.
function stageCatalogByDomain() {
  var out = {};
  Object.keys(INTERVENTION_CATALOG).forEach(function (key) {
    var e = INTERVENTION_CATALOG[key];
    var m = e.stage3Metric;
    out[e.policyDomain] = {
      playable: e.playable === true,
      stage3Metric: {
        tab: m.tab,
        column: Array.isArray(m.column) ? m.column.slice() : [m.column],
        direction: m.direction,
        scope: m.scope,
      },
    };
  });
  return out;
}

// The shared stage-requirement helper: ONE rule set for the seat pack and the
// engine. Pure — `metricMoved` is computed by the caller (the engine off the
// sheet, the pack off the dump). The body below is mirrored verbatim as
// civicStageRequirement_ in the engine; lib/initiativePhaseContract.test.js (stage parity block) runs
// both over one fixture matrix. Change one, change both, in the same commit.
//
// input  { stage, phase, policyDomain, lastWorkCycle, lastStageChangeCycle, metricMoved }
// output null for a legacy row (blank Stage), else
//        { stage, next, clears, moveThatClears, blocked, text }
//   next           — the stage the row moves to when `clears` is true; null = none
//   moveThatClears — the seat move that satisfies the gate; null = no seat move does
//   blocked        — why no gate can clear right now; null = the gate is live
function stageRequirementWith(catalogByDomain, input) {
  var inp = input || {};
  var stage = String(inp.stage == null ? '' : inp.stage).trim();
  if (!stage) return null;
  var phase = String(inp.phase == null ? '' : inp.phase).trim().toLowerCase();
  var out = { stage: stage, next: null, clears: false, moveThatClears: null, blocked: null, text: '' };

  if (['Proposed', 'Funded', 'Standing', 'Delivering'].indexOf(stage) < 0) {
    out.blocked = 'unknown-stage';
    out.text = stage + ' — not a stage this model knows';
    return out;
  }
  // A negative phase wins over the stage: nothing advances while the row is down.
  if (phase === 'stalled') {
    out.blocked = 'stalled';
    out.moveThatClears = 'work';
    out.text = 'stalled — one work move revives it';
    return out;
  }
  if (phase === 'blocked' || phase === 'suspended' || phase === 'defunded') {
    out.blocked = phase;
    out.text = phase + ' — no seat move revives it';
    return out;
  }
  if (stage === 'Proposed') {
    out.next = 'Funded';
    out.text = 'Proposed — a passed council vote funds it';
    return out;
  }
  if (stage === 'Funded') {
    var work = Number(inp.lastWorkCycle);
    var since = Number(inp.lastStageChangeCycle);
    out.next = 'Standing';
    out.moveThatClears = 'work';
    // >= on purpose. The Sunday fold stamps LastWorkCycle with the CLOSING Cycle's
    // number (cron-civic-run.js foldMovesIntoDecisions), and the chain for Cycle N
    // always runs after fire N. So a row funded at fire N whose work is stamped N
    // DID get that work after it was funded; a strict > would cost every row a Cycle.
    // Work from an earlier week is stamped N-1 or lower and still cannot clear.
    out.clears = isFinite(work) && isFinite(since) && work > 0 && since > 0 && work >= since;
    out.text = out.clears
      ? 'Funded — work landed; it stands up next Cycle'
      : 'Funded — one work move stands it up';
    return out;
  }
  if (stage === 'Standing') {
    var entry = catalogByDomain[String(inp.policyDomain == null ? '' : inp.policyDomain).trim().toLowerCase()];
    if (!entry || entry.playable !== true) {
      out.blocked = 'no-delivering-gate';
      out.text = 'Standing — no delivering gate exists for this domain yet';
      return out;
    }
    var m = entry.stage3Metric;
    // A gate whose metric the engine cannot read yet is not a live gate: say so,
    // and the losing clock stays off it (ruling 3 — no clock on an unbuilt exit).
    if (m.scope !== 'hood') {
      out.blocked = 'no-delivering-reader';
      out.text = 'Standing — the delivering gate for this domain cannot be read yet';
      return out;
    }
    out.next = 'Delivering';
    out.clears = inp.metricMoved === true;
    out.text = 'Standing — delivers when ' + m.column.join(' + ') + ' moves ' + m.direction + ' against its baseline';
    return out;
  }
  out.text = 'Delivering — the service is reaching people; it slips back to Standing if the metric stops holding';
  return out;
}

function stageRequirement(input) {
  return stageRequirementWith(stageCatalogByDomain(), input);
}

// civic.38 Task 4 — upkeep (plan §Delivered is not forever, rulings c/e/g). A
// delivered service is not permanent: a row at Standing or Delivering pays
// phase intensity x this factor. "Untended since" is the later of the last work
// move and the last stage change (a stand-up is its own first tending; ruling e:
// tending resets, a stage change also resets). Full strength inside the grace,
// then LINEAR decay per Cycle to the floor — never geometric, so the builder's
// three dials read as plain Cycles. No reference Cycle => no decay: neglect that
// cannot be measured is not charged. Mirrored by civicTendFactor_ in
// phase02-world-state/applyInitiativeImplementationEffects.js (parity-tested).
const TEND_STAGES = ['Standing', 'Delivering'];
function tendFactor(t) {
  t = t || {};
  var out = { factor: 1, untended: 0, reference: 0 };
  if (TEND_STAGES.indexOf(String(t.stage == null ? '' : t.stage).trim()) < 0) return out;
  var cycle = Number(t.cycle);
  if (!isFinite(cycle) || cycle < 1) return out;
  var work = Number(t.lastWorkCycle);
  var change = Number(t.lastStageChangeCycle);
  var ref = Math.max(isFinite(work) && work >= 1 ? work : 0, isFinite(change) && change >= 1 ? change : 0);
  if (!(ref >= 1)) return out;
  out.reference = ref;
  out.untended = Math.max(0, cycle - ref);
  var grace = Number(t.grace), decay = Number(t.decay), floor = Number(t.floor);
  if (!isFinite(grace) || !isFinite(decay) || !isFinite(floor)) return out;
  if (out.untended <= grace) return out;
  var f = 1 - decay * (out.untended - grace);
  if (f < floor) f = floor;
  if (f > 1) f = 1;
  if (f < 0) f = 0;
  out.factor = Math.round(f * 10000) / 10000;
  return out;
}

// civic.38 Task 4 (2) — the Delivering comparator. Three PURE functions, each
// mirrored body-text-identical in phase05-citizens/civicInitiativeEngine.js
// (civicStageBaselineFrom_, civicDeliveryEdge_, civicDeliveryHoldStep_) and run
// over one fixture matrix by the parity block. Self-contained on purpose: a body
// that calls a named helper cannot be text-identical across the two files.
//
// A COHORT is one tab's committed observation of one Cycle:
//   { available, reason, cycle, tab, rows: { <parent hood>: { <column>: number } } }
// The engine freezes it at the top of Phase 2 of fire N from rows all stamped
// N-1 (freezeCivicStageCohort_), before any producer of fire N has written.
//
// stageBaselineFrom — ruling 4's descriptor. `cycle` is the OBSERVATION Cycle;
// `captureCycle` is the fire (vote) or the conversion that stamped it. Target
// membership is frozen in `keys` (dropping a weak hood is not delivery); the
// city reference is every hood on the tab, its membership frozen in `city`
// (and its size in `cityN`, kept for readers of the first descriptors).
// input  { origin: 'vote'|'conversion', captureCycle, metric: {tab, column[], direction, scope}, hoods[], cohort }
// output { ok, reason, descriptor }
function stageBaselineFrom(input) {
  var inp = input || {};
  var fail = function (reason) { return { ok: false, reason: reason, descriptor: null }; };
  var metric = inp.metric || {};
  var columns = Array.isArray(metric.column) ? metric.column.slice() : [];
  if (metric.scope !== 'hood' || !columns.length) return fail('no-hood-reader');
  if (metric.direction !== 'up' && metric.direction !== 'down') return fail('bad-direction');
  if (inp.origin !== 'vote' && inp.origin !== 'conversion') return fail('bad-origin');
  var capture = Number(inp.captureCycle);
  if (!isFinite(capture) || capture < 1) return fail('bad-capture-cycle');
  var cohort = inp.cohort || {};
  var obs = Number(cohort.cycle);
  if (cohort.available !== true || cohort.tab !== metric.tab || !cohort.rows || !isFinite(obs) || obs < 1) {
    return fail(cohort.reason || 'cohort-unavailable');
  }
  if (obs > capture) return fail('cohort-from-the-future');
  var hoods = [];
  (inp.hoods || []).forEach(function (h) {
    var name = String(h == null ? '' : h).trim();
    if (name && hoods.indexOf(name) < 0) hoods.push(name);
  });
  hoods.sort();
  if (!hoods.length) return fail('no-target-hoods');
  var num = function (v) {
    return (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && isFinite(Number(v)) ? Number(v) : null;
  };
  var all = Object.keys(cohort.rows).sort();
  var keys = {}, middle = {};
  for (var c = 0; c < columns.length; c++) {
    var col = columns[c], levels = [];
    for (var a = 0; a < all.length; a++) {
      var lv = num((cohort.rows[all[a]] || {})[col]);
      if (lv === null) return fail('city-reading-missing:' + all[a] + '.' + col);
      levels.push(lv);
    }
    levels.sort(function (x, y) { return x - y; });
    var mid = Math.floor(levels.length / 2);
    var med = levels.length % 2 ? levels[mid] : (levels[mid - 1] + levels[mid]) / 2;
    if (!(med > 0)) return fail('city-middle-not-positive:' + col);
    middle[col] = med;
    for (var t = 0; t < hoods.length; t++) {
      if (!Object.prototype.hasOwnProperty.call(cohort.rows, hoods[t])) return fail('target-hood-missing:' + hoods[t]);
      keys[hoods[t]] = keys[hoods[t]] || {};
      keys[hoods[t]][col] = num(cohort.rows[hoods[t]][col]);
    }
  }
  return { ok: true, reason: null, descriptor: {
    v: 1, origin: inp.origin, cycle: obs, captureCycle: capture, tab: metric.tab, columns: columns,
    scope: 'hood', direction: metric.direction, cityN: all.length, city: all, keys: keys, cityMiddle: middle
  } };
}

// deliveryEdge — ruling 5's comparator for ONE observation. Per gate column:
// the mean over the frozen targets of (hood reading / city median), now minus
// at baseline, signed so that positive always means "moved the right way".
// `minEdge` is the weakest column: every gate column must clear together.
// Never compares against the observation the baseline was stamped from.
// output { available, reason, cycle, edges: {col: edge}, minEdge }
function deliveryEdge(baseline, cohort) {
  var fail = function (reason) { return { available: false, reason: reason, cycle: null, edges: null, minEdge: null }; };
  var b = baseline;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || b.v !== 1 || !Array.isArray(b.columns) || !b.columns.length || !b.keys || !b.cityMiddle ||
      (b.direction !== 'up' && b.direction !== 'down') || !isFinite(Number(b.cycle))) return fail('baseline-unavailable');
  var co = cohort || {};
  if (co.available !== true || !co.rows) return fail(co.reason || 'cohort-unavailable');
  if (co.tab !== b.tab) return fail('cohort-tab-mismatch');
  var obs = Number(co.cycle);
  if (!isFinite(obs) || !(obs > Number(b.cycle))) return fail('observation-not-after-baseline');
  var all = Object.keys(co.rows).sort();
  if (isFinite(Number(b.cityN)) && all.length !== Number(b.cityN)) return fail('city-membership-changed');
  if (Array.isArray(b.city) && b.city.join('|') !== all.join('|')) return fail('city-membership-changed');
  var hoods = Object.keys(b.keys).sort();
  if (!hoods.length) return fail('baseline-cohort-empty');
  var num = function (v) {
    return (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && isFinite(Number(v)) ? Number(v) : null;
  };
  var edges = {}, minEdge = null;
  for (var c = 0; c < b.columns.length; c++) {
    var col = b.columns[c], levels = [];
    for (var a = 0; a < all.length; a++) {
      var lv = num((co.rows[all[a]] || {})[col]);
      if (lv === null) return fail('city-reading-missing:' + all[a] + '.' + col);
      levels.push(lv);
    }
    levels.sort(function (x, y) { return x - y; });
    var mid = Math.floor(levels.length / 2);
    var med = levels.length % 2 ? levels[mid] : (levels[mid - 1] + levels[mid]) / 2;
    var baseMed = num(b.cityMiddle[col]);
    if (!(med > 0) || baseMed === null || !(baseMed > 0)) return fail('city-middle-not-positive:' + col);
    var nowSum = 0, baseSum = 0;
    for (var t = 0; t < hoods.length; t++) {
      if (!Object.prototype.hasOwnProperty.call(co.rows, hoods[t])) return fail('target-hood-missing:' + hoods[t]);
      var nowV = num(co.rows[hoods[t]][col]);
      var baseV = num((b.keys[hoods[t]] || {})[col]);
      if (nowV === null || baseV === null) return fail('target-reading-missing:' + hoods[t] + '.' + col);
      nowSum += nowV / med;
      baseSum += baseV / baseMed;
    }
    var edge = b.direction === 'down' ? (baseSum - nowSum) / hoods.length : (nowSum - baseSum) / hoods.length;
    edges[col] = Math.round(edge * 1000000) / 1000000;
    if (minEdge === null || edges[col] < minEdge) minEdge = edges[col];
  }
  return { available: true, reason: null, cycle: obs, edges: edges, minEdge: minEdge };
}

// deliveryHoldStep — the streak, kept OUT of the immutable baseline (its own
// StageHold cell). One observation counts once: a re-fire of the same Cycle
// re-reads the same cohort and changes nothing. A skipped Cycle, an unreadable
// cohort or a changed margin breaks the streak — H consecutive means H
// consecutive; so does a changed margin OR regress share, since evidence judged
// under one bar is not evidence under another. Standing delivers after H
// observations at or above the margin;
// Delivering regresses after H observations below margin x regressShare (the
// lower bar is the hysteresis: noise around the margin cannot flap a row).
// `first` is stamped once, ever — it is what pays `completed` +3, once.
// input  { stage, hold, obsCycle, edge, eligibleAfter, margin, regressShare, holdCycles, fireCycle }
// output { changed, hold, verdict: null|'deliver'|'regress', firstDelivery, reason }
function deliveryHoldStep(input) {
  var inp = input || {};
  var prev = inp.hold;
  if (typeof prev === 'string') { try { prev = prev.trim() ? JSON.parse(prev) : null; } catch (e) { prev = null; } }
  var cnt = function (v) { var x = Number(v); return isFinite(x) && x > 0 ? Math.floor(x) : 0; };
  var state = { v: 1, obs: 0, up: 0, down: 0, first: 0, regressed: 0, m: null, r: null, st: 0 };
  if (prev && typeof prev === 'object' && prev.v === 1) {
    state.obs = cnt(prev.obs); state.up = cnt(prev.up); state.down = cnt(prev.down);
    state.first = cnt(prev.first); state.regressed = cnt(prev.regressed);
    state.m = isFinite(Number(prev.m)) && prev.m !== null && prev.m !== '' ? Number(prev.m) : null;
    state.r = isFinite(Number(prev.r)) && prev.r !== null && prev.r !== '' ? Number(prev.r) : null;
    state.st = cnt(prev.st);   // stall-entry Cycle (stallClock's field) — carried, never judged here
  }
  var same = function (reason) { return { changed: false, hold: state, verdict: null, firstDelivery: false, reason: reason }; };
  var stage = String(inp.stage == null ? '' : inp.stage).trim();
  if (stage !== 'Standing' && stage !== 'Delivering') return same('not-a-hold-stage');
  var margin = Number(inp.margin), share = Number(inp.regressShare), need = Number(inp.holdCycles), fire = Number(inp.fireCycle);
  if (!isFinite(margin) || margin < 0 || !isFinite(share) || share < 0 || share > 1 ||
      !isFinite(need) || need < 1 || Math.floor(need) !== need || !isFinite(fire) || fire < 1) return same('bad-dials');
  var obs = Number(inp.obsCycle);
  if (!isFinite(obs) || obs < 1) return same('no-observation');
  if (obs <= state.obs) return same('already-counted');
  // First-service gate (codex F3): an observation at or before the stage-change
  // Cycle is pre-service ONLY for a row that has never been counted — a stand-up at
  // S cannot move S's numbers. Once the streak has seen an observation the service
  // was already running, so a forward change (delivery) resets tend but takes no
  // observation holiday: H consecutive stays H consecutive through it.
  var after = Number(inp.eligibleAfter);
  if (!isFinite(after) || after < 1) return same('no-stage-change-cycle');
  if (!state.obs && !(obs > after)) return same('not-yet-eligible');
  var next = { v: 1, obs: obs, up: state.up, down: state.down, first: state.first, regressed: state.regressed, m: margin, r: share, st: state.st };
  if ((state.obs && obs !== state.obs + 1) || (state.m !== null && state.m !== margin) || (state.r !== null && state.r !== share)) { next.up = 0; next.down = 0; }
  var edge = inp.edge || {};
  if (edge.available !== true || Number(edge.cycle) !== obs || !isFinite(Number(edge.minEdge)) || edge.minEdge === null) {
    next.up = 0; next.down = 0;
    return { changed: true, hold: next, verdict: null, firstDelivery: false, reason: 'edge-unavailable' };
  }
  var e = Number(edge.minEdge), tol = 1e-9, verdict = null, firstDelivery = false;
  if (stage === 'Standing') {
    next.down = 0;
    next.up = e + tol >= margin ? next.up + 1 : 0;
    if (next.up >= need) verdict = 'deliver';
  } else {
    next.up = 0;
    next.down = e + tol < margin * share ? next.down + 1 : 0;
    if (next.down >= need) verdict = 'regress';
  }
  if (verdict === 'deliver') {
    next.up = 0; next.down = 0;
    if (!next.first) { next.first = fire; firstDelivery = true; }
  } else if (verdict === 'regress') {
    next.up = 0; next.down = 0;
    next.regressed = fire;
  }
  return { changed: true, hold: next, verdict: verdict, firstDelivery: firstDelivery, reason: null };
}

// civic.38 Task 4 step 3 — the losing clock. PURE; mirrored text-identical as
// civicStallClock_ / civicReviveDecision_ in the engine (parity-tested).
//
// stallClock — which clock a staged row runs, how far along it is, and whether
// it has run out. Two clocks (plan rulings 2 and 17):
//   Funded               elapsed since LastStageChangeCycle, limit stallCycles.
//                        Work IS the gate here, so waiting is the failure.
//   Standing/Delivering  elapsed since the row was last TENDED — the later of
//                        LastWorkCycle and LastStageChangeCycle, the same
//                        reference tendFactor decays from — limit
//                        untendedStallCycles (longer than the decay curve, so a
//                        service is seen to weaken before it fails).
// No clock on: a blank Stage; Proposed (ruling 3: no seat move clears it); a
// phase already down. An unbuilt or unreadable delivering gate does NOT stop
// the untended clock (agy review F1, 2026-09-21): neglect is a failure to tend,
// which every domain can do, and has nothing to do with whether a metric
// reader exists — ruling 3's gate exemption belonged to the old stage-change
// clock. Strict `>`: a row may sit the full limit; the Cycle after that it
// stalls. cycle == reference reads 0, so a row never stalls the fire it changed
// stage.
// input  { stage, phase, cycle, lastWorkCycle, lastStageChangeCycle, stallCycles, untendedStallCycles }
// output { clock: 'funded'|'untended'|null, reference, elapsed, limit, stalled, reason }
function stallClock(input) {
  var inp = input || {};
  var out = { clock: null, reference: 0, elapsed: 0, limit: 0, stalled: false, reason: null };
  var stage = String(inp.stage == null ? '' : inp.stage).trim();
  if (!stage) { out.reason = 'legacy-row'; return out; }
  if (stage === 'Proposed') { out.reason = 'no-clock-on-proposed'; return out; }
  if (['Funded', 'Standing', 'Delivering'].indexOf(stage) < 0) { out.reason = 'unknown-stage'; return out; }
  var phase = String(inp.phase == null ? '' : inp.phase).trim().toLowerCase();
  if (phase === 'stalled' || phase === 'blocked' || phase === 'suspended' || phase === 'defunded') { out.reason = 'already-down:' + phase; return out; }
  var cycle = Number(inp.cycle);
  if (!isFinite(cycle) || cycle < 1) { out.reason = 'no-cycle'; return out; }
  var change = Number(inp.lastStageChangeCycle);
  var work = Number(inp.lastWorkCycle);
  var changeOk = isFinite(change) && change >= 1;
  var workOk = isFinite(work) && work >= 1;
  var limit;
  if (stage === 'Funded') {
    if (!changeOk) { out.reason = 'no-stage-change-cycle'; return out; }
    out.clock = 'funded';
    out.reference = change;
    limit = Number(inp.stallCycles);
  } else {
    var ref = Math.max(changeOk ? change : 0, workOk ? work : 0);
    if (!(ref >= 1)) { out.reason = 'no-reference-cycle'; return out; }
    out.clock = 'untended';
    out.reference = ref;
    limit = Number(inp.untendedStallCycles);
  }
  if (!isFinite(limit) || limit < 1) { out.clock = null; out.reason = 'bad-dial'; return out; }
  out.limit = limit;
  out.elapsed = Math.max(0, cycle - out.reference);
  out.stalled = out.elapsed > limit;
  return out;
}

// reviveDecision — a stalled staged row comes back when ONE work move lands
// after the stall entry (`st`, stamped in StageHold when the row stalled), and
// only once per stall: work from before the stall is not a revival. The phase it
// returns to is PriorPhase; a blank PriorPhase (should not happen — stall entry
// stamps it) falls back to the stage's own service phase so the row is never
// stuck paying -2 with no handle; a PriorPhase that is itself a down phase
// (codex stall review F2: a stale cell) takes the same fallback, never a
// "restoration" to stalled. Work stamped past the current fire is refused
// (codex F3: the fold stamps the closing Cycle, never the future). Only the
// three stages that can stall revive. Revival is NOT an advance (approval's
// revival guard) and carries no business lift.
// input  { stage, phase, priorPhase, stallCycle, lastWorkCycle, cycle }
// output { revive: bool, phase: string|null, reason }
function reviveDecision(input) {
  var inp = input || {};
  var stage = String(inp.stage == null ? '' : inp.stage).trim();
  var phase = String(inp.phase == null ? '' : inp.phase).trim().toLowerCase();
  if (!stage) return { revive: false, phase: null, reason: 'legacy-row' };
  if (['Funded', 'Standing', 'Delivering'].indexOf(stage) < 0) return { revive: false, phase: null, reason: 'not-a-stall-stage' };
  if (phase !== 'stalled') return { revive: false, phase: null, reason: 'not-stalled' };
  var st = Number(inp.stallCycle);
  if (!isFinite(st) || st < 1) return { revive: false, phase: null, reason: 'no-stall-cycle' };
  var work = Number(inp.lastWorkCycle);
  if (!isFinite(work) || work < 1) return { revive: false, phase: null, reason: 'no-work' };
  // >= : the fold stamps the closing Cycle, and a stall decided at fire N leaves
  // that week's work stamped N — it DID land after the stall (same rule as the
  // Funded work gate).
  if (!(work >= st)) return { revive: false, phase: null, reason: 'work-predates-stall' };
  var cycle = Number(inp.cycle);
  if (isFinite(cycle) && cycle >= 1 && work > cycle) return { revive: false, phase: null, reason: 'work-from-the-future' };
  var prior = String(inp.priorPhase == null ? '' : inp.priorPhase).trim();
  if (['stalled', 'blocked', 'suspended', 'defunded'].indexOf(prior.toLowerCase()) >= 0) prior = '';
  if (!prior) prior = stage === 'Funded' ? 'vote-ready' : 'operational';
  return { revive: true, phase: prior, reason: null };
}

// The code paths that DO exist for the refused retail-gated domains — kept so the
// engine row that strengthens them starts from the wiring, not from a search.
const WEAK_CHANNELS = {
  'economic-program': 'S.initiativeNeighborhoodEffects.retail → applyCityDynamics_ fold → Neighborhood_Map; phase transitions → applyBusinessDynamics_ (engine.250)',
  'workforce-program': 'S.initiativeNeighborhoodEffects.retail → applyCityDynamics_ fold → Neighborhood_Map; phase transitions → applyBusinessDynamics_ (engine.250)',
  'sports-district': 'S.initiativeNeighborhoodEffects.retail/nightlife → applyCityDynamics_ fold → Neighborhood_Map',
};

module.exports = {
  WEAK_CHANNELS,
  STAGE_COLUMNS,
  STAGES,
  LEGACY_STAGE_CONVERSION,
  legacyStageConversion,
  stageCatalogByDomain,
  stageRequirement,
  stageRequirementWith,
  TEND_STAGES,
  tendFactor,
  stageBaselineFrom,
  deliveryEdge,
  deliveryHoldStep,
  stallClock,
  reviveDecision,
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
