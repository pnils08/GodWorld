#!/usr/bin/env node
/**
 * couplingCheck.js — does docs/engine/ENGINE_COUPLING_MAP.md still match the code
 *
 * Reads the map's per-file sections (### `file.js` ...) and checks them against
 * phase*\/ and utilities/:
 *   MISSING FILE      a live section names a file that is not in the tree
 *   MISSING FUNCTION  a function named in a live section's heading is not defined in its file
 *   UNMAPPED          an engine file has no section in the map
 *   DRIFT             an engine file changed in git after the map's last commit
 * Sections whose heading says DELETED / RETIRED / REMOVED are historical and skipped.
 *
 * Usage:
 *   node scripts/couplingCheck.js            # full report
 *   node scripts/couplingCheck.js --strict   # exit 1 on MISSING FILE / MISSING FUNCTION
 *   node scripts/couplingCheck.js <file.js>  # one file's sections and drift
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MAP = 'docs/engine/ENGINE_COUPLING_MAP.md';
const strict = process.argv.includes('--strict');
const fileArg = process.argv.slice(2).find(a => !a.startsWith('--')) || null;

function sh(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
}

const engineFiles = sh('git ls-files "phase*/*.js" "utilities/*.js"')
  .split('\n').filter(f => f && !f.endsWith('.test.js'));
// A section may name a file anywhere the map covers (engine dirs, lib, scripts, dashboard)
const allFiles = sh('git ls-files "phase*/*.js" "utilities/*.js" "lib/*.js" "scripts/*.js" "dashboard/*.js" "dashboard/**/*.js"')
  .split('\n').filter(Boolean);
const byBase = {};
for (const f of allFiles) (byBase[path.basename(f)] = byBase[path.basename(f)] || []).push(f);

// Sections: ### `name.js` (fn_, fn2_, ...) — ... ; heading tokens ending in _ are function names
const lines = fs.readFileSync(path.join(ROOT, MAP), 'utf8').split('\n');
const sections = [];
lines.forEach((text, i) => {
  const m = text.match(/^###\s+`([A-Za-z0-9_.\/-]+\.js)`(.*)$/);
  if (!m) return;
  const rest = m[2];
  const historical = /\b(DELETED|RETIRED|REMOVED)\b/.test(rest);
  const fns = [...rest.matchAll(/\b([A-Za-z][A-Za-z0-9]*_(?:Phase\d+_)?)\b/g)].map(x => x[1]);
  sections.push({ file: m[1], line: i + 1, fns: [...new Set(fns)], historical });
});

const findings = { missingFile: [], missingFn: [], unmapped: [], drift: [] };
const mapped = new Set();

for (const s of sections) {
  if (s.historical) continue;
  const hits = byBase[path.basename(s.file)];
  if (!hits) { findings.missingFile.push(`${MAP}:${s.line}  ${s.file}`); continue; }
  hits.forEach(h => mapped.add(h));
  const src = hits.map(h => fs.readFileSync(path.join(ROOT, h), 'utf8')).join('\n');
  const label = path.basename(s.file, '.js') + '_';   // 'file_' is a placeholder label, not a function claim
  for (const fn of s.fns) {
    if (fn === label) continue;
    // a heading label may stand for a suffixed name (updateCrimeMetrics_ -> updateCrimeMetrics_Phase3_)
    const stem = fn.replace(/_$/, '');
    const defined = new RegExp(`function\\s+${stem}\\w*|\\b${stem}\\w*\\s*[:=]\\s*(?:async\\s*)?(?:function|\\()`).test(src);
    if (!defined) findings.missingFn.push(`${MAP}:${s.line}  ${s.file} → ${fn}`);
  }
}

for (const f of engineFiles) if (!mapped.has(f)) findings.unmapped.push(f);

// Drift: engine files with a commit after the map's last commit
let mapCommit = '';
try { mapCommit = sh(`git log -1 --format=%H -- ${MAP}`); } catch (e) { /* no history */ }
if (mapCommit) {
  const changed = sh(`git diff --name-only ${mapCommit} HEAD -- phase01-config phase02-world-state phase03-population phase04-events phase05-citizens phase06-analysis phase07-evening-media phase08-v3-chicago phase09-digest phase10-persistence utilities`)
    .split('\n').filter(f => f.endsWith('.js') && !f.endsWith('.test.js'));
  for (const f of changed) if (mapped.has(f)) findings.drift.push(f);
}

const pick = f => !fileArg || f.includes(fileArg);
const out = (title, arr, note) => {
  const rows = arr.filter(pick);
  console.log(`\n${title} (${rows.length})${note ? ' — ' + note : ''}`);
  rows.forEach(r => console.log('  ' + r));
};

console.log(`couplingCheck: ${sections.length} sections, ${sections.filter(s => !s.historical).length} live, ${engineFiles.length} engine files, ${mapped.size} mapped`);
out('MISSING FILE', findings.missingFile, 'section names a file not in the tree');
out('MISSING FUNCTION', findings.missingFn, 'heading names a function the file does not define');
out('DRIFT', findings.drift, 'mapped file changed after the map\'s last commit — re-read its section');
out('UNMAPPED', findings.unmapped, 'engine file with no section');

if (strict && (findings.missingFile.length || findings.missingFn.length)) process.exit(1);
