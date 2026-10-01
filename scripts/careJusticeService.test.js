/** Synthetic, sheet-free Task 7 contract and shared Chaos Cars demand fixture. */
'use strict';

const HOODS = ['Fruitvale', 'Temescal'];
for (let i = 1; i <= 20; i++) HOODS.push('SYNTHETIC_HOOD_' + String(i).padStart(2, '0'));

function makeDemandFixture_(residentHood, ledger) {
  const picked = residentHood || 'Fruitvale';
  const hoods = {};
  const counts = {};
  if (ledger) {
    const iHood = ledger.headers.indexOf('Neighborhood');
    const iStatus = ledger.headers.indexOf('Status');
    for (const row of ledger.rows) {
      const status = iStatus < 0 ? '' : String(row[iStatus] || '').toLowerCase();
      if (['deceased', 'inactive', 'traded', 'pending'].includes(status)) continue;
      const hood = String(row[iHood] || '').trim();
      counts[hood] = (counts[hood] || 0) + 1;
    }
  } else counts[picked] = 1;
  for (const hood of HOODS) {
    const tracked = counts[hood] || 0;
    hoods[hood] = {
      charges: hood === picked ? 8 : 0, clearance: 0.25,
      judicialIntakes: hood === picked ? 2 : 0, sick: hood === picked ? 100 : 0,
      hospitalIntakes: hood === picked ? 2 : 0, hospitalIntakeType: 'illness',
      oariDeployed: hood === picked, oariEligible: hood === picked ? 2 : 0,
      oariDiversions: hood === picked ? 1 : 0,
      trackedResidents: tracked, tablePopulation: 100,
      ratePopulation: 1000, trackedShare: tracked / 1000
    };
  }
  return { cycle: 100, methodVersion: 'demand-v1', basis: 'hood-table', exposureDial: 1, hoods,
    unallocated: { status: 'unavailable' },
    city: { charges: 8, judicialIntakes: 2, sick: 100, hospitalIntakes: 2,
      oariEligible: 2, oariDiversions: 1, oariHoods: [picked] } };
}

module.exports = { makeDemandFixture_, HOODS };

if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const config = require('../utilities/chaosCarsConfig.js');
  const phaseBox = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,
    '../phase02-world-state/applyInitiativeImplementationEffects.js'), 'utf8'), phaseBox);
  global.INITIATIVE_PHASE_INTENSITY_ = phaseBox.INITIATIVE_PHASE_INTENSITY_;
  global.loadChaosCarsConfig_ = config.loadChaosCarsConfig_;
  global.validateAllChaosConfigs_ = config.validateAllChaosConfigs_;
  const logs = [];
  global.Logger = { log: line => logs.push(line) };
  const service = require('../phase04-events/careJusticeService.js');
  global.careJusticeResidentIndex_ = service.careJusticeResidentIndex_;
  const chaos = require('../phase04-events/chaosCarsEngine.js');
  let passed = 0, failed = 0;
  function check(label, condition, detail) {
    if (condition) { passed++; console.log('  ok   ' + label); }
    else { failed++; console.error('  FAIL ' + label + (detail ? ': ' + detail : '')); }
  }
  function namesError(fn, name) {
    try { fn(); } catch (error) { return error.message.indexOf(name) >= 0; }
    return false;
  }
  function ctx() {
    const crime = {}, demo = {};
    for (const hood of HOODS) {
      crime[hood] = { incidentCount: 2, clearanceRate: 0.25 };
      demo[hood] = { students: 10, adults: 60, seniors: 30, sick: 20 };
    }
    const tracker = [
      ['InitiativeID', 'ImplementationPhase', 'AffectedNeighborhoods', 'PolicyDomain'],
      ['INIT-002', 'dispatch-live', 'Fruitvale, Temescal', 'safety']
    ];
    return { rng: () => 0, config: { careJusticeAdmitPerSick: 0.02,
      careJusticeOariEligibleShare: 0.25, careJusticeExposureDial: 1 },
    summary: { cycleId: 100, crimeMetrics: { byNeighborhood: crime },
      neighborhoodDemographics: demo, worldPopulation: { totalPopulation: 22000 } },
    ledger: { headers: ['POPID', 'Neighborhood', 'Status', 'Tier'],
      rows: [['SYNTHETIC-1', 'Fruitvale', 'active', 1],
        ['SYNTHETIC-2', 'Temescal', 'hospitalized', 2],
        ['SYNTHETIC-3', 'Fruitvale', 'pending', 3]] },
    cache: { getData: name => name === 'Initiative_Tracker'
      ? { exists: true, values: tracker }
      : { exists: false, values: [] } } };
  }

  // 1: positive placement weight and a zero-tracked hood with real demand.
  {
    const demand = service.runCareJusticeDemand_(ctx());
    const weight = Object.values(demand.hoods).reduce((n, h) => n + h.charges * h.trackedShare, 0);
    check('1 shares positive and zero-tracked demand stays unnameable',
      weight > 0 && demand.hoods.SYNTHETIC_HOOD_01.charges > 0 &&
      demand.hoods.SYNTHETIC_HOOD_01.trackedShare === 0);
    check('1 exactly 22 hood + one city log lines', logs.length === 23, String(logs.length));
  }
  // 2: the configured initiative's phase and hood list are authoritative.
  {
    const c = ctx();
    c.cache.getData = () => ({ exists: true, values: [
      ['InitiativeID', 'ImplementationPhase', 'AffectedNeighborhoods', 'PolicyDomain'],
      ['INIT-002', 'announced', 'Fruitvale', 'safety'],
      ['SYNTHETIC-OTHER', 'operational', 'Temescal', 'safety']
    ] });
    const d = service.runCareJusticeDemand_(c);
    const e = ctx();
    e.cache.getData = () => ({ exists: true, values: [
      ['InitiativeID', 'ImplementationPhase', 'AffectedNeighborhoods', 'PolicyDomain'],
      ['INIT-002', 'pilot-active', 'Fruitvale', 'safety'],
      ['SYNTHETIC-OTHER', 'operational', 'Temescal', 'safety']
    ] });
    const deployed = service.runCareJusticeDemand_(e);
    const u = ctx();
    u.cache.getData = () => ({ exists: true, values: [
      ['InitiativeID', 'ImplementationPhase', 'AffectedNeighborhoods', 'PolicyDomain'],
      ['INIT-002', 'dispatch-live', 'Fruitvale', 'safety'],
      ['INIT-002', 'operational', 'Temescal, SYNTHETIC_NOWHERE', 'safety']
    ] });
    const before = logs.length;
    const union = service.runCareJusticeDemand_(u);
    check('2b two rows sharing the ID union their hoods; an unknown listed hood is logged, not weighted',
      union.hoods.Fruitvale.oariDeployed && union.hoods.Temescal.oariDeployed &&
      union.city.oariHoods.length === 2 &&
      logs.slice(before).some(line => line.indexOf('SYNTHETIC_NOWHERE') >= 0));
    check('2 announced OARI is idle; another safety ID cannot deploy it',
      d.city.oariHoods.length === 0 && !d.hoods.Fruitvale.oariDeployed &&
      deployed.city.oariHoods.length === 1 && deployed.hoods.Fruitvale.oariDeployed &&
      !deployed.hoods.Temescal.oariDeployed);
  }
  // 3: absent sources and dials fail by name.
  {
    const a = ctx(); delete a.summary.crimeMetrics;
    a.summary.careJusticeDemand = makeDemandFixture_();
    const b = ctx(); delete b.summary.neighborhoodDemographics;
    const c = ctx(); delete c.config.careJusticeAdmitPerSick;
    const d = ctx(); delete d.config.careJusticeOariEligibleShare;
    const e = ctx(); delete e.summary.worldPopulation.totalPopulation;
    const f = ctx(); f.config.careJusticeAdmitPerSick = Infinity;
    check('3 missing crime, demographics, and World_Config keys throw',
      namesError(() => service.runCareJusticeDemand_(a), 'S.crimeMetrics') &&
      a.summary.careJusticeDemand === undefined &&
      namesError(() => service.runCareJusticeDemand_(b), 'S.neighborhoodDemographics') &&
      namesError(() => service.runCareJusticeDemand_(c), 'careJusticeAdmitPerSick') &&
      namesError(() => service.runCareJusticeDemand_(d), 'careJusticeOariEligibleShare') &&
      namesError(() => service.runCareJusticeDemand_(e), 'S.worldPopulation.totalPopulation') &&
      namesError(() => service.runCareJusticeDemand_(f), 'careJusticeAdmitPerSick'));
  }
  // 4: both directions of hood-set drift fail.
  {
    const a = ctx(); delete a.summary.neighborhoodDemographics.Fruitvale;
    const b = ctx(); b.summary.neighborhoodDemographics.SYNTHETIC_EXTRA =
      { students: 10, adults: 10, seniors: 10, sick: 1 };
    check('4 hood-set drift names the hood in both directions',
      namesError(() => service.runCareJusticeDemand_(a), 'Fruitvale') &&
      namesError(() => service.runCareJusticeDemand_(b), 'SYNTHETIC_EXTRA'));
  }
  // 5: helper subtracts by hood/type, and city is the sum.
  {
    const c = ctx();
    c.summary.crimeMetrics.byNeighborhood.Fruitvale.incidentCount = 8;
    c.summary.neighborhoodDemographics.Fruitvale.sick = 100;
    const d = service.runCareJusticeDemand_(c);
    const r = service.careJusticeOtherResident_(d, {
      Fruitvale: { hospital: { illness: 1 }, judicial: { arrest: 1 } }
    });
    const hospital = Object.values(r.hoods).reduce((n, h) => n + h.hospital.illness.other, 0);
    check('5 other-resident helper subtracts tracked and city sums hoods',
      r.hoods.Fruitvale.hospital.illness.other === 1 &&
      r.hoods.Fruitvale.judicial.arrest.other === 1 &&
      r.hoods.Temescal.hospital.illness.other === 0 &&
      r.city.hospital.illness.other === hospital &&
      r.city.judicial.arrest.total === Object.values(r.hoods)
        .reduce((n, h) => n + h.judicial.arrest.total, 0));
  }
  // 6: hood rounding precedes city aggregation (0.4 rounds down in each hood).
  {
    const c = ctx();
    c.config.careJusticeAdmitPerSick = 0.02;
    const d = service.runCareJusticeDemand_(c);
    check('6 0.4 per hood rounds to zero, city sums rounded hoods',
      d.hoods.Fruitvale.hospitalIntakes === 0 && d.city.hospitalIntakes === 0 &&
      Math.round(d.city.sick * 0.02) === 9);
  }
  // 7: forced picker draws match hood and texture picker keeps its uniform path.
  {
    const c = ctx();
    c.summary.careJusticeDemand = makeDemandFixture_('Fruitvale', c.ledger);
    const vehicles = ['cop_car', 'ambulance', 'oari_van'];
    const names = vehicles.map(name => chaos.pickTargetByScope_(() => 0, c, 'citizen', { name }).neighborhood);
    const texture = chaos.pickTargetByScope_(() => 0, c, 'citizen', { name: 'mail_truck' });
    check('7 demand vehicles pick resident in chosen hood; texture remains uniform',
      names.every(name => name === 'Fruitvale') && texture.popId === 'SYNTHETIC-1');
  }
  // 8: same code and seed produce the same demand object and chosen target.
  {
    const a = ctx(), b = ctx();
    service.runCareJusticeDemand_(a); service.runCareJusticeDemand_(b);
    const at = chaos.pickTargetByScope_(() => 0, a, 'citizen', { name: 'cop_car' });
    const bt = chaos.pickTargetByScope_(() => 0, b, 'citizen', { name: 'cop_car' });
    check('8 same seed and input yield identical demand and target',
      JSON.stringify(a.summary.careJusticeDemand) === JSON.stringify(b.summary.careJusticeDemand) &&
      at.popId === bt.popId);
  }
  // 9: pre-loop guard fires before target draw or any event write.
  {
    const c = { rng: () => { throw new Error('rng consumed'); }, summary: {} };
    check('9 missing demand throws before first draw with empty output arrays',
      namesError(() => chaos.runChaosCarsEngine_(c), 'S.careJusticeDemand') &&
      c.summary.chaosCarsEvents.length === 0 && c.summary.tier1ChaosEvents.length === 0);
  }
  // 10: weighted picker must not see an all-zero pool.
  {
    const c = ctx(); c.summary.careJusticeDemand = makeDemandFixture_('Fruitvale', c.ledger);
    for (const h of Object.values(c.summary.careJusticeDemand.hoods)) {
      h.charges = 0; h.sick = 0;
    }
    check('10 zero demand weights return null without a uniform fallback',
      chaos.pickCareJusticeTarget_(() => 0, c, 'citizen', { name: 'cop_car' }) === null &&
      chaos.pickCareJusticeTarget_(() => 0, c, 'neighborhood', { name: 'ambulance' }) === null);
  }
  // 11: missing tracker or required column fails; zero phase does not.
  {
    const a = ctx(); a.cache.getData = () => ({ exists: false, values: [] });
    const b = ctx(); b.cache.getData = () => ({ exists: true, values: [
      ['InitiativeID', 'ImplementationPhase'], ['INIT-002', 'operational'] ] });
    const c = ctx(); c.cache.getData = () => ({ exists: true, values: [
      ['InitiativeID', 'ImplementationPhase', 'AffectedNeighborhoods'],
      ['INIT-002', 'announced', 'Fruitvale'] ] });
    const d = ctx(); d.cache.getData = () => ({ exists: true, values: [
      ['InitiativeID', 'ImplementationPhase', 'AffectedNeighborhoods'],
      ['SYNTHETIC-OTHER', 'operational', 'Fruitvale'] ] });
    check('11 missing tracker/column throws; present zero phase is legitimate',
      namesError(() => service.runCareJusticeDemand_(a), 'Initiative_Tracker') &&
      namesError(() => service.runCareJusticeDemand_(b), 'AffectedNeighborhoods') &&
      namesError(() => service.runCareJusticeDemand_(d), 'INIT-002') &&
      service.runCareJusticeDemand_(c).city.oariHoods.length === 0);
  }
  // 12: zero demographic part and zero total are not a valid rate basis.
  {
    const a = ctx(); a.summary.neighborhoodDemographics.Fruitvale.students = 0;
    a.summary.neighborhoodDemographics.Fruitvale.adults = 0;
    a.summary.neighborhoodDemographics.Fruitvale.seniors = 0;
    const a2 = ctx(); a2.summary.neighborhoodDemographics.Fruitvale.seniors = 0;
    const b = ctx(); b.summary.crimeMetrics.byNeighborhood = {};
    b.summary.neighborhoodDemographics = {};
    const blank = ctx(); blank.summary.neighborhoodDemographics.Fruitvale.adults = '';
    check('12 all-zero hood table, blank part and zero table basis throw naming a field/hood; one zero part is legal',
      namesError(() => service.runCareJusticeDemand_(a), 'Fruitvale tablePopulation') &&
      namesError(() => service.runCareJusticeDemand_(blank), 'Fruitvale adults') &&
      service.runCareJusticeDemand_(a2).hoods.Fruitvale.tablePopulation === 70 &&
      namesError(() => service.runCareJusticeDemand_(b), 'table population sum'));
  }
  // 13: tracked spike raises total, preserves modelled number and city identity.
  {
    const d = service.runCareJusticeDemand_(ctx());
    const r = service.careJusticeOtherResident_(d,
      { Fruitvale: { hospital: { illness: 3 } } });
    const cell = r.hoods.Fruitvale.hospital.illness;
    check('13 overdraw revises total, flags and logs it, identity holds',
      cell.overdrawn && cell.modelledTotal === 0 && cell.total === 3 &&
      cell.other === 0 && cell.total === cell.tracked + cell.other &&
      logs.some(line => line.indexOf('overdrawn') >= 0));
  }
  // 14: hospital's modeled type is illness; judicial's is arrest.
  {
    const d = service.runCareJusticeDemand_(ctx());
    const r = service.careJusticeOtherResident_(d, {});
    check('14 typed illness and arrest demand',
      d.hoods.Fruitvale.hospitalIntakeType === 'illness' &&
      !!r.hoods.Fruitvale.hospital.illness && !!r.hoods.Fruitvale.judicial.arrest);
  }
  // Task 7b: one exposure dial, no cap; shared index must fail on missing columns.
  {
    const missing = ctx(); delete missing.config.careJusticeExposureDial;
    const negative = ctx(); negative.config.careJusticeExposureDial = -1;
    const infinite = ctx(); infinite.config.careJusticeExposureDial = Infinity;
    const doubled = ctx(); doubled.config.careJusticeExposureDial = 2;
    check('7b exposure dial is required, finite, non-negative and may exceed one',
      namesError(() => service.runCareJusticeDemand_(missing), 'careJusticeExposureDial') &&
      namesError(() => service.runCareJusticeDemand_(negative), 'careJusticeExposureDial') &&
      namesError(() => service.runCareJusticeDemand_(infinite), 'careJusticeExposureDial') &&
      service.runCareJusticeDemand_(doubled).exposureDial === 2);
    const c = ctx();
    const index = service.careJusticeResidentIndex_(c);
    const demand = service.runCareJusticeDemand_(c);
    check('7b resident index matches demand tracked counts in every hood',
      HOODS.every(hood => (index[hood] || []).length === demand.hoods[hood].trackedResidents));
    check('7b ambulance and OARI named-call fields follow admissions and deployed eligibility',
      HOODS.every(hood => {
        const row = demand.hoods[hood];
        return Number.isInteger(row.hospitalIntakes) && row.hospitalIntakes >= 0 &&
          Number.isInteger(row.oariEligible) && row.oariEligible >= 0 &&
          (row.oariDeployed || row.oariEligible === 0);
      }) && demand.hoods.Fruitvale.oariEligible > 0 &&
      demand.hoods.SYNTHETIC_HOOD_01.oariEligible === 0);
    const noStatus = ctx(); noStatus.ledger.headers.splice(2, 1);
    const noPop = ctx(); noPop.ledger.headers.splice(0, 1);
    check('7b missing Status or POPID header throws by name',
      namesError(() => service.careJusticeResidentIndex_(noStatus), 'Status') &&
      namesError(() => service.careJusticeResidentIndex_(noPop), 'POPID'));
    const custody = ctx();
    custody.ledger.rows[0][2] = 'detained';
    const residents = service.careJusticeResidentIndex_(custody);
    check('T6 detained citizen leaves the street resident index and tracked share',
      !(residents.Fruitvale || []).length &&
      service.runCareJusticeDemand_(custody).hoods.Fruitvale.trackedResidents === 0);
  }
  console.log('\ncareJusticeService: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
}
