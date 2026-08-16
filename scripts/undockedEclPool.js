'use strict';

/**
 * UNDOCKED Phase 2.3 — ECL pool draft (culture.spacemolt-show).
 * Plan: docs/plans/2026-08-07-spacemolt-game-show.md §2.3
 *
 * Disk only. Does not write Event_Content_Ledger. Rows stay fail-closed on
 * today's loader: Conditions use flag `undocked`, which is not in
 * CONTENT_LEDGER_DSL_FIELDS until engine-sheet lands scripts/undockedEclPool.engine.js.
 *
 * First tag is source:media (already whitelisted) so the source check is not
 * a second blocker. Exclusive-pool proving-ground is later, not this file.
 *
 *   node scripts/undockedEclPool.js            # print TSV for es paste
 *   node scripts/undockedEclPool.js --json
 */

const POOL = 'culture.spacemolt-show';

const ROWS = [
  {
    Kind: 'line', PoolKey: POOL, Slot: '',
    Text: 'stayed up for UNDOCKED and argued over whether the dishwasher would sell or sit on the ore',
    Weight: '1', Conditions: 'undocked=1',
    Tags: 'source:media;show:undocked;ecl:kind:watch', Grain: 'city', Active: 'yes',
  },
  {
    Kind: 'line', PoolKey: POOL, Slot: '',
    Text: 'the block put UNDOCKED on and went quiet when the belt haul came up',
    Weight: '1', Conditions: 'undocked=1',
    Tags: 'source:media;show:undocked;ecl:kind:watch', Grain: 'city', Active: 'yes',
  },
  {
    Kind: 'line', PoolKey: POOL, Slot: '',
    Text: 'made a night of it for UNDOCKED — chairs in the hallway, someone keeping score on a napkin',
    Weight: '1', Conditions: 'undocked=1',
    Tags: 'source:media;show:undocked;ecl:kind:watch', Grain: 'city', Active: 'yes',
  },
  {
    Kind: 'line', PoolKey: POOL, Slot: '',
    Text: 'told the table Walker got robbed by the fuel price and would not hear otherwise',
    Weight: '1', Conditions: 'undocked=1',
    Tags: 'source:media;show:undocked;ecl:kind:argue', Grain: 'city', Active: 'yes',
  },
  {
    Kind: 'line', PoolKey: POOL, Slot: '',
    Text: 'spent the walk home insisting the DA should have sold instead of holding',
    Weight: '1', Conditions: 'undocked=1',
    Tags: 'source:media;show:undocked;ecl:kind:argue', Grain: 'city', Active: 'yes',
  },
  {
    Kind: 'line', PoolKey: POOL, Slot: '',
    Text: 'got into it over whether Jumper froze or just refused to take the cheap shot',
    Weight: '1', Conditions: 'undocked=1',
    Tags: 'source:media;show:undocked;ecl:kind:argue', Grain: 'city', Active: 'yes',
  },
  {
    Kind: 'line', PoolKey: POOL, Slot: '',
    Text: 'wondered what it would take to sit that chair for one episode',
    Weight: '1', Conditions: 'undocked=1;lifestate=working',
    Tags: 'source:media;show:undocked;ecl:kind:aspire', Grain: 'citizen', Active: 'yes',
  },
  {
    Kind: 'line', PoolKey: POOL, Slot: '',
    Text: 'caught themselves marking the next UNDOCKED night the way they used to mark a Friday card',
    Weight: '1', Conditions: 'undocked=1',
    Tags: 'source:media;show:undocked;ecl:kind:aspire', Grain: 'citizen', Active: 'yes',
  },
  {
    Kind: 'line', PoolKey: POOL, Slot: '',
    Text: 'told nobody they had started practicing a captain voice in the kitchen',
    Weight: '1', Conditions: 'undocked=1;lifestate=working',
    Tags: 'source:media;show:undocked;ecl:kind:aspire', Grain: 'citizen', Active: 'yes',
  },
];

const HDR = ['Kind', 'PoolKey', 'Slot', 'Text', 'Weight', 'Conditions', 'Tags', 'Grain', 'Active'];
const FOURTH_WALL = /videogame|video game|commander|get_action_log|mcp__|openrouter|spacemolt-lib/i;
const KINDS = { watch: 0, argue: 0, aspire: 0 };

function firstTag(tags) {
  return String(tags || '').split(';')[0].trim();
}

function validateRows(rows) {
  const errors = [];
  KINDS.watch = KINDS.argue = KINDS.aspire = 0;
  (rows || ROWS).forEach(function (r, i) {
    if (r.Kind !== 'line') errors.push(i + ': Kind');
    if (r.PoolKey !== POOL) errors.push(i + ': PoolKey');
    if (!r.Text) errors.push(i + ': empty Text');
    if (FOURTH_WALL.test(r.Text) || FOURTH_WALL.test(r.Tags)) errors.push(i + ': fourth-wall');
    if (firstTag(r.Tags) !== 'source:media') errors.push(i + ': first tag must be source:media');
    if (!/^undocked=1/.test(r.Conditions)) errors.push(i + ': undocked=1 required');
    const kind = (r.Tags.match(/ecl:kind:(watch|argue|aspire)/) || [])[1];
    if (!kind) errors.push(i + ': ecl:kind');
    else KINDS[kind]++;
  });
  ['watch', 'argue', 'aspire'].forEach(function (k) {
    if (KINDS[k] < 3) errors.push('need ≥3 ' + k + ' lines (exclusive-pool floor later)');
  });
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
