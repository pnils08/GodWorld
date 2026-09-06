/**
 * popIdAllocator.js — engine.90 POPID mint authority (clasp-deployed half).
 *
 * Contract (identical to the shipped BIZ-ID allocator, engine.96):
 *   next = max(World_Config.popIdHighWater || 0, active Simulation_Ledger max) + 1
 *   ...mint...
 *   persist the highest number used, monotonic, into the existing World_Config row
 *
 * The high-water mark is what makes the mint safe once rows leave
 * Simulation_Ledger for Citizen_Archive: an active-sheet scan alone would
 * re-issue an archived citizen's POPID. Never scan Citizen_Archive on the
 * mint path — the mark is monotonic over every POPID that was ever active.
 *
 * One counter per cycle: every cycle-path minter (births, promotions,
 * advancement intake, generic-citizen spouses, council challengers) calls
 * nextPopIdLocked_(ctx) so pushes from different phases never collide. The
 * scan of ctx.ledger.rows runs once and is cached on ctx.
 *
 * Persist is a NO-OP while the World_Config row is missing — a loud Logger
 * line, no self-seed (the row is created at rollout on the bench, then live
 * with the builder's go; the cycle never creates config rows). The Node half
 * (lib/sheets.js getPopIdHighWater / setPopIdHighWater / nextPopIdNumber)
 * carries the same contract; scripts/popIdAllocator.test.js holds the two
 * halves to identical output.
 */

var POP_ID_HIGH_WATER_KEY = 'popIdHighWater';

/** Pure: highest POP-nnnnn number in a rows array (no header row). */
function popIdActiveMax_(rows, iPop) {
  var maxN = 0;
  for (var r = 0; r < (rows || []).length; r++) {
    var m = /^POP-(\d+)$/.exec(String((rows[r] && rows[r][iPop]) || '').trim());
    if (m && +m[1] > maxN) maxN = +m[1];
  }
  return maxN;
}

/** Pure: format a POPID number. */
function popIdFormat_(n) {
  return 'POP-' + String(n).padStart(5, '0');
}

/**
 * Pure contract core, shared by test with the Node half:
 * next number given the persisted mark and the active max.
 */
function popIdNext_(highWater, activeMax) {
  var hw = Number(highWater);
  if (isNaN(hw) || hw < 0) hw = 0;
  var am = Number(activeMax);
  if (isNaN(am) || am < 0) am = 0;
  return Math.max(hw, am) + 1;
}

/**
 * Mint the next POPID for this cycle. Seeds ctx._popIdAlloc once from the
 * mark + the active scan, then counts pushes. Returns 'POP-nnnnn'.
 */
function nextPopIdLocked_(ctx) {
  if (!ctx._popIdAlloc) {
    var headers = (ctx.ledger && ctx.ledger.headers) || [];
    var iPop = headers.indexOf('POPID');
    var activeMax = iPop >= 0 ? popIdActiveMax_(ctx.ledger.rows, iPop) : 0;
    var hw = Number(ctx.config && ctx.config.popIdHighWater); // loadConfig_ parseFloat → number
    ctx._popIdAlloc = { last: popIdNext_(hw, activeMax) - 1, seededFrom: { highWater: isNaN(hw) ? null : hw, activeMax: activeMax } };
  }
  ctx._popIdAlloc.last++;
  return popIdFormat_(ctx._popIdAlloc.last);
}

/**
 * Persist the mark after the cycle's mints. Monotonic; a lower value never
 * overwrites. Missing row → Logger line, nothing written (the cycle never
 * creates config rows). Rides the Phase-10 World_Config flush via the cache
 * write queue. Returns true when a write was queued.
 */
function persistPopIdHighWater_(ctx) {
  if (!ctx._popIdAlloc) return false;
  var lastUsed = ctx._popIdAlloc.last;
  var cur = Number(ctx.config && ctx.config.popIdHighWater);
  if (!isNaN(cur) && lastUsed <= cur) return false;
  var cached = ctx.cache && ctx.cache.getData ? ctx.cache.getData('World_Config') : null;
  var rowNum = null;
  if (cached && cached.exists) {
    for (var r = 1; r < cached.values.length; r++) {
      if (String(cached.values[r][0] || '').trim() === POP_ID_HIGH_WATER_KEY) { rowNum = r + 1; break; }
    }
  }
  if (!rowNum) {
    Logger.log('popIdAllocator engine.90 WARNING: World_Config ' + POP_ID_HIGH_WATER_KEY + ' row missing — mark NOT persisted this cycle (allocation stayed safe via the active scan). Seed the row.');
    return false;
  }
  ctx.cache.queueWrite('World_Config', rowNum, 2, lastUsed);
  ctx.config.popIdHighWater = lastUsed;
  Logger.log('popIdAllocator engine.90: ' + POP_ID_HIGH_WATER_KEY + ' → ' + lastUsed);
  return true;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    POP_ID_HIGH_WATER_KEY: POP_ID_HIGH_WATER_KEY,
    popIdActiveMax_: popIdActiveMax_,
    popIdFormat_: popIdFormat_,
    popIdNext_: popIdNext_,
    nextPopIdLocked_: nextPopIdLocked_,
    persistPopIdHighWater_: persistPopIdHighWater_
  };
}
