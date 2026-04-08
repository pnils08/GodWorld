/**
 * ============================================================================
 * applyEditionCoverageEffects_ v2.0 (ES5)
 * ============================================================================
 * [engine/sheet] — Phase 27.1 coverage ratings channel
 *
 * Reads per-domain coverage ratings from Edition_Coverage_Ratings sheet
 * and applies media influence to the domain system. Each domain gets a
 * rating from -5 to +5 based on what the newspaper published. The engine
 * uses these ratings as multipliers on domain presence, sentiment, and
 * neighborhood effects.
 *
 * Sheet columns (v2.0):
 *   Cycle | Domain | Rating (-5 to +5) | ArticleCount | Reporter | Tone | Processed
 *
 * Runs in Phase 2 after SportsFeed, before Weather.
 * Sheet populated by rateEditionCoverage.js (automated, post-publish).
 *
 * The newspaper covered X. Now the city reacts.
 *
 * ============================================================================
 */

function applyEditionCoverageEffects_(ctx) {
  var S = ctx.summary;
  if (!S) S = ctx.summary = {};

  // Initialize outputs
  S.editionCoverageEffects = null;
  S.editionSentimentBoost = 0;
  S.editionNeighborhoodEffects = {};
  S.editionCoverageTriggers = [];
  S.editionDomainBalance = {};

  var ss = ctx.ss;
  if (!ss) return;

  var sheet = ss.getSheetByName('Edition_Coverage_Ratings');
  if (!sheet) {
    Logger.log('applyEditionCoverageEffects_ v2.0: Edition_Coverage_Ratings sheet not found (skipping)');
    return;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('applyEditionCoverageEffects_ v2.0: No data rows');
    return;
  }

  var headers = data[0];

  // Find column indices
  var cycleCol = findCoverageCol_(headers, ['Cycle', 'cycle']);
  var domainCol = findCoverageCol_(headers, ['Domain', 'domain']);
  var ratingCol = findCoverageCol_(headers, ['Rating', 'rating']);
  var countCol = findCoverageCol_(headers, ['ArticleCount', 'articlecount', 'Count']);
  var reporterCol = findCoverageCol_(headers, ['Reporter', 'reporter']);
  var toneCol = findCoverageCol_(headers, ['Tone', 'tone']);
  var processedCol = findCoverageCol_(headers, ['Processed', 'processed']);

  // Current cycle for filtering
  var currentCycle = S.cycleId || S.cycle || 0;
  var prevCycle = currentCycle > 0 ? currentCycle - 1 : 0;

  // Collect unprocessed entries for current or previous cycle
  var entries = [];
  var processedRows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Check if already processed
    if (processedCol !== -1) {
      var proc = (row[processedCol] || '').toString().toUpperCase().trim();
      if (proc === 'TRUE' || proc === 'YES' || proc === '1') continue;
    }

    var entryCycle = cycleCol !== -1 ? parseInt(row[cycleCol], 10) : 0;
    if (isNaN(entryCycle) || entryCycle === 0) continue;
    if (entryCycle !== currentCycle && entryCycle !== prevCycle) continue;

    var entry = {
      cycle: entryCycle,
      domain: domainCol !== -1 ? (row[domainCol] || '').toString().trim().toUpperCase() : '',
      rating: ratingCol !== -1 ? parseInt(row[ratingCol], 10) : 0,
      articleCount: countCol !== -1 ? parseInt(row[countCol], 10) : 1,
      reporter: reporterCol !== -1 ? (row[reporterCol] || '').toString().trim() : '',
      tone: toneCol !== -1 ? (row[toneCol] || '').toString().trim().toLowerCase() : 'neutral'
    };

    // Clamp rating to -5..+5
    if (isNaN(entry.rating)) entry.rating = 0;
    entry.rating = Math.max(-5, Math.min(5, entry.rating));

    if (!entry.domain) continue;

    entries.push(entry);
    processedRows.push(i + 1); // 1-based for sheet
  }

  if (entries.length === 0) {
    Logger.log('applyEditionCoverageEffects_ v2.0: No unprocessed entries for cycle ' + currentCycle);
    return;
  }

  Logger.log('applyEditionCoverageEffects_ v2.0: Processing ' + entries.length + ' domain ratings');

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN-SPECIFIC RIPPLE RULES
  // ═══════════════════════════════════════════════════════════════════════════

  // How each domain's rating affects the city
  // sentimentWeight: how much this domain affects overall city mood
  // cooldownMod: how rating affects domain cooldown (positive = stays hot longer)
  // neighborhoodMetrics: which neighborhood metrics get affected
  var DOMAIN_RULES = {
    'CIVIC': {
      sentimentWeight: 1.0,
      cooldownMod: 0.8,
      neighborhoodMetrics: { communityEngagement: 1.0, publicSpaces: 0.5 },
      triggerType: 'civic-media-pressure'
    },
    'CRIME': {
      sentimentWeight: 0.8,
      cooldownMod: 0.6,
      neighborhoodMetrics: { nightlife: -0.5, publicSpaces: -0.8, communityEngagement: 0.3 },
      triggerType: 'crime-awareness'
    },
    'SAFETY': {
      sentimentWeight: 0.8,
      cooldownMod: 0.6,
      neighborhoodMetrics: { nightlife: -0.5, publicSpaces: -0.8, communityEngagement: 0.3 },
      triggerType: 'safety-awareness'
    },
    'SPORTS': {
      sentimentWeight: 0.6,
      cooldownMod: 1.0,
      neighborhoodMetrics: { nightlife: 1.0, retail: 0.8, traffic: 0.5 },
      triggerType: 'sports-energy'
    },
    'CULTURE': {
      sentimentWeight: 0.5,
      cooldownMod: 0.7,
      neighborhoodMetrics: { culturalActivity: 1.0, retail: 0.5, communityEngagement: 0.6 },
      triggerType: 'cultural-momentum'
    },
    'COMMUNITY': {
      sentimentWeight: 0.5,
      cooldownMod: 0.5,
      neighborhoodMetrics: { communityEngagement: 1.0, publicSpaces: 0.5, culturalActivity: 0.3 },
      triggerType: 'community-voice'
    },
    'ECONOMIC': {
      sentimentWeight: 0.7,
      cooldownMod: 0.8,
      neighborhoodMetrics: { retail: 1.0, nightlife: 0.3 },
      triggerType: 'economic-signal'
    },
    'HEALTH': {
      sentimentWeight: 0.6,
      cooldownMod: 0.5,
      neighborhoodMetrics: { communityEngagement: 0.5, publicSpaces: -0.3 },
      triggerType: 'health-awareness'
    },
    'TRANSIT': {
      sentimentWeight: 0.4,
      cooldownMod: 0.5,
      neighborhoodMetrics: { traffic: 1.0, retail: 0.3 },
      triggerType: 'transit-attention'
    },
    'HOUSING': {
      sentimentWeight: 0.7,
      cooldownMod: 0.6,
      neighborhoodMetrics: { communityEngagement: 0.8, publicSpaces: 0.3 },
      triggerType: 'housing-pressure'
    },
    'EDUCATION': {
      sentimentWeight: 0.4,
      cooldownMod: 0.5,
      neighborhoodMetrics: { communityEngagement: 0.6 },
      triggerType: 'education-attention'
    },
    'INFRASTRUCTURE': {
      sentimentWeight: 0.5,
      cooldownMod: 0.6,
      neighborhoodMetrics: { traffic: 0.5, publicSpaces: 0.5 },
      triggerType: 'infrastructure-attention'
    }
  };

  // Default rules for unknown domains
  var DEFAULT_RULE = {
    sentimentWeight: 0.3,
    cooldownMod: 0.5,
    neighborhoodMetrics: { communityEngagement: 0.5 },
    triggerType: 'media-attention'
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS EACH DOMAIN RATING
  // ═══════════════════════════════════════════════════════════════════════════

  var totalSentiment = 0;
  var neighborhoodEffects = {};
  var coverageTriggers = [];
  var domainBalance = {};

  for (var ei = 0; ei < entries.length; ei++) {
    var e = entries[ei];
    var rules = DOMAIN_RULES[e.domain] || DEFAULT_RULE;

    // ─────────────────────────────────────────────────────────────────────
    // SENTIMENT CONTRIBUTION
    // ─────────────────────────────────────────────────────────────────────
    // Rating -5..+5 maps to sentiment delta via weight
    // Base magnitude: rating * 0.015 (so +5 = 0.075, -5 = -0.075 before weight)
    var sentimentDelta = e.rating * 0.015 * rules.sentimentWeight;
    totalSentiment += sentimentDelta;

    // ─────────────────────────────────────────────────────────────────────
    // DOMAIN COOLDOWN MODIFICATION
    // ─────────────────────────────────────────────────────────────────────
    // Positive coverage = domain stays hot (longer cooldown before it fades)
    // Negative coverage = domain stays hot too (controversy keeps it alive)
    // Zero = no cooldown effect
    var cooldownEffect = Math.abs(e.rating) * rules.cooldownMod;

    // ─────────────────────────────────────────────────────────────────────
    // NEIGHBORHOOD EFFECTS (city-wide, distributed)
    // ─────────────────────────────────────────────────────────────────────
    // Media coverage affects the whole city, not specific neighborhoods
    // Use a generic "city" key; Phase 2 applyCityDynamics distributes
    var activityMag = Math.abs(e.rating) * 0.02; // +5 = 0.10, moderate effect
    var sign = e.rating >= 0 ? 1 : -1;

    if (!neighborhoodEffects['city']) {
      neighborhoodEffects['city'] = {
        traffic: 0, retail: 0, nightlife: 0,
        publicSpaces: 0, communityEngagement: 0, culturalActivity: 0
      };
    }

    var metrics = rules.neighborhoodMetrics;
    for (var mk in metrics) {
      if (metrics.hasOwnProperty(mk)) {
        var metricWeight = metrics[mk];
        // For negative-signed metrics (like crime reducing nightlife),
        // the sign flips: negative crime coverage = more nightlife reduction
        if (metricWeight < 0) {
          neighborhoodEffects['city'][mk] += activityMag * Math.abs(metricWeight) * sign * -1;
        } else {
          neighborhoodEffects['city'][mk] += activityMag * metricWeight * sign;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // COVERAGE TRIGGER (for story hooks next cycle)
    // ─────────────────────────────────────────────────────────────────────
    // Only generate triggers for strong ratings (|rating| >= 3)
    if (Math.abs(e.rating) >= 3) {
      coverageTriggers.push({
        type: rules.triggerType,
        domain: e.domain,
        rating: e.rating,
        tone: e.tone,
        articleCount: e.articleCount,
        reporter: e.reporter
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // DOMAIN BALANCE RECORD
    // ─────────────────────────────────────────────────────────────────────
    domainBalance[e.domain] = {
      rating: e.rating,
      tone: e.tone,
      articleCount: e.articleCount,
      sentimentEffect: sentimentDelta,
      cooldownEffect: cooldownEffect
    };

    Logger.log('  ' + e.domain + ': r' + e.rating + ' ' + e.tone +
      ' → sentiment ' + sentimentDelta.toFixed(4) +
      ', cooldown +' + cooldownEffect.toFixed(2) +
      ' (' + e.articleCount + ' articles)');
  }

  // Clamp total sentiment to prevent runaway
  totalSentiment = Math.max(-0.20, Math.min(0.20, totalSentiment));

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPOUND WITH VOICE AGENT SENTIMENT
  // ═══════════════════════════════════════════════════════════════════════════
  // If civic voices AND civic media both point the same direction, amplify
  var voiceSentiment = S.civicVoiceSentiment || 0;
  if (voiceSentiment !== 0 && domainBalance['CIVIC']) {
    var civicMediaSign = domainBalance['CIVIC'].rating >= 0 ? 1 : -1;
    var voiceSign = voiceSentiment >= 0 ? 1 : -1;

    if (civicMediaSign === voiceSign) {
      // Same direction — compound by 25%
      var compound = Math.abs(domainBalance['CIVIC'].sentimentEffect) * 0.25 * civicMediaSign;
      totalSentiment += compound;
      Logger.log('  COMPOUND: civic voice + civic media aligned (' +
        (civicMediaSign > 0 ? 'positive' : 'negative') + ') → +' + compound.toFixed(4));
    }
  }

  // Re-clamp after compound
  totalSentiment = Math.max(-0.25, Math.min(0.25, totalSentiment));

  // ═══════════════════════════════════════════════════════════════════════════
  // APPLY DOMAIN COOLDOWN EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  // Modify existing domain cooldowns based on media coverage
  var cooldowns = S.domainCooldowns || {};
  for (var dk in domainBalance) {
    if (domainBalance.hasOwnProperty(dk) && domainBalance[dk].cooldownEffect > 0) {
      if (cooldowns[dk] !== undefined) {
        // Extend cooldown — media keeps the topic alive
        cooldowns[dk] = Math.max(0, cooldowns[dk] + domainBalance[dk].cooldownEffect);
      }
    }
  }
  S.domainCooldowns = cooldowns;

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE OUTPUTS
  // ═══════════════════════════════════════════════════════════════════════════

  S.editionSentimentBoost = totalSentiment;
  S.editionNeighborhoodEffects = neighborhoodEffects;
  S.editionCoverageTriggers = coverageTriggers;
  S.editionDomainBalance = domainBalance;

  S.editionCoverageEffects = {
    cycle: currentCycle,
    domainsProcessed: entries.length,
    sentimentBoost: totalSentiment,
    triggerCount: coverageTriggers.length,
    domainCount: Object.keys(domainBalance).length,
    compoundApplied: voiceSentiment !== 0 && domainBalance['CIVIC'] !== undefined
  };

  // Apply sentiment to city mood
  if (totalSentiment !== 0) {
    S.sentiment = (S.sentiment || 0) + totalSentiment;
    Logger.log('applyEditionCoverageEffects_ v2.0: Sentiment adjustment: ' + totalSentiment.toFixed(4));
  }

  Logger.log('applyEditionCoverageEffects_ v2.0: Complete. ' + entries.length + ' domains → ' +
    'sentiment ' + totalSentiment.toFixed(4) + ', ' +
    coverageTriggers.length + ' triggers, ' +
    Object.keys(domainBalance).length + ' domain balance entries');

  // ═══════════════════════════════════════════════════════════════════════════
  // MARK PROCESSED (direct sheet write — documented exception)
  // ═══════════════════════════════════════════════════════════════════════════

  var isDryRun = ctx.mode && ctx.mode.dryRun;
  if (!isDryRun && processedCol !== -1 && processedRows.length > 0) {
    for (var pi = 0; pi < processedRows.length; pi++) {
      sheet.getRange(processedRows[pi], processedCol + 1).setValue('TRUE');
    }
    Logger.log('applyEditionCoverageEffects_ v2.0: Marked ' + processedRows.length + ' rows as processed');
  }

  ctx.summary = S;
}


// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find column index by possible header names (case-insensitive).
 */
function findCoverageCol_(headers, possibleNames) {
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
