#!/usr/bin/env node
/**
 * ============================================================================
 * Edition Photo Generator v2.1
 * ============================================================================
 *
 * Reads a Cycle Pulse publishable artifact (edition, interview, supplemental,
 * dispatch, interview-transcript) and generates photos using AI.
 * Default mode: auto-assigns photos using Mags' editorial logic.
 *
 * Usage:
 *   node scripts/generate-edition-photos.js editions/cycle_pulse_edition_83.txt
 *   node scripts/generate-edition-photos.js editions/cycle_pulse_edition_83.txt --dry-run
 *   node scripts/generate-edition-photos.js editions/cycle_pulse_edition_83.txt --credits-only
 *   node scripts/generate-edition-photos.js editions/cycle_pulse_interview_92_santana.txt --type interview --cycle 92
 *
 * Flags:
 *   --type {edition|interview|supplemental|dispatch|interview-transcript}
 *           Default: edition. Determines per-type photo budget + output dir.
 *   --cycle N
 *           Required when --type ≠ edition (non-edition filenames don't
 *           always carry cycle in the legacy parser regex).
 *   --dry-run       Show prompts without generating images
 *   --credits-only  Only generate for articles with [Photo:] tags (v1 behavior)
 *
 * Per-type photo budget (cap on auto-assignments):
 *   edition: 5–8 (existing assignPhotos default)
 *   interview / supplemental / dispatch / interview-transcript: 1–3
 *
 * Requires: TOGETHER_API_KEY in .env
 *
 * ============================================================================
 */

var path = require('path');
var fs = require('fs');
require('/root/GodWorld/lib/env');
var editionParser = require('../lib/editionParser');
var photoGen = require('../lib/photoGenerator');

var ALLOWED_TYPES = ['edition', 'interview', 'supplemental', 'dispatch', 'interview-transcript'];

var PHOTO_BUDGET = {
  'edition':              { min: 5, max: 8 },
  'interview':            { min: 1, max: 3 },
  'supplemental':         { min: 1, max: 3 },
  'dispatch':             { min: 1, max: 3 },
  'interview-transcript': { min: 1, max: 3 }
};

// ---------------------------------------------------------------------------
// CLI flag parsing — --type / --cycle (T9 pattern, mirrors T6/T7)
// ---------------------------------------------------------------------------
function parseFlag(name) {
  var i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) return null;
  return process.argv[i + 1];
}

function parseType() {
  var raw = parseFlag('type');
  if (!raw) return 'edition';
  if (ALLOWED_TYPES.indexOf(raw) === -1) {
    console.error('[ERROR] --type must be one of: ' + ALLOWED_TYPES.join(', '));
    process.exit(1);
  }
  return raw;
}

function parseCycleFlag() {
  var raw = parseFlag('cycle');
  if (!raw) return null;
  var n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    console.error('[ERROR] --cycle must be a positive integer');
    process.exit(1);
  }
  return n;
}

// Derive slug suffix from non-edition filename:
// cycle_pulse_interview_92_santana.txt → "santana"
function deriveNonEditionSlug(filename, type) {
  var base = path.basename(filename);
  var pattern = new RegExp('^cycle_pulse_' + type + '_\\d+_(.+)\\.txt$');
  var m = base.match(pattern);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  var args = process.argv.slice(2);
  var dryRun = args.includes('--dry-run');
  var creditsOnly = args.includes('--credits-only');
  var type = parseType();
  var cycleFlag = parseCycleFlag();

  // First non-flag positional that's NOT a flag value (skip values consumed by --type/--cycle)
  var editionFile = null;
  for (var ai = 0; ai < args.length; ai++) {
    var a = args[ai];
    if (a.startsWith('--')) continue;
    var prev = args[ai - 1];
    if (prev === '--type' || prev === '--cycle') continue;
    editionFile = a;
    break;
  }

  if (!editionFile) {
    console.log('Usage: node scripts/generate-edition-photos.js <source.txt> [--type <type>] [--cycle N] [--dry-run] [--credits-only]');
    console.log('');
    console.log('  Default: auto-assigns photos using editorial logic');
    console.log('  --type:        edition|interview|supplemental|dispatch|interview-transcript (default edition)');
    console.log('  --cycle N:     required when --type ≠ edition');
    console.log('  --credits-only: only articles with [Photo:] tags (v1 behavior)');
    console.log('  --dry-run:     show prompts without generating images');
    process.exit(1);
  }

  if (type !== 'edition' && cycleFlag === null) {
    console.error('[ERROR] --cycle is required for --type ' + type +
      ' (no fallback extraction for non-edition types).');
    process.exit(1);
  }

  var fullPath = path.resolve(editionFile);
  if (!fs.existsSync(fullPath)) {
    console.error('File not found: ' + fullPath);
    process.exit(1);
  }

  console.log('');
  console.log('=== Bay Tribune Photo Generator v2.1 ===');
  console.log('');

  // Parse the edition
  var parsed = editionParser.parseEdition(fullPath);

  // For non-edition types, override edition/slug from flags + filename so
  // output paths follow the T1 contract (cycle_pulse_<type>_<cycle>_<slug>.txt).
  // Edition default keeps the legacy parser-derived slug (back-compat).
  if (type !== 'edition') {
    var slugSuffix = deriveNonEditionSlug(fullPath, type);
    parsed.edition = String(cycleFlag);
    parsed.slug = type + '_c' + cycleFlag + (slugSuffix ? '_' + slugSuffix : '');
  }

  var resolvedCycle = cycleFlag !== null ? cycleFlag : (parsed.edition || null);
  var budget = PHOTO_BUDGET[type] || PHOTO_BUDGET.edition;

  console.log('[METADATA] ' + JSON.stringify({
    type: type,
    cycle: resolvedCycle,
    slug: parsed.slug,
    photoBudget: budget,
    source: path.basename(fullPath)
  }, null, 2));
  console.log('');

  console.log('Edition: ' + parsed.edition);
  console.log('Weather: ' + parsed.weather);
  console.log('Sections found: ' + parsed.sections.length);
  console.log('Photo budget (' + type + '): ' + budget.min + '–' + budget.max);
  console.log('');

  var photoSections;

  if (creditsOnly) {
    // V1 behavior: only sections with [Photo:] credits
    console.log('Mode: credits-only (articles with [Photo:] tags)');
    photoSections = [];
    parsed.sections.forEach(function(s) {
      if (s.photographer && s.beat !== 'editorial') {
        photoSections.push({
          section: s,
          photographer: s.photographer,
          reason: 'explicit credit'
        });
      }
    });
  } else {
    // V2 default: auto-assign using Mags' editorial logic
    console.log('Mode: auto (Mags\' editorial assignment)');
    var assignments = photoGen.assignPhotos(parsed.sections);
    photoSections = assignments.map(function(a) {
      return {
        section: a.section,
        photographer: a.photographer,
        reason: a.reason
      };
    });
  }

  // Per-type budget cap — assignPhotos may return more than the non-edition
  // budget allows; slice down to budget.max. Min is informational (T10
  // validation will check end-to-end coverage).
  if (photoSections.length > budget.max) {
    console.log('Capping photo assignments at type budget: ' +
      photoSections.length + ' → ' + budget.max + ' (' + type + ')');
    photoSections = photoSections.slice(0, budget.max);
  }

  if (photoSections.length === 0) {
    console.log('No photos to generate.');
    process.exit(0);
  }

  console.log('');
  console.log('Photo assignments (' + photoSections.length + '):');
  photoSections.forEach(function(ps) {
    var headline = ps.section.headline || '(no headline)';
    console.log('  - ' + ps.section.name + ' [' + ps.reason + ']');
    console.log('    Photographer: ' + ps.photographer);
    console.log('    Headline: ' + headline.substring(0, 60));
  });
  console.log('');

  if (dryRun) {
    console.log('=== DRY RUN — showing prompts only ===');
    console.log('');
    photoSections.forEach(function(ps) {
      var s = ps.section;
      var scene = photoGen.extractScene(
        (s.text || '').substring(0, 800),
        s.headline || '',
        s.beat,
        s.name || ''
      );
      var prompt = photoGen.buildPhotoPrompt({
        headline: s.headline,
        sceneDescription: scene,
        neighborhood: '',
        weather: parsed.weather,
        beat: s.beat
      }, photoGen.resolvePhotographer(ps.photographer));

      console.log('--- ' + s.name + ' ---');
      console.log('Photographer: ' + ps.photographer);
      console.log('Scene: ' + scene);
      console.log('Prompt: ' + prompt.substring(0, 200) + '...');
      console.log('');
    });
    console.log('Run without --dry-run to generate images.');
    return;
  }

  // Generate photos
  var outputDir = path.join(__dirname, '..', 'output', 'photos', parsed.slug || 'e' + parsed.edition);
  console.log('Output directory: ' + outputDir);
  console.log('');

  var results = [];
  for (var i = 0; i < photoSections.length; i++) {
    var ps = photoSections[i];
    var section = ps.section;
    var slugSource = section.headline || section.name || 'photo_' + i;
    var slugName = slugSource.substring(0, 80).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    var prefix = parsed.slug || 'e' + parsed.edition;
    var filename = prefix + '_' + slugName + '.jpg';

    console.log('[' + (i + 1) + '/' + photoSections.length + '] Generating: ' + section.name);

    try {
      var result = await photoGen.generatePhoto({
        headline: section.headline,
        text: section.text,
        sectionName: section.name,
        neighborhood: '',
        weather: parsed.weather,
        beat: section.beat
      }, {
        photographer: ps.photographer
      });

      var saved = await photoGen.savePhoto(result, outputDir, filename);
      results.push({ section: section.name, file: saved, credit: result.creditLine });
      console.log('  Credit: ' + result.creditLine);
      console.log('');
    } catch (err) {
      console.error('  ERROR: ' + err.message);
      console.log('');
    }
  }

  // Summary
  console.log('');
  console.log('=== Generation Complete ===');
  console.log('Photos generated: ' + results.length + '/' + photoSections.length);
  results.forEach(function(r) {
    console.log('  ' + r.section + ' -> ' + path.basename(r.file) + ' [' + r.credit + ']');
  });

  // Write manifest
  if (results.length > 0) {
    var manifest = {
      edition: parsed.edition,
      type: type,
      cycle: resolvedCycle,
      slug: parsed.slug,
      photoBudget: budget,
      provider: 'together / FLUX.1-schnell',
      photos: results.map(function(r) {
        return {
          section: r.section,
          file: path.basename(r.file),
          credit: r.credit
        };
      })
    };

    fs.mkdirSync(outputDir, { recursive: true });
    var manifestPath = path.join(outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('');
    console.log('Manifest: ' + manifestPath);
  }
  console.log('');
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
