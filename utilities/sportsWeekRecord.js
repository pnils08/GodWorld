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

// Null means no weekly report: callers may use their historical reader.
// An explicit no-games week returns carry and forbids stale-result fallback.
function sportsWeeklyResult_(entries, matchesTeam) {
  var weekly = null, selected = null;
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (!matchesTeam(entry.teamsUsed) || !String(entry.weekRecord || '').trim()) continue;
    var candidate = sportsWeekForEntry_(entry);
    if (weekly) throw new Error('duplicate WeekRecord: casino franchise');
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseSportsWeekRecord_: parseSportsWeekRecord_,
    sportsWeekForEntry_: sportsWeekForEntry_,
    sportsWeeklyResult_: sportsWeeklyResult_
  };
}
