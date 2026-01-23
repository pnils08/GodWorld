/**
 * ============================================================================
 * V3.4 TEXTURE TRIGGER ENGINE — GODWORLD CALENDAR INTEGRATION
 * ============================================================================
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
  const triggers = [];
  const S = ctx.summary || (ctx.summary = {});
  const arcs = S.eventArcs || [];
  const dyn = S.cityDynamics || {};
  const weatherRaw = S.weather || {};
  const worldEvents = Array.isArray(S.worldEvents) ? S.worldEvents : [];
  const domains = S.domainPresence || {}; // optional

  // Prefer injected RNG, else seed, else Math.random
  const rng = (typeof ctx.rng === 'function') ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === 'number')
      ? mulberry32_(ctx.config.rngSeed >>> 0)
      : Math.random;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || 'none';
  const holidayPriority = S.holidayPriority || 'none';
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || 'off-season';

  // Optional: recovery-aware texture rate (prevents "texture spam" on heavy days)
  const recoveryLevel = S.recoveryLevel || 'none';
  const neighborhoodTextureRate =
    (recoveryLevel === 'heavy') ? 0.12 :
    (recoveryLevel === 'moderate') ? 0.18 :
    0.25;

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOODS (12)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoods = [
    'Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt',
    'West Oakland', 'Laurel', 'Rockridge', 'Jack London',
    'Uptown', 'KONO', 'Chinatown', 'Piedmont Ave'
  ];

  function makeTrigger(domain, neighborhood, key, reason, intensity) {
    return {
      domain: domain,
      neighborhood: neighborhood || '',
      textureKey: key,
      reason: reason,
      intensity: intensity || 'moderate' // low, moderate, high
    };
  }

  // Dedupe helper: (domain|neighborhood|key)
  const seen = Object.create(null);
  function pushUnique(tr) {
    const k = (tr.domain || '') + '|' + (tr.neighborhood || '') + '|' + (tr.textureKey || '');
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
    const x = (t || '').toString().trim().toLowerCase();
    if (!x) return 'clear';

    // Common engine types
    if (x === 'hot') return 'heat-wave';
    if (x === 'cold') return 'freezing';
    if (x === 'mild' || x === 'breeze' || x === 'clear') return 'clear';

    // Pass-through known types
    return x;
  }

  const weather = {
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

  if (holiday === 'Independence') {
    cappedPush(makeTrigger('HOLIDAY', '', 'patriotic_decorations', 'Red, white, and blue decorations everywhere', 'moderate'));
    cappedPush(makeTrigger('HOLIDAY', 'Jack London', 'bbq_smoke', 'BBQ smoke drifting through neighborhoods', 'low'));
    cappedPush(makeTrigger('HOLIDAY', 'Lake Merritt', 'fireworks_gathering', 'Crowds gathering for fireworks viewing', 'high'));
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

  if (holiday === 'OaklandPride') {
    cappedPush(makeTrigger('FESTIVAL', 'Downtown', 'rainbow_decorations', 'Rainbow flags and decorations everywhere', 'high'));
    cappedPush(makeTrigger('FESTIVAL', 'Lake Merritt', 'celebration_crowds', 'Joyful Pride celebration crowds', 'high'));
    cappedPush(makeTrigger('FESTIVAL', 'Uptown', 'pride_energy', 'Pride energy radiating through the district', 'high'));
  }

  if (holiday === 'ArtSoulFestival') {
    cappedPush(makeTrigger('FESTIVAL', 'Downtown', 'festival_grounds', 'Festival stages and vendors filling downtown', 'high'));
    cappedPush(makeTrigger('FESTIVAL', 'Downtown', 'live_music_energy', 'Live music energy pulsing through streets', 'high'));
    cappedPush(makeTrigger('CULTURE', '', 'cultural_celebration', 'Oakland culture on full display', 'high'));
  }

  if (holiday === 'LunarNewYear') {
    cappedPush(makeTrigger('FESTIVAL', 'Chinatown', 'lion_dance_drums', 'Lion dance drums echoing through streets', 'high'));
    cappedPush(makeTrigger('FESTIVAL', 'Chinatown', 'red_lanterns', 'Red lanterns decorating storefronts', 'moderate'));
    cappedPush(makeTrigger('FESTIVAL', 'Chinatown', 'firecracker_smoke', 'Firecracker smoke lingering in the air', 'moderate'));
  }

  if (holiday === 'CincoDeMayo') {
    cappedPush(makeTrigger('FESTIVAL', 'Fruitvale', 'mariachi_music', 'Mariachi music filling the streets', 'high'));
    cappedPush(makeTrigger('FESTIVAL', 'Fruitvale', 'fiesta_colors', 'Vibrant fiesta decorations everywhere', 'moderate'));
    cappedPush(makeTrigger('FESTIVAL', 'Fruitvale', 'street_celebration', 'Street celebration energy', 'high'));
  }

  if (holiday === 'DiaDeMuertos') {
    cappedPush(makeTrigger('FESTIVAL', 'Fruitvale', 'altar_candles', 'Candlelit altars glowing on porches', 'moderate'));
    cappedPush(makeTrigger('FESTIVAL', 'Fruitvale', 'marigold_scent', 'Marigold scent in the air', 'moderate'));
    cappedPush(makeTrigger('FESTIVAL', 'Fruitvale', 'face_paint_processions', 'Calavera face paint in the crowds', 'moderate'));
  }

  if (holiday === 'Juneteenth') {
    cappedPush(makeTrigger('FESTIVAL', 'West Oakland', 'celebration_gathering', 'Community celebration gathering', 'high'));
    cappedPush(makeTrigger('FESTIVAL', 'Downtown', 'freedom_celebration', 'Freedom celebration energy', 'high'));
    cappedPush(makeTrigger('COMMUNITY', 'Lake Merritt', 'heritage_pride', 'Heritage pride on display', 'moderate'));
  }

  if (holiday === 'StPatricksDay') {
    cappedPush(makeTrigger('HOLIDAY', 'Jack London', 'pub_overflow', 'Pubs overflowing with green-clad revelers', 'high'));
    cappedPush(makeTrigger('HOLIDAY', '', 'green_decorations', 'Green decorations throughout the city', 'moderate'));
  }

  if (holiday === 'MLKDay') {
    cappedPush(makeTrigger('CIVIC', 'Downtown', 'march_assembly', 'March participants assembling', 'moderate'));
    cappedPush(makeTrigger('CIVIC', '', 'reflective_mood', 'Reflective, purposeful mood in the city', 'moderate'));
  }

  if (holiday === 'MemorialDay' || holiday === 'VeteransDay') {
    cappedPush(makeTrigger('CIVIC', 'Downtown', 'ceremony_gathering', 'Veterans and families gathering for ceremony', 'moderate'));
    cappedPush(makeTrigger('CIVIC', '', 'flags_display', 'American flags on display throughout city', 'low'));
  }

  if (holiday === 'Easter') {
    cappedPush(makeTrigger('HOLIDAY', '', 'spring_pastels', 'Spring pastels and Easter decorations', 'low'));
    cappedPush(makeTrigger('COMMUNITY', 'Lake Merritt', 'egg_hunt_activity', 'Families at egg hunt events', 'moderate'));
  }

  if (holiday === 'EarthDay') {
    cappedPush(makeTrigger('ENVIRONMENT', '', 'green_awareness', 'Environmental awareness events throughout city', 'moderate'));
    cappedPush(makeTrigger('COMMUNITY', 'Lake Merritt', 'cleanup_crews', 'Volunteer cleanup crews at work', 'moderate'));
  }

  if (holiday === 'OpeningDay') {
    cappedPush(makeTrigger('SPORTS', 'Jack London', 'baseball_fever', 'Opening Day baseball fever', 'high'));
    cappedPush(makeTrigger('SPORTS', 'Jack London', 'green_and_gold', 'Green and gold everywhere near the stadium', 'high'));
    cappedPush(makeTrigger('SPORTS', 'Downtown', 'parade_energy', 'Opening Day parade energy downtown', 'moderate'));
  }

  if (holiday !== 'none' && holidayPriority === 'major') {
    cappedPush(makeTrigger('HOLIDAY', '', 'holiday_atmosphere', 'Major holiday atmosphere pervading the city', 'high'));
  }
  if (holiday !== 'none' && holidayPriority === 'oakland') {
    cappedPush(makeTrigger('FESTIVAL', '', 'oakland_pride', 'Oakland pride and celebration visible everywhere', 'high'));
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
  for (const a of arcs) {
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
  for (const key in domains) {
    if (!Object.prototype.hasOwnProperty.call(domains, key)) continue;
    const val = domains[key];
    if (val >= 5) {
      cappedPush(makeTrigger(key, '', 'domain_saturation', 'Domain heavily saturated with activity', 'high'));
    } else if (val >= 3) {
      cappedPush(makeTrigger(key, '', 'domain_cluster', 'Domain showing clustered signals', 'moderate'));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT-DRIVEN TEXTURES (robust: domain OR description keywords)
  // ═══════════════════════════════════════════════════════════════════════════
  const eventCount = worldEvents.length;
  if (eventCount >= 5) cappedPush(makeTrigger('GENERAL', '', 'busy_cycle', 'High event activity this cycle', 'moderate'));
  else if (eventCount <= 1) cappedPush(makeTrigger('GENERAL', '', 'quiet_cycle', 'Unusually quiet cycle', 'low'));

  function eventHasHint(hints, ev) {
    const d = ((ev.domain || ev.Domain || '') + '').toLowerCase();
    const desc = ((ev.description || ev.subdomain || ev.subtype || ev.text || '') + '').toLowerCase();
    return hints.some(h => d.includes(h) || desc.includes(h));
  }

  const hasHealthEvent = worldEvents.some(ev => eventHasHint(['health','illness','clinic','er','hospital','flu','allergy','injury','heat exhaustion'], ev));
  const hasSafetyEvent = worldEvents.some(ev => eventHasHint(['safety','theft','break-in','graffiti','altercation','pursuit','scalping'], ev));
  const hasFestivalEvent = worldEvents.some(ev => eventHasHint(['festival','parade','crowd surge','overcrowding','pride','float'], ev));

  if (hasHealthEvent) cappedPush(makeTrigger('HEALTH', '', 'health_concern', 'Health-related activity noted', 'moderate'));
  if (hasSafetyEvent) cappedPush(makeTrigger('SAFETY', '', 'safety_alert', 'Safety-related activity noted', 'moderate'));
  if (hasFestivalEvent) cappedPush(makeTrigger('FESTIVAL', '', 'festival_activity', 'Festival-related activity in progress', 'moderate'));

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD-SPECIFIC TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoodTextures = [
    { key: 'local_gathering', reason: 'Small gathering in the neighborhood' },
    { key: 'street_noise', reason: 'Elevated street noise' },
    { key: 'foot_traffic', reason: 'Increased foot traffic' },
    { key: 'quiet_block', reason: 'Unusually quiet block' },
    { key: 'sidewalk_activity', reason: 'Sidewalk cafes and shops busy' },
    { key: 'dog_walkers', reason: 'Dog walkers out in numbers' }
  ];

  neighborhoods.forEach(n => {
    if (rng() < neighborhoodTextureRate) {
      const texture = neighborhoodTextures[Math.floor(rng() * neighborhoodTextures.length)];
      cappedPush(makeTrigger('COMMUNITY', n, texture.key, texture.reason, 'low'));
    }
  });

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
