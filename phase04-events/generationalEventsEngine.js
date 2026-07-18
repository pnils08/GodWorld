/**
 * ============================================================================
 * GENERATIONAL EVENTS ENGINE V2.7 (S248 Track 1 — milestones mutate structural state)
 * ============================================================================
 *
 * v2.7 Changes (S248 / 2026-05-30 — LEDGER_REPAIR_HOUSEHOLDS Phase 2b Track 1):
 * - Milestones now MEAN something beyond the LifeHistory tag. Previously
 *   applyMilestone_ wrote only the tag + LastUpdated; a [Wedding] bound no one
 *   and a [Birth] created no child ("events fired into a vacuum"). Now, at the
 *   milestone call-sites in runGenerationalEngine_, the citizen's structural
 *   ctx.ledger row is mutated in place (persists via Phase 10 §5.6 commit):
 *     · wedding → MaritalStatus = "married" (lowercase, matches live SL enum)
 *     · birth   → NumChildren++ on the parent ONLY (OFF-SAMPLE per Mike's S248
 *                 seam decision: the child stays Tier-5 until a published story
 *                 names it; NO tracked infant row is created here)
 * - Two indices added (iMarital, iNumChildren), every write guarded `>= 0`.
 * - Determinism untouched (no new RNG); no direct sheet writes (row[] mutation
 *   on ctx.ledger, same pattern as the existing death/health row[iStatus] writes).
 * - DEFERRED to a follow-up: promotion → CareerStage/Income structural sync.
 *   checkPromotion_ carries only previousRole; the live CareerStage enum is
 *   drifted (mid-career/mid/senior/early/entry/early-career, no canonical
 *   ladder) and there is no TierRole column in SL — needs a progression-ladder
 *   + income-% design, not pure mechanism. Filed engine-side.
 * - DEPLOY HELD until C96 confirms the S244 simYear fix (Track 1 age-math
 *   rides on it; deploying life-event mutations on an unverified age-fix would
 *   write garbage MaritalStatus/NumChildren keyed off broken ages).
 *
 * v2.6 Changes (S204 B2 / 2026-05-06):
 * - LifeHistory_Log appendRow → queueAppendIntent_ (Phase 42 B2 mechanical
 *   migration). Mirrors S184 B0 runHouseholdEngine pattern.
 * - Holiday + season "extras" cols dropped per Mike directive: cols H, I on
 *   LifeHistory_Log were deliberately unnamed (extras served no purpose on
 *   the log ledger). Writes baseline 7 cols only.
 * - Schema-safe runtime layer (getLogWidth_ + buildLogRowSchemaSafe_) deleted.
 *   The S203 v1.3 header-drift detector replaces it: schema mismatches now
 *   surface via per-cycle audit instead of silent runtime slice.
 * - applyMilestone_ signature trimmed: lifeLog + logWidth params removed
 *   (8 call sites updated). cal param retained — still consumed for
 *   in-memory ctx.summary.generationalEvents holiday/season metadata.
 * - lifeLog handle + ctx.ss read removed at engine entry.
 *
 * Prior key fixes:
 * - Normalize calendar season to lowercase for all comparisons.
 * - Deterministic RNG support: ctx.rng or ctx.config.rngSeed ^ cycle.
 * - Health lifecycle uses normalized weighted outcomes (stable probabilities).
 *
 * v2.5 Changes (S199, Phase B.3 collision sweep):
 * - Renamed file-internal createBond_ → createGenerationalBond_ to deconflict
 *   Apps Script flat-namespace collision with bondEngine.js's heavyweight
 *   createBond_. The two functions had different slot semantics (this one
 *   used slot 5/6 as source/arcId; bondEngine uses origin/domainTag).
 *   Without the rename, alphabetical-load order had bondEngine's heavyweight
 *   sheet-write version winning, hijacking this file's intended lightweight
 *   in-memory ctx.summary.relationshipBonds push. Pure rename, 0 external
 *   API change. 1 internal call site updated (wedding bond).
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
  RETIREMENT: { min: 68, max: 72 },
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

// mulberry32_ def deleted S199 (Phase B.5 collision dedup) —
// canonical impl lives in phase07-evening-media/textureTriggers.js,
// resolved via Apps Script flat namespace.

function initRng_(ctx, cycle) {
  if (typeof ctx.rng === "function") return ctx.rng;
  if (ctx.config && typeof ctx.config.rngSeed === "number") {
    return mulberry32_(((ctx.config.rngSeed >>> 0) ^ (cycle >>> 0)) >>> 0);
  }
  throw new Error('generationalEventsEngine.initRng_: no deterministic RNG — ctx.rng or ctx.config.rngSeed required (Phase 40.3 Path 1 — Math.random fallback removed)');
}

function rand_(ctx) {
  if (!ctx._rng) {
    if (typeof ctx.rng === 'function') return ctx.rng();
    throw new Error('generationalEventsEngine.rand_: called without deterministic RNG — ctx.rng or ctx._rng required (Phase 40.3 Path 1 — Math.random fallback removed)');
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

// getLogWidth_ + buildLogRowSchemaSafe_ deleted S204 B2 — schema-safe runtime
// layer obsolete after queueAppendIntent_ migration. LifeHistory_Log writes
// baseline 7 cols only (extras dropped per Mike directive). Header-drift
// detector v1.3 (S203) catches schema mismatches at audit time.

// ============================================================
// MAIN ENGINE
// ============================================================

function runGenerationalEngine_(ctx) {
  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  if (!ctx.ledger) {
    throw new Error('runGenerationalEngine_: ctx.ledger not initialized');
  }
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  if (!rows.length) return;
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
  var iCIV = idx("CIV (y/n)");
  var iNeighborhood = idx("Neighborhood");

  var iStatusStart = idx("StatusStartCycle");
  var iHealthCause = idx("HealthCause");

  // S248 Track 1 (LEDGER_REPAIR_HOUSEHOLDS Phase 2b) — structural columns the
  // milestone events now mutate, so a [Wedding]/[Birth] means something beyond
  // the LifeHistory tag. Guard every write on `>= 0` (column may be absent).
  var iMarital = idx("MaritalStatus");
  var iNumChildren = idx("NumChildren");
  var iDialState = idx("DialState"); // engine.32 T5 — dial-biased milestone odds
  var iHouseholdId = idx("HouseholdId"); // engine.57 P4 — household drives fates
  var iGenderCol = idx("Gender"); // engine.57 P6 — births need parent sex + child sex

  // LifeHistory_Log handle removed S204 B2 — appends route through queueAppendIntent_.
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

  // engine.65 (S323): heritage tier unlock — members of a heritage line carry
  // better birth odds (an on-camera family compounds). Phase 4 runs before
  // Phase 5 updates the ledger, so this reads LAST cycle's Heritage_Ledger —
  // durable tier state, which is the correct read. One sheet read per cycle.
  ctx._heritageTierByPop = (typeof heritageTierByPop_ === 'function' && ctx.ss) ?
    heritageTierByPop_(ctx.ss) : {};

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

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];

    var popId = row[iPopID];
    var status = (row[iStatus] || "active").toString().toLowerCase().trim();
    var birthYear = Number(row[iBirthYear]) || 0;
    var tier = Number(row[iTier]) || 0;
    var mode = row[iClock] || "ENGINE";
    var tierRole = row[iTierRole] || "";
    var civFlag = iCIV >= 0 ? (row[iCIV] || "").toString().toLowerCase().trim() : "";
    var lifeHistory = row[iLife] ? row[iLife].toString() : "";
    var neighborhood = iNeighborhood >= 0 ? (row[iNeighborhood] || "") : "";

    var statusStartCycle = iStatusStart >= 0 ? (Number(row[iStatusStart]) || 0) : 0;
    var healthCause = iHealthCause >= 0 ? (row[iHealthCause] || "") : "";
    var statusDuration = statusStartCycle > 0 ? (cycle - statusStartCycle) : 0;

    // engine.64c (S323, Mike ruling S322): Traded left the city, pending never
    // arrived — neither draws life events. Retired stay (they live here).
    if (status === "deceased" || status === "inactive" ||
        status === "traded" || status === "pending") continue;

    var age = birthYear ? (simYear - birthYear) : 0;
    var name = ((row[iFirst] || "") + " " + (row[iLast] || "")).trim();

    // HEALTH STATUS LIFECYCLE — runs for ALL modes (engine.52 A1): a citizen
    // in hospital transitions every cycle regardless of clock mode; the mode
    // gate below only guards new-milestone generation.
    if (status === "hospitalized" || status === "critical" || status === "recovering" ||
        status === "injured" || status === "serious-condition") {
      var healthResult = processHealthLifecycle_(
        ctx, popId, name, status, statusDuration, age, tier,
        healthCause, neighborhood, cycle, calendarContext
      );

      if (healthResult) {
        row[iStatus] = healthResult.newStatus;

        // engine.52 B1 — every health-status transition lands in ctx.summary
        // for the Phase 10 Hospital_Ledger persist. No sheet writes here.
        ctx.summary.hospitalEvents = ctx.summary.hospitalEvents || [];
        ctx.summary.hospitalEvents.push({
          popId: popId, name: name, neighborhood: neighborhood,
          cause: healthCause, from: status, to: healthResult.newStatus, cycle: cycle
        });

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
          neighborhood, cycle, calendarContext
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

    // Mode gate — new milestones only fire for ENGINE/CIVIC citizens
    // (health lifecycle above deliberately runs before this, engine.52 A1).
    if (mode !== "ENGINE" && mode !== "CIVIC") continue;

    // engine.32 T5 — prime the per-ctx dial-band cache from the row (phase04
    // runs before citizenLookup exists); check*_ fns read it via (ctx, popId).
    getCitizenDialBands_(ctx, popId, iDialState >= 0 ? (row[iDialState] || "") : "");

    // REGULAR MILESTONE CHECKS (active citizens)

    if (counts.graduations < limits.graduations && birthYear) {
      var gradResult = checkGraduation_(ctx, popId, age, lifeHistory, tier, calendarContext);
      if (gradResult) {
        ctx.summary.generationalEvents.push(applyMilestone_(
          ctx, row, iLife, iLastU, gradResult, name, popId, neighborhood, cycle, calendarContext
        ));
        updatedRows[r] = true;
        counts.graduations++;
      }
    }

    // engine.57 P4: household presence is a causal input on family fates
    var hasHousehold = iHouseholdId >= 0 && String(row[iHouseholdId] || "").trim() !== "";

    // engine.57 P5 (Mike-direct): "marriage comes from bonds not events."
    // The dice-wedding path is RETIRED — checkWedding_ married citizens to
    // nobody (0 romantic bonds ever existed to name a spouse). Weddings now
    // fire in bondEngine when a grown romance crosses MARRIAGE_THRESHOLD.
    // checkWedding_ retained below for reference, no caller.

    if (counts.births < limits.births && birthYear) {
      var maritalNow = iMarital >= 0 ? (row[iMarital] || "").toString().toLowerCase().trim() : "";
      var birthResult = checkBirth_(ctx, popId, age, lifeHistory, calendarContext, hasHousehold, maritalNow);
      if (birthResult) {
        ctx.summary.generationalEvents.push(applyMilestone_(
          ctx, row, iLife, iLastU, birthResult, name, popId, neighborhood, cycle, calendarContext
        ));
        // engine.57 P6 (reverses S248, Mike-direct S318): a birth creates a
        // REAL citizen row — age 0, income 0, in the parents' household.
        if (iNumChildren >= 0) row[iNumChildren] = (Number(row[iNumChildren]) || 0) + 1;
        createChildRow_(ctx, r, cycle);
        triggerBirthCascade_(ctx, popId, name, neighborhood, cycle, calendarContext);
        updatedRows[r] = true;
        counts.births++;
      }
    }

    // engine.57 P6 — single motherhood: rare, a true slice of a population
    // (Mike-direct). An unmarried woman without a household: a birth both
    // creates the child AND forms her family household. Physics-rare, no cap.
    if (counts.births < limits.births && birthYear && !hasHousehold &&
        iGenderCol >= 0 && (row[iGenderCol] || "").toString().toLowerCase() === "female") {
      var mar2 = iMarital >= 0 ? (row[iMarital] || "").toString().toLowerCase().trim() : "";
      if (mar2 === "single" && age >= AGE_RANGES.BIRTH.min && age <= AGE_RANGES.BIRTH.max) {
        var smDials = getCitizenDialBands_(ctx, popId);
        var smChance = 0.0005 * (smDials ? smDials.familyFreq : 1);
        if (chance_(ctx, smChance)) {
          var smHH = formSingleParentHousehold_(ctx, r, cycle);
          if (smHH) {
            if (iNumChildren >= 0) row[iNumChildren] = (Number(row[iNumChildren]) || 0) + 1;
            createChildRow_(ctx, r, cycle);
            ctx.summary.generationalEvents.push(applyMilestone_(
              ctx, row, iLife, iLastU,
              { type: "birth", description: "welcomed a child, beginning a family of her own", tag: "Birth", season: calendarContext.season },
              name, popId, neighborhood, cycle, calendarContext
            ));
            updatedRows[r] = true;
            counts.births++;
          }
        }
      }
    }

    if (counts.promotions < limits.promotions && birthYear) {
      var promoResult = checkPromotion_(ctx, popId, age, lifeHistory, tier, tierRole, calendarContext);
      if (promoResult) {
        ctx.summary.generationalEvents.push(applyMilestone_(
          ctx, row, iLife, iLastU, promoResult, name, popId, neighborhood, cycle, calendarContext
        ));
        triggerPromotionCascade_(ctx, popId, promoResult, cycle);
        updatedRows[r] = true;
        counts.promotions++;
      }
    }

    if (counts.retirements < limits.retirements && birthYear && civFlag.charAt(0) !== "y") {
      var retireResult = checkRetirement_(ctx, popId, age, lifeHistory, tier, calendarContext);
      if (retireResult) {
        ctx.summary.generationalEvents.push(applyMilestone_(
          ctx, row, iLife, iLastU, retireResult, name, popId, neighborhood, cycle, calendarContext
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
          ctx, row, iLife, iLastU, deathResult, name, popId, neighborhood, cycle, calendarContext
        ));
        row[iStatus] = "deceased";
        triggerDeathCascade_(ctx, popId, name, tier, tierRole, neighborhood, cycle, calendarContext);
        updatedRows[r] = true;
        counts.deaths++;
      }
    }

    var healthResult2 = checkHealthEvent_(ctx, popId, age, lifeHistory, calendarContext);
    if (healthResult2) {
      var admitStatus = null;
      if (healthResult2.severity === "severe") {
        // Severe events enter the state machine; HealthCause stays blank for
        // the Health_Cause_Queue operator loop to fill (engine.52 A3).
        admitStatus = "hospitalized";
      } else if (healthResult2.severity === "moderate" && chance_(ctx, 0.3)) {
        // engine.52 A3 — a slice of moderate events also becomes a tracked
        // condition: injuries skew young, serious conditions skew old.
        admitStatus = (age >= 60 || chance_(ctx, 0.35)) ? "serious-condition" : "injured";
      }

      // engine.52 C125 texture fix — a tracked admission's log line must match
      // its status; moderate otherwise draws from the minor pool ("dealt with
      // a minor health concern" on an injured citizen).
      if (admitStatus === "injured") {
        healthResult2.description = pick_(ctx, [
          "was injured and is recovering under medical care",
          "suffered an injury that required medical attention",
          "was hurt in an accident and is being treated"
        ]);
      } else if (admitStatus === "serious-condition") {
        healthResult2.description = pick_(ctx, [
          "was diagnosed with a serious medical condition",
          "is under medical care for a serious condition",
          "was placed under care after a worrying diagnosis"
        ]);
      }

      ctx.summary.generationalEvents.push(applyMilestone_(
        ctx, row, iLife, iLastU, healthResult2, name, popId, neighborhood, cycle, calendarContext
      ));

      if (admitStatus) {
        row[iStatus] = admitStatus;
        if (iStatusStart >= 0) row[iStatusStart] = cycle;

        // engine.52 B1 — new admissions land in ctx.summary alongside
        // lifecycle transitions for the Phase 10 Hospital_Ledger persist.
        ctx.summary.hospitalEvents = ctx.summary.hospitalEvents || [];
        ctx.summary.hospitalEvents.push({
          popId: popId, name: name, neighborhood: neighborhood,
          cause: "", from: "active", to: admitStatus, cycle: cycle
        });
      }

      updatedRows[r] = true;
    }
  }

  var updatedCount = 0;
  for (var key in updatedRows) if (updatedRows.hasOwnProperty(key)) updatedCount++;

  // Phase 42 §5.6: flip ctx.ledger.dirty; consolidated commit at Phase 10.
  if (updatedCount > 0) {
    ctx.ledger.dirty = true;
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

// engine.57 P4 dials (Mike adjusts): household presence raises family odds
var HOUSEHOLD_MARRIAGE_BOOST = 1.5;

function checkWedding_(ctx, popId, age, lifeHistory, cal, hasHousehold) {
  if (lifeHistory.indexOf("[Wedding]") >= 0 && lifeHistory.indexOf("[Divorce]") < 0) return null;
  if (age < AGE_RANGES.WEDDING.min || age > AGE_RANGES.WEDDING.max) return null;

  var c = 0.002;
  if (hasHousehold) c *= HOUSEHOLD_MARRIAGE_BOOST; // engine.57 P4
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

  // engine.32 T5 — Family dial biases marriage odds (0.5..1.5; null -> base rate)
  var dialBands = getCitizenDialBands_(ctx, popId);
  if (dialBands) c *= dialBands.familyFreq;

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

function checkBirth_(ctx, popId, age, lifeHistory, cal, hasHousehold, marital) {
  // engine.57 P4 (Mike verbatim): "no kid is born unless there is a household"
  if (!hasHousehold) return null;
  if (age < AGE_RANGES.BIRTH.min || age > AGE_RANGES.BIRTH.max) return null;
  // engine.57 P6: the LEDGER is the truth (D5) — married per MaritalStatus,
  // not a [Wedding] text scan (legacy/backfilled couples carry no tag).
  if (marital !== "married") return null;

  var childMatches = lifeHistory.match(/\[Birth\]/g);
  var childCount = childMatches ? childMatches.length : 0;
  if (childCount >= 3) return null;

  var c = 0.003 - (childCount * 0.001);
  if (age >= 28 && age <= 35) c += 0.002;
  if (age > 38) c -= 0.001;

  if (cal.month === 9) c *= 2.0;
  if (cal.month >= 7 && cal.month <= 10) c *= 1.3;

  // engine.32 T5 — Family dial biases birth odds (0.5..1.5; null -> base rate)
  var dialBands = getCitizenDialBands_(ctx, popId);
  if (dialBands) c *= dialBands.familyFreq;

  // engine.65 (S323) — heritage tier unlock: a line member's odds of children
  // scale with the line's standing (Founding 1.15x .. Dynasty 1.6x). Odds
  // modifier only — the dice still speak (SIM_DOCTRINE rule 2).
  var hTier = ctx._heritageTierByPop && ctx._heritageTierByPop[popId];
  if (hTier && typeof HERITAGE_BIRTH_MULT !== 'undefined' && HERITAGE_BIRTH_MULT[hTier]) {
    c *= HERITAGE_BIRTH_MULT[hTier];
  }

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

// ════════════════════════════════════════════════════════════════════════════
// engine.57 P6 — BIRTHS CREATE PEOPLE (reverses S248, Mike-direct S318)
// ════════════════════════════════════════════════════════════════════════════

var CHILD_FIRST_NAMES = {
  male: ["Marcus", "Diego", "Elijah", "Theo", "Ravi", "Jonah", "Malik", "Owen", "Mateo", "Amir", "Felix", "Dante"],
  female: ["Amara", "Sofia", "Nia", "Iris", "Priya", "Rosa", "Maya", "Elena", "Zora", "Lucia", "Willa", "Sana"]
};

function createChildRow_(ctx, parentRowIdx, cycle) {
  // New citizen per the proven pattern (processAdvancementIntake impl #18):
  // push into ctx.ledger.rows; Phase 10 consolidated commit auto-extends.
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var idx = function(n) { return header.indexOf(n); };
  var parent = rows[parentRowIdx];
  var iPop = idx("POPID");
  if (iPop < 0) return null;

  // next POPID — cache the max scan once per cycle, count pushes after
  if (!ctx._maxPopN) {
    var maxN = 0;
    for (var r = 0; r < rows.length; r++) {
      var m = /^POP-(\d+)$/.exec(rows[r][iPop] || "");
      if (m && +m[1] > maxN) maxN = +m[1];
    }
    ctx._maxPopN = maxN;
  }
  ctx._maxPopN++;
  var childId = "POP-" + String(ctx._maxPopN).padStart(5, "0");

  var rng = ctx._rng || function() { return 0.5; };
  var sex = rng() < 0.5 ? "male" : "female";
  var pool = CHILD_FIRST_NAMES[sex];
  var firstName = pool[Math.floor(rng() * pool.length)];
  var lastName = idx("Last") >= 0 ? (parent[idx("Last")] || "") : "";
  var simYear = 2040 + Math.floor(cycle / 52);
  var hood = idx("Neighborhood") >= 0 ? parent[idx("Neighborhood")] : "";
  var hhId = idx("HouseholdId") >= 0 ? String(parent[idx("HouseholdId")] || "").trim() : "";
  var parentId = parent[iPop];
  var parentName = ((idx("First") >= 0 ? parent[idx("First")] : "") + " " + lastName).trim();

  // second parent = spouse if linked (SpouseId cell is "POPID Name")
  var spouseCell = idx("SpouseId") >= 0 ? String(parent[idx("SpouseId")] || "").trim() : "";
  var spouseId = spouseCell ? (spouseCell.split(" ")[0] || "") : "";

  var newRow = new Array(header.length).fill("");
  var set = function(col, val) { var i = idx(col); if (i >= 0) newRow[i] = val; };
  set("POPID", childId);
  set("First", firstName);
  set("Last", lastName);
  set("Tier", 4);
  set("RoleType", "student");
  set("ClockMode", "ENGINE");
  set("Status", "Active");
  set("BirthYear", simYear);
  set("OrginCity", "Oakland");
  set("Neighborhood", hood);
  set("HouseholdId", hhId);
  set("MaritalStatus", "single");
  set("Gender", sex);
  set("Income", 0);
  set("NumChildren", 0);
  set("EducationLevel", "Pre-K");
  set("ParentIds", JSON.stringify(spouseId ? [parentId, spouseId] : [parentId]));
  set("LifeHistory", "Y" + (Math.floor((cycle - 1) / 52) + 1) + "C" + (((cycle - 1) % 52) + 1) +
    " — [Birth] born to " + (parentName || parentId) + " in " + hood);
  rows.push(newRow);
  ctx.ledger.dirty = true;

  // both parents' ChildrenIds gain the child
  var iChildren = idx("ChildrenIds");
  var addChild = function(pRow) {
    if (iChildren < 0 || !pRow) return;
    var list = [];
    try { list = JSON.parse(pRow[iChildren] || "[]"); } catch (e) {}
    if (!Array.isArray(list)) list = [];
    list.push(childId);
    pRow[iChildren] = JSON.stringify(list);
  };
  addChild(parent);
  if (spouseId) {
    for (var s = 0; s < rows.length; s++) {
      if (rows[s][iPop] === spouseId) {
        addChild(rows[s]);
        var iNC = idx("NumChildren");
        if (iNC >= 0) rows[s][iNC] = (Number(rows[s][iNC]) || 0) + 1;
        break;
      }
    }
  }

  // household Members + type -> family; register Child slot (own-tracking
  // sheets — direct writes, same carve-out class as the rest of the engine)
  if (hhId && ctx.ss) {
    try {
      var hSheet = ctx.ss.getSheetByName("Household_Ledger");
      if (hSheet) {
        var hv = hSheet.getDataRange().getValues();
        var hh0 = hv[0];
        var cId = hh0.indexOf("HouseholdId"), cMem = hh0.indexOf("Members"), cType = hh0.indexOf("HouseholdType");
        for (var hr = 1; hr < hv.length; hr++) {
          if (hv[hr][cId] !== hhId) continue;
          var mem = [];
          try { mem = JSON.parse(hv[hr][cMem] || "[]"); } catch (e) {}
          if (!Array.isArray(mem)) mem = [];
          mem.push(childId);
          hSheet.getRange(hr + 1, cMem + 1).setValue(JSON.stringify(mem));
          if (cType >= 0) hSheet.getRange(hr + 1, cType + 1).setValue("family");
          break;
        }
      }
      var reg = ctx.ss.getSheetByName("Family_Relationships");
      if (reg) {
        var rv = reg.getDataRange().getValues();
        var r0 = rv[0];
        var rHH = r0.indexOf("HouseholdID") >= 0 ? r0.indexOf("HouseholdID") : r0.indexOf("HouseholdId");
        var childCols = [];
        for (var rc = 0; rc < r0.length; rc++) if (/^Child\d+$/i.test(String(r0[rc]))) childCols.push(rc);
        for (var rr = 1; rr < rv.length; rr++) {
          if (rv[rr][rHH] !== hhId) continue;
          for (var cc = 0; cc < childCols.length; cc++) {
            if (!String(rv[rr][childCols[cc]] || "").trim()) {
              reg.getRange(rr + 1, childCols[cc] + 1).setValue(childId + " " + firstName + " " + lastName);
              break;
            }
          }
          break;
        }
      }
    } catch (e) {
      Logger.log("createChildRow_ sheet-side: " + e);
    }
  }

  Logger.log("P6 BIRTH: " + childId + " " + firstName + " " + lastName + " -> " + (hhId || "no-household"));
  return childId;
}

function formSingleParentHousehold_(ctx, motherRowIdx, cycle) {
  // Marriage isn't the only door — a single mother forms a true household
  // (rare; the doctrine's "true slice"). Returns the new household id.
  var header = ctx.ledger.headers;
  var row = ctx.ledger.rows[motherRowIdx];
  var idx = function(n) { return header.indexOf(n); };
  var iHH = idx("HouseholdId");
  if (iHH < 0 || !ctx.ss) return null;
  var hood = idx("Neighborhood") >= 0 ? row[idx("Neighborhood")] : "";
  var income = idx("Income") >= 0 ? (Number(row[idx("Income")]) || 0) : 0;
  var popId = row[idx("POPID")];
  var name = ((idx("First") >= 0 ? row[idx("First")] : "") + " " + (idx("Last") >= 0 ? row[idx("Last")] : "")).trim();
  var hhId = "HH-" + String(cycle).padStart(4, "0") + "-F" + String(Math.floor((ctx._rng ? ctx._rng() : 0.5) * 900) + 100);
  try {
    var sheet = ctx.ss.getSheetByName("Household_Ledger");
    if (!sheet) return null;
    var hHead = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var vals = {
      HouseholdId: hhId, HeadOfHousehold: popId, HouseholdType: "family",
      Members: JSON.stringify([popId]), Neighborhood: hood, HousingType: "rented",
      MonthlyRent: (typeof estimateRent_ === "function") ? estimateRent_(hood) : 1700,
      HousingCost: 0, HouseholdIncome: income, FormedCycle: cycle,
      DissolvedCycle: "", Status: "active", HouseholdSavings: 0
    };
    var newRow = [];
    for (var h = 0; h < hHead.length; h++) newRow.push(vals.hasOwnProperty(hHead[h]) ? vals[hHead[h]] : "");
    sheet.appendRow(newRow);
    var reg = ctx.ss.getSheetByName("Family_Relationships");
    if (reg) reg.appendRow([hhId, "", popId + " " + name, "single-parent", cycle, "active", "", "", "", "", ""]);
  } catch (e) {
    Logger.log("formSingleParentHousehold_: " + e);
    return null;
  }
  row[iHH] = hhId;
  ctx.ledger.dirty = true;
  Logger.log("P6 SINGLE-PARENT HOUSEHOLD: " + hhId + " for " + popId);
  return hhId;
}

function checkPromotion_(ctx, popId, age, lifeHistory, tier, tierRole, cal) {
  if (age < AGE_RANGES.PROMOTION.min || age > AGE_RANGES.PROMOTION.max) return null;
  if (lifeHistory.slice(-2000).indexOf("[Promotion]") >= 0) return null;

  var c = 0.002;
  if (tier === 3) c = 0.003;
  if (tier === 4) c = 0.004;
  if (tier <= 2) c = 0.001;

  if (cal.month === 1 || cal.month === 12) c *= 1.5;

  // engine.32 T5 — Drive dial biases promotion odds (0.5..1.5; null -> base rate)
  var dialBands = getCitizenDialBands_(ctx, popId);
  if (dialBands) c *= dialBands.careerFreq;

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

  var c = 0.02;
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

  // engine.52 A2 — incidence couples to the city illness rate (Phase 3 drift,
  // 5% baseline / 15% cap). At baseline this is a no-op; at cap it triples.
  var illness = (ctx.summary && ctx.summary.demographicDrift &&
                 ctx.summary.demographicDrift.illnessRate) || 0.05;
  c *= (illness / 0.05);

  var healthMatches = lifeHistory.match(/\[Health\]/g);
  var healthCount = healthMatches ? healthMatches.length : 0;
  if (healthCount >= 3) return null;

  if (!chance_(ctx, c)) return null;

  // engine.52 A2 — an epidemic doesn't just mean more colds: at elevated
  // city illness the severity distribution shifts toward severe/moderate.
  var severeCut = illness >= 0.08 ? 0.08 : 0.05;
  var moderateCut = illness >= 0.08 ? 0.28 : 0.20;

  var severity = "minor";
  var sr = rand_(ctx);
  if (sr < severeCut) severity = "severe";
  else if (sr < moderateCut) severity = "moderate";

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

function applyMilestone_(ctx, row, iLife, iLastU, milestone, name, popId, neighborhood, cycle, cal) {
  var stamp = "C" + cycle;  // ES-1 step 2 engine-side (S264): in-world cycle anchor in col-O string, not wall-clock. Pairs with the S259 prefix-robust card half. LifeHistory_Log below keeps its structured Timestamp/Cycle cols.
  var existing = row[iLife] ? row[iLife].toString() : "";
  var line = stamp + " — [" + milestone.tag + "] " + milestone.description;

  row[iLife] = existing ? existing + "\n" + line : line;
  row[iLastU] = ctx.now;

  // S204 B2: queue baseline 7-col log entry. Holiday + season extras dropped
  // (cols H, I deliberately unnamed on LifeHistory_Log per Mike directive);
  // cal still consumed below for in-memory ctx.summary.generationalEvents.
  queueAppendIntent_(
    ctx,
    'LifeHistory_Log',
    [inWorldStamp_(ctx), popId, '', milestone.tag, milestone.description, '', cycle],
    'generational milestone',
    'events'
  );

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

// getCitizenBondsFromStorage_ def deleted S199 (Phase B.6 collision dedup) —
// canonical impl lives in phase05-citizens/bondPersistence.js, resolved via
// Apps Script flat namespace. The bondPersistence winner now carries the
// `status === 'active'` filter that this loser provided + adds POPID
// normalization. Single caller (line ~655 wedding-bond chance) gets correct
// active-romantic-only semantics either way.

function createGenerationalBond_(ctx, citizenA, citizenB, bondType, source, arcId, neighborhood, notes) {
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
