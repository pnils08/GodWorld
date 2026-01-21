/**
 * ============================================================================
 * getSimHoliday_ v2.3
 * ============================================================================
 * 
 * Returns holiday flag based on CYCLE (1-52), not dates.
 * Per GodWorld Calendar v1.0 — cycles are the canonical time unit.
 * 
 * Input: cycleOfYear (1-52)
 * Output: Holiday name string or "none"
 * 
 * ============================================================================
 */

function getSimHoliday_(cycleOfYear) {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // JANUARY (Cycles 1-5)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (cycleOfYear === 1) return "NewYear";
  if (cycleOfYear === 3) return "MLKDay";
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FEBRUARY (Cycles 6-9)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (cycleOfYear === 6) return "BlackHistoryMonth";
  if (cycleOfYear === 7) return "Valentine";
  if (cycleOfYear === 8) return "PresidentsDay";
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MARCH (Cycles 10-13)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (cycleOfYear === 11) return "StPatricksDay";
  if (cycleOfYear === 12) return "SpringEquinox";
  
  // ═══════════════════════════════════════════════════════════════════════════
  // APRIL (Cycles 14-17)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (cycleOfYear === 15) return "Easter";
  if (cycleOfYear === 16) return "EarthDay";
  if (cycleOfYear === 17) return "OpeningDay";
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MAY (Cycles 18-22)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (cycleOfYear === 18) return "CincoDeMayo";
  if (cycleOfYear === 19) return "MothersDay";
  if (cycleOfYear === 21) return "MemorialDay";
  if (cycleOfYear === 22) return "OaklandPride";
  
  // ═══════════════════════════════════════════════════════════════════════════
  // JUNE (Cycles 23-26)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (cycleOfYear === 23) return "PrideMonth";
  if (cycleOfYear === 24) return "Juneteenth";
  if (cycleOfYear === 25) return "FathersDay";
  if (cycleOfYear === 26) return "SummerSolstice";
  
  // ═══════════════════════════════════════════════════════════════════════════
  // JULY (Cycles 27-30)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (cycleOfYear === 27) return "Independence";
  if (cycleOfYear === 28) return "SummerFestival";
  
  // ═══════════════════════════════════════════════════════════════════════════
  // AUGUST (Cycles 31-35)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (cycleOfYear === 33) return "BackToSchool";
  if (cycleOfYear === 34) return "ArtSoulFestival";
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SEPTEMBER (Cycles 36-39)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (cycleOfYear === 36) return "LaborDay";
  if (cycleOfYear === 37) return "PatriotDay";
  if (cycleOfYear === 38) return "FallEquinox";
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OCTOBER (Cycles 40-44)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (cycleOfYear === 41) return "IndigenousPeoplesDay";
  if (cycleOfYear === 44) return "Halloween";
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NOVEMBER (Cycles 45-48)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (cycleOfYear === 45) return "DiaDeMuertos";
  if (cycleOfYear === 46) return "VeteransDay";
  if (cycleOfYear === 47) return "Thanksgiving";
  if (cycleOfYear === 48) return "CreationDay";
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DECEMBER (Cycles 49-52)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (cycleOfYear === 50) return "Hanukkah";
  if (cycleOfYear === 51) return "Holiday"; // Christmas
  if (cycleOfYear === 52) return "NewYearsEve";

  return "none";
}


/**
 * ============================================================================
 * getSimHolidayDetails_ v2.3
 * ============================================================================
 * 
 * Returns rich holiday object based on CYCLE (1-52).
 * Includes priority, neighborhood, and type.
 * 
 * ============================================================================
 */

function getSimHolidayDetails_(cycleOfYear) {
  
  const name = getSimHoliday_(cycleOfYear);
  
  if (name === "none") {
    return { name: "none", priority: "none", neighborhood: null, type: null };
  }
  
  // Holiday metadata lookup
  const metadata = {
    // MAJOR
    "NewYear":        { priority: "major", neighborhood: "Downtown", type: "celebration" },
    "MLKDay":         { priority: "major", neighborhood: "West Oakland", type: "remembrance" },
    "Easter":         { priority: "major", neighborhood: null, type: "religious" },
    "MemorialDay":    { priority: "major", neighborhood: null, type: "remembrance" },
    "Juneteenth":     { priority: "major", neighborhood: "West Oakland", type: "celebration" },
    "Independence":   { priority: "major", neighborhood: "Lake Merritt", type: "celebration" },
    "LaborDay":       { priority: "major", neighborhood: null, type: "government" },
    "Halloween":      { priority: "major", neighborhood: "Temescal", type: "celebration" },
    "Thanksgiving":   { priority: "major", neighborhood: null, type: "family" },
    "CreationDay":    { priority: "major", neighborhood: "Oakland", type: "godworld" },
    "Holiday":        { priority: "major", neighborhood: null, type: "celebration" },
    "NewYearsEve":    { priority: "major", neighborhood: "Downtown", type: "celebration" },
    
    // CULTURAL
    "BlackHistoryMonth": { priority: "cultural", neighborhood: "West Oakland", type: "observance" },
    "CincoDeMayo":    { priority: "cultural", neighborhood: "Fruitvale", type: "celebration" },
    "PrideMonth":     { priority: "cultural", neighborhood: "Downtown", type: "observance" },
    "IndigenousPeoplesDay": { priority: "cultural", neighborhood: null, type: "observance" },
    "DiaDeMuertos":   { priority: "cultural", neighborhood: "Fruitvale", type: "cultural" },
    "Hanukkah":       { priority: "cultural", neighborhood: null, type: "religious" },
    
    // OAKLAND
    "OpeningDay":     { priority: "oakland", neighborhood: "Jack London", type: "sports" },
    "OaklandPride":   { priority: "oakland", neighborhood: "Downtown", type: "celebration" },
    "ArtSoulFestival": { priority: "oakland", neighborhood: "Downtown", type: "celebration" },
    "SummerFestival": { priority: "oakland", neighborhood: "various", type: "celebration" },
    "EarthDay":       { priority: "oakland", neighborhood: "Lake Merritt", type: "environmental" },
    
    // MINOR
    "Valentine":      { priority: "minor", neighborhood: null, type: "romance" },
    "PresidentsDay":  { priority: "minor", neighborhood: null, type: "government" },
    "StPatricksDay":  { priority: "minor", neighborhood: "Downtown", type: "celebration" },
    "MothersDay":     { priority: "minor", neighborhood: null, type: "family" },
    "FathersDay":     { priority: "minor", neighborhood: null, type: "family" },
    "VeteransDay":    { priority: "minor", neighborhood: null, type: "government" },
    "BackToSchool":   { priority: "minor", neighborhood: null, type: "civic" },
    "PatriotDay":     { priority: "minor", neighborhood: null, type: "solemn" },
    "SpringEquinox":  { priority: "minor", neighborhood: null, type: "seasonal" },
    "SummerSolstice": { priority: "minor", neighborhood: "Lake Merritt", type: "seasonal" },
    "FallEquinox":    { priority: "minor", neighborhood: null, type: "seasonal" },
    "WinterSolstice": { priority: "minor", neighborhood: null, type: "seasonal" }
  };
  
  const meta = metadata[name] || { priority: "minor", neighborhood: null, type: null };
  
  return {
    name: name,
    priority: meta.priority,
    neighborhood: meta.neighborhood,
    type: meta.type,
    cycle: cycleOfYear
  };
}


/**
 * ============================================================================
 * isFirstFridayCycle_ v1.0
 * ============================================================================
 * 
 * Returns true if cycle is a First Friday cycle.
 * First Fridays = first cycle of each month.
 * 
 * Cycles: 1, 6, 10, 14, 18, 23, 27, 31, 36, 40, 45, 49
 * 
 * ============================================================================
 */

function isFirstFridayCycle_(cycleOfYear) {
  const firstFridayCycles = [1, 6, 10, 14, 18, 23, 27, 31, 36, 40, 45, 49];
  return firstFridayCycles.includes(cycleOfYear);
}


/**
 * ============================================================================
 * isCreationDay_ v1.0
 * ============================================================================
 * 
 * Returns true if cycle is Creation Day (Cycle 48).
 * 
 * ============================================================================
 */

function isCreationDay_(cycleOfYear) {
  return cycleOfYear === 48;
}


/**
 * ============================================================================
 * getCreationDayAnniversary_ v1.0
 * ============================================================================
 * 
 * Returns anniversary number for Creation Day.
 * Year 1, Cycle 48 = 0 (the original)
 * Year 2, Cycle 48 = 1 (first anniversary)
 * Year 3, Cycle 48 = 2 (second anniversary)
 * 
 * ============================================================================
 */

function getCreationDayAnniversary_(godWorldYear) {
  return godWorldYear - 1;
}


/**
 * ============================================================================
 * getCycleOfYear_ v1.0
 * ============================================================================
 * 
 * Converts absolute cycle to cycle-of-year (1-52).
 * 
 * Example:
 * - Cycle 70 → 18
 * - Cycle 104 → 52
 * - Cycle 105 → 1
 * 
 * ============================================================================
 */

function getCycleOfYear_(absoluteCycle) {
  return ((absoluteCycle - 1) % 52) + 1;
}


/**
 * ============================================================================
 * getGodWorldYear_ v1.0
 * ============================================================================
 * 
 * Converts absolute cycle to GodWorld Year.
 * 
 * Example:
 * - Cycle 1-52 → Year 1
 * - Cycle 53-104 → Year 2
 * - Cycle 105-156 → Year 3
 * 
 * ============================================================================
 */

function getGodWorldYear_(absoluteCycle) {
  return Math.ceil(absoluteCycle / 52);
}


/**
 * ============================================================================
 * getMonthFromCycle_ v1.0
 * ============================================================================
 * 
 * Returns month name from cycle (1-52).
 * 
 * ============================================================================
 */

function getMonthFromCycle_(cycleOfYear) {
  if (cycleOfYear >= 1 && cycleOfYear <= 5) return "January";
  if (cycleOfYear >= 6 && cycleOfYear <= 9) return "February";
  if (cycleOfYear >= 10 && cycleOfYear <= 13) return "March";
  if (cycleOfYear >= 14 && cycleOfYear <= 17) return "April";
  if (cycleOfYear >= 18 && cycleOfYear <= 22) return "May";
  if (cycleOfYear >= 23 && cycleOfYear <= 26) return "June";
  if (cycleOfYear >= 27 && cycleOfYear <= 30) return "July";
  if (cycleOfYear >= 31 && cycleOfYear <= 35) return "August";
  if (cycleOfYear >= 36 && cycleOfYear <= 39) return "September";
  if (cycleOfYear >= 40 && cycleOfYear <= 44) return "October";
  if (cycleOfYear >= 45 && cycleOfYear <= 48) return "November";
  if (cycleOfYear >= 49 && cycleOfYear <= 52) return "December";
  return "Unknown";
}


/**
 * ============================================================================
 * getSimMonthFromCycle_ v1.0
 * ============================================================================
 * 
 * Returns SimMonth (1-12) from cycle (1-52).
 * 
 * ============================================================================
 */

function getSimMonthFromCycle_(cycleOfYear) {
  if (cycleOfYear >= 1 && cycleOfYear <= 5) return 1;
  if (cycleOfYear >= 6 && cycleOfYear <= 9) return 2;
  if (cycleOfYear >= 10 && cycleOfYear <= 13) return 3;
  if (cycleOfYear >= 14 && cycleOfYear <= 17) return 4;
  if (cycleOfYear >= 18 && cycleOfYear <= 22) return 5;
  if (cycleOfYear >= 23 && cycleOfYear <= 26) return 6;
  if (cycleOfYear >= 27 && cycleOfYear <= 30) return 7;
  if (cycleOfYear >= 31 && cycleOfYear <= 35) return 8;
  if (cycleOfYear >= 36 && cycleOfYear <= 39) return 9;
  if (cycleOfYear >= 40 && cycleOfYear <= 44) return 10;
  if (cycleOfYear >= 45 && cycleOfYear <= 48) return 11;
  if (cycleOfYear >= 49 && cycleOfYear <= 52) return 12;
  return 1;
}


/**
 * ============================================================================
 * getHolidayPriority_ v1.0
 * ============================================================================
 * 
 * Returns priority level for a holiday name.
 * 
 * ============================================================================
 */

function getHolidayPriority_(holidayName) {
  
  const major = [
    "NewYear", "MLKDay", "Easter", "MemorialDay", "Juneteenth",
    "Independence", "LaborDay", "Halloween", "Thanksgiving",
    "CreationDay", "Holiday", "NewYearsEve"
  ];
  
  const cultural = [
    "BlackHistoryMonth", "CincoDeMayo", "PrideMonth",
    "IndigenousPeoplesDay", "DiaDeMuertos", "Hanukkah"
  ];
  
  const oakland = [
    "OpeningDay", "OaklandPride", "ArtSoulFestival",
    "SummerFestival", "EarthDay"
  ];
  
  if (major.includes(holidayName)) return "major";
  if (cultural.includes(holidayName)) return "cultural";
  if (oakland.includes(holidayName)) return "oakland";
  if (holidayName === "none") return "none";
  
  return "minor";
}


/**
 * ============================================================================
 * CYCLE-TO-HOLIDAY QUICK REFERENCE
 * ============================================================================
 * 
 * Cycle | Holiday              | Priority | Month
 * ──────────────────────────────────────────────────
 * 1     | NewYear              | major    | January
 * 3     | MLKDay               | major    | January
 * 6     | BlackHistoryMonth    | cultural | February
 * 7     | Valentine            | minor    | February
 * 8     | PresidentsDay        | minor    | February
 * 11    | StPatricksDay        | minor    | March
 * 12    | SpringEquinox        | minor    | March
 * 15    | Easter               | major    | April
 * 16    | EarthDay             | oakland  | April
 * 17    | OpeningDay           | oakland  | April
 * 18    | CincoDeMayo          | cultural | May
 * 19    | MothersDay           | minor    | May
 * 21    | MemorialDay          | major    | May
 * 22    | OaklandPride         | oakland  | May
 * 23    | PrideMonth           | cultural | June
 * 24    | Juneteenth           | major    | June
 * 25    | FathersDay           | minor    | June
 * 26    | SummerSolstice       | minor    | June
 * 27    | Independence         | major    | July
 * 28    | SummerFestival       | oakland  | July
 * 33    | BackToSchool         | minor    | August
 * 34    | ArtSoulFestival      | oakland  | August
 * 36    | LaborDay             | major    | September
 * 37    | PatriotDay           | minor    | September
 * 38    | FallEquinox          | minor    | September
 * 41    | IndigenousPeoplesDay | cultural | October
 * 44    | Halloween            | major    | October
 * 45    | DiaDeMuertos         | cultural | November
 * 46    | VeteransDay          | minor    | November
 * 47    | Thanksgiving         | major    | November
 * 48    | CreationDay          | MAJOR    | November ← GODWORLD
 * 50    | Hanukkah             | cultural | December
 * 51    | Holiday (Christmas)  | major    | December
 * 52    | NewYearsEve          | major    | December
 * 
 * ============================================================================
 */