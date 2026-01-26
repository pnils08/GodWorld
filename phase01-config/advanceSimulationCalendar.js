/**
 * ============================================================================
 * advanceSimulationCalendar_ v2.2
 * ============================================================================
 *
 * Cycle-based simulation calendar per GODWORLD CALENDAR v1.0.
 * 
 * Core principle: CYCLES are the canonical time unit.
 * - 1 cycle = 1 week
 * - 52 cycles = 1 GodWorld Year
 * - SimMonth derived from cycle (not incremented independently)
 * - Holidays tied to cycles (not dates)
 *
 * Derives:
 * - GodWorld Year from absolute cycle
 * - Cycle of Year (1-52)
 * - SimMonth from cycle-to-month mapping
 * - Season from SimMonth
 * - Holiday from cycle
 * - Weather baseline from season
 *
 * ============================================================================
 */

function advanceSimulationCalendar_(ctx) {

  var sheet = ctx.ss.getSheetByName('Simulation_Calendar');
  if (!sheet) return;

  var S = ctx.summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // GET ABSOLUTE CYCLE (source of truth)
  // ═══════════════════════════════════════════════════════════════════════════

  // Absolute cycle comes from World_Config (set by advanceWorldTime_)
  var absoluteCycle = ctx.config.cycleCount || S.cycleId || 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE GODWORLD YEAR AND CYCLE OF YEAR
  // ═══════════════════════════════════════════════════════════════════════════

  var godWorldYear = Math.ceil(absoluteCycle / 52);
  var cycleOfYear = ((absoluteCycle - 1) % 52) + 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVE SIMMONTH FROM CYCLE (per GodWorld Calendar v1.0)
  // ═══════════════════════════════════════════════════════════════════════════

  // Month-to-cycle mapping:
  // January:   1-5   (5 cycles)
  // February:  6-9   (4 cycles)
  // March:     10-13 (4 cycles)
  // April:     14-17 (4 cycles)
  // May:       18-22 (5 cycles)
  // June:      23-26 (4 cycles)
  // July:      27-30 (4 cycles)
  // August:    31-35 (5 cycles)
  // September: 36-39 (4 cycles)
  // October:   40-44 (5 cycles)
  // November:  45-48 (4 cycles)
  // December:  49-52 (4 cycles)

  var simMonth = 1;
  var cycleInMonth = 1;
  
  if (cycleOfYear >= 1 && cycleOfYear <= 5) {
    simMonth = 1;
    cycleInMonth = cycleOfYear;
  } else if (cycleOfYear >= 6 && cycleOfYear <= 9) {
    simMonth = 2;
    cycleInMonth = cycleOfYear - 5;
  } else if (cycleOfYear >= 10 && cycleOfYear <= 13) {
    simMonth = 3;
    cycleInMonth = cycleOfYear - 9;
  } else if (cycleOfYear >= 14 && cycleOfYear <= 17) {
    simMonth = 4;
    cycleInMonth = cycleOfYear - 13;
  } else if (cycleOfYear >= 18 && cycleOfYear <= 22) {
    simMonth = 5;
    cycleInMonth = cycleOfYear - 17;
  } else if (cycleOfYear >= 23 && cycleOfYear <= 26) {
    simMonth = 6;
    cycleInMonth = cycleOfYear - 22;
  } else if (cycleOfYear >= 27 && cycleOfYear <= 30) {
    simMonth = 7;
    cycleInMonth = cycleOfYear - 26;
  } else if (cycleOfYear >= 31 && cycleOfYear <= 35) {
    simMonth = 8;
    cycleInMonth = cycleOfYear - 30;
  } else if (cycleOfYear >= 36 && cycleOfYear <= 39) {
    simMonth = 9;
    cycleInMonth = cycleOfYear - 35;
  } else if (cycleOfYear >= 40 && cycleOfYear <= 44) {
    simMonth = 10;
    cycleInMonth = cycleOfYear - 39;
  } else if (cycleOfYear >= 45 && cycleOfYear <= 48) {
    simMonth = 11;
    cycleInMonth = cycleOfYear - 44;
  } else if (cycleOfYear >= 49 && cycleOfYear <= 52) {
    simMonth = 12;
    cycleInMonth = cycleOfYear - 48;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASON CALCULATION (from SimMonth)
  // ═══════════════════════════════════════════════════════════════════════════

  var season = "Spring";
  if (typeof getSimSeason_ === 'function') {
    season = getSimSeason_(simMonth);
  } else {
    // Fallback calculation
    if ([12, 1, 2].indexOf(simMonth) >= 0) season = "Winter";
    else if ([3, 4, 5].indexOf(simMonth) >= 0) season = "Spring";
    else if ([6, 7, 8].indexOf(simMonth) >= 0) season = "Summer";
    else season = "Fall";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY CALCULATION (from Cycle, not date)
  // ═══════════════════════════════════════════════════════════════════════════

  var holiday = "none";
  var holidayDetails = null;

  if (typeof getSimHoliday_ === 'function') {
    // v2.3+ takes cycleOfYear
    holiday = getSimHoliday_(cycleOfYear);
  }

  if (typeof getSimHolidayDetails_ === 'function') {
    holidayDetails = getSimHolidayDetails_(cycleOfYear);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  var isFirstFriday = false;
  if (typeof isFirstFridayCycle_ === 'function') {
    isFirstFriday = isFirstFridayCycle_(cycleOfYear);
  } else {
    // Fallback: first cycle of each month
    var firstFridayCycles = [1, 6, 10, 14, 18, 23, 27, 31, 36, 40, 45, 49];
    isFirstFriday = firstFridayCycles.indexOf(cycleOfYear) >= 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY CHECK
  // ═══════════════════════════════════════════════════════════════════════════

  var isCreationDay = (cycleOfYear === 48);
  var creationDayAnniversary = isCreationDay ? godWorldYear - 1 : null;

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE TO SIMULATION_CALENDAR SHEET
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Column mapping (preserving structure):
  // A: SimYear (now GodWorld Year)
  // B: SimMonth
  // C: SimDay (now CycleInMonth for backwards compatibility)
  // D: Season
  // E: HolidayFlag
  // F: Notes (optional)
  
  sheet.getRange(2, 1).setValue(godWorldYear);
  sheet.getRange(2, 2).setValue(simMonth);
  sheet.getRange(2, 3).setValue(cycleInMonth);
  sheet.getRange(2, 4).setValue(season);
  sheet.getRange(2, 5).setValue(holiday);
  
  // Optional: Write cycle info to Notes column
  var cycleNote = "Cycle " + cycleOfYear + " (Abs: " + absoluteCycle + ")";
  sheet.getRange(2, 6).setValue(cycleNote);

  // ═══════════════════════════════════════════════════════════════════════════
  // MONTH NAME LOOKUP
  // ═══════════════════════════════════════════════════════════════════════════

  var monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  var monthName = monthNames[simMonth] || "Unknown";

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY FIELDS
  // ═══════════════════════════════════════════════════════════════════════════
  
  S.absoluteCycle = absoluteCycle;
  S.godWorldYear = godWorldYear;
  S.cycleOfYear = cycleOfYear;
  S.cycleInMonth = cycleInMonth;
  S.simYear = godWorldYear;  // Alias for backwards compatibility
  S.simMonth = simMonth;
  S.simDay = cycleInMonth;   // Alias for backwards compatibility
  S.monthName = monthName;
  S.season = season;
  S.holiday = holiday;
  S.holidayDetails = holidayDetails;
  S.holidayPriority = holidayDetails ? holidayDetails.priority : "none";
  S.holidayNeighborhood = holidayDetails ? holidayDetails.neighborhood : null;
  S.isFirstFriday = isFirstFriday;
  S.isCreationDay = isCreationDay;
  S.creationDayAnniversary = creationDayAnniversary;

  // Formatted cycle reference
  S.cycleRef = "Y" + godWorldYear + "C" + cycleOfYear;

  // ═══════════════════════════════════════════════════════════════════════════
  // BASELINE WEATHER (if none already generated)
  // ═══════════════════════════════════════════════════════════════════════════

  if (!S.weather) {
    var baseType = "clear";
    var baseImpact = 1.0;

    if (season === "Winter") {
      baseImpact = 1.2;
      baseType = Math.random() < 0.3 ? "rain" : "clear";
    } else if (season === "Summer") {
      baseImpact = 0.9;
      baseType = Math.random() < 0.2 ? "hot" : "clear";
    } else if (season === "Fall") {
      baseType = Math.random() < 0.25 ? "fog" : "clear";
    } else if (season === "Spring") {
      baseType = Math.random() < 0.25 ? "rain" : "clear";
    }

    S.weather = {
      type: baseType,
      impact: baseImpact
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BASELINE WEATHER MOOD (if none already generated)
  // ═══════════════════════════════════════════════════════════════════════════

  if (!S.weatherMood) {
    var primaryMood = "neutral";
    var comfortIndex = 0.5;

    if (season === "Winter") {
      primaryMood = "cozy";
      comfortIndex = 0.4;
    } else if (season === "Summer") {
      primaryMood = "energetic";
      comfortIndex = 0.6;
    } else if (season === "Spring") {
      primaryMood = "hopeful";
      comfortIndex = 0.7;
    } else if (season === "Fall") {
      primaryMood = "introspective";
      comfortIndex = 0.55;
    }

    S.weatherMood = {
      primaryMood: primaryMood,
      comfortIndex: comfortIndex,
      perfectWeather: comfortIndex >= 0.7,
      conflictPotential: 0,
      nostalgiaFactor: season === "Fall" ? 0.3 : 0
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY MOOD MODIFIER
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday !== "none" && S.weatherMood) {
    var priority = S.holidayPriority;
    
    if (priority === "major") {
      S.weatherMood.holidayEnergy = 0.8;
    } else if (priority === "cultural" || priority === "oakland") {
      S.weatherMood.holidayEnergy = 0.5;
    } else if (priority === "minor") {
      S.weatherMood.holidayEnergy = 0.2;
    } else {
      S.weatherMood.holidayEnergy = 0;
    }
    
    // Creation Day special modifier
    if (isCreationDay) {
      S.weatherMood.creationDayResonance = true;
    }
  }

  ctx.summary = S;
}


/**
 * ============================================================================
 * SIMULATION_CALENDAR SHEET SCHEMA
 * ============================================================================
 * 
 * Column | Header      | Example      | Notes
 * ──────────────────────────────────────────────────────────────────────────
 * A      | SimYear     | 2           | GodWorld Year
 * B      | SimMonth    | 5           | Derived from cycle (1-12)
 * C      | SimDay      | 1           | Cycle-in-month (1-5)
 * D      | Season      | Spring      | Derived from SimMonth
 * E      | HolidayFlag | CincoDeMayo | From cycle, not date
 * F      | Notes       | Cycle 18... | Optional cycle reference
 * 
 * ============================================================================
 */