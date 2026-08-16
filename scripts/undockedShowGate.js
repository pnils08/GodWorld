#!/usr/bin/env node
'use strict';

/**
 * UNDOCKED Phase 2.2 — review gate + disk feed.
 * Same subjective-to-gated shape as Reflection_Intake: land Applied=no,
 * flip to yes/rejected only on an explicit decide. No sim / sheet write.
 *
 *   node scripts/undockedShowGate.js --enqueue --staged <staged.json> --cycle 103
 *   node scripts/undockedShowGate.js --enqueue-staged-dir --cycle 103
 *   node scripts/undockedShowGate.js --approve <episode_id> --by rb [--note "..."]
 *   node scripts/undockedShowGate.js --reject <episode_id> --by rb [--note "..."]
 *
 * Approved rows append output/spacemolt-show/feed/c{N}.json.
 * Engine-sheet wires that file into cycle intake later. This script does not.
 */

const fs = require('fs');
const path = require('path');
const C = require('./undockedShowContract');
const { assertSplit } = require('./undockedEpisodeAdapter');

const ROOT = path.resolve(__dirname, '..');
const INTAKE_V = 'UNDOCKED-INTAKE/1';
const INTAKE_DIR = path.join(ROOT, 'output', 'spacemolt-show', 'intake');
const FEED_DIR = path.join(ROOT, 'output', 'spacemolt-show', 'feed');
const STAGED_DIR = path.join(ROOT, 'output', 'spacemolt-show', 'staged');

function paths(root) {
  const r = root || ROOT;
  return {
    intake: path.join(r, 'output', 'spacemolt-show', 'intake'),
    feed: path.join(r, 'output', 'spacemolt-show', 'feed'),
    staged: path.join(r, 'output', 'spacemolt-show', 'staged'),
  };
}

function intakePath(episodeId, root) {
  return path.join(paths(root).intake, episodeId + '.json');
}

function feedPath(cycle, root) {
  return path.join(paths(root).feed, 'c' + cycle + '.json');
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
  return p;
}

function loadIntake(episodeId, root) {
  const p = intakePath(episodeId, root);
  if (!fs.existsSync(p)) throw new Error('no intake row for ' + episodeId);
  return loadJson(p);
}

function enqueue(stagedPath, cycle, root) {
  const base = root || ROOT;
  const abs = path.isAbsolute(stagedPath) ? stagedPath : path.join(base, stagedPath);
  const staged = loadJson(abs);
  if (staged.v !== 'UNDOCKED-ADAPTER/1') throw new Error('not an adapter staged file: ' + abs);
  assertSplit(staged);
  const rel = path.relative(base, abs);
  const feed = C.projectFeed(staged, cycle, rel);
  const check = C.validateFeed(feed);
  if (!check.valid) throw new Error('feed invalid: ' + check.errors.join('; '));

  const row = {
    v: INTAKE_V,
    Timestamp: new Date().toISOString(),
    POPID: staged.popid,
    Cycle: Number(cycle),
    Daypart: 'SHOW',
    Tag: C.EVENT_TYPE,
    EpisodeId: staged.episode_id,
    Applied: 'no',
    StagedPath: rel,
    Holder: staged.holder || '',
    CreditsDelta: feed.CreditsDelta,
    Magnitude: feed.Magnitude,
    Flags: feed.Flags.slice(),
    Excerpt: excerpt(staged),
    DecidedAt: null,
    DecidedBy: null,
    Note: '',
    FeedEvent: null,
  };
  return { path: saveJson(intakePath(row.EpisodeId, base), row), row: row };
}

function excerpt(staged) {
  const c = staged.facts && staged.facts.credits_delta ? staged.facts.credits_delta.value : null;
  const sys = (staged.facts.systems_visited.value || []).join(',');
  return (staged.holder || staged.popid) + ' credits=' + c + ' systems=' + sys;
}

function decide(episodeId, applied, by, note, root) {
  const base = root || ROOT;
  if (applied !== 'yes' && applied !== 'rejected') throw new Error('Applied must be yes or rejected');
  if (!by) throw new Error('--by required');
  const row = loadIntake(episodeId, base);
  if (row.Applied !== 'no') throw new Error(episodeId + ' already decided: ' + row.Applied);
  row.Applied = applied;
  row.DecidedAt = new Date().toISOString();
  row.DecidedBy = String(by);
  row.Note = note || '';
  if (applied === 'yes') {
    const staged = loadJson(path.join(base, row.StagedPath));
    assertSplit(staged);
    const feed = C.projectFeed(staged, row.Cycle, row.StagedPath);
    const check = C.validateFeed(feed);
    if (!check.valid) throw new Error('feed invalid: ' + check.errors.join('; '));
    row.FeedEvent = feed;
    appendFeed(feed, base);
  }
  saveJson(intakePath(episodeId, base), row);
  return row;
}

function appendFeed(event, root) {
  const p = feedPath(event.Cycle, root);
  let pack = { v: C.V, cycle: event.Cycle, events: [] };
  if (fs.existsSync(p)) pack = loadJson(p);
  pack.events = (pack.events || []).filter(function (e) { return e.EpisodeId !== event.EpisodeId; });
  pack.events.push(event);
  saveJson(p, pack);
  return p;
}

function enqueueStagedDir(cycle, root) {
  const dir = paths(root).staged;
  const files = fs.readdirSync(dir).filter(function (f) { return f.endsWith('.json'); });
  return files.map(function (f) { return enqueue(path.join(dir, f), cycle, root); });
}

module.exports = {
  INTAKE_V, intakePath, feedPath, enqueue, decide, appendFeed, enqueueStagedDir,
};

if (require.main === module) {
  const argv = process.argv.slice(2);
  function arg(flag) {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : null;
  }
  const cycle = arg('--cycle');
  try {
    if (argv.includes('--enqueue-staged-dir')) {
      if (!cycle) throw new Error('--cycle required');
      enqueueStagedDir(cycle).forEach(function (r) {
        console.log('INTAKE Applied=no ' + r.row.EpisodeId + ' mag=' + r.row.Magnitude
          + ' flags=' + r.row.Flags.join(','));
      });
    } else if (argv.includes('--enqueue')) {
      if (!cycle || !arg('--staged')) throw new Error('--enqueue needs --staged and --cycle');
      const r = enqueue(arg('--staged'), cycle);
      console.log('INTAKE Applied=no ' + r.row.EpisodeId);
    } else if (argv.includes('--approve')) {
      const id = arg('--approve');
      const row = decide(id, 'yes', arg('--by'), arg('--note'));
      console.log('APPLIED yes ' + row.EpisodeId + ' -> feed/c' + row.Cycle + '.json');
    } else if (argv.includes('--reject')) {
      const id = arg('--reject');
      const row = decide(id, 'rejected', arg('--by'), arg('--note'));
      console.log('APPLIED rejected ' + row.EpisodeId);
    } else {
      console.error('usage: --enqueue --staged FILE --cycle N | --enqueue-staged-dir --cycle N | --approve ID --by WHO | --reject ID --by WHO');
      process.exit(2);
    }
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}
