'use strict';
/**
 * engine.350 Task 7 — the down lines for Event_Content_Ledger.
 *
 * The live tab's signed lines ran up against down, read 2026-11-17: sociability 29 / 0,
 * warmth 14 / 0, openness 33 / 2, drive 18 / 1, family 38 / 5, outabout 38 / 8, integrity 4 / 2.
 * A line moves a dial by what it says (builder 2026-11-16), so the down side has to be written:
 * one small unflattering moment from an ordinary week. Builder 2026-11-17: research-build writes
 * them, Grok drafts (`from`: g1 / g2 = Grok round 1 / 2 as drafted or trimmed, rb = written here;
 * drafts in output/research-build/2026-11-17-e350-grok-downlines*.json).
 *
 * 148 rows in one PoolKey a dial (`down.<dial>`), and 9 rows placed in the pools where the up rows are (PLACED,
 * 2026-11-18). One PoolKey a dial (`down.<dial>`). A PoolKey is a draw bucket: every eligible key takes the same
 * share of the tab's draws and Weight sets a row's share inside its key and the tab's mass against
 * the coded pools (generateCitizensEvents.js balanceContentLedgerPoolWeights_). WEIGHT below is
 * the tuning number, set from the bench count of pushes up against down, on the sheet, no deploy.
 *
 * Each row's first tag is a whitelisted source whose kind moves nothing on its own, so the
 * generator writes the line in the graded form from the row's own `dial:<dial>:down` tag
 * (band S): <Kind>-<Dial>-Down-S.
 *
 *   node scripts/downLinesEclPool.js                              # validate + print
 *   node scripts/undockedEclPoolApply.js --pool downLines          # dry-run vs the tab
 *   node scripts/undockedEclPoolApply.js --pool downLines --apply  # append missing
 * Plan: docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md Task 7.
 */
const U = require('./undockedEclPool');
const HDR = U.HDR;
const AUTH = 'auth:rb-1117';
const WEIGHT = 0.5;

// dial -> the source its lines ride and the kind that source writes (primaryFromTags).
const ROUTE = {
  sociability: { source: 'source:communityLife', kind: 'Neighborhood' },
  warmth:      { source: 'source:reflection',    kind: 'Personal' },
  drive:       { source: 'source:reflection',    kind: 'Personal' },
  openness:    { source: 'source:curiosity',     kind: 'Lifestyle' },
  integrity:   { source: 'source:identity',      kind: 'Personal' },
  family:      { source: 'source:familyLife',    kind: 'Daily' },
  outabout:    { source: 'source:homeLife',      kind: 'Background' }
};

// who the moment can happen to -> the tab's Conditions (loadEventContentLedger.js DSL).
const WHO = {
  anyone:  'band!=child; band!=teen',
  parent:  'children>=1; band!=child; band!=teen',
  married: 'married',
  teen:    'band=teen',
  child:   'band=child',
  retired: 'lifestate=retired',
  working: 'lifestate=working'
};

// [text, who, from]
const LINES = {
  sociability: [
    ['let an old friend\'s message sit until answering it would have been strange', 'anyone', 'rb'],
    ['turned down the neighbor\'s offer and closed the door before they finished asking', 'anyone', 'g1'],
    ['slipped out the side door while the others were still stacking chairs', 'anyone', 'g1'],
    ['stayed in the car until the lobby had emptied of familiar voices', 'anyone', 'g1'],
    ['cancelled the standing coffee date and sent nothing in its place', 'anyone', 'g1'],
    ['looked down at their keys until the familiar face had passed the window', 'anyone', 'g1'],
    ['watched the friends arrive from the upstairs window and did not come down', 'teen', 'g1'],
    ['chose the self-checkout to skip the usual few words with the cashier', 'anyone', 'g1'],
    ['let the conversation with an old friend die after two replies', 'anyone', 'g2'],
    ['set the table for one though their sister had said she might stop by', 'anyone', 'g2'],
    ['spread a bag across the next bus seat so nobody would take it', 'anyone', 'g2'],
    ['ate lunch on the landing between floors rather than at the table with the others', 'working', 'g1'],
    ['left the family dinner before the dishes reached the sink', 'anyone', 'g2'],
    ['skipped a friend\'s birthday lunch and did not bother to make up a reason', 'anyone', 'g2'],
    ['chose the cafeteria seat farthest from the usual table', 'teen', 'g1'],
    ['heard the laughter next door through the wall and turned the television up', 'anyone', 'rb'],
    ['said "we should get together" to a neighbor and meant the opposite', 'anyone', 'rb'],
    ['took the longer route home to avoid the bench where the regulars sit', 'retired', 'g1'],
    ['read the invitation, pictured the small talk, and let the date go by', 'anyone', 'rb'],
    ['stopped going to the weekly thing and waited to see who would notice', 'anyone', 'rb'],
    ['sat out the game at recess and told the teacher they were tired', 'child', 'rb']
  ],
  warmth: [
    ['said the sharp thing to their sister and let it stand', 'anyone', 'rb'],
    ['laughed when their brother tripped on the curb and dropped everything', 'anyone', 'g2'],
    ['kept score of every time their brother arrived late to dinner', 'anyone', 'g2'],
    ['enjoyed watching the neighbor\'s new plant wilt inside a week', 'anyone', 'g2'],
    ['felt glad when the kid across the hall got scolded on the landing', 'anyone', 'g2'],
    ['called a neighbor\'s story boring halfway through the telling', 'anyone', 'g2'],
    ['told their sibling the gift was not what they had asked for', 'anyone', 'g2'],
    ['did not offer the extra ticket after the cancellation', 'anyone', 'g1'],
    ['passed the bowl along without serving the person waiting beside them', 'anyone', 'g1'],
    ['withheld the spare key after the neighbor hinted at needing it', 'anyone', 'g1'],
    ['answered a friend\'s long message with one word', 'anyone', 'rb'],
    ['let the silence stand after someone\'s small mistake was noticed', 'anyone', 'g1'],
    ['smiled when an old friend got the date of their meetup wrong', 'anyone', 'g2'],
    ['watched a coworker struggle with the door and kept both hands on their coffee', 'working', 'rb'],
    ['heard a friend\'s good news and found the flaw in it out loud', 'anyone', 'rb'],
    ['did not ask how the appointment went, though they remembered the day', 'anyone', 'rb'],
    ['withheld the toy until the other kid stopped asking', 'child', 'g1'],
    ['answered their kid\'s question with the shortest reply that would end it', 'parent', 'g2'],
    ['decided a friend\'s apology was not enough and said so', 'anyone', 'rb'],
    ['kept the better headphones for the long part of the ride', 'teen', 'g1']
  ],
  drive: [
    ['started the application and closed the tab after the first page', 'anyone', 'g2'],
    ['closed the drawer of half-started projects without looking inside', 'anyone', 'g1'],
    ['put the paintbrush back in the jar without finishing the canvas', 'anyone', 'g1'],
    ['watched the chance to speak up pass and felt relief', 'anyone', 'g1'],
    ['let the question go unasked for the third meeting in a row', 'working', 'g1'],
    ['promised themselves an early start and turned the alarm off twice', 'anyone', 'g1'],
    ['put the book they meant to finish back on the shelf with the marker still in it', 'anyone', 'g1'],
    ['sat through the lecture without taking a single note', 'teen', 'g1'],
    ['told a friend the course was probably full without checking', 'anyone', 'rb'],
    ['left the gym bag by the door for the second week', 'anyone', 'rb'],
    ['did the job well enough that nobody would say anything and no better', 'working', 'rb'],
    ['let someone else volunteer and studied the table until it was settled', 'working', 'rb'],
    ['decided the plan could wait until the new year and felt lighter for it', 'anyone', 'rb'],
    ['told their kid the science project was good enough and turned off the kitchen light', 'parent', 'g2'],
    ['heard about the opening, thought about applying, and made dinner instead', 'anyone', 'rb'],
    ['quit the practice schedule on the fourth day and stopped looking at the chart', 'anyone', 'rb'],
    ['gave up on the long-division page and drew in the margin until the bell', 'child', 'rb'],
    ['handed in the first draft and called it finished', 'teen', 'rb'],
    ['looked at the list of things to fix around the house and added to it', 'anyone', 'rb'],
    ['skipped the evening walk they had promised themselves and did not blame the weather', 'anyone', 'rb'],
    ['talked themselves out of the tryout on the walk over', 'teen', 'rb']
  ],
  openness: [
    ['waved off an idea before the neighbor had finished describing it', 'anyone', 'g1'],
    ['put the unfamiliar spice back on the shelf and reached for the old jar', 'anyone', 'g1'],
    ['shut the recipe book at the first unfamiliar step and opened the drawer of takeout menus', 'anyone', 'g1'],
    ['told their sister the book club pick would disappoint and named an author they already liked', 'anyone', 'g2'],
    ['laughed at their kid\'s wish to plant something new and handed over the old rake', 'parent', 'g2'],
    ['told an old friend the new shoes would hurt and laced up the broken-in pair', 'anyone', 'g2'],
    ['kept describing how the storefront used to look while the neighbor pointed at what it was now', 'anyone', 'g2'],
    ['steered the talk back to the same complaint after a coworker offered a fix', 'working', 'g2'],
    ['walked past the open door of the new shop without glancing inside', 'anyone', 'g1'],
    ['ordered the usual at the ice cream stand and would not taste the new one', 'child', 'g1'],
    ['decided what they thought of the new neighbors before meeting them', 'anyone', 'rb'],
    ['heard a song they did not know and changed the station before the chorus', 'anyone', 'rb'],
    ['turned down the class a friend invited them to and said they were tired', 'anyone', 'g2'],
    ['told the table that things were better the old way and did not take questions', 'anyone', 'rb'],
    ['dismissed their teenager\'s idea for dinner and set the regular meal on the table', 'parent', 'g2'],
    ['read the first paragraph of something that disagreed with them and stopped', 'anyone', 'rb'],
    ['found someone in their usual seat and held it against them all evening', 'anyone', 'rb'],
    ['refused the borrowed book and went back to the one on the nightstand', 'teen', 'g1'],
    ['said "that\'s not for people like us" about the new place before anyone asked', 'anyone', 'rb'],
    ['waved away the afternoon lecture at the center and went home early', 'retired', 'g1']
  ],
  integrity: [
    ['kept the extra change from the corner store without saying a word', 'anyone', 'g1'],
    ['nodded when the boss praised a report a coworker had finished', 'working', 'g2'],
    ['let the other person believe the error had been theirs from the start', 'anyone', 'g1'],
    ['agreed to keep the secret and mentioned it before the day ended', 'anyone', 'g1'],
    ['told the story as if they had been there when they had only heard it', 'anyone', 'g1'],
    ['said they had called when the thought alone had been enough', 'anyone', 'g1'],
    ['promised to cook for the gathering and brought a bought dish in their own bowl', 'anyone', 'g1'],
    ['told the version of events that left out their own small mistake', 'anyone', 'g1'],
    ['skipped the last item on the checklist since no one would check', 'working', 'g1'],
    ['said the previous meeting ran late to cover arriving after it started', 'working', 'g1'],
    ['put the cracked mug back on the shelf without pointing it out', 'anyone', 'g1'],
    ['agreed with the neighbor that the new family seemed unfriendly, having never spoken to them', 'anyone', 'g2'],
    ['promised to return the borrowed tool and left it in the drawer another month', 'anyone', 'g2'],
    ['kept quiet when the wrong person was blamed for the noise', 'anyone', 'g2'],
    ['let their kid believe the toy had simply disappeared from the shelf', 'parent', 'g2'],
    ['said they had read the book their sister kept asking about', 'anyone', 'g2'],
    ['agreed to split the task evenly and finished only their own half', 'working', 'g2'],
    ['hid the homework note and said the teacher had not handed any out', 'teen', 'g2'],
    ['said they finished the worksheet when they had only filled in the first line', 'child', 'g1'],
    ['let their parent think the mess in the kitchen was someone else\'s', 'child', 'g2'],
    ['signed up for the shift and sent word the night before that they could not come', 'retired', 'g1'],
    ['rounded the story up in their own favor and watched it land', 'anyone', 'rb']
  ],
  family: [
    ['felt relieved when their brother cancelled the visit first', 'anyone', 'g2'],
    ['let their sister\'s call ring out and felt lighter afterward', 'anyone', 'g2'],
    ['told their sister she was overreacting and felt calm saying it', 'anyone', 'g2'],
    ['changed the subject when their mother brought up the old argument', 'anyone', 'g2'],
    ['let their father\'s message sit unread through the whole evening', 'anyone', 'g2'],
    ['forgot the one thing their kid had asked for from the store', 'parent', 'g1'],
    ['changed the subject when their kid brought up the school event', 'parent', 'g1'],
    ['told their kid the story they wanted was too long for tonight', 'parent', 'g2'],
    ['sent a one-word reply to their parent\'s long update', 'teen', 'g1'],
    ['put their headphones on the minute the meal ended', 'teen', 'g1'],
    ['ate dinner standing in the kitchen instead of at the table with the others', 'anyone', 'g1'],
    ['left a cousin\'s birthday card unsigned on the counter past the day', 'anyone', 'g1'],
    ['stayed in the car a few minutes longer than needed after pulling up at home', 'anyone', 'g1'],
    ['went to bed without mentioning the small thing that bothered them', 'anyone', 'g1'],
    ['did not mention the good thing that happened to them that day', 'anyone', 'g1'],
    ['left their kid\'s drawing face down on the counter without a word', 'parent', 'g2'],
    ['kept their brother\'s secret mostly to have something to hold over them', 'anyone', 'g2'],
    ['argued over whose turn it was to choose the movie and went to their room', 'teen', 'g1'],
    ['told their sibling "you always do this" at the table and watched it work', 'anyone', 'rb']
  ],
  outabout: [
    ['turned back halfway to the bus and unlocked the apartment door again', 'anyone', 'g1'],
    ['skipped the Saturday market and stayed in to sort old mail', 'anyone', 'g1'],
    ['kept the coat on the hook and ate dinner in the same chair as lunch', 'anyone', 'g1'],
    ['pulled the blanket higher instead of answering the front door', 'anyone', 'g1'],
    ['ignored the knock and kept the lights off until the footsteps faded', 'anyone', 'g2'],
    ['said they had laundry to finish when a neighbor suggested splitting a ride downtown', 'anyone', 'g2'],
    ['told a coworker they were already asleep when the plan for the evening came through', 'working', 'g2'],
    ['told their kid the water looked cold and put the swimsuits back in the closet', 'parent', 'g2'],
    ['shut the curtains when a neighbor called up about the evening stroll', 'anyone', 'g2'],
    ['stayed on the couch while the street fair started outside', 'anyone', 'g2'],
    ['turned down the movie invite by saying the bus ran too late', 'teen', 'g1'],
    ['hid the field trip form at the bottom of the drawer', 'child', 'g2'],
    ['let the weekend go by without once putting on shoes', 'anyone', 'rb'],
    ['got dressed to go out, sat down for a minute, and stayed there', 'anyone', 'rb'],
    ['watched the evening cool from the doorway and did not step out', 'retired', 'g1'],
    ['ordered in for the third night and asked for it to be left at the door', 'anyone', 'rb'],
    ['took the short way home to avoid the block where something was going on', 'anyone', 'g1'],
    ['cancelled on the neighbor by blaming a sudden load of dishes', 'anyone', 'g2'],
    ['let the tickets go unused on the counter and did not offer them to anyone', 'anyone', 'rb'],
    ['decided on a clear day that the walk around the lake could wait for better weather', 'anyone', 'rb']
  ]
};

function row(dial, line) {
  return {
    Kind: 'line', PoolKey: 'down.' + dial, Slot: '', Text: line[0], Weight: String(WEIGHT),
    Conditions: WHO[line[1]], Tags: [ROUTE[dial].source, AUTH, 'dial:' + dial + ':down'].join(','),
    Grain: 'citizen', Active: 'yes', from: line[2], dial: dial, source: ROUTE[dial].source, kind: ROUTE[dial].kind
  };
}

// engine.350, the down side where the up rows are (2026-11-18). Every eligible PoolKey takes the same share
// of the tab's draws, so a PoolKey with one signed row hands that row its whole share: on the live log
// C115–C116 "painted over graffiti … alongside five neighbors" was drawn 40 times a Cycle (the per-row cap),
// the two faith pools and the Tribune pool 30 to 60, each all up on sociability or warmth, against one share
// for the 21 rows of down.sociability. A row placed IN such a pool takes one row's share of that pool beside
// the up row it answers (half in a pool with one signed row, a fifth or a sixth in the Tribune and faith
// pools): same PoolKey, same source (so the same kind), the Conditions cell of the row it answers, Weight 1 as
// its neighbours. One small moment on the same ground, the other way. It reaches exactly who the up row
// reaches — the faith rows any adult, the health-center row any hood: gap log C116 G-EC62.
// [PoolKey, dial, source, kind, Conditions, text, the live row it answers]
const PLACED_AUTH = 'auth:rb-1118';
const PLACED = [
  ['community.program', 'sociability', 'source:civicNews', 'Civic Perception', 'band!=child',
    'saw the sign-up sheet for the recreation center clean-up and walked past it a second time',
    'painted over graffiti on the recreation center wall alongside five neighbors they barely knew'],
  ['tribune.newsroom', 'sociability', 'source:media', 'Media', '',
    'recognized a name in the Tribune and decided against mentioning it to anyone',
    'read the Tribune\'s front page twice — once for the news, once to see who was in it'],
  ['tribune.newsroom', 'warmth', 'source:media', 'Media', '',
    'found their neighborhood in the Tribune again and resented, a little, who got quoted',
    'saved the Tribune clipping with their neighborhood in it — the good one'],
  ['sports.citywide', 'sociability', 'source:media', 'Media', '',
    'heard the recap of last night\'s game start up at the counter and took the coffee to go',
    'caught the recap of last night\'s game at the counter and stayed for the second retelling'],
  ['faith.attending', 'sociability', 'source:familyLife', 'Daily', 'band!=child',
    'left by the side aisle during the last hymn to miss the talk in the parking lot',
    'stayed thirty minutes after the service just catching up in the parking lot'],
  ['faith.volunteering', 'warmth', 'source:familyLife', 'Daily', 'band!=child',
    'sorted the donation bags and judged, privately, what people had seen fit to give',
    'organized the clothing drive donations and recognized a coat they had donated two years ago'],
  ['faith.volunteering', 'sociability', 'source:familyLife', 'Daily', 'band!=child',
    'took the job at the back of the fellowship hall, the one nobody talks during',
    'drove the church van for the senior trip and listened to three hours of unfiltered neighborhood gossip'],
  ['civic.stabilization-fund', 'warmth', 'source:civicNews', 'Civic Perception', 'wealth<=5',
    'watched a neighbor fight the Stabilization Fund portal on a phone and kept what they knew to themselves',
    'helped a neighbor navigate the West Oakland Stabilization Fund portal because the interface was confusing'],
  ['civic.health-center', 'openness', 'source:civicNews', 'Civic Perception', 'band!=child',
    'walked past the renderings for the Temescal Community Health Center and decided it would never look like that',
    'stopped to read the architectural renderings for the Temescal Community Health Center posted on the chain-link fence']
];

function placedRow(p) {
  return {
    Kind: 'line', PoolKey: p[0], Slot: '', Text: p[5], Weight: '1',
    Conditions: p[4], Tags: [p[2], PLACED_AUTH, 'dial:' + p[1] + ':down'].join(','),
    Grain: 'citizen', Active: 'yes', from: 'rb', dial: p[1], source: p[2], kind: p[3], answers: p[6]
  };
}

const ROWS = [];
Object.keys(LINES).forEach(function (dial) { LINES[dial].forEach(function (l) { ROWS.push(row(dial, l)); }); });
const DOWN_POOL_ROWS = ROWS.length;
PLACED.forEach(function (p) { ROWS.push(placedRow(p)); });

const OUT_OF_WORLD = /videogame|video game|openrouter|grok|DialState|World_Config|sociability|composure|outabout|\bdial\b/i;

function validateRows(rows) {
  const list = rows || ROWS; const errors = []; const seen = {};
  list.forEach(function (r, i) {
    const placed = r.answers != null;
    const m = placed ? [r.PoolKey, r.dial] : /^down\.([a-z]+)$/.exec(r.PoolKey);
    if (r.Kind !== 'line') errors.push(i + ': Kind');
    if (!m || !ROUTE[m[1]]) { errors.push(i + ': PoolKey'); return; }
    if (placed && (/^down\./.test(r.PoolKey) || r.Weight !== '1' || !PLACED.some(function (p) { return p[0] === r.PoolKey && p[1] === r.dial && p[5] === r.Text && p[4] === r.Conditions && p[2] === r.source && p[3] === r.kind && p[6] === r.answers; }))) errors.push(i + ': a placed row is one of PLACED, as written');
    if (!r.Text) errors.push(i + ': empty Text');
    if (/^[A-Z]/.test(r.Text) || /[.!?]$/.test(r.Text)) errors.push(i + ': a clause — lowercase start, no closing mark');
    if (/\d/.test(r.Text)) errors.push(i + ': no numbers in a line');
    if (/\$[A-Z]/.test(r.Text)) errors.push(i + ': no slots in a down line');
    const words = r.Text.split(/\s+/).length;
    if (words < 6 || words > 20) errors.push(i + ': ' + words + ' words');
    if (OUT_OF_WORLD.test(r.Text)) errors.push(i + ': out-of-world word');
    const k = r.Text.toLowerCase(); if (seen[k]) errors.push(i + ': repeats row ' + seen[k]); seen[k] = String(i);
    if (r.Tags.indexOf(';') >= 0) errors.push(i + ': tags must be comma-split');
    if (U.firstTag(r.Tags) !== (placed ? r.source : ROUTE[m[1]].source)) errors.push(i + ': first tag must be ' + (placed ? r.source : ROUTE[m[1]].source));
    if (r.Tags.split(',').indexOf('dial:' + m[1] + ':down') < 0) errors.push(i + ': dial tag');
    if (r.Tags.split(',').filter(function (t) { return t.indexOf('dial:') === 0; }).length !== 1) errors.push(i + ': one dial tag a line');
    if (!placed && Object.keys(WHO).map(function (w) { return WHO[w]; }).indexOf(r.Conditions) < 0) errors.push(i + ': Conditions');
    if (!(Number(r.Weight) > 0)) errors.push(i + ': Weight');
  });
  return { valid: !errors.length, errors: errors, count: list.length };
}

function toSheetValues(rows) {
  return (rows || ROWS).map(function (r) { return HDR.map(function (h) { return r[h] == null ? '' : r[h]; }); });
}

function counts() {
  const c = {};
  ROWS.forEach(function (r) { c[r.PoolKey] = (c[r.PoolKey] || 0) + 1; });
  return c;
}

if (require.main === module) {
  const v = validateRows(ROWS);
  ROWS.forEach(function (r) { console.log('[' + r.PoolKey + '] ' + r.Conditions + ' :: ' + r.Text); });
  console.log(JSON.stringify(counts()));
  console.log(v.valid ? ('OK ' + v.count + ' rows') : ('INVALID\n' + v.errors.join('\n')));
  process.exit(v.valid ? 0 : 1);
}

module.exports = { HDR, ROWS, LINES, ROUTE, WHO, WEIGHT, PLACED, DOWN_POOL_ROWS, validateRows, toSheetValues, counts, firstTag: U.firstTag };
