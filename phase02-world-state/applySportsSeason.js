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
 * applySportsFeedTriggers_ v1.0
 * ============================================================================
 *
 * Reads Sports_Feed sheet for manual trigger columns that seed events.
 *
 * Expected columns (added manually to Sports_Feed):
 *   N: SentimentModifier (-0.10 to +0.10) - affects city sentiment
 *   O: EventTrigger (hot-streak, playoff-push, championship, rivalry, etc.)
 *   P: HomeNeighborhood (Jack London, Downtown, etc.) - game day effects
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
  var sentimentCol = findColumnIndex_(headers, ['SentimentModifier', 'Sentiment', 'sentimentmodifier']);
  var triggerCol = findColumnIndex_(headers, ['EventTrigger', 'Trigger', 'eventtrigger']);
  var neighborhoodCol = findColumnIndex_(headers, ['HomeNeighborhood', 'Neighborhood', 'homeneighborhood']);
  var streakCol = findColumnIndex_(headers, ['Streak', 'streak']);

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

    // Process SentimentModifier
    if (sentimentCol !== -1) {
      var sentMod = parseFloat(row[sentimentCol]);
      if (!isNaN(sentMod) && sentMod !== 0) {
        totalSentiment += sentMod;
        Logger.log('Sports sentiment: ' + team + ' contributes ' + sentMod);
      }
    }

    // Process EventTrigger
    if (triggerCol !== -1) {
      var trigger = (row[triggerCol] || '').toString().trim().toLowerCase();
      if (trigger && trigger !== 'none' && trigger !== '') {
        var neighborhood = neighborhoodCol !== -1
          ? (row[neighborhoodCol] || '').toString().trim()
          : 'Downtown';

        triggers.push({
          team: team,
          trigger: trigger,
          neighborhood: neighborhood,
          streak: streakCol !== -1 ? (row[streakCol] || '').toString() : ''
        });

        Logger.log('Sports trigger: ' + team + ' -> ' + trigger + ' @ ' + neighborhood);
      }
    }

    // Process HomeNeighborhood effects (game day impacts)
    if (neighborhoodCol !== -1) {
      var hood = (row[neighborhoodCol] || '').toString().trim();
      if (hood) {
        if (!neighborhoodEffects[hood]) {
          neighborhoodEffects[hood] = { traffic: 0, retail: 0, nightlife: 0 };
        }
        // Game day effects: increased traffic, retail, nightlife in home neighborhood
        neighborhoodEffects[hood].traffic += 0.15;
        neighborhoodEffects[hood].retail += 0.10;
        neighborhoodEffects[hood].nightlife += 0.12;
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
    Logger.log('applySportsFeedTriggers_: Total sentiment adjustment: ' + totalSentiment);
  }

  ctx.summary = S;
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
