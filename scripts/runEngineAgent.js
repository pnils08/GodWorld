#!/usr/bin/env node
/**
 * runEngineAgent.js — isolated engine-agent harness.
 * Plan: docs/plans/2026-08-22-engine-agent-fleet.md
 *
 * The newsroom already runs agents this way (cron-desk-writer.js): raw API +
 * tool-use loop, the agent's OWN file as the system prompt, no session
 * scaffolding. This is the same shape with the newsroom stripped out and the
 * engine's needs in its place.
 *
 * What "isolated" means here, precisely: this process never reads CLAUDE.md,
 * SESSION_CONTEXT.md, identity.md, TERMINAL.md, MEMORY.md, or any boot hook.
 * The agent knows what its own files say and nothing else. That is the whole
 * point — a phase agent should not inherit a chat session's context, and a
 * chat session should not be doing a phase agent's job.
 *
 * READ-ONLY BY DEFAULT. Engine agents analyse engine code. A desk agent is
 * sandboxed to output/cron-compare/ because a bad article is recoverable; an
 * agent that can edit engine code is a different risk class and that call is
 * the builder's, not this script's (plan §6 Q1). So: read_file / glob / grep,
 * and the report comes back as the agent's final text, written to output/ by
 * THIS process — the agent itself gets no write tool.
 *
 * Usage:
 *   node scripts/runEngineAgent.js --agent engine-validator
 *   node scripts/runEngineAgent.js --agent engine-validator --task "only phase05"
 *   node scripts/runEngineAgent.js --agent engine-validator --provider anthropic --model claude-sonnet-5
 *   node scripts/runEngineAgent.js --agent engine-validator --dry-run   # print the system prompt, no call
 *
 * Flags:
 *   --agent <name>    .claude/agents/<name>/  (IDENTITY.md + optional LENS/RULES/SKILL)
 *   --task "..."      extra instruction appended to the kickoff
 *   --provider        openrouter (default) | anthropic
 *   --model           default deepseek/deepseek-chat (openrouter) / claude-sonnet-5 (anthropic)
 *   --max-turns N     default 30 — engine analysis is grep-heavy
 *   --out <path>      default output/agent_<name>_<stamp>.md
 *   --dry-run         assemble and print, make no API call
 */

'use strict';

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = '/root/GodWorld';
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return (i === -1 || i === process.argv.length - 1) ? d : process.argv[i + 1];
};

const AGENT = arg('--agent', null);
const TASK = arg('--task', '');
const PROVIDER = arg('--provider', 'openrouter');
const MODEL = arg('--model', PROVIDER === 'anthropic' ? 'claude-sonnet-5' : 'deepseek/deepseek-chat');
const MAX_TURNS = Number(arg('--max-turns', 30));
const DRY = process.argv.includes('--dry-run');

if (!AGENT) { console.error('usage: node scripts/runEngineAgent.js --agent <name> [--task "..."] [--dry-run]'); process.exit(1); }

const AGENT_DIR = path.join(ROOT, '.claude', 'agents', AGENT);
if (!fs.existsSync(AGENT_DIR)) { console.error(`no agent dir at ${AGENT_DIR}`); process.exit(1); }

// The agent's own files ARE the system prompt. Nothing else is loaded.
const parts = ['IDENTITY.md', 'LENS.md', 'RULES.md', 'SKILL.md']
  .map((f) => { try { return fs.readFileSync(path.join(AGENT_DIR, f), 'utf8'); } catch (_) { return ''; } })
  .filter(Boolean);
if (!parts.length) { console.error(`no IDENTITY/LENS/RULES/SKILL in ${AGENT_DIR}`); process.exit(1); }
const system = parts.join('\n\n---\n\n');

// ---------------------------------------------------------------------------
// Tools — read-only, repo-scoped. A path that escapes the repo is refused
// rather than clamped, so a mistake surfaces instead of silently reading
// somewhere else.
// ---------------------------------------------------------------------------
const TOOLS = [
  { name: 'read_file', description: 'Read a repo file (path relative to repo root). Returns its text.',
    input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'glob', description: 'List files matching a shell glob relative to repo root, e.g. "phase*/*.js".',
    input_schema: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] } },
  { name: 'grep', description: 'Regex search file contents under a repo path. Returns file:line matches.',
    input_schema: { type: 'object', properties: { pattern: { type: 'string' }, path: { type: 'string' } }, required: ['pattern'] } },
];

function safe(rel) {
  const abs = path.resolve(ROOT, String(rel || ''));
  if (!abs.startsWith(ROOT + path.sep) && abs !== ROOT) throw new Error('path escapes repo root: ' + rel);
  return abs;
}
function sh(cmd, args) {
  try { return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 60000 }); }
  catch (e) { return String((e.stdout || '') + (e.stderr || '')) || '(no matches)'; }
}
function runTool(name, input) {
  try {
    if (name === 'read_file') {
      const t = fs.readFileSync(safe(input.path), 'utf8');
      return t.length > 120000 ? t.slice(0, 120000) + '\n…[truncated]' : t;
    }
    if (name === 'glob') {
      const g = sh('bash', ['-lc', `cd ${ROOT} && ls -1 ${input.pattern} 2>/dev/null | head -400`]);
      return g.trim() || 'TOOL_FAILED: no file matched ' + input.pattern + '. Nothing was listed; do not assume the set is empty — try another pattern.';
    }
    if (name === 'grep') {
      // The path may be a GLOB ("phase*/*.js"), not a directory. The first version
      // passed it straight to grep, which answered "No such file or directory" — and
      // the agent turned that failure into a clean passing report rather than saying
      // its tool broke. Expand through the shell so a glob works, and make a genuine
      // failure loud (see TOOL_FAILED below).
      const target = input.path ? String(input.path) : '.';
      safe(target.split('*')[0] || '.');
      const q = (x) => "'" + String(x).replace(/'/g, "'\\''") + "'";
      const out = sh('bash', ['-lc',
        `cd ${ROOT} && grep -rnE --include=*.js ${q(input.pattern)} ${target} 2>&1 || true`]);
      if (/No such file or directory/.test(out)) {
        return 'TOOL_FAILED: no file matched path ' + target +
          '. Nothing was scanned. Do NOT report results for this path — fix the path and retry, ' +
          'or state in your report that this path could not be scanned.';
      }
      const lines = out.split('\n').filter(Boolean).slice(0, 400).map((l) => l.replace(ROOT + '/', ''));
      return lines.length ? lines.join('\n') : '(no matches)';
    }
    return 'unknown tool: ' + name;
  } catch (e) { return 'TOOL_FAILED: ' + e.message + ' — nothing was scanned; do not report results for this call.'; }
}

// ---------------------------------------------------------------------------

const kickoff =
  'Do your job now, on this repository, following your own instructions above. ' +
  'You have read_file, glob and grep — use them; do not answer from assumption. ' +
  'You cannot write files: your FINAL message must be the complete report in the ' +
  'exact Output Format your instructions specify. Do not stop early, and do not ' +
  'ask questions — there is nobody to answer them.\n\n' +
  'TOOL FAILURES ARE FINDINGS, NOT NOISE. If a tool returns TOOL_FAILED, that path was ' +
  'NOT scanned. Never report a result — pass or fail — for anything you did not actually ' +
  'read. Retry with a corrected path, and if you still cannot scan something, say so ' +
  'explicitly in the report and give the real counts. A clean report built on a broken ' +
  'tool is worse than no report.' + (TASK ? '\n\nExtra scope for this run: ' + TASK : '');

if (DRY) {
  console.log('=== AGENT ===', AGENT, '| provider', PROVIDER, '| model', MODEL, '| max-turns', MAX_TURNS);
  console.log('=== SYSTEM (' + system.length + ' chars, the agent\'s own files ONLY) ===\n' + system.slice(0, 1500) + '\n…');
  console.log('=== KICKOFF ===\n' + kickoff);
  console.log('\n(dry-run: no API call)');
  process.exit(0);
}

const Anthropic = require('@anthropic-ai/sdk');
const client = PROVIDER === 'anthropic'
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : new Anthropic({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api' });

(async () => {
  const messages = [{ role: 'user', content: kickoff }];
  let turns = 0, toolCalls = 0, inTok = 0, outTok = 0, final = '';

  while (turns < MAX_TURNS) {
    turns++;
    const r = await client.messages.create({ model: MODEL, max_tokens: 8000, system, messages, tools: TOOLS });
    inTok += (r.usage && r.usage.input_tokens) || 0;
    outTok += (r.usage && r.usage.output_tokens) || 0;

    const uses = (r.content || []).filter((b) => b.type === 'tool_use');
    const text = (r.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (text.trim()) final = text;

    if (!uses.length) { console.error(`[turn ${turns}] done (no tool call)`); break; }

    messages.push({ role: 'assistant', content: r.content });
    const results = [];
    for (const u of uses) {
      toolCalls++;
      const out = runTool(u.name, u.input || {});
      console.error(`[turn ${turns}] ${u.name} ${JSON.stringify(u.input).slice(0, 100)} -> ${String(out).split('\n').length} lines`);
      results.push({ type: 'tool_result', tool_use_id: u.id, content: String(out).slice(0, 60000) });
    }
    messages.push({ role: 'user', content: results });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = arg('--out', path.join(ROOT, 'output', `agent_${AGENT}_${stamp}.md`));
  fs.writeFileSync(out, final || '(agent produced no final text)');
  console.error(`\nturns=${turns} toolCalls=${toolCalls} in=${inTok} out=${outTok} model=${MODEL}`);
  console.error(`report -> ${out}`);
  console.log(final || '(agent produced no final text)');
})().catch((e) => { console.error('[FATAL]', e.message); process.exit(1); });
