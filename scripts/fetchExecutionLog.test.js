// engine.358: the run-record reader behind run-cycle Step 3.5.
const assert = require('assert');
const f = require('./fetchExecutionLog');
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('  ok   ' + name); } catch (e) { fail++; console.log('  FAIL ' + name + ' — ' + e.message); } };
const mk = (cycle, start, state, life, gen, log, timings) => ({ cycle, runStartedAt: start, state, lifecycle: life, checkpointGen: gen, log,
  timing: timings ? { totalMs: 5, phaseCount: timings.length, slowest: [], timings } : null, engineErrors: 0, auditIssues: 0, rngDraws: 9 });
const ok = [{ phase: 'P1', ms: 5, ok: true }], bad = [{ phase: 'P1', ms: 5, ok: true }, { phase: 'Phase11-X', ms: 1, ok: false }];
const rowsFor = (rec, size) => { const enc = JSON.stringify(rec), parts = []; for (let i = 0; i < enc.length; i += size) parts.push(enc.slice(i, i + size));
  return parts.map((d, i) => ['~' + rec.cycle, '~' + rec.runStartedAt, '~' + rec.state, '~' + rec.lifecycle, '~' + (i + 1), '~' + parts.length, '~' + d]); };
t('a record split across rows reads back whole', () => { const r = mk(5, '2026-01-02T00:00:00.000Z', 'done', 'run', null, ['line'], ok); assert.deepStrictEqual(f.recordsFromRows(rowsFor(r, 40))[0], r); });
t('a record with a part missing is never read', () => { assert.strictEqual(f.recordsFromRows(rowsFor(mk(5, 'x', 'done', 'run', null, ['l'], ok), 40).slice(1)).length, 0); });
t('mixed part counts are never read', () => { const rows = rowsFor(mk(5, 'x', 'done', 'run', null, ['l'], ok), 40); rows[0][5] = '~9'; assert.strictEqual(f.recordsFromRows(rows).length, 0); });
t('the latest done record wins', () => { const recs = [mk(5, '2026-01-01T00:00:00.000Z', 'done', 'run', null, ['old'], ok), mk(5, '2026-01-02T00:00:00.000Z', 'done', 'run', null, ['new'], ok)]; assert.strictEqual(f.pickRecord(recs, 5).log[0], 'new'); });
t('a done record with no timings is never picked', () => { assert.strictEqual(f.pickRecord([mk(7, 'x', 'done', 'run', null, [], [])], 7), null); });
t('an aborted or checkpointed record alone is never picked', () => { assert.strictEqual(f.pickRecord([mk(8, 'x', 'aborted', 'run', null, [], ok), mk(8, 'y', 'checkpointed', 'checkpointed', 3, [], ok)], 8), null); });
t('a resume is joined after its own checkpointed part', () => { const p = f.pickRecord([mk(6, 'a', 'checkpointed', 'checkpointed', 7, ['before'], ok), mk(6, 'b', 'checkpointed', 'checkpointed', 2, ['other gen'], ok), mk(6, 'c', 'done', 'resumed', 7, ['tail'], ok)], 6); assert.deepStrictEqual(p.log, ['before', 'tail']); });
t('a failed phase in a resume fails the gate', () => { const s = f.summarize(f.renderRecord(mk(6, 'c', 'done', 'resumed', 7, ['tail'], bad))); assert.deepStrictEqual(s.failedPhases, ['Phase11-X']); });
t('the rendered log carries the gate lines once', () => { const txt = f.renderRecord(mk(5, 'x', 'done', 'run', null, ['line'], ok)); assert(/Execution started/.test(txt)); assert.strictEqual((txt.match(/Cycle completed\./g) || []).length, 1); });
t('summarize reads the last timing line', () => { const txt = '{"totalMs":1,"phaseCount":1,"timings":[{"phase":"A","ms":1,"ok":true}]}\n' + f.renderRecord(mk(6, 'c', 'done', 'resumed', 7, [], bad)); assert.deepStrictEqual(f.summarize(txt).failedPhases, ['Phase11-X']); });
t('unTilde strips one leading ~ only', () => { assert.strictEqual(f.unTilde('~~a'), '~a'); assert.strictEqual(f.unTilde('b'), 'b'); });
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
