#!/usr/bin/env node
/**
 * gapLogGate.js — RB-1 (C96 gap-log triage, governance.33)
 *
 * Mechanical gate that refuses to let a heavy-skill run close without its gap
 * section in the cycle's one-true gap log. Root cause (G-S1): the gap-log step
 * is a written SKILL.md instruction the LLM operator can — and did — skip. A
 * written instruction can't enforce itself; this script + the Stop hook can.
 *
 * Canonical gap log (RB-1 folds RB-2 naming reconcile):
 *   output/production_log_run_cycle_c{XX}_gaps.md   — ONE per cycle.
 * The engine cycle audit (scripts/engineCycleAudit.js) opens it each cycle and
 * writes the G-EC leg; operator-run skills APPEND a leg section with a fixed,
 * greppable header:
 *   ## LEG: /sift (G-S)
 *   ## LEG: /write-edition (G-W)
 *   ## LEG: /city-hall (G-R)
 *   ## LEG: /city-hall-prep (G-PREP)
 * Clean runs still write the header + "No gaps this run." — presence of the
 * header, not of gap entries, is what the gate checks (so clean runs pass).
 *
 * Only OPERATOR-run skills are gated. The engine G-EC leg is mechanical and
 * never operator-skipped, so it is out of scope.
 *
 * Two modes:
 *   --cycle <N> --skill <name>   In-skill self-check. Exit 0 if the leg exists,
 *                                exit 1 (loud) otherwise. The skill's final step
 *                                runs this; "close" is defined as exit 0.
 *   --stop-gate                  Stop-hook backstop. Reads the live cycle from
 *                                SESSION_CONTEXT.md + the session-start stamp,
 *                                and for each gated skill whose primary artifact
 *                                was produced THIS session checks the leg. Any
 *                                missing leg -> emits {"decision":"block",...}
 *                                so the session cannot close until it is written.
 *
 * Safety:
 *   - Stop-gate is FAIL-OPEN on every error/ambiguity (can't read cycle, no
 *     stamp, unreadable file) — a backstop that false-blocks is worse than one
 *     that occasionally false-passes, because the in-skill --skill check is the
 *     primary. It only blocks on a POSITIVE signal: artifact mtime in-session
 *     AND leg absent.
 *   - Escape hatch: GAPLOG_GATE_OFF=1 makes --stop-gate exit 0 silently.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// skill -> { prefix, leg header literal, artifact globs (relative to ROOT) }
// {XX} in artifact paths is replaced with the zero-padding-free cycle number.
const GATED_SKILLS = {
  'sift': {
    prefix: 'G-S',
    leg: '## LEG: /sift (G-S)',
    artifacts: ['output/dispatch_c{XX}.json'],
  },
  'write-edition': {
    prefix: 'G-W',
    leg: '## LEG: /write-edition (G-W)',
    artifacts: ['editions/cycle_pulse_edition_{XX}.txt'],
  },
  'city-hall': {
    prefix: 'G-R',
    leg: '## LEG: /city-hall (G-R)',
    // any civic-voice result file for the cycle signals the run happened
    artifacts: ['output/civic-voice/*_c{XX}.json'],
  },
  'city-hall-prep': {
    prefix: 'G-PREP',
    leg: '## LEG: /city-hall-prep (G-PREP)',
    artifacts: ['output/civic-voice-workspace/'],
  },
};

function gapLogPath(cycle) {
  return path.join(ROOT, 'output', `production_log_run_cycle_c${cycle}_gaps.md`);
}

// Leg present? Match the "## LEG: /<skill>" header, tolerant of the (G-X) suffix
// and surrounding whitespace, case-insensitive on the skill path.
function legPresent(gapLogText, skill) {
  const re = new RegExp(`^##\\s*LEG:\\s*/${escapeRe(skill)}\\b`, 'im');
  return re.test(gapLogText);
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Resolve an artifact glob (only '*' in the basename supported) to matching
// files, returning their mtimes (ms). A bare directory path returns the dir's
// own mtime if it exists.
function artifactMtimes(globRel, cycle) {
  const rel = globRel.replace(/\{XX\}/g, cycle);
  const abs = path.join(ROOT, rel);
  // directory signal
  if (!rel.includes('*')) {
    try {
      const st = fs.statSync(abs);
      return [st.mtimeMs];
    } catch { return []; }
  }
  // glob with '*' in basename
  const dir = path.dirname(abs);
  const base = path.basename(abs);
  const re = new RegExp('^' + base.split('*').map(escapeRe).join('.*') + '$');
  let entries;
  try { entries = fs.readdirSync(dir); } catch { return []; }
  const out = [];
  for (const e of entries) {
    if (re.test(e)) {
      try { out.push(fs.statSync(path.join(dir, e)).mtimeMs); } catch { /* skip */ }
    }
  }
  return out;
}

function readCycleFromSessionContext() {
  try {
    const txt = fs.readFileSync(path.join(ROOT, 'SESSION_CONTEXT.md'), 'utf8');
    const m = txt.match(/Cycle:\s*(\d+)/);
    return m ? m[1] : null;
  } catch { return null; }
}

function readSessionStartMs() {
  try {
    const s = fs.readFileSync(path.join(ROOT, '.claude/state/session-start.txt'), 'utf8').trim();
    const secs = parseInt(s, 10);
    return Number.isFinite(secs) ? secs * 1000 : null;
  } catch { return null; }
}

// ---- mode: --cycle N --skill name (in-skill self-check) ----
function runSelfCheck(cycle, skill) {
  const cfg = GATED_SKILLS[skill];
  if (!cfg) {
    console.error(`gapLogGate: unknown skill '${skill}'. Gated: ${Object.keys(GATED_SKILLS).join(', ')}`);
    process.exit(2);
  }
  const p = gapLogPath(cycle);
  let txt;
  try {
    txt = fs.readFileSync(p, 'utf8');
  } catch {
    console.error(`GAP-LOG GATE FAIL: ${path.relative(ROOT, p)} does not exist.\n` +
      `Write the cycle gap log and append your leg before closing /${skill}:\n  ${cfg.leg}`);
    process.exit(1);
  }
  if (!legPresent(txt, skill)) {
    console.error(`GAP-LOG GATE FAIL: '${cfg.leg}' missing from ${path.relative(ROOT, p)}.\n` +
      `Append the /${skill} leg (even on a clean run: header + "No gaps this run.") before close.`);
    process.exit(1);
  }
  console.log(`OK gap-log leg present: ${cfg.leg} in ${path.relative(ROOT, p)}`);
  process.exit(0);
}

// ---- mode: --stop-gate (Stop-hook backstop) ----
function runStopGate() {
  // Escape hatch + fail-open guards: any of these => silent pass.
  if (process.env.GAPLOG_GATE_OFF === '1') process.exit(0);

  const cycle = readCycleFromSessionContext();
  const startMs = readSessionStartMs();
  if (!cycle || !startMs) process.exit(0); // can't bound the window -> fail open

  const p = gapLogPath(cycle);
  let txt = '';
  try { txt = fs.readFileSync(p, 'utf8'); } catch { txt = ''; }

  const missing = [];
  for (const [skill, cfg] of Object.entries(GATED_SKILLS)) {
    // did this skill run THIS session? (any artifact with mtime >= session start)
    let ranThisSession = false;
    for (const g of cfg.artifacts) {
      if (artifactMtimes(g, cycle).some((m) => m >= startMs)) { ranThisSession = true; break; }
    }
    if (!ranThisSession) continue;
    if (!legPresent(txt, skill)) missing.push(cfg);
  }

  if (missing.length === 0) process.exit(0);

  const lines = missing.map((c) => `  ${c.leg}`).join('\n');
  const reason =
    `Gap-log gate (RB-1): ${missing.length} heavy skill(s) ran this session but their ` +
    `gap-log leg is missing from output/production_log_run_cycle_c${cycle}_gaps.md.\n` +
    `Append the missing leg(s) — header + gaps, or header + "No gaps this run." on a clean run:\n` +
    `${lines}\n` +
    `This is the G-S1 root cause (operator skipped the gap-log step). Write the leg(s), then close. ` +
    `Deliberate bypass: set GAPLOG_GATE_OFF=1.`;

  process.stdout.write(JSON.stringify({ decision: 'block', reason }) + '\n');
  process.exit(0);
}

// ---- arg parse ----
function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--stop-gate')) return runStopGate();

  const cycleI = argv.indexOf('--cycle');
  const skillI = argv.indexOf('--skill');
  if (cycleI !== -1 && skillI !== -1) {
    return runSelfCheck(argv[cycleI + 1], argv[skillI + 1]);
  }

  console.error('usage:\n' +
    '  node scripts/gapLogGate.js --cycle <N> --skill <sift|write-edition|city-hall|city-hall-prep>\n' +
    '  node scripts/gapLogGate.js --stop-gate');
  process.exit(2);
}

main();
