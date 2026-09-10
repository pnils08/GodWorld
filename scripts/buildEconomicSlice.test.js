#!/usr/bin/env node
/**
 * buildEconomicSlice tests — offline against a synthetic beat dump
 * (pipeline.68 Task 2). The builder reads output/beats/ only; a missing or
 * stale dump must throw, never fall back.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  VERSION,
  buildEconomicSlice,
  loadEconomicSlice,
  formatEconomicSliceMarkdown,
  assignmentFromSlice,
  enrichAssignment,
  writeEconomicSlice,
  joinLedgerToRoster,
  seedsForCycle,
  eligibleHoods,
  pickHood,
  isBusinessDesk,
  isFoodSeat,
  slicePaths,
  ECONOMIC_APPROACH,
  FOOD_APPROACH,
  FACTS_TAIL
} = require('./buildEconomicSlice');

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++;
  console.error('  FAIL — ' + label);
}

function writeJsonl(p, rows) {
  fs.writeFileSync(p, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
}

function makeRoot(cycle) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-economic-slice-'));
  const beats = path.join(root, 'output', 'beats');
  fs.mkdirSync(beats, { recursive: true });
  const BL = [
    { BIZ_ID: 'BIZ-00043', Name: 'OakHouse', Sector: 'Restaurant & Dining', Neighborhood: 'Rockridge', Employee_Count: '22', Avg_Salary: '41000', Annual_Revenue: '1800000', Growth_Rate: '4.2', Key_Personnel: 'Dana Okafor' },
    { BIZ_ID: 'BIZ-00050', Name: 'Rockridge Books', Sector: 'Retail', Neighborhood: 'Rockridge', Employee_Count: '6', Avg_Salary: '38000', Annual_Revenue: '400000', Growth_Rate: '1.0', Key_Personnel: '' },
    { BIZ_ID: 'BIZ-00044', Name: 'Harborline Grill', Sector: 'Restaurant & Dining', Neighborhood: 'Jack London', Employee_Count: '7', Avg_Salary: '39000', Annual_Revenue: '900000', Growth_Rate: '5', Key_Personnel: '' },
    { BIZ_ID: 'BIZ-00036', Name: 'Blue Lantern Bar', Sector: 'Nightlife & Entertainment', Neighborhood: 'Jack London', Employee_Count: '30', Avg_Salary: '36000', Annual_Revenue: '2000000', Growth_Rate: '-0.5', Key_Personnel: '' },
    { BIZ_ID: 'BIZ-00060', Name: 'Dockhouse BBQ', Sector: 'Restaurant & Dining', Neighborhood: 'Jack London', Employee_Count: '2', Avg_Salary: '33000', Annual_Revenue: '150000', Growth_Rate: '5', Key_Personnel: '' },
    { BIZ_ID: 'BIZ-00009', Name: 'Oakmesh Systems', Sector: 'Civic Tech', Neighborhood: 'West Oakland', Employee_Count: '46', Avg_Salary: '140000', Annual_Revenue: '30000000', Growth_Rate: '9', Key_Personnel: 'POP-00789 Marcus Tan (Founder)' },
    { BIZ_ID: 'BIZ-00017', Name: 'City of Oakland', Sector: 'Municipal Government', Neighborhood: 'Downtown', Employee_Count: '1202', Avg_Salary: '80000', Annual_Revenue: '0', Growth_Rate: '0', Key_Personnel: '' },
    { BIZ_ID: 'BIZ-00016', Name: 'Oakland Unified School District', Sector: 'Education', Neighborhood: 'City-wide', Employee_Count: '5201', Avg_Salary: '70000', Annual_Revenue: '0', Growth_Rate: '0', Key_Personnel: '' },
    { BIZ_ID: 'BIZ-00070', Name: 'Glenview Hardware', Sector: 'Retail', Neighborhood: 'Glenview', Employee_Count: '4', Avg_Salary: '35000', Annual_Revenue: '300000', Growth_Rate: '2', Key_Personnel: '' }
  ];
  const ER = [
    { BIZ_ID: 'BIZ-00043', POP_ID: 'POP-00900', CitizenName: 'Rosa Delgado', RoleType: 'Line Cook', Status: 'Active', MappingLayer: 'existing' },
    { BIZ_ID: 'BIZ-00043', POP_ID: 'POP-00901', CitizenName: 'Ben Achebe', RoleType: 'Pastry Chef', Status: 'Active', MappingLayer: 'existing' },
    { BIZ_ID: 'BIZ-00043', POP_ID: 'POP-00902', CitizenName: 'Gone Person', RoleType: 'Server', Status: 'Inactive', MappingLayer: 'existing' },
    { BIZ_ID: 'BIZ-00044', POP_ID: 'POP-00903', CitizenName: 'Tomas Renteria', RoleType: 'Line Cook', Status: 'Active', MappingLayer: 'existing' },
    { BIZ_ID: 'BIZ-00036', POP_ID: 'POP-00904', CitizenName: 'Yuki Ji', RoleType: 'Bartender', Status: 'Active', MappingLayer: 'existing' },
    { BIZ_ID: 'BIZ-00009', POP_ID: 'POP-00905', CitizenName: 'Priya Natarajan', RoleType: 'Civic Data Engineer', Status: 'Active', MappingLayer: 'existing' },
    { BIZ_ID: 'BIZ-00017', POP_ID: 'POP-00906', CitizenName: 'Avery Santana', RoleType: 'Mayor of Oakland', Status: 'Active', MappingLayer: 'existing' },
    { BIZ_ID: 'BIZ-00016', POP_ID: 'POP-00907', CitizenName: 'A Teacher', RoleType: 'Teacher', Status: 'Active', MappingLayer: 'existing' },
    { BIZ_ID: 'SELF_EMPLOYED', POP_ID: 'POP-00908', CitizenName: 'Solo Painter', RoleType: 'Painter', Status: 'SELF_EMPLOYED', MappingLayer: 'keyword' },
    { BIZ_ID: 'UNTRACKED', POP_ID: 'POP-00909', CitizenName: 'Nobody Tracked', RoleType: 'Janitor', Status: 'UNTRACKED', MappingLayer: 'unmatched' }
  ];
  const SEEDS = [
    { Cycle: String(cycle), SeedID: 'aaa', Desk: 'business', Class: 'major', Domain: 'ECONOMIC', Neighborhood: 'Jack London', What: 'carryover +23.6', Why: 'x', Citizens: 'POP-00835 Mei-Lin Kang; POP-00878 Quynh Le', CitizenEvents: 'Mei-Lin Kang — tried a new recipe | Quynh Le — read the Tribune twice', Businesses: 'BIZ-00020 Baylight Construction Authority', OtherEntities: '', Magnitude: '23.6', Trend: 'carrying', SuggestedJournalist: 'Jordan Velez', SuggestedAngle: 'baseline' },
    { Cycle: String(cycle - 1), SeedID: 'old', Desk: 'business', Class: 'major', Domain: 'ECONOMIC', Neighborhood: 'Rockridge', What: 'old', Why: 'x', Citizens: 'POP-00001 Stale Seed', CitizenEvents: '', Businesses: '', OtherEntities: '', Magnitude: '1', Trend: '' },
    { Cycle: String(cycle), SeedID: 'civ', Desk: 'civic', Class: 'major', Domain: 'CIVIC', Neighborhood: 'Rockridge', What: 'civic', Why: 'x', Citizens: 'POP-00002 Civic Seed', CitizenEvents: '', Businesses: '', OtherEntities: '', Magnitude: '1', Trend: '' }
  ];
  const HOOKS = [
    { Cycle: String(cycle), HookId: 'bh1', HookType: 'signal', Domain: 'BUSINESS', Neighborhood: 'Jack London', Priority: '3', HookText: 'Notable event: "Harborline Grill posts a record week". Follow-up recommended.', SuggestedDesks: 'Business Desk', SuggestedJournalist: 'Jordan Velez', SuggestedAngle: '' },
    { Cycle: String(cycle - 1), HookId: 'bh0', HookType: 'signal', Domain: 'BUSINESS', Neighborhood: '', Priority: '3', HookText: 'STALE business hook.', SuggestedDesks: 'Business Desk', SuggestedJournalist: 'Jordan Velez', SuggestedAngle: '' }
  ];
  const ARCHIVE = [
    { BIZ_ID: 'BIZ-00091', Name: 'Fruitvale Fruit Carts', Sector: 'Food & Beverage', Neighborhood: 'Fruitvale', Employee_Count: '0', Avg_Salary: '30000', Annual_Revenue: '80000', Growth_Rate: '-15', Key_Personnel: 'Maria Foo', ArchiveReason: 'closed', ExitCycle: String(cycle), SourceEventId: 'engine.96:BIZ-00091:C' + cycle, ClosedCycle: String(cycle) },
    { BIZ_ID: 'BIZ-00090', Name: 'Old Closure', Sector: 'Retail', Neighborhood: 'Glenview', Employee_Count: '0', Avg_Salary: '', Annual_Revenue: '', Growth_Rate: '', Key_Personnel: '', ArchiveReason: 'closed', ExitCycle: '98', SourceEventId: 'engine.96:BIZ-00090:C98', ClosedCycle: '98' }
  ];
  const CASINO = [
    { WagerId: 'HOUSE', HouseFloatAfter: '250000' },
    { WagerId: 'W1', CyclePlaced: String(cycle - 1), CycleSettled: String(cycle), POPID: 'POP-00910', HouseholdId: '', MarketFamily: 'sports', Side: 'home', Stake: '500', Odds: '2.1', Payout: '2100', Status: 'settled' },
    { WagerId: 'W2', CyclePlaced: String(cycle), CycleSettled: '', POPID: 'POP-00900', HouseholdId: '', MarketFamily: 'civic', Side: 'yes', Stake: '200', Odds: '1.8', Payout: '', Status: 'placed' },
    // Untracked patron — no ledger row, never prints a name.
    { WagerId: 'W3', CyclePlaced: String(cycle), CycleSettled: '', POPID: 'POP-99999', HouseholdId: '', MarketFamily: 'sports', Side: 'away', Stake: '100', Odds: '1.5', Payout: '', Status: 'placed' }
  ];
  // The prior-cycle dump: OakHouse shed 3 workers and grew revenue; Blue
  // Lantern shed 4 with growth gone negative (the contraction); Temescal
  // Widgets vanished with no archive row.
  const PREV_BL = [
    { BIZ_ID: 'BIZ-00043', Name: 'OakHouse', Sector: 'Restaurant & Dining', Neighborhood: 'Rockridge', Employee_Count: '25', Avg_Salary: '41000', Annual_Revenue: '1750000', Growth_Rate: '4.2', Key_Personnel: 'Dana Okafor' },
    { BIZ_ID: 'BIZ-00036', Name: 'Blue Lantern Bar', Sector: 'Nightlife & Entertainment', Neighborhood: 'Jack London', Employee_Count: '34', Avg_Salary: '36000', Annual_Revenue: '2000000', Growth_Rate: '2.0', Key_Personnel: '' },
    { BIZ_ID: 'BIZ-00077', Name: 'Temescal Widgets', Sector: 'Manufacturing', Neighborhood: 'Temescal', Employee_Count: '12', Avg_Salary: '40000', Annual_Revenue: '600000', Growth_Rate: '-1', Key_Personnel: '' }
  ];
  writeJsonl(path.join(beats, 'Business_Ledger.jsonl'), BL);
  writeJsonl(path.join(beats, 'Employment_Roster.jsonl'), ER);
  writeJsonl(path.join(beats, 'Story_Seed_Deck.jsonl'), SEEDS);
  writeJsonl(path.join(beats, 'Story_Hook_Deck.jsonl'), HOOKS);
  writeJsonl(path.join(beats, 'Business_Archive.jsonl'), ARCHIVE);
  writeJsonl(path.join(beats, 'Casino_Ledger.jsonl'), CASINO);
  writeJsonl(path.join(root, 'output', 'simulation_ledger_snapshot.jsonl'), [
    { POPID: 'POP-00900', Name: 'Rosa Delgado', RoleType: 'Line Cook', Neighborhood: 'Rockridge' },
    { POPID: 'POP-00910', Name: 'Test Bettor', RoleType: 'Mechanic', Neighborhood: 'Fruitvale' }
  ]);
  const prevDir = path.join(beats, 'prev');
  fs.mkdirSync(prevDir, { recursive: true });
  writeJsonl(path.join(prevDir, 'Business_Ledger.jsonl'), PREV_BL);
  fs.writeFileSync(path.join(prevDir, 'meta.json'), JSON.stringify({ cycle: cycle - 1, rows: { Business_Ledger: PREV_BL.length } }));
  fs.writeFileSync(path.join(beats, 'meta.json'), JSON.stringify({
    cycle, rows: { Business_Ledger: BL.length, Employment_Roster: ER.length, Story_Seed_Deck: SEEDS.length,
      Story_Hook_Deck: HOOKS.length, Business_Archive: ARCHIVE.length, Casino_Ledger: CASINO.length }
  }));
  return root;
}

const CYCLE = 106;
const root = makeRoot(CYCLE);

console.log('join:');
{
  const BL = JSON.parse('[' + fs.readFileSync(path.join(root, 'output', 'beats', 'Business_Ledger.jsonl'), 'utf8').trim().split('\n').join(',') + ']');
  const ER = JSON.parse('[' + fs.readFileSync(path.join(root, 'output', 'beats', 'Employment_Roster.jsonl'), 'utf8').trim().split('\n').join(',') + ']');
  const joined = joinLedgerToRoster(BL, ER);
  const oak = joined.find(b => b.bizId === 'BIZ-00043');
  ok('OakHouse has 2 Active staff (Inactive dropped)', oak && oak.staff.length === 2 && !oak.staff.some(s => s.name === 'Gone Person'));
  ok('numbers parsed', oak.employeeCount === 22 && oak.growthRate === 4.2);
  ok('Key_Personnel POPID tags never reach a fact line', joined.find(b => b.bizId === 'BIZ-00009').keyPersonnel === 'Marcus Tan (Founder)');
  ok('SELF_EMPLOYED / UNTRACKED never attach', !joined.some(b => b.staff.some(s => /Solo Painter|Nobody Tracked/.test(s.name))));
  const pool = eligibleHoods(joined);
  ok('Glenview (no staff) not eligible', !pool.some(h => h.hood === 'Glenview'));
  ok('City-wide never a hood', !pool.some(h => /city-wide/i.test(h.hood)));
  ok('Rockridge eligible', pool.some(h => h.hood === 'Rockridge'));
  const cov = new Map([['rockridge', 105], ['jack london', 103]]);
  const picked = pickHood(pool.filter(h => /Rockridge|Jack London/.test(h.hood)), cov);
  ok('LRU picks the older-covered hood', picked && picked.hood === 'Jack London');
  const never = pickHood(pool, cov);
  ok('never-covered hood beats any covered one', never && !cov.has(never.hood.toLowerCase()));
}

console.log('seeds:');
{
  const rows = JSON.parse('[' + fs.readFileSync(path.join(root, 'output', 'beats', 'Story_Seed_Deck.jsonl'), 'utf8').trim().split('\n').join(',') + ']');
  const seeds = seedsForCycle(rows, CYCLE);
  ok('only this cycle, business desk', seeds.length === 1 && seeds[0].seedId === 'aaa');
  ok('citizens parsed with popids', seeds[0].citizens[0].popid === 'POP-00835' && seeds[0].citizens[0].name === 'Mei-Lin Kang');
  ok('citizenEvents split', seeds[0].citizenEvents.length === 2);
  ok('businesses parsed', seeds[0].businesses[0].name === 'Baylight Construction Authority');
}

console.log('business variant:');
{
  const slice = buildEconomicSlice(CYCLE, { root, coverage: new Map() });
  ok('not empty', slice && !slice.empty);
  ok('version stamped', slice.version === VERSION && slice.variant === 'business');
  ok('public sector excluded (City of Oakland never on a business slice)',
    !slice.businesses.some(b => /City of Oakland/.test(b.name)) &&
    !slice.candidates.some(c => c.hood === 'Downtown'));
  ok('picked hood has a staffed business', slice.businesses.some(b => b.staff.length > 0));
  ok('story.citizens are "Name (POP-xxxxx)"', slice.story.citizens.length > 0 &&
    slice.story.citizens.every(c => /^.+ \(POP-\d+\)$/.test(c)));
  ok('every named worker resolves to a roster row at a listed business',
    slice.story.popids.every(p => slice.businesses.some(b => b.staff.some(s => s.popid === p)) ||
      slice.seeds.some(s => s.citizens.some(c => c.popid === p))));
  ok('pulse.hood + story.hood kept for LRU readers', slice.pulse.hood === slice.hood && slice.story.hood === slice.hood);
  ok('approach carries the §13 tail', slice.approach.endsWith(FACTS_TAIL) && slice.approach === ECONOMIC_APPROACH);
  ok('no "packet-backed" / "do not lead with decimals" framing', !/packet-backed|raw engine decimals|RetailVitality/i.test(JSON.stringify(slice)));
  ok('anchor facts carry no POP-/BIZ- literals', !slice.prewrite.anchorFacts.some(f => /POP-\d|BIZ-\d/.test(f)));
  const md = formatEconomicSliceMarkdown(slice);
  ok('md names a business and a worker', /\*\*Oakmesh Systems\*\*|\*\*OakHouse\*\*|\*\*Harborline Grill\*\*/.test(md) && /Priya Natarajan|Rosa Delgado|Tomas Renteria/.test(md));
  ok('md lists the rotation pool', /## ROTATION/.test(md));
  const a = assignmentFromSlice(slice, { name: 'Jordan Velez', popid: 'POP-TEST', desk: 'business' });
  ok('assignment carries slice', a && a.economicSlice === true && a.economicVariant === 'business' && a.desk === 'business');

  console.log('movement / closures / casino / hooks (business variant):');
  const blb = slice.businesses.find(b => b.name === 'Blue Lantern Bar');
  ok('delta attached from prev/', !!blb && !!blb.delta && blb.delta.employees === -4 && blb.delta.vsCycle === CYCLE - 1);
  ok('movement in the fact line', slice.prewrite.anchorFacts.some(f => /Blue Lantern Bar · Nightlife & Entertainment · 30 employees \(-4 vs C105\)/.test(f)));
  ok('no delta clause when nothing moved', slice.prewrite.anchorFacts.some(f => /Harborline Grill · Restaurant & Dining · 7 employees · /.test(f) && !/Harborline Grill.*vs C105/.test(f)));
  ok('deltas typed with the prev cycle', slice.deltas.state === 'PRIOR_CYCLE_ON_DISK' && slice.deltas.vs === CYCLE - 1);
  ok('closure from the archive', slice.closures.some(c => c.name === 'Fruitvale Fruit Carts' && c.reason === 'closed' && /Business_Archive/.test(c.src)));
  ok('gone without an archive row is a diff closure', slice.closures.some(c => c.name === 'Temescal Widgets' && /no archive row/.test(c.reason)));
  ok('old archive rows are not this cycle\'s news', !slice.closures.some(c => c.name === 'Old Closure'));
  ok('closure leads the hook', /^CLOSED: /.test(slice.story.hookLine) && /Fruitvale Fruit Carts/.test(slice.story.hookLine));
  ok('contraction watch: Blue Lantern (shed 4, growth -0.5%)', slice.contractionWatch.length === 1 && slice.contractionWatch[0].name === 'Blue Lantern Bar' && slice.contractionWatch[0].delta.employees === -4);
  ok('contraction watch spares growers (OakHouse shed 3 but grows)', !slice.contractionWatch.some(c => c.name === 'OakHouse'));
  ok('casino: settled wager named via the ledger snapshot', slice.casino.wagers.some(g => g.name === 'Test Bettor' && g.settled && g.payout === 2100));
  ok('casino: placed wager named', slice.casino.wagers.some(g => g.name === 'Rosa Delgado' && !g.settled && g.stake === 200));
  ok('casino: untracked patron never prints', !JSON.stringify(slice.casino).includes('POP-99999'));
  ok('casino: house float carried', slice.casino.houseFloat === 250000);
  ok('casino bettors are candidates, not story.citizens', slice.citizens.some(c => c.popid === 'POP-00910' && /Casino_Ledger/.test(c.why)) && !slice.story.citizens.some(t => /Test Bettor/.test(t)));
  ok('BUSINESS hook reaches the slice; the stale one does not', slice.prewrite.hooks.length === 1 && /Harborline Grill posts a record week/.test(slice.prewrite.hooks[0].text));
  ok('every evidence line is sourced to a file on disk', slice.prewrite.evidence.length === slice.prewrite.anchorFacts.length &&
    slice.prewrite.evidence.every(e => /^output\//.test(e.src)));
  const mdV3 = formatEconomicSliceMarkdown(slice);
  ok('md carries the new sections', /## CLOSED \/ GONE THIS CYCLE/.test(mdV3) && /## CONTRACTION WATCH/.test(mdV3) && /## THE CASINO THIS CYCLE/.test(mdV3) && /## ENGINE HOOKS/.test(mdV3));
}

console.log('movement: no prev/ → typed NO_PRIOR_CYCLE, archive closures still reported');
{
  const root2 = makeRoot(CYCLE);
  fs.rmSync(path.join(root2, 'output', 'beats', 'prev'), { recursive: true, force: true });
  const s2 = buildEconomicSlice(CYCLE, { root: root2, coverage: new Map() });
  ok('NO_PRIOR_CYCLE', s2.deltas.state === 'NO_PRIOR_CYCLE' && s2.deltas.vs === null);
  ok('no deltas, no watch, no diff closures', !s2.businesses.some(b => b.delta) && s2.contractionWatch.length === 0 &&
    !s2.closures.some(c => c.name === 'Temescal Widgets'));
  ok('archive closures still reported without prev/', s2.closures.some(c => c.name === 'Fruitvale Fruit Carts'));
  fs.rmSync(root2, { recursive: true, force: true });
}

console.log('food variant:');
{
  const slice = buildEconomicSlice(CYCLE, { root, foodFilter: true, coverage: new Map() });
  ok('not empty', slice && !slice.empty);
  ok('variant food', slice.variant === 'food' && slice.kind === 'food-workplaces');
  ok('picks the hood with the most staffed kitchens when nothing was covered', slice.hood === 'Jack London');
  ok('only food sectors', slice.businesses.every(b => /Restaurant|Nightlife|Cafe|Food|Bar/i.test(b.sector)));
  ok('Oakmesh never on a food slice', !JSON.stringify(slice.businesses).includes('Oakmesh'));
  ok('unstaffed kitchen listed but flagged as paintable', slice.businesses.some(b => b.name === 'Dockhouse BBQ' && b.staff.length === 0));
  ok('seed for the hood attached (this cycle only)', slice.seeds.length === 1 && slice.seeds[0].seedId === 'aaa');
  ok('seed citizens join story.citizens', slice.story.citizens.includes('Mei-Lin Kang (POP-00835)'));
  ok('food approach', slice.approach === FOOD_APPROACH && /kitchens as workplaces/i.test(slice.approach));
  ok('lead worker in hook, role casing kept (biggest staffed kitchen leads)', /Yuki Ji, Bartender at Blue Lantern Bar/.test(slice.story.hookLine));
  ok('food variant: the closed kitchen is Mason\'s story too', slice.closures.some(c => c.name === 'Fruitvale Fruit Carts'));
  ok('food variant: non-food closures stay with the business desk', !slice.closures.some(c => c.name === 'Temescal Widgets'));
  ok('food variant: no casino, no contraction watch', slice.casino === null && slice.contractionWatch.length === 0);
}

console.log('rotation across cycles:');
{
  const first = buildEconomicSlice(CYCLE, { root, foodFilter: true });
  writeEconomicSlice(CYCLE, first, root, { foodFilter: true });
  ok('first food pick Jack London', first.hood === 'Jack London');
  // next cycle: re-stamp the dump and expect the other hood
  const meta = path.join(root, 'output', 'beats', 'meta.json');
  const m = JSON.parse(fs.readFileSync(meta, 'utf8')); m.cycle = CYCLE + 1; fs.writeFileSync(meta, JSON.stringify(m));
  const second = buildEconomicSlice(CYCLE + 1, { root, foodFilter: true });
  ok('second food pick rotates to Rockridge', second.hood === 'Rockridge');
  ok('rotation records last covered', second.rotation.pool.some(h => h.hood === 'Jack London' && h.lastCovered === CYCLE));
  // variants do not share a cache path
  const pb = slicePaths(CYCLE, root, {});
  const pf = slicePaths(CYCLE, root, { foodFilter: true });
  ok('variant artifact paths differ', pb.json !== pf.json && pb.md !== pf.md);
  m.cycle = CYCLE; fs.writeFileSync(meta, JSON.stringify(m));
}

console.log('load + cache:');
{
  const stale = slicePaths(CYCLE, root, {});
  fs.mkdirSync(path.dirname(stale.json), { recursive: true });
  fs.writeFileSync(stale.json, JSON.stringify({ empty: false, cycle: CYCLE, pulse: { hood: 'Old Shape' }, story: {} }));
  const loaded = loadEconomicSlice(CYCLE, root);
  ok('old-shape cache rebuilt, not served', loaded && loaded.version === VERSION && loaded.hood !== 'Old Shape');
  const again = loadEconomicSlice(CYCLE, root, {});
  ok('fresh cache served', again && again.hood === loaded.hood);
  const food = loadEconomicSlice(CYCLE, { root, foodFilter: true });
  ok('opts as second positional accepted', food && food.variant === 'food');
}

console.log('enrichAssignment:');
{
  ok('isBusinessDesk', isBusinessDesk({ desk: 'business' }) && !isBusinessDesk({ desk: 'sports' }));
  ok('isFoodSeat by slug and by name', isFoodSeat({ persona: 'mason-ortega' }) && isFoodSeat({ name: 'Mason Ortega', desk: 'culture' }) && !isFoodSeat({ name: 'Kai Marston' }));
  const biz = enrichAssignment({ desk: 'business', name: 'Jordan Velez' }, CYCLE, root);
  ok('business seat enriched', biz.economicSlice === true && biz.economicVariant === 'business' && biz.story && biz.story.citizens.length);
  const mason = enrichAssignment({ desk: 'culture', persona: 'mason-ortega', name: 'Mason Ortega' }, CYCLE, root);
  ok('Mason gets the food variant', mason.economicSlice === true && mason.economicVariant === 'food' && /kitchens/i.test(mason.approach));
  const sports = { desk: 'sports', persona: 'p-slayer' };
  ok('other seats untouched', enrichAssignment(sports, CYCLE, root) === sports);
}

console.log('fail loud:');
{
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-economic-slice-bare-'));
  let msg = null;
  try { buildEconomicSlice(CYCLE, { root: bare }); } catch (e) { msg = e.message; }
  ok('missing dump throws naming the dump script', !!msg && /beat dump missing/.test(msg) && /dumpBeatTabs\.js 106/.test(msg));
  msg = null;
  try { buildEconomicSlice(CYCLE + 5, { root }); } catch (e) { msg = e.message; }
  ok('stale dump throws naming both cycles', !!msg && /C106/.test(msg) && /C111/.test(msg));
  msg = null;
  try { enrichAssignment({ desk: 'business' }, CYCLE + 5, root); } catch (e) { msg = e.message; }
  ok('enrichAssignment does not swallow the throw', !!msg && /beat dump/.test(msg));
  fs.rmSync(bare, { recursive: true, force: true });
}

fs.rmSync(root, { recursive: true, force: true });

if (failures) {
  console.error('\nbuildEconomicSlice tests: ' + failures + ' FAILURE(S)');
  process.exit(1);
}
console.log('\nbuildEconomicSlice tests: PASS');
