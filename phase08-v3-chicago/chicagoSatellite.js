/**
 * ============================================================================
 * chicagoSatelliteEngine_ v3.5
 * ============================================================================
 * 
 * Generates Chicago snapshot aligned with GodWorld Calendar v1.0.
 * 
 * v3.5 Enhancements:
 * - Report output includes full calendar context for consistency
 * - holidayPriority, isFirstFriday, isCreationDay in output
 * - sportsSeason field matching other engines
 * - Aligned with calendar integration across all 80+ scripts
 * 
 * Features:
 * - Chicago-specific weather (colder, lake effect, more snow)
 * - Independent sentiment drift (reacts to Bulls results from Game_Intake)
 * - Cycle-based calendar integration
 * - Holiday awareness (national holidays affect Chicago too)
 * - Bulls season awareness from Sports Clock
 * - Rich event pool (no auto-sports)
 * 
 * SPORTS ARE NOT SIMULATED.
 * All sports content comes from Game_Intake (user gameplay).
 * 
 * Provides CONTEXT for journalists, not stories.
 * 
 * ============================================================================
 */

function chicagoSatelliteEngine_(ctx) {
  const S = ctx.summary || {};
  const cycle = Number(S.absoluteCycle || S.cycleId) || 0;
  
  // ═══════════════════════════════════════════════════════════
  // CHICAGO CALENDAR (from GodWorld Calendar)
  // ═══════════════════════════════════════════════════════════
  const godWorldYear = S.godWorldYear || Math.ceil(cycle / 52) || 1;
  const cycleOfYear = S.cycleOfYear || ((cycle - 1) % 52) + 1;
  const simMonth = S.simMonth || S.month || getMonthFromCycleInternal_(cycleOfYear);
  const cycleInMonth = S.cycleInMonth || 1;
  const season = S.season || "Spring";

  // Holiday awareness (national holidays)
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;  // v3.5: Oakland-specific, minimal Chicago impact

  // Sports Clock awareness (Bulls)
  const bullsSeason = ctx.config?.sportsState_Chicago || S.sportsState_Chicago || "off-season";
  
  // v3.5: Unified sportsSeason field (Oakland A's context, for reference)
  const sportsSeason = S.sportsSeason || "off-season";

  // ═══════════════════════════════════════════════════════════
  // CHICAGO-SPECIFIC WEATHER
  // Chicago baseline: colder than Oakland, lake effect, harsh winters
  // ═══════════════════════════════════════════════════════════
  const chicagoWeather = generateChicagoWeather_(simMonth, season, holiday);

  // ═══════════════════════════════════════════════════════════
  // CHICAGO SENTIMENT (Independent from Oakland)
  // Based on weather, Bulls performance, and holidays
  // ═══════════════════════════════════════════════════════════
  const chicagoSentiment = calculateChicagoSentiment_(ctx, chicagoWeather, holiday, holidayPriority, bullsSeason);

  // ═══════════════════════════════════════════════════════════
  // CHICAGO EVENTS (Non-sports, holiday-aware)
  // ═══════════════════════════════════════════════════════════
  const chicagoEvents = generateChicagoEvents_(chicagoWeather, chicagoSentiment, simMonth, holiday, isFirstFriday, cycleOfYear);

  // ═══════════════════════════════════════════════════════════
  // TRAVEL NOTES
  // ═══════════════════════════════════════════════════════════
  const travelNotes = generateChicagoTravel_(chicagoWeather, holiday);

  // ═══════════════════════════════════════════════════════════
  // BUILD REPORT (v3.5: Full calendar context in output)
  // ═══════════════════════════════════════════════════════════
  const report = {
    // Cycle-based time
    absoluteCycle: cycle,
    godWorldYear: godWorldYear,
    cycleOfYear: cycleOfYear,
    cycleInMonth: cycleInMonth,
    simMonth: simMonth,
    season: season,
    
    // Weather
    weatherType: chicagoWeather.type,
    weatherImpact: chicagoWeather.impact,
    temp: chicagoWeather.temp,
    
    // Mood
    sentiment: chicagoSentiment,
    
    // Events
    events: chicagoEvents,
    
    // Sports (Game_Intake driven only)
    sports: '',
    bullsSeason: bullsSeason,
    
    // Travel
    travelNotes: travelNotes,
    
    // v3.5: Full calendar context (aligned with other engines)
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,  // Oakland A's context
    month: simMonth
  };

  ctx.summary.chicagoFeed = [report];
  
  Logger.log('chicagoSatelliteEngine_ v3.5: Cycle ' + cycle + 
    ' | Weather: ' + chicagoWeather.type + 
    ' | Sentiment: ' + chicagoSentiment +
    ' | Holiday: ' + holiday +
    ' | Bulls: ' + bullsSeason);
}


/**
 * ============================================================================
 * CHICAGO WEATHER MODEL
 * Colder baseline, lake effect, harsh winters
 * ============================================================================
 */
function generateChicagoWeather_(month, season, holiday) {
  // Base temps by month (Fahrenheit)
  const baseTemps = {
    1: 25, 2: 28, 3: 38, 4: 48, 5: 58, 6: 68,
    7: 75, 8: 74, 9: 65, 10: 53, 11: 40, 12: 28
  };

  let temp = baseTemps[month] || 50;
  temp += Math.round((Math.random() - 0.5) * 15);

  let type = 'clear';
  let impact = 1.0;
  const roll = Math.random();

  if (month >= 11 || month <= 3) {
    // Winter
    if (roll < 0.30) { type = 'snow'; impact = 1.4; }
    else if (roll < 0.45) { type = 'lake-effect'; impact = 1.5; }
    else if (roll < 0.60) { type = 'cold'; impact = 1.2; }
    else if (roll < 0.70) { type = 'freezing-rain'; impact = 1.6; }
    else if (roll < 0.85) { type = 'overcast'; impact = 1.1; }
    else { type = 'clear'; impact = 1.0; }
  } else if (month >= 4 && month <= 5) {
    // Spring
    if (roll < 0.25) { type = 'rain'; impact = 1.2; }
    else if (roll < 0.40) { type = 'wind'; impact = 1.3; }
    else if (roll < 0.55) { type = 'overcast'; impact = 1.1; }
    else if (roll < 0.70) { type = 'fog'; impact = 1.2; }
    else { type = 'clear'; impact = 1.0; }
  } else if (month >= 6 && month <= 8) {
    // Summer
    if (roll < 0.20) { type = 'heat-wave'; impact = 1.3; }
    else if (roll < 0.35) { type = 'thunderstorm'; impact = 1.4; }
    else if (roll < 0.50) { type = 'humid'; impact = 1.1; }
    else { type = 'clear'; impact = 1.0; }
  } else {
    // Fall
    if (roll < 0.25) { type = 'wind'; impact = 1.2; }
    else if (roll < 0.40) { type = 'rain'; impact = 1.2; }
    else if (roll < 0.55) { type = 'fog'; impact = 1.2; }
    else if (roll < 0.70) { type = 'overcast'; impact = 1.1; }
    else { type = 'clear'; impact = 1.0; }
  }

  // Holiday weather biases
  if (holiday === "Independence") {
    // Favor clear for July 4th
    if (type === 'overcast' && Math.random() < 0.5) type = 'clear';
  }
  if (holiday === "Holiday" || holiday === "NewYearsEve") {
    // Winter holidays - favor snow
    if (type === 'clear' && Math.random() < 0.3) { type = 'snow'; impact = 1.4; }
  }
  if (holiday === "Thanksgiving") {
    // November - can be harsh
    if (type === 'clear' && Math.random() < 0.3) { type = 'cold'; impact = 1.2; }
  }
  if (holiday === "StPatricksDay") {
    // March - Chicago's big day, variable weather
    if (Math.random() < 0.4) { type = 'cold'; impact = 1.2; }
  }

  return { type, impact, temp };
}


/**
 * ============================================================================
 * CHICAGO SENTIMENT
 * Based on weather, Bulls performance, and holidays
 * ============================================================================
 */
function calculateChicagoSentiment_(ctx, weather, holiday, holidayPriority, bullsSeason) {
  let sentiment = 0;

  // ═══════════════════════════════════════════════════════════
  // WEATHER IMPACT
  // ═══════════════════════════════════════════════════════════
  if (weather.type === 'snow' || weather.type === 'lake-effect') sentiment -= 0.15;
  if (weather.type === 'freezing-rain') sentiment -= 0.25;
  if (weather.type === 'cold' && weather.temp < 20) sentiment -= 0.2;
  if (weather.type === 'heat-wave') sentiment -= 0.1;
  if (weather.type === 'clear') sentiment += 0.1;
  if (weather.type === 'thunderstorm') sentiment -= 0.1;
  if (weather.type === 'overcast') sentiment -= 0.05;

  // ═══════════════════════════════════════════════════════════
  // HOLIDAY IMPACT
  // ═══════════════════════════════════════════════════════════
  if (holidayPriority === "major") {
    sentiment += 0.15;
  } else if (holidayPriority === "cultural") {
    sentiment += 0.05;
  } else if (holidayPriority === "oakland") {
    // v3.5: Oakland-specific holidays have minimal Chicago impact
    sentiment += 0.02;
  }

  // Specific holiday sentiments
  if (holiday === "NewYear" || holiday === "NewYearsEve") {
    sentiment += 0.2;
  }
  if (holiday === "Independence") {
    sentiment += 0.25;
  }
  if (holiday === "Thanksgiving") {
    sentiment += 0.15;
  }
  if (holiday === "Holiday") {
    sentiment += 0.2;
  }
  if (holiday === "StPatricksDay") {
    sentiment += 0.3;  // HUGE in Chicago
  }
  if (holiday === "MLKDay") {
    sentiment += 0.1;
  }
  if (holiday === "MemorialDay" || holiday === "LaborDay") {
    sentiment += 0.1;
  }

  // ═══════════════════════════════════════════════════════════
  // BULLS SEASON IMPACT (from Sports Clock)
  // ═══════════════════════════════════════════════════════════
  if (bullsSeason === "playoffs" || bullsSeason === "post-season") {
    sentiment += 0.2;
  }
  if (bullsSeason === "championship") {
    sentiment += 0.35;
  }
  if (bullsSeason === "late-season") {
    sentiment += 0.1;
  }

  // ═══════════════════════════════════════════════════════════
  // BULLS PERFORMANCE (from Game_Intake)
  // ═══════════════════════════════════════════════════════════
  const bullsImpact = getBullsSentimentImpact_(ctx);
  sentiment += bullsImpact;

  // Random daily fluctuation
  sentiment += (Math.random() - 0.5) * 0.1;

  // Clamp and round
  if (sentiment > 0.6) sentiment = 0.6;
  if (sentiment < -0.6) sentiment = -0.6;
  sentiment = Math.round(sentiment * 100) / 100;

  return sentiment;
}


/**
 * ============================================================================
 * BULLS SENTIMENT IMPACT
 * Reads recent Bulls games from Game_Intake and calculates mood shift
 * ============================================================================
 */
function getBullsSentimentImpact_(ctx) {
  const ss = ctx.ss;
  const sheet = ss.getSheetByName('Game_Intake');
  if (!sheet) return 0;

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return 0;

  const header = data[0];
  const idxGame = header.indexOf('Game');
  const idxEventType = header.indexOf('EventType');
  const idxDetails = header.indexOf('Details');
  const idxCycle = header.indexOf('Cycle');

  if (idxGame < 0) return 0;

  const currentCycle = ctx.summary.absoluteCycle || ctx.summary.cycleId || ctx.config.cycleCount || 0;
  const recentWindow = 10; // Look back 10 cycles

  let wins = 0;
  let losses = 0;
  let bigMoments = 0; // playoffs, championships, trades

  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    const game = (row[idxGame] || '').toString().toLowerCase();
    const eventType = (row[idxEventType] || '').toString().toLowerCase();
    const details = (row[idxDetails] || '').toString().toLowerCase();
    const cycle = Number(row[idxCycle] || 0);

    // Only count Bulls-related entries
    if (!game.includes('bulls') && !game.includes('nba 2k')) continue;

    // Only count recent cycles
    if (currentCycle - cycle > recentWindow) continue;

    // Count outcomes
    if (eventType.includes('win') || details.includes('win') || details.includes('victory')) {
      wins++;
    }
    if (eventType.includes('loss') || details.includes('loss') || details.includes('defeat')) {
      losses++;
    }
    if (details.includes('playoff') || details.includes('championship') || details.includes('finals')) {
      bigMoments++;
    }
  }

  // Calculate sentiment shift
  let impact = 0;

  // Win/loss differential
  impact += (wins - losses) * 0.05;

  // Big moments boost
  impact += bigMoments * 0.1;

  // Cap the impact
  if (impact > 0.3) impact = 0.3;
  if (impact < -0.3) impact = -0.3;

  return impact;
}


/**
 * ============================================================================
 * CHICAGO EVENTS
 * Non-sports city events for texture (holiday-aware)
 * ============================================================================
 */
function generateChicagoEvents_(weather, sentiment, month, holiday, isFirstFriday, cycleOfYear) {
  const events = [];

  // ═══════════════════════════════════════════════════════════
  // WEATHER-DRIVEN EVENTS
  // ═══════════════════════════════════════════════════════════
  if (weather.type === 'fog') {
    events.push('Morning haze across the lakefront.');
  }
  if (weather.type === 'snow') {
    events.push('Snow crews working the main arteries.');
  }
  if (weather.type === 'lake-effect') {
    events.push('Lake-effect bands moving through the north side.');
  }
  if (weather.type === 'freezing-rain') {
    events.push('Ice advisory along the Magnificent Mile.');
  }
  if (weather.type === 'heat-wave') {
    events.push('Cooling centers open in downtown.');
  }
  if (weather.type === 'thunderstorm') {
    events.push('Storm cells tracking across Cook County.');
  }

  // ═══════════════════════════════════════════════════════════
  // HOLIDAY-DRIVEN EVENTS
  // ═══════════════════════════════════════════════════════════
  if (holiday === "NewYear") {
    events.push('New Year energy in the Loop.');
  }
  if (holiday === "NewYearsEve") {
    events.push('New Year\'s Eve crowds gathering downtown.');
  }
  if (holiday === "MLKDay") {
    events.push('MLK Day observances across the South Side.');
  }
  if (holiday === "StPatricksDay") {
    events.push('Green river ceremony drawing crowds. Chicago\'s biggest day.');
  }
  if (holiday === "Easter") {
    events.push('Easter gatherings in neighborhood churches.');
  }
  if (holiday === "MemorialDay") {
    events.push('Memorial Day ceremonies at Soldier Field.');
  }
  if (holiday === "Independence") {
    events.push('July Fourth fireworks over Navy Pier.');
  }
  if (holiday === "LaborDay") {
    events.push('Labor Day marks summer\'s end on the lakefront.');
  }
  if (holiday === "Halloween") {
    events.push('Halloween costumes on the Blue Line.');
  }
  if (holiday === "Thanksgiving") {
    events.push('Thanksgiving preparations across the city.');
  }
  if (holiday === "Holiday") {
    events.push('Holiday lights along the Magnificent Mile.');
  }
  if (holiday === "Hanukkah") {
    events.push('Menorah lighting in Daley Plaza.');
  }

  // ═══════════════════════════════════════════════════════════
  // FIRST FRIDAY (Chicago gallery scene)
  // ═══════════════════════════════════════════════════════════
  if (isFirstFriday) {
    events.push('First Friday gallery openings in River North.');
  }

  // ═══════════════════════════════════════════════════════════
  // SENTIMENT-DRIVEN EVENTS
  // ═══════════════════════════════════════════════════════════
  if (sentiment <= -0.3) {
    const negativeEvents = [
      'Subdued mood in the Loop.',
      'Light foot traffic on State Street.',
      'Commuters hurrying without pause.'
    ];
    events.push(negativeEvents[Math.floor(Math.random() * negativeEvents.length)]);
  }
  if (sentiment >= 0.2) {
    const positiveEvents = [
      'Energy in the downtown corridor.',
      'Crowds gathering along the riverwalk.',
      'Street musicians out on Michigan Ave.'
    ];
    events.push(positiveEvents[Math.floor(Math.random() * positiveEvents.length)]);
  }

  // ═══════════════════════════════════════════════════════════
  // SEASONAL EVENTS (cycle-aware)
  // ═══════════════════════════════════════════════════════════
  if (month === 12 && holiday !== "Holiday") {
    events.push('Holiday season in full swing downtown.');
  }
  if (month === 7 && holiday !== "Independence") {
    events.push('Summer festival season in full swing.');
  }
  if (month === 6) {
    events.push('Pride Month visibility in Boystown.');
  }
  if (month === 8) {
    events.push('Lollapalooza energy lingers in Grant Park.');
  }

  // Cycle-specific Chicago events
  if (cycleOfYear === 11 || cycleOfYear === 12) {  // March
    if (Math.random() < 0.3) {
      events.push('St. Patrick\'s Day prep underway.');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RANDOM CITY TEXTURE (20% chance)
  // ═══════════════════════════════════════════════════════════
  if (Math.random() < 0.2) {
    const textures = [
      'El train delays on the Red Line.',
      'Construction on Wacker Drive.',
      'Food truck gathering in Daley Plaza.',
      'Art installation in Millennium Park.',
      'River taxi service busy today.',
      'Architecture tour boats on the river.',
      'Deep dish debate at Giordano\'s.',
      'Cubs fans heading to Wrigleyville.'
    ];
    events.push(textures[Math.floor(Math.random() * textures.length)]);
  }

  return events.join(' ');
}


/**
 * ============================================================================
 * CHICAGO TRAVEL NOTES
 * ============================================================================
 */
function generateChicagoTravel_(weather, holiday) {
  const notes = [];

  if (weather.impact >= 1.3) {
    notes.push('CTA advising extra travel time.');
  }
  if (weather.type === 'snow' || weather.type === 'lake-effect') {
    notes.push('O\'Hare reporting delays.');
  }
  if (weather.type === 'freezing-rain') {
    notes.push('Metra suspending some routes.');
  }
  if (weather.impact >= 1.5) {
    notes.push('Avoid non-essential travel.');
  }

  // Holiday travel impact
  if (holiday === "Thanksgiving") {
    notes.push('Heavy travel day. Expect O\'Hare congestion.');
  }
  if (holiday === "Holiday" || holiday === "NewYearsEve") {
    notes.push('Holiday travel in effect.');
  }
  if (holiday === "StPatricksDay") {
    notes.push('Downtown streets closed for parade.');
  }
  if (holiday === "Independence") {
    notes.push('Lakefront roads closed for fireworks.');
  }

  return notes.join(' ');
}


/**
 * ============================================================================
 * HELPER: Get month from cycle (internal fallback)
 * ============================================================================
 */
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


/**
 * ============================================================================
 * CHICAGO SATELLITE ENGINE REFERENCE v3.5
 * ============================================================================
 * 
 * Report Fields (v3.5 aligned):
 * 
 * TIME:
 * - absoluteCycle, godWorldYear, cycleOfYear, cycleInMonth, simMonth, season
 * 
 * WEATHER:
 * - weatherType, weatherImpact, temp
 * 
 * MOOD:
 * - sentiment
 * 
 * CONTENT:
 * - events (string)
 * - travelNotes
 * 
 * SPORTS:
 * - sports (empty - Game_Intake driven)
 * - bullsSeason (Chicago Bulls season state)
 * 
 * CALENDAR (v3.5 aligned with all engines):
 * - holiday
 * - holidayPriority
 * - isFirstFriday
 * - isCreationDay
 * - sportsSeason (Oakland A's context)
 * - month
 * 
 * ============================================================================
 * 
 * Chicago-Specific Holidays:
 * - St. Patrick's Day is HUGE (river dyed green, sentiment +0.3)
 * - July 4th (Navy Pier fireworks)
 * - Thanksgiving (heavy travel)
 * - Christmas (Magnificent Mile)
 * 
 * Weather Types:
 * - snow, lake-effect, freezing-rain, cold (winter)
 * - rain, wind, fog, overcast (spring/fall)
 * - heat-wave, thunderstorm, humid, clear (summer)
 * 
 * ============================================================================
 */