/**
 * ============================================================================
 * MEDIA ROOM BRIEFING v2.2 — CIVIC & HOLIDAY ENHANCED
 * ============================================================================
 * 
 * v2.2 Enhancements:
 * - NEW: Section 12 — CIVIC STATUS (elections, officials, vacancies)
 * - Enhanced holiday story ideas with Oakland-specific angles
 * - Election window alerts and coverage guidance
 * - Civic official status tracking (injuries, scandals, conditions)
 * - Term expiration warnings for upcoming elections
 * - Integration with Civic_Office_Ledger and Election_Log
 * 
 * v2.1.1 Fix preserved: ' prefix to prevent #ERROR in Sheets
 * 
 * INTEGRATION:
 * Add to Phase 10 in runWorldCycle():
 *   generateMediaBriefing_(ctx);
 * 
 * ============================================================================
 */


/**
 * Main function — call from Phase 10
 */
function generateMediaBriefing_(ctx) {
  
  var ss = ctx.ss;
  var S = ctx.summary || {};
  var cycle = ctx.config.cycleCount || S.cycleId || 0;
  
  // v2.1: Calendar context
  var cal = {
    holiday: S.holiday || 'none',
    holidayPriority: S.holidayPriority || 'none',
    isFirstFriday: S.isFirstFriday || false,
    isCreationDay: S.isCreationDay || false,
    sportsSeason: S.sportsSeason || 'off-season',
    season: S.season || 'unknown',
    month: S.month || 0,
    cycleOfYear: S.cycleOfYear || ((cycle - 1) % 52) + 1,
    godWorldYear: S.godWorldYear || Math.ceil(cycle / 52)
  };
  
  // v2.2: Civic context
  var civic = getCivicContext_(ss, cycle, cal);
  
  var briefing = [];
  
  briefing.push('================================================================================');
  briefing.push('MEDIA ROOM BRIEFING — CYCLE ' + cycle);
  briefing.push('Generated: ' + new Date().toLocaleString());
  // v2.1: Calendar header
  if (cal.holiday !== 'none') {
    briefing.push('🎉 HOLIDAY: ' + cal.holiday + ' (' + cal.holidayPriority + ' priority)');
  }
  if (cal.isFirstFriday) {
    briefing.push('🎨 FIRST FRIDAY — Arts district coverage priority');
  }
  if (cal.isCreationDay) {
    briefing.push('🌳 CREATION DAY — Oakland civic pride coverage');
  }
  if (cal.sportsSeason === 'championship') {
    briefing.push('🏆 CHAMPIONSHIP — Sports elevated to Front Page');
  } else if (cal.sportsSeason === 'playoffs') {
    briefing.push('⚾ PLAYOFFS — Elevated sports coverage');
  }
  // v2.2: Election header
  if (civic.electionWindow) {
    briefing.push('🗳️ ELECTION WINDOW — November ' + cal.godWorldYear + ' elections active');
  }
  briefing.push('================================================================================');
  briefing.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.1: SECTION 0: CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 0. CALENDAR CONTEXT');
  briefing.push('');
  briefing.push('Season: ' + cal.season);
  briefing.push('Month: ' + cal.month);
  briefing.push('Cycle of Year: ' + cal.cycleOfYear + ' / 52');
  briefing.push('GodWorld Year: ' + cal.godWorldYear);
  briefing.push('Holiday: ' + cal.holiday);
  briefing.push('Holiday Priority: ' + cal.holidayPriority);
  briefing.push('First Friday: ' + (cal.isFirstFriday ? 'YES' : 'no'));
  briefing.push('Creation Day: ' + (cal.isCreationDay ? 'YES' : 'no'));
  briefing.push('Sports Season: ' + cal.sportsSeason);
  briefing.push('');
  
  // v2.1: Calendar-specific guidance
  if (cal.holidayPriority === 'oakland') {
    briefing.push('⚡ OAKLAND PRIORITY HOLIDAY — Festival/celebration coverage expected');
    briefing.push('   Coverage zones: ' + getHolidayZones_(cal.holiday));
    briefing.push('   Mood: celebratory, community-focused');
    briefing.push('');
  } else if (cal.holidayPriority === 'major') {
    briefing.push('⚡ MAJOR HOLIDAY — Traditional/family coverage angle');
    briefing.push('   Mood: reflective, family-focused');
    briefing.push('');
  } else if (cal.holidayPriority === 'cultural') {
    briefing.push('⚡ CULTURAL HOLIDAY — Community celebration coverage');
    briefing.push('   Coverage zones: ' + getHolidayZones_(cal.holiday));
    briefing.push('');
  }
  
  if (cal.isFirstFriday) {
    briefing.push('🎨 FIRST FRIDAY GUIDANCE:');
    briefing.push('   - Arts district activity (Temescal, Jack London, KONO)');
    briefing.push('   - Gallery openings, street performances');
    briefing.push('   - Assign: Kai Marston or Sharon Okafor');
    briefing.push('');
  }
  
  if (cal.isCreationDay) {
    briefing.push('🌳 CREATION DAY GUIDANCE:');
    briefing.push('   - Oakland civic pride stories');
    briefing.push('   - Historical Oakland features');
    briefing.push('   - Local business spotlights');
    briefing.push('   - Assign: Carmen Delaine (civic) or feature rotation');
    briefing.push('');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: CYCLE STATUS (Citable Data)
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 1. CYCLE STATUS');
  briefing.push('');
  briefing.push('CITABLE (quote as numbers):');
  
  var weather = S.weather || {};
  var dynamics = S.cityDynamics || {};
  
  briefing.push('- Cycle: ' + cycle);
  briefing.push('- Population: ' + (S.totalPopulation || 'unknown'));
  briefing.push('- Migration Drift: ' + (S.migrationDrift || '0'));
  briefing.push('- Employment Rate: ' + formatPercent_(S.employmentRate));
  briefing.push('- Illness Rate: ' + formatPercent_(S.illnessRate));
  briefing.push('');
  
  briefing.push('HUMANIZE (describe, never quote):');
  briefing.push('- Weather: ' + (weather.type || 'unknown') + ' / ' + (weather.temperature || weather.temp || '?') + '°F');
  briefing.push('- Weather Impact: ' + (weather.impact || '1.0') + ' → describe atmosphere');
  briefing.push('- Sentiment: ' + (dynamics.sentiment || S.sentiment || '0') + ' → "mood shifted" / "spirits lifted"');
  briefing.push('- Traffic: ' + (dynamics.traffic || '?') + ' → "streets packed" / "clear roads"');
  briefing.push('- Nightlife: ' + (dynamics.nightlife || '?') + ' → "every bar full" / "quiet night"');
  briefing.push('- Retail: ' + (dynamics.retail || '?') + ' → "people spending" / "shops quiet"');
  briefing.push('');
  
  briefing.push('SIGNALS:');
  briefing.push('- Cycle Weight: ' + (S.cycleWeight || 'low-signal'));
  briefing.push('- Reason: ' + (S.cycleWeightReason || 'none'));
  briefing.push('- Shock Flag: ' + (S.shockFlag || 'none'));
  briefing.push('- Pattern Flag: ' + (S.patternFlag || 'none'));
  briefing.push('- Civic Load: ' + (S.civicLoad || 'stable'));
  briefing.push('- Sports Season: ' + cal.sportsSeason);
  briefing.push('- Economic Mood: ' + (S.economicMood || '50'));
  briefing.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: FRONT PAGE CALL
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 2. FRONT PAGE RECOMMENDATION');
  briefing.push('');
  
  var frontPageCall = determineFrontPage_(S, ctx, cal, civic);
  briefing.push('Lead Story: ' + frontPageCall.lead);
  briefing.push('Recommended Reporter: ' + frontPageCall.reporter);
  briefing.push('Signal: ' + frontPageCall.signal);
  if (frontPageCall.notes) {
    briefing.push('Notes: ' + frontPageCall.notes);
  }
  briefing.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: SECTION 3: CIVIC STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 3. CIVIC STATUS');
  briefing.push('');
  
  briefing.push('CIVIC LOAD: ' + (S.civicLoad || 'stable'));
  briefing.push('CIVIC OFFICIALS: ' + civic.totalOfficials);
  briefing.push('VACANCIES: ' + civic.vacancies);
  briefing.push('');
  
  // Election status
  if (civic.electionWindow) {
    briefing.push('🗳️ ELECTION WINDOW ACTIVE');
    briefing.push('   Year: ' + cal.godWorldYear + ' | Group: ' + civic.electionGroup);
    briefing.push('   Seats Up: ' + civic.seatsUp.length);
    briefing.push('');
    briefing.push('   SEATS CONTESTED:');
    for (var es = 0; es < civic.seatsUp.length; es++) {
      var seat = civic.seatsUp[es];
      briefing.push('   - ' + seat.title + ': ' + seat.holder + (seat.status !== 'active' ? ' [' + seat.status.toUpperCase() + ']' : ''));
    }
    briefing.push('');
    briefing.push('   COVERAGE GUIDANCE:');
    briefing.push('   - Assign: Carmen Delaine (Civic Desk) lead');
    briefing.push('   - Anthony (Metro) on policy angles');
    briefing.push('   - P Slayer (Opinion) on endorsements, voter mood');
    briefing.push('   - Trevor Shimizu on precinct coverage');
    briefing.push('');
  } else if (civic.cyclesUntilElection <= 10) {
    briefing.push('📅 ELECTION APPROACHING: ' + civic.cyclesUntilElection + ' cycles until November ' + civic.nextElectionYear);
    briefing.push('   Group ' + civic.nextElectionGroup + ' seats up');
    briefing.push('   Pre-election coverage: candidate profiles, policy previews');
    briefing.push('');
  }
  
  // Recent election results (if any)
  if (civic.recentResults && civic.recentResults.length > 0) {
    briefing.push('📊 RECENT ELECTION RESULTS:');
    for (var rr = 0; rr < civic.recentResults.length; rr++) {
      var result = civic.recentResults[rr];
      var upsetFlag = result.winner !== result.incumbent && result.incumbent !== 'TBD' && result.incumbent !== 'Vacant' ? ' ⚡UPSET' : '';
      briefing.push('   - ' + result.title + ': ' + result.winner + ' defeats ' + (result.loser || 'N/A') + ' (' + result.margin + ', ' + result.marginType + ')' + upsetFlag);
    }
    briefing.push('');
    briefing.push('   FOLLOW-UP STORIES:');
    for (var rf = 0; rf < civic.recentResults.length; rf++) {
      var res = civic.recentResults[rf];
      if (res.marginType === 'razor-thin') {
        briefing.push('   - "' + res.title + ' decided by razor-thin margin" — recount possibility?');
      }
      if (res.winner !== res.incumbent && res.incumbent !== 'TBD') {
        briefing.push('   - "New ' + res.title + ' ' + res.winner + ' outlines priorities" — transition profile');
      }
    }
    briefing.push('');
  }
  
  // Officials with notable status
  if (civic.notableStatuses.length > 0) {
    briefing.push('⚠️ OFFICIAL STATUS ALERTS:');
    for (var ns = 0; ns < civic.notableStatuses.length; ns++) {
      var official = civic.notableStatuses[ns];
      briefing.push('   - ' + official.holder + ' (' + official.title + '): ' + official.status.toUpperCase());
      if (official.status === 'scandal') {
        briefing.push('     → Investigation angle: Carmen Delaine or Luis Navarro');
      } else if (official.status === 'serious-condition' || official.status === 'injured') {
        briefing.push('     → Health update: respectful coverage, succession questions');
      } else if (official.status === 'resigned' || official.status === 'retired') {
        briefing.push('     → Legacy piece: Hal Richmond angle, successor speculation');
      }
    }
    briefing.push('');
  }
  
  // Term expirations coming (non-election window)
  if (!civic.electionWindow && civic.termsExpiringSoon.length > 0) {
    briefing.push('📋 TERMS EXPIRING SOON:');
    for (var te = 0; te < civic.termsExpiringSoon.length; te++) {
      var term = civic.termsExpiringSoon[te];
      briefing.push('   - ' + term.title + ' (' + term.holder + '): expires Cycle ' + term.termEnd);
    }
    briefing.push('');
  }
  
  // Appointed position changes
  if (civic.appointedChanges.length > 0) {
    briefing.push('🔄 APPOINTED POSITION CHANGES:');
    for (var ac = 0; ac < civic.appointedChanges.length; ac++) {
      briefing.push('   - ' + civic.appointedChanges[ac]);
    }
    briefing.push('');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.2: SECTION 4: HOLIDAY STORY IDEAS (enhanced)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (cal.holiday !== 'none' || cal.isFirstFriday || cal.isCreationDay) {
    briefing.push('## 4. HOLIDAY/EVENT STORY IDEAS');
    briefing.push('');
    
    var holidayStories = getHolidayStoryIdeas_(cal, civic, S);
    for (var hs = 0; hs < holidayStories.length; hs++) {
      briefing.push(holidayStories[hs]);
    }
    briefing.push('');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: CITIZEN PROMOTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 5. CITIZEN PROMOTIONS');
  briefing.push('');
  
  var promotions = S.promotions || S.tierPromotions || [];
  
  if (S.advancementIntake && S.advancementIntake.length > 0) {
    for (var a = 0; a < S.advancementIntake.length; a++) {
      var adv = S.advancementIntake[a];
      promotions.push({
        name: adv.name || adv.citizenName || '',
        fromTier: adv.fromTier || 'Tier 4',
        toTier: adv.toTier || 'Tier 3',
        neighborhood: adv.neighborhood || '',
        occupation: adv.occupation || ''
      });
    }
  }
  
  if (promotions.length === 0) {
    briefing.push('No promotions this cycle.');
  } else {
    briefing.push('Profile opportunities (Tier 4 → Tier 3):');
    briefing.push('');
    for (var i = 0; i < promotions.length; i++) {
      var p = promotions[i];
      briefing.push('- ' + p.name);
      briefing.push('  ' + (p.fromTier || 'Tier 4') + ' → ' + (p.toTier || 'Tier 3'));
      if (p.neighborhood) briefing.push('  Neighborhood: ' + p.neighborhood);
      if (p.occupation) briefing.push('  Occupation: ' + p.occupation);
      briefing.push('  → Assign: Mags Corliss or Maria Keen');
    }
  }
  briefing.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6: ARC STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 6. ARC STATUS');
  briefing.push('');
  
  var arcs = S.eventArcs || ctx.v3Arcs || [];
  var arcReport = categorizeArcs_(arcs, cycle);
  
  if (arcReport.new.length > 0) {
    briefing.push('NEW ARCS (breaking news):');
    for (var n = 0; n < arcReport.new.length; n++) {
      var na = arcReport.new[n];
      briefing.push('- [' + na.type + '] ' + na.neighborhood);
      briefing.push('  ' + na.summary);
      briefing.push('  Domain: ' + na.domain + ' | Tension: ' + na.tension);
      briefing.push('  → Assign: ' + getArcReporter_(na.type, na.domain));
    }
    briefing.push('');
  }
  
  if (arcReport.phaseChanges.length > 0) {
    briefing.push('PHASE CHANGES (developing story):');
    for (var pc = 0; pc < arcReport.phaseChanges.length; pc++) {
      var change = arcReport.phaseChanges[pc];
      briefing.push('- [' + change.type + '] ' + change.neighborhood + ': ' + change.fromPhase + ' → ' + change.toPhase);
    }
    briefing.push('');
  }
  
  if (arcReport.resolved.length > 0) {
    briefing.push('RESOLVED (wrap-up opportunity):');
    for (var r = 0; r < arcReport.resolved.length; r++) {
      var ra = arcReport.resolved[r];
      briefing.push('- [' + ra.type + '] ' + ra.neighborhood + ' — concluded');
    }
    briefing.push('');
  }
  
  if (arcReport.active.length > 0) {
    briefing.push('ACTIVE (ongoing coverage):');
    for (var aac = 0; aac < arcReport.active.length; aac++) {
      var aa = arcReport.active[aac];
      briefing.push('- [' + aa.type + '] ' + aa.neighborhood + ' | Phase: ' + aa.phase + ' | Tension: ' + aa.tension + ' | Age: ' + aa.age);
    }
    briefing.push('');
  }
  
  if (arcReport.new.length === 0 && arcReport.active.length === 0) {
    briefing.push('No arc activity this cycle.');
    briefing.push('');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7: STORY SEEDS
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 7. STORY SEEDS');
  briefing.push('');
  
  var seeds = S.storySeeds || [];
  
  if (seeds.length === 0) {
    briefing.push('No story seeds this cycle.');
  } else {
    for (var sd = 0; sd < seeds.length; sd++) {
      var seed = seeds[sd];
      briefing.push('- [' + (seed.type || 'general') + '] ' + (seed.domain || '') + ' / ' + (seed.neighborhood || ''));
      briefing.push('  "' + (seed.text || seed.seedText || '') + '"');
      briefing.push('  Priority: ' + (seed.priority || 'normal'));
    }
  }
  briefing.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8: WORLD EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 8. WORLD EVENTS');
  briefing.push('');
  
  var events = S.worldEvents || [];
  
  if (events.length === 0) {
    briefing.push('No world events this cycle.');
  } else {
    for (var ev = 0; ev < events.length; ev++) {
      var evt = events[ev];
      briefing.push('- ' + (evt.description || evt.event || '') + ' [' + (evt.severity || 'low') + ']');
    }
  }
  briefing.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 9: CONTINUITY LOOP
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 9. CONTINUITY LOOP');
  briefing.push('');
  
  var continuity = getContinuityFromLoop_(ss, cycle);
  
  if (continuity.activeStorylines.length > 0) {
    briefing.push('ACTIVE STORYLINES (Media Room tracking):');
    for (var as = 0; as < continuity.activeStorylines.length; as++) {
      var storyline = continuity.activeStorylines[as];
      briefing.push('- [' + storyline.type + '] ' + storyline.description);
      if (storyline.neighborhood) briefing.push('  Neighborhood: ' + storyline.neighborhood);
    }
    briefing.push('');
  }
  
  if (continuity.recentNotes.length > 0) {
    briefing.push('RECENT CONTINUITY NOTES:');
    for (var cn = 0; cn < continuity.recentNotes.length; cn++) {
      var note = continuity.recentNotes[cn];
      briefing.push('- [C' + note.cycle + ' ' + note.type + '] ' + note.description);
    }
    briefing.push('');
  }
  
  // Engine-detected continuity
  var engineContinuity = getEngineContinuity_(S, arcs);
  if (engineContinuity.length > 0) {
    briefing.push('ENGINE-DETECTED THREADS:');
    for (var ec = 0; ec < engineContinuity.length; ec++) {
      briefing.push('- ' + engineContinuity[ec]);
    }
    briefing.push('');
  }
  
  if (continuity.activeStorylines.length === 0 && continuity.recentNotes.length === 0 && engineContinuity.length === 0) {
    briefing.push('No continuity triggers.');
    briefing.push('');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 10: CULTURAL ENTITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 10. CULTURAL ENTITIES');
  briefing.push('');
  
  var newEntities = S.culturalEntityCreates || [];
  var updatedEntities = S.culturalEntityUpdates || [];
  
  if (newEntities.length > 0) {
    briefing.push('NEW (profile opportunity):');
    for (var ne = 0; ne < newEntities.length; ne++) {
      var newEnt = newEntities[ne];
      briefing.push('- ' + newEnt.name + ' (' + (newEnt.fameCategory || '') + '/' + (newEnt.domain || '') + ')');
      briefing.push('  → Assign: Kai Marston or Sharon Okafor');
    }
    briefing.push('');
  }
  
  if (updatedEntities.length > 0) {
    briefing.push('ACTIVE (media momentum):');
    for (var ue = 0; ue < Math.min(updatedEntities.length, 5); ue++) {
      var upEnt = updatedEntities[ue];
      briefing.push('- ' + upEnt.name + ' — Fame: ' + upEnt.newFameScore + ', MediaCount: ' + upEnt.mediaCount);
    }
    briefing.push('');
  }
  
  if (newEntities.length === 0 && updatedEntities.length === 0) {
    briefing.push('No cultural entity changes.');
    briefing.push('');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 11: BOND ACTIVITY
  // ═══════════════════════════════════════════════════════════════════════════
  
  var bondSummary = S.bondSummary || {};
  
  if (bondSummary.activeBonds > 0 || (S.pendingConfrontations && S.pendingConfrontations.length > 0)) {
    briefing.push('## 11. CITIZEN BONDS');
    briefing.push('');
    briefing.push('Active: ' + (bondSummary.activeBonds || 0) + ' | Rivalries: ' + (bondSummary.rivalries || 0) + ' | Alliances: ' + (bondSummary.alliances || 0));
    
    if (bondSummary.festivalBonds > 0) {
      briefing.push('Festival Bonds: ' + bondSummary.festivalBonds);
    }
    if (bondSummary.sportsRivalries > 0) {
      briefing.push('Sports Rivalries: ' + bondSummary.sportsRivalries);
    }
    
    if (S.pendingConfrontations && S.pendingConfrontations.length > 0) {
      briefing.push('');
      briefing.push('CONFRONTATIONS PENDING (drama opportunity):');
      for (var cf = 0; cf < S.pendingConfrontations.length; cf++) {
        var conf = S.pendingConfrontations[cf];
        briefing.push('- ' + conf.citizenA + ' vs ' + conf.citizenB + ' (intensity ' + conf.intensity + ')');
      }
    }
    
    if (bondSummary.hottestBonds && bondSummary.hottestBonds.length > 0) {
      briefing.push('');
      briefing.push('HOT BONDS:');
      for (var hb = 0; hb < bondSummary.hottestBonds.length; hb++) {
        var hot = bondSummary.hottestBonds[hb];
        briefing.push('- ' + hot.citizens + ' (' + hot.type + ', ' + hot.intensity + ')');
      }
    }
    briefing.push('');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 12: SPORTS DESK
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 12. SPORTS DESK');
  briefing.push('');
  briefing.push('Season: ' + cal.sportsSeason);
  briefing.push('');
  
  if (cal.sportsSeason === 'championship') {
    briefing.push('🏆 CHAMPIONSHIP MODE:');
    briefing.push('   - FRONT PAGE PRIORITY');
    briefing.push('   - Full desk mobilization');
    briefing.push('   - Anthony (stats/data), P Slayer (fan pulse), Hal Richmond (history)');
    briefing.push('   - Economic angle: Jack London businesses, merchandise sales');
    briefing.push('   - Consider: Victory parade prep, civic pride angle');
    briefing.push('');
  } else if (cal.sportsSeason === 'playoffs') {
    briefing.push('⚾ PLAYOFF MODE:');
    briefing.push('   - Elevated coverage, Front Page consideration');
    briefing.push('   - Anthony (Lead) + Hal Richmond (History)');
    briefing.push('   - P Slayer on fan community');
    briefing.push('   - Economic angle: playoff spending in Jack London');
    briefing.push('');
  } else if (cal.sportsSeason === 'late-season') {
    briefing.push('📊 LATE SEASON:');
    briefing.push('   - Playoff race coverage if contending');
    briefing.push('   - Anthony on standings/scenarios');
    briefing.push('');
  } else if (cal.sportsSeason === 'spring-training') {
    briefing.push('🌸 SPRING TRAINING:');
    briefing.push('   - A\'s spring training active — Anthony on roster coverage');
    briefing.push('   - Hal Richmond on prospects, P Slayer on fan expectations');
    briefing.push('');
  } else if (cal.sportsSeason === 'off-season') {
    briefing.push('❄️ OFF-SEASON:');
    briefing.push('   - Trade/signing coverage if news breaks');
    briefing.push('   - Historical features, fan community');
    briefing.push('');
  } else {
    briefing.push('Regular season — game coverage rotation');
    briefing.push('');
  }
  
  briefing.push('Chicago: Bulls coverage via Selena Grant');
  briefing.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 13: SECTION ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 13. SECTION ASSIGNMENTS');
  briefing.push('');
  
  var assignments = generateSectionAssignments_(S, arcReport, seeds, promotions, cal, civic);
  
  briefing.push('FRONT PAGE: ' + assignments.frontPage);
  briefing.push('METRO: ' + assignments.metro);
  briefing.push('CIVIC: ' + assignments.civic);
  briefing.push('BUSINESS: ' + assignments.business);
  briefing.push('SPORTS: ' + assignments.sports);
  briefing.push('CHICAGO: ' + assignments.chicago);
  briefing.push('CULTURE: ' + assignments.culture);
  briefing.push('OPINION: ' + assignments.opinion);
  if (assignments.festival) {
    briefing.push('FESTIVAL: ' + assignments.festival);
  }
  if (assignments.election) {
    briefing.push('ELECTION: ' + assignments.election);
  }
  briefing.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 14: CULTURAL INDEX TEMPLATE
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 14. CULTURAL INDEX TEMPLATE');
  briefing.push('');
  briefing.push('When filing articles, include Cultural Index in this format:');
  briefing.push('');
  briefing.push('14. CULTURAL INDEX');
  briefing.push('- Name (role) @ Neighborhood');
  briefing.push('- Name (role) @ Neighborhood');
  briefing.push('');
  briefing.push('Example:');
  briefing.push('- Marcus Webb (community organizer) @ West Oakland');
  briefing.push('- Janae Rivers (council member) @ Temescal');
  briefing.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('================================================================================');
  briefing.push('END BRIEFING — Cycle ' + cycle);
  if (cal.holiday !== 'none') {
    briefing.push('Holiday: ' + cal.holiday + ' | Priority: ' + cal.holidayPriority);
  }
  if (civic.electionWindow) {
    briefing.push('🗳️ ELECTION WINDOW: Group ' + civic.electionGroup + ' seats contested');
  }
  briefing.push('Sports: ' + cal.sportsSeason + ' | Season: ' + cal.season);
  briefing.push('');
  briefing.push('MEDIA ROOM RETURNS:');
  briefing.push('1. Article Table (Media_Intake)');
  briefing.push('2. Storylines Carried Forward (Storyline_Intake)');
  briefing.push('3. Citizen Usage Log (Citizen_Usage_Intake)');
  briefing.push('4. Continuity Notes (Continuity_Intake)');
  briefing.push('================================================================================');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE TO SHEET
  // ═══════════════════════════════════════════════════════════════════════════
  
  var output = briefing.join('\n');
  
  try {
    var sheet = ss.getSheetByName('Media_Briefing');
    
    if (!sheet) {
      sheet = ss.insertSheet('Media_Briefing');
      sheet.appendRow(['Timestamp', 'Cycle', 'Holiday', 'HolidayPriority', 'SportsSeason', 'ElectionWindow', 'Briefing']);
      sheet.setFrozenRows(1);
      sheet.setColumnWidth(7, 800);
    }
    
    // v2.1.1 FIX: Prefix with ' to prevent #ERROR from = signs
    sheet.appendRow([new Date(), cycle, cal.holiday, cal.holidayPriority, cal.sportsSeason, civic.electionWindow, "'" + output]);
    Logger.log('generateMediaBriefing_ v2.2: Briefing generated for Cycle ' + cycle + ' | Holiday: ' + cal.holiday + ' | Election: ' + civic.electionWindow);
    
  } catch (e) {
    Logger.log('generateMediaBriefing_ error: ' + e.message);
  }
  
  ctx.summary.mediaBriefing = output;
  return output;
}


// ════════════════════════════════════════════════════════════════════════════
// v2.2: CIVIC CONTEXT HELPER
// ════════════════════════════════════════════════════════════════════════════

function getCivicContext_(ss, cycle, cal) {
  
  var result = {
    electionWindow: false,
    electionGroup: '',
    nextElectionYear: 0,
    nextElectionGroup: '',
    cyclesUntilElection: 999,
    seatsUp: [],
    recentResults: [],
    notableStatuses: [],
    termsExpiringSoon: [],
    appointedChanges: [],
    vacancies: 0,
    totalOfficials: 0
  };
  
  var cycleOfYear = cal.cycleOfYear;
  var godWorldYear = cal.godWorldYear;
  
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
    
    // Calculate cycles until November of next election year
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
    var iTermEnd = col('TermEnd');
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var title = row[iTitle] || '';
      var type = (row[iType] || '').toLowerCase();
      var holder = row[iHolder] || 'TBD';
      var status = (row[iStatus] || 'active').toLowerCase();
      var group = (row[iElectionGroup] || '').toUpperCase();
      var termEnd = Number(row[iTermEnd]) || 0;
      
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
      
      // Notable statuses (scandal, injury, serious condition, resigned, retired)
      if (status !== 'active' && status !== 'vacant') {
        result.notableStatuses.push({
          title: title,
          holder: holder,
          status: status
        });
      }
      
      // Terms expiring soon (within 20 cycles)
      if (type === 'elected' && termEnd > 0 && termEnd <= cycle + 20 && termEnd > cycle) {
        result.termsExpiringSoon.push({
          title: title,
          holder: holder,
          termEnd: termEnd
        });
      }
    }
  }
  
  // Read Election_Log for recent results (last 5 cycles)
  var electionLog = ss.getSheetByName('Election_Log');
  if (electionLog && electionLog.getLastRow() > 1) {
    var logData = electionLog.getDataRange().getValues();
    var logHeader = logData[0];
    
    var lCol = function(h) { return logHeader.indexOf(h); };
    
    var iCycle = lCol('Cycle');
    var iLogTitle = lCol('Title');
    var iIncumbent = lCol('Incumbent');
    var iChallenger = lCol('Challenger');
    var iWinner = lCol('Winner');
    var iMargin = lCol('Margin');
    var iMarginType = lCol('MarginType');
    
    for (var j = 1; j < logData.length; j++) {
      var logRow = logData[j];
      var logCycle = Number(logRow[iCycle]) || 0;
      
      if (logCycle >= cycle - 5) {
        var winner = logRow[iWinner] || '';
        var incumbent = logRow[iIncumbent] || '';
        var challenger = logRow[iChallenger] || '';
        var loser = (winner === incumbent) ? challenger : incumbent;
        
        result.recentResults.push({
          cycle: logCycle,
          title: logRow[iLogTitle] || '',
          incumbent: incumbent,
          challenger: challenger,
          winner: winner,
          loser: loser,
          margin: logRow[iMargin] || '',
          marginType: logRow[iMarginType] || ''
        });
      }
    }
  }
  
  return result;
}


// ════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function formatPercent_(value) {
  if (!value) return 'unknown';
  var num = Number(value);
  if (isNaN(num)) return 'unknown';
  if (num <= 1) return Math.round(num * 100) + '%';
  return Math.round(num) + '%';
}


function getHolidayZones_(holiday) {
  var zones = {
    'OaklandPride': 'Downtown, Lake Merritt, Grand Lake, Jack London',
    'ArtSoulFestival': 'Downtown, Jack London',
    'LunarNewYear': 'Chinatown, Downtown',
    'CincoDeMayo': 'Fruitvale',
    'DiaDeMuertos': 'Fruitvale',
    'Juneteenth': 'West Oakland, Downtown',
    'Independence': 'Lake Merritt, Jack London',
    'MLKDay': 'Downtown, West Oakland',
    'LaborDay': 'Jack London, Downtown',
    'Halloween': 'Temescal, Rockridge, Piedmont Ave',
    'Easter': 'Lake Merritt, Fruitvale',
    'Thanksgiving': 'citywide (home-focused)',
    'Holiday': 'Downtown, Jack London, Lake Merritt',
    'NewYearsEve': 'Jack London, Downtown, Lake Merritt'
  };
  return zones[holiday] || 'citywide';
}


/**
 * v2.2: Enhanced holiday story ideas with civic angle
 */
function getHolidayStoryIdeas_(cal, civic, S) {
  var ideas = [];
  
  // ─────────────────────────────────────────────────────────────────────────
  // OAKLAND-SPECIFIC HOLIDAYS
  // ─────────────────────────────────────────────────────────────────────────
  
  if (cal.holiday === 'OaklandPride') {
    ideas.push('');
    ideas.push('🏳️‍🌈 OAKLAND PRIDE COVERAGE:');
    ideas.push('- [FESTIVAL] Pride parade route and festivities — Kai Marston');
    ideas.push('- [CULTURE] LGBTQ+ community voices and stories — Sharon Okafor');
    ideas.push('- [BUSINESS] Rainbow economy: Pride spending Downtown — Jordan Velez');
    ideas.push('- [METRO] Street closures and transit impacts — Trevor Shimizu');
    ideas.push('- [CIVIC] Mayor Santana Pride proclamation — Carmen Delaine');
    ideas.push('- [OPINION] Pride reflections, community progress — Farrah Del Rio');
    ideas.push('Coverage zones: Downtown, Lake Merritt, Grand Lake');
  }
  
  if (cal.holiday === 'ArtSoulFestival') {
    ideas.push('');
    ideas.push('🎭 ART & SOUL FESTIVAL COVERAGE:');
    ideas.push('- [FESTIVAL] Main stage highlights, headliners — Kai Marston');
    ideas.push('- [CULTURE] Local artists featured — Sharon Okafor');
    ideas.push('- [FOOD] Festival vendors, food court — feature rotation');
    ideas.push('- [BUSINESS] Economic impact, vendor stories — Jordan Velez');
    ideas.push('- [CIVIC] City arts investment, Santana remarks — Carmen Delaine');
    ideas.push('Coverage zones: Downtown, Frank Ogawa Plaza');
  }
  
  if (cal.holiday === 'OpeningDay') {
    ideas.push('');
    ideas.push('⚾ A\'s OPENING DAY COVERAGE:');
    ideas.push('- [SPORTS] Game coverage, season preview — Anthony (lead)');
    ideas.push('- [FAN] Tailgating traditions, fan stories — P Slayer');
    ideas.push('- [HISTORY] Opening Day through the years — Hal Richmond');
    ideas.push('- [BUSINESS] Jack London economic boost — Jordan Velez');
    ideas.push('- [CIVIC] First pitch, mayoral attendance — Carmen Delaine');
    ideas.push('- [TRANSIT] Coliseum BART surge — Trevor Shimizu');
    ideas.push('Coverage zones: Coliseum, Jack London Square');
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // CULTURAL HOLIDAYS
  // ─────────────────────────────────────────────────────────────────────────
  
  if (cal.holiday === 'LunarNewYear') {
    ideas.push('');
    ideas.push('🧧 LUNAR NEW YEAR COVERAGE:');
    ideas.push('- [CULTURAL] Chinatown celebrations — feature rotation');
    ideas.push('- [CULTURE] Lion dance, cultural performances — Kai Marston');
    ideas.push('- [BUSINESS] Lunar New Year economic impact — Jordan Velez');
    ideas.push('- [FOOD] Traditional foods, restaurant features — Sharon Okafor');
    ideas.push('- [CIVIC] Council member remarks, proclamation — Carmen Delaine');
    ideas.push('Coverage zones: Chinatown, Downtown');
  }
  
  if (cal.holiday === 'CincoDeMayo') {
    ideas.push('');
    ideas.push('🇲🇽 CINCO DE MAYO COVERAGE:');
    ideas.push('- [CULTURAL] Fruitvale celebration — feature rotation');
    ideas.push('- [CULTURE] Music, dance performances — Kai Marston');
    ideas.push('- [FOOD] Traditional cuisine spotlight — Sharon Okafor');
    ideas.push('- [BUSINESS] Fruitvale business surge — Jordan Velez');
    ideas.push('- [CIVIC] Community leader remarks — Carmen Delaine');
    ideas.push('Coverage zones: Fruitvale, International Blvd');
  }
  
  if (cal.holiday === 'DiaDeMuertos') {
    ideas.push('');
    ideas.push('💀 DÍA DE MUERTOS COVERAGE:');
    ideas.push('- [CULTURAL] Fruitvale ofrenda installations — feature rotation');
    ideas.push('- [CULTURE] Altar traditions, family stories — Sharon Okafor');
    ideas.push('- [PHOTO] Visual essay: altars of Oakland — photo desk');
    ideas.push('- [CIVIC] Community commemoration — Carmen Delaine');
    ideas.push('Coverage zones: Fruitvale, Oakland Museum');
  }
  
  if (cal.holiday === 'Juneteenth') {
    ideas.push('');
    ideas.push('✊ JUNETEENTH COVERAGE:');
    ideas.push('- [CULTURAL] West Oakland commemoration — feature rotation');
    ideas.push('- [HISTORY] Oakland\'s Black history — Hal Richmond');
    ideas.push('- [CULTURE] Music, performances — Kai Marston');
    ideas.push('- [CIVIC] Mayor Santana remarks, proclamation — Carmen Delaine');
    ideas.push('- [COMMUNITY] Community voices, reflections — Sharon Okafor');
    ideas.push('- [OPINION] Juneteenth significance — P Slayer or Farrah Del Rio');
    ideas.push('Coverage zones: West Oakland, Downtown');
  }
  
  if (cal.holiday === 'IndigenousPeoplesDay') {
    ideas.push('');
    ideas.push('🪶 INDIGENOUS PEOPLES DAY COVERAGE:');
    ideas.push('- [CULTURAL] Ohlone recognition events — feature rotation');
    ideas.push('- [HISTORY] Oakland\'s indigenous history — Hal Richmond');
    ideas.push('- [CIVIC] City acknowledgment, proclamation — Carmen Delaine');
    ideas.push('Coverage zones: Downtown, Lake Merritt');
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // MAJOR HOLIDAYS
  // ─────────────────────────────────────────────────────────────────────────
  
  if (cal.holiday === 'MLKDay') {
    ideas.push('');
    ideas.push('✊ MLK DAY COVERAGE:');
    ideas.push('- [CIVIC] MLK Day march, civic ceremony — Carmen Delaine');
    ideas.push('- [COMMUNITY] Service projects, volunteer stories — Sharon Okafor');
    ideas.push('- [HISTORY] Oakland civil rights history — Hal Richmond');
    ideas.push('- [OPINION] MLK legacy reflections — P Slayer or Farrah Del Rio');
    ideas.push('Coverage zones: Downtown, West Oakland');
  }
  
  if (cal.holiday === 'Independence') {
    ideas.push('');
    ideas.push('🎆 FOURTH OF JULY COVERAGE:');
    ideas.push('- [METRO] Festivities, safety reminders — metro rotation');
    ideas.push('- [FEATURE] Lake Merritt fireworks — photo desk');
    ideas.push('- [CIVIC] Mayor\'s Independence Day message — Carmen Delaine');
    ideas.push('- [BUSINESS] Holiday weekend commerce — Jordan Velez');
    ideas.push('Coverage zones: Lake Merritt, Jack London');
  }
  
  if (cal.holiday === 'LaborDay') {
    ideas.push('');
    ideas.push('⚒️ LABOR DAY COVERAGE:');
    ideas.push('- [CIVIC] Labor march, union events — Carmen Delaine');
    ideas.push('- [BUSINESS] Oakland workforce spotlight — Jordan Velez');
    ideas.push('- [HISTORY] Oakland labor history — Hal Richmond');
    ideas.push('Coverage zones: Downtown, Jack London');
  }
  
  if (cal.holiday === 'VeteransDay') {
    ideas.push('');
    ideas.push('🎖️ VETERANS DAY COVERAGE:');
    ideas.push('- [CIVIC] Veterans ceremony, memorial events — Carmen Delaine');
    ideas.push('- [FEATURE] Oakland veteran profiles — Sharon Okafor');
    ideas.push('- [HISTORY] Oakland military history — Hal Richmond');
  }
  
  if (cal.holiday === 'MemorialDay') {
    ideas.push('');
    ideas.push('🪦 MEMORIAL DAY COVERAGE:');
    ideas.push('- [CIVIC] Memorial ceremony, civic observance — Carmen Delaine');
    ideas.push('- [FEATURE] Gold Star family stories — Sharon Okafor');
    ideas.push('- [BUSINESS] Holiday weekend commerce — Jordan Velez');
  }
  
  if (cal.holiday === 'Thanksgiving') {
    ideas.push('');
    ideas.push('🦃 THANKSGIVING COVERAGE:');
    ideas.push('- [FEATURE] Community gratitude stories — Mags Corliss');
    ideas.push('- [COMMUNITY] Food drives, volunteer efforts — Sharon Okafor');
    ideas.push('- [CIVIC] City gratitude message — Carmen Delaine');
    ideas.push('- [BUSINESS] Holiday shopping preview — Jordan Velez');
  }
  
  if (cal.holiday === 'Holiday') {
    ideas.push('');
    ideas.push('🎄 HOLIDAY SEASON COVERAGE:');
    ideas.push('- [FEATURE] Holiday spirit in Oakland — Mags Corliss');
    ideas.push('- [BUSINESS] Local shopping, small business — Jordan Velez');
    ideas.push('- [COMMUNITY] Holiday giving programs — Sharon Okafor');
    ideas.push('- [CIVIC] City holiday events — Carmen Delaine');
    ideas.push('- [CULTURE] Holiday performances — Kai Marston');
  }
  
  if (cal.holiday === 'NewYearsEve') {
    ideas.push('');
    ideas.push('🎊 NEW YEAR\'S EVE COVERAGE:');
    ideas.push('- [FEATURE] Year in review — editorial team');
    ideas.push('- [METRO] Celebration events, safety — metro rotation');
    ideas.push('- [CIVIC] Mayor\'s year-end message — Carmen Delaine');
    ideas.push('- [CULTURE] Countdown events — Kai Marston');
  }
  
  if (cal.holiday === 'NewYear') {
    ideas.push('');
    ideas.push('🎉 NEW YEAR\'S DAY COVERAGE:');
    ideas.push('- [CIVIC] Mayor\'s New Year address — Carmen Delaine');
    ideas.push('- [FEATURE] New Year resolutions, community voices — Sharon Okafor');
    ideas.push('- [OPINION] Year ahead outlook — Farrah Del Rio');
  }
  
  if (cal.holiday === 'Halloween') {
    ideas.push('');
    ideas.push('🎃 HALLOWEEN COVERAGE:');
    ideas.push('- [CULTURE] Costume parades, events — Kai Marston');
    ideas.push('- [COMMUNITY] Trick-or-treat zones, safety — Sharon Okafor');
    ideas.push('- [BUSINESS] Halloween commerce — Jordan Velez');
    ideas.push('Coverage zones: Temescal, Rockridge, Piedmont Ave');
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY
  // ─────────────────────────────────────────────────────────────────────────
  
  if (cal.isFirstFriday) {
    ideas.push('');
    ideas.push('🎨 FIRST FRIDAY COVERAGE:');
    ideas.push('- [ARTS] Gallery walk highlights — Kai Marston');
    ideas.push('- [CULTURE] Street performers, pop-ups — Sharon Okafor');
    ideas.push('- [NIGHTLIFE] Arts district after dark — feature rotation');
    ideas.push('- [BUSINESS] KONO/Temescal business spotlight — Jordan Velez');
    ideas.push('Coverage zones: KONO, Temescal, Uptown');
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // CREATION DAY
  // ─────────────────────────────────────────────────────────────────────────
  
  if (cal.isCreationDay) {
    ideas.push('');
    ideas.push('🌳 CREATION DAY COVERAGE:');
    ideas.push('- [CIVIC] Oakland Creation Day celebration — Carmen Delaine');
    ideas.push('- [HISTORY] Oakland founding history — Hal Richmond');
    ideas.push('- [LOCAL] Shop local spotlight — Jordan Velez');
    ideas.push('- [COMMUNITY] Oakland pride stories — Sharon Okafor');
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // CIVIC OVERLAY (if election window or notable civic status)
  // ─────────────────────────────────────────────────────────────────────────
  
  if (civic && civic.electionWindow) {
    ideas.push('');
    ideas.push('🗳️ ELECTION OVERLAY:');
    ideas.push('- Holiday + Election: Voter turnout angle');
    ideas.push('- Candidate appearances at holiday events');
    ideas.push('- "Issues at the celebration" — policy sidebar');
  }
  
  if (civic && civic.notableStatuses && civic.notableStatuses.length > 0) {
    ideas.push('');
    ideas.push('⚠️ CIVIC STATUS OVERLAY:');
    for (var ns = 0; ns < civic.notableStatuses.length; ns++) {
      var off = civic.notableStatuses[ns];
      if (off.status === 'scandal') {
        ideas.push('- [INVESTIGATION] ' + off.title + ' scandal update — Luis Navarro');
      } else if (off.status === 'serious-condition') {
        ideas.push('- [UPDATE] ' + off.holder + ' health status — respectful coverage');
      }
    }
  }
  
  if (ideas.length === 0) {
    ideas.push('No specific holiday stories — standard coverage rotation');
  }
  
  return ideas;
}


/**
 * v2.2: Calendar and civic-aware front page determination
 */
function determineFrontPage_(S, ctx, cal, civic) {
  
  // Priority: Shock > Election Results > Health Crisis > Championship > Oakland Festival > New Arc > Election Window > Promotion > Sports Playoff > Weather Event
  
  if (S.shockFlag && S.shockFlag !== 'none') {
    return {
      lead: 'SHOCK EVENT — ' + (S.cycleWeightReason || 'Disruption detected'),
      reporter: 'Luis Navarro (Investigations) or Carmen Delaine (Civic)',
      signal: 'shock-flag',
      notes: 'Breaking news priority'
    };
  }
  
  // v2.2: Election results take front page
  if (civic.recentResults && civic.recentResults.length > 0) {
    var hasUpset = false;
    var mayorResult = null;
    for (var er = 0; er < civic.recentResults.length; er++) {
      var res = civic.recentResults[er];
      if (res.winner !== res.incumbent && res.incumbent !== 'TBD' && res.incumbent !== 'Vacant') {
        hasUpset = true;
      }
      if (res.title === 'Mayor') {
        mayorResult = res;
      }
    }
    
    if (mayorResult) {
      return {
        lead: '🗳️ MAYORAL ELECTION — ' + mayorResult.winner + (hasUpset ? ' DEFEATS INCUMBENT' : ' wins'),
        reporter: 'Carmen Delaine (Civic) lead, full civic desk',
        signal: 'election-mayor',
        notes: 'Margin: ' + mayorResult.margin + ' (' + mayorResult.marginType + ')'
      };
    }
    
    return {
      lead: '🗳️ ELECTION RESULTS — ' + civic.recentResults.length + ' races decided' + (hasUpset ? ' (UPSETS)' : ''),
      reporter: 'Carmen Delaine (Civic) lead',
      signal: 'election-results',
      notes: civic.recentResults.map(function(r) { return r.title + ': ' + r.winner; }).join(', ')
    };
  }
  
  var arcs = S.eventArcs || ctx.v3Arcs || [];
  
  // Health crisis check
  var healthCrisis = null;
  for (var h = 0; h < arcs.length; h++) {
    if (arcs[h] && arcs[h].type === 'health-crisis' && arcs[h].phase !== 'resolved') {
      healthCrisis = arcs[h];
      break;
    }
  }
  if (healthCrisis) {
    return {
      lead: 'HEALTH CRISIS — ' + (healthCrisis.neighborhood || 'citywide'),
      reporter: 'Dr. Lila Mezran (Health Desk)',
      signal: 'health-crisis',
      notes: 'Tension: ' + healthCrisis.tension
    };
  }
  
  // Championship takes front page
  if (cal.sportsSeason === 'championship') {
    return {
      lead: '🏆 CHAMPIONSHIP — Oakland sports moment',
      reporter: 'Anthony (Lead) + Full Sports Desk',
      signal: 'sports-championship',
      notes: 'Historic coverage moment — all hands'
    };
  }
  
  // Oakland-priority holidays can lead
  if (cal.holidayPriority === 'oakland') {
    return {
      lead: '🎉 ' + cal.holiday.toUpperCase() + ' — Oakland celebrates',
      reporter: 'Kai Marston (Culture) + rotation',
      signal: 'holiday-oakland',
      notes: 'Festival coverage zones: ' + getHolidayZones_(cal.holiday)
    };
  }
  
  // New arc
  var newArc = null;
  for (var n = 0; n < arcs.length; n++) {
    if (arcs[n] && arcs[n].age === 0) {
      newArc = arcs[n];
      break;
    }
  }
  if (newArc) {
    return {
      lead: 'NEW ' + (newArc.type || 'DEVELOPMENT').toUpperCase() + ' — ' + (newArc.neighborhood || ''),
      reporter: getArcReporter_(newArc.type, newArc.domain),
      signal: 'crisis-arc',
      notes: newArc.summary || ''
    };
  }
  
  // v2.2: Election window (no results yet)
  if (civic.electionWindow && (!civic.recentResults || civic.recentResults.length === 0)) {
    return {
      lead: '🗳️ ELECTION DAY — ' + civic.seatsUp.length + ' seats contested',
      reporter: 'Carmen Delaine (Civic) lead',
      signal: 'election-day',
      notes: 'Group ' + civic.electionGroup + ' elections'
    };
  }
  
  // Playoffs elevated
  if (cal.sportsSeason === 'playoffs') {
    return {
      lead: '⚾ PLAYOFFS — A\'s postseason coverage',
      reporter: 'Anthony (Lead) + Hal Richmond (History)',
      signal: 'sports-playoffs',
      notes: 'Sports elevated to Front Page'
    };
  }
  
  // First Friday can lead on slow days
  if (cal.isFirstFriday) {
    return {
      lead: '🎨 FIRST FRIDAY — Oakland arts night',
      reporter: 'Kai Marston or Sharon Okafor',
      signal: 'first-friday',
      notes: 'Arts district focus — Temescal, Jack London, KONO'
    };
  }
  
  // Creation Day can lead
  if (cal.isCreationDay) {
    return {
      lead: '🌳 CREATION DAY — Oakland civic pride',
      reporter: 'Carmen Delaine (Civic) or Mags Corliss',
      signal: 'creation-day',
      notes: 'Local business, community features'
    };
  }
  
  return {
    lead: 'EDITOR\'S CHOICE — Feature or follow-up',
    reporter: 'Mags Corliss calls the lead',
    signal: 'editorial',
    notes: 'Quiet cycle — depth over urgency'
  };
}


function getArcReporter_(arcType, domain) {
  if (arcType === 'health-crisis') return 'Dr. Lila Mezran';
  if (arcType === 'crisis' && domain === 'CIVIC') return 'Carmen Delaine';
  if (arcType === 'crisis') return 'Luis Navarro';
  if (domain === 'TRANSIT' || domain === 'INFRASTRUCTURE') return 'Trevor Shimizu';
  if (domain === 'SAFETY' || domain === 'CRIME') return 'Sgt. Rachel Torres';
  return 'Luis Navarro or Carmen Delaine';
}


function categorizeArcs_(arcs, cycle) {
  var result = { new: [], phaseChanges: [], resolved: [], active: [] };
  
  for (var i = 0; i < arcs.length; i++) {
    var arc = arcs[i];
    if (!arc) continue;
    
    var arcData = {
      arcId: arc.arcId || '',
      type: arc.type || '',
      phase: arc.phase || '',
      tension: arc.tension || arc.arcStrength || 0,
      neighborhood: arc.neighborhood || '',
      domain: arc.domainTag || arc.domain || '',
      age: arc.age || 0,
      summary: arc.summary || arc.notes || '',
      fromPhase: arc.prevPhase || '',
      toPhase: arc.phase || ''
    };
    
    if (arc.age === 0 || arc.cycleCreated === cycle) {
      result.new.push(arcData);
    } else if (arc.phase === 'resolved') {
      result.resolved.push(arcData);
    } else if (arc.prevPhase && arc.prevPhase !== arc.phase) {
      result.phaseChanges.push(arcData);
      result.active.push(arcData);
    } else {
      result.active.push(arcData);
    }
  }
  
  return result;
}


function getContinuityFromLoop_(ss, cycle) {
  var result = { activeStorylines: [], recentNotes: [] };
  
  var storylineSheet = ss.getSheetByName('Storyline_Tracker');
  if (storylineSheet) {
    var data = storylineSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][7] === 'active') {
        result.activeStorylines.push({
          type: data[i][2],
          description: data[i][3],
          neighborhood: data[i][4]
        });
      }
    }
  }
  
  var loopSheet = ss.getSheetByName('Continuity_Loop');
  if (loopSheet) {
    var loopData = loopSheet.getDataRange().getValues();
    for (var j = 1; j < loopData.length; j++) {
      var noteCycle = loopData[j][1];
      if (noteCycle >= cycle - 3 && loopData[j][6] === 'active') {
        result.recentNotes.push({
          cycle: noteCycle,
          type: loopData[j][2],
          description: loopData[j][3]
        });
      }
    }
  }
  
  return result;
}


function getEngineContinuity_(S, arcs) {
  var flags = [];
  
  for (var i = 0; i < arcs.length; i++) {
    var arc = arcs[i];
    if (arc && arc.age >= 5 && arc.phase !== 'resolved') {
      flags.push('Long-running ' + arc.type + ' in ' + arc.neighborhood + ' (age ' + arc.age + ')');
    }
  }
  
  if (S.patternFlag && S.patternFlag !== 'none') {
    flags.push('Pattern flag: ' + S.patternFlag);
  }
  
  if (S.migrationDrift && Math.abs(S.migrationDrift) > 30) {
    flags.push('Migration pressure: ' + S.migrationDrift);
  }
  
  return flags;
}


/**
 * v2.2: Calendar and civic-aware section assignments
 */
function generateSectionAssignments_(S, arcReport, seeds, promotions, cal, civic) {
  var assignments = {
    frontPage: 'Mags Corliss calls — see Front Page Recommendation',
    metro: 'Rotation based on arc activity',
    civic: 'Carmen Delaine — civic desk',
    business: 'Jordan Velez — ticker format unless major event',
    sports: 'Core three (Anthony/P Slayer/Hal) + support',
    chicago: 'Selena Grant (Bulls) + Talia Finch (ground)',
    culture: 'Kai Marston / Sharon Okafor rotation',
    opinion: 'Farrah Del Rio or P Slayer if sports-related',
    festival: null,
    election: null
  };
  
  // Metro assignment based on arcs
  var hasHealthCrisis = false;
  var hasCivicArc = false;
  var hasTransitArc = false;
  
  for (var i = 0; i < arcReport.active.length; i++) {
    var a = arcReport.active[i];
    if (a.type === 'health-crisis') hasHealthCrisis = true;
    if (a.domain === 'CIVIC') hasCivicArc = true;
    if (a.domain === 'TRANSIT' || a.domain === 'INFRASTRUCTURE') hasTransitArc = true;
  }
  
  if (hasHealthCrisis) {
    assignments.metro = 'Dr. Lila Mezran leads — health crisis active';
  } else if (hasCivicArc) {
    assignments.metro = 'Carmen Delaine leads — civic focus';
  } else if (hasTransitArc) {
    assignments.metro = 'Trevor Shimizu leads — infrastructure focus';
  }
  
  // Culture if new entities
  if (S.culturalEntityCreates && S.culturalEntityCreates.length > 0) {
    assignments.culture = 'Profile opportunity — Kai Marston on new Cultural Ledger entry';
  }
  
  // v2.2: Civic desk based on election/status
  if (civic.electionWindow) {
    assignments.civic = '🗳️ ELECTION: Carmen Delaine lead, Anthony policy, Trevor precincts';
    assignments.election = 'ACTIVATED: Full civic desk on election coverage';
  } else if (civic.notableStatuses && civic.notableStatuses.length > 0) {
    assignments.civic = 'Carmen Delaine — official status updates (' + civic.notableStatuses.length + ' alerts)';
  } else if (civic.cyclesUntilElection <= 10) {
    assignments.civic = 'Carmen Delaine — pre-election coverage, candidate profiles';
  }
  
  // Sports based on season
  if (cal.sportsSeason === 'championship') {
    assignments.sports = '🏆 CHAMPIONSHIP: Full desk — Anthony lead, P Slayer fan pulse, Hal history';
  } else if (cal.sportsSeason === 'playoffs') {
    assignments.sports = '⚾ PLAYOFFS: Elevated — Anthony + Hal Richmond lead';
  } else if (cal.sportsSeason === 'spring-training') {
    assignments.sports = '🌸 SPRING TRAINING: Anthony on roster, P Slayer on fan expectations';
  }
  
  // Festival section for Oakland holidays
  if (cal.holidayPriority === 'oakland') {
    assignments.festival = 'ACTIVATED: Kai Marston lead, Sharon Okafor support — ' + cal.holiday;
    assignments.culture = 'Merged with Festival coverage';
  }
  
  // First Friday culture boost
  if (cal.isFirstFriday) {
    assignments.culture = '🎨 FIRST FRIDAY: Kai Marston lead, Sharon Okafor on galleries';
  }
  
  // Creation Day civic angle
  if (cal.isCreationDay) {
    assignments.civic = '🌳 CREATION DAY: Carmen Delaine on civic pride, local business angle';
  }
  
  // Holiday shopping business angle
  if (cal.holiday === 'Thanksgiving' || cal.holiday === 'Holiday' || cal.holiday === 'BlackFriday') {
    assignments.business = '🛒 HOLIDAY SHOPPING: Jordan Velez on retail surge, local business';
  }
  
  return assignments;
}