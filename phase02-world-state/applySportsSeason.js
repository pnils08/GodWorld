/**
 * ============================================================================
 * applySportsSeason_ v2.3 (canon-safe fallback)
 * ============================================================================
 *
 * Maker override still rules:
 * 1) World_Config override (sportsState_Oakland / sportsState_Chicago)
 * 2) Fallback: SimMonth -> canon-safe phases ONLY (no playoffs/finals/trades)
 *
 * Canon rule:
 * - Engine NEVER invents playoffs/championship/hot-stove. Those require override.
 * ============================================================================
 */

function applySportsSeason_(ctx) {
  const S = ctx.summary;
  const m = Number(S.simMonth || 1);

  // ─────────────────────────────────────────────────────────────
  // PRIORITY 1: World_Config override (Maker control)
  // ─────────────────────────────────────────────────────────────
  const oaklandOverride =
    ctx.config.sportsState_Oakland || ctx.config.sportsStateOakland || null;
  const chicagoOverride =
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
  const out = deriveCanonSafeSeasonFromMonth_(m);

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
  let oaklandState = "off-season";
  let chicagoState = "off-season";
  const activeSports = [];

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

  return { oaklandState, chicagoState, activeSports };
}

/**
 * Build activeSports array from override values (Maker canon).
 * NOTE: This is intentionally allowed to include playoffs/finals/championship,
 * because override is your injected canon.
 */
function buildActiveSportsFromOverride_(oaklandState, chicagoState) {
  const active = [];

  if (oaklandState) {
    const os = oaklandState.toLowerCase();

    if (os === "spring-training") active.push("baseball-spring");
    else if (os === "early-season" || os === "regular-season") active.push("baseball");
    else if (os === "mid-season") active.push("baseball");
    else if (os === "late-season") active.push("baseball-pennant");
    else if (os === "playoffs" || os === "post-season") active.push("baseball-playoffs");
    else if (os === "championship" || os === "world-series") active.push("baseball-championship");
    else if (os === "off-season") active.push("baseball-offseason");
  }

  if (chicagoState) {
    const cs = chicagoState.toLowerCase();

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
