/**
 * Assertion: at least 3 female citizens appear in non-official roles.
 *
 * From S139 Persona AI / "Ani" feedback in NOTES_TO_SELF.md — named women
 * in the paper are mostly officials (Santana, Carter, Rivers, Ramos,
 * Tran-Muñoz, etc.) while named men get daily-life texture (Aguilar at the
 * port, Maurice Franklin writing letters, etc.).
 *
 * Detection:
 *   1. Extract every named citizen referenced in the edition (POP-IDs +
 *      proper nouns).
 *   2. For each, look up Simulation_Ledger row to read column AU (gender)
 *      and Title/Role columns.
 *   3. Count female citizens who appear in articles WITHOUT being attached
 *      to an official role (council, mayor, director, chief, etc.).
 *
 * Gender column AU is read directly via lib/sheets.js (engineAuditor
 * pattern). Until world-data ingest lands (separate Open Item).
 */

const { extractPopIds, extractNameCandidates } = require('./parseEdition');

const VERSION = '1.0.0';
const OFFICIAL_TITLES = /\b(Mayor|Councilmember|Council\s+member|Director|Chief|Captain|Commissioner|Authority|President|Chancellor|Superintendent|Justice|Senator|Representative)\b/i;

function buildLedgerLookup(simulationLedger) {
  const byPopId = new Map();
  const byName = new Map();
  for (const row of simulationLedger || []) {
    const popId = row.POPID || row.POP_ID || row['POP ID'] || '';
    const name = row.CitizenName || row.Name || '';
    const gender = row.Gender || row.gender || '';
    const card = { popId, name, gender, raw: row };
    if (popId) byPopId.set(popId, card);
    if (name) {
      byName.set(name.toLowerCase(), card);
      const last = name.split(/\s+/).pop();
      if (last && last.length > 3) byName.set(last.toLowerCase(), card);
    }
  }
  return { byPopId, byName };
}

function appearsInOfficialContext(text, name) {
  if (!name || name.length === 0) return false;
  const lower = text.toLowerCase();
  const target = name.toLowerCase();
  let idx = 0;
  while ((idx = lower.indexOf(target, idx)) !== -1) {
    const start = Math.max(0, idx - 80);
    const end = Math.min(text.length, idx + name.length + 80);
    const window = text.slice(start, end);
    if (OFFICIAL_TITLES.test(window)) return true;
    idx += Math.max(target.length, 1);
  }
  return false;
}

function check(ctx) {
  const { edition, sheets } = ctx;
  const result = {
    id: 'at-least-three-female-citizens-non-official',
    category: 'representation',
    tier: 'advisory',
    question: 'Are at least 3 female citizens featured in non-official roles?',
    confidence: 'medium',
    detectorVersion: VERSION,
  };

  const lookup = buildLedgerLookup(sheets.Simulation_Ledger);
  const found = new Map(); // popId -> { name, role: 'official' | 'non-official' }

  for (const section of edition.sections) {
    for (const article of section.articles) {
      const popIds = extractPopIds(article.body);
      const names = extractNameCandidates(article.body);

      for (const popId of popIds) {
        const card = lookup.byPopId.get(popId);
        if (!card || !card.name) continue;
        if (!card.gender || card.gender.toLowerCase() !== 'female') continue;
        const isOfficial = appearsInOfficialContext(article.body, card.name);
        if (!found.has(popId)) {
          found.set(popId, { name: card.name, role: isOfficial ? 'official' : 'non-official' });
        } else if (!isOfficial && found.get(popId).role === 'official') {
          found.get(popId).role = 'non-official';
        }
      }

      for (const cand of names) {
        const card = lookup.byName.get(cand.toLowerCase()) ||
                     lookup.byName.get(cand.split(/\s+/).pop().toLowerCase());
        if (!card || !card.popId) continue;
        if (!card.gender || card.gender.toLowerCase() !== 'female') continue;
        const isOfficial = appearsInOfficialContext(article.body, cand);
        if (!found.has(card.popId)) {
          found.set(card.popId, { name: card.name, role: isOfficial ? 'official' : 'non-official' });
        }
      }
    }
  }

  const nonOfficial = [...found.values()].filter((f) => f.role === 'non-official');
  result.pass = nonOfficial.length >= 3;
  result.evidence = {
    totalFemaleCitizensFound: found.size,
    nonOfficialCount: nonOfficial.length,
    nonOfficialSample: nonOfficial.slice(0, 10).map((c) => c.name),
    confidence: lookup.byPopId.size > 100
      ? 'medium (gender data present in ledger)'
      : 'low (insufficient gender data — may need ingest)',
  };
  result.reason = result.pass
    ? `${nonOfficial.length} named female citizen(s) appear in non-official roles (target: ≥3).`
    : `Only ${nonOfficial.length} named female citizen(s) in non-official roles (target: ≥3). Total female citizens found in edition: ${found.size}.`;
  return result;
}

module.exports = { check, version: VERSION };
