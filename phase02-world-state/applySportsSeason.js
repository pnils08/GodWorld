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
 * applySportsFeedTriggers_ v1.1
 * ============================================================================
 *
 * Reads Sports_Feed sheet and auto-calculates sentiment from team performance.
 *
 * Auto-sentiment factors (weighted):
 *   C: Record (win %) - base sentiment
 *   F: SeasonState - multiplier (playoffs > regular > off-season)
 *   G: PlayoffRound - bonus for deeper playoff runs
 *   H: PlayoffStatus - bonus/penalty for clinched/eliminated
 *   I: Streak - amplifier for hot/cold streaks
 *
 * Manual override:
 *   N: SentimentModifier - if set, overrides auto-calculation
 *
 * Trigger columns:
 *   O: EventTrigger (hot-streak, playoff-push, championship, rivalry)
 *   P: HomeNeighborhood (game day effects location)
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

  // Try to read Sports_Feed sheet
  var ss = ctx.ss;
  if (!ss) return;

  var sheet = ss.getSheetByName('Sports_Feed');
  if (!sheet) {
    Logger.log('applySportsFeedTriggers_: Sports_Feed sheet not found');
    return;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return; // Only header row

  var headers = data[0];

  // Find column indices (flexible header matching)
  var teamCol = findColumnIndex_(headers, ['Team', 'team']);
  var recordCol = findColumnIndex_(headers, ['Record', 'record']);
  var seasonStateCol = findColumnIndex_(headers, ['SeasonState', 'seasonstate']);
  var playoffRoundCol = findColumnIndex_(headers, ['PlayoffRound', 'playoffround']);
  var playoffStatusCol = findColumnIndex_(headers, ['PlayoffStatus', 'playoffstatus']);
  var streakCol = findColumnIndex_(headers, ['Streak', 'streak']);
  var sentimentCol = findColumnIndex_(headers, ['SentimentModifier', 'Sentiment', 'sentimentmodifier']);
  var triggerCol = findColumnIndex_(headers, ['EventTrigger', 'Trigger', 'eventtrigger']);
  var neighborhoodCol = findColumnIndex_(headers, ['HomeNeighborhood', 'Neighborhood', 'homeneighborhood']);

  if (teamCol === -1) {
    Logger.log('applySportsFeedTriggers_: Team column not found');
    return;
  }

  var totalSentiment = 0;
  var triggers = [];
  var neighborhoodEffects = {};

  // Process each team row (skip header)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var team = (row[teamCol] || '').toString().trim();
    if (!team) continue;

    // Check for manual override first
    var manualSentiment = sentimentCol !== -1 ? parseFloat(row[sentimentCol]) : NaN;
    var teamSentiment = 0;

    if (!isNaN(manualSentiment) && manualSentiment !== 0) {
      // Use manual override
      teamSentiment = manualSentiment;
      Logger.log('Sports sentiment (manual): ' + team + ' = ' + teamSentiment);
    } else {
      // Auto-calculate from performance data
      teamSentiment = calculateTeamSentiment_(row, recordCol, seasonStateCol, playoffRoundCol, playoffStatusCol, streakCol);
      Logger.log('Sports sentiment (auto): ' + team + ' = ' + teamSentiment.toFixed(3));
    }

    totalSentiment += teamSentiment;

    // Auto-generate EventTrigger if not set
    var trigger = triggerCol !== -1 ? (row[triggerCol] || '').toString().trim().toLowerCase() : '';
    if (!trigger || trigger === 'none') {
      trigger = inferEventTrigger_(row, streakCol, playoffStatusCol, seasonStateCol);
    }

    if (trigger && trigger !== 'none' && trigger !== '') {
      var neighborhood = neighborhoodCol !== -1
        ? (row[neighborhoodCol] || '').toString().trim()
        : 'Downtown';

      triggers.push({
        team: team,
        trigger: trigger,
        neighborhood: neighborhood,
        streak: streakCol !== -1 ? (row[streakCol] || '').toString() : '',
        sentiment: teamSentiment
      });

      Logger.log('Sports trigger: ' + team + ' -> ' + trigger + ' @ ' + neighborhood);
    }

    // Process HomeNeighborhood effects (game day impacts)
    if (neighborhoodCol !== -1) {
      var hood = (row[neighborhoodCol] || '').toString().trim();
      if (hood) {
        if (!neighborhoodEffects[hood]) {
          neighborhoodEffects[hood] = { traffic: 0, retail: 0, nightlife: 0 };
        }
        // Scale effects by sentiment (winning teams draw more fans)
        var fanBoost = 1 + Math.max(0, teamSentiment * 2);
        neighborhoodEffects[hood].traffic += 0.15 * fanBoost;
        neighborhoodEffects[hood].retail += 0.10 * fanBoost;
        neighborhoodEffects[hood].nightlife += 0.12 * fanBoost;
      }
    }
  }

  // Apply outputs
  S.sportsSentimentBoost = totalSentiment;
  S.sportsEventTriggers = triggers;
  S.sportsNeighborhoodEffects = neighborhoodEffects;

  // Apply sentiment to city mood if significant
  if (totalSentiment !== 0) {
    S.sentiment = (S.sentiment || 0) + totalSentiment;
    Logger.log('applySportsFeedTriggers_: Total sentiment adjustment: ' + totalSentiment.toFixed(3));
  }

  ctx.summary = S;
}

/**
 * Calculate team sentiment from performance data
 * Returns value between -0.08 and +0.08 per team
 */
function calculateTeamSentiment_(row, recordCol, seasonStateCol, playoffRoundCol, playoffStatusCol, streakCol) {
  var sentiment = 0;

  // 1. Record (win percentage) - base sentiment (-0.03 to +0.03)
  if (recordCol !== -1) {
    var record = (row[recordCol] || '').toString();
    var winPct = parseWinPercentage_(record);
    if (winPct !== null) {
      // .500 = neutral, above = positive, below = negative
      sentiment += (winPct - 0.5) * 0.06;  // Range: -0.03 to +0.03
    }
  }

  // 2. SeasonState multiplier
  var seasonMultiplier = 1.0;
  if (seasonStateCol !== -1) {
    var state = (row[seasonStateCol] || '').toString().toLowerCase();
    if (state.indexOf('playoff') >= 0 || state.indexOf('post') >= 0) {
      seasonMultiplier = 2.0;  // Playoffs matter more
    } else if (state.indexOf('championship') >= 0 || state.indexOf('finals') >= 0 || state.indexOf('world') >= 0) {
      seasonMultiplier = 3.0;  // Championship = maximum impact
    } else if (state.indexOf('off') >= 0) {
      seasonMultiplier = 0.3;  // Off-season = minimal impact
    } else if (state.indexOf('spring') >= 0 || state.indexOf('pre') >= 0) {
      seasonMultiplier = 0.5;  // Preseason = low impact
    }
  }

  // 3. PlayoffRound bonus (+0.01 per round)
  if (playoffRoundCol !== -1) {
    var round = (row[playoffRoundCol] || '').toString().toLowerCase();
    if (round.indexOf('wild') >= 0) sentiment += 0.01;
    else if (round.indexOf('division') >= 0 || round.indexOf('alds') >= 0 || round.indexOf('nlds') >= 0) sentiment += 0.02;
    else if (round.indexOf('league') >= 0 || round.indexOf('alcs') >= 0 || round.indexOf('nlcs') >= 0 || round.indexOf('conference') >= 0) sentiment += 0.03;
    else if (round.indexOf('world') >= 0 || round.indexOf('finals') >= 0 || round.indexOf('championship') >= 0) sentiment += 0.04;
  }

  // 4. PlayoffStatus bonus/penalty
  if (playoffStatusCol !== -1) {
    var status = (row[playoffStatusCol] || '').toString().toLowerCase();
    if (status.indexOf('clinch') >= 0 || status.indexOf('won') >= 0) sentiment += 0.02;
    else if (status.indexOf('elimin') >= 0 || status.indexOf('lost') >= 0) sentiment -= 0.02;
    else if (status.indexOf('contend') >= 0 || status.indexOf('race') >= 0) sentiment += 0.01;
  }

  // 5. Streak amplifier (-0.02 to +0.02)
  if (streakCol !== -1) {
    var streak = (row[streakCol] || '').toString().toUpperCase();
    var streakBonus = parseStreakBonus_(streak);
    sentiment += streakBonus;
  }

  // Apply season multiplier
  sentiment = sentiment * seasonMultiplier;

  // Clamp to reasonable range
  return Math.max(-0.08, Math.min(0.08, sentiment));
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
 * Infer event trigger from performance data
 */
function inferEventTrigger_(row, streakCol, playoffStatusCol, seasonStateCol) {
  // Check streak for hot-streak trigger
  if (streakCol !== -1) {
    var streak = (row[streakCol] || '').toString().toUpperCase();
    var match = streak.match(/([WL])(\d+)/i);
    if (match) {
      var type = match[1].toUpperCase();
      var count = parseInt(match[2], 10);
      if (type === 'W' && count >= 6) return 'hot-streak';
      if (type === 'L' && count >= 6) return 'cold-streak';
    }
  }

  // Check playoff status
  if (playoffStatusCol !== -1) {
    var status = (row[playoffStatusCol] || '').toString().toLowerCase();
    if (status.indexOf('clinch') >= 0) return 'playoff-clinch';
    if (status.indexOf('elimin') >= 0) return 'eliminated';
    if (status.indexOf('contend') >= 0) return 'playoff-push';
  }

  // Check season state
  if (seasonStateCol !== -1) {
    var state = (row[seasonStateCol] || '').toString().toLowerCase();
    if (state.indexOf('championship') >= 0 || state.indexOf('finals') >= 0 || state.indexOf('world') >= 0) {
      return 'championship';
    }
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
