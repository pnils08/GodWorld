// TEST-ONLY synthetic rows and fixtures; no network.
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import { join } from 'path';
import { aggregateActivity, modelUsers, priceMap, buildPriceList } from './costRoutes.js';

const now = new Date('2026-10-27T12:00:00Z');
const rows = [
  { date: '2026-10-27 00:00:00', model: 'm/a', usage: 1.5, requests: 10, prompt_tokens: 100, completion_tokens: 10 },
  { date: '2026-10-25 00:00:00', model: 'm/a', usage: 2, requests: 5, prompt_tokens: 50, completion_tokens: 5 },
  { date: '2026-10-10 00:00:00', model: 'm/a', usage: 4, requests: 7, prompt_tokens: 70, completion_tokens: 7 },
  { date: '2026-10-26 00:00:00', model: 'm/b', usage: 9, requests: 1, prompt_tokens: 1, completion_tokens: 1 },
];
const a = aggregateActivity(rows, now);
assert.strictEqual(a.today, 1.5);
assert.strictEqual(a.week, 12.5);          // 10-21..10-27: 1.5 + 2 + 9
assert.strictEqual(a.month, 16.5);
assert.strictEqual(a.models[0].model, 'm/b');                 // ranked by 7-day spend
const ma = a.models.find((m) => m.model === 'm/a');
assert.strictEqual(ma.usage7, 3.5);
assert.strictEqual(ma.usage30, 7.5);
assert.strictEqual(ma.requests7, 15);

// who runs a model: wake packages, script strings, claude-mem setting (synthetic tree)
const root = fs.mkdtempSync(join(os.tmpdir(), 'cost-'));
fs.mkdirSync(join(root, 'scripts')); fs.mkdirSync(join(root, 'lib'));
fs.writeFileSync(join(root, 'scripts/newsroom-wake-packages.json'), JSON.stringify({ _comment: 'x', 'seat-x': { models: { write: { model: 'm/a' } } } }));
fs.writeFileSync(join(root, 'scripts/thing.js'), "const M = 'anthropic/test-model-1';");
fs.writeFileSync(join(root, 'scripts/thing.test.js'), "const M = 'anthropic/only-in-test';");
const home = fs.mkdtempSync(join(os.tmpdir(), 'home-'));
fs.mkdirSync(join(home, '.claude-mem'));
fs.writeFileSync(join(home, '.claude-mem/settings.json'), JSON.stringify({ CLAUDE_MEM_OPENROUTER_MODEL: 'nvidia/x:free', CLAUDE_MEM_OPENROUTER_API_KEY: 'never-read' }));
const u = modelUsers({ root, home });
assert.deepStrictEqual(u.get('m/a'), [{ kind: 'seat', name: 'seat-x', detail: 'write' }]);
assert.strictEqual(u.get('anthropic/test-model-1')[0].name, 'scripts/thing.js');
assert.ok(!u.has('anthropic/only-in-test'));
assert.strictEqual(u.get('nvidia/x')[0].kind, 'claude-mem');
assert.ok(!JSON.stringify([...u.values()]).includes('never-read'));

// price list: per-million dollars, config-named + spending + watch models, cheapest output first
const pm = priceMap([
  { id: 'm/a', pricing: { prompt: '0.000002', completion: '0.00001' }, context_length: 1000, created: 1760000000 },
  { id: 'w/cheap', pricing: { prompt: '0.0000001', completion: '0.0000005' }, context_length: 1000 },
  { id: 'bad/none', pricing: {} },
]);
assert.strictEqual(pm.get('m/a').in, 2);
assert.strictEqual(pm.get('m/a').out, 10);
assert.ok(!pm.has('bad/none'));
const list = buildPriceList(pm, u, [{ model: 'spend/only', usage30: 3 }, { model: 'm/a', usage30: 7 }], ['w/cheap', 'm/a']);
assert.deepStrictEqual(list.map((r) => r.id).slice(0, 2), ['w/cheap', 'm/a']);
assert.strictEqual(list.find((r) => r.id === 'w/cheap').watch, true);
assert.strictEqual(list.find((r) => r.id === 'm/a').watch, false);       // already in use
assert.strictEqual(list.find((r) => r.id === 'm/a').spend30, 7);
assert.strictEqual(list.find((r) => r.id === 'spend/only').price, null); // priced unknown sorts last
assert.strictEqual(list[list.length - 1].price, null);
console.log('costRoutes tests: PASS');
