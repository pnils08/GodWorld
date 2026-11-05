/**
 * discordLookups.test.js — offline coverage for the Discord record lookups (research.32).
 *
 * Run: node lib/discordLookups.test.js   (exits 0 pass / 1 fail)
 *
 * NO live API / NO disk tables — fixture rows shaped like the C114 dumps. The live replay of the
 * seven logged queries and the bot smoke are run by hand (plan §Acceptance); here: resolution,
 * newest-first, the illness facts kept apart, the record row choice, the duplicate-name stop,
 * the closed-business read, and what a message is detected to name.
 */
const D = require('./discordLookups');

let passed = 0;
let failed = 0;
function assert(label, cond, detail) {
  if (cond) { console.log(`  ok   ${label}`); passed++; }
  else { console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`); failed++; }
}

const ledger = [
  { Name: 'Vinnie Keane', POPID: 'POP-00001', RoleType: "Designated Hitter, Oakland A's Legend", Status: 'Active', Neighborhood: 'Grand Lake', Tier: '1', BirthYear: '2003', MaritalStatus: 'married',
    LifeHistory: '[Compressed]\nY3C9 — [Personal] a\nY3C10 — [Home] ten weeks in Grand Lake' },
  { Name: 'Jacob Perez', POPID: 'POP-00203', RoleType: 'Mover', Neighborhood: 'Uptown', Status: 'Active' },
  { Name: 'Jacob Perez', POPID: 'POP-01089', RoleType: 'Delivery driver', Neighborhood: 'Glenview', Status: 'Active' },
  { Name: 'Adash Stanley', POPID: 'POP-01023', RoleType: 'PG, Oakland Oaks', Neighborhood: 'Downtown', Status: 'Active' }
];
const feed = [
  { Cycle: '110', SeasonType: 'playoffs', EventType: 'game-result', TeamsUsed: "A's", NamesUsed: 'Vinnie Keane (DH)', Notes: 'WS win', 'Team Record': '11-3', Streak: 'W3', WeekRecord: '' },
  { Cycle: '112', SeasonType: 'off-season', EventType: 'player-feature', TeamsUsed: "A's", NamesUsed: 'Vinnie Keane (3B), Benji Dillon (SP)', Notes: 'Blue Lattern night', 'Team Record': '-', Streak: '-', WeekRecord: '' },
  { Cycle: '114', SeasonType: 'early-season', EventType: 'game-result', TeamsUsed: 'Oaks', NamesUsed: 'Adash Stanley (PG), Wendell Carter Jr (C)', Notes: 'Oaks lose in Indiana', 'Team Record': '4-1', Streak: 'L1', WeekRecord: 'A:L' },
  { Cycle: '114', SeasonType: 'off-season', EventType: 'player-feature', TeamsUsed: "A's", NamesUsed: 'Benji Dillon (SP), Vinnie Keane (DH)', Notes: 'Vinnie Keane made it clear. Dillon has not.', 'Team Record': '-', Streak: '-', WeekRecord: '' },
  { Cycle: '114', SeasonType: 'early-season', EventType: 'player-feature', TeamsUsed: 'Oaks', NamesUsed: 'Harry Hayward (PF)', Notes: 'Hayward minutes', 'Team Record': '6-1', Streak: 'W2', WeekRecord: '' },
  { Cycle: '114', SeasonType: 'early-season', EventType: 'game-result', TeamsUsed: 'Oaks', NamesUsed: 'Dillon Brooks (SF), Adash Stanley (PG), Wendell Carter Jr (C)', Notes: 'Cup opener win', 'Team Record': '6-1', Streak: 'W2', WeekRecord: 'H:W' }
];
const demo = [
  { Neighborhood: 'KONO', Students: '61', Adults: '425', Seniors: '51', Unemployed: '22', Sick: '17', LastUpdated: '114', SchoolQualityIndex: '6.92', GraduationRate: '85.82', CollegeReadinessRate: '53.57' },
  { Neighborhood: 'Chinatown', Students: '316', Adults: '1500', Seniors: '397', Unemployed: '84', Sick: '137', LastUpdated: '114', SchoolQualityIndex: '6.87', GraduationRate: '85.77', CollegeReadinessRate: '53.45' },
  { Neighborhood: 'West Oakland', Students: '300', Adults: '1700', Seniors: '326', Unemployed: '70', Sick: '87', LastUpdated: '114', SchoolQualityIndex: '6.5', GraduationRate: '84', CollegeReadinessRate: '50' }
];
const prevDemo = [
  { Neighborhood: 'KONO', Students: '61', Adults: '425', Seniors: '51', Sick: '17' },
  { Neighborhood: 'Chinatown', Students: '316', Adults: '1490', Seniors: '395', Sick: '140' },
  { Neighborhood: 'West Oakland', Students: '300', Adults: '1700', Seniors: '326', Sick: '60' }
];
const census = [
  { Cycle: '114', System: 'hospital', GeographicScope: 'neighborhood', Neighborhood: 'Chinatown', IntakeType: 'all', Completeness: 'complete', TotalIntakes: '3', ClosingOccupancy: '6', BedsOccupied: '6', Exits: '3' },
  { Cycle: '114', System: 'hospital', GeographicScope: 'neighborhood', Neighborhood: 'Chinatown', IntakeType: 'illness', Completeness: 'complete', TotalIntakes: '3', ClosingOccupancy: '6', BedsOccupied: '6', Exits: '3' },
  { Cycle: '114', System: 'hospital', GeographicScope: 'city', Neighborhood: '', IntakeType: 'all', Completeness: 'complete', TotalIntakes: '35', ClosingOccupancy: '70', BedsOccupied: '70', Exits: '37' },
  { Cycle: '114', System: 'hospital', GeographicScope: 'neighborhood', Neighborhood: 'KONO', IntakeType: 'all', Completeness: 'partial', TotalIntakes: '9', ClosingOccupancy: '9', BedsOccupied: '9', Exits: '0' },
  { Cycle: '114', System: 'judicial', GeographicScope: 'neighborhood', Neighborhood: 'KONO', IntakeType: 'all', Completeness: 'complete', TotalIntakes: '3', ClosingOccupancy: '5', BedsOccupied: '', Exits: '1' }
];
const business = [
  { BIZ_ID: 'BIZ-00074', Name: 'Oakland Oaks', Sector: 'Sports', Neighborhood: 'Baylight District', Employee_Count: '250', Avg_Salary: '15642857', Annual_Revenue: '62409392', Growth_Rate: '11.43', Key_Personnel: 'POP-00789 (Elias Varek, Owner)' },
  { BIZ_ID: 'BIZ-00003', Name: 'Discord', Sector: 'Community Platform', Neighborhood: 'Baylight District', Employee_Count: '350', Avg_Salary: '160000', Annual_Revenue: '5', Growth_Rate: '1' }
];
const businessArchive = [
  { BIZ_ID: 'BIZ-00086', Name: 'Beth Jacob Congregation', Sector: 'Faith Organization', Neighborhood: 'Piedmont Ave', ArchiveReason: 'canon-duplicate-of:BIZ-00092', ExitCycle: '108', ClosedCycle: '' }
];
const tables = { ledger, ledgerCycle: 114, feed, demo, prevDemo, census, business, businessArchive, beatsCycle: 114, prevCycle: 113 };

// The real readers, not copies
const H = require('../scripts/buildHealthSlice');
const K = require('../scripts/beatSliceKit');
const W = require('../utilities/sportsWeekRecord');
const healthDeps = { sickShare: H.sickShare, SPIKE_WATCH: H.SPIKE_WATCH, SPIKE_RISE: H.SPIKE_RISE };

(async function run() {
  console.log('Test 1: citizen — the C114 feed line comes before the ledger status; a duplicate name stops');
  {
    const v = await D.lookupCitizen('Vinnie Keane', tables, {});
    assert('found by exact name', v.found && v.popId === 'POP-00001');
    assert('newest feed line first (C114 made it clear)', v.feed[0].cycle === 114 && /made it clear/.test(v.feed[0].text), JSON.stringify(v.feed[0]));
    assert('feed newest-first order', v.feed.map(f => f.cycle).join(',') === '114,112,110');
    const txt = D.formatResult(v);
    assert('feed block precedes the ledger row in the text', txt.indexOf('made it clear') < txt.indexOf('status Active'));
    assert('ledger status still stated with its snapshot Cycle', /snapshot C114.*status Active/.test(txt));
    assert('both-records sentence present', /say what each says/.test(txt));
    const byId = await D.lookupCitizen('pop-00001', tables, {});
    assert('found by POPID, any case', byId.found && byId.name === 'Vinnie Keane');
    const jp = await D.lookupCitizen('Jacob Perez', tables, {});
    assert('two Jacob Perez rows -> not found, both listed', !jp.found && jp.ambiguous && jp.ambiguous.length === 2);
    assert('ambiguous text names both POPIDs', /POP-00203/.test(D.formatResult(jp)) && /POP-01089/.test(D.formatResult(jp)));
    const partial = await D.lookupCitizen('Keane', tables, {});
    assert('a partial name is not a match', !partial.found && !partial.ambiguous);
    const card = await D.lookupCitizen('Vinnie Keane', tables, { canon: async () => ({ card: 'Vinnie Keane (POP-00001) card', canon: [{ cycle: 90, text: 'old' }, { cycle: null, text: 'undated' }, { cycle: 100, text: 'new' }] }) });
    assert('canon passed through as given', card.canon.length === 3 && card.card);
    assert('orderByCycle: dated desc then undated', D.orderByCycle(card.canon).map(c => c.cycle).join(',') === '100,90,');
    const paged = await D.lookupCitizen('Vinnie Keane', tables, { page: async () => { throw new Error('down'); } });
    assert('page failure reads as unavailable, lookup still answers', paged.found && paged.page && paged.page.unavailable);
  }

  console.log('\nTest 2: neighborhood — count, share, watch bar, prior movement and rank are separate facts');
  {
    const k = D.lookupNeighborhood('Kono', tables, { health: healthDeps, censusTrail: K.censusTrail });
    assert('KONO resolves case-insensitively', k.found && k.hood === 'KONO');
    assert('17 sick, 3.2% share, under the bar', k.illness.sick === 17 && Math.round(k.illness.share * 1000) === 32 && k.illness.overWatchBar === false);
    assert('flat on last Cycle, not risen', k.illness.prevSick === 17 && k.illness.risen === false);
    assert('rank 3 of 3, highest named as Chinatown 137', k.illness.rankByCount === 3 && k.illness.highestByCount.hood === 'Chinatown' && k.illness.highestByCount.sick === 137);
    const kt = D.formatResult(k);
    assert('text names Chinatown as the highest', /highest: Chinatown 137/.test(kt), kt);
    assert('partial hospital census withheld', /Hospital census C114: partial — numbers withheld/.test(kt), kt);
    assert('custody census read: 3 arrests, 5 in custody', /Custody census C114: 3 arrests this Cycle; 5 in custody at the close/.test(kt), kt);
    const c = D.lookupNeighborhood('Chinatown', tables, { health: healthDeps, censusTrail: K.censusTrail });
    assert('Chinatown over the bar, highest, and DOWN from 140', c.illness.overWatchBar === true && c.illness.rankByCount === 1 && c.illness.prevSick === 140 && c.illness.risen === false);
    const ct = D.formatResult(c);
    assert('text says OVER and down', /OVER/.test(ct) && /was 140 — down/.test(ct), ct);
    assert('hospital: 3 admissions, 6 in care, typed row not double counted', /3 admissions this Cycle; 6 in care at the close, 6 beds/.test(ct), ct);
    assert('citywide line carried from the city scope', /Citywide: 35 admissions, 70 at the close/.test(ct), ct);
    const w = D.lookupNeighborhood('West Oakland', tables, { health: healthDeps, censusTrail: K.censusTrail });
    assert('West Oakland risen a quarter (60 -> 87)', w.illness.risen === true);
    const no = D.lookupNeighborhood('Montclair', tables, { health: healthDeps });
    assert('unknown hood -> not found with the hood list', !no.found && no.hoods.length === 3);
  }

  console.log('\nTest 3: team — record from the newest record-bearing row, newest entries first, no roster');
  {
    const o = D.lookupTeam('the Oaks', tables, { parseWeekRecord: W.parseSportsWeekRecord_ });
    assert('Oaks resolve', o.found && o.team === 'Oaks');
    assert('record 6-1 W2 from the newest game-result, week H:W', o.record.teamRecord === '6-1' && o.record.streak === 'W2' && o.record.week === 'H:W' && o.record.event === 'game-result');
    assert('newest entry first is the Cup opener', /Cup opener/.test(o.rows[0].text));
    assert('A\'s-only rows excluded', o.rows.every(r => !/made it clear/.test(r.text)));
    const ot = D.formatResult(o);
    assert('text says no roster', /carries no roster/.test(ot));
    const a = D.lookupTeam("A's", tables, { parseWeekRecord: W.parseSportsWeekRecord_ });
    assert('A\'s record skips the "-" rows and reads 11-3 from C110 playoffs', a.record.teamRecord === '11-3' && a.record.cycle === 110);
    assert('A\'s season is off-season; text marks the record as last recorded, naming both seasons', a.season === 'off-season' && a.record.current === false && /Last recorded record \(from the playoffs entries, not this off-season\): 11-3/.test(D.formatResult(a)), D.formatResult(a).split('\n')[1]);
    // codex diff F12: a prior season's record under a NEW season's entries is also "last recorded", and recency is Cycle-first, not file order
    const newSeason = D.lookupTeam('Oaks', { feed: [
      { Cycle: '120', SeasonType: 'early-season', EventType: 'player-feature', TeamsUsed: 'Oaks', 'Team Record': '-', Notes: 'camp' },
      { Cycle: '118', SeasonType: 'playoffs', EventType: 'game-result', TeamsUsed: 'Oaks', 'Team Record': '50-32', Streak: 'L1', Notes: 'out' },
      { Cycle: '117', SeasonType: 'regular-season', EventType: 'game-result', TeamsUsed: 'Oaks', 'Team Record': '49-31', Notes: 'late row, older Cycle' }
    ], beatsCycle: 120 }, {});
    assert('prior-season record is last recorded, by Cycle not file order', newSeason.record.teamRecord === '50-32' && newSeason.record.current === false && /Last recorded record \(from the playoffs entries, not this early-season\)/.test(D.formatResult(newSeason)));
    assert('newest entry is the C120 row', newSeason.rows[0].cycle === 120);
    // re-review: the same season label a year apart is not current
    const yearApart = D.lookupTeam('Oaks', { feed: [
      { Cycle: '68', SeasonType: 'early-season', EventType: 'game-result', TeamsUsed: 'Oaks', 'Team Record': '5-1', Notes: 'last year' },
      { Cycle: '120', SeasonType: 'early-season', EventType: 'player-feature', TeamsUsed: 'Oaks', 'Team Record': '-', Notes: 'camp' }
    ], beatsCycle: 120 }, {});
    assert('a record 52 Cycles old under the same label is last recorded, not current', yearApart.record.current === false && /Last recorded record/.test(D.formatResult(yearApart)));
    assert('Athletics / oakland a\'s resolve', D.resolveTeam('Athletics') === "A's" && D.resolveTeam("Oakland A’s") === "A's");
    const none = D.lookupTeam('Warriors', tables, {});
    assert('unknown team -> not found', !none.found);
    const noRec = D.lookupTeam('Oaks', { feed: [{ Cycle: '114', TeamsUsed: 'Oaks', EventType: 'rumor', 'Team Record': '-', Notes: 'x' }], beatsCycle: 114 }, {});
    assert('no usable record -> record null, text says so', noRec.record === null && /No current record on this feed/.test(D.formatResult(noRec)));
  }

  console.log('\nTest 4: business — exact name or BIZ_ID, active first, archive marked closed');
  {
    const b = await D.lookupBusiness('oakland oaks', tables, {});
    assert('active Oaks business found', b.found && b.state === 'active' && b.row.bizId === 'BIZ-00074');
    const byId = await D.lookupBusiness('BIZ-00003', tables, {});
    assert('found by BIZ_ID', byId.found && byId.row.name === 'Discord');
    const z = await D.lookupBusiness('Beth Jacob Congregation', tables, {});
    assert('a canon-duplicate archive row is a retired record, not a closure (codex diff F14)', z.found && z.state === 'retired-duplicate' && z.closed.exitCycle === 108 && z.closed.duplicateOf === 'BIZ-00092');
    assert('retired text names the live record and dates the numbers at the exit', /RETIRED RECORD/.test(D.formatResult(z)) && /of BIZ-00092/.test(D.formatResult(z)) && /as of its exit, C108/.test(D.formatResult(z)) && z.asOfCycle === 108);
    const shut = await D.lookupBusiness('Old Diner', { business: [], businessArchive: [{ BIZ_ID: 'BIZ-00500', Name: 'Old Diner', Sector: 'Food', Neighborhood: 'Laurel', ArchiveReason: 'closure', ExitCycle: '101' }], beatsCycle: 114 }, {});
    assert('a real closure reads CLOSED with its exit Cycle', shut.state === 'closed' && /CLOSED/.test(D.formatResult(shut)) && /exit C101/.test(D.formatResult(shut)));
    const no = await D.lookupBusiness('Oaks', tables, {});
    assert('partial name -> not found (no "never existed")', !no.found && /no business with that exact name/.test(no.reason));
  }

  console.log('\nTest 5: detectEntities — what a message names');
  {
    const e1 = D.detectEntities('Bigs news seems be the A’s championship , The Oaks playing well, Kono have a illness spike', tables);
    assert('KONO + Oaks detected, no citizen', e1.hood === 'KONO' && e1.team === 'Oaks' && e1.citizen === null, JSON.stringify(e1));
    const e2 = D.detectEntities('I heard Adash Stanley was there from the Oaks', tables);
    assert('Adash Stanley + Oaks', e2.citizen === 'Adash Stanley' && e2.team === 'Oaks');
    const e3 = D.detectEntities('Hi mags', tables);
    assert('small talk names nothing', !e3.citizen && !e3.hood && !e3.team && !e3.business);
    const e4 = D.detectEntities("how are the A's doing", tables);
    assert("A's detected with the straight apostrophe", e4.team === "A's");
    const e5 = D.detectEntities('is POP-01089 the Jacob in Glenview', tables);
    assert('POPID wins over a name', e5.citizen === 'POP-01089');
    const e6 = D.detectEntities('we talked on discord about the oakland oaks', tables);
    assert('longest business name wins (Oakland Oaks, not Discord — one per kind)', e6.business === 'Oakland Oaks' && e6.team === 'Oaks');
    const e7 = D.detectEntities('West Oakland is quiet', tables);
    assert('two-word hood detected', e7.hood === 'West Oakland');
    // codex diff F2: comparisons name two; a period in a name; "Athletics" alone is not the A's
    const e8 = D.detectEntities('KONO vs Chinatown sick counts, and A\'s vs Oaks record', tables);
    assert('two hoods and two teams detected', e8.hoods.join(',') === 'Chinatown,KONO' && e8.teams.sort().join(',') === "A's,Oaks", JSON.stringify(e8));
    const t2 = Object.assign({}, tables, { ledger: ledger.concat([{ Name: 'Wendell Carter Jr.', POPID: 'POP-01028', RoleType: 'C, Oakland Oaks', Neighborhood: 'Downtown', Status: 'Active' }]) });
    const e9 = D.detectEntities('Wendell Carter Jr. played for the Oaks', t2);
    assert('a name with a period is found', e9.citizens[0] === 'Wendell Carter Jr.', JSON.stringify(e9));
    const e10 = D.detectEntities('The Athletics program at Oakland City Schools', tables);
    assert('"Athletics program" is not a team', e10.teams.length === 0);
    const e10b = D.detectEntities('How are the Athletics?', tables);
    assert('"the Athletics" is the A\'s', e10b.teams.join() === "A's");
    const e11 = D.detectEntities('Vinnie Keane and Adash Stanley', tables);
    assert('two citizens detected', e11.citizens.length === 2);
  }

  console.log('\nTest 5b: the sports join and unavailable sources');
  {
    const t2 = Object.assign({}, tables, { ledger: ledger.concat([{ Name: 'Wendell Carter Jr.', POPID: 'POP-01028', RoleType: 'C, Oakland Oaks', Neighborhood: 'Downtown', Status: 'Active' }]) });
    const wc = await D.lookupCitizen('POP-01028', t2, {});
    assert('feed rows found without the period (Wendell Carter Jr vs Jr.)', wc.feed.length === 2 && wc.feed[0].cycle === 114, JSON.stringify(wc.feed));
    const partial = D.lookupNeighborhood('KONO', Object.assign({}, tables, { demo: [{ Neighborhood: 'KONO', Students: '61', Adults: '', Seniors: '51', Sick: '17', LastUpdated: '114' }], census: null }), { health: healthDeps, censusTrail: K.censusTrail });
    assert('a missing population cell gives no total and no share (codex diff F10)', partial.people.total === null && partial.illness.share === null && partial.illness.overWatchBar === null);
    const pt = D.formatResult(partial);
    assert('text says the cell is missing and the census source is unavailable (F11)', /missing a population cell/.test(pt) && /source unavailable/.test(pt), pt);
    const unst = D.formatResult(D.lookupTeam('Oaks', { feed: [{ Cycle: '', TeamsUsed: 'Oaks', EventType: 'rumor', 'Team Record': '-', Notes: 'x' }], beatsCycle: null }, {}));
    assert('no stamp prints "?" never "Cnull" (F7)', /as of \?/.test(unst) && !/null/.test(unst), unst);
  }

  console.log('\nTest 5c: records attached are fenced as data');
  {
    const rec = await D.recordsForMessage('How is KONO doing', Object.assign({}, tables, { census: tables.census }));
    assert('attached block is fenced', /^<memory-context source="city-records">/.test(rec.text) && /<\/memory-context>\s*$/.test(rec.text), rec.text.slice(0, 80));
    assert('entities carry lists', rec.entities.hoods.join() === 'KONO' && Array.isArray(rec.entities.citizens));
  }

  console.log('\nTest 6: dispatch — unknown tool is an explicit error, never a search');
  {
    const u = await D.runTool('lookup_moon', { name: 'x' }, tables);
    assert('unknown tool text', /unknown tool lookup_moon/.test(u));
    const t = await D.runTool('lookup_team', { team: 'Oaks' }, tables);
    assert('lookup_team dispatches', /6-1/.test(t));
    const n = await D.runTool('lookup_neighborhood', { name: 'KONO' }, Object.assign({}, tables));
    assert('lookup_neighborhood dispatches via the real readers', /17 sick/.test(n));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(function (e) { console.error('FAIL (threw):', e.stack); process.exit(1); });
