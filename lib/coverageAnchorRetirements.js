/**
 * ============================================================================
 * Coverage Anchor Retirements v1.0
 * ============================================================================
 *
 * Central registry of citizens that have been editorially retired as coverage
 * anchors per NEWSROOM_MEMORY.md §Standing Editorial Conventions. Consumed by
 * rateEditionCoverage.js (article-tone downweight when retired-anchor +
 * avoid-framing co-occur) and buildCitizenCards.js (Coverage convention
 * block appended to the citizen's wd-card so Mara + downstream agents see
 * the convention inline alongside identity/role/bio).
 *
 * Why centralized: pre-S235 the convention lived only in NEWSROOM_MEMORY +
 * DJ RULES.md. /sift reads NEWSROOM_MEMORY so candidate selection has the
 * signal, but rateEditionCoverage (which drives the Edition_Coverage_Ratings
 * tab + downstream coverage-rating-based sift scoring) and buildCitizenCards
 * (which writes the wd-citizens layer Mara queries for canon) had no signal
 * — Beverly's coverage thread kept resurfacing at exactly the layers where
 * the editorial retirement was supposed to take effect.
 *
 * Adding a new retirement: append an entry to RETIRED_ANCHORS keyed by
 * POPID. Required fields documented at the entry; the consumers read them
 * defensively so partial entries (e.g. no avoidFramings list) skip the
 * downweight path but still emit the convention block.
 *
 * S235 engine.25 G-PR8e.
 * ============================================================================
 */

/**
 * @typedef {Object} RetiredAnchor
 * @property {string} fullName - Canonical "First Last".
 * @property {string} retiredAt - Session tag, e.g. "S229".
 * @property {string} effectiveFromCycle - First cycle the retirement applies
 *   to. Coverage in published editions BEFORE this cycle is canonical and
 *   should not be retroactively downweighted; the retirement is forward-only.
 * @property {string} why - One-sentence editorial reason. Shown to operators.
 * @property {string[]} composeAround - Acceptable / encouraged framings
 *   (prosperity-tone signal for sift + reporters).
 * @property {string[]} avoidFramings - Forbidden framings. The
 *   rateEditionCoverage downweight fires when an article touches the
 *   anchor's name AND any of these keywords (case-insensitive substring).
 * @property {string[]} avoidSubjectClasses - Visual / scene compositional
 *   classes to avoid (used by DJ-side enforcement; data lives here so the
 *   rule has one home).
 */

/**
 * Registry of editorially-retired coverage anchors keyed by POPID.
 * Entries are read-only — new editorial decisions append entries; existing
 * entries are reframed via separate rolllout work, not edited in place.
 */
var RETIRED_ANCHORS = {
  'POP-00772': {
    fullName: 'Beverly Hayes',
    retiredAt: 'S229',
    effectiveFromCycle: 95,
    why: 'Coverage thread (Stab Fund anchor across C90-C94, "cleared but block hasn\'t moved" framing, Telegraph stoop / community-director / tenant-watch motifs) pulled the narrative toward real-world struggling-Oakland tone. C94 G-PR8 surfaced the contamination at the visual layer — FLUX rendered her as poverty-doc subject even with explicit negative-frame paragraphs. Canon is prosperity-era Oakland.',
    composeAround: [
      'Building openings + hires',
      'District lift metrics',
      'Completion ceremonies',
      'Worker-at-work framing'
    ],
    avoidFramings: [
      'tenant-watch',
      'community-director',
      'cleared but unmoved',
      'cleared and still',
      'home health aide',
      'eviction',
      'displacement intake',
      'food bank',
      'food-bank line',
      'stoop',
      'mail-watcher',
      'pulled-thin',
      'weary'
    ],
    avoidSubjectClasses: [
      'community-organizer-at-stoop',
      'distressed-tenant',
      'food-bank-line',
      'eviction-court',
      'home-health-aide-on-break'
    ]
  }
};

/**
 * Quick existence check by POPID.
 *
 * @param {string} popId
 * @returns {boolean}
 */
function isRetiredAnchor(popId) {
  if (!popId) return false;
  return Object.prototype.hasOwnProperty.call(RETIRED_ANCHORS, popId);
}

/**
 * Fetch the retirement convention for a POPID, or null if not retired.
 *
 * @param {string} popId
 * @returns {RetiredAnchor|null}
 */
function getRetirementConvention(popId) {
  if (!popId) return null;
  return RETIRED_ANCHORS[popId] || null;
}

// Proximity window (chars) — name and framing must appear within this many
// characters of each other to count as a hit. Tunable; 400 chars is roughly
// 2-3 sentences which keeps the detection scoped to a single editorial beat.
var PROXIMITY_WINDOW_CHARS = 400;

// Editorial-lede scope (chars) — only the first SCOPE_CHARS of article text
// are considered. An article that "centers on" the anchor names them in
// the lede; articles where the name appears in the tail are typically the
// upstream parser dragging text across article boundaries (e.g. C94's
// Soria piece accumulating Beverly's C2 headline + bold lede at chars
// ~4000 because rateEditionCoverage's byline-closes-article parser doesn't
// close on section transitions, only on the next byline). The lede-scope
// check trims those drag artifacts without needing to fix the upstream
// parser. Tunable; 1500 chars covers most ledes + first body paragraphs.
var EDITORIAL_LEDE_SCOPE_CHARS = 1500;

/**
 * Detect whether a block of article text triggers a retirement downweight.
 * Triggers when an avoid-framing keyword appears within
 * PROXIMITY_WINDOW_CHARS of an anchor's fullName mention (case-insensitive,
 * substring-based, full-text scan). Returns the matched anchor(s) so callers
 * can emit diagnostics naming which retirement fired.
 *
 * @param {string} text - Article body or headline+body concatenation.
 * @returns {Array<{popId: string, fullName: string, matchedFramings: string[]}>}
 */
function detectRetiredAnchorHits(text) {
  if (!text || typeof text !== 'string') return [];
  // Scope to the editorial lede zone before lowercasing.
  var scoped = text.length > EDITORIAL_LEDE_SCOPE_CHARS ? text.slice(0, EDITORIAL_LEDE_SCOPE_CHARS) : text;
  var lower = scoped.toLowerCase();
  var hits = [];
  var popIds = Object.keys(RETIRED_ANCHORS);
  for (var i = 0; i < popIds.length; i++) {
    var pid = popIds[i];
    var entry = RETIRED_ANCHORS[pid];
    var nameLower = entry.fullName.toLowerCase();

    // Enumerate every name mention; for each, scan a window around it for
    // any avoidFramings keyword. Multiple mentions allowed; framings de-dup
    // across mentions so the diagnostic stays readable.
    var nameIndices = [];
    var fromIdx = 0;
    while (fromIdx < lower.length) {
      var nIdx = lower.indexOf(nameLower, fromIdx);
      if (nIdx === -1) break;
      nameIndices.push(nIdx);
      fromIdx = nIdx + nameLower.length;
    }
    if (nameIndices.length === 0) continue;

    var matchedFramings = {};
    var avoid = entry.avoidFramings || [];
    for (var n = 0; n < nameIndices.length; n++) {
      var center = nameIndices[n];
      var windowStart = Math.max(0, center - PROXIMITY_WINDOW_CHARS);
      var windowEnd = Math.min(lower.length, center + nameLower.length + PROXIMITY_WINDOW_CHARS);
      var window = lower.slice(windowStart, windowEnd);
      for (var f = 0; f < avoid.length; f++) {
        if (window.indexOf(avoid[f].toLowerCase()) !== -1) {
          matchedFramings[avoid[f]] = true;
        }
      }
    }
    var framingList = Object.keys(matchedFramings);
    if (framingList.length > 0) {
      hits.push({ popId: pid, fullName: entry.fullName, matchedFramings: framingList });
    }
  }
  return hits;
}

/**
 * Render a Coverage convention block for inclusion in a citizen card.
 * Returned as an array of lines so the caller can splice into card.
 *
 * @param {string} popId
 * @returns {string[]} Lines (empty array if popId not retired).
 */
function renderConventionBlock(popId) {
  var entry = getRetirementConvention(popId);
  if (!entry) return [];
  var lines = [];
  lines.push('');
  lines.push('COVERAGE CONVENTION (' + entry.retiredAt + ', NEWSROOM_MEMORY.md §Standing Editorial Conventions):');
  lines.push('Retired as coverage anchor effective C' + entry.effectiveFromCycle + '. ' + entry.why);
  if (entry.composeAround && entry.composeAround.length > 0) {
    lines.push('Compose around: ' + entry.composeAround.join(', ') + '.');
  }
  if (entry.avoidFramings && entry.avoidFramings.length > 0) {
    lines.push('Avoid framings: ' + entry.avoidFramings.slice(0, 8).join(', ') + '.');
  }
  return lines;
}

module.exports = {
  RETIRED_ANCHORS: RETIRED_ANCHORS,
  isRetiredAnchor: isRetiredAnchor,
  getRetirementConvention: getRetirementConvention,
  detectRetiredAnchorHits: detectRetiredAnchorHits,
  renderConventionBlock: renderConventionBlock
};
