/**
 * ============================================================================
 * enrichCitizenProfiles.js v1.0
 * ============================================================================
 *
 * Scans published editions, extracts citizen appearances (quotes, actions,
 * stakes), and writes enrichment entries to LifeHistory on Simulation_Ledger.
 *
 * Solves the "flat citizen" problem: citizens appear in editions with rich
 * detail (quotes, opinions, physical descriptions) but that depth dies after
 * publication. This script feeds it back into LifeHistory so desk agents
 * see accumulated character depth in future editions.
 *
 * Uses the Names Index at the end of each article as the structured extraction
 * point, then searches the article body for quotes and context per citizen.
 *
 * LifeHistory format: [Edition] context — matches existing tag convention
 * so compressLifeHistory.js picks it up via the "Quoted" trait mapping.
 *
 * Usage:
 *   node scripts/enrichCitizenProfiles.js                    # latest edition
 *   node scripts/enrichCitizenProfiles.js --edition 86       # specific edition
 *   node scripts/enrichCitizenProfiles.js --dry-run          # preview without writing
 *   node scripts/enrichCitizenProfiles.js --all              # all unprocessed editions
 *
 * ============================================================================
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

// ============================================================================
// CONFIG
// ============================================================================

const EDITIONS_DIR = path.join(__dirname, '..', 'editions');
const MAX_ENRICHMENT_LENGTH = 150; // Max chars per enrichment entry
const SKIP_REPORTERS = [
  'carmen delaine', 'luis navarro', 'maria keen', 'jordan velez',
  'kai marston', 'elliot graye', 'anthony', 'hal richmond',
  'p slayer', 'selena grant', 'talia finch', 'jax caldera',
  'mags corliss', 'rhea morgan', 'dj hartley'
];

// ============================================================================
// PARSE EDITION
// ============================================================================

/**
 * Parse an edition file and extract per-article citizen data.
 * Uses the shared editionParser for section/article splitting.
 *
 * Two modes:
 *   1. If articles contain Names Index lines, use those (E78-E84, E86).
 *   2. If not, extract citizen names from the citizen usage log section
 *      and search for their quotes/context across all articles (E85, E87+).
 */
function parseEdition(filePath) {
  const editionParser = require('../lib/editionParser');
  const parsed = editionParser.parseEdition(filePath);
  const editionNum = parseInt(parsed.edition) || 0;

  const articles = [];

  // Collect all non-meta articles
  const allArticles = [];
  for (const section of parsed.sections) {
    if (section.beat === 'meta') continue;
    for (const art of (section.articles || [])) {
      allArticles.push({ text: art.text || '', headline: art.headline || section.headline || '' });
    }
  }

  // Mode 1: Names Index in articles
  let hasNamesIndex = false;
  for (const art of allArticles) {
    const namesMatch = art.text.match(/Names Index:\s*(.+)/i);
    if (!namesMatch) continue;
    hasNamesIndex = true;

    const citizens = parseNamesIndex(namesMatch[1]);
    for (const citizen of citizens) {
      const context = extractCitizenContext(art.text, citizen, art.headline);
      if (context) {
        citizen.context = context;
        citizen.headline = art.headline;
      }
    }
    articles.push({ headline: art.headline, citizens: citizens.filter(c => c.context) });
  }

  // Mode 2: No Names Index — extract from citizen usage log section
  if (!hasNamesIndex) {
    // Find the citizen usage data in meta sections
    let citizenLogText = '';
    for (const section of parsed.sections) {
      if (section.beat === 'meta' && /citizen/i.test(section.name)) {
        citizenLogText = section.text || '';
        break;
      }
    }
    // Also try the section text directly for unnamed citizen blocks
    if (!citizenLogText) {
      for (const section of parsed.sections) {
        if (section.beat === 'meta') {
          for (const art of (section.articles || [])) {
            if (/CITIZENS QUOTED|CIVIC OFFICIALS/i.test(art.text || '')) {
              citizenLogText = art.text;
              break;
            }
          }
          if (citizenLogText) break;
        }
      }
    }

    if (citizenLogText) {
      // Parse citizen names from the usage log
      const citizenNames = extractCitizenNamesFromLog(citizenLogText);

      // For each citizen, search all articles for quotes/context
      for (const art of allArticles) {
        const artCitizens = [];
        for (const citizen of citizenNames) {
          const context = extractCitizenContext(art.text, citizen, art.headline);
          if (context) {
            artCitizens.push({ ...citizen, context, headline: art.headline });
          }
        }
        if (artCitizens.length > 0) {
          articles.push({ headline: art.headline, citizens: artCitizens });
        }
      }
    }
  }

  return { editionNum, articles };
}

/**
 * Extract citizen names from a citizen usage log section.
 * Returns objects compatible with parseNamesIndex output: { first, last, fullName, details }
 */
function extractCitizenNamesFromLog(logText) {
  const citizens = [];
  const seen = new Set();

  const lines = logText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.match(/^[-—]\s+/)) continue;

    const content = trimmed.replace(/^[-—]\s+/, '').trim();
    // Extract name: "Name, age, neighborhood, role (context)" or "Name (role)"
    let name = '';
    const parenMatch = content.match(/^([^(,]+)/);
    if (parenMatch) name = parenMatch[1].trim();

    // Strip title prefixes
    const nameLower = name.toLowerCase();
    for (const prefix of TITLE_PREFIXES) {
      if (nameLower.startsWith(prefix + ' ')) {
        name = name.substring(prefix.length + 1).trim();
        break;
      }
    }

    const parts = name.split(/\s+/);
    if (parts.length < 2) continue;
    if (SKIP_REPORTERS.includes(name.toLowerCase())) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    citizens.push({
      first: parts[0],
      last: parts[parts.length - 1],
      fullName: name,
      details: ''
    });
  }

  return citizens;
}

// Title prefixes to strip when matching names to ledger
const TITLE_PREFIXES = [
  'mayor', 'chief', 'dr.', 'dr', 'father', 'sister', 'rabbi',
  'imam', 'reverend', 'rev.', 'council president', 'councilmember',
  'sculptor', 'muralist', 'gallery owner', 'coach', 'officer'
];

/**
 * Parse a Names Index string into citizen objects
 */
function parseNamesIndex(namesStr) {
  const citizens = [];
  // Split by comma, but respect parentheses
  const parts = smartSplit(namesStr);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Pattern: "Name (role/details)"
    const match = trimmed.match(/^([^(]+?)(?:\s*\(([^)]+)\))?$/);
    if (!match) continue;

    let fullName = match[1].trim();
    const details = match[2] || '';

    // Skip reporters
    if (SKIP_REPORTERS.includes(fullName.toLowerCase())) continue;
    if (details.toLowerCase().includes('reporter')) continue;

    // Strip title prefixes for ledger matching
    const nameLower = fullName.toLowerCase();
    for (const prefix of TITLE_PREFIXES) {
      if (nameLower.startsWith(prefix + ' ')) {
        fullName = fullName.substring(prefix.length + 1).trim();
        break;
      }
    }

    // Parse name into first/last
    const nameParts = fullName.split(/\s+/);
    if (nameParts.length < 2) continue;

    const first = nameParts[0];
    const last = nameParts[nameParts.length - 1];

    citizens.push({ first, last, fullName, details });
  }

  return citizens;
}

/**
 * Split Names Index by commas, respecting parentheses
 */
function smartSplit(str) {
  const parts = [];
  let depth = 0;
  let current = '';

  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/**
 * Extract a citizen's context from article text.
 * Uses paragraph-level matching to avoid misattributing quotes.
 */
function extractCitizenContext(articleText, citizen, headline) {
  const name = citizen.fullName;
  const lastName = citizen.last;

  // Split into paragraphs (double newline or single newline with content)
  const paragraphs = articleText.split(/\n\n+/);

  // Find paragraphs that mention this citizen by full name or last name
  let quote = null;
  let actionLine = null;

  for (const para of paragraphs) {
    // Skip Names Index and photo credits
    if (para.includes('Names Index:')) continue;
    if (para.includes('[Photo:')) continue;

    // Check if this paragraph mentions the citizen
    const hasFullName = para.includes(name);
    const hasLastName = para.includes(lastName);
    if (!hasFullName && !hasLastName) continue;

    // Look for a direct quote in this paragraph
    // Pattern: Name/LastName ... said/told "quote" or "quote" ... Name said
    if (!quote) {
      // Try full name first (more specific)
      const nameToUse = hasFullName ? name : lastName;
      const quotePatterns = [
        // "quote" ... Name said/told
        new RegExp(`\\u201c([^\\u201d]{10,120})\\u201d[^\\n]*${escapeRegex(nameToUse)}`, 'i'),
        // Name said "quote"
        new RegExp(`${escapeRegex(nameToUse)}[^\\n]*\\u201c([^\\u201d]{10,120})\\u201d`, 'i'),
        // Same with straight quotes
        new RegExp(`"([^"]{10,120})"[^\\n]{0,60}${escapeRegex(nameToUse)}`, 'i'),
        new RegExp(`${escapeRegex(nameToUse)}[^\\n]{0,60}"([^"]{10,120})"`, 'i'),
      ];

      for (const pattern of quotePatterns) {
        const match = para.match(pattern);
        if (match) {
          quote = match[1].trim();
          if (quote.length > 80) {
            quote = quote.substring(0, 77) + '...';
          }
          break;
        }
      }
    }

    // Look for action verbs near their name in this paragraph
    if (!actionLine) {
      const actionVerbs = 'voted|said|told|called|asked|noted|argued|warned|framed|scheduled|advocated|watched|drove|waited|worked|signed|announced|proposed|opposed|supported|endorsed';
      const actionMatch = para.match(new RegExp(
        `${escapeRegex(lastName)}[^.]{0,80}?(${actionVerbs})`,
        'i'
      ));
      if (actionMatch) {
        actionLine = actionMatch[0].trim();
        if (actionLine.length > 100) actionLine = actionLine.substring(0, 97) + '...';
      }
    }
  }

  // Build enrichment entry — quote is preferred over action
  if (quote) {
    return `Quoted: "${quote}"`;
  } else if (actionLine) {
    return `Referenced: ${actionLine}`;
  } else if (citizen.details) {
    return `Appeared (${citizen.details})`;
  }

  return null;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// LEDGER MATCHING + WRITING
// ============================================================================

/**
 * Match extracted citizens to ledger and build enrichment entries
 */
async function enrichFromEdition(editionNum, articles, dryRun) {
  const data = await sheets.getSheetData('Simulation_Ledger');
  const headers = data[0];
  const iFirst = headers.indexOf('First');
  const iLast = headers.indexOf('Last');
  const iLife = headers.indexOf('LifeHistory');
  const iPopId = headers.indexOf('POPID');

  if (iFirst < 0 || iLast < 0 || iLife < 0) {
    console.log('ERROR: Missing required columns (First, Last, LifeHistory)');
    return;
  }

  // Build name→row lookup
  const nameLookup = {};
  for (let i = 1; i < data.length; i++) {
    const first = String(data[i][iFirst] || '').trim();
    const last = String(data[i][iLast] || '').trim();
    const key = (first + ' ' + last).toLowerCase();
    nameLookup[key] = {
      row: i + 1, // 1-indexed for Sheets
      popId: data[i][iPopId],
      currentLife: String(data[i][iLife] || ''),
      first,
      last
    };
  }

  const enrichments = [];
  const tag = `E${editionNum}`;
  const alreadyEnriched = new Set(); // One entry per citizen per edition

  for (const article of articles) {
    for (const citizen of article.citizens) {
      const key = (citizen.first + ' ' + citizen.last).toLowerCase();
      const ledgerEntry = nameLookup[key];

      if (!ledgerEntry) {
        console.log(`  SKIP: ${citizen.fullName} — not found in ledger`);
        continue;
      }

      // Check if already enriched for this edition
      if (alreadyEnriched.has(key)) continue;

      // Check if LifeHistory already has this edition tag
      if (ledgerEntry.currentLife.includes(`[${tag}]`)) {
        console.log(`  SKIP: ${citizen.fullName} — already enriched for ${tag}`);
        continue;
      }

      alreadyEnriched.add(key);

      // Build the enrichment line
      let entry = `[${tag}] ${citizen.context}`;
      if (entry.length > MAX_ENRICHMENT_LENGTH) {
        entry = entry.substring(0, MAX_ENRICHMENT_LENGTH - 3) + '...';
      }

      enrichments.push({
        popId: ledgerEntry.popId,
        name: `${ledgerEntry.first} ${ledgerEntry.last}`,
        row: ledgerEntry.row,
        currentLife: ledgerEntry.currentLife,
        entry,
        lifeCol: iLife
      });
    }
  }

  // Display results
  console.log(`\n  Enrichments for Edition ${editionNum}:`);
  console.log(`  ${'—'.repeat(60)}`);

  for (const e of enrichments) {
    console.log(`  ${e.popId} ${e.name}: ${e.entry}`);
  }

  console.log(`\n  Total: ${enrichments.length} citizens to enrich`);

  if (dryRun) {
    console.log('\n  DRY RUN — no writes performed');
    return enrichments;
  }

  // Write enrichments to ledger
  if (enrichments.length === 0) return enrichments;

  const updates = [];
  for (const e of enrichments) {
    const separator = e.currentLife.trim() ? '\n' : '';
    const newLife = e.currentLife + separator + e.entry;
    const col = String.fromCharCode(65 + e.lifeCol);
    updates.push({
      range: `Simulation_Ledger!${col}${e.row}`,
      values: [[newLife]]
    });
  }

  await sheets.batchUpdate(updates);
  console.log(`\n  WRITTEN: ${updates.length} LifeHistory entries updated`);

  return enrichments;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const allMode = args.includes('--all');

  let editionNum = null;
  const editionArg = args.find(a => a.startsWith('--edition'));
  if (editionArg) {
    const idx = args.indexOf(editionArg);
    editionNum = parseInt(args[idx + 1] || editionArg.split('=')[1]);
  }

  console.log('');
  console.log('========================================');
  console.log('  Citizen Profile Enrichment v1.0');
  console.log('========================================');

  if (dryRun) console.log('  Mode: DRY RUN');

  // Find edition files
  const files = fs.readdirSync(EDITIONS_DIR)
    .filter(f => f.match(/cycle_pulse_edition_\d+\.txt$/))
    .sort();

  if (files.length === 0) {
    console.log('  No edition files found in ' + EDITIONS_DIR);
    return;
  }

  let targetFiles;
  if (editionNum) {
    const target = files.find(f => f.includes(`edition_${editionNum}`));
    if (!target) {
      console.log(`  Edition ${editionNum} not found`);
      return;
    }
    targetFiles = [target];
  } else if (allMode) {
    targetFiles = files;
  } else {
    // Latest edition
    targetFiles = [files[files.length - 1]];
  }

  for (const file of targetFiles) {
    const filePath = path.join(EDITIONS_DIR, file);
    console.log(`\n  Processing: ${file}`);

    const { editionNum: num, articles } = parseEdition(filePath);
    const totalCitizens = articles.reduce((sum, a) => sum + a.citizens.length, 0);
    console.log(`  Found ${articles.length} articles with ${totalCitizens} citizen references`);

    if (totalCitizens > 0) {
      await enrichFromEdition(num, articles, dryRun);
    }
  }

  console.log('\n  Done.\n');
}

main().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
