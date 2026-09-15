#!/usr/bin/env node
/**
 * beatSlices.test.js — the six per-journalist beat slices (pipeline.68 Task 4)
 * against a synthetic beat dump. Each builder reads only its tabs, names only
 * people the record names, and throws (never falls back) on a missing or stale dump.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const transit = require('./buildTransitSlice');
const health = require('./buildHealthSlice');
const schools = require('./buildSchoolsSlice');
const environment = require('./buildEnvironmentSlice');
const faith = require('./buildFaithSlice');
const safety = require('./buildSafetySlice');
const arts = require('./buildArtsSlice');
const lifestyle = require('./buildLifestyleSlice');
const neighborhood = require('./buildNeighborhoodSlice');
const v2 = require('./livedExperiencePacketV2');

const CYCLE = 103;
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-beat-slices-'));

function writeJsonl(file, rows) {
  fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join('\n') + '\n');
}

function writeDump(dir, cycle) {
  fs.mkdirSync(dir, { recursive: true });
  const tabs = {
    Transit_Metrics: [
      { Cycle: String(cycle - 1), Station: 'Test Central', RidershipVolume: '1000', OnTimePerformance: '0.80', TrafficIndex: '50', Corridor: '', Notes: 'light' },
      { Cycle: String(cycle - 1), Station: 'Test North', RidershipVolume: '500', OnTimePerformance: '0.90', TrafficIndex: '40', Corridor: '', Notes: '' },
      { Cycle: String(cycle), Station: 'Test Central', RidershipVolume: '1600', OnTimePerformance: '0.75', TrafficIndex: '55', Corridor: 'Test Corridor', Notes: 'above-average ridership' },
      { Cycle: String(cycle), Station: 'Test North', RidershipVolume: '450', OnTimePerformance: '0.92', TrafficIndex: '40', Corridor: '', Notes: '', Factors: 'game day: Test Park; storm front' },
      // Corridor rows carry no Station — they used to collide under '' in the
      // prev-cycle lookup; these two must produce DISTINCT deltas.
      { Cycle: String(cycle - 1), Station: '', RidershipVolume: '0', OnTimePerformance: '0.85', TrafficIndex: '50', Corridor: 'Test Freeway', Notes: 'moderate delays' },
      { Cycle: String(cycle - 1), Station: '', RidershipVolume: '0', OnTimePerformance: '0.85', TrafficIndex: '40', Corridor: 'Test Avenue', Notes: 'light traffic' },
      { Cycle: String(cycle), Station: '', RidershipVolume: '0', OnTimePerformance: '0.85', TrafficIndex: '65', Corridor: 'Test Freeway', Notes: 'heavy congestion; weather-related slowdowns' },
      { Cycle: String(cycle), Station: '', RidershipVolume: '0', OnTimePerformance: '0.85', TrafficIndex: '38', Corridor: 'Test Avenue', Notes: 'light traffic' }
    ],
    Crime_Metrics: [
      { Neighborhood: 'Fruitvale', PropertyCrimeIndex: '40', ViolentCrimeIndex: '30', ResponseTimeAvg: '8.1', ClearanceRate: '0.2', IncidentCount: '9', LastUpdated: String(cycle) },
      { Neighborhood: 'Rockridge', PropertyCrimeIndex: '20', ViolentCrimeIndex: '10', ResponseTimeAvg: '12.4', ClearanceRate: '0.4', IncidentCount: '3', LastUpdated: String(cycle) }
    ],
    Neighborhood_Demographics: [
      { Neighborhood: 'Rockridge', Students: '223', Adults: '2000', Seniors: '300', Unemployed: '50', Sick: '60', SchoolQualityIndex: '9', GraduationRate: '95', CollegeReadinessRate: '78', TeacherQuality: '9', Funding: '15000' },
      { Neighborhood: 'Chinatown', Students: '180', Adults: '2100', Seniors: '400', Unemployed: '70', Sick: '125', SchoolQualityIndex: '7', GraduationRate: '87', CollegeReadinessRate: '56', TeacherQuality: '7', Funding: '12000' },
      { Neighborhood: 'Fruitvale', Students: '200', Adults: '1900', Seniors: '250', Unemployed: '60', Sick: '110', SchoolQualityIndex: '8', GraduationRate: '90', CollegeReadinessRate: '60', TeacherQuality: '8', Funding: '13000' },
      { Neighborhood: 'Downtown', Students: '300', Adults: '5000', Seniors: '600', Unemployed: '80', Sick: '', SchoolQualityIndex: '8', GraduationRate: '90', CollegeReadinessRate: '60', TeacherQuality: '8', Funding: '14000' }
    ],
    Cultural_Ledger: [
      { 'CUL-ID': 'CUL-T1', Name: 'Test Rising Musician', RoleType: 'Musician', FameCategory: 'musician', CulturalDomain: 'Arts', Status: 'Active', UniverseLinks: 'POP-90001', FirstSeenCycle: '80', LastSeenCycle: String(cycle), MediaCount: '7', FameScore: '34', TrendTrajectory: 'rising', CityTier: 'Local', Neighborhood: 'Temescal' },
      { 'CUL-ID': 'CUL-T2', Name: 'Test Fading Actor', RoleType: 'Actor', FameCategory: 'actor', CulturalDomain: 'Media', Status: 'Active', UniverseLinks: '', FirstSeenCycle: '60', LastSeenCycle: '98', MediaCount: '21', FameScore: '58', TrendTrajectory: 'fading', CityTier: 'City', Neighborhood: 'Piedmont Ave' },
      { 'CUL-ID': 'CUL-T3', Name: 'Test New Chef', RoleType: 'Chef', FameCategory: 'chef', CulturalDomain: 'Culinary', Status: 'Active', UniverseLinks: 'POP-90003', FirstSeenCycle: String(cycle), LastSeenCycle: String(cycle), MediaCount: '1', FameScore: '12', TrendTrajectory: 'quiet', CityTier: 'Local', Neighborhood: 'Fruitvale' },
      // Inactive — never rides a slice.
      { 'CUL-ID': 'CUL-T4', Name: 'Test Retired Poet', RoleType: 'Poet', CulturalDomain: 'Literature', Status: 'inactive', UniverseLinks: '', FirstSeenCycle: '40', LastSeenCycle: '70', MediaCount: '3', FameScore: '44', TrendTrajectory: 'quiet', CityTier: 'City', Neighborhood: 'Downtown' }
    ],
    Hospital_Ledger: [
      { POPID: 'POP-90003', Name: 'Test Clinic Patient', Neighborhood: 'Temescal', Cause: 'a workplace accident', AdmitCycle: String(cycle), StatusNow: 'critical' },
      { POPID: 'POP-90002', Name: 'Test Pro Athlete', Neighborhood: 'Downtown', Cause: 'a slide', AdmitCycle: String(cycle), StatusNow: 'recovering' }
    ],
    Health_Cause_Queue: [
      { POPID: 'POP-90007', Name: 'Test Queue Patient', Status: 'recovering', StatusStartCycle: '102', CyclesSick: '2', Neighborhood: 'Chinatown', Age: '67', AssignedCause: 'car accident', Processed: '' },
      // Fossil from the retired intake export — zeroed counters, never rides the slice.
      { POPID: 'POP-90008', Name: 'Test Fossil Patient', Status: 'recovering', StatusStartCycle: '0', CyclesSick: '0', Neighborhood: 'Uptown', Age: '79', AssignedCause: 'broken leg', Processed: '' },
      // Already processed by the media room — done, not story material.
      { POPID: 'POP-90009', Name: 'Test Processed Patient', Status: 'active', StatusStartCycle: '101', CyclesSick: '3', Neighborhood: 'Downtown', Age: '50', AssignedCause: 'pneumonia', Processed: 'yes' }
    ],
    Cycle_Weather: [
      { CycleID: String(cycle - 2), Type: 'rain', Temp: '48', Comfort: '0.2', Mood: 'introspective', Streak: '1', StreakType: 'rain' },
      { CycleID: String(cycle - 1), Type: 'rain', Temp: '49', Comfort: '0.2', Mood: 'introspective', Streak: '2', StreakType: 'rain' },
      { CycleID: String(cycle), Type: 'overcast', Temp: '52', Comfort: '0.5', Mood: 'neutral', Streak: '1', StreakType: 'overcast' }
    ],
    Faith_Organizations: [
      { Organization: 'Test Fellowship', FaithTradition: 'Protestant', Neighborhood: 'Downtown', Congregation: '450', Leader: 'Rev. Test Leader', LeaderPOPID: 'POP-90010', MembersList: '["POP-90001"]', ActiveStatus: 'active' },
      { Organization: 'Test Temple', FaithTradition: 'Buddhist', Neighborhood: 'Chinatown', Congregation: '300', Leader: 'Rev. Test Monk', LeaderPOPID: 'POP-90011', MembersList: '[]', ActiveStatus: 'active' }
    ],
    Community_Programs: [
      { Program_ID: 'PRG-T', Name: 'Test Program', Founder_POPID: 'POP-90001', Neighborhood: 'Downtown', Type: 'mutual-aid', Status: 'active', Founded_Cycle: '100' }
    ],
    Faith_Ledger: [
      { Timestamp: 't3', Cycle: String(cycle), Organization: 'Test Temple', FaithTradition: 'Buddhist', EventType: 'holy_day', EventDescription: 'Vesak observance held', Neighborhood: 'Chinatown', Attendance: '120', Status: 'occurred' },
      { Timestamp: 't2', Cycle: String(cycle - 1), Organization: 'Test Fellowship', FaithTradition: 'Protestant', EventType: 'crisis_response', EventDescription: 'emergency assistance fund activated', Neighborhood: 'Downtown', Attendance: '', Status: 'occurred' },
      // Nine cycles back — outside the 7-cycle window of a weekly seat.
      { Timestamp: 't1', Cycle: String(cycle - 9), Organization: 'Test Fellowship', FaithTradition: 'Protestant', EventType: 'outreach', EventDescription: 'STALE event outside the window', Neighborhood: 'Downtown', Attendance: '30', Status: 'occurred' }
    ],
    Employment_Roster: [
      { BIZ_ID: 'BIZ-T-TRANSIT', POP_ID: 'POP-90020', CitizenName: 'Test Operator', RoleType: 'Transit Operator (AC Transit)', Status: 'Active', MappingLayer: 'existing' },
      { BIZ_ID: 'BIZ-T-BAR', POP_ID: 'POP-90021', CitizenName: 'Test Bartender', RoleType: 'Bartender', Status: 'Active', MappingLayer: 'existing' },
      { BIZ_ID: 'BIZ-T-TRANSIT', POP_ID: 'POP-90022', CitizenName: 'Gone Operator', RoleType: 'Bus driver', Status: 'Inactive', MappingLayer: 'existing' },
      { BIZ_ID: 'BIZ-T-OPD', POP_ID: 'POP-90023', CitizenName: 'Test Chief', RoleType: 'Police Chief', Status: 'Active', MappingLayer: 'existing' },
      { BIZ_ID: 'BIZ-T-FARM', POP_ID: 'POP-90024', CitizenName: 'Test Farmer', RoleType: 'Vertical Farm Systems Engineer', Status: 'Active', MappingLayer: 'existing' }
    ],
    Business_Ledger: [
      { BIZ_ID: 'BIZ-T-TRANSIT', Name: 'Test Transit Agency', Sector: 'Public Transit', Neighborhood: 'Downtown', Employee_Count: '100' },
      { BIZ_ID: 'BIZ-T-BAR', Name: 'BART Bar', Sector: 'Bar / nightlife', Neighborhood: 'Downtown', Employee_Count: '5' },
      { BIZ_ID: 'BIZ-T-OPD', Name: 'Test Police Department', Sector: 'Public Safety', Neighborhood: 'Downtown', Employee_Count: '700' },
      { BIZ_ID: 'BIZ-T-FARM', Name: 'Test Farm Systems', Sector: 'Science', Neighborhood: 'Downtown', Employee_Count: '9' },
      // The district card (BIZ-00016 by ID — canon.5 holds the rename)
      { BIZ_ID: 'BIZ-00016', Name: 'Test Unified School District', Sector: 'Education', Neighborhood: 'City-wide', Employee_Count: '5201', Avg_Salary: '74000', Annual_Revenue: '-15', Growth_Rate: '8' }
    ],
    Story_Hook_Deck: [
      { Cycle: String(cycle), HookId: 'h1', HookType: 'cluster', Domain: 'HEALTH', Neighborhood: 'Chinatown', Priority: '3', HookText: 'Heavy health activity this cycle.', SuggestedJournalist: 'Dr. Lila Mezran', SuggestedAngle: 'general coverage' },
      { Cycle: String(cycle - 1), HookId: 'h0', HookType: 'cluster', Domain: 'HEALTH', Neighborhood: '', Priority: '3', HookText: 'STALE hook.', SuggestedJournalist: 'Dr. Lila Mezran', SuggestedAngle: '' },
      // The engine's deskMap has no FAITH key — this is how a faith hook actually arrives: City Desk, no journalist.
      { Cycle: String(cycle), HookId: 'h2', HookType: 'signal', Domain: 'FAITH', Neighborhood: 'Chinatown', Priority: '2', HookText: 'Notable event: "Test Temple: Vesak observance held". Follow-up recommended.', SuggestedDesks: 'City Desk', SuggestedJournalist: '', SuggestedAngle: '' },
      // EDUCATION hooks route to an "Education Desk" no roster carries and pre-match a culture generalist.
      { Cycle: String(cycle), HookId: 'h3', HookType: 'demographic', Domain: 'EDUCATION', Neighborhood: 'Rockridge', Priority: '2', HookText: 'School-age population growing in Rockridge. Education story opportunity.', SuggestedDesks: 'Education Desk', SuggestedJournalist: 'Sharon Okafor', SuggestedAngle: '' },
      // DROPOUT_WAVE bypasses makeHook — no desk, no journalist, reaches nobody.
      { Cycle: String(cycle), HookId: 'h4', HookType: 'DROPOUT_WAVE', Domain: 'DROPOUT_WAVE', Neighborhood: 'West Oakland', Priority: '', HookText: 'DROPOUT_WAVE: West Oakland graduation rate at 62% — below the 65% line.', SuggestedDesks: '', SuggestedJournalist: '', SuggestedAngle: '' },
      // CELEBRITY is not in the deskMap — falls through to City Desk and a metro generalist.
      { Cycle: String(cycle), HookId: 'h5', HookType: 'signal', Domain: 'CELEBRITY', Neighborhood: 'Downtown', Priority: '2', HookText: 'Notable event: "Test Fading Actor spotted at a gala". Follow-up recommended.', SuggestedDesks: 'City Desk', SuggestedJournalist: 'Dana Reeve', SuggestedAngle: '' },
      // FAME_WATCH is raw-carried — no desk, no journalist.
      { Cycle: String(cycle), HookId: 'h6', HookType: 'FAME_WATCH', Domain: 'CULTURE', Neighborhood: '', Priority: '', HookText: 'FAME_WATCH: Test Rising Musician gaining attention.', SuggestedDesks: '', SuggestedJournalist: '', SuggestedAngle: '' },
      // NEIGHBORHOOD_* are raw-carried too.
      { Cycle: String(cycle), HookId: 'h7', HookType: 'NEIGHBORHOOD_RISING', Domain: 'NEIGHBORHOOD_RISING', Neighborhood: 'Downtown', Priority: '', HookText: 'Downtown is rising — momentum building.', SuggestedDesks: '', SuggestedJournalist: '', SuggestedAngle: '' }
    ],
    Story_Seed_Deck: [
      { Cycle: String(cycle), SeedID: 'cs1', Desk: 'culture', Class: 'minor', Domain: 'COMMUNITY', Neighborhood: 'Temescal', What: 'holy_day +0.01', Why: 'x', Citizens: 'POP-90001 Test Civic Resident', CitizenEvents: '', Businesses: '', OtherEntities: '', Magnitude: '0.01', Trend: '', SuggestedJournalist: '', SuggestedAngle: '' }
    ],
    // The Oaks rows live on the shared Oakland feed (Chicago_Sports_Feed is dead legacy, ends C91).
    Oakland_Sports_Feed: [
      { Cycle: String(cycle), SeasonType: 'regular', EventType: 'game-result', TeamsUsed: 'Oaks', NamesUsed: 'Test Oaks Shortstop', Notes: 'Oaks drop another late', Stats: 'Test Oaks Shortstop 2-4, 1 HR', 'Team Record': '12-30', StoryAngle: 'Oaks fall late again', PlayerMood: 'frustrated', EventTrigger: 'late collapse', HomeNeighborhood: 'Jack London', Streak: 'L4', FanSentiment: 'restless', FranchiseStability: 'stable', EconomicFootprint: 'modest' },
      { Cycle: String(cycle - 1), SeasonType: 'regular', EventType: 'game-result', TeamsUsed: 'Oaks', NamesUsed: '', Notes: 'Oaks shut out', Stats: '', 'Team Record': '12-29', StoryAngle: 'blanked at home', PlayerMood: 'flat', EventTrigger: '', HomeNeighborhood: 'Jack London', Streak: 'L3', FanSentiment: 'weary', FranchiseStability: 'stable', EconomicFootprint: 'modest' }
    ]
  };
  const rows = {};
  for (const [tab, list] of Object.entries(tabs)) { writeJsonl(path.join(dir, tab + '.jsonl'), list); rows[tab] = list.length; }
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ cycle, rows }));
}

let failures = 0;
function ok(label, cond) {
  if (cond) { console.log('  ok — ' + label); return; }
  failures++; console.error('  FAIL — ' + label);
}

try {
  const output = path.join(root, 'output');
  writeDump(path.join(output, 'beats'), CYCLE);
  writeJsonl(path.join(output, 'simulation_ledger_snapshot.jsonl'), [
    { Name: 'Test Civic Resident', POPID: 'POP-90001', RoleType: 'Mechanic', Neighborhood: 'Fruitvale' },
    { Name: 'Test Pro Athlete', POPID: 'POP-90002', RoleType: 'Right Fielder, Test Team', EconomicProfileKey: 'SPORTS_OVERRIDE' },
    { Name: 'Test Clinic Patient', POPID: 'POP-90003', RoleType: 'Line Cook', Neighborhood: 'Temescal' },
    { Name: 'Test Seasonal Resident', POPID: 'POP-90004', RoleType: 'Bus Operator', Neighborhood: 'Laurel' },
    { Name: 'Test Queue Patient', POPID: 'POP-90007', RoleType: 'Retired Tailor', Neighborhood: 'Chinatown' },
    { Name: 'Rev. Test Leader', POPID: 'POP-90010', RoleType: 'Senior Pastor / Faith Leader', Neighborhood: 'Downtown' },
    { Name: 'Test Grade Schooler', POPID: 'POP-90030', RoleType: 'Grade Schooler', Neighborhood: 'Rockridge' },
    { Name: 'Test Science Teacher', POPID: 'POP-90031', RoleType: 'High School Science Teacher', Neighborhood: 'Rockridge' },
    { Name: 'Test College Student', POPID: 'POP-90032', RoleType: 'Community College Student', Neighborhood: 'Chinatown' },
    { Name: 'Test Oaks Shortstop', POPID: 'POP-90050', RoleType: 'Shortstop, Test Oaks', Neighborhood: 'Jack London' }
  ]);
  fs.writeFileSync(path.join(output, 'world_summary_c' + CYCLE + '.md'), [
    '# World Summary — Cycle ' + CYCLE, '',
    '**Season:** Winter | **Weather:** 49°F overcast', '',
    '## Who Lived It (cycle ' + CYCLE + ')', '', '### Health (1)',
    '- POP-90004 Test Seasonal Resident — dealt with a seasonal health concern (Laurel)', ''
  ].join('\n'));

  console.log('transit:');
  const t = transit.buildTransitSlice(CYCLE, { root });
  ok('kind', t.kind === 'beat-transit' && t.prewrite.schema === 'BEAT-SLICE-1');
  ok('label from in-table delta', /Test Central ridership up 600 vs C102 \| 2 stations/.test(t.story.label));
  ok('station fact with delta', t.facts.some(f => /Test Central: ridership 1,600 \(\+600 vs C102\), on-time 75% \(-5 pts\), Test Corridor — above-average ridership/.test(f.text)));
  ok('Factors names the why when present', t.facts.some(f => /Test North: ridership 450 \(-50 vs C102\), on-time 92% \(\+2 pts\) — game day: Test Park; storm front/.test(f.text)));
  ok('corridor facts are traffic rows, not pseudo-stations', t.facts.some(f => /Test Freeway: traffic index 65 \(\+15 vs C102\) — heavy congestion; weather-related slowdowns/.test(f.text)));
  ok('corridor deltas do not collide', t.facts.some(f => /Test Avenue: traffic index 38 \(-2 vs C102\) — light traffic/.test(f.text)));
  ok('inventory counts stations + corridors, ridership sums stations only', t.facts.some(f => /2 stations \+ 2 corridors on the record this cycle; total ridership 2,050 \(C102: 1,500\)/.test(f.text)));
  ok('every fact sourced', t.facts.every(f => /output\/beats\//.test(f.src)));
  ok('workers by BIZ_ID join only', t.story.citizens.length === 1 && t.story.citizens[0] === 'Test Operator (POP-90020)');
  ok('bartender at "BART Bar" never attaches', !JSON.stringify(t.citizens).includes('Bartender'));
  ok('profile shape', t.citizens[0].profile === 'Test Operator — Transit Operator (AC Transit) — Test Transit Agency');

  console.log('health:');
  const h = health.buildHealthSlice(CYCLE, { root });
  ok('lead hood = most Sick', h.hood === 'Chinatown');
  ok('sick table fact', /Sick residents by neighborhood: Chinatown 125, Fruitvale 110, Rockridge 60 — 295 across 3 neighborhoods/.test(h.facts[0].text));
  ok('hospital row named with ledger role', h.citizens.some(c => c.popid === 'POP-90003' && c.role === 'Line Cook'));
  ok('queue row named', h.facts.some(f => /Test Queue Patient \(Chinatown\), 67 — recovering, car accident, 2 cycles/.test(f.text)));
  ok('queue fossil (StatusStartCycle 0) never rides', !JSON.stringify(h).includes('Test Fossil Patient'));
  ok('processed queue row never rides', !JSON.stringify(h).includes('Test Processed Patient'));
  ok('pro athlete excluded', !JSON.stringify(h).includes('Test Pro Athlete'));
  ok('no prev/ → typed state', h.prewrite.deltas.state === 'NO_PRIOR_CYCLE');
  ok('world-summary Health resident joins the slice', h.citizens.some(c => c.popid === 'POP-90004' && c.role === 'Bus Operator') &&
    h.facts.some(f => /Test Seasonal Resident dealt with a seasonal health concern/.test(f.text) && /world_summary_c103\.md/.test(f.src)));
  ok('few-named note', /named rows are few \(3\)/.test(h.prewrite.note));
  ok('only this cycle\'s hook', h.prewrite.hooks.length === 1 && h.prewrite.hooks[0].text === 'Heavy health activity this cycle.');

  console.log('schools:');
  // Enrollment moves: stage a prior-cycle demographics dump for this section only.
  const prevDir = path.join(output, 'beats', 'prev');
  fs.mkdirSync(prevDir, { recursive: true });
  writeJsonl(path.join(prevDir, 'Neighborhood_Demographics.jsonl'), [
    { Neighborhood: 'Rockridge', Students: '223', SchoolQualityIndex: '9' },
    { Neighborhood: 'Chinatown', Students: '175', SchoolQualityIndex: '7' },
    { Neighborhood: 'Fruitvale', Students: '200', SchoolQualityIndex: '8' }
  ]);
  fs.writeFileSync(path.join(prevDir, 'meta.json'), JSON.stringify({ cycle: CYCLE - 1, rows: { Neighborhood_Demographics: 3 } }));
  const s = schools.buildSchoolsSlice(CYCLE, { root });
  ok('odd cycle → bottom of the table', s.hood === 'Chinatown' && /weakest school record/.test(s.story.label));
  ok('row fact', s.facts.some(f => /Chinatown: school quality index 7, graduation 87%, college-ready 56%, teacher quality 7, funding 12,000, 180 students/.test(f.text)));
  ok('enrollment movement leads', /Enrollment moved: Chinatown \+5 students vs C102/.test(s.facts[0].text));
  ok('static quality table says so plainly', s.facts.some(f => /quality table is unchanged since C102/.test(f.text)));
  ok('district card by BIZ_ID', s.facts.some(f => /The district: Test Unified School District — 5,201 employees citywide/.test(f.text) && /Business_Ledger\.jsonl BIZ-00016/.test(f.src)));
  ok('EDUCATION hook reaches her despite the Education Desk misroute', s.prewrite.hooks.some(h => /School-age population growing in Rockridge/.test(h.text) && h.domain === 'EDUCATION'));
  ok('DROPOUT_WAVE reaches her despite carrying no desk', s.prewrite.hooks.some(h => /West Oakland graduation rate at 62%/.test(h.text)));
  ok('students from the ledger snapshot in the lead hood', s.story.citizens.length === 1 && s.story.citizens[0] === 'Test College Student (POP-90032)');
  ok('citywide educators when the lead hood has none', (() => {
    const only = new Map([['POP-90040', { POPID: 'POP-90040', Name: 'Test Faraway Teacher', RoleType: 'High School Teacher', Neighborhood: 'Temescal' }]]);
    const x = schools.buildSchoolsSlice(CYCLE, { root, profiles: only });
    return x.citizens.some(c => c.popid === 'POP-90040' && /none in Chinatown/.test(c.why)) && /elsewhere in the city/.test(x.prewrite.note);
  })());
  ok('even cycle → top of the table', (() => {
    const meta = path.join(output, 'beats', 'meta.json');
    const m = JSON.parse(fs.readFileSync(meta, 'utf8')); m.cycle = CYCLE + 1; fs.writeFileSync(meta, JSON.stringify(m));
    const even = schools.buildSchoolsSlice(CYCLE + 1, { root });
    m.cycle = CYCLE; fs.writeFileSync(meta, JSON.stringify(m));
    return even.hood === 'Rockridge' && even.story.citizens.length === 2;
  })());
  fs.rmSync(prevDir, { recursive: true, force: true });

  console.log('environment:');
  const e = environment.buildEnvironmentSlice(CYCLE, { root });
  ok('label', e.story.label === 'C103 overcast, 52°F after rain');
  ok('recent cycles fact', e.facts.some(f => /Last 2 cycles: C101 rain 48°F, C102 rain 49°F/.test(f.text)));
  ok('season-feel citizen rides along with ledger role', e.citizens.some(c => c.popid === 'POP-90004' && c.role === 'Bus Operator'));

  console.log('faith:');
  const f = faith.buildFaithSlice(CYCLE, { root });
  ok('seat POPID is the ledger\'s Graye (POP-00012), not Sharon Okafor', f.seat.popid === 'POP-00012');
  ok('rotates by cycle (103 % 2 = 1 → Test Temple)', f.organization && f.organization.Organization === 'Test Temple');
  ok('week events lead, crisis before holy_day even a cycle older', /^Test Fellowship \(Downtown\), C102 — crisis response: emergency assistance fund activated/.test(f.facts[0].text) &&
    f.facts[1] && /^Test Temple \(Chinatown\), C103 — holy day: Vesak observance held \(attendance 120\)/.test(f.facts[1].text));
  ok('event outside the 7-cycle window never rides', !JSON.stringify(f.facts).includes('STALE event'));
  ok('week line in the label', /2 faith events on the record since C97/.test(f.story.label));
  ok('event-org leader joins the people on the record', f.citizens.some(c => c.popid === 'POP-90010' && /crisis response this week/.test(c.why)));
  ok('FAITH-domain hook reaches him despite the City Desk misroute', f.prewrite.hooks.some(h => /Test Temple: Vesak observance held/.test(h.text) && h.domain === 'FAITH'));
  ok('every fact sourced', f.facts.every(x => /output\/beats\//.test(x.src)));
  const fellowship = (() => {
    const meta = path.join(output, 'beats', 'meta.json');
    const m = JSON.parse(fs.readFileSync(meta, 'utf8')); m.cycle = CYCLE + 1; fs.writeFileSync(meta, JSON.stringify(m));
    const x = faith.buildFaithSlice(CYCLE + 1, { root });
    m.cycle = CYCLE; fs.writeFileSync(meta, JSON.stringify(m));
    return x;
  })();
  ok('next cycle → Test Fellowship with leader, member and program founder', fellowship.organization.Organization === 'Test Fellowship' &&
    fellowship.citizens.some(c => c.popid === 'POP-90010' && /leads Test Fellowship/.test(c.why)) &&
    fellowship.citizens.some(c => c.popid === 'POP-90001' && /member of Test Fellowship/.test(c.why)) &&
    fellowship.facts.some(x => /Test Program \(mutual-aid\), Downtown, founded by Test Civic Resident, since C100/.test(x.text)));
  ok('culture desk', f.seat.desk === 'culture');

  console.log('safety:');
  const r = safety.buildSafetySlice(CYCLE, { root });
  ok('lead hood = most incidents', r.hood === 'Fruitvale' && /Fruitvale logged the most incidents \(9\)/.test(r.story.label));
  ok('slowest response named', r.facts.some(x => /Slowest response: Rockridge: 3 incidents, response 12.4 min, clearance 40%/.test(x.text)));
  ok('public-safety staff by BIZ_ID join only', r.story.citizens.length === 1 && r.story.citizens[0] === 'Test Chief (POP-90023)');
  ok('"Vertical Farm Systems Engineer" never matches a safety regex', !JSON.stringify(r.citizens).includes('Farmer'));
  ok('legacy loadSafetySlice export still works', typeof safety.loadSafetySlice === 'function');

  console.log('culture lane (kai / sharon / maria):');
  const k = arts.buildArtsSlice(CYCLE, { root });
  ok('kai: rising figure leads with trajectory + fame', k.facts.some(f => /Test Rising Musician \(Musician\), Arts, Temescal — fame rising \(fame 34, rising\), last seen C103/.test(f.text)));
  ok('kai: new-on-record figure', k.facts.some(f => /Test New Chef.*new on the culture record this cycle/.test(f.text)));
  ok('kai: fading is the other side of the file', k.facts.some(f => /Test Fading Actor.*fading — the where-are-they-now file/.test(f.text)));
  ok('kai: inactive figure never rides', !JSON.stringify(k.facts).includes('Test Retired Poet'));
  ok('kai: universe-linked figure resolves to the ledger citizen', k.citizens.some(c => c.popid === 'POP-90001' && /fame rising/.test(c.why)));
  ok('kai: CULTURE hook reaches him by domain despite no desk', k.prewrite.hooks.some(h => /Test Rising Musician gaining attention/.test(h.text)));
  ok('kai: culture-desk seed becomes a fact + a candidate', k.facts.some(f => /ENGINE SEED \(Temescal\): Test Civic Resident/.test(f.text)));
  const sh = lifestyle.buildLifestyleSlice(CYCLE, { root });
  ok('sharon: fading leads the fame file', /Test Fading Actor.*fading — the where-are-they-now file/.test(sh.facts[0].text) && /City-tier/.test(sh.facts[0].text));
  ok('sharon: the city-knows-them row', sh.facts.some(f => /Test Rising Musician.*the city knows them/.test(f.text)));
  ok('sharon: CELEBRITY hook by domain (City Desk misroute)', sh.prewrite.hooks.some(h => /Test Fading Actor spotted at a gala/.test(h.text)));
  ok('sharon: FAME_WATCH hook by type (raw-carried, no desk)', sh.prewrite.hooks.some(h => /Test Rising Musician gaining attention/.test(h.text)));
  const m = neighborhood.buildNeighborhoodSlice(CYCLE, { root });
  ok('maria: program + founder from the ledger', m.facts.some(f => /Test Program \(mutual-aid\), Downtown — founded by Test Civic Resident, since C100/.test(f.text)) &&
    m.citizens.some(c => c.popid === 'POP-90001' && /founded Test Program/.test(c.why)));
  ok('maria: NEIGHBORHOOD_RISING hook by domain', m.prewrite.hooks.some(h => /Downtown is rising/.test(h.text)));
  ok('maria: hood population movement vs prev/', (() => {
    const pd = path.join(output, 'beats', 'prev');
    fs.mkdirSync(pd, { recursive: true });
    writeJsonl(path.join(pd, 'Neighborhood_Demographics.jsonl'), [
      { Neighborhood: 'Downtown', Students: '290', Adults: '4950', Seniors: '600' }
    ]);
    fs.writeFileSync(path.join(pd, 'meta.json'), JSON.stringify({ cycle: CYCLE - 1, rows: { Neighborhood_Demographics: 1 } }));
    const x = neighborhood.buildNeighborhoodSlice(CYCLE, { root });
    fs.rmSync(pd, { recursive: true, force: true });
    return x.facts.some(f => /Downtown this cycle: 300 students, 5,000 adults, 600 seniors — moved vs C102: \+10 students, \+50 adults/.test(f.text));
  })());
  ok('maria: deltas typed', m.prewrite.deltas && (m.prewrite.deltas.state === 'NO_PRIOR_CYCLE' || m.prewrite.deltas.state === 'PRIOR_CYCLE_ON_DISK'));

  console.log('oaks seats (selena / talia):');
  const sg = arts && require('./buildOaksBeatSlice').buildOaksBeatSlice(CYCLE, { root });
  ok('selena: current-cycle feed row leads with record + streak', sg.facts.some(f => /Record 12-30 · streak L4/.test(f.text)) && sg.facts.some(f => /Oaks fall late again/.test(f.text)));
  ok('selena: raw columns survive (trigger + franchise stability)', sg.facts.some(f => /Trigger: late collapse/.test(f.text)) && sg.facts.some(f => /Franchise stability: stable/.test(f.text)));
  ok('selena: stats line carried', sg.facts.some(f => /Stats \(feed\): Test Oaks Shortstop 2-4, 1 HR/.test(f.text)));
  ok('selena: feed name resolves to the ledger', sg.citizens.some(c => c.popid === 'POP-90050' && /named on the Oaks feed/.test(c.why)));
  ok('selena: empty state without feed rows', require('./buildOaksBeatSlice').buildOaksBeatSlice(CYCLE, { root, beats: { meta: { cycle: CYCLE } } }).empty === true);
  const tf = require('./buildOaksGroundSlice').buildOaksGroundSlice(CYCLE, { root });
  ok('talia: fans + mood lead', /Oaks fans, C103: restless/.test(tf.facts[0].text) && tf.facts.some(f => /Room mood, C103: frustrated/.test(f.text)));
  ok('talia: record is context, not the lead', tf.facts.some(f => /Context: record 12-30 · streak L4/.test(f.text)) && /Jack London/.test(tf.hood));

  console.log('typed packet (LEP/2) per seat:');
  for (const [label, slice, popid] of [['trevor', t, 'POP-00155'], ['lila', h, 'POP-00154'], ['angela', s, 'POP-00156'], ['noah', e, 'POP-00157'], ['graye', f, 'POP-00012'], ['rachel', r, 'POP-00057'], ['kai', k, 'POP-00158'], ['sharon', sh, 'POP-00159'], ['maria', m, 'POP-00013'], ['selena', sg, 'POP-00591'], ['talia', tf, 'POP-00592']]) {
    const pk = v2.buildAnglePacket({ cycle: CYCLE, desk: slice.seat.desk, reporter: { popid, name: slice.seat.name }, story: slice.story, approach: slice.approach, slice, lane: [] });
    const b = pk.task.creativeBrief;
    ok(label + ': brief beat-slice with facts + room', b && b.kind === 'beat-slice' && b.facts.length >= 1 && !!b.roomIsYours);
    ok(label + ': every anchor fact is a known FACT sourced to a file on disk', slice.prewrite.anchorFacts.every(text => pk.known.some(k => k.text === text && /^output\//.test(k.src))));
    ok(label + ': candidates = the slice\'s people', pk.exposure.candidates.length === slice.citizens.length && pk.exposure.candidates.every(c => slice.citizens.some(p => p.popid === c.pop)));
  }

  console.log('assignment + fail loud:');
  const en = transit.enrichAssignment({ desk: 'civic', persona: 'trevor-shimizu', name: 'Trevor Shimizu' }, CYCLE, root);
  ok('enrichAssignment attaches the slice', en.beatSlice === true && en.beatSeat === 'trevor-shimizu' && en.story.kind === 'beat-transit');
  ok('isSeat by name and slug', transit.isTransitSeat({ name: 'Trevor Shimizu' }) && faith.isFaithSeat({ persona: 'elliot-graye' }) && !faith.isFaithSeat({ persona: 'kai-marston' }));
  const other = { desk: 'sports', persona: 'p-slayer' };
  ok('other seats untouched', transit.enrichAssignment(other, CYCLE, root) === other);
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'godworld-beat-slices-bare-'));
  try {
    let msg = null; try { health.buildHealthSlice(CYCLE, { root: bare }); } catch (x) { msg = x.message; }
    ok('missing dump throws naming dumpBeatTabs', !!msg && /beat dump missing/.test(msg) && /dumpBeatTabs\.js 103/.test(msg));
    msg = null; try { environment.buildEnvironmentSlice(CYCLE + 5, { root }); } catch (x) { msg = x.message; }
    ok('stale dump throws naming both cycles', !!msg && /C103/.test(msg) && /C108/.test(msg));
    msg = null; try { safety.enrichAssignment({ desk: 'civic', persona: 'rachel-torres' }, CYCLE + 5, root); } catch (x) { msg = x.message; }
    ok('enrichAssignment does not swallow', !!msg && /beat dump/.test(msg));
  } finally { fs.rmSync(bare, { recursive: true, force: true }); }
  const paths = transit.writeTransitSlice(CYCLE, t, root);
  ok('artifacts written per journalist', fs.existsSync(paths.json) && /trevor-shimizu\.md$/.test(paths.md) && /transit_slice_c103\.json$/.test(paths.json));
  ok('cached load served', transit.loadTransitSlice(CYCLE, root).story.label === t.story.label);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

if (failures) { console.error('\nbeatSlices tests: ' + failures + ' FAILURE(S)'); process.exit(1); }
console.log('\nbeatSlices tests: PASS');
