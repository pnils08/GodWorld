/**
 * ============================================================================
 * applyWeatherModel_ v3.5 (ES5)
 * ============================================================================
 *
 * Multi-day weather fronts with Markov chain persistence.
 *
 * v3.5 Changes:
 * - Replaced seasonal list picking with multi-day fronts (Markov chain + persistence/decay)
 * - Monthly climate ranges (min/max -> mean + sd) for realistic temp distribution
 * - Added: humidity, windDirection, windSpeed, precipitationIntensity, precipitationType, visibility
 * - Added: S.weatherFrontTracking for front state persistence across cycles
 * - Added: storm_advisory alert
 * - Added: getTransitWeatherModifier_(ctx), getCrimeWeatherModifier_(ctx) adapters
 * - Added: getFrontMediaName_() for narrative output
 * - All existing schema keys preserved (additive, non-breaking)
 *
 * v3.4: ES5 conversion
 * v3.3: Seeded RNG, streak fix, typeComfort fix
 * v3.2: Full holiday calendar integration
 *
 * ============================================================================
 */

// Oakland micro-climate profiles (unchanged)
var OAKLAND_WEATHER_PROFILES = {
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

// Fallback mulberry32_ if not defined elsewhere
if (typeof mulberry32_ !== 'function') {
  function mulberry32_(a) {
    return function () {
      var t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}

/* ───────────────────────────────────────────────────────────────────────────
 * Climate ranges (Oakland) per month: min/max F.
 * Used to derive mean/sd and sample temperature distribution.
 * ─────────────────────────────────────────────────────────────────────────── */
var OAKLAND_MONTHLY_CLIMATE = {
  1: { min: 46, max: 58 },
  2: { min: 47, max: 61 },
  3: { min: 49, max: 63 },
  4: { min: 51, max: 66 },
  5: { min: 54, max: 69 },
  6: { min: 57, max: 72 },
  7: { min: 58, max: 74 },
  8: { min: 59, max: 75 },
  9: { min: 58, max: 76 },
  10: { min: 55, max: 72 },
  11: { min: 50, max: 64 },
  12: { min: 46, max: 58 }
};

/* ───────────────────────────────────────────────────────────────────────────
 * Weather front states and Markov transitions (baseline).
 * Seasonal tweaks are applied at runtime.
 * ─────────────────────────────────────────────────────────────────────────── */
var WEATHER_FRONTS = ['CLEAR', 'OVERCAST', 'RAIN', 'STORM', 'MARINE', 'WINDY', 'HEAT', 'COLD'];

var WEATHER_FRONT_TRANSITIONS = {
  'CLEAR':    { 'CLEAR': 0.50, 'OVERCAST': 0.18, 'MARINE': 0.12, 'WINDY': 0.10, 'RAIN': 0.07, 'HEAT': 0.03, 'COLD': 0.00, 'STORM': 0.00 },
  'OVERCAST': { 'CLEAR': 0.22, 'OVERCAST': 0.38, 'MARINE': 0.14, 'RAIN': 0.16, 'WINDY': 0.06, 'COLD': 0.04, 'HEAT': 0.00, 'STORM': 0.00 },
  'RAIN':     { 'OVERCAST': 0.36, 'RAIN': 0.30, 'CLEAR': 0.18, 'STORM': 0.08, 'WINDY': 0.06, 'MARINE': 0.02, 'COLD': 0.00, 'HEAT': 0.00 },
  'STORM':    { 'RAIN': 0.44, 'OVERCAST': 0.28, 'CLEAR': 0.14, 'WINDY': 0.10, 'MARINE': 0.04, 'HEAT': 0.00, 'COLD': 0.00, 'STORM': 0.00 },
  'MARINE':   { 'MARINE': 0.42, 'OVERCAST': 0.26, 'CLEAR': 0.18, 'WINDY': 0.08, 'RAIN': 0.06, 'STORM': 0.00, 'HEAT': 0.00, 'COLD': 0.00 },
  'WINDY':    { 'CLEAR': 0.28, 'OVERCAST': 0.22, 'WINDY': 0.30, 'MARINE': 0.10, 'RAIN': 0.08, 'STORM': 0.02, 'HEAT': 0.00, 'COLD': 0.00 },
  'HEAT':     { 'HEAT': 0.44, 'CLEAR': 0.24, 'MARINE': 0.12, 'OVERCAST': 0.10, 'WINDY': 0.08, 'RAIN': 0.02, 'STORM': 0.00, 'COLD': 0.00 },
  'COLD':     { 'COLD': 0.42, 'OVERCAST': 0.24, 'RAIN': 0.14, 'CLEAR': 0.12, 'WINDY': 0.06, 'STORM': 0.02, 'MARINE': 0.00, 'HEAT': 0.00 }
};

/* ───────────────────────────────────────────────────────────────────────────
 * Front media names for narrative output
 * ─────────────────────────────────────────────────────────────────────────── */
var FRONT_MEDIA_NAMES = {
  'CLEAR': {
    weak: ['clear skies', 'fair weather', 'pleasant conditions'],
    moderate: ['high pressure system', 'sunny spell', 'dry pattern'],
    strong: ['dominant high pressure ridge', 'extended fair weather', 'persistent clear skies']
  },
  'OVERCAST': {
    weak: ['light cloud cover', 'gray skies', 'overcast conditions'],
    moderate: ['cloud deck', 'stratus layer', 'gray blanket'],
    strong: ['persistent overcast', 'stubborn cloud cover', 'extended gray spell']
  },
  'RAIN': {
    weak: ['light rain', 'passing showers', 'drizzle'],
    moderate: ['steady rain', 'rain band', 'Pacific moisture'],
    strong: ['atmospheric river', 'heavy rain system', 'soaking rain']
  },
  'STORM': {
    weak: ['storm system', 'unsettled weather', 'passing front'],
    moderate: ['Pacific storm', 'squall line', 'storm front'],
    strong: ['powerful Pacific storm', 'major storm system', 'bomb cyclone']
  },
  'MARINE': {
    weak: ['marine layer', 'coastal fog', 'low clouds'],
    moderate: ['marine layer return', 'bay fog', 'June gloom'],
    strong: ['persistent marine layer', 'deep fog bank', 'stubborn coastal stratus']
  },
  'WINDY': {
    weak: ['breezy conditions', 'gusty winds', 'wind event'],
    moderate: ['wind advisory', 'Diablo winds', 'offshore flow'],
    strong: ['high wind event', 'strong Diablo winds', 'dangerous wind conditions']
  },
  'HEAT': {
    weak: ['warm spell', 'above-normal temps', 'warming trend'],
    moderate: ['heat event', 'heat advisory', 'hot pattern'],
    strong: ['heat wave', 'excessive heat', 'dangerous heat dome']
  },
  'COLD': {
    weak: ['cool spell', 'below-normal temps', 'cooling trend'],
    moderate: ['cold snap', 'cold front', 'chilly pattern'],
    strong: ['arctic outbreak', 'freeze warning', 'deep cold']
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENGINE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

function applyWeatherModel_(ctx) {
  if (!ctx) return;
  if (!ctx.summary) ctx.summary = {};
  if (!ctx.config) ctx.config = {};

  var S = ctx.summary;

  // Seeded RNG support
  var rng = (typeof ctx.rng === 'function') ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === 'number')
      ? mulberry32_(ctx.config.rngSeed >>> 0)
      : Math.random;

  function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }

  // Box-Muller normal (stable; single-call cached spare)
  var _normSpare = null;
  function randNorm_() {
    if (_normSpare !== null) {
      var t = _normSpare;
      _normSpare = null;
      return t;
    }
    var u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    var mag = Math.sqrt(-2.0 * Math.log(u));
    var z0 = mag * Math.cos(2.0 * Math.PI * v);
    var z1 = mag * Math.sin(2.0 * Math.PI * v);
    _normSpare = z1;
    return z0;
  }

  function pickWeightedKey_(obj) {
    var total = 0;
    var k;
    for (k in obj) if (obj.hasOwnProperty(k)) total += obj[k];
    if (total <= 0) return null;

    var roll = rng() * total;
    var acc = 0;
    for (k in obj) {
      if (!obj.hasOwnProperty(k)) continue;
      acc += obj[k];
      if (roll <= acc) return k;
    }
    return null;
  }

  function toWindDir_(deg) {
    var dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    var idx = Math.round((deg % 360) / 45) % 8;
    return dirs[idx];
  }

  // Inputs
  var month = S.simMonth;
  var season = S.season || 'Spring';
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;
  var cycleOfYear = S.cycleOfYear || 1;
  var currentCycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;

  /* ─────────────────────────────────────────────────────────────────────────
   * PART 0: Front tracking init
   * ───────────────────────────────────────────────────────────────────────── */
  if (!S.weatherFrontTracking) {
    var initFront = 'CLEAR';
    if (season === 'Winter') initFront = (rng() < 0.45) ? 'OVERCAST' : 'RAIN';
    if (season === 'Spring') initFront = (rng() < 0.50) ? 'OVERCAST' : 'CLEAR';
    if (season === 'Summer') initFront = (rng() < 0.35) ? 'MARINE' : 'CLEAR';
    if (season === 'Fall') initFront = (rng() < 0.45) ? 'OVERCAST' : 'CLEAR';

    S.weatherFrontTracking = {
      frontState: initFront,
      frontStreak: 1,
      frontStrength: 0.55,
      lastTransitionCycle: currentCycle,
      history: []
    };
  }

  var frontT = S.weatherFrontTracking;

  /* ─────────────────────────────────────────────────────────────────────────
   * PART 1: Choose next front (Markov + persistence + seasonal + holiday nudges)
   * ───────────────────────────────────────────────────────────────────────── */
  function applySeasonalTweaks_(baseTrans, seasonName) {
    var t = {};
    var k;
    for (k in baseTrans) if (baseTrans.hasOwnProperty(k)) t[k] = baseTrans[k];

    if (seasonName === 'Winter') {
      t.RAIN = (t.RAIN || 0) + 0.06;
      t.OVERCAST = (t.OVERCAST || 0) + 0.05;
      t.COLD = (t.COLD || 0) + 0.05;
      t.HEAT = (t.HEAT || 0) * 0.2;
    } else if (seasonName === 'Spring') {
      t.OVERCAST = (t.OVERCAST || 0) + 0.04;
      t.RAIN = (t.RAIN || 0) + 0.03;
      t.CLEAR = (t.CLEAR || 0) + 0.02;
    } else if (seasonName === 'Summer') {
      t.CLEAR = (t.CLEAR || 0) + 0.06;
      t.MARINE = (t.MARINE || 0) + 0.05;
      t.HEAT = (t.HEAT || 0) + 0.04;
      t.RAIN = (t.RAIN || 0) * 0.15;
      t.COLD = (t.COLD || 0) * 0.2;
    } else if (seasonName === 'Fall') {
      t.OVERCAST = (t.OVERCAST || 0) + 0.05;
      t.WINDY = (t.WINDY || 0) + 0.03;
      t.RAIN = (t.RAIN || 0) + 0.03;
      t.HEAT = (t.HEAT || 0) * 0.4;
    }

    var sum = 0;
    for (k in t) if (t.hasOwnProperty(k)) sum += t[k];
    if (sum <= 0) return baseTrans;
    for (k in t) if (t.hasOwnProperty(k)) t[k] = t[k] / sum;
    return t;
  }

  function applyHolidayTweaks_(trans, holidayName, isFF, isCD) {
    var t = {};
    var k;
    for (k in trans) if (trans.hasOwnProperty(k)) t[k] = trans[k];

    if (holidayName === 'Independence') {
      t.CLEAR = (t.CLEAR || 0) + 0.05;
      t.MARINE = (t.MARINE || 0) * 0.8;
      t.RAIN = (t.RAIN || 0) * 0.3;
    }
    if (holidayName === 'Halloween') {
      t.MARINE = (t.MARINE || 0) + 0.04;
      t.OVERCAST = (t.OVERCAST || 0) + 0.02;
    }
    if (holidayName === 'Thanksgiving' || holidayName === 'Holiday') {
      t.OVERCAST = (t.OVERCAST || 0) + 0.04;
      t.RAIN = (t.RAIN || 0) + 0.03;
      t.CLEAR = (t.CLEAR || 0) * 0.9;
    }
    if (holidayName === 'Juneteenth' || holidayName === 'PrideMonth' || holidayName === 'OaklandPride') {
      t.CLEAR = (t.CLEAR || 0) + 0.03;
      t.MARINE = (t.MARINE || 0) + 0.02;
    }

    if (isFF) t.CLEAR = (t.CLEAR || 0) + 0.02;
    if (isCD) {
      t.CLEAR = (t.CLEAR || 0) + 0.02;
      t.OVERCAST = (t.OVERCAST || 0) * 0.95;
    }

    var sum = 0;
    for (k in t) if (t.hasOwnProperty(k)) sum += t[k];
    if (sum <= 0) return trans;
    for (k in t) if (t.hasOwnProperty(k)) t[k] = t[k] / sum;
    return t;
  }

  function nextFront_(currentFront, seasonName, holidayName, isFF, isCD, tracking) {
    var base = WEATHER_FRONT_TRANSITIONS[currentFront] || WEATHER_FRONT_TRANSITIONS.CLEAR;
    var trans = applySeasonalTweaks_(base, seasonName);
    trans = applyHolidayTweaks_(trans, holidayName, isFF, isCD);

    var strength = clamp(Number(tracking.frontStrength || 0.55), 0, 1);
    var streak = Math.max(1, Number(tracking.frontStreak || 1));

    var persist = 0.35 + (strength * 0.45);
    var decay = clamp((streak - 2) * 0.04, 0, 0.25);
    persist = clamp(persist - decay, 0.15, 0.85);

    if (rng() < persist) {
      return { front: currentFront, transitioned: false };
    }

    var picked = pickWeightedKey_(trans) || currentFront;
    return { front: picked, transitioned: picked !== currentFront };
  }

  var nf = nextFront_(frontT.frontState, season, holiday, isFirstFriday, isCreationDay, frontT);
  var frontState = nf.front;

  if (frontState === frontT.frontState) {
    frontT.frontStreak = (frontT.frontStreak || 0) + 1;
  } else {
    frontT.frontState = frontState;
    frontT.frontStreak = 1;
    frontT.lastTransitionCycle = currentCycle;
  }

  var baseStrength = clamp(Number(frontT.frontStrength || 0.55) + (rng() * 0.10 - 0.05), 0.25, 0.95);
  if (frontState === 'STORM') baseStrength = clamp(baseStrength + 0.12, 0.30, 1);
  if (frontState === 'HEAT') baseStrength = clamp(baseStrength + 0.08, 0.30, 1);
  if (frontState === 'COLD') baseStrength = clamp(baseStrength + 0.06, 0.30, 1);
  frontT.frontStrength = baseStrength;

  frontT.history.push({
    cycle: currentCycle,
    front: frontState,
    strength: Math.round(frontT.frontStrength * 100) / 100
  });
  if (frontT.history.length > 10) frontT.history.shift();

  /* ─────────────────────────────────────────────────────────────────────────
   * PART 2: Temperature from climate range + front anomaly
   * ───────────────────────────────────────────────────────────────────────── */
  var climate = OAKLAND_MONTHLY_CLIMATE[month] || { min: 55, max: 72 };
  var mean = (climate.min + climate.max) / 2;
  var sd = Math.max(1, (climate.max - climate.min) / 6);

  var temp = mean + randNorm_() * sd;
  temp = clamp(temp, climate.min - 6, climate.max + 6);

  function applyFrontTempAnomaly_(t, front, strength, seasonName) {
    var s = clamp(strength, 0, 1);
    var delta = 0;

    if (front === 'HEAT') delta = 6 + (s * 10);
    else if (front === 'COLD') delta = -(4 + (s * 8));
    else if (front === 'STORM') delta = -(2 + (s * 4));
    else if (front === 'RAIN') delta = -(1 + (s * 3));
    else if (front === 'MARINE') delta = -(2 + (s * 5));
    else if (front === 'WINDY') delta = -(0.5 + (s * 2));

    if (seasonName === 'Winter' && front === 'HEAT') delta = delta * 0.35;
    if (seasonName === 'Summer' && front === 'COLD') delta = delta * 0.35;

    return t + delta;
  }

  temp = applyFrontTempAnomaly_(temp, frontState, frontT.frontStrength, season);
  temp = temp + (rng() * 2 - 1);

  /* ─────────────────────────────────────────────────────────────────────────
   * PART 3: Map front -> weather.type + humidity/wind/precip
   * ───────────────────────────────────────────────────────────────────────── */
  function pickFrom_(arr) { return arr[Math.floor(rng() * arr.length)]; }

  function typeFromFront_(front, seasonName) {
    if (front === 'CLEAR') {
      return pickFrom_((seasonName === 'Summer') ? ['clear', 'breeze', 'clear'] : ['clear', 'mild', 'breeze']);
    }
    if (front === 'OVERCAST') return pickFrom_(['overcast', 'cool', 'overcast']);
    if (front === 'MARINE') return pickFrom_(['fog', 'overcast', 'fog']);
    if (front === 'WINDY') return pickFrom_(['wind', 'breeze', 'wind']);
    if (front === 'RAIN') return 'rain';
    if (front === 'STORM') return 'rain';
    if (front === 'HEAT') return pickFrom_(['hot', 'hot', 'humid']);
    if (front === 'COLD') return pickFrom_((seasonName === 'Winter') ? ['cold', 'cold', 'rain'] : ['cold', 'cool', 'wind']);
    return 'clear';
  }

  function precipitationFromFront_(front, strength, seasonName, temperature) {
    var s = clamp(strength, 0, 1);
    if (front === 'STORM') return { type: 'rain', intensity: clamp(0.65 + s * 0.35, 0, 1) };
    if (front === 'RAIN') return { type: 'rain', intensity: clamp(0.30 + s * 0.40, 0, 1) };

    if (front === 'COLD' && seasonName === 'Winter' && temperature <= 34 && rng() < (0.12 + s * 0.10)) {
      return { type: 'snow', intensity: clamp(0.25 + s * 0.35, 0, 1) };
    }

    return { type: 'none', intensity: 0 };
  }

  function humidityFrom_(front, precip, seasonName) {
    var base = 50;
    if (seasonName === 'Winter') base = 55;
    if (seasonName === 'Summer') base = 48;

    if (front === 'MARINE') base += 20;
    if (front === 'OVERCAST') base += 10;
    if (front === 'RAIN' || front === 'STORM') base += 25;
    if (front === 'HEAT') base += 5;
    if (front === 'COLD') base += 8;

    base += Math.round((rng() * 10) - 5);
    if (precip.intensity > 0) base += Math.round(precip.intensity * 10);

    return clamp(base, 15, 98);
  }

  function windFrom_(front, strength, seasonName) {
    var s = clamp(strength, 0, 1);
    var speed = 5;

    if (front === 'WINDY') speed = 14 + Math.round(s * 18);
    else if (front === 'STORM') speed = 16 + Math.round(s * 22);
    else if (front === 'RAIN') speed = 10 + Math.round(s * 12);
    else if (front === 'MARINE') speed = 6 + Math.round(s * 8);
    else if (front === 'HEAT') speed = 4 + Math.round(s * 6);
    else if (front === 'COLD') speed = 8 + Math.round(s * 12);
    else if (front === 'OVERCAST') speed = 6 + Math.round(s * 8);
    else speed = 5 + Math.round(s * 8);

    if (seasonName === 'Summer' && (front === 'CLEAR' || front === 'MARINE')) speed += 2;

    speed = clamp(speed + Math.round((rng() * 4) - 2), 0, 45);

    var baseDeg = 290;
    if (front === 'STORM' || front === 'RAIN') baseDeg = 240;
    if (front === 'COLD') baseDeg = 10;
    if (front === 'HEAT') baseDeg = 320;
    var deg = (baseDeg + Math.round((rng() * 90) - 45) + 360) % 360;

    return { speed: speed, directionDeg: deg, direction: toWindDir_(deg) };
  }

  var type = typeFromFront_(frontState, season);
  var precip = precipitationFromFront_(frontState, frontT.frontStrength, season, temp);

  if (precip.type === 'snow') type = 'snow';

  var humidity = humidityFrom_(frontState, precip, season);
  var wind = windFrom_(frontState, frontT.frontStrength, season);

  if (type === 'humid') humidity = clamp(humidity + 18, 40, 98);

  var visibility = 10;
  if (type === 'fog') visibility = clamp(2 + Math.round((1 - frontT.frontStrength) * 4), 1, 6);
  if (frontState === 'STORM') visibility = clamp(2, 1, 4);
  if (type === 'rain') visibility = clamp(4 + Math.round((1 - precip.intensity) * 4), 2, 10);

  /* ─────────────────────────────────────────────────────────────────────────
   * PART 4: Impact (keep existing semantics, extend with intensity)
   * ───────────────────────────────────────────────────────────────────────── */
  function baseImpact_(t) {
    var imp = 1;
    if (t === 'rain') imp = 1.2;
    if (t === 'fog') imp = 1.3;
    if (t === 'wind') imp = 1.1;
    if (t === 'hot') imp = 1.2;
    if (t === 'cold') imp = 1.1;
    if (t === 'snow') imp = 1.4;
    if (t === 'humid') imp = 1.15;
    if (t === 'overcast') imp = 1.05;
    if (t === 'breeze') imp = 1.02;
    if (t === 'mild') imp = 1.0;
    if (t === 'cool') imp = 1.03;
    return imp;
  }

  var impact = baseImpact_(type);

  if (precip.intensity > 0) impact += (precip.intensity * 0.25);
  if (wind.speed >= 25) impact += 0.10;
  if (wind.speed >= 35) impact += 0.10;

  if (temp >= 90) impact += 0.15;
  if (temp <= 35) impact += 0.10;

  impact = Math.round(impact * 100) / 100;

  if (type === 'hot') temp += 2;
  if (type === 'cold') temp -= 2;
  if (type === 'snow') temp = Math.min(temp, 32);

  /* ─────────────────────────────────────────────────────────────────────────
   * PART 5: Write S.weather (preserve existing keys, only add)
   * ───────────────────────────────────────────────────────────────────────── */
  S.weather = {
    // Existing keys (unchanged)
    temp: Math.round(temp),
    temperature: Math.round(temp),
    type: type,
    impact: impact,
    humidity: humidity,
    windSpeed: wind.speed,

    // Additive keys
    windDirection: wind.direction,
    windDirectionDeg: wind.directionDeg,
    precipitationIntensity: Math.round(precip.intensity * 100) / 100,
    precipitationType: precip.type,
    frontState: frontState,
    frontStrength: Math.round(frontT.frontStrength * 100) / 100,
    visibility: visibility
  };

  /* ─────────────────────────────────────────────────────────────────────────
   * PART 6: Neighborhood microclimates (preserve structure; add fields)
   * ───────────────────────────────────────────────────────────────────────── */
  S.neighborhoodWeather = {};
  var neighborhoodKeys = Object.keys(OAKLAND_WEATHER_PROFILES);

  for (var nhIdx = 0; nhIdx < neighborhoodKeys.length; nhIdx++) {
    var nh = neighborhoodKeys[nhIdx];
    var profile = OAKLAND_WEATHER_PROFILES[nh];

    var nhTemp = temp + profile.tempMod;
    var nhType = type;

    var fogChance = profile.fogChance;
    if (frontState === 'MARINE') fogChance = clamp(fogChance + 0.18 * frontT.frontStrength, 0, 0.95);
    if (frontState === 'STORM') fogChance = clamp(fogChance + 0.05, 0, 0.95);

    if (type !== 'fog' && rng() < fogChance && (frontState === 'MARINE' || frontState === 'OVERCAST' || frontState === 'RAIN')) {
      nhType = 'fog';
    }

    if ((frontState === 'HEAT' || type === 'hot') && profile.tempMod > 0) nhTemp += 2;
    if ((frontState === 'HEAT' || type === 'hot') && profile.tempMod < 0) nhTemp -= 2;

    if ((frontState === 'STORM' || frontState === 'RAIN') && profile.description.indexOf('waterfront') !== -1) nhTemp -= 1;

    S.neighborhoodWeather[nh] = {
      temp: Math.round(nhTemp),
      type: nhType,
      microClimate: profile.description,

      // Additive fields
      humidity: humidity,
      windSpeed: wind.speed,
      windDirection: wind.direction,
      precipitationIntensity: Math.round(precip.intensity * 100) / 100
    };
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * PART 7: Weather tracking & streaks (keep old behavior; add fields)
   * ───────────────────────────────────────────────────────────────────────── */
  if (!S.weatherTracking) {
    S.weatherTracking = {
      currentType: type,
      currentStreak: 0,
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

  var tracking = S.weatherTracking;
  var normalizedType = normalizeWeatherType_(type);

  if (normalizedType === tracking.streakType) tracking.currentStreak++;
  else {
    tracking.streakType = normalizedType;
    tracking.currentStreak = 1;
  }

  tracking.currentType = type;
  tracking.temperature = temp;
  tracking.humidity = humidity;
  tracking.windSpeed = wind.speed;

  // Additive: front context on tracking
  tracking.frontState = frontState;
  tracking.frontStrength = Math.round(frontT.frontStrength * 100) / 100;
  tracking.precipitationIntensity = Math.round(precip.intensity * 100) / 100;
  tracking.windDirection = wind.direction;

  tracking.history.push({
    type: type,
    temperature: Math.round(temp),
    cycle: currentCycle,
    cycleOfYear: cycleOfYear,

    // Additive history fields
    frontState: frontState,
    frontStrength: Math.round(frontT.frontStrength * 100) / 100,
    humidity: humidity,
    windSpeed: wind.speed,
    windDirection: wind.direction,
    precipitationType: precip.type,
    precipitationIntensity: Math.round(precip.intensity * 100) / 100
  });
  if (tracking.history.length > 7) tracking.history.shift();

  /* ─────────────────────────────────────────────────────────────────────────
   * PART 8: Special weather events + alerts (extend for fronts/intensity)
   * ───────────────────────────────────────────────────────────────────────── */
  S.weatherEvents = [];

  if (season === 'Winter' && type === 'snow' && !tracking.seasonFirsts['Winter-snow']) {
    tracking.seasonFirsts['Winter-snow'] = currentCycle;
    S.weatherEvents.push({ type: 'first_snow', season: season, cycle: currentCycle });
  }
  if (season === 'Spring' && temp >= 65 && !tracking.seasonFirsts['Spring-warm']) {
    tracking.seasonFirsts['Spring-warm'] = currentCycle;
    S.weatherEvents.push({ type: 'first_warm_day', season: season, cycle: currentCycle });
  }
  if (season === 'Summer' && temp >= 85 && !tracking.seasonFirsts['Summer-hot']) {
    tracking.seasonFirsts['Summer-hot'] = currentCycle;
    S.weatherEvents.push({ type: 'summer_arrives', season: season, cycle: currentCycle });
  }
  if (season === 'Fall' && temp <= 32 && !tracking.seasonFirsts['Fall-frost']) {
    tracking.seasonFirsts['Fall-frost'] = currentCycle;
    S.weatherEvents.push({ type: 'first_frost', season: season, cycle: currentCycle });
  }

  if (S.previousSeason && S.previousSeason !== season) tracking.seasonFirsts = {};
  S.previousSeason = season;

  tracking.activeAlerts = [];

  // Heat wave: sustained HEAT front or hot type
  if ((frontState === 'HEAT' || normalizedType === 'hot') && tracking.currentStreak >= 6) {
    tracking.activeAlerts.push('heat_wave');
    if (tracking.currentStreak === 6) {
      S.weatherEvents.push({ type: 'heat_wave_declared', day: tracking.currentStreak, cycle: currentCycle });
    }
  }

  // Prolonged rain: sustained precip with meaningful intensity
  if (precip.intensity >= 0.35 && (frontState === 'RAIN' || frontState === 'STORM') && tracking.currentStreak >= 4) {
    tracking.activeAlerts.push('prolonged_rain');
  }

  // Storm advisory: intense precip + high wind
  if (frontState === 'STORM' && precip.intensity >= 0.7 && wind.speed >= 28) {
    tracking.activeAlerts.push('storm_advisory');
  }

  // Cold snap
  if ((frontState === 'COLD' || normalizedType === 'cold') && tracking.currentStreak >= 5) {
    tracking.activeAlerts.push('cold_snap');
  }

  // Fog advisory (marine layer persistence)
  if ((type === 'fog' || frontState === 'MARINE') && tracking.currentStreak >= 3) {
    tracking.activeAlerts.push('fog_advisory');
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * PART 9: Comfort index (extend with humidity/wind/precip intensity)
   * ───────────────────────────────────────────────────────────────────────── */
  var comfort = 0.5;

  if (temp >= 65 && temp <= 75) comfort += 0.3;
  else if (temp >= 55 && temp <= 85) comfort += 0.1;
  else if (temp < 32 || temp > 95) comfort -= 0.3;
  else if (temp < 45 || temp > 88) comfort -= 0.15;

  // Humidity penalty when high + warm
  if (humidity >= 75 && temp >= 72) comfort -= 0.10;
  if (humidity >= 85 && temp >= 72) comfort -= 0.10;

  // Wind penalty when strong
  if (wind.speed >= 25) comfort -= 0.08;
  if (wind.speed >= 35) comfort -= 0.10;

  // Precip penalty scales with intensity
  if (precip.intensity > 0) comfort -= (0.08 + precip.intensity * 0.12);

  var typeComfort = {
    'clear': 0.15, 'mild': 0.15, 'breeze': 0.1,
    'overcast': 0, 'cool': 0,
    'rain': -0.15, 'fog': -0.1, 'wind': -0.1,
    'hot': -0.1, 'humid': -0.15,
    'cold': -0.1, 'snow': -0.15
  };
  comfort += typeComfort[type] || 0;

  comfort = Math.round(clamp(comfort, 0, 1) * 100) / 100;

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

  /* ─────────────────────────────────────────────────────────────────────────
   * PART 10: Mood effects (extend with intensity)
   * ───────────────────────────────────────────────────────────────────────── */
  var mood = {
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

  var baseMoods = {
    'clear': { mood: 'content', energy: 0.7, social: 0.7 },
    'mild': { mood: 'content', energy: 0.7, social: 0.7 },
    'breeze': { mood: 'energized', energy: 0.75, social: 0.7 },
    'overcast': { mood: 'neutral', energy: 0.55, social: 0.55 },
    'rain': { mood: 'introspective', energy: 0.4, social: 0.3 },
    'fog': { mood: 'introspective', energy: 0.4, social: 0.3 },
    'wind': { mood: 'restless', energy: 0.5, social: 0.4 },
    'hot': { mood: 'restless', energy: 0.5, social: 0.5 },
    'humid': { mood: 'irritable', energy: 0.4, social: 0.4 },
    'cold': { mood: 'cozy', energy: 0.5, social: 0.4 },
    'cool': { mood: 'content', energy: 0.6, social: 0.6 },
    'snow': { mood: 'nostalgic', energy: 0.5, social: 0.5 }
  };

  var baseMood = baseMoods[type] || baseMoods.clear;
  mood.primaryMood = baseMood.mood;
  mood.energyLevel = baseMood.energy;
  mood.socialInclination = baseMood.social;

  // Intensity: more precip + more wind -> more friction
  if (precip.intensity >= 0.5) {
    mood.socialInclination -= 0.10;
    mood.creativityBoost += 0.10;
  }
  if (wind.speed >= 30) {
    mood.irritabilityFactor += 0.08;
    mood.conflictPotential += 0.06;
  }

  if (tracking.consecutiveUncomfortableDays >= 3) {
    mood.irritabilityFactor += 0.1 * Math.min(tracking.consecutiveUncomfortableDays, 7);
    mood.conflictPotential += 0.05 * tracking.consecutiveUncomfortableDays;
  }

  if (tracking.activeAlerts.indexOf('heat_wave') !== -1) {
    mood.irritabilityFactor += 0.3;
    mood.conflictPotential += 0.25;
    mood.energyLevel -= 0.2;
    mood.primaryMood = 'irritable';
  }

  if (tracking.activeAlerts.indexOf('prolonged_rain') !== -1) {
    mood.creativityBoost += 0.2;
    mood.socialInclination -= 0.2;
    mood.primaryMood = 'introspective';
  }

  if (tracking.activeAlerts.indexOf('fog_advisory') !== -1) {
    mood.socialInclination -= 0.1;
    mood.creativityBoost += 0.1;
  }

  // First snow check
  var hasFirstSnow = false;
  for (var fsIdx = 0; fsIdx < S.weatherEvents.length; fsIdx++) {
    if (S.weatherEvents[fsIdx].type === 'first_snow') { hasFirstSnow = true; break; }
  }
  if (hasFirstSnow) {
    mood.nostalgiaFactor = 0.8;
    mood.primaryMood = 'nostalgic';
  }

  // First warm day check
  var hasFirstWarmDay = false;
  for (var fwIdx = 0; fwIdx < S.weatherEvents.length; fwIdx++) {
    if (S.weatherEvents[fwIdx].type === 'first_warm_day') { hasFirstWarmDay = true; break; }
  }
  if (hasFirstWarmDay) {
    mood.energyLevel = 0.9;
    mood.socialInclination = 0.85;
    mood.primaryMood = 'energized';
  }

  if (comfort > 0.75 && (type === 'clear' || type === 'mild' || type === 'breeze')) {
    mood.perfectWeather = true;
    mood.socialInclination = Math.min(1, mood.socialInclination + 0.2);
  }

  // Holiday mood modifiers (existing behavior preserved)
  if (holidayPriority === 'major') {
    mood.energyLevel = Math.min(1, mood.energyLevel + 0.1);
    mood.socialInclination = Math.min(1, mood.socialInclination + 0.1);
  }
  if (holidayPriority === 'cultural' || holidayPriority === 'oakland') {
    mood.socialInclination = Math.min(1, mood.socialInclination + 0.15);
  }
  if (holiday === 'DiaDeMuertos') mood.nostalgiaFactor = Math.min(1, mood.nostalgiaFactor + 0.4);
  if (holiday === 'Halloween' && type === 'fog') mood.creativityBoost = Math.min(1, mood.creativityBoost + 0.2);
  if (isCreationDay) {
    mood.nostalgiaFactor = Math.min(1, mood.nostalgiaFactor + 0.3);
    mood.socialInclination = Math.min(1, mood.socialInclination + 0.1);
  }
  if (isFirstFriday) {
    mood.socialInclination = Math.min(1, mood.socialInclination + 0.2);
    mood.creativityBoost = Math.min(1, mood.creativityBoost + 0.15);
  }

  // Round values
  function round01_(v) { return Math.round(clamp(v, 0, 1) * 100) / 100; }
  mood.energyLevel = round01_(mood.energyLevel);
  mood.socialInclination = round01_(mood.socialInclination);
  mood.irritabilityFactor = round01_(mood.irritabilityFactor);
  mood.conflictPotential = round01_(mood.conflictPotential);
  mood.creativityBoost = round01_(mood.creativityBoost);
  mood.nostalgiaFactor = round01_(mood.nostalgiaFactor);

  S.weatherMood = mood;

  /* ─────────────────────────────────────────────────────────────────────────
   * PART 11: Event pools (preserve structure; add overcast and intensity-aware lines)
   * ───────────────────────────────────────────────────────────────────────── */
  S.weatherEventPools = {
    base: getBaseWeatherEvents_(type),
    enhanced: [],
    special: [],
    holiday: [],
    neighborhood: {}
  };

  if (mood.irritabilityFactor > 0.3) {
    S.weatherEventPools.enhanced.push(
      'felt unusually short-tempered',
      'struggled to keep cool under pressure',
      'had a tense moment due to the weather'
    );
  }

  if (mood.creativityBoost > 0.2) {
    S.weatherEventPools.enhanced.push(
      'found inspiration in the weather',
      'spent time on a creative project',
      'had a moment of unexpected clarity'
    );
  }

  if (mood.nostalgiaFactor > 0.3) {
    S.weatherEventPools.enhanced.push(
      'was reminded of childhood memories',
      'felt a wave of nostalgia',
      'reached out to an old friend'
    );
  }

  if (mood.perfectWeather) {
    S.weatherEventPools.enhanced.push(
      'enjoyed an impromptu outdoor moment',
      'made plans to meet friends outside',
      'felt grateful for the gorgeous weather'
    );
  }

  if (hasFirstSnow) {
    S.weatherEventPools.special.push(
      "watched the first snowfall with wonder",
      "felt the magic of the year's first snow",
      "shared the first snow moment with someone"
    );
  }

  if (tracking.activeAlerts.indexOf('heat_wave') !== -1) {
    S.weatherEventPools.special.push(
      'struggled with the extended heat wave',
      'witnessed tempers flare in the heat',
      'sought any relief from the relentless heat'
    );
  }

  if (tracking.activeAlerts.indexOf('fog_advisory') !== -1) {
    S.weatherEventPools.special.push(
      'navigated carefully through the persistent fog',
      'felt the city muffled under fog',
      'noticed the eerie quiet of foggy streets'
    );
  }

  if (tracking.activeAlerts.indexOf('storm_advisory') !== -1) {
    S.weatherEventPools.special.push(
      'stayed inside as conditions worsened',
      'watched the streets empty during the worst of it',
      'heard wind and rain push against the city'
    );
  }

  // Holiday-specific event hooks
  if (holiday === 'Independence' && type === 'clear') {
    S.weatherEventPools.holiday.push(
      'enjoyed clear weather for celebrations',
      'felt energized under a bright summer sky'
    );
  }
  if (holiday === 'Halloween' && (type === 'fog' || type === 'wind' || type === 'overcast')) {
    S.weatherEventPools.holiday.push(
      'felt the atmosphere match the holiday mood',
      'noticed how the streets changed under the weather'
    );
  }
  if (holiday === 'DiaDeMuertos' && (type === 'fog' || type === 'overcast')) {
    S.weatherEventPools.holiday.push(
      'felt the air carry a quiet weight',
      'noticed the atmosphere honoring memory'
    );
  }
  if (isFirstFriday && mood.perfectWeather) {
    S.weatherEventPools.holiday.push(
      'enjoyed perfect First Friday weather',
      'strolled through evening crowds in comfort'
    );
  }
  if (isCreationDay) {
    S.weatherEventPools.holiday.push(
      'felt the day carry something foundational',
      'noticed the weather felt significant somehow'
    );
  }

  // Neighborhood-specific pool generation
  var nhWeatherKeys = Object.keys(S.neighborhoodWeather);
  for (var nhwIdx = 0; nhwIdx < nhWeatherKeys.length; nhwIdx++) {
    var nhKey = nhWeatherKeys[nhwIdx];
    var nhWeather = S.neighborhoodWeather[nhKey];
    S.weatherEventPools.neighborhood[nhKey] = [];

    if (nhWeather.type === 'fog' && type !== 'fog') {
      S.weatherEventPools.neighborhood[nhKey].push(
        'noticed ' + nhKey + ' shrouded in fog while other areas stayed clearer',
        'experienced microclimates around ' + nhKey
      );
    }

    if (nhWeather.temp >= temp + 3) {
      S.weatherEventPools.neighborhood[nhKey].push(
        "felt extra heat in " + nhKey,
        "noticed " + nhKey + " running warmer than expected"
      );
    }

    if (nhWeather.temp <= temp - 3) {
      S.weatherEventPools.neighborhood[nhKey].push(
        'appreciated cooler air in ' + nhKey,
        'noticed the breeze keeping ' + nhKey + ' comfortable'
      );
    }
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * PART 12: Weather summary (preserve keys; add intensity/front)
   * ───────────────────────────────────────────────────────────────────────── */
  var specialEventTypes = [];
  for (var seIdx = 0; seIdx < S.weatherEvents.length; seIdx++) {
    specialEventTypes.push(S.weatherEvents[seIdx].type);
  }

  var foggyNeighborhoods = [];
  var hotspots = [];
  var coolspots = [];

  var summaryNhKeys = Object.keys(S.neighborhoodWeather);
  for (var snIdx = 0; snIdx < summaryNhKeys.length; snIdx++) {
    var snKey = summaryNhKeys[snIdx];
    var snWeather = S.neighborhoodWeather[snKey];

    if (snWeather.type === 'fog') foggyNeighborhoods.push(snKey);
    if (snWeather.temp >= temp + 3) hotspots.push(snKey);
    if (snWeather.temp <= temp - 3) coolspots.push(snKey);
  }

  S.weatherSummary = {
    // existing keys
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
    specialEvents: specialEventTypes,
    perfectWeather: mood.perfectWeather,
    irritability: mood.irritabilityFactor,
    conflictPotential: mood.conflictPotential,
    nostalgiaFactor: mood.nostalgiaFactor,
    creativityBoost: mood.creativityBoost,
    cycleOfYear: cycleOfYear,
    holiday: holiday,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    foggyNeighborhoods: foggyNeighborhoods,
    hotspots: hotspots,
    coolspots: coolspots,

    // additive keys
    frontState: frontState,
    frontStrength: Math.round(frontT.frontStrength * 100) / 100,
    precipitationType: precip.type,
    precipitationIntensity: Math.round(precip.intensity * 100) / 100,
    humidity: humidity,
    windSpeed: wind.speed,
    windDirection: wind.direction,
    visibility: visibility
  };

  ctx.summary = S;
}


// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function normalizeWeatherType_(type) {
  var groups = {
    'clear': 'clear', 'mild': 'clear', 'breeze': 'clear',
    'overcast': 'overcast',
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
  var pools = {
    'clear': ['enjoyed the clear skies', 'took advantage of the nice weather'],
    'mild': ['appreciated the mild conditions', 'felt comfortable in the pleasant weather'],
    'breeze': ['felt refreshed by the breeze', 'enjoyed the gentle wind'],
    'overcast': ['moved through a gray afternoon', 'noticed the sky staying stubbornly blank'],
    'rain': ['listened to the rain', 'adjusted plans due to rain'],
    'fog': ['moved carefully in the fog', 'noticed the foggy atmosphere'],
    'wind': ['braced against the wind', 'noted the blustery conditions'],
    'hot': ['sought relief from the heat', 'felt drained by the heat'],
    'humid': ['struggled with the humidity', 'felt sticky in the humid air'],
    'cold': ['bundled up against the cold', 'felt the winter chill'],
    'cool': ['enjoyed the cool air', 'appreciated the crisp weather'],
    'snow': ['watched the snow falling', 'felt the quiet of snowfall']
  };
  return pools[weatherType] || pools.clear;
}

function getWeatherEvent_(ctx, preferSpecial) {
  var pools = ctx && ctx.summary && ctx.summary.weatherEventPools;
  if (!pools) return null;

  var rng = (ctx && typeof ctx.rng === 'function') ? ctx.rng : Math.random;

  if (preferSpecial && pools.special && pools.special.length > 0 && rng() < 0.3) {
    return { text: pools.special[Math.floor(rng() * pools.special.length)], tag: 'Weather-Special' };
  }

  if (pools.holiday && pools.holiday.length > 0 && rng() < 0.35) {
    return { text: pools.holiday[Math.floor(rng() * pools.holiday.length)], tag: 'Weather-Holiday' };
  }

  if (pools.enhanced && pools.enhanced.length > 0 && rng() < 0.4) {
    return { text: pools.enhanced[Math.floor(rng() * pools.enhanced.length)], tag: 'Weather-Mood' };
  }

  if (pools.base && pools.base.length > 0) {
    return { text: pools.base[Math.floor(rng() * pools.base.length)], tag: 'Weather' };
  }

  return null;
}

function getNeighborhoodWeatherEvent_(ctx, neighborhood) {
  var eventPools = ctx && ctx.summary && ctx.summary.weatherEventPools;
  var nhPools = eventPools && eventPools.neighborhood;
  var pools = nhPools && nhPools[neighborhood];
  if (!pools || pools.length === 0) return null;

  var rng = (ctx && typeof ctx.rng === 'function') ? ctx.rng : Math.random;

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
  var mood = ctx && ctx.summary && ctx.summary.weatherMood;
  if (!mood) return 1.0;

  var modifiers = {
    'conflict': 1.0 + (mood.conflictPotential || 0),
    'social': (mood.socialInclination || 0.5) + 0.5,
    'creative': 1.0 + (mood.creativityBoost || 0),
    'romantic': (mood.nostalgiaFactor || 0) > 0.3 ? 1.3 : (mood.perfectWeather ? 1.2 : 1.0),
    'outdoor': mood.perfectWeather ? 1.5 : ((mood.comfortIndex || 0.5) * 1.5),
    'indoor': (mood.comfortIndex || 0.5) < 0.4 ? 1.3 : 1.0
  };

  return modifiers[eventCategory] || 1.0;
}

function hasWeatherCondition_(ctx, condition) {
  var tracking = ctx && ctx.summary && ctx.summary.weatherTracking;
  if (!tracking) return false;

  if (condition === 'heat_wave') return tracking.activeAlerts && tracking.activeAlerts.indexOf('heat_wave') !== -1;
  if (condition === 'prolonged_rain') return tracking.activeAlerts && tracking.activeAlerts.indexOf('prolonged_rain') !== -1;
  if (condition === 'cold_snap') return tracking.activeAlerts && tracking.activeAlerts.indexOf('cold_snap') !== -1;
  if (condition === 'fog_advisory') return tracking.activeAlerts && tracking.activeAlerts.indexOf('fog_advisory') !== -1;
  if (condition === 'storm_advisory') return tracking.activeAlerts && tracking.activeAlerts.indexOf('storm_advisory') !== -1;

  if (condition === 'first_snow') {
    var events = ctx && ctx.summary && ctx.summary.weatherEvents;
    if (!events) return false;
    for (var i = 0; i < events.length; i++) {
      if (events[i].type === 'first_snow') return true;
    }
    return false;
  }

  if (condition === 'perfect_weather') {
    var wMood = ctx && ctx.summary && ctx.summary.weatherMood;
    return wMood && wMood.perfectWeather;
  }

  if (condition === 'first_friday') return !!(ctx && ctx.summary && ctx.summary.isFirstFriday);
  if (condition === 'creation_day') return !!(ctx && ctx.summary && ctx.summary.isCreationDay);

  return tracking.currentType === condition;
}

function getNeighborhoodTemp_(ctx, neighborhood) {
  var nhWeather = ctx && ctx.summary && ctx.summary.neighborhoodWeather && ctx.summary.neighborhoodWeather[neighborhood];
  if (nhWeather && nhWeather.temp !== undefined) return nhWeather.temp;

  var weather = ctx && ctx.summary && ctx.summary.weather;
  if (weather && weather.temp !== undefined) return weather.temp;

  return 65;
}


// ═══════════════════════════════════════════════════════════════════════════
// v3.5 ADAPTERS: Transit and Crime weather modifiers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get weather modifier for transit systems.
 * Consumes precipitationIntensity, windSpeed, visibility, frontState.
 *
 * @param {Object} ctx - Engine context
 * @return {Object} { modifier, delays, reason }
 */
function getTransitWeatherModifier_(ctx) {
  var weather = ctx && ctx.summary && ctx.summary.weather;
  if (!weather) return { modifier: 1.0, delays: 0, reason: 'no weather data' };

  var precipIntensity = weather.precipitationIntensity || 0;
  var windSpeed = weather.windSpeed || 0;
  var visibility = weather.visibility || 10;
  var frontState = weather.frontState || 'CLEAR';

  var modifier = 1.0;
  var delays = 0;
  var reasons = [];

  // Precipitation impact
  if (precipIntensity >= 0.7) {
    modifier *= 1.35;
    delays += 12;
    reasons.push('heavy precipitation');
  } else if (precipIntensity >= 0.4) {
    modifier *= 1.18;
    delays += 6;
    reasons.push('moderate precipitation');
  } else if (precipIntensity > 0) {
    modifier *= 1.08;
    delays += 2;
    reasons.push('light precipitation');
  }

  // Wind impact (affects above-ground transit, bikes)
  if (windSpeed >= 35) {
    modifier *= 1.25;
    delays += 8;
    reasons.push('high winds');
  } else if (windSpeed >= 25) {
    modifier *= 1.12;
    delays += 4;
    reasons.push('gusty conditions');
  }

  // Visibility impact (fog, heavy rain)
  if (visibility <= 2) {
    modifier *= 1.30;
    delays += 10;
    reasons.push('very low visibility');
  } else if (visibility <= 4) {
    modifier *= 1.15;
    delays += 5;
    reasons.push('reduced visibility');
  }

  // Storm front special handling
  if (frontState === 'STORM') {
    modifier *= 1.20;
    delays += 8;
    if (reasons.indexOf('storm conditions') === -1) reasons.push('storm conditions');
  }

  // Clamp
  modifier = Math.round(Math.min(modifier, 2.0) * 100) / 100;
  delays = Math.min(delays, 30);

  return {
    modifier: modifier,
    delays: delays,
    reason: reasons.length > 0 ? reasons.join(', ') : 'normal conditions'
  };
}

/**
 * Get weather modifier for crime patterns.
 * Consumes frontState, precipitationIntensity, windSpeed, temp, and alerts.
 *
 * @param {Object} ctx - Engine context
 * @return {Object} { propertyCrimeMod, violentCrimeMod, incidentMod, reason }
 */
function getCrimeWeatherModifier_(ctx) {
  var weather = ctx && ctx.summary && ctx.summary.weather;
  var tracking = ctx && ctx.summary && ctx.summary.weatherTracking;
  if (!weather) return { propertyCrimeMod: 1.0, violentCrimeMod: 1.0, incidentMod: 1.0, reason: 'no weather data' };

  var frontState = weather.frontState || 'CLEAR';
  var precipIntensity = weather.precipitationIntensity || 0;
  var windSpeed = weather.windSpeed || 0;
  var temp = weather.temp || 65;
  var alerts = (tracking && tracking.activeAlerts) || [];

  var propMod = 1.0;
  var violMod = 1.0;
  var incidentMod = 1.0;
  var reasons = [];

  // Storm reduces all crime (people stay inside)
  if (frontState === 'STORM' || precipIntensity >= 0.65) {
    propMod *= 0.70;
    violMod *= 0.70;
    incidentMod *= 0.70;
    reasons.push('storm conditions');
  } else if (precipIntensity >= 0.35) {
    propMod *= 0.85;
    violMod *= 0.85;
    incidentMod *= 0.85;
    reasons.push('rainy conditions');
  }

  // Heat wave increases violent crime
  if (frontState === 'HEAT' || alerts.indexOf('heat_wave') !== -1) {
    violMod *= 1.18;
    incidentMod *= 1.12;
    reasons.push('heat conditions');
  }

  // Extreme heat (temp-based)
  if (temp >= 90) {
    violMod *= 1.10;
    reasons.push('extreme heat');
  }

  // High wind keeps people inside
  if (windSpeed >= 30) {
    propMod *= 0.90;
    violMod *= 0.90;
    reasons.push('high winds');
  }

  // Cold snap reduces outdoor crime
  if (frontState === 'COLD' || alerts.indexOf('cold_snap') !== -1) {
    propMod *= 0.88;
    violMod *= 0.92;
    reasons.push('cold conditions');
  }

  // Fog can provide cover for property crime
  if (frontState === 'MARINE' || alerts.indexOf('fog_advisory') !== -1) {
    propMod *= 1.08;
    reasons.push('fog cover');
  }

  // Round values
  propMod = Math.round(propMod * 100) / 100;
  violMod = Math.round(violMod * 100) / 100;
  incidentMod = Math.round(incidentMod * 100) / 100;

  return {
    propertyCrimeMod: propMod,
    violentCrimeMod: violMod,
    incidentMod: incidentMod,
    reason: reasons.length > 0 ? reasons.join(', ') : 'normal conditions'
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// v3.5 FRONT NAMING: Media-friendly weather descriptions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get a media-friendly name for the current weather front.
 *
 * @param {Object} ctx - Engine context (or pass frontState/strength directly)
 * @param {string} [frontStateOverride] - Optional direct frontState
 * @param {number} [strengthOverride] - Optional direct strength (0-1)
 * @return {string} Media-friendly front name
 */
function getFrontMediaName_(ctx, frontStateOverride, strengthOverride) {
  var frontState, strength;

  if (typeof frontStateOverride === 'string') {
    frontState = frontStateOverride;
    strength = (typeof strengthOverride === 'number') ? strengthOverride : 0.5;
  } else {
    var weather = ctx && ctx.summary && ctx.summary.weather;
    if (!weather) return 'current conditions';
    frontState = weather.frontState || 'CLEAR';
    strength = weather.frontStrength || 0.5;
  }

  var names = FRONT_MEDIA_NAMES[frontState];
  if (!names) return 'variable conditions';

  var tier;
  if (strength >= 0.7) tier = 'strong';
  else if (strength >= 0.45) tier = 'moderate';
  else tier = 'weak';

  var pool = names[tier] || names.moderate;
  if (!pool || pool.length === 0) return 'variable conditions';

  // Deterministic pick based on strength decimal
  var idx = Math.floor((strength * 100) % pool.length);
  return pool[idx];
}

/**
 * Get extended weather brief for media output.
 * Returns headline, description, and front name.
 *
 * @param {Object} ctx - Engine context
 * @return {Object} { headline, description, frontName, alerts }
 */
function getWeatherMediaBrief_(ctx) {
  var weather = ctx && ctx.summary && ctx.summary.weather;
  var summary = ctx && ctx.summary && ctx.summary.weatherSummary;
  var tracking = ctx && ctx.summary && ctx.summary.weatherTracking;

  if (!weather || !summary) {
    return {
      headline: 'Weather conditions unavailable',
      description: 'No weather data for this cycle.',
      frontName: 'unknown',
      alerts: []
    };
  }

  var frontName = getFrontMediaName_(ctx);
  var temp = weather.temp || 65;
  var type = weather.type || 'clear';
  var windSpeed = weather.windSpeed || 0;
  var humidity = weather.humidity || 50;
  var precipIntensity = weather.precipitationIntensity || 0;
  var alerts = (tracking && tracking.activeAlerts) || [];

  // Build headline
  var headline = temp + '\u00B0F, ' + type;
  if (alerts.length > 0) {
    headline += ' (' + alerts[0].replace(/_/g, ' ') + ')';
  }

  // Build description
  var desc = frontName.charAt(0).toUpperCase() + frontName.slice(1);
  desc += ' brings ' + type + ' conditions with temperatures near ' + temp + '\u00B0F.';

  if (windSpeed >= 20) {
    desc += ' Winds ' + windSpeed + ' mph from the ' + (weather.windDirection || 'W') + '.';
  }

  if (precipIntensity >= 0.5) {
    desc += ' Expect significant precipitation.';
  } else if (precipIntensity > 0) {
    desc += ' Light precipitation possible.';
  }

  if (humidity >= 80) {
    desc += ' High humidity.';
  }

  return {
    headline: headline,
    description: desc,
    frontName: frontName,
    alerts: alerts
  };
}
