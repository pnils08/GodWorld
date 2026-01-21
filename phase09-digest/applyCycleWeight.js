/**
 * ============================================================================
 * CYCLE WEIGHT ENGINE v2.2
 * ============================================================================
 * 
 * World-aware cycle signal classifier with GodWorld Calendar integration.
 * Works with ctx.summary for all inputs.
 *
 * v2.2 Enhancements:
 * - Holiday priority scoring (major, cultural, oakland, minor)
 * - First Friday signal boost
 * - Creation Day recognition
 * - Cultural activity and community engagement factors
 * - Sports season intensity (playoffs, championship)
 * - Aligned with GodWorld Calendar v1.0
 *
 * Inputs from ctx.summary:
 * - worldEvents array
 * - weather impact
 * - civicLoad
 * - cityDynamics (sentiment, culturalActivity, communityEngagement)
 * - patternFlag
 * - shockFlag
 * - storySeeds count
 * - domainPresence
 * - eventArcs
 * - economicMood
 * - holiday, holidayPriority (v2.2)
 * - isFirstFriday, isCreationDay (v2.2)
 * - sportsSeason (v2.2)
 *
 * Output to ctx.summary:
 * - cycleWeight (low-signal | medium-signal | high-signal)
 * - cycleWeightReason (detailed explanation)
 * - cycleWeightScore (raw score for debugging)
 * - cycleWeightCalendarFactors (v2.2 - calendar contributions)
 * 
 * ============================================================================
 */


/**
 * Main entry point - computes cycle weight from ctx.summary
 */
function applyCycleWeight_(ctx) {
  const S = ctx.summary || {};
  
  const worldEvents = S.worldEvents || [];
  const weather = S.weather || {};
  const dynamics = S.cityDynamics || { culturalActivity: 1, communityEngagement: 1 };
  const domains = S.domainPresence || {};
  const arcs = S.eventArcs || [];
  const seeds = S.storySeeds || [];
  const hooks = S.storyHooks || [];
  
  // Calendar fields (v2.2)
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";
  
  let score = 0;
  const reasons = [];
  const calendarFactors = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (worldEvents.length > 0) {
    let eventScore = 0;
    let highSeverity = 0;
    
    worldEvents.forEach(ev => {
      const sev = (ev.severity || 'low').toLowerCase();
      if (sev === 'high' || sev === 'major' || sev === 'critical') {
        eventScore += 4;
        highSeverity++;
      } else if (sev === 'medium' || sev === 'moderate') {
        eventScore += 2;
      } else {
        eventScore += 1;
      }
    });
    
    score += eventScore;
    
    if (highSeverity > 0) {
      reasons.push(highSeverity + ' high-severity event(s)');
    }
    if (worldEvents.length >= 5) {
      reasons.push('High event volume (' + worldEvents.length + ')');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER IMPACT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const weatherImpact = weather.impact || 1;
  
  if (weatherImpact >= 1.4) {
    score += 5;
    reasons.push('Severe weather (impact ' + weatherImpact + ')');
  } else if (weatherImpact >= 1.3) {
    score += 3;
    reasons.push('Notable weather impact');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  const sentiment = dynamics.sentiment || 0;
  
  if (sentiment <= -0.4) {
    score += 4;
    reasons.push('Very negative sentiment (' + sentiment + ')');
  } else if (sentiment <= -0.25) {
    score += 2;
    reasons.push('Negative sentiment');
  } else if (sentiment >= 0.4) {
    score += 2;
    reasons.push('Very positive sentiment');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CIVIC LOAD
  // ═══════════════════════════════════════════════════════════════════════════
  
  const civicLoad = S.civicLoad || 'stable';
  
  if (civicLoad === 'load-strain') {
    score += 4;
    reasons.push('Civic load strain');
  } else if (civicLoad === 'minor-variance') {
    score += 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOCK FLAG
  // ═══════════════════════════════════════════════════════════════════════════
  
  const shockFlag = S.shockFlag || 'none';
  
  if (shockFlag && shockFlag !== 'none') {
    score += 6;
    reasons.push('Shock event detected');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATTERN FLAGS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const patternFlag = S.patternFlag || 'none';
  
  if (patternFlag === 'micro-event-wave') {
    score += 3;
    reasons.push('Micro-event wave pattern');
  } else if (patternFlag === 'strain-trend') {
    score += 4;
    reasons.push('Strain trend detected');
  } else if (patternFlag === 'elevated-activity') {
    score += 2;
    reasons.push('Elevated activity');
  } else if (patternFlag === 'stability-streak') {
    score -= 2;
  } else if (patternFlag === 'calm-after-shock') {
    score -= 1;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STORY SEEDS & HOOKS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const seedCount = seeds.length;
  const hookCount = hooks.length;
  const highPriorityHooks = hooks.filter(h => h.priority >= 3).length;
  
  if (seedCount >= 10) score += 2;
  if (seedCount >= 15) score += 2;
  
  if (highPriorityHooks >= 3) {
    score += 3;
    reasons.push(highPriorityHooks + ' high-priority story hooks');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN CLUSTERING
  // ═══════════════════════════════════════════════════════════════════════════
  
  const activeDomains = Object.values(domains).filter(v => v > 0).length;
  const dominantCount = Math.max(...Object.values(domains), 0);
  
  if (activeDomains >= 6) {
    score += 2;
    reasons.push('Wide domain spread (' + activeDomains + ' active)');
  }
  
  if (dominantCount >= 4) {
    score += 3;
    reasons.push('Domain saturation (' + dominantCount + ' in one domain)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT ARCS
  // ═══════════════════════════════════════════════════════════════════════════
  
  const activeArcs = arcs.filter(a => a && a.phase !== 'resolved');
  const peakArcs = activeArcs.filter(a => a.phase === 'peak');
  const highTensionArcs = activeArcs.filter(a => (a.tension || 0) >= 7);
  
  if (peakArcs.length > 0) {
    score += 4;
    reasons.push(peakArcs.length + ' arc(s) at peak');
  }
  
  if (highTensionArcs.length > 0) {
    score += 2;
    reasons.push('High-tension arc activity');
  }
  
  if (activeArcs.length >= 5) {
    score += 2;
    reasons.push(activeArcs.length + ' active arcs');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC MOOD
  // ═══════════════════════════════════════════════════════════════════════════
  
  const econMood = S.economicMood || 50;
  const econRipples = (S.economicRipples || []).length;
  
  if (econMood <= 30) {
    score += 3;
    reasons.push('Economic distress (mood ' + econMood + ')');
  } else if (econMood >= 70) {
    score += 1;
    reasons.push('Economic boom');
  }
  
  if (econRipples >= 4) {
    score += 2;
    reasons.push(econRipples + ' economic ripples active');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA SATURATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  const mediaEffects = S.mediaEffects || {};
  
  if (mediaEffects.coverageIntensity === 'saturated') {
    score += 2;
    reasons.push('Media saturation');
  }
  
  if (mediaEffects.crisisSaturation >= 0.6) {
    score += 2;
    reasons.push('Crisis dominating media');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY PRIORITY (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (holidayPriority === "major") {
    score += 4;
    reasons.push('Major holiday (' + holiday + ')');
    calendarFactors.push('major-holiday');
  } else if (holidayPriority === "oakland") {
    score += 3;
    reasons.push('Oakland holiday (' + holiday + ')');
    calendarFactors.push('oakland-holiday');
  } else if (holidayPriority === "cultural") {
    score += 3;
    reasons.push('Cultural holiday (' + holiday + ')');
    calendarFactors.push('cultural-holiday');
  } else if (holidayPriority === "minor") {
    score += 1;
    calendarFactors.push('minor-holiday');
  }

  // High-signal holidays that typically generate significant activity
  const highSignalHolidays = [
    "Independence", "Thanksgiving", "Holiday", "NewYear", "NewYearsEve",
    "OpeningDay", "OaklandPride", "Halloween"
  ];
  
  if (highSignalHolidays.includes(holiday)) {
    score += 2;
    calendarFactors.push('high-signal-holiday');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (isFirstFriday) {
    score += 3;
    reasons.push('First Friday art walk');
    calendarFactors.push('first-friday');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (isCreationDay) {
    score += 2;
    reasons.push('Creation Day');
    calendarFactors.push('creation-day');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON INTENSITY (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (sportsSeason === "championship") {
    score += 4;
    reasons.push('Championship game/series');
    calendarFactors.push('championship');
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    score += 2;
    reasons.push('Playoff intensity');
    calendarFactors.push('playoffs');
  } else if (sportsSeason === "late-season") {
    score += 1;
    calendarFactors.push('late-season');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const culturalActivity = dynamics.culturalActivity || 1;
  
  if (culturalActivity >= 1.5) {
    score += 2;
    reasons.push('High cultural activity');
    calendarFactors.push('cultural-surge');
  } else if (culturalActivity >= 1.3) {
    score += 1;
    calendarFactors.push('elevated-cultural');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const communityEngagement = dynamics.communityEngagement || 1;
  
  if (communityEngagement >= 1.4) {
    score += 2;
    reasons.push('High community engagement');
    calendarFactors.push('community-surge');
  } else if (communityEngagement >= 1.2) {
    score += 1;
    calendarFactors.push('elevated-community');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY + CHAOS AMPLIFICATION (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Events during major holidays carry extra weight
  if ((holidayPriority === "major" || holidayPriority === "oakland") && worldEvents.length >= 3) {
    score += 2;
    reasons.push('Multiple events during holiday');
    calendarFactors.push('holiday-chaos-amplification');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  let weight = 'low-signal';
  let baseReason = 'Low activity and stable patterns.';
  
  if (score >= 25) {
    weight = 'high-signal';
    baseReason = 'High chaos density, strong volatility, or severe world signals.';
  } else if (score >= 12) {
    weight = 'medium-signal';
    baseReason = 'Moderate world activity and notable signals.';
  }

  // Build detailed reason
  let detailedReason = baseReason;
  if (reasons.length > 0) {
    detailedReason = reasons.slice(0, 5).join('; ') + '.';
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════
  
  S.cycleWeight = weight;
  S.cycleWeightReason = detailedReason;
  S.cycleWeightScore = score;
  S.cycleWeightCalendarFactors = calendarFactors;
  
  ctx.summary = S;
}


/**
 * Legacy sheet writer - writes to digest sheet
 * Call separately if needed for backward compatibility
 */
function writeCycleWeightToDigest_(ctx) {
  const ss = ctx.ss;
  const S = ctx.summary || {};
  
  const sheet = ss.getSheetByName('Riley_Digest');
  if (!sheet) return;
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const weightCol = headers.indexOf('CycleWeight') + 1;
  const reasonCol = headers.indexOf('CycleWeightReason') + 1;
  const calendarCol = headers.indexOf('CycleWeightCalendarFactors') + 1;
  
  if (weightCol > 0) {
    sheet.getRange(lastRow, weightCol).setValue(S.cycleWeight || 'low-signal');
  }
  
  if (reasonCol > 0) {
    sheet.getRange(lastRow, reasonCol).setValue(S.cycleWeightReason || '');
  }
  
  // v2.2: Write calendar factors if column exists
  if (calendarCol > 0 && S.cycleWeightCalendarFactors) {
    sheet.getRange(lastRow, calendarCol).setValue(S.cycleWeightCalendarFactors.join(', '));
  }
}


/**
 * ============================================================================
 * CYCLE WEIGHT REFERENCE
 * ============================================================================
 * 
 * Score Thresholds:
 * - low-signal: score < 12
 * - medium-signal: score 12-24
 * - high-signal: score >= 25
 * 
 * Calendar Score Contributions (v2.2):
 * - Major holiday: +4
 * - Oakland/Cultural holiday: +3
 * - Minor holiday: +1
 * - High-signal holiday (Thanksgiving, etc.): +2
 * - First Friday: +3
 * - Creation Day: +2
 * - Championship: +4
 * - Playoffs: +2
 * - High cultural activity: +2
 * - High community engagement: +2
 * - Holiday + chaos amplification: +2
 * 
 * Other Major Factors:
 * - High-severity event: +4 each
 * - Severe weather: +5
 * - Shock flag: +6
 * - Arc at peak: +4
 * - Civic load strain: +4
 * - Economic distress: +3
 * 
 * Calendar Factors Output:
 * - major-holiday, oakland-holiday, cultural-holiday, minor-holiday
 * - high-signal-holiday
 * - first-friday
 * - creation-day
 * - championship, playoffs, late-season
 * - cultural-surge, elevated-cultural
 * - community-surge, elevated-community
 * - holiday-chaos-amplification
 * 
 * ============================================================================
 */