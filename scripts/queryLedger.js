#!/usr/bin/env node
/**
 * queryLedger.js — Live query tool for GodWorld simulation data
 *
 * Queries Google Sheets directly via lib/sheets.js and outputs JSON
 * that agents can read from output/queries/.
 *
 * Usage: node scripts/queryLedger.js <query-type> [args] [--save]
 *
 * Query types:
 *   citizen <name|popId>       — Full citizen profile + life history + bonds
 *   pair <a> <b>               — Two citizens side-by-side + shared household/bonds/neighborhood
 *   initiative <id|name>       — Initiative status + vote breakdown + implementation
 *   council [faction|district] — Council roster, optionally filtered
 *   neighborhood <name>        — Citizens + businesses + events in a neighborhood
 *   articles <term>            — Search published editions for a term (finds dangling threads)
 *   verify <claim>             — Quick fact-check: searches all sheets for a term
 *
 * Options:
 *   --save                     — Write results to output/queries/ as JSON file
 *   --quiet                    — Suppress stdout (use with --save)
 *
 * Examples:
 *   node scripts/queryLedger.js citizen "Tomas Renteria"
 *   node scripts/queryLedger.js citizen POP-00744
 *   node scripts/queryLedger.js initiative "Stabilization Fund"
 *   node scripts/queryLedger.js council OPP
 *   node scripts/queryLedger.js neighborhood Fruitvale --save
 *   node scripts/queryLedger.js articles "apprenticeship"
 *   node scripts/queryLedger.js verify "Stabilization Fund"
 */

require('/root/GodWorld/lib/env');  // S197 BUNDLE-B (G-S10) — loads GODWORLD_SHEET_ID + GOOGLE_APPLICATION_CREDENTIALS from /root/.config/godworld/.env
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const ROOT = path.resolve(__dirname, '..');
const QUERIES_DIR = path.join(ROOT, 'output', 'queries');

// --- CLI parsing ---
const args = process.argv.slice(2);
const flags = {
  save: args.includes('--save'),
  quiet: args.includes('--quiet'),
};
const positional = args.filter(a => !a.startsWith('--'));
const queryType = positional[0];
const queryArg = positional.slice(1).join(' ');

if (!queryType) {
  console.error('Usage: node scripts/queryLedger.js <query-type> [args] [--save]');
  console.error('');
  console.error('Query types:');
  console.error('  citizen <name|popId>       — Full citizen profile');
  console.error('  pair <a> <b>               — Two citizens + shared context (quote multi-word names)');
  console.error('  initiative <id|name>       — Initiative status + implementation');
  console.error('  council [faction|district] — Council roster');
  console.error('  neighborhood <name>        — Neighborhood snapshot');
  console.error('  articles <term>            — Search published editions');
  console.error('  verify <term>              — Search all sheets for a term');
  process.exit(1);
}

// --- Output helper ---
function output(label, data) {
  const result = { query: queryType, arg: queryArg, timestamp: new Date().toISOString(), data };

  if (!flags.quiet) {
    console.log(JSON.stringify(result, null, 2));
  }

  if (flags.save) {
    fs.mkdirSync(QUERIES_DIR, { recursive: true });
    const filename = `${queryType}_${queryArg.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 50)}.json`;
    const filepath = path.join(QUERIES_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    if (!flags.quiet) console.error(`Saved to: ${filepath}`);
  }
}

// --- Citizen helpers (shared by `citizen` and `pair`) ---

function findCitizen(ledger, search) {
  const isPopId = /^POP-\d+$/i.test(search);
  const searchLower = search.toLowerCase();
  if (isPopId) {
    return ledger.find(r => r.POPID?.toLowerCase() === searchLower) || null;
  }
  return ledger.find(r => {
    const fullName = `${r.First} ${r.Last}`.toLowerCase();
    return fullName === searchLower || fullName.includes(searchLower);
  }) || null;
}

// LifeHistory is newline-delimited; each line is either
//   `YYYY-MM-DD HH:MM — [Tag] text`  (real-clock entries)
//   `Y<n>C<m> — [Tag] text`          (sim-calendar entries)
// The old parser only recognized the date shape, so every Y<n>C<m> line
// collapsed into one unstructured blob.
function parseLifeHistory(raw) {
  const events = [];
  if (!raw) return events;
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(/^(?:(\d{4}-\d{2}-\d{2})(?:\s+\d{2}:\d{2})?|(Y\d+C\d+))?\s*[—–-]*\s*(?:\[([\w-]+)\])?\s*(.*)$/s);
    events.push({
      date: m?.[1] || null,
      cycle: m?.[2] || null,
      tag: m?.[3] || 'General',
      text: (m?.[4] || line).trim(),
    });
  }
  return events;
}

// Full-column profile. All 54 Simulation_Ledger columns are already fetched
// per row — dropping them saved nothing and blinded story agents to
// migration, family-graph, and memory-page fields (Antigravity diagnostic,
// verified S345).
function buildCitizenProfile(citizen, aux) {
  const { lifeHistory = [], bonds = [], household = null } = aux || {};
  return {
    popId: citizen.POPID,
    name: `${citizen.First} ${citizen.Last}`,
    maidenName: citizen.MaidenName || null,
    tier: parseInt(citizen.Tier) || 4,
    // Age is ALWAYS computed as 2041 - BirthYear. The Simulation_Ledger `Age`
    // column is empty by design, so reading it returned null for every citizen
    // (S334 — surfaced on POP-00166, applied to all). Never trust a pre-computed
    // Age field; the 2041 anchor keeps every age in the project consistent.
    age: citizen.BirthYear ? 2041 - parseInt(citizen.BirthYear) : null,
    gender: citizen.Gender || null,
    neighborhood: citizen.Neighborhood || null,
    role: citizen.RoleType || null,
    status: citizen.Status || null,
    statusStartCycle: citizen.StatusStartCycle || null,
    healthCause: citizen.HealthCause || null,
    income: citizen.Income ? parseInt(citizen.Income) : null,
    wealthLevel: citizen.WealthLevel ? parseInt(citizen.WealthLevel) : null,
    educationLevel: citizen.EducationLevel || null,
    careerStage: citizen.CareerStage || null,
    maritalStatus: citizen.MaritalStatus || null,
    numChildren: citizen.NumChildren ? parseInt(citizen.NumChildren) : 0,
    originCity: citizen.OrginCity || null,
    originGame: citizen.OriginGame || null,
    householdId: citizen.HouseholdId || null,
    spouseId: citizen.SpouseId || null,
    parentIds: citizen.ParentIds || null,
    childrenIds: citizen.ChildrenIds || null,
    lineageId: citizen.LineageId || null,
    economics: {
      netWorth: citizen.NetWorth || null,
      savingsRate: citizen.SavingsRate || null,
      debtLevel: citizen.DebtLevel || null,
      inheritanceReceived: citizen.InheritanceReceived || null,
      economicProfileKey: citizen.EconomicProfileKey || null,
      employerBizId: citizen.EmployerBizId || null,
    },
    career: {
      yearsInCareer: citizen.YearsInCareer || null,
      careerMobility: citizen.CareerMobility || null,
      lastPromotionCycle: citizen.LastPromotionCycle || null,
      schoolQuality: citizen.SchoolQuality || null,
    },
    migration: {
      displacementRisk: citizen.DisplacementRisk || null,
      migrationIntent: citizen.MigrationIntent || null,
      migrationReason: citizen.MigrationReason || null,
      migrationDestination: citizen.MigrationDestination || null,
      migratedCycle: citizen.MigratedCycle || null,
      returnedCycle: citizen.ReturnedCycle || null,
    },
    memory: {
      smPageId: citizen.SMPageId || null,
      memoryRegisters: citizen.MemoryRegisters || null,
    },
    skillTags: citizen.SkillTags || null,
    citizenBio: citizen.CitizenBio || null,
    dialState: citizen.DialState || null,
    usageCount: citizen.UsageCount ? parseInt(citizen.UsageCount) : 0,
    lastUpdated: citizen.LastUpdated || null,
    flags: {
      universe: citizen['UNI (y/n)']?.toLowerCase() === 'yes',
      media: citizen['MED (y/n)']?.toLowerCase() === 'yes',
      civic: citizen['CIV (y/n)']?.toLowerCase() === 'yes',
    },
    traitProfile: citizen.TraitProfile || null,
    lifeEvents: parseLifeHistory(citizen.LifeHistory),
    recentHistory: lifeHistory,
    bonds: bonds.map(b => ({
      person1: b.Person1_POPID,
      person2: b.Person2_POPID,
      type: b.BondType || b.Type,
      strength: b.Strength,
    })),
    household: household ? {
      id: household.HouseholdId,
      type: household.Type,
      size: household.Size,
      address: household.Address,
    } : null,
  };
}

async function loadCitizenAux(citizen) {
  const popId = citizen.POPID;

  let lifeHistory = [];
  try {
    const history = await sheets.getSheetAsObjects('LifeHistory_Log');
    lifeHistory = history
      .filter(r => r.POPID?.toLowerCase() === popId.toLowerCase())
      .slice(-10); // Last 10 entries
  } catch (e) { /* LifeHistory_Log may not exist */ }

  let bonds = [];
  try {
    const allBonds = await sheets.getSheetAsObjects('Relationship_Bonds');
    bonds = allBonds.filter(r =>
      r.Person1_POPID?.toLowerCase() === popId.toLowerCase() ||
      r.Person2_POPID?.toLowerCase() === popId.toLowerCase()
    );
  } catch (e) { /* Relationship_Bonds may not exist */ }

  let household = null;
  if (citizen.HouseholdId) {
    try {
      const households = await sheets.getSheetAsObjects('Household_Ledger');
      household = households.find(r => r.HouseholdId === citizen.HouseholdId);
    } catch (e) { /* may not exist */ }
  }

  return { lifeHistory, bonds, household };
}

// --- Query: citizen ---
async function queryCitizen(search) {
  if (!search) { console.error('Usage: queryLedger citizen <name|popId>'); process.exit(1); }

  const ledger = await sheets.getSheetAsObjects('Simulation_Ledger');
  const citizen = findCitizen(ledger, search);

  if (!citizen) {
    console.error(`Citizen not found: ${search}`);
    process.exit(1);
  }

  const aux = await loadCitizenAux(citizen);
  output('citizen', buildCitizenProfile(citizen, aux));
}

// --- Query: pair ---
// Two citizens side-by-side + the shared context a 2-person story needs:
// direct bonds between them, shared bond partners, household/neighborhood
// overlap, and both migration blocks (relocation deltas live in the profiles).
async function queryPair(a, b) {
  if (!a || !b) { console.error('Usage: queryLedger pair <name|popId> <name|popId>  (quote multi-word names)'); process.exit(1); }

  const ledger = await sheets.getSheetAsObjects('Simulation_Ledger');
  const citizenA = findCitizen(ledger, a);
  const citizenB = findCitizen(ledger, b);
  if (!citizenA) { console.error(`Citizen not found: ${a}`); process.exit(1); }
  if (!citizenB) { console.error(`Citizen not found: ${b}`); process.exit(1); }
  if (citizenA.POPID === citizenB.POPID) { console.error('pair needs two distinct citizens'); process.exit(1); }

  // Fetch each aux sheet once, partition per citizen
  let historyAll = [];
  try { historyAll = await sheets.getSheetAsObjects('LifeHistory_Log'); } catch (e) { /* may not exist */ }
  let bondsAll = [];
  try { bondsAll = await sheets.getSheetAsObjects('Relationship_Bonds'); } catch (e) { /* may not exist */ }
  let householdsAll = [];
  try { householdsAll = await sheets.getSheetAsObjects('Household_Ledger'); } catch (e) { /* may not exist */ }

  const auxFor = (c) => {
    const id = c.POPID.toLowerCase();
    return {
      lifeHistory: historyAll.filter(r => r.POPID?.toLowerCase() === id).slice(-10),
      bonds: bondsAll.filter(r =>
        r.Person1_POPID?.toLowerCase() === id || r.Person2_POPID?.toLowerCase() === id
      ),
      household: c.HouseholdId ? householdsAll.find(r => r.HouseholdId === c.HouseholdId) || null : null,
    };
  };

  const idA = citizenA.POPID.toLowerCase();
  const idB = citizenB.POPID.toLowerCase();
  const directBonds = bondsAll.filter(r => {
    const p1 = r.Person1_POPID?.toLowerCase();
    const p2 = r.Person2_POPID?.toLowerCase();
    return (p1 === idA && p2 === idB) || (p1 === idB && p2 === idA);
  });

  const partnersOf = (id) => new Set(
    bondsAll
      .filter(r => r.Person1_POPID?.toLowerCase() === id || r.Person2_POPID?.toLowerCase() === id)
      .map(r => (r.Person1_POPID?.toLowerCase() === id ? r.Person2_POPID : r.Person1_POPID))
      .filter(Boolean)
      .map(p => p.toUpperCase())
  );
  const sharedBondPartners = [...partnersOf(idA)].filter(p =>
    partnersOf(idB).has(p) && p !== citizenA.POPID && p !== citizenB.POPID
  );

  output('pair', {
    citizenA: buildCitizenProfile(citizenA, auxFor(citizenA)),
    citizenB: buildCitizenProfile(citizenB, auxFor(citizenB)),
    shared: {
      sameHousehold: !!(citizenA.HouseholdId && citizenA.HouseholdId === citizenB.HouseholdId),
      sameNeighborhood: !!(citizenA.Neighborhood && citizenA.Neighborhood === citizenB.Neighborhood),
      spouses: citizenA.SpouseId === citizenB.POPID || citizenB.SpouseId === citizenA.POPID,
      directBonds: directBonds.map(bd => ({
        person1: bd.Person1_POPID,
        person2: bd.Person2_POPID,
        type: bd.BondType || bd.Type,
        strength: bd.Strength,
      })),
      sharedBondPartners,
    },
  });
}

// --- Query: initiative ---
async function queryInitiative(search) {
  if (!search) { console.error('Usage: queryLedger initiative <id|name>'); process.exit(1); }
  const searchLower = search.toLowerCase();

  const tracker = await sheets.getSheetAsObjects('Initiative_Tracker');
  const matches = tracker.filter(r => {
    const id = (r.InitiativeId || r.ID || '').toLowerCase();
    const name = (r.Name || r.InitiativeName || '').toLowerCase();
    return id.includes(searchLower) || name.includes(searchLower);
  });

  if (matches.length === 0) {
    console.error(`Initiative not found: ${search}`);
    process.exit(1);
  }

  // Get council data for vote context
  let council = [];
  try {
    council = await sheets.getSheetAsObjects('Civic_Office_Ledger');
  } catch (e) { /* may not exist */ }

  const results = matches.map(init => ({
    id: init.InitiativeId || init.ID,
    name: init.Name || init.InitiativeName,
    status: init.Status,
    policyDomain: init.PolicyDomain || init.Domain,
    budget: init.Budget,
    voteCycle: init.VoteCycle,
    voteRequirement: init.VoteRequirement,
    sponsor: init.Sponsor,
    affectedNeighborhoods: init.AffectedNeighborhoods,
    voteBreakdown: init.VoteBreakdown,
    // New implementation tracking columns
    implementationPhase: init.ImplementationPhase || null,
    milestoneNotes: init.MilestoneNotes || null,
    nextScheduledAction: init.NextScheduledAction || null,
    nextActionCycle: init.NextActionCycle ? parseInt(init.NextActionCycle) : null,
  }));

  output('initiative', {
    matches: results,
    councilContext: council
      .filter(r => r.OfficeId?.startsWith('COUNCIL-') || r.OfficeId === 'MAYOR-01')
      .map(r => ({
        office: r.OfficeId,
        holder: r.Holder,
        faction: r.Faction,
        district: r.District,
      })),
  });
}

// --- Query: council ---
async function queryCouncil(filter) {
  const council = await sheets.getSheetAsObjects('Civic_Office_Ledger');

  let members = council.map(r => ({
    officeId: r.OfficeId,
    title: r.Title,
    holder: r.Holder,
    popId: r.PopId,
    district: r.District,
    faction: r.Faction,
    status: r.Status,
    votingPower: r.VotingPower === 'yes',
    notes: r.Notes,
  }));

  if (filter) {
    const filterLower = filter.toLowerCase();
    members = members.filter(m =>
      m.faction?.toLowerCase().includes(filterLower) ||
      m.district?.toLowerCase().includes(filterLower) ||
      m.holder?.toLowerCase().includes(filterLower) ||
      m.officeId?.toLowerCase().includes(filterLower)
    );
  }

  const councilMembers = members.filter(m => m.officeId?.startsWith('COUNCIL-') || m.officeId === 'MAYOR-01');
  const staff = members.filter(m => !m.officeId?.startsWith('COUNCIL-') && m.officeId !== 'MAYOR-01');

  output('council', {
    council: councilMembers,
    staff: filter ? staff : staff.slice(0, 10), // Limit staff unless filtered
    factions: [...new Set(councilMembers.map(m => m.faction).filter(Boolean))],
    totalMembers: councilMembers.length,
  });
}

// --- Query: neighborhood ---
async function queryNeighborhood(name) {
  if (!name) { console.error('Usage: queryLedger neighborhood <name>'); process.exit(1); }
  const nameLower = name.toLowerCase();

  // Citizens in this neighborhood
  const ledger = await sheets.getSheetAsObjects('Simulation_Ledger');
  const citizens = ledger
    .filter(r => r.Neighborhood?.toLowerCase().includes(nameLower))
    .map(r => ({
      popId: r.POPID,
      name: `${r.First} ${r.Last}`,
      tier: parseInt(r.Tier) || 4,
      role: r.RoleType,
      age: r.BirthYear ? 2041 - parseInt(r.BirthYear) : null,  // 2041 anchor; Age column is empty by design (S334)
      status: r.Status,
    }));

  // Businesses in this neighborhood
  let businesses = [];
  try {
    const biz = await sheets.getSheetAsObjects('Business_Ledger');
    businesses = biz
      .filter(r => (r.Neighborhood || r.Location || '').toLowerCase().includes(nameLower))
      .map(r => ({
        id: r.BizId || r.ID,
        name: r.Name || r.BusinessName,
        type: r.Type || r.BusinessType,
        status: r.Status,
        employees: r.Employees || r.EmployeeCount,
      }));
  } catch (e) { /* Business_Ledger may not exist */ }

  // World events in this neighborhood
  let events = [];
  try {
    const worldEvents = await sheets.getSheetAsObjects('WorldEvents_V3_Ledger');
    events = worldEvents
      .filter(r => (r.Neighborhood || r.AffectedArea || '').toLowerCase().includes(nameLower))
      .slice(-10) // Last 10
      .map(r => ({
        id: r.EventId || r.ID,
        name: r.EventName || r.Name,
        cycle: r.Cycle,
        type: r.EventType || r.Type,
        status: r.Status,
      }));
  } catch (e) { /* may not exist */ }

  output('neighborhood', {
    neighborhood: name,
    citizenCount: citizens.length,
    citizens: citizens.sort((a, b) => a.tier - b.tier), // Tier 1 first
    businesses,
    recentEvents: events,
  });
}

// --- Query: articles ---
// Searches two pools:
//   1. editions/ — canonical published editions + supplementals (11 files)
//   2. output/drive-files/ — full Drive archive (680+ files: older editions, national media, player cards, etc.)
async function queryArticles(term) {
  if (!term) { console.error('Usage: queryLedger articles <term>'); process.exit(1); }
  const termLower = term.toLowerCase();

  // Collect all searchable files from both sources
  const filesToSearch = [];

  // Source 1: editions/ (canonical, current pipeline)
  const EDITIONS_DIR = path.join(ROOT, 'editions');
  if (fs.existsSync(EDITIONS_DIR)) {
    for (const f of fs.readdirSync(EDITIONS_DIR)) {
      if (!f.endsWith('.txt')) continue;
      filesToSearch.push({ path: path.join(EDITIONS_DIR, f), file: f, source: 'editions' });
    }
  }

  // Source 2: output/drive-files/ (deep archive)
  const DRIVE_DIR = path.join(ROOT, 'output', 'drive-files');
  if (fs.existsSync(DRIVE_DIR)) {
    const walkDir = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(full);
        } else if (entry.name.endsWith('.txt')) {
          // Skip meta files
          if (entry.name.startsWith('_') && !dir.includes('Archive')) continue;
          if (/Text_Mirror_Full|Media_Cannon/i.test(entry.name)) continue;
          const rel = path.relative(DRIVE_DIR, full);
          filesToSearch.push({ path: full, file: rel, source: 'drive-archive' });
        }
      }
    };
    walkDir(DRIVE_DIR);
  }

  const matches = [];
  let filesWithHits = 0;

  for (const entry of filesToSearch) {
    let content;
    try {
      content = fs.readFileSync(entry.path, 'utf-8');
    } catch (e) { continue; }

    if (!content.toLowerCase().includes(termLower)) continue;
    filesWithHits++;

    const lines = content.split('\n');

    // Determine cycle from filename
    let cycle = null;
    const cycleMatch = entry.file.match(/[Cc](?:ycle[_\s]*)(\d{2,3})/);
    if (cycleMatch) cycle = parseInt(cycleMatch[1]);
    if (!cycle) {
      const numMatch = entry.file.match(/(?:edition|EDITION)[_\s]*(\d{2,3})/);
      if (numMatch) cycle = parseInt(numMatch[1]);
    }

    // Find matching lines with surrounding context
    let fileMatches = 0;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].toLowerCase().includes(termLower)) continue;
      fileMatches++;
      if (fileMatches > 5) continue; // Cap at 5 matches per file to keep output manageable

      // Grab context: 2 lines before, the match, 2 lines after
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length - 1, i + 2);
      const context = lines.slice(start, end + 1).join('\n').trim();

      // Try to find the article title
      let articleTitle = null;
      let author = null;
      for (let j = i; j >= Math.max(0, i - 30); j--) {
        const headerMatch = lines[j].match(/^#{2,3}\s+(.+)/);
        if (headerMatch) {
          articleTitle = headerMatch[1].trim();
          break;
        }
      }

      // Try to find author
      if (articleTitle) {
        for (let j = i; j >= Math.max(0, i - 30); j--) {
          const byMatch = lines[j].match(/^(?:By |— )(.+)/i);
          if (byMatch) {
            author = byMatch[1].trim();
            break;
          }
        }
      }

      const isMetadata = lines[i].includes('|') && lines[i].split('|').length > 3;

      matches.push({
        file: entry.file,
        source: entry.source,
        cycle,
        line: i + 1,
        articleTitle,
        author,
        isMetadata,
        context: context.length > 500 ? context.slice(0, 500) + '...' : context,
      });
    }
  }

  // Deduplicate — group by file + article, keep first match per article
  const seen = new Set();
  const deduped = [];
  for (const m of matches) {
    const key = `${m.file}::${m.articleTitle || m.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(m);
    }
  }

  // Separate by source and type
  const editionMentions = deduped.filter(m => m.source === 'editions' && !m.isMetadata);
  const archiveMentions = deduped.filter(m => m.source === 'drive-archive' && !m.isMetadata);
  const metadataMentions = deduped.filter(m => m.isMetadata);

  output('articles', {
    term,
    totalMatches: matches.length,
    filesSearched: filesToSearch.length,
    filesWithHits,
    editions: {
      count: editionMentions.length,
      mentions: editionMentions,
    },
    archive: {
      count: archiveMentions.length,
      mentions: archiveMentions,
    },
    metadataOnly: metadataMentions.length > 0 ? metadataMentions : undefined,
  });
}

// --- Query: verify ---
async function queryVerify(term) {
  if (!term) { console.error('Usage: queryLedger verify <term>'); process.exit(1); }
  const termLower = term.toLowerCase();

  const sheetsToSearch = [
    'Simulation_Ledger',
    'Initiative_Tracker',
    'Civic_Office_Ledger',
    'Business_Ledger',
    'WorldEvents_V3_Ledger',
    'Storyline_Tracker',
  ];

  const results = {};
  for (const sheetName of sheetsToSearch) {
    try {
      const rows = await sheets.getSheetAsObjects(sheetName);
      const matches = rows.filter(r =>
        Object.values(r).some(v => String(v).toLowerCase().includes(termLower))
      );
      if (matches.length > 0) {
        results[sheetName] = {
          matchCount: matches.length,
          // Return first 5 matches with all fields
          samples: matches.slice(0, 5),
        };
      }
    } catch (e) {
      // Sheet may not exist, skip it
    }
  }

  const totalMatches = Object.values(results).reduce((sum, r) => sum + r.matchCount, 0);

  output('verify', {
    term,
    totalMatches,
    sheetsSearched: sheetsToSearch.length,
    sheetsWithMatches: Object.keys(results).length,
    results,
  });
}

// --- Main ---
async function main() {
  try {
    switch (queryType) {
      case 'citizen':
        await queryCitizen(queryArg);
        break;
      case 'pair':
        await queryPair(positional[1], positional[2]);
        break;
      case 'initiative':
        await queryInitiative(queryArg);
        break;
      case 'council':
        await queryCouncil(queryArg || null);
        break;
      case 'neighborhood':
        await queryNeighborhood(queryArg);
        break;
      case 'articles':
        await queryArticles(queryArg);
        break;
      case 'verify':
        await queryVerify(queryArg);
        break;
      default:
        console.error(`Unknown query type: ${queryType}`);
        console.error('Valid types: citizen, pair, initiative, council, neighborhood, articles, verify');
        process.exit(1);
    }
  } catch (err) {
    console.error(`Query failed: ${err.message}`);
    process.exit(1);
  }
}

main();
