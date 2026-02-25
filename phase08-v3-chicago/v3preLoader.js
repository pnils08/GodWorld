/**
 * ============================================================================
 * v3PreloadContext_ v3.4
 * ============================================================================
 *
 * Purpose:
 * - Prepare V3 fields
 * - DO NOT touch any V2.5 summary data
 * - DO NOT clear auditIssues / issues
 * - Initialize all V3 system containers
 * - Ensure calendar context defaults exist
 * - Load active arcs from Event_Arc_Ledger for cross-cycle persistence
 *
 * v3.4 Changes:
 * - Added loadActiveArcsFromLedger_ to restore active arcs across cycles
 * - Without this, arcs were born, written once, and forgotten each cycle
 *
 * v3.3 Enhancements:
 * - Calendar context fallback defaults
 * - Version alignment with GodWorld Calendar v1.0 ecosystem
 *
 * Previous features (v3.2):
 * - Safe container initialization
 * - Preserve existing V2.5 data
 *
 * ============================================================================
 */

function v3PreloadContext_(ctx) {

  // Preserve all existing V2.5 summary data
  if (!ctx.summary) ctx.summary = {};

  var S = ctx.summary;

  // Explicitly preserve issues if present
  if (!Array.isArray(S.auditIssues)) {
    S.auditIssues = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.3: CALENDAR CONTEXT DEFAULTS
  // ═══════════════════════════════════════════════════════════════════════════
  // These should be set by buildCalendarContext_ in Phase 1, but ensure
  // fallback defaults exist for safety
  
  if (S.holiday === undefined) S.holiday = 'none';
  if (S.holidayPriority === undefined) S.holidayPriority = 'none';
  if (S.isFirstFriday === undefined) S.isFirstFriday = false;
  if (S.isCreationDay === undefined) S.isCreationDay = false;
  if (S.sportsSeason === undefined) S.sportsSeason = 'off-season';
  if (S.season === undefined) S.season = 'unknown';

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE V3 SYSTEMS
  // ═══════════════════════════════════════════════════════════════════════════
  if (!S.eventArcs) S.eventArcs = [];
  if (!S.storyHooks) S.storyHooks = [];
  if (!S.storySeeds) S.storySeeds = [];
  if (!S.textures) S.textures = [];
  if (!S.textureTriggers) S.textureTriggers = [];
  if (!S.domains) S.domains = [];
  if (!S.domainPresence) S.domainPresence = {};
  if (!S.chicagoSnapshot) S.chicagoSnapshot = {};
  if (!S.chicagoFeed) S.chicagoFeed = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  if (!S.economicRipples) S.economicRipples = [];
  if (S.economicMood === undefined) S.economicMood = 50;

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  if (!S.mediaEffects) S.mediaEffects = {};

  // ═══════════════════════════════════════════════════════════════════════════
  // BOND SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  if (!S.newBonds) S.newBonds = [];
  if (!S.activeBonds) S.activeBonds = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CITIZEN SYSTEMS
  // ═══════════════════════════════════════════════════════════════════════════
  if (!S.namedSpotlights) S.namedSpotlights = [];
  if (!S.newCitizens) S.newCitizens = [];
  if (!S.promotions) S.promotions = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD SYSTEMS
  // ═══════════════════════════════════════════════════════════════════════════
  if (!S.neighborhoodPresence) S.neighborhoodPresence = {};
  if (!S.crowdMap) S.crowdMap = {};
  if (!S.crowdHotspots) S.crowdHotspots = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENING SYSTEMS
  // ═══════════════════════════════════════════════════════════════════════════
  if (!S.famousSightings) S.famousSightings = [];
  if (!S.cityEventDetails) S.cityEventDetails = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER MOOD (don't overwrite existing)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!S.weatherMood) {
    S.weatherMood = {
      primaryMood: 'neutral',
      comfortIndex: 0.5,
      conflictPotential: 0,
      perfectWeather: false,
      nostalgiaFactor: 0
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD EVENTS (preserve existing)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!S.worldEvents) S.worldEvents = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CYCLE TRACKING
  // ═══════════════════════════════════════════════════════════════════════════
  if (!S.shockReasons) S.shockReasons = [];
  if (!S.civicLoadFactors) S.civicLoadFactors = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.4: LOAD ACTIVE ARCS FROM LEDGER (cross-cycle persistence)
  // ═══════════════════════════════════════════════════════════════════════════
  // Without this, eventArcs started empty every cycle. The arc engine would
  // return immediately (no arcs to advance), and generateNewArcs_ had no
  // awareness of existing arcs. Arcs were written to the ledger but never
  // read back — making them single-cycle instead of multi-cycle.
  loadActiveArcsFromLedger_(ctx);

  // No resets
  // No overwrites
  // No clearing of ctx.summary

  ctx.summary = S;
}


/**
 * ============================================================================
 * loadActiveArcsFromLedger_ — Restore active arcs from Event_Arc_Ledger
 * ============================================================================
 *
 * Reads Event_Arc_Ledger, finds the most recent entry per ArcId (since the
 * ledger is append-only — one row per arc per cycle), and loads all
 * non-resolved arcs into ctx.summary.eventArcs.
 *
 * This is what makes arcs multi-cycle: without it, the arc engine has no
 * memory of previous arcs and can't advance them through phases
 * (early → rising → peak → decline → resolved).
 *
 * ============================================================================
 */
function loadActiveArcsFromLedger_(ctx) {
  var ss = ctx.ss;
  if (!ss) return;

  var sheet = ss.getSheetByName('Event_Arc_Ledger');
  if (!sheet) return;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  // Build column index from headers
  var headers = data[0];
  var colMap = {};
  for (var h = 0; h < headers.length; h++) {
    colMap[String(headers[h]).trim()] = h;
  }

  var arcIdCol = colMap['ArcId'];
  var typeCol = colMap['Type'];
  var phaseCol = colMap['Phase'];
  var tensionCol = colMap['Tension'];
  var neighborhoodCol = colMap['Neighborhood'];
  var domainCol = colMap['DomainTag'];
  var summaryCol = colMap['Summary'];
  var cycleCreatedCol = colMap['CycleCreated'];
  var cycleResolvedCol = colMap['CycleResolved'];
  var calTriggerCol = colMap['CalendarTrigger'];

  // ArcId and Phase are required
  if (arcIdCol === undefined || phaseCol === undefined) return;

  // Scan all rows — last entry per arcId wins (append-only ledger)
  var arcMap = {};
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var arcId = String(row[arcIdCol] || '').trim();
    if (!arcId) continue;

    var phase = String(row[phaseCol] || '').trim().toLowerCase();

    arcMap[arcId] = {
      arcId: arcId,
      type: typeCol !== undefined ? String(row[typeCol] || '').trim() : '',
      phase: phase,
      tension: tensionCol !== undefined ? (Number(row[tensionCol]) || 0) : 0,
      neighborhood: neighborhoodCol !== undefined ? String(row[neighborhoodCol] || '').trim() : '',
      domainTag: domainCol !== undefined ? String(row[domainCol] || '').trim() : '',
      summary: summaryCol !== undefined ? String(row[summaryCol] || '').trim() : '',
      involvedCitizens: [],
      cycleCreated: cycleCreatedCol !== undefined ? (Number(row[cycleCreatedCol]) || 0) : 0,
      cycleResolved: (cycleResolvedCol !== undefined && row[cycleResolvedCol]) ? Number(row[cycleResolvedCol]) : null,
      calendarTrigger: calTriggerCol !== undefined ? String(row[calTriggerCol] || '').trim() : ''
    };
  }

  // Collect active (non-resolved) arcs
  var activeArcs = [];
  var keys = Object.keys(arcMap);
  for (var k = 0; k < keys.length; k++) {
    var arc = arcMap[keys[k]];
    if (arc.phase !== 'resolved' && arc.phase !== '') {
      activeArcs.push(arc);
    }
  }

  if (activeArcs.length > 0) {
    ctx.summary.eventArcs = activeArcs;
    Logger.log('loadActiveArcsFromLedger_: Loaded ' + activeArcs.length + ' active arcs from Event_Arc_Ledger');
  } else {
    Logger.log('loadActiveArcsFromLedger_: No active arcs found in Event_Arc_Ledger');
  }
}


/**
 * ============================================================================
 * V3 PRELOAD CONTEXT REFERENCE v3.4
 * ============================================================================
 * 
 * v3.4 CHANGES:
 * - loadActiveArcsFromLedger_ reads Event_Arc_Ledger, deduplicates by ArcId
 *   (last row wins), and loads non-resolved arcs into ctx.summary.eventArcs
 * - This enables multi-cycle arc progression (early → rising → peak → decline)
 * - Without this, eventArcEngine_ returned immediately every cycle (empty array)
 *
 * CALENDAR DEFAULTS (v3.3):
 * - holiday: 'none'
 * - holidayPriority: 'none'
 * - isFirstFriday: false
 * - isCreationDay: false
 * - sportsSeason: 'off-season'
 * - season: 'unknown'
 *
 * These are fallbacks — buildCalendarContext_ should set actual values in Phase 1.
 *
 * CONTAINERS INITIALIZED:
 * - Core: eventArcs (loaded from ledger), storyHooks, storySeeds, textures, textureTriggers
 * - Domain: domains, domainPresence
 * - Chicago: chicagoSnapshot, chicagoFeed
 * - Economic: economicRipples, economicMood
 * - Media: mediaEffects
 * - Bonds: newBonds, activeBonds
 * - Citizens: namedSpotlights, newCitizens, promotions
 * - Neighborhoods: neighborhoodPresence, crowdMap, crowdHotspots
 * - Evening: famousSightings, cityEventDetails
 * - Weather: weatherMood
 * - Events: worldEvents
 * - Tracking: shockReasons, civicLoadFactors, auditIssues
 * 
 * ============================================================================
 */