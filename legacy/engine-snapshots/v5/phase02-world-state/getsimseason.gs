/**
 * ============================================================================
 * getSimSeason_ v2.2
 * ============================================================================
 *
 * Returns season based on simulation month (1-12).
 * Per GodWorld Calendar v1.0.
 *
 * v2.2: ES5-safe (removed .includes() for Apps Script compatibility)
 *
 * Note: Prefer getSeasonFromCycle_(cycleOfYear) when cycleOfYear is available.
 * Use this function as fallback when only month is known.
 *
 * ============================================================================
 */

function getSimSeason_(month) {
  month = Number(month || 1);
  if (month === 12 || month === 1 || month === 2) return "Winter";
  if (month === 3 || month === 4 || month === 5) return "Spring";
  if (month === 6 || month === 7 || month === 8) return "Summer";
  return "Fall";
}


/**
 * ============================================================================
 * getSeasonFromCycle_ v1.0
 * ============================================================================
 * 
 * Returns season directly from cycleOfYear (1-52).
 * Bypasses month lookup for direct cycle-to-season mapping.
 * 
 * Per GodWorld Calendar v1.0:
 * - Winter: Cycles 49-52, 1-9   (Dec, Jan, Feb)
 * - Spring: Cycles 10-22        (Mar, Apr, May)
 * - Summer: Cycles 23-35        (Jun, Jul, Aug)
 * - Fall:   Cycles 36-48        (Sep, Oct, Nov)
 * 
 * ============================================================================
 */

function getSeasonFromCycle_(cycleOfYear) {
  // Winter: Dec (49-52) + Jan (1-5) + Feb (6-9)
  if (cycleOfYear >= 49 || cycleOfYear <= 9) return "Winter";
  // Spring: Mar (10-13) + Apr (14-17) + May (18-22)
  if (cycleOfYear >= 10 && cycleOfYear <= 22) return "Spring";
  // Summer: Jun (23-26) + Jul (27-30) + Aug (31-35)
  if (cycleOfYear >= 23 && cycleOfYear <= 35) return "Summer";
  // Fall: Sep (36-39) + Oct (40-44) + Nov (45-48)
  return "Fall";
}


/**
 * ============================================================================
 * SEASON REFERENCE
 * ============================================================================
 * 
 * Season  | Months        | Cycles        | Count
 * ─────────────────────────────────────────────────────────────────────────
 * Winter  | Dec, Jan, Feb | 49-52, 1-9    | 13 cycles
 * Spring  | Mar, Apr, May | 10-22         | 13 cycles
 * Summer  | Jun, Jul, Aug | 23-35         | 13 cycles
 * Fall    | Sep, Oct, Nov | 36-48         | 13 cycles
 * 
 * Note: Winter spans year boundary (Year N cycles 49-52 + Year N+1 cycles 1-9)
 * 
 * ============================================================================
 */