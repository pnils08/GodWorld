/**
 * ============================================================================
 * PROCESS INTAKE V3 — Write-Intent Based
 * ============================================================================
 *
 * Migrated from processIntake_ v2.11 to use V3 write-intents model.
 * Stages all valid rows in memory, then creates write intents.
 *
 * v3.0 Changes:
 * - Uses queueRangeIntent_ instead of direct sheet writes
 * - Uses queueCellIntent_ for intake clearing
 * - Full dryRun/replay mode support
 * - ES5 compatible
 *
 * Previous features (v2.11):
 * - Identity normalization prevents duplicates
 * - Intra-batch duplicate detection
 * - Transactional staging
 *
 * ============================================================================
 */


/**
 * Process intake sheet using write-intents model.
 * Creates intents for ledger writes and intake clearing.
 * Actual writes happen in Phase 10 via executePersistIntents_.
 */
function processIntakeV3_(ctx) {
  // Initialize persist context if needed
  if (!ctx.persist) {
    initializePersistContext_(ctx);
  }

  var intake = ctx.ss.getSheetByName('Intake');
  var ledger = ctx.ss.getSheetByName('Simulation_Ledger');
  if (!intake || !ledger) return;

  var intakeVals = intake.getDataRange().getValues();
  if (intakeVals.length < 2) return;

  var intakeHeader = intakeVals[0];
  var ledgerVals = ledger.getDataRange().getValues();
  var ledgerHeader = ledgerVals[0];

  // Column index helpers
  var idxI = function(name) { return intakeHeader.indexOf(name); };
  var idxL = function(name) { return ledgerHeader.indexOf(name); };

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 1: Validate and stage all rows in memory
  // ═══════════════════════════════════════════════════════════════════════════
  var stagedRows = [];
  var rowsToClear = [];
  var nextPopNum = getMaxPopIdFromValues_(ledgerVals) + 1;

  // Track names we're adding in this batch to prevent intra-batch duplicates
  var batchNames = {};

  for (var r = 1; r < intakeVals.length; r++) {
    var row = intakeVals[r];

    var first = (row[idxI('First')] || '').toString().trim();
    var last = (row[idxI('Last')] || '').toString().trim();
    if (!first && !last) continue;

    // Check against existing ledger (normalized)
    if (existsInLedgerValues_(ledgerVals, first, last)) {
      rowsToClear.push(r + 1); // Still clear duplicate intake rows
      continue;
    }

    // Check against names already staged in this batch
    var normKey = normalizeIdentity_(first) + '|' + normalizeIdentity_(last);
    if (batchNames[normKey]) {
      rowsToClear.push(r + 1); // Duplicate within batch
      continue;
    }
    batchNames[normKey] = true;

    // Build the new ledger row
    var middle = (row[idxI('Middle')] || '').toString().trim();
    var originGame = (row[idxI('OriginGame')] || '').toString().trim();
    var uni = (row[idxI('UNI (y/n)')] || '').toString().trim();
    var med = (row[idxI('MED (y/n)')] || '').toString().trim();
    var civ = (row[idxI('CIV (y/n)')] || '').toString().trim();
    var clock = (row[idxI('ClockMode')] || 'ENGINE').toString().trim();
    var tier = row[idxI('Tier')] || '';
    var roleType = row[idxI('RoleType')] || '';
    var status = row[idxI('Status')] || 'Active';
    var birthYear = row[idxI('BirthYear')] || '';
    var originCity = row[idxI('OriginCity')] || '';
    var lifeHist = row[idxI('LifeHistory')] || '';
    var vault = row[idxI('OriginVault')] || '';
    var neighborhood = row[idxI('Neighborhood')] || '';

    var popId = 'POP-' + padNumber_(nextPopNum++, 5);

    var newRow = [];
    for (var c = 0; c < ledgerHeader.length; c++) {
      newRow.push('');
    }

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
    if (idxL('Neighborhood') >= 0) newRow[idxL('Neighborhood')] = neighborhood;
    if (idxL('CreatedAt') >= 0) newRow[idxL('CreatedAt')] = ctx.now;
    if (idxL('LastUpdated') >= 0) newRow[idxL('LastUpdated')] = ctx.now;
    if (idxL('UsageCount') >= 0) newRow[idxL('UsageCount')] = 0;

    stagedRows.push(newRow);
    rowsToClear.push(r + 1);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 2: Create write intents for ledger additions
  // ═══════════════════════════════════════════════════════════════════════════
  if (stagedRows.length > 0) {
    var startRow = ledger.getLastRow() + 1;

    queueRangeIntent_(
      ctx,
      'Simulation_Ledger',
      startRow,
      1,
      stagedRows,
      'Add ' + stagedRows.length + ' new citizens from intake',
      'citizens',
      100
    );

    ctx.summary.intakeProcessed = (ctx.summary.intakeProcessed || 0) + stagedRows.length;
    Logger.log('processIntakeV3_: Staged ' + stagedRows.length + ' citizens for ledger write');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAGE 3: Create intents to clear processed intake rows
  // ═══════════════════════════════════════════════════════════════════════════
  if (rowsToClear.length > 0) {
    // Sort descending so we can process without row shift issues
    rowsToClear.sort(function(a, b) { return b - a; });

    // Create clear intents for each row
    // Note: We use empty values for all columns in that row
    var intakeColCount = intake.getLastColumn();
    var emptyRow = [];
    for (var c = 0; c < intakeColCount; c++) {
      emptyRow.push('');
    }

    for (var i = 0; i < rowsToClear.length; i++) {
      var rowNum = rowsToClear[i];
      queueRangeIntent_(
        ctx,
        'Intake',
        rowNum,
        1,
        [emptyRow],
        'Clear processed intake row ' + rowNum,
        'citizens',
        150  // Run after ledger writes
      );
    }

    Logger.log('processIntakeV3_: Staged ' + rowsToClear.length + ' intake rows for clearing');
  }
}


/**
 * Helper: Get max POP-ID number from ledger values array
 */
function getMaxPopIdFromValues_(ledgerValues) {
  if (ledgerValues.length < 2) return 0;

  var header = ledgerValues[0];
  var idx = header.indexOf('POPID');
  if (idx < 0) return 0;

  var maxN = 0;
  for (var r = 1; r < ledgerValues.length; r++) {
    var v = (ledgerValues[r][idx] || '').toString().trim();
    var m = v.match(/^POP-(\d+)$/);
    if (m) {
      var n = Number(m[1]);
      if (n > maxN) maxN = n;
    }
  }
  return maxN;
}


/**
 * Helper: Check if citizen exists in ledger values (normalized)
 */
function existsInLedgerValues_(ledgerValues, first, last) {
  if (ledgerValues.length < 2) return false;

  var header = ledgerValues[0];
  var idxFirst = header.indexOf('First');
  var idxLast = header.indexOf('Last');

  // Normalize input names
  var normFirst = normalizeIdentity_(first);
  var normLast = normalizeIdentity_(last);

  for (var r = 1; r < ledgerValues.length; r++) {
    var f = normalizeIdentity_(ledgerValues[r][idxFirst]);
    var l = normalizeIdentity_(ledgerValues[r][idxLast]);
    if (f === normFirst && l === normLast) return true;
  }
  return false;
}


/**
 * Helper: Pad number with leading zeros
 */
function padNumber_(num, length) {
  var s = String(num);
  while (s.length < length) {
    s = '0' + s;
  }
  return s;
}


/**
 * ============================================================================
 * PROCESS INTAKE V3 REFERENCE
 * ============================================================================
 *
 * MIGRATION NOTES:
 * - Old: processIntake_() in godWorldEngine2.js with direct writes
 * - New: processIntakeV3_() with write-intents
 *
 * INTENT OPERATIONS:
 * 1. Range write to Simulation_Ledger (new citizens, priority 100)
 * 2. Range writes to Intake (clear processed rows, priority 150)
 *
 * TO ENABLE:
 * Replace in godWorldEngine2.js:
 *   safePhaseCall_(ctx, 'Phase5-Intake', function() { processIntake_(ctx); });
 * With:
 *   safePhaseCall_(ctx, 'Phase5-Intake', function() { processIntakeV3_(ctx); });
 *
 * BACKWARDS COMPATIBILITY:
 * The old processIntake_ is preserved in godWorldEngine2.js.
 * Can switch back by reverting the call.
 *
 * ============================================================================
 */
