/**
 * ============================================================================
 * Neighborhood Engine v2.5
 * ============================================================================
 *
 * v2.5 (S204 / 2026-05-06):
 * - FIX (HIGH): close §5.6 half-migration left by S188 commit 4b602ae. Prior
 *   state read SL directly via ledger.getDataRange().getValues() into a local
 *   `rows` slice, mutated rows[r] = row, then flipped ctx.ledger.dirty = true —
 *   but mutations were on a copy independent of ctx.ledger.rows, so Phase 10
 *   committed unmutated state and silently dropped neighborhood assignments +
 *   LifeHistory + LastUpdated writes for ~7 cycles (C87+).
 *   Migration: read header/rows from ctx.ledger (matches runEducationEngine /
 *   runCareerEngine / runCivicRoleEngine pattern). `ss` retained — still
 *   consumed by pickDemographicNeighborhood_ at line 356.
 * - LifeHistory_Log appendRow → queueAppendIntent_ (Phase 42 B2 mechanical
 *   migration, mirrors S184 B0 runHouseholdEngine pattern). logSheet handle
 *   removed.
 *
 * Assigns Tier-3 and Tier-4 citizens to Oakland neighborhoods.
 * Logs neighborhood drift events with location-specific flavor.
 * Named citizens (UNI/MED/CIV) are excluded unless assigned manually.
 *
 * v2.3 Enhancements:
 * - Integrated Tier 3 Neighborhood Demographics for placement
 * - Citizens assigned to neighborhoods matching their demographic profile
 * - Students → neighborhoods with existing student populations
 * - Seniors → established/senior-heavy neighborhoods
 * - Young professionals → urban/professional areas
 * - Falls back to random selection if demographics unavailable
 *
 * v2.2 Enhancements:
 * - Expanded to 12 neighborhoods (added Uptown, KONO, Chinatown, Piedmont Ave)
 * - Holiday-specific neighborhood events
 * - First Friday events (Uptown, KONO, Temescal focus)
 * - Creation Day community events
 * - Holiday neighborhood awareness (Fruitvale for cultural holidays, etc.)
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Oakland neighborhoods (12):
 * Temescal, Downtown, Fruitvale, Lake Merritt,
 * West Oakland, Laurel, Rockridge, Jack London,
 * Uptown, KONO, Chinatown, Piedmont Ave
 * 
 * ============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════
// engine.148 P3 — neighborhood drift pools (was a 12-key literal + a silent generic fallback)
// Every hood gets the pool for its Neighborhood_Map.EmployerCharacter label
// (a label with no pool throws); the twelve original hoods keep their bespoke
// lines on top. Resolved by hoodTexturePool_ (canonNeighborhoodLoader.js).
// ═══════════════════════════════════════════════════════════════════════════
// engine.299 Task 3 (agy 2026-10-18, HIGH): a texture line carries ITS OWN direction — ["text", "up"|"down"]
// where the line says the hood is livelier (up) or quieter (down); a plain string says neither and is never
// written. The hood's trajectory then PICKS from the lines that match it (growth → up lines, decay → down
// lines); it never stamps a sign on a line that does not say it. Lines that assert a fact the row does not
// carry (game-day crowds without Sports_Feed, cranes and a boom, a new mural, clinic crowds, campus construction)
// stay unsigned — agy (a). So do lines that name a mood without a change in activity ("felt the cultural
// energy", "the creative pulse", "steady business" — codex 2026-10-18). Down lines for decay hoods are this
// city's own quieter streets, never a decline premise.
var NEIGHBORHOOD_DRIFT_BY_CHARACTER_ = {
  'institutional': [["noticed the civic buildings emptying out at dusk", "down"], "felt the neighborhood's official rhythm shift", ["observed lines forming outside a public office", "up"]],
  'clinic': ["noticed more people heading toward the clinics", "felt the neighborhood's weary, caring pace", "observed a health worker finishing a long shift"],
  'schools-retail': [["noticed the after-school rush on the main street", "up"], ["felt the block settle once the school bells finished", "down"], ["observed parents talking outside the corner shops", "up"]],
  'campus': [["noticed the campus crowd spilling onto the sidewalks", "up"], "felt the neighborhood's young, restless energy", "observed new construction beside the old blocks"],
  'transit-retail': [["noticed the station crowd thinning after rush hour", "down"], "felt the neighborhood's constant coming and going", ["observed vendors packing up near the transit stop", "down"]],
  'nightlife': [["noticed the bars filling earlier than usual", "up"], ["felt the neighborhood's evening energy rise", "up"], ["observed the night crowd gathering on the corners", "up"]],
  'professional': [["noticed the office crowd leaving in step", "down"], "felt the neighborhood's orderly hum", ["observed shoppers lingering along the main avenue", "up"]],
  'residential': [["noticed neighbors talking across a fence", "up"], ["felt the block's quiet settle in", "down"], "observed porch lights coming on down the street"],
  'retail': ["noticed the shops changing their window displays", ["felt the neighborhood's shopping-day bustle", "up"], ["observed a line outside a popular storefront", "up"]],
  'medical': ["noticed hospital shift change on the sidewalks", "felt the neighborhood's steady, tended rhythm", ["observed a scrubs-clad crowd at the coffee counter", "up"]],
  'family-retail': [["noticed families filling the market street", "up"], "felt the neighborhood's generations mixing", "observed shopkeepers greeting regulars by name"],
  'mixed': ["noticed apartments and storefronts sharing the block", "felt the neighborhood's patchwork rhythm", "observed the corner store doing steady business"],
  'village-retail': [["noticed the village main street winding down", "down"], "felt the neighborhood's small-town pace", ["observed regulars gathering outside the bakery", "up"]],
  'service-labor': ["noticed the early shift heading out before dawn", "felt the neighborhood's working rhythm", ["observed workers gathering at the bus stop", "up"]],
  'arts': ["noticed a new mural going up on the corridor", "felt the neighborhood's creative pulse", ["observed a gallery crowd drifting between openings", "up"]],
  'stadium': ["noticed game-day crowds moving toward the arena", "felt the district's pregame anticipation", "observed vendors setting up along the concourse"],
  'construction': ["noticed cranes swinging over the boom blocks", "felt the neighborhood's build-out energy", "observed a new frame rising where a lot stood empty"]
};

var NEIGHBORHOOD_DRIFT_BESPOKE_ = {
  // engine.299 Task 3 (rb, data): ["text", "up"|"down"] = the line says the hood is livelier / quieter
  // and is drawn only when the hood's trajectory matches (growth up, decay down); a plain string says
  // neither and is never written. Down lines are this city's own trend — quieter streets, earlier
  // closings, thinner crowds — never a decline premise (Neighborhood_Map + INSTITUTIONS §Neighborhoods).
  'Temescal': [
    "noticed the creative energy shifting in Temescal",
    "felt Temescal's community vibe change slightly",
    ["observed new activity around Temescal's cafes", "up"],
    "sensed the neighborhood's artistic pulse",
    ["noticed a few Telegraph cafes closing earlier than they used to", "down"],
    ["found an open table at a Temescal spot that usually has a wait", "down"],
    ["walked Telegraph on a Saturday and found the sidewalks thinner than usual", "down"]
  ],
  'Downtown': [
    ["felt Downtown's urban rhythm intensify", "up"],
    "noticed shifting crowds in the city center",
    "observed changes in Downtown foot traffic",
    "sensed the business district's mood",
    ["noticed the plaza by City Hall emptying out earlier after work", "down"],
    ["found the lunch line on Broadway short for once", "down"],
    ["rode a tower elevator alone at an hour it is usually full", "down"]
  ],
  'Fruitvale': [
    "felt Fruitvale's cultural energy",
    "noticed community gathering patterns shift",
    "observed the neighborhood's familiar rhythms",
    "sensed changes in the local atmosphere",
    ["noticed the plaza by the transit hub fuller on a weekend than it was a season ago", "up"],
    ["noticed the strip by the transit hub quieter than it was a season ago", "down"],
    ["saw a few platform-side shops keeping shorter hours", "down"],
    ["caught a nearly empty train car out of Fruitvale at rush hour", "down"]
  ],
  'Lake Merritt': [
    "noticed activity patterns around the lake",
    "felt the lakeside community's mood",
    ["observed joggers and families by Lake Merritt", "up"],
    "sensed the peaceful energy near the water",
    ["had the lake path nearly to themselves on an evening it is usually crowded", "down"],
    ["noticed fewer boats out on the lake than a usual weekend", "down"]
  ],
  'West Oakland': [
    "noticed West Oakland's industrial rhythm",
    "felt the neighborhood's changing landscape",
    "observed development activity nearby",
    "sensed the area's evolving character",
    ["noticed the converted-warehouse cafes on the block busier than last season", "up"],
    ["noticed the rail-yard lunch spots quieter than usual this week", "down"],
    ["passed a warehouse campus with its lot half empty on a weekday", "down"]
  ],
  'Laurel': [
    "appreciated Laurel's residential calm",
    "noticed the quiet neighborhood's subtle shifts",
    "felt the local community's steady presence",
    "observed familiar faces on the street",
    ["noticed more neighbors out along MacArthur on a weekend afternoon", "up"],
    ["noticed the corner shops on MacArthur closing up early", "down"],
    ["walked the whole block without passing a neighbor", "down"]
  ],
  'Rockridge': [
    "noticed Rockridge's upscale atmosphere",
    "felt the tree-lined streets' ambiance",
    ["observed shoppers along College Ave", "up"],
    "sensed the neighborhood's refined energy",
    ["found parking on College Ave on a Saturday, which never happens", "down"],
    ["noticed the College Ave shops quieter than a usual weekend", "down"]
  ],
  'Jack London': [
    "felt Jack London's waterfront energy",
    ["noticed nightlife activity picking up", "up"],
    "observed the arts district's creative buzz",
    "sensed the estuary's calming presence",
    ["noticed the waterfront venues letting out early on a Friday", "down"],
    ["got a table at a Jack London restaurant without a reservation", "down"],
    ["found the estuary promenade thinner than a usual evening", "down"]
  ],
  'Uptown': [
    "felt Uptown's urban arts energy",
    ["noticed gallery-goers and theater crowds", "up"],
    "observed the neighborhood's creative pulse",
    "sensed the cultural district's momentum",
    ["noticed the Uptown bars emptying out earlier than they used to", "down"],
    ["walked past a theater on a show night and found no line", "down"]
  ],
  'KONO': [
    "noticed KONO's artistic atmosphere",
    "felt the Koreatown-Northgate creative vibe",
    ["observed murals and street art activity", "up"],
    "sensed the neighborhood's DIY spirit",
    ["noticed fewer people along the Telegraph corridor after dark", "down"],
    ["noticed the corridor's late-night spots closing a little earlier", "down"]
  ],
  'Chinatown': [
    ["felt Chinatown's bustling energy", "up"],
    ["noticed the busy morning markets", "up"],
    ["observed multigenerational community activity", "up"],
    "sensed the neighborhood's cultural rhythms",
    ["noticed the morning market lines shorter than usual", "down"],
    ["found the dim sum hall half full on a weekend", "down"]
  ],
  'Piedmont Ave': [
    "noticed Piedmont Ave's leafy calm",
    "felt the neighborhood's boutique atmosphere",
    ["observed afternoon strollers along the avenue", "up"],
    "sensed the area's residential tranquility",
    ["noticed the avenue's boutiques quieter than a usual afternoon", "down"],
    ["saw the avenue's cafes clearing out early", "down"]
  ]
};

// engine.201/201b activity-band + crime-bar hood retag helpers REMOVED S451 (builder ruling
// 2026-09-13: dials follow EVENTS — the ordinary hood line is a plain day, never retagged by rank).

// engine.212 (S451): the crime bar is RELATIVE — `dialHoodCrimeBar` × the city's median CrimeIndex
// off the persisted snapshot (S.neighborhoodState). A hood is "rough" against its own city, so the
// bar cannot rot as the city's level drifts (SIM_DOCTRINE §15). No median (empty / all-blank
// snapshot) → Infinity: nothing tints. Cached per cycle on ctx.
function hoodCrimeBar_(ctx, S) {
  if (ctx && ctx._hoodCrimeBar !== undefined) return ctx._hoodCrimeBar;
  var mult = pressureBar_(ctx, 'dialHoodCrimeBar');
  var vals = [], st = S && S.neighborhoodState;
  for (var h in st) {
    if (!st.hasOwnProperty(h) || !st[h]) continue;
    var v = Number(st[h].crimeIndex);
    if (isFinite(v) && v > 0) vals.push(v);
  }
  var bar = Infinity;
  if (vals.length) {
    vals.sort(function(a, b) { return a - b; });
    var mid = Math.floor(vals.length / 2);
    var median = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    bar = mult * median;
  }
  if (ctx) ctx._hoodCrimeBar = bar;
  return bar;
}

// 2026-09-19: the city's median of one S.neighborhoodState field (the persisted
// snapshot) — the middle a hood's life lines are read against, so no line gates
// on a number the column has drifted away from (SIM_DOCTRINE §15). null when no
// hood carries the field. Cached per cycle on ctx.
function hoodStateMedian_(ctx, S, field) {
  var cache = ctx ? (ctx._hoodStateMedian || (ctx._hoodStateMedian = {})) : {};
  if (cache.hasOwnProperty(field)) return cache[field];
  var vals = [], st = S && S.neighborhoodState;
  for (var h in st) {
    if (!st.hasOwnProperty(h) || !st[h] || st[h][field] === null || st[h][field] === undefined || st[h][field] === '') continue;
    var v = Number(st[h][field]);
    if (isFinite(v)) vals.push(v);
  }
  var median = null;
  if (vals.length) {
    vals.sort(function(a, b) { return a - b; });
    var mid = Math.floor(vals.length / 2);
    median = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  }
  cache[field] = median;
  return median;
}

function runNeighborhoodEngine_(ctx) {

  var rng = safeRand_(ctx);

  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  if (!ctx.ledger) {
    throw new Error('runNeighborhoodEngine_: ctx.ledger not initialized');
  }
  // LifeHistory_Log handle removed S204 B2 — appends route through queueAppendIntent_.
  var ss = ctx.ss;
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return;

  var idx = function(name) { return header.indexOf(name); };

  var iTier = idx('Tier');
  var iClockMode = idx('ClockMode');
  var iUNI = idx('UNI (y/n)');
  var iMED = idx('MED (y/n)');
  var iCIV = idx('CIV (y/n)');
  var iNeighborhood = idx('Neighborhood');
  var iLife = idx('LifeHistory');
  var iLastUpdated = idx('LastUpdated');
  var iPopID = idx('POPID');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iBirthYear = idx('BirthYear');
  var iDialState = idx('DialState'); // engine.32 T5 — Out-and-About dial -> neighborhood-event frequency
  var iStatus = idx('Status'); // engine.67 step 4 (S325) — engine had NO status read; the gone drew neighborhood drift

  // engine.99 Cohort 2 — core-sim hoods from Neighborhood_Map CoreSimRank (ADR-0016)
  var neighborhoods = getCoreSimNeighborhoods_(ctx);

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOOD-SPECIFIC EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTERNAL CONTEXT FROM ctx.summary
  // ═══════════════════════════════════════════════════════════════════════════
  var S = ctx.summary;
  var season = S.season;
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var holidayNeighborhood = S.holidayNeighborhood || null;
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var dynamics = S.cityDynamics || {
    traffic: 1, publicSpaces: 1, sentiment: 0,
    culturalActivity: 1, communityEngagement: 1
  };
  var chaos = S.worldEvents || [];
  var econMood = S.economicMood || 50;
  var cycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;

  var globalEvents = 0;
  // engine.299 Task 13 (SIM_DOCTRINE §1: "No caps, no quotas, no curation of what the world produces"): the citywide
  // EVENT_LIMIT of 6 is gone — it stopped the loop after six lines, so citizens late in ledger order never drew. Each
  // citizen's own drift odds decide; globalEvents stays as the count.

  // Track for summary
  var neighborhoodDriftEvents = [];
  var assignmentsCount = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // DEMOGRAPHIC-AWARE NEIGHBORHOOD PICKER (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  function pickDemographicNeighborhood_(ss, row, neighborhoods, iBirthYear, idxFn, rng) {
    // engine.135 F (S399, builder point 9): only neighborhoods whose admission
    // band fits the citizen's WealthLevel are candidates (B1 hood profile via
    // S.neighborhoodState). Unpriced (WL 0) citizens see every hood; if no
    // hood admits, the full pool stands so a citizen is never left unplaced.
    if (typeof hoodAdmits_ === 'function' && ctx.summary && ctx.summary.neighborhoodState) {
      var iWLf = idxFn('WealthLevel');
      var wlF = iWLf >= 0 ? (Number(row[iWLf]) || 0) : 0;
      var admitted = [];
      for (var af = 0; af < neighborhoods.length; af++) {
        if (hoodAdmits_(ctx.summary.neighborhoodState[neighborhoods[af]], wlF)) admitted.push(neighborhoods[af]);
      }
      if (admitted.length) neighborhoods = admitted;
    }

    // Determine citizen type based on age
    var simYear = simYearOf_(ctx); // engine.164
    var citizenType = 'young_professional';

    if (iBirthYear >= 0 && row[iBirthYear]) {
      var age = simYear - Number(row[iBirthYear]);
      if (age >= 5 && age <= 22) {
        citizenType = 'student';
      } else if (age >= 65) {
        citizenType = 'senior';
      } else if (age >= 25 && age <= 40) {
        citizenType = 'young_professional';
      } else {
        citizenType = 'family';
      }
    }

    // Check if demographic weighting is available
    if (typeof getDemographicWeightedNeighborhoods_ === 'function' &&
        typeof getNeighborhoodDemographics_ === 'function') {
      var demographics = getNeighborhoodDemographics_(ss);
      if (demographics && Object.keys(demographics).length > 0) {
        var weights = getDemographicWeightedNeighborhoods_(demographics, citizenType);
        // Build weighted selection array
        var weighted = [];
        for (var i = 0; i < neighborhoods.length; i++) {
          var hood = neighborhoods[i];
          var weight = weights[hood] || 0.05;
          var count = Math.max(1, Math.round(weight * 100));
          for (var c = 0; c < count; c++) {
            weighted.push(hood);
          }
        }
        if (weighted.length > 0) {
          return weighted[Math.floor(rng() * weighted.length)];
        }
      }
    }

    // Fallback: random selection
    return neighborhoods[Math.floor(rng() * neighborhoods.length)];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY-SPECIFIC NEIGHBORHOOD EVENTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayNeighborhoodEvents = {};

  // Fruitvale holidays

  // West Oakland holidays

  // Downtown/Uptown holidays

  // Jack London - Opening Day

  // Lake Merritt holidays

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY EVENTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var firstFridayEvents = {
    'Uptown': [
      "noticed First Friday crowds filling the galleries",
      "felt the monthly art walk energy in Uptown",
      "observed artists setting up on the sidewalks",
      "sensed the creative community coming alive"
    ],
    'KONO': [
      "felt KONO's First Friday buzz",
      "noticed gallery openings along the corridor",
      "observed the neighborhood's artistic energy peak",
      "sensed the monthly creative surge"
    ],
    'Temescal': [
      "noticed First Friday spillover into Temescal",
      "felt the neighborhood's evening energy rise",
      "observed art enthusiasts wandering the streets"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY EVENTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var creationDayEvents = [
    "felt something foundational in the neighborhood air",
    "sensed deep community roots today",
    "noticed neighbors reflecting on how things began",
    "felt connected to the neighborhood's origins"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE THROUGH CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (var r = 0; r < rows.length; r++) {

    var row = rows[r];

    var tier = Number(row[iTier] || 0);
    var mode = row[iClockMode] || 'ENGINE';
    var isUNI = (row[iUNI] || '').toString().toLowerCase().startsWith('y');
    var isMED = (row[iMED] || '').toString().toLowerCase().startsWith('y');
    var isCIV = (row[iCIV] || '').toString().toLowerCase().startsWith('y');

    // Only Tier-3/4 ENGINE citizens qualify
    if (tier !== 3 && tier !== 4) continue;
    if (mode !== 'ENGINE') continue;
    if (isUNI || isMED || isCIV) continue;
    // engine.67 step 4 (S325): gone-status gate — deceased/inactive/traded/
    // pending walk no blocks.
    if (iStatus >= 0) {
      var nbStatus = (row[iStatus] || '').toString().trim().toLowerCase();
      if (nbStatus === 'deceased' || nbStatus === 'inactive' || nbStatus === 'traded' || nbStatus === 'pending') continue;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // NEIGHBORHOOD ASSIGNMENT IF MISSING (v2.3 - demographic aware)
    // ═══════════════════════════════════════════════════════════════════════
    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '').toString().trim() : '';

    if (!neighborhood || neighborhood === '' || neighborhood === 'Oakland, CA') {
      // v2.3: Use demographic-weighted neighborhood selection
      neighborhood = pickDemographicNeighborhood_(ss, row, neighborhoods, iBirthYear, idx, rng);
      if (iNeighborhood >= 0) {
        row[iNeighborhood] = neighborhood;
      }
      row[iLastUpdated] = ctx.now;
      assignmentsCount++;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DRIFT CHANCE INFLUENCED BY CONDITIONS
    // ═══════════════════════════════════════════════════════════════════════
    var driftChance = 0.02;

    // Weather-driven drift
    if (weather.impact >= 1.3) driftChance += 0.015;
    if (weather.type === "fog") driftChance += 0.01;
    if (weather.type === "rain") driftChance += 0.01;

    // Weather mood effects
    if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) driftChance += 0.01;
    if (weatherMood.irritabilityFactor && weatherMood.irritabilityFactor > 0.3) driftChance += 0.01;

    // Season-driven drift
    if (season === "Winter") driftChance += 0.01;
    if (season === "Summer") driftChance += 0.005;

    // City Dynamics
    if (dynamics.sentiment <= -0.3) driftChance += 0.015;
    if (dynamics.sentiment >= 0.3) driftChance += 0.005;

    // Cultural activity boost (v2.2)
    if (dynamics.culturalActivity >= 1.4) driftChance += 0.01;

    // Community engagement boost (v2.2)
    if (dynamics.communityEngagement >= 1.3) driftChance += 0.008;

    // Economic mood
    if (econMood <= 35) driftChance += 0.01;

    // Chaos events cause drift
    if (chaos.length > 0) driftChance += 0.015;

    // Holiday priority boost (v2.2)
    if (holidayPriority === "major") driftChance += 0.012;
    else if (holidayPriority === "cultural") driftChance += 0.015;
    else if (holidayPriority === "oakland") driftChance += 0.012;
    else if (holidayPriority === "minor") driftChance += 0.005;

    // First Friday boost (v2.2)
    if (isFirstFriday) {
      if (neighborhood === "Uptown" || neighborhood === "KONO" || neighborhood === "Temescal") {
        driftChance += 0.025;  // Higher in art walk neighborhoods
      } else {
        driftChance += 0.01;
      }
    }

    // Creation Day boost (v2.2)
    if (isCreationDay) driftChance += 0.01;

    // Holiday neighborhood boost (v2.2)
    if (holidayNeighborhood && neighborhood === holidayNeighborhood) {
      driftChance += 0.02;
    }

    // engine.32 T5 — Out-and-About dial scales neighborhood-event frequency
    // (0.5..1.5). null bands (no DialState) -> base rates unchanged.
    var dialBands = getCitizenDialBands_(ctx, (row[iPopID] || "").toString(), iDialState >= 0 ? (row[iDialState] || "") : "");
    if (dialBands) driftChance *= dialBands.mult.outabout;

    // Cap driftChance
    if (driftChance > 0.12) driftChance = 0.12;

    // ═══════════════════════════════════════════════════════════════════════
    // DRIFT EVENT TRIGGER
    // ═══════════════════════════════════════════════════════════════════════
    if (rng() < driftChance) {

      // engine.299 Task 3 (builder 2026-10-18: "the city moves and she should be reacting to that"): every
      // line this engine writes carries the dial it moves and which way. A hood texture line is a reaction
      // to the hood, so its sign is the hood's own trajectory this Cycle (Neighborhood_Map via
      // S.neighborhoodState: growth -> Up, decay -> Down); a hood that did not move gives the line no sign
      // and the line is not written (counted in S.engine299.noDialBySource). The context lines say their
      // own direction. The pool holds { t: text, d: "dial:<dial>:<up|down>" | null }.
      var hoodTraj = String((S.neighborhoodState && S.neighborhoodState[neighborhood] && S.neighborhoodState[neighborhood].trajectory) || '').toLowerCase();
      var hoodDir = hoodTraj === 'growth' ? 'up' : (hoodTraj === 'decay' ? 'down' : null);
      var signed_ = function(texts, d) { var out = []; for (var ti = 0; ti < texts.length; ti++) out.push({ t: texts[ti], d: d }); return out; };
      // texture: keep only the lines whose own direction matches the hood's trajectory (agy HIGH, 2026-10-18)
      var textureSigned_ = function(items, dir) {
        var out = [];
        for (var ti = 0; ti < items.length; ti++) {
          var it = items[ti];
          var txt = Array.isArray(it) ? it[0] : it;
          var d = Array.isArray(it) ? it[1] : null;
          // engine.299 Task 13 (agy 2026-10-18): only lines that can be written enter the pool — an unsigned line or an
          // unmoved hood's line never could, and holding a slot it made a winning drift roll come to nothing.
          if (dir && d === dir) out.push({ t: txt, d: 'dial:outabout:' + d });
        }
        return out;
      };
      var eventPool = textureSigned_(hoodTexturePool_(ctx, neighborhood, NEIGHBORHOOD_DRIFT_BY_CHARACTER_, NEIGHBORHOOD_DRIFT_BESPOKE_, 'runNeighborhoodEngine_'), hoodDir);
      var eventTag = "Neighborhood";

      // Add holiday-specific events (v2.2) — a day out in the hood
      if (holidayNeighborhoodEvents[neighborhood]) {
        eventPool = eventPool.concat(signed_(holidayNeighborhoodEvents[neighborhood], 'dial:sociability:up'));
      }

      // Add First Friday events (v2.2) — out at the art walk
      if (isFirstFriday && firstFridayEvents[neighborhood]) {
        eventPool = eventPool.concat(signed_(firstFridayEvents[neighborhood], 'dial:sociability:up'));
      }

      // Add Creation Day events (v2.2) — belonging
      if (isCreationDay) {
        eventPool = eventPool.concat(signed_(creationDayEvents, 'dial:warmth:up'));
      }

      // Add weather-context events
      if (weather.type === "rain") {
        eventPool.push({ t: "noticed how the rain affected neighborhood mood", d: 'dial:outabout:down' });
      }
      if (weather.type === "fog") {
        eventPool.push({ t: "felt the fog settle over the neighborhood", d: 'dial:outabout:down' });
      }
      if (weatherMood.primaryMood === 'irritable') {
        eventPool.push({ t: "sensed neighbors' frustration with the weather", d: 'dial:composure:down' });
      }

      // Add economic-context events
      if (econMood <= 35) {
        eventPool.push({ t: "noticed economic concerns among neighbors", d: 'dial:composure:down' });
      }
      if (econMood >= 65) {
        eventPool.push({ t: "sensed optimism in the neighborhood", d: 'dial:composure:up' });
      }

      // Chaos-context line — S.worldEvents holds good news as well as bad (a cleanup day, a market turnout); the
      // presence of events is not a direction, so "felt atmosphere influenced by recent city events" carries no sign
      // (codex 2026-10-18 Task 3 F1) and stays out of the pool until a world event carries its own — an unsigned
      // line holding a slot made a winning drift roll come to nothing (rb 2026-10-18, the case 793dd806 closed).

      // Add cultural activity events (v2.2)
      if (dynamics.culturalActivity >= 1.4) {
        eventPool.push({ t: "noticed increased cultural activity in the area", d: 'dial:openness:up' });
      }

      // Add community engagement events (v2.2)
      if (dynamics.communityEngagement >= 1.3) {
        eventPool.push({ t: "felt neighbors more engaged with each other", d: 'dial:sociability:up' });
      }

      if (!eventPool.length) {                         // nothing this citizen's hood can say this Cycle: counted, not written
        S.engine299 = S.engine299 || { noDial: 0, noDialBySource: {} };
        S.engine299.noDial++;
        var ekey = 'runNeighborhoodEngine:Neighborhood:' + (hoodTraj || 'no-trajectory');
        S.engine299.noDialBySource[ekey] = (S.engine299.noDialBySource[ekey] || 0) + 1;
        continue;
      }
      var picked = eventPool[Math.floor(rng() * eventPool.length)];
      var entry = picked.t;
      var entryDial = picked.d;

      // engine.176 (S438): a hood under PERSISTED pressure (Neighborhood_Map via
      // S.neighborhoodState — never the same-cycle pulse) tints this citizen's
      // neighborhood line to a pressure tag instead of the ordinary sociability
      // line. Claims the citizen's one pressure tag for the cycle (Neighborhoods
      // runs before Career/Money/Migration), so the collision emitters skip.
      var hoodSt = S.neighborhoodState ? S.neighborhoodState[neighborhood] : null;
      if (hoodSt && ((Number(hoodSt.housingPressure) >= pressureBar_(ctx, 'dialHoodPressureBar')) ||
                     (Number(hoodSt.crimeIndex) >= hoodCrimeBar_(ctx, S)))) {
        var tintTag = emitPressureTag_(ctx, row, iLife, String(row[iPopID] || ''), 'hood', pressureText_('hood', cycle + r),
          { name: ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(), hood: neighborhood });
        if (tintTag) {
          row[iLastUpdated] = ctx.now;
          neighborhoodDriftEvents.push({ citizen: (row[iFirst] + " " + row[iLast]).trim(), neighborhood: neighborhood, event: pressureText_('hood', cycle + r), tag: tintTag });
          globalEvents++;
          S.eventsGenerated = (S.eventsGenerated || 0) + 1;
          rows[r] = row;
          continue;
        }
      }

      // Determine event tag (v2.2)
      if (isFirstFriday && firstFridayEvents[neighborhood] && firstFridayEvents[neighborhood].indexOf(entry) >= 0) {
        eventTag = "FirstFriday";
      } else if (isCreationDay && creationDayEvents.indexOf(entry) >= 0) {
        eventTag = "CreationDay";
      } else if (holidayNeighborhoodEvents[neighborhood] && holidayNeighborhoodEvents[neighborhood].indexOf(entry) >= 0) {
        eventTag = "Holiday";
      }
      // engine.299: the written tag is the graded form <Kind>-<Dial>-<Up|Down>-S (utilities/citizenDialMap.js
      // gradedNudges_ folds it; baseTag_ strips it back to the kind for pulse/registry readers). No sign, no line.
      var dm = /^dial:([a-z]+):(up|down)$/.exec(entryDial || '');
      if (!dm) {
        S.engine299 = S.engine299 || { noDial: 0, noDialBySource: {} };
        S.engine299.noDial++;
        var nkey = 'runNeighborhoodEngine:' + eventTag + (hoodTraj ? ':' + hoodTraj : ':no-trajectory');
        S.engine299.noDialBySource[nkey] = (S.engine299.noDialBySource[nkey] || 0) + 1;
        continue;
      }
      eventTag = eventTag + '-' + dm[1].charAt(0).toUpperCase() + dm[1].slice(1) + '-' + (dm[2] === 'up' ? 'Up' : 'Down') + '-S';

      // Stamp entry
      var stamp = inWorldStamp_(ctx);
      var existing = row[iLife] ? row[iLife].toString() : "";
      var line = stamp + " — [" + eventTag + "] " + entry;

      row[iLife] = existing ? existing + "\n" + line : line;
      row[iLastUpdated] = ctx.now;

      // Log to LifeHistory_Log
      queueAppendIntent_(
        ctx,
        'LifeHistory_Log',
        [
          ctx.now,
          row[iPopID],
          ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(),
          eventTag,
          entry,
          neighborhood,
          cycle
        ],
        'neighborhood event',
        'citizens'
      );

      // Track for summary
      neighborhoodDriftEvents.push({
        citizen: (row[iFirst] + " " + row[iLast]).trim(),
        neighborhood: neighborhood,
        event: entry,
        tag: eventTag
      });

      globalEvents++;
      S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    }

    rows[r] = row;
  }

  // Phase 42 §5.6: flip ctx.ledger.dirty; consolidated commit at Phase 10.
  ctx.ledger.dirty = true;

  // Summary
  S.neighborhoodDriftEvents = neighborhoodDriftEvents;
  S.neighborhoodAssignments = assignmentsCount;
  ctx.summary = S;
}


/**
 * ============================================================================
 * NEIGHBORHOOD REFERENCE (12 total)
 * ============================================================================
 * 
 * Neighborhood   | Character                    | Special Events
 * ─────────────────────────────────────────────────────────────────────────
 * Temescal       | Creative, cafes              | First Friday spillover
 * Downtown       | Urban, business              | Pride, civic events
 * Lake Merritt   | Lakeside, families           | July 4th, Earth Day
 * Laurel         | Residential, calm            | —
 * Rockridge      | Upscale, tree-lined          | —
 * Jack London    | Waterfront, nightlife        | Opening Day, arts
 * Uptown         | Urban arts, galleries        | First Friday (core)
 * KONO           | DIY, street art              | First Friday (core)
 * Chinatown      | Bustling, markets            | Lunar New Year potential
 * Piedmont Ave   | Leafy, boutiques             | —
 * 
 * ============================================================================
 * 
 * EVENT TAGS (v2.2):
 * - Neighborhood: Base neighborhood events
 * - FirstFriday: Art walk events
 * - CreationDay: GodWorld founding events
 * - Holiday: Holiday-specific neighborhood events
 * 
 * ============================================================================
 */