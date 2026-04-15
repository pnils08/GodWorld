/**
 * Assertion: every named citizen in the edition resolves to a canon source.
 *
 * Sources checked (in order):
 *   1. Simulation_Ledger (CitizenName column, full + last-name match)
 *   2. truesource_reference.json (A's roster + named non-citizens)
 *   3. Council member roster (Civic_Office_Ledger, OfficialName)
 *   4. Allowed historical / public-figure list (configurable below)
 *
 * Names that don't resolve are flagged. Common false positives are
 * suppressed via a stop-list (place names, generic titles, etc.).
 *
 * Overlaps with Rhea by design — Phase 39.2 will narrow Rhea to sourcing
 * verification of *attributions and quotes*, while this stays in capability
 * lane checking *the cast*.
 */

const fs = require('fs');
const path = require('path');
const { extractNameCandidates } = require('./parseEdition');

const VERSION = '1.0.0';

const NON_NAME_TOKENS = new Set([
  'Bay Tribune', 'Cycle Pulse', 'Editor in Chief', "Editor's Desk", 'New York', 'Los Angeles',
  'San Francisco', 'Jack London', 'West Oakland', 'East Oakland', 'North Oakland',
  'Lake Merritt', 'Adams Point', 'Bay Area', 'United States', 'Civic Reform Coalition',
  'Oakland Progressive Party', 'Oakland Police', 'NBA', 'MLB', 'Civis Systems',
  'Baylight Authority', 'Stabilization Fund', 'Health Center', 'Transit Hub',
  'Cycle Pulse Edition', 'Final Score', 'Real Estate', 'Names Index',
  'Mayor', 'Council', 'Director', 'OPP', 'CRC', 'OARI',
]);

const PUBLIC_FIGURES_OK = new Set([
  'Mike Paulson', 'Avery Santana', 'Mags Corliss',
]);

function addNameToSet(set, name) {
  if (!name || typeof name !== 'string') return;
  const trimmed = name.trim();
  if (!trimmed) return;
  set.add(trimmed.toLowerCase());
  const last = trimmed.split(/\s+/).pop();
  if (last && last.length > 3) set.add(last.toLowerCase());
}

// Build "First Last" (and "First Last" with first name only) from a sheet row
// whose headers are First / Middle / Last (the GodWorld convention — note the
// trailing space on the "Middle " header).
function addRowNamesToSet(set, row) {
  if (!row) return;
  const first = (row.First || row.FirstName || '').trim();
  const middle = (row['Middle '] || row.Middle || row.MiddleName || '').trim();
  const last = (row.Last || row.LastName || '').trim();
  if (first && last) {
    addNameToSet(set, `${first} ${last}`);
    if (middle) addNameToSet(set, `${first} ${middle} ${last}`);
  }
  if (last && last.length > 3) set.add(last.toLowerCase());
  if (first && first.length > 3) set.add(first.toLowerCase());
  // Some sheets may use CitizenName / Name / FullName / OfficialName / PlayerName
  for (const key of ['CitizenName', 'Name', 'FullName', 'OfficialName', 'PlayerName']) {
    if (row[key]) addNameToSet(set, row[key]);
  }
}

function loadCanonNames(citizenRows, councilRows, asRosterRows, tribuneOaklandRows, truesource) {
  const set = new Set();
  for (const row of citizenRows || []) addRowNamesToSet(set, row);
  for (const row of councilRows || []) addRowNamesToSet(set, row);
  // As_Roster — A's player and staff. Authoritative for sports references.
  for (const row of asRosterRows || []) addRowNamesToSet(set, row);
  // Bay_Tribune_Oakland — curated index of named citizens. Mike's hand-built
  // index, easier to search than Simulation_Ledger for journalism purposes.
  for (const row of tribuneOaklandRows || []) addRowNamesToSet(set, row);
  // Legacy file-based truesource — kept as fallback if sheets unavailable
  if (truesource) {
    const visit = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) return obj.forEach(visit);
      for (const v of Object.values(obj)) {
        if (typeof v === 'string' && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(v)) {
          addNameToSet(set, v);
        } else if (typeof v === 'object') {
          visit(v);
        }
      }
    };
    visit(truesource);
  }
  for (const f of PUBLIC_FIGURES_OK) {
    addNameToSet(set, f);
  }
  return set;
}

function check(ctx) {
  const { edition, sheets } = ctx;
  const result = {
    id: 'canon-names-not-invented',
    category: 'rubric-fidelity',
    tier: 'blocking',
    question: 'Do all named citizens in the edition resolve to canon sources?',
    confidence: 'medium',
    detectorVersion: VERSION,
  };

  let truesource = null;
  const truesourceCandidates = [
    path.join(process.cwd(), 'output', 'desk-packets', 'truesource_reference.json'),
    path.join(process.cwd(), 'output', 'desks', 'sports', 'reference', 'truesource.json'),
    path.join(process.cwd(), 'truesource_reference.json'),
  ];
  for (const tp of truesourceCandidates) {
    if (fs.existsSync(tp)) {
      try {
        truesource = JSON.parse(fs.readFileSync(tp, 'utf8'));
        break;
      } catch (e) {
        // try next
      }
    }
  }

  const canonSet = loadCanonNames(
    sheets.Simulation_Ledger,
    sheets.Civic_Office_Ledger,
    sheets.As_Roster,
    sheets.Bay_Tribune_Oakland,
    truesource
  );

  const allCandidates = new Set();
  for (const section of edition.sections) {
    for (const article of section.articles) {
      for (const cand of extractNameCandidates(article.body)) {
        if (NON_NAME_TOKENS.has(cand)) continue;
        if (cand.split(/\s+/).length < 2) continue;
        allCandidates.add(cand);
      }
    }
  }

  const unresolved = [];
  for (const cand of allCandidates) {
    const lower = cand.toLowerCase();
    if (canonSet.has(lower)) continue;
    // Try possessive stripped ("Mike Paulson's" -> "mike paulson")
    const stripped = lower.replace(/['']s$/i, '').trim();
    if (stripped !== lower && canonSet.has(stripped)) continue;
    const last = cand.split(/\s+/).pop().replace(/['']s$/i, '').toLowerCase();
    if (last.length > 3 && canonSet.has(last)) continue;
    unresolved.push(cand);
  }

  result.pass = unresolved.length === 0;
  result.evidence = {
    candidatesChecked: allCandidates.size,
    canonSetSize: canonSet.size,
    unresolvedCount: unresolved.length,
    unresolvedSample: unresolved.slice(0, 10),
  };
  result.reason = result.pass
    ? `All ${allCandidates.size} named citizens resolve to canon (Simulation_Ledger, council roster, truesource, or public-figure allowlist).`
    : `${unresolved.length} of ${allCandidates.size} candidate names did not resolve to canon: ${unresolved.slice(0, 5).join(', ')}${unresolved.length > 5 ? '...' : ''}`;
  return result;
}

module.exports = { check, version: VERSION };
