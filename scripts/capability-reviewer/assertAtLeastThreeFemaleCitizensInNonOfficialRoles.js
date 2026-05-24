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

const VERSION = '1.1.0';
const OFFICIAL_TITLES = /\b(Mayor|Councilmember|Council\s+member|Director|Chief|Captain|Commissioner|Authority|President|Chancellor|Superintendent|Justice|Senator|Representative)\b/i;

function buildLedgerLookup(simulationLedger) {
  const byPopId = new Map();
  const byName = new Map();
  for (const row of simulationLedger || []) {
    const popId = row.POPID || row.POP_ID || row['POP ID'] || '';
    // S231 G-W48 fix: Simulation_Ledger has First + Last columns (not Name).
    // Pre-fix this loop returned '' for every citizen's name, so the
    // detector found 0 female citizens regardless of edition content.
    const first = (row.First || '').trim();
    const last = (row.Last || '').trim();
    const name = (row.CitizenName || row.Name || `${first} ${last}`.trim()).trim();
    const gender = row.Gender || row.gender || '';
    const card = { popId, name, first, last, gender, raw: row };
    if (popId) byPopId.set(popId, card);
    if (name) {
      byName.set(name.toLowerCase(), card);
      // Also index by last name (commonly referenced in prose) — and by
      // canonical first-last form for cross-layer name-drift tolerance
      // (e.g., ledger 'Eloise Soria-Dominguez' addressable as 'Soria-Dominguez'
      // or 'Eloise Soria Dominguez' — last-segment match catches both).
      if (last && last.length > 3) {
        byName.set(last.toLowerCase(), card);
        // For hyphenated last names, also index each segment.
        for (const seg of last.split(/[-\s]+/)) {
          if (seg.length > 3) byName.set(seg.toLowerCase(), card);
        }
      }
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

// S231 pipeline.28 G-W48 fix: NAMES INDEX line scanner.
// Parses two formats observed in production editions:
//   "POP-NNNNN | Name | Role-with-affiliation"     (canonical, has ID)
//   "Name — Role" or "Name -- Role"                (em-dash style, no ID)
// Returns array of { popId|null, name, roleLine } so the caller can run
// Sim_Ledger gender lookup + scope the role string for OFFICIAL_TITLES check.
function parseNamesIndexBody(body) {
  if (!body) return [];
  const entries = [];
  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    // Canonical: POP-NNNNN | Name | Role
    const popMatch = line.match(/^(POP-\d{5})\s*\|\s*([^|]+?)\s*\|\s*(.+)$/);
    if (popMatch) {
      entries.push({ popId: popMatch[1], name: popMatch[2].trim(), roleLine: popMatch[3].trim() });
      continue;
    }
    // Em-dash style: Name — Role (allow em-dash, en-dash, or `--`)
    const dashMatch = line.match(/^([A-Z][^—\-]{1,60}?)\s*(?:—|–|--)\s*(.+)$/);
    if (dashMatch) {
      entries.push({ popId: null, name: dashMatch[1].trim(), roleLine: dashMatch[2].trim() });
    }
  }
  return entries;
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
  const found = new Map(); // popId|name -> { name, role: 'official' | 'non-official', source }

  // S231 pipeline.28 G-W48 refinement: reporters + NEW citizens appear in
  // body text and would otherwise inflate the female-citizen count via
  // collision against existing female citizens in the ledger sharing the
  // same name (G-S18/G-S19 cross-layer canon-drift surface). Collect:
  //   (a) article bylines via parseEdition's `byline` field
  //   (b) NAMES INDEX em-dash entries explicitly tagged "(NEW)" — these
  //       are declared new-to-this-edition and resolving them against the
  //       ledger is incorrect by definition (no ingest yet); their gender
  //       isn't determinable here. Skip in all passes.
  const excludedNames = new Set();
  for (const section of edition.sections) {
    for (const article of section.articles) {
      if (article.byline) {
        const cleanByline = article.byline.replace(/^By\s+/i, '').trim();
        excludedNames.add(cleanByline.toLowerCase());
      }
    }
  }
  const namesIndexEarly = edition.sections.find((s) => s.isFooter && s.title === 'NAMES INDEX');
  if (namesIndexEarly) {
    for (const entry of parseNamesIndexBody(namesIndexEarly.body)) {
      if (!entry.popId && /\(NEW\)/i.test(entry.roleLine)) {
        excludedNames.add(entry.name.toLowerCase());
      }
    }
  }
  // Back-compat alias used inside the loops below.
  const reporterNames = excludedNames;

  function recordCitizen(key, name, isOfficial, source) {
    if (!found.has(key)) {
      found.set(key, { name, role: isOfficial ? 'official' : 'non-official', source });
    } else if (!isOfficial && found.get(key).role === 'official') {
      // Demote: any non-official appearance wins over official ones (citizen IS
      // appearing in non-official capacity somewhere).
      found.get(key).role = 'non-official';
    }
  }

  // Pass 1 — article bodies (original logic). Skips footer sections naturally
  // because section.articles is empty for isFooter:true sections (per S231
  // pipeline.28 G-W46 parseEdition fix).
  for (const section of edition.sections) {
    for (const article of section.articles) {
      const popIds = extractPopIds(article.body);
      const names = extractNameCandidates(article.body);

      for (const popId of popIds) {
        const card = lookup.byPopId.get(popId);
        if (!card || !card.name) continue;
        if (!card.gender || card.gender.toLowerCase() !== 'female') continue;
        if (reporterNames.has(card.name.toLowerCase())) continue; // skip bylines
        const isOfficial = appearsInOfficialContext(article.body, card.name);
        recordCitizen(popId, card.name, isOfficial, 'article-body');
      }

      for (const cand of names) {
        if (reporterNames.has(cand.toLowerCase())) continue; // skip bylines
        // Full-name match only — last-name-only fallback produces false
        // positives when a NEW male citizen ("Miguel Santos") shares a
        // surname with a female ledger citizen. The article-body path
        // can afford strict matching because POPIDs are caught by the
        // popIds loop above. (S231 pipeline.28 G-W48 refinement.)
        const card = lookup.byName.get(cand.toLowerCase());
        if (!card || !card.popId) continue;
        if (!card.gender || card.gender.toLowerCase() !== 'female') continue;
        if (reporterNames.has(card.name.toLowerCase())) continue; // skip cards that resolved to a reporter
        const isOfficial = appearsInOfficialContext(article.body, cand);
        recordCitizen(card.popId, card.name, isOfficial, 'article-body');
      }
    }
  }

  // Pass 2 — NAMES INDEX footer section (S231 pipeline.28 G-W48 fix).
  // The edition's NAMES INDEX is the canonical list of who appears in the
  // edition. Pre-fix the detector only scanned article bodies, so citizens
  // referenced only in NAMES INDEX (or whose body references didn't match
  // the proper-noun heuristic in extractNameCandidates) were invisible.
  const namesIndexSection = edition.sections.find((s) => s.isFooter && s.title === 'NAMES INDEX');
  if (namesIndexSection) {
    const entries = parseNamesIndexBody(namesIndexSection.body);
    for (const entry of entries) {
      // Em-dash entries explicitly tagged "(NEW)" should NOT be resolved
      // against the ledger — they're declared as new-to-this-edition and
      // any name collision with an existing POP is a canon-integrity issue
      // (G-S18/G-S19 / canon.3 territory), not a representation count.
      // The detector cannot resolve their gender without a ledger ingest;
      // skip rather than risk cross-citizen false positives.
      if (!entry.popId && /\(NEW\)/i.test(entry.roleLine)) continue;
      let card = null;
      if (entry.popId) {
        card = lookup.byPopId.get(entry.popId);
      }
      if (!card && entry.name) {
        // Em-dash existing citizens (no POPID, no NEW tag) get full-name
        // match only — last-name-only fallback produces false positives.
        card = lookup.byName.get(entry.name.toLowerCase()) || null;
      }
      if (!card || !card.gender || card.gender.toLowerCase() !== 'female') continue;
      if (reporterNames.has(card.name.toLowerCase())) continue;
      // For NAMES INDEX entries, the role line IS the official-context test.
      const isOfficial = OFFICIAL_TITLES.test(entry.roleLine);
      const key = card.popId || `name:${card.name}`;
      recordCitizen(key, card.name, isOfficial, 'names-index');
    }
  }

  const nonOfficial = [...found.values()].filter((f) => f.role === 'non-official');
  result.pass = nonOfficial.length >= 3;
  result.evidence = {
    totalFemaleCitizensFound: found.size,
    nonOfficialCount: nonOfficial.length,
    nonOfficialSample: nonOfficial.slice(0, 10).map((c) => c.name),
    sourceBreakdown: [...found.values()].reduce((acc, c) => {
      acc[c.source] = (acc[c.source] || 0) + 1;
      return acc;
    }, {}),
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
