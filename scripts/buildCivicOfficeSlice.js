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
const { interventionIssue } = require('./civicInterventionValidation');

const ROOT = path.join(__dirname, '..');
const CONSTITUENT_CAP = 8;
const KNOWN_CAP = 20;
const PLACE_CAP = 8;
const BLOCK_CAP = 600;   // civic.38 Task 3.5 — same discipline as the civic.37 node builders

// civic.38: a complaint = Tag Civic + negative Affect (plan §Reconciliation,
// measured 2026-09-20). Same closed affect vocab as compressLifeHistory.js.
const NEGATIVE_AFFECTS = new Set(['frustrated', 'irritable', 'anxious', 'angry', 'resentful']);

function clip(s, n) {
  const t = String(s || '');
  if (t.length <= n) return t;
  const cut = t.slice(0, n);
  const sp = cut.lastIndexOf(' ');
  const out = (sp > Math.floor(n * 0.6) ? cut.slice(0, sp) : cut).replace(/[\s.,;:]+$/, '');
  return out + '…';
}

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
      text: clip(line.replace(/^\- /, '').replace(/\*\*/g, ''), 180),
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
  const exact = path.join(root, 'output', 'engine_audit_c' + cycle + '.json');
  const file = fs.existsSync(exact) ? exact : path.join(root, 'output', 'engine_audit.json');
  if (!fs.existsSync(file)) return null;
  const audit = JSON.parse(fs.readFileSync(file, 'utf8'));
  requireCycle(audit, cycle, 'engine audit');
  return audit;
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
  const cityProp = avg(crime.map(r => num(r.PropertyCrimeIndex)));
  const cityViol = avg(crime.map(r => num(r.ViolentCrimeIndex)));
  const cityInc = avg(crime.map(r => num(r.IncidentCount)));
  for (const row of crime) {
    const hood = String(row.Neighborhood || '');
    if (!want.has(hood.toLowerCase())) continue;
    let text = hood + ' crime: property ' + row.PropertyCrimeIndex +
      ', violent ' + row.ViolentCrimeIndex +
      ', incidents ' + row.IncidentCount + ' (cycle ' + row.LastUpdated + ')';
    if (cityProp != null && cityViol != null) {
      text += ' — city property ' + cityProp.toFixed(1) +
        ', violent ' + cityViol.toFixed(1) +
        ', incidents ' + (cityInc == null ? '?' : cityInc.toFixed(1));
    }
    facts.push({
      id: 'F-crime-' + hood.replace(/\s+/g, ''),
      t: 'FACT',
      text,
      src: 'engine_audit snapshots.Crime_Metrics',
    });
  }
  const ranked = scoreHoods(audit);
  const byHood = new Map(ranked.map(h => [String(h.hood).toLowerCase(), h]));
  for (const row of map) {
    const hood = String(row.Neighborhood || '');
    if (!want.has(hood.toLowerCase())) continue;
    const r = byHood.get(hood.toLowerCase());
    const bits = [];
    if (r && r.why.length) bits.push.apply(bits, r.why);
    else {
      if (row.Sentiment != null && row.Sentiment !== '') bits.push('sentiment ' + row.Sentiment);
      if (row.CrimeIndex != null && row.CrimeIndex !== '') bits.push('crime index ' + row.CrimeIndex);
    }
    if (row.RetailVitality != null && row.RetailVitality !== '') bits.push('retail ' + row.RetailVitality);
    if (row.HousingPressure != null && row.HousingPressure !== '') bits.push('housing pressure ' + row.HousingPressure);
    if (row.NeighborhoodTrajectory) bits.push(String(row.NeighborhoodTrajectory));
    if (row.TrajectoryMomentum != null && row.TrajectoryMomentum !== '') bits.push('momentum ' + row.TrajectoryMomentum);
    if (!bits.length) continue;
    facts.push({
      id: 'F-hood-' + hood.replace(/\s+/g, ''),
      t: 'FACT',
      text: hood + ': ' + bits.join('; '),
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
    if (mc != null && crime != null) {
      if (crime > mc) heat += (crime - mc) * 20;
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
  // civic.29: budget is the one hard number a report/gavel turn can legitimately
  // cite. Without it in known[], seats fabricate a plausible-sounding dollar or
  // percent figure instead — the tracker already carries it, it was just never
  // surfaced into the pack (mayor + health-center fabrication chase, 2026-08-31).
  const budget = init.budget ? '; budget ' + init.budget : '';
  return {
    id: 'F-' + String(id || init.name || 'init'),
    t: 'FACT',
    text: (init.name || id) + (phase ? ' is in ' + phase : '') + budget + (summary ? ' — ' + clip(summary, 240) : ''),
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
    text: clip(bits.join(' — '), 220),
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
      vsCity: (function vs() {
        const h = top.hoodScore || (hoodScores || []).find(x =>
          String(x.hood).toLowerCase() === String(top.hood || '').toLowerCase());
        if (!h) return null;
        return {
          sentiment: h.sent,
          citySentiment: h.citySent,
          crime: h.crime,
          cityCrime: h.cityCrime,
          heat: h.heat,
          outlier: h.outlier,
        };
      }()),
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

// ---------------------------------------------------------------------------
// civic.38 Task 3 — the game blocks. The pack stops being only a speech
// prompt: the seat sees its board (what it can `work`), its district's
// petition pool (what it should `answer`/`propose` on), the working city
// (what the directors said at work), its own last move off the ledger, and
// any Mara confrontation it owes an `answer` to. Every block degrades to a
// stated absence — never a fabricated board.
// ---------------------------------------------------------------------------

function readJsonl(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  return raw.split(/\r?\n/).flatMap((line, i) => {
    if (!line.trim()) return [];
    try {
      const row = JSON.parse(line);
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('expected row object');
      return [row];
    } catch (e) { throw new Error(path.basename(file) + ':' + (i + 1) + ': ' + e.message); }
  });
}

function requireCycle(data, cycle, label) {
  if (!Number.isInteger(Number(cycle)) || Number(cycle) < 1 || Number(data && data.cycle) !== Number(cycle)) {
    throw new Error(label + ' cycle mismatch or missing stamp (expected C' + cycle + ')');
  }
}
function requireSnapshotCycle(root, relative, cycle) {
  const data = JSON.parse(fs.readFileSync(path.join(root || ROOT, 'output', relative), 'utf8'));
  requireCycle(data, cycle, relative);
}

// Child areas fold to parents (SIM_DOCTRINE §17). The parent links live on
// Neighborhood_Map.ChildAreas; scripts read them off the engine-audit snapshot
// dump, never a hard-coded copy.
function childToParentFromAudit(audit) {
  const map = Object.create(null);
  const rows = audit && audit.snapshots && audit.snapshots.Neighborhood_Map;
  const resolver = require('./civicPetitions').buildHoodResolver(rows);
  for (const r of rows) {
    for (const name of [r.Neighborhood, ...String(r.ChildAreas || '').split(',')]) {
      const key = String(name || '').trim().toLowerCase();
      if (key) map[key] = resolver.resolve(name);
    }
  }
  return map;
}

function foldHood(name, childToParent) {
  const n = String(name || '').trim();
  return (childToParent && Object.hasOwn(childToParent, n.toLowerCase()) && childToParent[n.toLowerCase()]) || n;
}

// Raw tracker rows from the beats dump (all header columns, incl.
// ProposingOffice which initiative_tracker.json drops).
function loadTrackerRows(root, cycle) {
  if (cycle != null) requireSnapshotCycle(root, 'beats/meta.json', cycle);
  return readJsonl(path.join(root || ROOT, 'output', 'beats', 'Initiative_Tracker.jsonl'));
}

// What a row needs next. Stage columns arrive with the Task 4 engine cut;
// until then the text derives from phase/status and says so honestly.
function boardNeedText(row) {
  const stage = String(row.Stage || '');
  if (stage === 'Funded') return 'a work move stands it up';
  if (stage === 'Standing') return 'work keeps it standing; the domain metric decides Delivering';
  if (stage === 'Delivering') return 'delivering — hold the metric';
  const phase = String(row.ImplementationPhase || '');
  if (phase === 'stalled') return 'stalled — one work move revives it';
  if (String(row.Status || '') === 'proposed' && !String(row.VoteCycle || '').trim()) {
    return 'petition-pending — signatures move it to a vote';
  }
  return String(row.NextScheduledAction || '').trim() || 'advance or hold';
}

// My board: rows the seat sponsors (ProposingOffice) plus rows touching its
// hoods after child→parent fold; the mayor sees all. (Plan Task 3.1 — a
// sponsor-only board leaves nine seats empty on day one.)
function boardRowsFor(office, rows, childToParent) {
  const isMayor = String(office.officeId || '') === 'MAYOR-01';
  const turf = new Set(turfHoods(office).map(h => foldHood(h, childToParent).toLowerCase()));
  const out = [];
  for (const row of rows || []) {
    const sponsored = String(row.ProposingOffice || '') !== '' &&
      String(row.ProposingOffice) === String(office.officeId || '');
    const hoods = String(row.AffectedNeighborhoods || '').split(',').map(s => s.trim()).filter(Boolean);
    const hoodHit = hoods.some(h => turf.has(foldHood(h, childToParent).toLowerCase()));
    if (!isMayor && !sponsored && !hoodHit) continue;
    out.push({
      id: row.InitiativeID,
      name: row.Name,
      domain: row.PolicyDomain || null,
      phase: row.ImplementationPhase || null,
      status: row.Status || null,
      voteCycle: row.VoteCycle ? Number(row.VoteCycle) : null,
      stage: row.Stage || null,
      // stamped by buildGameBlocks (it owns cycle); null until the Task 4
      // Stage/LastStageChangeCycle columns exist on the tracker.
      cyclesSinceStageChange: null,
      lastStageChangeCycle: row.LastStageChangeCycle != null && row.LastStageChangeCycle !== ''
        ? Number(row.LastStageChangeCycle) : null,
      sponsored,
      hoods,
      needsNext: boardNeedText(row),
    });
  }
  out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return out;
}

function boardBlock(board) {
  if (board === null) return 'Board unavailable — no Initiative_Tracker beats dump on disk.';
  if (!board.length) return 'Your board is empty: no initiative sponsors you or touches your turf.';
  const lines = board.map(b =>
    '- ' + b.id + ' ' + b.name + ' [' + (b.phase || '—') + '] — ' + b.needsNext);
  return clip('Your board:\n' + lines.join('\n'), BLOCK_CAP);
}

// Task 3.0 — my last move, folded from the append-only move ledger (Task 2
// step 1): last line per moveId wins. Mechanical continuity; the position
// wall is context, never proof.
function loadMovesFolded(root, cycle) {
  const rows = readJsonl(path.join(root || ROOT, 'output', 'cron-civic', 'moves', 'moves_c' + cycle + '.jsonl'));
  if (!rows) return null;
  const byId = new Map();
  for (const r of rows) {
    if (r && r.moveId) byId.set(r.moveId, r);
  }
  return byId;
}

function moveSummaryLine(mv) {
  const p = mv.payload || {};
  const what = mv.type === 'propose' ? 'propose "' + clip(p.title, 60) + '"'
    : mv.type === 'work' ? 'work ' + p.initiativeId
    : mv.type === 'answer' ? 'answer ' + (p.confrontationId || '')
    : mv.type === 'canvass' ? 'canvass ' + p.hood
    : String(mv.type || '?');
  const state = mv.status === 'pending' ? 'awaiting the Sunday fold'
    : mv.status === 'rejected' ? 'REJECTED — ' + (mv.detail || 'no reason recorded')
    : mv.status === 'applied' ? 'applied to the tracker'
    : mv.status === 'failed' ? 'FAILED at the gate — ' + (mv.detail || '')
    : String(mv.status || '?');
  return '- ' + what + ': ' + state;
}

function lastMoveBlock(root, cycle, agentDir) {
  const dir = path.join(root || ROOT, 'output', 'cron-civic', 'moves');
  let files;
  try { files = fs.readdirSync(dir); }
  catch (e) {
    if (e.code !== 'ENOENT') throw e;
    return { text: 'Move history unavailable — no move-ledger directory on disk.', moves: [] };
  }
  const cycles = files.map(f => /^moves_c(\d+)\.jsonl$/.exec(f)).filter(Boolean)
    .map(m => Number(m[1])).filter(c => c <= Number(cycle)).sort((a, b) => b - a);
  const current = [];
  let prior = null, outcome = null;
  for (const c of cycles) {
    const folded = loadMovesFolded(root, c);
    if (!folded) throw new Error('Move ledger disappeared for C' + c);
    const mine = [...folded.values()].filter(m => m.agentDir === agentDir)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    if (c === Number(cycle)) current.push(...mine);
    else if (!prior && mine.length) prior = mine[0];
    if (!outcome) outcome = mine.find(m => ['applied', 'failed'].includes(m.status)) || null;
    if (prior && outcome) break;
  }
  const moves = [...new Map([...current, prior, outcome].filter(Boolean).map(m => [m.moveId, m])).values()];
  if (!moves.length) return { text: 'No move for this seat in the available ledgers through C' + cycle + '.', moves: [] };
  const recent = current.length ? current : [prior].filter(Boolean);
  const text = clip('Latest moves:\n' + recent.map(m => 'C' + m.cycle + ' ' + moveSummaryLine(m)).join('\n'), 300) +
    '\n' + (outcome ? clip('Latest terminal outcome (C' + outcome.cycle + '):\n' + moveSummaryLine(outcome), 280)
      : 'No applied or failed outcome in the available ledgers.');
  return { text: clip(text, BLOCK_CAP), moves };
}

// Task 3.2 — my district's petition pool. Complaints = Civic-tagged
// reflections with a negative affect from citizens living in the seat's
// hoods; constructive Civic rows show apart as participation; office holders'
// own rows are dropped. Reads the beats Reflection_Intake dump (Task 6 adds
// it) — absent, the block states the absence.
function reflectionField(r, names) {
  for (const n of names) {
    if (r[n] != null && r[n] !== '') return r[n];
  }
  return '';
}

function loadPetitionPool(root, office, hoods, officeMap, childToParent, cycle) {
  const rows = readJsonl(path.join(root || ROOT, 'output', 'beats', 'Reflection_Intake.jsonl'));
  if (rows === null) {
    return { available: false, complaints: [], participation: [],
      text: 'Petition pool unavailable — Reflection_Intake is not in the beats dump yet (Task 6).' };
  }
  if (cycle != null) {
    requireSnapshotCycle(root, 'beats/meta.json', cycle);
    if (hoods && hoods.length) requireSnapshotCycle(root, 'simulation_ledger_snapshot.meta.json', cycle);
  }
  const officePopids = new Set([...(officeMap.offices || []), ...(officeMap.projects || [])]
    .map(o => String(o.popid || '').toUpperCase()).filter(Boolean));
  const turf = new Set((hoods || []).map(h => foldHood(h, childToParent).toLowerCase()));
  // agy review 2026-09-20 finding 3.1: the turf filter locates complainants via
  // loadConstituents → output/simulation_ledger_snapshot.jsonl. With the
  // snapshot absent, every district complaint would drop silently and the pack
  // would claim "no complaints" — a stated absence instead, never a silent
  // empty. (Citywide seats have no turf filter and are unaffected.)
  if (turf.size && !fs.existsSync(path.join(root || ROOT, 'output', 'simulation_ledger_snapshot.jsonl'))) {
    return { available: false, complaints: [], participation: [],
      text: 'Petition pool unreadable — the citizen snapshot (simulation_ledger_snapshot.jsonl) is absent, so complainants cannot be located to your district. Complaints may exist that this pack cannot see.' };
  }
  // Geographic membership is independent of the display-name/status filters
  // used to select featured constituents. Hospitalized residents still live here.
  const people = new Map();
  for (const c of readJsonl(path.join(root || ROOT, 'output', 'simulation_ledger_snapshot.jsonl')) || []) {
    const pop = String(c.POPID || '').trim().toUpperCase();
    const hood = foldHood(c.Neighborhood, childToParent);
    if (!pop) continue;
    if (people.has(pop) && people.get(pop) !== hood) throw new Error('Conflicting citizen geography: ' + pop);
    people.set(pop, hood);
  }
  let unlocatedRows = 0;
  const complaints = [];
  const participation = [];
  for (const r of rows) {
    const tag = String(reflectionField(r, ['Event', 'Tag', 'event'])).trim();
    if (tag !== 'Civic') continue;
    const pop = String(reflectionField(r, ['POPID', 'PopId', 'popid'])).toUpperCase();
    if (!pop || officePopids.has(pop)) continue;
    const hood = people.get(pop) || '';
    if (!hood) unlocatedRows++;
    if (turf.size && !turf.has(hood.toLowerCase())) continue;
    const affect = String(reflectionField(r, ['Affect', 'affect'])).trim();
    const entry = {
      cycle: reflectionField(r, ['Cycle', 'cycle']),
      hood: hood || null,
      // live sheet header is ReflectionExcerpt (codex's counter, written
      // against the tab itself); Snippet/Text cover older fixtures
      snippet: clip(reflectionField(r, ['ReflectionExcerpt', 'Reflection Excerpt', 'Snippet', 'Text', 'snippet']), 90),
      affect,
    };
    if (NEGATIVE_AFFECTS.has(affect.toLowerCase())) complaints.push(entry);
    else participation.push(entry);
  }
  complaints.sort((a, b) => Number(b.cycle) - Number(a.cycle));
  const bits = [];
  if (complaints.length) {
    bits.push('People are talking (' + complaints.length + ' complaint' + (complaints.length === 1 ? '' : 's') + '):');
    bits.push(...complaints.slice(0, 6).map(c => '- ' + c.snippet + (c.hood ? ' (' + c.hood + ', C' + c.cycle + ')' : ' (C' + c.cycle + ')')));
  } else {
    bits.push('No Civic complaints from your turf on the record.');
  }
  if (participation.length) {
    bits.push('Constructive civic participation (not complaints): ' + participation.length + '.');
  }
  if (unlocatedRows) bits.push(unlocatedRows + ' Civic rows have no located resident; district membership is unknown.');
  return { available: true, complaints, participation, unlocatedRows, text: clip(bits.join('\n'), BLOCK_CAP) };
}

// Task 3.3 — the working city: latest work-wake reflections from chiefs and
// project directors, off the same beats dump (disk-first; the intake row IS
// the work-wake's reflection record).
function loadWorkingCity(root, cycle, officeMap) {
  const rows = readJsonl(path.join(root || ROOT, 'output', 'beats', 'Reflection_Intake.jsonl'));
  if (rows === null) {
    return { available: false, text: 'No work-wake reflections on disk yet (Reflection_Intake beats dump lands with Task 6).' };
  }
  requireSnapshotCycle(root, 'beats/meta.json', cycle);
  const staffPopids = new Map();
  for (const o of [...(officeMap.projects || []), ...(officeMap.offices || [])]) {
    const id = String(o.officeId || o.projectId || '');
    if (o.projectId || /^CHIEF-/.test(id)) {
      const pop = String(o.popid || '').toUpperCase();
      if (pop) staffPopids.set(pop, o.holder);
    }
  }
  const mine = rows.filter(r =>
    String(reflectionField(r, ['Daypart', 'daypart', 'Wake', 'wake'])).toLowerCase() === 'work' &&
    staffPopids.has(String(reflectionField(r, ['POPID', 'PopId', 'popid'])).toUpperCase())
  );
  if (!mine.length) return { available: true, text: 'No work reflections from the directors or chiefs on the record.' };
  mine.sort((a, b) => Number(reflectionField(b, ['Cycle', 'cycle'])) - Number(reflectionField(a, ['Cycle', 'cycle'])));
  const lines = mine.slice(0, 4).map(r =>
    '- ' + staffPopids.get(String(reflectionField(r, ['POPID', 'PopId', 'popid'])).toUpperCase()) +
    ': ' + clip(reflectionField(r, ['ReflectionExcerpt', 'Reflection Excerpt', 'Snippet', 'Text', 'snippet']), 110) + ' (C' + reflectionField(r, ['Cycle', 'cycle']) + ')');
  return { available: true, text: clip('The working city:\n' + lines.join('\n'), BLOCK_CAP) };
}

// Task 3.4 — confrontation: when the Sunday directive named this seat, the
// pack carries the demand verbatim and an `answer` move is expected.
function loadConfrontation(root, cycle, agentDir) {
  let file = null;
  const exact = path.join(root || ROOT, 'output', 'mara-directives', 'mara_directive_c' + cycle + '_AUTO.txt');
  if (fs.existsSync(exact)) {
    file = exact;
  } else {
    try {
      const maraDir = path.join(root || ROOT, 'output', 'mara-directives');
      const files = fs.readdirSync(maraDir)
        .filter(f => /^mara_directive_c\d+_AUTO\.txt$/.test(f))
        .map(f => ({ f, c: Number((f.match(/\d+/) || [0])[0]) }))
        .filter(x => x.c <= Number(cycle))
        .sort((a, b) => b.c - a.c);
      if (files.length) file = path.join(maraDir, files[0].f);
    } catch (_) { /* no directive dir */ }
  }
  if (!file) return null;
  const md = fs.readFileSync(file, 'utf8');
  const blocks = md.split(/\n(?=## )/).filter(p => /^## /.test(p));
  const needle = '.claude/agents/' + agentDir + '/';
  for (const b of blocks) {
    if (!b.includes(needle)) continue;
    const address = (b.match(/\*\*Address:\*\*\s*(.+)/) || [])[1] || '';
    return {
      id: 'CONF-' + (file.match(/c(\d+)_/) || [0, cycle])[1] + '-' + agentDir,
      demand: clip((b.split('\n')[0] || '').replace(/^## /, '') + ' — ' + address.trim(), BLOCK_CAP),
      src: path.relative(root || ROOT, file).replace(/\\/g, '/'),
      expectsMove: 'answer',
    };
  }
  return null;
}

// Task 1/4 step 0 — the intervention catalog (engine-sheet's file). The pack
// shows playable keys so a seat can actually name one; absent, propose moves
// are refused at the gate (catalog-not-landed) and the pack says why.
function loadInterventionMenu() {
  let catalog = null;
  try {
    const c = require('../lib/initiativePhaseContract').INTERVENTION_CATALOG;
    if (c && typeof c === 'object' && Object.keys(c).length) catalog = c;
  } catch (_) { /* not landed */ }
  if (!catalog) {
    return { available: false, text: 'No intervention catalog on disk yet (Task 4 step 0) — propose moves cannot be validated and will be refused.' };
  }
  const playable = Object.entries(catalog)
    .filter(([key]) => !interventionIssue(catalog, key))
    .map(([k, v]) => ({ key: k, domain: v.policyDomain || null, label: v.label || null }));
  return { available: true, playable,
    text: 'Interventions you may propose (closed catalog):\n' +
      playable.map(p => '- ' + p.key + ' (' + (p.domain || '?') + (p.label ? ') — ' + p.label : ')')).join('\n') };
}

function buildGameBlocks(opts) {
  const { root, cycle, office, officeMap, hoods, audit } = opts;
  let c2p, geographyIssue = null, boardIssue = null, board = null;
  try {
    requireCycle(audit, cycle, 'engine audit');
    c2p = childToParentFromAudit(audit);
    if (/^D\d$/.test(String(office.district || ''))) {
      const mapped = getNeighborhoodsForDistricts(office.district).map(h => foldHood(h, c2p).toLowerCase()).sort();
      const turf = turfHoods(office).map(h => foldHood(h, c2p).toLowerCase()).sort();
      if (JSON.stringify(mapped) !== JSON.stringify(turf)) throw new Error('office turf disagrees with district authority');
    }
  } catch (e) { geographyIssue = e.message; }
  try {
    if (geographyIssue) throw new Error(geographyIssue);
    const rows = loadTrackerRows(root, cycle);
    if (rows === null) throw new Error('Initiative_Tracker dump absent');
    board = boardRowsFor(office, rows, c2p);
  } catch (e) { boardIssue = e.message; }
  const safely = (fn, fallback) => {
    try { return fn(); }
    catch (e) { return { ...fallback, available: false, text: clip(fallback.text + ' — ' + e.message, BLOCK_CAP) }; }
  };
  for (const b of board || []) {
    b.cyclesSinceStageChange = b.lastStageChangeCycle != null && cycle !== ''
      ? Math.max(0, Number(cycle) - b.lastStageChangeCycle)
      : null;
  }
  const game = {
    geographyIssue,
    lastMove: safely(() => lastMoveBlock(root, cycle, office.agentDir), {text:'Move history unavailable',moves:[]}),
    board: board || [],
    boardAvailable: board !== null,
    boardIds: (board || []).map(b => b.id),
    boardText: boardIssue ? clip('Board unavailable — ' + boardIssue, BLOCK_CAP) : boardBlock(board),
    interventions: loadInterventionMenu(),
    petitionPool: safely(() => {
      if (geographyIssue) throw new Error(geographyIssue);
      return loadPetitionPool(root, office, hoods, officeMap, c2p, cycle);
    }, {text:'Petition pool unavailable',complaints:[],participation:[]}),
    workingCity: safely(() => loadWorkingCity(root, cycle, officeMap), {text:'Working city unavailable'}),
  };
  const conf = loadConfrontation(root, cycle, office.agentDir);
  if (conf) game.confrontation = conf;
  return game;
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
  let peopleAll = kind === 'role' ? [] : loadConstituents(root, hoods, opts.cap || 0);
  const audit = opts.audit || loadAudit(root, cycle);
  const job = loadOfficeJob(audit, office);
  let turf = kind === 'role' ? [] : loadTurfMetrics(audit, hoods);
  let life = kind === 'role' ? { businesses: [], churches: [], events: [] } : loadTurfLife(root, cycle, hoods);
  let chaos = kind === 'role' ? [] : loadCycleEvents(root, cycle, hoods);
  const inits = loadInitRows(root, cycle, hoods, office, kind);
  const cabinet = kind === 'initiative' ? loadCabinet(root, office, cycle) : [];
  const hoodScores = scoreHoods(audit);
  let turn = pickTurn({ kind, office, cycle, inits, job, life, hoods, turf, chaos, cabinet, hoodScores });
  // civic.29: a citywide role seat (mayor, DA, police chief) has no fixed
  // turf, so turfHoods() is correctly empty for her — but when her PICKED
  // turn points at a specific neighborhood this cycle, she was told "no
  // active ledger people" there even when the ledger has dozens (verified:
  // 71 active West Oakland citizens the mayor's pack claimed didn't exist).
  // Scoring never reads people/turf/life/chaos (only inits/hoodScores/job),
  // so re-running pickTurn with a late, turn-specific load is safe and
  // deterministic — same pick, now with real texture for that one hood.
  if (kind === 'role' && !turn.empty && turn.pulse && turn.pulse.hood) {
    const turnHoods = [turn.pulse.hood];
    peopleAll = loadConstituents(root, turnHoods, opts.cap || 0);
    turf = loadTurfMetrics(audit, turnHoods);
    life = loadTurfLife(root, cycle, turnHoods);
    chaos = loadCycleEvents(root, cycle, turnHoods);
    turn = pickTurn({ kind, office, cycle, inits, job, life, hoods: turnHoods, turf, chaos, cabinet, hoodScores });
  }
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

  // civic.38 Task 3 — board / petition pool / working city / last move /
  // confrontation. boardIds feed the datawake move gate (Task 1 step 2).
  const game = buildGameBlocks({ root, cycle, office, officeMap, hoods, audit });

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
    game,
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
  clip, writePack, CONSTITUENT_CAP,
  // civic.38 Task 3 game blocks
  buildGameBlocks, boardRowsFor, boardNeedText, childToParentFromAudit, foldHood, requireCycle, loadAudit,
  loadMovesFolded, loadPetitionPool, loadWorkingCity, loadConfrontation,
  loadInterventionMenu, loadTrackerRows, readJsonl, NEGATIVE_AFFECTS, BLOCK_CAP,
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
