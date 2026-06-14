#!/usr/bin/env node
/**
 * lintCivicPackets.js — ES-2 step 2 (C97 G-PREP5, ES half), S257
 *
 * Deterministic packet linter for the city-hall-prep Step-4 gate. Voice agents
 * turn pending_decisions_*.md PROSE packets into civic statements, so engine
 * telemetry that leaks into a packet leaks into canon-facing civic voice
 * (C97: σ values, signed +0.xx deltas, phase-codes, "engine" tags). RB-3 wrote
 * the no-telemetry RULE into the skill (Step 3 translation contract); this is the
 * mechanical enforcer. Scans PROSE packets only — the .json DATA packets
 * (civic_c{XX}.json etc.) legitimately carry raw metrics and are NOT scanned.
 *
 * Calibrated S257 against output/engine_review_c97.md (real leak phrasings) and
 * output/desk-packets/civic_c97.json (legit civic content): catches σ / signed
 * sub-1 deltas / lowercase engine phase-codes / Engine: tags / decimals adjacent
 * to a metric word; does NOT trip on money ($2.1B), vote counts (5-4), district
 * codes (D5), project "Phase II", or "economic engine" metaphors.
 *
 * USAGE:
 *   node scripts/lintCivicPackets.js <cycle>        # scan output/pending_decisions_*c<cycle>*.md
 *   node scripts/lintCivicPackets.js --file <path>  # scan one packet
 * Exit 0 = clean; exit 1 = telemetry leak found (gate fails).
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Each rule: { name, re, why }. All are FAIL-level (the gate blocks).
const RULES = [
  // Sigma values — pure engine telemetry. "3.3σ", "4.0 σ", "sigma".
  { name: 'sigma', re: /\b\d+(?:\.\d+)?\s?σ|\bsigma\b/g, why: 'sigma / σ is engine telemetry' },
  // Signed sub-1 deltas — "+0.11", "-0.25". Money/percent never take this form.
  { name: 'signed-delta', re: /(?<![\w$])[+\-]0\.\d+/g, why: 'signed sub-1 delta is an engine metric change' },
  // Lowercase engine phase-codes — "phase05", "phase8-...". NOT "Phase II"/"Phase 2"
  // (project phases: capital P + space/roman → excluded).
  { name: 'phase-code', re: /\bphase[\-_]?\d+/g, why: 'engine phase-code' },
  // Engine tags — "Engine:" label or "(engine ...)" parenthetical. NOT the
  // "economic engine"/"growth engine" metaphor (no colon, no paren-tag).
  { name: 'engine-tag', re: /\bEngine:|\(engine\b[^)]*\)/g, why: 'engine-system tag' },
  // Backtick code spans (any) — packets are prose; inline code is engine leak.
  { name: 'code-span', re: /`[^`\n]+`/g, why: 'inline code span (engine/system reference)' },
  // Named engine metrics in prose.
  { name: 'metric-phrase', re: /\btension score\b|\bcivic load\b|\bseverity (?:level|score)\b/gi, why: 'raw engine metric phrase' },
  // Decimal adjacent (±24 chars) to a metric word — "approval at 0.62",
  // "sentiment 3.3". Money/vote-counts excluded (no metric word adjacent).
  { name: 'metric-decimal', re: /(?:sentiment|approval|severity|tension|civic load|momentum)[^.\n]{0,24}?\d+\.\d+|\d+\.\d+[^.\n]{0,24}?(?:sentiment|approval|severity|tension|civic load|momentum)/gi, why: 'raw decimal next to a metric word' },
];

function lintText(text) {
  const issues = [];
  const body = String(text || '');
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(body)) !== null) {
      const ctx = body.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30).replace(/\s+/g, ' ').trim();
      issues.push({ rule: rule.name, match: m[0], why: rule.why, context: ctx });
      if (m.index === rule.re.lastIndex) rule.re.lastIndex++;  // avoid zero-width loop
    }
  }
  return issues;
}

function resolveFiles(args) {
  let cycle = null, file = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file') file = args[++i];
    else if (/^\d+$/.test(args[i])) cycle = args[i];
  }
  if (file) return [file];
  const dir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(dir)) return [];
  const all = fs.readdirSync(dir);
  return all
    .filter((f) => /^pending_decisions.*\.md$/.test(f) && (cycle ? f.includes('c' + cycle) : true))
    .map((f) => path.join(dir, f));
}

function main() {
  const files = resolveFiles(process.argv.slice(2));
  if (files.length === 0) {
    console.error('Error: no pending_decisions packets matched (pass <cycle> or --file).');
    process.exit(2);
  }
  let totalIssues = 0;
  for (const f of files) {
    if (!fs.existsSync(f)) { console.error('  (missing) ' + f); continue; }
    const issues = lintText(fs.readFileSync(f, 'utf8'));
    const tag = issues.length === 0 ? '✓' : '✗';
    console.log('  [' + tag + '] ' + path.basename(f) + ' — ' + issues.length + ' telemetry leak(s)');
    for (const it of issues) {
      console.error('      ✗ [' + it.rule + '] "' + it.match + '" — ' + it.why + '  «' + it.context + '»');
    }
    totalIssues += issues.length;
  }
  if (totalIssues > 0) {
    console.error('\nHALT: ' + totalIssues + ' telemetry leak(s) in civic packets — translate to perception before voice dispatch (city-hall-prep Step 3 contract).');
    process.exit(1);
  }
  console.log('Civic packet lint clean.');
  process.exit(0);
}

module.exports = { RULES, lintText };

if (require.main === module) main();
