#!/usr/bin/env node
/**
 * auditCanonDrift.js — T8 canon.3 / ADR-0007
 *
 * One-time audit. Find proper-noun citizen-name candidates that appear in
 * published bay-tribune editions (editions/cycle_pulse_edition_*.txt) but
 * have no Simulation_Ledger row — the bay-tribune-only drift class that
 * S222 C94 surfaced (Carmen Solis, Roberto Iglesias both published E93,
 * no Sim_Ledger row → /sift Step 5 classifies as NEW → ingest duplicates).
 *
 * Per plan: docs/plans/2026-05-24-canon-3-cross-layer-citizen-drift.md §Task 8.
 * Per ADR-0007 lookup precedence: bay-tribune appearance is paper-of-record;
 * absence of a Sim_Ledger row for a published name is structural drift,
 * not a missing citizen.
 *
 * Method:
 *   1. Load known-canonical name sets from sheets: Simulation_Ledger (First+Last),
 *      Cultural_Ledger (Name), Chicago_Citizens (Name).
 *   2. Walk editions/cycle_pulse_edition_*.txt (skip dispatches + supplementals;
 *      the audit targets the canonical edition surface).
 *   3. Strip the NAMES INDEX block before prose-scan — that block already
 *      lists POPID-confirmed names and shouldn't contribute candidates.
 *   4. Extract proper-noun runs (2-, 3-word + hyphen forms) from prose.
 *   5. Title-prefix strip (Mayor, Bishop, Coach, Dr., …) so "Mayor Avery
 *      Santana" matches Sim_Ledger "Avery Santana".
 *   6. Normalize each candidate via normalizeNameKey (diacritics-stripped,
 *      lowercase, punctuation-stripped). Symmetric with ingestPlayerTrueSource.
 *   7. Drop candidates that match any known set or the hard-coded
 *      place/org/title-phrase denylist.
 *   8. Aggregate surviving candidates: name → {editions[], snippets[], count}.
 *   9. Suggested action heuristic: count >= 2 → backfill; count == 1 → investigate.
 *
 * Usage:
 *   node scripts/auditCanonDrift.js                 # dry-run: print top 30 to stdout
 *   node scripts/auditCanonDrift.js --emit          # write output/canon_drift_audit_<ts>.json
 *   node scripts/auditCanonDrift.js --limit 50      # cap report length
 *   node scripts/auditCanonDrift.js --verbose       # log skips + per-edition counts
 *
 * Output (--emit):
 *   output/canon_drift_audit_<timestamp>.json
 *   shape: [{
 *     name,                       // canonical surface form (first occurrence's spelling)
 *     bay_tribune_doc_ids,        // edition filenames (local — proxy for SM doc ids)
 *     first_edition_seen,         // earliest edition file
 *     narrative_role_snippet,     // 80-char window around first hit
 *     count,                      // total occurrences across editions
 *     suggested_action            // 'backfill' | 'investigate'
 *   }]
 *
 * This script is READ-ONLY (sheet reads + file reads + optional JSON write).
 * No Sim_Ledger or Cultural_Ledger writes. Operator reviews output and decides
 * per row whether to backfill (T9 / T12) or investigate.
 */

'use strict';

require('/root/GodWorld/lib/env');

const fs = require('fs');
const path = require('path');
const sheets = require('../lib/sheets');

const ROOT = path.resolve(__dirname, '..');
const EDITIONS_DIR = path.join(ROOT, 'editions');
const OUTPUT_DIR = path.join(ROOT, 'output');

const EMIT = process.argv.includes('--emit');
const VERBOSE = process.argv.includes('--verbose');
const limitArg = process.argv.indexOf('--limit');
const REPORT_LIMIT = limitArg > 0 ? parseInt(process.argv[limitArg + 1], 10) : 30;

// -------------------- normalization --------------------

function stripDiacritics(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeNameKey(name) {
  if (!name) return '';
  return stripDiacritics(String(name))
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// -------------------- title prefix stripping --------------------

// Titles that prefix a citizen name in prose. When the first token of a
// candidate is one of these, drop it so the residue can match Sim_Ledger.
// e.g., "Mayor Avery Santana" → "Avery Santana".
const TITLE_PREFIXES = new Set([
  'mayor', 'councilmember', 'councilman', 'councilwoman',
  'bishop', 'reverend', 'pastor', 'father', 'sister', 'brother',
  'coach', 'manager', 'gm',
  'dr', 'doctor', 'rev',
  'officer', 'detective', 'sergeant', 'lieutenant', 'captain', 'chief',
  'mr', 'mrs', 'ms', 'miss',
  'judge', 'justice',
  'professor', 'prof',
  'senator', 'representative', 'rep', 'governor',
  'president', 'vice', 'chairman', 'chairwoman', 'chair',
  // English sentence-starter words that sit before a name and the proper-noun
  // regex catches as Cap-token (sentence start). Stripping them coalesces
  // "But Carmen Solis" + "Said Carmen Solis" + "Carmen Solis" into one bucket.
  'but', 'and', 'or', 'then', 'while', 'after', 'before',
  'said', 'so', 'yet', 'now', 'this', 'that', 'these', 'those',
  'when', 'where', 'why', 'how', 'what', 'who', 'whose',
  'though', 'although', 'because', 'since', 'unless', 'until'
]);

function stripTitlePrefix(tokens) {
  const out = tokens.slice();
  while (out.length > 2 && TITLE_PREFIXES.has(normalizeNameKey(out[0]))) {
    out.shift();
  }
  return out;
}

// -------------------- denylist --------------------

// Multi-word place + org + structural phrases that match the proper-noun-pair
// regex but are not citizen names. Keep normalized form (lower, no punct).
//
// Seeded from a sample sweep of E92/E93/E94 proper-noun output; if the audit
// shows a clearly-non-person string in the top results, add it here and rerun.
const DENYLIST = new Set([
  // Oakland geography
  'west oakland', 'east oakland', 'north oakland', 'south oakland',
  'the oakland', 'oakland california', 'oakland coliseum', 'oakland a',
  'jack london', 'jack london square', 'old oakland', 'adams point',
  'temescal flats', 'lake merritt', 'bay area', 'east bay',
  'rockridge bart', 'fruitvale bart', 'lake merritt bart',
  'maxwell park', 'piedmont avenue', 'piedmont pines', 'piedmont ave',
  'mountain view', 'redwood heights', 'glenview',
  'international boulevard', 'international blvd',
  'broadway lake', 'broadway oakland',
  'civis field', 'baylight district',
  // Bay Tribune + Cycle Pulse meta
  'bay tribune', 'cycle pulse', 'the cycle', 'cycle pulse edition',
  'business ticker', 'crime watch', 'civic affairs',
  'sports desk', 'culture desk', 'civic desk', 'business desk',
  'editor letters', 'dear editor', 'letters editor',
  'names index', 'business ticker cycle', 'editor crime',
  'bay tribune business', 'bay tribune sports', 'bay tribune civic',
  'bay tribune civic ledger', 'bay tribune civic affairs',
  'cultural liaison', 'lead sports', 'fan columnist',
  // Recurring institutions in editorial prose
  'transit hub', 'fruitvale transit', 'fruitvale taqueria',
  'oversight committee', 'health center', 'stabilization fund',
  'stab fund', 'community development', 'economic development',
  'expansion draft', 'all star', 'opening day',
  'pentecostal church', 'methodist church', 'catholic church',
  'baptist church', 'columba catholic church', 'columba catholic',
  'allen temple', 'allen temple baptist church', 'masjid alislam',
  'greater hope', 'st mary', 'st marys',
  'civic reform', 'reform coalition', 'progressive party',
  'oakland progressive', 'civic reform coalition',
  'community benefits', 'benefits agreement',
  'oakland alternative', 'alternative response',
  'fruitvale transit hub phase', 'fruitvale transit hub',
  // Title-prefix combinations the strip-prefix doesn't catch
  // (when ambiguous about whether stripping is safe)
  'the mayor', 'the council', 'the city', 'the police',
  'the phase', 'the temescal', 'the stabilization', 'the oversight',
  'the bulls', 'the warriors', 'the aviators',
  'council member', 'council president', 'council majority',
  'mayor santana', 'mayor avery', // raw form before strip
  'deputy mayor',
  // NBA / sports outside Oakland (non-A's)
  'oakland oaks', 'oakland athletics', 'las vegas', 'las vegas aviators',
  'chicago bulls', 'golden state', 'eastern conference', 'western conference',
  'chase center', 'united center',
  'home run', 'first friday', 'first place',
  // Reporter personas (.claude/agents/ + docs/media/voices/ — NOT ledger citizens)
  'angela reyes', 'anthony raines', 'carmen delaine', 'celeste tran',
  'dr lila mezran', 'lila mezran', 'farrah del rio', 'hal richmond',
  'jax caldera', 'jordan velez', 'kai marston', 'luis navarro',
  'maria keen', 'mason ortega', 'noah tan', 'p slayer',
  'reed thompson', 'selena grant', 'sgt rachel torres', 'rachel torres',
  'mara vance', 'mags corliss', 'dj hartley',
  // Generic
  'monday tuesday', 'cycle two', 'cycle three',
  'phase one', 'phase two', 'phase three',
  'page one', 'page two', 'front page',
  'line cook', 'summer festival', 'first friday', 'first place',
  // Civic + civic-program institutional names (org strings, not citizens)
  'city hall', 'civis systems', 'civis field',
  'chief montez', 'chief santos', // titled-officer aliases that don't strip
  'temescal health center', 'temescal health',
  'baylight redevelopment authority', 'baylight redevelopment',
  'baylight authority', 'baylight district',
  'west oakland stabilization fund', 'west oakland stabilization',
  'oakland alternative response initiative', 'oakland alternative response',
  'bay tribune chicago bureau', 'bay tribune chicago',
  'cycle calendar', 'civic calendar',
  // Common phrase fragments and titles caught alone
  'by anthony',
  'oversight committee', 'oversight committees',
  'planning commission', 'redevelopment authority',
  // Bulls roster + NBA references in Bulls-coverage prose
  'jericho sims', 'draymond green', 'jimmy butler', 'moses moody',
  'derrick rose', 'kobe bryant', 'michael jordan',
  // Country / region names appearing as 2-word
  'new york', 'los angeles', 'san francisco', 'san diego', 'st louis',
  'salt lake', 'lake city'
]);

function isDenied(normalized) {
  return DENYLIST.has(normalized);
}

// -------------------- load canonical name sets --------------------

async function loadSimLedgerNames() {
  const rows = await sheets.getSheetData('Simulation_Ledger');
  const headers = rows[0] || [];
  const firstIdx = headers.indexOf('First');
  const lastIdx = headers.indexOf('Last');
  if (firstIdx < 0 || lastIdx < 0) {
    throw new Error('Simulation_Ledger headers missing First/Last (got: ' + headers.slice(0, 6).join(',') + ')');
  }
  const out = new Set();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const first = (r[firstIdx] || '').trim();
    const last = (r[lastIdx] || '').trim();
    if (first && last) {
      out.add(normalizeNameKey(first + ' ' + last));
    }
  }
  return out;
}

async function loadSheetNameColumn(sheetName, headerCandidates) {
  let rows;
  try {
    rows = await sheets.getSheetData(sheetName);
  } catch (e) {
    if (VERBOSE) console.error('[warn] could not read ' + sheetName + ': ' + e.message);
    return new Set();
  }
  if (!rows || rows.length < 2) return new Set();
  const headers = rows[0] || [];
  let nameIdx = -1;
  for (const cand of headerCandidates) {
    nameIdx = headers.indexOf(cand);
    if (nameIdx >= 0) break;
  }
  if (nameIdx < 0) {
    if (VERBOSE) console.error('[warn] ' + sheetName + ' missing name column (tried: ' + headerCandidates.join(',') + ')');
    return new Set();
  }
  const out = new Set();
  for (let i = 1; i < rows.length; i++) {
    const name = (rows[i][nameIdx] || '').trim();
    if (name) out.add(normalizeNameKey(name));
  }
  return out;
}

// -------------------- candidate extraction --------------------

// Match proper-noun runs of 2-4 capitalized tokens, allowing hyphen-internal
// caps ("Soria-Dominguez"). Anchored to word boundary, no trailing words.
//   \b[A-Z][a-z]+(?:-[A-Z][a-z]+)?            cap-word, optional hyphen-cont
//   (?:\s+[A-Z][a-z]+(?:-[A-Z][a-z]+)?){1,3}  1-3 additional cap-words
// Use [ ]+ (literal space) instead of \s+ so the run does not span newline
// boundaries — "Beverly Hayes\nSports:" was previously aggregating as a
// single 3-word candidate "Beverly Hayes Sports".
const PROPER_NOUN_RE = /\b[A-Z][a-z]+(?:-[A-Z][a-z]+)?(?:[ ]+[A-Z][a-z]+(?:-[A-Z][a-z]+)?){1,3}\b/g;

function extractCandidates(text) {
  const matches = [];
  let m;
  PROPER_NOUN_RE.lastIndex = 0;
  while ((m = PROPER_NOUN_RE.exec(text)) !== null) {
    matches.push({ surface: m[0], offset: m.index });
  }
  return matches;
}

function snippet(text, offset, len) {
  const lo = Math.max(0, offset - 40);
  const hi = Math.min(text.length, offset + len + 40);
  return text.slice(lo, hi).replace(/\s+/g, ' ').trim();
}

// Strip the NAMES INDEX block (header line + content until the next ALL-CAPS
// section header or end of file). NAMES INDEX content already pairs POPIDs
// to canonical citizen names and would otherwise be a noise source.
function stripNamesIndex(text) {
  const idx = text.indexOf('\nNAMES INDEX');
  if (idx < 0) return text;
  const after = text.slice(idx + 1);
  // Find next ALL-CAPS section header (e.g., "BUSINESSES NAMED", "ARTICLE TABLE")
  const nextHeaderRe = /\n([A-Z][A-Z ]{4,})\n[- ]+\n/;
  const nh = nextHeaderRe.exec(after);
  let endIdx;
  if (nh && nh.index > 0) {
    endIdx = idx + 1 + nh.index;
  } else {
    endIdx = text.length; // NAMES INDEX runs to EOF
  }
  return text.slice(0, idx) + text.slice(endIdx);
}

// -------------------- aggregation --------------------

// Strip a leading "By" byline marker (e.g., "By Carmen Delaine" → "Carmen Delaine"),
// then strip title prefixes. Returns a token array.
function stripBylineAndTitle(tokens) {
  let out = tokens.slice();
  if (out.length > 2 && normalizeNameKey(out[0]) === 'by') {
    out = out.slice(1);
  }
  return stripTitlePrefix(out);
}

function buildKeysToCheck(surface) {
  const keys = [];
  const tokens = surface.split(/\s+/);
  // Full normalized form (catches denylist hits like "By Carmen Delaine" + "Mayor Avery Santana")
  keys.push({ normalized: normalizeNameKey(surface), source: 'full' });
  // Strip-byline + strip-title variant (By Mayor Avery Santana → Avery Santana)
  const stripped = stripBylineAndTitle(tokens);
  if (stripped.length !== tokens.length) {
    keys.push({ normalized: normalizeNameKey(stripped.join(' ')), source: 'byline-or-title-stripped' });
  }
  // 3-word → first+last derived 2-word (Elena Soria Dominguez → Elena Dominguez)
  const useFor2 = stripped.length === tokens.length ? tokens : stripped;
  if (useFor2.length === 3) {
    keys.push({ normalized: normalizeNameKey(useFor2[0] + ' ' + useFor2[2]), source: 'first-last-of-3' });
  }
  // 4-word → first+last
  if (useFor2.length === 4) {
    keys.push({ normalized: normalizeNameKey(useFor2[0] + ' ' + useFor2[3]), source: 'first-last-of-4' });
  }
  return keys;
}

function candidateIsKnown(surface, canonicalSet, culturalSet, chicagoSet, faithSet) {
  const keys = buildKeysToCheck(surface);
  faithSet = faithSet || new Set();
  for (const k of keys) {
    if (!k.normalized) continue;
    if (canonicalSet.has(k.normalized)) return { hit: true, set: 'sim_ledger', key: k };
    if (culturalSet.has(k.normalized)) return { hit: true, set: 'cultural_ledger', key: k };
    if (chicagoSet.has(k.normalized)) return { hit: true, set: 'chicago_citizens', key: k };
    if (faithSet.has(k.normalized)) return { hit: true, set: 'faith_organizations', key: k };
    if (isDenied(k.normalized)) return { hit: true, set: 'denylist', key: k };
    // Substring check against faith orgs (e.g., "Allen Temple" appears in prose; canon entry is "Allen Temple Baptist Church")
    for (const faithName of faithSet) {
      if (faithName.length > k.normalized.length && faithName.includes(k.normalized)) {
        return { hit: true, set: 'faith_organizations_substring', key: k };
      }
    }
  }
  return { hit: false };
}

// -------------------- bay-tribune name index --------------------

// Walks edition .txt files in `editionsDir`, extracts proper-noun candidate
// names, filters out anything already known to the supplied canonical sets
// (Sim_Ledger / Cultural / Chicago / Faith), drops denylist hits, and returns
// a Map<normalizedAggKey, entry> where entry =
//   {name, editions:Set<string>, snippets:string[], count, firstEdition}.
//
// This is the bay-tribune drift index — names that appear in published prose
// but have no canonical row anywhere. Audit main() turns it into a report;
// ingestPublishedEntities (T7) uses it as a per-candidate gate to keep
// drift names out of the NEW-citizen append path (ADR-0007 §Lookup precedence
// step 4 — "bay-tribune returns hit but Sim_Ledger doesn't → canon-layer-drift").
//
// Sync function (file IO only). Callers pre-load the sets via the exported
// loadSimLedgerNames + loadSheetNameColumn helpers.
function buildBayTribuneNameIndex(opts) {
  const editionsDir = opts.editionsDir;
  const simSet = opts.simSet || new Set();
  const culturalSet = opts.culturalSet || new Set();
  const chicagoSet = opts.chicagoSet || new Set();
  const faithSet = opts.faithSet || new Set();
  const verbose = !!opts.verbose;

  const editionFiles = fs.readdirSync(editionsDir)
    .filter(f => /^cycle_pulse_edition_\d+\.txt$/.test(f))
    .sort();

  const agg = new Map();

  for (const f of editionFiles) {
    const filepath = path.join(editionsDir, f);
    let raw;
    try {
      raw = fs.readFileSync(filepath, 'utf-8');
    } catch (_) {
      continue;
    }
    const text = stripNamesIndex(raw);
    const cands = extractCandidates(text);
    let kept = 0;
    for (const c of cands) {
      const verdict = candidateIsKnown(c.surface, simSet, culturalSet, chicagoSet, faithSet);
      if (verdict.hit) {
        continue;
      }
      const stripped = stripBylineAndTitle(c.surface.split(/\s+/));
      const aggKey = normalizeNameKey(stripped.join(' '));
      if (!aggKey || aggKey.split(' ').length < 2) continue;
      if (isDenied(aggKey)) continue;
      const cleanSurface = stripped.join(' ');
      let entry = agg.get(aggKey);
      if (!entry) {
        entry = {
          name: cleanSurface,
          editions: new Set(),
          snippets: [],
          count: 0,
          firstEdition: f
        };
        agg.set(aggKey, entry);
      }
      entry.editions.add(f);
      if (entry.snippets.length < 3) {
        entry.snippets.push(snippet(text, c.offset, c.surface.length));
      }
      entry.count++;
      if (cleanSurface.split(/\s+/).length > entry.name.split(/\s+/).length) {
        entry.name = cleanSurface;
      }
      kept++;
    }
    if (verbose) console.log('  ' + f + ' — candidates: ' + cands.length + ' / kept: ' + kept);
  }

  return agg;
}

// -------------------- main --------------------

async function main() {
  console.log('[auditCanonDrift] loading canonical name sets from sheets…');
  const simSet = await loadSimLedgerNames();
  const culturalSet = await loadSheetNameColumn('Cultural_Ledger', ['Name', 'CitizenName', 'FullName']);
  const chicagoSet = await loadSheetNameColumn('Chicago_Citizens', ['Name', 'FullName', 'First']);
  const faithSet = await loadSheetNameColumn('Faith_Organizations', ['Organization', 'Name', 'OrgName']);
  console.log('[auditCanonDrift] sim=' + simSet.size +
    ' / cultural=' + culturalSet.size +
    ' / chicago=' + chicagoSet.size +
    ' / faith=' + faithSet.size + ' canonical names loaded');

  const editionFiles = fs.readdirSync(EDITIONS_DIR)
    .filter(f => /^cycle_pulse_edition_\d+\.txt$/.test(f))
    .sort();
  console.log('[auditCanonDrift] scanning ' + editionFiles.length + ' edition files…');

  const agg = buildBayTribuneNameIndex({
    editionsDir: EDITIONS_DIR,
    simSet, culturalSet, chicagoSet, faithSet,
    verbose: VERBOSE,
  });

  // Build report
  const report = Array.from(agg.values())
    .map(e => ({
      name: e.name,
      bay_tribune_doc_ids: Array.from(e.editions).sort(),
      first_edition_seen: e.firstEdition,
      narrative_role_snippet: e.snippets[0] || '',
      count: e.count,
      suggested_action: e.editions.size >= 2 ? 'backfill' : 'investigate'
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  console.log('');
  console.log('[auditCanonDrift] ' + report.length + ' candidate drift names surfaced');
  console.log('[auditCanonDrift] top ' + Math.min(REPORT_LIMIT, report.length) + ':');
  console.log('');
  for (const r of report.slice(0, REPORT_LIMIT)) {
    console.log('  [' + r.suggested_action.padEnd(11) + '] ' +
      r.name.padEnd(35) + ' count=' + r.count +
      ' editions=' + r.bay_tribune_doc_ids.length);
    console.log('              first: ' + r.first_edition_seen);
    if (r.narrative_role_snippet) {
      console.log('              ctx:   …' + r.narrative_role_snippet.slice(0, 100) + (r.narrative_role_snippet.length > 100 ? '…' : ''));
    }
  }

  if (EMIT) {
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').slice(0, 19);
    const outPath = path.join(OUTPUT_DIR, 'canon_drift_audit_' + ts + '.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log('');
    console.log('[auditCanonDrift] wrote ' + report.length + ' rows to ' + outPath);
  } else {
    console.log('');
    console.log('[auditCanonDrift] dry-run — pass --emit to write JSON');
  }
}

if (require.main === module) {
  main().catch(function (e) { console.error('[FATAL]', e); process.exit(1); });
}

module.exports = {
  normalizeNameKey: normalizeNameKey,
  stripTitlePrefix: stripTitlePrefix,
  stripBylineAndTitle: stripBylineAndTitle,
  isDenied: isDenied,
  stripNamesIndex: stripNamesIndex,
  extractCandidates: extractCandidates,
  buildKeysToCheck: buildKeysToCheck,
  candidateIsKnown: candidateIsKnown,
  // T7 canon.3 exports — index builder + sheet loaders for ingest callers
  buildBayTribuneNameIndex: buildBayTribuneNameIndex,
  loadSimLedgerNames: loadSimLedgerNames,
  loadSheetNameColumn: loadSheetNameColumn,
  _DENYLIST: DENYLIST,
  _TITLE_PREFIXES: TITLE_PREFIXES
};
