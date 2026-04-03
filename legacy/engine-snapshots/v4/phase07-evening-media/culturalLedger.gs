/**
 * ============================================================================
 * registerCulturalEntity_ v2.4
 * ============================================================================
 *
 * Automatically classifies and registers cultural entities with calendar awareness.
 *
 * v2.3 Enhancements:
 * - ES5 syntax for Google Apps Script compatibility
 * - Defensive guards for ctx/summary
 * - for loops instead of arrow functions
 *
 * v2.2 Features:
 * - Expanded to 12 Oakland neighborhoods
 * - GodWorld Calendar integration (30+ holidays)
 * - Holiday-based fame score modifiers
 * - First Friday boosts for arts entities
 * - Sports season boosts for athletes
 * - Creation Day community figure awareness
 * - Cultural activity and community engagement modifiers
 * - Calendar context tracking
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - FameCategory classification
 * - CulturalDomain classification
 * - Oakland neighborhood awareness
 * - Economic mood affects fame scoring
 *
 * Ensures Media Room always knows WHY an entity is famous.
 *
 * ============================================================================
 */

function registerCulturalEntity_(ctx, name, roleType, journalistName, neighborhood) {

  // Defensive guard
  if (!ctx) return null;
  if (!ctx.summary) ctx.summary = {};

  var rng = (typeof ctx.rng === 'function') ? ctx.rng : Math.random;

  var sheet = ensureCulturalLedger_(ctx);
  var data = sheet.getDataRange().getValues();
  var header = data[0];

  var S = ctx.summary;
  var cycle = S.cycleId || ctx.config.cycleCount || 0;
  var econMood = S.economicMood || 50;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var holiday = S.holiday || "none";
  var holidayPriority = S.holidayPriority || "none";
  var isFirstFriday = S.isFirstFriday || false;
  var isCreationDay = S.isCreationDay || false;
  var sportsSeason = S.sportsSeason || "off-season";
  var dynamics = S.cityDynamics || { culturalActivity: 1, communityEngagement: 1 };
  var culturalActivity = dynamics.culturalActivity || 1;
  var communityEngagement = dynamics.communityEngagement || 1;

  // Column lookup helper
  var col = function(n) { return header.indexOf(n); };

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  function classifyRole(role) {
    if (!role) return { cat: "unknown", dom: "Other" };

    var r = role.toLowerCase().trim();

    // Arts
    if (r.indexOf("actor") !== -1 || r.indexOf("actress") !== -1) return { cat: "actor", dom: "Arts" };
    if (r.indexOf("singer") !== -1 || r.indexOf("musician") !== -1 || r.indexOf("rapper") !== -1) return { cat: "musician", dom: "Arts" };
    if (r.indexOf("band") !== -1 || r.indexOf("dj") !== -1 || r.indexOf("producer") !== -1) return { cat: "musician", dom: "Arts" };
    if (r.indexOf("artist") !== -1 || r.indexOf("painter") !== -1 || r.indexOf("sculptor") !== -1) return { cat: "artist", dom: "Arts" };
    if (r.indexOf("dancer") !== -1 || r.indexOf("choreograph") !== -1) return { cat: "dancer", dom: "Arts" };
    if (r.indexOf("gallery") !== -1 || r.indexOf("curator") !== -1) return { cat: "curator", dom: "Arts" };

    // Sports
    if (r.indexOf("athlete") !== -1 || r.indexOf("player") !== -1 || r.indexOf("sports") !== -1) return { cat: "athlete", dom: "Sports" };
    if (r.indexOf("basketball") !== -1 || r.indexOf("football") !== -1 || r.indexOf("baseball") !== -1) return { cat: "athlete", dom: "Sports" };
    if (r.indexOf("soccer") !== -1 || r.indexOf("tennis") !== -1 || r.indexOf("golf") !== -1) return { cat: "athlete", dom: "Sports" };
    if (r.indexOf("coach") !== -1 || r.indexOf("manager") !== -1) return { cat: "sports-figure", dom: "Sports" };

    // Media
    if (r.indexOf("journalist") !== -1 || r.indexOf("reporter") !== -1 || r.indexOf("anchor") !== -1) return { cat: "journalist", dom: "Media" };
    if (r.indexOf("influencer") !== -1 || r.indexOf("creator") !== -1 || r.indexOf("youtuber") !== -1) return { cat: "influencer", dom: "Media" };
    if (r.indexOf("tiktoker") !== -1 || r.indexOf("instagram") !== -1) return { cat: "influencer", dom: "Media" };
    if (r.indexOf("streamer") !== -1 || r.indexOf("twitch") !== -1 || r.indexOf("gamer") !== -1) return { cat: "streamer", dom: "Media" };
    if (r.indexOf("podcast") !== -1 || r.indexOf("host") !== -1) return { cat: "media-personality", dom: "Media" };

    // Civic
    if (r.indexOf("civic") !== -1 || r.indexOf("politic") !== -1 || r.indexOf("council") !== -1) return { cat: "civic-figure", dom: "Civic" };
    if (r.indexOf("mayor") !== -1 || r.indexOf("governor") !== -1 || r.indexOf("senator") !== -1) return { cat: "civic-figure", dom: "Civic" };
    if (r.indexOf("activist") !== -1 || r.indexOf("advocate") !== -1) return { cat: "activist", dom: "Civic" };
    if (r.indexOf("community") !== -1 || r.indexOf("organizer") !== -1) return { cat: "community-leader", dom: "Civic" };

    // Culinary
    if (r.indexOf("chef") !== -1 || r.indexOf("cook") !== -1 || r.indexOf("restaurateur") !== -1) return { cat: "chef", dom: "Culinary" };

    // Literature
    if (r.indexOf("author") !== -1 || r.indexOf("writer") !== -1 || r.indexOf("novelist") !== -1) return { cat: "author", dom: "Literature" };
    if (r.indexOf("poet") !== -1 || r.indexOf("playwright") !== -1) return { cat: "author", dom: "Literature" };

    // Fashion
    if (r.indexOf("model") !== -1 || r.indexOf("fashion") !== -1 || r.indexOf("designer") !== -1) return { cat: "model", dom: "Fashion" };

    // Business
    if (r.indexOf("ceo") !== -1 || r.indexOf("founder") !== -1 || r.indexOf("entrepreneur") !== -1) return { cat: "business-figure", dom: "Business" };
    if (r.indexOf("executive") !== -1 || r.indexOf("investor") !== -1) return { cat: "business-figure", dom: "Business" };

    return { cat: "unknown", dom: "Other" };
  }

  // === If roleType missing, attempt auto-inference ===
  if (!roleType || roleType.trim() === "") {
    if (typeof inferCulturalRoleByContext_ === 'function') {
      var inferred = inferCulturalRoleByContext_(ctx, name, journalistName);
      roleType = inferred || "public-figure";
    } else {
      roleType = "public-figure";
    }
  }

  var fam = classifyRole(roleType);

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOODS (12 - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  var validNeighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];
  var validNeighborhood = "";
  for (var ni = 0; ni < validNeighborhoods.length; ni++) {
    if (validNeighborhoods[ni] === neighborhood) {
      validNeighborhood = neighborhood;
      break;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FAME SCORE MODIFIERS (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  // Economic mood modifier (v2.1)
  var fameBonus = 0;
  if (econMood >= 65) fameBonus += 2;
  else if (econMood <= 35) fameBonus -= 1;

  // ─────────────────────────────────────────────────────────────────────────
  // HOLIDAY FAME MODIFIERS (v2.2)
  // ─────────────────────────────────────────────────────────────────────────

  // Cultural holidays boost cultural figures
  var culturalHolidays = [
    "Juneteenth", "CincoDeMayo", "DiaDeMuertos", "LunarNewYear",
    "MLKDay", "OaklandPride", "ArtSoulFestival", "BlackHistoryMonth"
  ];
  var isCulturalHoliday = false;
  for (var chi = 0; chi < culturalHolidays.length; chi++) {
    if (culturalHolidays[chi] === holiday) { isCulturalHoliday = true; break; }
  }
  if (isCulturalHoliday) {
    if (fam.dom === "Arts" || fam.dom === "Civic" || fam.cat === "activist") {
      fameBonus += 3;
    }
  }

  // Oakland pride boosts LGBTQ+ and community figures
  if (holiday === "OaklandPride") {
    if (fam.dom === "Civic" || fam.cat === "activist" || fam.cat === "community-leader") {
      fameBonus += 4;
    }
  }

  // Art & Soul Festival boosts arts figures
  if (holiday === "ArtSoulFestival") {
    if (fam.dom === "Arts") {
      fameBonus += 5;
    }
  }

  // Sports holidays boost athletes
  if (holiday === "OpeningDay") {
    if (fam.dom === "Sports") {
      fameBonus += 5;
    }
  }

  // Culinary holidays boost chefs
  var culinaryHolidays = ["Thanksgiving", "CincoDeMayo", "DiaDeMuertos", "LunarNewYear"];
  var isCulinaryHoliday = false;
  for (var clhi = 0; clhi < culinaryHolidays.length; clhi++) {
    if (culinaryHolidays[clhi] === holiday) { isCulinaryHoliday = true; break; }
  }
  if (isCulinaryHoliday) {
    if (fam.dom === "Culinary") {
      fameBonus += 3;
    }
  }

  // Major holidays general boost
  if (holidayPriority === "major") {
    fameBonus += 1;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FIRST FRIDAY FAME MODIFIERS (v2.2)
  // ─────────────────────────────────────────────────────────────────────────
  if (isFirstFriday) {
    // Arts figures get big boost
    if (fam.dom === "Arts") {
      fameBonus += 4;
    }
    // Arts neighborhood entities get extra boost
    var artsNeighborhoods = ["Uptown", "KONO", "Temescal", "Jack London"];
    for (var ani = 0; ani < artsNeighborhoods.length; ani++) {
      if (artsNeighborhoods[ani] === validNeighborhood) {
        fameBonus += 2;
        break;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATION DAY FAME MODIFIERS (v2.2)
  // ─────────────────────────────────────────────────────────────────────────
  if (isCreationDay) {
    // Community leaders and civic figures get boost
    if (fam.dom === "Civic" || fam.cat === "community-leader" || fam.cat === "activist") {
      fameBonus += 3;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SPORTS SEASON FAME MODIFIERS (v2.2)
  // ─────────────────────────────────────────────────────────────────────────
  if (fam.dom === "Sports") {
    if (sportsSeason === "championship") {
      fameBonus += 6;
    } else if (sportsSeason === "playoffs" || sportsSeason === "post-season") {
      fameBonus += 4;
    } else if (sportsSeason === "late-season") {
      fameBonus += 2;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CULTURAL ACTIVITY FAME MODIFIERS (v2.2)
  // ─────────────────────────────────────────────────────────────────────────
  if (culturalActivity >= 1.4) {
    if (fam.dom === "Arts") {
      fameBonus += 2;
    }
  }

  if (communityEngagement >= 1.4) {
    if (fam.dom === "Civic" || fam.cat === "community-leader") {
      fameBonus += 2;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COLUMN INDICES
  // ═══════════════════════════════════════════════════════════════════════════
  var iCulId = col('CUL-ID');
  var iName = col('Name');
  var iRoleType = col('RoleType');
  var iFameCat = col('FameCategory');
  var iCulDom = col('CulturalDomain');
  var iNeighborhood = col('Neighborhood');
  var iFirstSeen = col('FirstSeenCycle');
  var iLastSeen = col('LastSeenCycle');
  var iMediaCount = col('MediaCount');
  var iFameScore = col('FameScore');
  var iTrend = col('TrendTrajectory');
  var iFirstRef = col('FirstRefSource');
  var iMediaSpread = col('MediaSpread');
  var iCityTier = col('CityTier');
  var iStatus = col('Status');

  // Calendar columns (v2.2)
  var iFirstHoliday = col('FirstSeenHoliday');
  var iLastHoliday = col('LastSeenHoliday');
  var iCalendarContext = col('CalendarContext');

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE IF EXISTS
  // ═══════════════════════════════════════════════════════════════════════════
  for (var i = 1; i < data.length; i++) {
    var rowName = iName >= 0 ? data[i][iName] : data[i][2];
    
    if (rowName === name) {

      // Update LastSeenCycle
      if (iLastSeen >= 0) {
        sheet.getRange(i + 1, iLastSeen + 1).setValue(cycle);
      }

      // MediaCount
      var mcCol = iMediaCount >= 0 ? iMediaCount : 10;
      var mc = Number(data[i][mcCol] || 0) + 1;
      sheet.getRange(i + 1, mcCol + 1).setValue(mc);

      // FameScore with calendar bonus
      var fsCol = iFameScore >= 0 ? iFameScore : 11;
      var baseFame = Number(data[i][fsCol] || 0);
      var newFame = baseFame + 5 + fameBonus;
      sheet.getRange(i + 1, fsCol + 1).setValue(newFame);

      // FameCategory + Domain refresh
      if (iFameCat >= 0) sheet.getRange(i + 1, iFameCat + 1).setValue(fam.cat);
      if (iCulDom >= 0) sheet.getRange(i + 1, iCulDom + 1).setValue(fam.dom);

      // Neighborhood update if provided and column exists
      if (iNeighborhood >= 0 && validNeighborhood) {
        sheet.getRange(i + 1, iNeighborhood + 1).setValue(validNeighborhood);
      }

      // Calendar columns update (v2.2)
      if (iLastHoliday >= 0 && holiday !== "none") {
        sheet.getRange(i + 1, iLastHoliday + 1).setValue(holiday);
      }
      if (iCalendarContext >= 0) {
        var calCtx = buildCalendarContext_();
        sheet.getRange(i + 1, iCalendarContext + 1).setValue(calCtx);
      }

      // Helper updates
      if (typeof updateMediaSpread_ === 'function') {
        updateMediaSpread_(sheet, i + 1, journalistName);
      }
      if (typeof updateTrendTrajectory_ === 'function') {
        updateTrendTrajectory_(sheet, i + 1, newFame);
      }
      if (typeof updateCityTier_ === 'function') {
        updateCityTier_(sheet, i + 1, newFame, mc);
      }

      // Track in summary
      S.culturalEntityUpdates = S.culturalEntityUpdates || [];
      S.culturalEntityUpdates.push({
        culId: iCulId >= 0 ? data[i][iCulId] : data[i][1],
        name: name,
        fameCategory: fam.cat,
        domain: fam.dom,
        newFameScore: newFame,
        mediaCount: mc,
        calendarBonus: fameBonus,
        holiday: holiday,
        isFirstFriday: isFirstFriday,
        sportsSeason: sportsSeason
      });

      return iCulId >= 0 ? data[i][iCulId] : data[i][1];
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE NEW CUL-ID
  // ═══════════════════════════════════════════════════════════════════════════
  var culId = "CUL-" + (typeof shortId_ === 'function' ? shortId_().toUpperCase() : rng().toString(36).substr(2, 6).toUpperCase());

  // Build calendar context string (v2.2)
  function buildCalendarContext_() {
    var parts = [];
    if (holiday !== "none") parts.push(holiday);
    if (isFirstFriday) parts.push("FirstFriday");
    if (isCreationDay) parts.push("CreationDay");
    if (sportsSeason !== "off-season") parts.push(sportsSeason);
    return parts.join(", ") || "";
  }

  var newRow = [
    new Date(),               // Timestamp
    culId,                    // CUL-ID
    name,                     // Name
    roleType,                 // RoleType
    fam.cat,                  // FameCategory
    fam.dom,                  // CulturalDomain
    "Active",                 // Status
    "",                       // UniverseLinks
    cycle,                    // FirstSeenCycle
    cycle,                    // LastSeenCycle
    1,                        // MediaCount
    10 + fameBonus,           // FameScore start (with calendar bonus)
    "rising",                 // TrendTrajectory
    journalistName || "",     // FirstRefSource
    1,                        // MediaSpread
    "Local",                  // CityTier
    validNeighborhood,        // Neighborhood
    holiday !== "none" ? holiday : "",  // FirstSeenHoliday (v2.2)
    holiday !== "none" ? holiday : "",  // LastSeenHoliday (v2.2)
    buildCalendarContext_()   // CalendarContext (v2.2)
  ];

  sheet.appendRow(newRow);

  // Track in summary
  S.culturalEntityCreates = S.culturalEntityCreates || [];
  S.culturalEntityCreates.push({
    culId: culId,
    name: name,
    fameCategory: fam.cat,
    domain: fam.dom,
    neighborhood: validNeighborhood,
    initialFameBonus: fameBonus,
    holiday: holiday,
    isFirstFriday: isFirstFriday,
    isCreationDay: isCreationDay,
    sportsSeason: sportsSeason
  });

  ctx.summary = S;

  return culId;
}


/**
 * ============================================================================
 * CULTURAL ENTITY REGISTRATION REFERENCE
 * ============================================================================
 * 
 * FAME CATEGORIES:
 * - actor, musician, artist, dancer, curator
 * - athlete, sports-figure
 * - journalist, influencer, streamer, media-personality
 * - civic-figure, activist, community-leader
 * - chef
 * - author
 * - model
 * - business-figure
 * - unknown
 * 
 * CULTURAL DOMAINS:
 * - Arts, Sports, Media, Civic, Culinary
 * - Literature, Fashion, Business, Other
 * 
 * NEIGHBORHOODS (12):
 * - Temescal, Downtown, Fruitvale, Lake Merritt
 * - West Oakland, Laurel, Rockridge, Jack London
 * - Uptown, KONO, Chinatown, Piedmont Ave
 * 
 * FAME SCORE MODIFIERS (v2.2):
 * 
 * | Factor | Domain/Category | Bonus |
 * |--------|-----------------|-------|
 * | Economic mood ≥65 | All | +2 |
 * | Economic mood ≤35 | All | -1 |
 * | Cultural holidays | Arts/Civic/activist | +3 |
 * | OaklandPride | Civic/activist/community | +4 |
 * | ArtSoulFestival | Arts | +5 |
 * | OpeningDay | Sports | +5 |
 * | Culinary holidays | Culinary | +3 |
 * | Major holiday | All | +1 |
 * | First Friday | Arts | +4 |
 * | First Friday + arts neighborhood | All | +2 |
 * | Creation Day | Civic/community-leader | +3 |
 * | Championship | Sports | +6 |
 * | Playoffs | Sports | +4 |
 * | Late-season | Sports | +2 |
 * | High cultural activity | Arts | +2 |
 * | High community engagement | Civic/community | +2 |
 * 
 * NEW LEDGER COLUMNS (v2.2):
 * - FirstSeenHoliday: Holiday when entity first registered
 * - LastSeenHoliday: Most recent holiday when entity referenced
 * - CalendarContext: Combined calendar state string
 * 
 * SUMMARY TRACKING:
 * - culturalEntityUpdates: Array of updated entities
 * - culturalEntityCreates: Array of new entities
 * - Both include calendar context (v2.2)
 * 
 * ============================================================================
 */