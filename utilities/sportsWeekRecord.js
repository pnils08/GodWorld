/**
 * engine.202 — pure, shared WeekRecord grammar for Apps Script and Node.
 * Ordered H:W / H:L / A:W / A:L tokens, separated by whitespace.
 * Blank is unreported; "none" explicitly reports no games this Cycle.
 * Does not infer venues, outcomes, a season record, or a carried streak.
 */
function parseSportsWeekRecord_(raw) {
  var text = raw == null ? '' : String(raw).trim();
  if (!text) return null;
  var games = [];
  var wins = 0, losses = 0, home = 0, away = 0;
  if (text.toLowerCase() !== 'none') {
    var tokens = text.toUpperCase().split(/\s+/);
    for (var i = 0; i < tokens.length; i++) {
      var match = /^([HA]):([WL])$/.exec(tokens[i]);
      if (!match) throw new Error('WeekRecord: use ordered H:W H:L A:W A:L tokens, or none');
      games.push({ venue: match[1], result: match[2] });
      if (match[1] === 'H') home++; else away++;
      if (match[2] === 'W') wins++; else losses++;
    }
  }
  return {
    value: games.length ? games.map(function(g) { return g.venue + ':' + g.result; }).join(' ') : 'none',
    games: games,
    wins: wins,
    losses: losses,
    record: wins + '-' + losses,
    gamesPlayed: games.length,
    homeGames: home,
    awayGames: away,
    firstResult: games.length ? games[0].result : null
  };
}

function sportsWeekForEntry_(entry) {
  var week = parseSportsWeekRecord_(entry.weekRecord);
  if (!week) return null;
  var expectedType = week.gamesPlayed ? 'game-result' : 'season-state';
  if (String(entry.eventType || '').toLowerCase() !== expectedType) {
    throw new Error('WeekRecord: ' + (week.gamesPlayed ? 'games require game-result' : 'none requires season-state'));
  }
  return week;
}

// Two weekly reports for one franchise in one Cycle: game rows fold in played
// (row) order; anything involving an explicit no-games week is a duplicate.
function foldSportsWeeks_(first, next, label) {
  if (!first.gamesPlayed || !next.gamesPlayed) throw new Error('duplicate WeekRecord: ' + label);
  return parseSportsWeekRecord_(first.value + ' ' + next.value);
}

// Null means no weekly report: callers may use their historical reader.
// An explicit no-games week returns carry and forbids stale-result fallback.
function sportsWeeklyResult_(entries, matchesTeam) {
  var weekly = null, selected = null;
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (!matchesTeam(entry.teamsUsed) || !String(entry.weekRecord || '').trim()) continue;
    var candidate = sportsWeekForEntry_(entry);
    if (weekly) {
      // One token per game row is how the builder types a series (2026-09-26):
      // game rows fold in row order into one week; the first row stays the
      // week's anchor. A no-games week never folds with games.
      weekly = foldSportsWeeks_(weekly, candidate, 'casino franchise');
      continue;
    }
    weekly = candidate;
    selected = entry;
  }
  if (!weekly) return null;
  if (!weekly.gamesPlayed) return { kind: 'carry' };
  return {
    kind: 'settle',
    franchiseWon: weekly.firstResult === 'W',
    eventId: [selected.cycle, selected.teamsUsed, 'week', 1, weekly.firstResult].join('|'),
    entry: selected
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// engine.208 C3 — the week object, ONE baseline shared with engine.204/205
// (docs/research/2026-10-02-engine-208-fandom-dial-read-before.md §2.9 + Revision 1;
// docs/research/2026-10-03-engine-204-205-game-day-economy-read-before.md §2.1/§2.7).
// Stateless: the feed tab is the record. history = { franchise: { cycle: {w, l} } }
// from accepted WeekRecord game cells of EARLIER Cycles (the current Cycle is never
// part of its own expectation). 204/205 adds vol/stakes/reach/weight/signed/venue/median.
// Priors ruled 2026-10-03 (204/205 §4(i)): A's .750, Oaks .400 until 4 game weeks exist.
var SPORTS_EXPECT_PRIOR_ = { "A's": 0.75, 'Oaks': 0.4 };
var SPORTS_EXPECT_WINDOW_ = 8;      // trailing game weeks (Cycles with g > 0), survives the off-season
var SPORTS_EXPECT_MIN_WEEKS_ = 4;   // below this the prior stands
var SPORTS_SURPRISE_BAND_ = 0.2;    // 204/205 §2.7: |surprise| past this is a signed week
// raw season words whose held week is a playoff run (the seven round words alias to
// 'playoffs' for S.sportsSeason; the raw word survives here as the lens)
var SPORTS_RUN_LENS_ = {
  'playoffs': 1, 'post-season': 1, 'postseason': 1,
  'wild-card': 1, 'division-series': 1, 'league-championship': 1,
  'play-in': 1, 'first-round': 1, 'conference-semis': 1, 'conference-finals': 1,
  'world-series': 1, 'worldseries': 1, 'world series': 1, 'finals': 1
};

// one franchise's week: this Cycle's folded weekly result + the raw lens of its last row
function buildSportsWeek_(franchise, weekly, lens, historyByCycle, currentCycle) {
  var w = weekly ? weekly.wins : 0, l = weekly ? weekly.losses : 0;
  var wk = {
    g: w + l, w: w, l: l,
    h: weekly ? weekly.homeGames : 0, a: weekly ? weekly.awayGames : 0,
    lens: String(lens || '').trim().toLowerCase(),
    expectation: null, n: 0, surprise: 0, cls: 'none'
  };
  var cycles = [];
  for (var c in (historyByCycle || {})) {
    if (!historyByCycle.hasOwnProperty(c)) continue;
    var cy = Number(c), hv = historyByCycle[c];
    if (cy < currentCycle && hv && (hv.w + hv.l) > 0) cycles.push(cy);
  }
  cycles.sort(function(x, y) { return y - x; });
  cycles = cycles.slice(0, SPORTS_EXPECT_WINDOW_);
  wk.n = cycles.length;
  if (wk.n >= SPORTS_EXPECT_MIN_WEEKS_) {
    var sum = 0;
    for (var i = 0; i < cycles.length; i++) {
      var h = historyByCycle[cycles[i]];
      sum += h.w / (h.w + h.l);
    }
    wk.expectation = sum / wk.n;
  } else if (SPORTS_EXPECT_PRIOR_[franchise] != null) {
    wk.expectation = SPORTS_EXPECT_PRIOR_[franchise];
  }
  if (wk.g > 0 && wk.expectation != null) {
    var sp = (w / wk.g - wk.expectation) / 0.5;
    wk.surprise = sp > 1 ? 1 : (sp < -1 ? -1 : sp);
  }
  wk.cls = sportsWeekClass_(franchise, wk);
  return wk;
}

// the fan-side class (208 §2.9 C3, Revision 1 precedence). Ruling v: an Oaks losing week is
// -1 until the Oaks have four game weeks of their own; the A's prior makes a LOSS live at once.
function sportsWeekClass_(franchise, wk) {
  if (!wk.g) return 'none';
  if (wk.lens === 'championship' && wk.w >= 1) return 'TITLE';
  if (SPORTS_RUN_LENS_[wk.lens] && wk.w >= wk.l) return 'RUN';
  if (wk.w > wk.l && wk.surprise >= 0) return 'WIN';
  if (wk.w < wk.l && wk.surprise < -SPORTS_SURPRISE_BAND_ &&
      (wk.n >= SPORTS_EXPECT_MIN_WEEKS_ || franchise === "A's")) return 'LOSS';
  if (wk.w < wk.l) return 'LOSING_WEEK';
  return 'EVEN';
}

// the class -> the received fan line's tag (citizenDialMap); none/EVEN -> no signed line
var SPORTS_WEEK_TAG_ = {
  TITLE: 'Sports-Title', RUN: 'Sports-Run', WIN: 'Sports-Win',
  LOSS: 'Sports-Loss', LOSING_WEEK: 'Sports-LosingWeek'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseSportsWeekRecord_: parseSportsWeekRecord_,
    sportsWeekForEntry_: sportsWeekForEntry_,
    sportsWeeklyResult_: sportsWeeklyResult_,
    foldSportsWeeks_: foldSportsWeeks_,
    buildSportsWeek_: buildSportsWeek_,
    sportsWeekClass_: sportsWeekClass_,
    SPORTS_WEEK_TAG_: SPORTS_WEEK_TAG_,
    SPORTS_EXPECT_PRIOR_: SPORTS_EXPECT_PRIOR_
  };
}
