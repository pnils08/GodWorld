#!/usr/bin/env node
'use strict';

/**
 * District pack for a civic OFFICE (not a reporter).
 * Sunday they still get city-hall packets. This file is Mon–Thu: who lives
 * in the turf, what projects sit there, what they must not invent.
 *
 * Disk-first. Missing people list = empty, never guessed.
 */

const fs = require('fs');
const path = require('path');
const { getNeighborhoodsForDistricts } = require('../lib/districtMap');
const trackerSnapshot = require('./initiativeTrackerSnapshot');

const ROOT = path.join(__dirname, '..');
const CONSTITUENT_CAP = 8;

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

function loadJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function loadOfficeMap(root) {
  return loadJson(path.join(root, 'scripts', 'civic-office-map.json')) || { offices: [], projects: [] };
}

function resolveOffice(officeMap, agentDir) {
  const rows = [...(officeMap.offices || []), ...(officeMap.projects || [])]
    .filter(o => o.agentDir === agentDir);
  if (!rows.length) return null;
  const bloc = {
    'civic-office-opp-faction': 'D5',
    'civic-office-crc-faction': 'D7',
    'civic-office-ind-swing': 'D4',
  };
  const want = bloc[agentDir];
  return want ? (rows.find(r => r.district === want) || rows[0]) : rows[0];
}

function turfHoods(office) {
  if (office.district && /^D\d$/.test(office.district)) {
    return getNeighborhoodsForDistricts(office.district);
  }
  if (Array.isArray(office.neighborhoods) && office.neighborhoods.length) {
    return office.neighborhoods.slice();
  }
  return [];
}

function loadConstituents(root, hoods, cap) {
  const file = path.join(root, 'output', 'simulation_ledger_snapshot.jsonl');
  if (!fs.existsSync(file) || !hoods.length) return [];
  const want = new Set(hoods.map(h => String(h).toLowerCase()));
  const rows = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    let row;
    try { row = JSON.parse(line); } catch (_) { continue; }
    const st = String(row.Status || 'active').toLowerCase();
    if (st && st !== 'active') continue;
    const hood = String(row.Neighborhood || '').trim();
    if (!want.has(hood.toLowerCase())) continue;
    const pop = String(row.POPID || '').trim().toUpperCase();
    const name = String(row.Name || ((row.First || '') + ' ' + (row.Last || '')).trim()).trim();
    if (!pop || !name) continue;
    const role = String(row.RoleType || '').trim();
    const tier = Number(row.Tier);
    rows.push({
      pop,
      name,
      neighborhood: hood,
      role: role || null,
      tier: isFinite(tier) ? tier : 3,
      src: 'output/simulation_ledger_snapshot.jsonl',
    });
  }
  // All ledger people are fair game. Invert protection: Tier 4 first, Tier 1 last.
  rows.sort((a, b) => (b.tier - a.tier) || a.pop.localeCompare(b.pop));
  return rows.slice(0, cap);
}

function loadAudit(root, cycle) {
  return loadJson(path.join(root, 'output', 'engine_audit_c' + cycle + '.json')) ||
    loadJson(path.join(root, 'output', 'engine_audit.json'));
}

function loadOfficeJob(audit, office) {
  const rows = (audit && audit.snapshots && audit.snapshots.Civic_Office_Ledger) || [];
  const pop = String(office.popid || '').toUpperCase();
  const id = String(office.officeId || '');
  const mine = rows.filter(r => r.Holder).filter(r =>
    String(r.PopId || r.POPID || '').toUpperCase() === pop ||
    String(r.OfficeId || '') === id
  );
  const district = String(office.district || '').toUpperCase();
  const peers = rows.filter(r => r.Holder && String(r.District || '').toUpperCase() === district);
  return { mine, peers };
}

function loadTurfMetrics(audit, hoods) {
  const want = new Set((hoods || []).map(h => String(h).toLowerCase()));
  const facts = [];
  const crime = (audit && audit.snapshots && audit.snapshots.Crime_Metrics) || [];
  const map = (audit && audit.snapshots && audit.snapshots.Neighborhood_Map) || [];
  for (const row of crime) {
    const hood = String(row.Neighborhood || '');
    if (want.size && !want.has(hood.toLowerCase())) continue;
    facts.push({
      id: 'F-crime-' + hood.replace(/\s+/g, ''),
      t: 'FACT',
      text: hood + ' crime: property ' + row.PropertyCrimeIndex +
        ', violent ' + row.ViolentCrimeIndex +
        ', incidents ' + row.IncidentCount + ' (cycle ' + row.LastUpdated + ')',
      src: 'engine_audit snapshots.Crime_Metrics',
    });
  }
  for (const row of map) {
    const hood = String(row.Neighborhood || '');
    if (want.size && !want.has(hood.toLowerCase())) continue;
    const bits = [];
    if (row.Sentiment != null && row.Sentiment !== '') bits.push('sentiment ' + row.Sentiment);
    if (row.RetailVitality != null && row.RetailVitality !== '') bits.push('retail ' + row.RetailVitality);
    if (row.CrimeIndex != null && row.CrimeIndex !== '') bits.push('crime index ' + row.CrimeIndex);
    if (row.HousingPressure != null && row.HousingPressure !== '') bits.push('housing pressure ' + row.HousingPressure);
    if (!bits.length) continue;
    facts.push({
      id: 'F-hood-' + hood.replace(/\s+/g, ''),
      t: 'FACT',
      text: hood + ': ' + bits.join(', '),
      src: 'engine_audit snapshots.Neighborhood_Map',
    });
  }
  return facts;
}

function loadProjects(root, cycle, hoods, initiativeId) {
  let tracker = loadJson(path.join(root, 'output', 'initiative_tracker.json'));
  if (!tracker || !Array.isArray(tracker.initiatives)) {
    try {
      if (root === ROOT) tracker = trackerSnapshot.loadOrRebuild(cycle);
      else tracker = { initiatives: [] };
    } catch (_) { tracker = { initiatives: [] }; }
  }
  const hoodSet = new Set((hoods || []).map(h => String(h).toLowerCase()));
  const out = [];
  for (const init of tracker.initiatives || []) {
    const id = init.id || init.InitiativeID;
    const names = init.neighborhoods || [];
    const hits = !hoodSet.size
      || (initiativeId && id === initiativeId)
      || names.some(n => hoodSet.has(String(n).toLowerCase()));
    if (!hits && hoodSet.size) continue;
    const phase = (init.implementation && (init.implementation.phase || init.implementation.status)) || init.status || '';
    const summary = (init.implementation && init.implementation.summary) || '';
    out.push({
      id: 'F-' + String(id || init.name || 'init'),
      t: 'FACT',
      text: (init.name || id) + (phase ? ' is in ' + phase : '') + (summary ? ' — ' + String(summary).slice(0, 160) : ''),
      src: 'output/initiative_tracker.json',
    });
  }
  return out;
}

function buildPack(opts) {
  const root = opts.root || ROOT;
  const cycle = String(opts.cycle || '');
  const agentDir = opts.agentDir;
  const officeMap = opts.officeMap || loadOfficeMap(root);
  const office = resolveOffice(officeMap, agentDir);
  if (!office) throw new Error('no office row for ' + agentDir);

  const hoods = turfHoods(office);
  const people = loadConstituents(root, hoods, opts.cap || CONSTITUENT_CAP);
  const audit = opts.audit || loadAudit(root, cycle);
  const job = loadOfficeJob(audit, office);
  const turf = loadTurfMetrics(audit, hoods);
  const known = loadProjects(root, cycle, hoods, office.initiative);
  for (const row of job.mine) {
    known.unshift({
      id: 'F-office-' + (row.OfficeId || 'seat'),
      t: 'FACT',
      text: (row.Holder || office.holder) + ' holds ' + (row.OfficeId || office.officeId) +
        (row.Approval != null && row.Approval !== '' ? ' at approval ' + row.Approval : ''),
      src: 'engine_audit snapshots.Civic_Office_Ledger',
    });
  }

  return {
    v: 'OFFICE/1',
    team: 'civic-office',
    actor: {
      id: office.popid || agentDir,
      name: office.holder,
      role: office.title,
      officeId: office.officeId || office.projectId || null,
      district: office.district || null,
      faction: office.faction || null,
      agentDir,
    },
    task: {
      goal: 'Live with this district. Remember it. Sunday you fight for what you already know.',
      assignment: 'weekday-district',
      approach: 'Speak only from this pack and your prior notes. Do not invent people or counts.',
    },
    signal: {
      kind: 'district-heat',
      hoods,
      src: 'lib/districtMap.js + civic-office-map.json',
    },
    exposure: {
      subjects: people.map(p => ({
        pop: p.pop,
        name: p.name,
        neighborhood: p.neighborhood,
        role: p.role,
        tier: p.tier,
        src: p.src,
      })),
      sources: [],
    },
    known: known.concat(turf),
    role: {
      officeRows: job.mine,
      civicPeers: job.peers.slice(0, 12),
    },
    limits: {
      assert: [
        'only named subjects in exposure.subjects',
        'only project facts in known',
        'no invented POPID, vote, or complete',
      ],
      invent: ['no new citizens', 'no new businesses', 'no sheet numbers'],
    },
    output: {
      contract: 'statement + action + numberMoved',
      dest: 'office wiki (civic.16) then next Sunday city-hall packet',
    },
  };
}

function writePack(pack, root, cycle) {
  const dir = path.join(root, 'output', 'cron-civic', 'packs');
  fs.mkdirSync(dir, { recursive: true });
  const slug = String(pack.actor.agentDir).replace(/^civic-office-|^civic-project-/, '');
  const file = path.join(dir, slug + '_c' + cycle + '.json');
  fs.writeFileSync(file, JSON.stringify(pack, null, 2) + '\n');
  return file;
}

module.exports = {
  buildPack, resolveOffice, turfHoods, loadConstituents, loadProjects, writePack, CONSTITUENT_CAP,
};

if (require.main === module) {
  const cycle = arg('--cycle', '103');
  const agentDir = arg('--office', 'civic-office-crc-faction');
  const pack = buildPack({ cycle, agentDir, root: ROOT });
  const file = writePack(pack, ROOT, cycle);
  console.log(file);
  console.log(pack.actor.name + ' · ' + (pack.actor.district || 'citywide') + ' · ' +
    pack.exposure.subjects.length + ' people · ' + pack.known.length + ' project facts');
}
