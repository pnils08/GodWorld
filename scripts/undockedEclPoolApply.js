#!/usr/bin/env node
'use strict';

/**
 * Append authored ECL rows to Event_Content_Ledger. Default dry-run. Idempotent on Text.
 * Pools: undocked (default) | memory (engine.94 B.2, scripts/memoryEclPool.js) |  civicRole (engine.286 T6, scripts/civicRoleEclPool.js) | lifeEvent (engine.286 T2, scripts/lifeEventEclPool.js).
 *
 *   node scripts/undockedEclPoolApply.js [--pool memory]
 *   node scripts/undockedEclPoolApply.js [--pool memory] --apply
 *   node scripts/undockedEclPoolApply.js --match 'the board' --apply   # only rows whose Text matches
 *   node scripts/undockedEclPoolApply.js --active no --match '\$LEADER' [--apply]   # hold/release live rows (Active cell)
 *   node scripts/undockedEclPoolApply.js --retag [--apply]              # research.29 Move 4: rewrite live Text
 *                                                                       # in place for rows carrying `was:`
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

// --retag (research.29 Move 4, engine.291): a pool row with `was:` replaces the live row whose
// Text equals `was` — Text cell only, in place, same row number; rows whose `was` is not live
// are listed and skipped (the undeployed wager lines); a `was` that matches more than one live
// row aborts. Dry-run default; read-back after the write.
const RETAG = process.argv.includes('--retag');
// --active yes|no --match <regex>: flip the Active cell (the loader's kill switch) on the live
// rows whose Text matches — hold rows an engine fix has not caught up with, release after.
const ACTIVE = (function () { const i = process.argv.indexOf('--active'); return i >= 0 ? String(process.argv[i + 1] || '') : null; })();
if (ACTIVE !== null && ACTIVE !== 'yes' && ACTIVE !== 'no') throw new Error('--active needs yes|no');
if (ACTIVE !== null && !MATCH) throw new Error('--active needs --match <regex>');

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

  if (RETAG) return retag_(sheets, data, hdr, iText);
  if (ACTIVE !== null) return setActive_(sheets, data, hdr, iText);

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

async function setActive_(sheets, data, hdr, iText) {
  const iActive = hdr.indexOf('Active');
  if (iActive < 0) throw new Error('Event_Content_Ledger missing Active');
  const todo = [];
  data.slice(1).forEach(function (r, i) {
    if (!MATCH.test(String(r[iText] || ''))) return;
    if (String(r[iActive] || '').trim().toLowerCase() === ACTIVE) return;
    todo.push({ row: i + 2, text: r[iText], from: r[iActive] });
  });
  console.log('live rows=' + (data.length - 1) + ' active->' + ACTIVE + ' rows=' + todo.length);
  todo.forEach(function (t) { console.log('  R' + t.row + ' ' + (t.from || '(blank)') + ' -> ' + ACTIVE + ' :: ' + t.text); });
  if (!APPLY) { console.log('DRY RUN — Event_Content_Ledger not written'); return; }
  if (!todo.length) { console.log('nothing to flip'); return; }
  const col = String.fromCharCode(65 + iActive);
  for (let i = 0; i < todo.length; i++) await sheets.updateRange('Event_Content_Ledger!' + col + todo[i].row, [[ACTIVE]]);
  const after = await sheets.getRawSheetData('Event_Content_Ledger');
  const bad = todo.filter(function (t) { return String(after[t.row - 1][iActive] || '').trim().toLowerCase() !== ACTIVE; });
  if (bad.length) throw new Error('active read-back missed ' + bad.length + ' rows');
  console.log('FLIPPED + verified ' + todo.length + ' rows Active=' + ACTIVE);
}

async function retag_(sheets, data, hdr, iText) {
  const byText = {};
  data.slice(1).forEach(function (r, i) { const k = norm(r[iText]); (byText[k] = byText[k] || []).push(i + 2); });
  const todo = [], notLive = [], done = [];
  P.ROWS.filter(function (r) { return r.was != null; }).forEach(function (r) {
    const hits = byText[norm(r.was)] || [];
    if (hits.length > 1) throw new Error('retag: `was` matches ' + hits.length + ' live rows: ' + r.was);
    if (hits.length === 1) todo.push({ row: hits[0], was: r.was, text: r.Text });
    else if ((byText[norm(r.Text)] || []).length) done.push(r.Text);
    else notLive.push(r.was);
  });
  console.log('live rows=' + (data.length - 1) + ' retag=' + todo.length + ' already=' + done.length + ' not-live=' + notLive.length);
  todo.forEach(function (t) { console.log('  R' + t.row + ' was :: ' + t.was + '\n      now :: ' + t.text); });
  notLive.forEach(function (w) { console.log('  SKIP not live :: ' + w); });
  if (!APPLY) { console.log('DRY RUN — Event_Content_Ledger not written'); return; }
  if (!todo.length) { console.log('nothing to retag'); return; }
  const col = String.fromCharCode(65 + iText);
  for (let i = 0; i < todo.length; i++) {
    await sheets.updateRange('Event_Content_Ledger!' + col + todo[i].row, [[todo[i].text]]);
  }
  const after = await sheets.getRawSheetData('Event_Content_Ledger');
  const bad = todo.filter(function (t) { return norm(after[t.row - 1][iText]) !== norm(t.text); });
  if (bad.length) throw new Error('retag read-back missed ' + bad.length + ' rows: R' + bad.map(function (b) { return b.row; }).join(' R'));
  console.log('RETAGGED + verified ' + todo.length + ' rows');
}

if (require.main === module) {
  main().catch(function (err) {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = { main };
