#!/usr/bin/env node
/**
 * Seed Household_Ledger from Simulation_Ledger citizen data.
 *
 * Groups citizens into households using MaritalStatus, ParentIds, ChildrenIds,
 * age, and neighborhood. Calculates HouseholdIncome and MonthlyRent from
 * economic profile housingBurdenPct.
 *
 * Usage:
 *   node scripts/seedHouseholds.js --dry-run    # Preview changes
 *   node scripts/seedHouseholds.js               # Apply changes
 *
 * Phase C1 of the Economic Parameter Wiring plan (Phase 14.3 in Rollout Plan).
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const sheets = require('../lib/sheets');
const fs = require('fs');

const DRY_RUN = process.argv.includes('--dry-run');
const CURRENT_CYCLE = 84;
const SIM_YEAR = 2041;

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===');
  console.log('');

  // Load economic data for housingBurdenPct
  const roleMappingPath = path.resolve(__dirname, '..', 'data', 'role_mapping.json');
  const econParamsPath = path.resolve(__dirname, '..', 'data', 'economic_parameters.json');

  const roleMapping = JSON.parse(fs.readFileSync(roleMappingPath, 'utf8'));
  const econParams = JSON.parse(fs.readFileSync(econParamsPath, 'utf8'));
  var paramIndex = {};
  for (var i = 0; i < econParams.length; i++) {
    paramIndex[econParams[i].role] = econParams[i];
  }

  // Read Simulation_Ledger
  var ledgerData = await sheets.getSheetData('Simulation_Ledger');
  if (ledgerData.length < 2) {
    console.error('ERROR: Simulation_Ledger is empty');
    process.exit(1);
  }

  var header = ledgerData[0];
  var rows = ledgerData.slice(1);

  function col(name) {
    var idx = header.indexOf(name);
    if (idx === -1) console.warn('  WARN: Column "' + name + '" not found');
    return idx;
  }

  var iPopId = col('POPID');
  var iFirst = col('First');
  var iLast = col('Last');
  var iStatus = col('Status');
  var iNeighborhood = col('Neighborhood');
  var iMaritalStatus = col('MaritalStatus');
  var iParentIds = col('ParentIds');
  var iChildrenIds = col('ChildrenIds');
  var iBirthYear = col('BirthYear');
  var iIncome = col('Income');
  var iWealthLevel = col('WealthLevel');
  var iEconKey = col('EconomicProfileKey');
  var iHouseholdId = col('HouseholdId');
  var iRoleType = col('RoleType');

  // Build citizen map
  var citizens = {};
  var activeCivilians = [];

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var popId = (row[iPopId] || '').toString().trim();
    var status = (row[iStatus] || '').toString().toLowerCase().trim();
    var econKey = (row[iEconKey] || '').toString().trim();

    if (!popId) continue;
    if (status === 'deceased' || status === 'inactive' || status === 'departed') continue;
    if (econKey === 'SPORTS_OVERRIDE') continue; // Skip sports athletes

    var birthYear = parseInt(row[iBirthYear]) || 0;
    var age = birthYear > 0 ? (SIM_YEAR - birthYear) : 35;

    var childrenIds = [];
    try {
      var raw = (row[iChildrenIds] || '').toString().trim();
      if (raw && raw !== '[]') childrenIds = JSON.parse(raw);
    } catch (e) { /* ignore parse errors */ }

    var parentIds = [];
    try {
      var rawP = (row[iParentIds] || '').toString().trim();
      if (rawP && rawP !== '[]') parentIds = JSON.parse(rawP);
    } catch (e) { /* ignore */ }

    var citizen = {
      popId: popId,
      row: r,
      name: ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(),
      neighborhood: (row[iNeighborhood] || '').toString().trim(),
      maritalStatus: (row[iMaritalStatus] || '').toString().trim().toLowerCase(),
      childrenIds: childrenIds,
      parentIds: parentIds,
      age: age,
      income: parseFloat(row[iIncome]) || 0,
      wealthLevel: parseInt(row[iWealthLevel]) || 0,
      roleType: (row[iRoleType] || '').toString().trim(),
      econKey: econKey
    };

    citizens[popId] = citizen;
    activeCivilians.push(citizen);
  }

  console.log('Active civilians:', activeCivilians.length);

  // === STEP 1: Identify married pairs ===
  var paired = {};  // popId → partner popId
  var households = [];

  // Find pairs by matching ChildrenIds
  var marriedCitizens = activeCivilians.filter(function(c) {
    return c.maritalStatus.includes('married');
  });

  console.log('Married citizens:', marriedCitizens.length);

  // Match pairs: find two married citizens in same neighborhood with same children
  for (var m = 0; m < marriedCitizens.length; m++) {
    var mc = marriedCitizens[m];
    if (paired[mc.popId]) continue;

    // Try to find partner
    for (var n = m + 1; n < marriedCitizens.length; n++) {
      var partner = marriedCitizens[n];
      if (paired[partner.popId]) continue;
      if (partner.neighborhood !== mc.neighborhood) continue;

      // Match by shared children
      var sharedChildren = false;
      if (mc.childrenIds.length > 0 && partner.childrenIds.length > 0) {
        for (var ci = 0; ci < mc.childrenIds.length; ci++) {
          if (partner.childrenIds.indexOf(mc.childrenIds[ci]) >= 0) {
            sharedChildren = true;
            break;
          }
        }
      }

      // If both married, same neighborhood, and either share children or neither has children
      if (sharedChildren || (mc.childrenIds.length === 0 && partner.childrenIds.length === 0)) {
        paired[mc.popId] = partner.popId;
        paired[partner.popId] = mc.popId;
        break;
      }
    }
  }

  // === STEP 2: Build households ===
  var assigned = {};  // popId → householdId
  var hhSeq = 1;

  function makeHouseholdId() {
    var id = 'HH-' + String(CURRENT_CYCLE).padStart(4, '0') + '-' + String(hhSeq).padStart(3, '0');
    hhSeq++;
    return id;
  }

  function getHousingBurden(citizen) {
    var mappedName = roleMapping[citizen.roleType];
    if (!mappedName || mappedName === 'SPORTS_OVERRIDE') return 0.30; // default
    var profile = paramIndex[mappedName];
    return (profile && profile.housingBurdenPct) ? profile.housingBurdenPct : 0.30;
  }

  // Create family households (married pairs + children)
  for (var popId in paired) {
    if (!paired.hasOwnProperty(popId)) continue;
    if (assigned[popId]) continue;

    var partnerId = paired[popId];
    if (assigned[partnerId]) continue;

    var head = citizens[popId];
    var spouse = citizens[partnerId];
    if (!head || !spouse) continue;

    // Collect children
    var allChildrenIds = head.childrenIds.slice();
    for (var sc = 0; sc < spouse.childrenIds.length; sc++) {
      if (allChildrenIds.indexOf(spouse.childrenIds[sc]) < 0) {
        allChildrenIds.push(spouse.childrenIds[sc]);
      }
    }

    var members = [head.popId, spouse.popId];
    var totalIncome = head.income + spouse.income;

    // Add children who are under 22 and active civilians
    for (var ch = 0; ch < allChildrenIds.length; ch++) {
      var child = citizens[allChildrenIds[ch]];
      if (child && child.age < 22 && !assigned[child.popId]) {
        members.push(child.popId);
        totalIncome += child.income;
        assigned[child.popId] = true; // mark as handled
      }
    }

    var hhId = makeHouseholdId();
    var avgBurden = (getHousingBurden(head) + getHousingBurden(spouse)) / 2;
    var monthlyRent = Math.round(totalIncome * avgBurden / 12);

    households.push({
      householdId: hhId,
      headOfHousehold: head.popId,
      householdType: 'family',
      members: members,
      neighborhood: head.neighborhood,
      housingType: head.wealthLevel >= 7 ? 'owned' : 'rented',
      monthlyRent: monthlyRent,
      housingCost: 0,
      householdIncome: Math.round(totalIncome),
      formedCycle: CURRENT_CYCLE,
      dissolvedCycle: '',
      status: 'active'
    });

    for (var mi = 0; mi < members.length; mi++) {
      assigned[members[mi]] = hhId;
    }
  }

  // Single parents with children
  for (var sp = 0; sp < activeCivilians.length; sp++) {
    var citizen = activeCivilians[sp];
    if (assigned[citizen.popId]) continue;
    if (citizen.childrenIds.length === 0) continue;

    var memberList = [citizen.popId];
    var incomeTotal = citizen.income;

    for (var ck = 0; ck < citizen.childrenIds.length; ck++) {
      var kid = citizens[citizen.childrenIds[ck]];
      if (kid && kid.age < 22 && !assigned[kid.popId]) {
        memberList.push(kid.popId);
        incomeTotal += kid.income;
        assigned[kid.popId] = true;
      }
    }

    if (memberList.length > 1) {
      var spHhId = makeHouseholdId();
      var spBurden = getHousingBurden(citizen);
      var spRent = Math.round(incomeTotal * spBurden / 12);

      households.push({
        householdId: spHhId,
        headOfHousehold: citizen.popId,
        householdType: 'single-parent',
        members: memberList,
        neighborhood: citizen.neighborhood,
        housingType: citizen.wealthLevel >= 7 ? 'owned' : 'rented',
        monthlyRent: spRent,
        housingCost: 0,
        householdIncome: Math.round(incomeTotal),
        formedCycle: CURRENT_CYCLE,
        dissolvedCycle: '',
        status: 'active'
      });

      for (var smi = 0; smi < memberList.length; smi++) {
        assigned[memberList[smi]] = spHhId;
      }
    }
  }

  // Single-person households (everyone else)
  for (var s = 0; s < activeCivilians.length; s++) {
    var cit = activeCivilians[s];
    if (assigned[cit.popId]) continue;

    var sHhId = makeHouseholdId();
    var sBurden = getHousingBurden(cit);
    var sRent = Math.round(cit.income * sBurden / 12);

    households.push({
      householdId: sHhId,
      headOfHousehold: cit.popId,
      householdType: 'single',
      members: [cit.popId],
      neighborhood: cit.neighborhood,
      housingType: cit.wealthLevel >= 7 ? 'owned' : 'rented',
      monthlyRent: sRent,
      housingCost: 0,
      householdIncome: Math.round(cit.income),
      formedCycle: CURRENT_CYCLE,
      dissolvedCycle: '',
      status: 'active'
    });

    assigned[cit.popId] = sHhId;
  }

  // === REPORT ===
  var familyCount = households.filter(function(h) { return h.householdType === 'family'; }).length;
  var singleParentCount = households.filter(function(h) { return h.householdType === 'single-parent'; }).length;
  var singleCount = households.filter(function(h) { return h.householdType === 'single'; }).length;

  console.log('');
  console.log('--- HOUSEHOLDS ---');
  console.log('Total:', households.length);
  console.log('  Family:', familyCount);
  console.log('  Single-parent:', singleParentCount);
  console.log('  Single:', singleCount);
  console.log('');

  // Rent distribution
  var rents = households.map(function(h) { return h.monthlyRent; }).sort(function(a, b) { return a - b; });
  var medRent = rents[Math.floor(rents.length / 2)] || 0;
  console.log('--- RENT DISTRIBUTION ---');
  console.log('Min: $' + rents[0]);
  console.log('Median: $' + medRent);
  console.log('Max: $' + rents[rents.length - 1]);
  console.log('');

  // Housing type
  var owned = households.filter(function(h) { return h.housingType === 'owned'; }).length;
  var rented = households.filter(function(h) { return h.housingType === 'rented'; }).length;
  console.log('Owned:', owned, '| Rented:', rented);
  console.log('');

  // Neighborhood breakdown (top 10)
  var byHood = {};
  households.forEach(function(h) {
    if (!byHood[h.neighborhood]) byHood[h.neighborhood] = { count: 0, incomes: [], rents: [] };
    byHood[h.neighborhood].count++;
    byHood[h.neighborhood].incomes.push(h.householdIncome);
    byHood[h.neighborhood].rents.push(h.monthlyRent);
  });

  var hoodList = Object.keys(byHood).map(function(k) {
    var d = byHood[k];
    var sorted = d.incomes.slice().sort(function(a, b) { return a - b; });
    var rentSorted = d.rents.slice().sort(function(a, b) { return a - b; });
    return {
      name: k,
      count: d.count,
      medianIncome: sorted[Math.floor(sorted.length / 2)],
      medianRent: rentSorted[Math.floor(rentSorted.length / 2)]
    };
  }).sort(function(a, b) { return b.count - a.count; });

  console.log('--- NEIGHBORHOOD HOUSEHOLDS (top 10) ---');
  hoodList.slice(0, 10).forEach(function(h) {
    console.log('  ' + h.name + ': ' + h.count + ' households, median income $' + h.medianIncome.toLocaleString() + ', median rent $' + h.medianRent.toLocaleString());
  });
  console.log('');

  // Sample family households
  var families = households.filter(function(h) { return h.householdType !== 'single'; });
  if (families.length > 0) {
    console.log('--- FAMILY HOUSEHOLDS ---');
    families.forEach(function(h) {
      var memberNames = h.members.map(function(m) {
        var c = citizens[m];
        return c ? c.name : m;
      }).join(', ');
      console.log('  ' + h.householdId + ' (' + h.householdType + '): ' + memberNames);
      console.log('    Income: $' + h.householdIncome.toLocaleString() + ' | Rent: $' + h.monthlyRent.toLocaleString() + '/mo | ' + h.housingType + ' | ' + h.neighborhood);
    });
    console.log('');
  }

  if (DRY_RUN) {
    console.log('=== DRY RUN COMPLETE — no changes written ===');
    return;
  }

  // === WRITE CHANGES ===
  console.log('Writing to Household_Ledger...');

  // Build household rows (header + data)
  var hhHeader = ['HouseholdId', 'HeadOfHousehold', 'HouseholdType', 'Members',
                  'Neighborhood', 'HousingType', 'MonthlyRent', 'HousingCost',
                  'HouseholdIncome', 'FormedCycle', 'DissolvedCycle', 'Status',
                  'CreatedAt', 'LastUpdated'];

  var now = new Date().toISOString();
  var hhRows = households.map(function(h) {
    return [
      h.householdId,
      h.headOfHousehold,
      h.householdType,
      JSON.stringify(h.members),
      h.neighborhood,
      h.housingType,
      h.monthlyRent,
      h.housingCost,
      h.householdIncome,
      h.formedCycle,
      h.dissolvedCycle,
      h.status,
      now,
      now
    ];
  });

  // Clear existing Household_Ledger by deleting and recreating
  try {
    await sheets.deleteSheet('Household_Ledger');
    console.log('  Cleared old Household_Ledger');
  } catch (e) {
    console.log('  No existing Household_Ledger to clear (or error: ' + e.message + ')');
  }
  await sheets.createSheet('Household_Ledger');
  console.log('  Created fresh Household_Ledger');

  // Write header + all rows
  var allHhData = [hhHeader].concat(hhRows);
  await sheets.updateRange('Household_Ledger!A1', allHhData);
  console.log('  Wrote ' + households.length + ' households');

  // Update HouseholdId on Simulation_Ledger
  console.log('Updating HouseholdId on Simulation_Ledger...');

  function colLetter(idx) {
    if (idx < 26) return String.fromCharCode(65 + idx);
    return String.fromCharCode(64 + Math.floor(idx / 26)) + String.fromCharCode(65 + (idx % 26));
  }

  var batchUpdates = [];
  for (var popId in assigned) {
    if (!assigned.hasOwnProperty(popId)) continue;
    var hhId = assigned[popId];
    var citz = citizens[popId];
    if (!citz) continue;

    var rowNum = citz.row + 2; // +1 for header, +1 for 1-based
    batchUpdates.push({
      range: 'Simulation_Ledger!' + colLetter(iHouseholdId) + rowNum,
      values: [[hhId]]
    });
  }

  console.log('  Sending ' + batchUpdates.length + ' HouseholdId updates...');
  var CHUNK_SIZE = 500;
  for (var c = 0; c < batchUpdates.length; c += CHUNK_SIZE) {
    var chunk = batchUpdates.slice(c, c + CHUNK_SIZE);
    await sheets.batchUpdate(chunk);
    console.log('    Chunk ' + (Math.floor(c / CHUNK_SIZE) + 1) + ' of ' + Math.ceil(batchUpdates.length / CHUNK_SIZE));
  }

  console.log('');
  console.log('=== COMPLETE ===');
  console.log(households.length + ' households created');
  console.log(batchUpdates.length + ' citizens linked to households');
}

main().catch(function(err) {
  console.error('FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
