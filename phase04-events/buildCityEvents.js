/**
 * ============================================================================
 * buildCityEvents_ v2.3
 * ============================================================================
 *
 * World-aware city-event generator with GodWorld Calendar integration.
 *
 * v2.3 Enhancements:
 * - Expanded to 12 Oakland neighborhoods
 * - GodWorld Calendar integration (30+ holidays)
 * - Holiday-specific event pools
 * - First Friday arts events
 * - Creation Day community events
 * - Sports season events
 * - Cultural activity and community engagement effects
 * - Calendar context in output
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.2):
 * - Season, weather, chaos, sentiment
 * - Economic mood integration
 * - Nightlife volume
 * - Sports season (basic)
 * - Public spaces
 * 
 * ============================================================================
 */

function buildCityEvents_(ctx) {

  const S = ctx.summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const season = S.season;
  const weather = S.weather || { type: "clear", impact: 1 };
  const weatherMood = S.weatherMood || {};
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || {};
  const sentiment = dynamics.sentiment || 0;
  const publicSpace = dynamics.publicSpaces || 1;
  const nightlife = dynamics.nightlife || 1;
  const culturalActivity = dynamics.culturalActivity || 1;
  const communityEngagement = dynamics.communityEngagement || 1;
  const econMood = S.economicMood || 50;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE EVENT POOLS (Oakland - 12 neighborhoods)
  // ═══════════════════════════════════════════════════════════════════════════

  const SPRING = [
    { name: "Lake Merritt Blossom Walk", neighborhood: "Lake Merritt" },
    { name: "Temescal Spring Arts Pop-Up", neighborhood: "Temescal" },
    { name: "Rockridge Garden Market", neighborhood: "Rockridge" },
    { name: "Fruitvale Community Bloom Festival", neighborhood: "Fruitvale" },
    { name: "Uptown Spring Gallery Opening", neighborhood: "Uptown" },
    { name: "KONO Flower Market", neighborhood: "KONO" }
  ];

  const SUMMER = [
    { name: "Jack London Estuary Jazz Fest", neighborhood: "Jack London" },
    { name: "Lake Merritt Concert Series", neighborhood: "Lake Merritt" },
    { name: "Fruitvale Street Food Carnival", neighborhood: "Fruitvale" },
    { name: "West Oakland Waterfront Night Market", neighborhood: "West Oakland" },
    { name: "Uptown Summer Block Party", neighborhood: "Uptown" },
    { name: "Piedmont Ave Sidewalk Sale", neighborhood: "Piedmont Ave" }
  ];

  const FALL = [
    { name: "Temescal Harvest Fair", neighborhood: "Temescal" },
    { name: "Rockridge Autumn Walk", neighborhood: "Rockridge" },
    { name: "Laurel District Craft Expo", neighborhood: "Laurel" },
    { name: "Downtown Oakland Arts Month", neighborhood: "Downtown" },
    { name: "KONO Fall Festival", neighborhood: "KONO" },
    { name: "Chinatown Autumn Moon Festival", neighborhood: "Chinatown" }
  ];

  const WINTER = [
    { name: "Lake Merritt Lantern Parade", neighborhood: "Lake Merritt" },
    { name: "Downtown Winter Festival", neighborhood: "Downtown" },
    { name: "Jack London Cozy Nights Film Series", neighborhood: "Jack London" },
    { name: "Temescal Holiday Market", neighborhood: "Temescal" },
    { name: "Piedmont Ave Winter Walk", neighborhood: "Piedmont Ave" },
    { name: "Chinatown Winter Lights", neighborhood: "Chinatown" }
  ];

  const CLEAR_EVENTS = [
    { name: "Downtown Plaza Noon Music Session", neighborhood: "Downtown" },
    { name: "Lake Merritt Open-Air Book Market", neighborhood: "Lake Merritt" },
    { name: "Temescal Street Vendors Block", neighborhood: "Temescal" },
    { name: "Jack London Waterfront Stroll", neighborhood: "Jack London" },
    { name: "Uptown Outdoor Gallery", neighborhood: "Uptown" }
  ];

  const RAIN_EVENTS = [
    { name: "Rockridge Heated Tent Pop-Up Cafe", neighborhood: "Rockridge" },
    { name: "Downtown Indoor Arts Night", neighborhood: "Downtown" },
    { name: "Temescal Shelter-Hub Spoken Word", neighborhood: "Temescal" },
    { name: "Jack London Warehouse Gallery Opening", neighborhood: "Jack London" },
    { name: "KONO Rainy Day Art Walk", neighborhood: "KONO" }
  ];

  const FOG_EVENTS = [
    { name: "Lake Merritt Fog Walk Photography Tour", neighborhood: "Lake Merritt" },
    { name: "Jack London Misty Morning Coffee Club", neighborhood: "Jack London" },
    { name: "West Oakland Industrial Fog Art Exhibit", neighborhood: "West Oakland" }
  ];

  const CHAOS_EVENTS = [
    { name: "Downtown Civic Response Meeting", neighborhood: "Downtown" },
    { name: "Fruitvale Emergency Town Briefing", neighborhood: "Fruitvale" },
    { name: "West Oakland Neighborhood Stabilization Panel", neighborhood: "West Oakland" }
  ];

  const HIGH_SENTIMENT = [
    { name: "Lake Merritt Community Joy Parade", neighborhood: "Lake Merritt" },
    { name: "Fruitvale Good News Gathering", neighborhood: "Fruitvale" },
    { name: "Temescal Volunteer Boost Rally", neighborhood: "Temescal" }
  ];

  const LOW_SENTIMENT = [
    { name: "Downtown Civic Concern Forum", neighborhood: "Downtown" },
    { name: "West Oakland Neighborhood Watch Meet", neighborhood: "West Oakland" },
    { name: "Fruitvale Public Dialogue Circle", neighborhood: "Fruitvale" }
  ];

  const NIGHTLIFE_EVENTS = [
    { name: "Jack London Neon Terrace DJ Night", neighborhood: "Jack London" },
    { name: "Downtown Rooftop Mixer", neighborhood: "Downtown" },
    { name: "Lake Merritt After-Dark Cultural Showcase", neighborhood: "Lake Merritt" },
    { name: "Temescal Late Night Gallery Walk", neighborhood: "Temescal" },
    { name: "Uptown Club Crawl", neighborhood: "Uptown" }
  ];

  const ECON_BOOM = [
    { name: "Downtown Business Gala", neighborhood: "Downtown" },
    { name: "Jack London Startup Showcase", neighborhood: "Jack London" },
    { name: "Rockridge Investment Summit", neighborhood: "Rockridge" }
  ];

  const ECON_BUST = [
    { name: "Fruitvale Job Fair", neighborhood: "Fruitvale" },
    { name: "West Oakland Community Resource Day", neighborhood: "West Oakland" },
    { name: "Downtown Workers Rights Forum", neighborhood: "Downtown" }
  ];

  const COZY_EVENTS = [
    { name: "Laurel Fireside Reading Night", neighborhood: "Laurel" },
    { name: "Rockridge Candlelit Wine Tasting", neighborhood: "Rockridge" },
    { name: "Temescal Cozy Crafts Workshop", neighborhood: "Temescal" }
  ];

  const PERFECT_WEATHER = [
    { name: "Lake Merritt Picnic Festival", neighborhood: "Lake Merritt" },
    { name: "Jack London Outdoor Yoga Session", neighborhood: "Jack London" },
    { name: "Temescal Street Fair", neighborhood: "Temescal" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY EVENT POOLS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════

  const THANKSGIVING_EVENTS = [
    { name: "Downtown Thanksgiving Parade", neighborhood: "Downtown" },
    { name: "Lake Merritt Gratitude Gathering", neighborhood: "Lake Merritt" },
    { name: "Fruitvale Community Feast", neighborhood: "Fruitvale" },
    { name: "West Oakland Turkey Trot", neighborhood: "West Oakland" }
  ];

  const HOLIDAY_EVENTS = [
    { name: "Downtown Holiday Tree Lighting", neighborhood: "Downtown" },
    { name: "Lake Merritt Festival of Lights", neighborhood: "Lake Merritt" },
    { name: "Rockridge Holiday Stroll", neighborhood: "Rockridge" },
    { name: "Temescal Winter Wonderland", neighborhood: "Temescal" },
    { name: "Jack London Holiday Market", neighborhood: "Jack London" }
  ];

  const NEW_YEARS_EVE_EVENTS = [
    { name: "Downtown Oakland Countdown", neighborhood: "Downtown" },
    { name: "Jack London Waterfront Fireworks", neighborhood: "Jack London" },
    { name: "Lake Merritt Midnight Celebration", neighborhood: "Lake Merritt" },
    { name: "Uptown New Year's Eve Party", neighborhood: "Uptown" }
  ];

  const NEW_YEAR_EVENTS = [
    { name: "Lake Merritt Polar Plunge", neighborhood: "Lake Merritt" },
    { name: "Downtown New Year's Day Parade", neighborhood: "Downtown" },
    { name: "Temescal Resolution Run", neighborhood: "Temescal" }
  ];

  const MLK_DAY_EVENTS = [
    { name: "Downtown MLK March", neighborhood: "Downtown" },
    { name: "West Oakland Dream Rally", neighborhood: "West Oakland" },
    { name: "Fruitvale Unity Gathering", neighborhood: "Fruitvale" },
    { name: "Lake Merritt Peace Walk", neighborhood: "Lake Merritt" }
  ];

  const LUNAR_NEW_YEAR_EVENTS = [
    { name: "Chinatown Lunar New Year Parade", neighborhood: "Chinatown" },
    { name: "Chinatown Lion Dance Festival", neighborhood: "Chinatown" },
    { name: "Chinatown Firecracker Ceremony", neighborhood: "Chinatown" },
    { name: "Downtown Asian Heritage Celebration", neighborhood: "Downtown" }
  ];

  const VALENTINE_EVENTS = [
    { name: "Lake Merritt Sweetheart Stroll", neighborhood: "Lake Merritt" },
    { name: "Rockridge Romance Walk", neighborhood: "Rockridge" },
    { name: "Jack London Couples Cruise", neighborhood: "Jack London" }
  ];

  const PRESIDENTS_DAY_EVENTS = [
    { name: "Downtown Presidents Day Observance", neighborhood: "Downtown" },
    { name: "Lake Merritt History Walk", neighborhood: "Lake Merritt" }
  ];

  const ST_PATRICKS_EVENTS = [
    { name: "Jack London St. Patrick's Pub Crawl", neighborhood: "Jack London" },
    { name: "Downtown Green Parade", neighborhood: "Downtown" },
    { name: "Temescal Irish Music Night", neighborhood: "Temescal" }
  ];

  const EASTER_EVENTS = [
    { name: "Lake Merritt Easter Egg Hunt", neighborhood: "Lake Merritt" },
    { name: "Rockridge Spring Celebration", neighborhood: "Rockridge" },
    { name: "Fruitvale Easter Festival", neighborhood: "Fruitvale" }
  ];

  const EARTH_DAY_EVENTS = [
    { name: "Lake Merritt Environmental Fair", neighborhood: "Lake Merritt" },
    { name: "West Oakland Sustainability Summit", neighborhood: "West Oakland" },
    { name: "Temescal Green Market", neighborhood: "Temescal" }
  ];

  const CINCO_DE_MAYO_EVENTS = [
    { name: "Fruitvale Cinco de Mayo Festival", neighborhood: "Fruitvale" },
    { name: "Fruitvale Mariachi Parade", neighborhood: "Fruitvale" },
    { name: "Downtown Cinco Celebration", neighborhood: "Downtown" },
    { name: "Lake Merritt Mexican Heritage Day", neighborhood: "Lake Merritt" }
  ];

  const MOTHERS_DAY_EVENTS = [
    { name: "Rockridge Mother's Day Brunch Walk", neighborhood: "Rockridge" },
    { name: "Lake Merritt Family Picnic", neighborhood: "Lake Merritt" },
    { name: "Piedmont Ave Mother's Day Market", neighborhood: "Piedmont Ave" }
  ];

  const MEMORIAL_DAY_EVENTS = [
    { name: "Downtown Memorial Ceremony", neighborhood: "Downtown" },
    { name: "Mountain View Cemetery Observance", neighborhood: "Piedmont Ave" },
    { name: "Jack London Veterans Tribute", neighborhood: "Jack London" }
  ];

  const JUNETEENTH_EVENTS = [
    { name: "West Oakland Juneteenth Festival", neighborhood: "West Oakland" },
    { name: "Downtown Freedom Parade", neighborhood: "Downtown" },
    { name: "Lake Merritt Liberation Celebration", neighborhood: "Lake Merritt" },
    { name: "Fruitvale Juneteenth Block Party", neighborhood: "Fruitvale" }
  ];

  const FATHERS_DAY_EVENTS = [
    { name: "Lake Merritt Father's Day BBQ", neighborhood: "Lake Merritt" },
    { name: "Jack London Dad's Day Out", neighborhood: "Jack London" },
    { name: "Temescal Father-Child Festival", neighborhood: "Temescal" }
  ];

  const INDEPENDENCE_EVENTS = [
    { name: "Jack London Fourth of July Fireworks", neighborhood: "Jack London" },
    { name: "Lake Merritt Independence Celebration", neighborhood: "Lake Merritt" },
    { name: "Downtown Patriotic Parade", neighborhood: "Downtown" },
    { name: "Temescal Red White Blue Block Party", neighborhood: "Temescal" }
  ];

  const LABOR_DAY_EVENTS = [
    { name: "Downtown Labor Day Parade", neighborhood: "Downtown" },
    { name: "West Oakland Workers Festival", neighborhood: "West Oakland" },
    { name: "Jack London End of Summer Bash", neighborhood: "Jack London" }
  ];

  const HALLOWEEN_EVENTS = [
    { name: "Lake Merritt Ghost Walk", neighborhood: "Lake Merritt" },
    { name: "Temescal Trick-or-Treat Street", neighborhood: "Temescal" },
    { name: "Jack London Halloween Haunted Pier", neighborhood: "Jack London" },
    { name: "Rockridge Costume Parade", neighborhood: "Rockridge" },
    { name: "Laurel District Spooky Stroll", neighborhood: "Laurel" }
  ];

  const DIA_DE_MUERTOS_EVENTS = [
    { name: "Fruitvale Día de los Muertos Festival", neighborhood: "Fruitvale" },
    { name: "Fruitvale Altar Walk", neighborhood: "Fruitvale" },
    { name: "Downtown Ofrenda Exhibition", neighborhood: "Downtown" },
    { name: "Lake Merritt Marigold Ceremony", neighborhood: "Lake Merritt" }
  ];

  const VETERANS_DAY_EVENTS = [
    { name: "Downtown Veterans Parade", neighborhood: "Downtown" },
    { name: "Jack London Veterans Memorial", neighborhood: "Jack London" },
    { name: "West Oakland Service Recognition", neighborhood: "West Oakland" }
  ];

  const OAKLAND_PRIDE_EVENTS = [
    { name: "Downtown Oakland Pride Parade", neighborhood: "Downtown" },
    { name: "Lake Merritt Pride Festival", neighborhood: "Lake Merritt" },
    { name: "Uptown Pride Block Party", neighborhood: "Uptown" },
    { name: "Jack London Rainbow Celebration", neighborhood: "Jack London" }
  ];

  const ART_SOUL_EVENTS = [
    { name: "Downtown Art & Soul Festival Main Stage", neighborhood: "Downtown" },
    { name: "Downtown Art & Soul Vendor Village", neighborhood: "Downtown" },
    { name: "Downtown Art & Soul Youth Zone", neighborhood: "Downtown" },
    { name: "Lake Merritt Art & Soul Overflow", neighborhood: "Lake Merritt" }
  ];

  const OPENING_DAY_EVENTS = [
    { name: "Jack London Opening Day Block Party", neighborhood: "Jack London" },
    { name: "Jack London Pre-Game Tailgate", neighborhood: "Jack London" },
    { name: "Downtown Baseball Fever Rally", neighborhood: "Downtown" },
    { name: "Lake Merritt Opening Day Picnic", neighborhood: "Lake Merritt" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY EVENT POOLS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════

  const FIRST_FRIDAY_EVENTS = [
    { name: "Uptown First Friday Art Walk", neighborhood: "Uptown" },
    { name: "KONO First Friday Gallery Hop", neighborhood: "KONO" },
    { name: "Temescal First Friday Art Stroll", neighborhood: "Temescal" },
    { name: "Jack London First Friday Waterfront", neighborhood: "Jack London" },
    { name: "Downtown First Friday Live Music", neighborhood: "Downtown" },
    { name: "Lake Merritt First Friday Art Market", neighborhood: "Lake Merritt" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY EVENT POOLS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════

  const CREATION_DAY_EVENTS = [
    { name: "Downtown Oakland Founders Day Ceremony", neighborhood: "Downtown" },
    { name: "Lake Merritt Creation Day Gathering", neighborhood: "Lake Merritt" },
    { name: "West Oakland Heritage Walk", neighborhood: "West Oakland" },
    { name: "Fruitvale Oakland Roots Festival", neighborhood: "Fruitvale" },
    { name: "Jack London History Tour", neighborhood: "Jack London" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON EVENT POOLS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════

  const SPORTS_BASE = [
    { name: "Jack London Pre-Game Block Party", neighborhood: "Jack London" },
    { name: "Downtown Sports Bar Crawl", neighborhood: "Downtown" },
    { name: "Lake Merritt Tailgate Gathering", neighborhood: "Lake Merritt" }
  ];

  const CHAMPIONSHIP_EVENTS = [
    { name: "Downtown Championship Watch Party", neighborhood: "Downtown" },
    { name: "Jack London Championship Rally", neighborhood: "Jack London" },
    { name: "Lake Merritt Title Celebration", neighborhood: "Lake Merritt" },
    { name: "Uptown Championship Fever", neighborhood: "Uptown" }
  ];

  const PLAYOFF_EVENTS = [
    { name: "Jack London Playoff Tailgate", neighborhood: "Jack London" },
    { name: "Downtown Playoff Watch Zone", neighborhood: "Downtown" },
    { name: "Lake Merritt Fan Gathering", neighborhood: "Lake Merritt" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY EVENT POOLS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════

  const HIGH_CULTURAL_EVENTS = [
    { name: "Uptown Cultural Showcase", neighborhood: "Uptown" },
    { name: "KONO Arts District Celebration", neighborhood: "KONO" },
    { name: "Downtown Cultural Festival", neighborhood: "Downtown" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT EVENT POOLS (v2.3)
  // ═══════════════════════════════════════════════════════════════════════════

  const HIGH_ENGAGEMENT_EVENTS = [
    { name: "Lake Merritt Community Circle", neighborhood: "Lake Merritt" },
    { name: "West Oakland Neighborhood Assembly", neighborhood: "West Oakland" },
    { name: "Fruitvale Community Action Day", neighborhood: "Fruitvale" }
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD SELECTION POOL
  // ═══════════════════════════════════════════════════════════════════════════

  let pool = [];

  // ───────────────────────────────────────────────────────────────────────────
  // HOLIDAY EVENTS (v2.3) - Highest priority
  // ───────────────────────────────────────────────────────────────────────────

  if (holiday === "Thanksgiving") {
    pool.push(...THANKSGIVING_EVENTS, ...THANKSGIVING_EVENTS);
  }
  if (holiday === "Holiday") {
    pool.push(...HOLIDAY_EVENTS, ...HOLIDAY_EVENTS);
  }
  if (holiday === "NewYearsEve") {
    pool.push(...NEW_YEARS_EVE_EVENTS, ...NEW_YEARS_EVE_EVENTS);
  }
  if (holiday === "NewYear") {
    pool.push(...NEW_YEAR_EVENTS, ...NEW_YEAR_EVENTS);
  }
  if (holiday === "MLKDay") {
    pool.push(...MLK_DAY_EVENTS, ...MLK_DAY_EVENTS);
  }
  if (holiday === "LunarNewYear") {
    pool.push(...LUNAR_NEW_YEAR_EVENTS, ...LUNAR_NEW_YEAR_EVENTS, ...LUNAR_NEW_YEAR_EVENTS);
  }
  if (holiday === "Valentine") {
    pool.push(...VALENTINE_EVENTS);
  }
  if (holiday === "PresidentsDay") {
    pool.push(...PRESIDENTS_DAY_EVENTS);
  }
  if (holiday === "StPatricksDay") {
    pool.push(...ST_PATRICKS_EVENTS);
  }
  if (holiday === "Easter") {
    pool.push(...EASTER_EVENTS);
  }
  if (holiday === "EarthDay") {
    pool.push(...EARTH_DAY_EVENTS);
  }
  if (holiday === "CincoDeMayo") {
    pool.push(...CINCO_DE_MAYO_EVENTS, ...CINCO_DE_MAYO_EVENTS);
  }
  if (holiday === "MothersDay") {
    pool.push(...MOTHERS_DAY_EVENTS);
  }
  if (holiday === "MemorialDay") {
    pool.push(...MEMORIAL_DAY_EVENTS);
  }
  if (holiday === "Juneteenth") {
    pool.push(...JUNETEENTH_EVENTS, ...JUNETEENTH_EVENTS);
  }
  if (holiday === "FathersDay") {
    pool.push(...FATHERS_DAY_EVENTS);
  }
  if (holiday === "Independence") {
    pool.push(...INDEPENDENCE_EVENTS, ...INDEPENDENCE_EVENTS);
  }
  if (holiday === "LaborDay") {
    pool.push(...LABOR_DAY_EVENTS);
  }
  if (holiday === "Halloween") {
    pool.push(...HALLOWEEN_EVENTS, ...HALLOWEEN_EVENTS);
  }
  if (holiday === "DiaDeMuertos") {
    pool.push(...DIA_DE_MUERTOS_EVENTS, ...DIA_DE_MUERTOS_EVENTS);
  }
  if (holiday === "VeteransDay") {
    pool.push(...VETERANS_DAY_EVENTS);
  }
  if (holiday === "OaklandPride") {
    pool.push(...OAKLAND_PRIDE_EVENTS, ...OAKLAND_PRIDE_EVENTS, ...OAKLAND_PRIDE_EVENTS);
  }
  if (holiday === "ArtSoulFestival") {
    pool.push(...ART_SOUL_EVENTS, ...ART_SOUL_EVENTS, ...ART_SOUL_EVENTS);
  }
  if (holiday === "OpeningDay") {
    pool.push(...OPENING_DAY_EVENTS, ...OPENING_DAY_EVENTS, ...OPENING_DAY_EVENTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY (v2.3)
  // ───────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    pool.push(...FIRST_FRIDAY_EVENTS, ...FIRST_FRIDAY_EVENTS, ...FIRST_FRIDAY_EVENTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATION DAY (v2.3)
  // ───────────────────────────────────────────────────────────────────────────
  if (isCreationDay) {
    pool.push(...CREATION_DAY_EVENTS, ...CREATION_DAY_EVENTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SPORTS SEASON (v2.3)
  // ───────────────────────────────────────────────────────────────────────────
  if (sportsSeason === "championship") {
    pool.push(...CHAMPIONSHIP_EVENTS, ...CHAMPIONSHIP_EVENTS, ...SPORTS_BASE);
  } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
    pool.push(...PLAYOFF_EVENTS, ...SPORTS_BASE);
  } else if (sportsSeason === "late-season") {
    pool.push(...SPORTS_BASE);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CULTURAL ACTIVITY (v2.3)
  // ───────────────────────────────────────────────────────────────────────────
  if (culturalActivity >= 1.4) {
    pool.push(...HIGH_CULTURAL_EVENTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COMMUNITY ENGAGEMENT (v2.3)
  // ───────────────────────────────────────────────────────────────────────────
  if (communityEngagement >= 1.4) {
    pool.push(...HIGH_ENGAGEMENT_EVENTS);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SEASON (if no holiday override)
  // ───────────────────────────────────────────────────────────────────────────
  if (holiday === "none") {
    if (season === "Spring") pool.push(...SPRING);
    if (season === "Summer") pool.push(...SUMMER);
    if (season === "Fall") pool.push(...FALL);
    if (season === "Winter") pool.push(...WINTER);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEATHER
  // ───────────────────────────────────────────────────────────────────────────
  if (weather.type === "fog") {
    pool.push(...FOG_EVENTS);
  } else if (weather.impact >= 1.3 || weather.type === "rain") {
    pool.push(...RAIN_EVENTS);
  } else if (holiday === "none") {
    pool.push(...CLEAR_EVENTS);
  }

  // Weather mood
  if (weatherMood.primaryMood === 'cozy') pool.push(...COZY_EVENTS);
  if (weatherMood.perfectWeather && holiday === "none") pool.push(...PERFECT_WEATHER);

  // ───────────────────────────────────────────────────────────────────────────
  // CHAOS
  // ───────────────────────────────────────────────────────────────────────────
  if (chaos.length >= 3) pool.push(...CHAOS_EVENTS);

  // ───────────────────────────────────────────────────────────────────────────
  // SENTIMENT
  // ───────────────────────────────────────────────────────────────────────────
  if (sentiment >= 0.3) pool.push(...HIGH_SENTIMENT);
  if (sentiment <= -0.3) pool.push(...LOW_SENTIMENT);

  // ───────────────────────────────────────────────────────────────────────────
  // ECONOMIC MOOD
  // ───────────────────────────────────────────────────────────────────────────
  if (econMood >= 65) pool.push(...ECON_BOOM);
  if (econMood <= 35) pool.push(...ECON_BUST);

  // ───────────────────────────────────────────────────────────────────────────
  // NIGHTLIFE
  // ───────────────────────────────────────────────────────────────────────────
  if (nightlife >= 1.2) pool.push(...NIGHTLIFE_EVENTS);

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC SPACE DENSITY
  // ───────────────────────────────────────────────────────────────────────────
  if (publicSpace >= 1.3) {
    pool.push({ name: "Lake Merritt Open Plaza Community Flow Event", neighborhood: "Lake Merritt" });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP AND SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  // Cleanup duplicates by name
  pool = [...new Map(pool.map(e => [e.name, e])).values()];

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

  // Number of events chosen (v2.3: more events for special occasions)
  let count = Math.random() < 0.3 ? 2 : 1;
  
  // Calendar increases event count
  if (holidayPriority === "major" || holidayPriority === "oakland") count = Math.max(count, 2);
  if (isFirstFriday) count = Math.max(count, 2);
  if (sportsSeason === "championship") count = 3;
  if (holiday === "OaklandPride" || holiday === "ArtSoulFestival") count = 3;
  
  const selected = typeof pickRandomSet_ === 'function'
    ? pickRandomSet_(pool, count)
    : pool.sort(() => Math.random() - 0.5).slice(0, count);

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  // Store both formats for compatibility
  S.cityEvents = selected.map(e => e.name);
  S.cityEventDetails = selected;
  
  // v2.3: Calendar context
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
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 * 
 * HOLIDAY EVENT POOLS (v2.3):
 * 
 * | Holiday | Events | Key Neighborhoods |
 * |---------|--------|-------------------|
 * | Thanksgiving | 4 | Downtown, Lake Merritt, Fruitvale |
 * | Holiday | 5 | Downtown, Lake Merritt, Rockridge |
 * | NewYearsEve | 4 | Downtown, Jack London, Lake Merritt |
 * | MLKDay | 4 | Downtown, West Oakland, Fruitvale |
 * | LunarNewYear | 4 | Chinatown (3), Downtown |
 * | CincoDeMayo | 4 | Fruitvale (2), Downtown |
 * | Juneteenth | 4 | West Oakland, Downtown, Lake Merritt |
 * | Independence | 4 | Jack London, Lake Merritt, Downtown |
 * | Halloween | 5 | Lake Merritt, Temescal, Jack London |
 * | DiaDeMuertos | 4 | Fruitvale (2), Downtown |
 * | OaklandPride | 4 | Downtown, Lake Merritt, Uptown |
 * | ArtSoulFestival | 4 | Downtown (3), Lake Merritt |
 * | OpeningDay | 4 | Jack London (2), Downtown |
 * 
 * FIRST FRIDAY (6 events):
 * - Uptown, KONO, Temescal, Jack London, Downtown, Lake Merritt
 * 
 * CREATION DAY (5 events):
 * - Downtown, Lake Merritt, West Oakland, Fruitvale, Jack London
 * 
 * SPORTS SEASON:
 * - Championship: 4 events + 3 base
 * - Playoffs: 3 events + 3 base
 * - Late-season: 3 base events
 * 
 * EVENT COUNT:
 * - Base: 1-2
 * - Major/Oakland holiday: 2
 * - First Friday: 2
 * - Championship: 3
 * - OaklandPride/ArtSoulFestival: 3
 * 
 * OUTPUT:
 * - cityEvents: Array<string> (names)
 * - cityEventDetails: Array<{name, neighborhood}>
 * - cityEventsCalendarContext: {holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason, eventCount}
 * 
 * ============================================================================
 */