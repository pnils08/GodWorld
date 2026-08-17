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
 * --push transports an approved pack to the Undocked_Feed tab (research.27 2.3
 * item 4) — approval always precedes push, so only decided-yes events land.
 */

// --push reads/writes the Undocked_Feed tab via lib/sheets, which needs
// GODWORLD_SHEET_ID + GOOGLE_APPLICATION_CREDENTIALS. The gate did not load env
// before because it was disk-only; without this --push dies on "GODWORLD_SHEET_ID
// not set". Harmless for the disk-only verbs.
require('/root/GodWorld/lib/env');
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
    stagedArchive: path.join(r, 'output', 'spacemolt-show', 'staged', 'archive'),
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

  // engine.115 — DECISION GUARD. This function builds a fresh row with
  // Applied:'no' and null DecidedAt/DecidedBy/Note/FeedEvent and saves it over
  // intakePath(EpisodeId). Nothing archives staged/, so the next
  // --enqueue-staged-dir --cycle N+1 sweeps the SAME staged files and silently
  // wiped every prior approval: the intake row reverted to undecided under a new
  // Cycle while the old cycle's feed pack kept its FeedEvent. Intake and feed
  // diverge and an approved episode re-airs under a later cycle.
  // A decided row is a human's editorial ruling — re-enqueue must never erase
  // one. Returns a skip marker instead of throwing so a batch sweep reports the
  // skip and continues rather than halting on the first already-approved file.
  const existingPath = intakePath(staged.episode_id, base);
  if (fs.existsSync(existingPath)) {
    const prior = loadJson(existingPath);
    if (prior && prior.Applied && prior.Applied !== 'no') {
      return {
        path: existingPath,
        row: prior,
        skipped: true,
        reason: 'already decided (Applied=' + prior.Applied +
          (prior.DecidedBy ? ' by ' + prior.DecidedBy : '') +
          ', cycle ' + prior.Cycle + ')',
      };
    }
  }
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
  row.StagedPath = archiveStaged(row, base);
  saveJson(intakePath(episodeId, base), row);
  return row;
}

function archiveStaged(row, root) {
  const base = root || ROOT;
  const name = path.basename(row.StagedPath || '');
  if (!name || !name.endsWith('.json')) {
    throw new Error('cannot archive staged path: ' + row.StagedPath);
  }
  const destRel = path.join('output', 'spacemolt-show', 'staged', 'archive', name);
  const dest = path.join(base, destRel);
  const from = path.join(base, row.StagedPath);
  if (path.resolve(from) === path.resolve(dest)) return destRel;
  if (!fs.existsSync(from)) throw new Error('staged missing, cannot archive: ' + row.StagedPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(from, dest);
  return destRel;
}

function listSweepEligible(root) {
  const dir = paths(root).staged;
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(function (f) {
    if (f === 'archive' || !f.endsWith('.json')) return false;
    return fs.statSync(path.join(dir, f)).isFile();
  });
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

// ---------------------------------------------------------------------------
// PUSH — approved feed pack -> Undocked_Feed tab (research.27 2.3 item 4)
// ---------------------------------------------------------------------------
// The engine is Apps Script and cannot read repo disk; everything reaches it via
// sheets. This is the transport, and it is deliberately the LAST step: approval
// strictly precedes push, so only decided-yes events ever leave disk.
//
// Idempotent by construction — reads the EpisodeId column and appends only what
// is missing. It does NOT record "pushed" state back into the JSON: a
// writer-side success marker that drifts from the artifact it describes is the
// exact class that stacked 386 duplicate cards (governance.48). The tab is the
// authority on what the tab contains.
//
// StagedPath is dropped on purpose. It is a repo disk path, and the tab is
// world-facing — apparatus must not leak into it (contract FOURTH_WALL).
//
// TargetCycle vs Cycle: Cycle is provenance, the cycle the episode was flown
// for. TargetCycle is the cycle it AIRS in, assigned here at push time. An
// episode approved after its cycle closed airs in the next unfired one instead
// of silently vanishing, which is what a Cycle-only match would have done.
const FEED_TAB = 'Undocked_Feed';
const TAB_HEADERS = Object.freeze([
  'TargetCycle', 'Cycle', 'EventType', 'POPID', 'Holder', 'EpisodeId',
  'CreditsDelta', 'Systems', 'CombatEvents', 'MishapCount', 'Magnitude', 'Flags',
]);

async function pushFeed(cycle, targetCycle, root) {
  const sheets = require('../lib/sheets');
  const p = feedPath(cycle, root);
  if (!fs.existsSync(p)) throw new Error('no feed pack for c' + cycle + ' (' + p + ')');
  const pack = loadJson(p);
  const events = (pack.events || []);
  if (!events.length) return { pushed: 0, skipped: 0, reason: 'feed pack empty' };

  const existing = await sheets.getSheetData(FEED_TAB);
  if (!existing || !existing.length) throw new Error(FEED_TAB + ' unreadable — refusing to push');
  const hdr = existing[0];
  const iEp = hdr.indexOf('EpisodeId');
  if (iEp < 0) throw new Error(FEED_TAB + ' has no EpisodeId column — refusing to push');
  const already = {};
  for (let r = 1; r < existing.length; r++) {
    const v = String(existing[r][iEp] == null ? '' : existing[r][iEp]).trim();
    if (v) already[v] = true;
  }

  const rows = [];
  let skipped = 0;
  events.forEach(function (e) {
    if (already[e.EpisodeId]) { skipped++; return; }
    rows.push(TAB_HEADERS.map(function (h) {
      if (h === 'TargetCycle') return Number(targetCycle);
      const v = e[h];
      // Arrays (Systems, Flags) serialize comma-joined — the engine-side reader
      // splits on comma. Decided here rather than left to each reader.
      if (Array.isArray(v)) return v.join(',');
      return v == null ? '' : v;
    }));
  });

  if (rows.length) await sheets.appendRows(FEED_TAB, rows);
  return { pushed: rows.length, skipped: skipped, targetCycle: Number(targetCycle) };
}

function enqueueStagedDir(cycle, root) {
  const dir = paths(root).staged;
  return listSweepEligible(root).map(function (f) {
    return enqueue(path.join(dir, f), cycle, root);
  });
}

module.exports = {
  INTAKE_V, intakePath, feedPath, enqueue, decide, appendFeed, enqueueStagedDir,
  archiveStaged, listSweepEligible, pushFeed, FEED_TAB, TAB_HEADERS,
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
      const results = enqueueStagedDir(cycle);
      results.forEach(function (r) {
        if (r.skipped) {
          console.log('SKIP ' + r.row.EpisodeId + ' — ' + r.reason);
          return;
        }
        console.log('INTAKE Applied=no ' + r.row.EpisodeId + ' mag=' + r.row.Magnitude
          + ' flags=' + (r.row.Flags || []).join(','));
      });
      // engine.115: a sweep that skipped everything is the symptom of staged/
      // never being archived. Say so plainly rather than printing nothing and
      // exiting 0, which reads as "no episodes" instead of "all already decided".
      const skips = results.filter(function (r) { return r.skipped; }).length;
      if (skips) {
        console.log('(' + skips + ' of ' + results.length +
          ' already decided and left untouched — staged/ still holds them; ' +
          'archiving is tracked separately)');
      }
    } else if (argv.includes('--enqueue')) {
      if (!cycle || !arg('--staged')) throw new Error('--enqueue needs --staged and --cycle');
      const r = enqueue(arg('--staged'), cycle);
      console.log('INTAKE Applied=no ' + r.row.EpisodeId);
    } else if (argv.includes('--push')) {
      if (!cycle) throw new Error('--push needs --cycle (the feed pack to push)');
      // --target defaults to the pack's own cycle; pass it explicitly when a
      // late approval should air in a later, not-yet-fired cycle.
      const target = arg('--target') || cycle;
      pushFeed(cycle, target).then(function (r) {
        console.log('PUSH c' + cycle + ' -> ' + (r.reason || (
          r.pushed + ' row(s) appended as TargetCycle=' + r.targetCycle +
          (r.skipped ? ', ' + r.skipped + ' already present' : ''))));
      }).catch(function (e) { console.error('push failed: ' + e.message); process.exit(1); });
    } else if (argv.includes('--approve')) {
      const id = arg('--approve');
      const row = decide(id, 'yes', arg('--by'), arg('--note'));
      console.log('APPLIED yes ' + row.EpisodeId + ' -> feed/c' + row.Cycle + '.json');
    } else if (argv.includes('--reject')) {
      const id = arg('--reject');
      const row = decide(id, 'rejected', arg('--by'), arg('--note'));
      console.log('APPLIED rejected ' + row.EpisodeId);
    } else {
      console.error('usage: --enqueue --staged FILE --cycle N | --enqueue-staged-dir --cycle N | --approve ID --by WHO | --reject ID --by WHO | --push --cycle N [--target M]');
      process.exit(2);
    }
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}
