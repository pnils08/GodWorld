/**
 * ============================================================================
 * BOND PERSISTENCE v2.3 - Write-Intent Based
 * ============================================================================
 *
 * Handles loading and saving relationship bonds to/from sheet storage.
 * Works with Bond Engine v2.4 to maintain bonds across cycles.
 *
 * v2.3 Changes:
 * - saveRelationshipBonds_ uses queueReplaceIntent_ for V3 write-intents
 * - Full dryRun/replay mode support
 * - Loading unchanged (reads don't need intents)
 *
 * v2.2 Fixes (preserved):
 * - ES5 compatible (var instead of const/let, no arrow functions)
 * - sheet.clear() replaced with clearContent() (preserves formatting)
 * - asBool_() helper for robust boolean parsing from sheets
 * - Schema collision guard: detects ledger schema to prevent corruption
 * - upgradeBondSheetSchema_ bails if sheet looks like ledger
 * - purgeInactiveBonds_ bondAge calculation fixed
 *
 * v2.1 Enhancements (preserved):
 * - Calendar columns (Holiday, HolidayPriority, FirstFriday, CreationDay, SportsSeason)
 * - Load calendar context from storage
 * - Save calendar context to storage
 * - Calendar-aware query utilities
 * - Aligned with GodWorld Calendar v1.0
 *
 * Previous features (v2.0):
 * - Load/save bonds to Relationship_Bonds sheet
 * - Purge inactive bonds
 * - Citizen/neighborhood queries
 *
 * Sheets used:
 * - Relationship_Bonds (master state - creates if missing, 17 cols)
 * - Relationship_Bond_Ledger (historical log - handled by saveV3BondsToLedger_)
 *
 * ============================================================================
 */


// ═══════════════════════════════════════════════════════════════
// SHEET HEADERS (v2.1: with calendar columns)
// ═══════════════════════════════════════════════════════════════

var BOND_SHEET_HEADERS = [
  'BondId',
  'CitizenA',
  'CitizenB',
  'BondType',
  'Intensity',
  'Status',
  'Origin',
  'DomainTag',
  'Neighborhood',
  'CycleCreated',
  'LastUpdate',
  'Notes',
  // v2.1: Calendar columns
  'Holiday',
  'HolidayPriority',
  'FirstFriday',
  'CreationDay',
  'SportsSeason'
];


// ═══════════════════════════════════════════════════════════════
// v2.2: HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Robust boolean parsing from sheet values.
 * Handles: true, false, "TRUE", "FALSE", "true", "false", 1, 0, "1", "0", "y", "yes"
 */
function asBool_(v) {
  if (v === true || v === false) return v;
  var s = (v || '').toString().trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'y' || s === 'yes';
}

/**
 * Check if sheet appears to be ledger schema (has Timestamp/Cycle columns).
 * Used to prevent schema collision between master state and ledger.
 */
function isLedgerSchema_(headers) {
  for (var i = 0; i < headers.length; i++) {
    var h = (headers[i] || '').toString();
    if (h === 'Timestamp' || h === 'Cycle') {
      return true;
    }
  }
  return false;
}


// ═══════════════════════════════════════════════════════════════
// LOAD BONDS
// ═══════════════════════════════════════════════════════════════

/**
 * Load relationship bonds from storage into ctx.summary.relationshipBonds
 * Call this EARLY in your world cycle, before social engines run.
 */
function loadRelationshipBonds_(ctx) {
  var S = ctx.summary || {};
  var ss = ctx.ss;

  // Initialize the bonds array
  S.relationshipBonds = [];

  // Get or create the bonds sheet
  var sheet = ss.getSheetByName('Relationship_Bonds');
  if (!sheet) {
    sheet = ss.insertSheet('Relationship_Bonds');
    sheet.appendRow(BOND_SHEET_HEADERS);
    sheet.getRange(1, 1, 1, BOND_SHEET_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    ctx.summary = S;
    Logger.log('loadRelationshipBonds_ v2.2: Created new Relationship_Bonds sheet');
    return; // No bonds to load yet
  }

  // Read existing bonds
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    ctx.summary = S;
    Logger.log('loadRelationshipBonds_ v2.2: No bonds to load');
    return; // Only headers, no bonds
  }

  var headers = data[0];

  // v2.2: Guard against ledger schema collision
  if (isLedgerSchema_(headers)) {
    Logger.log('loadRelationshipBonds_ v2.2: Relationship_Bonds appears to be ledger schema (has Timestamp/Cycle); aborting load to prevent corruption');
    ctx.summary = S;
    return;
  }

  // Build column index map
  var col = {};
  for (var h = 0; h < headers.length; h++) {
    col[headers[h]] = h;
  }

  // Load bonds (skip inactive)
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var status = col['Status'] !== undefined ? row[col['Status']] : 'active';

    // Skip resolved/severed bonds
    if (status === 'resolved' || status === 'severed') continue;

    var bond = {
      bondId: col['BondId'] !== undefined ? row[col['BondId']] : 'bond_' + i,
      citizenA: col['CitizenA'] !== undefined ? row[col['CitizenA']] : '',
      citizenB: col['CitizenB'] !== undefined ? row[col['CitizenB']] : '',
      bondType: col['BondType'] !== undefined ? row[col['BondType']] : 'unknown',
      intensity: col['Intensity'] !== undefined ? Number(row[col['Intensity']]) || 5 : 5,
      status: status,
      origin: col['Origin'] !== undefined ? row[col['Origin']] : 'unknown',
      domainTag: col['DomainTag'] !== undefined ? row[col['DomainTag']] : '',
      neighborhood: col['Neighborhood'] !== undefined ? row[col['Neighborhood']] : '',
      cycleCreated: col['CycleCreated'] !== undefined ? row[col['CycleCreated']] : '',
      lastUpdate: col['LastUpdate'] !== undefined ? row[col['LastUpdate']] : '',
      notes: col['Notes'] !== undefined ? row[col['Notes']] : '',
      // v2.1/v2.2: Calendar context (with asBool_)
      holiday: col['Holiday'] !== undefined ? row[col['Holiday']] : 'none',
      holidayPriority: col['HolidayPriority'] !== undefined ? row[col['HolidayPriority']] : 'none',
      isFirstFriday: col['FirstFriday'] !== undefined ? asBool_(row[col['FirstFriday']]) : false,
      isCreationDay: col['CreationDay'] !== undefined ? asBool_(row[col['CreationDay']]) : false,
      sportsSeason: col['SportsSeason'] !== undefined ? row[col['SportsSeason']] : 'off-season'
    };

    S.relationshipBonds.push(bond);
  }

  ctx.summary = S;
  Logger.log('loadRelationshipBonds_ v2.2: Loaded ' + S.relationshipBonds.length + ' active bonds');
}


// ═══════════════════════════════════════════════════════════════
// SAVE BONDS
// ═══════════════════════════════════════════════════════════════

/**
 * Save relationship bonds from ctx.summary.relationshipBonds to sheet storage.
 * Call this at the END of your world cycle, after all bond processing.
 *
 * This REPLACES the entire sheet with current state (master record).
 * Historical changes are tracked by saveV3BondsToLedger_().
 *
 * v2.3: Uses queueReplaceIntent_ for V3 write-intents model.
 */
function saveRelationshipBonds_(ctx) {
  var S = ctx.summary || {};
  var ss = ctx.ss;
  var bonds = S.relationshipBonds || [];

  // Initialize persist context if needed
  if (!ctx.persist) {
    initializePersistContext_(ctx);
  }

  // Check for ledger schema collision (safety check)
  var sheet = ss.getSheetByName('Relationship_Bonds');
  if (sheet) {
    var lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      var existingHeaders = sheet.getRange(1, 1, 1, Math.min(lastCol, 5)).getValues()[0];
      if (isLedgerSchema_(existingHeaders)) {
        Logger.log('saveRelationshipBonds_ v2.3: Relationship_Bonds appears to be ledger schema; aborting save to prevent corruption');
        return;
      }
    }
  }

  var currentCycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;

  // Build all rows (starting with header)
  var allRows = [BOND_SHEET_HEADERS];

  for (var i = 0; i < bonds.length; i++) {
    var bond = bonds[i];
    allRows.push([
      bond.bondId || '',
      bond.citizenA || '',
      bond.citizenB || '',
      bond.bondType || 'unknown',
      bond.intensity || 0,
      bond.status || 'active',
      bond.origin || 'unknown',
      bond.domainTag || '',
      bond.neighborhood || '',
      bond.cycleCreated || currentCycle,
      bond.lastUpdate || currentCycle,
      bond.notes || '',
      // v2.1: Calendar columns
      bond.holiday || 'none',
      bond.holidayPriority || 'none',
      bond.isFirstFriday || false,
      bond.isCreationDay || false,
      bond.sportsSeason || 'off-season'
    ]);
  }

  // Queue replace intent (clears and writes all data)
  queueReplaceIntent_(
    ctx,
    'Relationship_Bonds',
    allRows,
    'Save ' + bonds.length + ' relationship bonds (master state)',
    'citizens',
    50  // Replace ops run first
  );

  Logger.log('saveRelationshipBonds_ v2.3: Queued ' + bonds.length + ' bonds for save');
}


// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get bond count by type (for diagnostics).
 */
function getBondCounts_(ctx) {
  var bonds = ctx.summary.relationshipBonds || [];
  var counts = {
    total: bonds.length,
    active: 0,
    dormant: 0,
    resolved: 0,
    severed: 0,
    byType: {},
    // v2.1: Calendar counts
    byHoliday: {},
    firstFridayBonds: 0,
    creationDayBonds: 0,
    bySportsSeason: {}
  };

  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (!b) continue;

    // Count by status
    if (b.status === 'active') counts.active++;
    else if (b.status === 'dormant') counts.dormant++;
    else if (b.status === 'resolved') counts.resolved++;
    else if (b.status === 'severed') counts.severed++;

    // Count by type
    var type = b.bondType || 'unknown';
    counts.byType[type] = (counts.byType[type] || 0) + 1;

    // v2.1: Count by calendar context
    if (b.holiday && b.holiday !== 'none') {
      counts.byHoliday[b.holiday] = (counts.byHoliday[b.holiday] || 0) + 1;
    }
    if (b.isFirstFriday) counts.firstFridayBonds++;
    if (b.isCreationDay) counts.creationDayBonds++;
    if (b.sportsSeason && b.sportsSeason !== 'off-season') {
      counts.bySportsSeason[b.sportsSeason] = (counts.bySportsSeason[b.sportsSeason] || 0) + 1;
    }
  }

  return counts;
}


/**
 * Purge old resolved/severed bonds to prevent sheet bloat.
 * Call periodically (e.g., every 20 cycles).
 */
function purgeInactiveBonds_(ctx, maxAge) {
  var S = ctx.summary || {};
  var currentCycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;
  var bonds = S.relationshipBonds || [];
  var age = maxAge || 50; // Default: purge bonds inactive for 50+ cycles

  var beforeCount = bonds.length;

  var filtered = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (!b) continue;

    // Keep active and dormant bonds
    if (b.status === 'active' || b.status === 'dormant') {
      filtered.push(b);
      continue;
    }

    // v2.2: Safer bondAge calculation
    var lastUpdate = Number(b.lastUpdate || b.cycleCreated || 0) || 0;
    var bondAge = currentCycle - lastUpdate;

    // Keep if not too old
    if (bondAge < age) {
      filtered.push(b);
    }
  }

  ctx.summary.relationshipBonds = filtered;

  var afterCount = filtered.length;
  if (beforeCount !== afterCount) {
    Logger.log('purgeInactiveBonds_ v2.2: Purged ' + (beforeCount - afterCount) + ' old bonds');
  }
}


/**
 * Get all bonds involving a specific citizen.
 */
function getCitizenBondsFromStorage_(ctx, citizenId) {
  var bonds = ctx.summary.relationshipBonds || [];
  var result = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && (b.citizenA === citizenId || b.citizenB === citizenId)) {
      result.push(b);
    }
  }
  return result;
}


/**
 * Get bond between two specific citizens.
 */
function getBondBetween_(ctx, citizenA, citizenB) {
  var bonds = ctx.summary.relationshipBonds || [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && (
      (b.citizenA === citizenA && b.citizenB === citizenB) ||
      (b.citizenA === citizenB && b.citizenB === citizenA)
    )) {
      return b;
    }
  }
  return null;
}


/**
 * Get all bonds in a specific neighborhood.
 */
function getBondsByNeighborhood_(ctx, neighborhood) {
  var bonds = ctx.summary.relationshipBonds || [];
  var result = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.neighborhood === neighborhood) {
      result.push(b);
    }
  }
  return result;
}


/**
 * Get hottest rivalries (for narrative focus).
 */
function getHottestRivalries_(ctx, limit) {
  var bonds = ctx.summary.relationshipBonds || [];
  var max = limit || 5;

  var rivalries = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && (b.bondType === 'rivalry' || b.bondType === 'sports_rival') && b.status === 'active') {
      rivalries.push(b);
    }
  }

  rivalries.sort(function(a, b) { return (b.intensity || 0) - (a.intensity || 0); });
  return rivalries.slice(0, max);
}


/**
 * Get strongest alliances (for narrative focus).
 */
function getStrongestAlliances_(ctx, limit) {
  var bonds = ctx.summary.relationshipBonds || [];
  var max = limit || 5;

  var alliances = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && (b.bondType === 'alliance' || b.bondType === 'mentorship' || b.bondType === 'festival') && b.status === 'active') {
      alliances.push(b);
    }
  }

  alliances.sort(function(a, b) { return (b.intensity || 0) - (a.intensity || 0); });
  return alliances.slice(0, max);
}


// ═══════════════════════════════════════════════════════════════
// v2.1: CALENDAR-AWARE QUERY UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all bonds formed during a specific holiday.
 */
function getBondsByHoliday_(ctx, holiday) {
  var bonds = ctx.summary.relationshipBonds || [];
  var result = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.holiday === holiday) {
      result.push(b);
    }
  }
  return result;
}


/**
 * Get all bonds formed on First Friday.
 */
function getFirstFridayBonds_(ctx) {
  var bonds = ctx.summary.relationshipBonds || [];
  var result = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.isFirstFriday === true) {
      result.push(b);
    }
  }
  return result;
}


/**
 * Get all bonds formed on Creation Day.
 */
function getCreationDayBonds_(ctx) {
  var bonds = ctx.summary.relationshipBonds || [];
  var result = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.isCreationDay === true) {
      result.push(b);
    }
  }
  return result;
}


/**
 * Get all bonds formed during a specific sports season.
 */
function getBondsBySportsSeason_(ctx, sportsSeason) {
  var bonds = ctx.summary.relationshipBonds || [];
  var result = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.sportsSeason === sportsSeason) {
      result.push(b);
    }
  }
  return result;
}


/**
 * Get all festival bonds (bondType === 'festival').
 */
function getFestivalBonds_(ctx) {
  var bonds = ctx.summary.relationshipBonds || [];
  var result = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.bondType === 'festival' && b.status === 'active') {
      result.push(b);
    }
  }
  return result;
}


/**
 * Get all sports rivalries (bondType === 'sports_rival').
 */
function getSportsRivalries_(ctx) {
  var bonds = ctx.summary.relationshipBonds || [];
  var result = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.bondType === 'sports_rival' && b.status === 'active') {
      result.push(b);
    }
  }
  return result;
}


/**
 * Get bonds formed during Oakland-priority holidays.
 */
function getOaklandHolidayBonds_(ctx) {
  var bonds = ctx.summary.relationshipBonds || [];
  var result = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.holidayPriority === 'oakland') {
      result.push(b);
    }
  }
  return result;
}


/**
 * Get bonds by origin (e.g., 'festival_encounter', 'first_friday', 'creation_day').
 */
function getBondsByOrigin_(ctx, origin) {
  var bonds = ctx.summary.relationshipBonds || [];
  var result = [];
  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (b && b.origin === origin) {
      result.push(b);
    }
  }
  return result;
}


/**
 * Get calendar context summary for bonds.
 */
function getBondCalendarSummary_(ctx) {
  var counts = getBondCounts_(ctx);

  return {
    totalBonds: counts.total,
    activeBonds: counts.active,
    byHoliday: counts.byHoliday,
    firstFridayBonds: counts.firstFridayBonds,
    creationDayBonds: counts.creationDayBonds,
    bySportsSeason: counts.bySportsSeason,
    festivalBonds: getFestivalBonds_(ctx).length,
    sportsRivalries: getSportsRivalries_(ctx).length,
    oaklandHolidayBonds: getOaklandHolidayBonds_(ctx).length
  };
}


// ═══════════════════════════════════════════════════════════════
// MIGRATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Migrate old bond format to new format.
 * Run once if you have existing data in old schema.
 */
function migrateBondSchema_(ctx) {
  var bonds = ctx.summary.relationshipBonds || [];

  for (var i = 0; i < bonds.length; i++) {
    var b = bonds[i];
    if (!b) continue;

    // Migrate citizen1/citizen2 to citizenA/citizenB
    if (b.citizen1 && !b.citizenA) {
      b.citizenA = b.citizen1.popId || b.citizen1;
      delete b.citizen1;
    }
    if (b.citizen2 && !b.citizenB) {
      b.citizenB = b.citizen2.popId || b.citizen2;
      delete b.citizen2;
    }

    // Migrate createdCycle to cycleCreated
    if (b.createdCycle && !b.cycleCreated) {
      b.cycleCreated = b.createdCycle;
      delete b.createdCycle;
    }

    // Migrate lastUpdatedCycle to lastUpdate
    if (b.lastUpdatedCycle && !b.lastUpdate) {
      b.lastUpdate = b.lastUpdatedCycle;
      delete b.lastUpdatedCycle;
    }

    // Migrate status values
    if (b.status === 'dissolved' || b.status === 'inactive') {
      b.status = 'resolved';
    }

    // Ensure new fields exist
    if (!b.domainTag) b.domainTag = '';
    if (!b.neighborhood) b.neighborhood = '';

    // v2.1: Ensure calendar fields exist
    if (!b.holiday) b.holiday = 'none';
    if (!b.holidayPriority) b.holidayPriority = 'none';
    if (b.isFirstFriday === undefined) b.isFirstFriday = false;
    if (b.isCreationDay === undefined) b.isCreationDay = false;
    if (!b.sportsSeason) b.sportsSeason = 'off-season';
  }

  Logger.log('migrateBondSchema_ v2.2: Migrated ' + bonds.length + ' bonds');
}


/**
 * Add calendar columns to existing sheet if missing.
 * Run once to upgrade v2.0 sheets to v2.1 format.
 */
function upgradeBondSheetSchema_(ctx) {
  var ss = ctx.ss;
  var sheet = ss.getSheetByName('Relationship_Bonds');
  if (!sheet) return;

  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) return;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // v2.2: Bail if this looks like a ledger schema
  if (isLedgerSchema_(headers)) {
    Logger.log('upgradeBondSheetSchema_ v2.2: Relationship_Bonds appears to be ledger schema; aborting upgrade');
    return;
  }

  // v2.2: Bail if header count is way off (not 12 for v2.0 or 17 for v2.1)
  if (headers.length > 20 || headers.length < 10) {
    Logger.log('upgradeBondSheetSchema_ v2.2: Unexpected column count (' + headers.length + '); aborting upgrade');
    return;
  }

  // Check if calendar columns exist
  var hasHoliday = false;
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === 'Holiday') {
      hasHoliday = true;
      break;
    }
  }

  if (!hasHoliday) {
    // Add calendar columns
    var newHeaders = ['Holiday', 'HolidayPriority', 'FirstFriday', 'CreationDay', 'SportsSeason'];

    sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
    sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setFontWeight('bold');

    // Set defaults for existing rows
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var defaults = [];
      for (var r = 2; r <= lastRow; r++) {
        defaults.push(['none', 'none', false, false, 'off-season']);
      }
      sheet.getRange(2, lastCol + 1, lastRow - 1, 5).setValues(defaults);
    }

    Logger.log('upgradeBondSheetSchema_ v2.2: Added calendar columns to Relationship_Bonds');
  }
}


/**
 * ============================================================================
 * BOND PERSISTENCE REFERENCE v2.3
 * ============================================================================
 *
 * v2.3 CHANGES:
 * - saveRelationshipBonds_ uses queueReplaceIntent_ for V3 write-intents
 * - Full dryRun/replay mode support via ctx.mode flags
 * - Actual writes deferred to Phase 10 persistence executor
 *
 * v2.2 FIXES (preserved):
 * - ES5 compatible (var, no arrow functions)
 * - sheet.clear() replaced with clearContent() (preserves formatting)
 * - asBool_() for robust boolean parsing
 * - Schema collision guard (isLedgerSchema_ check)
 * - upgradeBondSheetSchema_ validates before upgrade
 * - purgeInactiveBonds_ bondAge calculation fixed
 *
 * SHEET COLUMNS (17 - master state):
 * BondId, CitizenA, CitizenB, BondType, Intensity, Status, Origin, DomainTag,
 * Neighborhood, CycleCreated, LastUpdate, Notes, Holiday, HolidayPriority,
 * FirstFriday, CreationDay, SportsSeason
 *
 * LEDGER COLUMNS (19 - historical log, handled by saveV3BondsToLedger_):
 * Timestamp, Cycle, BondId, CitizenA, CitizenB, BondType, Intensity, Status,
 * Origin, DomainTag, Neighborhood, CycleCreated, LastUpdate, Notes,
 * Holiday, HolidayPriority, FirstFriday, CreationDay, SportsSeason
 *
 * CALENDAR-AWARE QUERIES:
 * - getBondsByHoliday_(ctx, 'OaklandPride')
 * - getFirstFridayBonds_(ctx)
 * - getCreationDayBonds_(ctx)
 * - getBondsBySportsSeason_(ctx, 'championship')
 * - getFestivalBonds_(ctx)
 * - getSportsRivalries_(ctx)
 * - getOaklandHolidayBonds_(ctx)
 * - getBondsByOrigin_(ctx, 'festival_encounter')
 * - getBondCalendarSummary_(ctx)
 *
 * ============================================================================
 */
