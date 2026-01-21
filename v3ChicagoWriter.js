/**
 * ============================================================================
 * saveV3Chicago_ v2.4
 * ============================================================================
 * 
 * CHANGES FROM v2.3:
 * 1. Adds CitizenCount and CitizenSample columns for Chicago population
 * 2. Converts to ES5 syntax for Apps Script compatibility
 * 3. References ctx.summary.chicagoCitizens from generateChicagoCitizens_()
 * 4. Maintains all v2.3 calendar/holiday/season awareness
 * 
 * SCHEMA (22 columns):
 * Timestamp | Cycle | GodWorldYear | CycleOfYear | SimMonth | CycleInMonth |
 * Season | Holiday | WeatherType | Temperature | WeatherImpact | WeatherMood |
 * ComfortIndex | Sentiment | EconomicMood | BullsSeason | Events | Sports |
 * TravelNotes | Correlation | CitizenCount | CitizenSample
 * 
 * INTEGRATION:
 * Run generateChicagoCitizens_(ctx) BEFORE this function in Phase 8.
 * 
 * ============================================================================
 */

function saveV3Chicago_(ctx) {
  var ss = ctx.ss;
  
  var HEADERS = [
    'Timestamp', 'Cycle', 'GodWorldYear', 'CycleOfYear', 'SimMonth', 'CycleInMonth',
    'Season', 'Holiday', 'WeatherType', 'Temperature', 'WeatherImpact', 'WeatherMood',
    'ComfortIndex', 'Sentiment', 'EconomicMood', 'BullsSeason', 'Events', 'Sports',
    'TravelNotes', 'Correlation', 'CitizenCount', 'CitizenSample'
  ];

  // ═══════════════════════════════════════════════════════════
  // ENSURE SHEET EXISTS WITH CORRECT HEADERS
  // ═══════════════════════════════════════════════════════════
  var sheet;
  if (typeof ensureSheet_ === 'function') {
    sheet = ensureSheet_(ss, 'Chicago_Feed', HEADERS);
  } else {
    sheet = ss.getSheetByName('Chicago_Feed');
    if (!sheet) {
      sheet = ss.insertSheet('Chicago_Feed');
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }
  }

  if (!sheet) {
    Logger.log('saveV3Chicago_ v2.4: Could not access Chicago_Feed sheet');
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // PULL CONTEXT DATA
  // ═══════════════════════════════════════════════════════════
  var S = ctx.summary || {};
  var now = ctx.now || new Date();

  // Cycle-based time (from GodWorld Calendar)
  var absoluteCycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;
  var godWorldYear = S.godWorldYear || Math.ceil(absoluteCycle / 52) || 1;
  var cycleOfYear = S.cycleOfYear || ((absoluteCycle - 1) % 52) + 1;
  var simMonth = S.simMonth || getMonthFromCycleInternal_(cycleOfYear);
  var cycleInMonth = S.cycleInMonth || 1;
  var season = S.season || "Spring";
  var holiday = S.holiday || "none";

  // Weather mood from Oakland (for correlation)
  var oaklandWeatherMood = S.weatherMood || {};
  
  // v2.4: Chicago citizens from generateChicagoCitizens_()
  var chicagoCitizens = ctx.summary.chicagoCitizens || [];
  var citizenCount = chicagoCitizens.length;
  var citizenSample = '';
  
  if (citizenCount > 0) {
    var samples = [];
    var sampleCount = Math.min(3, citizenCount);
    var used = [];
    
    for (var s = 0; s < sampleCount; s++) {
      var idx = Math.floor(Math.random() * citizenCount);
      while (used.indexOf(idx) !== -1 && used.length < citizenCount) {
        idx = Math.floor(Math.random() * citizenCount);
      }
      used.push(idx);
      var c = chicagoCitizens[idx];
      samples.push(c.name + ' (' + c.neighborhood + ')');
    }
    
    citizenSample = samples.join('; ');
  }

  // ═══════════════════════════════════════════════════════════
  // GET OR DERIVE CHICAGO FEED DATA
  // ═══════════════════════════════════════════════════════════
  var feed = ctx.summary.chicagoFeed || [];

  if (!feed.length) {
    var derived = deriveChicagoFeedV24_(ctx, godWorldYear, cycleOfYear, simMonth, cycleInMonth, season, holiday);
    feed = [derived];
  }

  // ═══════════════════════════════════════════════════════════
  // BUILD ROWS
  // ═══════════════════════════════════════════════════════════
  var rows = [];
  
  for (var i = 0; i < feed.length; i++) {
    var f = feed[i];
    var weatherType = f.weatherType || deriveChicagoWeatherTypeV24_(simMonth);
    var temperature = f.temp || f.temperature || deriveChicagoTempV24_(simMonth, weatherType);
    
    rows.push([
      now,
      absoluteCycle,
      f.godWorldYear || godWorldYear,
      f.cycleOfYear || cycleOfYear,
      f.simMonth || simMonth,
      f.cycleInMonth || cycleInMonth,
      f.season || season,
      f.holiday || (holiday !== "none" ? holiday : ''),
      weatherType,
      temperature,
      f.weatherImpact || deriveWeatherImpactV24_(weatherType),
      f.weatherMood || oaklandWeatherMood.primaryMood || deriveWeatherMoodV24_(weatherType),
      f.comfortIndex || oaklandWeatherMood.comfortIndex || deriveComfortIndexV24_(temperature, weatherType),
      round2V24_(f.sentiment || deriveChicagoSentimentV24_(S)),
      f.economicMood || S.economicMood || 50,
      f.bullsSeason || getBullsSeasonV24_(ctx) || 'off-season',
      f.events || deriveChicagoEventsV24_(weatherType, simMonth, holiday),
      f.sports || '',
      f.travelNotes || deriveChicagoTravelV24_(weatherType, f.weatherImpact || 1, holiday),
      f.correlation || '',
      citizenCount,
      citizenSample
    ]);
  }

  // ═══════════════════════════════════════════════════════════
  // APPEND ROWS
  // ═══════════════════════════════════════════════════════════
  try {
    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
      Logger.log('saveV3Chicago_ v2.4: Appended ' + rows.length + ' row(s) for Cycle ' + absoluteCycle + ' | Citizens: ' + citizenCount);
    }
  } catch (e) {
    Logger.log('saveV3Chicago_ v2.4 error: ' + e.message);
  }
}


// ════════════════════════════════════════════════════════════════════════════
// DERIVATION FUNCTIONS (v2.4 namespaced to avoid collisions)
// ════════════════════════════════════════════════════════════════════════════

function deriveChicagoFeedV24_(ctx, godWorldYear, cycleOfYear, simMonth, cycleInMonth, season, holiday) {
  var S = ctx.summary || {};
  var chicago = S.chicago || ctx.chicago || {};
  
  var weatherType = chicago.weatherType || deriveChicagoWeatherTypeV24_(simMonth);
  var temperature = chicago.temp || deriveChicagoTempV24_(simMonth, weatherType);
  var weatherImpact = chicago.weatherImpact || deriveWeatherImpactV24_(weatherType);
  
  return {
    godWorldYear: godWorldYear,
    cycleOfYear: cycleOfYear,
    simMonth: simMonth,
    cycleInMonth: cycleInMonth,
    season: season,
    holiday: holiday,
    weatherType: weatherType,
    temp: temperature,
    weatherImpact: weatherImpact,
    weatherMood: deriveWeatherMoodV24_(weatherType),
    comfortIndex: deriveComfortIndexV24_(temperature, weatherType),
    sentiment: chicago.sentiment || deriveChicagoSentimentV24_(S),
    economicMood: S.economicMood || 50,
    bullsSeason: getBullsSeasonV24_(ctx) || 'off-season',
    events: chicago.events || deriveChicagoEventsV24_(weatherType, simMonth, holiday),
    sports: '',
    travelNotes: chicago.travel || deriveChicagoTravelV24_(weatherType, weatherImpact, holiday),
    correlation: ''
  };
}

function getBullsSeasonV24_(ctx) {
  if (ctx.config && ctx.config.sportsState_Chicago) return ctx.config.sportsState_Chicago;
  return 'off-season';
}

function getMonthFromCycleInternal_(cycleOfYear) {
  if (cycleOfYear >= 1 && cycleOfYear <= 5) return 1;
  if (cycleOfYear >= 6 && cycleOfYear <= 9) return 2;
  if (cycleOfYear >= 10 && cycleOfYear <= 13) return 3;
  if (cycleOfYear >= 14 && cycleOfYear <= 17) return 4;
  if (cycleOfYear >= 18 && cycleOfYear <= 22) return 5;
  if (cycleOfYear >= 23 && cycleOfYear <= 26) return 6;
  if (cycleOfYear >= 27 && cycleOfYear <= 30) return 7;
  if (cycleOfYear >= 31 && cycleOfYear <= 35) return 8;
  if (cycleOfYear >= 36 && cycleOfYear <= 39) return 9;
  if (cycleOfYear >= 40 && cycleOfYear <= 44) return 10;
  if (cycleOfYear >= 45 && cycleOfYear <= 48) return 11;
  if (cycleOfYear >= 49 && cycleOfYear <= 52) return 12;
  return 1;
}

function deriveChicagoWeatherTypeV24_(simMonth) {
  var patterns = {
    1: ['snow', 'cold', 'cold', 'lake-effect'],
    2: ['snow', 'cold', 'cold', 'freezing-rain'],
    3: ['cold', 'rain', 'snow', 'wind'],
    4: ['rain', 'cold', 'overcast', 'wind'],
    5: ['rain', 'clear', 'overcast', 'mild'],
    6: ['clear', 'hot', 'rain', 'thunderstorm'],
    7: ['hot', 'clear', 'humid', 'thunderstorm'],
    8: ['hot', 'humid', 'clear', 'thunderstorm'],
    9: ['clear', 'rain', 'cold', 'fog'],
    10: ['cold', 'rain', 'overcast', 'wind'],
    11: ['cold', 'snow', 'rain', 'lake-effect'],
    12: ['snow', 'cold', 'snow', 'freezing-rain']
  };
  var options = patterns[simMonth] || ['cold', 'cold', 'cold'];
  return options[Math.floor(Math.random() * options.length)];
}

function deriveChicagoTempV24_(simMonth, weatherType) {
  var baseTemps = { 1: 25, 2: 28, 3: 38, 4: 48, 5: 58, 6: 68, 7: 75, 8: 74, 9: 65, 10: 53, 11: 40, 12: 28 };
  var temp = baseTemps[simMonth] || 45;
  if (weatherType === 'snow' || weatherType === 'lake-effect') temp -= 5;
  if (weatherType === 'freezing-rain') temp -= 3;
  if (weatherType === 'hot') temp += 8;
  if (weatherType === 'cold') temp -= 3;
  if (weatherType === 'humid') temp += 3;
  temp += Math.round((Math.random() - 0.5) * 10);
  return temp;
}

function deriveWeatherImpactV24_(weatherType) {
  var impacts = { 'clear': 1.0, 'overcast': 1.0, 'mild': 1.0, 'cold': 1.1, 'rain': 1.2, 'fog': 1.2, 'wind': 1.3, 'snow': 1.4, 'lake-effect': 1.5, 'freezing-rain': 1.6, 'thunderstorm': 1.4, 'hot': 1.1, 'humid': 1.1, 'heat-wave': 1.3 };
  return impacts[weatherType] || 1.0;
}

function deriveWeatherMoodV24_(weatherType) {
  var moods = { 'clear': 'content', 'mild': 'content', 'overcast': 'neutral', 'cold': 'brisk', 'rain': 'introspective', 'fog': 'contemplative', 'snow': 'hushed', 'lake-effect': 'hushed', 'freezing-rain': 'tense', 'wind': 'restless', 'thunderstorm': 'anxious', 'hot': 'restless', 'humid': 'sluggish', 'heat-wave': 'irritable' };
  return moods[weatherType] || 'neutral';
}

function deriveComfortIndexV24_(temperature, weatherType) {
  var comfort = 1 - Math.abs(temperature - 70) / 50;
  if (weatherType === 'rain') comfort -= 0.1;
  if (weatherType === 'snow' || weatherType === 'lake-effect') comfort -= 0.15;
  if (weatherType === 'freezing-rain') comfort -= 0.25;
  if (weatherType === 'humid') comfort -= 0.1;
  if (weatherType === 'wind') comfort -= 0.1;
  if (weatherType === 'thunderstorm') comfort -= 0.15;
  if (weatherType === 'clear' || weatherType === 'mild') comfort += 0.05;
  return Math.max(0, Math.min(1, round2V24_(comfort)));
}

function deriveChicagoSentimentV24_(summary) {
  var sentiment = -0.1;
  if (summary.sportsSeason === 'playoffs' || summary.sportsSeason === 'post-season') sentiment += 0.15;
  if (summary.sportsSeason === 'championship') sentiment += 0.3;
  sentiment += (Math.random() - 0.5) * 0.1;
  return Math.max(-1, Math.min(1, sentiment));
}

function deriveChicagoEventsV24_(weatherType, simMonth, holiday) {
  var events = [];
  if (weatherType === 'snow') events.push('Snow crews working the main arteries.');
  if (weatherType === 'lake-effect') events.push('Lake-effect bands moving through the north side.');
  if (weatherType === 'freezing-rain') events.push('Ice advisory along the Magnificent Mile.');
  if (weatherType === 'fog') events.push('Morning haze reported across the city.');
  if (weatherType === 'thunderstorm') events.push('Storm cells tracking across Cook County.');
  if (weatherType === 'heat-wave') events.push('Cooling centers open in downtown.');
  if (holiday === "NewYear" || holiday === "NewYearsEve") events.push('New Year\'s Eve energy in the Loop.');
  if (holiday === "StPatricksDay") events.push('Green river ceremony drawing crowds.');
  if (holiday === "Independence") events.push('July Fourth fireworks over Navy Pier.');
  if (holiday === "Thanksgiving") events.push('Thanksgiving preparations across the city.');
  if (holiday === "Holiday") events.push('Holiday lights on Michigan Avenue.');
  if (holiday === "MLKDay") events.push('MLK Day observances across the South Side.');
  if (events.length === 0) {
    if (simMonth === 3) events.push('Spring slowly approaching Chicago.');
    if (simMonth === 7) events.push('Summer festival season.');
    if (simMonth === 12) events.push('Holiday season in the Loop.');
  }
  return events.join(' ') || '';
}

function deriveChicagoTravelV24_(weatherType, weatherImpact, holiday) {
  var notes = [];
  if (weatherImpact >= 1.3) notes.push('CTA advising extra travel time.');
  if (weatherImpact >= 1.4) notes.push('O\'Hare reporting delays.');
  if (weatherImpact >= 1.5) notes.push('Metra suspending some routes.');
  if (weatherType === 'snow' || weatherType === 'lake-effect') notes.push('Snow affecting transit schedules.');
  if (weatherType === 'freezing-rain') notes.push('Ice causing travel hazards.');
  if (holiday === "Thanksgiving") notes.push('Heavy travel day. Expect O\'Hare congestion.');
  if (holiday === "Holiday" || holiday === "NewYearsEve") notes.push('Holiday travel in effect.');
  if (holiday === "StPatricksDay") notes.push('Downtown streets closed for parade.');
  if (holiday === "Independence") notes.push('Lakefront roads closed for fireworks.');
  return notes.join(' ') || '';
}

function round2V24_(n) {
  if (typeof n !== 'number') return 0;
  return Math.round(n * 100) / 100;
}