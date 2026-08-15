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
    const civ = String(row['CIV (y/n)'] || '').toLowerCase().indexOf('y') === 0;
    const med = String(row['MED (y/n)'] || '').toLowerCase().indexOf('y') === 0;
    const famous = civ || med ||
      /\b(athlete|player|pitcher|journalist|reporter|mayor|legend)\b/i.test(role);
    rows.push({
      pop,
      name,
      neighborhood: hood,
      role: role || null,
      famous,
      src: 'output/simulation_ledger_snapshot.jsonl',
    });
  }
  rows.sort((a, b) => (a.famous === b.famous ? a.pop.localeCompare(b.pop) : a.famous ? 1 : -1));
  return rows.slice(0, cap).map(({ famous, ...rest }) => rest);
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
  const known = loadProjects(root, cycle, hoods, office.initiative);

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
        src: p.src,
      })),
      sources: [],
    },
    known,
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
