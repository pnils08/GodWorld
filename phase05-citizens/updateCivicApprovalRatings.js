/**
 * ============================================================================
 * updateCivicApprovalRatings_ v1.5 (ES5)
 * ============================================================================
 * [engine/sheet] — Phase 27 civic feedback loop
 *
 * v1.1 (S204 B2 / 2026-05-06):
 * - Approval cell writes routed through queueCellIntent_ (Phase 42 B2). Prior
 *   pattern: per-change ledgerSheet.getRange(c.row, iApproval+1).setValue
 *   (direct sheet write, documented exception). Now queues per-cell intents
 *   committed at Phase 10. isDryRun guard preserved.
 *
 * v1.2 (engine.94 Task 5 / 2026-08-09):
 * - Adds the World_Config-driven sustained-high-approval ceiling.
 * - Persists per-office streak + owned scandal lifecycle in Civic_Office_Ledger.
 * - Emits a deterministic story/ripple hook and an immediate approval drop
 *   when the seeded scandal roll fires. Manual scandal statuses are untouched.
 *
 * v1.3 (Mike-direct 2026-08-13): C103 proof — 6 unfinished initiatives,
 * Mayor clamped at 95. Live-sounding phases were scored as wins. Now:
 * nothing is free, only `complete` credits, non-committal never raises,
 * silence (overdue NextActionCycle / no scheduled action) is the biggest drain.
 *
 * Updates Civic_Office_Ledger Approval column based on:
 * 1. Did they MOVE the initiative this cycle (complete / chose-fail / sit / silence)
 * 2. Negative edition coverage (positive coverage no longer pays)
 * 3. High-approval decay toward 50 (no free recovery when low)
 *
 * Approval thresholds create behavioral triggers:
 *   > 80: "popular" — more influence on swing votes
 *   40-80: normal range
 *   < 40: "vulnerable" — more cautious voting (existing veto logic)
 *   < 20: "recall-pressure" — and they leave office (v1.4)
 *
 * v1.4 (Mike-direct 2026-08-13): approval is in-world fitness AND out-of-world
 * cron fitness. A low number means this citizen/node is not built to run the
 * city. Repeated refusal to move the sim removes them from office — the cron
 * that will not push is not kept in the chair. Status=vacant, Holder=TBD,
 * VotingPower=vacant. Media covers the departure, not the stall.
 *
 * v1.5 (Mike-direct 2026-08-13): demotion, not election. Crossing 40 starts a
 * citizen campaign (deterministic challenger from the ledger). Crossing 20
 * seats that challenger. No election window. The vote is the drop.
 *
 * v1.6: never leave a seat empty by default. In-ledger bar is the 8 dials
 * (Drive to want it, Integrity to hold it, Composure to sit it) plus adult
 * non-T1 non-CIV. Generic_Citizens is a name/occupation feeder. If neither
 * presents, mint an out-of-town arrival with civic-challenger dial defaults.
 * Vacant is only the designed crisis when the ledger itself is missing.
 *
 * Runs in Phase 5 after civicInitiativeEngine_.
 *
 * ============================================================================
 */

// civic.18 4d (S423) — the district→hood edge is read from Neighborhood_Map's
// District column through getDistrictHoods_ (canonNeighborhoodLoader, Phase 1).
// The literal that lived here had drifted from the ledger: KONO under D2 (sheet:
// D7), Coliseum/Elmhurst/Montclair listed with no row. Geography correction only
// — the scoring arithmetic is unchanged (S406 ruling: approval scoring stays).

function getApprovalCeilingConfig_(ctx) {
  if (ctx && ctx._approvalCeilingConfig) return ctx._approvalCeilingConfig;
  var source = ctx && ctx.config;
  if (!source) throw new Error('approval ceiling: ctx.config required');

  var required = function(key, min, max, integer) {
    var raw = source[key];
    var value = Number(raw);
    if (raw === '' || raw === null || raw === undefined || !isFinite(value) ||
        value < min || value > max || (integer && Math.floor(value) !== value)) {
      throw new Error('approval ceiling: invalid or missing World_Config.' + key);
    }
    return value;
  };

  var config = {
    threshold: required('approvalCeilingThreshold', 1, 100, false),
    minStreakCycles: required('approvalCeilingMinStreakCycles', 1, 1000, true),
    baseChance: required('approvalCeilingBaseChance', 0, 1, false),
    chanceStep: required('approvalCeilingChanceStep', 0, 1, false),
    maxChance: required('approvalCeilingMaxChance', 0, 1, false),
    scandalDurationCycles: required('approvalCeilingScandalDurationCycles', 1, 1000, true),
    approvalDrop: required('approvalCeilingApprovalDrop', 0, 100, false),
    electionPenalty: required('approvalCeilingElectionPenalty', 0, 100, false)
  };
  if (config.baseChance > config.maxChance) {
    throw new Error('approval ceiling: World_Config.approvalCeilingBaseChance exceeds approvalCeilingMaxChance');
  }
  if (ctx) ctx._approvalCeilingConfig = config;
  return config;
}

/**
 * engine.213 (S455, Mike-direct 2026-09-13): approval reads the CITY, not the
 * tracker. An official is an actor tasked with their district (the Mayor: the
 * city); the number moves on the state of what they hold — hood sentiment,
 * retail, crime, momentum against the city's own middle — plus the week's press
 * across every desk, plus civic motion. Before this, the grade read three
 * inputs: the initiative tracker (sitting cost every cycle), a civic-only media
 * rating that never reached its ±2 step, and decay. At C106 every hood was
 * positive, employment 93.8%, five desks rated the week +3..+5 — and every
 * official fell. Bands are relative to the city middle (§15): they cannot rot
 * into a one-way gate when the scale moves.
 */
function getApprovalStateConfig_(ctx) {
  if (ctx && ctx._approvalStateConfig) return ctx._approvalStateConfig;
  var source = ctx && ctx.config;
  if (!source) throw new Error('approval state: ctx.config required');
  var required = function(key, min, max) {
    var raw = source[key];
    var value = Number(raw);
    if (raw === '' || raw === null || raw === undefined || !isFinite(value) || value < min || value > max) {
      throw new Error('approval state: invalid or missing World_Config.' + key);
    }
    return value;
  };
  var config = {
    levelBase: required('approvalLevelBase', 10, 95),
    inertia: required('approvalLevelInertia', 0.05, 1),
    gainDistrict: required('approvalStateGainDistrict', 0, 30),
    gainCity: required('approvalStateGainCity', 0, 30),
    gainPress: required('approvalStateGainPress', 0, 15),
    councilCityShare: required('approvalStateCouncilCityShare', 0, 1),
    citySentimentUnit: required('approvalStateCitySentimentUnit', 0.01, 1),
    moodSmoothing: required('approvalMoodSmoothing', 0.05, 1),
    mediaStep1: required('approvalMediaStep1', 0.1, 5),
    mediaStep2: required('approvalMediaStep2', 0.1, 5)
  };
  if (config.mediaStep1 > config.mediaStep2) throw new Error('approval state: World_Config.approvalMediaStep1 exceeds approvalMediaStep2');
  if (ctx) ctx._approvalStateConfig = config;
  return config;
}

// Relative ordering only (see the level block): direction first, then crime,
// then mood, and a quarter of retail — retail is the business ledger's job and
// reads structurally low on a construction site or a residential hood.
var APPROVAL_STATE_MEASURES_ = [
  { key: 'trajectoryMomentum', sign: 1, weight: 1.5 },
  { key: 'crimeIndex', sign: -1, weight: 1 },
  { key: 'sentiment', sign: 1, weight: 1 },
  { key: 'retailVitality', sign: 1, weight: 0.25 }
];

/** District residents' mood, absolute: mean SMOOTHED hood sentiment in citySentimentUnit units, clamped [-2, 2]. */
function districtMoodLevel_(S, hoods, cfg) {
  return moodLevelOf_(S, hoods, cfg);
}

/**
 * City middle per measure over every hood with a number: mean + spread. The
 * spread floor (10% of |mean|, min 0.05) stops a flat city from turning noise
 * into a full-scale band.
 */
function cityStateMiddle_(S) {
  var ns = (S && S.neighborhoodState) || {};
  var out = { hoods: 0, measures: {} };
  var hoodNames = Object.keys(ns);
  for (var m = 0; m < APPROVAL_STATE_MEASURES_.length; m++) {
    var key = APPROVAL_STATE_MEASURES_[m].key;
    var vals = [];
    for (var h = 0; h < hoodNames.length; h++) {
      var v = ns[hoodNames[h]] && ns[hoodNames[h]][key];
      if (typeof v === 'number' && isFinite(v)) vals.push(v);
    }
    if (!vals.length) continue;
    var sum = 0;
    for (var i = 0; i < vals.length; i++) sum += vals[i];
    var mean = sum / vals.length;
    var sq = 0;
    for (var j = 0; j < vals.length; j++) sq += (vals[j] - mean) * (vals[j] - mean);
    var sd = Math.sqrt(sq / vals.length);
    var floor = Math.max(0.05, Math.abs(mean) * 0.1);
    out.measures[key] = { mean: mean, sd: sd < floor ? floor : sd, n: vals.length };
    if (vals.length > out.hoods) out.hoods = vals.length;
  }
  return out;
}

/** One hood against the city middle, in [-2, 2]. null when the hood has no numbers. */
function hoodStateComposite_(hoodState, middle) {
  if (!hoodState || !middle || !middle.measures) return null;
  var acc = 0, wsum = 0;
  for (var m = 0; m < APPROVAL_STATE_MEASURES_.length; m++) {
    var spec = APPROVAL_STATE_MEASURES_[m];
    var mid = middle.measures[spec.key];
    var v = hoodState[spec.key];
    if (!mid || typeof v !== 'number' || !isFinite(v)) continue;
    var rel = (v - mid.mean) / mid.sd * spec.sign;
    if (rel > 2) rel = 2;
    if (rel < -2) rel = -2;
    acc += rel * spec.weight;
    wsum += spec.weight;
  }
  if (!wsum) return null;
  return acc / wsum;
}

/** District score = mean composite of its hoods, in [-2, 2]; null if none scored. */
function districtStateScore_(S, hoods, middle) {
  var ns = (S && S.neighborhoodState) || {};
  var acc = 0, n = 0;
  for (var i = 0; i < hoods.length; i++) {
    var c = hoodStateComposite_(ns[hoods[i]], middle);
    if (c === null) continue;
    acc += c; n++;
  }
  return n ? acc / n : null;
}

/**
 * Smoothed mood per hood: an EMA of Neighborhood_Map Sentiment carried across
 * Cycles (previousCycleState.approvalHoodMoodEma, gated to exactly one Cycle
 * old like initiativePhases). City sentiment sawtooths ±0.5 Cycle to Cycle
 * (engine.165: live C95–C106 ran 0.59 0.70 0.23 0.63 0.80 0.21 0.00 0.44 0.42
 * 0.84 0.25); a poll answers from a season, not a week. First Cycle, or a
 * stale carry: the EMA starts at the current read.
 */
function hoodMoodEma_(S, cfg, cycle) {
  var ns = (S && S.neighborhoodState) || {};
  var prevState = (S && S.previousCycleState) || {};
  var prev = (Number(prevState.cycle) === Number(cycle) - 1 && prevState.approvalHoodMoodEma) ? prevState.approvalHoodMoodEma : null;
  var a = cfg.moodSmoothing;
  var out = {};
  for (var h in ns) {
    if (!ns.hasOwnProperty(h)) continue;
    var v = ns[h] && ns[h].sentiment;
    if (typeof v !== 'number' || !isFinite(v)) continue;
    var p = prev && typeof prev[h] === 'number' && isFinite(prev[h]) ? prev[h] : null;
    out[h] = p === null ? v : p + (v - p) * a;
  }
  return out;
}

function moodLevelOf_(S, hoods, cfg) {
  var ema = (S && S.approvalHoodMoodEma) || {};
  var acc = 0, n = 0;
  for (var i = 0; i < hoods.length; i++) {
    var v = ema[hoods[i]];
    if (typeof v === 'number' && isFinite(v)) { acc += v; n++; }
  }
  if (!n) return null;
  var s = (acc / n) / cfg.citySentimentUnit;
  if (s > 2) s = 2;
  if (s < -2) s = -2;
  return s;
}

/**
 * City mood: mean smoothed hood sentiment in units of citySentimentUnit,
 * clamped [-2, 2]. The city's own level, not a relative band — the Mayor
 * holds the whole city, so "against the middle" would always read zero.
 */
function cityStateScore_(S, cfg) {
  return moodLevelOf_(S, Object.keys((S && S.approvalHoodMoodEma) || {}), cfg);
}

/**
 * The week's press: civic desk and the whole paper, blended half and half.
 * Graded on the range the ratings actually occupy (C92–C106 CIVIC ran -3..+3):
 * |score| ≥ step1 → ±1, ≥ step2 → ±2. null when no edition was rated.
 */
function mediaScore_(domainBalance) {
  var civic = null, sum = 0, n = 0;
  for (var k in domainBalance) {
    if (!domainBalance.hasOwnProperty(k)) continue;
    var r = domainBalance[k] && domainBalance[k].rating;
    if (r === undefined || r === null || !isFinite(Number(r))) continue;
    sum += Number(r); n++;
    if (k === 'CIVIC') civic = Number(r);
  }
  if (!n) return null;
  var all = sum / n;
  return civic === null ? all : (civic + all) / 2;
}

function mediaDelta_(score, cfg) {
  if (score === null || score === undefined) return 0;
  var a = Math.abs(score);
  if (a >= cfg.mediaStep2) return score > 0 ? 2 : -2;
  if (a >= cfg.mediaStep1) return score > 0 ? 1 : -1;
  return 0;
}

function resolveApprovalCeilingLifecycle_(state, cycle) {
  var out = {
    status: String(state.status || '').toLowerCase(),
    highStreak: Math.max(0, Math.floor(Number(state.highStreak) || 0)),
    untilCycle: state.untilCycle === '' || state.untilCycle === null || state.untilCycle === undefined ? '' : Number(state.untilCycle),
    source: String(state.source || ''),
    blocked: false,
    recovered: false,
    staleOwnedStateCleared: false
  };

  if (out.source === 'approval-ceiling') {
    if (out.status === 'scandal') {
      if (!isFinite(out.untilCycle) || Math.floor(out.untilCycle) !== out.untilCycle) {
        throw new Error('approval ceiling: invalid AutoScandalUntilCycle');
      }
      if (cycle > out.untilCycle) {
        out.status = 'active';
        out.highStreak = 0;
        out.untilCycle = '';
        out.source = '';
        out.recovered = true;
      } else {
        out.highStreak = 0;
        out.blocked = true;
        return out;
      }
    } else {
      // Another writer changed Status. Clear only state owned by this mechanic;
      // never overwrite the external/manual status.
      out.highStreak = 0;
      out.untilCycle = '';
      out.source = '';
      out.staleOwnedStateCleared = true;
    }
  }

  if (out.status !== 'active' && out.status !== 'recovering') {
    out.highStreak = 0;
    out.blocked = true;
  }
  return out;
}

function applyApprovalCeilingRisk_(state, config, rng) {
  var out = {
    cycle: state.cycle,
    status: state.status,
    approval: state.approval,
    highStreak: state.highStreak,
    untilCycle: state.untilCycle,
    source: state.source,
    chance: 0,
    roll: null,
    triggered: false
  };

  if (out.status !== 'active') {
    out.highStreak = 0;
    return out;
  }
  out.highStreak = out.approval >= config.threshold ? out.highStreak + 1 : 0;
  if (out.highStreak < config.minStreakCycles) return out;

  out.chance = Math.min(config.maxChance,
    (config.baseChance + (out.highStreak - config.minStreakCycles) * config.chanceStep) * (state.chanceMult > 0 ? state.chanceMult : 1)); // engine.178: the holder's integrity
  out.roll = rng();
  if (out.roll >= out.chance) return out;

  out.triggered = true;
  out.approval = Math.max(10, out.approval - config.approvalDrop);
  out.status = 'scandal';
  out.highStreak = 0;
  out.untilCycle = out.cycle + config.scandalDurationCycles - 1;
  out.source = 'approval-ceiling';
  return out;
}

function updateCivicApprovalRatings_(ctx) {
  var S = ctx.summary;
  if (!S) S = ctx.summary = {};

  S.approvalChanges = [];
  S.approvalCeilingEvents = [];
  S.officeDepartures = [];
  S.civicCampaigns = [];

  var ceilingConfig = getApprovalCeilingConfig_(ctx);
  var stateConfig = getApprovalStateConfig_(ctx);   // engine.213
  var rng = safeRand_(ctx);
  var cycle = Number(S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0);

  var ss = ctx.ss;
  if (!ss) return;

  var isDryRun = ctx.mode && ctx.mode.dryRun;

  // ═══════════════════════════════════════════════════════════════════════════
  // READ CIVIC OFFICE LEDGER
  // ═══════════════════════════════════════════════════════════════════════════

  var ledgerSheet = ss.getSheetByName('Civic_Office_Ledger');
  if (!ledgerSheet) {
    Logger.log('updateCivicApprovalRatings_ v1.0: Civic_Office_Ledger not found');
    return;
  }

  var ledgerData = ledgerSheet.getDataRange().getValues();
  if (ledgerData.length < 2) return;

  var lHeaders = ledgerData[0];
  var iOfficeId = findApprCol_(lHeaders, ['OfficeId', 'officeid']);
  var iTitle = findApprCol_(lHeaders, ['Title', 'title']);
  var iDistrict = findApprCol_(lHeaders, ['District', 'district']);
  var iHolder = findApprCol_(lHeaders, ['Holder', 'holder']);
  var iPopId = findApprCol_(lHeaders, ['PopId', 'popid']);
  var iStatus = findApprCol_(lHeaders, ['Status', 'status']);
  var iApproval = findApprCol_(lHeaders, ['Approval', 'approval']);
  var iFaction = findApprCol_(lHeaders, ['Faction', 'faction']);
  var iHighStreak = findApprCol_(lHeaders, ['HighApprovalStreak', 'highapprovalstreak']);
  var iAutoUntil = findApprCol_(lHeaders, ['AutoScandalUntilCycle', 'autoscandaluntilcycle']);
  var iAutoSource = findApprCol_(lHeaders, ['AutoScandalSource', 'autoscandalsource']);
  var iVotingPower = findApprCol_(lHeaders, ['VotingPower', 'votingpower']);
  var iNotes = findApprCol_(lHeaders, ['Notes', 'notes']);

  var requiredColumns = [
    ['Status', iStatus], ['Approval', iApproval], ['HighApprovalStreak', iHighStreak],
    ['AutoScandalUntilCycle', iAutoUntil], ['AutoScandalSource', iAutoSource]
  ];
  for (var rc = 0; rc < requiredColumns.length; rc++) {
    if (requiredColumns[rc][1] === -1) {
      throw new Error('approval ceiling: Civic_Office_Ledger missing ' + requiredColumns[rc][0]);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // READ INITIATIVE TRACKER FOR PERFORMANCE DATA
  // ═══════════════════════════════════════════════════════════════════════════

  var trackerSheet = ss.getSheetByName('Initiative_Tracker');
  var initiatives = [];

  // engine.139 (G-PF34): this cycle's phase per initiative, handed to Phase 9
  // for the carry-forward so NEXT cycle can see what moved.
  var initiativePhaseMap = {};

  if (trackerSheet) {
    var tData = trackerSheet.getDataRange().getValues();
    if (tData.length >= 2) {
      var tHeaders = tData[0];
      var tName = findApprCol_(tHeaders, ['Name', 'name']);
      var tStatus = findApprCol_(tHeaders, ['Status', 'status']);
      var tPhase = findApprCol_(tHeaders, ['ImplementationPhase', 'implementationphase']);
      var tDomain = findApprCol_(tHeaders, ['PolicyDomain', 'policydomain']);
      var tHoods = findApprCol_(tHeaders, ['AffectedNeighborhoods', 'affectedneighborhoods']);
      var tLead = findApprCol_(tHeaders, ['LeadFaction', 'leadfaction']);
      var tOpp = findApprCol_(tHeaders, ['OppositionFaction', 'oppositionfaction']);
      var tNext = findApprCol_(tHeaders, ['NextActionCycle', 'nextactioncycle']);
      var tId = findApprCol_(tHeaders, ['InitiativeID', 'initiativeid']);
      // civic.38 Task 5 step 1 (review F5): the seat that authored the row.
      var tPropOffice = findApprCol_(tHeaders, ['ProposingOffice', 'proposingoffice']);
      // civic.38 Task 4 (2), plan ruling 8: a staged row that delivers stays
      // `operational`, so the phase never says `complete`. The finishing credit is
      // read off the row's StageHold cell instead: `first` is stamped by the Phase-5
      // stage handler in the ONE fire a row first reaches Delivering, and never
      // again — so `completed` (+3 to the owner) pays once per row, ever. A regress
      // and a second delivery pay nothing.
      var tStageHold = findApprCol_(tHeaders, ['StageHold']);

      // engine.139 (G-PF34): last cycle's phase per initiative, for transition
      // detection. Gated on the carry-forward being EXACTLY one cycle old — a
      // stale blob (bench replay, skipped restore) would re-detect an old
      // transition and pay for it twice. No prior data => no transitions found,
      // which degrades to "nothing new pays".
      var prevState = S.previousCycleState || {};
      var prevPhases = (Number(prevState.cycle) === Number(cycle) - 1 && prevState.initiativePhases)
        ? prevState.initiativePhases : null;

      for (var ti = 1; ti < tData.length; ti++) {
        var tr = tData[ti];
        var initName = tName !== -1 ? (tr[tName] || '').toString().trim() : '';
        if (!initName) continue;

        var phase = tPhase !== -1 ? (tr[tPhase] || '').toString().trim().toLowerCase() : '';
        var nextRaw = tNext !== -1 ? tr[tNext] : '';
        var nextActionCycle = parseInt(nextRaw, 10);
        if (isNaN(nextActionCycle)) nextActionCycle = null;

        // Key on InitiativeID where the sheet carries one — names get edited,
        // ids do not. Falls back to the name so an id-less row still tracks.
        var initKey = (tId !== -1 ? (tr[tId] || '').toString().trim() : '') || initName;
        initiativePhaseMap[initKey] = phase;
        var prevPhase = prevPhases ? (prevPhases[initKey] || null) : null;

        initiatives.push({
          name: initName,
          status: tStatus !== -1 ? (tr[tStatus] || '').toString().trim().toLowerCase() : '',
          phase: phase,
          nextActionCycle: nextActionCycle,
          domain: tDomain !== -1 ? (tr[tDomain] || '').toString().trim().toLowerCase() : '',
          neighborhoods: tHoods !== -1 ? (tr[tHoods] || '').toString().trim() : '',
          leadFaction: tLead !== -1 ? (tr[tLead] || '').toString().trim().toUpperCase() : '',
          oppFaction: tOpp !== -1 ? (tr[tOpp] || '').toString().trim().toUpperCase() : '',
          proposingOffice: tPropOffice !== -1 ? (tr[tPropOffice] || '').toString().trim().toUpperCase() : '',
          motion: (Number(cycle) > 0 && civicFirstDeliveredCycle_(tStageHold !== -1 ? tr[tStageHold] : '') === Number(cycle))
            ? 'completed'
            : classifyInitiativeMotion_(phase, nextActionCycle, cycle, prevPhase)
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EDITION COVERAGE DOMAIN BALANCE (from Phase 2)
  // ═══════════════════════════════════════════════════════════════════════════

  var domainBalance = S.editionDomainBalance || {};

  // engine.213 — the city and the press, computed once for every seat.
  var stateMiddle = cityStateMiddle_(S);
  S.approvalHoodMoodEma = hoodMoodEma_(S, stateConfig, cycle);   // carried by Phase 9; read next Cycle
  var cityScore = cityStateScore_(S, stateConfig);
  var pressScore = mediaScore_(domainBalance);
  var pressDelta = mediaDelta_(pressScore, stateConfig);
  Logger.log('updateCivicApprovalRatings_ engine.213: hoods scored ' + stateMiddle.hoods +
    ', city level ' + (cityScore === null ? 'n/a' : cityScore.toFixed(2)) +
    ', press score ' + (pressScore === null ? 'n/a' : pressScore.toFixed(2)) + ' → ' + pressDelta);
  if (!stateMiddle.hoods) Logger.log('updateCivicApprovalRatings_ engine.213: no S.neighborhoodState — state term is 0 this Cycle (loadNeighborhoodState_ did not run?)');

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE APPROVAL CHANGES
  // ═══════════════════════════════════════════════════════════════════════════

  var occupiedPopIds = seedOccupiedPopIds_(ledgerData, iPopId, iStatus, iNotes);

  var changes = [];
  var approvalTriggers = [];
  var ceilingWrites = [];

  var planCeilingWrite = function(rowNumber, columnIndex, before, after, reason) {
    var beforeNorm = before === null || before === undefined ? '' : String(before);
    var afterNorm = after === null || after === undefined ? '' : String(after);
    if (beforeNorm === afterNorm) return;
    ceilingWrites.push({ row: rowNumber, col: columnIndex + 1, value: after, reason: reason });
  };

  for (var li = 1; li < ledgerData.length; li++) {
    var row = ledgerData[li];
    var officeId = iOfficeId !== -1 ? (row[iOfficeId] || '').toString().trim() : '';
    var title = iTitle !== -1 ? (row[iTitle] || '').toString().trim() : '';
    var district = iDistrict !== -1 ? (row[iDistrict] || '').toString().trim().toUpperCase() : '';
    var holder = iHolder !== -1 ? (row[iHolder] || '').toString().trim() : '';
    var status = iStatus !== -1 ? (row[iStatus] || '').toString().trim().toLowerCase() : '';
    var currentApproval = iApproval !== -1 ? parseInt(row[iApproval], 10) : 65;
    var faction = iFaction !== -1 ? (row[iFaction] || '').toString().trim().toUpperCase() : '';
    var currentHighStreak = row[iHighStreak];
    var currentAutoUntil = row[iAutoUntil];
    var currentAutoSource = row[iAutoSource];

    if (isNaN(currentApproval)) currentApproval = 65;

    // Only process active elected officials and mayor
    if (!officeId || (!officeId.match(/^COUNCIL/) && !officeId.match(/^MAYOR/))) continue;
    if (status === 'vacant') continue;

    var lifecycle = resolveApprovalCeilingLifecycle_({
      status: status,
      highStreak: currentHighStreak,
      untilCycle: currentAutoUntil,
      source: currentAutoSource
    }, cycle);
    status = lifecycle.status;

    if (lifecycle.blocked) {
      planCeilingWrite(li + 1, iStatus, row[iStatus], status,
        'approval ceiling status state');
      planCeilingWrite(li + 1, iHighStreak, currentHighStreak, lifecycle.highStreak,
        'approval ceiling streak state');
      planCeilingWrite(li + 1, iAutoUntil, currentAutoUntil, lifecycle.untilCycle,
        'approval ceiling expiry state');
      planCeilingWrite(li + 1, iAutoSource, currentAutoSource, lifecycle.source,
        'approval ceiling source state');
      continue;
    }

    var delta = 0;
    var reasons = [];
    var silenceOwned = 0;
    var silenceNearby = 0; // v1.7 — non-owned district silence, own ladder
    var ladderSeen = { silence: { owned: 0, nearby: 0 },
                       sitting: { owned: 0, nearby: 0 },
                       advanced: { owned: 0, nearby: 0 } };

    // ─────────────────────────────────────────────────────────────────────
    // INITIATIVE PERFORMANCE IN DISTRICT
    // ─────────────────────────────────────────────────────────────────────
    var districtHoods = getDistrictHoods_(ctx, district);
    var isMayor = officeId.indexOf('MAYOR') === 0;
    var officeIdKey = String(officeId).trim().toUpperCase();

    for (var ii = 0; ii < initiatives.length; ii++) {
      var init = initiatives[ii];

      // civic.38 Task 5 step 1: the sponsor owns its own bill. Owner used to mean
      // mayor-or-lead-faction only, so a seat's own row was scored to its bloc and
      // a sponsor outside the lead faction owned nothing. Matched on OfficeId
      // (ProposingOffice is 'MAYOR-01' / 'COUNCIL-D<n>', createInitiative AUTHOR_OFFICE).
      var isSponsor = !!init.proposingOffice && init.proposingOffice === officeIdKey;

      // Check if initiative affects this official's district
      var affectsDistrict = false;
      if (isMayor || isSponsor) {
        affectsDistrict = true; // Mayor affected by all initiatives; a sponsor by its own, wherever it lands
      } else {
        var initHoods = init.neighborhoods.split(/[,;]+/).map(function(h) { return h.trim().toLowerCase(); });
        for (var dhi = 0; dhi < districtHoods.length; dhi++) {
          if (initHoods.indexOf(districtHoods[dhi].toLowerCase()) >= 0) {
            affectsDistrict = true;
            break;
          }
        }
      }

      if (!affectsDistrict) continue;

      // Faction alignment check
      var supportedByFaction = (init.leadFaction === faction);
      var opposedByFaction = (init.oppFaction === faction);

      var owns = isMayor || isSponsor || supportedByFaction;
      var scored = approvalDeltaForInitiative_(init.motion, owns, opposedByFaction);
      // v1.7: diminishing silence stacking. Silence on an owned initiative
      // scores -6 / -3 / -2 / -1 / 0... in portfolio order, so the per-cycle
      // fall is bounded (~-12 from silence) and the removal verdict comes
      // from REPEATED silence across cycles (v1.4's own bar), not from
      // portfolio width — a 6-initiative Mayor was losing 37 points in one
      // cycle, a one-cycle near-removal. Non-silence deltas are unchanged.
      // v1.7 / engine.139: portfolio-width ladders. A wide portfolio must not
      // decide an official's fate in one cycle — the removal verdict comes from
      // REPEATED motion across cycles, not from how many rows they hold. v1.7
      // proved this on silence (a 6-initiative Mayor was losing 37 points in one
      // cycle); engine.139 extends the same discipline to `sitting` (which had no
      // width cap at all — the -12 that took Santana 82→69) and to `advanced`, so
      // the positive side cannot be farmed by portfolio width either.
      var lad = MOTION_LADDERS_[init.motion];
      if (lad) {
        var side = owns ? 'owned' : 'nearby';
        var rung = lad[side];
        var seen = ladderSeen[init.motion][side];
        var dimDelta = seen < rung.length ? rung[seen] : 0;
        delta += dimDelta;
        reasons.push(init.name + ' ' + init.motion + ' (' +
          (dimDelta === 0 ? '0, capped' : (dimDelta > 0 ? '+' + dimDelta : String(dimDelta))) + ')');
        ladderSeen[init.motion][side]++;
        if (init.motion === 'silence') { if (owns) silenceOwned++; else silenceNearby++; }
      } else {
        delta += scored.delta;
        reasons.push(init.name + ' ' + scored.reason);
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // THE CITY (engine.213) — what the seat is responsible for
    // ─────────────────────────────────────────────────────────────────────
    // Approval is a LEVEL, the way a poll reads one (Mike-direct S455): the
    // city sets a target for the seat — base 50, the district against the
    // city middle (council), the city's own level (Mayor full, council a
    // share), the week's press across every desk — and the number closes a
    // share of the gap to that target each Cycle (inertia). Civic motion
    // (advanced / completed / silence / fail) stays an EVENT on top. The old
    // "decay toward 50" is retired: the base IS the anchor. No neighborhood
    // state → no target → the level term is inert and says so.
    // The MOOD term is absolute: a district whose residents read positive
    // approves of its seat, whatever a richer district reads. Council blends
    // its own residents' mood with the city's (councilCityShare); the Mayor
    // reads the city. The RELATIVE term (momentum first, then crime, sentiment,
    // a quarter of retail — against the city middle) orders the seats; it is
    // small by design, so a district under construction or historically poor
    // is not capped for its rep (Baylight's retail reads 3.9 because it is a
    // $2.1B site, not a failure).
    var cityShare = isMayor ? 1 : stateConfig.councilCityShare;
    var districtScore = isMayor ? null : districtStateScore_(S, districtHoods, stateMiddle);
    var districtMood = isMayor ? null : districtMoodLevel_(S, districtHoods, stateConfig);
    if (cityScore !== null || districtScore !== null) {
      var target = stateConfig.levelBase;
      var parts = [];
      if (cityScore !== null) {
        var mood = cityScore;
        if (districtMood !== null) mood = cityShare * cityScore + (1 - cityShare) * districtMood;
        target += mood * stateConfig.gainCity;
        parts.push('mood ' + (mood >= 0 ? '+' : '') + mood.toFixed(2) + (districtMood !== null ? ' (district ' + districtMood.toFixed(2) + ', city ' + cityScore.toFixed(2) + ')' : ' city'));
      }
      if (districtScore !== null) {
        target += districtScore * stateConfig.gainDistrict;
        parts.push('district ' + (districtScore >= 0 ? '+' : '') + districtScore.toFixed(2) + ' vs middle');
      }
      if (pressDelta !== 0) {
        target += pressDelta * stateConfig.gainPress;
        parts.push('press ' + (pressDelta > 0 ? '+' : '') + pressDelta);
      }
      target = Math.max(10, Math.min(95, target));
      var levelMove = Math.round((target - currentApproval) * stateConfig.inertia);
      delta += levelMove;
      reasons.push('level target ' + Math.round(target) + ' (' + parts.join(', ') + ') → ' + (levelMove >= 0 ? '+' : '') + levelMove);
    } else {
      reasons.push('level: no neighborhood state loaded — city term inert this Cycle');
    }

    // ─────────────────────────────────────────────────────────────────────
    // APPLY AND CLAMP
    // ─────────────────────────────────────────────────────────────────────
    var newApproval = Math.max(10, Math.min(95, currentApproval + delta));
    // engine.178 (S438): the officeholder's INTEGRITY band scales the ceiling's scandal
    // chance — -2 x dialIntegrityScandalLow, +2 x dialIntegrityScandalHigh, +-1 halfway,
    // neutral x1. Holder resolved by name against the ledger (the office row carries no POPID).
    var holderInteg = holderIntegrityBand_(ctx, holder);
    var scandalMult = 1;
    if (holderInteg !== null && holderInteg !== 0) {
      var lowM = pressureBar_(ctx, 'dialIntegrityScandalLow'), highM = pressureBar_(ctx, 'dialIntegrityScandalHigh');
      scandalMult = holderInteg < 0 ? 1 + (lowM - 1) * (-holderInteg / 2) : 1 + (highM - 1) * (holderInteg / 2);
    }
    var ceiling = applyApprovalCeilingRisk_({
      cycle: cycle,
      status: status,
      approval: newApproval,
      highStreak: lifecycle.highStreak,
      untilCycle: lifecycle.untilCycle,
      source: lifecycle.source,
      chanceMult: scandalMult
    }, ceilingConfig, rng);
    if (scandalMult !== 1) reasons.push('integrity band ' + holderInteg + ' scales scandal chance x' + scandalMult.toFixed(2));

    if (ceiling.triggered) {
      reasons.push('sustained high approval scandal (-' + ceilingConfig.approvalDrop + ')');
      newApproval = ceiling.approval;
      delta = newApproval - currentApproval;

      var hook = {
        hookType: 'CIVIC_APPROVAL_SCANDAL',
        domain: 'CIVIC',
        severity: 7,
        description: holder + ' entered scandal status after ' +
          (lifecycle.highStreak + 1) + ' consecutive Cycles at or above ' + ceilingConfig.threshold + ' approval',
        cycleGenerated: cycle,
        popid: iPopId !== -1 ? (row[iPopId] || '').toString().trim() : '',
        officeId: officeId,
        approval: newApproval,
        chance: ceiling.chance
      };
      S.storyHooks = S.storyHooks || [];
      S.storyHooks.push(hook);
      S.approvalCeilingEvents.push(hook);
      if (!isDryRun && typeof recordHookRipple_ === 'function') {
        recordHookRipple_(ctx, 'approval-ceiling', hook, 'updateCivicApprovalRatings');
      }
    }

    var priorNotes = iNotes !== -1 ? (row[iNotes] || '').toString() : '';
    var campaign = parseCampaignNote_(priorNotes);
    var incumbentPop = iPopId !== -1 ? (row[iPopId] || '').toString().trim() : '';
    if (shouldStartCampaign_(status, newApproval, campaign)) {
      var picked = pickCampaignChallenger_(ctx, district, incumbentPop, occupiedPopIds, officeId, cycle);
      if (picked) {
        campaign = { pop: picked.popId, name: picked.name, since: cycle };
        occupiedPopIds[picked.popId] = true;
        reasons.push('campaign started: ' + picked.name);
      }
    }
    if (campaign) {
      S.civicCampaigns.push({
        officeId: officeId, district: district, incumbent: holder,
        challengerPopId: campaign.pop, challengerName: campaign.name,
        since: campaign.since, approval: newApproval
      });
    }

    var leaving = shouldLeaveOffice_(status, newApproval, currentApproval, silenceOwned);
    var seating = leaving && campaign;
    var nextStatus = leaving && !seating ? 'vacant' : (leaving && seating ? 'active' : ceiling.status);

    planCeilingWrite(li + 1, iStatus, row[iStatus], nextStatus,
      seating ? 'demoted — challenger seated' :
        (leaving ? 'left office — unfit to run the city' :
          (ceiling.triggered ? 'approval ceiling scandal triggered' :
            (lifecycle.recovered ? 'approval ceiling scandal expired' : 'approval ceiling status state'))));
    planCeilingWrite(li + 1, iHighStreak, currentHighStreak, ceiling.highStreak,
      'approval ceiling streak update');
    planCeilingWrite(li + 1, iAutoUntil, currentAutoUntil, ceiling.untilCycle,
      'approval ceiling expiry update');
    planCeilingWrite(li + 1, iAutoSource, currentAutoSource, ceiling.source,
      'approval ceiling source update');

    if (campaign && !leaving && iNotes !== -1) {
      var kept = formatCampaignNote_(campaign, stripCampaignNote_(priorNotes));
      planCeilingWrite(li + 1, iNotes, row[iNotes], kept, 'challenger campaign');
    }
    if (campaign && !leaving && campaign.since === cycle) {
      var campHook = {
        hookType: 'CIVIC_CHALLENGER_CAMPAIGN',
        domain: 'CIVIC',
        severity: 6,
        description: campaign.name + ' began campaigning to replace ' + holder +
          ' (approval ' + newApproval + ')',
        cycleGenerated: cycle,
        popid: campaign.pop,
        officeId: officeId,
        approval: newApproval
      };
      approvalTriggers.push({
        type: 'campaign', holder: holder, district: district,
        approval: newApproval, challenger: campaign.name, challengerPopId: campaign.pop
      });
      S.storyHooks = S.storyHooks || [];
      S.storyHooks.push(campHook);
      if (!isDryRun && typeof recordHookRipple_ === 'function') {
        recordHookRipple_(ctx, 'challenger-campaign', campHook, 'updateCivicApprovalRatings');
      }
      Logger.log('  CAMPAIGN ' + campaign.name + ' vs ' + holder + ' (' + officeId + ')');
    }

    if (leaving) {
      if (seating) {
        if (iHolder !== -1) {
          planCeilingWrite(li + 1, iHolder, holder, campaign.name, 'demotion — challenger seated');
        }
        if (iPopId !== -1) {
          planCeilingWrite(li + 1, iPopId, row[iPopId], campaign.pop, 'demotion — challenger pop');
        }
        if (iVotingPower !== -1) {
          planCeilingWrite(li + 1, iVotingPower, row[iVotingPower], 'yes', 'demotion — successor votes');
        }
        if (iApproval !== -1) {
          newApproval = 50;
          planCeilingWrite(li + 1, iApproval, currentApproval, 50, 'demotion — successor starts at 50');
        }
        if (iNotes !== -1) {
          var seated = 'C' + cycle + ': ' + holder + ' demoted (approval dropped to unfit). ' +
            campaign.name + ' (' + campaign.pop + ') seated from campaign since C' + campaign.since + '.';
          planCeilingWrite(li + 1, iNotes, row[iNotes],
            seated + (stripCampaignNote_(priorNotes) ? ' | ' + stripCampaignNote_(priorNotes) : ''),
            'demotion — record');
        }
      } else {
        if (iHolder !== -1) {
          planCeilingWrite(li + 1, iHolder, holder, 'TBD', 'left office — seat vacant');
        }
        if (iVotingPower !== -1) {
          planCeilingWrite(li + 1, iVotingPower, row[iVotingPower], 'vacant', 'left office — no vote');
        }
        if (iNotes !== -1) {
          var former = 'C' + cycle + ': ' + holder + ' left office (approval ' +
            newApproval + ', silence on ' + silenceOwned +
            ' initiative(s)). Repeated refusal to move the city.';
          planCeilingWrite(li + 1, iNotes, row[iNotes],
            former + (stripCampaignNote_(priorNotes) ? ' | ' + stripCampaignNote_(priorNotes) : ''),
            'left office — record');
        }
      }
      var departure = {
        type: seating ? 'demoted' : 'left-office',
        holder: holder,
        popid: incumbentPop,
        officeId: officeId,
        district: district,
        approval: newApproval,
        silenceOwned: silenceOwned,
        cycle: cycle,
        successor: seating ? { pop: campaign.pop, name: campaign.name } : null
      };
      approvalTriggers.push(departure);
      S.officeDepartures.push(departure);
      var leaveHook = {
        hookType: seating ? 'CIVIC_DEMOTION' : 'CIVIC_LEFT_OFFICE',
        domain: 'CIVIC',
        severity: 8,
        description: seating
          ? holder + ' demoted — ' + campaign.name + ' takes the seat'
          : holder + ' left office — approval ' + newApproval +
            ' after repeated failure to move the city',
        cycleGenerated: cycle,
        popid: seating ? campaign.pop : departure.popid,
        officeId: officeId,
        approval: newApproval
      };
      S.storyHooks = S.storyHooks || [];
      S.storyHooks.push(leaveHook);
      if (!isDryRun && typeof recordHookRipple_ === 'function') {
        recordHookRipple_(ctx, seating ? 'demotion' : 'left-office', leaveHook, 'updateCivicApprovalRatings');
      }
      Logger.log('  ' + (seating ? 'DEMOTED' : 'LEFT OFFICE') + ' ' + holder +
        ' (' + officeId + ')' + (seating ? ' → ' + campaign.name : '') +
        ' approval=' + newApproval + ' silenceOwned=' + silenceOwned);
    }

    if (newApproval !== currentApproval) {
      changes.push({
        row: li + 1, // 1-based for sheet
        officeId: officeId,
        holder: holder,
        district: district,
        oldApproval: currentApproval,
        newApproval: newApproval,
        delta: delta,
        reasons: reasons
      });

      // Threshold triggers
      if (newApproval < 20 && currentApproval >= 20) {
        approvalTriggers.push({
          type: 'recall-pressure',
          holder: holder,
          district: district,
          approval: newApproval
        });
      }
      if (newApproval < 40 && currentApproval >= 40) {
        approvalTriggers.push({
          type: 'vulnerable',
          holder: holder,
          district: district,
          approval: newApproval
        });
      }
      if (newApproval > 80 && currentApproval <= 80) {
        approvalTriggers.push({
          type: 'popular',
          holder: holder,
          district: district,
          approval: newApproval
        });
      }

      Logger.log('  ' + holder + ' (' + district + '): ' + currentApproval + ' → ' +
        newApproval + ' (Δ' + (delta >= 0 ? '+' : '') + delta + ') ' + reasons.join(', '));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE APPROVAL CHANGES (v1.1: queueCellIntent_, committed at Phase 10)
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isDryRun && changes.length > 0) {
    for (var ci = 0; ci < changes.length; ci++) {
      var c = changes[ci];
      queueCellIntent_(ctx, 'Civic_Office_Ledger', c.row, iApproval + 1, c.newApproval,
        'approval rating update', 'civic');
    }
    Logger.log('updateCivicApprovalRatings_ v1.1: Queued ' + changes.length + ' approval rating updates');
  }
  if (!isDryRun && ceilingWrites.length > 0) {
    for (var cwi = 0; cwi < ceilingWrites.length; cwi++) {
      var cw = ceilingWrites[cwi];
      queueCellIntent_(ctx, 'Civic_Office_Ledger', cw.row, cw.col, cw.value,
        cw.reason, 'civic');
    }
    Logger.log('updateCivicApprovalRatings_ v1.2: Queued ' + ceilingWrites.length +
      ' approval ceiling state updates');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISTRICT SENTIMENT RIPPLE
  // ═══════════════════════════════════════════════════════════════════════════
  // When approval changes, micro-ripple into district neighborhoods

  if (!S.approvalNeighborhoodEffects) S.approvalNeighborhoodEffects = {};

  for (var ai = 0; ai < changes.length; ai++) {
    var ch = changes[ai];
    var dHoods = getDistrictHoods_(ctx, ch.district);

    // Small sentiment ripple: approval drop → district sentiment dips
    var ripple = ch.delta * 0.003; // +/-0.003 per approval point change

    for (var rhi = 0; rhi < dHoods.length; rhi++) {
      var rHood = dHoods[rhi];
      if (!S.approvalNeighborhoodEffects[rHood]) {
        S.approvalNeighborhoodEffects[rHood] = { sentiment: 0, communityEngagement: 0 };
      }
      S.approvalNeighborhoodEffects[rHood].sentiment += ripple;
      S.approvalNeighborhoodEffects[rHood].communityEngagement += ripple * 0.5;
    }

    // engine.45 T1: persist approval delta + its reasons[] — the sheet stores only the
    // clamped number; the causing initiatives were ctx-transient (trace C5/G3).
    if (!isDryRun && typeof recordRipple_ === 'function') {
      recordRipple_(ctx, {
        causeType: 'approval-shift',
        causeId: ch.officeId || ch.holder,
        causeDetail: (ch.reasons || []).join('; '),
        effectType: 'approval/district-sentiment',
        targetScope: 'neighborhood',
        targetIds: dHoods,
        neighborhood: ch.district || '',
        magnitude: ch.delta,
        duration: 1,
        sourceEngine: 'updateCivicApprovalRatings'
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE OUTPUTS
  // ═══════════════════════════════════════════════════════════════════════════

  S.approvalChanges = changes;
  S.approvalTriggers = approvalTriggers;
  S.initiativePhases = initiativePhaseMap;  // engine.139 — Phase 9 carries it forward

  Logger.log('updateCivicApprovalRatings_ v1.0: ' + changes.length + ' officials updated, ' +
    approvalTriggers.length + ' threshold triggers');

  ctx.summary = S;
}


/**
 * Only a finished initiative credits approval. Live-sounding phases
 * (operational, disbursement-active, construction-active, pilot-active)
 * are not wins — C103 sat at 95 on those and never built anything.
 */
function isPerforming_(phase) {
  if (!phase) return false;
  return String(phase).indexOf('complete') >= 0 && String(phase).indexOf('visioning-complete') < 0;
}

/**
 * They chose a fail phase. Committal — costs less than silence.
 */
function isFailing_(phase) {
  if (!phase) return false;
  var failing = ['stalled', 'blocked', 'suspended', 'defunded'];
  for (var i = 0; i < failing.length; i++) {
    if (phase.indexOf(failing[i]) >= 0) return true;
  }
  return false;
}

/**
 * civic.38 Task 4 (2): the Cycle a staged row FIRST reached Delivering, read off
 * its StageHold cell ({v:1, first:<Cycle>, ...}). 0 for a blank, legacy or
 * unreadable cell — a row that never delivered pays no finishing credit.
 */
function civicFirstDeliveredCycle_(cellValue) {
  var text = String(cellValue == null ? '' : cellValue).replace(/^\s+|\s+$/g, '');
  if (!text) return 0;
  try {
    var hold = JSON.parse(text);
    var first = hold && hold.v === 1 ? Number(hold.first) : 0;
    return isFinite(first) && first > 0 ? first : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Motion of one initiative at this cycle.
 *   complete — finished. The only + path.
 *   failed   — they took a fail phase. Paid, but they decided.
 *   silence  — overdue or never scheduled. Biggest drain.
 *   sitting  — still on the clock, not finished. Nothing is free.
 *
 * ~~RULED INTENTIONAL, G-PF19 (engine.138, S406)~~ — **SUPERSEDED the same
 * session by engine.139 / G-PF34 (builder-direct).** The G-PF19 *ruling* stands:
 * the three civic systems were never in conflict, they answer different
 * questions. What was superseded is the DESIGN it deferred to.
 *
 * The v1.3 clamps (only `complete` pays; positive media never pays) were set to
 * stop the C103→95 approval pin. They treated the wrong cause. The pin was not
 * "positives exist" — it was `complete` paying its owner +3 EVERY CYCLE for a
 * row parked in a terminal state, i.e. paying per-cycle for a STATE. That bug
 * was still armed and merely dormant, because nothing has ever reached
 * `complete`. Meanwhile the media arm's `<= -3` threshold never fired once in 15
 * cycles of live CIVIC ratings (range -2..+3), so the channel officials were
 * meant to rise and fall on was doing nothing at all. Every clamp decision
 * predates the wiring and none of them ever saw the system work.
 *
 * The rule now is **positives are EVENTS, negatives are CONDITIONS**:
 *   - a phase TRANSITION pays (`advanced`, `completed`) — once, when it happens
 *   - a terminal state pays nothing (`complete-held`)
 *   - not-finished and overdue still drain per cycle (`sitting`, `silence`)
 * Lifetime yield per initiative is therefore bounded (~6 transitions + one
 * completion) and cannot pin anyone at ceiling, and the approval-ceiling
 * scandal still backstops sustained highs.
 *
 * `prevPhase` comes from `previousCycleState.initiativePhases`, gated on the
 * blob being exactly one cycle old. Absent it, nothing reads as a transition —
 * the conservative direction.
 */
function classifyInitiativeMotion_(phase, nextActionCycle, cycle, prevPhase) {
  // engine.139: did this row MOVE since last cycle? Requires prior data; without
  // it nothing counts as a transition, which is the conservative direction.
  var moved = !!prevPhase && String(prevPhase) !== String(phase);
  // civic.38 Task 5 step 2 — revival guard. `stalled` → prior phase is a changed,
  // non-failing phase, so it used to read as `advanced` (+2): a stall/revive loop
  // farmed approval. Getting back to where you were is not an advance.
  var revived = moved && isFailing_(String(prevPhase)) && !isFailing_(phase);
  if (revived) moved = false;

  if (isPerforming_(phase)) {
    // Finishing is an EVENT and pays once. Parked at complete is a STATE and
    // pays nothing — this is the C103→95 pin, defused. A row left at `complete`
    // used to score +3 to its owner every cycle, forever.
    return moved ? 'completed' : 'complete-held';
  }
  if (isFailing_(phase)) return 'failed';

  // The revival Cycle itself costs nothing either: somebody just acted on the row,
  // so it is not silent, whatever its clock says.
  if (revived) return 'sitting';

  // A row that moved is not sitting and is not silent, whatever its clock says —
  // somebody acted on it this cycle.
  if (moved) return 'advanced';

  if (nextActionCycle === null || nextActionCycle === undefined || nextActionCycle === '') {
    return 'silence';
  }
  if (Number(nextActionCycle) < Number(cycle)) return 'silence';
  return 'sitting';
}

/**
 * Portfolio-width ladders, applied per motion in office order.
 * Sitting and advanced are deliberate mirrors: a cycle in which every row moves
 * is worth +4 to an owner, a cycle in which every row stalls costs -4. Silence
 * keeps its heavier v1.7 curve because it means overdue, not merely unfinished.
 */
// engine.213 (S455, Mike-direct): a scheduled row costs NOTHING. City hall meets
// once a week; the seat works the district six days. Charging every fire for a
// row that is on its clock made the tracker the whole grade (C104–C106: every
// row "sitting", every official down). Silence — overdue, unscheduled — still
// drains, at half the old curve; the city term is now the weight.
var MOTION_LADDERS_ = {
  silence:  { owned: [-3, -2, -1], nearby: [-2, -1] },
  sitting:  { owned: [],           nearby: [] },
  advanced: { owned: [2, 1, 1],    nearby: [1, 1] }
};

/**
 * Per-initiative approval delta. Positives are EVENTS, negatives are CONDITIONS.
 * Opposed-fail +1 is the only other raise: they took a side and were right.
 */
function approvalDeltaForInitiative_(motion, owns, opposed) {
  if (motion === 'completed') {
    if (owns) return { delta: 3, reason: 'completed (+3)' };
    if (opposed) return { delta: 0, reason: 'completed, opposed (0)' };
    return { delta: 1, reason: 'completed (+1)' };
  }
  if (motion === 'complete-held') {
    // Already paid on the transition. A finished initiative neither pays nor
    // drains — it is done, and done is not an achievement you re-earn.
    return { delta: 0, reason: 'complete, already paid (0)' };
  }
  if (motion === 'advanced') {
    if (owns) return { delta: 2, reason: 'advanced a phase (+2)' };
    if (opposed) return { delta: 0, reason: 'advanced, opposed (0)' };
    return { delta: 1, reason: 'advanced a phase (+1)' };
  }
  if (motion === 'failed') {
    if (owns) return { delta: -2, reason: 'chose fail (-2)' };  // engine.213: committal still costs less than silence (-3)
    if (opposed) return { delta: 1, reason: 'opposed a fail (+1)' };
    return { delta: -1, reason: 'chose fail (-1)' };
  }
  if (motion === 'silence') {
    if (owns) return { delta: -3, reason: 'silence (-3)' };
    return { delta: -2, reason: 'silence (-2)' };
  }
  // engine.213: on the clock is not a fault. The seat is graded on the district.
  return { delta: 0, reason: 'sitting, on the clock (0)' };
}

/**
 * In-world: this person cannot run the city.
 * Out-of-world: this cron/node will not push the sim.
 * Crossing below 20 is the verdict after the drop. Already-unfit + still
 * silent is the repeated refusal. Completing work while low does not unseat.
 */
function shouldLeaveOffice_(status, newApproval, currentApproval, silenceOwned) {
  if (String(status || '').toLowerCase() === 'vacant') return false;
  if (Number(newApproval) >= 20) return false;
  if (Number(currentApproval) >= 20) return true;
  return Number(silenceOwned) > 0;
}

function shouldStartCampaign_(status, newApproval, existingCampaign) {
  if (existingCampaign) return false;
  if (String(status || '').toLowerCase() === 'vacant') return false;
  return Number(newApproval) < 40;
}

var CAMPAIGN_RE_ = /\[CAMPAIGN pop=(POP-\d+) name=([^\]|]+?) since=(\d+)\]/;

/**
 * civic.32 — one citizen, one race. The occupied set is every office HOLDER
 * (a vacant seat holds nobody) plus every citizen already CAMPAIGNING in any
 * office's Notes. Seeded once, before the office loop, so row order cannot
 * matter: a challenger picked for D3 last Cycle is not free for D5 this Cycle,
 * and a challenger who seats this Cycle (their pop is in the note that seats
 * them) is not free to be picked again as another office's challenger.
 */
function seedOccupiedPopIds_(ledgerData, iPopId, iStatus, iNotes) {
  var occupied = {};
  for (var op = 1; op < ledgerData.length; op++) {
    var opRow = ledgerData[op] || [];
    var opPop = iPopId !== -1 ? String(opRow[iPopId] || '').trim() : '';
    var opStatus = iStatus !== -1 ? String(opRow[iStatus] || '').trim().toLowerCase() : '';
    if (opPop && opStatus !== 'vacant') occupied[opPop] = true;
    var running = iNotes !== -1 ? parseCampaignNote_(opRow[iNotes]) : null;
    if (running && running.pop) occupied[running.pop] = true;
  }
  return occupied;
}

function parseCampaignNote_(notes) {
  var m = String(notes || '').match(CAMPAIGN_RE_);
  if (!m) return null;
  return { pop: m[1], name: String(m[2] || '').trim(), since: parseInt(m[3], 10) };
}

function stripCampaignNote_(notes) {
  return String(notes || '').replace(CAMPAIGN_RE_, '').replace(/\s+\|\s+$/, '').replace(/^\s*\|\s+/, '').trim();
}

function formatCampaignNote_(campaign, rest) {
  var mark = '[CAMPAIGN pop=' + campaign.pop + ' name=' + campaign.name + ' since=' + campaign.since + ']';
  var tail = String(rest || '').trim();
  return tail ? mark + ' ' + tail : mark;
}

var CIVIC_ROLE_RE_ = /community|advocate|organizer|attorney|educator|teacher|planner|counsel|union|pastor|deacon|principal/;
var OUT_OF_TOWN_FIRST_ = ['Anjali', 'Cormac', 'Dina', 'Everett', 'Farah', 'Gideon', 'Hester', 'Ivo', 'Karim', 'Leda', 'Niall', 'Oona'];
var OUT_OF_TOWN_LAST_ = ['Beltran', 'Crowley', 'Duvall', 'Eskridge', 'Farrow', 'Gupta', 'Holtz', 'Ingram', 'Jelinek', 'Keita', 'Langford', 'Moreau'];

function civicHash_(s) {
  var h = 0;
  var str = String(s || '');
  for (var i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function dialBandIndexFromValue_(v) {
  var n = Number(v);
  if (!isFinite(n)) return 2;
  if (n < 20) return 0;
  if (n < 40) return 1;
  if (n < 60) return 2;
  if (n < 80) return 3;
  return 4;
}

// engine.178 (S438): an officeholder's signed integrity band, resolved by full name
// against ctx.ledger (First + Last, case-insensitive). null when unresolved / no dials.
function holderIntegrityBand_(ctx, holderName) {
  var nm = String(holderName || '').trim().toLowerCase();
  if (!nm || !ctx || !ctx.ledger || !ctx.ledger.headers) return null;
  if (!ctx._holderDialByName) {
    ctx._holderDialByName = {};
    var h = ctx.ledger.headers, iF = h.indexOf('First'), iL = h.indexOf('Last'), iP = h.indexOf('POPID'), iD = h.indexOf('DialState');
    if (iF >= 0 && iL >= 0 && iD >= 0) for (var r = 0; r < ctx.ledger.rows.length; r++) {
      var row = ctx.ledger.rows[r];
      var key = (String(row[iF] || '').trim() + ' ' + String(row[iL] || '').trim()).trim().toLowerCase();
      if (key && row[iD]) ctx._holderDialByName[key] = { pop: iP >= 0 ? String(row[iP] || '') : key, ds: String(row[iD]) };
    }
  }
  var hit = ctx._holderDialByName[nm];
  if (!hit || typeof getCitizenDialBands_ !== 'function') return null;
  var gb = getCitizenDialBands_(ctx, hit.pop.toUpperCase(), hit.ds);
  return (gb && gb.bands && gb.bands.integrity != null) ? gb.bands.integrity : null;
}

function readDialBase_(dialState, dial) {
  if (!dialState) return null;
  try {
    var o = typeof dialState === 'string' ? JSON.parse(dialState) : dialState;
    if (!o || !o.base || o.base[dial] == null) return null;
    return Number(o.base[dial]);
  } catch (e) {
    return null;
  }
}

/** Civic-challenger defaults: pumped Drive / Integrity / Composure; dumped Family (they left home). */
function challengerDialStateJson_() {
  return JSON.stringify({
    base: {
      drive: 72, sociability: 62, warmth: 52, openness: 58,
      composure: 64, integrity: 68, family: 44, outabout: 66
    },
    streak: {
      drive: 0, sociability: 0, warmth: 0, openness: 0,
      composure: 0, integrity: 0, family: 0, outabout: 0
    }
  });
}

function isCivicAdjacentText_(text) {
  return CIVIC_ROLE_RE_.test(String(text || '').toLowerCase()) ||
    /government & civic|legal|education/i.test(String(text || ''));
}

/**
 * In-ledger bar. Hard rejects: T1 (protected), already CIV, inactive,
 * under 25 / over 70, Drive < 60 (won't run), Integrity < 40 (crime-reachable),
 * Composure < 40 (can't sit a chamber). Missing DialState is not a reject —
 * score on tags/hood only. Empty seat is worse than a quieter local.
 */
function scoreLedgerCitizenForOffice_(row, headers, district, hoods, incumbentPopId, occupiedPopIds, simYear) {
  var col = function(name) { return headers.indexOf(name); };
  var iPop = col('POPID');
  if (iPop < 0) return null;
  var pop = String(row[iPop] || '').trim();
  if (!pop || pop === incumbentPopId) return null;
  if (occupiedPopIds && occupiedPopIds[pop]) return null;
  var iStatus = col('Status');
  var st = iStatus >= 0 ? String(row[iStatus] || '').toLowerCase() : 'active';
  if (st && st !== 'active') return null;
  var iCiv = col('CIV (y/n)');
  var civ = iCiv >= 0 ? String(row[iCiv] || '').toLowerCase() : '';
  if (civ.indexOf('y') === 0) return null;
  var iTier = col('Tier');
  var tier = Number(row[iTier]);
  if (!isFinite(tier)) tier = 3;
  if (tier < 2 || tier > 4) return null;
  var iBy = col('BirthYear');
  if (iBy >= 0 && row[iBy] !== '' && row[iBy] != null) {
    var by = Number(row[iBy]);
    if (isFinite(by)) {
      var age = simYear - by; // engine.164: the caller passes the calendar's year
      if (age < 25 || age > 70) return null;
    }
  }
  var iDial = col('DialState');
  if (iDial >= 0 && row[iDial]) {
    var drive = readDialBase_(row[iDial], 'drive');
    var integ = readDialBase_(row[iDial], 'integrity');
    var comp = readDialBase_(row[iDial], 'composure');
    if (drive != null && dialBandIndexFromValue_(drive) < 3) return null;
    if (integ != null && dialBandIndexFromValue_(integ) < 2) return null;
    if (comp != null && dialBandIndexFromValue_(comp) < 2) return null;
  }
  var iRole = col('RoleType');
  if (iRole < 0) iRole = col('TierRole');
  var role = iRole >= 0 ? String(row[iRole] || '') : '';
  var iTags = col('SkillTags');
  var tags = iTags >= 0 ? String(row[iTags] || '') : '';
  var iHood = col('Neighborhood');
  var hood = iHood >= 0 ? String(row[iHood] || '') : '';
  hoods = hoods || [];
  var citywide = !hoods.length || String(district || '').toLowerCase() === 'citywide';
  var local = citywide;
  if (!local) {
    for (var hi = 0; hi < hoods.length; hi++) {
      if (hood.toLowerCase() === String(hoods[hi]).toLowerCase()) local = true;
    }
  }
  var score = 1;
  if (local) score += 100;
  if (isCivicAdjacentText_(role + ' ' + tags)) score += 20;
  if (tier === 2) score += 10;
  else if (tier === 3) score += 5;
  if (iDial >= 0 && row[iDial]) {
    var dDrive = readDialBase_(row[iDial], 'drive');
    if (dDrive != null) score += dialBandIndexFromValue_(dDrive);
  }
  var iFirst = col('First');
  var iLast = col('Last');
  var iFull = col('FullName');
  var name = iFull >= 0 && row[iFull] ? String(row[iFull]).trim()
    : ((iFirst >= 0 ? row[iFirst] : '') + ' ' + (iLast >= 0 ? row[iLast] : '')).trim();
  if (!name) return null;
  return { popId: pop, name: name, neighborhood: hood, tier: tier, score: score, origin: 'ledger' };
}

function mintChallengerOnLedger_(ctx, spec) {
  var headers = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var col = function(name) { return headers.indexOf(name); };
  var iPop = col('POPID');
  if (iPop < 0) return null;
  var pop = nextPopIdLocked_(ctx); // engine.90 shared allocator
  var row = [];
  for (var i = 0; i < headers.length; i++) row[i] = '';
  var set = function(name, val) {
    var c = col(name);
    if (c >= 0) row[c] = val;
  };
  set('POPID', pop);
  set('First', spec.first);
  set('Last', spec.last);
  set('Status', 'active');
  set('Tier', 3);
  set('RoleType', 'Civic candidate');
  set('ClockMode', 'CIVIC');
  set('CIV (y/n)', 'n');
  set('BirthYear', spec.birthYear);
  set('Neighborhood', spec.hood);
  set('Gender', spec.gender || '');
  set('DialState', challengerDialStateJson_());
  set('SkillTags', 'Government & Civic');
  set('CareerStage', 'mid-career');
  // engine.162 (builder 2026-09-04, Direction pt 27): nobody who comes through
  // ingest lands on $0 — only a child or a retiree earns nothing. A challenger
  // was minted with no Income at all: a mid-career adult on the ledger earning
  // nothing, which the D3 employer floor never repairs because a candidate
  // carries no EmployerBizId. Priced by their own neighborhood and their civic
  // field, the same jobReferencePay_ the advancement door uses — no invented
  // number, and no civic-specific base the builder has not set.
  if (typeof jobReferencePay_ === 'function') {
    var challengerPay = jobReferencePay_('Community organizer',
      'Government & Civic', 'mid-career',
      String(spec.officeId || '') + ':' + String(spec.cycle || 0));
    if (challengerPay !== null && challengerPay > 0) set('Income', challengerPay);
  }
  set('MigrationReason', spec.reason || 'arrived to challenge a failing office');
  set('MigratedCycle', spec.cycle || '');
  set('OrginCity', spec.originCity || 'out-of-town');
  set('OriginGame', spec.originCity || 'out-of-town');
  set('LifeHistory', 'C' + spec.cycle + ': Arrived to campaign for ' + (spec.officeId || 'a civic seat') + '.');
  rows.push(row);
  return {
    popId: pop,
    name: (spec.first + ' ' + spec.last).trim(),
    neighborhood: spec.hood,
    tier: 3,
    origin: spec.origin || 'out-of-town'
  };
}

function pickGenericCitizenChallenger_(ctx, district, specBase) {
  if (!ctx || !ctx.ss || typeof ctx.ss.getSheetByName !== 'function') return null;
  var sheet = ctx.ss.getSheetByName('Generic_Citizens');
  if (!sheet || !sheet.getDataRange) return null;
  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return null;
  var h = data[0];
  var idx = function(name) {
    for (var i = 0; i < h.length; i++) {
      if (String(h[i] || '').trim() === name) return i;
    }
    return -1;
  };
  var iF = idx('First'), iL = idx('Last'), iOcc = idx('Occupation');
  var iHood = idx('Neighborhood'), iBy = idx('BirthYear'), iSt = idx('Status'), iSex = idx('Sex');
  var hoods = getDistrictHoods_(ctx, district);
  var best = null, bestScore = -1;
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var st = iSt >= 0 ? String(row[iSt] || 'active').toLowerCase() : 'active';
    if (st && st !== 'active') continue;
    var first = iF >= 0 ? String(row[iF] || '').trim() : '';
    var last = iL >= 0 ? String(row[iL] || '').trim() : '';
    if (!first && !last) continue;
    var occ = iOcc >= 0 ? String(row[iOcc] || '') : '';
    var hood = iHood >= 0 ? String(row[iHood] || '') : '';
    if (iBy >= 0 && row[iBy] !== '' && row[iBy] != null) {
      var age = simYearOf_(ctx) - Number(row[iBy]); // engine.164
      if (isFinite(age) && (age < 25 || age > 70)) continue;
    }
    var local = !hoods.length;
    for (var hi = 0; hi < hoods.length; hi++) {
      if (hood.toLowerCase() === String(hoods[hi]).toLowerCase()) local = true;
    }
    if (!isCivicAdjacentText_(occ) && !local) continue;
    var score = (isCivicAdjacentText_(occ) ? 20 : 0) + (local ? 100 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = {
        first: first, last: last, hood: hood || (hoods[0] || 'Downtown'),
        birthYear: iBy >= 0 ? row[iBy] : 1988,
        gender: iSex >= 0 ? row[iSex] : '',
        occ: occ
      };
    }
  }
  if (!best) return null;
  return mintChallengerOnLedger_(ctx, {
    first: best.first, last: best.last, hood: best.hood,
    birthYear: best.birthYear || 1988, gender: best.gender,
    cycle: specBase.cycle, officeId: specBase.officeId,
    origin: 'generic', originCity: best.hood,
    reason: 'emerged from the city to challenge a failing office'
  });
}

/**
 * civic.31 (builder 2026-09-04): "the path in is always Generic_Citizens —
 * you emerge from there. Out of town or untracked still comes through
 * generic." This door used to assemble a person from two name arrays and
 * write them straight onto the Simulation_Ledger — the one thing SIM_DOCTRINE
 * §5 and §9 forbid. It now does what engine.58 does for an unknown intake
 * name: the arrival lands in Generic_Citizens as a Tier-5 with a real
 * occupation and the district's hood, and returns NO challenger this Cycle.
 * The intent executes at Phase 10; next Cycle, if the office is still under
 * 40, pickGenericCitizenChallenger_ reads the pool, finds them (local hood +
 * civic-adjacent occupation is the top score) and promotes them through the
 * same GC feeder every other citizen uses. A one-Cycle delay is the honest
 * shape: they arrived, then they ran. The only future exception is "gifted
 * entry", which does not exist yet.
 *
 * Idempotent: a second under-40 Cycle with the arrival still waiting in the
 * pool (the feeder passed on them) queues nobody new.
 */
function mintOutOfTownChallenger_(ctx, district, officeId, cycle) {
  if (!ctx || !ctx.ss || typeof ctx.ss.getSheetByName !== 'function') return null;
  if (typeof queueAppendIntent_ !== 'function') return null;
  var sheet = ctx.ss.getSheetByName('Generic_Citizens');
  if (!sheet || !sheet.getDataRange) return null;
  var data = sheet.getDataRange().getValues();
  if (!data || !data.length) return null;
  var gh = data[0];
  var idxG = function(name) {
    for (var i = 0; i < gh.length; i++) if (String(gh[i] || '').trim() === name) return i;
    return -1;
  };
  var iCtx = idxG('EmergenceContext');
  var marker = 'arrived to challenge ' + String(officeId || district || '');
  if (iCtx >= 0) {
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][iCtx] || '').indexOf(marker) >= 0) return null; // already waiting in the pool
    }
  }
  var hoods = getDistrictHoods_(ctx, district);
  var hood = hoods[0] || 'Downtown';
  var seed = String(officeId || district || '') + ':' + String(cycle || 0);
  var h = civicHash_(seed);
  var first = OUT_OF_TOWN_FIRST_[h % OUT_OF_TOWN_FIRST_.length];
  var last = OUT_OF_TOWN_LAST_[Math.floor(h / 7) % OUT_OF_TOWN_LAST_.length];
  var birthYear = 1976 + (h % 20);
  var gender = h % 2 === 0 ? 'F' : 'M';
  var gcNew = new Array(gh.length).fill('');
  var setG = function(name, val) { var gi = idxG(name); if (gi >= 0) gcNew[gi] = val; };
  setG('First', first);
  setG('Last', last);
  setG('Age', simYearOf_(ctx, cycle) - birthYear); // engine.164
  setG('BirthYear', birthYear);
  setG('Neighborhood', hood);
  setG('Occupation', 'Community organizer'); // civic-adjacent: the feeder's top score, and a job, not a placeholder
  setG('EmergenceCount', 1);
  setG('EmergedCycle', 'Cycle ' + cycle);
  setG('EmergenceContext', ('Out-of-town C' + cycle + ': ' + marker + '.').slice(0, 250));
  setG('Status', 'Active');
  setG('Sex', gender);
  queueAppendIntent_(ctx, 'Generic_Citizens', gcNew, 'civic.31 out-of-town challenger -> GC', 'population', 50);
  return null; // no challenger this Cycle — they are in the pool, and the feeder finds them next Cycle
}

/**
 * Three tiers, and only the first two can return a challenger this Cycle:
 * 1) in-ledger, dial-and-tag qualified
 * 2) Generic_Citizens occupation/hood feeder, minted onto the ledger
 * 3) out-of-town arrival — lands in Generic_Citizens, NOT on the ledger
 *    (civic.31, builder 2026-09-04: the path in is always GC). Returns null;
 *    tier 2 finds them next Cycle if the office is still under 40.
 * So an office CAN go a Cycle unopposed. That is the world, not a gap.
 */
function pickCampaignChallenger_(ctx, district, incumbentPopId, occupiedPopIds, officeId, cycle) {
  if (!ctx || !ctx.ledger || !ctx.ledger.headers || !ctx.ledger.rows) return null;
  var headers = ctx.ledger.headers;
  var districtHoods = getDistrictHoods_(ctx, district);
  var scoreYear = simYearOf_(ctx); // engine.164
  var best = null;
  for (var r = 0; r < ctx.ledger.rows.length; r++) {
    var scored = scoreLedgerCitizenForOffice_(
      ctx.ledger.rows[r], headers, district, districtHoods, incumbentPopId, occupiedPopIds, scoreYear
    );
    if (!scored) continue;
    if (!best || scored.score > best.score ||
      (scored.score === best.score && scored.popId < best.popId)) {
      best = scored;
    }
  }
  if (best) return best;
  var fromGc = pickGenericCitizenChallenger_(ctx, district, { cycle: cycle, officeId: officeId });
  if (fromGc) return fromGc;
  return mintOutOfTownChallenger_(ctx, district, officeId, cycle);
}

/**
 * Find column index by possible header names (case-insensitive).
 */
function findApprCol_(headers, possibleNames) {
  for (var i = 0; i < headers.length; i++) {
    var h = (headers[i] || '').toString().toLowerCase().trim();
    for (var j = 0; j < possibleNames.length; j++) {
      if (h === possibleNames[j].toLowerCase()) {
        return i;
      }
    }
  }
  return -1;
}
