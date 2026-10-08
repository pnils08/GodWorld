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
    SpreadsheetApp: { flush: () => { w.flushes++; if (w.flushThrows) throw new Error('Service Spreadsheets timed out'); } },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType: () => JSON.parse(s) }) },
    computeShortHash_: () => 'hash'
  };
  vm.createContext(box);
  box.ScriptApp = { newTrigger: () => { throw new Error('no triggers in this harness'); }, getProjectTriggers: () => [], deleteTrigger: () => {} };
  for (const rel of ['phase01-config/engine94SheetContract.js', 'utilities/sheetCache.js', 'phase10-persistence/cycleCheckpoint.js', 'phase01-config/godWorldEngine2.js', 'utilities/webTrigger.js']) {
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
    if (w.bodyMode === 'nopersist') { ctx.summary.cycleId = Number(row[1]) + 1; return; }   // ran, but the counter write never landed
    row[1] = Number(row[1]) + 1; ctx.summary.cycleId = row[1];
    if (w.bodyMode === 'crash') throw new Error('phase blew up after AdvanceTime');
    if (w.bodyMode === 'partial') fire.commitProblem = '2 queued write(s) did not land';   // what the body's cache-flush handler records
  };
  w.box = box;
  w.cycleCount = () => w.config.find(r => r[0] === 'cycleCount')[1];
  w.record = () => w.props.FIRE_ADMISSION_JSON ? JSON.parse(w.props.FIRE_ADMISSION_JSON) : null;
  w.fire = (o) => { try { box.runWorldCycle(o); return null; } catch (e) { return String(e.message); } };
  w.get = (params) => box.doGet({ parameter: params });
  w.post = (params) => box.doPost({ parameter: params });
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
  assert('3.8 a week later: the NEXT Cycle is admitted, with a row saying the last fire was left running', k.fire() === null && k.runs === 1 && k.cycleCount() === 110 &&
    k.errors.some(r => r[2] === 'Phase1-FireGuard' && /Cycle 109\) was left running/.test(r[3])));

  // the record already names the Cycle about to run: the counter never moved — never run it twice
  const rec = (cycle, state, agoMin) => ({ props: { FIRE_ADMISSION_JSON: JSON.stringify(Object.assign({ cycle: cycle, startedMs: 1800000000000 - agoMin * 60000, state: state },
    state === 'running' ? {} : { finishedMs: 1800000000000 - agoMin * 60000 + 200000 })) } });
  const s1 = world(rec(110, 'done', 180));
  const e1 = s1.fire();
  assert('3.9 record says Cycle 110 ran, sheet still 109, three hours later: REFUSED', /Cycle 110 was already admitted \(done\) and World_Config.cycleCount is still 109 — refusing to run it again/.test(e1 || '') && s1.runs === 0, e1);
  assert('3.10 ...and the message says how to reconcile', /set cycleCount to 110/.test(e1) && /clear script property FIRE_ADMISSION_JSON/.test(e1));
  const s2 = world(rec(110, 'running', 7 * 24 * 60));
  assert('3.11 the same a week later, record left running: still refused', /already admitted \(running\)/.test(s2.fire() || '') && s2.runs === 0);
  const s3 = world(Object.assign(rec(110, 'done', 1), { config: [['Key', 'Value', 'Description'], ['cycleCount', 109, ''], ['fireGuardMinutes', 0, '']] }));
  assert('3.12 ...and with the guard window at 0 (bench): still refused', /already admitted/.test(s3.fire() || '') && s3.runs === 0);
  assert('3.13 ...through the web trigger with a matching expect: still refused', (function() { const g = s3.get({ token: 'tok', expect: '109' }); return g.ok === false && /already admitted/.test(g.error) && s3.runs === 0; })());
  const s4 = world(rec(140, 'done', 600));
  assert('3.14 a record AHEAD of the sheet (sheet rolled back) refuses', /Cycle 140 was already admitted/.test(s4.fire() || '') && s4.runs === 0);
  const s5 = world(rec(110, 'aborted', 1));
  assert('3.15 an aborted record for the same Cycle does not block it', s5.fire() === null && s5.runs === 1 && s5.cycleCount() === 110);

  // the run ended without throwing but the counter is not on the sheet
  const u = world(); u.bodyMode = 'nopersist';
  const ue = u.fire();
  assert('3.16 counter did not persist: the caller is told, not answered ok', /Cycle 110 ran but World_Config.cycleCount reads 109 — the counter did not persist/.test(ue || ''), ue);
  assert('3.17 ...the record says unpersisted, and a close row is logged', u.record().state === 'unpersisted' && u.errors.some(r => r[2] === 'Phase11-FireGuardClose'));
  u.bodyMode = 'ok'; u.minutes(61);
  assert('3.18 ...and the next fire, an hour on, is refused until someone reconciles', /Cycle 110 was already admitted \(unpersisted\)/.test(u.fire() || '') && u.runs === 1);
  const uw = world({ config: [['Key', 'Value', 'Description'], ['cycleCount', 138, ''], ['fireGuardMinutes', 0, '']] }); uw.bodyMode = 'nopersist';
  const g1 = uw.get({ token: 'tok', expect: '138' });
  uw.bodyMode = 'ok';
  const g2 = uw.get({ token: 'tok', expect: '138' });
  assert('3.19 web: the unpersisted run answers ok:false, and the identical replay is refused', g1.ok === false && /did not persist/.test(g1.error) && g2.ok === false && /already admitted/.test(g2.error) && uw.runs === 1);

  // the flush itself fails
  const fl = world(); fl.flushThrows = true;
  const fe = fl.fire();
  assert('3.20 a failed flush: the run is unverified and the caller is told', /persistence could not be verified \(Service Spreadsheets timed out\)/.test(fe || '') && fl.record().state === 'unverified');
  assert('3.21 ...and the lock is still released', fl.lockReleases === 1);
  fl.flushThrows = false; fl.minutes(5);
  assert('3.22 ...and a re-fire five minutes later is refused', /refusing a second fire/.test(fl.fire() || '') && fl.runs === 1);

  // the counter landed but another queued write is known not to have
  const pc = world(); pc.bodyMode = 'partial';
  const pe = pc.fire();
  assert('3.23 a partial commit: the caller is told, the record says failed, not done', /Cycle 110 advanced but 2 queued write\(s\) did not land — the world is partly written/.test(pe || '') && pc.record().state === 'failed' && pc.cycleCount() === 110, pe);
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
  bad('5.9 fireGuardMinutes text', { config: [H, ['cycleCount', 109, ''], ['fireGuardMinutes', 'an hour', '']] }, /fireGuardMinutes is not a number from 0 to 1440/);
  bad('5.10 fireGuardMinutes negative', { config: [H, ['cycleCount', 109, ''], ['fireGuardMinutes', -5, '']] }, /fireGuardMinutes is not a number from 0 to 1440/);
  bad('5.10b fireGuardMinutes over the bound', { config: [H, ['cycleCount', 109, ''], ['fireGuardMinutes', 5000, '']] }, /from 0 to 1440/);
  const shape = (label, rec) => bad(label, { props: { FIRE_ADMISSION_JSON: JSON.stringify(rec) } }, /is unreadable — refusing/);
  const T0 = 1799999000000, T1 = 1799999200000;
  shape('5.2b a record with a null Cycle', { cycle: null, startedMs: T0, state: 'done', finishedMs: T1 });
  shape('5.2c a record whose Cycle is text', { cycle: '108', startedMs: T0, state: 'done', finishedMs: T1 });
  shape('5.2d a record with a zero start time', { cycle: 108, startedMs: 0, state: 'done', finishedMs: T1 });
  shape('5.2e a record with an unknown state', { cycle: 108, startedMs: T0, state: 'whatever', finishedMs: T1 });
  shape('5.2f a record with no state', { cycle: 108, startedMs: T0 });
  shape('5.2g a record that is an array', [108, T0, 'done']);
  shape('5.2h a hand-typed aborted record with a bad Cycle cannot wave a fire through', { cycle: 0, startedMs: T0, state: 'aborted', finishedMs: T1 });
  shape('5.2i a fractional start time', { cycle: 108, startedMs: T0 + 0.5, state: 'done', finishedMs: T1 });
  shape('5.2j a finished state with no finish time', { cycle: 108, startedMs: T0, state: 'done' });
  shape('5.2k a finish time before the start', { cycle: 108, startedMs: T0, state: 'failed', finishedMs: T0 - 1 });
  shape('5.2l a running record that claims a finish time', { cycle: 108, startedMs: T0, state: 'running', finishedMs: T1 });
  shape('5.2m an aborted record dated in the future cannot wave a fire through', { cycle: 110, startedMs: 1800000000000 + 3600000, state: 'aborted', finishedMs: 1800000000000 + 3700000 });
  bad('5.2n an empty-string record is present and unreadable, not absent', { props: { FIRE_ADMISSION_JSON: '' } }, /is unreadable — refusing/);
  const okRec = world({ props: { FIRE_ADMISSION_JSON: JSON.stringify({ cycle: 108, startedMs: T0 - 7 * 86400000, state: 'done', finishedMs: T1 - 7 * 86400000 }) } });
  assert('5.2o a record exactly as this code writes it is accepted', okRec.fire() === null && okRec.runs === 1);
  const slack = world({ props: { FIRE_ADMISSION_JSON: JSON.stringify({ cycle: 108, startedMs: 1800000000000 + 60000, state: 'aborted', finishedMs: 1800000000000 + 61000 }) } });
  assert('5.2p a minute of clock skew is tolerated', slack.fire() === null && slack.runs === 1);
  bad('5.11 World_Config missing', { noConfig: true }, /World_Config not found — refusing/);
  const d = world({ config: [H, ['cycleCount', 109, '']] });      // key absent: the seed value applies
  d.fire(); d.minutes(30);
  assert('5.12 fireGuardMinutes absent: the 60-minute seed value applies', /inside 60 min/.test(d.fire() || '') && d.runs === 1);
  const z = world({ config: [H, ['cycleCount', 109, ''], ['fireGuardMinutes', 0, '']] });
  z.fire(); z.minutes(1);
  assert('5.13 fireGuardMinutes 0 (bench): no time test', z.fire() === null && z.runs === 2 && z.cycleCount() === 111);
  const t = world({ config: [H, ['cycleCount', '109', ''], ['fireGuardMinutes', '60', '']] });
  assert('5.14 numeric text in the cells reads as numbers', t.fire() === null && t.cycleCount() === 110);
  const f = world({ props: { FIRE_ADMISSION_JSON: JSON.stringify({ cycle: 109, startedMs: 1800000000000 + 90 * 60000, state: 'done', finishedMs: 1800000000000 + 94 * 60000 }) } });
  assert('5.15 a record dated in the future refuses', /is unreadable — refusing/.test(f.fire() || '') && f.runs === 0);
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
console.log('═══ 6b — inside the body: the two unwrapped checks, and the bench reconciliation door');
(function() {
  const w = world(); const b = w.box; const fire = { admission: { cycle: 110 } };
  const thr = (fn) => { try { fn(); return null; } catch (e) { return e.message; } };
  assert('6b.1 config shows the admitted count: passes', thr(() => b.assertFireConfigLoaded_({ config: { cycleCount: 109 } }, fire)) === null);
  assert('6b.2 config did not load (count missing): stops before time advances', /read cycleCount undefined but this fire was admitted for Cycle 110 — stopping before time advances/.test(thr(() => b.assertFireConfigLoaded_({ config: {} }, fire)) || ''));
  assert('6b.3 config shows another count: stops', /stopping before time advances/.test(thr(() => b.assertFireConfigLoaded_({ config: { cycleCount: 0 } }, fire)) || ''));
  assert('6b.4 AdvanceTime produced the admitted Cycle: passes', thr(() => b.assertFireAdvanced_({ summary: { cycleId: 110 } }, fire)) === null);
  assert('6b.5 AdvanceTime failed (no Cycle number): stops before any world phase', /did not produce Cycle 110 .* stopping before any world phase runs/.test(thr(() => b.assertFireAdvanced_({ summary: { cycleId: null } }, fire)) || ''));
  assert('6b.6 AdvanceTime produced another Cycle: stops', /did not produce Cycle 110/.test(thr(() => b.assertFireAdvanced_({ summary: { cycleId: 1 } }, fire)) || ''));
  assert('6b.6b AdvanceTime THREW after it set the Cycle number (before queueing the counter): still stops', /Phase1-AdvanceTime failed for Cycle 110 — stopping before any world phase runs/.test(thr(() => b.assertFireAdvanced_({ summary: { cycleId: 110 } }, fire, false)) || ''));
  assert('6b.6c AdvanceTime returned true with the right Cycle: passes', thr(() => b.assertFireAdvanced_({ summary: { cycleId: 110 } }, fire, true)) === null);
  assert('6b.7 no admission on the fire object (dry-run / replay harness): both are no-ops', thr(() => b.assertFireConfigLoaded_({ config: {} }, null)) === null && thr(() => b.assertFireAdvanced_({ summary: {} }, {})) === null);
  const eng = fs.readFileSync(path.join(ROOT, 'phase01-config/godWorldEngine2.js'), 'utf8');
  const body = eng.slice(eng.indexOf('function runWorldCycleLocked_'), eng.indexOf('function loadConfig_'));
  const at = t => body.indexOf(t);
  assert('6b.8 order in the body: LoadConfig, config check, carry-forward check, AdvanceTime, advance check, then the rest',
    at("'Phase1-LoadConfig'") > 0 && at("'Phase1-LoadConfig'") < at('assertFireConfigLoaded_(ctx, fire);') && at('assertFireConfigLoaded_(ctx, fire);') < at('assertCarryForwardPresent_(ctx);') &&
    at('assertCarryForwardPresent_(ctx);') < at("'Phase1-AdvanceTime'") && at("var advanceOk = safePhaseCall_(ctx, 'Phase1-AdvanceTime'") > 0 && at("'Phase1-AdvanceTime'") < at('assertFireAdvanced_(ctx, fire, advanceOk);') && at('assertFireAdvanced_(ctx, fire, advanceOk);') < at("'Phase1-SeedRng'"));
  assert('6b.9 both checks are unwrapped (a throw stops the run)', !/safePhaseCall_\([^\n]*assertFire(ConfigLoaded|Advanced)_/.test(body));
  const adv = eng.slice(eng.indexOf('function advanceWorldTime_'), eng.indexOf('function advanceWorldTime_') + 1600);
  assert('6b.10 AdvanceTime sets summary.cycleId before it queues the counter write (so "no Cycle number" means nothing was queued)', adv.indexOf('ctx.summary.cycleId = cycle;') > 0 && adv.indexOf('ctx.summary.cycleId = cycle;') < adv.indexOf("queueWrite('World_Config', cycleRow"));

  // the bench door: clear a record the resync left ahead of the sheet — narrow on purpose
  const H3 = ['Key', 'Value', 'Description'];
  const ahead = { cycle: 171, startedMs: 1799990000000, state: 'done', finishedMs: 1799990200000 };
  const bench = (guard, count, rec, lockHeld) => { const x = world({ config: [H3, ['cycleCount', count, ''], ['fireGuardMinutes', guard, '']], props: { FIRE_ADMISSION_JSON: JSON.stringify(rec) } }); x.lockHeldElsewhere = !!lockHeld; return x; };
  const d = bench(0, 109, ahead);
  assert('6b.11 clearfire needs the token', d.post({ token: 'nope', action: 'clearfire', cycle: '171' }).error === 'bad token' && d.record().cycle === 171);
  assert('6b.11b ...and the caller must name the record\'s Cycle', /send cycle=171/.test(d.post({ token: 'tok', action: 'clearfire' }).error) && /send cycle=171/.test(d.post({ token: 'tok', action: 'clearfire', cycle: '170' }).error) && d.record().cycle === 171);
  const c = d.post({ token: 'tok', action: 'clearfire', cycle: '171' });
  assert('6b.12 on a guard-0 sheet behind its record, clearfire removes it and returns what it removed', c.ok === true && /"cycle":171/.test(c.cleared) && d.record() === null);
  assert('6b.13 ...after which the resynced bench fires', d.get({ token: 'tok', expect: '109' }).ok === true && d.cycleCount() === 110);
  const g60 = bench(60, 109, ahead);
  assert('6b.13b on a 60-minute sheet (what live carries) clearfire is refused', /clearfire is a bench action: World_Config.fireGuardMinutes is 60, not 0/.test(g60.post({ token: 'tok', action: 'clearfire', cycle: '171' }).error) && g60.record().cycle === 171);
  const level = bench(0, 171, ahead);
  assert('6b.13c a sheet that is NOT behind its record has nothing to reconcile', /is not behind the record/.test(level.post({ token: 'tok', action: 'clearfire', cycle: '171' }).error) && level.record().cycle === 171);
  const busy = bench(0, 109, ahead, true);
  assert('6b.13d while a Cycle holds the lock clearfire is refused', /a Cycle is running/.test(busy.post({ token: 'tok', action: 'clearfire', cycle: '171' }).error) && busy.record().cycle === 171);
  const live = world({ token: null, props: { FIRE_ADMISSION_JSON: JSON.stringify(ahead) } });
  assert('6b.14 with no trigger token (the live script) that door is shut', live.post({ token: 'x', action: 'clearfire', cycle: '171' }).error === 'CYCLE_TRIGGER_TOKEN script property not set' && live.record().cycle === 171);
  assert('6b.15 the carry-forward actions still work as before', d.post({ token: 'tok', action: 'getprop', key: 'NOT_LISTED' }).error === 'key not in carry-forward whitelist');
  const out = require('child_process').spawnSync(process.execPath, [path.join(ROOT, 'scripts/ctxMap.js')], { encoding: 'utf8' }).stdout || '';
  const m = /execution order: (\d+) orchestrated slots/.exec(out);
  assert('6b.16 the phase-order scanner still sees the whole production sequence', m && Number(m[1]) >= 155, m ? m[1] : 'no slot count');   // 155 before the body moved; a truncated scan sees a handful
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
