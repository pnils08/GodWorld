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
 *   2. pilot     — Undocked_Draw tab rows at TargetCycle = cycle+1 (contract
 *                  (a′); cast-* in Slot order, alt-* bench), rotation =
 *                  fewest flights this cycle, Slot order breaks ties; missing
 *                  tab/rows -> latest local draw manifest. Preflight per
 *                  candidate: credentials (minted on demand via
 *                  scripts/undockedMintAccount.js — the runner never
 *                  self-registers), mission brief (generated on demand via
 *                  scripts/undockedMissionBrief.js); failure falls to alt-1…
 *   3. flight    — scripts/undockedEpisode.js (bounded runner, WINDOW_MINUTES cap — 20)
 *   4. adapter   — scripts/undockedEpisodeAdapter.js (deterministic facts)
 *   5. gate      — enqueue -> autoDecide (auto-approve on contract validation;
 *                  invalid parks Applied=no for human review, §2.5 decision 2)
 *   6. push      — approved events -> Undocked_Feed tab, TargetCycle=cycle+1
 *   7. standings — scripts/undockedStandings.js recompute (if present)
 *   8. pages     — pipeline.95: every applied night with no receipt goes to its
 *                  pilot's citizen page as a show record (undockedShowRecord);
 *                  a failed write logs loudly and retries the next night
 *
 * A parked (invalid) episode is the gate WORKING, not a failure: the run still
 * exits 0 and says PARKED loudly. Missing creds/mission for a drawn pilot is a
 * real failure (succession wiring not done) and exits non-zero.
 *
 * Usage: node scripts/cron-undocked-run.js [--minutes 20] [--dry-run]
 *   --dry-run: resolve cycle + pilot, print the plan, run nothing.
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SHOW = path.join(ROOT, 'output', 'spacemolt-show');
const LOCK = path.join(SHOW, '.orchestrator.lock');
const PAGED = path.join(SHOW, 'paged.json'); // pipeline.95 — episode -> page customId, one receipt per night written

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

// ---- Cast loading (contract a′, S438): Undocked_Draw tab first --------------
// Rows where TargetCycle === cycleCount+1; cast-* slots in Slot order, alt-*
// as the succession bench. Missing tab / no rows for the target / unreadable
// => latest local draw manifest, so this is safe before the engine cut lands
// and before the live tab exists.

function bySlot(a, b) {
  const n = s => Number(String(s.Slot || s.slot || '').replace(/\D/g, '')) || 0;
  return n(a) - n(b);
}

function tabPilot(r) {
  return {
    popid: String(r.POPID || '').trim(),
    name: String(r.Name || '').trim(),
    slot: String(r.Slot || '').trim(),
    birthYear: String(r.BirthYear || '').trim(),
    neighborhood: String(r.Neighborhood || '').trim(),
    role: String(r.Role || '').trim(),
    employerBizId: String(r.Employer || '').trim(),
  };
}

// Pure row filter, exported for tests: Undocked_Draw rows at TargetCycle ->
// {cast, alternates} in Slot order. Empty cast = caller falls back to the
// local manifest.
function drawRowsToRoster(rows, targetCycle) {
  const mine = (rows || []).filter(r => Number(r.TargetCycle) === Number(targetCycle));
  return {
    cast: mine.filter(r => String(r.Slot || '').startsWith('cast-')).sort(bySlot).map(tabPilot),
    alternates: mine.filter(r => String(r.Slot || '').startsWith('alt-')).sort(bySlot).map(tabPilot),
  };
}

async function loadCast(cycle) {
  const target = cycle + 1;
  try {
    const sheets = require('../lib/sheets');
    const rows = await sheets.getSheetAsObjects('Undocked_Draw');
    const { cast, alternates } = drawRowsToRoster(rows, target);
    if (cast.length) {
      return {
        source: 'Undocked_Draw tab (TargetCycle=' + target + ', ' + cast.length + ' cast, ' + alternates.length + ' alt)',
        cast, alternates,
      };
    }
    log('Undocked_Draw has no rows for TargetCycle=' + target + ' — falling back to latest local draw manifest');
  } catch (e) {
    log('Undocked_Draw unreadable (' + (e && e.message || e) + ') — falling back to latest local draw manifest');
  }
  const draw = latestDraw();
  return {
    source: 'local manifest draw #' + draw.draw + ' (cycle ' + draw.cycle + ')',
    cast: draw.cast, alternates: draw.alternates || [],
  };
}

// EmployerBizId -> speakable business name via the beats dump; omitted when
// the dump or the row is absent (a raw BIZ-ID never reaches a pilot brief).
let bizNames = null;
function employerNameFor(bizId) {
  if (!bizId) return null;
  if (!bizNames) {
    bizNames = {};
    try {
      const lines = fs.readFileSync(path.join(ROOT, 'output', 'beats', 'Business_Ledger.jsonl'), 'utf8').split('\n');
      for (const line of lines) {
        if (!line) continue;
        let r;
        try { r = JSON.parse(line); } catch (_) { continue; }
        if (r.BIZ_ID && r.Name) bizNames[r.BIZ_ID] = r.Name;
      }
    } catch (_) { /* beats dump absent — employer clause omitted */ }
  }
  return bizNames[bizId] || null;
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

// ---- Pilot resolution: rotation pick, then preflight with succession -------
// Contract (a′): the rotation pick comes from the cast; a candidate that fails
// preflight (credentials unmintable, brief ungeneratable) falls to alt-1… in
// order, and we say so in the log. Minting and brief generation are lazy —
// only the pilot about to fly gets either.

function ensureCredentials(pilot) {
  const M = require('./undockedMintAccount');
  if (M.credentialsExist(pilot.popid)) return true;
  log('preflight: no credentials for ' + pilot.name + ' (' + pilot.popid + ') — minting');
  try {
    execFileSync('node', [path.join(ROOT, 'scripts', 'undockedMintAccount.js'),
      '--popid', pilot.popid, '--name', pilot.name], { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    log('preflight: mint FAILED for ' + pilot.popid + ' — ' + (e && e.message || e));
    return false;
  }
  return M.credentialsExist(pilot.popid);
}

function ensureBrief(pilot) {
  const B = require('./undockedMissionBrief');
  const p = B.briefPathFor(pilot.popid);
  // A brief on disk is kept unless it predates the current template version
  // (no BRIEF_VERSION marker on its first line) — then it is regenerated so a
  // rules change reaches the next flight without a hand --force per pilot.
  if (fs.existsSync(p)) {
    const firstLine = String(fs.readFileSync(p, 'utf8')).split('\n')[0].trim();
    if (firstLine === B.BRIEF_VERSION) return p;
    log('preflight: brief ' + path.relative(ROOT, p) + ' is ' + (firstLine || 'unversioned') + ', regenerating as ' + B.BRIEF_VERSION);
  }
  const brief = B.briefForPilot({
    popid: pilot.popid, name: pilot.name,
    birthYear: pilot.birthYear, age: pilot.age,
    neighborhood: pilot.neighborhood, role: pilot.role,
    employerName: employerNameFor(pilot.employerBizId),
  });
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, brief);
  log('preflight: generated mission brief ' + path.relative(ROOT, p));
  return p;
}

const ARRIVAL_WAIT_S = 180;

function resolvePilot(roster, cycle) {
  const first = pickPilot(roster.cast, cycle);
  const candidates = [first].concat(roster.alternates || []);
  for (const c of candidates) {
    const session = sessionName(c.popid);
    if (!ensureCredentials(c)) {
      log('preflight: ' + c.name + ' (' + session + ') cannot fly tonight — falling to next candidate');
      continue;
    }
    let missionFile;
    try {
      missionFile = ensureBrief(c);
    } catch (e) {
      log('preflight: brief generation failed for ' + session + ' — ' + (e && e.message || e) + ' — falling to next candidate');
      continue;
    }
    return { pilot: c, session, missionFile };
  }
  throw new Error('no flyable pilot: every cast/alternate candidate failed preflight');
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

// research.31: one night's window, in minutes — the brief tells the pilot the
// same number (builder approved 20, 2026-10-30). --minutes overrides.
function windowMinutes(argv) {
  return argv.includes('--minutes') ? argv[argv.indexOf('--minutes') + 1]
    : String(require('./undockedMissionBrief').WINDOW_MINUTES);
}

// ---- pipeline.95: the night onto the pilot's page ---------------------------
// Builder 2026-10-30: "the details of the flights should load to their supermemory containers"; the first run fills in
// every past night ("Fill them in"). One doc per night, keyed by its flown Cycle, weekday and episode, typed `show`: a
// record of the night, kept out of the own-words readers.
// Receipts are two-phase (codex F3 + re-review R1): `pending` (with the doc key) is saved before the send, `landed` after.
// The store appends a repeat under a taken key into the same doc, so a pending night is never simply resent: each run
// first asks the store whether its key is there — present = landed, absent = sent again, unreadable = left pending
// and said. A send that returns an error stays pending too (the POST may have landed before the response was lost).
// So a night is never doubled, and a lost send is found the next run. The file is replaced whole (temp + rename).

// Pure: applied nights with no receipt, in flight order.
function nightsToPage(nights, paged) {
  return (nights || []).filter(n => !(paged && paged[n.episodeId]));
}

function writeReceipts(file, paged) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(paged, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

async function pageNights(io) {
  const R = io.record || require('./undockedShowRecord');
  const page = io.page || require('../lib/citizenPage');
  const file = io.file || PAGED;
  const save = io.save || writeReceipts;
  let paged = {};
  try { paged = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; } // unreadable: the stage stops loudly
  // 1. settle the pending nights against the store
  let held = 0;
  for (const ep of Object.keys(paged).filter(k => paged[k] && paged[k].status === 'pending')) {
    const p = paged[ep];
    const has = p.id && p.pop ? await page.pageHasDoc_(p.pop, p.id) : null;
    if (has === true) { paged[ep] = { status: 'landed', id: p.id }; log('pages: ' + ep + ' found on the page — landed'); }
    else if (has === false) { delete paged[ep]; log('pages: ' + ep + ' not on the page — sent again this run'); }
    else { held++; log('pages: ' + ep + ' pending, the page could not be read — not resent'); }
    save(file, paged);
  }
  // 2. send every night with no receipt
  const todo = nightsToPage(io.nights || R.loadNights(), paged);
  let wrote = 0, left = 0;
  for (const n of todo) {
    if (!n.day) { log('pages: ' + n.episodeId + ' has no weekday for its start — left for a look'); left++; continue; }
    const opts = { cycle: n.cycle, daypart: 'UNDOCKED', day: n.day, ref: page.pageRefOf(n.episodeId), extra: { type: 'show', episode: n.episodeId } };
    paged[n.episodeId] = { status: 'pending', pop: n.pop, id: page.pageCustomId_(page.pageTagFor(n.pop), opts) };
    save(file, paged); // throws: the stage stops before the send
    const r = await page.appendReflection_(n.pop, R.pageText(n), opts);
    if (r.error) { log('pages: ' + n.episodeId + ' (' + n.pop + ') — ' + r.error + '; pending, checked against the page next run'); left++; continue; }
    paged[n.episodeId] = { status: 'landed', id: r.customId };
    save(file, paged); // throws: the night stays pending and is checked next run
    wrote++;
  }
  log('pages: ' + wrote + ' night(s) written to pilots\' pages, ' + left + ' left for the next run, ' +
    Object.keys(paged).filter(k => paged[k].status === 'landed').length + ' on record');
  return { wrote, left, pending: held };
}

async function main() {
  const argv = process.argv.slice(2);
  const minutes = windowMinutes(argv);
  const dryRun = argv.includes('--dry-run');

  const cycle = await currentCycle();
  const target = cycle + 1;
  const roster = await loadCast(cycle);
  log('cycle ' + cycle + ' (airs c' + target + '), cast: ' + roster.source);

  if (dryRun) {
    const first = pickPilot(roster.cast, cycle);
    const M = require('./undockedMintAccount');
    const B = require('./undockedMissionBrief');
    [first].concat(roster.alternates || []).forEach((c, i) => {
      log('dry-run: candidate ' + i + ' — ' + c.name + ' (' + c.popid + ')' +
        ' creds=' + (M.credentialsExist(c.popid) ? 'yes' : 'MINT') +
        ' brief=' + (fs.existsSync(B.briefPathFor(c.popid)) ? 'yes' : 'GENERATE'));
    });
    log('dry-run — stopping before flight');
    return;
  }

  if (require('./undockedEpisode').lockHeld(LOCK, '[undocked-run]')) {
    throw new Error('orchestrator lock held (' + LOCK + ') — refusing to overlap');
  }
  fs.writeFileSync(LOCK, String(process.pid));
  process.on('exit', () => { try { fs.unlinkSync(LOCK); } catch (_) {} });

  // 2b. points settle (research.31) — an arrival unlock lands ~2 min after the
  // jump that earned it, often after last night's adapter ran. Re-read the
  // accounts of the past week's pilots and write any changed night's
  // PointsDelta (tab + disk); step 7 recomputes the board. Never blocks tonight.
  try {
    execFileSync('node', [path.join(ROOT, 'scripts', 'undockedEpisodeAdapter.js'),
      '--rescore-points', '--recent', '7', '--apply'], { cwd: ROOT, stdio: 'inherit', timeout: 300000 });
  } catch (e) {
    log('points settle failed (tonight flies anyway): ' + (e && e.message || e));
  }

  const { pilot, session, missionFile } = resolvePilot(roster, cycle);
  log('pilot ' + pilot.name + ' (' + pilot.popid + ')' +
    (pilot.slot ? ', slot ' + pilot.slot : ''));

  // 2c. the pilot's progress meters, read just before launch (builder 2026-10-30:
  // what a pilot does should score). The adapter reads them again after the
  // flight; the night scores what it moved. A failed read never blocks the
  // flight — the night then scores on unlocks only.
  try {
    execFileSync('node', [path.join(ROOT, 'scripts', 'undockedEpisodeAdapter.js'),
      '--snapshot-progress', session], { cwd: ROOT, stdio: 'inherit', timeout: 120000 });
  } catch (e) { log('progress read before the flight failed (scores on unlocks tonight): ' + (e && e.message || e)); }

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

  // 4. adapter — deterministic fact extraction, writes staged/. A jump lands ~2-3
  // min after it is logged (latest arrival unlock seen: 2.9 min after the window),
  // so the after-read waits ARRIVAL_WAIT_S first.
  log('waiting ' + ARRIVAL_WAIT_S + ' s for arrival unlocks before reading the meters');
  execFileSync('sleep', [String(ARRIVAL_WAIT_S)]);
  execFileSync('node', [path.join(ROOT, 'scripts', 'undockedEpisodeAdapter.js'),
    '--episode', sidecar].concat(pilot.name ? ['--holder', pilot.name] : []), { cwd: ROOT, stdio: 'inherit', timeout: 300000 });

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

  // 8. pages (pipeline.95) — after the show is out; a failure here never unwinds it.
  if (require('./undockedShowRecord').ON) {
    try { await pageNights({}); } catch (e) { log('pages: STAGE FAILED (the show is out; the next run retries): ' + (e && e.message || e)); }
  }

  log('done');
}

module.exports = { drawRowsToRoster, tabPilot, sessionName, employerNameFor, windowMinutes, nightsToPage, pageNights };

if (require.main === module) {
  main().catch(e => {
    console.error('[undocked-run] FATAL: ' + (e && e.message || e));
    process.exit(1);
  });
}
