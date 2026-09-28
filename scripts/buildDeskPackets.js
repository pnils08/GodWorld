#!/usr/bin/env node
/**
 * buildDeskPackets.js v3.0 (S502, research-build)
 *
 * Pulls the handful of live sheets that still feed base_context.json /
 * truesource_reference.json / citizen_archive.json — the only three of this
 * script's outputs anything still reads (buildWorldState.js's canon fold,
 * the citizen-loop via lib/mags.js + lib/wakePerception.js, the dashboard,
 * cron-civic-run.js). Run as run-cycle Step 5.8 and post-publish Step 5b.
 *
 * v3.0 — the per-desk packet generator (9 desk JSONs, up to ~1.3MB each,
 * every cycle) was cut. It fed 6 autonomous desk agents through /write-edition,
 * a pipeline frozen since S313 and archived since — not in the live skill set,
 * confirmed no live caller anywhere (crontab, cron-desk-run.js's beat-slice
 * fanout, or any current skill). Traced every remaining base_context/
 * truesource/citizen_archive consumer before cutting; full trace in
 * docs/plans/2026-09-07-beat-slices-from-sheets-plan.md and the S502 commits.
 * Prior version history (v1.3-v2.3) is in git log, not repeated here — it
 * described features of the removed per-desk generator.
 *
 * Usage: node scripts/buildDeskPackets.js [cycleNumber]
 *   e.g. node scripts/buildDeskPackets.js 79
 *
 * Reads from Google Sheets:
 *   WorldEvents_V3_Ledger, Civic_Office_Ledger, Initiative_Tracker,
 *   Simulation_Ledger, Household_Ledger, Relationship_Bonds,
 *   World_Population, Simulation_Calendar, Neighborhood_Map, Business_Ledger,
 *   Citizen_Media_Usage (coverage index → citizen_archive.json)
 *
 * Writes:
 *   output/desk-packets/base_context.json
 *   output/desk-packets/truesource_reference.json
 *   output/desk-packets/citizen_archive.json
 */

const fs = require('fs');
const path = require('path');

// ─── CLI HELPERS ──────────────────────────────────────────
function getCliArg(flag) {
  var idx = process.argv.indexOf(flag);
  return (idx !== -1 && process.argv[idx + 1]) ? process.argv[idx + 1] : null;
}

// ─── CONFIGURATION ─────────────────────────────────────────
const getCurrentCycle = require('../lib/getCurrentCycle');
const contextScan = require('../lib/contextScan');
const CYCLE = getCurrentCycle();
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Phase 40.6 Layer 4 — scan any packet we write and abort the build on a hit.
function writeAndScanPacket(filepath, content) {
  fs.writeFileSync(filepath, content);
  const result = contextScan.scanFile(filepath);
  if (!result.safe) {
    const first = result.matches[0] || {};
    throw new Error(
      'Phase 40.6 Layer 4: injection pattern detected in packet ' +
      filepath + ' — patternId=' + (first.patternId || 'unknown') +
      ' line=' + (first.lineNumber || '?') + '. Packet build aborted. ' +
      'See output/injection_blocks.log for full match set.'
    );
  }
}
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output/desk-packets');

// ─── SHEETS API SETUP ──────────────────────────────────────
require('/root/GodWorld/lib/env');
const sheets = require(path.join(PROJECT_ROOT, 'lib/sheets'));

function safe(val, def) {
  if (val === undefined || val === null || val === '') return def !== undefined ? def : '';
  return val;
}

function toObj(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = safe(row[i]);
  }
  return obj;
}

function filterByCycle(data, cycle) {
  if (data.length < 2) return [];
  var headers = data[0];
  var cycleCol = headers.indexOf('Cycle');
  if (cycleCol === -1) return [];
  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][cycleCol]) === String(cycle)) {
      results.push(toObj(headers, data[i]));
    }
  }
  return results;
}

function allToObjects(data) {
  if (data.length < 2) return [];
  var headers = data[0];
  var results = [];
  for (var i = 1; i < data.length; i++) {
    results.push(toObj(headers, data[i]));
  }
  return results;
}

var ARCHIVE_APPEARANCE_TYPES = { mentioned: 1, quoted: 1, referenced: 1, featured: 1 };
var ARCHIVE_ARTICLE_CAP = 25;

// Live coverage index from Citizen_Media_Usage, keyed by name; POPID resolved by
// name against Simulation_Ledger (never taken from the usage row).
function buildCitizenArchive(usageRaw, simLedgerRaw) {
  var popByName = {};
  allToObjects(simLedgerRaw).forEach(function(c) {
    var nm = ((c.First || '') + ' ' + (c.Last || '')).trim();
    if (c.POPID && nm) popByName[nm.toLowerCase()] = String(c.POPID);
  });
  var archive = {};
  allToObjects(usageRaw).forEach(function(u) {
    var name = String(u.CitizenName || '').trim();
    if (!name || !ARCHIVE_APPEARANCE_TYPES[String(u.UsageType || '').toLowerCase()]) return;
    var popId = popByName[name.toLowerCase()];
    if (!popId) return;
    var entry = archive[name] || (archive[name] = { popId: popId, name: name, totalRefs: 0, articles: [] });
    entry.totalRefs++;
    entry.articles.push({ source: u.Reporter || '', title: u.Context || '', cycle: u.Cycle || '' });
  });
  Object.keys(archive).forEach(function(n) {
    archive[n].articles = archive[n].articles.slice(-ARCHIVE_ARTICLE_CAP);
  });
  return archive;
}

function buildCouncil(civicOfficers) {
  return civicOfficers.filter(function(o) {
    return (o.Type || '').toLowerCase().indexOf('council') !== -1 ||
           (o.Title || '').toLowerCase().indexOf('council') !== -1;
  }).map(function(o) {
    return {
      district: o.District || '',
      member: o.Holder || '',
      popId: o.PopId || '',
      faction: o.Faction || '',
      status: o.Status || 'active'
    };
  });
}

function buildPendingVotes(initiatives) {
  return initiatives.filter(function(i) {
    if (!i.Name || i.Name.trim() === '') return false;
    var status = (i.Status || '').toLowerCase();
    return status !== 'proposed' && status !== 'passed' && status !== 'failed' && status !== 'archived';
  }).map(function(i) {
    return {
      name: i.Name || '',
      initiativeId: i.InitiativeID || '',
      type: i.Type || '',
      status: i.Status || '',
      budget: i.Budget || '',
      voteRequirement: i.VoteRequirement || '',
      voteCycle: i.VoteCycle || '',
      projection: i.Projection || '',
      leadFaction: i.LeadFaction || '',
      oppositionFaction: i.OppositionFaction || '',
      swingVoter: i.SwingVoter || '',
      swingVoter2: i.SwingVoter2 || '',
      swingVoter2Lean: i.SwingVoter2Lean || '',
      policyDomain: i.PolicyDomain || '',
      affectedNeighborhoods: i.AffectedNeighborhoods || '',
      notes: i.Notes || ''
    };
  });
}

// ─── DESK SUMMARY GENERATOR ─────────────────────────────
// Produces a compact 10-25KB summary for agent consumption.
// Agents read this first instead of the full 200-500KB packet.
function buildExecutiveBranch(civicOfficers) {
  var mayor = null;
  var deputyMayor = null;
  civicOfficers.forEach(function(o) {
    var title = (o.Title || '').toLowerCase();
    if (title.indexOf('mayor') !== -1 && title.indexOf('deputy') === -1) {
      mayor = {
        name: o.Holder || '',
        title: o.Title || '',
        popId: o.PopId || '',
        status: o.Status || 'active',
        approvalRating: o.Approval || ''
      };
    } else if (title.indexOf('deputy mayor') !== -1) {
      deputyMayor = {
        name: o.Holder || '',
        title: o.Title || '',
        popId: o.PopId || '',
        status: o.Status || 'active'
      };
    }
  });
  return {
    mayor: mayor ? mayor.name : '',
    mayorDetail: mayor,
    deputyMayor: deputyMayor ? deputyMayor.name : '',
    deputyMayorDetail: deputyMayor
  };
}

function buildStatusAlerts(civicOfficers) {
  return civicOfficers.filter(function(o) {
    var s = (o.Status || '').toLowerCase();
    return s !== 'active' && s !== '' && s !== 'vacant';
  }).map(function(o) {
    return { name: o.Holder, title: o.Title, status: o.Status };
  });
}

function buildRecentOutcomes(initiatives) {
  return initiatives.filter(function(i) {
    var s = (i.Status || '').toLowerCase();
    return s === 'passed' || s === 'failed';
  }).map(function(i) {
    return {
      name: i.Name || '',
      initiativeId: i.InitiativeID || '',
      status: (i.Status || '').toUpperCase(),
      outcome: i.Outcome || '',
      budget: i.Budget || '',
      voteRequirement: i.VoteRequirement || '',
      voteCycle: i.VoteCycle || '',
      voteBreakdown: i.Notes || '',
      affectedNeighborhoods: i.AffectedNeighborhoods || '',
      policyDomain: i.PolicyDomain || '',
      // Implementation tracking (populated when columns exist on sheet)
      implementationPhase: i.ImplementationPhase || null,
      milestoneNotes: i.MilestoneNotes || null,
      nextScheduledAction: i.NextScheduledAction || null,
      nextActionCycle: i.NextActionCycle ? parseInt(i.NextActionCycle) : null
    };
  });
}

function buildAsRoster(simLedger) {
  // v2.3: Pull from all GAME-mode citizens + enrich with player-index data
  var playerIndex = null;
  try {
    var piPath = path.join(PROJECT_ROOT, 'output', 'player-index.json');
    if (fs.existsSync(piPath)) {
      playerIndex = JSON.parse(fs.readFileSync(piPath, 'utf-8'));
    }
  } catch (e) { /* player index optional */ }

  var piByPopId = {};
  if (playerIndex && playerIndex.players) {
    playerIndex.players.forEach(function(p) {
      if (p.popId) piByPopId[p.popId.toUpperCase()] = p;
    });
  }

  return simLedger.filter(function(c) {
    var clock = (c.ClockMode || '').toUpperCase();
    return clock === 'GAME';
  }).map(function(c) {
    var popId = c.POPID || '';
    var pi = piByPopId[popId.toUpperCase()] || {};
    return {
      popId: popId,
      name: (c.First + ' ' + (c.Last || '')).trim(),
      tier: c.Tier,
      roleType: c.RoleType,
      neighborhood: c.Neighborhood,
      status: c.Status,
      position: pi.position || null,
      overall: pi.overall || null,
      potential: pi.potential || null,
      contract: pi.contract || null,
      quirks: pi.quirks || null,
      seasonStats: pi.seasonStats ? pi.seasonStats.slice(-2) : null,  // last 2 seasons
      awards: pi.awards ? pi.awards.slice(0, 5) : null,
      playerStatus: pi.playerStatus || null
    };
  });
}

function buildEconomicContext(worldPopRaw, simLedger, activeHouseholds, neighborhoodMap) {
  var ctx = {
    employment: '',
    economyDescription: '',
    incomeDistribution: { under50k: 0, '50k_100k': 0, '100k_150k': 0, '150k_200k': 0, over200k: 0 },
    medianIncome: 0,
    totalCitizensWithIncome: 0,
    educationDistribution: {},
    householdStats: {
      total: activeHouseholds.length,
      rentBurdenCount: 0,
      averageIncome: 0
    },
    neighborhoodEconomics: []
  };

  // Extract from World_Population row 2
  if (worldPopRaw && worldPopRaw.length >= 2) {
    var headers = worldPopRaw[0] || [];
    var row = worldPopRaw[1] || [];
    var empIdx = headers.indexOf('Employment');
    var econIdx = headers.indexOf('EconomyDescription');
    if (empIdx !== -1) ctx.employment = safe(row[empIdx], '');
    if (econIdx !== -1) ctx.economyDescription = safe(row[econIdx], '');
  }

  // Income distribution from Simulation_Ledger — real dollar amounts
  var allIncomes = [];
  simLedger.forEach(function(c) {
    var income = parseFloat(c.Income);
    if (!income || income <= 0) return;
    allIncomes.push(income);
    if (income < 50000) ctx.incomeDistribution.under50k++;
    else if (income < 100000) ctx.incomeDistribution['50k_100k']++;
    else if (income < 150000) ctx.incomeDistribution['100k_150k']++;
    else if (income < 200000) ctx.incomeDistribution['150k_200k']++;
    else ctx.incomeDistribution.over200k++;
  });

  // Median income
  if (allIncomes.length > 0) {
    var sorted = allIncomes.slice().sort(function(a, b) { return a - b; });
    ctx.medianIncome = sorted[Math.floor(sorted.length / 2)];
  }
  ctx.totalCitizensWithIncome = allIncomes.length;

  // Education distribution from Simulation_Ledger
  simLedger.forEach(function(c) {
    var edu = c.EducationLevel || '';
    if (edu) {
      ctx.educationDistribution[edu] = (ctx.educationDistribution[edu] || 0) + 1;
    }
  });

  // Household income stats
  var totalIncome = 0;
  var incomeCount = 0;
  activeHouseholds.forEach(function(h) {
    var income = parseFloat(h.HouseholdIncome || 0);
    if (income > 0) {
      totalIncome += income;
      incomeCount++;
    }
    var rent = parseFloat(h.MonthlyRent || 0);
    if (income > 0 && rent > 0 && (rent * 12) / income > 0.40) {
      ctx.householdStats.rentBurdenCount++;
    }
  });
  ctx.householdStats.averageIncome = incomeCount > 0 ? Math.round(totalIncome / incomeCount) : 0;

  // Neighborhood economics from Neighborhood_Map
  if (neighborhoodMap && neighborhoodMap.length > 0) {
    ctx.neighborhoodEconomics = neighborhoodMap
      .filter(function(n) { return n.Neighborhood && (parseFloat(n.MedianIncome) > 0); })
      .map(function(n) {
        return {
          neighborhood: n.Neighborhood,
          medianIncome: parseFloat(n.MedianIncome) || 0,
          medianRent: parseFloat(n.MedianRent) || 0
        };
      })
      .sort(function(a, b) { return b.medianIncome - a.medianIncome; });
  }

  return ctx;
}

/**
 * v2.2: Build evening context from Media_Ledger + Cycle_Packet text.
 * Extracts nightlife, food scene, media climate, weather mood, and cultural activity.
 */
async function main() {
  console.log('=== buildDeskPackets v1.8 (Auto Archive Context) ===');
  console.log('Cycle:', CYCLE);
  console.log('Pulling live data from Google Sheets...\n');

  // ── Pull all sheet data in parallel ──
  // Each fetch wrapped with sheet name for diagnostics on failure
  var startTime = Date.now();
  function safeGet(sheetName) {
    return sheets.getSheetData(sheetName).catch(function(err) {
      console.error('  WARN: Failed to fetch ' + sheetName + ': ' + err.message);
      return [];
    });
  }
  // S502 (research-build) — trimmed to the reads base_context.json/
  // truesource_reference.json/citizen_archive.json actually need. The full
  // per-desk packet generation (events/seeds/hooks routing, canon culturalEntities/
  // reporters, sports/evening/storyline/hospital enrichment) was cut in the same
  // change: traced every consumer first (dashboard, lib/mags.js, buildWorldState.js,
  // cron-civic-run.js) and confirmed none of it had a live reader left — the
  // pipeline that consumed it (6 desk agents -> /write-edition) is frozen/archived.
  // See docs/plans/2026-09-07-beat-slices-from-sheets-plan.md for what replaced it.
  var [
    eventsRaw, civicRaw, initiativeRaw, simRaw,
    householdRaw, bondsRaw, worldPopRaw, simCalRaw,
    neighborhoodMapRaw, businessLedgerRaw, mediaUsageRaw
  ] = await Promise.all([
    safeGet('WorldEvents_V3_Ledger'),
    safeGet('Civic_Office_Ledger'),
    safeGet('Initiative_Tracker'),
    safeGet('Simulation_Ledger'),
    safeGet('Household_Ledger'),
    safeGet('Relationship_Bonds'),
    safeGet('World_Population'),
    safeGet('Simulation_Calendar'),
    safeGet('Neighborhood_Map'),
    safeGet('Business_Ledger'),
    safeGet('Citizen_Media_Usage')
  ]);

  console.log('Sheets pulled in ' + (Date.now() - startTime) + 'ms');

  // ── Filter to current cycle where applicable ──
  // S502 (research-build): seeds/hooks/historicalEvents/arcs/hospitalBlock and
  // the whole per-desk packet loop below them were cut — confirmed zero live
  // readers left (the 6-desk-agent/write-edition pipeline they fed is frozen/
  // archived; beat-slices replaced it). See docs/plans/2026-09-07-beat-slices-
  // from-sheets-plan.md.
  var events = filterByCycle(eventsRaw, CYCLE);

  // Civic and initiatives (filter empty rows — sheet has 1000 rows, ~35 filled)
  var civicOfficers = allToObjects(civicRaw).filter(function(o) { return o.Title; });
  var initiatives = allToObjects(initiativeRaw);

  // Citizens
  var simLedger = allToObjects(simRaw);

  // Households: active + recently formed/dissolved this cycle
  var allHouseholds = allToObjects(householdRaw);
  var activeHouseholds = allHouseholds.filter(function(h) {
    return (h.Status || '').toLowerCase() === 'active';
  });
  var cycleHouseholdEvents = allHouseholds.filter(function(h) {
    return String(h.FormedCycle) === String(CYCLE) ||
           String(h.DissolvedCycle) === String(CYCLE);
  });

  // Relationship bonds: active, interesting intensity
  var allBonds = allToObjects(bondsRaw);
  var activeBonds = allBonds.filter(function(b) {
    var status = (b.Status || '').toLowerCase();
    var intensity = parseFloat(b.Intensity || 0);
    return status !== 'dissolved' && status !== 'broken' && intensity >= 3;
  });

  // S312 bond-key repair — Relationship_Bonds is POPID-keyed (canonical); resolve
  // display names onto each bond so the name-based desk filter below still matches.
  // S328: moved below the activeBonds definition — original placement ran the
  // forEach before `var activeBonds` (hoisted undefined → TypeError, base_context
  // frozen at C101 since S312).
  var nameByPopId = {};
  simLedger.forEach(function(c) {
    var nm = ((c.First || '') + ' ' + (c.Last || '')).trim();
    if (c.POPID && nm) nameByPopId[String(c.POPID).toUpperCase()] = nm;
  });
  activeBonds.forEach(function(b) {
    b.CitizenAName = nameByPopId[String(b.CitizenA || '').toUpperCase()] || String(b.CitizenA || '');
    b.CitizenBName = nameByPopId[String(b.CitizenB || '').toUpperCase()] || String(b.CitizenB || '');
  });

  // Neighborhood Map: economic data per neighborhood
  var neighborhoodMap = allToObjects(neighborhoodMapRaw);

  // Business Ledger
  var businesses = allToObjects(businessLedgerRaw);

  // Economic context from World_Population + Simulation_Ledger + Neighborhood_Map
  var economicContext = buildEconomicContext(worldPopRaw, simLedger, activeHouseholds, neighborhoodMap);

  // v2.1: Business snapshot from Business_Ledger
  economicContext.businessSnapshot = businesses
    .filter(function(b) { return b.Name && (parseInt(b.Employee_Count) > 0 || b.Sector); })
    .map(function(b) {
      return {
        bizId: (b.BIZ_ID || '').trim(),
        name: b.Name,
        sector: b.Sector || '',
        neighborhood: b.Neighborhood || '',
        employeeCount: parseInt(b.Employee_Count) || 0,
        avgSalary: parseInt(String(b.Avg_Salary || '0').replace(/[$,\s]/g, '')) || 0,
        growthRate: b.Growth_Rate || ''
      };
    })
    .sort(function(a, b) { return b.employeeCount - a.employeeCount; });

  console.log('\nData counts:');
  console.log('  Events (C' + CYCLE + '):', events.length);
  console.log('  Civic Officers:', civicOfficers.length);
  console.log('  Initiatives:', initiatives.length);
  console.log('  Sim Ledger:', simLedger.length);
  console.log('  Active Households:', activeHouseholds.length);
  console.log('  Household Events (C' + CYCLE + '):', cycleHouseholdEvents.length);
  console.log('  Active Bonds (intensity>=3):', activeBonds.length);
  console.log('  Economy:', economicContext.economyDescription || '(no description)');
  console.log('  Median Income: $' + (economicContext.medianIncome || 0).toLocaleString(),
              '| Citizens w/income:', economicContext.totalCitizensWithIncome,
              '| Neighborhoods:', economicContext.neighborhoodEconomics.length,
              '| Businesses:', (economicContext.businessSnapshot || []).length);

  // ── Read local files ──
  var popIdIndex = buildCitizenArchive(mediaUsageRaw, simRaw);
  console.log('  Citizen archive: ' + Object.keys(popIdIndex).length + ' citizens with coverage');

  // ── Build base context ──
  // Calendar from Simulation_Calendar sheet — the simulation's own timeline.
  // NEVER derive from system date. GodWorld is its own world.
  var monthNames = ['','January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  var seasonFromCal = '';
  var monthFromCal = '';
  var holidayFromCal = 'none';
  var simYear = '';
  var simMonth = 0;
  var isFirstFridayFromCal = false;
  var isCreationDayFromCal = false;
  if (simCalRaw.length <= 1) {
    console.warn('  WARN: Simulation_Calendar is empty — season/month/holiday will default to "unknown"');
  }
  if (simCalRaw.length > 1) {
    var calRow = simCalRaw[1]; // row 0 is headers
    simYear = calRow[0] || '';
    simMonth = parseInt(calRow[1]) || 0;
    monthFromCal = monthNames[simMonth] || '';
    seasonFromCal = calRow[3] || '';
    holidayFromCal = calRow[4] || 'none';

    // Derive isFirstFriday/isCreationDay from cycle number
    // Same logic as advanceSimulationCalendar.js
    var cycleOfYear = ((CYCLE - 1) % 52) + 1;
    var firstFridayCycles = [1, 6, 10, 14, 18, 23, 27, 31, 36, 40, 45, 49];
    isFirstFridayFromCal = firstFridayCycles.indexOf(cycleOfYear) >= 0;
    isCreationDayFromCal = (cycleOfYear === 48);
  }

  // CLI overrides: --season Summer --month August --holiday "none" --sports-season mid-season
  var cliSeason = getCliArg('--season');
  var cliMonth = getCliArg('--month');
  var cliHoliday = getCliArg('--holiday');
  var cliSportsSeason = getCliArg('--sports-season');

  var baseContext = {
    cycle: CYCLE,
    simYear: simYear,
    season: cliSeason || seasonFromCal || 'unknown',
    month: cliMonth || monthFromCal || 'unknown',
    holiday: {
      name: cliHoliday || holidayFromCal,
      priority: holidayFromCal !== 'none' ? 'active' : 'none'
    },
    isFirstFriday: isFirstFridayFromCal,
    isCreationDay: isCreationDayFromCal,
    sportsSeason: cliSportsSeason || '',
    weather: extractWeatherFromEvents(events),
    sentiment: extractFieldFromEvents(events, 'CitySentiment'),
    cycleWeight: determineCycleWeight(events),
    economicContext: economicContext
  };

  // ── Build canon sections (shared data) ──
  // S502: culturalEntities/reporters dropped — confirmed unread by
  // buildWorldState.js's canon fold or any live base_context/truesource
  // consumer (dashboard, lib/mags.js, cron-civic-run.js).
  var canon = {
    council: buildCouncil(civicOfficers),
    pendingVotes: buildPendingVotes(initiatives),
    statusAlerts: buildStatusAlerts(civicOfficers),
    recentOutcomes: buildRecentOutcomes(initiatives),
    executiveBranch: buildExecutiveBranch(civicOfficers),
    asRoster: buildAsRoster(simLedger)
  };

  console.log('\nCanon built:');
  console.log('  Council members:', canon.council.length);
  console.log('  Pending votes:', canon.pendingVotes.length);
  console.log('  Status alerts:', canon.statusAlerts.length);
  console.log('  Executive branch — Mayor:', canon.executiveBranch.mayor || '(not found)');
  console.log('  A\'s roster:', canon.asRoster.length);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });


  // Write base context
  var baseFile = path.join(OUTPUT_DIR, 'base_context.json');
  writeAndScanPacket(baseFile, JSON.stringify({
    // Env tag: which sheet this context was built from. Readers compare
    // against their own GODWORLD_SHEET_ID to catch a sandbox run clobbering
    // the prod file (S306 mags-bot incident).
    source: {
      sheetId: process.env.GODWORLD_SHEET_ID || null,
      generatedAt: new Date().toISOString()
    },
    baseContext: baseContext,
    canon: canon,
    householdStats: {
      activeHouseholds: activeHouseholds.length,
      cycleEvents: cycleHouseholdEvents.length,
      rentBurdenCount: economicContext.householdStats.rentBurdenCount
    },
    bondStats: {
      activeBonds: activeBonds.length
    }
  }, null, 2));

  // Write TrueSource reference (compact verification file for Rhea Morgan)
  var truesourceRef = {
    cycle: CYCLE,
    mayor: canon.executiveBranch.mayor,
    executiveBranch: canon.executiveBranch,
    council: canon.council.map(function(c) {
      return { name: c.member, district: c.district, faction: c.faction, status: c.status };
    }),
    asRoster: canon.asRoster.map(function(p) {
      var entry = { name: p.name, position: p.roleType, popId: p.popId, tier: p.tier, status: p.status };
      if (p.overall) entry.overall = p.overall;
      if (p.potential) entry.potential = p.potential;
      if (p.contract) entry.contract = p.contract;
      if (p.quirks) entry.quirks = p.quirks;
      if (p.seasonStats) entry.recentStats = p.seasonStats;
      if (p.awards) entry.awards = p.awards;
      if (p.playerStatus) entry.playerStatus = p.playerStatus;
      return entry;
    }),
    initiatives: canon.pendingVotes.concat(canon.recentOutcomes).map(function(i) {
      return {
        name: i.name, id: i.initiativeId, status: i.status,
        voteBreakdown: i.voteBreakdown || i.notes || '',
        implementationPhase: i.implementationPhase || null,
        nextScheduledAction: i.nextScheduledAction || null,
        nextActionCycle: i.nextActionCycle || null
      };
    })
  };
  var truesourceFile = path.join(OUTPUT_DIR, 'truesource_reference.json');
  writeAndScanPacket(truesourceFile, JSON.stringify(truesourceRef, null, 2));
  console.log('\nTrueSource reference: ' + truesourceFile);

  // Write full citizen archive (standalone reference for agents)
  var archiveFile = path.join(OUTPUT_DIR, 'citizen_archive.json');
  writeAndScanPacket(archiveFile, JSON.stringify(popIdIndex, null, 2));
  console.log('Citizen archive: ' + Object.keys(popIdIndex).length + ' citizens → ' + archiveFile);

  console.log('\n=== ALL DONE ===');
}

// ─── WEATHER/FIELD EXTRACTORS ──────────────────────────────

function extractWeatherFromEvents(events) {
  for (var i = 0; i < events.length; i++) {
    if (events[i].WeatherType) {
      return {
        type: events[i].WeatherType || '',
        impact: events[i].WeatherImpact || ''
      };
    }
  }
  return { type: 'unknown', impact: '' };
}

function extractFieldFromEvents(events, field) {
  for (var i = 0; i < events.length; i++) {
    if (events[i][field]) return events[i][field];
  }
  return '';
}

function determineCycleWeight(events) {
  var shockCount = 0;
  var highSeverity = 0;
  for (var i = 0; i < events.length; i++) {
    if (events[i].ShockFlag === 'TRUE' || events[i].ShockFlag === '1') shockCount++;
    if ((events[i].Severity || '').toLowerCase() === 'high') highSeverity++;
  }
  if (shockCount > 0 || highSeverity >= 2) return 'high-signal';
  if (events.length >= 20) return 'elevated';
  return 'normal';
}

// ─── RUN ───────────────────────────────────────────────────
main().catch(function(err) {
  console.error('FATAL:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
