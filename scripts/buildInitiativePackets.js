#!/usr/bin/env node
/**
 * buildInitiativePackets.js v1.0
 *
 * Pulls live data from Google Sheets and local files to build per-initiative
 * JSON packets for civic project agents. Each packet contains the initiative's
 * current state, affected citizens, neighborhood context, business data,
 * Mara's forward guidance, and previous cycle decisions — everything an
 * initiative agent needs to make autonomous decisions and produce documents.
 *
 * Usage: node scripts/buildInitiativePackets.js [cycleNumber]
 *   e.g. node scripts/buildInitiativePackets.js 86
 *
 * Reads from Google Sheets:
 *   Initiative_Tracker, Simulation_Ledger, Civic_Office_Ledger,
 *   Neighborhood_Demographics, Neighborhood_Map, Business_Ledger,
 *   Crime_Metrics
 *
 * Reads from local files:
 *   output/mara_directive_c{XX-1}.txt
 *   output/civic-documents/{initiative}/decisions_c{XX-1}.json
 *
 * Writes:
 *   output/initiative-packets/stabilization_fund_c{XX}.json
 *   output/initiative-packets/oari_c{XX}.json
 *   output/initiative-packets/transit_hub_c{XX}.json
 *   output/initiative-packets/health_center_c{XX}.json
 *   output/initiative-packets/baylight_c{XX}.json
 *   output/initiative-packets/manifest.json
 */

const fs = require('fs');
const path = require('path');

// ─── CONFIGURATION ─────────────────────────────────────────
const PROJECT_ROOT_EARLY = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(PROJECT_ROOT_EARLY, '.env') });

const CYCLE = parseInt(process.argv[2]) || 86;
const PROJECT_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output/initiative-packets');
const CIVIC_DOCS_DIR = path.join(PROJECT_ROOT, 'output/civic-documents');

// ─── INITIATIVE DEFINITIONS ────────────────────────────────
// Maps each initiative to its agent, relevant neighborhoods, policy focus,
// and any directly-linked citizen POPIDs.
const INITIATIVE_CONFIG = {
  'INIT-001': {
    agentName: 'stabilization-fund',
    packetKey: 'stabilization_fund',
    officeName: 'Office of Economic and Workforce Development (OEWD)',
    policyDomains: ['economic', 'housing', 'workforce'],
    // Low-income neighborhoods with displacement pressure
    neighborhoods: ['West Oakland', 'East Oakland', 'Fruitvale', 'San Antonio', 'Coliseum', 'Elmhurst', 'Brooklyn'],
    // Citizens directly linked to this initiative (applicants, stakeholders)
    linkedCitizens: ['POP-00772'], // Beverly Hayes — first applicant
    budgetField: 'Budget',
    description: 'Neighborhood Stabilization Fund — $28M for housing stability, small business support, and workforce development in displacement-risk neighborhoods'
  },
  'INIT-002': {
    agentName: 'oari',
    packetKey: 'oari',
    officeName: 'Oakland Alternative Response Initiative (OARI)',
    policyDomains: ['safety', 'health', 'community'],
    // High-priority deployment neighborhoods
    neighborhoods: ['West Oakland', 'East Oakland', 'Fruitvale', 'Downtown', 'Chinatown', 'Coliseum', 'Elmhurst'],
    linkedCitizens: [],
    budgetField: 'Budget',
    description: 'Oakland Alternative Response Initiative — $12.5M for civilian crisis response teams as alternative to armed police response'
  },
  'INIT-003': {
    agentName: 'transit-hub',
    packetKey: 'transit_hub',
    officeName: 'Fruitvale Transit Hub Planning Office',
    policyDomains: ['infrastructure', 'transit', 'economic'],
    neighborhoods: ['Fruitvale', 'San Antonio'],
    linkedCitizens: [],
    budgetField: 'Budget',
    description: 'Fruitvale Transit Hub Modernization — $230M for transit-oriented development and community hub'
  },
  'INIT-005': {
    agentName: 'health-center',
    packetKey: 'health_center',
    officeName: 'Temescal Community Health Center Project Office',
    policyDomains: ['health', 'community', 'infrastructure'],
    neighborhoods: ['Temescal', 'Rockridge'],
    linkedCitizens: [],
    budgetField: 'Budget',
    description: 'Temescal Community Health Center — $45M for neighborhood health facility with priority designation'
  },
  'INIT-006': {
    agentName: 'baylight',
    packetKey: 'baylight',
    officeName: 'Baylight Authority',
    policyDomains: ['infrastructure', 'economic', 'housing'],
    neighborhoods: ['Jack London', 'Coliseum', 'Downtown', 'Brooklyn'],
    linkedCitizens: [],
    budgetField: 'Budget',
    description: 'Baylight District Development — $2.1B mixed-use waterfront development with 5 deliverables due September 15'
  }
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

// ─── LOCAL FILE READERS ────────────────────────────────────

/**
 * Read Mara's directive from the previous cycle.
 * Returns the full text or null if not found.
 */
function readMaraDirective(prevCycle) {
  const filePath = path.join(PROJECT_ROOT, `output/mara_directive_c${prevCycle}.txt`);
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Read previous cycle's decisions JSON for an initiative.
 * Returns parsed object or null if not found.
 */
function readPreviousDecisions(agentName, prevCycle) {
  const filePath = path.join(CIVIC_DOCS_DIR, agentName, `decisions_c${prevCycle}.json`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * List all civic documents previously produced by an initiative agent.
 * Returns array of filenames.
 */
function listPreviousDocuments(agentName) {
  const dirPath = path.join(CIVIC_DOCS_DIR, agentName);
  try {
    return fs.readdirSync(dirPath).filter(f => f.endsWith('.md') || f.endsWith('.json'));
  } catch {
    return [];
  }
}

// ─── DATA PROCESSING ──────────────────────────────────────

/**
 * Filter citizens by neighborhood list + any directly-linked POPIDs
 */
function getInitiativeCitizens(allCitizens, neighborhoods, linkedPopIds) {
  const nhoodSet = new Set(neighborhoods.map(n => n.toLowerCase()));
  const linkedSet = new Set(linkedPopIds || []);

  return allCitizens.filter(c => {
    const inNeighborhood = nhoodSet.has((c.Neighborhood || '').toLowerCase());
    const isLinked = linkedSet.has(c.POPID);
    return inNeighborhood || isLinked;
  });
}

/**
 * Build citizen detail for an initiative packet.
 * More detailed than voice packets — includes income, employment, household info.
 */
function buildInitiativeCitizenData(citizens, linkedPopIds) {
  const linkedSet = new Set(linkedPopIds || []);
  const tierCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };

  for (const c of citizens) {
    const tier = parseInt(c.Tier) || 4;
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;
  }

  // Directly linked citizens get full profiles
  const linkedProfiles = citizens
    .filter(c => linkedSet.has(c.POPID))
    .map(c => ({
      popId: c.POPID,
      name: `${c.First} ${c.Last}`.trim(),
      tier: parseInt(c.Tier) || 4,
      age: parseNum(c.Age),
      neighborhood: c.Neighborhood || '',
      occupation: c.Occupation || '',
      roleType: c.RoleType || '',
      employer: c.Employer || '',
      income: parseNum(c.Income),
      householdId: c.HouseholdId || '',
      maritalStatus: c.MaritalStatus || '',
      displacementRisk: parseNum(c.DisplacementRisk),
      migrationIntent: c.MigrationIntent || 'staying',
      healthStatus: c.HealthStatus || '',
      notes: c.Notes || ''
    }));

  // Notable citizens (tier 1-2) get summaries
  const notable = citizens
    .filter(c => parseInt(c.Tier) <= 2 && !linkedSet.has(c.POPID))
    .map(c => ({
      popId: c.POPID,
      name: `${c.First} ${c.Last}`.trim(),
      tier: parseInt(c.Tier),
      neighborhood: c.Neighborhood || '',
      occupation: c.Occupation || '',
      displacementRisk: parseNum(c.DisplacementRisk)
    }));

  // Aggregate stats
  const incomes = citizens.filter(c => c.Income).map(c => parseNum(c.Income));
  const atRisk = citizens.filter(c => parseNum(c.DisplacementRisk) > 0);

  return {
    total: citizens.length,
    tierBreakdown: tierCounts,
    avgIncome: incomes.length > 0 ? Math.round(incomes.reduce((a, b) => a + b, 0) / incomes.length) : null,
    medianIncome: incomes.length > 0 ? incomes.sort((a, b) => a - b)[Math.floor(incomes.length / 2)] : null,
    atDisplacementRisk: atRisk.length,
    linkedProfiles,
    notableCitizens: notable.slice(0, 20)
  };
}

/**
 * Get neighborhood context for an initiative's affected areas
 */
function buildNeighborhoodContext(nhoodData, crimeData, neighborhoods) {
  const nhoodSet = new Set(neighborhoods.map(n => n.toLowerCase()));

  const relevant = nhoodData.filter(n => nhoodSet.has((n.neighborhood || '').toLowerCase()));
  const relevantCrime = crimeData.filter(c => nhoodSet.has((c.Neighborhood || '').toLowerCase()));

  return relevant.map(n => {
    const crime = relevantCrime.find(c => (c.Neighborhood || '').toLowerCase() === (n.neighborhood || '').toLowerCase()) || {};
    return {
      neighborhood: n.neighborhood,
      sentiment: parseNum(n.Sentiment),
      medianIncome: n.MedianIncome || '',
      medianRent: n.MedianRent || '',
      gentrificationPhase: n.GentrificationPhase || '',
      displacementPressure: n.DisplacementPressure || '',
      crimeIndex: parseNum(n.CrimeIndex),
      retailVitality: parseNum(n.RetailVitality),
      // Demographics
      students: parseNum(n.Students),
      adults: parseNum(n.Adults),
      seniors: parseNum(n.Seniors),
      unemployed: parseNum(n.Unemployed),
      sick: parseNum(n.Sick),
      schoolQuality: parseNum(n.SchoolQualityIndex),
      // Crime detail
      propertyCrime: parseNum(crime.PropertyCrimeIndex),
      violentCrime: parseNum(crime.ViolentCrimeIndex),
      responseTime: parseNum(crime.ResponseTimeAvg),
      incidents: parseNum(crime.IncidentCount)
    };
  });
}

/**
 * Get businesses in initiative neighborhoods
 */
function getInitiativeBusinesses(businesses, neighborhoods) {
  const nhoodSet = new Set(neighborhoods.map(n => n.toLowerCase()));
  return businesses
    .filter(b => nhoodSet.has((b.Neighborhood || '').toLowerCase()) && b.Name)
    .map(b => ({
      bizId: (b.BIZ_ID || '').trim(),
      name: b.Name,
      sector: b.Sector || '',
      neighborhood: b.Neighborhood || '',
      employeeCount: parseInt(b.Employee_Count) || 0,
      avgSalary: parseInt(String(b.Avg_Salary || '0').replace(/[$,\s]/g, '')) || 0,
      growthRate: b.Growth_Rate || '',
      status: b.Status || ''
    }))
    .sort((a, b) => b.employeeCount - a.employeeCount);
}

/**
 * Get civic officials relevant to an initiative
 */
function getRelevantOfficials(civicOfficers, policyDomains) {
  // Include mayor's office, relevant department heads, and council members
  // whose districts overlap with initiative neighborhoods
  const keyOffices = ['MAYOR-01', 'DEPUTY-MAYOR-01', 'DEPUTY-MAYOR-02'];

  return civicOfficers
    .filter(o => {
      if (keyOffices.includes(o.OfficeId)) return true;
      if (o.Title === 'City Planning Director') return true;
      if (o.Title === 'Chief of Staff') return true;
      return false;
    })
    .map(o => ({
      officeId: o.OfficeId,
      title: o.Title,
      name: o.Holder,
      popId: o.PopId || '',
      status: o.Status || '',
      faction: o.Faction || ''
    }));
}

/**
 * Build the full initiative tracker record with all available fields
 */
function buildInitiativeRecord(initiative) {
  return {
    id: initiative.InitiativeID,
    name: initiative.Name,
    type: initiative.Type || '',
    status: initiative.Status,
    budget: initiative.Budget || '',
    voteRequirement: initiative.VoteRequirement || '',
    voteCycle: initiative.VoteCycle || '',
    projection: initiative.Projection || '',
    outcome: initiative.Outcome || '',
    leadFaction: initiative.LeadFaction || '',
    oppositionFaction: initiative.OppositionFaction || '',
    swingVoter: initiative.SwingVoter || '',
    affectedNeighborhoods: initiative.AffectedNeighborhoods || '',
    policyDomain: initiative.PolicyDomain || '',
    consequences: initiative.Consequences || '',
    mayoralAction: initiative.MayoralAction || '',
    mayoralActionCycle: initiative.MayoralActionCycle || '',
    notes: initiative.Notes || '',
    lastUpdated: initiative.LastUpdated || '',
    // Post-vote implementation tracking (may not yet exist)
    implementationPhase: initiative.ImplementationPhase || '',
    milestoneNotes: initiative.MilestoneNotes || '',
    nextScheduledAction: initiative.NextScheduledAction || '',
    nextActionCycle: initiative.NextActionCycle || ''
  };
}

// ─── PACKET BUILDER ────────────────────────────────────────

function buildInitiativePacket(config, opts) {
  const {
    initiative, prevDecisions, maraDirective, previousDocs,
    citizenData, neighborhoodContext, businesses, officials, cycle
  } = opts;

  return {
    meta: {
      type: 'initiative-packet',
      initiative: config.agentName,
      initiativeId: initiative ? initiative.id : config.agentName,
      cycle: cycle,
      generatedAt: new Date().toISOString(),
      description: config.description
    },
    initiative: initiative,
    office: {
      name: config.officeName,
      policyDomains: config.policyDomains,
      officials: officials
    },
    previousCycle: {
      decisions: prevDecisions,
      documentsProduced: previousDocs
    },
    maraDirective: maraDirective,
    citizens: citizenData,
    neighborhoods: neighborhoodContext,
    businesses: businesses
  };
}

// ─── MAIN ─────────────────────────────────────────────────

async function main() {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║  buildInitiativePackets.js v1.0 — Cycle ${CYCLE}       ║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  // Create output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // ── Load all sheets in parallel ──
  console.log('Loading sheets...');
  const [
    initRaw, simRaw, civicRaw, nhoodDemoRaw, nhoodMapRaw,
    bizRaw, crimeRaw
  ] = await Promise.all([
    sheets.getSheetData('Initiative_Tracker'),
    sheets.getSheetData('Simulation_Ledger'),
    sheets.getSheetData('Civic_Office_Ledger'),
    sheets.getSheetData('Neighborhood_Demographics'),
    sheets.getSheetData('Neighborhood_Map'),
    sheets.getSheetData('Business_Ledger').catch(() => []),
    sheets.getSheetData('Crime_Metrics').catch(() => [])
  ]);

  // ── Convert to objects ──
  const initiatives = initRaw.length > 1
    ? initRaw.slice(1).map(r => toObj(initRaw[0], r)).filter(r => r.InitiativeID)
    : [];
  const citizens = simRaw.length > 1
    ? simRaw.slice(1).map(r => toObj(simRaw[0], r)).filter(r => r.POPID && (r.Status === 'active' || r.Status === 'Active'))
    : [];
  const civicOfficers = civicRaw.length > 1
    ? civicRaw.slice(1).map(r => toObj(civicRaw[0], r)).filter(r => r.OfficeId)
    : [];

  // Neighborhood data — join map + demographics
  const nhoodMap = nhoodMapRaw.length > 1
    ? nhoodMapRaw.slice(1).map(r => toObj(nhoodMapRaw[0], r))
    : [];
  const nhoodDemo = nhoodDemoRaw.length > 1
    ? nhoodDemoRaw.slice(1).map(r => toObj(nhoodDemoRaw[0], r))
    : [];
  const nhoodData = nhoodMap.map(nm => {
    const demo = nhoodDemo.find(d => d.Neighborhood === nm.Neighborhood) || {};
    return { ...nm, ...demo, neighborhood: nm.Neighborhood };
  });

  const crimeData = crimeRaw.length > 1
    ? crimeRaw.slice(1).map(r => toObj(crimeRaw[0], r))
    : [];
  const businesses = bizRaw.length > 1
    ? bizRaw.slice(1).map(r => toObj(bizRaw[0], r)).filter(r => r.Name)
    : [];

  console.log(`  Initiatives: ${initiatives.length}`);
  console.log(`  Active citizens: ${citizens.length}`);
  console.log(`  Civic officers: ${civicOfficers.length}`);
  console.log(`  Neighborhoods: ${nhoodData.length}`);
  console.log(`  Crime metrics: ${crimeData.length}`);
  console.log(`  Businesses: ${businesses.length}`);
  console.log('');

  // ── Load local context ──
  const prevCycle = CYCLE - 1;
  const maraDirectiveText = readMaraDirective(prevCycle);
  if (maraDirectiveText) {
    console.log(`  Mara directive (C${prevCycle}): loaded (${maraDirectiveText.length} chars)`);
  } else {
    console.log(`  Mara directive (C${prevCycle}): not found`);
  }
  console.log('');

  // ── Build packets ──
  const manifest = { cycle: CYCLE, generatedAt: new Date().toISOString(), packets: {} };
  const initIds = Object.keys(INITIATIVE_CONFIG);

  for (const initId of initIds) {
    const config = INITIATIVE_CONFIG[initId];
    console.log(`Building ${config.agentName} packet...`);

    // Find initiative record from tracker
    const initRecord = initiatives.find(i => i.InitiativeID === initId);
    if (!initRecord) {
      console.log(`  ⚠ Initiative ${initId} not found in tracker — skipping`);
      continue;
    }

    const initiative = buildInitiativeRecord(initRecord);

    // Previous cycle data
    const prevDecisions = readPreviousDecisions(config.agentName, prevCycle);
    const previousDocs = listPreviousDocuments(config.agentName);
    if (prevDecisions) {
      console.log(`  Previous decisions (C${prevCycle}): loaded`);
    }
    if (previousDocs.length > 0) {
      console.log(`  Previous documents: ${previousDocs.length} files`);
    }

    // Citizens
    const initCitizens = getInitiativeCitizens(citizens, config.neighborhoods, config.linkedCitizens);
    const citizenData = buildInitiativeCitizenData(initCitizens, config.linkedCitizens);

    // Neighborhoods
    const neighborhoodContext = buildNeighborhoodContext(nhoodData, crimeData, config.neighborhoods);

    // Businesses
    const bizData = getInitiativeBusinesses(businesses, config.neighborhoods);

    // Officials
    const officials = getRelevantOfficials(civicOfficers, config.policyDomains);

    // Build packet
    const packet = buildInitiativePacket(config, {
      initiative,
      prevDecisions,
      maraDirective: maraDirectiveText,
      previousDocs,
      citizenData,
      neighborhoodContext,
      businesses: bizData,
      officials,
      cycle: CYCLE
    });

    // Write packet
    const filename = `${config.packetKey}_c${CYCLE}.json`;
    fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(packet, null, 2));

    manifest.packets[config.packetKey] = {
      file: filename,
      initiativeId: initId,
      status: initiative.status,
      citizenCount: citizenData.total,
      linkedCitizens: citizenData.linkedProfiles.length,
      neighborhoods: config.neighborhoods.length,
      businesses: bizData.length,
      hasPreviousDecisions: !!prevDecisions,
      previousDocCount: previousDocs.length
    };

    console.log(`  ✓ ${config.agentName}: ${citizenData.total} citizens, ${neighborhoodContext.length} neighborhoods, ${bizData.length} businesses`);
    console.log('');
  }

  // ── Write manifest ──
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const packetCount = Object.keys(manifest.packets).length;
  console.log(`════════════════════════════════════════════════════`);
  console.log(`  ${packetCount} initiative packets written to output/initiative-packets/`);
  console.log(`  Manifest: output/initiative-packets/manifest.json`);
  console.log(`════════════════════════════════════════════════════\n`);
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
