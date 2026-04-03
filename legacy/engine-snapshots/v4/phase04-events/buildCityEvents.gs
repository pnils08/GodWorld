/**
 * ============================================================================
 * buildCityEvents_ v2.4 (weighted + tagged + deterministic RNG)
 * ============================================================================
 *
 * v2.4 Improvements:
 * - Preserves intended weighting via weight accumulation (no "push duplicates then dedupe")
 * - Unbiased weighted sampling without replacement
 * - Optional determinism (ctx.rng or ctx.config.rngSeed)
 * - Adds tags to cityEventDetails entries (non-breaking; extra fields)
 * - Removed pickRandomSet_ fallback to ensure weighted sampling is always used
 *
 * Previous features (v2.3):
 * - Expanded to 12 Oakland neighborhoods
 * - GodWorld Calendar integration (30+ holidays)
 * - Holiday-specific event pools
 * - First Friday arts events
 * - Creation Day community events
 * - Sports season events
 * - Cultural activity and community engagement effects
 * - Calendar context in output
 *
 * Output:
 * - S.cityEvents: string[]
 * - S.cityEventDetails: Array<{name, neighborhood, tags?: string[], weight?: number}>
 * - S.cityEventsCalendarContext: {...}
 * ============================================================================
 */

/**
 * Mulberry32 PRNG - fast, seedable 32-bit PRNG
 * @param {number} seed - Initial seed value
 * @returns {function(): number} - Returns random float in [0, 1)
 */
function mulberry32_(seed) {
  return function() {
    seed = (seed + 0x6D2B79F5) >>> 0;
    var t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCityEvents_(ctx) {
  var S = ctx.summary || (ctx.summary = {});

  // ═══════════════════════════════════════════════════════════════════════════
  // RNG SETUP (v2.4)
  // Prefer injected RNG, else seed-based, else Math.random
  // ═══════════════════════════════════════════════════════════════════════════
  var rng = (typeof ctx.rng === "function")
    ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === "number")
      ? mulberry32_((ctx.config.rngSeed >>> 0) ^ ((S.cycleId || ctx.config.cycleCount || 0) >>> 0))
      : Math.random;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || {};
  var sentiment = dynamics.sentiment || 0;
  var publicSpace = dynamics.publicSpaces || 1;
  var nightlife = dynamics.nightlife || 1;
  var culturalActivity = dynamics.culturalActivity || 1;
  var communityEngagement = dynamics.communityEngagement || 1;
  var econMood = S.economicMood || 50;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = !!S.isFirstFriday;
  var isCreationDay = !!S.isCreationDay;
  var sportsSeason = S.sportsSeason || "off-season";

  // Build calendar tags for traceability
  var calendarTags = (function() {
    var tags = [];
    if (holiday !== "none") tags.push("holiday:" + holiday);
    if (holidayPriority !== "none") tags.push("holidayPriority:" + holidayPriority);
    if (isFirstFriday) tags.push("firstFriday");
    if (isCreationDay) tags.push("creationDay");
    if (sportsSeason && sportsSeason !== "off-season") tags.push("sportsSeason:" + sportsSeason);
    return tags;
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // TAG HELPERS (v2.4)
  // ═══════════════════════════════════════════════════════════════════════════
  function addTag(tags, t) {
    if (!t) return tags;
    if (tags.indexOf(t) === -1) tags.push(t);
    return tags;
  }

  function mergeTags(a, b) {
    var out = (a || []).slice();
    var bArr = b || [];
    for (var i = 0; i < bArr.length; i++) {
      addTag(out, bArr[i]);
    }
    return out;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEIGHT POOL (v2.4)
  // Accumulates weights by event name instead of duplicating array entries
  // ═══════════════════════════════════════════════════════════════════════════
  var poolByName = Object.create(null);

  function addEvents_(events, weight, sourceTags) {
    if (!Array.isArray(events) || events.length === 0) return;
    var w = (typeof weight === "number" && isFinite(weight) && weight > 0) ? weight : 1;
    var baseTags = mergeTags(calendarTags, sourceTags);

    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (!e || !e.name) continue;
      var key = e.name;

      if (!poolByName[key]) {
        poolByName[key] = {
          name: e.name,
          neighborhood: e.neighborhood || "",
          weight: 0,
          tags: baseTags.slice()
        };
      } else {
        // Merge tags + preserve neighborhood if missing
        poolByName[key].tags = mergeTags(poolByName[key].tags, baseTags);
        if (!poolByName[key].neighborhood && e.neighborhood) {
          poolByName[key].neighborhood = e.neighborhood;
        }
      }

      poolByName[key].weight += w;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE EVENT POOLS (Oakland - 12 neighborhoods)
  // ═══════════════════════════════════════════════════════════════════════════

  var SPRING = [
    { name: "Lake Merritt Blossom Walk", neighborhood: "Lake Merritt" },
    { name: "Temescal Spring Arts Pop-Up", neighborhood: "Temescal" },
    { name: "Rockridge Garden Market", neighborhood: "Rockridge" },
    { name: "Fruitvale Community Bloom Festival", neighborhood: "Fruitvale" },
    { name: "Uptown Spring Gallery Opening", neighborhood: "Uptown" },
    { name: "KONO Flower Market", neighborhood: "KONO" }
  ];

  var SUMMER = [
    { name: "Jack London Estuary Jazz Fest", neighborhood: "Jack London" },
    { name: "Lake Merritt Concert Series", neighborhood: "Lake Merritt" },
    { name: "Fruitvale Street Food Carnival", neighborhood: "Fruitvale" },
    { name: "West Oakland Waterfront Night Market", neighborhood: "West Oakland" },
    { name: "Uptown Summer Block Party", neighborhood: "Uptown" },
    { name: "Piedmont Ave Sidewalk Sale", neighborhood: "Piedmont Ave" }
  ];

  var FALL = [
    { name: "Temescal Harvest Fair", neighborhood: "Temescal" },
    { name: "Rockridge Autumn Walk", neighborhood: "Rockridge" },
    { name: "Laurel District Craft Expo", neighborhood: "Laurel" },
    { name: "Downtown Oakland Arts Month", neighborhood: "Downtown" },
    { name: "KONO Fall Festival", neighborhood: "KONO" },
    { name: "Chinatown Autumn Moon Festival", neighborhood: "Chinatown" }
  ];

  var WINTER = [
    { name: "Lake Merritt Lantern Parade", neighborhood: "Lake Merritt" },
    { name: "Downtown Winter Festival", neighborhood: "Downtown" },
    { name: "Jack London Cozy Nights Film Series", neighborhood: "Jack London" },
    { name: "Temescal Holiday Market", neighborhood: "Temescal" },
    { name: "Piedmont Ave Winter Walk", neighborhood: "Piedmont Ave" },
    { name: "Chinatown Winter Lights", neighborhood: "Chinatown" }
  ];

  var CLEAR_EVENTS = [
    { name: "Downtown Plaza Noon Music Session", neighborhood: "Downtown" },
    { name: "Lake Merritt Open-Air Book Market", neighborhood: "Lake Merritt" },
    { name: "Temescal Street Vendors Block", neighborhood: "Temescal" },
    { name: "Jack London Waterfront Stroll", neighborhood: "Jack London" },
    { name: "Uptown Outdoor Gallery", neighborhood: "Uptown" }
  ];

  var RAIN_EVENTS = [
    { name: "Rockridge Heated Tent Pop-Up Cafe", neighborhood: "Rockridge" },
    { name: "Downtown Indoor Arts Night", neighborhood: "Downtown" },
    { name: "Temescal Shelter-Hub Spoken Word", neighborhood: "Temescal" },
    { name: "Jack London Warehouse Gallery Opening", neighborhood: "Jack London" },
    { name: "KONO Rainy Day Art Walk", neighborhood: "KONO" }
  ];

  var FOG_EVENTS = [
    { name: "Lake Merritt Fog Walk Photography Tour", neighborhood: "Lake Merritt" },
    { name: "Jack London Misty Morning Coffee Club", neighborhood: "Jack London" },
    { name: "West Oakland Industrial Fog Art Exhibit", neighborhood: "West Oakland" }
  ];

  var CHAOS_EVENTS = [
    { name: "Downtown Civic Response Meeting", neighborhood: "Downtown" },
    { name: "Fruitvale Emergency Town Briefing", neighborhood: "Fruitvale" },
    { name: "West Oakland Neighborhood Stabilization Panel", neighborhood: "West Oakland" }
  ];

  var HIGH_SENTIMENT = [
    { name: "Lake Merritt Community Joy Parade", neighborhood: "Lake Merritt" },
    { name: "Fruitvale Good News Gathering", neighborhood: "Fruitvale" },
    { name: "Temescal Volunteer Boost Rally", neighborhood: "Temescal" }
  ];

  var LOW_SENTIMENT = [
    { name: "Downtown Civic Concern Forum", neighborhood: "Downtown" },
    { name: "West Oakland Neighborhood Watch Meet", neighborhood: "West Oakland" },
    { name: "Fruitvale Public Dialogue Circle", neighborhood: "Fruitvale" }
  ];

  var NIGHTLIFE_EVENTS = [
    { name: "Jack London Neon Terrace DJ Night", neighborhood: "Jack London" },
    { name: "Downtown Rooftop Mixer", neighborhood: "Downtown" },
    { name: "Lake Merritt After-Dark Cultural Showcase", neighborhood: "Lake Merritt" },
    { name: "Temescal Late Night Gallery Walk", neighborhood: "Temescal" },
    { name: "Uptown Club Crawl", neighborhood: "Uptown" }
  ];

  var ECON_BOOM = [
    { name: "Downtown Business Gala", neighborhood: "Downtown" },
    { name: "Jack London Startup Showcase", neighborhood: "Jack London" },
    { name: "Rockridge Investment Summit", neighborhood: "Rockridge" }
  ];

  var ECON_BUST = [
    { name: "Fruitvale Job Fair", neighborhood: "Fruitvale" },
    { name: "West Oakland Community Resource Day", neighborhood: "West Oakland" },
    { name: "Downtown Workers Rights Forum", neighborhood: "Downtown" }
  ];

  var COZY_EVENTS = [
    { name: "Laurel Fireside Reading Night", neighborhood: "Laurel" },
    { name: "Rockridge Candlelit Wine Tasting", neighborhood: "Rockridge" },
    { name: "Temescal Cozy Crafts Workshop", neighborhood: "Temescal" }
  ];

  var PERFECT_WEATHER = [
    { name: "Lake Merritt Picnic Festival", neighborhood: "Lake Merritt" },
    { name: "Jack London Outdoor Yoga Session", neighborhood: "Jack London" },
    { name: "Temescal Street Fair", neighborhood: "Temescal" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  var THANKSGIVING_EVENTS = [
    { name: "Downtown Thanksgiving Parade", neighborhood: "Downtown" },
    { name: "Lake Merritt Gratitude Gathering", neighborhood: "Lake Merritt" },
    { name: "Fruitvale Community Feast", neighborhood: "Fruitvale" },
    { name: "West Oakland Turkey Trot", neighborhood: "West Oakland" }
  ];

  var HOLIDAY_EVENTS = [
    { name: "Downtown Holiday Tree Lighting", neighborhood: "Downtown" },
    { name: "Lake Merritt Festival of Lights", neighborhood: "Lake Merritt" },
    { name: "Rockridge Holiday Stroll", neighborhood: "Rockridge" },
    { name: "Temescal Winter Wonderland", neighborhood: "Temescal" },
    { name: "Jack London Holiday Market", neighborhood: "Jack London" }
  ];

  var NEW_YEARS_EVE_EVENTS = [
    { name: "Downtown Oakland Countdown", neighborhood: "Downtown" },
    { name: "Jack London Waterfront Fireworks", neighborhood: "Jack London" },
    { name: "Lake Merritt Midnight Celebration", neighborhood: "Lake Merritt" },
    { name: "Uptown New Year's Eve Party", neighborhood: "Uptown" }
  ];

  var NEW_YEAR_EVENTS = [
    { name: "Lake Merritt Polar Plunge", neighborhood: "Lake Merritt" },
    { name: "Downtown New Year's Day Parade", neighborhood: "Downtown" },
    { name: "Temescal Resolution Run", neighborhood: "Temescal" }
  ];

  var MLK_DAY_EVENTS = [
    { name: "Downtown MLK March", neighborhood: "Downtown" },
    { name: "West Oakland Dream Rally", neighborhood: "West Oakland" },
    { name: "Fruitvale Unity Gathering", neighborhood: "Fruitvale" },
    { name: "Lake Merritt Peace Walk", neighborhood: "Lake Merritt" }
  ];

  var LUNAR_NEW_YEAR_EVENTS = [
    { name: "Chinatown Lunar New Year Parade", neighborhood: "Chinatown" },
    { name: "Chinatown Lion Dance Festival", neighborhood: "Chinatown" },
    { name: "Chinatown Firecracker Ceremony", neighborhood: "Chinatown" },
    { name: "Downtown Asian Heritage Celebration", neighborhood: "Downtown" }
  ];

  var VALENTINE_EVENTS = [
    { name: "Lake Merritt Sweetheart Stroll", neighborhood: "Lake Merritt" },
    { name: "Rockridge Romance Walk", neighborhood: "Rockridge" },
    { name: "Jack London Couples Cruise", neighborhood: "Jack London" }
  ];

  var PRESIDENTS_DAY_EVENTS = [
    { name: "Downtown Presidents Day Observance", neighborhood: "Downtown" },
    { name: "Lake Merritt History Walk", neighborhood: "Lake Merritt" }
  ];

  var ST_PATRICKS_EVENTS = [
    { name: "Jack London St. Patrick's Pub Crawl", neighborhood: "Jack London" },
    { name: "Downtown Green Parade", neighborhood: "Downtown" },
    { name: "Temescal Irish Music Night", neighborhood: "Temescal" }
  ];

  var EASTER_EVENTS = [
    { name: "Lake Merritt Easter Egg Hunt", neighborhood: "Lake Merritt" },
    { name: "Rockridge Spring Celebration", neighborhood: "Rockridge" },
    { name: "Fruitvale Easter Festival", neighborhood: "Fruitvale" }
  ];

  var EARTH_DAY_EVENTS = [
    { name: "Lake Merritt Environmental Fair", neighborhood: "Lake Merritt" },
    { name: "West Oakland Sustainability Summit", neighborhood: "West Oakland" },
    { name: "Temescal Green Market", neighborhood: "Temescal" }
  ];

  var CINCO_DE_MAYO_EVENTS = [
    { name: "Fruitvale Cinco de Mayo Festival", neighborhood: "Fruitvale" },
    { name: "Fruitvale Mariachi Parade", neighborhood: "Fruitvale" },
    { name: "Downtown Cinco Celebration", neighborhood: "Downtown" },
    { name: "Lake Merritt Mexican Heritage Day", neighborhood: "Lake Merritt" }
  ];

  var MOTHERS_DAY_EVENTS = [
    { name: "Rockridge Mother's Day Brunch Walk", neighborhood: "Rockridge" },
    { name: "Lake Merritt Family Picnic", neighborhood: "Lake Merritt" },
    { name: "Piedmont Ave Mother's Day Market", neighborhood: "Piedmont Ave" }
  ];

  var MEMORIAL_DAY_EVENTS = [
    { name: "Downtown Memorial Ceremony", neighborhood: "Downtown" },
    { name: "Mountain View Cemetery Observance", neighborhood: "Piedmont Ave" },
    { name: "Jack London Veterans Tribute", neighborhood: "Jack London" }
  ];

  var JUNETEENTH_EVENTS = [
    { name: "West Oakland Juneteenth Festival", neighborhood: "West Oakland" },
    { name: "Downtown Freedom Parade", neighborhood: "Downtown" },
    { name: "Lake Merritt Liberation Celebration", neighborhood: "Lake Merritt" },
    { name: "Fruitvale Juneteenth Block Party", neighborhood: "Fruitvale" }
  ];

  var FATHERS_DAY_EVENTS = [
    { name: "Lake Merritt Father's Day BBQ", neighborhood: "Lake Merritt" },
    { name: "Jack London Dad's Day Out", neighborhood: "Jack London" },
    { name: "Temescal Father-Child Festival", neighborhood: "Temescal" }
  ];

  var INDEPENDENCE_EVENTS = [
    { name: "Jack London Fourth of July Fireworks", neighborhood: "Jack London" },
    { name: "Lake Merritt Independence Celebration", neighborhood: "Lake Merritt" },
    { name: "Downtown Patriotic Parade", neighborhood: "Downtown" },
    { name: "Temescal Red White Blue Block Party", neighborhood: "Temescal" }
  ];

  var LABOR_DAY_EVENTS = [
    { name: "Downtown Labor Day Parade", neighborhood: "Downtown" },
    { name: "West Oakland Workers Festival", neighborhood: "West Oakland" },
    { name: "Jack London End of Summer Bash", neighborhood: "Jack London" }
  ];

  var HALLOWEEN_EVENTS = [
    { name: "Lake Merritt Ghost Walk", neighborhood: "Lake Merritt" },
    { name: "Temescal Trick-or-Treat Street", neighborhood: "Temescal" },
    { name: "Jack London Halloween Haunted Pier", neighborhood: "Jack London" },
    { name: "Rockridge Costume Parade", neighborhood: "Rockridge" },
    { name: "Laurel District Spooky Stroll", neighborhood: "Laurel" }
  ];

  var DIA_DE_MUERTOS_EVENTS = [
    { name: "Fruitvale Día de los Muertos Festival", neighborhood: "Fruitvale" },
    { name: "Fruitvale Altar Walk", neighborhood: "Fruitvale" },
    { name: "Downtown Ofrenda Exhibition", neighborhood: "Downtown" },
    { name: "Lake Merritt Marigold Ceremony", neighborhood: "Lake Merritt" }
  ];

  var VETERANS_DAY_EVENTS = [
    { name: "Downtown Veterans Parade", neighborhood: "Downtown" },
    { name: "Jack London Veterans Memorial", neighborhood: "Jack London" },
    { name: "West Oakland Service Recognition", neighborhood: "West Oakland" }
  ];

  var OAKLAND_PRIDE_EVENTS = [
    { name: "Downtown Oakland Pride Parade", neighborhood: "Downtown" },
    { name: "Lake Merritt Pride Festival", neighborhood: "Lake Merritt" },
    { name: "Uptown Pride Block Party", neighborhood: "Uptown" },
    { name: "Jack London Rainbow Celebration", neighborhood: "Jack London" }
  ];

  var ART_SOUL_EVENTS = [
    { name: "Downtown Art & Soul Festival Main Stage", neighborhood: "Downtown" },
    { name: "Downtown Art & Soul Vendor Village", neighborhood: "Downtown" },
    { name: "Downtown Art & Soul Youth Zone", neighborhood: "Downtown" },
    { name: "Lake Merritt Art & Soul Overflow", neighborhood: "Lake Merritt" }
  ];

  var OPENING_DAY_EVENTS = [
    { name: "Jack London Opening Day Block Party", neighborhood: "Jack London" },
    { name: "Jack London Pre-Game Tailgate", neighborhood: "Jack London" },
    { name: "Downtown Baseball Fever Rally", neighborhood: "Downtown" },
    { name: "Lake Merritt Opening Day Picnic", neighborhood: "Lake Merritt" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  var FIRST_FRIDAY_EVENTS = [
    { name: "Uptown First Friday Art Walk", neighborhood: "Uptown" },
    { name: "KONO First Friday Gallery Hop", neighborhood: "KONO" },
    { name: "Temescal First Friday Art Stroll", neighborhood: "Temescal" },
    { name: "Jack London First Friday Waterfront", neighborhood: "Jack London" },
    { name: "Downtown First Friday Live Music", neighborhood: "Downtown" },
    { name: "Lake Merritt First Friday Art Market", neighborhood: "Lake Merritt" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  var CREATION_DAY_EVENTS = [
    { name: "Downtown Oakland Founders Day Ceremony", neighborhood: "Downtown" },
    { name: "Lake Merritt Creation Day Gathering", neighborhood: "Lake Merritt" },
    { name: "West Oakland Heritage Walk", neighborhood: "West Oakland" },
    { name: "Fruitvale Oakland Roots Festival", neighborhood: "Fruitvale" },
    { name: "Jack London History Tour", neighborhood: "Jack London" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  var SPORTS_BASE = [
    { name: "Jack London Pre-Game Block Party", neighborhood: "Jack London" },
    { name: "Downtown Sports Bar Crawl", neighborhood: "Downtown" },
    { name: "Lake Merritt Tailgate Gathering", neighborhood: "Lake Merritt" }
  ];

  var CHAMPIONSHIP_EVENTS = [
    { name: "Downtown Championship Watch Party", neighborhood: "Downtown" },
    { name: "Jack London Championship Rally", neighborhood: "Jack London" },
    { name: "Lake Merritt Title Celebration", neighborhood: "Lake Merritt" },
    { name: "Uptown Championship Fever", neighborhood: "Uptown" }
  ];

  var PLAYOFF_EVENTS = [
    { name: "Jack London Playoff Tailgate", neighborhood: "Jack London" },
    { name: "Downtown Playoff Watch Zone", neighborhood: "Downtown" },
    { name: "Lake Merritt Fan Gathering", neighborhood: "Lake Merritt" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  var HIGH_CULTURAL_EVENTS = [
    { name: "Uptown Cultural Showcase", neighborhood: "Uptown" },
    { name: "KONO Arts District Celebration", neighborhood: "KONO" },
    { name: "Downtown Cultural Festival", neighborhood: "Downtown" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT EVENT POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  var HIGH_ENGAGEMENT_EVENTS = [
    { name: "Lake Merritt Community Circle", neighborhood: "Lake Merritt" },
    { name: "West Oakland Neighborhood Assembly", neighborhood: "West Oakland" },
    { name: "Fruitvale Community Action Day", neighborhood: "Fruitvale" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD SELECTION POOL (weights preserved via addEvents_)
  // ═══════════════════════════════════════════════════════════════════════════

  // ───────────────────────────────────────────────────────────────────────────
  // HOLIDAY EVENTS - Highest priority
  // ───────────────────────────────────────────────────────────────────────────
  if (holiday === "Thanksgiving") addEvents_(THANKSGIVING_EVENTS, 2, ["source:holiday", "pool:Thanksgiving"]);
  if (holiday === "Holiday") addEvents_(HOLIDAY_EVENTS, 2, ["source:holiday", "pool:Holiday"]);
  if (holiday === "NewYearsEve") addEvents_(NEW_YEARS_EVE_EVENTS, 2, ["source:holiday", "pool:NewYearsEve"]);
  if (holiday === "NewYear") addEvents_(NEW_YEAR_EVENTS, 2, ["source:holiday", "pool:NewYear"]);
  if (holiday === "MLKDay") addEvents_(MLK_DAY_EVENTS, 2, ["source:holiday", "pool:MLKDay"]);
  if (holiday === "LunarNewYear") addEvents_(LUNAR_NEW_YEAR_EVENTS, 3, ["source:holiday", "pool:LunarNewYear"]);
  if (holiday === "Valentine") addEvents_(VALENTINE_EVENTS, 1, ["source:holiday", "pool:Valentine"]);
  if (holiday === "PresidentsDay") addEvents_(PRESIDENTS_DAY_EVENTS, 1, ["source:holiday", "pool:PresidentsDay"]);
  if (holiday === "StPatricksDay") addEvents_(ST_PATRICKS_EVENTS, 1, ["source:holiday", "pool:StPatricksDay"]);
  if (holiday === "Easter") addEvents_(EASTER_EVENTS, 1, ["source:holiday", "pool:Easter"]);
  if (holiday === "EarthDay") addEvents_(EARTH_DAY_EVENTS, 1, ["source:holiday", "pool:EarthDay"]);
  if (holiday === "CincoDeMayo") addEvents_(CINCO_DE_MAYO_EVENTS, 2, ["source:holiday", "pool:CincoDeMayo"]);
  if (holiday === "MothersDay") addEvents_(MOTHERS_DAY_EVENTS, 1, ["source:holiday", "pool:MothersDay"]);
  if (holiday === "MemorialDay") addEvents_(MEMORIAL_DAY_EVENTS, 1, ["source:holiday", "pool:MemorialDay"]);
  if (holiday === "Juneteenth") addEvents_(JUNETEENTH_EVENTS, 2, ["source:holiday", "pool:Juneteenth"]);
  if (holiday === "FathersDay") addEvents_(FATHERS_DAY_EVENTS, 1, ["source:holiday", "pool:FathersDay"]);
  if (holiday === "Independence") addEvents_(INDEPENDENCE_EVENTS, 2, ["source:holiday", "pool:Independence"]);
  if (holiday === "LaborDay") addEvents_(LABOR_DAY_EVENTS, 1, ["source:holiday", "pool:LaborDay"]);
  if (holiday === "Halloween") addEvents_(HALLOWEEN_EVENTS, 2, ["source:holiday", "pool:Halloween"]);
  if (holiday === "DiaDeMuertos") addEvents_(DIA_DE_MUERTOS_EVENTS, 2, ["source:holiday", "pool:DiaDeMuertos"]);
  if (holiday === "VeteransDay") addEvents_(VETERANS_DAY_EVENTS, 1, ["source:holiday", "pool:VeteransDay"]);
  if (holiday === "OaklandPride") addEvents_(OAKLAND_PRIDE_EVENTS, 3, ["source:holiday", "pool:OaklandPride"]);
  if (holiday === "ArtSoulFestival") addEvents_(ART_SOUL_EVENTS, 3, ["source:holiday", "pool:ArtSoulFestival"]);
  if (holiday === "OpeningDay") addEvents_(OPENING_DAY_EVENTS, 3, ["source:holiday", "pool:OpeningDay"]);

  // ───────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY
  // ───────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) addEvents_(FIRST_FRIDAY_EVENTS, 3, ["source:firstFriday", "pool:FirstFriday"]);

  // ───────────────────────────────────────────────────────────────────────────
  // CREATION DAY
  // ───────────────────────────────────────────────────────────────────────────
  if (isCreationDay) addEvents_(CREATION_DAY_EVENTS, 2, ["source:creationDay", "pool:CreationDay"]);

  // ───────────────────────────────────────────────────────────────────────────
  // SPORTS SEASON
  // ───────────────────────────────────────────────────────────────────────────
  if (sportsSeason === "championship") {
    addEvents_(CHAMPIONSHIP_EVENTS, 2, ["source:sports", "pool:Championship"]);
    addEvents_(SPORTS_BASE, 1, ["source:sports", "pool:SportsBase"]);
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    addEvents_(PLAYOFF_EVENTS, 1, ["source:sports", "pool:Playoffs"]);
    addEvents_(SPORTS_BASE, 1, ["source:sports", "pool:SportsBase"]);
  } else if (sportsSeason === "late-season") {
    addEvents_(SPORTS_BASE, 1, ["source:sports", "pool:SportsBase"]);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CULTURAL ACTIVITY / ENGAGEMENT
  // ───────────────────────────────────────────────────────────────────────────
  if (culturalActivity >= 1.4) addEvents_(HIGH_CULTURAL_EVENTS, 1, ["source:culture"]);
  if (communityEngagement >= 1.4) addEvents_(HIGH_ENGAGEMENT_EVENTS, 1, ["source:community"]);

  // ───────────────────────────────────────────────────────────────────────────
  // SEASON (if no holiday override)
  // ───────────────────────────────────────────────────────────────────────────
  if (holiday === "none") {
    if (season === "Spring") addEvents_(SPRING, 1, ["source:season", "season:Spring"]);
    if (season === "Summer") addEvents_(SUMMER, 1, ["source:season", "season:Summer"]);
    if (season === "Fall") addEvents_(FALL, 1, ["source:season", "season:Fall"]);
    if (season === "Winter") addEvents_(WINTER, 1, ["source:season", "season:Winter"]);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEATHER
  // ───────────────────────────────────────────────────────────────────────────
  if (weather.type === "fog") {
    addEvents_(FOG_EVENTS, 1, ["source:weather", "weather:fog"]);
  } else if (weather.impact >= 1.3 || weather.type === "rain") {
    addEvents_(RAIN_EVENTS, 1, ["source:weather", "weather:rain"]);
  } else if (holiday === "none") {
    addEvents_(CLEAR_EVENTS, 1, ["source:weather", "weather:clear"]);
  }

  if (weatherMood.primaryMood === "cozy") addEvents_(COZY_EVENTS, 1, ["source:weatherMood", "mood:cozy"]);
  if (weatherMood.perfectWeather && holiday === "none") addEvents_(PERFECT_WEATHER, 1, ["source:weatherMood", "mood:perfect"]);

  // ───────────────────────────────────────────────────────────────────────────
  // CHAOS / SENTIMENT / ECONOMY / NIGHTLIFE / PUBLIC SPACE
  // ───────────────────────────────────────────────────────────────────────────
  if (chaos.length >= 3) addEvents_(CHAOS_EVENTS, 1, ["source:chaos"]);
  if (sentiment >= 0.3) addEvents_(HIGH_SENTIMENT, 1, ["source:sentiment", "sentiment:high"]);
  if (sentiment <= -0.3) addEvents_(LOW_SENTIMENT, 1, ["source:sentiment", "sentiment:low"]);
  if (econMood >= 65) addEvents_(ECON_BOOM, 1, ["source:economy", "econ:boom"]);
  if (econMood <= 35) addEvents_(ECON_BUST, 1, ["source:economy", "econ:bust"]);
  if (nightlife >= 1.2) addEvents_(NIGHTLIFE_EVENTS, 1, ["source:nightlife"]);

  if (publicSpace >= 1.3) {
    addEvents_([{ name: "Lake Merritt Open Plaza Community Flow Event", neighborhood: "Lake Merritt" }], 1, ["source:publicSpace"]);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL POOL ARRAY
  // ═══════════════════════════════════════════════════════════════════════════
  var poolKeys = Object.keys(poolByName);
  var pool = [];
  for (var pi = 0; pi < poolKeys.length; pi++) {
    pool.push(poolByName[poolKeys[pi]]);
  }

  // Fallback
  if (pool.length === 0) {
    S.cityEvents = [];
    S.cityEventDetails = [];
    S.cityEventsCalendarContext = {
      holiday: holiday,
      holidayPriority: holidayPriority,
      isFirstFriday: isFirstFriday,
      isCreationDay: isCreationDay,
      sportsSeason: sportsSeason
    };
    ctx.summary = S;
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT COUNT (deterministic)
  // ═══════════════════════════════════════════════════════════════════════════
  var count = rng() < 0.3 ? 2 : 1;

  // Calendar increases event count
  if (holidayPriority === "major" || holidayPriority === "oakland") count = Math.max(count, 2);
  if (isFirstFriday) count = Math.max(count, 2);
  if (sportsSeason === "championship") count = 3;
  if (holiday === "OaklandPride" || holiday === "ArtSoulFestival") count = 3;

  // ═══════════════════════════════════════════════════════════════════════════
  // WEIGHTED SAMPLE WITHOUT REPLACEMENT (v2.4)
  // Mathematically correct weighted random selection
  // ═══════════════════════════════════════════════════════════════════════════
  function weightedSampleWithoutReplacement_(items, k) {
    var chosen = [];
    var work = [];
    for (var wi = 0; wi < items.length; wi++) {
      var e = items[wi];
      work.push({
        name: e.name,
        neighborhood: e.neighborhood,
        tags: Array.isArray(e.tags) ? e.tags.slice() : [],
        weight: (typeof e.weight === "number" && e.weight > 0) ? e.weight : 1
      });
    }

    k = Math.max(0, Math.min(k, work.length));

    for (var i = 0; i < k; i++) {
      var total = 0;
      for (var ti = 0; ti < work.length; ti++) {
        total += work[ti].weight;
      }

      var r = rng() * total;
      var idx = 0;
      for (; idx < work.length; idx++) {
        var w = work[idx].weight;
        if (r < w) break;
        r -= w;
      }
      // Guard against floating-point edge case where r doesn't drop below 0
      var picked = work.splice(Math.min(idx, work.length - 1), 1)[0];
      chosen.push(picked);
    }
    return chosen;
  }

  var selected = weightedSampleWithoutReplacement_(pool, count);

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT (compatible + richer details)
  // ═══════════════════════════════════════════════════════════════════════════
  S.cityEvents = [];
  for (var si = 0; si < selected.length; si++) {
    S.cityEvents.push(selected[si].name);
  }

  S.cityEventDetails = [];
  for (var di = 0; di < selected.length; di++) {
    var ev = selected[di];
    S.cityEventDetails.push({
      name: ev.name,
      neighborhood: ev.neighborhood,
      tags: ev.tags || calendarTags,
      weight: ev.weight
    });
  }

  S.cityEventsCalendarContext = {
    holiday: holiday,
    holidayPriority: holidayPriority,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason,
    eventCount: selected.length
  };

  ctx.summary = S;
}


/**
 * ============================================================================
 * CITY EVENTS REFERENCE
 * ============================================================================
 *
 * v2.4 CHANGES:
 * - Weight accumulation: Same event from multiple sources gets combined weight
 *   (no array duplication)
 * - Deterministic RNG: Pass ctx.rng function or ctx.config.rngSeed for
 *   reproducible results
 * - Event tags: Each event in cityEventDetails now has tags[] showing
 *   which pools contributed to its selection
 * - Removed pickRandomSet_ fallback to ensure weighted sampling is always used
 *
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 *
 * HOLIDAY EVENT POOLS:
 *
 * | Holiday | Events | Weight | Key Neighborhoods |
 * |---------|--------|--------|-------------------|
 * | Thanksgiving | 4 | 2 | Downtown, Lake Merritt, Fruitvale |
 * | Holiday | 5 | 2 | Downtown, Lake Merritt, Rockridge |
 * | NewYearsEve | 4 | 2 | Downtown, Jack London, Lake Merritt |
 * | MLKDay | 4 | 2 | Downtown, West Oakland, Fruitvale |
 * | LunarNewYear | 4 | 3 | Chinatown (3), Downtown |
 * | CincoDeMayo | 4 | 2 | Fruitvale (2), Downtown |
 * | Juneteenth | 4 | 2 | West Oakland, Downtown, Lake Merritt |
 * | Independence | 4 | 2 | Jack London, Lake Merritt, Downtown |
 * | Halloween | 5 | 2 | Lake Merritt, Temescal, Jack London |
 * | DiaDeMuertos | 4 | 2 | Fruitvale (2), Downtown |
 * | OaklandPride | 4 | 3 | Downtown, Lake Merritt, Uptown |
 * | ArtSoulFestival | 4 | 3 | Downtown (3), Lake Merritt |
 * | OpeningDay | 4 | 3 | Jack London (2), Downtown |
 *
 * FIRST FRIDAY (6 events, weight 3):
 * - Uptown, KONO, Temescal, Jack London, Downtown, Lake Merritt
 *
 * CREATION DAY (5 events, weight 2):
 * - Downtown, Lake Merritt, West Oakland, Fruitvale, Jack London
 *
 * SPORTS SEASON:
 * - Championship: 4 events (weight 2) + 3 base (weight 1)
 * - Playoffs: 3 events (weight 1) + 3 base (weight 1)
 * - Late-season: 3 base events (weight 1)
 *
 * EVENT COUNT:
 * - Base: 1-2 (30% chance of 2)
 * - Major/Oakland holiday: 2+
 * - First Friday: 2+
 * - Championship: 3
 * - OaklandPride/ArtSoulFestival: 3
 *
 * OUTPUT:
 * - cityEvents: Array<string> (names only, for backwards compatibility)
 * - cityEventDetails: Array<{name, neighborhood, tags, weight}>
 * - cityEventsCalendarContext: {holiday, holidayPriority, isFirstFriday,
 *     isCreationDay, sportsSeason, eventCount}
 *
 * DETERMINISTIC USAGE:
 *   // Option 1: Inject RNG function
 *   ctx.rng = mySeededRng;
 *
 *   // Option 2: Provide seed (XORed with cycleId for variation)
 *   ctx.config = { rngSeed: 12345 };
 *
 * ============================================================================
 */
