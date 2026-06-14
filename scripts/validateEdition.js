#!/usr/bin/env node

/**
 * validateEdition.js — Programmatic Data Validation Gate
 * Version: 2.0
 *
 * Runs BEFORE Rhea Morgan verification. Zero LLM tokens.
 * Catches data errors that broke Editions 82 and 87: wrong positions,
 * wrong first names, swapped votes, wrong mayor name, real-name leaks,
 * engine language, phantom citizens, wrong initiative data.
 *
 * v2.0: Live sheet checks (Simulation_Ledger, Initiative_Tracker, Civic_Office_Ledger).
 *       Use --no-sheets to skip sheet checks (offline mode).
 *
 * Usage:
 *   node scripts/validateEdition.js <edition-file>
 *   node scripts/validateEdition.js editions/cycle_pulse_edition_87.txt
 *   node scripts/validateEdition.js editions/cycle_pulse_edition_87.txt --no-sheets
 *
 * Exit codes:
 *   0 = CLEAN (no critical issues)
 *   1 = CRITICAL issues found
 *   2 = File/data errors (missing files, parse failures)
 */

require('/root/GodWorld/lib/env');
const fs = require('fs');
const path = require('path');

// ─── Config ─────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const BASE_CONTEXT = path.join(ROOT, 'output/desk-packets/base_context.json');
const TRUESOURCE = path.join(ROOT, 'output/desk-packets/truesource_reference.json');
const BLOCKLIST = path.join(ROOT, 'docs/media/REAL_NAMES_BLOCKLIST.md');
const NO_SHEETS = process.argv.includes('--no-sheets');

// ─── Severity levels ────────────────────────────────────────────
const CRITICAL = 'CRITICAL';
const WARNING = 'WARNING';
const NOTE = 'NOTE';

// ─── Engine language patterns ───────────────────────────────────
// Each entry: { pattern, exclude (optional regex that makes the match OK) }
const ENGINE_TERMS = [
  // Direct engine words.
  // S197 BUNDLE-C — removed cycle-related patterns. Per
  // .claude/rules/newsroom.md: "The word 'cycle' is allowed and encouraged
  // in edition text, headlines, and letters as the canonical time unit (S146
  // reversal — was forbidden, was: 'use natural time references')." The four
  // patterns here ('cycle \d+', 'this cycle', 'next cycle', 'single-cycle')
  // were stale relative to that rule and produced 70 of 77 critical findings
  // on E93 — every one a false positive. Numbered cycle references (Cycle 93,
  // Cycle 95) and relative cycle references (this cycle, next cycle) are
  // canonical reporter language, not engine leakage.
  { pattern: /\btension score\b/gi },
  { pattern: /\bseverity level\b/gi },
  { pattern: /\bhigh-severity\b/gi },
  { pattern: /\bcivic load\b/gi },
  { pattern: /\barc strength\b/gi },
  { pattern: /\bevent count\b/gi },
  { pattern: /\bretail load[:\s]/gi },
  { pattern: /\bnightlife volume[:\s]/gi },
  { pattern: /\beconomic influence[:\s]/gi },
  // Compound engine labels (camelCase/no-space)
  { pattern: /\bSummerFestival\b/g },
  { pattern: /\bFirstFriday\b/g },
  { pattern: /\bCreationDay\b/g },
  // System language — with exclusions for legitimate uses
  // "the engine" is OK as a sports metaphor ("engine of the offense")
  // "Ledger" used to be flagged here as engine-language, but it's overloaded
  //   with metaphor use in journalism prose ("on the ledger", "ledger entry",
  //   "an 8-0 ledger entry") AND Carmen Delaine's byline is "Bay Tribune
  //   Civic Ledger". The actual engine-leak risk vocabulary is unique to
  //   the simulation: "tension score / civic load / severity level / cycle
  //   weight / raw decimals / story seed / phase NN" — those are caught
  //   above and are not overloaded. Dropping "ledger" closes G-W51
  //   (S231 pipeline.28) — pre-fix flagged 2 CRITICAL on natural metaphor
  //   use in C94 (Editor's Desk + P Slayer columns) and would have
  //   blocked publish if not manually rephrased.
  { pattern: /\bsimulation\b/gi },
  { pattern: /\bphase \d+/gi },
  { pattern: /\bmedia intake\b/gi },
  { pattern: /\bstory seed\b/gi },
  // Edition number references — S233 governance.15 carve-out
  // ALLOWED in editorial chrome: "See also: Edition N", byline citations
  // ("Bay Tribune Sports, Edition N"), sidebars, footers. The masthead
  // already exposes the cycle/edition number; cross-references are normal
  // newspaper convention. FORBIDDEN in body prose voice + citizen quotes
  // (characters don't read mastheads). Per .claude/rules/newsroom.md
  // §Standing rules. Exclude regex matches the legitimate chrome
  // surroundings; body-prose hits still fire CRITICAL.
  { pattern: /\bEdition\s+\d+/g, exclude: /(?:See also[:\s]|Bay Tribune[^|]*,\s*Edition|—\s*Bay Tribune|Editor['']s note|Sidebar|Footer)/i },
  // ─── G-W6/W7 (ES-1, S256) — data/reporting-layer narration ────────────
  // The engine leaking onto the page as if the CITY runs a data office /
  // reporting cycle / logs errors. Distinct from "cycle" (canonical time
  // unit, allowed): these narrate the simulation's measurement apparatus as
  // in-world fact. Severity calibrated against the 38-edition corpus before
  // CRITICAL. "reporting cycle" carries a real-prose collision risk (quarterly
  // reporting cycle) — excluded when adjacent to fiscal/quarterly framing.
  { pattern: /\breporting cycle\b/gi, exclude: /(?:quarterly|fiscal|annual|earnings|budget)/i },
  { pattern: /\bdata office\b/gi },
  { pattern: /\blogged (?:an?\s+)?error\b/gi },
  { pattern: /\bthe fields (?:that )?the city (?:monitors|tracks|logs|watches)\b/gi },
  { pattern: /\bthe city(?:'s)? (?:data|reporting) (?:office|layer|system|cycle)\b/gi },
];

// Defensive award terms that conflict with DH
const DEFENSIVE_TERMS = [
  /gold glove/gi,
  /defensive highlight/gi,
  /fielding gem/gi,
  /diving catch/gi,
  /web gem/gi,
  /defensive play of/gi,
];

// ─── Helpers ────────────────────────────────────────────────────

// S197 BUNDLE-C — Severity tier for last-name mismatch checks.
// Three signals decide tier:
//   1. Does the official/player's full name (expectedFirst LastName) appear
//      in the text? If no → WARNING (likely a different person sharing the
//      last name — Maria Reyes the citizen, Caleb Reyes the public defender).
//   2. If yes, does the foundFirst+LastName combination occur multiple times?
//      If yes → WARNING (recurring "Marcus Carter" reads like a real
//      character, not a one-off typo of "Denise Carter").
//   3. Single occurrence with the canonical name also present → CRITICAL
//      (the typical typo signature: Wayne Ashford appearing once where
//      Warren Ashford should be, while Warren Ashford is also referenced).
function severityForLastNameMismatch(editionText, expectedFirst, expectedLast,
                                      foundFirst) {
  const escFirst = expectedFirst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escLast = expectedLast.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fullNameRe = new RegExp(`\\b${escFirst}\\s+${escLast}\\b`);
  if (!fullNameRe.test(editionText)) return WARNING;

  // Full name is present. Count foundFirst+LastName occurrences.
  if (foundFirst) {
    const escFound = foundFirst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const foundCombo = new RegExp(`\\b${escFound}\\s+${escLast}\\b`, 'g');
    const matches = editionText.match(foundCombo) || [];
    if (matches.length >= 2) return WARNING;
  }
  return CRITICAL;
}

// G-W64 (S246 ES-8) — shared skip-list for the surname-mismatch checks
// (council / player / civic-office). Previously three identical inline copies.
// A capitalized token preceding a known surname is only a name-typo signal when
// it could plausibly BE a first name. Sentence prepositions / articles /
// conjunctions / titles that appear capitalized in headlines ("Vega Flips Yes
// On Renewal" → "As Vega", "On Vega") are NOT typos — the C95 false-positive
// "As Vega" (preposition) flagged as a typo of Ramon Vega. Expanded with the
// preposition/article/conjunction set so headline fragments stop false-firing.
const SKIP_FIRST_WORDS = new Set([
  // sentence connectors / subordinators (original set)
  'The', 'And', 'But', 'For', 'With', 'From', 'About', 'When', 'While',
  'After', 'Before', 'Since', 'Until', 'Where', 'That', 'This', 'These', 'Those',
  'If', 'Or', 'Even', 'Not', 'Just', 'Only', 'Both', 'Each', 'Every',
  'Either', 'Neither', 'Whether', 'Although', 'Said',
  // titles / honorifics / role words (original set, union of all three checks)
  'Councilmember', 'Councilwoman', 'Councilman', 'Council', 'Member',
  'Representative', 'Commissioner', 'Senator', 'Governor', 'Mayor', 'Judge',
  'Officer', 'Deputy', 'Chief', 'Director', 'Mr', 'Mrs', 'Ms', 'Dr',
  'Former', 'Current', 'Incoming', 'Outgoing', 'Late', 'Dear',
  // G-W64 additions — prepositions / articles / conjunctions / headline leads
  // (never real first names; appear capitalized in title-case headlines)
  'As', 'At', 'By', 'In', 'Of', 'On', 'Up', 'An', 'A', 'To',
  'Nor', 'So', 'Yet', 'Via', 'Per', 'Amid', 'Into', 'Onto', 'Over', 'Under',
  'Toward', 'Towards', 'Despite', 'Across', 'Among', 'Atop', 'Unto', 'Vs',
  'Than', 'Then', 'Thus', 'Here', 'There', 'Now', 'Today', 'Against', 'Amongst',
  // baseball / role position words (from the player-name check) — never first
  // names, harmless across all three checks
  'Manager', 'Coach', 'Pitcher', 'Catcher', 'Shortstop', 'Outfielder', 'Baseman',
  'Rookie', 'Veteran', 'Like',
]);

// G-W64 — extract the full "First Last(-Last)?" name token starting at a match
// index, tolerating compound/hyphenated/accented surnames (Tran-Muñoz,
// Chen-Ramirez). Used to test whether a surname-share match is actually a
// distinct canonical citizen rather than a typo.
function extractFullNameAt(text, index) {
  const slice = text.slice(index);
  const m = slice.match(/^([A-ZÀ-Þ][a-zà-ÿ'’.]+(?:\s+[A-ZÀ-Þ][a-zà-ÿ'’.]+(?:[-][A-ZÀ-Þ][a-zà-ÿ'’.]+)*)+)/u);
  return m ? m[1] : null;
}

function normalizeName(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// G-W64 — true when the found full name at this match position is itself a
// known canonical person (citizen / official / player / council). A surname
// shared between two DISTINCT canonical people (Vanessa Tran-Muñoz vs Leonard
// Tran) is not a typo of either — skip it. A genuine typo (Wayne Ashford where
// Warren Ashford belongs) is NOT in the canonical set, so it still flags.
function isDistinctCanonicalName(editionText, matchIndex, knownCanonicalFullNames) {
  if (!knownCanonicalFullNames || knownCanonicalFullNames.size === 0) return false;
  const token = extractFullNameAt(editionText, matchIndex);
  if (!token) return false;
  return knownCanonicalFullNames.has(normalizeName(token));
}

function loadJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function loadBlocklist(filepath) {
  try {
    const text = fs.readFileSync(filepath, 'utf-8');
    const names = [];
    // Parse names after "- " bullets in the blocklist
    for (const line of text.split('\n')) {
      const match = line.match(/^-\s+(.+?)(?:\s*\(.*\))?$/);
      if (match) {
        const name = match[1].trim();
        if (name && !name.startsWith('(') && name.includes(' ')) {
          names.push(name);
        }
      }
    }
    return [...new Set(names)]; // dedupe
  } catch (e) {
    return [];
  }
}

// ─── Validation Checks ─────────────────────────────────────────

function checkCouncilNames(editionText, canon, knownCanonicalFullNames) {
  const issues = [];
  if (!canon || !canon.council) return issues;

  const councilNames = canon.council.map(c => ({
    name: c.member || c.name,
    district: c.district,
    faction: c.faction,
    status: c.status
  }));

  // Build lookup maps
  const lastNameToMember = {};
  for (const m of councilNames) {
    const parts = m.name.split(' ');
    const lastName = parts[parts.length - 1];
    lastNameToMember[lastName.toLowerCase()] = m;
  }

  // Check for wrong first names (the Ashford/Mobley swap pattern)
  // S231 pipeline.28 G-W53 dedup: collect by (memberLast, foundFirst) and
  // emit once per unique pair with occurrenceCount + sample contexts.
  // Pre-fix the same warning fired N times for N occurrences (e.g.,
  // "Daniel Han ↔ Victor Han" fired 5× in C94 for 5 mentions of
  // Daniel Han); validator output got noisy without adding signal.
  const councilCollisions = new Map(); // key → { severity, member, foundFirst, occurrenceCount, samples }
  for (const [, member] of Object.entries(lastNameToMember)) {
    // Look for "FirstName LastName" where LastName is a council member
    const pattern = new RegExp(`\\b([A-Z][a-z]+)\\s+${member.name.split(' ').pop()}\\b`, 'g');
    let match;
    while ((match = pattern.exec(editionText)) !== null) {
      const foundFirst = match[1];
      const expectedFirst = member.name.split(' ')[0];
      if (foundFirst === expectedFirst) continue;
      if (SKIP_FIRST_WORDS.has(foundFirst)) continue;
      // G-W64 — skip if the matched full name is itself a distinct canonical
      // person (e.g. "Vanessa Tran-Muñoz" sharing surname "Tran" with Leonard
      // Tran). A real typo's full name is NOT canonical, so it still flags.
      if (isDistinctCanonicalName(editionText, match.index, knownCanonicalFullNames)) continue;
      const memberLast = member.name.split(' ').pop();
      const memberFirst = member.name.split(' ')[0];
      const sev = severityForLastNameMismatch(editionText, memberFirst, memberLast, foundFirst);
      const key = `${memberLast}|${foundFirst}|${sev}`;
      const sampleContext = editionText.slice(
        Math.max(0, match.index - 30),
        Math.min(editionText.length, match.index + match[0].length + 30)
      ).replace(/\s+/g, ' ').trim();
      const existing = councilCollisions.get(key);
      if (existing) {
        existing.occurrenceCount++;
        if (existing.samples.length < 3) existing.samples.push(sampleContext);
      } else {
        councilCollisions.set(key, {
          severity: sev,
          member,
          memberLast,
          foundFirst,
          occurrenceCount: 1,
          samples: [sampleContext],
        });
      }
    }
  }
  // Flush deduped collisions to issues.
  for (const c of councilCollisions.values()) {
    const occNote = c.occurrenceCount > 1
      ? ` (${c.occurrenceCount}× in edition; sample: "${c.samples.slice(0, 2).join('" / "')}")`
      : '';
    issues.push({
      severity: c.severity,
      check: 'Council Name',
      detail: (c.severity === CRITICAL
        ? `Found "${c.foundFirst} ${c.memberLast}"${occNote} — should be "${c.member.name}" (${c.member.district}, ${c.member.faction})`
        : `Found "${c.foundFirst} ${c.memberLast}"${occNote} — shares last name with "${c.member.name}" (${c.member.district}, ${c.member.faction}); council member's full name not in text — verify this is a different person`),
      fix: (c.severity === CRITICAL
        ? `Replace "${c.foundFirst} ${c.memberLast}" → "${c.member.name}"`
        : `Verify "${c.foundFirst} ${c.memberLast}" is not a typo of council member "${c.member.name}"`)
    });
  }

  // Check for wrong district assignments
  for (const member of councilNames) {
    // Pattern: "MemberName (D[X])" or "MemberName, D[X]" or "District X"
    const distPattern = new RegExp(`${member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]*?\\b(D\\d)\\b`, 'g');
    let match;
    while ((match = distPattern.exec(editionText)) !== null) {
      if (match[1] !== member.district) {
        issues.push({
          severity: CRITICAL,
          check: 'Council District',
          detail: `${member.name} assigned to ${match[1]} — should be ${member.district}`,
          fix: `Replace "${match[1]}" → "${member.district}" near "${member.name}"`
        });
      }
    }
  }

  // Check for wrong faction assignments
  for (const member of councilNames) {
    const factionPattern = new RegExp(
      `${member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.]*?\\b(OPP|CRC|IND)\\b`, 'g'
    );
    let match;
    while ((match = factionPattern.exec(editionText)) !== null) {
      if (match[1] !== member.faction) {
        issues.push({
          severity: CRITICAL,
          check: 'Council Faction',
          detail: `${member.name} labeled as ${match[1]} — should be ${member.faction}`,
          fix: `Replace "${match[1]}" → "${member.faction}" near "${member.name}"`
        });
      }
    }
  }

  return issues;
}

function checkVoteMath(editionText) {
  const issues = [];

  // Pattern: "Passed X-Y" or "Failed X-Y" or "voted X to Y" or "X-Y vote"
  const votePatterns = [
    /(?:passed|approved|rejected|failed|defeated)\s+(\d+)-(\d+)/gi,
    /(\d+)-(\d+)\s+vote/gi,
    /voted\s+(\d+)\s+(?:to|against)\s+(\d+)/gi,
  ];

  for (const pattern of votePatterns) {
    let match;
    while ((match = pattern.exec(editionText)) !== null) {
      const yes = parseInt(match[1]);
      const no = parseInt(match[2]);
      const total = yes + no;

      // Council has 9 members. Total should be <= 9.
      if (total > 9) {
        issues.push({
          severity: CRITICAL,
          check: 'Vote Math',
          detail: `Vote count ${yes}-${no} = ${total} total votes, but council has only 9 members`,
          fix: `Verify the vote count near "${match[0]}"`
        });
      }
      // Total < 7 would mean 3+ absences (unusual, flag as warning)
      if (total < 7 && total > 0) {
        issues.push({
          severity: NOTE,
          check: 'Vote Math',
          detail: `Vote count ${yes}-${no} = ${total} total, suggesting ${9 - total} absent council members — verify this is intentional`,
          fix: `Check if absences are explained near "${match[0]}"`
        });
      }
    }
  }

  return issues;
}

function checkVoteBreakdownConsistency(editionText, canon) {
  const issues = [];
  if (!canon) return issues;

  // Check recent outcomes for vote breakdown consistency
  const outcomes = [
    ...(canon.recentOutcomes || []),
    ...(canon.pendingVotes || [])
  ];

  for (const outcome of outcomes) {
    if (!outcome.voteBreakdown) continue;

    // Extract the canonical vote result
    const canonMatch = outcome.voteBreakdown.match(/(\d+)-(\d+)/);
    if (!canonMatch) continue;

    const canonYes = canonMatch[1];
    const canonNo = canonMatch[2];
    const initName = outcome.name;

    // Check if the edition mentions this initiative with a different vote count
    // Look for the initiative name near a vote count
    const escapedName = initName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nearbyPattern = new RegExp(
      `${escapedName}[\\s\\S]{0,500}?(?:passed|approved|voted|failed)\\s+(\\d+)-(\\d+)`,
      'gi'
    );

    let match;
    while ((match = nearbyPattern.exec(editionText)) !== null) {
      if (match[1] !== canonYes || match[2] !== canonNo) {
        issues.push({
          severity: CRITICAL,
          check: 'Vote Breakdown',
          detail: `"${initName}" shown as ${match[1]}-${match[2]} in edition, but canon says ${canonYes}-${canonNo}`,
          fix: `Replace "${match[1]}-${match[2]}" → "${canonYes}-${canonNo}" near "${initName}"`
        });
      }
    }
  }

  return issues;
}

// Position name mapping for natural language — hoisted so derivePositionCode
// can build its reverse-lookup once per process. Keys are canonical position
// codes (LF, P, SP, etc.); values are natural-language terms the code may
// appear as in journalism prose.
const POSITION_NAMES = {
  'P': ['pitcher', 'starting pitcher', 'reliever', 'closer', 'on the mound'],
  'SP': ['pitcher', 'starting pitcher', 'starter', 'on the mound'],
  'RP': ['reliever', 'relief pitcher', 'bullpen'],
  'CL': ['closer', 'closing pitcher'],
  'C': ['catcher', 'behind the plate'],
  '1B': ['first baseman', 'first base', 'at first'],
  '2B': ['second baseman', 'second base', 'at second'],
  '3B': ['third baseman', 'third base', 'at third', 'hot corner'],
  'SS': ['shortstop', 'short stop', 'at short'],
  'LF': ['left fielder', 'left field', 'in left'],
  'CF': ['center fielder', 'center field', 'in center'],
  'RF': ['right fielder', 'right field', 'in right'],
  'DH': ['designated hitter', 'DH'],
  'Manager': ['manager', 'skipper'],
};

// S231 pipeline.28 G-W52 fix: derive a canonical position code (LF, P, SP, etc.)
// from a free-form player.position string. Canon's roster carries strings like
// "Left Fielder, Las Vegas Aviators (AAA)" for AAA call-ups — pre-fix the
// code lookup keyed on this full string, returned undefined, and the
// skipPositions Set was empty, which made every wrong-position regex fire
// against natural prose for ANY AAA call-up using their actual position name
// ("JR Rosado, the left fielder..." flagged CRITICAL).
//
// Algorithm: scan the position string lower-cased for any term in POSITION_NAMES;
// first match wins, with longer terms preferred (so "starting pitcher" beats
// "pitcher"). Also accepts exact code matches at word boundaries ("1B", "DH").
// Canonical position-string indicators: canon roster strings carry verbose
// position descriptors ("Left Fielder, Las Vegas Aviators (AAA)" /
// "Starting Pitcher" / "Manager"). These map each specific indicator to its
// code. The wider POSITION_NAMES table is for equivalence checking in
// natural-prose attribution (P player called "pitcher" is OK), NOT for
// reverse-resolving canon strings. Kept separate so the two concerns
// don't contaminate each other (S231 pipeline.28 G-W52).
const CANON_POSITION_INDICATORS = [
  // Order: most-specific first. First match wins.
  ['starting pitcher', 'SP'],
  ['relief pitcher', 'RP'],
  ['closing pitcher', 'CL'],
  ['designated hitter', 'DH'],
  ['first baseman', '1B'],
  ['second baseman', '2B'],
  ['third baseman', '3B'],
  ['left fielder', 'LF'],
  ['center fielder', 'CF'],
  ['right fielder', 'RF'],
  ['shortstop', 'SS'],
  ['catcher', 'C'],
  ['manager', 'Manager'],
  ['closer', 'CL'],     // after "closing pitcher" so verbose form wins
  ['pitcher', 'P'],     // generic pitcher last
];

function derivePositionCode(positionString) {
  if (!positionString) return null;
  const lower = String(positionString).toLowerCase();
  // Pass 1: canonical indicator lookup.
  for (const [indicator, code] of CANON_POSITION_INDICATORS) {
    if (lower.includes(indicator)) return code;
  }
  // Pass 2: exact code at word boundary ("(LF)", "1B", "DH", "SS").
  const allCodes = Array.from(new Set(CANON_POSITION_INDICATORS.map(([, c]) => c)));
  for (const code of allCodes) {
    const re = new RegExp(`\\b${code.toLowerCase()}\\b`);
    if (re.test(lower)) return code;
  }
  return null;
}

function checkPlayerPositions(editionText, canon) {
  const issues = [];
  if (!canon) return issues;

  // Build roster lookup from truesource or base_context
  const roster = canon.asRoster || [];
  const positionMap = {};
  const dhPlayers = [];

  for (const player of roster) {
    const name = player.name;
    const rawPos = player.position || player.roleType;
    // Derive canonical code so the equivalence + skip logic below can key on
    // POSITION_NAMES entries even when canon carries a verbose position
    // string ("Left Fielder, Las Vegas Aviators (AAA)").
    const positionCode = derivePositionCode(rawPos) || rawPos;
    positionMap[name.toLowerCase()] = { name, position: positionCode, rawPosition: rawPos };
    if (positionCode === 'DH') dhPlayers.push(name);
  }

  const positionNames = POSITION_NAMES;

  // For each player, check if a WRONG position is DIRECTLY attributed
  // Use tight patterns that require direct attribution, not just proximity
  for (const info of Object.values(positionMap)) {
    const { name, position } = info;
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const lastName = name.split(' ').pop();
    const escapedLast = lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Position equivalences — positions whose terms are also valid for this player
    // P (generic pitcher) can be called any pitching term (SP, RP, CL)
    // SP/RP/CL can be called "pitcher" (from P)
    const equivalentPositions = {
      'P': ['SP', 'RP', 'CL'],   // generic pitcher — all pitching terms are valid
      'SP': ['P'],                 // starting pitcher is also a pitcher
      'RP': ['P'],                 // reliever is also a pitcher
      'CL': ['P', 'RP'],          // closer is also a pitcher and reliever
    };
    const skipPositions = new Set([position, ...(equivalentPositions[position] || [])]);

    // Get terms for the player's CORRECT position (to avoid flagging shared terms)
    const correctTerms = positionNames[position] || [];

    // Check all position terms that DON'T match this player's actual position
    for (const [posCode, terms] of Object.entries(positionNames)) {
      if (skipPositions.has(posCode)) continue; // skip correct + equivalent positions

      for (const term of terms) {
        // Skip terms that also appear in the correct position's vocabulary
        // e.g., "pitcher" is valid for both P and SP — don't flag SP's "pitcher" on a P player
        if (correctTerms.includes(term)) continue;
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Direct attribution patterns (tight coupling):
        // "[position] [Name]" or "[Name], the [position]" or "[Name] at [position]"
        // or "[Name] plays [position]" or "[Name], [position],"
        const directPatterns = [
          // "third baseman Mark Aitken" or "pitcher Benji Dillon"
          new RegExp(`\\b${escapedTerm}\\s+${escapedName}\\b`, 'gi'),
          // "Mark Aitken, the first baseman" or "Aitken, the first baseman"
          new RegExp(`${escapedName},?\\s+the\\s+${escapedTerm}\\b`, 'gi'),
          new RegExp(`${escapedLast},?\\s+the\\s+${escapedTerm}\\b`, 'gi'),
          // "Mark Aitken at first base" or "Aitken at first"
          new RegExp(`${escapedName},?\\s+at\\s+${escapedTerm}\\b`, 'gi'),
          // "Mark Aitken plays first base"
          new RegExp(`${escapedName}\\s+plays\\s+${escapedTerm}\\b`, 'gi'),
          // "Mark Aitken (1B)" or "Mark Aitken (DH)" — position code in parens
          ...(posCode.length <= 3 ? [new RegExp(`${escapedName}\\s*\\(${posCode}\\)`, 'gi')] : []),
        ];

        let found = false;
        for (const dp of directPatterns) {
          if (dp.test(editionText)) {
            const correctTerms = positionNames[position] || [position];
            issues.push({
              severity: CRITICAL,
              check: 'Player Position',
              detail: `${name} called "${term}" — should be "${correctTerms[0]}" (${position})`,
              fix: `Replace "${term}" → "${correctTerms[0]}" near "${name}"`
            });
            found = true;
            break;
          }
        }
        if (found) break; // one issue per player per wrong position category
      }
    }
  }

  // Check DH + defensive awards
  for (const dhName of dhPlayers) {
    const escapedDH = dhName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const defPattern of DEFENSIVE_TERMS) {
      // Check if defensive term appears near the DH player's name
      const nearPattern = new RegExp(
        `${escapedDH}[\\s\\S]{0,200}?${defPattern.source}|${defPattern.source}[\\s\\S]{0,200}?${escapedDH}`,
        'gi'
      );
      if (nearPattern.test(editionText)) {
        issues.push({
          severity: CRITICAL,
          check: 'DH + Defensive Award',
          detail: `${dhName} is a DH but edition mentions a defensive achievement near their name`,
          fix: `Remove defensive reference — DHs don't field`
        });
      }
    }
  }

  return issues;
}

function checkMayorName(editionText, canon) {
  const issues = [];
  if (!canon || !canon.executiveBranch) return issues;

  const canonMayor = canon.executiveBranch.mayor;
  if (!canonMayor) return issues;

  // S197 BUNDLE-C — exclude "Deputy Mayor X", "Vice Mayor X", "Acting Mayor X",
  // "Former Mayor X" prefixes. Pre-fix the regex matched "Mayor Brenda" inside
  // "Deputy Mayor Brenda Okoro" and flagged it as a wrong canonical mayor.
  // Negative lookbehind for the qualifier words.
  const mayorPattern = /(?<!Deputy\s)(?<!Vice\s)(?<!Acting\s)(?<!Former\s)\bMayor\s+([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*)/g;
  let match;
  while ((match = mayorPattern.exec(editionText)) !== null) {
    const foundName = match[1].trim();
    // Clean trailing punctuation
    const cleanName = foundName.replace(/[,.:;!?]+$/, '');
    if (cleanName && cleanName !== canonMayor && !canonMayor.includes(cleanName) && !cleanName.includes(canonMayor)) {
      // Check it's not a partial match (e.g., "Mayor Santana" vs "Avery Santana")
      const canonParts = canonMayor.split(' ');
      const foundParts = cleanName.split(' ');
      const isPartialMatch = foundParts.some(p => canonParts.includes(p));
      if (!isPartialMatch) {
        issues.push({
          severity: CRITICAL,
          check: 'Mayor Name',
          detail: `Found "Mayor ${cleanName}" — canonical mayor is "${canonMayor}"`,
          fix: `Replace "Mayor ${cleanName}" → "Mayor ${canonMayor}"`
        });
      }
    }
  }

  return issues;
}

function checkRealNames(editionText, blocklist) {
  const issues = [];
  if (!blocklist || blocklist.length === 0) return issues;

  // Note: Some blocklist names (Jrue Holiday, Ben Simmons) are intentional
  // video game imports in the Bulls roster. We flag but mark as NOTE
  // if they appear in a sports/player context.
  const intentionalImports = ['Jrue Holiday', 'Ben Simmons'];

  for (const name of blocklist) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedName}\\b`, 'gi');
    const matches = editionText.match(pattern);
    if (matches) {
      const isImport = intentionalImports.includes(name);
      // Check context — is it in a Names Index (OK for imports) or article text (bad)?
      const inArticleText = new RegExp(
        `(?:^|\\n)(?!Names Index:).*\\b${escapedName}\\b`,
        'gm'
      ).test(editionText);

      if (isImport && !inArticleText) {
        // Only in Names Index — probably just a roster listing, NOTE
        issues.push({
          severity: NOTE,
          check: 'Real-Name Screening',
          detail: `"${name}" (known real player) appears in Names Index — intentional video game import`,
          fix: `Verify this is an intentional import, not a citizen name`
        });
      } else {
        issues.push({
          severity: isImport ? WARNING : CRITICAL,
          check: 'Real-Name Screening',
          detail: `"${name}" is a real-world sports figure and appears in the edition text`,
          fix: isImport
            ? `Verify "${name}" appears only as a Bulls player, not as a citizen`
            : `Replace "${name}" with a fictional character name`
        });
      }
    }
  }

  return issues;
}

function checkEngineLanguage(editionText) {
  const issues = [];

  // Only check within article sections, not in metadata/tables at the bottom
  // Split at ARTICLE TABLE to isolate editorial content
  const articleTableSplit = editionText.split(/ARTICLE TABLE/i);
  const editorialContent = articleTableSplit[0] || editionText;

  for (const term of ENGINE_TERMS) {
    const { pattern, exclude } = term;
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(editorialContent)) !== null) {
      // Get surrounding context for exclusion check and display
      const contextStart = Math.max(0, match.index - 40);
      const contextEnd = Math.min(editorialContent.length, match.index + match[0].length + 40);
      const context = editorialContent.substring(contextStart, contextEnd).replace(/\n/g, ' ').trim();

      // Check exclusions — if the surrounding context matches an exclusion pattern, skip
      if (exclude && exclude.test(context)) continue;

      issues.push({
        severity: CRITICAL,
        check: 'Engine Language',
        detail: `Found "${match[0]}" — engine/system language in article text`,
        fix: `Replace or remove near: "...${context}..."`
      });
    }
  }

  return issues;
}

// ─── In-World Time + Engine-Metric Leak Scan (G-W-C97-2, ES-3 S257) ─────────
//
// Deterministic backstop for two recurring reporter leaks the operator kept
// catching by eye at Step 2 (C97: "November dusk", "first week of April",
// "September chase", "Retail sentiment sits above 0.71"):
//   1. Real calendar months in canon prose — the fence is cycles-not-months.
//   2. Raw engine metric decimals (sentiment/approval/etc.) in prose.
// WARNING severity — surfaces for review without blocking compile (CRITICAL is
// reserved for hard canon breaks; this matches the should-fix exit model).
// Scans editorial content only (split at ARTICLE TABLE), like checkEngineLanguage.

// Months that are NOT common given names → flag on any prose occurrence.
const MONTHS_UNAMBIGUOUS = ['January', 'February', 'July', 'September', 'October', 'November', 'December'];
// Months that ARE common given names → flag only in a temporal construction,
// never as a bare token (avoids false-positive on "April <Lastname>").
const MONTHS_NAMELIKE = ['March', 'April', 'May', 'June', 'August'];
// Metric words whose nearby decimals are engine telemetry (not sports/money).
const METRIC_WORDS = ['sentiment', 'approval', 'momentum', 'rating', 'index', 'load'];
// Temporal cues that precede a name-like month used as a date.
const TEMPORAL_CUE_BEFORE = /(?:\b(?:in|by|since|early|late|mid|this|last|next|through|until|before|after)\s+$)|(?:\b(?:week|weeks|month|end|start|beginning|middle|spring|summer|fall|autumn|winter)\s+of\s+$)/i;

function checkInWorldLeaks(editionText) {
  const issues = [];
  const editorial = editionText.split(/ARTICLE TABLE/i)[0] || editionText;

  const flagMonth = (m, index, asDate) => {
    const ctx = editorial.substring(Math.max(0, index - 40), index + m.length + 40).replace(/\n/g, ' ').trim();
    issues.push({
      severity: WARNING,
      check: 'In-World Time Leak',
      detail: `Calendar month "${m}"${asDate ? ' used as a date' : ''} in prose — canon uses cycles, not real months`,
      fix: `Recast as a cycle/season reference near: "...${ctx}..."`
    });
  };

  // 1a. Unambiguous months — any prose occurrence is a leak.
  for (const m of MONTHS_UNAMBIGUOUS) {
    const re = new RegExp('\\b' + m + '\\b', 'g');
    let match;
    while ((match = re.exec(editorial)) !== null) flagMonth(m, match.index, false);
  }

  // 1b. Name-like months — flag only when preceded by a temporal cue or
  //     followed by a day number/ordinal ("first week of April", "April 3rd").
  for (const m of MONTHS_NAMELIKE) {
    const re = new RegExp('\\b' + m + '\\b', 'g');
    let match;
    while ((match = re.exec(editorial)) !== null) {
      const before = editorial.substring(Math.max(0, match.index - 24), match.index);
      const after = editorial.substring(match.index + m.length, match.index + m.length + 6);
      if (TEMPORAL_CUE_BEFORE.test(before) || /^\s+\d{1,2}(?:st|nd|rd|th)?\b/.test(after)) {
        flagMonth(m, match.index, true);
      }
    }
  }

  // 2. Engine metric decimals — a decimal (with leading digit, so batting ".312"
  //    and sports integer scores are excluded) within ~30 chars of a metric word.
  const metricAlt = METRIC_WORDS.join('|');
  const decimalNearMetric = new RegExp(
    '(?:(?:' + metricAlt + ')[^.\\n]{0,30}?\\d+\\.\\d+)|(?:\\d+\\.\\d+[^.\\n]{0,30}?(?:' + metricAlt + '))',
    'gi'
  );
  let dm;
  while ((dm = decimalNearMetric.exec(editorial)) !== null) {
    issues.push({
      severity: WARNING,
      check: 'Engine Metric Leak',
      detail: `Raw engine decimal near a metric word — "${dm[0].replace(/\n/g, ' ').trim()}"`,
      fix: `Express as perception ("rising"/"strong"), not a raw score`
    });
  }

  return issues;
}

// ─── In-Body Metadata Leak Gate (pipeline.9, S249) ──────────────────────────
//
// The C92 contamination: desk reporters appended audit/tracking blocks
// (EVIDENCE, ARTICLE TABLE ENTRIES, CITIZEN USAGE LOG, FACTUAL ASSERTIONS,
// CONTINUITY NOTES, Names Index) INSIDE the article body. ingestEdition.js
// strips these at INGEST time (stripMetadataLeaks, S180) so the ledger stays
// clean — but the published .txt artifact itself (Drive / bay-tribune
// Supermemory / Mara / MCP search_canon source) is never run through that
// strip. This gate is the emission-time half: it asserts the strip would be a
// NO-OP on the compiled artifact, failing loud (CRITICAL) on any leak marker so
// the dirty .txt never ships. (S172 encoded the sections-after-body rule as
// format law; this is its structural enforcement.)
//
// SYNC: the two patterns below are kept in lockstep with
// scripts/ingestEdition.js stripMetadataLeaks() — same block-start forms. The
// canonical post-body sections (NAMES INDEX / BUSINESSES NAMED / CITIZEN USAGE
// LOG / ARTICLE TABLE, NO trailing colon) are deliberately NOT matched — those
// are legitimate trailers. The colon / `##` / bold scaffolding forms are
// illegal anywhere in a clean published artifact, which is what these catch.
function checkMetadataLeak(editionText) {
  const issues = [];
  const lines = editionText.split('\n');
  const blockStart = /^(##\s+(EVIDENCE|Names\s+Index)\s*$|ARTICLE TABLE ENTRIES:\s*$|CITIZEN USAGE LOG:\s*$|CONTINUITY NOTES:\s*$|FACTUAL ASSERTIONS:\s*$|\*\*\s*(ARTICLE TABLE ENTRIES|CITIZEN USAGE LOG|CONTINUITY NOTES|FACTUAL ASSERTIONS|NAMES INDEX|Names Index)\s*:?\s*\*\*\s*$)/;
  const inlineNamesIndex = /^Names Index:\s*\S/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let marker = null;
    if (blockStart.test(line)) marker = line.trim();
    else if (inlineNamesIndex.test(line)) marker = line.trim().slice(0, 60);
    if (!marker) continue;

    issues.push({
      severity: CRITICAL,
      check: 'Metadata Leak',
      detail: `Audit/tracking block leaked into article text at line ${i + 1}: "${marker}"`,
      fix: 'Desk emission leaked a metadata block into the prose (C92 pattern). Remove it — the canonical tracking sections (NAMES INDEX / CITIZEN USAGE LOG / BUSINESSES NAMED / ARTICLE TABLE) belong AFTER the body with no trailing colon, per EDITION_PIPELINE format law. ingestEdition.js would strip this at ingest; the published .txt must not carry it.'
    });
  }

  return issues;
}

// ─── ARTICLE TABLE Placement Consistency (S244 ES-1, G-W62) ──────────────
//
// The ARTICLE TABLE is the canonical machine-readable signal for what prints
// in each section — DJ's photo bundler, post-publish ingest, and the capability
// reviewer all read it. At C95 the table reflected the sift slate, not the
// compile-time layout reorder: it claimed OARI was the FRONT PAGE lede while the
// prose actually printed Okoro on the front page and OARI under CIVIC. Because
// bindCanonicalHeadlines binds positionally, the disagreement is silent — the
// rendered FRONT PAGE shows the OARI headline over the Okoro body.
//
// The forward fix is compile-side (regenerate the table from final placement,
// RB-2). This is the fail-loud guard: cross-check every canonical table row
// against where its headline physically prints (the `### ` lines per section).
// Only runs on canonical-shape editions — legacy vintages have no table contract.
function checkArticleTablePlacement(editionPath) {
  const issues = [];
  const editionParser = require('/root/GodWorld/lib/editionParser');

  let parsed;
  try {
    parsed = editionParser.parseEdition(editionPath);
  } catch (err) {
    issues.push({
      severity: CRITICAL,
      check: 'ARTICLE TABLE Placement',
      detail: `Parser threw binding the ARTICLE TABLE: ${err.message}`,
      fix: 'Edition violates the canonical ARTICLE TABLE contract (ADR-0006). Fix compile output before proceeding.'
    });
    return issues;
  }

  const at = parsed.articleTable;
  if (!at || !at.present || !at.canonicalShape) return issues; // no contract on legacy editions

  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

  // Where each printed ### headline physically lives (normalized section id).
  const headlineToSection = {};
  for (const sec of parsed.sections) {
    if (sec.beat === 'meta') continue;
    const key = editionParser.normalizeSectionId(sec.name);
    const hls = (sec.text.match(/^###\s+(.+)$/gm) || []).map((h) => norm(h.replace(/^###\s+/, '')));
    for (const h of hls) headlineToSection[h] = key;
  }

  for (const row of at.rows) {
    const claimed = editionParser.normalizeSectionId(row.section);
    // Letters carry summary tags, not ### headlines — same carve-out as the binder.
    if (claimed === 'LETTERS' || claimed === 'LETTERS TO THE EDITOR') continue;
    const h = norm(row.headline);
    if (!h) continue;

    const printedIn = headlineToSection[h];
    // Only the SWAP case is an unambiguous placement defect: the headline
    // appears as a printed ### line, but under a different section than the
    // table claims (C95 OARI↔Okoro). A headline that matches NO ### line is
    // NOT flagged — some edition vintages (e.g. C94) carry headlines only in
    // the ARTICLE TABLE and lead each article with a **bold** summary instead
    // of a ### line, so "prints nowhere" is the vintage's design, not drift.
    // Flagging it produced 8 false-positive CRITICALs on C94.
    if (printedIn !== undefined && printedIn !== claimed) {
      issues.push({
        severity: CRITICAL,
        check: 'ARTICLE TABLE Placement',
        detail: `ARTICLE TABLE assigns "${row.headline}" to ${row.section}, but it prints under ${printedIn}`,
        fix: 'Regenerate ARTICLE TABLE from final compile placement (G-W62). bindCanonicalHeadlines binds positionally, so this disagreement silently mislabels the rendered headline.'
      });
    }
  }

  return issues;
}

// ─── Player First Name Check (the Edition 87 gap) ──────────────

function checkPlayerFirstNames(editionText, canon, knownOfficialNames) {
  const issues = [];
  if (!canon) return issues;

  const roster = canon.asRoster || [];
  if (roster.length === 0) return issues;

  // Build last-name → full-name lookup (same pattern as checkCouncilNames)
  const lastNameToPlayer = {};
  for (const player of roster) {
    const name = player.name;
    if (!name || !name.includes(' ')) continue;
    const parts = name.split(' ');
    const lastName = parts[parts.length - 1];
    // Skip very short/common last names that cause false positives
    if (lastName.length < 3) continue;
    lastNameToPlayer[lastName.toLowerCase()] = { fullName: name, firstName: parts[0], lastName };
  }

  // Known civic official first names by last name — skip these (not players)
  const officialFirstsByLast = knownOfficialNames || {};

  // S231 pipeline.28 G-W53 dedup (player-name path — same as council path
  // above). Collect collisions into a Map keyed by (lastName, foundFirst, sev)
  // so 5× "Daniel Han ↔ Victor Han" emits ONE issue with occurrenceCount=5
  // + sample contexts, not 5 duplicate issues.
  const playerCollisions = new Map();
  for (const [lastNameLower, player] of Object.entries(lastNameToPlayer)) {
    const escapedLast = player.lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b([A-Z][a-z]+)\\s+${escapedLast}\\b`, 'g');
    let match;
    while ((match = pattern.exec(editionText)) !== null) {
      const foundFirst = match[1];
      if (foundFirst === player.firstName) continue;
      if (SKIP_FIRST_WORDS.has(foundFirst)) continue;
      const officialFirsts = officialFirstsByLast[lastNameLower] || [];
      if (officialFirsts.includes(foundFirst)) continue;
      const sev = severityForLastNameMismatch(editionText, player.firstName, player.lastName, foundFirst);
      const key = `${player.lastName}|${foundFirst}|${sev}`;
      const sampleContext = editionText.slice(
        Math.max(0, match.index - 30),
        Math.min(editionText.length, match.index + match[0].length + 30)
      ).replace(/\s+/g, ' ').trim();
      const existing = playerCollisions.get(key);
      if (existing) {
        existing.occurrenceCount++;
        if (existing.samples.length < 3) existing.samples.push(sampleContext);
      } else {
        playerCollisions.set(key, {
          severity: sev,
          player,
          foundFirst,
          occurrenceCount: 1,
          samples: [sampleContext],
        });
      }
    }
  }
  for (const c of playerCollisions.values()) {
    const occNote = c.occurrenceCount > 1
      ? ` (${c.occurrenceCount}× in edition; sample: "${c.samples.slice(0, 2).join('" / "')}")`
      : '';
    issues.push({
      severity: c.severity,
      check: 'Player Name',
      detail: (c.severity === CRITICAL
        ? `Found "${c.foundFirst} ${c.player.lastName}"${occNote} — roster says "${c.player.fullName}"`
        : `Found "${c.foundFirst} ${c.player.lastName}"${occNote} — shares last name with roster player "${c.player.fullName}"; player's full name not in text — verify this is a different person`),
      fix: (c.severity === CRITICAL
        ? `Replace "${c.foundFirst} ${c.player.lastName}" → "${c.player.fullName}"`
        : `Verify "${c.foundFirst} ${c.player.lastName}" is not a typo of roster player "${c.player.fullName}"`)
    });
  }

  return issues;
}

// ─── Citizen Name Check (vs Simulation_Ledger) ─────────────────

function checkCitizenNames(editionText, ledgerCitizens) {
  const issues = [];
  if (!ledgerCitizens || ledgerCitizens.length === 0) return issues;

  // Build lookup: last name → [{ first, last, full, popid, tier }]
  const lastNameMap = {};
  for (const citizen of ledgerCitizens) {
    const first = (citizen.First || '').trim();
    const last = (citizen.Last || '').trim();
    if (!first || !last || last.length < 3) continue;
    const key = last.toLowerCase();
    if (!lastNameMap[key]) lastNameMap[key] = [];
    lastNameMap[key].push({
      first, last, full: `${first} ${last}`,
      popid: citizen.POPID || '',
      tier: citizen.Tier || ''
    });
  }

  // Extract citizen names from the edition's Names Index sections and Citizen Usage Log
  // These are the definitive lists of who's mentioned
  const namesIndexPattern = /Names Index:\s*([^\n]+)/g;

  // Collect all named citizens from the edition
  const editionNames = new Set();
  let niMatch;
  while ((niMatch = namesIndexPattern.exec(editionText)) !== null) {
    // Names are comma-separated: "Marcus Webb, Denise Carter, Bobby Chen-Ramirez"
    const names = niMatch[1].split(',').map(n => n.trim()).filter(n => n.length > 2);
    for (const name of names) {
      // Skip reporter names and non-person entries
      if (name.includes('(') || name.includes('[')) continue;
      editionNames.add(name);
    }
  }

  // For each name in the edition, check if last name matches a ledger citizen
  for (const name of editionNames) {
    const parts = name.split(/\s+/);
    if (parts.length < 2) continue;

    const editionFirst = parts[0];
    const editionLast = parts[parts.length - 1];
    const key = editionLast.toLowerCase();

    if (!lastNameMap[key]) continue; // last name not on ledger — could be new citizen, skip

    // Check if any ledger citizen with this last name has a DIFFERENT first name
    const matches = lastNameMap[key];
    const exactMatch = matches.find(m => m.first === editionFirst);
    if (exactMatch) continue; // correct — first name matches

    // Wrong first name for a known last name
    const expected = matches.map(m => m.full).join(' or ');
    issues.push({
      severity: CRITICAL,
      check: 'Citizen Name',
      detail: `Found "${name}" — Simulation_Ledger has "${expected}" for last name "${editionLast}"`,
      fix: `Replace "${name}" → "${matches[0].full}" (${matches[0].popid})`
    });
  }

  return issues;
}

// ─── Quoted-Source Resolution Gate (ES-1, G-W1/W2, S256) ─────────────────
//
// Fail-CLOSED on invented quoted sources. checkCitizenNames above flags a
// WRONG first name for a known last name but SKIPS names whose last name isn't
// on the ledger ("could be a new citizen") — the fail-OPEN gap G-W1/W2 targets:
// a fully invented person handed a direct quote sails through. All canonical
// people — mayor, council, civic officials, athletes, business/cultural owners
// — are Simulation_Ledger rows with POP-IDs (verified S256, Mike-confirmed:
// "all citizens live on the simulation_ledger"). So a person given an
// attribution verb who resolves to NOTHING in SL is an invented source = the
// disqualifying C92-class contamination.
//
// Resolution is deliberately PERMISSIVE (first OR last OR full name) — the gate
// fires only on pure invention, not shared-name ambiguity. Org/place
// attributions ("asked City Hall", "said the Authority") and titles
// ("Mayor Santana said") are handled. Severity starts WARNING; promoted to
// CRITICAL only once corpus calibration shows FP≈0 on known-good editions.
function checkQuotedSourcesResolve(editionText, ledgerCitizens) {
  const issues = [];
  if (!ledgerCitizens || ledgerCitizens.length === 0) return issues;

  const firstNames = new Set(), fullNames = new Set(), nameTokens = new Set();
  for (const c of ledgerCitizens) {
    const f = (c.First || '').trim().toLowerCase();
    const l = (c.Last || '').trim().toLowerCase();
    if (f) firstNames.add(f);
    if (f && l) fullNames.add(`${f} ${l}`);
    // every name-WORD (split on space + hyphen) so compound/hyphenated surnames
    // resolve on their parts — "Soria-Dominguez" (SL) ⇄ "Soria Dominguez" (prose).
    for (const w of `${f} ${l}`.split(/[\s-]+/)) if (w && w.length >= 2) nameTokens.add(w);
  }
  // Place names are not people — neighborhoods + opponent/peer cities seen in
  // sports/business prose ("said Downtown's…", "said Milwaukee's offense").
  let PLACES;
  try {
    const { CANONICAL_HOODS } = require('/root/GodWorld/lib/canonNeighborhoods');
    PLACES = new Set(CANONICAL_HOODS);
  } catch (_) { PLACES = new Set(); }
  for (const p of ['oakland','milwaukee','chicago','stockton','sacramento','fremont','berkeley','alameda','hayward','richmond','bridgeport','seattle','houston','detroit','cleveland']) PLACES.add(p);

  // Editorial content only — drop the post-body tracking trailers.
  const editorial = editionText.split(/ARTICLE TABLE|NAMES INDEX|CITIZEN USAGE LOG|BUSINESSES NAMED/i)[0] || editionText;

  // Capitalized attributions that are NOT people (orgs/places) — skip.
  const ORG = /\b(Hall|Council|Department|Dept|Authority|Office|Tribune|Party|Coalition|Center|Centre|Stadium|Coliseum|District|City|Oakland|Police|Fire|Bureau|Commission|Board|Committee|Fund|Initiative|Academy|Church|Tabernacle|Cathedral|Sangha|Fellowship|Temple|Mosque|School|University|College|Hospital|Clinic|Association|Union|League|Company|Co|Inc|LLC|Group|Authority|Hawks|Athletics|Ports)\b/;
  // Leading honorifics/titles — strip before resolving the name.
  const TITLES = /^(?:Mayor|Councilmember|Councilman|Councilwoman|Council President|Deputy Mayor|Director|Chief|Reverend|Rev\.?|Doctor|Dr\.?|Bishop|Pastor|Father|Coach|Officer|Sergeant|Sgt\.?|Captain|Capt\.?|Lieutenant|Lt\.?|Detective|District Attorney|DA|Attorney|Sister|Imam|Rabbi|President|Commissioner|Superintendent|Principal|Professor|Prof\.?|Ms\.?|Mr\.?|Mrs\.?|Miss)\s+/;
  // Non-name capitalized words that can follow/precede an attribution verb —
  // days, months, pronouns, collective-speaker nouns, sentence-initial adverbs.
  const STOP = new Set(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
    'January','February','March','April','May','June','July','August','September','October','November','December',
    'The','A','An','This','That','These','Those','Some','Many','Most','Several','Few','One','Both','Each','Either','Neither',
    'Now','Here','There','It','He','She','They','We','I','You','Today','Tonight','Earlier','Later','Then','Meanwhile','Instead','Indeed','Once','Twice',
    'When','While','After','Before','Despite','Yet','Still','Even','But','And','So','Because','Although',
    'Nobody','Somebody','Anybody','Everybody','Someone','Anyone','Everyone','None','Others','Another',
    'Skeptics','Critics','Supporters','Residents','Neighbors','Neighbours','Officials','Locals','Organizers','Advocates','Opponents','Boosters','Detractors','Fans','Voters','Parents','Students','Workers','Members']);
  // Bare role/title words — a speaker that is ONLY a title ("the Mayor said",
  // "the GM said") is not an invented person, it's an unnamed canonical role.
  const BARE = new Set(['Mayor','GM','Chief','Director','Council','President','Coach','Councilmember','Councilman','Councilwoman','Deputy','Officer','Sergeant','Captain','Lieutenant','Detective','Commissioner','Superintendent','Principal','Professor','Doctor','Reverend','Bishop','Pastor','Sister','Imam','Rabbi','Attorney','Spokesperson','Spokesman','Spokeswoman','Manager','Owner','Founder','Trainer','Chair','Chairman','Chairwoman','Secretary','Treasurer']);

  // Name token: Capital + lowercase, hyphen/apostrophe-joined parts only
  // (Chen-Ramirez, O'Brien). Cannot match ALL-CAPS acronyms (EBMUD/BART/GM),
  // cannot span a period (sentence boundary), auto-stops before a possessive
  // 's or a contraction ('d/'ve) since those aren't [-'’][A-Z][a-z]+.
  const NAME = '[A-Z][a-z]+(?:[-\'’][A-Z][a-z]+)*';
  const VERBS = 'said|added|noted|asked|argued|explained|recalled|insisted|warned|cautioned|continued|observed|replied|remarked|stated|told|acknowledged|conceded|countered|emphasized|emphasised|stressed|wondered|reflected|admitted|agreed|announced|declared';
  const reA = new RegExp('\\b(?:' + VERBS + ')\\s+(' + NAME + '(?:\\s+' + NAME + '){0,2})', 'g');
  const reB = new RegExp('(' + NAME + '(?:\\s+' + NAME + '){0,2}),?\\s+(?:' + VERBS + ')\\b', 'g');

  const seen = new Set();
  function consider(raw) {
    let name = raw.replace(TITLES, '').trim();
    if (!name) return;
    const toks = name.split(/\s+/);
    if (STOP.has(toks[0])) return;            // "said Tuesday", "Nobody said"
    if (toks.length === 1 && BARE.has(toks[0])) return; // bare role ("the Mayor said")
    if (ORG.test(name)) return;               // org/place, not a person
    const lc = name.toLowerCase();
    if (PLACES.has(lc)) return;               // neighborhood / city, not a person
    if (fullNames.has(lc)) return;            // exact full-name resolve
    const last = toks[toks.length - 1].toLowerCase();
    const first = toks[0].toLowerCase();
    if (nameTokens.has(last)) return;         // surname-word on ledger (handles compounds)
    if (toks.length === 1 && firstNames.has(first)) return; // single given-name on ledger
    if (seen.has(lc)) return; seen.add(lc);
    issues.push({
      severity: WARNING,
      check: 'Quoted Source',
      detail: `Attributed speaker "${name}" resolves to no Simulation_Ledger citizen (no POP-ID)`,
      fix: `The Simulation_Ledger IS the citizen model — a quoted person without a POP-ID breaks it. If "${name}" is a real citizen in a DORMANT ledger (Generic_Citizens / Chicago_Citizens), promote them onto Simulation_Ledger with a new POP-ID and retire the dormant row. If a Cultural_Ledger figure, see the fame→SL promotion design. Otherwise the source is invented — replace with a real citizen or cut the attribution.`
    });
  }
  let m;
  while ((m = reA.exec(editorial)) !== null) consider(m[1]);
  while ((m = reB.exec(editorial)) !== null) consider(m[1]);
  return issues;
}

// ─── Initiative Fact Check (vs Initiative_Tracker) ──────────────

function checkInitiativeFacts(editionText, initiatives) {
  const issues = [];
  if (!initiatives || initiatives.length === 0) return issues;

  for (const init of initiatives) {
    const name = init.Name || '';
    if (!name) continue;

    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Check if the edition mentions this initiative
    if (!new RegExp(escapedName, 'i').test(editionText)) continue;

    // Check budget figures near the initiative name
    if (init.Budget) {
      // Normalize budget: "$28M" → 28, "$12.5M" → 12.5, "$230M" → 230
      const canonBudgetMatch = init.Budget.match(/\$?([\d,.]+)\s*[Mm]/);
      if (canonBudgetMatch) {
        const canonAmount = canonBudgetMatch[1].replace(/,/g, '');

        // Look for dollar amounts near the initiative name in the edition
        const budgetPattern = new RegExp(
          `${escapedName}[\\s\\S]{0,300}?\\$(\\d+(?:\\.\\d+)?(?:,\\d+)*)\\s*(?:million|[Mm])`,
          'gi'
        );
        let match;
        while ((match = budgetPattern.exec(editionText)) !== null) {
          const foundAmount = match[1].replace(/,/g, '');
          if (foundAmount !== canonAmount) {
            issues.push({
              severity: WARNING,
              check: 'Initiative Budget',
              detail: `"${name}" budget shown as $${foundAmount}M — Initiative_Tracker says ${init.Budget}`,
              fix: `Replace "$${foundAmount}" → "$${canonAmount}" near "${name}"`
            });
          }
        }
      }
    }

    // Check status claims
    const statusTerms = {
      'passed': ['passed', 'approved', 'enacted'],
      'failed': ['failed', 'rejected', 'defeated'],
      'pending': ['pending', 'proposed', 'under review'],
      'active': ['active', 'in progress', 'underway'],
    };

    const canonStatus = (init.Status || '').toLowerCase();
    // For each non-matching status group, check if the edition uses those terms
    for (const [statusKey, terms] of Object.entries(statusTerms)) {
      if (canonStatus.includes(statusKey)) continue; // skip matching status
      for (const term of terms) {
        const statusPattern = new RegExp(
          `${escapedName}[\\s\\S]{0,200}?\\b${term}\\b`,
          'gi'
        );
        if (statusPattern.test(editionText)) {
          // Only flag if the canon status clearly contradicts
          const contradicts =
            (canonStatus.includes('passed') && ['failed', 'rejected', 'defeated', 'pending'].includes(term)) ||
            (canonStatus.includes('failed') && ['passed', 'approved', 'enacted'].includes(term));
          if (contradicts) {
            issues.push({
              severity: CRITICAL,
              check: 'Initiative Status',
              detail: `"${name}" described as "${term}" — Initiative_Tracker says "${init.Status}"`,
              fix: `Fix status description near "${name}"`
            });
          }
        }
      }
    }
  }

  return issues;
}

// ─── Civic Office Name Check (vs Civic_Office_Ledger) ───────────

function checkCivicOfficeNames(editionText, civicOfficials, knownPlayerNames, knownCanonicalFullNames) {
  const issues = [];
  if (!civicOfficials || civicOfficials.length === 0) return issues;

  // Known player first names by last name — skip these (not civic errors)
  const playerFirstsByLast = knownPlayerNames || {};

  // S231 pipeline.28 G-W53 dedup (civic-official path — third instance of
  // the same per-occurrence emission bug). C94 surfaced 5× "Daniel Han ↔
  // Victor Han" warnings for 5 mentions of Daniel Han; deduped here to
  // one warning with occurrenceCount + sample contexts.
  const officialCollisions = new Map();
  for (const official of civicOfficials) {
    const holder = (official.Holder || '').trim();
    const title = (official.Title || '').trim();
    if (!holder || !holder.includes(' ')) continue;

    const parts = holder.split(' ');
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    if (lastName.length < 3) continue;

    const escapedLast = lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b([A-Z][a-z]+)\\s+${escapedLast}\\b`, 'g');
    let match;
    while ((match = pattern.exec(editionText)) !== null) {
      const foundFirst = match[1];
      if (foundFirst === firstName) continue;
      if (SKIP_FIRST_WORDS.has(foundFirst)) continue;
      const playerFirsts = playerFirstsByLast[lastName.toLowerCase()] || [];
      if (playerFirsts.includes(foundFirst)) continue;
      // G-W64 — skip if the matched full name is itself a distinct canonical
      // person (e.g. "Rose Delgado" sharing surname with "Shawna Delgado").
      if (isDistinctCanonicalName(editionText, match.index, knownCanonicalFullNames)) continue;
      const sev = severityForLastNameMismatch(editionText, firstName, lastName, foundFirst);
      const key = `${lastName}|${foundFirst}|${sev}`;
      const sampleContext = editionText.slice(
        Math.max(0, match.index - 30),
        Math.min(editionText.length, match.index + match[0].length + 30)
      ).replace(/\s+/g, ' ').trim();
      const existing = officialCollisions.get(key);
      if (existing) {
        existing.occurrenceCount++;
        if (existing.samples.length < 3) existing.samples.push(sampleContext);
      } else {
        officialCollisions.set(key, {
          severity: sev,
          holder,
          title,
          lastName,
          foundFirst,
          occurrenceCount: 1,
          samples: [sampleContext],
        });
      }
    }
  }
  for (const c of officialCollisions.values()) {
    const occNote = c.occurrenceCount > 1
      ? ` (${c.occurrenceCount}× in edition; sample: "${c.samples.slice(0, 2).join('" / "')}")`
      : '';
    issues.push({
      severity: c.severity,
      check: 'Civic Official Name',
      detail: (c.severity === CRITICAL
        ? `Found "${c.foundFirst} ${c.lastName}"${occNote} — Civic_Office_Ledger says "${c.holder}" (${c.title})`
        : `Found "${c.foundFirst} ${c.lastName}"${occNote} — shares last name with civic official "${c.holder}" (${c.title}); official's full name not in text — verify this is a different person`),
      fix: (c.severity === CRITICAL
        ? `Replace "${c.foundFirst} ${c.lastName}" → "${c.holder}"`
        : `Verify "${c.foundFirst} ${c.lastName}" is not a typo of civic official "${c.holder}"`)
    });
  }

  return issues;
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
validateEdition.js — Programmatic Data Validation Gate v2.0

Usage: node scripts/validateEdition.js <edition-file> [--no-sheets]

Checks (static — always run):
  1. Council member names, districts, factions
  2. Vote math (totals ≤ 9 council members)
  3. Vote breakdown consistency with canon
  4. Player positions against roster data
  5. Mayor/executive name verification
  6. Real-name blocklist screening
  7. Engine language sweep
  8. Player first names against roster data

Checks (live sheets — skip with --no-sheets):
  9. Citizen names vs Simulation_Ledger
 10. Initiative facts vs Initiative_Tracker
 11. Civic office names vs Civic_Office_Ledger

Reads from:
  output/desk-packets/base_context.json
  output/desk-packets/truesource_reference.json
  docs/media/REAL_NAMES_BLOCKLIST.md
  Google Sheets: Simulation_Ledger, Initiative_Tracker, Civic_Office_Ledger

Exit codes:
  0 = CLEAN or warnings only
  1 = CRITICAL issues found
  2 = File/data errors
    `);
    process.exit(0);
  }

  const editionFile = args[0];
  const editionPath = path.resolve(editionFile);

  // ─── Load edition ───
  if (!fs.existsSync(editionPath)) {
    console.error(`ERROR: Edition file not found: ${editionPath}`);
    process.exit(2);
  }
  const editionText = fs.readFileSync(editionPath, 'utf-8');
  console.log(`\nVALIDATION GATE — ${path.basename(editionPath)}`);
  console.log('═'.repeat(60));

  // ─── Load data sources ───
  const baseContext = loadJSON(BASE_CONTEXT);
  const truesource = loadJSON(TRUESOURCE);
  const blocklist = loadBlocklist(BLOCKLIST);

  if (!baseContext && !truesource) {
    console.error('WARNING: Neither base_context.json nor truesource_reference.json found.');
    console.error('Validation will be limited to engine language and real-name checks.\n');
  }

  // Prefer truesource (more compact, purpose-built for verification)
  // Fall back to base_context.canon
  const canon = truesource || (baseContext ? baseContext.canon : null);

  // Merge executive branch from either source
  if (canon && !canon.executiveBranch && baseContext && baseContext.canon) {
    canon.executiveBranch = baseContext.canon.executiveBranch;
  }

  // ─── Load live sheet data (optional) ───
  let ledgerCitizens = [], initiatives = [], civicOfficials = [];
  if (!NO_SHEETS) {
    try {
      const sheets = require('../lib/sheets');
      console.log('\nLoading live sheet data...');
      [ledgerCitizens, initiatives, civicOfficials] = await Promise.all([
        sheets.getSheetAsObjects('Simulation_Ledger'),
        sheets.getSheetAsObjects('Initiative_Tracker'),
        sheets.getSheetAsObjects('Civic_Office_Ledger'),
      ]);
      console.log(`  Simulation_Ledger: ${ledgerCitizens.length} citizens`);
      console.log(`  Initiative_Tracker: ${initiatives.length} initiatives`);
      console.log(`  Civic_Office_Ledger: ${civicOfficials.length} officials`);
    } catch (err) {
      console.error(`WARNING: Could not load sheets: ${err.message}`);
      console.error('Sheet-based checks will be skipped. Use --no-sheets to suppress.\n');
    }
  } else {
    console.log('\n--no-sheets: Skipping live sheet checks.');
  }

  // ─── Run all checks ───
  const allIssues = [];

  // G-W64 — build the cross-domain canonical-name oracle once: every full name
  // we know is a real person (ledger citizen, civic-office holder, A's roster,
  // council member, mayor). The surname-mismatch checks consult it to skip a
  // shared-surname hit that is itself a distinct canonical person rather than a
  // typo (e.g. Vanessa Tran-Muñoz vs Leonard Tran).
  const knownCanonicalFullNames = new Set();
  for (const c of ledgerCitizens) {
    const first = (c.First || '').trim();
    const last = (c.Last || '').trim();
    if (first && last) knownCanonicalFullNames.add(normalizeName(first + ' ' + last));
  }
  for (const o of civicOfficials) {
    const holder = (o.Holder || '').trim();
    if (holder && holder.includes(' ')) knownCanonicalFullNames.add(normalizeName(holder));
  }
  for (const p of (canon && canon.asRoster ? canon.asRoster : [])) {
    if (p && p.name && p.name.includes(' ')) knownCanonicalFullNames.add(normalizeName(p.name));
  }
  for (const m of (canon && canon.council ? canon.council : [])) {
    const nm = m.member || m.name;
    if (nm && nm.includes(' ')) knownCanonicalFullNames.add(normalizeName(nm));
  }
  if (canon && canon.executiveBranch && canon.executiveBranch.mayor) {
    const mayor = typeof canon.executiveBranch.mayor === 'string'
      ? canon.executiveBranch.mayor
      : (canon.executiveBranch.mayor.name || '');
    if (mayor && mayor.includes(' ')) knownCanonicalFullNames.add(normalizeName(mayor));
  }

  console.log('\nRunning checks...');

  // 1. Council names
  const councilIssues = checkCouncilNames(editionText, canon, knownCanonicalFullNames);
  allIssues.push(...councilIssues);
  console.log(`  [${councilIssues.length === 0 ? '✓' : '!'}] Council names: ${councilIssues.length} issues`);

  // 2. Vote math
  const voteIssues = checkVoteMath(editionText);
  allIssues.push(...voteIssues);
  console.log(`  [${voteIssues.length === 0 ? '✓' : '!'}] Vote math: ${voteIssues.length} issues`);

  // 3. Vote breakdown consistency
  const breakdownIssues = checkVoteBreakdownConsistency(editionText, canon);
  allIssues.push(...breakdownIssues);
  console.log(`  [${breakdownIssues.length === 0 ? '✓' : '!'}] Vote breakdowns: ${breakdownIssues.length} issues`);

  // 4. Player positions
  const positionIssues = checkPlayerPositions(editionText, canon);
  allIssues.push(...positionIssues);
  console.log(`  [${positionIssues.length === 0 ? '✓' : '!'}] Player positions: ${positionIssues.length} issues`);

  // 5. Mayor name
  const mayorIssues = checkMayorName(editionText, canon);
  allIssues.push(...mayorIssues);
  console.log(`  [${mayorIssues.length === 0 ? '✓' : '!'}] Mayor name: ${mayorIssues.length} issues`);

  // 6. Real-name screening
  const nameIssues = checkRealNames(editionText, blocklist);
  allIssues.push(...nameIssues);
  console.log(`  [${nameIssues.length === 0 ? '✓' : '!'}] Real-name screening: ${nameIssues.length} issues`);

  // 7. Engine language
  const engineIssues = checkEngineLanguage(editionText);
  allIssues.push(...engineIssues);
  console.log(`  [${engineIssues.length === 0 ? '✓' : '!'}] Engine language: ${engineIssues.length} issues`);

  // 7b. ARTICLE TABLE placement consistency (G-W62) — static, uses the parser.
  const placementIssues = checkArticleTablePlacement(editionPath);
  allIssues.push(...placementIssues);
  console.log(`  [${placementIssues.length === 0 ? '✓' : '!'}] ARTICLE TABLE placement: ${placementIssues.length} issues`);

  // 7c. In-body metadata leak gate (pipeline.9, C92 desk-emission fix) — asserts
  // stripMetadataLeaks() would be a no-op on the published artifact.
  const leakIssues = checkMetadataLeak(editionText);
  allIssues.push(...leakIssues);
  console.log(`  [${leakIssues.length === 0 ? '✓' : '!'}] Metadata leak: ${leakIssues.length} issues`);

  // 7d. In-world time + engine-metric leak scan (G-W-C97-2, ES-3) — deterministic
  // backstop for reporter month/decimal leaks the operator caught by eye at Step 2.
  const inWorldIssues = checkInWorldLeaks(editionText);
  allIssues.push(...inWorldIssues);
  console.log(`  [${inWorldIssues.length === 0 ? '✓' : '!'}] In-world time/metric leak: ${inWorldIssues.length} issues`);

  // Build cross-domain exclusion maps to prevent false positives on shared last names
  // officialFirstsByLast: { "ramos": ["Keisha"], "ellis": ["Simone"], ... }
  // playerFirstsByLast: { "ramos": ["Arturo"], "ellis": ["John"], ... }
  const officialFirstsByLast = {};
  for (const official of civicOfficials) {
    const holder = (official.Holder || '').trim();
    if (!holder || !holder.includes(' ')) continue;
    const parts = holder.split(' ');
    const key = parts[parts.length - 1].toLowerCase();
    if (!officialFirstsByLast[key]) officialFirstsByLast[key] = [];
    officialFirstsByLast[key].push(parts[0]);
  }

  const playerFirstsByLast = {};
  const roster = canon ? (canon.asRoster || []) : [];
  for (const player of roster) {
    const name = player.name;
    if (!name || !name.includes(' ')) continue;
    const parts = name.split(' ');
    const key = parts[parts.length - 1].toLowerCase();
    if (!playerFirstsByLast[key]) playerFirstsByLast[key] = [];
    playerFirstsByLast[key].push(parts[0]);
  }

  // 8. Player first names (static — uses truesource/base_context roster)
  const playerNameIssues = checkPlayerFirstNames(editionText, canon, officialFirstsByLast);
  allIssues.push(...playerNameIssues);
  console.log(`  [${playerNameIssues.length === 0 ? '✓' : '!'}] Player first names: ${playerNameIssues.length} issues`);

  // 9-11. Live sheet checks
  if (ledgerCitizens.length > 0) {
    const citizenIssues = checkCitizenNames(editionText, ledgerCitizens);
    allIssues.push(...citizenIssues);
    console.log(`  [${citizenIssues.length === 0 ? '✓' : '!'}] Citizen names (live): ${citizenIssues.length} issues`);

    // 9b. Quoted-source resolution (ES-1, G-W1/W2) — every attributed speaker
    // must resolve to an SL POP-ID; the Simulation_Ledger IS the citizen model.
    const quotedIssues = checkQuotedSourcesResolve(editionText, ledgerCitizens);
    allIssues.push(...quotedIssues);
    console.log(`  [${quotedIssues.length === 0 ? '✓' : '!'}] Quoted sources (live): ${quotedIssues.length} issues`);
  } else {
    console.log('  [—] Citizen names: skipped (no sheet data)');
    console.log('  [—] Quoted sources: skipped (no sheet data)');
  }

  if (initiatives.length > 0) {
    const initIssues = checkInitiativeFacts(editionText, initiatives);
    allIssues.push(...initIssues);
    console.log(`  [${initIssues.length === 0 ? '✓' : '!'}] Initiative facts (live): ${initIssues.length} issues`);
  } else {
    console.log('  [—] Initiative facts: skipped (no sheet data)');
  }

  if (civicOfficials.length > 0) {
    const civicIssues = checkCivicOfficeNames(editionText, civicOfficials, playerFirstsByLast, knownCanonicalFullNames);
    allIssues.push(...civicIssues);
    console.log(`  [${civicIssues.length === 0 ? '✓' : '!'}] Civic office names (live): ${civicIssues.length} issues`);
  } else {
    console.log('  [—] Civic office names: skipped (no sheet data)');
  }

  // ─── Report ───
  const criticals = allIssues.filter(i => i.severity === CRITICAL);
  const warnings = allIssues.filter(i => i.severity === WARNING);
  const notes = allIssues.filter(i => i.severity === NOTE);

  console.log('\n' + '═'.repeat(60));

  if (allIssues.length === 0) {
    console.log('STATUS: CLEAN');
    console.log('All programmatic checks passed. Ready for Rhea verification.');
    console.log('═'.repeat(60));
    process.exit(0);
  }

  // Status line
  if (criticals.length > 0) {
    console.log(`STATUS: NOT READY — ${criticals.length} CRITICAL, ${warnings.length} WARNING, ${notes.length} NOTE`);
  } else {
    console.log(`STATUS: PASSABLE — ${warnings.length} WARNING, ${notes.length} NOTE`);
  }
  console.log('');

  // Print issues grouped by severity
  let issueNum = 1;

  if (criticals.length > 0) {
    console.log('CRITICAL (must fix before Rhea verification):');
    for (const issue of criticals) {
      console.log(`  ${issueNum}. [${issue.check}] ${issue.detail}`);
      console.log(`     FIX: ${issue.fix}`);
      issueNum++;
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log('WARNINGS (should fix):');
    for (const issue of warnings) {
      console.log(`  ${issueNum}. [${issue.check}] ${issue.detail}`);
      console.log(`     FIX: ${issue.fix}`);
      issueNum++;
    }
    console.log('');
  }

  if (notes.length > 0) {
    console.log('NOTES (informational):');
    for (const issue of notes) {
      console.log(`  ${issueNum}. [${issue.check}] ${issue.detail}`);
      console.log(`     FIX: ${issue.fix}`);
      issueNum++;
    }
    console.log('');
  }

  console.log('═'.repeat(60));
  console.log(`Total: ${allIssues.length} issues (${criticals.length} critical, ${warnings.length} warning, ${notes.length} note)`);

  if (criticals.length > 0) {
    console.log('\nFix CRITICAL issues before proceeding to Rhea verification.');
    process.exit(1);
  } else {
    console.log('\nNo critical issues. Safe to proceed to Rhea verification.');
    process.exit(0);
  }
}

// Exports for test harnesses + future modular consumers. The script's primary
// invocation path remains the CLI `main()` below; require.main guard added
// S231 pipeline.28 G-W52 so the script can be require()'d without auto-running
// against the live spreadsheet.
module.exports = {
  derivePositionCode,
  POSITION_NAMES,
  checkPlayerPositions,
  checkCitizenNames,
  // ES-1 (S256) quoted-source resolution gate
  checkQuotedSourcesResolve,
  checkEngineLanguage,
  // ES-3 (S257 G-W-C97-2) in-world time + engine-metric leak scan
  checkInWorldLeaks,
  // G-W64 (S246 ES-8)
  checkCouncilNames,
  checkCivicOfficeNames,
  extractFullNameAt,
  isDistinctCanonicalName,
  SKIP_FIRST_WORDS,
};

if (require.main === module) {
  main().catch(err => { console.error('Fatal:', err.message); process.exit(2); });
}
