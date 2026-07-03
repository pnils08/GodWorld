/**
 * aimGuard.test.js — openSimSpreadsheet_ aim-guard (S289, post-C101-misfire).
 * Proves the guard blocks exactly the dangerous state (bound container !=
 * write target, no override) and passes every legitimate one.
 *
 * Run: node scripts/aimGuard.test.js
 */

const fs = require('fs');
const path = require('path');

const LIVE = '1-0GNeCzqrDmmOy1wOScryzdRd82syq0Z_wZ7dTH8Bjk';
const SANDBOX = 'SANDBOX_SHEET_ID_123';

const src = fs.readFileSync(path.resolve(__dirname, '../utilities/utilityFunctions.js'), 'utf8');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

// Build a fresh sandbox scope per scenario.
function run(scenario) {
  const opened = [];
  const g = {
    Logger: { log() {} },
    Utilities: { getUuid: () => 'x' },
    Session: {},
    SpreadsheetApp: {
      getActiveSpreadsheet: () => {
        if (scenario.containerThrows) throw new Error('no container');
        return scenario.containerId ? { getId: () => scenario.containerId } : null;
      },
      openById: (id) => { opened.push(id); return { id: id }; }
    },
    PropertiesService: {
      getScriptProperties: () => {
        if (scenario.propsThrow) throw new Error('no props');
        return { getProperty: (k) => (scenario.props || {})[k] || null };
      }
    }
  };
  const fn = new Function(...Object.keys(g), src + '\nreturn openSimSpreadsheet_;')(...Object.values(g));
  try {
    const ss = fn();
    return { ok: true, openedId: ss.id, opened };
  } catch (e) {
    return { ok: false, msg: String(e.message), opened };
  }
}

// 1. Live sheet, no properties: container == default target -> passes
{
  const r = run({ containerId: LIVE, props: {} });
  assert('live self-aim passes', r.ok && r.openedId === LIVE);
}

// 2. Sandbox copy aimed at itself: SIM_SSID = own id -> passes
{
  const r = run({ containerId: SANDBOX, props: { SIM_SSID: SANDBOX } });
  assert('sandbox aimed at itself passes', r.ok && r.openedId === SANDBOX);
}

// 3. THE MISFIRE: unaimed copy (defaults to live) -> BLOCKED, nothing opened
{
  const r = run({ containerId: SANDBOX, props: {} });
  assert('unaimed copy BLOCKED', !r.ok && r.msg.indexOf('AIM-GUARD') >= 0);
  assert('blocked run opens nothing', r.opened.length === 0);
}

// 4. Deliberate cross-write with override -> passes
{
  const r = run({ containerId: LIVE, props: { SIM_SSID: SANDBOX, ALLOW_CROSS_TARGET: '1' } });
  assert('cross-write with ALLOW_CROSS_TARGET=1 passes', r.ok && r.openedId === SANDBOX);
}

// 5. Cross-write WITHOUT override (plan-A pattern, unapproved) -> blocked
{
  const r = run({ containerId: LIVE, props: { SIM_SSID: SANDBOX } });
  assert('cross-write without override blocked', !r.ok && r.msg.indexOf('AIM-GUARD') >= 0);
}

// 6. No container (standalone/unknown context) -> passes (cannot determine binding)
{
  const r = run({ containerId: null, props: {} });
  assert('no container context passes', r.ok && r.openedId === LIVE);
}

// 7. getActiveSpreadsheet throws -> passes (uncertainty does not block)
{
  const r = run({ containerThrows: true, props: {} });
  assert('container-throw context passes', r.ok && r.openedId === LIVE);
}

// 8. Properties service throws during override check -> passes (uncertainty)
{
  const r = run({ containerId: SANDBOX, propsThrow: true });
  assert('props-throw does not block (uncertainty rule)', r.ok);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
