#!/usr/bin/env node
/**
 * ingestPublishedEntities.js — Standing intake from published artifacts to engine sheets
 * [engine/sheet] — S180 build, ROLLOUT_PLAN "BUILD: Standing intake"
 *
 * Reads NAMES INDEX + BUSINESSES NAMED sections from a published .txt
 * (edition / interview / supplemental / dispatch / interview-transcript)
 * and writes new entities to the canonical engine sheets:
 *   - Simulation_Ledger (citizens) — only entities not already present
 *   - Business_Ledger (businesses) — only entities not already present
 *
 * Existing citizens and businesses are NEVER modified; mismatches are logged
 * for editorial review, not silently overwritten. Citizens stay where they
 * are — Simulation_Ledger is canon.
 *
 * New citizens land with Status=`pending`, Tier=4, ClockMode=ENGINE, and
 * blank demographic columns. The engine fills the missing columns next
 * cycle (a future maintenance script will sweep `Status=pending` rows
 * and complete demographics from canon sources). New businesses land with
 * cols A–D filled, E–I blank.
 *
 * Closes the /post-publish Step 5 "NOT WIRED" gap.
 *
 * Usage:
 *   node scripts/ingestPublishedEntities.js editions/cycle_pulse_edition_92.txt --dry-run
 *   node scripts/ingestPublishedEntities.js editions/cycle_pulse_interview_92_santana.txt --type interview --cycle 92 --apply
 *
 * Flags:
 *   --type {edition|interview|supplemental|dispatch|interview-transcript}
 *           Default: edition. Used for output filename + JSON metadata.
 *   --cycle N
 *           Required when --type ≠ edition; for edition, derived from filename.
 *   --dry-run / --apply
 *           Default is --dry-run. --apply writes to the live sheets.
 *
 * Format handling:
 *   NAMES INDEX accepts two row shapes:
 *     T1 strict:    `- POP-00789 | Elias Varek | Founder, Civis Systems`
 *     pre-T1 free:  `- Elias Varek — Founder, Civis Systems`   (em-dash or hyphen)
 *   BUSINESSES NAMED — strict only:
 *     `- BIZ-00042 | Anchor Build | Construction | Brooklyn`
 *     `- NEW | Atlas Bay Architects | Architecture | Downtown`
 *
 * Output: output/intake_published_entities_c<cycle>_<slug>.json
 *
 * Requires: GOOGLE_APPLICATION_CREDENTIALS pointing at the service account.
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const citizenDerivation = require('../lib/citizenDerivation');  // S184 (Phase 4.1.c) — intake-side derivation library
const formatContract = require('./emitFormatContractSections');  // S197 BUNDLE-A — CITIZEN USAGE LOG fallback

const ALLOWED_TYPES = ['edition', 'interview', 'supplemental', 'dispatch', 'interview-transcript'];

// New-citizen defaults (col → value). Cols absent from this map ship blank.
const NEW_CITIZEN_DEFAULTS = {
  'UNI (y/n)': 'no',
  'MED (y/n)': 'no',
  'CIV (y/n)': 'no',
  'ClockMode': 'ENGINE',
  'Tier': '4',
  'Status': 'pending',
};

// ---------------------------------------------------------------------------
// CLI flag parsing — mirrors T6/T7/T9 pattern
// ---------------------------------------------------------------------------
function parseFlag(name) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

function parseType() {
  const raw = parseFlag('type');
  if (!raw) return 'edition';
  if (ALLOWED_TYPES.indexOf(raw) === -1) {
    console.error('[ERROR] --type must be one of: ' + ALLOWED_TYPES.join(', '));
    process.exit(1);
  }
  return raw;
}

function parseCycleFlag() {
  const raw = parseFlag('cycle');
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error('[ERROR] --cycle must be a positive integer');
    process.exit(1);
  }
  return n;
}

function deriveSlug(filePath, type, cycle) {
  const base = path.basename(filePath, '.txt');
  if (type === 'edition') return 'e' + cycle;
  // cycle_pulse_interview_92_santana → interview_c92_santana
  const m = base.match(new RegExp('^cycle_pulse_' + type + '_\\d+_(.+)$'));
  if (m) return type + '_c' + cycle + '_' + m[1];
  return type + '_c' + cycle;
}

// ---------------------------------------------------------------------------
// Letter-footer + pronoun signal extraction — S232 canon.3 followup.
//
// Closes the squatter problem surfaced in T9: NAMES INDEX is too sparse
// (Name / role / neighborhood only, no age, no gender), so ingest defaults
// BirthYear=2003 + relies on citizenDerivation.deriveCitizenProfile for
// Gender. Both defaults regularly contradict bay-tribune canon (POP-00953
// Carmen Solis ended up Gender=male; POP-00955 Keisha Morris ended up age 38
// when E94 said 51).
//
// Letter-footer pattern in editions (E82/E86/E94 verified):
//   — Name, AGE, Neighborhood[, Role]
// Pronoun signal: count he/his/him vs she/her near each candidate's name.
// ---------------------------------------------------------------------------

// Capture group 1 = name (2-3 capitalized words, hyphen tolerant),
// group 2 = age (1-3 digits), group 3 = neighborhood (until next comma or EOL),
// group 4 = optional role.
const LETTER_FOOTER_RE = /[—–-]\s+([A-Z][a-z]+(?:[- ][A-Z][a-z]+){1,3}),\s*(\d{1,3}),\s*([A-Za-z][^,\n]+?)(?:,\s*([^\n]+?))?\s*$/gm;

function normalizeFullName(name) {
  return String(name)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract structured signals (age, neighborhood, role) from letter footers
// in the published text. Returns a Map<normalizedName, signalRow>. Multiple
// footers for the same name keep the first occurrence — operator can override
// downstream if needed.
function extractLetterFooterSignals(text) {
  const out = new Map();
  if (!text) return out;
  LETTER_FOOTER_RE.lastIndex = 0;
  let m;
  while ((m = LETTER_FOOTER_RE.exec(text)) !== null) {
    const name = m[1].trim();
    const age = parseInt(m[2], 10);
    const neighborhood = (m[3] || '').trim();
    const role = (m[4] || '').trim();
    if (!Number.isFinite(age) || age < 5 || age > 110) continue;
    const key = normalizeFullName(name);
    if (!key || key.split(' ').length < 2) continue;
    if (out.has(key)) continue;
    out.set(key, { name, age, neighborhood, role });
  }
  return out;
}

// Count he/his/him vs she/her in a ±400-character window around each
// occurrence of `fullName`. Returns 'male' | 'female' | null (tie/no signal).
function detectGenderFromPronouns(text, fullName) {
  if (!text || !fullName) return null;
  const escaped = fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const occRe = new RegExp('\\b' + escaped + '\\b', 'g');
  const malePronoun = /\b(?:he|his|him)\b/gi;
  const femalePronoun = /\b(?:she|her|hers)\b/gi;
  let male = 0;
  let female = 0;
  let m;
  occRe.lastIndex = 0;
  while ((m = occRe.exec(text)) !== null) {
    const lo = Math.max(0, m.index - 400);
    const hi = Math.min(text.length, m.index + fullName.length + 400);
    const window = text.slice(lo, hi);
    const mc = (window.match(malePronoun) || []).length;
    const fc = (window.match(femalePronoun) || []).length;
    male += mc;
    female += fc;
  }
  if (male === 0 && female === 0) return null;
  if (male >= 2 && male > female * 2) return 'male';
  if (female >= 2 && female > male * 2) return 'female';
  return null;  // ambiguous — leave to citizenDerivation default
}

// Enrich a candidate with letter-footer and pronoun signals. Returns the
// candidate (mutated in place) with signal* fields when available.
function enrichCandidateWithProseSignals(candidate, footerMap, fullText) {
  const fullName = candidate.first + ' ' + candidate.last;
  const key = normalizeFullName(fullName);
  const footer = footerMap.get(key);
  if (footer) {
    if (footer.age) candidate.signalAge = footer.age;
    if (footer.neighborhood && !candidate.neighborhood) candidate.signalNeighborhood = footer.neighborhood;
    if (footer.role) candidate.signalRole = footer.role;
  }
  const gender = detectGenderFromPronouns(fullText, fullName);
  if (gender) candidate.signalGender = gender;
  return candidate;
}

// ---------------------------------------------------------------------------
// T7 canon.3 / ADR-0007 §Lookup precedence step 4 — bay-tribune cross-check.
//
// Pre-T7, any NAMES INDEX name with no Sim_Ledger first+last match was
// classified as NEW and appended on --apply. That path caused the S222 C94
// double-classification of Carmen Solis + Roberto Iglesias: both already
// existed in published bay-tribune canon (E93) but had no Sim_Ledger row,
// so ingest re-classified them as NEW POPIDs on every subsequent cycle that
// referenced them — squatter pattern.
//
// T7 splits the candidate set: candidates with a bay-tribune index hit are
// re-routed to `canonDrift` and never appended. Engine-sheet does the
// backfill manually via canon3_backfill_t9.js or similar scripts. The drift
// JSON shape matches the audit script's entry shape (bay_tribune_doc_ids /
// first_edition_seen / suggested_action) for cross-consumer consistency,
// extended with {popid: null, surfacedBy, cycle} per plan §Task 7.
// ---------------------------------------------------------------------------
function partitionCandidatesByBayTribuneIndex(candidates, bayTribuneIndex, cycle) {
  const canonNew = [];
  const canonDrift = [];
  if (!bayTribuneIndex || bayTribuneIndex.size === 0) {
    return { canonNew: candidates.slice(), canonDrift: [] };
  }
  for (const c of candidates) {
    const forms = [];
    if (c.middle) forms.push(c.first + ' ' + c.middle + ' ' + c.last);
    forms.push(c.first + ' ' + c.last);
    let hit = null;
    for (const form of forms) {
      const key = normalizeFullName(form);
      if (key && bayTribuneIndex.has(key)) {
        hit = bayTribuneIndex.get(key);
        break;
      }
    }
    if (hit) {
      const editionsList = Array.from(hit.editions).sort();
      canonDrift.push({
        popid: null,
        name: hit.name || (c.first + ' ' + c.last),
        bay_tribune_doc_ids: editionsList,
        first_edition_seen: hit.firstEdition,
        narrative_role_snippet: (hit.snippets && hit.snippets[0]) || '',
        count: hit.count,
        suggested_action: editionsList.length >= 2 ? 'backfill' : 'investigate',
        surfacedBy: 'post-publish-step-5',
        cycle,
        candidateOrigin: {
          first: c.first,
          last: c.last,
          middle: c.middle || '',
          description: c.description || '',
        },
      });
    } else {
      canonNew.push(c);
    }
  }
  return { canonNew, canonDrift };
}

// ---------------------------------------------------------------------------
// Section finder (reuses pattern from ingestEditionWiki.js)
// ---------------------------------------------------------------------------
function findSection(lines, header, endPatterns) {
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === header || t.indexOf(header) === 0) {
      start = i + 1;
      while (start < lines.length && /^[=\-─━]+$/.test(lines[start].trim())) start++;
      break;
    }
  }
  if (start < 0) return null;

  let end = lines.length;
  for (let j = start; j < lines.length; j++) {
    for (let ep = 0; ep < endPatterns.length; ep++) {
      if (lines[j].trim().indexOf(endPatterns[ep]) === 0) {
        end = j;
        break;
      }
    }
    if (end !== lines.length) break;
  }
  return lines.slice(start, end);
}

// ---------------------------------------------------------------------------
// NAMES INDEX parser — handles T1 strict + pre-T1 freeform + dispatch flat
// ---------------------------------------------------------------------------
// Three row shapes accepted:
//   T1 strict bullet:    `- POP-00789 | Elias Varek | Founder, Civis Systems`
//   T1 strict flat:      `POP-00537 | Marin Tao | Musician`         (dispatch — no bullet prefix)
//   pre-T1 freeform:     `- Patricia Nolan — Retired teacher, Temescal`
// ID prefix extended POP-only → POP/CUL/BIZ/FAITH per EDITION_PIPELINE.md
// §Per-section content spec (S189 R2 update). CUL-/BIZ-/FAITH- entries flow
// through here for downstream filtering — resolveCitizens routes only POP-
// entries to Simulation_Ledger; non-POP IDs are logged but not appended.
function parseNamesIndex(sectionLines) {
  const out = [];
  if (!sectionLines) return out;

  for (const raw of sectionLines) {
    const line = raw.trim();
    if (!line) continue;
    // Skip pure-separator lines (findSection only filters fully-empty trims).
    if (/^[=\-─━_]+$/.test(line)) continue;
    // Bullet prefix is now optional (dispatch flat-body shape has no leading `-`).
    const stripped = line.replace(/^-\s*/, '');

    // T1 strict: `<PREFIX>-<ID> | Name | Role` (POP/CUL/BIZ/FAITH/etc.)
    const strictMatch = stripped.match(/^([A-Z]+)-([A-Z0-9]+)\s*\|/);
    if (strictMatch) {
      const parts = stripped.split('|').map(p => p.trim());
      out.push({
        popId: parts[0] || null,
        prefix: strictMatch[1],
        fullName: parts[1] || '',
        description: parts[2] || '',
        format: 'strict',
      });
      continue;
    }

    // Pre-T1 freeform: `Name — Description` or `Name - Description`
    const sep = stripped.match(/\s+[—–-]\s+/);
    if (sep) {
      const idx = stripped.indexOf(sep[0]);
      const fullName = stripped.slice(0, idx).trim();
      const description = stripped.slice(idx + sep[0].length).trim();
      if (fullName) {
        out.push({ popId: null, prefix: null, fullName, description, format: 'freeform' });
        continue;
      }
    }

    // Bare name with no description (only when bullet was present — flat-body
    // bare lines without a separator are ambiguous and skipped to avoid noise).
    if (line[0] === '-' && stripped) {
      out.push({ popId: null, prefix: null, fullName: stripped, description: '', format: 'bare' });
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// BUSINESSES NAMED parser — strict pipe-format, bullet prefix optional
// ---------------------------------------------------------------------------
// S229 engine.24 coupling fix (G-P37 root cause): bullet prefix REQUIRED
// pre-S229 caused C94 to silently drop all 4 published BUSINESSES NAMED
// rows (canonical exemplar + C94 published form are flat, no bullet).
// Loosened to mirror NAMES INDEX parser at line 156 — strip optional `-`
// prefix then split on pipe. Skip blank + separator lines.
function parseBusinessesNamed(sectionLines) {
  const out = [];
  if (!sectionLines) return out;

  for (const raw of sectionLines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[=\-─━_]+$/.test(line)) continue;
    const stripped = line.replace(/^-\s*/, '');
    if (stripped.indexOf('|') < 0) continue;

    const parts = stripped.split('|').map(p => p.trim());
    out.push({
      bizId: parts[0] || '',
      name: parts[1] || '',
      sector: parts[2] || '',
      neighborhood: parts[3] || '',
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Cycle resolution from filename (edition only)
// ---------------------------------------------------------------------------
function extractCycleFromFilename(filename) {
  const m = filename.match(/edition[_-](\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

// ---------------------------------------------------------------------------
// Sheet auth helper
// ---------------------------------------------------------------------------
function getSheets(scopes) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: scopes || ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// ---------------------------------------------------------------------------
// Resolve citizens against Simulation_Ledger
// ---------------------------------------------------------------------------
async function resolveCitizens(parsed, sheetsClient, sheetId) {
  const res = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Simulation_Ledger!A1:AU',
  });
  const rows = res.data.values || [];
  const headers = rows[0] || [];
  const data = rows.slice(1);

  const popIdIdx = 0;  // POPID col A
  const firstIdx = headers.indexOf('First');
  const lastIdx = headers.indexOf('Last');

  // Build lookup tables
  const byPopId = new Map();
  const byFirstLast = new Map();
  let maxPopNum = 0;

  for (const row of data) {
    const pop = (row[popIdIdx] || '').trim();
    const first = (row[firstIdx] || '').trim();
    const last = (row[lastIdx] || '').trim();
    if (pop) {
      byPopId.set(pop, { row, first, last });
      const m = pop.match(/^POP-(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxPopNum) maxPopNum = n;
      }
    }
    if (first && last) {
      const key = (first + ' ' + last).toLowerCase();
      if (byFirstLast.has(key)) {
        byFirstLast.get(key).push({ pop, row });
      } else {
        byFirstLast.set(key, [{ pop, row }]);
      }
    }
  }

  const matched = [];
  const phantom = [];
  const ambiguous = [];
  const candidates = [];
  const culturalOnly = [];  // Non-POP IDs (CUL-/BIZ-/FAITH-) — logged, not appended to Sim_Ledger

  for (const entry of parsed) {
    // Route non-POP prefixed entries away from Sim_Ledger. CUL- entries live
    // in wd-cultural; BIZ- belong in Business_Ledger (parsed separately by
    // BUSINESSES NAMED). FAITH- → Faith_Organizations. Engine-sheet downstream
    // (E6 buildCulturalCards) refreshes wd-cultural for CUL- entries.
    if (entry.prefix && entry.prefix !== 'POP') {
      culturalOnly.push({
        id: entry.popId,
        prefix: entry.prefix,
        fullName: entry.fullName,
        description: entry.description,
      });
      continue;
    }

    if (entry.popId) {
      const hit = byPopId.get(entry.popId);
      if (!hit) {
        phantom.push({ popId: entry.popId, fullName: entry.fullName, reason: 'POP-ID not in ledger' });
        continue;
      }
      // Verify name match (warn on drift; do not overwrite)
      const ledgerName = (hit.first + ' ' + hit.last).trim();
      const driftWarning = ledgerName.toLowerCase() !== entry.fullName.toLowerCase()
        ? `name drift: ledger "${ledgerName}" vs index "${entry.fullName}"`
        : null;
      matched.push({ popId: entry.popId, fullName: entry.fullName, driftWarning });
    } else {
      // Lookup by First+Last
      const tokens = entry.fullName.split(/\s+/).filter(Boolean);
      if (tokens.length < 2) {
        ambiguous.push({ fullName: entry.fullName, reason: 'single-token name; cannot match' });
        continue;
      }
      // Strip trailing generational suffix (Sr., Jr., II, III, IV) before
      // first/last/middle picking so "Calvin Reeves Sr." resolves
      // first=Calvin, last=Reeves (not last=Sr., middle=Reeves). Suffix is
      // appended back to `last` for new-citizen candidate rows so display
      // and ledger stay aligned; lookup key uses the stripped form so an
      // existing "Calvin Reeves" row matches a "Calvin Reeves Sr." input.
      const SUFFIX_RE = /^(?:sr|jr|ii|iii|iv)\.?$/i;
      const nameTokens = [...tokens];
      let suffix = '';
      if (nameTokens.length >= 3 && SUFFIX_RE.test(nameTokens[nameTokens.length - 1])) {
        suffix = nameTokens.pop();
      }
      const first = nameTokens[0];
      const lastBare = nameTokens[nameTokens.length - 1];
      const middle = nameTokens.length > 2 ? nameTokens.slice(1, -1).join(' ') : '';
      const key = (first + ' ' + lastBare).toLowerCase();
      const hits = byFirstLast.get(key);
      if (!hits || hits.length === 0) {
        const last = suffix ? `${lastBare} ${suffix}` : lastBare;
        candidates.push({ fullName: entry.fullName, first, last, middle, description: entry.description });
      } else if (hits.length === 1) {
        matched.push({ popId: hits[0].pop, fullName: entry.fullName, resolved: true });
      } else {
        ambiguous.push({ fullName: entry.fullName, reason: hits.length + ' citizens share this name', popIds: hits.map(h => h.pop) });
      }
    }
  }

  // S184 (Phase 4.1.c) — pass raw rows through so appendCitizens can build a
  // ledgerFreq snapshot without a second sheet fetch.
  return { headers, matched, phantom, ambiguous, candidates, culturalOnly, maxPopNum, rows };
}

// ---------------------------------------------------------------------------
// Resolve businesses against Business_Ledger
// ---------------------------------------------------------------------------
async function resolveBusinesses(parsed, sheetsClient, sheetId) {
  const res = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Business_Ledger!A1:I',
  });
  const rows = res.data.values || [];
  const data = rows.slice(1);

  const byBizId = new Map();
  const byName = new Map();
  let maxBizNum = 0;

  for (const row of data) {
    const id = (row[0] || '').trim();
    const name = (row[1] || '').trim();
    if (id) {
      byBizId.set(id, { row, name });
      const m = id.match(/^BIZ-(\d+)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxBizNum) maxBizNum = n;
      }
    }
    if (name) byName.set(name.toLowerCase(), { id, row });
  }

  const matched = [];
  const candidates = [];
  const mismatches = [];

  for (const entry of parsed) {
    const id = entry.bizId;
    if (id && id !== 'NEW' && id.match(/^BIZ-\d+$/)) {
      const hit = byBizId.get(id);
      if (!hit) {
        mismatches.push({ bizId: id, name: entry.name, reason: 'BIZ-ID not in ledger' });
        continue;
      }
      const driftWarning = hit.name.toLowerCase() !== entry.name.toLowerCase()
        ? `name drift: ledger "${hit.name}" vs index "${entry.name}"`
        : null;
      matched.push({ bizId: id, name: entry.name, driftWarning });
    } else {
      // NEW or unrecognized — check by name first
      const nameHit = byName.get(entry.name.toLowerCase());
      if (nameHit) {
        matched.push({ bizId: nameHit.id, name: entry.name, resolvedByName: true });
      } else {
        candidates.push({ name: entry.name, sector: entry.sector, neighborhood: entry.neighborhood });
      }
    }
  }

  return { matched, candidates, mismatches, maxBizNum };
}

// ---------------------------------------------------------------------------
// Append rows + verify
// ---------------------------------------------------------------------------
async function appendCitizens(candidates, headers, maxPopNum, sheetsClient, sheetId, ledgerRows) {
  if (candidates.length === 0) return [];

  const now = new Date().toISOString();
  const rowsToAppend = [];
  const popIds = [];

  // S184 (Phase 4.1.c) — build ledgerFreq snapshot once per ingest call for
  // neighborhood-aware RoleType + EducationLevel draws. ledgerRows is the
  // full sheet (header at row 0) passed through from resolveCitizens.
  const ledgerFreq = ledgerRows && ledgerRows.length > 0
    ? citizenDerivation.buildLedgerFreqSnapshot(headers, ledgerRows, { includesHeader: true })
    : { byNeighborhood: {}, citywide: { roleTypes: {}, educationByAge: {} } };

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const popNum = maxPopNum + 1 + i;
    const popId = 'POP-' + String(popNum).padStart(5, '0');
    popIds.push(popId);

    // S184 (Phase 4.1.c) — derive 8 demographic + lifecycle fields per candidate.
    // Pre-T1 NAMES INDEX entries lack BirthYear / Neighborhood; defaults: age 38,
    // neighborhood drawn by frequency-weighted citywide distribution.
    //
    // S232 canon.3 follow-up — letter-footer prose signals (c.signalAge / c.signalNeighborhood
    // / c.signalGender / c.signalRole) populated by enrichCandidateWithProseSignals
    // override the heuristic defaults below. Signals fire when E*.txt carries
    // canonical footer rows like "— Keisha Morris, 51, West Oakland, counselor"
    // or pronoun-weighted prose ≥2 male/female words near the name.
    const seed = c.first + '|' + (c.last || '') + '|' + popId;
    const birthYear = c.birthYear
      ? parseInt(c.birthYear, 10)
      : (c.signalAge ? 2041 - c.signalAge : 2003);
    const age = 2041 - (Number.isFinite(birthYear) && birthYear > 1900 ? birthYear : 2003);
    const effectiveNeighborhood = c.neighborhood || c.signalNeighborhood || '';
    const profile = citizenDerivation.deriveCitizenProfile(seed, age, effectiveNeighborhood, ledgerFreq);

    // Build row aligned with headers
    const row = headers.map(h => {
      if (h === 'POPID') return popId;
      if (h === 'First') return c.first;
      if (h === 'Middle') return c.middle || '';
      if (h === 'Last') return c.last;
      if (h === 'CreatedAt') return now;
      if (h === 'Last Updated') return now;
      if (h === 'BirthYear') return birthYear;
      if (h === 'Neighborhood') return effectiveNeighborhood || profile._neighborhood;
      if (h === 'RoleType') return c.signalRole || profile.RoleType;
      if (h === 'EducationLevel') return profile.EducationLevel;
      if (h === 'Gender') return c.signalGender || profile.Gender;
      if (h === 'YearsInCareer') return profile.YearsInCareer;
      if (h === 'DebtLevel') return profile.DebtLevel;
      if (h === 'NetWorth') return profile.NetWorth;
      if (h === 'MaritalStatus') return profile.MaritalStatus;
      if (h === 'NumChildren') return profile.NumChildren;
      if (NEW_CITIZEN_DEFAULTS[h] !== undefined) return NEW_CITIZEN_DEFAULTS[h];
      return '';
    });
    rowsToAppend.push(row);
  }

  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Simulation_Ledger!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rowsToAppend },
  });

  // Verify by readback
  const verifyRes = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Simulation_Ledger!A1:D',
  });
  const allRows = verifyRes.data.values || [];
  const lastRows = allRows.slice(-candidates.length);
  const verified = [];
  for (let i = 0; i < candidates.length; i++) {
    const row = lastRows[i] || [];
    verified.push({
      popId: row[0] || '',
      first: row[1] || '',
      last: row[3] || '',
      expected: popIds[i],
      ok: row[0] === popIds[i],
    });
  }
  return verified;
}

async function appendBusinesses(candidates, maxBizNum, sheetsClient, sheetId) {
  if (candidates.length === 0) return [];

  const rowsToAppend = [];
  const bizIds = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const bizNum = maxBizNum + 1 + i;
    const bizId = 'BIZ-' + String(bizNum).padStart(5, '0');
    bizIds.push(bizId);
    // Cols A-I: BIZ_ID, Name, Sector, Neighborhood, Employee_Count, Avg_Salary, Annual_Revenue, Growth_Rate, Key_Personnel
    rowsToAppend.push([bizId, c.name, c.sector, c.neighborhood, '', '', '', '', '']);
  }

  await sheetsClient.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Business_Ledger!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rowsToAppend },
  });

  const verifyRes = await sheetsClient.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Business_Ledger!A1:D',
  });
  const allRows = verifyRes.data.values || [];
  const lastRows = allRows.slice(-candidates.length);
  const verified = [];
  for (let i = 0; i < candidates.length; i++) {
    const row = lastRows[i] || [];
    verified.push({
      bizId: row[0] || '',
      name: row[1] || '',
      expected: bizIds[i],
      ok: row[0] === bizIds[i],
    });
  }
  return verified;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const dryRun = !apply;
  const type = parseType();
  const cycleFlag = parseCycleFlag();

  // First positional that isn't a flag value (skip --type/--cycle's value)
  let sourcePath = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) continue;
    const prev = args[i - 1];
    if (prev === '--type' || prev === '--cycle') continue;
    sourcePath = a;
    break;
  }

  if (!sourcePath) {
    console.log('Usage: node scripts/ingestPublishedEntities.js <source.txt> [--type <type>] [--cycle N] [--dry-run|--apply]');
    process.exit(1);
  }

  const fullPath = path.resolve(sourcePath);
  if (!fs.existsSync(fullPath)) {
    console.error('[ERROR] File not found: ' + fullPath);
    process.exit(1);
  }

  // Cycle resolution
  let cycle = cycleFlag;
  if (cycle === null) {
    if (type === 'edition') cycle = extractCycleFromFilename(path.basename(fullPath));
    if (cycle === null) {
      console.error('[ERROR] --cycle is required for --type ' + type + ' (no fallback extraction).');
      process.exit(1);
    }
  }

  const slug = deriveSlug(fullPath, type, cycle);
  const sheetId = process.env.GODWORLD_SHEET_ID;
  if (!sheetId) {
    console.error('[ERROR] GODWORLD_SHEET_ID not set in env');
    process.exit(1);
  }

  console.log('=== ingestPublishedEntities ===');
  console.log('[METADATA] ' + JSON.stringify({
    type,
    cycle,
    slug,
    source: path.basename(fullPath),
    mode: dryRun ? 'DRY-RUN' : 'APPLY',
  }, null, 2));
  console.log('---');

  // Parse
  const text = fs.readFileSync(fullPath, 'utf8');
  const lines = text.split('\n');
  const namesSection = findSection(lines, 'NAMES INDEX', ['CITIZEN USAGE LOG', 'BUSINESSES NAMED', 'ARTICLE TABLE', 'STORYLINES UPDATED', 'CONTINUITY NOTES', 'COMING NEXT', 'END EDITION', '---']);
  const bizSection = findSection(lines, 'BUSINESSES NAMED', ['ARTICLE TABLE', 'STORYLINES UPDATED', 'CONTINUITY NOTES', 'COMING NEXT', 'END EDITION', '---']);

  let parsedCitizens = parseNamesIndex(namesSection);
  let parsedBusinesses = parseBusinessesNamed(bizSection);
  let fallbackUsed = false;

  // S197 BUNDLE-A — CITIZEN USAGE LOG fallback. Pre-S197 editions (and any
  // future cycle that skipped the /write-edition Step 3a inject) emit the
  // rich-prose CITIZEN USAGE LOG without strict NAMES INDEX / BUSINESSES NAMED.
  // Without this fallback, ingest silently no-ops and new entities are
  // dropped from canonical sheets (G-W19 / G-P6 / G-P8 / G-P9). The fallback
  // derives strict-shape rows from the rich CUL via the shared library.
  if (parsedCitizens.length === 0 && parsedBusinesses.length === 0) {
    const culRange = formatContract.findSectionRange(lines, 'CITIZEN USAGE LOG',
      formatContract.FOOTER_HEADERS.filter(h => h !== 'CITIZEN USAGE LOG'));
    if (culRange) {
      const culLines = lines.slice(culRange.startBody, culRange.end);
      const fallback = formatContract.parseCitizenUsageLog(culLines);
      if (fallback.citizens.length > 0 || fallback.businesses.length > 0 || fallback.faithOrgs.length > 0) {
        parsedCitizens = fallback.citizens.map(c => ({
          popId: c.popId,
          prefix: c.popId ? c.popId.split('-')[0] : null,
          fullName: c.fullName,
          description: c.role || '',
          format: c.popId ? 'strict' : 'freeform',
        }));
        // Faith orgs surface as FAITH- prefixed rows in NAMES INDEX; downstream
        // resolveCitizens routes them to culturalOnly (not Sim_Ledger).
        for (const f of fallback.faithOrgs) {
          parsedCitizens.push({
            popId: 'FAITH-NEW',
            prefix: 'FAITH',
            fullName: f.name,
            description: 'Faith Org',
            format: 'strict',
          });
        }
        parsedBusinesses = fallback.businesses.map(b => ({
          bizId: 'NEW',
          name: b.name,
          sector: '',
          neighborhood: '',
        }));
        fallbackUsed = true;
        console.log('[FALLBACK] NAMES INDEX + BUSINESSES NAMED missing; derived from CITIZEN USAGE LOG.');
        console.log('  Recommend: run `node scripts/emitFormatContractSections.js ' +
          path.basename(fullPath) + ' --inject` to add strict sections (idempotent).');
      }
    }
  }

  console.log(`Parsed: ${parsedCitizens.length} citizen rows, ${parsedBusinesses.length} business rows` +
    (fallbackUsed ? ' (via CUL fallback)' : ''));
  if (!namesSection && !fallbackUsed) console.log('  (no NAMES INDEX section in source)');
  if (!bizSection && !fallbackUsed) console.log('  (no BUSINESSES NAMED section in source)');
  console.log('');

  // Fail-loud sanity check: NAMES INDEX section had non-empty content lines
  // but parser extracted zero citizens. Closes gap-log finding #9 and the E1
  // false-success pattern at the script level (complements E8's skill-level
  // cross-check). Counts only non-separator content lines so the existing
  // "pure-atmosphere artifact" path stays valid for sections that legitimately
  // contain only headers + separators.
  if (namesSection) {
    const contentLines = namesSection.filter(l => {
      const t = l.trim();
      return t && !/^[=\-─━_]+$/.test(t);
    });
    if (contentLines.length > 0 && parsedCitizens.length === 0) {
      console.error('[ERROR] NAMES INDEX section had ' + contentLines.length +
        ' non-empty content lines but parser extracted 0 citizens. ' +
        'Sample line: "' + contentLines[0].trim() + '"');
      process.exit(1);
    }
  }

  if (parsedCitizens.length === 0 && parsedBusinesses.length === 0) {
    // G-P10 (S215): write a sentinel report instead of silently exiting.
    // Pre-fix the script exited cleanly with no filesystem evidence, so
    // future debug sessions saw "no JSON" and assumed the script never ran.
    const outPath = path.join(__dirname, '..', 'output',
      'intake_published_entities_c' + cycle + '_' + slug + '.json');
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const sentinel = {
      timestamp: new Date().toISOString(),
      source: path.basename(fullPath),
      type, cycle, slug,
      mode: dryRun ? 'dry-run' : 'apply',
      skipReason: '0 entities — pure-atmosphere artifact (no NAMES INDEX content + no CUL fallback hits). Script ran and finished cleanly; nothing to ingest.',
      citizens: { parsed: 0, matched: [], candidates: [], ambiguous: [], phantom: [], culturalOnly: [], appended: [] },
      businesses: { parsed: 0, matched: [], candidates: [], mismatches: [], appended: [] },
    };
    fs.writeFileSync(outPath, JSON.stringify(sentinel, null, 2));
    console.log('0 entities — pure-atmosphere artifact. Nothing to ingest.');
    console.log('Sentinel report written: ' + outPath);
    process.exit(0);
  }

  // Resolve
  const sheetsClient = getSheets();
  const citizenResolution = await resolveCitizens(parsedCitizens, sheetsClient, sheetId);
  const bizResolution = await resolveBusinesses(parsedBusinesses, sheetsClient, sheetId);

  // S232 canon.3 follow-up — extract prose signals (letter footers + pronoun
  // weights) and enrich each NEW candidate. Closes the squatter problem:
  // pre-S232 NEW candidates landed with BirthYear=2003 + heuristic Gender
  // because NAMES INDEX lacks age + pronoun information.
  const footerMap = extractLetterFooterSignals(text);
  let signalHits = 0;
  for (const c of citizenResolution.candidates) {
    enrichCandidateWithProseSignals(c, footerMap, text);
    if (c.signalAge || c.signalNeighborhood || c.signalGender || c.signalRole) signalHits++;
  }
  if (citizenResolution.candidates.length > 0) {
    console.log('[prose-signals] ' + signalHits + ' of ' + citizenResolution.candidates.length +
      ' new candidates enriched (footer-rows: ' + footerMap.size + ').');
  }

  // T7 canon.3 / ADR-0007 — bay-tribune cross-check before NEW classification.
  // For each candidate that survived resolveCitizens (no Sim_Ledger match),
  // check whether the name appears in published bay-tribune editions. Hits
  // re-route to canonDrift and are excluded from the append path; engine-sheet
  // backfills them manually against canonical sources.
  let canonNewCitizens = citizenResolution.candidates;
  let canonDriftCitizens = [];
  if (citizenResolution.candidates.length > 0) {
    try {
      const audit = require('./auditCanonDrift');
      const editionsDir = path.join(__dirname, '..', 'editions');
      console.log('[bay-tribune] loading canonical sets for drift cross-check…');
      const simSet = await audit.loadSimLedgerNames();
      const culturalSet = await audit.loadSheetNameColumn('Cultural_Ledger', ['Name', 'CitizenName', 'FullName']);
      const chicagoSet = await audit.loadSheetNameColumn('Chicago_Citizens', ['Name', 'FullName', 'First']);
      const faithSet = await audit.loadSheetNameColumn('Faith_Organizations', ['Organization', 'Name', 'OrgName']);
      const bayTribuneIndex = audit.buildBayTribuneNameIndex({
        editionsDir, simSet, culturalSet, chicagoSet, faithSet,
      });
      console.log('[bay-tribune] index built: ' + bayTribuneIndex.size + ' drift names from ' +
        'editions/cycle_pulse_edition_*.txt');
      const partition = partitionCandidatesByBayTribuneIndex(
        citizenResolution.candidates, bayTribuneIndex, cycle);
      canonNewCitizens = partition.canonNew;
      canonDriftCitizens = partition.canonDrift;
      console.log('[bay-tribune] partition: ' + canonNewCitizens.length + ' genuine NEW / ' +
        canonDriftCitizens.length + ' canon-layer-drift (deferred to engine-sheet backfill)');
      if (canonDriftCitizens.length > 0) {
        const driftPath = path.join(__dirname, '..', 'output', 'canon_drift_c' + cycle + '.json');
        const driftDir = path.dirname(driftPath);
        if (!fs.existsSync(driftDir)) fs.mkdirSync(driftDir, { recursive: true });
        fs.writeFileSync(driftPath, JSON.stringify(canonDriftCitizens, null, 2));
        console.log('[bay-tribune] canon-drift report written: ' + driftPath);
      }
    } catch (err) {
      console.error('[bay-tribune] WARN — drift cross-check failed: ' + err.message);
      console.error('[bay-tribune] falling back to pre-T7 behavior (all candidates treated as NEW)');
      // Fail-open is the conservative choice here: pre-T7 behavior is the
      // worst-case (same as today), and operator still sees candidates
      // listed in the dry-run report below before --apply.
    }
  }

  console.log('CITIZENS:');
  console.log('  matched:    ' + citizenResolution.matched.length);
  console.log('  candidates: ' + canonNewCitizens.length + ' (new — would append)');
  if (canonDriftCitizens.length > 0) {
    console.log('  canon-drift:' + String(canonDriftCitizens.length).padStart(2) + ' (bay-tribune-known; NOT appended — see canon_drift_c' + cycle + '.json)');
  }
  console.log('  ambiguous:  ' + citizenResolution.ambiguous.length);
  console.log('  phantom:    ' + citizenResolution.phantom.length);
  console.log('  cultural:   ' + citizenResolution.culturalOnly.length + ' (CUL-/non-POP — logged, not appended)');
  console.log('  next POPID: POP-' + String(citizenResolution.maxPopNum + 1).padStart(5, '0'));
  console.log('');
  console.log('BUSINESSES:');
  console.log('  matched:    ' + bizResolution.matched.length);
  console.log('  candidates: ' + bizResolution.candidates.length + ' (new — would append)');
  console.log('  mismatches: ' + bizResolution.mismatches.length);
  console.log('  next BIZ-ID: BIZ-' + String(bizResolution.maxBizNum + 1).padStart(5, '0'));
  console.log('');

  // Detail dump (helpful for dry-run inspection)
  if (canonNewCitizens.length > 0) {
    console.log('Citizen candidates (would append):');
    canonNewCitizens.forEach((c, i) => {
      const popNum = citizenResolution.maxPopNum + 1 + i;
      console.log('  ' + 'POP-' + String(popNum).padStart(5, '0') + '  ' + c.first + ' ' + c.last + (c.description ? ' — ' + c.description.slice(0, 60) : ''));
      const signals = [];
      if (c.signalAge) signals.push('age=' + c.signalAge);
      if (c.signalNeighborhood) signals.push('hood=' + c.signalNeighborhood);
      if (c.signalGender) signals.push('gender=' + c.signalGender);
      if (c.signalRole) signals.push('role=' + c.signalRole);
      if (signals.length > 0) {
        console.log('            [prose-signals] ' + signals.join(' | '));
      }
    });
    console.log('');
  }
  if (canonDriftCitizens.length > 0) {
    console.log('Canon-layer drift (bay-tribune-known; NOT appended — engine-sheet backfill):');
    canonDriftCitizens.forEach(d => {
      console.log('  ' + d.name.padEnd(35) + ' [' + d.suggested_action.padEnd(11) + '] ' +
        'editions=' + d.bay_tribune_doc_ids.length + ' count=' + d.count +
        ' first=' + d.first_edition_seen);
    });
    console.log('');
  }
  if (bizResolution.candidates.length > 0) {
    console.log('Business candidates (would append):');
    bizResolution.candidates.forEach((b, i) => {
      const bizNum = bizResolution.maxBizNum + 1 + i;
      console.log('  ' + 'BIZ-' + String(bizNum).padStart(5, '0') + '  ' + b.name + (b.sector ? ' (' + b.sector + ')' : '') + (b.neighborhood ? ' — ' + b.neighborhood : ''));
    });
    console.log('');
  }
  if (citizenResolution.ambiguous.length > 0) {
    console.log('Ambiguous citizens (skipped — editorial review):');
    citizenResolution.ambiguous.forEach(a => console.log('  ' + a.fullName + ' — ' + a.reason));
    console.log('');
  }
  if (citizenResolution.phantom.length > 0) {
    console.log('Phantom POP-IDs (in source but not in ledger):');
    citizenResolution.phantom.forEach(p => console.log('  ' + p.popId + '  ' + p.fullName + ' — ' + p.reason));
    console.log('');
  }

  // Write phase
  let citizenAppended = [];
  let businessAppended = [];
  if (apply) {
    console.log('--apply: writing to live sheets');
    // T7: append only canonNewCitizens; canonDriftCitizens are deferred to
    // engine-sheet backfill via the canon_drift_c<cycle>.json report.
    citizenAppended = await appendCitizens(canonNewCitizens, citizenResolution.headers, citizenResolution.maxPopNum, sheetsClient, sheetId, citizenResolution.rows);
    businessAppended = await appendBusinesses(bizResolution.candidates, bizResolution.maxBizNum, sheetsClient, sheetId);

    const allOk = citizenAppended.every(r => r.ok) && businessAppended.every(r => r.ok);
    console.log('  citizen rows verified: ' + citizenAppended.filter(r => r.ok).length + '/' + citizenAppended.length);
    console.log('  business rows verified: ' + businessAppended.filter(r => r.ok).length + '/' + businessAppended.length);
    if (!allOk) {
      console.error('[WARN] Some appended rows did not verify on read-back. Inspect output JSON.');
    }
  } else {
    console.log('Mode: DRY-RUN — no writes performed. Run with --apply to write.');
  }

  // Write JSON output
  const outPath = path.join(__dirname, '..', 'output', 'intake_published_entities_c' + cycle + '_' + slug + '.json');
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const report = {
    timestamp: new Date().toISOString(),
    source: path.basename(fullPath),
    type,
    cycle,
    slug,
    mode: dryRun ? 'dry-run' : 'apply',
    citizens: {
      parsed: parsedCitizens.length,
      matched: citizenResolution.matched,
      candidates: canonNewCitizens.map((c, i) => ({
        ...c,
        proposedPopId: 'POP-' + String(citizenResolution.maxPopNum + 1 + i).padStart(5, '0'),
      })),
      canonDrift: canonDriftCitizens,
      ambiguous: citizenResolution.ambiguous,
      phantom: citizenResolution.phantom,
      culturalOnly: citizenResolution.culturalOnly,
      appended: citizenAppended,
    },
    businesses: {
      parsed: parsedBusinesses.length,
      matched: bizResolution.matched,
      candidates: bizResolution.candidates.map((b, i) => ({
        ...b,
        proposedBizId: 'BIZ-' + String(bizResolution.maxBizNum + 1 + i).padStart(5, '0'),
      })),
      mismatches: bizResolution.mismatches,
      appended: businessAppended,
    },
  };
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log('');
  console.log('Report written: ' + outPath);
}

// S232 canon.3 follow-up — export prose-signal helpers for unit testing.
// require.main guard keeps main() side-effect-free when required as a module.
module.exports = {
  extractLetterFooterSignals: extractLetterFooterSignals,
  enrichCandidateWithProseSignals: enrichCandidateWithProseSignals,
  detectGenderFromPronouns: detectGenderFromPronouns,
  normalizeFullName: normalizeFullName,
  // S233 canon.3 T7 — bay-tribune drift partition
  partitionCandidatesByBayTribuneIndex: partitionCandidatesByBayTribuneIndex
};

if (require.main === module) {
  main().catch(err => {
    console.error('[FATAL]', err);
    process.exit(1);
  });
}
