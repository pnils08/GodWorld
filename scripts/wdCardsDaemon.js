#!/usr/bin/env node
/**
 * wdCardsDaemon.js — engine.27 Phase A (S242)
 *
 * Auto-invalidation daemon for wd-* derived projection cards. Watches the
 * authoritative upstream sheets for row changes (operator backfills + Google
 * Sheets UI edits) and dispatches targeted rebuilds to the existing
 * scripts/build*Cards.js writers so MCP lookup_* consumers see fresh data
 * without a manual rebuild ritual.
 *
 * Phase A scope = row-hash polling only. Phase B (cycle-end marker tab drain)
 * is a separate session per the plan's substrate-risk staging.
 *
 * Plan: docs/plans/2026-05-26-engine-27-wd-card-auto-invalidation.md
 *
 * Projection map (corrected vs plan §A1/§A3 after per-script + schema verify, S242):
 *   Simulation_Ledger   → wd-citizens  | key POPID (col A)        | buildCitizenCards.js  --popid <list>
 *   Business_Ledger     → wd-business  | key BIZ_ID (col A)       | buildBusinessCards.js --biz   <list>
 *   Cultural_Ledger     → wd-cultural  | key CUL-ID (col B, NOT A)| buildCulturalCards.js --cul   <list>
 *   Faith_Organizations → wd-faith     | key Organization (no ID) | buildFaithCards.js    --name  <org> (per-org)
 *
 * EXCLUDED from Phase A (deliberate):
 *   - Chicago_Citizens   — no build*Cards.js consumes it (DISABLED/frozen per engine.md S229)
 *   - Neighborhood/Initiative — engine-cycle-written, not operator-edited; belong on Phase B's
 *     cycle-marker trigger (neighborhood builder also aggregates 3 sheets, no clean 1:1 map)
 *
 * Usage:
 *   node scripts/wdCardsDaemon.js                       # loop forever (live dispatch)
 *   node scripts/wdCardsDaemon.js --dry-run             # loop, log intended rebuilds, NO writes
 *   node scripts/wdCardsDaemon.js --once                # one tick + exit
 *   node scripts/wdCardsDaemon.js --once --dry-run      # one tick, no writes, exit
 *   node scripts/wdCardsDaemon.js --rebuild-all citizens|business|cultural|faith
 *
 * Env: WD_CARDS_POLL_SECONDS (default 300)
 */

require('/root/GodWorld/lib/env');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var execFile = require('child_process').execFile;
var sheets = require('../lib/sheets');

var STATE_FILE = path.resolve(__dirname, '../output/.wdcards-state.json');
var STATE_VERSION = 1;
var DISPATCH_TIMEOUT_MS = 120000;
// engine.27 S252 storm-fix: dispatch changed IDs in small chunks (each its own
// --apply invocation) so a Supermemory rate-limit (returned as HTTP 401) on a
// large batch can't fail the whole set. Combined with per-chunk hash commit in
// tick(), this drains the backlog instead of re-firing it every tick forever.
var CHUNK_SIZE = parseInt(process.env.WD_CARDS_CHUNK_SIZE, 10) || 25;
var CHUNK_SLEEP_MS = parseInt(process.env.WD_CARDS_CHUNK_SLEEP_MS, 10) || 4000;

function chunkArray(arr, size) {
  var out = [];
  for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

var DRY_RUN = process.argv.includes('--dry-run');
var ONCE = process.argv.includes('--once');
var rebuildAllArg = process.argv.indexOf('--rebuild-all');
var REBUILD_ALL = rebuildAllArg > 0 ? process.argv[rebuildAllArg + 1] : null;

var POLL_SECONDS = parseInt(process.env.WD_CARDS_POLL_SECONDS, 10) || 300;

// ── Projection config ──────────────────────────────────────────────────────
// idHeader: canonical ID column header (resolved to index at runtime — robust
//   to column reorder). volatileHeaders: columns excluded from the row hash
//   because they change without affecting card content (bookkeeping stamps).
//   Material columns (Income, FameScore, Status, …) stay IN the hash so a real
//   change DOES trigger a rebuild — that is correct, not a false positive.
var PROJECTIONS = [
  {
    key: 'citizens', sheet: 'Simulation_Ledger', projection: 'wd-citizens',
    idHeader: 'POPID', volatileHeaders: ['LastUpdated'],
    builder: 'buildCitizenCards.js', flag: '--popid', dispatch: 'idlist'
  },
  {
    key: 'business', sheet: 'Business_Ledger', projection: 'wd-business',
    idHeader: 'BIZ_ID', volatileHeaders: [],
    builder: 'buildBusinessCards.js', flag: '--biz', dispatch: 'idlist'
  },
  {
    key: 'cultural', sheet: 'Cultural_Ledger', projection: 'wd-cultural',
    idHeader: 'CUL-ID', volatileHeaders: ['Timestamp', 'LastSeenCycle'],
    builder: 'buildCulturalCards.js', flag: '--cul', dispatch: 'idlist'
  },
  {
    // Faith_Organizations has no ID column (verified S242 + documented in
    // buildFaithCards.js header). Canonical key is the Organization name; the
    // builder's existing --name filter is substring-match, so a name that is a
    // substring of another org would rebuild both — harmless (≤17 orgs), noted.
    key: 'faith', sheet: 'Faith_Organizations', projection: 'wd-faith',
    idHeader: 'Organization', volatileHeaders: [],
    builder: 'buildFaithCards.js', flag: '--name', dispatch: 'pername'
  }
];

var BUILDER_BY_KEY = {};
PROJECTIONS.forEach(function (p) { BUILDER_BY_KEY[p.key] = p; });

// ── State persistence ────────────────────────────────────────────────────────
function loadState() {
  try {
    var raw = fs.readFileSync(STATE_FILE, 'utf8');
    var st = JSON.parse(raw);
    if (st && st.version === STATE_VERSION && st.sheets) return st;
    log('state file version mismatch or malformed — reinitializing baseline');
  } catch (e) {
    // missing on first run — expected
  }
  return { version: STATE_VERSION, lastTick: null, sheets: {}, markerCursor: null };
}

function saveState(state) {
  state.lastTick = new Date().toISOString();
  var tmp = STATE_FILE + '.tmp';
  var fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, JSON.stringify(state, null, 2));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, STATE_FILE);
}

// ── Row hashing ──────────────────────────────────────────────────────────────
function headerIndex(headers, name) {
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === name) return i;
  }
  return -1;
}

// Build {id: hash} for a sheet's data rows, excluding the ID column and any
// volatile bookkeeping columns from the hashed material.
function hashRows(proj, data) {
  var headers = data[0] || [];
  var idIdx = headerIndex(headers, proj.idHeader);
  if (idIdx < 0) {
    throw new Error('id column "' + proj.idHeader + '" not found in ' + proj.sheet);
  }
  var excluded = {};
  excluded[idIdx] = true;
  proj.volatileHeaders.forEach(function (h) {
    var ix = headerIndex(headers, h);
    if (ix >= 0) excluded[ix] = true;
  });

  var hashes = {};
  for (var r = 1; r < data.length; r++) {
    var row = data[r] || [];
    var id = String(row[idIdx] == null ? '' : row[idIdx]).trim();
    if (!id) continue;
    var material = [];
    for (var c = 0; c < row.length; c++) {
      if (excluded[c]) continue;
      material.push(row[c] == null ? '' : String(row[c]));
    }
    hashes[id] = crypto.createHash('sha256').update(JSON.stringify(material)).digest('hex');
    // last-row-wins on duplicate IDs — same as the builders' last-write-wins
  }
  return hashes;
}

function diffIds(prevHashes, currHashes) {
  var changed = [];
  for (var id in currHashes) {
    if (!Object.prototype.hasOwnProperty.call(currHashes, id)) continue;
    if (prevHashes[id] !== currHashes[id]) changed.push(id);
  }
  return changed;
}

// ── Dispatch ───────────────────────────────────────────────────────────────
function builderPath(proj) {
  return path.resolve(__dirname, proj.builder);
}

// Run one build*Cards invocation. Returns Promise<{ok, stdout, stderr}>.
// Treats non-zero exit OR an "Errors: [1-9]" line in stdout as failure.
function runBuilder(proj, args) {
  return new Promise(function (resolve) {
    execFile('node', [builderPath(proj)].concat(args), {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      timeout: DISPATCH_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024
    }, function (err, stdout, stderr) {
      var out = stdout || '';
      var errOut = stderr || (err && err.message) || '';
      var errorsGate = /Errors:\s*[1-9]/.test(out);
      var ok = !err && !errorsGate;
      resolve({ ok: ok, stdout: out, stderr: errOut });
    });
  });
}

// Dispatch rebuilds for one projection's changed IDs.
// Returns Promise<{ ok: bool, succeeded: string[] }> — succeeded carries the IDs
// whose rebuild invocation exited clean, so tick() can commit ONLY those hashes
// and leave failed IDs to retry next tick (partial-progress drain).
async function dispatchProjection(proj, ids) {
  if (DRY_RUN) {
    if (proj.dispatch === 'pername') {
      ids.forEach(function (org) {
        log('  [dry-run] would dispatch ' + proj.builder + ' --apply --name "' + org + '"');
      });
    } else {
      log('  [dry-run] would dispatch ' + proj.builder + ' --apply ' + proj.flag + ' ' +
        ids.join(',') + ' (in chunks of ' + CHUNK_SIZE + ')');
    }
    return { ok: true, succeeded: [] };  // dry-run commits nothing
  }

  var succeeded = [];
  var allOk = true;

  if (proj.dispatch === 'pername') {
    // one invocation per org (name filter, no list flag)
    for (var i = 0; i < ids.length; i++) {
      var res = await runBuilder(proj, ['--apply', proj.flag, ids[i]]);
      if (res.ok) {
        succeeded.push(ids[i]);
      } else {
        allOk = false;
        await logFailure(proj, [ids[i]], res.stderr || res.stdout);
      }
    }
  } else {
    // chunked: each chunk is its own --apply invocation; successful chunks drain
    var chunks = chunkArray(ids, CHUNK_SIZE);
    for (var c = 0; c < chunks.length; c++) {
      var chunk = chunks[c];
      var r = await runBuilder(proj, ['--apply', proj.flag, chunk.join(',')]);
      if (r.ok) {
        succeeded = succeeded.concat(chunk);
      } else {
        allOk = false;
        await logFailure(proj, chunk, r.stderr || r.stdout);
      }
      if (c < chunks.length - 1) await sleep(CHUNK_SLEEP_MS);
    }
  }
  return { ok: allOk, succeeded: succeeded };
}

// Append a failure row to Engine_Errors (schema: Timestamp|Cycle|Phase|Error|
// Stack|Class|Source|Severity, 10 cols — extra cols left blank).
async function logFailure(proj, ids, detail) {
  var excerpt = String(detail || '').slice(0, 500);
  var row = [
    new Date().toISOString(),
    '',
    'wd-cards-daemon',
    proj.projection + ' rebuild failed for: ' + ids.join(','),
    excerpt,
    'CardRebuildFailure',
    'daemon-rowhash',
    'WARN'
  ];
  try {
    await sheets.appendRows('Engine_Errors', [row]);
  } catch (e) {
    log('  [ERROR] could not append failure to Engine_Errors: ' + e.message);
  }
  log('  [FAIL] ' + proj.projection + ' rebuild failed for ' + ids.length + ' id(s) — logged, will retry next tick');
}

// ── Tick ─────────────────────────────────────────────────────────────────────
var tickCount = 0;

async function tick(state) {
  tickCount++;
  var rebuilds = 0;
  var wouldRebuild = 0;
  var failures = 0;
  var baselined = 0;

  for (var p = 0; p < PROJECTIONS.length; p++) {
    var proj = PROJECTIONS[p];
    var data;
    try {
      data = await sheets.getSheetData(proj.sheet);
    } catch (e) {
      log('  [ERROR] read ' + proj.sheet + ' failed: ' + e.message + ' — skipping this tick');
      continue;
    }
    if (!data || data.length < 2) continue;

    var currHashes;
    try {
      currHashes = hashRows(proj, data);
    } catch (e) {
      log('  [ERROR] hash ' + proj.sheet + ' failed: ' + e.message + ' — skipping');
      continue;
    }

    var prior = state.sheets[proj.sheet];
    if (!prior || !prior.rowHashes) {
      // cold-start baseline: record, dispatch nothing
      state.sheets[proj.sheet] = { rowHashes: currHashes, lastBuildAt: null };
      baselined++;
      continue;
    }

    var changed = diffIds(prior.rowHashes, currHashes);
    if (changed.length === 0) continue;

    log('  ' + proj.projection + ': ' + changed.length + ' changed — ' + changed.slice(0, 10).join(',') + (changed.length > 10 ? ',…' : ''));
    var res = await dispatchProjection(proj, changed);
    if (DRY_RUN) {
      // pending — leave prior hashes so the change keeps reporting until a live
      // rebuild actually runs. Prevents dry-run from "consuming" a real change.
      wouldRebuild += changed.length;
    } else {
      // partial-progress commit (engine.27 S252 storm-fix): merge ONLY the
      // successfully-rebuilt IDs into the committed hash map. Failed IDs keep
      // their old hash and are retried next tick. This drains the backlog
      // instead of the pre-fix all-or-nothing behaviour, where one rate-limited
      // ID left the whole changed set uncommitted and re-fired it every tick
      // forever (433 CardRebuildFailure rows over a week, May 28–Jun 4).
      var committed = Object.assign({}, prior.rowHashes);
      res.succeeded.forEach(function (id) {
        if (currHashes[id] !== undefined) committed[id] = currHashes[id];
      });
      state.sheets[proj.sheet] = { rowHashes: committed, lastBuildAt: new Date().toISOString() };
      rebuilds += res.succeeded.length;
      if (!res.ok) failures++;
    }
  }

  saveState(state);

  var summary = '[' + new Date().toISOString() + '] tick #' + tickCount +
    ' | sheets:' + PROJECTIONS.length +
    (baselined ? ' | baselined:' + baselined : '') +
    (DRY_RUN ? ' | would-rebuild:' + wouldRebuild : ' | rebuilds:' + rebuilds) +
    ' | failures:' + failures +
    (ONCE ? '' : ' | next:' + POLL_SECONDS + 's') +
    (DRY_RUN ? ' | DRY-RUN' : '');
  log(summary);
}

// ── Rebuild-all (cold-cache reseed / state recovery) ──────────────────────────
async function rebuildAll(key) {
  var proj = BUILDER_BY_KEY[key];
  if (!proj) {
    console.error('[wdCardsDaemon] --rebuild-all expects one of: ' + Object.keys(BUILDER_BY_KEY).join(', '));
    process.exit(1);
  }
  log('rebuild-all ' + proj.projection + ' (full rebuild, no targeting)' + (DRY_RUN ? ' [dry-run]' : ''));
  if (DRY_RUN) {
    log('  [dry-run] would dispatch ' + proj.builder + ' --apply (full)');
  } else {
    var res = await runBuilder(proj, ['--apply']);
    if (!res.ok) {
      await logFailure(proj, ['(full)'], res.stderr || res.stdout);
      process.exit(1);
    }
    log('  rebuilt + resetting baseline');
  }
  // reset baseline for that sheet so the daemon starts clean
  var state = loadState();
  try {
    var data = await sheets.getSheetData(proj.sheet);
    state.sheets[proj.sheet] = { rowHashes: hashRows(proj, data), lastBuildAt: new Date().toISOString() };
    saveState(state);
  } catch (e) {
    log('  [WARN] baseline reset failed: ' + e.message);
  }
}

// ── Loop + signals ────────────────────────────────────────────────────────────
function log(msg) { console.log('[wdCardsDaemon] ' + msg); }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

var running = true;
function shutdown(sig) {
  log('received ' + sig + ' — finishing current tick, then exit');
  running = false;
}
process.on('SIGTERM', function () { shutdown('SIGTERM'); });
process.on('SIGINT', function () { shutdown('SIGINT'); });

async function main() {
  log('start | poll=' + POLL_SECONDS + 's | mode=' +
    (REBUILD_ALL ? 'rebuild-all:' + REBUILD_ALL : ONCE ? 'once' : 'loop') +
    (DRY_RUN ? ' | DRY-RUN (no writes)' : ''));
  log('state file: ' + STATE_FILE);

  if (REBUILD_ALL) {
    await rebuildAll(REBUILD_ALL);
    return;
  }

  var state = loadState();
  if (!state.lastTick) log('cold start — first tick baselines all sheets, dispatches nothing');

  if (ONCE) {
    await tick(state);
    return;
  }

  while (running) {
    try {
      var s = loadState();
      await tick(s);
    } catch (e) {
      log('  [ERROR] tick threw: ' + e.message + ' — continuing');
    }
    // sleep in short slices so SIGTERM is responsive
    var waited = 0;
    while (running && waited < POLL_SECONDS * 1000) {
      await sleep(Math.min(1000, POLL_SECONDS * 1000 - waited));
      waited += 1000;
    }
  }
  log('stopped cleanly');
  process.exit(0);
}

main().catch(function (e) {
  console.error('[wdCardsDaemon] fatal: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
