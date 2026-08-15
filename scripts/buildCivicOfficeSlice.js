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
  if (!cap) return rows;
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
    if (row.NeighborhoodTrajectory) bits.push(String(row.NeighborhoodTrajectory));
    if (row.TrajectoryMomentum != null && row.TrajectoryMomentum !== '') bits.push('momentum ' + row.TrajectoryMomentum);
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

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function avg(xs) {
  const v = xs.filter(x => x != null);
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function scoreHoods(audit) {
  const map = (audit && audit.snapshots && audit.snapshots.Neighborhood_Map) || [];
  const ms = avg(map.map(r => num(r.Sentiment)));
  const mc = avg(map.map(r => num(r.CrimeIndex)));
  const scored = [];
  for (const r of map) {
    const hood = String(r.Neighborhood || '').trim();
    if (!hood) continue;
    const sent = num(r.Sentiment);
    const crime = num(r.CrimeIndex);
    const traj = String(r.NeighborhoodTrajectory || '').toLowerCase();
    const mom = num(r.TrajectoryMomentum);
    let heat = 0;
    const why = [];
    if (ms != null && sent != null) {
      const gap = ms - sent;
      heat += gap * 100;
      why.push('sentiment ' + sent + ' vs city ' + ms.toFixed(3));
    }
    if (mc != null && crime != null && crime > mc) {
      heat += (crime - mc) * 20;
      why.push('crime index ' + crime + ' vs city ' + mc.toFixed(3));
    }
    if (traj === 'decay') {
      heat += 15 + (mom || 0);
      why.push(traj + ' momentum ' + (mom == null ? '?' : mom));
    }
    scored.push({
      hood, heat, sent, crime, traj, mom,
      start: r.TrajectoryStartCycle || null,
      citySent: ms,
      cityCrime: mc,
      why,
      outlier: ms != null && sent != null && (ms - sent) >= 0.08,
    });
  }
  scored.sort((a, b) => b.heat - a.heat);
  return scored;
}

function loadFactionPeers(officeMap, office) {
  if (!office.faction || !/^D\d$/.test(String(office.district || ''))) return [];
  return (officeMap.offices || []).filter(o =>
    o.faction === office.faction &&
    o.officeId !== office.officeId &&
    /^COUNCIL-/.test(String(o.officeId || ''))
  ).map(o => ({
    OfficeId: o.officeId,
    PopId: o.popid,
    Holder: o.holder,
    District: o.district,
    Faction: o.faction,
    Approval: o.approval,
  }));
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

function loadInitRows(root, cycle, hoods, office, kind) {
  const tracker = loadTracker(root, cycle);
  const hoodSet = new Set((hoods || []).map(h => String(h).toLowerCase()));
  const initiativeId = office.initiative;
  const out = [];
  for (const init of tracker.initiatives || []) {
    const id = init.id || init.InitiativeID;
    const names = init.neighborhoods || [];
    const inHood = names.some(n => hoodSet.has(String(n).toLowerCase()));
    const owned = initiativeId && id === initiativeId;
    let hits = false;
    if (kind === 'initiative') hits = !!owned;
    else if (kind === 'district') hits = inHood;
    else if (kind === 'role' && office.officeId === 'MAYOR-01') hits = true;
    else if (kind === 'role' && /^(DA-01|PD-01)$/.test(office.officeId || '')) {
      hits = /safety|justice|oari|crime|court|legal/i.test(String(init.domain || '') + ' ' + String(init.name || ''));
    }
    if (!hits) continue;
    out.push(init);
  }
  return out;
}

function loadProjects(root, cycle, hoods, office, kind) {
  return loadInitRows(root, cycle, hoods, office, kind).map(initFact);
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

function loadCabinet(root, office, cycle) {
  const dir = cabinetPath(root, office);
  if (!dir || !fs.existsSync(dir)) return [];
  const jsons = fs.readdirSync(dir).filter(n => /^decisions_c\d+\.json$/i.test(n));
  jsons.sort((a, b) => Number((b.match(/\d+/) || [0])[0]) - Number((a.match(/\d+/) || [0])[0]));
  const want = jsons.find(n => n === 'decisions_c' + cycle + '.json') || jsons[0];
  if (!want) return [];
  const full = path.join(dir, want);
  const j = loadJson(full);
  if (!j) return [];
  const tu = j.trackerUpdates || {};
  const bits = [
    j.initiativeId || j.initiative || '',
    tu.ImplementationPhase || '',
    tu.MilestoneNotes || '',
    tu.NextScheduledAction || '',
  ].filter(Boolean);
  if (!bits.length) return [];
  return [{
    id: 'F-cabinet-' + want.replace(/\W+/g, '').slice(0, 24),
    t: 'FACT',
    text: bits.join(' — ').slice(0, 220),
    src: path.relative(root, full).replace(/\\/g, '/'),
  }];
}

function approvalOf(job) {
  const row = (job.mine || [])[0];
  if (!row || row.Approval == null || row.Approval === '') return null;
  const n = Number(row.Approval);
  return Number.isFinite(n) ? n : null;
}

function initHeat(init, cycle, owned) {
  const impl = init.implementation || {};
  const due = Number(impl.nextActionCycle);
  const blob = [impl.phase, impl.status, impl.summary, impl.nextScheduledAction].join(' ');
  let s = 8;
  if (owned) s += 50;
  if (due === Number(cycle)) s += 40;
  if (/stall|bottleneck|review|shortlist|disbursement|accelerat|double shift|HCAI/i.test(blob)) s += 22;
  if (/disbursement-active|construction-active|pilot-active/.test(String(impl.phase || ''))) s += 10;
  return s;
}

function peopleForPick(people, pick) {
  const hood = pick && pick.hood;
  const inHood = hood
    ? people.filter(p => String(p.neighborhood || '').toLowerCase() === String(hood).toLowerCase())
    : people.slice();
  const blob = String(
    (pick.init && ((pick.init.name || '') + ' ' + (pick.init.domain || ''))) || pick.label || ''
  ).toLowerCase();
  function hit(role) {
    const r = String(role || '').toLowerCase();
    if (/hous|stab|displac|tenant|fund|economic/.test(blob)) {
      return /shelter|organiz|reentry|housing|tenant|social/.test(r) ? 2 : 0;
    }
    if (/health/.test(blob)) return /nurse|health|aide|clinic|medical/.test(r) ? 2 : 0;
    if (/oari|safety/.test(blob)) return /counsel|organiz|reentry/.test(r) ? 2 : 0;
    return 0;
  }
  return inHood.slice().sort((a, b) =>
    (hit(b.role) - hit(a.role)) || (b.tier - a.tier) || a.pop.localeCompare(b.pop)
  ).slice(0, 4);
}

function pickTurn(opts) {
  const { kind, office, cycle, inits, job, life, hoods, turf, chaos, cabinet, hoodScores } = opts;
  const approval = approvalOf(job);
  const candidates = [];
  if (kind === 'district' && hoodScores && hoodScores.length) {
    const want = new Set(hoods.map(h => String(h).toLowerCase()));
    const turfH = hoodScores.filter(h => want.has(String(h.hood).toLowerCase()));
    const topH = turfH[0];
    if (topH && topH.outlier) {
      candidates.push({
        type: 'hood-heat',
        score: 200 + topH.heat,
        className: 'district-heat',
        label: topH.hood + ' — ' + (topH.why[0] || 'district outlier'),
        lever: 'stand with ' + topH.hood + ' or leave it',
        hood: topH.hood,
        hoodScore: topH,
      });
    }
  }
  for (const init of inits) {
    const owned = office.initiative && (init.id || init.InitiativeID) === office.initiative;
    const impl = init.implementation || {};
    const hoodLc = hoods.map(h => String(h).toLowerCase());
    candidates.push({
      type: 'initiative',
      score: initHeat(init, cycle, owned),
      init,
      className: 'initiative',
      label: (init.name || init.id) + ' — ' + (impl.nextScheduledAction || impl.phase || 'live'),
      lever: impl.nextScheduledAction || 'advance or hold this initiative',
      hood: (owned && hoods[0])
        || (init.neighborhoods || []).find(n => hoodLc.indexOf(String(n).toLowerCase()) >= 0)
        || (init.neighborhoods || [])[0]
        || hoods[0]
        || null,
    });
  }
  if (kind === 'district' && approval != null && approval < 55) {
    const cool = (turf || []).find(f => /sentiment 0\.[0-3]/.test(f.text));
    candidates.push({
      type: 'approval-pressure',
      score: 50 + (55 - approval),
      className: 'approval-pressure',
      label: office.holder + ' at approval ' + approval + (cool ? ' — ' + cool.text : ''),
      lever: 'defend the district or go quiet',
      hood: hoods[0] || null,
      approval,
      fact: cool || null,
    });
  }
  candidates.sort((a, b) => b.score - a.score || String((a.init && a.init.id) || '').localeCompare(String((b.init && b.init.id) || '')));
  const top = candidates[0];
  if (!top) {
    return {
      empty: true,
      pulse: null,
      prewrite: {
        claim: null,
        lineFacts: [],
        missing: ['no due action on this seat this cycle'],
      },
      known: [],
    };
  }

  const known = [];
  const lineFacts = [];
  if (approval != null) {
    const seatId = office.officeId || office.projectId || 'seat';
    known.push({
      id: 'F-office-' + seatId,
      t: 'FACT',
      text: (office.holder || '') + ' holds ' + seatId + ' at approval ' + approval,
      src: 'engine_audit snapshots.Civic_Office_Ledger',
    });
    lineFacts.push('approval ' + approval);
  }
  if (top.hoodScore) {
    const h = top.hoodScore;
    const text = h.hood + ': ' + h.why.join('; ') +
      (h.traj ? '; ' + h.traj + (h.mom != null ? ' momentum ' + h.mom : '') : '');
    known.push({
      id: 'F-heat-' + String(h.hood).replace(/\s+/g, ''),
      t: 'FACT',
      text,
      src: 'engine_audit snapshots.Neighborhood_Map ranked vs city',
    });
    lineFacts.push(text);
  }
  if (top.init) {
    const fact = initFact(top.init);
    known.push(fact);
    lineFacts.push(fact.text);
    const impl = top.init.implementation || {};
    if (impl.nextScheduledAction) lineFacts.push('due: ' + impl.nextScheduledAction);
  }
  for (const row of cabinet || []) {
    known.push(row);
    lineFacts.push(row.text);
  }
  const pickHood = top.hood ? String(top.hood).toLowerCase() : '';
  for (const row of turf || []) {
    if (pickHood && row.text.toLowerCase().indexOf(pickHood) < 0) continue;
    known.push(row);
    lineFacts.push(row.text);
  }
  for (const row of (life.events || []).concat(chaos || [])) {
    if (pickHood && row.text.toLowerCase().indexOf(pickHood) < 0) continue;
    if (known.length >= 10) break;
    known.push(row);
  }

  const missing = [];
  if (!(life.businesses || []).length) missing.push('no shop names on disk for this turf');
  if (top.init && /stab|disbursement/i.test(String(top.init.name || '') + String((top.init.implementation || {}).phase || ''))) {
    missing.push('no named applicant households — do not invent who got the check');
  }
  missing.push('no invented vote, POPID, or complete');

  return {
    empty: false,
    pulse: {
      className: top.className,
      score: top.score,
      label: top.label,
      lever: top.lever,
      hood: top.hood,
      initiative: top.init ? (top.init.id || top.init.InitiativeID) : null,
      vsCity: top.hoodScore ? {
        sentiment: top.hoodScore.sent,
        citySentiment: top.hoodScore.citySent,
        heat: top.hoodScore.heat,
        outlier: top.hoodScore.outlier,
      } : null,
    },
    prewrite: {
      claim: top.lever,
      lineFacts: lineFacts.slice(0, 6),
      missing,
    },
    known: known.slice(0, 12),
  };
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
  const peopleAll = kind === 'role' ? [] : loadConstituents(root, hoods, opts.cap || 0);
  const audit = opts.audit || loadAudit(root, cycle);
  const job = loadOfficeJob(audit, office);
  const turf = kind === 'role' ? [] : loadTurfMetrics(audit, hoods);
  const life = kind === 'role' ? { businesses: [], churches: [], events: [] } : loadTurfLife(root, cycle, hoods);
  const chaos = kind === 'role' ? [] : loadCycleEvents(root, cycle, hoods);
  const inits = loadInitRows(root, cycle, hoods, office, kind);
  const cabinet = kind === 'initiative' ? loadCabinet(root, office, cycle) : [];
  const hoodScores = scoreHoods(audit);
  const turn = pickTurn({ kind, office, cycle, inits, job, life, hoods, turf, chaos, cabinet, hoodScores });
  const people = turn.empty ? [] : peopleForPick(peopleAll, {
    init: inits.find(i => turn.pulse && (i.id || i.InitiativeID) === turn.pulse.initiative),
    label: turn.pulse && turn.pulse.label,
    hood: turn.pulse && turn.pulse.hood,
  });
  if (!turn.empty && turn.pulse && turn.pulse.hood && !people.length) {
    turn.prewrite.missing.unshift('no active ledger people in ' + turn.pulse.hood + ' — do not borrow other hoods');
  }

  const taskName = kind === 'district' ? 'district-week' : kind === 'initiative' ? 'initiative-week' : 'role-week';
  const sources = kind === 'initiative' && !turn.empty ? loadCascadeVoices(root, office.initiative) : [];

  return {
    v: 'OFFICE/1',
    team: 'civic-office',
    empty: !!turn.empty,
    actor: {
      id: office.popid || agentDir,
      name: office.holder,
      role: office.title,
      officeId: office.officeId || office.projectId || null,
      district: office.district || null,
      faction: office.faction || null,
      agentDir: office.agentDir || agentDir,
      initiative: office.initiative || null,
      dials: { approval: approvalOf(job) },
    },
    task: {
      a: taskName,
      goal: turn.empty ? 'no move this cycle' : turn.pulse.lever,
    },
    pulse: turn.pulse,
    prewrite: turn.prewrite,
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
        why: turn.pulse && turn.pulse.hood
          ? 'lives in ' + turn.pulse.hood + (turn.pulse.label ? ' — ' + turn.pulse.label : '')
          : null,
      })),
      businesses: turn.empty ? [] : (turn.pulse && turn.pulse.hood
        ? life.businesses.filter(b => String(b.neighborhood || '').toLowerCase() === String(turn.pulse.hood).toLowerCase())
        : life.businesses),
      churches: turn.empty ? [] : (turn.pulse && turn.pulse.hood
        ? life.churches.filter(c => String(c.neighborhood || '').toLowerCase() === String(turn.pulse.hood).toLowerCase())
        : life.churches),
      sources,
    },
    known: turn.known,
    role: {
      officeRows: job.mine,
      civicPeers: (loadFactionPeers(officeMap, office).length
        ? loadFactionPeers(officeMap, office)
        : job.peers.filter(r => String(r.OfficeId || '') !== String(office.officeId || ''))
      ).slice(0, 8),
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
  loadCabinet, loadInitRows, seatKind, pickTurn, scoreHoods, loadFactionPeers,
  writePack, CONSTITUENT_CAP,
};

if (require.main === module) {
  const cycle = arg('--cycle', '103');
  const agentDir = arg('--office', 'civic-office-crc-faction');
  const pack = buildPack({ cycle, agentDir, root: ROOT });
  const file = writePack(pack, ROOT, cycle);
  console.log(file);
  console.log(pack.actor.name + ' · ' + pack.task.a +
    (pack.empty ? ' · EMPTY' : ' · ' + (pack.pulse && pack.pulse.label || '')) +
    ' · ' + pack.exposure.subjects.length + ' people · ' +
    pack.known.length + ' facts');
}
