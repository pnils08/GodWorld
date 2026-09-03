/**
 * applyBusinessDynamics.js — engine.96 Business Lifecycle Generator, Task 5 (S413).
 * Plan: docs/plans/2026-08-01-business-lifecycle-generator.md (builder-approved
 * 2026-08-01; the Task 3 formula and World_Config table signed off the same day).
 *
 * Every Business_Ledger row lives on a per-cycle economic trajectory: Growth_Rate
 * and Annual_Revenue drift from the cycle's EVENT MIX first (chaos incidents,
 * initiative landings, coverage sentiment), then the hood's retail vitality, then
 * success pressure and disruption shocks (27.10 — correction becomes likelier,
 * never guaranteed), then a small seeded noise. Tunables are World_Config keys
 * (ADR-0015; ensureEngine96Config_ self-arms them, the engine.133 contract), read
 * from ctx.config and asserted present — a missing key throws, never defaults.
 *
 * Writes: ONE range intent over the Annual_Revenue..Growth_Rate columns (adjacent
 * G:H on the live tab; two column intents if a copy ever separates them). A
 * per-cell intent would cost one setValue per cell (persistenceExecutor.js:347).
 * applyChaosDecay_'s same-cycle Annual_Revenue cell intents execute after this
 * range (priority 100 vs 90) and win on the few rows they touch — chaos decay is
 * a small revert; the drift resumes from the sheet value next cycle.
 *
 * State: the distress streak and the success window ride the carry-forward
 * (S.businessDynamicsState → PREV_CYCLE_STATE_JSON.businessDynamics, engine.122
 * two-layer store) instead of the plan's companion tab — no runtime tab creation
 * (engine.119), no schema commit; a blob reset rebuilds streaks from zero.
 *
 * Runs at Phase5-BusinessDynamics, BEFORE Phase5-Career (Task 6 will hand decline
 * records to S.careerSignals.businessDeltas, which runCareerEngine_ preserves when
 * it already exists). Task 6 (decline → layoff) and Task 7 (closure) are not in
 * this file yet; the streak state they need is.
 *
 * Deterministic: every draw is seedUnit_(cycle|BIZ_ID|salt) — no Math.random, no
 * wall-clock. Sector class = the SECTOR_ECON_SEEDS regex list from
 * scripts/ingestPublishedEntities.js, carried here because scripts/ never deploys.
 */

var BIZ_DYNAMICS_REQUIRED_KEYS = [
  'bizDriftMaxUp', 'bizDriftMaxDown', 'bizGrowthCeil', 'bizGrowthFloor', 'bizNoiseBound',
  'bizVitalityNeutral', 'bizVitalityGain', 'bizSuccessWindow', 'bizSuccessVitalityHigh',
  'bizSuccessApprovalHigh', 'bizSuccessPenalty', 'bizDisruptBaseChance', 'bizDisruptSuccessMult',
  'bizDisruptShock', 'bizClosureStreak', 'bizClosureRevenueFloorPct', 'bizEventShockScale',
  'bizVol_faith', 'bizVol_retail', 'bizVol_food', 'bizVol_health', 'bizVol_tech',
  'bizVol_professional', 'bizVol_construction', 'bizVol_arts', 'bizVol_education', 'bizVol_default'
];

// scripts/ingestPublishedEntities.js SECTOR_ECON_SEEDS — the 9 classes, same order
// (retail before food: "Retail & Food" is a shop, not a kitchen).
var BIZ_SECTOR_CLASSES = [
  ['faith', /faith|church|temple|mosque|synagogue|congregation|ministry|parish/i],
  ['retail', /retail|shop|store|boutique|grocery/i],
  ['food', /cafe|coffee|bakery|restaurant|dining|diner|food|bar\b|pub|brewery|lounge|nightlife|club|market/i],
  ['health', /clinic|health|medical|dental|care/i],
  ['tech', /tech|software|systems|data|lab|research|analytics|platform/i],
  ['professional', /architect|law|legal|consult|account|firm|agency|professional|insurance|finance/i],
  ['construction', /construction|contractor|builder/i],
  ['arts', /gallery|theater|theatre|studio|music|venue|arts|entertainment|media|journal/i],
  ['education', /school|education|academy|tutoring/i]
];

function bizSectorClass_(sector) {
  var s = String(sector || '');
  for (var i = 0; i < BIZ_SECTOR_CLASSES.length; i++) {
    if (BIZ_SECTOR_CLASSES[i][1].test(s)) return BIZ_SECTOR_CLASSES[i][0];
  }
  return 'default';
}

// Growth_Rate cells are whole percents; a few authored cells read "15%". Blank → 0.
function bizParseGrowth_(v) {
  if (v === '' || v === null || v === undefined) return 0;
  var n = parseFloat(String(v).replace(/[%\s,]/g, ''));
  return isNaN(n) ? 0 : n;
}
function bizParseRevenue_(v) {
  if (v === '' || v === null || v === undefined) return null;
  var n = Number(String(v).replace(/[$,\s]/g, ''));
  return isNaN(n) ? null : n;
}

function bizDynamicsConfig_(ctx) {
  var cfg = (ctx && ctx.config) || {};
  var out = {}, missing = [];
  for (var i = 0; i < BIZ_DYNAMICS_REQUIRED_KEYS.length; i++) {
    var k = BIZ_DYNAMICS_REQUIRED_KEYS[i];
    var v = cfg[k];
    if (v === undefined || v === null || v === '' || isNaN(Number(v))) missing.push(k);
    else out[k] = Number(v);
  }
  if (missing.length) throw new Error('applyBusinessDynamics_: World_Config missing ' + missing.join(', ') + ' (engine.96 keys — ensureEngine96Config_ self-arms them at open)');
  return out;
}

// The mayor's standing approval — Civic_Office_Ledger, first MAYOR* office. null when unreadable.
function bizMayorApproval_(ctx) {
  try {
    var sheet = ctx.ss ? ctx.ss.getSheetByName('Civic_Office_Ledger') : null;
    if (!sheet) return null;
    var v = sheet.getDataRange().getValues();
    if (!v || v.length < 2) return null;
    var h = v[0], iOff = -1, iAppr = -1;
    for (var c = 0; c < h.length; c++) {
      var hn = String(h[c]).trim().toLowerCase();
      if (hn === 'officeid') iOff = c;
      else if (hn === 'approval') iAppr = c;
    }
    if (iOff < 0 || iAppr < 0) return null;
    for (var r = 1; r < v.length; r++) {
      if (String(v[r][iOff] || '').toUpperCase().indexOf('MAYOR') === 0) {
        var a = Number(v[r][iAppr]);
        return isNaN(a) ? null : a;
      }
    }
  } catch (e) { Logger.log('bizMayorApproval_: ' + e.message); }
  return null;
}

function bizClamp_(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// Pure: one business, one cycle. Returns { growth, revenue, drift, streak, win, disrupted, parts }.
function bizDriftOne_(cfg, biz, prevState, inputs, cycle) {
  var cls = bizSectorClass_(biz.sector);
  var vol = cfg['bizVol_' + cls];
  if (vol === undefined) vol = cfg.bizVol_default;
  var scale = cfg.bizEventShockScale;

  // 1. events — the signal
  var ev = 0;
  if (inputs.chaosAtBusiness) ev -= scale;
  if (inputs.chaosInHood) ev -= scale;
  if (inputs.initiativeInHood) ev += scale;
  if (inputs.coverageSentiment > 0) ev += 0.5 * scale;
  else if (inputs.coverageSentiment < 0) ev -= 0.5 * scale;
  ev = bizClamp_(ev, -2.0, 2.0);

  // 2. ambient — hood retail vitality (null = no profile, no term)
  var vit = inputs.vitality;
  var vitMod = (vit === null || vit === undefined || isNaN(vit)) ? 0 :
    bizClamp_((vit - cfg.bizVitalityNeutral) * cfg.bizVitalityGain, -0.5, 0.5);

  // 3. success pressure — sustained prosperity + golden-era approval (27.10)
  var prosperous = vit !== null && vit !== undefined && !isNaN(vit) && vit >= cfg.bizSuccessVitalityHigh &&
    inputs.mayorApproval !== null && inputs.mayorApproval !== undefined && inputs.mayorApproval >= cfg.bizSuccessApprovalHigh;
  var win = prosperous ? (Number(prevState.win) || 0) + 1 : 0;
  var windowActive = win >= cfg.bizSuccessWindow;
  var pressure = windowActive ? -cfg.bizSuccessPenalty : 0;

  // 4. disruption — a seeded draw, likelier under the success window, never certain
  var chance = cfg.bizDisruptBaseChance / 100 * (windowActive ? cfg.bizDisruptSuccessMult : 1);
  var disrupted = seedUnit_(cycle + '|' + biz.id + '|disrupt') < chance;
  var shock = disrupted ? -cfg.bizDisruptShock : 0;

  // 5. noise — texture only
  var noise = (seedUnit_(cycle + '|' + biz.id + '|noise') * 2 - 1) * cfg.bizNoiseBound;

  var drift = bizClamp_((ev + vitMod + pressure + shock + noise) * vol, -cfg.bizDriftMaxDown, cfg.bizDriftMaxUp);
  var growth = Math.round(bizClamp_(biz.growth + drift, cfg.bizGrowthFloor, cfg.bizGrowthCeil) * 100) / 100;
  var revenue = biz.revenue === null ? null : Math.round(biz.revenue * (1 + growth / 100 / 52));
  var streak = growth < 0 ? (Number(prevState.streak) || 0) + 1 : 0;
  return { growth: growth, revenue: revenue, drift: drift, streak: streak, win: win, disrupted: disrupted, cls: cls,
    parts: { ev: ev, vit: vitMod, pressure: pressure, shock: shock, noise: noise } };
}

function applyBusinessDynamics_(ctx) {
  var S = ctx.summary;
  var cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;
  var out = { rows: 0, drifted: 0, distressed: 0, disrupted: 0, successWindows: 0, blankRevenue: 0 };
  var cfg = bizDynamicsConfig_(ctx);

  var sheet = ctx.ss ? ctx.ss.getSheetByName('Business_Ledger') : null;
  if (!sheet) throw new Error('applyBusinessDynamics_: Business_Ledger not found');
  var bl = sheet.getDataRange().getValues();
  if (!bl || bl.length < 2) { S.businessDynamicsState = {}; return out; }
  var bh = bl[0];
  var col = function(name) { for (var c = 0; c < bh.length; c++) if (String(bh[c]).trim() === name) return c; return -1; };
  var iId = col('BIZ_ID'), iSec = col('Sector'), iHood = col('Neighborhood'), iRev = col('Annual_Revenue'), iGrow = col('Growth_Rate');
  if (iId < 0 || iSec < 0 || iHood < 0 || iRev < 0 || iGrow < 0) {
    throw new Error('applyBusinessDynamics_: Business_Ledger missing one of BIZ_ID/Sector/Neighborhood/Annual_Revenue/Growth_Rate (trimmed)');
  }

  var prev = (S.previousCycleState && S.previousCycleState.businessDynamics) || {};
  var ns = S.neighborhoodState || {};
  var mayorApproval = bizMayorApproval_(ctx);
  var chaosBiz = S.chaosBusinessFold || {};
  var chaosHood = S.chaosNeighborhoodFold || {};
  var initHood = S.initiativeNeighborhoodEffects || {};
  var coverage = Number(S.editionSentimentBoost) || 0; // city-level until per-business coverage has a reader

  var chaosBizIds = {};
  for (var ck in chaosBiz) { if (chaosBiz.hasOwnProperty(ck)) chaosBizIds[String(ck).split('::')[0]] = true; }

  var state = {};
  var revCol = [], growCol = [];
  for (var r = 1; r < bl.length; r++) {
    var row = bl[r];
    var id = String(row[iId] || '').trim();
    var hood = String(row[iHood] || '').trim();
    var biz = { id: id, sector: row[iSec], hood: hood, growth: bizParseGrowth_(row[iGrow]), revenue: bizParseRevenue_(row[iRev]) };
    if (!id) { revCol.push([row[iRev]]); growCol.push([row[iGrow]]); continue; } // untouched
    var ps = prev[id] ? { streak: prev[id][0], win: prev[id][1] } : { streak: 0, win: 0 };
    var hs = ns[hood];
    var inputs = {
      chaosAtBusiness: !!chaosBizIds[id],
      chaosInHood: !!(hood && chaosHood[hood]),
      initiativeInHood: !!(hood && initHood[hood]),
      coverageSentiment: coverage,
      vitality: hs && hs.retailVitality !== undefined ? hs.retailVitality : null,
      mayorApproval: mayorApproval
    };
    var d = bizDriftOne_(cfg, biz, ps, inputs, cycle);
    out.rows++;
    if (d.drift !== 0) out.drifted++;
    if (d.streak > 0) out.distressed++;
    if (d.disrupted) out.disrupted++;
    if (d.win >= cfg.bizSuccessWindow) out.successWindows++;
    if (d.revenue === null) out.blankRevenue++;
    if (d.streak || d.win) state[id] = [d.streak, d.win];
    revCol.push([d.revenue === null ? row[iRev] : d.revenue]);
    growCol.push([d.growth]);
  }

  var n = bl.length - 1;
  if (iGrow === iRev + 1) {
    var both = [];
    for (var k = 0; k < n; k++) both.push([revCol[k][0], growCol[k][0]]);
    queueRangeIntent_(ctx, 'Business_Ledger', 2, iRev + 1, both, 'engine.96 business dynamics drift (Annual_Revenue, Growth_Rate)', 'economy', 90);
  } else {
    queueRangeIntent_(ctx, 'Business_Ledger', 2, iRev + 1, revCol, 'engine.96 business dynamics drift (Annual_Revenue)', 'economy', 90);
    queueRangeIntent_(ctx, 'Business_Ledger', 2, iGrow + 1, growCol, 'engine.96 business dynamics drift (Growth_Rate)', 'economy', 90);
  }
  S.businessDynamicsState = state; // finalizeCycleState carries it as businessDynamics
  Logger.log('applyBusinessDynamics_ engine.96: ' + out.rows + ' businesses, ' + out.drifted + ' drifted, ' +
    out.distressed + ' in distress, ' + out.disrupted + ' disrupted, ' + out.successWindows + ' under success pressure, mayor ' + mayorApproval);
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BIZ_DYNAMICS_REQUIRED_KEYS: BIZ_DYNAMICS_REQUIRED_KEYS,
    bizSectorClass_: bizSectorClass_,
    bizParseGrowth_: bizParseGrowth_,
    bizParseRevenue_: bizParseRevenue_,
    bizDynamicsConfig_: bizDynamicsConfig_,
    bizDriftOne_: bizDriftOne_,
    applyBusinessDynamics_: applyBusinessDynamics_
  };
}
