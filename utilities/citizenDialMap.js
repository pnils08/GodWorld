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
 *
 * engine.176 (S438, research.28): AMBIENT TAGS TINT (±1) — Neighborhood/Daily/Personal/
 * PrevEvening/Civic/Sports/Holiday were 8,900 of 16,000 live lines, all positive, and made
 * 546/911 citizens the same saint. Named events reshape (Promotion +8, Divorce -8). The
 * NEGATIVE POLE comes from CAUSES the S436 economy records: rent burden, DebtLevel,
 * unemployment, a hood under pressure, a money loss — emitted via emitPressureTag_ below,
 * one pressure tag per citizen per cycle, first breach Friction/Stumble, ongoing Strain,
 * and after PRESSURE_ADAPT consecutive cycles the citizen ADAPTS (Dwarf Fortress
 * desensitization — chronic pressure wears, it never grinds a dial to the floor).
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
  'Civic':              { sociability: 1 },                 // engine.176: ambient tint
  'Civic Perception':   { sociability: 1 },                 // engine.176: ambient tint

  // --- Social / Sociability ---
  'Relationship':       { sociability: 5, warmth: 2 },
  'Alliance':           { sociability: 4 },
  'Rivalry':            { sociability: 2, composure: -3 },
  'Neighborhood':       { sociability: 1 },                 // engine.176: ambient tint (was 3 — the saint-maker, 3,086 live lines)
  'Community':          { sociability: 4, warmth: 2 },
  'Reputation':         { integrity: 3, sociability: 2 },
  'Media':              { sociability: 4 },
  'Quoted':             { sociability: 3 },
  'Public':             { sociability: 4 },           // public life / recognition
  'Team':               { outabout: 1 },               // at the games (engine.176 tint)
  'Season':             { outabout: 1 },               // following/competing through a season (engine.176 tint)
  'Cultural':           { openness: 4, outabout: 3 },  // a cultural night out
  'Lifestyle':          { openness: 1 },                    // engine.176: ambient tint
  'Mentorship':         { warmth: 6, drive: 2 },
  'Faith':              { warmth: 3, composure: 2 },   // faith community + grounding

  // --- Family ---
  'Household':          { family: 5 },
  'Wedding':            { family: 10, warmth: 4, composure: 2 },
  'Birth':             { family: 10, warmth: 4 },
  'Divorce':            { family: -8, composure: -5 },
  'Retirement':         { family: 4, drive: -4 },
  // engine.157 — the maneuver phase's own lines, written on a posture change only
  'Maneuver-Climb':     { drive: 2, openness: 1 },
  'Maneuver-Retreat':   { composure: 2, family: 1 },
  'Maneuver-Hold':      { composure: 1 },
  'PostCareer':         { family: 4, openness: 2 },
  'Career-Layoff':      { composure: -5, drive: -2 },  // engine.176: a layoff is a Setback with a drive cost (applyBusinessDynamics sheds)

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

  // --- Temperament (pure-axis authoring tags, engine.39) ---
  //     integrity rides Reputation (which couples sociability) and warmth rides
  //     family/mentorship/community events — so a "principled-but-private" or
  //     "warm-but-reserved" archetype can't be seeded without dragging sociability
  //     up with it. These pure-axis tags let dial-essence authoring (research.18
  //     backdate) drive integrity/warmth ALONE. No objective engine emits them;
  //     additive only — no existing DIAL_MAP entry touched.
  'Principled':            { integrity: 4 },           // quiet, uncoupled integrity
  'Warm':                  { warmth: 4 },               // tender temperament, no sociability lift

  // --- youth-* developmental ---
  'youth-academic':          { drive: 4, openness: 2 },
  'youth-sports':            { drive: 3, composure: 2 },
  'youth-community_support': { warmth: 4, sociability: 2 },
  'youth-resilience':        { composure: 5 },
  'youth-safety_awareness':  { composure: 3 },
  'youth-coming_of_age':     { openness: 4, drive: 2 },

  // --- Affect / mood (SUBJECTIVE reaction — the citizen-loop classifier emits these at
  //     WAKE-TIME from a reflection, engine.31 Phase 2; NO objective engine event emits them.
  //     Deliberately slightly negative-weighted: ordinary objective days only ever push
  //     composure UP (ambient below), leaving the negative pole empty (904 citizens: 0 volatile),
  //     so these are the ONLY path to reach a cranky/anxious disposition from daily life. They
  //     ride the lighter reflection severityMult, so a one-off fades and only a sustained mood
  //     shifts the base — mood becomes temperament through repetition. GATE: write-back unwired
  //     until the Phase-1 daily audit signs off; until then these are inert in the cycle. ---
  'Frustrated':         { composure: -3 },
  'Irritable':          { composure: -3 },
  'Anxious':            { composure: -3 },
  'Angry':              { composure: -4, warmth: -2 },
  'Resentful':          { composure: -3, warmth: -2 },
  'Excited':            { composure: 3, drive: 2 },
  'Energized':          { composure: 2, drive: 2 },
  'Content':            { composure: 2 },
  'Calm':               { composure: 2 },

  // --- Ordinary-bad (OBJECTIVE negative pole, engine.38 B3) ---
  //     The bad side of life was bimodal: catastrophe (Setback -5 / Critical -8) or
  //     nothing — every ambient tag pushed composure UP, so the population sat 86%
  //     neutral / 0 volatile. These are everyday friction at ORDINARY scale (-1/-2,
  //     below the wake-reserved affect tags' -3): a bad shift, a snag, a small scrape.
  //     ENGINE-EMITTED + deterministic (no classifier — distinct from the subjective
  //     affect block above). One-off fades via mood; a sustained run hardens base —
  //     an ordinary rough patch becomes a wearier person. Additive; pools that emit
  //     these land in engine.38 B3 step 2 (until then these tags are inert/unemitted).
  'Friction':           { composure: -2 },              // an ordinary hassle / bad day
  'Strain':             { composure: -1 },              // low-grade ongoing stress
  'Stumble':            { composure: -2, drive: -1 },   // a small work/goal setback (not catastrophe)
  'Spat':               { composure: -1, warmth: -1 },  // a minor interpersonal scrape
  'Disappointment':     { composure: -2 },              // a hoped-for thing didn't land
  'Ailment':            { composure: -1 },              // an ordinary cold/ache (not Health/Critical)

  // --- Ambient / daily life (small but NEVER zero — a quiet life IS a calm person) ---
  'Background':         { composure: 1 },              // ordinary days at park/home -> settled (engine.176 tint)
  'Daily':              { composure: 1 },              // quiet moment at home (engine.176 tint; was composure 2 + family 1)
  'Micro-Event':        { composure: 1 },              // "quiet week, no major changes"
  'Life Event':         { composure: 1 },
  'Life':               { composure: 1 },
  'Personal':           { openness: 1 },               // introspection / reflection (engine.176 tint)
  'PrevEvening':        { outabout: 1 },                // out in last night's city (engine.176 tint)
  'FirstFriday':        { outabout: 1 },                // the First Friday art walk (engine.176 tint)
  'Holiday':            { outabout: 1 },                // engine.176 tint
  'CreationDay':        { outabout: 1 },                // engine.176 tint
  'Sports':             { outabout: 1 },                // at / following the game (engine.176 tint)
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
  // engine.176 (S438): the casino's [Casino] tag routes by outcome text — a loss is not an ordinary day
  { re: /slip came back empty|took the last of it|window closed before/,           fx: { composure: -3 } },
  { re: /the window paid/,                                                     fx: { composure: 2, drive: 1 } },
  { re: /diagnos|hospital|illness|injur|health condition|condition diagnosed/, fx: { composure: -6 } },
  { re: /recover|stabil|healed|back on (his|her|their) feet/,                  fx: { composure: 5 } },
  { re: /born into population|born during/,                                    fx: { family: 2 } },
  { re: /promot|raise|bonus|reward/,                                           fx: { drive: 7, composure: 2 } },
  { re: /inherit|windfall/,                                                    fx: { composure: 3, family: 2 } },
  { re: /invest|lost money|bad debt|financial loss/,                           fx: { composure: -5 } },
  // S361 — the [Money] tag from trackWealthMobility_ (engine.61 T5) was never mapped,
  // so BOTH directions fell through to DEFAULT_AMBIENT (+1 composure): a citizen whose
  // standing collapsed and one whose standing doubled got the same nudge as an ordinary
  // day. The tag alone cannot tell the two apart — the direction lives in the prose —
  // so it routes here, ahead of the generic financial-loss rule. Ground gained: the
  // footing under a life, so drive + composure. Ground lost: the same footing going, so
  // composure down with drive up under necessity, mirroring Setback without duplicating it.
  { re: /moved up in the world|rungs up in one season/,                        fx: { drive: 4, composure: 4 } },
  { re: /the ground gave a little|rungs down in one season/,                   fx: { composure: -6, drive: 2 } },
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

// Reflection write-back composer (citizen-loop dual-tag, engine.31 Phase 2).
// The EVENT tag contributes its NON-composure dials; the AFFECT tag is the SOLE composure
// authority and contributes its FULL deltas (incl. its own non-composure dials, e.g. Resentful
// warmth -2). Additive on shared dials (Community warmth +2 + Resentful warmth -2 -> 0).
//   composure-as-affect-only is scoped HERE — the reflection path — NOT in DIAL_MAP. The
//   objective compressor/back-date path (compressLifeHistory_ fold, backdateCitizenDials) keeps
//   real-event composure (Critical -8, Divorce -5) untouched. Composing here also avoids
//   double-counting the objective event's composure: the same Divorce both folds (objective, -5)
//   and is reflected on (subjective, affect-only) — only the affect mood reaches composure.
//   A null/absent affect tag yields ZERO composure from this reflection (no event fallback).
function nudgesForReflection_(eventTag, affectTag, severityMult, text) {
  var out = {};
  var ev = nudgesForEvent_(eventTag, severityMult, text);
  for (var d in ev) {
    if (ev.hasOwnProperty(d) && d !== 'composure') out[d] = (out[d] || 0) + ev[d];
  }
  var af = nudgesForEvent_(affectTag, severityMult, text);
  for (var k in af) {
    if (af.hasOwnProperty(k)) out[k] = (out[k] || 0) + af[k];
  }
  return out;
}

// true if a tag resolves to ANY dial movement (structural markers -> false).
function hasTag_(tag, text) {
  var fx = nudgesForEvent_(tag, 1, text);
  for (var k in fx) { if (fx.hasOwnProperty(k)) return true; }
  return false;
}


// ============================================================================
// engine.176 (S438) — PRESSURE TAGS: the negative pole from causes
// ----------------------------------------------------------------------------
// emitPressureTag_(ctx, row, iLife, popId, cause, text, opts)
//   cause: 'rent' | 'debt' | 'unemployed' | 'hood'
//   One pressure tag per citizen per cycle (S.pressureTagged — first writer wins:
//   Neighborhoods runs before Career/Money/Migration in Phase 5, so the hood tint
//   claims first and the collision emitters skip). First breach = Friction (Stumble
//   for unemployment); ongoing = Strain (-1); after PRESSURE_ADAPT consecutive
//   tagged cycles = adapted, nothing emitted until a clean cycle resets it.
//   Breach state is read off the citizen's own recent LifeHistory lines — no column.
//   Returns the tag written, or null (already tagged / adapted / no column).
// ============================================================================
var PRESSURE_FIRST = { rent: 'Friction', debt: 'Friction', hood: 'Friction', unemployed: 'Stumble', overwork: 'Strain' }; // engine.182: overwork is a slow burn, Strain from the first week
var PRESSURE_NO_ADAPT = { overwork: true }; // engine.182: you do not get used to yourself — desensitization is to a hostile world, not to your own drive
var PRESSURE_ONGOING = 'Strain';
var PRESSURE_RE = /\[(Friction|Strain|Stumble)\]/;
var PRESSURE_LOOKBACK = 3;   // an ongoing breach = a pressure tag within the last 3 cycles
var PRESSURE_ADAPT = 6;      // consecutive tagged cycles after which the citizen adapts
var PRESSURE_SCAN_LINES = 24;

// Y<n>C<m> — / C<m> — prefix -> absolute cycle (year-1)*52 + m; null when unstamped.
function pressureAbsCycle_(line) {
  var m = String(line || '').match(/^(?:Y(\d+))?C(\d+)\s*[—-]/);
  if (!m) return null;
  var c = parseInt(m[2], 10);
  if (m[1]) c = (parseInt(m[1], 10) - 1) * 52 + c;
  return c;
}

// 'none' | 'ongoing' | 'adapted' for the cycle about to be tagged.
function pressureState_(lifeHistory, cycle) {
  var lines = String(lifeHistory || '').split('\n');
  var tagged = {};
  for (var i = lines.length - 1; i >= 0 && i >= lines.length - PRESSURE_SCAN_LINES; i--) {
    if (!PRESSURE_RE.test(lines[i])) continue;
    var c = pressureAbsCycle_(lines[i]);
    if (c != null && c < cycle) tagged[c] = true;
  }
  var run = 0;
  for (var back = 1; back <= PRESSURE_ADAPT; back++) { if (tagged[cycle - back]) run++; else break; }
  if (run >= PRESSURE_ADAPT) return 'adapted';
  for (var lb = 1; lb <= PRESSURE_LOOKBACK; lb++) { if (tagged[cycle - lb]) return 'ongoing'; }
  return 'none';
}

// World_Config bar read — a missing key throws (ADR-0015 / engine.160 pattern:
// ensureEngine176Config_ self-arms at open, so absence means the contract did not run).
function pressureBar_(ctx, key) {
  var v = ctx && ctx.config ? Number(ctx.config[key]) : NaN;
  if (isNaN(v)) throw new Error('engine.176: World_Config ' + key + ' missing — ensureEngine176Config_ did not run (ADR-0015)');
  return v;
}

function emitPressureTag_(ctx, row, iLife, popId, cause, text, opts) {
  if (!ctx || !row || iLife < 0 || !popId) return null;
  var S = ctx.summary || (ctx.summary = {});
  if (!S.pressureTagged) S.pressureTagged = {};
  if (S.pressureTagged[popId]) return null;
  var cycle = Number(S.absoluteCycle || S.cycleId || (ctx.config && ctx.config.cycleCount) || 0);
  var state = pressureState_(row[iLife], cycle);
  if (!S.pressureCounts) S.pressureCounts = {};
  if (state === 'adapted' && !PRESSURE_NO_ADAPT[cause]) { S.pressureCounts[cause + ':adapted'] = (S.pressureCounts[cause + ':adapted'] || 0) + 1; S.pressureTagged[popId] = 'adapted'; return null; }
  var tag = state === 'ongoing' ? PRESSURE_ONGOING : (PRESSURE_FIRST[cause] || 'Friction');
  var stamp = (typeof inWorldStamp_ === 'function') ? inWorldStamp_(ctx) : ('C' + cycle);
  var line = stamp + ' — [' + tag + '] ' + text;
  row[iLife] = row[iLife] ? row[iLife] + '\n' + line : line;
  S.pressureTagged[popId] = tag;
  S.pressureCounts[cause + ':' + tag] = (S.pressureCounts[cause + ':' + tag] || 0) + 1;
  if (typeof queueAppendIntent_ === 'function') {
    queueAppendIntent_(ctx, 'LifeHistory_Log',
      [ctx.now || '', popId, (opts && opts.name) || '', tag, text, (opts && opts.hood) || '', cycle],
      'pressure tag (' + cause + ')', 'citizens');
  }
  return tag;
}

// small deterministic text pools (no rng: the cause is the story, the line is color)
var PRESSURE_TEXT = {
  rent: ['rent took the biggest bite of the month again', 'did the math on the rent twice and it came out the same', 'the lease renewal letter sat on the table for three days'],
  debt: ['the card statement was the first thing read and the last thing forgotten', 'paid the minimum and looked away', 'borrowed against next month to close this one'],
  unemployed: ['another week of applications and no callback', 'checked the listings before coffee, nothing new', 'told a neighbor the job search was going fine'],
  hood: ['heard the rent talk on the block turn sharp', 'noticed the corner had a different crowd after dark', 'the for-rent signs outnumbered the welcome mats this month'],
  overwork: ['worked through another weekend and called it fine', 'could not switch off, even at the table', 'the third late night this week, and the ceiling again at four']
};
function pressureText_(cause, seed) {
  var pool = PRESSURE_TEXT[cause] || PRESSURE_TEXT.rent;
  var i = Math.abs(Math.round(Number(seed) || 0)) % pool.length;
  return pool[i];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    emitPressureTag_: emitPressureTag_, pressureState_: pressureState_, pressureAbsCycle_: pressureAbsCycle_,
    pressureBar_: pressureBar_, pressureText_: pressureText_, PRESSURE_ADAPT: PRESSURE_ADAPT, PRESSURE_LOOKBACK: PRESSURE_LOOKBACK, PRESSURE_NO_ADAPT: PRESSURE_NO_ADAPT,
    DIAL_MAP: DIAL_MAP, CONTENT_RULES: CONTENT_RULES, STRUCTURAL: STRUCTURAL,
    EDITION_RE: EDITION_RE, CALENDAR_SUFFIXES: CALENDAR_SUFFIXES, DEFAULT_AMBIENT: DEFAULT_AMBIENT,
    baseTag_: baseTag_, nudgesForEvent_: nudgesForEvent_,
    nudgesForReflection_: nudgesForReflection_, hasTag_: hasTag_
  };
}
