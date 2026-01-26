/**
 * ============================================================================
 * buildEveningMedia_ v2.3
 * ============================================================================
 *
 * World-aware evening media selection with GodWorld Calendar integration.
 *
 * v2.3 Changes:
 * - ES5 compatible (var instead of const/let, no arrow functions)
 * - Replaced spread operator with concat()
 * - Replaced Set deduplication with manual loop
 * - Defensive guards for ctx and ctx.summary
 *
 * v2.2 Enhancements:
 * - Full GodWorld Calendar integration (30+ holidays)
 * - Holiday-specific TV, movie, and streaming pools
 * - First Friday arts programming
 * - Creation Day community programming
 * - Sports season broadcast enhancements
 * - Cultural activity influences programming
 * - Community engagement affects content selection
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Season, weather, chaos, sentiment
 * - Economic mood integration
 * - Sports broadcasts
 *
 * ============================================================================
 */

function buildEveningMedia_(ctx) {

  // Defensive guard
  if (!ctx || !ctx.summary) {
    if (ctx) ctx.summary = {};
    else return;
  }

  var S = ctx.summary;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var season = S.season;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || {};
  var sentiment = dynamics.sentiment || 0;
  var culturalActivity = dynamics.culturalActivity || 1;
  var communityEngagement = dynamics.communityEngagement || 1;
  var sports = S.eveningSports || "";
  var econMood = S.economicMood || 50;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";

  // Helper for random pick
  var pickRandom = function(arr) {
    if (typeof pickRandom_ === 'function') return pickRandom_(arr);
    return arr[Math.floor(Math.random() * arr.length)];
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE MEDIA POOLS
  // ═══════════════════════════════════════════════════════════════════════════

  // TV Pools
  var tvBase = ["The Beacon", "Deep City", "Family Circuit", "Metro Nights", "Quiet Line"];
  var tvDrama = ["Iron District", "Seaboard Unit", "Eastward Echo", "Oakland Stories"];
  var tvComedy = ["Warm House", "The Neighbors", "Weekend Kids", "Lake Merritt Laughs"];
  var tvChaos = ["Breaking Bulletin", "Crisis Desk", "Late Shift Live", "Bay Area Alert"];
  var tvCozy = ["Fireside Hour", "Comfort Kitchen", "Slow Evenings"];
  var tvEcon = ["Market Watch", "Business Brief", "Economic Outlook"];

  // Movie Pools
  var moviesBase = ["Iron Streets", "Last Horizon", "Prime Heat", "Silver Orbit", "Fading Harbor"];
  var moviesAction = ["Glassfire", "Night Voltage", "Strikepoint"];
  var moviesDrama = ["North Dock", "Blue Lantern", "Paper City"];
  var moviesRain = ["Umbrella Line", "Fog Harbor", "Storm Window"];
  var moviesComedy = ["Weekend Warriors", "Office Chaos", "Family Reunion"];
  var moviesUplifting = ["Rising Star", "Second Chance", "New Beginnings"];

  // Streaming Pools
  var streamingBase = ["documentary spike", "crime-drama rotation", "sitcom rebound"];
  var streamingCalm = ["slow-burn drama", "nature series", "comfort comedy"];
  var streamingChaos = ["breaking-news loop", "political commentary surge"];
  var streamingCozy = ["comfort rewatch", "classic films", "feel-good series"];
  var streamingBudget = ["free-tier binge", "ad-supported marathon"];

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY MEDIA POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  var holidayMedia = {
    "Thanksgiving": {
      tv: ["Thanksgiving Parade", "Family Feast Special", "Turkey Day Football", "Gratitude Hour"],
      movies: ["Home for the Holidays", "Thankful Hearts", "Harvest Moon", "Family Table"],
      streaming: "family marathon"
    },
    "Holiday": {
      tv: ["Holiday Specials", "Winter Wonderland", "Classic Christmas", "Season's Greetings"],
      movies: ["Snowfall Dreams", "Holiday Magic", "Winter's Gift", "Miracle Season"],
      streaming: "holiday classics marathon"
    },
    "NewYear": {
      tv: ["New Year's Day Parade", "Fresh Start Special", "Year in Review"],
      movies: ["New Beginnings", "Fresh Chapter", "Resolution Road"],
      streaming: "feel-good new starts"
    },
    "NewYearsEve": {
      tv: ["Countdown Live", "New Year's Eve Special", "Bay Area Ball Drop", "Midnight Celebration"],
      movies: ["When the Ball Drops", "Last Night", "Midnight Kiss"],
      streaming: "party playlist"
    },
    "Independence": {
      tv: ["Fourth of July Fireworks", "Patriotic Special", "Independence Day Parade"],
      movies: ["Summer of Freedom", "Stars and Stripes", "American Dream"],
      streaming: "summer blockbusters"
    },
    "MLKDay": {
      tv: ["Dream Remembered", "Civil Rights Special", "Legacy Hour", "Unity March Coverage"],
      movies: ["March to Freedom", "Voice of Change", "Dream Forward"],
      streaming: "civil rights documentaries"
    },
    "Juneteenth": {
      tv: ["Freedom Day Special", "Juneteenth Celebration", "Heritage Hour"],
      movies: ["Liberation Day", "Ancestors' Dream", "Freedom Ring"],
      streaming: "Black excellence showcase"
    },
    "CincoDeMayo": {
      tv: ["Cinco Celebration", "Fiesta Oakland", "Cultural Pride Hour"],
      movies: ["Cinco Stories", "Border Dreams", "Familia"],
      streaming: "Latin cinema spotlight"
    },
    "DiaDeMuertos": {
      tv: ["Día de los Muertos Special", "Remembrance Hour", "Altar Stories"],
      movies: ["Beyond the Veil", "Marigold Path", "Ancestor's Return"],
      streaming: "animated favorites marathon"
    },
    "LunarNewYear": {
      tv: ["Lunar New Year Parade", "Year of Celebration", "Chinatown Special"],
      movies: ["Dragon Dance", "New Year Fortune", "Red Envelope"],
      streaming: "Asian cinema showcase"
    },
    "Halloween": {
      tv: ["Halloween Horror Night", "Spooky Special", "Monster Marathon"],
      movies: ["Shadow House", "October Dark", "Trick or Terror"],
      streaming: "horror movie marathon"
    },
    "Valentine": {
      tv: ["Love Stories", "Romance Hour", "Valentine Special"],
      movies: ["Heart's Desire", "Love in Oakland", "Perfect Match"],
      streaming: "romantic comedies"
    },
    "Easter": {
      tv: ["Easter Special", "Spring Celebration", "Family Sunday"],
      movies: ["Spring Awakening", "Renewal", "Family Traditions"],
      streaming: "family films"
    },
    "MemorialDay": {
      tv: ["Memorial Tribute", "Honor Our Heroes", "Remembrance Special"],
      movies: ["Service and Sacrifice", "Brothers in Arms", "Coming Home"],
      streaming: "war documentaries"
    },
    "LaborDay": {
      tv: ["Labor Day Special", "Worker's Pride", "End of Summer"],
      movies: ["Blue Collar Dreams", "Working Class", "Final Summer"],
      streaming: "end-of-summer binge"
    },
    "VeteransDay": {
      tv: ["Veterans Tribute", "Service Stories", "Honor Special"],
      movies: ["The Long Road Home", "Uniform Pride", "Thank You for Service"],
      streaming: "military documentaries"
    },
    "OpeningDay": {
      tv: ["Opening Day Live", "Baseball's Back", "First Pitch Special", "A's Preview"],
      movies: ["Diamond Dreams", "Opening Day", "Field of Dreams"],
      streaming: "baseball classics"
    },
    "OaklandPride": {
      tv: ["Pride Parade Live", "Oakland Pride Special", "Rainbow Hour", "Love Wins"],
      movies: ["Pride Stories", "Rainbow Rising", "Out and Proud"],
      streaming: "LGBTQ+ cinema showcase"
    },
    "ArtSoulFestival": {
      tv: ["Art & Soul Live", "Oakland Culture Hour", "Festival Highlights"],
      movies: ["Soul of the City", "Art's Heart", "Festival Dreams"],
      streaming: "music documentaries"
    },
    "StPatricksDay": {
      tv: ["St. Patrick's Parade", "Green Hour", "Irish Oakland"],
      movies: ["Lucky Day", "Emerald Dreams", "Irish Eyes"],
      streaming: "Irish cinema"
    },
    "MothersDay": {
      tv: ["Mother's Day Special", "Mom Appreciation Hour"],
      movies: ["A Mother's Love", "Sunday Brunch", "Mom Knows Best"],
      streaming: "family favorites"
    },
    "FathersDay": {
      tv: ["Father's Day Special", "Dad Appreciation Hour"],
      movies: ["Dad's Way", "Father Figure", "Like Father"],
      streaming: "action classics"
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY MEDIA POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var firstFridayTV = ["Art Walk Live", "Gallery Hour", "Oakland Arts Tonight", "First Friday Special"];
  var firstFridayMovies = ["Art of the City", "Canvas Dreams", "Gallery Night", "Creative Pulse"];
  var firstFridayStreaming = "arts documentaries";

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY MEDIA POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var creationDayTV = ["Oakland Origins", "City Founders Special", "Community Roots", "Our Oakland"];
  var creationDayMovies = ["City Born", "Foundation Stone", "Oakland Story"];
  var creationDayStreaming = "local history documentaries";

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON MEDIA POOLS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var sportsSeasonTV = {
    "championship": ["Championship Coverage", "Finals Live", "Title Talk", "Glory Bound"],
    "playoffs": ["Playoff Central", "Postseason Live", "Do or Die"],
    "post-season": ["Postseason Wrap", "Playoff Preview", "October Baseball"],
    "late-season": ["Pennant Race", "Stretch Run", "Playoff Push"]
  };

  var sportsSeasonMovies = {
    "championship": ["Championship Dreams", "Glory Day", "The Big Win"],
    "playoffs": ["Underdog Story", "Game Seven", "Clutch"],
    "post-season": ["October Magic", "Playoff Run"],
    "late-season": ["Last Chance", "September Push"]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD MEDIA SELECTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  var tv = [];
  var movies = [];
  var streaming = "";
  var specialProgramming = "";

  // ───────────────────────────────────────────────────────────────────────────
  // HOLIDAY PROGRAMMING (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (holiday !== "none" && holidayMedia[holiday]) {
    var hm = holidayMedia[holiday];
    tv.push(pickRandom(hm.tv));
    movies.push(pickRandom(hm.movies));
    streaming = streaming || hm.streaming;
    specialProgramming = holiday + " programming";

    // Major holidays get extra slots
    if (holidayPriority === "major") {
      tv.push(pickRandom(hm.tv));
      movies.push(pickRandom(hm.movies));
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY PROGRAMMING (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    tv.push(pickRandom(firstFridayTV));
    movies.push(pickRandom(firstFridayMovies));
    streaming = streaming || firstFridayStreaming;
    specialProgramming = specialProgramming ? specialProgramming + ", First Friday" : "First Friday arts";
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CREATION DAY PROGRAMMING (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (isCreationDay) {
    tv.push(pickRandom(creationDayTV));
    movies.push(pickRandom(creationDayMovies));
    streaming = streaming || creationDayStreaming;
    specialProgramming = specialProgramming ? specialProgramming + ", Creation Day" : "Creation Day community";
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SPORTS SEASON PROGRAMMING (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (sportsSeason !== "off-season" && sportsSeasonTV[sportsSeason]) {
    tv.push(pickRandom(sportsSeasonTV[sportsSeason]));
    movies.push(pickRandom(sportsSeasonMovies[sportsSeason]));

    if (sportsSeason === "championship") {
      tv.push(pickRandom(sportsSeasonTV[sportsSeason])); // Extra coverage
      streaming = streaming || "sports documentaries marathon";
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CULTURAL ACTIVITY PROGRAMMING (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (culturalActivity >= 1.4) {
    tv.push("Cultural Spotlight");
    movies.push("Art House Pick");
    streaming = streaming || "indie film showcase";
  }

  // ───────────────────────────────────────────────────────────────────────────
  // COMMUNITY ENGAGEMENT PROGRAMMING (v2.2)
  // ───────────────────────────────────────────────────────────────────────────
  if (communityEngagement >= 1.4) {
    tv.push("Community Stories");
    movies.push("Neighborhood Tales");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEATHER ADJUSTMENT
  // ───────────────────────────────────────────────────────────────────────────
  if (weather.impact >= 1.3 || weather.type === "rain") {
    tv.push("Late Weather Watch");
    movies.push(pickRandom(moviesRain));
  }

  if (weather.type === "fog") {
    movies.push("Fog Harbor");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // WEATHER MOOD
  // ───────────────────────────────────────────────────────────────────────────
  if (weatherMood.primaryMood === 'cozy') {
    tv.push(pickRandom(tvCozy));
    streaming = streaming || pickRandom(streamingCozy);
  }

  if (weatherMood.perfectWeather) {
    tv.push("Outdoor Oakland");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CHAOS ADJUSTMENT
  // ───────────────────────────────────────────────────────────────────────────
  if (chaos.length >= 3) {
    tv.push(pickRandom(tvChaos));
    streaming = streaming || pickRandom(streamingChaos);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SENTIMENT ADJUSTMENT
  // ───────────────────────────────────────────────────────────────────────────
  if (sentiment >= 0.3) {
    tv.push(pickRandom(tvComedy));
    movies.push(pickRandom(moviesUplifting));
  }
  if (sentiment <= -0.3) {
    tv.push(pickRandom(tvDrama));
    movies.push(pickRandom(moviesDrama));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ECONOMIC MOOD
  // ───────────────────────────────────────────────────────────────────────────
  if (econMood >= 65) {
    tv.push(pickRandom(tvEcon));
    movies.push(pickRandom(moviesComedy));
  }
  if (econMood <= 35) {
    streaming = streaming || pickRandom(streamingBudget);
    tv.push("Budget Living Tips");
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SEASON LOGIC (if no holiday override)
  // ───────────────────────────────────────────────────────────────────────────
  if (holiday === "none") {
    if (season === "Winter") {
      movies.push("Snowlight");
      streaming = streaming || "comfort comedy";
      tv.push(pickRandom(tvCozy));
    }
    if (season === "Summer") {
      tv.push("Harbor Nights");
      movies.push("Sunset Run");
    }
    if (season === "Fall") {
      movies.push("Autumn Roads");
      tv.push("Fall Premieres");
    }
    if (season === "Spring") {
      tv.push("Spring Lineup");
      movies.push("New Bloom");
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SPORTS BROADCASTS
  // ───────────────────────────────────────────────────────────────────────────
  var sportsShow = "";
  if (sports && sports !== "(none)") {
    if (sports.toLowerCase().indexOf("game") !== -1 || sports.toLowerCase().indexOf("home") !== -1) {
      sportsShow = "Sports Central: Game Night";
    } else if (sports.toLowerCase().indexOf("warriors") !== -1) {
      sportsShow = "Warriors Live";
    } else if (sports.toLowerCase().indexOf("a's") !== -1) {
      sportsShow = "A's Tonight";
    } else {
      sportsShow = "League Overview Live";
    }

    // v2.2: Sports season enhances broadcast
    if (sportsSeason === "championship") {
      sportsShow = sportsShow + " - Championship Edition";
    } else if (sportsSeason === "playoffs") {
      sportsShow = sportsShow + " - Playoff Special";
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FALLBACKS AND CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  if (tv.length === 0) tv.push(pickRandom(tvBase));
  if (movies.length === 0) movies.push(pickRandom(moviesBase));
  if (!streaming) streaming = pickRandom(streamingBase);

  // v2.3: ES5 deduplication (instead of Set)
  var seenTV = {};
  var uniqueTV = [];
  for (var i = 0; i < tv.length; i++) {
    if (!seenTV[tv[i]]) {
      seenTV[tv[i]] = true;
      uniqueTV.push(tv[i]);
    }
  }
  tv = uniqueTV;

  var seenMovies = {};
  var uniqueMovies = [];
  for (var j = 0; j < movies.length; j++) {
    if (!seenMovies[movies[j]]) {
      seenMovies[movies[j]] = true;
      uniqueMovies.push(movies[j]);
    }
  }
  movies = uniqueMovies;

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ═══════════════════════════════════════════════════════════════════════════

  S.eveningMedia = {
    tv: tv,
    movies: movies,
    streaming: streaming,
    sportsBroadcast: sportsShow,
    mediaInfluence: econMood <= 35 ? 'budget' : econMood >= 65 ? 'premium' : 'standard',
    // v2.2: Calendar context
    specialProgramming: specialProgramming,
    calendarContext: {
      holiday: holiday,
      holidayPriority: holidayPriority,
      isFirstFriday: isFirstFriday,
      isCreationDay: isCreationDay,
      sportsSeason: sportsSeason
    }
  };

  ctx.summary = S;
}


/**
 * ============================================================================
 * EVENING MEDIA REFERENCE
 * ============================================================================
 *
 * HOLIDAY PROGRAMMING (v2.2):
 *
 * 21 holidays with custom TV, movie, and streaming pools:
 * - Major: Thanksgiving, Holiday, NewYear, NewYearsEve, Independence
 * - Cultural: MLKDay, Juneteenth, CincoDeMayo, DiaDeMuertos, LunarNewYear
 * - Oakland: OpeningDay, OaklandPride, ArtSoulFestival
 * - Minor: Halloween, Valentine, Easter, MemorialDay, LaborDay, VeteransDay
 * - Family: StPatricksDay, MothersDay, FathersDay
 *
 * FIRST FRIDAY:
 * - TV: Art Walk Live, Gallery Hour, Oakland Arts Tonight
 * - Movies: Art of the City, Canvas Dreams, Gallery Night
 * - Streaming: arts documentaries
 *
 * CREATION DAY:
 * - TV: Oakland Origins, City Founders Special, Community Roots
 * - Movies: City Born, Foundation Stone, Oakland Story
 * - Streaming: local history documentaries
 *
 * SPORTS SEASON:
 * - Championship: Championship Coverage, Finals Live, Title Talk
 * - Playoffs: Playoff Central, Postseason Live, Do or Die
 * - Post-season: Postseason Wrap, Playoff Preview
 * - Late-season: Pennant Race, Stretch Run
 *
 * CULTURAL ACTIVITY (≥1.4):
 * - TV: Cultural Spotlight
 * - Movies: Art House Pick
 * - Streaming: indie film showcase
 *
 * COMMUNITY ENGAGEMENT (≥1.4):
 * - TV: Community Stories
 * - Movies: Neighborhood Tales
 *
 * OUTPUT STRUCTURE:
 * {
 *   tv: Array<string>,
 *   movies: Array<string>,
 *   streaming: string,
 *   sportsBroadcast: string,
 *   mediaInfluence: "budget" | "standard" | "premium",
 *   specialProgramming: string,
 *   calendarContext: {
 *     holiday, holidayPriority, isFirstFriday, isCreationDay, sportsSeason
 *   }
 * }
 *
 * ============================================================================
 */
