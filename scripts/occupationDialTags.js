'use strict';
/**
 * engine.350 Task 7 — the sign of each occupation line on Event_Content_Ledger.
 *
 * A `source:occupation` row is written as a Work line. Until engine.350 every one was a bare Work
 * (drive +4, the size of a hiring) whatever it said; two rows given to anyone wealthy ("badged into
 * the Baylight office early and tried not to think about the protestors from last month", "drank the
 * free cold brew in the company kitchen and felt completely disconnected from the neighborhood
 * outside") were 121 of the 301 Work lines on the ledger after C116. A line moves a dial by what it
 * says (builder 2026-11-16): each row below carries the one dial it moves and which way, read off its
 * text, and the generator writes it Work-<Dial>-<Up|Down>-S (generateCitizensEvents.js
 * GRADED_ONLY_KIND_). null = a bare mention; the row gets no tag and its line is not written.
 *
 * The tag goes on the row's own Tags cell (appended; the first tag stays the source). On the engine
 * before engine.350 a `dial:` tag on a Work row changes nothing (the kind has its own key), so the
 * tab can be tagged ahead of the deploy; the deploy without the tags writes no tab Work line.
 *
 *   node scripts/occupationDialTags.js                    # validate + dry-run against the tab
 *   node scripts/occupationDialTags.js --apply            # write the Tags cells, read back
 *   node scripts/occupationDialTags.js --sheet <id> ...   # another spreadsheet (the bench)
 * Plan: docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md Task 7.
 */

// [PoolKey, Text, sign | null]
const SIGNS = [
  ['work.plumber', 'traced a whistle in the pipes to a loose washer and silenced the whole house', 'drive:up'],
  ['work.plumber', 'kept a spare trap gasket in every pocket and used one before lunch', 'drive:up'],
  ['work.plumber', 'snaked a drain on the first try and didn\'t brag about it, much', 'composure:up'],
  ['work.electrician', 'found the short in a wall switch nobody had touched in years', 'drive:up'],
  ['work.electrician', 'labeled a breaker panel that had been a guessing game since the last owner', 'integrity:up'],
  ['work.electrician', 'double-checked a live wire out of habit and was glad for the habit', 'integrity:up'],
  ['work.electrician', 'pulled copper wire through a Baylight sub-basement until their shoulders burned', 'composure:down'],
  ['work.paramedic', 'restocked the rig at shift change and counted the gauze twice', 'integrity:up'],
  ['work.paramedic', 'talked someone through the worst five minutes of their week in a calm voice', 'warmth:up'],
  ['work.paramedic', 'caught a few hours of sleep on a cot between calls and called it a good night', 'composure:up'],
  ['work.paramedic', 'washed the blood out of the rig at the end of shift and tried not to think about the address', 'composure:down'],
  ['work.theater-director', 'blocked the same scene three ways before the actors found the right one', 'openness:up'],
  ['work.theater-director', 'talked a nervous lead through opening night jitters in the wings', 'warmth:up'],
  ['work.theater-director', 'rewrote a line at intermission because the audience laughed in the wrong place', 'drive:up'],
  ['work.community-organizer', 'counted folding chairs twice before the meeting and set out one more', 'sociability:up'],
  ['work.community-organizer', 'knocked on doors up the block collecting signatures for the petition', 'sociability:up'],
  ['work.community-organizer', 'translated a landlord dispute into three sentences the whole room could rally behind', 'drive:up'],
  ['work.janitor', 'found the one squeaky floor tile again and made a note to fix it', 'integrity:up'],
  ['work.janitor', 'mopped the gym floor into drying stripes and waited by the door', 'composure:up'],
  ['work.janitor', 'restocked the paper towels before the morning rush, like every morning', null],
  ['work.janitor', 'emptied the recycling bins in the Tenth Street Digital office and marveled at what people throw away', 'openness:up'],
  ['work.janitor', 'pushed the wide broom down the school hallway after the bell rang and enjoyed the total silence', 'composure:up'],
  ['work.midwife', 'timed contractions on a stopwatch and kept a steady voice through the loud part', 'composure:up'],
  ['work.midwife', 'packed the birth bag the night before and checked it twice anyway', 'integrity:up'],
  ['work.midwife', 'sat with a nervous mother past the end of the scheduled visit', 'warmth:up'],
  ['work.mover', 'wrapped the good dishes twice and labeled the box in block letters', 'integrity:up'],
  ['work.mover', 'took the stairs with a couch on a dolly and didn\'t scratch the wall', 'drive:up'],
  ['work.mover', 'found a note taped inside a closet from the last family and left it there', 'warmth:up'],
  ['work.physical-therapist', 'counted reps out loud for a knee that was finally bending further', 'warmth:up'],
  ['work.physical-therapist', 'adjusted the resistance band and watched the wince turn into a grin', 'warmth:up'],
  ['work.physical-therapist', 'wrote up a home exercise sheet in handwriting a patient could actually read', 'integrity:up'],
  ['work.immigration-attorney', 'reorganized a client\'s paperwork folder into an order that finally made sense', 'drive:up'],
  ['work.immigration-attorney', 'explained a filing deadline twice, slower the second time, until it landed', 'warmth:up'],
  ['work.immigration-attorney', 'found the missing document in a drawer and called with the good news', 'drive:up'],
  ['work.independent-bookstore-owner', 'handsold a paperback to a stranger who wandered in out of the rain', 'sociability:up'],
  ['work.independent-bookstore-owner', 'rearranged the front table around a book nobody had noticed in months', 'openness:up'],
  ['work.independent-bookstore-owner', 'balanced the till twice and came out three dollars ahead, a mystery', null],
  ['work.elevator-mechanic', 'traced a rattling car to a worn cable guide two floors up', 'drive:up'],
  ['work.elevator-mechanic', 'reset a stuck call button and rode the car down just to be sure', 'integrity:up'],
  ['work.elevator-mechanic', 'carried a bag of relays into a lobby and apologized for the wait', 'warmth:up'],
  ['work.server', 'carried four plates up the arm without a tray and didn\'t spill a drop', 'drive:up'],
  ['work.server', 'remembered a regular\'s order before they finished sitting down', 'warmth:up'],
  ['work.server', 'split a check six ways in her head faster than the register could', 'drive:up'],
  ['work.construction-laborer', 'hauled rebar across a muddy lot before the crew showed up', 'drive:up'],
  ['work.construction-laborer', 'leveled a form twice and got the pour right on the third try', 'drive:up'],
  ['work.construction-laborer', 'swept sawdust into a pile taller than the trash can beside it', null],
  ['work.home-health-aide', 'read the same chapter aloud again because it was the favorite', 'warmth:up'],
  ['work.home-health-aide', 'timed the pills to the minute and wrote the next dose on the calendar', 'integrity:up'],
  ['work.home-health-aide', 'helped with a slow walk to the mailbox and called it the day\'s win', 'warmth:up'],
  ['work.line-cook', 'called back an order over the noise without looking up from the pan', 'drive:up'],
  ['work.line-cook', 'burned a thumb on the flat-top and kept plating anyway', 'drive:up'],
  ['work.line-cook', 'prepped onions until the eyes gave out, then kept going', 'drive:up'],
  ['work.line-cook', 'scraped the flat-top clean at 2 AM and felt the heat radiating through their boots', 'composure:down'],
  ['work.line-cook', 'burned their forearm on a sheet pan and didn\'t even flinch during the dinner rush', 'composure:up'],
  ['work.mechanic', 'found the rattle under the hood was just a loose heat shield', 'drive:up'],
  ['work.mechanic', 'test-drove a car around the block twice to be sure the fix held', 'integrity:up'],
  ['work.mechanic', 'wiped grease off a phone to answer a customer mid-repair', null],
  ['work.mechanic', 'wiped grease off their knuckles and told a customer the transmission was finally shot', 'integrity:up'],
  ['work.trade-union-representative', 'read the new contract line by line before the vote', 'integrity:up'],
  ['work.trade-union-representative', 'sat across the table and didn\'t blink until the safety clause held', 'composure:up'],
  ['work.trade-union-representative', 'walked the floor asking who\'d actually been paid overtime this month', 'integrity:up'],
  ['work.herbalist', 'hung bundles of dried leaves from the rafters to cure', null],
  ['work.herbalist', 'measured out a tincture drop by drop against the afternoon light', 'composure:up'],
  ['work.herbalist', 'traded a jar of tea for a bag of tomatoes and called it even', 'sociability:up'],
  ['work.retail-worker', 'refolded the sweater table for the fourth time before noon', 'drive:down'],
  ['work.retail-worker', 'talked a customer out of the wrong size and into the right one', 'integrity:up'],
  ['work.retail-worker', 'counted the register down to the penny at closing', 'integrity:up'],
  ['work.barista', 'drew a leaf in the foam that actually looked like a leaf', 'drive:up'],
  ['work.barista', 'remembered the regular\'s order before he reached the counter', 'warmth:up'],
  ['work.barista', 'restocked the syrup pumps during the one quiet minute of the shift', null],
  ['work.nonprofit-executive-director', 'rewrote the grant narrative for the third funder this month', 'drive:down'],
  ['work.nonprofit-executive-director', 'moved a line item from paper clips to payroll and made it work', 'drive:up'],
  ['work.nonprofit-executive-director', 'sat through a budget meeting that ran long and left with a plan anyway', 'composure:up'],
  ['work.disability-rights-advocate', 'walked a new curb cut with a tape measure and flagged the slope', 'integrity:up'],
  ['work.disability-rights-advocate', 'sat beside a witness at the hearing and passed notes on what to say next', 'warmth:up'],
  ['work.disability-rights-advocate', 'drafted a complaint letter that used the word \'access\' eleven times on purpose', 'drive:up'],
  ['work.security-guard', 'walked the same loop past midnight and noticed the light that was finally fixed', 'composure:up'],
  ['work.security-guard', 'logged a delivery truck in and out and waved at the driver by name', 'sociability:up'],
  ['work.security-guard', 'checked a door that was locked the first time, locked it again anyway', 'integrity:up'],
  ['work.security-guard', 'walked the perimeter of the Baylight site at 3 AM and checked the locks on the heavy equipment', 'integrity:up'],
  ['work.taxi-driver', 'took the long way once to avoid the backed-up bridge and explained why', 'integrity:up'],
  ['work.taxi-driver', 'kept a stack of singles for change and never once came up short', 'integrity:up'],
  ['work.taxi-driver', 'learned a fare\'s whole week from the back seat in under ten minutes', 'sociability:up'],
  ['work.construction', 'watched the marine layer roll in below the crane cab and felt entirely isolated from the city', 'sociability:down'],
  ['work.bakery-worker', 'tossed the day-old loaves into the donation bins knowing exactly where they were headed', 'warmth:up'],
  ['work.bartender', 'cut someone off at the bar and smoothly handed them a glass of water before they could argue', 'composure:up'],
  ['work.journalist', 'filed the copy for the Tribune from a coffee shop and immediately started chasing the next lead', 'drive:up'],
  ['work.tech', 'badged into the Baylight office early and tried not to think about the protestors from last month', 'composure:down'],
  ['work.tech', 'drank the free cold brew in the company kitchen and felt completely disconnected from the neighborhood outside', 'sociability:down'],
  ['civic.temescal', 'walked past the health center construction site, noting the steel beams rising faster than expected', 'outabout:up'],
  ['occupation.transit', 'lost an hour of the morning to the transit shutdown', 'composure:down'],
  ['occupation.transit', 'waited out the delays with everyone else on the platform', 'composure:down'],
  ['occupation.transit', 'gave up on the train and found another way in to work', 'drive:up'],
  ['occupation.transit', 'was late to a shift when the line went down', 'composure:down'],
  ['occupation.transit', 'stood on the platform watching the arrival board add minutes instead of taking them away', 'composure:down'],
  ['occupation.transit', 'got wedged against the doors for three stops when the delayed train finally came in packed', 'composure:down'],
  ['occupation.transit', 'texted the boss a photo of the platform crowd instead of an excuse', 'composure:up'],
  ['occupation.transit', 'shared a rideshare with two strangers from the same stalled platform', 'sociability:up'],
  ['occupation.transit', 'walked the last stretch to work after the train held between stations', 'drive:up'],
  ['occupation.transit', 'learned the name of the regular who always stands by the same pillar, waiting out the same delay', 'sociability:up'],
  // not a line about the citizen ("<name> the bartender wiping down counters …"): no sign, not written
  ['civic.rockridge', 'the bartender wiping down counters while discussing the stalled train delays with a regular', null]
];

const DIALS = ['drive', 'sociability', 'warmth', 'openness', 'composure', 'integrity', 'family', 'outabout', 'fandom'];
const SIGN_RE = /^([a-z]+):(up|down)$/;

function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

function validate() {
  const errors = [], seen = {};
  SIGNS.forEach(function (s) {
    if (s.length !== 3 || !s[0] || !s[1]) errors.push('malformed entry: ' + JSON.stringify(s));
    if (seen[norm(s[1])]) errors.push('listed twice: ' + s[1]);
    seen[norm(s[1])] = true;
    if (s[2] !== null) {
      const m = SIGN_RE.exec(s[2]);
      if (!m || DIALS.indexOf(m[1]) < 0) errors.push('bad sign ' + s[2] + ': ' + s[1]);
    }
  });
  return { valid: errors.length === 0, errors: errors };
}

function counts() {
  const c = { up: 0, down: 0, plain: 0, byDial: {} };
  SIGNS.forEach(function (s) {
    if (s[2] === null) { c.plain++; return; }
    const m = SIGN_RE.exec(s[2]);
    c[m[2]]++;
    c.byDial[m[1]] = c.byDial[m[1]] || [0, 0];
    c.byDial[m[1]][m[2] === 'up' ? 0 : 1]++;
  });
  return c;
}

/**
 * The Tags cell a row should hold. Pure.
 * @returns {{tags: string, change: boolean, conflict: string}} conflict = a dial: tag already there that is not ours
 */
function tagsFor(current, sign) {
  const parts = String(current || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
  const have = parts.filter(function (t) { return /^dial:/i.test(t); });
  if (sign === null) return { tags: parts.join(','), change: false, conflict: have.length ? have.join(',') : '' };
  const want = 'dial:' + sign;
  if (have.length === 1 && have[0] === want) return { tags: parts.join(','), change: false, conflict: '' };
  if (have.length) return { tags: parts.join(','), change: false, conflict: have.join(',') };
  return { tags: parts.concat([want]).join(','), change: true, conflict: '' };
}

/**
 * Lay the list against a tab read ([header, ...rows]). Pure.
 * @returns {{todo: Array, unlisted: Array, notOnTab: Array, conflicts: Array, tagged: number, plain: number}}
 */
function plan(data) {
  const hdr = data[0] || [];
  const iText = hdr.indexOf('Text'), iTags = hdr.indexOf('Tags'), iKey = hdr.indexOf('PoolKey'), iActive = hdr.indexOf('Active');
  if (iText < 0 || iTags < 0 || iKey < 0) throw new Error('Event_Content_Ledger missing Text / Tags / PoolKey');
  const byText = {};
  SIGNS.forEach(function (s) { byText[norm(s[1])] = s; });
  const out = { todo: [], unlisted: [], notOnTab: [], conflicts: [], tagged: 0, plain: 0, tagsCol: iTags };
  const met = {};
  data.slice(1).forEach(function (r, i) {
    const tags = String(r[iTags] || '');
    if (!/(^|,)\s*source:occupation\s*(,|$)/.test(tags)) return;
    if (iActive >= 0 && String(r[iActive] || '').trim().toLowerCase() === 'no') return;
    const s = byText[norm(r[iText])];
    if (!s) { out.unlisted.push({ row: i + 2, poolKey: r[iKey], text: r[iText] }); return; }
    met[norm(s[1])] = true;
    const t = tagsFor(tags, s[2]);
    if (t.conflict) { out.conflicts.push({ row: i + 2, text: r[iText], has: t.conflict, want: s[2] }); return; }
    if (t.change) out.todo.push({ row: i + 2, text: r[iText], from: tags, to: t.tags });
    else if (s[2] === null) out.plain++;
    else out.tagged++;
  });
  SIGNS.forEach(function (s) { if (!met[norm(s[1])]) out.notOnTab.push(s[1]); });
  return out;
}

async function main() {
  const v = validate();
  if (!v.valid) throw new Error(v.errors.join('; '));
  const c = counts();
  console.log('occupationDialTags: ' + SIGNS.length + ' rows — ' + c.up + ' up, ' + c.down + ' down, ' + c.plain + ' plain; by dial ' + JSON.stringify(c.byDial));

  require('../lib/env');
  const iSheet = process.argv.indexOf('--sheet');
  if (iSheet >= 0) {
    const id = String(process.argv[iSheet + 1] || '');
    if (!id || id.indexOf('--') === 0) throw new Error('--sheet needs a spreadsheet id');
    process.env.GODWORLD_SHEET_ID = id;
  }
  const APPLY = process.argv.includes('--apply');
  const sheets = require('../lib/sheets');
  const data = await sheets.getRawSheetData('Event_Content_Ledger');
  const p = plan(data);
  console.log('tab rows ' + (data.length - 1) + ': to tag ' + p.todo.length + ', already tagged ' + p.tagged + ', plain ' + p.plain +
    ', on the tab but not listed ' + p.unlisted.length + ', listed but not on the tab ' + p.notOnTab.length + ', conflicts ' + p.conflicts.length);
  p.unlisted.forEach(function (u) { console.log('  UNLISTED R' + u.row + ' ' + u.poolKey + ' :: ' + u.text); });
  p.notOnTab.forEach(function (t) { console.log('  NOT ON TAB :: ' + t); });
  p.conflicts.forEach(function (x) { console.log('  CONFLICT R' + x.row + ' has ' + x.has + ', list says ' + x.want + ' :: ' + x.text); });
  if (!APPLY) { p.todo.forEach(function (t) { console.log('  R' + t.row + ' ' + t.to.split(',').pop() + ' :: ' + t.text); }); console.log('dry-run — nothing written'); return; }
  if (p.conflicts.length) throw new Error('conflicting dial tags on the tab — nothing written');
  if (!p.todo.length) { console.log('nothing to write'); return; }

  const col = sheets.columnIndexToLetter(p.tagsCol);
  await sheets.batchUpdate(p.todo.map(function (t) { return { range: 'Event_Content_Ledger!' + col + t.row, values: [[t.to]] }; }));
  const after = plan(await sheets.getRawSheetData('Event_Content_Ledger'));
  if (after.todo.length || after.conflicts.length) throw new Error('read-back: ' + after.todo.length + ' rows still untagged, ' + after.conflicts.length + ' conflicts');
  console.log('wrote ' + p.todo.length + ' Tags cells; read back: tagged ' + after.tagged + ', plain ' + after.plain);
}

if (require.main === module) {
  main().catch(function (err) { console.error('occupationDialTags: ' + err.message); process.exit(1); });
}

module.exports = { SIGNS: SIGNS, validate: validate, counts: counts, tagsFor: tagsFor, plan: plan, norm: norm };
