#!/usr/bin/env node
/**
 * ============================================================================
 * Edition Photo Generator v3.0 — DJ-Direction Mode
 * ============================================================================
 *
 * Stage 2 of the rebuilt photo pipeline (Phase 21.3, S188 — T6).
 *
 * Reads `output/photos/e<XX>/dj_direction.json` produced by `djDirect.js` +
 * the dj-hartley subagent, and generates one image per spec via Together AI
 * (FLUX.1-dev). The image_prompt from each spec is passed verbatim — no
 * internal prompt synthesis.
 *
 * Per-image artifacts:
 *   output/photos/e<XX>/<slug>.png            — generated image
 *   output/photos/e<XX>/<slug>.meta.json      — full spec + provider + ts
 *
 * Aggregate artifact:
 *   output/photos/e<XX>/manifest.json         — overview + all photos
 *
 * Usage:
 *   node scripts/generate-edition-photos.js 92
 *   node scripts/generate-edition-photos.js 92 --dry-run
 *   node scripts/generate-edition-photos.js 92 --model black-forest-labs/FLUX.1.1-pro
 *
 * Flags:
 *   --dry-run    Print specs + would-be paths; skip provider call
 *   --model      Override model (default: black-forest-labs/FLUX.1-dev)
 *
 * Requires: TOGETHER_API_KEY in .env
 *
 * Note: Non-edition types (interview, supplemental, dispatch) used to flow
 * through this script with --type/--cycle and synthesis. Those flows are
 * temporarily without photo generation until T11 wires DJ-direction mode
 * into all four journalism skills. Until then, non-edition photo generation
 * happens through whichever legacy path the calling skill specifies.
 *
 * ============================================================================
 */

var path = require('path');
var fs = require('fs');
require('/root/GodWorld/lib/env');
var photoGen = require('../lib/photoGenerator');
var photoQA = require('./photoQA');
var Anthropic = require('@anthropic-ai/sdk');

var DEFAULT_MODEL = 'black-forest-labs/FLUX.1.1-pro';
var DEFAULT_WIDTH = 1344;
var DEFAULT_HEIGHT = 768;
var DEFAULT_STEPS = 28;
// S197 BUNDLE-E (G-PR15): cap regen-on-fail at 2 retries (= 3 total attempts:
// initial + 2 retries). After the third attempt still FAILs, the spec is
// auto-dropped from the manifest with `dropped: true, droppedReason: <last
// QA issues>` so the PDF generator can honor BUNDLE-E's editorialFlag-
// respect logic without requiring a manual manifest edit.
var REGEN_MAX_RETRIES = 2;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

var ALLOWED_TYPES = ['edition', 'dispatch', 'interview', 'supplemental'];

function parseArgs() {
  var args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node scripts/generate-edition-photos.js <cycle> [--type T] [--slug S] [--dry-run] [--model <id>] [--with-qa] [--qa-only]');
    process.exit(1);
  }
  var cycle = parseInt(args[0], 10);
  if (Number.isNaN(cycle) || cycle < 1) {
    console.error('Error: first arg must be a positive cycle number (e.g. 92)');
    process.exit(1);
  }
  var dryRun = args.includes('--dry-run');
  var withQa = args.includes('--with-qa');
  var qaOnly = args.includes('--qa-only');
  var model = DEFAULT_MODEL;
  var type = 'edition';
  var slug = null;
  for (var i = 1; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      model = args[i + 1];
      i++;
    } else if (args[i] === '--type' && args[i + 1]) {
      type = args[i + 1];
      if (ALLOWED_TYPES.indexOf(type) === -1) {
        console.error('Error: --type must be one of: ' + ALLOWED_TYPES.join(', '));
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--slug' && args[i + 1]) {
      slug = args[i + 1];
      i++;
    }
  }
  if (type !== 'edition' && !slug) {
    console.error('Error: --slug is required for --type ' + type);
    process.exit(1);
  }
  // --qa-only implies --with-qa
  if (qaOnly) withQa = true;
  return { cycle: cycle, dryRun: dryRun, model: model, withQa: withQa, qaOnly: qaOnly, type: type, slug: slug };
}

function deriveOutDir(type, cycle, slug) {
  if (type === 'edition') return path.join(__dirname, '..', 'output', 'photos', 'e' + cycle);
  return path.join(__dirname, '..', 'output', 'photos', type + '_c' + cycle + '_' + slug);
}

// ---------------------------------------------------------------------------
// Spec validation
// ---------------------------------------------------------------------------

var REQUIRED_FIELDS = ['slug', 'thesis', 'mood', 'motifs', 'composition', 'credit', 'image_prompt'];

function validateSpec(spec, idx) {
  var missing = [];
  for (var f = 0; f < REQUIRED_FIELDS.length; f++) {
    if (!spec[REQUIRED_FIELDS[f]]) missing.push(REQUIRED_FIELDS[f]);
  }
  if (missing.length > 0) {
    return { valid: false, reason: 'spec ' + idx + ' missing fields: ' + missing.join(', ') };
  }
  var slug = spec.slug;
  if (!/^[a-z0-9_]+$/.test(slug)) {
    return { valid: false, reason: 'spec ' + idx + ' slug "' + slug + '" not lowercase_underscore' };
  }
  var wc = spec.image_prompt.split(/\s+/).filter(Boolean).length;
  if (wc < 100 || wc > 220) {
    return { valid: false, reason: 'spec ' + idx + ' (' + slug + ') prompt word count ' + wc + ' outside 100-220' };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  var argv = parseArgs();
  var cycle = argv.cycle;
  var dryRun = argv.dryRun;
  var model = argv.model;

  var outDir = deriveOutDir(argv.type, cycle, argv.slug);
  var directionPath = path.join(outDir, 'dj_direction.json');

  if (!fs.existsSync(directionPath)) {
    console.error('Error: missing dj_direction.json at ' + directionPath);
    console.error('Run djDirect.js + invoke dj-hartley subagent first (Stage 1).');
    process.exit(1);
  }

  var raw = fs.readFileSync(directionPath, 'utf-8');
  var specs;
  try {
    specs = JSON.parse(raw);
  } catch (e) {
    console.error('Error: dj_direction.json is not valid JSON: ' + e.message);
    process.exit(1);
  }

  if (!Array.isArray(specs)) {
    console.error('Error: dj_direction.json top-level must be an array');
    process.exit(1);
  }
  if (specs.length === 0) {
    console.error('Error: dj_direction.json contains zero specs');
    process.exit(1);
  }

  // Validate all specs upfront — fail fast if any are malformed
  var invalid = [];
  for (var s = 0; s < specs.length; s++) {
    var check = validateSpec(specs[s], s);
    if (!check.valid) invalid.push(check.reason);
  }
  if (invalid.length > 0) {
    console.error('Error: spec validation failed:');
    invalid.forEach(function (r) { console.error('  - ' + r); });
    process.exit(1);
  }

  // Slug uniqueness check
  var slugSet = {};
  for (var u = 0; u < specs.length; u++) {
    if (slugSet[specs[u].slug]) {
      console.error('Error: duplicate slug "' + specs[u].slug + '"');
      process.exit(1);
    }
    slugSet[specs[u].slug] = true;
  }

  console.log('');
  console.log('='.repeat(72));
  console.log('Edition Photo Generator v3.0 — Cycle ' + cycle);
  console.log('='.repeat(72));
  console.log('');
  console.log('  Direction:  ' + directionPath);
  console.log('  Output dir: ' + outDir);
  console.log('  Specs:      ' + specs.length);
  console.log('  Model:      ' + model);
  console.log('  Mode:       ' + (dryRun ? 'DRY RUN (no provider calls)' :
                                    argv.qaOnly ? 'QA-ONLY (skip generation, use existing photos)' :
                                    'live'));
  console.log('');

  // --qa-only: skip generation, load existing manifest, jump to QA loop
  if (argv.qaOnly) {
    var existingManifestPath = path.join(outDir, 'manifest.json');
    if (!fs.existsSync(existingManifestPath)) {
      console.error('Error: --qa-only requires existing manifest.json at ' + existingManifestPath);
      process.exit(1);
    }
    var existingManifest = JSON.parse(fs.readFileSync(existingManifestPath, 'utf-8'));
    if (!existingManifest.photos || existingManifest.photos.length === 0) {
      console.error('Error: --qa-only found no photos[] in existing manifest');
      process.exit(1);
    }
    console.log('Using existing photos from manifest (' + existingManifest.photos.length + ' photos).');
    console.log('');
    await runQaAndRegenLoop({
      cycle: cycle,
      outDir: outDir,
      specs: specs,
      results: existingManifest.photos,
      manifest: existingManifest,
      manifestPath: existingManifestPath,
      model: model
    });
    return;
  }

  if (dryRun) {
    console.log('-'.repeat(72));
    console.log('Specs (would generate):');
    console.log('-'.repeat(72));
    specs.forEach(function (spec, i) {
      var wc = spec.image_prompt.split(/\s+/).filter(Boolean).length;
      console.log('');
      console.log('  [' + (i + 1) + '/' + specs.length + '] ' + spec.slug);
      console.log('      Credit:   ' + spec.credit);
      console.log('      Thesis:   ' + spec.thesis);
      console.log('      Words:    ' + wc + ' (target 120-180)');
      console.log('      Out:      ' + path.join('output/photos/e' + cycle, spec.slug + '.png'));
      console.log('      Sidecar:  ' + path.join('output/photos/e' + cycle, spec.slug + '.meta.json'));
    });
    console.log('');
    console.log('Run without --dry-run to generate images.');
    return;
  }

  // Live generation
  fs.mkdirSync(outDir, { recursive: true });

  var results = [];
  var failures = [];

  for (var i = 0; i < specs.length; i++) {
    var spec = specs[i];
    var label = '[' + (i + 1) + '/' + specs.length + '] ' + spec.slug;
    console.log(label + ' generating...');

    var startMs = Date.now();
    try {
      var result = await photoGen.generateWithTogether(spec.image_prompt, {
        model: model,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        steps: DEFAULT_STEPS
      });

      var elapsedMs = Date.now() - startMs;
      var imageFile = spec.slug + '.png';

      // Save image — savePhoto handles b64 decode + url fallback
      var saved = await photoGen.savePhoto(
        { url: result.url, b64: result.b64 },
        outDir,
        imageFile
      );

      // Sidecar metadata
      var meta = {
        slug: spec.slug,
        cycle: cycle,
        spec: spec,
        provider: result.provider,
        model: result.model,
        generatedAt: new Date().toISOString(),
        elapsedMs: elapsedMs,
        imageFile: imageFile,
        promptWordCount: spec.image_prompt.split(/\s+/).filter(Boolean).length,
        dimensions: { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT },
        steps: DEFAULT_STEPS
      };
      var sidecarPath = path.join(outDir, spec.slug + '.meta.json');
      fs.writeFileSync(sidecarPath, JSON.stringify(meta, null, 2));

      console.log('  ✓ saved: ' + path.basename(saved) + ' (' + (elapsedMs / 1000).toFixed(1) + 's)');
      console.log('  ✓ sidecar: ' + path.basename(sidecarPath));
      console.log('');

      results.push({
        slug: spec.slug,
        file: imageFile,
        sidecar: path.basename(sidecarPath),
        credit: spec.credit,
        section: spec.section || null,
        elapsedMs: elapsedMs
      });
    } catch (err) {
      console.error('  ✗ ERROR: ' + err.message);
      console.log('');
      failures.push({ slug: spec.slug, error: err.message });
    }
  }

  // Manifest
  var manifestSlug = argv.type === 'edition' ? 'e' + cycle : argv.type + '_c' + cycle + '_' + argv.slug;
  var manifest = {
    cycle: cycle,
    type: argv.type,
    slug: manifestSlug,
    provider: 'together',
    model: model,
    generatedAt: new Date().toISOString(),
    specCount: specs.length,
    successCount: results.length,
    failureCount: failures.length,
    photos: results,
    failures: failures
  };
  var manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('='.repeat(72));
  console.log('Generation complete');
  console.log('='.repeat(72));
  console.log('');
  console.log('  Generated: ' + results.length + '/' + specs.length);
  console.log('  Failures:  ' + failures.length);
  console.log('  Manifest:  ' + manifestPath);
  console.log('');
  if (failures.length > 0) {
    console.log('  Failed slugs:');
    failures.forEach(function (f) {
      console.log('    - ' + f.slug + ': ' + f.error);
    });
    console.log('');
  }

  // T8: --with-qa runs photoQA + regen-on-fail loop
  if (argv.withQa) {
    await runQaAndRegenLoop({
      cycle: cycle,
      outDir: outDir,
      specs: specs,
      results: results,
      manifest: manifest,
      manifestPath: manifestPath,
      model: model
    });
  } else {
    console.log('Next step: photoQA.js verifies each image against its spec.');
    console.log('  node scripts/photoQA.js output/photos/e' + cycle);
    console.log('Or rerun with --with-qa to chain QA + regen-on-fail in one pass.');
    console.log('');
  }
}

// ---------------------------------------------------------------------------
// T8: QA + regen-on-fail loop
// ---------------------------------------------------------------------------

async function runQaAndRegenLoop(opts) {
  var cycle = opts.cycle;
  var outDir = opts.outDir;
  var specs = opts.specs;
  var results = opts.results;
  var manifest = opts.manifest;
  var manifestPath = opts.manifestPath;
  var model = opts.model;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: --with-qa requires ANTHROPIC_API_KEY in environment');
    process.exit(1);
  }

  console.log('='.repeat(72));
  console.log('Photo QA (Haiku) + regen-on-fail loop');
  console.log('='.repeat(72));
  console.log('');

  var qaClient = new Anthropic();
  var specBySlug = {};
  specs.forEach(function (s) { specBySlug[s.slug] = s; });

  var regenLogPath = path.join(outDir, 'regen_log.md');
  var regenLog = ['# Regen-on-fail log — Cycle ' + cycle, '',
                  'Started: ' + new Date().toISOString(), ''];

  var qaResults = [];

  // Initial QA pass
  for (var i = 0; i < results.length; i++) {
    var photo = results[i];
    var slug = photo.slug;
    var spec = specBySlug[slug];
    if (!spec) continue;
    var photoPath = path.join(outDir, photo.file);
    var label = '[QA ' + (i + 1) + '/' + results.length + '] ' + slug;
    console.log(label + ' evaluating...');

    try {
      var qa = await photoQA.evaluatePhoto(qaClient, photoPath, spec);
      var icon = qa.verdict === 'PASS' ? '✓' : qa.verdict === 'FLAG' ? '!' : '✗';
      console.log('  ' + icon + ' ' + qa.verdict + ' — ' + qa.summary);
      console.log('');
      writeQaSidecar(outDir, slug, photo.file, cycle, qa);
      qaResults.push({ slug: slug, file: photo.file, qa: qa, regenAttempt: 0 });
    } catch (err) {
      console.error('  QA error: ' + err.message);
      console.log('');
      qaResults.push({ slug: slug, file: photo.file, qa: null, error: err.message, regenAttempt: 0 });
    }
  }

  // Regen pass — only for FAIL verdicts
  var failures = qaResults.filter(function (r) { return r.qa && r.qa.verdict === 'FAIL'; });

  if (failures.length === 0) {
    console.log('No FAIL verdicts — no regen needed.');
    console.log('');
  } else {
    console.log('Regen-on-fail: ' + failures.length + ' FAIL verdict(s) — up to ' +
                REGEN_MAX_RETRIES + ' retries each (3 total attempts incl. initial).');
    console.log('');
    regenLog.push('## Initial QA: ' + failures.length + ' FAIL(s)', '');

    for (var f = 0; f < failures.length; f++) {
      var failed = failures[f];
      var fSpec = specBySlug[failed.slug];
      var label2 = '[Regen ' + (f + 1) + '/' + failures.length + '] ' + failed.slug;
      regenLog.push('### ' + failed.slug, '',
                    '- **Initial verdict:** FAIL',
                    '- **Initial summary:** ' + failed.qa.summary,
                    '- **Initial issues:** ' + failed.qa.issues, '');

      // S197 BUNDLE-E — multi-attempt retry loop (was: single retry).
      // Max attempts = REGEN_MAX_RETRIES + 1 (initial counted, retries here).
      var currentQa = failed.qa;
      var sidecarPath = path.join(outDir, failed.slug + '.meta.json');
      var meta = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'));
      var lastRetryError = null;
      var attemptIdx = 1;
      while (attemptIdx <= REGEN_MAX_RETRIES && currentQa && currentQa.verdict === 'FAIL') {
        var attemptNum = attemptIdx + 1;  // initial was attempt 1
        console.log(label2 + ' (attempt ' + attemptNum + '/' + (REGEN_MAX_RETRIES + 1) + ')...');
        try {
          var retryStart = Date.now();
          var retryResult = await photoGen.generateWithTogether(fSpec.image_prompt, {
            model: model,
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            steps: DEFAULT_STEPS
          });
          var retryElapsed = Date.now() - retryStart;
          var retryPath = path.join(outDir, failed.file);
          await photoGen.savePhoto(
            { url: retryResult.url, b64: retryResult.b64 },
            outDir,
            failed.file
          );
          meta.regenAttempt = attemptIdx;
          meta.regenAt = new Date().toISOString();
          meta.regenElapsedMs = retryElapsed;
          fs.writeFileSync(sidecarPath, JSON.stringify(meta, null, 2));
          console.log('  ✓ regenerated (' + (retryElapsed / 1000).toFixed(1) + 's)');

          var retryQa = await photoQA.evaluatePhoto(qaClient, retryPath, fSpec);
          var retryIcon = retryQa.verdict === 'PASS' ? '✓' : retryQa.verdict === 'FLAG' ? '!' : '✗';
          console.log('  ' + retryIcon + ' ' + retryQa.verdict + ' — ' + retryQa.summary);
          console.log('');
          writeQaSidecar(outDir, failed.slug, failed.file, cycle, retryQa);

          regenLog.push('- **Retry ' + attemptIdx + ' result:** ' + retryQa.verdict,
                        '- **Retry ' + attemptIdx + ' summary:** ' + retryQa.summary, '');

          currentQa = retryQa;
          for (var qr = 0; qr < qaResults.length; qr++) {
            if (qaResults[qr].slug === failed.slug) {
              qaResults[qr].qa = retryQa;
              qaResults[qr].regenAttempt = attemptIdx;
              break;
            }
          }
        } catch (err) {
          lastRetryError = err.message;
          console.error('  ✗ Regen error: ' + err.message);
          console.log('');
          regenLog.push('- **Retry ' + attemptIdx + ' status:** REGEN ERROR — ' + err.message, '');
          break;
        }
        attemptIdx++;
      }

      // Final disposition — three-strikes rule.
      if (currentQa && currentQa.verdict === 'FAIL') {
        // Auto-drop after exhausting retries. PDF generator (BUNDLE-E read
        // side) honors `dropped: true` and skips the spec in print without
        // requiring manual manifest edits. editorialFlag also set for
        // backward-compat with any tooling that already reads it.
        meta.editorialFlag = true;
        meta.editorialFlagReason = currentQa.summary;
        meta.dropped = true;
        meta.droppedReason = currentQa.summary || currentQa.issues || 'FAIL after ' + REGEN_MAX_RETRIES + ' retries';
        meta.droppedAfterAttempts = REGEN_MAX_RETRIES + 1;
        fs.writeFileSync(sidecarPath, JSON.stringify(meta, null, 2));
        console.log('  ⚠ DROPPED after ' + (REGEN_MAX_RETRIES + 1) + ' attempts — ' + meta.droppedReason);
        console.log('');
        regenLog.push('- **Status:** DROPPED (3-strikes — still FAIL after ' + REGEN_MAX_RETRIES + ' retries)', '');
      } else if (lastRetryError) {
        regenLog.push('- **Status:** REGEN ERROR — ' + lastRetryError, '');
      } else {
        regenLog.push('- **Status:** PROMOTED to ' + currentQa.verdict + ' (after ' + (attemptIdx - 1) + ' retries)', '');
      }
    }
  }

  // Aggregate QA report
  var passes = qaResults.filter(function (r) { return r.qa && r.qa.verdict === 'PASS'; }).length;
  var flags = qaResults.filter(function (r) { return r.qa && r.qa.verdict === 'FLAG'; }).length;
  var fails = qaResults.filter(function (r) { return r.qa && r.qa.verdict === 'FAIL'; }).length;
  var qaErrors = qaResults.filter(function (r) { return !r.qa; }).length;

  var qaReport = {
    cycle: cycle,
    type: opts.manifest && opts.manifest.type ? opts.manifest.type : 'edition',
    photoDir: path.basename(outDir),
    evaluatedAt: new Date().toISOString(),
    model: 'claude-haiku-4-5-20251001',
    summary: { pass: passes, flag: flags, fail: fails, errorOrSkip: qaErrors },
    regenAttempts: failures.length,
    regenPromoted: failures.length - fails - failures.filter(function (x) {
      var current = qaResults.find(function (r) { return r.slug === x.slug; });
      return current && current.qa && current.qa.verdict === 'FAIL';
    }).length,
    results: qaResults.map(function (r) {
      return {
        slug: r.slug,
        file: r.file,
        verdict: r.qa ? r.qa.verdict : 'ERROR',
        regenAttempt: r.regenAttempt || 0,
        editorialFlag: r.qa && r.qa.verdict === 'FAIL' && r.regenAttempt > 0,
        summary: r.qa ? r.qa.summary : (r.error || 'unknown'),
        issues: r.qa ? r.qa.issues : ''
      };
    })
  };
  var qaReportPath = path.join(outDir, 'qa_report.json');
  fs.writeFileSync(qaReportPath, JSON.stringify(qaReport, null, 2));

  // Update manifest with QA summary
  manifest.qa = {
    pass: passes,
    flag: flags,
    fail: fails,
    errorOrSkip: qaErrors,
    regenAttempts: failures.length,
    runAt: new Date().toISOString()
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // Write regen log
  regenLog.push('## Final QA summary',
                '- PASS: ' + passes,
                '- FLAG: ' + flags,
                '- FAIL: ' + fails + ' (editorial-flag if regen attempted)',
                '- Regen attempts: ' + failures.length, '');
  fs.writeFileSync(regenLogPath, regenLog.join('\n'));

  console.log('='.repeat(72));
  console.log('Final QA summary');
  console.log('='.repeat(72));
  console.log('  PASS:  ' + passes);
  console.log('  FLAG:  ' + flags);
  console.log('  FAIL:  ' + fails + (fails > 0 ? ' (editorial-flag)' : ''));
  console.log('  ERROR: ' + qaErrors);
  console.log('  Regen attempts: ' + failures.length);
  console.log('');
  console.log('  QA report: ' + qaReportPath);
  console.log('  Regen log: ' + regenLogPath);
  console.log('');
}

function writeQaSidecar(outDir, slug, file, cycle, qa) {
  var perImageReport = {
    slug: slug,
    file: file,
    cycle: cycle,
    verdict: qa.verdict,
    specCompliance: qa.specCompliance,
    match: qa.match,
    tone: qa.tone,
    issues: qa.issues,
    summary: qa.summary,
    rawResponse: qa.rawResponse,
    tokens: qa.tokens,
    evaluatedAt: new Date().toISOString(),
    model: 'claude-haiku-4-5-20251001'
  };
  var perImagePath = path.join(outDir, slug + '.qa.json');
  fs.writeFileSync(perImagePath, JSON.stringify(perImageReport, null, 2));
}

main().catch(function (err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
