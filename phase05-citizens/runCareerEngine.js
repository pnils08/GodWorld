/**
 * ============================================================================
 * Career Engine v2.3.1
 * ============================================================================
 *
 * Lightweight, calendar-aware, weather-aware career drift generator.
 * Only affects ENGINE-mode Tier-3 and Tier-4 non-UNI/MED/CIV citizens.
 * Never changes RoleType or Status. Logs soft career observations only.
 *
 * v2.3.1 Changes:
 * - Simplified industry model: tech/service/public/creative (was 7)
 * - Simplified employer model: small/large/public (was 6)
 * - careerSignals wired to Economic Ripple Engine
 *
 * v2.3 Features (retained):
 * - CareerState persistence via LifeHistory line: "[CareerState] k=v|k=v..."
 * - Job transitions: promotion, lateral shift, layoff, sector shift
 * - Tenure + skill accumulation to drive career arcs
 * - Deterministic RNG via ctx.rng / ctx.config.rngSeed
 * - Batch append to LifeHistory_Log
 * - Summary outputs: ctx.summary.careerSignals (aggregates for downstream)
 *
 * v2.2 Features (retained):
 * - 12 neighborhoods, holiday notes, First Friday, Creation Day
 * - Cultural activity and community engagement modifiers
 *
 * ============================================================================
 */

function runCareerEngine_(ctx) {

  var ss = ctx.ss;
  var ledger = ss.getSheetByName('Simulation_Ledger');
  var logSheet = ss.getSheetByName('LifeHistory_Log');
  if (!ledger) return;

  var values = ledger.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  var rows = values.slice(1);

  var idx = function(n) { return header.indexOf(n); };

  var iPopID = idx('POPID');
  var iFirst = idx('First');
  var iLast = idx('Last');
  var iTier = idx('Tier');
  var iUNI = idx('UNI (y/n)');
  var iMED = idx('MED (y/n)');
  var iCIV = idx('CIV (y/n)');
  var iClock = idx('ClockMode');
  var iLife = idx('LifeHistory');
  var iLastUpd = idx('LastUpdated');
  var iNeighborhood = idx('Neighborhood');
  var iTierRole = idx('TierRole'); // read-only; do not write

  if (iPopID < 0 || iTier < 0 || iClock < 0 || iLife < 0 || iLastUpd < 0) return;

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  var S = ctx.summary || (ctx.summary = {});
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
  var econMood = S.economicMood || 50;
  var cycle = S.absoluteCycle || S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;

  // v2.3: Deterministic RNG (prefer ctx.rng, else seed via mulberry32_, else Math.random)
  var rng = (typeof ctx.rng === "function")
    ? ctx.rng
    : (ctx.config && typeof ctx.config.rngSeed === "number" && typeof mulberry32_ === "function")
      ? mulberry32_((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0))
      : Math.random;
  function roll() { return rng(); }
  function chanceHit(p) { return roll() < p; }
  function pickOne(arr) { return arr[Math.floor(roll() * arr.length)]; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function safeStr(v) { return (v === null || v === undefined) ? "" : String(v); }

  var count = 0;
  var LIMIT = 10;

  // v2.3: Batch logs to avoid appendRow in loop
  var logRows = [];

  // v2.3: Downstream-friendly aggregate signals
  if (!S.careerSignals) {
    S.careerSignals = {
      cycle: cycle,
      transitions: 0,
      promotions: 0,
      layoffs: 0,
      sectorShifts: 0,
      training: 0,
      avgTenure: 0,
      avgLevel: 0,
      industries: {},
      pressure: {}
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v2.3: CAREER MODEL (schema-safe, persists in LifeHistory via [CareerState])
  // v2.3.1: Simplified to 4 industries, 3 employer types (cut noise)
  // ═══════════════════════════════════════════════════════════════════════════
  var INDUSTRIES = ["tech", "service", "public", "creative"];
  var EMPLOYERS = ["small", "large", "public"];

  function getIndustrySeasonBias_(industry, season, holiday) {
    var bias = 0;
    if (season === "Winter" && industry === "service") bias += 0.10;
    if (season === "Summer") {
      if (industry === "service") bias += 0.08;
      if (industry === "public") bias -= 0.04;
    }
    if ((holiday === "Holiday" || holiday === "BlackFriday") && industry === "service") bias += 0.15;
    if (holidayPriority === "major" && industry === "service") bias += 0.06;
    return bias;
  }

  function getMacroPressure_(mood) {
    if (mood >= 70) return 0.7;
    if (mood >= 60) return 0.35;
    if (mood >= 45) return 0.05;
    if (mood >= 35) return -0.25;
    return -0.65;
  }

  function getChaosPressure_(chaosList) {
    var c = chaosList ? chaosList.length : 0;
    if (c >= 6) return 0.35;
    if (c >= 3) return 0.18;
    if (c >= 1) return 0.10;
    return 0;
  }

  function getWeatherPressure_(w) {
    var t = (w && w.type) ? w.type : "clear";
    if (t === "snow") return 0.25;
    if (t === "fog") return 0.12;
    if (t === "rain") return 0.10;
    if (t === "hot") return 0.08;
    return 0;
  }

  function parseCareerStateFromLife_(lifeStr) {
    var st = {
      industry: null,
      employer: null,
      level: 1,
      tenure: 0,
      skill: { general: 0.2 },
      incomeBand: "low",
      lastTransition: 0
    };
    if (!lifeStr) return st;
    var lines = String(lifeStr).split("\n");
    for (var i = lines.length - 1; i >= 0; i--) {
      var line = lines[i];
      if (line.indexOf("[CareerState]") >= 0) {
        var parts = line.split("[CareerState]");
        if (parts.length < 2) break;
        var payload = parts[1].trim();
        var segs = payload.split("|");
        for (var s = 0; s < segs.length; s++) {
          var seg = segs[s];
          var eq = seg.indexOf("=");
          if (eq < 0) continue;
          var k = seg.substring(0, eq).trim();
          var v = seg.substring(eq + 1).trim();
          if (k === "industry") st.industry = v || st.industry;
          else if (k === "employer") st.employer = v || st.employer;
          else if (k === "income") st.incomeBand = v || st.incomeBand;
          else if (k === "level") st.level = parseInt(v, 10) || st.level;
          else if (k === "tenure") st.tenure = parseInt(v, 10) || st.tenure;
          else if (k === "lastT") st.lastTransition = parseInt(v, 10) || st.lastTransition;
          else if (k === "skill") {
            var skills = v.split(",");
            st.skill = st.skill || {};
            for (var si = 0; si < skills.length; si++) {
              var kv = skills[si].split(":");
              if (kv.length === 2) {
                var sk = kv[0];
                var sv = parseFloat(kv[1]);
                if (sk) st.skill[sk] = isNaN(sv) ? (st.skill[sk] || 0) : sv;
              }
            }
          }
        }
        break;
      }
    }
    return st;
  }

  function encodeSkill_(skillObj) {
    var out = [];
    for (var k in skillObj) {
      if (!skillObj.hasOwnProperty(k)) continue;
      var v = skillObj[k];
      if (typeof v !== "number") continue;
      out.push(k + ":" + (Math.round(v * 100) / 100));
    }
    return out.join(",");
  }

  function inferIncomeBand_(industry, level) {
    if (industry === "tech" && level >= 3) return "high";
    if (industry === "public" && level >= 4) return "mid";
    if (industry === "creative" && level >= 4) return "mid";
    if (level >= 4) return "mid";
    return "low";
  }

  function pickInitialIndustry_(tierRole) {
    var tr = safeStr(tierRole).toLowerCase();
    if (tr.indexOf("artist") >= 0 || tr.indexOf("creative") >= 0 || tr.indexOf("music") >= 0) return "creative";
    if (tr.indexOf("gov") >= 0 || tr.indexOf("public") >= 0 || tr.indexOf("city") >= 0) return "public";
    if (tr.indexOf("tech") >= 0 || tr.indexOf("engineer") >= 0 || tr.indexOf("developer") >= 0) return "tech";
    // Everything else is service (retail, health, logistics, hospitality, etc.)
    return chanceHit(0.6) ? "service" : pickOne(INDUSTRIES);
  }

  function pickEmployerType_(industry) {
    if (industry === "public") return "public";
    if (industry === "creative") return chanceHit(0.65) ? "small" : "large";
    if (industry === "tech") return chanceHit(0.55) ? "small" : "large";
    // service: mostly large employers (retail chains, hospitals, hotels)
    return chanceHit(0.35) ? "small" : "large";
  }

  function chooseSkillFocus_(industry) {
    if (industry === "tech") return "systems";
    if (industry === "public") return "process";
    if (industry === "creative") return "craft";
    if (industry === "service") return "operations";
    return "general";
  }

  function addSkillXP_(st, focus, amt) {
    if (!st.skill) st.skill = {};
    st.skill.general = clamp((st.skill.general || 0) + (amt * 0.35), 0, 1);
    if (focus) st.skill[focus] = clamp((st.skill[focus] || 0) + amt, 0, 1);
  }

  function maybeTransition_(st, context) {
    if (st.lastTransition && (cycle - st.lastTransition) < 6) return null;

    var macro = getMacroPressure_(context.econMood);
    var chaosP = getChaosPressure_(context.chaos);
    var wP = getWeatherPressure_(context.weather);
    var seasonBias = getIndustrySeasonBias_(st.industry, context.season, context.holiday);

    var pressure = macro + seasonBias - (chaosP * 0.35) - (wP * 0.20);
    pressure = clamp(pressure, -1, 1);
    S.careerSignals.pressure[st.industry] = Math.round(pressure * 100) / 100;

    var skillCore = (st.skill && st.skill.general) ? st.skill.general : 0.25;
    var promoChance = 0.01 + (st.tenure * 0.004) + (Math.max(0, pressure) * 0.02) + (skillCore * 0.015);
    promoChance = clamp(promoChance, 0, 0.08);

    var layoffChance = 0.004 + (Math.max(0, -pressure) * 0.03) + (chaosP * 0.01);
    layoffChance = clamp(layoffChance, 0, 0.07);

    var shiftChance = 0.004 + (Math.max(0, -pressure) * 0.018) + (roll() * 0.004);
    shiftChance = clamp(shiftChance, 0, 0.05);

    var lateralChance = 0.006 + (Math.max(0, pressure) * 0.012);
    lateralChance = clamp(lateralChance, 0, 0.05);

    if (chanceHit(layoffChance)) return { type: "layoff", text: "faced an unexpected work disruption and started looking for new options" };
    if (chanceHit(promoChance) && st.level < 5) return { type: "promotion", text: "earned a quiet step up at work—more responsibility, fewer excuses" };
    if (chanceHit(shiftChance)) return { type: "sector_shift", text: "considered a sector change after noticing the ground shifting under their role" };
    if (chanceHit(lateralChance)) return { type: "lateral", text: "made a lateral move that looked small on paper but felt strategic" };
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BASE MICRO-CAREER POOL
  // ═══════════════════════════════════════════════════════════════════════════
  var baseCareer = [
    "had a routine period at work with no major changes",
    "felt slightly more confident in their role",
    "experienced a quieter workload than usual",
    "saw minor shifts in workplace expectations",
    "received small positive feedback on daily tasks",
    "handled ordinary work responsibilities without incident"
  ];

  // v2.3: Skill/training flavor (light injection)
  var trainingPool = [
    "picked up a small skill that made the day easier",
    "learned a trick from someone who didn't explain it twice",
    "improved a routine process and kept it quiet",
    "spent time sharpening a skill that might matter later",
    "noticed how competence attracts new expectations"
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // SEASONAL WORK-CYCLE PATTERNS
  // ═══════════════════════════════════════════════════════════════════════════
  var seasonalCareer = [];
  if (season === "Winter") {
    seasonalCareer.push("noticed slower workplace activity during winter months");
    seasonalCareer.push("navigated year-end deadlines and planning");
  }
  if (season === "Spring") {
    seasonalCareer.push("experienced renewed workplace momentum");
    seasonalCareer.push("felt the energy of new fiscal year initiatives");
  }
  if (season === "Summer") {
    seasonalCareer.push("felt lighter workflow during warm-season routines");
    seasonalCareer.push("covered for vacationing colleagues");
  }
  if (season === "Fall") {
    seasonalCareer.push("encountered early autumn workload restructuring");
    seasonalCareer.push("prepared for the busy Q4 push");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WEATHER EFFECTS ON WORK RHYTHM
  // ═══════════════════════════════════════════════════════════════════════════
  var weatherCareer = [];
  if (weather.type === "rain" || weather.type === "fog") {
    weatherCareer.push("was affected by weather-related workplace slowdowns");
    weatherCareer.push("had a longer commute due to weather");
  }
  if (weather.type === "hot") {
    weatherCareer.push("felt summer heat influence workplace mood");
  }
  if (weather.type === "cold") {
    weatherCareer.push("noticed cold weather affecting commute and mood");
  }

  // Weather mood effects
  var weatherMoodCareer = [];
  if (weatherMood.irritabilityFactor && weatherMood.irritabilityFactor > 0.3) {
    weatherMoodCareer.push("noticed workplace tension from weather stress");
  }
  if (weatherMood.perfectWeather) {
    weatherMoodCareer.push("enjoyed the pleasant commute to work");
    weatherMoodCareer.push("felt energized by the beautiful weather");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAOS → WORKPLACE CHATTER/STRESS
  // ═══════════════════════════════════════════════════════════════════════════
  var chaosCareer = chaos.length > 0 ? [
    "noticed workplace discussion reacting to recent city events",
    "felt subtle workplace tension due to city happenings"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTIMENT → WORKPLACE MORALE
  // ═══════════════════════════════════════════════════════════════════════════
  var sentimentCareer = [];
  if (dynamics.sentiment >= 0.3) sentimentCareer.push("felt improved workplace morale");
  if (dynamics.sentiment <= -0.3) sentimentCareer.push("felt uneasy workplace atmosphere");

  // ═══════════════════════════════════════════════════════════════════════════
  // ECONOMIC MOOD → JOB SECURITY FEELINGS
  // ═══════════════════════════════════════════════════════════════════════════
  var econCareer = [];
  if (econMood <= 35) {
    econCareer.push("felt economic uncertainty affecting workplace mood");
    econCareer.push("noticed colleagues discussing job market concerns");
  }
  if (econMood >= 65) {
    econCareer.push("sensed optimism about career opportunities");
    econCareer.push("noticed positive workplace energy from economic news");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOLIDAY-SPECIFIC CAREER NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holidayCareer = [];

  // Long weekend holidays
  if (holiday === "MemorialDay" || holiday === "LaborDay" || holiday === "Independence") {
    holidayCareer.push("enjoyed the long weekend break from work");
    holidayCareer.push("wrapped up tasks before the holiday");
    holidayCareer.push("noticed lighter office attendance before the holiday");
  }

  // Thanksgiving
  if (holiday === "Thanksgiving") {
    holidayCareer.push("prepared for the holiday break");
    holidayCareer.push("wrapped up projects before the long weekend");
    holidayCareer.push("participated in workplace holiday potluck");
  }

  // Holiday season (Christmas)
  if (holiday === "Holiday") {
    holidayCareer.push("felt the holiday slowdown at work");
    holidayCareer.push("exchanged holiday greetings with colleagues");
    holidayCareer.push("navigated year-end administrative tasks");
  }

  // New Year
  if (holiday === "NewYear" || holiday === "NewYearsEve") {
    holidayCareer.push("set workplace goals for the new year");
    holidayCareer.push("participated in workplace new year discussions");
    holidayCareer.push("felt the fresh-start energy at work");
  }

  // Retail/service holidays
  if (holiday === "Valentine" || holiday === "MothersDay" || holiday === "FathersDay") {
    holidayCareer.push("noticed increased retail activity");
    holidayCareer.push("felt the holiday rush in service industries");
  }

  // Black Friday (day after Thanksgiving)
  if (holiday === "BlackFriday") {
    holidayCareer.push("experienced the retail rush");
    holidayCareer.push("worked extra hours during the shopping surge");
  }

  // Back to school
  if (holiday === "BackToSchool") {
    holidayCareer.push("adjusted to new school year schedules");
    holidayCareer.push("noticed the end-of-summer workplace shift");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FIRST FRIDAY CAREER NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var firstFridayCareer = isFirstFriday ? [
    "made plans to attend First Friday after work",
    "felt the end-of-week creative energy",
    "left work early for First Friday art walk",
    "discussed gallery plans with coworkers"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATION DAY CAREER NOTES (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var creationDayCareer = isCreationDay ? [
    "reflected on their career journey",
    "felt connected to the reasons they started this work",
    "appreciated their place in the community",
    "sensed something meaningful about today's work"
  ] : [];

  // ═══════════════════════════════════════════════════════════════════════════
  // CULTURAL ACTIVITY EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var culturalCareer = [];
  if (dynamics.culturalActivity >= 1.4) {
    culturalCareer.push("felt inspired by the city's creative energy");
    culturalCareer.push("noticed colleagues discussing cultural events");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMUNITY ENGAGEMENT EFFECTS (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var communityCareer = [];
  if (dynamics.communityEngagement >= 1.3) {
    communityCareer.push("participated in workplace community initiative");
    communityCareer.push("felt connected to colleagues and neighborhood");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OAKLAND NEIGHBORHOOD WORKPLACE POOLS (12 neighborhoods - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var neighborhoodCareer = {
    'Downtown': [
      "navigated the busy Downtown commute",
      "felt the energy of the business district",
      "grabbed coffee near City Hall"
    ],
    'Jack London': [
      "appreciated working near the waterfront",
      "enjoyed the Jack London district atmosphere",
      "took a lunchtime walk by the estuary"
    ],
    'Temescal': [
      "grabbed lunch at a Temescal spot near work",
      "appreciated the creative workplace environment",
      "enjoyed the neighborhood's eclectic vibe"
    ],
    'Rockridge': [
      "enjoyed the pleasant Rockridge work commute",
      "noticed the professional atmosphere",
      "stopped by College Ave shops after work"
    ],
    'West Oakland': [
      "felt the industrial workplace rhythm",
      "noticed development activity near work",
      "observed the neighborhood's evolution"
    ],
    'Fruitvale': [
      "connected with community near the workplace",
      "appreciated the neighborhood's energy",
      "grabbed lunch from a local taqueria"
    ],
    'Lake Merritt': [
      "took a lunchtime walk by the lake",
      "enjoyed the lakeside work location",
      "felt refreshed by the natural surroundings"
    ],
    'Laurel': [
      "appreciated the quiet commute through Laurel",
      "enjoyed the residential-adjacent workplace",
      "noticed the neighborhood's calm energy"
    ],
    'Uptown': [
      "felt the urban arts district workplace energy",
      "enjoyed working near galleries and theaters",
      "grabbed lunch at an Uptown spot"
    ],
    'KONO': [
      "appreciated the creative district atmosphere",
      "noticed new murals on the commute",
      "felt inspired by the neighborhood's DIY spirit"
    ],
    'Chinatown': [
      "grabbed dim sum during lunch break",
      "appreciated the bustling neighborhood energy",
      "noticed the morning market activity"
    ],
    'Piedmont Ave': [
      "enjoyed the leafy commute through Piedmont Ave",
      "appreciated the boutique district atmosphere",
      "stopped by local shops after work"
    ]
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FINAL BASE EVENT POOL
  // ═══════════════════════════════════════════════════════════════════════════
  var basePool = [].concat(
    baseCareer,
    seasonalCareer,
    weatherCareer,
    weatherMoodCareer,
    chaosCareer,
    sentimentCareer,
    econCareer,
    holidayCareer,
    firstFridayCareer,
    creationDayCareer,
    culturalCareer,
    communityCareer
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ITERATE THROUGH CITIZENS
  // ═══════════════════════════════════════════════════════════════════════════
  var sumTenure = 0;
  var sumLevel = 0;
  var careerCounted = 0;

  for (var r = 0; r < rows.length; r++) {

    if (count >= LIMIT) break;

    var row = rows[r];

    var tier = Number(row[iTier] || 0);
    var mode = row[iClock] || "ENGINE";
    var isUNI = (row[iUNI] || "").toString().toLowerCase() === "y";
    var isMED = (row[iMED] || "").toString().toLowerCase() === "y";
    var isCIV = (row[iCIV] || "").toString().toLowerCase() === "y";
    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || '') : '';
    var tierRole = iTierRole >= 0 ? row[iTierRole] : "";
    var popId = row[iPopID];
    if (!popId) continue;

    // Only allow ENGINE Tier-3/4 non-UNI/MED/CIV
    if (mode !== "ENGINE") continue;
    if (tier !== 3 && tier !== 4) continue;
    if (isUNI || isMED || isCIV) continue;

    // v2.3: Load/init career state from LifeHistory
    var existing = row[iLife] ? row[iLife].toString() : "";
    var st = parseCareerStateFromLife_(existing);
    if (!st.industry) st.industry = pickInitialIndustry_(tierRole);
    if (!st.employer) st.employer = pickEmployerType_(st.industry);
    if (!st.level) st.level = 1;
    if (st.tenure === null || st.tenure === undefined) st.tenure = 0;

    // v2.3: Advance tenure + small skill gain
    st.tenure += 1;
    var focus = chooseSkillFocus_(st.industry);
    var xp = 0.01 + (roll() * 0.02);
    if (econMood >= 65) xp += 0.005;
    if (econMood <= 35) xp -= 0.004;
    xp = clamp(xp, 0.004, 0.04);
    addSkillXP_(st, focus, xp);

    // ═══════════════════════════════════════════════════════════════════════
    // DRIFT PROBABILITY
    // ═══════════════════════════════════════════════════════════════════════
    var chance = 0.02;

    // Weather-based noise
    if (weather.impact >= 1.3) chance += 0.01;

    // Weather mood
    if (weatherMood.comfortIndex && weatherMood.comfortIndex < 0.35) chance += 0.005;

    // Seasonal workplace rhythms
    if (season === "Fall") chance += 0.01;
    if (season === "Spring") chance += 0.005;

    // City sentiment
    if (dynamics.sentiment <= -0.3) chance += 0.015;

    // Economic stress increases career awareness
    if (econMood <= 35) chance += 0.01;
    if (econMood >= 65) chance += 0.005;

    // Chaos influence
    if (chaos.length > 0) chance += 0.015;

    // Holiday priority boost (v2.2)
    if (holidayPriority === "major") chance += 0.01;
    else if (holidayPriority === "minor") chance += 0.005;

    // Long weekend holidays boost (v2.2)
    if (holiday === "MemorialDay" || holiday === "LaborDay" ||
        holiday === "Thanksgiving" || holiday === "Independence") {
      chance += 0.008;
    }

    // First Friday boost (v2.2) - especially in arts neighborhoods
    if (isFirstFriday) {
      if (neighborhood === "Uptown" || neighborhood === "KONO" || neighborhood === "Jack London") {
        chance += 0.015;
      } else {
        chance += 0.005;
      }
    }

    // Creation Day boost (v2.2)
    if (isCreationDay) chance += 0.008;

    // Cultural activity boost (v2.2)
    if (dynamics.culturalActivity >= 1.4) chance += 0.005;

    // Community engagement boost (v2.2)
    if (dynamics.communityEngagement >= 1.3) chance += 0.005;

    // v2.3: Extreme macro conditions slightly increase "career notable" likelihood
    var macroP = getMacroPressure_(econMood);
    if (macroP <= -0.65 || macroP >= 0.7) chance += 0.006;

    // Cap chance
    if (chance > 0.14) chance = 0.14;
    if (!chanceHit(chance)) continue;

    // ═══════════════════════════════════════════════════════════════════════
    // BUILD CITIZEN-SPECIFIC POOL
    // ═══════════════════════════════════════════════════════════════════════
    var pool = basePool.slice();

    // Add neighborhood events
    if (neighborhood && neighborhoodCareer[neighborhood]) {
      pool = pool.concat(neighborhoodCareer[neighborhood]);
    }

    // v2.3: occasional training flavor
    if (chanceHit(0.25)) pool = pool.concat(trainingPool);

    // v2.3: maybe transition
    var tEv = maybeTransition_(st, {
      econMood: econMood,
      season: season,
      holiday: holiday,
      chaos: chaos,
      weather: weather
    });

    // Choose drift output
    var pick = null;
    var stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");

    // Determine event tag (v2.2)
    var eventTag = "Career";

    if (tEv) {
      pick = tEv.text;
      eventTag = "Career-Transition";
      st.lastTransition = cycle;
      if (tEv.type === "promotion") {
        st.level = Math.min(5, st.level + 1);
        st.tenure = Math.max(1, Math.round(st.tenure * 0.55));
        S.careerSignals.promotions += 1;
        S.careerSignals.transitions += 1;
      } else if (tEv.type === "layoff") {
        st.tenure = 0;
        st.employer = "small";
        S.careerSignals.layoffs += 1;
        S.careerSignals.transitions += 1;
      } else if (tEv.type === "sector_shift") {
        var old = st.industry;
        var tries = 0;
        while (tries < 6) {
          var cand = pickOne(INDUSTRIES);
          if (cand !== old) { st.industry = cand; break; }
          tries++;
        }
        st.employer = pickEmployerType_(st.industry);
        st.tenure = 0;
        S.careerSignals.sectorShifts += 1;
        S.careerSignals.transitions += 1;
      } else if (tEv.type === "lateral") {
        st.employer = pickEmployerType_(st.industry);
        st.tenure = Math.max(1, Math.round(st.tenure * 0.70));
        S.careerSignals.transitions += 1;
      }
    } else {
      pick = pool[Math.floor(roll() * pool.length)];
      if (firstFridayCareer.indexOf(pick) >= 0) eventTag = "Career-FirstFriday";
      else if (creationDayCareer.indexOf(pick) >= 0) eventTag = "Career-CreationDay";
      else if (holidayCareer.indexOf(pick) >= 0) eventTag = "Career-Holiday";
      else if (trainingPool.indexOf(pick) >= 0) {
        eventTag = "Career-Training";
        S.careerSignals.training += 1;
      }
    }

    // v2.3: derived income + aggregates
    st.incomeBand = inferIncomeBand_(st.industry, st.level);
    S.careerSignals.industries[st.industry] = (S.careerSignals.industries[st.industry] || 0) + 1;

    var line = stamp + " — [" + eventTag + "] " + pick;
    var lifeOut = existing ? (existing + "\n" + line) : line;

    // v2.3: persist CareerState occasionally or always on transition
    var shouldPersistState = !!tEv || chanceHit(0.20);
    if (shouldPersistState) {
      var stateLine = stamp + " — [CareerState] " +
        "industry=" + st.industry +
        "|employer=" + st.employer +
        "|level=" + st.level +
        "|tenure=" + st.tenure +
        "|income=" + st.incomeBand +
        "|lastT=" + (st.lastTransition || 0) +
        "|skill=" + encodeSkill_(st.skill) +
        "|Updated:c" + cycle;
      lifeOut = lifeOut + "\n" + stateLine;
    }

    row[iLife] = lifeOut;
    row[iLastUpd] = ctx.now;

    // v2.3: batch logs (no appendRow inside loop)
    if (logSheet) {
      logRows.push([
        ctx.now,
        row[iPopID],
        '',
        eventTag,
        pick,
        '',
        cycle
      ]);
      if (shouldPersistState) {
        logRows.push([
          ctx.now,
          row[iPopID],
          '',
          "CareerState",
          ("industry=" + st.industry + "|employer=" + st.employer + "|level=" + st.level + "|income=" + st.incomeBand),
          '',
          cycle
        ]);
      }
    }

    rows[r] = row;
    S.eventsGenerated = (S.eventsGenerated || 0) + 1;
    count++;

    sumTenure += st.tenure;
    sumLevel += st.level;
    careerCounted += 1;
  }

  ledger.getRange(2, 1, rows.length, rows[0].length).setValues(rows);

  // v2.3: flush batched logs
  if (logSheet && logRows.length) {
    var startRow = logSheet.getLastRow() + 1;
    logSheet.getRange(startRow, 1, logRows.length, logRows[0].length).setValues(logRows);
  }

  // Summary
  S.careerEvents = count;
  if (careerCounted > 0) {
    S.careerSignals.avgTenure = Math.round((sumTenure / careerCounted) * 100) / 100;
    S.careerSignals.avgLevel = Math.round((sumLevel / careerCounted) * 100) / 100;
  }
  S.careerSignals.cycle = cycle;
  ctx.summary = S;
}


/**
 * ============================================================================
 * CAREER EVENT REFERENCE v2.3.1
 * ============================================================================
 *
 * Event Tags:
 * - Career: Base career drift events
 * - Career-FirstFriday: Art walk related
 * - Career-CreationDay: Foundational reflection
 * - Career-Holiday: Holiday-specific work events
 * - Career-Transition: job transitions (promotion/layoff/lateral/shift)
 * - Career-Training: skill development events
 * - CareerState: persistent state snapshot (logged separately)
 *
 * Career State (persisted in LifeHistory):
 * - industry: tech/service/public/creative (v2.3.1 simplified)
 * - employer: small/large/public (v2.3.1 simplified)
 * - level: 1-5 (career progression)
 * - tenure: cycles in current role
 * - skill: general + industry-specific (0-1)
 * - incomeBand: low/mid/high (derived)
 *
 * Downstream Signals (ctx.summary.careerSignals):
 * - transitions/promotions/layoffs/sectorShifts/training counts
 * - avgTenure/avgLevel across processed citizens
 * - industries: count per industry
 * - pressure: industry pressure snapshot (-1 to +1)
 *
 * Integration:
 * - Economic Ripple Engine reads careerSignals.layoffs to trigger MAJOR_LAYOFFS
 * - compressLifeHistory protects [CareerState] lines from trim
 *
 * ============================================================================
 */
