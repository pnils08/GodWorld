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
 * the normal quiet case). Ripple row records the touched POPIDs, so the sports
 * seed carries the players themselves.
 *
 * engine.208 (builder 2026-10-02 ruling i + 2026-10-03 amendment): the feed is
 * the athletes' life and the fans' week. Three received lines, all signed tags
 * the Phase-9 fold reads (citizenDialMap):
 *   1. NAMED — every feed row whose NamesUsed resolves BY NAME writes one line on
 *      that citizen, routed by EventType (game → Sports-Played / -PlayedWin,
 *      injury → Sports-Injured, roster-move/trade/re-signing/draft → Sports-Moved,
 *      feature/awards → Reputation; any other kind a plain [Sports] line).
 *   2. STAFF — every GAME-clock player and staff member of a franchise that played
 *      gets the team's week line (S.sportsWeek[f].cls → Sports-Win/Loss/…), named
 *      or not ("all should be getting life events from the week's success").
 *   3. FANS — every citizen whose base.fandom is 60+ and who follows that team
 *      (DialState fan; none recorded = the A's) gets the same week line (ruling v:
 *      a fan feels every losing week). Membership reads BASE, not this week's mood.
 * An EVEN or no-game week writes no week line.
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
  ],
  // engine.331 (builder 2026-11-06: "No reasons to not cold streak set as well")
  coldStreak: [
    "got the \"hang in there\" texts from everyone and answered none of them",
    "stayed late at the facility looking for whatever has gone missing",
    "heard the skid come up at the gas station and kept walking",
    "stopped checking the standings and started counting the days to the off-day"
  ]
};

// engine.331 (builder 2026-11-06: "handle the dropdowm moods add to the night line"): the row's
// PlayerMood closes each named player's game-night line — one pool per dropdown word
// (PLAYER_MOOD_VALUES, utilities/setupSportsFeedValidation.js; scripts/gameNightMoments.test.js pins
// the keys). A blank or off-list mood adds nothing. Color, never fact.
var GAME_NIGHT_MOOD_CLAUSES_ = {
  'confident': ["sure the next one belongs to them too", "already talking about the next game like it was settled", "sleeping easy, certain the work was done"],
  'frustrated': ["still chewing on the one play that went wrong", "short with everyone and sorry about it by morning", "unable to let the night go"],
  'hungry': ["already asking for more", "alarm set early to get back to work", "texting the coaches a question at midnight"],
  'reflective': ["turning the whole season over for a long while", "looking through old photos from the first year with the club", "up late thinking about how far it has come"],
  'dominant': ["feeling like nobody in the league could touch them", "walking in the door like the block was theirs", "not bothering to check anyone else's score"],
  'uncertain': ["wondering how much longer the role will hold", "reading every comment online and wishing they hadn't", "asking the family what they thought and not liking the answer"],
  'locked-in': ["already running the next game in their head", "keeping the routine down to the minute", "barely saying a word, all focus"],
  'quiet': ["keeping all of it to themselves", "saying maybe ten words all night", "letting the house stay quiet around them"],
  'electric': ["unable to stop pacing the kitchen", "calling three friends before midnight just to talk about it", "still buzzing hours after the game"]
};
// a game row with no Streak: the clubhouse mood sets the night for the bucket's readers
var GAME_NIGHT_MOOD_TONE_ = {
  'confident': 'win', 'dominant': 'win', 'locked-in': 'win', 'electric': 'win',
  'frustrated': 'loss', 'uncertain': 'loss',
  'hungry': 'neutral', 'reflective': 'neutral', 'quiet': 'neutral'
};

function gameNightMoodKey_(mood) {
  return String(mood || '').trim().toLowerCase().replace(/\s+/g, '-');
}
// own keys only — a typed "constructor" is an off-list mood, not Object.prototype's
function gameNightMoodLookup_(table, mood) {
  var key = gameNightMoodKey_(mood);
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : null;
}

// engine.331: the row's result first, then the week. hotCold = S.sportsWeek[team].hotCold, the
// streak headline's decision (markSportsStreakHeadline_, World_Config sportsStreakHeadline) — the
// caller resolves the row's team, so this stays pure (householdEngine.t4.test.js loads it alone).
// A W row in a hot week is a streak night, an L row in a cold week a skid night; a loss in a hot
// week stays a loss. Only a game row with no Streak takes its tone from the mood.
function gameNightBucket_(entry, hotCold) {
  var run = /^([WL])\d+/.exec(String(entry.streak || '').trim().toUpperCase());
  if (run && run[1] === 'W') return hotCold === 'hot' ? 'winStreak' : 'win';
  if (run) return hotCold === 'cold' ? 'coldStreak' : 'loss';
  return gameNightMoodLookup_(GAME_NIGHT_MOOD_TONE_, entry.playerMood) || 'neutral';
}

// engine.208 M1: the feed writes positions — "Arturo Ramos (SP)", "Ernesto Quintero (3B/1B/DH)",
// "Kevin Clark (3B). Sidney Tumolo (2B)", an unclosed "(SP" — and the match below is exact, so
// before this only 17 of 165 C100+ mentions resolved. Strip closed then unclosed position
// groups (a closed group becomes a separator: "Benji Dillon (SP/RP) Pablo Almanzar (SP)" has no comma),
// split on , | ; / and on ". " before a capital, compare with gameNightNameKey_.
function parseNamesUsed_(entry) {
  var raw = String(entry.namesUsed || '').trim();
  if (!raw) return [];
  return raw.replace(/\([^(),|;.]*\)/g, ',').replace(/\([^,|;.]+/g, '')
    .split(/[,|;\/]+|\.\s+(?=[A-Z])/)
    .map(function (s) { return s.trim(); }).filter(Boolean);
}

// one key for a feed name and a ledger "First Last": trailing period off ("Carter Jr." = "Carter Jr"),
// lowercased. Exact after that — a typo stays unresolved, never fuzzy-matched to a POPID.
function gameNightNameKey_(s) {
  return String(s || '').trim().replace(/\.$/, '').trim().toLowerCase();
}

// engine.208 — line pools for the received lines. Color, never fact: the fact is the
// feed row / the week's result; the sentence is texture around it.
var SPORTS_NAMED_POOLS = {
  injured: [
    "spent the evening with ice and a training-room printout of exercises",
    "told the family the scan looked fine and did not quite believe it",
    "sat out the next practice and watched from the rail"
  ],
  moved: [
    "spent the night on the phone working out where the family would land",
    "packed a bag with the news still settling",
    "called home first, before the club announced anything"
  ],
  featured: [
    "got recognized twice at the grocery store after the story ran",
    "had a neighbor tape the article to the building's front door",
    "fielded a round of texts from people who hadn't called in years"
  ],
  named: [
    "saw their name in the sports pages again",
    "heard their name come up on the radio on the drive in",
    "got asked about the club at a family dinner"
  ]
};
var SPORTS_WEEK_POOLS = {
  staff: {
    TITLE: ["rode the parade route home, still in the jersey", "held the trophy for a photo with the clubhouse staff", "slept four hours and woke up a champion"],
    RUN: ["kept the routine exactly the same — the run asks for that", "came home late from the park and couldn't wind down", "fielded the playoff-ticket calls from every cousin"],
    WIN: ["drove home from a good week with the window down", "stayed late in the clubhouse while the music was still on", "let the week's wins carry dinner"],
    LOSS: ["watched the tape twice and saw the same thing both times", "went quiet at home after a bad week at work", "stayed after practice to fix what the week exposed"],
    LOSING_WEEK: ["took a losing week home and set it down at the door", "worked through the week's losses in the cage", "told the kids it was a long season"]
  },
  fan: {
    TITLE: ["went downtown for the celebration and lost their voice", "hung the championship pennant by the front door", "called everyone who had ever doubted the team"],
    RUN: ["planned the week around the playoff games", "watched every pitch of the series from the same seat", "bought playoff gear for the whole house"],
    WIN: ["checked the scores twice a day all week, happy every time", "argued the team's case at work and won", "wore the cap all week"],
    LOSS: ["turned the game off early and stewed about it", "spent the week grumbling about the roster", "skipped the highlights after the third loss"],
    LOSING_WEEK: ["shrugged off another losing week and kept the cap on", "watched a loss with the patience of a real fan", "said next week would be different"]
  }
};
// franchise employer of record (the same pair processAdvancementIntake reads)
var SPORTS_FRANCHISE_EMPLOYER_ = { 'BIZ-00005': "A's", 'BIZ-00074': 'Oaks' };
var SPORTS_FAN_TEAM_ = { as: "A's", oaks: 'Oaks' };

function sportsNamedRoute_(eventType, cls) {
  var t = String(eventType || '').toLowerCase();
  if (t.indexOf('game') >= 0) {
    var winWeek = cls === 'WIN' || cls === 'RUN' || cls === 'TITLE';
    return { tag: winWeek ? 'Sports-PlayedWin' : 'Sports-Played', pool: null };
  }
  if (t === 'injury') return { tag: 'Sports-Injured', pool: 'injured' };
  if (t === 'roster-move' || t === 'trade-recap' || t === 're-signing' || t === 'draft') return { tag: 'Sports-Moved', pool: 'moved' };
  if (t === 'player-feature' || t === 'awards') return { tag: 'Reputation', pool: 'featured' };
  // engine.299: the 'named' pool (their name in the papers, on the radio, asked about at dinner) says the citizen was
  // talked about — sociability up. A bare 'Sports' maps to no dial.
  return { tag: 'Sports-Sociability-Up-S', pool: 'named' };
}

// the franchises a GAME-clock citizen works for: employer of record, plus a role that names
// a second club (the two-team GM)
function sportsStaffTeams_(employerBizId, roleType) {
  var teams = {};
  if (SPORTS_FRANCHISE_EMPLOYER_[employerBizId]) teams[SPORTS_FRANCHISE_EMPLOYER_[employerBizId]] = true;
  var role = String(roleType || '');
  if (teams["A's"] || teams.Oaks) {
    if (/\bA'?s\b/.test(role)) teams["A's"] = true;
    if (/\bOaks\b/.test(role)) teams.Oaks = true;
  }
  return teams;
}

/**
 * Phase 5 entry. The feed's named citizens, each franchise's staff and its fans get
 * this Cycle's received lines on their own ledger row + LifeHistory_Log.
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
  var iClock = idx('ClockMode'), iEmployer = idx('EmployerBizId'), iRole = idx('RoleType'), iDial = idx('DialState');
  var iLastU = (idx('LastUpdated') >= 0) ? idx('LastUpdated') : idx('Last Updated');
  if (iPop < 0 || iLife < 0) return;
  var logSheet = ctx.ss ? ctx.ss.getSheetByName('LifeHistory_Log') : null;
  // engine.208 Revision 1: the log is half the evidence — never write the ledger half alone
  if (!logSheet) throw new Error('applyGameNightMoments_: LifeHistory_Log tab missing');

  var weeks = S.sportsWeek || {};
  var rng = safeRand_(ctx);
  function pick(pool) { return pool[Math.floor(rng() * pool.length)]; }
  function living(r) { return !/^(deceased|dead)$/i.test(String(iStatus >= 0 ? rows[r][iStatus] || '' : '').trim()); }

  // name -> row index (every living citizen; a retired legend named in a feature still lives it)
  var byName = {};
  for (var r = 0; r < rows.length; r++) {
    if (!living(r)) continue;
    var full = gameNightNameKey_((rows[r][iFirst] || '') + ' ' + (rows[r][iLast] || ''));
    if (full) byName[full] = r;
  }

  var cycle = S.cycleId || (ctx.config && ctx.config.cycleCount) || 0;
  var stamp = (typeof inWorldStamp_ === 'function') ? inWorldStamp_(ctx) : ('C' + cycle);
  var logRows = [];
  var touched = {};
  var counts = { named: 0, staff: 0, fan: 0 };
  var reach = {};   // engine.209: per franchise { staff, fan } — the week's attendance input
  var unresolved = [];

  function write(ri, tag, text, logTag) {
    var row = rows[ri];
    var line = stamp + ' — [' + tag + '] ' + text;
    row[iLife] = row[iLife] ? row[iLife] + '\n' + line : line;
    if (iLastU >= 0) row[iLastU] = ctx.now;
    logRows.push([ctx.now, row[iPop], ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(), logTag, text,
      (iNbhd >= 0 ? (row[iNbhd] || '') : ''), cycle]);
    touched[String(row[iPop])] = true;
  }

  // 1. NAMED — one line per resolving feed row (row-level receipt)
  for (var e = 0; e < entries.length; e++) {
    var entry = entries[e];
    var team = normalizeOaklandFeedTeam_(entry.teamsUsed);
    var route = sportsNamedRoute_(entry.eventType, weeks[team] ? weeks[team].cls : 'none');
    var names = parseNamesUsed_(entry);
    var seenThisRow = {};
    for (var n = 0; n < names.length; n++) {
      var key = gameNightNameKey_(names[n]);
      var ri = byName[key];
      if (ri === undefined) { if (unresolved.indexOf(names[n]) < 0) unresolved.push(names[n]); continue; }
      if (seenThisRow[key]) continue;
      seenThisRow[key] = true;
      var text;
      if (route.pool) {
        text = pick(SPORTS_NAMED_POOLS[route.pool]);
      } else {
        text = pick(GAME_NIGHT_POOLS[gameNightBucket_(entry, weeks[team] ? weeks[team].hotCold : '')]);
        var moodPool = gameNightMoodLookup_(GAME_NIGHT_MOOD_CLAUSES_, entry.playerMood);
        if (moodPool) text += ' — ' + pick(moodPool);
      }
      write(ri, route.tag, text, route.tag + '|source:sports|feedNamed|event:' + (entry.eventType || '-') + '|team:' + (team || '-'));
      counts.named++;
    }
  }

  // 2. STAFF and 3. FANS — the team's week, for every franchise with a signed week
  var signed = {};
  for (var f in weeks) {
    if (weeks.hasOwnProperty(f) && SPORTS_WEEK_TAG_[weeks[f].cls]) signed[f] = weeks[f].cls;
  }
  var anySigned = false;
  for (var sf in signed) { if (signed.hasOwnProperty(sf)) { anySigned = true; break; } }
  if (anySigned) {
    for (var rr = 0; rr < rows.length; rr++) {
      if (!living(rr)) continue;
      var row2 = rows[rr];
      var isStaff = iClock >= 0 && String(row2[iClock] || '').toUpperCase() === 'GAME';
      var teams = {};
      if (isStaff) {
        teams = sportsStaffTeams_(iEmployer >= 0 ? String(row2[iEmployer] || '').trim() : '', iRole >= 0 ? row2[iRole] : '');
      } else if (iDial >= 0 && row2[iDial]) {
        var ds = parseDialState_(row2[iDial]);
        if (ds && ds.base && ds.base.fandom >= 60) {
          var fan = ds.fan || 'as';
          if (fan === 'both') { teams["A's"] = true; teams.Oaks = true; }
          else if (SPORTS_FAN_TEAM_[fan]) teams[SPORTS_FAN_TEAM_[fan]] = true;
        }
      }
      for (var tm in teams) {
        if (!teams.hasOwnProperty(tm) || !signed[tm]) continue;
        var cls = signed[tm];
        var who = isStaff ? 'staff' : 'fan';
        write(rr, SPORTS_WEEK_TAG_[cls], pick(SPORTS_WEEK_POOLS[who][cls]),
          SPORTS_WEEK_TAG_[cls] + '|source:sports|' + who + 'Week|team:' + tm + '|week:' + cls);
        counts[who]++;
        if (!reach[tm]) reach[tm] = { staff: 0, fan: 0 };
        reach[tm][who]++;
      }
    }
  }
  // engine.209: how far each franchise's week reached its own people — Phase 9 drifts the
  // franchise weight on the fan count relative to the franchise's own trailing mean.
  ctx.summary.sportsWeekReach = reach;

  // engine.208 M1: a feed name that matches no living citizen is named, not dropped silently —
  // a typo on the sheet ("Mark Aiken") or a sports-layer player with no POPID.
  if (unresolved.length && typeof Logger !== 'undefined') {
    Logger.log('applyGameNightMoments_: unresolved feed names, cycle ' + cycle + ': ' + unresolved.join(', '));
  }

  var touchedIds = Object.keys(touched);
  if (!touchedIds.length) return;

  ctx.ledger.dirty = true;
  var startRow = logSheet.getLastRow() + 1;
  logSheet.getRange(startRow, 1, logRows.length, logRows[0].length).setValues(logRows);

  // Attribution: the week touched THESE citizens — the sports seed names them.
  if (typeof recordRipple_ === 'function') {
    recordRipple_(ctx, {
      causeType: 'sports',
      causeId: 'Oakland_Sports_Feed.gameNight',
      causeDetail: 'The sports week reached ' + touchedIds.length + ' citizen(s) — ' + counts.named + ' named, ' +
        counts.staff + ' staff week lines, ' + counts.fan + ' fan week lines',
      effectType: 'game-night',
      targetScope: 'citizen',
      targetIds: touchedIds,
      neighborhood: '',
      magnitude: touchedIds.length,
      duration: 1,
      sourceEngine: 'applyGameNightMoments_'
    });
  }

  if (typeof Logger !== 'undefined') {
    Logger.log('applyGameNightMoments_: cycle ' + cycle + ' — ' + counts.named + ' named, ' + counts.staff +
      ' staff, ' + counts.fan + ' fan line(s); weeks ' + JSON.stringify(signed));
  }
}
