/**
 * citizenDialMap.js v2 — event tag/text -> { dial: delta } (engine.31, S253).
 *
 * RULE (Mike, S253): every event ever logged to a citizen MUST move a dial.
 * Nothing the engine has ever emitted — current or legacy — is dead output.
 * The ONLY inert entries are structural markers (Compressed / CareerState):
 * those are summaries OF events, not events, and mapping them would double-count.
 *
 * Three resolution stages (in order):
 *   1. exact/normalized TAG  -> DIAL_MAP (+ edition + calendar-suffix handling)
 *   2. CONTENT routing on tag+text -> for Untagged / EngineEvent / sentence-tags
 *      (rows where the meaning is in the prose, not a clean tag — e.g. the old
 *      improper ingest that wrote "Serious health condition diagnosed." as a tag)
 *   3. DEFAULT_AMBIENT -> any other real event = an ordinary day lived (small
 *      +composure). Guarantees zero inert real events.
 *
 * The single source both the stateful compressor (Phase 2) and the back-dating
 * replay (Phase 3) read. Supersedes compressLifeHistory.js's TAG_TRAIT_MAP.
 * Crime = erosion of `integrity`. Pure logic, ES5-safe (Node + Apps Script).
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
  'Work':               { drive: 4 },                 // legacy generic work tag
  'CivicRole':          { sociability: 5, drive: 2 },
  'Civic Role':         { sociability: 5, drive: 2 }, // space variant
  'Civic':              { sociability: 4, drive: 2 },
  'Civic Perception':   { sociability: 2 },

  // --- Social / Sociability ---
  'Relationship':       { sociability: 5, warmth: 2 },
  'Alliance':           { sociability: 4 },
  'Rivalry':            { sociability: 2, composure: -3 },
  'Neighborhood':       { sociability: 3 },
  'Community':          { sociability: 4, warmth: 2 },
  'Reputation':         { integrity: 3, sociability: 2 },
  'Media':              { sociability: 4 },
  'Quoted':             { sociability: 3 },
  'Public':             { sociability: 4 },           // public life / recognition
  'Team':               { sociability: 3 },           // sports/team belonging
  'Season':             { drive: 3, sociability: 2 },  // Game-mode: competing through a season
  'Cultural':           { openness: 5, sociability: 3 },
  'Lifestyle':          { openness: 3 },
  'Mentorship':         { warmth: 6, drive: 2 },
  'Faith':              { warmth: 3, composure: 2 },   // faith community + grounding

  // --- Family ---
  'Household':          { family: 5 },
  'Wedding':            { family: 10, warmth: 4, composure: 2 },
  'Birth':             { family: 10, warmth: 4 },
  'Divorce':            { family: -8, composure: -5 },
  'Retirement':         { family: 4, drive: -4 },
  'PostCareer':         { family: 4, openness: 2 },

  // --- Health / Composure ---
  'Health':             { composure: -2 },
  'Critical':           { composure: -8 },
  'Hospitalized':       { composure: -6 },
  'Setback':            { composure: -5 },
  'Recovering':         { composure: 2 },
  'Recovery':           { composure: 6 },
  'Stabilized':         { composure: 5 },
  'Death':              {},

  // --- Conduct / Integrity (engine.32 emits; map ready) ---
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
  'youth-coming_of_age':     { openness: 4, drive: 2 },

  // --- Ambient / daily life (small but NEVER zero — a quiet life IS a calm person) ---
  'Background':         { composure: 2 },              // ordinary days at park/home -> settled
  'Daily':              { composure: 2, family: 1 },   // quiet moment at home -> calm homebody
  'Micro-Event':        { composure: 1 },              // "quiet week, no major changes"
  'Life Event':         { composure: 1 },
  'Life':               { composure: 1 },
  'Personal':           { openness: 2 },               // introspection / reflection
  'PrevEvening':        { sociability: 1 },             // engaged with last night's city
  'FirstFriday':        { sociability: 2 },             // going out
  'Holiday':            { sociability: 2, family: 1 },
  'CreationDay':        { sociability: 1, family: 1 },
  'Sports':             { sociability: 2 },
  'Weather':            { composure: 1 },               // attuned to place
  'Arrival':            { openness: 3 }                 // arrived in Oakland -> new start
};

// Structural markers — summaries/state, NOT events. The only legitimately inert tags.
var STRUCTURAL = { 'Compressed': true, 'CareerState': true, 'EngineEvent': false };
// (EngineEvent carries real content in its text -> content-routed, not inert.)

// Edition citations (E80, E83, E86-S1, ...) = newsroom coverage -> public recognition.
var EDITION_RE = /^E\d+(\-S\d+)?$/i;
var EDITION_FX = { sociability: 2 };

// Content routing for rows whose meaning is in the prose, not the tag:
// Untagged, EngineEvent, and the old improper-ingest sentence-tags.
var CONTENT_RULES = [
  { re: /diagnos|hospital|illness|injur|health condition|condition diagnosed/, fx: { composure: -6 } },
  { re: /recover|stabil|healed|back on (his|her|their) feet/,                  fx: { composure: 5 } },
  { re: /born into population|born during/,                                    fx: { family: 2 } },
  { re: /promot|raise|bonus|reward/,                                           fx: { drive: 7, composure: 2 } },
  { re: /inherit|windfall/,                                                    fx: { composure: 3, family: 2 } },
  { re: /invest|lost money|bad debt|financial loss/,                           fx: { composure: -5 } },
  { re: /business|venture|startup|started a small/,                            fx: { drive: 6, openness: 3 } },
  { re: /new relationship|married|wedding|engaged|partner/,                    fx: { sociability: 4, warmth: 3, family: 2 } },
  { re: /moved to|relocat|larger home|new home/,                              fx: { family: 4, openness: 2 } },
  { re: /transition|role:|new job|new role|hired|teacher/,                     fx: { drive: 5, openness: 2 } },
  { re: /recognition|award|featured|honored|spotlight|public/,                fx: { sociability: 4 } },
  { re: /misunderstanding|conflict|argument|dispute|scandal/,                  fx: { composure: -4 } },
  { re: /tier 2|tier 3|tier 4|tier 5|advanced|elevated/,                       fx: { drive: 6 } },
  { re: /relative|friend|neighbor|community|gathering/,                        fx: { sociability: 3, warmth: 2 } },
  { re: /quiet|calm|unwind|routine|uneventful|relax|at home|rest/,             fx: { composure: 2 } }
];

// Any non-structural event that matched nothing above = an ordinary logged day.
var DEFAULT_AMBIENT = { composure: 1 };

// Calendar suffixes are TEXTURE: a Career event on a holiday is still a Career
// memory. Strip a known calendar half and route by the base tag. (Must NOT strip
// real compound tags like 'Career-Transition' or 'Transgression-Petty'.)
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

function scale_(fx, mult) {
  if (mult == null || mult === 1) {
    var copy = {};
    for (var k in fx) { if (fx.hasOwnProperty(k)) copy[k] = fx[k]; }
    return copy;
  }
  var out = {};
  for (var d in fx) { if (fx.hasOwnProperty(d)) out[d] = fx[d] * mult; }
  return out;
}

// tag (+ optional text) -> { dial: delta }. severityMult scales (default 1).
// Resolution: structural -> {} ; edition ; exact/normalized tag ; content rules ;
// default ambient. Every NON-structural event returns at least a small nudge.
function nudgesForEvent_(tag, severityMult, text) {
  var tagS = String(tag == null ? '' : tag).trim();
  if (!tagS) return {};
  var norm = baseTag_(tagS);
  if (STRUCTURAL[norm] === true) return {};               // Compressed / CareerState
  if (EDITION_RE.test(tagS)) return scale_(EDITION_FX, severityMult);
  if (DIAL_MAP[norm]) return scale_(DIAL_MAP[norm], severityMult);

  // content routing on tag + text (handles Untagged / EngineEvent / sentence-tags)
  var hay = (tagS + ' ' + (text == null ? '' : String(text))).toLowerCase();
  for (var i = 0; i < CONTENT_RULES.length; i++) {
    if (CONTENT_RULES[i].re.test(hay)) return scale_(CONTENT_RULES[i].fx, severityMult);
  }
  return scale_(DEFAULT_AMBIENT, severityMult);           // a logged ordinary day
}

// true if a tag resolves to ANY dial movement (structural markers -> false).
function hasTag_(tag, text) {
  var fx = nudgesForEvent_(tag, 1, text);
  for (var k in fx) { if (fx.hasOwnProperty(k)) return true; }
  return false;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DIAL_MAP: DIAL_MAP, CONTENT_RULES: CONTENT_RULES, STRUCTURAL: STRUCTURAL,
    EDITION_RE: EDITION_RE, CALENDAR_SUFFIXES: CALENDAR_SUFFIXES, DEFAULT_AMBIENT: DEFAULT_AMBIENT,
    baseTag_: baseTag_, nudgesForEvent_: nudgesForEvent_, hasTag_: hasTag_
  };
}
