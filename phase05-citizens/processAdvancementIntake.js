/**
 * ============================================================================
 * processAdvancementIntake v1.5
 * ============================================================================
 *
 * v1.5 CHANGES (engine.66, S324):
 * - Family-match drip door: checkFamilyMatchPromotions_ — GC citizens can win
 *   the lottery INTO an open family slot on the ledger (off-camera spouse,
 *   missing parent, uncounted kid). GC is the only door into the ledger;
 *   a family gets realized only when the generator happened to mint someone
 *   who fits (SIM_DOCTRINE rules 2, 5, 6).
 * - Shared drip cap: ALL GC→SL promotions (emergence + family match) share
 *   DRIP_CAP_PER_CYCLE = 2 (Mike-pinned S324, S322 drip rule). Emergence is
 *   earned (deterministic, fills first); family matches roll for the rest.
 * - processAdvancementRows_ wires family links post-mint (SpouseId/ParentIds/
 *   ChildrenIds both ways, surname + MaidenName, household join).
 *
 * v1.4 CHANGES:
 * - REMOVED logToDigest_ - main engine writeDigest_() handles Riley_Digest
 * - Prevents partial/misformatted rows when cycle crashes mid-execution
 *
 * v1.3 CHANGES:
 * - Renamed findCol_ to findColByName_ to avoid collision
 *
 * ============================================================================
 */

var EMERGENCE_USAGE_TYPES = [
  'quoted', 'observed', 'profile', 'scene', 'reaction', 'witness',
  'mentioned', 'interviewed', 'featured', 'community'
];

var NON_EMERGENCE_USAGE_TYPES = [
  'byline', 'stats', 'official', 'roster', 'routine', 'coverage', 'announcement'
];

// S184 Row 17 fix — demographic-voice fallback pool (Path B).
// Used only when an intake row's RoleType is empty AND the citizen is NEW.
// Preferred path: upstream intake writers compute RoleType. This pool is the
// safety-net so the literal "Citizen" sentinel never lands on the live ledger.
// Source: live Simulation_Ledger top demographic voices (S94 cohort) + LEDGER_AUDIT §7
// 15-category distribution. Neighborhood-blind by design — fallback is a safety net,
// not a replacement for real upstream role assignment.
var DEMOGRAPHIC_VOICE_ROLES = [
  // Port & Labor
  'Longshoreman', 'Crane Operator', 'Trade Union Representative', 'Harbor Tugboat Captain', 'Container Yard Supervisor',
  // Construction
  'Site Foreman', 'Ironworker', 'Construction Engineer', 'Construction Safety Inspector', 'Construction Laborer',
  // Transit & Infrastructure
  'BART Station Manager', 'Bus Driver', 'Smart Grid Technician', 'Sea Level Monitoring Technician',
  // Healthcare
  'ER Nurse', 'Trauma Surgeon', 'Mental Health Counselor', 'Nurse Aide', 'Home Health Aide',
  // Education
  'Public School Teacher', 'ESL Instructor', 'Youth Literacy Coordinator',
  // Tech & Innovation
  'Autonomous Systems Engineer', 'Biotech Lab Director', 'AI Safety Researcher',
  // Small Business
  'Taqueria Owner', 'Independent Bookstore Owner', 'Craft Brewery Owner', 'Tea House Owner', 'Sourdough Baker', 'Vintage Clothing Store Owner', 'Food Truck Operator',
  // Creative & Arts
  'Muralist', 'Theater Director', 'Fashion Designer', 'Hip-Hop Producer',
  // Professional
  'Immigrant Legal Aid Worker', 'Public Defender', 'Corporate Accountant',
  // Government & Civic
  'City Building Inspector', 'Social Worker', 'Firefighter', 'Emergency Management Coordinator',
  // Faith & Community
  'Community Organizer', 'Mutual Aid Network Organizer', 'Refugee Resettlement Case Worker', 'Tenant Advocate',
  // 2041-specific
  'Climate Adaptation Engineer', 'Vertical Farm Technician', 'Drone Fleet Coordinator',
  // Trades
  'Electrician', 'Plumber', 'Solar Installer', 'Mechanic', 'Carpenter', 'Welder',
  // Service & Hospitality
  'Barista', 'Line Cook', 'Server', 'Bartender', 'Hair Stylist', 'Taxi Driver',
  // The Vulnerable
  'Homeless Outreach Worker', 'Ex-Offender Reentry Counselor', 'Domestic Violence Shelter Coordinator'
];

// Deterministic per-citizen draw — same first+last always maps to same role.
// djb2 string hash; Apps Script-safe (no crypto / Buffer / Math.random).
// hashSeed_ def deleted S199 (Phase B.4 collision dedup) — identical impl
// lives in utilities/citizenDerivation.js (the right home for a generic
// hash helper), resolved via flat namespace. Internal callers below use
// the global def.

function pickDemographicVoiceRole_(seed) {
  return DEMOGRAPHIC_VOICE_ROLES[hashSeed_(seed) % DEMOGRAPHIC_VOICE_ROLES.length];
}

// Phase 42 §B7 (Row 8, S269) — processed-flag write, cycle/operator ctx-branch.
// Cycle path: queue through writeIntents so the 'Y' flag commits at Phase 10
// ATOMICALLY with the same-cycle UsageCount bump (which lands in ctx.ledger,
// also committed at Phase 10). A crash between Phase 5 and Phase 10 then loses
// neither — else the row would be flag='Y' but bump-less, skipped forever on
// the next cycle (the L300-ish `alreadyProcessed → continue` guard).
// Operator path (runAdvancementIntakeManual) sets ctx.manualRun and never runs
// Phase 10, so it writes direct — same behavior it always had.
// NOTE: the 'Processed' header-create (processMediaUsage_ L~206) intentionally
// stays a DIRECT write — the column must physically exist before Phase 10
// commits these cell intents.
function markUsageProcessed_(ctx, usageSheet, row1, col1, value) {
  if (ctx && ctx.manualRun) {
    usageSheet.getRange(row1, col1).setValue(value);
  } else {
    queueCellIntent_(ctx, 'Citizen_Media_Usage', row1, col1, value,
      'advancement: mark media-usage row processed', 'citizens');
  }
}

function processAdvancementIntake_(ctx) {
  var ss = ctx ? ctx.ss : openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID
  var cycle = ctx ? (ctx.summary.cycleId || ctx.config.cycleCount || 0) : getCurrentCycleFromConfig_(ss);
  var now = 'C' + cycle; // S290 in-world, not wall-clock (engine.44)
  
  var results = {
    usageProcessed: 0,
    usageSkipped: 0,
    advancementsProcessed: 0,
    intakeProcessed: 0,
    promotionsTriggered: 0,
    errors: []
  };
  
  Logger.log('processAdvancementIntake_ v1.4 starting - Cycle ' + cycle);

  // Phase 42 §5.6: SL read/mutate via shared ctx.ledger; commit at Phase 10.
  // Sub-functions take ctx so they can access ctx.ledger.headers/rows.
  if (!ctx || !ctx.ledger) {
    throw new Error('processAdvancementIntake_: ctx.ledger not initialized (manual path must seed via runAdvancementIntakeManual)');
  }

  var usageResults = processMediaUsage_(ctx, now, cycle);
  results.usageProcessed = usageResults.processed;
  results.usageSkipped = usageResults.skipped;
  results.promotionsTriggered = usageResults.promotionsTriggered;

  // engine.58 (S320): emergence-promotion checkpoint — GC citizens whose
  // EmergenceCount reached the threshold win the lottery: queued as
  // Advancement_Intake1 rows here, promoted to full SL rows by
  // processAdvancementRows_ immediately below (same cycle). Single checkpoint
  // catches every count source: media usage (above), intake re-mentions
  // (Phase 1), event surfacing (generateCitizensEvents).
  var emergenceResults = checkEmergencePromotions_(ss, cycle, DRIP_CAP_PER_CYCLE);
  results.emergencePromotionsQueued = emergenceResults.queued;

  // engine.66 (S324): family-match drip door — rolls only for the cap slots
  // emergence didn't take this cycle. Most cycles this is 0-2 rolls at
  // DRIP_SLOT_P each; most rolls whiff (no match) — rarity is structural.
  var familyResults = checkFamilyMatchPromotions_(ctx, cycle,
    DRIP_CAP_PER_CYCLE - emergenceResults.queued);
  results.familyMatchesQueued = familyResults.queued;

  var advResults = processAdvancementRows_(ctx, now, cycle);
  results.advancementsProcessed = advResults.processed;

  // engine.59 (S320): namers → bonds. A promoted GC enters the world knowing
  // the citizens who kept naming them — friendship bonds seeded from the
  // EmergenceContext roster. Bonds land in ctx.summary.relationshipBonds
  // (loaded Phase5-LoadBonds, saved Phase10-Bonds — order verified).
  var bondSeedResults = seedEmergenceBonds_(ctx, cycle);
  results.emergenceBondsSeeded = bondSeedResults.seeded;

  var intakeResults = processIntakeRows_(ss, now, cycle);
  results.intakeProcessed = intakeResults.processed;
  
  Logger.log('processAdvancementIntake_ v1.4 complete: ' + JSON.stringify(results));
  return results;
}

function runAdvancementIntakeManual() {
  // Phase 42 §5.6: manual path seeds ctx.ledger and commits inline
  // (cycle path's Phase 10 commitSimulationLedger_ is not in this scope).
  var ss = openSimSpreadsheet_();
  var ledgerSheet = ss.getSheetByName('Simulation_Ledger');
  if (!ledgerSheet) {
    SpreadsheetApp.getActive().toast('Simulation_Ledger missing', '⚠️ Advancement Aborted', 10);
    return;
  }
  var values = ledgerSheet.getDataRange().getValues();
  var ctx = {
    ss: ss,
    now: new Date(),
    summary: { cycleId: getCurrentCycleFromConfig_(ss) },
    config: {},
    manualRun: true,  // Phase 42 §B7 (S269): no Phase 10 here — processed-flag
                      // writes go direct (queued intents would never commit).
    ledger: {
      sheet: 'Simulation_Ledger',
      headers: values[0],
      rows: values.slice(1),
      dirty: false
    }
  };

  var results = processAdvancementIntake_(ctx);

  if (ctx.ledger.dirty && ctx.ledger.rows.length) {
    ledgerSheet.getRange(2, 1, ctx.ledger.rows.length, ctx.ledger.headers.length)
               .setValues(ctx.ledger.rows);
  }

  SpreadsheetApp.getActive().toast(
    'Usage: ' + results.usageProcessed + ' (skipped: ' + results.usageSkipped + ')' +
    ', Advancements: ' + results.advancementsProcessed +
    ', Promotions: ' + results.promotionsTriggered,
    '✅ Advancement Complete', 10
  );
}

function getCurrentCycleFromConfig_(ss) {
  var configSheet = ss.getSheetByName('World_Config');
  if (!configSheet) return 0;
  var data = configSheet.getDataRange().getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === 'cycleCount') {
      return Number(data[i][1]) || 0;
    }
  }
  return 0;
}

function findColByName_(headers, name) {
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === name) return i;
  }
  for (var j = 0; j < headers.length; j++) {
    if (String(headers[j]).trim().toLowerCase().startsWith(name.toLowerCase())) return j;
  }
  return -1;
}

function isEmergenceUsage_(usageType) {
  if (!usageType) return true;
  var type = String(usageType).trim().toLowerCase();
  for (var i = 0; i < EMERGENCE_USAGE_TYPES.length; i++) {
    if (type === EMERGENCE_USAGE_TYPES[i].toLowerCase()) return true;
  }
  for (var j = 0; j < NON_EMERGENCE_USAGE_TYPES.length; j++) {
    if (type === NON_EMERGENCE_USAGE_TYPES[j].toLowerCase()) return false;
  }
  return true;
}

/**
 * S302 UsageCount feeder fix — name normalization + honorific handling.
 * Ported from scripts/ingestPublishedEntities.js (normalizeFullName +
 * HONORIFIC_RE, G-P-C97-1 / ENGINE_REPAIR Row 30 semantics). The old exact
 * case-insensitive First+Last match silently dropped "Dr. Vinnie Keane",
 * "O'Neil"/"ONeil", accent variants — starving tier promotion.
 */
var USAGE_HONORIFIC_RE = /^(?:dr|rev|revd|fr|prof|professor|mr|mrs|ms|mx|bishop|rabbi|imam|pastor|deacon|sister|father|mother|elder|hon|sen|rep|gov|mayor|councilmember|councilman|councilwoman|capt|lt|sgt|ofc|det|chief)\.?$/i;

function normalizeCitizenName_(name) {
  return String(name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split a raw usage-row name into {first, last}. Strips ONE leading honorific
 * when a real first+last remain ("Dr. Vinnie Keane" -> Vinnie/Keane).
 * Returns null when the name is not safely identifiable:
 * honorific+surname only ("Dr. Keane" — Row 30 mint-vector class) or a
 * single bare token. Null = skip, never guess.
 */
function splitUsageName_(rawName) {
  var parts = String(rawName || '').trim().split(/\s+/);
  if (parts.length >= 3 && USAGE_HONORIFIC_RE.test(parts[0])) parts = parts.slice(1);
  if (parts.length < 2) return null;
  if (USAGE_HONORIFIC_RE.test(parts[0])) return null; // honorific+surname — ambiguous
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

/**
 * engine.51 T5: find an income for a role by scanning all category salary
 * pools (built by buildIntakeSalaryPools_ in godWorldEngine2.js). Exact
 * role match then contains-match; null when unknown — caller leaves income
 * untouched rather than inventing.
 */
function rederiveIncomeForRole_(pools, role, rng) {
  var g = String(role || '').toLowerCase();
  if (!g) return null;
  var pick = null;
  for (var cat in pools) {
    var pool = pools[cat];
    for (var i = 0; i < pool.length; i++) {
      if (pool[i].role.toLowerCase() === g) { pick = pool[i]; break; }
    }
    if (pick) break;
  }
  if (!pick) {
    for (var cat2 in pools) {
      var pool2 = pools[cat2];
      for (var j = 0; j < pool2.length; j++) {
        if (pool2[j].role.toLowerCase().indexOf(g) !== -1 || g.indexOf(pool2[j].role.toLowerCase()) !== -1) { pick = pool2[j]; break; }
      }
      if (pick) break;
    }
  }
  if (!pick) return null;
  return Math.round((pick.min + rng() * Math.max(0, pick.max - pick.min)) / 100) * 100;
}

/**
 * Build normalized-fullname -> [row indices] map. Keys with >1 row are
 * normalization collisions; callers treat them as ambiguous and skip.
 */
function buildNameIndex_(rows, firstCol, lastCol, filterFn, startRow) {
  var index = {};
  for (var r = startRow || 0; r < rows.length; r++) {
    if (filterFn && !filterFn(rows[r])) continue;
    var key = normalizeCitizenName_(rows[r][firstCol]) + ' ' + normalizeCitizenName_(rows[r][lastCol]);
    if (key === ' ') continue;
    if (!index[key]) index[key] = [];
    index[key].push(r);
  }
  return index;
}

function processMediaUsage_(ctx, now, cycle) {
  var ss = ctx.ss;
  var results = { processed: 0, skipped: 0, promotionsTriggered: 0 };
  
  var usageSheet = ss.getSheetByName('Citizen_Media_Usage');
  if (!usageSheet) return results;
  
  var usageData = usageSheet.getDataRange().getValues();
  if (usageData.length < 2) return results;
  
  var usageHeaders = usageData[0];
  var nameCol = findColByName_(usageHeaders, 'CitizenName');
  if (nameCol < 0) nameCol = findColByName_(usageHeaders, 'Name');
  var usageTypeCol = findColByName_(usageHeaders, 'UsageType');
  var processedCol = findColByName_(usageHeaders, 'Processed');
  var contextCol = findColByName_(usageHeaders, 'Context');
  
  if (nameCol < 0) return results;
  
  if (processedCol < 0) {
    processedCol = usageHeaders.length;
    usageSheet.getRange(1, processedCol + 1).setValue('Processed');
  }
  
  var genericSheet = ss.getSheetByName('Generic_Citizens');
  var genericData = genericSheet ? genericSheet.getDataRange().getValues() : [];
  var genericHeaders = genericData.length > 0 ? genericData[0] : [];
  var gFirstCol = findColByName_(genericHeaders, 'First');
  var gLastCol = findColByName_(genericHeaders, 'Last');
  var gEmergenceCol = findColByName_(genericHeaders, 'EmergenceCount');
  var gStatusCol = findColByName_(genericHeaders, 'Status');
  
  // Phase 42 §5.6: read SL from shared ctx.ledger; mutations land in place.
  var ledgerHeaders = ctx.ledger.headers;
  var ledgerRows = ctx.ledger.rows;
  var lFirstCol = findColByName_(ledgerHeaders, 'First');
  var lLastCol = findColByName_(ledgerHeaders, 'Last');
  var lTierCol = findColByName_(ledgerHeaders, 'Tier');
  var lUsageCol = findColByName_(ledgerHeaders, 'UsageCount');
  var lPopIdCol = findColByName_(ledgerHeaders, 'POPID');
  
  var genericUpdates = {};
  var ledgerUpdates = {};
  var logSheet = ss.getSheetByName('LifeHistory_Log');

  // S302: normalized-name indexes built once (O(rows)), replacing the exact
  // case-insensitive linear scans that dropped honorific/punctuation/accent
  // variants. Keys with >1 row are ambiguous — skipped, never guessed.
  var ledgerIndex = (lFirstCol >= 0 && lLastCol >= 0)
    ? buildNameIndex_(ledgerRows, lFirstCol, lLastCol, null, 0)   // ctx.ledger.rows is body-only
    : {};
  var genericIndex = (genericData.length > 1 && gFirstCol >= 0 && gLastCol >= 0)
    ? buildNameIndex_(genericData, gFirstCol, gLastCol, function(r) {
        if (gStatusCol >= 0 && String(r[gStatusCol] || '') !== 'Active') return false;
        return true;
      }, 1)                                                       // genericData[0] is the header row
    : {};

  for (var i = 1; i < usageData.length; i++) {
    var row = usageData[i];
    var citizenName = row[nameCol] ? String(row[nameCol]).trim() : '';
    var usageType = usageTypeCol >= 0 ? String(row[usageTypeCol] || '').trim() : '';
    var context = contextCol >= 0 ? String(row[contextCol] || '').trim() : '';
    var alreadyProcessed = processedCol >= 0 && row[processedCol] === 'Y';

    if (!citizenName || alreadyProcessed) continue;

    var countsForEmergence = isEmergenceUsage_(usageType);

    if (!countsForEmergence) {
      markUsageProcessed_(ctx, usageSheet, i + 1, processedCol + 1, 'Y');
      results.skipped++;
      continue;
    }

    var split = splitUsageName_(citizenName);
    var found = false;

    if (split) {
      var usageKey = normalizeCitizenName_(split.first) + ' ' + normalizeCitizenName_(split.last);
      var ledgerHits = ledgerIndex[usageKey] || [];

      if (ledgerHits.length === 1) {
        var lr = ledgerHits[0];
        {
          found = true;

          var currentUsage = ledgerUpdates[lr] ? ledgerUpdates[lr].usageCount :
                            (lUsageCol >= 0 ? (Number(ledgerRows[lr][lUsageCol]) || 0) : 0);
          var newUsage = currentUsage + 1;

          var currentTier = ledgerUpdates[lr] ? ledgerUpdates[lr].tier :
                           (lTierCol >= 0 ? (Number(ledgerRows[lr][lTierCol]) || 4) : 4);
          var newTier = currentTier;
          var popId = lPopIdCol >= 0 ? ledgerRows[lr][lPopIdCol] : '';
          
          if (newUsage >= 9 && currentTier > 1) {
            newTier = 1;
            results.promotionsTriggered++;
          } else if (newUsage >= 6 && currentTier > 2) {
            newTier = 2;
            results.promotionsTriggered++;
          } else if (newUsage >= 3 && currentTier > 3) {
            newTier = 3;
            results.promotionsTriggered++;
          }
          
          ledgerUpdates[lr] = {
            usageCount: newUsage, tier: newTier,
            name: String(ledgerRows[lr][lFirstCol] || '').trim() + ' ' + String(ledgerRows[lr][lLastCol] || '').trim(),
            popId: popId, oldTier: currentTier, usageType: usageType, context: context
          };
        }
      } else if (ledgerHits.length > 1) {
        // Normalization collision — two+ ledger citizens share this name.
        // Ambiguous: skip, never guess (Row 30 discipline).
        Logger.log('processMediaUsage_: ambiguous name "' + citizenName + '" matches ' + ledgerHits.length + ' ledger rows — skipped');
      }

      if (!found) {
        var genericHits = genericIndex[usageKey] || [];
        if (genericHits.length === 1) {
          var gr = genericHits[0];
          found = true;
          var currentEmergence = genericUpdates[gr] !== undefined ? genericUpdates[gr] :
                                (gEmergenceCol >= 0 ? (Number(genericData[gr][gEmergenceCol]) || 0) : 0);
          genericUpdates[gr] = currentEmergence + 1;
        } else if (genericHits.length > 1) {
          Logger.log('processMediaUsage_: ambiguous name "' + citizenName + '" matches ' + genericHits.length + ' Generic_Citizens rows — skipped');
        }
      }
    }

    markUsageProcessed_(ctx, usageSheet, i + 1, processedCol + 1, 'Y');
    if (found) {
      results.processed++;
    } else {
      results.skipped++;
    }
  }
  
  if (genericSheet && gEmergenceCol >= 0) {
    for (var gRow in genericUpdates) {
      genericSheet.getRange(Number(gRow) + 1, gEmergenceCol + 1).setValue(genericUpdates[gRow]);
    }
  }
  
  // Phase 42 §5.6: per-row mutations on ctx.ledger.rows; flip dirty.
  var ledgerDirtied = false;
  for (var lRow in ledgerUpdates) {
    var update = ledgerUpdates[lRow];
    var rowIdx = Number(lRow);
    if (lUsageCol >= 0) {
      ledgerRows[rowIdx][lUsageCol] = update.usageCount;
      ledgerDirtied = true;
    }
    if (lTierCol >= 0 && update.tier !== update.oldTier) {
      ledgerRows[rowIdx][lTierCol] = update.tier;
      ledgerDirtied = true;
      if (logSheet) {
        logSheet.appendRow([now, update.popId, update.name || '', 'Promotion',
          'Advanced from Tier ' + update.oldTier + ' to Tier ' + update.tier,
          '', cycle]);
      }
    }
  }
  if (ledgerDirtied) ctx.ledger.dirty = true;
  
  return results;
}

function processAdvancementRows_(ctx, now, cycle) {
  var ss = ctx.ss;
  var results = { processed: 0 };
  
  var intakeSheet = ss.getSheetByName('Advancement_Intake1');
  if (!intakeSheet) intakeSheet = ss.getSheetByName('Advancement_Intake');
  if (!intakeSheet) return results;
  
  // Phase 42 §5.6: read SL from shared ctx.ledger; mutations land in place;
  // new citizens push to ctx.ledger.rows (impl shape #18).
  var logSheet = ss.getSheetByName('LifeHistory_Log');
  var genericSheet = ss.getSheetByName('Generic_Citizens');

  var intakeData = intakeSheet.getDataRange().getValues();
  if (intakeData.length < 2) {
    Logger.log('processAdvancementRows_: No data rows in intake');
    return results;
  }

  var intakeHeaders = intakeData[0];
  var ledgerHeaders = ctx.ledger.headers;
  var ledgerRows = ctx.ledger.rows;
  
  var iFirst = findColByName_(intakeHeaders, 'First');
  var iMiddle = findColByName_(intakeHeaders, 'Middle');
  var iLast = findColByName_(intakeHeaders, 'Last');
  var iRoleType = findColByName_(intakeHeaders, 'RoleType');
  var iTier = findColByName_(intakeHeaders, 'Tier');
  var iClockMode = findColByName_(intakeHeaders, 'ClockMode');
  var iNotes = findColByName_(intakeHeaders, 'Notes');
  // S184 (Phase 4.1.b) — optional columns; not in default Advancement_Intake1
  // schema but present if upstream writer adds them.
  var iBirthYear = findColByName_(intakeHeaders, 'BirthYear');
  var iNeighborhood = findColByName_(intakeHeaders, 'Neighborhood');
  // engine.66 (S324) — family-match drip columns (present only after the
  // family door first ensures them; -1 on older intake sheets is fine).
  var iMatchPop = findColByName_(intakeHeaders, 'MatchPopId');
  var iMatchType = findColByName_(intakeHeaders, 'MatchType');
  var iMaiden = findColByName_(intakeHeaders, 'MaidenName');

  var lPopId = findColByName_(ledgerHeaders, 'POPID');
  var lFirst = findColByName_(ledgerHeaders, 'First');
  var lMiddle = findColByName_(ledgerHeaders, 'Middle');
  var lLast = findColByName_(ledgerHeaders, 'Last');
  var lTier = findColByName_(ledgerHeaders, 'Tier');
  var lRoleType = findColByName_(ledgerHeaders, 'RoleType');
  var lClockMode = findColByName_(ledgerHeaders, 'ClockMode');
  var lStatus = findColByName_(ledgerHeaders, 'Status');
  var lLifeHistory = findColByName_(ledgerHeaders, 'LifeHistory');
  var lCreatedAt = findColByName_(ledgerHeaders, 'CreatedAt');
  var lLastUpdated = findColByName_(ledgerHeaders, 'Last Updated');
  var lUsageCol = findColByName_(ledgerHeaders, 'UsageCount');
  // S184 (Phase 4.1.b) — 7 lifecycle/demographic ledger columns for derivation
  var lEducationLevel = findColByName_(ledgerHeaders, 'EducationLevel');
  var lGender = findColByName_(ledgerHeaders, 'Gender');
  var lYearsInCareer = findColByName_(ledgerHeaders, 'YearsInCareer');
  var lDebtLevel = findColByName_(ledgerHeaders, 'DebtLevel');
  var lNetWorth = findColByName_(ledgerHeaders, 'NetWorth');
  var lMaritalStatus = findColByName_(ledgerHeaders, 'MaritalStatus');
  var lNumChildren = findColByName_(ledgerHeaders, 'NumChildren');
  var lBirthYear = findColByName_(ledgerHeaders, 'BirthYear');
  var lNeighborhood = findColByName_(ledgerHeaders, 'Neighborhood');

  // S184 (Phase 4.1.b) — build ledger frequency snapshot ONCE per intake batch.
  // Used by deriveCitizenProfile_ for neighborhood-aware RoleType + EducationLevel draws.
  // citizenDerivation library auto-loaded from utilities/citizenDerivation.js.
  var ledgerFreq = buildLedgerFreqSnapshot_(ledgerHeaders, ledgerRows, { includesHeader: false });

  var maxPop = 0;
  for (var r = 0; r < ledgerRows.length; r++) {
    var v = String(ledgerRows[r][lPopId] || '').match(/POP-(\d+)/);
    if (v) maxPop = Math.max(maxPop, Number(v[1]));
  }
  
  var rowsToClear = [];

  // engine.51 T4/T5 (S302): normalized-name index replaces the exact
  // lowercase scan (honorific/accent/apostrophe variants were minting
  // duplicates); salary pools loaded once for role-change income re-derive.
  var advNameIndex = buildNameIndex_(ledgerRows, lFirst, lLast, null, 0);
  var advSalaryPools = (typeof buildIntakeSalaryPools_ === 'function') ? buildIntakeSalaryPools_(ctx) : null;

  for (var i = 1; i < intakeData.length; i++) {
    var row = intakeData[i];
    var first = iFirst >= 0 ? String(row[iFirst] || '').trim() : '';
    var middle = iMiddle >= 0 ? String(row[iMiddle] || '').trim() : '';
    var last = iLast >= 0 ? String(row[iLast] || '').trim() : '';
    
    if (!first && !last) continue;
    
    // S184 Row 17 — split: rawRole is what the intake row carries (may be empty).
    // For EXISTING citizens: empty rawRole → preserve current ledger value (no overwrite — see line ~334 truthy guard).
    // For NEW citizens: empty rawRole → demographic-voice fallback (literal "Citizen" sentinel never lands).
    var rawRole = iRoleType >= 0 ? String(row[iRoleType] || '').trim() : '';
    var roleType = rawRole; // existing-row branch uses rawRole directly via truthy guard
    var tier = iTier >= 0 ? (row[iTier] || 3) : 3;
    tier = Math.min(Number(tier) || 3, 4); // Cap at Tier 4 (max valid tier)
    var clockMode = iClockMode >= 0 ? (row[iClockMode] || 'ENGINE') : 'ENGINE';
    var notes = iNotes >= 0 ? (row[iNotes] || '') : '';
    
    // engine.66 — family-match payload (blank on non-drip rows)
    var matchPop = iMatchPop >= 0 ? String(row[iMatchPop] || '').trim() : '';
    var matchType = iMatchType >= 0 ? String(row[iMatchType] || '').trim() : '';
    var maiden = iMaiden >= 0 ? String(row[iMaiden] || '').trim() : '';

    var advKey = normalizeCitizenName_(first) + ' ' + normalizeCitizenName_(last);
    var advHits = advNameIndex[advKey] || [];
    if (advHits.length > 1) {
      Logger.log('processAdvancementRows_: ambiguous name "' + first + ' ' + last + '" matches ' + advHits.length + ' ledger rows — row skipped, resolve manually');
      rowsToClear.push(i + 1);
      continue;
    }
    var existingRow = advHits.length === 1 ? advHits[0] : -1;

    // engine.66 — a family-drip row must mint a NEW citizen; a name collision
    // with an existing ledger row means the wiring would land on the wrong
    // person. Skip and release the slot (GC row stays Active, re-drawable).
    if (matchPop && existingRow >= 0) {
      Logger.log('processAdvancementRows_: family-drip "' + first + ' ' + last +
        '" collides with existing ledger citizen — row skipped, slot released');
      rowsToClear.push(i + 1);
      continue;
    }

    if (existingRow >= 0) {
      if (lTier >= 0) ledgerRows[existingRow][lTier] = tier;
      var roleChanged = false;
      if (lRoleType >= 0 && roleType && String(ledgerRows[existingRow][lRoleType]).trim() !== roleType) {
        ledgerRows[existingRow][lRoleType] = roleType;
        roleChanged = true;
      } else if (lRoleType >= 0 && roleType) {
        ledgerRows[existingRow][lRoleType] = roleType;
      }
      // T5: role change re-derives Income from the salary pools (retirement /
      // career-change case). Scans all categories for the role; no match →
      // income untouched (never invent — sports salaries stay roster-owned).
      var lIncome = findColByName_(ledgerHeaders, 'Income');
      // S320: minors earn nothing — role-change income re-derive was the one
      // ungated assigner left (a minor advanced through intake got adult pay)
      var advBYCol = findColByName_(ledgerHeaders, 'BirthYear');
      var advBY = advBYCol >= 0 ? (Number(ledgerRows[existingRow][advBYCol]) || 0) : 0;
      var advIsMinor = advBY > 0 && ((2040 + Math.floor(cycle / 52)) - advBY) < 18;
      if (roleChanged && !advIsMinor && lIncome >= 0 && advSalaryPools && typeof ctx.rng === 'function') {
        var newIncome = rederiveIncomeForRole_(advSalaryPools, roleType, ctx.rng);
        if (newIncome !== null) ledgerRows[existingRow][lIncome] = newIncome;
      }
      if (lLastUpdated >= 0) ledgerRows[existingRow][lLastUpdated] = now;
      ctx.ledger.dirty = true;
      var popId = lPopId >= 0 ? ledgerRows[existingRow][lPopId] : '';
      if (logSheet) {
        logSheet.appendRow([now, popId, (first + ' ' + last).trim(), 'Advancement',
          'Updated to Tier ' + tier + (roleChanged ? '; RoleType -> ' + roleType : '') + '. ' + notes, '', cycle]);
      }
    } else {
      maxPop++;
      var newPopId = 'POP-' + String(maxPop).padStart(5, '0');

      // S184 (Phase 4.1.b) — derive 8 demographic + lifecycle fields for the new
      // citizen via the shared citizenDerivation library. Intake row may not
      // carry BirthYear or Neighborhood (Advancement_Intake1 default schema is
      // 10 cols without them); helper falls back to age 38 + frequency-weighted
      // neighborhood draw. RoleType derivation runs through the same library;
      // pickDemographicVoiceRole_ is no longer the primary path — it remains as
      // a final-tier fallback inside deriveRoleType_.
      var seed = first + '|' + last + '|' + newPopId;
      var rawBirthYear = (iBirthYear >= 0) ? Number(row[iBirthYear]) : NaN;
      var birthYear = (!isNaN(rawBirthYear) && rawBirthYear > 1900) ? rawBirthYear : 2003;
      // S322: live sim-year (engine convention 2040 + cycle/52) — was hardcoded
      // 2041, understating age by 1/year as the sim advances.
      var age = (2040 + Math.floor(cycle / 52)) - birthYear;
      var rawNbhd = (iNeighborhood >= 0) ? String(row[iNeighborhood] || '').trim() : '';
      var profile = deriveCitizenProfile_(seed, age, rawNbhd, ledgerFreq, {
        roleTypeOverride: rawRole || null  // honor explicit intake RoleType if set
      });
      var newRoleType = profile.RoleType;

      var newRow = new Array(ledgerHeaders.length).fill('');
      if (lPopId >= 0) newRow[lPopId] = newPopId;
      if (lFirst >= 0) newRow[lFirst] = first;
      if (lMiddle >= 0) newRow[lMiddle] = middle;
      if (lLast >= 0) newRow[lLast] = last;
      if (lTier >= 0) newRow[lTier] = tier;
      if (lRoleType >= 0) newRow[lRoleType] = newRoleType;
      if (lClockMode >= 0) newRow[lClockMode] = clockMode;
      if (lStatus >= 0) newRow[lStatus] = 'Active';
      if (lLifeHistory >= 0) newRow[lLifeHistory] = 'Promoted to Tier ' + tier + ' in Cycle ' + cycle + '. ' + notes;
      if (lCreatedAt >= 0) newRow[lCreatedAt] = now;
      if (lLastUpdated >= 0) newRow[lLastUpdated] = now;
      if (lUsageCol >= 0) newRow[lUsageCol] = 0;
      // S184 (Phase 4.1.b) — 7 derived fields + BirthYear + Neighborhood
      if (lBirthYear >= 0 && !newRow[lBirthYear]) newRow[lBirthYear] = birthYear;
      if (lNeighborhood >= 0 && !newRow[lNeighborhood]) newRow[lNeighborhood] = profile._neighborhood;
      if (lEducationLevel >= 0) newRow[lEducationLevel] = profile.EducationLevel;
      if (lGender >= 0) newRow[lGender] = profile.Gender;
      if (lYearsInCareer >= 0) newRow[lYearsInCareer] = profile.YearsInCareer;
      if (lDebtLevel >= 0) newRow[lDebtLevel] = profile.DebtLevel;
      if (lNetWorth >= 0) newRow[lNetWorth] = profile.NetWorth;
      if (lMaritalStatus >= 0) newRow[lMaritalStatus] = profile.MaritalStatus;
      if (lNumChildren >= 0) newRow[lNumChildren] = profile.NumChildren;
      // engine.62b (S322): CareerStage — the derivation lib predates the SL
      // column (added S321) and only computes it inline; map its enum to the
      // engine's (C106: POP-01062 landed stage-blank via this path).
      var lCareerStage = findColByName_(ledgerHeaders, 'CareerStage');
      if (lCareerStage >= 0) {
        var stMap = { early: 'entry-level', mid: 'mid-career', senior: 'senior', retired: 'retired' };
        newRow[lCareerStage] = age < 22 ? 'student' : (stMap[profile._careerStage] || 'entry-level');
      }
      // engine.66 — the name they carried before taking the family surname
      var lMaiden = findColByName_(ledgerHeaders, 'MaidenName');
      if (lMaiden >= 0 && maiden) newRow[lMaiden] = maiden;
      // Phase 42 §5.6 (impl #18): push new row to ctx.ledger.rows; Phase 10
      // consolidated commit auto-extends the sheet — no separate append intent.
      ledgerRows.push(newRow);
      advNameIndex[advKey] = [ledgerRows.length - 1]; // same-batch repeats route to bump/edit
      ctx.ledger.dirty = true;
      if (logSheet) {
        logSheet.appendRow([now, newPopId, (first + ' ' + last).trim(), 'Promotion',
          'Added to Simulation_Ledger as Tier ' + tier + '. ' + notes, '', cycle]);
      }
      // engine.66 — family-drip rows queued under the FAMILY surname; the GC
      // row still carries the birth name, so mark it Emerged by that.
      markAsEmergedInGeneric_(ss, genericSheet, first, maiden || last, cycle);
      if (matchPop && matchType) {
        wireFamilyMatch_(ctx, ledgerRows.length - 1, newPopId, matchPop, matchType, now, cycle, logSheet);
      }
    }
    
    rowsToClear.push(i + 1);
    results.processed++;
  }
  
  if (rowsToClear.length > 0) {
    rowsToClear.sort(function(a, b) { return b - a; });
    for (var c = 0; c < rowsToClear.length; c++) {
      intakeSheet.getRange(rowsToClear[c], 1, 1, intakeSheet.getLastColumn()).clearContent();
    }
  }
  
  return results;
}

function processIntakeRows_(ss, now, cycle) {
  var results = { processed: 0 };
  var intakeSheet = ss.getSheetByName('Intake');
  if (!intakeSheet) return results;
  var intakeData = intakeSheet.getDataRange().getValues();
  if (intakeData.length < 2) return results;
  var intakeHeaders = intakeData[0];
  var iFirst = findColByName_(intakeHeaders, 'First');
  var iLast = findColByName_(intakeHeaders, 'Last');
  for (var i = 1; i < intakeData.length; i++) {
    var first = iFirst >= 0 ? String(intakeData[i][iFirst] || '').trim() : '';
    var last = iLast >= 0 ? String(intakeData[i][iLast] || '').trim() : '';
    if (first || last) results.processed++;
  }
  return results;
}

// engine.58 (S320): the lottery threshold — a GC citizen whose name has come
// back this many times (media usage, intake, event surfacing) earns a full
// Simulation_Ledger row. Mike-ruled S320: 3. One well-seeded engine event can
// print 3 articles in a cycle (media agents chase a story), so single-cycle
// promotion is by design.
var GC_EMERGENCE_PROMOTION_THRESHOLD = 3;

// engine.66 (S324): ONE drip system, 2 per cycle, period (Mike-pinned S324;
// S322 drip rule — all GC→SL doors share it). Emergence promotions are
// earned (real media only, engine.66b) and fill first; family-match draws
// take whatever slots remain.
// engine.66b (S324, Mike-direct — NOTHING IS FREE): no probability dial.
// Each remaining slot draws ONE random Active GC citizen; they land only on
// a STRICT fit — same neighborhood REQUIRED, right sex, right age. If the
// world didn't produce a fitting person, nothing lands. Zero is normal.
var DRIP_CAP_PER_CYCLE = 2;
var DRIP_SPOUSE_AGE_BAND = 10;  // |candidate BY − partner BY| ≤ band
var DRIP_PARENT_AGE_MIN = 18;   // parent is 18-45 years older than the kid
var DRIP_PARENT_AGE_MAX = 45;

/**
 * engine.58 (S320): scan Generic_Citizens for Active rows at/over the
 * emergence threshold and queue them as Advancement_Intake1 rows.
 * processAdvancementRows_ (runs right after) promotes them to full SL rows
 * with derived demographics and marks the GC row 'Emerged'. GC facts
 * (BirthYear, Neighborhood, Occupation) ride along so promotion preserves
 * them instead of re-deriving; the two optional columns are ensured on the
 * intake sheet (S184 processor already reads them when present —
 * schema-setup carve-out, fires once per sheet lifetime).
 * Self-healing: if a queued row fails to process, the GC row stays Active
 * at threshold and re-queues next cycle; an already-promoted citizen routes
 * to the update path, never a duplicate mint.
 */
function checkEmergencePromotions_(ss, cycle, maxQueue) {
  var results = { queued: 0 };
  // engine.66: shared drip cap — deferred citizens stay Active at threshold
  // and re-queue next cycle (the self-healing property below already covers
  // exactly this). Undefined maxQueue (legacy caller) = uncapped.
  var cap = (typeof maxQueue === 'number') ? maxQueue : Infinity;
  if (cap <= 0) return results;
  var genericSheet = ss.getSheetByName('Generic_Citizens');
  if (!genericSheet) return results;
  var data = genericSheet.getDataRange().getValues();
  if (data.length < 2) return results;
  var h = data[0];
  var gF = findColByName_(h, 'First'), gL = findColByName_(h, 'Last'),
      gE = findColByName_(h, 'EmergenceCount'), gS = findColByName_(h, 'Status'),
      gB = findColByName_(h, 'BirthYear'), gN = findColByName_(h, 'Neighborhood'),
      gO = findColByName_(h, 'Occupation'), gA = findColByName_(h, 'Age');
  if (gF < 0 || gL < 0 || gE < 0) return results;

  var advSheet = ss.getSheetByName('Advancement_Intake1');
  if (!advSheet) advSheet = ss.getSheetByName('Advancement_Intake');
  if (!advSheet) {
    advSheet = ss.insertSheet('Advancement_Intake1');
    advSheet.appendRow(['First', 'Middle', 'Last', 'RoleType', 'Tier', 'ClockMode', 'CIV', 'MED', 'UNI', 'Notes']);
  }
  var advHeaders = advSheet.getRange(1, 1, 1, advSheet.getLastColumn()).getValues()[0];
  var ensureCols = ['BirthYear', 'Neighborhood'];
  for (var e = 0; e < ensureCols.length; e++) {
    if (findColByName_(advHeaders, ensureCols[e]) < 0) {
      advSheet.getRange(1, advHeaders.length + 1).setValue(ensureCols[e]);
      advHeaders.push(ensureCols[e]);
    }
  }
  var aF = findColByName_(advHeaders, 'First'), aM = findColByName_(advHeaders, 'Middle'),
      aL = findColByName_(advHeaders, 'Last'), aR = findColByName_(advHeaders, 'RoleType'),
      aT = findColByName_(advHeaders, 'Tier'), aC = findColByName_(advHeaders, 'ClockMode'),
      aNo = findColByName_(advHeaders, 'Notes'), aBY = findColByName_(advHeaders, 'BirthYear'),
      aNB = findColByName_(advHeaders, 'Neighborhood');

  for (var r = 1; r < data.length; r++) {
    if (results.queued >= cap) break; // engine.66 shared drip cap
    if (gS >= 0 && String(data[r][gS] || '').toLowerCase() !== 'active') continue;
    var count = Number(data[r][gE]) || 0;
    if (count < GC_EMERGENCE_PROMOTION_THRESHOLD) continue;
    var first = String(data[r][gF] || '').trim();
    var last = String(data[r][gL] || '').trim();
    if (!first || !last) continue;
    var birthYear = gB >= 0 ? (Number(data[r][gB]) || 0) : 0;
    if (!birthYear && gA >= 0 && Number(data[r][gA]) > 0) birthYear = 2041 - Number(data[r][gA]);

    var out = new Array(advHeaders.length).fill('');
    if (aF >= 0) out[aF] = first;
    if (aM >= 0) out[aM] = '';
    if (aL >= 0) out[aL] = last;
    if (aR >= 0) out[aR] = gO >= 0 ? String(data[r][gO] || '').trim() : '';
    if (aT >= 0) out[aT] = 4; // lottery entry is Tier 4 — climbs via UsageCount like everyone
    if (aC >= 0) out[aC] = 'ENGINE';
    if (aNo >= 0) out[aNo] = 'GC emergence promotion — EmergenceCount ' + count + ', C' + cycle + ' (engine.58 lottery)';
    if (aBY >= 0 && birthYear) out[aBY] = birthYear;
    if (aNB >= 0) out[aNB] = gN >= 0 ? String(data[r][gN] || '').trim() : '';
    advSheet.appendRow(out);
    results.queued++;
  }
  if (results.queued) Logger.log('checkEmergencePromotions_: queued ' + results.queued + ' GC lottery promotions');
  return results;
}

/**
 * engine.66 (S324): the family-match drip door — the second door out of
 * Generic_Citizens. Supply-side draw (Mike-approved S324): each open cap slot
 * rolls DRIP_SLOT_P; a firing slot picks ONE random GC citizen and asks
 * whether the dice happened to mint someone who fits an open family slot on
 * the ledger — an off-camera spouse (married, no SpouseId), a missing parent
 * (minor with <2 ParentIds), an uncounted kid (NumChildren > linked kids).
 * No match = whiff, nothing promotes — rarity is structural, never quota'd.
 * Match criteria (Mike-approved S324): sex-compatible, age within band,
 * same-neighborhood weighted up not required; winner takes the family
 * surname (GC surname preserved as MaidenName). Founded heritage lines pull
 * louder, tier-scaled (heritageRank_ weight). Winners queue to
 * Advancement_Intake1 with MatchPopId/MatchType/MaidenName riding along;
 * processAdvancementRows_ mints them and wireFamilyMatch_ wires the links.
 */
function checkFamilyMatchPromotions_(ctx, cycle, slots) {
  var results = { queued: 0, whiffs: 0 };
  if (!slots || slots <= 0) return results;
  if (!ctx || !ctx.ledger || typeof safeRand_ !== 'function') return results;
  // The lottery is a cycle event — manual admin runs (runAdvancementIntakeManual)
  // carry no ctx.rng/rngSeed and must not fire it (safeRand_ would throw).
  if (typeof ctx.rng !== 'function' &&
      !(ctx.config && typeof ctx.config.rngSeed === 'number')) return results;
  var rng = safeRand_(ctx);
  var ss = ctx.ss;

  var genericSheet = ss.getSheetByName('Generic_Citizens');
  if (!genericSheet) return results;
  var gData = genericSheet.getDataRange().getValues();
  if (gData.length < 2) return results;
  var gh = gData[0];
  var gF = findColByName_(gh, 'First'), gL = findColByName_(gh, 'Last'),
      gB = findColByName_(gh, 'BirthYear'), gA = findColByName_(gh, 'Age'),
      gN = findColByName_(gh, 'Neighborhood'), gO = findColByName_(gh, 'Occupation'),
      gS = findColByName_(gh, 'Status'), gX = findColByName_(gh, 'Sex');
  if (gF < 0 || gL < 0) return results;

  var candidates = []; // indices into gData
  for (var g = 1; g < gData.length; g++) {
    if (gS >= 0 && String(gData[g][gS] || '').toLowerCase() !== 'active') continue;
    if (!String(gData[g][gF] || '').trim() || !String(gData[g][gL] || '').trim()) continue;
    candidates.push(g);
  }
  if (!candidates.length) return results;

  // ── Open family slots from the shared ledger ──
  var h = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var idx = function(n) { return h.indexOf(n); };
  var iPop = idx('POPID'), iLast = idx('Last'),
      iStatus = idx('Status'), iGender = idx('Gender'), iBY = idx('BirthYear'),
      iMarital = idx('MaritalStatus'), iSpouse = idx('SpouseId'),
      iParents = idx('ParentIds'), iChildren = idx('ChildrenIds'),
      iNumKids = idx('NumChildren'), iHood = idx('Neighborhood');
  if (iPop < 0 || iLast < 0 || iStatus < 0 || iBY < 0) return results;

  var simYear = 2040 + Math.floor(cycle / 52);
  var popCount = function(v) { return (String(v || '').match(/POP-\d+/g) || []).length; };
  var rowByPop = {};
  for (var p = 0; p < rows.length; p++) {
    if (rows[p] && rows[p][iPop]) rowByPop[String(rows[p][iPop]).trim()] = rows[p];
  }
  var heritageByPop = (typeof heritageTierByPop_ === 'function') ? heritageTierByPop_(ss) : {};

  var openSlots = [];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (!row || String(row[iStatus] || '').toLowerCase() !== 'active') continue;
    var by = Number(row[iBY]) || 0;
    if (!by) continue;
    var popId = String(row[iPop] || '').trim();
    var hood = iHood >= 0 ? String(row[iHood] || '').trim() : '';
    var gender = iGender >= 0 ? String(row[iGender] || '').trim().toLowerCase() : '';
    var surname = String(row[iLast] || '').trim();
    if (!popId || !surname) continue;
    var hTier = heritageByPop[popId] || null;

    // SPOUSE slot — married/partnered, spouse off-camera
    if (iMarital >= 0 && iSpouse >= 0 &&
        /married|partner/i.test(String(row[iMarital] || '')) &&
        !String(row[iSpouse] || '').trim()) {
      openSlots.push({
        type: 'spouse', targetPop: popId, surname: surname, hood: hood, hTier: hTier,
        expectSex: gender === 'female' ? 'male' : (gender === 'male' ? 'female' : ''),
        byMin: by - DRIP_SPOUSE_AGE_BAND, byMax: by + DRIP_SPOUSE_AGE_BAND
      });
    }
    // PARENT slot — minor with fewer than 2 on-camera parents
    if (iParents >= 0 && (simYear - by) < 18 && popCount(row[iParents]) < 2) {
      var expectParentSex = '';
      var pids = String(row[iParents] || '').match(/POP-\d+/g) || [];
      if (pids.length === 1 && iGender >= 0) {
        var pRow = rowByPop[pids[0]];
        var pg = pRow ? String(pRow[iGender] || '').trim().toLowerCase() : '';
        expectParentSex = pg === 'female' ? 'male' : (pg === 'male' ? 'female' : '');
      }
      openSlots.push({
        type: 'parent', targetPop: popId, surname: surname, hood: hood, hTier: hTier,
        expectSex: expectParentSex,
        byMin: by - DRIP_PARENT_AGE_MAX, byMax: by - DRIP_PARENT_AGE_MIN
      });
    }
    // CHILD slot — NumChildren claims more kids than are linked on-camera
    if (iNumKids >= 0 && iChildren >= 0 &&
        (Number(row[iNumKids]) || 0) > popCount(row[iChildren])) {
      openSlots.push({
        type: 'child', targetPop: popId, surname: surname, hood: hood, hTier: hTier,
        expectSex: '',
        byMin: by + DRIP_PARENT_AGE_MIN, byMax: by + DRIP_PARENT_AGE_MAX
      });
    }
  }
  if (!openSlots.length) return results;

  // ── Intake sheet + extra columns the family door rides on ──
  var advSheet = ss.getSheetByName('Advancement_Intake1');
  if (!advSheet) advSheet = ss.getSheetByName('Advancement_Intake');
  if (!advSheet) {
    advSheet = ss.insertSheet('Advancement_Intake1');
    advSheet.appendRow(['First', 'Middle', 'Last', 'RoleType', 'Tier', 'ClockMode', 'CIV', 'MED', 'UNI', 'Notes']);
  }
  var advHeaders = advSheet.getRange(1, 1, 1, advSheet.getLastColumn()).getValues()[0];
  var ensureCols = ['BirthYear', 'Neighborhood', 'MatchPopId', 'MatchType', 'MaidenName'];
  for (var e = 0; e < ensureCols.length; e++) {
    if (findColByName_(advHeaders, ensureCols[e]) < 0) {
      advSheet.getRange(1, advHeaders.length + 1).setValue(ensureCols[e]);
      advHeaders.push(ensureCols[e]);
    }
  }
  var aF = findColByName_(advHeaders, 'First'), aL = findColByName_(advHeaders, 'Last'),
      aR = findColByName_(advHeaders, 'RoleType'), aT = findColByName_(advHeaders, 'Tier'),
      aC = findColByName_(advHeaders, 'ClockMode'), aNo = findColByName_(advHeaders, 'Notes'),
      aBY = findColByName_(advHeaders, 'BirthYear'), aNB = findColByName_(advHeaders, 'Neighborhood'),
      aMP = findColByName_(advHeaders, 'MatchPopId'), aMT = findColByName_(advHeaders, 'MatchType'),
      aMN = findColByName_(advHeaders, 'MaidenName');

  var claimed = {}; // targetPop claimed this cycle — one realization per citizen per cycle

  // engine.66c (S324, Mike-direct — THE LOTTERY, his words): "a lottery grabs
  // 2 and do they match or not." Each remaining cap slot spins two reels —
  // ONE random GC citizen, ONE random open family slot — and tests THAT pair.
  // No scanning the city for a home for the drawn citizen. Match = the rare
  // chance of moments aligning (same hood, right sex, right age) and the
  // moment lands. No match = nothing happens, and that is the normal cycle.
  // Founded heritage lines pull the family reel slightly harder (the earned
  // edge — becoming a heritage ledger is the game).
  for (var s = 0; s < slots; s++) {
    if (!candidates.length || !openSlots.length) break;

    // Reel 1: the citizen
    var pickIdx = Math.floor(rng() * candidates.length);
    var gRow = gData[candidates[pickIdx]];
    var candSex = gX >= 0 ? String(gRow[gX] || '').trim().toLowerCase() : '';
    var candBY = gB >= 0 ? (Number(gRow[gB]) || 0) : 0;
    if (!candBY && gA >= 0 && Number(gRow[gA]) > 0) candBY = 2041 - Number(gRow[gA]);
    var candHood0 = gN >= 0 ? String(gRow[gN] || '').trim() : '';

    // Reel 2: the family slot (heritage-tier weighted draw)
    var totW = 0, sw = [];
    for (var m = 0; m < openSlots.length; m++) {
      var wt = 1 + ((openSlots[m].hTier && typeof heritageRank_ === 'function') ? heritageRank_(openSlots[m].hTier) + 1 : 0);
      sw.push(wt); totW += wt;
    }
    var sRoll = rng() * totW, won = openSlots[0];
    for (var v = 0; v < openSlots.length; v++) {
      sRoll -= sw[v];
      if (sRoll <= 0) { won = openSlots[v]; break; }
    }

    // Do the two reels line up? Every check is a real-world fact — no dial.
    var aligned = candBY > 0 && !claimed[won.targetPop] &&
      candHood0 && won.hood && candHood0 === won.hood &&
      (!won.expectSex || candSex === won.expectSex) &&
      candBY >= won.byMin && candBY <= won.byMax;
    if (!aligned) {
      results.whiffs++;
      Logger.log('checkFamilyMatchPromotions_: reels did not align — ' +
        String(gRow[gF]) + ' ' + String(gRow[gL]) + ' vs ' + won.type + ' slot of ' +
        won.targetPop + ' (C' + cycle + ')');
      continue;
    }

    var out = new Array(advHeaders.length).fill('');
    if (aF >= 0) out[aF] = String(gRow[gF]).trim();
    if (aL >= 0) out[aL] = won.surname; // takes the family name at mint
    if (aR >= 0) out[aR] = gO >= 0 ? String(gRow[gO] || '').trim() : '';
    if (aT >= 0) out[aT] = 4;
    if (aC >= 0) out[aC] = 'ENGINE';
    if (aNo >= 0) out[aNo] = 'Family-match drip — ' + won.type + ' of ' + won.targetPop +
      ', C' + cycle + ' (engine.66 lottery)';
    if (aBY >= 0) out[aBY] = candBY;
    if (aNB >= 0 && won.hood) out[aNB] = won.hood; // they join the household's neighborhood
    if (aMP >= 0) out[aMP] = won.targetPop;
    if (aMT >= 0) out[aMT] = won.type;
    if (aMN >= 0) out[aMN] = String(gRow[gL]).trim(); // the name they carried before
    advSheet.appendRow(out);

    claimed[won.targetPop] = true;
    candidates.splice(pickIdx, 1);
    results.queued++;
    Logger.log('checkFamilyMatchPromotions_: ' + String(gRow[gF]) + ' ' + String(gRow[gL]) +
      ' won the family lottery — ' + won.type + ' of ' + won.targetPop + ' (C' + cycle + ')');
  }
  return results;
}

/**
 * engine.66 (S324): wire the family links after a family-drip mint. The new
 * citizen already carries the family surname (queued that way); this connects
 * the rows — SpouseId/ParentIds/ChildrenIds both ways, household +
 * neighborhood join, a LifeHistory line on BOTH lives, and a story hook.
 * LineageId is deliberately NOT set here — heritage membership grows through
 * updateHeritage_'s own join rules (spouse joins the line whose surname they
 * took), keeping one owner for line membership (SIM_DOCTRINE rule 7).
 */
function wireFamilyMatch_(ctx, newIdx, newPopId, targetPopId, matchType, now, cycle, logSheet) {
  var h = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var idx = function(n) { return h.indexOf(n); };
  var iPop = idx('POPID'), iFirst = idx('First'), iLast = idx('Last'),
      iSpouse = idx('SpouseId'), iMarital = idx('MaritalStatus'),
      iParents = idx('ParentIds'), iChildren = idx('ChildrenIds'),
      iNumKids = idx('NumChildren'), iHH = idx('HouseholdId'),
      iHood = idx('Neighborhood'), iLife = idx('LifeHistory');
  var newRow = rows[newIdx];
  var target = null;
  for (var r = 0; r < rows.length; r++) {
    if (rows[r] && String(rows[r][iPop] || '').trim() === targetPopId) { target = rows[r]; break; }
  }
  if (!target || !newRow) {
    Logger.log('wireFamilyMatch_: target ' + targetPopId + ' not found — links skipped');
    return;
  }
  var stamp = 'Y' + (Math.floor((cycle - 1) / 52) + 1) + 'C' + (((cycle - 1) % 52) + 1);
  var newName = (String(newRow[iFirst] || '') + ' ' + String(newRow[iLast] || '')).trim();
  var targetName = (String(target[iFirst] || '') + ' ' + String(target[iLast] || '')).trim();
  var appendPop = function(v, pop) {
    var arr = String(v || '').match(/POP-\d+/g) || [];
    if (arr.indexOf(pop) < 0) arr.push(pop);
    return JSON.stringify(arr);
  };
  var desc = '';

  if (matchType === 'spouse') {
    if (iSpouse >= 0) { target[iSpouse] = newPopId; newRow[iSpouse] = targetPopId; }
    if (iMarital >= 0) newRow[iMarital] = String(target[iMarital] || 'married');
    // Kids are shared: mirror the family's kid state instead of the mint
    // profile's random NumChildren (which would open phantom child slots).
    if (iNumKids >= 0) newRow[iNumKids] = Number(target[iNumKids]) || 0;
    if (iChildren >= 0) newRow[iChildren] = String(target[iChildren] || '');
    desc = 'married to ' + targetName;
  } else if (matchType === 'parent') {
    var priorParents = iParents >= 0 ? (String(target[iParents] || '').match(/POP-\d+/g) || []) : [];
    if (iParents >= 0) target[iParents] = appendPop(target[iParents], newPopId);
    if (iChildren >= 0) newRow[iChildren] = appendPop('', targetPopId);
    if (iNumKids >= 0 && !(Number(newRow[iNumKids]) >= 1)) newRow[iNumKids] = 1;
    desc = 'parent of ' + targetName;
    // If the kid's single on-camera parent is married with their spouse
    // off-camera, the arriving parent IS that spouse — one off-camera human
    // held both roles. Realize the marriage in the same stroke.
    if (priorParents.length === 1 && iSpouse >= 0 && iMarital >= 0) {
      var coParent = null;
      for (var c = 0; c < rows.length; c++) {
        if (rows[c] && String(rows[c][iPop] || '').trim() === priorParents[0]) { coParent = rows[c]; break; }
      }
      if (coParent && /married|partner/i.test(String(coParent[iMarital] || '')) &&
          !String(coParent[iSpouse] || '').trim()) {
        coParent[iSpouse] = newPopId;
        newRow[iSpouse] = String(coParent[iPop]);
        newRow[iMarital] = String(coParent[iMarital]);
        desc = 'parent of ' + targetName + ', married to ' +
          (String(coParent[iFirst] || '') + ' ' + String(coParent[iLast] || '')).trim();
      }
    }
  } else if (matchType === 'child') {
    if (iChildren >= 0) target[iChildren] = appendPop(target[iChildren], newPopId);
    if (iParents >= 0) {
      var parents = [targetPopId];
      var sp = iSpouse >= 0 ? String(target[iSpouse] || '').match(/POP-\d+/) : null;
      if (sp) parents.push(sp[0]);
      newRow[iParents] = JSON.stringify(parents);
    }
    desc = 'child of ' + targetName;
  } else {
    Logger.log('wireFamilyMatch_: unknown matchType "' + matchType + '" — links skipped');
    return;
  }

  // They join the family's household and neighborhood
  if (iHH >= 0 && target[iHH]) newRow[iHH] = target[iHH];
  if (iHood >= 0 && target[iHood]) newRow[iHood] = target[iHood];

  // Both lives record it
  if (iLife >= 0) {
    var line = stamp + ' — [Family] Came on-camera — ' + desc + ' (drip lottery)';
    newRow[iLife] = (String(newRow[iLife] || '') ? String(newRow[iLife]) + '\n' : '') + line;
    var roleWord = matchType === 'spouse' ? 'Spouse' : (matchType === 'parent' ? 'Parent' : 'Child');
    var tLine = stamp + ' — [Family] ' + roleWord + ' realized on-camera: ' + newName + ' (' + newPopId + ')';
    target[iLife] = (String(target[iLife] || '') ? String(target[iLife]) + '\n' : '') + tLine;
  }
  ctx.ledger.dirty = true;

  if (logSheet) {
    logSheet.appendRow([now, newPopId, newName, 'Family',
      'Won the family lottery — ' + desc + ' (engine.66)', '', cycle]);
  }
  if (ctx.summary) {
    ctx.summary.storyHooks = ctx.summary.storyHooks || [];
    ctx.summary.storyHooks.push({
      hookType: 'FAMILY_REALIZED', severity: 3, priority: 3,
      description: newName + ' came on-camera — ' + desc,
      cycleGenerated: cycle, neighborhood: iHood >= 0 ? String(newRow[iHood] || '') : '',
      domain: 'COMMUNITY',
      text: targetName + "'s " + matchType + ' ' + newName + ' enters the record (drip lottery C' + cycle + ')'
    });
  }
  Logger.log('wireFamilyMatch_: ' + newPopId + ' ' + desc + ' — links wired');
}

/**
 * engine.59 (S320): seed friendship bonds between freshly-promoted GC
 * citizens and their namer roster. Idempotent: seeded rows get a
 * '[bonds-seeded]' marker appended to EmergenceContext. Runs every cycle;
 * only Emerged rows with an unseeded 'Named in' roster do work.
 */
function seedEmergenceBonds_(ctx, cycle) {
  var results = { seeded: 0 };
  if (!ctx || !ctx.ledger || typeof makeBond_ !== 'function') return results;
  if (!ctx.summary || !Array.isArray(ctx.summary.relationshipBonds)) return results;
  var genericSheet = ctx.ss.getSheetByName('Generic_Citizens');
  if (!genericSheet) return results;
  var data = genericSheet.getDataRange().getValues();
  if (data.length < 2) return results;
  var h = data[0];
  var gF = findColByName_(h, 'First'), gL = findColByName_(h, 'Last'),
      gS = findColByName_(h, 'Status'), gC = findColByName_(h, 'EmergenceContext');
  if (gF < 0 || gL < 0 || gS < 0 || gC < 0) return results;

  // name -> {popId, idx, hood} from the shared ledger
  var header = ctx.ledger.headers;
  var iPop = header.indexOf('POPID'), iFirst = header.indexOf('First'),
      iLast = header.indexOf('Last'), iHood = header.indexOf('Neighborhood'),
      iStatus = header.indexOf('Status');
  var byName = {};
  for (var r = 0; r < ctx.ledger.rows.length; r++) {
    var row = ctx.ledger.rows[r];
    if (String(row[iStatus] || '').toLowerCase() !== 'active') continue;
    var nm = (String(row[iFirst] || '').trim() + ' ' + String(row[iLast] || '').trim()).trim().toLowerCase();
    if (nm) byName[nm] = { popId: row[iPop], idx: r, hood: iHood >= 0 ? (row[iHood] || '') : '' };
  }

  for (var g = 1; g < data.length; g++) {
    if (String(data[g][gS] || '') !== 'Emerged') continue;
    var context = String(data[g][gC] || '');
    if (context.indexOf('Named in ') < 0 || context.indexOf('[bonds-seeded]') >= 0) continue;
    var promoted = byName[(String(data[g][gF] || '').trim() + ' ' + String(data[g][gL] || '').trim()).toLowerCase()];
    if (!promoted) continue; // SL row not landed yet — retries next cycle

    var seen = {};
    var m, re = /Named in (.+?)'s week/g;
    var seededHere = 0;
    while ((m = re.exec(context)) !== null) {
      var namer = byName[String(m[1]).trim().toLowerCase()];
      if (!namer || namer.popId === promoted.popId || seen[namer.popId]) continue;
      seen[namer.popId] = true;
      ctx.summary.relationshipBonds.push(makeBond_(promoted.popId, namer.popId,
        BOND_TYPES.FRIENDSHIP, 'emergence', 'COMMUNITY', namer.hood || promoted.hood,
        3, cycle, 'Knew them before the record did (engine.59 C' + cycle + ')', ctx));
      seededHere++;
      results.seeded++;
    }
    if (seededHere > 0) {
      genericSheet.getRange(g + 1, gC + 1).setValue((context + ' [bonds-seeded]').slice(0, 450));
      Logger.log('seedEmergenceBonds_: ' + promoted.popId + ' enters with ' + seededHere + ' friendship bond(s)');
    }
  }
  return results;
}

function markAsEmergedInGeneric_(ss, genericSheet, first, last, cycle) {
  if (!genericSheet) genericSheet = ss.getSheetByName('Generic_Citizens');
  if (!genericSheet) return;
  var data = genericSheet.getDataRange().getValues();
  var headers = data[0];
  var gFirst = findColByName_(headers, 'First');
  var gLast = findColByName_(headers, 'Last');
  var gStatus = findColByName_(headers, 'Status');
  if (gFirst < 0 || gLast < 0) return;
  for (var r = 1; r < data.length; r++) {
    var f = String(data[r][gFirst] || '').trim();
    var l = String(data[r][gLast] || '').trim();
    if (f.toLowerCase() === first.toLowerCase() && l.toLowerCase() === last.toLowerCase()) {
      if (gStatus >= 0) genericSheet.getRange(r + 1, gStatus + 1).setValue('Emerged');
      break;
    }
  }
}