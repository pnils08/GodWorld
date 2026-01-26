/**
 * ============================================================================
 * WRITE INTENTS - V3 Persistence Model
 * ============================================================================
 *
 * Implements the V3 Architecture write-intents model for deterministic,
 * replayable cycles. Engines create write intents instead of writing directly.
 *
 * v1.0 Features:
 * - Intent creation helpers (cell, range, append, replace)
 * - Intent validation
 * - Integration with ctx.persist
 * - Support for dryRun and replay modes
 *
 * Intent Schema:
 * {
 *   tab: string,           // Sheet name
 *   kind: 'cell' | 'range' | 'append' | 'replace',
 *   address: { row: number, col: number },  // For cell/range
 *   values: any[][],       // 2D array of values
 *   reason: string,        // Human-readable description
 *   domain: string,        // Owning domain (for validation)
 *   timestamp: Date,       // When intent was created
 *   priority: number       // Execution order (lower = earlier)
 * }
 *
 * Usage:
 *   // Initialize ctx.persist at cycle start
 *   initializePersistContext_(ctx);
 *
 *   // Create intents in engines
 *   queueCellIntent_(ctx, 'World_Config', 2, 3, 'newValue', 'update cycle count', 'config');
 *   queueAppendIntent_(ctx, 'Riley_Digest', [timestamp, cycle, ...], 'log digest', 'audit');
 *
 *   // Execute intents in Phase 10
 *   var result = executePersistIntents_(ctx);
 *
 * ============================================================================
 */


/**
 * Initializes the persistence context on ctx.
 * Call this at the start of each cycle (Phase 0/1).
 */
function initializePersistContext_(ctx) {
  ctx.persist = ctx.persist || {};
  ctx.persist.updates = ctx.persist.updates || [];
  ctx.persist.logs = ctx.persist.logs || [];
  ctx.persist.replaceOps = ctx.persist.replaceOps || [];

  ctx.mode = ctx.mode || {};
  ctx.mode.dryRun = ctx.mode.dryRun || false;
  ctx.mode.replay = ctx.mode.replay || false;
  ctx.mode.strict = ctx.mode.strict || false;
  ctx.mode.profile = ctx.mode.profile || false;

  return ctx;
}


/**
 * Creates a write intent object.
 * Internal helper - use the queue* functions instead.
 */
function createWriteIntent_(tab, kind, address, values, reason, domain, priority) {
  return {
    tab: tab,
    kind: kind,
    address: address || null,
    values: values,
    reason: reason || '',
    domain: domain || 'unknown',
    timestamp: new Date(),
    priority: priority || 100
  };
}


/**
 * Queues a single cell write intent.
 * @param {Object} ctx - Engine context
 * @param {string} tab - Sheet name
 * @param {number} row - Row number (1-based)
 * @param {number} col - Column number (1-based)
 * @param {any} value - Value to write
 * @param {string} reason - Description of why this write is needed
 * @param {string} domain - Owning domain
 * @param {number} [priority=100] - Execution priority
 */
function queueCellIntent_(ctx, tab, row, col, value, reason, domain, priority) {
  if (!ctx.persist) initializePersistContext_(ctx);

  var intent = createWriteIntent_(
    tab,
    'cell',
    { row: row, col: col },
    [[value]],
    reason,
    domain,
    priority
  );

  ctx.persist.updates.push(intent);
  return intent;
}


/**
 * Queues a range write intent.
 * @param {Object} ctx - Engine context
 * @param {string} tab - Sheet name
 * @param {number} startRow - Starting row (1-based)
 * @param {number} startCol - Starting column (1-based)
 * @param {any[][]} values - 2D array of values
 * @param {string} reason - Description
 * @param {string} domain - Owning domain
 * @param {number} [priority=100] - Execution priority
 */
function queueRangeIntent_(ctx, tab, startRow, startCol, values, reason, domain, priority) {
  if (!ctx.persist) initializePersistContext_(ctx);

  var intent = createWriteIntent_(
    tab,
    'range',
    { row: startRow, col: startCol },
    values,
    reason,
    domain,
    priority
  );

  ctx.persist.updates.push(intent);
  return intent;
}


/**
 * Queues an append intent (adds rows at end of sheet).
 * @param {Object} ctx - Engine context
 * @param {string} tab - Sheet name
 * @param {any[]} row - Single row to append (1D array)
 * @param {string} reason - Description
 * @param {string} domain - Owning domain
 * @param {number} [priority=100] - Execution priority
 */
function queueAppendIntent_(ctx, tab, row, reason, domain, priority) {
  if (!ctx.persist) initializePersistContext_(ctx);

  var intent = createWriteIntent_(
    tab,
    'append',
    null,
    [row],
    reason,
    domain,
    priority
  );

  ctx.persist.updates.push(intent);
  return intent;
}


/**
 * Queues multiple append intents (batch append).
 * @param {Object} ctx - Engine context
 * @param {string} tab - Sheet name
 * @param {any[][]} rows - Multiple rows to append (2D array)
 * @param {string} reason - Description
 * @param {string} domain - Owning domain
 * @param {number} [priority=100] - Execution priority
 */
function queueBatchAppendIntent_(ctx, tab, rows, reason, domain, priority) {
  if (!ctx.persist) initializePersistContext_(ctx);

  var intent = createWriteIntent_(
    tab,
    'append',
    null,
    rows,
    reason,
    domain,
    priority
  );

  ctx.persist.updates.push(intent);
  return intent;
}


/**
 * Queues a replace intent (clears sheet and writes new data).
 * Used for master state sheets like Relationship_Bonds.
 * @param {Object} ctx - Engine context
 * @param {string} tab - Sheet name
 * @param {any[][]} allRows - All rows including header
 * @param {string} reason - Description
 * @param {string} domain - Owning domain
 * @param {number} [priority=50] - Priority (lower = earlier, replaces before appends)
 */
function queueReplaceIntent_(ctx, tab, allRows, reason, domain, priority) {
  if (!ctx.persist) initializePersistContext_(ctx);

  var intent = createWriteIntent_(
    tab,
    'replace',
    null,
    allRows,
    reason,
    domain,
    priority || 50
  );

  ctx.persist.replaceOps.push(intent);
  return intent;
}


/**
 * Queues a log entry (append to audit/log sheets).
 * Logs are processed after updates.
 * @param {Object} ctx - Engine context
 * @param {string} tab - Sheet name
 * @param {any[]} row - Log row to append
 * @param {string} reason - Description
 */
function queueLogIntent_(ctx, tab, row, reason) {
  if (!ctx.persist) initializePersistContext_(ctx);

  var intent = createWriteIntent_(
    tab,
    'append',
    null,
    [row],
    reason,
    'audit',
    200  // Logs run after main updates
  );

  ctx.persist.logs.push(intent);
  return intent;
}


/**
 * Gets all pending intents for a specific sheet.
 * Useful for debugging and dry-run inspection.
 */
function getIntentsForSheet_(ctx, tab) {
  if (!ctx.persist) return [];

  var all = []
    .concat(ctx.persist.replaceOps || [])
    .concat(ctx.persist.updates || [])
    .concat(ctx.persist.logs || []);

  var filtered = [];
  for (var i = 0; i < all.length; i++) {
    if (all[i].tab === tab) {
      filtered.push(all[i]);
    }
  }
  return filtered;
}


/**
 * Gets count of pending intents by domain.
 */
function getIntentCountsByDomain_(ctx) {
  if (!ctx.persist) return {};

  var counts = {};
  var all = []
    .concat(ctx.persist.replaceOps || [])
    .concat(ctx.persist.updates || [])
    .concat(ctx.persist.logs || []);

  for (var i = 0; i < all.length; i++) {
    var domain = all[i].domain || 'unknown';
    counts[domain] = (counts[domain] || 0) + 1;
  }
  return counts;
}


/**
 * Gets summary of all pending intents.
 */
function getIntentSummary_(ctx) {
  if (!ctx.persist) {
    return {
      totalIntents: 0,
      replaceOps: 0,
      updates: 0,
      logs: 0,
      byDomain: {},
      bySheet: {}
    };
  }

  var bySheet = {};
  var all = []
    .concat(ctx.persist.replaceOps || [])
    .concat(ctx.persist.updates || [])
    .concat(ctx.persist.logs || []);

  for (var i = 0; i < all.length; i++) {
    var tab = all[i].tab;
    bySheet[tab] = (bySheet[tab] || 0) + 1;
  }

  return {
    totalIntents: all.length,
    replaceOps: (ctx.persist.replaceOps || []).length,
    updates: (ctx.persist.updates || []).length,
    logs: (ctx.persist.logs || []).length,
    byDomain: getIntentCountsByDomain_(ctx),
    bySheet: bySheet
  };
}


/**
 * Clears all pending intents.
 * Call after successful execution or when aborting cycle.
 */
function clearAllIntents_(ctx) {
  if (ctx.persist) {
    ctx.persist.updates = [];
    ctx.persist.logs = [];
    ctx.persist.replaceOps = [];
  }
}


/**
 * Validates an intent before execution.
 * Returns { valid: boolean, error: string|null }
 */
function validateIntent_(intent) {
  if (!intent) {
    return { valid: false, error: 'Intent is null or undefined' };
  }

  if (!intent.tab || typeof intent.tab !== 'string') {
    return { valid: false, error: 'Intent missing valid tab name' };
  }

  var validKinds = ['cell', 'range', 'append', 'replace'];
  var kindValid = false;
  for (var i = 0; i < validKinds.length; i++) {
    if (intent.kind === validKinds[i]) {
      kindValid = true;
      break;
    }
  }
  if (!kindValid) {
    return { valid: false, error: 'Invalid intent kind: ' + intent.kind };
  }

  if (intent.kind === 'cell' || intent.kind === 'range') {
    if (!intent.address || !intent.address.row || !intent.address.col) {
      return { valid: false, error: 'Cell/range intent missing address' };
    }
  }

  if (!intent.values || !Array.isArray(intent.values)) {
    return { valid: false, error: 'Intent missing values array' };
  }

  return { valid: true, error: null };
}


/**
 * ============================================================================
 * WRITE INTENTS REFERENCE v1.0
 * ============================================================================
 *
 * INTENT KINDS:
 * - cell: Write single value at specific row/col
 * - range: Write 2D array starting at row/col
 * - append: Add rows at end of sheet
 * - replace: Clear sheet and write all data (for master state)
 *
 * EXECUTION ORDER:
 * 1. Replace operations (priority 50)
 * 2. Cell/range updates (priority 100)
 * 3. Appends (priority 100)
 * 4. Logs (priority 200)
 *
 * DRY-RUN MODE:
 * When ctx.mode.dryRun = true:
 * - Intents are created normally
 * - executePersistIntents_() logs but doesn't write
 * - Use getIntentSummary_() to inspect planned writes
 *
 * REPLAY MODE:
 * When ctx.mode.replay = true:
 * - Intents are created normally
 * - Persistence is skipped
 * - Outputs can be compared to original run
 *
 * DOMAINS:
 * config, population, neighborhoods, events, citizens, civic, media, audit
 *
 * ============================================================================
 */
