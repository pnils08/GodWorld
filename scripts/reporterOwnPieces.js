#!/usr/bin/env node
/**
 * reporterOwnPieces.js — reporter template part 4 (pipeline.110, AGENT_BOOT_TEMPLATES §4):
 * what a reporter has printed, by byline, newest first, each with its Cycle.
 *
 * Source: archive/ARTICLE_INDEX.jsonl (one row per piece; bylinePopid, cycle, era,
 * published, canon, citizens, copies). Every reporter, the same reader.
 *
 * ownPieces(popid, opts) -> [{ cycle, era, title, type, words, path, citizens }]
 *   opts.names   — names in front of the reporter this wake; keeps the pieces whose
 *                  title or named citizens carry one of them (the pieces "on the records
 *                  in front of them"). Omitted: every piece.
 *   opts.limit   — at most this many (default all).
 *   opts.rows    — index rows (tests); default the index on disk.
 *
 * Only published canon pieces count. A piece with no Cycle (pre-cycle archive) sorts after
 * every Cycle-stamped piece.
 *
 * CLI: node scripts/reporterOwnPieces.js POP-00007 [--names "Keane,Dillon"] [--limit 10]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'archive', 'ARTICLE_INDEX.jsonl');

function loadIndex(file) {
  const text = fs.readFileSync(file || INDEX, 'utf8');
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch (_) { /* a bad line is skipped, not fatal */ }
  }
  return rows;
}

function cycleOf(row) {
  const n = Number(row.cycle);
  return row.cycle != null && row.cycle !== '' && Number.isFinite(n) ? n : null;
}

function matchesNames(row, names) {
  const hay = [row.title || ''].concat((row.citizens || []).map(c => c && c.name || ''))
    .join(' | ').toLowerCase();
  return names.some(n => n && hay.includes(String(n).toLowerCase()));
}

function ownPieces(popid, opts) {
  opts = opts || {};
  const rows = opts.rows || loadIndex(opts.index);
  const names = (opts.names || []).map(s => String(s).trim()).filter(Boolean);
  const out = [];
  for (const r of rows) {
    if (r.bylinePopid !== popid) continue;
    if (r.published !== true || r.canon !== true) continue;
    if (names.length && !matchesNames(r, names)) continue;
    const copy = (r.copies || [])[0] || {};
    out.push({
      cycle: cycleOf(r),
      era: r.era || null,
      title: r.title || '',
      type: r.type || null,
      words: r.words || null,
      path: copy.path || null,
      citizens: (r.citizens || []).map(c => c && c.name).filter(n => n && n !== r.bylineName)
    });
  }
  out.sort((a, b) => {
    if (a.cycle == null && b.cycle == null) return 0;
    if (a.cycle == null) return 1;
    if (b.cycle == null) return -1;
    return b.cycle - a.cycle;
  });
  return opts.limit ? out.slice(0, opts.limit) : out;
}

function formatPieces(pieces) {
  return pieces.map(p =>
    (p.cycle != null ? 'C' + p.cycle : (p.era || 'pre-cycle')) + ' — ' + p.title +
    (p.citizens.length ? ' (' + p.citizens.slice(0, 6).join(', ') + ')' : '')
  ).join('\n');
}

module.exports = { ownPieces, formatPieces, loadIndex };

if (require.main === module) {
  const args = process.argv.slice(2);
  const popid = args.find(a => /^POP-\d+$/.test(a));
  if (!popid) { console.error('Usage: node scripts/reporterOwnPieces.js POP-00007 [--names "A,B"] [--limit N]'); process.exit(1); }
  const val = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
  const names = val('--names') ? val('--names').split(',') : [];
  const limit = val('--limit') ? Number(val('--limit')) : 0;
  const pieces = ownPieces(popid, { names, limit });
  console.log(pieces.length + ' pieces');
  console.log(formatPieces(pieces));
}
