/**
 * bylineEngine.js — Engine B (Byline Ranking) of the routing-foundation plan.
 *
 * Plan: docs/plans/2026-05-07-engine-routing-foundation.md
 * Phase 3 task scope:
 *   - T3.1 (this commit): scoreByline_ + scoreAllBylines_ orchestrator,
 *     themeAxis_ (with GENERAL bypass per Fork 1 = B), confidence math
 *     (with `top.score >= 3` absolute floor for HIGH per S206 stewardship).
 *   - T3.2: formatAxis fills via inferSeedFormat_ + formatFitScore_ tables.
 *   - T3.3: cadenceAxis fills via loadCycleCadence_ + cadenceMultiplier_.
 *   - T3.4: arcBindingAxis fills via loadArcBinding_ + arcBindingScore_.
 *
 * Until T3.2-T3.4 ship, format/cadence/arc axes are stubs (format=0,
 * cadence=1.0 multiplier, arc=0). Theme axis is fully wired against the
 * ported partial-match scorer + GENERAL bypass.
 *
 * Composition formula:
 *   total = (themeScore + formatScore + arcBonus) * cadenceMultiplier
 *
 * Theme + format + arc are additive contributors; cadence multiplies the
 * total to suppress over-routed bylines.
 *
 * Runtime: dual — Apps Script (engine-sheet, via clasp) and Node (validation
 * harness in scripts/, T3.9). Pattern mirrors `utilities/priorityEngine.js`.
 *
 * State shape (caller pre-loads):
 *   state = {
 *     roster: { 'Anthony': { themes: [...], desk: '...', ... }, ... },  // required
 *     cycle: 93,                                                         // required
 *     cadence: { 'Simon Leary': 838, ... } | null,                       // T3.3 fills
 *     totalSeeds: 1109,                                                  // for cadence ratio
 *     arcBinding: 'Hal Richmond' | null                                  // T3.4 fills
 *   }
 */

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN_KEYWORDS — mirror of `getThemeKeywordsForDomain_` from
// `utilities/rosterLookup.js:740-751`. Ported here so bylineEngine stays
// runtime-neutral and Node-testable without depending on Apps Script flat
// namespace. If rosterLookup.js's keyword table changes, sync this mirror.
//
// Note GENERAL is intentionally absent — Fork 1 = B (T3.1 amendment) means
// themeAxis short-circuits to 0 on GENERAL domain. Keeping GENERAL out of
// this table prevents any caller from accidentally re-introducing the bias.
// ─────────────────────────────────────────────────────────────────────────────
var DOMAIN_KEYWORDS = {
  'CIVIC':          ['civic', 'accountability', 'system', 'baseline'],
  'SPORTS':         ['rhythm', 'legacy', 'pulse', 'fight'],
  'HEALTH':         ['health', 'expansion', 'containment', 'patterns'],
  'SAFETY':         ['incident', 'stress', 'resolved', 'paradox'],
  'CULTURE':        ['canvas', 'energy', 'sound', 'texture'],
  'COMMUNITY':      ['faith', 'family', 'neighborhood', 'rhythm'],
  'BUSINESS':       ['economic', 'labor', 'stability'],
  'ECONOMIC':       ['economic', 'labor', 'stability'],  // alias of BUSINESS
  'INFRASTRUCTURE': ['micro-failures', 'tolerance', 'maintenance', 'system'],
  'WEATHER':        ['meteorologically', 'forecast', 'data', 'experience']
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE — categorical thresholds. Plan T3.1 step 3 + S206 stewardship fix.
//
// `(top.score - second.score) / top.score` clamped 0–1 produces the relative
// gap. HIGH categorization additionally requires `top.score >= 3` so degenerate
// "top=1, second=0 → ratio 1.0 → HIGH" cases (which are "barely a signal", not
// genuine high-confidence) cap at MEDIUM.
// ─────────────────────────────────────────────────────────────────────────────
var CONFIDENCE_HIGH_FLOOR = 3;
var CONFIDENCE_HIGH_GAP = 0.4;
var CONFIDENCE_MED_GAP = 0.2;

function categorizeConfidence_(topScore, secondScore) {
  var top = (typeof topScore === 'number' && isFinite(topScore)) ? topScore : 0;
  var second = (typeof secondScore === 'number' && isFinite(secondScore)) ? secondScore : 0;
  if (top <= 0) return { gap: 0, label: 'low' };
  var gap = (top - second) / top;
  if (gap < 0) gap = 0;
  if (gap > 1) gap = 1;
  var label;
  if (gap > CONFIDENCE_HIGH_GAP && top >= CONFIDENCE_HIGH_FLOOR) {
    label = 'high';
  } else if (gap >= CONFIDENCE_MED_GAP) {
    label = 'medium';
  } else {
    label = 'low';
  }
  return { gap: gap, label: label };
}

// ─────────────────────────────────────────────────────────────────────────────
// themeAxis_ — partial-match scoring of journalist themes vs seed-domain
// keywords. Ported from `suggestStoryAngle_` (rosterLookup.js:832-865).
//
// Fork 1 = B amendment (T3.1): returns 0 for GENERAL-domain seeds. Phase 1
// root cause was GENERAL keywords structurally overlap Simon Leary's signature
// themes (texture/quiet/stability) producing 99.9% Simon-magnet routing.
// Bypassing themeAxis on GENERAL kills that bias at the byline-engine surface.
//
// Scoring rules (unchanged from rosterLookup):
//   exact match           : +3
//   partial substring     : +1 (either direction)
//   no match              : 0
// ─────────────────────────────────────────────────────────────────────────────
function themeAxis_(seed, journalist) {
  if (!seed || !journalist) return 0;
  var domain = String(seed.domain || '').toUpperCase();
  if (domain === 'GENERAL') return 0;
  var keywords = DOMAIN_KEYWORDS[domain];
  if (!keywords || keywords.length === 0) return 0;
  var journoThemes = journalist.themes || [];
  if (journoThemes.length === 0) return 0;

  var score = 0;
  for (var i = 0; i < keywords.length; i++) {
    var kw = String(keywords[i]).toLowerCase();
    for (var j = 0; j < journoThemes.length; j++) {
      var jt = String(journoThemes[j]).toLowerCase();
      if (jt === kw) {
        score += 3;
      } else if (jt.indexOf(kw) >= 0 || kw.indexOf(jt) >= 0) {
        score += 1;
      }
    }
  }
  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEEDTYPE_FORMAT — locked S206 from live C89-93 distribution (1109 seeds).
// Mapping rule per seedType; storyline-active branches on priority.
// Unknown seedTypes fall through to 'supplemental' (low-volume catch-all).
// ─────────────────────────────────────────────────────────────────────────────
var EDITION_SEEDTYPES = {
  'pattern': true, 'cluster': true, 'shock': true,
  'civic': true, 'health': true, 'sports': true
};
var SUPPLEMENTAL_SEEDTYPES = {
  'storyline-followup': true, 'signal': true
};
var DISPATCH_SEEDTYPES = {
  'seasonal': true, 'firstfriday': true, 'event': true
};
var INTERVIEW_SEEDTYPES = {
  'storyline-question': true
};

function inferSeedFormat_(seed) {
  if (!seed) return 'supplemental';
  var t = String(seed.seedType || '').toLowerCase();
  var p = String(seed.priority || '').toUpperCase();

  if (EDITION_SEEDTYPES[t]) return 'edition';
  if (t === 'storyline-active') {
    return (p === 'HIGH' || p === 'URGENT') ? 'edition' : 'supplemental';
  }
  if (SUPPLEMENTAL_SEEDTYPES[t]) return 'supplemental';
  if (INTERVIEW_SEEDTYPES[t]) return 'interview';
  if (DISPATCH_SEEDTYPES[t]) return 'dispatch';
  return 'supplemental';
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT_FIT — locked S206 from desk/role inspection in rosterLookup.js.
// Per-format scores 0-4; journalists not in a sub-table default to
// FORMAT_FIT_DEFAULT (1, neutral non-zero so theme-axis can break ties).
//
// Tables encode editorial intent:
//   edition       — civic-lead, front-page bylines (Carmen, Luis, Mezran, Torres top)
//   supplemental  — long-view, deep-dive (Hal, Simon, Sharon, Mags top)
//   dispatch      — scene-anchored, atmosphere (DJ, Maria, Mason, Kai top)
//   interview     — single-citizen profile (Maria, Hal top)
// ─────────────────────────────────────────────────────────────────────────────
var FORMAT_FIT = {
  'edition': {
    'Carmen Delaine':     4,
    'Luis Navarro':       4,
    'Dr. Lila Mezran':    4,
    'Sgt. Rachel Torres': 4,
    'Trevor Shimizu':     3,
    'Anthony':            3,
    'Selena Grant':       3,
    'Mags Corliss':       3
  },
  'supplemental': {
    'Hal Richmond':   4,
    'Simon Leary':    4,
    'Sharon Okafor':  4,
    'Mags Corliss':   4,
    'Carmen Delaine': 3,
    'Mason Ortega':   3,
    'Angela Reyes':   3
  },
  'dispatch': {
    'DJ Hartley':    4,
    'Maria Keen':    4,
    'Mason Ortega':  4,
    'Kai Marston':   4,
    'Talia Finch':   3,
    'Sharon Okafor': 3,
    'Tanya Cruz':    3
  },
  'interview': {
    'Maria Keen':    4,
    'Hal Richmond':  4,
    'Mags Corliss':  3,
    'Luis Navarro':  3,
    'Kai Marston':   3,
    'Mason Ortega':  3
  }
};
var FORMAT_FIT_DEFAULT = 1;

function formatFitScore_(journalistName, format) {
  if (!format || !journalistName) return FORMAT_FIT_DEFAULT;
  var table = FORMAT_FIT[format];
  if (!table) return FORMAT_FIT_DEFAULT;
  return (table[journalistName] != null) ? table[journalistName] : FORMAT_FIT_DEFAULT;
}

// ─────────────────────────────────────────────────────────────────────────────
// formatAxis_ — wired S206. Composes inferSeedFormat_(seed) + formatFitScore_.
//
// Signature change from T3.1 stub: takes journalistName (not journalist
// object) since format-fit lookup is name-keyed. Per-axis signature
// asymmetry (theme needs journalist.themes object; format/cadence/arc
// need name) is acceptable cost vs forcing all axes through one shape.
// ─────────────────────────────────────────────────────────────────────────────
function formatAxis_(seed, journalistName) {
  var format = inferSeedFormat_(seed);
  return formatFitScore_(journalistName, format);
}

// ─────────────────────────────────────────────────────────────────────────────
// CADENCE — cap math. Plan T3.3 + S206 amendment.
//
// Suppression curve:
//   ratio < CADENCE_CAP_KNEE         → 1.0           (no penalty)
//   ratio in [KNEE, CAP_RATIO]       → linear 1.0 → FLOOR
//   ratio >= CADENCE_CAP_RATIO       → CADENCE_CAP_FLOOR (0.3)
//
// At ratio 0.225 (midpoint between knee 0.20 and cap 0.25), multiplier is
// 0.65. The knee gives bylines breathing room up to 20% before any penalty
// kicks in; the cap floors at 0.3 so over-routed bylines drop to ~30% of
// their non-cadence score, opening room for next-best candidates.
// ─────────────────────────────────────────────────────────────────────────────
var CADENCE_CAP_KNEE = 0.20;
var CADENCE_CAP_RATIO = 0.25;
var CADENCE_CAP_FLOOR = 0.3;

// ─────────────────────────────────────────────────────────────────────────────
// loadCycleCadence_ — pure-function lookup over pre-loaded Story_Seed_Deck.
//
// Returns { counts: { bylineName: emittedCount }, total: N } for the
// requested target cycle. Caller decides which cycle to read (typically
// current_cycle - 1 per T3.3 prior-cycle reference rule).
//
// Reads `BylineCandidate` column when present (post-T3.7 schema add), falls
// back to legacy `SuggestedJournalist` for cycles emitted before Engine B
// wires in. Both reflect the byline-engine's recommendation surface.
//
// Caller pre-loads deck data via runtime of choice (Apps Script
// SpreadsheetApp or Node lib/sheets.js).
// ─────────────────────────────────────────────────────────────────────────────
function loadCycleCadence_(targetCycle, deckData) {
  var empty = { counts: {}, total: 0 };
  if (!deckData || deckData.length < 2) return empty;
  var cycle = parseInt(targetCycle, 10);
  if (!isFinite(cycle)) return empty;

  var headers = deckData[0];
  var cycleIdx = headers.indexOf('Cycle');
  var bylineIdx = headers.indexOf('BylineCandidate');
  var legacyIdx = headers.indexOf('SuggestedJournalist');
  var nameIdx = bylineIdx >= 0 ? bylineIdx : legacyIdx;
  if (cycleIdx < 0 || nameIdx < 0) return empty;

  var counts = {};
  var total = 0;
  for (var i = 1; i < deckData.length; i++) {
    var row = deckData[i];
    var rowCycle = parseInt(row[cycleIdx], 10);
    if (rowCycle !== cycle) continue;
    var name = String(row[nameIdx] || '').trim();
    if (!name) continue;
    counts[name] = (counts[name] || 0) + 1;
    total++;
  }
  return { counts: counts, total: total };
}

// ─────────────────────────────────────────────────────────────────────────────
// cadenceMultiplier_ — pure scoring function. Computes per-journalist
// multiplier from prior-cycle cadence ratio.
// ─────────────────────────────────────────────────────────────────────────────
function cadenceMultiplier_(journalistName, cadence, totalSeeds) {
  if (!cadence || !journalistName) return 1.0;
  var total = parseInt(totalSeeds, 10);
  if (!isFinite(total) || total <= 0) return 1.0;
  var count = cadence[journalistName] || 0;
  var ratio = count / total;

  if (ratio < CADENCE_CAP_KNEE) return 1.0;
  if (ratio >= CADENCE_CAP_RATIO) return CADENCE_CAP_FLOOR;

  // Linear interpolation between (KNEE, 1.0) and (CAP, FLOOR).
  var span = CADENCE_CAP_RATIO - CADENCE_CAP_KNEE;
  var dropPerUnit = (1.0 - CADENCE_CAP_FLOOR) / span;
  return 1.0 - (ratio - CADENCE_CAP_KNEE) * dropPerUnit;
}

// ─────────────────────────────────────────────────────────────────────────────
// cadenceAxis_ — wired S206. Composes loadCycleCadence_ output (in state)
// with cadenceMultiplier_. Cold-start (no prior cadence): returns 1.0.
// ─────────────────────────────────────────────────────────────────────────────
function cadenceAxis_(journalistName, state) {
  if (!state || !state.cadence) return 1.0;
  return cadenceMultiplier_(journalistName, state.cadence, state.totalSeeds || 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// ARC BINDING — bonus for arc-bound reporters. Plan T3.4.
//
// When a Storyline has a populated `AssignedReporter` (auto-bound by T3.5
// from Mags' actual published bylines after 2+ consecutive editions), the
// bound reporter gets +3 on any seed linked to that storyline.
//
// Decay: resolved or abandoned storylines return null binding (no bonus).
// Warm-up: `AssignedReporter` column absent (pre-T3.5) → null binding for
// every seed → arcBindingAxis returns 0 → multi-axis scorer functions as
// 3-axis (theme + format + cadence) until first auto-bind row lands. Per
// Fork 2 = Mags' picks, that takes ~2 cycles after Phase 6 cutover.
// ─────────────────────────────────────────────────────────────────────────────
var ARC_BINDING_BONUS = 3;

// ─────────────────────────────────────────────────────────────────────────────
// loadArcBinding_ — pure-function lookup of arc's bound reporter.
//
// Plan signature was `(arcId, storylineData)`; S206 stewardship adjustment:
// take whole seed for symmetry with priorityEngine.js's
// `loadStorylineStateForSeed_(seed, storylineData, cycle)`. Reads
// `seed.linkedStorylineId` as a Storyline_Tracker rowNumber (per
// applyStorySeeds.js v3.8 docstring — opaque key for this purpose).
//
// Returns:
//   string  — bound reporter name (active arc, AssignedReporter populated)
//   null    — no binding for any reason (warm-up, resolved/abandoned arc,
//             empty cell, seed without linkage, OOB row, T3.5 column absent)
// ─────────────────────────────────────────────────────────────────────────────
function loadArcBinding_(seed, storylineData) {
  if (!seed || seed.linkedStorylineId == null) return null;
  if (!storylineData || storylineData.length < 2) return null;

  var rowNumber = parseInt(seed.linkedStorylineId, 10);
  if (!isFinite(rowNumber) || rowNumber < 2 || rowNumber > storylineData.length) return null;

  var headers = storylineData[0];
  var bindIdx = headers.indexOf('AssignedReporter');
  if (bindIdx < 0) return null;  // T3.5 not yet shipped — warm-up null
  var statusIdx = headers.indexOf('Status');

  var row = storylineData[rowNumber - 1];

  // Decay: resolved/abandoned arcs nullify binding.
  if (statusIdx >= 0) {
    var status = String(row[statusIdx] || '').trim().toLowerCase();
    if (status === 'resolved' || status === 'abandoned') return null;
  }

  var binding = String(row[bindIdx] || '').trim();
  return binding || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// arcBindingScore_ — pure scoring. +3 to bound reporter, 0 to everyone else.
// ─────────────────────────────────────────────────────────────────────────────
function arcBindingScore_(journalistName, arcBinding) {
  if (!arcBinding || !journalistName) return 0;
  return (journalistName === arcBinding) ? ARC_BINDING_BONUS : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// arcBindingAxis_ — wired S206. Reads state.arcBinding (caller pre-resolves
// per seed via loadArcBinding_). Cold-state and warm-up both return 0.
// ─────────────────────────────────────────────────────────────────────────────
function arcBindingAxis_(journalistName, state) {
  if (!state) return 0;
  return arcBindingScore_(journalistName, state.arcBinding);
}

// ─────────────────────────────────────────────────────────────────────────────
// BYLINE_INELIGIBLE_ROLES — roles excluded from byline auto-assignment.
//
// Editor-in-Chief composes the load-out (doesn't take byline assignments);
// photo desk produces images, not articles; Copy Chief is editorial QA.
// These names are present in the newsroom roster for context lookup but
// must never appear as engine candidates. G-S14 (C94): without this filter
// FP1 + QT1 routed to Mags Corliss, N1 routed to DJ Hartley.
//
// Filter applied at state.roster construction by callers via
// filterRosterForByline_. Editorial design preserved: Mags's
// `Mags Corliss: 4` row in FORMAT_FIT.supplemental documents editor's
// historical column-writing weight; she just isn't a routed candidate.
// ─────────────────────────────────────────────────────────────────────────────
var BYLINE_INELIGIBLE_ROLES = {
  'Editor-in-Chief': true,
  'Senior Photographer': true,
  'Photo Assistant': true,
  'Copy Chief': true
};

function filterRosterForByline_(roster) {
  if (!roster) return {};
  var out = {};
  var names = Object.keys(roster);
  for (var i = 0; i < names.length; i++) {
    var entry = roster[names[i]];
    var role = entry && entry.role ? String(entry.role) : '';
    if (BYLINE_INELIGIBLE_ROLES[role]) continue;
    out[names[i]] = entry;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// scoreByline_ — multi-axis scorer for one (seed, journalist) pair.
//
// Returns:
//   {
//     name: 'Journalist Name',
//     score: total composite,
//     components: { theme, format, arc, cadence }  // raw axis values
//   }
//
// Composition: total = (theme + format + arc) * cadence
// Cadence is the only multiplier; theme/format/arc are additive contributors.
// ─────────────────────────────────────────────────────────────────────────────
function scoreByline_(seed, journalistName, state) {
  if (!state || !state.roster) {
    throw new Error('scoreByline_ requires state.roster');
  }
  var journalist = state.roster[journalistName];
  if (!journalist) {
    return { name: journalistName, score: 0, components: { theme: 0, format: 0, arc: 0, cadence: 0 } };
  }

  var theme = themeAxis_(seed, journalist);
  var format = formatAxis_(seed, journalistName);
  var arc = arcBindingAxis_(journalistName, state);
  var cadence = cadenceAxis_(journalistName, state);

  var total = (theme + format + arc) * cadence;
  if (total < 0) total = 0;

  return {
    name: journalistName,
    score: total,
    components: { theme: theme, format: format, arc: arc, cadence: cadence }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// scoreAllBylines_ — ranks every journalist in state.roster against the seed.
//
// Returns array of `{ name, score, components, confidence }` sorted by score
// desc. Confidence is computed once on the top-2 and attached only to the
// top entry; downstream alternates expose their components but no per-row
// confidence (since "confidence" is meaningful only at the rank-1 boundary).
// ─────────────────────────────────────────────────────────────────────────────
function scoreAllBylines_(seed, state) {
  if (!state || !state.roster) {
    throw new Error('scoreAllBylines_ requires state.roster');
  }
  var names = Object.keys(state.roster);
  var ranked = [];
  for (var i = 0; i < names.length; i++) {
    ranked.push(scoreByline_(seed, names[i], state));
  }
  ranked.sort(function (a, b) { return b.score - a.score; });

  var topScore = ranked.length > 0 ? ranked[0].score : 0;
  var secondScore = ranked.length > 1 ? ranked[1].score : 0;
  var conf = categorizeConfidence_(topScore, secondScore);

  if (ranked.length > 0) {
    ranked[0].confidence = conf.label;
    ranked[0].confidenceGap = conf.gap;
  }
  return ranked;
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-test harness. Runs only when file invoked directly via
//   node utilities/bylineEngine.js
// In Apps Script (no `require`) and Node `require()` calls, the guard skips.
// ─────────────────────────────────────────────────────────────────────────────
function _runSelfTests_() {
  var pass = 0, fail = 0;
  function eq(label, actual, expected) {
    if (actual === expected) { pass++; return; }
    fail++;
    console.error('FAIL ' + label + ' — got ' + JSON.stringify(actual) + ', want ' + JSON.stringify(expected));
  }
  function approx(label, actual, expected, tol) {
    if (Math.abs(actual - expected) <= (tol || 0.001)) { pass++; return; }
    fail++;
    console.error('FAIL ' + label + ' — got ' + actual + ', want ~' + expected);
  }

  // Mock roster (subset of real rosterLookup.js)
  var ROSTER = {
    'Simon Leary': {
      desk: 'sports',
      themes: ['The city underneath the noise', 'Stability as foundation', 'Quiet months', 'Texture']
    },
    'Carmen Delaine': {
      desk: 'metro',
      themes: ['Civic load', 'System health', 'Infrastructure pulse', 'Calm cycles', 'Baseline variation']
    },
    'Dr. Lila Mezran': {
      desk: 'metro',
      themes: ['Expansion patterns', 'What we didn\'t predict', 'Geographic spread', 'Containment failure']
    },
    'Maria Keen': {
      desk: 'culture',
      themes: ['Faith', 'Family', 'Neighborhood rhythm', 'Small acts of devotion', 'Community memory']
    },
    'Trevor Shimizu': {
      desk: 'metro',
      themes: ['Micro-failures accumulating', 'Tolerance limits', 'Maintenance backlogs', 'System symptoms']
    }
  };
  var STATE = { roster: ROSTER, cycle: 94, cadence: null, totalSeeds: 0, arcBinding: null };

  // themeAxis_ — Carmen wins on civic per plan acceptance.
  // Note: themeAxis_ tests pass minimal seeds (just domain) since theme-axis
  // doesn't read seedType. End-to-end tests below use realistic seed shapes
  // with seedType so format-axis inference works.
  var civicThemeProbe = { domain: 'CIVIC' };
  eq('theme: Carmen on CIVIC', themeAxis_(civicThemeProbe, ROSTER['Carmen Delaine']), 3);  // civic+system+baseline partials
  eq('theme: Simon on CIVIC', themeAxis_(civicThemeProbe, ROSTER['Simon Leary']), 0);
  eq('theme: Mezran on CIVIC', themeAxis_(civicThemeProbe, ROSTER['Dr. Lila Mezran']), 0);

  // themeAxis_ on HEALTH — Mezran wins
  var healthThemeProbe = { domain: 'HEALTH' };
  eq('theme: Mezran on HEALTH (containment+patterns+expansion partials)', themeAxis_(healthThemeProbe, ROSTER['Dr. Lila Mezran']) > 0, true);
  eq('theme: Simon on HEALTH', themeAxis_(healthThemeProbe, ROSTER['Simon Leary']), 0);

  // GENERAL bypass — every journalist scores 0
  var generalThemeProbe = { domain: 'GENERAL' };
  eq('theme: GENERAL bypass for Simon', themeAxis_(generalThemeProbe, ROSTER['Simon Leary']), 0);
  eq('theme: GENERAL bypass for Carmen', themeAxis_(generalThemeProbe, ROSTER['Carmen Delaine']), 0);
  eq('theme: GENERAL bypass for Mezran', themeAxis_(generalThemeProbe, ROSTER['Dr. Lila Mezran']), 0);
  eq('theme: lowercase domain GENERAL bypass', themeAxis_({ domain: 'general' }, ROSTER['Simon Leary']), 0);

  // Defensive
  eq('theme: null seed -> 0', themeAxis_(null, ROSTER['Simon Leary']), 0);
  eq('theme: null journalist -> 0', themeAxis_(civicThemeProbe, null), 0);
  eq('theme: unknown domain -> 0', themeAxis_({ domain: 'WEIRD' }, ROSTER['Simon Leary']), 0);

  // categorizeConfidence_ — happy path
  eq('conf: top 5 second 1 -> high (gap 0.8, top >=3)', categorizeConfidence_(5, 1).label, 'high');
  eq('conf: top 5 second 4 -> medium (gap 0.2)', categorizeConfidence_(5, 4).label, 'medium');
  eq('conf: top 5 second 4.5 -> low (gap 0.1 < 0.2)', categorizeConfidence_(5, 4.5).label, 'low');

  // Stewardship floor: top=1, second=0 must NOT be high (was math-degenerate)
  eq('conf: top 1 second 0 -> medium (absolute floor blocks HIGH)', categorizeConfidence_(1, 0).label, 'medium');
  eq('conf: top 2 second 0 -> medium (absolute floor blocks HIGH)', categorizeConfidence_(2, 0).label, 'medium');
  eq('conf: top 3 second 0 -> high (at floor, gap 1.0)', categorizeConfidence_(3, 0).label, 'high');
  eq('conf: top 3 second 2.4 -> medium (gap 0.2)', categorizeConfidence_(3, 2.4).label, 'medium');

  // Edge cases
  eq('conf: top 0 -> low', categorizeConfidence_(0, 0).label, 'low');
  eq('conf: negative second clamped', categorizeConfidence_(5, -1).gap, 1);

  // scoreByline_ composition: total = (theme + format + arc) * cadence
  // Use realistic seed (with seedType=civic → edition format → Carmen 4 fit)
  var civicEditionSeedProbe = { seedType: 'civic', domain: 'CIVIC', priority: 'HIGH' };
  var s1 = scoreByline_(civicEditionSeedProbe, 'Carmen Delaine', STATE);
  eq('scoreByline: Carmen on civic+edition name', s1.name, 'Carmen Delaine');
  eq('scoreByline: Carmen on civic+edition theme', s1.components.theme, 3);
  eq('scoreByline: Carmen on civic+edition format', s1.components.format, 4);
  eq('scoreByline: Carmen on civic+edition arc stub', s1.components.arc, 0);
  eq('scoreByline: Carmen on civic+edition cadence stub', s1.components.cadence, 1.0);
  eq('scoreByline: Carmen total = (3+4+0)*1.0 = 7', s1.score, 7);

  // Unknown journalist — defensive zero return
  var sUnknown = scoreByline_(civicEditionSeedProbe, 'Nobody Special', STATE);
  eq('scoreByline: unknown journalist -> 0 score', sUnknown.score, 0);

  // scoreAllBylines_ — Carmen wins on civic+edition, plan acceptance
  var ranked = scoreAllBylines_(civicEditionSeedProbe, STATE);
  eq('scoreAll: ranked length matches roster', ranked.length, 5);
  eq('scoreAll: top is Carmen on CIVIC', ranked[0].name, 'Carmen Delaine');
  eq('scoreAll: top score 7', ranked[0].score, 7);
  eq('scoreAll: top has confidence', typeof ranked[0].confidence, 'string');
  // Carmen 7 vs second: Trevor (theme 1 system-partial + format 3 edition fit) = 4
  // Gap (7-4)/7 = 0.43 > 0.4 AND top=7 ≥ floor 3 → HIGH
  eq('scoreAll: Carmen on civic+edition -> HIGH confidence', ranked[0].confidence, 'high');

  // GENERAL seed bypass: theme=0 universally, but format axis still scores.
  // Use storyline-followup (86% of seeds) → supplemental → Simon's home turf.
  var generalSupSeedProbe = { seedType: 'storyline-followup', domain: 'GENERAL' };
  var generalRanked = scoreAllBylines_(generalSupSeedProbe, STATE);
  eq('scoreAll: GENERAL all theme=0', generalRanked.every(function (r) { return r.components.theme === 0; }), true);
  // Format-axis differentiates: Simon supplemental fit 4, Carmen 3, others default 1.
  eq('scoreAll: GENERAL+supplemental Simon top by format', generalRanked[0].name, 'Simon Leary');
  eq('scoreAll: GENERAL+supplemental Simon score 4', generalRanked[0].score, 4);

  // Empty roster -> empty ranked
  var emptyState = { roster: {}, cycle: 94 };
  eq('scoreAll: empty roster -> empty ranked', scoreAllBylines_(civicEditionSeedProbe, emptyState).length, 0);

  // Missing state.roster -> throws
  var threw = false;
  try { scoreAllBylines_(civicEditionSeedProbe, {}); } catch (e) { threw = true; }
  eq('scoreAll: missing roster throws', threw, true);

  // ── T3.2: inferSeedFormat_ ───────────────────────────────────────────────
  eq('format: pattern -> edition', inferSeedFormat_({ seedType: 'pattern' }), 'edition');
  eq('format: cluster -> edition', inferSeedFormat_({ seedType: 'cluster' }), 'edition');
  eq('format: shock -> edition', inferSeedFormat_({ seedType: 'shock' }), 'edition');
  eq('format: civic -> edition', inferSeedFormat_({ seedType: 'civic' }), 'edition');
  eq('format: health -> edition', inferSeedFormat_({ seedType: 'health' }), 'edition');
  eq('format: sports -> edition', inferSeedFormat_({ seedType: 'sports' }), 'edition');
  eq('format: storyline-active HIGH -> edition', inferSeedFormat_({ seedType: 'storyline-active', priority: 'HIGH' }), 'edition');
  eq('format: storyline-active urgent -> edition', inferSeedFormat_({ seedType: 'storyline-active', priority: 'urgent' }), 'edition');
  eq('format: storyline-active normal -> supplemental', inferSeedFormat_({ seedType: 'storyline-active', priority: 'normal' }), 'supplemental');
  eq('format: storyline-active low -> supplemental', inferSeedFormat_({ seedType: 'storyline-active', priority: 'low' }), 'supplemental');
  eq('format: storyline-followup -> supplemental', inferSeedFormat_({ seedType: 'storyline-followup' }), 'supplemental');
  eq('format: storyline-question -> interview', inferSeedFormat_({ seedType: 'storyline-question' }), 'interview');
  eq('format: seasonal -> dispatch', inferSeedFormat_({ seedType: 'seasonal' }), 'dispatch');
  eq('format: firstfriday -> dispatch', inferSeedFormat_({ seedType: 'firstfriday' }), 'dispatch');
  eq('format: event -> dispatch', inferSeedFormat_({ seedType: 'event' }), 'dispatch');
  eq('format: signal -> supplemental', inferSeedFormat_({ seedType: 'signal' }), 'supplemental');
  eq('format: unknown seedType -> supplemental fallback', inferSeedFormat_({ seedType: 'whatever' }), 'supplemental');
  eq('format: null seed -> supplemental fallback', inferSeedFormat_(null), 'supplemental');
  eq('format: case-insensitive seedType', inferSeedFormat_({ seedType: 'PATTERN' }), 'edition');

  // ── T3.2: formatFitScore_ ────────────────────────────────────────────────
  eq('fit: Carmen on edition = 4', formatFitScore_('Carmen Delaine', 'edition'), 4);
  eq('fit: DJ Hartley on dispatch = 4', formatFitScore_('DJ Hartley', 'dispatch'), 4);
  eq('fit: Hal Richmond on supplemental = 4', formatFitScore_('Hal Richmond', 'supplemental'), 4);
  eq('fit: Maria Keen on interview = 4', formatFitScore_('Maria Keen', 'interview'), 4);
  eq('fit: Trevor Shimizu on edition = 3', formatFitScore_('Trevor Shimizu', 'edition'), 3);
  eq('fit: Mags on supplemental = 4', formatFitScore_('Mags Corliss', 'supplemental'), 4);
  eq('fit: unknown journalist -> default 1', formatFitScore_('Nobody Special', 'edition'), 1);
  eq('fit: Carmen on dispatch -> default 1 (not in dispatch table)', formatFitScore_('Carmen Delaine', 'dispatch'), 1);
  eq('fit: unknown format -> default 1', formatFitScore_('Carmen Delaine', 'weirdformat'), 1);
  eq('fit: null inputs -> default 1', formatFitScore_(null, null), 1);

  // ── T3.2: formatAxis_ end-to-end ─────────────────────────────────────────
  // Civic seed (typed-domain) -> edition format -> Carmen scores 4 on format alone
  eq('formatAxis: civic+pattern -> Carmen 4', formatAxis_({ seedType: 'pattern', domain: 'CIVIC' }, 'Carmen Delaine'), 4);
  // GENERAL+storyline-followup -> supplemental -> Simon scores 4 on format
  eq('formatAxis: storyline-followup -> Simon 4 supplemental', formatAxis_({ seedType: 'storyline-followup', domain: 'GENERAL' }, 'Simon Leary'), 4);
  // seasonal -> dispatch -> DJ Hartley 4
  eq('formatAxis: seasonal -> DJ 4 dispatch', formatAxis_({ seedType: 'seasonal' }, 'DJ Hartley'), 4);
  // unknown journalist on any seed -> 1
  eq('formatAxis: unknown journalist -> 1', formatAxis_({ seedType: 'pattern' }, 'Nobody'), 1);

  // ── T3.2: scoreByline_ end-to-end with format wired ──────────────────────
  // CIVIC + pattern (edition format): Carmen theme=3 + format=4 = 7 score (cadence=1.0)
  var civicEditionSeed = { seedType: 'pattern', domain: 'CIVIC', priority: 'HIGH' };
  var carmenScore = scoreByline_(civicEditionSeed, 'Carmen Delaine', STATE);
  eq('byline: Carmen on civic+pattern theme', carmenScore.components.theme, 3);
  eq('byline: Carmen on civic+pattern format', carmenScore.components.format, 4);
  eq('byline: Carmen on civic+pattern total = 7', carmenScore.score, 7);
  // Simon on same seed: theme=0 (no civic overlap), format=1 (default, not in edition table). Total: 1
  var simonOnCivic = scoreByline_(civicEditionSeed, 'Simon Leary', STATE);
  eq('byline: Simon on civic+pattern theme=0', simonOnCivic.components.theme, 0);
  eq('byline: Simon on civic+pattern format=1', simonOnCivic.components.format, 1);
  eq('byline: Simon on civic+pattern total=1', simonOnCivic.score, 1);

  // GENERAL+storyline-followup (supplemental format): Simon theme=0 (bypass), format=4. Total: 4
  var generalSupplementalSeed = { seedType: 'storyline-followup', domain: 'GENERAL' };
  var simonOnGeneral = scoreByline_(generalSupplementalSeed, 'Simon Leary', STATE);
  eq('byline: Simon on GENERAL+storyline-followup theme=0', simonOnGeneral.components.theme, 0);
  eq('byline: Simon on GENERAL+storyline-followup format=4', simonOnGeneral.components.format, 4);
  eq('byline: Simon on GENERAL+storyline-followup total=4', simonOnGeneral.score, 4);
  // Carmen on same seed: theme=0 (GENERAL bypass), format=3 (Carmen has supplemental fit 3)
  var carmenOnGeneral = scoreByline_(generalSupplementalSeed, 'Carmen Delaine', STATE);
  eq('byline: Carmen on GENERAL+storyline-followup format=3', carmenOnGeneral.components.format, 3);
  eq('byline: Carmen on GENERAL+storyline-followup total=3', carmenOnGeneral.score, 3);

  // ── T3.2: scoreAllBylines_ acceptance check on GENERAL ───────────────────
  // GENERAL+storyline-followup: Simon (supplemental fit 4) should now beat
  // others who default to 1. This is the FORMAT-AXIS rebalance — without it,
  // T3.1 GENERAL bypass produces all-zeros and arbitrary ordering.
  var rankedGeneral = scoreAllBylines_(generalSupplementalSeed, STATE);
  eq('rankedGen: Simon top on supplemental format', rankedGeneral[0].name, 'Simon Leary');
  // Note: Simon is in the supplemental high-fit table. This is intentional
  // editorial design — Simon's "Long View Columnist" role IS the supplemental
  // archetype. The pathology was Simon dominating EVERY domain via theme bias;
  // with theme bypassed on GENERAL, format puts Simon on his actual lane.

  // CIVIC+pattern: Carmen wins decisively (theme 3 + format 4 = 7) over Simon (theme 0 + format 1 = 1)
  var rankedCivic = scoreAllBylines_(civicEditionSeed, STATE);
  eq('rankedCivic: Carmen top', rankedCivic[0].name, 'Carmen Delaine');
  eq('rankedCivic: Carmen score 7', rankedCivic[0].score, 7);
  eq('rankedCivic: top confidence high', rankedCivic[0].confidence, 'high');

  // ── T3.3: loadCycleCadence_ ──────────────────────────────────────────────
  var deckSample = [
    ['Cycle', 'SeedID', 'SeedType', 'Domain', 'Neighborhood', 'Priority', 'SeedText', 'SuggestedJournalist'],
    [92, 'X1', 'storyline-followup', 'GENERAL', '', 'normal', '', 'Simon Leary'],
    [92, 'X2', 'storyline-followup', 'GENERAL', '', 'normal', '', 'Simon Leary'],
    [92, 'X3', 'storyline-followup', 'GENERAL', '', 'normal', '', 'Simon Leary'],
    [92, 'X4', 'civic',              'CIVIC',   '', 'high',   '', 'Carmen Delaine'],
    [93, 'X5', 'storyline-followup', 'GENERAL', '', 'normal', '', 'Simon Leary']
  ];
  var c92 = loadCycleCadence_(92, deckSample);
  eq('loadCadence c92 total', c92.total, 4);
  eq('loadCadence c92 Simon=3', c92.counts['Simon Leary'], 3);
  eq('loadCadence c92 Carmen=1', c92.counts['Carmen Delaine'], 1);
  eq('loadCadence c93 total (only X5)', loadCycleCadence_(93, deckSample).total, 1);
  eq('loadCadence empty deck', loadCycleCadence_(92, []).total, 0);
  eq('loadCadence non-existent cycle', loadCycleCadence_(99, deckSample).total, 0);

  // BylineCandidate preferred over SuggestedJournalist when present
  var deckPostT37 = [
    ['Cycle', 'SuggestedJournalist', 'BylineCandidate'],
    [92, 'Simon Leary', 'Carmen Delaine'],
    [92, 'Simon Leary', 'Carmen Delaine']
  ];
  var c92post = loadCycleCadence_(92, deckPostT37);
  eq('loadCadence: BylineCandidate preferred over Suggested', c92post.counts['Carmen Delaine'], 2);
  eq('loadCadence: BylineCandidate ignores legacy column', c92post.counts['Simon Leary'], undefined);

  // ── T3.3: cadenceMultiplier_ ─────────────────────────────────────────────
  // Below knee
  approx('cadence: ratio 0 -> 1.0', cadenceMultiplier_('X', { 'X': 0 }, 100), 1.0);
  approx('cadence: ratio 0.10 -> 1.0', cadenceMultiplier_('X', { 'X': 10 }, 100), 1.0);
  approx('cadence: ratio 0.19 -> 1.0', cadenceMultiplier_('X', { 'X': 19 }, 100), 1.0);
  // At knee
  approx('cadence: ratio 0.20 -> 1.0 (knee)', cadenceMultiplier_('X', { 'X': 20 }, 100), 1.0);
  // Linear ramp
  approx('cadence: ratio 0.225 -> 0.65 (midpoint)', cadenceMultiplier_('X', { 'X': 225 }, 1000), 0.65);
  // At cap
  approx('cadence: ratio 0.25 -> 0.3 (cap)', cadenceMultiplier_('X', { 'X': 25 }, 100), 0.3);
  // Above cap (floor)
  approx('cadence: ratio 0.30 -> 0.3 (floor)', cadenceMultiplier_('X', { 'X': 30 }, 100), 0.3);
  approx('cadence: ratio 0.50 -> 0.3 (floor)', cadenceMultiplier_('X', { 'X': 50 }, 100), 0.3);
  approx('cadence: ratio 0.76 (Simon-magnet) -> 0.3', cadenceMultiplier_('X', { 'X': 760 }, 1000), 0.3);
  // Defensive
  approx('cadence: null cadence -> 1.0', cadenceMultiplier_('X', null, 100), 1.0);
  approx('cadence: zero total -> 1.0', cadenceMultiplier_('X', { 'X': 50 }, 0), 1.0);
  approx('cadence: missing journalist -> 1.0 (count=0)', cadenceMultiplier_('Y', { 'X': 100 }, 100), 1.0);
  approx('cadence: null name -> 1.0', cadenceMultiplier_(null, { 'X': 100 }, 100), 1.0);

  // ── T3.3: cadenceAxis_ end-to-end ────────────────────────────────────────
  var stateNoCadence = { roster: ROSTER, cycle: 94, cadence: null, totalSeeds: 0 };
  approx('cadenceAxis: cold start (no prior data) -> 1.0', cadenceAxis_('Simon Leary', stateNoCadence), 1.0);

  var stateWithCadence = {
    roster: ROSTER,
    cycle: 94,
    cadence: { 'Simon Leary': 760, 'Carmen Delaine': 100, 'Maria Keen': 50 },
    totalSeeds: 1000
  };
  approx('cadenceAxis: Simon at 76% -> 0.3', cadenceAxis_('Simon Leary', stateWithCadence), 0.3);
  approx('cadenceAxis: Carmen at 10% -> 1.0', cadenceAxis_('Carmen Delaine', stateWithCadence), 1.0);
  approx('cadenceAxis: Trevor not in cadence -> 1.0', cadenceAxis_('Trevor Shimizu', stateWithCadence), 1.0);

  // ── T3.3: scoreByline_ end-to-end with cadence breaking Simon-magnet ────
  // GENERAL+storyline-followup: Simon was top via supplemental format-fit (4)
  // alone (T3.2 baseline). With prior-cycle cadence showing Simon at 76%:
  //   Simon: theme 0 + format 4 = 4, * cadence 0.3 = 1.2
  //   Hal Richmond: theme 0 + format 4 = 4, * cadence 1.0 = 4 (not in cadence map -> count 0)
  //   So Hal would beat Simon under cadence cap. Demonstrates the fix.
  // (We don't have Hal in our test ROSTER, so exercise with Simon vs Carmen instead.)
  var supSeed = { seedType: 'storyline-followup', domain: 'GENERAL' };
  var simonCapped = scoreByline_(supSeed, 'Simon Leary', stateWithCadence);
  eq('scoreByline: Simon capped theme 0', simonCapped.components.theme, 0);
  eq('scoreByline: Simon capped format 4', simonCapped.components.format, 4);
  approx('scoreByline: Simon capped cadence 0.3', simonCapped.components.cadence, 0.3);
  approx('scoreByline: Simon capped total 4*0.3=1.2', simonCapped.score, 1.2);
  var carmenUncapped = scoreByline_(supSeed, 'Carmen Delaine', stateWithCadence);
  approx('scoreByline: Carmen uncapped (10%) cadence 1.0', carmenUncapped.components.cadence, 1.0);
  eq('scoreByline: Carmen format 3 (supplemental)', carmenUncapped.components.format, 3);
  approx('scoreByline: Carmen total 3*1.0=3', carmenUncapped.score, 3);

  // Carmen now beats Simon on GENERAL+storyline-followup under cadence cap
  var rankedCapped = scoreAllBylines_(supSeed, stateWithCadence);
  eq('rankedCapped: Carmen tops Simon under cadence cap', rankedCapped[0].name, 'Carmen Delaine');

  // ── T3.4: loadArcBinding_ ────────────────────────────────────────────────
  // Warm-up: storyline data without AssignedReporter column → null
  var storylineWarmup = [
    ['CycleAdded', 'StorylineId', 'Priority', 'Status'],
    [88, 'SL-88-AAAA', 'high', 'active']
  ];
  eq('loadArcBinding: warm-up (no AssignedReporter col) -> null',
    loadArcBinding_({ linkedStorylineId: 2 }, storylineWarmup), null);

  // Active arc with binding populated
  var storylineLive = [
    ['CycleAdded', 'StorylineId', 'Priority', 'Status', 'AssignedReporter'],
    [88, 'SL-88-AAAA', 'high', 'active',    'Hal Richmond'],
    [89, 'SL-89-BBBB', 'high', 'resolved',  'Carmen Delaine'],
    [90, 'SL-90-CCCC', 'high', 'abandoned', 'Maria Keen'],
    [91, 'SL-91-DDDD', 'high', 'active',    '']  // empty cell
  ];
  eq('loadArcBinding: active arc -> Hal',
    loadArcBinding_({ linkedStorylineId: 2 }, storylineLive), 'Hal Richmond');
  eq('loadArcBinding: resolved arc -> null (decay)',
    loadArcBinding_({ linkedStorylineId: 3 }, storylineLive), null);
  eq('loadArcBinding: abandoned arc -> null (decay)',
    loadArcBinding_({ linkedStorylineId: 4 }, storylineLive), null);
  eq('loadArcBinding: empty cell -> null',
    loadArcBinding_({ linkedStorylineId: 5 }, storylineLive), null);
  eq('loadArcBinding: missing seed linkage -> null',
    loadArcBinding_({}, storylineLive), null);
  eq('loadArcBinding: null seed -> null',
    loadArcBinding_(null, storylineLive), null);
  eq('loadArcBinding: OOB row -> null',
    loadArcBinding_({ linkedStorylineId: 99 }, storylineLive), null);
  eq('loadArcBinding: header row (rowNumber=1) -> null',
    loadArcBinding_({ linkedStorylineId: 1 }, storylineLive), null);
  eq('loadArcBinding: empty storylineData -> null',
    loadArcBinding_({ linkedStorylineId: 2 }, []), null);

  // ── T3.4: arcBindingScore_ ───────────────────────────────────────────────
  eq('arcBindingScore: matching name -> +3', arcBindingScore_('Hal Richmond', 'Hal Richmond'), 3);
  eq('arcBindingScore: non-matching -> 0', arcBindingScore_('Carmen Delaine', 'Hal Richmond'), 0);
  eq('arcBindingScore: null binding -> 0', arcBindingScore_('Hal Richmond', null), 0);
  eq('arcBindingScore: null name -> 0', arcBindingScore_(null, 'Hal Richmond'), 0);
  eq('arcBindingScore: empty binding -> 0', arcBindingScore_('Hal Richmond', ''), 0);

  // ── T3.4: arcBindingAxis_ end-to-end ─────────────────────────────────────
  eq('arcBindingAxis: state without arcBinding -> 0 (warm-up)',
    arcBindingAxis_('Hal Richmond', { roster: ROSTER, cycle: 94 }), 0);
  eq('arcBindingAxis: state.arcBinding=null -> 0',
    arcBindingAxis_('Hal Richmond', { roster: ROSTER, cycle: 94, arcBinding: null }), 0);
  eq('arcBindingAxis: bound reporter +3',
    arcBindingAxis_('Hal Richmond', { roster: ROSTER, cycle: 94, arcBinding: 'Hal Richmond' }), 3);
  eq('arcBindingAxis: non-bound reporter 0',
    arcBindingAxis_('Carmen Delaine', { roster: ROSTER, cycle: 94, arcBinding: 'Hal Richmond' }), 0);

  // ── T3.4: scoreByline_ end-to-end with arc-binding nudging ranking ──────
  // GENERAL+storyline-followup with no cadence: Simon wins on supplemental
  // format-fit (4). Add arcBinding to a competitor → that competitor jumps.
  var arcSeed = { seedType: 'storyline-followup', domain: 'GENERAL' };
  var stateArcBoundCarmen = {
    roster: ROSTER,
    cycle: 94,
    cadence: null,
    totalSeeds: 0,
    arcBinding: 'Carmen Delaine'
  };
  // Carmen: theme 0 + format 3 + arc 3 = 6, * cadence 1.0 = 6
  // Simon: theme 0 + format 4 + arc 0 = 4, * cadence 1.0 = 4
  var carmenArcBound = scoreByline_(arcSeed, 'Carmen Delaine', stateArcBoundCarmen);
  eq('scoreByline: Carmen arc-bound total = (0+3+3)*1.0 = 6', carmenArcBound.score, 6);
  eq('scoreByline: Carmen arc component = 3', carmenArcBound.components.arc, 3);
  var simonNotBound = scoreByline_(arcSeed, 'Simon Leary', stateArcBoundCarmen);
  eq('scoreByline: Simon not-bound arc = 0', simonNotBound.components.arc, 0);
  eq('scoreByline: Simon not-bound total = 4', simonNotBound.score, 4);
  // Carmen tops the ranking under arc binding
  var rankedArc = scoreAllBylines_(arcSeed, stateArcBoundCarmen);
  eq('rankedArc: Carmen tops Simon under arc binding', rankedArc[0].name, 'Carmen Delaine');
  eq('rankedArc: Carmen score 6', rankedArc[0].score, 6);

  // ── G-S14: filterRosterForByline_ — non-reporter candidate-pool filter ──
  var roleMixed = {
    'Anthony':         { desk: 'sports',    role: 'Lead Beat Reporter' },
    'Hal Richmond':    { desk: 'sports',    role: 'Senior Historian' },
    'Mags Corliss':    { desk: 'editorial', role: 'Editor-in-Chief' },
    'DJ Hartley':      { desk: 'sports',    role: 'Senior Photographer' },
    'Arman Gutiérrez': { desk: 'photo',     role: 'Photo Assistant' },
    'Rhea Morgan':     { desk: 'editorial', role: 'Copy Chief' },
    'NoRoleEntry':     { desk: 'wire' }  // missing role -> kept (defensive)
  };
  var filtered = filterRosterForByline_(roleMixed);
  eq('filter: Anthony reporter kept', filtered['Anthony'] != null, true);
  eq('filter: Hal historian kept', filtered['Hal Richmond'] != null, true);
  eq('filter: Mags EIC dropped', filtered['Mags Corliss'] == null, true);
  eq('filter: DJ photographer dropped', filtered['DJ Hartley'] == null, true);
  eq('filter: Arman photo assistant dropped', filtered['Arman Gutiérrez'] == null, true);
  eq('filter: Rhea copy chief dropped', filtered['Rhea Morgan'] == null, true);
  eq('filter: missing-role entry kept (defensive)', filtered['NoRoleEntry'] != null, true);
  eq('filter: filtered size = 3 of 7', Object.keys(filtered).length, 3);
  eq('filter: null roster -> {}', Object.keys(filterRosterForByline_(null)).length, 0);
  eq('filter: empty roster -> {}', Object.keys(filterRosterForByline_({})).length, 0);

  console.log('bylineEngine self-tests: ' + pass + ' pass / ' + fail + ' fail');
  if (fail > 0 && typeof process !== 'undefined') process.exit(1);
}

// Apps Script picks these up via flat namespace at clasp push.
// Node side requires the dual-runtime guard for `require()` callers.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DOMAIN_KEYWORDS: DOMAIN_KEYWORDS,
    CONFIDENCE_HIGH_FLOOR: CONFIDENCE_HIGH_FLOOR,
    CONFIDENCE_HIGH_GAP: CONFIDENCE_HIGH_GAP,
    CONFIDENCE_MED_GAP: CONFIDENCE_MED_GAP,
    categorizeConfidence_: categorizeConfidence_,
    themeAxis_: themeAxis_,
    formatAxis_: formatAxis_,
    cadenceAxis_: cadenceAxis_,
    arcBindingAxis_: arcBindingAxis_,
    scoreByline_: scoreByline_,
    scoreAllBylines_: scoreAllBylines_,
    EDITION_SEEDTYPES: EDITION_SEEDTYPES,
    SUPPLEMENTAL_SEEDTYPES: SUPPLEMENTAL_SEEDTYPES,
    DISPATCH_SEEDTYPES: DISPATCH_SEEDTYPES,
    INTERVIEW_SEEDTYPES: INTERVIEW_SEEDTYPES,
    FORMAT_FIT: FORMAT_FIT,
    FORMAT_FIT_DEFAULT: FORMAT_FIT_DEFAULT,
    inferSeedFormat_: inferSeedFormat_,
    formatFitScore_: formatFitScore_,
    CADENCE_CAP_KNEE: CADENCE_CAP_KNEE,
    CADENCE_CAP_RATIO: CADENCE_CAP_RATIO,
    CADENCE_CAP_FLOOR: CADENCE_CAP_FLOOR,
    loadCycleCadence_: loadCycleCadence_,
    cadenceMultiplier_: cadenceMultiplier_,
    ARC_BINDING_BONUS: ARC_BINDING_BONUS,
    loadArcBinding_: loadArcBinding_,
    arcBindingScore_: arcBindingScore_,
    BYLINE_INELIGIBLE_ROLES: BYLINE_INELIGIBLE_ROLES,
    filterRosterForByline_: filterRosterForByline_
  };
}

if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  _runSelfTests_();
}
