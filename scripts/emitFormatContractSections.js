#!/usr/bin/env node
/**
 * emitFormatContractSections.js — Derive strict NAMES INDEX + BUSINESSES NAMED
 * from a published edition's rich-prose CITIZEN USAGE LOG section.
 *
 * [engine/sheet] — S197 BUNDLE-A (closes G-W19 / G-P6 / G-P8 / G-P9)
 * [engine/sheet] — S229 engine.24 ADR-0006 Contract B rewrite (closes G-W43 / G-P37):
 *   - Standalone `(NEW CANON THIS CYCLE)` subsection per-line classification
 *     (faith / biz / citizen) rather than header-only classification
 *   - Flat strict pipe-format emission (no leading `- ` bullet) matching
 *     canonical [[docs/media/EDITION_FORMAT_TEMPLATE]]
 *   - 60-hyphen separator (matches template + downstream parser regex
 *     `^-{10,}$` terminator) — `===` separators rejected via pre-write
 *     assertion
 *   - FAIL LOUD: if CUL mentions `BIZ-` / `BIZ-pending` but biz extraction
 *     returns zero → exit 1
 *   - FAIL LOUD: if standalone `(NEW CANON THIS CYCLE)` subsection present
 *     but per-line classification yields zero of any kind → exit 1
 *   - FAIL LOUD: pre-write assertion — any `^={5,}$` line in output throws
 *
 * Pairs with [[docs/media/EDITION_FORMAT_TEMPLATE]] (Contract A canonical
 * exemplar shipped S227 by research-build) + /write-edition Step 3
 * `(NEW CANON THIS CYCLE)` sub-format documentation. ADR-0006 §Contract B
 * applies: parser must refuse to emit success when canon-bearing content
 * is silently dropped.
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
 *   1  missing CITIZEN USAGE LOG section, no entities derived, OR
 *      Contract B fail-loud trip (BIZ-mention with zero biz extraction,
 *      standalone NEW-CANON subsection with zero classification, or
 *      pre-write `===` assertion fired)
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

// Per-line descriptor keywords for (NEW CANON THIS CYCLE) classification.
// Broader than BIZ_KEYWORDS — these match descriptor text like
// "Telegraph corridor bar (BIZ-pending, ...)" where the entity name doesn't
// carry a biz-suffix but the descriptor signals biz type.
const BIZ_DESCRIPTOR_KEYWORDS = [
  'bar', 'restaurant', 'cafe', 'café', 'bakery', 'shop', 'store',
  'firm', 'tavern', 'pub', 'kitchen', 'diner', 'grill', 'market',
  'gallery', 'salon', 'clinic', 'studio', 'workshop', 'co-op',
  'coop', 'cooperative', 'collective', 'foundation',
];

// Faith descriptor keywords (in addition to FAITH_KEYWORDS which match
// entity names). These match descriptor text like "Methodist tradition,
// Rev. Daniel Han, congregation 300" where the descriptor signals faith
// even if the name itself doesn't carry a clear faith-suffix.
const FAITH_DESCRIPTOR_KEYWORDS = [
  'tradition', 'congregation', 'pastor', 'rev.', 'reverend',
  'bishop', 'imam', 'rabbi', 'minister', 'parishioners',
  'worship', 'denomination', 'diocese',
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

// S229 engine.24 Contract B addition.
// Classify a single (NEW CANON THIS CYCLE) bullet line by its descriptor
// text. Returns 'faith' | 'biz' | 'citizen' | 'unknown'.
//
// Decision order (strongest signal first):
//   1. citizen — explicit "citizen," prefix OR "POP-pending" marker
//   2. faith — FAITH_DESCRIPTOR_KEYWORDS hit (tradition, congregation,
//      Rev./Pastor, etc.) OR FAITH_KEYWORDS hit in entity name
//   3. biz — "BIZ-pending" OR "BIZ-NNNNN" OR BIZ_DESCRIPTOR_KEYWORDS hit
//      OR BIZ_KEYWORDS hit in entity name
//   4. unknown — descriptor doesn't carry any classifying signal
function classifyNewCanonRow(name, descriptor) {
  const nameLower = (name || '').toLowerCase();
  const descLower = (descriptor || '').toLowerCase();
  const combined = nameLower + ' ' + descLower;

  // 1. Citizen signal — explicit and strong
  if (/^citizen[,\s]/i.test(descriptor || '')) return 'citizen';
  if (/\bpop-pending\b/i.test(descriptor || '')) return 'citizen';

  // 2. Faith signal — descriptor keywords first, then name keywords
  for (const k of FAITH_DESCRIPTOR_KEYWORDS) {
    if (descLower.includes(k)) return 'faith';
  }
  for (const k of FAITH_KEYWORDS) {
    if (nameLower.includes(k)) return 'faith';
  }

  // 3. Biz signal — descriptor first (BIZ-pending / sector words),
  // then name biz-keywords
  if (/\bbiz-(?:pending|\d+)/i.test(descriptor || '')) return 'biz';
  for (const k of BIZ_DESCRIPTOR_KEYWORDS) {
    // word-boundary check via spaces
    const padded = ' ' + descLower + ' ';
    if (padded.includes(' ' + k + ' ') || padded.includes(' ' + k + ',') || padded.includes(' ' + k + '.')) {
      return 'biz';
    }
  }
  for (const k of BIZ_KEYWORDS) {
    const padded = ' ' + combined + ' ';
    if (padded.includes(' ' + k + ' ') || padded.includes(' ' + k + ',') || padded.includes(' ' + k + '.')) {
      return 'biz';
    }
  }

  return 'unknown';
}

// Parse a (NEW CANON THIS CYCLE) bullet line and return either a citizen
// record (same shape as parseEntityRow) or an org record { kind, name,
// sector, neighborhood }. Returns null if the line is unparseable.
//
// Shape per template line 162-164:
//   - {Citizen Name} — citizen, {neighborhood} {occupation} (POP-pending)
//   - {Business Name} — {one-line sector + neighborhood} (BIZ-pending OR confirmed)
//   - {Faith Org Name} — confirmed canon, {neighborhood}, {tradition}, {leader name}, congregation {N}, founded {year}
function parseNewCanonRow(stripped) {
  // Em-dash split: name on left, descriptor on right.
  const emDashSplit = stripped.match(/^(.+?)\s+[—–]\s+(.+)$/);
  if (!emDashSplit) return null;

  const name = emDashSplit[1].trim();
  let descriptor = emDashSplit[2].trim();

  // Strip trailing parentheticals like "(POP-pending)" / "(BIZ-pending, established 1998)"
  // — capture the parenthetical content first for classifier hint, then strip.
  const parenMatches = descriptor.match(/\(([^)]*)\)/g) || [];
  const parenContent = parenMatches.map(p => p.slice(1, -1)).join(' ');
  const descriptorForClassify = descriptor + ' ' + parenContent;
  const descriptorClean = descriptor.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();

  const kind = classifyNewCanonRow(name, descriptorForClassify);

  if (kind === 'citizen') {
    // Build a citizen record matching parseEntityRow shape.
    // popId stays null (POP-pending); descriptor becomes role.
    return {
      kind: 'citizen',
      record: { fullName: name, popId: null, role: descriptorClean },
    };
  }

  if (kind === 'faith') {
    // Extract neighborhood best-effort: "<neighborhood> neighborhood" or
    // "in <neighborhood>," or the first segment after the leading "confirmed canon,".
    let neighborhood = '';
    const nbhdMatch = descriptorClean.match(/([A-Z][\w\s'.-]*?)\s+neighborhood/);
    if (nbhdMatch) {
      neighborhood = nbhdMatch[1].trim();
    } else {
      // Fall back to first comma-segment after "confirmed canon,"
      const segs = descriptorClean.split(/,\s*/);
      if (/confirmed canon/i.test(segs[0]) && segs[1]) {
        neighborhood = segs[1].trim();
      }
    }
    return {
      kind: 'faith',
      record: { name, neighborhood, descriptor: descriptorClean },
    };
  }

  if (kind === 'biz') {
    // Extract sector + neighborhood best-effort. Common shape:
    // "Telegraph corridor bar" → neighborhood "Telegraph corridor", sector "bar"
    // "Adams Point urban-systems firm" → neighborhood "Adams Point", sector "urban-systems firm"
    let sector = '';
    let neighborhood = '';
    // Try BIZ_DESCRIPTOR_KEYWORDS as sector anchor at end of leading clause.
    const leadingClause = descriptorClean.split(/,\s*/)[0].trim();
    const tokens = leadingClause.split(/\s+/);
    for (let i = tokens.length - 1; i >= 0; i--) {
      const tokLower = tokens[i].toLowerCase().replace(/[.,]$/, '');
      if (BIZ_DESCRIPTOR_KEYWORDS.includes(tokLower) || BIZ_KEYWORDS.includes(tokLower)) {
        sector = tokens.slice(i).join(' ');
        neighborhood = tokens.slice(0, i).join(' ');
        break;
      }
    }
    return {
      kind: 'biz',
      record: { name, sector, neighborhood, descriptor: descriptorClean },
    };
  }

  // kind === 'unknown' — return record marked unknown so caller can decide
  // whether to skip or fail loud.
  return {
    kind: 'unknown',
    record: { name, descriptor: descriptorClean },
  };
}

function parseCitizenUsageLog(sectionLines) {
  // Returns: { citizens: [...], businesses: [...], faithOrgs: [...],
  //   meta: { unclassifiedNewCanon: [...], newCanonSubsectionSeen: bool,
  //     bizMentionSeenInCul: bool } }
  // Two-pass: gather raw rows, then unify dedupe across popId / bare-name keys
  // (Gloria Hutchins appears once with POP-00727 + role and once bare under
  // LETTERS WRITERS — second pass merges by name).
  const businesses = [];
  const faithOrgs = [];
  const rawCitizens = []; // collected first, then deduped/merged
  const unclassifiedNewCanon = []; // S229: NEW CANON rows that classified 'unknown'
  let newCanonSubsectionSeen = false;
  let bizMentionSeenInCul = false;

  if (!sectionLines || sectionLines.length === 0) {
    return {
      citizens: [], businesses, faithOrgs,
      meta: { unclassifiedNewCanon, newCanonSubsectionSeen, bizMentionSeenInCul },
    };
  }

  const seenOrgKey = new Set();

  function pushOrg(kind, record) {
    const key = (record.name || '').toLowerCase();
    if (seenOrgKey.has(key)) return;
    seenOrgKey.add(key);
    if (kind === 'faith') faithOrgs.push(record);
    else if (kind === 'biz') businesses.push(record);
    // 'committee' kind: track-only, neither emitted; members listed underneath
    // surface as individual citizens.
  }

  // S229 engine.24: track BIZ- mentions across full CUL for fail-loud check.
  for (const raw of sectionLines) {
    if (/\bbiz-(?:pending|\d+|new)\b/i.test(raw)) {
      bizMentionSeenInCul = true;
      break;
    }
  }

  // S229 engine.24: state machine — when we see a standalone
  // `(NEW CANON THIS CYCLE)` subsection header (i.e. tag-only, no preceding
  // org name), enter newCanonListMode and classify subsequent rows per-line
  // until the next subsection header.
  let newCanonListMode = false;

  for (let i = 0; i < sectionLines.length; i++) {
    const raw = sectionLines[i];
    const line = raw.trim();
    if (!line) continue;
    if (/^[=\-─━_]+$/.test(line)) continue;

    // Subsection header: line that doesn't start with `-` or `*`, has letters,
    // and isn't a content row. We match either ALL-CAPS or Title Case headers
    // optionally followed by a parenthetical tag.
    if (!/^[-*]/.test(line)) {
      // Any non-bullet line exits NEW_CANON_LIST mode.
      newCanonListMode = false;

      // Strip parenthetical tags like "(NEW CANON THIS CYCLE)" or
      // "(NEW CANON — substituted for ...)"
      const tagMatch = line.match(/\(([^)]*)\)\s*$/);
      const tagText = tagMatch ? tagMatch[1] : '';
      const headerText = (tagMatch ? line.slice(0, line.length - tagMatch[0].length) : line).trim();

      const isNewCanon = /new\s+canon/i.test(tagText);
      const matchesIndividualPattern = INDIVIDUAL_SUBSECTION_PATTERNS.some(re => re.test(headerText));

      // S229 engine.24 Contract B fix: standalone `(NEW CANON THIS CYCLE)`
      // header (no preceding org name) means subsequent bullet rows must be
      // classified per-line. Previously fell through to "individuals only" —
      // the C94 silent-drop root cause.
      if (isNewCanon && !headerText) {
        newCanonListMode = true;
        newCanonSubsectionSeen = true;
        continue;
      }

      if (isNewCanon && !matchesIndividualPattern && headerText) {
        // Pre-S229 path: subsection header IS the org name (C93 Civis Systems
        // pattern). Classify by header text.
        const kind = classifyOrgSubsection(headerText);
        // Convert ALL-CAPS to Title Case for storage; keep already-mixed-case as-is.
        const orgName = headerText === headerText.toUpperCase()
          ? toTitleCase(headerText)
          : headerText;
        pushOrg(kind, { name: orgName });
        continue;
      }
      // Plain header (CIVIC / GOVERNMENT, CITIZENS QUOTED OR PROFILED, etc.) —
      // descriptive only; rows beneath are individuals.
      continue;
    }

    // Content row starting with `-`. Strip the bullet.
    const stripped = line.replace(/^[-*]\s*/, '').trim();
    if (!stripped) continue;

    // S229 engine.24: in NEW_CANON_LIST mode, per-line classification.
    if (newCanonListMode) {
      const parsed = parseNewCanonRow(stripped);
      if (!parsed) continue;
      if (parsed.kind === 'citizen') {
        rawCitizens.push(parsed.record);
      } else if (parsed.kind === 'biz') {
        pushOrg('biz', parsed.record);
      } else if (parsed.kind === 'faith') {
        pushOrg('faith', parsed.record);
      } else {
        // unknown — track for fail-loud diagnostic
        unclassifiedNewCanon.push({ line: stripped, name: parsed.record.name });
      }
      continue;
    }

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

  return {
    citizens, businesses, faithOrgs,
    meta: { unclassifiedNewCanon, newCanonSubsectionSeen, bizMentionSeenInCul },
  };
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
// S229 engine.24: separator switched from 60-equals to 60-hyphens. Matches
// canonical [[docs/media/EDITION_FORMAT_TEMPLATE]] (lines 7, 27, 41, etc.)
// and the downstream consumer terminator pattern `^-{10,}$` used in
// ingestPublishedEntities.js + verifyNamesIndexParse.js findSection helpers.
const SEPARATOR = '------------------------------------------------------------';
const FORBIDDEN_SEPARATOR_REGEX = /^={5,}$/;

function emitNamesIndex(parsed) {
  // S229 engine.24: flat strict pipe-format (no leading `- ` bullet) matching
  // canonical exemplar. Mixed-shape allowed per template line 109-117:
  //   POP-NNNNN | Full Name | Role
  //   FAITH-NEW | Name | Faith Org | Neighborhood
  //   Name — Role  (freeform fallback, pre-T1)
  const out = [];
  out.push(SEPARATOR);
  out.push('');
  out.push('NAMES INDEX');
  out.push(SEPARATOR);
  out.push('');
  for (const c of parsed.citizens) {
    if (c.popId) {
      out.push(c.popId + ' | ' + c.fullName + ' | ' + (c.role || ''));
    } else {
      // Pre-T1 freeform fallback — ingester promotes to POP-pending row.
      // Em-dash separator per template line 115 + ingest parser line 173.
      out.push(c.fullName + (c.role ? ' — ' + c.role : ''));
    }
  }
  for (const f of parsed.faithOrgs) {
    const nbhd = (f.neighborhood || '').trim();
    out.push('FAITH-NEW | ' + f.name + ' | Faith Org | ' + nbhd);
  }
  return out;
}

function emitBusinessesNamed(parsed) {
  // S229 engine.24: flat strict pipe-format matching template line 125-126:
  //   BIZ-NNNNN | Name | Sector | Neighborhood
  //   NEW | Name | Sector | Neighborhood
  const out = [];
  out.push(SEPARATOR);
  out.push('');
  out.push('BUSINESSES NAMED');
  out.push(SEPARATOR);
  out.push('');
  if (parsed.businesses.length === 0) {
    out.push('(no new businesses this cycle)');
  } else {
    for (const b of parsed.businesses) {
      const sector = (b.sector || '').trim();
      const nbhd = (b.neighborhood || '').trim();
      out.push('NEW | ' + b.name + ' | ' + sector + ' | ' + nbhd);
    }
  }
  return out;
}

// S229 engine.24 Contract B fail-loud preflight checks. Returns array of
// diagnostic strings — empty array means clean, non-empty means caller
// must abort with non-zero exit.
function preflightContractB(parsed) {
  const diagnostics = [];
  const { meta } = parsed;

  // (i) CUL mentions BIZ- but zero biz extracted → silent-drop pattern
  if (meta.bizMentionSeenInCul && parsed.businesses.length === 0) {
    diagnostics.push(
      'Contract B violation: CUL contains `BIZ-` mention (BIZ-pending or BIZ-NNNNN) ' +
      'but 0 businesses extracted. Silent-drop of canon-bearing biz content. ' +
      'Check (NEW CANON THIS CYCLE) subsection parsing or CUL biz markers.'
    );
  }

  // (ii) Standalone (NEW CANON THIS CYCLE) seen but no classification fired
  if (meta.newCanonSubsectionSeen &&
      parsed.businesses.length === 0 &&
      parsed.faithOrgs.length === 0 &&
      meta.unclassifiedNewCanon.length === 0) {
    diagnostics.push(
      'Contract B violation: standalone (NEW CANON THIS CYCLE) subsection present ' +
      'but yielded 0 biz / 0 faith / 0 unclassified rows. Subsection parsing ' +
      'broken or CUL subsection is empty.'
    );
  }

  // (iii) Surface unclassified NEW CANON rows as WARNINGS (not fatal — caller
  // decides whether to escalate). Author should add a classification marker
  // (BIZ-pending / confirmed canon / citizen) to the row.
  if (meta.unclassifiedNewCanon.length > 0) {
    for (const u of meta.unclassifiedNewCanon) {
      diagnostics.push(
        'Contract B warning: (NEW CANON THIS CYCLE) row unclassified (no faith / ' +
        'biz / citizen marker in descriptor): "' + u.line + '"'
      );
    }
  }

  return diagnostics;
}

// S229 engine.24 Contract B pre-write assertion. Scans emit blocks for
// forbidden `===` separator lines. Throws if any present. Defense against
// future regressions where someone re-introduces SEPARATOR = '======...'.
function assertNoForbiddenSeparator(blocks) {
  for (const block of blocks) {
    for (let i = 0; i < block.length; i++) {
      if (FORBIDDEN_SEPARATOR_REGEX.test(block[i].trim())) {
        throw new Error(
          'Pre-write assertion: forbidden `===` separator in emit output line ' +
          (i + 1) + ' of block — would corrupt downstream `^-{10,}$` parser. ' +
          'Output snippet: "' + block[i] + '"'
        );
      }
    }
  }
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
  //     mark the range from its preceding separator (if adjacent) through
  //     the next separator or the next footer header for removal.
  //  3. Remove existing blocks.
  //  4. Insert the new namesBlock + bizBlock before the separator that
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
    // Walk back to include the preceding separator and any blank line.
    // S229 engine.24: separator regex broadened — accept legacy `={5,}` AND
    // new `-{5,}` so re-runs against pre-S229-emitted editions cleanly
    // replace the old `===`-bracketed blocks too.
    let start = idx;
    while (start > 0 && working[start - 1].trim() === '') start--;
    if (start > 0 && /^[=\-]{5,}$/.test(working[start - 1].trim())) start--;
    while (start > 0 && working[start - 1].trim() === '') start--;
    // Walk forward to the next footer header or separator line.
    let end = idx + 1;
    // Skip the immediate post-header separator + blank lines so we don't
    // mistake them for a section terminator (legacy `===` shape AND new
    // `---` post-header shape).
    while (end < working.length && working[end].trim() === '') end++;
    if (end < working.length && /^[=\-]{5,}$/.test(working[end].trim())) end++;
    while (end < working.length) {
      const t = working[end].trim();
      if (FOOTER_HEADERS.includes(t) && t !== headerName) break;
      if (/^[=\-]{5,}$/.test(t)) {
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
  // Walk back to the separator that precedes it (legacy `===` or new `---`).
  let insertAt = atIdx;
  while (insertAt > 0 && working[insertAt - 1].trim() === '') insertAt--;
  if (insertAt > 0 && /^[=\-]{5,}$/.test(working[insertAt - 1].trim())) {
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
  parseNewCanonRow,
  classifyOrgSubsection,
  classifyNewCanonRow,
  findSectionRange,
  emitNamesIndex,
  emitBusinessesNamed,
  preflightContractB,
  assertNoForbiddenSeparator,
  FOOTER_HEADERS,
  SEPARATOR,
  FORBIDDEN_SEPARATOR_REGEX,
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
if (parsed.meta.newCanonSubsectionSeen) {
  console.log('  (NEW CANON THIS CYCLE) subsection: present');
}
if (parsed.meta.bizMentionSeenInCul) {
  console.log('  CUL BIZ- mention seen: yes');
}

if (parsed.citizens.length === 0 && parsed.businesses.length === 0 && parsed.faithOrgs.length === 0) {
  console.error('[ERROR] CITIZEN USAGE LOG present but parser extracted 0 entities.');
  process.exit(1);
}

// S229 engine.24 Contract B preflight — fail loud on silent-drop patterns.
const diagnostics = preflightContractB(parsed);
const fatalDiagnostics = diagnostics.filter(d => d.startsWith('Contract B violation'));
const warningDiagnostics = diagnostics.filter(d => d.startsWith('Contract B warning'));

if (warningDiagnostics.length > 0) {
  for (const w of warningDiagnostics) {
    console.error('[WARN] ' + w);
  }
}
if (fatalDiagnostics.length > 0) {
  console.error('');
  console.error('[FAIL] Contract B violations — refusing to emit.');
  for (const d of fatalDiagnostics) {
    console.error('  - ' + d);
  }
  console.error('');
  console.error('  Fix the CITIZEN USAGE LOG (NEW CANON THIS CYCLE) subsection so each ');
  console.error('  row carries a classification marker:');
  console.error('    Citizen:  "- Name — citizen, neighborhood occupation (POP-pending)"');
  console.error('    Business: "- Name — neighborhood sector (BIZ-pending, ...)"');
  console.error('    Faith:    "- Name — confirmed canon, neighborhood, <tradition> tradition, ..."');
  console.error('  Then re-run.');
  process.exit(1);
}

const namesBlock = emitNamesIndex(parsed);
const bizBlock = emitBusinessesNamed(parsed);

// S229 engine.24 Contract B pre-write assertion — defense against future
// regressions where someone re-introduces `===` separators.
try {
  assertNoForbiddenSeparator([namesBlock, bizBlock]);
} catch (e) {
  console.error('[FAIL] ' + e.message);
  process.exit(1);
}

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
  console.log('[INJECTED] NAMES INDEX (' + parsed.citizens.length + ' citizens + '
    + parsed.faithOrgs.length + ' faith) + BUSINESSES NAMED (' + parsed.businesses.length + ' biz)');
  console.log('  Written: ' + fullPath);
  process.exit(0);
} catch (e) {
  console.error('[ERROR] Inject failed: ' + e.message);
  process.exit(1);
}
} // end cli()
