'use strict';

/**
 * UNDOCKED ECL pool — culture.spacemolt-pilot FIRST, then culture.spacemolt-show.
 *
 * Live DSL (S376): undocked / undockedpilot are FLAGS (bare, no =1).
 * Tags split on COMMA. First tag MUST be source:undocked (Reputation).
 *
 * Pilots are filtered to source:undocked only. Until these rows exist they
 * stay on the ordinary Oakland pool. Author pilot rows first.
 *
 *   node scripts/undockedEclPool.js
 *   node scripts/undockedEclPool.js --json
 *   node scripts/undockedEclPoolApply.js          # dry-run vs live tab
 *   node scripts/undockedEclPoolApply.js --apply  # append missing Texts
 */

const POOL_PILOT = 'culture.spacemolt-pilot';
const POOL_SHOW = 'culture.spacemolt-show';
const POOL = POOL_SHOW;

function row(pool, kind, text, weight, conditions) {
  return {
    Kind: 'line',
    PoolKey: pool,
    Slot: '',
    Text: text,
    Weight: String(weight),
    Conditions: conditions,
    Tags: 'source:undocked,show:undocked,ecl:kind:' + kind,
    Grain: kind === 'pilot' ? 'citizen' : (kind === 'watch' || kind === 'argue' ? 'city' : 'citizen'),
    Active: 'yes',
  };
}

const PILOT_ROWS = [
  row(POOL_PILOT, 'pilot', 'sat the chair and felt the night get small around the instruments', 1.6, 'undockedpilot'),
  row(POOL_PILOT, 'pilot', 'sold the haul and then watched the tank price sit down on them', 1.55, 'undockedpilot'),
  row(POOL_PILOT, 'pilot', 'held when selling would have been easier and did not explain it to anyone', 1.5, 'undockedpilot'),
  row(POOL_PILOT, 'pilot', 'did not take the cheap shot and knew the hallway would still have an opinion', 1.5, 'undockedpilot'),
  row(POOL_PILOT, 'pilot', 'the belt paid and the chair still felt like a job', 1.45, 'undockedpilot'),
  row(POOL_PILOT, 'pilot', 'came back down and the week was still the flight', 1.45, 'undockedpilot'),
  row(POOL_PILOT, 'pilot', 'tried not to think about the paper while the city was already watching', 1.4, 'undockedpilot;warmth>=60'),
  row(POOL_PILOT, 'pilot', 'was already running the next night in their head before they docked', 1.4, 'undockedpilot;drive>=60'),
];

const SHOW_ROWS = [
  row(POOL_SHOW, 'watch', 'the bar went silent for UNDOCKED the way it used to for a late A\'s lead', 1.2, 'undocked'),
  row(POOL_SHOW, 'watch', 'the block put UNDOCKED on and went quiet when the belt haul came up', 1.2, 'undocked'),
  row(POOL_SHOW, 'watch', 'made a night of it for UNDOCKED — chairs in the hallway, someone keeping score on a napkin', 1.15, 'undocked'),
  row(POOL_SHOW, 'watch', 'loved the A\'s on principle and still cleared the night for UNDOCKED', 1.15, 'undocked'),
  row(POOL_SHOW, 'watch', 'heard two strangers on the 12 arguing the dishwasher\'s sell like it was civic business', 1.1, 'undocked'),
  row(POOL_SHOW, 'watch', 'the kids knew Walker\'s name before they knew the mayor\'s', 1.0, 'undocked;children>=1'),
  row(POOL_SHOW, 'watch', 'Jack London pretended it was just another night and then every window had UNDOCKED on', 0.85, 'undocked;hood=Jack London'),

  row(POOL_SHOW, 'argue', 'told the table Walker got robbed by the fuel price and would not hear otherwise', 1.0, 'undocked'),
  row(POOL_SHOW, 'argue', 'spent the walk home insisting the DA should have sold instead of holding', 1.0, 'undocked'),
  row(POOL_SHOW, 'argue', 'got into it over whether Jumper froze or just refused to take the cheap shot', 1.0, 'undocked'),
  row(POOL_SHOW, 'argue', 'said the lottery is the only honest draw in the city and then refused to explain what that meant', 0.95, 'undocked'),

  row(POOL_SHOW, 'love', 'cheered the dishwasher like he had already made the paper', 1.0, 'undocked;warmth>=60'),
  row(POOL_SHOW, 'love', 'told anyone who would listen Walker was going to get noticed this time', 1.0, 'undocked;warmth>=60'),
  row(POOL_SHOW, 'love', 'rewound the belt haul on the walk home and smiled at nothing in particular', 0.95, 'undocked;warmth>=60'),

  row(POOL_SHOW, 'sting', 'muttered they could have flown that chair better than the dishwasher', 0.85, 'undocked;warmth<=39'),
  row(POOL_SHOW, 'sting', 'could not watch Walker get the cameras without tasting it', 0.85, 'undocked;warmth<=39'),
  row(POOL_SHOW, 'sting', 'said out loud that some people just get looked at and the rest of us wash dishes', 0.8, 'undocked;warmth<=39'),

  row(POOL_SHOW, 'lottery', 'kept the secret that they check the UNDOCKED names every cycle the way some people check scores', 1.15, 'undocked;fame=0;lifestate=working'),
  row(POOL_SHOW, 'lottery', 'practiced what they would say if the draw ever landed on them', 1.1, 'undocked;fame=0;lifestate=working'),
  row(POOL_SHOW, 'lottery', 'wondered what it would take to sit that chair for one episode', 1.1, 'undocked;fame=0;lifestate=working'),
  row(POOL_SHOW, 'lottery', 'caught themselves planning a better episode than Walker\'s while the water ran', 1.05, 'undocked;fame=0;drive>=60'),

  row(POOL_SHOW, 'aspire', 'watched UNDOCKED like someone who already knew what a camera does to a week', 0.75, 'undocked;fame>=25'),
];

const ROWS = PILOT_ROWS.concat(SHOW_ROWS);

const HDR = ['Kind', 'PoolKey', 'Slot', 'Text', 'Weight', 'Conditions', 'Tags', 'Grain', 'Active'];
const FOURTH_WALL = /videogame|video game|commander|get_action_log|mcp__|openrouter|spacemolt-lib|FameScore|UsageCount/i;
const KINDS = { pilot: 0, watch: 0, argue: 0, love: 0, sting: 0, lottery: 0, aspire: 0 };

function firstTag(tags) {
  return String(tags || '').split(',')[0].trim();
}

function validateRows(rows) {
  const errors = [];
  Object.keys(KINDS).forEach(function (k) { KINDS[k] = 0; });
  const list = rows || ROWS;
  if (list.length < 8 || list.slice(0, 8).some(function (r) { return r.PoolKey !== POOL_PILOT; })) {
    errors.push('first 8 rows must be culture.spacemolt-pilot');
  }
  list.forEach(function (r, i) {
    if (r.Kind !== 'line') errors.push(i + ': Kind');
    if (r.PoolKey !== POOL_PILOT && r.PoolKey !== POOL_SHOW) errors.push(i + ': PoolKey');
    if (!r.Text) errors.push(i + ': empty Text');
    if (FOURTH_WALL.test(r.Text) || FOURTH_WALL.test(r.Tags)) errors.push(i + ': fourth-wall');
    if (firstTag(r.Tags) !== 'source:undocked') errors.push(i + ': first tag must be source:undocked');
    if (r.Tags.indexOf(';') >= 0) errors.push(i + ': tags must be comma-split (live loader)');
    if (r.PoolKey === POOL_PILOT && !/(^|;)undockedpilot(;|$)/.test(r.Conditions)) {
      errors.push(i + ': pilot row needs undockedpilot flag');
    }
    if (r.PoolKey === POOL_SHOW && !/(^|;)undocked(;|$)/.test(r.Conditions)) {
      errors.push(i + ': show row needs undocked flag');
    }
    if (/=1/.test(r.Conditions) && /undocked=/.test(r.Conditions)) {
      errors.push(i + ': undocked is a flag — no =1');
    }
    const kind = (r.Tags.match(/ecl:kind:(pilot|watch|argue|love|sting|lottery|aspire)/) || [])[1];
    if (!kind) errors.push(i + ': ecl:kind');
    else KINDS[kind]++;
  });
  if (KINDS.pilot < 6) errors.push('need ≥6 pilot lines (gate is inert until they exist)');
  ['watch', 'argue', 'love', 'sting', 'lottery'].forEach(function (k) {
    if (KINDS[k] < 3) errors.push('need ≥3 ' + k + ' lines');
  });
  return { valid: errors.length === 0, errors: errors };
}

function toTsv(rows) {
  const body = (rows || ROWS).map(function (r) {
    return HDR.map(function (h) { return String(r[h] == null ? '' : r[h]).replace(/\t/g, ' '); }).join('\t');
  });
  return HDR.join('\t') + '\n' + body.join('\n') + '\n';
}

function toSheetValues(rows) {
  return (rows || ROWS).map(function (r) {
    return HDR.map(function (h) { return r[h] == null ? '' : r[h]; });
  });
}

module.exports = {
  POOL, POOL_PILOT, POOL_SHOW, HDR, ROWS, PILOT_ROWS, SHOW_ROWS,
  firstTag, validateRows, toTsv, toSheetValues,
};

if (require.main === module) {
  const v = validateRows(ROWS);
  if (!v.valid) {
    console.error(v.errors.join('\n'));
    process.exit(1);
  }
  if (process.argv.includes('--json')) console.log(JSON.stringify(ROWS, null, 2));
  else process.stdout.write(toTsv(ROWS));
}
