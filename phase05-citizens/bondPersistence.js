/**
 * ============================================================================
 * BOND PERSISTENCE v2.1
 * ============================================================================
 *
 * Handles loading and saving relationship bonds to/from sheet storage.
 * Works with Bond Engine v2.2 to maintain bonds across cycles.
 *
 * v2.1 Enhancements:
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
 * - Relationship_Bonds (master state - creates if missing)
 * - Relationship_Bond_Ledger (historical log - handled by saveV3BondsToLedger_)
 * 
 * ============================================================================
 */


// ═══════════════════════════════════════════════════════════════
// SHEET HEADERS (v2.1: with calendar columns)
// ═══════════════════════════════════════════════════════════════

const BOND_SHEET_HEADERS = [
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
// LOAD BONDS
// ═══════════════════════════════════════════════════════════════

/**
 * Load relationship bonds from storage into ctx.summary.relationshipBonds
 * Call this EARLY in your world cycle, before social engines run.
 */
function loadRelationshipBonds_(ctx) {
  const S = ctx.summary || {};
  const ss = ctx.ss;
  
  // Initialize the bonds array
  S.relationshipBonds = [];
  
  // Get or create the bonds sheet
  let sheet = ss.getSheetByName('Relationship_Bonds');
  if (!sheet) {
    sheet = ss.insertSheet('Relationship_Bonds');
    sheet.appendRow(BOND_SHEET_HEADERS);
    sheet.getRange(1, 1, 1, BOND_SHEET_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    ctx.summary = S;
    Logger.log('loadRelationshipBonds_ v2.1: Created new Relationship_Bonds sheet');
    return; // No bonds to load yet
  }
  
  // Read existing bonds
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    ctx.summary = S;
    Logger.log('loadRelationshipBonds_ v2.1: No bonds to load');
    return; // Only headers, no bonds
  }
  
  const headers = data[0];
  
  // Build column index map
  const col = {};
  headers.forEach((h, i) => { col[h] = i; });
  
  // Load bonds (skip inactive)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = col['Status'] !== undefined ? row[col['Status']] : 'active';
    
    // Skip resolved/severed bonds
    if (status === 'resolved' || status === 'severed') continue;
    
    const bond = {
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
      // v2.1: Calendar context
      holiday: col['Holiday'] !== undefined ? row[col['Holiday']] : 'none',
      holidayPriority: col['HolidayPriority'] !== undefined ? row[col['HolidayPriority']] : 'none',
      isFirstFriday: col['FirstFriday'] !== undefined ? row[col['FirstFriday']] === true || row[col['FirstFriday']] === 'TRUE' : false,
      isCreationDay: col['CreationDay'] !== undefined ? row[col['CreationDay']] === true || row[col['CreationDay']] === 'TRUE' : false,
      sportsSeason: col['SportsSeason'] !== undefined ? row[col['SportsSeason']] : 'off-season'
    };
    
    S.relationshipBonds.push(bond);
  }
  
  ctx.summary = S;
  Logger.log('loadRelationshipBonds_ v2.1: Loaded ' + S.relationshipBonds.length + ' active bonds');
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
 */
function saveRelationshipBonds_(ctx) {
  const S = ctx.summary || {};
  const ss = ctx.ss;
  const bonds = S.relationshipBonds || [];
  
  // Get or create the bonds sheet
  let sheet = ss.getSheetByName('Relationship_Bonds');
  if (!sheet) {
    sheet = ss.insertSheet('Relationship_Bonds');
  }
  
  // Clear existing data
  sheet.clear();
  
  // Write headers
  sheet.appendRow(BOND_SHEET_HEADERS);
  sheet.getRange(1, 1, 1, BOND_SHEET_HEADERS.length).setFontWeight('bold');
  sheet.setFrozenRows(1);
  
  if (bonds.length === 0) {
    Logger.log('saveRelationshipBonds_ v2.1: No bonds to save');
    return; // Nothing more to save
  }
  
  const currentCycle = S.cycleId || ctx.config.cycleCount || 0;
  
  // Build all rows
  const rows = bonds.map(bond => [
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
  
  // Batch write all bonds
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, BOND_SHEET_HEADERS.length).setValues(rows);
  }
  
  Logger.log('saveRelationshipBonds_ v2.1: Saved ' + rows.length + ' bonds');
}


// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get bond count by type (for diagnostics).
 */
function getBondCounts_(ctx) {
  const bonds = ctx.summary.relationshipBonds || [];
  const counts = {
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
  
  bonds.forEach(b => {
    if (!b) return;
    
    // Count by status
    if (b.status === 'active') counts.active++;
    else if (b.status === 'dormant') counts.dormant++;
    else if (b.status === 'resolved') counts.resolved++;
    else if (b.status === 'severed') counts.severed++;
    
    // Count by type
    const type = b.bondType || 'unknown';
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
  });
  
  return counts;
}


/**
 * Purge old resolved/severed bonds to prevent sheet bloat.
 * Call periodically (e.g., every 20 cycles).
 */
function purgeInactiveBonds_(ctx, maxAge) {
  const currentCycle = ctx.summary?.cycleId || ctx.config?.cycleCount || 0;
  const bonds = ctx.summary.relationshipBonds || [];
  const age = maxAge || 50; // Default: purge bonds inactive for 50+ cycles
  
  const beforeCount = bonds.length;
  
  ctx.summary.relationshipBonds = bonds.filter(b => {
    if (!b) return false;
    
    // Keep active and dormant bonds
    if (b.status === 'active' || b.status === 'dormant') return true;
    
    // Purge old resolved/severed bonds
    const bondAge = currentCycle - (b.lastUpdate || b.cycleCreated || 0);
    return bondAge < age;
  });
  
  const afterCount = ctx.summary.relationshipBonds.length;
  if (beforeCount !== afterCount) {
    Logger.log('purgeInactiveBonds_ v2.1: Purged ' + (beforeCount - afterCount) + ' old bonds');
  }
}


/**
 * Get all bonds involving a specific citizen.
 */
function getCitizenBondsFromStorage_(ctx, citizenId) {
  const bonds = ctx.summary.relationshipBonds || [];
  return bonds.filter(b => 
    b && (b.citizenA === citizenId || b.citizenB === citizenId)
  );
}


/**
 * Get bond between two specific citizens.
 */
function getBondBetween_(ctx, citizenA, citizenB) {
  const bonds = ctx.summary.relationshipBonds || [];
  return bonds.find(b =>
    b && (
      (b.citizenA === citizenA && b.citizenB === citizenB) ||
      (b.citizenA === citizenB && b.citizenB === citizenA)
    )
  );
}


/**
 * Get all bonds in a specific neighborhood.
 */
function getBondsByNeighborhood_(ctx, neighborhood) {
  const bonds = ctx.summary.relationshipBonds || [];
  return bonds.filter(b => b && b.neighborhood === neighborhood);
}


/**
 * Get hottest rivalries (for narrative focus).
 */
function getHottestRivalries_(ctx, limit) {
  const bonds = ctx.summary.relationshipBonds || [];
  const max = limit || 5;
  
  return bonds
    .filter(b => b && (b.bondType === 'rivalry' || b.bondType === 'sports_rival') && b.status === 'active')
    .sort((a, b) => (b.intensity || 0) - (a.intensity || 0))
    .slice(0, max);
}


/**
 * Get strongest alliances (for narrative focus).
 */
function getStrongestAlliances_(ctx, limit) {
  const bonds = ctx.summary.relationshipBonds || [];
  const max = limit || 5;
  
  return bonds
    .filter(b => b && (b.bondType === 'alliance' || b.bondType === 'mentorship' || b.bondType === 'festival') && b.status === 'active')
    .sort((a, b) => (b.intensity || 0) - (a.intensity || 0))
    .slice(0, max);
}


// ═══════════════════════════════════════════════════════════════
// v2.1: CALENDAR-AWARE QUERY UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all bonds formed during a specific holiday.
 */
function getBondsByHoliday_(ctx, holiday) {
  const bonds = ctx.summary.relationshipBonds || [];
  return bonds.filter(b => b && b.holiday === holiday);
}


/**
 * Get all bonds formed on First Friday.
 */
function getFirstFridayBonds_(ctx) {
  const bonds = ctx.summary.relationshipBonds || [];
  return bonds.filter(b => b && b.isFirstFriday === true);
}


/**
 * Get all bonds formed on Creation Day.
 */
function getCreationDayBonds_(ctx) {
  const bonds = ctx.summary.relationshipBonds || [];
  return bonds.filter(b => b && b.isCreationDay === true);
}


/**
 * Get all bonds formed during a specific sports season.
 */
function getBondsBySportsSeason_(ctx, sportsSeason) {
  const bonds = ctx.summary.relationshipBonds || [];
  return bonds.filter(b => b && b.sportsSeason === sportsSeason);
}


/**
 * Get all festival bonds (bondType === 'festival').
 */
function getFestivalBonds_(ctx) {
  const bonds = ctx.summary.relationshipBonds || [];
  return bonds.filter(b => b && b.bondType === 'festival' && b.status === 'active');
}


/**
 * Get all sports rivalries (bondType === 'sports_rival').
 */
function getSportsRivalries_(ctx) {
  const bonds = ctx.summary.relationshipBonds || [];
  return bonds.filter(b => b && b.bondType === 'sports_rival' && b.status === 'active');
}


/**
 * Get bonds formed during Oakland-priority holidays.
 */
function getOaklandHolidayBonds_(ctx) {
  const bonds = ctx.summary.relationshipBonds || [];
  return bonds.filter(b => b && b.holidayPriority === 'oakland');
}


/**
 * Get bonds by origin (e.g., 'festival_encounter', 'first_friday', 'creation_day').
 */
function getBondsByOrigin_(ctx, origin) {
  const bonds = ctx.summary.relationshipBonds || [];
  return bonds.filter(b => b && b.origin === origin);
}


/**
 * Get calendar context summary for bonds.
 */
function getBondCalendarSummary_(ctx) {
  const counts = getBondCounts_(ctx);
  
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
  const bonds = ctx.summary.relationshipBonds || [];
  
  bonds.forEach(b => {
    if (!b) return;
    
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
  });
  
  Logger.log('migrateBondSchema_ v2.1: Migrated ' + bonds.length + ' bonds');
}


/**
 * Add calendar columns to existing sheet if missing.
 * Run once to upgrade v2.0 sheets to v2.1 format.
 */
function upgradeBondSheetSchema_(ctx) {
  const ss = ctx.ss;
  const sheet = ss.getSheetByName('Relationship_Bonds');
  if (!sheet) return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Check if calendar columns exist
  const hasHoliday = headers.includes('Holiday');
  
  if (!hasHoliday) {
    // Add calendar columns
    const lastCol = sheet.getLastColumn();
    const newHeaders = ['Holiday', 'HolidayPriority', 'FirstFriday', 'CreationDay', 'SportsSeason'];
    
    sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setValues([newHeaders]);
    sheet.getRange(1, lastCol + 1, 1, newHeaders.length).setFontWeight('bold');
    
    // Set defaults for existing rows
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const defaults = [];
      for (let i = 2; i <= lastRow; i++) {
        defaults.push(['none', 'none', false, false, 'off-season']);
      }
      sheet.getRange(2, lastCol + 1, lastRow - 1, 5).setValues(defaults);
    }
    
    Logger.log('upgradeBondSheetSchema_ v2.1: Added calendar columns to Relationship_Bonds');
  }
}


/**
 * ============================================================================
 * BOND PERSISTENCE REFERENCE v2.1
 * ============================================================================
 * 
 * SHEET COLUMNS (17):
 * BondId, CitizenA, CitizenB, BondType, Intensity, Status, Origin, DomainTag,
 * Neighborhood, CycleCreated, LastUpdate, Notes, Holiday, HolidayPriority,
 * FirstFriday, CreationDay, SportsSeason
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
 * BOND COUNTS INCLUDE:
 * - byHoliday: { OaklandPride: 5, LunarNewYear: 3, ... }
 * - firstFridayBonds: number
 * - creationDayBonds: number
 * - bySportsSeason: { championship: 2, playoffs: 4, ... }
 * 
 * MIGRATION:
 * - migrateBondSchema_(ctx) — migrates old field names
 * - upgradeBondSheetSchema_(ctx) — adds calendar columns to existing sheet
 * 
 * ============================================================================
 */