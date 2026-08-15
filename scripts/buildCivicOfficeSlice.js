#!/usr/bin/env node
'use strict';

/**
 * OFFICE/1 pack. Cron food, not a brief.
 * District seats: T4-first people + turf events + job numbers.
 * Appointed citywide: role data + city events media would grab. No filler neighbors.
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

function resolveOffice(officeMap, key) {
  const all = [...(officeMap.offices || []), ...(officeMap.projects || [])];
  const byId = all.find(o => o.officeId === key);
  if (byId) return byId;
  const rows = all.filter(o => o.agentDir === key);
  if (!rows.length) return null;
  const bloc = {
    'civic-office-opp-faction': 'D5',
    'civic-office-crc-faction': 'D7',
    'civic-office-ind-swing': 'D4',
  };
  const want = bloc[key];
  return want ? (rows.find(r => r.district === want) || rows[0]) : rows[0];
}

function isCitywide(office) {
  return !office.district || String(office.district).toLowerCase() === 'citywide';
}

function eventHitsTurf(text, hoods) {
  const t = String(text || '').toLowerCase();
  if (!hoods.length) return true;
  return hoods.some(h => t.indexOf(String(h).toLowerCase()) >= 0);
}

function domainWantsEvent(domain, text) {
  const d = String(domain || '').toLowerCase();
  const t = String(text || '').toLowerCase();
  if (!d) return true;
  if (/crime|safety|police|justice|prosecut|defend|court|iad|cprb|reentry|ombud/.test(d)) {
    return /cop_car|oari|arrest|safety|crime|ticket|police|welfare|substance/.test(t);
  }
  if (/fire/.test(d)) return /fire|pge|transformer|ambulance|building_inspector/.test(t);
  if (/ems|medical|exam|death|health/.test(d)) return /ambulance|injury|health|death|medical/.test(t);
  if (/emerg|crisis/.test(d)) return /crisis|transformer|ambulance|cop_car|pge|spike/.test(t);
  if (/plan|hous/.test(d)) return /building_inspector|housing|infrastructure|inspector/.test(t);
  return true;
}

function loadCycleEvents(root, cycle, hoods, domain) {
  const file = path.join(root, 'output', 'world_summary_c' + cycle + '.md');
  if (!fs.existsSync(file)) return [];
  const md = fs.readFileSync(file, 'utf8');
  const facts = [];
  const chaos = md.split('## Chaos Events')[1] || '';
  const table = chaos.split('**Narrative')[0] || chaos;
  for (const line of table.split('\n')) {
    if (!/^\|/.test(line) || /Vehicle|---/.test(line)) continue;
    const cells = line.split('|').map(s => s.trim()).filter(Boolean);
    if (cells.length < 4) continue;
    const blob = cells.join(' ');
    if (!eventHitsTurf(blob, hoods) && hoods.length) continue;
    if (!domainWantsEvent(domain, blob)) continue;
    facts.push({
      id: 'F-chaos-' + cells[0] + '-' + cells[2].slice(0, 24),
      t: 'FACT',
      text: cells[0] + ' ' + cells[1] + ' → ' + cells[2] + ' ' + cells[3] + ' ' + (cells[4] || ''),
      src: 'world_summary Chaos_Cars',
    });
  }
  const world = md.split('## World Events')[1] || '';
  const worldBody = world.split('## Chaos')[0] || world;
  for (const line of worldBody.split('\n')) {
    if (!/^\- /.test(line)) continue;
    if (!eventHitsTurf(line, hoods) && hoods.length) continue;
    if (!domainWantsEvent(domain, line)) continue;
    facts.push({
      id: 'F-we-' + facts.length,
      t: 'FACT',
      text: line.replace(/^\- /, '').replace(/\*\*/g, '').slice(0, 180),
      src: 'world_summary World Events',
    });
  }
  return facts.slice(0, 12);
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
  const crimeRows = want.size
    ? crime.filter(row => want.has(String(row.Neighborhood || '').toLowerCase()))
    : crime.slice().sort((a, b) => Number(b.IncidentCount || 0) - Number(a.IncidentCount || 0)).slice(0, 8);
  for (const row of crimeRows) {
    const hood = String(row.Neighborhood || '');
    facts.push({
      id: 'F-crime-' + hood.replace(/\s+/g, ''),
      t: 'FACT',
      text: hood + ' crime: property ' + row.PropertyCrimeIndex +
        ', violent ' + row.ViolentCrimeIndex +
        ', incidents ' + row.IncidentCount + ' (cycle ' + row.LastUpdated + ')',
      src: 'engine_audit snapshots.Crime_Metrics',
    });
  }
  if (!want.size) return facts;
  for (const row of map) {
    const hood = String(row.Neighborhood || '');
    if (!want.has(hood.toLowerCase())) continue;
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

function loadProjects(root, cycle, hoods, initiativeId, domain) {
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
    const inHood = names.some(n => hoodSet.has(String(n).toLowerCase()));
    const owned = initiativeId && id === initiativeId;
    let hits = owned || inHood;
    if (!hoodSet.size && !owned) {
      const d = String(domain || '') + ' ' + String(init.name || '');
      hits = /oari|response|crime|safety|police/i.test(d) && /oari|response|safety|police/i.test(init.name || '');
    }
    if (!hits) continue;
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
  const known = loadProjects(root, cycle, hoods, office.initiative, office.dataDomain);
  const events = loadCycleEvents(root, cycle, hoods, office.dataDomain);
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
      agentDir: office.agentDir || agentDir,
    },
    task: {
      a: isCitywide(office) ? 'role-week' : 'district-week',
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
    known: known.concat(turf, events),
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
  const slug = String(pack.actor.officeId || pack.actor.agentDir || 'office')
    .replace(/^civic-office-|^civic-project-/, '');
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
