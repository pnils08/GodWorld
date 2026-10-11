'use strict';
/**
 * engine.286 Task 2 — life-event lines (promotion + home kinds) for Event_Content_Ledger.
 *
 * Builder rulings 2026-10-11 (plan §Rulings R1/R5 + the four Task 2 calls): promotion and
 * home first, both sides of the die, rare at the large end, text follows weight.
 *
 * Pool keys (twelve): lifeEvent.<promotion|home>.<up|down>[.M|.L]. The unbanded key is the
 * small / default pool. Draw rules carry over from civicRole (urn per key, banded key first).
 *
 * Render formats (es, 2026-10-11) — the L lines ARE the writer's own line:
 *   promotion.up.L   — stampPromotion_: "[Promotion] " + VERB + " after N years as a/an <RoleType>."
 *                      → a verb phrase that reads before " after N years as a Nurse."; NO final period.
 *   promotion.down.L — careerRecordLayoff_: "[Career-Layoff] " + TEXT verbatim → a full sentence.
 *   home.up.L        — "[LifeEvent-Home-Up-L] " + TEXT + " — $N down on $P"  → no final period.
 *   home.down.L      — "[LifeEvent-Home-Down-L] " + TEXT + " — $N back from the sale" → no final period;
 *                      reads as having to sell and rent in the same hood.
 *   S / M            — "[LifeEvent-<Kind>-<Up|Down>-<S|M>] " + TEXT verbatim.
 * Fill tokens: {hood} on every key; {employer} on lifeEvent.promotion.* only. No `$` (loader drops it).
 *
 * Depth follows demand at the ruled seeds (fire .05, up .6, M .08, L .01): promotion S ≈ 12 up /
 * 8 down a Cycle over 426 eligible → S 20 each; M 10; L 6. Home S ≈ 4 a Cycle → 14 / 8 / 6.
 *
 *   node scripts/lifeEventEclPool.js                              # validate + print
 *   node scripts/undockedEclPoolApply.js --pool lifeEvent          # dry-run vs live
 *   node scripts/undockedEclPoolApply.js --pool lifeEvent --apply  # append missing
 */
const U = require('./undockedEclPool');
const HDR = U.HDR;
const FOURTH_WALL = /videogame|video game|commander|get_action_log|mcp__|openrouter|spacemolt-lib|FameScore|UsageCount|DialState|World_Config|POP-\d|Tier \d/i;
const KINDS = ['promotion', 'home'];
const KEYS = [];
KINDS.forEach(function (k) { ['up', 'down'].forEach(function (d) { ['', '.M', '.L'].forEach(function (b) { KEYS.push('lifeEvent.' + k + '.' + d + b); }); }); });
const TAGS = 'source:lifeEvent,auth:lifeEvent-t2';

function pool(key, texts) {
  return texts.map(function (t) {
    return { Kind: 'line', PoolKey: key, Slot: '', Text: t, Weight: '1', Conditions: '', Tags: TAGS, Grain: 'citizen', Active: 'yes' };
  });
}

const ROWS = [].concat(
  // ======================= PROMOTION =======================
  // S up — a good sign at work; no title, no money claimed.
  pool('lifeEvent.promotion.up', [
    'A manager at {employer} stopped by their desk to say the last stretch of work had not gone unnoticed.',
    'Got the shift at {employer} everyone wants, and nobody argued.',
    'A client thanked them by name in front of the whole floor at {employer}.',
    'Was asked to run the morning meeting at {employer} while the lead was out.',
    'A coworker at {employer} said the new hires keep getting pointed their way for answers.',
    'Finished the week at {employer} with the hardest account on the floor squared away.',
    'A supervisor at {employer} asked what they want next, and seemed to mean it.',
    'Their name came up in a good way at the {employer} staff meeting.',
    'Trained the new person at {employer} and heard afterward it was the best onboarding in years.',
    'A regular at {employer} asked for them specifically.',
    'Got pulled into a bigger conversation at {employer} than the job description covers.',
    'The schedule at {employer} came out with their name in the slot that used to belong to someone senior.',
    'A quiet nod from the owner at {employer} on the way out, the kind that means something.',
    'Closed out a problem at {employer} that had been open since before they started.',
    'A manager at {employer} forwarded their write-up upstairs with a note that said look at this.',
    'The {hood} commute felt short this week; work at {employer} is going well and they know it.',
    'A colleague at {employer} said the team runs smoother on their days.',
    'Was handed the keys at {employer} to open on their own for the first time.',
    'Someone from another team at {employer} asked if they would ever consider moving over.',
    'Left {employer} on Friday with a thank-you from the person whose job they covered all week.'
  ]),
  // S down — a cold sign at work; no money, no title claimed.
  pool('lifeEvent.promotion.down', [
    'A review at {employer} landed cooler than the work deserved.',
    'The project they built at {employer} was handed to someone else without a word.',
    'A coworker at {employer} with less time in got the assignment they had asked about.',
    'The schedule at {employer} came out and their good shift was gone.',
    'A manager at {employer} walked past three times and did not stop once.',
    'Talk of a reorganization at {employer} ran through the floor all week.',
    'Sat through a meeting at {employer} where every idea was theirs and none had their name on it.',
    'The new lead at {employer} does not know what they do yet, and did not ask.',
    'A client at {employer} asked for someone more senior.',
    'The {hood} commute felt long this week; work at {employer} is not what it was.',
    'An email at {employer} about priorities did not mention their team.',
    'Covered for a coworker at {employer} for a week and heard nothing about it.',
    'The owner at {employer} is talking about tightening up, and everyone heard it.',
    'A raise cycle at {employer} came and went without a conversation.',
    'Was left off the invite at {employer} for the meeting about their own account.',
    'A supervisor at {employer} corrected them in front of a customer.',
    'Someone at {employer} is being groomed for the next step up, and it is not them.',
    'The {employer} break room went quiet when the budget came up.',
    'A manager at {employer} asked them to redo work that had already been approved.',
    'Heard secondhand that the opening at {employer} they wanted had been filled from outside.'
  ]),
  // M up — a real shot: the citizen's own small roll at the writer. Reads as a chance, not a done deal.
  pool('lifeEvent.promotion.up.M', [
    'A manager at {employer} put their name forward for the open lead role.',
    'Was asked to interview at {employer} for the step up, with the decision due in a few weeks.',
    'The owner at {employer} said a bigger job is opening and asked if they wanted to be considered.',
    'A supervisor at {employer} said a raise is on the table if the next stretch goes the way the last one did.',
    'Got the trial run at {employer}: acting lead for the month, with the real title in play.',
    'A director at {employer} asked for a meeting about their future, and it was a good one.',
    'Their name is one of two at {employer} for the position everyone has been talking about.',
    'A client at {employer} asked that they be put in charge of the account, and the request went upstairs.',
    'The lead at {employer} is leaving and told them privately to go for it.',
    'A manager at {employer} said the budget for a senior slot cleared and they are first in line to make the case.'
  ]),
  // M down — a real risk to prospects; no income change claimed.
  pool('lifeEvent.promotion.down.M', [
    'Was put on a performance plan at {employer} with a date on it.',
    'The team at {employer} is under review and everyone has been told to document their week.',
    'A manager at {employer} said the raise conversation is off for now.',
    'Their role at {employer} is being redefined, and the new description is thinner.',
    'A consultant walked the floor at {employer} with a clipboard and did not introduce himself.',
    'Was told at {employer} that the lead role they wanted is being filled from outside.',
    'The account they ran at {employer} was moved to another office.',
    'A supervisor at {employer} asked them to train their replacement for a shift they still hold.',
    'The owner at {employer} said hours are being looked at across the board.',
    'A director at {employer} said the department is consolidating and nothing is decided.'
  ]),
  // L up — VERB PHRASE for stampPromotion_: reads before " after N years as a <RoleType>." NO final period.
  pool('lifeEvent.promotion.up.L', [
    'Promoted at {employer}',
    'Moved up at {employer}',
    'Stepped into the bigger job at {employer}',
    'Took the step up at {employer}',
    'Earned the senior title at {employer}',
    'Got the nod for the lead role at {employer}'
  ]),
  // L down — TEXT verbatim for careerRecordLayoff_: a full sentence.
  pool('lifeEvent.promotion.down.L', [
    'Let go as {employer} pulled back.',
    'Laid off from {employer} when the department was cut.',
    'Lost the job at {employer}; the position was eliminated.',
    'Walked out of {employer} with a box and a last check.',
    'Let go from {employer} in a round of cuts that took half the floor.',
    'Told at {employer} that the role was ending, effective now.'
  ]),
  // ======================= HOME =======================
  // S up — a renting household's small hope; no purchase.
  pool('lifeEvent.home.up', [
    'Walked through an open house in {hood} and did not laugh at the price.',
    'Ran the numbers on a place in {hood} at the kitchen table and they almost worked.',
    'A unit in their {hood} building went up for sale and they found themselves reading the listing twice.',
    'A friend in {hood} who just bought said it was less impossible than it looked.',
    'Started a folder for a down payment and put the first real number in it.',
    'Drove past a house in {hood} with a sign in the yard and slowed down.',
    'A lender in {hood} said the word pre-approval and nobody flinched.',
    'The rent in {hood} went up again and for the first time that felt like an argument for buying.',
    'Spent a Sunday at open houses in {hood} and came home talking about one of them.',
    'A coworker said a {hood} seller might take an offer before listing, and they wrote the address down.',
    'Saved more this month than planned and the house talk at dinner got specific.',
    'A neighbor in {hood} is selling to family and asked if they knew anyone, and they said maybe us.',
    'Looked at the {hood} market numbers and the gap had narrowed.',
    'Walked the block in {hood} they would buy on, if they bought.'
  ]),
  // S down — a stretched owner's small worry; no sale.
  pool('lifeEvent.home.down', [
    'The property tax notice for the {hood} house sat on the counter for three days before anyone opened it.',
    'A roofer in {hood} gave an estimate and it was a conversation.',
    'The mortgage statement for the {hood} place arrived and the kitchen went quiet.',
    'A neighbor in {hood} sold under asking and everyone on the block did the math.',
    'Put off the furnace repair on the {hood} house one more month.',
    'The {hood} house needs a thing fixed that is not getting fixed this month.',
    'Moved money between accounts to cover the {hood} payment and did not mention it.',
    'The insurance on the {hood} house went up and the renewal letter was long.',
    'A contractor in {hood} said the word foundation and left a card.',
    'Skipped the weekend out to make the {hood} payment with room to spare.',
    'Looked up what the {hood} house would list for, and closed the tab.',
    'The water heater in the {hood} house is on borrowed time and so is the budget.',
    'A bank letter about the {hood} mortgage came with a phone number and a deadline.',
    'The {hood} house feels like the biggest thing they own and the heaviest.'
  ]),
  // M up — a real break: the buying roll tripled this Cycle. Reads as a chance.
  pool('lifeEvent.home.up.M', [
    'The landlord in {hood} offered to sell them the unit before putting it on the market.',
    'A seller in {hood} pulled the listing and offered the house to them first.',
    'A lender in {hood} came back with a number that made the house they wanted reachable.',
    'A relative offered to help with the down payment on a place in {hood}, and meant it.',
    'The {hood} house they had watched for months dropped its price to within reach.',
    'An owner in {hood} who is moving away asked if they wanted the place at a fair number, no agents.',
    'A {hood} building went condo and the tenants got first right at the inside price.',
    'The seller of a {hood} house they loved said yes to a lower number than they had dared.'
  ]),
  // M down — the buying roll is zero this Cycle / a stretched owner's real scare.
  pool('lifeEvent.home.down.M', [
    'The bank called about the {hood} mortgage and used the word delinquent.',
    'The tax bill on the {hood} house arrived with a penalty attached.',
    'An appraisal on the {hood} house came in below what they owe.',
    'A letter about the {hood} mortgage set a date, and the date is soon.',
    'The {hood} house needs a repair that costs more than they have, and it cannot wait.',
    'Sat down with a counselor in {hood} about the mortgage and left with a folder.',
    'The {hood} payment went out late for the first time.',
    'A relative who had been helping with the {hood} house said they cannot anymore.'
  ]),
  // L up — TEXT + " — $N down on $P"; no final period. Bought in their own hood.
  pool('lifeEvent.home.up.L', [
    'Closed on a house in {hood}',
    'Bought the place in {hood} and got the keys',
    'Signed for a home in {hood}, the first with their name on the deed',
    'Put a down payment on a house in {hood} and moved the boxes in',
    'Became an owner in {hood}',
    'Closed on a home in {hood} after years of renting'
  ]),
  // L down — TEXT + " — $N back from the sale"; no final period. Sold and renting in the same hood.
  pool('lifeEvent.home.down.L', [
    'Sold the house in {hood} and signed a lease three blocks over',
    'Had to sell the place in {hood}; renting in the same neighborhood now',
    'Let the house in {hood} go and moved into a rental down the street',
    'Sold up in {hood} to get out from under the payments and rented nearby',
    'Gave up the deed in {hood} and kept the neighborhood, renting',
    'Sold the home in {hood} before the bank made the decision for them'
  ])
);

function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

function validateRows(rows) {
  const list = rows || ROWS; const errors = []; const seen = {};
  list.forEach(function (r, i) {
    const k = r.PoolKey, t = String(r.Text || '');
    if (r.Kind !== 'line') errors.push(i + ': Kind');
    if (KEYS.indexOf(k) < 0) errors.push(i + ': PoolKey ' + k + ' not one of the twelve keys');
    if (!t) errors.push(i + ': empty Text');
    if (/\$/.test(t)) errors.push(i + ': `$` in Text — the loader drops it');
    if (/\{(?!hood\}|employer\})/.test(t)) errors.push(i + ': only {hood} and {employer} are filled');
    if (/\{employer\}/.test(t) && k.indexOf('lifeEvent.promotion.') !== 0) errors.push(i + ': {employer} only on promotion keys');
    if (String(r.Conditions || '').trim()) errors.push(i + ': Conditions must be empty');
    if (FOURTH_WALL.test(t) || FOURTH_WALL.test(r.Tags)) errors.push(i + ': fourth-wall');
    if (U.firstTag(r.Tags) !== 'source:lifeEvent') errors.push(i + ': first tag must be source:lifeEvent');
    if (r.Tags.indexOf(';') >= 0) errors.push(i + ': tags must be comma-split');
    if (!(Number(r.Weight) > 0)) errors.push(i + ': Weight');
    // render-format contracts (es 2026-10-11)
    if (k === 'lifeEvent.promotion.up.L' && /[.!?]$/.test(t)) errors.push(i + ': promotion.up.L is a verb phrase — no final period (stampPromotion_ appends " after N years as a <RoleType>.")');
    if (k === 'lifeEvent.promotion.up.L' && !/\{employer\}$/.test(t)) errors.push(i + ': promotion.up.L must end at {employer} so " after N years as a <RoleType>." reads');
    if (k === 'lifeEvent.promotion.down.L' && !/[.!?]$/.test(t)) errors.push(i + ': promotion.down.L is a full sentence (rendered verbatim)');
    if (/^lifeEvent\.home\.(up|down)\.L$/.test(k) && /[.!?]$/.test(t)) errors.push(i + ': home L lines take " — $N …" after them — no final period');
    if (/^lifeEvent\.home\./.test(k) && !/\{hood\}/.test(t) && /\.L$/.test(k)) errors.push(i + ': home L lines name the hood (same-hood buy / sell)');
    if (/^lifeEvent\.(promotion|home)\.(up|down)(\.M)?$/.test(k) && !/[.!?]$/.test(t)) errors.push(i + ': S/M lines are full sentences');
    const n = norm(t);
    if (seen[n]) errors.push(i + ': duplicate Text — ' + t);
    seen[n] = true;
  });
  return { valid: !errors.length, errors: errors, count: list.length };
}

function toSheetValues(rows) {
  return (rows || ROWS).map(function (r) { return HDR.map(function (h) { return r[h] == null ? '' : r[h]; }); });
}

function counts(rows) {
  const c = {};
  (rows || ROWS).forEach(function (r) { c[r.PoolKey] = (c[r.PoolKey] || 0) + 1; });
  return c;
}

if (require.main === module) {
  const v = validateRows(ROWS);
  const c = counts(ROWS);
  KEYS.forEach(function (k) { console.log(k + ' ' + (c[k] || 0)); });
  console.log(v.valid ? ('OK ' + v.count + ' rows') : ('INVALID\n' + v.errors.join('\n')));
  process.exit(v.valid ? 0 : 1);
}

module.exports = { HDR, KEYS, ROWS, validateRows, toSheetValues, counts, firstTag: U.firstTag };
