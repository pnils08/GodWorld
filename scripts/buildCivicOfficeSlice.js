#!/usr/bin/env node
'use strict';

/**
 * OFFICE/1 pack. Same box as a heat slice: code picks the facts, the seat speaks.
 * District: hoods, people, shops, churches, events, numbers.
 * Initiative voice: that initiative + their filing folder. No city dump.
 */

const fs = require('fs');
const path = require('path');
const { getNeighborhoodsForDistricts } = require('../lib/districtMap');
const trackerSnapshot = require('./initiativeTrackerSnapshot');

const ROOT = path.join(__dirname, '..');
const CONSTITUENT_CAP = 8;
const KNOWN_CAP = 20;
const PLACE_CAP = 8;

const CABINET_SLUG = {
  'civic-office-baylight-authority': 'baylight',
  'civic-project-oari': 'oari',
  'civic-project-stabilization-fund': 'stabilization-fund',
  'civic-project-health-center': 'health-center',
  'civic-project-transit-hub': 'transit-hub',
};

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
  const byId = all.find(o => o.officeId === key || o.projectId === key);
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

function seatKind(office) {
  if (office.district && /^D\d$/.test(office.district)) return 'district';
  if (office.initiative || office.projectId) return 'initiative';
  return 'role';
}

function turfHoods(office) {
  if (Array.isArray(office.neighborhoods) && office.neighborhoods.length) {
    return office.neighborhoods.slice();
  }
  if (office.district && /^D\d$/.test(office.district)) {
    return getNeighborhoodsForDistricts(office.district);
  }
  return [];
}

function eventHitsTurf(text, hoods) {
  const t = String(text || '').toLowerCase();
  if (!hoods.length) return false;
  return hoods.some(h => t.indexOf(String(h).toLowerCase()) >= 0);
}

function loadCycleEvents(root, cycle, hoods) {
  if (!hoods.length) return [];
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
    if (!eventHitsTurf(blob, hoods)) continue;
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
    if (!eventHitsTurf(line, hoods)) continue;
    facts.push({
      id: 'F-we-' + facts.length,
      t: 'FACT',
      text: line.replace(/^\- /, '').replace(/\*\*/g, '').slice(0, 180),
      src: 'world_summary World Events',
    });
  }
  return facts.slice(0, 8);
}

function parseRippleBlocks(md) {
  const blocks = {};
  const parts = String(md || '').split(/\n### /);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    if (nl < 0) continue;
    const head = part.slice(0, nl).toLowerCase();
    const key = head.replace(/\s+\(\d+\)\s*$/, '').trim();
    blocks[key] = part.slice(nl + 1);
  }
  return blocks;
}

function parseRippleLine(line) {
  if (!/^\- /.test(line)) return null;
  const cells = line.replace(/^\- /, '').split('|').map(s => s.trim());
  if (cells.length < 2) return null;
  return {
    kind: cells[0] || '',
    text: cells[1] || '',
    hood: cells[2] && !/^mag /i.test(cells[2]) ? cells[2] : '',
    targets: ((cells.join(' ').match(/targets\s+(.+)$/i) || [])[1] || '').trim(),
  };
}

function loadTurfLife(root, cycle, hoods) {
  const businesses = [];
  const churches = [];
  const events = [];
  if (!hoods.length) return { businesses, churches, events };
  const file = path.join(root, 'output', 'world_summary_c' + cycle + '.md');
  if (!fs.existsSync(file)) return { businesses, churches, events };
  const want = new Set(hoods.map(h => String(h).toLowerCase()));
  const blocks = parseRippleBlocks(fs.readFileSync(file, 'utf8'));

  function inTurf(row) {
    const h = String(row.hood || '').toLowerCase();
    if (want.has(h)) return true;
    return eventHitsTurf(row.text + ' ' + row.targets, hoods);
  }

  for (const line of String(blocks['faith-event'] || '').split('\n')) {
    const row = parseRippleLine(line);
    if (!row || !inTurf(row)) continue;
    const name = (row.targets.split('|')[0] || '').trim();
    if (!name || /^POP-/i.test(name)) continue;
    churches.push({
      name,
      neighborhood: row.hood || null,
      text: row.text,
      src: 'world_summary faith-event',
    });
  }
  for (const line of String(blocks['faith-join'] || '').split('\n')) {
    const row = parseRippleLine(line);
    if (!row || !inTurf(row)) continue;
    const m = row.text.match(/at\s+(.+)$/i);
    const name = (m && m[1] || '').trim();
    if (!name) continue;
    churches.push({
      name,
      neighborhood: row.hood || null,
      text: row.text,
      src: 'world_summary faith-join',
    });
  }
  for (const line of String(blocks['lifestyle-sighting'] || '').split('\n')) {
    const row = parseRippleLine(line);
    if (!row || !inTurf(row)) continue;
    const at = row.text.match(/at\s+(.+)$/i);
    const biz = (row.targets.match(/BIZ-\d+/i) || [])[0] || null;
    const name = (at && at[1] || '').trim();
    if (!name && !biz) continue;
    businesses.push({
      id: biz,
      name: name || biz,
      neighborhood: row.hood || null,
      src: 'world_summary lifestyle-sighting',
    });
  }
  for (const line of String(blocks['city-event'] || '').split('\n')) {
    const row = parseRippleLine(line);
    if (!row || !inTurf(row)) continue;
    events.push({
      id: 'F-event-' + events.length,
      t: 'FACT',
      text: row.text + (row.hood ? ' — ' + row.hood : ''),
      src: 'world_summary city-event',
    });
  }
  for (const line of String(blocks['trajectory'] || '').split('\n')) {
    const row = parseRippleLine(line);
    if (!row || !inTurf(row)) continue;
    events.push({
      id: 'F-traj-' + events.length,
      t: 'FACT',
      text: row.text,
      src: 'world_summary trajectory',
    });
  }
  function uniq(rows, key) {
    const seen = new Set();
    const out = [];
    for (const row of rows) {
      const k = String(row[key] || '').toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(row);
    }
    return out;
  }
  return {
    businesses: uniq(businesses, 'name').slice(0, PLACE_CAP),
    churches: uniq(churches, 'name').slice(0, PLACE_CAP),
    events: events.slice(0, 8),
  };
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
  const id = String(office.officeId || office.projectId || '');
  const mine = rows.filter(r => r.Holder).filter(r =>
    String(r.PopId || r.POPID || '').toUpperCase() === pop ||
    String(r.OfficeId || '') === id
  );
  const district = String(office.district || '').toUpperCase();
  const peers = district && district !== 'CITYWIDE'
    ? rows.filter(r => r.Holder && String(r.District || '').toUpperCase() === district)
    : mine.slice();
  return { mine, peers };
}

function loadTurfMetrics(audit, hoods) {
  if (!hoods.length) return [];
  const want = new Set(hoods.map(h => String(h).toLowerCase()));
  const facts = [];
  const crime = (audit && audit.snapshots && audit.snapshots.Crime_Metrics) || [];
  const map = (audit && audit.snapshots && audit.snapshots.Neighborhood_Map) || [];
  for (const row of crime) {
    const hood = String(row.Neighborhood || '');
    if (!want.has(hood.toLowerCase())) continue;
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

function loadTracker(root, cycle) {
  let tracker = loadJson(path.join(root, 'output', 'initiative_tracker.json'));
  if (!tracker || !Array.isArray(tracker.initiatives)) {
    try {
      if (root === ROOT) tracker = trackerSnapshot.loadOrRebuild(cycle);
      else tracker = { initiatives: [] };
    } catch (_) { tracker = { initiatives: [] }; }
  }
  return tracker;
}

function initFact(init) {
  const id = init.id || init.InitiativeID;
  const phase = (init.implementation && (init.implementation.phase || init.implementation.status)) || init.status || '';
  const summary = (init.implementation && init.implementation.summary) || '';
  return {
    id: 'F-' + String(id || init.name || 'init'),
    t: 'FACT',
    text: (init.name || id) + (phase ? ' is in ' + phase : '') + (summary ? ' — ' + String(summary).slice(0, 160) : ''),
    src: 'output/initiative_tracker.json',
  };
}

function loadProjects(root, cycle, hoods, office, kind) {
  const tracker = loadTracker(root, cycle);
  const hoodSet = new Set((hoods || []).map(h => String(h).toLowerCase()));
  const initiativeId = office.initiative;
  const cityBoard = /^(MAYOR-01|DA-01|PD-01)$/.test(office.officeId || '');
  const out = [];
  for (const init of tracker.initiatives || []) {
    const id = init.id || init.InitiativeID;
    const names = init.neighborhoods || [];
    const inHood = names.some(n => hoodSet.has(String(n).toLowerCase()));
    const owned = initiativeId && id === initiativeId;
    let hits = false;
    if (kind === 'initiative') hits = !!owned;
    else if (kind === 'district') hits = inHood;
    else if (kind === 'role') hits = cityBoard;
    if (!hits) continue;
    out.push(initFact(init));
  }
  return out;
}

function cabinetPath(root, office) {
  for (const s of office.dataSources || []) {
    const m = String(s).match(/output\/city-civic-database\/initiatives\/[a-z0-9-]+\/?/);
    if (m) return path.join(root, m[0]);
  }
  const slug = CABINET_SLUG[office.agentDir];
  if (!slug) return null;
  return path.join(root, 'output', 'city-civic-database', 'initiatives', slug);
}

function loadCabinet(root, office) {
  const dir = cabinetPath(root, office);
  if (!dir || !fs.existsSync(dir)) return [];
  const facts = [];
  const names = fs.readdirSync(dir).sort();
  for (const name of names) {
    if (facts.length >= 8) break;
    const full = path.join(dir, name);
    const src = path.relative(root, full).replace(/\\/g, '/');
    if (name.endsWith('.json')) {
      const j = loadJson(full);
      if (!j) continue;
      const tu = j.trackerUpdates || {};
      const bits = [
        j.initiativeId || j.initiative || '',
        tu.ImplementationPhase || '',
        tu.MilestoneNotes || '',
      ].filter(Boolean);
      if (!bits.length) continue;
      facts.push({
        id: 'F-cabinet-' + name.replace(/\W+/g, '').slice(0, 24),
        t: 'FACT',
        text: bits.join(' — ').slice(0, 200),
        src,
      });
      continue;
    }
    if (!name.endsWith('.md')) continue;
    const md = fs.readFileSync(full, 'utf8');
    const heading = ((md.match(/^#\s+(.+)$/m) || [])[1] || name.replace(/\.md$/, '')).trim();
    facts.push({
      id: 'F-doc-' + name.replace(/\W+/g, '').slice(0, 24),
      t: 'FACT',
      text: heading.slice(0, 180),
      src,
    });
  }
  return facts;
}

function loadCascadeVoices(root, initiativeId) {
  if (!initiativeId) return [];
  const file = path.join(root, '.claude', 'skills', 'city-hall', 'CASCADE_ROUTING.md');
  if (!fs.existsSync(file)) return [];
  const md = fs.readFileSync(file, 'utf8');
  const needle = '## ' + initiativeId;
  const start = md.indexOf(needle);
  if (start < 0) return [];
  const rest = md.slice(start + needle.length);
  const end = rest.search(/\n## /);
  const body = end >= 0 ? rest.slice(0, end) : rest;
  const voices = [];
  for (const line of body.split('\n')) {
    const m = line.match(/Cascade to:\s+(\S+)/i);
    if (!m) continue;
    voices.push({
      kind: 'city-hall-voice',
      agentDir: m[1],
      initiative: initiativeId,
      src: '.claude/skills/city-hall/CASCADE_ROUTING.md',
    });
  }
  return voices;
}

function buildPack(opts) {
  const root = opts.root || ROOT;
  const cycle = String(opts.cycle || '');
  const agentDir = opts.agentDir;
  const officeMap = opts.officeMap || loadOfficeMap(root);
  const office = resolveOffice(officeMap, agentDir);
  if (!office) throw new Error('no office row for ' + agentDir);

  const kind = seatKind(office);
  const hoods = turfHoods(office);
  const people = kind === 'role' ? [] : loadConstituents(root, hoods, opts.cap || CONSTITUENT_CAP);
  const audit = opts.audit || loadAudit(root, cycle);
  const job = loadOfficeJob(audit, office);
  const turf = kind === 'role' ? [] : loadTurfMetrics(audit, hoods);
  const life = kind === 'role' ? { businesses: [], churches: [], events: [] } : loadTurfLife(root, cycle, hoods);
  const chaos = kind === 'role' ? [] : loadCycleEvents(root, cycle, hoods);
  const known = loadProjects(root, cycle, hoods, office, kind);
  if (kind === 'initiative') {
    for (const row of loadCabinet(root, office)) known.push(row);
  }
  for (const row of job.mine) {
    known.unshift({
      id: 'F-office-' + (row.OfficeId || 'seat'),
      t: 'FACT',
      text: (row.Holder || office.holder) + ' holds ' + (row.OfficeId || office.officeId || office.projectId) +
        (row.Approval != null && row.Approval !== '' ? ' at approval ' + row.Approval : ''),
      src: 'engine_audit snapshots.Civic_Office_Ledger',
    });
  }

  const taskName = kind === 'district' ? 'district-week' : kind === 'initiative' ? 'initiative-week' : 'role-week';
  const sources = kind === 'initiative' ? loadCascadeVoices(root, office.initiative) : [];

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
      initiative: office.initiative || null,
    },
    task: { a: taskName },
    signal: {
      kind: kind === 'district' ? 'district-heat' : kind === 'initiative' ? 'initiative-heat' : 'role-heat',
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
      businesses: life.businesses,
      churches: life.churches,
      sources,
    },
    known: known.concat(turf, life.events, chaos).slice(0, KNOWN_CAP),
    role: {
      officeRows: job.mine,
      civicPeers: job.peers.slice(0, 12),
    },
    limits: {
      assert: [
        'only named subjects in exposure.subjects',
        'only named shops in exposure.businesses',
        'only named churches in exposure.churches',
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
  buildPack, resolveOffice, turfHoods, loadConstituents, loadProjects, loadTurfLife,
  loadCabinet, seatKind, writePack, CONSTITUENT_CAP,
};

if (require.main === module) {
  const cycle = arg('--cycle', '103');
  const agentDir = arg('--office', 'civic-office-crc-faction');
  const pack = buildPack({ cycle, agentDir, root: ROOT });
  const file = writePack(pack, ROOT, cycle);
  console.log(file);
  console.log(pack.actor.name + ' · ' + pack.task.a + ' · ' +
    (pack.actor.district || pack.actor.initiative || 'citywide') + ' · ' +
    pack.exposure.subjects.length + ' people · ' +
    (pack.exposure.businesses || []).length + ' shops · ' +
    (pack.exposure.churches || []).length + ' churches · ' +
    pack.known.length + ' facts');
}
