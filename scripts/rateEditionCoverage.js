#!/usr/bin/env node
/**
 * rateEditionCoverage.js — Auto-rate edition coverage for engine feedback
 *
 * Reads an edition text file, parses the structured sections at the bottom
 * (STORYLINES UPDATED, CITIZEN USAGE LOG, ARTICLE TABLE), and writes
 * rating rows to the Edition_Coverage_Ratings sheet.
 *
 * Usage:
 *   node scripts/rateEditionCoverage.js editions/cycle_pulse_edition_90.txt --dry-run
 *   node scripts/rateEditionCoverage.js editions/cycle_pulse_edition_90.txt --apply
 *
 * Dry-run shows what would be written. Apply writes to the sheet.
 */

const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const args = process.argv.slice(2);
const filePath = args.find(a => !a.startsWith('--'));
const dryRun = !args.includes('--apply');

if (!filePath) {
  console.log('Usage: node scripts/rateEditionCoverage.js <edition-file> [--dry-run|--apply]');
  console.log('  --dry-run  (default) Show what would be written');
  console.log('  --apply    Write to Edition_Coverage_Ratings sheet');
  process.exit(1);
}

const text = fs.readFileSync(path.resolve(filePath), 'utf8');

// ═══════════════════════════════════════════════════════════════════════════
// DETECT CYCLE
// ═══════════════════════════════════════════════════════════════════════════

let cycle = 0;
const cycleMatch = text.match(/EDITION\s+(\d+)/i) || filePath.match(/(\d+)/);
if (cycleMatch) cycle = parseInt(cycleMatch[1], 10);

if (!cycle) {
  console.error('Could not detect cycle number from file');
  process.exit(1);
}

console.log('Edition: C' + cycle);
console.log('Mode: ' + (dryRun ? 'DRY-RUN' : 'APPLY'));
console.log('---');

// ═══════════════════════════════════════════════════════════════════════════
// PARSE SECTIONS
// ═══════════════════════════════════════════════════════════════════════════

const lines = text.split('\n');

function findSection(header) {
  const pattern = new RegExp(header, 'i');
  let start = -1;
  let end = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      start = i + 1;
    } else if (start > 0 && /^={5,}|^-{5,}|^#{1,3}\s/.test(lines[i].trim())) {
      if (i > start + 1) {
        end = i;
        break;
      }
    }
  }

  if (start < 0) return [];
  return lines.slice(start, end).filter(l => l.trim());
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSE STORYLINES UPDATED
// ═══════════════════════════════════════════════════════════════════════════

const storylines = findSection('STORYLINES UPDATED');
const initiativeRatings = [];

// Transition magnitude mapping
const transitionRating = {
  'deployed': 5, 'active': 4, 'passed': 5, 'approved': 5, 'completed': 5,
  'vote scheduled': 3, 'continuing': 2, 'new': 3,
  'stalled': -3, 'blocked': -4, 'failed': -5, 'delayed': -3, 'vetoed': -4
};

for (const line of storylines) {
  // Match patterns like "OARI Implementation: ACTIVE → DEPLOYED"
  // or "- OARI Implementation: ACTIVE → DEPLOYED. Details here."
  const match = line.match(/^-?\s*(.+?):\s*(.+?)\s*(?:→|->)+\s*(.+?)[\.\s]/i);
  if (!match) {
    // Also try "Name: STATUS. Details"
    const simpleMatch = line.match(/^-?\s*(.+?):\s*(NEW|CONTINUING|ACTIVE|STALLED|BLOCKED)[\.\s]/i);
    if (simpleMatch) {
      const name = simpleMatch[1].trim();
      const status = simpleMatch[2].trim().toLowerCase();
      const rating = Math.abs(transitionRating[status] || 2);
      const tone = (transitionRating[status] || 0) < 0 ? 'negative' : 'positive';

      initiativeRatings.push({
        cycle, signalType: 'INITIATIVE', target: name,
        rating, tone, neighborhoods: '', direction: tone === 'positive' ? 'uplift' : 'pressure',
        notes: line.trim(), source: 'automated'
      });
    }
    continue;
  }

  const name = match[1].trim();
  const fromStatus = match[2].trim().toLowerCase();
  const toStatus = match[3].trim().toLowerCase().replace(/[^a-z\s-]/g, '');

  // Rating from destination status
  let rating = Math.abs(transitionRating[toStatus] || 2);
  let tone = 'positive';
  let direction = 'uplift';

  // Negative transitions
  if ((transitionRating[toStatus] || 0) < 0) {
    tone = 'negative';
    direction = 'pressure';
  }

  // Big transitions get boosted
  if (fromStatus.includes('stalled') && !toStatus.includes('stalled')) {
    rating = Math.min(5, rating + 1); // Breaking a stall = bigger story
  }

  // Extract neighborhoods from the rest of the line
  const hoodMatch = line.match(/D(\d)[,/]?\s*D?(\d)?[,/]?\s*D?(\d)?/);
  let neighborhoods = '';
  if (hoodMatch) {
    const districts = [hoodMatch[1], hoodMatch[2], hoodMatch[3]].filter(Boolean);
    neighborhoods = districts.map(d => 'D' + d).join(',');
  }

  initiativeRatings.push({
    cycle, signalType: 'INITIATIVE', target: name,
    rating, tone, neighborhoods, direction,
    notes: line.trim(), source: 'automated'
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSE CITIZEN USAGE LOG
// ═══════════════════════════════════════════════════════════════════════════

const citizenSection = findSection('CITIZEN USAGE LOG');
const citizenRatings = [];

for (const line of citizenSection) {
  // Match "- Name (POP-XXX) — Neighborhood, occupation. Appears in: Section, Section, Section."
  // or "- Name, age, Neighborhood, occupation. Section."
  const appearsMatch = line.match(/appears?\s+in:\s*(.+)/i);
  if (!appearsMatch) continue;

  const sections = appearsMatch[1].split(/[,.]/).map(s => s.trim()).filter(Boolean);
  if (sections.length < 2) continue; // Only rate citizens in 2+ sections

  // Extract name — everything between "- " and first " (" or " —"
  const nameMatch = line.match(/^-\s*(.+?)(?:\s*\(|\s*—|\s*,)/);
  if (!nameMatch) continue;
  const name = nameMatch[1].trim();

  // Extract neighborhood
  const hoodMatch = line.match(/—\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
  const neighborhood = hoodMatch ? hoodMatch[1].trim() : '';

  const rating = Math.min(5, sections.length + 1); // 2 sections = 3, 3 sections = 4, 4+ = 5

  citizenRatings.push({
    cycle, signalType: 'CITIZEN_VISIBILITY', target: name,
    rating, tone: 'positive', neighborhoods: neighborhood,
    direction: 'uplift',
    notes: sections.length + ' sections: ' + sections.join(', '),
    source: 'automated'
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSE ARTICLE TABLE
// ═══════════════════════════════════════════════════════════════════════════

const articleSection = findSection('ARTICLE TABLE');
const domainCounts = {};

// Map section names to domains
const sectionToDomain = {
  'front page': 'CIVIC', 'civic affairs': 'CIVIC', 'civic': 'CIVIC',
  'business': 'BUSINESS', 'culture': 'CULTURE', 'culture & community': 'CULTURE',
  'sports': 'SPORTS', 'chicago': 'CHICAGO',
  'letters': 'LETTERS', 'editor': 'LETTERS'
};

for (const line of articleSection) {
  // Match table rows: "| 1 | Front Page | Headline | Reporter | Citizens |"
  const cols = line.split('|').map(c => c.trim()).filter(Boolean);
  if (cols.length < 3) continue;
  if (cols[0] === '#' || cols[0] === '---') continue; // header/separator

  const section = (cols[1] || '').toLowerCase();
  for (const [key, domain] of Object.entries(sectionToDomain)) {
    if (section.includes(key)) {
      domainCounts[domain] = (domainCounts[domain] || 0) + 1;
      break;
    }
  }
}

const domainRatings = [];
const totalArticles = Object.values(domainCounts).reduce((a, b) => a + b, 0);

for (const [domain, count] of Object.entries(domainCounts)) {
  if (domain === 'CHICAGO') continue; // phased out

  const pct = totalArticles > 0 ? count / totalArticles : 0;
  let rating = 1;
  if (pct >= 0.3) rating = 5;
  else if (pct >= 0.2) rating = 4;
  else if (pct >= 0.15) rating = 3;
  else if (pct >= 0.1) rating = 2;

  domainRatings.push({
    cycle, signalType: 'DOMAIN_TONE', target: domain,
    rating, tone: 'positive', neighborhoods: '',
    direction: 'neutral',
    notes: count + ' of ' + totalArticles + ' articles (' + Math.round(pct * 100) + '%)',
    source: 'automated'
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// COMBINE AND DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

const allRatings = [...initiativeRatings, ...citizenRatings, ...domainRatings];

console.log('RATINGS GENERATED: ' + allRatings.length);
console.log('  Initiatives: ' + initiativeRatings.length);
console.log('  Citizens: ' + citizenRatings.length);
console.log('  Domains: ' + domainRatings.length);
console.log('');

for (const r of allRatings) {
  console.log('  [' + r.signalType + '] ' + r.target + ' → r' + r.rating + ' ' + r.tone +
    (r.neighborhoods ? ' (' + r.neighborhoods + ')' : '') +
    ' — ' + r.notes);
}

// ═══════════════════════════════════════════════════════════════════════════
// WRITE TO SHEET
// ═══════════════════════════════════════════════════════════════════════════

if (dryRun) {
  console.log('\n--- DRY RUN — nothing written. Use --apply to write to sheet.');
  process.exit(0);
}

if (allRatings.length === 0) {
  console.log('\nNo ratings to write.');
  process.exit(0);
}

(async () => {
  try {
    const rows = allRatings.map(r => [
      r.cycle, r.signalType, r.target, r.rating, r.tone,
      r.neighborhoods, r.direction, r.notes, r.source, 'FALSE'
    ]);

    const client = await sheets.getClient();
    const spreadsheetId = process.env.GODWORLD_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error('GODWORLD_SHEET_ID not set in environment');
    }

    await client.spreadsheets.values.append({
      spreadsheetId,
      range: 'Edition_Coverage_Ratings!A2',
      valueInputOption: 'RAW',
      resource: { values: rows }
    });

    console.log('\nWritten ' + rows.length + ' rows to Edition_Coverage_Ratings');
  } catch (e) {
    console.error('Failed to write:', e.message);
    process.exit(1);
  }
})();
