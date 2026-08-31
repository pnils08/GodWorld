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
  // Decimal adjacent (±24 chars) to an ENGINE-INTERNAL metric word.
  //
  // civic.26 (2026-08-30, Mike-direct): sentiment / approval / severity /
  // tension came OUT of this list. Those are things every real city tracks and
  // publishes — a council member saying approval sits at 0.42 is a public
  // official quoting a public number, not an engine leak, and the gate must
  // not fail canon over data a city legitimately holds. The rule had been
  // blocking the whole C104 apply on council_d3's "0.42 sentiment".
  //
  // What stays is the vocabulary no city publishes because it only exists
  // inside this engine: civic load and momentum as bare scalars. Cycle DELTAS
  // are still caught by `signed-delta` ("moved +0.11 this cycle") — that shape
  // is engine output whatever noun it modifies, and is untouched here.
  //
  // Document/sheet/permit IDs excluded post-match below (e.g. "Sheet S-7.3") —
  // that form is a filing reference, not a raw metric reading.
  { name: 'metric-decimal', re: /(?:civic load|momentum)[^.\n]{0,24}?\d+\.\d+|\d+\.\d+[^.\n]{0,24}?(?:civic load|momentum)/gi, why: 'raw decimal next to an engine-internal metric word' },
];

// A decimal immediately preceded by a letter-hyphen (permit/sheet/section ID
// convention, e.g. "Sheet S-7.3", "Permit R-2.1") is a filing reference, not
// a metric reading — even when a metric word sits nearby in the sentence.
// Two shapes, because the rule's two alternations put the decimal at opposite
// ends of the match: the id can CLOSE the match ("approval ... Sheet S-7.3") or
// OPEN it ("Sheet S-7.3 approval pending"). In the opening form the letter-hyphen
// sits just before m.index, outside m[0], so it must be read off the body.
const DOC_REF_DECIMAL = /[A-Za-z]-\d+\.\d+\s*$/;
const DOC_REF_PREFIX = /[A-Za-z]-$/;

function isDocRef(body, m) {
  return DOC_REF_DECIMAL.test(m[0]) || DOC_REF_PREFIX.test(body.slice(0, m.index));
}

function lintText(text) {
  const issues = [];
  const body = String(text || '');
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(body)) !== null) {
      if (rule.name === 'metric-decimal' && isDocRef(body, m)) {
        if (m.index === rule.re.lastIndex) rule.re.lastIndex++;
        continue;
      }
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
