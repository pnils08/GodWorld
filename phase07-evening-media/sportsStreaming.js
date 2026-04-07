/**
 * ============================================================================
 * buildEveningSportsAndStreaming_ v3.0 (feed-driven, ES5)
 * ============================================================================
 *
 * Sports content comes from Oakland_Sports_Feed via S.sportsFeedEntries
 * (populated by Phase 2 applySportsSeason_). No invented pools.
 * If Mike didn't write it in the feed, it doesn't exist.
 *
 * Streaming trend logic is atmosphere — kept from v2.x.
 *
 * v3.0 Changes:
 * - Removed ALL fake sports pools (~200 lines)
 * - Removed Warriors, Chicago references
 * - S.eveningSports built from actual feed entries (StoryAngle, Notes, EventType)
 * - Multiple entries per cycle: all captured, joined with " | "
 * - No SimMonth or season-state pool selection
 * - Streaming logic unchanged (atmosphere, not sports data)
 *
 * ============================================================================
 */

function buildEveningSportsAndStreaming_(ctx) {

  // Defensive guard
  if (!ctx) return;
  if (!ctx.summary) ctx.summary = {};

  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;
  var S = ctx.summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS FROM FEED (Phase 2 populated S.sportsFeedEntries)
  // ═══════════════════════════════════════════════════════════════════════════
  var feedEntries = S.sportsFeedEntries || [];
  var sportsSeason = S.sportsSeason || "unknown";

  var eveningSportsText = "(none)";
  var eveningSportsDetails = null;

  if (feedEntries.length > 0) {
    var sportsParts = [];

    for (var fi = 0; fi < feedEntries.length; fi++) {
      var entry = feedEntries[fi];
      var part = "";

      // Use StoryAngle first — it's the user's intended headline
      if (entry.storyAngle) {
        part = entry.storyAngle;
      } else {
        // Fallback: construct from eventType + teamsUsed + notes
        var bits = [];
        if (entry.teamsUsed) bits.push(entry.teamsUsed);
        if (entry.eventType) bits.push(entry.eventType);
        if (entry.notes) bits.push(entry.notes);
        part = bits.join(" — ");
      }

      if (part) sportsParts.push(part);
    }

    if (sportsParts.length > 0) {
      eveningSportsText = sportsParts.join(" | ");
    }

    // Details: last entry
    eveningSportsDetails = feedEntries[feedEntries.length - 1];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GODWORLD SYSTEMS (atmosphere for streaming, not sports)
  // ═══════════════════════════════════════════════════════════════════════════
  var chaos = S.worldEvents || [];
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var dynamics = S.cityDynamics || {};
  var sentiment = dynamics.sentiment || 0;
  var nightlife = S.nightlifeVolume || 0;
  var econMood = S.economicMood || 50;
  var culturalActivity = dynamics.culturalActivity || 1;
  var communityEngagement = dynamics.communityEngagement || 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;

  // Helper for random pick
  var pickRandom = function(arr) {
    if (typeof pickRandom_ === 'function') return pickRandom_(arr);
    return arr[Math.floor(rng() * arr.length)];
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STREAMING LOGIC (atmosphere — unchanged from v2.x)
  // ═══════════════════════════════════════════════════════════════════════════

  var BASE_STREAMING = [
    "crime-drama rotation",
    "sitcom spike",
    "documentary run",
    "reality-show bump",
    "sci-fi mini-surge"
  ];

  var STORM_STREAMING = [
    "comfort-TV marathon",
    "homebound movie run",
    "slow-burn drama trend"
  ];

  var CHAOS_STREAMING = [
    "breaking-news loop",
    "political commentary wave",
    "city-impact livestream spike"
  ];

  var HIGH_SENTIMENT_STREAMING = [
    "feel-good comedy arc",
    "romantic-series mini-run",
    "uplifting documentary trend"
  ];

  var LOW_SENTIMENT_STREAMING = [
    "dark-thriller surge",
    "true-crime spike",
    "heavy-drama rotation"
  ];

  var COZY_STREAMING = [
    "comfort rewatch marathon",
    "classic film night",
    "nostalgic series revival"
  ];

  var BUDGET_STREAMING = [
    "free-tier binge night",
    "ad-supported movie run",
    "library content surge"
  ];

  var UPSCALE_STREAMING = [
    "premium documentary premiere",
    "exclusive series launch",
    "prestige drama debut"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY STREAMING POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  var THANKSGIVING_STREAMING = [
    "holiday movie marathon",
    "family comedy binge",
    "Thanksgiving classics rotation"
  ];

  var HOLIDAY_STREAMING = [
    "holiday movie marathon",
    "seasonal classics binge",
    "winter wonderland films",
    "festive family viewing"
  ];

  var NEW_YEARS_EVE_STREAMING = [
    "countdown special streaming",
    "year-in-review marathons",
    "midnight movie countdown"
  ];

  var HALLOWEEN_STREAMING = [
    "horror movie marathon",
    "spooky series binge",
    "Halloween classics rotation",
    "supernatural thriller night"
  ];

  var VALENTINE_STREAMING = [
    "romantic comedy marathon",
    "love story classics",
    "date-night movie picks"
  ];

  var INDEPENDENCE_STREAMING = [
    "patriotic film classics",
    "action movie marathon",
    "summer blockbuster binge"
  ];

  var PRIDE_STREAMING = [
    "LGBTQ+ cinema celebration",
    "Pride documentary marathon",
    "queer classics rotation"
  ];

  var MLK_STREAMING = [
    "civil rights documentary marathon",
    "Black history cinema",
    "social justice film series"
  ];

  var JUNETEENTH_STREAMING = [
    "Black cinema celebration",
    "freedom documentary series",
    "Black excellence film rotation"
  ];

  var DIA_DE_MUERTOS_STREAMING = [
    "Día de los Muertos specials",
    "Latin cinema celebration",
    "cultural film marathon"
  ];

  var LUNAR_NEW_YEAR_STREAMING = [
    "Asian cinema celebration",
    "Lunar New Year specials",
    "martial arts classics marathon"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY STREAMING
  // ═══════════════════════════════════════════════════════════════════════════

  var FIRST_FRIDAY_STREAMING = [
    "art documentary premiere",
    "indie film showcase",
    "artist profile series",
    "creative documentary rotation"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY STREAMING
  // ═══════════════════════════════════════════════════════════════════════════

  var CREATION_DAY_STREAMING = [
    "Oakland history documentary",
    "local filmmaker showcase",
    "Bay Area cinema celebration",
    "community stories series"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD STREAMING POOL
  // ═══════════════════════════════════════════════════════════════════════════

  var streamPool = BASE_STREAMING.slice();

  // ───────────────────────────────────────────────────────────────────────────
  // HOLIDAY STREAMING
  // ───────────────────────────────────────────────────────────────────────────

  if (holiday === "Thanksgiving") {
    streamPool = streamPool.concat(THANKSGIVING_STREAMING, THANKSGIVING_STREAMING);
  }
  if (holiday === "Holiday" || holiday === "NewYear") {
    streamPool = streamPool.concat(HOLIDAY_STREAMING, HOLIDAY_STREAMING);
  }
  if (holiday === "NewYearsEve") {
    streamPool = streamPool.concat(NEW_YEARS_EVE_STREAMING, NEW_YEARS_EVE_STREAMING);
  }
  if (holiday === "Halloween") {
    streamPool = streamPool.concat(HALLOWEEN_STREAMING, HALLOWEEN_STREAMING);
  }
  if (holiday === "Valentine") {
    streamPool = streamPool.concat(VALENTINE_STREAMING, VALENTINE_STREAMING);
  }
  if (holiday === "Independence" || holiday === "MemorialDay" || holiday === "LaborDay") {
    streamPool = streamPool.concat(INDEPENDENCE_STREAMING);
  }
  if (holiday === "OaklandPride") {
    streamPool = streamPool.concat(PRIDE_STREAMING, PRIDE_STREAMING);
  }
  if (holiday === "MLKDay") {
    streamPool = streamPool.concat(MLK_STREAMING, MLK_STREAMING);
  }
  if (holiday === "Juneteenth") {
    streamPool = streamPool.concat(JUNETEENTH_STREAMING, JUNETEENTH_STREAMING);
  }
  if (holiday === "DiaDeMuertos") {
    streamPool = streamPool.concat(DIA_DE_MUERTOS_STREAMING, DIA_DE_MUERTOS_STREAMING);
  }
  if (holiday === "LunarNewYear") {
    streamPool = streamPool.concat(LUNAR_NEW_YEAR_STREAMING, LUNAR_NEW_YEAR_STREAMING);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY
  // ───────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    streamPool = streamPool.concat(FIRST_FRIDAY_STREAMING, FIRST_FRIDAY_STREAMING);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATION DAY
  // ───────────────────────────────────────────────────────────────────────────
  if (isCreationDay) {
    streamPool = streamPool.concat(CREATION_DAY_STREAMING, CREATION_DAY_STREAMING);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CULTURAL ACTIVITY
  // ───────────────────────────────────────────────────────────────────────────
  if (culturalActivity >= 1.4) {
    streamPool = streamPool.concat(FIRST_FRIDAY_STREAMING);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COMMUNITY ENGAGEMENT
  // ───────────────────────────────────────────────────────────────────────────
  if (communityEngagement >= 1.4) {
    streamPool = streamPool.concat(CREATION_DAY_STREAMING);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEATHER & MOOD
  // ───────────────────────────────────────────────────────────────────────────
  if (weather.impact >= 1.3) streamPool = streamPool.concat(STORM_STREAMING);
  if (weatherMood.primaryMood === 'cozy') streamPool = streamPool.concat(COZY_STREAMING);

  // ───────────────────────────────────────────────────────────────────────────
  // CHAOS
  // ───────────────────────────────────────────────────────────────────────────
  if (chaos.length >= 3) streamPool = streamPool.concat(CHAOS_STREAMING);

  // ───────────────────────────────────────────────────────────────────────────
  // SENTIMENT
  // ───────────────────────────────────────────────────────────────────────────
  if (sentiment >= 0.3) streamPool = streamPool.concat(HIGH_SENTIMENT_STREAMING);
  if (sentiment <= -0.3) streamPool = streamPool.concat(LOW_SENTIMENT_STREAMING);

  // ───────────────────────────────────────────────────────────────────────────
  // ECONOMIC MOOD
  // ───────────────────────────────────────────────────────────────────────────
  if (econMood >= 65) streamPool = streamPool.concat(UPSCALE_STREAMING);
  if (econMood <= 35) streamPool = streamPool.concat(BUDGET_STREAMING);

  // ───────────────────────────────────────────────────────────────────────────
  // NIGHTLIFE (low nightlife = more streaming)
  // ───────────────────────────────────────────────────────────────────────────
  if (nightlife <= 3) {
    streamPool.push("indoor binge-night");
  }
  if (nightlife >= 8) {
    streamPool.push("background streaming – out-and-about crowd");
  }

  var streamingTrend = pickRandom(streamPool);

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  S.eveningSports = eveningSportsText;
  S.eveningSportsDetails = eveningSportsDetails;
  S.streamingTrend = streamingTrend || "(none)";

  S.eveningSportsCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason
  };

  ctx.summary = S;
}
