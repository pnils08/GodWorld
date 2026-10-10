/**
 * ============================================================================
 * applyCityDynamics_ v4.0 (ES5) — mood per hood (engine.214)
 * ============================================================================
 *
 * v4.0 (engine.214, 2026-10-10 — builder's ruling: "mood should be per hood …
 * some creative algorithm can make that become the city wide figure"):
 * - The five dynamics clusters, their World_Config anchor rows, their hand
 *   weights and the cluster adjacency are GONE. No hood is named in
 *   this file; nothing in World_Config names a hood for this engine.
 * - Every hood's base is its own authored Neighborhood_Map row — the
 *   INSTITUTIONS seed, the permanent referent: EmployerCharacter (one
 *   label-keyed table, HOOD_CHARACTER_BY_EMPLOYER), BoomIndex (retail/tourism
 *   warmth), WeatherZone (fronts), Scenes (calendar), Adjacent (bleed).
 *   The live columns A–O this engine's output writes (NightlifeProfile,
 *   RetailVitality, EventAttractiveness, Sentiment) are never read as a base.
 *   One stated exception: a hood with no carried dynamics bootstraps its own
 *   prior mood from last Cycle's persisted Sentiment (first-carry only).
 * - Live inputs apply once, per hood: demographics on the hood's own ratios,
 *   economy on the hood's own mood vs the hood median, one crime ladder on the
 *   hood's own prev-Cycle spikes (with the Ripple_Ledger receipt), seeds on
 *   the hood's own weight against the ACTIVE hood median.
 * - Three passes, not one loop: A (base → … → microclimate) per hood; peaks
 *   across hoods → capacity friction × the hood's capacitySensitivity, then
 *   momentum (B); ONE simultaneous sentiment bleed over the Adjacent graph;
 *   then fold → commute → clamp (C). Bleed runs BEFORE the initiative /
 *   approval fold so a same-Cycle targeted delta lands at full strength on its
 *   hood (the engine.93 placement, preserved).
 * - The city figure is the equal mean of every canon hood's FINAL value, every
 *   metric, then city momentum as before. The initiative city scalar add
 *   (S.initiativeImplementationEffects.sentimentBoost) is retired: its local
 *   bus lands on the target hoods through the fold and reaches the city
 *   through the mean — one city path per cause. The sports, edition and media
 *   adds stay (no hood path). There is no approval city scalar to retire.
 * - Failure policy: an EmployerCharacter label or WeatherZone with no row in
 *   this file throws (Engine_Errors, no dynamics that Cycle), never a silent
 *   default — changing a hood's character is a sheet edit, a NEW label is new
 *   logic. Canon not seeded (Phase1-CanonHoods did not run) throws the same way.
 *
 * Preserved output schema:
 * - S.cityDynamics: traffic, retail, tourism, nightlife, publicSpaces, sentiment,
 *   culturalActivity, communityEngagement
 * - S.neighborhoodDynamics[hood]: the same eight metrics, every canon hood
 * - S.cityDynamicsLag, S.cityDynamicsCapacity, S.activityObservations,
 *   S.storySeedSignals (byHood / byDomainHood replace byCluster / byDomainCluster)
 *
 * Earlier history (kept for the trail): v3.2 S216 engine.13 edition sentiment
 * fold; v3.1 S202 edition neighborhood effects; v3.0 prev-media feedback;
 * v2.6 clusters + weather v3.5 + calendar seeds + lag + capacity + ripples.
 * ============================================================================
 */

// engine.214 D2: ONE hand table, keyed by the sheet's EmployerCharacter
// vocabulary (Neighborhood_Map, 17 labels on the live sheet 2026-10-10), never
// by hood. Seven multipliers in the 0.80–1.25 range the old cluster weights
// used, plus capacitySensitivity (0.6–1.4; institutional / nightlife / campus /
// stadium / arts feel congestion most, residential / village-retail least).
// The old applyLocalPlaceBias_ statics are folded in (the same character
// stated twice before). This is the engine's reading of the authored label:
// a hood changes character by a sheet edit; a label with no row throws.
var HOOD_CHARACTER_BY_EMPLOYER = {
  'institutional':  { traffic: 1.22, retail: 1.12, tourism: 1.10, nightlife: 1.25, publicSpaces: 1.05, culturalActivity: 1.20, communityEngagement: 1.00, capacitySensitivity: 1.4 },
  'nightlife':      { traffic: 1.10, retail: 1.00, tourism: 1.15, nightlife: 1.25, publicSpaces: 1.00, culturalActivity: 1.15, communityEngagement: 1.00, capacitySensitivity: 1.3 },
  'arts':           { traffic: 1.05, retail: 1.05, tourism: 1.05, nightlife: 1.15, publicSpaces: 1.05, culturalActivity: 1.25, communityEngagement: 1.10, capacitySensitivity: 1.2 },
  'stadium':        { traffic: 1.15, retail: 0.95, tourism: 1.25, nightlife: 1.15, publicSpaces: 1.05, culturalActivity: 1.00, communityEngagement: 1.05, capacitySensitivity: 1.3 },
  'campus':         { traffic: 1.05, retail: 0.95, tourism: 1.10, nightlife: 1.05, publicSpaces: 1.05, culturalActivity: 1.10, communityEngagement: 1.10, capacitySensitivity: 1.1 },
  'transit-retail': { traffic: 1.15, retail: 1.10, tourism: 0.90, nightlife: 0.95, publicSpaces: 1.00, culturalActivity: 1.08, communityEngagement: 1.15, capacitySensitivity: 1.0 },
  'retail':         { traffic: 1.00, retail: 1.15, tourism: 1.05, nightlife: 1.00, publicSpaces: 1.15, culturalActivity: 1.05, communityEngagement: 1.08, capacitySensitivity: 0.9 },
  'family-retail':  { traffic: 1.05, retail: 1.12, tourism: 1.10, nightlife: 0.95, publicSpaces: 1.05, culturalActivity: 1.15, communityEngagement: 1.10, capacitySensitivity: 1.1 },
  'village-retail': { traffic: 0.90, retail: 1.05, tourism: 0.85, nightlife: 0.90, publicSpaces: 1.00, culturalActivity: 1.00, communityEngagement: 1.12, capacitySensitivity: 0.6 },
  'schools-retail': { traffic: 0.95, retail: 1.00, tourism: 0.80, nightlife: 0.85, publicSpaces: 1.00, culturalActivity: 1.00, communityEngagement: 1.15, capacitySensitivity: 0.7 },
  'professional':   { traffic: 0.95, retail: 1.15, tourism: 0.95, nightlife: 1.05, publicSpaces: 1.05, culturalActivity: 1.08, communityEngagement: 1.05, capacitySensitivity: 0.8 },
  'medical':        { traffic: 1.00, retail: 1.05, tourism: 0.90, nightlife: 0.95, publicSpaces: 1.10, culturalActivity: 1.00, communityEngagement: 1.05, capacitySensitivity: 0.8 },
  'clinic':         { traffic: 0.95, retail: 1.10, tourism: 0.95, nightlife: 1.05, publicSpaces: 1.08, culturalActivity: 1.12, communityEngagement: 1.05, capacitySensitivity: 0.8 },
  'residential':    { traffic: 0.95, retail: 0.95, tourism: 0.95, nightlife: 0.90, publicSpaces: 1.15, culturalActivity: 1.00, communityEngagement: 1.08, capacitySensitivity: 0.7 },
  'mixed':          { traffic: 1.00, retail: 1.00, tourism: 1.00, nightlife: 1.00, publicSpaces: 1.10, culturalActivity: 1.05, communityEngagement: 1.08, capacitySensitivity: 0.9 },
  'service-labor':  { traffic: 1.05, retail: 0.95, tourism: 0.80, nightlife: 0.90, publicSpaces: 0.95, culturalActivity: 1.00, communityEngagement: 1.12, capacitySensitivity: 0.8 },
  'construction':   { traffic: 1.05, retail: 0.90, tourism: 0.80, nightlife: 0.85, publicSpaces: 0.95, culturalActivity: 1.05, communityEngagement: 1.15, capacitySensitivity: 0.6 }
};

// engine.214 D4: the WeatherZone vocabulary this file keys fronts by (the ten
// zones on the live sheet 2026-10-10). A zone off this list throws, the same
// wall as an unknown character label.
var HOOD_WEATHER_ZONES = ['urban-core', 'urban-corridor', 'moderate', 'waterfront', 'bay-fog', 'lake', 'inland', 'valley', 'hills', 'piedmont-edge'];

/**
 * engine.214: one hood's authored seed, read once per Cycle from what Phase 1
 * (loadCanonNeighborhoods_) and Phase 2 (loadNeighborhoodState_, runs right
 * before this) already loaded. Throws on a blank label, a label with no row,
 * a zone off the list, or canon not seeded — never defaults.
 * Returns { hood, character, boomIndex, zone, scenes }.
 */
function hoodProfile_(ctx, hood) {
  var S = ctx && ctx.summary;
  var state = S && S.neighborhoodState && S.neighborhoodState[hood];
  if (!state) {
    throw new Error('engine.214: no Neighborhood_Map row loaded for "' + hood + '" (Phase2-NeighborhoodState) — every canon hood needs its authored row');
  }
  var character = (state.employerCharacter || '').toString().trim().toLowerCase();
  if (!character) {
    throw new Error('engine.214: Neighborhood_Map.EmployerCharacter is blank for "' + hood + '" — author the cell');
  }
  if (!HOOD_CHARACTER_BY_EMPLOYER[character]) {
    throw new Error('engine.214: Neighborhood_Map.EmployerCharacter "' + character + '" (' + hood + ') has no row in HOOD_CHARACTER_BY_EMPLOYER — a new label is new logic');
  }
  var zone = getHoodWeatherZone_(ctx, hood).toString().trim().toLowerCase();
  if (HOOD_WEATHER_ZONES.indexOf(zone) < 0) {
    throw new Error('engine.214: Neighborhood_Map.WeatherZone "' + zone + '" (' + hood + ') is not a zone this engine keys fronts by');
  }
  var boom = Number(state.boomIndex);
  return {
    hood: hood,
    character: character,
    boomIndex: isFinite(boom) ? boom : 0,   // blank BoomIndex = no boom seed (membership absence is design)
    zone: zone,
    scenes: getHoodScenes_(ctx, hood) || {}
  };
}

/** engine.214 D2 + D3: the hood's base multipliers from its label row and BoomIndex. */
function hoodCharacterBase_(profile) {
  var row = HOOD_CHARACTER_BY_EMPLOYER[profile.character];
  if (!row) throw new Error('engine.214: no character row for "' + profile.character + '"');
  var b = Number(profile.boomIndex) || 0;
  return {
    traffic: row.traffic,
    retail: row.retail * (1 + 0.10 * b),
    tourism: row.tourism * (1 + 0.10 * b),
    nightlife: row.nightlife,
    publicSpaces: row.publicSpaces,
    culturalActivity: row.culturalActivity,
    communityEngagement: row.communityEngagement,
    capacitySensitivity: row.capacitySensitivity
  };
}

function applyCityDynamics_(ctx) {
  if (!ctx) {
    Logger.log('applyCityDynamics_: Missing ctx object');
    return;
  }
  if (!ctx.summary) ctx.summary = {};
  if (!ctx.config) ctx.config = {};

  var S = ctx.summary;

  // ─────────────────────────────────────────────────────────────────────────
  // INPUTS
  // ─────────────────────────────────────────────────────────────────────────
  var season = S.season || 'Spring';
  var holiday = S.holiday || 'none';
  var holidayPriority = S.holidayPriority || 'none';
  var weather = S.weather || { type: 'clear', impact: 1 };
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;

  // Sports: allow optional manual override
  var ss = S.sportsSeason || 'off-season';
  var manual = ctx.config.manualDynamicsInputs || S.manualDynamicsInputs || {};
  if (manual && manual.sportsSeasonOverride) ss = String(manual.sportsSeasonOverride);

  // Weather v3.5+ additive fields (safe if absent)
  var precipIntensity = (weather.precipitationIntensity === 0 || weather.precipitationIntensity)
    ? Number(weather.precipitationIntensity) : 0;
  var precipType = weather.precipitationType
    || (weather.type === 'rain' ? 'rain' : (weather.type === 'snow' ? 'snow' : 'none'));
  var windSpeed = (weather.windSpeed === 0 || weather.windSpeed) ? Number(weather.windSpeed) : 5;
  var visibility = (weather.visibility === 0 || weather.visibility) ? Number(weather.visibility) : 10;

  // Demographics (optional)
  var neighborhoodDemographics = S.neighborhoodDemographics || {};
  if (typeof getNeighborhoodDemographics_ === 'function' && Object.keys(neighborhoodDemographics).length === 0) {
    neighborhoodDemographics = getNeighborhoodDemographics_(ctx.ss);
    S.neighborhoodDemographics = neighborhoodDemographics;
  }

  // Neighborhood economies (optional)
  var neighborhoodEconomies = S.neighborhoodEconomies || {};
  // engine.225: every hood-economy consumer in this file prices a hood against the hoods' OWN
  // median, not an absolute bar. Hood moods sit within ±3 of the city (54–57 round 55.83 on the
  // engine.219 bench; the city has lived 48–59), so the old ≥60/≥70/≤40/≤30 bars could only fire
  // when the whole city moved — a city gate wearing a hood's clothes (§15). With 17 of 22 hoods
  // at the city value the median IS that value, so only a rippled hood carries a delta — the
  // engine.212 self-relative shape. null = nothing carried yet (first fire): no relative term.
  var hoodMoodMedian = hoodMoodMedian_(neighborhoodEconomies);

  // Observations (optional)
  var worldEvents = S.worldEvents || [];
  var storySeeds = S.storySeeds || [];
  var eventsGenerated = Number(S.eventsGenerated || 0);
  // engine.45 T3b: crime inputs had no writer anywhere (trace K gap G1) — the
  // crime branches below ran on zero every cycle. Source is now the previous
  // cycle's Crime_Metrics increase-shifts, carried via the T2 snapshot
  // (finalizeCycleState compactCrimeSpikes_). Prev-cycle is the honest grain:
  // this runs at Phase 2, updateCrimeMetrics computes at Phase 3. The direct
  // S.crimeSpikes/S.crimeByNeighborhood reads stay first so a future same-cycle
  // writer would win over the carried state.
  var prevCrimeSpikes = (S.previousCycleState && Array.isArray(S.previousCycleState.crimeSpikes))
    ? S.previousCycleState.crimeSpikes : [];
  var crimeSpikes = S.crimeSpikes || S.crimeEvents || prevCrimeSpikes;
  var mediaCoverage = S.mediaCoverage || S.mediaCount || 0;

  // Crime by neighborhood (the per-hood ladder)
  var crimeByNeighborhood = S.crimeByNeighborhood;
  if (!crimeByNeighborhood || Object.keys(crimeByNeighborhood).length === 0) {
    crimeByNeighborhood = {};
    for (var pci = 0; pci < prevCrimeSpikes.length; pci++) {
      var pcHood = prevCrimeSpikes[pci] && prevCrimeSpikes[pci].neighborhood;
      if (pcHood) crimeByNeighborhood[pcHood] = (crimeByNeighborhood[pcHood] || 0) + 1;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS (ES5)
  // ─────────────────────────────────────────────────────────────────────────
  var round2 = function(n) { return Math.round(n * 100) / 100; };
  var clamp = function(n, min, max) { return Math.max(min, Math.min(max, n)); };
  var clampMult = function(n) { return clamp(n, 0.3, 3.0); };
  var clampSent = function(n) { return clamp(n, -1, 1); };

  function copyObj_(o) {
    return JSON.parse(JSON.stringify(o || {}));
  }

  function safeNum_(x, d) {
    var n = Number(x);
    return isFinite(n) ? n : d;
  }

  function blend(prev, cur, m) {
    if (prev === null || prev === undefined || isNaN(prev)) return cur;
    return (prev * m) + (cur * (1 - m));
  }

  function getMomentumFactor(metric, S) {
    var m = 0.65;
    var shockFlag = (S.shockFlag || 'none').toString();
    var inShock = (shockFlag === 'shock-flag' || shockFlag === 'shock-fading' || shockFlag === 'shock-chronic');

    if (metric === 'sentiment') m = 0.50;
    else if (metric === 'nightlife') m = 0.60;
    else if (metric === 'publicSpaces') m = 0.65;
    else if (metric === 'traffic') m = 0.70;
    else if (metric === 'retail') m = 0.72;
    else if (metric === 'tourism') m = 0.78;
    else if (metric === 'culturalActivity') m = 0.70;
    else if (metric === 'communityEngagement') m = 0.73;

    if (inShock) m = Math.max(0.40, m - 0.15);
    return m;
  }

  function normalizeSportsPhase_(s) {
    s = String(s || '').toLowerCase();
    if (s === 'championship' || s === 'finals') return 'finals';
    if (s === 'playoffs' || s === 'post-season' || s === 'postseason') return 'postseason';
    if (s === 'late-season') return 'late-season';
    if (s === 'mid-season') return 'mid-season';
    if (s === 'early-season' || s === 'regular-season') return 'in-season';
    if (s === 'spring-training' || s === 'preseason') return 'preseason';
    return 'off-season';
  }

  function makeMetrics_() {
    return {
      traffic: 1,
      retail: 1,
      tourism: 1,
      nightlife: 1,
      publicSpaces: 1,
      sentiment: 0,
      culturalActivity: 1,
      communityEngagement: 1
    };
  }

  var METRIC_KEYS = ['traffic', 'retail', 'tourism', 'nightlife', 'publicSpaces', 'sentiment', 'culturalActivity', 'communityEngagement'];

  function clampMetrics_(m) {
    m.traffic = clampMult(m.traffic);
    m.retail = clampMult(m.retail);
    m.tourism = clampMult(m.tourism);
    m.nightlife = clampMult(m.nightlife);
    m.publicSpaces = clampMult(m.publicSpaces);
    m.sentiment = clampSent(m.sentiment);
    m.culturalActivity = clampMult(m.culturalActivity);
    m.communityEngagement = clampMult(m.communityEngagement);
    return m;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODIFIER FUNCTIONS
  // ─────────────────────────────────────────────────────────────────────────
  // engine.214 D2/D3: the hood's authored base — the character row × BoomIndex.
  function applyHoodCharacterBase_(m, base) {
    m.traffic *= safeNum_(base.traffic, 1);
    m.retail *= safeNum_(base.retail, 1);
    m.tourism *= safeNum_(base.tourism, 1);
    m.nightlife *= safeNum_(base.nightlife, 1);
    m.publicSpaces *= safeNum_(base.publicSpaces, 1);
    m.culturalActivity *= safeNum_(base.culturalActivity, 1);
    m.communityEngagement *= safeNum_(base.communityEngagement, 1);
  }

  // engine.188 (2026-09-10): the four season pushes summed to +0.20 across a
  // 52-cycle year (13 cycles each, exactly even), so the calendar alone paid the
  // city +0.05 of mood every cycle forever. Re-centred to sum to zero: the same
  // seasonal swing, no net annual drift. Winter/Fall are still the low half and
  // Summer still the high one — a year just no longer ends happier than it began
  // for no reason. SIM_DOCTRINE §15.
  function applySeasonModifiers_(m, seasonName) {
    if (seasonName === 'Winter') {
      m.traffic *= 0.8;
      m.tourism *= 0.6;
      m.nightlife *= 0.7;
      m.publicSpaces *= 0.7;
      m.sentiment -= 0.05;   // engine.188 centred; 2026-09-19 season is a shade, not a verdict (was 0.25)
      m.culturalActivity *= 0.9;
      m.communityEngagement *= 0.8;
    } else if (seasonName === 'Spring') {
      m.traffic *= 1.1;
      m.retail *= 1.2;
      m.tourism *= 1.2;
      m.nightlife *= 1.1;
      m.publicSpaces *= 1.1;
      m.sentiment += 0.03;   // engine.188; 2026-09-19 (was 0.15)
      m.culturalActivity *= 1.2;
      m.communityEngagement *= 1.1;
    } else if (seasonName === 'Summer') {
      m.traffic *= 1.4;
      m.retail *= 1.3;
      m.tourism *= 1.6;
      m.nightlife *= 1.4;
      m.publicSpaces *= 1.4;
      m.sentiment += 0.05;   // engine.188; 2026-09-19 (was 0.25)
      m.culturalActivity *= 1.3;
      m.communityEngagement *= 1.2;
    } else if (seasonName === 'Fall') {
      m.retail *= 1.1;
      m.tourism *= 0.9;
      m.publicSpaces *= 0.9;
      m.sentiment -= 0.03;   // engine.188; 2026-09-19 (was 0.15)
      m.culturalActivity *= 1.1;
      m.communityEngagement *= 1.0;
    }
  }

  // 2026-09-19 (builder ruling: "why would weather outweigh major city events? is
  // the weather a CAT crisis?"). Ordinary weather is a shade on the city's mood,
  // never the headline: a foggy winter week used to cost −0.35 (season −0.25, fog
  // −0.10) against at most +0.10 for the A's in the playoffs, and C108 read the
  // city at 0.02 during an ALCS run. Ordinary weather's mood terms now count at
  // WEATHER_MOOD_SCALE; a CATASTROPHE — a salient storm / flood / heat wave from
  // the weather model (S.weatherEvents, the same events engine.229 ripples as
  // disasters) — counts in full plus WEATHER_CAT_MOOD. Traffic / public-space /
  // tourism effects are unchanged: rain still empties the parks.
  // engine.214 D4: a front targets the hood's WeatherZone, not a cluster. The
  // old place-bias weather conditionals (wind / rain / Winter) are here by zone.
  // The realised microclimate (S.neighborhoodWeather, fog on the ground) is a
  // separate line in the per-hood pass: a front is the forecast, fog is the event.
  function applyWeatherModifiers_(m, weather, extra, zone) {
    var WEATHER_MOOD_SCALE = 0.3;
    var WEATHER_CAT_MOOD = 0.15;
    var moodBefore = m.sentiment;
    var catastrophe = !!(extra && extra.catastrophe);
    var t = weather.type || 'clear';
    var impact = safeNum_(weather.impact, 1);
    var front = (weather.front || t || 'CLEAR').toString().toUpperCase();
    zone = String(zone || '').toLowerCase();

    var precipI = safeNum_(extra.precipIntensity, 0);
    var wind = safeNum_(extra.windSpeed, 5);
    var vis = safeNum_(extra.visibility, 10);
    var pType = String(extra.precipType || 'none');
    var seasonName = String(extra.season || '');

    // Base weather type modifiers
    if (t === 'rain' || t === 'fog' || t === 'overcast') {
      m.traffic *= 0.9;
      m.publicSpaces *= (t === 'overcast') ? 0.9 : 0.7;
      m.nightlife *= 0.9;
      m.sentiment -= (t === 'overcast') ? 0.05 : 0.1;
    }
    if (t === 'hot' || t === 'humid') {
      m.publicSpaces *= 1.2;
      m.tourism *= 1.1;
      m.nightlife *= 1.1;
      if (t === 'humid') m.sentiment -= 0.05;
    }
    if (t === 'cold' || t === 'snow') {
      m.publicSpaces *= 0.6;
      m.traffic *= 0.8;
      m.communityEngagement *= 0.9;
      m.sentiment -= 0.1;
    }
    if (t === 'clear' || t === 'mild' || t === 'breeze') {
      m.publicSpaces *= 1.1;
      m.sentiment += 0.1;
    }

    // v3.5 precipitation intensity
    if (pType === 'rain' || pType === 'snow') {
      m.publicSpaces *= (1 - clamp(precipI * 0.4, 0, 0.4));
      m.tourism *= (1 - clamp(precipI * 0.3, 0, 0.3));
      m.traffic *= (1 - clamp(precipI * 0.15, 0, 0.15));
      m.sentiment -= clamp(precipI * 0.12, 0, 0.12);
    }

    // v3.5 wind effects
    if (wind >= 28) {
      m.publicSpaces *= 0.9;
      m.traffic *= 0.95;
      m.nightlife *= 0.95;
      m.sentiment -= 0.05;
    }

    // v3.5 visibility effects
    if (vis <= 3) {
      m.traffic *= 0.92;
      m.tourism *= 0.93;
      m.sentiment -= 0.04;
    }

    // engine.214 D4: weather front by WeatherZone (ripple effect)
    var shoreline = (zone === 'waterfront' || zone === 'bay-fog');
    var lake = (zone === 'lake');
    var inland = (zone === 'inland' || zone === 'valley');
    var high = (zone === 'hills' || zone === 'piedmont-edge');
    if (front === 'MARINE' && shoreline) {
      m.tourism *= 0.92;
      m.publicSpaces *= 0.88;
      m.sentiment -= 0.06;
    }
    if (front === 'MARINE' && lake) {
      m.publicSpaces *= 0.94;
    }
    if (front === 'HEAT' && inland) {
      m.publicSpaces *= 0.92;
      m.sentiment -= 0.04;
    }
    if (front === 'COLD' && high) {
      m.publicSpaces *= 0.9;
      m.traffic *= 0.95;
    }
    // the old place-bias conditionals, by zone (codex 9)
    if (shoreline && (front === 'MARINE' || wind >= 25)) m.tourism *= 0.94;
    if (lake && precipI >= 0.4) m.publicSpaces *= 0.93;
    if (high && seasonName === 'Winter') m.publicSpaces *= 0.96;

    // Severe weather impact
    if (impact >= 1.4) {
      m.publicSpaces *= 0.9;
      m.tourism *= 0.92;
      m.traffic *= 0.95;
    }

    // Mood: ordinary weather shades it; a catastrophe hits it (see note above).
    var weatherMood = m.sentiment - moodBefore;
    m.sentiment = moodBefore + (catastrophe ? weatherMood - WEATHER_CAT_MOOD : weatherMood * WEATHER_MOOD_SCALE);
  }

  // engine.196: the holiday table's sentiment lifts were tuned against the −0.48/cycle
  // tax engine.185 removed; the biggest days pinned 20 of 22 hoods at 1.00.
  // One scale on the holiday-driven sentiment delta — the priority baseline,
  // Creation Day and the named-holiday table, not First Friday — keeps every holiday's rank
  // and brings the top (major +0.1 stacked on +0.4/+0.5) to ~+0.30. Same shape as
  // WEATHER_MOOD_SCALE above.
  // engine.214 D5: the calendar keys on the hood's Scenes tags. First Friday:
  // weight ≥ 3 is the epicenter, 1–2 spillover, 0 the modest citywide lift.
  // Creation Day: the citywide lift plus the extra for any hood with CreationDay > 0.
  function applyHolidayModifiers_(m, holiday, holidayPriority, flags, seasonName, scenes) {
    var HOLIDAY_MOOD_SCALE = 0.6;
    var isFF = !!flags.isFirstFriday;
    var isCD = !!flags.isCreationDay;
    var moodStart = m.sentiment, ffMood = 0;
    scenes = scenes || {};

    // Holiday priority baseline
    if (holidayPriority === 'major') {
      m.publicSpaces *= 1.1;
      m.sentiment += 0.1;
    } else if (holidayPriority === 'cultural') {
      m.culturalActivity *= 1.2;
      m.communityEngagement *= 1.1;
    } else if (holidayPriority === 'oakland') {
      m.communityEngagement *= 1.2;
      m.culturalActivity *= 1.1;
    }

    // First Friday (Scenes.FirstFriday weight)
    var moodPreFF = m.sentiment;
    if (isFF) {
      var ffW = safeNum_(scenes.FirstFriday, 0);
      if (ffW >= 3) {
        // the arts-walk epicenter
        m.nightlife *= 1.5;
        m.culturalActivity *= 1.6;
        m.communityEngagement *= 1.4;
        m.publicSpaces *= 1.3;
        m.retail *= 1.3;
        m.traffic *= 1.3;
        m.sentiment += 0.25;
      } else if (ffW >= 1) {
        // spillover
        m.nightlife *= 1.3;
        m.culturalActivity *= 1.4;
        m.communityEngagement *= 1.2;
        m.retail *= 1.2;
        m.sentiment += 0.15;
      } else {
        // every other hood gets the modest boost
        m.nightlife *= 1.2;
        m.culturalActivity *= 1.25;
        m.communityEngagement *= 1.15;
        m.sentiment += 0.1;
      }
    }

    ffMood = m.sentiment - moodPreFF;

    // Creation Day (citywide, plus the extra where the hood hosts it)
    if (isCD || holiday === 'CreationDay') {
      m.communityEngagement *= 1.3;
      m.culturalActivity *= 1.2;
      m.sentiment += 0.2;
      if (safeNum_(scenes.CreationDay, 0) > 0) {
        m.communityEngagement *= 1.1;
        m.sentiment += 0.05;
      }
    }

    // Major holidays (keep v2.5 values)
    if (holiday === 'NewYear') { m.nightlife *= 1.4; m.publicSpaces *= 1.3; m.retail *= 1.1; m.sentiment += 0.4; }
    if (holiday === 'NewYearsEve') { m.nightlife *= 1.8; m.publicSpaces *= 1.5; m.traffic *= 1.3; m.sentiment += 0.5; }
    if (holiday === 'Easter') { m.communityEngagement *= 1.3; m.retail *= 1.2; m.sentiment += 0.2; }
    if (holiday === 'Halloween') { m.nightlife *= 1.4; m.publicSpaces *= 1.3; m.communityEngagement *= 1.4; m.culturalActivity *= 1.3; m.retail *= 1.2; m.sentiment += 0.3; }
    if (holiday === 'Thanksgiving') { m.traffic *= 1.3; m.retail *= 1.3; m.communityEngagement *= 1.3; m.nightlife *= 0.7; m.sentiment += 0.3; }
    if (holiday === 'Holiday') { m.retail *= 1.5; m.nightlife *= 1.3; m.publicSpaces *= 1.3; m.communityEngagement *= 1.3; m.traffic *= 1.2; m.sentiment += 0.4; }

    // Minor holidays
    if (holiday === 'Valentine') { m.nightlife *= 1.3; m.retail *= 1.3; m.sentiment += 0.2; }
    if (holiday === 'MothersDay' || holiday === 'FathersDay') { m.retail *= 1.3; m.communityEngagement *= 1.1; m.sentiment += 0.1; }
    if (holiday === 'BackToSchool') { m.traffic *= 1.2; m.retail *= 1.4; }

    // Seasonal markers
    if (holiday === 'SpringEquinox' || holiday === 'SummerSolstice') { m.publicSpaces *= 1.1; m.sentiment += 0.1; }
    if (holiday === 'FallEquinox') { m.sentiment -= 0.05; }

    // Winter dampening
    if (seasonName === 'Winter') m.publicSpaces *= 0.97;

    var holidayMood = (m.sentiment - moodStart) - ffMood;
    m.sentiment = moodStart + ffMood + holidayMood * HOLIDAY_MOOD_SCALE;
  }

  function applySportsModifiers_(m, sportsSeasonRaw, hood) {
    var phase = normalizeSportsPhase_(sportsSeasonRaw);

    // Base sports modifiers
    // engine.188 (2026-09-10): the PHASE is a calendar fact, not a result. The
    // city is in some non-off-season phase for most of the year, so a flat
    // +0.10..+0.25 on the calendar alone was an always-on lift — §15's tax
    // wearing a gate's clothes, and the largest single one on the up side.
    // It was also double-counting: how the team is actually DOING already
    // reaches city mood through S.sportsSentimentBoost (record + streak,
    // clamped +/-0.10 per team, folded into sentiment further down this file).
    // The crowd effects are untouched — the bars and the streets still fill up
    // for a mid-season game. What comes off is the mood the calendar was
    // paying regardless of how the season was going. A playoff run stays a
    // thing the whole city feels, because that IS an event.
    // engine.204/205 §2.2: the crowd and the bars follow the RECORD, not the word.
    // Sentiment stays on the phase word below — its magnitude is engine.194's (Task 7).
    if (phase === 'preseason') m.sentiment += 0.02;
    else if (phase === 'in-season') m.sentiment += 0.02;
    else if (phase === 'mid-season') m.sentiment += 0.04;
    else if (phase === 'late-season') m.sentiment += 0.06;
    else if (phase === 'postseason') m.sentiment += 0.20;
    else if (phase === 'finals') m.sentiment += 0.35;

    var city = S.sportsCity || {};
    var intensity = Number(city.intensity) || 0, signedCity = Number(city.signed) || 0, reach = Number(city.reach) || 0;
    if (intensity > 0) {
      // volume, unsigned: games draw people out whatever the score (Q2)
      m.traffic *= 1 + 0.5 * intensity * reach;
      // result, signed: a losing week empties the bars a little (floor 0.8)
      m.nightlife *= Math.max(0.8, 1 + 0.5 * signedCity * reach);
      // the gathering: today's constants as the band payload
      if (city.band === 'top') { m.publicSpaces *= 1.3; m.communityEngagement *= 1.4; }
      else if (city.band === 'high') m.communityEngagement *= 1.2;
    }

    // At the stadium: the hood holding a franchise's venue, by that franchise's home
    // volume (an away week puts nothing at the stadium). engine.214 D6: the lift lands
    // on the venue hood direct and full (S.sportsWeek[f].venue names it); whether
    // adjacent hoods feel a share is an open sim call, not built.
    var weeks = S.sportsWeek || {};
    for (var f in weeks) {
      if (!weeks.hasOwnProperty(f)) continue;
      var x = (Number(weeks[f].unsigned) || 0) * (Number(weeks[f].venueShare) || 0);
      if (!(x > 0)) continue;
      var venue = weeks[f].venue || [];
      if (venue.indexOf(hood) < 0) continue;
      m.traffic *= 1 + 0.15 * x;
      m.nightlife *= 1 + 0.15 * x;
    }
  }

  // engine.193 cut 1: unemployment is a share of ADULTS — the hood writer fills
  // `unemployed` as adults × rate (updateNeighborhoodDemographics.js, engine.135 B2)
  // and World_Population.employmentRate is adult-based. Dividing by the whole
  // population read the rate shrunk ×0.68–0.83 against tiers authored for the
  // rate itself (v2.6). Sickness stays over the whole population.
  function aggregateDemographics_(hoods, neighborhoodDemographics) {
    var totalPop = 0, totalAdults = 0, totalUnemp = 0, totalSick = 0, totalStudents = 0, totalSeniors = 0;
    for (var i = 0; i < hoods.length; i++) {
      var nh = hoods[i];
      var d = neighborhoodDemographics[nh];
      if (!d) continue;
      var pop = (d.students || 0) + (d.adults || 0) + (d.seniors || 0);
      totalPop += pop;
      totalAdults += (d.adults || 0);
      totalUnemp += (d.unemployed || 0);
      totalSick += (d.sick || 0);
      totalStudents += (d.students || 0);
      totalSeniors += (d.seniors || 0);
    }
    if (totalPop <= 0) {
      return { unemploymentRate: 0.08, sicknessRate: 0.05, studentRatio: 0.15, seniorRatio: 0.12, totalPopulation: 0 };
    }
    return {
      unemploymentRate: totalAdults > 0 ? totalUnemp / totalAdults : 0,
      sicknessRate: totalSick / totalPop,
      studentRatio: totalStudents / totalPop,
      seniorRatio: totalSeniors / totalPop,
      totalPopulation: totalPop
    };
  }

  function applyDemographicModifiers_(m, demoAgg) {
    var ur = safeNum_(demoAgg.unemploymentRate, 0);
    var sr = safeNum_(demoAgg.sicknessRate, 0);
    var stud = safeNum_(demoAgg.studentRatio, 0);
    var sen = safeNum_(demoAgg.seniorRatio, 0);

    // Unemployment — engine.185 repricing (2026-09-10). 12%+ joblessness is a
    // depression, not a bad mood; it now weighs like a major holiday does in the
    // other direction. See the header note on severity tiers.
    // engine.188 (2026-09-10): the reward tier read the ORDINARY state as good
    // news. Live range across 22 hoods is 2.19% - 5.92%, median 4.45%, so
    // `< 0.05` was true for 15 of 22 and paid a standing +0.05. Moved below the
    // live median so it marks a hood that is genuinely exceptional. NOTE the
    // two tiers above it fire 0 of 22 at this range — see the engine.185 row.
    // engine.214 (A10): applied per hood on the hood's own rates — at C110
    // unemployment > 0.08 fires Temescal alone, < 0.03 Baylight alone, sickness
    // > 0.06 Chinatown alone; the cluster average hid all three.
    if (ur > 0.12) { m.retail *= 0.92; m.sentiment -= 0.32; }
    else if (ur > 0.08) { m.retail *= 0.96; m.sentiment -= 0.15; }
    else if (ur < 0.03) { m.retail *= 1.05; m.sentiment += 0.05; }

    // Sickness (v2.5 values)
    if (sr > 0.10) {
      m.publicSpaces *= 0.88;
      m.communityEngagement *= 0.90;
      m.nightlife *= 0.92;
      m.sentiment -= 0.30;   // engine.185: an epidemic, priced as one
    } else if (sr > 0.06) {
      m.publicSpaces *= 0.95;
      m.communityEngagement *= 0.96;
      m.sentiment -= 0.12;   // engine.185: a serious outbreak used to cost nothing
    }

    // Youth population (v2.5 values)
    if (stud > 0.25) { m.nightlife *= 1.10; m.culturalActivity *= 1.08; }
    else if (stud > 0.18) { m.nightlife *= 1.05; m.culturalActivity *= 1.04; }

    // Senior population (v2.5 values)
    if (sen > 0.25) { m.communityEngagement *= 1.08; m.publicSpaces *= 1.05; m.nightlife *= 0.95; }
    else if (sen > 0.18) { m.communityEngagement *= 1.04; }
  }

  function applyEconomyLocal_(m, hoodEconomy) {
    if (!hoodEconomy) return;
    var mood = safeNum_(hoodEconomy.mood, 50);
    var desc = String(hoodEconomy.descriptor || 'stable');

    // engine.225: priced by how far this hood sits from the hoods' own median — continuous,
    // capped at the old inner tier's size (retail ±6%, sentiment ±0.05, reached at |delta| 5–6).
    // The old ≥60 "ahead" tier is this term now. delta null/absent = nothing carried: no term.
    var delta = (hoodEconomy.delta === null || hoodEconomy.delta === undefined) ? 0 : clamp(safeNum_(hoodEconomy.delta, 0), -6, 6);
    if (delta !== 0) {
      m.retail *= (1 + 0.01 * delta);
      m.sentiment += clamp(0.01 * delta, -0.05, 0.05);
      if (delta >= 3) m.tourism *= 1.02;
      else if (delta <= -3) m.tourism *= 0.98;
    }

    // Named states stay absolute: a boom or a depression is a state a cause can still put a
    // hood in (a FACTORY_CLOSURE ripple is −20), not a rank.
    if (mood >= 70) { m.retail *= 1.06; m.sentiment += 0.05; m.tourism *= 1.04; }
    else if (mood <= 30) { m.retail *= 0.90; m.sentiment -= 0.30; m.tourism *= 0.93; }  // engine.185: a depression
    else if (mood <= 40) { m.retail *= 0.95; m.sentiment -= 0.12; }

    if (desc === 'thriving') { m.retail *= 1.04; m.culturalActivity *= 1.03; }
    if (desc === 'struggling') { m.retail *= 0.95; m.sentiment -= 0.07; }
  }

  /** engine.225: median of the carried hood moods; null when nothing is carried. */
  function hoodMoodMedian_(econ) {
    var vals = [];
    for (var h in econ) {
      if (!econ.hasOwnProperty(h) || !econ[h] || econ[h].mood === undefined) continue;
      var v = Number(econ[h].mood);
      if (isFinite(v)) vals.push(v);
    }
    if (!vals.length) return null;
    vals.sort(function(a, b) { return a - b; });
    var mid = Math.floor(vals.length / 2);
    return (vals.length % 2) ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  }

  function applyObservedFeedback_(m, obs) {
    var e = safeNum_(obs.events, 0);
    var media = safeNum_(obs.media, 0);
    var crime = safeNum_(obs.crime, 0);
    var seeds = safeNum_(obs.storySeedCount, 0);
    var shocks = safeNum_(obs.shockCount, 0);

    // engine.188 (2026-09-10): the UP side of the same defect engine.185 fixed
    // below. These gates read absolute activity counts that never fall to their
    // floor — worldEvents runs 8-13 and Story_Seed_Deck 28-44 EVERY cycle, and
    // both arrive here as 6-cycle ROLLING AVERAGES, which never dip either. So
    // `e >= 4` and `seeds >= 10` were true 6 of 6 cycles measured: a standing
    // +0.08 that no state could switch off. Now relative to their own baseline
    // on the same bands as crime and shock. A busy city is the ordinary case
    // and costs nothing; a cycle genuinely busier than its own recent past
    // still lifts the mood.
    var eventsNow = safeNum_(obs.eventsNow, e);
    var eX = (e > 0) ? eventsNow / e : 1;
    if (eX >= 1.5) { m.publicSpaces *= 1.08; m.culturalActivity *= 1.06; m.sentiment += 0.05; }
    else if (eX >= 1.25) { m.publicSpaces *= 1.04; m.culturalActivity *= 1.03; }

    var seedsNow = safeNum_(obs.storySeedCountNow, seeds);
    var mediaNow = safeNum_(obs.mediaNow, media);
    var attnX = Math.max((seeds > 0) ? seedsNow / seeds : 1,
                         (media > 0) ? mediaNow / media : 1);
    if (attnX >= 1.5) { m.communityEngagement *= 1.05; m.culturalActivity *= 1.05; m.sentiment += 0.03; }
    else if (attnX >= 1.25) { m.communityEngagement *= 1.03; }

    // engine.185 fix-up (2026-09-10): crime and shock are RELATIVE to their own
    // 6-cycle baseline, priced by how far above it this cycle sits. The absolute
    // `>= 3` / `>= 1` gates were satisfied every cycle (counts never drop below
    // the floor in a city this size), so they were a permanent tax wearing a
    // gate's clothes — and the first repricing pass made that tax 2.5x heavier.
    // At or below baseline is normal activity and costs nothing. This duplicates
    // applyShockMonitor's job as a workaround; once that detector is unstuck
    // (19 of 19 cycles shock-flag) this should read S.shockFlag instead.
    var crimeNow = safeNum_(obs.crimeNow, crime);
    var crimeX = (crime > 0) ? crimeNow / crime : 1;
    if (crimeX >= 1.5) { m.nightlife *= 0.88; m.publicSpaces *= 0.90; m.tourism *= 0.92; m.sentiment -= 0.28; }  // half again the usual: a crime wave
    else if (crimeX >= 1.25) { m.nightlife *= 0.95; m.tourism *= 0.97; m.sentiment -= 0.12; }            // a bad stretch

    var shocksNow = safeNum_(obs.shockCountNow, shocks);
    var shockX = (shocks > 0) ? shocksNow / shocks : 1;
    if (shockX >= 1.5) { m.traffic *= 0.94; m.sentiment -= 0.20; }   // a genuine shock cycle
    else if (shockX >= 1.25) { m.sentiment -= 0.10; }                 // an unusually busy one
  }

  // engine.214 D7: one crime ladder per hood on the hood's own prev-Cycle spike
  // count, carrying every effect the cluster ripple and the hood block had
  // between them (codex 4). Returns the count so the receipt can be written once.
  function applyCrimeLadder_(m, spikes) {
    var n = safeNum_(spikes, 0);
    if (n >= 3) {
      m.nightlife *= 0.90;
      m.tourism *= 0.88;
      m.publicSpaces *= 0.88;
      m.sentiment -= 0.30;   // engine.185: a hood under a crime wave
    } else if (n >= 2) {
      m.nightlife *= 0.90;
      m.tourism *= 0.88;
      m.sentiment -= 0.20;
    } else if (n >= 1) {
      m.nightlife *= 0.96;
      m.sentiment -= 0.06;
    }
    return n;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // THE HOODS (engine.214: the canon list, every hood's authored profile)
  // ─────────────────────────────────────────────────────────────────────────
  var hoods = getCanonNeighborhoods_(ctx);   // throws when Phase1-CanonHoods did not run (ADR-0016)
  var profiles = {};
  var bases = {};
  for (var hp = 0; hp < hoods.length; hp++) {
    profiles[hoods[hp]] = hoodProfile_(ctx, hoods[hp]);
    bases[hoods[hp]] = hoodCharacterBase_(profiles[hoods[hp]]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CAPACITY SYSTEM
  // ─────────────────────────────────────────────────────────────────────────
  var capCfg = ctx.config.cityCapacity || S.cityCapacity || {};
  var capacity = {
    transitCapacity: clamp(safeNum_(capCfg.transitCapacity, 1.0), 0.6, 1.4),
    venueCapacity: clamp(safeNum_(capCfg.venueCapacity, 1.0), 0.6, 1.4),
    roadCapacity: clamp(safeNum_(capCfg.roadCapacity, 1.0), 0.6, 1.4)
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LAG SYSTEM (temporal memory)
  // ─────────────────────────────────────────────────────────────────────────
  if (!S.cityDynamicsLag) {
    S.cityDynamicsLag = {
      tourismDrag: 0,
      publicSpaceDrag: 0,
      nightlifeDrag: 0,
      congestionHangover: 0,
      lastUpdatedCycle: (S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0)
    };
  }
  var lag = S.cityDynamicsLag;

  function updateLag_(lag, weather, extra, holidayPriority) {
    // Decay existing drags
    lag.tourismDrag = clamp(lag.tourismDrag * 0.84, 0, 0.5);
    lag.publicSpaceDrag = clamp(lag.publicSpaceDrag * 0.82, 0, 0.5);
    lag.nightlifeDrag = clamp(lag.nightlifeDrag * 0.84, 0, 0.4);
    lag.congestionHangover = clamp(lag.congestionHangover * 0.82, 0, 0.4);

    var impact = safeNum_(weather.impact, 1);
    var pI = clamp(safeNum_(extra.precipIntensity, 0), 0, 1);
    var wind = safeNum_(extra.windSpeed, 5);
    var vis = safeNum_(extra.visibility, 10);
    var pType = String(extra.precipType || 'none');

    // Calculate disruption from weather
    var disruption = 0;
    if (impact >= 1.4) disruption += 0.10;
    if (pType === 'rain' || pType === 'snow') disruption += 0.12 * pI;
    if (wind >= 30) disruption += 0.08;
    if (vis <= 3) disruption += 0.06;
    if (weather.type === 'fog') disruption += 0.04;

    // Major holidays create congestion hangover
    if (holidayPriority === 'major') lag.congestionHangover = clamp(lag.congestionHangover + 0.08, 0, 0.4);

    // Apply disruption to drags
    if (disruption > 0) {
      lag.tourismDrag = clamp(lag.tourismDrag + disruption * 1.0, 0, 0.5);
      lag.publicSpaceDrag = clamp(lag.publicSpaceDrag + disruption * 0.8, 0, 0.5);
      lag.nightlifeDrag = clamp(lag.nightlifeDrag + disruption * 0.7, 0, 0.4);
    }

    // Good weather accelerates recovery
    if ((weather.type === 'clear' || weather.type === 'mild' || weather.type === 'breeze') && impact <= 1.1) {
      lag.tourismDrag = clamp(lag.tourismDrag - 0.04, 0, 0.5);
      lag.publicSpaceDrag = clamp(lag.publicSpaceDrag - 0.04, 0, 0.5);
      lag.nightlifeDrag = clamp(lag.nightlifeDrag - 0.03, 0, 0.4);
    }
  }

  updateLag_(lag, weather, { precipIntensity: precipIntensity, precipType: precipType, windSpeed: windSpeed, visibility: visibility }, holidayPriority);

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIVITY OBSERVATIONS (rolling history)
  // ─────────────────────────────────────────────────────────────────────────
  if (!S.activityObservations) S.activityObservations = { history: [] };

  // engine.228: nothing has happened yet at Phase 2 — the observation this block used to
  // record here read {0,0,0,0,0} every Cycle (events, seeds, media, crime and world events are
  // all written by Phases 3–8; bench C108 @41 carried exactly that), and the history it sat in
  // was rebuilt from nothing each fire, so every "more than usual?" ratio below read exactly 1.
  // Now Phase 9 takes the observation (compactActivityObservations_) and it carries on its own
  // key; here "now" is last night — the last carried entry — and the baseline is the nights
  // before it. A first fire (nothing carried) still reads this Cycle's empty counts: ratio 1.
  var obsHistAll = S.activityObservations.history;
  var obs = obsHistAll.length ? obsHistAll[obsHistAll.length - 1] : {
    cycle: (S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0),
    events: eventsGenerated,
    storySeedCount: storySeeds.length,
    media: safeNum_(mediaCoverage, 0),
    crime: (crimeSpikes && crimeSpikes.length) ? crimeSpikes.length : safeNum_(crimeSpikes, 0),
    shockCount: worldEvents.length
  };

  function rollingAvg_(key, n) {
    var h = (obsHistAll.length > 1) ? obsHistAll.slice(0, -1) : obsHistAll;
    var start = Math.max(0, h.length - n);
    var sum = 0;
    var count = 0;
    for (var i = start; i < h.length; i++) {
      if (h[i] && h[i][key] !== undefined) { sum += Number(h[i][key]); count++; }
    }
    return count <= 0 ? 0 : (sum / count);
  }

  var obsAvg = {
    events: rollingAvg_('events', 6),
    storySeedCount: rollingAvg_('storySeedCount', 6),
    media: rollingAvg_('media', 6),
    crime: rollingAvg_('crime', 6),
    shockCount: rollingAvg_('shockCount', 6)
  };
  // engine.185 fix-up (2026-09-10): this cycle's raw counts, so the crime and
  // shock gates below can ask "more than usual?" instead of "more than three?".
  // worldEvents.length runs 8-13 EVERY cycle (mostly low-severity texture — a
  // holy day counts), so `shocks >= 3` was true 19 of 19 cycles measured and
  // the line it gates was a flat per-cycle tax, never a shock signal.
  var obsCur = obs;   // engine.228: last night's real counts (or this Cycle's empty ones on a first fire)
  var observedInputs = {
    events: obsAvg.events,
    media: obsAvg.media,
    crime: obsAvg.crime,
    storySeedCount: obsAvg.storySeedCount,
    shockCount: obsAvg.shockCount,
    crimeNow: obsCur.crime,
    shockCountNow: obsCur.shockCount,
    eventsNow: obsCur.events,             // engine.188
    storySeedCountNow: obsCur.storySeedCount,
    mediaNow: obsCur.media
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STORY SEED SIGNALS (hood-aware, calendar-aware) — engine.214 D5/D7
  // ─────────────────────────────────────────────────────────────────────────
  // The calendar keys a seed's hood weight by the hood's own Scenes / label /
  // zone: arts = Scenes has `arts` or EmployerCharacter arts; nightlife =
  // EmployerCharacter nightlife or stadium; public-space = WeatherZone lake; a
  // major holiday's host = the hood whose Scenes carries the holiday's tag.
  // A seed with no hood (or a hood off the map) is citywide: a neutral profile.
  function seedCalendarBoost_(seed, profile) {
    var cc = seed && seed.calendarContext;
    if (!cc) return 0;
    profile = profile || {};
    var scenes = profile.scenes || {};
    var character = String(profile.character || '');
    var zone = String(profile.zone || '');
    var arts = safeNum_(scenes.arts, 0) > 0 || character === 'arts';
    var nightlife = (character === 'nightlife' || character === 'stadium');
    var publicSpace = (zone === 'lake');

    var b = 0;

    if (cc.isFirstFriday) {
      b += arts ? 0.40 : 0.20;
    }
    if (cc.isCreationDay) {
      b += 0.18;
      if (safeNum_(scenes.CreationDay, 0) > 0) b += 0.08;
    }

    var hp = (cc.holidayPriority || '').toString();
    if (hp === 'major') {
      var hostTag = (cc.holiday || '').toString();
      b += (hostTag && safeNum_(scenes[hostTag], 0) > 0) ? 0.22 : 0.12;
      if (publicSpace) b += 0.06;
    } else if (hp === 'cultural' || hp === 'oakland') {
      b += arts ? 0.18 : 0.12;
    }

    var sp = normalizeSportsPhase_(cc.sportsSeason || '');
    if (sp === 'postseason') {
      b += nightlife ? 0.22 : 0.12;
    } else if (sp === 'finals') {
      b += nightlife ? 0.30 : 0.18;
    }

    return b;
  }

  function seedWeight_(seed, profile) {
    var p = safeNum_(seed && seed.priority, 1);
    var w = p;

    var st = (seed && seed.seedType) ? String(seed.seedType) : '';
    if (st === 'holiday' || st === 'firstfriday' || st === 'creationday') w *= 1.15;
    if (st === 'shock' || st === 'event') w *= 1.08;

    // CalendarContext boosts
    var cal = seedCalendarBoost_(seed, profile);
    w *= (1 + clamp(cal, 0, 0.7));

    return w;
  }

  function buildSeedSignals_(storySeeds, profiles) {
    var sig = {
      totalWeighted: 0,
      byHood: {},
      byDomainHood: {},
      citywideWeighted: 0
    };

    for (var hk in profiles) {
      if (!profiles.hasOwnProperty(hk)) continue;
      sig.byHood[hk] = { weighted: 0, count: 0 };
      sig.byDomainHood[hk] = {};
    }

    var citywideProfile = { character: '', zone: '', scenes: {} };
    for (var i = 0; i < storySeeds.length; i++) {
      var s0 = storySeeds[i];
      if (!s0 || !s0.text) continue;

      var nh = s0.neighborhood || '';
      var dom = (s0.domain || 'GENERAL').toString().toUpperCase();

      if (nh && profiles[nh]) {
        var w = seedWeight_(s0, profiles[nh]);
        sig.totalWeighted += w;
        sig.byHood[nh].weighted += w;
        sig.byHood[nh].count += 1;
        if (!sig.byDomainHood[nh][dom]) sig.byDomainHood[nh][dom] = 0;
        sig.byDomainHood[nh][dom] += w;
      } else {
        // citywide, or a hood off the map: lifts every hood through the citywide term
        var w2 = seedWeight_(s0, citywideProfile);
        sig.totalWeighted += w2;
        sig.citywideWeighted += w2;
      }
    }

    return sig;
  }

  // engine.188 (2026-09-10): median of a set of hood/domain weights, so a
  // gate can ask "busier than the rest of the city THIS cycle?" instead of
  // "past a number picked when the deck was smaller". engine.38 B2 / engine.184
  // pattern — a ratio of the cycle's own middle cannot rot when the scale moves.
  function medianOf_(vals) {
    if (!vals || !vals.length) return 0;
    var a = vals.slice().sort(function(x, y) { return x - y; });
    var mid = Math.floor(a.length / 2);
    return (a.length % 2) ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  // engine.214 D7 (codex 3): the median over ACTIVE entries only (weight > 0);
  // null when fewer than 3 are active — a null median means every relative gate
  // reads ratio 1 and nothing fires. 22 hoods with a sparse deck would otherwise
  // put the median at 0 and read every ratio as 1 regardless of weight.
  function seedHoodMedian_(seedSig) {
    var vals = [];
    for (var k in seedSig.byHood) {
      if (!seedSig.byHood.hasOwnProperty(k)) continue;
      var v = safeNum_(seedSig.byHood[k].weighted, 0);
      if (v > 0) vals.push(v);
    }
    return vals.length >= 3 ? medianOf_(vals) : null;
  }

  function seedDomainMedian_(seedSig, domain) {
    var vals = [];
    for (var k in seedSig.byDomainHood) {
      if (!seedSig.byDomainHood.hasOwnProperty(k)) continue;
      var v = safeNum_((seedSig.byDomainHood[k] || {})[domain], 0);
      if (v > 0) vals.push(v);
    }
    return vals.length >= 3 ? medianOf_(vals) : null;
  }

  function applySeedLocalBoost_(m, seedSig, hood) {
    if (!seedSig || !seedSig.byHood || !seedSig.byHood[hood]) return;

    var c = seedSig.byHood[hood];
    var w = safeNum_(c.weighted, 0);

    // engine.188: the absolute ladder fired for 23 of 25 cluster-cycles measured
    // (C102-C106, five clusters) — every cluster in the city collecting a
    // standing lift for having any story activity at all. Against the cycle's
    // own cross-hood median, the boost marks the hood the city is actually
    // looking at, and an ordinary week pays nothing.
    var wMed = seedHoodMedian_(seedSig);
    var wX = (wMed !== null && wMed > 0) ? w / wMed : 1;

    if (wX >= 1.75) {
      m.culturalActivity *= 1.08;
      m.communityEngagement *= 1.04;
      m.sentiment += 0.04;
    } else if (wX >= 1.35) {
      m.culturalActivity *= 1.05;
      m.communityEngagement *= 1.03;
      m.sentiment += 0.02;
    } else if (wX >= 1.15) {
      m.culturalActivity *= 1.03;
      m.communityEngagement *= 1.02;
      m.sentiment += 0.01;
    }

    // Domain-specific boosts
    var doms = seedSig.byDomainHood[hood] || {};
    var wCulture = safeNum_(doms.CULTURE, 0);
    var wComm = safeNum_(doms.COMMUNITY, 0);
    var wBiz = safeNum_(doms.BUSINESS, 0);
    var wNight = safeNum_(doms.NIGHTLIFE, 0);
    var wCivic = safeNum_(doms.CIVIC, 0) + safeNum_(doms.SAFETY, 0);

    if (wCulture >= 6) { m.culturalActivity *= 1.05; m.publicSpaces *= 1.03; }
    else if (wCulture >= 3) { m.culturalActivity *= 1.03; }

    // engine.188: same treatment for the two domain gates that move sentiment.
    // CULTURE / NIGHTLIFE stay absolute — they move no mood, only activity.
    var commX = (function() { var d = seedDomainMedian_(seedSig, 'COMMUNITY'); return (d !== null && d > 0) ? wComm / d : 1; })();
    if (commX >= 1.5) { m.communityEngagement *= 1.05; m.sentiment += 0.03; }
    else if (commX >= 1.25) { m.communityEngagement *= 1.03; }

    var bizX = (function() { var d = seedDomainMedian_(seedSig, 'BUSINESS'); return (d !== null && d > 0) ? wBiz / d : 1; })();
    if (bizX >= 1.5) { m.retail *= 1.04; m.sentiment += 0.02; }
    else if (bizX >= 1.25) { m.retail *= 1.02; }

    if (wNight >= 6) { m.nightlife *= 1.05; m.traffic *= 1.03; }
    else if (wNight >= 3) { m.nightlife *= 1.03; }

    if (wCivic >= 6) { m.sentiment -= 0.04; m.publicSpaces *= 0.98; }
    else if (wCivic >= 3) { m.sentiment -= 0.02; }
  }

  var seedSignals = buildSeedSignals_(storySeeds, profiles);
  S.storySeedSignals = seedSignals;

  // A catastrophe this cycle: a salient storm / flood / heat wave (applyWeatherModel_,
  // Phase2-Weather, runs before this at both entry points).
  var weatherCatastrophe = false;
  var wxEvents = S.weatherEvents || [];
  for (var wxi = 0; wxi < wxEvents.length; wxi++) {
    var wxe = wxEvents[wxi];
    if (wxe && wxe.salient && (wxe.type === 'storm' || wxe.type === 'flood_conditions' || wxe.type === 'heat_wave')) weatherCatastrophe = true;
  }
  var weatherExtra = {
    precipIntensity: precipIntensity,
    precipType: precipType,
    windSpeed: windSpeed,
    visibility: visibility,
    catastrophe: weatherCatastrophe,
    season: season
  };

  // ─────────────────────────────────────────────────────────────────────────
  // PASS A — every hood's raw Cycle value from its own seed and its own inputs
  // (engine.214 Task 5 order: base → season → weather by zone → holiday by
  // Scenes → sports → observed feedback → demographics → economy → crime
  // ladder → seeds → lag drags → microclimate)
  // ─────────────────────────────────────────────────────────────────────────
  var rawHood = {};
  var crimeHoodsAtTwo = [];
  var crimeMaxSpikes = 0;
  var hasDemographics = Object.keys(neighborhoodDemographics).length > 0;

  for (var ai = 0; ai < hoods.length; ai++) {
    var hood = hoods[ai];
    var profile = profiles[hood];
    var m = makeMetrics_();

    applyHoodCharacterBase_(m, bases[hood]);
    applySeasonModifiers_(m, season);
    applyWeatherModifiers_(m, weather, weatherExtra, profile.zone);
    applyHolidayModifiers_(m, holiday, holidayPriority, { isFirstFriday: isFirstFriday, isCreationDay: isCreationDay }, season, profile.scenes);
    applySportsModifiers_(m, ss, hood);

    // Observed feedback (citywide counts, identical for every hood)
    applyObservedFeedback_(m, observedInputs);

    // Demographics on the hood's own ratios (rates are scale-free; thresholds unchanged)
    if (hasDemographics && neighborhoodDemographics[hood]) {
      applyDemographicModifiers_(m, aggregateDemographics_([hood], neighborhoodDemographics));
    }

    // Economy on the hood's own mood vs the hood median (engine.225)
    var he = neighborhoodEconomies[hood];
    if (he && he.mood !== undefined) {
      var hoodMood = safeNum_(he.mood, 50);
      applyEconomyLocal_(m, {
        mood: hoodMood,
        descriptor: describeHoodEconomy_(hoodMood),   // engine.225: the one scale (economicRippleEngine.js)
        delta: (hoodMoodMedian === null) ? null : (hoodMood - hoodMoodMedian)
      });
    }

    // Crime ladder on the hood's own prev-Cycle spikes
    var spikes = applyCrimeLadder_(m, crimeByNeighborhood[hood]);
    if (spikes >= 2) crimeHoodsAtTwo.push(hood);
    if (spikes > crimeMaxSpikes) crimeMaxSpikes = spikes;

    // Story seed boosts (the hood's own weight vs the active hood median)
    applySeedLocalBoost_(m, seedSignals, hood);

    // Lag drags — engine.214 D2 re-keys the two extras: tourism drag for the
    // shoreline zones, nightlife drag for the nightlife / arts labels
    var tourismDrag = lag.tourismDrag;
    var publicDrag = lag.publicSpaceDrag;
    var nightDrag = lag.nightlifeDrag;
    if (profile.zone === 'waterfront' || profile.zone === 'bay-fog') tourismDrag = clamp(tourismDrag + 0.04, 0, 0.5);
    if (profile.character === 'nightlife' || profile.character === 'arts') nightDrag = clamp(nightDrag + 0.03, 0, 0.4);
    m.tourism *= (1 - tourismDrag);
    m.publicSpaces *= (1 - publicDrag);
    m.nightlife *= (1 - nightDrag);

    // Neighborhood microclimate (realised weather on the ground, applyWeatherModel_)
    var nhW = S.neighborhoodWeather && S.neighborhoodWeather[hood];
    if (nhW && nhW.type) {
      if (nhW.type === 'fog') { m.tourism *= 0.95; m.traffic *= 0.97; }
      if (nhW.type === 'hot') { m.publicSpaces *= 1.05; }
    }

    rawHood[hood] = clampMetrics_(m);
  }

  // engine.45 T3b / engine.214 D7: the crime→dynamics receipt — one row per
  // Cycle naming the hoods at two or more prev-Cycle spikes, with the spikes
  // themselves as prose (the line lands in a seed row's Why column).
  if (crimeHoodsAtTwo.length) {
    Logger.log('applyCityDynamics_ engine.214: crime ladder at >=2 in ' + crimeHoodsAtTwo.join(', ') +
      ' (max ' + crimeMaxSpikes + ' prev-cycle spike(s))');
    if (typeof recordRipple_ === 'function') {
      recordRipple_(ctx, {
        causeType: 'crime',
        causeId: 'Crime_Metrics.shifts.prev-cycle',
        causeDetail: prevCrimeSpikes.filter(function(sp) {
          return sp && crimeHoodsAtTwo.indexOf(sp.neighborhood) !== -1;
        }).map(function(sp) {
          var metric = String(sp.metric || 'crime').replace(/([A-Z])/g, ' $1').toLowerCase();
          return sp.neighborhood + ' ' + metric.trim() + ' +' + sp.magnitude +
            (sp.newValue !== undefined ? ' (now ' + sp.newValue + ')' : '');
        }).join('; ') || 'prev-cycle crime spike carry',
        effectType: 'nightlife/tourism/publicSpaces/sentiment',
        targetScope: 'neighborhood',
        targetIds: crimeHoodsAtTwo,
        neighborhood: crimeHoodsAtTwo.join('|'),
        magnitude: crimeMaxSpikes,
        duration: 1,
        sourceEngine: 'applyCityDynamics.applyCrimeLadder_'
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CAPACITY CONSTRAINTS (engine.214 D9: peak demand across hoods; friction ×
  // the hood's own capacitySensitivity, applied BEFORE momentum — the hood's
  // own congestion is part of its raw Cycle value, not a post-blend add)
  // ─────────────────────────────────────────────────────────────────────────
  function maxAcrossHoods_(key) {
    var mx = 0;
    for (var k in rawHood) {
      if (!rawHood.hasOwnProperty(k)) continue;
      mx = Math.max(mx, safeNum_(rawHood[k][key], 0));
    }
    return mx;
  }

  var peakTraffic = maxAcrossHoods_('traffic');
  var peakNightlife = maxAcrossHoods_('nightlife');
  var peakTourism = maxAcrossHoods_('tourism');

  var transitDemand = (peakTraffic + peakNightlife) / 2;
  var venueDemand = peakNightlife;
  var roadDemand = peakTraffic;

  var transitCongestion = clamp((transitDemand - capacity.transitCapacity) * 0.38, 0, 0.38);
  var venueCongestion = clamp((venueDemand - capacity.venueCapacity) * 0.32, 0, 0.32);
  var roadCongestion = clamp((roadDemand - capacity.roadCapacity) * 0.32, 0, 0.32);

  if ((transitCongestion + roadCongestion) >= 0.28) {
    lag.congestionHangover = clamp(lag.congestionHangover + 0.08, 0, 0.4);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASS B — capacity friction per hood, then the hood's own momentum
  // ─────────────────────────────────────────────────────────────────────────
  // v3.0: Neighborhood momentum — blend with previous cycle's state
  // S247 FIX (substrate-critical): read S.previousCycleState directly; var
  // hoisting of a later `prevState` once made this undefined on every hood.
  // finalizeCycleState v1.3 snapshots neighborhoodDynamics → previousCycleState,
  // so momentum self-heals from cycle 2.
  var prevNhoodState = (S.previousCycleState || {}).neighborhoodDynamics || {};
  var preBleed = {};

  for (var bi = 0; bi < hoods.length; bi++) {
    var bHood = hoods[bi];
    var nm = rawHood[bHood];

    var sensitivity = safeNum_(bases[bHood].capacitySensitivity, 1.0);
    var cong = (transitCongestion + venueCongestion + roadCongestion + lag.congestionHangover) * sensitivity;
    cong = clamp(cong, 0, 0.6);
    nm.traffic *= (1 - clamp(cong * 0.20, 0, 0.20));
    nm.nightlife *= (1 - clamp(cong * 0.12, 0, 0.12));
    nm.tourism *= (1 - clamp(cong * 0.10, 0, 0.10));
    nm.publicSpaces *= (1 - clamp(cong * 0.08, 0, 0.08));
    nm.sentiment -= clamp(cong * 0.12, 0, 0.12);
    clampMetrics_(nm);

    var prevNhood = prevNhoodState[bHood] || null;
    // 2026-09-19 / engine.214 D1 (the one stated exception): a hood with no
    // carried dynamics carries its mood from last cycle's persisted
    // Neighborhood_Map Sentiment instead of none — a first-carry bootstrap of
    // the hood's OWN prior mood, never a base (bench C108: ten adopted hoods
    // 0.1–0.3 under their neighbours without it). Sentiment only: the sheet's
    // other live columns are on different scales from these multipliers.
    if (!prevNhood && S.neighborhoodState && S.neighborhoodState[bHood] &&
        S.neighborhoodState[bHood].sentiment !== null && isFinite(Number(S.neighborhoodState[bHood].sentiment))) {
      prevNhood = { sentiment: Number(S.neighborhoodState[bHood].sentiment) };
    }
    if (prevNhood) {
      var nhMom = 0.3; // 30% carry-forward from last cycle
      if (prevNhood.sentiment !== undefined) nm.sentiment = nm.sentiment * (1 - nhMom) + prevNhood.sentiment * nhMom;
      if (prevNhood.nightlife !== undefined) nm.nightlife = nm.nightlife * (1 - nhMom) + prevNhood.nightlife * nhMom;
      if (prevNhood.retail !== undefined) nm.retail = nm.retail * (1 - nhMom) + prevNhood.retail * nhMom;
      if (prevNhood.tourism !== undefined) nm.tourism = nm.tourism * (1 - nhMom) + prevNhood.tourism * nhMom;
      if (prevNhood.publicSpaces !== undefined) nm.publicSpaces = nm.publicSpaces * (1 - nhMom) + prevNhood.publicSpaces * nhMom;
      if (prevNhood.communityEngagement !== undefined) nm.communityEngagement = nm.communityEngagement * (1 - nhMom) + prevNhood.communityEngagement * nhMom;
    }

    preBleed[bHood] = nm;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SENTIMENT BLEED (engine.214 D8: one simultaneous pass over the hood graph,
  // Neighborhood_Map.Adjacent — after momentum, BEFORE the initiative /
  // approval fold so a same-Cycle targeted delta lands at full strength)
  // ─────────────────────────────────────────────────────────────────────────
  function applySentimentBleed_(dyn, hoodList) {
    var bleedFactor = 0.12;
    var newSentiments = {};

    for (var i = 0; i < hoodList.length; i++) {
      var h = hoodList[i];
      var baseSent = dyn[h].sentiment;
      var neighbors = getAdjacentHoods_(ctx, h) || [];
      var neighborSum = 0;
      var neighborCount = 0;
      for (var j = 0; j < neighbors.length; j++) {
        var nb = neighbors[j];
        if (dyn[nb]) {
          neighborSum += dyn[nb].sentiment;
          neighborCount++;
        }
      }
      newSentiments[h] = (neighborCount > 0)
        ? baseSent + ((neighborSum / neighborCount) - baseSent) * bleedFactor
        : baseSent;
    }

    for (var h2 in newSentiments) {
      if (newSentiments.hasOwnProperty(h2) && dyn[h2]) dyn[h2].sentiment = clampSent(newSentiments[h2]);
    }
  }

  applySentimentBleed_(preBleed, hoods);

  // engine.93 Task 9: inbound-commuter count at which a hood receives the full
  // daytime lift. Sized against the tracked sample, not real headcount — the
  // ledger is ~1:443, so ~40 tracked inbound workers marks a genuine
  // employment centre (Downtown/Jack London class) rather than a hood with a
  // few commuters.
  var COMMUTE_DAYTIME_FULL_LIFT = 40;

  // ─────────────────────────────────────────────────────────────────────────
  // PER-HOOD POLITICAL CONSEQUENCE FOLD (engine.93 Task 5)
  // ─────────────────────────────────────────────────────────────────────────
  // Two effect buses had ZERO readers until this fold: S.initiativeNeighborhoodEffects
  // (applyInitiativeImplementationEffects) and S.approvalNeighborhoodEffects
  // (updateCivicApprovalRatings). Initiative and approval consequences dissolved
  // into city-wide scalars and never reached the hoods they targeted.
  //
  // Placement is load-bearing: the fold runs AFTER the momentum blend and the
  // bleed stage and BEFORE the clamps, so this cycle's targeted deltas land at
  // full strength (momentum would damp them to 70%, bleed would export 12%)
  // and the existing clampMult/clampSent catch any overflow.
  //
  // Decay rides the existing 30% momentum carry — the buses hold per-cycle
  // deltas, not durable strength, so they carry no decay fields.
  // engine.214 D10: the city sees these deltas through the hood mean — the
  // initiative city scalar add that used to double them is gone.
  var initiativeBus = (S.initiativeNeighborhoodEffects &&
    typeof S.initiativeNeighborhoodEffects === 'object') ? S.initiativeNeighborhoodEffects : {};
  // engine.250: the approval bus is WRITTEN in Phase 5 (updateCivicApprovalRatings_),
  // after this fold has run, and ctx.summary is a fresh literal every Cycle — so the
  // same-Cycle read here was always empty (Ripple_Ledger: 0 approval-fold rows ever).
  // The deltas now ride previousCycleState (finalizeCycleState_) and land one Cycle
  // after the approval shift that caused them: the rating moves, the district feels
  // it the next week. Gated on the blob being EXACTLY one Cycle old (same gate as
  // initiativePhases / approvalHoodMoodEma) — a stale blob would re-apply an old
  // shift. No prior data => empty bus, the conservative direction.
  var foldCycle = Number(S.absoluteCycle || S.cycleId || (ctx.config && ctx.config.cycleCount) || 0);
  var foldPrev = S.previousCycleState || {};
  var approvalBusCycle = Number(foldPrev.cycle) || 0;
  var approvalBus = (approvalBusCycle === foldCycle - 1 && foldPrev.approvalNeighborhoodEffects &&
    typeof foldPrev.approvalNeighborhoodEffects === 'object') ? foldPrev.approvalNeighborhoodEffects : {};
  var foldedInitiativeHoods = [];
  var foldedApprovalHoods = [];
  var foldedInitiativeMag = 0;
  var foldedApprovalMag = 0;

  var FOLD_INITIATIVE_FIELDS = ['traffic', 'retail', 'nightlife',
    'publicSpaces', 'communityEngagement', 'sentiment'];
  var FOLD_APPROVAL_FIELDS = ['sentiment', 'communityEngagement'];

  // engine.93 Task 9: inbound commuters per hood (buildCommuteFlows_, Phase 2).
  // Absent on a cycle where the matrix could not build → the daytime term is
  // simply skipped, never a partial or invented lift.
  var commuteInbound = (S.commuteInbound && typeof S.commuteInbound === 'object')
    ? S.commuteInbound : null;

  // Applies both buses' deltas for one hood onto its metric object, in place.
  // Only finite numbers on own properties are folded — a malformed bus entry is
  // skipped, never NaN-poisoning a hood's state.
  function applyNeighborhoodEffectsFold_(metrics, hood) {
    var iEff = Object.prototype.hasOwnProperty.call(initiativeBus, hood)
      ? initiativeBus[hood] : null;
    if (iEff && typeof iEff === 'object') {
      var iApplied = false;
      for (var fi = 0; fi < FOLD_INITIATIVE_FIELDS.length; fi++) {
        var fkey = FOLD_INITIATIVE_FIELDS[fi];
        var fval = Number(iEff[fkey]);
        if (!isFinite(fval) || fval === 0) continue;
        metrics[fkey] += fval;
        iApplied = true;
        if (Math.abs(fval) > Math.abs(foldedInitiativeMag)) foldedInitiativeMag = fval;
      }
      if (iApplied) foldedInitiativeHoods.push(hood);
    }

    var aEff = Object.prototype.hasOwnProperty.call(approvalBus, hood)
      ? approvalBus[hood] : null;
    if (aEff && typeof aEff === 'object') {
      var aApplied = false;
      for (var aj = 0; aj < FOLD_APPROVAL_FIELDS.length; aj++) {
        var akey = FOLD_APPROVAL_FIELDS[aj];
        var aval = Number(aEff[akey]);
        if (!isFinite(aval) || aval === 0) continue;
        metrics[akey] += aval;
        aApplied = true;
        if (Math.abs(aval) > Math.abs(foldedApprovalMag)) foldedApprovalMag = aval;
      }
      if (aApplied) foldedApprovalHoods.push(hood);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASS C — fold → commute → clamp: the values the readers see
  // ─────────────────────────────────────────────────────────────────────────
  var neighborhoodDynamics = {};

  for (var ci = 0; ci < hoods.length; ci++) {
    var cHood = hoods[ci];
    var cm = preBleed[cHood];

    // engine.93 Task 5: per-hood political consequence — post-momentum,
    // post-bleed, pre-clamp (see the fold block above for why this position).
    applyNeighborhoodEffectsFold_(cm, cHood);

    // engine.93 Task 9: daytime population. A hood full of offices is a
    // different place at 1pm than its resident count suggests — those workers
    // buy lunch and clog the streets. Every metric here was resident-derived
    // until the commute matrix existed. Bounded: +12% retail / +8% traffic at
    // the cap, so an employment centre lifts without running away.
    if (commuteInbound && commuteInbound[cHood]) {
      var inWorkers = Number(commuteInbound[cHood]) || 0;
      if (inWorkers > 0) {
        var dayLift = Math.min(1, inWorkers / COMMUTE_DAYTIME_FULL_LIFT);
        cm.retail *= (1 + dayLift * 0.12);
        cm.traffic *= (1 + dayLift * 0.08);
      }
    }

    neighborhoodDynamics[cHood] = clampMetrics_({
      traffic: cm.traffic,
      retail: cm.retail,
      tourism: cm.tourism,
      nightlife: cm.nightlife,
      publicSpaces: cm.publicSpaces,
      sentiment: cm.sentiment,
      culturalActivity: cm.culturalActivity,
      communityEngagement: cm.communityEngagement
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FOLD ATTRIBUTION (engine.93 Task 5; consume-and-clear removed engine.250)
  // ─────────────────────────────────────────────────────────────────────────
  // Per-initiative and per-approval cause rows already exist at the write sites
  // (engine.45 T3e 'initiative-implementation', T1 'approval-shift'). The fold
  // must NOT re-ledger those — it writes one CONSUMPTION row per bus per cycle
  // naming the hoods that actually received deltas, so the trail reads
  // "this cause fired" → "these hoods lived it".
  if (foldedInitiativeHoods.length && typeof recordRipple_ === 'function') {
    recordRipple_(ctx, {
      causeType: 'neighborhood-fold',
      causeId: 'initiativeNeighborhoodEffects',
      causeDetail: 'Initiative work landed in ' + foldedInitiativeHoods.length +
        ' neighborhood(s): ' + foldedInitiativeHoods.join(', '),
      effectType: 'fold-applied/initiative-implementation',
      targetScope: 'neighborhood',
      targetIds: foldedInitiativeHoods,
      magnitude: foldedInitiativeMag,
      duration: 1,
      sourceEngine: 'applyCityDynamics.foldNeighborhoodEffects'
    });
  }
  if (foldedApprovalHoods.length && typeof recordRipple_ === 'function') {
    recordRipple_(ctx, {
      causeType: 'neighborhood-fold',
      causeId: 'approvalNeighborhoodEffects',
      causeDetail: 'Cycle ' + approvalBusCycle + ' shifts in how residents rate their officials reached ' +
        foldedApprovalHoods.length + ' neighborhood(s): ' + foldedApprovalHoods.join(', '),
      effectType: 'fold-applied/approval-shift',
      targetScope: 'neighborhood',
      targetIds: foldedApprovalHoods,
      magnitude: foldedApprovalMag,
      duration: 1,
      sourceEngine: 'applyCityDynamics.foldNeighborhoodEffects'
    });
  }

  // engine.250: NO clear. ctx.summary is rebuilt every Cycle (godWorldEngine2.js),
  // so neither bus can accumulate — the old consume-and-clear guarded a state that
  // cannot occur, and it emptied the initiative bus in Phase 2 before its Phase-3
  // (driftNeighborhoodEducation_) and Phase-5 (applyBusinessDynamics_) readers ran.
  // The initiative bus now lives the whole Cycle; the approval bus is filled in
  // Phase 5 and carried to the next Cycle's fold by finalizeCycleState_.
  if (foldedInitiativeHoods.length || foldedApprovalHoods.length) {
    Logger.log('applyNeighborhoodEffectsFold_: initiative → ' + foldedInitiativeHoods.length +
      ' hood(s), approval (cycle ' + approvalBusCycle + ' carry) → ' + foldedApprovalHoods.length + ' hood(s)');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // THE CITY FROM ITS HOODS (engine.214 D10): the equal mean of every canon
  // hood's FINAL value — exactly what S.neighborhoodDynamics' readers see —
  // then city momentum as before. One source (the canon list), no live column,
  // no sample-vs-population confusion, no hand weights. Every hood is a
  // character and the city is its hoods.
  // ─────────────────────────────────────────────────────────────────────────
  function hoodMean_(key) {
    var sum = 0, n = 0;
    for (var k in neighborhoodDynamics) {
      if (!neighborhoodDynamics.hasOwnProperty(k)) continue;
      sum += safeNum_(neighborhoodDynamics[k][key], key === 'sentiment' ? 0 : 1);
      n++;
    }
    if (n <= 0) throw new Error('engine.214: no hood dynamics to average — the canon list is empty');
    return sum / n;
  }

  var rawCity = {};
  for (var rk = 0; rk < METRIC_KEYS.length; rk++) rawCity[METRIC_KEYS[rk]] = hoodMean_(METRIC_KEYS[rk]);
  clampMetrics_(rawCity);

  // ─────────────────────────────────────────────────────────────────────────
  // MOMENTUM SMOOTHING
  // ─────────────────────────────────────────────────────────────────────────
  if (S.resetDynamicsMomentum) {
    S.previousCityDynamics = null;
    S.previousNeighborhoodDynamics = null;
    S.resetDynamicsMomentum = false;
  }

  var prev = S.previousCityDynamics || null;
  var finalCity = {};

  for (var mk in rawCity) {
    if (!rawCity.hasOwnProperty(mk)) continue;
    var mf = getMomentumFactor(mk, S);
    finalCity[mk] = blend(prev ? prev[mk] : null, rawCity[mk], mf);
  }

  // engine.188: the blended sentiment BEFORE the one-cycle boosts below.
  // This is what carries to the next cycle — see the note at the persist site.
  var preBoostSentiment = finalCity.sentiment;
  // engine.195: the same carrier fix for every metric. The media block (crisis
  // saturation → publicSpaces / communityEngagement, celebrity buzz → tourism /
  // nightlife) and the edition-coverage block add to the blended values below;
  // with those adds in the carrier they compounded through momentum 0.60–0.78 —
  // 2.5x to 4.5x a one-cycle nudge. Every metric now carries its pre-boost blend.
  var preBoostCity = copyObj_(finalCity);

  // ─────────────────────────────────────────────────────────────────────────
  // MEDIA FEEDBACK (v3.0 — previous cycle's media coverage affects today)
  // ─────────────────────────────────────────────────────────────────────────
  var prevState = S.previousCycleState || {};
  var prevMedia = prevState.mediaEffects || null;

  if (prevMedia) {
    // Sentiment pressure: heavy crisis coverage → city mood drops
    // hopeFactor lifts mood, anxietyFactor dampens it
    var mediaSentiment = (prevMedia.hopeFactor || 0) - (prevMedia.anxietyFactor || 0);
    finalCity.sentiment += mediaSentiment * 0.04;

    // Crisis saturation: sustained crisis coverage → public spaces empty, engagement drops.
    // Celebrity buzz: spotlight on the city → tourism and nightlife tick up.
    // engine.195 live-range check (live C106–C108, bench C137–C139): crisisSaturation
    // 0–0.3 against a `> 0.5` gate that never opened; celebrityBuzz 0.36–0.75 against a
    // `> 0.3` gate that never closed (SIM_DOCTRINE §15, both directions). Both now act in
    // proportion — small, one-cycle nudges now that the carrier no longer echoes them.
    var crisisSat = prevMedia.crisisSaturation || 0;
    finalCity.publicSpaces -= crisisSat * 0.03;
    finalCity.communityEngagement -= crisisSat * 0.02;

    var celebBuzz = prevMedia.celebrityBuzz || 0;
    finalCity.tourism += celebBuzz * 0.02;
    finalCity.nightlife += celebBuzz * 0.02;

    Logger.log('applyCityDynamics_ v3.0: Media feedback applied (sentiment ' +
      (mediaSentiment * 0.04).toFixed(3) + ', crisisSat ' + crisisSat.toFixed(2) +
      ', celebBuzz ' + celebBuzz.toFixed(2) + ')');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EDITION COVERAGE NEIGHBORHOOD EFFECTS (v3.1, S202 — wires the dead output)
  // ─────────────────────────────────────────────────────────────────────────
  // applyEditionCoverageEffects_ (Phase 2, runs immediately before this) writes
  // S.editionNeighborhoodEffects['city'] with per-metric deltas derived from
  // the prior cycle's edition tone × DOMAIN_RULES.
  var cityEffects = (S.editionNeighborhoodEffects && S.editionNeighborhoodEffects['city']) || null;
  if (cityEffects) {
    if (cityEffects.traffic) finalCity.traffic += cityEffects.traffic;
    if (cityEffects.retail) finalCity.retail += cityEffects.retail;
    if (cityEffects.nightlife) finalCity.nightlife += cityEffects.nightlife;
    if (cityEffects.publicSpaces) finalCity.publicSpaces += cityEffects.publicSpaces;
    if (cityEffects.communityEngagement) finalCity.communityEngagement += cityEffects.communityEngagement;
    if (cityEffects.culturalActivity) finalCity.culturalActivity += cityEffects.culturalActivity;
    Logger.log('applyCityDynamics_ v3.1: Edition coverage neighborhood effects applied — ' +
      'traffic ' + (cityEffects.traffic || 0).toFixed(3) +
      ', retail ' + (cityEffects.retail || 0).toFixed(3) +
      ', nightlife ' + (cityEffects.nightlife || 0).toFixed(3) +
      ', publicSpaces ' + (cityEffects.publicSpaces || 0).toFixed(3) +
      ', engagement ' + (cityEffects.communityEngagement || 0).toFixed(3) +
      ', cultural ' + (cityEffects.culturalActivity || 0).toFixed(3));

    // engine.45 T1: persist the edition-coverage contribution to the citywide fold —
    // previously folded as anonymous deltas (trace, citywide contributors).
    if (typeof recordRipple_ === 'function') {
      recordRipple_(ctx, {
        causeType: 'edition-coverage',
        causeId: 'editionNeighborhoodEffects.city',
        // Prose, not JSON — world-facing Why text (seed contract v2).
        causeDetail: 'Edition coverage lifted the city: ' + Object.keys(cityEffects).map(function(k) {
          var v = Number(cityEffects[k]) || 0;
          return k + ' ' + (v >= 0 ? '+' : '') + (Math.round(v * 1000) / 1000);
        }).join(', '),
        effectType: 'traffic/retail/nightlife/publicSpaces/communityEngagement/culturalActivity',
        targetScope: 'citywide',
        magnitude: cityEffects.traffic || 0,
        duration: 1,
        sourceEngine: 'applyCityDynamics'
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SPORTS SENTIMENT BOOST (engine.45 T3a)
  // ─────────────────────────────────────────────────────────────────────────
  // applySportsFeedTriggers_ computes S.sportsSentimentBoost from the sports
  // feed (record + streak + season multiplier, clamped ±0.10 per team). The
  // Ripple_Ledger attribution row is written at the compute site — no second
  // row here. No hood path exists for this add, so it stays a city scalar.
  var sportsBoost = Number(S.sportsSentimentBoost || 0);
  if (sportsBoost !== 0) {
    finalCity.sentiment += sportsBoost;
    Logger.log('applyCityDynamics_ engine.45 T3a: Sports sentiment boost applied — ' +
      sportsBoost.toFixed(4));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INITIATIVE IMPLEMENTATION SENTIMENT — RETIRED HERE (engine.214 D10)
  // ─────────────────────────────────────────────────────────────────────────
  // applyInitiativeImplementationEffects_ still computes
  // S.initiativeImplementationEffects.sentimentBoost, but this file no longer
  // adds it to the city: the same initiative's local bus lands on its target
  // hoods through the fold above and reaches the city through the hood mean.
  // Adding the scalar as well counted one cause twice (codex F2). The
  // compute-site Ripple_Ledger rows still describe the cause; the hoods carry it.

  // ─────────────────────────────────────────────────────────────────────────
  // EDITION COVERAGE SENTIMENT BOOST (v3.2, S216 engine.13)
  // ─────────────────────────────────────────────────────────────────────────
  // applyEditionCoverageEffects_ computes S.editionSentimentBoost from the
  // prior cycle's coverage ratings (rating × sentimentWeight × 0.015 summed
  // across domains, clamped ±0.20). No hood path: stays a city scalar.
  var sentimentBoost = Number(S.editionSentimentBoost || 0);
  if (sentimentBoost !== 0) {
    finalCity.sentiment += sentimentBoost;
    Logger.log('applyCityDynamics_ v3.2: Edition coverage sentiment boost applied — ' +
      sentimentBoost.toFixed(4));

    // engine.45 T1: persist the citywide sentiment contributor with its cause — this is
    // the boost the WHY layer previously mis-attributed to sports (trace S gap 3 / G-RC5).
    if (typeof recordRipple_ === 'function') {
      recordRipple_(ctx, {
        causeType: 'edition-coverage',
        causeId: 'editionSentimentBoost',
        causeDetail: 'prior-cycle coverage ratings × sentimentWeight × 0.015, clamped ±0.20',
        effectType: 'sentiment',
        targetScope: 'citywide',
        magnitude: sentimentBoost,
        duration: 1,
        sourceEngine: 'applyCityDynamics'
      });
    }
  }

  clampMetrics_(finalCity);

  // ─────────────────────────────────────────────────────────────────────────
  // OUTPUT
  // ─────────────────────────────────────────────────────────────────────────
  S.cityDynamics = {
    traffic: round2(finalCity.traffic),
    retail: round2(finalCity.retail),
    tourism: round2(finalCity.tourism),
    nightlife: round2(finalCity.nightlife),
    publicSpaces: round2(finalCity.publicSpaces),
    sentiment: round2(finalCity.sentiment),
    culturalActivity: round2(finalCity.culturalActivity),
    communityEngagement: round2(finalCity.communityEngagement)
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MOMENTUM CARRIER (engine.188, 2026-09-10)
  // ─────────────────────────────────────────────────────────────────────────
  // The sentiment boosts folded in above (media hope/anxiety, sports record,
  // edition coverage) are applied AFTER the momentum blend; persisting the
  // blended-plus-boosted value as the carrier re-added each boost on top of
  // its own echo every cycle (f = raw + b/(1-m): 2x at m 0.50). Every one of
  // those is a LEVEL recomputed from current state each cycle, not a one-off
  // impulse, so integrating it was double-counting — a cap that doesn't cap is
  // the same trick as a gate that can't fire (SIM_DOCTRINE §15).
  //
  // The carrier is the blended value WITHOUT this cycle's boosts, so a boost
  // lands at full strength in the cycle it belongs to and does not echo.
  // S.previousCityDynamics is private to this file (written here, read only at
  // the momentum blend above) — nothing downstream reads it.
  S.previousCityDynamics = copyObj_(S.cityDynamics);
  S.previousCityDynamics.sentiment = round2(clampSent(preBoostSentiment));
  for (var pbk in preBoostCity) {
    if (!preBoostCity.hasOwnProperty(pbk) || pbk === 'sentiment') continue;
    if (typeof preBoostCity[pbk] !== 'number') continue;
    S.previousCityDynamics[pbk] = round2(clampMult(preBoostCity[pbk]));
  }

  // Additive outputs
  S.neighborhoodDynamics = neighborhoodDynamics;
  S.cityDynamicsLag = lag;
  S.cityDynamicsCapacity = {
    transitCapacity: capacity.transitCapacity,
    venueCapacity: capacity.venueCapacity,
    roadCapacity: capacity.roadCapacity,
    peakTraffic: round2(peakTraffic),
    peakNightlife: round2(peakNightlife),
    peakTourism: round2(peakTourism),
    transitCongestion: round2(transitCongestion),
    venueCongestion: round2(venueCongestion),
    roadCongestion: round2(roadCongestion),
    congestionHangover: round2(lag.congestionHangover)
  };

  S.activityObservations.latest = obs;
  S.activityObservations.rolling = {
    events: round2(obsAvg.events),
    storySeedCount: round2(obsAvg.storySeedCount),
    media: round2(obsAvg.media),
    crime: round2(obsAvg.crime),
    shockCount: round2(obsAvg.shockCount)
  };

  // Legacy alias
  ctx.summary.cityDynamics = S.cityDynamics;
  ctx.summary = S;
}

/**
 * ============================================================================
 * getNeighborhoodDynamics_(ctx, neighborhood) (ES5)
 * ============================================================================
 * Safe accessor with fallback to city dynamics.
 * ============================================================================
 */
function getNeighborhoodDynamics_(ctx, neighborhood) {
  var S = ctx && ctx.summary;
  if (!S) return {
    traffic: 1, retail: 1, tourism: 1, nightlife: 1,
    publicSpaces: 1, sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };

  var city = S.cityDynamics || {
    traffic: 1, retail: 1, tourism: 1, nightlife: 1,
    publicSpaces: 1, sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };

  if (!neighborhood) return city;

  var nd = S.neighborhoodDynamics && S.neighborhoodDynamics[neighborhood];
  if (nd) return nd;

  return city;
}

/**
 * ============================================================================
 * CITY DYNAMICS REFERENCE v4.0 (engine.214)
 * ============================================================================
 * - Per-hood dynamics from the hood's authored Neighborhood_Map row:
 *   EmployerCharacter (HOOD_CHARACTER_BY_EMPLOYER), BoomIndex, WeatherZone,
 *   Scenes, Adjacent. No cluster, no hood name in code.
 * - getNeighborhoodDynamics_(ctx, neighborhood)
 * - Weather v3.5 integration (precipitationIntensity, windSpeed, visibility, front by zone)
 * - CalendarContext-aware seed weighting by Scenes / label / zone
 * - Lag system (tourismDrag, publicSpaceDrag, nightlifeDrag, congestionHangover)
 * - Per-hood capacity friction (capacitySensitivity by label), pre-momentum
 * - Ripple effects: sentiment bleed on the Adjacent graph (one simultaneous
 *   stage before the fold); per-hood crime ladder with the receipt; weather
 *   fronts by WeatherZone; stadium lift on the venue hood; First Friday by
 *   Scenes.FirstFriday weight
 * - The city = equal mean of the 22 final hood values, then city momentum
 *
 * Preserved:
 * - S.cityDynamics / S.neighborhoodDynamics schemas unchanged
 * - Momentum smoothing from v2.3; demographics from v2.5; holiday values v2.5
 * ============================================================================
 */
