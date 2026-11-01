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

function buildLocal(root, cycle) {
  if (!Number.isInteger(Number(cycle)) || Number(cycle) < 1) throw new Error('positive Cycle required');
  const c = Number(cycle);
  const beats = path.join(root, 'output', 'beats');
  const meta = JSON.parse(fs.readFileSync(path.join(beats, 'meta.json'), 'utf8'));
  if (Number(meta.cycle) !== c) throw new Error('beat dump Cycle mismatch');
  const rows = readRows(path.join(beats, 'Civic_Action_Ledger.jsonl'), true);
  const local = path.join(root, 'output', 'cron-civic');
  const experiences = readRows(path.join(local, 'experiences_c' + c + '.jsonl'));
  const reactions = readRows(path.join(local, 'reactions_c' + c + '.jsonl'));
  const publications = readRows(path.join(local, 'published_c' + c + '.jsonl'));
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
module.exports = { readRows, buildLocal, main };
