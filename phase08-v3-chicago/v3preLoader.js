/**
 * ============================================================================
 * v3PreloadContext_ v3.3
 * ============================================================================
 *
 * Purpose:
 * - Prepare V3 fields
 * - DO NOT touch any V2.5 summary data
 * - DO NOT clear auditIssues / issues
 * - Initialize all V3 system containers
 * - Ensure calendar context defaults exist
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

  // No resets
  // No overwrites
  // No clearing of ctx.summary

  ctx.summary = S;
}


/**
 * ============================================================================
 * V3 PRELOAD CONTEXT REFERENCE v3.3
 * ============================================================================
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
 * - Core: eventArcs, storyHooks, storySeeds, textures, textureTriggers
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