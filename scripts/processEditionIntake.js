#!/usr/bin/env node
/**
 * processEditionIntake.js — Direct intake from structured desk agent output
 *
 * Reads the ## INTAKE section from desk output files and writes complete rows
 * to Citizen_Usage_Intake, Storyline_Intake, and Storyline_Tracker sheets.
 *
 * Replaces the old parser approach (editionIntake.js) which tried to reverse-
 * engineer free-form article text. Agents now declare what they used/invented.
 *
 * Usage:
 *   node scripts/processEditionIntake.js [cycle]              # Dry run
 *   node scripts/processEditionIntake.js [cycle] --apply       # Write to sheets
 *
 * Reads from:
 *   output/desk-output/{desk}_c{XX}.md   (desk agent output files)
 *   OR: compiled edition file if --edition flag provided
 *
 * Writes to:
 *   Citizen_Usage_Intake — citizens used/invented
 *   Storyline_Intake — storylines (new, continuing, resolved)
 *   Storyline_Tracker — storyline tracking (new entries only)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const ROOT = path.resolve(__dirname, '..');
const DESK_OUTPUT_DIR = path.join(ROOT, 'output/desk-output');
const APPLY = process.argv.includes('--apply');
const EDITION_FLAG = process.argv.includes('--edition');

const CYCLE = parseInt(process.argv.find(a => /^\d+$/.test(a))) || (() => {
  try {
    const bc = JSON.parse(fs.readFileSync(path.join(ROOT, 'output/desk-packets/base_context.json'), 'utf-8'));
    return bc.cycle || 88;
  } catch { return 88; }
})();

const DESKS = ['civic', 'sports', 'culture', 'business', 'chicago', 'letters'];

// ─── PARSE INTAKE SECTION ────────────────────────────────

function extractIntakeSection(text) {
  // Find ## INTAKE section
  const intakeMatch = text.match(/^## INTAKE\s*$/m);
  if (!intakeMatch) return null;

  const startIdx = intakeMatch.index + intakeMatch[0].length;
  // Intake section ends at next ## heading or end of file
  const nextSection = text.slice(startIdx).match(/^## [^I]/m);
  const intakeText = nextSection
    ? text.slice(startIdx, startIdx + nextSection.index).trim()
    : text.slice(startIdx).trim();

  return intakeText;
}

function parseIntakeLines(intakeText) {
  const citizens = [];
  const newCitizens = [];
  const businesses = [];
  const schools = [];
  const faith = [];
  const quotes = [];
  const storylines = [];

  const lines = intakeText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    // Skip code fence markers and empty lines
    if (line.startsWith('```') || line.startsWith('---')) continue;

    const parts = line.split('|').map(p => p.trim());

    if (line.startsWith('CITIZEN:') && parts.length >= 4) {
      citizens.push({
        name: parts[0].replace('CITIZEN:', '').trim(),
        popId: parts[1],
        usageType: parts[2],
        context: parts[3] || ''
      });
    } else if (line.startsWith('NEW_CITIZEN:') && parts.length >= 4) {
      newCitizens.push({
        name: parts[0].replace('NEW_CITIZEN:', '').trim(),
        popId: null,
        usageType: 'new_citizen',
        context: parts[3] || parts[2] || ''
      });
    } else if (line.startsWith('BUSINESS:') && parts.length >= 3) {
      businesses.push({
        name: parts[0].replace('BUSINESS:', '').trim(),
        neighborhood: parts[1],
        status: parts[2],
        type: parts[3] || ''
      });
    } else if (line.startsWith('SCHOOL:') && parts.length >= 2) {
      schools.push({
        name: parts[0].replace('SCHOOL:', '').trim(),
        neighborhood: parts[1],
        status: parts[2] || 'referenced'
      });
    } else if (line.startsWith('FAITH:') && parts.length >= 2) {
      faith.push({
        name: parts[0].replace('FAITH:', '').trim(),
        neighborhood: parts[1],
        status: parts[2] || 'referenced'
      });
    } else if (line.startsWith('QUOTE:') && parts.length >= 3) {
      quotes.push({
        name: parts[0].replace('QUOTE:', '').trim(),
        popId: parts[1],
        quote: parts[2].replace(/^[""\u201C]|[""\u201D]$/g, '').trim()
      });
    } else if (line.startsWith('STORYLINE:') && parts.length >= 3) {
      storylines.push({
        status: parts[0].replace('STORYLINE:', '').trim().toUpperCase(),
        description: parts[1],
        citizens: parts[2] || '',
        neighborhood: parts[3] || ''
      });
    }
  }

  return { citizens, newCitizens, businesses, schools, faith, quotes, storylines };
}

// ─── BUILD SHEET ROWS ────────────────────────────────────

function buildCitizenUsageRows(parsed, desk, cycle) {
  const rows = [];

  // Existing citizens
  for (const c of parsed.citizens) {
    rows.push([
      c.name,           // CitizenName
      c.usageType,      // UsageType
      c.context,        // Context
      desk,             // Reporter (desk name)
      'pending',        // Status
      '',               // Season (filled by engine)
      '',               // Holiday
      '',               // HolidayPriority
      '',               // IsFirstFriday
      '',               // IsCreationDay
      ''                // SportsSeason
    ]);
  }

  // New citizens
  for (const c of parsed.newCitizens) {
    rows.push([
      c.name,
      'new_citizen',
      c.context,
      desk,
      'pending',
      '', '', '', '', '', ''
    ]);
  }

  return rows;
}

function buildStorylineIntakeRows(parsed, desk, cycle) {
  const rows = [];

  // Storylines
  for (const s of parsed.storylines) {
    const typeMap = {
      'NEW': 'new',
      'CONTINUING': 'thread',
      'RESOLVED': 'resolved'
    };
    rows.push([
      typeMap[s.status] || 'thread',  // StorylineType
      s.description,                   // Description
      s.neighborhood,                  // Neighborhood
      s.citizens,                      // RelatedCitizens
      s.status === 'NEW' ? 'high' : 'normal',  // Priority
      s.status === 'RESOLVED' ? 'resolved' : 'active',  // Status
      '', '', '', '', '', ''           // Seasonal fields
    ]);
  }

  // Businesses as storylines
  for (const b of parsed.businesses) {
    if (b.status === 'new') {
      rows.push([
        'business',
        `New business: ${b.name} (${b.type || 'business'})`,
        b.neighborhood,
        '',
        'normal',
        'active',
        '', '', '', '', '', ''
      ]);
    }
  }

  // Schools as storylines
  for (const s of parsed.schools) {
    if (s.status === 'new') {
      rows.push([
        'new',
        `New school: ${s.name}`,
        s.neighborhood,
        '',
        'normal',
        'active',
        '', '', '', '', '', ''
      ]);
    }
  }

  // Faith as storylines
  for (const f of parsed.faith) {
    if (f.status === 'new') {
      rows.push([
        'new',
        `New faith community: ${f.name}`,
        f.neighborhood,
        '',
        'normal',
        'active',
        '', '', '', '', '', ''
      ]);
    }
  }

  return rows;
}

function buildStorylineTrackerRows(parsed, cycle) {
  const rows = [];
  const now = new Date().toISOString();

  for (const s of parsed.storylines) {
    if (s.status === 'NEW') {
      rows.push([
        now,               // Timestamp
        cycle,             // CycleAdded
        'new',             // StorylineType
        s.description,     // Description
        s.neighborhood,    // Neighborhood
        s.citizens,        // RelatedCitizens
        'high',            // Priority
        'active'           // Status
      ]);
    }
  }

  return rows;
}

// ─── QUOTE LOG ───────────────────────────────────────────

function buildQuoteLog(allParsed, cycle) {
  const quotes = [];
  for (const { desk, parsed } of allParsed) {
    for (const q of parsed.quotes) {
      quotes.push({
        citizen: q.name,
        popId: q.popId,
        quote: q.quote,
        desk,
        cycle
      });
    }
  }
  return quotes;
}

// ─── MAIN ────────────────────────────────────────────────

async function main() {
  console.log(`\n=== processEditionIntake.js — Cycle ${CYCLE} ${APPLY ? '(LIVE WRITE)' : '(DRY RUN)'} ===\n`);

  // Collect desk output files
  const sources = [];

  if (EDITION_FLAG) {
    // Read from compiled edition file
    const editionArg = process.argv.find(a => a.endsWith('.txt'));
    if (editionArg && fs.existsSync(editionArg)) {
      const text = fs.readFileSync(editionArg, 'utf-8');
      sources.push({ desk: 'edition', text });
    }
  } else {
    // Read from individual desk output files
    for (const desk of DESKS) {
      const deskFile = path.join(DESK_OUTPUT_DIR, `${desk}_c${CYCLE}.md`);
      if (fs.existsSync(deskFile)) {
        const text = fs.readFileSync(deskFile, 'utf-8');
        sources.push({ desk, text });
      } else {
        console.log(`  ${desk}: no output file found`);
      }
    }
  }

  if (sources.length === 0) {
    console.log('No desk output files found. Nothing to process.');
    process.exit(0);
  }

  // Parse all INTAKE sections
  let totalCitizens = 0, totalNewCitizens = 0, totalStorylines = 0;
  let totalBusinesses = 0, totalQuotes = 0;
  const allCitizenRows = [];
  const allStorylineIntakeRows = [];
  const allStorylineTrackerRows = [];
  const allParsed = [];

  for (const { desk, text } of sources) {
    const intakeText = extractIntakeSection(text);
    if (!intakeText) {
      console.log(`  ${desk}: no ## INTAKE section found`);
      continue;
    }

    const parsed = parseIntakeLines(intakeText);
    allParsed.push({ desk, parsed });

    console.log(`  ${desk}:`);
    console.log(`    Citizens: ${parsed.citizens.length} existing, ${parsed.newCitizens.length} new`);
    console.log(`    Businesses: ${parsed.businesses.length}, Schools: ${parsed.schools.length}, Faith: ${parsed.faith.length}`);
    console.log(`    Quotes: ${parsed.quotes.length}`);
    console.log(`    Storylines: ${parsed.storylines.length}`);

    totalCitizens += parsed.citizens.length;
    totalNewCitizens += parsed.newCitizens.length;
    totalStorylines += parsed.storylines.length;
    totalBusinesses += parsed.businesses.length;
    totalQuotes += parsed.quotes.length;

    // Build rows
    allCitizenRows.push(...buildCitizenUsageRows(parsed, desk, CYCLE));
    allStorylineIntakeRows.push(...buildStorylineIntakeRows(parsed, desk, CYCLE));
    allStorylineTrackerRows.push(...buildStorylineTrackerRows(parsed, CYCLE));
  }

  console.log(`\n--- Summary ---`);
  console.log(`  Citizens: ${totalCitizens} existing + ${totalNewCitizens} new`);
  console.log(`  Businesses: ${totalBusinesses}`);
  console.log(`  Storylines: ${totalStorylines}`);
  console.log(`  Quotes: ${totalQuotes}`);
  console.log(`  Rows for Citizen_Usage_Intake: ${allCitizenRows.length}`);
  console.log(`  Rows for Storyline_Intake: ${allStorylineIntakeRows.length}`);
  console.log(`  Rows for Storyline_Tracker: ${allStorylineTrackerRows.length}`);

  // Save quote log locally (for enrichCitizenProfiles.js to process)
  const quoteLog = buildQuoteLog(allParsed, CYCLE);
  if (quoteLog.length > 0) {
    const quotePath = path.join(ROOT, 'output', `quotes_c${CYCLE}.json`);
    fs.writeFileSync(quotePath, JSON.stringify(quoteLog, null, 2));
    console.log(`  Quote log: ${quotePath} (${quoteLog.length} quotes)`);
  }

  if (!APPLY) {
    console.log(`\nDry run — use --apply to write to sheets.`);

    // Show sample rows
    if (allCitizenRows.length > 0) {
      console.log('\nSample Citizen_Usage_Intake rows:');
      for (const row of allCitizenRows.slice(0, 3)) {
        console.log(`  ${row[0]} | ${row[1]} | ${row[2]} | ${row[3]}`);
      }
    }
    if (allStorylineIntakeRows.length > 0) {
      console.log('\nSample Storyline_Intake rows:');
      for (const row of allStorylineIntakeRows.slice(0, 3)) {
        console.log(`  ${row[0]} | ${row[1]} | ${row[2]} | ${row[3]}`);
      }
    }
    process.exit(0);
  }

  // Write to sheets
  console.log('\nWriting to sheets...');

  if (allCitizenRows.length > 0) {
    try {
      await sheets.appendRows('Citizen_Usage_Intake', allCitizenRows);
      console.log(`  Citizen_Usage_Intake: ${allCitizenRows.length} rows appended`);
    } catch (e) {
      console.error(`  ERROR writing Citizen_Usage_Intake: ${e.message}`);
    }
  }

  if (allStorylineIntakeRows.length > 0) {
    try {
      await sheets.appendRows('Storyline_Intake', allStorylineIntakeRows);
      console.log(`  Storyline_Intake: ${allStorylineIntakeRows.length} rows appended`);
    } catch (e) {
      console.error(`  ERROR writing Storyline_Intake: ${e.message}`);
    }
  }

  if (allStorylineTrackerRows.length > 0) {
    try {
      await sheets.appendRows('Storyline_Tracker', allStorylineTrackerRows);
      console.log(`  Storyline_Tracker: ${allStorylineTrackerRows.length} rows appended`);
    } catch (e) {
      console.error(`  ERROR writing Storyline_Tracker: ${e.message}`);
    }
  }

  console.log('\n=== Done ===\n');
}

main().catch(e => { console.error(e); process.exit(1); });
