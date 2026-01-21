/**
 * ============================================================================
 * V3.2 TEXTURE TRIGGER ENGINE — GODWORLD CALENDAR INTEGRATION
 * ============================================================================
 *
 * Generates environmental texture triggers with calendar awareness.
 *
 * v3.2 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - Holiday/festival atmospheric textures
 * - First Friday arts district textures
 * - Creation Day heritage textures
 * - Sports season textures
 * - Calendar-aware texture generation
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v3.1):
 * - Weather-based textures
 * - City dynamics textures
 * - Arc-based textures
 * - Domain accumulation textures
 * 
 * Textures provide atmospheric context for journalists.
 * No sheet writes — pure functional logic.
 * 
 * ============================================================================
 */

function textureTriggerEngine_(ctx) {
  const triggers = [];
  const S = ctx.summary || {};
  const arcs = S.eventArcs || [];
  const domains = S.domainPresence || {};
  const dyn = S.cityDynamics || {};
  const weather = S.weather || {};
  const worldEvents = S.worldEvents || [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v3.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || 'none';
  const holidayPriority = S.holidayPriority || 'none';
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || 'off-season';

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOODS (v3.2: expanded to 12)
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
      intensity: intensity || 'moderate'  // low, moderate, high
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER-BASED TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  if (weather.type === 'fog') {
    triggers.push(makeTrigger('WEATHER', '', 'low_visibility', 'Dense fog reducing visibility', 'moderate'));
  }
  if (weather.type === 'rain') {
    triggers.push(makeTrigger('WEATHER', '', 'wet_streets', 'Rain slicking the streets', 'low'));
  }
  if (weather.type === 'snow') {
    triggers.push(makeTrigger('WEATHER', '', 'snow_cover', 'Snow accumulating on surfaces', 'moderate'));
  }
  if (weather.type === 'freezing-rain' || weather.type === 'lake-effect') {
    triggers.push(makeTrigger('WEATHER', '', 'hazardous_conditions', 'Dangerous winter conditions', 'high'));
  }
  if (weather.type === 'heat-wave') {
    triggers.push(makeTrigger('WEATHER', '', 'oppressive_heat', 'Heat bearing down on the city', 'moderate'));
  }
  if (weather.type === 'thunderstorm') {
    triggers.push(makeTrigger('WEATHER', '', 'storm_tension', 'Storm energy in the air', 'high'));
  }
  if (weather.type === 'wind') {
    triggers.push(makeTrigger('WEATHER', '', 'gusty_conditions', 'Wind whipping through corridors', 'low'));
  }
  if (weather.type === 'overcast') {
    triggers.push(makeTrigger('WEATHER', '', 'grey_blanket', 'Grey skies overhead', 'low'));
  }
  if (weather.impact >= 1.4) {
    triggers.push(makeTrigger('WEATHER', '', 'severe_weather', 'Severe weather impact on daily life', 'high'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CITY DYNAMICS TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Sentiment
  if (dyn.sentiment <= -0.4) {
    triggers.push(makeTrigger('CIVIC', '', 'low_morale', 'City mood is depressed', 'high'));
  } else if (dyn.sentiment <= -0.2) {
    triggers.push(makeTrigger('CIVIC', '', 'uneasy_mood', 'Underlying tension in the city', 'moderate'));
  } else if (dyn.sentiment >= 0.3) {
    triggers.push(makeTrigger('CIVIC', '', 'upbeat_mood', 'Positive energy in the streets', 'moderate'));
  }

  // Nightlife
  if (dyn.nightlife >= 1.3) {
    triggers.push(makeTrigger('NIGHTLIFE', '', 'night_surge', 'Nightlife volume elevated', 'high'));
  } else if (dyn.nightlife >= 1.1) {
    triggers.push(makeTrigger('NIGHTLIFE', '', 'evening_buzz', 'Steady evening activity', 'low'));
  } else if (dyn.nightlife <= 0.7) {
    triggers.push(makeTrigger('NIGHTLIFE', '', 'quiet_night', 'Subdued nightlife', 'low'));
  }

  // Traffic
  if (dyn.traffic >= 1.3) {
    triggers.push(makeTrigger('INFRASTRUCTURE', '', 'congestion', 'Heavy traffic slowing movement', 'moderate'));
  } else if (dyn.traffic <= 0.7) {
    triggers.push(makeTrigger('INFRASTRUCTURE', '', 'empty_roads', 'Unusually light traffic', 'low'));
  }

  // Public spaces
  if (dyn.publicSpaces >= 1.3) {
    triggers.push(makeTrigger('COMMUNITY', '', 'crowded_spaces', 'Public areas busy with people', 'moderate'));
  } else if (dyn.publicSpaces <= 0.6) {
    triggers.push(makeTrigger('COMMUNITY', '', 'deserted_spaces', 'Public areas unusually empty', 'moderate'));
  }

  // Retail
  if (dyn.retail >= 1.3) {
    triggers.push(makeTrigger('BUSINESS', '', 'shopping_rush', 'Retail activity surging', 'moderate'));
  }

  // Cultural activity (v3.2)
  if (dyn.culturalActivity >= 1.3) {
    triggers.push(makeTrigger('CULTURE', '', 'cultural_buzz', 'Arts and culture activity elevated', 'moderate'));
  }

  // Community engagement (v3.2)
  if (dyn.communityEngagement >= 1.3) {
    triggers.push(makeTrigger('COMMUNITY', '', 'community_energy', 'Strong community engagement', 'moderate'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.2: HOLIDAY TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════

  // NEW YEARS EVE
  if (holiday === 'NewYearsEve') {
    triggers.push(makeTrigger('FESTIVAL', 'Downtown', 'countdown_energy', 'New Year countdown anticipation building', 'high'));
    triggers.push(makeTrigger('FESTIVAL', 'Jack London', 'party_atmosphere', 'Celebratory energy in the air', 'high'));
    triggers.push(makeTrigger('FESTIVAL', '', 'fireworks_anticipation', 'City awaiting midnight fireworks', 'moderate'));
  }

  // INDEPENDENCE DAY
  if (holiday === 'Independence') {
    triggers.push(makeTrigger('HOLIDAY', '', 'patriotic_decorations', 'Red, white, and blue decorations everywhere', 'moderate'));
    triggers.push(makeTrigger('HOLIDAY', 'Jack London', 'bbq_smoke', 'BBQ smoke drifting through neighborhoods', 'low'));
    triggers.push(makeTrigger('HOLIDAY', 'Lake Merritt', 'fireworks_gathering', 'Crowds gathering for fireworks viewing', 'high'));
  }

  // HALLOWEEN
  if (holiday === 'Halloween') {
    triggers.push(makeTrigger('HOLIDAY', 'Temescal', 'costume_parade', 'Costumed figures filling the streets', 'high'));
    triggers.push(makeTrigger('HOLIDAY', 'Rockridge', 'spooky_decorations', 'Elaborate Halloween decorations on display', 'moderate'));
    triggers.push(makeTrigger('HOLIDAY', '', 'trick_or_treat_traffic', 'Families navigating trick-or-treat routes', 'moderate'));
  }

  // THANKSGIVING
  if (holiday === 'Thanksgiving') {
    triggers.push(makeTrigger('HOLIDAY', '', 'quiet_streets', 'Streets quieter as families gather indoors', 'low'));
    triggers.push(makeTrigger('HOLIDAY', '', 'cooking_aromas', 'Cooking aromas drifting from homes', 'low'));
  }

  // HOLIDAY SEASON
  if (holiday === 'Holiday') {
    triggers.push(makeTrigger('HOLIDAY', 'Downtown', 'holiday_lights', 'Holiday lights twinkling throughout downtown', 'moderate'));
    triggers.push(makeTrigger('HOLIDAY', 'Rockridge', 'shopping_bustle', 'Last-minute shopping crowds', 'moderate'));
    triggers.push(makeTrigger('HOLIDAY', '', 'festive_mood', 'Festive spirit in the air', 'moderate'));
  }

  // OAKLAND PRIDE
  if (holiday === 'OaklandPride') {
    triggers.push(makeTrigger('FESTIVAL', 'Downtown', 'rainbow_decorations', 'Rainbow flags and decorations everywhere', 'high'));
    triggers.push(makeTrigger('FESTIVAL', 'Lake Merritt', 'celebration_crowds', 'Joyful Pride celebration crowds', 'high'));
    triggers.push(makeTrigger('FESTIVAL', 'Uptown', 'pride_energy', 'Pride energy radiating through the district', 'high'));
  }

  // ART & SOUL FESTIVAL
  if (holiday === 'ArtSoulFestival') {
    triggers.push(makeTrigger('FESTIVAL', 'Downtown', 'festival_grounds', 'Festival stages and vendors filling downtown', 'high'));
    triggers.push(makeTrigger('FESTIVAL', 'Downtown', 'live_music_energy', 'Live music energy pulsing through streets', 'high'));
    triggers.push(makeTrigger('CULTURE', '', 'cultural_celebration', 'Oakland culture on full display', 'high'));
  }

  // LUNAR NEW YEAR
  if (holiday === 'LunarNewYear') {
    triggers.push(makeTrigger('FESTIVAL', 'Chinatown', 'lion_dance_drums', 'Lion dance drums echoing through streets', 'high'));
    triggers.push(makeTrigger('FESTIVAL', 'Chinatown', 'red_lanterns', 'Red lanterns decorating storefronts', 'moderate'));
    triggers.push(makeTrigger('FESTIVAL', 'Chinatown', 'firecracker_smoke', 'Firecracker smoke lingering in the air', 'moderate'));
  }

  // CINCO DE MAYO
  if (holiday === 'CincoDeMayo') {
    triggers.push(makeTrigger('FESTIVAL', 'Fruitvale', 'mariachi_music', 'Mariachi music filling the streets', 'high'));
    triggers.push(makeTrigger('FESTIVAL', 'Fruitvale', 'fiesta_colors', 'Vibrant fiesta decorations everywhere', 'moderate'));
    triggers.push(makeTrigger('FESTIVAL', 'Fruitvale', 'street_celebration', 'Street celebration energy', 'high'));
  }

  // DIA DE MUERTOS
  if (holiday === 'DiaDeMuertos') {
    triggers.push(makeTrigger('FESTIVAL', 'Fruitvale', 'altar_candles', 'Candlelit altars glowing on porches', 'moderate'));
    triggers.push(makeTrigger('FESTIVAL', 'Fruitvale', 'marigold_scent', 'Marigold scent in the air', 'moderate'));
    triggers.push(makeTrigger('FESTIVAL', 'Fruitvale', 'face_paint_processions', 'Calavera face paint in the crowds', 'moderate'));
  }

  // JUNETEENTH
  if (holiday === 'Juneteenth') {
    triggers.push(makeTrigger('FESTIVAL', 'West Oakland', 'celebration_gathering', 'Community celebration gathering', 'high'));
    triggers.push(makeTrigger('FESTIVAL', 'Downtown', 'freedom_celebration', 'Freedom celebration energy', 'high'));
    triggers.push(makeTrigger('COMMUNITY', 'Lake Merritt', 'heritage_pride', 'Heritage pride on display', 'moderate'));
  }

  // ST PATRICK'S DAY
  if (holiday === 'StPatricksDay') {
    triggers.push(makeTrigger('HOLIDAY', 'Jack London', 'pub_overflow', 'Pubs overflowing with green-clad revelers', 'high'));
    triggers.push(makeTrigger('HOLIDAY', '', 'green_decorations', 'Green decorations throughout the city', 'moderate'));
  }

  // MLK DAY
  if (holiday === 'MLKDay') {
    triggers.push(makeTrigger('CIVIC', 'Downtown', 'march_assembly', 'March participants assembling', 'moderate'));
    triggers.push(makeTrigger('CIVIC', '', 'reflective_mood', 'Reflective, purposeful mood in the city', 'moderate'));
  }

  // MEMORIAL DAY / VETERANS DAY
  if (holiday === 'MemorialDay' || holiday === 'VeteransDay') {
    triggers.push(makeTrigger('CIVIC', 'Downtown', 'ceremony_gathering', 'Veterans and families gathering for ceremony', 'moderate'));
    triggers.push(makeTrigger('CIVIC', '', 'flags_display', 'American flags on display throughout city', 'low'));
  }

  // EASTER
  if (holiday === 'Easter') {
    triggers.push(makeTrigger('HOLIDAY', '', 'spring_pastels', 'Spring pastels and Easter decorations', 'low'));
    triggers.push(makeTrigger('COMMUNITY', 'Lake Merritt', 'egg_hunt_activity', 'Families at egg hunt events', 'moderate'));
  }

  // EARTH DAY
  if (holiday === 'EarthDay') {
    triggers.push(makeTrigger('ENVIRONMENT', '', 'green_awareness', 'Environmental awareness events throughout city', 'moderate'));
    triggers.push(makeTrigger('COMMUNITY', 'Lake Merritt', 'cleanup_crews', 'Volunteer cleanup crews at work', 'moderate'));
  }

  // OPENING DAY
  if (holiday === 'OpeningDay') {
    triggers.push(makeTrigger('SPORTS', 'Jack London', 'baseball_fever', 'Opening Day baseball fever', 'high'));
    triggers.push(makeTrigger('SPORTS', 'Jack London', 'green_and_gold', 'Green and gold everywhere near the stadium', 'high'));
    triggers.push(makeTrigger('SPORTS', 'Downtown', 'parade_energy', 'Opening Day parade energy downtown', 'moderate'));
  }

  // General holiday textures
  if (holiday !== 'none' && holidayPriority === 'major') {
    triggers.push(makeTrigger('HOLIDAY', '', 'holiday_atmosphere', 'Major holiday atmosphere pervading the city', 'high'));
  }
  if (holiday !== 'none' && holidayPriority === 'oakland') {
    triggers.push(makeTrigger('FESTIVAL', '', 'oakland_pride', 'Oakland pride and celebration visible everywhere', 'high'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.2: FIRST FRIDAY TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  if (isFirstFriday) {
    triggers.push(makeTrigger('ARTS', 'Uptown', 'gallery_crawl', 'Gallery doors open, art enthusiasts flowing between venues', 'high'));
    triggers.push(makeTrigger('ARTS', 'KONO', 'street_art_energy', 'Creative energy spilling into the streets', 'high'));
    triggers.push(makeTrigger('ARTS', 'Temescal', 'art_walk_crowds', 'Art walk crowds browsing galleries', 'moderate'));
    triggers.push(makeTrigger('NIGHTLIFE', 'Uptown', 'wine_and_art', 'Wine glasses and art conversations', 'moderate'));
    triggers.push(makeTrigger('COMMUNITY', '', 'creative_buzz', 'Creative community buzz throughout Oakland', 'moderate'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.2: CREATION DAY TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  if (isCreationDay) {
    triggers.push(makeTrigger('CIVIC', 'Downtown', 'founders_ceremony', 'Founders ceremony preparations', 'moderate'));
    triggers.push(makeTrigger('COMMUNITY', 'West Oakland', 'heritage_walks', 'Heritage walking tours in progress', 'moderate'));
    triggers.push(makeTrigger('CIVIC', '', 'oakland_history', 'Oakland history on display', 'moderate'));
    triggers.push(makeTrigger('COMMUNITY', 'Lake Merritt', 'community_gathering', 'Community gathering to celebrate Oakland', 'moderate'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.2: SPORTS SEASON TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  if (sportsSeason === 'championship') {
    triggers.push(makeTrigger('SPORTS', 'Jack London', 'championship_fever', 'Championship fever gripping the waterfront', 'high'));
    triggers.push(makeTrigger('SPORTS', 'Downtown', 'championship_anticipation', 'City-wide championship anticipation', 'high'));
    triggers.push(makeTrigger('SPORTS', '', 'team_colors_everywhere', 'Team colors visible on every block', 'high'));
    triggers.push(makeTrigger('COMMUNITY', '', 'united_fanbase', 'City united behind the team', 'high'));
  } else if (sportsSeason === 'playoffs') {
    triggers.push(makeTrigger('SPORTS', 'Jack London', 'playoff_energy', 'Playoff energy at sports bars and venues', 'high'));
    triggers.push(makeTrigger('SPORTS', 'Downtown', 'watch_party_crowds', 'Watch party crowds gathering', 'moderate'));
    triggers.push(makeTrigger('SPORTS', '', 'playoff_buzz', 'Playoff buzz in conversations citywide', 'moderate'));
  } else if (sportsSeason === 'late-season') {
    triggers.push(makeTrigger('SPORTS', 'Jack London', 'pennant_race', 'Pennant race tension building', 'moderate'));
    triggers.push(makeTrigger('SPORTS', '', 'sports_chatter', 'Elevated sports chatter in the city', 'low'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ARC-BASED TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  for (const a of arcs) {
    if (!a) continue;

    if (a.phase === 'early') {
      triggers.push(makeTrigger(
        a.domainTag || 'GENERAL',
        a.neighborhood || '',
        'arc_building',
        'Tension beginning to build',
        'low'
      ));
    }

    if (a.phase === 'rising') {
      triggers.push(makeTrigger(
        a.domainTag || 'GENERAL',
        a.neighborhood || '',
        'arc_escalating',
        'Situation escalating',
        'moderate'
      ));
    }

    if (a.phase === 'peak') {
      triggers.push(makeTrigger(
        a.domainTag || 'GENERAL',
        a.neighborhood || '',
        'arc_peak_pressure',
        'Arc at peak tension',
        'high'
      ));
    }

    if (a.phase === 'decline') {
      triggers.push(makeTrigger(
        a.domainTag || 'GENERAL',
        a.neighborhood || '',
        'arc_cooling',
        'Tension beginning to ease',
        'moderate'
      ));
    }

    if (a.phase === 'resolved') {
      triggers.push(makeTrigger(
        a.domainTag || 'GENERAL',
        a.neighborhood || '',
        'arc_aftermath',
        'Situation resolved, aftermath settling',
        'low'
      ));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN ACCUMULATION TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  for (const key in domains) {
    if (!domains.hasOwnProperty(key)) continue;

    if (domains[key] >= 5) {
      triggers.push(makeTrigger(
        key,
        '',
        'domain_saturation',
        'Domain heavily saturated with activity',
        'high'
      ));
    } else if (domains[key] >= 3) {
      triggers.push(makeTrigger(
        key,
        '',
        'domain_cluster',
        'Domain showing clustered signals',
        'moderate'
      ));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT-DRIVEN TEXTURES
  // ═══════════════════════════════════════════════════════════════════════════
  const eventCount = worldEvents.length;
  if (eventCount >= 5) {
    triggers.push(makeTrigger('GENERAL', '', 'busy_cycle', 'High event activity this cycle', 'moderate'));
  } else if (eventCount <= 1) {
    triggers.push(makeTrigger('GENERAL', '', 'quiet_cycle', 'Unusually quiet cycle', 'low'));
  }

  // Check for specific event types
  const hasHealthEvent = worldEvents.some(e => (e.domain || '').toLowerCase() === 'health');
  const hasSafetyEvent = worldEvents.some(e => (e.domain || '').toLowerCase() === 'safety');
  const hasFestivalEvent = worldEvents.some(e => (e.domain || '').toLowerCase() === 'festival');

  if (hasHealthEvent) {
    triggers.push(makeTrigger('HEALTH', '', 'health_concern', 'Health-related activity noted', 'moderate'));
  }
  if (hasSafetyEvent) {
    triggers.push(makeTrigger('SAFETY', '', 'safety_alert', 'Safety-related activity noted', 'moderate'));
  }
  if (hasFestivalEvent) {
    triggers.push(makeTrigger('FESTIVAL', '', 'festival_activity', 'Festival-related activity in progress', 'moderate'));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD-SPECIFIC TEXTURES (v3.2: 12 Oakland neighborhoods)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoodTextures = [
    { key: 'local_gathering', reason: 'Small gathering in the neighborhood' },
    { key: 'street_noise', reason: 'Elevated street noise' },
    { key: 'foot_traffic', reason: 'Increased foot traffic' },
    { key: 'quiet_block', reason: 'Unusually quiet block' },
    { key: 'sidewalk_activity', reason: 'Sidewalk cafes and shops busy' },
    { key: 'dog_walkers', reason: 'Dog walkers out in numbers' }
  ];

  // 25% chance per neighborhood to have a texture
  neighborhoods.forEach(n => {
    if (Math.random() < 0.25) {
      const texture = neighborhoodTextures[Math.floor(Math.random() * neighborhoodTextures.length)];
      triggers.push(makeTrigger('COMMUNITY', n, texture.key, texture.reason, 'low'));
    }
  });

  ctx.summary.textureTriggers = triggers;

  // v3.2: Calendar context for downstream
  ctx.summary.textureCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    triggerCount: triggers.length
  };
}


/**
 * ============================================================================
 * TEXTURE TRIGGER ENGINE REFERENCE v3.2
 * ============================================================================
 * 
 * NEIGHBORHOODS (12):
 * Temescal, Downtown, Fruitvale, Lake Merritt, West Oakland, Laurel,
 * Rockridge, Jack London, Uptown, KONO, Chinatown, Piedmont Ave
 * 
 * HOLIDAY TEXTURES (v3.2):
 * 
 * | Holiday | Textures | Neighborhoods |
 * |---------|----------|---------------|
 * | NewYearsEve | countdown_energy, party_atmosphere, fireworks_anticipation | Downtown, Jack London |
 * | Independence | patriotic_decorations, bbq_smoke, fireworks_gathering | Jack London, Lake Merritt |
 * | Halloween | costume_parade, spooky_decorations, trick_or_treat_traffic | Temescal, Rockridge |
 * | Thanksgiving | quiet_streets, cooking_aromas | Citywide |
 * | Holiday | holiday_lights, shopping_bustle, festive_mood | Downtown, Rockridge |
 * | OaklandPride | rainbow_decorations, celebration_crowds, pride_energy | Downtown, Lake Merritt, Uptown |
 * | ArtSoulFestival | festival_grounds, live_music_energy, cultural_celebration | Downtown |
 * | LunarNewYear | lion_dance_drums, red_lanterns, firecracker_smoke | Chinatown |
 * | CincoDeMayo | mariachi_music, fiesta_colors, street_celebration | Fruitvale |
 * | DiaDeMuertos | altar_candles, marigold_scent, face_paint_processions | Fruitvale |
 * | Juneteenth | celebration_gathering, freedom_celebration, heritage_pride | West Oakland, Downtown |
 * | StPatricksDay | pub_overflow, green_decorations | Jack London |
 * | MLKDay | march_assembly, reflective_mood | Downtown |
 * | OpeningDay | baseball_fever, green_and_gold, parade_energy | Jack London, Downtown |
 * 
 * FIRST FRIDAY TEXTURES (5):
 * - gallery_crawl (Uptown), street_art_energy (KONO), art_walk_crowds (Temescal)
 * - wine_and_art (Uptown), creative_buzz (citywide)
 * 
 * CREATION DAY TEXTURES (4):
 * - founders_ceremony (Downtown), heritage_walks (West Oakland)
 * - oakland_history (citywide), community_gathering (Lake Merritt)
 * 
 * SPORTS SEASON TEXTURES:
 * - Championship: championship_fever, championship_anticipation, team_colors_everywhere, united_fanbase
 * - Playoffs: playoff_energy, watch_party_crowds, playoff_buzz
 * - Late-season: pennant_race, sports_chatter
 * 
 * OUTPUT:
 * - textureTriggers: Array<{domain, neighborhood, textureKey, reason, intensity}>
 * - textureCalendarContext: {holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason, triggerCount}
 * 
 * ============================================================================
 */