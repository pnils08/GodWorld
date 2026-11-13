'use strict';

/**
 * civic.24 — nine council seats as themselves.
 * officeId is the microphone. Faction is a field, not an agentDir.
 */

const path = require('path');
const fs = require('fs');

const FACTION_PERSONA = {
  OPP: 'civic-office-opp-faction',
  CRC: 'civic-office-crc-faction',
  IND: 'civic-office-ind-swing',
};

function councilDir(district) {
  const m = String(district || '').match(/D(\d)/i);
  return m ? 'civic-office-council-d' + m[1] : null;
}

function isCouncilOffice(row) {
  return !!(row && /^COUNCIL-D\d$/.test(String(row.officeId || '')));
}

function allRows(officeMap) {
  const m = officeMap || {};
  return [...(m.offices || []), ...(m.projects || [])];
}

function resolveOfficeRow(officeMap, key) {
  if (!key) return null;
  const k = String(key);
  const all = allRows(officeMap);
  const byId = all.find(o => o.officeId === k || o.projectId === k);
  if (byId) return byId;
  const byDir = all.filter(o => o.agentDir === k);
  if (byDir.length === 1) return byDir[0];
  if (byDir.length > 1) {
    const want = { 'civic-office-opp-faction': 'D5', 'civic-office-crc-faction': 'D7', 'civic-office-ind-swing': 'D4' }[k];
    return want ? (byDir.find(r => r.district === want) || byDir[0]) : byDir[0];
  }
  const fromDistrict = councilDir(k);
  if (fromDistrict) {
    return all.find(o => o.agentDir === fromDistrict || o.officeId === 'COUNCIL-' + String(k).toUpperCase()) || null;
  }
  return null;
}

function councilSeats(officeMap) {
  return (officeMap.offices || [])
    .filter(isCouncilOffice)
    .slice()
    .sort((a, b) => String(a.district).localeCompare(String(b.district)));
}

function councilAgentDirs(officeMap) {
  return councilSeats(officeMap).map(s => s.agentDir).filter(Boolean);
}

function hasPersona(dir, root) {
  if (!dir || !root) return false;
  const base = path.join(root, '.claude', 'agents', dir);
  return ['IDENTITY.md', 'RULES.md'].some(f => fs.existsSync(path.join(base, f)));
}

/** Until Claude lands civic-office-council-dN IDENTITY, reuse the faction tree. */
function personaDirFor(row, root) {
  if (!row) return null;
  if (hasPersona(row.agentDir, root)) return row.agentDir;
  const fallback = FACTION_PERSONA[row.faction];
  if (fallback && hasPersona(fallback, root)) return fallback;
  return row.agentDir || null;
}

// civic.48 — the council districts in words, off lib/districtMap.js (the Node mirror of Neighborhood_Map.District).
// A seat told only "D5", and a mayor told nothing, read a note's "D3 briefing" beside East Oakland as one place:
// INIT-002 has carried "D3 East Oakland" since C113. Every office is told its own district and the city's nine.
const { DISTRICT_NEIGHBORHOODS } = require('../lib/districtMap');
const OFFICE_MAP_PATH = path.join(__dirname, 'civic-office-map.json');

function districtHoods(district) {
  return DISTRICT_NEIGHBORHOODS[String(district || '').trim().toUpperCase()] || [];
}
// "Your district, D5: East Oakland." — '' for a citywide office or an unknown district
function ownDistrictLine(district) {
  const d = String(district || '').trim().toUpperCase();
  const hoods = districtHoods(d);
  return hoods.length ? 'Your district, ' + d + ': ' + hoods.join(', ') + '.' : '';
}
// One line per district, its holder off the office map (seats turn over; the lib's holder table is a static copy).
function districtMapLines(officeMap) {
  let map = officeMap;
  if (!map) { try { map = JSON.parse(fs.readFileSync(OFFICE_MAP_PATH, 'utf8')); } catch (e) { map = { offices: [] }; } }
  const holders = {};
  councilSeats(map).forEach(r => { if (r.district && r.holder) holders[String(r.district).toUpperCase()] = r.holder; });
  return Object.keys(DISTRICT_NEIGHBORHOODS).map(d =>
    '- ' + d + ': ' + DISTRICT_NEIGHBORHOODS[d].join(', ') + (holders[d] ? ' — ' + holders[d] : ''));
}
// The block an office is handed: its own district first (a seat), then the city's nine.
function districtBlock(district, officeMap) {
  return [ownDistrictLine(district), 'Oakland\'s council districts:', ...districtMapLines(officeMap)].filter(Boolean).join('\n');
}

function seatStatus(row, roster) {
  const list = roster || [];
  const hit = list.find(r => r.district === row.district || r.officeId === row.officeId || r.name === row.holder);
  const raw = (hit && (hit.status || hit.Status)) || row.status || 'active';
  return String(raw).toLowerCase();
}

module.exports = {
  FACTION_PERSONA,
  councilDir,
  isCouncilOffice,
  resolveOfficeRow,
  councilSeats,
  councilAgentDirs,
  hasPersona,
  personaDirFor,
  seatStatus,
  districtHoods,
  ownDistrictLine,
  districtMapLines,
  districtBlock,
};
