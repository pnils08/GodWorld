/**
 * ============================================================================
 * applyDemographicDrift_ v2.5-e133
 * ============================================================================
 *
 * Long-term background demographic drift with GodWorld Calendar integration.
 *
 * v2.5-e133 (engine.133): illness baseline attractor (illnessBaseline /
 * illnessAttractorPull) applied before the day's pushes, and salient weather
 * events (storm/flood/heat; frost/snow at half) add illnessEventStrain — the
 * waves are the weather engine's, illness reacts. Plan:
 * docs/plans/2026-08-29-city-health-system.md D1/D2.
 *
 * v2.4-W2b (engine.102): illness/employment physics literals read from
 * World_Config via ctx.config (keys per output/kimi/engine102/world-config-keys.md,
 * camelCase per ADR-0015). Missing keys warn loudly into ctx.summary.auditIssues
 * (ADR-0015 rule 4) and fall back to the pre-W2b literals.
 *
 * v2.2 Enhancements:
 * - Full GodWorld Calendar integration (30+ holidays)
 * - First Friday cultural/economic effects
 * - Creation Day community stability effects
 * - Holiday-specific demographic shifts
 * - Sports season economic effects
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Season, Holiday
 * - Weather + Weather Mood
 * - Chaos events
 * - City sentiment & dynamics
 * - Economic Mood integration
 *
 * Safe effects ONLY on World_Population statistics.
 * 
 * ============================================================================
 */

function applyDemographicDrift_(ctx) {

  var rng = safeRand_(ctx);

  var sheet = ctx.ss.getSheetByName('World_Population');
  if (!sheet) return;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  var row = values[1];
  var idx = function(name) { return header.indexOf(name); };

  var iTotal = idx('totalPopulation');
  var iIll = idx('illnessRate');
  var iEmp = idx('employmentRate');
  var iMig = idx('migration');
  var iEcon = idx('economy');

  var total = Number(row[iTotal] || 0);
  var ill = Number(row[iIll] || 0.05);
  var emp = Number(row[iEmp] || 0.91);
  var mig = Number(row[iMig] || 0);
  var econ = (row[iEcon] || "stable").toString();

  // Helper for clean decimals
  var round4 = function(v) { return Math.round(v * 10000) / 10000; };
  var round2 = function(v) { return Math.round(v * 100) / 100; };

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONFIG READS (W2b, engine.102)
  // ═══════════════════════════════════════════════════════════════════════════
  // loadConfig_ (phase01-config/godWorldEngine2.js) auto-parses numeric strings,
  // so these reads work whether the sheet stores numbers or strings. cfgNum_
  // warns loudly on a missing key (ADR-0015 rule 4) and treats an explicit 0 as
  // a legitimate tuned value — never a falsy trigger back to the default.
  var cfg = ctx.config || {};

  // Illness physics
  var illnessCalmStep = cfgNum_(ctx, cfg, 'illnessCalmStep', 0.0004);
  var illnessStepUp = cfgNum_(ctx, cfg, 'illnessStepUp', 0.0002);
  var illnessStepDown = cfgNum_(ctx, cfg, 'illnessStepDown', 0.0002);
  var illnessCap = cfgNum_(ctx, cfg, 'illnessCap', 0.15);
  var illnessSupportThreshold = cfgNum_(ctx, cfg, 'illnessSupportThreshold', 0.08);
  var illnessSupportCycles = cfgNum_(ctx, cfg, 'illnessSupportCycles', 3);

  // Employment physics
  var employmentFloor = cfgNum_(ctx, cfg, 'employmentFloor', 0.88);   // engine.135 A
  var employmentAttractor = cfgNum_(ctx, cfg, 'employmentAttractor', 0.96);  // engine.135 A
  var employmentStep = cfgNum_(ctx, cfg, 'employmentStep', 0.0003);
  var prosperityEarnedOnly = String(cfg.prosperityEarnedOnly || '').toUpperCase() === 'TRUE';

  // Migration clamps (read for downstream consistency; not applied here because
  // migration is owned by updateWorldPopulation_).
  var migrationClampLow = cfgNum_(ctx, cfg, 'migrationClampLow', -5000);
  var migrationClampHigh = cfgNum_(ctx, cfg, 'migrationClampHigh', 5000);

  // Hospital coefficients (read for W4 talk-back; not applied here).
  var hospitalBaseCapacity = cfgNum_(ctx, cfg, 'hospitalBaseCapacity', 100);
  var hospitalLoadPerSick = cfgNum_(ctx, cfg, 'hospitalLoadPerSick', 1);
  var hospitalTalkbackGain = cfgNum_(ctx, cfg, 'hospitalTalkbackGain', 0.001);

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var S = ctx.summary;
  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || {
    sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };
  var econMood = S.economicMood || 50;

  // Calendar context (v2.2)
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  // S302 gate: feed SeasonType must not nudge employment/econ in
  // World_Population — Maker config-override only.
  var sportsSeason = (S.sportsAtmosphereEnabled === true) ? (S.sportsSeason || "off-season") : "";

  // Track changes for summary
  var changes = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ILLNESS DRIFT
  // ═══════════════════════════════════════════════════════════════════════════

  var prevIll = ill;

  // engine.133 D2 — the baseline attractor. Employment has had one since
  // v2.x (employmentAttractor below); illness never did, so the base term's
  // mean pull (-0.00004/cycle) lost to every +0.0002 nudge and the rate only
  // ever climbed: 0.05 default -> 0.1023 live at C104 -> 0.15 cap on a long
  // enough bench. Now the rate is pulled home FIRST, then today's weather and
  // calendar push on top — the nudges below are bumps that decay, not a
  // ratchet, and the equilibrium sits at baseline + (average push / pull):
  // winter a little higher, honestly. The descent from 10% is story, on
  // purpose: pull 0.12 takes ~15 cycles to reach 4.5%.
  var illnessBaseline = cfgNum_(ctx, cfg, 'illnessBaseline', 0.035);
  var illnessAttractorPull = cfgNum_(ctx, cfg, 'illnessAttractorPull', 0.12);
  ill += (illnessBaseline - ill) * illnessAttractorPull;

  // Base downward drift
  ill += (rng() - 0.6) * illnessCalmStep;

  // engine.133 D1 — the waves are the seasonal events the weather engine
  // already fires (applyWeatherModel_: storm / flood_conditions / heat_wave
  // carry salient:true + hoods; first_frost / first_snow are city-wide
  // season firsts). Illness REACTS to them: a salient event is a real bump
  // (illnessEventStrain, order of a percentage point) that the attractor
  // above pulls back over the following cycles — the decay tail is the wave.
  // No roll of its own, no wave state: the weather engine owns what fires
  // and where (builder direction 2026-08-29, engine.133 plan D1).
  var illnessEventStrain = cfgNum_(ctx, cfg, 'illnessEventStrain', 0.015);
  var wxEvts133 = S.weatherEvents || [];
  var eventStrainApplied = 0;
  for (var we133 = 0; we133 < wxEvts133.length; we133++) {
    var ev133 = wxEvts133[we133];
    if (!ev133) continue;
    if (ev133.salient) eventStrainApplied += illnessEventStrain;
    else if (ev133.type === 'first_frost' || ev133.type === 'first_snow') eventStrainApplied += illnessEventStrain * 0.5;
  }
  if (eventStrainApplied > 0) {
    ill += eventStrainApplied;
    changes.push('weather-strain');
  }

  // Winter → slightly more upward pressure
  if (season === "Winter") ill += illnessStepUp * 1.5;

  // Fog increases mild illness drift
  if (weather.type === "fog") ill += illnessStepUp;

  // Weather discomfort increases illness
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.3) ill += illnessStepUp;

  // Heat waves stress population
  if (weatherMood.conflictPotential && weatherMood.conflictPotential > 0.3) ill += illnessStepUp * 0.5;

  // Chaos increases instability
  if (chaos.length > 0) ill += illnessStepUp;

  // Economic stress affects health
  if (econMood <= 35) ill += illnessStepUp;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR ILLNESS MODIFIERS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  // Gathering holidays increase illness spread
  var gatheringHolidays = [
    "Thanksgiving", "Holiday", "NewYearsEve", "NewYear",
    "Independence", "OpeningDay", "OaklandPride"
  ];
  if (gatheringHolidays.indexOf(holiday) >= 0) {
    ill += illnessStepUp * 3;
  }

  // Winter holidays compound cold-season effect
  if (season === "Winter" && (holiday === "Holiday" || holiday === "NewYear" || holiday === "NewYearsEve")) {
    ill += illnessStepUp * 2;
  }

  // First Friday slight uptick (crowds, bars)
  if (isFirstFriday) {
    ill += illnessStepUp;
  }

  // High community engagement reduces illness (better support networks)
  if (dynamics.communityEngagement >= 1.4) {
    ill -= illnessStepDown;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOSPITAL TALK-BACK (engine.102 W4, Task 7)
  // ═══════════════════════════════════════════════════════════════════════════
  // Previous cycle's hospital census strains the city: open admissions above
  // capacity push the illness rate up (ground talking back to the city face).
  // Phase 3 runs before this cycle's Phase-10 hospital persist, so the read is
  // structurally last cycle's census — exactly the talk-back direction.
  var hospitalOpen = 0;
  var hospSheet = ctx.ss.getSheetByName('Hospital_Ledger');
  if (hospSheet) {
    var hospVals = hospSheet.getDataRange().getValues();
    var hIdxDischarge = hospVals.length ? hospVals[0].indexOf('DischargeCycle') : -1;
    if (hIdxDischarge >= 0) {
      for (var hRow102 = 1; hRow102 < hospVals.length; hRow102++) {
        var dv = hospVals[hRow102][hIdxDischarge];
        if (dv === '' || dv === null) hospitalOpen++;
      }
    }
  }
  var hospitalLoadUnits = hospitalOpen * hospitalLoadPerSick;
  var hospitalStrainApplied = 0;
  if (hospitalLoadUnits > hospitalBaseCapacity) {
    hospitalStrainApplied = hospitalTalkbackGain * (hospitalLoadUnits - hospitalBaseCapacity);
    ill += hospitalStrainApplied;
    changes.push('hospital-strain');
  }
  S.hospitalTalkback = {
    open: hospitalOpen,
    loadUnits: hospitalLoadUnits,
    capacity: hospitalBaseCapacity,
    applied: round4(hospitalStrainApplied)
  };

  ill = round4(ill);
  if (ill < 0) ill = 0;
  if (ill > illnessCap) ill = illnessCap;

  if (Math.abs(ill - prevIll) > 0.0005) {
    changes.push('illness ' + (ill > prevIll ? 'up' : 'down'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. EMPLOYMENT DRIFT
  // ═══════════════════════════════════════════════════════════════════════════

  var prevEmp = emp;

  // prosperityEarnedOnly=TRUE disables the free-prosperity attractor.
  // engine.135 A — the dial is PULLED to the attractor, illness-style (engine.133
  // D2): a fraction of the gap per cycle from either side, so a realigned cell
  // (the hood-lived rate at deploy) reaches the boom-city number in ~10-20
  // cycles instead of the 0.0003 step's ~200, and an over-boom reading comes
  // back the same way. The attractor is the plan's realistic-with-boom-kick
  // number (docs/plans/2026-08-29-employment-system-cascade.md §Phase A,
  // approved 2026-08-29): World_Config employmentAttractor 0.96, floor 0.88.
  if (!prosperityEarnedOnly) {
    var employmentAttractorPull = cfgNum_(ctx, cfg, 'employmentAttractorPull', 0.12);
    emp += (employmentAttractor - emp) * employmentAttractorPull;
  }

  // Sentiment influences small shifts
  if (dynamics.sentiment <= -0.3) emp -= illnessStepUp;
  if (dynamics.sentiment >= 0.3) emp += illnessStepUp;

  // Economic mood integration
  if (econMood >= 65) emp += employmentStep;
  if (econMood <= 35) emp -= employmentStep;

  // Perfect weather slightly boosts productivity
  if (weatherMood.perfectWeather) emp += illnessStepUp * 0.5;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR EMPLOYMENT MODIFIERS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  // Retail holidays boost temporary employment
  var retailHolidays = ["Holiday", "BlackFriday", "Valentine", "MothersDay", "FathersDay"];
  if (retailHolidays.indexOf(holiday) >= 0) {
    emp += illnessStepUp * 4;
  }

  // Service industry holidays boost employment
  var serviceHolidays = ["Independence", "MemorialDay", "LaborDay", "CincoDeMayo"];
  if (serviceHolidays.indexOf(holiday) >= 0) {
    emp += illnessStepUp * 2.5;
  }

  // Championship economic boost
  if (sportsSeason === "championship") {
    emp += illnessStepUp * 5;
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    emp += illnessStepUp * 3;
  }

  // First Friday boosts arts/service employment
  if (isFirstFriday) {
    emp += illnessStepUp * 2;
  }

  // High cultural activity boosts creative employment
  if (dynamics.culturalActivity >= 1.4) {
    emp += illnessStepUp * 2;
  }

  // January slump (post-holiday layoffs)
  if (holiday === "NewYear" && econ !== "strong" && econ !== "booming") {
    emp -= illnessStepUp * 3;
  }

  emp = round4(emp);
  if (emp < employmentFloor) emp = employmentFloor;
  if (emp > 0.98) emp = 0.98; // Cap at 98%

  if (Math.abs(emp - prevEmp) > 0.0005) {
    changes.push('employment ' + (emp > prevEmp ? 'up' : 'down'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. MIGRATION — READ ONLY (v2.3)
  // Migration is calculated by updateWorldPopulation_ in Phase 1.
  // This function only reads it for summary/logging. No double-modification.
  // ═══════════════════════════════════════════════════════════════════════════

  // W2b: expose clamps in summary so the W1 audit can see intended bounds.
  S.migrationClamps = { low: migrationClampLow, high: migrationClampHigh };

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ECONOMY LABEL UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  var prevEcon = econ;

  // Economy follows economic mood from ripple engine
  if (econMood >= 70) econ = "booming";
  else if (econMood >= 55) econ = "strong";
  else if (econMood >= 45) econ = "stable";
  else if (econMood >= 30) econ = "weak";
  else econ = "struggling";

  // Chaos may nudge instability narrative
  if (chaos.length >= 3 && (econ === "stable" || econ === "strong")) {
    econ = "unstable";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR ECONOMY LABEL MODIFIERS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  // Major holidays can temporarily boost economy label
  if (holidayPriority === "major" && emp > 0.92 && econ === "strong") {
    econ = "booming"; // Holiday spending boost
  }

  // Championship economic boost
  if (sportsSeason === "championship" && econ !== "weak" && econ !== "struggling") {
    econ = "booming";
  }

  // Post-holiday slump
  if (holiday === "NewYear" && econ === "booming") {
    econ = "strong"; // January correction
  }

  if (econ !== prevEcon) {
    changes.push('economy → ' + econ);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE BACK
  // ═══════════════════════════════════════════════════════════════════════════

  sheet.getRange(2, iIll + 1).setValue(ill);
  sheet.getRange(2, iEmp + 1).setValue(emp);
  // Migration write removed (v2.3) — owned by updateWorldPopulation_
  sheet.getRange(2, iEcon + 1).setValue(econ);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════

  S.demographicDrift = {
    illnessRate: ill,
    employmentRate: emp,
    migration: mig,
    economy: econ,
    changes: changes,
    calendarFactors: {
      holiday: holiday,
      holidayPriority: holidayPriority,
      isFirstFriday: isFirstFriday,
      isCreationDay: isCreationDay,
      sportsSeason: sportsSeason
    },
    // W2b: surface tunables so downstream phases can use them without re-reading.
    illnessSupportThreshold: illnessSupportThreshold,
    illnessSupportCycles: illnessSupportCycles,
    illnessBaseline: illnessBaseline,
    illnessEventStrain: round4(eventStrainApplied),
    hospitalConfig: {
      baseCapacity: hospitalBaseCapacity,
      loadPerSick: hospitalLoadPerSick,
      talkbackGain: hospitalTalkbackGain
    }
  };

  ctx.summary = S;
}


/**
 * W2b (engine.102): numeric World_Config read with loud missing-key warning.
 *
 * ADR-0015 rule 4 — missing keys fail loud, never silently default. An explicit
 * 0 in the sheet is a legitimate tuned value (freeze a step, disable a gain),
 * so absence is detected before coercion, never via falsiness.
 */
function cfgNum_(ctx, cfg, key, defaultValue) {
  var raw = cfg ? cfg[key] : undefined;
  if (raw === undefined || raw === null || raw === '') {
    pushMissingConfigWarning_(ctx, key, defaultValue);
    return defaultValue;
  }
  var v = Number(raw);
  if (isNaN(v)) {
    pushMissingConfigWarning_(ctx, key, defaultValue);
    return defaultValue;
  }
  return v;
}


/**
 * W2b helper: push a one-time ctx warning when a World_Config key is missing.
 *
 * Shared by the W2b fallback-class sweep sites:
 *   - phase04-events/generationalEventsEngine.js (illnessFallbackRate)
 *   - phase03-population/updateNeighborhoodDemographics.js (illness/employment fallbacks)
 *
 * Mirrors the ctx.summary.auditIssues channel used by logEngineError_ and is
 * surfaced in the cycle-close digest.
 */
function pushMissingConfigWarning_(ctx, key, defaultValue) {
  var S = (ctx && ctx.summary) || {};
  if (!S._configMissingWarnings) S._configMissingWarnings = {};
  if (S._configMissingWarnings[key]) return;
  S._configMissingWarnings[key] = true;
  if (!S.auditIssues) S.auditIssues = [];
  S.auditIssues.push('World_Config key "' + key + '" missing; using default ' + defaultValue +
                     ' (engine.102 W2b)');
  if (ctx) ctx.summary = S;
}


/**
 * ============================================================================
 * DEMOGRAPHIC DRIFT REFERENCE (updated for W2b)
 * ============================================================================
 *
 * ILLNESS RATE:
 * - Base: downward drift x illnessCalmStep (default 0.0004)
 * - Winter: +illnessStepUp x1.5 (default 0.0003)
 * - Fog: +illnessStepUp (default 0.0002)
 * - Low comfort: +illnessStepUp (default 0.0002)
 * - High conflict potential: +illnessStepUp x0.5 (default 0.0001)
 * - Chaos: +illnessStepUp (default 0.0002)
 * - Low economic mood: +illnessStepUp (default 0.0002)
 *
 * CALENDAR ILLNESS (v2.2):
 * - Gathering holidays: +illnessStepUp x3 (default 0.0006)
 * - Winter + winter holiday: +illnessStepUp x2 (default 0.0004)
 * - First Friday: +illnessStepUp (default 0.0002)
 * - High community engagement: -illnessStepDown (default 0.0002)
 * - Cap: illnessCap (default 0.15)
 *
 * EMPLOYMENT RATE:
 * - prosperityEarnedOnly=FALSE: pulled toward employmentAttractor (0.96) by
 *   employmentAttractorPull (0.12) of the gap per Cycle (engine.135 A)
 *   (defaults 0.90-0.93, step 0.0003)
 * - Negative sentiment: -illnessStepUp / Positive sentiment: +illnessStepUp
 * - High economic mood: +employmentStep / Low: -employmentStep
 * - Perfect weather: +illnessStepUp x0.5
 *
 * CALENDAR EMPLOYMENT (v2.2):
 * - Retail holidays: +illnessStepUp x4 (default 0.0008)
 * - Service holidays: +illnessStepUp x2.5 (default 0.0005)
 * - Championship: +illnessStepUp x5 (default 0.001)
 * - Playoffs: +illnessStepUp x3 (default 0.0006)
 * - First Friday / High cultural activity: +illnessStepUp x2 (default 0.0004)
 * - January slump: -illnessStepUp x3 (default 0.0006)
 * - Floor: employmentFloor (default 0.88) / Cap: 0.98
 *
 * MIGRATION:
 * - Owned by updateWorldPopulation_; this phase reads only.
 * - Clamps exposed in summary: migrationClampLow / migrationClampHigh
 *
 * ECONOMY LABEL:
 * - econMood >=70 booming / >=55 strong / >=45 stable / >=30 weak / <30 struggling
 * - 3+ chaos events: unstable
 *
 * CALENDAR ECONOMY (v2.2):
 * - Major holiday + high employment + strong -> booming
 * - Championship + non-weak -> booming
 * - NewYear + booming -> strong (January correction)
 *
 * ============================================================================
 */
