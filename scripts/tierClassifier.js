#!/usr/bin/env node
/**
 * tierClassifier.js — Phase 39.9 (S148)
 *
 * Deterministic tier assignment for editorial review.
 * Classifies each article/story in a compiled edition into Tier A, B, or C
 * based on priority signals from engine audit, sift, and edition content.
 *
 * Source: LeCompte, "Automation in the Newsroom" (Nieman Reports, Sep 2015).
 * AP model: 80 companies get close review, 220 get editor pass, rest go direct.
 *
 * Tier A (full review): All three reviewer lanes + capability + two-pass
 *   hallucination + Final Arbiter. Front page, ailment coverage, Tier-1 citizen
 *   features, contested votes, anomaly-flagged stories.
 *
 * Tier B (editor pass): Rhea sourcing + cycle-review reasoning. Skip Mara if
 *   completeness is obvious. Neighborhood features, routine council, sports recaps.
 *
 * Tier C (automated checks only): Rhea sourcing regex + anomaly flag. No reviewer
 *   agents. Baseline briefs, box-score-equivalent, Tier-4 generic citizen scene-setters.
 *
 * Inputs:
 *   1. Compiled edition — editions/cycle_pulse_edition_{XX}.txt
 *   2. Engine audit JSON — output/engine_audit_c{XX}.json
 *   3. Engine anomalies JSON — output/engine_anomalies_c{XX}.json (optional)
 *   4. Capability review JSON — output/capability_review_c{XX}.json (optional, for re-runs)
 *
 * Writes:
 *   output/tier_assignments_c{XX}.json
 *
 * Usage:
 *   node scripts/tierClassifier.js          # auto-detect cycle
 *   node scripts/tierClassifier.js 91       # explicit cycle
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse, extractNameCandidates, extractInitiativeIds } = require('./capability-reviewer/parseEdition');

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const EDITIONS_DIR = path.join(__dirname, '..', 'editions');
const CLASSIFIER_VERSION = '1.0.0';

// --- Tier-1 citizens (protected, always Tier A) ---
// These are loaded from the engine audit's affectedEntities or hardcoded canon.
// In practice the rollout says "Tier-1 citizen involved" is a Tier A signal.
const TIER_1_CITIZENS = new Set([
  // Council members + Mayor — always high-stakes
  'Avery Santana', 'Ramon Vega', 'Leonard Tran', 'Janae Rivers', 'Warren Ashford',
  // Key recurring citizens from canon
  'Bobby Chen-Ramirez', 'Marcus Webb', 'Elena Soria Dominguez',
  'Keisha Ramos', 'Clarissa Dane', 'Rafael Montez',
]);

// Section names that default to Tier B unless elevated
const TIER_B_DEFAULT_SECTIONS = new Set([
  'SPORTS', 'CULTURE', 'CHICAGO', 'BUSINESS',
]);

// Section names that default to Tier C unless elevated
const TIER_C_DEFAULT_SECTIONS = new Set([
  'LETTERS', 'LETTERS TO THE EDITOR', 'WEATHER', 'CLASSIFIEDS', 'OBITUARIES',
]);

function resolveCycle() {
  const argCycle = parseInt(process.argv[2], 10);
  if (!isNaN(argCycle)) return argCycle;
  if (process.env.TIER_CLASSIFIER_CYCLE) return parseInt(process.env.TIER_CLASSIFIER_CYCLE, 10);
  // Fallback: scan editions dir for latest
  const files = fs.readdirSync(EDITIONS_DIR).filter(f => /cycle_pulse_edition_\d+\.txt$/.test(f));
  if (files.length === 0) throw new Error('No editions found');
  const cycles = files.map(f => parseInt(f.match(/(\d+)/)[1], 10));
  return Math.max(...cycles);
}

function loadJsonSafe(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { return null; }
}

function classifyArticle(article, sectionTitle, audit, anomalies) {
  const signals = [];
  let tier = 'C'; // default lowest

  const bodyText = (article.headline || '') + ' ' + (article.body || '');
  const names = extractNameCandidates(bodyText);
  const initIds = extractInitiativeIds(bodyText);

  // --- Signal: Front page ---
  if (sectionTitle === 'FRONT PAGE') {
    signals.push('front-page');
    tier = 'A';
  }

  // --- Signal: Editor's Desk ---
  if (sectionTitle === "EDITOR'S DESK") {
    signals.push('editors-desk');
    tier = 'A';
  }

  // --- Signal: Tier-1 citizen involved ---
  for (const name of names) {
    if (TIER_1_CITIZENS.has(name)) {
      signals.push(`tier-1-citizen:${name}`);
      tier = 'A';
    }
  }

  // --- Signal: Engine-flagged ailment (from audit patterns) ---
  if (audit && audit.patterns) {
    for (const pattern of audit.patterns) {
      if (pattern.severity !== 'high') continue;

      // Check if any initiative referenced in article matches an audit pattern
      if (pattern.affectedEntities?.initiatives) {
        for (const initId of initIds) {
          if (pattern.affectedEntities.initiatives.includes(initId)) {
            signals.push(`engine-ailment:${pattern.type}:${initId}`);
            tier = 'A';
          }
        }
      }

      // Check if any neighborhood in article text matches affected neighborhoods
      if (pattern.affectedEntities?.neighborhoods) {
        for (const hood of pattern.affectedEntities.neighborhoods) {
          if (bodyText.includes(hood)) {
            signals.push(`engine-ailment-neighborhood:${hood}`);
            if (tier !== 'A') tier = 'A';
          }
        }
      }
    }
  }

  // --- Signal: Anomaly flag from 38.7 ---
  if (anomalies && anomalies.anomalies) {
    for (const anomaly of anomalies.anomalies) {
      if (anomaly.confidence !== 'high') continue;
      // Check citizen overlap
      if (anomaly.citizenId && bodyText.includes(anomaly.citizenId)) {
        signals.push(`anomaly:${anomaly.type}:${anomaly.citizenId}`);
        tier = 'A';
      }
      // Check neighborhood overlap
      if (anomaly.neighborhood && bodyText.includes(anomaly.neighborhood)) {
        signals.push(`anomaly-neighborhood:${anomaly.neighborhood}`);
        if (tier !== 'A') tier = 'A';
      }
    }
  }

  // --- Signal: Contested civic story (votes, council decisions) ---
  const civicKeywords = /\b(vote[ds]?|council\s+vote|passed\s+\d+-\d+|contested|dissent|opposed|override|veto)\b/i;
  if (civicKeywords.test(bodyText)) {
    signals.push('contested-civic');
    if (tier === 'C') tier = 'B';
    // Civic + high-severity pattern = Tier A
    if (sectionTitle === 'CIVIC') {
      const hasHighSeverity = audit?.patterns?.some(p => p.severity === 'high' &&
        p.affectedEntities?.initiatives?.some(id => initIds.includes(id)));
      if (hasHighSeverity) tier = 'A';
    }
  }

  // --- Section-based defaults (only if no signals elevated it) ---
  if (signals.length === 0) {
    if (TIER_C_DEFAULT_SECTIONS.has(sectionTitle)) {
      tier = 'C';
      signals.push(`section-default:${sectionTitle}`);
    } else if (TIER_B_DEFAULT_SECTIONS.has(sectionTitle)) {
      tier = 'B';
      signals.push(`section-default:${sectionTitle}`);
    } else if (sectionTitle === 'CIVIC') {
      tier = 'B';
      signals.push('section-default:CIVIC');
    } else if (sectionTitle === 'PODCAST') {
      tier = 'C';
      signals.push('section-default:PODCAST');
    } else {
      tier = 'B';
      signals.push('section-default:other');
    }
  }

  // --- Signal: Article length as a Tier B floor ---
  // Very short articles (< 200 chars body) are texture pieces → Tier C unless elevated
  if (article.body && article.body.length < 200 && tier === 'B' && signals.every(s => s.startsWith('section-default'))) {
    tier = 'C';
    signals.push('short-article');
  }

  return {
    headline: (article.headline || '').substring(0, 120),
    byline: article.byline || '',
    section: sectionTitle,
    tier,
    signals,
    namesFound: names.length,
    initiativeIds: initIds,
  };
}

function main() {
  const cycle = resolveCycle();
  console.log(`Tier Classifier — Cycle ${cycle}`);

  const editionPath = path.join(EDITIONS_DIR, `cycle_pulse_edition_${cycle}.txt`);
  if (!fs.existsSync(editionPath)) {
    console.error(`Edition not found: ${editionPath}`);
    process.exit(1);
  }

  const edition = parse(editionPath);
  const audit = loadJsonSafe(path.join(OUTPUT_DIR, `engine_audit_c${cycle}.json`));
  const anomalies = loadJsonSafe(path.join(OUTPUT_DIR, `engine_anomalies_c${cycle}.json`));

  if (!audit) console.warn('  warn: no engine audit JSON found — tier signals degraded');
  if (!anomalies) console.warn('  warn: no anomalies JSON found — anomaly signals unavailable');

  const assignments = [];
  const tierCounts = { A: 0, B: 0, C: 0 };

  for (const section of edition.sections) {
    for (const article of section.articles) {
      const result = classifyArticle(article, section.title, audit, anomalies);
      assignments.push(result);
      tierCounts[result.tier]++;
      const mark = result.tier === 'A' ? '★' : result.tier === 'B' ? '●' : '○';
      console.log(`  ${mark} Tier ${result.tier}  ${result.section.padEnd(20)} ${result.headline.substring(0, 60)}`);
    }
  }

  const output = {
    cycle,
    classifierVersion: CLASSIFIER_VERSION,
    generatedAt: new Date().toISOString(),
    editionFile: `cycle_pulse_edition_${cycle}.txt`,
    auditFile: audit ? `engine_audit_c${cycle}.json` : null,
    anomaliesFile: anomalies ? `engine_anomalies_c${cycle}.json` : null,
    summary: {
      total: assignments.length,
      tierA: tierCounts.A,
      tierB: tierCounts.B,
      tierC: tierCounts.C,
      tierAPercent: assignments.length ? Number((tierCounts.A / assignments.length * 100).toFixed(1)) : 0,
    },
    assignments,
    reviewGuidance: {
      tierA: 'Full review: capability + Rhea sourcing + cycle-review reasoning + Mara result validity + two-pass hallucination + Final Arbiter',
      tierB: 'Editor pass: Rhea sourcing + cycle-review reasoning. Skip Mara unless completeness unclear.',
      tierC: 'Automated only: Rhea sourcing regex + anomaly flag. No reviewer agents.',
    },
  };

  const outputPath = path.join(OUTPUT_DIR, `tier_assignments_c${cycle}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`\nSummary: ${assignments.length} articles`);
  console.log(`  Tier A (full review):    ${tierCounts.A}`);
  console.log(`  Tier B (editor pass):    ${tierCounts.B}`);
  console.log(`  Tier C (automated only): ${tierCounts.C}`);
  console.log(`  output: ${outputPath}`);
}

main();
