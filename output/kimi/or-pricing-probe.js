#!/usr/bin/env node
/* Scratch probe: OpenRouter per-model pricing, standard vs :batch variant.
 * One GET to /api/v1/models. Never prints the API key. */
'use strict';
require('/root/GodWorld/lib/env');
const https = require('https');

const SEATS = [
  'moonshotai/kimi-k2',
  'meta-llama/llama-3.3-70b-instruct',
  'google/gemini-3.7-flash',
  'deepseek/deepseek-chat',
  'qwen/qwen3-235b-a22b',
  'mistralai/mistral-large',
  'anthropic/claude-haiku-4.5',
  'nousresearch/hermes-4-70b',
];

function get(url) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (process.env.OPENROUTER_API_KEY) {
      headers.Authorization = `Bearer ${process.env.OPENROUTER_API_KEY}`;
    }
    https.get(url, { headers }, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    }).on('error', reject);
  });
}

(async () => {
  const res = await get('https://openrouter.ai/api/v1/models');
  console.log('HTTP', res.status);
  if (res.status !== 200) {
    console.log(res.body.slice(0, 500));
    process.exit(1);
  }
  const data = JSON.parse(res.body).data;
  const byId = new Map(data.map((m) => [m.id, m]));

  const fmt = (p) => (p == null ? 'n/a' : `$${(Number(p) * 1e6).toFixed(3)}/M`);
  console.log('\nmodel | std in/out | :batch? | batch in/out | ratio(in)');
  for (const id of SEATS) {
    const std = byId.get(id);
    const bat = byId.get(id + ':batch');
    if (!std) { console.log(`${id} | NOT LISTED`); continue; }
    const si = std.pricing && std.pricing.prompt;
    const so = std.pricing && std.pricing.completion;
    if (!bat) {
      console.log(`${id} | ${fmt(si)}/${fmt(so)} | no :batch variant`);
      continue;
    }
    const bi = bat.pricing && bat.pricing.prompt;
    const bo = bat.pricing && bat.pricing.completion;
    const ratio = (si && bi && Number(si) > 0) ? (Number(bi) / Number(si)).toFixed(2) : 'n/a';
    console.log(`${id} | ${fmt(si)}/${fmt(so)} | YES | ${fmt(bi)}/${fmt(bo)} | ${ratio}x`);
  }

  // Also list any other :batch variants present, for the record.
  const batches = data.filter((m) => m.id.endsWith(':batch')).map((m) => m.id);
  console.log(`\ntotal :batch variants on OpenRouter: ${batches.length}`);
  for (const b of batches) console.log('  ' + b);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
