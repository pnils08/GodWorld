#!/usr/bin/env node
/**
 * ============================================================================
 * Photo QA v2.0 — Spec-Aware Verification
 * ============================================================================
 *
 * Stage 3 of the rebuilt photo pipeline (Phase 21.3, S188 — T7).
 *
 * Reads each generated image plus its DJ spec sidecar ({slug}.meta.json) and
 * asks Claude Haiku to verify the image against the spec's negative-frame
 * constraints, positive-frame elements, and tier-fidelity rules.
 *
 * Two bug fixes from Task 2 audit:
 *   1. Template-string bug — old prompt asked Haiku to fill bracketed
 *      placeholders ([1-2 sentence assessment]); newer models copied the
 *      brackets literally. Replaced with directive language.
 *   2. Rubric weakness — old rubric only saw a generic article-context
 *      summary, never DJ's spec. Could only catch general aesthetic failures,
 *      not negative-frame violations. New rubric reads the sidecar.
 *
 * Per-image output:
 *   output/photos/e<XX>/<slug>.qa.json
 *
 * Aggregate output:
 *   output/photos/e<XX>/qa_report.json
 *
 * Usage:
 *   node scripts/photoQA.js output/photos/e92
 *   node scripts/photoQA.js output/photos/e92 --dry-run
 *
 * Requires: ANTHROPIC_API_KEY in environment or .env
 *
 * Cost: ~5,000 tokens per photo (~$0.012 each, ~$0.08 per 7-photo edition)
 *
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
require('/root/GodWorld/lib/env');

const Anthropic = require('@anthropic-ai/sdk');

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

const QA_INSTRUCTIONS = `You are a photo editor at the Bay Tribune, a newspaper in Oakland, California (set in 2041).
You are reviewing an AI-generated photo against the photo direction spec the art director wrote for it.

The spec is your ground truth. Verify the image satisfies it.

Evaluate on four axes:

1. NEGATIVE-FRAME COMPLIANCE
   The spec contains a "NOT in frame:" paragraph listing what must be absent.
   Look at the image. Are any of those forbidden elements visible?
   Common forbidden items: tents, encampments, boarded storefronts, barred
   windows, broken glass, anyone in distress, decorative grit, real-world
   brand logos, recognizable real-world commercial identification.

2. POSITIVE-FRAME COMPLIANCE
   The spec calls for specific subject (age, role, clothing, what they hold),
   motifs (visual elements that should appear), mood register, and composition
   language (camera, framing, eye level). Does the image match?

3. TIER-FIDELITY
   No recognizable real-world brand names visible as logos. No real-world
   public figures depicted. Gibberish text on signs (FLUX limitation) is a
   FLAG-level issue, not a FAIL.

   **Canon-allowed brands — these ARE permitted in frame:**
   - **Oakland Athletics (A's)** — uniforms, "Athletics" wordmark, elephant
     logo, green/gold color scheme. The A's are the canon Oakland MLB team.
     A's branding in a Coliseum or sports-context shot is correct, not a
     violation. (However, jersey numbers must match the canon 2041 roster
     OR be illegible — fabricated player names like "CALHOUN" or numbers
     not on the canon roster are a FAIL.)
   - **Canon Oakland landmarks** — Fox Theater Oakland, Paramount Theatre,
     Heinold's First and Last Chance Saloon, Oakland Museum of California
     (OMCA), Lake Merritt pergola, Jack London Square, Oakland Coliseum,
     Oakland ferry terminal, Lake Merritt, Telegraph Avenue, OACC, Malonga
     Center. Real signage and venue names for these are canon, not tier
     violations. Full list at docs/canon/INSTITUTIONS.md §Arts, Culture &
     Landmarks. If the spec puts a canon landmark name in its positive
     frame, the image rendering that name on signage is COMPLIANT.
   - **Canon-substitute names** — when the spec uses a Tier-2 substitute
     name (e.g., "Atlas Bay Architects"), that substitute IS the canon
     name; it's not a tier violation.

   Tier violations are real-world brands NOT on the canon-allowed list:
   national chains (Walgreens, Safeway, Starbucks, Target, Fox News, etc.),
   non-canon sports franchises, real-world architecture/construction firms
   that have a canon-substitute, or real public figures.

4. PHOTOJOURNALISM QUALITY
   Camera language (35mm, eye-level, depth) matches spec. Lighting matches
   mood register. Does it look like documentary photography or AI slop?

Verdict rubric:
- PASS = all four axes green; printable as-is
- FLAG = printable but minor issues (gibberish sign text, slight composition
        drift, non-critical motif missing)
- FAIL = negative-frame violation (forbidden element visible), tier violation
        (real brand or real face), or wrong subject entirely

Respond with EXACTLY this format. Each field gets directive content, not
template placeholders. Write actual sentences.

VERDICT: write PASS or FLAG or FAIL
NEGATIVE_FRAME: write yes or no — did the image avoid the spec's NOT-list?
POSITIVE_FRAME: write yes or no — does the image show the spec's called-for subject and motifs?
TIER_VIOLATIONS: write a comma-separated list of any tier-fidelity violations found, or write none
MATCH: write 1-2 sentences assessing whether the photo depicts what the spec called for
TONE: write 1-2 sentences on photojournalism quality and mood register fidelity
ISSUES: write a comma-separated list of all problems found, or write none
SUMMARY: write 1 sentence overall`;

function buildSpecBlock(spec) {
  return [
    'PHOTO DIRECTION SPEC (from DJ Hartley, art director):',
    '',
    'Slug: ' + spec.slug,
    'Thesis: ' + spec.thesis,
    'Mood: ' + spec.mood,
    'Motifs: ' + spec.motifs,
    'Composition: ' + spec.composition,
    'Credit: ' + spec.credit,
    '',
    'Image prompt that was sent to the generator:',
    spec.image_prompt
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Verdict parsing
// ---------------------------------------------------------------------------

function parseYesNo(line) {
  if (!line) return null;
  var s = line.toLowerCase().trim();
  if (s.indexOf('yes') !== -1) return true;
  if (s.indexOf('no') !== -1) return false;
  return null;
}

function parseList(line) {
  if (!line) return [];
  var s = line.trim();
  if (!s || s.toLowerCase() === 'none') return [];
  return s.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
}

function parseResponse(text) {
  function grab(name) {
    var re = new RegExp('^' + name + ':\\s*(.+)$', 'im');
    var m = text.match(re);
    return m ? m[1].trim() : '';
  }

  var verdictRaw = grab('VERDICT').toUpperCase();
  var verdict = ['PASS', 'FLAG', 'FAIL'].indexOf(verdictRaw) !== -1 ? verdictRaw : 'FLAG';

  return {
    verdict: verdict,
    specCompliance: {
      negativeFramePass: parseYesNo(grab('NEGATIVE_FRAME')),
      positiveFramePass: parseYesNo(grab('POSITIVE_FRAME')),
      tierViolations: parseList(grab('TIER_VIOLATIONS'))
    },
    match: grab('MATCH'),
    tone: grab('TONE'),
    issues: grab('ISSUES'),
    summary: grab('SUMMARY')
  };
}

// ---------------------------------------------------------------------------
// Vision call
// ---------------------------------------------------------------------------

function detectMediaType(buffer) {
  // PNG magic: 89 50 4E 47
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 &&
      buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  // JPEG magic: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  // WebP magic: RIFF....WEBP
  if (buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }
  return null;
}

async function evaluatePhoto(client, photoPath, spec) {
  var imageData = fs.readFileSync(photoPath);
  var base64 = imageData.toString('base64');
  var mediaType = detectMediaType(imageData);
  if (!mediaType) {
    throw new Error('unrecognized image format (not PNG/JPEG/WebP) at ' + photoPath);
  }

  var promptText = QA_INSTRUCTIONS + '\n\n' + buildSpecBlock(spec);

  var response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 }
        },
        {
          type: 'text',
          text: promptText
        }
      ]
    }]
  });

  var text = response.content[0].text;
  var parsed = parseResponse(text);

  return {
    verdict: parsed.verdict,
    specCompliance: parsed.specCompliance,
    match: parsed.match,
    tone: parsed.tone,
    issues: parsed.issues,
    summary: parsed.summary,
    rawResponse: text,
    tokens: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens
    }
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs() {
  var args = process.argv.slice(2);
  var dryRun = args.includes('--dry-run');
  var photoDir = null;
  for (var i = 0; i < args.length; i++) {
    if (!args[i].startsWith('--')) {
      photoDir = args[i];
      break;
    }
  }
  if (!photoDir) {
    console.log('Usage: node scripts/photoQA.js <photo-dir> [--dry-run]');
    console.log('Example: node scripts/photoQA.js output/photos/e92');
    process.exit(1);
  }
  return { photoDir: photoDir, dryRun: dryRun };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  var argv = parseArgs();
  var photoDir = argv.photoDir;
  var dryRun = argv.dryRun;

  var fullDir = path.resolve(photoDir);
  var manifestPath = path.join(fullDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error('Error: no manifest.json found in ' + fullDir);
    process.exit(1);
  }

  var manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  if (!manifest.photos || !Array.isArray(manifest.photos)) {
    console.error('Error: manifest.json missing photos[] array');
    process.exit(1);
  }

  console.log('');
  console.log('='.repeat(72));
  console.log('Bay Tribune Photo QA v2.0 — ' + path.basename(fullDir));
  console.log('='.repeat(72));
  console.log('');
  console.log('  Cycle:    ' + (manifest.cycle || '(unknown)'));
  console.log('  Type:     ' + (manifest.type || 'edition'));
  console.log('  Photos:   ' + manifest.photos.length);
  console.log('  Mode:     ' + (dryRun ? 'DRY RUN (no Haiku calls)' : 'live'));
  console.log('');

  if (dryRun) {
    console.log('-'.repeat(72));
    console.log('Photos that would be evaluated:');
    console.log('-'.repeat(72));
    for (var i = 0; i < manifest.photos.length; i++) {
      var p = manifest.photos[i];
      var photoPath = path.join(fullDir, p.file);
      var sidecarPath = path.join(fullDir, (p.slug || p.file.replace(/\.png$/, '')) + '.meta.json');
      var imgOk = fs.existsSync(photoPath) ? 'ok' : 'MISSING';
      var sidecarOk = fs.existsSync(sidecarPath) ? 'ok' : 'MISSING';
      var imgSize = fs.existsSync(photoPath) ? (fs.statSync(photoPath).size / 1024).toFixed(0) + 'KB' : '-';
      console.log('');
      console.log('  [' + (i + 1) + '/' + manifest.photos.length + '] ' + (p.slug || p.file));
      console.log('      Image:   ' + imgOk + ' (' + imgSize + ')');
      console.log('      Sidecar: ' + sidecarOk);
      console.log('      QA out:  ' + path.join(path.basename(fullDir), (p.slug || p.file.replace(/\.png$/, '')) + '.qa.json'));
    }
    console.log('');
    console.log('Run without --dry-run to evaluate with Claude Vision.');
    return;
  }

  // Live mode — verify API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY not set in environment');
    process.exit(1);
  }

  var client = new Anthropic();
  var results = [];
  var totalInput = 0;
  var totalOutput = 0;

  for (var j = 0; j < manifest.photos.length; j++) {
    var photo = manifest.photos[j];
    var slug = photo.slug || photo.file.replace(/\.png$/, '').replace(/\.jpg$/, '');
    var photoFullPath = path.join(fullDir, photo.file);
    var sidecarFullPath = path.join(fullDir, slug + '.meta.json');
    var label = '[' + (j + 1) + '/' + manifest.photos.length + '] ' + slug;

    if (!fs.existsSync(photoFullPath)) {
      console.log(label + ' — SKIP (image file missing)');
      results.push({ slug: slug, file: photo.file, verdict: 'SKIP', reason: 'image file missing' });
      continue;
    }
    if (!fs.existsSync(sidecarFullPath)) {
      console.log(label + ' — SKIP (sidecar missing — was T6 run?)');
      results.push({ slug: slug, file: photo.file, verdict: 'SKIP', reason: 'sidecar missing' });
      continue;
    }

    var sidecar;
    try {
      sidecar = JSON.parse(fs.readFileSync(sidecarFullPath, 'utf-8'));
    } catch (e) {
      console.log(label + ' — SKIP (sidecar parse error: ' + e.message + ')');
      results.push({ slug: slug, file: photo.file, verdict: 'SKIP', reason: 'sidecar parse error' });
      continue;
    }

    var spec = sidecar.spec;
    if (!spec) {
      console.log(label + ' — SKIP (sidecar has no spec field)');
      results.push({ slug: slug, file: photo.file, verdict: 'SKIP', reason: 'sidecar.spec missing' });
      continue;
    }

    console.log(label + ' evaluating...');

    try {
      var evaluation = await evaluatePhoto(client, photoFullPath, spec);
      totalInput += evaluation.tokens.input;
      totalOutput += evaluation.tokens.output;

      var icon = evaluation.verdict === 'PASS' ? '✓' :
                 evaluation.verdict === 'FLAG' ? '!' : '✗';
      console.log('  ' + icon + ' ' + evaluation.verdict + ' — ' + evaluation.summary);
      if (evaluation.issues && evaluation.issues.toLowerCase() !== 'none') {
        console.log('  Issues: ' + evaluation.issues);
      }
      if (evaluation.specCompliance.tierViolations.length > 0) {
        console.log('  Tier violations: ' + evaluation.specCompliance.tierViolations.join(', '));
      }
      console.log('');

      // Per-image QA sidecar
      var perImageReport = {
        slug: slug,
        file: photo.file,
        cycle: manifest.cycle,
        verdict: evaluation.verdict,
        specCompliance: evaluation.specCompliance,
        match: evaluation.match,
        tone: evaluation.tone,
        issues: evaluation.issues,
        summary: evaluation.summary,
        rawResponse: evaluation.rawResponse,
        tokens: evaluation.tokens,
        evaluatedAt: new Date().toISOString(),
        model: 'claude-haiku-4-5-20251001'
      };
      var perImagePath = path.join(fullDir, slug + '.qa.json');
      fs.writeFileSync(perImagePath, JSON.stringify(perImageReport, null, 2));

      results.push({
        slug: slug,
        file: photo.file,
        verdict: evaluation.verdict,
        specCompliance: evaluation.specCompliance,
        match: evaluation.match,
        tone: evaluation.tone,
        issues: evaluation.issues,
        summary: evaluation.summary
      });
    } catch (err) {
      console.error('  ERROR: ' + err.message);
      console.log('');
      results.push({ slug: slug, file: photo.file, verdict: 'ERROR', reason: err.message });
    }
  }

  // Aggregate summary
  var passes = results.filter(function (r) { return r.verdict === 'PASS'; }).length;
  var flags = results.filter(function (r) { return r.verdict === 'FLAG'; }).length;
  var fails = results.filter(function (r) { return r.verdict === 'FAIL'; }).length;
  var errors = results.filter(function (r) { return r.verdict === 'ERROR' || r.verdict === 'SKIP'; }).length;

  console.log('='.repeat(72));
  console.log('QA Summary');
  console.log('='.repeat(72));
  console.log('  PASS:  ' + passes);
  console.log('  FLAG:  ' + flags);
  console.log('  FAIL:  ' + fails);
  console.log('  ERROR/SKIP: ' + errors);
  console.log('  Tokens: ' + totalInput + ' input + ' + totalOutput + ' output');
  console.log('');

  if (fails > 0) {
    console.log('FAILED photos (should not go to print):');
    results.filter(function (r) { return r.verdict === 'FAIL'; }).forEach(function (r) {
      console.log('  - ' + r.slug + ': ' + r.summary);
    });
    console.log('');
  }

  // Aggregate report
  var report = {
    cycle: manifest.cycle,
    type: manifest.type || 'edition',
    photoDir: path.basename(fullDir),
    evaluatedAt: new Date().toISOString(),
    model: 'claude-haiku-4-5-20251001',
    summary: { pass: passes, flag: flags, fail: fails, errorOrSkip: errors },
    tokens: { input: totalInput, output: totalOutput },
    results: results
  };
  var reportPath = path.join(fullDir, 'qa_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log('Aggregate report: ' + reportPath);
  console.log('Per-image reports: ' + fullDir + '/<slug>.qa.json');
  console.log('');
}

// ---------------------------------------------------------------------------
// Library exports + CLI entry guard
// ---------------------------------------------------------------------------

module.exports = {
  evaluatePhoto: evaluatePhoto,
  detectMediaType: detectMediaType,
  parseResponse: parseResponse,
  buildSpecBlock: buildSpecBlock,
  QA_INSTRUCTIONS: QA_INSTRUCTIONS
};

if (require.main === module) {
  main().catch(function (err) {
    console.error('Fatal:', err.message);
    process.exit(1);
  });
}
