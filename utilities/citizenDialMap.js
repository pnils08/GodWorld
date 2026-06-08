/**
 * citizenDialMap.js v1 — event tag -> { dial: delta } (engine.31, S253).
 *
 * The single source both the stateful compressor (Phase 2) and the back-dating
 * replay (Phase 3) read to turn a tagged life event into dial nudges. Built
 * FROM docs/engine/TAG_REGISTRY.md's category map, but finer: a tag can move
 * MULTIPLE dials (a Promotion lands on drive AND a little composure; a Divorce
 * costs family AND composure). Supersedes compressLifeHistory.js's TAG_TRAIT_MAP
 * (which targeted the old 5 axes).
 *
 * Magnitudes (0-100 scale): milestone ~10, strong ~6-8, routine ~3-5, minor ~2.
 * Tuned empirically in Phase 6 — these are the working defaults.
 * Texture tags (Weather/Holiday/FirstFriday/Sports/...) are absent -> {} -> no
 * nudge: they tint a citizen's day, they don't reshape who they are.
 *
 * Crime = erosion of `integrity` (negative deltas, scaled by severity); a single
 * petty act fades, only a sustained pattern hardens (the engine's streak gate).
 *
 * Pure logic, ES5-safe (Node + Apps Script). No sheet I/O. Extensible: new event
 * types plug a new tag in here as the engine grows.
 */

var DIAL_MAP = {
  // --- Work / Drive ---
  'Career':             { drive: 4 },
  'Career-Transition':  { drive: 3, openness: 3 },
  'Career-Training':    { drive: 3 },
  'Promotion':          { drive: 8, composure: 2 },
  'Education':          { drive: 5, openness: 3 },
  'Education-Cultural': { openness: 5, drive: 2 },
  'Graduation':         { drive: 8, openness: 2 },
  'Arc':                { drive: 4, openness: 2 },

  // --- Social / Sociability ---
  'Relationship':       { sociability: 5, warmth: 2 },
  'Alliance':           { sociability: 4 },
  'Rivalry':            { sociability: 2, composure: -3 },
  'Neighborhood':       { sociability: 3 },
  'Community':          { sociability: 4, warmth: 2 },
  'CivicRole':          { sociability: 5, drive: 2 },
  'Civic Perception':   { sociability: 2 },
  'Reputation':         { integrity: 3, sociability: 2 },
  'Media':              { sociability: 4 },
  'Quoted':             { sociability: 3 },
  'Cultural':           { openness: 5, sociability: 3 },
  'Lifestyle':          { openness: 3 },
  'Mentorship':         { warmth: 6, drive: 2 },

  // --- Family ---
  'Household':          { family: 5 },
  'Wedding':            { family: 10, warmth: 4, composure: 2 },
  'Birth':              { family: 10, warmth: 4 },
  'Divorce':            { family: -8, composure: -5 },
  'Retirement':         { family: 4, drive: -4 },

  // --- Health / Composure ---
  'Health':             { composure: -2 },
  'Critical':           { composure: -8 },
  'Hospitalized':       { composure: -6 },
  'Setback':            { composure: -5 },
  'Recovering':         { composure: 2 },
  'Recovery':           { composure: 6 },
  'Stabilized':         { composure: 5 },
  'Death':              {}, // terminal — the citizen's OWN death, never a self-memory (TAG_REGISTRY Gaps)

  // --- Conduct / Integrity (engine.32 emits these; map ready now) ---
  'Transgression-Petty':   { integrity: -4 },
  'Transgression-Serious': { integrity: -8, composure: -2 },
  'Transgression-Grave':   { integrity: -12, composure: -3 },
  'Resisted':              { integrity: 5 },

  // --- youth-* developmental ---
  'youth-academic':          { drive: 4, openness: 2 },
  'youth-sports':            { drive: 3, composure: 2 },
  'youth-community_support': { warmth: 4, sociability: 2 },
  'youth-resilience':        { composure: 5 },
  'youth-safety_awareness':  { composure: 3 },
  'youth-coming_of_age':     { openness: 4, drive: 2 }
};

// Calendar suffixes are TEXTURE: a Career event on a holiday is still a Career
// memory. Strip a known calendar half and route by the base tag. (Must NOT
// strip real compound tags like 'Career-Transition' or 'Transgression-Petty'.)
var CALENDAR_SUFFIXES = ['FirstFriday', 'CreationDay', 'Holiday', 'Sports'];

function baseTag_(tag) {
  if (!tag) return '';
  var s = String(tag);
  var dash = s.lastIndexOf('-');
  if (dash > 0) {
    var tail = s.substring(dash + 1);
    for (var i = 0; i < CALENDAR_SUFFIXES.length; i++) {
      if (tail === CALENDAR_SUFFIXES[i]) return s.substring(0, dash);
    }
  }
  return s;
}

// tag -> { dial: delta }. severityMult scales all deltas (default 1). Unknown /
// texture / edition (E{n}) tags -> {} (no nudge). Returns a fresh object.
function nudgesForEvent_(tag, severityMult) {
  var m = DIAL_MAP[baseTag_(tag)];
  if (!m) return {};
  var mult = (severityMult == null) ? 1 : severityMult;
  var out = {};
  for (var d in m) {
    if (m.hasOwnProperty(d)) out[d] = mult === 1 ? m[d] : m[d] * mult;
  }
  return out;
}

function hasTag_(tag) { return !!DIAL_MAP[baseTag_(tag)]; }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DIAL_MAP: DIAL_MAP, CALENDAR_SUFFIXES: CALENDAR_SUFFIXES,
    baseTag_: baseTag_, nudgesForEvent_: nudgesForEvent_, hasTag_: hasTag_
  };
}
