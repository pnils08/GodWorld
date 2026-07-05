/**
 * applyGameNightMoments.js — the going-home moment (S296, Mike's origin spec:
 * "I run their career in game — what happens when they go home?").
 *
 * [engine/sheet] When Mike plays a game, the feed row he enters carries the
 * result (streak, mood, stats) and namesUsed — the players HIS session named.
 * This engine turns that into each named player's own moment: one LifeHistory
 * line about going home from tonight's game, written on the player's row.
 * The existing spine does the rest — the event moves dials at compression
 * (Sports tag), participation shifts, bonds read the same row.
 *
 * RARITY IS STRUCTURAL: fires only when S.sportsFeedEntries has entries for
 * THIS cycle (no game played → no moments; "No feed entries for cycle N" is
 * the normal quiet case). Named players get the full moment; unnamed roster
 * teammates get nothing here — a game only ripples to who it actually touched
 * (exact-citizens law). Ripple row records the named POPIDs, so the sports
 * seed finally carries the players themselves.
 *
 * Direct LifeHistory write — same allowed class as the Phase 4/5 event
 * generators (engine.md exceptions). Ledger row mutation via shared
 * ctx.ledger (Phase 42 §5.6), committed at Phase 10.
 */

var GAME_NIGHT_POOLS = {
  win: [
    "drove home with the radio off, letting the win settle",
    "stayed late signing for the kids by the player lot after the win",
    "got home still wired from the final out and couldn't sit down",
    "replayed one at-bat the whole drive home and finally smiled at a red light",
    "came home to find the neighbors had left a case of something cold on the porch"
  ],
  winStreak: [
    "tried to keep the streak out of the conversation at dinner and failed",
    "found the block's kids waiting at the corner to walk the last stretch home with them",
    "put the phone face-down on the counter — everyone in the world was texting about the run",
    "admitted to the mirror that this stretch feels different from the other years"
  ],
  loss: [
    "took the long way home and didn't turn the radio on",
    "sat in the driveway a while before going in",
    "told the family it was fine over dinner, and everyone let the lie stand",
    "stayed up rewatching two pitches that will not matter to anyone else"
  ],
  neutral: [
    "came home sore and grateful for a quiet house",
    "iced the usual aches and called it a night early",
    "ate standing up at the counter, still half at the ballpark"
  ]
};

function gameNightBucket_(entry) {
  var streak = String(entry.streak || '').toUpperCase();
  var mood = String(entry.playerMood || '').toLowerCase();
  var wins = /^W(\d+)/.exec(streak);
  if (wins && Number(wins[1]) >= 4) return 'winStreak';
  if (wins || /confident|energized|high/.test(mood)) return 'win';
  if (/^L\d+/.test(streak) || /frustrat|low|tense/.test(mood)) return 'loss';
  return 'neutral';
}

function parseNamesUsed_(entry) {
  var raw = String(entry.namesUsed || '').trim();
  if (!raw) return [];
  return raw.split(/[,|;\/]+/).map(function (s) { return s.trim(); }).filter(Boolean);
}

/**
 * Phase 5 entry. Named players from this cycle's feed rows get their
 * going-home moment on their own ledger row + LifeHistory_Log.
 */
function applyGameNightMoments_(ctx) {
  var S = ctx.summary || {};
  var entries = S.sportsFeedEntries || [];
  if (!entries.length) return; // no game this cycle — the quiet case, by design

  if (!ctx.ledger) throw new Error('applyGameNightMoments_: ctx.ledger not initialized');
  var header = ctx.ledger.headers;
  var rows = ctx.ledger.rows;
  function idx(n) { return header.indexOf(n); }
  var iPop = idx('POPID'), iFirst = idx('First'), iLast = idx('Last');
  var iLife = idx('LifeHistory'), iStatus = idx('Status'), iNbhd = idx('Neighborhood');
  var iLastU = (idx('LastUpdated') >= 0) ? idx('LastUpdated') : idx('Last Updated');
  if (iPop < 0 || iLife < 0) return;

  // name (lowercased "first last") → row index, active citizens only
  var byName = {};
  for (var r = 0; r < rows.length; r++) {
    if (iStatus >= 0 && String(rows[r][iStatus] || '').toLowerCase() !== 'active') continue;
    var full = ((rows[r][iFirst] || '') + ' ' + (rows[r][iLast] || '')).trim().toLowerCase();
    if (full) byName[full] = r;
  }

  var cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;
  var stamp = (typeof inWorldStamp_ === 'function') ? inWorldStamp_(ctx) : ('C' + cycle);
  var logSheet = ctx.ss ? ctx.ss.getSheetByName('LifeHistory_Log') : null;
  var logRows = [];
  var touched = [];
  var perPlayer = {};

  for (var e = 0; e < entries.length; e++) {
    var entry = entries[e];
    if (String(entry.eventType || '').toLowerCase().indexOf('game') < 0) continue;
    var bucket = gameNightBucket_(entry);
    var pool = GAME_NIGHT_POOLS[bucket];
    var names = parseNamesUsed_(entry);

    for (var n = 0; n < names.length; n++) {
      var key = names[n].toLowerCase();
      var ri = byName[key];
      if (ri === undefined || perPlayer[key]) continue; // unknown name or already had their night
      perPlayer[key] = true;

      var pick = pool[Math.floor(safeRand_(ctx) * pool.length)];
      var row = rows[ri];
      var tagString = 'Sports|source:sports|gameNight|streak:' + (entry.streak || '-');
      var line = stamp + ' — [Sports] ' + pick;
      row[iLife] = row[iLife] ? row[iLife] + '\n' + line : line;
      if (iLastU >= 0) row[iLastU] = ctx.now;
      rows[ri] = row;

      logRows.push([
        ctx.now,
        row[iPop],
        ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(),
        tagString,
        pick,
        (iNbhd >= 0 ? (row[iNbhd] || '') : ''),
        cycle
      ]);
      touched.push(String(row[iPop]));
    }
  }

  if (!touched.length) return;

  ctx.ledger.dirty = true;
  if (logSheet && logRows.length) {
    var startRow = logSheet.getLastRow() + 1;
    logSheet.getRange(startRow, 1, logRows.length, logRows[0].length).setValues(logRows);
  }

  // Attribution: the game touched THESE players — the sports seed names them.
  if (typeof recordRipple_ === 'function') {
    recordRipple_(ctx, {
      causeType: 'sports',
      causeId: 'Oakland_Sports_Feed.gameNight',
      causeDetail: 'Game night reached ' + touched.length + ' player(s) at home — ' +
        (entries[0].streak ? 'streak ' + entries[0].streak + ', ' : '') +
        (entries[0].playerMood ? 'clubhouse ' + entries[0].playerMood : 'regular night'),
      effectType: 'game-night',
      targetScope: 'citizen',
      targetIds: touched,
      neighborhood: '',
      magnitude: touched.length,
      duration: 1,
      sourceEngine: 'applyGameNightMoments_'
    });
  }

  if (typeof Logger !== 'undefined') {
    Logger.log('applyGameNightMoments_: ' + touched.length + ' player going-home moment(s), cycle ' + cycle);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    applyGameNightMoments_: applyGameNightMoments_,
    gameNightBucket_: gameNightBucket_,
    parseNamesUsed_: parseNamesUsed_,
    GAME_NIGHT_POOLS: GAME_NIGHT_POOLS
  };
}
