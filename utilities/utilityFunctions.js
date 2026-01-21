/**
 * ============================================================================
 * UTILITY FUNCTIONS - Canonical Location
 * ============================================================================
 *
 * v2.9 Consolidation:
 * All shared utility functions should be defined here ONLY.
 * Do not duplicate these functions in other files.
 *
 * Available functions:
 * - pickRandom_(arr) - Pick random element from array
 * - pickRandomSet_(arr, count) - Pick multiple unique random elements
 * - maybePick_(arr) - 50% chance to pick random element
 * - shortId_() - Generate 8-char uppercase UUID
 * - ensureSheet_(ss, name, headers) - Get or create sheet
 * - colIndex_(letter) - Convert column letter to index (A=1)
 * - safeGet_(sheet, row, col) - Safe getValue with null handling
 *
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
 * IDENTITY NORMALIZATION (v2.11)
 * ============================================================================
 * Normalizes name strings for consistent duplicate detection.
 * - Trims whitespace
 * - Converts to lowercase
 * - Collapses multiple spaces to single space
 *
 * Usage:
 *   normalizeIdentity_("  John   DOE  ") => "john doe"
 */
function normalizeIdentity_(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Compares two names for identity match (normalized)
 */
function identityMatch_(name1, name2) {
  return normalizeIdentity_(name1) === normalizeIdentity_(name2);
}
