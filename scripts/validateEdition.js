#!/usr/bin/env node

/**
 * validateEdition.js — Programmatic Data Validation Gate
 * Version: 1.0
 *
 * Runs BEFORE Rhea Morgan verification. Zero LLM tokens.
 * Catches data errors that broke Edition 82: wrong positions,
 * swapped votes, wrong mayor name, real-name leaks, engine language.
 *
 * Usage:
 *   node scripts/validateEdition.js <edition-file>
 *   node scripts/validateEdition.js editions/cycle_pulse_edition_83.txt
 *
 * Exit codes:
 *   0 = CLEAN (no critical issues)
 *   1 = CRITICAL issues found
 *   2 = File/data errors (missing files, parse failures)
 */

const fs = require('fs');
const path = require('path');

// ─── Config ─────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const BASE_CONTEXT = path.join(ROOT, 'output/desk-packets/base_context.json');
const TRUESOURCE = path.join(ROOT, 'output/desk-packets/truesource_reference.json');
const BLOCKLIST = path.join(ROOT, 'docs/media/REAL_NAMES_BLOCKLIST.md');

// ─── Severity levels ────────────────────────────────────────────
const CRITICAL = 'CRITICAL';
const WARNING = 'WARNING';
const NOTE = 'NOTE';

// ─── Engine language patterns ───────────────────────────────────
// Each entry: { pattern, exclude (optional regex that makes the match OK) }
const ENGINE_TERMS = [
  // Direct engine words
  { pattern: /\bcycle\s+\d+/gi },
  { pattern: /\bthis cycle\b/gi },
  { pattern: /\bnext cycle\b/gi },
  { pattern: /\bsingle-cycle\b/gi },
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
  // "Ledger" is OK in desk titles ("Civic Ledger") and place names
  { pattern: /\bsimulation\b/gi },
  { pattern: /\bphase \d+/gi },
  { pattern: /\bledger\b/gi, exclude: /Civic Ledger|Tribune.*Ledger/i },
  { pattern: /\bmedia intake\b/gi },
  { pattern: /\bstory seed\b/gi },
  // Edition number references (reporters don't know edition numbers)
  { pattern: /\bEdition\s+\d+/g },
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

function checkCouncilNames(editionText, canon) {
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
  for (const [lastName, member] of Object.entries(lastNameToMember)) {
    // Look for "FirstName LastName" where LastName is a council member
    const pattern = new RegExp(`\\b([A-Z][a-z]+)\\s+${member.name.split(' ').pop()}\\b`, 'g');
    let match;
    while ((match = pattern.exec(editionText)) !== null) {
      const foundFirst = match[1];
      const expectedFirst = member.name.split(' ')[0];
      // Skip if the match is part of a longer name or title
      if (foundFirst === expectedFirst) continue;
      // Skip common words, titles, and articles that appear before council last names
      const skipWords = ['The', 'And', 'But', 'For', 'With', 'From', 'About', 'When', 'While',
        'After', 'Before', 'Since', 'Until', 'Where', 'That', 'This', 'These', 'Those',
        'Councilmember', 'Councilwoman', 'Councilman', 'Council', 'Representative',
        'Commissioner', 'Senator', 'Governor', 'Mayor', 'Judge', 'Officer',
        'Mr', 'Mrs', 'Ms', 'Dr', 'If', 'Or', 'Even', 'Not', 'Just', 'Only',
        'Both', 'Each', 'Every', 'Either', 'Neither', 'Whether', 'Although',
        'Former', 'Current', 'Incoming', 'Outgoing', 'Late', 'Dear', 'Said'];
      if (skipWords.includes(foundFirst)) continue;
      issues.push({
        severity: CRITICAL,
        check: 'Council Name',
        detail: `Found "${foundFirst} ${member.name.split(' ').pop()}" — should be "${member.name}" (${member.district}, ${member.faction})`,
        fix: `Replace "${foundFirst} ${member.name.split(' ').pop()}" → "${member.name}"`
      });
    }
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

function checkPlayerPositions(editionText, canon) {
  const issues = [];
  if (!canon) return issues;

  // Build roster lookup from truesource or base_context
  const roster = canon.asRoster || [];
  const positionMap = {};
  const dhPlayers = [];

  for (const player of roster) {
    const name = player.name;
    const pos = player.position || player.roleType;
    positionMap[name.toLowerCase()] = { name, position: pos };
    if (pos === 'DH') dhPlayers.push(name);
  }

  // Position name mapping for natural language
  const positionNames = {
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

  // For each player, check if a WRONG position is DIRECTLY attributed
  // Use tight patterns that require direct attribution, not just proximity
  for (const [nameLower, info] of Object.entries(positionMap)) {
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

  // Look for "Mayor [Name]" patterns
  const mayorPattern = /\bMayor\s+([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)*)/g;
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

// ─── Main ───────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
validateEdition.js — Programmatic Data Validation Gate v1.0

Usage: node scripts/validateEdition.js <edition-file>

Checks:
  1. Council member names, districts, factions
  2. Vote math (totals ≤ 9 council members)
  3. Vote breakdown consistency with canon
  4. Player positions against roster data
  5. DH + defensive award contradictions
  6. Mayor/executive name verification
  7. Real-name blocklist screening
  8. Engine language sweep

Reads from:
  output/desk-packets/base_context.json
  output/desk-packets/truesource_reference.json
  docs/media/REAL_NAMES_BLOCKLIST.md

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

  // ─── Run all checks ───
  const allIssues = [];

  console.log('\nRunning checks...');

  // 1. Council names
  const councilIssues = checkCouncilNames(editionText, canon);
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

main();
