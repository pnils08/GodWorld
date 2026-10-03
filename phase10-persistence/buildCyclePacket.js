/**
 * ============================================================================
 * buildCyclePacket_ v3.9 — RAW SNAPSHOT OUTPUT
 * ============================================================================
 *
 * Complete cycle snapshot for narrative review.
 *
 * v3.9 Changes:
 * - ADDED: NEIGHBORHOOD DYNAMICS section (Phase 2 per-neighborhood texture — 12 hoods)
 * - ADDED: STORY HOOKS section (engine flags "this is newsworthy" — up to 10)
 * - ADDED: SHOCK CONTEXT section (Phase 6 anomaly reasons, duration, score)
 * - ADDED: MIGRATION section (Phase 6 who's moving where, per-neighborhood)
 * - ADDED: SPOTLIGHT DETAIL section (citizen names, neighborhoods, reasons — not just POPIDs)
 * - ADDED: NEIGHBORHOOD ECONOMIES section (Phase 6 per-neighborhood economic state)
 * - ADDED: CYCLE SUMMARY section (Phase 9 one-line narrative + headline)
 * - ADDED: DEMOGRAPHIC SHIFTS section (Phase 3 population movement)
 * - ADDED: CITY EVENTS section (Phase 4 festivals, openings, rallies)
 * - Combined with v3.8: now serializes ~90% of engine output (was ~30%)
 *
 * v3.8 Changes:
 * - ADDED: EVENING CITY section (Phase 7 nightlife, restaurants, crowds, safety)
 * - ADDED: CRIME SNAPSHOT section (Phase 3 city-wide crime, hotspots, patrol)
 * - ADDED: TRANSIT section (Phase 2 BART ridership, on-time, traffic, alerts)
 * - ADDED: CIVIC LOAD section (Phase 6 load level, factors, story hooks)
 *
 * v3.7 Changes:
 * - REMOVED: Story Hooks section (packet is raw snapshot, not story seeding)
 * - REMOVED: Story Seeds section (same reason)
 * - MOVED: Chicago Satellite to end of packet (before footer)
 * - Kept 3-column output unchanged
 *
 * v3.6 Changes:
 * - FIXED: Output only 3 columns (Timestamp, Cycle, PacketText)
 * - REMOVED: All sportsSeason references (user controls sports simulations)
 * - REMOVED: Redundant sheet columns (data is in PacketText)
 * - KEPT: Civic status section in packet text
 * - ES5 compatible
 *
 * ============================================================================
 */

function buildCyclePacket_(ctx) {
  // DRY-RUN FIX: Skip direct sheet writes in dry-run mode
  var isDryRun = ctx.mode && ctx.mode.dryRun;
  if (isDryRun) {
    Logger.log('buildCyclePacket_: Skipping (dry-run mode)');
    return;
  }

  var S = ctx.summary || {};

  var weather = S.weather || {};
  var dyn = S.cityDynamics || {};
  var pop = S.worldPopulation || {};
  var arcs = S.eventArcs || [];
  var events = S.worldEvents || [];
  var textures = S.textureTriggers || [];
  var domains = S.domainPresence || {};

  var round2 = function(n) { return Math.round(n * 100) / 100; };

  // Calendar context
  var cal = {
    season: S.season || 'unknown',
    holiday: S.holiday || 'none',
    holidayPriority: S.holidayPriority || 'none',
    isFirstFriday: S.isFirstFriday || false,
    isCreationDay: S.isCreationDay || false,
    cycleOfYear: S.cycleOfYear || 1,
    godWorldYear: S.godWorldYear || 1
  };

  // Get civic context
  var civic = getCivicContextForPacket_(ctx.ss, S.absoluteCycle || S.cycleId || 0, cal);

  // engine.52 B2 — persist hospital admissions/discharges collected in Phase 4
  // and compute the census before packet lines are built.
  // engine.254 Task 8 R1-4: each ledger writer is isolated — a throw is an
  // Engine_Errors row plus a status flag (the census reads it), never a lost
  // Cycle_Packet or a skipped second writer.
  var hospital = null;
  var careWrite = ctx.summary.careJusticeWriteStatus = { hospital: 'ok', judicial: 'ok' };
  try { hospital = persistHospitalLedger_(ctx); }
  catch (hospitalErr) { careWrite.hospital = 'failed'; logEngineError_(ctx, 'Phase10-HospitalLedger', hospitalErr); }
  try { persistJudicialLedger_(ctx); }
  catch (judicialErr) { careWrite.judicial = 'failed'; logEngineError_(ctx, 'Phase10-JudicialLedger', judicialErr); }

  var lines = [];

  // ═══════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════
  lines.push('=== CYCLE PACKET ===');
  lines.push('Cycle: ' + (S.absoluteCycle || S.cycleId || ''));
  lines.push('CycleRef: ' + (S.cycleRef || 'Y' + cal.godWorldYear + 'C' + cal.cycleOfYear));
  lines.push('Timestamp: ' + inWorldStamp_(ctx));  // S271 in-world, not wall-clock
  
  if (civic.electionWindow) {
    lines.push('🗳️ ELECTION WINDOW ACTIVE — Group ' + civic.electionGroup);
  }
  lines.push('');

  // ═══════════════════════════════════════════════════════════
  // CALENDAR & TIME
  // ═══════════════════════════════════════════════════════════
  lines.push('--- CALENDAR ---');
  lines.push('GodWorldYear: ' + cal.godWorldYear);
  lines.push('CycleOfYear: ' + cal.cycleOfYear + ' / 52');
  lines.push('CycleInMonth: ' + (S.cycleInMonth || 1));
  lines.push('Season: ' + cal.season);
  
  if (cal.holiday !== 'none') {
    if (!S.holidayLabel) throw new Error('buildCyclePacket_: holiday label missing for ' + cal.holiday);
    var nh = S.holidayNeighborhood ? ' @ ' + S.holidayNeighborhood : '';
    lines.push('Holiday: ' + S.holidayLabel + ' [' + cal.holidayPriority + ']' + nh);
  } else {
    lines.push('Holiday: none');
  }
  
  if (cal.isFirstFriday) {
    lines.push('🎨 FIRST FRIDAY');
  }
  if (cal.isCreationDay) {
    var anniversary = S.creationDayAnniversary;
    if (anniversary !== null && anniversary > 0) {
      lines.push('🌟 CREATION DAY — Year ' + anniversary);
    } else {
      lines.push('🌟 CREATION DAY');
    }
  }
  lines.push('');

  // ═══════════════════════════════════════════════════════════
  // CIVIC STATUS
  // ═══════════════════════════════════════════════════════════
  lines.push('--- CIVIC STATUS ---');
  lines.push('Officials: ' + civic.totalOfficials + ' | Vacancies: ' + civic.vacancies);
  lines.push('CivicLoad: ' + (S.civicLoad || 'stable'));
  
  if (civic.electionWindow) {
    lines.push('');
    lines.push('🗳️ ELECTION WINDOW:');
    lines.push('  Year: ' + cal.godWorldYear + ' | Group: ' + civic.electionGroup);
    lines.push('  Seats Up: ' + civic.seatsUp.length);
    for (var su = 0; su < civic.seatsUp.length; su++) {
      var seat = civic.seatsUp[su];
      var statusFlag = seat.status !== 'active' ? ' [' + seat.status.toUpperCase() + ']' : '';
      lines.push('  - ' + seat.title + ': ' + seat.holder + statusFlag);
    }
  } else if (civic.cyclesUntilElection <= 15) {
    lines.push('📅 Next Election: ' + civic.cyclesUntilElection + ' cycles');
  }
  
  if (civic.recentResults && civic.recentResults.length > 0) {
    lines.push('');
    lines.push('📊 RECENT RESULTS:');
    for (var rr = 0; rr < civic.recentResults.length; rr++) {
      var result = civic.recentResults[rr];
      var upsetFlag = result.winner !== result.incumbent && result.incumbent !== 'TBD' && result.incumbent !== 'Vacant' ? ' ⚡UPSET' : '';
      lines.push('  - ' + result.title + ': ' + result.winner + ' (' + result.margin + ')' + upsetFlag);
    }
  }
  
  if (civic.notableStatuses.length > 0) {
    lines.push('');
    lines.push('⚠️ STATUS ALERTS:');
    for (var ns = 0; ns < civic.notableStatuses.length; ns++) {
      var off = civic.notableStatuses[ns];
      lines.push('  - ' + off.holder + ' (' + off.title + '): ' + off.status.toUpperCase());
    }
  }
  lines.push('');

  // ═══════════════════════════════════════════════════════════
  // CYCLE SIGNALS
  // ═══════════════════════════════════════════════════════════
  lines.push('--- CYCLE SIGNALS ---');
  lines.push('CycleWeight: ' + (S.cycleWeight || 'none'));
  lines.push('CycleWeightReason: ' + (S.cycleWeightReason || ''));
  lines.push('MigrationDrift: ' + (S.migrationDrift || 0));
  lines.push('PatternFlag: ' + (S.patternFlag || 'none'));
  lines.push('ShockFlag: ' + (S.shockFlag || 'none'));
  lines.push('');

  // ═══════════════════════════════════════════════════════════
  // POPULATION
  // ═══════════════════════════════════════════════════════════
  lines.push('--- POPULATION ---');
  lines.push('Total: ' + (pop.totalPopulation || 'n/a'));
  // Fresh post-attractor rate surfaced by applyDemographicDrift_ — the
  // S.worldPopulation.illnessRate twin is computed pre-drift and stale
  // (ruling 2026-09-09, builder-direct).
  var freshIllness = (S.demographicDrift && typeof S.demographicDrift === 'object' &&
    S.demographicDrift.illnessRate) || pop.illnessRate || 0;
  lines.push('IllnessRate: ' + round2(freshIllness));
  lines.push('EmploymentRate: ' + round2(pop.employmentRate || 0));
  lines.push('Economy: ' + (pop.economy || 'stable'));
  if (hospital) {
    lines.push('Hospital: ' + hospital.open + ' in care (' +
      'admits ' + hospital.admitsThisCycle +
      ', discharges ' + hospital.dischargesThisCycle +
      ', deaths ' + hospital.deathsThisCycle +
      ', load ' + Math.round(hospital.load * 100) + '%)');
  }
  // engine.254 Task 10 — the talk-back watched (builder 2026-10-02): census city
  // beds read, the ward's recent middle, and what was added to illness.
  var strain = S.hospitalTalkback;
  if (strain && strain.state) {
    lines.push('HospitalStrain: ' + strain.state +
      (strain.cycleRead !== null && strain.cycleRead !== undefined ? ' | census C' + strain.cycleRead : '') +
      (strain.beds !== null && strain.beds !== undefined ? ' | beds ' + strain.beds : '') +
      (strain.middle !== null && strain.middle !== undefined ? ' vs middle ' + strain.middle : '') +
      (strain.ratio !== null && strain.ratio !== undefined ? ' (x' + strain.ratio + ')' : '') +
      ' | illness +' + (strain.applied || 0));
  }
  lines.push('');

  // ═══════════════════════════════════════════════════════════
  // WEATHER
  // ═══════════════════════════════════════════════════════════
  lines.push('--- WEATHER ---');
  lines.push('Type: ' + (weather.type || 'clear'));
  lines.push('Impact: ' + (weather.impact || 1.0));
  lines.push('Temp: ' + (weather.temp || weather.temperature || 'n/a') + '°F');
  lines.push('');

  // ═══════════════════════════════════════════════════════════
  // CITY DYNAMICS
  // ═══════════════════════════════════════════════════════════
  lines.push('--- CITY DYNAMICS ---');
  lines.push('Sentiment: ' + round2(dyn.sentiment || 0));
  lines.push('Traffic: ' + round2(dyn.traffic || 1));
  lines.push('Retail: ' + round2(dyn.retail || 1));
  lines.push('Nightlife: ' + round2(dyn.nightlife || 1));
  lines.push('PublicSpaces: ' + round2(dyn.publicSpaces || 1));
  lines.push('Tourism: ' + round2(dyn.tourism || 1));
  lines.push('CulturalActivity: ' + round2(dyn.culturalActivity || 1));
  lines.push('CommunityEngagement: ' + round2(dyn.communityEngagement || 1));
  lines.push('');

  // ═══════════════════════════════════════════════════════════
  // DOMAIN PRESENCE
  // ═══════════════════════════════════════════════════════════
  var domainKeys = Object.keys(domains);
  var activeDomains = [];
  for (var dk = 0; dk < domainKeys.length; dk++) {
    var key = domainKeys[dk];
    if (domains[key] > 0) {
      activeDomains.push({ domain: key, count: domains[key] });
    }
  }
  activeDomains.sort(function(a, b) { return b.count - a.count; });

  if (activeDomains.length > 0) {
    lines.push('--- DOMAINS ---');
    lines.push('Dominant: ' + (S.dominantDomain || 'GENERAL'));
    for (var ad = 0; ad < activeDomains.length; ad++) {
      lines.push('  ' + activeDomains[ad].domain + ': ' + activeDomains[ad].count);
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // WORLD EVENTS
  // ═══════════════════════════════════════════════════════════
  if (events.length > 0) {
    lines.push('--- WORLD EVENTS (' + events.length + ') ---');
    for (var ei = 0; ei < Math.min(events.length, 8); ei++) {
      var e = events[ei];
      var sev = e.severity ? ' [' + e.severity + ']' : '';
      var dom = e.domain ? ' (' + e.domain + ')' : '';
      var enh = e.neighborhood ? ' @' + e.neighborhood : '';
      lines.push('- ' + (e.description || 'unnamed') + sev + dom + enh);
    }
    if (events.length > 8) {
      lines.push('  ...and ' + (events.length - 8) + ' more');
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // EVENT ARCS
  // ═══════════════════════════════════════════════════════════
  var activeArcs = [];
  for (var ai = 0; ai < arcs.length; ai++) {
    if (arcs[ai] && arcs[ai].phase !== 'resolved') {
      activeArcs.push(arcs[ai]);
    }
  }
  
  if (activeArcs.length > 0) {
    lines.push('--- EVENT ARCS (' + activeArcs.length + ' active) ---');
    for (var aa = 0; aa < activeArcs.length; aa++) {
      var a = activeArcs[aa];
      var tension = round2(a.tension || 0);
      var anh = a.neighborhood ? a.neighborhood : 'city-wide';
      var cycleId = S.absoluteCycle || S.cycleId || 0;
      var age = a.cycleCreated ? ' (age ' + (cycleId - a.cycleCreated) + ')' : '';
      lines.push('- [' + a.type + '/' + a.phase + '/t=' + tension + '] ' + anh + ': ' + a.summary + age);
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // TEXTURE TRIGGERS (high intensity)
  // ═══════════════════════════════════════════════════════════
  var importantTextures = [];
  for (var ti = 0; ti < textures.length; ti++) {
    if (textures[ti].intensity === 'high' || textures[ti].intensity === 'moderate') {
      importantTextures.push(textures[ti]);
    }
  }
  
  if (importantTextures.length > 0) {
    lines.push('--- TEXTURE TRIGGERS ---');
    for (var tj = 0; tj < importantTextures.length; tj++) {
      var t = importantTextures[tj];
      var tnh = t.neighborhood || 'city-wide';
      lines.push('- [' + t.intensity + '] ' + t.textureKey + ' @ ' + tnh + ': ' + t.reason);
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // NAMED SPOTLIGHTS
  // ═══════════════════════════════════════════════════════════
  var spotlights = S.namedSpotlights || [];
  if (spotlights.length > 0) {
    lines.push('--- NAMED SPOTLIGHTS ---');
    for (var sp = 0; sp < spotlights.length; sp++) {
      lines.push('- POPID ' + spotlights[sp].popId + ' (score ' + spotlights[sp].score + ')');
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // RELATIONSHIP BONDS
  // ═══════════════════════════════════════════════════════════
  var bondSummary = S.bondSummary || {};
  if (bondSummary.activeBonds > 0) {
    lines.push('--- RELATIONSHIP BONDS ---');
    lines.push('Active: ' + bondSummary.activeBonds + ' | Rivalries: ' + (bondSummary.rivalries || 0) + ' | Alliances: ' + (bondSummary.alliances || 0));
    lines.push('Tensions: ' + (bondSummary.tensions || 0) + ' | Mentorships: ' + (bondSummary.mentorships || 0) + ' | Neighbors: ' + (bondSummary.neighbors || 0));
    
    if (bondSummary.pendingConfrontations > 0) {
      lines.push('⚠️ PENDING CONFRONTATIONS: ' + bondSummary.pendingConfrontations);
    }
    
    if (bondSummary.hottestBonds && bondSummary.hottestBonds.length > 0) {
      lines.push('Hottest Bonds:');
      for (var hb = 0; hb < bondSummary.hottestBonds.length; hb++) {
        var b = bondSummary.hottestBonds[hb];
        var bnh = b.neighborhood ? ' @ ' + b.neighborhood : '';
        lines.push('  - ' + b.citizens + ' [' + b.type + ' t=' + b.intensity + ']' + bnh);
      }
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // GENERATIONAL EVENTS
  // ═══════════════════════════════════════════════════════════
  var genSummary = S.generationalSummary || {};
  var genEvents = S.generationalEvents || [];
  if (genEvents.length > 0) {
    lines.push('--- GENERATIONAL EVENTS ---');
    for (var ge = 0; ge < genEvents.length; ge++) {
      var gev = genEvents[ge];
      var gnh = gev.neighborhood ? ' @ ' + gev.neighborhood : '';
      lines.push('- [' + gev.tag + '] ' + gev.citizen + gnh + ': ' + gev.description);
    }
    if (genSummary.pendingCascades > 0) {
      lines.push('Pending Cascades: ' + genSummary.pendingCascades);
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // ECONOMIC RIPPLES
  // ═══════════════════════════════════════════════════════════
  var econSummary = S.economicSummary || {};
  if (econSummary.activeRipples > 0 || econSummary.mood) {
    lines.push('--- ECONOMIC STATUS ---');
    lines.push('Mood: ' + (econSummary.moodDesc || 'stable') + ' (' + (econSummary.mood || 50) + '/100)');
    lines.push('Active Ripples: ' + (econSummary.activeRipples || 0) + ' (+' + (econSummary.positiveRipples || 0) + '/-' + (econSummary.negativeRipples || 0) + ')');
    
    if (econSummary.strongestRipple) {
      var sr = econSummary.strongestRipple;
      var srnh = sr.neighborhood ? ' @ ' + sr.neighborhood : '';
      lines.push('Dominant: ' + sr.type + ' (strength ' + sr.strength + ')' + srnh);
    }
    
    if (econSummary.narrative) {
      lines.push('Narrative: ' + econSummary.narrative);
    }
    
    if (econSummary.thrivingNeighborhoods && econSummary.thrivingNeighborhoods.length > 0) {
      lines.push('Thriving: ' + econSummary.thrivingNeighborhoods.join(', '));
    }
    if (econSummary.strugglingNeighborhoods && econSummary.strugglingNeighborhoods.length > 0) {
      lines.push('Struggling: ' + econSummary.strugglingNeighborhoods.join(', '));
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // MEDIA FEEDBACK
  // ═══════════════════════════════════════════════════════════
  var mediaSummary = S.mediaSummary || {};
  if (mediaSummary.intensity) {
    lines.push('--- MEDIA CLIMATE ---');
    lines.push('Narrative: ' + (mediaSummary.narrative || 'neutral') + ' | Intensity: ' + (mediaSummary.intensity || 'minimal'));
    lines.push('Pressure: ' + (mediaSummary.sentimentPressure || 0) + ' (anxiety=' + (mediaSummary.anxietyFactor || 0) + ', hope=' + (mediaSummary.hopeFactor || 0) + ')');
    
    if (mediaSummary.crisisSaturation > 0.3) {
      lines.push('Crisis Saturation: ' + Math.round(mediaSummary.crisisSaturation * 100) + '%');
    }
    if (mediaSummary.celebrityBuzz > 0.2) {
      lines.push('Celebrity Buzz: ' + Math.round(mediaSummary.celebrityBuzz * 100) + '%');
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // WEATHER MOOD
  // ═══════════════════════════════════════════════════════════
  var weatherSum = S.weatherSummary || {};
  if (weatherSum.type) {
    lines.push('--- WEATHER MOOD ---');
    lines.push('Conditions: ' + weatherSum.type + ' ' + weatherSum.temp + '°F (impact=' + weatherSum.impact + ', comfort=' + weatherSum.comfort + ')');
    lines.push('Mood: ' + (weatherSum.mood || 'neutral') + ' | Energy: ' + (weatherSum.energy || 0.5) + ' | Social: ' + (weatherSum.social || 0.5));
    
    if (weatherSum.streak >= 3) {
      lines.push('Streak: ' + weatherSum.streakType + ' x' + weatherSum.streak + ' cycles');
    }
    
    if (weatherSum.alerts && weatherSum.alerts.length > 0) {
      lines.push('⚠️ Alerts: ' + weatherSum.alerts.join(', '));
    }
    
    if (weatherSum.perfectWeather) {
      lines.push('☀️ Perfect weather day');
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // EVENING CITY (v3.8: Phase 7 evening data for newsroom)
  // ═══════════════════════════════════════════════════════════
  var nightlife = S.nightlife || {};
  var eveningFood = S.eveningFood || {};
  var crowdMap = S.crowdMap || {};
  var crowdHotspots = S.crowdHotspots || [];

  var hasEvening = (nightlife.spots && nightlife.spots.length > 0) ||
                   (eveningFood.restaurants && eveningFood.restaurants.length > 0) ||
                   crowdHotspots.length > 0;

  if (hasEvening) {
    lines.push('--- EVENING CITY ---');

    // Nightlife
    if (nightlife.spots && nightlife.spots.length > 0) {
      var nightSpots = [];
      var details = nightlife.spotDetails || [];
      for (var ni = 0; ni < Math.min(details.length, 8); ni++) {
        var spot = details[ni];
        nightSpots.push(spot.name + ' @ ' + (spot.neighborhood || 'unknown'));
      }
      lines.push('Nightlife: ' + nightSpots.join(', '));
      lines.push('NightlifeVibe: ' + (nightlife.vibe || 'normal'));
      lines.push('NightlifeVolume: ' + round2(nightlife.volume || 0));
      lines.push('NightlifeMovement: ' + (nightlife.movement || 'normal'));
    }

    // Food
    if (eveningFood.restaurants && eveningFood.restaurants.length > 0) {
      var foodSpots = [];
      var foodDetails = eveningFood.restaurantDetails || [];
      for (var fi = 0; fi < Math.min(foodDetails.length, 6); fi++) {
        var rest = foodDetails[fi];
        foodSpots.push(rest.name + ' @ ' + (rest.neighborhood || 'unknown'));
      }
      lines.push('Restaurants: ' + foodSpots.join(', '));
      lines.push('FoodTrend: ' + (eveningFood.trend || 'none'));
    }
    if (eveningFood.fast && eveningFood.fast.length > 0) {
      lines.push('FastFood: ' + eveningFood.fast.slice(0, 4).join(', '));
    }

    // Crowd
    if (crowdHotspots.length > 0) {
      lines.push('CrowdHotspots: ' + crowdHotspots.join(', '));
    }
    // Top 5 crowd scores
    var crowdKeys2 = Object.keys(crowdMap);
    var crowdPairs = [];
    for (var ci = 0; ci < crowdKeys2.length; ci++) {
      crowdPairs.push({ hood: crowdKeys2[ci], score: crowdMap[crowdKeys2[ci]] });
    }
    crowdPairs.sort(function(a, b) { return b.score - a.score; });
    if (crowdPairs.length > 0) {
      var crowdLine = [];
      for (var cp = 0; cp < Math.min(crowdPairs.length, 5); cp++) {
        crowdLine.push(crowdPairs[cp].hood + '=' + crowdPairs[cp].score);
      }
      lines.push('CrowdMap: ' + crowdLine.join(', '));
    }

    lines.push('EveningSafety: ' + (S.eveningSafety || 'normal'));
    // G-EC34: eveningTraffic is CATEGORICAL (light|moderate|heavy|gridlock,
    // cityEveningSystems L208-213) — round2() on the string rendered NaN in
    // every packet. Render as-is, same shape as EveningSafety above.
    lines.push('EveningTraffic: ' + (S.eveningTraffic || 'light'));
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // CRIME SNAPSHOT (v3.8: Phase 3 crime data for newsroom)
  // ═══════════════════════════════════════════════════════════
  var crime = S.crimeMetrics || {};
  var crimeCity = crime.cityWide || {};
  if (crime.updated) {
    // engine.237: calculateCityWideFromMap_ has returned avgPropertyCrime / avgViolentCrime /
    // totalIncidents / avgResponseTime / avgClearanceRate since 2026-01-26; this block (v3.9,
    // 2026-03-16) read property / violent / incidents / response / clearance and printed 0 for all
    // five every cycle since — the desk packets' crime snapshot (buildDeskPackets.js) was zeros.
    lines.push('--- CRIME SNAPSHOT ---');
    lines.push('PropertyCrime: ' + round2(crimeCity.avgPropertyCrime || 0));
    lines.push('ViolentCrime: ' + round2(crimeCity.avgViolentCrime || 0));
    lines.push('Incidents: ' + round2(crimeCity.totalIncidents || 0));
    lines.push('ResponseTime: ' + round2(crimeCity.avgResponseTime || 0) + 'min');
    lines.push('ClearanceRate: ' + round2(crimeCity.avgClearanceRate || 0));

    var hotspots2 = crime.hotspots || [];
    if (hotspots2.length > 0) {
      var hotNames = [];
      for (var hi2 = 0; hi2 < Math.min(hotspots2.length, 4); hi2++) {
        var hs = hotspots2[hi2];
        hotNames.push((hs.neighborhood || hs.name || 'unknown') + ' (score ' + (hs.score || '?') + ')');
      }
      lines.push('Hotspots: ' + hotNames.join(', '));
    }

    var enforce = crime.enforcement || {};
    if (enforce.patrolStrategy) {
      lines.push('PatrolStrategy: ' + enforce.patrolStrategy);
    }
    // engine.235: the engine's city read — incidents vs last cycle, police headroom (units ÷ demand)
    var crimeCtxCity = (crime.context && crime.context.city) || null;
    if (crimeCtxCity) {
      lines.push('IncidentTrend: ' + round2(crimeCtxCity.incidentTrend));
      lines.push('EnforcementHeadroom: ' + round2(crimeCtxCity.enforcementCapacity));
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // TRANSIT (v3.8: Phase 2 transit data for newsroom)
  // ═══════════════════════════════════════════════════════════
  var transit = S.transitMetrics || {};
  if (transit.ridership || transit.onTime) {
    lines.push('--- TRANSIT ---');
    if (transit.ridership) lines.push('BARTRidership: ' + round2(transit.ridership));
    if (transit.onTime) lines.push('OnTimeRate: ' + round2(transit.onTime));
    if (transit.traffic) lines.push('TrafficIndex: ' + round2(transit.traffic));
    var tAlerts = transit.alerts || [];
    if (tAlerts.length > 0) {
      lines.push('Alerts: ' + tAlerts.slice(0, 3).join(', '));
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // CIVIC LOAD (v3.8: Phase 6 analysis for newsroom)
  // ═══════════════════════════════════════════════════════════
  var civicLoadVal = S.civicLoad || 'stable';
  var civicLoadScore = S.civicLoadScore || 0;
  var civicFactors = S.civicLoadFactors || [];
  if (civicLoadVal !== 'stable' || civicLoadScore > 0) {
    lines.push('--- CIVIC LOAD ---');
    lines.push('Level: ' + civicLoadVal);
    lines.push('Score: ' + round2(civicLoadScore));
    if (civicFactors.length > 0) {
      lines.push('Factors: ' + civicFactors.slice(0, 5).join(', '));
    }
    var hooks = S.storyHooks || [];
    if (hooks.length > 0) {
      lines.push('StoryHooks: ' + hooks.length);
      for (var sh = 0; sh < Math.min(hooks.length, 4); sh++) {
        var hook = hooks[sh];
        lines.push('  - ' + (hook.headline || hook.summary || hook.type || 'untitled'));
      }
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // NEIGHBORHOOD DYNAMICS (v3.9: Phase 2 per-neighborhood texture)
  // ═══════════════════════════════════════════════════════════
  var nhDynamics = S.neighborhoodDynamics || {};
  var nhKeys = Object.keys(nhDynamics);
  if (nhKeys.length > 0) {
    lines.push('--- NEIGHBORHOOD DYNAMICS ---');
    for (var ndi = 0; ndi < nhKeys.length; ndi++) {
      var hood = nhKeys[ndi];
      var nd = nhDynamics[hood];
      if (!nd) continue;
      var ndParts = [];
      if (nd.traffic !== undefined) ndParts.push('traffic=' + round2(nd.traffic));
      if (nd.retail !== undefined) ndParts.push('retail=' + round2(nd.retail));
      if (nd.nightlife !== undefined) ndParts.push('nightlife=' + round2(nd.nightlife));
      if (nd.sentiment !== undefined) ndParts.push('sentiment=' + round2(nd.sentiment));
      if (nd.publicSpaces !== undefined) ndParts.push('public=' + round2(nd.publicSpaces));
      if (nd.culturalActivity !== undefined) ndParts.push('culture=' + round2(nd.culturalActivity));
      lines.push('  ' + hood + ': ' + ndParts.join(', '));
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // STORY HOOKS (v3.9: engine says "this is newsworthy")
  // ═══════════════════════════════════════════════════════════
  var allHooks = S.storyHooks || [];
  if (allHooks.length > 0) {
    lines.push('--- STORY HOOKS (' + allHooks.length + ') ---');
    for (var shi = 0; shi < Math.min(allHooks.length, 10); shi++) {
      var hook = allHooks[shi];
      var hookNh = hook.neighborhood ? ' @' + hook.neighborhood : '';
      var hookDom = hook.domain ? ' (' + hook.domain + ')' : '';
      var hookPri = hook.priority ? ' [' + hook.priority + ']' : '';
      lines.push('- ' + (hook.headline || hook.summary || hook.type || hook.angle || 'untitled') + hookDom + hookNh + hookPri);
    }
    if (allHooks.length > 10) {
      lines.push('  ...and ' + (allHooks.length - 10) + ' more');
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // SHOCK CONTEXT (v3.9: Phase 6 anomaly details)
  // ═══════════════════════════════════════════════════════════
  var shockFlag = S.shockFlag || 'none';
  var shockReasons = S.shockReasons || [];
  if (shockFlag !== 'none' && shockReasons.length > 0) {
    lines.push('--- SHOCK CONTEXT ---');
    lines.push('Flag: ' + shockFlag);
    lines.push('Score: ' + (S.shockScore || 0));
    if (S.shockDuration) lines.push('Duration: ' + S.shockDuration + ' cycles');
    lines.push('Reasons:');
    for (var sri = 0; sri < shockReasons.length; sri++) {
      lines.push('  - ' + shockReasons[sri]);
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // MIGRATION BRIEF (v3.9: Phase 6 who's moving where)
  // ═══════════════════════════════════════════════════════════
  var migBrief = S.migrationBrief || {};
  var nhMigration = S.neighborhoodMigration || {};
  if (migBrief.netDrift !== undefined || Object.keys(nhMigration).length > 0) {
    lines.push('--- MIGRATION ---');
    if (migBrief.netDrift !== undefined) lines.push('NetDrift: ' + round2(migBrief.netDrift));
    if (migBrief.inflow !== undefined) lines.push('Inflow: ' + migBrief.inflow);
    if (migBrief.outflow !== undefined) lines.push('Outflow: ' + migBrief.outflow);
    if (migBrief.summary) lines.push('Summary: ' + migBrief.summary);
    var migKeys = Object.keys(nhMigration);
    if (migKeys.length > 0) {
      lines.push('ByNeighborhood:');
      for (var mi = 0; mi < migKeys.length; mi++) {
        var mh = nhMigration[migKeys[mi]];
        if (mh && (mh.netChange || mh.net)) {
          lines.push('  ' + migKeys[mi] + ': ' + round2(mh.netChange || mh.net || 0));
        }
      }
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // NAMED SPOTLIGHTS DETAIL (v3.9: full context, not just POPIDs)
  // ═══════════════════════════════════════════════════════════
  if (spotlights.length > 0) {
    var hasDetail = spotlights[0].name || spotlights[0].neighborhood;
    if (hasDetail) {
      lines.push('--- SPOTLIGHT DETAIL ---');
      for (var sdi = 0; sdi < spotlights.length; sdi++) {
        var sl = spotlights[sdi];
        var slNh = sl.neighborhood ? ' @' + sl.neighborhood : '';
        var slReasons = sl.reasons ? ' — ' + (Array.isArray(sl.reasons) ? sl.reasons.join(', ') : sl.reasons) : '';
        lines.push('- ' + (sl.name || 'POPID ' + sl.popId) + ' (score ' + sl.score + ')' + slNh + slReasons);
      }
      lines.push('');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // NEIGHBORHOOD ECONOMIES (v3.9: Phase 6 per-neighborhood economic state)
  // ═══════════════════════════════════════════════════════════
  var nhEcon = S.neighborhoodEconomies || {};
  var nhEconKeys = Object.keys(nhEcon);
  if (nhEconKeys.length > 0) {
    lines.push('--- NEIGHBORHOOD ECONOMIES ---');
    for (var nei = 0; nei < nhEconKeys.length; nei++) {
      var neHood = nhEconKeys[nei];
      var ne = nhEcon[neHood];
      if (!ne) continue;
      var neParts = [];
      if (ne.mood !== undefined) neParts.push('mood=' + round2(ne.mood));
      if (ne.moodDesc) neParts.push(ne.moodDesc);
      if (ne.employment !== undefined) neParts.push('emp=' + round2(ne.employment));
      if (ne.growth !== undefined) neParts.push('growth=' + round2(ne.growth));
      lines.push('  ' + neHood + ': ' + neParts.join(', '));
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // CYCLE SUMMARY (v3.9: Phase 9 one-line narrative)
  // ═══════════════════════════════════════════════════════════
  var compressedLine = S.compressedLine || '';
  var cycleSummary = S.cycleSummary || {};
  if (compressedLine || cycleSummary.headline) {
    lines.push('--- CYCLE SUMMARY ---');
    if (compressedLine) lines.push('OneLine: ' + compressedLine);
    if (cycleSummary.headline) lines.push('Headline: ' + cycleSummary.headline);
    if (cycleSummary.keyEvents) lines.push('KeyEvents: ' + cycleSummary.keyEvents);
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // DEMOGRAPHIC SHIFTS (v3.9: Phase 3 population movement)
  // ═══════════════════════════════════════════════════════════
  var demoShifts = S.demographicShifts || [];
  if (demoShifts.length > 0) {
    lines.push('--- DEMOGRAPHIC SHIFTS ---');
    for (var dsi = 0; dsi < Math.min(demoShifts.length, 6); dsi++) {
      var ds = demoShifts[dsi];
      var dsNh = ds.neighborhood ? ' @' + ds.neighborhood : '';
      lines.push('- ' + (ds.description || ds.type || 'shift') + dsNh);
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // CITY EVENTS (v3.9: Phase 4 festivals, openings, rallies)
  // ═══════════════════════════════════════════════════════════
  var cityEventDetails = S.cityEventDetails || [];
  if (cityEventDetails.length > 0) {
    lines.push('--- CITY EVENTS ---');
    for (var cei = 0; cei < Math.min(cityEventDetails.length, 8); cei++) {
      var ce = cityEventDetails[cei];
      var ceNh = ce.neighborhood ? ' @' + ce.neighborhood : '';
      lines.push('- ' + (ce.name || 'unnamed') + ceNh);
    }
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════
  lines.push('=== END PACKET ===');

  // ── S328 W2b (compile-layer rebuild, Mike-approved): emit ONLY the sections
  // the one PacketText consumer (buildDeskPackets buildEveningContext) parses.
  // The other ~22 sections duplicated world_summary/desk-packet state for no
  // reader — pure noise in the tab and in every LLM search that grepped it.
  // Emitter blocks above are untouched (reversible: edit KEEP list to restore).
  var KEEP_SECTIONS = ['CALENDAR', 'CITY DYNAMICS', 'MEDIA CLIMATE', 'WEATHER MOOD',
    'EVENING CITY', 'CRIME SNAPSHOT', 'TRANSIT'];
  var filtered = [];
  var keeping = true;
  for (var li = 0; li < lines.length; li++) {
    var mSec = String(lines[li]).match(/^--- ([A-Z ]+?)(?: \(.*)?\s*---$/);
    if (mSec) keeping = KEEP_SECTIONS.indexOf(mSec[1].trim()) >= 0;
    else if (/^=== /.test(String(lines[li]))) {
      // Terminal '--- END ---' marker before the footer: buildEveningContext's
      // section regexes look ahead for '\n---'; pre-trim the last kept section
      // was never terminal, post-trim it can be (bench C103 caught CRIME
      // SNAPSHOT unparseable when TRANSIT was quiet).
      if (/^=== END PACKET/.test(String(lines[li]))) filtered.push('--- END ---');
      keeping = true;
    }
    if (keeping) filtered.push(lines[li]);
  }
  lines = filtered;

  var packet = lines.join('\n');

  // ═══════════════════════════════════════════════════════════
  // OUTPUT TO SHEET — 3 COLUMNS ONLY
  // ═══════════════════════════════════════════════════════════
  var HEADERS = ['Timestamp', 'Cycle', 'PacketText'];
  
  var sheet = requireTab_(ctx.ss, 'Cycle_Packet'); // engine.119: no runtime create

  var startRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(startRow, 1, 1, 3).setValues([
    [
      inWorldStamp_(ctx),                         // A  Timestamp (S271 in-world)
      S.absoluteCycle || S.cycleId || '',         // B  Cycle
      "'" + packet                                // C  PacketText
    ]
  ]);

  Logger.log('buildCyclePacket_ v3.8: Cycle ' + (S.absoluteCycle || S.cycleId) +
    ' | Election: ' + civic.electionWindow);

  ctx.summary.cyclePacket = packet;
}


// ═══════════════════════════════════════════════════════════
// HOSPITAL LEDGER (engine.52 B2)
// ═══════════════════════════════════════════════════════════

// Hospital census load divides by the same World_Config key the talk-back
// binds at (hospitalBaseCapacity), surfaced by applyDemographicDrift_ (W2b) —
// ruling 2026-09-09 (builder-direct): the old hardcoded 40 placeholder is gone.
function hospitalCapacity_(ctx) {
  var hc = ctx && ctx.summary && ctx.summary.demographicDrift &&
    ctx.summary.demographicDrift.hospitalConfig;
  if (hc && hc.baseCapacity) return hc.baseCapacity;
  Logger.log('hospitalCapacity_: demographicDrift.hospitalConfig missing — defaulting to 100');
  return 100;
}

var HOSPITAL_OPEN_STATES = ['hospitalized', 'critical', 'serious-condition', 'injured', 'recovering'];

// engine.254 Task 8 R2-1 — the receipt stamps, columns L–O.
var HOSPITAL_RECEIPT_HEADERS_ = ['IntakeType', 'SourceSystem', 'SourceEventId', 'TransferFromId'];
var HOSPITAL_INTAKE_TYPES_ = ['injury', 'illness', 'heat', 'mental-health-crisis', 'substance-treatment', 'unclassified'];

// The ledger enum; a blank type is `unclassified`, never inferred from the cause.
function hospitalIntakeType_(raw) {
  var t = String(raw === undefined || raw === null ? '' : raw).trim();
  if (t === '') return 'unclassified';
  if (HOSPITAL_INTAKE_TYPES_.indexOf(t) < 0) throw new Error('Hospital_Ledger: unknown IntakeType "' + raw + '"');
  return t;
}

// The schema's no-event form: the Cycle the repair ran, not the Cycle care began.
function hospitalReconcileEventId_(cycle, popId) {
  return 'reconcile:C' + cycle + ':unclassified:' + popId;
}

// A row id is checked against every id in the tab (-2, -3 … until free) and
// claimed, so a re-admission in the Cycle of a closed row never shares its id.
function careLedgerRowId_(taken, base) {
  var id = base;
  for (var n = 2; taken[id]; n++) id = base + '-' + n;
  taken[id] = true;
  return id;
}
function hospitalRowId_(taken, cycle, popId) {
  return careLedgerRowId_(taken, 'H-C' + cycle + '-' + popId);
}

/**
 * Persist ctx.summary.hospitalEvents (Phase 4) into the Hospital_Ledger tab,
 * close discharged/deceased rows, and return the census. Direct writes match
 * this file's Phase-10 pattern. Lazy-creates the tab only when the first
 * event arrives (Phase 42 §1.1 schema-setup carve-out).
 */
function persistHospitalLedger_(ctx) {
  var S = ctx.summary || {};
  var events = S.hospitalEvents || [];
  var cycle = S.absoluteCycle || S.cycleId || 0;

  // Scan the ledger for citizens currently in a health state (engine.105).
  // The census must reflect the Status column itself, not just the transition
  // events that happened to arrive this cycle — any path that sets a health
  // status directly (sports roster injuries, engine.77) would otherwise leave
  // a patient the hospital never heard about.
  var patients = {};
  var patientCount = 0;
  if (ctx.ledger && ctx.ledger.rows && ctx.ledger.headers) {
    var ph = ctx.ledger.headers;
    var pPop = ph.indexOf('POPID'), pStatus = ph.indexOf('Status'),
        pFirst = ph.indexOf('First'), pLast = ph.indexOf('Last'),
        pHood = ph.indexOf('Neighborhood'), pCause = ph.indexOf('HealthCause'),
        pStart = ph.indexOf('StatusStartCycle');
    if (pPop >= 0 && pStatus >= 0) {
      for (var pr = 0; pr < ctx.ledger.rows.length; pr++) {
        var pRow = ctx.ledger.rows[pr];
        var pSt = String(pRow[pStatus] || '').trim().toLowerCase();
        if (HOSPITAL_OPEN_STATES.indexOf(pSt) < 0) continue;
        patients[String(pRow[pPop])] = {
          status: pSt,
          name: (((pFirst >= 0 ? pRow[pFirst] : '') || '') + ' ' +
                 ((pLast >= 0 ? pRow[pLast] : '') || '')).toString().trim(),
          neighborhood: pHood >= 0 ? (pRow[pHood] || '') : '',
          cause: pCause >= 0 ? (pRow[pCause] || '') : '',
          startCycle: pStart >= 0 ? (Number(pRow[pStart]) || 0) : 0
        };
        patientCount++;
      }
    }
  }

  var sheet = ctx.ss.getSheetByName('Hospital_Ledger');
  if (!sheet && events.length === 0 && patientCount === 0) return null; // nothing to count

  // engine.119: the insertSheet that stood here, ~100s into the Phase-10 write
  // storm, is the line that wedged the Spreadsheets service twice on 2026-08-18
  // (C104). The tab is pre-created; a missing one is surfaced, never built mid-run.
  // Every write below runs under persistWithRetry_ (Task 2) — this function is a
  // Phase-10 direct writer outside the executor, so it had no retry of its own.
  if (!sheet) sheet = requireTab_(ctx.ss, 'Hospital_Ledger');

  var data = sheet.getDataRange().getValues();
  if (!data.length || data[0].indexOf('PriorStatus') !== 15) {
    throw new Error('Hospital_Ledger.PriorStatus header missing at column P');
  }
  // engine.254 Task 8 R2-1: rows are appended whole, so L–O must sit where the
  // row array puts them. The census reads these stamps, not the receipts.
  for (var hc = 0; hc < HOSPITAL_RECEIPT_HEADERS_.length; hc++) {
    if (data[0][11 + hc] !== HOSPITAL_RECEIPT_HEADERS_[hc]) {
      throw new Error('Hospital_Ledger.' + HOSPITAL_RECEIPT_HEADERS_[hc] + ' header missing at column ' + 'LMNO'.charAt(hc));
    }
  }
  var hospitalIds = {}, hospitalEventIds = {};
  for (var hi = 1; hi < data.length; hi++) {
    if (data[hi][0] !== '' && data[hi][0] !== null) hospitalIds[String(data[hi][0])] = true;
    if (data[hi][13] !== '' && data[hi][13] !== null && data[hi][13] !== undefined) hospitalEventIds[String(data[hi][13])] = true;
  }
  // An intake receipt names its event and a known type; both are checked before
  // any write, so a bad receipt fails the writer whole and never half a Cycle.
  for (var pe = 0; pe < events.length; pe++) {
    if (events[pe].kind !== 'intake' || HOSPITAL_OPEN_STATES.indexOf(events[pe].to) < 0) continue;
    if (!events[pe].sourceEventId) {
      throw new Error('Hospital_Ledger intake receipt without SourceEventId for ' + events[pe].popId);
    }
    hospitalIntakeType_(events[pe].intakeType);
  }

  // Index open rows (DischargeCycle empty) by POPID — sheet row = index + 1.
  var openByPopId = {};
  for (var r = 1; r < data.length; r++) {
    if (data[r][8] === '' || data[r][8] === null) {
      openByPopId[String(data[r][1])] = r;
    }
  }

  var admits = 0, discharges = 0, deaths = 0;

  for (var e = 0; e < events.length; e++) {
    var ev = events[e];
    var key = String(ev.popId);
    var openRow = openByPopId.hasOwnProperty(key) ? openByPopId[key] : -1;

    if (HOSPITAL_OPEN_STATES.indexOf(ev.to) >= 0) {
      if (openRow >= 0) {
        // Transition inside care — update status + stamp, backfill cause.
        persistWithRetry_(function() {
          sheet.getRange(openRow + 1, 7, 1, 2).setValues([[ev.to, ev.cycle]]);
          if (ev.cause && !data[openRow][4]) sheet.getRange(openRow + 1, 5).setValue(ev.cause);
        }, 'Hospital_Ledger transition');
        data[openRow][6] = ev.to;
      } else {
        // New admission. Only an intake receipt is an intake: a lifecycle
        // transition with no open row (a citizen in care the ledger never
        // heard about) is a repair row — `reconcile`, a census correction.
        var isIntake = ev.kind === 'intake';
        var priorStatus = isIntake ?
          (ev.priorStatus !== undefined ? ev.priorStatus : (ev.from || '')) : '';
        if (String(priorStatus).trim().toLowerCase() === 'detained') {
          throw new Error('Hospital_Ledger.PriorStatus cannot be detained for ' + key);
        }
        var eventId = isIntake ? String(ev.sourceEventId) : hospitalReconcileEventId_(cycle, key);
        // Invariant D at the writer: one row per SourceEventId, ever.
        if (hospitalEventIds[eventId]) {
          Logger.log('persistHospitalLedger_: SourceEventId ' + eventId + ' already has a row — no second row');
          continue;
        }
        var newRow = [hospitalRowId_(hospitalIds, ev.cycle, key), ev.popId, ev.name || '',
                      ev.neighborhood || '', ev.cause || '', ev.cycle, ev.to,
                      ev.cycle, '', '', '',
                      isIntake ? hospitalIntakeType_(ev.intakeType) : 'unclassified',
                      isIntake ? (ev.sourceSystem || '') : 'reconcile',
                      eventId, '', priorStatus];
        hospitalEventIds[eventId] = true;
        appendRowWithRetry_(sheet, newRow, 'Hospital_Ledger admit');
        openByPopId[key] = data.length;
        data.push(newRow);
        admits++;
      }
    } else if (ev.to !== undefined && ev.to !== null && ev.to !== '') {
      if (openRow >= 0) {
        var admitCycle = Number(data[openRow][5]) || ev.cycle;
        var outcome = (ev.to === 'deceased') ? 'deceased' : 'recovered';
        persistWithRetry_(function() {
          sheet.getRange(openRow + 1, 7, 1, 5).setValues([[
            ev.to, ev.cycle, ev.cycle, outcome, Math.max(0, ev.cycle - admitCycle)
          ]]);
        }, 'Hospital_Ledger discharge');
        data[openRow][8] = ev.cycle;
        delete openByPopId[key];
        if (ev.to === 'deceased') deaths++; else discharges++;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GHOST-BED RECONCILE (engine.102, S361)
  // ═══════════════════════════════════════════════════════════════════════════
  // A bed only closes when a lifecycle transition event arrives. Any path that
  // returns a citizen to active/deceased WITHOUT emitting one leaves the row
  // open forever — the citizen walks out of the hospital and goes on living
  // while their bed stays occupied. Found on bench C111: 5 of 14 open beds were
  // phantom, one of them a citizen who had been dead for 5 cycles. The census
  // feeds the illness talk-back, so ghosts make the whole city sicker.
  //
  // The citizens themselves are the authority: if the ledger doesn't say a
  // person is in a health state, their bed is released. Self-healing every
  // cycle — no backfill script, no recurrence.
  var HEALTH_STATES_102 = ['hospitalized', 'critical', 'recovering', 'injured', 'serious-condition'];
  var ghostsClosed = 0;
  if (ctx.ledger && ctx.ledger.rows && ctx.ledger.headers) {
    var lh102 = ctx.ledger.headers;
    var lPop = lh102.indexOf('POPID'), lStatus = lh102.indexOf('Status');
    if (lPop >= 0 && lStatus >= 0) {
      var liveStatus = {};
      for (var lr = 0; lr < ctx.ledger.rows.length; lr++) {
        liveStatus[String(ctx.ledger.rows[lr][lPop])] =
          String(ctx.ledger.rows[lr][lStatus] || '').trim().toLowerCase();
      }
      for (var gPop in openByPopId) {
        if (!openByPopId.hasOwnProperty(gPop)) continue;
        var gStatus = liveStatus[gPop];
        if (gStatus === undefined) continue; // not in ledger — leave for manual triage, don't guess
        if (HEALTH_STATES_102.indexOf(gStatus) >= 0) continue; // genuinely still a patient
        var gRow = openByPopId[gPop];
        var gAdmit = Number(data[gRow][5]) || cycle;
        var gOutcome = (gStatus === 'deceased') ? 'deceased' : 'recovered';
        persistWithRetry_(function() {
          sheet.getRange(gRow + 1, 7, 1, 5).setValues([[
            gStatus, cycle, cycle, gOutcome + '-reconciled', Math.max(0, cycle - gAdmit)
          ]]);
        }, 'Hospital_Ledger ghost-release');
        data[gRow][8] = cycle;
        delete openByPopId[gPop];
        ghostsClosed++;
        Logger.log('persistHospitalLedger_ reconcile: released ghost bed for ' + gPop +
                   ' (ledger says "' + gStatus + '", admitted C' + gAdmit + ')');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MISSED-ADMISSION RECONCILE (engine.105)
  // ═══════════════════════════════════════════════════════════════════════════
  // Mirror of the ghost-bed reconcile above, in the other direction: the
  // ghost pass releases beds for citizens the ledger says are healthy; this
  // pass admits citizens the ledger says are patients but who have no open
  // bed. Found on bench 0814 C104/C105: POP-01028 Status=injured since C103
  // (sports roster injury, engine.77 — sets Status directly, never emits a
  // hospitalEvents entry) with no Hospital_Ledger row. The Status column is
  // the authority both ways. Self-healing every cycle — catches every
  // current and future path that sets a health status without an event.
  var missedAdmits = 0;
  for (var mPop in patients) {
    if (!patients.hasOwnProperty(mPop)) continue;
    if (openByPopId.hasOwnProperty(mPop)) continue; // already has a bed
    var mp = patients[mPop];
    var mAdmit = mp.startCycle > 0 ? mp.startCycle : cycle;
    // A repair row is a correction, never an intake (schema, invariant F).
    var mEventId = hospitalReconcileEventId_(cycle, mPop);
    if (hospitalEventIds[mEventId]) continue; // invariant D, as the event loop
    var mRow = [hospitalRowId_(hospitalIds, mAdmit, mPop), mPop, mp.name, mp.neighborhood,
                mp.cause, mAdmit, mp.status, cycle, '', '', '',
                'unclassified', 'reconcile', mEventId, '', ''];
    hospitalEventIds[mEventId] = true;
    appendRowWithRetry_(sheet, mRow, 'Hospital_Ledger missed-admit');
    openByPopId[mPop] = data.length;
    data.push(mRow);
    missedAdmits++;
    Logger.log('persistHospitalLedger_ reconcile: admitted untracked patient ' + mPop +
               ' (ledger says "' + mp.status + '" since C' + mAdmit + ', no open bed)');
  }

  var open = 0;
  for (var k in openByPopId) if (openByPopId.hasOwnProperty(k)) open++;

  var census = {
    open: open,
    admitsThisCycle: admits,
    dischargesThisCycle: discharges,
    deathsThisCycle: deaths,
    ghostsReleased: ghostsClosed,
    missedAdmitsReconciled: missedAdmits,
    load: open / hospitalCapacity_(ctx)
  };
  ctx.summary.hospitalCensus = census;

  Logger.log('persistHospitalLedger_ (engine.52): cycle ' + cycle + ' | open ' + open +
    ' | admits ' + admits + ' | discharges ' + discharges + ' | deaths ' + deaths +
    ' | ghost beds released ' + ghostsClosed + ' | missed admits reconciled ' + missedAdmits);

  return census;
}

// ═══════════════════════════════════════════════════════════
// CARE AND JUSTICE CENSUS (engine.254 Task 8)
// ═══════════════════════════════════════════════════════════

/**
 * Write this Cycle's Care_Justice_Census block. The arithmetic and every
 * decision are in utilities/careJusticeAccounting.js; this function only reads
 * the two ledgers and the census tail, and writes one range. Its own phase
 * entry, after Phase10-CyclePacket: a throw here is an Engine_Errors row and no
 * census this Cycle (the next one restarts across the gap) — never a lost packet.
 */
function persistCareJusticeCensus_(ctx) {
  if (ctx.mode && (ctx.mode.dryRun || ctx.mode.replay)) {
    Logger.log('persistCareJusticeCensus_: skipped (dry-run / replay)');
    return null;
  }
  var S = ctx.summary || {};
  var cycle = S.absoluteCycle || S.cycleId || 0;
  var demand = S.careJusticeDemand;
  if (!demand || !demand.hoods) throw new Error('careJusticeCensus: S.careJusticeDemand missing — no scopes, no census');
  var cfg = ctx.config || {};
  var stays = {
    hospital: careJusticeStay_(cfg.careJusticeOtherHospitalStayCycles, 'careJusticeOtherHospitalStayCycles'),
    judicial: careJusticeStay_(cfg.careJusticeOtherCustodyStayCycles, 'careJusticeOtherCustodyStayCycles')
  };

  var sheet = requireTab_(ctx.ss, 'Care_Justice_Census');
  var width = CARE_JUSTICE_CENSUS_HEADERS.length;
  var header = sheet.getRange(1, 1, 1, width).getValues()[0];
  for (var h = 0; h < width; h++) {
    if (header[h] !== CARE_JUSTICE_CENSUS_HEADERS[h]) {
      throw new Error('Care_Justice_Census.' + CARE_JUSTICE_CENSUS_HEADERS[h] + ' header missing at column ' + (h + 1));
    }
  }

  // A fresh read of each ledger, after both writers. A tab or header that
  // cannot be read makes that system `unavailable` — blank, never zero.
  function ledgerImage(system, name) {
    var tab = ctx.ss.getSheetByName(name);
    if (!tab) { Logger.log('persistCareJusticeCensus_: ' + name + ' tab missing — ' + system + ' unavailable'); return null; }
    try {
      var values = persistWithRetry_(function() { return tab.getDataRange().getValues(); }, name + ' census read');
      if (!values.length) return null;
      careJusticeLedgerCols_(system, values[0]);
      return values;
    } catch (readErr) {
      Logger.log('persistCareJusticeCensus_: ' + name + ' unreadable (' + readErr.message + ') — ' + system + ' unavailable');
      return null;
    }
  }
  var ledgers = {
    hospital: ledgerImage('hospital', 'Hospital_Ledger'),
    judicial: ledgerImage('judicial', 'Judicial_Ledger')
  };

  var hoodCount = 0;
  for (var hn in demand.hoods) if (demand.hoods.hasOwnProperty(hn)) hoodCount++;
  var outsideTracked = 0;
  if (!ctx.ledger || !ctx.ledger.rows || !ctx.ledger.headers) throw new Error('careJusticeCensus: Simulation_Ledger not loaded');
  var lStatus = ctx.ledger.headers.indexOf('Status'), lHood = ctx.ledger.headers.indexOf('Neighborhood');
  if (lStatus < 0 || lHood < 0) throw new Error('careJusticeCensus: Simulation_Ledger Status / Neighborhood column missing');
  for (var lr = 0; lr < ctx.ledger.rows.length; lr++) {
    var person = ctx.ledger.rows[lr];
    if (String(person[lStatus] || '').trim().toLowerCase() === 'deceased') continue;
    if (!demand.hoods.hasOwnProperty(String(person[lHood] || '').trim())) outsideTracked++;
  }

  var blockRows = (hoodCount + 2) * 9;
  var tailMax = blockRows * CARE_JUSTICE_TAIL_BLOCKS;
  // The tail is anchored on the last row that carries a Cycle in column A — not
  // on getLastRow(), which a stray cell far below the data would move, pushing
  // the last real block out of the window and restarting the stock as a first census.
  // `anchor` (1 = no census row yet) and `sheetLast` ride along for the
  // rows-below check after the outcome.
  function readTail() {
    var sheetLast = sheet.getLastRow();
    if (sheetLast < 2) return { first: 2, rows: [], anchor: 1, sheetLast: sheetLast };
    var lastRow = careJusticeAnchorRow_(sheet.getRange(2, 1, sheetLast - 1, 1).getValues());
    if (lastRow < 2) return { first: 2, rows: [], anchor: 1, sheetLast: sheetLast };
    var n = Math.min(lastRow - 1, tailMax);
    var first = lastRow - n + 1;
    var values = sheet.getRange(first, 1, n, width).getValues();
    var rows = [];
    for (var i = 0; i < values.length; i++) rows.push({ row: first + i, values: values[i] });
    return { first: first, rows: rows, anchor: lastRow, sheetLast: sheetLast };
  }

  var read = readTail();
  var tailValues = [];
  // A truncated read can open on half of its oldest Cycle: that Cycle is not evidence.
  var dropCycle = read.first > 2 && read.rows.length ? String(read.rows[0].values[0]) : null;
  for (var tv = 0; tv < read.rows.length; tv++) {
    if (dropCycle !== null && String(read.rows[tv].values[0]) === dropCycle) continue;
    tailValues.push(read.rows[tv].values);
  }

  var plan = planCareJusticeCensus_({
    cycle: cycle, demand: demand, ledgers: ledgers, tail: tailValues, stays: stays,
    outsideTracked: outsideTracked, writeStatus: S.careJusticeWriteStatus,
    events: { hospital: S.hospitalEvents || [], judicial: S.judicialEvents || [] },
    otherResidentOf: function(trackedByHood) { return careJusticeOtherResident_(demand, trackedByHood, true); }
  });
  if (plan.rows.length !== blockRows) {
    throw new Error('careJusticeCensus: built ' + plan.rows.length + ' rows, expected ' + blockRows);
  }

  // Locate-compare-write is the retried unit: an attempt that timed out but
  // landed is found equal on the next attempt and not written twice.
  var standing = null; // the read the rows-below check stands on
  var done = persistWithRetry_(function() {
    var fresh = readTail();
    standing = fresh;
    var write = careJusticeWritePlan_(fresh.rows, fresh.first, plan);
    if (write.action === 'write') {
      // Whatever already sits in the target cells (content can exist only up to
      // the tab's last row) is read first: a foreign row is refused, not overwritten.
      var sheetLast = sheet.getLastRow();
      if (sheetLast >= write.startRow) {
        var span = Math.min(write.values.length, sheetLast - write.startRow + 1);
        var blocked = careJusticeTargetProblem_(
          sheet.getRange(write.startRow, 1, span, width).getValues(), write.startRow, write.replaces);
        if (blocked) throw new Error('careJusticeCensus: ' + blocked + ' — nothing written');
      }
      sheet.getRange(write.startRow, 1, write.values.length, width).setValues(write.values);
    }
    return write;
  }, 'Care_Justice_Census block');

  if (done.action === 'write') {
    // The read-back is taken after setValues: its anchor is the block just
    // written. The pre-write read's anchor sits above it and must not be used below.
    standing = readTail();
    var problem = careJusticeVerifyBlock_(standing.rows, plan);
    if (problem) throw new Error('careJusticeCensus: Cycle ' + cycle + ' did not read back — ' + problem);
  }

  Logger.log('persistCareJusticeCensus_ C' + cycle + ': ' + done.action +
    (done.action === 'write' ? ' ' + done.values.length + ' rows at ' + done.startRow : '') +
    ' | hospital ' + plan.completeness.hospital + ' | judicial ' + plan.completeness.judicial +
    (plan.firstCensus ? ' | first census' : '') +
    (plan.gapBlocks.length ? ' | gap Cycles ' + plan.gapBlocks.length : '') +
    ' | outside-table tracked ' + outsideTracked);

  // Rows below the census (R2-8: only blank rows follow). A report, after the
  // outcome: the Cycle's block already stands, and a row that was not in its way
  // never costs the Cycle its census. Whitespace is not a row. The look is one
  // tail window deep; the census grows a block a Cycle toward anything further.
  if (standing.sheetLast > standing.anchor) {
    var belowFirst = standing.anchor + 1;
    var belowCount = Math.min(standing.sheetLast - standing.anchor, tailMax);
    var below = persistWithRetry_(function() {
      return sheet.getRange(belowFirst, 1, belowCount, width).getValues();
    }, 'Care_Justice_Census rows below');
    var orphan = careJusticeFirstContent_(below, belowFirst, 0);
    if (orphan) {
      throw new Error('careJusticeCensus: Cycle ' + cycle + ' stands; row ' + orphan.row + ' below it holds "' +
        orphan.value + '" with no Cycle — clear it');
    }
  }
  return { action: done.action, completeness: plan.completeness };
}

// Phase-10 direct writer: the pre-created 21-column case tab carries open
// custody between Cycles. No Phase-5 sheet intents are used.
function persistJudicialLedger_(ctx) {
  var sheet = requireTab_(ctx.ss, 'Judicial_Ledger');
  var data = sheet.getDataRange().getValues();
  var fields = [
    'CaseId', 'POPID', 'Name', 'Neighborhood', 'ChargeCause', 'ChargeGravity', 'EntryType',
    'OpenCycle', 'ArrestCycle', 'DecisionCycle', 'StatusNow', 'LastTransitionCycle',
    'HeldUntilCycle', 'ResolveCycle', 'Outcome', 'CyclesHeld', 'PriorStatus',
    'SourceSystem', 'SourceEventId', 'TransferToId', 'Counterparty'
  ];
  if (!data.length) throw new Error('Judicial_Ledger header row missing');
  var cols = {};
  for (var f = 0; f < fields.length; f++) {
    cols[fields[f]] = data[0].indexOf(fields[f]);
    if (cols[fields[f]] < 0) throw new Error('Judicial_Ledger.' + fields[f] + ' header missing');
  }
  if (data[0].length !== 21) throw new Error('Judicial_Ledger must have 21 columns');
  var open = {};
  var caseIds = {}, caseEventIds = {};
  for (var r = 1; r < data.length; r++) {
    var existing = data[r];
    if (!String(existing[cols.CaseId] || '').trim()) continue;
    caseIds[String(existing[cols.CaseId])] = true;
    if (String(existing[cols.SourceEventId] || '').trim()) caseEventIds[String(existing[cols.SourceEventId])] = true;
    if (existing[cols.ResolveCycle] === '' || existing[cols.ResolveCycle] === null) {
      var pop = String(existing[cols.POPID]);
      if (open.hasOwnProperty(pop)) throw new Error('Judicial_Ledger has two open rows for ' + pop);
      open[pop] = r;
    }
  }
  var events = (ctx.summary && ctx.summary.judicialEvents) || [];
  if (!Array.isArray(events)) throw new Error('Judicial_Ledger: S.judicialEvents must be an array');
  for (var e = 0; e < events.length; e++) {
    var ev = events[e];
    if (!ev || ev.system !== 'judicial') continue;
    var key = String(ev.popId || '');
    if (!key || !ev.sourceEventId) throw new Error('Judicial_Ledger receipt missing POPID or SourceEventId');
    var rowIndex = open.hasOwnProperty(key) ? open[key] : -1;
    if (ev.kind === 'intake' && rowIndex < 0) {
      // Invariant D at the writer: one case per SourceEventId, ever.
      if (caseEventIds[String(ev.sourceEventId)]) {
        Logger.log('persistJudicialLedger_: SourceEventId ' + ev.sourceEventId + ' already has a case — no second row');
        continue;
      }
      var c = openCaseFromReceipt_(ev);
      c.CaseId = careLedgerRowId_(caseIds, c.CaseId);
      caseEventIds[String(ev.sourceEventId)] = true;
      var newRow = [];
      for (var n = 0; n < 21; n++) newRow[n] = '';
      for (var j = 0; j < fields.length; j++) newRow[cols[fields[j]]] = c[fields[j]];
      appendRowWithRetry_(sheet, newRow, 'Judicial_Ledger intake');
      rowIndex = data.length;
      data.push(newRow);
      open[key] = rowIndex;
      continue;
    }
    if (rowIndex < 0) throw new Error('Judicial_Ledger ' + ev.kind + ' without open case for ' + key);
    var row = data[rowIndex].slice();
    if (ev.kind === 'intake' || ev.kind === 'transition') {
      // A same-Cycle re-arrest has no statusNow; custody state remains intact.
      if (ev.statusNow !== undefined) row[cols.StatusNow] = ev.statusNow;
      row[cols.LastTransitionCycle] = ev.lastTransitionCycle || ev.cycle;
      if (ev.heldUntilCycle !== undefined) row[cols.HeldUntilCycle] = ev.heldUntilCycle;
      // An investigation that became an arrest: ArrestCycle is the census's
      // intake stamp (Task 8 R2-1). A re-arrest receipt carries neither.
      if (ev.kind === 'intake' && ev.arrestCycle !== undefined && ev.arrestCycle !== '') {
        row[cols.ArrestCycle] = ev.arrestCycle;
        if (ev.decisionCycle !== undefined && ev.decisionCycle !== '') row[cols.DecisionCycle] = ev.decisionCycle;
      }
      if (ev.resolveCycle !== undefined && ev.resolveCycle !== '') {
        if (ev.outcome === undefined || ev.cyclesHeld === undefined) {
          throw new Error('Judicial_Ledger transition closure missing disposition for ' + key);
        }
        row[cols.ResolveCycle] = ev.resolveCycle;
        row[cols.Outcome] = ev.outcome;
        row[cols.CyclesHeld] = ev.cyclesHeld;
        delete open[key];
      }
    } else if (ev.kind === 'exit') {
      if (ev.statusNow === undefined || ev.resolveCycle === undefined ||
          ev.outcome === undefined || ev.cyclesHeld === undefined) {
        throw new Error('Judicial_Ledger exit missing case disposition for ' + key);
      }
      row[cols.StatusNow] = ev.statusNow;
      row[cols.LastTransitionCycle] = ev.lastTransitionCycle || ev.cycle;
      row[cols.HeldUntilCycle] = ev.heldUntilCycle || '';
      row[cols.ResolveCycle] = ev.resolveCycle;
      row[cols.Outcome] = ev.outcome;
      row[cols.CyclesHeld] = ev.cyclesHeld;
      delete open[key];
    } else {
      throw new Error('Judicial_Ledger unknown receipt kind ' + ev.kind);
    }
    (function(sheetRow, values) {
      persistWithRetry_(function() { sheet.getRange(sheetRow, 1, 1, 21).setValues([values]); },
        'Judicial_Ledger ' + ev.kind);
    })(rowIndex + 1, row);
    data[rowIndex] = row;
  }
  var census = { pending: 0, held: 0 };
  for (var id in open) {
    if (!open.hasOwnProperty(id)) continue;
    var state = data[open[id]][cols.StatusNow];
    if (state === 'pending' || state === 'held') census[state]++;
  }
  ctx.summary.judicialCensus = census;
  return census;
}


/**
 * Get civic context for packet (ES5 compatible)
 */
function getCivicContextForPacket_(ss, cycle, cal) {
  
  var result = {
    electionWindow: false,
    electionGroup: '',
    nextElectionYear: 0,
    nextElectionGroup: '',
    cyclesUntilElection: 999,
    seatsUp: [],
    recentResults: [],
    notableStatuses: [],
    vacancies: 0,
    totalOfficials: 0
  };
  
  var cycleOfYear = cal.cycleOfYear || 1;
  var godWorldYear = cal.godWorldYear || 1;
  
  // Check election window (November = cycles 45-48, even years)
  var inNovember = (cycleOfYear >= 45 && cycleOfYear <= 48);
  var isEvenYear = (godWorldYear % 2 === 0);
  
  if (inNovember && isEvenYear) {
    result.electionWindow = true;
    result.electionGroup = (godWorldYear % 4 === 0) ? 'B' : 'A';
  }
  
  // Calculate next election
  if (!result.electionWindow) {
    var yearsToNextEven = isEvenYear ? 2 : 1;
    result.nextElectionYear = godWorldYear + yearsToNextEven;
    result.nextElectionGroup = (result.nextElectionYear % 4 === 0) ? 'B' : 'A';
    
    var cyclesLeftThisYear = 52 - cycleOfYear;
    var fullYearsWait = yearsToNextEven - 1;
    result.cyclesUntilElection = cyclesLeftThisYear + (fullYearsWait * 52) + 45;
  }
  
  // Read Civic_Office_Ledger
  var officeLedger = ss.getSheetByName('Civic_Office_Ledger');
  if (officeLedger) {
    var data = officeLedger.getDataRange().getValues();
    var header = data[0];
    
    var col = function(h) { return header.indexOf(h); };
    
    var iTitle = col('Title');
    var iType = col('Type');
    var iHolder = col('Holder');
    var iStatus = col('Status');
    var iElectionGroup = col('ElectionGroup');
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var title = row[iTitle] || '';
      if (!title) continue; // skip empty rows
      var type = (row[iType] || '').toLowerCase();
      var holder = row[iHolder] || 'TBD';
      var status = (row[iStatus] || 'active').toLowerCase();
      var group = (row[iElectionGroup] || '').toUpperCase();

      result.totalOfficials++;
      
      // Count vacancies
      if (status === 'vacant' || holder === 'TBD' || holder === '') {
        result.vacancies++;
      }
      
      // Seats up for election
      if (result.electionWindow && type === 'elected' && group === result.electionGroup) {
        result.seatsUp.push({
          title: title,
          holder: holder,
          status: status
        });
      }
      
      // Notable statuses
      if (status !== 'active' && status !== 'vacant') {
        result.notableStatuses.push({
          title: title,
          holder: holder,
          status: status
        });
      }
    }
  }
  
  // Read Election_Log for recent results
  var electionLog = ss.getSheetByName('Election_Log');
  if (electionLog && electionLog.getLastRow() > 1) {
    var logData = electionLog.getDataRange().getValues();
    var logHeader = logData[0];
    
    var lCol = function(h) { return logHeader.indexOf(h); };
    
    var iCycle = lCol('Cycle');
    var iLogTitle = lCol('Title');
    var iIncumbent = lCol('Incumbent');
    var iWinner = lCol('Winner');
    var iMargin = lCol('Margin');
    
    for (var j = 1; j < logData.length; j++) {
      var logRow = logData[j];
      var logCycle = Number(logRow[iCycle]) || 0;
      
      if (logCycle >= cycle - 5) {
        result.recentResults.push({
          cycle: logCycle,
          title: logRow[iLogTitle] || '',
          incumbent: logRow[iIncumbent] || '',
          winner: logRow[iWinner] || '',
          margin: logRow[iMargin] || ''
        });
      }
    }
  }
  
  return result;
}


/**
 * ============================================================================
 * CYCLE_PACKET SHEET SCHEMA (3 columns)
 * ============================================================================
 * 
 * A   Timestamp
 * B   Cycle
 * C   PacketText
 * 
 * That's it. Everything else is IN the PacketText.
 * 
 * ============================================================================
 */
