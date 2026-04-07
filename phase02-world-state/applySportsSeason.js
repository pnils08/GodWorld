/**
 * ============================================================================
 * applySportsSeason_ v3.0 (feed-driven, ES5)
 * ============================================================================
 *
 * ALL sports data comes from Oakland_Sports_Feed. No SimMonth derivation.
 * No invented seasons. If Mike didn't write it in the feed, it doesn't exist.
 *
 * Priority order:
 * 1) World_Config override (sportsState_Oakland) — Maker still rules
 * 2) Oakland_Sports_Feed entries for current cycle — SeasonType, TeamsUsed, etc.
 * 3) No data → "unknown" (never guess)
 *
 * v3.0 Changes:
 * - Removed deriveCanonSafeSeasonFromMonth_() — no SimMonth dependency
 * - Removed Chicago from season derivation (phased out after C91)
 * - applySportsSeason_() now reads Oakland_Sports_Feed directly
 * - Stores ALL feed entries for current cycle on S.sportsFeedEntries
 * - S.sportsSeason comes from feed SeasonType, not month mapping
 * - applySportsFeedTriggers_() Oakland-only
 *
 * ============================================================================
 */

function applySportsSeason_(ctx) {
  var S = ctx.summary;

  // ─────────────────────────────────────────────────────────────
  // PRIORITY 1: World_Config override (Maker control)
  // ─────────────────────────────────────────────────────────────
  var oaklandOverride =
    ctx.config.sportsState_Oakland || ctx.config.sportsStateOakland || null;

  if (oaklandOverride) {
    S.sportsSeason = oaklandOverride;
    S.sportsSeasonOakland = oaklandOverride;
    S.sportsSeasonChicago = "";
    S.sportsSource = "config-override";
    S.sportsFeedEntries = [];

    S.activeSports = buildActiveSportsFromOverride_(oaklandOverride);

    Logger.log("applySportsSeason_ v3.0: Using World_Config override");
    Logger.log("  Oakland: " + oaklandOverride);

    ctx.summary = S;
    return;
  }

  // ─────────────────────────────────────────────────────────────
  // PRIORITY 2: Read Oakland_Sports_Feed for current cycle
  // ─────────────────────────────────────────────────────────────
  var currentCycle = S.cycleId || S.cycle || 0;
  var entries = readOaklandFeedEntries_(ctx, currentCycle);

  S.sportsFeedEntries = entries;

  if (entries.length > 0) {
    // SeasonType from last entry (most recent row wins)
    var lastEntry = entries[entries.length - 1];
    S.sportsSeason = lastEntry.seasonType || "unknown";
    S.sportsSeasonOakland = S.sportsSeason;
    S.activeSports = deriveActiveSportsFromFeed_(entries);
    S.sportsSource = "oakland-feed";

    Logger.log("applySportsSeason_ v3.0: " + entries.length + " feed entries for cycle " + currentCycle);
    Logger.log("  Season: " + S.sportsSeason + ", Active: " + S.activeSports.join(", "));
  } else {
    S.sportsSeason = "unknown";
    S.sportsSeasonOakland = "unknown";
    S.activeSports = [];
    S.sportsSource = "oakland-feed-empty";

    Logger.log("applySportsSeason_ v3.0: No feed entries for cycle " + currentCycle);
  }

  S.sportsSeasonChicago = "";

  ctx.summary = S;
}


/**
 * Read all Oakland_Sports_Feed rows for the given cycle.
 * Returns array of structured entry objects.
 */
function readOaklandFeedEntries_(ctx, currentCycle) {
  var ss = ctx.ss;
  if (!ss) return [];

  var sheet = ss.getSheetByName('Oakland_Sports_Feed');
  if (!sheet) {
    Logger.log('readOaklandFeedEntries_: Oakland_Sports_Feed not found');
    return [];
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];

  // Find column indices by header name
  var cycleCol = findColumnIndex_(headers, ['Cycle', 'cycle']);
  var seasonTypeCol = findColumnIndex_(headers, ['SeasonType', 'seasontype']);
  var eventTypeCol = findColumnIndex_(headers, ['EventType', 'eventtype']);
  var teamsCol = findColumnIndex_(headers, ['TeamsUsed', 'teamsused', 'Team', 'team']);
  var namesCol = findColumnIndex_(headers, ['NamesUsed', 'namesused']);
  var notesCol = findColumnIndex_(headers, ['Notes', 'notes']);
  var statsCol = findColumnIndex_(headers, ['Stats', 'stats']);
  var recordCol = findColumnIndex_(headers, ['Team Record', 'teamrecord', 'record']);
  var storyAngleCol = findColumnIndex_(headers, ['StoryAngle', 'storyangle']);
  var playerMoodCol = findColumnIndex_(headers, ['PlayerMood', 'playermood']);
  var triggerCol = findColumnIndex_(headers, ['EventTrigger', 'eventtrigger', 'trigger']);
  var neighborhoodCol = findColumnIndex_(headers, ['HomeNeighborhood', 'homeneighborhood', 'neighborhood']);
  var streakCol = findColumnIndex_(headers, ['Streak', 'streak']);
  var fanSentimentCol = findColumnIndex_(headers, ['FanSentiment', 'fansentiment']);
  var franchiseCol = findColumnIndex_(headers, ['FranchiseStability', 'franchisestability']);
  var economicCol = findColumnIndex_(headers, ['EconomicFootprint', 'economicfootprint']);
  var communityCol = findColumnIndex_(headers, ['CommunityInvestment', 'communityinvestment']);
  var mediaProfileCol = findColumnIndex_(headers, ['MediaProfile', 'mediaprofile']);

  var entries = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var cycle = cycleCol !== -1 ? parseInt(row[cycleCol], 10) : 0;
    if (isNaN(cycle) || cycle !== currentCycle) continue;

    entries.push({
      cycle: cycle,
      seasonType: getColVal_(row, seasonTypeCol),
      eventType: getColVal_(row, eventTypeCol),
      teamsUsed: getColVal_(row, teamsCol),
      namesUsed: getColVal_(row, namesCol),
      notes: getColVal_(row, notesCol),
      stats: getColVal_(row, statsCol),
      teamRecord: getColVal_(row, recordCol),
      storyAngle: getColVal_(row, storyAngleCol),
      playerMood: getColVal_(row, playerMoodCol),
      eventTrigger: getColVal_(row, triggerCol),
      homeNeighborhood: getColVal_(row, neighborhoodCol),
      streak: getColVal_(row, streakCol),
      fanSentiment: getColVal_(row, fanSentimentCol),
      franchiseStability: getColVal_(row, franchiseCol),
      economicFootprint: getColVal_(row, economicCol),
      communityInvestment: getColVal_(row, communityCol),
      mediaProfile: getColVal_(row, mediaProfileCol)
    });
  }

  return entries;
}


/**
 * Safe column value extraction. Returns trimmed string or empty string.
 */
function getColVal_(row, colIdx) {
  if (colIdx === -1) return '';
  return (row[colIdx] || '').toString().trim();
}


/**
 * Derive activeSports array from TeamsUsed across all feed entries.
 */
function deriveActiveSportsFromFeed_(entries) {
  var seen = {};
  var active = [];

  for (var i = 0; i < entries.length; i++) {
    var team = (entries[i].teamsUsed || '').toLowerCase();
    if (!team) continue;

    if ((team.indexOf("a's") !== -1 || team === "as" || team === "oakland a's") && !seen.baseball) {
      seen.baseball = true;
      active.push("baseball");
    }
    if ((team === "nba" || team.indexOf("nba") !== -1) && !seen.basketball) {
      seen.basketball = true;
      active.push("basketball");
    }
    if ((team === "nfl" || team.indexOf("nfl") !== -1) && !seen.football) {
      seen.football = true;
      active.push("football");
    }
  }

  return active;
}


/**
 * Build activeSports array from override value (Maker canon).
 * Intentionally allowed to include playoffs/finals/championship,
 * because override is injected canon.
 */
function buildActiveSportsFromOverride_(oaklandState) {
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

  if (active.length === 0) active.push("off-season");
  return active;
}


/**
 * ============================================================================
 * applySportsFeedTriggers_ v3.0
 * ============================================================================
 *
 * Reads Oakland_Sports_Feed (your manual game logs) to calculate city
 * sentiment from team performance.
 *
 * v3.0 Changes:
 * - Oakland_Sports_Feed only (Chicago removed — phased out after C91)
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
    Logger.log('applySportsFeedTriggers_ v3.0: Oakland_Sports_Feed not found');
  }

  // Apply outputs
  S.sportsSentimentBoost = totalSentiment;
  S.sportsEventTriggers = allTriggers;
  S.sportsNeighborhoodEffects = neighborhoodEffects;

  // Apply sentiment to city mood if significant
  if (totalSentiment !== 0) {
    S.sentiment = (S.sentiment || 0) + totalSentiment;
    Logger.log('applySportsFeedTriggers_ v3.0: Total sentiment adjustment: ' + totalSentiment.toFixed(3));
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
 * S.sportsSeason values (from Oakland_Sports_Feed SeasonType or World_Config):
 * - off-season       : No games
 * - spring-training  : Practice games, roster cuts
 * - early-season     : First stretch of regular season
 * - mid-season       : Core regular season
 * - late-season      : End of regular season
 * - playoffs         : Postseason active
 * - championship     : Finals / World Series
 * - unknown          : No feed entries for this cycle
 *
 * TeamsUsed values (Oakland_Sports_Feed):
 * - A's              : Oakland A's baseball
 * - NBA              : Oakland NBA team (future)
 * - NFL              : Oakland NFL team (future)
 *
 * ============================================================================
 */
