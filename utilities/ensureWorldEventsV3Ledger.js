/**
 * ============================================================================
 * ensureWorldEventsV3Ledger_ v3.3
 * ============================================================================
 *
 * Creates WorldEvents_V3_Ledger with correct 29-column header.
 * Aligned with recordWorldEventsv3_ v3.2 writer output.
 *
 * v3.3 Changes:
 * - Added FestivalFlag at column M
 * - Removed Season and Month columns (not written by recordWorldEventsv3_)
 * - Reordered calendar columns to match writer sequence
 * - 29 columns total (A-AC)
 *
 * ============================================================================
 */

function ensureWorldEventsV3Ledger_(ctx) {
  var ss = ctx.ss;
  // engine.119: no runtime create — the v3.3 header block that lived here is on
  // the tab itself (pre-created live + bench); schema doc below stays the reference.
  var sheet = requireTab_(ss, 'WorldEvents_V3_Ledger');

  return sheet;
}


/**
 * ============================================================================
 * WORLD EVENTS V3 LEDGER SCHEMA v3.3
 * ============================================================================
 * 
 * COLUMNS (29):
 * A   Timestamp
 * B   Cycle
 * C   EventDescription
 * D   EventType
 * E   Domain
 * F   Severity
 * G   Neighborhood
 * H   ImpactScore
 * I   PopulationAffected
 * J   HealthFlag
 * K   CivicFlag
 * L   EconomicFlag
 * M   FestivalFlag
 * N   SentimentShift
 * O   WeatherType
 * P   WeatherImpact
 * Q   CitySentiment
 * R   TextureSignal
 * S   StoryHookSignal
 * T   CivicLoad
 * U   ShockFlag
 * V   PatternFlag
 * W   Holiday
 * X   HolidayPriority
 * Y   IsFirstFriday
 * Z   IsCreationDay
 * AA  SportsSeason
 * AB  SourceEngine
 * AC  CanonStatus
 * 
 * ============================================================================
 */