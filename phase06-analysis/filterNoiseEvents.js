/**
 * ============================================================================
 * filterNoiseEvents_ v2.3
 * ============================================================================
 *
 * Advanced noise compression for engineEvents with GodWorld Calendar awareness.
 * Removes repetitive, low-impact, redundant entries while
 * preserving important world signals for the Media Room.
 *
 * v2.3 Changes:
 * - Calendar-protected events no longer count toward domain caps
 * - ES5 compatible (no const/let, for..of, rest params, includes, Set)
 *
 * v2.2 Enhancements:
 * - Expanded to 12 neighborhoods
 * - Holiday-aware filtering (preserves holiday-tagged events)
 * - First Friday preservation (cultural events protected)
 * - Creation Day preservation (community events protected)
 * - Sports season awareness (playoff events protected)
 * - Cultural activity and community engagement considerations
 * - Aligned with GodWorld Calendar v1.0
 *
 * Oakland neighborhood aware.
 * Supports both uppercase and lowercase domain names.
 *
 * ============================================================================
 */

function filterNoiseEvents_(ctx) {

  var S = ctx.summary;
  if (!S || !S.engineEvents) return;

  var events = S.engineEvents;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var dynamics = S.cityDynamics || {
    sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };
  var sentiment = dynamics.sentiment || 0;
  var chaos = S.worldEvents || [];
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var pattern = S.patternFlag || "";
  var econMood = S.economicMood || 50;

  // Calendar context (v2.2)
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var holidayNeighborhood = S.holidayNeighborhood || "";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";

  // ES5: Use plain objects instead of Set
  var seenMicro = {};
  var seenNeighborhood = {};
  var seenHousehold = {};
  var seenByDomain = {};
  var filtered = [];

  // Track filtering stats
  var removedCount = 0;
  var preservedByCalendar = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // ES5: Use arguments instead of rest params
  function key() {
    return [].slice.call(arguments).join("|");
  }

  function normalizeType(ev) {
    return (ev.type || ev.domain || '').toString().toLowerCase();
  }

  function normalizeSeverity(ev) {
    return (ev.severity || '').toString().toLowerCase();
  }

  function getEventTag(ev) {
    return (ev.tag || '').toString().toLowerCase();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR PRESERVATION CHECK (v2.2)
  // Events with calendar tags should be preserved
  // ═══════════════════════════════════════════════════════════════════════════
  function isCalendarProtected(ev) {
    var evTag = getEventTag(ev);
    var evType = normalizeType(ev);
    var evNeighborhood = ev.neighborhood || ev.location || '';

    // Holiday-tagged events always preserved
    if (evTag.indexOf("holiday") !== -1) return true;

    // First Friday events preserved on First Friday
    if (isFirstFriday) {
      if (evTag.indexOf("firstfriday") !== -1) return true;
      // Cultural events in First Friday neighborhoods
      if (evType === "culture" || evType === "community") {
        if (evNeighborhood === "Uptown" || evNeighborhood === "KONO" ||
            evNeighborhood === "Temescal" || evNeighborhood === "Jack London") {
          return true;
        }
      }
    }

    // Creation Day events preserved
    if (isCreationDay) {
      if (evTag.indexOf("creationday") !== -1) return true;
      if (evType === "community" && evTag.indexOf("foundational") !== -1) return true;
    }

    // Sports events preserved during high-intensity seasons
    if (evType === "sports") {
      if (sportsSeason === "championship" || sportsSeason === "playoffs" ||
          sportsSeason === "post-season") {
        return true;
      }
      // Opening Day sports events
      if (holiday === "OpeningDay") return true;
    }

    // Events in holiday neighborhood preserved during holidays
    if (holidayNeighborhood && evNeighborhood === holidayNeighborhood) {
      if (holidayPriority === "major" || holidayPriority === "oakland" ||
          holidayPriority === "cultural") {
        return true;
      }
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN CAP ADJUSTMENT (v2.2)
  // During special calendar events, allow more events from relevant domains
  // ═══════════════════════════════════════════════════════════════════════════
  function getDomainCap(evType) {
    var baseCap = 5;

    // Cultural holidays boost culture/community caps
    if (holidayPriority === "cultural") {
      if (evType === "culture") baseCap = 8;
      if (evType === "community") baseCap = 7;
    }

    // Major holidays boost community caps
    if (holidayPriority === "major") {
      if (evType === "community") baseCap = 7;
      if (evType === "civic") baseCap = 7;
    }

    // Oakland holidays boost local event caps
    if (holidayPriority === "oakland") {
      if (evType === "sports") baseCap = 8;
      if (evType === "culture") baseCap = 7;
      if (evType === "community") baseCap = 7;
    }

    // First Friday boosts culture caps
    if (isFirstFriday) {
      if (evType === "culture") baseCap = 10;
      if (evType === "community") baseCap = 7;
    }

    // Creation Day boosts community caps
    if (isCreationDay) {
      if (evType === "community") baseCap = 8;
    }

    // High cultural activity boosts culture caps
    if (dynamics.culturalActivity >= 1.4) {
      if (evType === "culture") baseCap = Math.max(baseCap, 8);
    }

    // High community engagement boosts community caps
    if (dynamics.communityEngagement >= 1.3) {
      if (evType === "community") baseCap = Math.max(baseCap, 7);
    }

    return baseCap;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN FILTERING LOOP (ES5: classic for loop)
  // ═══════════════════════════════════════════════════════════════════════════
  for (var i = 0; i < events.length; i++) {
    var ev = events[i];

    var evType = normalizeType(ev);
    var evSeverity = normalizeSeverity(ev);
    var evTag = getEventTag(ev);
    var neighborhood = ev.neighborhood || ev.location || '';

    // ═══════════════════════════════════════════════════════════════════════
    // CALENDAR PROTECTION CHECK (v2.3)
    // Always preserve calendar-protected events
    // Protected events do NOT count toward domain caps (v2.3 fix)
    // ═══════════════════════════════════════════════════════════════════════
    if (isCalendarProtected(ev)) {
      filtered.push(ev);
      preservedByCalendar++;
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 1. MICRO-EVENT DEDUPLICATION
    // ═══════════════════════════════════════════════════════════════════════
    if (evType === "micro") {
      var k = key(ev.popId, ev.description);
      if (seenMicro[k]) {
        removedCount++;
        continue;
      }
      seenMicro[k] = true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. NEIGHBORHOOD EVENT COMPRESSION
    // Collapse identical neighborhood notes.
    // Keep one per neighborhood per description.
    // ═══════════════════════════════════════════════════════════════════════
    if (evType === "neighborhood") {
      var k = key(neighborhood, ev.description);
      if (seenNeighborhood[k]) {
        removedCount++;
        continue;
      }
      seenNeighborhood[k] = true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. HOUSEHOLD EVENT COMPRESSION
    // De-duplicate by description + neighborhood.
    // ═══════════════════════════════════════════════════════════════════════
    if (evType === "household") {
      var k = key(neighborhood, ev.description);
      if (seenHousehold[k]) {
        removedCount++;
        continue;
      }
      seenHousehold[k] = true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. WEATHER-NOISE SUPPRESSION
    // Keep only 1 version of low-impact weather events
    // unless chaos is active or weather is severe.
    // ═══════════════════════════════════════════════════════════════════════
    if (evType === "weather" && evSeverity === "low") {
      if (weather.impact < 1.2 && chaos.length === 0) {
        var k = key("WEATHER", ev.description);
        if (seenMicro[k]) {
          removedCount++;
          continue;
        }
        seenMicro[k] = true;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. SENTIMENT-BASED FILTERING
    // During stable or positive sentiment,
    // remove repetitive low-level community noise.
    // (v2.2: Skip during high community engagement)
    // ═══════════════════════════════════════════════════════════════════════
    if (sentiment >= 0.3 && evType === "community" && evSeverity === "low") {
      // v2.2: Don't over-filter during high community engagement
      if (dynamics.communityEngagement < 1.2) {
        var k = key("COMM", neighborhood, ev.description);
        if (seenNeighborhood[k]) {
          removedCount++;
          continue;
        }
        seenNeighborhood[k] = true;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. ECONOMIC STABILITY FILTERING
    // During stable economy, reduce economic noise.
    // ═══════════════════════════════════════════════════════════════════════
    if (econMood >= 45 && econMood <= 55 && evType === "economic" && evSeverity === "low") {
      var k = key("ECON", ev.description);
      if (seenMicro[k]) {
        removedCount++;
        continue;
      }
      seenMicro[k] = true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. WEATHER MOOD COMFORT FILTERING
    // During comfortable weather, reduce weather complaints.
    // ═══════════════════════════════════════════════════════════════════════
    if (weatherMood.comfortIndex && weatherMood.comfortIndex > 0.6) {
      if (evType === "weather" && evSeverity === "low") {
        var k = key("COMFORT-WEATHER", ev.description);
        if (seenMicro[k]) {
          removedCount++;
          continue;
        }
        seenMicro[k] = true;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 8. CHAOS-CLUSTER MERGING
    // During chaos, keep all medium+ events,
    // but reduce low-noise background clutter.
    // (v2.2: Don't collapse during holidays or First Friday)
    // ═══════════════════════════════════════════════════════════════════════
    if (chaos.length > 0 && pattern !== "micro-event-wave") {
      // v2.2: Skip chaos collapse during special calendar events
      var isSpecialDay = (holidayPriority !== "none") || isFirstFriday || isCreationDay;

      if (!isSpecialDay) {
        if (evType === "micro" || evType === "community" || evType === "household") {
          if (evSeverity === "low" || evSeverity === "") {
            var k = key("CHAOS-COLLAPSE", evType, neighborhood);
            if (seenMicro[k]) {
              removedCount++;
              continue;
            }
            seenMicro[k] = true;
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 9. DOMAIN FREQUENCY CAP (v2.2: Calendar-adjusted caps)
    // No more than N events per domain (except high severity)
    // ═══════════════════════════════════════════════════════════════════════
    if (evSeverity !== "high" && evSeverity !== "major" && evSeverity !== "critical") {
      seenByDomain[evType] = (seenByDomain[evType] || 0) + 1;
      var cap = getDomainCap(evType);
      if (seenByDomain[evType] > cap) {
        removedCount++;
        continue;
      }
    }

    filtered.push(ev);
  }

  S.engineEvents = filtered;

  // ═══════════════════════════════════════════════════════════════════════════
  // STORE FILTERING STATS
  // ═══════════════════════════════════════════════════════════════════════════
  S.noiseFilterStats = {
    original: events.length,
    filtered: filtered.length,
    removed: removedCount,
    preservedByCalendar: preservedByCalendar,
    compressionRatio: events.length > 0 ? Math.round((1 - filtered.length / events.length) * 100) : 0,
    // v2.2: Calendar context that affected filtering
    calendarContext: {
      holiday: holiday,
      holidayPriority: holidayPriority,
      isFirstFriday: isFirstFriday,
      isCreationDay: isCreationDay,
      sportsSeason: sportsSeason
    }
  };

  ctx.summary = S;
}


/**
 * ============================================================================
 * NOISE FILTER REFERENCE
 * ============================================================================
 *
 * Filtering Rules:
 * 1. Micro-event deduplication (by popId + description)
 * 2. Neighborhood event compression (one per description)
 * 3. Household event compression (one per neighborhood)
 * 4. Weather-noise suppression (low-impact weather)
 * 5. Sentiment-based filtering (low community noise)
 * 6. Economic stability filtering (stable economy noise)
 * 7. Weather mood comfort filtering
 * 8. Chaos-cluster merging (background clutter)
 * 9. Domain frequency caps (calendar-adjusted)
 *
 * Calendar Preservation (v2.2):
 * - Holiday-tagged events always preserved
 * - First Friday cultural events preserved
 * - Creation Day community events preserved
 * - Sports events during playoffs/championship preserved
 * - Holiday neighborhood events preserved
 *
 * v2.3 Fix:
 * - Calendar-protected events no longer count toward domain caps
 *   (prevents holidays from crowding out normal domain signals)
 *
 * Domain Caps (v2.2 - Calendar-adjusted):
 * - Base cap: 5 events per domain
 * - Cultural holidays: culture +8, community +7
 * - Major holidays: community +7, civic +7
 * - Oakland holidays: sports +8, culture +7, community +7
 * - First Friday: culture +10, community +7
 * - Creation Day: community +8
 * - High cultural activity: culture +8
 * - High community engagement: community +7
 *
 * Stats Output:
 * - original: Event count before filtering
 * - filtered: Event count after filtering
 * - removed: Events removed
 * - preservedByCalendar: Events protected by calendar rules
 * - compressionRatio: Percentage removed
 * - calendarContext: Calendar state affecting filters
 *
 * ============================================================================
 */
