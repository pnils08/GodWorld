#!/usr/bin/env node
/**
 * Edition Diff Report — Trend Analysis
 * scripts/editionDiffReport.js
 *
 * Reads output/edition_scores.json and generates a trend report showing:
 * - Score trends over time (when scoring data exists)
 * - Error frequency by desk
 * - Recurring error patterns
 * - Improvement tracking
 *
 * Usage:
 *   node scripts/editionDiffReport.js              # print to stdout
 *   node scripts/editionDiffReport.js --save        # also save to output/edition_diff_report.md
 *   node scripts/editionDiffReport.js --last 5      # only last 5 editions
 */

var fs = require('fs');
var path = require('path');

var SCORES_PATH = path.join(__dirname, '..', 'output', 'edition_scores.json');
var OUTPUT_PATH = path.join(__dirname, '..', 'output', 'edition_diff_report.md');

var SAVE = process.argv.includes('--save');
var LAST_N = (function() {
  var idx = process.argv.indexOf('--last');
  if (idx !== -1 && process.argv[idx + 1]) return parseInt(process.argv[idx + 1], 10);
  return null;
})();

// ---------------------------------------------------------------------------
// Load scores
// ---------------------------------------------------------------------------
if (!fs.existsSync(SCORES_PATH)) {
  console.error('[ERROR] No score history found at ' + SCORES_PATH);
  console.error('Run an edition with Rhea verification and log the score first.');
  process.exit(1);
}

var data = JSON.parse(fs.readFileSync(SCORES_PATH, 'utf-8'));
var scores = data.scores || [];

if (LAST_N && LAST_N < scores.length) {
  scores = scores.slice(scores.length - LAST_N);
}

if (scores.length === 0) {
  console.error('[ERROR] No editions in score history.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

// Error frequency by desk
var deskErrorCounts = {};
var deskErrorTypes = {};
var desks = ['civic', 'sports', 'chicago', 'culture', 'business', 'letters'];

desks.forEach(function(d) {
  deskErrorCounts[d] = 0;
  deskErrorTypes[d] = {};
});

scores.forEach(function(s) {
  if (!s.deskErrors) return;
  desks.forEach(function(d) {
    var errs = s.deskErrors[d] || [];
    deskErrorCounts[d] += errs.length;
    errs.forEach(function(e) {
      // Normalize error text for pattern detection
      var key = e.toLowerCase().replace(/[^a-z ]/g, '').trim();
      if (key.length > 3) {
        deskErrorTypes[d][key] = (deskErrorTypes[d][key] || 0) + 1;
      }
    });
  });
});

// Recurring errors (appear 2+ times across editions)
var recurring = [];
desks.forEach(function(d) {
  Object.keys(deskErrorTypes[d]).forEach(function(errType) {
    if (deskErrorTypes[d][errType] >= 2) {
      recurring.push({ desk: d, error: errType, count: deskErrorTypes[d][errType] });
    }
  });
});

// Score trends (if scoring data exists)
var hasScores = scores.some(function(s) { return s.total !== null; });

// Critical/warning trends
var criticalTrend = scores.map(function(s) {
  return { edition: s.edition, criticals: s.criticals || 0, warnings: s.warnings || 0, grade: s.grade || '?' };
});

// ---------------------------------------------------------------------------
// Build report
// ---------------------------------------------------------------------------
var lines = [];

lines.push('# Edition Diff Report');
lines.push('**Generated: ' + new Date().toISOString().split('T')[0] + '**');
lines.push('**Editions analyzed: ' + scores.length + ' (E' + scores[0].edition + ' — E' + scores[scores.length - 1].edition + ')**');
lines.push('');

// Grade history
lines.push('## Grade History');
lines.push('');
lines.push('| Edition | Date | Grade | Criticals | Warnings | Notes |');
lines.push('|---------|------|-------|-----------|----------|-------|');
criticalTrend.forEach(function(t) {
  var s = scores.find(function(sc) { return sc.edition === t.edition; });
  lines.push('| E' + t.edition + ' | ' + (s.date || '?') + ' | ' + t.grade + ' | ' + t.criticals + ' | ' + t.warnings + ' | ' + (s.notes || 0) + ' |');
});
lines.push('');

// Score trends
if (hasScores) {
  lines.push('## Score Trends (0-100)');
  lines.push('');
  lines.push('| Edition | Total | Data | Voice | Structure | Narrative | Canon |');
  lines.push('|---------|-------|------|-------|-----------|-----------|-------|');
  scores.forEach(function(s) {
    if (s.total === null) {
      lines.push('| E' + s.edition + ' | — | — | — | — | — | — |');
    } else {
      lines.push('| E' + s.edition + ' | ' + s.total + ' | ' + s.dataAccuracy + ' | ' + s.voiceFidelity + ' | ' + s.structuralCompleteness + ' | ' + s.narrativeQuality + ' | ' + s.canonCompliance + ' |');
    }
  });
  lines.push('');
}

// Claim decomposition
var hasClaims = scores.some(function(s) { return s.claimDecomposition !== null; });
if (hasClaims) {
  lines.push('## Claim Decomposition Trends');
  lines.push('');
  lines.push('| Edition | Claims | Verified | Errors | Unverifiable |');
  lines.push('|---------|--------|----------|--------|--------------|');
  scores.forEach(function(s) {
    if (!s.claimDecomposition) {
      lines.push('| E' + s.edition + ' | — | — | — | — |');
    } else {
      var c = s.claimDecomposition;
      lines.push('| E' + s.edition + ' | ' + c.extracted + ' | ' + c.verified + ' | ' + c.errors + ' | ' + c.unverifiable + ' |');
    }
  });
  lines.push('');
}

// Error frequency by desk
lines.push('## Error Frequency by Desk');
lines.push('');
lines.push('| Desk | Total Errors | Avg per Edition |');
lines.push('|------|-------------|----------------|');
desks.forEach(function(d) {
  var avg = scores.length > 0 ? (deskErrorCounts[d] / scores.length).toFixed(1) : '0';
  lines.push('| ' + d + ' | ' + deskErrorCounts[d] + ' | ' + avg + ' |');
});
lines.push('');

// Recurring errors
if (recurring.length > 0) {
  lines.push('## Recurring Error Patterns');
  lines.push('');
  lines.push('These errors appeared in 2+ editions — they need systemic fixes:');
  lines.push('');
  recurring.forEach(function(r) {
    lines.push('- **' + r.desk + '**: "' + r.error + '" (' + r.count + ' editions)');
  });
  lines.push('');
}

// Per-edition error details
lines.push('## Error Details by Edition');
lines.push('');
scores.forEach(function(s) {
  lines.push('### Edition ' + s.edition + ' (' + (s.date || '?') + ') — Grade: ' + (s.grade || '?'));
  if (s.noteText) lines.push('*' + s.noteText + '*');
  lines.push('');

  var hasErrors = false;
  desks.forEach(function(d) {
    var errs = (s.deskErrors && s.deskErrors[d]) || [];
    if (errs.length > 0) {
      hasErrors = true;
      errs.forEach(function(e) {
        lines.push('- **' + d + '**: ' + e);
      });
    }
  });
  if (!hasErrors) lines.push('*No desk-specific errors logged.*');
  lines.push('');
});

// Summary
lines.push('## Summary');
lines.push('');
var totalCriticals = criticalTrend.reduce(function(sum, t) { return sum + t.criticals; }, 0);
var totalWarnings = criticalTrend.reduce(function(sum, t) { return sum + t.warnings; }, 0);
var totalErrors = desks.reduce(function(sum, d) { return sum + deskErrorCounts[d]; }, 0);
lines.push('- **Total editions**: ' + scores.length);
lines.push('- **Total criticals across all editions**: ' + totalCriticals);
lines.push('- **Total warnings across all editions**: ' + totalWarnings);
lines.push('- **Total desk-specific errors**: ' + totalErrors);

var worstDesk = desks.reduce(function(a, b) { return deskErrorCounts[a] > deskErrorCounts[b] ? a : b; });
var cleanestDesk = desks.reduce(function(a, b) { return deskErrorCounts[a] < deskErrorCounts[b] ? a : b; });
lines.push('- **Most error-prone desk**: ' + worstDesk + ' (' + deskErrorCounts[worstDesk] + ' errors)');
lines.push('- **Cleanest desk**: ' + cleanestDesk + ' (' + deskErrorCounts[cleanestDesk] + ' errors)');

if (recurring.length > 0) {
  lines.push('- **Recurring patterns**: ' + recurring.length + ' (these need systemic fixes)');
}
lines.push('');

var report = lines.join('\n');

console.log(report);

if (SAVE) {
  fs.writeFileSync(OUTPUT_PATH, report);
  console.log('\n[SAVED] ' + OUTPUT_PATH);
}
