#!/usr/bin/env node
/**
 * buildCivicVoicePackets.js v1.0
 *
 * Pulls live data from Google Sheets and builds per-office/faction JSON packets
 * for institutional voice agents. Each packet contains targeted district data,
 * neighborhood metrics, citizen context, and initiative impact — the raw material
 * that lets voice agents speak with specificity about their constituents.
 *
 * Usage: node scripts/buildCivicVoicePackets.js [cycleNumber]
 *   e.g. node scripts/buildCivicVoicePackets.js 85
 *
 * Reads from Google Sheets:
 *   Civic_Office_Ledger, Initiative_Tracker, Simulation_Ledger,
 *   Neighborhood_Map, Neighborhood_Demographics, Crime_Metrics,
 *   Transit_Metrics, Faith_Organizations, LifeHistory_Log,
 *   WorldEvents_V3_Ledger, World_Population, World_Config
 *
 * Writes:
 *   output/civic-voice-packets/mayor_c{XX}.json
 *   output/civic-voice-packets/opp_faction_c{XX}.json
 *   output/civic-voice-packets/crc_faction_c{XX}.json
 *   output/civic-voice-packets/ind_swing_c{XX}.json
 *   output/civic-voice-packets/police_chief_c{XX}.json
 *   output/civic-voice-packets/baylight_authority_c{XX}.json
 *   output/civic-voice-packets/district_attorney_c{XX}.json
 *   output/civic-voice-packets/manifest.json
 */

const fs = require('fs');
const path = require('path');

// ─── CONFIGURATION ─────────────────────────────────────────
const CYCLE = parseInt(process.argv[2]) || 84;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output/civic-voice-packets');

// ─── DISTRICT → NEIGHBORHOOD MAPPING ──────────────────────
// Maps council districts to neighborhoods in the simulation.
// Based on Civic_Office_Ledger notes and Oakland geography.
const DISTRICT_NEIGHBORHOODS = {
  D1: ['West Oakland', 'Brooklyn'],                           // Carter (OPP)
  D2: ['Downtown', 'Chinatown', 'Jack London', 'KONO'],      // Tran (IND)
  D3: ['Fruitvale', 'San Antonio'],                           // Delgado (OPP)
  D4: ['Glenview', 'Dimond', 'Ivy Hill'],                     // Vega (IND)
  D5: ['East Oakland', 'Coliseum', 'Elmhurst'],               // Rivers (OPP)
  D6: ['Montclair', 'Piedmont Ave'],                           // Crane (CRC)
  D7: ['Temescal', 'Rockridge'],                               // Ashford (CRC)
  D8: ['Lake Merritt', 'Adams Point', 'Grand Lake', 'Eastlake'], // Chen (CRC)
  D9: ['Laurel', 'Uptown']                                    // Mobley (OPP)
};

// Faction → district groupings
const FACTION_DISTRICTS = {
  OPP: ['D1', 'D3', 'D5', 'D9'],   // Carter, Delgado, Rivers, Mobley
  CRC: ['D6', 'D7', 'D8'],          // Crane, Ashford, Chen
  IND: ['D2', 'D4']                  // Tran, Vega
};

// ─── SHEET LOADING ─────────────────────────────────────────
let sheets;
try {
  sheets = require('../lib/sheets');
} catch (e) {
  console.error('ERROR: Could not load lib/sheets.js:', e.message);
  process.exit(1);
}

function toObj(headers, row) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i] || '';
  }
  return obj;
}

function safe(val, def) {
  if (val === undefined || val === null || val === '') return def !== undefined ? def : '';
  return val;
}

function parseNum(val, def) {
  const n = parseFloat(val);
  return isNaN(n) ? (def !== undefined ? def : 0) : n;
}

// ─── DATA PROCESSING ──────────────────────────────────────

/**
 * Get neighborhoods for a set of districts
 */
function getNeighborhoodsForDistricts(districts) {
  const neighborhoods = [];
  for (const d of districts) {
    if (DISTRICT_NEIGHBORHOODS[d]) {
      neighborhoods.push(...DISTRICT_NEIGHBORHOODS[d]);
    }
  }
  return neighborhoods;
}

/**
 * Filter neighborhood metrics for a set of neighborhoods
 */
function filterNeighborhoodData(allData, neighborhoods) {
  return allData.filter(n => neighborhoods.includes(n.neighborhood));
}

/**
 * Get citizens in a set of neighborhoods
 */
function getCitizensInNeighborhoods(citizens, neighborhoods) {
  const lowerSet = new Set(neighborhoods.map(n => n.toLowerCase()));
  return citizens.filter(c => {
    const cn = (c.Neighborhood || '').toLowerCase();
    return lowerSet.has(cn);
  });
}

/**
 * Aggregate neighborhood metrics for a faction/office summary
 */
function aggregateNeighborhoodMetrics(neighborhoods) {
  if (!neighborhoods.length) return null;
  return {
    count: neighborhoods.length,
    avgSentiment: +(neighborhoods.reduce((s, n) => s + parseNum(n.sentiment), 0) / neighborhoods.length).toFixed(3),
    avgCrimeIndex: +(neighborhoods.reduce((s, n) => s + parseNum(n.crimeIndex), 0) / neighborhoods.length).toFixed(1),
    avgRetailVitality: +(neighborhoods.reduce((s, n) => s + parseNum(n.retailVitality), 0) / neighborhoods.length).toFixed(1),
    totalIncidents: neighborhoods.reduce((s, n) => s + parseNum(n.incidents), 0),
    neighborhoods: neighborhoods.map(n => ({
      name: n.neighborhood,
      sentiment: parseNum(n.sentiment),
      crimeIndex: parseNum(n.crimeIndex),
      retailVitality: parseNum(n.retailVitality),
      incidents: parseNum(n.incidents),
      responseTime: parseNum(n.responseTime),
      demographics: n.demographics || null
    }))
  };
}

/**
 * Build citizen summary for a packet (not full records — just counts and highlights)
 */
function buildCitizenSummary(citizens) {
  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const statusCounts = {};
  let totalWealth = 0;
  let wealthCount = 0;

  for (const c of citizens) {
    const tier = parseInt(c.Tier) || 4;
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    const status = c.Status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    if (c.Income) {
      totalWealth += parseNum(c.Income);
      wealthCount++;
    }
  }

  // Find notable citizens (tier 1-2)
  const notable = citizens
    .filter(c => parseInt(c.Tier) <= 2)
    .map(c => ({
      popId: c.POPID,
      name: `${c.First} ${c.Last}`.trim(),
      tier: parseInt(c.Tier),
      role: c.RoleType || '',
      neighborhood: c.Neighborhood || '',
      displacementRisk: parseNum(c.DisplacementRisk),
      migrationIntent: c.MigrationIntent || 'staying'
    }));

  // Citizens at displacement risk
  const atRisk = citizens.filter(c => parseNum(c.DisplacementRisk) > 0);

  return {
    total: citizens.length,
    tierBreakdown: tierCounts,
    statusBreakdown: statusCounts,
    avgIncome: wealthCount > 0 ? Math.round(totalWealth / wealthCount) : null,
    notableCitizens: notable,
    atDisplacementRisk: atRisk.length,
    withMigrationIntent: citizens.filter(c => c.MigrationIntent && c.MigrationIntent !== 'staying' && c.MigrationIntent !== '').length
  };
}

/**
 * Filter initiatives relevant to an office/faction
 */
function getRelevantInitiatives(initiatives, filter) {
  return initiatives
    .filter(i => i.Status !== 'pipeline') // Exclude pipeline items — not yet in canon
    .filter(filter)
    .map(i => ({
      id: i.InitiativeID,
      name: i.Name,
      status: i.Status,
      budget: i.Budget,
      voteRequirement: i.VoteRequirement,
      voteCycle: i.VoteCycle,
      outcome: i.Outcome,
      leadFaction: i.LeadFaction,
      oppositionFaction: i.OppositionFaction,
      swingVoter: i.SwingVoter,
      affectedNeighborhoods: i.AffectedNeighborhoods,
      policyDomain: i.PolicyDomain,
      consequences: i.Consequences,
      notes: i.Notes
    }));
}

/**
 * Get recent life events for citizens in specific neighborhoods
 */
function getRecentLifeEvents(lifeHistory, neighborhoods, limit) {
  const lowerSet = new Set(neighborhoods.map(n => n.toLowerCase()));
  return lifeHistory
    .filter(e =>
      String(e.Cycle) === String(CYCLE) &&
      lowerSet.has((e.Neighborhood || '').toLowerCase())
    )
    .slice(0, limit || 20)
    .map(e => ({
      popId: e.POPID,
      name: e.Name,
      event: e.EventTag,
      text: e.EventText,
      neighborhood: e.Neighborhood
    }));
}

/**
 * Get events relevant to a domain
 */
function getRelevantEvents(events, domains) {
  return events
    .filter(e =>
      String(e.Cycle) === String(CYCLE) &&
      domains.some(d => (e.Domain || '').toUpperCase().includes(d.toUpperCase()))
    )
    .map(e => ({
      type: e.EventType || e.Domain,
      domain: e.Domain,
      severity: e.Severity,
      neighborhood: e.Neighborhood,
      description: e.Description || e.EventText || ''
    }));
}

// ─── PACKET BUILDERS ──────────────────────────────────────

function buildFactionPacket(factionId, opts) {
  const {
    councilMembers, initiatives, neighborhoodMetrics, crimeMetrics,
    transitMetrics, citizenSummary, lifeEvents, faithOrgs,
    worldEvents, worldPopulation, districtMap
  } = opts;

  return {
    meta: {
      type: 'civic-voice-packet',
      office: factionId,
      cycle: CYCLE,
    },
    faction: {
      id: factionId,
      districts: FACTION_DISTRICTS[factionId],
      members: councilMembers,
      districtNeighborhoodMap: districtMap
    },
    initiatives: initiatives,
    districtData: {
      metrics: neighborhoodMetrics,
      crimeMetrics: crimeMetrics,
      transitStations: transitMetrics,
      citizenSummary: citizenSummary,
      recentLifeEvents: lifeEvents,
      faithCommunities: faithOrgs
    },
    cityWide: {
      population: worldPopulation,
      events: worldEvents
    }
  };
}

function buildOfficePacket(officeId, opts) {
  const {
    officials, initiatives, neighborhoodMetrics, crimeMetrics,
    transitMetrics, citizenSummary, lifeEvents, faithOrgs,
    worldEvents, worldPopulation, domainEvents
  } = opts;

  return {
    meta: {
      type: 'civic-voice-packet',
      office: officeId,
      cycle: CYCLE,
    },
    office: officials,
    initiatives: initiatives,
    domainData: {
      metrics: neighborhoodMetrics || null,
      crimeMetrics: crimeMetrics || null,
      transitStations: transitMetrics || null,
      citizenSummary: citizenSummary || null,
      recentLifeEvents: lifeEvents || null,
      faithCommunities: faithOrgs || null,
      domainEvents: domainEvents || null
    },
    cityWide: {
      population: worldPopulation,
      events: worldEvents
    }
  };
}

// ─── MAIN ─────────────────────────────────────────────────

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  buildCivicVoicePackets.js v1.0 — Cycle ${CYCLE}       ║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // ── Load all sheets in parallel ──
  console.log('Loading sheets...');
  const [
    civicRaw, initRaw, simRaw, nhoodMapRaw, nhoodDemoRaw,
    crimeRaw, transitRaw, faithOrgRaw, lifeHistRaw,
    eventsRaw, worldPopRaw, worldConfigRaw
  ] = await Promise.all([
    sheets.getSheetData('Civic_Office_Ledger'),
    sheets.getSheetData('Initiative_Tracker'),
    sheets.getSheetData('Simulation_Ledger'),
    sheets.getSheetData('Neighborhood_Map'),
    sheets.getSheetData('Neighborhood_Demographics'),
    sheets.getSheetData('Crime_Metrics'),
    sheets.getSheetData('Transit_Metrics'),
    sheets.getSheetData('Faith_Organizations'),
    sheets.getSheetData('LifeHistory_Log'),
    sheets.getSheetData('WorldEvents_V3_Ledger'),
    sheets.getSheetData('World_Population'),
    sheets.getSheetData('World_Config').catch(() => [])
  ]);

  // ── Convert to objects ──
  const civicOfficers = civicRaw.slice(1).map(r => toObj(civicRaw[0], r)).filter(r => r.OfficeId);
  const initiatives = initRaw.slice(1).map(r => toObj(initRaw[0], r)).filter(r => r.InitiativeID);
  const citizens = simRaw.slice(1).map(r => toObj(simRaw[0], r)).filter(r => r.POPID && (r.Status === 'active' || r.Status === 'Active'));
  const lifeHistory = lifeHistRaw.slice(1).map(r => toObj(lifeHistRaw[0], r));
  const faithOrgs = faithOrgRaw.slice(1).map(r => toObj(faithOrgRaw[0], r));
  const worldEvents = eventsRaw.slice(1).map(r => toObj(eventsRaw[0], r));

  // Neighborhood data — join map + demographics + crime
  const nhoodMap = nhoodMapRaw.slice(1).map(r => toObj(nhoodMapRaw[0], r));
  const nhoodDemo = nhoodDemoRaw.slice(1).map(r => toObj(nhoodDemoRaw[0], r));
  const crimeData = crimeRaw.slice(1).map(r => toObj(crimeRaw[0], r));

  // Join neighborhood data into single objects
  const neighborhoodData = nhoodMap.map(nm => {
    const demo = nhoodDemo.find(d => d.Neighborhood === nm.Neighborhood) || {};
    const crime = crimeData.find(c => c.Neighborhood === nm.Neighborhood) || {};
    return {
      neighborhood: nm.Neighborhood,
      sentiment: nm.Sentiment,
      crimeIndex: nm.CrimeIndex,
      retailVitality: nm.RetailVitality,
      nightlifeProfile: nm.NightlifeProfile,
      noiseIndex: nm.NoiseIndex,
      eventAttractiveness: nm.EventAttractiveness,
      demographicMarker: nm.DemographicMarker,
      medianIncome: nm.MedianIncome,
      medianRent: nm.MedianRent,
      gentrificationPhase: nm.GentrificationPhase,
      displacementPressure: nm.DisplacementPressure,
      // Demographics
      students: parseNum(demo.Students),
      adults: parseNum(demo.Adults),
      seniors: parseNum(demo.Seniors),
      unemployed: parseNum(demo.Unemployed),
      sick: parseNum(demo.Sick),
      schoolQuality: parseNum(demo.SchoolQualityIndex),
      graduationRate: parseNum(demo.GraduationRate),
      // Crime
      propertyCrime: parseNum(crime.PropertyCrimeIndex),
      violentCrime: parseNum(crime.ViolentCrimeIndex),
      responseTime: parseNum(crime.ResponseTimeAvg),
      clearanceRate: parseNum(crime.ClearanceRate),
      incidents: parseNum(crime.IncidentCount)
    };
  });

  // Transit data — filter to current cycle
  const transitData = transitRaw.slice(1)
    .map(r => toObj(transitRaw[0], r))
    .filter(r => String(r.Cycle) === String(CYCLE) && r.Station)
    .map(t => ({
      station: t.Station,
      ridership: parseNum(t.RidershipVolume),
      onTimePerformance: parseNum(t.OnTimePerformance),
      trafficIndex: parseNum(t.TrafficIndex),
      notes: t.Notes
    }));

  // World population — latest row
  const worldPop = worldPopRaw.length > 1
    ? toObj(worldPopRaw[0], worldPopRaw[worldPopRaw.length - 1])
    : {};
  const worldPopSummary = {
    totalPopulation: parseNum(worldPop.totalPopulation),
    illnessRate: parseNum(worldPop.illnessRate),
    employmentRate: parseNum(worldPop.employmentRate),
    migration: parseNum(worldPop.migration),
    economy: worldPop.economy,
    sentiment: parseNum(worldPop.sentiment),
    cycleWeight: worldPop.cycleWeight,
    shockFlag: worldPop.shockFlag
  };

  // All current-cycle world events
  const cycleEvents = worldEvents.filter(e => String(e.Cycle) === String(CYCLE));

  console.log(`  Civic officers: ${civicOfficers.length}`);
  console.log(`  Initiatives: ${initiatives.length}`);
  console.log(`  Active citizens: ${citizens.length}`);
  console.log(`  Neighborhoods: ${neighborhoodData.length}`);
  console.log(`  Crime metrics: ${crimeData.length} neighborhoods`);
  console.log(`  Transit stations: ${transitData.length}`);
  console.log(`  Faith orgs: ${faithOrgs.length}`);
  console.log(`  Life events (all): ${lifeHistory.length}`);
  console.log(`  World events (C${CYCLE}): ${cycleEvents.length}`);
  console.log('');

  // ── Helper: get council members for a faction ──
  function getCouncilMembers(faction) {
    return civicOfficers
      .filter(o => o.Faction === faction && o.Type === 'elected' && o.District && o.District.startsWith('D'))
      .map(o => ({
        officeId: o.OfficeId,
        title: o.Title,
        district: o.District,
        name: o.Holder,
        popId: o.PopId,
        faction: o.Faction,
        status: o.Status,
        votingPower: o.VotingPower,
        approval: parseNum(o.Approval),
        notes: o.Notes,
        neighborhoods: DISTRICT_NEIGHBORHOODS[o.District] || []
      }));
  }

  // ── Helper: get faith orgs in neighborhoods ──
  function getFaithOrgs(neighborhoods) {
    const lowerSet = new Set(neighborhoods.map(n => n.toLowerCase()));
    return faithOrgs.filter(f =>
      lowerSet.has((f.Neighborhood || '').toLowerCase())
    ).map(f => ({
      name: f.Organization,
      tradition: f.FaithTradition,
      neighborhood: f.Neighborhood,
      congregation: parseNum(f.Congregation),
      leader: f.Leader,
      character: f.Character
    }));
  }

  // ── Build district map for a faction ──
  function buildDistrictMap(districts) {
    const map = {};
    for (const d of districts) {
      const member = civicOfficers.find(o => o.District === d);
      map[d] = {
        member: member ? member.Holder : 'vacant',
        faction: member ? member.Faction : '',
        neighborhoods: DISTRICT_NEIGHBORHOODS[d] || [],
        citizenCount: getCitizensInNeighborhoods(citizens, DISTRICT_NEIGHBORHOODS[d] || []).length
      };
    }
    return map;
  }

  const manifest = { cycle: CYCLE, packets: {} };

  // ════════════════════════════════════════════════════════════
  // MAYOR'S OFFICE
  // ════════════════════════════════════════════════════════════
  console.log('Building Mayor\'s Office packet...');
  const mayorOfficials = civicOfficers
    .filter(o => ['MAYOR-01', 'DEPUTY-MAYOR-01', 'DEPUTY-MAYOR-02'].includes(o.OfficeId) ||
                  o.Title === 'Chief of Staff' || o.Title === 'Communications Director')
    .map(o => ({
      officeId: o.OfficeId, title: o.Title, name: o.Holder,
      popId: o.PopId, status: o.Status, faction: o.Faction,
      approval: parseNum(o.Approval), notes: o.Notes
    }));

  const mayorPacket = buildOfficePacket('mayor', {
    officials: mayorOfficials,
    initiatives: getRelevantInitiatives(initiatives, () => true), // Mayor sees all
    neighborhoodMetrics: aggregateNeighborhoodMetrics(neighborhoodData),
    crimeMetrics: null, // City-wide summary only
    transitMetrics: transitData,
    citizenSummary: buildCitizenSummary(citizens),
    lifeEvents: null, // Too broad — Mayor gets city-wide events instead
    faithOrgs: null,
    worldEvents: cycleEvents.map(e => ({
      type: e.EventType || e.Domain, domain: e.Domain,
      severity: e.Severity, neighborhood: e.Neighborhood,
      description: e.Description || e.EventText || ''
    })),
    worldPopulation: worldPopSummary
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, `mayor_c${CYCLE}.json`), JSON.stringify(mayorPacket, null, 2));
  manifest.packets.mayor = { file: `mayor_c${CYCLE}.json`, initiatives: mayorPacket.initiatives.length };
  console.log(`  ✓ Mayor: ${mayorPacket.initiatives.length} initiatives, ${cycleEvents.length} events`);

  // ════════════════════════════════════════════════════════════
  // OPP FACTION
  // ════════════════════════════════════════════════════════════
  console.log('Building OPP Faction packet...');
  const oppDistricts = FACTION_DISTRICTS.OPP;
  const oppNeighborhoods = getNeighborhoodsForDistricts(oppDistricts);
  const oppNhoodData = filterNeighborhoodData(neighborhoodData, oppNeighborhoods);
  const oppCitizens = getCitizensInNeighborhoods(citizens, oppNeighborhoods);

  const oppPacket = buildFactionPacket('opp_faction', {
    councilMembers: getCouncilMembers('OPP'),
    initiatives: getRelevantInitiatives(initiatives, i =>
      i.LeadFaction === 'OPP' || i.PolicyDomain === 'economic' ||
      i.PolicyDomain === 'safety' || i.PolicyDomain === 'transit' ||
      i.Status === 'passed' || i.Status === 'active'
    ),
    neighborhoodMetrics: aggregateNeighborhoodMetrics(oppNhoodData),
    crimeMetrics: oppNhoodData.map(n => ({
      neighborhood: n.neighborhood, propertyCrime: n.propertyCrime,
      violentCrime: n.violentCrime, responseTime: n.responseTime, incidents: n.incidents
    })),
    transitMetrics: transitData.filter(t =>
      ['West Oakland', 'Fruitvale', 'Coliseum'].some(s => t.station.includes(s))
    ),
    citizenSummary: buildCitizenSummary(oppCitizens),
    lifeEvents: getRecentLifeEvents(lifeHistory, oppNeighborhoods, 15),
    faithOrgs: getFaithOrgs(oppNeighborhoods),
    worldEvents: cycleEvents.map(e => ({
      type: e.EventType || e.Domain, domain: e.Domain,
      severity: e.Severity, neighborhood: e.Neighborhood
    })),
    worldPopulation: worldPopSummary,
    districtMap: buildDistrictMap(oppDistricts)
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, `opp_faction_c${CYCLE}.json`), JSON.stringify(oppPacket, null, 2));
  manifest.packets.opp_faction = {
    file: `opp_faction_c${CYCLE}.json`, districts: oppDistricts,
    citizenCount: oppCitizens.length, neighborhoods: oppNeighborhoods
  };
  console.log(`  ✓ OPP: ${oppDistricts.length} districts, ${oppNeighborhoods.length} neighborhoods, ${oppCitizens.length} citizens`);

  // ════════════════════════════════════════════════════════════
  // CRC FACTION
  // ════════════════════════════════════════════════════════════
  console.log('Building CRC Faction packet...');
  const crcDistricts = FACTION_DISTRICTS.CRC;
  const crcNeighborhoods = getNeighborhoodsForDistricts(crcDistricts);
  const crcNhoodData = filterNeighborhoodData(neighborhoodData, crcNeighborhoods);
  const crcCitizens = getCitizensInNeighborhoods(citizens, crcNeighborhoods);

  const crcPacket = buildFactionPacket('crc_faction', {
    councilMembers: getCouncilMembers('CRC'),
    initiatives: getRelevantInitiatives(initiatives, i =>
      i.OppositionFaction === 'CRC' || i.PolicyDomain === 'economic' ||
      i.PolicyDomain === 'health' || i.Status === 'passed' || i.Status === 'active'
    ),
    neighborhoodMetrics: aggregateNeighborhoodMetrics(crcNhoodData),
    crimeMetrics: crcNhoodData.map(n => ({
      neighborhood: n.neighborhood, propertyCrime: n.propertyCrime,
      violentCrime: n.violentCrime, responseTime: n.responseTime, incidents: n.incidents
    })),
    transitMetrics: transitData.filter(t =>
      ['Rockridge', 'MacArthur', 'Lake Merritt'].some(s => t.station.includes(s))
    ),
    citizenSummary: buildCitizenSummary(crcCitizens),
    lifeEvents: getRecentLifeEvents(lifeHistory, crcNeighborhoods, 15),
    faithOrgs: getFaithOrgs(crcNeighborhoods),
    worldEvents: cycleEvents.map(e => ({
      type: e.EventType || e.Domain, domain: e.Domain,
      severity: e.Severity, neighborhood: e.Neighborhood
    })),
    worldPopulation: worldPopSummary,
    districtMap: buildDistrictMap(crcDistricts)
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, `crc_faction_c${CYCLE}.json`), JSON.stringify(crcPacket, null, 2));
  manifest.packets.crc_faction = {
    file: `crc_faction_c${CYCLE}.json`, districts: crcDistricts,
    citizenCount: crcCitizens.length, neighborhoods: crcNeighborhoods
  };
  console.log(`  ✓ CRC: ${crcDistricts.length} districts, ${crcNeighborhoods.length} neighborhoods, ${crcCitizens.length} citizens`);

  // ════════════════════════════════════════════════════════════
  // IND SWING VOTERS
  // ════════════════════════════════════════════════════════════
  console.log('Building IND Swing packet...');
  const indDistricts = FACTION_DISTRICTS.IND;
  const indNeighborhoods = getNeighborhoodsForDistricts(indDistricts);
  const indNhoodData = filterNeighborhoodData(neighborhoodData, indNeighborhoods);
  const indCitizens = getCitizensInNeighborhoods(citizens, indNeighborhoods);

  const indPacket = buildFactionPacket('ind_swing', {
    councilMembers: getCouncilMembers('IND'),
    initiatives: getRelevantInitiatives(initiatives, () => true), // Swing voters see all
    neighborhoodMetrics: aggregateNeighborhoodMetrics(indNhoodData),
    crimeMetrics: indNhoodData.map(n => ({
      neighborhood: n.neighborhood, propertyCrime: n.propertyCrime,
      violentCrime: n.violentCrime, responseTime: n.responseTime, incidents: n.incidents
    })),
    transitMetrics: transitData.filter(t =>
      ['12th St', '19th St', 'Lake Merritt'].some(s => t.station.includes(s))
    ),
    citizenSummary: buildCitizenSummary(indCitizens),
    lifeEvents: getRecentLifeEvents(lifeHistory, indNeighborhoods, 15),
    faithOrgs: getFaithOrgs(indNeighborhoods),
    worldEvents: cycleEvents.map(e => ({
      type: e.EventType || e.Domain, domain: e.Domain,
      severity: e.Severity, neighborhood: e.Neighborhood
    })),
    worldPopulation: worldPopSummary,
    districtMap: buildDistrictMap(indDistricts)
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, `ind_swing_c${CYCLE}.json`), JSON.stringify(indPacket, null, 2));
  manifest.packets.ind_swing = {
    file: `ind_swing_c${CYCLE}.json`, districts: indDistricts,
    citizenCount: indCitizens.length, neighborhoods: indNeighborhoods
  };
  console.log(`  ✓ IND: ${indDistricts.length} districts, ${indNeighborhoods.length} neighborhoods, ${indCitizens.length} citizens`);

  // ════════════════════════════════════════════════════════════
  // POLICE CHIEF
  // ════════════════════════════════════════════════════════════
  console.log('Building Police Chief packet...');
  const chiefOfficials = civicOfficers
    .filter(o => o.Title === 'Police Chief' || o.Title === 'Civilian Police Review Chair')
    .map(o => ({
      officeId: o.OfficeId, title: o.Title, name: o.Holder,
      popId: o.PopId, status: o.Status, notes: o.Notes
    }));

  // OARI pilot districts
  const oariDistricts = ['D1', 'D3', 'D5'];
  const oariNeighborhoods = getNeighborhoodsForDistricts(oariDistricts);
  const nonOariNeighborhoods = Object.values(DISTRICT_NEIGHBORHOODS).flat()
    .filter(n => !oariNeighborhoods.includes(n));

  const policePacket = buildOfficePacket('police_chief', {
    officials: chiefOfficials,
    initiatives: getRelevantInitiatives(initiatives, i =>
      i.PolicyDomain === 'safety' || i.Name.includes('OARI') || i.Name.includes('Response')
    ),
    neighborhoodMetrics: aggregateNeighborhoodMetrics(neighborhoodData),
    crimeMetrics: {
      allNeighborhoods: neighborhoodData.map(n => ({
        neighborhood: n.neighborhood, propertyCrime: n.propertyCrime,
        violentCrime: n.violentCrime, responseTime: n.responseTime,
        clearanceRate: n.clearanceRate, incidents: n.incidents
      })),
      oariDistricts: {
        neighborhoods: oariNeighborhoods,
        avgResponseTime: +(neighborhoodData
          .filter(n => oariNeighborhoods.includes(n.neighborhood))
          .reduce((s, n) => s + n.responseTime, 0) /
          Math.max(neighborhoodData.filter(n => oariNeighborhoods.includes(n.neighborhood)).length, 1)
        ).toFixed(1),
        totalIncidents: neighborhoodData
          .filter(n => oariNeighborhoods.includes(n.neighborhood))
          .reduce((s, n) => s + n.incidents, 0)
      },
      nonOariDistricts: {
        neighborhoods: nonOariNeighborhoods,
        avgResponseTime: +(neighborhoodData
          .filter(n => nonOariNeighborhoods.includes(n.neighborhood))
          .reduce((s, n) => s + n.responseTime, 0) /
          Math.max(neighborhoodData.filter(n => nonOariNeighborhoods.includes(n.neighborhood)).length, 1)
        ).toFixed(1),
        totalIncidents: neighborhoodData
          .filter(n => nonOariNeighborhoods.includes(n.neighborhood))
          .reduce((s, n) => s + n.incidents, 0)
      }
    },
    transitMetrics: null,
    citizenSummary: null,
    lifeEvents: null,
    faithOrgs: null,
    worldEvents: cycleEvents.map(e => ({
      type: e.EventType || e.Domain, domain: e.Domain,
      severity: e.Severity, neighborhood: e.Neighborhood
    })),
    worldPopulation: worldPopSummary,
    domainEvents: getRelevantEvents(worldEvents, ['CRIME', 'SAFETY', 'HEALTH'])
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, `police_chief_c${CYCLE}.json`), JSON.stringify(policePacket, null, 2));
  manifest.packets.police_chief = {
    file: `police_chief_c${CYCLE}.json`,
    crimeNeighborhoods: neighborhoodData.length,
    oariDistricts: oariNeighborhoods
  };
  console.log(`  ✓ Police Chief: ${neighborhoodData.length} neighborhoods, OARI districts: ${oariNeighborhoods.join(', ')}`);

  // ════════════════════════════════════════════════════════════
  // BAYLIGHT AUTHORITY
  // ════════════════════════════════════════════════════════════
  console.log('Building Baylight Authority packet...');
  const baylightNeighborhoods = ['Jack London', 'Coliseum', 'Downtown', 'Brooklyn'];
  const baylightNhoodData = filterNeighborhoodData(neighborhoodData, baylightNeighborhoods);
  const baylightCitizens = getCitizensInNeighborhoods(citizens, baylightNeighborhoods);

  const baylightPacket = buildOfficePacket('baylight_authority', {
    officials: [{ name: 'Keisha Ramos', title: 'Director, Baylight Authority', office: 'baylight_authority' }],
    initiatives: getRelevantInitiatives(initiatives, i =>
      i.InitiativeID === 'INIT-006' || i.Name.includes('Baylight') || i.Name.includes('Port')
    ),
    neighborhoodMetrics: aggregateNeighborhoodMetrics(baylightNhoodData),
    crimeMetrics: baylightNhoodData.map(n => ({
      neighborhood: n.neighborhood, propertyCrime: n.propertyCrime,
      violentCrime: n.violentCrime, incidents: n.incidents
    })),
    transitMetrics: transitData.filter(t =>
      ['Coliseum', 'Jack London', '12th St'].some(s => t.station.includes(s))
    ),
    citizenSummary: buildCitizenSummary(baylightCitizens),
    lifeEvents: getRecentLifeEvents(lifeHistory, baylightNeighborhoods, 10),
    faithOrgs: null,
    worldEvents: cycleEvents.map(e => ({
      type: e.EventType || e.Domain, domain: e.Domain,
      severity: e.Severity, neighborhood: e.Neighborhood
    })),
    worldPopulation: worldPopSummary,
    domainEvents: getRelevantEvents(worldEvents, ['INFRASTRUCTURE', 'ECONOMIC', 'HOUSING'])
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, `baylight_authority_c${CYCLE}.json`), JSON.stringify(baylightPacket, null, 2));
  manifest.packets.baylight_authority = {
    file: `baylight_authority_c${CYCLE}.json`,
    adjacentNeighborhoods: baylightNeighborhoods,
    citizenCount: baylightCitizens.length
  };
  console.log(`  ✓ Baylight Authority: ${baylightNeighborhoods.length} adjacent neighborhoods, ${baylightCitizens.length} citizens`);

  // ════════════════════════════════════════════════════════════
  // DISTRICT ATTORNEY
  // ════════════════════════════════════════════════════════════
  console.log('Building District Attorney packet...');
  const daOfficials = civicOfficers
    .filter(o => o.Title === 'District Attorney' || o.Title === 'Public Defender')
    .map(o => ({
      officeId: o.OfficeId, title: o.Title, name: o.Holder,
      popId: o.PopId, status: o.Status, faction: o.Faction, notes: o.Notes
    }));

  const daPacket = buildOfficePacket('district_attorney', {
    officials: daOfficials,
    initiatives: getRelevantInitiatives(initiatives, i =>
      i.PolicyDomain === 'safety' || i.Name.includes('Response') || i.Name.includes('OARI')
    ),
    neighborhoodMetrics: null, // DA doesn't need neighborhood-level data
    crimeMetrics: {
      cityWide: {
        totalIncidents: neighborhoodData.reduce((s, n) => s + n.incidents, 0),
        avgResponseTime: +(neighborhoodData.reduce((s, n) => s + n.responseTime, 0) / neighborhoodData.length).toFixed(1),
        avgClearanceRate: +(neighborhoodData.reduce((s, n) => s + n.clearanceRate, 0) / neighborhoodData.length).toFixed(3),
        highCrimeNeighborhoods: neighborhoodData
          .filter(n => n.violentCrime > 60)
          .map(n => ({ neighborhood: n.neighborhood, violentCrime: n.violentCrime, incidents: n.incidents }))
      }
    },
    transitMetrics: null,
    citizenSummary: null,
    lifeEvents: null,
    faithOrgs: null,
    worldEvents: cycleEvents.map(e => ({
      type: e.EventType || e.Domain, domain: e.Domain,
      severity: e.Severity, neighborhood: e.Neighborhood
    })),
    worldPopulation: worldPopSummary,
    domainEvents: getRelevantEvents(worldEvents, ['CRIME', 'SAFETY'])
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, `district_attorney_c${CYCLE}.json`), JSON.stringify(daPacket, null, 2));
  manifest.packets.district_attorney = {
    file: `district_attorney_c${CYCLE}.json`,
    crimeEvents: (daPacket.domainData.domainEvents || []).length
  };
  console.log(`  ✓ District Attorney: ${(daPacket.domainData.domainEvents || []).length} crime/safety events`);

  // ── Write manifest ──
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\n════════════════════════════════════════════════════`);
  console.log(`  7 civic voice packets written to output/civic-voice-packets/`);
  console.log(`  Manifest: output/civic-voice-packets/manifest.json`);
  console.log(`════════════════════════════════════════════════════\n`);
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
