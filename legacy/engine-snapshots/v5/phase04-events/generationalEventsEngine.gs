/**
 * ============================================================================
 * GENERATIONAL EVENTS ENGINE V2.4 (schema-safe log + normalized calendar + deterministic RNG)
 * ============================================================================
 * Key fixes:
 * - LifeHistory_Log schema-safe writes: do NOT add/move columns; only fill existing,
 *   and optionally fill extra columns ONLY if they already exist at the end.
 * - Normalize calendar season to lowercase for all comparisons.
 * - Deterministic RNG support: ctx.rng or ctx.config.rngSeed ^ cycle.
 * - Health lifecycle uses normalized weighted outcomes (stable probabilities).
 * ============================================================================
 */

// ============================================================
// CONSTANTS
// ============================================================

var MILESTONE_TYPES = {
  GRADUATION: "graduation",
  WEDDING: "wedding",
  BIRTH: "birth",
  PROMOTION: "promotion",
  CAREER_PIVOT: "career_pivot",
  RETIREMENT: "retirement",
  DEATH: "death",
  ANNIVERSARY: "anniversary",
  DIVORCE: "divorce",
  HEALTH_EVENT: "health_event",
  HOSPITALIZATION: "hospitalization",
  RECOVERY: "recovery"
};

var AGE_RANGES = {
  GRADUATION: { min: 22, max: 28 },
  WEDDING: { min: 24, max: 50 },
  BIRTH: { min: 26, max: 42 },
  PROMOTION: { min: 28, max: 58 },
  RETIREMENT: { min: 58, max: 72 },
  DEATH_NATURAL: { min: 65, max: 100 }
};

var WEDDING_BOOST_HOLIDAYS = [
  "ValentinesDay", // legacy
  "Valentine",     // used elsewhere in your scripts
  "NewYearsEve"
];

var STRESS_HOLIDAYS = ["Thanksgiving", "Holiday", "NewYearsEve"];

// v2.2: Health status constants
var HEALTH_STATUSES = {
  ACTIVE: "active",
  HOSPITALIZED: "hospitalized",
  CRITICAL: "critical",
  RECOVERING: "recovering",
  DECEASED: "deceased"
};

// v2.2: Health transition probabilities by duration
var HEALTH_TRANSITIONS = {
  hospitalized: {
    short: { recovering: 0.40, critical: 0.10, stay: 0.50 },
    medium: { recovering: 0.50, critical: 0.15, stay: 0.35 },
    long: { recovering: 0.60, critical: 0.20, stay: 0.20 }
  },
  critical: {
    short: { hospitalized: 0.30, deceased: 0.40, stay: 0.30 },
    long: { hospitalized: 0.20, deceased: 0.60, stay: 0.20 }
  },
  recovering: {
    short: { active: 0.70, hospitalized: 0.10, stay: 0.20 },
    long: { active: 0.90, hospitalized: 0.05, stay: 0.05 }
  },
  injured: {
    short: { active: 0.50, hospitalized: 0.05, stay: 0.45 },
    medium: { active: 0.65, hospitalized: 0.05, stay: 0.30 },
    long: { active: 0.85, hospitalized: 0.05, stay: 0.10 }
  },
  "serious-condition": {
    short: { hospitalized: 0.30, critical: 0.15, stay: 0.55 },
    medium: { hospitalized: 0.40, critical: 0.15, stay: 0.45 },
    long: { hospitalized: 0.50, critical: 0.20, stay: 0.30 }
  }
};

// ============================================================
// RNG HELPERS
// ============================================================

function mulberry32_(seed) {
  return function rng() {
    seed = (seed + 0x6D2B79F5) >>> 0;
    var t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function initRng_(ctx, cycle) {
  if (typeof ctx.rng === "function") return ctx.rng;
  if (ctx.config && typeof ctx.config.rngSeed === "number") {
    return mulberry32_(((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0)) >>> 0);
  }
  return Math.random;
}

function rand_(ctx) {
  if (!ctx._rng) {
    // v2.4: prefer ctx.rng over Math.random
    return (typeof ctx.rng === 'function') ? ctx.rng() : Math.random();
  }
  return ctx._rng();
}

function chance_(ctx, p) {
  return rand_(ctx) < p;
}

function pick_(ctx, arr) {
  return arr[Math.floor(rand_(ctx) * arr.length)];
}

// ============================================================
// LOG SCHEMA HELPERS (NO mid-array changes; only fill existing cols)
// ============================================================

function getLogWidth_(lifeLog) {
  if (!lifeLog) return 0;
  var lastCol = lifeLog.getLastColumn();
  if (lastCol <= 0) return 0;

  // Prefer header width if present
  var header = lifeLog.getRange(1, 1, 1, lastCol).getValues()[0];
  var w = 0;
  for (var i = header.length - 1; i >= 0; i--) {
    if (header[i] !== "" && header[i] != null) {
      w = i + 1;
      break;
    }
  }
  return w || lastCol;
}

function buildLogRowSchemaSafe_(width, base7, extras) {
  // base7: [date, popId, name, tag, desc, neighborhood, cycle]
  // extras: appended-only values (e.g. holiday, season) if width allows
  var row = base7.slice(0);
  if (extras && extras.length) {
    for (var i = 0; i < extras.length; i++) row.push(extras[i]);
  }
  if (width > 0) {
    if (row.length > width) row = row.slice(0, width);
    while (row.length < width) row.push("");
  }
  return row;
}

// ============================================================
// MAIN ENGINE
// ============================================================

function runGenerationalEngine_(ctx) {
  var sheet = ctx.ss.getSheetByName("Simulation_Ledger");
  if (!sheet) return;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  var header = values[0];
  var rows = values.slice(1);
  var idx = function (n) { return header.indexOf(n); };

  var iPopID = idx("POPID");
  var iFirst = idx("First");
  var iLast = idx("Last");
  var iBirthYear = idx("BirthYear");
  var iTier = idx("Tier");
  var iClock = idx("ClockMode");
  var iStatus = idx("Status");
  var iLife = idx("LifeHistory");
  var iLastU = idx("LastUpdated");
  var iTierRole = idx("TierRole");
  var iNeighborhood = idx("Neighborhood");

  var iStatusStart = idx("StatusStartCycle");
  var iHealthCause = idx("HealthCause");

  var lifeLog = ctx.ss.getSheetByName("LifeHistory_Log");
  var cycle = (ctx.summary && ctx.summary.cycleId) || (ctx.config && ctx.config.cycleCount) || 0;

  ctx._rng = initRng_(ctx, cycle);

  // 52 cycles = 1 year
  var simYear = (ctx.summary && ctx.summary.simYear) || (2040 + Math.floor(cycle / 52));

  // Calendar context (normalize season for comparisons)
  var calendarContext = {
    holiday: (ctx.summary && ctx.summary.holiday) || "none",
    holidayPriority: (ctx.summary && ctx.summary.holidayPriority) || "none",
    isFirstFriday: !!(ctx.summary && ctx.summary.isFirstFriday),
    isCreationDay: !!(ctx.summary && ctx.summary.isCreationDay),
    sportsSeason: (ctx.summary && ctx.summary.sportsSeason) || "off-season",
    season: ((ctx.summary && ctx.summary.season) || "unknown").toString().toLowerCase(),
    month: (ctx.summary && ctx.summary.month) || 0
  };
  ctx.generationalCalendarContext = calendarContext;

  ctx.summary.generationalEvents = [];

  var limits = getSeasonalLimits_(calendarContext);

  var counts = {
    graduations: 0,
    weddings: 0,
    births: 0,
    promotions: 0,
    retirements: 0,
    deaths: 0,
    recoveries: 0,
    deteriorations: 0
  };

  var updatedRows = {};
  var logWidth = getLogWidth_(lifeLog);

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];

    var popId = row[iPopID];
    var status = (row[iStatus] || "active").toString().toLowerCase().trim();
    var birthYear = Number(row[iBirthYear]) || 0;
    var tier = Number(row[iTier]) || 0;
    var mode = row[iClock] || "ENGINE";
    var tierRole = row[iTierRole] || "";
    var lifeHistory = row[iLife] ? row[iLife].toString() : "";
    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || "") : "";

    var statusStartCycle = iStatusStart >= 0 ? (Number(row[iStatusStart]) || 0) : 0;
    var healthCause = iHealthCause >= 0 ? (row[iHealthCause] || "") : "";
    var statusDuration = statusStartCycle > 0 ? (cycle - statusStartCycle) : 0;

    if (status === "deceased" || status === "inactive") continue;
    if (mode !== "ENGINE") continue;

    var age = birthYear ? (simYear - birthYear) : 0;
    var name = ((row[iFirst] || "") + " " + (row[iLast] || "")).trim();

    // HEALTH STATUS LIFECYCLE
    if (status === "hospitalized" || status === "critical" || status === "recovering" ||
        status === "injured" || status === "serious-condition") {
      var healthResult = processHealthLifecycle_(
        ctx, popId, name, status, statusDuration, age, tier,
        healthCause, neighborhood, cycle, calendarContext
      );

      if (healthResult) {
        row[iStatus] = healthResult.newStatus;

        if (healthResult.newStatus !== status) {
          if (iStatusStart >= 0) {
            row[iStatusStart] = (healthResult.newStatus === "active") ? "" : cycle;
          }
        }

        if (healthResult.newStatus === "active" && iHealthCause >= 0) {
          row[iHealthCause] = "";
        }

        var transitionEvent = applyMilestone_(
          ctx, row, iLife, iLastU, healthResult, name, popId,
          neighborhood, cycle, lifeLog, calendarContext, logWidth
        );
        ctx.summary.generationalEvents.push(transitionEvent);

        if (healthResult.newStatus === "active") counts.recoveries++;
        if (healthResult.newStatus === "deceased") counts.deaths++;
        if (healthResult.newStatus === "critical") counts.deteriorations++;

        if (healthResult.newStatus === "deceased") {
          triggerDeathCascade_(ctx, popId, name, tier, tierRole, neighborhood, cycle, calendarContext);
        }

        updatedRows[r] = true;
      }

      continue;
    }

    // REGULAR MILESTONE CHECKS (active citizens)

    if (counts.graduations < limits.graduations && birthYear) {
      var gradResult = checkGraduation_(ctx, popId, age, lifeHistory, tier, calendarContext);
      if (gradResult) {
        ctx.summary.generationalEvents.push(applyMilestone_(
          ctx, row, iLife, iLastU, gradResult, name, popId, neighborhood, cycle, lifeLog, calendarContext, logWidth
        ));
        updatedRows[r] = true;
        counts.graduations++;
      }
    }

    if (counts.weddings < limits.weddings && birthYear) {
      var weddingResult = checkWedding_(ctx, popId, age, lifeHistory, calendarContext);
      if (weddingResult) {
        ctx.summary.generationalEvents.push(applyMilestone_(
          ctx, row, iLife, iLastU, weddingResult, name, popId, neighborhood, cycle, lifeLog, calendarContext, logWidth
        ));
        if (weddingResult.spouseId) {
          createBond_(ctx, popId, weddingResult.spouseId, "romantic", "wedding", "", neighborhood, "Married partners");
        }
        updatedRows[r] = true;
        counts.weddings++;
      }
    }

    if (counts.births < limits.births && birthYear) {
      var birthResult = checkBirth_(ctx, popId, age, lifeHistory, calendarContext);
      if (birthResult) {
        ctx.summary.generationalEvents.push(applyMilestone_(
          ctx, row, iLife, iLastU, birthResult, name, popId, neighborhood, cycle, lifeLog, calendarContext, logWidth
        ));
        triggerBirthCascade_(ctx, popId, name, neighborhood, cycle, calendarContext);
        updatedRows[r] = true;
        counts.births++;
      }
    }

    if (counts.promotions < limits.promotions && birthYear) {
      var promoResult = checkPromotion_(ctx, popId, age, lifeHistory, tier, tierRole, calendarContext);
      if (promoResult) {
        ctx.summary.generationalEvents.push(applyMilestone_(
          ctx, row, iLife, iLastU, promoResult, name, popId, neighborhood, cycle, lifeLog, calendarContext, logWidth
        ));
        triggerPromotionCascade_(ctx, popId, promoResult, cycle);
        updatedRows[r] = true;
        counts.promotions++;
      }
    }

    if (counts.retirements < limits.retirements && birthYear) {
      var retireResult = checkRetirement_(ctx, popId, age, lifeHistory, tier, calendarContext);
      if (retireResult) {
        ctx.summary.generationalEvents.push(applyMilestone_(
          ctx, row, iLife, iLastU, retireResult, name, popId, neighborhood, cycle, lifeLog, calendarContext, logWidth
        ));
        triggerRetirementCascade_(ctx, popId, name, tierRole, neighborhood, cycle, calendarContext);
        updatedRows[r] = true;
        counts.retirements++;
      }
    }

    if (counts.deaths < limits.deaths && birthYear) {
      var deathResult = checkDeath_(ctx, popId, age, lifeHistory, tier, calendarContext);
      if (deathResult) {
        ctx.summary.generationalEvents.push(applyMilestone_(
          ctx, row, iLife, iLastU, deathResult, name, popId, neighborhood, cycle, lifeLog, calendarContext, logWidth
        ));
        row[iStatus] = "deceased";
        triggerDeathCascade_(ctx, popId, name, tier, tierRole, neighborhood, cycle, calendarContext);
        updatedRows[r] = true;
        counts.deaths++;
      }
    }

    var healthResult2 = checkHealthEvent_(ctx, popId, age, lifeHistory, calendarContext);
    if (healthResult2) {
      ctx.summary.generationalEvents.push(applyMilestone_(
        ctx, row, iLife, iLastU, healthResult2, name, popId, neighborhood, cycle, lifeLog, calendarContext, logWidth
      ));

      if (healthResult2.severity === "severe") {
        row[iStatus] = "hospitalized";
        if (iStatusStart >= 0) row[iStatusStart] = cycle;
      }

      updatedRows[r] = true;
    }
  }

  var updatedCount = 0;
  for (var key in updatedRows) if (updatedRows.hasOwnProperty(key)) updatedCount++;

  if (updatedCount > 0) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  generateGenerationalSummary_(ctx);

  Logger.log(
    "runGenerationalEngine_ v2.4: " + ctx.summary.generationalEvents.length +
    " events | Recoveries: " + counts.recoveries +
    " | Deaths: " + counts.deaths
  );
}

// ============================================================
// HEALTH STATUS LIFECYCLE (normalized weighted outcomes)
// ============================================================

function processHealthLifecycle_(ctx, popId, name, currentStatus, duration, age, tier, cause, neighborhood, cycle, cal) {
  var transitions = HEALTH_TRANSITIONS[currentStatus];
  if (!transitions) return null;

  var bracket;
  if (duration <= 2) bracket = "short";
  else if (duration <= 4) bracket = "medium";
  else bracket = "long";

  var probs = transitions[bracket] || transitions["long"] || transitions["short"];
  if (!probs) return null;

  var ageMod = 1.0;
  if (age >= 70) ageMod = 1.3;
  if (age >= 80) ageMod = 1.5;

  var tierMod = 1.0;
  if (tier <= 2) tierMod = 0.8;

  var seasonMod = 1.0;
  if (cal.season === "winter") seasonMod *= 1.1;
  if (STRESS_HOLIDAYS.indexOf(cal.holiday) >= 0) seasonMod *= 1.1;

  // Build weighted outcomes and normalize
  var outcomes = [];
  function addOutcome_(key, weight) {
    if (weight > 0) outcomes.push({ key: key, w: weight });
  }
  function pickOutcome_() {
    var total = 0;
    for (var i = 0; i < outcomes.length; i++) total += outcomes[i].w;
    if (total <= 0) return null;
    var x = rand_(ctx) * total;
    for (var j = 0; j < outcomes.length; j++) {
      if (x < outcomes[j].w) return outcomes[j].key;
      x -= outcomes[j].w;
    }
    return outcomes[0].key;
  }

  var newStatus = currentStatus;
  var description = "";
  var tag = "Health";

  if (currentStatus === "hospitalized") {
    addOutcome_("critical", probs.critical * ageMod * seasonMod * tierMod);
    addOutcome_("recovering", probs.recovering / (ageMod * tierMod));
    addOutcome_("stay", probs.stay);

    var out = pickOutcome_();
    if (!out) return null;

    if (out === "stay") {
      if (duration < 5) return null;
      // Force resolution 5+ cycles
      out = chance_(ctx, 0.55) ? "recovering" : "critical";
    }

    if (out === "critical") {
      newStatus = "critical";
      description = name + "'s condition has worsened to critical";
      tag = "Critical";
    } else {
      newStatus = "recovering";
      description = name + " is now recovering and expected to be released soon";
      tag = "Recovering";
    }
  }

  if (currentStatus === "critical") {
    addOutcome_("deceased", probs.deceased * ageMod * seasonMod);
    addOutcome_("hospitalized", probs.hospitalized / ageMod);
    addOutcome_("stay", probs.stay);

    var out2 = pickOutcome_();
    if (!out2) return null;

    if (out2 === "stay") {
      if (duration < 3) return null;
      out2 = chance_(ctx, 0.60) ? "deceased" : "hospitalized";
    }

    if (out2 === "deceased") {
      newStatus = "deceased";
      description = name + " has passed away" + (cause ? " due to complications from " + cause : "");
      tag = "Death";
    } else {
      newStatus = "hospitalized";
      description = name + " has stabilized and is no longer in critical condition";
      tag = "Stabilized";
    }
  }

  if (currentStatus === "recovering") {
    addOutcome_("hospitalized", probs.hospitalized * ageMod);
    addOutcome_("active", probs.active);
    addOutcome_("stay", probs.stay);

    var out3 = pickOutcome_();
    if (!out3) return null;

    if (out3 === "stay") {
      if (duration < 3) return null;
      out3 = "active";
    }

    if (out3 === "hospitalized") {
      newStatus = "hospitalized";
      description = name + " has suffered a setback and been readmitted";
      tag = "Setback";
    } else {
      newStatus = "active";
      description = name + " has made a full recovery and returned to their duties";
      tag = "Recovery";
    }
  }

  if (currentStatus === "injured") {
    addOutcome_("hospitalized", probs.hospitalized * ageMod);
    addOutcome_("active", probs.active);
    addOutcome_("stay", probs.stay);

    var out4 = pickOutcome_();
    if (!out4) return null;

    if (out4 === "stay") {
      if (duration < 5) return null;
      out4 = "active";
    }

    if (out4 === "hospitalized") {
      newStatus = "hospitalized";
      description = name + "'s condition has worsened and requires hospitalization";
      tag = "Hospitalized";
    } else {
      newStatus = "active";
      description = name + " has recovered from their injury and returned to their duties";
      tag = "Recovery";
    }
  }

  if (currentStatus === "serious-condition") {
    addOutcome_("critical", probs.critical * ageMod * seasonMod);
    addOutcome_("hospitalized", probs.hospitalized / (ageMod * tierMod));
    addOutcome_("stay", probs.stay);

    var out5 = pickOutcome_();
    if (!out5) return null;

    if (out5 === "stay") {
      if (duration < 5) return null;
      out5 = chance_(ctx, 0.55) ? "hospitalized" : "critical";
    }

    if (out5 === "critical") {
      newStatus = "critical";
      description = name + "'s condition has deteriorated to critical";
      tag = "Critical";
    } else {
      newStatus = "hospitalized";
      description = name + " has been stabilized and moved to hospital care";
      tag = "Stabilized";
    }
  }

  if (newStatus === currentStatus) return null;

  return {
    type: MILESTONE_TYPES.HEALTH_EVENT,
    tag: tag,
    description: description,
    newStatus: newStatus,
    previousStatus: currentStatus,
    duration: duration,
    cause: cause,
    season: cal.season
  };
}

// ============================================================
// SEASONAL LIMITS
// ============================================================

function getSeasonalLimits_(cal) {
  var limits = {
    graduations: 2,
    weddings: 1,
    births: 1,
    promotions: 2,
    retirements: 1,
    deaths: 1
  };

  if (cal.season === "spring" || cal.month === 5 || cal.month === 6) limits.graduations = 4;

  if (cal.month === 6 || cal.season === "spring" || cal.season === "summer") limits.weddings = 2;
  if (WEDDING_BOOST_HOLIDAYS.indexOf(cal.holiday) >= 0) limits.weddings = 2;

  if (cal.month === 9) limits.births = 2;
  if (cal.month === 12 || cal.month === 1) limits.retirements = 2;

  return limits;
}

// ============================================================
// MILESTONE CHECKS (same logic, but use rand_/chance_/pick_ + normalized season)
// ============================================================

function checkGraduation_(ctx, popId, age, lifeHistory, tier, cal) {
  if (lifeHistory.indexOf("[Graduation]") >= 0) return null;
  if (age < AGE_RANGES.GRADUATION.min || age > AGE_RANGES.GRADUATION.max) return null;

  var c = 0.005;
  if (tier >= 3) c = 0.01;
  if (age >= 24 && age <= 26) c += 0.005;

  if (cal.season === "spring") c *= 3.0;
  if (cal.month === 5 || cal.month === 6) c *= 2.0;

  if (!chance_(ctx, c)) return null;

  var types = (cal.season === "spring") ? [
    "walked across the stage at their commencement ceremony",
    "graduated with their class in a joyful spring celebration",
    "received their diploma at the outdoor commencement",
    "completed their studies with the spring graduating class"
  ] : [
    "completed their university studies",
    "graduated with honors from their program",
    "finished their professional certification",
    "earned their advanced degree"
  ];

  return { type: MILESTONE_TYPES.GRADUATION, description: pick_(ctx, types), tag: "Graduation", season: cal.season };
}

function checkWedding_(ctx, popId, age, lifeHistory, cal) {
  if (lifeHistory.indexOf("[Wedding]") >= 0 && lifeHistory.indexOf("[Divorce]") < 0) return null;
  if (age < AGE_RANGES.WEDDING.min || age > AGE_RANGES.WEDDING.max) return null;

  var c = 0.002;
  if (age >= 28 && age <= 35) c = 0.004;
  if (age > 40) c = 0.001;

  if (cal.month === 6) c *= 3.0;
  else if (cal.season === "spring" || cal.season === "summer") c *= 2.0;

  if (cal.holiday === "ValentinesDay" || cal.holiday === "Valentine") c *= 2.5;
  if (cal.holiday === "NewYearsEve") c *= 1.5;

  var bonds = getCitizenBondsFromStorage_(ctx, popId);
  var romanticBond = null;
  for (var i = 0; i < bonds.length; i++) {
    if (bonds[i].bondType === "romantic") { romanticBond = bonds[i]; break; }
  }
  if (romanticBond) c += 0.01;

  if (!chance_(ctx, c)) return null;

  var descriptions;
  if (cal.month === 6) {
    descriptions = [
      "celebrated a beautiful June wedding",
      "tied the knot in a classic June ceremony",
      "married their sweetheart in a summer garden wedding"
    ];
  } else if (cal.season === "spring") {
    descriptions = [
      "celebrated their wedding amid spring blossoms",
      "married in a beautiful spring ceremony",
      "exchanged vows in a springtime celebration"
    ];
  } else {
    descriptions = [
      "celebrated their wedding with close friends and family",
      "entered into a committed partnership",
      "tied the knot in an intimate ceremony"
    ];
  }

  return {
    type: MILESTONE_TYPES.WEDDING,
    description: pick_(ctx, descriptions),
    tag: "Wedding",
    spouseId: romanticBond ? (romanticBond.citizenA === popId ? romanticBond.citizenB : romanticBond.citizenA) : null,
    season: cal.season
  };
}

function checkBirth_(ctx, popId, age, lifeHistory, cal) {
  if (age < AGE_RANGES.BIRTH.min || age > AGE_RANGES.BIRTH.max) return null;
  if (lifeHistory.indexOf("[Wedding]") < 0) return null;

  var childMatches = lifeHistory.match(/\[Birth\]/g);
  var childCount = childMatches ? childMatches.length : 0;
  if (childCount >= 3) return null;

  var c = 0.003 - (childCount * 0.001);
  if (age >= 28 && age <= 35) c += 0.002;
  if (age > 38) c -= 0.001;

  if (cal.month === 9) c *= 2.0;
  if (cal.month >= 7 && cal.month <= 10) c *= 1.3;

  if (c < 0.0005) c = 0.0005;
  if (!chance_(ctx, c)) return null;

  var descriptions = [
    "welcomed a new child into their family",
    "became a parent for the " + getOrdinal_(childCount + 1) + " time",
    "celebrated the birth of their child"
  ];

  return {
    type: MILESTONE_TYPES.BIRTH,
    description: pick_(ctx, descriptions),
    tag: "Birth",
    childNumber: childCount + 1,
    season: cal.season
  };
}

function checkPromotion_(ctx, popId, age, lifeHistory, tier, tierRole, cal) {
  if (age < AGE_RANGES.PROMOTION.min || age > AGE_RANGES.PROMOTION.max) return null;
  if (lifeHistory.slice(-2000).indexOf("[Promotion]") >= 0) return null;

  var c = 0.002;
  if (tier === 3) c = 0.003;
  if (tier === 4) c = 0.004;
  if (tier <= 2) c = 0.001;

  if (cal.month === 1 || cal.month === 12) c *= 1.5;
  if (!chance_(ctx, c)) return null;

  var descriptions = [
    "received a significant promotion",
    "advanced to a senior position",
    "was recognized with increased responsibilities"
  ];

  return {
    type: MILESTONE_TYPES.PROMOTION,
    description: pick_(ctx, descriptions),
    tag: "Promotion",
    previousRole: tierRole,
    season: cal.season
  };
}

function checkRetirement_(ctx, popId, age, lifeHistory, tier, cal) {
  if (lifeHistory.indexOf("[Retirement]") >= 0) return null;
  if (age < AGE_RANGES.RETIREMENT.min) return null;

  var c = 0.001;
  if (age >= 62) c = 0.005;
  if (age >= 65) c = 0.01;
  if (age >= 68) c = 0.02;
  if (age >= 70) c = 0.05;
  if (tier >= 4) c *= 0.5;

  if (cal.month === 12) c *= 2.0;
  if (cal.month === 1) c *= 1.5;

  if (!chance_(ctx, c)) return null;

  var descriptions = [
    "announced their retirement after a long career",
    "stepped back from professional life",
    "transitioned into retirement"
  ];

  return { type: MILESTONE_TYPES.RETIREMENT, description: pick_(ctx, descriptions), tag: "Retirement", season: cal.season };
}

function checkDeath_(ctx, popId, age, lifeHistory, tier, cal) {
  var c = 0.0001;

  if (age >= 65) c = 0.001;
  if (age >= 75) c = 0.005;
  if (age >= 80) c = 0.01;
  if (age >= 85) c = 0.02;
  if (age >= 90) c = 0.05;

  if (lifeHistory.indexOf("[Health]") >= 0) c *= 1.5;
  if (cal.season === "winter") c *= 1.3;
  if (STRESS_HOLIDAYS.indexOf(cal.holiday) >= 0 && age >= 70) c *= 1.2;

  if (chance_(ctx, 0.0002)) c = 0.01; // rare shock override
  if (!chance_(ctx, c)) return null;

  var descriptions = (age >= 75) ? [
    "passed away peacefully",
    "died surrounded by family",
    "concluded their life's journey"
  ] : [
    "passed away unexpectedly",
    "died after a sudden illness",
    "was lost to the community"
  ];

  return { type: MILESTONE_TYPES.DEATH, description: pick_(ctx, descriptions), tag: "Death", age: age, season: cal.season };
}

function checkHealthEvent_(ctx, popId, age, lifeHistory, cal) {
  var c = 0.0005;
  if (age >= 50) c = 0.001;
  if (age >= 60) c = 0.002;
  if (age >= 70) c = 0.003;

  if (cal.season === "winter") c *= 1.5;
  if (STRESS_HOLIDAYS.indexOf(cal.holiday) >= 0) c *= 1.4;
  if (cal.month === 1) c *= 1.3;

  var healthMatches = lifeHistory.match(/\[Health\]/g);
  var healthCount = healthMatches ? healthMatches.length : 0;
  if (healthCount >= 3) return null;

  if (!chance_(ctx, c)) return null;

  var severity = "minor";
  var sr = rand_(ctx);
  if (sr < 0.05) severity = "severe";
  else if (sr < 0.20) severity = "moderate";

  var descriptions;
  if (severity === "severe") {
    descriptions = [
      "was hospitalized for a serious medical condition",
      "required emergency medical care",
      "was admitted to the hospital"
    ];
  } else if (cal.season === "winter") {
    descriptions = [
      "recovered from a winter illness",
      "dealt with a seasonal health concern",
      "took time to recover from the flu"
    ];
  } else {
    descriptions = [
      "dealt with a minor health concern",
      "took time to address a medical issue",
      "prioritized their health after a scare"
    ];
  }

  return {
    type: MILESTONE_TYPES.HEALTH_EVENT,
    description: pick_(ctx, descriptions),
    tag: "Health",
    severity: severity,
    season: cal.season
  };
}

// ============================================================
// CASCADES + SUMMARY (unchanged except RNG already handled above)
// ============================================================

function triggerBirthCascade_(ctx, parentId, parentName, neighborhood, cycle, cal) {
  ctx.summary.pendingCascades = ctx.summary.pendingCascades || [];
  ctx.summary.pendingCascades.push({
    type: "birth_adjustment",
    citizenId: parentId,
    neighborhood: neighborhood,
    effect: "priority_shift",
    duration: 5,
    cycleCreated: cycle,
    season: cal.season
  });
}

function triggerPromotionCascade_(ctx, promotedId, result, cycle) {
  var bonds = ctx.summary.relationshipBonds || [];
  for (var i = 0; i < bonds.length; i++) {
    var bond = bonds[i];
    if (!bond) continue;
    if (bond.citizenA !== promotedId && bond.citizenB !== promotedId) continue;

    if (bond.bondType === "rivalry") {
      bond.intensity = Math.min(10, (bond.intensity || 0) + 1);
      bond.notes = (bond.notes || "") + " [Promotion tension C" + cycle + "]";
      bond.lastUpdate = cycle;
    }
    if (bond.bondType === "alliance") {
      bond.intensity = Math.min(10, (bond.intensity || 0) + 0.5);
      bond.lastUpdate = cycle;
    }
  }
}

function triggerRetirementCascade_(ctx, retiredId, name, tierRole, neighborhood, cycle, cal) {
  var arcs = ctx.summary.eventArcs || [];
  var hasVacuumArc = false;
  for (var i = 0; i < arcs.length; i++) {
    if (arcs[i] && arcs[i].type === "power-vacuum" && arcs[i].phase !== "resolved") {
      hasVacuumArc = true;
      break;
    }
  }

  var arcNeighborhood = neighborhood || (tierRole && tierRole.indexOf("CIV") >= 0 ? "Downtown" : "Rockridge");

  if (!hasVacuumArc && chance_(ctx, 0.3)) {
    var newArc = {
      arcId: Utilities.getUuid().slice(0, 8),
      type: "power-vacuum",
      phase: "early",
      tension: 3,
      neighborhood: arcNeighborhood,
      domainTag: tierRole || "CAREER",
      summary: name + "'s retirement leaves a void in leadership.",
      involvedCitizens: [],
      cycleCreated: cycle,
      cycleResolved: null,
      season: cal.season
    };
    ctx.summary.eventArcs = ctx.summary.eventArcs || [];
    ctx.summary.eventArcs.push(newArc);
  }
}

function triggerDeathCascade_(ctx, deceasedId, name, tier, tierRole, neighborhood, cycle, cal) {
  var bonds = ctx.summary.relationshipBonds || [];

  for (var i = 0; i < bonds.length; i++) {
    var bond = bonds[i];
    if (!bond) continue;
    if (bond.citizenA !== deceasedId && bond.citizenB !== deceasedId) continue;

    bond.status = "severed";
    bond.notes = (bond.notes || "") + " [" + name + " deceased C" + cycle + "]";
    bond.lastUpdate = cycle;

    if (bond.bondType === "alliance" || bond.bondType === "mentorship") {
      var survivorId = bond.citizenA === deceasedId ? bond.citizenB : bond.citizenA;
      ctx.summary.pendingCascades = ctx.summary.pendingCascades || [];

      var griefDuration = (STRESS_HOLIDAYS.indexOf(cal.holiday) >= 0) ? 5 : 3;

      ctx.summary.pendingCascades.push({
        type: "grief",
        citizenId: survivorId,
        effect: "grief_period",
        duration: griefDuration,
        note: "Mourning " + name,
        cycleCreated: cycle,
        holiday: cal.holiday,
        season: cal.season
      });
    }
  }

  var arcNeighborhood = neighborhood || "Downtown";

  if (tier <= 2) {
    ctx.summary.eventArcs = ctx.summary.eventArcs || [];
    ctx.summary.eventArcs.push({
      arcId: Utilities.getUuid().slice(0, 8),
      type: "power-vacuum",
      phase: "early",
      tension: 5,
      neighborhood: arcNeighborhood,
      domainTag: tierRole || "LEADERSHIP",
      summary: name + "'s death creates a significant void.",
      involvedCitizens: [],
      cycleCreated: cycle,
      cycleResolved: null,
      season: cal.season
    });
  }

  if (chance_(ctx, 0.2)) {
    ctx.summary.eventArcs = ctx.summary.eventArcs || [];
    ctx.summary.eventArcs.push({
      arcId: Utilities.getUuid().slice(0, 8),
      type: "inheritance",
      phase: "early",
      tension: 4,
      neighborhood: arcNeighborhood,
      domainTag: "FAMILY",
      summary: "Questions arise about " + name + "'s legacy and estate.",
      involvedCitizens: [],
      cycleCreated: cycle,
      cycleResolved: null,
      season: cal.season
    });
  }
}

function generateGenerationalSummary_(ctx) {
  var events = ctx.summary.generationalEvents || [];
  var cascades = ctx.summary.pendingCascades || [];
  var cal = ctx.generationalCalendarContext || {};

  var summary = {
    totalEvents: events.length,
    byType: {},
    pendingCascades: cascades.length,
    deaths: [],
    weddings: [],
    promotions: [],
    graduations: [],
    births: [],
    recoveries: [],
    hospitalizations: [],
    calendarContext: { holiday: cal.holiday || "none", season: cal.season || "unknown", month: cal.month || 0 }
  };

  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    var type = e.type || e.tag || "unknown";
    summary.byType[type] = (summary.byType[type] || 0) + 1;

    if (e.tag === "Death") summary.deaths.push(e.citizen);
    if (e.tag === "Wedding") summary.weddings.push(e.citizen);
    if (e.tag === "Promotion") summary.promotions.push(e.citizen);
    if (e.tag === "Graduation") summary.graduations.push(e.citizen);
    if (e.tag === "Birth") summary.births.push(e.citizen);
    if (e.tag === "Recovery") summary.recoveries.push(e.citizen);
    if (e.newStatus === "hospitalized") summary.hospitalizations.push(e.citizen);
  }

  ctx.summary.generationalSummary = summary;
}

// ============================================================
// HELPERS
// ============================================================

function applyMilestone_(ctx, row, iLife, iLastU, milestone, name, popId, neighborhood, cycle, lifeLog, cal, logWidth) {
  var stamp = Utilities.formatDate(ctx.now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
  var existing = row[iLife] ? row[iLife].toString() : "";
  var line = stamp + " — [" + milestone.tag + "] " + milestone.description;

  row[iLife] = existing ? existing + "\n" + line : line;
  row[iLastU] = ctx.now;

  // SCHEMA SAFE:
  // baseline 7 cols, then optional appended cols only if sheet already has them
  if (lifeLog && logWidth > 0) {
    var base7 = [ctx.now, popId, '', milestone.tag, milestone.description, '', cycle];
    var extras = [cal.holiday || "none", cal.season || "unknown"]; // appended-only
    lifeLog.appendRow(buildLogRowSchemaSafe_(logWidth, base7, extras));
  }

  return {
    type: milestone.type,
    tag: milestone.tag,
    citizen: name,
    popId: popId,
    neighborhood: neighborhood || "",
    description: milestone.description,
    cycle: cycle,
    holiday: cal.holiday || "none",
    season: cal.season || "unknown",
    newStatus: milestone.newStatus || null
  };
}

function getOrdinal_(n) {
  var s = ["th", "st", "nd", "rd"];
  var v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getCitizenBondsFromStorage_(ctx, citizenId) {
  var bonds = ctx.summary.relationshipBonds || [];
  var result = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.status === "active" && (b.citizenA === citizenId || b.citizenB === citizenId)) result.push(b);
  }
  return result;
}

function createBond_(ctx, citizenA, citizenB, bondType, source, arcId, neighborhood, notes) {
  ctx.summary.relationshipBonds = ctx.summary.relationshipBonds || [];
  ctx.summary.relationshipBonds.push({
    citizenA: citizenA,
    citizenB: citizenB,
    bondType: bondType,
    source: source,
    arcId: arcId,
    neighborhood: neighborhood,
    notes: notes,
    status: "active",
    intensity: 5
  });
}
