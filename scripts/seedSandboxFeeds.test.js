/**
 * seedSandboxFeeds.test.js — engine.330 seeder: target refusal and the three row builders.
 *
 * Run: node scripts/seedSandboxFeeds.test.js
 */

const s = require('./seedSandboxFeeds');

let passed = 0, failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const LIVE = 'LIVE_SHEET_ID';
const ledger = [
  { First: 'Ines', Last: 'Sorensen', Status: 'Active' },
  { First: 'Luis', Last: 'Navarro', Status: 'Active' },
  { First: 'Dillon', Last: 'Brooks', Status: 'Active' },
  { First: 'Wendell', Last: 'Carter Jr', Status: 'Active' },
  { First: 'Gone', Last: 'Player', Status: 'Deceased' },
  { First: 'Sam', Last: 'Twin', Status: 'Active' },
  { First: 'Sam', Last: 'Twin', Status: 'Active' }
];

console.log('target');
assert('live refused', /live/.test(s.checkTarget(LIVE, LIVE)));
assert('baseline C112 refused', /baseline/.test(s.checkTarget(s.BASELINE_IDS[0], LIVE)));
assert('baseline C112b refused', /baseline/.test(s.checkTarget(s.BASELINE_IDS[1], LIVE)));
assert('unknown sheet refused', /only SANDBOX/.test(s.checkTarget('OTHER', LIVE)));
assert('missing id refused', !!s.checkTarget(null, LIVE));
assert('sandbox 1004 accepted', s.checkTarget(s.SANDBOX_ID, LIVE) === null);

console.log('helpers');
assert('median odd', s.median([1, 3, 2]) === 2);
assert('median half rounds toward zero (+)', s.median([2, 3]) === 2);
assert('median half rounds toward zero (-)', s.median([-2, -3]) === -2);
assert('W-L text', JSON.stringify(s.parseWinLoss('6-1')) === '{"w":6,"l":1}');
assert('W-L Sheets date', JSON.stringify(s.parseWinLoss('6/1/2026')) === '{"w":6,"l":1}');
assert('W-L dash is none', s.parseWinLoss('-') === null);
assert('names strip positions', s.parseNamesUsed('Dillon Brooks (SF), Wendell Carter Jr (C)').join('|') === 'Dillon Brooks|Wendell Carter Jr');
assert('off-season has no games', s.isNoGamePhase('off-season') && s.isNoGamePhase(''));
assert('early-season has games', !s.isNoGamePhase('early-season'));

console.log('ratings');
{
  const live = [];
  for (let c = 106; c <= 113; c++) {
    live.push({ Cycle: c, Domain: 'SPORTS', Rating: c % 2 ? 3 : 2 });        // 8 of 8
    if (c <= 109) live.push({ Cycle: c, Domain: 'CIVIC', Rating: -1 });     // 4 of 8
    if (c <= 108) live.push({ Cycle: c, Domain: 'HEALTH', Rating: 5 });     // 3 of 8 → out
  }
  live.push({ Cycle: 105, Domain: 'HEALTH', Rating: 5 });                   // outside the window
  const r = s.buildRatingRows(live, [], 115);
  const by = Object.fromEntries(r.rows.map(x => [x.Domain, x]));
  assert('window is the 8 highest rated Cycles', r.window.join(',') === '113,112,111,110,109,108,107,106');
  assert('domain at 8/8 seeded with median', by.SPORTS && by.SPORTS.Rating === 2, JSON.stringify(by.SPORTS));
  assert('domain at 4/8 seeded', by.CIVIC && by.CIVIC.Rating === -1 && by.CIVIC.Tone === 'negative');
  assert('domain at 3/8 not seeded', !by.HEALTH);
  assert('rows stamped N-1, marker, unprocessed', r.rows.every(x => x.Cycle === 114 && x.Reporter === s.MARKER && x.Processed === 'FALSE'));
  const again = s.buildRatingRows(live, r.rows, 115);
  assert('second run adds nothing', again.rows.length === 0 && again.skipped.length === 2);
  const gap = s.buildRatingRows([{ Cycle: 100, Domain: 'X', Rating: 1 }, { Cycle: 101, Domain: 'X', Rating: 1 },
    { Cycle: 104, Domain: 'X', Rating: 1 }, { Cycle: 110, Domain: 'X', Rating: 1 }], [], 120);
  assert('rating gaps do not shrink the window', gap.rows.length === 1);
}

console.log('usage');
{
  const live = [
    { Cycle: 113, CitizenName: 'Ines Sorensen', UsageType: 'byline-published', Context: 'culture_c113_a', Reporter: 'Ines Sorensen', Processed: 'Y', Routed: 'Y' },
    { Cycle: 113, CitizenName: 'Ines Sorensen', UsageType: 'byline-landed', Context: 'culture_c113_b', Reporter: 'Ines Sorensen', Processed: 'Y', Routed: 'Y' },
    { Cycle: 113, CitizenName: 'Luis Navarro', UsageType: 'quoted', Context: 'x', Processed: 'Y' },
    { Cycle: 113, CitizenName: 'Sam Twin', UsageType: 'byline-landed', Context: 'y', Processed: 'Y' },
    { Cycle: 113, CitizenName: 'Nobody Here', UsageType: 'byline-landed', Context: 'z', Processed: 'Y' },
    { Cycle: 114, CitizenName: 'Luis Navarro', UsageType: 'byline-landed', Context: 'w', Processed: '' },
    { Cycle: 114, CitizenName: 'Ines Sorensen', UsageType: 'family-own-words', Context: 'v', Processed: '' }
  ];
  const u = s.buildUsageRows(live, [], ledger, 116);
  assert('source = latest published week', u.source === 113);
  assert('bylines only, one ledger match only', u.rows.length === 2 && u.rows.every(x => x.CitizenName === 'Ines Sorensen'));
  assert('ambiguous and unknown names dropped', u.dropped.join('|') === 'Sam Twin|Nobody Here');
  assert('stamped N-1, unprocessed, unrouted, marker', u.rows.every(x => x.Cycle === 115 && x.Processed === '' && x.Routed === '' && x.Reporter === s.MARKER));
  assert('contexts unique', new Set(u.rows.map(x => x.Context)).size === 2);
  assert('context reads as a desk piece', /^sandbox-generic_c115_ines-sorensen-\d+$/.test(u.rows[0].Context));
  const again = s.buildUsageRows(live, u.rows, ledger, 116);
  assert('second run adds nothing', again.rows.length === 0 && /already/.test(again.skipped));
  const warm = s.buildUsageRows(live, live.filter(r => r.Cycle === 113), ledger, 114);
  assert('sandbox with a published week at N-1 is not seeded', warm.rows.length === 0 && /published/.test(warm.skipped));
  // mid-week resync: live's in-progress week (landed only) is on the sandbox at N-1
  const inProgress = [{ Cycle: 115, CitizenName: 'Ines Sorensen', UsageType: 'byline-landed', Context: 'culture_c115_x', Processed: '' }];
  const mid = s.buildUsageRows(live, inProgress, ledger, 116);
  assert('in-progress landed rows do not block the seed', mid.rows.length === 1);
  assert('a landed piece already there is not seeded twice', mid.rows[0].UsageType === 'byline-published', JSON.stringify(mid.rows.map(r => r.UsageType)));
  const homonym = ledger.concat([{ First: 'Ines', Last: 'Sorensen', Status: 'Deceased' }]);
  assert('a dead namesake makes the name ambiguous, as the engine reads it', s.buildUsageRows(live, [], homonym, 116).rows.length === 0);
  const deadOnly = [{ First: 'Ines', Last: 'Sorensen', Status: 'Deceased' }];
  assert('a dead reporter is not seeded', s.buildUsageRows(live, [], deadOnly, 116).rows.length === 0);
}

console.log('sports');
{
  const live = [
    { Cycle: 110, SeasonType: 'early-season', EventType: 'game-result', TeamsUsed: 'Oaks', NamesUsed: 'Dillon Brooks (SF), Gone Player (PG)', 'Team Record': '4/1/2026', WeekRecord: 'H:W' },
    { Cycle: 114, SeasonType: 'early-season', EventType: 'roster-move', TeamsUsed: 'Oaks', NamesUsed: 'Gone Player', 'Team Record': '', EventTrigger: 'championship', PlayerMood: 'confident', Streak: 'W2', HomeNeighborhood: 'KONO' },
    { Cycle: 114, SeasonType: 'off-season', EventType: 'season-state', TeamsUsed: "A's", 'Team Record': '-', NamesUsed: 'Vinnie Keane' }
  ];
  const r = s.buildSportsRows(live, [], ledger, 115);
  const oaks = r.rows.find(x => x.TeamsUsed === 'Oaks'), as = r.rows.find(x => x.TeamsUsed === "A's");
  assert('game phase pairs game-result with a week', oaks.EventType === 'game-result' && oaks.WeekRecord === 'H:W A:L');
  assert('record from the last valid W-L + 1-1', oaks['Team Record'] === '5-2', oaks['Team Record']);
  // a blank cell would carry C114's championship trigger and confident mood forward (reduceFeedTeamState_ keeps non-blank, non-dash)
  assert('streak L1; trigger none and mood quiet overwrite the carried state', oaks.Streak === 'L1' && oaks.EventTrigger === 'none' && oaks.PlayerMood === 'quiet');
  assert('quiet fires no mood trigger and leaves the night to the streak', !/frustrated|angry|electric|confident/.test(oaks.PlayerMood) && !/confident|energized|high|frustrat|low|tense/.test(oaks.PlayerMood));
  assert('names: latest row with a living match', oaks.NamesUsed === 'Dillon Brooks', oaks.NamesUsed);
  assert('static columns copied', oaks.HomeNeighborhood === 'KONO');
  assert('off-season pairs season-state with none', as.EventType === 'season-state' && as.WeekRecord === 'none' && as['Team Record'] === '');
  assert('stamped N, marked', r.rows.every(x => x.Cycle === 115 && /SANDBOX-GENERIC/.test(x.Notes)));
  const again = s.buildSportsRows(live, r.rows, ledger, 115);
  assert('second run adds nothing', again.rows.length === 0);
}

{
  const sparse = [
    { Cycle: 113, SeasonType: 'mid-season', TeamsUsed: "A's", 'Team Record': '20-10', FanSentiment: 'excited', MediaProfile: 'national', NamesUsed: 'Ines Sorensen' },
    { Cycle: 114, SeasonType: '', TeamsUsed: "A's", 'Team Record': '0-0', FanSentiment: '-', MediaProfile: '' }
  ];
  const a = s.buildSportsRows(sparse, [], ledger, 115).rows[0];
  assert('a blank last SeasonType walks back to the phase', a.SeasonType === 'mid-season' && a.EventType === 'game-result');
  assert('carried columns walk back past blank and dash', a.FanSentiment === 'excited' && a.MediaProfile === 'national');
  assert('a filler 0-0 does not clobber the played record', a['Team Record'] === '21-11', a['Team Record']);
  assert('an unknown phase is off-season, as the engine reads it', s.isNoGamePhase('-') && s.isNoGamePhase('banana') && !s.isNoGamePhase('finals'));
}

console.log('row shape');
assert('toRow follows the header', s.toRow(['A', 'B', 'C'], { C: 3, A: 1 }).join(',') === '1,,3');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
