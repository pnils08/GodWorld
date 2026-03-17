#!/usr/bin/env node
/**
 * gradeHistory.js — Phase 26.2: Grade History + Rolling Averages
 *
 * Reads all output/grades/grades_c{XX}.json files and computes rolling
 * averages across the last N editions (default 5).
 *
 * Usage:
 *   node scripts/gradeHistory.js [--window N]
 *
 * Output:
 *   - output/grades/grade_history.json
 *   - Printed summary to stdout
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GRADES_DIR = path.join(ROOT, 'output', 'grades');

const GRADE_SCALE = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
const GRADE_VALUES = {};
GRADE_SCALE.forEach((g, i) => { GRADE_VALUES[g] = 10 - i; });

function gradeFromValue(val) {
  const clamped = Math.max(1, Math.min(10, Math.round(val)));
  return GRADE_SCALE[10 - clamped] || 'C';
}

function computeTrend(grades) {
  if (grades.length < 2) return 'new';
  const recent = GRADE_VALUES[grades[grades.length - 1]] || 5;
  const prior = GRADE_VALUES[grades[grades.length - 2]] || 5;
  return recent > prior ? 'improving' : recent < prior ? 'declining' : 'stable';
}

function main() {
  const args = process.argv.slice(2);
  let window = 5;
  const windowIdx = args.indexOf('--window');
  if (windowIdx >= 0 && args[windowIdx + 1]) {
    window = parseInt(args[windowIdx + 1]);
  }

  if (!fs.existsSync(GRADES_DIR)) {
    console.log('No grades directory found. Run gradeEdition.js first.');
    process.exit(1);
  }

  const files = fs.readdirSync(GRADES_DIR)
    .filter(f => f.match(/^grades_c\d+\.json$/))
    .sort();

  if (files.length === 0) {
    console.log('No grade files found. Run gradeEdition.js first.');
    process.exit(1);
  }

  console.log(`\nGrade History — ${files.length} editions, window=${window}`);

  const allGrades = files.map(f => {
    try { return JSON.parse(fs.readFileSync(path.join(GRADES_DIR, f), 'utf-8')); }
    catch { return null; }
  }).filter(Boolean);

  // Recent window
  const recent = allGrades.slice(-window);

  // --- Desk history ---
  const deskHistory = {};
  const DESK_NAMES = ['civic', 'business', 'culture', 'sports', 'chicago', 'letters'];

  for (const desk of DESK_NAMES) {
    const grades = recent
      .filter(g => g.desks && g.desks[desk])
      .map(g => ({ cycle: g.cycle, grade: g.desks[desk].grade, ...g.desks[desk] }));

    const gradeLetters = grades.map(g => g.grade);
    const values = gradeLetters.map(g => GRADE_VALUES[g] || 5);
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 5;

    deskHistory[desk] = {
      current: gradeLetters[gradeLetters.length - 1] || 'N/A',
      rolling: gradeFromValue(avg),
      trend: computeTrend(gradeLetters),
      editions: grades.map(g => ({
        cycle: g.cycle,
        grade: g.grade,
        articles: g.articles,
        criticalErrors: g.criticalErrors,
        warnings: g.warnings
      }))
    };
  }

  // --- Reporter history ---
  const reporterHistory = {};
  const allReporters = new Set();
  for (const g of recent) {
    if (g.reporters) Object.keys(g.reporters).forEach(r => allReporters.add(r));
  }

  for (const reporter of allReporters) {
    const grades = recent
      .filter(g => g.reporters && g.reporters[reporter])
      .map(g => ({ cycle: g.cycle, ...g.reporters[reporter] }));

    const gradeLetters = grades.map(g => g.grade);
    const values = gradeLetters.map(g => GRADE_VALUES[g] || 5);
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 5;

    reporterHistory[reporter] = {
      desk: grades[grades.length - 1]?.desk || 'unknown',
      current: gradeLetters[gradeLetters.length - 1] || 'N/A',
      rolling: gradeFromValue(avg),
      trend: computeTrend(gradeLetters),
      editions: grades.map(g => ({
        cycle: g.cycle,
        grade: g.grade,
        articles: g.articles
      }))
    };
  }

  // --- Overall history ---
  const overallGrades = allGrades.map(g => g.overallGrade);
  const overallValues = overallGrades.map(g => GRADE_VALUES[g] || 5);
  const overallAvg = overallValues.length > 0
    ? overallValues.reduce((a, b) => a + b, 0) / overallValues.length : 5;

  // --- Roster recommendations ---
  const rosterRecommendations = {};
  for (const [name, data] of Object.entries(reporterHistory)) {
    if (name === 'Letters Desk') continue; // Letters desk is collective
    const rollingVal = GRADE_VALUES[data.rolling] || 5;
    let status, note;
    if (rollingVal >= 9) {        // A or A-
      status = 'star';
      note = 'Top performer. Prioritize for front page and high-profile stories.';
    } else if (rollingVal >= 7) {  // B+ or B
      status = 'solid';
      note = 'Reliable output. Standard assignment rotation.';
    } else if (rollingVal >= 5) {  // B- or C+
      status = 'watch';
      note = 'Below standard. Review recent errors. Consider fewer assignments next edition.';
    } else if (rollingVal >= 3) {  // C or C-
      status = 'probation';
      note = 'Consistent quality issues. Reduce to 1 article. Enrich workspace with exemplars.';
    } else {                       // D or F
      status = 'bench';
      note = 'Bench this reporter next edition. Review workspace data and exemplars before return.';
    }
    rosterRecommendations[name] = { desk: data.desk, rolling: data.rolling, status, note };
  }

  const history = {
    generated: new Date().toISOString(),
    window,
    editionsGraded: allGrades.length,
    cycles: allGrades.map(g => g.cycle),
    overall: {
      current: overallGrades[overallGrades.length - 1] || 'N/A',
      rolling: gradeFromValue(overallAvg),
      trend: computeTrend(overallGrades)
    },
    desks: deskHistory,
    reporters: reporterHistory,
    rosterRecommendations
  };

  const outPath = path.join(GRADES_DIR, 'grade_history.json');
  fs.writeFileSync(outPath, JSON.stringify(history, null, 2));
  console.log(`  Written: ${outPath}`);

  // --- Print summary ---
  console.log(`\n  === Grade History Summary ===`);
  console.log(`  Overall: ${history.overall.current} (rolling: ${history.overall.rolling}, ${history.overall.trend})`);
  console.log('');
  console.log('  Desk Rolling Averages:');
  for (const [desk, data] of Object.entries(deskHistory)) {
    console.log(`    ${desk.padEnd(10)} ${data.current.padEnd(3)} rolling: ${data.rolling} (${data.trend})`);
  }
  console.log('');
  console.log('  Reporter Rolling Averages:');
  for (const [name, data] of Object.entries(reporterHistory)) {
    console.log(`    ${name.padEnd(20)} ${data.current.padEnd(3)} rolling: ${data.rolling} (${data.trend}) [${data.desk}]`);
  }
}

main();
