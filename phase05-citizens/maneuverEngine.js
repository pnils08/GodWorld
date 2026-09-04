/**
 * ============================================================================
 * MANEUVER ENGINE — engine.157 (bloodline cut 9, S416)
 * ============================================================================
 *
 * Phase5-Maneuver. Runs after Phase5-BusinessDynamics and before Phase5-Career
 * so every roll later in Phase 5 reads this cycle's posture the same cycle:
 * the casino (placement + stake band), the solo door, the home purchase,
 * relocation, and the citizen's side of a field change.
 *
 * The citizen reads what the cycle threw at them — the dials the Phase 9 fold
 * left on the row, the money the money loop committed, the line's standing —
 * and sets a RISK POSTURE for the cycle. The posture is a multiplier on dice
 * that already exist. It never rolls an outcome of its own (SIM_DOCTRINE 1–2).
 *
 *   ambition  A = round(w × drive + (1 − w) × openness)   off DialState.base
 *             (fallback: the TraitProfile face's drive:NN|openness:NN; no dials → 50)
 *             — NOT a ninth dial: the ambition axis Mike built is `drive`
 *             (TRAIT_MODIFIERS: ambitious, focused, determined), `openness`
 *             is the willingness to change field or hood. engine.94 Track B's
 *             "typed ambition" is the GOAL below, read off the row's rung.
 *   goal      establish (no household) → home (rented) → wealth (owned, no
 *             line) → tenure (on an active line) | revive (on a dormant line)
 *   posture   retreat  when DebtLevel ≥ maneuverRetreatDebt, or the line's
 *                      standing sits within maneuverStandingMargin of the bar
 *                      below its tier — pull in, protect what is held
 *             climb    when A ≥ maneuverClimbBar and no retreat cause
 *             hold     otherwise — the quiet middle; hold is silence
 *
 * Persistence: S.maneuver.byPop for the same-cycle consumers; the decision
 * itself rides on DialState as an additive `maneuver: {p, g, a, c}` field
 * (the chaosExposure pattern — deserialize_/serializeDialState_ pass it
 * through). A LifeHistory line fires ON CHANGE ONLY; entering hold from the
 * default is silent. Tags Maneuver-Climb / -Retreat / -Hold live in
 * citizenDialMap.js and move the dials at the Phase 9 fold (small, bounded).
 *
 * Every calibration value is World_Config (ADR-0015), self-armed at open by
 * ensureEngine157Config_ — a missing key throws (the engine.160 pattern).
 * No Math.random. No sheet writes: ctx.ledger rows in memory (Phase 10
 * commits) + LifeHistory_Log append intents. Reads Household_Ledger and
 * Heritage_Ledger once each (read-only).
 * ============================================================================
 */

var MANEUVER_CONFIG_KEYS = [
  'maneuverClimbBar', 'maneuverRetreatDebt', 'maneuverStandingMargin',
  'maneuverClimbOdds', 'maneuverRetreatOdds', 'maneuverDriveWeight'
];

// engine.156 bars, mirrored so this phase reads the same ladder the heritage
// step writes. HERITAGE_TIERS in generationalWealthEngine.js is the source of
// truth when the flat Apps Script namespace carries it.
var MANEUVER_TIER_BARS_FALLBACK = { Founding: 0, Established: 30, Prominent: 50, Dynasty: 70 };

function maneuverConfig_(ctx) {
  var cfg = ctx && ctx.config ? ctx.config : null;
  if (!cfg) throw new Error('engine.157 maneuver: ctx.config missing — World_Config not loaded');
  var out = {};
  for (var i = 0; i < MANEUVER_CONFIG_KEYS.length; i++) {
    var k = MANEUVER_CONFIG_KEYS[i];
    var v = Number(cfg[k]);
    if (cfg[k] === '' || cfg[k] === null || cfg[k] === undefined || isNaN(v)) {
      throw new Error('engine.157 maneuver: World_Config ' + k + ' missing or non-numeric — the self-arm did not run (ADR-0015).');
    }
    out[k] = v;
  }
  return out;
}

function maneuverParseDial_(dialStateStr) {
  if (!dialStateStr) return null;
  try {
    var o = typeof dialStateStr === 'string' ? JSON.parse(dialStateStr) : dialStateStr;
    return (o && typeof o === 'object') ? o : null;
  } catch (e) { return null; }
}

// drive + openness off DialState.base; the TraitProfile face as the fallback.
function maneuverDials_(dialStateStr, traitProfileStr) {
  var o = maneuverParseDial_(dialStateStr);
  var drive = null, open = null;
  if (o && o.base) {
    if (typeof o.base.drive === 'number') drive = o.base.drive;
    if (typeof o.base.openness === 'number') open = o.base.openness;
  }
  var tp = String(traitProfileStr || '');
  if (drive === null) { var md = tp.match(/(?:^|\|)drive:(\d+)/i); if (md) drive = Number(md[1]); }
  if (open === null) { var mo = tp.match(/(?:^|\|)openness:(\d+)/i); if (mo) open = Number(mo[1]); }
  return { drive: drive === null ? 50 : drive, openness: open === null ? 50 : open, hasDials: !!(o && o.base) };
}

function maneuverAmbition_(drive, openness, driveWeight) {
  var w = Number(driveWeight);
  if (isNaN(w)) w = 0.7;
  return Math.round(w * (Number(drive) || 0) + (1 - w) * (Number(openness) || 0));
}

// The rung on the chain names the goal. Never stored — read off the row.
function maneuverGoal_(householdId, owned, lineageId, lineStatus) {
  if (lineageId) return String(lineStatus || 'active').toLowerCase() === 'dormant' ? 'revive' : 'tenure';
  if (!householdId) return 'establish';
  return owned ? 'wealth' : 'home';
}

function maneuverTierBars_() {
  var bars = {};
  if (typeof HERITAGE_TIERS !== 'undefined' && HERITAGE_TIERS && HERITAGE_TIERS.length) {
    for (var i = 0; i < HERITAGE_TIERS.length; i++) bars[HERITAGE_TIERS[i].name] = Number(HERITAGE_TIERS[i].min) || 0;
    return bars;
  }
  return MANEUVER_TIER_BARS_FALLBACK;
}

// line = { tier, score, status } | null. Returns the retreat reason or ''.
function maneuverLineNearBar_(line, margin) {
  if (!line || !line.tier) return '';
  if (String(line.status || 'active').toLowerCase() === 'dormant') return '';
  var bars = maneuverTierBars_();
  var bar = bars[line.tier];
  if (bar === undefined || bar <= 0) return ''; // Founding has no bar below
  var score = Number(line.score);
  if (isNaN(score)) return '';
  return (score - bar) < margin ? 'standing' : '';
}

// causes, then the posture. Pure.
function maneuverPosture_(cfg, ambition, debtLevel, line) {
  var debt = Number(debtLevel) || 0;
  if (debt >= cfg.maneuverRetreatDebt) return { posture: 'retreat', reason: 'debt' };
  var near = maneuverLineNearBar_(line, cfg.maneuverStandingMargin);
  if (near) return { posture: 'retreat', reason: near };
  if (ambition >= cfg.maneuverClimbBar) return { posture: 'climb', reason: 'ambition' };
  return { posture: 'hold', reason: 'even' };
}

function maneuverGoalPhrase_(goal) {
  switch (goal) {
    case 'establish': return 'a place of their own first';
    case 'home': return 'the house first';
    case 'wealth': return 'the money next';
    case 'tenure': return 'the name to keep';
    case 'revive': return 'the name to bring back';
    default: return '';
  }
}

function maneuverLine_(posture, goal, reason) {
  var g = maneuverGoalPhrase_(goal);
  if (posture === 'climb') return '[Maneuver-Climb] playing to climb — ' + g;
  if (posture === 'retreat') {
    return '[Maneuver-Retreat] pulling in — ' + (reason === 'standing' ? "the line's standing is near the bar" : 'the debt says so');
  }
  return '[Maneuver-Hold] settling — ' + g;
}

function maneuverStamp_(ctx, cycle) {
  if (typeof inWorldStamp_ === 'function') { try { var s = inWorldStamp_(ctx); if (s) return s; } catch (e) {} }
  return 'Y' + (Math.floor((cycle - 1) / 52) + 1) + 'C' + (((cycle - 1) % 52) + 1);
}

// Household_Ledger → { householdId: { owned, head, status } } (active rows only).
// null when the sheet is absent (Node harness) — goal falls back to household presence.
function maneuverHouseholds_(ctx) {
  var ss = ctx && ctx.ss;
  if (!ss || typeof ss.getSheetByName !== 'function') return null;
  var sh = ss.getSheetByName('Household_Ledger');
  if (!sh) return null;
  var v = sh.getDataRange().getValues();
  if (!v || v.length < 2) return {};
  var h = v[0];
  var iId = h.indexOf('HouseholdId'), iType = h.indexOf('HousingType'), iStat = h.indexOf('Status'), iHead = h.indexOf('HeadOfHousehold');
  if (iId < 0) return {};
  var out = {};
  for (var r = 1; r < v.length; r++) {
    var id = String(v[r][iId] || '').trim();
    if (!id) continue;
    if (iStat >= 0 && String(v[r][iStat] || 'active').toLowerCase() !== 'active') continue;
    out[id] = {
      owned: iType >= 0 && String(v[r][iType] || '').toLowerCase() === 'owned',
      head: iHead >= 0 ? String(v[r][iHead] || '').trim() : ''
    };
  }
  return out;
}

// Heritage_Ledger → { lineageId: { tier, score, status } }. Tolerates the
// pre-engine.156 16-column tab (no Status → active). null when absent.
function maneuverLines_(ctx) {
  var ss = ctx && ctx.ss;
  if (!ss || typeof ss.getSheetByName !== 'function') return null;
  var sh = ss.getSheetByName('Heritage_Ledger');
  if (!sh) return null;
  var v = sh.getDataRange().getValues();
  if (!v || v.length < 2) return {};
  var h = v[0];
  var iL = h.indexOf('LineageId'), iT = h.indexOf('HeritageTier'), iS = h.indexOf('HeritageScore'), iSt = h.indexOf('Status');
  if (iL < 0) return {};
  var out = {};
  for (var r = 1; r < v.length; r++) {
    var id = String(v[r][iL] || '').trim();
    if (!id) continue;
    out[id] = {
      tier: iT >= 0 ? String(v[r][iT] || '') : '',
      score: iS >= 0 ? Number(v[r][iS]) : NaN,
      status: iSt >= 0 ? String(v[r][iSt] || 'active') : 'active'
    };
  }
  return out;
}

/**
 * Phase5-Maneuver entry. Publishes S.maneuver = { byPop, counts, lines }.
 */
function runManeuverEngine_(ctx) {
  var S = ctx.summary;
  var cfg = maneuverConfig_(ctx);
  var cycle = Number(ctx.config && ctx.config.cycleCount) || Number(S && S.cycleId) || 0;
  var header = ctx.ledger && ctx.ledger.headers, rows = ctx.ledger && ctx.ledger.rows;
  var result = { byPop: {}, counts: { climb: 0, hold: 0, retreat: 0, lines: 0, skipped: 0 }, byGoal: {} };
  S.maneuver = result;
  if (!header || !rows || !rows.length) return result;

  var idx = function (n) { return header.indexOf(n); };
  var iPop = idx('POPID'), iStatus = idx('Status'), iClock = idx('ClockMode'), iBirth = idx('BirthYear'),
      iDebt = idx('DebtLevel'), iHH = idx('HouseholdId'), iLin = idx('LineageId'),
      iDial = idx('DialState'), iTrait = idx('TraitProfile'), iLife = idx('LifeHistory'), iLastUpd = idx('LastUpdated');
  if (iPop < 0) return result;

  var households = maneuverHouseholds_(ctx);
  var lines = maneuverLines_(ctx);
  var ageYear = (typeof simYearOf_ === 'function') ? simYearOf_(ctx, cycle) : null;
  var stamp = maneuverStamp_(ctx, cycle);

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var pop = String(row[iPop] || '').trim();
    if (!pop) continue;
    if (iStatus >= 0 && String(row[iStatus] || 'active').toLowerCase() === 'deceased') continue;
    if (iClock >= 0 && String(row[iClock] || '').toUpperCase() === 'GAME') continue; // the sports layer is Paulson's
    if (ageYear !== null && iBirth >= 0) {
      var by = Number(row[iBirth]) || 0;
      if (by > 0 && ageYear - by < 18) continue;
    }

    var dials = maneuverDials_(iDial >= 0 ? row[iDial] : '', iTrait >= 0 ? row[iTrait] : '');
    var ambition = maneuverAmbition_(dials.drive, dials.openness, cfg.maneuverDriveWeight);

    var hhId = iHH >= 0 ? String(row[iHH] || '').trim() : '';
    var hh = (households && hhId) ? households[hhId] : null;
    var owned = !!(hh && hh.owned);
    var linId = iLin >= 0 ? String(row[iLin] || '').trim() : '';
    var line = (lines && linId) ? (lines[linId] || null) : null;
    var goal = maneuverGoal_(hhId, owned, linId, line ? line.status : 'active');
    var decided = maneuverPosture_(cfg, ambition, iDebt >= 0 ? row[iDebt] : 0, line);

    var entry = { posture: decided.posture, goal: goal, ambition: ambition, drive: dials.drive, openness: dials.openness, reason: decided.reason };
    result.byPop[pop] = entry;
    result.counts[decided.posture] += 1;
    var gk = goal + '|' + decided.posture;
    result.byGoal[gk] = (result.byGoal[gk] || 0) + 1;

    // ── memory + the line, on change only ─────────────────────────────────
    // No DialState → no memory to remember by → no line (the posture still
    // steers the cycle's rolls through S.maneuver). 7 live rows at C105.
    var dialObj = iDial >= 0 ? maneuverParseDial_(row[iDial]) : null;
    if (!dialObj || !dialObj.base) { result.counts.skipped += 1; continue; }
    var prev = null;
    if (dialObj.maneuver && dialObj.maneuver.p) prev = dialObj.maneuver;
    var prevPosture = prev ? String(prev.p) : 'hold';
    var prevGoal = prev ? String(prev.g || '') : '';
    var changed = prevPosture !== decided.posture || (prev && prevGoal !== goal);
    if (!changed) continue;

    dialObj.maneuver = { p: decided.posture, g: goal, a: ambition, c: cycle };
    row[iDial] = JSON.stringify(dialObj);
    ctx.ledger.dirty = true;

    // hold entered from the default is silence; hold entered from climb/retreat is a settling
    var speak = decided.posture !== 'hold' || (prev && prevPosture !== 'hold');
    if (!speak) continue;

    var text = maneuverLine_(decided.posture, goal, decided.reason);
    var lineOut = stamp + ' — ' + text;
    if (iLife >= 0) {
      var life = row[iLife] ? String(row[iLife]) : '';
      if (life.indexOf(lineOut) < 0) {
        row[iLife] = life ? life + '\n' + lineOut : lineOut;
        if (iLastUpd >= 0) row[iLastUpd] = ctx.now;
        ctx.ledger.dirty = true;
        result.counts.lines += 1;
        if (typeof queueAppendIntent_ === 'function') {
          var tag = text.match(/^\[([^\]]+)\]/);
          queueAppendIntent_(ctx, 'LifeHistory_Log', [ctx.now, pop, '', tag ? tag[1] : 'Maneuver',
            text.replace(/^\[[^\]]+\]\s*/, ''), '', cycle], 'engine.157 maneuver line', 'citizens', 60);
        }
      }
    }
  }

  Logger.log('engine.157 maneuver: climb ' + result.counts.climb + ' / hold ' + result.counts.hold +
    ' / retreat ' + result.counts.retreat + ' — ' + result.counts.lines + ' line(s) written; bar ' +
    cfg.maneuverClimbBar + ', debt ' + cfg.maneuverRetreatDebt + ', margin ' + cfg.maneuverStandingMargin);
  return result;
}

// ── read surface for the same-cycle consumers ───────────────────────────────

function maneuverPostureOf_(ctx, popId) {
  var S = ctx && ctx.summary;
  if (!S || !S.maneuver || !S.maneuver.byPop) return null;
  return S.maneuver.byPop[String(popId || '').trim()] || null;
}

// The odds multiplier for one citizen at one roll. 1 when the phase has not
// run (a consumer's unit harness, or a cycle before the deploy), when the
// citizen has no posture, or when goalFilter is given and the goal differs.
function maneuverFactor_(ctx, popId, goalFilter) {
  var e = maneuverPostureOf_(ctx, popId);
  if (!e) return 1;
  if (goalFilter && e.goal !== goalFilter) return 1;
  var cfg = ctx.config || {};
  if (e.posture === 'climb') { var up = Number(cfg.maneuverClimbOdds); return isNaN(up) ? 1.5 : up; }
  if (e.posture === 'retreat') { var dn = Number(cfg.maneuverRetreatOdds); return isNaN(dn) ? 0.5 : dn; }
  return 1;
}

// A climber open enough to change fields — the citizen's side of the
// engine.135 E3 ruling (a field change is a story in a life, never a filler).
function maneuverWillingCrossField_(ctx, popId) {
  var e = maneuverPostureOf_(ctx, popId);
  if (!e || e.posture !== 'climb') return false;
  var bar = Number(ctx.config && ctx.config.maneuverClimbBar);
  if (isNaN(bar)) bar = 60;
  return (Number(e.openness) || 0) >= bar;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runManeuverEngine_: runManeuverEngine_,
    maneuverConfig_: maneuverConfig_,
    maneuverDials_: maneuverDials_,
    maneuverAmbition_: maneuverAmbition_,
    maneuverGoal_: maneuverGoal_,
    maneuverPosture_: maneuverPosture_,
    maneuverLineNearBar_: maneuverLineNearBar_,
    maneuverLine_: maneuverLine_,
    maneuverPostureOf_: maneuverPostureOf_,
    maneuverFactor_: maneuverFactor_,
    maneuverWillingCrossField_: maneuverWillingCrossField_,
    MANEUVER_CONFIG_KEYS: MANEUVER_CONFIG_KEYS
  };
}
