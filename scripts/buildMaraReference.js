#!/usr/bin/env node
/**
 * buildMaraReference.js — Generate clean reference files for Mara audits
 *
 * Pulls from 6 spreadsheet tabs and outputs readable text files
 * that Mara can ctrl+F during edition audits.
 *
 * Usage:
 *   node scripts/buildMaraReference.js
 *
 * Output: output/mara-reference/
 *   - citizen_roster.txt      (ENGINE-mode citizens)
 *   - as_roster.txt           (A's players from As_Roster tab)
 *   - tribune_roster.txt      (Bay Tribune staff)
 *   - chicago_roster.txt      (Chicago Citizens — Bulls + city)
 *   - business_registry.txt   (Business_Ledger)
 *   - faith_registry.txt      (Faith_Organizations)
 */

const path = require('path');
require('/root/GodWorld/lib/env');

const sheets = require('../lib/sheets');
const fs = require('fs');

const OUT_DIR = path.resolve(__dirname, '..', 'output', 'mara-reference');
const SIM_YEAR = 2041;

async function main() {
  console.log('Building Mara reference files...\n');

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const [slData, asData, btData, chiData, bizData, faithData] = await Promise.all([
    sheets.getSheetData('Simulation_Ledger'),
    sheets.getSheetData('As_Roster'),
    sheets.getSheetData('Bay_Tribune_Oakland'),
    sheets.getSheetData('Chicago_Citizens'),
    sheets.getSheetData('Business_Ledger'),
    sheets.getSheetData('Faith_Organizations'),
  ]);

  buildCitizenRoster(slData);
  buildAsRoster(asData);
  buildTribuneRoster(btData);
  buildChicagoRoster(chiData);
  buildBusinessRegistry(bizData);
  buildFaithRegistry(faithData);

  console.log('\nAll files written to ' + OUT_DIR);
}

// --- Citizen Roster (ENGINE-mode from Simulation_Ledger) ---

function buildCitizenRoster(data) {
  const header = data[0];
  const rows = data.slice(1);

  const col = (name) => header.indexOf(name);
  const iPopId = col('POPID');
  const iFirst = col('First');
  const iLast = col('Last');
  const iBirthYear = col('BirthYear');
  const iNeighborhood = col('Neighborhood');
  const iRoleType = col('RoleType');
  const iTier = col('Tier');
  const iStatus = col('Status');
  const iClockMode = col('ClockMode');

  const citizens = [];
  for (const row of rows) {
    const clockMode = (row[iClockMode] || '').toString().trim();
    if (clockMode !== 'ENGINE') continue;

    const birthYear = parseInt(row[iBirthYear]) || 0;
    const age = birthYear > 0 ? SIM_YEAR - birthYear : '?';

    citizens.push({
      popId: (row[iPopId] || '').toString().trim(),
      name: ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(),
      age: age,
      neighborhood: (row[iNeighborhood] || '').toString().trim(),
      role: (row[iRoleType] || '').toString().trim(),
      tier: (row[iTier] || '').toString().trim(),
      status: (row[iStatus] || '').toString().trim(),
    });
  }

  citizens.sort((a, b) => a.name.localeCompare(b.name));

  const lines = [
    'GODWORLD CITIZEN ROSTER — ENGINE-MODE CITIZENS',
    'Simulation Year: ' + SIM_YEAR + ' | Generated: ' + new Date().toISOString().split('T')[0],
    'Total: ' + citizens.length + ' citizens',
    '',
    pad('POPID', 12) + pad('Name', 28) + pad('Age', 5) + pad('Neighborhood', 20) + pad('Role', 40) + pad('Tier', 5) + 'Status',
    '-'.repeat(115),
  ];

  for (const c of citizens) {
    lines.push(
      pad(c.popId, 12) +
      pad(c.name, 28) +
      pad(String(c.age), 5) +
      pad(c.neighborhood, 20) +
      pad(c.role, 40) +
      pad(c.tier, 5) +
      c.status
    );
  }

  const filePath = path.join(OUT_DIR, 'citizen_roster.txt');
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log('  citizen_roster.txt — ' + citizens.length + ' ENGINE citizens');
}

// --- A's Roster (from As_Roster tab) ---

function buildAsRoster(data) {
  const header = data[0];
  const rows = data.slice(1);

  const col = (name) => header.findIndex(h => h.trim() === name.trim());
  const iPopId = col('POPID');
  const iFirst = col('First');
  const iLast = col('Last');
  const iTier = col('Tier');
  const iPosition = col('Position');
  const iTeam = col('Team');
  const iProspect = col('MLB Propspect Rank');

  const players = [];
  for (const row of rows) {
    players.push({
      popId: (row[iPopId] || '').toString().trim(),
      name: ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(),
      tier: (row[iTier] || '').toString().trim(),
      position: (row[iPosition] || '').toString().trim(),
      team: (row[iTeam] || '').toString().trim(),
      prospect: (row[iProspect] || '').toString().trim(),
    });
  }

  players.sort((a, b) => {
    const ta = parseInt(a.tier) || 99;
    const tb = parseInt(b.tier) || 99;
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name);
  });

  const lines = [
    'OAKLAND ATHLETICS ROSTER',
    'Simulation Year: ' + SIM_YEAR + ' | Generated: ' + new Date().toISOString().split('T')[0],
    'Total: ' + players.length + ' players',
    'GM: Mike Paulson',
    '',
    pad('POPID', 12) + pad('Name', 25) + pad('Position', 22) + pad('Team', 25) + pad('Tier', 5) + 'Prospect Rank',
    '-'.repeat(95),
  ];

  for (const p of players) {
    lines.push(
      pad(p.popId, 12) +
      pad(p.name, 25) +
      pad(p.position, 22) +
      pad(p.team, 25) +
      pad(p.tier, 5) +
      p.prospect
    );
  }

  const filePath = path.join(OUT_DIR, 'as_roster.txt');
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log('  as_roster.txt — ' + players.length + ' A\'s players');
}

// --- Tribune Roster (from Bay_Tribune_Oakland tab) ---

function buildTribuneRoster(data) {
  const header = data[0];
  const rows = data.slice(1);

  const col = (name) => header.findIndex(h => h.trim() === name.trim());
  const iPopId = col('POPID');
  const iFirst = col('First');
  const iLast = col('Last');
  const iTier = col('Tier');
  const iRole = col('RoleType');

  const staff = [];
  for (const row of rows) {
    staff.push({
      popId: (row[iPopId] || '').toString().trim(),
      name: ((row[iFirst] || '') + ' ' + (row[iLast] || '')).trim(),
      tier: (row[iTier] || '').toString().trim(),
      role: (row[iRole] || '').toString().trim(),
    });
  }

  staff.sort((a, b) => {
    const ta = parseInt(a.tier) || 99;
    const tb = parseInt(b.tier) || 99;
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name);
  });

  const lines = [
    'BAY TRIBUNE OAKLAND — STAFF ROSTER',
    'Generated: ' + new Date().toISOString().split('T')[0],
    'Total: ' + staff.length + ' staff',
    '',
    pad('POPID', 12) + pad('Name', 25) + pad('Role', 35) + 'Tier',
    '-'.repeat(75),
  ];

  for (const s of staff) {
    lines.push(
      pad(s.popId, 12) +
      pad(s.name, 25) +
      pad(s.role, 35) +
      s.tier
    );
  }

  const filePath = path.join(OUT_DIR, 'tribune_roster.txt');
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log('  tribune_roster.txt — ' + staff.length + ' Tribune staff');
}

// --- Chicago Roster (from Chicago_Citizens tab) ---

function buildChicagoRoster(data) {
  const header = data[0];
  const rows = data.slice(1);

  const col = (name) => header.indexOf(name);
  const iId = col('CitizenId');
  const iName = col('Name');
  const iAge = col('Age');
  const iNeighborhood = col('Neighborhood');
  const iOccupation = col('Occupation');
  const iTier = col('Tier');
  const iStatus = col('Status');

  const citizens = [];
  for (const row of rows) {
    const status = (row[iStatus] || '').toString().trim();
    citizens.push({
      id: (row[iId] || '').toString().trim(),
      name: (row[iName] || '').toString().trim(),
      age: (row[iAge] || '').toString().trim(),
      neighborhood: (row[iNeighborhood] || '').toString().trim(),
      occupation: (row[iOccupation] || '').toString().trim(),
      tier: (row[iTier] || '').toString().trim(),
      status: status,
    });
  }

  citizens.sort((a, b) => {
    const ta = parseInt(a.tier) || 99;
    const tb = parseInt(b.tier) || 99;
    if (ta !== tb) return ta - tb;
    return a.name.localeCompare(b.name);
  });

  const active = citizens.filter(c => c.status.toLowerCase() === 'active');
  const inactive = citizens.filter(c => c.status.toLowerCase() !== 'active');

  const lines = [
    'CHICAGO CITIZENS ROSTER',
    'Includes Bulls players and Chicago residents',
    'Generated: ' + new Date().toISOString().split('T')[0],
    'Total: ' + citizens.length + ' (' + active.length + ' active, ' + inactive.length + ' inactive)',
    'Bulls GM: Mike Paulson',
    '',
    pad('ID', 16) + pad('Name', 25) + pad('Age', 5) + pad('Neighborhood', 18) + pad('Occupation', 30) + pad('Tier', 5) + 'Status',
    '-'.repeat(105),
  ];

  for (const c of citizens) {
    lines.push(
      pad(c.id, 16) +
      pad(c.name, 25) +
      pad(c.age, 5) +
      pad(c.neighborhood, 18) +
      pad(c.occupation, 30) +
      pad(c.tier, 5) +
      c.status
    );
  }

  const filePath = path.join(OUT_DIR, 'chicago_roster.txt');
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log('  chicago_roster.txt — ' + citizens.length + ' Chicago citizens');
}

// --- Business Registry (from Business_Ledger tab) ---

function buildBusinessRegistry(data) {
  const header = data[0];
  const rows = data.slice(1);

  const col = (name) => header.findIndex(h => h.trim() === name.trim());
  const iBizId = col('BIZ_ID');
  const iName = col('Name');
  const iSector = col('Sector');
  const iNeighborhood = col('Neighborhood');
  const iEmployees = col('Employee_Count');
  const iPersonnel = col('Key_Personnel');

  const businesses = [];
  for (const row of rows) {
    businesses.push({
      bizId: (row[iBizId] || '').toString().trim(),
      name: (row[iName] || '').toString().trim(),
      sector: (row[iSector] || '').toString().trim(),
      neighborhood: (row[iNeighborhood] || '').toString().trim(),
      employees: (row[iEmployees] || '').toString().trim(),
      personnel: (row[iPersonnel] || '').toString().trim(),
    });
  }

  businesses.sort((a, b) => a.name.localeCompare(b.name));

  const lines = [
    'GODWORLD BUSINESS REGISTRY',
    'Generated: ' + new Date().toISOString().split('T')[0],
    'Total: ' + businesses.length + ' businesses',
    '',
    pad('BIZ_ID', 12) + pad('Name', 30) + pad('Sector', 22) + pad('Neighborhood', 20) + pad('Employees', 10) + 'Key Personnel',
    '-'.repeat(110),
  ];

  for (const b of businesses) {
    lines.push(
      pad(b.bizId, 12) +
      pad(b.name, 30) +
      pad(b.sector, 22) +
      pad(b.neighborhood, 20) +
      pad(b.employees, 10) +
      b.personnel
    );
  }

  const filePath = path.join(OUT_DIR, 'business_registry.txt');
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log('  business_registry.txt — ' + businesses.length + ' businesses');
}

// --- Faith Registry (from Faith_Organizations tab) ---

function buildFaithRegistry(data) {
  const header = data[0];
  const rows = data.slice(1);

  const col = (name) => header.indexOf(name);
  const iOrg = col('Organization');
  const iTradition = col('FaithTradition');
  const iNeighborhood = col('Neighborhood');
  const iLeader = col('Leader');
  const iCongregation = col('Congregation');
  const iPopId = col('LeaderPOPID');
  const iStatus = col('ActiveStatus');

  const orgs = [];
  for (const row of rows) {
    orgs.push({
      org: (row[iOrg] || '').toString().trim(),
      tradition: (row[iTradition] || '').toString().trim(),
      neighborhood: (row[iNeighborhood] || '').toString().trim(),
      leader: (row[iLeader] || '').toString().trim(),
      congregation: (row[iCongregation] || '').toString().trim(),
      popId: (row[iPopId] || '').toString().trim(),
      status: (row[iStatus] || '').toString().trim(),
    });
  }

  orgs.sort((a, b) => a.org.localeCompare(b.org));

  const lines = [
    'GODWORLD FAITH ORGANIZATIONS',
    'Generated: ' + new Date().toISOString().split('T')[0],
    'Total: ' + orgs.length + ' organizations',
    '',
    pad('Organization', 35) + pad('Tradition', 18) + pad('Neighborhood', 18) + pad('Leader', 28) + pad('POPID', 12) + pad('Size', 6) + 'Status',
    '-'.repeat(120),
  ];

  for (const o of orgs) {
    lines.push(
      pad(o.org, 35) +
      pad(o.tradition, 18) +
      pad(o.neighborhood, 18) +
      pad(o.leader, 28) +
      pad(o.popId, 12) +
      pad(o.congregation, 6) +
      o.status
    );
  }

  const filePath = path.join(OUT_DIR, 'faith_registry.txt');
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log('  faith_registry.txt — ' + orgs.length + ' faith organizations');
}

// --- Helpers ---

function pad(str, len) {
  str = String(str || '');
  if (str.length >= len) return str.substring(0, len - 1) + ' ';
  return str + ' '.repeat(len - str.length);
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
