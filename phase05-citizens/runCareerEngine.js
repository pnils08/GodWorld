/**
 * ============================================================================
 * Career Engine v2.7
 * ============================================================================
 *
 * v2.7 (S336 / employment-living-system Task 7):
 * - Field-matched rehiring: Active ENGINE adults (18-64) with a blank
 *   EmployerBizId and SkillTags are matched to hiring businesses each cycle,
 *   BEFORE the v2.6 reconciliation (hires grow stated same-cycle; the freshly
 *   fired wait a cycle — unemployment is lived). "Opening" is EXPLICIT:
 *   perCycle = Employee_Count × Growth_Rate/100 ÷ 52; floor, with small
 *   growers hiring 1 on a deterministic row-phased cadence. Same-field first
 *   (SkillTags ∋ business category via sectorCategory_); cross-field only when
 *   a window finds zero same-field candidates AND (cycle+row)%4==0, logged as
 *   Career-FieldChange. Sports orgs are opted out (Paulson's domain).
 * - Settlement (educationCareerEngine v2.2) + mint (processAdvancementIntake)
 *   stamp SkillTags at citizen creation so new citizens are matchable day one.
 *
 * v2.6 (S336 / employment-living-system Task 4):
 * - Business headcount write-back: businessDeltas now MOVE
 *   Business_Ledger.Employee_Count via queueCellIntent_ (the reverse edge —
 *   previously the signal was consumed only narratively by economicRippleEngine).
 * - Reconciliation firings: stated headcount below the Active tracked count
 *   fires the difference among tracked citizens at that business (Mike-direct
 *   S335). Each firing is a life event — LifeHistory 'Career-Layoff' entry +
 *   income cut + EmployerBizId clear — never a bare cell edit. Selection is
 *   deterministic: lowest [CareerState] level, then income, then POPID.
 * - Blank/non-numeric Employee_Count rows are skipped, never invented.
 *
 * v2.5 (S204 B2 / 2026-05-06):
 * - LifeHistory_Log batch-flush via getRange(getLastRow()+1).setValues →
 *   queueBatchAppendIntent_ (Phase 42 B2 mechanical migration). Pattern
 *   mirrors generateMediaModeEvents:468. logSheet handle + ctx.ss removed.
 *   Closes the `getLastRow() + 1` read-state-then-write hazard flagged in
 *   PHASE_42_INVENTORY §Read-state-then-write.
 *
 * Lightweight, calendar-aware, weather-aware career drift generator.
 * Only affects ENGINE-mode Tier-3 and Tier-4 non-UNI/MED/CIV citizens.
 * Never changes RoleType or Status. Updates EmployerBizId on transitions.
 * Logs soft career observations only.
 *
 * v2.4 Changes:
 * - EmployerBizId updated on career transitions (layoff→clear, sector_shift/lateral→new BIZ-ID)
 * - businessDeltas added to careerSignals for downstream Economic Ripple Engine
 * - INDUSTRY_BIZ_POOL maps abstract industries to actual Business_Ledger BIZ-IDs
 *
 * v2.3.1 Changes (retained):
 * - Simplified industry model: tech/service/public/creative (was 7)
 * - Simplified employer model: small/large/public (was 6)
 * - careerSignals wired to Economic Ripple Engine
 *
 * v2.3 Features (retained):
 * - CareerState persistence via LifeHistory line: "[CareerState] k=v|k=v..."
 * - Job transitions: promotion, lateral shift, layoff, sector shift
 * - Tenure + skill accumulation to drive career arcs
 * - Deterministic RNG via ctx.rng / ctx.config.rngSeed
 * - Batch append to LifeHistory_Log
 * - Summary outputs: ctx.summary.careerSignals (aggregates for downstream)
 *
 * v2.2 Features (retained):
 * - 12 neighborhoods, holiday notes, First Friday, Creation Day
 * - Cultural activity and community engagement modifiers
 *
 * ============================================================================
 */

/**
 * Business Sector → canonical hiring category. Lifted from inside
 * runCareerEngine_ (engine.135 D2/D4, S399) so hoodReferencePay_ in
 * generationalWealthEngine.js reads the same map. Pure. `strict` returns null
 * instead of the 'Small Business' default — used for ROLE text, where an
 * unmatched role must fall to the whole-neighborhood reference, not to the
 * corner store.
 */
function sectorCategory_(sector, strict) {
  var s = String(sector || '').toLowerCase();
  if (/sports|stadium|franchise|athletic/.test(s)) return null; // FIRST: Paulson's domain — never route hires into sports orgs, whatever else matches
  if (/\bport\b|logistic|longshore/.test(s)) return 'Port & Labor'; // \b — 'Sports' contains 'port'
  if (/construction|contractor|builder|baylight/.test(s)) return 'Construction & Baylight';
  if (/\bbiotech\b|\bhealth\b|healthcare|medical|clinic|\bhospital\b/.test(s)) return 'Healthcare'; // \bhospital\b — 'Hospitality' contains 'hospital'
  if (/tech|software|cloud|\bai\b|analytics|platform|agent|intelligence|coworking|venture|research|data/.test(s)) return 'Tech & Innovation'; // before transit: 'Cloud Infrastructure' is tech; before civic: 'Civic Tech' is tech
  if (/transit|transport|\bbus\b|bart|utilit|infrastructure/.test(s)) return 'Transit & Infrastructure';
  if (/education|school|academy|tutor/.test(s)) return 'Education';
  if (/municipal|government|civic|public|housing|social service|workforce|safety|crisis/.test(s)) return 'Government & Civic'; // before small business: 'Public Services' is civic
  if (/faith|church|temple|mosque|synagogue|congregation|ministry|community/.test(s)) return 'Faith & Community';
  if (/media|journal|gallery|entertainment|nightlife|music|design|architect|arts|theater|theatre|studio/.test(s)) return 'Creative & Arts';
  if (/legal|judicial|law|account|consult|insurance|finance|professional|capital/.test(s)) return 'Professional';
  if (/retail/.test(s)) return 'Small Business'; // before food: 'Retail & Food' is a shop, not a kitchen (matches Task 8's seed table)
  if (/restaurant|dining|cafe|coffee|bakery|food|bar\b|pub|brewery|lounge|club|market|hospitality/.test(s)) return 'Food & Culture';
  if (/shop|store|boutique|grocery|services|real estate|development/.test(s)) return 'Small Business';
  return strict ? null : 'Small Business';
}

/**
 * engine.135 E2 (S399, builder point 15): BUSINESS SUCCESS IS THE CAUSATION.
 * Per tracked business per cycle: its Growth_Rate (%/yr — the same signal that
 * already sizes its hiring windows) sets a promotion budget for its staff;
 * contraction sets a layoff budget. At most one of each per business per
 * cycle; expected across the ledger ≈ Σ |g|/5200 × staff × RARE_EVENT_SCALE
 * ≈ one Income-moving event per TEN cycles city-wide (builder doctrine point
 * 21: chance is a rare anomaly, never a cadence), steered by the city dial
 * (gapFactor: below the attractor → more promotions, fewer layoffs). Beneficiary = longest since
 * LastPromotionCycle, then lowest Income, then POPID; victim = lowest career
 * level, then lowest Income, then POPID — deterministic, one rng draw per
 * business. Promotion: Income +6–12%, LastPromotionCycle = cycle,
 * stampPromotion_ narrative (its one caller since E1). Layoff: Income −12–20%,
 * employer cleared, Career-Layoff log, businessDelta lost. Nothing free: no
 * employer, no employer event (SELF_EMPLOYED / UNTRACKED / blank are outside).
 * Sports orgs, GAME/CIVIC/MEDIA rows, Tier 1–2 and the sports layer are outside.
 */
var RARE_EVENT_SCALE = 0.1; // engine.135 doctrine point 21 — see applyEmployerSuccess_

// engine.144 (S410): the credential as ONE cause among others in the two
// employer-driven events. credentialRank_ lives in educationCareerEngine.js
// (shared Apps Script scope); a missing column or helper reads as rank 0.
// engine.145 (S411): SkillTags ∋ category, through the one alias table in
// educationCareerEngine.js (shared scope) — 'Trades' / 'The Vulnerable' /
// '2041-Specific' stand in the field a hiring business carries. Helper
// absent (unit harness) → the old exact match.
function tagsInCategory_(tags, cat) {
  if (typeof tagsMatchCategory_ === 'function') return tagsMatchCategory_(tags, cat);
  return (Array.isArray(tags) ? tags : String(tags || '').split('|')).indexOf(cat) >= 0;
}

function credentialRankOf_(row, iEdu) {
  if (!row || iEdu < 0 || typeof credentialRank_ !== 'function') return 0;
  return credentialRank_(row[iEdu]);
}

// engine.151 (S413): the rung's pay factor — tierPayFactor_ lives in
// processAdvancementIntake.js beside TIER_BAR (shared Apps Script scope); a
// missing helper or column reads as Tier 4 (×1).
function tierPayOf_(row, iTier) {
  if (!row || iTier < 0 || typeof tierPayFactor_ !== 'function') return 1;
  return tierPayFactor_(row[iTier]);
}
// The wait a promotion order ranks on: cycles since the last promotion (a
// never-promoted row waits the whole clock), × the rung's pay (engine.151).
function promotionWait_(row, iLastPromo, iTier, cycle) {
  var waited = Math.max(0, (Number(cycle) || 0) - (Number(row[iLastPromo]) || 0));
  return waited * tierPayOf_(row, iTier);
}

// E2 beneficiary order: longest since the last promotion (unchanged primary,
// engine.151: the wait carries the rung's pay), then the higher credential,
// then the lower earner, then POPID.
function promotionOrder_(rows, iLastPromo, iEdu, iIncome, iPop, iTier, cycle) {
  return function(a, b) {
    var wa = promotionWait_(rows[a], iLastPromo, iTier, cycle), wb = promotionWait_(rows[b], iLastPromo, iTier, cycle);
    if (wa !== wb) return wb - wa;
    var ea = credentialRankOf_(rows[a], iEdu), eb = credentialRankOf_(rows[b], iEdu);
    if (ea !== eb) return eb - ea;
    var ia = Number(rows[a][iIncome]) || 0, ib = Number(rows[b][iIncome]) || 0;
    if (ia !== ib) return ia - ib;
    return String(rows[a][iPop]) < String(rows[b][iPop]) ? -1 : 1;
  };
}

// E3 same-field slot order on pool entries {income, edu, pop, tier}: the poorest
// $10k band first (raw-income ties are too rare for the credential to ever
// be a lived cause), then the higher credential, then raw income, then POPID.
// engine.151: the band is taken on income ÷ the rung's pay — need still leads,
// a rung buys up to ~2 bands of queue position (a T1 at 50k queues as 33k).
function hireIncomeBand_(income, tier) {
  var pay = (typeof tierPayFactor_ === 'function') ? tierPayFactor_(tier) : 1;
  return Math.floor((Number(income) || 0) / pay / 10000);
}
function hireSlotOrder_(a, b) {
  var ba = hireIncomeBand_(a.income, a.tier), bb = hireIncomeBand_(b.income, b.tier);
  if (ba !== bb) return ba - bb;
  var ea = Number(a.edu) || 0, eb = Number(b.edu) || 0;
  if (ea !== eb) return eb - ea;
  if (a.income !== b.income) return a.income - b.income;
  return a.pop < b.pop ? -1 : 1;
}

function applyEmployerSuccess_(ctx, cycle, roll, logRows, S, gapFactor) {
  var out = { promotions: 0, layoffs: 0, businesses: 0 };
  var header = ctx.ledger && ctx.ledger.headers, rows = ctx.ledger && ctx.ledger.rows;
  if (!header || !rows || !rows.length) return out;
  var idx = function(n) { return header.indexOf(n); };
  var iPop = idx('POPID'), iFirst = idx('First'), iLast = idx('Last'), iNb = idx('Neighborhood'), iRole = idx('RoleType'),
      iIncome = idx('Income'), iEmp = idx('EmployerBizId'), iStatus = idx('Status'), iTier = idx('Tier'), iClock = idx('ClockMode'),
      iEcon = idx('EconomicProfileKey'), iLastPromo = idx('LastPromotionCycle'), iYears = idx('YearsInCareer'),
      iLife = idx('LifeHistory'), iLastUpd = idx('LastUpdated'), iEdu = idx('EducationLevel'); // engine.144
  if (iIncome < 0 || iEmp < 0) return out;
  var sheet = ctx.ss ? ctx.ss.getSheetByName('Business_Ledger') : null;
  if (!sheet) return out;
  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return out;
  var bh = data[0], bId = -1, bNm = -1, bGrow = -1, bSec = -1;
  for (var c = 0; c < bh.length; c++) {
    var hn = String(bh[c]).trim();
    if (hn === 'BIZ_ID') bId = c; else if (hn === 'Name') bNm = c; else if (hn === 'Growth_Rate') bGrow = c; else if (hn === 'Sector') bSec = c;
  }
  if (bId < 0 || bGrow < 0) return out;
  var biz = {};
  for (var r = 1; r < data.length; r++) {
    var id = String(data[r][bId] || '').trim();
    if (!id) continue;
    if (bSec >= 0 && /sports|stadium|franchise|athletic/i.test(String(data[r][bSec] || ''))) continue; // Paulson's domain
    var rawG = data[r][bGrow];
    if (rawG === '' || rawG === null || rawG === undefined) continue; // blank growth = no signal, no event
    var g = Number(rawG);
    if (isNaN(g)) continue;
    biz[id] = { name: String(bNm >= 0 ? (data[r][bNm] || id) : id), growth: g, staff: [] };
  }
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row || !Array.isArray(row)) continue;
    var emp = String(row[iEmp] || '').trim();
    if (!biz[emp]) continue;
    if (String(row[iStatus] || 'active').toLowerCase() !== 'active') continue;
    var clock = String(iClock >= 0 ? (row[iClock] || '') : '').trim().toUpperCase();
    if (clock && clock !== 'ENGINE') continue;
    var tier = iTier >= 0 ? Number(row[iTier]) : 4;
    if (tier === 1 || tier === 2) continue;
    if (iEcon >= 0 && String(row[iEcon] || '').trim() === 'SPORTS_OVERRIDE') continue;
    if ((Number(row[iIncome]) || 0) <= 0) continue;
    biz[emp].staff.push(i);
  }
  var gf = gapFactor || 1;
  var ids = Object.keys(biz).sort();
  var levelOf_ = function(row2) { var m = String(row2[iLife] || '').match(/\[CareerState\][^\n]*level=(\d+)/); return m ? Number(m[1]) : 1; };
  var byPop_ = function(a, b2) { return String(rows[a][iPop]) < String(rows[b2][iPop]) ? -1 : 1; };
  for (var k = 0; k < ids.length; k++) {
    var b = biz[ids[k]];
    if (!b.staff.length) continue;
    out.businesses++;
    var n = b.staff.length;
    // Builder doctrine point 21 (2026-08-30): the lottery of chance is RARE — a
    // true anomaly. RARE_EVENT_SCALE takes the city-wide expectation from ≈1
    // per cycle to ≈1 per ten cycles; when it fires there is an employer
    // reason behind it, but it is never a cadence a citizen can count on.
    var promoP = Math.min(0.5, Math.max(0, b.growth) / 100 / 52 * n * gf * RARE_EVENT_SCALE);
    var layoffP = Math.min(0.5, Math.max(0, -b.growth) / 100 / 52 * n / gf * RARE_EVENT_SCALE);
    var draw = roll();
    if (promoP > 0 && draw < promoP) {
      // engine.144: longest-waiting first (unchanged), then the credential — one
      // cause among others, never a gate — then the lower earner, then POPID.
      var ranked = b.staff.slice().sort(promotionOrder_(rows, iLastPromo, iEdu, iIncome, iPop, iTier, cycle));
      var who = ranked[0];
      var pRow = rows[who];
      var runnerUp = ranked.length > 1 ? rows[ranked[1]] : null;
      // engine.151: the rung counted when a lower rung had waited as long or longer on the raw clock
      var byTier = !!runnerUp && tierPayOf_(pRow, iTier) > tierPayOf_(runnerUp, iTier) &&
        (Number(runnerUp[iLastPromo]) || 0) <= (Number(pRow[iLastPromo]) || 0);
      var byCredential = !byTier && !!runnerUp &&
        promotionWait_(runnerUp, iLastPromo, iTier, cycle) === promotionWait_(pRow, iLastPromo, iTier, cycle) &&
        credentialRankOf_(runnerUp, iEdu) < credentialRankOf_(pRow, iEdu);
      var promoVerb = 'Promoted at ' + b.name +
        (byTier ? ' (Tier ' + (Math.round(Number(pRow[iTier])) || 4) + ' counted)' :
         byCredential ? ' (the ' + String(pRow[iEdu]).trim() + ' counted)' : '');
      pRow[iIncome] = Math.round((Number(pRow[iIncome]) || 0) * (1.06 + roll() * 0.06)); // +6–12%
      if (iLastPromo >= 0) pRow[iLastPromo] = cycle;
      if (typeof stampPromotion_ === 'function') {
        stampPromotion_(ctx, pRow, iLife, iLastUpd, iPop, iFirst, iLast, iNb, iRole, promoVerb, Number(pRow[iYears]) || 0, cycle);
      } else if (iLastUpd >= 0) pRow[iLastUpd] = ctx.now;
      S.careerSignals.promotions += 1;
      S.careerSignals.transitions += 1;
      S.eventsGenerated = (S.eventsGenerated || 0) + 1;
      out.promotions++;
    } else if (layoffP > 0 && draw < layoffP) {
      var victim = b.staff.slice().sort(function(a, c3) {
        var la2 = levelOf_(rows[a]), lb2 = levelOf_(rows[c3]);
        if (la2 !== lb2) return la2 - lb2;
        var ia2 = Number(rows[a][iIncome]) || 0, ib2 = Number(rows[c3][iIncome]) || 0;
        if (ia2 !== ib2) return ia2 - ib2;
        return byPop_(a, c3);
      })[0];
      var vRow = rows[victim];
      vRow[iIncome] = Math.round((Number(vRow[iIncome]) || 0) * (0.80 + roll() * 0.08)); // −12–20%, the reconciliation's cut
      vRow[iEmp] = '';
      if (iLastUpd >= 0) vRow[iLastUpd] = ctx.now;
      logRows.push([ctx.now, vRow[iPop], '', 'Career-Layoff', 'Let go as ' + b.name + ' pulled back', '', cycle]);
      if (!S.careerSignals.businessDeltas[ids[k]]) S.careerSignals.businessDeltas[ids[k]] = { gained: 0, lost: 0 };
      S.careerSignals.businessDeltas[ids[k]].lost += 1;
      S.careerSignals.layoffs += 1;
      S.careerSignals.transitions += 1;
      S.eventsGenerated = (S.eventsGenerated || 0) + 1;
      out.layoffs++;
    }
  }
  if (out.promotions || out.layoffs) ctx.ledger.dirty = true;
  S.careerSignals.employerSuccess = out;
  return out;
}

function runCareerEngine_(ctx) {

  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  // LifeHistory_Log handle removed S204 B2 — batch flushed via queueBatchAppendIntent_.
  if (!ctx.ledger) {
    throw new Error('runCareerEngine_: ctx.ledger not initialized');
  }
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return;

  var idx = function(n) { return header.indexOf(n); };

  var iPopID = idx('POPID');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iTier = idx('Tier');
  var iUNI = idx('UNI (y/n)');
  var iMED = idx('MED (y/n)');
  var iCIV = idx('CIV (y/n)');
  var iClock = idx('ClockMode');
  var iLife = idx('LifeHistory');
  var iLastUpd = idx('LastUpdated');
  var iNeighborhood = idx('Neighborhood');
  var iTierRole = idx('TierRole'); // read-only; do not write
  var iIncome = idx('Income');
  var iEconKey = idx('EconomicProfileKey');
  var iEmployerBizId = idx('EmployerBizId'); // v2.4: employer tracking
  var iEduLevel = idx('EducationLevel'); // engine.144: read by the E3 slot order, never a filter
  var iDialState = idx('DialState'); // engine.32 T5 — Drive dial -> career-event frequency
  var iCareerMobility = idx('CareerMobility'); // engine.61 wire (S321) — first reader ever
  var iStatus = idx('Status'); // engine.52 C1 — hospital status gates career activity
  var iStatusStart = idx('StatusStartCycle'); // engine.52 C1 — admission cycle for income-hit timing
  var iBirthYear = idx('BirthYear'); // engine.67 step 4 (S325) — no careers for minors
  var iCareerStage = idx('CareerStage'); // engine.67 step 4 — first reader; 'retired' set at 65 by educationCareerEngine was never consumed

  if (iPopID < 0 || iTier < 0 || iClock < 0 || iLife < 0 || iLastUpd < 0) return;

  // engine.135 E2 (S399): the city dial steers the employer-success odds —
  // below the attractor, more promotions and hiring windows, fewer layoffs;
  // above it the reverse. S.demographicDrift is Phase 3's (applyDemographicDrift_).
  var driftE2 = (ctx.summary && ctx.summary.demographicDrift) || {};
  var empGapE2 = (Number(driftE2.employmentAttractor) || 0.96) - (Number(driftE2.employmentRate) || 0.96);
  var gapFactor = Math.max(0.5, Math.min(1.5, 1 + 8 * empGapE2));

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var S = ctx.summary || (ctx.summary = {});
  var season = S.season;
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || {
    sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };
  var econMood = S.economicMood || 50;
  var cycle = S.absoluteCycle || S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;

  // v2.3: Deterministic RNG (prefer ctx.rng, else seed via mulberry32_, else Math.random)
  var rng = (typeof ctx.rng === "function")
    ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === "number" && typeof mulberry32_ === "function")
      ? mulberry32_((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0))
      : (function(){ throw new Error('runCareerEngine: ctx.rng or ctx.config.rngSeed required (Phase 40.3 Path 1)'); })();  function roll() { return rng(); }
  function chanceHit(p) { return roll() < p; }
  function pickOne(arr) { return arr[Math.floor(roll() * arr.length)]; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function safeStr(v) { return (v === null || v === undefined) ? "" : String(v); }

  var count = 0;
  var LIMIT = 10;

  // v2.3: Batch logs to avoid appendRow in loop
  var logRows = [];

  // v2.3: Downstream-friendly aggregate signals
  if (!S.careerSignals) {
    S.careerSignals = {
      cycle: cycle,
      transitions: 0,
      promotions: 0,
      layoffs: 0,
      sectorShifts: 0,
      training: 0,
      avgTenure: 0,
      avgLevel: 0,
      industries: {},
      pressure: {},
      businessDeltas: {}  // v2.4: { "BIZ-00012": { gained: 1, lost: 0 }, ... }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3: CAREER MODEL (schema-safe, persists in LifeHistory via [CareerState])
  // v2.3.1: Simplified to 4 industries, 3 employer types (cut noise)
  // ═══════════════════════════════════════════════════════════════════════════
  var INDUSTRIES = ["tech", "service", "public", "creative"];
  var EMPLOYERS = ["small", "large", "public"];

  // engine.135 E2 (S399): the S302 live BIZ-ID pools (buildLivePools_ +
  // resolveNewBizId_), the frozen v2.4 fallback pool and the season/chaos/
  // weather pressure helpers are gone with the random sector-shift / lateral /
  // promotion / layoff rolls they fed — one fewer Business_Ledger read per
  // cycle. A citizen changes employer only by a hire or a layoff now.

  function getMacroPressure_(mood) {
    if (mood >= 70) return 0.7;
    if (mood >= 60) return 0.35;
    if (mood >= 45) return 0.05;
    if (mood >= 35) return -0.25;
    return -0.65;
  }

  function parseCareerStateFromLife_(lifeStr) {
    var st = {
      industry: null,
      employer: null,
      level: 1,
      tenure: 0,
      skill: { general: 0.2 },
      incomeBand: "low",
      careerMod: 1.0,
      lastTransition: 0
    };
    if (!lifeStr) return st;
    var lines = String(lifeStr).split("\n");
    for (var i = lines.length - 1; i >= 0; i--) {
      var line = lines[i];
      if (line.indexOf("[CareerState]") >= 0) {
        var parts = line.split("[CareerState]");
        if (parts.length < 2) break;
        var payload = parts[1].trim();
        var segs = payload.split("|");
        for (var s = 0; s < segs.length; s++) {
          var seg = segs[s];
          var eq = seg.indexOf("=");
          if (eq < 0) continue;
          var k = seg.substring(0, eq).trim();
          var v = seg.substring(eq + 1).trim();
          if (k === "industry") st.industry = v || st.industry;
          else if (k === "employer") st.employer = v || st.employer;
          else if (k === "income") st.incomeBand = v || st.incomeBand;
          else if (k === "careerMod") st.careerMod = parseFloat(v) || st.careerMod;
          else if (k === "level") st.level = parseInt(v, 10) || st.level;
          else if (k === "tenure") st.tenure = parseInt(v, 10) || st.tenure;
          else if (k === "lastT") st.lastTransition = parseInt(v, 10) || st.lastTransition;
          else if (k === "skill") {
            var skills = v.split(",");
            st.skill = st.skill || {};
            for (var si = 0; si < skills.length; si++) {
              var kv = skills[si].split(":");
              if (kv.length === 2) {
                var sk = kv[0];
                var sv = parseFloat(kv[1]);
                if (sk) st.skill[sk] = isNaN(sv) ? (st.skill[sk] || 0) : sv;
              }
            }
          }
        }
        break;
      }
    }
    return st;
  }

  function encodeSkill_(skillObj) {
    var out = [];
    for (var k in skillObj) {
      if (!skillObj.hasOwnProperty(k)) continue;
      var v = skillObj[k];
      if (typeof v !== "number") continue;
      out.push(k + ":" + (Math.round(v * 100) / 100));
    }
    return out.join(",");
  }

  function inferIncomeBand_(industry, level) {
    if (industry === "tech" && level >= 3) return "high";
    if (industry === "public" && level >= 4) return "mid";
    if (industry === "creative" && level >= 4) return "mid";
    if (level >= 4) return "mid";
    return "low";
  }

  // v14.2: Career modifier derived from level + tenure (replaces band-based income)
  function deriveCareerMod_(level, tenure) {
    var levelMod = [0, 0.92, 0.96, 1.00, 1.05, 1.12][level] || 1.0;
    var tenureBonus = Math.min(tenure * 0.004, 0.05);
    return Math.round((levelMod + tenureBonus) * 100) / 100;
  }

  function pickInitialIndustry_(tierRole) {
    var tr = safeStr(tierRole).toLowerCase();
    if (tr.indexOf("artist") >= 0 || tr.indexOf("creative") >= 0 || tr.indexOf("music") >= 0) return "creative";
    if (tr.indexOf("gov") >= 0 || tr.indexOf("public") >= 0 || tr.indexOf("city") >= 0) return "public";
    if (tr.indexOf("tech") >= 0 || tr.indexOf("engineer") >= 0 || tr.indexOf("developer") >= 0) return "tech";
    // Everything else is service (retail, health, logistics, hospitality, etc.)
    return chanceHit(0.6) ? "service" : pickOne(INDUSTRIES);
  }

  function pickEmployerType_(industry) {
    if (industry === "public") return "public";
    if (industry === "creative") return chanceHit(0.65) ? "small" : "large";
    if (industry === "tech") return chanceHit(0.55) ? "small" : "large";
    // service: mostly large employers (retail chains, hospitals, hotels)
    return chanceHit(0.35) ? "small" : "large";
  }

  function chooseSkillFocus_(industry) {
    if (industry === "tech") return "systems";
    if (industry === "public") return "process";
    if (industry === "creative") return "craft";
    if (industry === "service") return "operations";
    return "general";
  }

  function addSkillXP_(st, focus, amt) {
    if (!st.skill) st.skill = {};
    st.skill.general = clamp((st.skill.general || 0) + (amt * 0.35), 0, 1);
    if (focus) st.skill[focus] = clamp((st.skill[focus] || 0) + amt, 0, 1);
  }

  // maybeTransition_ and careerMoveText_ removed (engine.135 E2, S399, builder
  // point 14 "nothing free"): the per-citizen per-cycle promotion (≤8%),
  // layoff (≤7%), sector-shift (≤5%) and lateral (≤5%) rolls — macro/season/
  // weather-pressured, employer-blind — are gone. Promotions, raises and
  // layoffs are now caused by the employer's success (applyEmployerSuccess_,
  // file scope); hires by the matcher; a chaos car by the chaos fold →
  // Employee_Count → reconciliation. What the loop below still produces is
  // career TEXTURE — a line in a life, never an Income or employer change.

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE MICRO-CAREER POOL
  // ═══════════════════════════════════════════════════════════════════════════
  var baseCareer = [
    "had a routine period at work with no major changes",
    "felt slightly more confident in their role",
    "experienced a quieter workload than usual",
    "saw minor shifts in workplace expectations",
    "received small positive feedback on daily tasks",
    "handled ordinary work responsibilities without incident"
  ];

  // v2.3: Skill/training flavor (light injection)
  var trainingPool = [
    "picked up a small skill that made the day easier",
    "learned a trick from someone who didn't explain it twice",
    "improved a routine process and kept it quiet",
    "spent time sharpening a skill that might matter later",
    "noticed how competence attracts new expectations"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONAL WORK-CYCLE PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════
  var seasonalCareer = [];
  if (season === "Winter") {
    seasonalCareer.push("noticed slower workplace activity during winter months");
    seasonalCareer.push("navigated year-end deadlines and planning");
  }
  if (season === "Spring") {
    seasonalCareer.push("experienced renewed workplace momentum");
    seasonalCareer.push("felt the energy of new fiscal year initiatives");
  }
  if (season === "Summer") {
    seasonalCareer.push("felt lighter workflow during warm-season routines");
    seasonalCareer.push("covered for vacationing colleagues");
  }
  if (season === "Fall") {
    seasonalCareer.push("encountered early autumn workload restructuring");
    seasonalCareer.push("prepared for the busy Q4 push");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER EFFECTS ON WORK RHYTHM
  // ═══════════════════════════════════════════════════════════════════════════
  var weatherCareer = [];
  if (weather.type === "rain" || weather.type === "fog") {
    weatherCareer.push("was affected by weather-related workplace slowdowns");
    weatherCareer.push("had a longer commute due to weather");
  }
  if (weather.type === "hot") {
    weatherCareer.push("felt summer heat influence workplace mood");
  }
  if (weather.type === "cold") {
    weatherCareer.push("noticed cold weather affecting commute and mood");
  }

  // Weather mood effects
  var weatherMoodCareer = [];
  if (weatherMood.irritabilityFactor && weatherMood.irritabilityFactor > 0.3) {
    weatherMoodCareer.push("noticed workplace tension from weather stress");
  }
  if (weatherMood.perfectWeather) {
    weatherMoodCareer.push("enjoyed the pleasant commute to work");
    weatherMoodCareer.push("felt energized by the beautiful weather");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS → WORKPLACE CHATTER/STRESS
  // ═══════════════════════════════════════════════════════════════════════════
  var chaosCareer = chaos.length > 0 ? [
    "noticed workplace discussion reacting to recent city events",
    "felt subtle workplace tension due to city happenings"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT → WORKPLACE MORALE
  // ═══════════════════════════════════════════════════════════════════════════
  var sentimentCareer = [];
  if (dynamics.sentiment >= 0.3) sentimentCareer.push("felt improved workplace morale");
  if (dynamics.sentiment <= -0.3) sentimentCareer.push("felt uneasy workplace atmosphere");

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC MOOD → JOB SECURITY FEELINGS
  // ═══════════════════════════════════════════════════════════════════════════
  var econCareer = [];
  if (econMood <= 35) {
    econCareer.push("felt economic uncertainty affecting workplace mood");
    econCareer.push("noticed colleagues discussing job market concerns");
  }
  if (econMood >= 65) {
    econCareer.push("sensed optimism about career opportunities");
    econCareer.push("noticed positive workplace energy from economic news");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY-SPECIFIC CAREER NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayCareer = [];

  // Long weekend holidays
  if (holiday === "MemorialDay" || holiday === "LaborDay" || holiday === "Independence") {
    holidayCareer.push("enjoyed the long weekend break from work");
    holidayCareer.push("wrapped up tasks before the holiday");
    holidayCareer.push("noticed lighter office attendance before the holiday");
  }

  // Thanksgiving
  if (holiday === "Thanksgiving") {
    holidayCareer.push("prepared for the holiday break");
    holidayCareer.push("wrapped up projects before the long weekend");
    holidayCareer.push("participated in workplace holiday potluck");
  }

  // Holiday season (Christmas)
  if (holiday === "Holiday") {
    holidayCareer.push("felt the holiday slowdown at work");
    holidayCareer.push("exchanged holiday greetings with colleagues");
    holidayCareer.push("navigated year-end administrative tasks");
  }

  // New Year
  if (holiday === "NewYear" || holiday === "NewYearsEve") {
    holidayCareer.push("set workplace goals for the new year");
    holidayCareer.push("participated in workplace new year discussions");
    holidayCareer.push("felt the fresh-start energy at work");
  }

  // Retail/service holidays
  if (holiday === "Valentine" || holiday === "MothersDay" || holiday === "FathersDay") {
    holidayCareer.push("noticed increased retail activity");
    holidayCareer.push("felt the holiday rush in service industries");
  }

  // Black Friday (day after Thanksgiving)
  if (holiday === "BlackFriday") {
    holidayCareer.push("experienced the retail rush");
    holidayCareer.push("worked extra hours during the shopping surge");
  }

  // Back to school
  if (holiday === "BackToSchool") {
    holidayCareer.push("adjusted to new school year schedules");
    holidayCareer.push("noticed the end-of-summer workplace shift");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY CAREER NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var firstFridayCareer = isFirstFriday ? [
    "made plans to attend First Friday after work",
    "felt the end-of-week creative energy",
    "left work early for First Friday art walk",
    "discussed gallery plans with coworkers"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY CAREER NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var creationDayCareer = isCreationDay ? [
    "reflected on their career journey",
    "felt connected to the reasons they started this work",
    "appreciated their place in the community",
    "sensed something meaningful about today's work"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var culturalCareer = [];
  if (dynamics.culturalActivity >= 1.4) {
    culturalCareer.push("felt inspired by the city's creative energy");
    culturalCareer.push("noticed colleagues discussing cultural events");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var communityCareer = [];
  if (dynamics.communityEngagement >= 1.3) {
    communityCareer.push("participated in workplace community initiative");
    communityCareer.push("felt connected to colleagues and neighborhood");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD WORKPLACE POOLS (12 neighborhoods - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoodCareer = {
    'Downtown': [
      "navigated the busy Downtown commute",
      "felt the energy of the business district",
      "grabbed coffee near City Hall"
    ],
    'Jack London': [
      "appreciated working near the waterfront",
      "enjoyed the Jack London district atmosphere",
      "took a lunchtime walk by the estuary"
    ],
    'Temescal': [
      "grabbed lunch at a Temescal spot near work",
      "appreciated the creative workplace environment",
      "enjoyed the neighborhood's eclectic vibe"
    ],
    'Rockridge': [
      "enjoyed the pleasant Rockridge work commute",
      "noticed the professional atmosphere",
      "stopped by College Ave shops after work"
    ],
    'West Oakland': [
      "felt the industrial workplace rhythm",
      "noticed development activity near work",
      "observed the neighborhood's evolution"
    ],
    'Fruitvale': [
      "connected with community near the workplace",
      "appreciated the neighborhood's energy",
      "grabbed lunch from a local taqueria"
    ],
    'Lake Merritt': [
      "took a lunchtime walk by the lake",
      "enjoyed the lakeside work location",
      "felt refreshed by the natural surroundings"
    ],
    'Laurel': [
      "appreciated the quiet commute through Laurel",
      "enjoyed the residential-adjacent workplace",
      "noticed the neighborhood's calm energy"
    ],
    'Uptown': [
      "felt the urban arts district workplace energy",
      "enjoyed working near galleries and theaters",
      "grabbed lunch at an Uptown spot"
    ],
    'KONO': [
      "appreciated the creative district atmosphere",
      "noticed new murals on the commute",
      "felt inspired by the neighborhood's DIY spirit"
    ],
    'Chinatown': [
      "grabbed dim sum during lunch break",
      "appreciated the bustling neighborhood energy",
      "noticed the morning market activity"
    ],
    'Piedmont Ave': [
      "enjoyed the leafy commute through Piedmont Ave",
      "appreciated the boutique district atmosphere",
      "stopped by local shops after work"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL BASE EVENT POOL
  // ═══════════════════════════════════════════════════════════════════════════
  var basePool = [].concat(
    baseCareer,
    seasonalCareer,
    weatherCareer,
    weatherMoodCareer,
    chaosCareer,
    sentimentCareer,
    econCareer,
    holidayCareer,
    firstFridayCareer,
    creationDayCareer,
    culturalCareer,
    communityCareer
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE THROUGH CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  var sumTenure = 0;
  var sumLevel = 0;
  var careerCounted = 0;

  for (var r = 0; r < rows.length; r++) {

    if (count >= LIMIT) break;

    var row = rows[r];

    var tier = Number(row[iTier] || 0);
    var mode = row[iClock] || "ENGINE";
    var isUNI = (row[iUNI] || "").toString().toLowerCase().startsWith("y");
    var isMED = (row[iMED] || "").toString().toLowerCase().startsWith("y");
    var isCIV = (row[iCIV] || "").toString().toLowerCase().startsWith("y");
    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';
    var tierRole = iTierRole >= 0 ? row[iTierRole] : "";
    var popId = row[iPopID];
    if (!popId) continue;

    // Only allow ENGINE Tier-3/4 non-UNI/MED/CIV
    if (mode !== "ENGINE") continue;
    if (tier !== 3 && tier !== 4) continue;
    if (isUNI || isMED || isCIV) continue;

    // engine.67 step 4 (S325 matrix): this engine had NO age gate (no BirthYear
    // read existed) and never consumed CareerStage — a child could draw a
    // promotion and a retiree could keep transitioning. Minors have no careers;
    // the retired are done (impossible-bar ruling, both hard gates).
    if (iBirthYear >= 0) {
      var cby = Number(row[iBirthYear]) || 0;
      if (cby > 1900 && cby < 2100 && (2041 - cby) < 18) continue;
    }
    if (iCareerStage >= 0 && String(row[iCareerStage] || "").trim().toLowerCase() === "retired") continue;

    // v2.3: Load/init career state from LifeHistory
    var existing = row[iLife] ? row[iLife].toString() : "";

    // engine.52 C1 — hospital status gates career activity. Hospitalized or
    // critical: no career rolls at all this cycle; a stay >= 2 cycles takes a
    // one-time income hit (guarded by an [IncomeHit A{admitCycle}] marker so
    // it applies once per admission).
    var healthStatus = iStatus >= 0 ? String(row[iStatus] || "active").toLowerCase().trim() : "active";
    // engine.64c (S323): traded/pending hold no Oakland career — no rolls.
    // engine.67 step 4 (S325): Status=retired joins the skip — same gate as
    // CareerStage=retired above (either signal ends the career path).
    if (healthStatus === "traded" || healthStatus === "pending" ||
        healthStatus === "deceased" || healthStatus === "retired") continue;
    if (healthStatus === "hospitalized" || healthStatus === "critical") {
      var admitC = iStatusStart >= 0 ? (Number(row[iStatusStart]) || 0) : 0;
      var hitMarker = "[IncomeHit A" + admitC + "]";
      var hospIncome = iIncome >= 0 ? (Number(row[iIncome]) || 0) : 0;
      var hospEconOk = iEconKey >= 0 && row[iEconKey] &&
        String(row[iEconKey]).trim() !== "" && String(row[iEconKey]).trim() !== "SPORTS_OVERRIDE";
      if (admitC > 0 && (cycle - admitC) >= 2 && hospIncome > 0 && hospEconOk &&
          existing.indexOf(hitMarker) < 0) {
        row[iIncome] = Math.round(hospIncome * (0.92 + roll() * 0.05)); // -3% to -8%
        var hitText = "Extended hospital stay cut into earnings";
        var hitLine = inWorldStamp_(ctx) + " — [Career-Health] " + hitText + " " + hitMarker;
        row[iLife] = existing ? (existing + "\n" + hitLine) : hitLine;
        row[iLastUpd] = ctx.now;
        logRows.push([ctx.now, row[iPopID], '', "Career-Health", hitText, '', cycle]);
        rows[r] = row;
      }
      continue;
    }

    var st = parseCareerStateFromLife_(existing);
    if (!st.industry) st.industry = pickInitialIndustry_(tierRole);
    if (!st.employer) st.employer = pickEmployerType_(st.industry);
    if (!st.level) st.level = 1;
    if (st.tenure === null || st.tenure === undefined) st.tenure = 0;

    // v2.3: Advance tenure + small skill gain
    st.tenure += 1;
    var focus = chooseSkillFocus_(st.industry);
    var xp = 0.01 + (roll() * 0.02);
    if (econMood >= 65) xp += 0.005;
    if (econMood <= 35) xp -= 0.004;
    xp = clamp(xp, 0.004, 0.04);
    addSkillXP_(st, focus, xp);

    // ═══════════════════════════════════════════════════════════════════════
    // DRIFT PROBABILITY
    // ═══════════════════════════════════════════════════════════════════════
    var chance = 0.02;

    // Weather-based noise
    if (weather.impact >= 1.3) chance += 0.01;

    // Weather mood
    if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) chance += 0.005;

    // Seasonal workplace rhythms
    if (season === "Fall") chance += 0.01;
    if (season === "Spring") chance += 0.005;

    // City sentiment
    if (dynamics.sentiment <= -0.3) chance += 0.015;

    // Economic stress increases career awareness
    if (econMood <= 35) chance += 0.01;
    if (econMood >= 65) chance += 0.005;

    // Chaos influence
    if (chaos.length > 0) chance += 0.015;

    // Holiday priority boost (v2.2)
    if (holidayPriority === "major") chance += 0.01;
    else if (holidayPriority === "minor") chance += 0.005;

    // Long weekend holidays boost (v2.2)
    if (holiday === "MemorialDay" || holiday === "LaborDay" ||
        holiday === "Thanksgiving" || holiday === "Independence") {
      chance += 0.008;
    }

    // First Friday boost (v2.2) - especially in arts neighborhoods
    if (isFirstFriday) {
      if (neighborhood === "Uptown" || neighborhood === "KONO" || neighborhood === "Jack London") {
        chance += 0.015;
      } else {
        chance += 0.005;
      }
    }

    // Creation Day boost (v2.2)
    if (isCreationDay) chance += 0.008;

    // Cultural activity boost (v2.2)
    if (dynamics.culturalActivity >= 1.4) chance += 0.005;

    // Community engagement boost (v2.2)
    if (dynamics.communityEngagement >= 1.3) chance += 0.005;

    // v2.3: Extreme macro conditions slightly increase "career notable" likelihood
    var macroP = getMacroPressure_(econMood);
    if (macroP <= -0.65 || macroP >= 0.7) chance += 0.006;

    // engine.32 T5 — Drive dial scales career-event frequency (0.5..1.5).
    // null bands (no DialState) -> base rates unchanged.
    var dialBands = getCitizenDialBands_(ctx, popId, iDialState >= 0 ? (row[iDialState] || "") : "");
    if (dialBands) chance *= dialBands.careerFreq;

    // Cap chance
    if (chance > 0.14) chance = 0.14;
    if (!chanceHit(chance)) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // BUILD CITIZEN-SPECIFIC POOL
    // ═══════════════════════════════════════════════════════════════════════
    var pool = basePool.slice();

    // Add neighborhood events
    if (neighborhood && neighborhoodCareer[neighborhood]) {
      pool = pool.concat(neighborhoodCareer[neighborhood]);
    }

    // v2.3: occasional training flavor
    if (chanceHit(0.25)) pool = pool.concat(trainingPool);

    // engine.135 E2 (S399): no free transitions here — the employer's success
    // decides promotions and layoffs (applyEmployerSuccess_, run before this
    // loop); hires are the matcher's. This loop is career texture only.
    var tEv = null;

    // Choose drift output
    var pick = null;
    var stamp = inWorldStamp_(ctx);

    // Determine event tag (v2.2)
    var eventTag = "Career";

    {
      pick = pool[Math.floor(roll() * pool.length)];
      if (firstFridayCareer.indexOf(pick) >= 0) eventTag = "Career-FirstFriday";
      else if (creationDayCareer.indexOf(pick) >= 0) eventTag = "Career-CreationDay";
      else if (holidayCareer.indexOf(pick) >= 0) eventTag = "Career-Holiday";
      else if (trainingPool.indexOf(pick) >= 0) {
        eventTag = "Career-Training";
        S.careerSignals.training += 1;
      }
    }

    // v2.3: derived income + aggregates
    st.incomeBand = inferIncomeBand_(st.industry, st.level);
    st.careerMod = deriveCareerMod_(st.level, st.tenure);
    S.careerSignals.industries[st.industry] = (S.careerSignals.industries[st.industry] || 0) + 1;

    var line = stamp + " — [" + eventTag + "] " + pick;
    var lifeOut = existing ? (existing + "\n" + line) : line;

    // v2.3: persist CareerState occasionally or always on transition
    var shouldPersistState = !!tEv || chanceHit(0.20);
    if (shouldPersistState) {
      var stateLine = stamp + " — [CareerState] " +
        "industry=" + st.industry +
        "|employer=" + st.employer +
        "|level=" + st.level +
        "|tenure=" + st.tenure +
        "|income=" + st.incomeBand +
        "|careerMod=" + st.careerMod +
        "|lastT=" + (st.lastTransition || 0) +
        "|skill=" + encodeSkill_(st.skill) +
        "|bizId=" + (iEmployerBizId >= 0 ? safeStr(row[iEmployerBizId]) : "") +
        "|Updated:c" + cycle;
      lifeOut = lifeOut + "\n" + stateLine;
    }

    row[iLife] = lifeOut;
    row[iLastUpd] = ctx.now;

    // v2.3: batch logs (no appendRow inside loop)
    logRows.push([
      ctx.now,
      row[iPopID],
      '',
      eventTag,
      pick,
      '',
      cycle
    ]);
    if (shouldPersistState) {
      logRows.push([
        ctx.now,
        row[iPopID],
        '',
        "CareerState",
        ("industry=" + st.industry + "|employer=" + st.employer + "|level=" + st.level + "|careerMod=" + st.careerMod),
        '',
        cycle
      ]);
    }

    rows[r] = row;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    count++;

    sumTenure += st.tenure;
    sumLevel += st.level;
    careerCounted += 1;
  }

  // Phase 42 §5.6: flip ctx.ledger.dirty; consolidated commit at Phase 10.
  ctx.ledger.dirty = true;

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.6 (S336, engine.83/employment-living-system Task 4): BUSINESS HEADCOUNT
  // WRITE-BACK + RECONCILIATION — the missing reverse edge. The cycle's tracked
  // movement (businessDeltas) moves Business_Ledger.Employee_Count, and a stated
  // headcount sitting BELOW the tracked count becomes firings among tracked
  // citizens (Mike-direct S335: 100→90 with 93 tracked = 3 fired). Runs before
  // the LifeHistory flush so firings ride the same batch; own try/catch so a
  // reconciliation bug can never poison the career events already generated.
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.7 (S336, employment-living-system Task 7): field-matched rehiring runs
  // BEFORE the reconciliation — its hires register businessDeltas.gained, so
  // the write-back below grows the stated headcount with each hire (the
  // business literally grew), and citizens fired by THIS cycle's reconcile
  // only become eligible next cycle: unemployment is a lived state.
  try {
    // engine.135 E2 (S399): employer success first — promotions/raises where a
    // business grows, layoffs where it shrinks — then the hiring windows.
    applyEmployerSuccess_(ctx, cycle, roll, logRows, S, gapFactor);
    matchUnemployedToOpenings_();
  } catch (matchErr) {
    Logger.log('runCareerEngine v2.7 rehire matcher failed (career events unaffected): ' + matchErr);
  }

  try {
    reconcileBusinessHeadcounts_();
  } catch (reconErr) {
    Logger.log('runCareerEngine v2.6 headcount reconciliation failed (career events unaffected): ' + reconErr);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.7 (S336, Task 7): FIELD-MATCHED REHIRING — the other half of the loop.
  // "Opening" is defined EXPLICITLY (plan Task 7 step 5): stated − tracked is
  // meaningless against a ~1:443 sample, so hiring signal = Growth_Rate.
  //   perCycle = Employee_Count × Growth_Rate/100 ÷ 52   (annual growth as cycles)
  //   openings = floor(perCycle); small growers (0 < perCycle < 1) hire 1 on a
  //   deterministic cadence: every N = clamp(round(1/perCycle), 1, 52) cycles,
  //   phase-shifted by sheet row so the whole city doesn't hire on one cycle.
  // Same-field first: candidate's SkillTags (pipe-separated category tags, the
  // 15-field taxonomy) must include the business's category. Cross-field is
  // possible but RARE — only when a hiring window found zero same-field
  // candidates AND the window's (cycle + row) % 4 === 0 — and reads as a
  // career change in LifeHistory, never a shuffle.
  // ═══════════════════════════════════════════════════════════════════════════

  // Business Sector (free text) → SkillTags category. MUST stay in vocab-sync
  // with the SkillTags backfill (S336) — canonical 15-category strings only.
  // Rule ORDER is load-bearing — audited against every live Sector string
  // (S336 bench C103 fire caught 'Cloud Infrastructure'→Transit via the
  // 'infrastructure' substring; the audit then caught 'Hospitality'→Healthcare
  // via 'hospital', and 'Public Services'/'Housing & Social Services' falling
  // to Small Business because 'services' outran the civic rule).
  // sectorCategory_ lifted to file scope (engine.135 D2/D4, S399) — pure;
  // hoodReferencePay_ in generationalWealthEngine.js reads the same map.

  function matchUnemployedToOpenings_() {
    if (iEmployerBizId < 0) return;
    var iTags = idx('SkillTags');
    if (iTags < 0) { Logger.log('v2.7 rehire matcher skipped: SkillTags column missing'); return; }

    var bizSheet = ctx.ss ? ctx.ss.getSheetByName('Business_Ledger') : null;
    if (!bizSheet) return;
    var bizData = bizSheet.getDataRange().getValues();
    if (bizData.length < 2) return;
    var bh = bizData[0];
    var bId = -1, bNm = -1, bCount = -1, bSec = -1, bGrow = -1;
    for (var hc = 0; hc < bh.length; hc++) {
      var hn = String(bh[hc]).trim();
      if (hn === 'BIZ_ID') bId = hc;
      else if (hn === 'Name') bNm = hc;
      else if (hn === 'Employee_Count') bCount = hc;
      else if (hn === 'Sector') bSec = hc;
      else if (hn === 'Growth_Rate') bGrow = hc;
    }
    if (bId < 0 || bCount < 0 || bGrow < 0) return;

    // ── the unemployed pool: Active ENGINE adults (18-64), no employer, tagged ──
    var simYear = simYearOf_(ctx, cycle);
    var pool = [];
    for (var ur = 0; ur < rows.length; ur++) {
      var uRow = rows[ur];
      if (safeStr(uRow[iStatus]).trim() !== 'Active') continue;
      if (safeStr(uRow[iClock]).trim() === 'GAME') continue;
      // engine.135 E3 (S401, builder direction points 5/14 — every old system
      // forcing employment ends): only a citizen WITHOUT a job is a candidate.
      // UNTRACKED means employed at an off-ledger business — the S357 rule that
      // let the matcher lift them out of that job into a tracked one was a
      // standing job-hop with no event behind it (≈7 lives/cycle on the bench).
      var uEmp = safeStr(uRow[iEmployerBizId]).trim();
      if (uEmp !== '') continue;
      if (iEconKey >= 0 && safeStr(uRow[iEconKey]).trim() === 'SPORTS_OVERRIDE') continue;
      var uBy = Number(uRow[iBirthYear]) || 0;
      if (uBy > 0) { var uAge = simYear - uBy; if (uAge < 18 || uAge >= 65) continue; }
      var tags = safeStr(uRow[iTags]).trim();
      if (!tags) continue; // untagged citizens aren't matchable — blank is honest
      pool.push({ r: ur, tags: tags.split('|'), income: Number(uRow[iIncome]) || 0, pop: safeStr(uRow[iPopID]),
        edu: iEduLevel >= 0 ? credentialRankOf_(uRow, iEduLevel) : 0, eduLabel: iEduLevel >= 0 ? safeStr(uRow[iEduLevel]).trim() : '',
        tier: Math.round(Number(uRow[iTier])) || 4 }); // engine.151: the rung pays on the slot order
    }
    if (!pool.length) return;

    // ── hiring windows, deterministic business order (sheet order) ──
    var hired = 0, crossField = 0;
    var taken = {}; // pool index → true
    for (var br3 = 1; br3 < bizData.length; br3++) {
      var stated = Number(bizData[br3][bCount]);
      var growth = Number(bizData[br3][bGrow]);
      if (isNaN(stated) || isNaN(growth) || growth <= 0 || stated <= 0) continue;
      var bizId2 = String(bizData[br3][bId] || '').trim();
      if (!bizId2) continue;
      var cat = sectorCategory_(bSec >= 0 ? bizData[br3][bSec] : '');
      if (!cat) continue; // sports orgs opted out

      var perCycle = (stated * growth / 100) / 52 * gapFactor; // engine.135 E2: dial-steered
      var openings = Math.floor(perCycle);
      if (openings < 1 && perCycle > 0) {
        var cadence = Math.max(1, Math.min(52, Math.round(1 / perCycle)));
        if ((Number(cycle) + br3) % cadence === 0) openings = 1;
      }
      if (openings < 1) continue;

      // same-field candidates first: SkillTags carry the business's category
      var sameField = [];
      for (var pi = 0; pi < pool.length; pi++) {
        if (taken[pi]) continue;
        if (tagsInCategory_(pool[pi].tags, cat)) sameField.push(pi); // engine.145: aliased catalog tags count
      }
      // engine.144: poorest band first, then the credential (one cause, not a gate)
      sameField.sort(function (a, b4) { return hireSlotOrder_(pool[a], pool[b4]); });

      var slots = sameField.slice(0, openings);
      var leftOut = sameField.length > openings ? pool[sameField[openings]] : null;
      // engine.135 E3 (S401): the cross-field fallback is gone. "Rare" was a
      // 1-in-4 window PER BUSINESS — across ~180 businesses it fired 5–10
      // times a cycle, hiring an electrician at a bar and a line cook at a tech
      // firm. A field change is a story in a life, never a filler for an open
      // slot. A business with no same-field candidate keeps the slot open.

      for (var sv = 0; sv < slots.length; sv++) {
        var hIdx = slots[sv];
        var hRow = rows[pool[hIdx].r];
        var isCross = !tagsInCategory_(pool[hIdx].tags, cat);
        hRow[iEmployerBizId] = bizId2;
        var hInc = Number(hRow[iIncome]) || 0;
        if (hInc > 0) {
          // same-field rehire recovers ground (+5-10%); a career change starts flatter
          hRow[iIncome] = Math.round(hInc * (isCross ? (0.95 + roll() * 0.10) : (1.05 + roll() * 0.05)));
        }
        hRow[iLastUpd] = ctx.now;
        var bizName = String(bNm >= 0 ? (bizData[br3][bNm] || bizId2) : bizId2);
        logRows.push([
          ctx.now, hRow[iPopID], '',
          isCross ? 'Career-FieldChange' : 'Career-Hired',
          isCross
            ? 'Changed fields — hired at ' + bizName + ' (' + cat + ')'
            : 'Hired at ' + bizName + (
                // engine.151: the rung counted when the one left out was poorer on the raw band
                (leftOut && hireIncomeBand_(leftOut.income, 4) < hireIncomeBand_(pool[hIdx].income, 4))
                  ? ' (Tier ' + pool[hIdx].tier + ' counted)' :
                (leftOut && hireIncomeBand_(leftOut.income, leftOut.tier) === hireIncomeBand_(pool[hIdx].income, pool[hIdx].tier) &&
                 (Number(leftOut.edu) || 0) < (Number(pool[hIdx].edu) || 0) && pool[hIdx].eduLabel)
                  ? ' (the ' + pool[hIdx].eduLabel + ' counted)' : ''),
          '', cycle
        ]);
        if (!S.careerSignals.businessDeltas[bizId2]) S.careerSignals.businessDeltas[bizId2] = { gained: 0, lost: 0 };
        S.careerSignals.businessDeltas[bizId2].gained += 1; // reconcile below grows stated with the hire
        S.careerSignals.transitions += 1;
        S.eventsGenerated = (S.eventsGenerated || 0) + 1;
        taken[hIdx] = true;
        hired++;
        if (isCross) crossField++;
      }
    }

    S.careerSignals.rehires = { hired: hired, crossField: crossField, unemployedPool: pool.length };
    Logger.log('runCareerEngine v2.7 rehire matcher: ' + hired + ' hired (' + crossField +
      ' career changes) from unemployed pool of ' + pool.length);
  }

  function reconcileBusinessHeadcounts_() {
    var deltas = S.careerSignals.businessDeltas || {};
    var bizSheet = ctx.ss ? ctx.ss.getSheetByName('Business_Ledger') : null;
    if (!bizSheet) { Logger.log('v2.6 headcount write-back skipped: Business_Ledger not found'); return; }
    var bizData = bizSheet.getDataRange().getValues();
    if (bizData.length < 2) return;
    var bh = bizData[0];
    var bId = -1, bNm = -1, bCount = -1;
    for (var bc2 = 0; bc2 < bh.length; bc2++) {
      var hName = String(bh[bc2]).trim();
      if (hName === 'BIZ_ID') bId = bc2;
      else if (hName === 'Name') bNm = bc2;
      else if (hName === 'Employee_Count') bCount = bc2;
    }
    if (bId < 0 || bCount < 0) { Logger.log('v2.6 headcount write-back skipped: BIZ_ID/Employee_Count column missing'); return; }

    // BIZ_ID -> { sheetRow (1-based), name, stated (number | null when blank) }
    var biz = {};
    for (var br2 = 1; br2 < bizData.length; br2++) {
      var bizIdVal = String(bizData[br2][bId] || '').trim();
      if (!bizIdVal) continue;
      var rawCount = bizData[br2][bCount];
      var stated = (rawCount === '' || rawCount === null || rawCount === undefined || isNaN(Number(rawCount)))
        ? null : Number(rawCount);
      biz[bizIdVal] = {
        sheetRow: br2 + 1,
        name: String(bNm >= 0 ? (bizData[br2][bNm] || bizIdVal) : bizIdVal),
        stated: stated
      };
    }

    // ── Half 1: write-back. Tracked movement IS the business moving (1:443
    // qualitative representation) — net delta lands on Employee_Count via
    // write-intents (Phase 10 commits). Blank/non-numeric counts are SKIPPED,
    // never invented — completing those rows is the living-system plan's Task 1.
    var applied = 0, skippedBlank = 0;
    for (var dBizId in deltas) {
      var d = deltas[dBizId];
      var net = (d.gained || 0) - (d.lost || 0);
      if (!net) continue;
      var bRec = biz[dBizId];
      if (!bRec) continue; // SELF_EMPLOYED / UNMATCHED / unknown id — no row, no write
      if (bRec.stated === null) { skippedBlank++; continue; }
      bRec.stated = Math.max(0, bRec.stated + net);
      queueCellIntent_(ctx, 'Business_Ledger', bRec.sheetRow, bCount + 1, bRec.stated,
        'career-engine headcount write-back (' + (d.gained || 0) + ' hired, ' + (d.lost || 0) + ' left)', 'citizens');
      applied++;
    }

    // ── Half 2: reconciliation. Stated below tracked is the ONE illegal state;
    // the difference becomes firings among Active tracked citizens at that
    // business. Firing is a life event — LifeHistory entry + income hit +
    // employer clear — never a bare cell edit. Selection is deterministic and
    // defensible: lowest career level (from the [CareerState] line) first, then
    // lowest income, then POPID — replayable with no rng draw.
    var trackedBy = {};
    for (var tr2 = 0; tr2 < rows.length; tr2++) {
      if (safeStr(rows[tr2][iStatus]).trim() !== 'Active') continue;
      var eb = safeStr(rows[tr2][iEmployerBizId]).trim();
      if (eb.indexOf('BIZ-') !== 0) continue;
      (trackedBy[eb] = trackedBy[eb] || []).push(tr2);
    }
    function careerLevelOf_(row2) {
      var m = safeStr(row2[iLife]).match(/\[CareerState\][^\n]*level=(\d+)/);
      return m ? Number(m[1]) : 1;
    }
    var fired = 0, contracted = 0;
    for (var fBizId in trackedBy) {
      var fInfo = biz[fBizId];
      if (!fInfo || fInfo.stated === null) continue;
      var shortfall = trackedBy[fBizId].length - fInfo.stated;
      if (shortfall <= 0) continue;
      var victims = trackedBy[fBizId].slice().sort(function(a, b2) {
        var la = careerLevelOf_(rows[a]), lb = careerLevelOf_(rows[b2]);
        if (la !== lb) return la - lb;
        var ia = Number(rows[a][iIncome]) || 0, ib = Number(rows[b2][iIncome]) || 0;
        if (ia !== ib) return ia - ib;
        return safeStr(rows[a][iPopID]) < safeStr(rows[b2][iPopID]) ? -1 : 1;
      }).slice(0, Math.min(shortfall, 2)); // engine.135 E2: rate-limited — at most 2 firings per business per cycle; the rest next cycle
      for (var fv = 0; fv < victims.length; fv++) {
        var vRow = rows[victims[fv]];
        var vIncome = (iIncome >= 0) ? (Number(vRow[iIncome]) || 0) : 0;
        if (vIncome > 0) vRow[iIncome] = Math.round(vIncome * (0.80 + roll() * 0.08)); // same cut as the layoff path
        vRow[iEmployerBizId] = '';
        vRow[iLastUpd] = ctx.now;
        logRows.push([
          ctx.now, vRow[iPopID], '', 'Career-Layoff',
          'Lost their job when ' + fInfo.name + ' cut ' + shortfall + ' position' + (shortfall > 1 ? 's' : ''),
          '', cycle
        ]);
        if (!S.careerSignals.businessDeltas[fBizId]) S.careerSignals.businessDeltas[fBizId] = { gained: 0, lost: 0 };
        S.careerSignals.businessDeltas[fBizId].lost += 1; // Phase-6 ripple sees the contraction; stated is already reconciled
        S.careerSignals.layoffs += 1;
        S.careerSignals.transitions += 1;
        S.eventsGenerated = (S.eventsGenerated || 0) + 1;
        fired++;
      }
      contracted++;
    }

    S.careerSignals.headcountWriteBack = {
      applied: applied, skippedBlank: skippedBlank, fired: fired, businessesContracted: contracted
    };
    Logger.log('runCareerEngine v2.6 headcount: ' + applied + ' businesses moved, ' + skippedBlank +
      ' skipped (blank Employee_Count), ' + fired + ' reconciliation firings across ' + contracted + ' businesses');
  }

  // v2.5: flush batched logs via Phase 10 executor.
  if (logRows.length > 0) {
    queueBatchAppendIntent_(ctx, 'LifeHistory_Log', logRows,
      'career event log entries', 'citizens', 200);
  }

  // Summary
  S.careerEvents = count;
  if (careerCounted > 0) {
    S.careerSignals.avgTenure = Math.round((sumTenure / careerCounted) * 100) / 100;
    S.careerSignals.avgLevel = Math.round((sumLevel / careerCounted) * 100) / 100;
  }
  S.careerSignals.cycle = cycle;
  ctx.summary = S;
}


/**
 * ============================================================================
 * CAREER EVENT REFERENCE v2.3.1
 * ============================================================================
 *
 * Event Tags:
 * - Career: Base career drift events
 * - Career-FirstFriday: Art walk related
 * - Career-CreationDay: Foundational reflection
 * - Career-Holiday: Holiday-specific work events
 * - Career-Transition: job transitions (promotion/layoff/lateral/shift)
 * - Career-Training: skill development events
 * - CareerState: persistent state snapshot (logged separately)
 *
 * Career State (persisted in LifeHistory):
 * - industry: tech/service/public/creative (v2.3.1 simplified)
 * - employer: small/large/public (v2.3.1 simplified)
 * - level: 1-5 (career progression)
 * - tenure: cycles in current role
 * - skill: general + industry-specific (0-1)
 * - incomeBand: low/mid/high (derived)
 *
 * Downstream Signals (ctx.summary.careerSignals):
 * - transitions/promotions/layoffs/sectorShifts/training counts
 * - avgTenure/avgLevel across processed citizens
 * - industries: count per industry
 * - pressure: industry pressure snapshot (-1 to +1)
 *
 * Integration:
 * - Economic Ripple Engine reads careerSignals.layoffs to trigger MAJOR_LAYOFFS
 * - compressLifeHistory protects [CareerState] lines from trim
 *
 * ============================================================================
 */
