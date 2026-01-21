/**
 * ============================================================================
 * V3 ARC LEDGER WRITER — v3.2
 * ============================================================================
 *
 * Writes active arcs to Event_Arc_Ledger sheet with calendar context.
 *
 * v3.2 Enhancements:
 * - Calendar columns (Holiday, HolidayPriority, FirstFriday, CreationDay, SportsSeason)
 * - CalendarTrigger column (which holiday/event triggered the arc)
 * - Aligned with GodWorld Calendar v1.0 and eventArcEngine v3.3
 *
 * Previous features (v3.1):
 * - Arc phase and tension tracking
 * - Citizen count
 * - Arc age calculation
 * 
 * ============================================================================
 */

function saveV3ArcsToLedger_(ctx) {
  const ss = ctx.ss;
  const arcs = ctx.summary.eventArcs || [];
  
  if (!arcs.length) return;

  // v3.2: Expanded headers with calendar columns
  const headers = [
    'Timestamp',        // A
    'Cycle',            // B
    'ArcId',            // C
    'Type',             // D
    'Phase',            // E
    'Tension',          // F
    'Neighborhood',     // G
    'DomainTag',        // H
    'Summary',          // I
    'CitizenCount',     // J
    'CycleCreated',     // K
    'CycleResolved',    // L
    'ArcAge',           // M
    'Holiday',          // N (v3.2)
    'HolidayPriority',  // O (v3.2)
    'FirstFriday',      // P (v3.2)
    'CreationDay',      // Q (v3.2)
    'SportsSeason',     // R (v3.2)
    'CalendarTrigger'   // S (v3.2)
  ];

  const sheet = ensureSheet_(ss, 'Event_Arc_Ledger', headers);

  const cycle = ctx.config.cycleCount || ctx.summary.cycleId;
  const now = ctx.now || new Date();

  // v3.2: Get current calendar context
  const holiday = ctx.summary.holiday || 'none';
  const holidayPriority = ctx.summary.holidayPriority || 'none';
  const isFirstFriday = ctx.summary.isFirstFriday || false;
  const isCreationDay = ctx.summary.isCreationDay || false;
  const sportsSeason = ctx.summary.sportsSeason || 'off-season';

  // Only write arcs that changed this cycle (active or just resolved)
  const relevantArcs = arcs.filter(a => 
    a && (a.phase !== 'resolved' || a.cycleResolved === cycle)
  );

  if (!relevantArcs.length) return;

  const rows = relevantArcs.map(a => [
    now,
    cycle,
    a.arcId || '',
    a.type || '',
    a.phase || '',
    a.tension || 0,
    a.neighborhood || '',
    a.domainTag || '',
    a.summary || '',
    (a.involvedCitizens || []).length,
    a.cycleCreated || '',
    a.cycleResolved || '',
    cycle - (a.cycleCreated || cycle),
    holiday,                              // v3.2
    holidayPriority,                      // v3.2
    isFirstFriday,                        // v3.2
    isCreationDay,                        // v3.2
    sportsSeason,                         // v3.2
    a.calendarTrigger || ''               // v3.2: From eventArcEngine v3.3
  ]);

  const startRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}


/**
 * ============================================================================
 * EVENT ARC LEDGER SCHEMA v3.2
 * ============================================================================
 * 
 * COLUMNS (19):
 * A - Timestamp
 * B - Cycle
 * C - ArcId
 * D - Type (crisis, festival, sports-fever, arts-walk, heritage, etc.)
 * E - Phase (early, rising, peak, decline, resolved)
 * F - Tension (0-10)
 * G - Neighborhood
 * H - DomainTag
 * I - Summary
 * J - CitizenCount
 * K - CycleCreated
 * L - CycleResolved
 * M - ArcAge
 * N - Holiday (v3.2)
 * O - HolidayPriority (v3.2)
 * P - FirstFriday (v3.2)
 * Q - CreationDay (v3.2)
 * R - SportsSeason (v3.2)
 * S - CalendarTrigger (v3.2) - What triggered the arc (e.g., "OaklandPride", "FirstFriday")
 * 
 * QUERY EXAMPLES:
 * - All Pride-triggered arcs: =FILTER(C:C, S:S="OaklandPride")
 * - Arcs during playoffs: =FILTER(C:C, R:R="playoffs")
 * - First Friday arcs: =FILTER(C:C, P:P=TRUE)
 * - Festival arcs at peak: =FILTER(C:C, (D:D="festival")*(E:E="peak"))
 * - High tension arcs (>7): =FILTER(C:C, F:F>7)
 * 
 * ============================================================================
 */