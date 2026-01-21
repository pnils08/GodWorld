/**
 * ============================================================================
 * GOD WORLD ENGINE v2.7
 * ============================================================================
 * 
 * v2.7 Changes:
 * - FIXED: ensureWorldEventsV3Ledger_ bug (was missing parentheses)
 * - UPDATED: updateWorldPopulation_ v2.1 with full calendar integration
 * - All 30+ holidays now affect population dynamics
 * - First Friday, Creation Day, sports season awareness
 * 
 * Tabs used:
 * - World_Config
 * - World_Population
 * - Simulation_Ledger
 * - Intake
 * - Riley_Digest
 * - LifeHistory_Log
 * 
 * ============================================================================
 */

function runWorldCycle() {
  const SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';

  const ss = SpreadsheetApp.openById(SIM_SSID);
  const now = new Date();

  const ctx = {
    ss: ss,
    now: now,
    config: {},
    summary: {
      cycleId: null,
      intakeProcessed: 0,
      citizensUpdated: 0,
      eventsGenerated: 0,
      auditIssues: []
    }
  };

  // ═══════════════════════════════════════════════════════════
  // PHASE 1: CORE TIME + CONFIG
  // ═══════════════════════════════════════════════════════════
  loadConfig_(ctx);
  advanceWorldTime_(ctx);
  advanceSimulationCalendar_(ctx);
  resetCycleAuditIssues_(ctx);

  // ═══════════════════════════════════════════════════════════
  // PHASE 2: WORLD STATE (MUST run BEFORE population/events)
  // ═══════════════════════════════════════════════════════════
  applySeasonalWeights_(ctx);
  applySportsSeason_(ctx);
  applyWeatherModel_(ctx);
  applyCityDynamics_(ctx);

  // ═══════════════════════════════════════════════════════════
  // PHASE 3: POPULATION + CRISIS
  // ═══════════════════════════════════════════════════════════
  updateWorldPopulation_(ctx);
  applyDemographicDrift_(ctx);
  generateCrisisSpikes_(ctx);
  generateCrisisBuckets_(ctx);

  // ═══════════════════════════════════════════════════════════
  // PHASE 4: WORLD EVENTS
  // ═══════════════════════════════════════════════════════════
  worldEventsEngine_(ctx);

  // ═══════════════════════════════════════════════════════════
  // PHASE 5: CITIZENS + RELATIONSHIPS
  // ═══════════════════════════════════════════════════════════
  generateGenericCitizens_(ctx);
  generateGenericCitizenMicroEvents_(ctx);
  generateGameModeMicroEvents_(ctx);

  ensureWorldEventsLedger_(ctx);
  ensureMediaLedger_(ctx);
  ensureWorldEventsV3Ledger_(ctx);

  loadRelationshipBonds_(ctx);
  seedRelationshipBonds_(ctx);        // [NEW] Seeds bonds if < 500 exist

  runRelationshipEngine_(ctx);
  runNeighborhoodEngine_(ctx);
  runAsUniversePipeline_(ctx);
  runCivicRoleEngine_(ctx);
  runCivicElections_(ctx);

  runCareerEngine_(ctx);
  runEducationEngine_(ctx);
  runHouseholdEngine_(ctx);
  runGenerationalEngine_(ctx);

  eventArcEngine_(ctx);
  runBondEngine_(ctx);

  processIntake_(ctx);
  updateNamedCitizens_(ctx);
  generateCitizensEvents_(ctx);
  checkForPromotions_(ctx);
  processAdvancementIntake_(ctx);

  // ═══════════════════════════════════════════════════════════
  // PHASE 6: EVENT PROCESSING + ANALYSIS
  // ═══════════════════════════════════════════════════════════
  filterNoiseEvents_(ctx);
  prioritizeEvents_(ctx);

  applyNamedCitizenSpotlights_(ctx);
  applyCivicLoadIndicator_(ctx);
  runEconomicRippleEngine_(ctx);
  applyMigrationDrift_(ctx);
  applyPatternDetection_(ctx);
  applyShockMonitor_(ctx);

  processArcLifecycle_(ctx);          // [NEW] Ages arcs, transitions phases
  updateStorylineStatus_(ctx);        // [NEW] Flags dormant/abandoned storylines

  // ═══════════════════════════════════════════════════════════
  // PHASE 7: EVENING + MEDIA SYSTEMS
  // ═══════════════════════════════════════════════════════════
  buildEveningMedia_(ctx);
  buildEveningFamous_(ctx);
  buildEveningFood_(ctx);
  buildCityEvents_(ctx);
  buildNightlife_(ctx);
  buildEveningSportsAndStreaming_(ctx);
  buildCityEveningSystems_(ctx);
  buildMediaPacket_(ctx);
  runMediaFeedbackEngine_(ctx);

  applySeasonalStorySeeds_(ctx);
  applyChaosCategoryWeights_(ctx);
  applyStorySeeds_(ctx);


  // ═══════════════════════════════════════════════════════════
  // PHASE 8: V3 INTEGRATION + CHICAGO
  // ═══════════════════════════════════════════════════════════
  v3PreloadContext_(ctx);
  v3Integration_(ctx);

  applyCycleRecovery_(ctx);
  applyDomainCooldowns_(ctx);
  deriveDemographicDrift_(ctx);

  generateChicagoCitizens_(ctx);      // [NEW] Creates/maintains Chicago citizen pool

  // ═══════════════════════════════════════════════════════════
  // PHASE 9: FINAL ANALYSIS + DIGEST
  // ═══════════════════════════════════════════════════════════
  applyCompressedDigestSummary_(ctx);
  applyCycleWeightForLatestCycle_(ctx);
  finalizeWorldPopulation_(ctx);

  // ═══════════════════════════════════════════════════════════
  // PHASE 10: PERSISTENCE (write to sheets)
  // ═══════════════════════════════════════════════════════════
  writeDigest_(ctx);
  recordWorldEvents25_(ctx);
  recordWorldEventsv3_(ctx);

  saveV3NeighborhoodMap_(ctx);
  saveV3ArcsToLedger_(ctx);
  saveRelationshipBonds_(ctx);
  saveV3Domains_(ctx);
  saveV3Seeds_(ctx);
  saveV3Hooks_(ctx);
  saveV3Textures_(ctx);
  saveV3Chicago_(ctx);                // [UPDATED v2.4] Now includes citizen count/sample

  buildCyclePacket_(ctx);
  generateMediaBriefing_(ctx);

  // ═══════════════════════════════════════════════════════════
  // PHASE 11: MEDIA INTAKE RETURN (if media output exists)
  // ═══════════════════════════════════════════════════════════
  if (ctx.mediaOutput) {
    processMediaIntake_(ctx, ctx.mediaOutput);  // [UPDATED v2.1] Integrates parseMediaIntake_
    recordMediaLedger_(ctx);
  }
}


/**
 * ============================================================================
 * LOAD CONFIG
 * ============================================================================
 */
function loadConfig_(ctx) {
  const sheet = ctx.ss.getSheetByName('World_Config');
  if (!sheet) return;

  const values = sheet.getDataRange().getValues();
  for (let r = 1; r < values.length; r++) {
    const key = (values[r][0] || '').toString().trim();
    if (!key) continue;

    let val = values[r][1];
    if (typeof val === 'string') {
      const num = parseFloat(val);
      if (!isNaN(num)) val = num;
    }
    ctx.config[key] = val;
  }
}


/**
 * ============================================================================
 * ADVANCE WORLD TIME
 * ============================================================================
 */
function advanceWorldTime_(ctx) {
  const sheet = ctx.ss.getSheetByName('World_Config');
  if (!sheet) return;

  const values = sheet.getDataRange().getValues();

  let cycleRow = null;
  let lastRunRow = null;

  for (let r = 1; r < values.length; r++) {
    const k = (values[r][0] || '').toString().trim();
    if (k === 'cycleCount') cycleRow = r + 1;
    if (k === 'lastRun') lastRunRow = r + 1;
  }

  let cycle = Number(ctx.config.cycleCount || 0);
  cycle++;

  ctx.summary.cycleId = cycle;

  if (cycleRow) sheet.getRange(cycleRow, 2).setValue(cycle);
  if (lastRunRow) sheet.getRange(lastRunRow, 2).setValue(ctx.now);

  ctx.config.cycleCount = cycle;
}


/**
 * ============================================================================
 * UPDATE WORLD POPULATION v2.1
 * ============================================================================
 *
 * Safe, realistic city-level population update with GodWorld Calendar integration.
 *
 * v2.1 Enhancements:
 * - Full 30+ holiday awareness for migration patterns
 * - First Friday population dynamics
 * - Creation Day settling effects
 * - Sports season crowd impacts
 * - Cultural activity and community engagement modifiers
 * - Holiday-specific illness patterns
 *
 * Still NEVER touches:
 * - Named citizens
 * - Roles
 * - Status
 * - Neighborhoods
 * - Simulation_Ledger
 */
function updateWorldPopulation_(ctx) {

  const sheet = ctx.ss.getSheetByName('World_Population');
  if (!sheet) return;

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  const header = values[0];
  const row = values[1];

  const idx = name => header.indexOf(name);

  const iTotal = idx('totalPopulation');
  const iIll = idx('illnessRate');
  const iEmp = idx('employmentRate');
  const iMig = idx('migration');
  const iEcon = idx('economy');

  let total = Number(row[iTotal] || 0);
  let ill = Number(row[iIll] || 0.05);
  let emp = Number(row[iEmp] || 0.91);
  let mig = Number(row[iMig] || 0);
  let econ = (row[iEcon] || "stable").toString();

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL WORLD CONTEXT
  // ═══════════════════════════════════════════════════════════════════════════
  const S = ctx.summary;
  
  const season = S.season;
  const weather = S.weather || { type: "clear", impact: 1 };
  const chaos = S.worldEvents || [];
  const dynamics = S.cityDynamics || { 
    sentiment: 0, publicSpaces: 1, traffic: 1,
    culturalActivity: 1, communityEngagement: 1 
  };
  const sports = S.sportsSeason || "off-season";

  // Calendar context
  const holiday = S.holiday || "none";
  const holidayPriority = S.holidayPriority || "none";
  const isFirstFriday = S.isFirstFriday || false;
  const isCreationDay = S.isCreationDay || false;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ILLNESS UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  // Random micro-shift
  ill += (Math.random() - 0.5) * 0.001;

  // Seasonal illness pressure
  if (season === "Winter") ill += 0.0008;
  if (season === "Spring") ill -= 0.0003;

  // Weather influence
  if (weather.type === "fog") ill += 0.0005;
  if (weather.type === "rain") ill += 0.0004;
  if (weather.type === "heatwave") ill += 0.0006;
  if (weather.type === "storm") ill += 0.0003;

  // City mood
  if (dynamics.sentiment <= -0.5) ill += 0.0004;

  // Holiday illness patterns - large gatherings increase transmission
  const gatheringHolidays = [
    "Thanksgiving", "Holiday", "NewYearsEve", "NewYear",
    "Independence", "OpeningDay", "OaklandPride"
  ];
  if (gatheringHolidays.includes(holiday)) {
    ill += 0.0006;
  }

  // Post-holiday illness bump (winter holidays especially)
  const winterHolidays = ["Holiday", "NewYear", "Hanukkah"];
  if (winterHolidays.includes(holiday) && season === "Winter") {
    ill += 0.0004;
  }

  // First Friday - slight increase from crowds
  if (isFirstFriday) {
    ill += 0.0002;
  }

  // High community engagement can improve health awareness
  if (dynamics.communityEngagement >= 1.4) {
    ill -= 0.0002;
  }

  if (ill < 0) ill = 0;
  if (ill > 0.15) ill = 0.15;

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. EMPLOYMENT RATE UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  // Slight drift to stay realistic
  emp += (Math.random() - 0.5) * 0.0012;

  // Sentiment influence
  if (dynamics.sentiment <= -0.4) emp -= 0.0008;
  if (dynamics.sentiment >= 0.4) emp += 0.0006;

  // Weather → work disruptions
  if (weather.impact >= 1.3) emp -= 0.0005;

  // Holiday employment effects - retail holidays boost employment
  const retailHolidays = ["Holiday", "BlackFriday", "Valentine", "MothersDay", "FathersDay"];
  if (retailHolidays.includes(holiday)) {
    emp += 0.0008;
  }

  // Summer/outdoor event holidays boost service employment
  const serviceHolidays = ["Independence", "MemorialDay", "LaborDay", "CincoDeMayo"];
  if (serviceHolidays.includes(holiday)) {
    emp += 0.0005;
  }

  // Sports season employment boost
  if (sports === "championship") {
    emp += 0.001;
  } else if (sports === "playoffs" || sports === "post-season") {
    emp += 0.0006;
  }

  // First Friday boosts arts/service employment
  if (isFirstFriday) {
    emp += 0.0004;
  }

  // High cultural activity boosts employment
  if (dynamics.culturalActivity >= 1.4) {
    emp += 0.0004;
  }

  if (emp < 0) emp = 0;
  if (emp > 1) emp = 1;

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. BIRTHS & DEATHS (SEASON-ADJUSTED)
  // ═══════════════════════════════════════════════════════════════════════════

  let baseBirthRate = 0.010;
  let baseDeathRate = 0.008;

  // Seasonal patterns
  if (season === "Summer") baseBirthRate += 0.002;
  if (season === "Winter") baseDeathRate += 0.002;

  // More births expected in Fall (9 months after winter holidays)
  if (season === "Fall") baseBirthRate += 0.001;

  // Severe weather increases death rate slightly
  if (weather.impact >= 1.5) baseDeathRate += 0.001;

  const births = Math.round(total * baseBirthRate);
  const deaths = Math.round(total * baseDeathRate);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. MIGRATION UPDATE (Full Calendar Awareness)
  // ═══════════════════════════════════════════════════════════════════════════

  // Base fluctuation
  mig += Math.round((Math.random() - 0.5) * 20);

  // TRAVEL HOLIDAYS - High movement volatility
  const travelHolidays = [
    "Thanksgiving", "Holiday", "NewYear", "NewYearsEve",
    "MemorialDay", "LaborDay", "Independence"
  ];
  if (travelHolidays.includes(holiday)) {
    mig += Math.round((Math.random() - 0.5) * 50);
  }

  // GATHERING HOLIDAYS - Net inflow for celebrations
  const gatheringInflow = [
    "OpeningDay", "OaklandPride", "ArtSoulFestival",
    "Juneteenth", "CincoDeMayo", "DiaDeMuertos"
  ];
  if (gatheringInflow.includes(holiday)) {
    mig += Math.round(Math.random() * 40);
  }

  // CULTURAL HOLIDAYS - Diaspora visitors
  const culturalVisitorHolidays = [
    "DiaDeMuertos", "CincoDeMayo", "Juneteenth",
    "BlackHistoryMonth", "PrideMonth", "LunarNewYear"
  ];
  if (culturalVisitorHolidays.includes(holiday)) {
    mig += Math.round(Math.random() * 25);
  }

  // MINOR HOLIDAYS - Slight local movement
  const minorHolidays = [
    "Valentine", "StPatricksDay", "Easter", "Halloween",
    "MothersDay", "FathersDay", "EarthDay"
  ];
  if (minorHolidays.includes(holiday)) {
    mig += Math.round((Math.random() - 0.5) * 20);
  }

  // CIVIC OBSERVATION HOLIDAYS - Reduced movement
  const civicRestHolidays = ["MLKDay", "PresidentsDay", "VeteransDay"];
  if (civicRestHolidays.includes(holiday)) {
    mig += Math.round((Math.random() - 0.5) * 10);
  }

  // HOLIDAY PRIORITY EFFECTS
  if (holidayPriority === "major") {
    mig += Math.round((Math.random() - 0.5) * 30);
  } else if (holidayPriority === "oakland") {
    mig += Math.round(Math.random() * 35);
  } else if (holidayPriority === "cultural") {
    mig += Math.round(Math.random() * 20);
  }

  // FIRST FRIDAY - Draws visitors to arts districts
  if (isFirstFriday) {
    mig += Math.round(Math.random() * 30);
  }

  // CREATION DAY - Settling effect
  if (isCreationDay) {
    mig += Math.round(Math.random() * 15);
  }

  // SPORTS SEASON EFFECTS
  if (sports === "championship") {
    mig += Math.round(Math.random() * 60);
  } else if (sports === "playoffs" || sports === "post-season") {
    mig += Math.round(Math.random() * 40);
  } else if (sports === "late-season") {
    mig += Math.round(Math.random() * 20);
  }

  // CHAOS → MOVEMENT VOLATILITY
  if (chaos.length > 0) mig += Math.round((Math.random() - 0.5) * 30);
  if (chaos.length >= 5) mig += Math.round((Math.random() - 0.5) * 20);

  // CITY DYNAMICS
  if (dynamics.publicSpaces >= 1.4) mig += Math.round((Math.random() - 0.5) * 20);
  if (dynamics.culturalActivity >= 1.4) mig += Math.round(Math.random() * 15);
  if (dynamics.communityEngagement >= 1.3) mig += Math.round(Math.random() * 10);

  // WEATHER PUSH
  if (weather.impact >= 1.3) mig += Math.round((Math.random() - 0.5) * 15);
  if (weather.impact >= 1.5) mig += Math.round((Math.random() - 0.5) * 25);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. NEW TOTAL POPULATION
  // ═══════════════════════════════════════════════════════════════════════════

  total = total + births - deaths + mig;
  if (total < 0) total = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. ECONOMY LABEL
  // ═══════════════════════════════════════════════════════════════════════════

  if (emp > 0.94) econ = "strong";
  else if (emp < 0.88) econ = "weak";
  else econ = "stable";

  // Chaos → can destabilize economy
  if (chaos.length > 0 && econ === "stable") econ = "unstable";

  // Major holidays during strong economy = "booming"
  if (holidayPriority === "major" && emp > 0.92 && econ === "strong") {
    econ = "booming";
  }

  // Championship economy boost
  if (sports === "championship" && econ !== "weak") {
    if (econ === "stable") econ = "strong";
    if (econ === "strong") econ = "booming";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE BACK TO SHEET
  // ═══════════════════════════════════════════════════════════════════════════

  sheet.getRange(2, iTotal + 1).setValue(total);
  sheet.getRange(2, iIll + 1).setValue(ill);
  sheet.getRange(2, iEmp + 1).setValue(emp);
  sheet.getRange(2, iMig + 1).setValue(mig);
  sheet.getRange(2, iEcon + 1).setValue(econ);

  // ═══════════════════════════════════════════════════════════════════════════
  // STORE IN CTX FOR DOWNSTREAM USE
  // ═══════════════════════════════════════════════════════════════════════════
  S.worldPopulation = {
    totalPopulation: total,
    illnessRate: ill,
    employmentRate: emp,
    migration: mig,
    economy: econ,
    calendarFactors: {
      holiday: holiday,
      holidayPriority: holidayPriority,
      isFirstFriday: isFirstFriday,
      isCreationDay: isCreationDay,
      sportsSeason: sports
    }
  };
  
  ctx.summary = S;
}


/**
 * ============================================================================
 * PROCESS INTAKE — with TRUE duplicate blocking
 * ============================================================================
 */
function processIntake_(ctx) {
  const intake = ctx.ss.getSheetByName('Intake');
  const ledger = ctx.ss.getSheetByName('Simulation_Ledger');
  if (!intake || !ledger) return;

  const intakeVals = intake.getDataRange().getValues();
  if (intakeVals.length < 2) return;

  const intakeHeader = intakeVals[0];
  const ledgerVals = ledger.getDataRange().getValues();
  const ledgerHeader = ledgerVals[0];

  const idxI = name => intakeHeader.indexOf(name);
  const idxL = name => ledgerHeader.indexOf(name);

  const rowsToClear = [];

  for (let r = 1; r < intakeVals.length; r++) {
    const row = intakeVals[r];

    const first = (row[idxI('First')] || '').toString().trim();
    const last = (row[idxI('Last')] || '').toString().trim();
    if (!first && !last) continue;

    if (existsInLedger_(ledgerVals, first, last)) continue;

    const middle = (row[idxI('Middle')] || '').toString().trim();
    const originGame = (row[idxI('OriginGame')] || '').toString().trim();
    const uni = (row[idxI('UNI (y/n)')] || '').toString().trim();
    const med = (row[idxI('MED (y/n)')] || '').toString().trim();
    const civ = (row[idxI('CIV (y/n)')] || '').toString().trim();
    const clock = (row[idxI('ClockMode')] || 'ENGINE').toString().trim();
    const tier = row[idxI('Tier')] || '';
    const roleType = row[idxI('RoleType')] || '';
    const status = row[idxI('Status')] || 'Active';
    const birthYear = row[idxI('BirthYear')] || '';
    const originCity = row[idxI('OriginCity')] || '';
    const lifeHist = row[idxI('LifeHistory')] || '';
    const vault = row[idxI('OriginVault')] || '';

    const popId = nextPopIdSafe_(ledgerVals);

    const newRow = new Array(ledgerHeader.length).fill('');

    if (idxL('POPID') >= 0) newRow[idxL('POPID')] = popId;
    if (idxL('First') >= 0) newRow[idxL('First')] = first;
    if (idxL('Middle') >= 0) newRow[idxL('Middle')] = middle;
    if (idxL('Last') >= 0) newRow[idxL('Last')] = last;
    if (idxL('OriginGame') >= 0) newRow[idxL('OriginGame')] = originGame;
    if (idxL('UNI (y/n)') >= 0) newRow[idxL('UNI (y/n)')] = uni;
    if (idxL('MED (y/n)') >= 0) newRow[idxL('MED (y/n)')] = med;
    if (idxL('CIV (y/n)') >= 0) newRow[idxL('CIV (y/n)')] = civ;
    if (idxL('ClockMode') >= 0) newRow[idxL('ClockMode')] = clock;
    if (idxL('Tier') >= 0) newRow[idxL('Tier')] = tier;
    if (idxL('RoleType') >= 0) newRow[idxL('RoleType')] = roleType;
    if (idxL('Status') >= 0) newRow[idxL('Status')] = status;
    if (idxL('BirthYear') >= 0) newRow[idxL('BirthYear')] = birthYear;
    if (idxL('OriginCity') >= 0) newRow[idxL('OriginCity')] = originCity;
    if (idxL('LifeHistory') >= 0) newRow[idxL('LifeHistory')] = lifeHist;
    if (idxL('OriginVault') >= 0) newRow[idxL('OriginVault')] = vault;
    if (idxL('CreatedAt') >= 0) newRow[idxL('CreatedAt')] = ctx.now;
    if (idxL('LastUpdated') >= 0) newRow[idxL('LastUpdated')] = ctx.now;

    const writeRow = ledger.getLastRow() + 1;
    ledger.getRange(writeRow, 1, 1, newRow.length).setValues([newRow]);

    rowsToClear.push(r + 1);
    ctx.summary.intakeProcessed++;
  }

  rowsToClear.sort((a,b) => b - a);
  rowsToClear.forEach(i => {
    intake.getRange(i, 1, 1, intake.getLastColumn()).clearContent();
  });
}


/**
 * ============================================================================
 * DUPLICATE CHECKER
 * ============================================================================
 */
function existsInLedger_(ledgerValues, first, last) {
  if (ledgerValues.length < 2) return false;

  const header = ledgerValues[0];
  const idxFirst = header.indexOf('First');
  const idxLast = header.indexOf('Last');

  for (let r = 1; r < ledgerValues.length; r++) {
    const f = (ledgerValues[r][idxFirst] || '').toString().trim();
    const l = (ledgerValues[r][idxLast] || '').toString().trim();
    if (f === first && l === last) return true;
  }
  return false;
}


/**
 * ============================================================================
 * SAFE POP-ID GENERATOR
 * ============================================================================
 */
function nextPopIdSafe_(ledgerValues) {
  if (ledgerValues.length < 2) return 'POP-00001';

  const header = ledgerValues[0];
  const idx = header.indexOf('POPID');

  let maxN = 0;
  for (let r = 1; r < ledgerValues.length; r++) {
    const v = (ledgerValues[r][idx] || '').toString().trim();
    const m = v.match(/^POP-(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if (n > maxN) maxN = n;
    }
  }
  return 'POP-' + String(maxN + 1).padStart(5, '0');
}


/**
 * ============================================================================
 * UPDATE NAMED CITIZENS — SAFE, NO RANDOM EVENTS
 * ============================================================================
 */
function updateNamedCitizens_(ctx) {
  const sheet = ctx.ss.getSheetByName('Simulation_Ledger');
  if (!sheet) return;

  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length < 2) return;

  const header = values[0];
  const rows = values.slice(1);

  const idx = name => header.indexOf(name);

  const iClock = idx('ClockMode');
  const iStatus = idx('Status');
  const iLast = idx('LastUpdated');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const mode = row[iClock] || 'ENGINE';
    const status = row[iStatus] || 'Active';

    if (status === 'Deceased') continue;
    if (mode !== 'ENGINE') continue;

    // Only update LastUpdated
    row[iLast] = ctx.now;

    rows[i] = row;
    ctx.summary.citizensUpdated++;
  }

  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
}


/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */
function pickRandom_(arr) {
  if (!arr || arr.length === 0) return null;
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

function pickRandomSet_(arr, count) {
  if (!arr || arr.length === 0) return [];
  if (count >= arr.length) return arr.slice();

  const copy = arr.slice();
  const result = [];

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }

  return result;
}

function maybePick_(arr) {
  if (Math.random() < 0.5) return null;
  return pickRandom_(arr);
}

function shortId_() {
  return Utilities.getUuid().slice(0, 8).toUpperCase();
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) sheet.appendRow(headers);
  }
  return sheet;
}

function colIndex_(letter) {
  return letter.toUpperCase().charCodeAt(0) - 64;
}

function safeGet_(sheet, row, col) {
  const v = sheet.getRange(row, col).getValue();
  return v === "" || v === null || typeof v === "undefined" ? null : v;
}


/**
 * ============================================================================
 * DIGEST WRITER
 * ============================================================================
 */
function writeDigest_(ctx) {
  const sheet = ctx.ss.getSheetByName('Riley_Digest');
  if (!sheet) return;

  const S = ctx.summary;

  const row = [
    // A – Timestamp
    ctx.now,

    // B – Cycle
    S.cycleId,

    // C – IntakeProcessed
    S.intakeProcessed,

    // D – CitizensAged (updated)
    S.citizensUpdated,

    // E – EventsGenerated
    S.eventsGenerated,

    // F – Issues
    S.auditIssues ? S.auditIssues.join(", ") : "",

    // G – CycleWeight
    S.cycleWeight || "",

    // H - CycleWeightReason
    S.cycleWeightReason || "",

    // I – CivicLoad
    S.civicLoad || "",

    // J – MigrationDrift
    S.migrationDrift || 0,

    // K – PatternFlag
    S.patternFlag || "",

    // L – ShockFlag
    S.shockFlag || "",

    // M – StorySeedCount
    S.storySeeds ? S.storySeeds.length : 0,

    // N – EveningMedia
    S.eveningMedia ? JSON.stringify(S.eveningMedia) : "",

    // O – FamousPeople
    S.famousPeople ? S.famousPeople.join(", ") : "",

    // P – EveningFood
    S.eveningFood ? JSON.stringify(S.eveningFood) : "",

    // Q – CityEvents
    S.cityEvents ? S.cityEvents.join(", ") : "",

    // R – Nightlife
    S.nightlife ? JSON.stringify(S.nightlife) : "",

    // S – Sports
    S.eveningSports || "",

    // T – StreamingTrend
    S.streamingTrend || "",

    // U – WorldEvents
    JSON.stringify(S.worldEvents || []),

    // V – Weather
    JSON.stringify(S.weather || {}),

    // W – CityTraffic
    S.cityDynamics ? S.cityDynamics.traffic : "",

    // X – RetailLoad
    S.cityDynamics ? S.cityDynamics.retail : "",

    // Y – TourismLoad
    S.cityDynamics ? S.cityDynamics.tourism : "",

    // Z – NightlifeLoad
    S.cityDynamics ? S.cityDynamics.nightlife : "",

    // AA – PublicSpaceLoad
    S.cityDynamics ? S.cityDynamics.publicSpaces : "",

    // AB – Sentiment
    S.cityDynamics ? S.cityDynamics.sentiment : ""
  ];

  sheet.appendRow(row);
}


/**
 * ============================================================================
 * APPLY CYCLE WEIGHT FOR LATEST CYCLE
 * ============================================================================
 */
function applyCycleWeightForLatestCycle_(ctx) {
  const sheet = ctx.ss.getSheetByName('Riley_Digest');
  if (!sheet) return;

  const lastRow = sheet.getLastRow();

  // EventsGenerated is column 5 (E)
  const events = Number(sheet.getRange(lastRow, 5).getValue()) || 0;

  let weight = 'low-signal';
  if (events >= 20) {
    weight = 'high-signal';
  } else if (events >= 5) {
    weight = 'medium-signal';
  }

  // CycleWeight column = 7 (G)
  sheet.getRange(lastRow, 7).setValue(weight);
}