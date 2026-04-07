/**
 * ============================================================================
 * applyEditionCoverageEffects_ v1.0 (ES5)
 * ============================================================================
 *
 * Reads Edition_Coverage_Ratings sheet and converts post-publish edition
 * ratings into engine signals: sentiment modifiers, neighborhood effects,
 * coverage triggers, and domain balance.
 *
 * Pattern: follows applySportsFeedTriggers_ — read structured sheet rows,
 * calculate per-entry signals, produce sentiment + neighborhood + trigger
 * outputs that Phase 2 applyCityDynamics consumes.
 *
 * The newspaper covered X. Now the city reacts.
 *
 * Runs in Phase 2 after SportsFeed, before Weather.
 * Sheet populated by Mike (manual) or rateEditionCoverage.js (automated)
 * between edition publish and next cycle run.
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
    Logger.log('applyEditionCoverageEffects_ v1.0: Edition_Coverage_Ratings sheet not found (skipping)');
    return;
  }

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('applyEditionCoverageEffects_ v1.0: No data rows');
    return;
  }

  var headers = data[0];

  // Find column indices
  var cycleCol = findCoverageCol_(headers, ['Cycle', 'cycle']);
  var typeCol = findCoverageCol_(headers, ['SignalType', 'signaltype', 'Type', 'type']);
  var targetCol = findCoverageCol_(headers, ['Target', 'target']);
  var ratingCol = findCoverageCol_(headers, ['Rating', 'rating']);
  var toneCol = findCoverageCol_(headers, ['Tone', 'tone']);
  var hoodsCol = findCoverageCol_(headers, ['AffectedNeighborhoods', 'affectedneighborhoods', 'Neighborhoods']);
  var directionCol = findCoverageCol_(headers, ['SentimentDirection', 'sentimentdirection', 'Direction']);
  var notesCol = findCoverageCol_(headers, ['Notes', 'notes']);
  var processedCol = findCoverageCol_(headers, ['Processed', 'processed']);

  // Current cycle for filtering
  var currentCycle = S.cycleId || S.cycle || 0;
  var prevCycle = currentCycle > 0 ? currentCycle - 1 : 0;

  // Collect unprocessed entries for current or previous cycle
  var entries = [];
  var processedRows = []; // track row indices to mark as processed

  for (var i = 1; i < data.length; i++) {
    var row = data[i];

    // Check if already processed
    if (processedCol !== -1) {
      var proc = (row[processedCol] || '').toString().toUpperCase().trim();
      if (proc === 'TRUE' || proc === 'YES' || proc === '1') continue;
    }

    var cycle = cycleCol !== -1 ? parseInt(row[cycleCol], 10) : 0;
    if (isNaN(cycle) || cycle === 0) continue;

    // Accept current cycle or previous cycle entries
    if (cycle !== currentCycle && cycle !== prevCycle) continue;

    var entry = {
      cycle: cycle,
      signalType: typeCol !== -1 ? (row[typeCol] || '').toString().trim().toUpperCase() : '',
      target: targetCol !== -1 ? (row[targetCol] || '').toString().trim() : '',
      rating: ratingCol !== -1 ? parseInt(row[ratingCol], 10) : 0,
      tone: toneCol !== -1 ? (row[toneCol] || '').toString().trim().toLowerCase() : 'neutral',
      neighborhoods: hoodsCol !== -1 ? (row[hoodsCol] || '').toString().trim() : '',
      direction: directionCol !== -1 ? (row[directionCol] || '').toString().trim().toLowerCase() : '',
      notes: notesCol !== -1 ? (row[notesCol] || '').toString().trim() : ''
    };

    if (isNaN(entry.rating) || entry.rating < 1) entry.rating = 1;
    if (entry.rating > 5) entry.rating = 5;

    entries.push(entry);
    processedRows.push(i + 1); // 1-based row index for sheet
  }

  if (entries.length === 0) {
    Logger.log('applyEditionCoverageEffects_ v1.0: No unprocessed entries for cycle ' + currentCycle);
    return;
  }

  Logger.log('applyEditionCoverageEffects_ v1.0: Processing ' + entries.length + ' coverage ratings');

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESS ENTRIES
  // ═══════════════════════════════════════════════════════════════════════════

  var totalSentiment = 0;
  var neighborhoodEffects = {};
  var coverageTriggers = [];
  var domainBalance = {};

  for (var ei = 0; ei < entries.length; ei++) {
    var e = entries[ei];

    // Convert rating to magnitude
    var magnitude = ratingToMagnitude_(e.rating);

    // Apply tone sign
    var sign = 1;
    if (e.tone === 'negative') sign = -1;
    else if (e.tone === 'mixed') magnitude *= 0.5;
    else if (e.tone === 'neutral') sign = 0;

    // SentimentDirection override
    if (e.direction === 'pressure') sign = -1;
    else if (e.direction === 'uplift') sign = 1;

    var sentimentDelta = magnitude * sign;

    // Parse affected neighborhoods
    var hoods = [];
    if (e.neighborhoods) {
      var parts = e.neighborhoods.split(',');
      for (var hi = 0; hi < parts.length; hi++) {
        var h = parts[hi].trim();
        if (h) hoods.push(h);
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // INITIATIVE signals
    // ─────────────────────────────────────────────────────────────────────
    if (e.signalType === 'INITIATIVE') {
      totalSentiment += sentimentDelta;

      // Neighborhood effects for affected areas
      var activityMag = ratingToActivity_(e.rating);
      for (var ni = 0; ni < hoods.length; ni++) {
        applyHoodEffect_(neighborhoodEffects, hoods[ni], e.tone, activityMag);
      }

      // Coverage trigger for storyHook
      coverageTriggers.push({
        type: 'initiative-coverage',
        target: e.target,
        rating: e.rating,
        tone: e.tone,
        neighborhoods: hoods,
        notes: e.notes
      });

      Logger.log('  INITIATIVE: ' + e.target + ' r' + e.rating + ' ' + e.tone +
        ' → sentiment ' + sentimentDelta.toFixed(3) + ' (' + hoods.join(',') + ')');
    }

    // ─────────────────────────────────────────────────────────────────────
    // NEIGHBORHOOD signals
    // ─────────────────────────────────────────────────────────────────────
    else if (e.signalType === 'NEIGHBORHOOD') {
      totalSentiment += sentimentDelta * 0.5; // neighborhood coverage has less city-wide impact

      var nhoodMag = ratingToActivity_(e.rating);
      applyHoodEffect_(neighborhoodEffects, e.target, e.tone, nhoodMag);

      Logger.log('  NEIGHBORHOOD: ' + e.target + ' r' + e.rating + ' ' + e.tone +
        ' → sentiment ' + (sentimentDelta * 0.5).toFixed(3));
    }

    // ─────────────────────────────────────────────────────────────────────
    // CITIZEN_VISIBILITY signals
    // ─────────────────────────────────────────────────────────────────────
    else if (e.signalType === 'CITIZEN_VISIBILITY') {
      totalSentiment += sentimentDelta * 0.3; // citizen spotlight is local, not city-wide

      // Boost community engagement in citizen's neighborhood
      for (var ci = 0; ci < hoods.length; ci++) {
        if (!neighborhoodEffects[hoods[ci]]) {
          neighborhoodEffects[hoods[ci]] = { traffic: 0, retail: 0, nightlife: 0, publicSpaces: 0, communityEngagement: 0, culturalActivity: 0 };
        }
        neighborhoodEffects[hoods[ci]].communityEngagement += ratingToActivity_(e.rating) * (sign >= 0 ? 1 : -0.5);
        neighborhoodEffects[hoods[ci]].culturalActivity += ratingToActivity_(e.rating) * 0.5;
      }

      coverageTriggers.push({
        type: 'citizen-spotlight',
        target: e.target,
        rating: e.rating,
        tone: e.tone,
        neighborhoods: hoods,
        notes: e.notes
      });

      Logger.log('  CITIZEN: ' + e.target + ' r' + e.rating + ' ' + e.tone +
        ' → engagement boost (' + hoods.join(',') + ')');
    }

    // ─────────────────────────────────────────────────────────────────────
    // DOMAIN_TONE signals
    // ─────────────────────────────────────────────────────────────────────
    else if (e.signalType === 'DOMAIN_TONE') {
      var domain = e.target.toUpperCase();
      domainBalance[domain] = {
        publishedRating: e.rating,
        tone: e.tone,
        sentimentEffect: sentimentDelta * 0.3
      };

      totalSentiment += sentimentDelta * 0.3; // domain tone contributes modestly

      Logger.log('  DOMAIN: ' + domain + ' r' + e.rating + ' ' + e.tone);
    }
  }

  // Clamp total sentiment
  totalSentiment = Math.max(-0.15, Math.min(0.15, totalSentiment));

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE OUTPUTS
  // ═══════════════════════════════════════════════════════════════════════════

  S.editionSentimentBoost = totalSentiment;
  S.editionNeighborhoodEffects = neighborhoodEffects;
  S.editionCoverageTriggers = coverageTriggers;
  S.editionDomainBalance = domainBalance;

  S.editionCoverageEffects = {
    cycle: currentCycle,
    entriesProcessed: entries.length,
    sentimentBoost: totalSentiment,
    neighborhoodCount: Object.keys(neighborhoodEffects).length,
    triggerCount: coverageTriggers.length,
    domainCount: Object.keys(domainBalance).length
  };

  // Apply sentiment to city mood
  if (totalSentiment !== 0) {
    S.sentiment = (S.sentiment || 0) + totalSentiment;
    Logger.log('applyEditionCoverageEffects_ v1.0: Sentiment adjustment: ' + totalSentiment.toFixed(3));
  }

  Logger.log('applyEditionCoverageEffects_ v1.0: Complete. ' + entries.length + ' entries → ' +
    'sentiment ' + totalSentiment.toFixed(3) + ', ' +
    Object.keys(neighborhoodEffects).length + ' neighborhoods, ' +
    coverageTriggers.length + ' triggers');

  // ═══════════════════════════════════════════════════════════════════════════
  // MARK PROCESSED (direct sheet write — documented exception)
  // ═══════════════════════════════════════════════════════════════════════════

  var isDryRun = ctx.mode && ctx.mode.dryRun;
  if (!isDryRun && processedCol !== -1 && processedRows.length > 0) {
    for (var pi = 0; pi < processedRows.length; pi++) {
      sheet.getRange(processedRows[pi], processedCol + 1).setValue('TRUE');
    }
    Logger.log('applyEditionCoverageEffects_ v1.0: Marked ' + processedRows.length + ' rows as processed');
  }

  ctx.summary = S;
}


// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert 1-5 rating to sentiment magnitude.
 * Matches applySportsFeedTriggers_ range: [-0.08, +0.08] per source.
 */
function ratingToMagnitude_(rating) {
  if (rating <= 1) return 0.01;
  if (rating === 2) return 0.02;
  if (rating === 3) return 0.04;
  if (rating === 4) return 0.06;
  return 0.08;
}

/**
 * Convert 1-5 rating to neighborhood activity magnitude.
 * Matches sportsNeighborhoodEffects range: up to 0.15 per metric.
 */
function ratingToActivity_(rating) {
  if (rating <= 1) return 0.02;
  if (rating === 2) return 0.04;
  if (rating === 3) return 0.06;
  if (rating === 4) return 0.10;
  return 0.15;
}

/**
 * Apply neighborhood activity effect based on tone.
 */
function applyHoodEffect_(effects, hood, tone, magnitude) {
  if (!effects[hood]) {
    effects[hood] = { traffic: 0, retail: 0, nightlife: 0, publicSpaces: 0, communityEngagement: 0, culturalActivity: 0 };
  }
  var e = effects[hood];

  if (tone === 'positive') {
    e.retail += magnitude;
    e.communityEngagement += magnitude;
    e.publicSpaces += magnitude * 0.5;
  } else if (tone === 'negative') {
    e.nightlife -= magnitude * 0.5;
    e.publicSpaces -= magnitude;
    e.communityEngagement -= magnitude * 0.3;
  } else if (tone === 'mixed') {
    e.communityEngagement += magnitude * 0.3;
    e.traffic += magnitude * 0.3;
  } else {
    // neutral — activity without sentiment
    e.traffic += magnitude * 0.3;
  }
}

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
