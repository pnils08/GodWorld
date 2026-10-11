'use strict';
/**
 * engine.286 Task 6 — civic role hood lines for Event_Content_Ledger.
 *
 * Builder 2026-10-11: "lean on the ECL to diversify this list and make it so these
 * would only duplicate on purpose not for a lack of options." The 33 hardcoded
 * sentences in phase05-citizens/runCivicRoleEngine.js CIVIC_ROLE_TEXT_ are
 * re-authored here (an ECL pool replaces the hardcoded pool per key, all or
 * nothing — civicRolePickText_), then widened.
 *
 * Pool keys: civicRole.<premise>.<up|down>, premise in business / closure /
 * safety / initiative / mood / everyday. closure.up is unreachable (a closure
 * always leans down; an up draw renders everyday) — no rows. Eleven live keys.
 *
 * Why everyday is the biggest: runCivicRoleEngine.js:338 sends every draw that
 * goes against its premise (an up roll in a slow-business hood, a down roll
 * where crime is falling) to everyday, and everyday is a candidate in every hood
 * while the premise pools only appear in the outer-third hoods. Everyday carries
 * most of the ~19 fires a Cycle (0.35 × 53 CIV).
 *
 * What the engine reads (civicRoleEclLines_): Text (no `$`), Weight, and it
 * DROPS any row with Conditions — so Conditions stay empty here. `{hood}` is
 * filled with the citizen's neighborhood. Weight is the "on purpose" lever: a
 * line meant to recur gets 2 or 3; everything here is 1.
 *
 * Register: third person (them / they), the official's own hood, a lift or an
 * obstacle. Never a vote, scandal, resignation, office action or construction
 * completion — those belong to civic-mode and the office ledger.
 *
 *   node scripts/civicRoleEclPool.js                              # validate + print
 *   node scripts/undockedEclPoolApply.js --pool civicRole          # dry-run vs live
 *   node scripts/undockedEclPoolApply.js --pool civicRole --apply  # append missing
 */
const U = require('./undockedEclPool');
const HDR = U.HDR;
const FOURTH_WALL = /videogame|video game|commander|get_action_log|mcp__|openrouter|spacemolt-lib|FameScore|UsageCount|DialState|World_Config|POP-\d/i;
// Office facts the civic role engine must never narrate (plan Task 6 (f), T6-5).
const OFFICE_FACT = /\b(vote[sd]?|voting|ballot|scandal|resign\w*|elect\w*|ordinance|council (vote|meeting|chamber)|approval rating|ribbon[- ]cutting|grand opening)\b/i;
const KEYS = [
  'civicRole.business.up', 'civicRole.business.down',
  'civicRole.closure.down',
  'civicRole.safety.up', 'civicRole.safety.down',
  'civicRole.initiative.up', 'civicRole.initiative.down',
  'civicRole.mood.up', 'civicRole.mood.down',
  'civicRole.everyday.up', 'civicRole.everyday.down'
];
const TAGS = 'source:civicRole,auth:civicRole-t6';

function pool(key, texts) {
  return texts.map(function (t) {
    return { Kind: 'line', PoolKey: key, Slot: '', Text: t, Weight: '1', Conditions: '', Tags: TAGS, Grain: 'citizen', Active: 'yes' };
  });
}

const ROWS = [].concat(
  // ---- business.up — the hood sits in the top third of business growth this Cycle
  pool('civicRole.business.up', [
    'Merchants on the {hood} corridor stopped them to say business is picking up.',
    'A shop owner in {hood} pulled them aside to talk about a good run of weeks.',
    'Busy sidewalks in {hood}; a few business owners wanted them to see it.',
    'A new hire at the {hood} bakery said they got the job because the line out the door never stops.',
    'The owner of a {hood} bookshop said she is adding Sunday hours for the first time.',
    'A restaurant in {hood} had a wait at lunch on a weekday, and the owner wanted them to notice.',
    'A hardware store owner in {hood} said he had to reorder twice this month.',
    'Two merchants in {hood} were talking about splitting the cost of new awnings.',
    'A café owner in {hood} said the morning rush starts earlier every week.',
    'A tailor in {hood} said he is turning away work for the first time in years.',
    'A shop on the {hood} corridor had a hiring sign in the window, and the owner said it was the third this season.',
    'A florist in {hood} said weekday walk-ins used to be rare and now they are the day.',
    'The owner of a {hood} gym said memberships filled before the sign went up.',
    'A corner market in {hood} added a second register and the owner joked about a third.'
  ]),
  // ---- business.down — bottom third of business growth
  pool('civicRole.business.down', [
    'Shop owners in {hood} pressed them about slow weeks on the corridor.',
    'A merchant in {hood} cornered them about rent and thin foot traffic.',
    'Quiet registers on the {hood} corridor; a business owner asked them what the city sees coming.',
    'A café owner in {hood} said the afternoon crowd has thinned and asked if anyone noticed.',
    'A boutique in {hood} had a sale sign up for the third week running.',
    'A restaurant owner in {hood} said reservations are soft and he does not know why.',
    'A shopkeeper in {hood} said she cut a shift and hated doing it.',
    'Two merchants in {hood} asked when the corridor gets the kind of attention other blocks get.',
    'The owner of a {hood} salon said walk-ins have dried up and the chairs sit empty by two.',
    'A hardware store owner in {hood} said he is ordering less and watching more.',
    'A bakery in {hood} was closing early, and the owner said it was not by choice.',
    'A merchant in {hood} said the block needs an event, a reason, anything to bring feet.',
    'A shop owner in {hood} said the window display has not changed because nobody is looking.',
    'A gallery owner in {hood} said the openings draw friends now, not buyers.'
  ]),
  // ---- closure.down — a business in the hood actually closed this Cycle (S.businessClosures)
  pool('civicRole.closure.down', [
    'Walked past a storefront that just closed in {hood}; a neighbor wanted to know what comes next for the block.',
    'A shop on the {hood} corridor shut its doors this week, and people stopped them to talk about it.',
    'Neighbors in {hood} were still talking about the business that closed down the street.',
    'A regular in {hood} said the place that closed was where she met her husband, and asked what goes in next.',
    'The paper on the windows of the closed shop in {hood} was already peeling, and a neighbor pointed it out.',
    'Two merchants in {hood} said the closure next door makes their block look emptier than it is.',
    'A neighbor in {hood} asked whether the landlord of the closed shop has a plan, or just a sign.',
    'The last day at the closed {hood} storefront drew a small crowd, and some of them came looking for an answer.',
    'A kid in {hood} asked where the after-school snack stop went.',
    'A neighbor in {hood} said the closed shop was the corridor\'s anchor and the block feels unmoored.',
    'Someone in {hood} taped a thank-you card to the door of the closed shop, and the block read it.',
    'A merchant in {hood} said the closing shook the other owners and asked them to say something steady.',
    'A woman in {hood} said she had shopped there for twenty years and did not know where to go now.',
    'The empty window in {hood} had a hand-lettered sign: thank you, see you around the neighborhood.'
  ]),
  // ---- safety.up — crime trend falling in the hood
  pool('civicRole.safety.up', [
    'Neighbors in {hood} mentioned the blocks have felt calmer lately.',
    'A resident in {hood} said they walk home at night without thinking twice now.',
    'Parents in {hood} told them the park feels safe again.',
    'A shop owner in {hood} said he stopped pulling the gate down at dusk.',
    'A neighbor in {hood} said the kids are back on the sidewalk after dinner.',
    'A jogger in {hood} said the early route feels fine now and she is not sure when that changed.',
    'A corner market in {hood} is staying open later, and the owner said the block earned it.',
    'An elder in {hood} said she sits on the porch again in the evenings.',
    'A dad in {hood} said he let his daughter ride to the store alone for the first time.',
    'A neighbor in {hood} said the block feels like it exhaled.',
    'A bartender in {hood} said the late crowd walks home now instead of waiting for rides.',
    'Someone in {hood} said the quiet at night is the good kind.',
    'A couple in {hood} said they stopped checking the car twice before bed.',
    'A grandmother in {hood} said the grandkids play in the front yard again.'
  ]),
  // ---- safety.down — crime trend rising
  pool('civicRole.safety.down', [
    'A resident in {hood} stopped them about break-ins on their street.',
    'Neighbors in {hood} wanted answers about the trouble on the block this week.',
    'A shop owner in {hood} showed them the damage from a rough night.',
    'A neighbor in {hood} said two cars on the block were hit in one week.',
    'A woman in {hood} said she has started taking the long way home.',
    'A merchant in {hood} said he is pulling the gate down early again.',
    'Parents in {hood} said the kids are inside by dark now and did not like saying it.',
    'A neighbor in {hood} said the porch camera caught something and nobody has called back.',
    'A dog walker in {hood} said the alley feels different lately and she cannot name why.',
    'A shopkeeper in {hood} said the window got tagged twice in a month.',
    'An elder in {hood} said she heard glass break and did not go look.',
    'A resident in {hood} asked them to walk the block after dark and see for themselves.',
    'A bartender in {hood} said the late crowd is leaving in pairs now.',
    'A neighbor in {hood} said the block group chat has been nothing but alerts.'
  ]),
  // ---- initiative.up — a city project in the hood advanced this Cycle
  pool('civicRole.initiative.up', [
    'Residents in {hood} noticed the city project moving forward and said so.',
    'A neighbor in {hood} asked them about the city project and liked what they heard.',
    'People in {hood} were talking about the city work nearby, mostly good.',
    'A neighbor in {hood} said the site crews start on time and keep the block clean.',
    'A shop owner near the {hood} project said the crews buy lunch on the corridor, and it shows.',
    'A dad in {hood} said his kids watch the work from the window every morning.',
    'An elder in {hood} said she did not expect to live to see the project get this far.',
    'A neighbor in {hood} said the renderings posted on the fence drew a small crowd.',
    'A resident in {hood} said the project foreman waved them over and walked them through the week.',
    'People in {hood} said the block feels like something is finally happening.',
    'A neighbor in {hood} said the project\'s progress is the first good news on the street in a while.',
    'A merchant in {hood} said the fence art around the site is the best thing on the block.',
    'A resident in {hood} said the work is ahead of what the flyer promised.',
    'A kid in {hood} said the crane is the coolest thing in the neighborhood.'
  ]),
  // ---- initiative.down — initiative sentiment in the hood is negative
  pool('civicRole.initiative.down', [
    'People in {hood} complained the city project nearby is making the block harder to live with.',
    'A resident in {hood} wanted to know why the city work nearby keeps dragging on.',
    'Got an earful in {hood} about how the city project is landing on the block.',
    'A neighbor in {hood} said the site trucks start before six and the whole block hears it.',
    'A merchant near the {hood} project said the fencing took her parking and her walk-ins with it.',
    'A resident in {hood} said the detour adds fifteen minutes and nobody warned anyone.',
    'A dad in {hood} said the dust from the site is on every windowsill in the house.',
    'A neighbor in {hood} asked who to call about the project, and said the last number went nowhere.',
    'A shop owner in {hood} said the construction noise empties the patio by noon.',
    'People in {hood} said the project signs promise one thing and the block lives another.',
    'A resident in {hood} said the sidewalk closure has them walking in the street with a stroller.',
    'A neighbor in {hood} said the work lights stay on all night and so does she.',
    'A merchant in {hood} said the project will be great for whoever is still here when it finishes.',
    'An elder in {hood} said the jackhammers rattle her dishes and her patience.'
  ]),
  // ---- mood.up — hood sentiment in the top third
  pool('civicRole.mood.up', [
    'A good week on the {hood} blocks; people waved them down just to chat.',
    'The mood in {hood} was easy this week; conversations ran long.',
    '{hood} felt warm this week; neighbors were glad to see them.',
    'Someone in {hood} was grilling on the sidewalk and handed them a plate without asking.',
    'A stoop in {hood} had five neighbors on it and room for one more.',
    'Music from a {hood} porch spilled onto the block and nobody minded.',
    'A neighbor in {hood} said this is the best the block has felt in a long time.',
    'The {hood} corner was all hellos this week.',
    'A kid in {hood} chalked the whole sidewalk and the adults stepped around it, smiling.',
    'A neighbor in {hood} said the block is talking to each other again.',
    'A woman in {hood} said she knows more of her neighbors\' names this month than last.',
    'The {hood} farmers\' stand had a line, and the line was in a good mood.',
    'A resident in {hood} said the block feels like a neighborhood, not an address.',
    'Two neighbors in {hood} were planning a block party and asked them to come.'
  ]),
  // ---- mood.down — hood sentiment in the bottom third
  pool('civicRole.mood.down', [
    'Tension on the {hood} blocks this week; conversations ran short and sharp.',
    '{hood} felt on edge this week, and people let them know it.',
    'A sour week in {hood}; a neighbor said nobody at the city is listening.',
    'A neighbor in {hood} said the block has gone quiet, and not the peaceful kind.',
    'Two residents in {hood} were arguing on the sidewalk and both turned to them.',
    'A shop owner in {hood} said customers are short with each other lately.',
    'A woman in {hood} said she keeps her head down on the block now.',
    'The {hood} corner was all nods and no words this week.',
    'A neighbor in {hood} said people stopped showing up to the block meeting.',
    'A resident in {hood} said the block feels like everyone is waiting for something bad.',
    'A man in {hood} said the neighbors used to talk and now they text complaints.',
    'An elder in {hood} said the street feels tired.',
    'A neighbor in {hood} said nobody waved back this week.',
    'A dad in {hood} said the kids pick up on the mood and he wishes they didn\'t.'
  ]),
  // ---- everyday.up — always a candidate; also receives every up draw that went against a down premise.
  // Must stay premise-neutral: about the official's presence and the block's regard, never business or crime facts.
  pool('civicRole.everyday.up', [
    'A neighbor in {hood} thanked them for showing up around the block.',
    'Someone in {hood} recognized them at the corner store and said keep going.',
    'An old acquaintance in {hood} stopped them to say they are doing right by the neighborhood.',
    'A kid on a bike in {hood} shouted their name and gave them a thumbs-up.',
    'The barber in {hood} waved them in for a free trim and twenty minutes of good news.',
    'A retiree in {hood} pressed a bag of lemons from the backyard tree into their hands.',
    'Three neighbors in {hood} were waiting on the stoop just to say thanks for coming by.',
    'A woman in {hood} said her mother still talks about the time they returned her call.',
    'Someone at the {hood} bus stop said they had never seen an official take the bus before, and meant it kindly.',
    'A coach at the {hood} rec center asked them to hand out the end-of-season ribbons.',
    'The owner of the {hood} taqueria refused to let them pay and said that was the whole point.',
    'An elder in {hood} held their arm and said the block feels looked after.',
    'A dad in {hood} said his daughter wrote a school report about them, and it was mostly flattering.',
    'A pair of teenagers in {hood} asked for a photo and actually posted it.',
    'The crossing guard in {hood} said the kids ask about them.',
    'A couple in {hood} said they moved here because the neighborhood seemed cared for, and named them.',
    'A regular at the {hood} coffee counter slid over a seat and said sit, tell me how it is going.',
    'Someone in {hood} left a thank-you note under their windshield wiper.',
    'A librarian in {hood} said the evening programs keep filling and credited the attention.',
    'A grandmother in {hood} introduced them to the whole family on the porch, one by one.',
    'A man walking his dog in {hood} said they were the first official who ever learned his name.',
    'A shopkeeper in {hood} said the block feels like somebody is paying attention.',
    'A neighbor in {hood} handed over a plate of tamales and said the family insisted.',
    'A teacher in {hood} said her students want to do a project on the neighborhood because of a visit they made.',
    'A nurse coming off shift in {hood} said she sees them around more than she expected to.',
    'The mail carrier in {hood} said people on the route talk about them, and it is good talk.',
    'A dad in {hood} said his son wants to work for the city now.',
    'A neighbor in {hood} said they fixed the one thing nobody else had bothered to, and remembered it a year later.',
    'A regular at the {hood} laundromat folded a shirt and said the block has their back.',
    'Somebody in {hood} asked them to settle a friendly argument about the best bakery, and the whole line weighed in.',
    'A church usher in {hood} saved them a seat and said the congregation has noticed.',
    'A kid in {hood} asked what the job is like, and listened to the whole answer.',
    'A neighbor in {hood} said the block party had the best turnout in years and invited them to the next one.',
    'An old-timer in {hood} said the neighborhood used to have to shout to be heard, and now it does not.',
    'The owner of the {hood} corner market set aside the good peaches and said they were for them.',
    'Two neighbors in {hood} who had been feuding said they settled it, and gave them some of the credit.',
    'A jogger in {hood} slowed down just to say the morning walks feel good this season.',
    'A barista in {hood} wrote their name on the cup before they ordered.',
    'A neighbor in {hood} said the kids on the block know who they are, and that is new.',
    'A florist in {hood} tucked an extra stem in and said for the desk, from the block.'
  ]),
  // ---- everyday.down — always a candidate; also receives every down draw that went against an up premise.
  // The obstacle is attention, pace and old promises — not decay. This is a prosperous city.
  pool('civicRole.everyday.down', [
    'Got an earful from a neighbor in {hood} who feels nobody listens.',
    'A resident in {hood} told them flatly they had not seen them around enough.',
    'A neighbor in {hood} brought up an old promise they felt was never kept.',
    'A man in {hood} said he had called three times and would not be calling a fourth.',
    'A woman at the {hood} bus stop said officials only show up when there is a camera.',
    'A shop regular in {hood} asked why the pothole on the corner has outlasted two of their visits.',
    'A retiree in {hood} said the neighborhood newsletter has their name in it more than the neighborhood does.',
    'Someone in {hood} walked away mid-sentence.',
    'A dad in {hood} said the kids\' field is still locked on weekends and asked who holds the key.',
    'A neighbor in {hood} said the streetlight on their block has been out longer than they have been in the job.',
    'A teenager in {hood} asked what they actually do all day, and did not like the answer.',
    'A grandmother in {hood} said she wrote a letter and never heard back.',
    'Someone in {hood} said the last official promised the same thing, in the same spot.',
    'A neighbor in {hood} said the block meeting had six people, and none of them were from the city.',
    'A barber in {hood} kept cutting and said he would believe it when he saw it.',
    'A woman in {hood} said she is tired of explaining the same problem to a new face.',
    'A man in {hood} asked them to name one thing that changed on his street, and waited.',
    'A neighbor in {hood} said the crosswalk paint has been promised since spring.',
    'A resident in {hood} said the hold music at the city is longer than their patience.',
    'A coach in {hood} said the rec center lights still cut out at eight, same as last year.',
    'Someone in {hood} said they would rather talk to the mail carrier; at least he comes every day.',
    'A neighbor in {hood} said the block feels overlooked and would not be talked out of it.',
    'An elder in {hood} said they remember when officials knocked on doors, and asked when that stopped.',
    'A regular at the {hood} coffee counter turned back to the paper and kept reading.',
    'A woman in {hood} said she has stopped reporting the broken bench because nothing happens.',
    'Two neighbors in {hood} argued about whose fault the drainage is and agreed it was the city\'s.',
    'A dad in {hood} said the playground swing has been missing a seat for a whole season.',
    'Someone in {hood} said they saw the official\'s name on a flyer and nowhere else.',
    'A shopkeeper in {hood} said the tree roots are lifting the sidewalk and nobody will say whose problem it is.',
    'A neighbor in {hood} said the last town hall was a lecture, not a conversation.',
    'A nurse in {hood} said she works nights and has never once seen an official on her schedule.',
    'A man in {hood} said the alley has needed a light for three years and he is done asking.',
    'A teenager in {hood} said nobody at the city knows what the block is actually like.',
    'A neighbor in {hood} asked when the stop sign request moves from a request to a sign.',
    'An old-timer in {hood} said he has outlived four promises about the same curb.',
    'A woman in {hood} said she showed up to the meeting and the meeting had moved.',
    'A resident in {hood} said the recycling pickup skips their block and nobody returns the call.',
    'Someone in {hood} said they would leave the block if they could afford to, and let that sit.',
    'A neighbor in {hood} said the block\'s one bench is broken and the one tree is dying, and asked which comes first.',
    'A dad in {hood} said the school crossing needs a guard and has needed one since his kid started.'
  ])
);

function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase(); }

function validateRows(rows) {
  const list = rows || ROWS; const errors = []; const seen = {};
  list.forEach(function (r, i) {
    if (r.Kind !== 'line') errors.push(i + ': Kind');
    if (KEYS.indexOf(r.PoolKey) < 0) errors.push(i + ': PoolKey ' + r.PoolKey + ' not one of the eleven live keys');
    if (!r.Text) errors.push(i + ': empty Text');
    if (/\$/.test(r.Text)) errors.push(i + ': `$` in Text — civicRoleEclLines_ drops it');
    if (/\{(?!hood\})/.test(r.Text)) errors.push(i + ': only {hood} is filled');
    if (String(r.Conditions || '').trim()) errors.push(i + ': Conditions must be empty — civicRoleEclLines_ drops conditioned rows');
    if (FOURTH_WALL.test(r.Text) || FOURTH_WALL.test(r.Tags)) errors.push(i + ': fourth-wall');
    if (OFFICE_FACT.test(r.Text)) errors.push(i + ': office fact — ' + r.Text);
    if (U.firstTag(r.Tags) !== 'source:civicRole') errors.push(i + ': first tag must be source:civicRole');
    if (r.Tags.indexOf(';') >= 0) errors.push(i + ': tags must be comma-split');
    if (!(Number(r.Weight) > 0)) errors.push(i + ': Weight');
    const n = norm(r.Text);
    if (seen[n]) errors.push(i + ': duplicate Text — ' + r.Text);
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
