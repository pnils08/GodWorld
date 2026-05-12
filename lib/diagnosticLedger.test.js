/**
 * diagnosticLedger.test.js — coverage for normalization, hashing, dedup,
 * factory injection, listOpen filter, markResolved write path. Uses a mock
 * sheetsClient so no live sheet I/O.
 *
 * Run: node lib/diagnosticLedger.test.js
 * Exits 0 on pass, 1 on failure.
 */

const ledger = require('./diagnosticLedger');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const HEADERS = ['Timestamp', 'Cycle', 'Phase', 'Error', 'Stack', 'Class', 'Source', 'Severity', 'Resolved', 'Hash'];

function mockSheetsClient(initial = []) {
  const state = { rows: [...initial], appendCalls: [], updateCalls: [] };
  return {
    state,
    async appendRows(sheetName, rows) {
      state.appendCalls.push({ sheetName, rows });
      for (const r of rows) {
        const obj = {};
        HEADERS.forEach((h, i) => { obj[h] = r[i] != null ? String(r[i]) : ''; });
        state.rows.push(obj);
      }
      return rows.length;
    },
    async getSheetAsObjects() { return state.rows; },
    async getSheetData() {
      if (state.rows.length === 0) return [];
      return [HEADERS, ...state.rows.map(r => HEADERS.map(h => r[h] || ''))];
    },
    async updateRange(range, values) {
      state.updateCalls.push({ range, values });
      const match = range.match(/!([A-Z])(\d+)$/);
      if (match) {
        const colIdx = match[1].charCodeAt(0) - 65;
        const rowIdx = parseInt(match[2], 10) - 2;
        if (state.rows[rowIdx]) {
          state.rows[rowIdx][HEADERS[colIdx]] = values[0][0];
        }
      }
    },
  };
}

async function main() {
  console.log('Test 1: normalizeEntry — defaults + hash computed');
  {
    const e = ledger.normalizeEntry({ source: 'test.js', error: 'fail' });
    assert("default class = 'engine-error'", e.class === 'engine-error');
    assert("default severity = 'medium'", e.severity === 'medium');
    assert('hash is 12 chars', e.hash.length === 12);
    assert('hash deterministic', ledger.computeHash('engine-error', 'test.js', 'fail') === e.hash);
  }

  console.log('\nTest 2: normalizeEntry — invalid class rejected');
  {
    let threw = false;
    try { ledger.normalizeEntry({ class: 'banana', error: 'x' }); } catch (err) { threw = true; }
    assert('invalid class throws', threw);
  }

  console.log('\nTest 3: normalizeEntry — invalid severity rejected');
  {
    let threw = false;
    try { ledger.normalizeEntry({ severity: 'critical', error: 'x' }); } catch (err) { threw = true; }
    assert('invalid severity throws', threw);
  }

  console.log('\nTest 4: record() writes a 10-col row');
  {
    const mock = mockSheetsClient();
    const inst = ledger.create(mock);
    const hash = await inst.record({
      class: 'test-fail',
      source: 'scripts/engine-auditor/detectStuckInitiatives.test.js',
      error: 'Test 3 FAIL',
      severity: 'medium',
      cycle: 93,
    });
    assert('appendRows called once', mock.state.appendCalls.length === 1);
    assert('row has 10 cells', mock.state.appendCalls[0].rows[0].length === 10);
    assert('hash returned', typeof hash === 'string' && hash.length === 12);
    assert("row[5] = 'test-fail' (class)", mock.state.appendCalls[0].rows[0][5] === 'test-fail');
    assert('row[6] = source', mock.state.appendCalls[0].rows[0][6] === 'scripts/engine-auditor/detectStuckInitiatives.test.js');
  }

  console.log('\nTest 5: recordIfNew — dedup when same hash exists unresolved');
  {
    const mock = mockSheetsClient();
    const inst = ledger.create(mock);
    await inst.record({ class: 'test-fail', source: 'a.js', error: 'X' });
    const result = await inst.recordIfNew({ class: 'test-fail', source: 'a.js', error: 'X' });
    assert('second write skipped (dedup hit)', result.written === false);
    assert('hash returned even when skipped', result.hash.length === 12);
    assert('only 1 row appended', mock.state.appendCalls.length === 1);
  }

  console.log('\nTest 6: recordIfNew — re-records if prior is resolved');
  {
    const mock = mockSheetsClient();
    const inst = ledger.create(mock);
    const hash = await inst.record({ class: 'test-fail', source: 'b.js', error: 'Y' });
    await inst.markResolved(hash, 93);
    const result = await inst.recordIfNew({ class: 'test-fail', source: 'b.js', error: 'Y' });
    assert('resolved prior allows re-record', result.written === true);
  }

  console.log('\nTest 7: recordBatch — atomic multi-row');
  {
    const mock = mockSheetsClient();
    const inst = ledger.create(mock);
    const hashes = await inst.recordBatch([
      { class: 'test-fail', source: 't1.js', error: 'a' },
      { class: 'audit-finding', source: 'auditor', error: 'b', severity: 'high' },
      { class: 'detector-flag', source: 'detect.js', error: 'c' },
    ]);
    assert('returns 3 hashes', hashes.length === 3);
    assert('one appendRows call (batched)', mock.state.appendCalls.length === 1);
    assert('3 rows in one call', mock.state.appendCalls[0].rows.length === 3);
  }

  console.log('\nTest 8: listOpen — filters by class + resolved status');
  {
    const mock = mockSheetsClient();
    const inst = ledger.create(mock);
    await inst.recordBatch([
      { class: 'test-fail', source: 'a.js', error: '1' },
      { class: 'audit-finding', source: 'b.js', error: '2' },
      { class: 'test-fail', source: 'c.js', error: '3', resolved: 90 },
    ]);
    const open = await inst.listOpen({ class: 'test-fail' });
    assert('1 open test-fail (resolved one excluded)', open.length === 1, `got ${open.length}`);
    assert("open[0].error = '1'", open[0] && open[0].error === '1');
  }

  console.log('\nTest 9: markResolved — writes cycle to Resolved column');
  {
    const mock = mockSheetsClient();
    const inst = ledger.create(mock);
    const hash = await inst.record({ class: 'test-fail', source: 'x.js', error: 'todo' });
    const ok = await inst.markResolved(hash, 95);
    assert('markResolved returns true', ok);
    assert('updateRange called', mock.state.updateCalls.length === 1);
    assert('updates I column (Resolved)', mock.state.updateCalls[0].range.includes('!I'));
    assert('writes cycle 95', mock.state.updateCalls[0].values[0][0] === '95');
  }

  console.log('\nTest 10: hash dedup key is stable across error message suffix');
  {
    // Same first 100 chars → same hash. Different suffix → still same hash.
    const h1 = ledger.computeHash('test-fail', 'x.js', 'A'.repeat(150));
    const h2 = ledger.computeHash('test-fail', 'x.js', 'A'.repeat(150) + 'extra');
    assert('matching prefix → matching hash', h1 === h2);
    const h3 = ledger.computeHash('test-fail', 'x.js', 'B'.repeat(150));
    assert('different prefix → different hash', h1 !== h3);
  }

  console.log('\nTest 11: listOpen — severity filter');
  {
    const mock = mockSheetsClient();
    const inst = ledger.create(mock);
    await inst.recordBatch([
      { class: 'audit-finding', source: 'a', error: 'low', severity: 'low' },
      { class: 'audit-finding', source: 'b', error: 'high', severity: 'high' },
      { class: 'audit-finding', source: 'c', error: 'high', severity: 'high' },
    ]);
    const open = await inst.listOpen({ severity: 'high' });
    assert('2 high-severity entries', open.length === 2, `got ${open.length}`);
  }

  console.log('\nTest 12: empty recordBatch is a no-op');
  {
    const mock = mockSheetsClient();
    const inst = ledger.create(mock);
    const hashes = await inst.recordBatch([]);
    assert('empty batch returns []', hashes.length === 0);
    assert('no appendRows call', mock.state.appendCalls.length === 0);
  }
}

main()
  .then(() => {
    console.log(`\n${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('Test harness error:', err);
    process.exit(1);
  });
