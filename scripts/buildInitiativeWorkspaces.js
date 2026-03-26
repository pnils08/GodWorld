#!/usr/bin/env node
/**
 * buildInitiativeWorkspaces.js v1.0
 *
 * Populates per-initiative workspace folders for initiative project agents.
 * Each agent gets: initiative packet, base context, previous decisions,
 * previous documents, Mara directive, and a briefing.
 *
 * Run AFTER: buildDeskPackets.js, buildInitiativePackets.js
 * Run BEFORE: launching initiative agents.
 *
 * Usage: node scripts/buildInitiativeWorkspaces.js [cycleNumber] [--clean]
 */

const fs = require('fs');
const path = require('path');

// ─── CONFIG ──────────────────────────────────────────────
const getCurrentCycle = require('../lib/getCurrentCycle');
const CYCLE = getCurrentCycle();
const CLEAN = process.argv.includes('--clean');

const ROOT = path.resolve(__dirname, '..');
const WORKSPACE_DIR = path.join(ROOT, 'output/initiative-workspace');
const PACKETS_DIR = path.join(ROOT, 'output/desk-packets');
const INIT_PACKETS_DIR = path.join(ROOT, 'output/initiative-packets');
const CIVIC_DB_DIR = path.join(ROOT, 'output/city-civic-database/initiatives');
const MARA_DIR = path.join(ROOT, 'output');

const INITIATIVES = [
  { name: 'stabilization-fund', packetKey: 'stabilization_fund', shortName: 'stabilization_fund' },
  { name: 'oari', packetKey: 'oari', shortName: 'oari' },
  { name: 'health-center', packetKey: 'health_center', shortName: 'health_center' },
  { name: 'transit-hub', packetKey: 'transit_hub', shortName: 'transit_hub' },
  { name: 'baylight', packetKey: 'baylight', shortName: 'baylight' },
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
function generateInitiativeBriefing(init, cycle, baseContext, manifest) {
  let md = `# ${init.name} Briefing — Cycle ${cycle}\n\n`;

  if (baseContext) {
    md += `**Cycle ${cycle}** | ${baseContext.month || ''} ${baseContext.simYear || ''} | ${baseContext.season || ''}\n\n`;
  }

  // Initiative status from manifest
  if (manifest && manifest.packets && manifest.packets[init.packetKey]) {
    const info = manifest.packets[init.packetKey];
    md += `## Initiative Status\n`;
    md += `- **ID:** ${info.initiativeId}\n`;
    md += `- **Status:** ${info.status}\n`;
    md += `- **Affected Citizens:** ${info.citizenCount}\n`;
    md += `- **Neighborhoods:** ${info.neighborhoods}\n`;
    md += `- **Businesses:** ${info.businesses}\n`;
    md += `- **Previous Documents:** ${info.previousDocCount}\n`;
    md += `- **Has Previous Decisions:** ${info.hasPreviousDecisions}\n`;
    md += '\n';
  }

  // Council composition (for political context)
  if (baseContext && baseContext.canon) {
    const canon = baseContext.canon;

    if (canon.council && canon.council.length > 0) {
      md += `## Council Composition\n`;
      for (const member of canon.council) {
        md += `- ${member.member || member.name} — D${member.district}, ${member.faction || 'IND'}`;
        if (member.status && member.status !== 'active') md += ` (${member.status})`;
        md += '\n';
      }
      md += '\n';
    }

    if (canon.executiveBranch) {
      const eb = canon.executiveBranch;
      md += `## Executive Branch\n`;
      if (eb.mayor) md += `- Mayor: ${eb.mayor}\n`;
      if (eb.deputyMayor) md += `- Deputy Mayor: ${eb.deputyMayor}\n`;
      md += '\n';
    }

    // Related initiatives
    if (canon.initiatives && canon.initiatives.length > 0) {
      md += `## All Active Initiatives\n`;
      for (const i of canon.initiatives) {
        md += `- **${i.name || i.initiative}** — ${i.status || 'unknown'}`;
        if (i.budget) md += ` | ${i.budget}`;
        md += '\n';
      }
      md += '\n';
    }
  }

  // Mara directive
  const maraPath = path.join(MARA_DIR, `mara_directive_c${cycle - 1}.txt`);
  const maraContent = readIfExists(maraPath);
  if (maraContent) {
    const fwdMatch = maraContent.match(/FORWARD GUIDANCE[:\s]*\n([\s\S]*?)(?:\n#{1,3}\s|\n---|\Z)/i);
    if (fwdMatch) {
      md += `## Mara Forward Guidance\n${fwdMatch[1].trim()}\n\n`;
    }
  }

  return md;
}

// ─── MAIN ────────────────────────────────────────────────
function main() {
  console.log(`\n=== buildInitiativeWorkspaces.js v1.0 — Cycle ${CYCLE} ===\n`);

  // Load shared data
  const baseContext = readJsonIfExists(path.join(PACKETS_DIR, 'base_context.json'));
  if (!baseContext) {
    console.error('ERROR: base_context.json not found. Run buildDeskPackets.js first.');
    process.exit(1);
  }

  const manifest = readJsonIfExists(path.join(INIT_PACKETS_DIR, 'manifest.json'));
  if (!manifest) {
    console.error('WARNING: initiative manifest.json not found. Run buildInitiativePackets.js first.');
  }

  let totalFiles = 0;

  for (const init of INITIATIVES) {
    console.log(`\n--- ${init.name} ---`);
    const initDir = path.join(WORKSPACE_DIR, init.name);
    const currentDir = path.join(initDir, 'current');
    const archiveDir = path.join(initDir, 'archive');
    const referenceDir = path.join(initDir, 'reference');

    // Clean current/ if requested
    if (CLEAN && fs.existsSync(currentDir)) {
      fs.rmSync(currentDir, { recursive: true });
    }

    ensureDir(currentDir);
    ensureDir(archiveDir);
    ensureDir(referenceDir);

    let initFiles = 0;

    // 1. Initiative packet
    if (manifest && manifest.packets && manifest.packets[init.packetKey]) {
      const packetFile = manifest.packets[init.packetKey].file;
      if (copyIfExists(path.join(INIT_PACKETS_DIR, packetFile), path.join(currentDir, 'packet.json'))) {
        console.log(`  packet.json`);
        initFiles++;
      }
    }

    // 2. Base context
    copyIfExists(path.join(PACKETS_DIR, 'base_context.json'), path.join(currentDir, 'base_context.json'));
    console.log(`  base_context.json`);
    initFiles++;

    // 3. Previous decisions (last 3 cycles)
    const civicInitDir = path.join(CIVIC_DB_DIR, init.name);
    if (fs.existsSync(civicInitDir)) {
      for (let c = CYCLE - 1; c >= Math.max(CYCLE - 3, 1); c--) {
        const decSrc = path.join(civicInitDir, `decisions_c${c}.json`);
        if (copyIfExists(decSrc, path.join(archiveDir, `decisions_c${c}.json`))) {
          console.log(`  archive: decisions_c${c}.json`);
          initFiles++;
        }
      }

      // Copy all previous documents to reference/
      const allFiles = fs.readdirSync(civicInitDir).filter(f =>
        f.endsWith('.md') || (f.endsWith('.json') && !f.startsWith('decisions_c'))
      );
      for (const f of allFiles) {
        if (copyIfExists(path.join(civicInitDir, f), path.join(referenceDir, f))) {
          initFiles++;
        }
      }
      if (allFiles.length > 0) {
        console.log(`  reference/ (${allFiles.length} prior documents)`);
      }
    }

    // 4. Generate briefing
    const briefing = generateInitiativeBriefing(init, CYCLE, baseContext, manifest);
    fs.writeFileSync(path.join(currentDir, 'briefing.md'), briefing);
    console.log(`  briefing.md (generated)`);
    initFiles++;

    console.log(`  Total: ${initFiles} files`);
    totalFiles += initFiles;
  }

  console.log(`\n=== Done: ${totalFiles} files across ${INITIATIVES.length} initiatives ===\n`);
}

main();
