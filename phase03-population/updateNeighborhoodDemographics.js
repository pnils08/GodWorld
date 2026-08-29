/**
 * ============================================================================
 * updateNeighborhoodDemographics_ v1.3-e133
 * ============================================================================
 *
 * Tier 3.2 Implementation: Phase 3 (Population) demographics integration.
 *
 * v1.3-e133 (engine.133): hood Sick is a population-normalized ENVELOPE of the
 * city rate — structural weight (age mix × NoiseIndex × MedianIncome, the hood's
 * own canon) × same-cycle causes, Σ hood sick = cityRate × Σ pop; relief after
 * normalization; storm joins heat/flood. Plan docs/plans/2026-08-29-city-health-system.md D3.
 *
 * v1.2-W2a (engine.102): migration divisor is the live ND hood count with
 * Σ inflowMod normalization — Σ hood migration deltas ≈ city migration.
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
  var rng = safeRand_(ctx);

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
  // engine.102 W2b — fallbacks read World_Config; missing keys are LOUD. The
  // README sweep cited only the employment site, but the illness twin on the
  // next line is the same free-number class (acceptance criterion 2).
  var illnessFallbackRate = Number(ctx.config && ctx.config.illnessFallbackRate);
  if (isNaN(illnessFallbackRate)) {
    illnessFallbackRate = 0.05;
    pushMissingConfigWarning_(ctx, 'illnessFallbackRate', 0.05);
  }
  var employmentFallbackRate = Number(ctx.config && ctx.config.employmentFallbackRate);
  if (isNaN(employmentFallbackRate)) {
    employmentFallbackRate = 0.91;
    pushMissingConfigWarning_(ctx, 'employmentFallbackRate', 0.91);
  }
  var migration = (typeof demographicDrift === 'object') ? (demographicDrift.migration || 0) : demographicDrift;
  var illnessRate = (typeof demographicDrift === 'object') ? (demographicDrift.illnessRate || illnessFallbackRate) : illnessFallbackRate;
  var employmentRate = (typeof demographicDrift === 'object') ? (demographicDrift.employmentRate || employmentFallbackRate) : employmentFallbackRate;

  var holiday = S.holiday || 'none';
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = (S.sportsAtmosphereEnabled === true) ? (S.sportsSeason || 'off-season') : ''; // S302 gate

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY DRIFT TO NEIGHBORHOODS
  // ═══════════════════════════════════════════════════════════════════════════

  // Determine neighborhood-specific modifiers based on calendar context
  var neighborhoodModifiers = buildNeighborhoodDemographicModifiers_(holiday, isFirstFriday, isCreationDay, sportsSeason);

  // W2a (engine.102): pre-compute live hood count and total inflowMod for
  // migration normalization. The loaded demographics object is the canonical
  // hood set — this function writes the ND layer, so it counts ND hoods.
  var liveHoodNames = [];
  var inflowModSum = 0;
  for (var hName in demographics) {
    if (!demographics.hasOwnProperty(hName)) continue;
    liveHoodNames.push(hName);
    var hModifier = neighborhoodModifiers[hName] || { inflowMod: 1, outflowMod: 1 };
    inflowModSum += Number(hModifier.inflowMod) || 0;
  }
  var liveHoodCount = liveHoodNames.length;
  if (liveHoodCount === 0) {
    Logger.log('updateNeighborhoodDemographics_: no live neighborhoods, defaulting to 1');
    liveHoodCount = 1;
  }
  if (inflowModSum === 0) {
    Logger.log('updateNeighborhoodDemographics_: inflowModSum is zero, defaulting to live hood count');
    inflowModSum = liveHoodCount;
  }
  Logger.log('updateNeighborhoodDemographics_: liveHoodCount=' + liveHoodCount +
             ' inflowModSum=' + inflowModSum + ' | Cycle ' + cycle);

  // engine.133 D3 — the city rate is an ENVELOPE the hoods fill unevenly, not
  // a constant copied 22 times. Pre-pass: every hood's illness weight (its own
  // canon data × this cycle's real causes), then the population-weighted mean
  // so Σ hood expectedSick = cityRate × Σ pop exactly (modulo rounding) — the
  // same normalization W2a gave migration above. Plan D3.
  var illnessWeights = buildHoodIllnessWeights_(ctx, S, demographics);

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
    // W2a (engine.102): divisor was a constant 17 from the 17-hood era — live
    // ND has 21 hoods, so the hood layer over-allocated ~1.24x before holiday
    // mods. Divisor is now the live hood count, normalized by Σ inflowMod so
    // Σ hood deltas ≈ city migration (exact modulo rounding); with all mods at
    // 1.0 this collapses to migration / liveHoodCount, and holiday mods
    // self-temper the denominator.
    var meanInflowMod = inflowModSum / liveHoodCount;
    var neighborhoodMigration = Math.round(
      (migration / liveHoodCount) * (modifier.inflowMod / meanInflowMod)
    );

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
    // engine.71 CR-1 (S327) made the per-hood number come from REAL same-cycle
    // causes (heat wave, flood, chronic QoL) instead of a flat smear. engine.132
    // wired a delivering health initiative in as relief. engine.133 D3 finishes
    // the shape: the hood's share of the city rate is its structural weight
    // (age mix, density, income — its own canon data) × those same-cycle
    // causes, normalized across the loaded hood set so the hoods SUM to the
    // city envelope and never copy it. Relief applies AFTER normalization — a
    // clinic pulls its hood under its share and the aggregate sits under the
    // envelope; it does not push its patients onto the next hood over.
    var wRec = illnessWeights.byHood[neighborhood] || { weight: 1, structural: 1, event: 1 };
    var envelopeShare = wRec.weight / illnessWeights.mean;
    var expectedSick = totalPop * illnessRate * envelopeShare;

    var healthRelief71 = S.initiativeHealthRelief && S.initiativeHealthRelief[neighborhood];
    if (healthRelief71) {
      var reliefCoef133 = cfgNum_(ctx, ctx.config, 'illnessInitiativeRelief', 0.25) * healthRelief71;
      expectedSick = expectedSick * Math.max(0, 1 - reliefCoef133);
    }
    expectedSick = Math.round(expectedSick);
    var sickDelta = expectedSick - demo.sick;

    // engine.132 — converge on a STORY timescale, not a geological one.
    //
    // This was a flat +/-3 per cycle. Correct as a no-wild-swings guard, fatal as
    // a rate: Temescal sits 137 sick below its own population-scaled target, so
    // at 3/cycle the number needed ~46 cycles to arrive. Nothing in this project
    // survives 46 cycles — the crons read the last couple of cycles at each wake,
    // so a change that slow is invisible to every consumer and produces no story
    // at any point along the way. It is also why the largest hoods all sat at an
    // identical ~104: the residue of the pre-CR-1 flat writer, still crawling.
    //
    // Now a fraction of the remaining gap per cycle, so a real event resolves in
    // about 4-5 cycles and a citizen can live it. The old 3 becomes the FLOOR so
    // small gaps still close and the anti-swing intent survives.
    var convergeRate = cfgNum_(ctx, ctx.config, 'illnessConvergenceRate', 0.25);
    var maxStep = Math.max(3, Math.ceil(Math.abs(sickDelta) * convergeRate));
    if (Math.abs(sickDelta) > maxStep) {
      sickDelta = sickDelta > 0 ? maxStep : -maxStep;
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
    if (demo.students > 10 && rng() < 0.1) {
      demo.students--;
      demo.adults++;
    }

    // Adults aging into seniors (very slow)
    if (demo.adults > 10 && rng() < 0.05) {
      demo.adults--;
      demo.seniors++;
    }

    // Senior mortality (very rare)
    if (demo.seniors > 10 && rng() < 0.02) {
      demo.seniors--;
    }

    // Birth rate (very rare, adds to students)
    if (demo.adults > 20 && rng() < 0.03) {
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
  S.neighborhoodIllnessWeights = illnessWeights.byHood;   // engine.133 — audit + story consumers
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
  Logger.log('updateNeighborhoodDemographics_ v1.3-e133: Updated ' + Object.keys(demographics).length + ' neighborhoods | Cycle ' + cycle);
}


/**
 * engine.133 D3 — per-hood illness weights for the city envelope.
 *
 * structural (the hood's own canon, full-coverage layers only — verified 22/22
 * populated on live C104; HousingPressure is 8/22 and Business_Ledger is the
 * tracked subset, both excluded on purpose):
 *   age      seniors share vs the city's seniors share   (Neighborhood_Demographics)
 *   density  NoiseIndex vs the pop-weighted city mean     (Neighborhood_Map via S.neighborhoodState)
 *   income   pop-weighted city mean / MedianIncome        (Neighborhood_Map via S.neighborhoodState)
 * each a bounded factor around 1.0; product clamped [illnessHoodWeightMin, Max].
 *
 * event (this cycle's real causes, engine.71 CR-1 lineage): engine.70 salient
 * weather touching the hood — heat wave +0.25, storm/flood +0.15 — and chronic
 * QoL ±0.10 (Phase3-Crime runs before this at both entry points).
 *
 * Returns { byHood: { hood: { weight, structural, event } }, mean } where mean is
 * Σ(weight × pop) / Σ pop over the LOADED hood set (W2a rule — the loaded
 * demographics object is the canonical hood set, never a hand list).
 */
function buildHoodIllnessWeights_(ctx, S, demographics) {
  var wMin = cfgNum_(ctx, ctx.config, 'illnessHoodWeightMin', 0.5);
  var wMax = cfgNum_(ctx, ctx.config, 'illnessHoodWeightMax', 2.0);
  var nState = S.neighborhoodState || {};
  var clamp = function(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };

  // City means, population-weighted, over the loaded set.
  var totalPop = 0, totalSeniors = 0, noiseWeighted = 0, incomeWeighted = 0, noisePop = 0, incomePop = 0;
  var hood;
  for (hood in demographics) {
    if (!demographics.hasOwnProperty(hood)) continue;
    var d = demographics[hood];
    var pop = (Number(d.students) || 0) + (Number(d.adults) || 0) + (Number(d.seniors) || 0);
    if (pop <= 0) continue;
    totalPop += pop;
    totalSeniors += Number(d.seniors) || 0;
    var ns = nState[hood] || {};
    if (ns.noiseIndex !== null && ns.noiseIndex !== undefined && isFinite(Number(ns.noiseIndex))) { noiseWeighted += Number(ns.noiseIndex) * pop; noisePop += pop; }
    if (ns.medianIncome && isFinite(Number(ns.medianIncome)) && Number(ns.medianIncome) > 0) { incomeWeighted += Number(ns.medianIncome) * pop; incomePop += pop; }
  }
  var citySeniorShare = totalPop > 0 ? totalSeniors / totalPop : 0;
  var cityNoise = noisePop > 0 ? noiseWeighted / noisePop : null;
  var cityIncome = incomePop > 0 ? incomeWeighted / incomePop : null;

  var byHood = {};
  var weightedSum = 0, popSum = 0;
  var wEvts = S.weatherEvents || [];
  var qolMap = S.crimeMetrics && S.crimeMetrics.neighborhoodBreakdown;
  for (hood in demographics) {
    if (!demographics.hasOwnProperty(hood)) continue;
    var dd = demographics[hood];
    var hoodPop = (Number(dd.students) || 0) + (Number(dd.adults) || 0) + (Number(dd.seniors) || 0);
    var st = nState[hood] || {};

    // structural — a missing layer is neutral (1.0), never a guess
    var ageF = 1, densF = 1, incF = 1;
    if (hoodPop > 0 && citySeniorShare > 0) ageF = clamp(((Number(dd.seniors) || 0) / hoodPop) / citySeniorShare, 0.6, 1.6);
    if (cityNoise && st.noiseIndex !== null && st.noiseIndex !== undefined && isFinite(Number(st.noiseIndex))) densF = clamp(1 + 0.35 * (Number(st.noiseIndex) / cityNoise - 1), 0.6, 1.6);
    if (cityIncome && st.medianIncome && Number(st.medianIncome) > 0) incF = clamp(1 + 0.35 * (cityIncome / Number(st.medianIncome) - 1), 0.6, 1.6);
    var structural = clamp(ageF * densF * incF, wMin, wMax);

    // event — the engine.71 causes, storm joining heat/flood (engine.133 D1)
    var event = 1.0;
    for (var w = 0; w < wEvts.length; w++) {
      var ev = wEvts[w];
      if (!ev || !ev.salient || !ev.hoods) continue;
      if (ev.hoods.indexOf(hood) < 0) continue;
      if (ev.type === 'heat_wave') event += 0.25;
      else if (ev.type === 'flood_conditions' || ev.type === 'storm') event += 0.15;
    }
    var nbQoL = qolMap && qolMap[hood];
    if (nbQoL && nbQoL.qualityOfLifeIndex !== undefined) {
      var qol = Number(nbQoL.qualityOfLifeIndex);
      if (qol > 1) qol = qol / 100; // metrics layer is 5-95 scale
      if (qol <= 0.35) event += 0.10;
      else if (qol >= 0.65) event -= 0.10;
    }
    event = clamp(event, 0.75, 1.5);

    var weight = structural * event;
    byHood[hood] = { weight: weight, structural: structural, event: event };
    if (hoodPop > 0) { weightedSum += weight * hoodPop; popSum += hoodPop; }
  }
  var mean = popSum > 0 ? weightedSum / popSum : 1;
  if (!(mean > 0)) mean = 1;
  return { byHood: byHood, mean: mean, citySeniorShare: citySeniorShare, cityNoise: cityNoise, cityIncome: cityIncome };
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
 * - ctx.summary.neighborhoodIllnessWeights: { hood: { weight, structural, event } } (engine.133)
 * - ctx.summary.demographicShifts: Array of significant shifts
 * - ctx.summary.demographicShiftsCount: Number of shifts detected
 *
 * ============================================================================
 */
