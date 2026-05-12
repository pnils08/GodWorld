/**
 * diagnosticLedger.js — Unified diagnostic surface backed by the Engine_Errors
 * sheet, expanded to capture non-engine signals (test failures, audit findings,
 * detector flags, parser drift, validation failures) in the same surface engine
 * errors already use.
 *
 * Phase 3 of [[docs/plans/2026-05-12-test-coverage-rollout]].
 *
 * Schema (Engine_Errors, 10 cols post-expansion):
 *   A Timestamp       always — ISO 8601
 *   B Cycle           always — current cycle number
 *   C Phase           legacy — engine-error writers populate; others leave blank
 *   D Error           always — message / short description
 *   E Stack           legacy — engine-error stack; diagnostic writers store
 *                     context (file:line, failing assertion text, etc.)
 *   F Class           NEW — engine-error | test-fail | audit-finding |
 *                     detector-flag | parser-drift | validation-fail
 *   G Source          NEW — script/test/auditor name
 *   H Severity        NEW — low | medium | high
 *   I Resolved        NEW — cycle when fixed, or blank
 *   J Hash            NEW — sha1[0..12] of class+source+errorFirst100; dedup key
 *
 * The legacy Apps Script `logEngineError_()` writer in godWorldEngine2.js
 * appends 5 cells (cols A-E) — F-J stay blank for those rows. This module
 * appends 10 cells.
 *
 * Usage:
 *   const ledger = require('./lib/diagnosticLedger');
 *   await ledger.record({
 *     class: 'test-fail',
 *     source: 'scripts/engine-auditor/detectStuckInitiatives.test.js',
 *     error: 'Test 3: severity high (3 signals, no matching initiative) FAIL',
 *     context: 'expected: high, got: low',
 *     severity: 'medium',
 *     cycle: 93,
 *   });
 *
 * Idempotency:
 *   recordIfNew() reads the last N rows from Engine_Errors and skips the write
 *   if a row with the same Hash exists. Default N=100. Prevents test-runner
 *   from creating duplicate entries across CI runs.
 *
 * Testing:
 *   The module accepts an optional sheetsClient injection via
 *   `create(sheetsClient)`. Without injection, `record()` lazy-loads lib/sheets
 *   (requires GODWORLD_SHEET_ID + service account credentials). Tests use the
 *   factory to swap in a mock client without hitting the live sheet.
 */

const crypto = require('crypto');

const SHEET_NAME = 'Engine_Errors';

const VALID_CLASSES = new Set([
  'engine-error',
  'test-fail',
  'audit-finding',
  'detector-flag',
  'parser-drift',
  'validation-fail',
]);

const VALID_SEVERITIES = new Set(['low', 'medium', 'high']);

function computeHash(cls, source, error) {
  const input = `${cls || ''}|${source || ''}|${String(error || '').substring(0, 100)}`;
  return crypto.createHash('sha1').update(input).digest('hex').substring(0, 12);
}

function normalizeEntry(entry) {
  const cls = entry.class || 'engine-error';
  if (!VALID_CLASSES.has(cls)) {
    throw new Error(`diagnosticLedger: invalid class '${cls}'. Must be one of: ${[...VALID_CLASSES].join(', ')}`);
  }
  const severity = entry.severity || 'medium';
  if (!VALID_SEVERITIES.has(severity)) {
    throw new Error(`diagnosticLedger: invalid severity '${severity}'. Must be one of: ${[...VALID_SEVERITIES].join(', ')}`);
  }
  const error = String(entry.error || '');
  const source = String(entry.source || '');
  const hash = computeHash(cls, source, error);

  return {
    timestamp: entry.timestamp || new Date().toISOString(),
    cycle: entry.cycle != null ? String(entry.cycle) : '',
    phase: entry.phase || '',
    error,
    stack: String(entry.context || entry.stack || '').substring(0, 500),
    class: cls,
    source,
    severity,
    resolved: entry.resolved != null ? String(entry.resolved) : '',
    hash,
  };
}

function entryToRow(e) {
  return [e.timestamp, e.cycle, e.phase, e.error, e.stack, e.class, e.source, e.severity, e.resolved, e.hash];
}

function create(sheetsClient) {
  const sheets = sheetsClient || require('./sheets');

  async function record(entry) {
    const e = normalizeEntry(entry);
    await sheets.appendRows(SHEET_NAME, [entryToRow(e)]);
    return e.hash;
  }

  async function recordBatch(entries) {
    const rows = entries.map(en => entryToRow(normalizeEntry(en)));
    if (rows.length === 0) return [];
    await sheets.appendRows(SHEET_NAME, rows);
    return rows.map(r => r[9]);
  }

  async function recordIfNew(entry, lookback = 100) {
    const e = normalizeEntry(entry);
    const existing = await listRecent(lookback);
    if (existing.some(r => r.hash === e.hash && !r.resolved)) {
      return { hash: e.hash, written: false };
    }
    await sheets.appendRows(SHEET_NAME, [entryToRow(e)]);
    return { hash: e.hash, written: true };
  }

  async function listRecent(limit = 100) {
    const data = await sheets.getSheetAsObjects(SHEET_NAME);
    return data.slice(-limit).map(row => ({
      timestamp: row.Timestamp || '',
      cycle: row.Cycle || '',
      phase: row.Phase || '',
      error: row.Error || '',
      stack: row.Stack || '',
      class: row.Class || 'engine-error',
      source: row.Source || '',
      severity: row.Severity || '',
      resolved: row.Resolved || '',
      hash: row.Hash || '',
    }));
  }

  async function listOpen(filter = {}) {
    const recent = await listRecent(filter.lookback || 500);
    return recent.filter(r => {
      if (r.resolved) return false;
      if (filter.class && r.class !== filter.class) return false;
      if (filter.severity && r.severity !== filter.severity) return false;
      if (filter.source && !r.source.includes(filter.source)) return false;
      return true;
    });
  }

  async function markResolved(hash, cycle) {
    const data = await sheets.getSheetData(SHEET_NAME);
    if (data.length < 2) return false;
    const headers = data[0];
    const hashCol = headers.indexOf('Hash');
    const resolvedCol = headers.indexOf('Resolved');
    if (hashCol === -1 || resolvedCol === -1) {
      throw new Error('diagnosticLedger.markResolved: sheet missing Hash or Resolved column. Run schema expansion first.');
    }
    for (let i = 1; i < data.length; i++) {
      if (data[i][hashCol] === hash) {
        const colLetter = String.fromCharCode(65 + resolvedCol);
        const range = `${SHEET_NAME}!${colLetter}${i + 1}`;
        await sheets.updateRange(range, [[String(cycle)]]);
        return true;
      }
    }
    return false;
  }

  return { record, recordBatch, recordIfNew, listRecent, listOpen, markResolved };
}

// Default singleton uses real lib/sheets (lazy-loaded on first call).
const defaultInstance = create();

module.exports = {
  create,
  record: defaultInstance.record,
  recordBatch: defaultInstance.recordBatch,
  recordIfNew: defaultInstance.recordIfNew,
  listRecent: defaultInstance.listRecent,
  listOpen: defaultInstance.listOpen,
  markResolved: defaultInstance.markResolved,
  // Internals exposed for testability
  computeHash,
  normalizeEntry,
  entryToRow,
  VALID_CLASSES,
  VALID_SEVERITIES,
  SHEET_NAME,
};
