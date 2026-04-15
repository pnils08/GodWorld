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

function loadCanonNames(citizenRows, councilRows, truesource) {
  const set = new Set();
  for (const row of citizenRows || []) {
    const name = row.CitizenName || row.Name || '';
    if (name) {
      set.add(name.toLowerCase());
      const last = name.split(/\s+/).pop();
      if (last && last.length > 3) set.add(last.toLowerCase());
    }
  }
  for (const row of councilRows || []) {
    const name = row.OfficialName || row.Name || '';
    if (name) {
      set.add(name.toLowerCase());
      const last = name.split(/\s+/).pop();
      if (last && last.length > 3) set.add(last.toLowerCase());
    }
  }
  if (truesource) {
    const visit = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) return obj.forEach(visit);
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'string' && /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(v)) {
          set.add(v.toLowerCase());
          const last = v.split(/\s+/).pop();
          if (last && last.length > 3) set.add(last.toLowerCase());
        } else if (typeof v === 'object') {
          visit(v);
        }
      }
    };
    visit(truesource);
  }
  for (const f of PUBLIC_FIGURES_OK) {
    set.add(f.toLowerCase());
    const last = f.split(/\s+/).pop();
    if (last && last.length > 3) set.add(last.toLowerCase());
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
    const last = cand.split(/\s+/).pop().toLowerCase();
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
