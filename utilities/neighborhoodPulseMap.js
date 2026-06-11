/**
 * neighborhoodPulseMap.js v1 — citizen event -> neighborhood metric deltas (engine.33, S256).
 *
 * Sibling of citizenDialMap.js at neighborhood grain: a neighborhood is a
 * citizen-like accumulator. Generators call recordPulse_(S, hood, tag, tags)
 * at event-emit time; phase08 v3NeighborhoodWriter folds the dampened
 * accumulated pulse into the 4 citizen-movable Neighborhood_Map columns
 * (Sentiment, CrimeIndex, RetailVitality, EventAttractiveness).
 *
 * Vocabulary intentionally SPARSE — most events are private lives that don't
 * move a neighborhood (a quiet evening at home is a dial event, not a pulse
 * event). Only events with a public/communal footprint register. Unknown
 * tags are a no-op by design (opposite of citizenDialMap's zero-inert rule).
 *
 * Metric keys: sentiment | crime | vitality | attractiveness.
 * Raw units are event-points; the fold (Task 4) applies dampening + caps —
 * nothing here writes a sheet. Pure logic, ES5-safe (Node + Apps Script).
 *
 * Plan: docs/plans/2026-06-10-engine33-neighborhood-citizen-loop.md Task 1.
 */

var PULSE_MAP = {
  // --- Communal joy / family milestones (public footprint: gatherings) ---
  'Wedding':            { sentiment: 3, attractiveness: 1 },
  'Birth':              { sentiment: 2 },
  'Graduation':         { sentiment: 2 },

  // --- Community / neighborhood life ---
  'Community':          { sentiment: 2, attractiveness: 1 },
  'Neighborhood':       { sentiment: 1 },
  'Mentorship':         { sentiment: 1 },
  'CivicRole':          { sentiment: 1 },
  'Civic Role':         { sentiment: 1 },

  // --- Faith (engine.33 fan-out emits; faithEventsEngine records org-side) ---
  'Faith':              { sentiment: 1, attractiveness: 1 },
  'Faith-Crisis':       { sentiment: -3 },

  // --- Conduct -> crime (COMMIT events only — Task 3 wires the gate) ---
  'Transgression-Petty':   { crime: 1, sentiment: -1 },
  'Transgression-Serious': { crime: 3, sentiment: -2 },
  'Transgression-Grave':   { crime: 6, sentiment: -3 },
  'Resisted':              { crime: -1 },

  // --- Commerce / street life ---
  'Cultural':           { vitality: 1, attractiveness: 2 },
  'Education-Cultural': { vitality: 1, attractiveness: 1 },
  'Lifestyle':          { vitality: 1 },
  'FirstFriday':        { attractiveness: 2, vitality: 1 },
  'Sports':             { attractiveness: 1 },
  'Team':               { attractiveness: 1 },

  // --- Visible hardship (a neighborhood feels its losses) ---
  'Critical':           { sentiment: -1 },
  'Hospitalized':       { sentiment: -1 },
  'Death':              { sentiment: -2 }
};

// tags-array markers (source/evening tags) that pulse regardless of primary tag.
var TAG_RULES = [
  { tag: 'evening:cityEventAttend', fx: { attractiveness: 2, vitality: 1 } },
  { tag: 'source:faith',            fx: { sentiment: 1 } },
  { tag: 'business:venture',        fx: { vitality: 3, sentiment: 1 } }
];

// Content routing for venture/commerce events whose meaning is in the prose
// (mirrors citizenDialMap CONTENT_RULES shape; sparse on purpose).
var PULSE_CONTENT_RULES = [
  { re: /started a small|new business|venture|startup|opened a/, fx: { vitality: 3, sentiment: 1 } },
  { re: /shop closed|business closed|shut its doors/,            fx: { vitality: -3, sentiment: -1 } }
];

function mergeFx_(acc, fx) {
  for (var k in fx) { if (fx.hasOwnProperty(k)) acc[k] = (acc[k] || 0) + fx[k]; }
}

/**
 * pulseForEvent_(tag, tags, text) -> { metric: delta } (possibly empty).
 * Resolution: PULSE_MAP[baseTag] + TAG_RULES hits + content rules. Additive
 * across stages (an attended cultural event pulses both its tag and marker).
 * Reuses citizenDialMap's baseTag_ when co-loaded (calendar-suffix strip);
 * falls back to identity so this file stands alone.
 */
function pulseForEvent_(tag, tags, text) {
  var fx = {};
  var tagS = String(tag == null ? '' : tag).trim();
  var norm = (typeof baseTag_ === 'function') ? baseTag_(tagS) : tagS;
  if (PULSE_MAP[norm]) mergeFx_(fx, PULSE_MAP[norm]);

  if (tags && tags.length) {
    for (var i = 0; i < TAG_RULES.length; i++) {
      if (tags.indexOf(TAG_RULES[i].tag) >= 0) mergeFx_(fx, TAG_RULES[i].fx);
    }
  }

  if (text) {
    var hay = String(text).toLowerCase();
    for (var j = 0; j < PULSE_CONTENT_RULES.length; j++) {
      if (PULSE_CONTENT_RULES[j].re.test(hay)) { mergeFx_(fx, PULSE_CONTENT_RULES[j].fx); break; }
    }
  }
  return fx;
}

/**
 * recordPulse_(S, neighborhood, tag, tags, text) — accumulate one emitted
 * citizen event into S.neighborhoodPulse[hood]. No-op on empty hood or
 * non-pulsing event. `events` counts only pulsing events (fold scaling).
 */
function recordPulse_(S, neighborhood, tag, tags, text) {
  if (!S || !neighborhood) return;
  var hood = String(neighborhood).trim();
  if (!hood) return;

  var fx = pulseForEvent_(tag, tags, text);
  var any = false;
  for (var k in fx) { if (fx.hasOwnProperty(k)) { any = true; break; } }
  if (!any) return;

  if (!S.neighborhoodPulse) S.neighborhoodPulse = {};
  var p = S.neighborhoodPulse[hood];
  if (!p) p = S.neighborhoodPulse[hood] = { sentiment: 0, crime: 0, vitality: 0, attractiveness: 0, events: 0 };
  for (var m in fx) { if (fx.hasOwnProperty(m)) p[m] = (p[m] || 0) + fx[m]; }
  p.events += 1;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PULSE_MAP: PULSE_MAP, TAG_RULES: TAG_RULES, PULSE_CONTENT_RULES: PULSE_CONTENT_RULES,
    pulseForEvent_: pulseForEvent_, recordPulse_: recordPulse_
  };
}
