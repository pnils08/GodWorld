#!/usr/bin/env node
'use strict';

/**
 * cron-undocked-run.js — UNDOCKED daily flight orchestrator (plan §2.5,
 * docs/plans/2026-08-07-spacemolt-game-show.md; Mike sign-off 2026-08-18).
 *
 * One-shot, crontab-scheduled (plan principle 5 — never pm2 cron_restart).
 * Chains the whole nightly show pipeline, fail-loud at every stage:
 *
 *   1. cycle     — World_Config.cycleCount (flown cycle); airs at cycle+1
 *   2. pilot     — rotation over the latest draw manifest's cast:
 *                  fewest flights this cycle wins, ties break in cast order
 *   3. flight    — scripts/undockedEpisode.js (bounded runner, 10-min cap)
 *   4. adapter   — scripts/undockedEpisodeAdapter.js (deterministic facts)
 *   5. gate      — enqueue -> autoDecide (auto-approve on contract validation;
 *                  invalid parks Applied=no for human review, §2.5 decision 2)
 *   6. push      — approved events -> Undocked_Feed tab, TargetCycle=cycle+1
 *   7. standings — scripts/undockedStandings.js recompute (if present)
 *
 * A parked (invalid) episode is the gate WORKING, not a failure: the run still
 * exits 0 and says PARKED loudly. Missing creds/mission for a drawn pilot is a
 * real failure (succession wiring not done) and exits non-zero.
 *
 * Usage: node scripts/cron-undocked-run.js [--minutes 10] [--dry-run]
 *   --dry-run: resolve cycle + pilot, print the plan, run nothing.
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SHOW = path.join(ROOT, 'output', 'spacemolt-show');
const LOCK = path.join(SHOW, '.orchestrator.lock');

function log(msg) {
  console.log('[undocked-run ' + new Date().toISOString() + '] ' + msg);
}

function latestDraw() {
  const dir = path.join(SHOW, 'draws');
  const files = fs.readdirSync(dir)
    .map(f => /^draw-(\d+)\.json$/.exec(f))
    .filter(Boolean)
    .sort((a, b) => Number(a[1]) - Number(b[1]));
  if (!files.length) throw new Error('no draw manifest in ' + dir);
  return JSON.parse(fs.readFileSync(path.join(dir, files[files.length - 1][0]), 'utf8'));
}

function sessionName(popid) {
  return 'undocked-' + String(popid).toLowerCase().replace(/-/g, '');
}

// Rotation: fewest intake rows for this flown cycle wins; cast order breaks
// ties. Deterministic, and self-heals across missed days — whoever is behind
// flies next.
function pickPilot(cast, cycle) {
  const intakeDir = path.join(SHOW, 'intake');
  const counts = {};
  if (fs.existsSync(intakeDir)) {
    for (const f of fs.readdirSync(intakeDir)) {
      if (!f.endsWith('.json')) continue;
      let r;
      try { r = JSON.parse(fs.readFileSync(path.join(intakeDir, f), 'utf8')); } catch (_) { continue; }
      if (Number(r.Cycle) !== Number(cycle)) continue;
      const pop = String(r.POPID || '').toUpperCase();
      counts[pop] = (counts[pop] || 0) + 1;
    }
  }
  let best = null;
  for (const c of cast) {
    const n = counts[String(c.popid).toUpperCase()] || 0;
    if (!best || n < best.n) best = { pilot: c, n };
  }
  return best.pilot;
}

async function currentCycle() {
  const sheets = require('../lib/sheets');
  const rows = await sheets.getSheetAsObjects('World_Config');
  const row = rows.find(r => String(r.Key) === 'cycleCount');
  const n = row && Number(row.Value);
  if (!Number.isFinite(n) || n < 1) throw new Error('World_Config.cycleCount unreadable');
  return n;
}

function newestEpisodeSidecar(session, sinceMs) {
  const dir = path.join(SHOW, 'episodes');
  const hits = fs.readdirSync(dir)
    .filter(f => f.startsWith(session + '-') && f.endsWith('.json'))
    .map(f => ({ f, m: fs.statSync(path.join(dir, f)).mtimeMs }))
    .filter(e => e.m >= sinceMs)
    .sort((a, b) => b.m - a.m);
  return hits.length ? path.join(dir, hits[0].f) : null;
}

async function main() {
  const argv = process.argv.slice(2);
  const minutes = argv.includes('--minutes') ? argv[argv.indexOf('--minutes') + 1] : '10';
  const dryRun = argv.includes('--dry-run');

  const cycle = await currentCycle();
  const target = cycle + 1;
  const draw = latestDraw();
  const pilot = pickPilot(draw.cast, cycle);
  const session = sessionName(pilot.popid);
  const missionFile = path.join(SHOW, 'missions', session + '.txt');

  log('cycle ' + cycle + ' (airs c' + target + '), draw #' + draw.draw +
    ', pilot ' + pilot.name + ' (' + pilot.popid + ')');

  if (dryRun) { log('dry-run — stopping before flight'); return; }

  if (fs.existsSync(LOCK)) {
    throw new Error('orchestrator lock held (' + LOCK + ') — refusing to overlap');
  }
  fs.writeFileSync(LOCK, String(process.pid));
  process.on('exit', () => { try { fs.unlinkSync(LOCK); } catch (_) {} });

  // 3. flight — the runner does its own preflight (creds, mission, key) and
  // exits non-zero on any miss; that propagates as this run's failure.
  const flightStart = Date.now();
  log('flight: launching ' + session);
  execFileSync('node', [path.join(ROOT, 'scripts', 'undockedEpisode.js'),
    '--session', session, '--mission-file', missionFile, '--minutes', String(minutes)],
    { cwd: ROOT, stdio: 'inherit', timeout: (Number(minutes) * 60 + 120) * 1000 });

  const sidecar = newestEpisodeSidecar(session, flightStart);
  if (!sidecar) throw new Error('flight produced no episode sidecar for ' + session);
  log('flight done: ' + path.relative(ROOT, sidecar));

  // 4. adapter — deterministic fact extraction, writes staged/
  execFileSync('node', [path.join(ROOT, 'scripts', 'undockedEpisodeAdapter.js'),
    '--episode', sidecar], { cwd: ROOT, stdio: 'inherit', timeout: 300000 });

  // 5. gate — sweep staged/ into intake at the flown cycle, then auto-decide.
  const G = require('./undockedShowGate');
  const enq = G.enqueueStagedDir(cycle);
  enq.forEach(r => log(r.skipped
    ? 'gate: SKIP ' + r.row.EpisodeId + ' — ' + r.reason
    : 'gate: intake ' + r.row.EpisodeId + ' seq=' + r.row.Seq + ' mag=' + r.row.Magnitude));
  const auto = G.autoDecide(cycle);
  auto.approved.forEach(id => log('gate: AUTO-APPROVED ' + id));
  auto.parked.forEach(p => log('gate: PARKED ' + p.episodeId + ' — ' + p.reason + ' (needs human review)'));

  // 6. push — only decided-yes events leave disk; TargetCycle = next fire.
  if (auto.approved.length) {
    const res = await G.pushFeed(cycle, target);
    log('push: ' + res.pushed + ' row(s) -> Undocked_Feed TargetCycle=' + res.targetCycle +
      (res.skipped ? ' (' + res.skipped + ' already present)' : ''));
  } else {
    log('push: nothing approved this run');
  }

  // 7. standings — recompute if the standings script has landed.
  const standings = path.join(ROOT, 'scripts', 'undockedStandings.js');
  if (fs.existsSync(standings)) {
    execFileSync('node', [standings], { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
  }

  log('done');
}

main().catch(e => {
  console.error('[undocked-run] FATAL: ' + (e && e.message || e));
  process.exit(1);
});
