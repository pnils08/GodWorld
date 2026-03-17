#!/usr/bin/env node
/**
 * extractExemplars.js — Phase 26.5: Example Generation from Grades
 *
 * Reads a graded edition and extracts A-grade articles as exemplars
 * for desk RULES.md reference. Only extracts from desks that scored A- or higher.
 *
 * Usage:
 *   node scripts/extractExemplars.js <edition-file> [cycle]
 *
 * Output:
 *   - output/grade-examples/{desk}_exemplar_c{XX}.md per qualifying desk
 *   - buildDeskFolders.js copies the latest exemplar into workspace as exemplar.md
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const DESK_HEADERS = {
  'CIVIC AFFAIRS': 'civic',
  'CIVIC': 'civic',
  'BUSINESS': 'business',
  'CULTURE': 'culture',
  'CULTURE / SEASONAL': 'culture',
  'CULTURE / SEASONAL -- OAKLAND': 'culture',
  'SPORTS': 'sports',
  'SPORTS -- OAKLAND': 'sports',
  'SKYLINE TRIBUNE -- CHICAGO BUREAU': 'chicago',
  'CHICAGO BUREAU': 'chicago',
  'CHICAGO': 'chicago',
  'LETTERS TO THE EDITOR': 'letters',
  'LETTERS': 'letters'
};

// Grades that qualify for exemplar extraction
const EXEMPLAR_THRESHOLD = ['A', 'A-'];

function extractSections(text) {
  const lines = text.split('\n');
  const sections = [];
  let currentDesk = null;
  let sectionStart = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    for (const [header, desk] of Object.entries(DESK_HEADERS)) {
      if (line === header || line.startsWith(header)) {
        // Close previous section
        if (currentDesk && sectionStart !== null) {
          sections.push({
            desk: currentDesk,
            startLine: sectionStart,
            endLine: i - 1,
            text: lines.slice(sectionStart, i).join('\n')
          });
        }
        currentDesk = desk;
        sectionStart = i;
        break;
      }
    }
  }

  // Close last section
  if (currentDesk && sectionStart !== null) {
    // Find the end — look for Names Index or end of file
    let endLine = lines.length;
    for (let i = sectionStart; i < lines.length; i++) {
      if (lines[i].trim().startsWith('CIVIC OFFICIALS QUOTED') ||
          lines[i].trim().startsWith('NAMES INDEX') ||
          lines[i].trim().startsWith('SPORTS FIGURES:')) {
        endLine = i;
        break;
      }
    }
    sections.push({
      desk: currentDesk,
      startLine: sectionStart,
      endLine,
      text: lines.slice(sectionStart, endLine).join('\n')
    });
  }

  return sections;
}

function extractArticles(sectionText, desk) {
  const lines = sectionText.split('\n');
  const articles = [];
  let currentArticle = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect bylines
    const bylineMatch = line.match(/^By\s+(.+?)\s*\|/);
    if (bylineMatch) {
      if (currentArticle) {
        currentArticle.text = lines.slice(currentArticle.startIdx, i - 1).join('\n').trim();
        articles.push(currentArticle);
      }
      // Look back for title
      let title = '';
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const prev = lines[j].trim();
        if (prev.startsWith('**') && prev.endsWith('**')) {
          title = prev.replace(/\*\*/g, '');
          break;
        }
      }
      currentArticle = {
        reporter: bylineMatch[1].trim(),
        title,
        desk,
        startIdx: i - (title ? 2 : 0) // Include title line
      };
    }

    // Detect letter signatures for letters desk
    if (desk === 'letters') {
      const letterMatch = line.match(/^--\s+(.+?),\s*\d+,\s*.+$/);
      if (letterMatch) {
        if (currentArticle) {
          currentArticle.text = lines.slice(currentArticle.startIdx, i + 1).join('\n').trim();
          articles.push(currentArticle);
          currentArticle = null;
        }
      }
    }
  }

  if (currentArticle) {
    currentArticle.text = lines.slice(currentArticle.startIdx).join('\n').trim();
    articles.push(currentArticle);
  }

  return articles;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: node scripts/extractExemplars.js <edition-file> [cycle]');
    process.exit(1);
  }

  const editionFile = path.resolve(args[0]);
  if (!fs.existsSync(editionFile)) {
    console.error(`Edition file not found: ${editionFile}`);
    process.exit(1);
  }

  let cycle = args[1] ? parseInt(args[1]) : null;
  if (!cycle) {
    const cycleMatch = path.basename(editionFile).match(/(\d+)/);
    cycle = cycleMatch ? parseInt(cycleMatch[1]) : null;
  }

  // Load grades for this cycle
  const gradesPath = path.join(ROOT, 'output', 'grades', `grades_c${cycle}.json`);
  if (!fs.existsSync(gradesPath)) {
    console.error(`No grades found for cycle ${cycle}. Run gradeEdition.js first.`);
    process.exit(1);
  }

  const grades = JSON.parse(fs.readFileSync(gradesPath, 'utf-8'));
  const editionText = fs.readFileSync(editionFile, 'utf-8');
  const sections = extractSections(editionText);

  const examplesDir = path.join(ROOT, 'output', 'grade-examples');
  if (!fs.existsSync(examplesDir)) fs.mkdirSync(examplesDir, { recursive: true });

  console.log(`\nExtracting exemplars from Edition ${cycle}`);
  let extracted = 0;

  for (const section of sections) {
    const deskGrade = grades.desks && grades.desks[section.desk];
    if (!deskGrade || !EXEMPLAR_THRESHOLD.includes(deskGrade.grade)) {
      console.log(`  ${section.desk}: ${deskGrade?.grade || 'N/A'} — skipped (below threshold)`);
      continue;
    }

    const articles = extractArticles(section.text, section.desk);
    if (articles.length === 0) {
      console.log(`  ${section.desk}: ${deskGrade.grade} — no articles found`);
      continue;
    }

    // Pick the longest article as the exemplar (more depth = better example)
    const best = articles.reduce((a, b) =>
      (a.text || '').length > (b.text || '').length ? a : b
    );

    let md = `# ${section.desk.charAt(0).toUpperCase() + section.desk.slice(1)} Desk Exemplar — Edition ${cycle}\n\n`;
    md += `**Grade:** ${deskGrade.grade} | **Reporter:** ${best.reporter}\n`;
    md += `**Why this is an exemplar:** This article scored ${deskGrade.grade} with ${deskGrade.criticalErrors} critical errors and ${deskGrade.warnings} warnings. `;
    md += `It demonstrates what good ${section.desk} desk output looks like.\n\n`;
    md += `---\n\n`;
    md += best.text;
    md += `\n\n---\n\n`;
    md += `**What makes this work:**\n`;
    md += `- Grounded in engine data (specific numbers, dates, names from the simulation)\n`;
    md += `- Citizens quoted with full attribution (name, age, neighborhood, role)\n`;
    md += `- No engine language ("cycles", "simulation", "political actors")\n`;
    md += `- Voice matches the reporter's established tone\n`;
    md += `- Advances the story forward from previous editions\n`;

    const outPath = path.join(examplesDir, `${section.desk}_exemplar_c${cycle}.md`);
    fs.writeFileSync(outPath, md);
    console.log(`  ${section.desk}: ${deskGrade.grade} — extracted "${best.title || best.reporter}" (${(best.text || '').length} chars)`);
    extracted++;
  }

  console.log(`\n  Extracted ${extracted} exemplars to ${examplesDir}/`);
}

main();
