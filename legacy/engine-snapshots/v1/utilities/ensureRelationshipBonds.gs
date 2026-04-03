/**
 * ensureRelationshipBonds.js
 *
 * Schema management for Relationship_Bonds and Relationship_Bond_Ledger.
 * Creates sheets if missing, validates headers, and handles migrations.
 *
 * @version 1.0
 * @tier 5.1
 */

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

var RELATIONSHIP_BONDS_SHEET_NAME = 'Relationship_Bonds';
var RELATIONSHIP_BOND_LEDGER_SHEET_NAME = 'Relationship_Bond_Ledger';

/**
 * Master state sheet headers (17 columns)
 * This is the live state of all active bonds
 */
var RELATIONSHIP_BONDS_HEADERS = [
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
  'Holiday',
  'HolidayPriority',
  'FirstFriday',
  'CreationDay',
  'SportsSeason'
];

/**
 * Historical ledger headers (19 columns)
 * Append-only log of all bond changes
 */
var RELATIONSHIP_BOND_LEDGER_HEADERS = [
  'Timestamp',
  'Cycle',
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
  'Holiday',
  'HolidayPriority',
  'FirstFriday',
  'CreationDay',
  'SportsSeason'
];

// ============================================================================
// SCHEMA MANAGEMENT
// ============================================================================

/**
 * Ensure Relationship_Bonds sheet exists with correct schema.
 * Creates sheet if missing, validates and repairs headers if needed.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss - Spreadsheet reference
 * @return {SpreadsheetApp.Sheet} - The sheet
 */
function ensureRelationshipBondsSchema_(ss) {
  if (!ss) {
    throw new Error('ensureRelationshipBondsSchema_: spreadsheet required');
  }

  var sheet = ss.getSheetByName(RELATIONSHIP_BONDS_SHEET_NAME);

  if (!sheet) {
    // Create new sheet with headers
    sheet = ss.insertSheet(RELATIONSHIP_BONDS_SHEET_NAME);
    sheet.appendRow(RELATIONSHIP_BONDS_HEADERS);
    sheet.getRange(1, 1, 1, RELATIONSHIP_BONDS_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    Logger.log('ensureRelationshipBondsSchema_: Created new ' + RELATIONSHIP_BONDS_SHEET_NAME + ' sheet');
    return sheet;
  }

  // Sheet exists - validate headers
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    // Empty sheet - add headers
    sheet.appendRow(RELATIONSHIP_BONDS_HEADERS);
    sheet.getRange(1, 1, 1, RELATIONSHIP_BONDS_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    Logger.log('ensureRelationshipBondsSchema_: Added headers to empty ' + RELATIONSHIP_BONDS_SHEET_NAME);
    return sheet;
  }

  // Check for ledger schema collision (has Timestamp/Cycle as first columns)
  var existingHeaders = sheet.getRange(1, 1, 1, Math.min(lastCol, 5)).getValues()[0];
  var firstHeader = String(existingHeaders[0] || '').trim();
  if (firstHeader === 'Timestamp' || firstHeader === 'Cycle') {
    Logger.log('ensureRelationshipBondsSchema_: WARNING - ' + RELATIONSHIP_BONDS_SHEET_NAME + ' appears to have ledger schema. Skipping modification.');
    return sheet;
  }

  // Check for missing headers and add them
  var allHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var missing = [];

  for (var i = 0; i < RELATIONSHIP_BONDS_HEADERS.length; i++) {
    var header = RELATIONSHIP_BONDS_HEADERS[i];
    var found = false;
    for (var j = 0; j < allHeaders.length; j++) {
      if (String(allHeaders[j]).trim() === header) {
        found = true;
        break;
      }
    }
    if (!found) {
      missing.push(header);
    }
  }

  if (missing.length > 0) {
    var startCol = lastCol + 1;
    for (var m = 0; m < missing.length; m++) {
      sheet.getRange(1, startCol + m).setValue(missing[m]).setFontWeight('bold');
    }
    Logger.log('ensureRelationshipBondsSchema_: Added ' + missing.length + ' missing headers: ' + missing.join(', '));
  }

  return sheet;
}


/**
 * Ensure Relationship_Bond_Ledger sheet exists with correct schema.
 * This is the append-only historical log.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss - Spreadsheet reference
 * @return {SpreadsheetApp.Sheet} - The sheet
 */
function ensureRelationshipBondLedgerSchema_(ss) {
  if (!ss) {
    throw new Error('ensureRelationshipBondLedgerSchema_: spreadsheet required');
  }

  var sheet = ss.getSheetByName(RELATIONSHIP_BOND_LEDGER_SHEET_NAME);

  if (!sheet) {
    // Create new sheet with headers
    sheet = ss.insertSheet(RELATIONSHIP_BOND_LEDGER_SHEET_NAME);
    sheet.appendRow(RELATIONSHIP_BOND_LEDGER_HEADERS);
    sheet.getRange(1, 1, 1, RELATIONSHIP_BOND_LEDGER_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    Logger.log('ensureRelationshipBondLedgerSchema_: Created new ' + RELATIONSHIP_BOND_LEDGER_SHEET_NAME + ' sheet');
    return sheet;
  }

  // Sheet exists - validate headers
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    // Empty sheet - add headers
    sheet.appendRow(RELATIONSHIP_BOND_LEDGER_HEADERS);
    sheet.getRange(1, 1, 1, RELATIONSHIP_BOND_LEDGER_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    Logger.log('ensureRelationshipBondLedgerSchema_: Added headers to empty ' + RELATIONSHIP_BOND_LEDGER_SHEET_NAME);
    return sheet;
  }

  // Check for missing headers
  var allHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var missing = [];

  for (var i = 0; i < RELATIONSHIP_BOND_LEDGER_HEADERS.length; i++) {
    var header = RELATIONSHIP_BOND_LEDGER_HEADERS[i];
    var found = false;
    for (var j = 0; j < allHeaders.length; j++) {
      if (String(allHeaders[j]).trim() === header) {
        found = true;
        break;
      }
    }
    if (!found) {
      missing.push(header);
    }
  }

  if (missing.length > 0) {
    var startCol = lastCol + 1;
    for (var m = 0; m < missing.length; m++) {
      sheet.getRange(1, startCol + m).setValue(missing[m]).setFontWeight('bold');
    }
    Logger.log('ensureRelationshipBondLedgerSchema_: Added ' + missing.length + ' missing headers: ' + missing.join(', '));
  }

  return sheet;
}


/**
 * Ensure both Relationship_Bonds sheets exist.
 * Convenience function to call both schema functions.
 *
 * @param {Object} ctx - Engine context with ss property
 */
function ensureRelationshipBondSchemas_(ctx) {
  if (!ctx || !ctx.ss) return;

  ensureRelationshipBondsSchema_(ctx.ss);
  ensureRelationshipBondLedgerSchema_(ctx.ss);
}


// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if Relationship_Bonds sheet has valid schema.
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @return {Object} - { valid: boolean, issues: string[] }
 */
function validateRelationshipBondsSchema_(ss) {
  var result = { valid: true, issues: [] };

  var sheet = ss.getSheetByName(RELATIONSHIP_BONDS_SHEET_NAME);
  if (!sheet) {
    result.valid = false;
    result.issues.push('Sheet does not exist');
    return result;
  }

  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    result.valid = false;
    result.issues.push('Sheet has no headers');
    return result;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // Check for ledger schema collision
  var firstHeader = String(headers[0] || '').trim();
  if (firstHeader === 'Timestamp') {
    result.valid = false;
    result.issues.push('Sheet has ledger schema (starts with Timestamp) - should be master state schema');
    return result;
  }

  // Check required headers
  var requiredHeaders = ['BondId', 'CitizenA', 'CitizenB', 'BondType', 'Intensity', 'Status'];
  for (var i = 0; i < requiredHeaders.length; i++) {
    var required = requiredHeaders[i];
    var found = false;
    for (var j = 0; j < headers.length; j++) {
      if (String(headers[j]).trim() === required) {
        found = true;
        break;
      }
    }
    if (!found) {
      result.valid = false;
      result.issues.push('Missing required header: ' + required);
    }
  }

  return result;
}


/**
 * ============================================================================
 * RELATIONSHIP BONDS SCHEMA REFERENCE v1.0
 * ============================================================================
 *
 * MASTER STATE SHEET (Relationship_Bonds - 17 columns):
 * - BondId: Unique identifier for the bond
 * - CitizenA, CitizenB: Names or POPIDs of bonded citizens
 * - BondType: alliance, rivalry, mentor, family, neighbor, colleague, etc.
 * - Intensity: 1-10 strength scale
 * - Status: active, dormant, resolved, severed
 * - Origin: How the bond formed (neighborhood, festival, work, etc.)
 * - DomainTag: Associated domain (CIVIC, CULTURE, etc.)
 * - Neighborhood: Primary neighborhood for the bond
 * - CycleCreated, LastUpdate: Cycle tracking
 * - Notes: Freeform context
 * - Holiday, HolidayPriority: Calendar context when created
 * - FirstFriday, CreationDay: Special day flags
 * - SportsSeason: Sports season when created
 *
 * HISTORICAL LEDGER (Relationship_Bond_Ledger - 19 columns):
 * - Same as master + Timestamp and Cycle at start
 * - Append-only log of all bond state changes
 *
 * ============================================================================
 */
