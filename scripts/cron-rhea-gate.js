#!/usr/bin/env node
/**
 * Headless Rhea Canon/Fact Gate — scripts/cron-rhea-gate.js
 *
 * Task 2 of docs/plans/2026-07-20-headless-newsroom-pipeline.md. The independent
 * canon gate for the headless newsroom: it verifies a writer-worker draft against
 * the current world state + canon and returns a pass/flags verdict.
 *
 * SURFACE (S325 decision): this runs at the CLAUDE CODE HEADLESS level (`claude -p`),
 * NOT as a raw-API loop like cron-desk-writer.js. Canon verification is tool-heavy
 * (Read/Grep + GodWorld MCP + dashboard) and Claude Code's harness does tools
 * reliably; raw-API loops rabbit-hole. The wrapper invokes the EXISTING
 * `.claude/agents/rhea-morgan` reviewer (she reads her own RULES at runtime), so
 * this file is glue, not a re-implementation of Rhea.
 *
 * WHY an independent gate: the writer's own scorecard self-score is lenient
 * (DeepSeek graded itself "0 hallucinations" despite a "78 OVR" leak — S325). The
 * fact/canon check must be a model that did NOT write the draft.
 *
 * Usage:
 *   node scripts/cron-rhea-gate.js --draft output/cron-compare/sports_c101_deepseek-deepseek-chat.md
 *   node scripts/cron-rhea-gate.js --draft <path> --cycle 101 --model sonnet
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const COMPARE_DIR = path.join(ROOT, 'output', 'cron-compare');
const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const DRAFT = arg('--draft', null);
const MODEL = arg('--model', 'sonnet');          // authoritative gate → Sonnet (Haiku tunable later, per source-search precedent)
const CYCLE_ARG = arg('--cycle', null);
const TIMEOUT_MS = parseInt(arg('--timeout', '420000'), 10);

const log = {
  info: (...a) => console.log('[INFO]', new Date().toISOString(), ...a),
  warn: (...a) => console.warn('[WARN]', new Date().toISOString(), ...a),
  error: (...a) => console.error('[ERROR]', new Date().toISOString(), ...a)
};

// Freshest-wins cycle detection (sim clock — same rule as the writer)
function detectCycle() {
  try {
    const nums = fs.readdirSync(path.join(ROOT, 'output'))
      .map(f => (f.match(/^world_summary_c(\d+)\.md$/) || [])[1])
      .filter(Boolean).map(Number);
    if (nums.length) return String(Math.max(...nums));
  } catch (_) {}
  return 'current';
}

function buildPrompt(cycle, draftRel, worldRel) {
  return [
    'You are Rhea Morgan, the Cycle Pulse verification agent, running headless as a publish gate.',
    'First read your role and rules: .claude/agents/rhea-morgan/RULES.md and .claude/agents/rhea-morgan/IDENTITY.md.',
    'Ground truth for this cycle is the world state: ' + worldRel + ' (cycle ' + cycle + ').',
    'The draft to verify is: ' + draftRel + '.',
    '',
    'Cross-check EVERY named person, team, record, score, vote, trade, and roster fact in the draft against the ' +
    'world state and canon. Use Read/Grep, the dashboard API at http://localhost:3001, or the godworld MCP if available. ' +
    'Do NOT trust the draft\'s own EVIDENCE/sourcing blocks — verify independently.',
    '',
    'Flag: (a) any claim not grounded in the world state or canon; (b) invented names, numbers, or events; ' +
    '(c) ENGINE-metric leaks per newsroom.md — "tension score", "severity level", "civic load", raw decimals/dial ' +
    'values, engine phase/system language. DO NOT flag legitimate sports-game stats — OVR/overall ratings, potential ' +
    'grades, avg/HR/RBI/ERA, records, standings are canon (GodWorld sports is a game). (d) canon contradictions ' +
    '(wrong GM/manager/roster).',
    '',
    'Be EFFICIENT: verify the named people, records, trades, and votes against the world state and canon in a ' +
    'handful of tool calls — do not exhaustively read the whole archive. When you have checked the load-bearing ' +
    'facts, stop and return the verdict.',
    '',
    'Return ONLY a JSON object — no prose, no markdown fences:',
    '{"pass": <true only if there are ZERO high-severity flags>, "flags": [{"claim":"...","issue":"...","severity":"low|med|high"}], "summary":"<one line>"}'
  ].join('\n');
}

function main() {
  if (!DRAFT) throw new Error('--draft <path> is required');
  const draftAbs = path.resolve(ROOT, DRAFT);
  if (!fs.existsSync(draftAbs)) throw new Error('draft not found: ' + draftAbs);

  // Cycle from the DRAFT filename first (e.g. sports_c101_...) — the draft's own
  // cycle, NOT the newest cycle (the sim may have advanced since the draft ran).
  const draftCycle = (path.basename(draftAbs).match(/_c(\d+)/) || [])[1];
  const cycle = CYCLE_ARG || draftCycle || detectCycle();
  const worldRel = 'output/world_summary_c' + cycle + '.md';
  const draftRel = path.relative(ROOT, draftAbs);

  console.log('Headless Rhea Gate — ' + draftRel);
  console.log('===================================');
  console.log('model=' + MODEL + ' cycle=' + cycle);

  const prompt = buildPrompt(cycle, draftRel, worldRel);
  // --allowedTools whitelists read-only work (no Write/Edit); last so the variadic
  // list doesn't swallow other flags.
  const args = ['-p', prompt, '--output-format', 'json', '--model', MODEL,
    '--allowedTools', 'Read', 'Glob', 'Grep', 'Bash'];

  const started = Date.now();
  log.info('invoking claude -p (headless rhea)...');
  let stdout;
  try {
    stdout = execFileSync(CLAUDE_BIN, args, { cwd: ROOT, encoding: 'utf8', timeout: TIMEOUT_MS, maxBuffer: 20 * 1024 * 1024 });
  } catch (e) {
    // execFileSync throws on non-zero exit / timeout; keep whatever stdout we got
    stdout = (e.stdout && e.stdout.toString()) || '';
    if (!stdout) throw new Error('claude -p failed: ' + (e.message || e));
    log.warn('claude -p exited non-zero but produced stdout — parsing anyway.');
  }
  const durationMs = Date.now() - started;

  // Envelope from --output-format json: { result, is_error, total_cost_usd, usage, ... }
  let envelope;
  try { envelope = JSON.parse(stdout); }
  catch (e) { throw new Error('could not parse claude envelope JSON: ' + e.message + ' | ' + stdout.slice(0, 400)); }

  const resultText = typeof envelope.result === 'string' ? envelope.result : JSON.stringify(envelope.result || '');
  let verdict;
  try { const m = resultText.match(/\{[\s\S]*\}/); verdict = JSON.parse(m ? m[0] : resultText); }
  catch (_) { verdict = { pass: null, flags: [], summary: 'verdict parse failed', parseError: true, raw: resultText.slice(0, 600) }; }

  const out = {
    draft: draftRel, cycle, model: MODEL,
    pass: verdict.pass ?? null,
    flags: Array.isArray(verdict.flags) ? verdict.flags : [],
    flagCount: Array.isArray(verdict.flags) ? verdict.flags.length : null,
    highSeverityCount: Array.isArray(verdict.flags) ? verdict.flags.filter(f => (f.severity || '').toLowerCase() === 'high').length : null,
    summary: verdict.summary || '',
    apiCostUsd: envelope.total_cost_usd ?? null,
    durationMs,
    parseError: verdict.parseError || false,
    ranAt: new Date().toISOString()
  };

  fs.mkdirSync(COMPARE_DIR, { recursive: true });
  const base = path.basename(draftAbs).replace(/\.md$/, '');
  const outPath = path.join(COMPARE_DIR, base + '.rhea.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log('\n--- rhea verdict ---');
  console.log(JSON.stringify(out, null, 2));
  console.log('\nverdict → ' + path.relative(ROOT, outPath) + '  (' + durationMs + 'ms)');

  // Exit code: 0 = pass, 2 = flagged/fail, 3 = parse error (so an orchestrator can branch)
  process.exit(out.parseError ? 3 : (out.pass === true ? 0 : 2));
}

try { main(); }
catch (err) { log.error('Fatal: ' + err.message); process.exit(1); }
