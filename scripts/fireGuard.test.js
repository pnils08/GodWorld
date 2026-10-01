#!/usr/bin/env node
'use strict';

/**
 * fireGuard.test.js — engine.275: a Cycle cannot fire twice.
 *
 * godWorldEngine2.js, webTrigger.js and engine94SheetContract.js are loaded whole
 * into a VM with stub LockService / PropertiesService / SpreadsheetApp and a stub
 * sheet. The Cycle body (runWorldCycleLocked_) is replaced by a counter that moves
 * cycleCount the way a real run does; everything around it — the lock, admission,
 * the close, the web trigger — is the real code.
 *
 * Run: node scripts/fireGuard.test.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); passed++; }
  else { console.error('  FAIL ' + label + (detail !== undefined ? ': ' + detail : '')); failed++; }
}

function world(opts) {
  opts = opts || {};
  const w = {
    clock: 1800000000000,                      // controllable "now" (ms)
    props: Object.assign({}, opts.props || {}),
    config: opts.config || [['Key', 'Value', 'Description'], ['cycleCount', 109, ''], ['lastRun', '9/28/2026', ''], ['fireGuardMinutes', 60, '']],
    errors: [], configWrites: 0, flushes: 0, lockReleases: 0, lockHeldElsewhere: false, runs: 0, bodyMode: 'ok', bodySaw: [],
    token: 'tok'
  };
  if (opts.token !== undefined) w.token = opts.token;
  if (w.token) w.props.CYCLE_TRIGGER_TOKEN = w.token;
  const D = function() { return arguments.length ? new (Function.prototype.bind.apply(Date, [null].concat([].slice.call(arguments))))() : new Date(w.clock); };
  D.now = () => w.clock;
  const configSheet = {
    getDataRange: () => ({ getValues: () => w.config.map(r => r.slice()) }),
    getLastRow: () => w.config.length,
    getRange: (r) => ({ setValues: rows => { w.configWrites++; rows.forEach((row, i) => { w.config[r - 1 + i] = row.slice(); }); } })
  };
  const ss = { getSheetByName: n => n === 'World_Config' ? (opts.noConfig ? null : configSheet) : n === 'Engine_Errors' ? { appendRow: row => w.errors.push(row) } : null };
  const box = {
    console, Math, JSON, Object, Array, String, Number, RegExp, isNaN, isFinite, parseInt, parseFloat, Error, Date: D,
    Logger: { log() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => !w.lockHeldElsewhere, releaseLock: () => { w.lockReleases++; } }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => Object.prototype.hasOwnProperty.call(w.props, k) ? w.props[k] : null,
      setProperty: (k, v) => { w.props[k] = String(v); },
      deleteProperty: k => { delete w.props[k]; } }) },
    SpreadsheetApp: { flush: () => { w.flushes++; } },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType: () => JSON.parse(s) }) },
    computeShortHash_: () => 'hash'
  };
  vm.createContext(box);
  for (const rel of ['phase01-config/engine94SheetContract.js', 'phase01-config/godWorldEngine2.js', 'utilities/webTrigger.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), box, { filename: rel });
  }
  box.openSimSpreadsheet_ = () => ss;
  // the Cycle body: a real run moves cycleCount at Phase1-AdvanceTime and records summary.cycleId
  box.runWorldCycleLocked_ = (sheet, fire) => {
    w.runs++;
    w.bodySaw.push(fire && fire.admission ? fire.admission.cycle : null);
    const ctx = { summary: { cycleId: null } };
    fire.ctx = ctx;
    if (w.bodyMode === 'abort') throw new Error('FATAL: carry-forward memory missing');     // before AdvanceTime
    const row = w.config.find(r => r[0] === 'cycleCount');
    row[1] = Number(row[1]) + 1; ctx.summary.cycleId = row[1];
    if (w.bodyMode === 'crash') throw new Error('phase blew up after AdvanceTime');
  };
  w.box = box;
  w.cycleCount = () => w.config.find(r => r[0] === 'cycleCount')[1];
  w.record = () => w.props.FIRE_ADMISSION_JSON ? JSON.parse(w.props.FIRE_ADMISSION_JSON) : null;
  w.fire = (o) => { try { box.runWorldCycle(o); return null; } catch (e) { return String(e.message); } };
  w.get = (params) => box.doGet({ parameter: params });
  w.minutes = m => { w.clock += m * 60000; };
  return w;
}

// ---------------------------------------------------------------------------
console.log('═══ 1 — the menu path: one intent, one Cycle');
(function() {
  const w = world();
  assert('1.1 first fire on a script with no record is admitted (bootstrap)', w.fire() === null && w.runs === 1 && w.cycleCount() === 110);
  assert('1.2 the record says Cycle 110 done', w.record().cycle === 110 && w.record().state === 'done' && w.record().startedMs === 1800000000000);
  assert('1.3 the body saw the admitted Cycle', w.bodySaw[0] === 110);
  w.minutes(5);
  const err = w.fire();
  assert('1.4 a second fire 5 min later is refused, naming the Cycle and the minutes', /Cycle 110 started 5 min ago — refusing a second fire inside 60 min/.test(err || ''), err);
  assert('1.5 ...the body never ran and the counter did not move', w.runs === 1 && w.cycleCount() === 110);
  assert('1.6 ...one Phase1-FireGuard row, and nothing written to World_Config', w.errors.length === 1 && w.errors[0][2] === 'Phase1-FireGuard' && w.configWrites === 0);
  assert('1.7 ...the refusal says how to override', /FIRE_GUARD_OVERRIDE=111/.test(err));
  assert('1.8 the record still describes the fire that ran', w.record().cycle === 110 && w.record().state === 'done');
  assert('1.9 lock released and sheet flushed on both the run and the refusal', w.lockReleases === 2 && w.flushes === 2);
  w.minutes(54);
  assert('1.10 59 min after the start: still refused', /refusing a second fire/.test(w.fire() || '') && w.runs === 1);
  w.minutes(2);
  assert('1.11 61 min after the start: admitted', w.fire() === null && w.runs === 2 && w.cycleCount() === 111 && w.record().cycle === 111);
  assert('1.12 an event object handed in by the menu or a trigger is ignored', (function() { const x = world(); return x.fire({ authMode: 'FULL', source: {}, expect: 5 }) === null && x.runs === 1; })());
})();

// ---------------------------------------------------------------------------
console.log('═══ 2 — the lock covers every caller');
(function() {
  const w = world();
  w.lockHeldElsewhere = true;
  const err = w.fire();
  assert('2.1 a fire while another holds the lock is refused before anything is read', /already running/.test(err || '') && w.runs === 0 && w.record() === null && w.errors.length === 0);
  assert('2.2 ...and it does not release a lock it never held', w.lockReleases === 0);
  const g = w.get({ token: 'tok', expect: '109' });
  assert('2.3 the web trigger hits the same lock', g.ok === false && /already running/.test(g.error) && w.runs === 0);
  const src = fs.readFileSync(path.join(ROOT, 'utilities/webTrigger.js'), 'utf8');
  assert('2.4 the web trigger no longer takes its own lock', !/LockService/.test(src.split('function doPost')[0].split('function doGet')[1]));
  const eng = fs.readFileSync(path.join(ROOT, 'phase01-config/godWorldEngine2.js'), 'utf8');
  const wrap = eng.slice(eng.indexOf('function runWorldCycle(opts)'), eng.indexOf('function runWorldCycleLocked_'));
  assert('2.5 in the entry: lock, then admission, then the body', wrap.indexOf('tryLock') > 0 && wrap.indexOf('tryLock') < wrap.indexOf('admitCycleFire_(') && wrap.indexOf('admitCycleFire_(') < wrap.indexOf('runWorldCycleLocked_(ss, fire)'));
  const body = eng.slice(eng.indexOf('function runWorldCycleLocked_'), eng.indexOf('function loadConfig_'));
  assert('2.6 the contract seeds run inside the body, after admission', body.indexOf('ensureEngine94SheetContract_(ss)') > 0 && body.indexOf('ensureEngine275Config_(ss)') > 0 && !/openSimSpreadsheet_\(\)/.test(body));
  assert('2.7 the menu still binds the guarded entry', /addItem\('Run World Cycle', 'runWorldCycle'\)/.test(fs.readFileSync(path.join(ROOT, 'utilities/godWorldMenu.js'), 'utf8')));
})();

// ---------------------------------------------------------------------------
console.log('═══ 3 — runs that do not end cleanly');
(function() {
  const a = world(); a.bodyMode = 'abort';
  const err = a.fire();
  assert('3.1 an abort before AdvanceTime surfaces its own error', /carry-forward memory missing/.test(err || '') && a.cycleCount() === 109);
  assert('3.2 ...and the record is marked aborted', a.record().state === 'aborted' && a.record().cycle === 110);
  a.bodyMode = 'ok'; a.minutes(1);
  assert('3.3 the fix-and-refire a minute later is admitted', a.fire() === null && a.cycleCount() === 110 && a.record().state === 'done');
  assert('3.4 lock released and flushed after the abort too', a.lockReleases === 2 && a.flushes === 2);

  const c = world(); c.bodyMode = 'crash';
  assert('3.5 a crash after AdvanceTime is recorded failed', /blew up/.test(c.fire() || '') && c.record().state === 'failed' && c.cycleCount() === 110);
  c.bodyMode = 'ok'; c.minutes(3);
  assert('3.6 ...and an immediate re-fire is refused (a half-run Cycle wants a look first)', /refusing a second fire/.test(c.fire() || '') && c.runs === 1);

  const k = world({ props: { FIRE_ADMISSION_JSON: JSON.stringify({ cycle: 109, startedMs: 1800000000000 - 10 * 60000, state: 'running' }) } });
  assert('3.7 a killed run (still "running") inside the window: refused', /Cycle 109 started 10 min ago/.test(k.fire() || '') && k.runs === 0);
  k.minutes(7 * 24 * 60);
  assert('3.8 a week later: admitted, with a row saying the last fire never closed', k.fire() === null && k.runs === 1 &&
    k.errors.some(r => r[2] === 'Phase1-FireGuard' && /never recorded completion/.test(r[3])));

  const s = world({ props: { FIRE_ADMISSION_JSON: JSON.stringify({ cycle: 110, startedMs: 1800000000000 - 3 * 60 * 60000, state: 'done' }) } });
  assert('3.9 the counter never moved (record says 110, sheet still 109), outside the window: admitted with a row', s.fire() === null &&
    s.errors.some(r => /Cycle 110 was admitted before and cycleCount did not move/.test(r[3])));
})();

// ---------------------------------------------------------------------------
console.log('═══ 4 — the one-shot override');
(function() {
  const w = world(); w.fire(); w.minutes(4);
  w.props.FIRE_GUARD_OVERRIDE = '112';
  assert('4.1 an override naming another Cycle does nothing and is kept', /refusing a second fire/.test(w.fire() || '') && w.props.FIRE_GUARD_OVERRIDE === '112' && w.runs === 1);
  w.props.FIRE_GUARD_OVERRIDE = '111';
  assert('4.2 an override naming the Cycle about to run admits it', w.fire() === null && w.runs === 2 && w.cycleCount() === 111);
  assert('4.3 ...is consumed', w.props.FIRE_GUARD_OVERRIDE === undefined);
  assert('4.4 ...and is logged', w.errors.some(r => /one-shot override consumed: Cycle 111/.test(r[3])));
  w.minutes(2);
  assert('4.5 the next fire inside the window is refused again', /Cycle 111 started 2 min ago/.test(w.fire() || '') && w.runs === 2);
})();

// ---------------------------------------------------------------------------
console.log('═══ 5 — unreadable inputs refuse; they never wave a fire through');
(function() {
  const bad = (label, o, re) => { const w = world(o); const before = w.props.FIRE_ADMISSION_JSON; const err = w.fire(); assert(label, re.test(err || '') && w.runs === 0 && w.props.FIRE_ADMISSION_JSON === before && w.configWrites === 0, err); return w; };
  const H = ['Key', 'Value', 'Description'];
  bad('5.1 a fire record that is not JSON', { props: { FIRE_ADMISSION_JSON: '{nope' } }, /fire record .* is unreadable — refusing/);
  bad('5.2 a fire record with no start time', { props: { FIRE_ADMISSION_JSON: JSON.stringify({ cycle: 109, state: 'done' }) } }, /unreadable — refusing/);
  bad('5.3 cycleCount missing', { config: [H, ['lastRun', 'x', '']] }, /cycleCount appears 0 times — refusing/);
  bad('5.4 cycleCount twice', { config: [H, ['cycleCount', 109, ''], ['cycleCount', 110, '']] }, /cycleCount appears 2 times/);
  bad('5.5 cycleCount text', { config: [H, ['cycleCount', 'one-oh-nine', '']] }, /cycleCount is not a whole number/);
  bad('5.6 cycleCount blank', { config: [H, ['cycleCount', '', '']] }, /cycleCount is not a whole number/);
  bad('5.7 cycleCount negative', { config: [H, ['cycleCount', -1, '']] }, /cycleCount is not a whole number/);
  bad('5.8 cycleCount fractional', { config: [H, ['cycleCount', 109.5, '']] }, /cycleCount is not a whole number/);
  bad('5.9 fireGuardMinutes text', { config: [H, ['cycleCount', 109, ''], ['fireGuardMinutes', 'an hour', '']] }, /fireGuardMinutes is not a number >= 0/);
  bad('5.10 fireGuardMinutes negative', { config: [H, ['cycleCount', 109, ''], ['fireGuardMinutes', -5, '']] }, /fireGuardMinutes is not a number >= 0/);
  bad('5.11 World_Config missing', { noConfig: true }, /World_Config not found — refusing/);
  const d = world({ config: [H, ['cycleCount', 109, '']] });      // key absent: the seed value applies
  d.fire(); d.minutes(30);
  assert('5.12 fireGuardMinutes absent: the 60-minute seed value applies', /inside 60 min/.test(d.fire() || '') && d.runs === 1);
  const z = world({ config: [H, ['cycleCount', 109, ''], ['fireGuardMinutes', 0, '']] });
  z.fire(); z.minutes(1);
  assert('5.13 fireGuardMinutes 0 (bench): no time test', z.fire() === null && z.runs === 2 && z.cycleCount() === 111);
  const t = world({ config: [H, ['cycleCount', '109', ''], ['fireGuardMinutes', '60', '']] });
  assert('5.14 numeric text in the cells reads as numbers', t.fire() === null && t.cycleCount() === 110);
  const f = world({ props: { FIRE_ADMISSION_JSON: JSON.stringify({ cycle: 109, startedMs: 1800000000000 + 90 * 60000, state: 'done' }) } });
  assert('5.15 a record dated in the future refuses', /refusing a second fire/.test(f.fire() || '') && f.runs === 0);
})();

// ---------------------------------------------------------------------------
console.log('═══ 6 — the web trigger: one call, one Cycle');
(function() {
  const H = ['Key', 'Value', 'Description'];
  const w = world({ config: [H, ['cycleCount', 138, ''], ['fireGuardMinutes', 0, '']] });   // the bench: back-to-back allowed
  assert('6.1 bad token refused before anything', w.get({ token: 'nope', expect: '138' }).error === 'bad token' && w.runs === 0 && w.record() === null);
  const noExp = w.get({ token: 'tok' });
  assert('6.2 no expect: refused, nothing run', noExp.ok === false && /expect=<cycleCount> is required/.test(noExp.error) && w.runs === 0);
  assert('6.3 a non-numeric expect: refused', /expect=<cycleCount> is required/.test(w.get({ token: 'tok', expect: 'abc' }).error) && w.runs === 0);
  const wrong = w.get({ token: 'tok', expect: '137' });
  assert('6.4 a wrong expect: refused with the count found', wrong.ok === false && /cycleCount is 138, caller expected 137/.test(wrong.error) && w.runs === 0);
  const first = w.get({ token: 'tok', expect: '138' });
  assert('6.5 the right expect runs one Cycle', first.ok === true && w.runs === 1 && w.cycleCount() === 139);
  const again = w.get({ token: 'tok', expect: '138' });
  assert('6.6 the identical call again (a retry) is refused and nothing runs', again.ok === false && /cycleCount is 139, caller expected 138/.test(again.error) && w.runs === 1 && w.cycleCount() === 139);
  assert('6.7 the next deliberate fire, naming the new count, runs', w.get({ token: 'tok', expect: '139' }).ok === true && w.runs === 2);
  assert('6.8 lock released and flushed on each of the four calls that reached the engine', w.lockReleases === 4 && w.flushes === 4, w.lockReleases + '/' + w.flushes);
  const live = world({ config: [H, ['cycleCount', 109, ''], ['fireGuardMinutes', 60, '']] });
  live.get({ token: 'tok', expect: '109' }); live.minutes(4);
  const lg = live.get({ token: 'tok', expect: '110' });
  assert('6.9 on a 60-minute sheet a web fire is time-guarded like the menu', lg.ok === false && /Cycle 110 started 4 min ago/.test(lg.error) && live.runs === 1);
  const none = world({ token: null });
  assert('6.10 a script with no trigger token refuses every web call (the live state)', none.get({ token: 'x', expect: '109' }).error === 'CYCLE_TRIGGER_TOKEN script property not set' && none.runs === 0);
})();

// ---------------------------------------------------------------------------
console.log('═══ 7 — World_Config contract');
(function() {
  const w = world({ config: [['Key', 'Value', 'Description'], ['cycleCount', 109, '']] });
  const ssStub = w.box.openSimSpreadsheet_();
  const res = w.box.ensureEngine275Config_(ssStub);
  assert('7.1 a missing key is seeded at 60', res.configSeeded === 1 && w.config.find(r => r[0] === 'fireGuardMinutes')[1] === 60);
  assert('7.2 the seed equals the code default', w.box.FIRE_GUARD_DEFAULT_MINUTES === 60 && w.box.ENGINE275_CONFIG_SEEDS[0][1] === 60);
  assert('7.3 a second run seeds nothing', w.box.ensureEngine275Config_(ssStub).configSeeded === 0);
  const rej = v => { const x = world({ config: [['Key', 'Value', 'Description'], ['fireGuardMinutes', v, '']] }); try { x.box.ensureEngine275Config_(x.box.openSimSpreadsheet_()); } catch (e) { return /fireGuardMinutes/.test(e.message); } return false; };
  const acc = v => { const x = world({ config: [['Key', 'Value', 'Description'], ['fireGuardMinutes', v, '']] }); try { x.box.ensureEngine275Config_(x.box.openSimSpreadsheet_()); return true; } catch (e) { return false; } };
  assert('7.4 0 and 1440 accepted; -1, 2000, blank and text rejected', acc(0) && acc(1440) && rej(-1) && rej(2000) && rej('') && rej('soon'));
})();

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
