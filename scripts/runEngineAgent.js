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
  { name: 'read_file', description: 'Read a repo file (path relative to repo root). Returns numbered lines (N<TAB>text). offset = first line (1-based), limit = max lines (default 400). Read large files in slices.',
    input_schema: { type: 'object', properties: { path: { type: 'string' }, offset: { type: 'integer' }, limit: { type: 'integer' } }, required: ['path'] } },
  { name: 'glob', description: 'List files matching a shell glob relative to repo root, e.g. "phase*/*.js".',
    input_schema: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] } },
  { name: 'grep', description: 'Regex search file contents under a repo path. Returns file:line matches.',
    input_schema: { type: 'object', properties: { pattern: { type: 'string' }, path: { type: 'string' } }, required: ['pattern'] } },
  // engine-wiring needs the deterministic maps, not a shell. Four fixed lookups,
  // no free-form command: the harness stays read-only and network-free.
  { name: 'map_lookup', description: 'Deterministic engine-map lookups. kind=sfield|sheet: names[] → ENGINE_STUB_REVERSE.json writers/readers. kind=ctxmap: field → scripts/ctxMap.js line-level writers/readers. kind=gitlog: path → last 6 commits. kind=mapmeta: map generated date + files/functions + newest commit date of path.',
    input_schema: { type: 'object', properties: { kind: { type: 'string', enum: ['sfield', 'sheet', 'ctxmap', 'gitlog', 'mapmeta'] }, names: { type: 'array', items: { type: 'string' } }, field: { type: 'string' }, path: { type: 'string' } }, required: ['kind'] } },
];

function mapLookup(input) {
  const { execFileSync } = require('child_process');
  const kind = String(input.kind || '');
  if (kind === 'sfield' || kind === 'sheet') {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/engine/ENGINE_STUB_REVERSE.json'), 'utf8'));
    const table = kind === 'sfield' ? d.sFields : d.sheets;
    const names = Array.isArray(input.names) ? input.names : [];
    if (!names.length) return 'TOOL_FAILED: names[] required for kind=' + kind;
    return names.map((n) => n + ' ' + (table[n] ? JSON.stringify(table[n]) : 'NOT IN MAP')).join('\n');
  }
  const ident = (v) => /^[A-Za-z0-9_./-]+$/.test(String(v || ''));
  if (kind === 'ctxmap') {
    if (!ident(input.field)) return 'TOOL_FAILED: field required (identifier only)';
    return execFileSync('node', ['scripts/ctxMap.js', input.field], { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
  }
  if (kind === 'gitlog') {
    if (!ident(input.path)) return 'TOOL_FAILED: path required (repo-relative, no spaces)';
    safe(input.path);
    return execFileSync('git', ['log', '--oneline', '-6', '--', input.path], { cwd: ROOT, encoding: 'utf8', timeout: 30000 }) || '(no commits)';
  }
  if (kind === 'mapmeta') {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/engine/ENGINE_STUB_REVERSE.json'), 'utf8'));
    let newest = '';
    if (ident(input.path)) {
      safe(input.path);
      newest = execFileSync('git', ['log', '-1', '--format=%cs', '--', input.path], { cwd: ROOT, encoding: 'utf8', timeout: 30000 }).trim();
    }
    return `map generated ${d.generated} | files ${d.filesScanned} | functions ${d.functionsMapped}` + (newest ? ` | newest commit on ${input.path}: ${newest}` : '');
  }
  return 'TOOL_FAILED: unknown kind ' + kind;
}

// Coverage is counted by the HARNESS, never by the agent. Run 3 of engine-validator
// reported "Files scanned: 124" when 136 exist — an agent must not be trusted to
// state its own denominator.
const COVERAGE = { read: new Set(), grepped: new Set() };

function safe(rel) {
  const abs = path.resolve(ROOT, String(rel || ''));
  if (!abs.startsWith(ROOT + path.sep) && abs !== ROOT) throw new Error('path escapes repo root: ' + rel);
  return abs;
}

// NO SHELL. The first version of these tools interpolated model-supplied strings
// into `bash -lc` — `ls -1 ${pattern}` and `grep ... ${target}` were unquoted, so
// an agent could return pattern:"x; <anything>" and get arbitrary shell out of a
// harness advertised as read-only. That is exactly the harness-escape class this
// fleet is supposed to be safe against, and it shipped in the first engine agent.
// Globs are now expanded in Node and every exec goes through argv, never a shell.

const SKIP_DIRS = new Set(['node_modules', '.git', '.venv', 'backups', 'graphify-out']);

function walk(dir, out, depth) {
  if (depth > 12) return out;
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.claude') continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(abs, out, depth + 1); }
    else out.push(path.relative(ROOT, abs));
  }
  return out;
}

let _tree = null;
function repoFiles() { if (!_tree) _tree = walk(ROOT, [], 0); return _tree; }

// glob -> RegExp. ** spans separators, * does not, ? is one non-separator char.
function globToRe(glob) {
  let re = '';
  const g = String(glob || '');
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') { re += '.*'; i++; if (g[i + 1] === '/') i++; }
      else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}

function matchGlob(pattern) {
  const p = String(pattern || '').replace(/^\.\//, '');
  const re = globToRe(p);
  return repoFiles().filter((f) => re.test(f));
}

// Resolve a tool `path` argument that may be a plain dir, a file, or a glob.
function resolveTargets(target) {
  const t = String(target || '.').replace(/^\.\//, '');
  if (t === '.' || t === '') return repoFiles().filter((f) => f.endsWith('.js'));
  if (/[*?]/.test(t)) return matchGlob(t);
  const abs = safe(t);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isDirectory()) {
    const prefix = t.endsWith('/') ? t : t + '/';
    return repoFiles().filter((f) => f.startsWith(prefix) && /\.(js|md|json)$/.test(f));
  }
  return [t];
}

function runTool(name, input) {
  try {
    if (name === 'read_file') {
      // Numbered lines + offset/limit honored. Without numbers the model invents
      // file:line (headless Haiku run 2026-08-29 cited :45/:50/:97 for writes that
      // sit at :35/:98/:125); without offset/limit it re-reads 2k-line files whole.
      const rows = fs.readFileSync(safe(input.path), 'utf8').split('\n');
      COVERAGE.read.add(String(input.path));
      const start = Math.max(1, Number(input.offset) || 1);
      const limit = Math.max(1, Number(input.limit) || 400);
      const slice = rows.slice(start - 1, start - 1 + limit);
      const body = slice.map((l, i) => (start + i) + '\t' + l).join('\n');
      const more = start - 1 + limit < rows.length ? `\n…[${rows.length - (start - 1 + limit)} more lines; total ${rows.length} — read again with offset]` : '';
      return body + more;
    }
    if (name === 'glob') {
      const hits = matchGlob(input.pattern).slice(0, 400);
      return hits.length ? hits.join('\n')
        : 'TOOL_FAILED: no file matched ' + input.pattern + '. Nothing was listed; do not assume the set is empty — try another pattern.';
    }
    if (name === 'grep') {
      // .js/.md/.json — ROLLOUT_PLAN.md and SHEETS_MANIFEST.md are legitimate grep
      // targets; the old .js-only filter made the agent report them as nonexistent.
      const files = resolveTargets(input.path).filter((f) => /\.(js|md|json)$/.test(f));
      if (!files.length) {
        return 'TOOL_FAILED: no file matched path ' + (input.path || '.') +
          '. Nothing was scanned. Do NOT report results for this path — fix the path and retry, ' +
          'or state in your report that this path could not be scanned.';
      }
      let re;
      try { re = new RegExp(String(input.pattern), 'i'); }
      catch (e) { return 'TOOL_FAILED: bad regex ' + JSON.stringify(input.pattern) + ' — ' + e.message; }
      const lines = [];
      let scanned = 0;
      for (const f of files) {
        if (lines.length >= 400) break;
        let text;
        try { text = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (_) { continue; }
        scanned++;
        const rows = text.split('\n');
        for (let i = 0; i < rows.length; i++) {
          if (re.test(rows[i])) {
            lines.push(f + ':' + (i + 1) + ':' + rows[i].trim().slice(0, 300));
            if (lines.length >= 400) break;
          }
        }
      }
      COVERAGE.grepped = new Set([...COVERAGE.grepped, ...files.slice(0, scanned)]);
      const head = `[scanned ${scanned} file(s) for this call]`;
      return lines.length ? head + '\n' + lines.join('\n') : head + '\n(no matches)';
    }
    if (name === 'map_lookup') return mapLookup(input);
    return 'unknown tool: ' + name;
  } catch (e) { return 'TOOL_FAILED: ' + e.message + ' — nothing was scanned; do not report results for this call.'; }
}

// ---------------------------------------------------------------------------

const kickoff =
  'Do your job now, on this repository, following your own instructions above. ' +
  'You have read_file, glob, grep and map_lookup — use them; do not answer from assumption. ' +
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

  // COVERAGE FOOTER — appended by the harness, not written by the agent. The agent
  // states findings; the harness states what was actually opened. These are allowed
  // to disagree, and when they do, the footer is the true one.
  const universe = repoFiles().filter((f) => /^phase\d/.test(f) && f.endsWith('.js'));
  const touched = new Set([...COVERAGE.read, ...COVERAGE.grepped]
    .map((f) => String(f).replace(/^\.\//, '')).filter((f) => universe.includes(f)));
  const missed = universe.filter((f) => !touched.has(f));
  const footer = [
    '', '---', '', '## Coverage (measured by the harness, not claimed by the agent)', '',
    `- engine phase files in repo: **${universe.length}**`,
    `- opened by this run: **${touched.size}** (${universe.length ? Math.round(100 * touched.size / universe.length) : 0}%)`,
    `- never opened: **${missed.length}**`,
    missed.length ? '\n<details><summary>files this report did NOT look at</summary>\n\n' +
      missed.map((f) => '- ' + f).join('\n') + '\n\n</details>' : '',
    '', `_agent=${AGENT} model=${MODEL} provider=${PROVIDER} turns=${turns} toolCalls=${toolCalls} in=${inTok} out=${outTok}_`,
    '_Any count in the report above that disagrees with this footer is the agent\'s claim, not a measurement._',
  ].join('\n');

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const out = arg('--out', path.join(ROOT, 'output', `agent_${AGENT}_${stamp}.md`));
  fs.writeFileSync(out, (final || '(agent produced no final text)') + '\n' + footer);
  console.error(`coverage: ${touched.size}/${universe.length} engine phase files opened`);
  console.error(`\nturns=${turns} toolCalls=${toolCalls} in=${inTok} out=${outTok} model=${MODEL}`);
  console.error(`report -> ${out}`);
  console.log(final || '(agent produced no final text)');
})().catch((e) => { console.error('[FATAL]', e.message); process.exit(1); });
