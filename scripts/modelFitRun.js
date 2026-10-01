#!/usr/bin/env node
/**
 * modelFitRun.js — scratch runner for docs/plans/2026-09-22-agent-model-fit-test.md Task 2.
 * NOT a production script: nothing in the cron chain requires it, it writes only to
 * output/model-fit/. One call = one (input, model, reasoning arm) row in runs.jsonl.
 *
 *   node scripts/modelFitRun.js --input output/model-fit/inputs/structured-seat-1_council-d1-c104.md \
 *        --model deepseek/deepseek-chat --provider openrouter --reasoning off [--dry-run]
 *
 * Tiers (from the input filename prefix — see output/model-fit/inputs/MANIFEST.md):
 *   structured-seat-*   council seat: persona dir + raw completion. Replicates readPersonaDir /
 *                       callOpenRouter from scripts/cron-civic-run.js (that file does not export
 *                       them, and the Sunday/weekday chain depends on it — not required here).
 *   semi-open-voice-*   Carmen Delaine: spawns scripts/cron-desk-writer.js itself (the real
 *                       production path) with --state-file <frozen packet> --packet-only and
 *                       the test --provider/--model. Reasoning arm is not controllable there;
 *                       the row records reasoning:"writer-default".
 *   open-character-*    frozen {system,user} pair sent to the test model directly (Mags narration =
 *                       cron-saturday-run anthropicChat shape; Elias = constructed pack, see MANIFEST).
 *                       max tokens = the input's own call.maxTokens, else --max-tokens.
 *
 * Costs are recorded only when --rate-in/--rate-out (USD per 1M tokens) are given — no built-in
 * price table, so a stale price can never pass as a measurement.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'lib', 'env'));

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const INPUT = arg('--input', null);
const MODEL = arg('--model', null);
const PROVIDER = arg('--provider', 'openrouter');           // openrouter | anthropic
const REASONING = arg('--reasoning', 'off');                // off | on
const MAX_TOKENS = parseInt(arg('--max-tokens', '1500'), 10);
const THINK_BUDGET = parseInt(arg('--think-budget', '2000'), 10);
const RATE_IN = arg('--rate-in', null);
const RATE_OUT = arg('--rate-out', null);
const DRY = process.argv.includes('--dry-run');
const OUT_DIR = path.join(ROOT, 'output', 'model-fit');
const RUNS = path.join(OUT_DIR, 'runs.jsonl');

if (!INPUT || !MODEL) {
  console.error('usage: modelFitRun.js --input <frozen input> --model <id> [--provider openrouter|anthropic] [--reasoning off|on] [--max-tokens N] [--rate-in X --rate-out Y] [--dry-run]');
  process.exit(2);
}

// --- replicated from cron-civic-run.js (readPersonaDir) ---
function readPersonaDir(dir) {
  const agentPath = d => path.join(ROOT, '.claude', 'agents', d);
  const files = [];
  if (/^civic-office-council-d\d$/.test(dir)) {
    for (const f of ['LENS.md', 'RULES.md']) {
      const p = path.join(agentPath('civic-office-council-seat'), f);
      if (fs.existsSync(p)) files.push(p);
    }
  }
  for (const f of ['IDENTITY.md', 'LENS.md', 'RULES.md']) {
    const p = path.join(agentPath(dir), f);
    if (fs.existsSync(p)) files.push(p);
  }
  return files.map(p => fs.readFileSync(p, 'utf8')).join('\n\n---\n\n');
}

function postJson(hostname, pathname, headers, bodyObj, timeoutMs) {
  const body = JSON.stringify(bodyObj);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname, path: pathname, method: 'POST', timeout: timeoutMs,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), ...headers },
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(new Error('bad response: ' + b.slice(0, 200))); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body); req.end();
  });
}

// Returns { text, finish, tokensIn, tokensOut, tokensReasoning }
async function complete(system, user, maxTok) {
  const MAXT = maxTok || MAX_TOKENS;
  if (PROVIDER === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');
    const body = { model: MODEL, max_tokens: MAXT + (REASONING === 'on' ? THINK_BUDGET : 0), system,
      messages: [{ role: 'user', content: user }] };
    if (REASONING === 'on') body.thinking = { type: 'enabled', budget_tokens: THINK_BUDGET };
    const j = await postJson('api.anthropic.com', '/v1/messages',
      { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' }, body, 240000);
    if (j.error) throw new Error(MODEL + ': ' + (j.error.message || JSON.stringify(j.error)).slice(0, 220));
    const text = (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    // Anthropic bills thinking inside output_tokens and does not split it out.
    return { text, finish: j.stop_reason || null, tokensIn: (j.usage || {}).input_tokens || 0,
      tokensOut: (j.usage || {}).output_tokens || 0, tokensReasoning: null };
  }
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY missing');
  const body = { model: MODEL, max_tokens: MAXT + (REASONING === 'on' ? THINK_BUDGET : 0),
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    // Cap the thinking budget: `enabled` alone lets the provider pick its own effort, and Sonnet 4.6
    // spent 3.8k of a 4.2k max on reasoning and truncated the narration (2026-10-01 run).
    reasoning: REASONING === 'on' ? { enabled: true, max_tokens: THINK_BUDGET } : { enabled: false } };
  const j = await postJson('openrouter.ai', '/api/v1/chat/completions',
    { Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY }, body, 240000);
  if (j.error) {
    const raw = j.error.metadata && j.error.metadata.raw;
    throw new Error(MODEL + ': ' + [j.error.message, j.error.code && 'HTTP ' + j.error.code,
      raw && String(raw).slice(0, 200)].filter(Boolean).join(' — '));
  }
  const u = j.usage || {};
  return { text: (j.choices[0].message.content || '').trim(), finish: j.choices[0].finish_reason || null,
    tokensIn: u.prompt_tokens || 0, tokensOut: u.completion_tokens || 0,
    tokensReasoning: (u.completion_tokens_details || {}).reasoning_tokens ?? null };
}

// Deterministic measures that do not depend on a tier's contract.
function textMeasures(text) {
  let jsonValid = false;
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { JSON.parse(m[0]); jsonValid = true; } catch (_) { /* stays false */ } }
  return { words: text.split(/\s+/).filter(Boolean).length, chars: text.length, jsonValid };
}

function cost(tin, tout) {
  if (RATE_IN == null || RATE_OUT == null) return null;
  return +((tin / 1e6) * parseFloat(RATE_IN) + (tout / 1e6) * parseFloat(RATE_OUT)).toFixed(5);
}

async function runStructured(abs, base) {
  const dm = base.match(/council-(d\d)/);
  if (!dm) throw new Error('cannot read council district from ' + base);
  const system = readPersonaDir('civic-office-council-' + dm[1]);
  if (!system.trim()) throw new Error('empty persona for council-' + dm[1]);
  const user = fs.readFileSync(abs, 'utf8');
  if (DRY) return { dry: true, tier: 'structured-seat', systemChars: system.length, userChars: user.length };
  const t0 = Date.now();
  const r = await complete(system, user);
  return { tier: 'structured-seat', reasoning: REASONING, latencyMs: Date.now() - t0,
    finish: r.finish, tokensIn: r.tokensIn, tokensOut: r.tokensOut, tokensReasoning: r.tokensReasoning,
    costUsd: cost(r.tokensIn, r.tokensOut), ...textMeasures(r.text), output: r.text };
}

async function runOpen(abs) {
  const d = JSON.parse(fs.readFileSync(abs, 'utf8'));
  if (!d.system || !d.user) throw new Error('open-character input lacks system/user');
  const maxTok = (d.call && d.call.maxTokens) || MAX_TOKENS;
  if (DRY) return { dry: true, tier: 'open-character', systemChars: d.system.length, userChars: d.user.length, maxTokens: maxTok };
  const t0 = Date.now();
  const r = await complete(d.system, d.user, maxTok);
  return { tier: 'open-character', reasoning: REASONING, latencyMs: Date.now() - t0,
    finish: r.finish, tokensIn: r.tokensIn, tokensOut: r.tokensOut, tokensReasoning: r.tokensReasoning,
    costUsd: cost(r.tokensIn, r.tokensOut), ...textMeasures(r.text), output: r.text };
}

function runSemiOpen(abs, base) {
  const tag = ('mf-' + base.replace(/\.json$/, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 20) + '-' +
    MODEL.replace(/[^a-z0-9]+/gi, '-').slice(0, 14) + '-' + Date.now().toString(36)).toLowerCase().slice(0, 48);
  const args = [path.join(ROOT, 'scripts', 'cron-desk-writer.js'), '--desk', 'civic', '--persona', 'carmen-delaine',
    '--state-file', abs, '--packet-only', '--artifact-tag', tag, '--provider', PROVIDER, '--model', MODEL];
  if (DRY) return { dry: true, tier: 'semi-open-voice', cmd: 'node ' + args.map(a => path.relative(ROOT, a)).join(' ') };
  const t0 = Date.now();
  const p = spawnSync('node', args, { cwd: ROOT, encoding: 'utf8', timeout: 600000 });
  const latencyMs = Date.now() - t0;
  const cmpDir = path.join(ROOT, 'output', 'cron-compare');
  const metaName = fs.readdirSync(cmpDir).find(f => f.endsWith('_' + tag + '_cron.meta.json'));
  if (p.status !== 0 || !metaName) {
    throw new Error('writer exit ' + p.status + (metaName ? '' : ' (no meta written)') + ': ' + (p.stderr || p.stdout || '').slice(-300));
  }
  const meta = JSON.parse(fs.readFileSync(path.join(cmpDir, metaName), 'utf8'));
  const saved = (meta.savedFiles || [])[0];
  const text = saved && fs.existsSync(path.join(ROOT, saved)) ? fs.readFileSync(path.join(ROOT, saved), 'utf8') : '';
  return { tier: 'semi-open-voice', reasoning: 'writer-default', latencyMs, finish: null,
    tokensIn: meta.usageInputTokens, tokensOut: meta.usageOutputTokens, tokensReasoning: null,
    costUsd: cost(meta.usageInputTokens || 0, meta.usageOutputTokens || 0),
    ...textMeasures(text), writerMeta: path.join('output/cron-compare', metaName), savedFile: saved || null, output: text };
}

(async () => {
  const abs = path.resolve(ROOT, INPUT);
  if (!fs.existsSync(abs)) { console.error('input not found: ' + INPUT); process.exit(2); }
  const base = path.basename(abs);
  const row = { ts: new Date().toISOString(), input: path.relative(ROOT, abs), model: MODEL, provider: PROVIDER };
  try {
    let res;
    if (base.startsWith('structured-seat')) res = await runStructured(abs, base);
    else if (base.startsWith('semi-open-voice')) res = runSemiOpen(abs, base);
    else if (base.startsWith('open-character')) res = await runOpen(abs);
    else throw new Error('unknown tier for ' + base);
    Object.assign(row, res);
  } catch (e) { row.error = e.message; }
  if (row.dry) { console.log(JSON.stringify(row, null, 2)); return; }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.appendFileSync(RUNS, JSON.stringify(row) + '\n');
  const { output, ...brief } = row;
  console.log(JSON.stringify(brief, null, 2));
  process.exit(row.error ? 1 : 0);
})();
