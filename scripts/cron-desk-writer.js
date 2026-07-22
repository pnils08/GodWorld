#!/usr/bin/env node
/**
 * Headless Desk Writer — scripts/cron-desk-writer.js
 *
 * A/B test harness (S325, research.25 Thread A). Runs a desk agent HEADLESS via
 * the raw Anthropic API + a tool-use loop, instead of as a Claude Code subagent,
 * so we can compare the two on the SAME cycle. This is the "cron writes the
 * article" experiment from "The Bay Awakening" (Drive 182GQ...G-Pa), built as a
 * fair test: only the harness (raw-node cron vs Claude Code subagent) varies.
 *
 * FAIRNESS CONTROLS (v1 — same model):
 *   - Same instructions : the desk's own SKILL.md is the system prompt; the model
 *     follows its boot sequence and reads IDENTITY/LENS/RULES/canon/workspace itself.
 *   - Same tools        : read_file / glob / grep / write_file — mirrors the desk
 *     frontmatter `tools: Read, Glob, Grep, Write`. Plus search_world (ranked disk
 *     search) which the subagent gets via the dashboard API.
 *   - Same model        : --model defaults to the current Sonnet (desk runs `model: sonnet`).
 *   - Same turn budget  : --max-turns defaults to 15 (desk SKILL maxTurns: 15).
 *
 * SANDBOX: every write is forced into output/cron-compare/ — the headless model
 * can never clobber the real output/desk-output/ the terminal pipeline writes.
 * Reads/glob/grep are read-only and repo-scoped (no path escape above repo root).
 *
 * Usage:
 *   node scripts/cron-desk-writer.js --desk sports
 *   node scripts/cron-desk-writer.js --desk sports --model claude-sonnet-5 --dry-run
 *
 * Requires .env: ANTHROPIC_API_KEY
 *
 * v2 (later, research.25 Thread B): add --provider openrouter to sweep cheaper
 * models for creative writing. The API call is isolated in callModel() for that.
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');
const mags = require('../lib/mags');

const ROOT = path.join(__dirname, '..');
const COMPARE_DIR = path.join(ROOT, 'output', 'cron-compare');

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const DESK = arg('--desk', 'sports');
const PROVIDER = arg('--provider', 'anthropic');   // 'anthropic' (Claude Code parity) | 'openrouter' (cheap-model sweep, research.25 Thread B)
const MODEL = arg('--model', PROVIDER === 'openrouter' ? 'deepseek/deepseek-chat' : 'claude-sonnet-5');
const MODEL_SLUG = MODEL.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const MAX_TURNS = parseInt(arg('--max-turns', '15'), 10);
const MAX_TOKENS = parseInt(arg('--max-tokens', '16000'), 10);   // a full multi-article section > 8k (S325: 8k truncated Sonnet mid-Article-2)
const DRY_RUN = process.argv.includes('--dry-run');

// Approx USD per 1M tokens [input, output] — for the scorecard's apiCostUsd (estimate).
const RATES = {
  'claude-sonnet-5': [3, 15],
  'claude-opus-4-8': [15, 75],
  'deepseek/deepseek-chat': [0.14, 0.28],
  _default: [3, 15]
};
function costUsd(model, tin, tout) {
  const r = RATES[model] || RATES._default;
  return +(((tin / 1e6) * r[0]) + ((tout / 1e6) * r[1])).toFixed(4);
}

const AGENT_DIR = path.join(ROOT, '.claude', 'agents', DESK + '-desk');
const SKILL_PATH = path.join(AGENT_DIR, 'SKILL.md');

const log = {
  info: (...a) => console.log('[INFO]', new Date().toISOString(), ...a),
  warn: (...a) => console.warn('[WARN]', new Date().toISOString(), ...a),
  error: (...a) => console.error('[ERROR]', new Date().toISOString(), ...a)
};

// ---------------------------------------------------------------------------
// Cycle detection (best-effort, from the desk workspace)
// ---------------------------------------------------------------------------
function detectCycle() {
  // Freshest-wins: world_summary_c{NN}.md is written EVERY cycle, independent of
  // the (paused) edition pipeline, so it is the true current cycle. The desk
  // workspace JSON only refreshes when editions run — it is stale.
  try {
    const nums = fs.readdirSync(path.join(ROOT, 'output'))
      .map(f => (f.match(/^world_summary_c(\d+)\.md$/) || [])[1])
      .filter(Boolean).map(Number);
    if (nums.length) return String(Math.max(...nums));
  } catch (_) {}
  return 'current';
}

// ---------------------------------------------------------------------------
// Safety: keep a resolved path inside the repo (read tools) or inside the
// compare sandbox (write tool).
// ---------------------------------------------------------------------------
function resolveInRepo(p) {
  const abs = path.resolve(ROOT, p);
  if (abs !== ROOT && !abs.startsWith(ROOT + path.sep)) {
    throw new Error('path escapes repo root: ' + p);
  }
  return abs;
}
function validGlob(pattern) {
  return /^[A-Za-z0-9_./*{}\- ]+$/.test(pattern);
}
function cap(s, n) {
  s = String(s == null ? '' : s);
  return s.length > n ? s.slice(0, n) + '\n…[truncated ' + (s.length - n) + ' chars]' : s;
}

// ---------------------------------------------------------------------------
// Tool implementations (read-only except write_file → sandboxed)
// ---------------------------------------------------------------------------
const savedFiles = [];

function toolReadFile(input) {
  const abs = resolveInRepo(input.path);
  return cap(fs.readFileSync(abs, 'utf8'), 12000);
}
function toolGlob(input) {
  const pattern = input.pattern || '';
  if (!validGlob(pattern)) throw new Error('glob pattern rejected (illegal chars): ' + pattern);
  const out = execFileSync('bash', ['-c', `cd ${JSON.stringify(ROOT)} && ls -d ${pattern} 2>/dev/null || true`], { encoding: 'utf8' });
  return cap(out.trim() || '(no matches)', 2500);
}
function toolGrep(input) {
  const pattern = input.pattern || '';
  const target = resolveInRepo(input.path || '.');
  try {
    const out = execFileSync('grep', ['-rn', '--max-count=40', '-e', pattern, target], { encoding: 'utf8' });
    return cap(out.trim() || '(no matches)', 3000);
  } catch (e) {
    return '(no matches)';  // grep exits 1 on no match
  }
}
function toolSearchWorld(input) {
  try { return cap(mags.searchDisk(input.query || '', 6), 5000); }
  catch (e) { return '(search failed: ' + e.message + ')'; }
}
function toolWriteFile(input) {
  // FORCE into the compare sandbox regardless of the path the model asks for
  // (its SKILL boot step 9 tells it to write output/desk-output/... — we redirect).
  const base = path.basename(input.path || (DESK + '_section.md'));
  const stamped = base.replace(/\.md$/, '') + '_' + MODEL_SLUG + '.md';
  const dest = path.join(COMPARE_DIR, stamped);
  if (DRY_RUN) {
    log.info('[dry-run] would write ' + (input.content || '').length + ' chars → ' + path.relative(ROOT, dest));
  } else {
    fs.mkdirSync(COMPARE_DIR, { recursive: true });
    fs.writeFileSync(dest, input.content || '');
  }
  savedFiles.push(dest);
  return 'Saved to ' + path.relative(ROOT, dest) + ' (' + (input.content || '').length + ' chars). ' +
    'NOTE: this is the headless-test compare folder, not the live desk-output path.';
}

const TOOLS = [
  { name: 'read_file', description: 'Read a repo file (relative path). Returns its text.',
    input_schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'glob', description: 'List files matching a shell glob relative to repo root (e.g. "editions/*.txt", "archive/articles/c*_sports_*.txt").',
    input_schema: { type: 'object', properties: { pattern: { type: 'string' } }, required: ['pattern'] } },
  { name: 'grep', description: 'Search file contents (regex) under a repo path. Returns file:line matches.',
    input_schema: { type: 'object', properties: { pattern: { type: 'string' }, path: { type: 'string' } }, required: ['pattern'] } },
  { name: 'search_world', description: 'Ranked search across the city records on disk (citizens, businesses, neighborhoods, editions, canon). Use for deep history.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'write_file', description: 'Write your finished section. Provide the full markdown. (Saved to the headless compare folder.)',
    input_schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] } }
];

function runTool(tu) {
  const impl = {
    read_file: toolReadFile, glob: toolGlob, grep: toolGrep,
    search_world: toolSearchWorld, write_file: toolWriteFile
  }[tu.name];
  if (!impl) return '(unknown tool: ' + tu.name + ')';
  try { return impl(tu.input || {}); }
  catch (e) { return '(tool error: ' + e.message + ')'; }
}

// ---------------------------------------------------------------------------
// Model call (isolated so v2 can swap provider)
// ---------------------------------------------------------------------------
function callModel(client, system, messages) {
  return client.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system, messages, tools: TOOLS });
}

// OpenRouter (OpenAI-compatible) — compose-only path for the cheap-model sweep
// (research.25 Thread B). No tool loop: full world state is injected into the
// prompt, and OpenAI-format tool-calling differs from Anthropic's — for a
// creative-WRITING comparison, compose-from-injected-state is the fair unit.
function callOpenRouter(system, userContent) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: MODEL, max_tokens: MAX_TOKENS,
      messages: [{ role: 'system', content: system }, { role: 'user', content: userContent }]
    });
    const req = https.request({
      hostname: 'openrouter.ai', path: '/api/v1/chat/completions', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
        'HTTP-Referer': 'https://godworld.local',
        'X-Title': 'GodWorld headless desk-writer test'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.error) return reject(new Error('OpenRouter: ' + (j.error.message || JSON.stringify(j.error))));
          const text = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
          const u = j.usage || {};
          resolve({ text, usageIn: u.prompt_tokens || 0, usageOut: u.completion_tokens || 0 });
        } catch (e) { reject(new Error('OpenRouter parse: ' + e.message + ' | ' + data.slice(0, 300))); }
      });
    });
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

// Per-run scorecard scoring pass (Feedback1.txt, S325). A lightweight self-score
// (voice / facts / hallucinations / word-count) — NOT the authoritative canon
// gate (that's the separate headless-Rhea step). Uses the run's own provider.
async function scoreDraft(draftText, worldState) {
  const sys = 'You are a strict newsroom copy-desk scorer. Return ONLY JSON, no prose.';
  const user = 'World state (ground truth for this cycle):\n\n' + String(worldState).slice(0, 30000) +
    '\n\n---\n\nDraft to score:\n\n' + String(draftText).slice(0, 30000) +
    '\n\nReturn strict JSON only:\n' +
    '{"reporterVoice":true|false,"factsCorrect":true|false,' +
    '"hallucinations":[{"claim":"...","why":"..."}],"wordCount":<int>,"notes":"<short>"}\n' +
    'reporterVoice = stayed in a distinct reporter voice. factsCorrect = every stated fact traces to the world ' +
    'state above. hallucinations = names/numbers/events NOT present in the world state, plus ENGINE-metric leaks ' +
    '("tension score", "civic load", raw dial values, system language). Do NOT flag legitimate sports-game stats ' +
    '(OVR/overall ratings, avg/HR/RBI, records) — those are canon. Be strict.';
  let usageIn = 0, usageOut = 0, raw = '';
  if (PROVIDER === 'openrouter') {
    const r = await callOpenRouter(sys, user);
    raw = r.text; usageIn = r.usageIn; usageOut = r.usageOut;
  } else {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await client.messages.create({ model: MODEL, max_tokens: 1500, system: sys, messages: [{ role: 'user', content: user }] });
    raw = (resp.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    if (resp.usage) { usageIn = resp.usage.input_tokens || 0; usageOut = resp.usage.output_tokens || 0; }
  }
  let json;
  try { const m = raw.match(/\{[\s\S]*\}/); json = JSON.parse(m ? m[0] : raw); }
  catch (_) { json = { parseError: true, raw: raw.slice(0, 400) }; }
  return { json, usageIn, usageOut };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const startTime = Date.now();
  console.log('Headless Desk Writer — ' + DESK + ' desk');
  console.log('===================================');
  console.log('model=' + MODEL + ' maxTurns=' + MAX_TURNS + (DRY_RUN ? ' (DRY RUN)' : ''));

  if (!fs.existsSync(SKILL_PATH)) throw new Error('no SKILL.md for desk "' + DESK + '" at ' + SKILL_PATH);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (PROVIDER === 'openrouter') {
    if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY not set');
  } else if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set');
  }

  const cycle = detectCycle();
  const skill = fs.readFileSync(SKILL_PATH, 'utf8');

  // Feed the FULL current world summary (not loadWorldState's ~800-char orientation
  // head — that's built for the reflection cron, which searches for depth). A desk
  // reporter needs the actual cycle EVENTS, which sit deep in the summary. The first
  // c101 run confabulated a whole fake bullpen crisis because the real sports events
  // (~line 112) were never in its context (S325). Freshest-wins, direct-inject.
  let worldState;
  try {
    worldState = '## Oakland — current world state (cycle ' + cycle + ')\n\n' +
      cap(fs.readFileSync(path.join(ROOT, 'output', 'world_summary_c' + cycle + '.md'), 'utf8'), 40000);
  } catch (_) {
    worldState = mags.loadWorldState();
  }

  const system =
    'You are running HEADLESS as the ' + DESK + ' desk of The Cycle Pulse — the same agent that ' +
    'normally runs inside Claude Code, now driven by a standalone script. Your SKILL is below: follow it ' +
    'for your VOICE, your reporters, canon discipline, and section format — read your IDENTITY/LENS/RULES ' +
    'and the canon files.\n\n' +
    'CURRENT-CYCLE OVERRIDE: the edition pipeline is paused, so your desk workspace ' +
    '(output/desks/' + DESK + '/current/) is STALE — do NOT take cycle facts from it. The current cycle and ' +
    'its world state are in the first message; read output/world_summary_c' + cycle + '.md in full and use ' +
    'search_world for depth. When your section is finished, call write_file with the full markdown. Do not ' +
    'stop until you have written the section.\n\n' +
    '=== YOUR SKILL (.claude/agents/' + DESK + '-desk/SKILL.md) ===\n\n' + skill;

  const kickoff =
    'Current cycle: ' + cycle + '. Write the ' + DESK + ' section for THIS cycle. The current world state is ' +
    'below — build your section from the EVENTS in it (do not invent events, players, or officials the state ' +
    'does not name). Read your IDENTITY/LENS/RULES + canon files for voice and rules, and use search_world for ' +
    'depth on names/history that appear in the state. Ignore the stale desk workspace. Research EFFICIENTLY — you ' +
    'have a limited number of research turns before you must write, so do not re-search the same source.\n\n' +
    worldState;

  let usageIn = 0, usageOut = 0, turns = 0;

  if (PROVIDER === 'openrouter') {
    // COMPOSE-ONLY on the full injected world state (Thread B cheap-model sweep).
    // No tool loop: full state is already in the prompt, and OpenAI-format tool
    // calling differs from Anthropic's — for a creative-WRITING comparison, the
    // fair unit is compose-from-injected-state, holding inputs constant.
    log.info('compose-only via OpenRouter (' + MODEL + ') on full injected world state...');
    const composeUser = kickoff +
      '\n\nNow WRITE the full ' + DESK + ' section for cycle ' + cycle + ' — the complete, publish-ready ' +
      'markdown, built ONLY from the events/names/records in the world state above. Output ONLY the section.';
    const r = await callOpenRouter(system, composeUser);
    usageIn += r.usageIn; usageOut += r.usageOut; turns = 1;
    if (r.text.trim()) toolWriteFile({ path: DESK + '_c' + cycle + '.md', content: r.text });
    else log.warn('OpenRouter returned empty.');
  } else {
    // ANTHROPIC two-phase (Claude Code parity): bounded explore → forced compose.
    const client = new Anthropic({ apiKey });
    const messages = [{ role: 'user', content: kickoff }];
    const findings = [];
    const EXPLORE_TURNS = Math.min(MAX_TURNS, 7);   // bounded research, then forced compose

    // PHASE 1 — EXPLORE (tools on, bounded). Mirrors discord-reflection.js: agency
    // to look around, but capped so it can't rabbit-hole (a single agentic loop
    // burned 617k tokens re-grepping player-index.json and never wrote — S325).
    for (turns = 1; turns <= EXPLORE_TURNS; turns++) {
      const resp = await callModel(client, system, messages);
      if (resp.usage) { usageIn += resp.usage.input_tokens || 0; usageOut += resp.usage.output_tokens || 0; }
      const toolUses = (resp.content || []).filter(b => b.type === 'tool_use');
      if (resp.stop_reason === 'tool_use' && toolUses.length) {
        messages.push({ role: 'assistant', content: resp.content });
        messages.push({ role: 'user', content: toolUses.map(tu => {
          const result = runTool(tu);
          log.info('explore turn ' + turns + ' · ' + tu.name + '(' + JSON.stringify(tu.input).slice(0, 100) + ')');
          findings.push('— ' + tu.name + ' ' + JSON.stringify(tu.input).slice(0, 80) + ' —\n' + cap(result, 2000));
          return { type: 'tool_result', tool_use_id: tu.id, content: result };
        }) });
        continue;
      }
      break;  // model stopped researching on its own
    }

    // PHASE 2 — COMPOSE (no tools) — GUARANTEES a section, composed from a capped
    // findings digest rather than the full accumulated history (the cost cap).
    log.info('compose after ' + findings.length + ' research call(s)...');
    const digest = findings.join('\n\n').slice(0, 12000) || '(little gathered — write from world state + your knowledge)';
    const fin = await client.messages.create({
      model: MODEL, max_tokens: MAX_TOKENS, system,
      messages: [{ role: 'user', content: kickoff +
        '\n\n## What you gathered while researching\n\n' + digest +
        '\n\nNow WRITE the full ' + DESK + ' section for cycle ' + cycle + ' as your reply — the complete, ' +
        'publish-ready markdown. Output ONLY the section.' }]
    });
    if (fin.usage) { usageIn += fin.usage.input_tokens || 0; usageOut += fin.usage.output_tokens || 0; }
    const finalText = (fin.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    if (finalText.trim()) toolWriteFile({ path: DESK + '_c' + cycle + '.md', content: finalText });
  }

  const wrote = savedFiles.length > 0;
  if (!wrote) log.warn('no section produced — compose returned empty.');

  // Scorecard (Task 1, plan 2026-07-20-headless-newsroom-pipeline). Lightweight
  // self-score of the produced draft — the measurement instrument Feedback1.txt
  // recommends. NOT the authoritative canon gate (that's the headless-Rhea step).
  let scorecard = null;
  if (wrote && !DRY_RUN) {
    try {
      const draftText = fs.readFileSync(savedFiles[0], 'utf8');
      log.info('scoring the draft...');
      const s = await scoreDraft(draftText, worldState);
      usageIn += s.usageIn; usageOut += s.usageOut;
      scorecard = {
        desk: DESK, cycle, provider: PROVIDER, model: MODEL,
        reporterVoice: s.json.reporterVoice ?? null,
        factsCorrect: s.json.factsCorrect ?? null,
        hallucinationCount: Array.isArray(s.json.hallucinations) ? s.json.hallucinations.length : null,
        hallucinations: s.json.hallucinations || [],
        wordCount: s.json.wordCount ?? null,
        humanEdits: null,               // Low|Medium|High — filled by a human reviewer
        runtimeSec: Math.round((Date.now() - startTime) / 1000),
        apiCostUsd: costUsd(MODEL, usageIn, usageOut),
        usageInputTokens: usageIn, usageOutputTokens: usageOut,
        notes: s.json.notes || (s.json.parseError ? 'score parse failed' : ''),
        ranAt: new Date().toISOString()
      };
      const scPath = path.join(COMPARE_DIR, DESK + '_c' + cycle + '_' + MODEL_SLUG + '.scorecard.json');
      fs.writeFileSync(scPath, JSON.stringify(scorecard, null, 2));
      log.info('scorecard → ' + path.relative(ROOT, scPath));
    } catch (e) { log.warn('scoring failed: ' + e.message); }
  }

  const durationMs = Date.now() - startTime;

  // Run-meta for the A/B comparison (tokens = the v2 cost baseline)
  const meta = {
    desk: DESK, cycle, model: MODEL, turns, maxTurns: MAX_TURNS,
    usageInputTokens: usageIn, usageOutputTokens: usageOut,
    savedFiles: savedFiles.map(f => path.relative(ROOT, f)),
    compareAgainst: 'output/desk-output/' + DESK + '_c' + cycle + '.md',
    durationMs, dryRun: DRY_RUN, ranAt: new Date().toISOString()
  };
  if (!DRY_RUN && wrote) {
    fs.mkdirSync(COMPARE_DIR, { recursive: true });
    fs.writeFileSync(path.join(COMPARE_DIR, DESK + '_c' + cycle + '_cron.meta.json'), JSON.stringify(meta, null, 2));
  }

  console.log('\n--- run summary ---');
  console.log(JSON.stringify(meta, null, 2));
  console.log('\ntokens: ' + usageIn + ' in / ' + usageOut + ' out · ' + turns + ' turn(s) · ' + durationMs + 'ms');
  if (scorecard) console.log('\nscorecard:\n' + JSON.stringify(scorecard, null, 2));
  if (wrote) {
    console.log('compare: diff ' + meta.compareAgainst + '  ↔  ' + meta.savedFiles[0]);
  }
}

main().catch(err => { log.error('Fatal: ' + err.message); process.exit(1); });
