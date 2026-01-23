/**
 * ============================================================================
 * buildCyclePacket_ v3.7 — RAW SNAPSHOT OUTPUT
 * ============================================================================
 *
 * Complete cycle snapshot for narrative review.
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
  var S = ctx.summary || {};

  var weather = S.weather || {};
  var dyn = S.cityDynamics || {};
  var pop = S.worldPopulation || {};
  var arcs = S.eventArcs || [];
  var events = S.worldEvents || [];
  var textures = S.textureTriggers || [];
  var domains = S.domainPresence || {};
  var chicago = S.chicagoFeed || [];

  var round2 = function(n) { return Math.round(n * 100) / 100; };

  // Calendar context
  var cal = {
    season: S.season || 'unknown',
    holiday: S.holiday || 'none',
    holidayPriority: S.holidayPriority || 'none',
    isFirstFriday: S.isFirstFriday || false,
    isCreationDay: S.isCreationDay || false,
    month: S.month || S.simMonth || 0,
    cycleOfYear: S.cycleOfYear || 1,
    godWorldYear: S.godWorldYear || 1
  };

  // Get civic context
  var civic = getCivicContextForPacket_(ctx.ss, S.absoluteCycle || S.cycleId || 0, cal);

  var lines = [];

  // ═══════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════
  lines.push('=== CYCLE PACKET ===');
  lines.push('Cycle: ' + (S.absoluteCycle || S.cycleId || ''));
  lines.push('CycleRef: ' + (S.cycleRef || 'Y' + cal.godWorldYear + 'C' + cal.cycleOfYear));
  lines.push('Timestamp: ' + (ctx.now || new Date()).toISOString());
  
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
  lines.push('Month: ' + cal.month + ' (' + getMonthName_Packet_(cal.month) + ')');
  lines.push('CycleInMonth: ' + (S.cycleInMonth || 1));
  lines.push('Season: ' + cal.season);
  
  if (cal.holiday !== 'none') {
    var nh = S.holidayNeighborhood ? ' @ ' + S.holidayNeighborhood : '';
    lines.push('Holiday: ' + cal.holiday + ' [' + cal.holidayPriority + ']' + nh);
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
  lines.push('IllnessRate: ' + round2(pop.illnessRate || 0));
  lines.push('EmploymentRate: ' + round2(pop.employmentRate || 0));
  lines.push('Economy: ' + (pop.economy || 'stable'));
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
  // CHICAGO SATELLITE (v3.7: moved to end of packet)
  // ═══════════════════════════════════════════════════════════
  if (chicago.length > 0) {
    var C = chicago[0];
    lines.push('--- CHICAGO SATELLITE ---');
    lines.push('CycleRef: Y' + (C.godWorldYear || cal.godWorldYear) + 'C' + (C.cycleOfYear || cal.cycleOfYear));
    lines.push('Season: ' + (C.season || cal.season));
    lines.push('Month: ' + (C.month || C.simMonth || cal.month));

    if (C.holiday && C.holiday !== 'none') {
      lines.push('Holiday: ' + C.holiday + ' [' + (C.holidayPriority || 'unknown') + ']');
    } else if (cal.holiday !== 'none') {
      lines.push('Holiday: ' + cal.holiday + ' (national)');
    }

    lines.push('Weather: ' + (C.weatherType || 'clear') + ' (impact=' + (C.weatherImpact || 1) + ', temp=' + (C.temp || 'n/a') + '°F)');
    lines.push('Sentiment: ' + round2(C.sentiment || 0));

    if (C.events) lines.push('Events: ' + C.events);
    if (C.travelNotes) lines.push('Travel: ' + C.travelNotes);
    lines.push('');
  }

  // ═══════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════
  lines.push('=== END PACKET ===');

  var packet = lines.join('\n');

  // ═══════════════════════════════════════════════════════════
  // OUTPUT TO SHEET — 3 COLUMNS ONLY
  // ═══════════════════════════════════════════════════════════
  var HEADERS = ['Timestamp', 'Cycle', 'PacketText'];
  
  var sheet = ensureSheet_(ctx.ss, 'Cycle_Packet', HEADERS);

  var startRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(startRow, 1, 1, 3).setValues([
    [
      ctx.now,                                    // A  Timestamp
      S.absoluteCycle || S.cycleId || '',         // B  Cycle
      "'" + packet                                // C  PacketText
    ]
  ]);

  Logger.log('buildCyclePacket_ v3.7: Cycle ' + (S.absoluteCycle || S.cycleId) +
    ' | Election: ' + civic.electionWindow);

  ctx.summary.cyclePacket = packet;
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
 * Helper: Get month name from number
 */
function getMonthName_Packet_(month) {
  var names = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April',
    5: 'May', 6: 'June', 7: 'July', 8: 'August',
    9: 'September', 10: 'October', 11: 'November', 12: 'December'
  };
  return names[month] || 'Unknown';
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