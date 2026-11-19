'use strict';
/**
 * engine.350 Task 7 — the content tab's rows read by what they say (builder 2026-11-18, on the rows found
 * reading wrong or thrown away: "Fix it all").
 *
 * Three lists against Event_Content_Ledger, each row named by PoolKey + Text:
 *   RETIRE  Active = no. A scene with nobody the citizen is in it and nothing they did or felt — "a flyer for a
 *           seniors lunch program flutters on a community bulletin board", "a DJ spins records at a crowded bar".
 *           32 of them carried a sign and were written into lives as a step on a dial (the flyer 40 times a
 *           Cycle, sociability up); 40 carried none and were drawn and thrown away, costing the citizen that
 *           line. A hood's mood said in bulletin voice ("West Oakland feels quieter than usual") is not in this
 *           list: it says how the place feels.
 *   RESIGN  the row's dial: tag replaced. The sentence says another dial than the one it carried — a grocery
 *           errand under family, a neighbor helped with boxes under openness.
 *   SIGN    a dial: tag added. Rows with no sign that say something the citizen did or felt: the money rows
 *           (`source:economy` has no kind of its own, so all of them were drawn and thrown away), two night-market
 *           rows, and the ten retirement rows (written until now as a bare PostCareer: family +4, openness +2 —
 *           on "napped through the end of a movie and claimed to have seen it before").
 * Read by two helper agents (output on no sheet), cut by research-build; nothing in a sentence is rewritten.
 *
 *   node scripts/contentTabReads.js                         # validate + dry-run against the live tab
 *   node scripts/contentTabReads.js --sheet <id> [--apply]  # another spreadsheet (the bench)
 *   node scripts/contentTabReads.js --apply                 # write, one batch, read back
 * Plan: docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md Task 7.
 */
const DIALS = ['drive', 'sociability', 'warmth', 'openness', 'composure', 'integrity', 'family', 'outabout', 'fandom'];
const SIGN_RE = /^([a-z]+):(up|down)$/;

// [PoolKey, Text]
const RETIRE = [
  ["sports.citywide", "the chatter at the corner store turns to the A's recent win and the Oaks' pre-season frustrations"],
  ["evening.nightlife", "a DJ spins records at a crowded bar near Broadway, the bassline thumping through the foggy night"],
  ["civic.westOakland", "a line forms outside a small business newly funded by the stabilization fund, the owner handing out samples with a tired smile"],
  ["evening.cityEvent", "the holiday market at Jack London Square is bustling, the scent of roasted chestnuts mingling with the sound of carolers"],
  ["civic.fruitvale", "workers at the transit hub construction site take a break, their laughter echoing under the overpass"],
  ["civic.temescal", "a community meeting at the health center site draws a mix of curious neighbors and vocal critics"],
  ["culture.citywide", "the festival of lights at Lake Merritt draws families bundled in coats, their breath visible in the cold air"],
  ["sports.citywide", "a group of fans huddle under an awning debating last night's game, their voices rising above the sound of rain hitting the pavement"],
  ["sports.fruitvale", "the crowd at the transit hub buzzed about the game long after the final play"],
  ["culture.lakeMerritt", "the lantern parade winds its way around the lake, casting a warm glow"],
  ["sports.eastlake", "a line forms early at the sports bar for the A's game replay"],
  ["evening.nightlife", "the bartender wipes down the counter between rounds of A's highlights"],
  ["civic.downtown", "someone tapes a flyer for the transit hub meeting to a lamppost"],
  ["civic.westOakland", "a stack of stabilization fund applications waits on the community board"],
  ["hood.jackLondon", "a mover's truck idles outside a newly renovated building"],
  ["culture.lakeMerritt", "the scent of incense drifts from the temple doors left ajar"],
  ["evening.cityEvent", "paper lanterns sway over the night market stalls"],
  ["sports.citywide", "the crack of a bat echoes from a nearby screen, drawing a small crowd of pedestrians to pause"],
  ["civic.westOakland", "a stack of Stabilization Fund applications sits on a café counter, waiting to be reviewed"],
  ["evening.downtown", "the clink of glasses and murmur of conversation spills out onto the sidewalk from a packed bar"],
  ["civic.fruitvale", "a group gathers around a transit hub map, pointing and discussing the proposed changes"],
  ["civic.temescal", "a nurse walks briskly toward the new health center, clipboard tucked under her arm"],
  ["culture.citywide", "a flyer for a seniors lunch program flutters on a community bulletin board"],
  ["civic.laurel", "a stack of garbage bags grows at the curb, drawing complaints from passersby"],
  ["sports.eastlake", "a group debates whether to splurge on A's merch after the title win"],
  ["civic.westOakland", "someone pauses to read the stabilization fund notice posted in a cafe window"],
  ["civic.fruitvale", "a commuter glances at the transit hub visioning renderings while waiting for the bus"],
  ["civic.temescal", "a neighbor recommends the new health center to someone clutching a pharmacy bag"],
  ["civic.downtown", "a bartender wipes glasses while half-listening to regulars debate downtown revitalization plans"],
  ["evening.jackLondon", "the bass from a Jack London club vibrates through the sidewalk as a bouncer checks IDs"],
  ["evening.fruitvale", "late-night taco stand customers hover near heat lamps comparing transit hub rumors"],
  ["hood.jackLondon", "a moving van blocks the bike lane as another new resident unboxes in Jack London"],
  ["sports.fruitvale", "a group gathers at a sports bar to watch the Oaks game replay on a fuzzy projector screen"],
  ["civic.westOakland", "a neighbor stops to chat about the stabilization fund disbursement while waiting for the bus"],
  ["evening.jackLondon", "the crowd spills out of a waterfront bar after the Oaks game, laughter mixing with the clink of bottles"],
  ["hood.downtown", "a new mural goes up on a construction barrier, the artist carefully avoiding fresh cement splatters"],
  ["civic.temescal", "someone pauses to read the health center's new hours posted on the community board"],
  ["hood.fruitvale", "a transit worker points out the phase II plans to a curious commuter"],
  ["civic.westOakland", "someone pauses to read the new Stabilization Fund notice before tucking it into their bag"],
  ["evening.fruitvale", "the late-night taco truck line stretches past three storefronts after the game"],
  ["hood.jackLondon", "a couple debates the merits of moving closer to the waterfront as rents climb"],
  ["community.program", "a tutor packs up leftover worksheets after the extended after-school session"],
  ["evening.temescal", "the health center staff unwind at the bar after their first busy week"],
  ["civic.downtown", "a bartender wipes down the counter while discussing the revitalization plans with a regular"],
  ["sports.fruitvale", "a faded A's cap left on the bus seat after the championship parade"],
  ["civic.westOakland", "a stack of stabilization fund applications waiting to be processed at the community center"],
  ["evening.fruitvale", "the smell of late-night tacos mixing with diesel fumes near the transit hub construction"],
  ["civic.temescal", "a handwritten thank you note pinned to the health center's community board"],
  ["hood.jackLondon", "a realtor's sign hammered into fresh sod outside a converted warehouse"],
  ["hood.downtown", "a folded eviction notice tucked between takeout menus in an apartment building lobby"],
  ["evening.kono", "a discarded gallery map stuck to the sidewalk with dried wine"],
  ["civic.rockridge", "the bartender wiping down counters while discussing the stalled train delays with a regular"],
  ["sports.game-night", "the faint hum of game chatter from a nearby apartment"],
  ["civic.infrastructure", "a pothole on Telegraph slowing down morning traffic"],
  ["community.program", "a group of seniors sharing stories at the lunch program"],
  ["civic.transit-hub", "a commuter glancing at the Fruitvale Transit Hub construction site"],
  ["civic.health-center", "a line of patients waiting outside the Temescal Community Health Center"],
  ["civic.stabilization-fund", "a shopkeeper restocking shelves after a busy day"],
  ["culture.city-event", "a couple walking through the Lake Merritt Blossom Walk"],
  ["civic.gridlock", "a frustrated driver honking on I-880 North"],
  ["civic.housing-pressure", "a landlord posting a rent increase notice"],
  ["evening.nightlife", "a DJ spinning records at a packed bar in Jack London"],
  ["sports.game-night", "the faint echo of cheers drifts from a nearby bar as the game plays on"],
  ["civic.gridlock", "a honk breaks the silence as traffic inches forward on I-880"],
  ["evening.nightlife", "a bassline hums through the walls of a dimly lit club in Jack London"],
  ["hood.coliseum", "the faint smell of popcorn lingers in the air near the stadium"],
  ["civic.housing-pressure", "a landlord tapes a rent increase notice to a weathered door in Fruitvale"],
  ["hood.lake-merritt", "a couple walks hand in hand along the water’s edge, the city lights reflecting softly"],
  ["evening.cityEvent", "a vendor hands out flyers for a night market in Temescal"],
  ["culture.city-event", "the sound of laughter and music fills the air at a block party in Rockridge"],
  ["civic.infrastructure", "a worker adjusts a traffic cone near the Fruitvale Transit Hub"],
  ["hood.west-oakland", "a muralist adds the final touches to a new piece on the side of a warehouse"]
];

// [PoolKey, Text, the sign it carries now, the sign the sentence says]
const RESIGN = [
  ["hood.temescal", "walked through the alleyways behind Telegraph to avoid the weekend crowd", "outabout:down", "sociability:down"],
  ["hood.kono", "picked up side dishes at the Korean grocery on Telegraph Avenue", "family:up", "outabout:up"],
  ["hood.kono", "browsed the evening window display at Twentieth Street Gallery off Telegraph", "drive:up", "openness:up"],
  ["hood.brooklyn", "helped a new neighbor carry boxes up to a Basin mid-rise", "openness:up", "warmth:up"],
  ["hood.dimond", "paid cash at the old butcher on the strip out of habit", "family:up", "outabout:up"],
  ["hood.ivy-hill", "bought milk at Ivy Hill Market on the climb home from work", "family:up", "outabout:up"],
  ["hood.chinatown", "squeezed past three-generation tables at Eight Treasures Dim Sum House", "sociability:up", "outabout:up"],
  ["hood.laurel", "picked up a takeout order from the counter at Nino's", "warmth:up", "outabout:up"],
  ["hood.laurel", "waited at the Laurel Cleaners counter while someone hunted for the claim ticket", "drive:down", "composure:down"],
  ["hood.baylight-district", "ate lunch at the burger stand beside the build", "sociability:up", "outabout:up"],
  ["hood.baylight-district", "helped a new neighbor carry boxes into a brand-new unit", "openness:up", "warmth:up"]
];

// [PoolKey, Text, sign] — rows with no sign, drawn and thrown away until now
const SIGN = [
  ["retirement.depth", "called an old coworker just to catch up and talked for an hour", "sociability:up"],
  ["retirement.depth", "reorganized the garage into a system only he understood", "drive:up"],
  ["retirement.depth", "taught a grandchild a card game with rules that changed by round", "family:up"],
  ["retirement.depth", "wrote a letter by hand because email felt like cheating", "warmth:up"],
  ["retirement.depth", "fixed a squeaky hinge that had been squeaking since the kids left home", "drive:up"],
  ["retirement.depth", "swapped seed packets with a neighbor over the fence", "sociability:up"],
  ["retirement.depth", "read the whole paper front to back with coffee going cold beside it", "composure:up"],
  ["retirement.depth", "found an old photograph and spent the afternoon remembering the story behind it", "warmth:up"],
  ["retirement.depth", "cooked a recipe from memory that no one had written down", "family:up"],
  ["retirement.depth", "napped through the end of a movie and claimed to have seen it before", "composure:up"],
  ["econ.tight", "stretched the grocery list across two stores for the better prices", "composure:down"],
  ["econ.tight", "patched a jacket sleeve instead of replacing it and called it fine", "composure:down"],
  ["econ.tight", "split a bill three ways down to the coin and made it work", "composure:down"],
  ["econ.tight", "put half the paycheck toward the past-due notice and breathed easier", "composure:up"],
  ["econ.middle", "weighed a weekend trip against the water heater and picked the water heater", "composure:down"],
  ["econ.middle", "treated the family to takeout on a Friday and called it earned", "family:up"],
  ["econ.middle", "moved money between two accounts to cover a bill without anyone noticing", "composure:down"],
  ["econ.comfortable", "paid a bill early just because the option existed", "composure:up"],
  ["econ.comfortable", "picked the nicer cut of meat without checking the second price tag", "composure:up"],
  ["econ.comfortable", "covered a friend's part of the tab without making it a thing", "warmth:up"],
  ["econ.comfortable", "upgraded a flight seat and didn't think twice about it", "composure:up"],
  ["econ.tight", "calculated the exact total of the groceries before reaching the register to avoid any surprises", "composure:down"],
  ["econ.tight", "ignored the check engine light for another week because rent was due on Tuesday", "composure:down"],
  ["econ.middle", "set up automatic transfers to the savings account and felt briefly like an adult", "drive:up"],
  ["econ.comfortable", "paid for the coffee of the person behind them in line without thinking twice", "warmth:up"],
  ["evening.cityEvent", "wandered through the late-night market stalls, clutching a paper cup of hot tea", "outabout:up"],
  ["evening.downtown", "lined up at the night market stall that always runs out of skewers by 10pm", "outabout:up"]
];

function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

function validate() {
  const errors = [], seen = {};
  const one = function (list, name, signCols) {
    list.forEach(function (e) {
      if (!e[0] || !e[1]) errors.push(name + ' malformed: ' + JSON.stringify(e));
      const k = norm(e[1]);
      if (seen[k]) errors.push('listed twice (' + seen[k] + ', ' + name + '): ' + e[1]);
      seen[k] = name;
      signCols.forEach(function (c) { const m = SIGN_RE.exec(e[c] || ''); if (!m || DIALS.indexOf(m[1]) < 0) errors.push(name + ' bad sign ' + e[c] + ': ' + e[1]); });
    });
  };
  one(RETIRE, 'RETIRE', []); one(RESIGN, 'RESIGN', [2, 3]); one(SIGN, 'SIGN', [2]);
  RESIGN.forEach(function (e) { if (e[2] === e[3]) errors.push('RESIGN to the same sign: ' + e[1]); });
  return { valid: errors.length === 0, errors: errors };
}

/**
 * Lay the lists against a tab read ([header, ...rows]). Pure.
 * @returns {{active: Array, tags: Array, done: number, missing: Array, conflicts: Array}}
 */
function plan(data) {
  const hdr = data[0] || [];
  const iText = hdr.indexOf('Text'), iTags = hdr.indexOf('Tags'), iKey = hdr.indexOf('PoolKey'), iActive = hdr.indexOf('Active');
  if (iText < 0 || iTags < 0 || iKey < 0 || iActive < 0) throw new Error('Event_Content_Ledger missing Text / Tags / PoolKey / Active');
  const rowsByText = {};
  data.slice(1).forEach(function (r, i) { const k = norm(r[iText]); (rowsByText[k] = rowsByText[k] || []).push(i + 2); });
  const out = { active: [], tags: [], done: 0, missing: [], conflicts: [], activeCol: iActive, tagsCol: iTags };
  const find = function (e, name) {
    const hits = (rowsByText[norm(e[1])] || []).filter(function (n) { return String(data[n - 1][iKey]) === e[0]; });
    if (hits.length !== 1) { out[hits.length ? 'conflicts' : 'missing'].push({ list: name, text: e[1], why: hits.length + ' rows in ' + e[0] }); return null; }
    return hits[0];
  };
  const dialTags = function (cell) { return String(cell || '').split(',').map(function (t) { return t.trim(); }).filter(function (t) { return /^dial:/i.test(t); }); };
  RETIRE.forEach(function (e) {
    const n = find(e, 'RETIRE'); if (!n) return;
    if (String(data[n - 1][iActive] || '').trim().toLowerCase() === 'no') { out.done++; return; }
    out.active.push({ row: n, text: e[1], from: data[n - 1][iActive], to: 'no' });
  });
  RESIGN.forEach(function (e) {
    const n = find(e, 'RESIGN'); if (!n) return;
    const cell = String(data[n - 1][iTags] || ''), have = dialTags(cell);
    if (have.length === 1 && have[0] === 'dial:' + e[3]) { out.done++; return; }
    if (have.length !== 1 || have[0] !== 'dial:' + e[2]) { out.conflicts.push({ list: 'RESIGN', text: e[1], why: 'carries ' + (have.join(',') || 'no dial tag') + ', list expects dial:' + e[2] }); return; }
    out.tags.push({ row: n, text: e[1], from: cell, to: cell.split(',').map(function (t) { return t.trim() === 'dial:' + e[2] ? 'dial:' + e[3] : t.trim(); }).filter(Boolean).join(',') });
  });
  SIGN.forEach(function (e) {
    const n = find(e, 'SIGN'); if (!n) return;
    const cell = String(data[n - 1][iTags] || ''), have = dialTags(cell);
    if (have.length === 1 && have[0] === 'dial:' + e[2]) { out.done++; return; }
    if (have.length) { out.conflicts.push({ list: 'SIGN', text: e[1], why: 'already carries ' + have.join(',') }); return; }
    out.tags.push({ row: n, text: e[1], from: cell, to: cell.split(',').map(function (t) { return t.trim(); }).filter(Boolean).concat(['dial:' + e[2]]).join(',') });
  });
  return out;
}

async function main() {
  const v = validate();
  if (!v.valid) throw new Error(v.errors.join('; '));
  console.log('contentTabReads: ' + RETIRE.length + ' rows to switch off, ' + RESIGN.length + ' to re-sign, ' + SIGN.length + ' to sign');
  require('../lib/env');
  const iSheet = process.argv.indexOf('--sheet');
  if (iSheet >= 0) {
    const id = String(process.argv[iSheet + 1] || '');
    if (!id || id.indexOf('--') === 0) throw new Error('--sheet needs a spreadsheet id');
    process.env.GODWORLD_SHEET_ID = id;
  }
  const APPLY = process.argv.includes('--apply');
  const sheets = require('../lib/sheets');
  const p = plan(await sheets.getRawSheetData('Event_Content_Ledger'));
  console.log('tab: Active cells to write ' + p.active.length + ', Tags cells to write ' + p.tags.length + ', already done ' + p.done + ', not on the tab ' + p.missing.length + ', conflicts ' + p.conflicts.length);
  p.missing.forEach(function (m) { console.log('  NOT ON TAB (' + m.list + ', ' + m.why + ') :: ' + m.text); });
  p.conflicts.forEach(function (c) { console.log('  CONFLICT (' + c.list + ') ' + c.why + ' :: ' + c.text); });
  if (!APPLY) {
    p.active.forEach(function (a) { console.log('  R' + a.row + ' off :: ' + a.text); });
    p.tags.forEach(function (t) { console.log('  R' + t.row + ' ' + t.to.split(',').pop() + ' :: ' + t.text); });
    console.log('dry-run — nothing written'); return;
  }
  if (p.conflicts.length || p.missing.length) throw new Error('rows missing or conflicting on the tab — nothing written');
  if (!p.active.length && !p.tags.length) { console.log('nothing to write'); return; }
  const aCol = sheets.columnIndexToLetter(p.activeCol), tCol = sheets.columnIndexToLetter(p.tagsCol);
  await sheets.batchUpdate(p.active.map(function (a) { return { range: 'Event_Content_Ledger!' + aCol + a.row, values: [[a.to]] }; })
    .concat(p.tags.map(function (t) { return { range: 'Event_Content_Ledger!' + tCol + t.row, values: [[t.to]] }; })));
  const after = plan(await sheets.getRawSheetData('Event_Content_Ledger'));
  if (after.active.length || after.tags.length || after.conflicts.length || after.missing.length) throw new Error('read-back: ' + after.active.length + ' Active and ' + after.tags.length + ' Tags cells still to write, ' + after.conflicts.length + ' conflicts');
  console.log('wrote ' + p.active.length + ' Active cells and ' + p.tags.length + ' Tags cells; read back: all ' + after.done + ' rows as listed');
}

if (require.main === module) {
  main().catch(function (err) { console.error(err.message || err); process.exit(1); });
}

module.exports = { RETIRE: RETIRE, RESIGN: RESIGN, SIGN: SIGN, validate: validate, plan: plan, norm: norm };
