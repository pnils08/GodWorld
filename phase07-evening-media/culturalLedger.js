/**
 * ============================================================================
 * registerCulturalEntity_ v2.9 (engine.312 fame from the paper; engine.313 one fame row; engine.315 authored category)
 * ============================================================================
 *
 * Automatically classifies and registers cultural entities with calendar awareness.
 *
 * v2.9 — engine.312: the registrar no longer writes FameScore. A sighting adds
 * +1 to the row's fame accumulator (the calendar / economy extras retired); a
 * `roster` call (engine.118) adds nothing and marks no sighting. A new row
 * starts at its citizen's paper record (S.paperFameByPop) + tonight's
 * sightings. flushCulturalFame_ (Phase7-FameFlush) writes the one FameScore.
 *
 * v2.7 — engine.313 (a citizen registered under their ledger name doubled a
 * linked row named differently — Muralist Dante Reyes → a new Dante Reyes):
 * - The target row resolves before the registry: exact Name, else the
 *   caller's POPID (highest-FameScore linked non-institution row, ties to the
 *   earlier row), else CREATE. UPDATE writes that row; no rescan by name.
 * - Registry entries for existing rows key by `row:<n>`; pending creates by name.
 * - A POPID-resolved row keeps its FameCategory / CulturalDomain and is classified
 *   by them (fame bonus, summary) — never by a role word from another linked row.
 *
 * v2.8 — engine.315 / 314: on any existing row an authored FameCategory decides
 * (never rewritten; a blank / 'unknown' one is filled); a same-Cycle repeat of a
 * new entity writes LastSeenHoliday / CalendarContext by header name.
 *
 * v2.6 — engine.44 Class 3 (UniverseLinks was written '' since landing):
 * - UniverseLinks (col H) now carries the entity's Simulation_Ledger POPID —
 *   the cross-reference buildCulturalCards.js has always read from H.
 * - resolveLedgerPopId_ resolves by exact "First Last" match against the
 *   shared ctx.ledger (Phase 42 §5.6); no unique match → '' (generic pool
 *   celebrities stay blank by design). Ambiguous duplicate names → ''.
 * - CREATE branch writes it positionally (index 7); UPDATE branch backfills
 *   only when the committed cell is empty.
 *
 * v2.5 — Phase 42 §B6 mechanical scope (1 file / 9 sites):
 * - All sheet writes routed through writeIntents
 *   - UPDATE branch: 8 setValue calls → queueCellIntent_
 *   - CREATE branch: 1 appendRow → queueAppendIntent_
 * - Per-cycle in-process registry on `ctx.summary.culturalRegistry` resolves
 *   same-cycle multi-register dedup hazard exposed by the migration.
 *   Snapshot read at L43 captures pre-cycle committed state only; pending
 *   writeIntents are not visible. Without the registry, the second-or-later
 *   call for the same entity in one cycle would:
 *     (a) for an entity NEW this cycle — duplicate-append (snapshot doesn't see
 *         the pending appendIntent from the first call), or
 *     (b) for an entity that existed before this cycle — recompute FameScore
 *         from stale snapshot value, losing the first call's increment under
 *         persistenceExecutor's LWW per (tab, row, col) semantics.
 *   The registry stores the intent object reference returned by queue* helpers
 *   plus an accumulator. Repeat calls mutate the intent's `values` in place;
 *   no re-queueing, no second-call snapshot reads needed.
 * - Helpers (updateMediaSpread_, updateTrendTrajectory_, updateCityTier_)
 *   remain caller-passed-sheet direct-write (Phase 42 B4 batch, pending).
 *   They fire only on first-cycle-call for an existing-in-snapshot entity
 *   (registry-miss UPDATE path) so their semantics stay intact pre-B4.
 *
 * v2.3/v2.4 features preserved:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for ctx/summary
 * - for loops instead of arrow functions
 *
 * v2.2 features preserved:
 * - 12 Oakland neighborhoods, GodWorld Calendar integration (30+ holidays),
 *   holiday/First Friday/sports-season fame modifiers, calendar context
 *   tracking.
 *
 * Ensures Media Room always knows WHY an entity is famous.
 *
 * ============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════
// engine.68 (S325, Mike-approved): CULTURAL STATUS BY POPID — the read half
// of the antenna. UniverseLinks POPIDs have been written on the cycle path
// since engine.44 with ZERO cycle readers; this map is the first. One sheet
// read per cycle, cached on ctx (heritage-read pattern, engine.65). Only
// entities at the fame bar (FameScore >= 25, Mike ruling) enter the map —
// below the bar the antenna stays dark.
// ═══════════════════════════════════════════════════════════════════════════
var CULTURAL_FAME_BAR = 25;
var CULTURAL_FAME_QUIET_CYCLES = 10;

// ═══════════════════════════════════════════════════════════════════════════
// engine.312 (builder 2026-10-23 "The paper", 2026-10-25 rate): FAME FROM THE
// PAPER. Fame rises when a citizen is named in a published piece — each
// Citizen_Media_Usage row by its light: positive +5, neutral or blank +1,
// negative −2. A sighting is a result of fame and adds 1. Fading stays; fame
// stops at 100. Plan: docs/plans/2026-10-16-celeste-dead-slice-legends-and-
// interview-guards.md §engine.312 (R1–R5, R2.1).
//
// One accumulator per Cultural_Ledger row per Cycle: the sheet value read
// once (base) + the paper (Phase 5) + the fade (Phase 7) + the sightings
// (Phase 7), and the 25 floor for a citizen the Phase-5 ladder holds as
// Famous (engine.118). flushCulturalFame_ (its own phase, Phase7-FameFlush,
// after Phase7-Famous at both entry points) queues ONE FameScore intent per
// touched row and finalises the FameScore of each pending CREATE. Nothing else
// writes FameScore in a Cycle; the dynasty append (generationalWealthEngine)
// is its own new institution row, outside this.
// ═══════════════════════════════════════════════════════════════════════════
var CULTURAL_FAME_CEILING = 100;
var PAPER_FAME_BY_LIGHT = { positive: 5, neutral: 1, negative: -2 };
// R1: a printed naming of the citizen by its writer. Own work (byline-landed,
// byline-published, journalist, legacy byline), family-own-words and every
// type off this list score 0 — counted in the receipt, never guessed. The
// fame predicate is its own list: the emergence predicate's unknown-type
// fallback is true (isEmergenceUsage_), this one's is false.
var FAME_COVERAGE_TYPES = ['mentioned', 'quoted', 'featured', 'referenced', 'new_citizen', 'existing_new_role'];

// R2.1(a): a row that names its source scores only when the source is print.
// The Phase-11 media-room copy (processCitizenUsageIntake_, arbitrary intake
// types, no print check) writes Source 'media-room', so it scores 0. A blank
// Source is the record as it stands (the Saturday binder's printed-filing
// rows, and every row written before the column) — the builder's trusted-sheet
// reading of the historical rows.
function paperFameDelta_(usageType, light, source) {
  var src = String(source || '').trim().toLowerCase();
  if (src && src !== 'print') return 0;
  var t = String(usageType || '').trim().toLowerCase();
  if (FAME_COVERAGE_TYPES.indexOf(t) < 0) return 0;
  var l = String(light || '').trim().toLowerCase();
  return PAPER_FAME_BY_LIGHT.hasOwnProperty(l) ? PAPER_FAME_BY_LIGHT[l] : PAPER_FAME_BY_LIGHT.neutral;
}

function clampCulturalFame_(n) {
  return Math.max(0, Math.min(CULTURAL_FAME_CEILING, Number(n) || 0));
}

// engine.313's target rule, shared by the registrar and the paper credit: the
// highest-FameScore row linked to the POPID that is not an institution (a
// dynasty row links its wealthiest member, engine.65); ties to the earlier
// row. Returns the 0-based index into `data` (header at 0), or -1.
function culturalTargetIdxByPop_(data, popId) {
  var key = String(popId || '').trim().toUpperCase();
  if (!key || !data || data.length < 2) return -1;
  var h = data[0];
  var iU = h.indexOf('UniverseLinks'), iCat = h.indexOf('FameCategory'),
      iRole = h.indexOf('RoleType'), iFame = h.indexOf('FameScore');
  if (iU < 0) return -1;
  var best = -1, bestFame = -Infinity;
  for (var r = 1; r < data.length; r++) {
    if (String(data[r][iU] || '').trim().toUpperCase() !== key) continue;
    if (iCat >= 0 && String(data[r][iCat] || '').trim().toLowerCase() === 'dynasty') continue;
    if (iRole >= 0 && String(data[r][iRole] || '').trim().toLowerCase() === 'institution') continue;
    var f = Number(data[r][iFame >= 0 ? iFame : 11]) || 0;
    if (f > bestFame) { bestFame = f; best = r; }
  }
  return best;
}

// The Cycle's accumulator; the Cultural_Ledger tab is read once, the first
// time any writer touches fame (Phase 5 opens it before its first Processed
// mark). Row numbers are sheet rows (1-based). Fails closed (codex diff gate 1
// §2): a missing or unreadable tab, or one without FameScore / UniverseLinks /
// LastSeenCycle, throws — never an empty ledger that turns a credit into "no
// row" — and nothing is cached, so the next caller throws too.
function culturalFameAccum_(ctx) {
  if (ctx._culturalFame) return ctx._culturalFame;
  var sheet = ctx.ss ? ctx.ss.getSheetByName('Cultural_Ledger') : null;
  if (!sheet) throw new Error('engine.312: Cultural_Ledger tab missing — fame cannot be accumulated');
  var data = sheet.getDataRange().getValues();
  var h = data[0] || [];
  var acc = { rows: {}, pending: [], floorPops: {}, data: data, iFame: h.indexOf('FameScore'), iPop: h.indexOf('UniverseLinks'),
              iLast: h.indexOf('LastSeenCycle'), paperCredited: 0, paperNoRow: 0, flushed: null };
  if (acc.iFame < 0 || acc.iPop < 0 || acc.iLast < 0) {
    throw new Error('engine.312: Cultural_Ledger header lacks FameScore / UniverseLinks / LastSeenCycle — fame cannot be accumulated');
  }
  ctx._culturalFame = acc;
  return acc;
}

function culturalFameRow_(acc, rowNum) {
  var e = acc.rows[rowNum];
  if (!e) {
    var src = acc.data[rowNum - 1] || [];
    e = acc.rows[rowNum] = { base: Number(src[acc.iFame]) || 0, paper: 0, decay: 0, sightings: 0, floor: false };
  }
  return e;
}

// The score a row would carry if the Cycle ended now. Read by the registrar's
// derived writes (TrendTrajectory, CityTier) and its summaries — PROVISIONAL:
// a later sighting the same Cycle can still move the final (R2.1 e).
function culturalFameFinal_(e) {
  var sum = e.base + e.paper + e.decay + e.sightings;
  if (e.floor) sum = Math.max(CULTURAL_FAME_BAR, sum);
  return clampCulturalFame_(sum);
}

// Phase 5 (processMediaUsage_): one accepted usage row's paper delta onto its
// citizen's target row. A citizen with no Cultural_Ledger row has no fame to
// move (the roster is entered by engine.118 or a sighting) — counted, not lost
// silently: S.paperFameByPop carries their record into a later CREATE.
function culturalFameAddPaper_(ctx, popId, delta) {
  var acc = culturalFameAccum_(ctx);
  var idx = culturalTargetIdxByPop_(acc.data, popId);
  if (idx < 0) { acc.paperNoRow++; return false; }
  culturalFameRow_(acc, idx + 1).paper += delta;
  acc.paperCredited++;
  return true;
}

// Phase 5 (engine.118 ladder): every citizen held as Famous keeps the 25
// floor — on their target row this Cycle (touched even with nothing else to
// add, so a row below the bar is lifted to it), and on a pending CREATE of
// theirs. Returns the target row's pre-Cycle score, or null with no row.
function culturalFameMarkFloor_(ctx, popId) {
  var acc = culturalFameAccum_(ctx);
  var key = String(popId || '').trim().toUpperCase();
  if (key) acc.floorPops[key] = true;
  var idx = culturalTargetIdxByPop_(acc.data, key);
  if (idx < 0) return null;
  var e = culturalFameRow_(acc, idx + 1);
  e.floor = true;
  return e.base;
}

// Phase7-FameFlush. One FameScore intent per touched row whose final differs
// from the sheet; each pending CREATE gets its final score in its append row.
// Runs once a Cycle: a second call returns the first call's counts and queues
// nothing (codex diff gate 1 §2). A row whose intent fails is skipped, the
// rest still flush, and the phase then throws naming every failed row and the
// score it was owed (Engine_Errors — the receipt / re-base repairs from the
// record). The manual operator path (runAdvancementIntakeManual, no Phase 10)
// writes direct, as its Processed marks do: existing cells, and each pending
// CREATE appended and read back.
function flushCulturalFame_(ctx) {
  var acc = ctx && ctx._culturalFame;
  var out = { touched: 0, written: 0, pending: 0, paperCredited: 0, paperNoRow: 0, failed: [] };
  if (!acc) return out;
  if (acc.flushed) return acc.flushed;
  acc.flushed = out;
  out.paperCredited = acc.paperCredited;
  out.paperNoRow = acc.paperNoRow;
  var S = ctx.summary || {};
  var directSheet = ctx.manualRun ? culturalLedgerSheetDirect_(ctx) : null;
  for (var rn in acc.rows) {
    if (!acc.rows.hasOwnProperty(rn)) continue;
    var e = acc.rows[rn];
    out.touched++;
    var fin = culturalFameFinal_(e);
    if (fin === e.base) continue;
    try {
      if (directSheet) {
        directSheet.getRange(Number(rn), acc.iFame + 1).setValue(fin);
      } else {
        queueCellIntent_(ctx, 'Cultural_Ledger', Number(rn), acc.iFame + 1, fin,
          'engine.312 fame ' + e.base + ' -> ' + fin + ' (paper ' + e.paper + ', fade ' + e.decay +
          ', sightings ' + e.sightings + (e.floor ? ', famous floor' : '') + ')', 'media');
      }
      out.written++;
    } catch (eW) {
      out.failed.push('row ' + rn + ' owed ' + fin + ' (was ' + e.base + '): ' + eW.message);
    }
  }
  var paperBy = S.paperFameByPop || {};
  for (var p = 0; p < acc.pending.length; p++) {
    var pc = acc.pending[p];
    pc.intent.values[0][11] = culturalFamePendingFinal_(acc, paperBy, pc);   // 11 = FameScore (CREATE row)
    if (directSheet) {
      try {
        directSheet.appendRow(pc.intent.values[0]);
        var back = directSheet.getRange(directSheet.getLastRow(), 2).getValue();   // col B = CUL-ID
        if (back !== pc.intent.values[0][1]) throw new Error('read-back ' + back);
      } catch (eA) {
        out.failed.push('new row ' + pc.intent.values[0][1] + ' not appended: ' + eA.message);
        continue;
      }
    }
    out.pending++;
  }
  S.culturalFameFlush = out;
  Logger.log('flushCulturalFame_: ' + JSON.stringify(out));
  if (out.failed.length) throw new Error('engine.312 fame flush: ' + out.failed.length + ' row(s) not written — ' + out.failed.join('; '));
  return out;
}

// The manual path's direct sheet (no Phase 10 there). Its queued CREATE
// intents never execute, so the flush appends them itself.
function culturalLedgerSheetDirect_(ctx) {
  var sh = ctx.ss ? ctx.ss.getSheetByName('Cultural_Ledger') : null;
  if (!sh) throw new Error('engine.312: Cultural_Ledger tab missing on the manual path');
  return sh;
}

// R3: a new row starts at its linked citizen's paper record (the whole tab,
// S.paperFameByPop) plus this Cycle's sightings of it; the famous floor; the cap.
function culturalFamePendingFinal_(acc, paperBy, pc) {
  var sum = (pc.pop ? (Number(paperBy[pc.pop]) || 0) : 0) + pc.sightings;
  if (pc.pop && acc.floorPops[pc.pop]) sum = Math.max(CULTURAL_FAME_BAR, sum);
  return clampCulturalFame_(sum);
}

// engine.68 (S325, Mike-approved): FAME FADES. Quiet fame drifts down —
// nothing is free (doctrine): fame earned by real namings must be maintained
// by them. A row unseen for CULTURAL_FAME_QUIET_CYCLES loses 1 FameScore per
// cycle (floor 0); a fresh sighting writes LastSeenCycle and stops the slide.
// engine.312: the −1 goes to the row's accumulator (runs Phase 7, before
// tonight's sightings); the flush writes the one FameScore cell. LastSeenCycle
// marks sightings only, so a citizen named in the paper every week but never
// sighted gains the paper and still fades (R2: "fading stays").
function decayCulturalFame_(ctx) {
  var S = ctx.summary || {};
  var cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;
  if (!cycle) return;
  var acc = culturalFameAccum_(ctx);   // throws on an unreadable / malformed tab (fail closed)
  try {
    var v = acc.data;
    if (v.length < 2) return;
    var decayed = 0;
    for (var r = 1; r < v.length; r++) {
      var fame = Number(v[r][acc.iFame]) || 0;
      if (fame <= 0) continue;
      var last = Number(String(v[r][acc.iLast] || '').replace(/[^0-9]/g, '')) || 0;
      if (!last || (cycle - last) <= CULTURAL_FAME_QUIET_CYCLES) continue;
      culturalFameRow_(acc, r + 1).decay -= 1;
      decayed++;
    }
    if (decayed) Logger.log('decayCulturalFame_: ' + decayed + ' entities fading');
  } catch (eDF) {
    Logger.log('decayCulturalFame_: ' + eDF.message);
  }
}

function culturalStatusByPop_(ctx) {
  if (ctx._culturalByPop) return ctx._culturalByPop;
  var map = {};
  ctx._culturalByPop = map;
  try {
    var sheet = ctx.ss ? ctx.ss.getSheetByName('Cultural_Ledger') : null;
    if (!sheet || sheet.getLastRow() < 2) return map;
    var v = sheet.getDataRange().getValues();
    var h = v[0];
    var iPop = h.indexOf('UniverseLinks'), iFame = h.indexOf('FameScore'),
        iDom = h.indexOf('CulturalDomain'), iCat = h.indexOf('FameCategory'),
        iTier = h.indexOf('CityTier'), iLast = h.indexOf('LastSeenCycle');
    if (iPop < 0 || iFame < 0) return map;
    for (var r = 1; r < v.length; r++) {
      var pop = String(v[r][iPop] || '').trim().toUpperCase();
      if (!pop || pop.indexOf('POP-') !== 0) continue;
      var fame = Number(v[r][iFame]) || 0;
      if (fame < CULTURAL_FAME_BAR) continue;
      // multiple rows can link one citizen (dual writers) — highest fame wins
      if (map[pop] && map[pop].fameScore >= fame) continue;
      map[pop] = {
        fameScore: fame,
        domain: String(v[r][iDom >= 0 ? iDom : 0] || ''),
        category: String(v[r][iCat >= 0 ? iCat : 0] || ''),
        cityTier: String(v[r][iTier >= 0 ? iTier : 0] || ''),
        lastSeenCycle: Number(String(v[r][iLast >= 0 ? iLast : 0] || '').replace(/[^0-9]/g, '')) || 0
      };
    }
  } catch (eCS) {
    Logger.log('culturalStatusByPop_: read failed — ' + eCS.message);
  }
  return map;
}

// Shared by registration and the engine.297 sighting buckets; classification is unchanged.
function classifyRole(role) {
  if (!role) return { cat: "unknown", dom: "Other" };

  var r = role.toLowerCase().trim();

  // Arts
  if (r.indexOf("actor") !== -1 || r.indexOf("actress") !== -1) return { cat: "actor", dom: "Arts" };
  if (r.indexOf("singer") !== -1 || r.indexOf("musician") !== -1 || r.indexOf("rapper") !== -1) return { cat: "musician", dom: "Arts" };
  if (r.indexOf("band") !== -1 || r.indexOf("dj") !== -1 || r.indexOf("producer") !== -1) return { cat: "musician", dom: "Arts" };
  if (r.indexOf("artist") !== -1 || r.indexOf("painter") !== -1 || r.indexOf("sculptor") !== -1) return { cat: "artist", dom: "Arts" };
  if (r.indexOf("dancer") !== -1 || r.indexOf("choreograph") !== -1) return { cat: "dancer", dom: "Arts" };
  if (r.indexOf("gallery") !== -1 || r.indexOf("curator") !== -1) return { cat: "curator", dom: "Arts" };

  // Sports
  if (r.indexOf("athlete") !== -1 || r.indexOf("player") !== -1 || r.indexOf("sports") !== -1) return { cat: "athlete", dom: "Sports" };
  if (r.indexOf("basketball") !== -1 || r.indexOf("football") !== -1 || r.indexOf("baseball") !== -1) return { cat: "athlete", dom: "Sports" };
  if (r.indexOf("soccer") !== -1 || r.indexOf("tennis") !== -1 || r.indexOf("golf") !== -1) return { cat: "athlete", dom: "Sports" };
  if (r.indexOf("coach") !== -1 || r.indexOf("manager") !== -1) return { cat: "sports-figure", dom: "Sports" };

  // Media
  if (r.indexOf("journalist") !== -1 || r.indexOf("reporter") !== -1 || r.indexOf("anchor") !== -1) return { cat: "journalist", dom: "Media" };
  if (r.indexOf("influencer") !== -1 || r.indexOf("creator") !== -1 || r.indexOf("youtuber") !== -1) return { cat: "influencer", dom: "Media" };
  if (r.indexOf("tiktoker") !== -1 || r.indexOf("instagram") !== -1) return { cat: "influencer", dom: "Media" };
  if (r.indexOf("streamer") !== -1 || r.indexOf("twitch") !== -1 || r.indexOf("gamer") !== -1) return { cat: "streamer", dom: "Media" };
  if (r.indexOf("podcast") !== -1 || r.indexOf("host") !== -1) return { cat: "media-personality", dom: "Media" };

  // Civic
  if (r.indexOf("civic") !== -1 || r.indexOf("politic") !== -1 || r.indexOf("council") !== -1) return { cat: "civic-figure", dom: "Civic" };
  if (r.indexOf("mayor") !== -1 || r.indexOf("governor") !== -1 || r.indexOf("senator") !== -1) return { cat: "civic-figure", dom: "Civic" };
  if (r.indexOf("activist") !== -1 || r.indexOf("advocate") !== -1) return { cat: "activist", dom: "Civic" };
  if (r.indexOf("community") !== -1 || r.indexOf("organizer") !== -1) return { cat: "community-leader", dom: "Civic" };

  // Culinary
  if (r.indexOf("chef") !== -1 || r.indexOf("cook") !== -1 || r.indexOf("restaurateur") !== -1) return { cat: "chef", dom: "Culinary" };

  // Literature
  if (r.indexOf("author") !== -1 || r.indexOf("writer") !== -1 || r.indexOf("novelist") !== -1) return { cat: "author", dom: "Literature" };
  if (r.indexOf("poet") !== -1 || r.indexOf("playwright") !== -1) return { cat: "author", dom: "Literature" };

  // Fashion
  if (r.indexOf("model") !== -1 || r.indexOf("fashion") !== -1 || r.indexOf("designer") !== -1) return { cat: "model", dom: "Fashion" };

  // Business
  if (r.indexOf("ceo") !== -1 || r.indexOf("founder") !== -1 || r.indexOf("entrepreneur") !== -1) return { cat: "business-figure", dom: "Business" };
  if (r.indexOf("executive") !== -1 || r.indexOf("investor") !== -1) return { cat: "business-figure", dom: "Business" };

  return { cat: "unknown", dom: "Other" };
}

// engine.312 R3: `cause` says why the row is touched. 'sighting' (Phase 7,
// buildEveningFamous_; the default) is the city seeing the citizen: +1 fame,
// LastSeenCycle, MediaCount and the sighting's calendar cells. 'roster'
// (engine.118, a famous citizen entered on the sub-roster) adds nothing and
// marks no sighting; a roster→sighting repeat in one Cycle counts the sighting.
function registerCulturalEntity_(ctx, name, roleType, journalistName, neighborhood, cause) {

  // Defensive guard
  if (!ctx) return null;
  if (!ctx.summary) ctx.summary = {};
  var sighted = cause !== 'roster';

  var rng = safeRand_(ctx);

  var sheet = ensureCulturalLedger_(ctx);
  var data = sheet.getDataRange().getValues();
  var header = data[0];

  var S = ctx.summary;
  var cycle = S.cycleId || ctx.config.cycleCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2) — carried on the row; engine.312 retired the
  // calendar / economy fame extras (a sighting is +1 flat, the paper carries
  // the rest).
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";

  // Column lookup helper
  var col = function(n) { return header.indexOf(n); };

  // ═══════════════════════════════════════════════════════════════════════════
  // COLUMN INDICES
  // ═══════════════════════════════════════════════════════════════════════════
  // Column indices used downstream — others (FirstSeenCycle, Status,
  // TrendTrajectory, FirstRefSource, MediaSpread, CityTier, FirstSeenHoliday)
  // are written positionally on CREATE only; no read/update site needs the
  // header-derived index, so they're not looked up. Resolved ahead of role
  // classification: the engine.313 target row feeds it.
  var iCulId = col('CUL-ID');
  var iName = col('Name');
  var iFameCat = col('FameCategory');
  var iCulDom = col('CulturalDomain');
  var iNeighborhood = col('Neighborhood');
  var iLastSeen = col('LastSeenCycle');
  var iMediaCount = col('MediaCount');
  var iFameScore = col('FameScore');
  var iLastHoliday = col('LastSeenHoliday');
  var iCalendarContext = col('CalendarContext');
  var iUniverse = col('UniverseLinks');
  var iRoleType = col('RoleType');

  // v2.6: POPID cross-ref for UniverseLinks (col H) — resolved once per call,
  // used by both the CREATE row and the UPDATE empty-cell backfill below.
  var popId = resolveLedgerPopId_(ctx, name);

  // ═══════════════════════════════════════════════════════════════════════════
  // TARGET ROW (engine.313 — one citizen, one fame row)
  //
  // Resolved before the registry. Exact Name first (unchanged precedence);
  // else the caller's POPID: the highest-FameScore linked row that is not an
  // institution (a dynasty row links its wealthiest member, engine.65), ties
  // to the earlier row. A citizen sighted under their ledger name reaches a
  // row named differently ("Muralist Dante Reyes") instead of minting a twin.
  // ═══════════════════════════════════════════════════════════════════════════
  var targetIdx = -1;
  var byPop = false;
  var popKey = String(popId || '').trim().toUpperCase();
  // engine.312 (codex diff gate 1 §1 b): a `roster` registration is for one
  // citizen — their personal row by POPID first, then a row of the same name
  // that links nobody else; never another citizen's row. Sightings keep
  // engine.313's order (exact Name, then POPID).
  var linkOk = function(idx) {
    var link = iUniverse >= 0 ? String(data[idx][iUniverse] || '').trim().toUpperCase() : '';
    return !link || link === popKey;
  };
  if (!sighted && popKey && iUniverse >= 0) targetIdx = culturalTargetIdxByPop_(data, popKey);
  if (targetIdx < 0) {
    for (var ti = 1; ti < data.length; ti++) {
      if ((iName >= 0 ? data[ti][iName] : data[ti][2]) !== name) continue;
      if (!sighted && !linkOk(ti)) continue;
      targetIdx = ti; break;
    }
  }
  if (targetIdx < 0 && popKey && iUniverse >= 0) {
    targetIdx = culturalTargetIdxByPop_(data, popKey);
    byPop = targetIdx > 0;
    if (byPop) {
      Logger.log('registerCulturalEntity_: "' + name + '" -> ' + data[targetIdx][iCulId >= 0 ? iCulId : 1] +
        ' "' + data[targetIdx][iName >= 0 ? iName : 2] + '" by ' + popKey + ' (engine.313)');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════════

  // === If roleType missing, attempt auto-inference ===
  if (!roleType || roleType.trim() === "") {
    if (typeof inferCulturalRoleByContext_ === 'function') {
      var inferred = inferCulturalRoleByContext_(ctx, name, journalistName);
      roleType = inferred || "public-figure";
    } else {
      roleType = "public-figure";
    }
  }

  var fam = classifyRole(roleType);
  // engine.315: on an existing row an authored FameCategory (not blank, not
  // 'unknown') decides, as it does for the sighting buckets (engine.297, codex
  // 2026-10-23 1a) — the row is classified by it (fame bonus, summary) and it
  // is never rewritten. The caller's role word is a bucket row's RoleType
  // ("Celebrity"), the legend / player pool's "A's legend", or a category the
  // bridge copied from another linked row, and classifyRole misreads several.
  // A blank / 'unknown' category is filled when the classification finds one:
  // on the POPID path from the row's own RoleType words (engine.313 — the
  // caller's word may be a dynasty's), else from the caller's role word.
  var fillCategory = false;
  if (targetIdx > 0) {
    var ownCat = String(iFameCat >= 0 ? data[targetIdx][iFameCat] || '' : '').trim();
    var ownDom = String(iCulDom >= 0 ? data[targetIdx][iCulDom] || '' : '').trim();
    if (ownCat && ownCat.toLowerCase() !== 'unknown') {
      fam = { cat: ownCat, dom: ownDom || classifyRole(ownCat).dom };
    } else {
      if (byPop) fam = classifyRole(String(iRoleType >= 0 ? data[targetIdx][iRoleType] || '' : ''));
      fillCategory = fam.cat !== 'unknown';
    }
  }

  // engine.99 Cohort 2 — core-sim hoods from Neighborhood_Map CoreSimRank (ADR-0016)
  var validNeighborhoods = getCoreSimNeighborhoods_(ctx);
  var validNeighborhood = "";
  for (var ni = 0; ni < validNeighborhoods.length; ni++) {
    if (validNeighborhoods[ni] === neighborhood) {
      validNeighborhood = neighborhood;
      break;
    }
  }

  // Build calendar context string (v2.2) — hoisted, referenced from both
  // first-call and registry-hit branches below.
  function buildCalendarContext_() {
    var parts = [];
    if (holiday !== "none") parts.push(holiday);
    if (isFirstFriday) parts.push("FirstFriday");
    if (isCreationDay) parts.push("CreationDay");
    if (sportsSeason !== "off-season") parts.push(sportsSeason);
    return parts.join(", ") || "";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PER-CYCLE REGISTRY (v2.5 — §B6 dedup hazard fix)
  //
  // Stores `{ culId, kind, accum, intents }` per entity registered this cycle:
  // an existing row under `row:<n>` (engine.313 — every spelling of one
  // citizen lands on one entry), a pending create under its name and, when it
  // links a citizen, under `pop:<POPID>` as well (engine.312 — a second
  // spelling of a citizen created this Cycle is a repeat, never a twin row).
  // `intents` are object references returned by queue* helpers; mutating their
  // `values` array re-targets the persistence executor's future cell/append
  // write to the new value (no re-queueing, no LWW games). FameScore is not
  // among them: the engine.312 fame accumulator owns it, and the flush writes it.
  // ═══════════════════════════════════════════════════════════════════════════
  ctx.summary.culturalRegistry = ctx.summary.culturalRegistry || {};
  var regKey = targetIdx > 0 ? 'row:' + (targetIdx + 1) : name;
  var reg = ctx.summary.culturalRegistry[regKey] ||
    ((targetIdx < 0 && popKey) ? ctx.summary.culturalRegistry['pop:' + popKey] : null) || null;
  var fameAcc = culturalFameAccum_(ctx);
  var paperByPop = S.paperFameByPop || {};
  var mcCol = iMediaCount >= 0 ? iMediaCount : 10;

  // A sighting of an existing row: LastSeenCycle, MediaCount and the sighting's
  // calendar cells — queued on the row's first sighting this Cycle, bumped in
  // place on a repeat (a roster call before it queued none).
  function sightExisting_(r) {
    var a = r.accum;
    a.mediaCount += 1;
    a.lastSeenCycle = cycle;
    if (holiday !== "none") a.lastHoliday = holiday;
    a.calendarContext = buildCalendarContext_();
    var put = function(key, colIdx, value, label) {
      if (colIdx < 0) return;
      if (r.intents[key]) r.intents[key].values[0][0] = value;
      else r.intents[key] = queueCellIntent_(ctx, 'Cultural_Ledger', r.row, colIdx + 1, value, 'registerCulturalEntity_: ' + label, 'media');
    };
    put('lastSeen', iLastSeen, a.lastSeenCycle, 'LastSeenCycle');
    put('mediaCount', mcCol, a.mediaCount, 'MediaCount');
    if (a.lastHoliday) put('lastHoliday', iLastHoliday, a.lastHoliday, 'LastSeenHoliday');
    put('calendarContext', iCalendarContext, a.calendarContext, 'CalendarContext');
  }

  // Helper updates (B4 batch pending — still caller-passed-sheet direct writes)
  // on the row's first sighting this Cycle. They read a PROVISIONAL score
  // (R2.1 e): the accumulator as it stands — paper and fade are in, a later
  // sighting tonight can still move the flushed final by its +1.
  function helpExisting_(r) {
    if (r.helped) return;
    r.helped = true;
    var provisional = culturalFameFinal_(culturalFameRow_(fameAcc, r.row));
    if (typeof updateMediaSpread_ === 'function') updateMediaSpread_(sheet, r.row, journalistName);
    if (typeof updateTrendTrajectory_ === 'function') updateTrendTrajectory_(sheet, r.row, provisional);
    if (typeof updateCityTier_ === 'function') updateCityTier_(sheet, r.row, provisional, r.accum.mediaCount);
  }

  // ───── REPEAT CALL: snapshot-UPDATE branch ─────
  // Entity existed in pre-cycle committed state; an earlier call this Cycle
  // registered row `reg.row`. A sighting adds +1 to the row's accumulator and
  // marks the sighting; a roster call adds nothing.
  if (reg && reg.kind === 'snapshot-update') {
    if (sighted) {
      culturalFameRow_(fameAcc, reg.row).sightings += 1;
      sightExisting_(reg);
      helpExisting_(reg);
    }
    return reg.culId;
  }

  // ───── REPEAT CALL: pending-create branch ─────
  // Entity was NEW this cycle; the first call queued an append intent. A
  // sighting mutates the pending row's LastSeenCycle, MediaCount, provisional
  // FameScore, LastSeenHoliday, CalendarContext (positional columns of the
  // CREATE row below); a roster call adds nothing.
  if (reg && reg.kind === 'pending-create') {
    if (!sighted) return reg.culId;
    reg.fame.sightings += 1;
    reg.accum.mediaCount += 1;
    if (holiday !== "none") reg.accum.lastHoliday = holiday;
    reg.accum.calendarContext = buildCalendarContext_();
    reg.accum.lastSeenCycle = cycle;

    var pendingRow = reg.intents.append.values[0];
    pendingRow[9] = reg.accum.lastSeenCycle;          // LastSeenCycle
    pendingRow[10] = reg.accum.mediaCount;            // MediaCount
    pendingRow[11] = culturalFamePendingFinal_(fameAcc, paperByPop, reg.fame);   // FameScore, provisional until the flush
    // engine.314: LastSeenHoliday / CalendarContext by header name, as UPDATE
    // writes them — positions 18 / 19 are HolidayPriority / SportsSeason on the
    // live header (engine.266). Absent there, so the CREATE row's Holiday /
    // HolidayPriority / SportsSeason stand (same Cycle, same values).
    if (reg.accum.lastHoliday && iLastHoliday >= 0) pendingRow[iLastHoliday] = reg.accum.lastHoliday;
    if (iCalendarContext >= 0) pendingRow[iCalendarContext] = reg.accum.calendarContext;

    return reg.culId;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE IF EXISTS (snapshot path — first call this cycle for the entity)
  // ═══════════════════════════════════════════════════════════════════════════
  if (targetIdx > 0) {
    var i = targetIdx;
    var rowName = iName >= 0 ? data[i][iName] : data[i][2];   // the row's own label (differs from `name` on the POPID path)
    var rowNum = i + 1;
    var existingCulId = iCulId >= 0 ? data[i][iCulId] : data[i][1];

    // Register for same-cycle repeat-call dedup
    reg = ctx.summary.culturalRegistry[regKey] = {
      kind: 'snapshot-update',
      culId: existingCulId,
      row: rowNum,
      accum: {
        mediaCount: Number(data[i][mcCol] || 0),
        lastSeenCycle: '',
        lastHoliday: '',
        calendarContext: ''
      },
      intents: {}
    };

    // engine.312: the row is touched (the flush writes its one FameScore cell);
    // a sighting adds +1. A famous citizen's floor rides the row they resolve
    // to unless it links another citizen (codex diff gate 1 §1 b — the
    // unlinked same-name row a roster registration claims).
    var fameRow = culturalFameRow_(fameAcc, rowNum);
    if (popKey && fameAcc.floorPops[popKey] && linkOk(i)) fameRow.floor = true;
    if (sighted) {
      fameRow.sightings += 1;
      sightExisting_(reg);
    }

    // FameCategory + Domain — only to fill a blank / 'unknown' category
    // (engine.315; an authored category is never rewritten).
    if (fillCategory) {
      if (iFameCat >= 0) queueCellIntent_(ctx, 'Cultural_Ledger', rowNum, iFameCat + 1, fam.cat, 'registerCulturalEntity_: FameCategory', 'media');
      if (iCulDom >= 0) queueCellIntent_(ctx, 'Cultural_Ledger', rowNum, iCulDom + 1, fam.dom, 'registerCulturalEntity_: CulturalDomain', 'media');
    }

    // Neighborhood update if provided and column exists
    if (iNeighborhood >= 0 && validNeighborhood) {
      queueCellIntent_(ctx, 'Cultural_Ledger', rowNum, iNeighborhood + 1, validNeighborhood, 'registerCulturalEntity_: Neighborhood', 'media');
    }

    // UniverseLinks POPID backfill (v2.6) — only when the committed cell is
    // empty; never overwrites an existing cross-ref.
    if (iUniverse >= 0 && popId && !data[i][iUniverse]) {
      queueCellIntent_(ctx, 'Cultural_Ledger', rowNum, iUniverse + 1, popId, 'registerCulturalEntity_: UniverseLinks', 'media');
    }

    if (sighted) helpExisting_(reg);

    // Track in summary — newFameScore is PROVISIONAL (R2.1 e; the flush writes the final)
    S.culturalEntityUpdates = S.culturalEntityUpdates || [];
    S.culturalEntityUpdates.push({
      culId: existingCulId,
      name: rowName,
      fameCategory: fam.cat,
      domain: fam.dom,
      newFameScore: culturalFameFinal_(fameRow),
      fameProvisional: true,
      mediaCount: reg.accum.mediaCount,
      cause: sighted ? 'sighting' : 'roster',
      holiday: holiday,
      isFirstFriday: isFirstFriday,
      sportsSeason: sportsSeason
    });

    return existingCulId;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE NEW CUL-ID
  // ═══════════════════════════════════════════════════════════════════════════
  var culId = "CUL-" + (typeof shortId_ === 'function' ? shortId_().toUpperCase() : rng().toString(36).substr(2, 6).toUpperCase());

  // engine.312 R3: the new row's fame is its linked citizen's paper record +
  // tonight's sightings of it (+ the famous floor, the cap) — written into the
  // append, finalised by the flush. A roster row marks no sighting.
  var pendingFame = { intent: null, pop: popKey, sightings: sighted ? 1 : 0 };
  var initialFameScore = culturalFamePendingFinal_(fameAcc, paperByPop, pendingFame);
  var initialCalCtx = buildCalendarContext_();
  var initialLastHoliday = holiday !== "none" ? holiday : "";

  var newRow = [
    inWorldStamp_(ctx),      // 0  Timestamp (S290 in-world)
    culId,                    // 1  CUL-ID
    name,                     // 2  Name
    roleType,                 // 3  RoleType
    fam.cat,                  // 4  FameCategory
    fam.dom,                  // 5  CulturalDomain
    "Active",                 // 6  Status
    popId,                    // 7  UniverseLinks (v2.6: SL POPID cross-ref, '' when unresolved)
    cycle,                    // 8  FirstSeenCycle
    sighted ? cycle : "",     // 9  LastSeenCycle           (a sighting's; mutable on repeat)
    sighted ? 1 : 0,          // 10 MediaCount              (sightings; mutable on repeat)
    initialFameScore,         // 11 FameScore               (provisional; the flush finalises)
    "rising",                 // 12 TrendTrajectory
    journalistName || "",     // 13 FirstRefSource
    1,                        // 14 MediaSpread
    "Local",                  // 15 CityTier
    validNeighborhood         // 16 Neighborhood
  ];
  // engine.266 / G-EC23–24: the live tab's last three columns are Holiday /
  // HolidayPriority / SportsSeason (schemas/SCHEMA_HEADERS.md), not the v2.2
  // FirstSeenHoliday / LastSeenHoliday / CalendarContext this row used to write
  // positionally — so HolidayPriority held a holiday name and SportsSeason held
  // "SummerFestival, mid-season" (39 of 53 live rows). Written by header name now.
  var calCells = {
    Holiday: initialLastHoliday,
    HolidayPriority: holiday !== "none" ? String(holidayPriority || "") : "",
    SportsSeason: sportsSeason || ""
  };
  for (var cc in calCells) {
    var ci = col(cc);
    if (ci < 0) continue;
    while (newRow.length < ci) newRow.push("");
    newRow[ci] = calCells[cc];
  }

  var appendIntent = queueAppendIntent_(ctx, 'Cultural_Ledger', newRow, 'registerCulturalEntity_: CREATE', 'media');
  pendingFame.intent = appendIntent;
  fameAcc.pending.push(pendingFame);

  // Register for same-cycle repeat-call dedup (by name, and by the citizen)
  var pendingReg = {
    kind: 'pending-create',
    culId: culId,
    fame: pendingFame,
    accum: {
      mediaCount: sighted ? 1 : 0,
      lastSeenCycle: sighted ? cycle : '',
      lastHoliday: initialLastHoliday,
      calendarContext: initialCalCtx
    },
    intents: { append: appendIntent }
  };
  ctx.summary.culturalRegistry[name] = pendingReg;
  if (popKey) ctx.summary.culturalRegistry['pop:' + popKey] = pendingReg;

  // Track in summary — fameScore is PROVISIONAL (R2.1 e; the flush writes the final)
  S.culturalEntityCreates = S.culturalEntityCreates || [];
  S.culturalEntityCreates.push({
    culId: culId,
    name: name,
    fameCategory: fam.cat,
    domain: fam.dom,
    neighborhood: validNeighborhood,
    fameScore: initialFameScore,
    fameProvisional: true,
    cause: sighted ? 'sighting' : 'roster',
    holiday: holiday,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason
  });

  ctx.summary = S;

  return culId;
}


/**
 * resolveLedgerPopId_ v1.0 (engine.44 Class 3)
 *
 * Exact "First Last" match against the shared ctx.ledger (Phase 42 §5.6).
 * Returns the POPID for a unique match, '' on miss or ambiguity — generic
 * pool celebrities (ACTORS/MUSICIANS in buildEveningFamous) have no ledger
 * row and correctly stay blank. Name→POPID map cached per-run on
 * ctx._popIdByName; duplicate full names are cached as '' so an ambiguous
 * match can never attribute the wrong citizen.
 */
function resolveLedgerPopId_(ctx, name) {
  if (!ctx || !ctx.ledger || !ctx.ledger.rows || !name) return '';
  if (!ctx._popIdByName) {
    var h = ctx.ledger.headers;
    var iPop = h.indexOf('POPID');
    var iFirst = h.indexOf('First');
    var iLast = h.indexOf('Last');
    if (iPop < 0 || iFirst < 0 || iLast < 0) return '';
    var map = {};
    var rows = ctx.ledger.rows;
    for (var i = 0; i < rows.length; i++) {
      var full = (String(rows[i][iFirst] || '') + ' ' + String(rows[i][iLast] || '')).trim();
      if (!full) continue;
      map[full] = map.hasOwnProperty(full) ? '' : String(rows[i][iPop] || '');
    }
    ctx._popIdByName = map;
  }
  return ctx._popIdByName[String(name).trim()] || '';
}


/**
 * ============================================================================
 * CULTURAL ENTITY REGISTRATION REFERENCE
 * ============================================================================
 *
 * FAME CATEGORIES:
 * - actor, musician, artist, dancer, curator
 * - athlete, sports-figure
 * - journalist, influencer, streamer, media-personality
 * - civic-figure, activist, community-leader
 * - chef
 * - author
 * - model
 * - business-figure
 * - unknown
 *
 * CULTURAL DOMAINS:
 * - Arts, Sports, Media, Civic, Culinary
 * - Literature, Fashion, Business, Other
 *
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 *
 * FAME SCORE (engine.312, builder 2026-10-23 / 10-25):
 *
 * | Cause | Delta |
 * |-------|-------|
 * | Named in a published piece, positive light | +5 |
 * | Named in a published piece, neutral / blank light | +1 |
 * | Named in a published piece, negative light | −2 |
 * | Own work, family-own-words, off-list type, media-room copy | 0 |
 * | Sighting (buildEveningFamous_) | +1 |
 * | Quiet for more than 10 Cycles (no sighting) | −1 a Cycle |
 * | Held as Famous by the engine.118 ladder | floor 25 |
 * | Ceiling | 100 |
 * (The v2.2 calendar / economy extras retired with engine.312.)
 *
 * LEDGER COLUMNS (v2.2, positional indices used by v2.5 pending-create mutation):
 *  0 Timestamp        1 CUL-ID           2 Name             3 RoleType
 *  4 FameCategory     5 CulturalDomain   6 Status           7 UniverseLinks
 *  8 FirstSeenCycle   9 LastSeenCycle*  10 MediaCount*     11 FameScore*
 * 12 TrendTrajectory 13 FirstRefSource  14 MediaSpread     15 CityTier
 * 16 Neighborhood    17 FirstSeenHoliday 18 LastSeenHoliday* 19 CalendarContext*
 * (* = mutable on same-cycle repeat-call via ctx.summary.culturalRegistry.)
 *
 * SUMMARY TRACKING:
 * - culturalEntityUpdates: Array of updated entities (first-call snapshot)
 * - culturalEntityCreates: Array of new entities (first-call snapshot)
 * - culturalRegistry: per-cycle `row:<n>` / name / `pop:<POPID>` → {culId, kind,
 *   accum, intents} map for intent-object-ref dedup on same-cycle multi-register
 * - culturalFameFlush: the flush's counts (touched, written, pending, paper credited / no row)
 * - paperFameByPop: each citizen's whole paper record (Phase 5) — a new row's start
 *
 * ============================================================================
 */

// Dual-use module guard for Node-side tests (claspignored *.test.js).
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    resolveLedgerPopId_: resolveLedgerPopId_,
    paperFameDelta_: paperFameDelta_,                 // engine.312: the one record rule (the re-base dry run reads it)
    culturalTargetIdxByPop_: culturalTargetIdxByPop_,
    FAME_COVERAGE_TYPES: FAME_COVERAGE_TYPES,
    CULTURAL_FAME_CEILING: CULTURAL_FAME_CEILING
  };
}
