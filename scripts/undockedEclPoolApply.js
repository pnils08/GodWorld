#!/usr/bin/env node
'use strict';

/**
 * Append authored ECL rows to Event_Content_Ledger. Default dry-run. Idempotent on Text.
 * Pools: undocked (default) | memory (engine.94 B.2, scripts/memoryEclPool.js) |  civicRole (engine.286 T6, scripts/civicRoleEclPool.js) | lifeEvent (engine.286 T2, scripts/lifeEventEclPool.js).
 *
 *   node scripts/undockedEclPoolApply.js [--pool memory]
 *   node scripts/undockedEclPoolApply.js [--pool memory] --apply
 *   node scripts/undockedEclPoolApply.js --match 'the board' --apply   # only rows whose Text matches
 */

require('../lib/env');
// --pool memory selects the engine.94 memory pool (scripts/memoryEclPool.js); --pool civicRole the engine.286 Task 6 civic role pool (scripts/civicRoleEclPool.js); default stays UNDOCKED.
const POOL_ARG = (function () { const i = process.argv.indexOf('--pool'); return i >= 0 ? String(process.argv[i + 1] || '') : 'undocked'; })();
const POOLS = { undocked: './undockedEclPool', memory: './memoryEclPool', civicRole: './civicRoleEclPool', lifeEvent: './lifeEventEclPool', transit: './transitEclPool' };
if (!POOLS[POOL_ARG]) throw new Error('unknown --pool ' + POOL_ARG + ' (' + Object.keys(POOLS).join('|') + ')');
const P = require(POOLS[POOL_ARG]);

const APPLY = process.argv.includes('--apply');
// --match <regex>: append only the missing rows whose Text matches. Rows authored
// but deliberately undeployed (the 4a wager lines, S407) stay out of a targeted apply.
const MATCH = (function () { const i = process.argv.indexOf('--match'); return i >= 0 ? new RegExp(String(process.argv[i + 1] || ''), 'i') : null; })();
// --poolkey <key>: append only the missing rows of one PoolKey (engine.290: the commute rows
// occupation.transit go live while the crew rows occupation.bartCrew await the builder's titles).
const POOLKEY = (function () { const i = process.argv.indexOf('--poolkey'); return i >= 0 ? String(process.argv[i + 1] || '') : null; })();
if (POOLKEY === '' || (POOLKEY && POOLKEY.indexOf('--') === 0)) throw new Error('--poolkey needs a PoolKey value');
// engine.290: the transit pool holds rows the builder has not cleared (the crew titles) — it
// never applies whole; every transit run names its PoolKey (fail closed, codex 2026-10-15).
if (POOL_ARG === 'transit' && !POOLKEY) throw new Error('--pool transit requires --poolkey <occupation.transit|occupation.bartCrew>');

function norm(t) {
  return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

async function main() {
  const v = P.validateRows(P.ROWS);
  if (!v.valid) throw new Error(v.errors.join('; '));

  const sheets = require('../lib/sheets');
  const data = await sheets.getRawSheetData('Event_Content_Ledger');
  const hdr = data[0] || [];
  const iText = hdr.indexOf('Text');
  if (iText < 0) throw new Error('Event_Content_Ledger missing Text');
  const seen = {};
  data.slice(1).forEach(function (r) { seen[norm(r[iText])] = true; });

  if (POOLKEY && !P.ROWS.some(function (row) { return row.PoolKey === POOLKEY; })) throw new Error('--poolkey ' + POOLKEY + ' names no authored row');
  const missing = P.ROWS.filter(function (row) { return !seen[norm(row.Text)] && (!MATCH || MATCH.test(row.Text)) && (!POOLKEY || row.PoolKey === POOLKEY); });
  console.log('live rows=' + (data.length - 1) + ' authored=' + P.ROWS.length + ' missing=' + missing.length);
  missing.forEach(function (r) {
    console.log('  NEW [' + r.PoolKey + '] ' + r.Conditions + ' :: ' + r.Text);
  });

  if (!APPLY) {
    console.log('DRY RUN — Event_Content_Ledger not written');
    return;
  }
  if (!missing.length) {
    console.log('nothing to append');
    return;
  }
  const values = P.toSheetValues(missing);
  const n = await sheets.appendRows('Event_Content_Ledger', values);
  const after = await sheets.getRawSheetData('Event_Content_Ledger');
  const afterSeen = {};
  after.slice(1).forEach(function (r) { afterSeen[norm(r[after[0].indexOf('Text')])] = true; });
  const still = missing.filter(function (row) { return !afterSeen[norm(row.Text)]; });
  if (still.length) throw new Error('read-back missed ' + still.length + ' rows');
  console.log('WROTE + verified ' + n + ' rows');
}

if (require.main === module) {
  main().catch(function (err) {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = { main };
