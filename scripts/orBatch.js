#!/usr/bin/env node
/**
 * orBatch.js — OpenRouter Batch API (50% off, 24h window) for one-shot offline jobs,
 * and the importable batch transport for the civic.39 submit/collect stages.
 *
 * The Anthropic batch path (~/.claude/mcp/claude_batch_mcp.py) bills API credits, which
 * the project no longer holds; OpenRouter batch bills the OPENROUTER_API_KEY already in
 * /root/.config/godworld/.env at half the model's standard rate.
 *
 *   node scripts/orBatch.js submit <packet.md> [--model anthropic/claude-sonnet-5] [--max-tokens 32000] [--label name]
 *   node scripts/orBatch.js status <batch_id>
 *   node scripts/orBatch.js fetch  <batch_id> [--out path.md]     # writes the first result's text
 *
 * Module use (civic.39 Task 3): submitBatch(model, requests, opts) with one
 * {custom_id, body} per seat, getBatch(id), resultText(result). The API key is
 * read lazily inside request() so requiring this module never hard-exits.
 *
 * Registry: output/or-batches.jsonl (one line per submit: id, label, model, created).
 * Endpoint shape per https://openrouter.ai/docs/batch-quickstart — `endpoint` and `model`
 * must precede `requests` in the JSON body (the API stream-parses it).
 *
 * Measured 2026-09-21 (docs/research/2026-09-21-batch-cost-and-model-variety.md §3):
 * one bad request fails the WHOLE batch at validation — validateBatchRequests is the
 * local pre-flight; one batch = one model; results come back out of order — match on
 * custom_id only.
 */
require('../lib/env');
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT, 'output', 'or-batches.jsonl');

// Lazy on purpose: the civic cron requires this module, and a require-time
// process.exit on a missing key would kill the whole stage machine.
function apiKey() {
  const k = process.env.OPENROUTER_API_KEY;
  if (!k) throw new Error('OPENROUTER_API_KEY not set');
  return k;
}

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function request(method, p, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'openrouter.ai', path: p, method, timeout: 60000,
      headers: Object.assign({ Authorization: 'Bearer ' + apiKey() },
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
    // A stalled socket to OpenRouter would otherwise hang runTick indefinitely
    // while polling batch status (adversarial review of 9e076842, Finding 4).
    req.on('timeout', () => { req.destroy(); reject(new Error('OpenRouter request timed out')); });
    if (data) req.write(data);
    req.end();
  });
}

// Local whole-batch protection: one malformed request (empty messages, a body
// model that differs from the batch model, a duplicate custom_id) fails the
// ENTIRE batch at server-side validation, in seconds. max_tokens is required
// per request because the balance reservation is priced off it — a missing or
// huge cap can 402 the submit.
function validateBatchRequests(model, requests) {
  if (!model || typeof model !== 'string') throw new Error('batch model required');
  if (!Array.isArray(requests) || !requests.length) throw new Error('requests must be a non-empty array');
  const seen = new Set();
  for (const r of requests) {
    if (!r || typeof r.custom_id !== 'string' || !r.custom_id) throw new Error('every request needs a string custom_id');
    if (seen.has(r.custom_id)) throw new Error('duplicate custom_id: ' + r.custom_id);
    seen.add(r.custom_id);
    const b = r.body || {};
    if (b.model && b.model !== model) throw new Error('request body model must match the batch model (' + r.custom_id + ')');
    if (!Array.isArray(b.messages) || !b.messages.length || b.messages.some(m => !m || !m.content)) {
      throw new Error('empty messages in ' + r.custom_id);
    }
    if (!Number.isInteger(b.max_tokens) || b.max_tokens <= 0) {
      throw new Error('max_tokens must be a positive integer (' + r.custom_id + ') — the balance reservation is priced off it');
    }
  }
  return true;
}

// Multi-request submit. requests: [{custom_id, body}]; one model per batch.
// Key order matters: endpoint, model, then requests (stream-parsed).
async function submitBatch(model, requests, opts) {
  opts = opts || {};
  validateBatchRequests(model, requests);
  const body = { endpoint: '/v1/chat/completions', model, requests };
  const res = await request('POST', '/api/beta/batches', body);
  const rec = Object.assign({
    id: res.id, label: opts.label || null, model, requests: requests.length,
    created: new Date().toISOString(), status: res.status,
  }, opts.extra || {});
  // opts.root lets a sandbox/test caller keep its registry inside its own
  // workspace instead of appending to the live ROOT/output registry
  // (adversarial review of 9e076842, Finding 5).
  const registry = opts.registry || path.join(opts.root || ROOT, 'output', 'or-batches.jsonl');
  fs.mkdirSync(path.dirname(registry), { recursive: true });
  fs.appendFileSync(registry, JSON.stringify(rec) + '\n');
  return { id: res.id, status: res.status, record: rec, raw: res };
}

async function getBatch(id) {
  return request('GET', '/api/beta/batches/' + id);
}

// One result -> { text, usage } or { error, finishReason?, usage? }.
// finish_reason:length, null content and per-request errors are INVALID —
// they bill anyway, so the caller marks the seat rejected and resubmits it in
// the next window rather than retrying inline.
function resultText(r) {
  if (!r) return { error: 'no result' };
  if (r.error) return { error: typeof r.error === 'string' ? r.error : JSON.stringify(r.error) };
  const choice = (r.response && r.response.body && r.response.body.choices && r.response.body.choices[0])
    || (r.response && r.response.choices && r.response.choices[0]) || null;
  const usage = (r.response && r.response.body && r.response.body.usage) || (r.response && r.response.usage) || null;
  const msg = choice && choice.message;
  if (!msg || msg.content == null) {
    return { error: 'content is null — finish_reason=' + (choice && choice.finish_reason) + ' (reasoning may have eaten max_tokens)', finishReason: choice && choice.finish_reason, usage };
  }
  if (choice.finish_reason === 'length') {
    return { error: 'finish_reason=length — truncated at max_tokens', finishReason: 'length', usage };
  }
  return { text: msg.content, usage };
}

async function submit() {
  const packet = process.argv[3];
  if (!packet || !fs.existsSync(packet)) { console.error('packet path required'); process.exit(2); }
  const model = arg('--model', 'anthropic/claude-sonnet-5');
  const maxTokens = parseInt(arg('--max-tokens', '32000'), 10);
  const label = arg('--label', path.basename(packet, path.extname(packet)));
  const text = fs.readFileSync(packet, 'utf8');
  // Reasoning is on by default for Claude on OpenRouter and shares max_tokens with the
  // answer: the first T3 run spent 31,999 of 32,000 tokens thinking and returned
  // content:null. Default it off for these one-shot document jobs; --reasoning re-enables.
  const reqBody = { messages: [{ role: 'user', content: text }], max_tokens: maxTokens };
  if (!process.argv.includes('--reasoning')) reqBody.reasoning = { enabled: false };
  const { record } = await submitBatch(model, [{ custom_id: label, body: reqBody }], {
    label, extra: { packet: path.relative(ROOT, packet), bytes: text.length },
  });
  console.log(JSON.stringify(record, null, 2));
}

async function status() {
  const id = process.argv[3];
  const res = await getBatch(id);
  const { results, ...rest } = res;
  console.log(JSON.stringify(rest, null, 2));
  if (results) console.log(`results: ${results.length}`);
}

async function fetchResult() {
  const id = process.argv[3];
  const res = await getBatch(id);
  if (res.status !== 'completed') { console.error(`status=${res.status} — not completed`); process.exit(1); }
  const r = (res.results || [])[0];
  const ex = resultText(r);
  if (ex.error) {
    console.error(ex.error + (ex.finishReason !== 'length' && ex.usage
      ? ` usage=${JSON.stringify(ex.usage)}. Reasoning likely consumed max_tokens; resubmit without --reasoning or with a larger --max-tokens.`
      : ''));
    process.exit(1);
  }
  const out = arg('--out', path.join(ROOT, 'output', `or-batch_${id}.md`));
  fs.writeFileSync(out, ex.text);
  console.log(`wrote ${out} (${ex.text.length} chars)` + (ex.usage ? ` usage=${JSON.stringify(ex.usage)}` : ''));
}

if (require.main === module) {
  const cmd = process.argv[2];
  ({ submit, status, fetch: fetchResult }[cmd] || (() => { console.error('usage: submit|status|fetch'); process.exit(2); }))()
    .catch(e => { console.error(e.message); process.exit(1); });
}

module.exports = { request, submitBatch, getBatch, resultText, validateBatchRequests, REGISTRY };
