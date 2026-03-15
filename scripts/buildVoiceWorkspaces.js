#!/usr/bin/env node
/**
 * buildVoiceWorkspaces.js v1.0
 *
 * Populates per-agent workspace folders for civic voice agents.
 * Each agent gets: base context, previous statements, mayor statements (for non-mayor),
 * initiative data, and a briefing with current events needing response.
 *
 * Run AFTER: buildDeskPackets.js (needs base_context.json)
 * Run BEFORE: launching civic voice agents.
 *
 * Usage: node scripts/buildVoiceWorkspaces.js [cycleNumber] [--clean]
 */

const fs = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────
const CYCLE = parseInt(process.argv[2]) || 87;
const CLEAN = process.argv.includes('--clean');

const ROOT = path.resolve(__dirname, '..');
const WORKSPACE_DIR = path.join(ROOT, 'output/civic-voice-workspace');
const PACKETS_DIR = path.join(ROOT, 'output/desk-packets');
const VOICE_DIR = path.join(ROOT, 'output/civic-voice');
const INIT_PACKETS_DIR = path.join(ROOT, 'output/initiative-packets');
const MARA_DIR = path.join(ROOT, 'output');

const AGENTS = [
  { name: 'civic-office-mayor', shortName: 'mayor', voiceFile: 'mayor' },
  { name: 'civic-office-opp-faction', shortName: 'opp_faction', voiceFile: 'opp_faction' },
  { name: 'civic-office-crc-faction', shortName: 'crc_faction', voiceFile: 'crc_faction' },
  { name: 'civic-office-ind-swing', shortName: 'ind_swing', voiceFile: 'ind_swing' },
  { name: 'civic-office-police-chief', shortName: 'police_chief', voiceFile: 'police_chief' },
  { name: 'civic-office-baylight-authority', shortName: 'baylight_authority', voiceFile: 'baylight_authority' },
  { name: 'civic-office-district-attorney', shortName: 'district_attorney', voiceFile: 'district_attorney' },
];

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

// ─── BRIEFING GENERATOR ─────────────────────────────────
function generateVoiceBriefing(agent, cycle, baseContext) {
  let md = `# ${agent.name} Briefing — Cycle ${cycle}\n\n`;

  if (baseContext) {
    md += `**Cycle ${cycle}** | ${baseContext.month || ''} ${baseContext.simYear || ''} | ${baseContext.season || ''}\n\n`;
  }

  // Events that need response
  if (baseContext && baseContext.canon) {
    const canon = baseContext.canon;

    // Initiatives — always relevant to voice agents
    if (canon.initiatives && canon.initiatives.length > 0) {
      md += `## Active Initiatives\n`;
      for (const init of canon.initiatives) {
        md += `- **${init.name || init.initiative}** — Status: ${init.status || 'unknown'}`;
        if (init.budget) md += ` | Budget: ${init.budget}`;
        if (init.vote) md += ` | Vote: ${init.vote}`;
        md += '\n';
      }
      md += '\n';
    }

    // Recent vote outcomes
    if (canon.recentOutcomes && canon.recentOutcomes.length > 0) {
      md += `## Recent Vote Outcomes\n`;
      for (const outcome of canon.recentOutcomes) {
        md += `- **${outcome.initiative || outcome.name}** — ${outcome.result || outcome.status}`;
        if (outcome.vote) md += ` (${outcome.vote})`;
        if (outcome.notes) md += `\n  Notes: ${outcome.notes}`;
        md += '\n';
      }
      md += '\n';
    }

    // Pending votes
    if (canon.pendingVotes && canon.pendingVotes.length > 0) {
      md += `## Pending Votes\n`;
      for (const pv of canon.pendingVotes) {
        md += `- **${pv.initiative || pv.name}** — ${pv.status || 'pending'}`;
        if (pv.projectedOutcome) md += ` | Projected: ${pv.projectedOutcome}`;
        md += '\n';
      }
      md += '\n';
    }

    // Council composition (for political context)
    if (canon.council && canon.council.length > 0) {
      md += `## Council Composition\n`;
      for (const member of canon.council) {
        md += `- ${member.member || member.name} — D${member.district}, ${member.faction || 'IND'}`;
        if (member.status && member.status !== 'active') md += ` (${member.status})`;
        md += '\n';
      }
      md += '\n';
    }

    // Executive branch
    if (canon.executiveBranch) {
      const eb = canon.executiveBranch;
      md += `## Executive Branch\n`;
      if (eb.mayor) md += `- Mayor: ${eb.mayor}\n`;
      if (eb.deputyMayor) md += `- Deputy Mayor: ${eb.deputyMayor}\n`;
      if (eb.chiefOfStaff) md += `- Chief of Staff: ${eb.chiefOfStaff}\n`;
      md += '\n';
    }
  }

  // City events from base_context
  if (baseContext && baseContext.events && baseContext.events.length > 0) {
    md += `## City Events This Cycle\n`;
    const topEvents = baseContext.events
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .slice(0, 8);
    for (const e of topEvents) {
      md += `- ${e.name || e.title || e.description}`;
      if (e.neighborhood) md += ` (${e.neighborhood})`;
      md += '\n';
    }
    md += '\n';
  }

  // Mara directive (previous cycle's forward guidance)
  const maraPath = path.join(MARA_DIR, `mara_directive_c${cycle - 1}.txt`);
  const maraContent = readIfExists(maraPath);
  if (maraContent) {
    const fwdMatch = maraContent.match(/FORWARD GUIDANCE[:\s]*\n([\s\S]*?)(?:\n#{1,3}\s|\n---|\Z)/i);
    if (fwdMatch) {
      md += `## Mara Forward Guidance (Previous Cycle)\n${fwdMatch[1].trim()}\n\n`;
    }
  }

  return md;
}

// ─── MAIN ────────────────────────────────────────────────
function main() {
  console.log(`\n=== buildVoiceWorkspaces.js v1.0 — Cycle ${CYCLE} ===\n`);

  // Load base context
  const baseContext = readJsonIfExists(path.join(PACKETS_DIR, 'base_context.json'));
  if (!baseContext) {
    console.error('ERROR: base_context.json not found. Run buildDeskPackets.js first.');
    process.exit(1);
  }

  let totalFiles = 0;

  for (const agent of AGENTS) {
    console.log(`\n--- ${agent.name} ---`);
    const agentDir = path.join(WORKSPACE_DIR, agent.name);
    const currentDir = path.join(agentDir, 'current');
    const archiveDir = path.join(agentDir, 'archive');

    // Clean current/ if requested
    if (CLEAN && fs.existsSync(currentDir)) {
      fs.rmSync(currentDir, { recursive: true });
    }

    ensureDir(currentDir);
    ensureDir(archiveDir);

    let agentFiles = 0;

    // 1. Base context
    copyIfExists(path.join(PACKETS_DIR, 'base_context.json'), path.join(currentDir, 'base_context.json'));
    console.log(`  base_context.json`);
    agentFiles++;

    // 2. Previous statements by this agent (archive last 3)
    for (let c = CYCLE - 1; c >= Math.max(CYCLE - 3, 1); c--) {
      const stmtSrc = path.join(VOICE_DIR, `${agent.voiceFile}_c${c}.json`);
      if (copyIfExists(stmtSrc, path.join(archiveDir, `${agent.voiceFile}_c${c}.json`))) {
        console.log(`  archive: ${agent.voiceFile}_c${c}.json`);
        agentFiles++;
      }
    }

    // 3. Mayor's statements for non-mayor agents (they react to the mayor)
    if (agent.shortName !== 'mayor') {
      const mayorStmt = path.join(VOICE_DIR, `mayor_c${CYCLE}.json`);
      if (copyIfExists(mayorStmt, path.join(currentDir, 'mayor_statements.json'))) {
        console.log(`  mayor_statements.json (current cycle)`);
        agentFiles++;
      } else {
        // Try previous cycle
        const prevMayor = path.join(VOICE_DIR, `mayor_c${CYCLE - 1}.json`);
        if (copyIfExists(prevMayor, path.join(currentDir, 'mayor_statements.json'))) {
          console.log(`  mayor_statements.json (previous cycle, current not available)`);
          agentFiles++;
        }
      }
    }

    // 4. Initiative packets (relevant to all voice agents)
    const manifest = readJsonIfExists(path.join(INIT_PACKETS_DIR, 'manifest.json'));
    if (manifest && manifest.packets) {
      ensureDir(path.join(currentDir, 'initiative_packets'));
      for (const [key, info] of Object.entries(manifest.packets)) {
        const src = path.join(INIT_PACKETS_DIR, info.file);
        if (copyIfExists(src, path.join(currentDir, 'initiative_packets', info.file))) {
          agentFiles++;
        }
      }
      console.log(`  initiative_packets/ (${Object.keys(manifest.packets).length} files)`);
    }

    // 4b. Initiative agent decisions (pending authorizations, escalations)
    // Voice agents read these to make binding decisions (Mayor authorizes, factions react)
    const CIVIC_DB = path.join(ROOT, 'output/city-civic-database/initiatives');
    const initDirs = ['stabilization-fund', 'oari', 'transit-hub', 'health-center', 'baylight'];
    let decisionsCount = 0;
    ensureDir(path.join(currentDir, 'initiative_decisions'));
    for (const init of initDirs) {
      // Copy most recent decisions JSON
      const decisionsFile = path.join(CIVIC_DB, init, `decisions_c${CYCLE}.json`);
      if (copyIfExists(decisionsFile, path.join(currentDir, 'initiative_decisions', `${init}_decisions_c${CYCLE}.json`))) {
        decisionsCount++;
        agentFiles++;
      }
      // Also check previous cycle (in case initiative agents haven't run yet this cycle)
      const prevDecisions = path.join(CIVIC_DB, init, `decisions_c${CYCLE - 1}.json`);
      if (copyIfExists(prevDecisions, path.join(currentDir, 'initiative_decisions', `${init}_decisions_c${CYCLE - 1}.json`))) {
        decisionsCount++;
        agentFiles++;
      }
    }
    if (decisionsCount > 0) {
      console.log(`  initiative_decisions/ (${decisionsCount} files)`);
    }

    // 5. Generate briefing
    const briefing = generateVoiceBriefing(agent, CYCLE, baseContext);
    fs.writeFileSync(path.join(currentDir, 'briefing.md'), briefing);
    console.log(`  briefing.md (generated)`);
    agentFiles++;

    console.log(`  Total: ${agentFiles} files`);
    totalFiles += agentFiles;
  }

  console.log(`\n=== Done: ${totalFiles} files across ${AGENTS.length} voice agents ===\n`);
}

main();
