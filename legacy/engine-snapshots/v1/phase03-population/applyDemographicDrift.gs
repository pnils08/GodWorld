/**
 * ============================================================================
 * applyDemographicDrift_ v2.3
 * ============================================================================
 *
 * Long-term background demographic drift with GodWorld Calendar integration.
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

  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

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
  var sportsSeason = S.sportsSeason || "off-season";

  // Track changes for summary
  var changes = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ILLNESS DRIFT
  // ═══════════════════════════════════════════════════════════════════════════

  var prevIll = ill;

  // Base downward drift
  ill += (rng() - 0.6) * 0.0004;

  // Winter → slightly more upward pressure
  if (season === "Winter") ill += 0.0003;

  // Fog increases mild illness drift
  if (weather.type === "fog") ill += 0.0002;

  // Weather discomfort increases illness
  if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.3) ill += 0.0002;

  // Heat waves stress population
  if (weatherMood.conflictPotential && weatherMood.conflictPotential > 0.3) ill += 0.0001;

  // Chaos increases instability
  if (chaos.length > 0) ill += 0.0002;

  // Economic stress affects health
  if (econMood <= 35) ill += 0.0002;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR ILLNESS MODIFIERS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  // Gathering holidays increase illness spread
  var gatheringHolidays = [
    "Thanksgiving", "Holiday", "NewYearsEve", "NewYear",
    "Independence", "OpeningDay", "OaklandPride"
  ];
  if (gatheringHolidays.indexOf(holiday) >= 0) {
    ill += 0.0006;
  }

  // Winter holidays compound cold-season effect
  if (season === "Winter" && (holiday === "Holiday" || holiday === "NewYear" || holiday === "NewYearsEve")) {
    ill += 0.0004;
  }

  // First Friday slight uptick (crowds, bars)
  if (isFirstFriday) {
    ill += 0.0002;
  }

  // High community engagement reduces illness (better support networks)
  if (dynamics.communityEngagement >= 1.4) {
    ill -= 0.0002;
  }

  ill = round4(ill);
  if (ill < 0) ill = 0;
  if (ill > 0.15) ill = 0.15; // Cap at 15%

  if (Math.abs(ill - prevIll) > 0.0005) {
    changes.push('illness ' + (ill > prevIll ? 'up' : 'down'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. EMPLOYMENT DRIFT
  // ═══════════════════════════════════════════════════════════════════════════

  var prevEmp = emp;

  // Tend toward 0.90–0.93 band
  if (emp < 0.90) emp += 0.0003;
  if (emp > 0.93) emp -= 0.0003;

  // Sentiment influences small shifts
  if (dynamics.sentiment <= -0.3) emp -= 0.0002;
  if (dynamics.sentiment >= 0.3) emp += 0.0002;

  // Economic mood integration
  if (econMood >= 65) emp += 0.0003;
  if (econMood <= 35) emp -= 0.0003;

  // Perfect weather slightly boosts productivity
  if (weatherMood.perfectWeather) emp += 0.0001;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR EMPLOYMENT MODIFIERS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  // Retail holidays boost temporary employment
  var retailHolidays = ["Holiday", "BlackFriday", "Valentine", "MothersDay", "FathersDay"];
  if (retailHolidays.indexOf(holiday) >= 0) {
    emp += 0.0008;
  }

  // Service industry holidays boost employment
  var serviceHolidays = ["Independence", "MemorialDay", "LaborDay", "CincoDeMayo"];
  if (serviceHolidays.indexOf(holiday) >= 0) {
    emp += 0.0005;
  }

  // Championship economic boost
  if (sportsSeason === "championship") {
    emp += 0.001;
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    emp += 0.0006;
  }

  // First Friday boosts arts/service employment
  if (isFirstFriday) {
    emp += 0.0004;
  }

  // High cultural activity boosts creative employment
  if (dynamics.culturalActivity >= 1.4) {
    emp += 0.0004;
  }

  // January slump (post-holiday layoffs)
  if (holiday === "NewYear" && econ !== "strong" && econ !== "booming") {
    emp -= 0.0006;
  }

  emp = round4(emp);
  if (emp < 0.80) emp = 0.80; // Floor at 80%
  if (emp > 0.98) emp = 0.98; // Cap at 98%

  if (Math.abs(emp - prevEmp) > 0.0005) {
    changes.push('employment ' + (emp > prevEmp ? 'up' : 'down'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. MIGRATION — READ ONLY (v2.3)
  // Migration is calculated by updateWorldPopulation_ in Phase 1.
  // This function only reads it for summary/logging. No double-modification.
  // ═══════════════════════════════════════════════════════════════════════════

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
    }
  };

  ctx.summary = S;
}


/**
 * ============================================================================
 * DEMOGRAPHIC DRIFT REFERENCE
 * ============================================================================
 * 
 * ILLNESS RATE:
 * - Base: downward drift ×0.0004
 * - Winter: +0.0003
 * - Fog: +0.0002
 * - Low comfort: +0.0002
 * - High conflict potential: +0.0001
 * - Chaos: +0.0002
 * - Low economic mood: +0.0002
 * 
 * CALENDAR ILLNESS (v2.2):
 * - Gathering holidays: +0.0006
 * - Winter + winter holiday: +0.0004
 * - First Friday: +0.0002
 * - High community engagement: -0.0002
 * - Cap: 15%
 * 
 * EMPLOYMENT RATE:
 * - Base: trends toward 0.90-0.93
 * - Negative sentiment: -0.0002
 * - Positive sentiment: +0.0002
 * - High economic mood: +0.0003
 * - Low economic mood: -0.0003
 * - Perfect weather: +0.0001
 * 
 * CALENDAR EMPLOYMENT (v2.2):
 * - Retail holidays: +0.0008
 * - Service holidays: +0.0005
 * - Championship: +0.001
 * - Playoffs: +0.0006
 * - First Friday: +0.0004
 * - High cultural activity: +0.0004
 * - January slump: -0.0006
 * - Cap: 80%-98%
 * 
 * MIGRATION:
 * - Natural damping toward 0
 * - Chaos: ±20
 * - Weather impact: ±10
 * - High economic mood: +5
 * - Low economic mood: -5
 * - Negative sentiment: -3
 * 
 * CALENDAR MIGRATION (v2.2):
 * 
 * | Holiday Category | Effect |
 * |-----------------|--------|
 * | Travel holidays | ±50 volatility |
 * | Gathering holidays | +40 inflow |
 * | Cultural visitor holidays | +25 inflow |
 * | Minor holidays | ±20 |
 * | Civic rest holidays | ±10 |
 * | Major priority | ±30 |
 * | Oakland priority | +35 inflow |
 * | Cultural priority | +20 inflow |
 * | First Friday | +30 inflow |
 * | Creation Day | +15 settling |
 * | Championship | +60 inflow |
 * | Playoffs | +40 inflow |
 * | Late-season | +20 inflow |
 * | High public spaces | ±20 |
 * | High cultural activity | +15 inflow |
 * | High community engagement | +10 retention |
 * 
 * ECONOMY LABEL:
 * - econMood ≥70: "booming"
 * - econMood ≥55: "strong"
 * - econMood ≥45: "stable"
 * - econMood ≥30: "weak"
 * - econMood <30: "struggling"
 * - 3+ chaos events: "unstable"
 * 
 * CALENDAR ECONOMY (v2.2):
 * - Major holiday + high employment + strong → "booming"
 * - Championship + non-weak → "booming"
 * - NewYear + booming → "strong" (January correction)
 * 
 * ============================================================================
 */