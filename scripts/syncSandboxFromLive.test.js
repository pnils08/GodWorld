#!/usr/bin/env node
'use strict';
// Synthetic in-memory Sheets only. Proves that RAW writes preserve source cell
// types and values rather than writing their formatted display strings.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, 'syncSandboxFromLive.js'), 'utf8');
const raw = [[1000, 0.25, false, 45800, '00123', '=SYNTHETIC_TEXT', 'synthetic']];
const formatted = [['1,000', '25%', 'FALSE', '5/23/2025', '00123', '=SYNTHETIC_TEXT', 'synthetic']];
async function run({apply = true, sameTarget = false} = {}) {
  const calls = [], logs = [], stored = {};
  let exitCode = 0;
  const api = {
    spreadsheets: {
      get: async args => { calls.push(['get', args.spreadsheetId]); return {data: {properties: {title: 'SYNTHETIC'}, sheets: [{properties: {title: 'SYNTHETIC_TYPES'}}]}}; },
      batchUpdate: async () => { throw new Error('Unexpected schema write'); },
      values: {
        batchGet: async args => ({data: {valueRanges: args.ranges.map(() => ({values:
          args.spreadsheetId === 'SYNTHETIC_LIVE' ?
            (args.valueRenderOption === 'UNFORMATTED_VALUE' ? raw : formatted) : stored.rows || []}))}}),
        batchClear: async args => { calls.push(['clear', args.spreadsheetId]); },
        batchUpdate: async args => {
          calls.push(['write', args.spreadsheetId]);
          assert.strictEqual(args.requestBody.valueInputOption, 'RAW');
          stored.rows = JSON.parse(JSON.stringify(args.requestBody.data[0].values));
        }
      }
    }
  };
  const box = {
    require(name) {
      if (name === '/root/GodWorld/lib/env') return {};
      if (name === 'googleapis') return {google: {auth: {GoogleAuth: class {}}, sheets: () => api}};
      throw new Error('Unexpected dependency: ' + name);
    },
    console: {log: (...args) => logs.push(args.join(' ')), error: (...args) => logs.push(args.join(' '))},
    process: {env: {GODWORLD_SHEET_ID: 'SYNTHETIC_LIVE'},
      argv: ['node', 'synthetic-test', sameTarget ? 'SYNTHETIC_LIVE' : 'SYNTHETIC_BENCH', ...(apply ? ['--apply'] : [])],
      exit: code => { exitCode = code; }}
  };
  vm.runInNewContext(source.replace('main().catch(', 'globalThis.completion = main().catch('), box);
  await box.completion;
  return {calls, logs, stored, exitCode};
}
(async () => {
  let passed = 0, failed = 0;
  async function test(name, fn) {
    try { await fn(); passed++; console.log('PASS ' + name); }
    catch (e) { failed++; console.error('FAIL ' + name + ': ' + e.message); }
  }
  await test('numbers, percentages, booleans and date serials retain their underlying values', async () => {
    const result = await run();
    assert.strictEqual(result.exitCode, 0);
    assert.deepStrictEqual(result.stored.rows[0].slice(0, 4), raw[0].slice(0, 4));
    assert(result.calls.filter(c => c[0] === 'clear' || c[0] === 'write').every(c => c[1] === 'SYNTHETIC_BENCH'));
  });
  await test('text retains leading zeros and literal formula-looking content', async () => {
    const result = await run();
    assert.deepStrictEqual(result.stored.rows[0].slice(4), raw[0].slice(4));
  });
  await test('dry run performs no writes', async () => {
    const result = await run({apply: false});
    assert.strictEqual(result.exitCode, 0);
    assert(!result.calls.some(c => c[0] === 'clear' || c[0] === 'write'));
  });
  await test('live destination is rejected before any API access', async () => {
    const result = await run({sameTarget: true});
    assert.strictEqual(result.exitCode, 1);
    assert.strictEqual(result.calls.length, 0);
    assert(result.logs.some(line => line.includes('REFUSED')));
  });
  console.log(passed + ' passed, ' + failed + ' failed');
  process.exitCode = failed ? 1 : 0;
})();
