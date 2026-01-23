/**
 * ============================================================================
 * applyWeatherModel_ v3.3
 * ============================================================================
 *
 * Combines weather generation with mood pipeline.
 * Aligned with GodWorld Calendar v1.0 and getSimHoliday_ v2.3.
 *
 * v3.3 Enhancements:
 * - Seeded RNG for deterministic/reproducible weather (same pattern as worldEventsEngine_)
 * - Fixed streak counter bug (starts at 0, not 1)
 * - Fixed typeComfort: 'cloudy' → 'overcast' (matches actual output)
 *
 * v3.2 Enhancements:
 * - All 30+ holidays from cycle-based calendar
 * - First Friday weather awareness
 * - Creation Day special handling
 * - Oakland-specific and cultural holiday weather effects
 * - Cycle-based tracking (cycleOfYear awareness)
 *
 * Features:
 * - Generates base weather (temp, type, impact)
 * - Oakland neighborhood micro-climates
 * - Tracks weather streaks and patterns
 * - Detects special events (first snow, heat wave, etc.)
 * - Calculates comfort index and mood effects
 * - Generates weather event pools for citizen generators
 *
 * ============================================================================
 */

// Oakland micro-climate profiles
const OAKLAND_WEATHER_PROFILES = {
  'Downtown': { tempMod: 2, fogChance: 0.1, description: 'urban heat island' },
  'Jack London': { tempMod: -1, fogChance: 0.3, description: 'waterfront cool' },
  'Fruitvale': { tempMod: 1, fogChance: 0.15, description: 'inland warmth' },
  'Temescal': { tempMod: 0, fogChance: 0.2, description: 'moderate' },
  'Lake Merritt': { tempMod: -1, fogChance: 0.25, description: 'lake effect' },
  'West Oakland': { tempMod: 0, fogChance: 0.35, description: 'bay fog corridor' },
  'Rockridge': { tempMod: -2, fogChance: 0.15, description: 'hills cooler' },
  'Laurel': { tempMod: 1, fogChance: 0.1, description: 'sheltered valley' },
  'Uptown': { tempMod: 1, fogChance: 0.15, description: 'urban corridor' },
  'KONO': { tempMod: 1, fogChance: 0.2, description: 'arts district' },
  'Chinatown': { tempMod: 2, fogChance: 0.15, description: 'dense urban' },
  'Piedmont Ave': { tempMod: -1, fogChance: 0.2, description: 'piedmont edge' }
};


function applyWeatherModel_(ctx) {

  const S = ctx.summary;

  // v3.3: Seeded RNG for deterministic weather (same pattern as worldEventsEngine_)
  var rng = (typeof ctx.rng === 'function') ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === 'number')
      ? mulberry32_(ctx.config.rngSeed >>> 0)
      : Math.random;

  const month = S.simMonth;
  const season = S.season;
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const cycleOfYear = S.cycleOfYear || 1;
  const currentCycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 1: BASE WEATHER GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  const base = {
    1: 48, 2: 51, 3: 56, 4: 61, 5: 66, 6: 71,
    7: 73, 8: 74, 9: 72, 10: 66, 11: 58, 12: 52
  }[month] || 65;

  let temp = base + (rng() * 6 - 3);

  const list = [];

  if (season === "Winter") list.push("cold", "rain", "fog", "snow");
  if (season === "Spring") list.push("mild", "rain", "wind", "clear");
  if (season === "Summer") list.push("hot", "clear", "breeze", "humid");
  if (season === "Fall") list.push("cool", "wind", "fog", "rain");

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY WEATHER BIASES
  // ═══════════════════════════════════════════════════════════════════════════

  // Major holidays
  if (holiday === "NewYear" || holiday === "NewYearsEve") {
    list.push("cold", "clear");  // Crisp winter night
  }
  if (holiday === "MLKDay") {
    list.push("cold", "rain");  // January
  }
  if (holiday === "Easter") {
    list.push("mild", "clear");  // Spring hope
  }
  if (holiday === "MemorialDay") {
    list.push("clear", "mild", "breeze");  // Late spring
  }
  if (holiday === "Juneteenth") {
    list.push("clear", "hot", "breeze");  // Summer celebration
  }
  if (holiday === "Independence") {
    list.push("clear", "clear", "hot");  // Clear for fireworks
  }
  if (holiday === "LaborDay") {
    list.push("hot", "clear");  // End of summer
  }
  if (holiday === "Halloween") {
    list.push("fog", "cool", "wind");  // Spooky atmosphere
  }
  if (holiday === "Thanksgiving") {
    list.push("cold", "rain", "fog");  // November
  }
  if (holiday === "Holiday") {
    list.push("cold", "snow", "rain");  // Christmas
  }

  // Cultural holidays
  if (holiday === "CincoDeMayo") {
    list.push("mild", "clear", "breeze");  // May celebration
  }
  if (holiday === "DiaDeMuertos") {
    list.push("fog", "cool");  // Atmospheric for remembrance
  }
  if (holiday === "PrideMonth") {
    list.push("clear", "mild");  // June
  }
  if (holiday === "Hanukkah") {
    list.push("cold", "clear");  // December
  }

  // Oakland-specific
  if (holiday === "OpeningDay") {
    list.push("mild", "clear", "breeze");  // Baseball weather
  }
  if (holiday === "OaklandPride") {
    list.push("clear", "mild");  // Late May
  }
  if (holiday === "ArtSoulFestival") {
    list.push("hot", "clear");  // August
  }
  if (holiday === "SummerFestival") {
    list.push("hot", "clear", "breeze");  // July
  }
  if (holiday === "EarthDay") {
    list.push("mild", "clear", "rain");  // April
  }

  // Seasonal markers
  if (holiday === "SpringEquinox") {
    list.push("mild", "rain", "breeze");  // Transition
  }
  if (holiday === "SummerSolstice") {
    list.push("hot", "clear");  // Peak summer
  }
  if (holiday === "FallEquinox") {
    list.push("cool", "wind", "fog");  // Transition
  }
  if (holiday === "WinterSolstice") {
    list.push("cold", "fog", "rain");  // Darkest day
  }

  // Minor holidays
  if (holiday === "Valentine") {
    list.push("rain", "cold");  // February romance
  }
  if (holiday === "StPatricksDay") {
    list.push("rain", "mild");  // March
  }
  if (holiday === "MothersDay" || holiday === "FathersDay") {
    list.push("clear", "mild");  // Pleasant family weather
  }
  if (holiday === "BackToSchool") {
    list.push("hot", "clear");  // August
  }

  // Creation Day - weather feels significant
  if (isCreationDay || holiday === "CreationDay") {
    list.push("clear", "mild");  // Foundational clarity
  }

  // First Friday - good weather for art walks
  if (isFirstFriday) {
    list.push("clear", "mild");  // Favorable for outdoor crowds
  }

  const type = list[Math.floor(rng() * list.length)] || "clear";

  let impact = 1;
  if (type === "rain") impact = 1.2;
  if (type === "fog") impact = 1.3;
  if (type === "wind") impact = 1.1;
  if (type === "hot") impact = 1.2;
  if (type === "cold") impact = 1.1;
  if (type === "snow") impact = 1.4;
  if (type === "humid") impact = 1.15;

  if (type === "hot") temp += 5;
  if (type === "cold") temp -= 5;
  if (type === "snow") temp = Math.min(temp, 32);

  S.weather = {
    temp: Math.round(temp),
    temperature: Math.round(temp),
    type: type,
    impact: impact,
    humidity: type === "humid" ? 80 : (type === "rain" ? 70 : 50),
    windSpeed: type === "wind" ? 20 : (type === "breeze" ? 10 : 5)
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 2: OAKLAND NEIGHBORHOOD MICRO-CLIMATES
  // ═══════════════════════════════════════════════════════════════════════════

  S.neighborhoodWeather = {};
  
  for (const [nh, profile] of Object.entries(OAKLAND_WEATHER_PROFILES)) {
    let nhTemp = temp + profile.tempMod;
    let nhType = type;
    
    // Fog override for fog-prone neighborhoods
    if (type === 'clear' && rng() < profile.fogChance) {
      nhType = 'fog';
    }
    
    // Heat amplification in urban areas
    if (type === 'hot' && profile.tempMod > 0) {
      nhTemp += 2;
    }
    
    // Waterfront neighborhoods cooler in heat
    if (type === 'hot' && profile.tempMod < 0) {
      nhTemp -= 2;
    }
    
    S.neighborhoodWeather[nh] = {
      temp: Math.round(nhTemp),
      type: nhType,
      microClimate: profile.description
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 3: WEATHER TRACKING & STREAKS (Cycle-based)
  // ═══════════════════════════════════════════════════════════════════════════

  if (!S.weatherTracking) {
    S.weatherTracking = {
      currentType: type,
      currentStreak: 0,  // v3.3: Fixed - was 1, caused first run to become 2
      streakType: normalizeWeatherType_(type),
      temperature: temp,
      humidity: S.weather.humidity,
      windSpeed: S.weather.windSpeed,
      seasonFirsts: {},
      history: [],
      activeAlerts: [],
      consecutiveUncomfortableDays: 0,
      consecutiveComfortableDays: 0
    };
  }

  const tracking = S.weatherTracking;
  const normalizedType = normalizeWeatherType_(type);

  if (normalizedType === tracking.streakType) {
    tracking.currentStreak++;
  } else {
    tracking.streakType = normalizedType;
    tracking.currentStreak = 1;
  }

  tracking.currentType = type;
  tracking.temperature = temp;

  // Track by cycle, not arbitrary day
  tracking.history.push({ 
    type: type, 
    temperature: Math.round(temp), 
    cycle: currentCycle,
    cycleOfYear: cycleOfYear
  });
  if (tracking.history.length > 7) tracking.history.shift();

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 4: SPECIAL WEATHER EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  S.weatherEvents = [];

  if (season === "Winter" && type === "snow" && !tracking.seasonFirsts['Winter-snow']) {
    tracking.seasonFirsts['Winter-snow'] = currentCycle;
    S.weatherEvents.push({ type: 'first_snow', season: season, cycle: currentCycle });
  }

  if (season === "Spring" && temp >= 65 && !tracking.seasonFirsts['Spring-warm']) {
    tracking.seasonFirsts['Spring-warm'] = currentCycle;
    S.weatherEvents.push({ type: 'first_warm_day', season: season, cycle: currentCycle });
  }

  if (season === "Summer" && temp >= 85 && !tracking.seasonFirsts['Summer-hot']) {
    tracking.seasonFirsts['Summer-hot'] = currentCycle;
    S.weatherEvents.push({ type: 'summer_arrives', season: season, cycle: currentCycle });
  }

  if (season === "Fall" && temp <= 32 && !tracking.seasonFirsts['Fall-frost']) {
    tracking.seasonFirsts['Fall-frost'] = currentCycle;
    S.weatherEvents.push({ type: 'first_frost', season: season, cycle: currentCycle });
  }

  // Reset season firsts on season change
  if (S.previousSeason && S.previousSeason !== season) {
    tracking.seasonFirsts = {};
  }
  S.previousSeason = season;

  // Alert detection
  tracking.activeAlerts = [];
  
  if (normalizedType === 'hot' && tracking.currentStreak >= 7) {
    tracking.activeAlerts.push('heat_wave');
    if (tracking.currentStreak === 7) {
      S.weatherEvents.push({ type: 'heat_wave_declared', day: tracking.currentStreak, cycle: currentCycle });
    }
  }

  if (normalizedType === 'rain' && tracking.currentStreak >= 5) {
    tracking.activeAlerts.push('prolonged_rain');
  }

  if (normalizedType === 'cold' && tracking.currentStreak >= 5) {
    tracking.activeAlerts.push('cold_snap');
  }

  if (type === 'fog' && tracking.currentStreak >= 3) {
    tracking.activeAlerts.push('fog_advisory');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 5: COMFORT INDEX
  // ═══════════════════════════════════════════════════════════════════════════

  let comfort = 0.5;

  if (temp >= 65 && temp <= 75) comfort += 0.3;
  else if (temp >= 55 && temp <= 85) comfort += 0.1;
  else if (temp < 32 || temp > 95) comfort -= 0.3;
  else if (temp < 45 || temp > 88) comfort -= 0.15;

  const typeComfort = {
    'clear': 0.15, 'mild': 0.15, 'breeze': 0.1,
    'overcast': 0, 'cool': 0,  // v3.3: Fixed - was 'cloudy', but generator outputs 'overcast'
    'rain': -0.15, 'fog': -0.1, 'wind': -0.1,
    'hot': -0.1, 'humid': -0.15,
    'cold': -0.1, 'snow': -0.15
  };
  comfort += typeComfort[type] || 0;

  comfort = Math.round(Math.max(0, Math.min(1, comfort)) * 100) / 100;

  if (comfort < 0.35) {
    tracking.consecutiveUncomfortableDays++;
    tracking.consecutiveComfortableDays = 0;
  } else if (comfort > 0.65) {
    tracking.consecutiveComfortableDays++;
    tracking.consecutiveUncomfortableDays = 0;
  } else {
    tracking.consecutiveUncomfortableDays = Math.max(0, tracking.consecutiveUncomfortableDays - 1);
    tracking.consecutiveComfortableDays = Math.max(0, tracking.consecutiveComfortableDays - 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 6: MOOD EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  const mood = {
    primaryMood: 'neutral',
    moodIntensity: 0.3,
    energyLevel: 0.5,
    socialInclination: 0.5,
    irritabilityFactor: 0,
    nostalgiaFactor: 0,
    creativityBoost: 0,
    conflictPotential: 0,
    comfortIndex: comfort,
    perfectWeather: false
  };

  const baseMoods = {
    'clear': { mood: 'content', energy: 0.7, social: 0.7 },
    'mild': { mood: 'content', energy: 0.7, social: 0.7 },
    'breeze': { mood: 'energized', energy: 0.75, social: 0.7 },
    'rain': { mood: 'introspective', energy: 0.4, social: 0.3 },
    'fog': { mood: 'introspective', energy: 0.4, social: 0.3 },
    'wind': { mood: 'restless', energy: 0.5, social: 0.4 },
    'hot': { mood: 'restless', energy: 0.5, social: 0.5 },
    'humid': { mood: 'irritable', energy: 0.4, social: 0.4 },
    'cold': { mood: 'cozy', energy: 0.5, social: 0.4 },
    'cool': { mood: 'content', energy: 0.6, social: 0.6 },
    'snow': { mood: 'nostalgic', energy: 0.5, social: 0.5 }
  };

  const baseMood = baseMoods[type] || baseMoods['clear'];
  mood.primaryMood = baseMood.mood;
  mood.energyLevel = baseMood.energy;
  mood.socialInclination = baseMood.social;

  if (tracking.consecutiveUncomfortableDays >= 3) {
    mood.irritabilityFactor += 0.1 * Math.min(tracking.consecutiveUncomfortableDays, 7);
    mood.conflictPotential += 0.05 * tracking.consecutiveUncomfortableDays;
  }

  if (tracking.activeAlerts.includes('heat_wave')) {
    mood.irritabilityFactor += 0.3;
    mood.conflictPotential += 0.25;
    mood.energyLevel -= 0.2;
    mood.primaryMood = 'irritable';
  }

  if (tracking.activeAlerts.includes('prolonged_rain')) {
    mood.creativityBoost += 0.2;
    mood.socialInclination -= 0.2;
    mood.primaryMood = 'introspective';
  }

  if (tracking.activeAlerts.includes('fog_advisory')) {
    mood.socialInclination -= 0.1;
    mood.creativityBoost += 0.1;
  }

  if (S.weatherEvents.some(e => e.type === 'first_snow')) {
    mood.nostalgiaFactor = 0.8;
    mood.primaryMood = 'nostalgic';
  }

  if (S.weatherEvents.some(e => e.type === 'first_warm_day')) {
    mood.energyLevel = 0.9;
    mood.socialInclination = 0.85;
    mood.primaryMood = 'energized';
  }

  if (comfort > 0.75 && (type === 'clear' || type === 'mild' || type === 'breeze')) {
    mood.perfectWeather = true;
    mood.socialInclination = Math.min(1, mood.socialInclination + 0.2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY MOOD MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════

  if (holidayPriority === "major") {
    mood.energyLevel = Math.min(1, mood.energyLevel + 0.1);
    mood.socialInclination = Math.min(1, mood.socialInclination + 0.1);
  }

  if (holidayPriority === "cultural" || holidayPriority === "oakland") {
    mood.socialInclination = Math.min(1, mood.socialInclination + 0.15);
  }

  // Specific holiday mood effects
  if (holiday === "DiaDeMuertos") {
    mood.nostalgiaFactor = Math.min(1, mood.nostalgiaFactor + 0.4);
  }

  if (holiday === "Halloween" && type === "fog") {
    mood.creativityBoost = Math.min(1, mood.creativityBoost + 0.2);
  }

  if (isCreationDay) {
    mood.nostalgiaFactor = Math.min(1, mood.nostalgiaFactor + 0.3);
    mood.socialInclination = Math.min(1, mood.socialInclination + 0.1);
  }

  if (isFirstFriday) {
    mood.socialInclination = Math.min(1, mood.socialInclination + 0.2);
    mood.creativityBoost = Math.min(1, mood.creativityBoost + 0.15);
  }

  // Round all values
  mood.energyLevel = Math.round(Math.max(0, Math.min(1, mood.energyLevel)) * 100) / 100;
  mood.socialInclination = Math.round(Math.max(0, Math.min(1, mood.socialInclination)) * 100) / 100;
  mood.irritabilityFactor = Math.round(Math.max(0, Math.min(1, mood.irritabilityFactor)) * 100) / 100;
  mood.conflictPotential = Math.round(Math.max(0, Math.min(1, mood.conflictPotential)) * 100) / 100;
  mood.creativityBoost = Math.round(Math.max(0, Math.min(1, mood.creativityBoost)) * 100) / 100;
  mood.nostalgiaFactor = Math.round(Math.max(0, Math.min(1, mood.nostalgiaFactor)) * 100) / 100;

  S.weatherMood = mood;

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 7: EVENT POOLS FOR CITIZEN GENERATORS
  // ═══════════════════════════════════════════════════════════════════════════

  S.weatherEventPools = {
    base: getBaseWeatherEvents_(type),
    enhanced: [],
    special: [],
    holiday: [],
    neighborhood: {}
  };

  if (mood.irritabilityFactor > 0.3) {
    S.weatherEventPools.enhanced.push(
      "felt unusually short-tempered",
      "struggled to keep cool under pressure",
      "had a tense moment due to the weather"
    );
  }

  if (mood.creativityBoost > 0.2) {
    S.weatherEventPools.enhanced.push(
      "found inspiration in the gloomy weather",
      "spent time on a creative project",
      "had a moment of unexpected clarity"
    );
  }

  if (mood.nostalgiaFactor > 0.3) {
    S.weatherEventPools.enhanced.push(
      "was reminded of childhood memories",
      "felt a wave of nostalgia",
      "reached out to an old friend"
    );
  }

  if (mood.perfectWeather) {
    S.weatherEventPools.enhanced.push(
      "enjoyed an impromptu outdoor moment",
      "made plans to meet friends outside",
      "felt grateful for the gorgeous weather"
    );
  }

  // Special weather events
  if (S.weatherEvents.some(e => e.type === 'first_snow')) {
    S.weatherEventPools.special.push(
      "watched the first snowfall with wonder",
      "felt the magic of the year's first snow",
      "shared the first snow moment with someone"
    );
  }

  if (tracking.activeAlerts.includes('heat_wave')) {
    S.weatherEventPools.special.push(
      "struggled with the extended heat wave",
      "witnessed tempers flare in the heat",
      "sought any relief from the relentless heat"
    );
  }

  if (tracking.activeAlerts.includes('fog_advisory')) {
    S.weatherEventPools.special.push(
      "navigated carefully through the persistent fog",
      "felt the city muffled under fog",
      "noticed the eerie quiet of foggy streets"
    );
  }

  // Holiday-specific weather events
  if (holiday === "Independence" && type === "clear") {
    S.weatherEventPools.holiday.push(
      "enjoyed perfect weather for fireworks",
      "felt patriotic under the clear summer sky"
    );
  }

  if (holiday === "Halloween" && (type === "fog" || type === "wind")) {
    S.weatherEventPools.holiday.push(
      "felt the spooky atmosphere in the air",
      "noticed how the weather matched the holiday mood"
    );
  }

  if (holiday === "DiaDeMuertos" && type === "fog") {
    S.weatherEventPools.holiday.push(
      "felt the fog connect the worlds of living and dead",
      "noticed the atmospheric weather honoring ancestors"
    );
  }

  if (isFirstFriday && mood.perfectWeather) {
    S.weatherEventPools.holiday.push(
      "enjoyed perfect First Friday weather",
      "strolled through galleries in the pleasant evening"
    );
  }

  if (isCreationDay) {
    S.weatherEventPools.holiday.push(
      "felt the air carry something foundational",
      "noticed the weather felt significant somehow"
    );
  }

  // Neighborhood-specific weather events
  for (const [nh, nhWeather] of Object.entries(S.neighborhoodWeather)) {
    S.weatherEventPools.neighborhood[nh] = [];
    
    if (nhWeather.type === 'fog' && type !== 'fog') {
      S.weatherEventPools.neighborhood[nh].push(
        `noticed ${nh} shrouded in fog while other areas stayed clear`,
        `experienced the microclimates around ${nh}`
      );
    }
    
    if (nhWeather.temp >= temp + 3) {
      S.weatherEventPools.neighborhood[nh].push(
        `felt the extra heat in ${nh}'s urban corridor`,
        `noticed ${nh} running warmer than expected`
      );
    }
    
    if (nhWeather.temp <= temp - 3) {
      S.weatherEventPools.neighborhood[nh].push(
        `appreciated the cooler air in ${nh}`,
        `noticed the bay breeze keeping ${nh} comfortable`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PART 8: WEATHER SUMMARY FOR PACKET
  // ═══════════════════════════════════════════════════════════════════════════

  S.weatherSummary = {
    type: type,
    temp: Math.round(temp),
    impact: impact,
    comfort: comfort,
    mood: mood.primaryMood,
    energy: mood.energyLevel,
    social: mood.socialInclination,
    streak: tracking.currentStreak,
    streakType: tracking.streakType,
    alerts: tracking.activeAlerts,
    specialEvents: S.weatherEvents.map(e => e.type),
    perfectWeather: mood.perfectWeather,
    irritability: mood.irritabilityFactor,
    conflictPotential: mood.conflictPotential,
    nostalgiaFactor: mood.nostalgiaFactor,
    creativityBoost: mood.creativityBoost,
    cycleOfYear: cycleOfYear,
    holiday: holiday,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    foggyNeighborhoods: Object.entries(S.neighborhoodWeather)
      .filter(([nh, w]) => w.type === 'fog')
      .map(([nh]) => nh),
    hotspots: Object.entries(S.neighborhoodWeather)
      .filter(([nh, w]) => w.temp >= temp + 3)
      .map(([nh]) => nh),
    coolspots: Object.entries(S.neighborhoodWeather)
      .filter(([nh, w]) => w.temp <= temp - 3)
      .map(([nh]) => nh)
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function normalizeWeatherType_(type) {
  const groups = {
    'clear': 'clear', 'mild': 'clear', 'breeze': 'clear',
    'rain': 'rain',
    'fog': 'fog',
    'snow': 'snow',
    'hot': 'hot', 'humid': 'hot',
    'cold': 'cold', 'cool': 'cold',
    'wind': 'wind'
  };
  return groups[type] || type;
}

function getBaseWeatherEvents_(weatherType) {
  const pools = {
    'clear': ["enjoyed the clear skies", "took advantage of the nice weather"],
    'mild': ["appreciated the mild conditions", "felt comfortable in the pleasant weather"],
    'breeze': ["felt refreshed by the breeze", "enjoyed the gentle wind"],
    'rain': ["listened to the rain", "adjusted plans due to rain"],
    'fog': ["moved carefully in the fog", "noticed the foggy atmosphere"],
    'wind': ["braced against the wind", "noted the blustery conditions"],
    'hot': ["sought relief from the heat", "felt drained by the heat"],
    'humid': ["struggled with the humidity", "felt sticky in the humid air"],
    'cold': ["bundled up against the cold", "felt the winter chill"],
    'cool': ["enjoyed the cool air", "appreciated the crisp weather"],
    'snow': ["watched the snow falling", "felt the quiet of snowfall"]
  };
  return pools[weatherType] || pools['clear'];
}

function getWeatherEvent_(ctx, preferSpecial) {
  const pools = ctx.summary.weatherEventPools;
  if (!pools) return null;

  // v3.3: Resolve RNG from ctx
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

  if (preferSpecial && pools.special.length > 0 && rng() < 0.3) {
    return { text: pools.special[Math.floor(rng() * pools.special.length)], tag: 'Weather-Special' };
  }

  if (pools.holiday && pools.holiday.length > 0 && rng() < 0.35) {
    return { text: pools.holiday[Math.floor(rng() * pools.holiday.length)], tag: 'Weather-Holiday' };
  }

  if (pools.enhanced.length > 0 && rng() < 0.4) {
    return { text: pools.enhanced[Math.floor(rng() * pools.enhanced.length)], tag: 'Weather-Mood' };
  }

  if (pools.base.length > 0) {
    return { text: pools.base[Math.floor(rng() * pools.base.length)], tag: 'Weather' };
  }

  return null;
}

function getNeighborhoodWeatherEvent_(ctx, neighborhood) {
  const pools = ctx.summary.weatherEventPools?.neighborhood?.[neighborhood];
  if (!pools || pools.length === 0) return null;

  // v3.3: Resolve RNG from ctx
  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

  if (rng() < 0.25) {
    return {
      text: pools[Math.floor(rng() * pools.length)],
      tag: 'Weather-Local',
      neighborhood: neighborhood
    };
  }
  return null;
}

function getWeatherEventModifier_(ctx, eventCategory) {
  const mood = ctx.summary?.weatherMood;
  if (!mood) return 1.0;

  const modifiers = {
    'conflict': 1.0 + mood.conflictPotential,
    'social': mood.socialInclination + 0.5,
    'creative': 1.0 + mood.creativityBoost,
    'romantic': mood.nostalgiaFactor > 0.3 ? 1.3 : (mood.perfectWeather ? 1.2 : 1.0),
    'outdoor': mood.perfectWeather ? 1.5 : (mood.comfortIndex * 1.5),
    'indoor': mood.comfortIndex < 0.4 ? 1.3 : 1.0
  };

  return modifiers[eventCategory] || 1.0;
}

function hasWeatherCondition_(ctx, condition) {
  const tracking = ctx.summary?.weatherTracking;
  if (!tracking) return false;

  if (condition === 'heat_wave') return tracking.activeAlerts.includes('heat_wave');
  if (condition === 'prolonged_rain') return tracking.activeAlerts.includes('prolonged_rain');
  if (condition === 'cold_snap') return tracking.activeAlerts.includes('cold_snap');
  if (condition === 'fog_advisory') return tracking.activeAlerts.includes('fog_advisory');
  if (condition === 'first_snow') return ctx.summary.weatherEvents?.some(e => e.type === 'first_snow');
  if (condition === 'perfect_weather') return ctx.summary.weatherMood?.perfectWeather;
  if (condition === 'first_friday') return ctx.summary.isFirstFriday;
  if (condition === 'creation_day') return ctx.summary.isCreationDay;

  return tracking.currentType === condition;
}

function getNeighborhoodTemp_(ctx, neighborhood) {
  return ctx.summary?.neighborhoodWeather?.[neighborhood]?.temp || ctx.summary?.weather?.temp || 65;
}


/**
 * ============================================================================
 * REFERENCE: HOLIDAY WEATHER BIASES
 * ============================================================================
 * 
 * Holiday            | Weather Bias      | Reason
 * ─────────────────────────────────────────────────────────────────────────
 * NewYear/Eve        | cold, clear       | Crisp winter night
 * MLKDay             | cold, rain        | January weather
 * Easter             | mild, clear       | Spring hope
 * MemorialDay        | clear, mild       | Late spring
 * Juneteenth         | clear, hot        | Summer celebration
 * Independence       | clear, hot        | Fireworks weather
 * LaborDay           | hot, clear        | End of summer
 * Halloween          | fog, cool, wind   | Spooky atmosphere
 * Thanksgiving       | cold, rain, fog   | November
 * Holiday (Christmas)| cold, snow, rain  | Winter
 * CincoDeMayo        | mild, clear       | May celebration
 * DiaDeMuertos       | fog, cool         | Atmospheric remembrance
 * OpeningDay         | mild, clear       | Baseball weather
 * OaklandPride       | clear, mild       | Late May
 * ArtSoulFestival    | hot, clear        | August
 * CreationDay        | clear, mild       | Foundational clarity
 * FirstFriday        | clear, mild       | Art walk weather
 * 
 * ============================================================================
 */