#!/usr/bin/env node
'use strict';

/**
 * Append authored UNDOCKED ECL rows to Event_Content_Ledger.
 * Default dry-run. Idempotent on Text.
 *
 *   node scripts/undockedEclPoolApply.js
 *   node scripts/undockedEclPoolApply.js --apply
 */

require('../lib/env');
const P = require('./undockedEclPool');

const APPLY = process.argv.includes('--apply');

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

  const missing = P.ROWS.filter(function (row) { return !seen[norm(row.Text)]; });
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
