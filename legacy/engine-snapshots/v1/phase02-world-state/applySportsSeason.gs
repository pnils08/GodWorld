/**
 * ============================================================================
 * applySportsSeason_ v2.4 (canon-safe fallback, ES5)
 * ============================================================================
 *
 * Maker override still rules:
 * 1) World_Config override (sportsState_Oakland / sportsState_Chicago)
 * 2) Fallback: SimMonth -> canon-safe phases ONLY (no playoffs/finals/trades)
 *
 * Canon rule:
 * - Engine NEVER invents playoffs/championship/hot-stove. Those require override.
 *
 * v2.4 Changes:
 * - ES5 safe: const/let -> var, shorthand properties -> explicit
 * ============================================================================
 */

function applySportsSeason_(ctx) {
  var S = ctx.summary;
  var m = Number(S.simMonth || 1);

  // ─────────────────────────────────────────────────────────────
  // PRIORITY 1: World_Config override (Maker control)
  // ─────────────────────────────────────────────────────────────
  var oaklandOverride =
    ctx.config.sportsState_Oakland || ctx.config.sportsStateOakland || null;
  var chicagoOverride =
    ctx.config.sportsState_Chicago || ctx.config.sportsStateChicago || null;

  if (oaklandOverride || chicagoOverride) {
    S.sportsSeason = oaklandOverride || "off-season";
    S.sportsSeasonOakland = oaklandOverride || null;
    S.sportsSeasonChicago = chicagoOverride || null;
    S.sportsSource = "config-override";

    S.activeSports = buildActiveSportsFromOverride_(oaklandOverride, chicagoOverride);

    Logger.log("applySportsSeason_ v2.3: Using World_Config override");
    Logger.log("  Oakland: " + (oaklandOverride || "not set"));
    Logger.log("  Chicago: " + (chicagoOverride || "not set"));

    ctx.summary = S;
    return;
  }

  // ─────────────────────────────────────────────────────────────
  // PRIORITY 2: SimMonth fallback (canon-safe)
  // - No playoffs/finals/post-season/pennant without override
  // ─────────────────────────────────────────────────────────────
  var out = deriveCanonSafeSeasonFromMonth_(m);

  S.sportsSeason = out.oaklandState; // primary
  S.sportsSeasonOakland = out.oaklandState;
  S.sportsSeasonChicago = out.chicagoState;
  S.activeSports = out.activeSports;
  S.sportsSource = "simmonth-canon-safe";

  ctx.summary = S;
}

/**
 * Canon-safe month -> states.
 * Oakland (baseball):
 * - Mar: spring-training
 * - Apr-May: early-season
 * - Jun-Aug: mid-season
 * - Sep-Oct: late-season
 * - Nov-Feb: off-season
 *
 * Chicago (NBA-ish awareness but canon-safe):
 * - Oct: preseason
 * - Nov-Jun: regular-season (NO playoffs/finals unless override)
 * - Jul-Sep: off-season
 *
 * activeSports:
 * - Never emits "*-playoffs" or "*-finals" without override.
 */
function deriveCanonSafeSeasonFromMonth_(m) {
  var oaklandState = "off-season";
  var chicagoState = "off-season";
  var activeSports = [];

  // Oakland baseball
  if (m === 3) {
    oaklandState = "spring-training";
    activeSports.push("baseball-spring");
  } else if (m === 4 || m === 5) {
    oaklandState = "early-season";
    activeSports.push("baseball");
  } else if (m >= 6 && m <= 8) {
    oaklandState = "mid-season";
    activeSports.push("baseball");
  } else if (m === 9 || m === 10) {
    oaklandState = "late-season";
    activeSports.push("baseball");
  } else {
    oaklandState = "off-season";
  }

  // Chicago basketball (canon-safe)
  if (m === 10) {
    chicagoState = "preseason";
    activeSports.push("basketball-preseason");
  } else if (m >= 11 || m <= 6) {
    chicagoState = "regular-season";
    activeSports.push("basketball");
  } else {
    chicagoState = "off-season";
  }

  // Default if somehow empty
  if (activeSports.length === 0) activeSports.push("off-season");

  return { oaklandState: oaklandState, chicagoState: chicagoState, activeSports: activeSports };
}

/**
 * Build activeSports array from override values (Maker canon).
 * NOTE: This is intentionally allowed to include playoffs/finals/championship,
 * because override is your injected canon.
 */
function buildActiveSportsFromOverride_(oaklandState, chicagoState) {
  var active = [];

  if (oaklandState) {
    var os = oaklandState.toLowerCase();

    if (os === "spring-training") active.push("baseball-spring");
    else if (os === "early-season" || os === "regular-season") active.push("baseball");
    else if (os === "mid-season") active.push("baseball");
    else if (os === "late-season") active.push("baseball-pennant");
    else if (os === "playoffs" || os === "post-season") active.push("baseball-playoffs");
    else if (os === "championship" || os === "world-series") active.push("baseball-championship");
    else if (os === "off-season") active.push("baseball-offseason");
  }

  if (chicagoState) {
    var cs = chicagoState.toLowerCase();

    if (cs === "preseason") active.push("basketball-preseason");
    else if (cs === "regular-season") active.push("basketball");
    else if (cs === "playoffs") active.push("basketball-playoffs");
    else if (cs === "championship" || cs === "finals") active.push("basketball-finals");
    else if (cs === "off-season") active.push("basketball-offseason");
  }

  if (active.length === 0) active.push("off-season");
  return active;
}

/**
 * ============================================================================
 * applySportsFeedTriggers_ v2.0
 * ============================================================================
 *
 * Reads Oakland_Sports_Feed and Chicago_Sports_Feed (your manual game logs)
 * to calculate city sentiment from team performance.
 *
 * Replaces v1.1 which read from the single Sports_Feed sheet (now dead).
 * Same entry you log for journalism now also drives city mood.
 *
 * How it works:
 *   Scans all feed rows up to the current cycle, builds a snapshot of the
 *   latest state per team (most recent record, season, streak, trigger).
 *   Then calculates sentiment and neighborhood effects from that snapshot.
 *
 * Feed columns used (by header name, not position):
 *   Cycle           - filters entries to current/past cycles
 *   SeasonType      - season multiplier (playoffs > regular > off-season)
 *   TeamsUsed       - team identification
 *   Team Record     - win percentage -> base sentiment
 *   EventTrigger    - special event triggers (hot-streak, playoff-clinch, etc.)
 *   HomeNeighborhood- game day neighborhood effects
 *   Streak          - hot/cold streak amplifier (W6, L3 format)
 *
 * Outputs to ctx.summary:
 *   - sportsSentimentBoost: cumulative sentiment modifier
 *   - sportsEventTriggers: array of {team, trigger, neighborhood}
 *   - sportsNeighborhoodEffects: {neighborhood: {traffic, retail, nightlife}}
 *
 * ============================================================================
 */
function applySportsFeedTriggers_(ctx) {
  var S = ctx.summary;
  if (!S) S = ctx.summary = {};

  // Initialize outputs
  S.sportsSentimentBoost = 0;
  S.sportsEventTriggers = [];
  S.sportsNeighborhoodEffects = {};

  var ss = ctx.ss;
  if (!ss) return;

  var currentCycle = S.cycle || 0;
  var totalSentiment = 0;
  var allTriggers = [];
  var neighborhoodEffects = {};

  // Process Oakland_Sports_Feed
  var oakSheet = ss.getSheetByName('Oakland_Sports_Feed');
  if (oakSheet) {
    var oakResult = processFeedSheet_(oakSheet, currentCycle);
    totalSentiment += oakResult.sentiment;
    allTriggers = allTriggers.concat(oakResult.triggers);
    mergeNeighborhoodEffects_(neighborhoodEffects, oakResult.neighborhoodEffects);
  } else {
    Logger.log('applySportsFeedTriggers_ v2.0: Oakland_Sports_Feed not found');
  }

  // Process Chicago_Sports_Feed
  var chiSheet = ss.getSheetByName('Chicago_Sports_Feed');
  if (chiSheet) {
    var chiResult = processFeedSheet_(chiSheet, currentCycle);
    totalSentiment += chiResult.sentiment;
    allTriggers = allTriggers.concat(chiResult.triggers);
    mergeNeighborhoodEffects_(neighborhoodEffects, chiResult.neighborhoodEffects);
  } else {
    Logger.log('applySportsFeedTriggers_ v2.0: Chicago_Sports_Feed not found');
  }

  // Apply outputs
  S.sportsSentimentBoost = totalSentiment;
  S.sportsEventTriggers = allTriggers;
  S.sportsNeighborhoodEffects = neighborhoodEffects;

  // Apply sentiment to city mood if significant
  if (totalSentiment !== 0) {
    S.sentiment = (S.sentiment || 0) + totalSentiment;
    Logger.log('applySportsFeedTriggers_ v2.0: Total sentiment adjustment: ' + totalSentiment.toFixed(3));
  }

  ctx.summary = S;
}

/**
 * Process a single sports feed sheet and extract per-team sentiment + triggers.
 * Scans all rows up to currentCycle, builds latest state per team,
 * then calculates sentiment from record + season + streak.
 */
function processFeedSheet_(sheet, currentCycle) {
  var empty = { sentiment: 0, triggers: [], neighborhoodEffects: {} };

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return empty;

  var headers = data[0];

  // Find column indices by header name (flexible matching)
  var cycleCol = findColumnIndex_(headers, ['Cycle', 'cycle']);
  var seasonTypeCol = findColumnIndex_(headers, ['SeasonType', 'seasontype']);
  var teamsCol = findColumnIndex_(headers, ['TeamsUsed', 'teamsused', 'Team', 'team']);
  var recordCol = findColumnIndex_(headers, ['Team Record', 'teamrecord', 'record']);
  var streakCol = findColumnIndex_(headers, ['Streak', 'streak']);
  var triggerCol = findColumnIndex_(headers, ['EventTrigger', 'eventtrigger', 'trigger']);
  var neighborhoodCol = findColumnIndex_(headers, ['HomeNeighborhood', 'homeneighborhood', 'neighborhood']);

  // Build per-team latest state by scanning all rows
  var teamState = {};

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var cycle = cycleCol !== -1 ? parseInt(row[cycleCol], 10) : 0;
    if (isNaN(cycle) || cycle === 0) continue;
    if (currentCycle > 0 && cycle > currentCycle) continue;

    var team = teamsCol !== -1 ? (row[teamsCol] || '').toString().trim() : '';
    if (!team) continue;

    if (!teamState[team]) {
      teamState[team] = { record: '', seasonType: '', streak: '', trigger: '', neighborhood: '', cycle: 0 };
    }

    var ts = teamState[team];

    // Update from newer or same-cycle entries (later rows win for same cycle)
    if (cycle >= ts.cycle) {
      var record = recordCol !== -1 ? (row[recordCol] || '').toString().trim() : '';
      var seasonType = seasonTypeCol !== -1 ? (row[seasonTypeCol] || '').toString().trim() : '';
      var streak = streakCol !== -1 ? (row[streakCol] || '').toString().trim() : '';
      var trigger = triggerCol !== -1 ? (row[triggerCol] || '').toString().trim() : '';
      var neighborhood = neighborhoodCol !== -1 ? (row[neighborhoodCol] || '').toString().trim() : '';

      // Only overwrite with non-empty values (preserves earlier data if latest row is blank)
      if (record) ts.record = record;
      if (seasonType) ts.seasonType = seasonType;
      if (streak) ts.streak = streak;
      if (trigger) ts.trigger = trigger;
      if (neighborhood) ts.neighborhood = neighborhood;
      ts.cycle = cycle;
    }
  }

  // Calculate sentiment and triggers for each team
  var totalSentiment = 0;
  var triggers = [];
  var neighborhoodEffects = {};

  for (var teamName in teamState) {
    var state = teamState[teamName];

    // 1. Base sentiment from win percentage (-0.03 to +0.03)
    var baseSentiment = 0;
    var winPct = parseWinPercentage_(state.record);
    if (winPct !== null) {
      baseSentiment = (winPct - 0.5) * 0.06;
    }

    // 2. Season multiplier
    var seasonMultiplier = 1.0;
    var st = (state.seasonType || '').toLowerCase();
    if (st.indexOf('playoff') >= 0 || st.indexOf('post') >= 0) {
      seasonMultiplier = 2.0;
    } else if (st.indexOf('championship') >= 0 || st.indexOf('finals') >= 0 || st.indexOf('world') >= 0) {
      seasonMultiplier = 3.0;
    } else if (st.indexOf('off') >= 0) {
      seasonMultiplier = 0.3;
    } else if (st.indexOf('spring') >= 0 || st.indexOf('pre') >= 0) {
      seasonMultiplier = 0.5;
    }

    // 3. Streak amplifier
    var streakBonus = parseStreakBonus_((state.streak || '').toUpperCase());

    // Calculate and clamp (-0.08 to +0.08 per team)
    var teamSentiment = (baseSentiment + streakBonus) * seasonMultiplier;
    teamSentiment = Math.max(-0.08, Math.min(0.08, teamSentiment));
    totalSentiment += teamSentiment;

    Logger.log('Sports sentiment: ' + teamName + ' = ' + teamSentiment.toFixed(3) +
      ' (record: ' + state.record + ', season: ' + state.seasonType + ', streak: ' + state.streak + ')');

    // Process trigger (use manual if set, otherwise infer from state)
    var triggerValue = (state.trigger || '').toLowerCase();
    if (!triggerValue) {
      triggerValue = inferFeedTrigger_(state);
    }

    if (triggerValue && triggerValue !== 'none') {
      triggers.push({
        team: teamName,
        trigger: triggerValue,
        neighborhood: state.neighborhood || 'Downtown',
        streak: state.streak,
        sentiment: teamSentiment
      });
      Logger.log('Sports trigger: ' + teamName + ' -> ' + triggerValue +
        ' @ ' + (state.neighborhood || 'Downtown'));
    }

    // Neighborhood effects (game day impacts)
    if (state.neighborhood) {
      if (!neighborhoodEffects[state.neighborhood]) {
        neighborhoodEffects[state.neighborhood] = { traffic: 0, retail: 0, nightlife: 0 };
      }
      var fanBoost = 1 + Math.max(0, teamSentiment * 2);
      neighborhoodEffects[state.neighborhood].traffic += 0.15 * fanBoost;
      neighborhoodEffects[state.neighborhood].retail += 0.10 * fanBoost;
      neighborhoodEffects[state.neighborhood].nightlife += 0.12 * fanBoost;
    }
  }

  return { sentiment: totalSentiment, triggers: triggers, neighborhoodEffects: neighborhoodEffects };
}

/**
 * Merge neighborhood effects from source into target (accumulates).
 */
function mergeNeighborhoodEffects_(target, source) {
  for (var hood in source) {
    if (!target[hood]) {
      target[hood] = { traffic: 0, retail: 0, nightlife: 0 };
    }
    target[hood].traffic += source[hood].traffic;
    target[hood].retail += source[hood].retail;
    target[hood].nightlife += source[hood].nightlife;
  }
}

/**
 * Parse win percentage from record string (e.g., "85-62" -> 0.578)
 */
function parseWinPercentage_(record) {
  if (!record) return null;
  var match = record.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!match) return null;
  var wins = parseInt(match[1], 10);
  var losses = parseInt(match[2], 10);
  var total = wins + losses;
  if (total === 0) return null;
  return wins / total;
}

/**
 * Parse streak bonus from streak string (e.g., "W6" -> +0.02, "L3" -> -0.01)
 */
function parseStreakBonus_(streak) {
  if (!streak) return 0;
  var match = streak.match(/([WL])(\d+)/i);
  if (!match) return 0;
  var type = match[1].toUpperCase();
  var count = parseInt(match[2], 10);

  if (type === 'W') {
    if (count >= 6) return 0.02;
    if (count >= 3) return 0.01;
    return 0.005;
  } else {
    if (count >= 6) return -0.02;
    if (count >= 3) return -0.01;
    return -0.005;
  }
}

/**
 * Infer event trigger from team state when not manually set.
 */
function inferFeedTrigger_(teamState) {
  // Check streak for hot/cold streak triggers
  if (teamState.streak) {
    var match = teamState.streak.toUpperCase().match(/([WL])(\d+)/);
    if (match) {
      var type = match[1];
      var count = parseInt(match[2], 10);
      if (type === 'W' && count >= 6) return 'hot-streak';
      if (type === 'L' && count >= 6) return 'cold-streak';
    }
  }

  // Check season type for championship
  var st = (teamState.seasonType || '').toLowerCase();
  if (st.indexOf('championship') >= 0 || st.indexOf('finals') >= 0 || st.indexOf('world') >= 0) {
    return 'championship';
  }

  return '';
}

/**
 * Helper: Find column index by possible header names (case-insensitive)
 */
function findColumnIndex_(headers, possibleNames) {
  for (var i = 0; i < headers.length; i++) {
    var h = (headers[i] || '').toString().toLowerCase().trim();
    for (var j = 0; j < possibleNames.length; j++) {
      if (h === possibleNames[j].toLowerCase()) {
        return i;
      }
    }
  }
  return -1;
}


/**
 * ============================================================================
 * SPORTS STATE VALUES
 * ============================================================================
 *
 * World_Config keys (set when inputting game data):
 *
 * sportsState_Oakland:
 * - off-season       : No games
 * - spring-training  : Practice games, roster cuts
 * - early-season     : First month of regular season
 * - mid-season       : Core regular season
 * - late-season      : Playoff push
 * - playoffs         : Postseason active (REQUIRES OVERRIDE)
 * - championship     : World Series (REQUIRES OVERRIDE)
 *
 * sportsState_Chicago:
 * - off-season       : No games
 * - preseason        : Practice/exhibition
 * - regular-season   : NBA regular season
 * - playoffs         : Postseason active (REQUIRES OVERRIDE)
 * - championship     : NBA Finals (REQUIRES OVERRIDE)
 *
 * ============================================================================
 *
 * CANON-SAFE RULE:
 * Engine fallback NEVER emits playoffs/finals/championship/pennant.
 * Those states require Maker override via World_Config.
 *
 * ============================================================================
 */
