/**
 * priorityEngine.js — Engine A (Story Priority) of the routing-foundation plan.
 *
 * Computes deterministic story priority for sift consumption — independent of
 * byline. Engine B (utilities/bylineEngine.js, future) handles byline ranking.
 *
 * Plan: docs/plans/2026-05-07-engine-routing-foundation.md
 * Phase 2 task scope:
 *   - T2.1 (this commit): DOMAIN_WEIGHTS + SEVERITY_MULTIPLIERS constants
 *   - T2.2: computeArcMultiplier_ + loadStorylineState_
 *   - T2.3: computeCoverageMultiplier_
 *   - T2.4: computePriorityScore_ (orchestrator)
 *   - T2.5: isConsequenceFloor_ (boolean flag)
 *
 * Runtime: dual — Apps Script (engine-sheet, via clasp) and Node (validation
 * harness in scripts/, T2.8). Pattern mirrors lib/districtMap.js.
 */

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN_WEIGHTS — story domain → priority weight (1–10 scale).
//
// Starter table per plan T2.1. Open Question Q1 keeps these provisional until
// T2.8 shadow-validation against Mags' editorial pick order over 3 cycles
// surfaces miscalibration. Tune from there; do not treat as authoritative.
//
// Rationale for relative ordering:
//   - HEALTH/SAFETY/CIVIC at the top: Mike's grill ("health probably higher
//     than traffic") + consequence-floor pairing (T2.5 floors HIGH-severity
//     in these three when uncovered).
//   - GENERAL low (=2): Phase 1 diagnosis showed 76% of seeds default to
//     GENERAL via a structural keyword overlap with one byline. Low weight
//     ensures GENERAL seeds get deprioritized vs typed-domain seeds in sift.
//   - SPORTS=5: middle band — sports has its own desk and arc engines, so
//     it shouldn't outrank civic/health at the priority layer.
// ─────────────────────────────────────────────────────────────────────────────
var DOMAIN_WEIGHTS = {
  // Top tier — high consequence, paired with consequence-floor (T2.5)
  'HEALTH':         10,
  'SAFETY':          9,
  'CIVIC':           9,
  // Mid-high
  'INFRASTRUCTURE':  7,
  'ENVIRONMENT':     6,  // S206 add — appears in seed-side data, was missing
  'EDUCATION':       6,
  'COMMUNITY':       6,
  // Mid
  'BUSINESS':        5,
  'ECONOMIC':        5,  // S206 add — alias of BUSINESS in seed-side + Coverage_Ratings vocab
  'TECHNOLOGY':      5,  // S206 add — engine canonical (eventArcEngine, domainTracker)
  'SPORTS':          5,
  'FAITH':           4,  // S206 add — appears in seed-side data, no engine canonical equivalent
  'CULTURE':         4,
  'ARTS':            4,  // S206 add — engine canonical
  // Lower — context/atmosphere domains
  'NIGHTLIFE':       3,
  'WEATHER':         3,
  'FESTIVAL':        3,  // S206 add — engine canonical
  'HOLIDAY':         3,  // S206 add — engine canonical
  // Floor
  'GENERAL':         2
};

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN_WEIGHT_DEFAULT — fallback weight when a seed carries an unknown domain.
// Below GENERAL (which is itself the documented fallback bucket) so unknown
// domains get explicitly deprioritized and surface as a tuning signal.
// ─────────────────────────────────────────────────────────────────────────────
var DOMAIN_WEIGHT_DEFAULT = 1;

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY_MULTIPLIERS — audit-pattern severity → priority multiplier.
//
// Severity comes from the engine-auditor pattern attached to a seed (see
// engine_audit_c{XX}.json). HIGH/MED/LOW classification is upstream; this
// table only declares the multiplicative effect on priority score.
// ─────────────────────────────────────────────────────────────────────────────
var SEVERITY_MULTIPLIERS = {
  'HIGH': 1.5,
  'MED':  1.0,
  'LOW':  0.6
};

// ─────────────────────────────────────────────────────────────────────────────
// STORYLINE_PRIORITY_TO_SEVERITY — Storyline_Tracker.Priority (column G) ->
// engine severity bucket. Used as priorPeakSeverity proxy in arc-multiplier
// scoring. Live values per S206 inspection: { normal: 158, high: 78, urgent: 1,
// low: 2, background: implied by applyStorySeeds.js:458 }.
// ─────────────────────────────────────────────────────────────────────────────
var STORYLINE_PRIORITY_TO_SEVERITY = {
  'urgent':     'HIGH',
  'high':       'HIGH',
  'normal':     'MED',
  'low':        'LOW',
  'background': 'LOW'
};

// ─────────────────────────────────────────────────────────────────────────────
// computeArcMultiplier_ — priority multiplier from arc persistence.
//
// Plan T2.2 returns:
//   1.0 — no arc (storylineState null/empty)
//   1.2 — arc active 1–2 cycles
//   1.4 — arc active 3+ cycles, no severity peak
//   1.6 — arc active 3+ cycles AND priorPeakSeverity === 'HIGH' (comeback amp)
// ─────────────────────────────────────────────────────────────────────────────
function computeArcMultiplier_(seed, storylineState) {
  if (!storylineState) return 1.0;
  var cyclesActive = storylineState.cyclesActive || 0;
  if (cyclesActive < 1) return 1.0;
  if (cyclesActive <= 2) return 1.2;
  if (storylineState.priorPeakSeverity === 'HIGH') return 1.6;
  return 1.4;
}

// ─────────────────────────────────────────────────────────────────────────────
// parseStorylineRow_ — pure function, derives priority-engine state from a raw
// Storyline_Tracker row + headers. Returns { cyclesActive, priorPeakSeverity,
// lastCoveredCycle, status } or null if row is malformed.
// ─────────────────────────────────────────────────────────────────────────────
function parseStorylineRow_(row, headers, currentCycle) {
  if (!row || !headers) return null;
  var cycleAddedIdx = headers.indexOf('CycleAdded');
  var priorityIdx   = headers.indexOf('Priority');
  var statusIdx     = headers.indexOf('Status');
  var lastCovIdx    = headers.indexOf('LastCoverageCycle');
  if (cycleAddedIdx < 0) return null;

  var cycleAdded = parseInt(row[cycleAddedIdx], 10) || 0;
  var cyclesActive = (parseInt(currentCycle, 10) || 0) - cycleAdded;
  var rawPriority = String(row[priorityIdx] != null ? row[priorityIdx] : 'normal').trim().toLowerCase();
  var priorPeakSeverity = STORYLINE_PRIORITY_TO_SEVERITY[rawPriority] || 'MED';
  var lastCoveredCycle = lastCovIdx >= 0 ? (parseInt(row[lastCovIdx], 10) || null) : null;
  var status = statusIdx >= 0 ? String(row[statusIdx] || '').trim() : '';

  return {
    cyclesActive: cyclesActive,
    priorPeakSeverity: priorPeakSeverity,
    lastCoveredCycle: lastCoveredCycle,
    status: status
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// loadStorylineStateForSeed_ — runtime-agnostic seed -> storyline lookup.
//
// Reads `seed.linkedStorylineId` as a row number (1-indexed sheet row). Per
// applyStorySeeds.js v3.8 reality, the field carries the Storyline_Tracker
// rowNumber, NOT the column-O StorylineId — naming bug flagged for engine-sheet
// cleanup, treat field as opaque key for now.
//
// Caller pre-loads Storyline_Tracker as 2D array (Apps Script: SpreadsheetApp;
// Node: lib/sheets.js getRawSheetData). Pure-function lookup keeps this file
// runtime-neutral.
//
// Returns parsed state or null if seed has no linkage or row is out of bounds.
// ─────────────────────────────────────────────────────────────────────────────
function loadStorylineStateForSeed_(seed, storylineData, currentCycle) {
  if (!seed || seed.linkedStorylineId == null) return null;
  if (!storylineData || storylineData.length < 2) return null;

  var rowNumber = parseInt(seed.linkedStorylineId, 10);
  if (!isFinite(rowNumber) || rowNumber < 2 || rowNumber > storylineData.length) return null;

  var headers = storylineData[0];
  var row = storylineData[rowNumber - 1];
  return parseStorylineRow_(row, headers, currentCycle);
}

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE_DOMAIN_NORMALIZE — Edition_Coverage_Ratings.Domain (col B) values
// don't match seed-side Story_Seed_Deck.Domain values for a few concepts.
// Localized normalizer at coverage-read time so DOMAIN_WEIGHTS keys (engine
// canonical) match what `computeCoverageMultiplier_` looks up.
//
// Live Coverage_Ratings domains (S206 inspection): CIVIC, COMMUNITY, CRIME,
// CULTURE, ECONOMIC, EDUCATION, HEALTH, HOUSING, SPORTS, TRANSIT.
// CRIME/HOUSING/TRANSIT are the divergent values; rest pass through.
//
// Out-of-scope: full system-wide vocabulary unification — separate plan, real
// blast radius (~10 sites across applyStorySeeds, eventArcEngine, etc.).
// ─────────────────────────────────────────────────────────────────────────────
var COVERAGE_DOMAIN_NORMALIZE = {
  'CRIME':   'SAFETY',
  'HOUSING': 'INFRASTRUCTURE',
  'TRANSIT': 'INFRASTRUCTURE'
};

function normalizeCoverageDomain_(domain) {
  if (!domain) return domain;
  var key = String(domain).trim().toUpperCase();
  return COVERAGE_DOMAIN_NORMALIZE[key] || key;
}

// ─────────────────────────────────────────────────────────────────────────────
// COVERAGE_THRESHOLDS — saturation / crisis multiplier triggers.
//
// Calibrated S206 to live Edition_Coverage_Ratings data (range -1 to +3 across
// 5 cycles, 42 rows). Plan original (saturation ≥+3, crisis ≤-3) had the
// crisis amplifier as dead code under current rating regime — no -3 ever
// emitted. Crisis dropped to ≤-1 (bottom-quartile of observed ratings).
//
// T2.8 validation harness tunes — fixed values shipped only to unblock Phase 2.
// ─────────────────────────────────────────────────────────────────────────────
var COVERAGE_THRESHOLDS = {
  SATURATION_RATING:     3,    // 3-of-3 cycles ≥ this → saturation multiplier
  SATURATION_MULTIPLIER: 0.7,
  CRISIS_RATING:        -1,    // last cycle ≤ this → crisis multiplier (calibrated S206)
  CRISIS_MULTIPLIER:     1.3
};

// ─────────────────────────────────────────────────────────────────────────────
// parseCoverageRow_ — pure parser, raw Edition_Coverage_Ratings row → typed.
//
// Edition_Coverage_Ratings columns: Cycle (A), Domain (B), Rating (C),
// ArticleCount (D), Reporter (E), Tone (F), Processed (G).
// ─────────────────────────────────────────────────────────────────────────────
function parseCoverageRow_(row, headers) {
  if (!row || !headers) return null;
  var cycleIdx  = headers.indexOf('Cycle');
  var domainIdx = headers.indexOf('Domain');
  var ratingIdx = headers.indexOf('Rating');
  if (cycleIdx < 0 || domainIdx < 0 || ratingIdx < 0) return null;

  var cycle = parseInt(row[cycleIdx], 10);
  if (!isFinite(cycle)) return null;
  var rawDomain = row[domainIdx];
  if (!rawDomain) return null;
  var rating = parseInt(row[ratingIdx], 10);
  if (!isFinite(rating)) rating = 0;

  return {
    cycle: cycle,
    domain: normalizeCoverageDomain_(rawDomain),
    rating: rating
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// loadCoverageStateForDomain_ — pure-function lookup over pre-loaded sheet.
//
// Returns { ratings: [r-2, r-1, r0], lastRating: r0, cyclesCovered: N }
// where ratings is the last 3 cycles' values (oldest→newest) for the seed's
// domain. Missing cycles are omitted from the array, not zero-filled.
//
// seed.domain compared after normalization to canonical (handles ECONOMIC vs
// BUSINESS, CRIME vs SAFETY, etc.). Caller pre-loads coverage data via runtime
// of choice (Apps Script SpreadsheetApp or Node lib/sheets.js).
// ─────────────────────────────────────────────────────────────────────────────
function loadCoverageStateForDomain_(seedDomain, coverageData, currentCycle) {
  if (!seedDomain) return null;
  if (!coverageData || coverageData.length < 2) return null;
  var current = parseInt(currentCycle, 10);
  if (!isFinite(current)) return null;

  var headers = coverageData[0];
  var canonical = normalizeCoverageDomain_(seedDomain);

  // Collect ratings for the prior 3 cycles (currentCycle-3 ... currentCycle-1).
  var byCycle = {};
  for (var i = 1; i < coverageData.length; i++) {
    var parsed = parseCoverageRow_(coverageData[i], headers);
    if (!parsed) continue;
    if (parsed.domain !== canonical) continue;
    var lookback = current - parsed.cycle;
    if (lookback >= 1 && lookback <= 3) {
      byCycle[parsed.cycle] = parsed.rating;
    }
  }

  var sortedCycles = Object.keys(byCycle).map(Number).sort(function (a, b) { return a - b; });
  var ratings = sortedCycles.map(function (c) { return byCycle[c]; });
  if (ratings.length === 0) return null;

  return {
    ratings: ratings,
    lastRating: ratings[ratings.length - 1],
    cyclesCovered: ratings.length
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// computeCoverageMultiplier_ — priority multiplier from prior-coverage state.
//
// Returns:
//   0.7 — covered 3 of last 3 cycles AND all 3 ratings ≥ SATURATION_RATING
//         (saturation — domain overcovered, deprioritize new seeds in same domain)
//   1.3 — last cycle's rating ≤ CRISIS_RATING (uncovered crisis, amplify)
//   1.0 — otherwise (default, including no coverage data)
//
// Saturation takes precedence over crisis when both could apply (a domain
// rated +3/+3/+3 doesn't simultaneously trip crisis; the conditions are
// mutually exclusive in practice but the code expresses ordering anyway).
// ─────────────────────────────────────────────────────────────────────────────
function computeCoverageMultiplier_(seedDomain, coverageState) {
  if (!coverageState) return 1.0;
  var ratings = coverageState.ratings || [];

  // Saturation check — must have all 3 lookback cycles, all at/above threshold.
  if (ratings.length >= 3) {
    var allSaturated = true;
    for (var i = 0; i < 3; i++) {
      if (ratings[ratings.length - 1 - i] < COVERAGE_THRESHOLDS.SATURATION_RATING) {
        allSaturated = false;
        break;
      }
    }
    if (allSaturated) return COVERAGE_THRESHOLDS.SATURATION_MULTIPLIER;
  }

  // Crisis check — last cycle's rating at/below threshold.
  if (typeof coverageState.lastRating === 'number' &&
      coverageState.lastRating <= COVERAGE_THRESHOLDS.CRISIS_RATING) {
    return COVERAGE_THRESHOLDS.CRISIS_MULTIPLIER;
  }

  return 1.0;
}

// ─────────────────────────────────────────────────────────────────────────────
// computePriorityScore_ — Engine A composer (plan T2.4).
//
// Combines DOMAIN_WEIGHTS × SEVERITY_MULTIPLIERS × arcMul × coverageMul into
// a single 0–10 priority score. Returns components alongside the score for
// transparency-layer consumption (T5.1 rationale payload).
//
// Score = domainWeight × severityMul × arcMul × coverageMul
//
// Clamp policy: if raw > 10, divide by 1.5 (per plan T2.4 step 1); if still
// > 10, hard-cap at 10 and emit a console.warn so validation harness (T2.8)
// can see when scoring saturates ceiling. Sub-zero scores clamp to 0
// (defensive — multiplicative composition can't go negative under current
// constants but guard anyway).
//
// Defensive defaults:
//   missing seed         -> score 0, all components 0
//   missing seed.domain  -> DOMAIN_WEIGHT_DEFAULT (1, below GENERAL)
//   missing auditPattern -> severity MED (1.0 multiplier)
//   missing storylineState -> arc 1.0 (no arc binding)
//   missing coverageState  -> coverage 1.0 (no signal)
// ─────────────────────────────────────────────────────────────────────────────
function computePriorityScore_(seed, auditPattern, storylineState, coverageState) {
  if (!seed) {
    return {
      priorityScore: 0,
      components: { domain: 0, severity: 0, arc: 0, coverage: 0 }
    };
  }

  var domain = String(seed.domain || '').toUpperCase();
  var domainWeight = (DOMAIN_WEIGHTS[domain] != null) ? DOMAIN_WEIGHTS[domain] : DOMAIN_WEIGHT_DEFAULT;
  var severityKey = (auditPattern && auditPattern.severity)
    ? String(auditPattern.severity).toUpperCase()
    : 'MED';
  var severityMul = (SEVERITY_MULTIPLIERS[severityKey] != null) ? SEVERITY_MULTIPLIERS[severityKey] : 1.0;
  var arcMul = computeArcMultiplier_(seed, storylineState);
  var coverageMul = computeCoverageMultiplier_(domain, coverageState);

  var raw = domainWeight * severityMul * arcMul * coverageMul;
  var clamped = raw;
  var clampLogged = false;
  if (clamped > 10) {
    clamped = clamped / 1.5;
    clampLogged = true;
  }
  if (clamped > 10) clamped = 10;
  if (clamped < 0) clamped = 0;

  if (clampLogged && typeof console !== 'undefined' && console.warn) {
    console.warn(
      'priorityEngine clamp: raw=' + raw.toFixed(2) +
      ' final=' + clamped.toFixed(2) +
      ' domain=' + domain +
      ' severity=' + severityKey
    );
  }

  return {
    priorityScore: clamped,
    components: {
      domain:   domainWeight,
      severity: severityMul,
      arc:      arcMul,
      coverage: coverageMul
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSEQUENCE_FLOOR_DOMAINS — domains where HIGH-severity unresolved arcs
// floor coverage (override editorial veto). Top-3 DOMAIN_WEIGHTS by design;
// these are the "must-cover" beats. Future seed-side additions (ECONOMIC,
// ENVIRONMENT) can join after editorial review establishes precedent.
// ─────────────────────────────────────────────────────────────────────────────
var CONSEQUENCE_FLOOR_DOMAINS = ['HEALTH', 'SAFETY', 'CIVIC'];

// ─────────────────────────────────────────────────────────────────────────────
// isConsequenceFloor_ — Engine A floor flag (plan T2.5).
//
// Returns true when a seed CANNOT be editorially suppressed by user veto.
// Floor flag is non-negotiable; sift can re-order WITHIN floored seeds, can't
// bury them. Returns false otherwise.
//
// Two trigger conditions (either suffices, both require severity=HIGH):
//   1. Uncovered crisis: HIGH severity AND coverageState.lastRating reaches
//      crisis threshold (shared with T2.3 multiplier — calibrated to live data
//      via COVERAGE_THRESHOLDS.CRISIS_RATING). HIGH+crisis is the differentiator
//      vs the multiplier; the multiplier alone fires on any crisis, the floor
//      requires HIGH severity stamping.
//   2. Persistent top-domain arc: HIGH severity in HEALTH/SAFETY/CIVIC AND
//      arc has been active ≥ 2 cycles (storylineState.cyclesActive). The
//      "structural problem unresolved across editions" signal.
//
// Plan signature was (auditPattern, coverageState) but condition 2 needs
// seed.domain and storylineState.cyclesActive. Expanded to symmetric 4-arg
// form matching computePriorityScore_.
// ─────────────────────────────────────────────────────────────────────────────
function isConsequenceFloor_(seed, auditPattern, storylineState, coverageState) {
  if (!auditPattern) return false;
  var severity = String(auditPattern.severity || '').toUpperCase();
  if (severity !== 'HIGH') return false;

  // Condition 1: HIGH + uncovered crisis (any domain).
  if (coverageState &&
      typeof coverageState.lastRating === 'number' &&
      coverageState.lastRating <= COVERAGE_THRESHOLDS.CRISIS_RATING) {
    return true;
  }

  // Condition 2: HIGH + top-domain + arc unresolved 2+ cycles.
  var domain = String((seed && seed.domain) || '').toUpperCase();
  if (CONSEQUENCE_FLOOR_DOMAINS.indexOf(domain) >= 0 &&
      storylineState &&
      (storylineState.cyclesActive || 0) >= 2) {
    return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-test harness. Runs only when file invoked directly via
//   node utilities/priorityEngine.js
// In Apps Script (no `require`) and Node `require()` calls, the guard skips.
// ─────────────────────────────────────────────────────────────────────────────
function _runPrioritySelfTests_() {
  var pass = 0, fail = 0;
  function eq(label, actual, expected) {
    if (actual === expected) { pass++; return; }
    fail++;
    console.error('FAIL ' + label + ' — got ' + actual + ', want ' + expected);
  }
  function isNull(label, actual) { eq(label, actual, null); }

  // computeArcMultiplier_
  eq('arc: null state -> 1.0', computeArcMultiplier_({}, null), 1.0);
  eq('arc: cyclesActive 0 -> 1.0', computeArcMultiplier_({}, { cyclesActive: 0 }), 1.0);
  eq('arc: cyclesActive 1 -> 1.2', computeArcMultiplier_({}, { cyclesActive: 1 }), 1.2);
  eq('arc: cyclesActive 2 -> 1.2', computeArcMultiplier_({}, { cyclesActive: 2 }), 1.2);
  eq('arc: cyclesActive 3 + MED -> 1.4', computeArcMultiplier_({}, { cyclesActive: 3, priorPeakSeverity: 'MED' }), 1.4);
  eq('arc: cyclesActive 5 + HIGH -> 1.6', computeArcMultiplier_({}, { cyclesActive: 5, priorPeakSeverity: 'HIGH' }), 1.6);
  eq('arc: cyclesActive 7 + LOW -> 1.4', computeArcMultiplier_({}, { cyclesActive: 7, priorPeakSeverity: 'LOW' }), 1.4);

  // parseStorylineRow_
  var headers = ['CycleAdded', 'Priority', 'Status', 'LastCoverageCycle'];
  var s1 = parseStorylineRow_([88, 'urgent', 'active', 91], headers, 93);
  eq('parse: cyclesActive 88->93 = 5', s1.cyclesActive, 5);
  eq('parse: urgent -> HIGH', s1.priorPeakSeverity, 'HIGH');
  eq('parse: lastCoveredCycle 91', s1.lastCoveredCycle, 91);
  eq('parse: status active', s1.status, 'active');
  eq('parse: normal -> MED', parseStorylineRow_([90, 'normal', 'active', 92], headers, 93).priorPeakSeverity, 'MED');
  eq('parse: low -> LOW', parseStorylineRow_([90, 'low', 'active', 92], headers, 93).priorPeakSeverity, 'LOW');
  eq('parse: background -> LOW', parseStorylineRow_([90, 'background', 'active', 92], headers, 93).priorPeakSeverity, 'LOW');
  eq('parse: unknown priority -> MED default', parseStorylineRow_([90, 'weird', 'active', 92], headers, 93).priorPeakSeverity, 'MED');
  isNull('parse: null row -> null', parseStorylineRow_(null, headers, 93));
  isNull('parse: missing CycleAdded header -> null', parseStorylineRow_([88, 'urgent'], ['Priority', 'X'], 93));

  // loadStorylineStateForSeed_
  var sheet = [
    ['CycleAdded', 'Priority', 'Status', 'LastCoverageCycle'],
    [88, 'urgent', 'active', 91],
    [80, 'normal', 'dormant', 85]
  ];
  eq('load row 2 (urgent)', loadStorylineStateForSeed_({ linkedStorylineId: 2 }, sheet, 93).priorPeakSeverity, 'HIGH');
  eq('load row 3 (normal)', loadStorylineStateForSeed_({ linkedStorylineId: 3 }, sheet, 93).priorPeakSeverity, 'MED');
  isNull('load missing linkage -> null', loadStorylineStateForSeed_({}, sheet, 93));
  isNull('load null seed -> null', loadStorylineStateForSeed_(null, sheet, 93));
  isNull('load OOB row -> null', loadStorylineStateForSeed_({ linkedStorylineId: 99 }, sheet, 93));
  isNull('load row 1 (header) -> null', loadStorylineStateForSeed_({ linkedStorylineId: 1 }, sheet, 93));

  // normalizeCoverageDomain_
  eq('normalize: CRIME -> SAFETY', normalizeCoverageDomain_('CRIME'), 'SAFETY');
  eq('normalize: HOUSING -> INFRASTRUCTURE', normalizeCoverageDomain_('HOUSING'), 'INFRASTRUCTURE');
  eq('normalize: TRANSIT -> INFRASTRUCTURE', normalizeCoverageDomain_('TRANSIT'), 'INFRASTRUCTURE');
  eq('normalize: HEALTH passthrough', normalizeCoverageDomain_('HEALTH'), 'HEALTH');
  eq('normalize: lowercase upper', normalizeCoverageDomain_('crime'), 'SAFETY');

  // parseCoverageRow_
  var covHeaders = ['Cycle', 'Domain', 'Rating', 'ArticleCount'];
  var cov1 = parseCoverageRow_([91, 'HEALTH', 2, 3], covHeaders);
  eq('parseCov: cycle', cov1.cycle, 91);
  eq('parseCov: domain HEALTH', cov1.domain, 'HEALTH');
  eq('parseCov: rating 2', cov1.rating, 2);
  eq('parseCov: CRIME->SAFETY at parse time', parseCoverageRow_([91, 'CRIME', 1, 1], covHeaders).domain, 'SAFETY');
  isNull('parseCov: missing cycle -> null', parseCoverageRow_(['', 'HEALTH', 2, 3], covHeaders));
  isNull('parseCov: missing domain -> null', parseCoverageRow_([91, '', 2, 3], covHeaders));

  // loadCoverageStateForDomain_
  var covSheet = [
    ['Cycle', 'Domain', 'Rating'],
    [89, 'HEALTH', 1],
    [90, 'HEALTH', 2],
    [91, 'HEALTH', 3],
    [92, 'HEALTH', 0],
    [93, 'HEALTH', -1],  // current cycle, not in lookback
    [90, 'CIVIC', 3],
    [91, 'CIVIC', 3],
    [92, 'CIVIC', 3]
  ];
  var hState = loadCoverageStateForDomain_('HEALTH', covSheet, 93);
  eq('loadCov HEALTH: 3 cycles found', hState.cyclesCovered, 3);
  eq('loadCov HEALTH: ratings ordered oldest->newest', JSON.stringify(hState.ratings), JSON.stringify([2, 3, 0]));
  eq('loadCov HEALTH: lastRating 0 (cycle 92)', hState.lastRating, 0);
  var cState = loadCoverageStateForDomain_('CIVIC', covSheet, 93);
  eq('loadCov CIVIC: ratings 3,3,3', JSON.stringify(cState.ratings), JSON.stringify([3, 3, 3]));
  eq('loadCov CIVIC: lastRating 3', cState.lastRating, 3);
  isNull('loadCov: domain absent -> null', loadCoverageStateForDomain_('SPORTS', covSheet, 93));
  // Normalization at lookup time
  var crimeSheet = [['Cycle', 'Domain', 'Rating'], [92, 'CRIME', -1]];
  var sState = loadCoverageStateForDomain_('SAFETY', crimeSheet, 93);
  eq('loadCov: SAFETY finds normalized CRIME row', sState.lastRating, -1);

  // computeCoverageMultiplier_
  eq('cov: null state -> 1.0', computeCoverageMultiplier_('HEALTH', null), 1.0);
  eq('cov: 3-of-3 saturation -> 0.7', computeCoverageMultiplier_('CIVIC', { ratings: [3, 3, 3], lastRating: 3 }), 0.7);
  eq('cov: 3-of-3 mixed +3/+2/+3 -> 1.0 (one below threshold)', computeCoverageMultiplier_('CIVIC', { ratings: [3, 2, 3], lastRating: 3 }), 1.0);
  eq('cov: only 2 cycles cant saturate', computeCoverageMultiplier_('CIVIC', { ratings: [3, 3], lastRating: 3 }), 1.0);
  eq('cov: lastRating -1 -> 1.3 (crisis)', computeCoverageMultiplier_('HEALTH', { ratings: [0, 0, -1], lastRating: -1 }), 1.3);
  eq('cov: lastRating -2 -> 1.3 (crisis below threshold)', computeCoverageMultiplier_('HEALTH', { ratings: [-2], lastRating: -2 }), 1.3);
  eq('cov: lastRating 0 -> 1.0 (default)', computeCoverageMultiplier_('HEALTH', { ratings: [1, 1, 0], lastRating: 0 }), 1.0);
  eq('cov: lastRating 2 -> 1.0', computeCoverageMultiplier_('HEALTH', { ratings: [1, 2, 2], lastRating: 2 }), 1.0);

  // DOMAIN_WEIGHTS coverage of seed-side observed values (S206 cascade analysis)
  var observedSeedDomains = ['HEALTH', 'COMMUNITY', 'SPORTS', 'FAITH', 'CULTURE', 'SAFETY', 'ENVIRONMENT', 'ECONOMIC', 'GENERAL', 'CIVIC'];
  for (var di = 0; di < observedSeedDomains.length; di++) {
    var d = observedSeedDomains[di];
    eq('DOMAIN_WEIGHTS has seed-observed: ' + d, typeof DOMAIN_WEIGHTS[d], 'number');
  }

  // computePriorityScore_ (T2.4)
  var origWarn = console.warn;
  console.warn = function () {};  // silence clamp logs during self-test

  // Plan acceptance: HIGH-severity HEALTH crisis with 3-cycle arc lands >= 8.0
  var planCase = computePriorityScore_(
    { domain: 'HEALTH' },
    { severity: 'HIGH' },
    { cyclesActive: 3, priorPeakSeverity: 'HIGH' },  // arc=1.6 (comeback amp)
    { ratings: [0, 0, -1], lastRating: -1 }           // crisis=1.3
  );
  // raw = 10 * 1.5 * 1.6 * 1.3 = 31.2; /1.5 = 20.8; hard-cap 10
  eq('compose: plan acceptance >= 8.0', planCase.priorityScore >= 8.0, true);
  eq('compose: components.domain', planCase.components.domain, 10);
  eq('compose: components.severity', planCase.components.severity, 1.5);
  eq('compose: components.arc', planCase.components.arc, 1.6);
  eq('compose: components.coverage', planCase.components.coverage, 1.3);

  // Defensive defaults
  var nullSeed = computePriorityScore_(null, null, null, null);
  eq('compose: null seed -> score 0', nullSeed.priorityScore, 0);
  eq('compose: null seed -> domain 0', nullSeed.components.domain, 0);
  var bareSeed = computePriorityScore_({ domain: 'HEALTH' }, null, null, null);
  // raw = 10 * 1.0 (MED default) * 1.0 (no arc) * 1.0 (no coverage) = 10
  eq('compose: bare seed defaults -> 10', bareSeed.priorityScore, 10);
  var unknownDomain = computePriorityScore_({ domain: 'WEIRD_NEW_DOMAIN' }, { severity: 'MED' }, null, null);
  // raw = 1 (DOMAIN_WEIGHT_DEFAULT) * 1.0 * 1.0 * 1.0 = 1
  eq('compose: unknown domain -> DOMAIN_WEIGHT_DEFAULT', unknownDomain.priorityScore, 1);
  var lowCase = computePriorityScore_({ domain: 'GENERAL' }, { severity: 'LOW' }, null, null);
  // raw = 2 * 0.6 * 1.0 * 1.0 = 1.2
  eq('compose: GENERAL+LOW -> 1.2', Math.round(lowCase.priorityScore * 10) / 10, 1.2);

  // Saturation suppression flow
  var saturated = computePriorityScore_(
    { domain: 'HEALTH' },
    { severity: 'MED' },
    null,
    { ratings: [3, 3, 3], lastRating: 3 }  // saturation -> 0.7
  );
  // raw = 10 * 1.0 * 1.0 * 0.7 = 7.0
  eq('compose: saturation halves toward 7', saturated.priorityScore, 7.0);

  // Clamp ceiling triggered
  var bigCase = computePriorityScore_(
    { domain: 'HEALTH' },
    { severity: 'HIGH' },
    { cyclesActive: 5, priorPeakSeverity: 'HIGH' },
    { ratings: [0, 0, -1], lastRating: -1 }
  );
  // raw = 10 * 1.5 * 1.6 * 1.3 = 31.2 -> divide 1.5 = 20.8 -> cap 10
  eq('compose: extreme score caps at 10', bigCase.priorityScore, 10);

  // Case-insensitive domain
  var lowerDomain = computePriorityScore_({ domain: 'health' }, { severity: 'MED' }, null, null);
  eq('compose: lowercase domain normalized', lowerDomain.components.domain, 10);

  console.warn = origWarn;

  // isConsequenceFloor_ (T2.5)
  // Plan acceptance: HIGH unresolved health crisis -> true
  eq('floor: HIGH HEALTH + crisis -1 -> true (cond 1)',
    isConsequenceFloor_(
      { domain: 'HEALTH' },
      { severity: 'HIGH' },
      null,
      { ratings: [-1], lastRating: -1 }
    ), true);
  eq('floor: HIGH HEALTH + 3-cycle arc -> true (cond 2)',
    isConsequenceFloor_(
      { domain: 'HEALTH' },
      { severity: 'HIGH' },
      { cyclesActive: 3 },
      null
    ), true);
  eq('floor: HIGH SAFETY + 2-cycle arc -> true (cond 2 boundary)',
    isConsequenceFloor_(
      { domain: 'SAFETY' },
      { severity: 'HIGH' },
      { cyclesActive: 2 },
      null
    ), true);
  eq('floor: HIGH CIVIC + 1-cycle arc -> false (cond 2 needs >=2)',
    isConsequenceFloor_(
      { domain: 'CIVIC' },
      { severity: 'HIGH' },
      { cyclesActive: 1 },
      null
    ), false);
  // Cross-domain: cond 1 fires on any domain when crisis hits
  eq('floor: HIGH SPORTS + crisis -1 -> true (cond 1, any domain)',
    isConsequenceFloor_(
      { domain: 'SPORTS' },
      { severity: 'HIGH' },
      null,
      { ratings: [-1], lastRating: -1 }
    ), true);
  // Severity gate
  eq('floor: MED HEALTH + crisis -> false (severity must be HIGH)',
    isConsequenceFloor_(
      { domain: 'HEALTH' },
      { severity: 'MED' },
      null,
      { ratings: [-1], lastRating: -1 }
    ), false);
  // Cond 2 only fires for top-3 domains
  eq('floor: HIGH COMMUNITY + 3-cycle arc -> false (not in floor domains)',
    isConsequenceFloor_(
      { domain: 'COMMUNITY' },
      { severity: 'HIGH' },
      { cyclesActive: 3 },
      null
    ), false);
  eq('floor: HIGH ECONOMIC + 3-cycle arc -> false (not in floor domains)',
    isConsequenceFloor_(
      { domain: 'ECONOMIC' },
      { severity: 'HIGH' },
      { cyclesActive: 3 },
      null
    ), false);
  // No states at all
  eq('floor: HIGH HEALTH + no states -> false',
    isConsequenceFloor_({ domain: 'HEALTH' }, { severity: 'HIGH' }, null, null), false);
  // Coverage at 0 doesn't fire crisis
  eq('floor: HIGH HEALTH + lastRating 0 -> false (above crisis threshold)',
    isConsequenceFloor_(
      { domain: 'HEALTH' },
      { severity: 'HIGH' },
      null,
      { ratings: [0], lastRating: 0 }
    ), false);
  // Defensive nulls
  eq('floor: null auditPattern -> false', isConsequenceFloor_({ domain: 'HEALTH' }, null, null, null), false);
  eq('floor: missing severity -> false', isConsequenceFloor_({ domain: 'HEALTH' }, {}, null, null), false);
  eq('floor: lowercase severity -> normalized',
    isConsequenceFloor_(
      { domain: 'HEALTH' },
      { severity: 'high' },
      { cyclesActive: 3 },
      null
    ), true);

  console.log('priorityEngine self-tests: ' + pass + ' pass / ' + fail + ' fail');
  if (fail > 0 && typeof process !== 'undefined') process.exit(1);
}

// Apps Script picks these up via flat namespace at clasp push.
// Node side (validation harness, scripts/) requires the dual-runtime guard.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DOMAIN_WEIGHTS: DOMAIN_WEIGHTS,
    DOMAIN_WEIGHT_DEFAULT: DOMAIN_WEIGHT_DEFAULT,
    SEVERITY_MULTIPLIERS: SEVERITY_MULTIPLIERS,
    STORYLINE_PRIORITY_TO_SEVERITY: STORYLINE_PRIORITY_TO_SEVERITY,
    COVERAGE_DOMAIN_NORMALIZE: COVERAGE_DOMAIN_NORMALIZE,
    COVERAGE_THRESHOLDS: COVERAGE_THRESHOLDS,
    computeArcMultiplier_: computeArcMultiplier_,
    parseStorylineRow_: parseStorylineRow_,
    loadStorylineStateForSeed_: loadStorylineStateForSeed_,
    normalizeCoverageDomain_: normalizeCoverageDomain_,
    parseCoverageRow_: parseCoverageRow_,
    loadCoverageStateForDomain_: loadCoverageStateForDomain_,
    computeCoverageMultiplier_: computeCoverageMultiplier_,
    computePriorityScore_: computePriorityScore_,
    CONSEQUENCE_FLOOR_DOMAINS: CONSEQUENCE_FLOOR_DOMAINS,
    isConsequenceFloor_: isConsequenceFloor_
  };
}

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  _runPrioritySelfTests_();
}
