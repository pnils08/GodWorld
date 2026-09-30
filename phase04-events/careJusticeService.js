/**
 * Task 7: same-Cycle, hood-table care and justice demand. Numbers only; Task 8
 * owns census persistence and other-resident occupancy. Apps Script globals.
 */

function careJusticeRate_(config, key) {
  var raw = config ? config[key] : undefined;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    throw new Error('careJusticeDemand: World_Config key "' + key + '" missing');
  }
  var value = Number(raw);
  if (!isFinite(value) || value < 0 || value > 1) {
    throw new Error('careJusticeDemand: World_Config key "' + key + '" must be finite and in [0, 1]');
  }
  return value;
}

function careJusticeNumber_(value, field, hood, positive) {
  var number = Number(value);
  if (value === '' || value === null || value === undefined || !isFinite(number) ||
      (positive ? number <= 0 : number < 0)) {
    throw new Error('careJusticeDemand: ' + (hood ? hood + ' ' : '') + field +
      (positive ? ' must be finite and > 0' : ' must be finite and >= 0'));
  }
  return number;
}

function careJusticeOariConfig_() {
  if (typeof loadChaosCarsConfig_ !== 'function') {
    throw new Error('careJusticeDemand: loadChaosCarsConfig_ missing');
  }
  var configs = loadChaosCarsConfig_();
  for (var i = 0; i < configs.length; i++) {
    if (configs[i].name !== 'oari_van') continue;
    var vehicle = configs[i];
    if (!vehicle.initiativeId) throw new Error('careJusticeDemand: oari_van.initiativeId missing');
    var probability = 0;
    for (var j = 0; j < vehicle.textureOutcomes.length; j++) {
      var outcome = vehicle.textureOutcomes[j];
      if (outcome.coverageContribution === true) {
        probability += careJusticeNumber_(outcome.weight, 'oari_van outcome weight', '', false);
      }
    }
    if (probability > 1) throw new Error('careJusticeDemand: oari_van diversion probability > 1');
    return { initiativeId: String(vehicle.initiativeId), diversionProbability: probability };
  }
  throw new Error('careJusticeDemand: oari_van config missing');
}

function careJusticeOariHoods_(ctx, initiativeId) {
  if (!ctx.cache || typeof ctx.cache.getData !== 'function') {
    throw new Error('careJusticeDemand: Initiative_Tracker cache missing');
  }
  var cached = ctx.cache.getData('Initiative_Tracker');
  if (!cached || !cached.exists || !cached.values || cached.values.length < 1) {
    throw new Error('careJusticeDemand: Initiative_Tracker tab missing from cache');
  }
  var values = cached.values;
  var headers = values[0];
  var names = ['InitiativeID', 'ImplementationPhase', 'AffectedNeighborhoods'];
  var cols = {};
  for (var n = 0; n < names.length; n++) {
    var found = -1;
    for (var c = 0; c < headers.length; c++) {
      if (String(headers[c] || '').trim().toLowerCase() === names[n].toLowerCase()) {
        found = c;
        break;
      }
    }
    if (found < 0) throw new Error('careJusticeDemand: Initiative_Tracker.' + names[n] + ' column missing');
    cols[names[n]] = found;
  }
  if (typeof INITIATIVE_PHASE_INTENSITY_ === 'undefined') {
    throw new Error('careJusticeDemand: INITIATIVE_PHASE_INTENSITY_ missing');
  }
  var matches = 0;
  var deployed = {};
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (String(row[cols.InitiativeID] || '').trim() !== initiativeId) continue;
    matches++;
    var phase = String(row[cols.ImplementationPhase] || '').trim().toLowerCase();
    var intensity = INITIATIVE_PHASE_INTENSITY_[phase];
    if (intensity === undefined) {
      intensity = 0;
      for (var pk in INITIATIVE_PHASE_INTENSITY_) {
        if (INITIATIVE_PHASE_INTENSITY_.hasOwnProperty(pk) && phase.indexOf(pk) >= 0) {
          intensity = INITIATIVE_PHASE_INTENSITY_[pk];
          break;
        }
      }
    }
    if (intensity <= 0) continue;
    var parts = String(row[cols.AffectedNeighborhoods] || '').split(/[,;]+/);
    for (var h = 0; h < parts.length; h++) {
      var hood = parts[h].replace(/^\s+|\s+$/g, '');
      if (hood) deployed[hood] = true;
    }
  }
  if (!matches) throw new Error('careJusticeDemand: Initiative_Tracker row ' + initiativeId + ' missing');
  return deployed;
}

// kimi F2 (2026-09-29): a tracker hood that misses the demand table is not an
// error (the tracker is a civic-written cell) but it must not vanish quietly.
function careJusticeLogUnknownHoods_(deployed, hoodSet, cycle) {
  for (var name in deployed) {
    if (deployed.hasOwnProperty(name) && !hoodSet.hasOwnProperty(name)) {
      Logger.log('careJusticeDemand C' + cycle + ' OARI hood "' + name + '" listed in Initiative_Tracker but not in the demand table — no weight');
    }
  }
}

function careJusticeResidentIndex_(ctx) {
  if (!ctx.ledger || !ctx.ledger.headers || !ctx.ledger.rows) {
    throw new Error('careJusticeDemand: ctx.ledger missing');
  }
  var headers = ctx.ledger.headers;
  var iHood = headers.indexOf('Neighborhood');
  var iStatus = headers.indexOf('Status');
  var iPop = headers.indexOf('POPID');
  if (iHood < 0) throw new Error('careJusticeDemand: Simulation_Ledger.Neighborhood missing');
  if (iStatus < 0) throw new Error('careJusticeDemand: Simulation_Ledger.Status missing');
  if (iPop < 0) throw new Error('careJusticeDemand: Simulation_Ledger.POPID missing');
  var index = {};
  for (var i = 0; i < ctx.ledger.rows.length; i++) {
    var row = ctx.ledger.rows[i];
    var status = String(row[iStatus] || '').trim().toLowerCase();
    if (status === 'deceased' || status === 'inactive' || status === 'traded' || status === 'pending') continue;
    if (!String(row[iPop] || '').trim()) throw new Error('careJusticeDemand: Simulation_Ledger.POPID empty at row ' + (i + 2));
    var hood = String(row[iHood] || '').trim();
    if (!index[hood]) index[hood] = [];
    index[hood].push(i);
  }
  return index;
}

function careJusticeTrackedByHood_(ctx) {
  var index = careJusticeResidentIndex_(ctx);
  var counts = {};
  for (var hood in index) if (index.hasOwnProperty(hood)) counts[hood] = index[hood].length;
  return counts;
}

function runCareJusticeDemand_(ctx) {
  var S = ctx && ctx.summary;
  if (S) delete S.careJusticeDemand;
  if (!S || !S.crimeMetrics || !S.crimeMetrics.byNeighborhood) {
    throw new Error('careJusticeDemand: S.crimeMetrics.byNeighborhood missing');
  }
  if (!S.neighborhoodDemographics) {
    throw new Error('careJusticeDemand: S.neighborhoodDemographics missing');
  }
  if (!S.worldPopulation || S.worldPopulation.totalPopulation === undefined ||
      S.worldPopulation.totalPopulation === null || S.worldPopulation.totalPopulation === '') {
    throw new Error('careJusticeDemand: S.worldPopulation.totalPopulation missing');
  }
  var cityPopulation = careJusticeNumber_(S.worldPopulation.totalPopulation,
    'S.worldPopulation.totalPopulation', '', true);
  var admitRate = careJusticeRate_(ctx.config, 'careJusticeAdmitPerSick');
  var oariShare = careJusticeRate_(ctx.config, 'careJusticeOariEligibleShare');
  var exposureDial = ctx.config && ctx.config.careJusticeExposureDial;
  if (exposureDial === undefined || exposureDial === null || String(exposureDial).trim() === '') {
    throw new Error('careJusticeDemand: World_Config key "careJusticeExposureDial" missing');
  }
  exposureDial = Number(exposureDial);
  if (!isFinite(exposureDial) || exposureDial < 0) {
    throw new Error('careJusticeDemand: World_Config key "careJusticeExposureDial" must be finite and >= 0');
  }
  var oariConfig = careJusticeOariConfig_();
  var oariHoods = careJusticeOariHoods_(ctx, oariConfig.initiativeId);
  var crime = S.crimeMetrics.byNeighborhood;
  var demographics = S.neighborhoodDemographics;
  var hoods = Object.keys(crime);
  var tableTotal = 0;
  var partsByHood = {};
  for (var d in demographics) {
    if (demographics.hasOwnProperty(d) && !crime.hasOwnProperty(d)) {
      throw new Error('careJusticeDemand: hood ' + d + ' in S.neighborhoodDemographics but not S.crimeMetrics');
    }
  }
  for (var i = 0; i < hoods.length; i++) {
    var hood = hoods[i];
    if (!demographics.hasOwnProperty(hood)) {
      throw new Error('careJusticeDemand: hood ' + hood + ' in S.crimeMetrics but not S.neighborhoodDemographics');
    }
    var demo = demographics[hood];
    var students = careJusticeNumber_(demo.students, 'students', hood, false);
    var adults = careJusticeNumber_(demo.adults, 'adults', hood, false);
    var seniors = careJusticeNumber_(demo.seniors, 'seniors', hood, false);
    var tablePopulation = students + adults + seniors;
    // A part can be 0; the hood's table count cannot — it is the rate denominator.
    if (!(tablePopulation > 0)) {
      throw new Error('careJusticeDemand: ' + hood + ' tablePopulation must be > 0 (blank-as-zero parts)');
    }
    partsByHood[hood] = tablePopulation;
    tableTotal += tablePopulation;
  }
  if (!(tableTotal > 0)) throw new Error('careJusticeDemand: table population sum must be > 0');
  var tracked = careJusticeTrackedByHood_(ctx);
  var cycle = (S.absoluteCycle || S.cycleId || (ctx.config && ctx.config.cycleCount) || ctx.cycle);
  careJusticeLogUnknownHoods_(oariHoods, crime, cycle);
  var demand = {
    cycle: cycle, methodVersion: 'demand-v1', basis: 'hood-table', exposureDial: exposureDial, hoods: {},
    unallocated: { status: 'unavailable' },
    city: { charges: 0, judicialIntakes: 0, sick: 0, hospitalIntakes: 0,
      oariEligible: 0, oariDiversions: 0, oariHoods: [] }
  };
  for (var k = 0; k < hoods.length; k++) {
    var name = hoods[k];
    var m = crime[name];
    var charges = careJusticeNumber_(m.incidentCount, 'incidentCount', name, false);
    var clearance = careJusticeNumber_(m.clearanceRate, 'clearanceRate', name, true);
    if (clearance > 1) throw new Error('careJusticeDemand: ' + name + ' clearanceRate must be <= 1');
    var sick = careJusticeNumber_(demographics[name].sick, 'sick', name, false);
    var deployed = oariHoods[name] === true;
    var judicialIntakes = Math.round(charges * clearance);
    var hospitalIntakes = Math.round(sick * admitRate);
    var oariEligible = deployed ? Math.round(charges * oariShare) : 0;
    var oariDiversions = Math.round(oariEligible * oariConfig.diversionProbability);
    var ratePopulation = partsByHood[name] / tableTotal * cityPopulation;
    var residentCount = tracked[name] || 0;
    var rowDemand = {
      charges: charges, clearance: clearance, judicialIntakes: judicialIntakes,
      sick: sick, hospitalIntakes: hospitalIntakes, hospitalIntakeType: 'illness',
      oariDeployed: deployed, oariEligible: oariEligible, oariDiversions: oariDiversions,
      trackedResidents: residentCount, tablePopulation: partsByHood[name],
      ratePopulation: ratePopulation, trackedShare: residentCount / ratePopulation
    };
    demand.hoods[name] = rowDemand;
    demand.city.charges += charges;
    demand.city.judicialIntakes += judicialIntakes;
    demand.city.sick += sick;
    demand.city.hospitalIntakes += hospitalIntakes;
    demand.city.oariEligible += oariEligible;
    demand.city.oariDiversions += oariDiversions;
    if (deployed) demand.city.oariHoods.push(name);
    Logger.log('careJusticeDemand C' + cycle + ' ' + name + ' charges=' + charges +
      ' clr=' + clearance + ' jud=' + judicialIntakes + ' sick=' + sick +
      ' hosp=' + hospitalIntakes + ' oari=' + (deployed ? 'deployed' : '-') +
      '/' + oariEligible + '/' + oariDiversions + ' tracked=' + residentCount +
      ' table=' + partsByHood[name] + ' rate=' + ratePopulation +
      ' share=' + rowDemand.trackedShare);
  }
  Logger.log('careJusticeDemand C' + cycle + ' city charges=' + demand.city.charges +
    ' jud=' + demand.city.judicialIntakes + ' sick=' + demand.city.sick +
    ' hosp=' + demand.city.hospitalIntakes + ' oari=' + demand.city.oariHoods.join(',') +
    '/' + demand.city.oariEligible + '/' + demand.city.oariDiversions);
  S.careJusticeDemand = demand;
  return demand;
}

function careJusticeOtherResident_(demand, trackedIntakesByHood) {
  if (!demand || !demand.hoods) throw new Error('careJusticeOtherResident: demand.hoods missing');
  var input = trackedIntakesByHood || {};
  var result = { hoods: {}, city: { hospital: { illness: { other: 0, total: 0, tracked: 0,
    overdrawn: false, modelledTotal: 0 } }, judicial: { arrest: { other: 0, total: 0,
    tracked: 0, overdrawn: false, modelledTotal: 0 } } } };
  var systems = [
    { system: 'hospital', type: 'illness', field: 'hospitalIntakes' },
    { system: 'judicial', type: 'arrest', field: 'judicialIntakes' }
  ];
  for (var hood in demand.hoods) {
    if (!demand.hoods.hasOwnProperty(hood)) continue;
    result.hoods[hood] = { hospital: {}, judicial: {} };
    for (var i = 0; i < systems.length; i++) {
      var item = systems[i];
      var modelled = careJusticeNumber_(demand.hoods[hood][item.field], item.field, hood, false);
      var raw = input[hood] && input[hood][item.system] && input[hood][item.system][item.type];
      var tracked = raw === undefined ? 0 : careJusticeNumber_(raw, 'tracked ' + item.type, hood, false);
      var overdrawn = tracked > modelled;
      var cell = { other: Math.max(0, modelled - tracked), total: Math.max(modelled, tracked),
        tracked: tracked, overdrawn: overdrawn, modelledTotal: modelled };
      result.hoods[hood][item.system][item.type] = cell;
      var cityCell = result.city[item.system][item.type];
      cityCell.other += cell.other;
      cityCell.total += cell.total;
      cityCell.tracked += tracked;
      cityCell.modelledTotal += modelled;
      if (overdrawn) {
        cityCell.overdrawn = true;
        Logger.log('careJusticeOtherResident C' + demand.cycle + ' ' + hood + ' ' +
          item.system + '/' + item.type + ' overdrawn modelled=' + modelled +
          ' tracked=' + tracked + ' revised=' + cell.total);
      }
    }
  }
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    careJusticeResidentIndex_: careJusticeResidentIndex_,
    runCareJusticeDemand_: runCareJusticeDemand_,
    careJusticeOtherResident_: careJusticeOtherResident_,
    careJusticeOariHoods_: careJusticeOariHoods_
  };
}
