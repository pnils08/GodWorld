/**
 * ============================================================================
 * V3.5 TEXTURE TRIGGER ENGINE — GODWORLD CALENDAR INTEGRATION
 * ============================================================================
 *
 * v3.5 Enhancements (from v3.4):
 * - JOURNALISM AI: Added signalChain tracking to texture triggers
 *   for "Behind the Curtain" subscriber transparency
 *
 * v3.4 Enhancements (from v3.3):
 * - Domain cooldown gate: respects S.suppressDomains from applyDomainCooldowns_
 * - Uses domainAllowed_() helper to skip suppressed domain textures
 *
 * v3.3 Enhancements (from v3.2):
 * - Deterministic RNG support (ctx.rng / ctx.config.rngSeed)
 * - Weather type normalization (hot/cold/rain/fog compatibility)
 * - Event-driven domain hints derived from description if domain missing
 * - Dedupe + soft cap to prevent texture spam
 * - Optional recovery-aware neighborhood texture rate
 *
 * No sheet writes — pure functional logic.
 * ============================================================================
 */

function mulberry32_(seed) {
  return function rng() {
    seed = (seed + 0x6D2B79F5) >>> 0;
    var t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function textureTriggerEngine_(ctx) {
  // Defensive guard
  if (!ctx) return;
  if (!ctx.summary) ctx.summary = {};

  var triggers = [];
  var S = ctx.summary;
  var arcs = S.eventArcs || [];
  var dyn = S.cityDynamics || {};
  var weatherRaw = S.weather || {};
  var worldEvents = Array.isArray(S.worldEvents) ? S.worldEvents : [];
  var domains = S.domainPresence || {}; // optional

  // Prefer injected RNG, else seed, else Math.random
  var rng = (typeof ctx.rng === 'function') ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === 'number')
      ? mulberry32_(ctx.config.rngSeed >>> 0)
      : (function(){ throw new Error('textureTriggers: ctx.rng or ctx.config.rngSeed required (Phase 40.3 Path 1)'); })();
  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || 'off-season';

  // Optional: recovery-aware texture rate (prevents "texture spam" on heavy days)
  var recoveryLevel = S.recoveryLevel || 'none';
  var neighborhoodTextureRate =
    (recoveryLevel === 'heavy') ? 0.12 :
    (recoveryLevel === 'moderate') ? 0.18 :
    0.25;

  // engine.99 Cohort 2 — core-sim hoods from Neighborhood_Map CoreSimRank (ADR-0016)
  var neighborhoods = getCoreSimNeighborhoods_(ctx);

  function makeTrigger(domain, neighborhood, key, reason, intensity) {
    return {
      domain: domain,
      neighborhood: neighborhood || '',
      textureKey: key,
      reason: reason,
      intensity: intensity || 'moderate', // low, moderate, high
      signalChain: [{
        agent: 'Story Editor',
        engine: 'textureTriggerEngine_',
        detected: key,
        value: intensity,
        context: reason,
        timestamp: 'Phase7'
      }]
    };
  }

  // Dedupe helper: (domain|neighborhood|key)
  var seen = Object.create(null);
  function pushUnique(tr) {
    var k = (tr.domain || '') + '|' + (tr.neighborhood || '') + '|' + (tr.textureKey || '');
    if (seen[k]) return;
    seen[k] = true;
    triggers.push(tr);
  }

  // Soft cap to keep output usable + domain cooldown gate
  function cappedPush(tr) {
    if (triggers.length >= 45) return;
    // Check domain cooldown - skip suppressed domains
    if (tr && tr.domain && typeof domainAllowed_ === 'function') {
      if (!domainAllowed_(ctx, tr.domain)) return;
    }
    pushUnique(tr);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER NORMALIZATION (compat with your other engines)
  // ═══════════════════════════════════════════════════════════════════════════
  function normalizeWeatherType(t) {
    var x = (t || '').toString().trim().toLowerCase();
    if (!x) return 'clear';

    // Common engine types
    if (x === 'hot') return 'heat-wave';
    if (x === 'cold') return 'freezing';
    if (x === 'mild' || x === 'breeze' || x === 'clear') return 'clear';

    // Pass-through known types
    return x;
  }

  var weather = {
    type: normalizeWeatherType(weatherRaw.type),
    impact: (typeof weatherRaw.impact === 'number') ? weatherRaw.impact : 1
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER-BASED TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  if (weather.type === 'fog') {
    cappedPush(makeTrigger('WEATHER', '', 'low_visibility', 'Dense fog reducing visibility', 'moderate'));
  }
  if (weather.type === 'rain') {
    cappedPush(makeTrigger('WEATHER', '', 'wet_streets', 'Rain slicking the streets', 'low'));
  }
  if (weather.type === 'snow') {
    cappedPush(makeTrigger('WEATHER', '', 'snow_cover', 'Snow accumulating on surfaces', 'moderate'));
  }
  if (weather.type === 'freezing-rain' || weather.type === 'lake-effect' || weather.type === 'freezing') {
    cappedPush(makeTrigger('WEATHER', '', 'hazardous_conditions', 'Dangerous winter conditions', 'high'));
  }
  if (weather.type === 'heat-wave') {
    cappedPush(makeTrigger('WEATHER', '', 'oppressive_heat', 'Heat bearing down on the city', 'moderate'));
  }
  if (weather.type === 'thunderstorm') {
    cappedPush(makeTrigger('WEATHER', '', 'storm_tension', 'Storm energy in the air', 'high'));
  }
  if (weather.type === 'wind') {
    cappedPush(makeTrigger('WEATHER', '', 'gusty_conditions', 'Wind whipping through corridors', 'low'));
  }
  if (weather.type === 'overcast') {
    cappedPush(makeTrigger('WEATHER', '', 'grey_blanket', 'Grey skies overhead', 'low'));
  }
  if (weather.impact >= 1.4) {
    cappedPush(makeTrigger('WEATHER', '', 'severe_weather', 'Severe weather impact on daily life', 'high'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CITY DYNAMICS TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  if (dyn.sentiment <= -0.4) {
    cappedPush(makeTrigger('CIVIC', '', 'low_morale', 'City mood is depressed', 'high'));
  } else if (dyn.sentiment <= -0.2) {
    cappedPush(makeTrigger('CIVIC', '', 'uneasy_mood', 'Underlying tension in the city', 'moderate'));
  } else if (dyn.sentiment >= 0.3) {
    cappedPush(makeTrigger('CIVIC', '', 'upbeat_mood', 'Positive energy in the streets', 'moderate'));
  }

  if (dyn.nightlife >= 1.3) {
    cappedPush(makeTrigger('NIGHTLIFE', '', 'night_surge', 'Nightlife volume elevated', 'high'));
  } else if (dyn.nightlife >= 1.1) {
    cappedPush(makeTrigger('NIGHTLIFE', '', 'evening_buzz', 'Steady evening activity', 'low'));
  } else if (dyn.nightlife <= 0.7) {
    cappedPush(makeTrigger('NIGHTLIFE', '', 'quiet_night', 'Subdued nightlife', 'low'));
  }

  if (dyn.traffic >= 1.3) {
    cappedPush(makeTrigger('INFRASTRUCTURE', '', 'congestion', 'Heavy traffic slowing movement', 'moderate'));
  } else if (dyn.traffic <= 0.7) {
    cappedPush(makeTrigger('INFRASTRUCTURE', '', 'empty_roads', 'Unusually light traffic', 'low'));
  }

  if (dyn.publicSpaces >= 1.3) {
    cappedPush(makeTrigger('COMMUNITY', '', 'crowded_spaces', 'Public areas busy with people', 'moderate'));
  } else if (dyn.publicSpaces <= 0.6) {
    cappedPush(makeTrigger('COMMUNITY', '', 'deserted_spaces', 'Public areas unusually empty', 'moderate'));
  }

  if (dyn.retail >= 1.3) {
    cappedPush(makeTrigger('BUSINESS', '', 'shopping_rush', 'Retail activity surging', 'moderate'));
  }

  if (dyn.culturalActivity >= 1.3) {
    cappedPush(makeTrigger('CULTURE', '', 'cultural_buzz', 'Arts and culture activity elevated', 'moderate'));
  }
  if (dyn.communityEngagement >= 1.3) {
    cappedPush(makeTrigger('COMMUNITY', '', 'community_energy', 'Strong community engagement', 'moderate'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY / FIRST FRIDAY / CREATION DAY / SPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holiday === 'NewYearsEve') {
    cappedPush(makeTrigger('FESTIVAL', 'Downtown', 'countdown_energy', 'New Year countdown anticipation building', 'high'));
    cappedPush(makeTrigger('FESTIVAL', 'Jack London', 'party_atmosphere', 'Celebratory energy in the air', 'high'));
    cappedPush(makeTrigger('FESTIVAL', '', 'fireworks_anticipation', 'City awaiting midnight fireworks', 'moderate'));
  }


  if (holiday === 'Halloween') {
    cappedPush(makeTrigger('HOLIDAY', 'Temescal', 'costume_parade', 'Costumed figures filling the streets', 'high'));
    cappedPush(makeTrigger('HOLIDAY', 'Rockridge', 'spooky_decorations', 'Elaborate Halloween decorations on display', 'moderate'));
    cappedPush(makeTrigger('HOLIDAY', '', 'trick_or_treat_traffic', 'Families navigating trick-or-treat routes', 'moderate'));
  }

  if (holiday === 'Thanksgiving') {
    cappedPush(makeTrigger('HOLIDAY', '', 'quiet_streets', 'Streets quieter as families gather indoors', 'low'));
    cappedPush(makeTrigger('HOLIDAY', '', 'cooking_aromas', 'Cooking aromas drifting from homes', 'low'));
  }

  if (holiday === 'Holiday') {
    cappedPush(makeTrigger('HOLIDAY', 'Downtown', 'holiday_lights', 'Holiday lights twinkling throughout downtown', 'moderate'));
    cappedPush(makeTrigger('HOLIDAY', 'Rockridge', 'shopping_bustle', 'Last-minute shopping crowds', 'moderate'));
    cappedPush(makeTrigger('HOLIDAY', '', 'festive_mood', 'Festive spirit in the air', 'moderate'));
  }










  if (holiday === 'Easter') {
    cappedPush(makeTrigger('HOLIDAY', '', 'spring_pastels', 'Spring pastels and Easter decorations', 'low'));
    cappedPush(makeTrigger('COMMUNITY', 'Lake Merritt', 'egg_hunt_activity', 'Families at egg hunt events', 'moderate'));
  }



  if (holiday !== 'none' && holidayPriority === 'major') {
    cappedPush(makeTrigger('HOLIDAY', '', 'holiday_atmosphere', 'Major holiday atmosphere pervading the city', 'high'));
  }
  if (holiday !== 'none' && holidayPriority === 'oakland') {
    cappedPush(makeTrigger('FESTIVAL', '', 'city_celebration', 'The city marking one of its own days, visible everywhere', 'high'));
  }
  if (holiday === 'SecondDawn') {
    cappedPush(makeTrigger('COMMUNITY', '', 'second_dawn_voices', 'Second Dawn: neighbors telling the city\'s stories out loud', 'moderate'));
  }

  if (isFirstFriday) {
    cappedPush(makeTrigger('ARTS', 'Uptown', 'gallery_crawl', 'Gallery doors open, art enthusiasts flowing between venues', 'high'));
    cappedPush(makeTrigger('ARTS', 'KONO', 'street_art_energy', 'Creative energy spilling into the streets', 'high'));
    cappedPush(makeTrigger('ARTS', 'Temescal', 'art_walk_crowds', 'Art walk crowds browsing galleries', 'moderate'));
    cappedPush(makeTrigger('NIGHTLIFE', 'Uptown', 'wine_and_art', 'Wine glasses and art conversations', 'moderate'));
    cappedPush(makeTrigger('COMMUNITY', '', 'creative_buzz', 'Creative community buzz throughout Oakland', 'moderate'));
  }

  if (isCreationDay) {
    cappedPush(makeTrigger('CIVIC', 'Downtown', 'founders_ceremony', 'Founders ceremony preparations', 'moderate'));
    cappedPush(makeTrigger('COMMUNITY', 'West Oakland', 'heritage_walks', 'Heritage walking tours in progress', 'moderate'));
    cappedPush(makeTrigger('CIVIC', '', 'oakland_history', 'Oakland history on display', 'moderate'));
    cappedPush(makeTrigger('COMMUNITY', 'Lake Merritt', 'community_gathering', 'Community gathering to celebrate Oakland', 'moderate'));
  }

  if (sportsSeason === 'championship') {
    cappedPush(makeTrigger('SPORTS', 'Jack London', 'championship_fever', 'Championship fever gripping the waterfront', 'high'));
    cappedPush(makeTrigger('SPORTS', 'Downtown', 'championship_anticipation', 'City-wide championship anticipation', 'high'));
    cappedPush(makeTrigger('SPORTS', '', 'team_colors_everywhere', 'Team colors visible on every block', 'high'));
    cappedPush(makeTrigger('COMMUNITY', '', 'united_fanbase', 'City united behind the team', 'high'));
  } else if (sportsSeason === 'playoffs') {
    cappedPush(makeTrigger('SPORTS', 'Jack London', 'playoff_energy', 'Playoff energy at sports bars and venues', 'high'));
    cappedPush(makeTrigger('SPORTS', 'Downtown', 'watch_party_crowds', 'Watch party crowds gathering', 'moderate'));
    cappedPush(makeTrigger('SPORTS', '', 'playoff_buzz', 'Playoff buzz in conversations citywide', 'moderate'));
  } else if (sportsSeason === 'late-season') {
    cappedPush(makeTrigger('SPORTS', 'Jack London', 'pennant_race', 'Pennant race tension building', 'moderate'));
    cappedPush(makeTrigger('SPORTS', '', 'sports_chatter', 'Elevated sports chatter in the city', 'low'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ARC-BASED TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  for (var ai = 0; ai < arcs.length; ai++) {
    var a = arcs[ai];
    if (!a) continue;

    if (a.phase === 'early') {
      cappedPush(makeTrigger(a.domainTag || 'GENERAL', a.neighborhood || '', 'arc_building', 'Tension beginning to build', 'low'));
    }
    if (a.phase === 'rising') {
      cappedPush(makeTrigger(a.domainTag || 'GENERAL', a.neighborhood || '', 'arc_escalating', 'Situation escalating', 'moderate'));
    }
    if (a.phase === 'peak') {
      cappedPush(makeTrigger(a.domainTag || 'GENERAL', a.neighborhood || '', 'arc_peak_pressure', 'Arc at peak tension', 'high'));
    }
    if (a.phase === 'decline') {
      cappedPush(makeTrigger(a.domainTag || 'GENERAL', a.neighborhood || '', 'arc_cooling', 'Tension beginning to ease', 'moderate'));
    }
    if (a.phase === 'resolved') {
      cappedPush(makeTrigger(a.domainTag || 'GENERAL', a.neighborhood || '', 'arc_aftermath', 'Situation resolved, aftermath settling', 'low'));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN ACCUMULATION TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  for (var key in domains) {
    if (!Object.prototype.hasOwnProperty.call(domains, key)) continue;
    var val = domains[key];
    if (val >= 5) {
      cappedPush(makeTrigger(key, '', 'domain_saturation', 'Domain heavily saturated with activity', 'high'));
    } else if (val >= 3) {
      cappedPush(makeTrigger(key, '', 'domain_cluster', 'Domain showing clustered signals', 'moderate'));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT-DRIVEN TEXTURES (robust: domain OR description keywords)
  // ═══════════════════════════════════════════════════════════════════════════
  var eventCount = worldEvents.length;
  if (eventCount >= 5) cappedPush(makeTrigger('GENERAL', '', 'busy_cycle', 'High event activity this cycle', 'moderate'));
  else if (eventCount <= 1) cappedPush(makeTrigger('GENERAL', '', 'quiet_cycle', 'Unusually quiet cycle', 'low'));

  function eventHasHint(hints, ev) {
    var d = ((ev.domain || ev.Domain || '') + '').toLowerCase();
    var desc = ((ev.description || ev.subdomain || ev.subtype || ev.text || '') + '').toLowerCase();
    for (var hi = 0; hi < hints.length; hi++) {
      if (d.indexOf(hints[hi]) !== -1 || desc.indexOf(hints[hi]) !== -1) return true;
    }
    return false;
  }

  var hasHealthEvent = false;
  var hasSafetyEvent = false;
  var hasFestivalEvent = false;
  var healthHints = ['health','illness','clinic','er','hospital','flu','allergy','injury','heat exhaustion'];
  var safetyHints = ['safety','theft','break-in','graffiti','altercation','pursuit','scalping'];
  var festivalHints = ['festival','parade','crowd surge','overcrowding','pride','float'];
  for (var wei = 0; wei < worldEvents.length; wei++) {
    var wev = worldEvents[wei];
    if (eventHasHint(healthHints, wev)) hasHealthEvent = true;
    if (eventHasHint(safetyHints, wev)) hasSafetyEvent = true;
    if (eventHasHint(festivalHints, wev)) hasFestivalEvent = true;
  }

  if (hasHealthEvent) cappedPush(makeTrigger('HEALTH', '', 'health_concern', 'Health-related activity noted', 'moderate'));
  if (hasSafetyEvent) cappedPush(makeTrigger('SAFETY', '', 'safety_alert', 'Safety-related activity noted', 'moderate'));
  if (hasFestivalEvent) cappedPush(makeTrigger('FESTIVAL', '', 'festival_activity', 'Festival-related activity in progress', 'moderate'));

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD-SPECIFIC TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoodTextures = [
    { key: 'local_gathering', reason: 'Small gathering in the neighborhood' },
    { key: 'street_noise', reason: 'Elevated street noise' },
    { key: 'foot_traffic', reason: 'Increased foot traffic' },
    { key: 'quiet_block', reason: 'Unusually quiet block' },
    { key: 'sidewalk_activity', reason: 'Sidewalk cafes and shops busy' },
    { key: 'dog_walkers', reason: 'Dog walkers out in numbers' }
  ];

  for (var ni = 0; ni < neighborhoods.length; ni++) {
    var n = neighborhoods[ni];
    if (rng() < neighborhoodTextureRate) {
      var texture = neighborhoodTextures[Math.floor(rng() * neighborhoodTextures.length)];
      cappedPush(makeTrigger('COMMUNITY', n, texture.key, texture.reason, 'low'));
    }
  }

  ctx.summary.textureTriggers = triggers;

  ctx.summary.textureCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    triggerCount: triggers.length
  };
}
