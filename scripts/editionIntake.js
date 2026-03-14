/**
 * ============================================================================
 * EDITION INTAKE PARSER v1.2
 * ============================================================================
 *
 * Parses a Cycle Pulse edition file and writes structured data to Google Sheets
 * intake tabs. Replicates the logic of parseMediaRoomMarkdown.js (Apps Script)
 * as a Node.js CLI tool.
 *
 * Usage:
 *   node scripts/editionIntake.js <edition-file> [cycle-number]  (auto-detects from header if omitted)
 *   node scripts/editionIntake.js --dry-run <edition-file> [cycle-number]
 *
 * Writes to:
 *   - Media_Intake (7 cols): Article table entries
 *   - Storyline_Intake (6 cols): Storyline entries
 *   - Citizen_Usage_Intake (5 cols): Citizen usage entries
 *   - Business_Intake (6 cols): Business mentions from Business Ticker (v1.2)
 *
 *   NOTE: LifeHistory_Log writes were removed (v1.3). The engine owns that sheet.
 *   parseDirectQuotes still runs for dry-run visibility but never writes.
 *
 * After running this script, run processMediaIntakeV2() in Apps Script
 * to move data from intake sheets to final ledgers (Press_Drafts,
 * Storyline_Tracker, Citizen_Media_Usage).
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');


// ════════════════════════════════════════════════════════════════════════════
// SECTION EXTRACTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Extract a named section from the edition markdown.
 * Matches the logic of extractSection_() in parseMediaRoomMarkdown.js.
 */
function extractSection(markdown, sectionName) {
  const namePattern = new RegExp(sectionName, 'i');
  const nameMatch = markdown.match(namePattern);
  if (!nameMatch) return null;

  // Find the end of the header block (closing ### line after section name)
  const afterName = markdown.substring(nameMatch.index);
  const headerEndMatch = afterName.match(/\n#{3,}\s*\n/);

  let startIdx;
  if (headerEndMatch) {
    startIdx = nameMatch.index + headerEndMatch.index + headerEndMatch[0].length;
  } else {
    const lineEnd = afterName.match(/\n/);
    startIdx = nameMatch.index + (lineEnd ? lineEnd.index + 1 : afterName.length);
  }

  // Find end at next major section
  const remaining = markdown.substring(startIdx);
  let endIdx = markdown.length;

  // ### followed by text
  const endMatch = remaining.match(/\n#{3,}\s*\n[A-Z]/);
  if (endMatch) endIdx = Math.min(endIdx, startIdx + endMatch.index);

  // ----- then ###
  const dashMatch = remaining.match(/\n---+\s*\n\s*#{3,}/);
  if (dashMatch) endIdx = Math.min(endIdx, startIdx + dashMatch.index);

  // ===== separator
  const equalsMatch = remaining.match(/\n={3,}\s*\n[A-Z]/);
  if (equalsMatch) endIdx = Math.min(endIdx, startIdx + equalsMatch.index);

  return markdown.substring(startIdx, endIdx).trim();
}


// ════════════════════════════════════════════════════════════════════════════
// ARTICLE TABLE PARSER
// Media_Intake: Reporter, StoryType, SignalSource, Headline, ArticleText,
//               CulturalMentions, Status
// ════════════════════════════════════════════════════════════════════════════

function parseArticleTable(section) {
  const lines = section.split('\n');
  const articles = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip header row
    if (/^\|\s*Reporter\s*\|/i.test(trimmed)) continue;
    // Skip separator rows
    if (/^\|[-\s|]+\|$/.test(trimmed)) continue;
    if (/^---+$/.test(trimmed)) continue;

    if (trimmed.startsWith('|')) {
      // Split on pipe, remove leading/trailing empty strings from split
      const cells = trimmed.split('|').slice(1).map(c => c.trim());

      if (cells.length >= 4) {
        articles.push([
          cells[0] || '',   // Reporter
          cells[1] || '',   // StoryType
          cells[2] || '',   // SignalSource
          cells[3] || '',   // Headline
          cells[4] || '',   // ArticleText
          cells[5] || '',   // CulturalMentions
          ''                // Status (empty for intake)
        ]);
      }
    }
  }

  return articles;
}


// ════════════════════════════════════════════════════════════════════════════
// STORYLINES PARSER
// Storyline_Intake: StorylineType, Description, Neighborhood,
//                   RelatedCitizens, Priority, Status
// ════════════════════════════════════════════════════════════════════════════

function parseStorylines(section) {
  const lines = section.split('\n');
  const storylines = [];
  let currentCategory = 'active';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Category headers
    if (/^RESOLVED/i.test(trimmed)) { currentCategory = 'resolved'; continue; }
    if (/^PHASE CHANGES/i.test(trimmed)) { currentCategory = 'phase-change'; continue; }
    if (/^STILL ACTIVE/i.test(trimmed) || /^ACTIVE/i.test(trimmed)) { currentCategory = 'active'; continue; }
    if (/^NEW THREAD/i.test(trimmed) || /^NEW THIS CYCLE/i.test(trimmed) || /^NEW:/i.test(trimmed)) { currentCategory = 'new'; continue; }
    if (/^QUESTIONS/i.test(trimmed)) { currentCategory = 'question'; continue; }

    // Parse entries (— or - or -- prefix)
    if (/^(?:--|[—\-])\s+/.test(trimmed)) {
      const content = trimmed.replace(/^(?:--|[—\-])\s+/, '').trim();

      // Pipe-separated format: type | description | neighborhood | citizens | priority
      if (content.includes('|')) {
        const parts = content.split('|').map(p => p.trim());
        const type = (parts[0] || '').toLowerCase();
        const description = parts[1] || '';
        const neighborhood = parts[2] || '';
        const citizens = parts[3] || '';
        const priority = parts[4] || 'normal';

        storylines.push([
          type || currentCategory,  // StorylineType
          description,              // Description
          neighborhood,             // Neighborhood
          citizens,                 // RelatedCitizens
          priority,                 // Priority
          ''                        // Status
        ]);
      } else {
        // Simple format: — description (no pipes)
        const neighborhoods = [
          'Temescal', 'Downtown', 'West Oakland', 'Fruitvale', 'Laurel',
          'Jack London', 'Lake Merritt', 'Chinatown', 'Rockridge', 'Piedmont',
          'Uptown', 'KONO', 'Adams Point', 'Montclair'
        ];
        let neighborhood = '';
        for (const n of neighborhoods) {
          if (content.includes(n)) { neighborhood = n; break; }
        }

        const priority = (currentCategory === 'new' || currentCategory === 'phase-change')
          ? 'high' : 'normal';

        storylines.push([
          currentCategory,  // StorylineType
          content,          // Description
          neighborhood,     // Neighborhood
          '',               // RelatedCitizens
          priority,         // Priority
          ''                // Status
        ]);
      }
    }
  }

  return storylines;
}


// ════════════════════════════════════════════════════════════════════════════
// CITIZEN USAGE PARSER
// Citizen_Usage_Intake: CitizenName, UsageType, Context, Reporter, Status
// ════════════════════════════════════════════════════════════════════════════

function parseCitizenUsage(section) {
  const lines = section.split('\n');
  const usages = [];
  let currentContext = 'CITIZEN';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Parse entries FIRST (— or - prefix) before checking headers,
    // because entry content can contain header trigger words
    // (e.g., "civic engagement" in context, "Owner" in name)
    if (/^(?:--|[—\-])\s+/.test(trimmed)) {
      const content = trimmed.replace(/^(?:--|[—\-])\s+/, '').trim();

      let name = content;
      let context = '';

      // Extract "Name (context)" format
      const parenMatch = content.match(/^(.+?)\s*\(([^)]+)\)$/);
      if (parenMatch) {
        name = parenMatch[1].trim();
        context = parenMatch[2].trim();
      }

      if (!context) context = currentContext;

      if (name) {
        usages.push([
          name,        // CitizenName
          'mentioned', // UsageType
          context,     // Context
          '',          // Reporter
          ''           // Status
        ]);
      }
      continue;
    }

    // Category headers (non-entry lines only)
    const lower = trimmed.toLowerCase();

    if (lower.includes('journalist') || lower.includes('reporter') ||
        /^JOURNALISTS/i.test(trimmed)) {
      currentContext = 'JOURNALIST'; continue;
    }
    if (lower.includes("sports") && (lower.includes("a's") || lower.includes("oakland"))) {
      currentContext = 'UNI'; continue;
    }
    if (lower.includes('sports') && lower.includes('warriors')) {
      currentContext = 'UNI'; continue;
    }
    if (lower.includes('sports') && lower.includes('bulls')) {
      currentContext = 'UNI'; continue;
    }
    if (lower.includes('civic') || lower.includes('official')) {
      currentContext = 'CIVIC'; continue;
    }
    if (/^CULTURAL/i.test(trimmed)) {
      currentContext = 'CULTURAL'; continue;
    }
    if (lower.includes('owner') || lower.includes('executive')) {
      currentContext = 'EXECUTIVE'; continue;
    }
    if (lower.includes('quoted')) {
      currentContext = 'QUOTED'; continue;
    }
    if (lower.includes('letters')) {
      currentContext = 'LETTERS'; continue;
    }
    if (lower.includes('citizen') || lower.includes('other')) {
      currentContext = 'CITIZEN'; continue;
    }
  }

  return usages;
}


// ════════════════════════════════════════════════════════════════════════════
// CONTINUITY NOTES PARSER — Direct Quotes Only
// LifeHistory_Log: Timestamp, POPID, Name, EventTag, EventText,
//                  Neighborhood, Cycle
// ════════════════════════════════════════════════════════════════════════════

function parseDirectQuotes(section, cycle) {
  const lines = section.split('\n');
  const quotes = [];
  let inQuoteSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect DIRECT QUOTES subsection start
    if (/direct\s+quotes?\s+preserved/i.test(trimmed)) {
      inQuoteSection = true;
      continue;
    }

    // Detect other subsection headers — exit quote section
    if (/SPORTS RECORDS/i.test(trimmed) || /NEW CANON/i.test(trimmed) ||
        /^[#=]{3,}$/.test(trimmed) || /^={3,}$/.test(trimmed)) {
      inQuoteSection = false;
      continue;
    }

    // Parse quote lines within the quote section
    if (inQuoteSection) {
      // Match: — Name: "quote text"
      // Handles ASCII quotes, smart quotes, and parenthetical qualifiers in name
      const quoteMatch = trimmed.match(/^(?:--|[—–\-])\s*(.+?):\s*["\u201C\u201D](.+)["\u201C\u201D]$/);
      if (quoteMatch) {
        quotes.push([
          '',                                                     // Timestamp (unused — cycle is the temporal key)
          '',                                                     // POPID (resolved later)
          quoteMatch[1].trim(),                                   // Name
          'Quoted',                                               // EventTag
          'Direct quote preserved: ' + quoteMatch[2].trim(),      // EventText
          '',                                                     // Neighborhood
          cycle                                                   // Cycle
        ]);
      }
    }
  }

  return quotes;
}


// ════════════════════════════════════════════════════════════════════════════
// v1.2: BUSINESS MENTION PARSER (Phase 12.5)
// Scans Business Ticker section for new business names to stage in
// Business_Intake for later promotion to Business_Ledger.
// ════════════════════════════════════════════════════════════════════════════

function parseBusinessMentions(markdown, cycle) {
  const businesses = [];
  const seen = new Set();

  // Extract Business Ticker section
  const bizSection = extractSection(markdown, 'BUSINESS TICKER')
    || extractSection(markdown, 'BUSINESS');
  if (!bizSection) return businesses;

  const lines = bizSection.split('\n');
  const fullText = bizSection;

  // Pattern 1: "opened" / "grand opening" / "new [type]" with quoted or capitalized names
  //   e.g., "the new bakery 'Flour & Co' opened on Telegraph"
  //   e.g., "Grand opening of Portside Cafe on 7th Street"
  const openPatterns = [
    /(?:new|opened|grand opening of|opening of|launched)\s+(?:a\s+)?(?:new\s+)?(?:restaurant|bar|cafe|gallery|shop|store|bakery|clinic|studio|lounge|bistro|diner|pub|brewery|taproom|coffeehouse|bookstore)?\s*['""]([^'""]+)['""]?/gi,
    /['""]([^'""]{3,40})['""][\s,]*(?:opened|launched|held its grand opening|debuted)/gi,
    /grand opening (?:of|for)\s+['""]?([A-Z][A-Za-z\s&'.]{2,35})['""]?/gi
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

/**
 * Infer business sector from surrounding context words.
 */
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

/**
 * Infer neighborhood from surrounding context using Oakland neighborhood names.
 */
function inferNeighborhood(text, matchIndex) {
  const context = text.substring(Math.max(0, matchIndex - 150), matchIndex + 200);
  const neighborhoods = [
    'Downtown', 'Jack London', 'Rockridge', 'Temescal', 'Fruitvale',
    'Lake Merritt', 'West Oakland', 'Laurel', 'Chinatown', 'Grand Lake',
    'Old Oakland', 'Uptown', 'KONO', 'Brooklyn Basin', 'Piedmont Avenue',
    'East Oakland', 'Montclair'
  ];
  for (const nh of neighborhoods) {
    if (context.includes(nh)) return nh;
  }
  // Check street names
  if (/Telegraph/i.test(context)) return 'Temescal';
  if (/7th Street/i.test(context)) return 'West Oakland';
  if (/International Blvd|International Boulevard/i.test(context)) return 'Fruitvale';
  if (/Broadway/i.test(context)) return 'Downtown';
  if (/College Ave/i.test(context)) return 'Rockridge';
  return '';
}


// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  const dryRun = args.includes('--dry-run');
  const filteredArgs = args.filter(a => !a.startsWith('--'));

  if (filteredArgs.length < 1) {
    console.error('Usage: node scripts/editionIntake.js [--dry-run] <edition-file> [cycle-number]');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/editionIntake.js editions/cycle_pulse_edition_79_v2.txt 79');
    console.error('  node scripts/editionIntake.js --dry-run editions/cycle_pulse_edition_79_v2.txt 79');
    process.exit(1);
  }

  const editionFile = path.resolve(filteredArgs[0]);

  // Read edition file
  if (!fs.existsSync(editionFile)) {
    console.error(`ERROR: File not found: ${editionFile}`);
    process.exit(1);
  }

  const markdown = fs.readFileSync(editionFile, 'utf-8');

  // Auto-detect cycle from header: "THE CYCLE PULSE — EDITION 80"
  let cycle = parseInt(filteredArgs[1]);
  if (!cycle) {
    const headerMatch = markdown.match(/EDITION\s+(\d+)/i);
    cycle = headerMatch ? parseInt(headerMatch[1]) : 0;
  }
  if (!cycle) {
    console.error('ERROR: Could not detect cycle number. Pass it explicitly:');
    console.error('  node scripts/editionIntake.js <file> <cycle-number>');
    process.exit(1);
  }

  console.log('');
  console.log('=== EDITION INTAKE PARSER v1.1 ===');
  console.log(`Edition: ${editionFile}`);
  console.log(`Cycle: ${cycle}${!filteredArgs[1] ? ' (auto-detected from header)' : ''}`);
  if (dryRun) console.log('Mode: DRY RUN (no writes)');
  console.log('');
  console.log(`Read ${markdown.length} characters from edition file`);

  // Extract sections
  const articleSection = extractSection(markdown, 'ARTICLE TABLE');
  const storylineSection = extractSection(markdown, 'STORYLINES UPDATED')
    || extractSection(markdown, 'STORYLINES CARRIED FORWARD');
  const citizenSection = extractSection(markdown, 'CITIZEN USAGE LOG');
  const continuitySection = extractSection(markdown, 'CONTINUITY NOTES');

  console.log('');
  console.log('Sections found:');
  console.log(`  ARTICLE TABLE:   ${articleSection ? articleSection.length + ' chars' : 'NOT FOUND'}`);
  console.log(`  STORYLINES:      ${storylineSection ? storylineSection.length + ' chars' : 'NOT FOUND'}`);
  console.log(`  CITIZEN USAGE:   ${citizenSection ? citizenSection.length + ' chars' : 'NOT FOUND'}`);
  console.log(`  CONTINUITY:      ${continuitySection ? continuitySection.length + ' chars' : 'NOT FOUND'}`);

  // Parse sections
  const articles = articleSection ? parseArticleTable(articleSection) : [];
  const storylines = storylineSection ? parseStorylines(storylineSection) : [];
  const citizens = citizenSection ? parseCitizenUsage(citizenSection) : [];
  const quotes = continuitySection ? parseDirectQuotes(continuitySection, cycle) : [];

  // v1.2: Parse business mentions from Business Ticker
  const businessMentions = parseBusinessMentions(markdown, cycle);

  console.log('');
  console.log('Parsed:');
  console.log(`  Articles:      ${articles.length}`);
  console.log(`  Storylines:    ${storylines.length}`);
  console.log(`  Citizens:      ${citizens.length}`);
  console.log(`  Direct Quotes: ${quotes.length}`);
  console.log(`  Businesses:    ${businessMentions.length}`);

  // Dry run: print what would be written
  if (dryRun) {
    console.log('');
    console.log('--- DRY RUN: Articles (Media_Intake) ---');
    for (const a of articles) {
      console.log(`  ${a[0]} | ${a[1]} | ${a[3].substring(0, 60)}...`);
    }

    console.log('');
    console.log('--- DRY RUN: Storylines (Storyline_Intake) ---');
    for (const s of storylines) {
      console.log(`  [${s[0]}] ${s[1].substring(0, 70)}... | ${s[2]} | ${s[4]}`);
    }

    console.log('');
    console.log('--- DRY RUN: Citizens (Citizen_Usage_Intake) ---');
    console.log(`  ${citizens.length} entries across categories`);
    const categories = {};
    for (const c of citizens) {
      categories[c[2]] = (categories[c[2]] || 0) + 1;
    }
    for (const [cat, count] of Object.entries(categories)) {
      console.log(`    ${cat}: ${count}`);
    }

    console.log('');
    console.log('--- DRY RUN: Quotes (LifeHistory_Log) ---');
    for (const q of quotes) {
      console.log(`  ${q[2]}: "${q[4].substring(24, 80)}..."`);
    }

    if (businessMentions.length > 0) {
      console.log('');
      console.log('--- DRY RUN: Businesses (Business_Intake) ---');
      for (const b of businessMentions) {
        console.log(`  ${b[0]} | ${b[1]} | ${b[2] || '(unknown)'}`);
      }
    }

    console.log('');
    console.log('=== DRY RUN COMPLETE — No data written ===');
    return;
  }

  // Write to Google Sheets
  console.log('');
  console.log('Connecting to Google Sheets...');
  const conn = await sheets.testConnection();
  console.log(`Connected: ${conn.title}`);
  console.log('');

  let totalWritten = 0;

  if (articles.length > 0) {
    const count = await sheets.appendRows('Media_Intake', articles);
    console.log(`  -> Media_Intake: ${articles.length} rows written`);
    totalWritten += articles.length;
  }

  if (storylines.length > 0) {
    const count = await sheets.appendRows('Storyline_Intake', storylines);
    console.log(`  -> Storyline_Intake: ${storylines.length} rows written`);
    totalWritten += storylines.length;
  }

  if (citizens.length > 0) {
    const count = await sheets.appendRows('Citizen_Usage_Intake', citizens);
    console.log(`  -> Citizen_Usage_Intake: ${citizens.length} rows written`);
    totalWritten += citizens.length;
  }

  // v1.3: LifeHistory_Log writes REMOVED — the engine owns that sheet.
  // parseDirectQuotes still runs for dry-run visibility only.
  if (quotes.length > 0) {
    console.log(`  -> LifeHistory_Log: ${quotes.length} quotes detected (NOT written — engine-owned sheet)`);
  }

  // v1.2: Write business mentions to Business_Intake (if sheet exists)
  if (businessMentions.length > 0) {
    try {
      const count = await sheets.appendRows('Business_Intake', businessMentions);
      console.log(`  -> Business_Intake: ${businessMentions.length} businesses staged`);
      totalWritten += businessMentions.length;
    } catch (e) {
      console.log(`  -> Business_Intake: SKIPPED (${e.message || 'sheet not found'})`);
      console.log('     Create Business_Intake sheet with headers: Name | Sector | Neighborhood | Description | SourceCycle | Status');
    }
  }

  console.log('');
  console.log('=== INTAKE COMPLETE ===');
  console.log(`Total rows written: ${totalWritten}`);
  console.log('');
  console.log('Next step: Run processMediaIntakeV2() in Apps Script to move');
  console.log('data from intake sheets to final ledgers (Press_Drafts,');
  console.log('Storyline_Tracker, Citizen_Media_Usage).');
  if (businessMentions.length > 0) {
    console.log('');
    console.log('Business mentions staged. Run processBusinessIntake.js to promote to Business_Ledger.');
  }
}

main().catch(err => {
  console.error('');
  console.error('ERROR:', err.message);
  if (err.response && err.response.data) {
    console.error('API Response:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
