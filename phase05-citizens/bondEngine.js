/**
 * ============================================================================
 * BOND ENGINE V2.7
 * ============================================================================
 *
 * Manages citizen relationships with calendar awareness.
 *
 * v2.7 Fixes:
 * - Ledger bloat fix: lastUpdate only stamped for meaningful changes
 *   (status change, type change, or intensity delta >= 2.0)
 * - Routine intensity ticks still apply to master state but don't
 *   trigger Relationship_Bond_Ledger rows (~90% write reduction)
 *
 * v2.6 Fixes:
 * - Replaced all Math.random() calls with ctx.rng for deterministic randomness
 * - Each ctx-receiving function initializes rng fallback: ctx.rng || Math.random
 * - generateBondId_ now accepts ctx parameter for deterministic ID generation
 *
 * v2.6 (ENGINE_REPAIR Row 33, S301):
 * - Lookups renamed to ctx._bondNameLookup / ctx._bondIdToName — the old
 *   ctx.citizenLookup name COLLIDED with the canonical popId-keyed lookup
 *   built by generateCitizensEvents_ (this engine's name-keyed shape, built
 *   first at Phase5-Bonds, made the events engine skip its build → blank
 *   LifeHistory_Log names + broken popId consumers in Phase 7).
 * - Runs AFTER Phase5-Promotions now (godWorldEngine2 reorder) so the
 *   S.citizenEvents pool published by generateCitizensEvents_ exists —
 *   detectNewBonds_ had never landed a bond (pool empty since landing).
 *
 * v2.5 Fixes:
 * - Added Simulation_Ledger fallback when Citizen_Directory doesn't exist
 * - New ctx._bondIdToName map for ID-to-name resolution
 * - Ensures the name lookup is populated even without Citizen_Directory sheet
 *
 * v2.4 Fixes:
 * - Citizen name/id resolver: handles id-based sources correctly
 * - Neighbor decay condition fixed (was backwards)
 * - Confrontation intensity now clamped after reduction
 * - bondExists_ optimized with O(1) set lookup
 * - Festival bonds only trigger for holidays with mapped neighborhoods
 * - Neighborhoods stored on ctx.neighborhoodList (not global)
 * - Cache header lookup made defensive
 * - Version strings corrected
 *
 * v2.3 Enhancements:
 * - Dynamic neighborhood loading from Neighborhood_Map sheet
 * - Removed hardcoded OAKLAND_NEIGHBORHOODS_BOND array
 * - Uses ctx.cache for efficient sheet access
 *
 * v2.2 Enhancements:
 * - Festival/celebration days spark more alliance/community bonds
 * - Holiday gatherings boost neighbor bond formation
 * - Sports seasons boost sports-related rivalry formation
 * - First Friday boosts professional/cultural bonds in arts districts
 * - Creation Day boosts community/neighbor bonds
 * - Calendar-specific bond origins
 * - Calendar context in bond summary and ledger
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.1):
 * - Fallback population of cycleActiveCitizens
 * - Citizen_Directory lookup
 * - Diagnostic logging
 *
 * DEPENDENCIES:
 * - Citizen_Directory sheet (for citizenLookup)
 * - Neighborhood_Map sheet (for neighborhood list)
 * - ctx.summary.citizenEvents OR ctx.summary.storySeeds OR eventArcs
 *
 * ============================================================================
 */


// ============================================================
// BOND TYPES & CONSTANTS
// ============================================================

var BOND_TYPES = {
  RIVALRY: 'rivalry',
  ALLIANCE: 'alliance',
  TENSION: 'tension',
  MENTORSHIP: 'mentorship',
  ROMANTIC: 'romantic',
  PROFESSIONAL: 'professional',
  NEIGHBOR: 'neighbor',
  FESTIVAL: 'festival',      // v2.2: Festival connection
  SPORTS_RIVAL: 'sports_rival', // v2.2: Sports rivalry
  // engine.59 (S320): these types existed as sheet literals (174 friendship /
  // 72 family rows) but never as enum keys — so P5's romance flip compared
  // bondType === undefined and could NEVER fire. Third latent P5 bug found
  // by the autonomous fire loop (after threshold-unreachable and the
  // LifeHistory arg shift).
  FRIENDSHIP: 'friendship',
  FAMILY: 'family'
};

var BOND_ORIGINS = {
  CAREER_OVERLAP: 'career_overlap',
  NEIGHBORHOOD: 'neighborhood',
  ROMANTIC_TRIANGLE: 'romantic_triangle',
  IDEOLOGICAL: 'ideological',
  MENTOR_PROTEGE: 'mentor_protege',
  RANDOM_ENCOUNTER: 'random_encounter',
  ARC_PROXIMITY: 'arc_proximity',
  DOMAIN_CLUSTER: 'domain_cluster',
  // v2.2: Calendar-specific origins
  FESTIVAL_ENCOUNTER: 'festival_encounter',
  HOLIDAY_GATHERING: 'holiday_gathering',
  SPORTS_SEASON: 'sports_season',
  FIRST_FRIDAY: 'first_friday',
  CREATION_DAY: 'creation_day',
  PARADE_PROXIMITY: 'parade_proximity'
};

var BOND_STATUS = {
  ACTIVE: 'active',
  DORMANT: 'dormant',
  RESOLVED: 'resolved',
  SEVERED: 'severed'
};

// v2.2: Arts district neighborhoods
var ARTS_DISTRICT_NEIGHBORHOODS = ['Temescal', 'Uptown', 'KONO', 'Jack London'];

// v2.2: Festival neighborhoods by holiday
var FESTIVAL_NEIGHBORHOODS = {
  'OaklandPride': ['Downtown', 'Lake Merritt', 'Grand Lake', 'Uptown'],
  'ArtSoulFestival': ['Downtown', 'Jack London'],
  'LunarNewYear': ['Chinatown', 'Downtown'],
  'CincoDeMayo': ['Fruitvale', 'San Antonio'],
  'DiaDeMuertos': ['Fruitvale', 'San Antonio'],
  'Juneteenth': ['West Oakland', 'Downtown']
};


// ============================================================
// NEIGHBORHOOD LOADER (v2.3)
// ============================================================

/**
 * Loads neighborhood names from Neighborhood_Map sheet.
 * Uses ctx.cache if available, falls back to direct sheet access.
 * Returns array of neighborhood names.
 */
function loadNeighborhoodsFromSheet_(ctx) {
  var neighborhoods = [];

  // Try cache first (v2.10+)
  if (ctx.cache) {
    var cached = ctx.cache.getData('Neighborhood_Map');
    if (cached.exists && cached.values && cached.values.length > 1) {
      // v2.4: Defensive header lookup
      var header = cached.header || cached.values[0] || [];
      var nhIdx = -1;
      for (var h = 0; h < header.length; h++) {
        if (header[h] === 'Neighborhood') {
          nhIdx = h;
          break;
        }
      }
      if (nhIdx >= 0) {
        var startRow = cached.header ? 0 : 1; // Skip header row if values[0] is header
        if (cached.header) startRow = 0;
        for (var r = startRow; r < cached.values.length; r++) {
          var nh = (cached.values[r][nhIdx] || '').toString().trim();
          if (nh && neighborhoods.indexOf(nh) < 0) {
            neighborhoods.push(nh);
          }
        }
      }
    }
  }

  // Fallback to direct sheet access
  if (neighborhoods.length === 0 && ctx.ss) {
    var sheet = ctx.ss.getSheetByName('Neighborhood_Map');
    if (sheet) {
      var values = sheet.getDataRange().getValues();
      if (values.length > 1) {
        var header = values[0];
        var nhIdx = -1;
        for (var hi = 0; hi < header.length; hi++) {
          if (header[hi] === 'Neighborhood') {
            nhIdx = hi;
            break;
          }
        }
        if (nhIdx >= 0) {
          for (var r = 1; r < values.length; r++) {
            var nh = (values[r][nhIdx] || '').toString().trim();
            if (nh && neighborhoods.indexOf(nh) < 0) {
              neighborhoods.push(nh);
            }
          }
        }
      }
    }
  }

  // Fallback defaults if sheet is empty/missing
  if (neighborhoods.length === 0) {
    Logger.log('loadNeighborhoodsFromSheet_: No neighborhoods found, using defaults');
    neighborhoods = [
      'Temescal', 'Downtown', 'Fruitvale', 'Lake Merritt',
      'West Oakland', 'Laurel', 'Rockridge', 'Jack London',
      'Adams Point', 'Grand Lake', 'Piedmont Ave', 'Chinatown'
    ];
  }

  return neighborhoods;
}


// ============================================================
// v2.4: CITIZEN NAME RESOLVER
// ============================================================

/**
 * Resolves a raw citizen identifier to a canonical name key.
 * Handles cases where arcs/seeds store IDs instead of names.
 */
function resolveCitizenName_(ctx, raw) {
  if (!raw) return '';
  var s = raw.toString().trim();
  if (!s) return '';

  // If it's already a valid name key in citizenLookup, use it
  if (ctx._bondNameLookup && ctx._bondNameLookup[s]) {
    return s;
  }

  // If we have an id-to-name map, try that
  if (ctx._bondIdToName && ctx._bondIdToName[s]) {
    return ctx._bondIdToName[s];
  }

  // Fallback: return as-is (may not resolve in lookup, but at least tracked)
  return s;
}


// ============================================================
// v2.4: BOND KEY SET (O(1) lookup)
// ============================================================

/**
 * Builds a set of bond keys for O(1) existence checks.
 */
function buildBondKeySet_(bonds) {
  var set = {};
  for (var i = 0; i < (bonds || []).length; i++) {
    var b = bonds[i];
    if (!b) continue;
    var a = b.citizenA;
    var c = b.citizenB;
    if (!a || !c) continue;
    var k = a < c ? (a + '|' + c) : (c + '|' + a);
    set[k] = true;
  }
  return set;
}

/**
 * Gets the bond key for a pair of citizens.
 */
function getBondKey_(citizenA, citizenB) {
  return citizenA < citizenB ? (citizenA + '|' + citizenB) : (citizenB + '|' + citizenA);
}


// ============================================================
// MAIN ENGINE
// ============================================================

function runBondEngine_(ctx) {
  var S = ctx.summary || {};

  // v2.4: Load neighborhoods to ctx (not global)
  ctx.neighborhoodList = loadNeighborhoodsFromSheet_(ctx);
  Logger.log('runBondEngine_ v2.4: Loaded ' + ctx.neighborhoodList.length + ' neighborhoods from Neighborhood_Map');

  // Initialize bonds array if needed
  ctx.summary.relationshipBonds = ctx.summary.relationshipBonds || [];

  // v2.4: Build bond key set for O(1) lookups
  ctx._bondKeySet = buildBondKeySet_(ctx.summary.relationshipBonds);

  // v2.2: Get calendar context
  var calendarContext = {
    holiday: S.holiday || 'none',
    holidayPriority: S.holidayPriority || 'none',
    isFirstFriday: S.isFirstFriday || false,
    isCreationDay: S.isCreationDay || false,
    sportsSeason: S.sportsSeason || 'off-season'
  };
  ctx.bondCalendarContext = calendarContext;

  // v2.1: Ensure we have the data we need
  var dataReady = ensureBondEngineData_(ctx);
  if (!dataReady) {
    Logger.log('runBondEngine_ v2.4: Insufficient data, skipping bond processing');
    return;
  }

  // Step 1: Update existing bonds (with calendar modifiers)
  updateExistingBonds_(ctx);

  // Step 2: Detect new potential bonds (with calendar awareness)
  var newBonds = detectNewBonds_(ctx);

  // Step 3: Add new bonds (with duplicate check via set)
  for (var i = 0; i < newBonds.length; i++) {
    var bond = newBonds[i];
    var key = getBondKey_(bond.citizenA, bond.citizenB);
    if (!ctx._bondKeySet[key]) {
      ctx.summary.relationshipBonds.push(bond);
      ctx._bondKeySet[key] = true; // Add to set
      Logger.log('runBondEngine_ v2.4: Created bond ' + bond.citizenA + ' <-> ' + bond.citizenB + ' (' + bond.bondType + ')');
    }
  }

  // Step 3.5 (engine.57 P5): romance, marriage, and triangle-born hate.
  // Physics only — no caps, no quotas. What matures, marries; what collides,
  // feuds. Weddings live HERE now (Mike: "marriage comes from bonds not
  // events"); the generationalEventsEngine dice path is retired.
  processRomanceAndMarriage_(ctx);
  processGCMarriageLottery_(ctx); // engine.59 — the lottery door
  detectTriangleRivalries_(ctx);

  // Step 4: Check for confrontation triggers
  var confrontations = checkConfrontationTriggers_(ctx);
  ctx.summary.pendingConfrontations = confrontations;

  // Step 5: Apply alliance benefits
  applyAllianceBenefits_(ctx);

  // Step 6: Generate bond summary for packet (with calendar context)
  generateBondSummary_(ctx);

  Logger.log('runBondEngine_ v2.4: Complete. Total bonds: ' + ctx.summary.relationshipBonds.length + ' | Calendar: ' + calendarContext.holiday);
}


// ============================================================
// v2.1: DATA POPULATION
// ============================================================

/**
 * Ensures ctx has the data needed for bond detection.
 * Returns true if we have enough data to proceed.
 */
function ensureBondEngineData_(ctx) {
  var S = ctx.summary || {};
  var diagnostics = {
    cycleActiveCitizens: 0,
    citizenLookup: 0,
    sources: []
  };

  // ─────────────────────────────────────────────────────────────
  // POPULATE cycleActiveCitizens (v2.4: with name resolver)
  // ─────────────────────────────────────────────────────────────
  if (!S.cycleActiveCitizens || S.cycleActiveCitizens.length === 0) {
    ctx.summary.cycleActiveCitizens = [];

    // Source 1: citizenEvents
    var citizenEvents = S.citizenEvents || [];
    for (var i = 0; i < citizenEvents.length; i++) {
      var ev = citizenEvents[i];
      if (!ev) continue;
      var name = ev.citizenName || ev.citizen || ev.name || '';
      var resolved = resolveCitizenName_(ctx, name);
      if (resolved && ctx.summary.cycleActiveCitizens.indexOf(resolved) === -1) {
        ctx.summary.cycleActiveCitizens.push(resolved);
      }
    }
    if (citizenEvents.length > 0) diagnostics.sources.push('citizenEvents');

    // Source 2: storySeeds
    var storySeeds = S.storySeeds || [];
    for (var j = 0; j < storySeeds.length; j++) {
      var seed = storySeeds[j];
      if (!seed) continue;
      var seedCitizens = seed.citizens || seed.involvedCitizens || [];
      for (var k = 0; k < seedCitizens.length; k++) {
        var c = seedCitizens[k];
        var cName = typeof c === 'string' ? c : (c.name || c.id || '');
        var resolvedC = resolveCitizenName_(ctx, cName);
        if (resolvedC && ctx.summary.cycleActiveCitizens.indexOf(resolvedC) === -1) {
          ctx.summary.cycleActiveCitizens.push(resolvedC);
        }
      }
    }
    if (storySeeds.length > 0) diagnostics.sources.push('storySeeds');

    // Source 3: eventArcs
    var eventArcs = S.eventArcs || ctx.v3Arcs || [];
    for (var a = 0; a < eventArcs.length; a++) {
      var arc = eventArcs[a];
      if (!arc || arc.phase === 'resolved') continue;
      var arcCitizens = arc.involvedCitizens || [];
      for (var b = 0; b < arcCitizens.length; b++) {
        var ac = arcCitizens[b];
        var acName = typeof ac === 'string' ? ac : (ac.name || ac.id || '');
        var resolvedAc = resolveCitizenName_(ctx, acName);
        if (resolvedAc && ctx.summary.cycleActiveCitizens.indexOf(resolvedAc) === -1) {
          ctx.summary.cycleActiveCitizens.push(resolvedAc);
        }
      }
    }
    if (eventArcs.length > 0) diagnostics.sources.push('eventArcs');

    // Source 4: worldEvents with citizen mentions
    var worldEvents = S.worldEvents || [];
    for (var w = 0; w < worldEvents.length; w++) {
      var we = worldEvents[w];
      if (!we) continue;
      var weCitizens = we.citizens || we.involvedCitizens || [];
      for (var x = 0; x < weCitizens.length; x++) {
        var wc = weCitizens[x];
        var wcName = typeof wc === 'string' ? wc : (wc.name || wc.id || '');
        var resolvedWc = resolveCitizenName_(ctx, wcName);
        if (resolvedWc && ctx.summary.cycleActiveCitizens.indexOf(resolvedWc) === -1) {
          ctx.summary.cycleActiveCitizens.push(resolvedWc);
        }
      }
    }
    if (worldEvents.length > 0) diagnostics.sources.push('worldEvents');
  }

  diagnostics.cycleActiveCitizens = ctx.summary.cycleActiveCitizens.length;

  // ─────────────────────────────────────────────────────────────
  // POPULATE citizenLookup
  // ─────────────────────────────────────────────────────────────
  if (!ctx._bondNameLookup || Object.keys(ctx._bondNameLookup).length === 0) {
    ctx._bondNameLookup = {};
    ctx._bondIdToName = {};  // v2.5: ID-to-name lookup

    // Try to load from Citizen_Directory sheet
    try {
      var ss = ctx.ss;
      var dirSheet = ss.getSheetByName('Citizen_Directory');

      if (dirSheet) {
        var data = dirSheet.getDataRange().getValues();
        var headers = data[0];

        // Find column indices
        var nameIdx = findColIndex_(headers, ['Name', 'CitizenName', 'Citizen']);
        var nhIdx = findColIndex_(headers, ['Neighborhood', 'NH']);
        var tierIdx = findColIndex_(headers, ['TierRole', 'Tier']);
        var uniIdx = findColIndex_(headers, ['UNI']);
        var medIdx = findColIndex_(headers, ['MED']);
        var civIdx = findColIndex_(headers, ['CIV']);
        var occIdx = findColIndex_(headers, ['Occupation', 'Job']);

        for (var r = 1; r < data.length; r++) {
          var row = data[r];
          var name = nameIdx >= 0 ? row[nameIdx] : '';
          if (!name) continue;

          ctx._bondNameLookup[name] = {
            Name: name,
            Neighborhood: nhIdx >= 0 ? row[nhIdx] : '',
            TierRole: tierIdx >= 0 ? row[tierIdx] : '',
            UNI: uniIdx >= 0 ? row[uniIdx] : '',
            MED: medIdx >= 0 ? row[medIdx] : '',
            CIV: civIdx >= 0 ? row[civIdx] : '',
            Occupation: occIdx >= 0 ? row[occIdx] : ''
          };
        }

        diagnostics.sources.push('Citizen_Directory');
      }
    } catch (e) {
      Logger.log('ensureBondEngineData_: Error loading Citizen_Directory - ' + e.message);
    }

    // v2.5: Fallback to Simulation_Ledger if no citizens loaded.
    // Phase 42 §5.6: read from shared ctx.ledger so any mid-cycle mutations
    // by phase04/phase05 writers are visible.
    if (Object.keys(ctx._bondNameLookup).length === 0 && ctx.ledger) {
      try {
        var ledgerRows = ctx.ledger.rows;
        if (ledgerRows.length > 0) {
          var lh = ctx.ledger.headers;
            var lFirst = findColIndex_(lh, ['First']);
            var lLast = findColIndex_(lh, ['Last']);
            var lNH = findColIndex_(lh, ['Neighborhood']);
            var lTier = findColIndex_(lh, ['Tier', 'TierRole']);
            var lUNI = findColIndex_(lh, ['UNI (y/n)', 'UNI']);
            var lMED = findColIndex_(lh, ['MED (y/n)', 'MED']);
            var lCIV = findColIndex_(lh, ['CIV (y/n)', 'CIV']);
            var lOcc = findColIndex_(lh, ['Occupation', 'RoleType']);
            var lStatus = findColIndex_(lh, ['Status']);
            var lPopId = findColIndex_(lh, ['POPID']);

            for (var lr = 0; lr < ledgerRows.length; lr++) {
              var lrow = ledgerRows[lr];
              var status = lStatus >= 0 ? String(lrow[lStatus] || '').toLowerCase() : 'active';
              if (status === 'deceased' || status === 'retired' || status === 'inactive') continue;

              var first = lFirst >= 0 ? (lrow[lFirst] || '').toString().trim() : '';
              var last = lLast >= 0 ? (lrow[lLast] || '').toString().trim() : '';
              var fullName = (first + ' ' + last).trim();
              if (!fullName) continue;

              var popId = lPopId >= 0 ? (lrow[lPopId] || '').toString().trim() : '';

              ctx._bondNameLookup[fullName] = {
                Name: fullName,
                Neighborhood: lNH >= 0 ? (lrow[lNH] || '').toString().trim() : '',
                TierRole: lTier >= 0 ? (lrow[lTier] || '').toString().trim() : '',
                UNI: lUNI >= 0 ? (lrow[lUNI] || '').toString().trim() : '',
                MED: lMED >= 0 ? (lrow[lMED] || '').toString().trim() : '',
                CIV: lCIV >= 0 ? (lrow[lCIV] || '').toString().trim() : '',
                Occupation: lOcc >= 0 ? (lrow[lOcc] || '').toString().trim() : ''
              };

              // v2.5: Build ID-to-name map
              if (popId) {
                ctx._bondIdToName[popId] = fullName;
              }
            }
            diagnostics.sources.push('Simulation_Ledger');
        }
      } catch (e2) {
        Logger.log('ensureBondEngineData_: Error loading Simulation_Ledger fallback - ' + e2.message);
      }
    }
  }

  diagnostics.citizenLookup = Object.keys(ctx._bondNameLookup).length;

  // ─────────────────────────────────────────────────────────────
  // v2.6 (Row 33 C121 follow-up): NORMALIZE THE POOL TO NAMES.
  // Producers publish S.cycleActiveCitizens as POPIDs
  // (generateCitizensEvents_ L235, runRelationshipEngine L583), but every
  // pair-metadata lookup in detectNewBonds_ is name-keyed — at C121 the
  // pool held 866 POPIDs, citizenData[popId] missed for all of them, and
  // 0 bonds formed from 374k pairs. Resolve into a bond-local pool
  // (never mutate the shared array — popId consumers read it downstream);
  // require lookup membership so unresolvable entries drop here, visibly.
  // ─────────────────────────────────────────────────────────────
  var rawPool = ctx.summary.cycleActiveCitizens || [];
  var seenPool = {};
  ctx._bondActivePool = [];
  for (var bp = 0; bp < rawPool.length; bp++) {
    var resolvedName = resolveCitizenName_(ctx, rawPool[bp]);
    if (resolvedName && ctx._bondNameLookup[resolvedName] && !seenPool[resolvedName]) {
      seenPool[resolvedName] = true;
      ctx._bondActivePool.push(resolvedName);
    }
  }

  // Deterministic shuffle (ctx.rng) — the detectNewBonds_ pair loop starts at
  // index 0 and the per-cycle cap is 2-4, so an unshuffled pool hands every
  // cycle's whole bond budget to the same first citizen (C122: all 6 bonds
  // were Brianna Lee's). Fisher-Yates spreads formation across the pool.
  var shuffleRng = safeRand_(ctx);
  for (var sh = ctx._bondActivePool.length - 1; sh > 0; sh--) {
    var sj = Math.floor(shuffleRng() * (sh + 1));
    var tmp = ctx._bondActivePool[sh];
    ctx._bondActivePool[sh] = ctx._bondActivePool[sj];
    ctx._bondActivePool[sj] = tmp;
  }
  diagnostics.bondPool = ctx._bondActivePool.length;

  // ─────────────────────────────────────────────────────────────
  // LOG DIAGNOSTICS
  // ─────────────────────────────────────────────────────────────
  Logger.log('ensureBondEngineData_ v2.6: ' +
    'activeCitizens=' + diagnostics.cycleActiveCitizens +
    ', bondPool=' + diagnostics.bondPool +
    ', citizenLookup=' + diagnostics.citizenLookup +
    ', sources=[' + diagnostics.sources.join(', ') + ']');

  // Need at least 2 resolvable citizens to form bonds
  return diagnostics.bondPool >= 2;
}


/**
 * Helper: Find column index from possible header names
 */
function findColIndex_(headers, possibleNames) {
  for (var i = 0; i < possibleNames.length; i++) {
    for (var j = 0; j < headers.length; j++) {
      if (headers[j] && headers[j].toString().toLowerCase() === possibleNames[i].toLowerCase()) {
        return j;
      }
    }
  }
  return -1;
}


// ============================================================
// BOND UPDATES
// ============================================================

// engine.59 diag-emit: one global the web trigger returns in its JSON —
// the fire response carries the why (clasp logs unavailable, no GCP project)
var ENGINE59_DIAG = null;

function updateExistingBonds_(ctx) {
  var rng = safeRand_(ctx);
  var S = ctx.summary || {};
  var bonds = ctx.summary.relationshipBonds || [];
  var currentCycle = S.cycleId || ctx.config.cycleCount || 0;

  // v2.2: Calendar context
  var cal = ctx.bondCalendarContext || {};
  var holiday = cal.holiday || 'none';
  var sportsSeason = cal.sportsSeason || 'off-season';
  var isFirstFriday = cal.isFirstFriday || false;
  var isCreationDay = cal.isCreationDay || false;

  // v2.6 (Row 33): bond rows store NAMES — membership must test the resolved
  // bond-local pool, not the POPID-shaped shared array (misses were silently
  // disabling activity-based intensity updates).
  var activeCitizensArray = ctx._bondActivePool || S.cycleActiveCitizens || [];
  ENGINE59_DIAG = {
    cycle: currentCycle,
    poolSize: activeCitizensArray.length,
    poolSample: activeCitizensArray.slice(0, 3),
    bonds: bonds.length,
    friendGrowths: 0,
    factors: []
  };
  var activeCitizens = {};
  for (var i = 0; i < activeCitizensArray.length; i++) {
    activeCitizens[activeCitizensArray[i]] = true;
    // S312 bond-key repair — bond rows are POPID-canonical now (normalizeBondCitizenId_
    // at makeBond_ + the persist boundary); key the membership map under BOTH shapes so
    // activity-based intensity updates keep firing (the exact miss Row 33 fixed).
    var poolPop = normalizeBondCitizenId_(ctx, activeCitizensArray[i]);
    if (poolPop && poolPop !== activeCitizensArray[i]) activeCitizens[poolPop] = true;
  }
  // engine.59 diag-emit: expose the gate — map shape vs bond-key shape vs enum
  ENGINE59_DIAG.mapKeys = Object.keys(activeCitizens).length;
  ENGINE59_DIAG.mapSample = Object.keys(activeCitizens).slice(0, 4);
  ENGINE59_DIAG.gatePass = 0;
  var e59fb = [];
  for (var e59i = 0; e59i < bonds.length && e59fb.length < 3; e59i++) {
    if (bonds[e59i] && bonds[e59i].bondType === BOND_TYPES.FRIENDSHIP) e59fb.push(bonds[e59i].citizenA + '>' + bonds[e59i].status);
  }
  ENGINE59_DIAG.friendBondSample = e59fb;
  ENGINE59_DIAG.enumFriendship = BOND_TYPES.FRIENDSHIP;

  // v2.4: Use ctx.neighborhoodList instead of global
  var neighborhoodList = ctx.neighborhoodList || [];

  for (var b = 0; b < bonds.length; b++) {
    var bond = bonds[b];
    if (!bond || bond.status === BOND_STATUS.RESOLVED || bond.status === BOND_STATUS.SEVERED) {
      continue;
    }

    var intensity = Number(bond.intensity) || 0;
    var priorIntensity = intensity;
    var priorStatus = bond.status;
    var priorType = bond.bondType;
    var bondAge = currentCycle - (bond.cycleCreated || currentCycle);

    var aActive = activeCitizens[bond.citizenA] || false;
    var bActive = activeCitizens[bond.citizenB] || false;

    if (aActive && bActive) {
      ENGINE59_DIAG.gatePass++;
      if (bond.bondType === BOND_TYPES.RIVALRY || bond.bondType === BOND_TYPES.TENSION) {
        intensity += 1.5;
      } else if (bond.bondType === BOND_TYPES.ALLIANCE) {
        intensity += 0.5;
      } else if (bond.bondType === BOND_TYPES.MENTORSHIP) {
        intensity += 0.3;
      } else if (bond.bondType === BOND_TYPES.FESTIVAL) {
        intensity += 0.3;
      } else if (bond.bondType === BOND_TYPES.SPORTS_RIVAL) {
        intensity += 1.0;
      } else if (bond.bondType === BOND_TYPES.FRIENDSHIP) {
        // engine.59 (S320): friendship had NO growth path — the romance
        // pipeline starved at the root (live max 5.6 vs threshold 7).
        // Warm citizens deepen faster (TraitProfile — Mike's dials).
        var wf59 = bondWarmthFactor_(ctx, bond.citizenA, bond.citizenB);
        ENGINE59_DIAG.friendGrowths++;
        if (ENGINE59_DIAG.factors.length < 5) ENGINE59_DIAG.factors.push(bond.citizenA + 'x' + bond.citizenB + ':' + wf59.toFixed(3));
        intensity += FRIENDSHIP_GROWTH * wf59;
      } else if (bond.bondType === BOND_TYPES.ROMANTIC) {
        intensity += ROMANTIC_GROWTH_ACTIVE;
      }
    }

    // engine.59: courting couples see each other whether or not the event
    // engine drew them this cycle — courtship is its own gravity.
    if (bond.bondType === BOND_TYPES.ROMANTIC && !(aActive && bActive)) {
      intensity += ROMANTIC_GROWTH_BASE;
    }

    if (S.cycleWeight === 'high-signal' && bond.bondType === BOND_TYPES.RIVALRY) {
      intensity += 0.5;
    }

    if (S.shockFlag && S.shockFlag !== 'none') {
      if (bond.bondType === BOND_TYPES.RIVALRY) {
        intensity += 1;
      } else if (bond.bondType === BOND_TYPES.ALLIANCE) {
        if (rng() < 0.2) intensity -= 0.5;
      }
    }

    var sentiment = 0;
    if (S.cityDynamics && typeof S.cityDynamics.sentiment === 'number') {
      sentiment = S.cityDynamics.sentiment;
    }
    if (sentiment <= -0.3 && bond.bondType === BOND_TYPES.TENSION) {
      intensity += 0.3;
    }
    if (sentiment >= 0.3 && bond.bondType === BOND_TYPES.ALLIANCE) {
      intensity += 0.2;
    }

    // ─────────────────────────────────────────────────────────────
    // v2.2: CALENDAR-BASED INTENSITY MODIFIERS
    // ─────────────────────────────────────────────────────────────

    // Festival bonds strengthen during festivals
    if (bond.bondType === BOND_TYPES.FESTIVAL && holiday !== 'none') {
      intensity += 0.5;
    }

    // Sports rivalries intensify during playoffs/championship
    if (bond.bondType === BOND_TYPES.SPORTS_RIVAL) {
      if (sportsSeason === 'championship') {
        intensity += 1.5;
      } else if (sportsSeason === 'playoffs') {
        intensity += 1.0;
      } else if (sportsSeason === 'late-season') {
        intensity += 0.5;
      }
    }

    // Neighbor bonds strengthen during family holidays
    var familyHolidays = ['Thanksgiving', 'Easter', 'Holiday', 'MothersDay', 'FathersDay'];
    if (bond.bondType === BOND_TYPES.NEIGHBOR && familyHolidays.indexOf(holiday) >= 0) {
      intensity += 0.5;
    }

    // Alliance bonds strengthen during community celebrations
    var communityHolidays = ['Juneteenth', 'MLKDay', 'OaklandPride', 'ArtSoulFestival'];
    if (bond.bondType === BOND_TYPES.ALLIANCE && communityHolidays.indexOf(holiday) >= 0) {
      intensity += 0.5;
    }

    // Professional bonds strengthen on First Friday (networking)
    if (bond.bondType === BOND_TYPES.PROFESSIONAL && isFirstFriday) {
      intensity += 0.3;
    }

    // Community bonds strengthen on Creation Day
    if ((bond.bondType === BOND_TYPES.NEIGHBOR || bond.bondType === BOND_TYPES.ALLIANCE) && isCreationDay) {
      intensity += 0.4;
    }

    // ─────────────────────────────────────────────────────────────
    // ARC PROXIMITY
    // ─────────────────────────────────────────────────────────────
    var arcA = getBondCitizenArc_(ctx, bond.citizenA);
    var arcB = getBondCitizenArc_(ctx, bond.citizenB);

    if (arcA && arcB && arcA.arcId === arcB.arcId) {
      intensity += 0.5;
      if (arcA.phase === 'peak') {
        intensity += 0.5;
      }
    }

    // v2.4 FIX: Neighbor bonds WITHOUT neighborhood should decay (was backwards)
    if (!bond.neighborhood && bond.bondType === BOND_TYPES.NEIGHBOR) {
      intensity -= 0.1;
    }

    if (!aActive && !bActive) {
      intensity -= 0.2;
    }

    if (bondAge > 15 && (currentCycle - (bond.lastUpdate || 0)) > 5) {
      intensity -= 0.5;
    }

    // v2.2: Festival bonds decay faster outside festivals
    if (bond.bondType === BOND_TYPES.FESTIVAL && holiday === 'none') {
      intensity -= 0.3;
    }

    // v2.2: Sports rivalries decay in off-season
    if (bond.bondType === BOND_TYPES.SPORTS_RIVAL && sportsSeason === 'off-season') {
      intensity -= 0.4;
    }

    if (intensity < 0) intensity = 0;
    if (intensity > 10) intensity = 10;

    bond.intensity = Math.round(intensity * 100) / 100;

    if (intensity <= 1 && bond.status === BOND_STATUS.ACTIVE) {
      bond.status = BOND_STATUS.DORMANT;
    } else if (intensity >= 3 && bond.status === BOND_STATUS.DORMANT) {
      bond.status = BOND_STATUS.ACTIVE;
    }

    if (bond.bondType === BOND_TYPES.TENSION) {
      if (intensity >= 6) {
        bond.bondType = BOND_TYPES.RIVALRY;
        bond.notes = (bond.notes || '') + ' [Escalated to rivalry C' + currentCycle + ']';
      } else if (intensity <= 2 && bondAge > 3) {
        bond.bondType = BOND_TYPES.PROFESSIONAL;
        bond.notes = (bond.notes || '') + ' [Settled into professional respect C' + currentCycle + ']';
      }
    }

    // v2.7: Only stamp lastUpdate for meaningful changes — prevents ledger bloat.
    // Routine intensity ticks still apply to master state (Relationship_Bonds)
    // but only status changes, type changes, or large intensity shifts get logged.
    var intensityDelta = Math.abs(bond.intensity - priorIntensity);
    if (bond.status !== priorStatus || bond.bondType !== priorType || intensityDelta >= 2.0) {
      bond.lastUpdate = currentCycle;
    }
  }
}


// ============================================================
// NEW BOND DETECTION
// ============================================================

function detectNewBonds_(ctx) {
  var rng = safeRand_(ctx);
  var S = ctx.summary || {};
  var currentCycle = S.cycleId || ctx.config.cycleCount || 0;
  var newBonds = [];

  // v2.6 (Row 33): read the name-resolved bond-local pool — the shared array
  // carries POPIDs, which miss every name-keyed metadata lookup below.
  var activeCitizens = ctx._bondActivePool || S.cycleActiveCitizens || [];
  if (activeCitizens.length < 2) {
    Logger.log('detectNewBonds_: Less than 2 active citizens, skipping');
    return newBonds;
  }

  var citizenData = ctx._bondNameLookup || {};

  // v2.4: Use ctx.neighborhoodList instead of global
  var neighborhoodList = ctx.neighborhoodList || [];

  // v2.2: Calendar context
  var cal = ctx.bondCalendarContext || {};
  var holiday = cal.holiday || 'none';
  var holidayPriority = cal.holidayPriority || 'none';
  var sportsSeason = cal.sportsSeason || 'off-season';
  var isFirstFriday = cal.isFirstFriday || false;
  var isCreationDay = cal.isCreationDay || false;

  // v2.2: Adjust max bonds based on calendar
  var maxNewBonds = 2;
  if (holiday !== 'none' && (holidayPriority === 'oakland' || holidayPriority === 'major')) {
    maxNewBonds = 4; // More bonds form during major celebrations
  }
  if (isFirstFriday) {
    maxNewBonds = Math.max(maxNewBonds, 3);
  }
  if (sportsSeason === 'championship') {
    maxNewBonds = Math.max(maxNewBonds, 3);
  }

  var bondsCreated = 0;

  for (var i = 0; i < activeCitizens.length && bondsCreated < maxNewBonds; i++) {
    for (var j = i + 1; j < activeCitizens.length && bondsCreated < maxNewBonds; j++) {
      var citizenA = activeCitizens[i];
      var citizenB = activeCitizens[j];

      // v2.4: Use set lookup
      var key = getBondKey_(citizenA, citizenB);
      if (ctx._bondKeySet && ctx._bondKeySet[key]) continue;

      var dataA = citizenData[citizenA] || {};
      var dataB = citizenData[citizenB] || {};

      var sharedDomains = [];
      if ((dataA.UNI || '').toLowerCase().startsWith('y') && (dataB.UNI || '').toLowerCase().startsWith('y')) sharedDomains.push('UNI');
      if ((dataA.MED || '').toLowerCase().startsWith('y') && (dataB.MED || '').toLowerCase().startsWith('y')) sharedDomains.push('MED');
      if ((dataA.CIV || '').toLowerCase().startsWith('y') && (dataB.CIV || '').toLowerCase().startsWith('y')) sharedDomains.push('CIV');

      var sameTier = dataA.TierRole && dataA.TierRole === dataB.TierRole;

      var nhA = dataA.Neighborhood || '';
      var nhB = dataB.Neighborhood || '';
      var sameNeighborhood = nhA && nhA === nhB && neighborhoodList.indexOf(nhA) >= 0;

      // ─────────────────────────────────────────────────────────────
      // v2.2/v2.4: CALENDAR-SPECIFIC BOND DETECTION
      // ─────────────────────────────────────────────────────────────

      // v2.4 FIX: FESTIVAL BONDS only for holidays with mapped neighborhoods
      if (FESTIVAL_NEIGHBORHOODS[holiday] && (holidayPriority === 'oakland' || holidayPriority === 'major')) {
        var festivalHoods = FESTIVAL_NEIGHBORHOODS[holiday];
        var inFestivalZone = festivalHoods.indexOf(nhA) >= 0 || festivalHoods.indexOf(nhB) >= 0;

        if (inFestivalZone && rng() < 0.4) {
          newBonds.push(makeBond_(
            citizenA, citizenB,
            BOND_TYPES.FESTIVAL,
            BOND_ORIGINS.FESTIVAL_ENCOUNTER,
            'COMMUNITY',
            nhA || nhB || 'Downtown',
            4,
            currentCycle,
            'Met during ' + holiday + ' celebrations.',
            ctx
          ));
          bondsCreated++;
          continue;
        }
      }

      // SPORTS RIVALRIES during playoffs/championship
      if (sportsSeason === 'championship' || sportsSeason === 'playoffs') {
        var sportsHoods = ['Jack London', 'Downtown'];
        var inSportsZone = sportsHoods.indexOf(nhA) >= 0 || sportsHoods.indexOf(nhB) >= 0;

        if (inSportsZone && rng() < 0.3) {
          newBonds.push(makeBond_(
            citizenA, citizenB,
            BOND_TYPES.SPORTS_RIVAL,
            BOND_ORIGINS.SPORTS_SEASON,
            'SPORTS',
            nhA || nhB || 'Jack London',
            5,
            currentCycle,
            sportsSeason === 'championship' ? 'Championship rivalry sparked.' : 'Playoff debate turned heated.',
            ctx
          ));
          bondsCreated++;
          continue;
        }
      }

      // FIRST FRIDAY professional/creative bonds
      if (isFirstFriday) {
        var inArtsDistrict = ARTS_DISTRICT_NEIGHBORHOODS.indexOf(nhA) >= 0 ||
                           ARTS_DISTRICT_NEIGHBORHOODS.indexOf(nhB) >= 0;

        if (inArtsDistrict && rng() < 0.35) {
          newBonds.push(makeBond_(
            citizenA, citizenB,
            BOND_TYPES.PROFESSIONAL,
            BOND_ORIGINS.FIRST_FRIDAY,
            'CULTURE',
            nhA || nhB || 'Uptown',
            4,
            currentCycle,
            'Connected at First Friday gallery crawl.',
            ctx
          ));
          bondsCreated++;
          continue;
        }
      }

      // CREATION DAY community bonds
      if (isCreationDay && sameNeighborhood) {
        if (rng() < 0.35) {
          newBonds.push(makeBond_(
            citizenA, citizenB,
            BOND_TYPES.ALLIANCE,
            BOND_ORIGINS.CREATION_DAY,
            'COMMUNITY',
            nhA,
            4,
            currentCycle,
            'Bonded over Oakland heritage at Creation Day.',
            ctx
          ));
          bondsCreated++;
          continue;
        }
      }

      // HOLIDAY GATHERINGS boost neighbor bonds
      var familyHolidays = ['Thanksgiving', 'Holiday', 'Easter', 'MothersDay', 'FathersDay'];
      if (familyHolidays.indexOf(holiday) >= 0 && sameNeighborhood) {
        if (rng() < 0.35) {
          newBonds.push(makeBond_(
            citizenA, citizenB,
            BOND_TYPES.NEIGHBOR,
            BOND_ORIGINS.HOLIDAY_GATHERING,
            'COMMUNITY',
            nhA,
            4,
            currentCycle,
            'Connected during ' + holiday + ' neighborhood gathering.',
            ctx
          ));
          bondsCreated++;
          continue;
        }
      }

      // ─────────────────────────────────────────────────────────────
      // EXISTING BOND DETECTION (preserved from v2.1)
      // ─────────────────────────────────────────────────────────────

      // High overlap + same tier = rivalry potential
      if (sharedDomains.length >= 2 && sameTier) {
        newBonds.push(makeBond_(
          citizenA, citizenB,
          BOND_TYPES.TENSION,
          BOND_ORIGINS.CAREER_OVERLAP,
          sharedDomains.join('/'),
          sameNeighborhood ? nhA : '',
          4,
          currentCycle,
          'Competing in overlapping domains.',
          ctx
        ));
        bondsCreated++;
        continue;
      }

      // Same neighborhood = neighbor bond (reduced chance if calendar bonds took priority)
      if (sameNeighborhood && rng() < 0.2) {
        newBonds.push(makeBond_(
          citizenA, citizenB,
          BOND_TYPES.NEIGHBOR,
          BOND_ORIGINS.NEIGHBORHOOD,
          '',
          nhA,
          3,
          currentCycle,
          'Neighbors in ' + nhA + '.',
          ctx
        ));
        bondsCreated++;
        continue;
      }

      // Single shared domain = professional connection
      if (sharedDomains.length === 1 && rng() < 0.25) {
        newBonds.push(makeBond_(
          citizenA, citizenB,
          BOND_TYPES.PROFESSIONAL,
          BOND_ORIGINS.CAREER_OVERLAP,
          sharedDomains[0],
          sameNeighborhood ? nhA : '',
          3,
          currentCycle,
          'Colleagues in ' + sharedDomains[0] + ' sphere.',
          ctx
        ));
        bondsCreated++;
        continue;
      }

      // Arc-based bond detection
      var arcA = getBondCitizenArc_(ctx, citizenA);
      var arcB = getBondCitizenArc_(ctx, citizenB);

      if (arcA && arcB && arcA.arcId === arcB.arcId) {
        var bondType = arcA.type === 'rivalry' ? BOND_TYPES.RIVALRY : BOND_TYPES.ALLIANCE;
        newBonds.push(makeBond_(
          citizenA, citizenB,
          bondType,
          BOND_ORIGINS.ARC_PROXIMITY,
          arcA.domainTag || '',
          arcA.neighborhood || '',
          5,
          currentCycle,
          'Brought together by ' + arcA.type + ' arc in ' + (arcA.neighborhood || 'the city') + '.',
          ctx
        ));
        bondsCreated++;
        continue;
      }

      // Tier disparity = mentorship potential
      var tierA = parseTierLevel_(dataA.TierRole);
      var tierB = parseTierLevel_(dataB.TierRole);

      if (Math.abs(tierA - tierB) >= 2 && sharedDomains.length >= 1 && rng() < 0.15) {
        var mentor = tierA > tierB ? citizenA : citizenB;
        var protege = tierA > tierB ? citizenB : citizenA;
        newBonds.push(makeBond_(
          mentor, protege,
          BOND_TYPES.MENTORSHIP,
          BOND_ORIGINS.MENTOR_PROTEGE,
          sharedDomains[0],
          sameNeighborhood ? nhA : '',
          4,
          currentCycle,
          'Mentorship forming in ' + sharedDomains[0] + '.',
          ctx
        ));
        bondsCreated++;
      }
    }
  }

  Logger.log('detectNewBonds_ v2.4: Found ' + newBonds.length + ' potential bonds from ' + activeCitizens.length + ' active citizens (calendar: ' + holiday + ')');
  return newBonds;
}


// ============================================================
// CONFRONTATION TRIGGERS
// ============================================================

function checkConfrontationTriggers_(ctx) {
  var bonds = ctx.summary.relationshipBonds || [];
  var confrontations = [];
  var currentCycle = ctx.summary.cycleId || ctx.config.cycleCount || 0;

  // v2.2: Calendar context
  var cal = ctx.bondCalendarContext || {};
  var sportsSeason = cal.sportsSeason || 'off-season';

  for (var i = 0; i < bonds.length; i++) {
    var bond = bonds[i];
    if (!bond) continue;
    if (bond.bondType !== BOND_TYPES.RIVALRY && bond.bondType !== BOND_TYPES.SPORTS_RIVAL) continue;
    if (bond.status !== BOND_STATUS.ACTIVE) continue;

    // v2.2: Sports rivalries have lower confrontation threshold during championship
    var threshold = 8;
    if (bond.bondType === BOND_TYPES.SPORTS_RIVAL && sportsSeason === 'championship') {
      threshold = 6;
    }

    if (bond.intensity >= threshold) {
      confrontations.push({
        type: 'CONFRONTATION_EVENT',
        citizenA: bond.citizenA,
        citizenB: bond.citizenB,
        bondId: bond.bondId,
        intensity: bond.intensity,
        domain: bond.domainTag,
        neighborhood: bond.neighborhood || '',
        cycle: currentCycle,
        // v2.2: Calendar context
        sportsSeason: sportsSeason,
        bondType: bond.bondType
      });

      bond.notes = (bond.notes || '') + ' [Confrontation C' + currentCycle + ']';
      bond.intensity -= 2;

      // v2.4 FIX: Clamp intensity after reduction
      if (bond.intensity < 0) bond.intensity = 0;
      bond.intensity = Math.round(bond.intensity * 100) / 100;
    }
  }

  return confrontations;
}


// ============================================================
// ALLIANCE BENEFITS
// ============================================================

function applyAllianceBenefits_(ctx) {
  var bonds = ctx.summary.relationshipBonds || [];
  var allianceBenefits = {};

  for (var i = 0; i < bonds.length; i++) {
    var bond = bonds[i];
    if (!bond) continue;
    if (bond.bondType !== BOND_TYPES.ALLIANCE &&
        bond.bondType !== BOND_TYPES.MENTORSHIP &&
        bond.bondType !== BOND_TYPES.NEIGHBOR &&
        bond.bondType !== BOND_TYPES.FESTIVAL) continue;  // v2.2: Festival bonds give benefits
    if (bond.status !== BOND_STATUS.ACTIVE) continue;

    var boost = 1.0;
    if (bond.bondType === BOND_TYPES.MENTORSHIP) boost = 1.3;
    else if (bond.bondType === BOND_TYPES.ALLIANCE) boost = 1.2;
    else if (bond.bondType === BOND_TYPES.NEIGHBOR) boost = 1.1;
    else if (bond.bondType === BOND_TYPES.FESTIVAL) boost = 1.15;  // v2.2

    var citizens = [bond.citizenA, bond.citizenB];
    for (var c = 0; c < citizens.length; c++) {
      var citizen = citizens[c];
      if (!allianceBenefits[citizen]) {
        allianceBenefits[citizen] = { boost: 1.0, allies: [], neighbors: [], festivalFriends: [] };
      }
      allianceBenefits[citizen].boost *= boost;

      var other = citizen === bond.citizenA ? bond.citizenB : bond.citizenA;
      if (bond.bondType === BOND_TYPES.NEIGHBOR) {
        allianceBenefits[citizen].neighbors.push(other);
      } else if (bond.bondType === BOND_TYPES.FESTIVAL) {
        allianceBenefits[citizen].festivalFriends.push(other);
      } else {
        allianceBenefits[citizen].allies.push(other);
      }
    }
  }

  for (var citizen in allianceBenefits) {
    if (allianceBenefits.hasOwnProperty(citizen)) {
      if (allianceBenefits[citizen].boost > 2.0) {
        allianceBenefits[citizen].boost = 2.0;
      }
      allianceBenefits[citizen].boost = Math.round(allianceBenefits[citizen].boost * 100) / 100;
    }
  }

  ctx.summary.allianceBenefits = allianceBenefits;
}


// ============================================================
// BOND SUMMARY
// ============================================================

function generateBondSummary_(ctx) {
  var bonds = ctx.summary.relationshipBonds || [];
  var confrontations = ctx.summary.pendingConfrontations || [];

  // v2.2: Calendar context
  var cal = ctx.bondCalendarContext || {};

  var activeBonds = [];
  for (var i = 0; i < bonds.length; i++) {
    if (bonds[i] && bonds[i].status === BOND_STATUS.ACTIVE) {
      activeBonds.push(bonds[i]);
    }
  }

  var summary = {
    totalBonds: bonds.length,
    activeBonds: activeBonds.length,
    rivalries: 0,
    alliances: 0,
    tensions: 0,
    mentorships: 0,
    neighbors: 0,
    professional: 0,
    festival: 0,        // v2.2
    sportsRival: 0,     // v2.2
    pendingConfrontations: confrontations.length,
    highIntensityBonds: 0,
    hottestBonds: [],
    // v2.2: Calendar context
    calendarContext: {
      holiday: cal.holiday || 'none',
      holidayPriority: cal.holidayPriority || 'none',
      isFirstFriday: cal.isFirstFriday || false,
      isCreationDay: cal.isCreationDay || false,
      sportsSeason: cal.sportsSeason || 'off-season'
    }
  };

  for (var j = 0; j < activeBonds.length; j++) {
    var b = activeBonds[j];
    if (!b) continue;
    if (b.bondType === BOND_TYPES.RIVALRY) summary.rivalries++;
    if (b.bondType === BOND_TYPES.ALLIANCE) summary.alliances++;
    if (b.bondType === BOND_TYPES.TENSION) summary.tensions++;
    if (b.bondType === BOND_TYPES.MENTORSHIP) summary.mentorships++;
    if (b.bondType === BOND_TYPES.NEIGHBOR) summary.neighbors++;
    if (b.bondType === BOND_TYPES.PROFESSIONAL) summary.professional++;
    if (b.bondType === BOND_TYPES.FESTIVAL) summary.festival++;
    if (b.bondType === BOND_TYPES.SPORTS_RIVAL) summary.sportsRival++;
    if (b.intensity >= 7) summary.highIntensityBonds++;
  }

  var hottestBonds = [];
  for (var hb = 0; hb < activeBonds.length; hb++) {
    if (activeBonds[hb] && activeBonds[hb].intensity >= 5) {
      hottestBonds.push(activeBonds[hb]);
    }
  }
  hottestBonds.sort(function(a, b) { return b.intensity - a.intensity; });
  hottestBonds = hottestBonds.slice(0, 5);

  summary.hottestBonds = [];
  for (var hbi = 0; hbi < hottestBonds.length; hbi++) {
    var hbond = hottestBonds[hbi];
    if (!hbond) continue;
    summary.hottestBonds.push({
      citizens: hbond.citizenA + ' <-> ' + hbond.citizenB,
      type: hbond.bondType,
      intensity: hbond.intensity,
      neighborhood: hbond.neighborhood || '',
      origin: hbond.origin || ''  // v2.2: Include origin for calendar bonds
    });
  }

  ctx.summary.bondSummary = summary;
}


// ============================================================
// HELPER FUNCTIONS
// ============================================================

function makeBond_(citizenA, citizenB, bondType, origin, domainTag, neighborhood, intensity, cycle, notes, ctx) {
  var bond = {
    bondId: generateBondId_(ctx),
    cycleCreated: cycle,
    // S312 bond-key repair — POPID-canonical at creation (unique-name resolve via
    // shared ctx.ledger; unresolvable names pass through). Keeps getBondKey_ dedup
    // aligned with the POPID-keyed rows loaded from the sheet.
    citizenA: normalizeBondCitizenId_(ctx, citizenA),
    citizenB: normalizeBondCitizenId_(ctx, citizenB),
    bondType: bondType,
    intensity: intensity,
    origin: origin,
    domainTag: domainTag || '',
    neighborhood: neighborhood || '',
    status: BOND_STATUS.ACTIVE,
    lastUpdate: cycle,
    notes: notes || '',
    // v2.4: Calendar context stamped at creation
    holiday: 'none',
    holidayPriority: 'none',
    isFirstFriday: false,
    isCreationDay: false,
    sportsSeason: 'off-season'
  };

  // Stamp calendar context if available
  if (ctx && ctx.bondCalendarContext) {
    var cal = ctx.bondCalendarContext;
    bond.holiday = cal.holiday || 'none';
    bond.holidayPriority = cal.holidayPriority || 'none';
    bond.isFirstFriday = !!cal.isFirstFriday;
    bond.isCreationDay = !!cal.isCreationDay;
    bond.sportsSeason = cal.sportsSeason || 'off-season';
  }

  return bond;
}

function generateBondId_(ctx) {
  var rng = safeRand_(ctx);
  var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var id = '';
  for (var i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(rng() * chars.length));
  }
  return id;
}

function bondExists_(ctx, citizenA, citizenB) {
  // v2.4: Use set lookup if available
  if (ctx._bondKeySet) {
    var key = getBondKey_(citizenA, citizenB);
    return !!ctx._bondKeySet[key];
  }

  // Fallback to linear search
  var bonds = ctx.summary.relationshipBonds || [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && (
      (b.citizenA === citizenA && b.citizenB === citizenB) ||
      (b.citizenA === citizenB && b.citizenB === citizenA)
    )) {
      return true;
    }
  }
  return false;
}

// getCitizenBonds_ def deleted S199 (Phase B.5 collision dedup) —
// canonical impl lives in phase05-citizens/runRelationshipEngine.js (winner adds POPID normalization — strictly safer),
// resolved via Apps Script flat namespace.

function getRivalryIntensity_(ctx, citizenA, citizenB) {
  var bonds = ctx.summary.relationshipBonds || [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && (b.bondType === BOND_TYPES.RIVALRY || b.bondType === BOND_TYPES.SPORTS_RIVAL) &&
        ((b.citizenA === citizenA && b.citizenB === citizenB) ||
         (b.citizenA === citizenB && b.citizenB === citizenA))) {
      return b.intensity;
    }
  }
  return 0;
}

function parseTierLevel_(tierRole) {
  if (!tierRole) return 0;
  var match = tierRole.toString().match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function getBondCitizenArc_(ctx, citizenId) {
  var arcs = ctx.summary.eventArcs || [];

  for (var i = 0; i < arcs.length; i++) {
    var arc = arcs[i];
    if (!arc || arc.phase === 'resolved') continue;
    var involved = arc.involvedCitizens || [];
    for (var j = 0; j < involved.length; j++) {
      var c = involved[j];
      var cId = typeof c === 'string' ? c : (c.id || c.name || '');
      if (cId === citizenId) {
        return arc;
      }
    }
  }

  return null;
}

// getCombinedEventBoost_ def deleted S199 (Phase B.6 collision dedup) —
// canonical impl lives in phase05-citizens/runRelationshipEngine.js, resolved
// via Apps Script flat namespace. NOTE — divergence preserved for future
// audit: the runRelationshipEngine winner uses `citizenInActiveArc_` (object-
// only) instead of `getBondCitizenArc_` (string-or-object) and its phaseBoosts
// dict has 'mid' instead of 'rising' + adds 'resolved'=1.0. When bond infra
// is restored, validate which arc-phase taxonomy is canonical (rising vs mid
// — see processArcLifeCyclev1.js determinePhase_) and adjust the surviving
// def if needed.


// ============================================================
// RESOLUTION FUNCTIONS
// ============================================================

function resolveRivalry_(ctx, bondId, outcome) {
  var bonds = ctx.summary.relationshipBonds || [];
  var bond = null;
  for (var i = 0; i < bonds.length; i++) {
    if (bonds[i] && bonds[i].bondId === bondId) {
      bond = bonds[i];
      break;
    }
  }

  if (!bond) return;

  var currentCycle = ctx.summary.cycleId || ctx.config.cycleCount || 0;

  if (outcome === 'continued') {
    bond.intensity = 5;
    bond.notes += ' [Rivalry continues C' + currentCycle + ']';
  } else if (outcome === 'truce') {
    bond.bondType = BOND_TYPES.TENSION;
    bond.intensity = 3;
    bond.notes += ' [Uneasy truce C' + currentCycle + ']';
  } else if (outcome === 'alliance') {
    bond.bondType = BOND_TYPES.ALLIANCE;
    bond.intensity = 6;
    bond.notes += ' [Unexpected alliance C' + currentCycle + ']';
  } else if (outcome === 'severed') {
    bond.status = BOND_STATUS.SEVERED;
    bond.intensity = 0;
    bond.notes += ' [Bond severed C' + currentCycle + ']';
  }

  bond.lastUpdate = currentCycle;
}

// ════════════════════════════════════════════════════════════════════════════
// engine.57 P5 — ROMANCE, MARRIAGE, TRIANGLE HATE (physics, no quotas)
// ════════════════════════════════════════════════════════════════════════════

// Tuning constants — the world's biology, not its script. No output caps.
// (Mike's "dials" = the TraitProfile system; these are engine constants.)
// engine.59 S320 grounding: live friendship intensities ran 1-5.6 and the
// old threshold 7 was UNREACHABLE — friendship had no growth path at all.
// The organic romance pipeline had never fired once.
var ROMANCE_THRESHOLD = 5.5;  // top of the real distribution — slow, not never
var ROMANCE_CHANCE = 0.10;    // per-cycle base once conditions hold (× tier × fitness × family trait)
var MARRIAGE_THRESHOLD = 8;   // a romance grown this strong marries
var TRIANGLE_BIRTH_INTENSITY = 5; // rivals born from a shared love start here
var FRIENDSHIP_GROWTH = 0.4;  // engine.59: per-cycle when both co-active (× warmth trait)
var ROMANTIC_GROWTH_BASE = 0.3;   // engine.59: courting couples see each other regardless
var ROMANTIC_GROWTH_ACTIVE = 0.6; // engine.59: extra when both co-active
var GC_MARRY_CHANCE = 0.02;   // engine.59: lottery base per no-prospects single per cycle
var GC_POOL_REF = 60;         // engine.59: scarcity denominator (matches gen F-floor)
var GC_SPOUSE_INCOME = 48000; // engine.59: same rate as off-camera spouse pricing

function bondInWorldStamp_(cycle) {
  var y = Math.floor((cycle - 1) / 52) + 1;
  var c = ((cycle - 1) % 52) + 1;
  return 'Y' + y + 'C' + c;
}

// engine.59 fix (S320): signature had an unused popId param while every
// caller passes 5 args — tag/text/cycle each shifted one slot, so EVERY bond
// LifeHistory line printed mangled ('YNaNCNaN — [married X...] 104'). Latent
// since P5 shipped; surfaced by the first wedding ever fired (Hill, C104).
function appendBondLifeLine_(ctx, ledgerIdx, tag, text, cycle) {
  // ctx.ledger mutation (Phase 42 §5.6) — the citizen REMEMBERS the event;
  // wakes and interviews read LifeHistory, so this is what makes a bond real.
  var header = ctx.ledger.headers;
  var iLife = header.indexOf('LifeHistory');
  if (iLife < 0) return;
  var row = ctx.ledger.rows[ledgerIdx];
  if (!row) return;
  var line = bondInWorldStamp_(cycle) + ' — [' + tag + '] ' + text;
  row[iLife] = (row[iLife] ? row[iLife] + '\n' : '') + line;
  ctx.ledger.dirty = true;
}

// engine.59 (S320): TraitProfile parse — Mike's dials reaching bond physics.
// Format: Archetype:Striver|Mods:...|drive:79|sociability:60|warmth:74|...
function bondTraitOf_(ctx, popId, trait) {
  if (!ctx._bondTraits) {
    ctx._bondTraits = {};
    ctx._bondTraitStats = { hits: 0, misses: 0 };
    var header = ctx.ledger ? ctx.ledger.headers : null;
    if (header) {
      var iPop = -1, iTP = -1, iF = -1, iL = -1;
      for (var hh = 0; hh < header.length; hh++) {
        var hn = String(header[hh] || '').trim();
        if (hn === 'POPID') iPop = hh;
        else if (hn === 'TraitProfile') iTP = hh;
        else if (hn === 'First') iF = hh;
        else if (hn === 'Last') iL = hh;
      }
      if (iPop >= 0 && iTP >= 0) {
        for (var r = 0; r < ctx.ledger.rows.length; r++) {
          var tp = String(ctx.ledger.rows[r][iTP] || '');
          if (!tp) continue;
          // dual-key (S312 pattern): POPID + lowercase full name — bond rows
          // are POPID-canonical but defensive against any name-shaped stragglers
          ctx._bondTraits[String(ctx.ledger.rows[r][iPop]).trim().toUpperCase()] = tp;
          if (iF >= 0 && iL >= 0) {
            var nmKey = (String(ctx.ledger.rows[r][iF] || '').trim() + ' ' + String(ctx.ledger.rows[r][iL] || '').trim()).trim().toLowerCase();
            if (nmKey) ctx._bondTraits[nmKey] = tp;
          }
        }
      }
      Logger.log('engine.59 diag: trait map built, ' + Object.keys(ctx._bondTraits).length + ' keys');
    }
  }
  var key = String(popId || '').trim();
  var s = ctx._bondTraits[key.toUpperCase()] || ctx._bondTraits[key.toLowerCase()];
  if (!s) { ctx._bondTraitStats.misses++; return 50; } // neutral when unprofiled
  ctx._bondTraitStats.hits++;
  var m = s.match(new RegExp(trait + ':(\\d+)'));
  return m ? Number(m[1]) : 50;
}

// Pair warmth: 0.75x (cold pair) .. 1.25x (warm pair)
function bondWarmthFactor_(ctx, popA, popB) {
  var avg = (bondTraitOf_(ctx, popA, 'warmth') + bondTraitOf_(ctx, popB, 'warmth')) / 2;
  return 0.75 + (avg / 200);
}

// Pair family-mindedness: same band — courts and marries faster
function bondFamilyFactor_(ctx, popA, popB) {
  var avg = (bondTraitOf_(ctx, popA, 'family') + bondTraitOf_(ctx, popB, 'family')) / 2;
  return 0.75 + (avg / 200);
}

// engine.59 (S320): suitor fitness — education, savings, debt as courtship
// physics (Mike: "who gets a wife"). Clamp 0.6-1.4; nobody excluded, only paced.
function bondFitnessOf_(person) {
  var f = 1.0;
  var edu = String(person.edu || '').toLowerCase();
  if (edu === 'masters' || edu === 'doctorate') f += 0.15;
  else if (edu === 'bachelors') f += 0.08;
  if (person.savings >= 0.10) f += 0.10;
  else if (person.savings >= 0.05) f += 0.05;
  if (person.debt >= 5) f -= 0.15;
  else if (person.debt >= 3) f -= 0.05;
  return Math.max(0.6, Math.min(1.4, f));
}

function buildBondLedgerIndex_(ctx) {
  // POPID -> {idx, marital, gender, birthYear, householdId, income, name, hood,
  //           tier, edu, debt, savings} (engine.59 fields for the marriage market)
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var idx = function(n) { return header.indexOf(n); };
  var iPop = idx('POPID'), iFirst = idx('First'), iLast = idx('Last'),
      iMar = idx('MaritalStatus'), iGen = idx('Gender'), iBirth = idx('BirthYear'),
      iHH = idx('HouseholdId'), iInc = idx('Income'), iHood = idx('Neighborhood'),
      iStatus = idx('Status'), iTier = idx('Tier'), iEdu = idx('EducationLevel'),
      iDebt = idx('DebtLevel'), iSav = idx('SavingsRate');
  if (iPop < 0) return null;
  var map = {};
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var status = (row[iStatus] || 'active').toString().toLowerCase();
    if (status !== 'active') continue;
    map[row[iPop]] = {
      idx: r,
      name: ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(),
      marital: (row[iMar] || '').toString().toLowerCase().trim(),
      gender: iGen >= 0 ? (row[iGen] || '').toString().toLowerCase().trim() : '',
      birthYear: iBirth >= 0 ? (Number(row[iBirth]) || 0) : 0,
      householdId: iHH >= 0 ? String(row[iHH] || '').trim() : '',
      income: iInc >= 0 ? (Number(row[iInc]) || 0) : 0,
      hood: iHood >= 0 ? (row[iHood] || '') : '',
      tier: iTier >= 0 ? (Number(row[iTier]) || 4) : 4,
      edu: iEdu >= 0 ? String(row[iEdu] || '').trim() : '',
      debt: iDebt >= 0 ? (Number(row[iDebt]) || 0) : 0,
      savings: iSav >= 0 ? (Number(row[iSav]) || 0) : 0
    };
  }
  return map;
}

function processRomanceAndMarriage_(ctx) {
  if (!ctx.ledger || !ctx.ledger.rows || !ctx.ledger.rows.length) return;
  var rng = safeRand_(ctx);
  var cycle = ctx.summary.cycleId || ctx.config.cycleCount || 0;
  var simYear = 2040 + Math.floor(cycle / 52);
  var ageMin = (typeof AGE_RANGES !== 'undefined' && AGE_RANGES.WEDDING) ? AGE_RANGES.WEDDING.min : 20;
  var ageMax = (typeof AGE_RANGES !== 'undefined' && AGE_RANGES.WEDDING) ? AGE_RANGES.WEDDING.max : 65;
  var people = buildBondLedgerIndex_(ctx);
  if (!people) return;
  var bonds = ctx.summary.relationshipBonds || [];

  for (var b = 0; b < bonds.length; b++) {
    var bond = bonds[b];
    if (!bond || bond.status !== BOND_STATUS.ACTIVE) continue;
    var A = people[bond.citizenA], B = people[bond.citizenB];
    if (!A || !B) continue;

    var bothSingle = A.marital === 'single' && B.marital === 'single';
    var ageA = A.birthYear > 0 ? simYear - A.birthYear : 0;
    var ageB = B.birthYear > 0 ? simYear - B.birthYear : 0;
    var ageOk = ageA >= ageMin && ageA <= ageMax && ageB >= ageMin && ageB <= ageMax;
    var oppositeSex = A.gender && B.gender && A.gender !== B.gender;

    // ── Friendship deepens into romance (the only door into courtship) ──
    // engine.59 (S320, Mike-ruled): the flip chance carries the market —
    //   tierFactor: social orbit — T1×T1 rarest (0.25×), T4×T4 full speed;
    //     compounds with T1 scarcity (6M/1F singles) → super couples are rare
    //   fitness: education/savings/debt pace who courts (avg of the pair)
    //   family trait: family-minded citizens court harder (Mike's dials)
    var tierFactor = (A.tier + B.tier) / 8;
    var pairFitness = (bondFitnessOf_(A) + bondFitnessOf_(B)) / 2;
    if (bond.bondType === BOND_TYPES.FRIENDSHIP &&
        Number(bond.intensity) >= ROMANCE_THRESHOLD &&
        bothSingle && ageOk && oppositeSex &&
        rng() < ROMANCE_CHANCE * tierFactor * pairFitness * bondFamilyFactor_(ctx, bond.citizenA, bond.citizenB)) {
      bond.bondType = BOND_TYPES.ROMANTIC;
      bond.notes = 'Grew from friendship (C' + cycle + ')';
      bond.lastUpdate = cycle;
      appendBondLifeLine_(ctx, A.idx, 'Bond', 'something shifted with ' + B.name + ' — more than friends now', cycle);
      appendBondLifeLine_(ctx, B.idx, 'Bond', 'something shifted with ' + A.name + ' — more than friends now', cycle);
      ctx.summary.storyHooks = ctx.summary.storyHooks || [];
      ctx.summary.storyHooks.push({
        hookType: 'ROMANCE_BEGUN', severity: 3, priority: 3,
        description: A.name + ' and ' + B.name + ' — a friendship in ' + (bond.neighborhood || A.hood) + ' has turned into something more',
        cycleGenerated: cycle, neighborhood: bond.neighborhood || A.hood,
        domain: 'COMMUNITY', text: A.name + ' and ' + B.name + ' — a friendship turned into something more'
      });
      Logger.log('P5 romance: ' + bond.citizenA + ' <-> ' + bond.citizenB +
        ' (tier ' + A.tier + 'x' + B.tier + ' factor ' + tierFactor.toFixed(2) +
        ', fitness ' + pairFitness.toFixed(2) + ')');
      continue; // romance and marriage never happen the same cycle
    }

    // ── A grown romance marries. Period. (No caps — what matures, marries.)
    if (bond.bondType === BOND_TYPES.ROMANTIC &&
        Number(bond.intensity) >= MARRIAGE_THRESHOLD &&
        bothSingle && ageOk) {
      marryCitizens_(ctx, bond, A, B, cycle);
    }
  }
}

function marryCitizens_(ctx, bond, A, B, cycle) {
  var header = ctx.ledger.headers;
  var idx = function(n) { return header.indexOf(n); };
  var iMar = idx('MaritalStatus'), iSp = idx('SpouseId'), iHH = idx('HouseholdId');

  // Both rows: married + SpouseId (name beside ID — the sheet reads human)
  if (iMar >= 0) {
    ctx.ledger.rows[A.idx][iMar] = 'married';
    ctx.ledger.rows[B.idx][iMar] = 'married';
  }
  if (iSp >= 0) { // column exists on sandbox; prod no-ops until rollout rename
    ctx.ledger.rows[A.idx][iSp] = bond.citizenB + ' ' + B.name;
    ctx.ledger.rows[B.idx][iSp] = bond.citizenA + ' ' + A.name;
  }

  // engine.59 fix (S320, Jessup C108): if either partner already heads a
  // household with OTHER members (their kids), the marriage JOINS that
  // household — forming a fresh couple household abandoned Arjun (12) alone
  // in the family home while dad moved out. Spouse moves in; the P8 two-type
  // rule retypes it 'family' on the next pass; new spouse becomes a second
  // parent to resident minors (same convention as the S320 spouse drip).
  var joinTarget = null, joiner = null;
  var hhSheet0 = ctx.ss.getSheetByName('Household_Ledger');
  if (hhSheet0) {
    var hv = hhSheet0.getDataRange().getValues();
    var hj = function(n) { return hv[0].indexOf(n); };
    var findHH = function(hid) {
      if (!hid) return null;
      for (var q = 1; q < hv.length; q++) {
        if (String(hv[q][hj('HouseholdId')]) === hid && String(hv[q][hj('Status')] || '').toLowerCase() === 'active') {
          var mem0 = []; try { mem0 = JSON.parse(hv[q][hj('Members')] || '[]'); } catch (e0) {}
          return { row: q + 1, members: mem0 };
        }
      }
      return null;
    };
    var aHH = findHH(A.householdId), bHH = findHH(B.householdId);
    if (aHH && aHH.members.length > 1) { joinTarget = { hid: A.householdId, info: aHH }; joiner = B; }
    else if (bHH && bHH.members.length > 1) { joinTarget = { hid: B.householdId, info: bHH }; joiner = A; }
  }
  if (joinTarget) {
    var jm = joinTarget.info.members;
    var joinerId = (joiner === A) ? bond.citizenA : bond.citizenB;
    if (jm.indexOf(joinerId) < 0) jm.push(joinerId);
    hhSheet0.getRange(joinTarget.info.row, hv[0].indexOf('Members') + 1).setValue(JSON.stringify(jm));
    var iHH0 = idx('HouseholdId');
    if (iHH0 >= 0) ctx.ledger.rows[joiner.idx][iHH0] = joinTarget.hid;
    // resident minors gain the new spouse as second parent (drip convention)
    var iPar0 = idx('ParentIds'), iBirth0 = idx('BirthYear');
    if (iPar0 >= 0) {
      var cyc0 = ctx.summary.cycleId || ctx.config.cycleCount || 0;
      var simY0 = 2040 + Math.floor(cyc0 / 52);
      for (var mri = 0; mri < ctx.ledger.rows.length; mri++) {
        var mrow = ctx.ledger.rows[mri];
        if (String(mrow[iHH0] || '').trim() !== joinTarget.hid) continue;
        var mby = iBirth0 >= 0 ? (Number(mrow[iBirth0]) || 0) : 0;
        if (!(mby > 0 && (simY0 - mby) < 18)) continue;
        var mpar = []; try { mpar = JSON.parse(mrow[iPar0] || '[]'); } catch (e1) {}
        if (!Array.isArray(mpar)) mpar = [];
        if (mpar.indexOf(joinerId) < 0) { mpar.push(joinerId); mrow[iPar0] = JSON.stringify(mpar); ctx.ledger.dirty = true; }
      }
    }
  }
  // Marriage FORMS the household (Mike's model) when neither partner brings
  // one with other members — header-resolved append so the row lands right
  // on both the 13-col sandbox and any older schema.
  var hhId = joinTarget ? joinTarget.hid
    : 'HH-' + String(cycle).padStart(4, '0') + '-M' + String(Math.floor(safeRand_(ctx)() * 900) + 100);
  // engine.59 (S320, Mike-ruled): T1×T1 / T1×T2 = super couple. The stamp is
  // the dynasty seed — pay, fame, and household consumers land with their
  // owning stages (money/fame); here it's the flag + the moment.
  var superCouple = (A.tier && B.tier) &&
    Math.min(A.tier, B.tier) === 1 && Math.max(A.tier, B.tier) <= 2;
  var ss = ctx.ss;
  var sheet = ss.getSheetByName('Household_Ledger');
  if (sheet && !joinTarget) { // join path updated the existing row above
    var hHead = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (superCouple && hHead.indexOf('SuperCouple') < 0) {
      // schema-setup carve-out — fires once per spreadsheet lifetime
      sheet.getRange(1, hHead.length + 1).setValue('SuperCouple');
      hHead.push('SuperCouple');
    }
    var vals = {
      HouseholdId: hhId, HeadOfHousehold: bond.citizenA, HouseholdType: 'couple',
      Members: JSON.stringify([bond.citizenA, bond.citizenB]),
      Neighborhood: A.hood, HousingType: 'rented',
      MonthlyRent: (typeof estimateRent_ === 'function') ? estimateRent_(A.hood) : 1700,
      HousingCost: 0, HouseholdIncome: A.income + B.income,
      FormedCycle: cycle, DissolvedCycle: '', Status: 'active', HouseholdSavings: 0,
      SuperCouple: superCouple ? 'yes' : ''
    };
    var newRow = [];
    for (var h = 0; h < hHead.length; h++) newRow.push(vals.hasOwnProperty(hHead[h]) ? vals[hHead[h]] : '');
    sheet.appendRow(newRow);
  }
  if (iHH >= 0) {
    ctx.ledger.rows[A.idx][iHH] = hhId;
    ctx.ledger.rows[B.idx][iHH] = hhId;
  }

  // Family register row (Mike's format, names beside IDs)
  var reg = ss.getSheetByName('Family_Relationships');
  if (reg) {
    var husband = A.gender === 'male' ? (bond.citizenA + ' ' + A.name) : (bond.citizenB + ' ' + B.name);
    var wife = A.gender === 'male' ? (bond.citizenB + ' ' + B.name) : (bond.citizenA + ' ' + A.name);
    reg.appendRow([hhId, husband, wife, 'married', cycle, 'active', '', '', '', '', '']);
  }

  // Memory + tag ([Wedding] keeps every legacy remarriage check honest)
  appendBondLifeLine_(ctx, A.idx, 'Wedding', 'married ' + B.name + '; a household begins in ' + A.hood, cycle);
  appendBondLifeLine_(ctx, B.idx, 'Wedding', 'married ' + A.name + '; a household begins in ' + A.hood, cycle);

  bond.notes = 'Married C' + cycle;
  bond.lastUpdate = cycle;

  ctx.summary.storyHooks = ctx.summary.storyHooks || [];
  ctx.summary.storyHooks.push({
    hookType: superCouple ? 'SUPER_COUPLE_MARRIED' : 'CITIZEN_MARRIED',
    severity: superCouple ? 7 : 5, priority: superCouple ? 5 : 4,
    description: superCouple
      ? A.name + ' and ' + B.name + ' married in ' + A.hood + ' — two of the city\'s biggest names, one household. Oakland notices.'
      : A.name + ' and ' + B.name + ' married in ' + A.hood + ' — a new household forms',
    cycleGenerated: cycle, neighborhood: A.hood,
    domain: 'COMMUNITY', text: A.name + ' and ' + B.name + ' married in ' + A.hood
  });
  Logger.log('P5 MARRIAGE: ' + bond.citizenA + ' + ' + bond.citizenB + ' -> ' + hhId + (superCouple ? ' [SUPER COUPLE]' : ''));
}

// ════════════════════════════════════════════════════════════════════════════
// engine.59 (S320, Mike-ruled) — GC MARRIAGE LOTTERY
// A single adult with no romantic prospects rolls per cycle against the
// Tier-5 waiting room: GC_MARRY_CHANCE × fitness × scarcity × family trait.
// Scarcity IS the lottery (29F vs 66 single men on live at design time);
// the female-first generator floor is the refill valve. Winner promotes a
// GC spouse (Tier 4 — "2 paths to becoming tier 4") and marries through
// the same marryCitizens_ every organic wedding uses.
// ════════════════════════════════════════════════════════════════════════════
function processGCMarriageLottery_(ctx) {
  if (!ctx.ledger || !ctx.ledger.rows || !ctx.ledger.rows.length) return;
  var rng = safeRand_(ctx);
  var cycle = ctx.summary.cycleId || ctx.config.cycleCount || 0;
  var simYear = 2040 + Math.floor(cycle / 52);
  var ageMin = (typeof AGE_RANGES !== 'undefined' && AGE_RANGES.WEDDING) ? AGE_RANGES.WEDDING.min : 20;
  var ageMax = (typeof AGE_RANGES !== 'undefined' && AGE_RANGES.WEDDING) ? AGE_RANGES.WEDDING.max : 65;
  var people = buildBondLedgerIndex_(ctx);
  if (!people) return;
  var bonds = ctx.summary.relationshipBonds || [];

  // Prospects map: anyone with an active romantic bond, or a friendship
  // close to the romance line, is NOT in the lottery — they have a life
  // brewing (the no-prospects proxy for the courtship drought).
  var hasProspects = {};
  for (var b = 0; b < bonds.length; b++) {
    var bd = bonds[b];
    if (!bd || bd.status !== BOND_STATUS.ACTIVE) continue;
    if (bd.bondType === BOND_TYPES.ROMANTIC ||
        (bd.bondType === BOND_TYPES.FRIENDSHIP && Number(bd.intensity) >= ROMANCE_THRESHOLD - 1)) {
      hasProspects[bd.citizenA] = true;
      hasProspects[bd.citizenB] = true;
    }
  }

  // GC pool by sex (Active only, needs Sex + adult age)
  var gcSheet = ctx.ss.getSheetByName('Generic_Citizens');
  if (!gcSheet) return;
  var gcVals = gcSheet.getDataRange().getValues();
  var gh = gcVals[0];
  var gI = function(n) { return gh.indexOf(n); };
  var gF = gI('First'), gL = gI('Last'), gSex = gI('Sex'), gStat = gI('Status'),
      gAge = gI('Age'), gBirth = gI('BirthYear'), gNbhd = gI('Neighborhood'), gOcc = gI('Occupation');
  if (gF < 0 || gSex < 0 || gStat < 0) return;
  var pool = { male: [], female: [] };
  for (var g = 1; g < gcVals.length; g++) {
    var gr = gcVals[g];
    if (String(gr[gStat] || '').toLowerCase() !== 'active') continue;
    var sx = String(gr[gSex] || '').toLowerCase();
    if (sx !== 'male' && sx !== 'female') continue;
    var ga = Number(gr[gAge]) || (Number(gr[gBirth]) ? simYear - Number(gr[gBirth]) : 0);
    if (ga < ageMin || ga > ageMax) continue;
    pool[sx].push({ sheetRow: g + 1, first: gr[gF], last: gr[gL], age: ga,
      nbhd: gNbhd >= 0 ? String(gr[gNbhd] || '').trim() : '', occ: gOcc >= 0 ? gr[gOcc] : '' });
  }

  // next POPID, counted once
  var header = ctx.ledger.headers;
  var iPop = header.indexOf('POPID');
  var maxN = 0;
  for (var r0 = 0; r0 < ctx.ledger.rows.length; r0++) {
    var mm = /^POP-(\d+)$/.exec(ctx.ledger.rows[r0][iPop] || '');
    if (mm && +mm[1] > maxN) maxN = +mm[1];
  }

  var idxCol = function(n) { return header.indexOf(n); };
  for (var pid in people) {
    var P = people[pid];
    if (P.marital !== 'single' || hasProspects[pid]) continue;
    var pAge = P.birthYear > 0 ? simYear - P.birthYear : 0;
    if (pAge < ageMin || pAge > ageMax) continue;
    if (!P.gender || (P.gender !== 'male' && P.gender !== 'female')) continue;
    var wantSex = P.gender === 'male' ? 'female' : 'male';
    var avail = pool[wantSex];
    if (!avail.length) continue;
    var scarcity = Math.min(1, avail.length / GC_POOL_REF);
    var chance = GC_MARRY_CHANCE * bondFitnessOf_(P) * scarcity *
      (0.75 + bondTraitOf_(ctx, pid, 'family') / 200);
    if (rng() >= chance) continue;

    // ── Winner: pick the spouse (age ±8 pref, nbhd pref) ──
    var cands = avail.filter(function(c) { return Math.abs(c.age - pAge) <= 8; });
    if (!cands.length) cands = avail;
    cands.sort(function(x, y) {
      var xs = (x.nbhd === P.hood ? 0 : 1), ys = (y.nbhd === P.hood ? 0 : 1);
      if (xs !== ys) return xs - ys;
      return Math.abs(x.age - pAge) - Math.abs(y.age - pAge);
    });
    var pick = cands[0];
    avail.splice(avail.indexOf(pick), 1);

    // Full SL row — Tier 4 entry (Mike: "2 paths to becoming tier 4"),
    // spouse takes the citizen's surname (S319/S320 drip convention).
    var spId = 'POP-' + String(++maxN).padStart(5, '0');
    var last = P.name.split(' ').slice(-1)[0] || '';
    var spName = pick.first + ' ' + last;
    var newRow = new Array(header.length).fill('');
    var setC = function(n, v) { var i2 = idxCol(n); if (i2 >= 0) newRow[i2] = v; };
    setC('POPID', spId); setC('First', pick.first); setC('Last', last);
    setC('Tier', 4); setC('RoleType', pick.occ || 'Service worker');
    setC('ClockMode', 'ENGINE'); setC('Status', 'Active');
    setC('BirthYear', simYear - pick.age); setC('OrginCity', 'Oakland');
    setC('Neighborhood', P.hood); setC('MaritalStatus', 'single'); // marryCitizens_ flips it
    setC('Income', GC_SPOUSE_INCOME); setC('Gender', wantSex);
    setC('UsageCount', 0);
    setC('LifeHistory', bondInWorldStamp_(cycle) + ' — [Family] The record catches up: met ' + P.name + ' in ' + P.hood + ', and stayed.');
    ctx.ledger.rows.push(newRow);
    ctx.ledger.dirty = true;
    gcSheet.getRange(pick.sheetRow, gStat + 1).setValue('Promoted');

    // Marry through the front door — bond first, then the same wedding
    // machinery every organic marriage uses (household, register, hooks).
    var B = {
      idx: ctx.ledger.rows.length - 1, name: spName, marital: 'single',
      gender: wantSex, birthYear: simYear - pick.age, householdId: '',
      income: GC_SPOUSE_INCOME, hood: P.hood, tier: 4, edu: '', debt: 0, savings: 0
    };
    var lotteryBond = makeBond_(pid, spId, BOND_TYPES.ROMANTIC, 'gc-lottery', 'COMMUNITY',
      P.hood, MARRIAGE_THRESHOLD, cycle, 'Met outside the record (engine.59 lottery C' + cycle + ')', ctx);
    bonds.push(lotteryBond);
    ctx.summary.relationshipBonds = bonds;
    marryCitizens_(ctx, lotteryBond, P, B, cycle);
    Logger.log('engine.59 GC LOTTERY: ' + pid + ' (' + P.name + ') married ' + spId + ' (' + spName + ') — pool ' + wantSex + ' now ' + avail.length);
  }
}

function detectTriangleRivalries_(ctx) {
  // Two romances converging on one citizen breed a rivalry between the two
  // others — hate born from collision, not dice. (Broader hate sources —
  // envy, displacement grievance — are design-listed, not yet built.)
  var bonds = ctx.summary.relationshipBonds || [];
  var cycle = ctx.summary.cycleId || ctx.config.cycleCount || 0;
  var people = buildBondLedgerIndex_(ctx);
  if (!people) return;
  var romByCitizen = {};
  for (var b = 0; b < bonds.length; b++) {
    var bond = bonds[b];
    if (!bond || bond.bondType !== BOND_TYPES.ROMANTIC || bond.status !== BOND_STATUS.ACTIVE) continue;
    (romByCitizen[bond.citizenA] = romByCitizen[bond.citizenA] || []).push(bond.citizenB);
    (romByCitizen[bond.citizenB] = romByCitizen[bond.citizenB] || []).push(bond.citizenA);
  }
  for (var popId in romByCitizen) {
    var suitors = romByCitizen[popId];
    if (suitors.length < 2) continue;
    for (var i = 0; i < suitors.length - 1; i++) {
      for (var j = i + 1; j < suitors.length; j++) {
        if (bondExists_(ctx, suitors[i], suitors[j])) continue;
        var nb = createBond_(ctx, suitors[i], suitors[j], BOND_TYPES.RIVALRY,
          'romantic_triangle', '', (people[popId] || {}).hood || '',
          'Both drawn to ' + ((people[popId] || {}).name || popId));
        if (nb) {
          nb.intensity = TRIANGLE_BIRTH_INTENSITY;
          var si = people[suitors[i]], sj = people[suitors[j]];
          if (si) appendBondLifeLine_(ctx, si.idx, 'Bond', 'there is someone else circling ' + ((people[popId] || {}).name || 'them') + ' — and it stings', cycle);
          if (sj) appendBondLifeLine_(ctx, sj.idx, 'Bond', 'there is someone else circling ' + ((people[popId] || {}).name || 'them') + ' — and it stings', cycle);
          Logger.log('P5 triangle rivalry: ' + suitors[i] + ' <-> ' + suitors[j] + ' over ' + popId);
        }
      }
    }
  }
}

function createBond_(ctx, citizenA, citizenB, bondType, origin, domainTag, neighborhood, notes) {
  var currentCycle = ctx.summary.cycleId || ctx.config.cycleCount || 0;

  if (bondExists_(ctx, citizenA, citizenB)) {
    return null;
  }

  var bond = makeBond_(
    citizenA, citizenB,
    bondType,
    origin,
    domainTag,
    neighborhood,
    3,
    currentCycle,
    notes,
    ctx
  );

  ctx.summary.relationshipBonds = ctx.summary.relationshipBonds || [];
  ctx.summary.relationshipBonds.push(bond);

  // v2.4: Update set if it exists
  if (ctx._bondKeySet) {
    var key = getBondKey_(citizenA, citizenB);
    ctx._bondKeySet[key] = true;
  }

  return bond;
}


// ============================================================
// LEDGER WRITER (v2.2: with calendar columns)
// ============================================================

function saveV3BondsToLedger_(ctx) {
  var ss = ctx.ss;
  var bonds = ctx.summary.relationshipBonds || [];

  if (!bonds.length) {
    Logger.log('saveV3BondsToLedger_: No bonds to write');
    return;
  }

  // v2.2: Expanded headers with calendar columns
  var headers = [
    'Timestamp', 'Cycle', 'BondId', 'CitizenA', 'CitizenB',
    'BondType', 'Intensity', 'Status', 'Origin', 'DomainTag',
    'Neighborhood', 'CycleCreated', 'LastUpdate', 'Notes',
    'Holiday', 'HolidayPriority', 'FirstFriday', 'CreationDay', 'SportsSeason'
  ];

  // v2.4: Write to Relationship_Bond_Ledger (not Relationship_Bonds - that's master state)
  // S229 engine.2 §3.5 B3 carve-out — `else` fallback removed per fail-loud
  // discipline (ADR-0006 Contract B family). `ensureSheet_` is defined in
  // utilities/utilityFunctions.js:64 and called by 12 sites across the engine;
  // if the helper genuinely failed to load that's a systemic infrastructure
  // failure, not a per-call defensive concern. The old fallback would silently
  // lazy-create the sheet via inline `insertSheet + appendRow + setFrozenRows`,
  // hiding the deeper utilities-not-loaded bug + duplicating the schema-setup
  // path in a single file. Throw surfaces the real condition.
  if (typeof ensureSheet_ !== 'function') {
    throw new Error(
      'saveV3BondsToLedger_: ensureSheet_ helper missing — utilities/utilityFunctions.js failed to load. ' +
      '12 engine call sites depend on this helper; surface the load failure rather than silently shimming.'
    );
  }
  var sheet = ensureSheet_(ss, 'Relationship_Bond_Ledger', headers);

  var cycle = ctx.config.cycleCount || ctx.summary.cycleId || 0;
  var now = inWorldStamp_(ctx); // S290 in-world, not wall-clock (engine.44)

  // v2.2: Calendar context
  var cal = ctx.bondCalendarContext || {};

  var updatedBonds = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.lastUpdate === cycle) {
      updatedBonds.push(b);
    }
  }

  if (!updatedBonds.length) {
    Logger.log('saveV3BondsToLedger_: No bonds updated this cycle');
    return;
  }

  var rows = [];
  for (var j = 0; j < updatedBonds.length; j++) {
    var bond = updatedBonds[j];
    rows.push([
      now,
      cycle,
      bond.bondId || '',
      bond.citizenA || '',
      bond.citizenB || '',
      bond.bondType || '',
      bond.intensity || 0,
      bond.status || '',
      bond.origin || '',
      bond.domainTag || '',
      bond.neighborhood || '',
      bond.cycleCreated || '',
      bond.lastUpdate || '',
      bond.notes || '',
      // v2.2: Calendar columns
      cal.holiday || 'none',
      cal.holidayPriority || 'none',
      cal.isFirstFriday || false,
      cal.isCreationDay || false,
      cal.sportsSeason || 'off-season'
    ]);
  }

  var startRow = Math.max(sheet.getLastRow() + 1, 2);
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);

  Logger.log('saveV3BondsToLedger_ v2.4: Wrote ' + rows.length + ' bond(s) for Cycle ' + cycle);
}


// ============================================================
// DIAGNOSTIC FUNCTION
// ============================================================

function diagnoseBondEngine() {
  var ss = openSimSpreadsheet_(); // v2.14: Use configured spreadsheet ID

  Logger.log('=== BOND ENGINE DIAGNOSTIC v2.4 ===');

  // Check Citizen_Directory
  var dirSheet = ss.getSheetByName('Citizen_Directory');
  if (dirSheet) {
    var data = dirSheet.getDataRange().getValues();
    Logger.log('Citizen_Directory: ' + (data.length - 1) + ' citizens');
    Logger.log('Headers: ' + data[0].join(', '));
  } else {
    Logger.log('Citizen_Directory: NOT FOUND');
  }

  // Check Relationship_Bonds
  var bondSheet = ss.getSheetByName('Relationship_Bonds');
  if (bondSheet) {
    var bondData = bondSheet.getDataRange().getValues();
    Logger.log('Relationship_Bonds: ' + (bondData.length - 1) + ' rows');

    // v2.2: Count bond types
    var typeCounts = {};
    for (var i = 1; i < bondData.length; i++) {
      var type = bondData[i][5] || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    }
    Logger.log('Bond types: ' + JSON.stringify(typeCounts));
  } else {
    Logger.log('Relationship_Bonds: NOT FOUND');
  }

  // Check for citizens with domain tags
  if (dirSheet) {
    var headers = dirSheet.getDataRange().getValues()[0];
    var hasUNI = headers.indexOf('UNI') >= 0;
    var hasMED = headers.indexOf('MED') >= 0;
    var hasCIV = headers.indexOf('CIV') >= 0;
    var hasNH = headers.indexOf('Neighborhood') >= 0 || headers.indexOf('NH') >= 0;

    Logger.log('Domain columns: UNI=' + hasUNI + ', MED=' + hasMED + ', CIV=' + hasCIV + ', Neighborhood=' + hasNH);
  }

  Logger.log('=== END DIAGNOSTIC ===');
}


/**
 * ============================================================================
 * BOND ENGINE REFERENCE v2.6
 * ============================================================================
 *
 * v2.6 FIXES:
 * - All Math.random() replaced with ctx.rng for deterministic randomness
 * - generateBondId_ now accepts ctx for deterministic ID generation
 *
 * v2.5 FIXES:
 * - Simulation_Ledger fallback for citizenLookup when Citizen_Directory missing
 * - ctx._bondIdToName map for POPID→Name resolution
 *
 * v2.4 FIXES:
 * - Citizen name/id resolver handles mixed sources
 * - Neighbor decay condition corrected (decays when neighborhood MISSING)
 * - Confrontation intensity clamped after -2 reduction
 * - bondExists_ optimized with O(1) set lookup
 * - Festival bonds only for holidays with FESTIVAL_NEIGHBORHOODS mapping
 * - Neighborhoods stored on ctx.neighborhoodList (thread-safe)
 * - Cache header lookup defensive
 *
 * BOND TYPES:
 * - rivalry, alliance, tension, mentorship, romantic, professional
 * - neighbor, festival (v2.2), sports_rival (v2.2)
 *
 * BOND ORIGINS:
 * - career_overlap, neighborhood, romantic_triangle, ideological
 * - mentor_protege, random_encounter, arc_proximity, domain_cluster
 * - festival_encounter, holiday_gathering, sports_season (v2.2)
 * - first_friday, creation_day, parade_proximity (v2.2)
 *
 * CALENDAR-BASED BOND FORMATION:
 *
 * | Context | Bond Type | Neighborhood | Chance |
 * |---------|-----------|--------------|--------|
 * | Oakland/Major holiday (with mapping) | festival | Festival zone | 40% |
 * | Championship/Playoffs | sports_rival | Jack London/Downtown | 30% |
 * | First Friday | professional | Arts district | 35% |
 * | Creation Day | alliance | Same neighborhood | 35% |
 * | Family holidays | neighbor | Same neighborhood | 35% |
 *
 * CALENDAR-BASED INTENSITY MODIFIERS:
 * - Festival bonds +0.5 during holidays
 * - Sports rivalries +1.5 championship, +1.0 playoffs
 * - Neighbor bonds +0.5 during family holidays
 * - Alliance bonds +0.5 during community holidays
 * - Professional bonds +0.3 on First Friday
 * - Community bonds +0.4 on Creation Day
 *
 * LEDGER COLUMNS (19):
 * Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity,
 * Status, Origin, DomainTag, Neighborhood, CycleCreated, LastUpdate, Notes,
 * Holiday, HolidayPriority, FirstFriday, CreationDay, SportsSeason
 *
 * ============================================================================
 */
