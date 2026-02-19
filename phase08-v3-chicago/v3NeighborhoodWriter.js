/**
 * ============================================================================
 * saveV3NeighborhoodMap_ v3.5 - ES5 Compatible
 * ============================================================================
 *
 * v3.5 Changes:
 * - ES5 compatible (removed const/let, arrow functions, .forEach, .filter, .map, .some, .includes)
 * - Maintains direct batch write pattern (replace rows 2:N each cycle)
 *
 * v3.4 Features (preserved):
 * - STRICT schema safety: only appends missing columns at END (never clears)
 * - No auto-wipe / no destructive "needsInit" behavior
 * - Robust parsing of worldEvents (uses subdomain/subtype/description)
 * - Robust demographic drift (handles object vs number)
 * - Batch write rows (faster / less quota)
 *
 * SCHEMA TARGET (15 cols, replace pattern):
 * Timestamp | Cycle | Neighborhood | NightlifeProfile | NoiseIndex | CrimeIndex |
 * RetailVitality | EventAttractiveness | Sentiment | DemographicMarker |
 * Holiday | HolidayPriority | FirstFriday | CreationDay | SportsSeason
 *
 * ============================================================================
 */

var NEIGHBORHOOD_MAP_HEADERS = [
  'Timestamp', 'Cycle', 'Neighborhood', 'NightlifeProfile', 'NoiseIndex',
  'CrimeIndex', 'RetailVitality', 'EventAttractiveness', 'Sentiment',
  'DemographicMarker', 'Holiday', 'HolidayPriority', 'FirstFriday',
  'CreationDay', 'SportsSeason'
];

var NMAP_NEIGHBORHOODS = [
  'Downtown', 'Temescal', 'Laurel', 'West Oakland', 'Fruitvale', 'Jack London',
  'Rockridge', 'Adams Point', 'Grand Lake', 'Piedmont Ave', 'Chinatown',
  'Brooklyn', 'Eastlake', 'Glenview', 'Dimond', 'Ivy Hill', 'San Antonio'
];


function saveV3NeighborhoodMap_(ctx) {
  // DRY-RUN FIX: Skip direct sheet writes in dry-run mode
  var isDryRun = ctx.mode && ctx.mode.dryRun;
  if (isDryRun) {
    Logger.log('saveV3NeighborhoodMap_: Skipping (dry-run mode)');
    return;
  }

  var ss = ctx.ss;

  var sheet = ensureNeighborhoodMapSchemaAppendOnly_(ss, 'Neighborhood_Map', NEIGHBORHOOD_MAP_HEADERS);

  var S = ctx.summary || {};
  ctx.summary = S;
  var cycle = (ctx.config && typeof ctx.config.cycleCount !== 'undefined')
    ? ctx.config.cycleCount
    : (S.cycleId || 0);
  var now = ctx.now || new Date();

  // Calendar context
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;
  var sportsSeason = S.sportsSeason || 'off-season';

  // Pull simulation signals
  var dynamics = S.cityDynamics || {};
  var weather = S.weather || {};
  var worldEvents = S.worldEvents || [];
  var storySeeds = S.storySeeds || [];
  var storyHooks = S.storyHooks || [];
  var eventArcs = S.eventArcs || S.v3Arcs || [];

  // Base values
  var baseNightlife = Number(dynamics.nightlife || 0.7);

  // Noise derived from traffic + weather impact
  var baseNoise = ((Number(dynamics.traffic || 1) * 5) +
    ((Number(weather.impact || 1) - 1) * 3));

  // Robust event text extraction
  function eventText(ev) {
    var parts = [];
    if (ev.subdomain) parts.push(ev.subdomain);
    if (ev.subtype) parts.push(ev.subtype);
    if (ev.description) parts.push(ev.description);
    if (ev.summary) parts.push(ev.summary);
    if (ev.title) parts.push(ev.title);
    return parts.join(' ').toString().toLowerCase();
  }

  // Crime count: SAFETY domain + keyword hits
  var baseCrimeCount = 0;
  for (var we = 0; we < worldEvents.length; we++) {
    var ev = worldEvents[we];
    var domain = (ev.domain || '').toString().toLowerCase();
    var text = eventText(ev);
    if (domain === 'safety') baseCrimeCount++;
    if (text.indexOf('theft') >= 0 || text.indexOf('break-in') >= 0 ||
        text.indexOf('pursuit') >= 0 || text.indexOf('assault') >= 0) {
      baseCrimeCount++;
    }
  }

  // Event attractiveness: culture/community/holiday/festival + story seeds/hooks
  var baseEventAttract = 0;
  for (var we2 = 0; we2 < worldEvents.length; we2++) {
    var ev2 = worldEvents[we2];
    var domain2 = (ev2.domain || '').toString().toLowerCase();
    var text2 = eventText(ev2);

    if (domain2 === 'culture' || domain2 === 'community' || domain2 === 'holiday' || domain2 === 'festival') {
      baseEventAttract++;
    }
    if (text2.indexOf('festival') >= 0 || text2.indexOf('concert') >= 0 || text2.indexOf('art') >= 0 ||
        text2.indexOf('celebration') >= 0 || text2.indexOf('parade') >= 0 || text2.indexOf('market') >= 0) {
      baseEventAttract++;
    }
  }

  for (var si = 0; si < storySeeds.length; si++) {
    var s = storySeeds[si];
    var seedText = (s.seed || s.text || '').toString().toLowerCase();
    if (seedText.indexOf('community') >= 0 || seedText.indexOf('culture') >= 0 ||
        seedText.indexOf('festival') >= 0 || seedText.indexOf('art') >= 0) {
      baseEventAttract++;
    }
  }

  for (var hi = 0; hi < storyHooks.length; hi++) {
    var h = storyHooks[hi];
    var hookText = (h.hook || h.text || '').toString().toLowerCase();
    if (hookText.indexOf('community') >= 0 || hookText.indexOf('culture') >= 0 ||
        hookText.indexOf('festival') >= 0 || hookText.indexOf('art') >= 0) {
      baseEventAttract++;
    }
  }

  // Retail vitality from dynamics
  var baseRetail = Math.round((Number(dynamics.retail || 1) * 5) + (Number(dynamics.publicSpaces || 1) * 3));

  // Base sentiment
  var baseSentiment = Number(dynamics.sentiment || 0);

  // Demographic drift: number OR object { migration }
  var driftRaw = (typeof S.demographicDrift !== 'undefined') ? S.demographicDrift :
    (typeof S.migrationDrift !== 'undefined') ? S.migrationDrift : 0;

  var driftNum = (typeof driftRaw === 'number')
    ? driftRaw
    : (driftRaw && typeof driftRaw === 'object' && typeof driftRaw.migration === 'number')
      ? driftRaw.migration
      : 0;

  var baseDemoLabel = 'Stable';
  if (driftNum < -35) baseDemoLabel = 'Outflow accelerating';
  else if (driftNum < -20) baseDemoLabel = 'Outflow pressure';
  else if (driftNum < -5) baseDemoLabel = 'Mild outflow';
  else if (driftNum > 20) baseDemoLabel = 'Inflow surge';
  else if (driftNum > 5) baseDemoLabel = 'Mild inflow';

  // Arc lookup by neighborhood
  var arcByNeighborhood = {};
  for (var ai = 0; ai < eventArcs.length; ai++) {
    var arc = eventArcs[ai];
    var hood = arc.neighborhood || arc.Neighborhood || '';
    if (hood && !arcByNeighborhood[hood]) arcByNeighborhood[hood] = arc;
  }

  // Neighborhood baseline profiles
  var neighborhoods = {
    'Downtown': { nightlifeMod: 1.3, noiseMod: 1.4, crimeMod: 1.1, retailMod: 1.3, eventMod: 1.2, sentimentMod: 0.0 },
    'Temescal': { nightlifeMod: 1.1, noiseMod: 0.9, crimeMod: 0.7, retailMod: 1.2, eventMod: 1.1, sentimentMod: 0.05 },
    'Laurel': { nightlifeMod: 0.8, noiseMod: 0.7, crimeMod: 0.6, retailMod: 0.9, eventMod: 0.8, sentimentMod: 0.03 },
    'West Oakland': { nightlifeMod: 0.9, noiseMod: 1.1, crimeMod: 1.3, retailMod: 0.7, eventMod: 0.7, sentimentMod: -0.05 },
    'Fruitvale': { nightlifeMod: 1.0, noiseMod: 1.0, crimeMod: 1.0, retailMod: 1.0, eventMod: 1.0, sentimentMod: 0.0 },
    'Jack London': { nightlifeMod: 1.2, noiseMod: 1.2, crimeMod: 0.9, retailMod: 1.1, eventMod: 1.3, sentimentMod: 0.02 },
    'Rockridge': { nightlifeMod: 0.9, noiseMod: 0.6, crimeMod: 0.5, retailMod: 1.2, eventMod: 0.9, sentimentMod: 0.08 },
    'Adams Point': { nightlifeMod: 0.8, noiseMod: 0.7, crimeMod: 0.6, retailMod: 0.8, eventMod: 0.7, sentimentMod: 0.04 },
    'Grand Lake': { nightlifeMod: 1.0, noiseMod: 0.8, crimeMod: 0.7, retailMod: 1.1, eventMod: 1.0, sentimentMod: 0.05 },
    'Piedmont Ave': { nightlifeMod: 0.7, noiseMod: 0.5, crimeMod: 0.4, retailMod: 1.0, eventMod: 0.6, sentimentMod: 0.06 },
    'Chinatown': { nightlifeMod: 1.1, noiseMod: 1.3, crimeMod: 1.0, retailMod: 1.0, eventMod: 1.1, sentimentMod: -0.02 },
    'Brooklyn': { nightlifeMod: 0.7, noiseMod: 0.8, crimeMod: 0.9, retailMod: 0.7, eventMod: 0.5, sentimentMod: -0.03 },
    'Eastlake': { nightlifeMod: 0.8, noiseMod: 0.7, crimeMod: 0.7, retailMod: 0.8, eventMod: 0.7, sentimentMod: 0.01 },
    'Glenview': { nightlifeMod: 0.6, noiseMod: 0.5, crimeMod: 0.4, retailMod: 0.7, eventMod: 0.5, sentimentMod: 0.05 },
    'Dimond': { nightlifeMod: 0.7, noiseMod: 0.6, crimeMod: 0.5, retailMod: 0.8, eventMod: 0.6, sentimentMod: 0.04 },
    'Ivy Hill': { nightlifeMod: 0.5, noiseMod: 0.4, crimeMod: 0.3, retailMod: 0.5, eventMod: 0.4, sentimentMod: 0.06 },
    'San Antonio': { nightlifeMod: 0.9, noiseMod: 1.0, crimeMod: 1.1, retailMod: 0.8, eventMod: 0.8, sentimentMod: -0.02 }
  };

  // Holiday / calendar neighborhood boosts
  var holidayMods = buildHolidayNeighborhoodMods_(holiday, isFirstFriday, isCreationDay, sportsSeason);

  // Helpers
  function round2(n) { return Math.round(n * 100) / 100; }
  function variance() { return (Math.random() - 0.5) * 0.2; }

  // Ensure we have enough rows (no clearing)
  var neededRows = 1 + NMAP_NEIGHBORHOODS.length;
  if (sheet.getLastRow() < neededRows) {
    sheet.insertRowsAfter(sheet.getLastRow(), neededRows - sheet.getLastRow());
  }

  // Build batch rows
  var out = [];

  for (var i = 0; i < NMAP_NEIGHBORHOODS.length; i++) {
    var name = NMAP_NEIGHBORHOODS[i];
    var profile = neighborhoods[name];
    var hMod = holidayMods[name] || {};

    var effectiveEventMod = profile.eventMod * (hMod.eventMod || 1);
    var effectiveNightlifeMod = profile.nightlifeMod * (hMod.nightlifeMod || 1);
    var effectiveNoiseMod = profile.noiseMod * (hMod.noiseMod || 1);
    var effectiveSentimentMod = profile.sentimentMod + (hMod.sentimentMod || 0);

    var nightlife = round2(baseNightlife * effectiveNightlifeMod * (1 + variance()));
    var noise = round2(Math.max(0, baseNoise * effectiveNoiseMod + (variance() * 2)));
    var crime = Math.max(0, Math.round(baseCrimeCount * profile.crimeMod + (Math.random() < 0.3 ? 1 : 0)));
    var retail = round2(Math.max(0, baseRetail * profile.retailMod * (1 + variance())));
    var eventAttract = Math.max(0, Math.round(baseEventAttract * effectiveEventMod));
    var sent = round2(baseSentiment + effectiveSentimentMod + (variance() * 0.1));

    var demoLabel = getDemographicMarkerV35_(name, baseDemoLabel, arcByNeighborhood, S, holiday, isFirstFriday, isCreationDay);

    out.push([
      now, cycle, name,
      nightlife, noise, crime,
      retail, eventAttract, sent,
      demoLabel,
      holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason
    ]);
  }

  // Write rows 2:N in one call
  sheet.getRange(2, 1, out.length, NEIGHBORHOOD_MAP_HEADERS.length).setValues(out);

  Logger.log('saveV3NeighborhoodMap_ v3.5: Updated ' + out.length + ' neighborhoods | Cycle ' + cycle + ' | Holiday: ' + holiday);
}


/**
 * Append-only schema enforcement (never clears, never reorders).
 * ES5 compatible version.
 */
function ensureNeighborhoodMapSchemaAppendOnly_(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var existingRaw = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var existing = [];
  for (var e = 0; e < existingRaw.length; e++) {
    existing.push(String(existingRaw[e]));
  }

  // If header row is blank-ish, initialize safely
  var hasAny = false;
  for (var h = 0; h < existing.length; h++) {
    if ((existing[h] || '').trim() !== '') {
      hasAny = true;
      break;
    }
  }
  if (!hasAny) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  // Append missing headers at end only
  var missing = [];
  for (var m = 0; m < headers.length; m++) {
    if (existing.indexOf(headers[m]) === -1) {
      missing.push(headers[m]);
    }
  }
  if (missing.length > 0) {
    var startCol = existing.length + 1;
    sheet.insertColumnsAfter(existing.length, missing.length);
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
  }

  // If sheet has fewer columns than schema, extend
  if (sheet.getLastColumn() < headers.length) {
    sheet.insertColumnsAfter(sheet.getLastColumn(), headers.length - sheet.getLastColumn());
  }

  // Ensure the first 15 headers exist somewhere
  var finalCols = sheet.getLastColumn();
  var afterRaw = sheet.getRange(1, 1, 1, finalCols).getValues()[0];
  var after = [];
  for (var a = 0; a < afterRaw.length; a++) {
    after.push(String(afterRaw[a]));
  }
  var stillMissing = [];
  for (var sm = 0; sm < headers.length; sm++) {
    if (after.indexOf(headers[sm]) === -1) {
      stillMissing.push(headers[sm]);
    }
  }
  if (stillMissing.length > 0) {
    var startCol2 = after.length + 1;
    sheet.insertColumnsAfter(after.length, stillMissing.length);
    sheet.getRange(1, startCol2, 1, stillMissing.length).setValues([stillMissing]);
  }

  return sheet;
}


function buildHolidayNeighborhoodMods_(holiday, isFirstFriday, isCreationDay, sportsSeason) {
  var mods = {};

  if (holiday === 'LunarNewYear') {
    mods['Chinatown'] = { eventMod: 2.5, nightlifeMod: 1.5, noiseMod: 1.5, sentimentMod: 0.15 };
    mods['Downtown'] = { eventMod: 1.3, nightlifeMod: 1.2 };
  }

  if (holiday === 'CincoDeMayo' || holiday === 'DiaDeMuertos') {
    mods['Fruitvale'] = { eventMod: 2.5, nightlifeMod: 1.5, noiseMod: 1.4, sentimentMod: 0.15 };
    mods['San Antonio'] = { eventMod: 1.5, nightlifeMod: 1.2 };
  }

  if (holiday === 'Juneteenth') {
    mods['West Oakland'] = { eventMod: 2.0, nightlifeMod: 1.3, sentimentMod: 0.1 };
    mods['Downtown'] = { eventMod: 1.3 };
  }

  if (holiday === 'OaklandPride') {
    mods['Downtown'] = { eventMod: 2.5, nightlifeMod: 1.8, noiseMod: 1.5, sentimentMod: 0.2 };
    mods['Grand Lake'] = { eventMod: 2.0, nightlifeMod: 1.5, sentimentMod: 0.15 };
    mods['Adams Point'] = { eventMod: 1.5, nightlifeMod: 1.3 };
  }

  if (holiday === 'ArtSoulFestival') {
    mods['Downtown'] = { eventMod: 2.5, nightlifeMod: 1.6, noiseMod: 1.4, sentimentMod: 0.15 };
    mods['Jack London'] = { eventMod: 1.5, nightlifeMod: 1.3 };
  }

  if (holiday === 'NewYearsEve') {
    mods['Downtown'] = { eventMod: 2.0, nightlifeMod: 2.0, noiseMod: 1.8, sentimentMod: 0.1 };
    mods['Jack London'] = { eventMod: 1.8, nightlifeMod: 1.8, noiseMod: 1.5 };
    mods['Grand Lake'] = { eventMod: 1.3, nightlifeMod: 1.4 };
  }

  if (holiday === 'Halloween') {
    mods['Temescal'] = { eventMod: 1.8, nightlifeMod: 1.3, noiseMod: 1.2 };
    mods['Rockridge'] = { eventMod: 1.5, nightlifeMod: 1.2 };
    mods['Piedmont Ave'] = { eventMod: 1.3, nightlifeMod: 1.1 };
  }

  if (holiday === 'StPatricksDay') {
    mods['Jack London'] = { eventMod: 1.8, nightlifeMod: 2.0, noiseMod: 1.5 };
    mods['Downtown'] = { eventMod: 1.3, nightlifeMod: 1.5 };
  }

  if (holiday === 'OpeningDay') {
    mods['Jack London'] = { eventMod: 2.5, nightlifeMod: 1.8, noiseMod: 1.6, sentimentMod: 0.1 };
    mods['Downtown'] = { eventMod: 1.5, nightlifeMod: 1.3 };
  }

  if (isFirstFriday) {
    mods['Temescal'] = mods['Temescal'] || {};
    mods['Temescal'].eventMod = (mods['Temescal'].eventMod || 1) * 1.8;
    mods['Temescal'].nightlifeMod = (mods['Temescal'].nightlifeMod || 1) * 1.4;

    mods['Downtown'] = mods['Downtown'] || {};
    mods['Downtown'].eventMod = (mods['Downtown'].eventMod || 1) * 1.5;

    mods['Jack London'] = mods['Jack London'] || {};
    mods['Jack London'].eventMod = (mods['Jack London'].eventMod || 1) * 1.3;
  }

  if (isCreationDay) {
    mods['Downtown'] = mods['Downtown'] || {};
    mods['Downtown'].eventMod = (mods['Downtown'].eventMod || 1) * 1.5;
    mods['Downtown'].sentimentMod = (mods['Downtown'].sentimentMod || 0) + 0.1;

    mods['West Oakland'] = mods['West Oakland'] || {};
    mods['West Oakland'].eventMod = (mods['West Oakland'].eventMod || 1) * 1.3;
  }

  if (sportsSeason === 'championship') {
    mods['Jack London'] = mods['Jack London'] || {};
    mods['Jack London'].eventMod = (mods['Jack London'].eventMod || 1) * 2.0;
    mods['Jack London'].nightlifeMod = (mods['Jack London'].nightlifeMod || 1) * 1.8;
    mods['Jack London'].noiseMod = (mods['Jack London'].noiseMod || 1) * 1.5;

    mods['Downtown'] = mods['Downtown'] || {};
    mods['Downtown'].eventMod = (mods['Downtown'].eventMod || 1) * 1.5;
  } else if (sportsSeason === 'playoffs') {
    mods['Jack London'] = mods['Jack London'] || {};
    mods['Jack London'].eventMod = (mods['Jack London'].eventMod || 1) * 1.5;
    mods['Jack London'].nightlifeMod = (mods['Jack London'].nightlifeMod || 1) * 1.4;
  }

  return mods;
}


function getDemographicMarkerV35_(neighborhood, baseLabel, arcByNeighborhood, summary, holiday, isFirstFriday, isCreationDay) {

  // Calendar-first markers
  if (holiday === 'LunarNewYear' && neighborhood === 'Chinatown') return 'Lunar New Year celebration zone';
  if ((holiday === 'CincoDeMayo' || holiday === 'DiaDeMuertos') && neighborhood === 'Fruitvale') {
    return holiday === 'CincoDeMayo' ? 'Cinco de Mayo celebration zone' : 'Día de los Muertos observance zone';
  }
  if (holiday === 'OaklandPride' && (neighborhood === 'Downtown' || neighborhood === 'Grand Lake')) return 'Pride celebration zone';
  if (holiday === 'ArtSoulFestival' && neighborhood === 'Downtown') return 'Art & Soul Festival zone';
  if (holiday === 'Juneteenth' && neighborhood === 'West Oakland') return 'Juneteenth celebration zone';
  if (isFirstFriday && neighborhood === 'Temescal') return 'First Friday arts walk zone';
  if (isCreationDay && neighborhood === 'Downtown') return 'Creation Day celebration zone';

  // Arc influence
  var arc = arcByNeighborhood[neighborhood];
  if (arc && arc.phase !== 'resolved') {
    var arcType = (arc.type || arc.Type || '').toString().toLowerCase();
    if (arcType === 'health-crisis') return 'Health crisis zone';
    if (arcType === 'crisis') return 'Civic pressure zone';
    if (arcType === 'pattern-wave') return 'Pattern-wave zone';
    if (arcType === 'demographic') return 'Demographic pressure zone';
    if (arcType === 'economic-crisis') return 'Economic strain zone';
  }

  // Shock hinting
  var shockFlag = (summary.shockFlag || '').toString();
  if (neighborhood === 'Downtown' && shockFlag === 'shock-flag') return 'Shock event zone';

  return baseLabel;
}
