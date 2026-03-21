/**
 * ============================================================================
 * EDITION INTAKE v2.0
 * ============================================================================
 *
 * Parses a published Cycle Pulse edition and writes structured data directly
 * to final Google Sheets ledgers. Replaces v1.4 staging model.
 *
 * Usage:
 *   node -r dotenv/config scripts/editionIntake.js <edition-file> [cycle]
 *   node -r dotenv/config scripts/editionIntake.js --dry-run <edition-file> [cycle]
 *
 * Jobs:
 *   1. New citizens (from Citizen Usage Log) → Citizen_Usage_Intake (UsageType: new_citizen)
 *   2. Existing citizen notes → Citizen_Usage_Intake (UsageType: quoted/letters)
 *   3. Businesses (from Business Ticker) → Storyline_Intake (StorylineType: business)
 *   4. Storylines → Storyline_Tracker (direct, no staging)
 *   5. Quotes → dry-run display only (enrichCitizenProfiles.js handles LifeHistory)
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const WORLD_YEAR = 2041;

const NEIGHBORHOODS = [
  'Downtown', 'Jack London', 'Rockridge', 'Temescal', 'Fruitvale',
  'Lake Merritt', 'West Oakland', 'Laurel', 'Chinatown', 'Grand Lake',
  'Old Oakland', 'Uptown', 'KONO', 'Brooklyn Basin', 'Piedmont Avenue',
  'East Oakland', 'Montclair', 'Adams Point', 'Bridgeport', 'Piedmont'
];

// ════════════════════════════════════════════════════════════════════════════
// SECTION EXTRACTION
// ════════════════════════════════════════════════════════════════════════════

function extractSection(markdown, sectionName) {
  const pattern = new RegExp('[=#]{3,}\\s*\\n\\s*' + sectionName + '\\s*\\n\\s*[=#]{3,}', 'i');
  const match = markdown.match(pattern);
  if (!match) return null;

  const startIdx = match.index + match[0].length;
  const remaining = markdown.substring(startIdx);

  const endMatch = remaining.match(/\n[=#]{3,}\s*\n/);
  const endIdx = endMatch ? startIdx + endMatch.index : markdown.length;

  return markdown.substring(startIdx, endIdx).trim();
}

// ════════════════════════════════════════════════════════════════════════════
// CITIZEN USAGE LOG PARSER
// ════════════════════════════════════════════════════════════════════════════

function parseCitizenUsageLog(section) {
  const lines = section.split('\n');
  const citizens = [];
  let currentCategory = 'CITIZEN';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^CIVIC OFFICIALS/i.test(trimmed)) { currentCategory = 'CIVIC'; continue; }
    if (/^CITIZENS QUOTED/i.test(trimmed)) { currentCategory = 'QUOTED'; continue; }
    if (/^LETTER WRITERS/i.test(trimmed)) { currentCategory = 'LETTERS'; continue; }
    if (/^SPORTS FIGURES/i.test(trimmed)) { currentCategory = 'SPORTS'; continue; }
    if (/^JOURNALISTS/i.test(trimmed) || /^REPORTER/i.test(trimmed)) { currentCategory = 'JOURNALIST'; continue; }
    if (/^CULTURAL/i.test(trimmed)) { currentCategory = 'CULTURAL'; continue; }
    if (/^EXECUTIVE/i.test(trimmed) || /^OWNER/i.test(trimmed)) { currentCategory = 'EXECUTIVE'; continue; }

    if (/^[-—]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[-—]\s+/, '').trim();
      if (!content) continue;

      let name = '';
      let age = '';
      let neighborhood = '';
      let role = '';
      let context = '';

      if (currentCategory === 'CIVIC') {
        const m = content.match(/^(.+?)\s*\(([^)]+)\)$/);
        if (m) {
          name = m[1].trim();
          role = m[2].trim();
        } else {
          name = content;
        }
      } else if (currentCategory === 'SPORTS') {
        const m = content.match(/^(.+?)\s*\(([^)]+)\)$/);
        if (m) {
          name = m[1].trim();
          role = m[2].trim();
        } else {
          name = content;
        }
      } else if (currentCategory === 'JOURNALIST') {
        const m = content.match(/^(.+?)\s*\(([^)]+)\)$/);
        if (m) {
          name = m[1].trim();
          context = m[2].trim();
        } else {
          name = content;
        }
      } else if (currentCategory === 'QUOTED' || currentCategory === 'LETTERS') {
        const ctxMatch = content.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        let base = ctxMatch ? ctxMatch[1].trim() : content;
        if (ctxMatch) context = ctxMatch[2].trim();

        const parts = base.split(',').map(p => p.trim());
        name = parts[0] || '';

        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          if (/^\d{1,3}$/.test(part)) {
            age = part;
          } else if (NEIGHBORHOODS.some(n => n.toLowerCase() === part.toLowerCase())) {
            neighborhood = part;
          } else {
            role = role ? role + ', ' + part : part;
          }
        }
      } else {
        const m = content.match(/^(.+?)\s*\(([^)]+)\)$/);
        if (m) {
          name = m[1].trim();
          context = m[2].trim();
        } else {
          name = content;
        }
      }

      citizens.push({ name, age, neighborhood, role, context, category: currentCategory });
    }
  }

  return citizens;
}

// ════════════════════════════════════════════════════════════════════════════
// STORYLINES PARSER
// ════════════════════════════════════════════════════════════════════════════

function parseStorylines(section) {
  const lines = section.split('\n');
  const storylines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^[-—]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[-—]\s+/, '').trim();

      let type = 'thread';
      let description = content;

      const bracketMatch = content.match(/^\[(\w+(?:-\w+)?)\]\s*(.+)$/);
      if (bracketMatch) {
        type = bracketMatch[1].toLowerCase();
        description = bracketMatch[2].trim();
      }

      const pipeMatch = content.match(/^(\w+)\s*\|\s*(.+)$/);
      if (!bracketMatch && pipeMatch) {
        const parts = content.split('|').map(p => p.trim());
        type = (parts[0] || 'thread').toLowerCase();
        description = parts[1] || '';
        const hood = parts[2] || '';
        const citizens = parts[3] || '';
        const priority = parts[4] || 'normal';
        storylines.push({ type, description, neighborhood: hood, citizens, priority });
        continue;
      }

      let neighborhood = '';
      for (const n of NEIGHBORHOODS) {
        if (description.includes(n)) { neighborhood = n; break; }
      }

      const citizenNames = [];
      const namePattern = /([A-Z][a-z]+ [A-Z][a-z]+(?:-[A-Z][a-z]+)?)/g;
      let m;
      while ((m = namePattern.exec(description)) !== null) {
        citizenNames.push(m[1]);
      }

      let priority = 'normal';
      if (type === 'new') priority = 'high';

      storylines.push({
        type,
        description,
        neighborhood,
        citizens: citizenNames.join(', '),
        priority
      });
    }
  }

  return storylines;
}

// ════════════════════════════════════════════════════════════════════════════
// CONTINUITY NOTES PARSER
// ════════════════════════════════════════════════════════════════════════════

function parseQuotes(section) {
  const lines = section.split('\n');
  const quotes = [];
  let inQuoteSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/quotes?\s+preserved/i.test(trimmed)) { inQuoteSection = true; continue; }
    if (/new canon/i.test(trimmed) || /^={3,}$/.test(trimmed)) { inQuoteSection = false; continue; }

    if (inQuoteSection && /^[-—]\s+/.test(trimmed)) {
      const quoteMatch = trimmed.match(/^[-—]\s*(.+?):\s*[""\u201C](.+)[""\u201D]$/);
      if (quoteMatch) {
        quotes.push({ name: quoteMatch[1].trim(), quote: quoteMatch[2].trim() });
      }
    }
  }

  return quotes;
}

function parseNewCanon(section) {
  const lines = section.split('\n');
  const canon = [];
  let inCanonSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/new canon/i.test(trimmed)) { inCanonSection = true; continue; }
    if (/^={3,}$/.test(trimmed) || /quotes?\s+preserved/i.test(trimmed)) { inCanonSection = false; continue; }

    if (inCanonSection && /^[-—]\s+/.test(trimmed)) {
      canon.push(trimmed.replace(/^[-—]\s+/, '').trim());
    }
  }

  return canon;
}

// ════════════════════════════════════════════════════════════════════════════
// BUSINESS MENTION PARSER (carried from v1.4)
// ════════════════════════════════════════════════════════════════════════════

function parseBusinessMentions(markdown, cycle) {
  const businesses = [];
  const seen = new Set();

  const bizSection = extractSection(markdown, 'BUSINESS TICKER')
    || extractSection(markdown, 'BUSINESS');
  if (!bizSection) return businesses;

  const fullText = bizSection;

  const openPatterns = [
    /(?:new|opened|grand opening of|opening of|launched)\s+(?:a\s+)?(?:new\s+)?(?:restaurant|bar|cafe|gallery|shop|store|bakery|clinic|studio|lounge|bistro|diner|pub|brewery|taproom|coffeehouse|bookstore)?\s*['""\u201C]([^'"""\u201D]+)['""\u201D]?/gi,
    /['""\u201C]([^'"""\u201D]{3,40})['""\u201D][\s,]*(?:opened|launched|held its grand opening|debuted)/gi,
    /grand opening (?:of|for)\s+['""\u201C]?([A-Z][A-Za-z\s&'.]{2,35})['""\u201D]?/gi
  ];

  for (const pat of openPatterns) {
    let m;
    while ((m = pat.exec(fullText)) !== null) {
      const name = m[1].trim();
      if (name.length > 2 && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        const sector = inferSector(fullText, m.index);
        const neighborhood = inferNeighborhood(fullText, m.index);
        businesses.push([name, sector, neighborhood, 'Detected from Business Ticker', cycle, 'staged']);
      }
    }
  }

  return businesses;
}

function inferSector(text, matchIndex) {
  const context = text.substring(Math.max(0, matchIndex - 100), matchIndex + 150).toLowerCase();
  if (/restaurant|dining|cuisine|chef|menu/.test(context)) return 'Restaurant & Dining';
  if (/bar|pub|taproom|brewery|cocktail|lounge/.test(context)) return 'Nightlife & Entertainment';
  if (/cafe|coffee|coffeehouse|bakery/.test(context)) return 'Restaurant & Dining';
  if (/gallery|art|studio|creative/.test(context)) return 'Arts & Creative';
  if (/shop|store|retail|boutique|bookstore/.test(context)) return 'Retail';
  if (/clinic|health|medical|dental|therapy/.test(context)) return 'Healthcare';
  if (/tech|startup|software|ai/.test(context)) return 'Technology';
  return 'Unknown';
}

function inferNeighborhood(text, matchIndex) {
  const context = text.substring(Math.max(0, matchIndex - 150), matchIndex + 200);
  for (const nh of NEIGHBORHOODS) {
    if (context.includes(nh)) return nh;
  }
  if (/Telegraph/i.test(context)) return 'Temescal';
  if (/7th Street/i.test(context)) return 'West Oakland';
  if (/International Blvd|International Boulevard/i.test(context)) return 'Fruitvale';
  if (/Broadway/i.test(context)) return 'Downtown';
  if (/College Ave/i.test(context)) return 'Rockridge';
  return '';
}

// ════════════════════════════════════════════════════════════════════════════
// SIMULATION LEDGER CROSS-REFERENCE
// ════════════════════════════════════════════════════════════════════════════

async function buildLedgerIndex() {
  const slData = await sheets.getSheetData('Simulation_Ledger');
  const headers = slData[0];
  const firstIdx = headers.indexOf('First');
  const lastIdx = headers.indexOf('Last');
  const popIdx = headers.indexOf('POPID');
  const neighborhoodIdx = headers.indexOf('Neighborhood');
  const roleIdx = headers.indexOf('RoleType');

  const index = {};
  for (let i = 1; i < slData.length; i++) {
    const row = slData[i];
    const full = ((row[firstIdx] || '') + ' ' + (row[lastIdx] || '')).trim();
    if (full && row[popIdx]) {
      index[full.toLowerCase()] = {
        popId: row[popIdx],
        first: row[firstIdx] || '',
        last: row[lastIdx] || '',
        neighborhood: row[neighborhoodIdx] || '',
        role: row[roleIdx] || '',
        row: i + 1
      };
    }
  }
  return index;
}

function stripTitle(name) {
  return name
    .replace(/^(Dr\.|Rev\.|Mayor|Chief|Director|Deputy Mayor|Councilmember|Officer|Captain|Lt\.|Sgt\.)\s+/i, '')
    .trim();
}

function lookupCitizen(nameStr, ledgerIndex) {
  const clean = stripTitle(nameStr);
  return ledgerIndex[clean.toLowerCase()] || null;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filteredArgs = args.filter(a => !a.startsWith('--'));

  if (filteredArgs.length < 1) {
    console.error('Usage: node -r dotenv/config scripts/editionIntake.js [--dry-run] <edition-file> [cycle]');
    process.exit(1);
  }

  const editionFile = path.resolve(filteredArgs[0]);
  if (!fs.existsSync(editionFile)) {
    console.error(`File not found: ${editionFile}`);
    process.exit(1);
  }

  const markdown = fs.readFileSync(editionFile, 'utf-8');

  let cycle = parseInt(filteredArgs[1]);
  if (!cycle) {
    const headerMatch = markdown.match(/EDITION\s+(\d+)/i);
    cycle = headerMatch ? parseInt(headerMatch[1]) : 0;
  }
  if (!cycle) {
    console.error('Could not detect cycle number. Pass it explicitly.');
    process.exit(1);
  }

  console.log('');
  console.log('=== EDITION INTAKE v2.0 ===');
  console.log(`Edition: ${path.basename(editionFile)}`);
  console.log(`Cycle: ${cycle}`);
  if (dryRun) console.log('Mode: DRY RUN');
  console.log('');

  // Extract sections
  const citizenSection = extractSection(markdown, 'CITIZEN USAGE LOG');
  const storylineSection = extractSection(markdown, 'STORYLINES UPDATED')
    || extractSection(markdown, 'STORYLINES CARRIED FORWARD');
  const continuitySection = extractSection(markdown, 'CONTINUITY NOTES');

  console.log('Sections found:');
  console.log(`  CITIZEN USAGE LOG: ${citizenSection ? citizenSection.length + ' chars' : 'NOT FOUND'}`);
  console.log(`  STORYLINES:        ${storylineSection ? storylineSection.length + ' chars' : 'NOT FOUND'}`);
  console.log(`  CONTINUITY NOTES:  ${continuitySection ? continuitySection.length + ' chars' : 'NOT FOUND'}`);

  // Parse sections
  const citizens = citizenSection ? parseCitizenUsageLog(citizenSection) : [];
  const storylines = storylineSection ? parseStorylines(storylineSection) : [];
  const quotes = continuitySection ? parseQuotes(continuitySection) : [];
  const newCanon = continuitySection ? parseNewCanon(continuitySection) : [];
  const businesses = parseBusinessMentions(markdown, cycle);

  console.log('');
  console.log('Parsed:');
  console.log(`  Citizens:      ${citizens.length}`);
  console.log(`  Storylines:    ${storylines.length}`);
  console.log(`  Quotes:        ${quotes.length}`);
  console.log(`  New canon:     ${newCanon.length}`);
  console.log(`  Businesses:    ${businesses.length}`);

  // Cross-reference citizens against Simulation_Ledger
  let ledgerIndex = {};
  try {
    ledgerIndex = await buildLedgerIndex();
    console.log(`  Ledger loaded:  ${Object.keys(ledgerIndex).length} citizens`);
  } catch (e) {
    console.log(`  Ledger: SKIPPED (${e.message})`);
  }

  // Route citizens: QUOTED and LETTERS categories only (these are the ones that matter)
  const newCitizens = [];
  const existingCitizens = [];
  const skipped = [];

  const routeCategories = ['QUOTED', 'LETTERS'];
  for (const c of citizens) {
    if (!routeCategories.includes(c.category)) {
      skipped.push(c);
      continue;
    }

    if (!c.name || c.name.split(' ').length < 2) {
      skipped.push(c);
      continue;
    }

    const match = lookupCitizen(c.name, ledgerIndex);
    if (match) {
      existingCitizens.push({ ...c, popId: match.popId });
    } else {
      newCitizens.push(c);
    }
  }

  console.log('');
  console.log('Citizen routing:');
  console.log(`  New (→ Citizen_Usage_Intake): ${newCitizens.length}`);
  console.log(`  Existing (→ Citizen_Usage):   ${existingCitizens.length}`);
  console.log(`  Skipped (civic/sports/etc):   ${skipped.length}`);

  // ── DRY RUN OUTPUT ──

  if (dryRun) {
    if (newCitizens.length > 0) {
      console.log('');
      console.log('--- NEW CITIZENS (→ Citizen_Usage_Intake) ---');
      for (const c of newCitizens) {
        const birthYear = c.age ? WORLD_YEAR - parseInt(c.age) : '';
        console.log(`  ${c.name} | ${c.age || '?'} | ${c.neighborhood || '?'} | ${c.role || '?'} | BirthYear: ${birthYear || '?'}`);
      }
    }

    if (existingCitizens.length > 0) {
      console.log('');
      console.log('--- EXISTING CITIZENS (→ Citizen_Usage_Intake) ---');
      for (const c of existingCitizens) {
        console.log(`  ${c.name} (${c.popId}) | ${c.context || c.category}`);
      }
    }

    if (storylines.length > 0) {
      console.log('');
      console.log('--- STORYLINES (→ Storyline_Tracker) ---');
      for (const s of storylines) {
        console.log(`  [${s.type}] ${s.description.substring(0, 80)}${s.description.length > 80 ? '...' : ''}`);
      }
    }

    if (quotes.length > 0) {
      console.log('');
      console.log('--- QUOTES (display only — enrichCitizenProfiles.js handles LifeHistory) ---');
      for (const q of quotes) {
        console.log(`  ${q.name}: "${q.quote.substring(0, 60)}..."`);
      }
    }

    if (newCanon.length > 0) {
      console.log('');
      console.log('--- NEW CANON ESTABLISHED ---');
      for (const c of newCanon) {
        console.log(`  ${c}`);
      }
    }

    if (businesses.length > 0) {
      console.log('');
      console.log('--- BUSINESSES (→ Storyline_Intake) ---');
      for (const b of businesses) {
        console.log(`  ${b[0]} | ${b[1]} | ${b[2] || '?'}`);
      }
    }

    console.log('');
    console.log('=== DRY RUN COMPLETE — No data written ===');
    return;
  }

  // ── LIVE WRITES ──

  console.log('');
  console.log('Writing to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`Connected: ${conn.title}`);

  let totalWritten = 0;

  // Job 1: New citizens → Citizen_Usage_Intake (6 cols)
  // Schema: CitizenName, POPID, UsageType, Context, Reporter, Status
  if (newCitizens.length > 0) {
    const rows = newCitizens.map(c => {
      const context = [c.age ? `age ${c.age}` : '', c.neighborhood || '', c.role || '']
        .filter(Boolean).join(', ');
      return [
        c.name,                                   // CitizenName
        '',                                       // POPID (new — no ID yet)
        'new_citizen',                            // UsageType
        `New citizen from E${cycle}. ${context}`, // Context
        'edition-intake',                         // Reporter
        'pending'                                 // Status
      ];
    });

    await sheets.appendRows('Citizen_Usage_Intake!A:F', rows);
    console.log(`  → Citizen_Usage_Intake: ${rows.length} new citizens staged`);
    totalWritten += rows.length;
  }

  // Job 2: Existing citizens → Citizen_Usage_Intake (6 cols)
  if (existingCitizens.length > 0) {
    const rows = existingCitizens.map(c => {
      const context = c.context
        ? `C${cycle} ${c.category.toLowerCase()}: ${c.context}`
        : `C${cycle} ${c.category.toLowerCase()} appearance`;
      return [
        c.name,                                   // CitizenName
        c.popId || '',                            // POPID
        c.category.toLowerCase(),                 // UsageType (quoted, letters, etc.)
        context,                                  // Context
        'edition-intake',                         // Reporter
        'pending'                                 // Status
      ];
    });

    await sheets.appendRows('Citizen_Usage_Intake!A:F', rows);
    console.log(`  → Citizen_Usage_Intake: ${rows.length} existing citizen notes`);
    totalWritten += rows.length;
  }

  // Job 3: Businesses → Storyline_Intake (6 cols)
  // Schema: StorylineType, Description, Neighborhood, RelatedCitizens, Priority, Status
  if (businesses.length > 0) {
    try {
      const rows = businesses.map(b => [
        'business',                               // StorylineType
        Array.isArray(b) ? b.join(', ') : String(b), // Description
        '',                                       // Neighborhood
        '',                                       // RelatedCitizens
        'normal',                                 // Priority
        'pending'                                 // Status
      ]);
      await sheets.appendRows('Storyline_Intake!A:F', rows);
      console.log(`  → Storyline_Intake: ${rows.length} businesses staged`);
      totalWritten += rows.length;
    } catch (e) {
      console.log(`  → Storyline_Intake (businesses): SKIPPED (${e.message})`);
    }
  }

  // Job 4: Storylines → Storyline_Tracker (direct, 8 cols)
  if (storylines.length > 0) {
    const newStorylines = storylines.filter(s => s.type !== 'resolved');
    const resolved = storylines.filter(s => s.type === 'resolved');

    if (newStorylines.length > 0) {
      const rows = newStorylines.map(s => [
        new Date().toISOString(),   // Timestamp
        cycle,                      // CycleAdded
        s.type,                     // StorylineType
        s.description,              // Description
        s.neighborhood,             // Neighborhood
        s.citizens,                 // RelatedCitizens
        s.priority,                 // Priority
        'active'                    // Status
      ]);

      await sheets.appendRows('Storyline_Tracker', rows);
      console.log(`  → Storyline_Tracker: ${rows.length} storylines added`);
      totalWritten += rows.length;
    }

    if (resolved.length > 0) {
      console.log(`  → Storyline_Tracker: ${resolved.length} resolved storylines noted (manual status update needed)`);
    }
  }

  // Job 5: Quotes — display only
  if (quotes.length > 0) {
    console.log(`  → Quotes: ${quotes.length} detected (run enrichCitizenProfiles.js for LifeHistory)`);
  }

  console.log('');
  console.log('=== INTAKE COMPLETE ===');
  console.log(`Total rows written: ${totalWritten}`);

  if (businesses.length > 0) {
    console.log('');
    console.log('Next: node -r dotenv/config scripts/processBusinessIntake.js');
  }
  console.log('Next: node -r dotenv/config scripts/enrichCitizenProfiles.js --edition ' + cycle);
}

main().catch(err => {
  console.error('');
  console.error('ERROR:', err.message);
  if (err.response && err.response.data) {
    console.error('API Response:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
