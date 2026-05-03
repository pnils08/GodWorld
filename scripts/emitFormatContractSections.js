#!/usr/bin/env node
/**
 * emitFormatContractSections.js — Derive strict NAMES INDEX + BUSINESSES NAMED
 * from a published edition's rich-prose CITIZEN USAGE LOG section.
 *
 * [engine/sheet] — S197 BUNDLE-A (closes G-W19 / G-P6 / G-P8 / G-P9)
 *
 * The /write-edition compile template emits a rich, human-readable
 * CITIZEN USAGE LOG (categorized subsections, descriptive lines,
 * inline POP-IDs in parentheticals). The format contract in
 * EDITION_PIPELINE.md §Per-section content spec also requires two
 * machine-readable sections — NAMES INDEX and BUSINESSES NAMED — for
 * downstream ingest (ingestPublishedEntities.js → Simulation_Ledger +
 * Business_Ledger). C93 shipped without those, dropping 3 new citizens
 * + Atlas Bay Architects + Greater Hope Pentecostal silently from intake.
 *
 * This helper parses the rich CITIZEN USAGE LOG and emits the two strict
 * sections, then either prints them or splices them in-place before
 * ARTICLE TABLE.
 *
 * Usage:
 *   node scripts/emitFormatContractSections.js <edition.txt> --inject
 *   node scripts/emitFormatContractSections.js <edition.txt> --print
 *
 * --inject is idempotent: if NAMES INDEX / BUSINESSES NAMED already exist,
 * they are replaced; otherwise spliced in immediately before ARTICLE TABLE.
 *
 * Exit codes:
 *   0  success
 *   1  missing CITIZEN USAGE LOG section, or no entities derived
 *   2  argument error / file not found
 */

const fs = require('fs');
const path = require('path');

// Faith-org name signals (case-insensitive). Match anywhere in the org name.
const FAITH_KEYWORDS = [
  'church', 'pentecostal', 'baptist', 'catholic', 'methodist',
  'lutheran', 'presbyterian', 'temple', 'mosque', 'synagogue',
  'parish', 'congregation', 'ministries', 'gospel', 'fellowship',
  'sanctuary', 'cathedral', 'chapel',
];

// Business-org signals — used as a positive marker for biz classification.
// If neither faith nor biz keywords match, default to biz (most NEW CANON
// org sub-sections in editions are firms or institutions; faith is the
// minority case and easier to identify positively).
const BIZ_KEYWORDS = [
  'architects', 'inc', 'llc', 'corp', 'corporation', 'group', 'partners',
  'agency', 'consulting', 'advisors', 'studio', 'systems', 'industries',
  'company', 'holdings', 'capital', 'ventures', 'lab', 'works',
  'construction', 'builders', 'co.',
];

// Institutional-body signals — checked BEFORE biz/faith. Committees, councils,
// boards, and commissions are NEW CANON sub-section headers in cycles where
// the body itself was formed (e.g., Transit Hub Oversight Committee in C93).
// They don't belong in Business_Ledger or Faith_Organizations; the individual
// members listed underneath go to NAMES INDEX as citizens.
const COMMITTEE_KEYWORDS = [
  'committee', 'council', 'board', 'commission', 'caucus',
  'taskforce', 'task force',
];

// First-word filters for entity rows: lines starting with these are meta /
// comment / list-header lines, not citizen names. Drop before parsing.
const NON_NAME_FIRST_WORDS = new Set([
  'Other', 'Source', 'Sources', 'Replaces', 'Note', 'See', 'Refer',
  'Plus', 'Including', 'Additionally', 'Also', 'External', 'Internal',
  'Per', 'Re', 'Subject',
]);

// Sub-section headers in CITIZEN USAGE LOG that group individuals (NOT orgs).
// Lines under these are individual citizens; the header is descriptive only.
const INDIVIDUAL_SUBSECTION_PATTERNS = [
  /^civic\s*\/\s*government$/i,
  /^citizens? quoted/i,
  /^letters? writers?$/i,
  /^external canon/i,
  /^sources?$/i,
  /^anonymous sources?$/i,
];

// ────────────────────────────────────────────────────────────────────────────
// Locate sections
// ────────────────────────────────────────────────────────────────────────────
function findSectionRange(lines, headerName, terminators) {
  // Returns { startBody, end, headerLine } or null. headerLine is the
  // line index of the header itself (for splice operations). startBody
  // skips any separator lines after the header.
  let headerLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === headerName) {
      headerLine = i;
      break;
    }
  }
  if (headerLine < 0) return null;

  let startBody = headerLine + 1;
  while (startBody < lines.length && /^[=\-─━_]+$/.test(lines[startBody].trim())) startBody++;

  let end = lines.length;
  for (let j = startBody; j < lines.length; j++) {
    const t = lines[j].trim();
    for (const term of terminators) {
      if (t === term) { end = j; break; }
    }
    if (end !== lines.length) break;
  }
  return { headerLine, startBody, end };
}

// All known footer-section headers, used as terminators when walking CUL.
const FOOTER_HEADERS = [
  'NAMES INDEX', 'BUSINESSES NAMED', 'CITIZEN USAGE LOG',
  'ARTICLE TABLE', 'STORYLINES UPDATED', 'CONTINUITY NOTES',
  'COMING NEXT EDITION', 'COMING NEXT', 'END EDITION',
];

// ────────────────────────────────────────────────────────────────────────────
// Parse CITIZEN USAGE LOG into structured entries
// ────────────────────────────────────────────────────────────────────────────
function classifyOrgSubsection(headerText) {
  // headerText is the cleaned subsection header without the (NEW CANON ...) tag.
  // Three buckets: faith / committee (institutional body) / biz. Order matters:
  // committee check runs before biz so Authority/Council-suffixed bodies don't
  // mis-route into Business_Ledger.
  const lower = headerText.toLowerCase();
  for (const k of FAITH_KEYWORDS) {
    if (lower.includes(k)) return 'faith';
  }
  for (const k of COMMITTEE_KEYWORDS) {
    if (lower.includes(k)) return 'committee';
  }
  for (const k of BIZ_KEYWORDS) {
    // word-boundary-ish: pad with spaces so "co" doesn't match inside "company"
    const padded = ' ' + lower + ' ';
    if (padded.includes(' ' + k + ' ') || padded.includes(' ' + k + ',') || padded.includes(' ' + k + '.')) {
      return 'biz';
    }
  }
  // Default: biz (NEW CANON sub-section without faith/committee signal)
  return 'biz';
}

function parseCitizenUsageLog(sectionLines) {
  // Returns: { citizens: [...], businesses: [...], faithOrgs: [...] }
  // Two-pass: gather raw rows, then unify dedupe across popId / bare-name keys
  // (Gloria Hutchins appears once with POP-00727 + role and once bare under
  // LETTERS WRITERS — second pass merges by name).
  const businesses = [];
  const faithOrgs = [];
  const rawCitizens = []; // collected first, then deduped/merged
  if (!sectionLines || sectionLines.length === 0) {
    return { citizens: [], businesses, faithOrgs };
  }

  const seenOrgKey = new Set();

  function pushOrg(kind, name) {
    const key = name.toLowerCase();
    if (seenOrgKey.has(key)) return;
    seenOrgKey.add(key);
    if (kind === 'faith') faithOrgs.push({ name });
    else if (kind === 'biz') businesses.push({ name });
    // 'committee' kind: track-only, neither emitted; members listed underneath
    // surface as individual citizens.
  }

  for (let i = 0; i < sectionLines.length; i++) {
    const raw = sectionLines[i];
    const line = raw.trim();
    if (!line) continue;
    if (/^[=\-─━_]+$/.test(line)) continue;

    // Subsection header: line that doesn't start with `-` or `*`, has letters,
    // and isn't a content row. We match either ALL-CAPS or Title Case headers
    // optionally followed by a parenthetical tag.
    if (!/^[-*]/.test(line)) {
      // Strip parenthetical tags like "(NEW CANON THIS CYCLE)" or
      // "(NEW CANON — substituted for ...)"
      const tagMatch = line.match(/\(([^)]*)\)\s*$/);
      const tagText = tagMatch ? tagMatch[1] : '';
      const headerText = (tagMatch ? line.slice(0, line.length - tagMatch[0].length) : line).trim();

      const isNewCanon = /new\s+canon/i.test(tagText);
      const matchesIndividualPattern = INDIVIDUAL_SUBSECTION_PATTERNS.some(re => re.test(headerText));

      if (isNewCanon && !matchesIndividualPattern && headerText) {
        const kind = classifyOrgSubsection(headerText);
        // Convert ALL-CAPS to Title Case for storage; keep already-mixed-case as-is.
        const orgName = headerText === headerText.toUpperCase()
          ? toTitleCase(headerText)
          : headerText;
        pushOrg(kind, orgName);
        continue;
      }
      // Plain header (CIVIC / GOVERNMENT, CITIZENS QUOTED OR PROFILED, etc.) —
      // descriptive only; rows beneath are individuals.
      continue;
    }

    // Content row starting with `-`. Strip the bullet.
    const stripped = line.replace(/^[-*]\s*/, '').trim();
    if (!stripped) continue;

    // Filter list-header / meta / comment rows BEFORE parsing as entity.
    // Three signals catch the C93 noise rows:
    //  1. First word is in NON_NAME_FIRST_WORDS (Replaces / Other / Note / ...)
    //  2. The row contains a colon before any em-dash split — indicates a
    //     "label: list" shape rather than a citizen row.
    //  3. The row is a bare reference like "Anonymous source" — caught
    //     downstream in parseEntityRow.
    const firstToken = stripped.split(/\s+/)[0].replace(/[,.]$/, '');
    if (NON_NAME_FIRST_WORDS.has(firstToken)) continue;
    const colonIdx = stripped.indexOf(':');
    const emDashIdx = stripped.search(/\s+[—–]\s+/);
    if (colonIdx > 0 && (emDashIdx < 0 || colonIdx < emDashIdx)) continue;

    const rec = parseEntityRow(stripped);
    if (!rec) continue;
    rawCitizens.push(rec);
  }

  // Pass 2: unified dedupe. A row with popId wins over a bare-name row that
  // matches the same person. Also merge same-popId rows (keep the longer role).
  const byKey = new Map(); // key → rec
  const nameToKey = new Map(); // lowercased fullName → primary key

  for (const rec of rawCitizens) {
    if (rec.popId) {
      const key = rec.popId.toLowerCase();
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, rec);
        nameToKey.set(rec.fullName.toLowerCase(), key);
      } else if ((rec.role || '').length > (existing.role || '').length) {
        existing.role = rec.role;
      }
    } else {
      const nameKey = rec.fullName.toLowerCase();
      const popKey = nameToKey.get(nameKey);
      if (popKey) {
        // Already covered by a popId-bearing row; merge role if better
        const existing = byKey.get(popKey);
        if (existing && (rec.role || '').length > (existing.role || '').length) {
          existing.role = rec.role;
        }
        continue;
      }
      const existing = byKey.get(nameKey);
      if (!existing) {
        byKey.set(nameKey, rec);
        nameToKey.set(nameKey, nameKey);
      } else if ((rec.role || '').length > (existing.role || '').length) {
        existing.role = rec.role;
      }
    }
  }

  // Preserve insertion order (Map iteration is insertion-ordered).
  const citizens = [...byKey.values()];

  return { citizens, businesses, faithOrgs };
}

function toTitleCase(s) {
  return s.split(/\s+/).map(w => {
    if (!w) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}

// Parse one CUL content row into { fullName, popId?, role }
function parseEntityRow(stripped) {
  // Strip trailing source-tag parentheticals like "(S1 / Mezran)" — multiple
  // parentheticals possible; remove them iteratively from the right.
  let work = stripped;
  let popId = null;

  // Extract any ID-like parenthetical anywhere in the row: (POP-NNNNN), (CUL-XXXXXXX),
  // (BIZ-NNNNN), (FAITH-NNNNN). First match wins.
  const idParen = work.match(/\((POP-\d{5}|CUL-[A-Z0-9]+|BIZ-\d{5}|FAITH-\d+)\)/i);
  if (idParen) {
    popId = idParen[1].toUpperCase();
    work = work.replace(idParen[0], '').trim();
  }

  // Strip remaining parentheticals (source tags, descriptors).
  work = work.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  work = work.replace(/\s+/g, ' ');

  // Now split into name + role. Prefer em-dash separator, then comma.
  // After em-dash split, if the name half contains a comma, the part before
  // the first comma is the actual name and what follows is descriptor that
  // should be folded into role. Source lines like "Frank Reyna, A's OF
  // prospect — first major-league hit" otherwise resolve to fullName="Frank
  // Reyna, A's OF prospect" and downstream tokenization picks "prospect" as
  // last name. This branch keeps the name + collapses descriptors into role.
  let fullName = '';
  let role = '';
  const emDashSplit = work.match(/^(.+?)\s+[—–]\s+(.+)$/);
  if (emDashSplit) {
    let leftHalf = emDashSplit[1].trim();
    role = emDashSplit[2].trim();
    const commaInLeft = leftHalf.indexOf(',');
    if (commaInLeft > 0) {
      const descriptor = leftHalf.slice(commaInLeft + 1).trim();
      fullName = leftHalf.slice(0, commaInLeft).trim();
      role = descriptor + (role ? ' — ' + role : '');
    } else {
      fullName = leftHalf;
    }
  } else {
    // Comma-separated descriptors: first comma terminates the name.
    const commaIdx = work.indexOf(',');
    if (commaIdx > 0) {
      fullName = work.slice(0, commaIdx).trim();
      role = work.slice(commaIdx + 1).trim();
    } else {
      fullName = work.trim();
    }
  }

  // Strip leading honorifics that aren't part of the canonical name. We keep
  // them in role-context only when they're substantive; for now drop the most
  // common ones that the ledger doesn't store.
  const HONORIFICS = ['Mayor', 'Council Member', 'Council President', 'Councilmember',
    'Deputy Mayor', 'DA', 'Police Chief', 'Chief', 'Dr.', 'Bishop', 'Pastor',
    'Reverend', 'Rev.', 'Mr.', 'Mrs.', 'Ms.', 'Senator', 'Captain'];
  let strippedTitle = '';
  for (const h of HONORIFICS) {
    if (fullName.toLowerCase().startsWith(h.toLowerCase() + ' ')) {
      strippedTitle = h;
      fullName = fullName.slice(h.length).trim();
      break;
    }
  }
  // For honorifics we strip, prepend them to role for context if role is empty.
  if (strippedTitle && !role) {
    role = strippedTitle;
  }

  // Clean up role: drop trailing source tags that survived (`S1 / Mezran` etc.)
  role = role.replace(/\s+S\d+\s*\/\s*[A-Za-z]+\s*$/i, '').trim();
  // Truncate role at first newline.
  role = role.split('\n')[0].trim();

  if (!fullName) return null;
  const tokens = fullName.split(/\s+/).filter(Boolean);
  // Reject "Anonymous" / "Anonymous source" / "Anonymous resident" — these are
  // editorial placeholders for unnamed citizens, never ingest targets.
  if (tokens[0] && /^anonymous$/i.test(tokens[0])) return null;
  // Reject single-token "names" without a backing ID.
  if (tokens.length < 2 && !popId) return null;
  // First token must look like a proper noun (capitalized, optional accent).
  if (!/^[A-ZÀ-Ý]/.test(tokens[0])) return null;

  return { fullName, popId, role };
}

// ────────────────────────────────────────────────────────────────────────────
// Emit strict sections
// ────────────────────────────────────────────────────────────────────────────
const SEPARATOR = '============================================================';

function emitNamesIndex(parsed) {
  const out = [];
  out.push(SEPARATOR);
  out.push('');
  out.push('NAMES INDEX');
  out.push('');
  for (const c of parsed.citizens) {
    if (c.popId) {
      out.push('- ' + c.popId + ' | ' + c.fullName + (c.role ? ' | ' + c.role : ''));
    } else {
      // Pre-T1 freeform fallback — ingester promotes to POP-pending row
      out.push('- ' + c.fullName + (c.role ? ' — ' + c.role : ''));
    }
  }
  for (const f of parsed.faithOrgs) {
    out.push('- FAITH-NEW | ' + f.name + ' | Faith Org | ');
  }
  return out;
}

function emitBusinessesNamed(parsed) {
  const out = [];
  out.push(SEPARATOR);
  out.push('');
  out.push('BUSINESSES NAMED');
  out.push('');
  if (parsed.businesses.length === 0) {
    out.push('(no new businesses this cycle)');
  } else {
    for (const b of parsed.businesses) {
      out.push('- NEW | ' + b.name + ' |  | ');
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// Inject (idempotent) — replace existing strict sections OR insert before
// ARTICLE TABLE.
// ────────────────────────────────────────────────────────────────────────────
function injectSections(lines, namesBlock, bizBlock) {
  // Strategy:
  //  1. Locate ARTICLE TABLE; it must be present (the published edition
  //     contract has it). If absent, fail loud — caller broke the contract
  //     more deeply than this script can fix.
  //  2. Locate any existing NAMES INDEX / BUSINESSES NAMED blocks. For each,
  //     mark the range from its preceding `===` separator (if adjacent)
  //     through the next `===` or the next footer header for removal.
  //  3. Remove existing blocks.
  //  4. Insert the new namesBlock + bizBlock before the `===` separator that
  //     precedes ARTICLE TABLE (so they sit cleanly between the body and the
  //     article table).

  const articleTableIdx = lines.findIndex(l => l.trim() === 'ARTICLE TABLE');
  if (articleTableIdx < 0) {
    throw new Error('ARTICLE TABLE section not found — cannot anchor insertion.');
  }

  // Build a mutable copy of lines.
  let working = lines.slice();

  function removeExistingBlock(headerName) {
    const idx = working.findIndex(l => l.trim() === headerName);
    if (idx < 0) return;
    // Walk back to include the preceding `===` separator and any blank line.
    let start = idx;
    while (start > 0 && working[start - 1].trim() === '') start--;
    if (start > 0 && /^={5,}$/.test(working[start - 1].trim())) start--;
    while (start > 0 && working[start - 1].trim() === '') start--;
    // Walk forward to the next footer header or `===` separator.
    let end = idx + 1;
    while (end < working.length) {
      const t = working[end].trim();
      if (FOOTER_HEADERS.includes(t) && t !== headerName) break;
      if (/^={5,}$/.test(t)) {
        // Lookahead: is the next non-blank a footer header?
        let look = end + 1;
        while (look < working.length && working[look].trim() === '') look++;
        if (look < working.length && FOOTER_HEADERS.includes(working[look].trim())) break;
      }
      end++;
    }
    working.splice(start, end - start);
  }

  removeExistingBlock('NAMES INDEX');
  removeExistingBlock('BUSINESSES NAMED');

  // Re-locate ARTICLE TABLE after removals.
  let atIdx = working.findIndex(l => l.trim() === 'ARTICLE TABLE');
  if (atIdx < 0) {
    throw new Error('ARTICLE TABLE disappeared during cleanup — abort.');
  }
  // Walk back to the `===` separator that precedes it.
  let insertAt = atIdx;
  while (insertAt > 0 && working[insertAt - 1].trim() === '') insertAt--;
  if (insertAt > 0 && /^={5,}$/.test(working[insertAt - 1].trim())) {
    insertAt--; // insert before the separator so the new block ends with its own separator
  }

  const insertion = []
    .concat(namesBlock)
    .concat([''])
    .concat(bizBlock)
    .concat(['']);

  working.splice(insertAt, 0, ...insertion);
  return working;
}

// ────────────────────────────────────────────────────────────────────────────
// Module exports — ingestPublishedEntities + verifyNamesIndexParse reuse
// these for the CITIZEN USAGE LOG fallback path when NAMES INDEX is absent.
// ────────────────────────────────────────────────────────────────────────────
module.exports = {
  parseCitizenUsageLog,
  parseEntityRow,
  classifyOrgSubsection,
  findSectionRange,
  emitNamesIndex,
  emitBusinessesNamed,
  FOOTER_HEADERS,
};

if (require.main === module) {
  cli();
}

// ────────────────────────────────────────────────────────────────────────────
// CLI entry point
// ────────────────────────────────────────────────────────────────────────────
function cli() {
const args = process.argv.slice(2);
const filePath = args.find(a => !a.startsWith('--'));
const mode = args.includes('--inject') ? 'inject' : (args.includes('--print') ? 'print' : null);

if (!filePath || !mode) {
  console.error('Usage: node scripts/emitFormatContractSections.js <edition.txt> [--inject|--print]');
  process.exit(2);
}
const fullPath = path.resolve(filePath);
if (!fs.existsSync(fullPath)) {
  console.error('[ERROR] File not found: ' + fullPath);
  process.exit(2);
}

const text = fs.readFileSync(fullPath, 'utf8');
const lines = text.split('\n');

const culRange = findSectionRange(lines, 'CITIZEN USAGE LOG',
  FOOTER_HEADERS.filter(h => h !== 'CITIZEN USAGE LOG'));

if (!culRange) {
  console.error('[ERROR] CITIZEN USAGE LOG section not found in ' + path.basename(fullPath));
  console.error('  Cannot derive NAMES INDEX / BUSINESSES NAMED without source CUL.');
  process.exit(1);
}

const culLines = lines.slice(culRange.startBody, culRange.end);
const parsed = parseCitizenUsageLog(culLines);

console.log('Source: ' + path.basename(fullPath));
console.log('CITIZEN USAGE LOG: lines ' + (culRange.startBody + 1) + '–' + culRange.end);
console.log('  Citizens parsed:    ' + parsed.citizens.length);
console.log('  Businesses (NEW):   ' + parsed.businesses.length);
console.log('  Faith orgs (NEW):   ' + parsed.faithOrgs.length);

if (parsed.citizens.length === 0 && parsed.businesses.length === 0 && parsed.faithOrgs.length === 0) {
  console.error('[ERROR] CITIZEN USAGE LOG present but parser extracted 0 entities.');
  process.exit(1);
}

const namesBlock = emitNamesIndex(parsed);
const bizBlock = emitBusinessesNamed(parsed);

if (mode === 'print') {
  console.log('');
  console.log(namesBlock.join('\n'));
  console.log('');
  console.log(bizBlock.join('\n'));
  process.exit(0);
}

// --inject
try {
  const newLines = injectSections(lines, namesBlock, bizBlock);
  fs.writeFileSync(fullPath, newLines.join('\n'));
  console.log('');
  console.log('[INJECTED] NAMES INDEX (' + parsed.citizens.length + ' rows + '
    + parsed.faithOrgs.length + ' faith) + BUSINESSES NAMED (' + parsed.businesses.length + ')');
  console.log('  Written: ' + fullPath);
  process.exit(0);
} catch (e) {
  console.error('[ERROR] Inject failed: ' + e.message);
  process.exit(1);
}
} // end cli()
