#!/usr/bin/env node
/**
 * ============================================================================
 * Edition Photo Generator v2.0
 * ============================================================================
 *
 * Reads a Cycle Pulse edition and generates photos using AI.
 * Default mode: auto-assigns photos using Mags' editorial logic.
 *
 * Usage:
 *   node scripts/generate-edition-photos.js editions/cycle_pulse_edition_83.txt
 *   node scripts/generate-edition-photos.js editions/cycle_pulse_edition_83.txt --dry-run
 *   node scripts/generate-edition-photos.js editions/cycle_pulse_edition_83.txt --credits-only
 *
 * Flags:
 *   --dry-run       Show prompts without generating images
 *   --credits-only  Only generate for articles with [Photo:] tags (v1 behavior)
 *
 * Requires: TOGETHER_API_KEY in .env
 *
 * ============================================================================
 */

var path = require('path');
var fs = require('fs');
var editionParser = require('../lib/editionParser');
var photoGen = require('../lib/photoGenerator');

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  var args = process.argv.slice(2);
  var dryRun = args.includes('--dry-run');
  var creditsOnly = args.includes('--credits-only');
  var editionFile = args.find(function(a) { return !a.startsWith('--'); });

  if (!editionFile) {
    console.log('Usage: node scripts/generate-edition-photos.js <edition-file> [--dry-run] [--credits-only]');
    console.log('');
    console.log('  Default: auto-assigns photos using editorial logic');
    console.log('  --credits-only: only articles with [Photo:] tags (v1 behavior)');
    console.log('  --dry-run: show prompts without generating images');
    process.exit(1);
  }

  var fullPath = path.resolve(editionFile);
  if (!fs.existsSync(fullPath)) {
    console.error('File not found: ' + fullPath);
    process.exit(1);
  }

  console.log('');
  console.log('=== Bay Tribune Photo Generator v2.0 ===');
  console.log('');

  // Parse the edition
  var parsed = editionParser.parseEdition(fullPath);
  console.log('Edition: ' + parsed.edition);
  console.log('Weather: ' + parsed.weather);
  console.log('Sections found: ' + parsed.sections.length);
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
        s.beat
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
  var outputDir = path.join(__dirname, '..', 'output', 'photos', 'e' + parsed.edition);
  console.log('Output directory: ' + outputDir);
  console.log('');

  var results = [];
  for (var i = 0; i < photoSections.length; i++) {
    var ps = photoSections[i];
    var section = ps.section;
    var slugName = section.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    var filename = 'e' + parsed.edition + '_' + slugName + '.jpg';

    console.log('[' + (i + 1) + '/' + photoSections.length + '] Generating: ' + section.name);

    try {
      var result = await photoGen.generatePhoto({
        headline: section.headline,
        text: section.text,
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
