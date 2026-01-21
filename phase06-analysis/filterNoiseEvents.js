/**
 * ============================================================================
 * filterNoiseEvents_ v2.2
 * ============================================================================
 *
 * Advanced noise compression for engineEvents with GodWorld Calendar awareness.
 * Removes repetitive, low-impact, redundant entries while
 * preserving important world signals for the Media Room.
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

  const S = ctx.summary;
  if (!S || !S.engineEvents) return;

  const events = S.engineEvents;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const dynamics = S.cityDynamics || { 
    sentiment: 0, culturalActivity: 1, communityEngagement: 1 
  };
  const sentiment = dynamics.sentiment || 0;
  const chaos = S.worldEvents || [];
  const weather = S.weather || { type: "clear", impact: 1 };
  const weatherMood = S.weatherMood || {};
  const pattern = S.patternFlag || "";
  const econMood = S.economicMood || 50;

  // Calendar context (v2.2)
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const holidayNeighborhood = S.holidayNeighborhood || "";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";

  const seenMicro = new Set();
  const seenNeighborhood = new Set();
  const seenHousehold = new Set();
  const seenByDomain = {};
  const filtered = [];

  // Track filtering stats
  let removedCount = 0;
  let preservedByCalendar = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  function key(...parts) {
    return parts.join("|");
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
    const evTag = getEventTag(ev);
    const evType = normalizeType(ev);
    const evNeighborhood = ev.neighborhood || ev.location || '';

    // Holiday-tagged events always preserved
    if (evTag.includes("holiday")) return true;

    // First Friday events preserved on First Friday
    if (isFirstFriday) {
      if (evTag.includes("firstfriday")) return true;
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
      if (evTag.includes("creationday")) return true;
      if (evType === "community" && evTag.includes("foundational")) return true;
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
    let baseCap = 5;

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
  // MAIN FILTERING LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  for (let ev of events) {

    const evType = normalizeType(ev);
    const evSeverity = normalizeSeverity(ev);
    const evTag = getEventTag(ev);
    const neighborhood = ev.neighborhood || ev.location || '';

    // ═══════════════════════════════════════════════════════════════════════
    // CALENDAR PROTECTION CHECK (v2.2)
    // Always preserve calendar-protected events
    // ═══════════════════════════════════════════════════════════════════════
    if (isCalendarProtected(ev)) {
      filtered.push(ev);
      preservedByCalendar++;
      // Still count toward domain totals but don't cap
      seenByDomain[evType] = (seenByDomain[evType] || 0) + 1;
      continue;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 1. MICRO-EVENT DEDUPLICATION
    // ═══════════════════════════════════════════════════════════════════════
    if (evType === "micro") {
      const k = key(ev.popId, ev.description);
      if (seenMicro.has(k)) {
        removedCount++;
        continue;
      }
      seenMicro.add(k);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 2. NEIGHBORHOOD EVENT COMPRESSION
    // Collapse identical neighborhood notes.
    // Keep one per neighborhood per description.
    // ═══════════════════════════════════════════════════════════════════════
    if (evType === "neighborhood") {
      const k = key(neighborhood, ev.description);
      if (seenNeighborhood.has(k)) {
        removedCount++;
        continue;
      }
      seenNeighborhood.add(k);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 3. HOUSEHOLD EVENT COMPRESSION
    // De-duplicate by description + neighborhood.
    // ═══════════════════════════════════════════════════════════════════════
    if (evType === "household") {
      const k = key(neighborhood, ev.description);
      if (seenHousehold.has(k)) {
        removedCount++;
        continue;
      }
      seenHousehold.add(k);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 4. WEATHER-NOISE SUPPRESSION
    // Keep only 1 version of low-impact weather events
    // unless chaos is active or weather is severe.
    // ═══════════════════════════════════════════════════════════════════════
    if (evType === "weather" && evSeverity === "low") {
      if (weather.impact < 1.2 && chaos.length === 0) {
        const k = key("WEATHER", ev.description);
        if (seenMicro.has(k)) {
          removedCount++;
          continue;
        }
        seenMicro.add(k);
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
        const k = key("COMM", neighborhood, ev.description);
        if (seenNeighborhood.has(k)) {
          removedCount++;
          continue;
        }
        seenNeighborhood.add(k);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 6. ECONOMIC STABILITY FILTERING
    // During stable economy, reduce economic noise.
    // ═══════════════════════════════════════════════════════════════════════
    if (econMood >= 45 && econMood <= 55 && evType === "economic" && evSeverity === "low") {
      const k = key("ECON", ev.description);
      if (seenMicro.has(k)) {
        removedCount++;
        continue;
      }
      seenMicro.add(k);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. WEATHER MOOD COMFORT FILTERING
    // During comfortable weather, reduce weather complaints.
    // ═══════════════════════════════════════════════════════════════════════
    if (weatherMood.comfortIndex && weatherMood.comfortIndex > 0.6) {
      if (evType === "weather" && evSeverity === "low") {
        const k = key("COMFORT-WEATHER", ev.description);
        if (seenMicro.has(k)) {
          removedCount++;
          continue;
        }
        seenMicro.add(k);
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
      const isSpecialDay = (holidayPriority !== "none") || isFirstFriday || isCreationDay;
      
      if (!isSpecialDay) {
        if (evType === "micro" || evType === "community" || evType === "household") {
          if (evSeverity === "low" || evSeverity === "") {
            const k = key("CHAOS-COLLAPSE", evType, neighborhood);
            if (seenMicro.has(k)) {
              removedCount++;
              continue;
            }
            seenMicro.add(k);
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
      const cap = getDomainCap(evType);
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