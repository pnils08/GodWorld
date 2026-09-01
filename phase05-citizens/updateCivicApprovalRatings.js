/**
 * ============================================================================
 * updateCivicApprovalRatings_ v1.5 (ES5)
 * ============================================================================
 * [engine/sheet] — Phase 27 civic feedback loop
 *
 * v1.1 (S204 B2 / 2026-05-06):
 * - Approval cell writes routed through queueCellIntent_ (Phase 42 B2). Prior
 *   pattern: per-change ledgerSheet.getRange(c.row, iApproval+1).setValue
 *   (direct sheet write, documented exception). Now queues per-cell intents
 *   committed at Phase 10. isDryRun guard preserved.
 *
 * v1.2 (engine.94 Task 5 / 2026-08-09):
 * - Adds the World_Config-driven sustained-high-approval ceiling.
 * - Persists per-office streak + owned scandal lifecycle in Civic_Office_Ledger.
 * - Emits a deterministic story/ripple hook and an immediate approval drop
 *   when the seeded scandal roll fires. Manual scandal statuses are untouched.
 *
 * v1.3 (Mike-direct 2026-08-13): C103 proof — 6 unfinished initiatives,
 * Mayor clamped at 95. Live-sounding phases were scored as wins. Now:
 * nothing is free, only `complete` credits, non-committal never raises,
 * silence (overdue NextActionCycle / no scheduled action) is the biggest drain.
 *
 * Updates Civic_Office_Ledger Approval column based on:
 * 1. Did they MOVE the initiative this cycle (complete / chose-fail / sit / silence)
 * 2. Negative edition coverage (positive coverage no longer pays)
 * 3. High-approval decay toward 50 (no free recovery when low)
 *
 * Approval thresholds create behavioral triggers:
 *   > 80: "popular" — more influence on swing votes
 *   40-80: normal range
 *   < 40: "vulnerable" — more cautious voting (existing veto logic)
 *   < 20: "recall-pressure" — and they leave office (v1.4)
 *
 * v1.4 (Mike-direct 2026-08-13): approval is in-world fitness AND out-of-world
 * cron fitness. A low number means this citizen/node is not built to run the
 * city. Repeated refusal to move the sim removes them from office — the cron
 * that will not push is not kept in the chair. Status=vacant, Holder=TBD,
 * VotingPower=vacant. Media covers the departure, not the stall.
 *
 * v1.5 (Mike-direct 2026-08-13): demotion, not election. Crossing 40 starts a
 * citizen campaign (deterministic challenger from the ledger). Crossing 20
 * seats that challenger. No election window. The vote is the drop.
 *
 * v1.6: never leave a seat empty by default. In-ledger bar is the 8 dials
 * (Drive to want it, Integrity to hold it, Composure to sit it) plus adult
 * non-T1 non-CIV. Generic_Citizens is a name/occupation feeder. If neither
 * presents, mint an out-of-town arrival with civic-challenger dial defaults.
 * Vacant is only the designed crisis when the ledger itself is missing.
 *
 * Runs in Phase 5 after civicInitiativeEngine_.
 *
 * ============================================================================
 */

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

function getApprovalCeilingConfig_(ctx) {
  if (ctx && ctx._approvalCeilingConfig) return ctx._approvalCeilingConfig;
  var source = ctx && ctx.config;
  if (!source) throw new Error('approval ceiling: ctx.config required');

  var required = function(key, min, max, integer) {
    var raw = source[key];
    var value = Number(raw);
    if (raw === '' || raw === null || raw === undefined || !isFinite(value) ||
        value < min || value > max || (integer && Math.floor(value) !== value)) {
      throw new Error('approval ceiling: invalid or missing World_Config.' + key);
    }
    return value;
  };

  var config = {
    threshold: required('approvalCeilingThreshold', 1, 100, false),
    minStreakCycles: required('approvalCeilingMinStreakCycles', 1, 1000, true),
    baseChance: required('approvalCeilingBaseChance', 0, 1, false),
    chanceStep: required('approvalCeilingChanceStep', 0, 1, false),
    maxChance: required('approvalCeilingMaxChance', 0, 1, false),
    scandalDurationCycles: required('approvalCeilingScandalDurationCycles', 1, 1000, true),
    approvalDrop: required('approvalCeilingApprovalDrop', 0, 100, false),
    electionPenalty: required('approvalCeilingElectionPenalty', 0, 100, false)
  };
  if (config.baseChance > config.maxChance) {
    throw new Error('approval ceiling: World_Config.approvalCeilingBaseChance exceeds approvalCeilingMaxChance');
  }
  if (ctx) ctx._approvalCeilingConfig = config;
  return config;
}

function resolveApprovalCeilingLifecycle_(state, cycle) {
  var out = {
    status: String(state.status || '').toLowerCase(),
    highStreak: Math.max(0, Math.floor(Number(state.highStreak) || 0)),
    untilCycle: state.untilCycle === '' || state.untilCycle === null || state.untilCycle === undefined ? '' : Number(state.untilCycle),
    source: String(state.source || ''),
    blocked: false,
    recovered: false,
    staleOwnedStateCleared: false
  };

  if (out.source === 'approval-ceiling') {
    if (out.status === 'scandal') {
      if (!isFinite(out.untilCycle) || Math.floor(out.untilCycle) !== out.untilCycle) {
        throw new Error('approval ceiling: invalid AutoScandalUntilCycle');
      }
      if (cycle > out.untilCycle) {
        out.status = 'active';
        out.highStreak = 0;
        out.untilCycle = '';
        out.source = '';
        out.recovered = true;
      } else {
        out.highStreak = 0;
        out.blocked = true;
        return out;
      }
    } else {
      // Another writer changed Status. Clear only state owned by this mechanic;
      // never overwrite the external/manual status.
      out.highStreak = 0;
      out.untilCycle = '';
      out.source = '';
      out.staleOwnedStateCleared = true;
    }
  }

  if (out.status !== 'active' && out.status !== 'recovering') {
    out.highStreak = 0;
    out.blocked = true;
  }
  return out;
}

function applyApprovalCeilingRisk_(state, config, rng) {
  var out = {
    cycle: state.cycle,
    status: state.status,
    approval: state.approval,
    highStreak: state.highStreak,
    untilCycle: state.untilCycle,
    source: state.source,
    chance: 0,
    roll: null,
    triggered: false
  };

  if (out.status !== 'active') {
    out.highStreak = 0;
    return out;
  }
  out.highStreak = out.approval >= config.threshold ? out.highStreak + 1 : 0;
  if (out.highStreak < config.minStreakCycles) return out;

  out.chance = Math.min(config.maxChance,
    config.baseChance + (out.highStreak - config.minStreakCycles) * config.chanceStep);
  out.roll = rng();
  if (out.roll >= out.chance) return out;

  out.triggered = true;
  out.approval = Math.max(10, out.approval - config.approvalDrop);
  out.status = 'scandal';
  out.highStreak = 0;
  out.untilCycle = out.cycle + config.scandalDurationCycles - 1;
  out.source = 'approval-ceiling';
  return out;
}

function updateCivicApprovalRatings_(ctx) {
  var S = ctx.summary;
  if (!S) S = ctx.summary = {};

  S.approvalChanges = [];
  S.approvalCeilingEvents = [];
  S.officeDepartures = [];
  S.civicCampaigns = [];

  var ceilingConfig = getApprovalCeilingConfig_(ctx);
  var rng = safeRand_(ctx);
  var cycle = Number(S.absoluteCycle || S.cycleId || ctx.config.cycleCount || 0);

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
  var iPopId = findApprCol_(lHeaders, ['PopId', 'popid']);
  var iStatus = findApprCol_(lHeaders, ['Status', 'status']);
  var iApproval = findApprCol_(lHeaders, ['Approval', 'approval']);
  var iFaction = findApprCol_(lHeaders, ['Faction', 'faction']);
  var iHighStreak = findApprCol_(lHeaders, ['HighApprovalStreak', 'highapprovalstreak']);
  var iAutoUntil = findApprCol_(lHeaders, ['AutoScandalUntilCycle', 'autoscandaluntilcycle']);
  var iAutoSource = findApprCol_(lHeaders, ['AutoScandalSource', 'autoscandalsource']);
  var iVotingPower = findApprCol_(lHeaders, ['VotingPower', 'votingpower']);
  var iNotes = findApprCol_(lHeaders, ['Notes', 'notes']);

  var requiredColumns = [
    ['Status', iStatus], ['Approval', iApproval], ['HighApprovalStreak', iHighStreak],
    ['AutoScandalUntilCycle', iAutoUntil], ['AutoScandalSource', iAutoSource]
  ];
  for (var rc = 0; rc < requiredColumns.length; rc++) {
    if (requiredColumns[rc][1] === -1) {
      throw new Error('approval ceiling: Civic_Office_Ledger missing ' + requiredColumns[rc][0]);
    }
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
      var tNext = findApprCol_(tHeaders, ['NextActionCycle', 'nextactioncycle']);

      for (var ti = 1; ti < tData.length; ti++) {
        var tr = tData[ti];
        var initName = tName !== -1 ? (tr[tName] || '').toString().trim() : '';
        if (!initName) continue;

        var phase = tPhase !== -1 ? (tr[tPhase] || '').toString().trim().toLowerCase() : '';
        var nextRaw = tNext !== -1 ? tr[tNext] : '';
        var nextActionCycle = parseInt(nextRaw, 10);
        if (isNaN(nextActionCycle)) nextActionCycle = null;

        initiatives.push({
          name: initName,
          status: tStatus !== -1 ? (tr[tStatus] || '').toString().trim().toLowerCase() : '',
          phase: phase,
          nextActionCycle: nextActionCycle,
          domain: tDomain !== -1 ? (tr[tDomain] || '').toString().trim().toLowerCase() : '',
          neighborhoods: tHoods !== -1 ? (tr[tHoods] || '').toString().trim() : '',
          leadFaction: tLead !== -1 ? (tr[tLead] || '').toString().trim().toUpperCase() : '',
          oppFaction: tOpp !== -1 ? (tr[tOpp] || '').toString().trim().toUpperCase() : '',
          motion: classifyInitiativeMotion_(phase, nextActionCycle, cycle)
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EDITION COVERAGE DOMAIN BALANCE (from Phase 2)
  // ═══════════════════════════════════════════════════════════════════════════

  var domainBalance = S.editionDomainBalance || {};

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE APPROVAL CHANGES
  // ═══════════════════════════════════════════════════════════════════════════

  var occupiedPopIds = {};
  for (var op = 1; op < ledgerData.length; op++) {
    var opPop = iPopId !== -1 ? String(ledgerData[op][iPopId] || '').trim() : '';
    var opStatus = iStatus !== -1 ? String(ledgerData[op][iStatus] || '').trim().toLowerCase() : '';
    if (opPop && opStatus !== 'vacant') occupiedPopIds[opPop] = true;
  }

  var changes = [];
  var approvalTriggers = [];
  var ceilingWrites = [];

  var planCeilingWrite = function(rowNumber, columnIndex, before, after, reason) {
    var beforeNorm = before === null || before === undefined ? '' : String(before);
    var afterNorm = after === null || after === undefined ? '' : String(after);
    if (beforeNorm === afterNorm) return;
    ceilingWrites.push({ row: rowNumber, col: columnIndex + 1, value: after, reason: reason });
  };

  for (var li = 1; li < ledgerData.length; li++) {
    var row = ledgerData[li];
    var officeId = iOfficeId !== -1 ? (row[iOfficeId] || '').toString().trim() : '';
    var title = iTitle !== -1 ? (row[iTitle] || '').toString().trim() : '';
    var district = iDistrict !== -1 ? (row[iDistrict] || '').toString().trim().toUpperCase() : '';
    var holder = iHolder !== -1 ? (row[iHolder] || '').toString().trim() : '';
    var status = iStatus !== -1 ? (row[iStatus] || '').toString().trim().toLowerCase() : '';
    var currentApproval = iApproval !== -1 ? parseInt(row[iApproval], 10) : 65;
    var faction = iFaction !== -1 ? (row[iFaction] || '').toString().trim().toUpperCase() : '';
    var currentHighStreak = row[iHighStreak];
    var currentAutoUntil = row[iAutoUntil];
    var currentAutoSource = row[iAutoSource];

    if (isNaN(currentApproval)) currentApproval = 65;

    // Only process active elected officials and mayor
    if (!officeId || (!officeId.match(/^COUNCIL/) && !officeId.match(/^MAYOR/))) continue;
    if (status === 'vacant') continue;

    var lifecycle = resolveApprovalCeilingLifecycle_({
      status: status,
      highStreak: currentHighStreak,
      untilCycle: currentAutoUntil,
      source: currentAutoSource
    }, cycle);
    status = lifecycle.status;

    if (lifecycle.blocked) {
      planCeilingWrite(li + 1, iStatus, row[iStatus], status,
        'approval ceiling status state');
      planCeilingWrite(li + 1, iHighStreak, currentHighStreak, lifecycle.highStreak,
        'approval ceiling streak state');
      planCeilingWrite(li + 1, iAutoUntil, currentAutoUntil, lifecycle.untilCycle,
        'approval ceiling expiry state');
      planCeilingWrite(li + 1, iAutoSource, currentAutoSource, lifecycle.source,
        'approval ceiling source state');
      continue;
    }

    var delta = 0;
    var reasons = [];
    var silenceOwned = 0;
    var silenceNearby = 0; // v1.7 — non-owned district silence, own ladder

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

      var owns = isMayor || supportedByFaction;
      var scored = approvalDeltaForInitiative_(init.motion, owns, opposedByFaction);
      // v1.7: diminishing silence stacking. Silence on an owned initiative
      // scores -6 / -3 / -2 / -1 / 0... in portfolio order, so the per-cycle
      // fall is bounded (~-12 from silence) and the removal verdict comes
      // from REPEATED silence across cycles (v1.4's own bar), not from
      // portfolio width — a 6-initiative Mayor was losing 37 points in one
      // cycle, a one-cycle near-removal. Non-silence deltas are unchanged.
      if (init.motion === 'silence') {
        var ladder = owns ? [-6, -3, -2, -1] : [-4, -2, -1];
        var seen = owns ? silenceOwned : silenceNearby;
        var dimDelta = seen < ladder.length ? ladder[seen] : 0;
        delta += dimDelta;
        reasons.push(init.name + ' silence (' + (dimDelta || '0, capped') + ')');
        if (owns) silenceOwned++; else silenceNearby++;
      } else {
        delta += scored.delta;
        reasons.push(init.name + ' ' + scored.reason);
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
      }
      // v1.3: positive coverage does not pay. Non-committal never raises.
    }

    // ─────────────────────────────────────────────────────────────────────
    // BASELINE DECAY TOWARD 50
    // ─────────────────────────────────────────────────────────────────────
    if (currentApproval > 50) {
      delta -= 1; // High approval decays
      reasons.push('decay toward 50 (-1)');
    }
    // v1.3: no free recovery toward 50. They rise only by completing work.

    // ─────────────────────────────────────────────────────────────────────
    // APPLY AND CLAMP
    // ─────────────────────────────────────────────────────────────────────
    var newApproval = Math.max(10, Math.min(95, currentApproval + delta));
    var ceiling = applyApprovalCeilingRisk_({
      cycle: cycle,
      status: status,
      approval: newApproval,
      highStreak: lifecycle.highStreak,
      untilCycle: lifecycle.untilCycle,
      source: lifecycle.source
    }, ceilingConfig, rng);

    if (ceiling.triggered) {
      reasons.push('sustained high approval scandal (-' + ceilingConfig.approvalDrop + ')');
      newApproval = ceiling.approval;
      delta = newApproval - currentApproval;

      var hook = {
        hookType: 'CIVIC_APPROVAL_SCANDAL',
        severity: 7,
        description: holder + ' entered scandal status after ' +
          (lifecycle.highStreak + 1) + ' consecutive Cycles at or above ' + ceilingConfig.threshold + ' approval',
        cycleGenerated: cycle,
        popid: iPopId !== -1 ? (row[iPopId] || '').toString().trim() : '',
        officeId: officeId,
        approval: newApproval,
        chance: ceiling.chance
      };
      S.storyHooks = S.storyHooks || [];
      S.storyHooks.push(hook);
      S.approvalCeilingEvents.push(hook);
      if (!isDryRun && typeof recordHookRipple_ === 'function') {
        recordHookRipple_(ctx, 'approval-ceiling', hook, 'updateCivicApprovalRatings');
      }
    }

    var priorNotes = iNotes !== -1 ? (row[iNotes] || '').toString() : '';
    var campaign = parseCampaignNote_(priorNotes);
    var incumbentPop = iPopId !== -1 ? (row[iPopId] || '').toString().trim() : '';
    if (shouldStartCampaign_(status, newApproval, campaign)) {
      var picked = pickCampaignChallenger_(ctx, district, incumbentPop, occupiedPopIds, officeId, cycle);
      if (picked) {
        campaign = { pop: picked.popId, name: picked.name, since: cycle };
        occupiedPopIds[picked.popId] = true;
        reasons.push('campaign started: ' + picked.name);
      }
    }
    if (campaign) {
      S.civicCampaigns.push({
        officeId: officeId, district: district, incumbent: holder,
        challengerPopId: campaign.pop, challengerName: campaign.name,
        since: campaign.since, approval: newApproval
      });
    }

    var leaving = shouldLeaveOffice_(status, newApproval, currentApproval, silenceOwned);
    var seating = leaving && campaign;
    var nextStatus = leaving && !seating ? 'vacant' : (leaving && seating ? 'active' : ceiling.status);

    planCeilingWrite(li + 1, iStatus, row[iStatus], nextStatus,
      seating ? 'demoted — challenger seated' :
        (leaving ? 'left office — unfit to run the city' :
          (ceiling.triggered ? 'approval ceiling scandal triggered' :
            (lifecycle.recovered ? 'approval ceiling scandal expired' : 'approval ceiling status state'))));
    planCeilingWrite(li + 1, iHighStreak, currentHighStreak, ceiling.highStreak,
      'approval ceiling streak update');
    planCeilingWrite(li + 1, iAutoUntil, currentAutoUntil, ceiling.untilCycle,
      'approval ceiling expiry update');
    planCeilingWrite(li + 1, iAutoSource, currentAutoSource, ceiling.source,
      'approval ceiling source update');

    if (campaign && !leaving && iNotes !== -1) {
      var kept = formatCampaignNote_(campaign, stripCampaignNote_(priorNotes));
      planCeilingWrite(li + 1, iNotes, row[iNotes], kept, 'challenger campaign');
    }
    if (campaign && !leaving && campaign.since === cycle) {
      var campHook = {
        hookType: 'CIVIC_CHALLENGER_CAMPAIGN',
        severity: 6,
        description: campaign.name + ' began campaigning to replace ' + holder +
          ' (approval ' + newApproval + ')',
        cycleGenerated: cycle,
        popid: campaign.pop,
        officeId: officeId,
        approval: newApproval
      };
      approvalTriggers.push({
        type: 'campaign', holder: holder, district: district,
        approval: newApproval, challenger: campaign.name, challengerPopId: campaign.pop
      });
      S.storyHooks = S.storyHooks || [];
      S.storyHooks.push(campHook);
      if (!isDryRun && typeof recordHookRipple_ === 'function') {
        recordHookRipple_(ctx, 'challenger-campaign', campHook, 'updateCivicApprovalRatings');
      }
      Logger.log('  CAMPAIGN ' + campaign.name + ' vs ' + holder + ' (' + officeId + ')');
    }

    if (leaving) {
      if (seating) {
        if (iHolder !== -1) {
          planCeilingWrite(li + 1, iHolder, holder, campaign.name, 'demotion — challenger seated');
        }
        if (iPopId !== -1) {
          planCeilingWrite(li + 1, iPopId, row[iPopId], campaign.pop, 'demotion — challenger pop');
        }
        if (iVotingPower !== -1) {
          planCeilingWrite(li + 1, iVotingPower, row[iVotingPower], 'yes', 'demotion — successor votes');
        }
        if (iApproval !== -1) {
          newApproval = 50;
          planCeilingWrite(li + 1, iApproval, currentApproval, 50, 'demotion — successor starts at 50');
        }
        if (iNotes !== -1) {
          var seated = 'C' + cycle + ': ' + holder + ' demoted (approval dropped to unfit). ' +
            campaign.name + ' (' + campaign.pop + ') seated from campaign since C' + campaign.since + '.';
          planCeilingWrite(li + 1, iNotes, row[iNotes],
            seated + (stripCampaignNote_(priorNotes) ? ' | ' + stripCampaignNote_(priorNotes) : ''),
            'demotion — record');
        }
      } else {
        if (iHolder !== -1) {
          planCeilingWrite(li + 1, iHolder, holder, 'TBD', 'left office — seat vacant');
        }
        if (iVotingPower !== -1) {
          planCeilingWrite(li + 1, iVotingPower, row[iVotingPower], 'vacant', 'left office — no vote');
        }
        if (iNotes !== -1) {
          var former = 'C' + cycle + ': ' + holder + ' left office (approval ' +
            newApproval + ', silence on ' + silenceOwned +
            ' initiative(s)). Repeated refusal to move the city.';
          planCeilingWrite(li + 1, iNotes, row[iNotes],
            former + (stripCampaignNote_(priorNotes) ? ' | ' + stripCampaignNote_(priorNotes) : ''),
            'left office — record');
        }
      }
      var departure = {
        type: seating ? 'demoted' : 'left-office',
        holder: holder,
        popid: incumbentPop,
        officeId: officeId,
        district: district,
        approval: newApproval,
        silenceOwned: silenceOwned,
        cycle: cycle,
        successor: seating ? { pop: campaign.pop, name: campaign.name } : null
      };
      approvalTriggers.push(departure);
      S.officeDepartures.push(departure);
      var leaveHook = {
        hookType: seating ? 'CIVIC_DEMOTION' : 'CIVIC_LEFT_OFFICE',
        severity: 8,
        description: seating
          ? holder + ' demoted — ' + campaign.name + ' takes the seat'
          : holder + ' left office — approval ' + newApproval +
            ' after repeated failure to move the city',
        cycleGenerated: cycle,
        popid: seating ? campaign.pop : departure.popid,
        officeId: officeId,
        approval: newApproval
      };
      S.storyHooks = S.storyHooks || [];
      S.storyHooks.push(leaveHook);
      if (!isDryRun && typeof recordHookRipple_ === 'function') {
        recordHookRipple_(ctx, seating ? 'demotion' : 'left-office', leaveHook, 'updateCivicApprovalRatings');
      }
      Logger.log('  ' + (seating ? 'DEMOTED' : 'LEFT OFFICE') + ' ' + holder +
        ' (' + officeId + ')' + (seating ? ' → ' + campaign.name : '') +
        ' approval=' + newApproval + ' silenceOwned=' + silenceOwned);
    }

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
      if (newApproval < 40 && currentApproval >= 40) {
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
  // WRITE APPROVAL CHANGES (v1.1: queueCellIntent_, committed at Phase 10)
  // ═══════════════════════════════════════════════════════════════════════════

  if (!isDryRun && changes.length > 0) {
    for (var ci = 0; ci < changes.length; ci++) {
      var c = changes[ci];
      queueCellIntent_(ctx, 'Civic_Office_Ledger', c.row, iApproval + 1, c.newApproval,
        'approval rating update', 'civic');
    }
    Logger.log('updateCivicApprovalRatings_ v1.1: Queued ' + changes.length + ' approval rating updates');
  }
  if (!isDryRun && ceilingWrites.length > 0) {
    for (var cwi = 0; cwi < ceilingWrites.length; cwi++) {
      var cw = ceilingWrites[cwi];
      queueCellIntent_(ctx, 'Civic_Office_Ledger', cw.row, cw.col, cw.value,
        cw.reason, 'civic');
    }
    Logger.log('updateCivicApprovalRatings_ v1.2: Queued ' + ceilingWrites.length +
      ' approval ceiling state updates');
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

    // engine.45 T1: persist approval delta + its reasons[] — the sheet stores only the
    // clamped number; the causing initiatives were ctx-transient (trace C5/G3).
    if (!isDryRun && typeof recordRipple_ === 'function') {
      recordRipple_(ctx, {
        causeType: 'approval-shift',
        causeId: ch.officeId || ch.holder,
        causeDetail: (ch.reasons || []).join('; '),
        effectType: 'approval/district-sentiment',
        targetScope: 'neighborhood',
        targetIds: dHoods,
        neighborhood: ch.district || '',
        magnitude: ch.delta,
        duration: 1,
        sourceEngine: 'updateCivicApprovalRatings'
      });
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
 * Only a finished initiative credits approval. Live-sounding phases
 * (operational, disbursement-active, construction-active, pilot-active)
 * are not wins — C103 sat at 95 on those and never built anything.
 */
function isPerforming_(phase) {
  if (!phase) return false;
  return String(phase).indexOf('complete') >= 0 && String(phase).indexOf('visioning-complete') < 0;
}

/**
 * They chose a fail phase. Committal — costs less than silence.
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
 * Motion of one initiative at this cycle.
 *   complete — finished. The only + path.
 *   failed   — they took a fail phase. Paid, but they decided.
 *   silence  — overdue or never scheduled. Biggest drain.
 *   sitting  — still on the clock, not finished. Nothing is free.
 *
 * RULED INTENTIONAL, G-PF19 (engine.138, S406). This function reads the
 * CURRENT phase string and NextActionCycle. It never compares against the
 * prior cycle's phase, so **phase advancement is deliberately invisible
 * here** — an initiative that moved planning → implementation-active scores
 * the same -2 as one that sat untouched. That is the design: only finishing
 * pays (see isPerforming_ — C103 sat at 95 on live-sounding phases and never
 * built anything). The engine audit separately counts phase movement as an
 * improvement; the two are not in conflict, they answer different questions
 * ("is it finished?" vs. "did the phase string change?"). Do not add
 * advancement credit here without a builder ruling — it re-opens the exact
 * inflation this scoring was written to kill.
 */
function classifyInitiativeMotion_(phase, nextActionCycle, cycle) {
  if (isPerforming_(phase)) return 'complete';
  if (isFailing_(phase)) return 'failed';
  if (nextActionCycle === null || nextActionCycle === undefined || nextActionCycle === '') {
    return 'silence';
  }
  if (Number(nextActionCycle) < Number(cycle)) return 'silence';
  return 'sitting';
}

/**
 * Per-initiative approval delta. Never positive except complete.
 * Opposed-fail +1 is the only other raise: they took a side and were right.
 */
function approvalDeltaForInitiative_(motion, owns, opposed) {
  if (motion === 'complete') {
    if (owns) return { delta: 3, reason: 'complete (+3)' };
    if (opposed) return { delta: 0, reason: 'complete, opposed (0)' };
    return { delta: 1, reason: 'complete (+1)' };
  }
  if (motion === 'failed') {
    if (owns) return { delta: -3, reason: 'chose fail (-3)' };
    if (opposed) return { delta: 1, reason: 'opposed a fail (+1)' };
    return { delta: -1, reason: 'chose fail (-1)' };
  }
  if (motion === 'silence') {
    if (owns) return { delta: -6, reason: 'silence (-6)' };
    return { delta: -4, reason: 'silence (-4)' };
  }
  if (owns) return { delta: -2, reason: 'sitting, nothing free (-2)' };
  return { delta: -1, reason: 'sitting, nothing free (-1)' };
}

/**
 * In-world: this person cannot run the city.
 * Out-of-world: this cron/node will not push the sim.
 * Crossing below 20 is the verdict after the drop. Already-unfit + still
 * silent is the repeated refusal. Completing work while low does not unseat.
 */
function shouldLeaveOffice_(status, newApproval, currentApproval, silenceOwned) {
  if (String(status || '').toLowerCase() === 'vacant') return false;
  if (Number(newApproval) >= 20) return false;
  if (Number(currentApproval) >= 20) return true;
  return Number(silenceOwned) > 0;
}

function shouldStartCampaign_(status, newApproval, existingCampaign) {
  if (existingCampaign) return false;
  if (String(status || '').toLowerCase() === 'vacant') return false;
  return Number(newApproval) < 40;
}

var CAMPAIGN_RE_ = /\[CAMPAIGN pop=(POP-\d+) name=([^\]|]+?) since=(\d+)\]/;

function parseCampaignNote_(notes) {
  var m = String(notes || '').match(CAMPAIGN_RE_);
  if (!m) return null;
  return { pop: m[1], name: String(m[2] || '').trim(), since: parseInt(m[3], 10) };
}

function stripCampaignNote_(notes) {
  return String(notes || '').replace(CAMPAIGN_RE_, '').replace(/\s+\|\s+$/, '').replace(/^\s*\|\s+/, '').trim();
}

function formatCampaignNote_(campaign, rest) {
  var mark = '[CAMPAIGN pop=' + campaign.pop + ' name=' + campaign.name + ' since=' + campaign.since + ']';
  var tail = String(rest || '').trim();
  return tail ? mark + ' ' + tail : mark;
}

var CIVIC_ROLE_RE_ = /community|advocate|organizer|attorney|educator|teacher|planner|counsel|union|pastor|deacon|principal/;
var OUT_OF_TOWN_FIRST_ = ['Anjali', 'Cormac', 'Dina', 'Everett', 'Farah', 'Gideon', 'Hester', 'Ivo', 'Karim', 'Leda', 'Niall', 'Oona'];
var OUT_OF_TOWN_LAST_ = ['Beltran', 'Crowley', 'Duvall', 'Eskridge', 'Farrow', 'Gupta', 'Holtz', 'Ingram', 'Jelinek', 'Keita', 'Langford', 'Moreau'];

function civicHash_(s) {
  var h = 0;
  var str = String(s || '');
  for (var i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function dialBandIndexFromValue_(v) {
  var n = Number(v);
  if (!isFinite(n)) return 2;
  if (n < 20) return 0;
  if (n < 40) return 1;
  if (n < 60) return 2;
  if (n < 80) return 3;
  return 4;
}

function readDialBase_(dialState, dial) {
  if (!dialState) return null;
  try {
    var o = typeof dialState === 'string' ? JSON.parse(dialState) : dialState;
    if (!o || !o.base || o.base[dial] == null) return null;
    return Number(o.base[dial]);
  } catch (e) {
    return null;
  }
}

/** Civic-challenger defaults: pumped Drive / Integrity / Composure; dumped Family (they left home). */
function challengerDialStateJson_() {
  return JSON.stringify({
    base: {
      drive: 72, sociability: 62, warmth: 52, openness: 58,
      composure: 64, integrity: 68, family: 44, outabout: 66
    },
    streak: {
      drive: 0, sociability: 0, warmth: 0, openness: 0,
      composure: 0, integrity: 0, family: 0, outabout: 0
    }
  });
}

function isCivicAdjacentText_(text) {
  return CIVIC_ROLE_RE_.test(String(text || '').toLowerCase()) ||
    /government & civic|legal|education/i.test(String(text || ''));
}

/**
 * In-ledger bar. Hard rejects: T1 (protected), already CIV, inactive,
 * under 25 / over 70, Drive < 60 (won't run), Integrity < 40 (crime-reachable),
 * Composure < 40 (can't sit a chamber). Missing DialState is not a reject —
 * score on tags/hood only. Empty seat is worse than a quieter local.
 */
function scoreLedgerCitizenForOffice_(row, headers, district, incumbentPopId, occupiedPopIds) {
  var col = function(name) { return headers.indexOf(name); };
  var iPop = col('POPID');
  if (iPop < 0) return null;
  var pop = String(row[iPop] || '').trim();
  if (!pop || pop === incumbentPopId) return null;
  if (occupiedPopIds && occupiedPopIds[pop]) return null;
  var iStatus = col('Status');
  var st = iStatus >= 0 ? String(row[iStatus] || '').toLowerCase() : 'active';
  if (st && st !== 'active') return null;
  var iCiv = col('CIV (y/n)');
  var civ = iCiv >= 0 ? String(row[iCiv] || '').toLowerCase() : '';
  if (civ.indexOf('y') === 0) return null;
  var iTier = col('Tier');
  var tier = Number(row[iTier]);
  if (!isFinite(tier)) tier = 3;
  if (tier < 2 || tier > 4) return null;
  var iBy = col('BirthYear');
  if (iBy >= 0 && row[iBy] !== '' && row[iBy] != null) {
    var by = Number(row[iBy]);
    if (isFinite(by)) {
      var age = 2041 - by;
      if (age < 25 || age > 70) return null;
    }
  }
  var iDial = col('DialState');
  if (iDial >= 0 && row[iDial]) {
    var drive = readDialBase_(row[iDial], 'drive');
    var integ = readDialBase_(row[iDial], 'integrity');
    var comp = readDialBase_(row[iDial], 'composure');
    if (drive != null && dialBandIndexFromValue_(drive) < 3) return null;
    if (integ != null && dialBandIndexFromValue_(integ) < 2) return null;
    if (comp != null && dialBandIndexFromValue_(comp) < 2) return null;
  }
  var iRole = col('RoleType');
  if (iRole < 0) iRole = col('TierRole');
  var role = iRole >= 0 ? String(row[iRole] || '') : '';
  var iTags = col('SkillTags');
  var tags = iTags >= 0 ? String(row[iTags] || '') : '';
  var iHood = col('Neighborhood');
  var hood = iHood >= 0 ? String(row[iHood] || '') : '';
  var hoods = DISTRICT_HOODS[String(district || '').toUpperCase()] || [];
  var citywide = !hoods.length || String(district || '').toLowerCase() === 'citywide';
  var local = citywide;
  if (!local) {
    for (var hi = 0; hi < hoods.length; hi++) {
      if (hood.toLowerCase() === String(hoods[hi]).toLowerCase()) local = true;
    }
  }
  var score = 1;
  if (local) score += 100;
  if (isCivicAdjacentText_(role + ' ' + tags)) score += 20;
  if (tier === 2) score += 10;
  else if (tier === 3) score += 5;
  if (iDial >= 0 && row[iDial]) {
    var dDrive = readDialBase_(row[iDial], 'drive');
    if (dDrive != null) score += dialBandIndexFromValue_(dDrive);
  }
  var iFirst = col('First');
  var iLast = col('Last');
  var iFull = col('FullName');
  var name = iFull >= 0 && row[iFull] ? String(row[iFull]).trim()
    : ((iFirst >= 0 ? row[iFirst] : '') + ' ' + (iLast >= 0 ? row[iLast] : '')).trim();
  if (!name) return null;
  return { popId: pop, name: name, neighborhood: hood, tier: tier, score: score, origin: 'ledger' };
}

function nextChallengerPopId_(rows, iPop) {
  var max = 0;
  for (var r = 0; r < (rows || []).length; r++) {
    var m = String((rows[r] && rows[r][iPop]) || '').match(/POP-(\d+)/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return 'POP-' + String(max + 1).padStart(5, '0');
}

function mintChallengerOnLedger_(ctx, spec) {
  var headers = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  var col = function(name) { return headers.indexOf(name); };
  var iPop = col('POPID');
  if (iPop < 0) return null;
  var pop = nextChallengerPopId_(rows, iPop);
  var row = [];
  for (var i = 0; i < headers.length; i++) row[i] = '';
  var set = function(name, val) {
    var c = col(name);
    if (c >= 0) row[c] = val;
  };
  set('POPID', pop);
  set('First', spec.first);
  set('Last', spec.last);
  set('Status', 'active');
  set('Tier', 3);
  set('RoleType', 'Civic candidate');
  set('ClockMode', 'CIVIC');
  set('CIV (y/n)', 'n');
  set('BirthYear', spec.birthYear);
  set('Neighborhood', spec.hood);
  set('Gender', spec.gender || '');
  set('DialState', challengerDialStateJson_());
  set('SkillTags', 'Government & Civic');
  set('CareerStage', 'mid-career');
  set('MigrationReason', spec.reason || 'arrived to challenge a failing office');
  set('MigratedCycle', spec.cycle || '');
  set('OrginCity', spec.originCity || 'out-of-town');
  set('OriginGame', spec.originCity || 'out-of-town');
  set('LifeHistory', 'C' + spec.cycle + ': Arrived to campaign for ' + (spec.officeId || 'a civic seat') + '.');
  rows.push(row);
  return {
    popId: pop,
    name: (spec.first + ' ' + spec.last).trim(),
    neighborhood: spec.hood,
    tier: 3,
    origin: spec.origin || 'out-of-town'
  };
}

function pickGenericCitizenChallenger_(ctx, district, specBase) {
  if (!ctx || !ctx.ss || typeof ctx.ss.getSheetByName !== 'function') return null;
  var sheet = ctx.ss.getSheetByName('Generic_Citizens');
  if (!sheet || !sheet.getDataRange) return null;
  var data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return null;
  var h = data[0];
  var idx = function(name) {
    for (var i = 0; i < h.length; i++) {
      if (String(h[i] || '').trim() === name) return i;
    }
    return -1;
  };
  var iF = idx('First'), iL = idx('Last'), iOcc = idx('Occupation');
  var iHood = idx('Neighborhood'), iBy = idx('BirthYear'), iSt = idx('Status'), iSex = idx('Sex');
  var hoods = DISTRICT_HOODS[String(district || '').toUpperCase()] || [];
  var best = null, bestScore = -1;
  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    var st = iSt >= 0 ? String(row[iSt] || 'active').toLowerCase() : 'active';
    if (st && st !== 'active') continue;
    var first = iF >= 0 ? String(row[iF] || '').trim() : '';
    var last = iL >= 0 ? String(row[iL] || '').trim() : '';
    if (!first && !last) continue;
    var occ = iOcc >= 0 ? String(row[iOcc] || '') : '';
    var hood = iHood >= 0 ? String(row[iHood] || '') : '';
    if (iBy >= 0 && row[iBy] !== '' && row[iBy] != null) {
      var age = 2041 - Number(row[iBy]);
      if (isFinite(age) && (age < 25 || age > 70)) continue;
    }
    var local = !hoods.length;
    for (var hi = 0; hi < hoods.length; hi++) {
      if (hood.toLowerCase() === String(hoods[hi]).toLowerCase()) local = true;
    }
    if (!isCivicAdjacentText_(occ) && !local) continue;
    var score = (isCivicAdjacentText_(occ) ? 20 : 0) + (local ? 100 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = {
        first: first, last: last, hood: hood || (hoods[0] || 'Downtown'),
        birthYear: iBy >= 0 ? row[iBy] : 1988,
        gender: iSex >= 0 ? row[iSex] : '',
        occ: occ
      };
    }
  }
  if (!best) return null;
  return mintChallengerOnLedger_(ctx, {
    first: best.first, last: best.last, hood: best.hood,
    birthYear: best.birthYear || 1988, gender: best.gender,
    cycle: specBase.cycle, officeId: specBase.officeId,
    origin: 'generic', originCity: best.hood,
    reason: 'emerged from the city to challenge a failing office'
  });
}

function mintOutOfTownChallenger_(ctx, district, officeId, cycle) {
  var hoods = DISTRICT_HOODS[String(district || '').toUpperCase()] || [];
  var hood = hoods[0] || 'Downtown';
  var seed = String(officeId || district || '') + ':' + String(cycle || 0);
  var h = civicHash_(seed);
  var first = OUT_OF_TOWN_FIRST_[h % OUT_OF_TOWN_FIRST_.length];
  var last = OUT_OF_TOWN_LAST_[Math.floor(h / 7) % OUT_OF_TOWN_LAST_.length];
  var birthYear = 1976 + (h % 20);
  var gender = h % 2 === 0 ? 'F' : 'M';
  return mintChallengerOnLedger_(ctx, {
    first: first, last: last, hood: hood, birthYear: birthYear, gender: gender,
    cycle: cycle, officeId: officeId, origin: 'out-of-town', originCity: 'out-of-town',
    reason: 'arrived from outside the city to challenge a failing office'
  });
}

/**
 * Always return a challenger when the ledger is present.
 * 1) in-ledger, dial-and-tag qualified
 * 2) Generic_Citizens occupation/hood feeder, minted onto the ledger
 * 3) out-of-town arrival with civic-challenger dial defaults
 * Vacant (null) only if there is no ledger to write.
 */
function pickCampaignChallenger_(ctx, district, incumbentPopId, occupiedPopIds, officeId, cycle) {
  if (!ctx || !ctx.ledger || !ctx.ledger.headers || !ctx.ledger.rows) return null;
  var headers = ctx.ledger.headers;
  var best = null;
  for (var r = 0; r < ctx.ledger.rows.length; r++) {
    var scored = scoreLedgerCitizenForOffice_(
      ctx.ledger.rows[r], headers, district, incumbentPopId, occupiedPopIds
    );
    if (!scored) continue;
    if (!best || scored.score > best.score ||
      (scored.score === best.score && scored.popId < best.popId)) {
      best = scored;
    }
  }
  if (best) return best;
  var fromGc = pickGenericCitizenChallenger_(ctx, district, { cycle: cycle, officeId: officeId });
  if (fromGc) return fromGc;
  return mintOutOfTownChallenger_(ctx, district, officeId, cycle);
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
