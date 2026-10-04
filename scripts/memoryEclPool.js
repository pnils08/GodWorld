'use strict';
/**
 * engine.94 Track B.2 — memory rows for Event_Content_Ledger.
 *
 * What fires here is the past: every row is gated on one of the B.1 history
 * fields (bereaved / charged / defaulted / rival / hooddeaths / hoodcharged /
 * hoodhospital / hoodclosed — docs/plans/2026-07-31-citizen-memory-perception.md
 * §Track B design). Until B.1 lands in the loader these rows are REJECTED by
 * the live loader (unknown field => skip, S289 fail-closed), which is the
 * intended order: code first, then content.
 *
 * The ruling's test (2026-09-27): a row that only remembers is cut. Every row
 * carries a routing tag that moves a dial through primaryFromTags
 * (generateCitizensEvents.js:804-): memory:strain -> Strain (composure -1),
 * memory:community -> Community (sociability +4, warmth +2),
 * memory:rivalry -> Rivalry (sociability +2, composure -3). The three routing
 * branches are B.2a (engine-sheet, three lines). First tag stays a whitelisted
 * source so the loader accepts the row.
 *
 * BARS ARE PROVISIONAL. Every numeric threshold below is replaced from the
 * post-C110 bench histogram of S.folkMemory before --apply (plan B.2).
 *
 *   node scripts/memoryEclPool.js                    # validate + print
 *   node scripts/undockedEclPoolApply.js --pool memory          # dry-run vs live
 *   node scripts/undockedEclPoolApply.js --pool memory --apply  # append missing
 */
const U = require('./undockedEclPool');
const HDR = U.HDR;
const FOURTH_WALL = /videogame|video game|commander|get_action_log|mcp__|openrouter|spacemolt-lib|FameScore|UsageCount|folkMemory|DialState|World_Config/i;

const ROUTES = { strain: 'memory:strain', community: 'memory:community', rivalry: 'memory:rivalry' };
const FIELDS = /^(bereaved|charged|defaulted|hooddeaths|hoodcharged|hoodhospital|hoodclosed)\s*(<=|>=|<|>|=|!=)\s*\d+$|^rival$/;

function row(pool, route, text, conditions, weight) {
  return {
    Kind: 'line', PoolKey: pool, Slot: '', Text: text, Weight: String(weight || 1),
    Conditions: conditions, Tags: 'source:continuity,' + ROUTES[route] + ',auth:memory-b2',
    Grain: 'citizen', Active: 'yes'
  };
}

// --- the hood remembers --------------------------------------------------
const HOOD = [
  // a loud stretch (charges in the window)
  row('memory.hood.loud', 'strain', 'checked the lock twice, a habit from the spring the block got loud', 'hoodcharged>=3'),
  row('memory.hood.loud', 'strain', 'took the long way past the corner where the cars used to idle', 'hoodcharged>=3'),
  row('memory.hood.loud', 'strain', 'noticed the block had gone quiet again and did not quite trust it', 'hoodcharged>=5'),
  row('memory.hood.loud', 'community', 'stood on the stoop with the neighbors the way the block learned to that bad season', 'hoodcharged>=3; warmth>=55'),
  // the ward filled (hospital rows in the window)
  row('memory.hood.ward', 'strain', 'drove past the hospital and remembered the weeks the parking lot was never empty', 'hoodhospital>=3'),
  row('memory.hood.ward', 'community', 'dropped a plate off at the house that had the long hospital stretch, no note needed', 'hoodhospital>=2'),
  // the block lost someone
  row('memory.hood.loss', 'community', 'left the porch light on for the house that lost someone, the way the whole street had', 'hooddeaths>=1'),
  row('memory.hood.loss', 'community', 'said the name out loud at the counter and nobody had to ask whose', 'hooddeaths>=2'),
  row('memory.hood.loss', 'strain', 'caught the empty chair at the corner table and let the coffee go cold', 'hooddeaths>=1'),
  // shutters (closures in the window)
  row('memory.hood.shutters', 'strain', 'walked past the papered windows and still reached for a door that was not there', 'hoodclosed>=1'),
  row('memory.hood.shutters', 'strain', 'counted the dark storefronts on the block the way other people count stairs', 'hoodclosed>=2'),
  row('memory.hood.shutters', 'community', 'bought the thing from the shop that stayed, on purpose, because the others did not', 'hoodclosed>=1; wealth>=4')
];

// --- the citizen remembers -----------------------------------------------
const OWN = [
  // after the court
  row('memory.own.court', 'strain', 'kept the receipt from the court clerk in the kitchen drawer and did not throw it out', 'charged<=4'),
  row('memory.own.court', 'strain', 'flinched at a siren that was not for anyone, then felt foolish about it', 'charged<=8'),
  row('memory.own.court', 'strain', 'still crosses to the far side of the street from the station, a year on', 'charged>=40; charged<=60'),
  row('memory.own.court', 'community', 'told the story of the court week at dinner and found it had become a funny one', 'charged>=20'),
  // after the default
  row('memory.own.default', 'strain', 'paid in cash and counted it twice, the way the bad year taught', 'defaulted<=12'),
  row('memory.own.default', 'strain', 'opened the bank letter standing up, a habit that outlived the reason for it', 'defaulted>=13; defaulted<=52'),
  row('memory.own.default', 'community', 'marked a year since the debts went and bought the good bread to say so', 'defaulted>=50; defaulted<=53'),
  // after a death in the household
  row('memory.own.grief', 'strain', 'set the second cup out by habit and let it stay', 'bereaved>=6; bereaved<=20'),
  row('memory.own.grief', 'community', 'went to the place they used to go together and found it easier than feared', 'bereaved>=21; bereaved<=49'),
  row('memory.own.grief', 'community', 'lit a candle on the year mark and the neighbors came by without being asked', 'bereaved>=50; bereaved<=53'),
  // a standing rival
  row('memory.own.rival', 'rivalry', 'heard the rival had done well and did not say the first thing that came to mind', 'rival'),
  row('memory.own.rival', 'rivalry', 'took the other route to avoid the one person on the block worth avoiding', 'rival')
];

const ROWS = HOOD.concat(OWN);

function validateRows(rows) {
  const list = rows || ROWS; const errors = [];
  list.forEach(function (r, i) {
    if (r.Kind !== 'line') errors.push(i + ': Kind');
    if (!/^memory\.(hood|own)\.[a-z]+$/.test(r.PoolKey)) errors.push(i + ': PoolKey');
    if (!r.Text) errors.push(i + ': empty Text');
    if (/\d/.test(r.Text)) errors.push(i + ': no numbers in a memory line (canon is color, not a data echo)');
    if (FOURTH_WALL.test(r.Text) || FOURTH_WALL.test(r.Tags)) errors.push(i + ': fourth-wall');
    if (U.firstTag(r.Tags) !== 'source:continuity') errors.push(i + ': first tag must be source:continuity');
    if (r.Tags.indexOf(';') >= 0) errors.push(i + ': tags must be comma-split');
    if (!/memory:(strain|community|rivalry)/.test(r.Tags)) errors.push(i + ': routing tag');
    const terms = String(r.Conditions).split(';').map(function (t) { return t.trim(); });
    const memTerms = terms.filter(function (t) { return FIELDS.test(t); });
    if (!memTerms.length) errors.push(i + ': no memory field in Conditions');
    terms.forEach(function (t) {
      if (!FIELDS.test(t) && !/^(warmth|wealth|drive|age|fandom)\s*(<=|>=|<|>|=|!=)\s*\d+$/.test(t)) errors.push(i + ': unknown term ' + t);
    });
  });
  return { valid: !errors.length, errors: errors, count: list.length };
}

function toSheetValues(rows) {
  return (rows || ROWS).map(function (r) { return HDR.map(function (h) { return r[h] == null ? '' : r[h]; }); });
}

if (require.main === module) {
  const v = validateRows(ROWS);
  ROWS.forEach(function (r) { console.log('[' + r.PoolKey + '] ' + r.Conditions + ' :: ' + r.Text); });
  console.log(v.valid ? ('OK ' + v.count + ' rows') : ('INVALID\n' + v.errors.join('\n')));
  process.exit(v.valid ? 0 : 1);
}

module.exports = { HDR, ROWS, ROUTES, validateRows, toSheetValues, firstTag: U.firstTag };
