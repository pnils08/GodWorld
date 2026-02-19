/**
 * ============================================================================
 * updateNeighborhoodDemographics_ v1.0
 * ============================================================================
 *
 * Tier 3.2 Implementation: Phase 3 (Population) demographics integration.
 *
 * Updates Neighborhood_Demographics based on:
 * - Births/deaths (from World_Population changes)
 * - Migration (incoming/outgoing citizen profiles)
 * - Status changes (employment, illness)
 * - Calendar events (holidays affect demographic movement)
 *
 * Runs as part of Phase 3 after applyDemographicDrift_.
 *
 * ============================================================================
 */

function updateNeighborhoodDemographics_(ctx) {
  // Defensive guard
  if (!ctx || !ctx.ss) return;
  if (!ctx.summary) ctx.summary = {};

  var ss = ctx.ss;
  var S = ctx.summary;
  var cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;

  // Get current demographics
  var demographics = getNeighborhoodDemographics_(ss);

  // Check if we need to seed initial data
  var needsSeed = true;
  for (var hood in demographics) {
    if (demographics.hasOwnProperty(hood)) {
      needsSeed = false;
      break;
    }
  }

  if (needsSeed) {
    Logger.log('updateNeighborhoodDemographics_: No demographics found, seeding from ledger');
    demographics = seedNeighborhoodDemographicsFromLedger_(ss, cycle);
  }

  // Store previous demographics for shift calculation
  var previousDemographics = {};
  for (var hood in demographics) {
    if (demographics.hasOwnProperty(hood)) {
      previousDemographics[hood] = {
        students: demographics[hood].students,
        adults: demographics[hood].adults,
        seniors: demographics[hood].seniors,
        unemployed: demographics[hood].unemployed,
        sick: demographics[hood].sick
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var demographicDrift = S.demographicDrift || {};
  var driftFactors = S.demographicDriftFactors || [];
  var migration = (typeof demographicDrift === 'object') ? (demographicDrift.migration || 0) : demographicDrift;
  var illnessRate = (typeof demographicDrift === 'object') ? (demographicDrift.illnessRate || 0.05) : 0.05;
  var employmentRate = (typeof demographicDrift === 'object') ? (demographicDrift.employmentRate || 0.91) : 0.91;

  var holiday = S.holiday || 'none';
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || 'off-season';

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY DRIFT TO NEIGHBORHOODS
  // ═══════════════════════════════════════════════════════════════════════════

  // Determine neighborhood-specific modifiers based on calendar context
  var neighborhoodModifiers = buildNeighborhoodDemographicModifiers_(holiday, isFirstFriday, isCreationDay, sportsSeason);

  // Apply changes to each neighborhood
  for (var neighborhood in demographics) {
    if (!demographics.hasOwnProperty(neighborhood)) continue;

    var demo = demographics[neighborhood];
    var profile = NEIGHBORHOOD_PROFILES[neighborhood] || { studentMod: 1, adultMod: 1, seniorMod: 1 };
    var modifier = neighborhoodModifiers[neighborhood] || { inflowMod: 1, outflowMod: 1 };

    var totalPop = demo.students + demo.adults + demo.seniors;
    if (totalPop === 0) totalPop = 100; // Avoid division by zero

    // ─────────────────────────────────────────────────────────────────────────
    // MIGRATION EFFECTS
    // ─────────────────────────────────────────────────────────────────────────
    // Distribute migration across neighborhoods based on character
    var neighborhoodMigration = Math.round(migration / 17 * modifier.inflowMod);

    if (neighborhoodMigration > 0) {
      // Inflow: distribute by age profile
      demo.students += Math.round(neighborhoodMigration * 0.15 * profile.studentMod);
      demo.adults += Math.round(neighborhoodMigration * 0.70 * profile.adultMod);
      demo.seniors += Math.round(neighborhoodMigration * 0.15 * profile.seniorMod);
    } else if (neighborhoodMigration < 0) {
      // Outflow: proportional reduction with modifier
      var outflow = Math.abs(neighborhoodMigration) * modifier.outflowMod;
      demo.students = Math.max(0, demo.students - Math.round(outflow * 0.2));
      demo.adults = Math.max(0, demo.adults - Math.round(outflow * 0.6));
      demo.seniors = Math.max(0, demo.seniors - Math.round(outflow * 0.2));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ILLNESS EFFECTS
    // ─────────────────────────────────────────────────────────────────────────
    // Apply illness rate to neighborhood population
    var expectedSick = Math.round(totalPop * illnessRate);
    var sickDelta = expectedSick - demo.sick;

    // Gradual adjustment (don't swing wildly)
    if (Math.abs(sickDelta) > 3) {
      sickDelta = sickDelta > 0 ? 3 : -3;
    }
    demo.sick = Math.max(0, demo.sick + sickDelta);

    // ─────────────────────────────────────────────────────────────────────────
    // UNEMPLOYMENT EFFECTS
    // ─────────────────────────────────────────────────────────────────────────
    // Apply employment rate to working-age population
    var workingPop = demo.adults;
    var unemploymentRate = 1 - employmentRate;
    var expectedUnemployed = Math.round(workingPop * unemploymentRate);
    var unemployedDelta = expectedUnemployed - demo.unemployed;

    // Gradual adjustment
    if (Math.abs(unemployedDelta) > 3) {
      unemployedDelta = unemployedDelta > 0 ? 3 : -3;
    }
    demo.unemployed = Math.max(0, demo.unemployed + unemployedDelta);

    // ─────────────────────────────────────────────────────────────────────────
    // NATURAL POPULATION CHANGES
    // ─────────────────────────────────────────────────────────────────────────
    // Small natural aging/transitions each cycle

    // Students aging into adults (very slow)
    if (demo.students > 10 && Math.random() < 0.1) {
      demo.students--;
      demo.adults++;
    }

    // Adults aging into seniors (very slow)
    if (demo.adults > 10 && Math.random() < 0.05) {
      demo.adults--;
      demo.seniors++;
    }

    // Senior mortality (very rare)
    if (demo.seniors > 10 && Math.random() < 0.02) {
      demo.seniors--;
    }

    // Birth rate (very rare, adds to students)
    if (demo.adults > 20 && Math.random() < 0.03) {
      demo.students++;
    }

    // Store updated demographics
    demographics[neighborhood] = demo;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE UPDATES
  // ═══════════════════════════════════════════════════════════════════════════
  batchUpdateNeighborhoodDemographics_(ss, demographics, cycle);

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE SHIFTS FOR STORY SIGNALS
  // ═══════════════════════════════════════════════════════════════════════════
  var demographicShifts = calculateDemographicShifts_(previousDemographics, demographics);

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  S.neighborhoodDemographics = demographics;
  S.demographicShifts = demographicShifts;
  S.demographicShiftsCount = demographicShifts.length;

  // Log significant shifts
  var significantShifts = demographicShifts.filter(function(s) {
    return s.percentage && s.percentage >= 8;
  });

  if (significantShifts.length > 0) {
    Logger.log('updateNeighborhoodDemographics_: ' + significantShifts.length + ' significant shifts detected');
    for (var i = 0; i < significantShifts.length; i++) {
      Logger.log('  - ' + significantShifts[i].description);
    }
  }

  ctx.summary = S;
  Logger.log('updateNeighborhoodDemographics_ v1.0: Updated ' + Object.keys(demographics).length + ' neighborhoods | Cycle ' + cycle);
}


/**
 * Builds neighborhood-specific modifiers based on calendar context.
 * Certain holidays affect specific neighborhoods more than others.
 *
 * @param {string} holiday - Current holiday
 * @param {boolean} isFirstFriday - First Friday flag
 * @param {boolean} isCreationDay - Creation Day flag
 * @param {string} sportsSeason - Current sports season
 * @return {Object} Map of neighborhood -> { inflowMod, outflowMod }
 */
function buildNeighborhoodDemographicModifiers_(holiday, isFirstFriday, isCreationDay, sportsSeason) {
  var modifiers = {};

  // Default modifiers
  for (var i = 0; i < DEMO_NEIGHBORHOODS.length; i++) {
    var hood = DEMO_NEIGHBORHOODS[i];
    modifiers[hood] = { inflowMod: 1.0, outflowMod: 1.0 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HOLIDAY-SPECIFIC MODIFIERS
  // ─────────────────────────────────────────────────────────────────────────

  if (holiday === 'LunarNewYear') {
    modifiers['Chinatown'] = { inflowMod: 1.8, outflowMod: 0.5 };
  }

  if (holiday === 'CincoDeMayo' || holiday === 'DiaDeMuertos') {
    modifiers['Fruitvale'] = { inflowMod: 1.8, outflowMod: 0.5 };
    modifiers['San Antonio'] = { inflowMod: 1.4, outflowMod: 0.7 };
  }

  if (holiday === 'Juneteenth') {
    modifiers['West Oakland'] = { inflowMod: 1.6, outflowMod: 0.6 };
  }

  if (holiday === 'OaklandPride') {
    modifiers['Downtown'] = { inflowMod: 1.8, outflowMod: 0.5 };
    modifiers['Grand Lake'] = { inflowMod: 1.5, outflowMod: 0.6 };
    modifiers['Adams Point'] = { inflowMod: 1.3, outflowMod: 0.7 };
  }

  if (holiday === 'ArtSoulFestival') {
    modifiers['Downtown'] = { inflowMod: 1.8, outflowMod: 0.5 };
    modifiers['Jack London'] = { inflowMod: 1.4, outflowMod: 0.7 };
  }

  if (holiday === 'OpeningDay') {
    modifiers['Jack London'] = { inflowMod: 2.0, outflowMod: 0.4 };
    modifiers['Downtown'] = { inflowMod: 1.3, outflowMod: 0.8 };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY MODIFIERS (arts districts)
  // ─────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    modifiers['Temescal'] = modifiers['Temescal'] || { inflowMod: 1.0, outflowMod: 1.0 };
    modifiers['Temescal'].inflowMod *= 1.5;
    modifiers['Temescal'].outflowMod *= 0.7;

    modifiers['Downtown'] = modifiers['Downtown'] || { inflowMod: 1.0, outflowMod: 1.0 };
    modifiers['Downtown'].inflowMod *= 1.3;

    modifiers['Jack London'] = modifiers['Jack London'] || { inflowMod: 1.0, outflowMod: 1.0 };
    modifiers['Jack London'].inflowMod *= 1.2;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATION DAY MODIFIERS
  // ─────────────────────────────────────────────────────────────────────────
  if (isCreationDay) {
    modifiers['Downtown'] = modifiers['Downtown'] || { inflowMod: 1.0, outflowMod: 1.0 };
    modifiers['Downtown'].inflowMod *= 1.4;
    modifiers['Downtown'].outflowMod *= 0.6;

    // Settling energy - reduce outflow everywhere
    for (var hood in modifiers) {
      if (modifiers.hasOwnProperty(hood)) {
        modifiers[hood].outflowMod *= 0.8;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SPORTS SEASON MODIFIERS
  // ─────────────────────────────────────────────────────────────────────────
  if (sportsSeason === 'championship') {
    modifiers['Jack London'] = modifiers['Jack London'] || { inflowMod: 1.0, outflowMod: 1.0 };
    modifiers['Jack London'].inflowMod *= 2.0;
    modifiers['Jack London'].outflowMod *= 0.3;

    modifiers['Downtown'] = modifiers['Downtown'] || { inflowMod: 1.0, outflowMod: 1.0 };
    modifiers['Downtown'].inflowMod *= 1.5;
  } else if (sportsSeason === 'playoffs' || sportsSeason === 'post-season') {
    modifiers['Jack London'] = modifiers['Jack London'] || { inflowMod: 1.0, outflowMod: 1.0 };
    modifiers['Jack London'].inflowMod *= 1.5;
    modifiers['Jack London'].outflowMod *= 0.5;
  }

  return modifiers;
}


/**
 * ============================================================================
 * REFERENCE
 * ============================================================================
 *
 * DEMOGRAPHIC UPDATE FLOW:
 * 1. Get current demographics from sheet
 * 2. If empty, seed from Simulation_Ledger
 * 3. Store previous state for shift calculation
 * 4. Apply migration effects (distributed by neighborhood character)
 * 5. Apply illness/unemployment rate changes
 * 6. Apply natural population changes (aging, mortality, births)
 * 7. Write updated demographics
 * 8. Calculate demographic shifts for story signals
 *
 * CALENDAR MODIFIERS:
 * - LunarNewYear: Chinatown +80% inflow
 * - CincoDeMayo/DiaDeMuertos: Fruitvale +80% inflow
 * - Juneteenth: West Oakland +60% inflow
 * - OaklandPride: Downtown/Grand Lake +80%/+50% inflow
 * - ArtSoulFestival: Downtown +80% inflow
 * - OpeningDay: Jack London +100% inflow
 * - First Friday: Temescal +50%, Downtown +30% inflow
 * - Creation Day: Downtown +40% inflow, global -20% outflow
 * - Championship: Jack London +100% inflow
 * - Playoffs: Jack London +50% inflow
 *
 * OUTPUT:
 * - ctx.summary.neighborhoodDemographics: Current demographics map
 * - ctx.summary.demographicShifts: Array of significant shifts
 * - ctx.summary.demographicShiftsCount: Number of shifts detected
 *
 * ============================================================================
 */
