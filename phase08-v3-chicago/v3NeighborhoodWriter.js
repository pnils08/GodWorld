/**
 * ============================================================================
 * saveV3NeighborhoodMap_ v3.3
 * ============================================================================
 *
 * Saves neighborhood profiles to Neighborhood_Map sheet with calendar context.
 *
 * v3.3 Enhancements:
 * - Calendar columns (Holiday, HolidayPriority, FirstFriday, CreationDay, SportsSeason)
 * - Holiday-specific neighborhood modifiers
 * - Calendar-aware event attractiveness
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v3.2):
 * - 17 Oakland neighborhoods
 * - Arc-aware demographic markers
 * - Update-in-place (no ledger bloat)
 * 
 * SCHEMA (15 columns):
 * Timestamp | Cycle | Neighborhood | NightlifeProfile | NoiseIndex | CrimeIndex | 
 * RetailVitality | EventAttractiveness | Sentiment | DemographicMarker |
 * Holiday | HolidayPriority | FirstFriday | CreationDay | SportsSeason
 * 
 * NEIGHBORHOODS (17 Oakland districts):
 * Downtown, Temescal, Laurel, West Oakland, Fruitvale, Jack London,
 * Rockridge, Adams Point, Grand Lake, Piedmont Ave, Chinatown,
 * Brooklyn, Eastlake, Glenview, Dimond, Ivy Hill, San Antonio
 * 
 * ============================================================================
 */

function saveV3NeighborhoodMap_(ctx) {

  const ss = ctx.ss;
  
  // v3.3: Expanded headers with calendar columns
  const HEADERS = [
    'Timestamp',          // A
    'Cycle',              // B
    'Neighborhood',       // C
    'NightlifeProfile',   // D
    'NoiseIndex',         // E
    'CrimeIndex',         // F
    'RetailVitality',     // G
    'EventAttractiveness',// H
    'Sentiment',          // I
    'DemographicMarker',  // J
    'Holiday',            // K (v3.3)
    'HolidayPriority',    // L (v3.3)
    'FirstFriday',        // M (v3.3)
    'CreationDay',        // N (v3.3)
    'SportsSeason'        // O (v3.3)
  ];

  const sheet = ensureSheet_(ss, 'Neighborhood_Map', HEADERS);

  const cycle = ctx.config.cycleCount || ctx.summary.cycleId;
  const now = ctx.now || new Date();

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.3: CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = ctx.summary.holiday || 'none';
  const holidayPriority = ctx.summary.holidayPriority || 'none';
  const isFirstFriday = ctx.summary.isFirstFriday || false;
  const isCreationDay = ctx.summary.isCreationDay || false;
  const sportsSeason = ctx.summary.sportsSeason || 'off-season';

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL SIMULATION SIGNALS (preserved from v3.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const dynamics = ctx.summary.cityDynamics || {};
  const weather = ctx.summary.weather || {};
  const worldEvents = ctx.summary.worldEvents || [];
  const storySeeds = ctx.summary.storySeeds || [];
  const storyHooks = ctx.summary.storyHooks || [];
  const eventArcs = ctx.summary.eventArcs || ctx.v3Arcs || [];

  // Base nightlife from dynamics
  const baseNightlife = dynamics.nightlife || 0.7;

  // Noise derived from traffic + weather impact
  const baseNoise = ((dynamics.traffic || 1) * 5) + ((weather.impact || 1) - 1) * 3;

  // Crime count from Safety domain events
  let baseCrimeCount = 0;
  worldEvents.forEach(ev => {
    const domain = (ev.domain || '').toLowerCase();
    const desc = (ev.description || '').toLowerCase();
    if (domain === 'safety') baseCrimeCount++;
    if (desc.includes('theft') || desc.includes('break-in') || desc.includes('pursuit')) baseCrimeCount++;
  });

  // Event attractiveness from community/culture events
  let baseEventAttract = 0;
  worldEvents.forEach(ev => {
    const domain = (ev.domain || '').toLowerCase();
    const desc = (ev.description || '').toLowerCase();
    if (domain === 'culture' || domain === 'community') baseEventAttract++;
    if (domain === 'festival' || domain === 'holiday') baseEventAttract++; // v3.3
    if (desc.includes('festival') || desc.includes('concert') || desc.includes('art')) baseEventAttract++;
    if (desc.includes('celebration') || desc.includes('parade') || desc.includes('market')) baseEventAttract++;
  });
  storySeeds.forEach(s => {
    const text = (s.seed || s.text || '').toLowerCase();
    if (text.includes('community') || text.includes('culture') || text.includes('festival')) baseEventAttract++;
  });
  storyHooks.forEach(h => {
    const text = (h.hook || h.text || '').toLowerCase();
    if (text.includes('community') || text.includes('culture') || text.includes('art')) baseEventAttract++;
  });

  // Retail vitality from dynamics
  const baseRetail = Math.round((dynamics.retail || 1) * 5 + (dynamics.publicSpaces || 1) * 3);

  // Base sentiment
  const baseSentiment = dynamics.sentiment || 0;

  // Base demographic marker from migration drift
  const demographicMarker = ctx.summary.demographicDrift || ctx.summary.migrationDrift || 0;
  let baseDemoLabel = 'Stable';
  if (demographicMarker < -35) baseDemoLabel = 'Outflow accelerating';
  else if (demographicMarker < -20) baseDemoLabel = 'Outflow pressure';
  else if (demographicMarker < -5) baseDemoLabel = 'Mild outflow';
  else if (demographicMarker > 20) baseDemoLabel = 'Inflow surge';
  else if (demographicMarker > 5) baseDemoLabel = 'Mild inflow';

  // ═══════════════════════════════════════════════════════════════════════════
  // v3.3: HOLIDAY-SPECIFIC NEIGHBORHOOD MODIFIERS
  // ═══════════════════════════════════════════════════════════════════════════
  const holidayMods = {};

  // Lunar New Year → Chinatown
  if (holiday === 'LunarNewYear') {
    holidayMods['Chinatown'] = { eventMod: 2.5, nightlifeMod: 1.5, noiseMod: 1.5, sentimentMod: 0.15 };
    holidayMods['Downtown'] = { eventMod: 1.3, nightlifeMod: 1.2 };
  }

  // Cinco de Mayo / Dia de Muertos → Fruitvale
  if (holiday === 'CincoDeMayo' || holiday === 'DiaDeMuertos') {
    holidayMods['Fruitvale'] = { eventMod: 2.5, nightlifeMod: 1.5, noiseMod: 1.4, sentimentMod: 0.15 };
    holidayMods['San Antonio'] = { eventMod: 1.5, nightlifeMod: 1.2 };
  }

  // Juneteenth → West Oakland
  if (holiday === 'Juneteenth') {
    holidayMods['West Oakland'] = { eventMod: 2.0, nightlifeMod: 1.3, sentimentMod: 0.1 };
    holidayMods['Downtown'] = { eventMod: 1.3 };
  }

  // Oakland Pride → Downtown, Grand Lake
  if (holiday === 'OaklandPride') {
    holidayMods['Downtown'] = { eventMod: 2.5, nightlifeMod: 1.8, noiseMod: 1.5, sentimentMod: 0.2 };
    holidayMods['Grand Lake'] = { eventMod: 2.0, nightlifeMod: 1.5, sentimentMod: 0.15 };
    holidayMods['Adams Point'] = { eventMod: 1.5, nightlifeMod: 1.3 };
  }

  // Art & Soul → Downtown
  if (holiday === 'ArtSoulFestival') {
    holidayMods['Downtown'] = { eventMod: 2.5, nightlifeMod: 1.6, noiseMod: 1.4, sentimentMod: 0.15 };
    holidayMods['Jack London'] = { eventMod: 1.5, nightlifeMod: 1.3 };
  }

  // New Years Eve → Downtown, Jack London
  if (holiday === 'NewYearsEve') {
    holidayMods['Downtown'] = { eventMod: 2.0, nightlifeMod: 2.0, noiseMod: 1.8, sentimentMod: 0.1 };
    holidayMods['Jack London'] = { eventMod: 1.8, nightlifeMod: 1.8, noiseMod: 1.5 };
    holidayMods['Grand Lake'] = { eventMod: 1.3, nightlifeMod: 1.4 };
  }

  // Halloween → Temescal, Rockridge
  if (holiday === 'Halloween') {
    holidayMods['Temescal'] = { eventMod: 1.8, nightlifeMod: 1.3, noiseMod: 1.2 };
    holidayMods['Rockridge'] = { eventMod: 1.5, nightlifeMod: 1.2 };
    holidayMods['Piedmont Ave'] = { eventMod: 1.3, nightlifeMod: 1.1 };
  }

  // St Patrick's Day → Jack London
  if (holiday === 'StPatricksDay') {
    holidayMods['Jack London'] = { eventMod: 1.8, nightlifeMod: 2.0, noiseMod: 1.5 };
    holidayMods['Downtown'] = { eventMod: 1.3, nightlifeMod: 1.5 };
  }

  // Opening Day → Jack London
  if (holiday === 'OpeningDay') {
    holidayMods['Jack London'] = { eventMod: 2.5, nightlifeMod: 1.8, noiseMod: 1.6, sentimentMod: 0.1 };
    holidayMods['Downtown'] = { eventMod: 1.5, nightlifeMod: 1.3 };
  }

  // First Friday → Temescal, Downtown, Jack London
  if (isFirstFriday) {
    holidayMods['Temescal'] = holidayMods['Temescal'] || {};
    holidayMods['Temescal'].eventMod = (holidayMods['Temescal'].eventMod || 1) * 1.8;
    holidayMods['Temescal'].nightlifeMod = (holidayMods['Temescal'].nightlifeMod || 1) * 1.4;
    
    holidayMods['Downtown'] = holidayMods['Downtown'] || {};
    holidayMods['Downtown'].eventMod = (holidayMods['Downtown'].eventMod || 1) * 1.5;
    
    holidayMods['Jack London'] = holidayMods['Jack London'] || {};
    holidayMods['Jack London'].eventMod = (holidayMods['Jack London'].eventMod || 1) * 1.3;
  }

  // Creation Day → Downtown, West Oakland
  if (isCreationDay) {
    holidayMods['Downtown'] = holidayMods['Downtown'] || {};
    holidayMods['Downtown'].eventMod = (holidayMods['Downtown'].eventMod || 1) * 1.5;
    holidayMods['Downtown'].sentimentMod = (holidayMods['Downtown'].sentimentMod || 0) + 0.1;
    
    holidayMods['West Oakland'] = holidayMods['West Oakland'] || {};
    holidayMods['West Oakland'].eventMod = (holidayMods['West Oakland'].eventMod || 1) * 1.3;
  }

  // Sports seasons → Jack London
  if (sportsSeason === 'championship') {
    holidayMods['Jack London'] = holidayMods['Jack London'] || {};
    holidayMods['Jack London'].eventMod = (holidayMods['Jack London'].eventMod || 1) * 2.0;
    holidayMods['Jack London'].nightlifeMod = (holidayMods['Jack London'].nightlifeMod || 1) * 1.8;
    holidayMods['Jack London'].noiseMod = (holidayMods['Jack London'].noiseMod || 1) * 1.5;
    
    holidayMods['Downtown'] = holidayMods['Downtown'] || {};
    holidayMods['Downtown'].eventMod = (holidayMods['Downtown'].eventMod || 1) * 1.5;
  } else if (sportsSeason === 'playoffs') {
    holidayMods['Jack London'] = holidayMods['Jack London'] || {};
    holidayMods['Jack London'].eventMod = (holidayMods['Jack London'].eventMod || 1) * 1.5;
    holidayMods['Jack London'].nightlifeMod = (holidayMods['Jack London'].nightlifeMod || 1) * 1.4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD PROFILES (preserved from v3.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const neighborhoods = {
    'Downtown':      { nightlifeMod: 1.3, noiseMod: 1.4, crimeMod: 1.1, retailMod: 1.3, eventMod: 1.2, sentimentMod: 0.0 },
    'Temescal':      { nightlifeMod: 1.1, noiseMod: 0.9, crimeMod: 0.7, retailMod: 1.2, eventMod: 1.1, sentimentMod: 0.05 },
    'Laurel':        { nightlifeMod: 0.8, noiseMod: 0.7, crimeMod: 0.6, retailMod: 0.9, eventMod: 0.8, sentimentMod: 0.03 },
    'West Oakland':  { nightlifeMod: 0.9, noiseMod: 1.1, crimeMod: 1.3, retailMod: 0.7, eventMod: 0.7, sentimentMod: -0.05 },
    'Fruitvale':     { nightlifeMod: 1.0, noiseMod: 1.0, crimeMod: 1.0, retailMod: 1.0, eventMod: 1.0, sentimentMod: 0.0 },
    'Jack London':   { nightlifeMod: 1.2, noiseMod: 1.2, crimeMod: 0.9, retailMod: 1.1, eventMod: 1.3, sentimentMod: 0.02 },
    'Rockridge':     { nightlifeMod: 0.9, noiseMod: 0.6, crimeMod: 0.5, retailMod: 1.2, eventMod: 0.9, sentimentMod: 0.08 },
    'Adams Point':   { nightlifeMod: 0.8, noiseMod: 0.7, crimeMod: 0.6, retailMod: 0.8, eventMod: 0.7, sentimentMod: 0.04 },
    'Grand Lake':    { nightlifeMod: 1.0, noiseMod: 0.8, crimeMod: 0.7, retailMod: 1.1, eventMod: 1.0, sentimentMod: 0.05 },
    'Piedmont Ave':  { nightlifeMod: 0.7, noiseMod: 0.5, crimeMod: 0.4, retailMod: 1.0, eventMod: 0.6, sentimentMod: 0.06 },
    'Chinatown':     { nightlifeMod: 1.1, noiseMod: 1.3, crimeMod: 1.0, retailMod: 1.0, eventMod: 1.1, sentimentMod: -0.02 },
    'Brooklyn':      { nightlifeMod: 0.7, noiseMod: 0.8, crimeMod: 0.9, retailMod: 0.7, eventMod: 0.5, sentimentMod: -0.03 },
    'Eastlake':      { nightlifeMod: 0.8, noiseMod: 0.7, crimeMod: 0.7, retailMod: 0.8, eventMod: 0.7, sentimentMod: 0.01 },
    'Glenview':      { nightlifeMod: 0.6, noiseMod: 0.5, crimeMod: 0.4, retailMod: 0.7, eventMod: 0.5, sentimentMod: 0.05 },
    'Dimond':        { nightlifeMod: 0.7, noiseMod: 0.6, crimeMod: 0.5, retailMod: 0.8, eventMod: 0.6, sentimentMod: 0.04 },
    'Ivy Hill':      { nightlifeMod: 0.5, noiseMod: 0.4, crimeMod: 0.3, retailMod: 0.5, eventMod: 0.4, sentimentMod: 0.06 },
    'San Antonio':   { nightlifeMod: 0.9, noiseMod: 1.0, crimeMod: 1.1, retailMod: 0.8, eventMod: 0.8, sentimentMod: -0.02 }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD ARC LOOKUP (for DemographicMarker overrides)
  // ═══════════════════════════════════════════════════════════════════════════
  const arcByNeighborhood = {};
  eventArcs.forEach(arc => {
    const hood = arc.neighborhood || arc.Neighborhood || '';
    if (hood && !arcByNeighborhood[hood]) {
      arcByNeighborhood[hood] = arc;
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ENSURE SHEET HAS CORRECT STRUCTURE
  // ═══════════════════════════════════════════════════════════════════════════
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const neighborhoodNames = Object.keys(neighborhoods);

  // Check if sheet needs initialization
  let needsInit = false;
  if (lastRow < 2 || lastCol < HEADERS.length) {
    needsInit = true;
  } else {
    // Check if first data row has a valid neighborhood name
    const firstNeighborhood = sheet.getRange(2, 3).getValue();
    if (!neighborhoods[firstNeighborhood]) {
      needsInit = true;
    }
  }

  if (needsInit) {
    initializeNeighborhoodMapV33_(sheet, HEADERS, neighborhoodNames);
  }

  // Get header for column index lookup
  const header = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const idx = function(name) { return header.indexOf(name); };

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE ROWS (not append)
  // ═══════════════════════════════════════════════════════════════════════════
  const round2 = n => Math.round(n * 100) / 100;

  for (let i = 0; i < neighborhoodNames.length; i++) {
    const name = neighborhoodNames[i];
    const profile = neighborhoods[name];
    const hMod = holidayMods[name] || {}; // v3.3: Holiday modifiers
    const rowNum = i + 2; // Row 1 is header

    // Add random daily variance per neighborhood
    const dailyVariance = () => (Math.random() - 0.5) * 0.2;

    // v3.3: Apply holiday modifiers
    const effectiveEventMod = profile.eventMod * (hMod.eventMod || 1);
    const effectiveNightlifeMod = profile.nightlifeMod * (hMod.nightlifeMod || 1);
    const effectiveNoiseMod = profile.noiseMod * (hMod.noiseMod || 1);
    const effectiveSentimentMod = profile.sentimentMod + (hMod.sentimentMod || 0);

    const nightlife = round2(baseNightlife * effectiveNightlifeMod * (1 + dailyVariance()));
    const noise = round2(Math.max(0, baseNoise * effectiveNoiseMod + dailyVariance() * 2));
    const crime = Math.max(0, Math.round(baseCrimeCount * profile.crimeMod + (Math.random() < 0.3 ? 1 : 0)));
    const retail = round2(Math.max(0, baseRetail * profile.retailMod * (1 + dailyVariance())));
    const eventAttract = Math.max(0, Math.round(baseEventAttract * effectiveEventMod));
    const sentiment = round2(baseSentiment + effectiveSentimentMod + dailyVariance() * 0.1);

    // Determine DemographicMarker with arc awareness
    let demoLabel = getDemographicMarkerV33_(name, baseDemoLabel, arcByNeighborhood, ctx.summary, holiday, isFirstFriday, isCreationDay);

    // Build row data array
    const rowData = new Array(HEADERS.length).fill('');
    if (idx('Timestamp') >= 0) rowData[idx('Timestamp')] = now;
    if (idx('Cycle') >= 0) rowData[idx('Cycle')] = cycle;
    if (idx('Neighborhood') >= 0) rowData[idx('Neighborhood')] = name;
    if (idx('NightlifeProfile') >= 0) rowData[idx('NightlifeProfile')] = nightlife;
    if (idx('NoiseIndex') >= 0) rowData[idx('NoiseIndex')] = noise;
    if (idx('CrimeIndex') >= 0) rowData[idx('CrimeIndex')] = crime;
    if (idx('RetailVitality') >= 0) rowData[idx('RetailVitality')] = retail;
    if (idx('EventAttractiveness') >= 0) rowData[idx('EventAttractiveness')] = eventAttract;
    if (idx('Sentiment') >= 0) rowData[idx('Sentiment')] = sentiment;
    if (idx('DemographicMarker') >= 0) rowData[idx('DemographicMarker')] = demoLabel;
    // v3.3: Calendar columns
    if (idx('Holiday') >= 0) rowData[idx('Holiday')] = holiday;
    if (idx('HolidayPriority') >= 0) rowData[idx('HolidayPriority')] = holidayPriority;
    if (idx('FirstFriday') >= 0) rowData[idx('FirstFriday')] = isFirstFriday;
    if (idx('CreationDay') >= 0) rowData[idx('CreationDay')] = isCreationDay;
    if (idx('SportsSeason') >= 0) rowData[idx('SportsSeason')] = sportsSeason;

    // Write row in place
    sheet.getRange(rowNum, 1, 1, rowData.length).setValues([rowData]);
  }

  Logger.log('saveV3NeighborhoodMap_ v3.3: Updated ' + neighborhoodNames.length + ' neighborhoods for Cycle ' + cycle + ' | Holiday: ' + holiday);
}


/**
 * Determine DemographicMarker with arc and calendar awareness (v3.3)
 */
function getDemographicMarkerV33_(neighborhood, baseLabel, arcByNeighborhood, summary, holiday, isFirstFriday, isCreationDay) {
  
  // v3.3: Holiday-specific markers take priority
  if (holiday === 'LunarNewYear' && neighborhood === 'Chinatown') {
    return 'Lunar New Year celebration zone';
  }
  if ((holiday === 'CincoDeMayo' || holiday === 'DiaDeMuertos') && neighborhood === 'Fruitvale') {
    return holiday === 'CincoDeMayo' ? 'Cinco de Mayo celebration zone' : 'Día de los Muertos observance zone';
  }
  if (holiday === 'OaklandPride' && (neighborhood === 'Downtown' || neighborhood === 'Grand Lake')) {
    return 'Pride celebration zone';
  }
  if (holiday === 'ArtSoulFestival' && neighborhood === 'Downtown') {
    return 'Art & Soul Festival zone';
  }
  if (holiday === 'Juneteenth' && neighborhood === 'West Oakland') {
    return 'Juneteenth celebration zone';
  }
  if (isFirstFriday && neighborhood === 'Temescal') {
    return 'First Friday arts walk zone';
  }
  if (isCreationDay && neighborhood === 'Downtown') {
    return 'Creation Day celebration zone';
  }

  // Check if this neighborhood has an active arc
  const arc = arcByNeighborhood[neighborhood];
  if (arc) {
    const arcType = (arc.type || arc.Type || '').toLowerCase();
    if (arcType === 'health-crisis') return 'Health crisis zone';
    if (arcType === 'crisis') return 'Civic pressure zone';
    if (arcType === 'pattern-wave') return 'Pattern-wave zone';
    if (arcType === 'instability') return 'Instability zone';
    if (arcType === 'festival') return 'Festival zone';
    if (arcType === 'sports-fever') return 'Sports fever zone';
    if (arcType === 'arts-walk') return 'Arts walk zone';
  }

  // Neighborhood-specific overrides based on known storylines
  const drift = summary.migrationDrift || 0;
  const illness = summary.illnessRate || 0;
  const patternFlag = summary.patternFlag || '';
  const shockFlag = summary.shockFlag || '';

  if (neighborhood === 'West Oakland' && drift < -30) {
    return 'Outflow accelerating';
  }

  if (neighborhood === 'Temescal' && illness > 0.08) {
    return 'Health monitoring';
  }

  if (neighborhood === 'Laurel' && patternFlag === 'micro-event-wave') {
    return 'Pattern-wave active';
  }

  if (neighborhood === 'Downtown' && shockFlag === 'shock-flag') {
    return 'Shock event zone';
  }

  return baseLabel;
}


/**
 * Initialize Neighborhood_Map with headers and neighborhood rows (v3.3)
 */
function initializeNeighborhoodMapV33_(sheet, headers, neighborhoodNames) {
  // Clear existing data
  sheet.clear();

  // Write headers
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Write placeholder rows for each neighborhood
  const now = new Date();
  const rows = [];

  for (let i = 0; i < neighborhoodNames.length; i++) {
    rows.push([
      now,                          // Timestamp
      0,                            // Cycle
      neighborhoodNames[i],         // Neighborhood
      0,                            // NightlifeProfile
      0,                            // NoiseIndex
      0,                            // CrimeIndex
      0,                            // RetailVitality
      0,                            // EventAttractiveness
      0,                            // Sentiment
      'Initializing',               // DemographicMarker
      'none',                       // Holiday (v3.3)
      'none',                       // HolidayPriority (v3.3)
      false,                        // FirstFriday (v3.3)
      false,                        // CreationDay (v3.3)
      'off-season'                  // SportsSeason (v3.3)
    ]);
  }

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  Logger.log('initializeNeighborhoodMapV33_: Initialized ' + neighborhoodNames.length + ' neighborhoods');
}


/**
 * ============================================================================
 * CLEANUP FUNCTION — Run manually to reset Neighborhood_Map (v3.3)
 * ============================================================================
 */

function cleanupNeighborhoodMapV33() {
  const SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk'; // Your sheet ID
  const ss = SpreadsheetApp.openById(SIM_SSID);
  const sheet = ss.getSheetByName('Neighborhood_Map');

  if (!sheet) {
    Logger.log('cleanupNeighborhoodMapV33: Sheet not found, creating new');
    ss.insertSheet('Neighborhood_Map');
  }

  const HEADERS = [
    'Timestamp', 'Cycle', 'Neighborhood', 'NightlifeProfile', 'NoiseIndex',
    'CrimeIndex', 'RetailVitality', 'EventAttractiveness', 'Sentiment',
    'DemographicMarker', 'Holiday', 'HolidayPriority', 'FirstFriday',
    'CreationDay', 'SportsSeason'
  ];

  const NEIGHBORHOODS = [
    'Downtown', 'Temescal', 'Laurel', 'West Oakland', 'Fruitvale',
    'Jack London', 'Rockridge', 'Adams Point', 'Grand Lake', 'Piedmont Ave',
    'Chinatown', 'Brooklyn', 'Eastlake', 'Glenview', 'Dimond', 'Ivy Hill',
    'San Antonio'
  ];

  const targetSheet = ss.getSheetByName('Neighborhood_Map');
  targetSheet.clear();
  targetSheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  const now = new Date();
  const rows = NEIGHBORHOODS.map(n => [
    now, 0, n, 0, 0, 0, 0, 0, 0, 'Pending cycle run',
    'none', 'none', false, false, 'off-season'
  ]);

  targetSheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);

  Logger.log('cleanupNeighborhoodMapV33: Complete. ' + NEIGHBORHOODS.length + ' Oakland neighborhoods initialized.');
}


/**
 * ============================================================================
 * NEIGHBORHOOD MAP SCHEMA v3.3
 * ============================================================================
 * 
 * COLUMNS (15):
 * A - Timestamp
 * B - Cycle
 * C - Neighborhood
 * D - NightlifeProfile
 * E - NoiseIndex
 * F - CrimeIndex
 * G - RetailVitality
 * H - EventAttractiveness
 * I - Sentiment
 * J - DemographicMarker
 * K - Holiday (v3.3)
 * L - HolidayPriority (v3.3)
 * M - FirstFriday (v3.3)
 * N - CreationDay (v3.3)
 * O - SportsSeason (v3.3)
 * 
 * HOLIDAY NEIGHBORHOOD MODIFIERS (v3.3):
 * 
 * | Holiday | Primary Neighborhood | Event Mod | Nightlife Mod |
 * |---------|---------------------|-----------|---------------|
 * | LunarNewYear | Chinatown | 2.5x | 1.5x |
 * | CincoDeMayo/DiaDeMuertos | Fruitvale | 2.5x | 1.5x |
 * | OaklandPride | Downtown, Grand Lake | 2.5x, 2.0x | 1.8x, 1.5x |
 * | ArtSoulFestival | Downtown | 2.5x | 1.6x |
 * | Juneteenth | West Oakland | 2.0x | 1.3x |
 * | NewYearsEve | Downtown, Jack London | 2.0x, 1.8x | 2.0x, 1.8x |
 * | Halloween | Temescal, Rockridge | 1.8x, 1.5x | 1.3x, 1.2x |
 * | StPatricksDay | Jack London | 1.8x | 2.0x |
 * | OpeningDay | Jack London | 2.5x | 1.8x |
 * | First Friday | Temescal, Downtown | 1.8x, 1.5x | 1.4x |
 * | Championship | Jack London | 2.0x | 1.8x |
 * | Playoffs | Jack London | 1.5x | 1.4x |
 * 
 * ============================================================================
 */