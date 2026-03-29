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
  'PODCAST': 'podcast',
  // Supplemental section mappings
  'EDUCATION': 'culture',
  'INFRASTRUCTURE': 'civic',
  'LIFESTYLE': 'culture',
  'SOCIAL / THREAD': 'freelance',
  'SOCIAL': 'freelance',
  'ACCOUNTABILITY': 'freelance',
  'FRONT PAGE': 'civic'
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
  'Jax Caldera': 'freelance',
  // Supplemental reporters
  'Sharon Okafor': 'culture',
  'Angela Reyes': 'culture',
  'Elliot Graye': 'culture',
  'MintConditionOakTown': 'freelance'
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

    // Stop parsing at intake/metadata sections
    if (line === 'ARTICLE TABLE' || line === 'ARTICLE TABLE — ENGINE INTAKE FORMAT' ||
        line === 'STORYLINES UPDATED' || line === 'CITIZEN USAGE LOG' ||
        line === 'CONTINUITY NOTES' || line.startsWith('## INTAKE')) {
      break;
    }

    // Detect desk headers — both ---- and ############ delimited
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
        currentArticle.text = lines.slice(currentArticle.startLine, i).join('\n');
        articles.push(currentArticle);
      }
      currentArticle = {
        reporter: 'Letters Desk',
        desk: 'letters',
        startLine: i,
        lineCount: 0,
        title: `Letter from ${letterMatch[1].trim()}`,
        text: ''
      };
    }

    // Detect bylines: "By Reporter Name | Bay Tribune ...", "By Reporter Name, Title", or "By Reporter Name" (standalone)
    const bylineMatch = line.match(/^By\s+(.+?)\s*[|,]/) || (line.match(/^By\s+(\w[\w\s]+)$/) && REPORTER_DESK[line.replace(/^By\s+/, '').trim()] ? line.match(/^By\s+(.+)$/) : null);
    if (bylineMatch && currentDesk) {
      const reporter = bylineMatch[1].trim();
      if (currentArticle) {
        currentArticle.lineCount = i - currentArticle.startLine;
        currentArticle.text = lines.slice(currentArticle.startLine, i).join('\n');
        articles.push(currentArticle);
      }
      currentArticle = {
        reporter,
        desk: REPORTER_DESK[reporter] || currentDesk,
        startLine: i,
        lineCount: 0,
        title: '',
        text: ''
      };
      // Look back for title (bold **Title** or ALL-CAPS line before byline)
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const prev = lines[j].trim();
        if (prev.startsWith('**') && prev.endsWith('**')) {
          currentArticle.title = prev.replace(/\*\*/g, '');
          break;
        }
        // ALL-CAPS title (skip delimiters and empty lines)
        if (prev.length > 5 && prev === prev.toUpperCase() && /[A-Z]/.test(prev) && !prev.match(/^[-=]{3,}$/)) {
          currentArticle.title = prev;
          break;
        }
      }
    }
  }
  if (currentArticle) {
    currentArticle.lineCount = lines.length - currentArticle.startLine;
    currentArticle.text = lines.slice(currentArticle.startLine).join('\n');
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

// --- Empathy evaluation (Phase 26.3 — Story Craft) ---
// Scans article text for signals that the writer made readers care about people.
// Not AI — pattern matching for observable craft markers.

function evaluateEmpathy(text) {
  if (!text || text.length < 50) return { score: 0, signals: [], missing: ['no article text'] };

  const signals = [];
  const missing = [];

  // 1. Direct quotes from citizens (dialogue = voice = empathy)
  const quoteCount = (text.match(/[""\u201C].{10,}?[""\u201D]/g) || []).length;
  if (quoteCount >= 3) signals.push(`Strong citizen voice (${quoteCount} quotes)`);
  else if (quoteCount >= 1) signals.push(`Some citizen voice (${quoteCount} quote${quoteCount > 1 ? 's' : ''})`);
  else missing.push('No direct quotes — citizens have no voice');

  // 2. Interior language (motivation, emotion, stakes)
  const interiorWords = /\b(feels?|hopes?|worries|fears?|remembers?|believes?|struggles?|dreams?|misses|wonders|wishes|proud|frustrated|relieved|anxious|grateful|exhausted|determined)\b/gi;
  const interiorCount = (text.match(interiorWords) || []).length;
  if (interiorCount >= 3) signals.push('Rich interior life — characters have feelings');
  else if (interiorCount >= 1) signals.push('Some interior language');
  else missing.push('No interior language — people are names, not humans');

  // 3. Sensory/concrete detail (place, texture, specificity)
  const sensoryWords = /\b(smell|sounds? of|taste|morning light|afternoon|evening|rain|wind|corner of|block|street|storefront|window|kitchen|desk|hands|voice|quiet|loud|crowded|empty)\b/gi;
  const sensoryCount = (text.match(sensoryWords) || []).length;
  if (sensoryCount >= 3) signals.push('Grounded in sensory detail');
  else if (sensoryCount >= 1) signals.push('Some concrete detail');
  else missing.push('Abstract — no sensory grounding');

  // 4. Specific personal details (age, relationship, history)
  const personalDetail = /\b(\d{2}[- ]year[- ]old|mother|father|daughter|son|husband|wife|partner|neighbor|childhood|grew up|moved here|years ago|since \d{4})\b/gi;
  const personalCount = (text.match(personalDetail) || []).length;
  if (personalCount >= 2) signals.push('Characters have personal history');
  else if (personalCount >= 1) signals.push('Some personal context');
  else missing.push('No personal details — characters are interchangeable');

  // Score: 0-4 based on how many dimensions hit
  const dimensions = [quoteCount >= 1, interiorCount >= 1, sensoryCount >= 1, personalCount >= 1];
  const score = dimensions.filter(Boolean).length;

  return { score, signals, missing };
}

function evaluateEmpathyForArticles(articles) {
  if (articles.length === 0) return { avgScore: 0, signals: [], missing: ['no articles'], bestArticle: null };

  const results = articles.map(a => ({ ...evaluateEmpathy(a.text), title: a.title }));
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const allSignals = [...new Set(results.flatMap(r => r.signals))];
  const allMissing = [...new Set(results.flatMap(r => r.missing))];
  const best = results.reduce((a, b) => a.score >= b.score ? a : b, results[0]);

  return { avgScore, signals: allSignals, missing: allMissing, bestArticle: best.score >= 3 ? best.title : null };
}

// --- Structured critique generators (Reagent 3-signal pattern) ---
// Each critique has: reasoning (why this grade), strengths, weaknesses, directive (what to do next)

function generateDeskCritique(desk, articles, errata, grade, score) {
  const criticals = errata.filter(e => e.severity === 'CRITICAL');
  const warnings = errata.filter(e => e.severity === 'WARNING');
  const reporters = [...new Set(articles.map(a => a.reporter))];

  // Empathy evaluation — story craft quality
  const empathy = evaluateEmpathyForArticles(articles);

  // Reasoning trace — why this grade
  let reasoning = '';
  if (score >= 9) reasoning = `${desk} desk delivered strong coverage with ${articles.length} articles and minimal errors.`;
  else if (score >= 7) reasoning = `${desk} desk produced adequate coverage but errata drag the grade. ${criticals.length} critical errors need addressing.`;
  else if (score >= 5) reasoning = `${desk} desk underperformed. ${criticals.length} critical errors and ${warnings.length} warnings indicate systemic issues.`;
  else reasoning = `${desk} desk failed this cycle. Major errors dominate the output.`;

  // Strengths
  const strengths = [];
  if (articles.length >= 3) strengths.push(`Good coverage breadth (${articles.length} articles)`);
  if (reporters.length >= 2) strengths.push(`Multiple reporters active (${reporters.join(', ')})`);
  if (criticals.length === 0) strengths.push('Zero critical errors');
  if (errata.length === 0) strengths.push('Clean copy — no errata at all');
  // Empathy strengths
  for (const s of empathy.signals) strengths.push(s);
  if (empathy.bestArticle) strengths.push(`Best craft: "${empathy.bestArticle}"`);

  // Weaknesses — derived from actual errata
  const weaknesses = [];
  const errorTypes = {};
  for (const e of errata) {
    const t = e.errorType || 'unclassified';
    errorTypes[t] = (errorTypes[t] || 0) + 1;
  }
  for (const [type, count] of Object.entries(errorTypes)) {
    if (count >= 2) weaknesses.push(`Recurring: ${type} (${count}x)`);
    else weaknesses.push(`${type}`);
  }
  if (articles.length === 0) weaknesses.push('No articles produced');
  if (articles.length === 1 && desk !== 'business') weaknesses.push('Thin coverage — only 1 article');
  // Empathy weaknesses
  for (const m of empathy.missing) weaknesses.push(m);

  // Directive — what to improve next edition
  let directive = '';
  if (criticals.length > 0) {
    const topError = criticals[0];
    directive = `PRIORITY FIX: ${topError.errorType || 'critical error'} — ${topError.description || 'see errata'}. Address this before anything else.`;
  } else if (warnings.length > 0) {
    directive = `Clean up ${warnings.length} warning(s). Focus on: ${warnings[0].errorType || warnings[0].description || 'see errata'}.`;
  } else if (empathy.avgScore < 2 && articles.length > 0) {
    directive = 'Craft gap: make readers care about someone. Add direct quotes, personal details, interior emotion. People are the story — not the policy, not the event.';
  } else if (articles.length < 2 && desk !== 'business') {
    directive = 'Increase coverage breadth. Aim for 2-3 articles minimum.';
  } else {
    directive = 'Maintain quality. Experiment with new angles or underused citizens.';
  }

  return { reasoning, strengths, weaknesses, directive, empathy: { score: empathy.avgScore, best: empathy.bestArticle } };
}

function generateReporterCritique(name, articles, errata, grade, score) {
  const criticals = errata.filter(e => e.severity === 'CRITICAL');
  const warnings = errata.filter(e => e.severity === 'WARNING');

  // Empathy evaluation — story craft quality
  const empathy = evaluateEmpathyForArticles(articles);

  // Reasoning trace
  let reasoning = '';
  if (score >= 9) reasoning = `${name} delivered clean, strong journalism this cycle.`;
  else if (score >= 7) reasoning = `${name} produced solid work with minor issues to address.`;
  else if (score >= 5) reasoning = `${name} had significant errors that undermine otherwise adequate coverage.`;
  else reasoning = `${name} needs to fundamentally reassess approach — errors dominate the output.`;

  // Strengths
  const strengths = [];
  if (articles.length >= 2) strengths.push(`Multiple pieces (${articles.length})`);
  if (criticals.length === 0 && articles.length > 0) strengths.push('No critical errors');
  if (errata.length === 0 && articles.length > 0) strengths.push('Completely clean copy');
  for (const a of articles) {
    if (a.lineCount > 40) strengths.push(`Substantial depth in "${a.title || 'untitled'}"`);
  }
  // Empathy strengths
  for (const s of empathy.signals) strengths.push(s);

  // Weaknesses
  const weaknesses = [];
  for (const e of errata) {
    weaknesses.push(`${e.severity || 'NOTE'}: ${e.errorType || ''} — ${e.description || 'see errata'}`);
  }
  if (articles.length === 0) weaknesses.push('No articles produced this cycle');
  // Empathy weaknesses
  for (const m of empathy.missing) weaknesses.push(m);

  // Directive
  let directive = '';
  if (criticals.length > 0) {
    directive = `Fix: ${criticals[0].errorType || criticals[0].description}. This is the priority.`;
  } else if (warnings.length > 0) {
    directive = `Address: ${warnings[0].description || warnings[0].errorType}.`;
  } else if (empathy.avgScore < 2 && articles.length > 0) {
    directive = 'Your writing needs people. Add quotes, feelings, personal details — make readers care about someone specific.';
  } else {
    directive = 'Keep it up. Try reaching for a citizen or angle you haven\'t covered before.';
  }

  return { reasoning, strengths, weaknesses, directive, empathy: { score: empathy.avgScore } };
}

// --- Supplemental detection ---
function detectSupplemental(filename) {
  const base = path.basename(filename).toLowerCase();
  if (!base.startsWith('supplemental')) return null;
  // Extract topic: supplemental_{topic}_c{XX}.txt → topic
  const match = base.match(/^supplemental_(.+?)_c\d+\.txt$/);
  return match ? match[1] : 'unknown';
}

// --- Main grading logic ---
function gradeEdition(editionFile, cycle) {
  const editionText = fs.readFileSync(editionFile, 'utf-8');
  const articles = parseEdition(editionText);
  const errata = parseErrata(cycle);
  const maraGrade = parseMaraGrade(cycle);
  const previousGrades = loadPreviousGrades(cycle, 4);
  const supplementalTopic = detectSupplemental(editionFile);
  const isSupplemental = !!supplementalTopic;

  const label = isSupplemental ? `Supplemental (${supplementalTopic}) C${cycle}` : `Edition ${cycle}`;
  console.log(`\nGrading ${label}`);
  console.log(`  Articles found: ${articles.length}`);
  console.log(`  Errata entries: ${errata.length}`);
  console.log(`  Mara grade: ${maraGrade || 'not found'}`);
  console.log(`  Previous grade files: ${previousGrades.length}`);

  // --- Grade per desk ---
  const desks = {};
  // For supplementals: only grade desks that have articles (focused pieces)
  // For editions: grade all standard desks
  const STANDARD_DESKS = ['civic', 'business', 'culture', 'sports', 'chicago', 'letters'];
  const activeDeskNames = isSupplemental
    ? [...new Set(articles.map(a => a.desk))].filter(Boolean)
    : STANDARD_DESKS;
  // Include freelance if present in either type
  if (!activeDeskNames.includes('freelance') && articles.some(a => a.desk === 'freelance')) {
    activeDeskNames.push('freelance');
  }
  const DESK_NAMES = activeDeskNames;

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

    // Structured critique — 3-signal feedback (Reagent + RLCF pattern)
    const critique = generateDeskCritique(desk, deskArticles, deskErrata, grade, score);

    desks[desk] = {
      grade,
      score: Math.round(score * 10) / 10,
      articles: deskArticles.length,
      criticalErrors: criticals,
      warnings,
      reporters,
      justification: justParts.join('. '),
      critique,
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

    // Structured critique — 3-signal feedback (Reagent + RLCF pattern)
    const critique = generateReporterCritique(name, reporterArticles, reporterErrata, grade, score);

    reporters[name] = {
      desk: REPORTER_DESK[name] || reporterArticles[0]?.desk || 'unknown',
      grade,
      score: Math.round(score * 10) / 10,
      articles: reporterArticles.length,
      criticalErrors: criticals,
      warnings,
      justification: justParts.join('. '),
      critique,
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
    type: isSupplemental ? 'supplemental' : 'edition',
    ...(isSupplemental ? { topic: supplementalTopic } : {}),
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

  const outFilename = isSupplemental
    ? `grades_c${cycle}_supplemental_${supplementalTopic}.json`
    : `grades_c${cycle}.json`;
  const outPath = path.join(gradesDir, outFilename);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\n  Written: ${outPath}`);

  // --- Print summary ---
  console.log(`\n  === ${label} Grade Report ===`);
  console.log(`  Overall: ${overallGrade} (Mara: ${maraGrade || 'n/a'})`);
  console.log(`  Articles: ${articles.length} | Errata: ${errata.length}`);
  console.log('');
  console.log('  Desk Grades:');
  for (const [desk, data] of Object.entries(desks)) {
    console.log(`    ${desk.padEnd(10)} ${data.grade.padEnd(3)} (${data.articles} articles, ${data.criticalErrors}C/${data.warnings}W)`);
    if (data.critique) {
      console.log(`      → ${data.critique.reasoning}`);
      if (data.critique.directive) console.log(`      → NEXT: ${data.critique.directive}`);
    }
  }
  console.log('');
  console.log('  Reporter Grades:');
  for (const [name, data] of Object.entries(reporters)) {
    console.log(`    ${name.padEnd(20)} ${data.grade.padEnd(3)} [${data.desk}] (${data.articles} articles, ${data.criticalErrors}C/${data.warnings}W)`);
    if (data.critique) {
      console.log(`      → ${data.critique.reasoning}`);
    }
  }

  // --- Auto-append to edition_scores.json ---
  // Keeps dashboard Newsroom tab score history current
  try {
    const scoresPath = path.join(ROOT, 'output', 'edition_scores.json');
    const scoresData = fs.existsSync(scoresPath)
      ? JSON.parse(fs.readFileSync(scoresPath, 'utf-8'))
      : { _description: 'Edition score history', scores: [] };

    // Don't duplicate — check by cycle + type
    const scoreKey = isSupplemental ? `${cycle}_supplemental_${supplementalTopic}` : `${cycle}`;
    const alreadyScored = scoresData.scores.some(s =>
      isSupplemental
        ? s.edition === cycle && s.type === 'supplemental' && s.topic === supplementalTopic
        : s.edition === cycle && s.type !== 'supplemental'
    );
    if (!alreadyScored) {
      scoresData.scores.push({
        edition: cycle,
        cycle: cycle,
        type: isSupplemental ? 'supplemental' : 'edition',
        ...(isSupplemental ? { topic: supplementalTopic } : {}),
        date: new Date().toISOString().split('T')[0],
        grade: overallGrade,
        maraGrade: maraGrade || null,
        criticals: errata.filter(e => e.severity === 'critical').length,
        warnings: errata.filter(e => e.severity === 'warning').length,
        notes: errata.filter(e => e.severity === 'note').length,
        deskErrors: Object.fromEntries(
          Object.entries(desks).map(([desk, data]) => [desk, data.criticalErrors > 0 ? [`${data.criticalErrors} critical errors`] : []])
        ),
        noteText: `Auto-graded by gradeEdition.js. ${articles.length} articles, ${errata.length} errata entries.${isSupplemental ? ` Supplemental: ${supplementalTopic}.` : ''}`,
      });
      fs.writeFileSync(scoresPath, JSON.stringify(scoresData, null, 2));
      console.log(`\n  Score appended to edition_scores.json (${isSupplemental ? 'S' : 'E'}${cycle}: ${overallGrade})`);
    } else {
      console.log(`\n  Score already exists for ${scoreKey} — skipped append`);
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
