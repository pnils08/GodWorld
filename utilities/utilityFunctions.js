/**
 * ============================================================================
 * UTILITY FUNCTIONS - Canonical Location
 * ============================================================================
 *
 * v2.10 Changes:
 * - Deterministic RNG prep: Math.random aliased to local rng var in
 *   pickRandom_, pickRandomSet_, maybePick_ (centralization prep -- no ctx in scope)
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
 * - getSimSpreadsheetId_() - Get spreadsheet ID from config (v2.14)
 * - openSimSpreadsheet_() - Open spreadsheet using config ID (v2.14)
 *
 * ============================================================================
 */

function pickRandom_(arr) {
  var rng = Math.random; // centralization prep -- no ctx in scope
  if (!arr || arr.length === 0) return null;
  var idx = Math.floor(rng() * arr.length);
  return arr[idx];
}

function pickRandomSet_(arr, count) {
  var rng = Math.random; // centralization prep -- no ctx in scope
  if (!arr || arr.length === 0) return [];
  if (count >= arr.length) return arr.slice();

  var copy = arr.slice();
  var result = [];

  for (var i = 0; i < count; i++) {
    var idx = Math.floor(rng() * copy.length);
    result.push(copy[idx]);
    copy.splice(idx, 1);
  }

  return result;
}

function maybePick_(arr) {
  var rng = Math.random; // centralization prep -- no ctx in scope
  if (rng() < 0.5) return null;
  return pickRandom_(arr);
}

function shortId_() {
  return Utilities.getUuid().slice(0, 8).toUpperCase();
}

function ensureSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
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
  var v = sheet.getRange(row, col).getValue();
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

/**
 * ============================================================================
 * DOMAIN COOLDOWN GATE (v2.12)
 * ============================================================================
 * Checks if a domain is allowed based on S.suppressDomains from applyDomainCooldowns_.
 *
 * Usage in generators:
 *   if (!domainAllowed_(ctx, 'HEALTH')) return; // skip suppressed domain
 *
 * Handles case variations (HEALTH, Health, health all match).
 */
function domainAllowed_(ctx, domain) {
  var S = ctx.summary || {};
  var sup = S.suppressDomains || {};
  if (!domain) return true;
  var d = domain.toString();
  return !(sup[d] || sup[d.toUpperCase()] || sup[d.toLowerCase()]);
}

/**
 * ============================================================================
 * DOMAIN NORMALIZATION (v2.13)
 * ============================================================================
 * Normalizes domain strings to consistent Title Case for clean output.
 *
 * Usage:
 *   normalizeDomain_('HEALTH') => 'Health'
 *   normalizeDomain_('safety') => 'Safety'
 *   normalizeDomain_('ARTS') => 'Culture' (mapped alias)
 */
function normalizeDomain_(d) {
  if (!d) return 'General';
  var s = d.toString().trim();
  var up = s.toUpperCase();

  // Known domain mappings (uppercase key → Title Case value)
  var map = {
    'HEALTH': 'Health',
    'SAFETY': 'Safety',
    'INFRASTRUCTURE': 'Infrastructure',
    'WEATHER': 'Weather',
    'SPORTS': 'Sports',
    'CIVIC': 'Civic',
    'CULTURE': 'Culture',
    'COMMUNITY': 'Community',
    'BUSINESS': 'Business',
    'FESTIVAL': 'Festival',
    'HOLIDAY': 'Holiday',
    'TECHNOLOGY': 'Technology',
    'ENVIRONMENT': 'Environment',
    'NIGHTLIFE': 'Nightlife',
    'ARTS': 'Culture',
    'CELEBRITY': 'Celebrity',
    'EDUCATION': 'Education',
    'TRAFFIC': 'Traffic',
    'GENERAL': 'General'
  };

  return map[up] || (up[0] + up.slice(1).toLowerCase());
}

/**
 * ============================================================================
 * SPREADSHEET ID CONFIG (v2.14)
 * ============================================================================
 * Returns the simulation spreadsheet ID from Script Properties or fallback.
 *
 * To deploy to a different spreadsheet:
 *   1. Open Script Editor → Project Settings → Script Properties
 *   2. Add property: SIM_SSID = your-new-spreadsheet-id
 *
 * If no property is set, uses the default production spreadsheet.
 */
var DEFAULT_SIM_SSID = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';

function getSimSpreadsheetId_() {
  try {
    var props = PropertiesService.getScriptProperties();
    var customId = props.getProperty('SIM_SSID');
    if (customId && customId.length > 10) {
      return customId;
    }
  } catch (e) {
    // PropertiesService not available (e.g., testing context)
  }
  return DEFAULT_SIM_SSID;
}

/**
 * Opens the simulation spreadsheet using configured ID.
 * Use this instead of hardcoding SpreadsheetApp.openById(...).
 */
function openSimSpreadsheet_() {
  return SpreadsheetApp.openById(getSimSpreadsheetId_());
}
