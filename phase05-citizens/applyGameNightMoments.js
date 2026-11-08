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

// Both clubs draw these (engine.331, codex diff review F2): sport-neutral words — play, finish, the game.
var GAME_NIGHT_POOLS = {
  win: [
    "drove home with the radio off, letting the win settle",
    "stayed late signing for the kids by the player lot after the win",
    "got home still wired from the final play and couldn't sit down",
    "replayed one play the whole drive home and finally smiled at a red light",
    "came home to find the neighbors had left a case of something cold on the porch"
  ],
  winStreak: [
    "tried to keep the streak out of the conversation at dinner and failed",
    "found the block's kids waiting at the corner to walk the last stretch home with them",
    "put the phone face-down on the counter; everyone in the world was texting about the run",
    "admitted to the mirror that this stretch feels different from the other years"
  ],
  loss: [
    "took the long way home and didn't turn the radio on",
    "sat in the driveway a while before going in",
    "told the family it was fine over dinner, and everyone let the lie stand",
    "stayed up rewatching two plays that will not matter to anyone else"
  ],
  neutral: [
    "came home sore and grateful for a quiet house",
    "iced the usual aches and called it a night early",
    "ate standing up at the counter, still half at the game"
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
// PlayerMood closes each named player's game-night line (no rng draw of its own) — one pool per dropdown word
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
// engine.333 (builder 2026-11-05/07): the row's EventTrigger — the canonical word engine.331 leaves on the cell
// (utilities/setupSportsFeedValidation.js EVENT_TRIGGER_VALUES; hot-streak / cold-streak never reach it) — is the
// named player's second received line beside the EventType line. Every ruled word has a route (builder, 331 Q3:
// "a word no citizen reacts to is not worth keeping"; scripts/gameNightMoments.test.js pins dropdown == routes).
// Five texture routes draw a pool under a graded tag the Phase-9 fold reads; three MILESTONE words change the row
// itself (sportsMilestone_ below): `injury` fills the hospital bed, `injury-return` empties it, `retirement`
// leaves the sports layer. A word off the table writes nothing and is named once in the engine log.
var SPORTS_TRIGGER_POOLS_ = {
  celebration: [
    "kept the phone buzzing on the counter all night and let it",
    "got home to a hand-lettered sign on the door from the kids on the block",
    "told the story of the moment three times at dinner and it got better each time",
    "sat on the back step a long while, letting the night be as big as it was"
  ],
  setback: [
    "came home and went straight to the garage to hit off the tee in the dark",
    "let the family carry dinner and said almost nothing",
    "read one headline, put the phone in a drawer, and left it there",
    "walked the block twice before going in"
  ],
  move: [
    "sat at the kitchen table with the family working out what the news means for the house",
    "started a list of what would have to change and stopped halfway down",
    "called the one friend who would tell it straight",
    "took the long way home with the news still sinking in"
  ],
  season: [
    "felt the calendar turn and went to bed earlier than usual",
    "checked the schedule twice and circled a date for the family",
    "stood in the yard a while thinking about the stretch ahead",
    "pulled out the old glove and worked the leather for an hour"
  ],
  community: [
    "came home from the event with a bag of thank-you cards from kids who'd never seen a game",
    "stayed an extra hour at the community center because nobody wanted to leave",
    "drove home thinking about the one kid who wouldn't let go of the ball",
    "got a text from a neighbor who'd been at the event and sat with it a while"
  ],
  injuryReturn: [
    "pulled on the uniform again and had to sit down for a second before leaving the house",
    "came home from the first day back sore in the good way",
    "let the family make a small fuss over the return and didn't stop them",
    "slept the whole night through for the first time since the injury"
  ]
};
var SPORTS_TRIGGER_ROUTES_ = {
  // celebration — the night was theirs
  'walk-off': 'celebration', 'no-hitter': 'celebration', 'big-win': 'celebration', 'comeback': 'celebration',
  'career-night': 'celebration', 'shutout': 'celebration', 'buzzer-beater': 'celebration', 'series-clinch': 'celebration',
  'playoff-clinch': 'celebration', 'championship': 'celebration', 'all-star': 'celebration', 'award': 'celebration',
  'milestone': 'celebration', 'debut': 'celebration',
  // setback — the night went against them
  'tough-loss': 'setback', 'blowout-loss': 'setback', 'blown-lead': 'setback', 'slump': 'setback',
  'eliminated': 'setback', 'suspension': 'setback', 'clubhouse-tension': 'setback',
  // move — the life moves
  'signed': 'move', 're-signed': 'move', 'departed': 'move', 'traded': 'move', 'released': 'move',
  'draft-night': 'move', 'trade-deadline': 'move', 'trade-rumor': 'move', 'coaching-change': 'move',
  // season — the calendar turns
  'playoff-push': 'season', 'rivalry': 'season', 'home-opener': 'season', 'season-finale': 'season', 'camp-opens': 'season',
  // community — the club off the field
  'community-outreach': 'community',
  // milestones — the row changes (sportsMilestone_)
  'injury': 'injury', 'injury-return': 'injury-return', 'retirement': 'retirement'
};
// the graded tag each texture route writes (engine.299: a line with no signed fact is not written)
var SPORTS_TRIGGER_TAGS_ = {
  celebration: 'Sports-Composure-Up-M', setback: 'Sports-Composure-Down-M', move: 'Sports-Moved',
  season: 'Sports-Drive-Up-S', community: 'Sports-Warmth-Up-S', injuryReturn: 'Sports-Composure-Up-S'
};
var SPORTS_MILESTONE_WORDS_ = { 'injury': true, 'injury-return': true, 'retirement': true };
var SPORTS_HEALTH_STATES_ = { injured: true, hospitalized: true, critical: true, recovering: true, 'serious-condition': true };

function sportsTriggerWord_(entry) {
  return String(entry && entry.eventTrigger || '').trim().toLowerCase();
}

// engine.333 C6 (builder 2026-11-07: "newest life altering moments should add a line atop the bio"): one engine-owned
// sentence leads CitizenBio — `Now: …` — replaced, never accreted; the authored prose after it is untouched. The wake's
// own-record read-back takes the Bio line first and cuts at 600 chars (lib/wakePerception.js), so the front is the
// only place a long bio's newest chapter is heard. Pure.
// Grammar every engine `Now:` writer keeps (codex engine-cut review claim 6): the sentence ends with the Cycle stamp,
// `… C<N>.` — the one terminator a role like "Dr. Keane" or "St. Mary's Nurse" cannot contain — so the strip never cuts
// an authored sentence short. The helper stamps the sentence itself; a caller passes the text without the Cycle.
function sportsBioNow_(existing, sentence, cycle) {
  var rest = String(existing || '').replace(/^Now:\s[^\n]*?\sC\d+\.(?:\s+|$)/, '').replace(/^\s+/, '');
  var now = 'Now: ' + String(sentence || '').trim().replace(/[.,\s]+$/, '') + ' C' + Number(cycle) + '.';
  return rest ? now + ' ' + rest : now;
}

// `retirement` leaves the sports layer (builder 2026-11-05: Status stays Active — "Vinnie is 38 … putting him off
// Undocked and in a retirement event loop doesn't make sense"). The layer is two cells (isSportsLayerRow_: GAME clock,
// SPORTS_OVERRIDE); a row already off it is skipped whole, so a re-fired row writes no second line. RoleType takes
// `Former ` so the Occupation texture stops saying he worked a shift as a designated hitter; the pools never touch a
// Tier 1–2 row, so the next chapter is the builder's own row. StatusStartCycle is not stamped — it is the health /
// custody clock and nothing reads it on an Active row.
// Who retires (codex engine-cut review F2): a row on the GAME clock with Status Active — the player's own row. A row already
// off the clock is not flipped again whatever its key holds (live C114 has three ENGINE / SPORTS_OVERRIDE / Retired rows,
// the MUBA Hall-of-Famers, gap G-RB8); a Retired, traded, detained or hospitalized row is not retired by a feed word.
// engine.338 (builder 2026-11-07): the playing salary ends at the flip. A Tier 1–2 row takes the post-career figure
// from World_Config (appearances, events, the name — not a job; the hiring pools never touch Tier 1–2, so nothing
// else would ever re-price it). Tier 3–4 keep their pay: the pools re-price them when a job lands. The money loop
// runs after this phase in the same Cycle, so the retirement week already saves off the new figure. A missing key
// throws (ADR-0015: ensureEngine338Config_ self-arms at open, so absence means the contract did not run).
var ENGINE338_KEYS = { 1: 'postCareerIncomeTier1', 2: 'postCareerIncomeTier2' };
function postCareerIncome_(ctx, tier) {
  var key = ENGINE338_KEYS[Number(tier)];
  if (!key) return null; // Tier 3–4 (or blank): the pools' row, untouched
  var v = ctx && ctx.config ? Number(ctx.config[key]) : NaN;
  if (isNaN(v)) throw new Error('engine.338: World_Config ' + key + ' missing — ensureEngine338Config_ did not run (ADR-0015)');
  return Math.round(v);
}
// Returns 'retired', or the reason the row was left alone.
function sportsRetire_(ctx, row, cols, team, cycle, write, ri) {
  var clock = cols.iClock >= 0 ? String(row[cols.iClock] || '').trim().toUpperCase() : '';
  var status = cols.iStatus >= 0 ? String(row[cols.iStatus] || '').trim().toLowerCase() : '';
  if (clock !== 'GAME') return 'off-clock';
  if (status !== 'active' && status !== '') return 'status:' + status;
  var econ = cols.iEcon >= 0 ? String(row[cols.iEcon] || '').trim() : '';
  if (cols.iClock >= 0) row[cols.iClock] = 'ENGINE';
  if (cols.iEcon >= 0 && econ === 'SPORTS_OVERRIDE') row[cols.iEcon] = '';
  var role = cols.iRole >= 0 ? String(row[cols.iRole] || '').trim() : '';
  if (cols.iRole >= 0 && role && !/^Former\b/i.test(role)) row[cols.iRole] = 'Former ' + role;
  var club = team === 'Oaks' ? 'the Oaks' : "the A's";
  // engine.338: the money after the career, by Tier — read before the line so the line can name it
  var moneyClause = '';
  if (cols.iTier >= 0 && cols.iIncome >= 0) {
    var postPay = postCareerIncome_(ctx, row[cols.iTier]);
    if (postPay !== null) {
      row[cols.iIncome] = postPay;
      moneyClause = ' — the playing salary ends; appearances and the name pay $' + postPay.toLocaleString('en-US') + ' a year';
    }
  }
  write(ri, 'Retirement', 'retired from ' + club + ', announced C' + cycle + moneyClause, 'Retirement');
  if (cols.iBio >= 0) {
    var formerRole = cols.iRole >= 0 ? String(row[cols.iRole] || '').trim() : '';
    row[cols.iBio] = sportsBioNow_(row[cols.iBio], (formerRole || ('Former ' + club.replace(/^the /, '') + ' player')) + '; retired', cycle);
  }
  return 'retired';
}

// One intake receipt per citizen per Cycle (codex engine-cut review claim 2): the Phase-4 chaos ambulance can stamp a
// GAME-clock player and file its own intake before this runs; the feed then adds the line, never a second receipt.
function sportsBedAlreadyFiled_(ctx, popId, cycle) {
  var evs = (ctx.summary && ctx.summary.hospitalEvents) || [];
  for (var i = 0; i < evs.length; i++) {
    if (String(evs[i].popId) === String(popId) && evs[i].kind === 'intake' && Number(evs[i].cycle) === Number(cycle)) return true;
  }
  return false;
}

// `injury` fills the bed. The dashboard roster action (engine.77) may already have stamped Status / StatusStartCycle /
// HealthCause this Cycle and writes no hospitalEvents entry (buildCyclePacket.js self-heals a bed with blank source);
// here the bed is a real intake from the feed row, one writer per fact: the dashboard's cells stand when it got there
// first, the engine stamps them otherwise. sourceEventId is stable per row, so a second fire hits the writer's
// one-row-per-SourceEventId dedup. A player already in a health state from an earlier Cycle gets the line only.
function sportsInjure_(ctx, row, cols, team, cycle, entry, popId, name) {
  var status = cols.iStatus >= 0 ? String(row[cols.iStatus] || '').trim() : '';
  var low = status.toLowerCase();
  var start = cols.iStatusStart >= 0 ? Number(row[cols.iStatusStart]) || 0 : 0;
  if (SPORTS_HEALTH_STATES_[low] && start !== cycle) return 'line-only';
  // codex engine-cut review F1: only an Active row is stamped — a detained (custody), retired, traded or pending citizen
  // named on an injury row gets the line and nothing else (the hospital writer refuses a `detained` PriorStatus mid-loop,
  // and custody's care handoff is the judicial engine's, not the feed's).
  if (!SPORTS_HEALTH_STATES_[low] && low !== 'active' && low !== '') return 'line-only:' + low;
  if (sportsBedAlreadyFiled_(ctx, popId, cycle)) return 'line-only:bed-filed';
  var club = team === 'Oaks' ? 'the Oaks' : "the A's";
  var cause = cols.iHealthCause >= 0 ? String(row[cols.iHealthCause] || '').trim() : '';
  var stampedByDashboard = SPORTS_HEALTH_STATES_[low] && start === cycle;
  if (!stampedByDashboard) {
    if (cols.iStatus >= 0) row[cols.iStatus] = 'injured';
    if (cols.iStatusStart >= 0) row[cols.iStatusStart] = cycle;
    if (cols.iHealthCause >= 0 && !cause) { cause = 'injured playing for ' + club; row[cols.iHealthCause] = cause; }
  } else if (cols.iHealthCause >= 0 && !cause) {
    cause = 'injured playing for ' + club; row[cols.iHealthCause] = cause;
  }
  ctx.summary.hospitalEvents = ctx.summary.hospitalEvents || [];
  ctx.summary.hospitalEvents.push({
    popId: popId, name: name, neighborhood: cols.iNbhd >= 0 ? (row[cols.iNbhd] || '') : '',
    cause: cause, from: stampedByDashboard ? 'Active' : status, to: stampedByDashboard ? low : 'injured', cycle: cycle,
    priorStatus: stampedByDashboard ? 'Active' : status, kind: 'intake',
    intakeType: 'injury', sourceSystem: 'sports-feed',
    sourceEventId: 'sports-feed:C' + cycle + ':injury:' + popId
  });
  return stampedByDashboard ? 'bed-only' : 'stamped';
}

// `injury-return` empties the bed the way the health engine's discharge does: Status back to the bed's PriorStatus
// (hospitalPriorStatusForDischarge_, generationalEventsEngine.js — the Hospital_Ledger cache), the health clock and
// cause cleared, a transition the Phase-10 writer closes the row on. Already out → the line only.
function sportsReturn_(ctx, row, cols, cycle, popId, name) {
  var status = cols.iStatus >= 0 ? String(row[cols.iStatus] || '').trim() : '';
  var low = status.toLowerCase();
  if (!SPORTS_HEALTH_STATES_[low]) return 'line-only';
  var prior = hospitalPriorStatusForDischarge_(ctx, popId) || 'active';
  var cause = cols.iHealthCause >= 0 ? String(row[cols.iHealthCause] || '') : '';
  row[cols.iStatus] = String(prior).trim().toLowerCase() === 'active' ? 'Active' : prior;
  if (cols.iStatusStart >= 0) row[cols.iStatusStart] = '';
  if (cols.iHealthCause >= 0) row[cols.iHealthCause] = '';
  ctx.summary.hospitalEvents = ctx.summary.hospitalEvents || [];
  ctx.summary.hospitalEvents.push({
    popId: popId, name: name, neighborhood: cols.iNbhd >= 0 ? (row[cols.iNbhd] || '') : '',
    cause: cause, from: low, to: 'active', cycle: cycle,
    kind: 'transition', intakeType: '', sourceSystem: 'sports-feed', sourceEventId: ''
  });
  return 'discharged';
}

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
  // engine.333: the milestone cells
  var iEcon = idx('EconomicProfileKey'), iBio = idx('CitizenBio'), iStatusStart = idx('StatusStartCycle'), iHealthCause = idx('HealthCause');
  var iTier = idx('Tier'), iIncome = idx('Income'); // engine.338: the flip prices the post-career Income by Tier
  var cols = { iStatus: iStatus, iClock: iClock, iEcon: iEcon, iRole: iRole, iBio: iBio, iStatusStart: iStatusStart, iHealthCause: iHealthCause, iNbhd: iNbhd, iTier: iTier, iIncome: iIncome };
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
  var counts = { named: 0, staff: 0, fan: 0, trigger: 0, retired: 0, injured: 0, returned: 0 };
  var reach = {};   // engine.209: per franchise { staff, fan } — the week's attendance input
  var unresolved = [];
  var unknownWords = []; // engine.333: a trigger word with no route, named once a Cycle
  var milestoneDetail = []; // engine.333: "retirement: <name>" etc. for the ripple's CauseDetail

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
        // engine.331 (codex diff review F1): ONE draw picks the line and, from its fractional remainder
        // (uniform, independent of the line index), the mood clause — the shared stream every later Phase 5
        // roll reads is the same whether the mood cell is blank or not, so the mood is text only.
        var nightPool = GAME_NIGHT_POOLS[gameNightBucket_(entry, weeks[team] ? weeks[team].hotCold : '')];
        var nightPos = rng() * nightPool.length;
        text = nightPool[Math.floor(nightPos)];
        var moodPool = gameNightMoodLookup_(GAME_NIGHT_MOOD_CLAUSES_, entry.playerMood);
        if (moodPool) text += ' — ' + moodPool[Math.floor((nightPos - Math.floor(nightPos)) * moodPool.length)];
      }
      write(ri, route.tag, text, route.tag + '|source:sports|feedNamed|event:' + (entry.eventType || '-') + '|team:' + (team || '-'));
      counts.named++;

      // engine.333: the row's own trigger word — the second received line, or the milestone that changes the row
      var word = sportsTriggerWord_(entry);
      if (!word) continue;
      var routeKey = Object.prototype.hasOwnProperty.call(SPORTS_TRIGGER_ROUTES_, word) ? SPORTS_TRIGGER_ROUTES_[word] : null;
      var tagTail = '|source:sports|feedNamed|event:' + (entry.eventType || '-') + '|trigger:' + word + '|team:' + (team || '-');
      var who = ((rows[ri][iFirst] || '') + ' ' + (rows[ri][iLast] || '')).trim();
      if (!routeKey) {
        if (unknownWords.indexOf(word) < 0) unknownWords.push(word);
      } else if (SPORTS_MILESTONE_WORDS_[word]) {
        // only a club row retires or injures anyone (engine.331's team gate: A's / Oaks)
        if (team !== "A's" && team !== 'Oaks') { if (unknownWords.indexOf(word + '@' + (entry.teamsUsed || '-')) < 0) unknownWords.push(word + '@' + (entry.teamsUsed || '-')); continue; }
        if (word === 'retirement') {
          var rt = sportsRetire_(ctx, rows[ri], cols, team, cycle, write, ri);
          if (rt === 'retired') { counts.retired++; milestoneDetail.push('retirement: ' + who); }
          else if (typeof Logger !== 'undefined') Logger.log('applyGameNightMoments_: retirement row on ' + who + ' left alone (' + rt + '), cycle ' + cycle);
        } else if (word === 'injury') {
          var inj = sportsInjure_(ctx, rows[ri], cols, team, cycle, entry, String(rows[ri][iPop]), who);
          write(ri, 'Sports-Injured', pick(SPORTS_NAMED_POOLS.injured), 'Sports-Injured' + tagTail);
          counts.injured++; milestoneDetail.push('injury (' + inj + '): ' + who);
        } else {
          var ret = sportsReturn_(ctx, rows[ri], cols, cycle, String(rows[ri][iPop]), who);
          write(ri, SPORTS_TRIGGER_TAGS_.injuryReturn, pick(SPORTS_TRIGGER_POOLS_.injuryReturn), SPORTS_TRIGGER_TAGS_.injuryReturn + tagTail);
          counts.returned++; milestoneDetail.push('injury-return (' + ret + '): ' + who);
        }
      } else {
        write(ri, SPORTS_TRIGGER_TAGS_[routeKey], pick(SPORTS_TRIGGER_POOLS_[routeKey]), SPORTS_TRIGGER_TAGS_[routeKey] + tagTail);
        counts.trigger++;
      }
    }
  }
  if (unknownWords.length && typeof Logger !== 'undefined') {
    Logger.log('applyGameNightMoments_: trigger words with no citizen route, cycle ' + cycle + ': ' + unknownWords.join(', '));
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
        counts.staff + ' staff week lines, ' + counts.fan + ' fan week lines' +
        (counts.trigger ? ', ' + counts.trigger + ' trigger line(s)' : '') +
        (milestoneDetail.length ? '; ' + milestoneDetail.join('; ') : ''), // engine.333: the seed and summary carry the milestone by name
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
      ' staff, ' + counts.fan + ' fan line(s), ' + counts.trigger + ' trigger line(s), ' + counts.retired + ' retired, ' +
      counts.injured + ' injured, ' + counts.returned + ' returned; weeks ' + JSON.stringify(signed));
  }
}
