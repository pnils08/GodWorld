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
  // No callers as of S156 — if this ever fires, route the caller to ctx.rng
  // instead of adding a fallback back. (Phase 40.3 Path 1 — Math.random removed.)
  throw new Error('v3Random_ called without ctx.rng — fix the caller to pass a ctx with rng');
}


// ═══════════════════════════════════════════════════════════════════════════
// CTX.SUMMARY MIGRATION
// ═══════════════════════════════════════════════════════════════════════════

// S185 dead-code scan removals: createSummaryShim_, v3RandomInt_, v3PickRandom_,
// v3Chance_, generateDeprecationReport_ — explicitly deprecated, no callers
// (verified by scripts/scanDeadCode.js). v3Random_ kept above (throw-only
// fallback per S156 Phase 40.3 Path 1).


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
