/**
 * ============================================================================
 * saveV3NeighborhoodMap_ v3.4
 * ============================================================================
 *
 * v3.4 Fixes:
 * - STRICT schema safety: only appends missing columns at END (never clears)
 * - No auto-wipe / no destructive "needsInit" behavior
 * - Robust parsing of worldEvents (uses subdomain/subtype/description)
 * - Robust demographic drift (handles object vs number)
 * - Batch write rows (faster / less quota)
 *
 * SCHEMA TARGET (15 cols, append-only):
 * Timestamp | Cycle | Neighborhood | NightlifeProfile | NoiseIndex | CrimeIndex |
 * RetailVitality | EventAttractiveness | Sentiment | DemographicMarker |
 * Holiday | HolidayPriority | FirstFriday | CreationDay | SportsSeason
 *
 * ============================================================================
 */

function saveV3NeighborhoodMap_(ctx) {

  const ss = ctx.ss;

  const HEADERS = [
    'Timestamp', 'Cycle', 'Neighborhood', 'NightlifeProfile', 'NoiseIndex',
    'CrimeIndex', 'RetailVitality', 'EventAttractiveness', 'Sentiment',
    'DemographicMarker', 'Holiday', 'HolidayPriority', 'FirstFriday',
    'CreationDay', 'SportsSeason'
  ];

  const NEIGHBORHOODS = [
    'Downtown', 'Temescal', 'Laurel', 'West Oakland', 'Fruitvale', 'Jack London',
    'Rockridge', 'Adams Point', 'Grand Lake', 'Piedmont Ave', 'Chinatown',
    'Brooklyn', 'Eastlake', 'Glenview', 'Dimond', 'Ivy Hill', 'San Antonio'
  ];

  const sheet = ensureNeighborhoodMapSchemaAppendOnly_(ss, 'Neighborhood_Map', HEADERS);

  const S = ctx.summary || (ctx.summary = {});
  const cycle = (ctx.config && typeof ctx.config.cycleCount !== 'undefined')
    ? ctx.config.cycleCount
    : (S.cycleId || 0);
  const now = ctx.now || new Date();

  // Calendar context
  const holiday = S.holiday || 'none';
  const holidayPriority = S.holidayPriority || 'none';
  const isFirstFriday = !!S.isFirstFriday;
  const isCreationDay = !!S.isCreationDay;
  const sportsSeason = S.sportsSeason || 'off-season';

  // Pull simulation signals
  const dynamics = S.cityDynamics || {};
  const weather = S.weather || {};
  const worldEvents = S.worldEvents || [];
  const storySeeds = S.storySeeds || [];
  const storyHooks = S.storyHooks || [];
  const eventArcs = S.eventArcs || S.v3Arcs || [];

  // Base values
  const baseNightlife = Number(dynamics.nightlife || 0.7);

  // Noise derived from traffic + weather impact
  const baseNoise =
    ((Number(dynamics.traffic || 1) * 5) +
      ((Number(weather.impact || 1) - 1) * 3));

  // Robust event text extraction
  function eventText(ev) {
    const parts = [
      ev.subdomain, ev.subtype, ev.description, ev.summary, ev.title
    ].filter(Boolean).join(' ');
    return parts.toString().toLowerCase();
  }

  // Crime count: SAFETY domain + keyword hits
  let baseCrimeCount = 0;
  worldEvents.forEach(ev => {
    const domain = (ev.domain || '').toString().toLowerCase();
    const text = eventText(ev);
    if (domain === 'safety') baseCrimeCount++;
    if (text.includes('theft') || text.includes('break-in') || text.includes('pursuit') || text.includes('assault')) {
      baseCrimeCount++;
    }
  });

  // Event attractiveness: culture/community/holiday/festival + story seeds/hooks
  let baseEventAttract = 0;
  worldEvents.forEach(ev => {
    const domain = (ev.domain || '').toString().toLowerCase();
    const text = eventText(ev);

    if (domain === 'culture' || domain === 'community' || domain === 'holiday' || domain === 'festival') {
      baseEventAttract++;
    }
    if (text.includes('festival') || text.includes('concert') || text.includes('art') ||
      text.includes('celebration') || text.includes('parade') || text.includes('market')) {
      baseEventAttract++;
    }
  });

  storySeeds.forEach(s => {
    const text = (s.seed || s.text || '').toString().toLowerCase();
    if (text.includes('community') || text.includes('culture') || text.includes('festival') || text.includes('art')) {
      baseEventAttract++;
    }
  });

  storyHooks.forEach(h => {
    const text = (h.hook || h.text || '').toString().toLowerCase();
    if (text.includes('community') || text.includes('culture') || text.includes('festival') || text.includes('art')) {
      baseEventAttract++;
    }
  });

  // Retail vitality from dynamics
  const baseRetail = Math.round((Number(dynamics.retail || 1) * 5) + (Number(dynamics.publicSpaces || 1) * 3));

  // Base sentiment
  const baseSentiment = Number(dynamics.sentiment || 0);

  // Demographic drift: number OR object { migration }
  const driftRaw = (typeof S.demographicDrift !== 'undefined') ? S.demographicDrift :
    (typeof S.migrationDrift !== 'undefined') ? S.migrationDrift : 0;

  const driftNum = (typeof driftRaw === 'number')
    ? driftRaw
    : (driftRaw && typeof driftRaw === 'object' && typeof driftRaw.migration === 'number')
      ? driftRaw.migration
      : 0;

  let baseDemoLabel = 'Stable';
  if (driftNum < -35) baseDemoLabel = 'Outflow accelerating';
  else if (driftNum < -20) baseDemoLabel = 'Outflow pressure';
  else if (driftNum < -5) baseDemoLabel = 'Mild outflow';
  else if (driftNum > 20) baseDemoLabel = 'Inflow surge';
  else if (driftNum > 5) baseDemoLabel = 'Mild inflow';

  // Arc lookup by neighborhood (optional influence)
  const arcByNeighborhood = {};
  eventArcs.forEach(arc => {
    const hood = arc.neighborhood || arc.Neighborhood || '';
    if (hood && !arcByNeighborhood[hood]) arcByNeighborhood[hood] = arc;
  });

  // Neighborhood baseline profiles
  const neighborhoods = {
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

  // Holiday / calendar neighborhood boosts (kept from your v3.3 design)
  const holidayMods = buildHolidayNeighborhoodMods_(holiday, isFirstFriday, isCreationDay, sportsSeason);

  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const col = name => headerRow.indexOf(name);

  const round2 = n => Math.round(n * 100) / 100;
  const variance = () => (Math.random() - 0.5) * 0.2;

  // Ensure we have enough rows (no clearing)
  const neededRows = 1 + NEIGHBORHOODS.length;
  if (sheet.getLastRow() < neededRows) {
    sheet.insertRowsAfter(sheet.getLastRow(), neededRows - sheet.getLastRow());
  }

  // Build batch rows for columns A:O only (15)
  const out = [];

  for (let i = 0; i < NEIGHBORHOODS.length; i++) {
    const name = NEIGHBORHOODS[i];
    const profile = neighborhoods[name];
    const hMod = holidayMods[name] || {};

    const effectiveEventMod = profile.eventMod * (hMod.eventMod || 1);
    const effectiveNightlifeMod = profile.nightlifeMod * (hMod.nightlifeMod || 1);
    const effectiveNoiseMod = profile.noiseMod * (hMod.noiseMod || 1);
    const effectiveSentimentMod = profile.sentimentMod + (hMod.sentimentMod || 0);

    const nightlife = round2(baseNightlife * effectiveNightlifeMod * (1 + variance()));
    const noise = round2(Math.max(0, baseNoise * effectiveNoiseMod + (variance() * 2)));
    const crime = Math.max(0, Math.round(baseCrimeCount * profile.crimeMod + (Math.random() < 0.3 ? 1 : 0)));
    const retail = round2(Math.max(0, baseRetail * profile.retailMod * (1 + variance())));
    const eventAttract = Math.max(0, Math.round(baseEventAttract * effectiveEventMod));
    const sent = round2(baseSentiment + effectiveSentimentMod + (variance() * 0.1));

    const demoLabel = getDemographicMarkerV34_(name, baseDemoLabel, arcByNeighborhood, S, holiday, isFirstFriday, isCreationDay);

    out.push([
      now, cycle, name,
      nightlife, noise, crime,
      retail, eventAttract, sent,
      demoLabel,
      holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason
    ]);
  }

  // Write A:O rows 2..N in one call
  sheet.getRange(2, 1, out.length, HEADERS.length).setValues(out);

  Logger.log('saveV3NeighborhoodMap_ v3.4: Updated ' + out.length + ' neighborhoods | Cycle ' + cycle + ' | Holiday: ' + holiday);
}


/**
 * Append-only schema enforcement (never clears, never reorders).
 * - If sheet missing: create + write headers.
 * - If headers missing: append missing headers at END only.
 */
function ensureNeighborhoodMapSchemaAppendOnly_(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String);

  // If header row is blank-ish, initialize safely
  const hasAny = existing.some(h => (h || '').trim() !== '');
  if (!hasAny) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return sheet;
  }

  // Append missing headers at end only
  const missing = headers.filter(h => existing.indexOf(h) === -1);
  if (missing.length > 0) {
    const startCol = existing.length + 1;
    sheet.insertColumnsAfter(existing.length, missing.length);
    sheet.getRange(1, startCol, 1, missing.length).setValues([missing]);
  }

  // If sheet has fewer columns than schema, extend (no header changes needed here)
  if (sheet.getLastColumn() < headers.length) {
    sheet.insertColumnsAfter(sheet.getLastColumn(), headers.length - sheet.getLastColumn());
  }

  // Ensure the first 15 headers exist somewhere; write missing ones (still append-only)
  const finalCols = sheet.getLastColumn();
  const after = sheet.getRange(1, 1, 1, finalCols).getValues()[0].map(String);
  const stillMissing = headers.filter(h => after.indexOf(h) === -1);
  if (stillMissing.length > 0) {
    const startCol2 = after.length + 1;
    sheet.insertColumnsAfter(after.length, stillMissing.length);
    sheet.getRange(1, startCol2, 1, stillMissing.length).setValues([stillMissing]);
  }

  return sheet;
}


function buildHolidayNeighborhoodMods_(holiday, isFirstFriday, isCreationDay, sportsSeason) {
  const mods = {};

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


function getDemographicMarkerV34_(neighborhood, baseLabel, arcByNeighborhood, summary, holiday, isFirstFriday, isCreationDay) {

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
  const arc = arcByNeighborhood[neighborhood];
  if (arc && arc.phase !== 'resolved') {
    const arcType = (arc.type || arc.Type || '').toString().toLowerCase();
    if (arcType === 'health-crisis') return 'Health crisis zone';
    if (arcType === 'crisis') return 'Civic pressure zone';
    if (arcType === 'pattern-wave') return 'Pattern-wave zone';
    if (arcType === 'demographic') return 'Demographic pressure zone';
    if (arcType === 'economic-crisis') return 'Economic strain zone';
  }

  // Shock hinting (lightweight)
  const shockFlag = (summary.shockFlag || '').toString();
  if (neighborhood === 'Downtown' && shockFlag === 'shock-flag') return 'Shock event zone';

  return baseLabel;
}
