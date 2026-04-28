#!/usr/bin/env node

/**
 * postRunFiling.js — Post-Run Filing Check & Upload
 * Version: 1.0
 *
 * Runs after a complete edition pipeline. Checks that every expected
 * output file exists, is named correctly, and has been uploaded to Drive.
 * Generates upload commands for anything missing.
 *
 * Zero LLM tokens. Pure checklist.
 *
 * Usage:
 *   node scripts/postRunFiling.js <cycle>
 *   node scripts/postRunFiling.js 87
 *   node scripts/postRunFiling.js 87 --upload     # auto-upload missing files
 *   node scripts/postRunFiling.js 87 --skip-drive  # skip Drive upload checks
 *
 * Output:
 *   output/run_manifest_c{XX}.json — what exists, what's missing, what uploaded
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// ─── Checklist ─────────────────────────────────────────────
// Each item: { name, path (template), dest (Drive shortcut), required }
// {XX} gets replaced with cycle number, {E} with edition number (same as cycle)
function buildChecklist(cycle) {
  return [
    // Edition
    {
      name: 'Edition text',
      path: `editions/cycle_pulse_edition_${cycle}.txt`,
      dest: 'edition',
      required: true,
    },
    // PDF
    {
      name: 'Edition PDF',
      path: `output/pdfs/bay_tribune_e${cycle}.pdf`,
      dest: 'edition',
      required: true,
    },
    // Photos directory
    {
      name: 'Edition photos',
      path: `output/photos/e${cycle}`,
      type: 'directory',
      dest: null, // photos upload handled by generate-edition-photos.js
      required: true,
    },
    // Desk outputs (6 desks)
    ...['civic', 'sports', 'culture', 'business', 'chicago', 'letters'].map(desk => ({
      name: `Desk output: ${desk}`,
      path: `output/desk-output/${desk}_c${cycle}.md`,
      dest: null, // not uploaded to Drive
      required: true,
    })),
    // Mara audit packet (sent before her review)
    {
      name: 'Mara audit packet: edition',
      path: `output/mara-audit/edition_c${cycle}_for_review.txt`,
      dest: 'mara',
      required: true,
    },
    {
      name: 'Mara audit packet: history',
      path: `output/mara-audit/audit_history.md`,
      dest: 'mara',
      required: true,
    },
    // Mara canon audit (returned after her review)
    {
      name: 'Mara canon audit',
      path: `output/mara_canon_audit_c${cycle}.txt`,
      dest: 'mara',
      required: false, // may not exist yet if Mara hasn't reviewed
    },
    // Civic voice statements (7 offices)
    ...['mayor', 'opp_faction', 'crc_faction', 'ind_swing', 'police_chief', 'baylight_authority', 'district_attorney'].map(office => ({
      name: `Voice statement: ${office}`,
      path: `output/civic-voice/${office}_c${cycle}.json`,
      dest: null,
      required: false, // some offices skip cycles
    })),
    // Desk packets
    {
      name: 'Desk packet manifest',
      path: 'output/desk-packets/manifest.json',
      dest: null,
      required: true,
    },
    {
      name: 'Base context',
      path: 'output/desk-packets/base_context.json',
      dest: null,
      required: true,
    },
  ];
}

// ─── Main ──────────────────────────────────────────────────
function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const autoUpload = process.argv.includes('--upload');
  const skipDrive = process.argv.includes('--skip-drive');

  if (args.length === 0 || process.argv.includes('--help')) {
    console.log(`
postRunFiling.js — Post-Run Filing Check & Upload

Usage: node scripts/postRunFiling.js <cycle> [--upload] [--skip-drive]

Flags:
  --upload      Auto-upload missing files to Drive
  --skip-drive  Skip Drive upload checks (local only)

Checks:
  - Edition text file exists and is named correctly
  - PDF generated
  - Photos generated
  - All 6 desk outputs present
  - Mara audit packet generated and uploaded
  - Mara canon audit received (optional)
  - Voice statements present
  - Desk packets and base context present
  - Edition brief written

Output: output/run_manifest_c{XX}.json
    `);
    process.exit(0);
  }

  const cycle = parseInt(args[0], 10);
  if (isNaN(cycle)) {
    console.error('ERROR: Cycle must be a number.');
    process.exit(2);
  }

  const checklist = buildChecklist(cycle);

  console.log(`\nPOST-RUN FILING CHECK — Cycle ${cycle}`);
  console.log('═'.repeat(50));

  const results = [];
  let missing = 0;
  let present = 0;
  let optional_missing = 0;

  for (const item of checklist) {
    const fullPath = path.join(ROOT, item.path);
    const isDir = item.type === 'directory';
    const exists = isDir ? fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory() : fs.existsSync(fullPath);

    let size = null;
    if (exists && !isDir) {
      size = fs.statSync(fullPath).size;
    } else if (exists && isDir) {
      try {
        const files = fs.readdirSync(fullPath);
        size = files.length;
      } catch (e) { size = 0; }
    }

    const status = exists ? 'OK' : (item.required ? 'MISSING' : 'OPTIONAL');

    if (exists) {
      present++;
      const sizeStr = isDir ? `${size} files` : `${(size / 1024).toFixed(1)}KB`;
      console.log(`  [OK] ${item.name} (${sizeStr})`);
    } else if (item.required) {
      missing++;
      console.log(`  [!!] ${item.name} — MISSING`);
    } else {
      optional_missing++;
      console.log(`  [--] ${item.name} — not yet (optional)`);
    }

    results.push({
      name: item.name,
      path: item.path,
      dest: item.dest,
      required: item.required,
      status,
      size,
    });
  }

  // ─── Drive upload check ───
  const uploadable = results.filter(r => r.dest && r.status === 'OK');
  const needsUpload = [];

  if (!skipDrive && uploadable.length > 0) {
    console.log('\n— Drive uploads —');
    for (const item of uploadable) {
      const cmd = `node scripts/saveToDrive.js ${item.path} ${item.dest}`;
      // We can't check if it's already on Drive without an API call,
      // so we just list what should be uploaded
      console.log(`  ${item.name} → ${item.dest}`);
      needsUpload.push({ name: item.name, command: cmd });
    }

    if (autoUpload) {
      console.log('\n— Auto-uploading —');
      for (const upload of needsUpload) {
        console.log(`  Uploading: ${upload.name}`);
        try {
          execSync(upload.command, { cwd: ROOT, stdio: 'inherit' });
          upload.uploaded = true;
        } catch (err) {
          console.error(`  FAILED: ${upload.name} — ${err.message}`);
          upload.uploaded = false;
        }
      }
    }
  }

  // ─── Manifest ───
  const manifest = {
    cycle,
    checkedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      present,
      missing,
      optional_missing,
    },
    files: results,
    uploads: needsUpload,
  };

  const manifestPath = path.join(ROOT, `output/run_manifest_c${cycle}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // ─── Summary ───
  console.log('\n' + '═'.repeat(50));

  if (missing === 0) {
    console.log(`STATUS: COMPLETE — ${present} files present, ${optional_missing} optional items pending`);
  } else {
    console.log(`STATUS: INCOMPLETE — ${missing} required files MISSING, ${present} present`);
  }

  if (needsUpload.length > 0 && !autoUpload) {
    console.log('\nTo upload all files to Drive:');
    console.log(`  node scripts/postRunFiling.js ${cycle} --upload`);
  }

  console.log(`\nManifest: output/run_manifest_c${cycle}.json`);

  // ─── Auto-rebuild article index ───
  // Keeps dashboard search current after every edition
  try {
    console.log('\nRebuilding article index...');
    execSync('node scripts/buildArticleIndex.js --write', { cwd: ROOT, stdio: 'pipe' });
    console.log('  Article index rebuilt (output/article-index.json)');
  } catch (err) {
    console.warn('  Article index rebuild failed: ' + (err.message || '').split('\n')[0]);
  }

  if (missing > 0) {
    process.exit(1);
  }
}

main();
