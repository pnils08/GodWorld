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
 * Runs at Phase5-BusinessDynamics, BEFORE Phase5-Career.
 * Task 6 (S413): a distress streak past bizDeclineStreak sheds (streak − D)
 * tracked-equivalents per cycle as S.businessDeclines[BIZ_ID] — runCareerEngine_
 * folds them into S.careerSignals.businessDeltas[id].lost right after its own
 * init, so Half 1 lowers the stated Employee_Count by intent and Half 2 fires
 * tracked workers, ≤2 per business per cycle, income cut, Career-Layoff logged —
 * the existing machine, unchanged (Task 1's contract).
 * Task 7 (S413): closure = streak ≥ bizClosureStreak AND Annual_Revenue below
 * bizClosureRevenueFloorPct % of the sector's mint median. A closed business is
 * a WIND-DOWN, not a deletion: Growth_Rate pins at the floor, it never hires, it
 * sheds its whole stated headcount every cycle (Half 2's rate limit paces the
 * firings — a 20-person shop closes over ten cycles, every worker a lived
 * layoff), and a worldEvents closure event fires once. When stated = 0 and no
 * tracked worker remains, Phase11-BusinessArchive (archiveClosedBusinesses_,
 * below) copies the committed row + exit metadata to Business_Archive, reads it
 * back by BIZ_ID, then removes the active row — the citizen-archive protocol,
 * post-commit, direct-write carve-out (SHEETS_MANIFEST §9). BIZ-IDs are never
 * reissued (bizIdHighWater, S357).
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
  'bizVol_professional', 'bizVol_construction', 'bizVol_arts', 'bizVol_education', 'bizVol_default',
  'bizDeclineStreak' // Task 6 (S413): distress cycles before shedding starts — not in the signed table; proposed 4, half the closure streak
];

// The class mint table — the engine copy of scripts/ingestPublishedEntities.js
// SECTOR_ECON_SEEDS (engine.85 Task 8, S336): what a business of each class IS
// at birth. Every engine-side minter reads it (engine.96 Task 11); the Node
// minters read the scripts copy. Same numbers, two runtimes.
var BIZ_CLASS_MINT = {
  faith:        { emp: 8,  sal: 52000,  rev: 600000,  growth: 2 },
  retail:       { emp: 4,  sal: 42000,  rev: 380000,  growth: 2 },
  food:         { emp: 11, sal: 48000,  rev: 720000,  growth: 3 },
  health:       { emp: 38, sal: 85000,  rev: 4000000, growth: 3 },
  tech:         { emp: 45, sal: 120000, rev: 9000000, growth: 8 },
  professional: { emp: 26, sal: 95000,  rev: 6200000, growth: 4 },
  construction: { emp: 30, sal: 80000,  rev: 8000000, growth: 5 },
  arts:         { emp: 9,  sal: 55000,  rev: 800000,  growth: 3 },
  education:    { emp: 15, sal: 62000,  rev: 1200000, growth: 2 },
  'default':    { emp: 6,  sal: 45000,  rev: 500000,  growth: 2 }
};
// Sector mint medians — the closure floor's denominator (derived, one source)
var BIZ_CLASS_MINT_REVENUE = (function () { var o = {}; for (var k in BIZ_CLASS_MINT) if (BIZ_CLASS_MINT.hasOwnProperty(k)) o[k] = BIZ_CLASS_MINT[k].rev; return o; })();

// engine.96 Task 11 (S413): a citizen's FIELD (the hiring category a SkillTag
// resolves to) → the class a business in that field is, the name it takes, and
// the Sector label it carries (one sectorCategory_ round-trips back to the field).
var BIZ_FIELD_BIRTH = {
  'Creative & Arts':          { cls: 'arts',         suffix: 'Studio',     sector: 'Arts & Media' },
  'Tech & Innovation':        { cls: 'tech',         suffix: 'Systems',    sector: 'Tech' },
  'Professional':             { cls: 'professional', suffix: '& Co.',      sector: 'Professional Services' },
  'Education':                { cls: 'education',    suffix: 'Academy',    sector: 'Education' },
  'Healthcare':               { cls: 'health',       suffix: 'Clinic',     sector: 'Healthcare' },
  'Construction & Baylight':  { cls: 'construction', suffix: 'Builders',   sector: 'Construction' },
  'Port & Labor':             { cls: 'construction', suffix: 'Freight',    sector: 'Port & Logistics' },
  'Transit & Infrastructure': { cls: 'construction', suffix: 'Works',      sector: 'Infrastructure' },
  'Faith & Community':        { cls: 'faith',        suffix: 'Fellowship', sector: 'Community Organization' },
  'Food & Culture':           { cls: 'food',         suffix: 'Kitchen',    sector: 'Restaurant & Dining' },
  'Small Business':           { cls: 'retail',       suffix: 'Mercantile', sector: 'Retail' },
  'Government & Civic':       { cls: 'professional', suffix: 'Advisory',   sector: 'Civic Affairs' }
};

// The field a citizen row stands in: every SkillTags token through
// skillTagField_ (both truths; athlete/coach/scout → nothing), else the role.
function bizRowFields_(row, iTags, iRole) {
  var out = [];
  var tags = iTags >= 0 ? String(row[iTags] || '').split('|') : [];
  for (var t = 0; t < tags.length; t++) {
    var f = (typeof skillTagField_ === 'function') ? skillTagField_(tags[t]) : null;
    if (f && out.indexOf(f) < 0) out.push(f);
  }
  if (!out.length && iRole >= 0 && typeof roleFieldOf_ === 'function') {
    var rf = roleFieldOf_(row[iRole]);
    var rff = rf && typeof skillTagField_ === 'function' ? skillTagField_(rf) : null;
    if (rff) out.push(rff);
  }
  return out;
}

// The hood's most common business field on the Business_Ledger (the fallback
// for a line with no field of its own). null when the hood has no rows.
function bizHoodField_(ctx, hood) {
  if (!hood) return null;
  ctx._bizHoodField96 = ctx._bizHoodField96 || {};
  if (ctx._bizHoodField96.hasOwnProperty(hood)) return ctx._bizHoodField96[hood];
  var best = null;
  try {
    var sheet = ctx.ss ? ctx.ss.getSheetByName('Business_Ledger') : null;
    var v = sheet ? sheet.getDataRange().getValues() : null;
    if (v && v.length > 1) {
      var h = v[0], iS = h.indexOf('Sector'), iH = h.indexOf('Neighborhood');
      var count = {};
      for (var r = 1; r < v.length && iS >= 0 && iH >= 0; r++) {
        if (String(v[r][iH] || '').trim() !== hood) continue;
        var cat = (typeof sectorCategory_ === 'function') ? sectorCategory_(v[r][iS], true) : null;
        if (!cat || !BIZ_FIELD_BIRTH[cat]) continue;
        count[cat] = (count[cat] || 0) + 1;
        if (best === null || count[cat] > count[best] || (count[cat] === count[best] && cat < best)) best = cat;
      }
    }
  } catch (e) { Logger.log('bizHoodField_: ' + e.message); }
  ctx._bizHoodField96[hood] = best;
  return best;
}

// The field a heritage line opens in: the most common field across its living
// members, a tie to the staker's own, else the staker's hood, else Small Business.
function heritageBusinessField_(ctx, memberRows, stakeRow, iTags, iRole, hood) {
  var tally = {};
  for (var m = 0; m < memberRows.length; m++) {
    var fs = bizRowFields_(memberRows[m], iTags, iRole);
    for (var f = 0; f < fs.length; f++) tally[fs[f]] = (tally[fs[f]] || 0) + 1;
  }
  var stakerFields = stakeRow ? bizRowFields_(stakeRow, iTags, iRole) : [];
  var best = null, bestN = 0;
  for (var k in tally) {
    if (!tally.hasOwnProperty(k) || !BIZ_FIELD_BIRTH[k]) continue;
    var n = tally[k];
    if (n > bestN || (n === bestN && stakerFields.indexOf(k) >= 0 && stakerFields.indexOf(best) < 0) || (n === bestN && stakerFields.indexOf(k) >= 0 === stakerFields.indexOf(best) >= 0 && k < best)) { best = k; bestN = n; }
  }
  if (best) return { field: best, source: 'family' };
  var hf = bizHoodField_(ctx, hood);
  if (hf) return { field: hf, source: 'hood' };
  return { field: 'Small Business', source: 'default' };
}

// What the business IS at birth: class sizes, capital capped at a year of the
// class's revenue (a start-up costs about a year of what it makes), revenue at
// birth = the capital. Pure.
function heritageBusinessBirth_(field, familyName, stakeNetWorth) {
  var spec = BIZ_FIELD_BIRTH[field] || BIZ_FIELD_BIRTH['Small Business'];
  var mint = BIZ_CLASS_MINT[spec.cls] || BIZ_CLASS_MINT['default'];
  var capital = Math.max(50000, Math.min(Math.round((Number(stakeNetWorth) || 0) * 0.2), mint.rev));
  return { name: String(familyName) + ' ' + spec.suffix, sector: spec.sector, cls: spec.cls,
    emp: mint.emp, sal: mint.sal, revenue: capital, growth: mint.growth, capital: capital };
}


var BIZ_ARCHIVE_HEADERS = ['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count', 'Avg_Salary', 'Annual_Revenue', 'Growth_Rate', 'Key_Personnel', 'ArchiveReason', 'ExitCycle', 'SourceEventId', 'ClosedCycle'];

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
  var iCnt = col('Employee_Count'), iNm = col('Name');
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
  var declines = {}, closures = [];
  out.shed = 0; out.closed = 0; out.closing = 0;
  var revCol = [], growCol = [];
  for (var r = 1; r < bl.length; r++) {
    var row = bl[r];
    var id = String(row[iId] || '').trim();
    var hood = String(row[iHood] || '').trim();
    var biz = { id: id, sector: row[iSec], hood: hood, growth: bizParseGrowth_(row[iGrow]), revenue: bizParseRevenue_(row[iRev]) };
    if (!id) { revCol.push([row[iRev]]); growCol.push([row[iGrow]]); continue; } // untouched
    var ps = prev[id] ? { streak: prev[id][0], win: prev[id][1], closed: prev[id][2] || 0 } : { streak: 0, win: 0, closed: 0 };
    var stated = iCnt >= 0 ? (Number(row[iCnt]) || 0) : 0;
    if (ps.closed) {
      // Task 7: the wind-down — pinned at the floor, shedding everyone left, never reopening
      out.rows++; out.closing++;
      if (stated > 0) { declines[id] = stated; out.shed += stated; }
      state[id] = [Number(ps.streak) || 0, 0, ps.closed];
      closures.push({ id: id, name: String(iNm >= 0 ? row[iNm] : id), hood: hood, sector: String(row[iSec] || ''), closedCycle: ps.closed, stated: stated });
      revCol.push([biz.revenue === null ? row[iRev] : biz.revenue]);
      growCol.push([cfg.bizGrowthFloor]);
      continue;
    }
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
    // Task 7: closure — the streak AND the revenue floor, both (27.10)
    var cls = d.cls;
    var floorRev = (cfg.bizClosureRevenueFloorPct / 100) * (BIZ_CLASS_MINT_REVENUE[cls] || BIZ_CLASS_MINT_REVENUE['default']);
    var closesNow = d.streak >= cfg.bizClosureStreak && d.revenue !== null && d.revenue < floorRev;
    if (closesNow) {
      out.closed++;
      var bName = String(iNm >= 0 ? row[iNm] : id);
      if (stated > 0) { declines[id] = stated; out.shed += stated; }
      state[id] = [d.streak, 0, cycle];
      closures.push({ id: id, name: bName, hood: hood, sector: String(row[iSec] || ''), closedCycle: cycle, stated: stated });
      S.worldEvents = S.worldEvents || [];
      S.worldEvents.push({
        cycle: cycle, domain: 'COMMUNITY', subdomain: 'business-closure', neighborhood: hood,
        severity: stated >= 10 ? 'high' : 'medium',
        description: bName + ' is closing in ' + (hood || 'Oakland') + ' — ' + d.streak + (d.streak === 1 ? ' week' : ' weeks') + ' of decline and revenue under the line; ' + stated + ' jobs go with it',
        impactScore: stated >= 10 ? 40 : 25, source: 'ENGINE', timestamp: ctx.now, businessId: id
      });
      if (typeof queueEnsureTabIntent_ === 'function') {
        queueEnsureTabIntent_(ctx, 'Business_Archive', BIZ_ARCHIVE_HEADERS, 'engine.96 closure ledger (lazy tab, Phase-10 ensure)', 'economy', 25);
      }
      revCol.push([d.revenue === null ? row[iRev] : d.revenue]);
      growCol.push([cfg.bizGrowthFloor]);
      continue;
    }
    // Task 6: sustained decline sheds — (streak − D) tracked-equivalents per cycle, never past the stated count
    if (d.streak > cfg.bizDeclineStreak && stated > 0) {
      var shed = Math.min(stated, d.streak - cfg.bizDeclineStreak);
      if (shed > 0) { declines[id] = shed; out.shed += shed; }
    }
    if (d.streak || d.win) state[id] = [d.streak, d.win, 0];
    revCol.push([d.revenue === null ? row[iRev] : d.revenue]);
    growCol.push([d.growth]);
  }
  S.businessDeclines = declines;   // runCareerEngine_ folds these into careerSignals.businessDeltas[id].lost
  S.businessClosures = closures;   // archiveClosedBusinesses_ (Phase 11) reads these

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
    out.distressed + ' in distress, ' + out.disrupted + ' disrupted, ' + out.successWindows + ' under success pressure, ' +
    out.shed + ' shed, ' + out.closed + ' closing now, ' + out.closing + ' winding down, mayor ' + mayorApproval);
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// Phase11-BusinessArchive — engine.96 Task 7 (S413). Post-commit, direct-write
// carve-out (SHEETS_MANIFEST §9, class post-commit-archive): for every closed
// business whose committed row shows Employee_Count 0 and whose tracked workers
// are all gone (ctx.ledger after Phase10-CommitLedger), copy the row + exit
// metadata to Business_Archive, read it back by BIZ_ID, then remove the active
// row. A failed read-back leaves the source row intact. Business_Archive is never
// created here — the Phase-10 ensure intent queued at closure creates it.
// ════════════════════════════════════════════════════════════════════════════
function archiveClosedBusinesses_(ctx) {
  var S = ctx.summary;
  var out = { candidates: 0, archived: 0, waiting: 0, skipped: 0 };
  var closures = S.businessClosures || [];
  if (!closures.length) return out;
  var cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;
  var bl = ctx.ss ? ctx.ss.getSheetByName('Business_Ledger') : null;
  var ar = ctx.ss ? ctx.ss.getSheetByName('Business_Archive') : null;
  if (!bl) return out;
  if (!ar) { Logger.log('archiveClosedBusinesses_: Business_Archive absent (ensure intent lands next Phase 10) — ' + closures.length + ' waiting'); out.waiting = closures.length; return out; }
  var tracked = {};
  if (ctx.ledger && ctx.ledger.rows) {
    var h = ctx.ledger.headers, iEmp = h.indexOf('EmployerBizId'), iSt = h.indexOf('Status');
    for (var r = 0; r < ctx.ledger.rows.length && iEmp >= 0; r++) {
      var row = ctx.ledger.rows[r];
      if (!row) continue;
      if (iSt >= 0 && String(row[iSt] || 'active').toLowerCase() !== 'active') continue;
      var e = String(row[iEmp] || '').trim();
      if (e) tracked[e] = (tracked[e] || 0) + 1;
    }
  }
  var v = bl.getDataRange().getValues();
  var bh = v[0];
  var col = function(name) { for (var c = 0; c < bh.length; c++) if (String(bh[c]).trim() === name) return c; return -1; };
  var iId = col('BIZ_ID'), iCnt = col('Employee_Count');
  if (iId < 0) return out;
  var ah = ar.getDataRange().getValues()[0] || [];
  var aId = -1; for (var ac = 0; ac < ah.length; ac++) if (String(ah[ac]).trim() === 'BIZ_ID') aId = ac;
  if (aId < 0) { Logger.log('archiveClosedBusinesses_: Business_Archive has no BIZ_ID header'); return out; }
  // bottom-up so a removal never shifts a row still to be examined
  var byId = {};
  for (var q = 1; q < v.length; q++) byId[String(v[q][iId] || '').trim()] = q;
  var ids = closures.map(function(c) { return c.id; }).sort().reverse();
  for (var k = 0; k < ids.length; k++) {
    var id = ids[k];
    var q2 = byId[id];
    if (q2 === undefined) { out.skipped++; continue; }
    out.candidates++;
    var stated = iCnt >= 0 ? (Number(v[q2][iCnt]) || 0) : 0;
    if (stated > 0 || tracked[id]) { out.waiting++; continue; }
    var meta = null;
    for (var m = 0; m < closures.length; m++) if (closures[m].id === id) meta = closures[m];
    var rowOut = [];
    for (var c2 = 0; c2 < 9; c2++) rowOut.push(c2 < v[q2].length ? v[q2][c2] : '');
    rowOut.push('closed', cycle, 'engine.96:' + id + ':C' + cycle, meta ? meta.closedCycle : '');
    var target = ar.getLastRow() + 1;
    ar.getRange(target, 1, 1, rowOut.length).setValues([rowOut]);
    var back = ar.getRange(target, 1, 1, rowOut.length).getValues()[0];
    if (String(back[aId] || '').trim() !== id) { Logger.log('archiveClosedBusinesses_: read-back mismatch for ' + id + ' — source row kept'); out.skipped++; continue; }
    bl.deleteRow(q2 + 1);
    out.archived++;
    Logger.log('archiveClosedBusinesses_ engine.96: ' + id + ' archived (closed C' + (meta ? meta.closedCycle : '?') + ', removed C' + cycle + ')');
  }
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
    applyBusinessDynamics_: applyBusinessDynamics_,
    archiveClosedBusinesses_: archiveClosedBusinesses_,
    BIZ_ARCHIVE_HEADERS: BIZ_ARCHIVE_HEADERS,
    BIZ_CLASS_MINT_REVENUE: BIZ_CLASS_MINT_REVENUE,
    BIZ_CLASS_MINT: BIZ_CLASS_MINT,
    BIZ_FIELD_BIRTH: BIZ_FIELD_BIRTH,
    bizRowFields_: bizRowFields_,
    bizHoodField_: bizHoodField_,
    heritageBusinessField_: heritageBusinessField_,
    heritageBusinessBirth_: heritageBusinessBirth_
  };
}
