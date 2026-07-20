/**
 * chaosCarsEngine.js — Phase 4 stochastic event-injection engine (engine.11).
 *
 * [engine/sheet] chaos-cars plan docs/plans/2026-05-07-chaos-cars-engine.md (T3.1-T3.12,
 * T5.1), built to the §S265 corrected spec. Fires 3-15 typed-municipal-vehicle events per
 * cycle; each = vehicle × scope × dice-rolled outcome × magnitude, written to scope-
 * appropriate surfaces. The chaos_cars ledger row is source-of-truth (queued first);
 * scope writebacks are derived. Asymmetric decay (utilities/chaosCarsDecay.js) compounds
 * the city toward intrigue. Tier-1 citizen hits flag the Phase-5 cascade.
 *
 * Apps Script global-function style (clasped). Reads config/decay/validators from the
 * clasped utilities/ globals (chaosCarsConfig.js, chaosCarsDecay.js, citizenDialMap.js).
 * NEVER Math.random — ctx.rng only (engine.md). Writes via write-intents only, except the
 * ctx.ledger col-O mutation (the established citizen-affect seam, committed at Phase 10).
 *
 * Per-scope writeback (§S265):
 *   citizen      → col-O mutate (DIAL_MAP tag) + LifeHistory_Log append + ctx.ledger.dirty
 *   business     → accumulate ctx.summary.chaosBusinessFold → one queueCellIntent_ per biz/col
 *   neighborhood → accumulate ctx.summary.chaosNeighborhoodFold residual → Phase-10 writer fold
 *                  consumes + decays it (NO column write — that is clobber-certain; see T1.5).
 */

var CHAOS_MIN_EVENTS = 3;
var CHAOS_MAX_EVENTS = 15;

// V2-5 (S326) — the consequence class: citizen-scope outcomes that enter the
// story surface via recordRipple_ (Ripple_Ledger + S.rippleEvents → contract
// seeds). Tickets/warnings/texture stay silent — they already ride the
// citizen-event stream and are not stories on their own.
var CHAOS_RIPPLE_OUTCOMES = {
  medical_emergency: true,
  workplace_accident: true,
  arrested: true,
  substance_intervention: true
};

// ── primitives ──────────────────────────────────────────────────────────────

// 8-char id from the deterministic rng (NEVER Math.random / Utilities.getUuid — both
// non-deterministic, would break run reproducibility).
function chaosEventId_(rng) {
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var s = '';
  for (var i = 0; i < 8; i++) s += chars.charAt(Math.floor(rng() * chars.length));
  return s;
}

function pickFromArrayChaos_(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Weighted sample. items = array; weightFn(item) → number. Returns the chosen item.
function weightedPickChaos_(rng, items, weightFn) {
  var total = 0;
  for (var i = 0; i < items.length; i++) total += Math.max(0, Number(weightFn(items[i])) || 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  var roll = rng() * total;
  var acc = 0;
  for (var j = 0; j < items.length; j++) {
    acc += Math.max(0, Number(weightFn(items[j])) || 0);
    if (roll < acc) return items[j];
  }
  return items[items.length - 1];
}

// T3.1 — variable event count in [MIN,MAX] inclusive.
function pickEventCount_(rng) {
  return CHAOS_MIN_EVENTS + Math.floor(rng() * (CHAOS_MAX_EVENTS - CHAOS_MIN_EVENTS + 1));
}

// T3.2 — vehicle weighted by baseFrequencyWeight.
function pickVehicle_(rng, configs) {
  return weightedPickChaos_(rng, configs, function (v) { return v.baseFrequencyWeight; });
}

// T3.6 — outcome weighted by outcome.weight; re-validate no-death at roll time.
// Scope-aware: a CITIZEN hit may only roll outcomes that carry a lifeHistoryTag (a real
// DIAL_MAP tag). Untagged outcomes are neighborhood/biz texture (e.g. street_sweeper's
// street_beautification) and have no citizen meaning — rolling one onto a citizen would
// have no dial to move (writeCitizenEvent_ requires a tag). Non-citizen scopes use the
// full pool (the tag is simply unused). Returns null if a citizen scope has no tagged
// outcome (caller skips the event with a friction note).
// engine.67 step 8 (S325): outcome-level life-state gates — what can happen to
// a citizen depends on who they are (impossible-bar ruling). A student draws
// no workplace accident; a child is never arrested or ticketed. Unlisted
// outcomes stay universal (being NEAR chaos is possible at any age).
var CHAOS_OUTCOME_GATES = {
  workplace_accident:  function (ls) { return ls.working === 'working'; },
  arrested:            function (ls) { return !ls.isMinor; },
  ticket:              function (ls) { return ls.age === null || ls.age >= 16; },
  pulled_over_warning: function (ls) { return ls.age === null || ls.age >= 16; },
  // S325 acceptance catch: C102-104 fresh-bench run put a substance
  // intervention on a 4-year-old. OARI treats adults; de-escalation teen+.
  substance_intervention: function (ls) { return !ls.isMinor; },
  deescalated:            function (ls) { return ls.age === null || ls.age >= 13; }
};

function rollOutcome_(rng, vehicle, scope, target) {
  var pool = vehicle.textureOutcomes;
  if (scope === 'citizen') {
    pool = [];
    var tls = target && target.lifeState;
    for (var i = 0; i < vehicle.textureOutcomes.length; i++) {
      var oc = vehicle.textureOutcomes[i];
      if (!oc.lifeHistoryTag) continue;
      if (tls && CHAOS_OUTCOME_GATES[oc.outcome] && !CHAOS_OUTCOME_GATES[oc.outcome](tls)) continue; // engine.67 step 8
      pool.push(oc);
    }
    if (!pool.length) return null;
  }
  var outcome = weightedPickChaos_(rng, pool, function (o) { return o.weight; });
  validateOutcome(outcome.outcome); // throws on any forbidden token (defence in depth)
  return outcome;
}

// T3.7 — sample a signed magnitude within range. Float-aware (round2 — neighborhood cols
// are fractional 0.02-0.15; business/event/retail are larger). Sign by direction.
function sampleMagnitude_(rng, impact) {
  var lo = impact.magnitudeRange[0];
  var hi = impact.magnitudeRange[1];
  var v = lo + rng() * (hi - lo);
  v = Math.round(v * 100) / 100;
  return impact.direction === 'down' ? -v : v;
}

// Filter a vehicle's metricImpacts to a chosen scope + the rolled outcome's onOutcome gate.
function impactsForScope_(vehicle, scope, outcomeName) {
  var out = [];
  var impacts = vehicle.metricImpacts || [];
  for (var i = 0; i < impacts.length; i++) {
    var m = impacts[i];
    if (m.scope !== scope) continue;
    if (m.onOutcome) {
      var ok = (typeof m.onOutcome === 'string') ? (m.onOutcome === outcomeName)
        : (m.onOutcome.indexOf(outcomeName) >= 0);
      if (!ok) continue;
    }
    out.push(m);
  }
  return out;
}

// ── target pickers (T3.3 / T3.4 / T3.5) ──────────────────────────────────────

// T3.3 — uniform-random citizen from the shared ledger (no tier protection, §S205).
// engine.67 step 2 (S325): eligibility filter — chaos can only hit citizens who
// are actually IN the city. Deceased/inactive/traded/pending are unreachable
// (the S325 conditioning matrix caught deceased rows as pickable). Being hit by
// street chaos is possible at any age, so no age gate here — status only.
// Filter consumes no rng; the pick stays one draw over the eligible set.
function pickCitizenTarget_(rng, ctx) {
  if (!ctx.ledger || !ctx.ledger.rows || ctx.ledger.rows.length === 0) return null;
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var iPop = header.indexOf('POPID');
  var iTier = header.indexOf('Tier');
  var iNb = header.indexOf('Neighborhood');
  var iStatus = header.indexOf('Status');
  var eligible = [];
  for (var ei = 0; ei < rows.length; ei++) {
    if (iStatus >= 0) {
      var st = String(rows[ei][iStatus] || '').trim().toLowerCase();
      if (st === 'deceased' || st === 'inactive' || st === 'traded' || st === 'pending') continue;
    }
    eligible.push(ei);
  }
  if (!eligible.length) return null;
  var r = eligible[Math.floor(rng() * eligible.length)];
  var row = rows[r];
  // engine.67 step 8: carry the target's life-state so the outcome roll can
  // gate what can happen TO them (deriveLifeState_ — citizenContextBuilder).
  var tgtLifeState = null;
  if (typeof deriveLifeState_ === 'function') {
    var iBY8 = header.indexOf('BirthYear'), iRT8 = header.indexOf('RoleType');
    tgtLifeState = deriveLifeState_({
      birthYear: iBY8 >= 0 ? row[iBY8] : 0,
      simYear: (ctx.summary && ctx.summary.simYear) || 2041,
      status: iStatus >= 0 ? row[iStatus] : '',
      occupation: iRT8 >= 0 ? row[iRT8] : '',
      roleType: iRT8 >= 0 ? row[iRT8] : ''
    });
  }
  var tierRaw = iTier >= 0 ? row[iTier] : null;
  var tierNum = parseInt(String(tierRaw).replace(/[^0-9]/g, ''), 10);
  return {
    rowIndex: r,
    popId: iPop >= 0 ? row[iPop] : '',
    tier: isNaN(tierNum) ? null : tierNum,
    neighborhood: iNb >= 0 ? (row[iNb] || '') : '',
    lifeState: tgtLifeState // engine.67 step 8
  };
}

// Business_Ledger cached read (direct read OK — engine.md allows reads; writes go via intent).
function loadBusinessRows_(ctx) {
  if (ctx._chaosBizCache) return ctx._chaosBizCache;
  var data = null;
  if (ctx.cache && typeof ctx.cache.getData === 'function') {
    // getData returns the cache wrapper {values, header, sheet, exists} — unwrap to the
    // 2D values array. (S271 fix: was treating the wrapper as an array → data.slice threw
    // live, since tests run without ctx.cache and silently took the direct-read fallback.)
    var cd = ctx.cache.getData('Business_Ledger');
    data = cd && cd.values ? cd.values : null;
  }
  if (!Array.isArray(data)) {
    var sh = ctx.ss.getSheetByName('Business_Ledger');
    data = sh ? sh.getDataRange().getValues() : [];
  }
  var header = data.length ? data[0] : [];
  // Trimmed header lookup — col G is stored '  Annual_Revenue  ' (verified live S265);
  // a literal indexOf returns -1 and silently drops the write.
  function tcol(name) {
    for (var i = 0; i < header.length; i++) if (String(header[i]).trim() === name) return i;
    return -1;
  }
  var cache = {
    header: header,
    rows: data.slice(1),
    iId: tcol('BIZ_ID'),
    iSector: tcol('Sector'),
    iNb: tcol('Neighborhood'),
    iRevenue: tcol('Annual_Revenue'),
    iEmployees: tcol('Employee_Count')
  };
  ctx._chaosBizCache = cache;
  return cache;
}

// T3.4 — uniform-random business. Returns the 1-based sheet row for cell intents.
function pickBusinessTarget_(rng, ctx) {
  var biz = loadBusinessRows_(ctx);
  if (!biz.rows.length) return null;
  var r = Math.floor(rng() * biz.rows.length);
  var row = biz.rows[r];
  return {
    rowIndex: r,
    sheetRow: r + 2, // past header, 1-based
    bizId: biz.iId >= 0 ? row[biz.iId] : '',
    sector: biz.iSector >= 0 ? (row[biz.iSector] || '') : '',
    neighborhood: biz.iNb >= 0 ? (row[biz.iNb] || '') : ''
  };
}

// T3.5 — uniform-random neighborhood from the live Neighborhood_Map.
function loadNeighborhoodNames_(ctx) {
  if (ctx._chaosNbCache) return ctx._chaosNbCache;
  var data = null;
  if (ctx.cache && typeof ctx.cache.getData === 'function') {
    var cd = ctx.cache.getData('Neighborhood_Map');  // unwrap cache wrapper {values,...} — S271 fix (same class as loadBusinessRows_)
    data = cd && cd.values ? cd.values : null;
  }
  if (!Array.isArray(data)) {
    var sh = ctx.ss.getSheetByName('Neighborhood_Map');
    data = sh ? sh.getDataRange().getValues() : [];
  }
  var header = data.length ? data[0] : [];
  var iName = header.indexOf('Neighborhood');
  var names = [];
  for (var i = 1; i < data.length; i++) {
    var n = iName >= 0 ? data[i][iName] : null;
    if (n) names.push(n);
  }
  ctx._chaosNbCache = names;
  return names;
}

function pickNeighborhoodTarget_(rng, ctx) {
  var names = loadNeighborhoodNames_(ctx);
  if (!names.length) return null;
  return { neighborhood: pickFromArrayChaos_(rng, names) };
}

// ── scope writebacks (T3.8 / T3.9 / T3.10) ───────────────────────────────────

// T3.8 — citizen: mutate col O with the DIAL_MAP tag + append LifeHistory_Log + dirty flag.
// Mirrors generateCitizensEvents.js:1705-1709 + :1739.
function writeCitizenEvent_(ctx, target, vehicle, outcome, cycle, text) {
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var iLife = header.indexOf('LifeHistory');
  var iLastU = header.indexOf('LastUpdated');
  var iFirst = header.indexOf('First');
  var iLast = header.indexOf('Last');
  var iPop = header.indexOf('POPID');
  var iNb = header.indexOf('Neighborhood');
  var iDialState = header.indexOf('DialState');
  var row = rows[target.rowIndex];

  // The bracket tag in col O MUST be a real DIAL_MAP tag, else compressLifeHistory folds it
  // to DEFAULT_AMBIENT (+composure) — the inverse of intended adversity (§S265). Every
  // citizen-scope outcome carries lifeHistoryTag; fail loud if a config slips through.
  var dialTag = outcome.lifeHistoryTag;
  if (!dialTag) {
    throw new Error('chaos_cars: citizen-scope outcome "' + outcome.outcome + '" (vehicle ' +
      vehicle.name + ') has no lifeHistoryTag — would fall through DIAL_MAP to +composure.');
  }

  var stamp = inWorldStamp_(ctx);
  var line = stamp + ' — [' + dialTag + '] ' + text;
  var existing = (iLife >= 0 && row[iLife]) ? row[iLife].toString() : '';
  if (iLife >= 0) row[iLife] = existing ? existing + '\n' + line : line;
  if (iLastU >= 0) row[iLastU] = inWorldStamp_(ctx);  // S271 in-world, not wall-clock
  rows[target.rowIndex] = row;
  ctx.ledger.dirty = true;

  // engine.42 chaos-trauma (S275): this hit feeds the citizen's persisted, cross-cycle
  // chaos accumulator carried on DialState. accrueChaos_ bumps the count (severity from
  // outcome.severity, type = vehicle); applyChaosReaction_ applies a ONE-TIME labeled break
  // (wary -> traumatized) to base when repetition crosses the threshold — the second tier on
  // top of the [dialTag] fold above. DialState (de)serializes via the same clasped globals
  // compress (Phase 9) uses, so the two cycle-path DialState writers compose without clobber
  // (compress preserves chaosExposure + lazy-decays it). Cross-cycle persistence is mandatory:
  // ctx.summary folds reset each cycle, so the threshold could never accumulate there.
  var chaosReactionTag = '';
  if (iDialState >= 0) {
    var dc = deserialize_(parseDialState_(row[iDialState] || ''));
    accrueChaos_(dc, outcome.severity, vehicle.name, cycle);
    var reaction = applyChaosReaction_(dc);
    if (reaction) chaosReactionTag = '|' + reaction.tags[0];  // chaos:wary | chaos:trauma
    row[iDialState] = serializeDialState_(dc);
    rows[target.rowIndex] = row;
  }

  // engine.67 step 8 (S325, Mike doctrine: chaos vehicles are crisis IGNITERS —
  // "each has a generator to attach to"). High-severity medical outcomes enter
  // the REAL health lifecycle: Status flips, and generationalEventsEngine's
  // health transitions, runCareerEngine's income hit, and runHouseholdEngine's
  // hospital-strain pool all take over next phases — the crisis changes the
  // citizen's running life-state instead of just being remembered. Guard:
  // only active/recovering/blank transition (a retiree keeps 'retired' —
  // overwriting it would resurrect their career at discharge; they keep the
  // texture line only). Arrest + OARI interventions surface as storyHooks.
  var iStatusW = ctx.ledger.headers.indexOf('Status');
  var iStatusStartW = ctx.ledger.headers.indexOf('StatusStartCycle');
  var iHealthCauseW = ctx.ledger.headers.indexOf('HealthCause');
  var curStatusW = iStatusW >= 0 ? String(row[iStatusW] || '').trim().toLowerCase() : '';
  var newStatusW = '';
  if (vehicle.name === 'ambulance' && outcome.outcome === 'medical_emergency') newStatusW = 'critical';
  else if (vehicle.name === 'ambulance' && outcome.outcome === 'workplace_accident') newStatusW = 'hospitalized';
  var S8 = ctx.summary || (ctx.summary = {});
  if (!S8.storyHooks) S8.storyHooks = [];
  var hookName8 = ((iFirst >= 0 ? row[iFirst] : '') + ' ' + (iLast >= 0 ? row[iLast] : '')).toString().trim();
  var hookHood8 = iNb >= 0 ? (row[iNb] || '') : (target.neighborhood || '');
  if (newStatusW && iStatusW >= 0 && (curStatusW === '' || curStatusW === 'active' || curStatusW === 'recovering')) {
    row[iStatusW] = newStatusW;
    if (iStatusStartW >= 0) row[iStatusStartW] = cycle;
    // S325 sweep catch: HealthCause feeds citizen-facing death prose verbatim
    // ("complications from <cause>") and a non-empty value excludes the citizen
    // from the Media-Room cause queue — so write HUMAN prose, not the machine
    // tag. Provenance stays in the LifeHistory line + chaos_cars source row.
    if (iHealthCauseW >= 0 && !row[iHealthCauseW]) {
      row[iHealthCauseW] = (outcome.outcome === 'workplace_accident') ? 'a workplace accident' : 'a sudden medical emergency';
    }
    rows[target.rowIndex] = row;
    S8.storyHooks.push({
      hookType: 'CITIZEN_HOSPITALIZED', severity: 6, priority: 5,
      description: hookName8 + ' — ' + text,
      cycleGenerated: cycle, neighborhood: hookHood8, domain: 'HEALTH', text: text
    });
  }
  if (outcome.outcome === 'arrested') {
    S8.storyHooks.push({
      hookType: 'CITIZEN_ARRESTED', severity: 6, priority: 5,
      description: hookName8 + ' — ' + text,
      cycleGenerated: cycle, neighborhood: hookHood8, domain: 'SAFETY', text: text
    });
  }
  if (vehicle.name === 'oari_van' && (outcome.outcome === 'deescalated' || outcome.outcome === 'substance_intervention')) {
    S8.storyHooks.push({
      hookType: 'OARI_INTERVENTION', severity: 5, priority: 4,
      description: hookName8 + ' — ' + text,
      cycleGenerated: cycle, neighborhood: hookHood8, domain: 'CIVIC', text: text
    });
  }

  // LifeHistory_Log archive row — live 7-col schema. EventTag = "{DialTag}|chaos_cars|{vehicle}"
  // (+ chaos:wary/chaos:trauma when this hit triggered a fresh break — legible provenance).
  // (PrimaryTag is the real DIAL_MAP tag; chaos_cars + vehicle are provenance.)
  var name = ((iFirst >= 0 ? row[iFirst] : '') + ' ' + (iLast >= 0 ? row[iLast] : '')).toString().trim();
  var eventTag = dialTag + '|chaos_cars|' + vehicle.name + chaosReactionTag;
  queueAppendIntent_(ctx, 'LifeHistory_Log',
    [inWorldStamp_(ctx), (iPop >= 0 ? row[iPop] : target.popId), name, eventTag, text,
      (iNb >= 0 ? (row[iNb] || '') : target.neighborhood), cycle],
    'chaos_cars citizen event', 'chaos');
}

// T3.9 — business: accumulate per (bizId,column) so multiple same-cycle hits on one business
// sum into ONE cell intent (avoids within-cycle cell-intent collision / last-write-wins).
// Flushed by flushBusinessFold_. Cross-cycle decay is applyChaosDecay_'s job (Phase 5).
function accumulateBusinessEvent_(ctx, target, impacts, magnitudesByColumn) {
  if (!ctx.summary.chaosBusinessFold) ctx.summary.chaosBusinessFold = {};
  var biz = loadBusinessRows_(ctx);
  var fold = ctx.summary.chaosBusinessFold;
  for (var i = 0; i < impacts.length; i++) {
    var m = impacts[i];
    var colIdx = (m.column === 'Annual_Revenue') ? biz.iRevenue
      : (m.column === 'Employee_Count') ? biz.iEmployees : -1;
    if (colIdx < 0) {
      throw new Error('chaos_cars: Business_Ledger trimmed header lookup missed "' + m.column +
        '" — write would silently drop. Check header whitespace.');
    }
    var key = target.bizId + '::' + m.column;
    if (!fold[key]) {
      // Base from current cell; Number('  ') === 0 handles the empty/whitespace cells.
      var cur = Number(biz.rows[target.rowIndex][colIdx]) || 0;
      fold[key] = { sheetRow: target.sheetRow, col1: colIdx + 1, base: cur, delta: 0, column: m.column };
    }
    fold[key].delta += (magnitudesByColumn[m.column] || 0);
  }
}

function flushBusinessFold_(ctx) {
  var fold = ctx.summary.chaosBusinessFold;
  if (!fold) return 0;
  var n = 0;
  for (var key in fold) {
    if (!fold.hasOwnProperty(key)) continue;
    var f = fold[key];
    var val = Math.round((f.base + f.delta) * 100) / 100;
    if (f.column === 'Employee_Count') val = Math.max(0, Math.round(val)); // headcount is a non-negative int
    queueCellIntent_(ctx, 'Business_Ledger', f.sheetRow, f.col1, val, 'chaos_cars business event', 'chaos');
    n++;
  }
  return n;
}

// T3.10 — neighborhood: accumulate the swing into the off-sheet residual. The Phase-10
// writer (v3NeighborhoodWriter saveV3NeighborhoodMap_) consumes ctx.summary.chaosNeighborhoodFold
// additively alongside S.neighborhoodPulse and decays it in place (residual can't be read back
// from the rebuilt sheet). NO column write here — that is reverted by executePersistIntents_
// (T1.5). Targets the 4 citizen-movable cols only; NoiseIndex dropped (zero readers).
function accumulateNeighborhoodFold_(ctx, hood, impacts, magnitudesByColumn) {
  if (!hood) return;
  if (!ctx.summary.chaosNeighborhoodFold) ctx.summary.chaosNeighborhoodFold = {};
  var fold = ctx.summary.chaosNeighborhoodFold;
  if (!fold[hood]) fold[hood] = {};
  for (var i = 0; i < impacts.length; i++) {
    var col = impacts[i].column;
    fold[hood][col] = (fold[hood][col] || 0) + (magnitudesByColumn[col] || 0);
  }
}

// ── neighborhood residual persistence (T3.10 cross-cycle, S265 verify-fix) ────
// ctx.summary is rebuilt every cycle, and Neighborhood_Map is replaced wholesale by the
// Phase-10 writer, so the residual can't be read back from the sheet (§S265). It persists
// in PropertiesService (the established T8 PREV_EVENING_JSON pattern), keyed per hood per
// column — which also fixes the multi-impact secondary-loss (Chaos_Cars stores only the
// primary metric, but the live residual here holds ALL columns). Run AFTER the generator
// (Phase 4) and BEFORE the Phase-10 writer: load prior → decay one step → add this cycle's
// fresh swings → hand the total to the writer (ctx.summary.chaosNeighborhoodFold) → persist.
// CAVEAT (same as business decay): persistence makes this non-idempotent on a re-run.

var CHAOS_NBHD_STORE_KEY = 'CHAOS_NBHD_FOLD_JSON';

function readChaosNeighborhoodStore_() {
  try {
    if (typeof PropertiesService === 'undefined') return {};
    var json = PropertiesService.getScriptProperties().getProperty(CHAOS_NBHD_STORE_KEY);
    return json ? JSON.parse(json) : {};
  } catch (e) { return {}; }
}

function writeChaosNeighborhoodStore_(fold) {
  try {
    if (typeof PropertiesService === 'undefined') return;
    PropertiesService.getScriptProperties().setProperty(CHAOS_NBHD_STORE_KEY, JSON.stringify(fold || {}));
  } catch (e) { /* best-effort persistence; a write failure just resets the residual */ }
}

function resolveChaosNeighborhoodFold_(ctx) {
  function r2(n) { return Math.round(n * 100) / 100; }
  var prior = readChaosNeighborhoodStore_();
  var fresh = (ctx.summary && ctx.summary.chaosNeighborhoodFold) || {};
  var merged = {};

  // decay last cycle's residual one step (per-column asymmetric, snap-to-zero)
  for (var h in prior) {
    if (!prior.hasOwnProperty(h)) continue;
    for (var c in prior[h]) {
      if (!prior[h].hasOwnProperty(c)) continue;
      var decayed = chaosDecayResidualOneCycle_(prior[h][c], c);
      if (decayed !== 0) { if (!merged[h]) merged[h] = {}; merged[h][c] = decayed; }
    }
  }
  // add this cycle's fresh swings (full magnitude — not yet decayed)
  for (var h2 in fresh) {
    if (!fresh.hasOwnProperty(h2)) continue;
    for (var c2 in fresh[h2]) {
      if (!fresh[h2].hasOwnProperty(c2)) continue;
      if (!merged[h2]) merged[h2] = {};
      var v = r2((merged[h2][c2] || 0) + fresh[h2][c2]);
      if (v === 0) delete merged[h2][c2]; else merged[h2][c2] = v;
    }
  }
  // prune empty hoods
  for (var h3 in merged) {
    if (merged.hasOwnProperty(h3)) {
      var any = false;
      for (var k in merged[h3]) if (merged[h3].hasOwnProperty(k)) { any = true; break; }
      if (!any) delete merged[h3];
    }
  }

  ctx.summary.chaosNeighborhoodFold = merged; // total residual the Phase-10 writer folds
  writeChaosNeighborhoodStore_(merged);       // persist for next cycle
  return merged;
}

// ── orchestrator (T3.12 + T5.1) ──────────────────────────────────────────────

function pickTargetByScope_(rng, ctx, scope) {
  if (scope === 'citizen') return pickCitizenTarget_(rng, ctx);
  if (scope === 'business') return pickBusinessTarget_(rng, ctx);
  if (scope === 'neighborhood') return pickNeighborhoodTarget_(rng, ctx);
  return null;
}

function runChaosCarsEngine_(ctx) {
  if (typeof ctx.rng !== 'function') {
    throw new Error('chaos_cars: ctx.rng required (deterministic runs — engine.md, no Math.random).');
  }
  validateAllChaosConfigs_(); // config-load-time no-death + scale + weight gate
  var rng = ctx.rng;
  var configs = loadChaosCarsConfig_();
  // S271 G-EC31: live engine sets ctx.summary.cycleId / ctx.config.cycleCount (set Phase1-AdvanceTime,
  // before Phase4-ChaosCars), NOT ctx.cycle — old read fell through to 0 on the live path. Match the
  // proven worldEventsEngine_ idiom; keep ctx.cycle last so the ctx.cycle-based test fixtures still pass.
  var cycle = (ctx.summary && (ctx.summary.absoluteCycle || ctx.summary.cycleId)) ||
    (ctx.config && ctx.config.cycleCount) || ctx.cycle || (ctx.summary && ctx.summary.cycle) || 0;

  if (!ctx.summary.chaosCarsEvents) ctx.summary.chaosCarsEvents = [];
  if (!ctx.summary.tier1ChaosEvents) ctx.summary.tier1ChaosEvents = [];
  var friction = [];

  var n = pickEventCount_(rng);
  for (var i = 0; i < n; i++) {
    var vehicle = pickVehicle_(rng, configs);
    var scope = pickFromArrayChaos_(rng, vehicle.scopes);
    var target = pickTargetByScope_(rng, ctx, scope);
    if (!target) { friction.push('event ' + i + ': empty target pool for scope ' + scope + ' (vehicle ' + vehicle.name + ')'); continue; }

    var outcome = rollOutcome_(rng, vehicle, scope, target); // engine.67 step 8: target-aware
    if (!outcome) { friction.push('event ' + i + ': ' + vehicle.name + ' has no citizen-taggable outcome for scope ' + scope); continue; }
    var impacts = impactsForScope_(vehicle, scope, outcome.outcome);

    // Sample one magnitude per impacted column (a vehicle may move >1 column for a scope).
    var magnitudesByColumn = {};
    var primaryMetric = '';
    var primaryMagnitude = 0;
    for (var k = 0; k < impacts.length; k++) {
      var mag = sampleMagnitude_(rng, impacts[k]);
      magnitudesByColumn[impacts[k].column] = mag;
      if (k === 0) { primaryMetric = impacts[k].column; primaryMagnitude = mag; }
    }

    var text = chaosEventText_(vehicle, outcome, target, scope);

    // Tier-1 cascade flag (T5.1): citizen-scope + Tier-1 + high-severity outcome.
    var consequenceFloorFired = false;
    if (scope === 'citizen' && target.tier === 1 && outcome.severity === 'high') {
      consequenceFloorFired = true;
    }

    // Writeback by scope.
    if (scope === 'citizen') {
      writeCitizenEvent_(ctx, target, vehicle, outcome, cycle, text);
      primaryMetric = outcome.lifeHistoryTag; // citizen "metric" = the dial tag (provenance)
      primaryMagnitude = 0;
    } else if (scope === 'business') {
      accumulateBusinessEvent_(ctx, target, impacts, magnitudesByColumn);
    } else if (scope === 'neighborhood') {
      accumulateNeighborhoodFold_(ctx, target.neighborhood, impacts, magnitudesByColumn);
    }

    // chaos_cars source row FIRST (§Hard Constraints — canonical, scope writeback derived).
    var payload = {
      cycleId: cycle,
      eventId: chaosEventId_(rng),
      vehicleType: vehicle.name,
      targetScope: scope,
      targetId: (scope === 'citizen') ? target.popId : (scope === 'business') ? target.bizId : target.neighborhood,
      targetTier: (scope === 'citizen') ? target.tier : null,
      diceOutcome: outcome.outcome,
      primaryMetric: primaryMetric,
      metricMagnitude: primaryMagnitude,
      consequenceFloorFired: consequenceFloorFired,
      narrativeSeed: outcome.narrativeSeed || '',
      coverageContribution: outcome.coverageContribution === true
    };
    if (typeof writeChaosCarsRow_ === 'function') writeChaosCarsRow_(ctx, payload);
    ctx.summary.chaosCarsEvents.push(payload);
    if (consequenceFloorFired) ctx.summary.tier1ChaosEvents.push(payload);

    // V2-5 (S326): consequence-class chaos hit → story surface. Solo-major
    // magnitude (0.05) — a hospitalization or arrest IS a story. Event-level,
    // not conditional on the status flip (a retiree's medical emergency is
    // still the neighborhood's news even though their Status stays 'retired').
    if (scope === 'citizen' && CHAOS_RIPPLE_OUTCOMES[outcome.outcome] &&
        typeof recordRipple_ === 'function') {
      recordRipple_(ctx, {
        causeType: 'chaos-event',
        causeId: payload.eventId,
        causeDetail: text,
        effectType: outcome.outcome,
        targetScope: 'citizen',
        targetIds: [target.popId],
        neighborhood: target.neighborhood || '',
        magnitude: 0.05,
        duration: 1,
        sourceEngine: 'chaosCarsEngine'
      });
    }
  }

  var bizWrites = flushBusinessFold_(ctx);

  // T6.4 — friction log (ADR-0003). Empty file = clean run.
  writeChaosFrictionLog_(ctx, cycle, friction);

  Logger.log('runChaosCarsEngine_: ' + ctx.summary.chaosCarsEvents.length + ' events | ' +
    ctx.summary.tier1ChaosEvents.length + ' tier-1 | ' + bizWrites + ' business cell writes | ' +
    friction.length + ' friction');
  return {
    events: ctx.summary.chaosCarsEvents.length,
    tier1: ctx.summary.tier1ChaosEvents.length,
    businessWrites: bizWrites,
    friction: friction.length
  };
}

// Human-facing event text for col O / LifeHistory_Log / desk packets.
function chaosEventText_(vehicle, outcome, target, scope) {
  var readable = outcome.outcome.replace(/_/g, ' ');
  if (scope === 'neighborhood') return vehicle.displayName + ': ' + readable + ' in ' + target.neighborhood + '.';
  if (scope === 'business') return vehicle.displayName + ': ' + readable + '.';
  return vehicle.displayName + ': ' + readable + '.';
}

// T6.4 — friction log writer. In Apps Script there is no filesystem; the log accumulates
// onto ctx.summary.chaosFriction for a downstream Node consumer to persist (ADR-0003 path
// output/skill_friction/chaos_cars_engine_c{XX}.md). Empty array = clean run.
function writeChaosFrictionLog_(ctx, cycle, friction) {
  ctx.summary.chaosFriction = { cycle: cycle, entries: friction || [] };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CHAOS_MIN_EVENTS: CHAOS_MIN_EVENTS,
    CHAOS_MAX_EVENTS: CHAOS_MAX_EVENTS,
    pickEventCount_: pickEventCount_,
    pickVehicle_: pickVehicle_,
    rollOutcome_: rollOutcome_,
    sampleMagnitude_: sampleMagnitude_,
    impactsForScope_: impactsForScope_,
    weightedPickChaos_: weightedPickChaos_,
    pickFromArrayChaos_: pickFromArrayChaos_,
    chaosEventId_: chaosEventId_,
    resolveChaosNeighborhoodFold_: resolveChaosNeighborhoodFold_,
    writeCitizenEvent_: writeCitizenEvent_,
    runChaosCarsEngine_: runChaosCarsEngine_
  };
}
