/**
 * ============================================================================
 * V2 DEPRECATION GUIDE & MIGRATION UTILITIES
 * ============================================================================
 *
 * This file documents deprecated V2 patterns and provides utilities
 * for scanning and migrating code to V3 patterns.
 *
 * DEPRECATED PATTERNS (V2):
 * 1. Direct Math.random() calls - Use ctx.rng() instead
 * 2. Direct sheet writes outside Phase 10 - Use write-intents
 * 3. ctx.summary compatibility shim - Use canonical ctx shape
 *
 * V3 REQUIRED PATTERNS:
 * 1. Seeded RNG: ctx.rng() or ctx.rngFor('domain')()
 * 2. Write-intents: queueAppendIntent_(), queueCellIntent_(), etc.
 * 3. Canonical ctx: ctx.time, ctx.world, ctx.population, etc.
 *
 * ============================================================================
 */


// ═══════════════════════════════════════════════════════════════════════════
// DEPRECATED PATTERN DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Patterns that indicate V2 code needing migration.
 * Each pattern has: regex, severity, migration guidance.
 */
var V2_DEPRECATED_PATTERNS = [
  {
    name: 'Direct Math.random()',
    pattern: /Math\.random\s*\(/g,
    severity: 'high',
    guidance: 'Replace with ctx.rng() for deterministic execution',
    v3Pattern: 'ctx.rng()'
  },
  {
    name: 'Direct appendRow',
    pattern: /\.appendRow\s*\(/g,
    severity: 'high',
    guidance: 'Replace with queueAppendIntent_() for write-intents model',
    v3Pattern: 'queueAppendIntent_(ctx, sheetName, row, reason, domain)'
  },
  {
    name: 'Direct setValue',
    pattern: /\.setValue\s*\(/g,
    severity: 'high',
    guidance: 'Replace with queueCellIntent_() for write-intents model',
    v3Pattern: 'queueCellIntent_(ctx, sheetName, row, col, value, reason, domain)'
  },
  {
    name: 'Direct setValues',
    pattern: /\.setValues\s*\(/g,
    severity: 'high',
    guidance: 'Replace with queueRangeIntent_() for write-intents model',
    v3Pattern: 'queueRangeIntent_(ctx, sheetName, startRow, startCol, values, reason, domain)'
  },
  {
    name: 'Direct clearContent',
    pattern: /\.clearContent\s*\(/g,
    severity: 'medium',
    guidance: 'For full sheet replace, use queueReplaceIntent_()',
    v3Pattern: 'queueReplaceIntent_(ctx, sheetName, allRows, reason, domain)'
  },
  {
    name: 'const keyword (ES6)',
    pattern: /\bconst\s+/g,
    severity: 'low',
    guidance: 'Replace with var for ES5 compatibility',
    v3Pattern: 'var'
  },
  {
    name: 'let keyword (ES6)',
    pattern: /\blet\s+/g,
    severity: 'low',
    guidance: 'Replace with var for ES5 compatibility',
    v3Pattern: 'var'
  },
  {
    name: 'Arrow function',
    pattern: /=>\s*[{(]/g,
    severity: 'low',
    guidance: 'Replace with function() for ES5 compatibility',
    v3Pattern: 'function()'
  },
  {
    name: 'Template literal',
    pattern: /`[^`]*\$\{/g,
    severity: 'low',
    guidance: 'Replace with string concatenation for ES5 compatibility',
    v3Pattern: '"string" + variable + "string"'
  },
  {
    name: 'Object.entries()',
    pattern: /Object\.entries\s*\(/g,
    severity: 'low',
    guidance: 'Replace with for-in loop for ES5 compatibility',
    v3Pattern: 'for (var key in obj) { if (obj.hasOwnProperty(key)) { ... } }'
  },
  {
    name: 'forEach loop',
    pattern: /\.forEach\s*\(/g,
    severity: 'low',
    guidance: 'Replace with for loop for ES5 compatibility',
    v3Pattern: 'for (var i = 0; i < arr.length; i++) { ... }'
  },
  {
    name: 'map with arrow',
    pattern: /\.map\s*\(\s*\w+\s*=>/g,
    severity: 'low',
    guidance: 'Replace with for loop or map with function',
    v3Pattern: 'arr.map(function(item) { return ...; })'
  },
  {
    name: 'filter with arrow',
    pattern: /\.filter\s*\(\s*\w+\s*=>/g,
    severity: 'low',
    guidance: 'Replace with for loop or filter with function',
    v3Pattern: 'arr.filter(function(item) { return ...; })'
  }
];


/**
 * Scans code for deprecated V2 patterns.
 * @param {string} code - JavaScript source code
 * @returns {Array} Array of matches with pattern info
 */
function scanForDeprecatedPatterns_(code) {
  var results = [];

  for (var i = 0; i < V2_DEPRECATED_PATTERNS.length; i++) {
    var pattern = V2_DEPRECATED_PATTERNS[i];
    var matches = code.match(pattern.pattern);

    if (matches && matches.length > 0) {
      results.push({
        name: pattern.name,
        count: matches.length,
        severity: pattern.severity,
        guidance: pattern.guidance,
        v3Pattern: pattern.v3Pattern
      });
    }
  }

  return results;
}


/**
 * Generates a deprecation report for a file.
 * @param {string} fileName - Name of the file
 * @param {string} code - JavaScript source code
 * @returns {Object} Report with findings and recommendations
 */
function generateDeprecationReport_(fileName, code) {
  var findings = scanForDeprecatedPatterns_(code);

  var highCount = 0;
  var mediumCount = 0;
  var lowCount = 0;

  for (var i = 0; i < findings.length; i++) {
    var f = findings[i];
    if (f.severity === 'high') highCount += f.count;
    else if (f.severity === 'medium') mediumCount += f.count;
    else lowCount += f.count;
  }

  return {
    fileName: fileName,
    findings: findings,
    summary: {
      totalIssues: highCount + mediumCount + lowCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount
    },
    v3Ready: highCount === 0 && mediumCount === 0
  };
}


// ═══════════════════════════════════════════════════════════════════════════
// MIGRATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * V3 random replacement for Math.random().
 * Use this as a drop-in replacement during migration.
 * @param {Object} ctx - Engine context with rng
 * @returns {number} Random value 0-1
 */
function v3Random_(ctx) {
  if (ctx && ctx.rng) {
    return ctx.rng();
  }
  // Fallback for non-V3 execution (log warning)
  Logger.log('WARNING: v3Random_ called without ctx.rng - using Math.random()');
  return Math.random();
}


/**
 * V3 random integer replacement.
 * @param {Object} ctx - Engine context
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @returns {number} Random integer
 */
function v3RandomInt_(ctx, min, max) {
  var r = v3Random_(ctx);
  return Math.floor(r * (max - min + 1)) + min;
}


/**
 * V3 random array pick replacement.
 * @param {Object} ctx - Engine context
 * @param {Array} arr - Array to pick from
 * @returns {*} Random element or null if empty
 */
function v3PickRandom_(ctx, arr) {
  if (!arr || arr.length === 0) return null;
  var idx = Math.floor(v3Random_(ctx) * arr.length);
  return arr[idx];
}


/**
 * V3 random chance check (like Math.random() < 0.3).
 * @param {Object} ctx - Engine context
 * @param {number} probability - Chance 0-1
 * @returns {boolean} True if chance succeeds
 */
function v3Chance_(ctx, probability) {
  return v3Random_(ctx) < probability;
}


// ═══════════════════════════════════════════════════════════════════════════
// CTX.SUMMARY MIGRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Creates a compatibility shim between ctx.summary (V2) and canonical ctx (V3).
 * This allows gradual migration while maintaining backwards compatibility.
 *
 * V2 Pattern: ctx.summary.weather
 * V3 Pattern: ctx.world.weather
 *
 * The shim syncs both so old and new code work together.
 */
function createSummaryShim_(ctx) {
  // Ensure V3 canonical structure exists
  ctx.time = ctx.time || {};
  ctx.world = ctx.world || {};
  ctx.population = ctx.population || {};
  ctx.neighborhoods = ctx.neighborhoods || {};
  ctx.events = ctx.events || {};
  ctx.citizens = ctx.citizens || {};
  ctx.civic = ctx.civic || {};
  ctx.media = ctx.media || {};
  ctx.audit = ctx.audit || {};

  // Keep summary for backwards compatibility
  ctx.summary = ctx.summary || {};

  // Sync common fields
  var syncFields = [
    { v2: 'cycleId', v3Path: ['time', 'cycleId'] },
    { v2: 'season', v3Path: ['world', 'season'] },
    { v2: 'weather', v3Path: ['world', 'weather'] },
    { v2: 'holiday', v3Path: ['world', 'holiday'] },
    { v2: 'holidayPriority', v3Path: ['world', 'holidayPriority'] },
    { v2: 'isFirstFriday', v3Path: ['world', 'isFirstFriday'] },
    { v2: 'isCreationDay', v3Path: ['world', 'isCreationDay'] },
    { v2: 'sportsSeason', v3Path: ['world', 'sportsSeason'] },
    { v2: 'cityDynamics', v3Path: ['world', 'cityDynamics'] },
    { v2: 'worldPopulation', v3Path: ['population'] },
    { v2: 'worldEvents', v3Path: ['events', 'worldEvents'] },
    { v2: 'storySeeds', v3Path: ['events', 'hooks'] },
    { v2: 'storyHooks', v3Path: ['events', 'hooks'] },
    { v2: 'relationshipBonds', v3Path: ['citizens', 'bonds'] }
  ];

  // Copy V2 summary values to V3 canonical locations
  for (var i = 0; i < syncFields.length; i++) {
    var field = syncFields[i];
    var v2Value = ctx.summary[field.v2];

    if (v2Value !== undefined) {
      var obj = ctx;
      for (var j = 0; j < field.v3Path.length - 1; j++) {
        obj = obj[field.v3Path[j]];
      }
      var lastKey = field.v3Path[field.v3Path.length - 1];
      if (obj[lastKey] === undefined) {
        obj[lastKey] = v2Value;
      }
    }
  }

  return ctx;
}


/**
 * ============================================================================
 * V2 DEPRECATION REFERENCE
 * ============================================================================
 *
 * HIGH SEVERITY (Must fix for V3):
 * - Math.random() → ctx.rng()
 * - .appendRow() → queueAppendIntent_()
 * - .setValue() → queueCellIntent_()
 * - .setValues() → queueRangeIntent_()
 *
 * MEDIUM SEVERITY (Should fix):
 * - .clearContent() for full replace → queueReplaceIntent_()
 *
 * LOW SEVERITY (ES5 compatibility):
 * - const/let → var
 * - Arrow functions → function()
 * - Template literals → string concatenation
 * - Object.entries/forEach → for loops
 *
 * MIGRATION CHECKLIST:
 * [ ] Replace all Math.random() with ctx.rng()
 * [ ] Replace all direct sheet writes with write-intents
 * [ ] Convert ES6 syntax to ES5
 * [ ] Test with dryRun mode
 * [ ] Test with replay mode
 * [ ] Verify deterministic output
 *
 * ============================================================================
 */
