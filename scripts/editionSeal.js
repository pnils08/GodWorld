#!/usr/bin/env node
/*
 * editionSeal.js — G-W4 measurement-integrity gate (governance.33 RB-track, S256).
 *
 * Problem (C96 G-W4): the operator hand-edited the compiled edition + reporter
 * articles BEFORE the review lanes ran. The lanes then measured a laundered
 * hybrid, not the raw generation — destroying the signal the lanes exist to
 * produce. The raw files are gitignored scratch, so the pre-edit is
 * unrecoverable AND undetectable after the fact.
 *
 * Fix: hash the raw artifacts at compile-complete (--seal). Verify the hashes
 * at the entry to the first review lane and again at the Final Arbiter
 * (--verify). The invariant that makes the detector trivial:
 *
 *     every SANCTIONED change (a lane REVISE round) re-seals the files it
 *     touched; therefore any verify-time hash mismatch with no matching
 *     re-seal is an UN-SANCTIONED operator pre-edit.
 *
 * Detector (this script) = pure hash-diff. Framer (write-edition SKILL + the
 * Final Arbiter) = the discipline that REVISE rounds re-seal, and the policy
 * that an un-sanctioned edit flags the run `measurementIntegrity: contaminated`
 * (flag, NOT block — Mike's call S256; the edition stays publishable, but the
 * run is marked not-a-clean-measurement so research-build doesn't mine
 * contaminated lane findings as raw-generation signal).
 *
 * Modes:
 *   node scripts/editionSeal.js --seal   --cycle XX [--reason compile|revise:<lane>-r<n>]
 *   node scripts/editionSeal.js --verify --cycle XX [--gate <name>]
 *
 * --seal   re-hashes every target file. A file whose hash CHANGED from the
 *          prior manifest gets the new --reason; an UNCHANGED file keeps its
 *          prior reason. So `--seal --reason revise:rhea-r1` after a Rhea fix
 *          naturally re-attributes only the files that fix actually touched.
 *          First seal (--reason compile) stamps every file `compile`.
 *
 * --verify re-hashes every target file, diffs against the manifest, writes
 *          output/edition_seal_verify_c{XX}.json. A changed file = UNSANCTIONED
 *          (any sanctioned change would have re-sealed → match). Exit 0 in both
 *          clean and contaminated cases (flag-not-block); a loud WARNING prints
 *          on contamination. --gate labels the checkpoint in the result file.
 *
 * Manifest: output/edition_seal_c{XX}.json
 *   { cycle, sealedAt, lastReason, files: { <path>: {sha256, reason, stampedAt} } }
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'output');
const EDITIONS_DIR = path.join(ROOT, 'editions');

function parseArgs(argv) {
  const a = { mode: null, cycle: null, reason: null, gate: null };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--seal') a.mode = 'seal';
    else if (t === '--verify') a.mode = 'verify';
    else if (t === '--cycle') a.cycle = String(argv[++i]).replace(/^c/i, '');
    else if (t === '--reason') a.reason = argv[++i];
    else if (t === '--gate') a.gate = argv[++i];
  }
  return a;
}

function manifestPath(cycle) {
  return path.join(OUTPUT_DIR, `edition_seal_c${cycle}.json`);
}
function verifyPath(cycle) {
  return path.join(OUTPUT_DIR, `edition_seal_verify_c${cycle}.json`);
}

function sha256(absPath) {
  const buf = fs.readFileSync(absPath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// Repo-relative key so the manifest is portable + readable.
function relKey(absPath) {
  return path.relative(ROOT, absPath);
}

/*
 * Target set = the raw artifacts the review lanes measure:
 *   - the compiled edition .txt  (editions/cycle_pulse_edition_{XX}.txt)
 *   - every reporter article      (output/reporters/<reporter>/articles/c{XX}_*.md)
 *   - any dispatch outputPath     (belt-and-suspenders; unioned + deduped)
 * Globbed from disk so the set doesn't depend on dispatch's heterogeneous
 * shape (letters is an object, quickTakes an array, QT reporter may be null).
 */
function collectTargets(cycle) {
  const targets = new Set();

  // 1. Compiled edition .txt
  const editionTxt = path.join(EDITIONS_DIR, `cycle_pulse_edition_${cycle}.txt`);
  if (fs.existsSync(editionTxt)) targets.add(editionTxt);

  // 2. Reporter articles for this cycle
  const reportersDir = path.join(OUTPUT_DIR, 'reporters');
  if (fs.existsSync(reportersDir)) {
    for (const reporter of fs.readdirSync(reportersDir)) {
      const artDir = path.join(reportersDir, reporter, 'articles');
      if (!fs.existsSync(artDir)) continue;
      for (const f of fs.readdirSync(artDir)) {
        if (f.startsWith(`c${cycle}_`) && f.endsWith('.md')) {
          targets.add(path.join(artDir, f));
        }
      }
    }
  }

  // 3. Dispatch outputPaths (union — catches anything outside the glob)
  const dispatchFile = path.join(OUTPUT_DIR, `dispatch_c${cycle}.json`);
  if (fs.existsSync(dispatchFile)) {
    try {
      const d = JSON.parse(fs.readFileSync(dispatchFile, 'utf8'));
      const pools = [];
      if (Array.isArray(d.articles)) pools.push(...d.articles);
      if (Array.isArray(d.quickTakes)) pools.push(...d.quickTakes);
      if (Array.isArray(d.letters)) pools.push(...d.letters);
      for (const e of pools) {
        if (e && e.outputPath) {
          const abs = path.isAbsolute(e.outputPath) ? e.outputPath : path.join(ROOT, e.outputPath);
          if (fs.existsSync(abs)) targets.add(abs);
        }
      }
    } catch (_) { /* dispatch unreadable — glob set still valid */ }
  }

  return [...targets].sort();
}

function loadManifest(cycle) {
  const p = manifestPath(cycle);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}

function doSeal(cycle, reason) {
  const stamp = new Date().toISOString();
  reason = reason || 'compile';
  const prior = loadManifest(cycle);
  const priorFiles = (prior && prior.files) || {};
  const targets = collectTargets(cycle);

  if (targets.length === 0) {
    console.error(`[editionSeal] --seal c${cycle}: no target files found (edition .txt / reporter articles). Nothing sealed.`);
    process.exit(1);
  }

  const files = {};
  let changed = 0;
  for (const abs of targets) {
    const key = relKey(abs);
    const hash = sha256(abs);
    const was = priorFiles[key];
    if (was && was.sha256 === hash) {
      // unchanged → keep prior reason/stamp
      files[key] = was;
    } else {
      files[key] = { sha256: hash, reason, stampedAt: stamp };
      changed++;
    }
  }

  const manifest = { cycle: Number(cycle), sealedAt: stamp, lastReason: reason, files };
  fs.writeFileSync(manifestPath(cycle), JSON.stringify(manifest, null, 2));
  console.log(`[editionSeal] SEALED c${cycle} (${reason}): ${targets.length} files, ${changed} (re)hashed → ${relKey(manifestPath(cycle))}`);
}

function doVerify(cycle, gate) {
  const stamp = new Date().toISOString();
  const manifest = loadManifest(cycle);
  const checkpoint = gate || 'unspecified';

  if (!manifest) {
    // No seal → cannot measure. Record unsealed (Arbiter treats as non-clean-but-not-contaminated).
    const result = { cycle: Number(cycle), checkpoint, verifiedAt: stamp, status: 'unsealed', clean: null, files: [], unsanctioned: [] };
    fs.writeFileSync(verifyPath(cycle), JSON.stringify(result, null, 2));
    console.warn(`[editionSeal] --verify c${cycle} @${checkpoint}: NO SEAL manifest found — run --seal at compile. Recorded status=unsealed.`);
    process.exit(0);
  }

  const targets = collectTargets(cycle);
  const targetKeys = new Set(targets.map(relKey));
  const files = [];
  const unsanctioned = [];

  // Check every currently-present target against the manifest.
  for (const abs of targets) {
    const key = relKey(abs);
    const hash = sha256(abs);
    const rec = manifest.files[key];
    if (!rec) {
      files.push({ path: key, status: 'new-unsealed' });
      unsanctioned.push({ path: key, status: 'new-unsealed' });
    } else if (rec.sha256 === hash) {
      files.push({ path: key, status: 'unchanged', reason: rec.reason });
    } else {
      files.push({ path: key, status: 'UNSANCTIONED', sealedReason: rec.reason });
      unsanctioned.push({ path: key, status: 'UNSANCTIONED', sealedReason: rec.reason });
    }
  }
  // A sealed file that vanished from disk is also an integrity break.
  for (const key of Object.keys(manifest.files)) {
    if (!targetKeys.has(key)) {
      files.push({ path: key, status: 'missing' });
      unsanctioned.push({ path: key, status: 'missing' });
    }
  }

  const clean = unsanctioned.length === 0;
  const result = {
    cycle: Number(cycle), checkpoint, verifiedAt: stamp,
    status: clean ? 'clean' : 'contaminated', clean,
    files, unsanctioned,
  };
  fs.writeFileSync(verifyPath(cycle), JSON.stringify(result, null, 2));

  if (clean) {
    console.log(`[editionSeal] VERIFY c${cycle} @${checkpoint}: CLEAN (${files.length} files match seal).`);
  } else {
    console.warn(`\n[editionSeal] ⚠️  VERIFY c${cycle} @${checkpoint}: MEASUREMENT CONTAMINATED`);
    console.warn(`  ${unsanctioned.length} un-sanctioned change(s) between compile and ${checkpoint}:`);
    for (const u of unsanctioned) console.warn(`    - ${u.path} [${u.status}]`);
    console.warn(`  These edits were NOT routed from a lane REVISE verdict. The lane signal for c${cycle} measures a hand-edited hybrid, not raw generation (G-W4).`);
    console.warn(`  Flag-not-block (S256): pipeline continues; Final Arbiter will mark measurementIntegrity=contaminated. Re-seal after a legit REVISE round to clear.\n`);
  }
  // Flag-not-block: always exit 0. The Arbiter consumes the result file.
  process.exit(0);
}

function main() {
  const a = parseArgs(process.argv);
  if (!a.mode || !a.cycle) {
    console.error('Usage: editionSeal.js --seal|--verify --cycle XX [--reason <r>] [--gate <name>]');
    process.exit(2);
  }
  if (a.mode === 'seal') doSeal(a.cycle, a.reason);
  else doVerify(a.cycle, a.gate);
}

main();
