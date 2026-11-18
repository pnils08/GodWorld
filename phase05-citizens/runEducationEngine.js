/**
 * ============================================================================
 * Education Engine v2.2
 * ============================================================================
 *
 * Safe, world-aware micro-learning engine.
 * Adds soft educational/development hints only.
 *
 * v2.2 Enhancements:
 * - Expanded to 12 neighborhoods
 * - Holiday-specific education notes (MLK Day, Black History Month, etc.)
 * - First Friday cultural learning
 * - Creation Day reflection
 * - Cultural activity and community engagement modifiers
 * - Aligned with GodWorld Calendar v1.0
 *
 * Integrates:
 * - Season
 * - Weather + Weather Mood
 * - Holiday (30+ holidays)
 * - Chaos Events
 * - City Dynamics (sentiment, culturalActivity, communityEngagement)
 * - Economic Mood
 * - Sports Season
 * - Oakland Neighborhoods (12)
 *
 * Never creates credentials or degrees.
 * Never modifies jobs, status, UNI/MED/CIV.
 * 
 * ============================================================================
 */

// ═══════════════════════════════════════════════════════════════════════════
// engine.148 P3 — education texture pools (was a 12-key literal, ten hoods silent)
// Every hood gets the pool for its Neighborhood_Map.EmployerCharacter label
// (a label with no pool throws); the twelve original hoods keep their bespoke
// lines on top. Resolved by hoodTexturePool_ (canonNeighborhoodLoader.js).
// ═══════════════════════════════════════════════════════════════════════════
var EDUCATION_TEXTURE_BY_CHARACTER_ = {
  'institutional': ["visited a public reading room near the civic offices", "attended a public information session"],
  'clinic': ["read up on health topics at a community clinic", "attended a wellness workshop nearby"],
  'schools-retail': ["visited the neighborhood school library", "attended a parent-and-community learning night"],
  'campus': ["sat in on an open campus lecture", "browsed the campus bookstore"],
  'transit-retail': ["read during the commute", "picked up a course flyer near the station"],
  'nightlife': ["attended an evening talk at a local venue", "learned something from a late-night conversation"],
  'professional': ["attended a professional development session nearby", "browsed a bookstore along the avenue"],
  'residential': ["studied quietly at home", "visited the nearest library branch"],
  'retail': ["browsed a bookstore between the shops", "attended a workshop hosted by a local store"],
  'medical': ["attended a public health talk at the hospital", "read up on a medical topic nearby"],
  'family-retail': ["learned from an elder in the neighborhood", "attended a cultural learning event on the market street"],
  'mixed': ["studied at the corner cafe", "attended a community class on the block"],
  'village-retail': ["visited the village library branch", "attended a small-group class nearby"],
  'service-labor': ["took a night class after a shift", "learned a new skill on the job"],
  'arts': ["attended an arts workshop on the corridor", "learned about murals and printmaking informally"],
  'stadium': ["attended a youth program hosted at the arena", "learned about the district's development plan"],
  'construction': ["attended a trades training session nearby", "learned about the neighborhood's build-out"]
};

var EDUCATION_TEXTURE_BESPOKE_ = {
  'Temescal': [
    "browsed the Temescal library branch",
    "attended a community workshop in Temescal"
  ],
  'Downtown': [
    "visited the main Oakland library Downtown",
    "attended a public lecture in the city center"
  ],
  'Fruitvale': [
    "participated in community education programs",
    "engaged with cultural learning opportunities"
  ],
  'Lake Merritt': [
    "read by Lake Merritt during a break",
    "attended a lakeside community event"
  ],
  'West Oakland': [
    "explored local history and development topics",
    "learned about neighborhood changes"
  ],
  'Laurel': [
    "visited the Laurel library branch",
    "engaged in quiet study at home"
  ],
  'Rockridge': [
    "browsed bookstores in Rockridge",
    "attended an educational event nearby"
  ],
  'Jack London': [
    "explored arts education in Jack London",
    "attended a creative workshop"
  ],
  'Uptown': [
    "attended an arts lecture in Uptown",
    "explored gallery exhibitions for learning",
    "engaged with urban arts education"
  ],
  'KONO': [
    "learned about street art and muralism",
    "attended a DIY workshop in KONO",
    "explored creative skills informally"
  ],
  'Chinatown': [
    "learned about Chinese culture and history",
    "engaged with multilingual community resources",
    "explored cultural heritage topics"
  ],
  'Piedmont Ave': [
    "browsed independent bookstores on Piedmont Ave",
    "attended a neighborhood lecture",
    "engaged in quiet reading at a local cafe"
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// engine.350 Task 7 (builder 2026-11-16: a line moves a dial by what it says, down as often as up).
// Every texture line this engine can draw is listed here with the one dial it moves and which way —
// by what the line SAYS — at the everyday size (band S, 1). Before it every line was a bare
// `Education` (drive +5, openness +3) or `Education-Cultural` (openness +5, drive +2) whatever it
// said: "reflected inward due to tense atmosphere" pushed drive and openness up. null = a bare
// mention with no act or reaction in it: not written, counted in S.engine299.noDialBySource (the
// engine.299 rule: a line that moves nothing is not a line). A text missing from this table is not
// written either and is counted as unlisted — scripts/educationTextureSign.test.js holds every pool
// text to an entry. Same shape as CAREER_SIGN_BY_TEXT_ (runCareerEngine.js).
// ═══════════════════════════════════════════════════════════════════════════
var EDUCATION_SIGN_BY_TEXT_ = {
  // base
  "spent time learning new skills informally": "dial:drive:up",
  "engaged lightly with educational or informational content": null,
  "reflected on personal growth and understanding": "dial:openness:up",
  "took small steps toward self-development": "dial:drive:up",
  "paid closer attention to news and information this cycle": null,
  // season
  "read or studied indoors during winter pace": "dial:openness:up",
  "felt renewed motivation to learn as the season shifted": "dial:drive:up",
  "explored interests during warm-season downtime": "dial:openness:up",
  "re-engaged in learning habits as routines returned": "dial:drive:up",
  // weather
  "spent time learning indoors due to rain": "dial:openness:up",
  "focused on indoor reading during fog": "dial:openness:up",
  "looked for shaded or quiet places to think": null,
  "studied indoors during the cold": "dial:drive:up",
  "stayed inside and browsed educational media": "dial:outabout:down",
  "felt inspired to explore creative learning": "dial:openness:up",
  "used the reflective mood for deeper reading": "dial:openness:up",
  // a troubled week
  "sought more information due to recent city events": "dial:composure:down",
  "reviewed news to understand developing situations": null,
  "felt encouraged to focus on self-improvement": "dial:drive:up",
  "reflected inward due to tense atmosphere": "dial:composure:down",
  "researched skills to stay competitive in uncertain times": "dial:composure:down",
  "looked into professional development opportunities": "dial:drive:up",
  "explored learning opportunities with optimism": "dial:openness:up",
  // sports season
  "took interest in learning new routines during pre-season rhythm": "dial:drive:up",
  "engaged with sports-related media and commentary": "dial:fandom:up",
  // calendar
  "prepared learning materials for the new school year": "dial:drive:up",
  "engaged with educational planning": null,
  "explored art and cultural learning at First Friday": "dial:openness:up",
  "engaged with local artists and their work": "dial:sociability:up",
  "learned about Oakland's creative community": "dial:openness:up",
  "attended an artist talk at a gallery": "dial:outabout:up",
  "reflected on the origins of the community": null,
  "learned about foundational history": "dial:openness:up",
  "felt connected to deeper knowledge": "dial:composure:up",
  "explored the meaning of beginnings": "dial:openness:up",
  // city dynamics
  "engaged with cultural programming and events": "dial:outabout:up",
  "explored arts and creative learning opportunities": "dial:openness:up",
  "participated in community learning initiatives": "dial:sociability:up",
  "engaged with neighborhood education programs": null,
  // by hood character
  "visited a public reading room near the civic offices": "dial:outabout:up",
  "attended a public information session": "dial:outabout:up",
  "read up on health topics at a community clinic": null,
  "attended a wellness workshop nearby": "dial:outabout:up",
  "visited the neighborhood school library": "dial:outabout:up",
  "attended a parent-and-community learning night": "dial:sociability:up",
  "sat in on an open campus lecture": "dial:openness:up",
  "browsed the campus bookstore": "dial:outabout:up",
  "read during the commute": null,
  "picked up a course flyer near the station": null,
  "attended an evening talk at a local venue": "dial:outabout:up",
  "learned something from a late-night conversation": "dial:sociability:up",
  "attended a professional development session nearby": "dial:drive:up",
  "browsed a bookstore along the avenue": "dial:outabout:up",
  "studied quietly at home": "dial:drive:up",
  "visited the nearest library branch": "dial:outabout:up",
  "browsed a bookstore between the shops": "dial:outabout:up",
  "attended a workshop hosted by a local store": "dial:outabout:up",
  "attended a public health talk at the hospital": "dial:outabout:up",
  "read up on a medical topic nearby": null,
  "learned from an elder in the neighborhood": "dial:warmth:up",
  "attended a cultural learning event on the market street": "dial:outabout:up",
  "studied at the corner cafe": "dial:drive:up",
  "attended a community class on the block": "dial:sociability:up",
  "visited the village library branch": "dial:outabout:up",
  "attended a small-group class nearby": "dial:sociability:up",
  "took a night class after a shift": "dial:drive:up",
  "learned a new skill on the job": "dial:drive:up",
  "attended an arts workshop on the corridor": "dial:outabout:up",
  "learned about murals and printmaking informally": "dial:openness:up",
  "attended a youth program hosted at the arena": "dial:outabout:up",
  "learned about the district's development plan": null,
  "attended a trades training session nearby": "dial:drive:up",
  "learned about the neighborhood's build-out": null,
  // bespoke hoods
  "browsed the Temescal library branch": "dial:outabout:up",
  "attended a community workshop in Temescal": "dial:sociability:up",
  "visited the main Oakland library Downtown": "dial:outabout:up",
  "attended a public lecture in the city center": "dial:outabout:up",
  "participated in community education programs": "dial:sociability:up",
  "engaged with cultural learning opportunities": null,
  "read by Lake Merritt during a break": "dial:outabout:up",
  "attended a lakeside community event": "dial:sociability:up",
  "explored local history and development topics": "dial:openness:up",
  "learned about neighborhood changes": null,
  "visited the Laurel library branch": "dial:outabout:up",
  "engaged in quiet study at home": "dial:drive:up",
  "browsed bookstores in Rockridge": "dial:outabout:up",
  "attended an educational event nearby": "dial:outabout:up",
  "explored arts education in Jack London": "dial:openness:up",
  "attended a creative workshop": "dial:openness:up",
  "attended an arts lecture in Uptown": "dial:outabout:up",
  "explored gallery exhibitions for learning": "dial:outabout:up",
  "engaged with urban arts education": null,
  "learned about street art and muralism": "dial:openness:up",
  "attended a DIY workshop in KONO": "dial:drive:up",
  "explored creative skills informally": "dial:openness:up",
  "learned about Chinese culture and history": "dial:openness:up",
  "engaged with multilingual community resources": null,
  "explored cultural heritage topics": "dial:openness:up",
  "browsed independent bookstores on Piedmont Ave": "dial:outabout:up",
  "attended a neighborhood lecture": "dial:outabout:up",
  "engaged in quiet reading at a local cafe": "dial:outabout:up"
};

// The tag a texture line is written under: Education-<Dial>-<Up|Down>-S, or '' (not written).
// why: 'plain' (listed null) | 'unlisted' (no entry) — the counter key.
function educationTextureTag_(text) {
  if (!EDUCATION_SIGN_BY_TEXT_.hasOwnProperty(text)) return { tag: '', why: 'unlisted' };
  var m = /^dial:([a-z]+):(up|down)$/.exec(EDUCATION_SIGN_BY_TEXT_[text] || '');
  if (!m) return { tag: '', why: 'plain' };
  return { tag: 'Education-' + m[1].charAt(0).toUpperCase() + m[1].slice(1) + '-' + (m[2] === 'up' ? 'Up' : 'Down') + '-S', why: '' };
}

function runEducationEngine_(ctx) {

  var rng = safeRand_(ctx);
  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  if (!ctx.ledger) {
    throw new Error('runEducationEngine_: ctx.ledger not initialized');
  }
  var ss = ctx.ss;
  var logSheet = ss.getSheetByName('LifeHistory_Log');
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return;

  var idx = function(n) { return header.indexOf(n); };

  var iPopID = idx('POPID');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iTier = idx('Tier');
  var iClock = idx('ClockMode');
  var iUNI = idx('UNI (y/n)');
  var iMED = idx('MED (y/n)');
  var iCIV = idx('CIV (y/n)');
  var iBirth = idx('BirthYear');
  var iLife = idx('LifeHistory');
  var iLastUpd = idx('LastUpdated');
  var iNeighborhood = idx('Neighborhood');
  var iDialState = idx('DialState'); // engine.32 T5 — Openness dial -> learning-event frequency
  var iStatus = idx('Status'); // engine.67 step 4 (S325) — engine had NO status read; the gone drew education events

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var S = ctx.summary;
  var season = S.season;
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var weather = S.weather || { type: "clear", impact: 1 };
  var weatherMood = S.weatherMood || {};
  var chaos = S.worldEvents || [];
  var dynamics = S.cityDynamics || {
    sentiment: 0, culturalActivity: 1, communityEngagement: 1
  };
  var sports = (S.sportsAtmosphereEnabled === true) ? S.sportsSeason : ""; // S302 gate
  var econMood = S.economicMood || 50;
  var cycle = S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0;

  // Use simYear or calculate from cycle (52 cycles = 1 year)
  var simYear = simYearOf_(ctx, cycle);

  var count = 0;   // draws, against LIMIT
  var written = 0; // lines written (engine.350: a plain or unlisted draw writes nothing)
  var LIMIT = 10;

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE MICRO-LEARNING POOL
  // ═══════════════════════════════════════════════════════════════════════════
  var baseEdu = [
    "spent time learning new skills informally",
    "engaged lightly with educational or informational content",
    "reflected on personal growth and understanding",
    "took small steps toward self-development",
    "paid closer attention to news and information this cycle"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONAL EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  var seasonalEdu = [];
  if (season === "Winter") seasonalEdu.push("read or studied indoors during winter pace");
  if (season === "Spring") seasonalEdu.push("felt renewed motivation to learn as the season shifted");
  if (season === "Summer") seasonalEdu.push("explored interests during warm-season downtime");
  if (season === "Fall") seasonalEdu.push("re-engaged in learning habits as routines returned");

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  var weatherEdu = [];
  if (weather.type === "rain") weatherEdu.push("spent time learning indoors due to rain");
  if (weather.type === "fog") weatherEdu.push("focused on indoor reading during fog");
  if (weather.type === "hot") weatherEdu.push("looked for shaded or quiet places to think");
  if (weather.type === "cold") weatherEdu.push("studied indoors during the cold");
  if (weather.type === "wind") weatherEdu.push("stayed inside and browsed educational media");

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER MOOD EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  var weatherMoodEdu = [];
  if (weatherMood.creativityBoost && weatherMood.creativityBoost > 0.2) {
    weatherMoodEdu.push("felt inspired to explore creative learning");
  }
  if (weatherMood.primaryMood === 'introspective') {
    weatherMoodEdu.push("used the reflective mood for deeper reading");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS INFLUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  var chaosEdu = chaos.length > 0 ? [
    "sought more information due to recent city events",
    "reviewed news to understand developing situations"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT INFLUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  var sentimentEdu = [];
  if (dynamics.sentiment >= 0.3) {
    sentimentEdu.push("felt encouraged to focus on self-improvement");
  }
  if (dynamics.sentiment <= -0.3) {
    sentimentEdu.push("reflected inward due to tense atmosphere");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC INFLUENCE
  // ═══════════════════════════════════════════════════════════════════════════
  var econEdu = [];
  if (econMood <= 35) {
    econEdu.push("researched skills to stay competitive in uncertain times");
    econEdu.push("looked into professional development opportunities");
  }
  if (econMood >= 65) {
    econEdu.push("explored learning opportunities with optimism");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY-SPECIFIC EDUCATION (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayEdu = [];

  if (holiday === "BackToSchool") {
    holidayEdu.push("prepared learning materials for the new school year");
    holidayEdu.push("engaged with educational planning");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY CULTURAL LEARNING (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var firstFridayEdu = isFirstFriday ? [
    "explored art and cultural learning at First Friday",
    "engaged with local artists and their work",
    "learned about Oakland's creative community",
    "attended an artist talk at a gallery"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY REFLECTION (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var creationDayEdu = isCreationDay ? [
    "reflected on the origins of the community",
    "learned about foundational history",
    "felt connected to deeper knowledge",
    "explored the meaning of beginnings"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY EDUCATION (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var culturalEdu = [];
  if (dynamics.culturalActivity >= 1.4) {
    culturalEdu.push("engaged with cultural programming and events");
    culturalEdu.push("explored arts and creative learning opportunities");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT EDUCATION (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var communityEdu = [];
  if (dynamics.communityEngagement >= 1.3) {
    communityEdu.push("participated in community learning initiatives");
    communityEdu.push("engaged with neighborhood education programs");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPORTS SEASON (minor influence)
  // ═══════════════════════════════════════════════════════════════════════════
  var sportsEdu = [];
  if (sports === "spring-training") {
    sportsEdu.push("took interest in learning new routines during pre-season rhythm");
  }
  if (sports === "post-season" || sports === "playoffs") {
    sportsEdu.push("engaged with sports-related media and commentary");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD EDUCATION POOLS (12 neighborhoods - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // MERGE BASE POOL
  // ═══════════════════════════════════════════════════════════════════════════
  var basePool = [].concat(
    baseEdu,
    seasonalEdu,
    weatherEdu,
    weatherMoodEdu,
    chaosEdu,
    sentimentEdu,
    econEdu,
    sportsEdu,
    holidayEdu,
    firstFridayEdu,
    creationDayEdu,
    culturalEdu,
    communityEdu
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  for (var r = 0; r < rows.length; r++) {

    if (count >= LIMIT) break;

    var row = rows[r];

    var tier = Number(row[iTier] || 0);
    var mode = (row[iClock] || "").toString().trim();
    if (mode !== "ENGINE") continue;
    if (tier !== 3 && tier !== 4) continue;

    var isUNI = (row[iUNI] || "").toString().toLowerCase().startsWith("y");
    var isMED = (row[iMED] || "").toString().toLowerCase().startsWith("y");
    var isCIV = (row[iCIV] || "").toString().toLowerCase().startsWith("y");
    if (isUNI || isMED || isCIV) continue;
    // engine.67 step 4 (S325): gone-status gate — deceased/inactive/traded/
    // pending draw no learning texture. Hospitalized stay (reading from a bed
    // is possible; impossible-bar ruling gates only the impossible).
    if (iStatus >= 0) {
      var eduStatus = (row[iStatus] || "").toString().trim().toLowerCase();
      if (eduStatus === "deceased" || eduStatus === "inactive" || eduStatus === "traded" || eduStatus === "pending") continue;
    }

    var birthYear = Number(row[iBirth] || 0);
    if (!birthYear) continue;

    var age = simYear - birthYear;
    if (age < 15) continue;

    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';

    // ═══════════════════════════════════════════════════════════════════════
    // DRIFT CHANCE
    // ═══════════════════════════════════════════════════════════════════════
    var chance = 0.02;

    if (weather.impact >= 1.3) chance += 0.01;
    if (weatherMood.creativityBoost && weatherMood.creativityBoost > 0.2) chance += 0.005;
    if (season === "Spring") chance += 0.01;
    if (season === "Fall") chance += 0.005;
    if (dynamics.sentiment <= -0.3) chance += 0.01;
    if (econMood <= 35) chance += 0.01;
    if (chaos.length > 0) chance += 0.015;

    // Younger adults more likely to engage in learning
    if (age >= 18 && age <= 35) chance += 0.01;

    // Holiday priority boost (v2.2)
    if (holidayPriority === "cultural") chance += 0.012;  // Cultural holidays boost learning
    else if (holidayPriority === "major") chance += 0.005;

    // Education-focused holidays boost (v2.2)
    if (holiday === "BackToSchool") {
      chance += 0.015;
    }

    // First Friday boost (v2.2)
    if (isFirstFriday) {
      if (neighborhood === "Uptown" || neighborhood === "KONO" || neighborhood === "Jack London") {
        chance += 0.015;
      } else {
        chance += 0.008;
      }
    }

    // Creation Day boost (v2.2)
    if (isCreationDay) chance += 0.008;

    // Cultural activity boost (v2.2)
    if (dynamics.culturalActivity >= 1.4) chance += 0.008;

    // Community engagement boost (v2.2)
    if (dynamics.communityEngagement >= 1.3) chance += 0.005;

    // engine.32 T5 — Openness dial scales learning-event frequency (0.5..1.5).
    // null bands (no DialState) -> base rates unchanged.
    var dialBands = getCitizenDialBands_(ctx, (row[iPopID] || "").toString(), iDialState >= 0 ? (row[iDialState] || "") : "");
    if (dialBands) chance *= dialBands.mult.openness;

    if (chance > 0.12) chance = 0.12;

    if (rng() >= chance) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // BUILD CITIZEN-SPECIFIC POOL
    // ═══════════════════════════════════════════════════════════════════════
    var pool = basePool.slice();

    // Add neighborhood events
    pool = pool.concat(hoodTexturePool_(ctx, neighborhood, EDUCATION_TEXTURE_BY_CHARACTER_, EDUCATION_TEXTURE_BESPOKE_, 'runEducationEngine_'));

    // ═══════════════════════════════════════════════════════════════════════
    // PICK EVENT
    // ═══════════════════════════════════════════════════════════════════════
    var pick = pool[Math.floor(rng() * pool.length)];
    var stamp = inWorldStamp_(ctx);

    // engine.350 Task 7: the drawn line is written under the dial it moves and which way, by what it
    // says (EDUCATION_SIGN_BY_TEXT_, file scope), at the everyday size — or it is not written. The
    // draw is never rerolled, so the dice run as before; a line not written still counts against LIMIT.
    // (Was: bare Education / -FirstFriday / -CreationDay / -Holiday = drive +5, openness +3;
    // Education-Cultural = openness +5, drive +2.)
    var signed = educationTextureTag_(pick);
    var eventTag = signed.tag;
    if (!eventTag) {
      S.engine299 = S.engine299 || { noDial: 0, noDialBySource: {} };
      S.engine299.noDial++;
      var eKey = 'runEducationEngine:Education:' + signed.why;
      S.engine299.noDialBySource[eKey] = (S.engine299.noDialBySource[eKey] || 0) + 1;
      count++;
      continue;
    }

    var existing = row[iLife] ? row[iLife].toString() : "";
    var line = stamp + " — [" + eventTag + "] " + pick;

    row[iLife] = existing ? existing + "\n" + line : line;
    row[iLastUpd] = ctx.now;
    written++;

    if (logSheet) {
      logSheet.appendRow([
        (typeof inWorldStamp_ === 'function' ? inWorldStamp_(ctx) : ctx.now), // G-EC71: sim clock
        row[iPopID],
        ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(),
        eventTag,
        pick,
        neighborhood,
        cycle
      ]);
    }

    rows[r] = row;
    count++;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
  }

  // Phase 42 §5.6: flip ctx.ledger.dirty; consolidated commit at Phase 10.
  if (written > 0) {
    ctx.ledger.dirty = true;
  }

  // Summary (lines written; a plain draw is counted in S.engine299.noDialBySource)
  S.educationEvents = written;
  ctx.summary = S;
}


/**
 * ============================================================================
 * EDUCATION EVENT REFERENCE
 * ============================================================================
 * 
 * Event Tags (engine.350 Task 7):
 * - Education-<Dial>-<Up|Down>-S: one dial, one step, by what the line says
 *   (EDUCATION_SIGN_BY_TEXT_); a plain line is not written.
 * - The bare Education / Education-Cultural keys stay in the dial map for the
 *   authored essence rows; this engine no longer writes them.
 *
 * Holiday Education Focus:
 * - BackToSchool: Educational preparation
 * 
 * Neighborhood Education (12 total):
 * - Downtown: Main library, public lectures
 * - Uptown: Arts lectures, gallery exhibitions
 * - KONO: Street art, DIY workshops
 * - Chinatown: Cultural heritage, multilingual resources
 * - etc.
 * 
 * STRICT RULES PRESERVED:
 * - Never creates credentials or degrees
 * - Never modifies jobs, status, UNI/MED/CIV
 * - Soft educational hints only
 * 
 * ============================================================================
 */