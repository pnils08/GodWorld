/**
 * ============================================================================
 * registerCulturalEntity_ v2.2
 * ============================================================================
 *
 * Automatically classifies and registers cultural entities with calendar awareness.
 *
 * v2.2 Enhancements:
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

  const sheet = ensureCulturalLedger_(ctx);
  const data = sheet.getDataRange().getValues();
  const header = data[0];

  const S = ctx.summary;
  const cycle = S.cycleId || ctx.config.cycleCount || 0;
  const econMood = S.economicMood || 50;

  // ═══════════════════════════════════════════════════════════════════════════
  // CALENDAR CONTEXT (v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;
  const sportsSeason = S.sportsSeason || "off-season";
  const dynamics = S.cityDynamics || { culturalActivity: 1, communityEngagement: 1 };
  const culturalActivity = dynamics.culturalActivity || 1;
  const communityEngagement = dynamics.communityEngagement || 1;

  // Column lookup helper
  const col = n => header.indexOf(n);

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLE CLASSIFICATION
  // ═══════════════════════════════════════════════════════════════════════════
  function classifyRole(role) {
    if (!role) return { cat: "unknown", dom: "Other" };

    const r = role.toLowerCase().trim();

    // Arts
    if (r.includes("actor") || r.includes("actress")) return { cat: "actor", dom: "Arts" };
    if (r.includes("singer") || r.includes("musician") || r.includes("rapper")) return { cat: "musician", dom: "Arts" };
    if (r.includes("band") || r.includes("dj") || r.includes("producer")) return { cat: "musician", dom: "Arts" };
    if (r.includes("artist") || r.includes("painter") || r.includes("sculptor")) return { cat: "artist", dom: "Arts" };
    if (r.includes("dancer") || r.includes("choreograph")) return { cat: "dancer", dom: "Arts" };
    if (r.includes("gallery") || r.includes("curator")) return { cat: "curator", dom: "Arts" };

    // Sports
    if (r.includes("athlete") || r.includes("player") || r.includes("sports")) return { cat: "athlete", dom: "Sports" };
    if (r.includes("basketball") || r.includes("football") || r.includes("baseball")) return { cat: "athlete", dom: "Sports" };
    if (r.includes("soccer") || r.includes("tennis") || r.includes("golf")) return { cat: "athlete", dom: "Sports" };
    if (r.includes("coach") || r.includes("manager")) return { cat: "sports-figure", dom: "Sports" };

    // Media
    if (r.includes("journalist") || r.includes("reporter") || r.includes("anchor")) return { cat: "journalist", dom: "Media" };
    if (r.includes("influencer") || r.includes("creator") || r.includes("youtuber")) return { cat: "influencer", dom: "Media" };
    if (r.includes("tiktoker") || r.includes("instagram")) return { cat: "influencer", dom: "Media" };
    if (r.includes("streamer") || r.includes("twitch") || r.includes("gamer")) return { cat: "streamer", dom: "Media" };
    if (r.includes("podcast") || r.includes("host")) return { cat: "media-personality", dom: "Media" };

    // Civic
    if (r.includes("civic") || r.includes("politic") || r.includes("council")) return { cat: "civic-figure", dom: "Civic" };
    if (r.includes("mayor") || r.includes("governor") || r.includes("senator")) return { cat: "civic-figure", dom: "Civic" };
    if (r.includes("activist") || r.includes("advocate")) return { cat: "activist", dom: "Civic" };
    if (r.includes("community") || r.includes("organizer")) return { cat: "community-leader", dom: "Civic" };

    // Culinary
    if (r.includes("chef") || r.includes("cook") || r.includes("restaurateur")) return { cat: "chef", dom: "Culinary" };

    // Literature
    if (r.includes("author") || r.includes("writer") || r.includes("novelist")) return { cat: "author", dom: "Literature" };
    if (r.includes("poet") || r.includes("playwright")) return { cat: "author", dom: "Literature" };

    // Fashion
    if (r.includes("model") || r.includes("fashion") || r.includes("designer")) return { cat: "model", dom: "Fashion" };

    // Business
    if (r.includes("ceo") || r.includes("founder") || r.includes("entrepreneur")) return { cat: "business-figure", dom: "Business" };
    if (r.includes("executive") || r.includes("investor")) return { cat: "business-figure", dom: "Business" };

    return { cat: "unknown", dom: "Other" };
  }

  // === If roleType missing, attempt auto-inference ===
  if (!roleType || roleType.trim() === "") {
    if (typeof inferCulturalRoleByContext_ === 'function') {
      const inferred = inferCulturalRoleByContext_(ctx, name, journalistName);
      roleType = inferred || "public-figure";
    } else {
      roleType = "public-figure";
    }
  }

  const fam = classifyRole(roleType);

  // ═══════════════════════════════════════════════════════════════════════════
  // NEIGHBORHOODS (12 - v2.2)
  // ═══════════════════════════════════════════════════════════════════════════
  const validNeighborhoods = [
    "Temescal", "Downtown", "Fruitvale", "Lake Merritt",
    "West Oakland", "Laurel", "Rockridge", "Jack London",
    "Uptown", "KONO", "Chinatown", "Piedmont Ave"
  ];
  const validNeighborhood = validNeighborhoods.includes(neighborhood) ? neighborhood : "";

  // ═══════════════════════════════════════════════════════════════════════════
  // FAME SCORE MODIFIERS (v2.2 - calendar-aware)
  // ═══════════════════════════════════════════════════════════════════════════

  // Economic mood modifier (v2.1)
  let fameBonus = 0;
  if (econMood >= 65) fameBonus += 2;
  else if (econMood <= 35) fameBonus -= 1;

  // ─────────────────────────────────────────────────────────────────────────
  // HOLIDAY FAME MODIFIERS (v2.2)
  // ─────────────────────────────────────────────────────────────────────────

  // Cultural holidays boost cultural figures
  const culturalHolidays = [
    "Juneteenth", "CincoDeMayo", "DiaDeMuertos", "LunarNewYear",
    "MLKDay", "OaklandPride", "ArtSoulFestival", "BlackHistoryMonth"
  ];
  if (culturalHolidays.includes(holiday)) {
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
  const culinaryHolidays = ["Thanksgiving", "CincoDeMayo", "DiaDeMuertos", "LunarNewYear"];
  if (culinaryHolidays.includes(holiday)) {
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
    const artsNeighborhoods = ["Uptown", "KONO", "Temescal", "Jack London"];
    if (artsNeighborhoods.includes(validNeighborhood)) {
      fameBonus += 2;
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
  const iCulId = col('CUL-ID');
  const iName = col('Name');
  const iRoleType = col('RoleType');
  const iFameCat = col('FameCategory');
  const iCulDom = col('CulturalDomain');
  const iNeighborhood = col('Neighborhood');
  const iFirstSeen = col('FirstSeenCycle');
  const iLastSeen = col('LastSeenCycle');
  const iMediaCount = col('MediaCount');
  const iFameScore = col('FameScore');
  const iTrend = col('TrendTrajectory');
  const iFirstRef = col('FirstRefSource');
  const iMediaSpread = col('MediaSpread');
  const iCityTier = col('CityTier');
  const iStatus = col('Status');
  
  // Calendar columns (v2.2)
  const iFirstHoliday = col('FirstSeenHoliday');
  const iLastHoliday = col('LastSeenHoliday');
  const iCalendarContext = col('CalendarContext');

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE IF EXISTS
  // ═══════════════════════════════════════════════════════════════════════════
  for (let i = 1; i < data.length; i++) {
    const rowName = iName >= 0 ? data[i][iName] : data[i][2];
    
    if (rowName === name) {

      // Update LastSeenCycle
      if (iLastSeen >= 0) {
        sheet.getRange(i + 1, iLastSeen + 1).setValue(cycle);
      }

      // MediaCount
      const mcCol = iMediaCount >= 0 ? iMediaCount : 10;
      const mc = Number(data[i][mcCol] || 0) + 1;
      sheet.getRange(i + 1, mcCol + 1).setValue(mc);

      // FameScore with calendar bonus
      const fsCol = iFameScore >= 0 ? iFameScore : 11;
      const baseFame = Number(data[i][fsCol] || 0);
      const newFame = baseFame + 5 + fameBonus;
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
        const calCtx = buildCalendarContext_();
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
  const culId = "CUL-" + (typeof shortId_ === 'function' ? shortId_().toUpperCase() : Math.random().toString(36).substr(2, 6).toUpperCase());

  // Build calendar context string (v2.2)
  function buildCalendarContext_() {
    const parts = [];
    if (holiday !== "none") parts.push(holiday);
    if (isFirstFriday) parts.push("FirstFriday");
    if (isCreationDay) parts.push("CreationDay");
    if (sportsSeason !== "off-season") parts.push(sportsSeason);
    return parts.join(", ") || "";
  }

  const newRow = [
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