/**
 * ============================================================================
 * applySportsSeason_ v2.2
 * ============================================================================
 * 
 * Determines sports season state and active sports.
 * Oakland-focused: A's baseball, Warriors basketball.
 * Chicago satellite: Bulls basketball.
 * 
 * TIME & CANON PROTOCOL:
 * Priority order:
 * 1. World_Config override (sportsState_Oakland, sportsState_Chicago)
 * 2. Fallback to SimMonth calculation (v2.1 logic)
 * 
 * Sports state can be Maker-controlled when game data is input,
 * or engine-calculated from SimMonth when no override is set.
 * 
 * ============================================================================
 */

function applySportsSeason_(ctx) {

  const S = ctx.summary;
  const m = S.simMonth || 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 1: World_Config override (Maker control)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const oaklandOverride = ctx.config.sportsState_Oakland || ctx.config.sportsStateOakland || null;
  const chicagoOverride = ctx.config.sportsState_Chicago || ctx.config.sportsStateChicago || null;
  
  if (oaklandOverride || chicagoOverride) {
    
    S.sportsSeason = oaklandOverride || 'off-season';
    S.sportsSeasonOakland = oaklandOverride || null;
    S.sportsSeasonChicago = chicagoOverride || null;
    S.sportsSource = 'config-override';
    
    // Build activeSports from overrides
    S.activeSports = buildActiveSportsFromOverride_(oaklandOverride, chicagoOverride);
    
    Logger.log('applySportsSeason_ v2.2: Using World_Config override');
    Logger.log('  Oakland: ' + (oaklandOverride || 'not set'));
    Logger.log('  Chicago: ' + (chicagoOverride || 'not set'));
    
    ctx.summary = S;
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIORITY 2: SimMonth calculation (v2.1 logic)
  // ═══════════════════════════════════════════════════════════════════════════

  let state = "off-season";
  let activeSports = [];

  // Baseball (A's): March-October
  // Basketball (Warriors/Bulls): October-June
  
  if (m === 3) {
    state = "spring-training";
    activeSports = ["baseball-spring"];
  } else if (m === 4 || m === 5) {
    state = "early-season";
    activeSports = ["baseball", "basketball-playoffs"];
  } else if (m >= 6 && m <= 8) {
    state = "mid-season";
    activeSports = ["baseball"];
    if (m === 6) activeSports.push("basketball-finals");
  } else if (m === 9 || m === 10) {
    state = "late-season";
    activeSports = ["baseball-pennant"];
    if (m === 10) activeSports.push("basketball-preseason");
  } else if (m === 11) {
    state = "post-season";
    activeSports = ["baseball-playoffs", "basketball"];
  } else if (m === 12 || m === 1 || m === 2) {
    state = "off-season";
    activeSports = ["basketball"];
    if (m === 2) activeSports.push("baseball-spring-prep");
  }

  S.sportsSeason = state;
  S.sportsSeasonOakland = state;
  S.sportsSeasonChicago = getChicagoSeasonFromMonth_(m);
  S.activeSports = activeSports;
  S.sportsSource = 'simmonth-calculated';
  
  ctx.summary = S;
}


/**
 * Build activeSports array from override values
 */
function buildActiveSportsFromOverride_(oaklandState, chicagoState) {
  
  const active = [];
  
  // Oakland sports (A's baseball, Warriors basketball)
  if (oaklandState) {
    const os = oaklandState.toLowerCase();
    
    if (os === 'spring-training') {
      active.push('baseball-spring');
    } else if (os === 'early-season' || os === 'regular-season') {
      active.push('baseball');
    } else if (os === 'mid-season') {
      active.push('baseball');
    } else if (os === 'late-season') {
      active.push('baseball-pennant');
    } else if (os === 'playoffs' || os === 'post-season') {
      active.push('baseball-playoffs');
    } else if (os === 'championship' || os === 'world-series') {
      active.push('baseball-championship');
    }
  }
  
  // Chicago sports (Bulls basketball)
  if (chicagoState) {
    const cs = chicagoState.toLowerCase();
    
    if (cs === 'preseason') {
      active.push('basketball-preseason');
    } else if (cs === 'regular-season') {
      active.push('basketball');
    } else if (cs === 'playoffs') {
      active.push('basketball-playoffs');
    } else if (cs === 'championship' || cs === 'finals') {
      active.push('basketball-finals');
    }
  }
  
  // Default if nothing set
  if (active.length === 0) {
    active.push('off-season');
  }
  
  return active;
}


/**
 * Get Chicago season state from SimMonth
 * Bulls follow standard NBA calendar
 */
function getChicagoSeasonFromMonth_(m) {
  
  // NBA: October-June
  if (m === 10) return 'preseason';
  if (m >= 11 || m <= 3) return 'regular-season';
  if (m === 4 || m === 5) return 'playoffs';
  if (m === 6) return 'finals';
  
  // July-September: off-season
  return 'off-season';
}


/**
 * ============================================================================
 * SPORTS STATE VALUES
 * ============================================================================
 * 
 * World_Config keys (set when inputting game data):
 * 
 * sportsState_Oakland:
 * - off-season       : No games, trades/signings
 * - spring-training  : Practice games, roster cuts
 * - early-season     : First month of regular season
 * - mid-season       : Core regular season
 * - late-season      : Playoff push
 * - playoffs         : Postseason active
 * - championship     : World Series
 * 
 * sportsState_Chicago:
 * - off-season       : No games
 * - preseason        : Practice/exhibition
 * - regular-season   : NBA regular season
 * - playoffs         : Postseason active
 * - championship     : NBA Finals
 * 
 * ============================================================================
 * 
 * When override is NOT set, engine calculates from SimMonth using v2.1 logic.
 * Override takes priority — set it when you input game data from video games.
 * 
 * ============================================================================
 */