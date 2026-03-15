#!/usr/bin/env node

/**
 * buildMaraPacket.js — Generate Mara Vance's Canon Audit Packet
 * Version: 1.0
 *
 * Bundles the edition draft (clean, no engine context) for Mara's review.
 * Mara reads the edition like a reader who knows the city. She does NOT
 * get engine output, desk packets, Rhea's report, or validation results.
 *
 * What gets bundled:
 *   - Edition draft (full text)
 *   - AUDIT_HISTORY.md (her institutional memory)
 *
 * What Mara already has in her claude.ai project:
 *   - Past 8 editions
 *   - Media rosters, civic rosters, civic initiatives
 *   - Her operating manual and system prompt
 *
 * After generation, upload to Drive:
 *   node scripts/saveToDrive.js output/mara-audit/edition_c{XX}_for_review.txt mara
 *
 * Usage:
 *   node scripts/buildMaraPacket.js <cycle> <edition-file>
 *   node scripts/buildMaraPacket.js 87 editions/cycle_pulse_edition_87.txt
 *
 * Output:
 *   output/mara-audit/edition_c{XX}_for_review.txt   — clean edition text
 *   output/mara-audit/audit_history.md                — current AUDIT_HISTORY.md
 *   output/mara-audit/manifest.json                   — what's in the packet
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AUDIT_HISTORY = path.join(ROOT, 'docs/mara-vance/AUDIT_HISTORY.md');
const OUTPUT_DIR = path.join(ROOT, 'output/mara-audit');

function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));

  if (args.length < 2 || process.argv.includes('--help')) {
    console.log(`
buildMaraPacket.js — Generate Mara Vance's Canon Audit Packet

Usage: node scripts/buildMaraPacket.js <cycle> <edition-file>

Example:
  node scripts/buildMaraPacket.js 87 editions/cycle_pulse_edition_87.txt

Output: output/mara-audit/
  edition_c{XX}_for_review.txt  — clean edition (no engine context)
  audit_history.md              — Mara's institutional memory
  manifest.json                 — packet contents

Then upload:
  node scripts/saveToDrive.js output/mara-audit/edition_c{XX}_for_review.txt mara
  node scripts/saveToDrive.js output/mara-audit/audit_history.md mara
    `);
    process.exit(0);
  }

  const cycle = parseInt(args[0], 10);
  const editionFile = path.resolve(args[1]);

  if (isNaN(cycle)) {
    console.error('ERROR: Cycle must be a number.');
    process.exit(2);
  }

  // Validate edition file
  if (!fs.existsSync(editionFile)) {
    console.error(`ERROR: Edition file not found: ${editionFile}`);
    process.exit(2);
  }

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`\nBUILDING MARA AUDIT PACKET — Cycle ${cycle}`);
  console.log('═'.repeat(50));

  const files = [];

  // 1. Copy edition (clean — just the newspaper)
  const editionText = fs.readFileSync(editionFile, 'utf-8');
  const editionDest = path.join(OUTPUT_DIR, `edition_c${cycle}_for_review.txt`);
  fs.writeFileSync(editionDest, editionText);
  console.log(`  [+] Edition: ${path.basename(editionFile)} (${editionText.length} chars)`);
  files.push({ name: `edition_c${cycle}_for_review.txt`, type: 'edition', source: editionFile });

  // 2. Copy AUDIT_HISTORY.md (her memory)
  if (fs.existsSync(AUDIT_HISTORY)) {
    const auditText = fs.readFileSync(AUDIT_HISTORY, 'utf-8');
    const auditDest = path.join(OUTPUT_DIR, 'audit_history.md');
    fs.writeFileSync(auditDest, auditText);
    console.log(`  [+] Audit history: ${auditText.split('\n').length} lines`);
    files.push({ name: 'audit_history.md', type: 'audit_history', source: AUDIT_HISTORY });
  } else {
    console.log('  [!] AUDIT_HISTORY.md not found — Mara will work from project memory only');
  }

  // 3. Write manifest
  const manifest = {
    cycle,
    generatedAt: new Date().toISOString(),
    purpose: 'Mara Vance Canon Audit — clean edition for editorial review',
    note: 'No engine context, no validation results, no Rhea report. Mara reads as a reader.',
    files,
    uploadCommands: [
      `node scripts/saveToDrive.js output/mara-audit/edition_c${cycle}_for_review.txt mara`,
      `node scripts/saveToDrive.js output/mara-audit/audit_history.md mara`,
    ],
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('  [+] Manifest written');

  console.log('\n' + '═'.repeat(50));
  console.log(`PACKET READY — ${files.length} files in output/mara-audit/`);
  console.log('\nUpload to Drive:');
  for (const cmd of manifest.uploadCommands) {
    console.log(`  ${cmd}`);
  }
  console.log('\nMara reviews on claude.ai. Her canon audit comes back as output/mara_canon_audit_c' + cycle + '.txt');
}

main();
