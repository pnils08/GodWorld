/**
 * prePublicationValidation.js
 *
 * Phase 6.5: Pre-publication validation checks
 * Runs between Phase 6 (story signals) and Phase 7 (media output)
 *
 * Four validators catch issues before publication:
 * 1. Tone Checker - flags contradictions between events and world state
 * 2. Continuity Checker - catches impossible situations
 * 3. Distribution Auditor - ensures balanced coverage
 * 4. Sensitivity Filter - flags tone-deaf content during crises
 *
 * Output: ctx.summary.validationReport (consumed by Rhea Morgan verification)
 *
 * @version 1.0
 * @tier 6.5
 *
 * v1.0 Initial:
 * - Journalism AI optimization: quality control before publication
 * - Four validator functions
 * - Integration with Phase 6.5 in godWorldEngine2.js
 */

// ============================================================================
// CONSTANTS
// ============================================================================

var VALIDATION_VERSION = '1.0';

// Thresholds
var COVERAGE_IMBALANCE_THRESHOLD = 0.6; // 60% in one neighborhood
var HIGH_SEVERITY_THRESHOLD = 4;
var CRISIS_TONE_DEAF_DOMAINS = ['CELEBRATION', 'LUXURY', 'ENTERTAINMENT'];

// ============================================================================
// MAIN VALIDATOR
// ============================================================================

/**
 * Run all pre-publication validators
 * @param {Object} ctx - cycle context
 * @return {Object} validation report
 */
function runPrePublicationValidation_(ctx) {
  var S = ctx.summary || {};

  var report = {
    timestamp: new Date().toISOString(),
    version: VALIDATION_VERSION,
    toneIssues: checkToneContradictions_(ctx),
    continuityIssues: checkContinuity_(ctx),
    distributionWarnings: checkDistribution_(ctx),
    sensitivityFlags: checkSensitivity_(ctx),
    overallStatus: 'PASS' // will be updated
  };

  // Determine overall status
  var hasHighIssues = report.toneIssues.filter(function(i) { return i.severity === 'HIGH'; }).length > 0
    || report.continuityIssues.filter(function(i) { return i.severity === 'HIGH'; }).length > 0
    || report.sensitivityFlags.filter(function(f) { return f.severity === 'HIGH'; }).length > 0;

  var hasMediumIssues = report.toneIssues.length > 0
    || report.continuityIssues.length > 0
    || report.sensitivityFlags.length > 0;

  if (hasHighIssues) {
    report.overallStatus = 'REVIEW_REQUIRED';
  } else if (hasMediumIssues || report.distributionWarnings) {
    report.overallStatus = 'CAUTION';
  }

  return report;
}

// ============================================================================
// VALIDATOR 1: TONE CHECKER
// ============================================================================

/**
 * Flags contradictions between events and world state
 * Examples:
 * - Outdoor events during rain
 * - Celebrations during health crisis
 * - Luxury events during economic downturn
 *
 * @param {Object} ctx - cycle context
 * @return {Array} array of tone issues
 */
function checkToneContradictions_(ctx) {
  var S = ctx.summary || {};
  var issues = [];

  var weather = S.weather || {};
  var weatherType = weather.type || '';
  var events = Array.isArray(S.worldEvents) ? S.worldEvents : [];
  var healthCrisis = S.healthCrisis || false;
  var civicLoad = S.civicLoad || '';
  var economicMood = S.economicMood || 50;

  for (var i = 0; i < events.length; i++) {
    var evt = events[i];
    var desc = (evt.EventDescription || evt.description || '').toLowerCase();
    var domain = evt.Domain || evt.domain || '';

    // Check weather contradictions
    if (weatherType === 'rain' || weatherType === 'rainy') {
      if (desc.match(/outdoor|picnic|walk|hike|park gathering/i)) {
        issues.push({
          event: evt,
          issue: 'outdoor_activity_during_rain',
          severity: 'MEDIUM',
          message: 'Outdoor event scheduled during rainy weather',
          recommendation: 'Add weather impact to event description or move indoors'
        });
      }
    }

    if (weatherType === 'snow' || weatherType === 'freezing' || weatherType === 'lake-effect') {
      if (desc.match(/outdoor|parade|festival|market/i)) {
        issues.push({
          event: evt,
          issue: 'outdoor_event_during_winter_storm',
          severity: 'HIGH',
          message: 'Outdoor event during hazardous winter conditions',
          recommendation: 'Cancel or postpone event, or add safety warnings'
        });
      }
    }

    // Check crisis contradictions
    if (healthCrisis) {
      if (domain === 'CELEBRATION' || domain === 'ENTERTAINMENT') {
        issues.push({
          event: evt,
          issue: 'celebration_during_health_crisis',
          severity: 'HIGH',
          message: 'Celebration/entertainment event during active health crisis',
          recommendation: 'Add crisis context or modify event to reflect somber mood'
        });
      }

      if (desc.match(/large gathering|crowd|packed/i)) {
        issues.push({
          event: evt,
          issue: 'large_gathering_during_health_crisis',
          severity: 'HIGH',
          message: 'Large gathering during health crisis',
          recommendation: 'Add safety protocols or reduce attendance'
        });
      }
    }

    // Check economic contradictions
    if (economicMood < 40) { // Severe downturn
      if (domain === 'LUXURY' || desc.match(/luxury|expensive|lavish|exclusive/i)) {
        issues.push({
          event: evt,
          issue: 'luxury_during_economic_downturn',
          severity: 'MEDIUM',
          message: 'Luxury/expensive event during economic downturn',
          recommendation: 'Add economic context or tone-deaf warning'
        });
      }
    }

    // Check civic crisis contradictions
    if (civicLoad === 'load-strain' || civicLoad === 'crisis') {
      if (domain === 'CELEBRATION' && !desc.match(/protest|rally|solidarity/i)) {
        issues.push({
          event: evt,
          issue: 'celebration_during_civic_crisis',
          severity: 'MEDIUM',
          message: 'Celebration event while civic institutions under strain',
          recommendation: 'Add civic context or modify tone'
        });
      }
    }
  }

  return issues;
}

// ============================================================================
// VALIDATOR 2: CONTINUITY CHECKER
// ============================================================================

/**
 * Catches impossible situations
 * Examples:
 * - Citizen in two places at once
 * - Status conflicts (hospitalized but attending event)
 * - Age/lifecycle impossibilities
 *
 * @param {Object} ctx - cycle context
 * @return {Array} array of continuity issues
 */
function checkContinuity_(ctx) {
  var S = ctx.summary || {};
  var issues = [];

  var events = Array.isArray(S.worldEvents) ? S.worldEvents : [];

  // Load active citizens if available
  var citizens = [];
  if (typeof loadActiveCitizens_ === 'function') {
    try {
      citizens = loadActiveCitizens_(ctx);
    } catch (e) {
      Logger.log('WARN: checkContinuity_ could not load citizens: ' + e.message);
    }
  }

  // Check for citizen double-booking (same citizen in multiple events same day)
  var citizenEvents = {}; // citizenName -> [event indices]

  for (var i = 0; i < events.length; i++) {
    var evt = events[i];
    var desc = evt.EventDescription || evt.description || '';

    // Extract citizen names from description (simple pattern matching)
    var names = desc.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) || [];

    for (var j = 0; j < names.length; j++) {
      var name = names[j];
      if (!citizenEvents[name]) citizenEvents[name] = [];
      citizenEvents[name].push(i);
    }
  }

  // Flag citizens appearing in multiple events
  for (var citizenName in citizenEvents) {
    var eventIndices = citizenEvents[citizenName];
    if (eventIndices.length > 2) { // Allow 2 events, flag 3+
      issues.push({
        citizenName: citizenName,
        issue: 'citizen_overexposure',
        severity: 'LOW',
        message: citizenName + ' appears in ' + eventIndices.length + ' events this cycle',
        recommendation: 'Consider spreading coverage across more citizens',
        events: eventIndices.map(function(idx) { return events[idx]; })
      });
    }
  }

  // Check for status conflicts if we have citizen data
  for (var c = 0; c < citizens.length; c++) {
    var citizen = citizens[c];
    var status = (citizen.Status || '').toLowerCase();
    var citizenFullName = citizen.FirstName + ' ' + citizen.LastName;

    if (status === 'hospitalized' || status === 'deceased') {
      // Check if they appear in events
      for (var e = 0; e < events.length; e++) {
        var eventDesc = (events[e].EventDescription || events[e].description || '');
        if (eventDesc.indexOf(citizenFullName) !== -1) {
          issues.push({
            citizenName: citizenFullName,
            issue: 'status_conflict',
            severity: 'HIGH',
            message: citizenFullName + ' appears in event but status is ' + status,
            recommendation: 'Update citizen status or remove from event',
            event: events[e]
          });
        }
      }
    }
  }

  return issues;
}

// ============================================================================
// VALIDATOR 3: DISTRIBUTION AUDITOR
// ============================================================================

/**
 * Ensures balanced coverage across neighborhoods and tiers
 *
 * @param {Object} ctx - cycle context
 * @return {Object|null} distribution warning or null
 */
function checkDistribution_(ctx) {
  var S = ctx.summary || {};
  var events = Array.isArray(S.worldEvents) ? S.worldEvents : [];

  if (events.length === 0) return null;

  var byNeighborhood = {};
  var byTier = {};
  var byDomain = {};

  // Count events by neighborhood, tier, domain
  for (var i = 0; i < events.length; i++) {
    var evt = events[i];
    var hood = evt.Neighborhood || evt.neighborhood || 'GENERAL';
    var tier = evt.Tier || evt.tier || 'unknown';
    var domain = evt.Domain || evt.domain || 'GENERAL';

    byNeighborhood[hood] = (byNeighborhood[hood] || 0) + 1;
    byTier[tier] = (byTier[tier] || 0) + 1;
    byDomain[domain] = (byDomain[domain] || 0) + 1;
  }

  // Check for neighborhood imbalance
  for (var hood in byNeighborhood) {
    var percentage = byNeighborhood[hood] / events.length;
    if (percentage > COVERAGE_IMBALANCE_THRESHOLD) {
      return {
        issue: 'coverage_imbalance',
        type: 'neighborhood',
        neighborhood: hood,
        percentage: Math.round(percentage * 100),
        eventCount: byNeighborhood[hood],
        totalEvents: events.length,
        recommendation: 'Consider featuring other neighborhoods for balanced coverage'
      };
    }
  }

  // Check for domain imbalance
  for (var domain in byDomain) {
    var percentage = byDomain[domain] / events.length;
    if (percentage > COVERAGE_IMBALANCE_THRESHOLD) {
      return {
        issue: 'coverage_imbalance',
        type: 'domain',
        domain: domain,
        percentage: Math.round(percentage * 100),
        eventCount: byDomain[domain],
        totalEvents: events.length,
        recommendation: 'Consider diversifying domain coverage'
      };
    }
  }

  return null; // No imbalance detected
}

// ============================================================================
// VALIDATOR 4: SENSITIVITY FILTER
// ============================================================================

/**
 * Flags potentially tone-deaf content during active crises
 *
 * @param {Object} ctx - cycle context
 * @return {Array} array of sensitivity flags
 */
function checkSensitivity_(ctx) {
  var S = ctx.summary || {};
  var flags = [];

  var events = Array.isArray(S.worldEvents) ? S.worldEvents : [];
  var healthCrisis = S.healthCrisis || false;
  var civicLoad = S.civicLoad || '';
  var economicMood = S.economicMood || 50;

  // If health crisis active, flag trivial events
  if (healthCrisis) {
    var trivialDuringCrisis = 0;
    var crisisAwareEvents = 0;

    for (var i = 0; i < events.length; i++) {
      var evt = events[i];
      var domain = evt.Domain || evt.domain || '';
      var desc = (evt.EventDescription || evt.description || '').toLowerCase();

      if (CRISIS_TONE_DEAF_DOMAINS.indexOf(domain) !== -1) {
        if (!desc.match(/health|crisis|safety|caution|canceled|postponed/i)) {
          trivialDuringCrisis++;
        }
      }

      if (desc.match(/health|crisis|hospital|illness|outbreak/i)) {
        crisisAwareEvents++;
      }
    }

    if (trivialDuringCrisis > 2 && crisisAwareEvents === 0) {
      flags.push({
        issue: 'ignoring_health_crisis',
        severity: 'HIGH',
        message: trivialDuringCrisis + ' trivial events during health crisis, 0 crisis-aware events',
        recommendation: 'Add health crisis coverage or modify trivial events to acknowledge crisis'
      });
    }
  }

  // If civic crisis, flag if NO civic events generated
  if (civicLoad === 'load-strain' || civicLoad === 'crisis') {
    var civicEvents = events.filter(function(e) {
      var domain = e.Domain || e.domain || '';
      return domain === 'CIVIC' || domain === 'POLITICAL';
    });

    if (civicEvents.length === 0) {
      flags.push({
        issue: 'ignoring_civic_crisis',
        severity: 'MEDIUM',
        message: 'Civic institutions under strain but no civic coverage',
        recommendation: 'Generate civic/political events to cover the crisis'
      });
    }
  }

  // Economic downturn sensitivity
  if (economicMood < 35) { // Severe downturn
    var economicAwareEvents = events.filter(function(e) {
      var desc = (e.EventDescription || e.description || '').toLowerCase();
      return desc.match(/job|employment|economy|layoff|unemployment|poverty|struggle/i);
    });

    if (economicAwareEvents.length === 0 && events.length > 5) {
      flags.push({
        issue: 'ignoring_economic_crisis',
        severity: 'MEDIUM',
        message: 'Severe economic downturn (mood=' + economicMood + ') but no economic coverage',
        recommendation: 'Add economic impact stories'
      });
    }
  }

  return flags;
}

// ============================================================================
// EXPORT (for use in godWorldEngine2.js)
// ============================================================================

// Main entry point
// Usage in godWorldEngine2.js Phase 6.5:
//   var validationReport = runPrePublicationValidation_(ctx);
//   ctx.summary.validationReport = validationReport;
