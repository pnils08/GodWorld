'use strict';
// engine.278 (employment-living plan Task 9) — THE MINT'S EMPLOYER PICK.
// A minted citizen lands at a business in the role's own field, the hood first;
// a self-employed role is SELF_EMPLOYED; a role with no field or no room is
// UNTRACKED; a student, a retiree and a GAME-clock citizen hold no employer.
// Proves: the pure pick, the pool the pick reads, the two ported lists against
// their sources, and the mint end to end through processAdvancementRows_'s file.
// Run: node scripts/mintEmployerPick.test.js
const fs = require('fs'), path = require('path');
const R = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

const logs = [];
const src = ['utilities/citizenDerivation.js', 'phase05-citizens/runCareerEngine.js', 'phase05-citizens/generationalWealthEngine.js',
  'phase05-citizens/educationCareerEngine.js', 'phase05-citizens/processAdvancementIntake.js'].map(R).join('\n');
const E = new Function('ECONOMIC_PARAMETERS', 'Logger', src +
  '\nreturn { pickMintEmployer_, buildMintBizPool_, mintNamedEmployer_, roleFieldOf_, skillTagField_, sectorCategory_,' +
  ' MINT_PARENTHETICAL, MINT_KEYWORD_RULES, MINT_SELF_EMPLOYED_PATTERNS, MINT_NO_EMPLOYMENT_ROLE };')(
  JSON.parse(R('data/economic_parameters.json')), { log(m) { logs.push(String(m)); } });

let pass = 0, fail = 0;
function check(name, cond, detail) { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); } }

// ── a small city: every field the four plan roles need, two hoods ──
const BIZ = [
  ['BIZ_ID', 'Name', 'Sector', 'Neighborhood', 'Employee_Count'],
  ['BIZ-A', 'City of Oakland', 'Municipal Government', 'City-wide', 900],
  ['BIZ-00024', 'Oakland Police Department', 'Public Safety', 'Downtown', 700],
  ['BIZ-00027', 'Oakland Parks & Recreation', 'Municipal Parks', 'Lake Merritt', 300],
  ['BIZ-00015', 'Oakland Hospital', 'Healthcare', 'City-wide', 1200],
  ['BIZ-00013', 'AC Transit', 'Public Transit', 'Downtown', 800],
  ['BIZ-N', 'EBMUD', 'Water Utility', 'Downtown', 500],
  ['BIZ-D', 'Temescal Clinic', 'Community Health Clinic', 'Temescal', 40],
  ['BIZ-E', 'Anchor Build', 'Construction', 'Jack London', 60],
  ['BIZ-F', 'Northgate Construction', 'Construction', 'Temescal', 35],
  ['BIZ-G', 'Green & Gold Tavern', 'Bar & Dining', 'Jack London', 22],
  ['BIZ-H', 'Sunrise Cafe', 'Cafe', 'Temescal', 9],
  ['BIZ-I', 'Corner Market', 'Retail', 'Temescal', 6],
  ['BIZ-00001', 'Anthropic', 'AI Research', 'Downtown', 400],
  ['BIZ-00005', 'Oakland Athletics', 'Sports Franchise', 'Jack London', 300],
  ['BIZ-L', 'Halden Group', 'Corporate', 'Downtown', 80],
  ['BIZ-M', 'Full House Diner', 'Restaurant', 'Fruitvale', 2],
];
const ssOf = (rows) => ({ getSheetByName: (n) => (n === 'Business_Ledger' ? { getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }) } : null) });
const pool = E.buildMintBizPool_(ssOf(BIZ));
const tracked = { 'BIZ-M': 2 };
const room = (id) => { const st = pool.statedById[id]; return st !== null && st !== undefined && st > (tracked[id] || 0); };
const fieldOfBiz = (id) => { for (const f in pool.byField) if (pool.byField[f].some(b => b.id === id)) return f; return null; };
const pick = (role, hood, clock, seed, p, rm) => E.pickMintEmployer_(role, hood, clock === undefined ? 'ENGINE' : clock, seed === undefined ? 'seed-1' : seed, p === undefined ? pool : p, rm || room);

console.log('\n1. the pool — each business under its field, with its hood:');
check('1.1 a business is filed under the field its Sector reads as', fieldOfBiz('BIZ-E') === 'Construction & Baylight' && fieldOfBiz('BIZ-00015') === 'Healthcare' && fieldOfBiz('BIZ-G') === 'Food & Culture' && fieldOfBiz('BIZ-I') === 'Small Business' && fieldOfBiz('BIZ-A') === 'Government & Civic', JSON.stringify(Object.keys(pool.byField)));
check('1.2 a sports business and a Sector with no field sit in no pool', fieldOfBiz('BIZ-00005') === null && fieldOfBiz('BIZ-L') === null);
check('1.3 the hood rides with the business', pool.byField['Construction & Baylight'].find(b => b.id === 'BIZ-F').hood === 'Temescal');
check('1.4 the four keyword buckets are gone', pool.pools === undefined);
check('1.4b each business\'s field is readable by id (the tag stamp reads it)', pool.fieldById['BIZ-00024'] === 'Government & Civic' && pool.fieldById['BIZ-00005'] === undefined);
check('1.5 stated headcount is kept for the room test; a blank count reads as no room', pool.statedById['BIZ-I'] === 6 &&
  E.buildMintBizPool_(ssOf([BIZ[0], ['BIZ-Z', 'Blank Co', 'Retail', 'Temescal', '']])).statedById['BIZ-Z'] === null);
check('1.6 a missing Business_Ledger gives no pool', E.buildMintBizPool_({ getSheetByName: () => null }) === null);

console.log('\n2. the plan\'s four roles land in their own field:');
const plumber = pick('Plumber', 'Temescal');
check('2.1 a Plumber lands at a construction employer, the hood first', plumber.bizId === 'BIZ-F' && !plumber.sentinel, JSON.stringify(plumber));
const plumberJL = pick('Plumber', 'Jack London');
check('2.2 …and at the other one from the other hood', plumberJL.bizId === 'BIZ-E', JSON.stringify(plumberJL));
const nurse = pick('Nurse Aide', 'Temescal');
check('2.3 a Nurse Aide lands at the hospital — the mapping names it for nurses', nurse.bizId === 'BIZ-00015', JSON.stringify(nurse));
let copStrays = [];
for (let k = 0; k < 200; k++) { const c = pick('Police Officer', k % 2 ? 'Fruitvale' : 'Lake Merritt', 'ENGINE', 'cop' + k); if (c.bizId !== 'BIZ-00024') copStrays.push(c.bizId || c.sentinel); }
check('2.4 a Police Officer lands at the police department on every seed — never City Hall or Parks (the field alone put one at Parks on the bench)', copStrays.length === 0, copStrays.slice(0, 4).join(','));
const dish = pick('Dishwasher', 'Jack London');
check('2.5 a Dishwasher lands in dining or off the tracked ledger — never at City Hall or the hospital',
  dish.bizId === 'BIZ-G' || dish.bizId === 'BIZ-H' || dish.sentinel === 'UNTRACKED', JSON.stringify(dish));
let strays = [];
for (let k = 0; k < 200; k++) {
  for (const r of ['Plumber', 'Electrician', 'Line Cook', 'Server', 'Barista']) {
    const got = pick(r, k % 2 ? 'Temescal' : 'Rockridge', 'ENGINE', 'seed-' + k + r);
    const want = (r === 'Plumber' || r === 'Electrician') ? 'Construction & Baylight' : 'Food & Culture';
    if (!got.bizId || fieldOfBiz(got.bizId) !== want) strays.push(r + '>' + (got.bizId || got.sentinel || 'blank'));
  }
}
check('2.6 across 1,000 seeds every trade and kitchen role lands at a business, in its own field', strays.length === 0, strays.slice(0, 5).join(','));

console.log('\n3. hood first, then the whole field:');
check('3.1 a hood with no business in the field falls to the whole field', ['BIZ-E', 'BIZ-F'].indexOf(pick('Plumber', 'Rockridge').bizId) >= 0);
check('3.2 a City-wide business counts as every hood', pick('City Planner', 'Rockridge').bizId === 'BIZ-A', JSON.stringify(pick('City Planner', 'Rockridge')));
let seen = {};
for (let k = 0; k < 60; k++) seen[pick('Home Health Aide', 'Temescal', 'ENGINE', 'n' + k).bizId] = 1;
check('3.3 in the hood the slot is shared between the hood business and the city-wide one', seen['BIZ-00015'] && seen['BIZ-D'] && Object.keys(seen).length === 2, Object.keys(seen).join(','));
check('3.4 the same seed lands the same slot', pick('Home Health Aide', 'Temescal', 'ENGINE', 'same').bizId === pick('Home Health Aide', 'Temescal', 'ENGINE', 'same').bizId);
check('3.5 no hood on the row draws from the whole field', ['BIZ-E', 'BIZ-F'].indexOf(pick('Plumber', '').bizId) >= 0);

console.log('\n4. room binds the pick:');
const noCafe = (id) => id !== 'BIZ-H' && room(id);
check('4.1 a full hood business is skipped for the next in the field', pick('Barista', 'Temescal', 'ENGINE', 's', pool, noCafe).bizId === 'BIZ-G');
const fullDining = (id) => ['BIZ-G', 'BIZ-H', 'BIZ-M'].indexOf(id) < 0 && room(id);
const cook = pick('Line Cook', 'Temescal', 'ENGINE', 's', pool, fullDining);
check('4.2 a field with no room anywhere is UNTRACKED — employed off the tracked ledger, not seeking, and not the corner shop', cook.sentinel === 'UNTRACKED' && !cook.bizId && !cook.seeking, JSON.stringify(cook));
check('4.3 the business already at its stated count takes nobody — its hood\'s server lands at another kitchen', (() => { for (let k = 0; k < 80; k++) { const g = pick('Server', 'Fruitvale', 'ENGINE', 'm' + k).bizId; if (g !== 'BIZ-G' && g !== 'BIZ-H') return false; } return true; })());

console.log('\n5. self-employed before the field:');
check('5.1 a Taxi driver is self-employed, not a transit hire', pick('Taxi driver', 'Downtown').sentinel === 'SELF_EMPLOYED');
check('5.2 a Gallery Owner/Curator is self-employed, not a gallery hire', pick('Gallery Owner/Curator', 'Chinatown').sentinel === 'SELF_EMPLOYED');
check('5.3 an Artist/Muralist and a Grocery Store Owner are self-employed', pick('Artist/Muralist', 'Jack London').sentinel === 'SELF_EMPLOYED' && pick('Grocery Store Owner', 'Chinatown').sentinel === 'SELF_EMPLOYED');
check('5.4 the keyword match is the roster\'s: case-sensitive substring (a Contractor is not an Actor)', E.mintNamedEmployer_('General Contractor') !== 'SELF_EMPLOYED' && E.mintNamedEmployer_('Actor') === 'SELF_EMPLOYED');
check('5.5 a self-employed role needs no Business_Ledger', pick('Independent Bookkeeper', 'Temescal', 'ENGINE', 's', null).sentinel === 'SELF_EMPLOYED');

console.log('\n5b. a title the mapping names an organisation for:');
check('5b.1 a Detective and a Bus driver land at the police department and the bus agency', pick('Detective', 'Dimond').bizId === 'BIZ-00024' && pick('Bus driver', 'Laurel').bizId === 'BIZ-00013');
let busStrays = 0; for (let k = 0; k < 100; k++) if (pick('Bus Driver', 'Downtown', 'ENGINE', 'b' + k).bizId !== 'BIZ-00013') busStrays++;
check('5b.2 …on every seed, never the water utility in the same field', busStrays === 0 && fieldOfBiz('BIZ-N') === fieldOfBiz('BIZ-00013'), busStrays + '/' + fieldOfBiz('BIZ-N'));
check('5b.3 a parenthetical names the employer', pick('Policy Analyst (Anthropic)', 'Temescal').bizId === 'BIZ-00001' && pick('Tutor (Private)', 'Temescal').sentinel === 'SELF_EMPLOYED');
const fullPD = (id) => id !== 'BIZ-00024' && room(id);
const copNoRoom = pick('Police Officer', 'Downtown', 'ENGINE', 's', pool, fullPD);
check('5b.4 a named organisation with no room falls to the field, not to a queue outside it', copNoRoom.bizId && copNoRoom.bizId !== 'BIZ-00024' && fieldOfBiz(copNoRoom.bizId) === 'Government & Civic', JSON.stringify(copNoRoom));
const ff = pick('Firefighter', 'Temescal');
check('5b.5 a named organisation that is not on the ledger falls to the field', E.mintNamedEmployer_('Firefighter') === 'BIZ-00023' && pool.statedById['BIZ-00023'] === undefined && fieldOfBiz(ff.bizId) === 'Government & Civic', JSON.stringify(ff));
const scout = pick("Scout, Oakland A's", 'Jack London');
check('5b.6 a sports organisation is never picked, named or not', E.mintNamedEmployer_("Scout, Oakland A's") === 'BIZ-00005' && scout.bizId !== 'BIZ-00005', JSON.stringify(scout));
check('5b.7 the first keyword rule in the mapping\'s order decides', E.mintNamedEmployer_('Deputy Mayor') === 'BIZ-00017' && E.mintNamedEmployer_('School Nurse') === E.MINT_KEYWORD_RULES.find(r => 'School Nurse'.indexOf(r[0]) !== -1)[1]);

console.log('\n6. no job, no field, no ledger:');
const blank = (o) => !o.bizId && !o.sentinel && !o.seeking;
check('6.1 a student holds no employer and no line (the old pick hired students at a shop)', blank(pick('student', 'Temescal')));
check('6.2 a retiree holds no employer', blank(pick('Retired', 'Temescal')) && blank(pick('Retired Teacher', 'Temescal')));
check('6.3 a GAME-clock citizen is left to the sports world, whatever the role', blank(pick('Plumber', 'Temescal', 'GAME')) && blank(pick('Athlete', 'Jack London', 'GAME')));
check('6.4 a blank role holds no employer', blank(pick('', 'Temescal')));
check('6.4b a Vice President is not a resident — the roster rule skipped every title ending in "President" as jobless', !blank(pick('Vice President', 'Downtown')) && !blank(pick('Bank President', 'Downtown')) && blank(pick('Longtime resident', 'Downtown')), JSON.stringify(pick('Vice President', 'Downtown')));
const odd = pick('Climate Adaptation Specialist', 'Temescal');
check('6.5 a role with no field is UNTRACKED, never the service catch-all', odd.sentinel === 'UNTRACKED' && !odd.bizId, JSON.stringify(odd));
const dead = pick('Plumber', 'Temescal', 'ENGINE', 's', null);
check('6.6 an unreadable Business_Ledger leaves a fielded role seeking (the caller writes the line)', dead.seeking === true && !dead.bizId && !dead.sentinel, JSON.stringify(dead));
check('6.7 Trades reads as its field through the alias', E.roleFieldOf_('Plumber') !== null && E.skillTagField_(E.roleFieldOf_('Plumber')) === 'Construction & Baylight', String(E.roleFieldOf_('Plumber')));

console.log('\n7. the ported lists match their sources:');
const mapping = JSON.parse(R('data/employer_mapping.json'));
check('7.1 the self-employed patterns are the mapping\'s, in order', JSON.stringify(E.MINT_SELF_EMPLOYED_PATTERNS) === JSON.stringify(mapping.selfEmployedPatterns), JSON.stringify(mapping.selfEmployedPatterns));
const kwPairs = mapping.keywordRules.map(r => [r.pattern, r.bizId]);
const kwDrift = kwPairs.findIndex((r, i) => !E.MINT_KEYWORD_RULES[i] || E.MINT_KEYWORD_RULES[i][0] !== r[0] || E.MINT_KEYWORD_RULES[i][1] !== r[1]);
check('7.2 the keyword rules are the mapping\'s ' + kwPairs.length + ', pattern and target, in order', E.MINT_KEYWORD_RULES.length === kwPairs.length && kwDrift === -1, 'first drift at rule ' + kwDrift + ' ' + JSON.stringify(kwPairs[kwDrift]));
check('7.2b the parenthetical lookup is the mapping\'s', JSON.stringify(E.MINT_PARENTHETICAL) === JSON.stringify(mapping.parentheticalLookup));
check('7.3 the no-job rule is the roster script\'s', R('scripts/linkCitizensToEmployers.js').indexOf('var NO_EMPLOYMENT_ROLE = ' + String(E.MINT_NO_EMPLOYMENT_ROLE) + ';') >= 0, String(E.MINT_NO_EMPLOYMENT_ROLE));
const intakeSrc = R('phase05-citizens/processAdvancementIntake.js');
check('7.4 the four-bucket classifier is gone from the intake engine', !/classifyMintSector_/.test(intakeSrc) && !/pools\.service/.test(intakeSrc));
check('7.5 the tag stamp reads the role\'s field, not a bucket map', /var mintField = \(typeof roleFieldOf_ === 'function'\) \? roleFieldOf_\(newRoleType\) : null;/.test(intakeSrc) && !/mintTagMap/.test(intakeSrc));

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
