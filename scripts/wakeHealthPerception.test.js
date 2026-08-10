#!/usr/bin/env node
'use strict';

/**
 * Run: node scripts/wakeHealthPerception.test.js
 *
 * engine.101 health slice (loop doctrine, research 2026-08-03 §Addendum 1 —
 * "sheet → cron must be lossless: spouse, children, household, health,
 * employment"). Two pinned halves:
 *
 *  1) RENDER — lib/wakePerception.loadHealthState semantics (export built
 *     engine.102 W3, commit 87e68f94): one phrase per tracked HEALTH_STATES
 *     status, cause/since composition, non-health statuses omit, unknown
 *     POPIDs omit, a sheets failure fails open ''.
 *  2) WIRING — the drift class that left engine.101 open: the export existed
 *     but NO consumer called it. Assert all three voices (citizen-wake,
 *     citizenVoice, citizen-exchange) destructure loadHealthState from
 *     wakePerception, call it for the citizen, render the line into the
 *     system prompt, and feed it to recall contextText (wake: also the B1
 *     bias match text). Sandboxed — no Sheets, no network, runs anywhere.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let passed = 0;
let failed = 0;

function assert(label, cond, detail) {
  if (cond) { passed++; console.log('ok ' + label); }
  else { failed++; console.log('FAIL ' + label + ': ' + (detail || 'condition false')); }
}

// ═══════════════════════════════════════════════════════════════════════════
// Part 1 — RENDER: loadHealthState over a stubbed Simulation_Ledger
// ═══════════════════════════════════════════════════════════════════════════
const LEDGER = [
  ['POPID', 'Status', 'HealthCause', 'StatusStartCycle'],
  ['POP-H-001', 'hospitalized', 'a severe case of the illness moving through the neighborhood', '109'],
  ['POP-H-002', 'critical', '', '108'],
  ['POP-H-003', 'injured', 'a fall at home', ''],
  ['POP-H-004', 'serious-condition', 'a cardiac condition', '107'],
  ['POP-H-005', 'recovering', '', '106'],
  ['POP-H-006', 'active', '', ''],
  ['POP-H-007', 'deceased', '', ''],
];

let sheetsImpl = async () => LEDGER.map((r) => r.slice());
const sheetsStub = { getRawSheetData: (...a) => sheetsImpl(...a), getSheetAsObjects: async () => [] };

const libPath = path.join(__dirname, '..', 'lib', 'wakePerception.js');
const stubs = {
  '/root/GodWorld/lib/env': {},
  '/root/GodWorld/lib/sheets': sheetsStub,
  '/root/GodWorld/lib/citizenDials': {},
  '/root/GodWorld/utilities/citizenDialMap': {},
  '/root/GodWorld/lib/citizenPage': {},
  '/root/GodWorld/lib/memoryFence': {},
  '/root/GodWorld/lib/resonanceRecall': {},
  '/root/GodWorld/lib/neighborhoodSlice': { createSlicer: () => ({ slice: () => null }) },
};
const sandbox = {
  module: { exports: {} },
  console,
  require: (p) => {
    if (p === 'fs') return fs;
    if (p === 'path') return path;
    if (Object.prototype.hasOwnProperty.call(stubs, p)) return stubs[p];
    throw new Error('unexpected require in wakePerception: ' + p);
  },
};
sandbox.exports = sandbox.module.exports;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(libPath, 'utf8'), sandbox, { filename: libPath });
const wp = sandbox.module.exports;

(async () => {
  assert('loadHealthState exported', typeof wp.loadHealthState === 'function');
  assert('HEALTH_STATES exported', !!wp.HEALTH_STATES && typeof wp.HEALTH_STATES.test === 'function'); // cross-realm: vm RegExp fails instanceof

  // one exact phrase per tracked status, with cause/since composition
  const cases = [
    ['POP-H-001', 'You are currently in the hospital (a severe case of the illness moving through the neighborhood), since cycle 109.'],
    ['POP-H-002', 'You are currently in critical condition, since cycle 108.'],
    ['POP-H-003', 'You are currently recovering from an injury (a fall at home).'],
    ['POP-H-004', 'You are currently living with a serious medical condition (a cardiac condition), since cycle 107.'],
    ['POP-H-005', 'You are currently recovering, since cycle 106.'],
  ];
  for (const [pop, want] of cases) {
    const got = await wp.loadHealthState(pop);
    assert('render ' + pop, got === want, 'got: ' + JSON.stringify(got));
  }

  // non-health statuses omit; unknown POPID omits
  assert('active omits', (await wp.loadHealthState('POP-H-006')) === '');
  assert('deceased omits', (await wp.loadHealthState('POP-H-007')) === '');
  assert('unknown POPID omits', (await wp.loadHealthState('POP-H-999')) === '');

  // HEALTH_STATES vocabulary: tracked states in, life statuses out
  for (const s of ['hospitalized', 'injured', 'serious-condition', 'recovering', 'critical', 'Hospitalized']) {
    assert('HEALTH_STATES tracks ' + s, wp.HEALTH_STATES.test(s));
  }
  for (const s of ['active', 'deceased', 'sick', 'ill']) {
    assert('HEALTH_STATES excludes ' + s, !wp.HEALTH_STATES.test(s));
  }

  // fail-open: sheets throws -> '' (a missing slice never blocks a voice)
  sheetsImpl = async () => { throw new Error('sheets down'); };
  assert('sheets failure fails open', (await wp.loadHealthState('POP-H-001')) === '');
  sheetsImpl = async () => LEDGER.map((r) => r.slice());

  // ═════════════════════════════════════════════════════════════════════════
  // Part 2 — WIRING: every voice destructures, calls, renders, and recalls
  // ═════════════════════════════════════════════════════════════════════════
  const consumers = ['citizen-wake.js', 'citizenVoice.js', 'citizen-exchange.js'];
  for (const f of consumers) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    const dm = src.match(/const \{[^}]+\} = require\('\/root\/GodWorld\/lib\/wakePerception'\)/s);
    assert(f + ': destructures loadHealthState', !!dm && dm[0].includes('loadHealthState'),
      dm ? 'destructure block lacks loadHealthState' : 'wakePerception destructure not found');
    assert(f + ': calls loadHealthState(c.popId)', /loadHealthState\(c\.popId\)/.test(src)); // wake awaits directly; voice/exchange call inside Promise.all
    assert(f + ': builds a health line', src.includes('${healthLine}'));
    assert(f + ': renders ${health} into the prompt', src.includes('${health}'));
    const ctx = src.match(/contextText:[\s\S]{0,260}?healthLine/);
    assert(f + ': healthLine feeds recall contextText', !!ctx);
  }
  const wakeSrc = fs.readFileSync(path.join(__dirname, 'citizen-wake.js'), 'utf8');
  const bias = wakeSrc.match(/biasReadback\(c\.memReg,[\s\S]{0,400}?\)\);/);
  assert('citizen-wake.js: healthLine in B1 bias match text', !!bias && bias[0].includes('healthLine'));

  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})().catch((e) => { console.error('FATAL ' + e.message); process.exit(1); });
