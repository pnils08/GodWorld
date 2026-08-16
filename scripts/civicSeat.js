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
};
