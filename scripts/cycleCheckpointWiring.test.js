#!/usr/bin/env node
'use strict';

/**
 * cycleCheckpointWiring.test.js — engine.95: the commit-boundary checkpoint, wired.
 *
 * The real runner wrapper (runWorldCycle, admitCycleFire_, closeCycleFire_), the real
 * checkpoint module (gate, save, admission routing, resumeCore_), the real sheet cache
 * and the real web trigger are loaded into a VM over fake sheets, a fake trigger
 * service and a fake fire-record store. The Cycle body is a stub that does what the
 * inline runner does at the commit boundary: queues the counter bump in the cache,
 * queues an intent, then calls the real gate. The executor and the four Phase-11
 * phases are stubs that record their calls.
 *
 * Run: node scripts/cycleCheckpointWiring.test.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log('  ok   ' + label); passed++; }
  else { console.error('  FAIL ' + label + (detail !== undefined ? ': ' + JSON.stringify(detail) : '')); failed++; }
}

function fakeSheet(rows) {
  const sh = {
    rows,
    getDataRange: () => ({ getValues: () => sh.rows.map(r => r.slice()) }),
    getLastRow: () => sh.rows.length,
    clearContents: () => { sh.rows.length = 0; },
    appendRow: (row) => { sh.rows.push(row.slice()); },
    getRange: (r, c, nr, nc) => ({
      getValue: () => (sh.rows[r - 1] || [])[c - 1] === undefined ? '' : sh.rows[r - 1][c - 1],
      setValue: (v) => { while (sh.rows.length < r) sh.rows.push([]); while (sh.rows[r - 1].length < c) sh.rows[r - 1].push(''); sh.rows[r - 1][c - 1] = v; },
      getValues: () => { const out = []; for (let i = 0; i < (nr || 1); i++) { const row = sh.rows[r - 1 + i] || []; const o = []; for (let j = 0; j < (nc || 1); j++) o.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(o); } return out; },
      setValues: (vals) => { for (let i = 0; i < vals.length; i++) { const rr = r - 1 + i; while (sh.rows.length <= rr) sh.rows.push([]); for (let j = 0; j < vals[i].length; j++) { while (sh.rows[rr].length < c + j) sh.rows[rr].push(''); sh.rows[rr][c - 1 + j] = vals[i][j]; } } },
      clearContent: () => { for (let i = 0; i < (nr || 1); i++) { const rr = r - 1 + i; if (sh.rows[rr]) for (let j = 0; j < (nc || 1); j++) sh.rows[rr][c - 1 + j] = ''; } while (sh.rows.length && sh.rows[sh.rows.length - 1].every(v => v === '')) sh.rows.pop(); }
    })
  };
  return sh;
}

function world(opts) {
  opts = opts || {};
  const w = { clock: 1800000000000, props: { CYCLE_TRIGGER_TOKEN: 'tok' }, triggers: [], triggerSeq: 0, triggerMode: 'ok', calls: [], executorMode: 'ok', bodyMode: 'commit' };
  const cfgRows = [['Key', 'Value', 'Description'], ['cycleCount', 110, ''], ['lastRun', 'x', ''], ['fireGuardMinutes', 0, ''],
    ['wallBudgetMs', 330000, ''], ['tailReserveMs', 60000, ''], ['checkpointSaveMs', 20000, ''], ['checkpointForce', 0, ''], ['checkpointFaultAt', 0, ''], ['checkpointResumeFaultAt', 0, '']];
  Object.assign(cfgRows, {});
  w.sheets = { World_Config: fakeSheet(cfgRows), Engine_Errors: fakeSheet([]), _CycleCheckpoint: opts.noTab ? null : fakeSheet([]), Simulation_Ledger: fakeSheet([['POPID'], ['POP-1']]) };
  const ss = { getSheetByName: n => w.sheets[n] || null };
  const D = function() { return arguments.length ? new (Function.prototype.bind.apply(Date, [null].concat([].slice.call(arguments))))() : new Date(w.clock); };
  D.now = () => w.clock;
  const box = {
    console, Math, JSON, Object, Array, String, Number, RegExp, isNaN, isFinite, parseInt, parseFloat, Error, Date: D,
    Logger: { log() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => Object.prototype.hasOwnProperty.call(w.props, k) ? w.props[k] : null,
      setProperty: (k, v) => { w.props[k] = String(v); },
      deleteProperty: k => { delete w.props[k]; } }) },
    SpreadsheetApp: { flush: () => {} },
    ScriptApp: {
      newTrigger: (fn) => ({ timeBased: () => ({ after: () => ({ create: () => { if (w.triggerMode === 'fail') throw new Error('Authorization is required to perform that action.'); const t = { fn, id: 'trg-' + (++w.triggerSeq), getUniqueId() { return this.id; }, getHandlerFunction() { return this.fn; } }; w.triggers.push(t); return t; } }) }) }),
      getProjectTriggers: () => w.triggers.slice(),
      deleteTrigger: (t) => { w.triggers = w.triggers.filter(x => x !== t); }
    },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ setMimeType: () => JSON.parse(s) }) },
    Utilities: { DigestAlgorithm: { SHA_1: 'SHA_1' }, computeDigest: (_a, input) => Array.from(crypto.createHash('sha1').update(String(input), 'utf8').digest()).map(b => (b > 127 ? b - 256 : b)) },
    initializeModeFlags_: (ctx) => { ctx.mode = ctx.mode || { dryRun: false, replay: false }; ctx.persist = ctx.persist || { updates: [], logs: [], replaceOps: [] }; }
  };
  vm.createContext(box);
  for (const rel of ['phase01-config/engine94SheetContract.js', 'utilities/sheetCache.js', 'phase10-persistence/cycleCheckpoint.js', 'phase01-config/godWorldEngine2.js', 'utilities/webTrigger.js']) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), box, { filename: rel });
  }
  box.openSimSpreadsheet_ = () => ss;
  // stubs for what the resume calls
  box.executePersistIntents_ = (ctx) => {
    w.calls.push('executor');
    if (w.executorMode === 'throw') throw new Error('executor blew up');
    ctx.persist.executionStats = { executed: ctx.persist.updates.length, errors: w.executorMode === 'errors' ? ['Sheet not found: Ghost_Tab'] : [] };
    ctx.persist.updates = []; ctx.persist.logs = []; ctx.persist.replaceOps = [];
  };
  box.initSimulationLedger_ = (ctx) => { w.calls.push('ledger'); ctx.ledger = { rows: [], dirty: false }; };
  box.processMediaIntake_ = () => { w.calls.push('intake'); };
  box.archiveClosedBusinesses_ = () => { w.calls.push('bizArchive'); };
  box.archiveCitizenExits_ = () => { w.calls.push('citizenArchive'); if (w.phase11Mode === 'throwCitizen') throw new Error('archive died'); };
  box.maintainLifeHistoryLog_ = () => { w.calls.push('trim'); };
  // the Cycle body at the commit boundary
  box.runWorldCycleLocked_ = (sheet, fire) => {
    w.calls.push('body');
    const cache = box.createSheetCache_(ss);
    const ctx = { ss, cache, now: new D(), config: {}, summary: { cycleId: null, auditIssues: [], phaseTimings: [] }, persist: { updates: [], logs: [], replaceOps: [] }, rng: { draws: 7 }, mode: { dryRun: false, replay: false } };
    fire.ctx = ctx;
    box.loadConfig_(ctx);
    const cycle = Number(ctx.config.cycleCount) + 1;
    ctx.config.cycleCount = cycle; ctx.summary.cycleId = cycle; ctx.summary.cycle = cycle; ctx.summary.cycleRef = 'Y3C' + cycle; ctx.summary.absoluteCycle = cycle;
    ctx.summary.season = 'fall'; ctx.summary.simYear = 2042; ctx.summary.businessClosures = [{ id: 'BIZ-1' }];
    cache.queueWrite('World_Config', 2, 2, cycle);                       // the Phase1-AdvanceTime bump
    for (let i = 0; i < 3; i++) ctx.summary.phaseTimings.push({ phase: 'P' + i, ms: 1, ok: true });
    box.queueCellIntent_ ? null : null;
    ctx.persist.updates.push({ tab: 'LifeHistory_Log', kind: 'append', values: [[new D(), 'POP-1', 'x'.repeat(opts.bigIntent ? 120000 : 10)]], priority: 100 });
    if (w.bodyMode === 'throw') throw new Error('phase 5 died');
    const out = box.checkpointGate_(ctx, fire);
    if (out) return out;
    box.executePersistIntents_(ctx);
    box.checkExecutorStats_(ctx, fire);
    box.flushCacheAndVerify_(ctx, fire);
    return null;
  };
  w.box = box; w.ss = ss;
  w.cycleCount = () => w.sheets.World_Config.rows.find(r => r[0] === 'cycleCount')[1];
  w.setCfg = (k, v) => { w.sheets.World_Config.rows.find(r => r[0] === k)[1] = v; };
  w.record = () => w.props.FIRE_ADMISSION_JSON ? JSON.parse(w.props.FIRE_ADMISSION_JSON) : null;
  w.manifest = () => box.readCheckpointManifest_(ss);
  w.errors = (phase) => w.sheets.Engine_Errors.rows.filter(r => !phase || r[2] === phase);
  w.get = (params) => box.doGet({ parameter: Object.assign({ token: 'tok' }, params) });
  w.post = (params) => box.doPost({ parameter: Object.assign({ token: 'tok' }, params) });
  w.resume = () => { try { return { res: box.resumeWorldCycle() }; } catch (e) { return { err: String(e.message) }; } };
  return w;
}

console.log('═══ 1 — the gate decision');
{
  const w = world(); const g = w.box.checkpointGateDecision_;
  assert('disarmed when any key is 0', g({ wallBudgetMs: 330000, tailReserveMs: 60000, checkpointSaveMs: 0 }, 300000).branch === 'tail' && g({ wallBudgetMs: 330000, tailReserveMs: 60000, checkpointSaveMs: 0 }, 300000).armed === false);
  assert('tail when elapsed + reserve fits', g({ wallBudgetMs: 330000, tailReserveMs: 60000, checkpointSaveMs: 20000 }, 270000).branch === 'tail');
  assert('checkpoint when the tail does not fit but the save does', g({ wallBudgetMs: 330000, tailReserveMs: 60000, checkpointSaveMs: 20000 }, 300000).branch === 'checkpoint');
  assert('late when not even the save fits', g({ wallBudgetMs: 330000, tailReserveMs: 60000, checkpointSaveMs: 20000 }, 320000).branch === 'late');
  assert('force 1 checkpoints even unarmed', g({ checkpointForce: 1 }, 10).branch === 'checkpoint' && g({ checkpointForce: 1 }, 10).forced === true);
  assert('force 2 is the late branch', g({ checkpointForce: 2 }, 10).branch === 'late');
}

console.log('═══ 2 — a normal fire runs its tail; executor stats ride the response');
{
  const w = world();
  const r = w.get({ expect: '110' });
  assert('ok, state done, no lifecycle', r.ok === true && r.state === 'done' && r.lifecycle === undefined, r);
  assert('counter advanced', w.cycleCount() === 111);
  assert('executor stats in the response, empty errors', r.persist && r.persist.executed === 1 && r.persist.errors.length === 0, r.persist);
  assert('no checkpoint written', w.manifest() === null && w.triggers.length === 0);
  w.executorMode = 'errors';
  const r2 = w.get({ expect: '111' });
  assert('executor error → the fire reads failed', r2.ok === false && /did not land/.test(r2.error) && w.record().state === 'failed', r2);
  assert('one Engine_Errors row names the sheet', w.errors('Phase10-ExecuteIntents').length === 1 && /Ghost_Tab/.test(w.errors('Phase10-ExecuteIntents')[0][3]));
  assert('stats still in the response', r2.persist && r2.persist.errors.length === 1);
}

console.log('═══ 3 — forced checkpoint, then the trigger resumes');
{
  const w = world(); w.setCfg('checkpointForce', 1);
  const r = w.get({ expect: '110' });
  assert('response: ok, state checkpointed, gen named', r.ok === true && r.state === 'checkpointed' && r.lifecycle === 'checkpointed' && r.checkpoint && /^c111-/.test(r.checkpoint.gen), r);
  assert('record checkpointed with no finish', w.record().state === 'checkpointed' && w.record().finishedMs === undefined, w.record());
  assert('counter NOT advanced (the bump is in the checkpoint, not flushed)', w.cycleCount() === 110);
  const m = w.manifest();
  assert('manifest ready with chunks, digest, trigger', m.state === 'ready' && m.n >= 1 && /^[0-9a-f]{12}$/.test(m.sha) && m.triggerId === 'trg-1' && m.forced === true && m.phasesSaved === 3, m);
  assert('chunk rows carry the prefix', w.sheets._CycleCheckpoint.rows.length === 1 + m.n && w.sheets._CycleCheckpoint.rows[1][3].charAt(0) === '~');
  assert('one visible Engine_Errors row', w.errors('Phase10-Checkpoint').length === 1 && /trigger trg-1 armed/.test(w.errors('Phase10-Checkpoint')[0][3]));
  assert('a trigger exists', w.triggers.length === 1 && w.triggers[0].fn === 'resumeWorldCycle');
  w.calls = []; w.clock += 61000;
  const rs = w.resume();
  assert('resume ran without throwing', !rs.err, rs);
  assert('executor, ledger reload, the four Phase-11 phases, in order', w.calls.join(',') === 'executor,ledger,intake,bizArchive,citizenArchive,trim', w.calls);
  assert('counter advanced by the resume flush', w.cycleCount() === 111);
  const m2 = w.manifest();
  assert('manifest committed with the result', m2.state === 'committed' && m2.result && m2.result.phaseCount === 8 && m2.result.problem === null && m2.stage === 'committed', m2);
  assert('chunks cleared, manifest kept', w.sheets._CycleCheckpoint.rows.length === 1);
  assert('record done', w.record().state === 'done' && w.record().cycle === 111);
  assert('trigger deleted', w.triggers.length === 0);
  assert('resumed row in Engine_Errors', w.errors('Phase11-CheckpointResumed').length === 1);
  w.setCfg('checkpointForce', 0); w.calls = [];
  const r3 = w.get({ expect: '111' });
  assert('next fire: committed manifest archived, Cycle 112 runs normally', r3.ok === true && r3.state === 'done' && w.cycleCount() === 112 && w.manifest() === null, r3);
}

console.log('═══ 4 — a web fire while a checkpoint is held resumes inline');
{
  const w = world(); w.setCfg('checkpointForce', 1);
  w.get({ expect: '110' });
  const stale = w.get({ expect: '108' });
  assert('stale expect refused, checkpoint untouched', stale.ok === false && /stale or unrelated/.test(stale.error) && w.manifest().state === 'ready', stale);
  w.calls = [];
  const r = w.get({ expect: '110' });
  assert('inline resume: lifecycle resumed, state done', r.ok === true && r.lifecycle === 'resumed' && r.state === 'done' && w.cycleCount() === 111, r);
  assert('tail ran once', w.calls.filter(c => c === 'executor').length === 1 && w.calls.indexOf('body') < 0);
  assert('action=checkpoint returns the result without expect', w.get({ action: 'checkpoint' }).checkpoint.result.phaseCount === 8);
}

console.log('═══ 5 — no trigger (fault 5 / authorization) is an alarm, and the next fire resumes');
{
  const w = world(); w.setCfg('checkpointForce', 1); w.triggerMode = 'fail';
  const r = w.get({ expect: '110' });
  assert('ok false, error says fire again now', r.ok === false && /fire again now to resume/.test(r.error) && /Authorization/.test(r.error), r);
  assert('manifest ready, no trigger id, error kept', w.manifest().state === 'ready' && w.manifest().triggerId === null && /Authorization/.test(w.manifest().triggerError));
  assert('Engine_Errors row says NO RESUME TRIGGER', /NO RESUME TRIGGER/.test(w.errors('Phase10-Checkpoint')[0][3]));
  w.triggerMode = 'ok';
  const r2 = w.get({ expect: '110' });
  assert('the next fire resumes it', r2.ok === true && r2.lifecycle === 'resumed' && w.cycleCount() === 111, r2);
  const w2 = world(); w2.setCfg('checkpointForce', 1); w2.setCfg('checkpointFaultAt', 5);
  const r3 = w2.get({ expect: '110' });
  assert('fault 5 (creation skipped) reads the same', r3.ok === false && /creation skipped/.test(r3.error));
}

console.log('═══ 6 — save faults: the Cycle stops at the boundary, loudly, and the next fire proceeds after clearing');
for (const fault of [1, 2, 3, 4]) {
  const w = world(); w.setCfg('checkpointForce', 1); w.setCfg('checkpointFaultAt', fault);
  const r = w.get({ expect: '110' });
  assert('fault ' + fault + ': error, record failed, counter not advanced', r.ok === false && /stopped at the commit boundary/.test(r.error) && w.record().state === 'failed' && w.cycleCount() === 110, r);
  assert('fault ' + fault + ': manifest save-failed naming the fault', w.manifest().state === 'save-failed' && new RegExp('bench fault ' + fault).test(w.manifest().error), w.manifest());
  assert('fault ' + fault + ': FATAL-Checkpoint row', w.errors('FATAL-Checkpoint').length === 1);
  const again = w.get({ expect: '110' });
  assert('fault ' + fault + ': refire refused by the failed record (today\'s rule), not by the checkpoint', again.ok === false && /already admitted \(failed\)/.test(again.error), again);
  const cf = w.post({ action: 'clearfire', cycle: '111' });
  assert('fault ' + fault + ': clearfire clears the record', cf.ok === true);
  w.setCfg('checkpointForce', 0); w.setCfg('checkpointFaultAt', 0);
  const r2 = w.get({ expect: '110' });
  assert('fault ' + fault + ': the next fire clears the save-failed manifest and runs Cycle 111', r2.ok === true && r2.state === 'done' && w.cycleCount() === 111 && w.manifest() === null && w.errors('Phase1-FireGuard').some(e => /clearing a save-failed/.test(e[3])), r2);
}

console.log('═══ 7 — a resume that dies stops the world: no retry, refusal, the door');
{
  const w = world(); w.setCfg('checkpointForce', 1); w.setCfg('checkpointResumeFaultAt', 2);
  w.get({ expect: '110' });
  const rs = w.resume();
  assert('resume threw after the executor (the raw throw reaches the caller, as any crashed Cycle does)', rs.err && /bench resume fault 2/.test(rs.err), rs);
  assert('the close row names the resume and its stage', w.errors('Phase11-FireGuardClose').some(e => /resume died \(stage executor-done\)/.test(e[3])), w.errors('Phase11-FireGuardClose').map(e => e[3]));
  assert('manifest resuming at stage executor-done; record failed', w.manifest().state === 'resuming' && w.manifest().stage === 'executor-done' && w.record().state === 'failed');
  const again = w.resume();
  assert('a second trigger firing is refused — no automatic retry', again.err && /state resuming/.test(again.err) && w.calls.filter(c => c === 'executor').length === 1, again);
  const fire = w.get({ expect: '110' });
  assert('a hand fire is refused naming the state and the door', fire.ok === false && /state resuming/.test(fire.error) && /clearcheckpoint/.test(fire.error), fire);
  const gen = w.manifest().gen;
  const d1 = w.post({ action: 'clearcheckpoint', gen: 'wrong' });
  assert('door: wrong gen refused', d1.ok === false && /pass gen=/.test(d1.error));
  const d2 = w.post({ action: 'clearcheckpoint', gen });
  assert('door: resuming without force refused', d2.ok === false && /force=1/.test(d2.error));
  const d3 = w.post({ action: 'clearcheckpoint', gen, force: '1' });
  assert('door: force clears the tab and the trigger', d3.ok === true && d3.cleared === 'resuming' && d3.triggersDeleted === 1 && w.manifest() === null && w.triggers.length === 0, d3);
  const cf = w.post({ action: 'clearfire', cycle: '111' });
  assert('then clearfire clears the failed record', cf.ok === true);
  w.setCfg('checkpointForce', 0); w.setCfg('checkpointResumeFaultAt', 0);
  const r = w.get({ expect: '110' });
  assert('the world fires again from 110 — the revert path', r.ok === true && w.cycleCount() === 111);
  // the door is bench-only
  const w2 = world(); w2.setCfg('fireGuardMinutes', 60);
  assert('door refused where fireGuardMinutes is 60', /bench action/.test(w2.post({ action: 'clearcheckpoint', gen: 'x' }).error));
}

console.log('═══ 8 — the executor fails inside the resume: commit-failed, Phase 11 not run, payload retained');
{
  const w = world(); w.setCfg('checkpointForce', 1);
  w.get({ expect: '110' });
  w.executorMode = 'errors'; w.calls = [];
  const rs = w.resume();
  assert('resume returns (no throw) but the fire reads failed', rs.err && /did not land/.test(rs.err), rs);
  assert('Phase 11 did not run', w.calls.join(',') === 'executor', w.calls);
  const m = w.manifest();
  assert('manifest commit-failed with the executor stats, chunks retained', m.state === 'commit-failed' && m.executorStats.errors.length === 1 && w.sheets._CycleCheckpoint.rows.length === 1 + m.n, m);
  assert('record failed', w.record().state === 'failed');
  assert('next fire refused naming commit-failed', /state commit-failed/.test(w.get({ expect: '110' }).error));
  const w2 = world(); w2.setCfg('checkpointForce', 1); w2.get({ expect: '110' }); w2.executorMode = 'throw'; w2.calls = [];
  const rs2 = w2.resume();
  assert('executor throw: no stats → commit-failed too', rs2.err && /no stats/.test(rs2.err) && w2.manifest().state === 'commit-failed', rs2);
}

console.log('═══ 9 — orphan triggers, corrupt cells, missing tab');
{
  const w = world();
  const rs = w.resume();
  assert('a trigger with nothing to resume is refused', rs.err && /nothing to resume/.test(rs.err), rs);
  w.sheets._CycleCheckpoint.getRange(1, 1).setValue('{not json');
  const r = w.get({ expect: '110' });
  assert('a corrupt manifest cell is cleared with a warning and the fire proceeds', r.ok === true && w.cycleCount() === 111 && w.errors('Phase1-FireGuard').some(e => /clearing a corrupt/.test(e[3])), r);
  const w2 = world({ noTab: true }); w2.setCfg('checkpointForce', 1);
  const r2 = w2.get({ expect: '110' });
  assert('no tab: the checkpoint branch is a loud save failure, never a runtime tab creation', r2.ok === false && /stopped at the commit boundary/.test(r2.error) && /is missing/.test(w2.errors('FATAL-Checkpoint')[0][3]), r2);
  const w3 = world({ noTab: true });
  const r3 = w3.get({ expect: '110' });
  assert('no tab and no checkpoint branch: a normal fire is untouched', r3.ok === true && w3.cycleCount() === 111);
}

console.log('═══ 10 — a committed resume whose record never closed is closed at the next admission, nothing replayed');
{
  const w = world(); w.setCfg('checkpointForce', 1);
  w.get({ expect: '110' }); w.resume();
  // simulate: the close never landed — put the record back to checkpointed
  w.props.FIRE_ADMISSION_JSON = JSON.stringify({ cycle: 111, startedMs: w.record().startedMs, state: 'checkpointed' });
  w.setCfg('checkpointForce', 0); w.calls = [];
  const r = w.get({ expect: '111' });
  assert('record reconciled to done from the result, tab cleared, Cycle 112 ran once', r.ok === true && w.cycleCount() === 112 && w.manifest() === null && w.calls.filter(c => c === 'executor').length === 1 && w.errors('Phase11-FireGuardClose').some(e => /closed now as done/.test(e[3])), r);
}

console.log('═══ 11 — a big payload chunks and round-trips through the fake tab');
{
  const w = world({ bigIntent: true }); w.setCfg('checkpointForce', 1);
  const r = w.get({ expect: '110' });
  assert('several chunks', r.ok === true && w.manifest().n >= 3, w.manifest());
  const rs = w.resume();
  assert('resumes from several chunks', !rs.err && w.cycleCount() === 111, rs);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
