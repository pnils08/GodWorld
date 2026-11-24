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
 * This is the only Annual_Revenue writer in the engine: engine.193 (0848f7d3)
 * retired the chaos revenue cells that executed after this range (priority 100
 * vs 90) and replaced the week's revenue. Chaos reaches a business as a signed
 * event in the drift (chaosAtBusiness) and the ship as a carried offset.
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
  'bizCoverageUnit', 'bizVitalityGain', 'bizSuccessWindow', 'bizSuccessVitalityHigh',
  'bizSuccessApprovalHigh', 'bizSuccessPenalty', 'bizDisruptBaseChance', 'bizDisruptSuccessMult',
  'bizDisruptShock', 'bizClosureStreak', 'bizClosureRevenueFloorPct', 'bizEventShockScale',
  'bizVol_faith', 'bizVol_retail', 'bizVol_food', 'bizVol_health', 'bizVol_tech',
  'bizVol_professional', 'bizVol_construction', 'bizVol_arts', 'bizVol_education', 'bizVol_default',
  'bizInitiativeStallDrag', // engine.250: share of the event scale a failing initiative drains per Cycle (builder-ruled 0.5)
  'bizDeclineStreak', // Task 6 (S413): distress cycles before shedding starts — not in the signed table; proposed 4, half the closure streak
  'bizShipEchoShare', // engine.193 cut 3b: share of a ship episode's Growth_Rate offset felt by businesses off the port (builder default: small)
  'bizSportsWeekPp',  // engine.205 slice D: pp event a bar or restaurant takes from a full-strength game week
  'bizSettleRate',    // engine.193 (b): share of the gap to the class norm an institution's growth closes per Cycle
  'bizSettleMinStaff', // engine.193 (b): stated staff at which a business is an institution that settles (the big employers)
  // engine.356 (builder 2026-11-21): success stems from how the hood performs
  'bizHoodSpan', 'bizHoodPull', 'bizHoodMaxPp', 'bizEventCap', 'bizWeatherPp',
  'bizClassMiddle_arts', 'bizClassMiddle_construction', 'bizClassMiddle_default', 'bizClassMiddle_education', 'bizClassMiddle_faith',
  'bizClassMiddle_food', 'bizClassMiddle_health', 'bizClassMiddle_professional', 'bizClassMiddle_retail', 'bizClassMiddle_tech',
  // one weight + one unit per BIZ_HOOD_SIGNALS entry (listed here: this array is built before that table loads)
  'bizHoodWeight_vitality', 'bizHoodUnit_vitality', 'bizHoodWeight_sentiment', 'bizHoodUnit_sentiment', 'bizHoodWeight_crime', 'bizHoodUnit_crime', 'bizHoodWeight_momentum', 'bizHoodUnit_momentum', 'bizHoodWeight_events', 'bizHoodUnit_events', 'bizHoodWeight_migration', 'bizHoodUnit_migration', 'bizHoodWeight_income', 'bizHoodUnit_income', 'bizHoodWeight_boom', 'bizHoodUnit_boom'
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
// engine.356 — where each class of business sits in this city, the anchor a business's hood-set
// resting level is measured from (resting = middle + hood score × bizHoodSpan). Held on World_Config as
// bizClassMiddle_<class> — seeded at the median Growth_Rate of each class's hood-following businesses
// (not City-wide, not an institution, not a sports franchise or stadium) on the C116 ledger, the numbers
// the builder approved the change on (2026-11-21). Held, not re-taken each Cycle: a median of the same
// businesses being pulled walks a class to the ceiling or floor (agy read 2026-11-21). Not the mint
// table above: that is a new business's start (2–8) and anchoring on it deflated half the city.
var BIZ_CLASS_MIDDLE_CLASSES = ['arts', 'construction', 'default', 'education', 'faith', 'food', 'health', 'professional', 'retail', 'tech'];
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

// The hood's business mix on the Business_Ledger — { field: count } over the
// rows in that hood whose Sector resolves to a birth field. The market a new
// business is born into. Cached per ctx.
function bizHoodMix_(ctx, hood) {
  ctx._bizHoodMix96 = ctx._bizHoodMix96 || {};
  if (ctx._bizHoodMix96.hasOwnProperty(hood)) return ctx._bizHoodMix96[hood];
  var mix = {};
  try {
    var sheet = ctx.ss ? ctx.ss.getSheetByName('Business_Ledger') : null;
    var v = sheet ? sheet.getDataRange().getValues() : null;
    if (v && v.length > 1 && hood) {
      var h = v[0], iS = h.indexOf('Sector'), iH = h.indexOf('Neighborhood');
      for (var r = 1; r < v.length && iS >= 0 && iH >= 0; r++) {
        if (String(v[r][iH] || '').trim() !== hood) continue;
        // engine.307 fielded the sports rows for hiring; the market a family opens into is
        // unchanged — a sports row weighs nothing here, as before.
        if (/sports|stadium|franchise|athletic/i.test(String(v[r][iS] || ''))) continue;
        var cat = (typeof sectorCategory_ === 'function') ? sectorCategory_(v[r][iS], true) : null;
        if (cat && BIZ_FIELD_BIRTH[cat]) mix[cat] = (mix[cat] || 0) + 1;
      }
    }
  } catch (e) { Logger.log('bizHoodMix_: ' + e.message); }
  ctx._bizHoodMix96[hood] = mix;
  return mix;
}

// The field a heritage line opens in — a WEIGHTED DRAW, never a lookup (the
// builder, 2026-09-03: "Benji only opening sports businesses makes no sense";
// doctrine 2, causes then dice). Two causes, one draw: every field a living
// member stands in (one weight per member holding it) and the hood's own
// business mix (one weight per business), so a family opens in its trade OR
// in what its neighborhood already sells; an athlete weighs nothing and the
// line draws from the market. Empty everywhere → Small Business.
function heritageBusinessField_(ctx, memberRows, stakeRow, iTags, iRole, hood, unit) {
  var weights = {}, familyW = 0, hoodW = 0;
  for (var m = 0; m < memberRows.length; m++) {
    var fs = bizRowFields_(memberRows[m], iTags, iRole);
    for (var f = 0; f < fs.length; f++) { if (!BIZ_FIELD_BIRTH[fs[f]]) continue; weights[fs[f]] = (weights[fs[f]] || 0) + 1; familyW += 1; }
  }
  var mix = bizHoodMix_(ctx, hood);
  for (var k in mix) { if (!mix.hasOwnProperty(k)) continue; weights[k] = (weights[k] || 0) + mix[k]; hoodW += mix[k]; }
  var keys = [], total = 0;
  for (var w in weights) { if (weights.hasOwnProperty(w)) { keys.push(w); total += weights[w]; } }
  if (!keys.length || total <= 0) return { field: 'Small Business', source: 'default', odds: {} };
  keys.sort();
  var u = Math.max(0, Math.min(0.999999, Number(unit) || 0)) * total, acc = 0, pick = keys[keys.length - 1];
  for (var i = 0; i < keys.length; i++) { acc += weights[keys[i]]; if (u < acc) { pick = keys[i]; break; } }
  var odds = {};
  for (var o = 0; o < keys.length; o++) odds[keys[o]] = Math.round(weights[keys[o]] / total * 100) / 100;
  var fromFamily = memberRows.some(function(row) { return bizRowFields_(row, iTags, iRole).indexOf(pick) >= 0; });
  return { field: pick, source: fromFamily ? (mix[pick] ? 'family+hood' : 'family') : 'hood', odds: odds };
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
  ['food', /cafe|coffee|bakery|restaurant|dining|diner|food|bar\b|pubs?\b|brewery|lounge|nightlife|club|market/i],   // pubs?\b: an unbounded 'pub' classed every Public Transit / Services / Safety row as a bar; the suffix form keeps gastropub / brewpub
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

// engine.193 — this Cycle's edition coverage score minus the mean of the last six
// carried weeks (S.activityObservations.history `coverage`, written by Phase 9's
// compactActivityObservations_). null until at least one week is carried.
function bizCoverageDeviation_(S) {
  var now = Number(S && S.editionSentimentBoost);
  if (!isFinite(now)) now = 0;
  var hist = (S && S.activityObservations && Array.isArray(S.activityObservations.history)) ? S.activityObservations.history : [];
  var cyc = Number(S && (S.cycleId || S.cycle));
  var vals = [];
  for (var i = 0; i < hist.length; i++) {
    var h = hist[i];
    if (!h || h.coverage === undefined || h.coverage === null || Number(h.cycle) === cyc) continue;
    var v = Number(h.coverage);
    if (isFinite(v)) vals.push(v);
  }
  vals = vals.slice(-6);
  if (!vals.length) return null;
  var sum = 0;
  for (var j = 0; j < vals.length; j++) sum += vals[j];
  return now - sum / vals.length;
}

// engine.193 — the median RetailVitality across hoods carrying one this Cycle; null when none do.
function bizVitalityMedian_(ns) {
  var v = [];
  for (var h in (ns || {})) {
    if (!ns.hasOwnProperty(h) || !ns[h]) continue;
    var x = Number(ns[h].retailVitality);
    if (ns[h].retailVitality !== undefined && ns[h].retailVitality !== null && ns[h].retailVitality !== '' && isFinite(x)) v.push(x);
  }
  if (!v.length) return null;
  v.sort(function(a, b) { return a - b; });
  var m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// engine.205 slice D — the city's median NightlifeProfile this Cycle (null = no profile read).
function bizNightlifeMedian_(ns) {
  var v = [];
  for (var h in (ns || {})) {
    if (!ns.hasOwnProperty(h) || !ns[h]) continue;
    var x = ns[h].nightlifeProfile;
    if (x !== undefined && x !== null && x !== '' && isFinite(Number(x))) v.push(Number(x));
  }
  if (!v.length) return null;
  v.sort(function(a, b) { return a - b; });
  var m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// engine.205 slice D — the businesses a game week fills: the food/nightlife class plus the
// hospitality and food rows an earlier class claims ('Retail & Food' reads retail).
function bizIsBar_(sector) {
  return bizSectorClass_(sector) === 'food' || /hospitality|\bfood\b/i.test(String(sector || ''));
}

// engine.214 8a Cut C: the chaos outcomes that close or damage a business (utilities/chaosCarsConfig.js
// fire_engine, building_inspector, pge_truck) — the ones a regular at the spot hears about.
var BIZ_SPOT_CHAOS_ = { minor_fire: true, major_blaze_contained: true, transformer_blowout: true, forced_temporary_closure: true };

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
// engine.178 (S438): the owner's signed dial bands off Key_Personnel -> ledger DialState.
// First owner/founder entry carrying a POPID wins; null when none resolves.
// engine.201 Wave 2 (builder ruling 2, 2026-09-13): a venture that fails lowers its owner's openness —
// the retreat to routine. Owners resolve exactly as bizOwnerDials_ does (POPID when the cell carries one,
// else full name; a name shared by two ledger rows resolves nothing). Line lands in the owner's own
// LifeHistory cell, the only place the Phase-9 fold reads. Returns owners lined.
var VENTURE_GONE_STATUS = { deceased: 1, inactive: 1, traded: 1, pending: 1 };
function noteVentureClosedOwners_(ctx, keyPersonnelCell, bizName, cycle) {
  if (!keyPersonnelCell || typeof parseKeyPersonnelOwners_ !== 'function' || !ctx.ledger || !ctx.ledger.headers) return 0;
  var h = ctx.ledger.headers, iP = h.indexOf('POPID'), iF = h.indexOf('First'), iL = h.indexOf('Last'), iLife = h.indexOf('LifeHistory'), iSt = h.indexOf('Status');
  if (iP < 0 || iLife < 0) return 0;
  if (!ctx._ventureRowByPop) {
    ctx._ventureRowByPop = {}; ctx._ventureRowByName = {};
    for (var r = 0; r < ctx.ledger.rows.length; r++) {
      var pp = String(ctx.ledger.rows[r][iP] || '').trim().toUpperCase();
      if (!pp) continue;
      // codex review S449 P1: a gone citizen (deceased / inactive / traded / pending) lives no new memory
      var vst = iSt >= 0 ? String(ctx.ledger.rows[r][iSt] || '').trim().toLowerCase() : '';
      if (VENTURE_GONE_STATUS[vst]) continue;
      ctx._ventureRowByPop[pp] = r;
      if (iF >= 0 && iL >= 0) {
        var nk = (String(ctx.ledger.rows[r][iF] || '').trim() + ' ' + String(ctx.ledger.rows[r][iL] || '').trim()).trim().toLowerCase();
        if (nk) ctx._ventureRowByName[nk] = ctx._ventureRowByName.hasOwnProperty(nk) ? -1 : r;
      }
    }
  }
  var entries = parseKeyPersonnelOwners_(keyPersonnelCell), lined = 0, seen = {};
  for (var e = 0; e < entries.length; e++) {
    if (!entries[e].owner) continue;
    // codex review S449 P1: a supplied POPID that does not resolve fails CLOSED — never re-routed to a
    // namesake. Name resolution only for entries that carry no POPID.
    var ri = entries[e].pop ? ctx._ventureRowByPop[String(entries[e].pop).toUpperCase()]
                            : (entries[e].name ? ctx._ventureRowByName[String(entries[e].name).trim().toLowerCase()] : undefined);
    if (ri == null || ri < 0 || seen[ri]) continue;
    seen[ri] = true;
    var row = ctx.ledger.rows[ri];
    var stamp = (typeof inWorldStamp_ === 'function') ? inWorldStamp_(ctx) : ('C' + cycle);
    var line = stamp + ' — [RoutineRetrenched] watched ' + bizName + ' close its doors and went back to what they knew';
    row[iLife] = row[iLife] ? String(row[iLife]) + '\n' + line : line;
    lined++;
  }
  if (lined) ctx.ledger.dirty = true;
  return lined;
}

function bizOwnerDials_(ctx, keyPersonnelCell) {
  if (!keyPersonnelCell || typeof parseKeyPersonnelOwners_ !== 'function' || typeof getCitizenDialBands_ !== 'function') return null;
  if (!ctx._bizDialByPop) {
    ctx._bizDialByPop = {}; ctx._bizDialByName = {};
    if (ctx.ledger && ctx.ledger.headers) {
      var h = ctx.ledger.headers, iP = h.indexOf('POPID'), iD = h.indexOf('DialState'), iF = h.indexOf('First'), iL = h.indexOf('Last');
      if (iP >= 0 && iD >= 0) for (var r = 0; r < ctx.ledger.rows.length; r++) {
        var pp = String(ctx.ledger.rows[r][iP] || '').trim().toUpperCase();
        var dsRow = String(ctx.ledger.rows[r][iD] || '');
        if (pp && dsRow) ctx._bizDialByPop[pp] = dsRow;
        // Name-only ownership must identify one ledger row, even when a namesake
        // has no DialState yet. Null marks ambiguity for the rest of this Cycle.
        if (iF >= 0 && iL >= 0) {
          var nk = (String(ctx.ledger.rows[r][iF] || '').trim() + ' ' + String(ctx.ledger.rows[r][iL] || '').trim()).trim().toLowerCase();
          if (nk) ctx._bizDialByName[nk] = ctx._bizDialByName.hasOwnProperty(nk) ? null : { pop: pp, ds: dsRow };
        }
      }
    }
  }
  var entries = parseKeyPersonnelOwners_(keyPersonnelCell);
  for (var e = 0; e < entries.length; e++) {
    if (!entries[e].owner) continue;
    var pop = entries[e].pop ? String(entries[e].pop).toUpperCase() : '', ds = pop ? ctx._bizDialByPop[pop] : null;
    // An explicit POPID is authoritative; never borrow a namesake's dials when
    // that ID is absent or has no DialState. A later valid owner can still resolve.
    if (!pop && entries[e].name) {
      var byName = ctx._bizDialByName[String(entries[e].name).trim().toLowerCase()];
      if (byName) { pop = byName.pop; ds = byName.ds; }
    }
    if (!pop || !ds) continue;
    var gb = getCitizenDialBands_(ctx, pop, ds);
    if (gb && gb.current) return gb.current;
  }
  return null;
}

function bizDriftOne_(cfg, biz, prevState, inputs, cycle) {
  var cls = bizSectorClass_(biz.sector);
  var vol = cfg['bizVol_' + cls];
  if (vol === undefined) vol = cfg.bizVol_default;
  var scale = cfg.bizEventShockScale;

  // 1. events — the signal
  // engine.193 cut 3b: chaos reads SIGNED. Was −scale for any hit — an inspection passed,
  // a false alarm and a revenue-raising mail drop all cut growth, and a hood the ice-cream
  // truck cheered up dragged every shop in it. chaosAtBusiness = the outcomes' summed
  // bizEvent; chaosInHood = the hood's fresh chaos swing, signed (chaosHoodSign_, ±1).
  var ev = 0;
  ev += (Number(inputs.chaosAtBusiness) || 0) * scale;
  ev += (Number(inputs.chaosInHood) || 0) * scale;
  // engine.250: positives are EVENTS, negatives are CONDITIONS (the engine.139 rule).
  // An initiative changing phase in the hood is news and pays once, the Cycle it
  // happens; a standing initiative pays nothing here — its ambient lift already
  // reaches the business through hood retail vitality (the Phase-2 fold). A
  // stalled/blocked/defunded initiative (net-negative hood entry) drains every
  // Cycle it stays that way. Presence alone used to pay +scale: once the bus was
  // revived that would have pinned max-up drift on every business in an
  // initiative hood for as long as the initiative existed.
  if (inputs.initiativeAdvanced) ev += scale;
  if (inputs.initiativeFailing) ev -= scale * cfg.bizInitiativeStallDrag;   // builder-ruled half weight: a stall stings, one forgotten project does not close a block
  // engine.193: coverage is read against its own recent weeks, not its sign. The
  // city-level score was positive ~7 of 8 weeks, so `> 0 → +0.5` paid every business
  // every week and Growth_Rate ratcheted (173 of 174 positive on live C108). Now a
  // week the paper rates above its 6-week mean lifts, below it drags, continuous
  // (±0.5 at ±bizCoverageUnit). No carried baseline yet → no term.
  var covDev = inputs.coverageDeviation;
  if (covDev !== null && covDev !== undefined && isFinite(covDev)) {
    ev += bizClamp_(covDev / cfg.bizCoverageUnit, -1, 1) * 0.5 * scale;
  }
  // engine.205 slice D: a game week at the bars — the signed result as this business's hood
  // felt it (sportsBarTerm_, ±1 at full strength), an EVENT both ways: a home loss empties
  // the venue's bars the week it happens. Zero for every non-bar and on a week with no game.
  var sportsPp = (Number(inputs.sportsWeek) || 0) ? Number(inputs.sportsWeek) * cfg.bizSportsWeekPp * scale : 0;
  ev += sportsPp;
  // engine.356 (builder 2026-11-21: "crime, weather, whatever we offer"): the week's weather on the street.
  // S.weather.impact is 1 on a normal week and climbs with rain, wind, heat and cold (applyWeatherModel_;
  // C107–C116 ran 1.00–1.33); a business that follows its hood loses (impact − 1) × bizWeatherPp. An
  // institution, a franchise or a City-wide row: no term (inputs.weatherImpact null).
  var wxImp = inputs.weatherImpact;
  if (wxImp !== null && wxImp !== undefined && isFinite(Number(wxImp)) && Number(wxImp) > 1) ev -= (Number(wxImp) - 1) * cfg.bizWeatherPp * scale;
  // engine.356: the week's news on top of the hood — capped at bizEventCap (was 2.0 in code)
  ev = bizClamp_(ev, -cfg.bizEventCap, cfg.bizEventCap);

  // 2. the hood — engine.356 (builder 2026-11-21: "their success should stem from how the hood
  // performs"). A business rests at its class's middle in this city (World_Config bizClassMiddle_<class>,
  // held at the C116 medians — a fixed anchor) plus the hood's performance score × span,
  // and closes bizHoodPull of the gap each Cycle, capped ±bizHoodMaxPp. A resting level, not a push:
  // Growth_Rate is a level carried week to week, so a standing push would walk every business in a
  // strong hood to the ceiling and every one in a weak hood to the floor. Measured on the shock-free
  // track (growth minus the ship offset), like the institution settle below. inputs.hoodScore null —
  // a City-wide row, an institution, a sports franchise, a hood with no profile — no term. Replaces the
  // engine.193 vitality term (RetailVitality vs the median × bizVitalityGain, ±0.5), which saturated
  // in most hoods and pushed rather than settled.
  var shipPrev = Number(prevState.ship) || 0;
  var track = biz.growth - shipPrev;
  var hs = inputs.hoodScore, mid = inputs.classMiddle;
  var vitMod = (hs === null || hs === undefined || !isFinite(hs) || mid === null || mid === undefined || !isFinite(mid)) ? 0 :
    bizClamp_(cfg.bizHoodPull * ((mid + hs * cfg.bizHoodSpan) - track), -cfg.bizHoodMaxPp, cfg.bizHoodMaxPp);
  var vit = inputs.vitality;

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
  // engine.178: a driven owner turns a good week into a bigger one; never a bad one into a good one.
  // ownerDriveHigh is the share of the multiplier the owner's drive earns (0 at 70, half at 80, all at 90).
  if (drift > 0 && inputs.ownerDriveHigh > 0 && inputs.ownerExpandMult > 1) drift = bizClamp_(drift * (1 + (inputs.ownerExpandMult - 1) * inputs.ownerDriveHigh), 0, cfg.bizDriftMaxUp);
  // engine.193 cut 3b: the ship's offset steps AROUND the weekly drift cap (a port shock is
  // not a slow week). The business keeps a shock-free track underneath (growth minus the
  // offset carried from last week) that drifts exactly as it would with no ship; the
  // offset sits on top, clamped. The aftermath (offset 0) lands back on that track — no
  // ratchet either way, including weeks the floor swallowed.
  // engine.193 (b) (builder 2026-10-07, "b first"): an institution's growth settles toward its
  // class's normal (BIZ_CLASS_MINT — what a business of that class IS) instead of holding the
  // leftover ratchet (OUSD 8.89 / Kaiser 10.17 / Port 12.69 at C110 vs class 2–3). A pull on the
  // shock-free track, outside the drift cap — events still move it every week; with none, the gap
  // closes by bizSettleRate a Cycle. Only staffs >= bizSettleMinStaff: live sector medians are
  // ratcheted too (tech 21.6, education = OUSD + Peralta), so "the sector's own middle" would hold them.
  var settle = 0;   // track / shipPrev: computed above, before the hood term
  if (cfg.bizSettleRate > 0 && (Number(biz.stated) || 0) >= cfg.bizSettleMinStaff) {
    settle = cfg.bizSettleRate * ((BIZ_CLASS_MINT[cls] || BIZ_CLASS_MINT['default']).growth - track);
  }
  var g0 = bizClamp_(track + drift + settle, cfg.bizGrowthFloor, cfg.bizGrowthCeil);
  var g1 = bizClamp_(g0 + (Number(inputs.shipOffset) || 0), cfg.bizGrowthFloor, cfg.bizGrowthCeil);
  var growth = Math.round(g1 * 100) / 100;
  var shipApplied = Math.round((growth - Math.round(g0 * 100) / 100) * 100) / 100;
  var revenue = biz.revenue === null ? null : Math.round(biz.revenue * (1 + growth / 100 / 52));
  var streak = growth < 0 ? (Number(prevState.streak) || 0) + 1 : 0;
  return { growth: growth, revenue: revenue, drift: drift, streak: streak, win: win, disrupted: disrupted, cls: cls, ship: shipApplied,
    parts: { ev: ev, vit: vitMod, pressure: pressure, shock: shock, noise: noise, ship: shipApplied - shipPrev, sports: sportsPp, settle: settle } };
}

// engine.356 — how a hood performs, one number per hood in [-1, 1]: the weighted mean of every hood
// signal the sim produces that bears on a business (builder 2026-11-21: "unique combinations of data
// drive the world, world_config holds alot of the dials"). Each signal is read from S.neighborhoodState
// (last Cycle's Neighborhood_Map), measured from its centre — the city's middle hood this Cycle, or the
// neutral its own engine defines (momentum 5, net migration 0) — divided by its unit and capped at ±1,
// signed by which way it helps a business. Weight and unit for each live on World_Config
// (bizHoodWeight_<name>, bizHoodUnit_<name>); weight 0 turns a signal off. A missing signal is left out of
// the mean; a hood with no switched-on signal gets no score (agy read 2026-11-21: not gated on one signal).
var BIZ_HOOD_SIGNALS = [
  // [name, S.neighborhoodState field, sign, centre: 'median' or a fixed neutral]
  ['vitality',  'retailVitality',      1, 'median'],   // shop health
  ['sentiment', 'sentiment',           1, 'median'],   // mood
  ['crime',     'crimeIndex',         -1, 'median'],   // crime, against
  ['momentum',  'trajectoryMomentum',  1, 5],          // rising / falling (0–10, 5 neutral by its engine)
  ['events',    'eventAttractiveness', 1, 'median'],   // what draws people out
  ['migration', 'migrationFlow',       1, 0],          // people moving in / out (−5..+5)
  ['income',    'medianIncome',        1, 'median'],   // spending power
  ['boom',      'boomIndex',           1, 'median']    // the hood's boom exposure (engine.135 B1, −1..+1)
];
function bizHoodNum_(v) { return (v === null || v === undefined || v === '' || !isFinite(Number(v))) ? null : Number(v); }
function bizHoodScores_(ns, cfg) {
  var keys = [], centres = {};
  for (var h in ns) if (ns.hasOwnProperty(h) && ns[h]) keys.push(h);
  for (var g = 0; g < BIZ_HOOD_SIGNALS.length; g++) {
    var sig = BIZ_HOOD_SIGNALS[g];
    if (sig[3] !== 'median') { centres[sig[0]] = sig[3]; continue; }
    var vals = [];
    for (var a = 0; a < keys.length; a++) { var va = bizHoodNum_(ns[keys[a]][sig[1]]); if (va !== null) vals.push(va); }
    centres[sig[0]] = bizMedian_(vals);
  }
  var out = {};
  for (var k = 0; k < keys.length; k++) {
    var s = ns[keys[k]];
    var sum = 0, wsum = 0;
    for (var q = 0; q < BIZ_HOOD_SIGNALS.length; q++) {
      var sg = BIZ_HOOD_SIGNALS[q], w = cfg['bizHoodWeight_' + sg[0]], u = cfg['bizHoodUnit_' + sg[0]];
      var v = bizHoodNum_(s[sg[1]]), c = centres[sg[0]];
      if (!(w > 0) || !(u > 0) || v === null || c === null || c === undefined) continue;
      sum += w * bizClamp_(sg[2] * (v - c) / u, -1, 1); wsum += w;
    }
    out[keys[k]] = wsum > 0 ? Math.round(sum / wsum * 1000) / 1000 : null;
  }
  return out;
}

function bizMedian_(arr) {
  if (!arr || !arr.length) return null;
  var a = arr.slice().sort(function(x, y) { return x - y; }), n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

// engine.356 (builder 2026-11-21, choice B): a sports franchise or its stadium drives its hood (the
// stadium label lifts the venue hood's shops and events; each game week moves it) and never follows it.
// The teams are the mint's own list (MINT_GAME_TEAMS_: the Oaks BIZ-00074, the A's BIZ-00005); the
// grounds are the ledger's stadium / franchise rows (the A's park, the Coliseum).
function bizIsFranchise_(id, sector) {
  for (var t = 0; t < MINT_GAME_TEAMS_.length; t++) if (MINT_GAME_TEAMS_[t][1] === id) return true;
  return /franchise|stadium/i.test(String(sector || ''));
}

// engine.193 cut 3b — a hood's fresh chaos swing this Cycle as a sign for its businesses
// (±1): mood, retail and event pull up with their sign; crime counts against. Each column
// is scaled by its typical single-event size in chaosCarsConfig (Sentiment ~0.08, Retail
// ~2, Events ~2.5, Crime ~0.08), so one ordinary hit reads about ±1.
function chaosHoodSign_(fold) {
  if (!fold) return 0;
  var sc = (Number(fold.Sentiment) || 0) / 0.08 + (Number(fold.RetailVitality) || 0) / 2 +
    (Number(fold.EventAttractiveness) || 0) / 2.5 - (Number(fold.CrimeIndex) || 0) / 0.08;
  return bizClamp_(Math.round(sc * 100) / 100, -1, 1);
}

// engine.193 cut 3b — the ship's target offset for one business this Cycle (pp).
function bizShipOffset_(ship, sector, echoShare) {
  if (!ship || !(Number(ship.factor) > 0)) return 0;
  var portRe = (typeof CHAOS_SHIP_PORT_SECTORS !== 'undefined') ? CHAOS_SHIP_PORT_SECTORS : /\bport\b|logistic|retail|\bfood\b|grocery|wholesale|manufactur|construction/i;
  var share = portRe.test(String(sector || '')) ? 1 : (Number(echoShare) || 0);
  return Math.round(Number(ship.factor) * (Number(ship.peakPp) || 0) * share * 100) / 100;
}

function applyBusinessDynamics_(ctx) {
  var S = ctx.summary;
  var cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;
  var out = { rows: 0, drifted: 0, distressed: 0, disrupted: 0, successWindows: 0, blankRevenue: 0 };
  var cfg = bizDynamicsConfig_(ctx);

  var sheet = ctx.ss ? ctx.ss.getSheetByName('Business_Ledger') : null;
  if (!sheet) throw new Error('applyBusinessDynamics_: Business_Ledger not found');
  var bl = sheet.getDataRange().getValues();
  if (!bl || bl.length < 2) { S.businessDynamicsState = {}; S.hoodBusinessMomentum = {}; S.hoodSpots = {}; return out; }
  var bh = bl[0];
  var col = function(name) { for (var c = 0; c < bh.length; c++) if (String(bh[c]).trim() === name) return c; return -1; };
  var iId = col('BIZ_ID'), iSec = col('Sector'), iHood = col('Neighborhood'), iRev = col('Annual_Revenue'), iGrow = col('Growth_Rate');
  var iCnt = col('Employee_Count'), iNm = col('Name'), iKP = col('Key_Personnel'); // engine.178: the owner's dials
  if (iId < 0 || iSec < 0 || iHood < 0 || iRev < 0 || iGrow < 0) {
    throw new Error('applyBusinessDynamics_: Business_Ledger missing one of BIZ_ID/Sector/Neighborhood/Annual_Revenue/Growth_Rate (trimmed)');
  }

  var prev = (S.previousCycleState && S.previousCycleState.businessDynamics) || {};
  var ns = S.neighborhoodState || {};
  var mayorApproval = bizMayorApproval_(ctx);
  var chaosBiz = S.chaosBusinessFold || {};
  var chaosHood = S.chaosNeighborhoodFold || {};
  var initHood = S.initiativeNeighborhoodEffects || {};
  var coverageDev = bizCoverageDeviation_(S);   // engine.193 — city-level until per-business coverage has a reader
  var vitalityMedian = bizVitalityMedian_(ns);  // engine.193
  // engine.205 slice D: the week's game result reaches the bars (S.sportsWeek, Phase 2).
  // No franchise played → no term, no ripple.
  var sportsWeeks = S.sportsWeek || {}, sportsGame = false;
  for (var swf in sportsWeeks) if (sportsWeeks.hasOwnProperty(swf) && sportsWeeks[swf] && sportsWeeks[swf].g > 0) sportsGame = true;
  var nightlifeMedian = sportsGame ? bizNightlifeMedian_(ns) : null;
  var barIds = [], barPp = 0, barByHood = {};   // engine.206: the moved bars, by parent hood, for the economy's game-week ripple

  var ship = S.chaosShip || null;               // engine.193 cut 3b — runChaosShip_ (Phase 4)

  var state = {};
  var declines = {}, closures = [];
  out.shed = 0; out.closed = 0; out.closing = 0;
  var revCol = [], growCol = [];
  // 2026-09-19 (builder ruling: "businesses having a whole loop but not felt in their
  // hoods is trick code"): per-hood business momentum. The loop moved every business's
  // growth, shed jobs and closed doors, and none of it reached the hood's street — only
  // Employee_Count presence (saturated for the five biggest-employer hoods). Tallied here
  // per PARENT hood (child areas fold, SIM_DOCTRINE §17), read by the Phase-10 writer.
  // Feedback, named: bizDriftOne_ reads the hood's last-cycle RetailVitality (vitMod), and
  // the writer now reads this momentum into this cycle's RetailVitality — a loop, bounded
  // both ends (drift ±bizDriftMax pp/cycle; writer factor 0.88–1.12 against the city's
  // median growth, so a citywide rise moves nobody). A closure is felt the cycle it closes
  // (its revenue share leaves the street); winding-down rows after that are not tallied —
  // the street reads without them.
  var hoodBiz = {};
  // Only a canon hood (or a child area folded to its parent) carries momentum. 'City-wide' and
  // unmapped labels are skipped — they are not a street, and as keys they polluted the city median
  // the writer centres every hood's factor on (kimi review 2026-09-19). No canon seed (an offline
  // harness) → no momentum at all, never raw labels.
  var bizHoodKey = function(h) {
    if (!h || typeof resolveHoodOrChild_ !== 'function' || !S.canonHoods) return '';
    return resolveHoodOrChild_(ctx, h) || '';
  };
  var tallyBiz = function(h, revenue, growth, closedNow) {
    var k = bizHoodKey(h);
    if (!k || revenue === null || !(revenue > 0)) return;
    var t = hoodBiz[k] || (hoodBiz[k] = { revenue: 0, growthWeighted: 0, closedRevenue: 0, closures: 0, businesses: 0 });
    t.revenue += revenue; t.businesses++;
    if (closedNow) { t.closedRevenue += revenue; t.closures++; }
    else t.growthWeighted += revenue * growth;
  };
  // engine.214 8a Cut C: the citizen's spot — the hood's open food and retail rows, each with this
  // Cycle's facts (streak, last Cycle's streak, staff shed, a game-week lift, the chaos outcomes that
  // hit it). Arts is out: its live rows are newsrooms. Built locally, published at the end of the
  // phase, so a throw mid-loop leaves S.hoodSpots unset and the citizen pool offers nothing.
  var spotChaos = {}, spots = {};
  var idByName = {};  // engine.356: an open business's id by its exact name (a congregation on the ledger)
  var openIds = {};   // engine.356 A2: every ledger business not winding down — a line that names a business is offered only while it is here
  var spotCycle = Number(S.absoluteCycle || S.cycleId);   // the stamp runChaosCarsEngine_ puts on its payloads
  var cce = S.chaosCarsEvents || [];
  for (var sc = 0; sc < cce.length; sc++) {
    var sev = cce[sc];
    if (!sev || sev.targetScope !== 'business' || Number(sev.cycleId) !== spotCycle || !BIZ_SPOT_CHAOS_[sev.diceOutcome]) continue;
    var spl = spotChaos[sev.targetId] || (spotChaos[sev.targetId] = []);
    if (spl.indexOf(sev.diceOutcome) < 0) spl.push(sev.diceOutcome);   // one line per outcome kind: two fires in a week are still "a fire"
  }
  // engine.356: who follows the hood, each hood's score, each class's middle — before the loop, from
  // this Cycle's sheet values, so every business reads the same middles.
  var hoodScores = bizHoodScores_(ns, cfg);
  var followsHood = function(rowF, idF) {
    var st = iCnt >= 0 ? (Number(rowF[iCnt]) || 0) : 0;
    if (st >= cfg.bizSettleMinStaff) return false;                         // an institution settles to its class normal instead
    if (bizIsFranchise_(idF, rowF[iSec])) return false;                    // builder 2026-11-21 (B): the teams drive their hood, never follow it
    var hScore = hoodScores[String(rowF[iHood] || '').trim()];
    return hScore !== undefined && hScore !== null;                         // City-wide, or a hood with no profile: no term
  };
  // The class middle is HELD (World_Config bizClassMiddle_<class>), never re-taken from this Cycle's rows: agy read
  // 2026-11-21 — a median of the same businesses being pulled walks every class whose businesses sit
  // mostly in strong (tech) or weak (schools) hoods to the ceiling or the floor, ~0.2 × span × the class's
  // median hood score a Cycle, with no anchor.
  var classMiddle = {};
  for (var cmi = 0; cmi < BIZ_CLASS_MIDDLE_CLASSES.length; cmi++) classMiddle[BIZ_CLASS_MIDDLE_CLASSES[cmi]] = cfg['bizClassMiddle_' + BIZ_CLASS_MIDDLE_CLASSES[cmi]];
  for (var r = 1; r < bl.length; r++) {
    var row = bl[r];
    var id = String(row[iId] || '').trim();
    var hood = String(row[iHood] || '').trim();
    var biz = { id: id, sector: row[iSec], hood: hood, growth: bizParseGrowth_(row[iGrow]), revenue: bizParseRevenue_(row[iRev]) };
    if (!id) { revCol.push([row[iRev]]); growCol.push([row[iGrow]]); continue; } // untouched
    var ps = prev[id] ? { streak: prev[id][0], win: prev[id][1], closed: prev[id][2] || 0, ship: prev[id][3] || 0 } : { streak: 0, win: 0, closed: 0, ship: 0 };
    var stated = iCnt >= 0 ? (Number(row[iCnt]) || 0) : 0;
    if (!ps.closed) { openIds[id] = 1; if (iNm >= 0 && String(row[iNm] || '').trim()) idByName[String(row[iNm]).trim()] = id; }
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
    // engine.178 (S438): the OWNER's dials — composure buys (or costs) a decline cycle
    // before closure; high drive multiplies a positive drift. Owner = Key_Personnel
    // (owner/founder tag, POPID-carrying) resolved to the ledger row's DialState.
    // engine.349 Task 14: the owner's numbers (the felt values 0-100), not bands.
    var ownerB = bizOwnerDials_(ctx, iKP >= 0 ? row[iKP] : '');
    var barTerm = 0, barHood = '';
    if (sportsGame && bizIsBar_(row[iSec])) {
      barHood = bizHoodKey(hood) || hood;   // a child area reads its parent's venue and nightlife
      var nl = ns[barHood] ? ns[barHood].nightlifeProfile : null;
      barTerm = sportsBarTerm_(sportsWeeks, barHood,
        nightlifeMedian !== null && nl !== null && nl !== undefined && Number(nl) >= nightlifeMedian);
    }
    var inputs = {
      chaosAtBusiness: Number(chaosBiz[id]) || 0,
      chaosInHood: hood ? chaosHoodSign_(chaosHood[hood]) : 0,
      shipOffset: bizShipOffset_(ship, row[iSec], cfg.bizShipEchoShare),
      initiativeAdvanced: !!(hood && initHood[hood] && Number(initHood[hood].advanced) > 0),
      initiativeFailing: !!(hood && initHood[hood] && Number(initHood[hood].sentiment) < 0),
      coverageDeviation: coverageDev,
      vitality: hs && hs.retailVitality !== undefined ? hs.retailVitality : null,
      vitalityMedian: vitalityMedian,
      hoodScore: followsHood(row, id) ? hoodScores[hood] : null,                       // engine.356
      weatherImpact: followsHood(row, id) && S.weather ? S.weather.impact : null,     // engine.356
      classMiddle: classMiddle.hasOwnProperty(bizSectorClass_(row[iSec])) ? classMiddle[bizSectorClass_(row[iSec])] : null,
      mayorApproval: mayorApproval,
      ownerDriveHigh: ownerB ? dialHigh_(ownerB.drive, 2) : 0,
      ownerExpandMult: pressureBar_(ctx, 'dialOwnerDriveExpandMult'),
      sportsWeek: barTerm   // engine.205 slice D
    };
    biz.stated = stated;   // engine.193 (b): the institution scope
    var d = bizDriftOne_(cfg, biz, ps, inputs, cycle);
    // G-EC50 (C111 read): the settle was computed per row and never shown, so an institution
    // that held flat (AC Transit 12.00 → 12.00) could only be inferred. One line each — the
    // settle, the capped drift and the drift's pre-vol parts, the ship — so the read is a number.
    if (cfg.bizSettleRate > 0 && stated >= cfg.bizSettleMinStaff) {
      var r2 = function(x) { return Math.round((Number(x) || 0) * 100) / 100; };
      var dp = d.parts;
      Logger.log('applyBusinessDynamics_ engine.193b settle: ' + String(iNm >= 0 ? row[iNm] : id) + ' (' + hood + ', ' + d.cls + ') ' +
        biz.growth + ' → ' + d.growth + ' = settle ' + r2(dp.settle) + ' + drift ' + r2(d.drift) +
        ' [ev ' + r2(dp.ev) + ', vit ' + r2(dp.vit) + ', pressure ' + r2(dp.pressure) + ', shock ' + r2(dp.shock) +
        ', noise ' + r2(dp.noise) + '] + ship ' + r2(dp.ship));
    }
    if (d.parts.sports) {
      barIds.push(id); barPp += d.parts.sports;
      var bhk = barHood || hood || '';
      if (!barByHood[bhk]) barByHood[bhk] = { ids: [], pp: 0 };
      barByHood[bhk].ids.push(id); barByHood[bhk].pp += d.parts.sports;
    }
    // the room in decline cycles: +dialOwnerStreakRoom at composure 70 and up, -the same at 30 and
    // under, a straight line between. A streak counts whole cycles, so a part of a cycle is a
    // seeded draw at that share (composure 60 buys the extra cycle half the time).
    var ownerRoomRaw = ownerB ? (dialHigh_(ownerB.composure, 1) - dialLow_(ownerB.composure, 1)) * pressureBar_(ctx, 'dialOwnerStreakRoom') : 0;
    var ownerRoom = Math.floor(ownerRoomRaw);
    if (ownerRoomRaw > ownerRoom && seedUnit_(cycle + '|' + id + '|ownerRoom') < ownerRoomRaw - ownerRoom) ownerRoom += 1;
    if (ownerRoom) { out.ownerRoom = (out.ownerRoom || 0) + 1; }
    out.rows++;
    if (inputs.initiativeAdvanced) out.initLift = (out.initLift || 0) + 1;   // engine.250: the bench reads these off the log line
    if (inputs.initiativeFailing) out.initDrag = (out.initDrag || 0) + 1;
    if (d.drift !== 0) out.drifted++;
    if (d.streak > 0) out.distressed++;
    if (d.disrupted) out.disrupted++;
    if (d.win >= cfg.bizSuccessWindow) out.successWindows++;
    if (d.revenue === null) out.blankRevenue++;
    // Task 7: closure — the streak AND the revenue floor, both (27.10)
    var cls = d.cls;
    var floorRev = (cfg.bizClosureRevenueFloorPct / 100) * (BIZ_CLASS_MINT_REVENUE[cls] || BIZ_CLASS_MINT_REVENUE['default']);
    var closesNow = d.streak >= (cfg.bizClosureStreak + ownerRoom) && d.revenue !== null && d.revenue < floorRev; // engine.178: the owner's composure moves the bar
    if (closesNow) {
      out.closed++;
      var bName = String(iNm >= 0 ? row[iNm] : id);
      if (stated > 0) { declines[id] = stated; out.shed += stated; }
      state[id] = [d.streak, 0, cycle];
      closures.push({ id: id, name: bName, hood: hood, sector: String(row[iSec] || ''), closedCycle: cycle, stated: stated });
      tallyBiz(hood, biz.revenue, 0, true);
      out.ownersRetrenched = (out.ownersRetrenched || 0) + noteVentureClosedOwners_(ctx, iKP >= 0 ? row[iKP] : '', bName, cycle); // engine.201 Wave 2
      S.worldEvents = S.worldEvents || [];
      // engine.190 (S463): a closure is the BUSINESS desk's event (was COMMUNITY —
      // it routed to the culture packet, and Jordan Velez never saw the biggest
      // business story of the week). The ≥10-job 'high' severity now hooks too
      // (storyHook.js world-event loop, §15: a gate the beat's biggest event
      // could not pass).
      S.worldEvents.push({
        cycle: cycle, domain: 'BUSINESS', subdomain: 'business-closure', neighborhood: hood,
        severity: stated >= 10 ? 'high' : 'medium',
        description: bName + ' is closing in ' + (hood || 'Oakland') + ' — ' + d.streak + (d.streak === 1 ? ' week' : ' weeks') + ' of decline and revenue under the line; ' + stated + ' jobs go with it',
        impactScore: stated >= 10 ? 40 : 25, source: 'ENGINE', timestamp: ctx.now, businessId: id
      });
      // engine.190: one ripple per closure, business-scoped, so the closure is
      // an ECONOMIC seed the same Cycle (buildContractSeeds economic-event →
      // ECONOMIC → business). Mirrors economicRippleEngine's ledger row.
      if (typeof recordRipple_ === 'function') {
        recordRipple_(ctx, {
          causeType: 'economic-event', causeId: id,
          causeDetail: 'closure: ' + bName + ' (' + String(row[iSec] || '') + ') — ' + stated + ' jobs',
          effectType: 'business-closure', targetScope: 'business', targetIds: [id],
          neighborhood: hood || '', magnitude: -(stated >= 10 ? 40 : 25), duration: 1,
          remainingStrength: 1, cycle: cycle, sourceEngine: 'applyBusinessDynamics'
        });
      }
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
    if (d.streak || d.win || d.ship) state[id] = [d.streak, d.win, 0, d.ship];
    if (d.cls === 'food' || d.cls === 'retail') {
      var spotName = iNm >= 0 ? String(row[iNm] || '').trim() : '', spotHood = bizHoodKey(hood);
      if (spotName && spotHood) {
        (spots[spotHood] = spots[spotHood] || []).push({
          id: id, name: spotName, cls: d.cls, sector: String(row[iSec] || ''), streak: d.streak, prevStreak: Number(ps.streak) || 0,
          shed: declines[id] || 0, lift: d.cls === 'food' && barTerm > 0, chaos: spotChaos[id] || []
        });
      }
    }
    if (d.parts.ship) out.shipMoved = (out.shipMoved || 0) + 1;
    revCol.push([d.revenue === null ? row[iRev] : d.revenue]);
    growCol.push([d.growth]);
    tallyBiz(hood, d.revenue, d.growth, false);
  }
  var momentum = {};
  for (var hk in hoodBiz) {
    if (!hoodBiz.hasOwnProperty(hk)) continue;
    var tb = hoodBiz[hk];
    var open = tb.revenue - tb.closedRevenue;
    momentum[hk] = {
      growth: open > 0 ? Math.round(tb.growthWeighted / open * 100) / 100 : 0,   // revenue-weighted Growth_Rate (pp/yr) of the hood's open businesses
      closedShare: tb.revenue > 0 ? Math.round(tb.closedRevenue / tb.revenue * 1000) / 1000 : 0,  // revenue that closed this cycle
      closures: tb.closures, businesses: tb.businesses
    };
  }
  S.hoodBusinessMomentum = momentum;
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
  // engine.206: the bars the week moved, by parent hood (the key sportsBarTerm_ read), for the
  // economy's own game-week ripple to name (Phase 6, economicRippleEngine SPORTS_WEEK → the
  // ECONOMIC seed at the venue). The Phase-5 'sports' ripple slice D filed here is gone — it
  // clustered into the citywide sentiment seed and the business desk never saw the bars.
  out.sportsBars = barIds.length;
  out.sportsBarPp = barIds.length ? Math.round(barPp / barIds.length * 100) / 100 : 0;
  if (barIds.length) {
    var barsByHood = {};
    for (var bhh in barByHood) {
      if (!barByHood.hasOwnProperty(bhh)) continue;
      barsByHood[bhh] = { ids: barByHood[bhh].ids, pp: Math.round(barByHood[bhh].pp / barByHood[bhh].ids.length * 100) / 100 };
    }
    S.sportsWeekBars = { byHood: barsByHood, ids: barIds, pp: out.sportsBarPp };
  }
  S.businessDynamicsState = state; // finalizeCycleState carries it as businessDynamics
  Logger.log('applyBusinessDynamics_ engine.96:' + out.rows + ' businesses, ' + out.drifted + ' drifted, ' +
    out.distressed + ' in distress, ' + out.disrupted + ' disrupted, ' + out.successWindows + ' under success pressure, ' +
    out.shed + ' shed, ' + out.closed + ' closing now, ' + out.closing + ' winding down, mayor ' + mayorApproval +
    ', initiative lift ' + (out.initLift || 0) + ' / drag ' + (out.initDrag || 0) +
    ', ship ' + (ship ? ship.outcome + ' ' + ship.phase + ' on ' + (out.shipMoved || 0) : 'none') +
    ', game-week bars ' + out.sportsBars + ' at ' + out.sportsBarPp + 'pp');
  S.bizOpenIds = openIds;
  S.bizIdByName = idByName;
  S.hoodSpots = spots;   // engine.214 Cut C — the phase's last step; generateCitizensEvents_ reads it
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
  var av = ar.getDataRange().getValues();
  var ah = av[0] || [];
  var aId = -1; for (var ac = 0; ac < ah.length; ac++) if (String(ah[ac]).trim() === 'BIZ_ID') aId = ac;
  if (aId < 0) { Logger.log('archiveClosedBusinesses_: Business_Archive has no BIZ_ID header'); return out; }
  // engine.285 (2/6): a fire killed between the copy and the removal left this business's
  // copy on the archive. An archive row with the same BIZ_ID, Name, Sector and Neighborhood
  // is that copy — the next fire removes the source row instead of copying it again. The
  // name check is the guard codex asked for: a BIZ_ID reissued after a lost high-water mark
  // is a different business and still gets its own copy (2026-10-16 review).
  var bizKey = function(row) { var k = []; for (var kc = 0; kc < 4; kc++) k.push(String(row[kc] === undefined ? '' : row[kc]).trim()); return k.join('|'); };
  var archived = {};
  for (var aq = 1; aq < av.length; aq++) if (String(av[aq][aId] || '').trim()) archived[bizKey(av[aq])] = true;
  // bottom-up by ROW (was by BIZ_ID, which is bottom-up only while the ledger stays in id
  // order) so a removal never shifts a row still to be examined
  var byId = {};
  for (var q = 1; q < v.length; q++) byId[String(v[q][iId] || '').trim()] = q;
  var ids = closures.map(function(c) { return c.id; });
  ids.sort(function(x, y) { return (byId[y] === undefined ? -1 : byId[y]) - (byId[x] === undefined ? -1 : byId[x]); });
  for (var k = 0; k < ids.length; k++) {
    var id = ids[k];
    var q2 = byId[id];
    if (q2 === undefined) { out.skipped++; continue; }
    out.candidates++;
    var stated = iCnt >= 0 ? (Number(v[q2][iCnt]) || 0) : 0;
    if (stated > 0 || tracked[id]) { out.waiting++; continue; }
    var meta = null;
    for (var m = 0; m < closures.length; m++) if (closures[m].id === id) meta = closures[m];
    if (archived[bizKey(v[q2])]) {
      Logger.log('archiveClosedBusinesses_ engine.285: ' + id + ' already on Business_Archive (copy landed, removal did not) — removing the source row only');
      out.resumed = (out.resumed || 0) + 1;
    } else {
      var rowOut = [];
      for (var c2 = 0; c2 < 9; c2++) rowOut.push(c2 < v[q2].length ? v[q2][c2] : '');
      rowOut.push('closed', cycle, 'engine.96:' + id + ':C' + cycle, meta ? meta.closedCycle : '');
      var target = ar.getLastRow() + 1;
      ar.getRange(target, 1, 1, rowOut.length).setValues([rowOut]);
      var back = ar.getRange(target, 1, 1, rowOut.length).getValues()[0];
      if (String(back[aId] || '').trim() !== id) { Logger.log('archiveClosedBusinesses_: read-back mismatch for ' + id + ' — source row kept'); out.skipped++; continue; }
      archived[bizKey(rowOut)] = true;
    }
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
    chaosHoodSign_: chaosHoodSign_,
    bizShipOffset_: bizShipOffset_,
    bizCoverageDeviation_: bizCoverageDeviation_,
    bizVitalityMedian_: bizVitalityMedian_,
    bizNightlifeMedian_: bizNightlifeMedian_,
    bizIsBar_: bizIsBar_,
    bizHoodScores_: bizHoodScores_,       // engine.356
    bizIsFranchise_: bizIsFranchise_,     // engine.356
    applyBusinessDynamics_: applyBusinessDynamics_,
    archiveClosedBusinesses_: archiveClosedBusinesses_,
    BIZ_ARCHIVE_HEADERS: BIZ_ARCHIVE_HEADERS,
    BIZ_CLASS_MINT_REVENUE: BIZ_CLASS_MINT_REVENUE,
    BIZ_CLASS_MINT: BIZ_CLASS_MINT,
    BIZ_FIELD_BIRTH: BIZ_FIELD_BIRTH,
    bizRowFields_: bizRowFields_,
    bizHoodMix_: bizHoodMix_,
    heritageBusinessField_: heritageBusinessField_,
    heritageBusinessBirth_: heritageBusinessBirth_
  };
}
