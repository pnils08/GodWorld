/**
 * ============================================================================
 * updateCivicApprovalRatings_ v1.0 (ES5)
 * ============================================================================
 * [engine/sheet] — Phase 27 civic feedback loop
 *
 * Updates Civic_Office_Ledger Approval column based on:
 * 1. Initiative performance in the official's district
 * 2. Edition coverage domain sentiment
 * 3. Baseline decay toward 50 (public memory fades)
 *
 * Approval thresholds create behavioral triggers:
 *   > 80: "popular" — more influence on swing votes
 *   40-80: normal range
 *   < 40: "vulnerable" — more cautious voting (existing veto logic)
 *   < 20: "recall-pressure" — story hook for reporters
 *
 * Runs in Phase 5 after civicInitiativeEngine_.
 * Direct sheet write to Civic_Office_Ledger (documented exception).
 *
 * ============================================================================
 */

function updateCivicApprovalRatings_(ctx) {
  var S = ctx.summary;
  if (!S) S = ctx.summary = {};

  S.approvalChanges = [];

  var ss = ctx.ss;
  if (!ss) return;

  var isDryRun = ctx.mode && ctx.mode.dryRun;

  // ═══════════════════════════════════════════════════════════════════════════
  // READ CIVIC OFFICE LEDGER
  // ═══════════════════════════════════════════════════════════════════════════

  var ledgerSheet = ss.getSheetByName('Civic_Office_Ledger');
  if (!ledgerSheet) {
    Logger.log('updateCivicApprovalRatings_ v1.0: Civic_Office_Ledger not found');
    return;
  }

  var ledgerData = ledgerSheet.getDataRange().getValues();
  if (ledgerData.length < 2) return;

  var lHeaders = ledgerData[0];
  var iOfficeId = findApprCol_(lHeaders, ['OfficeId', 'officeid']);
  var iTitle = findApprCol_(lHeaders, ['Title', 'title']);
  var iDistrict = findApprCol_(lHeaders, ['District', 'district']);
  var iHolder = findApprCol_(lHeaders, ['Holder', 'holder']);
  var iStatus = findApprCol_(lHeaders, ['Status', 'status']);
  var iApproval = findApprCol_(lHeaders, ['Approval', 'approval']);
  var iFaction = findApprCol_(lHeaders, ['Faction', 'faction']);

  if (iApproval === -1) {
    Logger.log('updateCivicApprovalRatings_ v1.0: Approval column not found');
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // READ INITIATIVE TRACKER FOR PERFORMANCE DATA
  // ═══════════════════════════════════════════════════════════════════════════

  var trackerSheet = ss.getSheetByName('Initiative_Tracker');
  var initiatives = [];

  if (trackerSheet) {
    var tData = trackerSheet.getDataRange().getValues();
    if (tData.length >= 2) {
      var tHeaders = tData[0];
      var tName = findApprCol_(tHeaders, ['Name', 'name']);
      var tStatus = findApprCol_(tHeaders, ['Status', 'status']);
      var tPhase = findApprCol_(tHeaders, ['ImplementationPhase', 'implementationphase']);
      var tDomain = findApprCol_(tHeaders, ['PolicyDomain', 'policydomain']);
      var tHoods = findApprCol_(tHeaders, ['AffectedNeighborhoods', 'affectedneighborhoods']);
      var tLead = findApprCol_(tHeaders, ['LeadFaction', 'leadfaction']);
      var tOpp = findApprCol_(tHeaders, ['OppositionFaction', 'oppositionfaction']);

      for (var ti = 1; ti < tData.length; ti++) {
        var tr = tData[ti];
        var initName = tName !== -1 ? (tr[tName] || '').toString().trim() : '';
        if (!initName) continue;

        var phase = tPhase !== -1 ? (tr[tPhase] || '').toString().trim().toLowerCase() : '';

        initiatives.push({
          name: initName,
          status: tStatus !== -1 ? (tr[tStatus] || '').toString().trim().toLowerCase() : '',
          phase: phase,
          domain: tDomain !== -1 ? (tr[tDomain] || '').toString().trim().toLowerCase() : '',
          neighborhoods: tHoods !== -1 ? (tr[tHoods] || '').toString().trim() : '',
          leadFaction: tLead !== -1 ? (tr[tLead] || '').toString().trim().toUpperCase() : '',
          oppFaction: tOpp !== -1 ? (tr[tOpp] || '').toString().trim().toUpperCase() : '',
          performing: isPerforming_(phase),
          failing: isFailing_(phase)
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISTRICT-TO-NEIGHBORHOOD MAP
  // ═══════════════════════════════════════════════════════════════════════════

  var DISTRICT_HOODS = {
    'D1': ['West Oakland', 'Brooklyn'],
    'D2': ['Downtown', 'Chinatown', 'Jack London', 'KONO'],
    'D3': ['Fruitvale', 'San Antonio'],
    'D4': ['Glenview', 'Dimond', 'Ivy Hill'],
    'D5': ['East Oakland', 'Coliseum', 'Elmhurst'],
    'D6': ['Montclair', 'Piedmont Ave'],
    'D7': ['Temescal', 'Rockridge'],
    'D8': ['Lake Merritt', 'Adams Point', 'Grand Lake', 'Eastlake'],
    'D9': ['Laurel', 'Uptown']
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // EDITION COVERAGE DOMAIN BALANCE (from Phase 2)
  // ═══════════════════════════════════════════════════════════════════════════

  var domainBalance = S.editionDomainBalance || {};

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE APPROVAL CHANGES
  // ═══════════════════════════════════════════════════════════════════════════

  var changes = [];
  var approvalTriggers = [];

  for (var li = 1; li < ledgerData.length; li++) {
    var row = ledgerData[li];
    var officeId = iOfficeId !== -1 ? (row[iOfficeId] || '').toString().trim() : '';
    var title = iTitle !== -1 ? (row[iTitle] || '').toString().trim() : '';
    var district = iDistrict !== -1 ? (row[iDistrict] || '').toString().trim().toUpperCase() : '';
    var holder = iHolder !== -1 ? (row[iHolder] || '').toString().trim() : '';
    var status = iStatus !== -1 ? (row[iStatus] || '').toString().trim().toLowerCase() : '';
    var currentApproval = iApproval !== -1 ? parseInt(row[iApproval], 10) : 65;
    var faction = iFaction !== -1 ? (row[iFaction] || '').toString().trim().toUpperCase() : '';

    if (isNaN(currentApproval)) currentApproval = 65;

    // Only process active elected officials and mayor
    if (status !== 'active' && status !== 'recovering') continue;
    if (!officeId || (!officeId.match(/^COUNCIL/) && !officeId.match(/^MAYOR/))) continue;

    var delta = 0;
    var reasons = [];

    // ─────────────────────────────────────────────────────────────────────
    // INITIATIVE PERFORMANCE IN DISTRICT
    // ─────────────────────────────────────────────────────────────────────
    var districtHoods = DISTRICT_HOODS[district] || [];
    var isMayor = officeId.indexOf('MAYOR') === 0;

    for (var ii = 0; ii < initiatives.length; ii++) {
      var init = initiatives[ii];

      // Check if initiative affects this official's district
      var affectsDistrict = false;
      if (isMayor) {
        affectsDistrict = true; // Mayor affected by all initiatives
      } else {
        var initHoods = init.neighborhoods.split(/[,;]+/).map(function(h) { return h.trim().toLowerCase(); });
        for (var dhi = 0; dhi < districtHoods.length; dhi++) {
          if (initHoods.indexOf(districtHoods[dhi].toLowerCase()) >= 0) {
            affectsDistrict = true;
            break;
          }
        }
      }

      if (!affectsDistrict) continue;

      // Faction alignment check
      var supportedByFaction = (init.leadFaction === faction);
      var opposedByFaction = (init.oppFaction === faction);

      if (init.performing) {
        if (supportedByFaction) {
          delta += 3; // Backed a winner in their district
          reasons.push(init.name + ' performing (+3 aligned)');
        } else if (opposedByFaction) {
          delta -= 2; // Opposed something that's working
          reasons.push(init.name + ' performing despite opposition (-2)');
        } else {
          delta += 1; // Neutral benefit
          reasons.push(init.name + ' performing (+1)');
        }
      }

      if (init.failing) {
        if (supportedByFaction) {
          delta -= 4; // Backed a loser in their district
          reasons.push(init.name + ' failing (-4 aligned)');
        } else if (opposedByFaction) {
          delta += 2; // "I told you so" effect
          reasons.push(init.name + ' failing as predicted (+2)');
        } else {
          delta -= 1;
          reasons.push(init.name + ' failing (-1)');
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // MEDIA COVERAGE COMPOUND
    // ─────────────────────────────────────────────────────────────────────
    // If edition coverage of CIVIC domain was negative and this official's
    // faction led the initiative → extra pressure
    if (domainBalance['CIVIC'] && domainBalance['CIVIC'].rating) {
      var civicRating = domainBalance['CIVIC'].rating;
      if (civicRating <= -3) {
        delta -= 2; // Heavy negative civic coverage hurts all officials
        reasons.push('negative civic media (-2)');
      } else if (civicRating >= 3) {
        delta += 1; // Positive civic coverage gives a small lift
        reasons.push('positive civic media (+1)');
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // BASELINE DECAY TOWARD 50
    // ─────────────────────────────────────────────────────────────────────
    if (currentApproval > 50) {
      delta -= 1; // High approval decays
      reasons.push('decay toward 50 (-1)');
    } else if (currentApproval < 50) {
      delta += 1; // Low approval recovers (slowly)
      reasons.push('recovery toward 50 (+1)');
    }

    // ─────────────────────────────────────────────────────────────────────
    // APPLY AND CLAMP
    // ─────────────────────────────────────────────────────────────────────
    var newApproval = Math.max(10, Math.min(95, currentApproval + delta));

    if (newApproval !== currentApproval) {
      changes.push({
        row: li + 1, // 1-based for sheet
        officeId: officeId,
        holder: holder,
        district: district,
        oldApproval: currentApproval,
        newApproval: newApproval,
        delta: delta,
        reasons: reasons
      });

      // Threshold triggers
      if (newApproval < 20 && currentApproval >= 20) {
        approvalTriggers.push({
          type: 'recall-pressure',
          holder: holder,
          district: district,
          approval: newApproval
        });
      }
      if (newApproval < 30 && currentApproval >= 30) {
        approvalTriggers.push({
          type: 'vulnerable',
          holder: holder,
          district: district,
          approval: newApproval
        });
      }
      if (newApproval > 80 && currentApproval <= 80) {
        approvalTriggers.push({
          type: 'popular',
          holder: holder,
          district: district,
          approval: newApproval
        });
      }

      Logger.log('  ' + holder + ' (' + district + '): ' + currentApproval + ' → ' +
        newApproval + ' (Δ' + (delta >= 0 ? '+' : '') + delta + ') ' + reasons.join(', '));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE APPROVAL CHANGES (direct sheet write — documented exception)
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isDryRun && changes.length > 0) {
    for (var ci = 0; ci < changes.length; ci++) {
      var c = changes[ci];
      ledgerSheet.getRange(c.row, iApproval + 1).setValue(c.newApproval);
    }
    Logger.log('updateCivicApprovalRatings_ v1.0: Updated ' + changes.length + ' approval ratings');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DISTRICT SENTIMENT RIPPLE
  // ═══════════════════════════════════════════════════════════════════════════
  // When approval changes, micro-ripple into district neighborhoods

  if (!S.approvalNeighborhoodEffects) S.approvalNeighborhoodEffects = {};

  for (var ai = 0; ai < changes.length; ai++) {
    var ch = changes[ai];
    var dHoods = DISTRICT_HOODS[ch.district] || [];

    // Small sentiment ripple: approval drop → district sentiment dips
    var ripple = ch.delta * 0.003; // +/-0.003 per approval point change

    for (var rhi = 0; rhi < dHoods.length; rhi++) {
      var rHood = dHoods[rhi];
      if (!S.approvalNeighborhoodEffects[rHood]) {
        S.approvalNeighborhoodEffects[rHood] = { sentiment: 0, communityEngagement: 0 };
      }
      S.approvalNeighborhoodEffects[rHood].sentiment += ripple;
      S.approvalNeighborhoodEffects[rHood].communityEngagement += ripple * 0.5;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WRITE OUTPUTS
  // ═══════════════════════════════════════════════════════════════════════════

  S.approvalChanges = changes;
  S.approvalTriggers = approvalTriggers;

  Logger.log('updateCivicApprovalRatings_ v1.0: ' + changes.length + ' officials updated, ' +
    approvalTriggers.length + ' threshold triggers');

  ctx.summary = S;
}


/**
 * Is this ImplementationPhase performing? (positive outcomes)
 */
function isPerforming_(phase) {
  if (!phase) return false;
  var performing = ['disbursement-active', 'dispatch-live', 'construction-active',
    'implementation-active', 'operational', 'complete', 'pilot-active'];
  for (var i = 0; i < performing.length; i++) {
    if (phase.indexOf(performing[i]) >= 0) return true;
  }
  return false;
}

/**
 * Is this ImplementationPhase failing? (negative outcomes)
 */
function isFailing_(phase) {
  if (!phase) return false;
  var failing = ['stalled', 'blocked', 'suspended', 'defunded'];
  for (var i = 0; i < failing.length; i++) {
    if (phase.indexOf(failing[i]) >= 0) return true;
  }
  return false;
}

/**
 * Find column index by possible header names (case-insensitive).
 */
function findApprCol_(headers, possibleNames) {
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
