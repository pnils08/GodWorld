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

// --- Query: citizen ---
async function queryCitizen(search) {
  if (!search) { console.error('Usage: queryLedger citizen <name|popId>'); process.exit(1); }

  const isPopId = /^POP-\d+$/i.test(search);
  const searchLower = search.toLowerCase();

  // 1. Simulation_Ledger — main record
  const ledger = await sheets.getSheetAsObjects('Simulation_Ledger');
  let citizen = null;
  if (isPopId) {
    citizen = ledger.find(r => r.POPID?.toLowerCase() === searchLower);
  } else {
    citizen = ledger.find(r => {
      const fullName = `${r.First} ${r.Last}`.toLowerCase();
      return fullName === searchLower || fullName.includes(searchLower);
    });
  }

  if (!citizen) {
    console.error(`Citizen not found: ${search}`);
    process.exit(1);
  }

  const popId = citizen.POPID;
  const fullName = `${citizen.First} ${citizen.Last}`;

  // 2. LifeHistory_Log — recent events
  let lifeHistory = [];
  try {
    const history = await sheets.getSheetAsObjects('LifeHistory_Log');
    lifeHistory = history
      .filter(r => r.POPID?.toLowerCase() === popId.toLowerCase())
      .slice(-10); // Last 10 entries
  } catch (e) { /* LifeHistory_Log may not exist */ }

  // 3. Relationship_Bonds — connections
  let bonds = [];
  try {
    const allBonds = await sheets.getSheetAsObjects('Relationship_Bonds');
    bonds = allBonds.filter(r =>
      r.Person1_POPID?.toLowerCase() === popId.toLowerCase() ||
      r.Person2_POPID?.toLowerCase() === popId.toLowerCase()
    );
  } catch (e) { /* Relationship_Bonds may not exist */ }

  // 4. Household_Ledger — household context
  let household = null;
  if (citizen.HouseholdId) {
    try {
      const households = await sheets.getSheetAsObjects('Household_Ledger');
      household = households.find(r => r.HouseholdId === citizen.HouseholdId);
    } catch (e) { /* may not exist */ }
  }

  // Parse LifeHistory field from ledger
  let ledgerLifeEvents = [];
  if (citizen.LifeHistory) {
    const parts = citizen.LifeHistory.split(/(?=\d{4}-\d{2}-\d{2})|(?=Engine Event:)/g).filter(s => s.trim());
    for (const part of parts) {
      const dateMatch = part.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})?\s*[—-]*\s*(?:\[(\w+)\])?\s*(.*)/s);
      if (dateMatch) {
        ledgerLifeEvents.push({
          date: dateMatch[1],
          tag: dateMatch[3] || 'General',
          text: dateMatch[4]?.trim() || part.trim(),
        });
      } else if (part.trim()) {
        ledgerLifeEvents.push({ date: null, tag: 'General', text: part.trim() });
      }
    }
  }

  output('citizen', {
    popId,
    name: fullName,
    tier: parseInt(citizen.Tier) || 4,
    age: citizen.Age || null,
    neighborhood: citizen.Neighborhood || null,
    role: citizen.RoleType || null,
    status: citizen.Status || null,
    income: citizen.Income ? parseInt(citizen.Income) : null,
    wealthLevel: citizen.WealthLevel ? parseInt(citizen.WealthLevel) : null,
    educationLevel: citizen.EducationLevel || null,
    careerStage: citizen.CareerStage || null,
    maritalStatus: citizen.MaritalStatus || null,
    numChildren: citizen.NumChildren ? parseInt(citizen.NumChildren) : 0,
    originCity: citizen.OrginCity || null,
    householdId: citizen.HouseholdId || null,
    flags: {
      universe: citizen['UNI (y/n)']?.toLowerCase() === 'yes',
      media: citizen['MED (y/n)']?.toLowerCase() === 'yes',
      civic: citizen['CIV (y/n)']?.toLowerCase() === 'yes',
    },
    traitProfile: citizen.TraitProfile || null,
    lifeEvents: ledgerLifeEvents,
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
      age: r.Age,
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
        console.error('Valid types: citizen, initiative, council, neighborhood, articles, verify');
        process.exit(1);
    }
  } catch (err) {
    console.error(`Query failed: ${err.message}`);
    process.exit(1);
  }
}

main();
