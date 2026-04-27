#!/usr/bin/env node
/**
 * buildDeskFolders.js v1.0
 *
 * Populates per-desk workspace folders for autonomous agent operation.
 * Replaces the orchestrator's manual briefing-writing, errata-filtering,
 * and voice-statement distribution — all with zero LLM tokens.
 *
 * Run AFTER: buildDeskPackets.js, buildArchiveContext.js, voice agents.
 * Run BEFORE: launching desk agents.
 *
 * Usage: node scripts/buildDeskFolders.js [cycleNumber] [--skip-voice] [--skip-mara] [--clean]
 */

const fs = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────
const getCurrentCycle = require('../lib/getCurrentCycle');
const CYCLE = getCurrentCycle();
const SKIP_VOICE = process.argv.includes('--skip-voice');
const SKIP_MARA = process.argv.includes('--skip-mara');
const CLEAN = process.argv.includes('--clean');

const ROOT = path.resolve(__dirname, '..');
const DESKS_DIR = path.join(ROOT, 'output/desks');
const PACKETS_DIR = path.join(ROOT, 'output/desk-packets');
const BRIEFINGS_DIR = path.join(ROOT, 'output/desk-briefings');
const DESK_OUTPUT_DIR = path.join(ROOT, 'output/desk-output');
const VOICE_DIR = path.join(ROOT, 'output/civic-voice');
const INTERVIEWS_DIR = path.join(ROOT, 'output/interviews');
const ERRATA_PATH = path.join(ROOT, 'output/errata.jsonl');

const DESK_NAMES = ['sports', 'civic', 'culture', 'business', 'chicago', 'letters'];

// Voice statement distribution table
const VOICE_DISTRIBUTION = {
  civic:    ['mayor', 'opp_faction', 'crc_faction', 'ind_swing', 'police_chief', 'baylight_authority', 'district_attorney'],
  letters:  ['mayor', 'opp_faction', 'crc_faction', 'ind_swing'],
  business: ['mayor', 'crc_faction', 'baylight_authority'],
  sports:   ['mayor', 'baylight_authority'],
  culture:  ['opp_faction'],
  chicago:  []
};

// ─── HELPERS ─────────────────────────────────────────────
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyIfExists(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    return true;
  }
  return false;
}

function readIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  return null;
}

function readJsonIfExists(filePath) {
  const content = readIfExists(filePath);
  if (content) {
    try { return JSON.parse(content); }
    catch (e) { return null; }
  }
  return null;
}

// ─── ERRATA FILTER ───────────────────────────────────────
function getErrataForDesk(desk) {
  if (!fs.existsSync(ERRATA_PATH)) return [];
  const lines = fs.readFileSync(ERRATA_PATH, 'utf8').trim().split('\n');
  const entries = lines.map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean);

  // Filter to this desk + cross-desk, last 3 editions
  const maxEdition = entries.length > 0 ? Math.max(...entries.map(e => e.edition || 0)) : 0;
  const cutoff = maxEdition - 2;

  return entries.filter(e =>
    (e.desk === desk || e.desk === 'cross-desk' || e.desk === 'pipeline') &&
    (e.edition || 0) >= cutoff
  );
}

function formatErrataMarkdown(entries, desk) {
  if (entries.length === 0) return `# Guardian Warnings — ${desk}\n\nNo warnings for this desk.\n`;

  let md = `# Guardian Warnings — ${desk}\n\n`;

  // Recurring patterns first
  const recurring = entries.filter(e => e.recurrence);
  if (recurring.length > 0) {
    md += `## RECURRING PATTERNS (highest priority)\n`;
    for (const e of recurring) {
      md += `- **${e.errorType}** (${e.recurrence}x): ${e.description} — E${e.edition}\n`;
    }
    md += '\n';
  }

  // Then by severity
  const critical = entries.filter(e => e.severity === 'CRITICAL' && !e.recurrence);
  if (critical.length > 0) {
    md += `## CRITICAL\n`;
    for (const e of critical) {
      md += `- ${e.errorType}: ${e.description} — E${e.edition}\n`;
    }
    md += '\n';
  }

  const warnings = entries.filter(e => e.severity === 'WARNING' && !e.recurrence);
  if (warnings.length > 0) {
    md += `## WARNING\n`;
    for (const e of warnings) {
      md += `- ${e.errorType}: ${e.description} — E${e.edition}\n`;
    }
    md += '\n';
  }

  return md;
}

// ─── MARA GUIDANCE EXTRACTION ────────────────────────────
function extractMaraGuidance(cycle) {
  // Try previous cycle's Mara directive
  const maraPath = path.join(ROOT, `output/mara_directive_c${cycle - 1}.txt`);
  const maraAltPath = path.join(ROOT, `output/mara-directives/mara_directive_c${cycle - 1}.txt`);
  const content = readIfExists(maraPath) || readIfExists(maraAltPath);
  if (!content) return null;

  // Extract FORWARD GUIDANCE section
  const fwdMatch = content.match(/FORWARD GUIDANCE[:\s]*\n([\s\S]*?)(?:\n#{1,3}\s|\n---|\Z)/i);
  if (fwdMatch) return fwdMatch[1].trim();

  // Fallback: look for per-desk sections
  const sections = content.match(/(?:^|\n)(#{1,3}\s.*(?:guidance|next|forward)[\s\S]*?)(?=\n#{1,3}\s|\Z)/gi);
  if (sections) return sections.join('\n\n').trim();

  return null;
}

function getMaraGuidanceForDesk(fullGuidance, desk) {
  if (!fullGuidance) return null;

  // Try to find desk-specific section
  const deskPattern = new RegExp(`(?:${desk}|${desk.replace('-', ' ')})[:\\s]*([^\\n]+(?:\\n(?!\\*\\*|#{1,3}\\s)[^\\n]+)*)`, 'gi');
  const match = deskPattern.exec(fullGuidance);
  if (match) return match[0].trim();

  // Return full guidance if no desk-specific section found
  return fullGuidance;
}

// ─── RD DIVERSITY PRIMING ─────────────────────────────────
// Based on Recoding-Decoding (Harvard, arxiv 2603.19519).
// Random priming forces agents down less-traveled probability paths,
// producing more diverse citizen selection, angles, and framing.
const RD_LENSES = [
  'through the lens of a newcomer arriving this month',
  'from the perspective of someone who works nights',
  'as experienced by a teenager in this neighborhood',
  'through the eyes of a small business owner on this block',
  'from the vantage of someone who has lived here forty years',
  'as felt by someone walking home after dark',
  'through the experience of a parent with young children',
  'from the perspective of someone who just lost their job',
  'as seen by an artist looking for studio space',
  'through the lens of a transit rider who depends on the bus',
  'from the vantage of someone attending their first council meeting',
  'as experienced by a retired teacher in this district',
  'through the eyes of someone sending money home to family abroad',
  'from the perspective of a street vendor on International Boulevard',
  'as felt by someone whose rent just increased',
  'through the lens of a high school coach after practice',
  'from the vantage of a congregation member on Sunday morning',
  'as experienced by someone navigating the city in a wheelchair',
  'through the eyes of a food truck owner at lunchtime',
  'from the perspective of a night nurse ending a shift at Highland',
];

function getRandomRDLens() {
  return RD_LENSES[Math.floor(Math.random() * RD_LENSES.length)];
}

// ─── STORY CRAFT — MICE THREAD GUIDANCE ─────────────────
// Based on MICE Quotient (Milieu, Inquiry, Character, Event)
// and Brandon Sanderson's story structure lectures.
// Each desk gets a structural lens matching its natural voice.
const MICE_THREADS = {
  sports:   'Lead with action — what happened, what shifted, what\'s at stake next.',
  civic:    'Lead with the question — what\'s hidden, who benefits, what\'s really being decided.',
  culture:  'Lead with place — sensory detail, atmosphere, what this corner of Oakland feels like.',
  business: 'Lead with the change — what moved, why it matters, who feels it.',
  chicago:  'Lead with the neighborhood — place and people, texture through individual stories.',
  letters:  'Lead with the person — interior emotion, what they carry, why they\'re writing.',
};

// ─── FAITH ACTIVITY (S180) ──────────────────────────────
// Render Faith_Ledger digest into a culture-desk briefing section.
// Pre-S180 the ledger had ~125 events with no reader; this surfaces them.
function generateFaithSection(faithDigest) {
  if (!faithDigest || !faithDigest.current || faithDigest.current.length === 0) return '';

  let md = `## FAITH ACTIVITY THIS CYCLE\n`;
  md += `*${faithDigest.totals.thisCycle} event(s) across ${Object.keys(faithDigest.byTradition || {}).length} tradition(s).*\n\n`;

  for (const ev of faithDigest.current) {
    const att = ev.attendance ? ` (~${ev.attendance})` : '';
    const hood = ev.neighborhood ? ` — ${ev.neighborhood}` : '';
    md += `- **${ev.organization}** (${ev.faithTradition})${hood}: ${ev.description || ev.eventType}${att}\n`;
  }

  if (faithDigest.recent && faithDigest.recent.length > 0) {
    md += `\n*Recent context (last ${faithDigest.recentWindow || 2} cycles):* ${faithDigest.recent.length} event(s) — `;
    md += faithDigest.recent.slice(0, 3).map(e =>
      `${e.organization} (C${e.cycle}, ${e.eventType})`).join('; ');
    if (faithDigest.recent.length > 3) md += `; +${faithDigest.recent.length - 3} more`;
    md += `.\n`;
  }

  md += `\n`;
  return md;
}

// ─── BRIEFING GENERATOR ──────────────────────────────────
function generateBriefing(desk, cycle, summary, baseContext, maraGuidance, errata, faithDigest) {
  let md = `# ${desk.charAt(0).toUpperCase() + desk.slice(1)} Desk Briefing — Cycle ${cycle}\n\n`;

  // RD diversity priming — unique perspective each run
  const lens = getRandomRDLens();
  md += `## CREATIVE LENS (this edition)\n`;
  md += `Consider at least one story or angle ${lens}. This is not a constraint — it's a starting point. `;
  md += `Use it to find citizens and stories you wouldn't otherwise reach.\n\n`;

  // Story craft guidance — MICE thread + promise-payoff
  const miceThread = MICE_THREADS[desk];
  if (miceThread) {
    md += `## STORY CRAFT\n`;
    md += `**Structure:** ${miceThread}\n`;
    md += `**Shape:** Your article should make a promise in the first paragraph, complicate it in the middle, and pay it off at the end.\n`;
    md += `**Empathy:** Make the reader care about at least one person — show what they want, what they risk, what makes them human.\n`;
    md += `**Invention:** DO NOT invent citizen names, player names, business names, vote counts, dollar amounts, statistics, dates, or initiative status. Use ONLY what is in your packet data. If the packet doesn't have it, don't write it. Atmospheric details (a smell, a sound, weather) are allowed — up to 3 per article. Everything else must trace to your packet. If you cannot write a story without inventing facts, write a shorter story with real facts.\n\n`;
  }

  // Calendar context
  if (baseContext) {
    const bc = baseContext;
    md += `**Cycle ${cycle}** | ${bc.month || ''} ${bc.simYear || ''} | ${bc.season || ''}\n\n`;
  }

  // Guardian warnings
  if (errata && errata.length > 0) {
    md += `## GUARDIAN WARNINGS\n`;
    const recurring = errata.filter(e => e.recurrence);
    for (const e of recurring) {
      md += `- **RECURRING — ${e.errorType}** (${e.recurrence}x): ${e.description}\n`;
    }
    const others = errata.filter(e => !e.recurrence);
    for (const e of others) {
      md += `- ${e.severity || 'NOTE'}: ${e.errorType} — ${e.description}\n`;
    }
    md += '\n';
  }

  // Mara forward guidance
  if (maraGuidance) {
    md += `## MARA FORWARD GUIDANCE\n${maraGuidance}\n\n`;
  }

  // Faith activity (culture desk only) — Faith_Ledger digest, S180
  if (desk === 'culture' && faithDigest) {
    md += generateFaithSection(faithDigest);
  }

  // Established canon from base_context
  if (baseContext && baseContext.canon) {
    md += generateCanonSection(desk, baseContext.canon);
  }

  // Story priorities from summary
  if (summary) {
    md += generateStoryPriorities(desk, summary);
  }

  // Returning citizens from summary
  if (summary) {
    md += generateReturningCitizens(desk, summary);
  }

  // Citizen reference cards from summary
  if (summary) {
    md += generateCitizenCards(desk, summary);
  }

  // INTAKE output requirement — agents declare what they used/invented
  md += `## OUTPUT REQUIREMENT: INTAKE SECTION\n\n`;
  md += `**After your articles, include an ## INTAKE section.** This is how your work feeds back into the world. One line per entry, pipe-delimited.\n\n`;
  md += `**Format — copy exactly:**\n`;
  md += '```\n';
  md += '## INTAKE\n\n';
  md += 'CITIZEN: Full Name | POP-XXXXX | quoted | context about their role in the article\n';
  md += 'CITIZEN: Full Name | POP-XXXXX | referenced | brief context\n';
  md += 'NEW_CITIZEN: Full Name | — | new | age, neighborhood, occupation, one-line bio\n';
  md += 'BUSINESS: Business Name | Neighborhood | new or existing | type of business\n';
  md += 'SCHOOL: School Name | Neighborhood | new or existing\n';
  md += 'FAITH: Organization Name | Neighborhood | new or existing\n';
  md += 'QUOTE: Full Name | POP-XXXXX | "Exact quote from the article"\n';
  md += 'STORYLINE: NEW | Description of new story thread | Citizen1, Citizen2 | Neighborhood\n';
  md += 'STORYLINE: CONTINUING | Description | Citizens involved | Neighborhood\n';
  md += 'STORYLINE: RESOLVED | Description | Citizens involved | Neighborhood\n';
  md += '```\n\n';
  md += `**Rules:**\n`;
  md += `- Every citizen you name in your articles MUST appear in INTAKE with their POPID from the reference cards above.\n`;
  md += `- If you invented a citizen, use NEW_CITIZEN with a dash for POPID.\n`;
  md += `- If you invented a business, school, or faith org, mark it "new."\n`;
  md += `- Every direct quote MUST appear in a QUOTE line.\n`;
  md += `- UsageType for CITIZEN: quoted, referenced, central, mentioned, letter_writer\n\n`;

  return md;
}

function generateCanonSection(desk, canon) {
  let md = `## ESTABLISHED CANON\n`;

  if (desk === 'civic' || desk === 'letters') {
    // Council roster
    if (canon.council) {
      md += `### Council\n`;
      for (const member of canon.council) {
        md += `ESTABLISHED CANON: ${member.member || member.name} — District ${member.district}, ${member.faction || 'Independent'}\n`;
      }
      md += '\n';
    }
    // Executive branch
    if (canon.executiveBranch) {
      const eb = canon.executiveBranch;
      if (eb.mayor) md += `ESTABLISHED CANON: Mayor is ${eb.mayor}\n`;
      if (eb.deputyMayor) md += `ESTABLISHED CANON: Deputy Mayor is ${eb.deputyMayor}\n`;
      md += '\n';
    }
    // Recent outcomes
    if (canon.recentOutcomes && canon.recentOutcomes.length > 0) {
      md += `### Recent Vote Outcomes\n`;
      for (const outcome of canon.recentOutcomes) {
        md += `ESTABLISHED CANON: ${outcome.initiative || outcome.name} — ${outcome.result || outcome.status} (${outcome.vote || ''})\n`;
      }
      md += '\n';
    }
  }

  if (desk === 'sports') {
    if (canon.asRoster && Array.isArray(canon.asRoster)) {
      md += `### A's Roster (verify all player positions against this)\n`;
      const starters = canon.asRoster.filter(p => p.status === 'Active' || !p.status).slice(0, 15);
      for (const p of starters) {
        md += `ESTABLISHED CANON: ${p.name} — ${p.roleType || p.position || 'roster'}\n`;
      }
      md += '\n';
    }
  }

  if (desk === 'chicago') {
    if (canon.bullsRoster && Array.isArray(canon.bullsRoster)) {
      md += `### Bulls Roster (verify all player names against this)\n`;
      for (const p of canon.bullsRoster) {
        md += `ESTABLISHED CANON: ${p.name} — ${p.roleType || p.position || 'roster'}\n`;
      }
      md += '\n';
    }
  }

  return md;
}

function generateStoryPriorities(desk, summary) {
  let md = `## STORY PRIORITIES\n`;

  // Events sorted by priority
  const events = summary.events || summary.topEvents || [];
  const sorted = [...events].sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 5);

  if (sorted.length === 0) {
    md += `No prioritized events for this cycle.\n\n`;
    return md;
  }

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    md += `${i + 1}. **${e.name || e.title || e.description || 'Event'}** — ${e.neighborhood || 'city-wide'}`;
    if (e.priority) md += ` (priority: ${e.priority})`;
    if (e.description && e.description !== e.name) md += `\n   ${e.description}`;
    md += '\n';
  }
  md += '\n';

  // Active storylines
  const storylines = summary.storylines || summary.activeStorylines || [];
  if (storylines.length > 0) {
    md += `### Active Storylines\n`;
    for (const s of storylines.slice(0, 5)) {
      md += `- ${s.description || s.name || s.title}`;
      if (s.citizens) md += ` — involves: ${Array.isArray(s.citizens) ? s.citizens.join(', ') : s.citizens}`;
      md += '\n';
    }
    md += '\n';
  }

  return md;
}

function generateReturningCitizens(desk, summary) {
  // Look for previousCoverage or coverageEcho in the summary
  const coverage = summary.previousCoverage || summary.coverageEcho || summary.storyConnections?.coverageEcho;
  if (!coverage) return '';

  let md = `## RETURNING — CONTINUE THREAD\n`;
  md += `These citizens have active stories. Continue their arcs before introducing anyone new.\n\n`;

  const citizens = Array.isArray(coverage) ? coverage : (coverage.citizens || []);
  if (citizens.length === 0) return '';

  for (const c of citizens.slice(0, 5)) {
    const name = c.name || c.citizenName || 'Unknown';
    const details = [c.age, c.neighborhood, c.occupation].filter(Boolean).join(', ');
    md += `**${name}** (${details})\n`;
    if (c.lastArticle || c.context) md += `- Last seen: ${c.lastArticle || c.context}\n`;
    if (c.quote) md += `- Key quote: "${c.quote}"\n`;
    md += '\n';
  }

  return md;
}

function generateCitizenCards(desk, summary) {
  const candidates = summary.interviewCandidates || [];
  const archive = summary.citizenArchive || [];
  // Show top 20 priority citizens in briefing (full roster in packet.json)
  // Sorted by freshness — least-used citizens first
  const all = [...candidates, ...archive].slice(0, 20);

  if (all.length === 0) return '';

  const freshCount = all.filter(c => c.fresh || c.usageCount === 0).length;
  let md = `## CITIZEN REFERENCE CARDS\n`;
  if (freshCount > 0) {
    md += `**${freshCount} of these citizens have NEVER appeared in any edition. Prioritize them.**\n\n`;
  }
  for (const c of all) {
    const name = c.name || c.citizenName || 'Unknown';
    const details = [c.age, c.neighborhood, c.occupation].filter(Boolean).join(', ');
    const freshTag = (c.fresh || c.usageCount === 0) ? ' [FRESH]' : '';
    md += `- **${name}** (${details})${freshTag}`;
    if (c.popid) md += ` [${c.popid}]`;
    md += '\n';
  }
  md += '\n';

  return md;
}

// ─── MAIN ────────────────────────────────────────────────
function main() {
  console.log(`\n=== buildDeskFolders.js v1.0 — Cycle ${CYCLE} ===\n`);

  // Load shared data
  const baseContext = readJsonIfExists(path.join(PACKETS_DIR, 'base_context.json'));
  if (!baseContext) {
    console.error('ERROR: base_context.json not found. Run buildDeskPackets.js first.');
    process.exit(1);
  }

  // Extract Mara guidance once
  let maraGuidance = null;
  if (!SKIP_MARA) {
    maraGuidance = extractMaraGuidance(CYCLE);
    if (maraGuidance) console.log('  Found previous Mara guidance');
    else console.log('  No previous Mara guidance found (normal for first cycle)');
  }

  // Faith_Ledger digest (S180) — culture desk briefing consumer
  const faithDigest = readJsonIfExists(path.join(ROOT, 'output', `faith_digest_c${CYCLE}.json`));
  if (faithDigest) {
    console.log(`  Faith digest: ${faithDigest.totals.thisCycle} event(s) this cycle`);
  } else {
    console.log('  No faith digest found (run scripts/buildFaithDigest.js to generate)');
  }

  let totalFiles = 0;

  for (const desk of DESK_NAMES) {
    console.log(`\n--- ${desk} desk ---`);
    const deskDir = path.join(DESKS_DIR, desk);
    const currentDir = path.join(deskDir, 'current');
    const archiveDir = path.join(deskDir, 'archive');
    const referenceDir = path.join(deskDir, 'reference');
    const voiceStmtsDir = path.join(currentDir, 'voice_statements');
    const interviewsDir = path.join(currentDir, 'interviews');

    // Clean current/ if requested
    if (CLEAN && fs.existsSync(currentDir)) {
      fs.rmSync(currentDir, { recursive: true });
    }

    // Ensure directories
    ensureDir(currentDir);
    ensureDir(archiveDir);
    ensureDir(referenceDir);
    ensureDir(voiceStmtsDir);
    ensureDir(interviewsDir);

    let deskFiles = 0;

    // 1. Copy packets
    if (copyIfExists(path.join(PACKETS_DIR, `${desk}_c${CYCLE}.json`), path.join(currentDir, 'packet.json'))) {
      console.log(`  packet.json`);
      deskFiles++;
    } else {
      console.log(`  WARNING: No packet found for ${desk}_c${CYCLE}.json`);
    }

    if (copyIfExists(path.join(PACKETS_DIR, `${desk}_summary_c${CYCLE}.json`), path.join(currentDir, 'summary.json'))) {
      console.log(`  summary.json`);
      deskFiles++;
    }

    // base_context.json
    copyIfExists(path.join(PACKETS_DIR, 'base_context.json'), path.join(currentDir, 'base_context.json'));
    deskFiles++;

    // 2. Reference files
    copyIfExists(path.join(PACKETS_DIR, 'truesource_reference.json'), path.join(referenceDir, 'truesource.json'));
    copyIfExists(path.join(PACKETS_DIR, 'citizen_archive.json'), path.join(referenceDir, 'citizen_archive.json'));

    // 3. Archive — last 3 desk outputs
    for (let c = CYCLE - 1; c >= Math.max(CYCLE - 3, 1); c--) {
      const srcOutput = path.join(DESK_OUTPUT_DIR, `${desk}_c${c}.md`);
      if (copyIfExists(srcOutput, path.join(archiveDir, `${desk}_c${c}.md`))) {
        console.log(`  archive: ${desk}_c${c}.md`);
        deskFiles++;
      }
    }

    // Archive context from buildArchiveContext.js
    const archiveCtxSrc = path.join(BRIEFINGS_DIR, `${desk}_archive_c${CYCLE}.md`);
    if (copyIfExists(archiveCtxSrc, path.join(archiveDir, 'archive_context.md'))) {
      console.log(`  archive_context.md`);
      deskFiles++;
    }

    // 4. Errata
    const errataEntries = getErrataForDesk(desk);
    const errataMd = formatErrataMarkdown(errataEntries, desk);
    fs.writeFileSync(path.join(currentDir, 'errata.md'), errataMd);
    console.log(`  errata.md (${errataEntries.length} entries)`);
    deskFiles++;

    // 5. Mara guidance
    if (maraGuidance) {
      const deskMara = getMaraGuidanceForDesk(maraGuidance, desk);
      if (deskMara) {
        fs.writeFileSync(path.join(currentDir, 'mara_guidance.md'), `# Mara Forward Guidance — ${desk}\n\n${deskMara}\n`);
        console.log(`  mara_guidance.md`);
        deskFiles++;
      }
    }

    // 6. Voice statement distribution
    if (!SKIP_VOICE) {
      const voicesForDesk = VOICE_DISTRIBUTION[desk] || [];
      for (const office of voicesForDesk) {
        const voiceSrc = path.join(VOICE_DIR, `${office}_c${CYCLE}.json`);
        if (copyIfExists(voiceSrc, path.join(voiceStmtsDir, `${office}.json`))) {
          console.log(`  voice: ${office}.json`);
          deskFiles++;
        }
      }
    }

    // 7. Interview distribution
    if (fs.existsSync(INTERVIEWS_DIR)) {
      const interviewFiles = fs.readdirSync(INTERVIEWS_DIR).filter(f =>
        f.startsWith(`response_c${CYCLE}`) && f.endsWith('.json')
      );
      for (const iFile of interviewFiles) {
        // Check if interview is relevant to this desk
        const interview = readJsonIfExists(path.join(INTERVIEWS_DIR, iFile));
        if (interview && (interview.desk === desk || interview.desk === 'all' || !interview.desk)) {
          copyIfExists(path.join(INTERVIEWS_DIR, iFile), path.join(interviewsDir, iFile));
          console.log(`  interview: ${iFile}`);
          deskFiles++;
        }
      }
    }

    // 8. Generate briefing.md
    const summary = readJsonIfExists(path.join(currentDir, 'summary.json'));
    const deskMara = maraGuidance ? getMaraGuidanceForDesk(maraGuidance, desk) : null;
    const briefing = generateBriefing(desk, CYCLE, summary, baseContext, deskMara, errataEntries, faithDigest);
    fs.writeFileSync(path.join(currentDir, 'briefing.md'), briefing);
    console.log(`  briefing.md (generated)`);
    deskFiles++;

    // 9. Generate previous_grades.md from grade history
    const gradeHistoryPath = path.join(ROOT, 'output', 'grades', 'grade_history.json');
    if (fs.existsSync(gradeHistoryPath)) {
      try {
        const gradeHistory = JSON.parse(fs.readFileSync(gradeHistoryPath, 'utf-8'));
        const deskGrades = gradeHistory.desks && gradeHistory.desks[desk];
        if (deskGrades && deskGrades.editions && deskGrades.editions.length > 0) {
          let md = `# Previous Grades — ${desk.charAt(0).toUpperCase() + desk.slice(1)} Desk\n\n`;
          md += `## Rolling Average: ${deskGrades.rolling} | Trend: ${deskGrades.trend}\n\n`;
          md += `## Last ${deskGrades.editions.length} Edition(s)\n`;
          for (const ed of deskGrades.editions.slice().reverse()) {
            md += `- E${ed.cycle}: ${ed.grade} | ${ed.articles} articles, ${ed.criticalErrors} CRITICAL, ${ed.warnings} WARNING\n`;
          }
          // Add reporter grades for this desk
          const deskReporters = Object.entries(gradeHistory.reporters || {})
            .filter(([, r]) => r.desk === desk);
          if (deskReporters.length > 0) {
            md += `\n## Reporter Grades\n`;
            for (const [name, data] of deskReporters) {
              md += `- ${name}: ${data.current} (rolling ${data.rolling}, ${data.trend})`;
              if (data.editions && data.editions.length > 0) {
                const latest = data.editions[data.editions.length - 1];
                md += ` — ${latest.articles} article(s) in E${latest.cycle}`;
              }
              md += '\n';
            }
          }
          // Add roster recommendations
          const roster = gradeHistory.rosterRecommendations || {};
          const deskRoster = Object.entries(roster).filter(([, r]) => r.desk === desk);
          if (deskRoster.length > 0) {
            md += `\n## Roster Status\n`;
            for (const [name, rec] of deskRoster) {
              const icon = rec.status === 'star' ? 'STAR' :
                           rec.status === 'solid' ? 'SOLID' :
                           rec.status === 'watch' ? 'WATCH' :
                           rec.status === 'probation' ? 'PROBATION' : 'BENCH';
              md += `- ${name}: [${icon}] ${rec.rolling} — ${rec.note}\n`;
            }
          }
          // Include structured critiques from latest grade if available
          const latestGradePath = path.join(ROOT, 'output', 'grades');
          const gradeFiles = fs.existsSync(latestGradePath)
            ? fs.readdirSync(latestGradePath).filter(f => f.match(/^grades_c\d+\.json$/)).sort()
            : [];
          if (gradeFiles.length > 0) {
            try {
              const latestGrade = JSON.parse(fs.readFileSync(path.join(latestGradePath, gradeFiles[gradeFiles.length - 1]), 'utf-8'));
              const deskCritique = latestGrade.desks && latestGrade.desks[desk] && latestGrade.desks[desk].critique;
              if (deskCritique) {
                md += `\n## Editorial Critique (Last Edition)\n`;
                md += `**Assessment:** ${deskCritique.reasoning}\n\n`;
                if (deskCritique.strengths && deskCritique.strengths.length > 0) {
                  md += `**Strengths:** ${deskCritique.strengths.join('. ')}.\n\n`;
                }
                if (deskCritique.weaknesses && deskCritique.weaknesses.length > 0) {
                  md += `**Fix These:** ${deskCritique.weaknesses.join('. ')}.\n\n`;
                }
                if (deskCritique.directive) {
                  md += `**DIRECTIVE:** ${deskCritique.directive}\n\n`;
                }
              }
            } catch {}
          }

          md += `\n## What This Means\n`;
          md += `Use these grades and critiques to improve your output. The editorial critique above is specific feedback from the last edition — prioritize the DIRECTIVE.\n`;
          fs.writeFileSync(path.join(currentDir, 'previous_grades.md'), md);
          console.log(`  previous_grades.md (generated)`);
          deskFiles++;
        }
      } catch (e) {
        console.log(`  previous_grades.md (skipped: ${e.message})`);
      }
    }

    // 10. Copy latest exemplar if one exists
    const exemplarsDir = path.join(ROOT, 'output', 'grade-examples');
    if (fs.existsSync(exemplarsDir)) {
      const exemplarFiles = fs.readdirSync(exemplarsDir)
        .filter(f => f.startsWith(`${desk}_exemplar_c`) && f.endsWith('.md'))
        .sort();
      if (exemplarFiles.length > 0) {
        const latest = exemplarFiles[exemplarFiles.length - 1];
        const src = path.join(exemplarsDir, latest);
        fs.copyFileSync(src, path.join(currentDir, 'exemplar.md'));
        console.log(`  exemplar.md (from ${latest})`);
        deskFiles++;
      }
    }

    console.log(`  Total: ${deskFiles} files`);
    totalFiles += deskFiles;
  }

  console.log(`\n=== Done: ${totalFiles} files across ${DESK_NAMES.length} desks ===\n`);
}

main();
