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
  var idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
}

function pickRandomSet_(arr, count) {
  if (!arr || arr.length === 0) return [];
  if (count >= arr.length) return arr.slice();

  var copy = arr.slice();
  var result = [];

  for (var i = 0; i < count; i++) {
    var idx = Math.floor(Math.random() * copy.length);
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
