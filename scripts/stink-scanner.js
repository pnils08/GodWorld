#!/usr/bin/env node
/**
 * Stink scanner — scripts/stink-scanner.js
 *
 * (grok, 2026-08-06) Deterministic sim-stink detector for the firebrand seat.
 * Research: docs/research/2026-08-06-jax-caldera-sim-stink-audit.md
 * Plan:     docs/plans/2026-08-06-jax-sim-stink-audit.md
 *
 * Product: score ledger / desk_signal contradictions so Jax Caldera
 * (freelance-firebrand) can be force-scheduled when something actually stinks —
 * not civic process roundup, not daily chaos.
 *
 * Pure where possible: scanSignal(lanes) needs only desk_signal.lanes.
 * scanCycle(cycle) reads output/ files (no Sheets, no model calls).
 *
 * Usage:
 *   node scripts/stink-scanner.js [--cycle N] [--json]
 *   const { scanCycle, scanSignal, FORCE_THRESHOLD } = require('./stink-scanner');
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'output');

// Force Jax when top candidate score is at or above this (tuned to c102 live
// signal: math-imbalance high ≈ 58; stuck medium ≈ 37; illness ≥8% = 40).
const FORCE_THRESHOLD = 35;

// Max one forced firebrand assignment per rolling 7 calendar days (sparing heat).
const FORCE_COOLDOWN_DAYS = 7;

const SEVERITY_RE = /\((high|medium|low)\)/i;
const CLASS_RULES = [
  { re: /math-imbalance/i, className: 'metric-contradiction', bonus: 15 },
  { re: /stuck-initiative/i, className: 'implementation-gap', bonus: 12 },
  { re: /repeating-event/i, className: 'crisis-unattended', bonus: 10 },
  { re: /no matching active initiative/i, className: 'crisis-unattended', bonus: 8 },
  { re: /cover-as-story|cover as story/i, className: 'cross-surface-fight', bonus: 12 },
  { re: /silence|radio silent|no comment/i, className: 'silence-pattern', bonus: 10 },
  { re: /disburs|placement|bottleneck|not advanced|stalled/i, className: 'implementation-gap', bonus: 6 }
];

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  const eq = process.argv.find(a => a.startsWith(flag + '='));
  return eq ? eq.slice(flag.length + 1) : def;
}

function severityPoints(label) {
  const m = String(label || '').match(SEVERITY_RE);
  if (!m) return 0;
  const s = m[1].toLowerCase();
  if (s === 'high') return 30;
  if (s === 'medium') return 20;
  return 10; // low
}

function classifyLabel(label) {
  const text = String(label || '');
  let className = 'anomaly';
  let bonus = 0;
  for (const rule of CLASS_RULES) {
    if (rule.re.test(text)) {
      // first strong match wins class; stack small bonuses once each
      if (className === 'anomaly') className = rule.className;
      bonus += rule.bonus;
    }
  }
  return { className, bonus };
}

/**
 * Score one desk_signal lane entry. Returns null if not stink-eligible.
 * Sports feeds and plain hood texture without anomaly markers are skipped.
 */
function scoreEntry(entry, desk) {
  if (!entry || !entry.ref) return null;
  const label = entry.label || '';
  const kind = entry.kind || '';
  // Prefer explicit anomalies; still allow initiative/decision rows that carry
  // stuck/implementation language (implementation-gap class).
  const isAnomaly = kind === 'anomaly';
  const classed = classifyLabel(label);
  if (!isAnomaly && classed.className === 'anomaly') return null;

  let score = severityPoints(label) + classed.bonus;
  if (isAnomaly) score += 5;
  if (entry.handle && (entry.handle.angle || entry.handle.hookLine)) score += 3;

  if (score < 10) return null;

  return {
    className: classed.className,
    score,
    desk: desk || null,
    kind,
    label,
    ref: entry.ref,
    hood: entry.hood || null,
    popids: Array.isArray(entry.popids) ? entry.popids.slice() : [],
    handle: entry.handle || null,
    // story shape compatible with newsroom-fanout storyFromSeed consumers
    story: {
      ref: entry.ref,
      label: label,
      kind: kind || 'anomaly',
      angle: (entry.handle && entry.handle.angle) || label,
      hookLine: (entry.handle && entry.handle.hookLine) || null,
      citizens: (entry.handle && entry.handle.citizens) || null,
      popids: Array.isArray(entry.popids) ? entry.popids.slice() : [],
      hood: entry.hood || null,
      stinkClass: classed.className
    }
  };
}

/**
 * Scan desk_signal.lanes only — pure, no IO.
 * @param {object} lanes - { civic: [...], business: [...], ... }
 * @returns {{ candidates: object[], top: object|null, maxScore: number }}
 */
function scanSignal(lanes) {
  const candidates = [];
  const seen = new Set();
  for (const [desk, entries] of Object.entries(lanes || {})) {
    for (const e of entries || []) {
      const c = scoreEntry(e, desk);
      if (!c) continue;
      // Dedup by ref — same engine pattern often appears on civic + business.
      if (seen.has(c.ref)) {
        const prev = candidates.find(x => x.ref === c.ref);
        if (prev && c.score > prev.score) {
          prev.score = c.score;
          prev.desk = c.desk;
          prev.className = c.className;
          prev.story = c.story;
        }
        continue;
      }
      seen.add(c.ref);
      candidates.push(c);
    }
  }
  candidates.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  return {
    candidates,
    top: candidates[0] || null,
    maxScore: candidates[0] ? candidates[0].score : 0
  };
}

/**
 * Parse world_summary illness rate. Returns null if missing.
 * Snapshot line: "Illness 9.9%" or "Illness rate 9.9%"
 */
function parseIllnessRate(text) {
  if (!text) return null;
  const m = String(text).match(/Illness(?:\s+rate)?\s+(\d+(?:\.\d+)?)\s*%/i);
  return m ? parseFloat(m[1]) : null;
}

/**
 * Optional crisis-unattended candidate from world_summary illness %.
 */
function illnessCandidate(cycle, illnessRate) {
  if (illnessRate == null || Number.isNaN(illnessRate)) return null;
  if (illnessRate < 8) return null; // crisis floor — c102 is 9.9%
  const score = illnessRate >= 12 ? 50 : illnessRate >= 9 ? 40 : 35;
  const label = 'crisis-unattended (high) | City illness rate ' + illnessRate +
    '% with no desk forced onto the health signal';
  const ref = 'output/world_summary_c' + cycle + '.md#illness-rate';
  return {
    className: 'crisis-unattended',
    score,
    desk: 'civic',
    kind: 'health-crisis',
    label,
    ref,
    hood: null,
    popids: [],
    handle: {
      angle: 'City illness rate ' + illnessRate + '% — who owns the health signal and why is it not the lead?',
      hookLine: 'Illness is ' + illnessRate + ' percent and the page is still process timelines.',
      citizens: []
    },
    story: {
      ref,
      label,
      kind: 'health-crisis',
      angle: 'City illness rate ' + illnessRate + '% — who owns the health signal and why is it not the lead?',
      hookLine: 'Illness is ' + illnessRate + ' percent and the page is still process timelines.',
      citizens: null,
      popids: [],
      hood: null,
      stinkClass: 'crisis-unattended',
      illnessRate
    }
  };
}

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}

function loadText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch (_) { return null; }
}

/**
 * Full cycle scan: desk_signal + world_summary illness. No Sheets.
 */
function scanCycle(cycle, opts) {
  const o = opts || {};
  const root = o.root || ROOT;
  const signalPath = path.join(root, 'output', 'desk_signal_c' + cycle + '.json');
  const summaryPath = path.join(root, 'output', 'world_summary_c' + cycle + '.md');
  const signal = loadJson(signalPath);
  const summary = loadText(summaryPath);
  const base = scanSignal((signal && signal.lanes) || {});
  const illnessRate = parseIllnessRate(summary);
  const ill = illnessCandidate(cycle, illnessRate);
  const candidates = base.candidates.slice();
  if (ill) {
    const dup = candidates.find(c => c.ref === ill.ref);
    if (!dup) candidates.push(ill);
    else if (ill.score > dup.score) Object.assign(dup, ill);
    candidates.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  }
  const top = candidates[0] || null;
  const maxScore = top ? top.score : 0;
  return {
    cycle: Number(cycle),
    scannedAt: new Date().toISOString(),
    signalPath: signal ? signalPath : null,
    signalMissing: !signal,
    illnessRate,
    forceThreshold: FORCE_THRESHOLD,
    shouldForce: maxScore >= FORCE_THRESHOLD,
    maxScore,
    top,
    candidates: candidates.slice(0, 25), // cap artifact size
    candidateCount: candidates.length
  };
}

/**
 * Has a stink-forced firebrand assignment already landed in the last N days?
 * Reads fanout-YYYY-MM-DD.json under compareDir (default output/cron-compare).
 * excludeDate: skip this calendar day (so same-day fanout --force can re-apply).
 */
function recentForceCount(compareDir, days, asOfDate, excludeDate) {
  const dir = compareDir || path.join(ROOT, 'output', 'cron-compare');
  const daysN = days == null ? FORCE_COOLDOWN_DAYS : days;
  const asOf = asOfDate || new Date().toISOString().slice(0, 10);
  const asOfMs = Date.parse(asOf + 'T12:00:00Z');
  let files = [];
  try {
    files = fs.readdirSync(dir).filter(f => /^fanout-\d{4}-\d{2}-\d{2}\.json$/.test(f));
  } catch (_) { return { count: 0, dates: [] }; }
  const dates = [];
  for (const f of files) {
    const date = f.slice(7, 17);
    if (excludeDate && date === excludeDate) continue;
    const ms = Date.parse(date + 'T12:00:00Z');
    if (Number.isNaN(ms) || Number.isNaN(asOfMs)) continue;
    const deltaDays = (asOfMs - ms) / 86400000;
    if (deltaDays < 0 || deltaDays > daysN) continue;
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch (_) { continue; }
    for (const a of (j.assignments || [])) {
      if (a && a.stinkForce) {
        dates.push(date);
        break;
      }
    }
  }
  return { count: dates.length, dates };
}

function writeReport(cycle, report, root) {
  const r = root || ROOT;
  const p = path.join(r, 'output', 'cron-compare', 'stink_c' + cycle + '.json');
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(report, null, 2));
  return p;
}

if (require.main === module) {
  const cycle = arg('--cycle', null) || (() => {
    try {
      return require(path.join(ROOT, 'lib', 'getCurrentCycle'))({ soft: true, noArgv: true });
    } catch (_) { return null; }
  })();
  if (cycle == null) {
    console.error('stink-scanner: pass --cycle N (could not detect cycle)');
    process.exit(1);
  }
  const report = scanCycle(cycle);
  const outPath = writeReport(cycle, report);
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('stink scan c' + cycle +
      ' — candidates ' + report.candidateCount +
      ' maxScore ' + report.maxScore +
      ' threshold ' + report.forceThreshold +
      ' shouldForce ' + report.shouldForce +
      (report.illnessRate != null ? ' illness ' + report.illnessRate + '%' : ''));
    if (report.top) {
      console.log('  top [' + report.top.score + '] ' + report.top.className + ' — ' +
        String(report.top.label).slice(0, 120));
    }
    console.log('→ ' + path.relative(ROOT, outPath));
  }
}

module.exports = {
  FORCE_THRESHOLD,
  FORCE_COOLDOWN_DAYS,
  scanSignal,
  scanCycle,
  scoreEntry,
  parseIllnessRate,
  illnessCandidate,
  recentForceCount,
  writeReport,
  classifyLabel,
  severityPoints
};
