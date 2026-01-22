/**
 * ============================================================================
 * SHEET_NAMES - Centralized Sheet Name Constants
 * ============================================================================
 *
 * v2.9 Addition:
 * All sheet names should be referenced through this object.
 * This prevents typos and makes renaming sheets easier.
 *
 * Usage: SHEET_NAMES.SIMULATION_LEDGER instead of 'Simulation_Ledger'
 *
 * ============================================================================
 */

var SHEET_NAMES = {
  // === Core Simulation ===
  SIMULATION_LEDGER: 'Simulation_Ledger',
  GENERIC_CITIZENS: 'Generic_Citizens',
  CHICAGO_CITIZENS: 'Chicago_Citizens',
  WORLD_POPULATION: 'World_Population',
  WORLD_CONFIG: 'World_Config',

  // === Events & Stories ===
  WORLD_EVENTS_LEDGER: 'WorldEvents_Ledger',
  WORLD_EVENTS_V3_LEDGER: 'WorldEvents_V3_Ledger',
  EVENT_ARC_LEDGER: 'Event_Arc_Ledger',
  STORY_SEED_DECK: 'Story_Seed_Deck',
  STORY_HOOK_DECK: 'Story_Hook_Deck',
  STORYLINE_TRACKER: 'Storyline_Tracker',

  // === Relationships ===
  RELATIONSHIP_BONDS: 'Relationship_Bonds',
  LIFEHISTORY_LOG: 'LifeHistory_Log',

  // === Media System ===
  MEDIA_BRIEFING: 'Media_Briefing',
  MEDIA_LEDGER: 'Media_Ledger',
  PRESS_DRAFTS: 'Press_Drafts',
  CITIZEN_MEDIA_USAGE: 'Citizen_Media_Usage',
  CONTINUITY_LOOP: 'Continuity_Loop',
  CULTURAL_LEDGER: 'Cultural_Ledger',

  // === Media Intake ===
  MEDIA_INTAKE: 'Media_Intake',
  STORYLINE_INTAKE: 'Storyline_Intake',
  CITIZEN_USAGE_INTAKE: 'Citizen_Usage_Intake',
  CONTINUITY_INTAKE: 'Continuity_Intake',
  MEDIAROOM_PASTE: 'MediaRoom_Paste',
  ADVANCEMENT_INTAKE: 'Advancement_Intake',
  INTAKE: 'Intake',

  // === Cycle Output ===
  CYCLE_PACKET: 'Cycle_Packet',
  RILEY_DIGEST: 'Riley_Digest',

  // === Civic System ===
  CIVIC_OFFICE_LEDGER: 'Civic_Office_Ledger',
  ELECTION_LOG: 'Election_Log',
  CIVIC_SWEEP_REPORT: 'Civic_Sweep_Report',

  // === Geography ===
  NEIGHBORHOOD_MAP: 'Neighborhood_Map',
  DOMAIN_TRACKER: 'Domain_Tracker',

  // === Dashboard/Feeds ===
  DASHBOARD: 'Dashboard',
  SPORTS_FEED: 'Sports_Feed',
  CHICAGO_FEED: 'Chicago_Feed',

  // === Engine Errors (created by error handler) ===
  ENGINE_ERRORS: 'Engine_Errors'
};

/**
 * Helper to get sheet by constant name with null check
 */
function getSheet_(ss, sheetNameConstant) {
  var sheet = ss.getSheetByName(sheetNameConstant);
  if (!sheet) {
    Logger.log('Warning: Sheet not found: ' + sheetNameConstant);
  }
  return sheet;
}
