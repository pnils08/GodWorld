/**
 * civicApprovalState.test.js — engine.213 (S455, Mike-direct 2026-09-13):
 * approval reads the CITY. An official is graded on the state of what they
 * hold (district vs the city middle; the Mayor on the city's level), on the
 * week's press across every desk, and on civic motion — a scheduled tracker
 * row costs nothing.
 *
 * Fails on the pre-fix file: no state/press functions, sitting costs -2, the
 * media term reads the civic desk alone at a threshold the live range never hit.
 * Run: node scripts/civicApprovalState.test.js
 */
const fs = require('fs');
const path = require('path');

global.Logger = { log: function () {} };
const src = function (p) { return fs.readFileSync(path.resolve(__dirname, p), 'utf8'); };
const A = new Function(
  src('../phase01-config/advanceSimulationCalendar.js') +
  src('../phase01-config/canonNeighborhoodLoader.js') +
  src('../phase05-citizens/updateCivicApprovalRatings.js') +
  '\nreturn { getApprovalStateConfig_, cityStateMiddle_, hoodStateComposite_, districtStateScore_, cityStateScore_,' +
  ' mediaScore_, mediaDelta_, updateCivicApprovalRatings_, MOTION_LADDERS_, approvalDeltaForInitiative_ };'
)();

let passed = 0, failed = 0;
function check(name, cond, detail) { if (cond) { passed++; console.log('  ok  ' + name); } else { failed++; console.error('  FAIL ' + name + (detail ? ': ' + detail : '')); } }
function throws(fn, re) { try { fn(); } catch (e) { return re.test(String(e && e.message)); } return false; }

const CFG_KEYS = {
  approvalLevelBase: 50, approvalLevelInertia: 0.35, approvalStateGainDistrict: 10, approvalStateGainCity: 8, approvalStateGainPress: 3, approvalStateCouncilCityShare: 0.5,
  approvalStateCitySentimentUnit: 0.25, approvalMediaStep1: 1, approvalMediaStep2: 3
};
const CEILING = {
  approvalCeilingThreshold: 80, approvalCeilingMinStreakCycles: 3, approvalCeilingBaseChance: 0.05,
  approvalCeilingChanceStep: 0.05, approvalCeilingMaxChance: 0.30, approvalCeilingScandalDurationCycles: 3,
  approvalCeilingApprovalDrop: 12, approvalCeilingElectionPenalty: 25
};

console.log('═══ A. World_Config contract');
{
  const cfg = A.getApprovalStateConfig_({ config: { ...CFG_KEYS } });
  check('A1 nine keys parse', cfg.gainDistrict === 10 && cfg.levelBase === 50 && cfg.inertia === 0.35 && cfg.mediaStep2 === 3);
  const missing = { ...CFG_KEYS }; delete missing.approvalStateGainCity;
  check('A2 missing key fails loud', throws(() => A.getApprovalStateConfig_({ config: missing }), /approvalStateGainCity/));
  check('A3 step1 above step2 fails loud', throws(() => A.getApprovalStateConfig_({ config: { ...CFG_KEYS, approvalMediaStep1: 4 } }), /exceeds/));
}
const CFG = A.getApprovalStateConfig_({ config: { ...CFG_KEYS } });

// Neighborhood_Map cycle 106, verbatim (world_summary_c106 §Neighborhood snapshot), momentum from the audit where present.
const C106 = {
  'Temescal': { sentiment: 0.51, retailVitality: 10.24, crimeIndex: 0.76, trajectoryMomentum: 6 },
  'Uptown': { sentiment: 0.43, retailVitality: 9.99, crimeIndex: 0.71, trajectoryMomentum: 5 },
  'Rockridge': { sentiment: 0.46, retailVitality: 9.89, crimeIndex: 0.48, trajectoryMomentum: 4 },
  'Downtown': { sentiment: 0.41, retailVitality: 9.55, crimeIndex: 1.1, trajectoryMomentum: 8 },
  'Jack London': { sentiment: 0.42, retailVitality: 9.47, crimeIndex: 0.87, trajectoryMomentum: 5 },
  'Grand Lake': { sentiment: 0.32, retailVitality: 8.46, crimeIndex: 0.51, trajectoryMomentum: 3 },
  'KONO': { sentiment: 0.33, retailVitality: 8.24, crimeIndex: 0.64, trajectoryMomentum: 3 },
  'Chinatown': { sentiment: 0.39, retailVitality: 8.07, crimeIndex: 0.9, trajectoryMomentum: 2 },
  'Fruitvale': { sentiment: 0.48, retailVitality: 8.05, crimeIndex: 1.0, trajectoryMomentum: 4 },
  'Laurel': { sentiment: 0.36, retailVitality: 7.61, crimeIndex: 0.52, trajectoryMomentum: 2 },
  'Lake Merritt': { sentiment: 0.46, retailVitality: 7.51, crimeIndex: 0.85, trajectoryMomentum: 3 },
  'Piedmont Ave': { sentiment: 0.40, retailVitality: 7.30, crimeIndex: 0.35, trajectoryMomentum: 2 },
  'Eastlake': { sentiment: 0.30, retailVitality: 6.77, crimeIndex: 0.6, trajectoryMomentum: 1 },
  'Dimond': { sentiment: 0.33, retailVitality: 6.55, crimeIndex: 0.64, trajectoryMomentum: 1 },
  'San Antonio': { sentiment: 0.23, retailVitality: 6.48, crimeIndex: 0.82, trajectoryMomentum: 0 },
  'Adams Point': { sentiment: 0.35, retailVitality: 6.04, crimeIndex: 0.64, trajectoryMomentum: 1 },
  'East Oakland': { sentiment: 0.28, retailVitality: 6.01, crimeIndex: 1.11, trajectoryMomentum: 0 },
  'Glenview': { sentiment: 0.31, retailVitality: 5.66, crimeIndex: 0.5, trajectoryMomentum: 1 },
  'Brooklyn': { sentiment: 0.26, retailVitality: 5.54, crimeIndex: 0.53, trajectoryMomentum: 0 },
  'West Oakland': { sentiment: 0.43, retailVitality: 5.01, crimeIndex: 1.1, trajectoryMomentum: 2 },
  'Baylight District': { sentiment: 0.33, retailVitality: 3.93, crimeIndex: 0.89, trajectoryMomentum: 3 },
  'Ivy Hill': { sentiment: 0.36, retailVitality: 3.66, crimeIndex: 0.49, trajectoryMomentum: 0 }
};
const DISTRICTS = {
  D1: ['West Oakland', 'Brooklyn'], D2: ['Downtown', 'Jack London', 'Chinatown'], D3: ['Fruitvale', 'San Antonio'],
  D4: ['Glenview', 'Dimond', 'Ivy Hill'], D5: ['Baylight District', 'East Oakland'], D6: ['Piedmont Ave'],
  D7: ['Temescal', 'Rockridge', 'KONO'], D8: ['Adams Point', 'Grand Lake', 'Eastlake', 'Lake Merritt'], D9: ['Laurel', 'Uptown']
};
const S106 = { neighborhoodState: C106 };

console.log('═══ B. City middle and district composite (§15: bands relative to the city\'s own middle)');
{
  const mid = A.cityStateMiddle_(S106);
  check('B1 22 hoods scored', mid.hoods === 22);
  check('B2 middle carries the four measures', ['sentiment', 'retailVitality', 'crimeIndex', 'trajectoryMomentum'].every(k => mid.measures[k] && mid.measures[k].n === 22));
  const d7 = A.districtStateScore_(S106, DISTRICTS.D7, mid);
  const d1 = A.districtStateScore_(S106, DISTRICTS.D1, mid);
  const d5 = A.districtStateScore_(S106, DISTRICTS.D5, mid);
  check('B3 Temescal/Rockridge/KONO read above the middle', d7 > 0.5, String(d7));
  check('B4 West Oakland/Brooklyn (low retail, high crime) read below the middle', d1 < 0, String(d1));
  check('B5 Baylight/East Oakland read below D7', d5 < d7, d5 + ' vs ' + d7);
  const sum = Object.keys(DISTRICTS).reduce((a, d) => a + A.districtStateScore_(S106, DISTRICTS[d], mid), 0);
  check('B6 the districts roughly balance around the middle (|mean| < 0.5)', Math.abs(sum / 9) < 0.5, String(sum / 9));
  check('B7 composite is clamped to [-2, 2]', A.hoodStateComposite_({ sentiment: 99, retailVitality: 99, crimeIndex: -99, trajectoryMomentum: 99 }, mid) === 2);
  check('B8 a hood with no numbers scores null, not 0', A.hoodStateComposite_({ sentiment: null }, mid) === null);
  check('B9 no neighborhood state → null, never a silent 0', A.districtStateScore_({ neighborhoodState: {} }, DISTRICTS.D7, A.cityStateMiddle_({ neighborhoodState: {} })) === null);
  const flat = {}; Object.keys(C106).forEach(h => { flat[h] = { sentiment: 0.3, retailVitality: 7, crimeIndex: 0.7, trajectoryMomentum: 2 }; });
  check('B10 a flat city reads 0 for every district (spread floor, no noise amplification)',
    Math.abs(A.districtStateScore_({ neighborhoodState: flat }, DISTRICTS.D7, A.cityStateMiddle_({ neighborhoodState: flat }))) < 1e-9);
}

console.log('═══ C. City level (the Mayor holds the whole city)');
{
  const c = A.cityStateScore_(S106, CFG);
  check('C1 C106 mean sentiment +0.37 → level ≈ +1.5 units', c > 1.4 && c < 1.6, String(c));
  const bad = {}; Object.keys(C106).forEach(h => { bad[h] = { ...C106[h], sentiment: -0.4 }; });
  check('C2 a city at -0.4 reads -1.6 — the down direction exists', A.cityStateScore_({ neighborhoodState: bad }, CFG) < -1.5);
  check('C3 clamped at ±2', A.cityStateScore_({ neighborhoodState: { x: { sentiment: 5 } } }, CFG) === 2);
  check('C4 no state → null', A.cityStateScore_({ neighborhoodState: {} }, CFG) === null);
}

console.log('═══ D. The press — every desk, both ways, on the live range');
{
  // Edition_Coverage_Ratings cycle 106, verbatim.
  const c106press = { ENVIRONMENT: { rating: 5 }, CULTURE: { rating: 3 }, SPORTS: { rating: 5 }, EDUCATION: { rating: 5 }, CIVIC: { rating: -3 }, ECONOMIC: { rating: 5 } };
  const sc = A.mediaScore_(c106press);
  check('D1 C106: civic desk -3 against five desks +3..+5 nets ≈ +0.2 → 0', Math.abs(sc) < 1 && A.mediaDelta_(sc, CFG) === 0, String(sc));
  check('D2 civic +2 with a +2 paper → +2 score → +1', A.mediaDelta_(A.mediaScore_({ CIVIC: { rating: 2 }, SPORTS: { rating: 2 } }), CFG) === 1);
  check('D3 civic -3 with a -3 paper → -2', A.mediaDelta_(A.mediaScore_({ CIVIC: { rating: -3 }, SPORTS: { rating: -3 } }), CFG) === -2);
  check('D4 the old record (-2..+3 civic, no other desk) now moves the number both ways',
    A.mediaDelta_(A.mediaScore_({ CIVIC: { rating: 2 } }), CFG) === 1 && A.mediaDelta_(A.mediaScore_({ CIVIC: { rating: -2 } }), CFG) === -1);
  check('D5 no rated edition → null → 0', A.mediaScore_({}) === null && A.mediaDelta_(null, CFG) === 0);
}

console.log('═══ E. Tracker: on the clock costs nothing; silence still drains');
{
  const L = A.MOTION_LADDERS_;
  check('E1 sitting ladder is empty', L.sitting.owned.length === 0 && L.sitting.nearby.length === 0);
  check('E2 silence still drains, halved (-3/-2/-1 owned)', L.silence.owned.join(',') === '-3,-2,-1' && L.silence.nearby.join(',') === '-2,-1');
  check('E3 advancement unchanged (+2/+1/+1)', L.advanced.owned.join(',') === '2,1,1');
  check('E4 approvalDeltaForInitiative_ sitting → 0', A.approvalDeltaForInitiative_('sitting', true, false).delta === 0);
}

console.log('═══ F. Full run on the live C106 seats — the C107 projection');
{
  const headers = ['OfficeId', 'Title', 'District', 'Holder', 'PopId', 'Status', 'Approval', 'Faction', 'HighApprovalStreak', 'AutoScandalUntilCycle', 'AutoScandalSource', 'VotingPower', 'Notes'];
  const seats = [
    ['MAYOR-01', 'Mayor', 'citywide', 'Avery Santana', 'POP-00034', 'active', 64, 'OPP', 0, '', '', 'yes', ''],
    ['COUNCIL-D1', 'D1', 'D1', 'Denise Carter', 'POP-00501', 'active', 76, 'OPP', 0, '', '', 'yes', ''],
    ['COUNCIL-D7', 'D7', 'D7', 'Warren Ashford', 'POP-00507', 'active', 45, 'CRC', 0, '', '', 'yes', ''],
    ['COUNCIL-D4', 'D4', 'D4', 'Ramon Vega', 'POP-00504', 'active', 51, 'IND', 0, '', '', 'yes', '']
  ];
  // Initiative_Tracker as written 2026-09-13 18:36 (every clock 107), read at the C107 fire with C106's phase map carried.
  const tHeaders = ['InitiativeID', 'Name', 'Status', 'ImplementationPhase', 'AffectedNeighborhoods', 'LeadFaction', 'OppositionFaction', 'NextActionCycle'];
  const tracker = [
    ['INIT-001', 'West Oakland Stabilization Fund', 'passed', 'disbursement-active', 'West Oakland', 'OPP', 'CRC', 107],
    ['INIT-002', 'Oakland Alternative Response Initiative', 'passed', 'implementation-active', 'West Oakland, Fruitvale, East Oakland', 'OPP', 'CRC', 107],
    ['INIT-003', 'Fruitvale Transit Hub Phase II', 'visioning-complete', 'design-phase', 'Fruitvale', 'OPP', '', 107],
    ['INIT-005', 'Temescal Community Health Center', 'passed', 'construction-active', 'Temescal', 'OPP', 'CRC', 107],
    ['INIT-006', 'Baylight District', 'passed', 'construction-planning', 'Jack London, Downtown', 'OPP', 'CRC', 107],
    ['INIT-007', 'Oakland Youth Apprenticeship Pipeline', 'announced', 'operational', 'West Oakland, East Oakland, Fruitvale', 'OPP', '', 107]
  ];
  const prevPhases = { 'INIT-001': 'disbursement-active', 'INIT-002': 'implementation-active', 'INIT-003': 'visioning-complete', 'INIT-005': 'construction-active', 'INIT-006': 'construction-planning', 'INIT-007': 'implementation-active' };
  const intents = [];
  global.queueCellIntent_ = (ctx, tab, row, col, value) => intents.push({ row, col, value });
  global.recordRipple_ = () => {};
  global.recordHookRipple_ = () => {};
  global.safeRand_ = () => () => 0.99;
  global.getCitizenDialBands_ = () => null;
  const canon = { list: Object.keys(C106), set: {}, core: [], district: {}, byDistrict: DISTRICTS };
  const ctx = {
    config: { ...CEILING, ...CFG_KEYS, cycleCount: 107 },
    mode: {},
    ledger: { headers: ['POPID', 'First', 'Last', 'DialState'], rows: [] },
    summary: {
      cycleId: 107, absoluteCycle: 107, canonHoods: canon, neighborhoodState: C106,
      previousCycleState: { cycle: 106, initiativePhases: prevPhases },
      editionDomainBalance: { ENVIRONMENT: { rating: 5 }, CULTURE: { rating: 3 }, SPORTS: { rating: 5 }, EDUCATION: { rating: 5 }, CIVIC: { rating: -3 }, ECONOMIC: { rating: 5 } }
    },
    ss: { getSheetByName(n) {
      if (n === 'Civic_Office_Ledger') return { getDataRange: () => ({ getValues: () => [headers.slice(), ...seats.map(r => r.slice())] }) };
      if (n === 'Initiative_Tracker') return { getDataRange: () => ({ getValues: () => [tHeaders.slice(), ...tracker.map(r => r.slice())] }) };
      return null;
    } }
  };
  A.updateCivicApprovalRatings_(ctx);
  const by = {}; ctx.summary.approvalChanges.forEach(c => { by[c.holder] = c; });
  const appr = h => by[h] ? by[h].newApproval : null;
  const why = h => by[h] ? by[h].reasons.join('; ') : '(no change)';
  console.log('    Santana ' + appr('Avery Santana') + '  ← ' + why('Avery Santana'));
  console.log('    Carter  ' + appr('Denise Carter') + '  ← ' + why('Denise Carter'));
  console.log('    Ashford ' + appr('Warren Ashford') + '  ← ' + why('Warren Ashford'));
  console.log('    Vega    ' + appr('Ramon Vega') + '  ← ' + why('Ramon Vega'));
  // Targets from the C106 state: Santana 50 + 1.48×8 = 61.8; Ashford 50 + 0.85×10 + 1.48×8×0.5 = 64.4; Carter 50 − 0.63×10 + 5.9 = 49.6; Vega 50 − 0.34×10 + 5.9 = 52.5
  check('F1 the Mayor of a city at +0.37: level pulls toward 62, two phase moves add +3 → 66', appr('Avery Santana') === 66, String(appr('Avery Santana')));
  check('F2 Ashford, holding the strongest district, closes a third of the gap to 64 in one Cycle (45 → 52)', appr('Warren Ashford') === 52, String(appr('Warren Ashford')));
  check('F3 Carter (weak retail, highest crime) is pulled toward 50; a phase move softens it (76 → 69)', appr('Denise Carter') === 69, String(appr('Denise Carter')));
  check('F4 a seat with no initiatives is graded on its district (Vega 51 → 52, target 52.5)', appr('Ramon Vega') === 52 && /district/.test(why('Ramon Vega')), why('Ramon Vega'));
  check('F5 no sitting row appears as a drain in any reason', !Object.keys(by).some(h => /sitting \(-/.test(why(h))));
  check('F6 campaigns: none started (nobody under 40)', ctx.summary.civicCampaigns.length === 0);
  check('F7 approval writes queued for every changed seat', intents.length === ctx.summary.approvalChanges.length);
}

console.log((failed === 0 ? 'ALL ' + passed + ' PASS' : failed + ' FAILURES / ' + passed + ' pass'));
process.exit(failed === 0 ? 0 : 1);
