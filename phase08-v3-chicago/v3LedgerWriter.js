/**
 * ============================================================================
 * V3 ARC LEDGER WRITER — v3.3 (Write-Intent Based)
 * ============================================================================
 *
 * Writes active arcs to Event_Arc_Ledger sheet with calendar context.
 * Uses V3 write-intents model for persistence.
 *
 * v3.3 Changes:
 * - Uses queueBatchAppendIntent_ instead of direct writes
 * - Full dryRun/replay mode support
 * - ES5 compatible (removed const/let, arrow functions, filter/map)
 *
 * v3.2 Features (preserved):
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

var ARC_LEDGER_HEADERS = [
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


function saveV3ArcsToLedger_(ctx) {
  var ss = ctx.ss;
  var arcs = ctx.summary.eventArcs || [];

  if (!arcs.length) return;

  // Initialize persist context if needed
  if (!ctx.persist) {
    initializePersistContext_(ctx);
  }

  // Ensure sheet exists with headers
  var sheet = ensureSheet_(ss, 'Event_Arc_Ledger', ARC_LEDGER_HEADERS);

  var S = ctx.summary;
  var cycle = ctx.config.cycleCount || S.cycleId;
  var now = ctx.now || new Date();

  // v3.2: Get current calendar context
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || 'off-season';

  // Filter to relevant arcs (active or just resolved this cycle)
  var relevantArcs = [];
  for (var i = 0; i < arcs.length; i++) {
    var a = arcs[i];
    if (a && (a.phase !== 'resolved' || a.cycleResolved === cycle)) {
      relevantArcs.push(a);
    }
  }

  if (!relevantArcs.length) return;

  // Build rows
  var rows = [];
  for (var j = 0; j < relevantArcs.length; j++) {
    var arc = relevantArcs[j];
    var citizenCount = (arc.involvedCitizens || []).length;
    var arcAge = cycle - (arc.cycleCreated || cycle);

    rows.push([
      now,                              // A  Timestamp
      cycle,                            // B  Cycle
      arc.arcId || '',                  // C  ArcId
      arc.type || '',                   // D  Type
      arc.phase || '',                  // E  Phase
      arc.tension || 0,                 // F  Tension
      arc.neighborhood || '',           // G  Neighborhood
      arc.domainTag || '',              // H  DomainTag
      arc.summary || '',                // I  Summary
      citizenCount,                     // J  CitizenCount
      arc.cycleCreated || '',           // K  CycleCreated
      arc.cycleResolved || '',          // L  CycleResolved
      arcAge,                           // M  ArcAge
      holiday,                          // N  Holiday (v3.2)
      holidayPriority,                  // O  HolidayPriority (v3.2)
      isFirstFriday,                    // P  FirstFriday (v3.2)
      isCreationDay,                    // Q  CreationDay (v3.2)
      sportsSeason,                     // R  SportsSeason (v3.2)
      arc.calendarTrigger || ''         // S  CalendarTrigger (v3.2)
    ]);
  }

  // Queue batch append intent
  queueBatchAppendIntent_(
    ctx,
    'Event_Arc_Ledger',
    rows,
    'Save ' + rows.length + ' event arcs for cycle ' + cycle,
    'events',
    100
  );

  Logger.log('saveV3ArcsToLedger_ v3.3: Queued ' + rows.length + ' arcs | Holiday: ' + holiday + ' | Sports: ' + sportsSeason);
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