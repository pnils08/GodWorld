'use strict';

/**
 * UNDOCKED Phase 2.3 — ECL pool draft (culture.spacemolt-show).
 * Plan: docs/plans/2026-08-07-spacemolt-game-show.md §2.3
 *
 * Disk only. Does not write Event_Content_Ledger.
 *
 * HOW THESE FIRE (live engine, do not "fix" by adding more PoolKeys):
 * - One citizen draws 1–4 atmospheric events/cycle from a mixed pool
 *   (hardcoded + every eligible ECL line). generateCitizensEvents.js:2785.
 * - PoolKey is a draw bucket. balanceContentLedgerPoolWeights_ gives each
 *   eligible ledger PoolKey equal mass. Twenty lines in ONE key compete
 *   with each other, not 20× against the A's / Baylight / Daily.
 * - Per-row cap 40 draws/cycle (S329). Weight is within-key only.
 * - source:media → primary "Media" → compressLifeHistory {reflective:0.5,
 *   volatile:0.2}. Same small media nudge for love and sting; the TEXT
 *   is the take. Do not invent a new source tag.
 * - EVERY row carries undocked=1 so Applied=no cycles cannot draw.
 * - Love/sting need warmth/drive (0–100 DialState, not in today's DSL).
 *   Missing DialState fails those terms only; watch/lottery still fire.
 *   warmth>=60 = high pole; warmth<=39 = reserved/cold. Neutral 40–59 skip both.
 *
 *   node scripts/undockedEclPool.js
 *   node scripts/undockedEclPool.js --json
 */

const POOL = 'culture.spacemolt-show';

function row(kind, text, weight, conditions) {
  return {
    Kind: 'line',
    PoolKey: POOL,
    Slot: '',
    Text: text,
    Weight: String(weight),
    Conditions: conditions,
    Tags: 'source:media;show:undocked;ecl:kind:' + kind,
    Grain: kind === 'watch' || kind === 'argue' ? 'city' : 'citizen',
    Active: 'yes',
  };
}

const ROWS = [
  // City religion — highest within-key weight. The night belongs to UNDOCKED.
  row('watch', 'the bar went silent for UNDOCKED the way it used to for a late A\'s lead', 1.2, 'undocked=1'),
  row('watch', 'the block put UNDOCKED on and went quiet when the belt haul came up', 1.2, 'undocked=1'),
  row('watch', 'made a night of it for UNDOCKED — chairs in the hallway, someone keeping score on a napkin', 1.15, 'undocked=1'),
  row('watch', 'loved the A\'s on principle and still cleared the night for UNDOCKED', 1.15, 'undocked=1'),
  row('watch', 'heard two strangers on the 12 arguing the dishwasher\'s sell like it was civic business', 1.1, 'undocked=1'),

  row('watch', 'the kids knew Walker\'s name before they knew the mayor\'s', 1.0, 'undocked=1;children>=1'),
  row('watch', 'Jack London pretended it was just another night and then every window had UNDOCKED on', 0.85, 'undocked=1;hood=Jack London'),

  // Argue — still city grain, slightly lower than watch.
  row('argue', 'told the table Walker got robbed by the fuel price and would not hear otherwise', 1.0, 'undocked=1'),
  row('argue', 'spent the walk home insisting the DA should have sold instead of holding', 1.0, 'undocked=1'),
  row('argue', 'got into it over whether Jumper froze or just refused to take the cheap shot', 1.0, 'undocked=1'),
  row('argue', 'said the lottery is the only honest draw in the city and then refused to explain what that meant', 0.95, 'undocked=1'),

  // Love / eternal optimist — warmth high. They root. They believe the dishwasher gets seen.
  row('love', 'cheered the dishwasher like he had already made the paper', 1.0, 'undocked=1;warmth>=60'),
  row('love', 'told anyone who would listen Walker was going to get noticed this time', 1.0, 'undocked=1;warmth>=60'),
  row('love', 'rewound the belt haul on the walk home and smiled at nothing in particular', 0.95, 'undocked=1;warmth>=60'),
  row('love', 'defended the DA\'s hold like it was a long game only a believer could see', 0.9, 'undocked=1;warmth>=60'),

  // Sting / jealousy — warmth low. They think they would fly it better. They do not know why the cameras matter.
  row('sting', 'muttered they could have flown that chair better than the dishwasher', 0.85, 'undocked=1;warmth<=39'),
  row('sting', 'could not watch Walker get the cameras without tasting it', 0.85, 'undocked=1;warmth<=39'),
  row('sting', 'said out loud that some people just get looked at and the rest of us wash dishes', 0.8, 'undocked=1;warmth<=39'),
  row('sting', 'turned UNDOCKED off halfway and then asked who won anyway', 0.8, 'undocked=1;warmth<=39'),

  // Lottery dream — unknown working people. The secret campaign. fame=0 is the 25-bar (engine.68).
  row('lottery', 'kept the secret that they check the UNDOCKED names every cycle the way some people check scores', 1.15, 'undocked=1;fame=0;lifestate=working'),
  row('lottery', 'practiced what they would say if the draw ever landed on them', 1.1, 'undocked=1;fame=0;lifestate=working'),
  row('lottery', 'wondered what it would take to sit that chair for one episode', 1.1, 'undocked=1;fame=0;lifestate=working'),
  row('lottery', 'told nobody they had started practicing a captain voice in the kitchen', 1.0, 'undocked=1;fame=0;lifestate=working'),

  // High-drive unknown — "I would do it better" without needing cold warmth.
  row('lottery', 'caught themselves planning a better episode than Walker\'s while the water ran', 1.05, 'undocked=1;fame=0;drive>=60'),

  // Already-known — they watch as people who have already been looked at.
  row('aspire', 'watched UNDOCKED like someone who already knew what a camera does to a week', 0.75, 'undocked=1;fame>=25'),
];

const HDR = ['Kind', 'PoolKey', 'Slot', 'Text', 'Weight', 'Conditions', 'Tags', 'Grain', 'Active'];
const FOURTH_WALL = /videogame|video game|commander|get_action_log|mcp__|openrouter|spacemolt-lib|FameScore|UsageCount|tier [1-5]/i;
const KINDS = { watch: 0, argue: 0, love: 0, sting: 0, lottery: 0, aspire: 0 };
const BANNED_MECHANISM = /\btier\b|usage count|heritage forever|dialstate|advancement intake/i;

function firstTag(tags) {
  return String(tags || '').split(';')[0].trim();
}

function validateRows(rows) {
  const errors = [];
  Object.keys(KINDS).forEach(function (k) { KINDS[k] = 0; });
  (rows || ROWS).forEach(function (r, i) {
    if (r.Kind !== 'line') errors.push(i + ': Kind');
    if (r.PoolKey !== POOL) errors.push(i + ': PoolKey');
    if (!r.Text) errors.push(i + ': empty Text');
    if (FOURTH_WALL.test(r.Text) || FOURTH_WALL.test(r.Tags)) errors.push(i + ': fourth-wall');
    if (BANNED_MECHANISM.test(r.Text)) errors.push(i + ': names the mechanism');
    if (firstTag(r.Tags) !== 'source:media') errors.push(i + ': first tag must be source:media');
    if (!/^undocked=1/.test(r.Conditions)) errors.push(i + ': undocked=1 required');
    const kind = (r.Tags.match(/ecl:kind:(watch|argue|love|sting|lottery|aspire)/) || [])[1];
    if (!kind) errors.push(i + ': ecl:kind');
    else KINDS[kind]++;
  });
  ['watch', 'argue', 'love', 'sting', 'lottery'].forEach(function (k) {
    if (KINDS[k] < 3) errors.push('need ≥3 ' + k + ' lines');
  });
  const keys = {};
  (rows || ROWS).forEach(function (r) { keys[r.PoolKey] = 1; });
  if (Object.keys(keys).length !== 1) errors.push('exactly one PoolKey — extra keys multiply citywide draw mass');
  return { valid: errors.length === 0, errors: errors };
}

function toTsv(rows) {
  const body = (rows || ROWS).map(function (r) {
    return HDR.map(function (h) { return String(r[h] == null ? '' : r[h]).replace(/\t/g, ' '); }).join('\t');
  });
  return HDR.join('\t') + '\n' + body.join('\n') + '\n';
}

module.exports = { POOL, HDR, ROWS, firstTag, validateRows, toTsv };

if (require.main === module) {
  const v = validateRows(ROWS);
  if (!v.valid) {
    console.error(v.errors.join('\n'));
    process.exit(1);
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(ROWS, null, 2));
  else process.stdout.write(toTsv(ROWS));
}
