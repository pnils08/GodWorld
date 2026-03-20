#!/usr/bin/env node
/**
 * gradeEdition.js — Phase 26: Agent Grading System
 *
 * Reads existing audit data (errata, Mara grade, edition text) and produces
 * per-desk, per-reporter grades stored in output/grades/grades_c{XX}.json.
 *
 * Usage:
 *   node scripts/gradeEdition.js <edition-file> [cycle]
 *   node scripts/gradeEdition.js editions/cycle_pulse_edition_87.txt 87
 *
 * Inputs:
 *   - Edition text file (required)
 *   - output/errata.jsonl (error log)
 *   - output/mara_directive_c{XX}*.txt (Mara's grade)
 *   - output/latest_edition_brief.md (edition summary)
 *
 * Output:
 *   - output/grades/grades_c{XX}.json
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// --- Grade scale ---
const GRADE_SCALE = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
const GRADE_VALUES = {};
GRADE_SCALE.forEach((g, i) => { GRADE_VALUES[g] = 10 - i; });

function gradeFromValue(val) {
  const clamped = Math.max(1, Math.min(10, Math.round(val)));
  return GRADE_SCALE[10 - clamped] || 'C';
}

// --- Desk section detection ---
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
  'LETTERS': 'letters',
  'OPINION': 'sports', // P Slayer opinion lives under sports
  'PODCAST': 'podcast'
};

// --- Reporter-to-desk mapping ---
const REPORTER_DESK = {
  'Carmen Delaine': 'civic',
  'Luis Navarro': 'civic',
  'Trevor Shimizu': 'civic',
  'Rachel Torres': 'civic',
  'Lila Mezran': 'civic',
  'Jordan Velez': 'business',
  'Maria Keen': 'culture',
  'P Slayer': 'sports',
  'Anthony': 'sports',
  'Hal Richmond': 'sports',
  'Tanya Cruz': 'sports',
  'Simon Leary': 'sports',
  'DJ Hartley': 'sports',
  'Elliot Marbury': 'sports',
  'Selena Grant': 'chicago',
  'Talia Finch': 'chicago',
  'Jax Caldera': 'freelance'
};

// --- Parse edition text ---
function parseEdition(text) {
  const lines = text.split('\n');
  const sections = [];
  let currentDesk = null;
  let currentArticle = null;
  const articles = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect desk headers (lines between ---- markers)
    for (const [header, desk] of Object.entries(DESK_HEADERS)) {
      if (line === header || line.startsWith(header)) {
        currentDesk = desk;
        break;
      }
    }

    // Detect letter signatures: "-- Name, Age, Neighborhood"
    const letterMatch = line.match(/^--\s+(.+?),\s*\d+,\s*.+$/);
    if (letterMatch && currentDesk === 'letters') {
      if (currentArticle) {
        currentArticle.lineCount = i - currentArticle.startLine;
        articles.push(currentArticle);
      }
      currentArticle = {
        reporter: 'Letters Desk',
        desk: 'letters',
        startLine: i,
        lineCount: 0,
        title: `Letter from ${letterMatch[1].trim()}`
      };
    }

    // Detect bylines: "By Reporter Name | Bay Tribune ..."
    const bylineMatch = line.match(/^By\s+(.+?)\s*\|/);
    if (bylineMatch && currentDesk) {
      const reporter = bylineMatch[1].trim();
      if (currentArticle) {
        currentArticle.lineCount = i - currentArticle.startLine;
        articles.push(currentArticle);
      }
      currentArticle = {
        reporter,
        desk: REPORTER_DESK[reporter] || currentDesk,
        startLine: i,
        lineCount: 0,
        title: ''
      };
      // Look back for title (bold line before byline)
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const prev = lines[j].trim();
        if (prev.startsWith('**') && prev.endsWith('**')) {
          currentArticle.title = prev.replace(/\*\*/g, '');
          break;
        }
      }
    }
  }
  if (currentArticle) {
    currentArticle.lineCount = lines.length - currentArticle.startLine;
    articles.push(currentArticle);
  }

  return articles;
}

// --- Parse errata for this cycle ---
function parseErrata(cycle) {
  const errataPath = path.join(ROOT, 'output', 'errata.jsonl');
  if (!fs.existsSync(errataPath)) return [];

  return fs.readFileSync(errataPath, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(e => e && e.edition === cycle);
}

// --- Parse Mara grade ---
function parseMaraGrade(cycle) {
  // Check for directive files
  const patterns = [
    `mara_directive_c${cycle}.txt`,
    `mara_directive_c${cycle}_REJECTED.txt`
  ];

  for (const pat of patterns) {
    const filePath = path.join(ROOT, 'output', pat);
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, 'utf-8');
      // Look for grade patterns: "Grade: B", "A-", etc.
      const gradeMatch = text.match(/(?:Grade|grade|GRADE)[:\s]+([A-F][+-]?)/);
      if (gradeMatch) return gradeMatch[1];
    }
  }

  // Check edition brief
  const briefPath = path.join(ROOT, 'output', 'latest_edition_brief.md');
  if (fs.existsSync(briefPath)) {
    const text = fs.readFileSync(briefPath, 'utf-8');
    const gradeMatch = text.match(/Grade:\s*([A-F][+-]?)/);
    if (gradeMatch) return gradeMatch[1];
  }

  return null;
}

// --- Load previous grades for rolling average ---
function loadPreviousGrades(currentCycle, count) {
  const gradesDir = path.join(ROOT, 'output', 'grades');
  if (!fs.existsSync(gradesDir)) return [];

  const files = fs.readdirSync(gradesDir)
    .filter(f => f.match(/^grades_c\d+\.json$/) && !f.includes(`c${currentCycle}`))
    .sort()
    .slice(-count);

  return files.map(f => {
    try { return JSON.parse(fs.readFileSync(path.join(gradesDir, f), 'utf-8')); }
    catch { return null; }
  }).filter(Boolean);
}

// --- Compute rolling average ---
function rollingAverage(currentGrade, previousGrades, deskOrReporter, type) {
  const grades = [];

  for (const prev of previousGrades) {
    const source = type === 'desk' ? prev.desks : prev.reporters;
    if (source && source[deskOrReporter] && source[deskOrReporter].grade) {
      grades.push(GRADE_VALUES[source[deskOrReporter].grade] || 5);
    }
  }

  grades.push(GRADE_VALUES[currentGrade] || 5);

  const avg = grades.reduce((a, b) => a + b, 0) / grades.length;
  return {
    rolling: gradeFromValue(avg),
    trend: grades.length < 2 ? 'new' :
      grades[grades.length - 1] > grades[grades.length - 2] ? 'improving' :
      grades[grades.length - 1] < grades[grades.length - 2] ? 'declining' : 'stable',
    editions: grades.length
  };
}

// --- Main grading logic ---
function gradeEdition(editionFile, cycle) {
  const editionText = fs.readFileSync(editionFile, 'utf-8');
  const articles = parseEdition(editionText);
  const errata = parseErrata(cycle);
  const maraGrade = parseMaraGrade(cycle);
  const previousGrades = loadPreviousGrades(cycle, 4);

  console.log(`\nGrading Edition ${cycle}`);
  console.log(`  Articles found: ${articles.length}`);
  console.log(`  Errata entries: ${errata.length}`);
  console.log(`  Mara grade: ${maraGrade || 'not found'}`);
  console.log(`  Previous grade files: ${previousGrades.length}`);

  // --- Grade per desk ---
  const desks = {};
  const DESK_NAMES = ['civic', 'business', 'culture', 'sports', 'chicago', 'letters'];

  for (const desk of DESK_NAMES) {
    const deskArticles = articles.filter(a => a.desk === desk);
    const deskErrata = errata.filter(e => e.desk === desk || e.desk === 'cross-desk');
    const criticals = deskErrata.filter(e => e.severity === 'CRITICAL').length;
    const warnings = deskErrata.filter(e => e.severity === 'WARNING').length;

    // Start at A (10), deduct for errors
    let score = 10;
    score -= criticals * 1.5;  // Each CRITICAL drops ~1.5 grade steps
    score -= warnings * 0.5;   // Each WARNING drops ~0.5 grade steps

    // Bonus for article count (reward coverage breadth)
    if (deskArticles.length >= 3) score += 0.5;
    if (deskArticles.length >= 4) score += 0.5;

    // Penalty for zero articles
    if (deskArticles.length === 0) score -= 2;

    const grade = gradeFromValue(score);
    const rolling = rollingAverage(grade, previousGrades, desk, 'desk');

    const justParts = [];
    if (deskArticles.length > 0) justParts.push(`${deskArticles.length} articles`);
    if (criticals > 0) justParts.push(`${criticals} CRITICAL errors`);
    if (warnings > 0) justParts.push(`${warnings} warnings`);
    if (deskErrata.length === 0) justParts.push('no errata');
    const reporters = [...new Set(deskArticles.map(a => a.reporter))];
    if (reporters.length > 0) justParts.push(`reporters: ${reporters.join(', ')}`);

    desks[desk] = {
      grade,
      score: Math.round(score * 10) / 10,
      articles: deskArticles.length,
      criticalErrors: criticals,
      warnings,
      reporters,
      justification: justParts.join('. '),
      rolling: rolling.rolling,
      trend: rolling.trend
    };
  }

  // --- Grade per reporter ---
  const reporters = {};
  const reporterNames = [...new Set(articles.map(a => a.reporter))];

  for (const name of reporterNames) {
    const reporterArticles = articles.filter(a => a.reporter === name);
    const reporterErrata = errata.filter(e => e.reporter === name);
    const criticals = reporterErrata.filter(e => e.severity === 'CRITICAL').length;
    const warnings = reporterErrata.filter(e => e.severity === 'WARNING').length;

    let score = 10;
    score -= criticals * 2;    // Reporter-level CRITICAL is harsher
    score -= warnings * 0.75;

    // Bonus for multiple articles
    if (reporterArticles.length >= 2) score += 0.5;

    const grade = gradeFromValue(score);
    const rolling = rollingAverage(grade, previousGrades, name, 'reporter');

    const justParts = [];
    justParts.push(`${reporterArticles.length} article(s)`);
    if (criticals > 0) justParts.push(`${criticals} CRITICAL`);
    if (warnings > 0) justParts.push(`${warnings} WARNING`);
    if (reporterErrata.length === 0) justParts.push('clean');

    reporters[name] = {
      desk: REPORTER_DESK[name] || reporterArticles[0]?.desk || 'unknown',
      grade,
      score: Math.round(score * 10) / 10,
      articles: reporterArticles.length,
      criticalErrors: criticals,
      warnings,
      justification: justParts.join('. '),
      rolling: rolling.rolling,
      trend: rolling.trend
    };
  }

  // --- Overall grade ---
  // Anchor to Mara's grade if available, otherwise average desk grades
  let overallGrade;
  if (maraGrade) {
    overallGrade = maraGrade;
  } else {
    const deskScores = Object.values(desks).map(d => d.score);
    const avgScore = deskScores.reduce((a, b) => a + b, 0) / deskScores.length;
    overallGrade = gradeFromValue(avgScore);
  }

  const result = {
    cycle,
    date: new Date().toISOString().split('T')[0],
    editionFile: path.basename(editionFile),
    overallGrade,
    maraGrade: maraGrade || 'not available',
    totalArticles: articles.length,
    totalErrata: errata.length,
    desks,
    reporters
  };

  // --- Write output ---
  const gradesDir = path.join(ROOT, 'output', 'grades');
  if (!fs.existsSync(gradesDir)) fs.mkdirSync(gradesDir, { recursive: true });

  const outPath = path.join(gradesDir, `grades_c${cycle}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\n  Written: ${outPath}`);

  // --- Print summary ---
  console.log(`\n  === Edition ${cycle} Grade Report ===`);
  console.log(`  Overall: ${overallGrade} (Mara: ${maraGrade || 'n/a'})`);
  console.log(`  Articles: ${articles.length} | Errata: ${errata.length}`);
  console.log('');
  console.log('  Desk Grades:');
  for (const [desk, data] of Object.entries(desks)) {
    console.log(`    ${desk.padEnd(10)} ${data.grade.padEnd(3)} (${data.articles} articles, ${data.criticalErrors}C/${data.warnings}W)`);
  }
  console.log('');
  console.log('  Reporter Grades:');
  for (const [name, data] of Object.entries(reporters)) {
    console.log(`    ${name.padEnd(20)} ${data.grade.padEnd(3)} [${data.desk}] (${data.articles} articles, ${data.criticalErrors}C/${data.warnings}W)`);
  }

  // --- Auto-append to edition_scores.json ---
  // Keeps dashboard Newsroom tab score history current
  try {
    const scoresPath = path.join(ROOT, 'output', 'edition_scores.json');
    const scoresData = fs.existsSync(scoresPath)
      ? JSON.parse(fs.readFileSync(scoresPath, 'utf-8'))
      : { _description: 'Edition score history', scores: [] };

    // Don't duplicate — check if this cycle is already scored
    const alreadyScored = scoresData.scores.some(s => s.edition === cycle);
    if (!alreadyScored) {
      scoresData.scores.push({
        edition: cycle,
        cycle: cycle,
        date: new Date().toISOString().split('T')[0],
        grade: overallGrade,
        maraGrade: maraGrade || null,
        criticals: errata.filter(e => e.severity === 'critical').length,
        warnings: errata.filter(e => e.severity === 'warning').length,
        notes: errata.filter(e => e.severity === 'note').length,
        deskErrors: Object.fromEntries(
          Object.entries(desks).map(([desk, data]) => [desk, data.criticalErrors > 0 ? [`${data.criticalErrors} critical errors`] : []])
        ),
        noteText: `Auto-graded by gradeEdition.js. ${articles.length} articles, ${errata.length} errata entries.`,
      });
      fs.writeFileSync(scoresPath, JSON.stringify(scoresData, null, 2));
      console.log(`\n  Score appended to edition_scores.json (E${cycle}: ${overallGrade})`);
    } else {
      console.log(`\n  Score already exists for E${cycle} — skipped append`);
    }
  } catch (err) {
    console.warn('  edition_scores.json append failed: ' + err.message);
  }

  return result;
}

// --- CLI ---
const args = process.argv.slice(2);
if (args.length < 1) {
  console.log('Usage: node scripts/gradeEdition.js <edition-file> [cycle]');
  console.log('Example: node scripts/gradeEdition.js editions/cycle_pulse_edition_87.txt 87');
  process.exit(1);
}

const editionFile = path.resolve(args[0]);
if (!fs.existsSync(editionFile)) {
  console.error(`Edition file not found: ${editionFile}`);
  process.exit(1);
}

// Derive cycle from filename if not provided
let cycle = args[1] ? parseInt(args[1]) : null;
if (!cycle) {
  const cycleMatch = path.basename(editionFile).match(/(\d+)/);
  cycle = cycleMatch ? parseInt(cycleMatch[1]) : null;
}
if (!cycle) {
  console.error('Could not determine cycle number. Provide as second argument.');
  process.exit(1);
}

gradeEdition(editionFile, cycle);
