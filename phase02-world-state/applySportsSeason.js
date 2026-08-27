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
    // Maker-declared state is the ONLY source that licenses invented sports
    // atmosphere (watch parties, playoff texture, drift nudges). Feed-driven
    // SeasonType must not — feed rows are Mike's game logs, not a license to
    // synthesize city-wide sports mood (S302 C122 "playoffs" contamination).
    S.sportsAtmosphereEnabled = true;
    S.sportsFeedSeasonType = "";
    S.sportsFeedEntries = [];
    // Maker override is a single city-wide declaration, not a per-team feed
    // read — both franchises answer to it (engine.131).
    S.sportsSeasonByTeam = {};

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
    // engine.131 — the S302 gate, corrected.
    //
    // S302 was right that feed SeasonType is Mike's game-log metadata and NOT a
    // license for the engine to synthesize sports atmosphere; that was the C122
    // "playoffs" contamination. Its prescribed fix was `sportsAtmosphereEnabled`
    // plus guards at nine named generators, and those guards are installed and
    // stay armed — see docs/research/2026-07-07-simulation-narrative-open-items §2.
    //
    // What ALSO shipped, unprescribed, was a blanket sentinel pinning this field
    // to "off-season" on every feed-sourced cycle. Belt and suspenders. The
    // suspenders took out the city: ~92 dial-class branch sites across 44 files
    // went permanently inert, and the sentinel was PERSISTED to
    // Neighborhood_Map.SportsSeason for all 22 neighborhoods — the world record
    // saying there is no baseball while the A's sit 126-35.
    //
    // The seam S302 missed is invent-prose vs. move-dial. Writing "championship
    // fever" into World_Population lore that no feed row recorded is
    // contamination, and stays gated on sportsAtmosphereEnabled. A nightlife
    // multiplier rising because Mike actually recorded a postseason game is the
    // city responding to a real fact. That must read the truth.
    //
    // Published in Mike's own feed vocabulary, not an internal tier name —
    // downstream branches test 'championship'/'playoffs'/'late-season' directly,
    // so canonicalization is alias-only and every existing site keeps working.
    S.sportsSeasonByTeam = deriveSeasonByTeamFromFeed_(entries);
    S.sportsSeason = deepestSportsPhase_(S.sportsSeasonByTeam);
    S.sportsSeasonOakland = S.sportsSeason;

    var lastEntry = entries[entries.length - 1];
    S.sportsFeedSeasonType = lastEntry.seasonType || "unknown";
    S.activeSports = deriveActiveSportsFromFeed_(entries);
    S.sportsSource = "oakland-feed";
    // Unchanged and deliberate: the feed never licenses invented atmosphere.
    S.sportsAtmosphereEnabled = false;

    Logger.log("applySportsSeason_ v3.1: " + entries.length + " feed entries for cycle " + currentCycle);
    Logger.log("  Season: " + S.sportsSeason + " (deepest of " +
      describeSeasonByTeam_(S.sportsSeasonByTeam) + "), Active: " + S.activeSports.join(", "));
  } else {
    // No feed row for this cycle means no game was played, and the quiet case
    // is the normal case (applyGameNightMoments makes the same structural bet).
    // "off-season" stays correct here — and unlike the S302 sentinel it is not
    // masking a recorded fact, because there is no recorded fact.
    //
    // engine.131 note: this deliberately does NOT carry a team's phase forward
    // from an earlier cycle. Established feed law — "old team state does not
    // speak by itself" (docs/OAKLAND_SPORTS_FEED §Current flow). Changing that
    // is a separate decision with its own blast radius, not a rider on this one.
    S.sportsSeason = "off-season";
    S.sportsSeasonOakland = "off-season";
    S.sportsSeasonByTeam = {};
    S.sportsFeedSeasonType = "unknown";
    S.activeSports = [];
    S.sportsSource = "oakland-feed-empty";
    S.sportsAtmosphereEnabled = false;

    Logger.log("applySportsSeason_ v3.1: No feed entries for cycle " + currentCycle);
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
 * Normalizes the active Oakland team contract without introducing a Node
 * dependency into Apps Script. Free-text matching preserves the historical
 * read path; NBA/Warriors and NFL remain read-only compatibility values.
 */
function normalizeOaklandFeedTeam_(value) {
  var rawTeam = (value || '').toString().trim();
  if (!rawTeam) return '';

  var team = rawTeam.toLowerCase();
  if (team === 'as' || team.indexOf("a's") !== -1) return "A's";
  if (
    team.indexOf('oaks') !== -1 ||
    team.indexOf('nba') !== -1 ||
    team.indexOf('warriors') !== -1
  ) return 'Oaks';
  if (team.indexOf('nfl') !== -1) return 'NFL';

  Logger.log(
    'normalizeOaklandFeedTeam_: unknown nonblank TeamsUsed value "' +
    rawTeam +
    '"; skipping'
  );
  return '';
}


/**
 * engine.131 — canonicalize a feed SeasonType onto the vocabulary the engine
 * already branches on.
 *
 * This is alias resolution, NOT tier normalization. ~92 downstream sites test
 * Mike's own words ('championship', 'playoffs', 'late-season'), so almost every
 * label passes through untouched and every existing branch keeps working with
 * no downstream edit. Only two feed labels have no downstream reader and need
 * mapping — measured across the live 206-row feed at C104:
 *
 *   world-series  -> championship  (the World Series IS the championship; 43
 *                                   sites test 'championship', 1 tests this)
 *   summer league -> preseason     (developmental/exhibition ball, Oaks-side)
 *
 * Anything unrecognized falls to "off-season" rather than passing through: an
 * unknown string reaching the ~13 `!== "off-season"` sites would read as
 * in-season and quietly turn the city on. Fail closed, and say so in the log.
 */
var SPORTS_PHASE_ALIASES_ = {
  'world-series': 'championship',
  'worldseries': 'championship',
  'world series': 'championship',
  'finals': 'championship',
  'postseason': 'post-season',
  'summer league': 'preseason',
  'summer-league': 'preseason',
  'regular': 'regular-season'
};

var SPORTS_PHASE_DEPTH_ = {
  'off-season': 0,
  'spring-training': 1,
  'preseason': 1,
  'early-season': 2,
  'regular-season': 2,
  'mid-season': 3,
  'late-season': 4,
  'post-season': 5,
  'playoffs': 5,
  'championship': 6
};

function canonicalSportsPhase_(rawSeasonType) {
  var s = String(rawSeasonType || '').trim().toLowerCase();
  if (!s) return 'off-season';
  if (SPORTS_PHASE_ALIASES_[s]) s = SPORTS_PHASE_ALIASES_[s];
  if (SPORTS_PHASE_DEPTH_[s] === undefined) {
    Logger.log('canonicalSportsPhase_: unrecognized SeasonType "' + rawSeasonType +
      '"; treating as off-season');
    return 'off-season';
  }
  return s;
}


/**
 * engine.131 — per-team season phase for the current cycle.
 *
 * Oakland runs two franchises on separate calendars; one global string is wrong
 * for at least one of them by construction (that defect is why the C104 world
 * summary announced "off-season" over its own Sports section showing the A's two
 * games from the end of the year). TeamsUsed can carry several teams on one row
 * and the SeasonType applies to each — same split the builder-side
 * realSeasonLabel_ uses in scripts/buildWorldSummary.js.
 *
 * Within a team, later rows win: established Phase 2 law is that within one
 * Cycle, later rows override earlier values.
 */
function deriveSeasonByTeamFromFeed_(entries) {
  var byTeam = {};

  for (var i = 0; i < entries.length; i++) {
    var rawType = entries[i].seasonType;
    if (!String(rawType || '').trim()) continue;

    var phase = canonicalSportsPhase_(rawType);
    var team = normalizeOaklandFeedTeam_(entries[i].teamsUsed);
    if (!team) continue;

    byTeam[team] = phase;
  }

  return byTeam;
}


/**
 * engine.131 — resolve the city-wide phase from the per-team map.
 *
 * Mike-direct 2026-08-27: the A's and the Oaks never run a season at the same
 * time, and whichever is deeper in its postseason takes the city's attention.
 * So the city-wide value is the DEEPEST phase across teams, not the last row
 * read or an average. A club in the championship sets the city's temperature
 * even if the other franchise is in spring training.
 */
function deepestSportsPhase_(byTeam) {
  var deepest = 'off-season';
  var deepestRank = 0;

  for (var team in byTeam) {
    if (!Object.prototype.hasOwnProperty.call(byTeam, team)) continue;
    var phase = byTeam[team];
    var rank = SPORTS_PHASE_DEPTH_[phase];
    if (rank === undefined) continue;
    if (rank > deepestRank) {
      deepestRank = rank;
      deepest = phase;
    }
  }

  return deepest;
}


/**
 * Human-readable per-team phase for logs. "A's late-season, Oaks preseason".
 */
function describeSeasonByTeam_(byTeam) {
  var parts = [];
  for (var team in byTeam) {
    if (!Object.prototype.hasOwnProperty.call(byTeam, team)) continue;
    parts.push(team + ' ' + byTeam[team]);
  }
  return parts.length ? parts.join(', ') : 'no team rows';
}


/**
 * Derive activeSports array from TeamsUsed across all feed entries.
 */
function deriveActiveSportsFromFeed_(entries) {
  var seen = {};
  var active = [];

  for (var i = 0; i < entries.length; i++) {
    var team = normalizeOaklandFeedTeam_(entries[i].teamsUsed);
    if (!team) continue;

    if (team === "A's" && !seen.baseball) {
      seen.baseball = true;
      active.push("baseball");
    }
    if (team === 'Oaks' && !seen.basketball) {
      seen.basketball = true;
      active.push("basketball");
    }
    if (team === 'NFL' && !seen.football) {
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
 *   Cycle             - filters entries to current/past cycles
 *   SeasonType        - season multiplier (playoffs > regular > off-season)
 *   TeamsUsed         - team identification
 *   Team Record       - win percentage -> base sentiment
 *   EventTrigger      - special event triggers (hot-streak, playoff-clinch, etc.)
 *   HomeNeighborhood  - game day neighborhood effects
 *   Streak            - hot/cold streak amplifier (W6, L3 format)
 *   PlayerMood        - story hook triggers (frustrated = drama, electric = energy)
 *   FanSentiment      - nightlife + retail multiplier
 *   FranchiseStability- long-term economic signal (uncertain = business caution)
 *   EconomicFootprint - retail + traffic around stadium neighborhood
 *   CommunityInvestment - community engagement in HomeNeighborhood
 *   MediaProfile      - scales all effects (national = 1.5x, regional = 1.0x)
 *
 * Convention: Last entry per cycle is the "season-state" row — definitive
 * snapshot. Earlier entries are story content for reporters. Last row wins
 * for all engine behavior columns.
 *
 * Outputs to ctx.summary:
 *   - sportsSentimentBoost: cumulative sentiment modifier
 *   - sportsEventTriggers: array of {team, trigger, neighborhood, playerMood}
 *   - sportsNeighborhoodEffects: {neighborhood: {traffic, retail, nightlife, communityEngagement}}
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

  // engine.45 T1: persist sports attribution — the sentiment scalar was a dead write and
  // per-hood effects merged into anonymous numbers (trace S1/S3, gaps 1/2/4).
  if (typeof recordRipple_ === 'function') {
    if (totalSentiment !== 0) {
      var trigParts = [];
      for (var tpi = 0; tpi < allTriggers.length; tpi++) {
        var tg = allTriggers[tpi];
        trigParts.push((tg.team || '?') + (tg.streak ? ' ' + tg.streak : '') + (tg.trigger ? ' [' + tg.trigger + ']' : ''));
      }
      recordRipple_(ctx, {
        causeType: 'sports',
        causeId: 'Oakland_Sports_Feed',
        causeDetail: trigParts.join('; '),
        effectType: 'sentiment',
        targetScope: 'citywide',
        magnitude: Math.round(totalSentiment * 1000) / 1000,
        duration: 1,
        sourceEngine: 'applySportsSeason.applySportsFeedTriggers_'
      });
    }
    for (var rnh in neighborhoodEffects) {
      recordRipple_(ctx, {
        causeType: 'sports',
        causeId: 'Oakland_Sports_Feed',
        causeDetail: JSON.stringify(neighborhoodEffects[rnh]),
        effectType: 'traffic/retail/nightlife/communityEngagement',
        targetScope: 'neighborhood',
        targetIds: [rnh],
        neighborhood: rnh,
        magnitude: (neighborhoodEffects[rnh] && neighborhoodEffects[rnh].traffic) || 0,
        duration: 1,
        sourceEngine: 'applySportsSeason.applySportsFeedTriggers_'
      });
    }
  }

  // engine.45 T3a: dead S.sentiment write deleted — the scalar had no consumer.
  // S.sportsSentimentBoost now folds into finalCity.sentiment in
  // applyCityDynamics_ (Phase2-CityDynamics runs after Phase2-SportsFeed).
  if (totalSentiment !== 0) {
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
  var playerMoodCol = findColumnIndex_(headers, ['PlayerMood', 'playermood']);
  var fanSentimentCol = findColumnIndex_(headers, ['FanSentiment', 'fansentiment']);
  var franchiseCol = findColumnIndex_(headers, ['FranchiseStability', 'franchisestability']);
  var economicCol = findColumnIndex_(headers, ['EconomicFootprint', 'economicfootprint']);
  var communityCol = findColumnIndex_(headers, ['CommunityInvestment', 'communityinvestment']);
  var mediaProfileCol = findColumnIndex_(headers, ['MediaProfile', 'mediaprofile']);

  // Build per-team latest state by scanning all rows
  var teamState = {};

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var cycle = cycleCol !== -1 ? parseInt(row[cycleCol], 10) : 0;
    if (isNaN(cycle) || cycle === 0) continue;
    if (currentCycle > 0 && cycle > currentCycle) continue;

    var team = teamsCol !== -1 ? normalizeOaklandFeedTeam_(row[teamsCol]) : '';
    if (!team) continue;

    if (!teamState[team]) {
      teamState[team] = {
        record: '', seasonType: '', streak: '', trigger: '', neighborhood: '',
        playerMood: '', fanSentiment: '', franchiseStability: '',
        economicFootprint: '', communityInvestment: '', mediaProfile: '',
        cycle: 0
      };
    }

    var ts = teamState[team];

    // Update from newer or same-cycle entries (later rows win for same cycle)
    // Convention: last entry per cycle is the "season-state" row
    if (cycle >= ts.cycle) {
      var record = recordCol !== -1 ? (row[recordCol] || '').toString().trim() : '';
      var seasonType = seasonTypeCol !== -1 ? (row[seasonTypeCol] || '').toString().trim() : '';
      var streak = streakCol !== -1 ? (row[streakCol] || '').toString().trim() : '';
      var trigger = triggerCol !== -1 ? (row[triggerCol] || '').toString().trim() : '';
      var neighborhood = neighborhoodCol !== -1 ? (row[neighborhoodCol] || '').toString().trim() : '';
      var playerMood = playerMoodCol !== -1 ? (row[playerMoodCol] || '').toString().trim() : '';
      var fanSentiment = fanSentimentCol !== -1 ? (row[fanSentimentCol] || '').toString().trim() : '';
      var franchise = franchiseCol !== -1 ? (row[franchiseCol] || '').toString().trim() : '';
      var economic = economicCol !== -1 ? (row[economicCol] || '').toString().trim() : '';
      var community = communityCol !== -1 ? (row[communityCol] || '').toString().trim() : '';
      var mediaProfile = mediaProfileCol !== -1 ? (row[mediaProfileCol] || '').toString().trim() : '';

      // Only overwrite with non-empty values (preserves earlier data if latest row is blank)
      if (record) ts.record = record;
      if (seasonType) ts.seasonType = seasonType;
      if (streak) ts.streak = streak;
      if (trigger) ts.trigger = trigger;
      if (neighborhood) ts.neighborhood = neighborhood;
      if (playerMood) ts.playerMood = playerMood;
      if (fanSentiment) ts.fanSentiment = fanSentiment;
      if (franchise) ts.franchiseStability = franchise;
      if (economic) ts.economicFootprint = economic;
      if (community) ts.communityInvestment = community;
      if (mediaProfile) ts.mediaProfile = mediaProfile;
      ts.cycle = cycle;
    }
  }

  // Calculate sentiment and triggers for each team
  var totalSentiment = 0;
  var triggers = [];
  var neighborhoodEffects = {};

  for (var teamName in teamState) {
    var state = teamState[teamName];

    // engine.75 (S328, Mike-direct): only teams with a row in the CURRENT
    // cycle speak. The carry-forward state map never aged teams out, so
    // "NBA" (legacy label, last row C92, pre-Oaks branding — one row with a
    // date string in the record column) kept injecting sentiment at its
    // stale playoffs x2 multiplier and firing phantom breaking-news
    // triggers every cycle for 10+ cycles.
    if (currentCycle > 0 && state.cycle !== currentCycle) continue;

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

    // 4. FanSentiment modifier (v3.0)
    var fanMod = parseFanSentiment_(state.fanSentiment);

    // 5. MediaProfile scale (v3.0) — national coverage amplifies everything
    var mediaScale = parseMediaProfile_(state.mediaProfile);

    // Calculate and clamp (-0.10 to +0.10 per team, widened for new inputs)
    var teamSentiment = (baseSentiment + streakBonus + fanMod) * seasonMultiplier * mediaScale;
    teamSentiment = Math.max(-0.10, Math.min(0.10, teamSentiment));
    totalSentiment += teamSentiment;

    Logger.log('Sports sentiment: ' + teamName + ' = ' + teamSentiment.toFixed(3) +
      ' (record: ' + state.record + ', season: ' + state.seasonType +
      ', streak: ' + state.streak + ', fan: ' + state.fanSentiment +
      ', media: ' + state.mediaProfile + ')');

    // Process trigger (use manual if set, otherwise infer from state)
    var triggerValue = (state.trigger || '').toLowerCase();
    if (!triggerValue) {
      triggerValue = inferFeedTrigger_(state);
    }

    // PlayerMood triggers (v3.0) — frustrated/electric players generate story hooks
    if (state.playerMood) {
      var mood = state.playerMood.toLowerCase();
      if (mood === 'frustrated' || mood === 'angry') {
        triggers.push({
          team: teamName, trigger: 'player-frustration',
          neighborhood: state.neighborhood || 'Downtown',
          streak: state.streak, sentiment: teamSentiment,
          playerMood: state.playerMood
        });
      } else if (mood === 'electric' || mood === 'confident') {
        triggers.push({
          team: teamName, trigger: 'player-energy',
          neighborhood: state.neighborhood || 'Downtown',
          streak: state.streak, sentiment: teamSentiment,
          playerMood: state.playerMood
        });
      }
    }

    if (triggerValue && triggerValue !== 'none') {
      triggers.push({
        team: teamName,
        trigger: triggerValue,
        neighborhood: state.neighborhood || 'Downtown',
        streak: state.streak,
        sentiment: teamSentiment,
        playerMood: state.playerMood || ''
      });
      Logger.log('Sports trigger: ' + teamName + ' -> ' + triggerValue +
        ' @ ' + (state.neighborhood || 'Downtown'));
    }

    // Neighborhood effects (game day impacts + new columns)
    if (state.neighborhood) {
      if (!neighborhoodEffects[state.neighborhood]) {
        neighborhoodEffects[state.neighborhood] = {
          traffic: 0, retail: 0, nightlife: 0, communityEngagement: 0
        };
      }
      var ne = neighborhoodEffects[state.neighborhood];

      // Base game day effects (existing)
      var fanBoost = 1 + Math.max(0, teamSentiment * 2);
      ne.traffic += 0.15 * fanBoost;
      ne.retail += 0.10 * fanBoost;
      ne.nightlife += 0.12 * fanBoost;

      // FanSentiment → nightlife + retail (v3.0)
      // electric = big boost, frustrated = dampens nightlife
      ne.nightlife += fanMod * 0.5;
      ne.retail += fanMod * 0.3;

      // EconomicFootprint → retail + traffic (v3.0)
      var econMod = parseEconomicFootprint_(state.economicFootprint);
      ne.retail += econMod * 0.15;
      ne.traffic += econMod * 0.10;

      // CommunityInvestment → communityEngagement (v3.0)
      var commMod = parseCommunityInvestment_(state.communityInvestment);
      ne.communityEngagement += commMod * 0.15;

      // FranchiseStability → economic caution signal (v3.0)
      var stabMod = parseFranchiseStability_(state.franchiseStability);
      ne.retail += stabMod * 0.10;
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
      target[hood] = { traffic: 0, retail: 0, nightlife: 0, communityEngagement: 0 };
    }
    target[hood].traffic += source[hood].traffic || 0;
    target[hood].retail += source[hood].retail || 0;
    target[hood].nightlife += source[hood].nightlife || 0;
    target[hood].communityEngagement += source[hood].communityEngagement || 0;
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
 * Parse FanSentiment string to sentiment modifier.
 * electric/high → positive boost, frustrated/low → negative
 */
function parseFanSentiment_(val) {
  if (!val) return 0;
  var v = val.toLowerCase();
  if (v === 'electric' || v === 'euphoric') return 0.02;
  if (v === 'high' || v === 'confident' || v === 'excited') return 0.01;
  if (v === 'frustrated' || v === 'angry' || v === 'hostile') return -0.02;
  if (v === 'low' || v === 'apathetic' || v === 'disappointed') return -0.01;
  if (v === 'uncertain' || v === 'anxious') return -0.005;
  return 0; // neutral, moderate, etc.
}

/**
 * Parse MediaProfile to scale multiplier.
 * national → 1.5x, regional → 1.0x, local → 0.8x
 */
function parseMediaProfile_(val) {
  if (!val) return 1.0;
  var v = val.toLowerCase();
  if (v === 'national' || v === 'international') return 1.5;
  if (v === 'regional') return 1.0;
  if (v === 'local') return 0.8;
  return 1.0;
}

/**
 * Parse EconomicFootprint to modifier.
 * growing → positive, shrinking → negative
 */
function parseEconomicFootprint_(val) {
  if (!val) return 0;
  var v = val.toLowerCase();
  if (v === 'growing' || v === 'booming') return 1.0;
  if (v === 'stable' || v === 'steady') return 0.3;
  if (v === 'shrinking' || v === 'declining') return -1.0;
  if (v === 'uncertain') return -0.3;
  return 0;
}

/**
 * Parse CommunityInvestment to modifier.
 * active → positive boost to engagement
 */
function parseCommunityInvestment_(val) {
  if (!val) return 0;
  var v = val.toLowerCase();
  if (v === 'active' || v === 'strong' || v === 'heavy') return 1.0;
  if (v === 'moderate' || v === 'growing') return 0.5;
  if (v === 'passive' || v === 'minimal' || v === 'declining') return -0.5;
  if (v === 'none' || v === 'absent') return -1.0;
  return 0;
}

/**
 * Parse FranchiseStability to modifier.
 * stable → confidence, uncertain → caution
 */
function parseFranchiseStability_(val) {
  if (!val) return 0;
  var v = val.toLowerCase();
  if (v === 'stable' || v === 'strong') return 0.5;
  if (v === 'growing') return 0.3;
  if (v === 'uncertain' || v === 'unstable') return -0.5;
  if (v === 'crisis' || v === 'relocating') return -1.0;
  return 0;
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
 * S.sportsSeason values (S302 semantics):
 * - From World_Config override (sportsState_Oakland) ONLY: spring-training /
 *   early-season / mid-season / late-season / playoffs / championship /
 *   off-season — Maker-declared canon, licenses sports atmosphere
 *   (S.sportsAtmosphereEnabled = true).
 * - Feed mode / empty feed: ALWAYS "off-season" (sentinel — keeps ~40
 *   downstream playoff/championship/!== off-season branches inert).
 *   The feed's own SeasonType label lives on S.sportsFeedSeasonType.
 *   Real game content flows via S.sportsFeedEntries + applySportsFeedTriggers_.
 *
 * TeamsUsed values (Oakland_Sports_Feed):
 * - A's              : Oakland A's baseball
 * - Oaks             : Oakland Oaks basketball
 * - NBA / Warriors   : legacy read aliases for Oaks; never write new rows with them
 * - NFL / free text  : historical read compatibility only; not a new-write value
 *
 * ============================================================================
 */
