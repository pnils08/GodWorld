/**
 * ============================================================================
 * applyInitiativeImplementationEffects_ v1.0 (ES5)
 * ============================================================================
 * [engine/sheet] — Phase 27 civic feedback loop
 *
 * Reads ImplementationPhase from Initiative_Tracker and applies ongoing
 * domain-specific effects to AffectedNeighborhoods. Voice agents set
 * ImplementationPhase via applyTrackerUpdates.js; this function makes
 * the engine react to those decisions.
 *
 * A live dispatch program (OARI) affects SAFETY in D1/D3/D5.
 * Active disbursement (Stabilization Fund) affects ECONOMIC in West Oakland.
 * Construction (Baylight) affects SPORTS+ECONOMIC in Jack London.
 *
 * Runs in Phase 2 after EditionCoverage, before Weather.
 *
 * ============================================================================
 */

/**
 * ============================================================================
 * loadCivicVoiceSentiment_ v1.0 (ES5)
 * ============================================================================
 *
 * Reads civic_sentiment_c{XX}.json (written by applyTrackerUpdates.js)
 * and sets S.civicVoiceSentiment for compound effects in
 * applyEditionCoverageEffects_.
 *
 * Run BEFORE applyEditionCoverageEffects_.
 *
 * ============================================================================
 */
function loadCivicVoiceSentiment_(ctx) {
  var S = ctx.summary;
  if (!S) S = ctx.summary = {};

  S.civicVoiceSentiment = 0;

  var currentCycle = S.cycleId || S.cycle || 0;
  if (!currentCycle) return;

  // Try current cycle first, then previous
  var cycles = [currentCycle, currentCycle - 1];
  for (var ci = 0; ci < cycles.length; ci++) {
    var filePath = 'output/civic_sentiment_c' + cycles[ci] + '.json';

    // In Google Apps Script, use DriveApp or UrlFetchApp
    // In Node.js test, use fs
    // For now, use the ctx.fileReader if available, else try global require
    try {
      var content = '';
      if (typeof require !== 'undefined') {
        var fs = require('fs');
        var path = require('path');
        var fullPath = path.resolve(filePath);
        if (fs.existsSync(fullPath)) {
          content = fs.readFileSync(fullPath, 'utf8');
        }
      }

      if (content) {
        var data = JSON.parse(content);
        S.civicVoiceSentiment = data.civicVoiceSentiment || 0;
        Logger.log('loadCivicVoiceSentiment_ v1.0: Loaded sentiment ' +
          S.civicVoiceSentiment + ' from cycle ' + cycles[ci]);
        break;
      }
    } catch (e) {
      // File not found or parse error — try next cycle
    }
  }

  if (S.civicVoiceSentiment === 0) {
    Logger.log('loadCivicVoiceSentiment_ v1.0: No civic sentiment file found (defaulting to 0)');
  }

  ctx.summary = S;
}


function applyInitiativeImplementationEffects_(ctx) {
  var S = ctx.summary;
  if (!S) S = ctx.summary = {};

  S.initiativeImplementationEffects = null;

  var ss = ctx.ss;
  if (!ss) return;

  var sheet = ss.getSheetByName('Initiative_Tracker');
  if (!sheet) {
    Logger.log('applyInitiativeImplementationEffects_ v1.0: Initiative_Tracker not found (skipping)');
    return;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return;

  var headers = data[0];

  // Find columns
  var iName = findImplCol_(headers, ['Name', 'name']);
  var iStatus = findImplCol_(headers, ['Status', 'status']);
  var iPhase = findImplCol_(headers, ['ImplementationPhase', 'implementationphase']);
  var iDomain = findImplCol_(headers, ['PolicyDomain', 'policydomain']);
  var iHoods = findImplCol_(headers, ['AffectedNeighborhoods', 'affectedneighborhoods']);
  var iBudget = findImplCol_(headers, ['Budget', 'budget']);

  // ═══════════════════════════════════════════════════════════════════════════
  // IMPLEMENTATION PHASE → INTENSITY MAPPING
  // ═══════════════════════════════════════════════════════════════════════════

  var PHASE_INTENSITY = {
    'announced': 0,
    'legislation-filed': 0.05,
    'vote-scheduled': 0,
    'vote-ready': 0.15,
    'visioning': 0.1,
    'visioning-complete': 0.15,
    'design-phase': 0.2,
    'construction-planning': 0.3,
    'construction-active': 0.8,
    'implementation-active': 0.8,
    'disbursement-active': 1.0,
    'dispatch-live': 1.0,
    'pilot-active': 0.6,
    'pilot_evaluation': 0.6,
    'operational': 0.9,
    'complete': 0.5,
    'stalled': -0.5,
    'blocked': -0.7,
    'suspended': -0.6,
    'defunded': -1.0
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // POLICY DOMAIN → NEIGHBORHOOD EFFECTS
  // Mirrors applyNeighborhoodRipple_ in civicInitiativeEngine.js
  // ═══════════════════════════════════════════════════════════════════════════

  var DOMAIN_EFFECTS = {
    'health': {
      sentiment: 0.06, communityEngagement: 0.04, publicSpaces: 0.02
    },
    'transit': {
      retail: 0.06, traffic: 0.10, sentiment: 0.04
    },
    'economic': {
      retail: 0.08, sentiment: 0.05, nightlife: 0.03
    },
    'housing': {
      sentiment: 0.08, communityEngagement: 0.06
    },
    'safety': {
      sentiment: 0.05, communityEngagement: 0.03, nightlife: 0.02
    },
    'sports': {
      retail: 0.08, nightlife: 0.06, traffic: 0.05, sentiment: 0.04
    },
    'workforce': {
      sentiment: 0.04, communityEngagement: 0.05, retail: 0.03
    },
    'environment': {
      sentiment: 0.05, publicSpaces: 0.04, communityEngagement: 0.03
    },
    'education': {
      sentiment: 0.04, communityEngagement: 0.05
    }
  };

  var DEFAULT_EFFECTS = {
    sentiment: 0.03, communityEngagement: 0.02
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS EACH INITIATIVE
  // ═══════════════════════════════════════════════════════════════════════════

  var neighborhoodEffects = {};
  var triggers = [];
  var totalSentiment = 0;
  var processed = 0;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    var name = iName !== -1 ? (row[iName] || '').toString().trim() : '';
    var status = iStatus !== -1 ? (row[iStatus] || '').toString().trim().toLowerCase() : '';
    var phase = iPhase !== -1 ? (row[iPhase] || '').toString().trim().toLowerCase() : '';
    var domain = iDomain !== -1 ? (row[iDomain] || '').toString().trim().toLowerCase() : '';
    var hoodsStr = iHoods !== -1 ? (row[iHoods] || '').toString().trim() : '';

    // Skip if no implementation phase set or no name
    if (!phase || !name) continue;

    // Get intensity from phase
    var intensity = PHASE_INTENSITY[phase];
    if (intensity === undefined) {
      // Try partial matching for compound phases
      intensity = 0;
      for (var pk in PHASE_INTENSITY) {
        if (phase.indexOf(pk) >= 0) {
          intensity = PHASE_INTENSITY[pk];
          break;
        }
      }
    }

    // Skip zero-intensity phases
    if (intensity === 0) continue;

    // Get domain effects
    var effects = DOMAIN_EFFECTS[domain] || DEFAULT_EFFECTS;

    // Parse neighborhoods
    var hoods = [];
    if (hoodsStr) {
      var parts = hoodsStr.split(/[,;]+/);
      for (var hi = 0; hi < parts.length; hi++) {
        var h = parts[hi].trim();
        if (h) hoods.push(h);
      }
    }

    if (hoods.length === 0) continue; // Can't apply effects without target neighborhoods

    // Determine sign: positive intensity = benefits, negative = harm
    var sign = intensity >= 0 ? 1 : -1;
    var mag = Math.abs(intensity);

    // Apply effects to each neighborhood
    for (var ni = 0; ni < hoods.length; ni++) {
      var hood = hoods[ni];
      if (!neighborhoodEffects[hood]) {
        neighborhoodEffects[hood] = {
          traffic: 0, retail: 0, nightlife: 0,
          publicSpaces: 0, communityEngagement: 0, sentiment: 0
        };
      }

      var ne = neighborhoodEffects[hood];
      for (var ek in effects) {
        if (effects.hasOwnProperty(ek) && ne.hasOwnProperty(ek)) {
          ne[ek] += effects[ek] * mag * sign;
        }
      }
    }

    // Sentiment contribution (city-wide, scaled by intensity)
    var sentDelta = (effects.sentiment || 0.03) * intensity * 0.5; // half weight for city-wide
    totalSentiment += sentDelta;

    // Generate triggers for high-intensity active phases
    if (mag >= 0.8) {
      triggers.push({
        type: 'initiative-active',
        initiative: name,
        phase: phase,
        domain: domain,
        neighborhoods: hoods,
        intensity: intensity
      });
    }

    // Generate triggers for stalled/blocked
    if (intensity < 0) {
      triggers.push({
        type: 'initiative-stalled',
        initiative: name,
        phase: phase,
        domain: domain,
        neighborhoods: hoods,
        intensity: intensity
      });
    }

    processed++;

    Logger.log('  ' + name + ': ' + phase + ' (' + domain + ') → intensity ' +
      intensity.toFixed(2) + ' → ' + hoods.join(', '));
  }

  // Clamp total sentiment
  totalSentiment = Math.max(-0.15, Math.min(0.15, totalSentiment));

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE OUTPUTS
  // ═══════════════════════════════════════════════════════════════════════════

  S.initiativeImplementationEffects = {
    processed: processed,
    sentimentBoost: totalSentiment,
    neighborhoodCount: Object.keys(neighborhoodEffects).length,
    triggerCount: triggers.length
  };

  // Merge into existing neighborhood effects (don't overwrite)
  if (!S.initiativeNeighborhoodEffects) S.initiativeNeighborhoodEffects = {};
  for (var nh in neighborhoodEffects) {
    if (!S.initiativeNeighborhoodEffects[nh]) {
      S.initiativeNeighborhoodEffects[nh] = neighborhoodEffects[nh];
    } else {
      var existing = S.initiativeNeighborhoodEffects[nh];
      var incoming = neighborhoodEffects[nh];
      for (var mk in incoming) {
        if (incoming.hasOwnProperty(mk)) {
          existing[mk] = (existing[mk] || 0) + incoming[mk];
        }
      }
    }
  }

  // Add initiative triggers to story hooks
  if (!S.initiativeImplementationTriggers) S.initiativeImplementationTriggers = [];
  S.initiativeImplementationTriggers = S.initiativeImplementationTriggers.concat(triggers);

  // Apply sentiment
  if (totalSentiment !== 0) {
    S.sentiment = (S.sentiment || 0) + totalSentiment;
  }

  Logger.log('applyInitiativeImplementationEffects_ v1.0: ' + processed + ' initiatives → ' +
    'sentiment ' + totalSentiment.toFixed(4) + ', ' +
    Object.keys(neighborhoodEffects).length + ' neighborhoods, ' +
    triggers.length + ' triggers');

  ctx.summary = S;
}


/**
 * Find column index by possible header names (case-insensitive).
 */
function findImplCol_(headers, possibleNames) {
  for (var i = 0; i < headers.length; i++) {
    var h = (headers[i] || '').toString().toLowerCase().trim();
    for (var j = 0; j < possibleNames.length; j++) {
      if (h === possibleNames[j].toLowerCase()) {
        return i;
      }
    }
  }
  return -1;
}
