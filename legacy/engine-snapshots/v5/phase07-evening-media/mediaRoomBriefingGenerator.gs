/**
 * ============================================================================
 * MEDIA ROOM BRIEFING v2.6 — CONSUMER WIRING INTEGRATION
 * ============================================================================
 *
 * v2.6 Enhancements:
 * - Section 13: openingStyle + themes detail lines on desk assignments
 * - Section 14: matchCitizenToJournalist_ integration for journalist recommendations
 * - Section 17: VOICE PROFILES for priority-assigned journalists
 * - New helpers: extractJournalistName_(), getAssignmentDetail_(), generateVoiceProfiles_()
 *
 * v2.5 Enhancements:
 * - Section 16: STORYLINE BRIEF for active storyline tracking
 * - Storyline Tracker integration: reads active/dormant storylines
 * - Follow-up reminders for storylines not covered recently
 * - Wrap-up alerts for storylines with resolved arcs
 * - Cross-reference with citizen spotlight for storyline-related interviews
 *
 * v2.4 Enhancements:
 * - Section 14: CITIZEN SPOTLIGHT for interview candidates
 * - TraitProfile consumption: archetypes inform interview suggestions
 * - Domain-to-archetype mapping for story-citizen matching
 * - Neighborhood-filtered candidate recommendations
 * - Tone-aware suggestions matching story mood
 *
 * v2.3 Enhancements:
 * - BayTribune Roster integration via rosterLookup.js
 * - getArcReporter_() now delegates to getArcReporterFromRoster_()
 * - Helper functions for formatted journalist lookups
 * - Signal-based reporter assignments from roster
 * - Maintains backwards compatibility with fallback values
 *
 * v2.2 Features (preserved):
 * - Section 12 — CIVIC STATUS (elections, officials, vacancies)
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
 * DEPENDENCIES:
 * - rosterLookup.js (for journalist roster functions)
 *
 * ============================================================================
 */


// ════════════════════════════════════════════════════════════════════════════
// ROSTER LOOKUP HELPERS (v2.3)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get formatted journalist name with role from roster.
 * Falls back to plain name if roster unavailable.
 * @param {string} name - Journalist name
 * @param {string} [suffix] - Optional suffix (e.g., "lead", "support")
 * @returns {string} Formatted string like "Carmen Delaine (Civic Ledger) lead"
 */
function getFormattedJournalist_(name, suffix) {
  if (typeof formatJournalist_ === 'function') {
    return formatJournalist_(name, suffix);
  }
  return suffix ? name + ' ' + suffix : name;
}

/**
 * Get journalist for a signal type from roster.
 * @param {string} signalType - Signal type (e.g., "civic", "health-crisis")
 * @returns {string} Journalist name
 */
function getReporterBySignal_(signalType) {
  if (typeof getJournalistBySignal_ === 'function') {
    return getJournalistBySignal_(signalType) || signalType;
  }
  // Fallback mapping
  var fallback = {
    'civic': 'Carmen Delaine',
    'health-crisis': 'Dr. Lila Mezran',
    'health_arc': 'Dr. Lila Mezran',
    'shock_event': 'Luis Navarro',
    'transit': 'Trevor Shimizu',
    'crime': 'Sgt. Rachel Torres',
    'arts': 'Kai Marston',
    'culture': 'Maria Keen',
    'sports': 'Anthony',
    'business': 'Jordan Velez',
    'opinion': 'Farrah Del Rio',
    'human_interest': 'Mags Corliss'
  };
  return fallback[signalType] || signalType;
}

/**
 * Main function — call from Phase 10
 */
function generateMediaBriefing_(ctx) {
  // DRY-RUN FIX: Skip direct sheet writes in dry-run mode
  var isDryRun = ctx.mode && ctx.mode.dryRun;
  if (isDryRun) {
    Logger.log('generateMediaBriefing_: Skipping (dry-run mode)');
    return;
  }

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
    briefing.push('   - Assign: ' + getReporterBySignal_('arts') + ' or ' + getReporterBySignal_('lifestyle'));
    briefing.push('');
  }

  if (cal.isCreationDay) {
    briefing.push('🌳 CREATION DAY GUIDANCE:');
    briefing.push('   - Oakland civic pride stories');
    briefing.push('   - Historical Oakland features');
    briefing.push('   - Local business spotlights');
    briefing.push('   - Assign: ' + getReporterBySignal_('civic') + ' (civic) or feature rotation');
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
    briefing.push('   - Assign: ' + getReporterBySignal_('civic') + ' (Civic Desk) lead');
    briefing.push('   - ' + getReporterBySignal_('sports') + ' (Metro) on policy angles');
    briefing.push('   - ' + getReporterBySignal_('sports_opinion') + ' (Opinion) on endorsements, voter mood');
    briefing.push('   - ' + getReporterBySignal_('transit') + ' on precinct coverage');
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
        briefing.push('     → Investigation angle: ' + getReporterBySignal_('civic') + ' or ' + getReporterBySignal_('shock_event'));
      } else if (official.status === 'serious-condition' || official.status === 'injured') {
        briefing.push('     → Health update: respectful coverage, succession questions');
      } else if (official.status === 'resigned' || official.status === 'retired') {
        briefing.push('     → Legacy piece: ' + getReporterBySignal_('history') + ' angle, successor speculation');
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
      briefing.push('  → Assign: ' + getReporterBySignal_('human_interest') + ' or ' + getReporterBySignal_('neighborhood_culture'));
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
  // SECTION 9B: PREVIOUS COVERAGE (from Press_Drafts)
  // ═══════════════════════════════════════════════════════════════════════════

  var prevCoverage = getPreviousCoverage_(ss, cycle);
  if (prevCoverage.length > 0) {
    briefing.push('## 9B. PREVIOUS COVERAGE (Cycle ' + (cycle - 1) + ')');
    briefing.push('');
    for (var pc = 0; pc < prevCoverage.length; pc++) {
      var cov = prevCoverage[pc];
      briefing.push('- [' + cov.storyType + '] ' + cov.headline + ' — ' + cov.reporter);
    }
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
      briefing.push('  → Assign: ' + getReporterBySignal_('arts') + ' or ' + getReporterBySignal_('lifestyle'));
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
    briefing.push('   - ' + getReporterBySignal_('sports') + ' (stats/data), ' + getReporterBySignal_('sports_opinion') + ' (fan pulse), ' + getReporterBySignal_('history') + ' (history)');
    briefing.push('   - Economic angle: Jack London businesses, merchandise sales');
    briefing.push('   - Consider: Victory parade prep, civic pride angle');
    briefing.push('');
  } else if (cal.sportsSeason === 'playoffs') {
    briefing.push('⚾ PLAYOFF MODE:');
    briefing.push('   - Elevated coverage, Front Page consideration');
    briefing.push('   - ' + getReporterBySignal_('sports') + ' (Lead) + ' + getReporterBySignal_('history') + ' (History)');
    briefing.push('   - ' + getReporterBySignal_('sports_opinion') + ' on fan community');
    briefing.push('   - Economic angle: playoff spending in Jack London');
    briefing.push('');
  } else if (cal.sportsSeason === 'late-season') {
    briefing.push('📊 LATE SEASON:');
    briefing.push('   - Playoff race coverage if contending');
    briefing.push('   - ' + getReporterBySignal_('sports') + ' on standings/scenarios');
    briefing.push('');
  } else if (cal.sportsSeason === 'spring-training') {
    briefing.push('🌸 SPRING TRAINING:');
    briefing.push('   - A\'s spring training active — ' + getReporterBySignal_('sports') + ' on roster coverage');
    briefing.push('   - ' + getReporterBySignal_('history') + ' on prospects, ' + getReporterBySignal_('sports_opinion') + ' on fan expectations');
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

  briefing.push('Chicago: Bulls coverage via ' + getReporterBySignal_('athletics_basketball_bulls'));
  briefing.push('');

  // v2.6: Active sports triggers from Sports_Feed
  var sportsTriggers = S.sportsEventTriggers || [];
  if (sportsTriggers.length > 0) {
    briefing.push('ACTIVE TRIGGERS:');
    for (var sti = 0; sti < sportsTriggers.length; sti++) {
      var trig = sportsTriggers[sti];
      var sentStr = trig.sentiment >= 0 ? '+' + trig.sentiment.toFixed(2) : trig.sentiment.toFixed(2);
      briefing.push('  ' + trig.team + ': ' + trig.trigger + (trig.streak ? ' (' + trig.streak + ')' : '') + ' — sentiment ' + sentStr);
    }
    briefing.push('');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 13: SECTION ASSIGNMENTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  briefing.push('## 13. SECTION ASSIGNMENTS');
  briefing.push('');
  
  var assignments = generateSectionAssignments_(S, arcReport, seeds, promotions, cal, civic);
  
  // v2.6: Desk assignments with openingStyle + themes detail lines
  var deskKeys = ['frontPage', 'metro', 'civic', 'business', 'sports', 'chicago', 'culture', 'opinion'];
  var deskLabels = ['FRONT PAGE', 'METRO', 'CIVIC', 'BUSINESS', 'SPORTS', 'CHICAGO', 'CULTURE', 'OPINION'];

  for (var di = 0; di < deskKeys.length; di++) {
    briefing.push(deskLabels[di] + ': ' + assignments[deskKeys[di]]);
    var detail = getAssignmentDetail_(assignments[deskKeys[di]]);
    for (var dj = 0; dj < detail.length; dj++) {
      briefing.push(detail[dj]);
    }
  }
  if (assignments.festival) {
    briefing.push('FESTIVAL: ' + assignments.festival);
    var festDetail = getAssignmentDetail_(assignments.festival);
    for (var fdi = 0; fdi < festDetail.length; fdi++) {
      briefing.push(festDetail[fdi]);
    }
  }
  if (assignments.election) {
    briefing.push('ELECTION: ' + assignments.election);
  }
  briefing.push('');
  
  // ═══════════════════════════════════════════════════════════════════════════
  // v2.4: SECTION 14: CITIZEN SPOTLIGHT
  // ═══════════════════════════════════════════════════════════════════════════

  briefing.push('## 14. CITIZEN SPOTLIGHT');
  briefing.push('');
  briefing.push('Interview candidates matching current story angles:');
  briefing.push('');

  var citizenSpotlight = generateCitizenSpotlight_(ctx, S, cal);
  for (var csi = 0; csi < citizenSpotlight.length; csi++) {
    briefing.push(citizenSpotlight[csi]);
  }
  briefing.push('');

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 15: CULTURAL INDEX TEMPLATE
  // ═══════════════════════════════════════════════════════════════════════════

  briefing.push('## 15. CULTURAL INDEX TEMPLATE');
  briefing.push('');
  briefing.push('When filing articles, include Cultural Index in this format:');
  briefing.push('');
  briefing.push('15. CULTURAL INDEX');
  briefing.push('- Name (role) @ Neighborhood');
  briefing.push('- Name (role) @ Neighborhood');
  briefing.push('');
  briefing.push('Example:');
  briefing.push('- Marcus Webb (community organizer) @ West Oakland');
  briefing.push('- Janae Rivers (council member) @ Temescal');
  briefing.push('');

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.5: SECTION 16: STORYLINE BRIEF
  // ═══════════════════════════════════════════════════════════════════════════

  briefing.push('## 16. STORYLINE BRIEF');
  briefing.push('');
  briefing.push('Active narrative threads requiring coverage attention:');
  briefing.push('');

  var storylineBrief = generateStorylineBrief_(ctx, S, cycle);
  for (var sbi = 0; sbi < storylineBrief.length; sbi++) {
    briefing.push(storylineBrief[sbi]);
  }
  briefing.push('');

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.6: SECTION 17: VOICE PROFILES
  // ═══════════════════════════════════════════════════════════════════════════

  briefing.push('## 17. VOICE PROFILES');
  briefing.push('');
  briefing.push('Voice guidance for journalists assigned to priority stories this cycle:');
  briefing.push('');

  var voiceProfileLines = generateVoiceProfiles_(frontPageCall, assignments, arcReport);
  for (var vpi = 0; vpi < voiceProfileLines.length; vpi++) {
    briefing.push(voiceProfileLines[vpi]);
  }
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
  briefing.push('4. Continuity Notes (audit-only in edition; direct quotes → LifeHistory_Log)');
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
    Logger.log('generateMediaBriefing_ v2.5: Briefing generated for Cycle ' + cycle + ' | Holiday: ' + cal.holiday + ' | Election: ' + civic.electionWindow);
    
  } catch (e) {
    Logger.log('generateMediaBriefing_ error: ' + e.message);
  }
  
  ctx.summary.mediaBriefing = output;
  return output;
}


// ════════════════════════════════════════════════════════════════════════════
// v2.4: CITIZEN SPOTLIGHT HELPER
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generates citizen interview suggestions organized by neighborhood and archetype
 */
function generateCitizenSpotlight_(ctx, S, cal) {
  var lines = [];
  var citizenLookup = ctx.citizenLookup || {};
  var popIds = Object.keys(citizenLookup);

  // v2.6: Collect active story domains for journalist matching
  var activeArcs = (S && S.eventArcs) || [];
  var firstActiveDomain = null;
  for (var adi = 0; adi < activeArcs.length; adi++) {
    var arc = activeArcs[adi];
    if (arc && arc.phase !== 'resolved') {
      firstActiveDomain = arc.domainTag || arc.domain || null;
      if (firstActiveDomain) break;
    }
  }

  if (popIds.length === 0) {
    lines.push('(No citizen data available for spotlight)');
    return lines;
  }

  // Archetype-to-story type mapping
  var ARCHETYPE_ANGLES = {
    'Connector': 'community voice, network insights',
    'Watcher': 'observational perspective, thoughtful analysis',
    'Striver': 'career/business angle, ambition profile',
    'Anchor': 'stability perspective, neighborhood history',
    'Catalyst': 'change agent, disruptor profile',
    'Caretaker': 'service angle, community support',
    'Drifter': 'outsider perspective'
  };

  // Group citizens by neighborhood
  var byNeighborhood = {};

  for (var i = 0; i < popIds.length; i++) {
    var popId = popIds[i];
    var citizen = citizenLookup[popId];
    if (!citizen) continue;

    // Only include Tier 3-4 citizens with TraitProfiles
    if (citizen.Tier < 3 || !citizen.TraitProfile) continue;

    var nh = citizen.Neighborhood || 'Unknown';
    if (!byNeighborhood[nh]) byNeighborhood[nh] = [];

    // Parse archetype from TraitProfile
    var archetype = 'Drifter';
    var tone = 'plain';
    var parts = String(citizen.TraitProfile).split('|');
    for (var pi = 0; pi < parts.length; pi++) {
      var part = parts[pi];
      if (part.indexOf('Archetype:') === 0) archetype = part.substring(10);
      if (part.indexOf('reflective:') === 0 && parseFloat(part.substring(11)) >= 0.6) tone = 'noir';
      if (part.indexOf('social:') === 0 && parseFloat(part.substring(7)) >= 0.6) tone = 'bright';
      if (part.indexOf('volatile:') === 0 && parseFloat(part.substring(9)) >= 0.6) tone = 'tense';
    }

    var name = ((citizen.First || '') + ' ' + (citizen.Last || '')).trim() || popId;

    byNeighborhood[nh].push({
      name: name,
      archetype: archetype,
      tone: tone,
      occupation: citizen.Occupation || '',
      angle: ARCHETYPE_ANGLES[archetype] || 'general'
    });
  }

  // Generate spotlight lines per neighborhood (top 3 neighborhoods)
  var neighborhoods = Object.keys(byNeighborhood).sort(function(a, b) {
    return byNeighborhood[b].length - byNeighborhood[a].length;
  });

  for (var ni = 0; ni < Math.min(neighborhoods.length, 4); ni++) {
    var nhName = neighborhoods[ni];
    var citizens = byNeighborhood[nhName];

    lines.push(nhName.toUpperCase() + ':');

    // Sort by archetype diversity (prefer non-Drifter)
    citizens.sort(function(a, b) {
      if (a.archetype === 'Drifter' && b.archetype !== 'Drifter') return 1;
      if (b.archetype === 'Drifter' && a.archetype !== 'Drifter') return -1;
      return 0;
    });

    for (var ci = 0; ci < Math.min(citizens.length, 2); ci++) {
      var c = citizens[ci];
      var occStr = c.occupation ? ' (' + c.occupation + ')' : '';
      lines.push('  - ' + c.name + occStr + ' [' + c.archetype + '] — ' + c.angle);
      if (c.tone !== 'plain') {
        lines.push('    Tone: ' + c.tone + ' — matches ' + (c.tone === 'noir' ? 'investigative' : c.tone === 'bright' ? 'uplifting' : 'conflict') + ' angles');
      }

      // v2.6: Journalist match via matchCitizenToJournalist_
      if (typeof matchCitizenToJournalist_ === 'function') {
        var match = matchCitizenToJournalist_(c.archetype, nhName, firstActiveDomain);
        if (match.journalist) {
          lines.push('    → Best-fit journalist: ' + match.journalist + ' | Angle: ' + match.interviewAngle + ' [' + match.confidence + ']');
        }
      }
    }
  }

  // Holiday-specific suggestions
  if (cal.holiday !== 'none') {
    lines.push('');
    lines.push('HOLIDAY ANGLE (' + cal.holiday + '):');
    lines.push('  Prioritize Connector and Caretaker archetypes for community celebration coverage');
  }

  // If rivalries/alliances active, suggest related citizens
  var bondSummary = S.bondSummary || {};
  if (bondSummary.rivalries > 0 || bondSummary.alliances > 0) {
    lines.push('');
    lines.push('RELATIONSHIP ANGLES:');
    if (bondSummary.rivalries > 0) {
      lines.push('  Active rivalries: ' + bondSummary.rivalries + ' — seek Catalyst/Striver perspectives');
    }
    if (bondSummary.alliances > 0) {
      lines.push('  Active alliances: ' + bondSummary.alliances + ' — seek Connector/Anchor perspectives');
    }
  }

  return lines;
}


// ════════════════════════════════════════════════════════════════════════════
// v2.5: STORYLINE BRIEF HELPER
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generates storyline tracking brief from Storyline_Tracker
 */
function generateStorylineBrief_(ctx, S, cycle) {
  var lines = [];
  var ss = ctx.ss;

  if (!ss) {
    lines.push('(No spreadsheet access for storyline data)');
    return lines;
  }

  var sheet = ss.getSheetByName('Storyline_Tracker');
  if (!sheet) {
    lines.push('(Storyline_Tracker sheet not found)');
    return lines;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    lines.push('(No storylines tracked)');
    return lines;
  }

  var headers = data[0];
  var col = function(name) { return headers.indexOf(name); };

  var cycleAddedIdx = col('CycleAdded');
  var typeIdx = col('StorylineType');
  var descIdx = col('Description');
  var nhIdx = col('Neighborhood');
  var citizensIdx = col('RelatedCitizens');
  var priorityIdx = col('Priority');
  var statusIdx = col('Status');

  var activeStorylines = [];
  var dormantStorylines = [];
  var urgentStorylines = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var status = statusIdx >= 0 ? row[statusIdx] : '';

    var storyline = {
      rowNumber: i + 1,
      cycleAdded: cycleAddedIdx >= 0 ? row[cycleAddedIdx] : 0,
      type: typeIdx >= 0 ? row[typeIdx] : '',
      description: descIdx >= 0 ? String(row[descIdx] || '').substring(0, 100) : '',
      neighborhood: nhIdx >= 0 ? row[nhIdx] : '',
      relatedCitizens: citizensIdx >= 0 ? row[citizensIdx] : '',
      priority: priorityIdx >= 0 ? row[priorityIdx] : 'normal',
      status: status,
      cyclesSinceAdded: cycle - (cycleAddedIdx >= 0 ? (row[cycleAddedIdx] || 0) : 0)
    };

    if (status === 'active') {
      activeStorylines.push(storyline);
      if (storyline.priority === 'urgent' || storyline.priority === 'high') {
        urgentStorylines.push(storyline);
      }
    } else if (status === 'dormant') {
      dormantStorylines.push(storyline);
    }
  }

  // Summary counts
  lines.push('STORYLINE STATUS:');
  lines.push('  Active: ' + activeStorylines.length + ' | Dormant: ' + dormantStorylines.length);
  lines.push('');

  // Urgent/high priority storylines (need immediate attention)
  if (urgentStorylines.length > 0) {
    lines.push('PRIORITY STORYLINES (require coverage):');
    for (var ui = 0; ui < Math.min(urgentStorylines.length, 3); ui++) {
      var urg = urgentStorylines[ui];
      var urgPrefix = urg.priority === 'urgent' ? '🔴 URGENT: ' : '🟡 HIGH: ';
      lines.push('  ' + urgPrefix + urg.description);
      if (urg.neighborhood) lines.push('    Location: ' + urg.neighborhood);
      if (urg.relatedCitizens) lines.push('    Citizens: ' + urg.relatedCitizens);
    }
    lines.push('');
  }

  // Dormant storylines needing revival (5+ cycles)
  var needsRevival = [];
  for (var di = 0; di < dormantStorylines.length; di++) {
    if (dormantStorylines[di].cyclesSinceAdded >= 5) {
      needsRevival.push(dormantStorylines[di]);
    }
  }

  if (needsRevival.length > 0) {
    // Sort by oldest first
    needsRevival.sort(function(a, b) { return b.cyclesSinceAdded - a.cyclesSinceAdded; });

    lines.push('DORMANT (consider revival):');
    for (var ri = 0; ri < Math.min(needsRevival.length, 3); ri++) {
      var rev = needsRevival[ri];
      lines.push('  ⏸️ ' + rev.description + ' — ' + rev.cyclesSinceAdded + ' cycles dormant');
      if (rev.neighborhood) lines.push('    Location: ' + rev.neighborhood);
    }
    lines.push('');
  }

  // Mystery/question storylines
  var mysteries = [];
  for (var mi = 0; mi < activeStorylines.length; mi++) {
    var myst = activeStorylines[mi];
    if (myst.type === 'mystery' || myst.type === 'question') {
      mysteries.push(myst);
    }
  }

  if (mysteries.length > 0) {
    lines.push('OPEN QUESTIONS (unresolved):');
    for (var qi = 0; qi < Math.min(mysteries.length, 3); qi++) {
      var q = mysteries[qi];
      lines.push('  ❓ ' + q.description);
    }
    lines.push('');
  }

  // Recent active storylines (for continuity reference)
  var recent = activeStorylines.filter(function(s) { return s.cyclesSinceAdded <= 3; });
  if (recent.length > 0) {
    lines.push('RECENTLY ACTIVE (last 3 cycles):');
    for (var rci = 0; rci < Math.min(recent.length, 5); rci++) {
      var rec = recent[rci];
      var typeTag = rec.type ? '[' + rec.type + ']' : '';
      lines.push('  • ' + rec.description + ' ' + typeTag);
    }
    lines.push('');
  }

  // If no storylines, indicate that
  if (activeStorylines.length === 0 && dormantStorylines.length === 0) {
    lines.push('No tracked storylines. Consider establishing narrative threads.');
  }

  return lines;
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
        ideas.push('- [INVESTIGATION] ' + off.title + ' scandal update — ' + getReporterBySignal_('shock_event'));
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
 * v2.3: Calendar and civic-aware front page determination with roster lookup
 */
function determineFrontPage_(S, ctx, cal, civic) {

  // Priority: Shock > Election Results > Health Crisis > Championship > Oakland Festival > New Arc > Election Window > Promotion > Sports Playoff > Weather Event

  if (S.shockFlag && S.shockFlag !== 'none') {
    return {
      lead: 'SHOCK EVENT — ' + (S.cycleWeightReason || 'Disruption detected'),
      reporter: getFormattedJournalist_(getReporterBySignal_('shock_event'), 'Investigations') + ' or ' + getFormattedJournalist_(getReporterBySignal_('civic'), 'Civic'),
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
        reporter: getFormattedJournalist_(getReporterBySignal_('civic'), 'lead') + ', full civic desk',
        signal: 'election-mayor',
        notes: 'Margin: ' + mayorResult.margin + ' (' + mayorResult.marginType + ')'
      };
    }

    return {
      lead: '🗳️ ELECTION RESULTS — ' + civic.recentResults.length + ' races decided' + (hasUpset ? ' (UPSETS)' : ''),
      reporter: getFormattedJournalist_(getReporterBySignal_('civic'), 'lead'),
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
      reporter: getFormattedJournalist_(getReporterBySignal_('health-crisis')),
      signal: 'health-crisis',
      notes: 'Tension: ' + healthCrisis.tension
    };
  }

  // Championship takes front page
  if (cal.sportsSeason === 'championship') {
    return {
      lead: '🏆 CHAMPIONSHIP — Oakland sports moment',
      reporter: getFormattedJournalist_(getReporterBySignal_('sports'), 'Lead') + ' + Full Sports Desk',
      signal: 'sports-championship',
      notes: 'Historic coverage moment — all hands'
    };
  }

  // Oakland-priority holidays can lead
  if (cal.holidayPriority === 'oakland') {
    return {
      lead: '🎉 ' + cal.holiday.toUpperCase() + ' — Oakland celebrates',
      reporter: getFormattedJournalist_(getReporterBySignal_('arts'), 'Culture') + ' + rotation',
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
      reporter: getFormattedJournalist_(getReporterBySignal_('civic'), 'lead'),
      signal: 'election-day',
      notes: 'Group ' + civic.electionGroup + ' elections'
    };
  }

  // Playoffs elevated
  if (cal.sportsSeason === 'playoffs') {
    return {
      lead: '⚾ PLAYOFFS — A\'s postseason coverage',
      reporter: getFormattedJournalist_(getReporterBySignal_('sports'), 'Lead') + ' + ' + getFormattedJournalist_(getReporterBySignal_('history'), 'History'),
      signal: 'sports-playoffs',
      notes: 'Sports elevated to Front Page'
    };
  }

  // First Friday can lead on slow days
  if (cal.isFirstFriday) {
    return {
      lead: '🎨 FIRST FRIDAY — Oakland arts night',
      reporter: getReporterBySignal_('arts') + ' or ' + getReporterBySignal_('lifestyle'),
      signal: 'first-friday',
      notes: 'Arts district focus — Temescal, Jack London, KONO'
    };
  }
  
  // Creation Day can lead
  if (cal.isCreationDay) {
    return {
      lead: '🌳 CREATION DAY — Oakland civic pride',
      reporter: getFormattedJournalist_(getReporterBySignal_('civic'), 'Civic') + ' or ' + getReporterBySignal_('human_interest'),
      signal: 'creation-day',
      notes: 'Local business, community features'
    };
  }

  return {
    lead: 'EDITOR\'S CHOICE — Feature or follow-up',
    reporter: getReporterBySignal_('human_interest') + ' calls the lead',
    signal: 'editorial',
    notes: 'Quiet cycle — depth over urgency'
  };
}


/**
 * Get arc reporter assignment using roster lookup.
 * Delegates to getArcReporterFromRoster_() from rosterLookup.js
 * @param {string} arcType - Arc type (e.g., "health-crisis", "crisis")
 * @param {string} domain - Domain (e.g., "CIVIC", "TRANSIT", "SAFETY")
 * @returns {string} Reporter name
 */
function getArcReporter_(arcType, domain) {
  // Use roster lookup if available
  if (typeof getArcReporterFromRoster_ === 'function') {
    return getArcReporterFromRoster_(arcType, domain);
  }
  // Fallback to hardcoded values if roster not loaded
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
  
  // Continuity_Loop removed — no recent notes to pull.
  // Direct quotes route to LifeHistory_Log; continuity is audit-only in edition text.
  
  return result;
}


/**
 * Read Press_Drafts for previous cycle's coverage.
 * Returns array of {reporter, storyType, headline}.
 */
function getPreviousCoverage_(ss, cycle) {
  var result = [];
  var prevCycle = cycle - 1;
  if (prevCycle < 1) return result;

  var sheet = ss.getSheetByName('Press_Drafts');
  if (!sheet) return result;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return result;

  var headers = data[0];
  var cycleCol = headers.indexOf('Cycle');
  var reporterCol = headers.indexOf('Reporter');
  var typeCol = headers.indexOf('StoryType');
  var headlineCol = headers.indexOf('SummaryPrompt');
  if (headlineCol < 0) headlineCol = headers.indexOf('Headline');

  if (cycleCol < 0 || reporterCol < 0) return result;

  for (var i = 1; i < data.length; i++) {
    if (Number(data[i][cycleCol]) === prevCycle) {
      result.push({
        reporter: data[i][reporterCol] || '',
        storyType: typeCol >= 0 ? (data[i][typeCol] || '') : '',
        headline: headlineCol >= 0 ? (data[i][headlineCol] || '') : ''
      });
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
 * v2.6: Generate voice profile blocks for journalists in priority assignments.
 * Collects unique journalist names from front page, desk leads, and new arcs.
 * Caps output at 5 profiles to keep briefing manageable.
 *
 * @param {Object} frontPageCall - Front page assignment { reporter, lead, signal }
 * @param {Object} assignments - Section assignments { frontPage, metro, civic, ... }
 * @param {Object} arcReport - Categorized arcs { new, active, phaseChange, resolved }
 * @returns {Array<string>} Lines for the voice profiles section
 */
function generateVoiceProfiles_(frontPageCall, assignments, arcReport) {
  var lines = [];

  if (typeof getFullVoiceProfile_ !== 'function') {
    lines.push('(Voice profiles unavailable — roster not loaded)');
    return lines;
  }

  // Collect priority journalist names
  var priorityNames = [];

  // 1. Front page reporter
  if (frontPageCall && frontPageCall.reporter) {
    var fpName = extractJournalistName_(frontPageCall.reporter);
    if (fpName) priorityNames.push(fpName);
  }

  // 2. Desk leads (all key desks including multi-journalist)
  var deskKeys = ['metro', 'civic', 'culture', 'sports', 'chicago'];
  for (var di = 0; di < deskKeys.length; di++) {
    if (assignments && assignments[deskKeys[di]]) {
      var names = extractAllJournalistNames_(assignments[deskKeys[di]]);
      for (var dni = 0; dni < names.length; dni++) {
        priorityNames.push(names[dni]);
      }
    }
  }

  // 3. New arc reporters
  if (arcReport && arcReport.new) {
    for (var ni = 0; ni < arcReport.new.length; ni++) {
      var arc = arcReport.new[ni];
      if (typeof getArcReporter_ === 'function') {
        var arcReporter = extractJournalistName_(getArcReporter_(arc.type, arc.domain));
        if (arcReporter) priorityNames.push(arcReporter);
      }
    }
  }

  // Output profiles for unique journalists (max 8)
  var seen = {};
  var count = 0;
  for (var pi = 0; pi < priorityNames.length && count < 8; pi++) {
    var name = priorityNames[pi];
    if (seen[name]) continue;
    seen[name] = true;

    var profile = getFullVoiceProfile_(name);
    if (profile && profile.indexOf('Unknown journalist') < 0) {
      lines.push(profile);
      lines.push('');
      count++;
    }
  }

  if (count === 0) {
    lines.push('(No voice profiles available for this cycle\'s assignments)');
  }

  return lines;
}

/**
 * v2.3: Calendar and civic-aware section assignments with roster lookup
 */
function generateSectionAssignments_(S, arcReport, seeds, promotions, cal, civic) {
  var assignments = {
    frontPage: getReporterBySignal_('human_interest') + ' calls — see Front Page Recommendation',
    metro: 'Rotation based on arc activity',
    civic: getReporterBySignal_('civic') + ' — civic desk',
    business: getReporterBySignal_('business') + ' — ticker format unless major event',
    sports: 'Core three (' + getReporterBySignal_('sports') + '/' + getReporterBySignal_('sports_opinion') + '/' + getReporterBySignal_('history') + ') + support',
    chicago: getReporterBySignal_('athletics_basketball_bulls') + ' (Bulls) + ' + getReporterBySignal_('chicago_street') + ' (ground)',
    culture: getReporterBySignal_('arts') + ' / ' + getReporterBySignal_('lifestyle') + ' rotation',
    opinion: getReporterBySignal_('opinion') + ' or ' + getReporterBySignal_('sports_opinion') + ' if sports-related',
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
    assignments.metro = getReporterBySignal_('health-crisis') + ' leads — health crisis active';
  } else if (hasCivicArc) {
    assignments.metro = getReporterBySignal_('civic') + ' leads — civic focus';
  } else if (hasTransitArc) {
    assignments.metro = getReporterBySignal_('transit') + ' leads — infrastructure focus';
  }

  // Culture if new entities
  if (S.culturalEntityCreates && S.culturalEntityCreates.length > 0) {
    assignments.culture = 'Profile opportunity — ' + getReporterBySignal_('arts') + ' on new Cultural Ledger entry';
  }

  // v2.2: Civic desk based on election/status
  if (civic.electionWindow) {
    assignments.civic = '🗳️ ELECTION: ' + getReporterBySignal_('civic') + ' lead, ' + getReporterBySignal_('sports') + ' policy, ' + getReporterBySignal_('transit') + ' precincts';
    assignments.election = 'ACTIVATED: Full civic desk on election coverage';
  } else if (civic.notableStatuses && civic.notableStatuses.length > 0) {
    assignments.civic = getReporterBySignal_('civic') + ' — official status updates (' + civic.notableStatuses.length + ' alerts)';
  } else if (civic.cyclesUntilElection <= 10) {
    assignments.civic = getReporterBySignal_('civic') + ' — pre-election coverage, candidate profiles';
  }

  // Sports based on season
  if (cal.sportsSeason === 'championship') {
    assignments.sports = '🏆 CHAMPIONSHIP: Full desk — ' + getReporterBySignal_('sports') + ' lead, ' + getReporterBySignal_('sports_opinion') + ' fan pulse, ' + getReporterBySignal_('history') + ' history';
  } else if (cal.sportsSeason === 'playoffs') {
    assignments.sports = '⚾ PLAYOFFS: Elevated — ' + getReporterBySignal_('sports') + ' + ' + getReporterBySignal_('history') + ' lead';
  } else if (cal.sportsSeason === 'spring-training') {
    assignments.sports = '🌸 SPRING TRAINING: ' + getReporterBySignal_('sports') + ' on roster, ' + getReporterBySignal_('sports_opinion') + ' on fan expectations';
  }

  // Festival section for Oakland holidays
  if (cal.holidayPriority === 'oakland') {
    assignments.festival = 'ACTIVATED: ' + getReporterBySignal_('arts') + ' lead, ' + getReporterBySignal_('lifestyle') + ' support — ' + cal.holiday;
    assignments.culture = 'Merged with Festival coverage';
  }

  // First Friday culture boost
  if (cal.isFirstFriday) {
    assignments.culture = '🎨 FIRST FRIDAY: ' + getReporterBySignal_('arts') + ' lead, ' + getReporterBySignal_('lifestyle') + ' on galleries';
  }

  // Creation Day civic angle
  if (cal.isCreationDay) {
    assignments.civic = '🌳 CREATION DAY: ' + getReporterBySignal_('civic') + ' on civic pride, local business angle';
  }

  // Holiday shopping business angle
  if (cal.holiday === 'Thanksgiving' || cal.holiday === 'Holiday' || cal.holiday === 'BlackFriday') {
    assignments.business = '🛒 HOLIDAY SHOPPING: ' + getReporterBySignal_('business') + ' on retail surge, local business';
  }

  return assignments;
}

// ════════════════════════════════════════════════════════════════════════════
// v2.6: SHARED HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * v2.6: Extract a journalist name from an assignment string.
 * Handles formats like "Carmen Delaine — civic desk", "Dr. Lila Mezran leads",
 * "🗳️ ELECTION: Carmen Delaine lead", "Mags Corliss calls — see Front Page".
 *
 * @param {string} str - Assignment or reporter string
 * @returns {string|null} Extracted journalist name, or null
 */
function extractJournalistName_(str) {
  if (!str) return null;
  str = String(str);

  // Remove leading emojis and section labels like "🗳️ ELECTION: "
  str = str.replace(/^[^A-Za-z]*(?:[A-Z]+:\s*)?/, '').trim();

  // Match name patterns: "Dr. Lila Mezran", "Sgt. Rachel Torres", "Carmen Delaine"
  var match = str.match(/^((?:Dr\.|Sgt\.|Prof\.)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  if (!match) return null;

  var candidate = match[1].trim();

  // Remove trailing action words
  candidate = candidate.replace(/\s+(calls|leads|lead|on|or|and)$/i, '').trim();

  if (!candidate) return null;

  // Validate against roster if possible
  if (typeof isValidJournalist_ === 'function') {
    return isValidJournalist_(candidate) ? candidate : null;
  }

  return candidate;
}

/**
 * v2.6: Extract ALL journalist names from an assignment string.
 * Handles multi-journalist formats like "Core three (Anthony/P Slayer/Hal Richmond) + support"
 * by splitting on /, +, and parentheses, then validating each candidate.
 *
 * @param {string} str - Assignment string
 * @returns {Array<string>} Array of valid journalist names (may be empty)
 */
function extractAllJournalistNames_(str) {
  if (!str) return [];

  // Split on separators: / + , and parentheses content
  var parts = String(str).replace(/[()]/g, '/').split(/[\/+,]/);
  var names = [];

  for (var i = 0; i < parts.length; i++) {
    var name = extractJournalistName_(parts[i].trim());
    if (name) names.push(name);
  }

  return names;
}

/**
 * v2.6: Get detail lines (openingStyle + themes) for a section assignment.
 *
 * @param {string} assignmentStr - The assignment string (e.g., "Carmen Delaine — civic desk")
 * @returns {Array<string>} Indented detail lines (may be empty)
 */
function getAssignmentDetail_(assignmentStr) {
  if (!assignmentStr || typeof getJournalistOpeningStyle_ !== 'function') return [];

  var name = extractJournalistName_(assignmentStr);
  if (!name) return [];

  var details = [];
  var openingStyle = getJournalistOpeningStyle_(name);
  var themes = (typeof getJournalistThemes_ === 'function') ? getJournalistThemes_(name) : null;

  if (openingStyle) {
    details.push('  Opening: ' + openingStyle);
  }
  if (themes && themes.length > 0) {
    details.push('  Themes: ' + themes.slice(0, 3).join(', '));
  }

  return details;
}