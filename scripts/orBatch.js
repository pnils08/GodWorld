#!/usr/bin/env node
/**
 * orBatch.js — OpenRouter Batch API (50% off, 24h window) for one-shot offline jobs.
 *
 * The Anthropic batch path (~/.claude/mcp/claude_batch_mcp.py) bills API credits, which
 * the project no longer holds; OpenRouter batch bills the OPENROUTER_API_KEY already in
 * /root/.config/godworld/.env at half the model's standard rate.
 *
 *   node scripts/orBatch.js submit <packet.md> [--model anthropic/claude-sonnet-5] [--max-tokens 32000] [--label name]
 *   node scripts/orBatch.js status <batch_id>
 *   node scripts/orBatch.js fetch  <batch_id> [--out path.md]     # writes the first result's text
 *
 * Registry: output/or-batches.jsonl (one line per submit: id, label, model, packet, created).
 * Endpoint shape per https://openrouter.ai/docs/batch-quickstart — `endpoint` and `model`
 * must precede `requests` in the JSON body (the API stream-parses it).
 */
require('../lib/env');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'output', 'or-batches.jsonl');
const KEY = process.env.OPENROUTER_API_KEY;
if (!KEY) { console.error('OPENROUTER_API_KEY not set'); process.exit(2); }

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function request(method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'openrouter.ai', path: p, method,
      headers: Object.assign({ Authorization: 'Bearer ' + KEY },
        data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        let parsed; try { parsed = JSON.parse(buf); } catch (e) { parsed = { raw: buf }; }
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${buf.slice(0, 600)}`));
        resolve(parsed);
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function submit() {
  const packet = process.argv[3];
  if (!packet || !fs.existsSync(packet)) { console.error('packet path required'); process.exit(2); }
  const model = arg('--model', 'anthropic/claude-sonnet-5');
  const maxTokens = parseInt(arg('--max-tokens', '32000'), 10);
  const label = arg('--label', path.basename(packet, path.extname(packet)));
  const text = fs.readFileSync(packet, 'utf8');
  // Key order matters: endpoint, model, then requests.
  // Reasoning is on by default for Claude on OpenRouter and shares max_tokens with the
  // answer: the first T3 run spent 31,999 of 32,000 tokens thinking and returned
  // content:null. Default it off for these one-shot document jobs; --reasoning re-enables.
  const reqBody = { messages: [{ role: 'user', content: text }], max_tokens: maxTokens };
  if (!process.argv.includes('--reasoning')) reqBody.reasoning = { enabled: false };
  const body = {
    endpoint: '/v1/chat/completions',
    model,
    requests: [{ custom_id: label, body: reqBody }],
  };
  const res = await request('POST', '/api/beta/batches', body);
  const rec = { id: res.id, label, model, packet: path.relative(ROOT, packet), bytes: text.length, created: new Date().toISOString(), status: res.status };
  fs.mkdirSync(path.dirname(REGISTRY), { recursive: true });
  fs.appendFileSync(REGISTRY, JSON.stringify(rec) + '\n');
  console.log(JSON.stringify(rec, null, 2));
}

async function status() {
  const id = process.argv[3];
  const res = await request('GET', '/api/beta/batches/' + id);
  const { results, ...rest } = res;
  console.log(JSON.stringify(rest, null, 2));
  if (results) console.log(`results: ${results.length}`);
}

async function fetchResult() {
  const id = process.argv[3];
  const res = await request('GET', '/api/beta/batches/' + id);
  if (res.status !== 'completed') { console.error(`status=${res.status} — not completed`); process.exit(1); }
  const r = (res.results || [])[0];
  if (!r) { console.error('no results'); process.exit(1); }
  if (r.error) { console.error('result error: ' + JSON.stringify(r.error)); process.exit(1); }
  const msg = r.response?.body?.choices?.[0]?.message ?? r.response?.choices?.[0]?.message;
  const usage = r.response?.body?.usage ?? r.response?.usage;
  if (msg && msg.content == null) {
    console.error(`content is null — finish_reason=${r.response?.body?.choices?.[0]?.finish_reason} usage=${JSON.stringify(usage)}. ` +
      `Reasoning likely consumed max_tokens; resubmit without --reasoning or with a larger --max-tokens.`);
    process.exit(1);
  }
  const text = msg?.content ?? JSON.stringify(r.response);
  const out = arg('--out', path.join(ROOT, 'output', `or-batch_${id}.md`));
  fs.writeFileSync(out, text);
  console.log(`wrote ${out} (${text.length} chars)` + (usage ? ` usage=${JSON.stringify(usage)}` : ''));
}

const cmd = process.argv[2];
({ submit, status, fetch: fetchResult }[cmd] || (() => { console.error('usage: submit|status|fetch'); process.exit(2); }))()
  .catch(e => { console.error(e.message); process.exit(1); });
