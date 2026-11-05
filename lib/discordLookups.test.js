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
  { Cycle: '114', SeasonType: 'early-season', EventType: 'game-result', TeamsUsed: 'Oaks', NamesUsed: 'Adash Stanley (PG)', Notes: 'Oaks lose in Indiana', 'Team Record': '4-1', Streak: 'L1', WeekRecord: 'A:L' },
  { Cycle: '114', SeasonType: 'off-season', EventType: 'player-feature', TeamsUsed: "A's", NamesUsed: 'Benji Dillon (SP), Vinnie Keane (DH)', Notes: 'Vinnie Keane made it clear. Dillon has not.', 'Team Record': '-', Streak: '-', WeekRecord: '' },
  { Cycle: '114', SeasonType: 'early-season', EventType: 'player-feature', TeamsUsed: 'Oaks', NamesUsed: 'Harry Hayward (PF)', Notes: 'Hayward minutes', 'Team Record': '6-1', Streak: 'W2', WeekRecord: '' },
  { Cycle: '114', SeasonType: 'early-season', EventType: 'game-result', TeamsUsed: 'Oaks', NamesUsed: 'Dillon Brooks (SF), Adash Stanley (PG)', Notes: 'Cup opener win', 'Team Record': '6-1', Streak: 'W2', WeekRecord: 'H:W' }
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
    assert('A\'s season is off-season; text marks the record as last recorded', a.season === 'off-season' && /Last recorded record \(that season is over\): 11-3/.test(D.formatResult(a)));
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
    assert('archived business reads as closed with its exit Cycle', z.found && z.state === 'closed' && z.closed.exitCycle === 108);
    assert('closed text', /CLOSED/.test(D.formatResult(z)) && /exit C108/.test(D.formatResult(z)));
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
