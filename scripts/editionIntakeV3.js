#!/usr/bin/env node
/**
 * editionIntake v3.0 — Parse published editions and write canon back to sheets
 *
 * Reads the structured intake sections at the bottom of every edition
 * (CITIZEN USAGE LOG, STORYLINES UPDATED, CONTINUITY NOTES) and writes
 * to the sheets that feed the engine and desk packet builders.
 *
 * Usage:
 *   node -r dotenv/config scripts/editionIntakeV3.js <file> [cycle]
 *   node -r dotenv/config scripts/editionIntakeV3.js --dry-run <file> [cycle]
 *   node -r dotenv/config scripts/editionIntakeV3.js --dump <file>
 *
 * Modes:
 *   --dry-run   Show what would be written, write nothing
 *   --dump      Print raw extracted sections and exit (debug/manual fallback)
 *   (default)   Write to sheets
 */

const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const DRY_RUN = process.argv.includes('--dry-run');
const DUMP = process.argv.includes('--dump');
const args = process.argv.filter(a => !a.startsWith('--'));
const filePath = args[2];

if (!filePath) {
  console.log('Usage: node -r dotenv/config scripts/editionIntakeV3.js [--dry-run|--dump] <file> [cycle]');
  process.exit(1);
}

const fullPath = path.resolve(filePath);
if (!fs.existsSync(fullPath)) {
  console.error('File not found:', fullPath);
  process.exit(1);
}

const text = fs.readFileSync(fullPath, 'utf-8');
const fileName = path.basename(fullPath);

// ─── CYCLE DETECTION ─────────────────────────────────────────────────────
// Try filename first, then content
function detectCycle() {
  // CLI argument
  const cliCycle = parseInt(args[3]);
  if (cliCycle) return cliCycle;

  // Filename: supplemental_*_c88.txt or cycle_pulse_edition_88.txt
  const cMatch = fileName.match(/_c(\d+)\./);
  if (cMatch) return parseInt(cMatch[1]);
  const eMatch = fileName.match(/edition_(\d+)\./);
  if (eMatch) return parseInt(eMatch[1]);

  // Content: "Cycle 88" or "Edition 88"
  const contentMatch = text.match(/(?:Cycle|Edition)\s+(\d+)/i);
  if (contentMatch) return parseInt(contentMatch[1]);

  // End marker: "END EDITION 88" or "END SUPPLEMENTAL EDITION"
  const endMatch = text.match(/END.*?(?:EDITION|Cycle)\s+(\d+)/i);
  if (endMatch) return parseInt(endMatch[1]);

  return null;
}

const CYCLE = detectCycle();
if (!CYCLE) {
  console.error('Could not detect cycle number. Pass as second argument.');
  process.exit(1);
}

const NEIGHBORHOODS = [
  'Downtown', 'Jack London', 'Rockridge', 'Temescal', 'Fruitvale',
  'Lake Merritt', 'West Oakland', 'Laurel', 'Chinatown', 'Grand Lake',
  'Old Oakland', 'Uptown', 'KONO', 'Brooklyn Basin', 'Piedmont Ave',
  'East Oakland', 'Montclair', 'Adams Point', 'Bridgeport', 'Dimond',
  'Cleveland Heights', 'Eastlake', 'Piedmont Avenue', 'Jingletown'
];

// ─── LINE SCANNER ────────────────────────────────────────────────────────
// Find ARTICLE TABLE, then classify every line below it by category header

function scanIntakeSections() {
  const lines = text.split('\n');

  // Find the start of intake zone
  let intakeStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/ARTICLE TABLE/i.test(lines[i])) {
      intakeStart = i;
      break;
    }
  }

  if (intakeStart === -1) {
    console.warn('WARNING: No ARTICLE TABLE found. Scanning entire file.');
    intakeStart = 0;
  }

  const categories = {
    article_table: [],
    civic_officials: [],
    citizens_quoted: [],
    new_citizens: [],
    existing_new_role: [],
    letter_writers: [],
    sports_figures: [],
    journalists: [],
    cultural_entities: [],
    tech_references: [],
    storyline_canon: [],
    storyline_info: [],
    storyline_phase: [],
    continuity: [],
  };

  let current = 'article_table';

  for (let i = intakeStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Skip dividers
    if (/^[=#-]{4,}$/.test(line)) continue;
    // Skip END marker
    if (/^END\s+(SUPPLEMENTAL|EDITION)/i.test(line)) break;

    // Category header detection (case-insensitive)
    if (/^CIVIC OFFICIALS/i.test(line)) { current = 'civic_officials'; continue; }
    if (/^CITIZENS QUOTED.*EXISTING/i.test(line)) { current = 'citizens_quoted'; continue; }
    if (/^CITIZENS QUOTED/i.test(line)) { current = 'citizens_quoted'; continue; }
    if (/^NEW CITIZENS CREATED/i.test(line)) { current = 'new_citizens'; continue; }
    if (/^EXISTING CITIZEN/i.test(line)) { current = 'existing_new_role'; continue; }
    if (/^LETTER WRITERS/i.test(line)) { current = 'letter_writers'; continue; }
    if (/^SPORTS FIGURES/i.test(line)) { current = 'sports_figures'; continue; }
    if (/^SPORTS.*(?:A'S|BULLS|OAKLAND|CHICAGO)/i.test(line)) { current = 'sports_figures'; continue; }
    if (/^JOURNALISTS/i.test(line)) { current = 'journalists'; continue; }
    if (/^CULTURAL/i.test(line)) { current = 'cultural_entities'; continue; }
    if (/^TECH CANON/i.test(line)) { current = 'tech_references'; continue; }
    if (/^EXECUTIVE/i.test(line) || /^OWNER/i.test(line)) { current = 'civic_officials'; continue; }

    // Storyline sub-sections
    if (/^STORYLINES UPDATED/i.test(line)) { current = 'storyline_canon'; continue; }
    if (/^NEW CANON:/i.test(line)) { current = 'storyline_canon'; continue; }
    if (/^NEW INFORMATION:/i.test(line)) { current = 'storyline_info'; continue; }
    if (/^PHASE CHANGES:/i.test(line)) { current = 'storyline_phase'; continue; }

    // Continuity
    if (/^CONTINUITY NOTES/i.test(line)) { current = 'continuity'; continue; }
    if (/^Key quotes preserved/i.test(line)) { current = 'continuity'; continue; }
    if (/^New canon established/i.test(line)) { current = 'storyline_canon'; continue; }

    // Citizen Usage Log wrapper (enter citizens_quoted as default)
    if (/^CITIZEN USAGE LOG/i.test(line)) { current = 'citizens_quoted'; continue; }

    // Article table header row
    if (/^ARTICLE TABLE/i.test(line)) { current = 'article_table'; continue; }

    // Section labels we skip
    if (/^WHAT'S AHEAD/i.test(line)) { current = null; continue; }
    if (/^DO NOT:/i.test(line)) { current = 'continuity'; continue; }
    if (/^TONE:/i.test(line)) { current = 'continuity'; continue; }
    if (/^SCHOOLS|^TECH-EDUCATION|^CITIZEN GEOGRAPHY/i.test(line)) { current = 'continuity'; continue; }

    // Data lines (— or - prefixed, or | table rows)
    if (current && (/^[-—]\s+/.test(line) || /^\|/.test(line) || /^\d+\./.test(line))) {
      categories[current].push(line);
    }
  }

  return categories;
}

// ─── PARSERS ─────────────────────────────────────────────────────────────

function parseDashLine(line) {
  return line.replace(/^[-—]\s+/, '').trim();
}

function parseNeighborhood(text) {
  for (const n of NEIGHBORHOODS) {
    if (text.toLowerCase().includes(n.toLowerCase())) return n;
  }
  return '';
}

function parseCitizenLine(line, category) {
  const content = parseDashLine(line);
  if (!content || content === '(none)' || content === '(none in this supplemental)') return null;

  let name = '', age = '', neighborhood = '', occupation = '', context = '';

  // Extract parenthetical context from end
  const ctxMatch = content.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  let base = ctxMatch ? ctxMatch[1].trim() : content;
  if (ctxMatch) context = ctxMatch[2].trim();

  // Split on commas
  const parts = base.split(',').map(p => p.trim());
  name = parts[0] || '';

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    if (/^\d{1,3}$/.test(part)) {
      age = part;
    } else if (NEIGHBORHOODS.some(n => n.toLowerCase() === part.toLowerCase())) {
      neighborhood = part;
    } else {
      occupation = occupation ? occupation + ', ' + part : part;
    }
  }

  // Skip non-citizen entries
  if (!name || name.startsWith('(') || /^none/i.test(name)) return null;

  return {
    name,
    age,
    neighborhood,
    occupation,
    context,
    usageType: category === 'new_citizens' ? 'new_citizen' :
               category === 'letter_writers' ? 'letter_writer' :
               category === 'civic_officials' ? 'civic_official' :
               category === 'sports_figures' ? 'sports_figure' :
               category === 'journalists' ? 'journalist' :
               category === 'cultural_entities' ? 'cultural_entity' :
               category === 'existing_new_role' ? 'existing_new_role' :
               category === 'tech_references' ? 'tech_reference' :
               'quoted',
    isNew: category === 'new_citizens',
    cycle: CYCLE
  };
}

function parseStorylineLine(line, subtype) {
  const content = parseDashLine(line);
  if (!content) return null;

  // Bracket format: [type] description
  const bracketMatch = content.match(/^\[(\w+(?:-\w+)?)\]\s*(.+)$/);
  if (bracketMatch) {
    return {
      type: bracketMatch[1].toLowerCase(),
      description: bracketMatch[2].trim(),
      subtype,
      neighborhood: parseNeighborhood(content),
      cycle: CYCLE
    };
  }

  // Phase change format: Name: OLD → NEW
  if (subtype === 'phase' && content.includes('→')) {
    const arrowParts = content.split('→').map(p => p.trim());
    return {
      type: 'phase_change',
      description: content,
      oldPhase: arrowParts[0].replace(/^.*:\s*/, ''),
      newPhase: arrowParts[1],
      subtype,
      neighborhood: parseNeighborhood(content),
      cycle: CYCLE
    };
  }

  return {
    type: subtype === 'canon' ? 'new_canon' : subtype === 'info' ? 'new_info' : 'thread',
    description: content,
    subtype,
    neighborhood: parseNeighborhood(content),
    cycle: CYCLE
  };
}

function parseArticleTableRow(line) {
  if (!line.startsWith('|') || /^[\|\s-]+$/.test(line)) return null;
  const cells = line.split('|').map(c => c.trim()).filter(c => c);
  if (cells.length < 3) return null;
  // Skip header rows
  if (cells[0] === '#' || cells[0] === 'Reporter' || /^-+$/.test(cells[0])) return null;

  return {
    reporter: cells[1] || cells[0],
    desk: cells[2] || '',
    storyType: cells[3] || '',
    headline: cells[4] || cells[3] || '',
    cycle: CYCLE
  };
}

// ─── MAIN ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== editionIntake v3.0 — ${fileName} — Cycle ${CYCLE} ${DRY_RUN ? '(DRY RUN)' : DUMP ? '(DUMP)' : '(LIVE)'} ===\n`);

  const sections = scanIntakeSections();

  // ─── DUMP MODE ───────────────────────────────────────────────────────
  if (DUMP) {
    for (const [cat, lines] of Object.entries(sections)) {
      if (lines.length === 0) continue;
      console.log(`--- ${cat} (${lines.length} lines) ---`);
      lines.forEach(l => console.log('  ', l));
      console.log('');
    }
    return;
  }

  // ─── PARSE ───────────────────────────────────────────────────────────

  // Citizens
  const citizenCategories = ['civic_officials', 'citizens_quoted', 'new_citizens',
    'existing_new_role', 'letter_writers', 'sports_figures', 'journalists',
    'cultural_entities', 'tech_references'];

  const allCitizens = [];
  for (const cat of citizenCategories) {
    for (const line of sections[cat]) {
      const parsed = parseCitizenLine(line, cat);
      if (parsed) allCitizens.push(parsed);
    }
  }

  // Storylines
  const allStorylines = [];
  for (const line of sections.storyline_canon) {
    const parsed = parseStorylineLine(line, 'canon');
    if (parsed) allStorylines.push(parsed);
  }
  for (const line of sections.storyline_info) {
    const parsed = parseStorylineLine(line, 'info');
    if (parsed) allStorylines.push(parsed);
  }
  for (const line of sections.storyline_phase) {
    const parsed = parseStorylineLine(line, 'phase');
    if (parsed) allStorylines.push(parsed);
  }

  // Articles
  const allArticles = [];
  for (const line of sections.article_table) {
    const parsed = parseArticleTableRow(line);
    if (parsed) allArticles.push(parsed);
  }

  // ─── SUMMARY ─────────────────────────────────────────────────────────

  const newCitizens = allCitizens.filter(c => c.isNew);
  const existingCitizens = allCitizens.filter(c => !c.isNew);
  const civicOfficials = allCitizens.filter(c => c.usageType === 'civic_official');
  const sportsFigures = allCitizens.filter(c => c.usageType === 'sports_figure');
  const letterWriters = allCitizens.filter(c => c.usageType === 'letter_writer');
  const quoted = allCitizens.filter(c => c.usageType === 'quoted');

  console.log('PARSED:');
  console.log(`  Citizens: ${allCitizens.length} total`);
  console.log(`    New citizens: ${newCitizens.length}`);
  console.log(`    Existing quoted: ${quoted.length}`);
  console.log(`    Civic officials: ${civicOfficials.length}`);
  console.log(`    Sports figures: ${sportsFigures.length}`);
  console.log(`    Letter writers: ${letterWriters.length}`);
  console.log(`    Journalists: ${allCitizens.filter(c => c.usageType === 'journalist').length}`);
  console.log(`    Cultural: ${allCitizens.filter(c => c.usageType === 'cultural_entity').length}`);
  console.log(`    Tech refs: ${allCitizens.filter(c => c.usageType === 'tech_reference').length}`);
  console.log(`  Storylines: ${allStorylines.length} (${allStorylines.filter(s=>s.subtype==='canon').length} canon, ${allStorylines.filter(s=>s.subtype==='info').length} info, ${allStorylines.filter(s=>s.subtype==='phase').length} phase)`);
  console.log(`  Articles: ${allArticles.length}`);
  console.log('');

  // ─── CITIZEN DETAIL ──────────────────────────────────────────────────

  if (newCitizens.length > 0) {
    console.log('NEW CITIZENS:');
    newCitizens.forEach(c => {
      console.log(`  ${c.name}${c.age ? ', ' + c.age : ''}${c.neighborhood ? ', ' + c.neighborhood : ''}${c.occupation ? ', ' + c.occupation : ''}${c.context ? ' (' + c.context + ')' : ''}`);
    });
    console.log('');
  }

  if (quoted.length > 0) {
    console.log('EXISTING CITIZENS QUOTED:');
    quoted.forEach(c => {
      console.log(`  ${c.name}${c.neighborhood ? ', ' + c.neighborhood : ''}${c.context ? ' (' + c.context + ')' : ''}`);
    });
    console.log('');
  }

  if (allStorylines.length > 0) {
    console.log('STORYLINES:');
    allStorylines.forEach(s => {
      console.log(`  [${s.type}] ${s.description.substring(0, 100)}`);
    });
    console.log('');
  }

  if (DRY_RUN) {
    console.log('=== DRY RUN — nothing written ===\n');
    return;
  }

  // ─── WRITE TO SHEETS ────────────────────────────────────────────────

  let written = { citizens: 0, storylines: 0 };

  // Job 1: Citizens → Citizen_Usage_Intake
  if (allCitizens.length > 0) {
    // Engine reads by column position: 0=CitizenName, 1=UsageType, 2=Context, 3=Reporter, 4=Status
    // processCitizenUsageIntake_() checks col 4 for 'processed' — leave blank so engine picks it up
    // routeCitizenUsageToIntake_() calls splitName_() on CitizenName — must be just the name
    const rows = allCitizens.map(c => ({
      CitizenName: c.name,
      UsageType: c.usageType,
      Context: [c.age ? 'age ' + c.age : '', c.neighborhood, c.occupation, c.context].filter(Boolean).join(', '),
      Reporter: '',
      Status: ''
    }));

    try {
      await sheets.appendRows('Citizen_Usage_Intake', rows);
      written.citizens = rows.length;
      console.log(`WRITTEN: ${rows.length} citizens → Citizen_Usage_Intake`);
    } catch (e) {
      console.error('ERROR writing citizens:', e.message);
    }
  }

  // Job 2: Storylines → Storyline_Intake
  const canonStorylines = allStorylines.filter(s => s.subtype === 'canon');
  if (canonStorylines.length > 0) {
    const rows = canonStorylines.map(s => ({
      StorylineType: s.type,
      Description: s.description,
      Neighborhood: s.neighborhood,
      RelatedCitizens: '',
      Priority: '',
      Status: 'active'
    }));

    try {
      await sheets.appendRows('Storyline_Intake', rows);
      written.storylines = rows.length;
      console.log(`WRITTEN: ${rows.length} storylines → Storyline_Intake`);
    } catch (e) {
      console.error('ERROR writing storylines:', e.message);
    }
  }

  // Job 3: Phase changes → Initiative_Tracker (if any match)
  const phaseChanges = allStorylines.filter(s => s.subtype === 'phase' && s.type === 'phase_change');
  if (phaseChanges.length > 0) {
    console.log(`\nPHASE CHANGES (${phaseChanges.length}) — manual review recommended:`);
    phaseChanges.forEach(p => {
      console.log(`  ${p.description}`);
    });
  }

  console.log(`\n=== Done: ${written.citizens} citizens, ${written.storylines} storylines ===\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
