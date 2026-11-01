#!/usr/bin/env node
'use strict';

// Local-only builder. The action journal is required; optional receipts remain
// unavailable when their producers have not shipped. Nothing here writes a tab.
const fs = require('fs');
const path = require('path');
const { buildOutcomeFeed } = require('./civic47OutcomeFeed');

function readRows(file, required = false) {
  if (!fs.existsSync(file)) {
    if (required) throw new Error(file + ' missing');
    return null;
  }
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).flatMap((line, index) => {
    if (!line.trim()) return [];
    try {
      const row = JSON.parse(line);
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('object row required');
      return [row];
    } catch (e) { throw new Error(file + ':' + (index + 1) + ': ' + e.message); }
  });
}

function readReceiptsThroughCycle(dir, stem, cycle) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).flatMap(name => {
    const match = new RegExp('^' + stem + '_c([1-9][0-9]*)\\.jsonl$').exec(name);
    return match && Number(match[1]) <= cycle ? [{ name, cycle: Number(match[1]) }] : [];
  }).sort((a, b) => a.cycle - b.cycle || a.name.localeCompare(b.name));
  if (!files.length) return null;
  return files.flatMap(file => readRows(path.join(dir, file.name), true));
}

function buildLocal(root, cycle) {
  if (!Number.isInteger(Number(cycle)) || Number(cycle) < 1) throw new Error('positive Cycle required');
  const c = Number(cycle);
  const beats = path.join(root, 'output', 'beats');
  const meta = JSON.parse(fs.readFileSync(path.join(beats, 'meta.json'), 'utf8'));
  if (Number(meta.cycle) !== c) throw new Error('beat dump Cycle mismatch');
  const rows = readRows(path.join(beats, 'Civic_Action_Ledger.jsonl'), true);
  const local = path.join(root, 'output', 'cron-civic');
  // The authoritative action journal is cumulative. Saved local receipt
  // exports must be cumulative here too, or a response vanishes from the
  // official's next brief when the Cycle advances without a new reaction.
  const experiences = readReceiptsThroughCycle(local, 'experiences', c);
  const reactions = readReceiptsThroughCycle(local, 'reactions', c);
  const publications = readReceiptsThroughCycle(local, 'published', c);
  const feed = buildOutcomeFeed(rows, experiences, reactions, publications, c);
  if (!feed.available) throw new Error(feed.reason + ': ' + (feed.issues || []).join(', '));
  return feed;
}

function main(args = process.argv.slice(2)) {
  const rootArg = args.indexOf('--root');
  const root = rootArg >= 0 ? path.resolve(args[rootArg + 1] || '') : path.resolve(__dirname, '..');
  const cycleArg = args.indexOf('--cycle');
  const cycle = cycleArg >= 0 ? Number(args[cycleArg + 1]) : NaN;
  const feed = buildLocal(root, cycle);
  const dir = path.join(root, 'output', 'cron-civic');
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, 'outcome_feed_c' + cycle + '.json');
  const tmp = target + '.next-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(feed, null, 2) + '\n');
  fs.renameSync(tmp, target);
  console.log(target + ' actions=' + feed.actions.length + ' experiences=' +
    (feed.sourceAvailability.experiences ? feed.experiences.length : 'unavailable'));
}

if (require.main === module) {
  try { main(); } catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { readRows, readReceiptsThroughCycle, buildLocal, main };
