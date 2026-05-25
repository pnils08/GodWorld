/**
 * generate-edition-pdf.section-normalize.test.js — S234 engine.25 G-PR6
 *
 * Surfaces under test (both exported from generate-edition-pdf.js):
 *
 *   normalizeSectionId(s) — pure function. Collapses underscore-or-whitespace
 *   runs into single space, uppercases, trims. Returns '' on falsy input.
 *
 *   findPhotoForSection(manifest, sectionName) — pure function. Returns first
 *   manifest.photos entry whose `section` field normalizes equal to the
 *   normalized `sectionName`. Used by PDF render path to look up photo for
 *   a parsed-edition section.
 *
 * Source: S229 G-PR6 silent-drop — photo manifest writes `FRONT_PAGE`
 * (underscore), edition parser produces `FRONT PAGE` (space), pre-S234
 * comparison was uppercase-only and the mismatch silently dropped FP1
 * photos. Normalization fixes both sides symmetrically.
 *
 * No filesystem reads. Pure-function surfaces under direct unit test.
 */

'use strict';

var assert = require('assert');
var pdfGen = require('./generate-edition-pdf.js');

function passing(name, fn) {
  try { fn(); console.log('  PASS  ' + name); return 1; }
  catch (e) { console.error('  FAIL  ' + name); console.error('        ' + (e.message || e)); return 0; }
}

var passed = 0;
var total = 0;

console.log('\n[engine.25 G-PR6] generate-edition-pdf section normalization\n');

// ---------------------------------------------------------------------------
console.log('Group 1 — normalizeSectionId (pure)');

total++; passed += passing('FRONT_PAGE and FRONT PAGE normalize equal', function () {
  assert.strictEqual(pdfGen.normalizeSectionId('FRONT_PAGE'),
                     pdfGen.normalizeSectionId('FRONT PAGE'));
  assert.strictEqual(pdfGen.normalizeSectionId('FRONT_PAGE'), 'FRONT PAGE');
});

total++; passed += passing('mixed case normalizes to upper', function () {
  assert.strictEqual(pdfGen.normalizeSectionId('front_page'), 'FRONT PAGE');
  assert.strictEqual(pdfGen.normalizeSectionId('Front Page'), 'FRONT PAGE');
  assert.strictEqual(pdfGen.normalizeSectionId('fRoNt_PaGe'), 'FRONT PAGE');
});

total++; passed += passing('multiple underscores or spaces collapse to single space', function () {
  assert.strictEqual(pdfGen.normalizeSectionId('FRONT__PAGE'), 'FRONT PAGE');
  assert.strictEqual(pdfGen.normalizeSectionId('FRONT   PAGE'), 'FRONT PAGE');
  assert.strictEqual(pdfGen.normalizeSectionId('FRONT _ PAGE'), 'FRONT PAGE');
  assert.strictEqual(pdfGen.normalizeSectionId('FRONT_ _PAGE'), 'FRONT PAGE');
});

total++; passed += passing('leading/trailing whitespace trimmed', function () {
  assert.strictEqual(pdfGen.normalizeSectionId('  FRONT_PAGE  '), 'FRONT PAGE');
  assert.strictEqual(pdfGen.normalizeSectionId('\tFRONT PAGE\n'), 'FRONT PAGE');
});

total++; passed += passing('single-word sections normalize idempotently', function () {
  assert.strictEqual(pdfGen.normalizeSectionId('CIVIC'), 'CIVIC');
  assert.strictEqual(pdfGen.normalizeSectionId('civic'), 'CIVIC');
  assert.strictEqual(pdfGen.normalizeSectionId('SPORTS'), 'SPORTS');
});

total++; passed += passing("EDITOR'S DESK normalizes preserving apostrophe", function () {
  // Apostrophe is not in the underscore-or-whitespace class, must survive.
  assert.strictEqual(pdfGen.normalizeSectionId("EDITOR'S DESK"), "EDITOR'S DESK");
  assert.strictEqual(pdfGen.normalizeSectionId("EDITOR'S_DESK"), "EDITOR'S DESK");
});

total++; passed += passing('falsy input returns empty string (no throw)', function () {
  assert.strictEqual(pdfGen.normalizeSectionId(null), '');
  assert.strictEqual(pdfGen.normalizeSectionId(undefined), '');
  assert.strictEqual(pdfGen.normalizeSectionId(''), '');
});

total++; passed += passing('whitespace-only input returns empty string', function () {
  // ' '.toUpperCase() = ' '; collapse → ' '; trim → ''
  assert.strictEqual(pdfGen.normalizeSectionId('   '), '');
  assert.strictEqual(pdfGen.normalizeSectionId('___'), '');
  assert.strictEqual(pdfGen.normalizeSectionId('_ _'), '');
});

// ---------------------------------------------------------------------------
console.log('\nGroup 2 — findPhotoForSection (uses normalization)');

total++; passed += passing('matches FRONT_PAGE manifest entry to FRONT PAGE parsed name (G-PR6 fix)', function () {
  // From actual output/photos/e94/manifest.json — DJ direction writes
  // section IDs with underscore separator.
  var manifest = {
    photos: [
      { section: 'FRONT_PAGE', file: 'civis_field_baylight_dawn.png' },
      { section: 'CIVIC', file: 'transit_hub_vote_chambers_door.png' },
    ]
  };
  var hit = pdfGen.findPhotoForSection(manifest, 'FRONT PAGE');
  assert.ok(hit, 'should find FRONT_PAGE entry when querying with FRONT PAGE');
  assert.strictEqual(hit.file, 'civis_field_baylight_dawn.png');
});

total++; passed += passing('reverse direction: query with FRONT_PAGE matches FRONT PAGE manifest entry', function () {
  // Symmetric — normalization on both sides.
  var manifest = {
    photos: [{ section: 'FRONT PAGE', file: 'a.png' }]
  };
  var hit = pdfGen.findPhotoForSection(manifest, 'FRONT_PAGE');
  assert.ok(hit);
  assert.strictEqual(hit.file, 'a.png');
});

total++; passed += passing('single-word sections still match (no regression)', function () {
  var manifest = {
    photos: [
      { section: 'CIVIC', file: 'civic-1.png' },
      { section: 'SPORTS', file: 'sports-1.png' },
    ]
  };
  assert.strictEqual(pdfGen.findPhotoForSection(manifest, 'CIVIC').file, 'civic-1.png');
  assert.strictEqual(pdfGen.findPhotoForSection(manifest, 'SPORTS').file, 'sports-1.png');
});

total++; passed += passing('case-insensitive match (no regression)', function () {
  var manifest = { photos: [{ section: 'civic', file: 'a.png' }] };
  assert.ok(pdfGen.findPhotoForSection(manifest, 'CIVIC'));
});

total++; passed += passing('no match returns undefined (Array.find behavior preserved)', function () {
  var manifest = { photos: [{ section: 'CIVIC', file: 'a.png' }] };
  assert.strictEqual(pdfGen.findPhotoForSection(manifest, 'FRONT PAGE'), undefined);
});

total++; passed += passing('null manifest returns null silently', function () {
  assert.strictEqual(pdfGen.findPhotoForSection(null, 'FRONT PAGE'), null);
  assert.strictEqual(pdfGen.findPhotoForSection({}, 'FRONT PAGE'), null);
  assert.strictEqual(pdfGen.findPhotoForSection({ photos: null }, 'FRONT PAGE'), null);
});

total++; passed += passing('empty section name returns null (no false-match on empty manifest section)', function () {
  var manifest = { photos: [{ section: '', file: 'orphan.png' }] };
  assert.strictEqual(pdfGen.findPhotoForSection(manifest, ''), null);
  assert.strictEqual(pdfGen.findPhotoForSection(manifest, null), null);
});

total++; passed += passing('manifest entry without section field skipped (no throw)', function () {
  var manifest = {
    photos: [
      { file: 'orphan.png' },
      { section: null, file: 'orphan2.png' },
      { section: 'CIVIC', file: 'civic.png' },
    ]
  };
  var hit = pdfGen.findPhotoForSection(manifest, 'CIVIC');
  assert.ok(hit);
  assert.strictEqual(hit.file, 'civic.png');
});

// ---------------------------------------------------------------------------
console.log('\nGroup 3 — empirical regression on C94 fixture');

total++; passed += passing('C94 manifest FRONT_PAGE entry resolves for FRONT PAGE parsed section (real fixture)', function () {
  // Shape mirrors output/photos/e94/manifest.json verified S234 via
  // `grep '"section"' output/photos/e94/manifest.json` — first entry is
  // "section": "FRONT_PAGE", subsequent entries "CIVIC", "CULTURE", "SPORTS".
  var c94Manifest = {
    photos: [
      { section: 'FRONT_PAGE', file: 'civis_field_baylight_dawn.png' },
      { section: 'CIVIC', file: 'transit_hub_vote_chambers_door.png' },
      { section: 'CIVIC', file: 'beverly_hayes_stoop_portrait.png' },
      { section: 'CULTURE', file: 'adams_point_doors_opening.png' },
      { section: 'SPORTS', file: 'kelley_in_focus.png' },
      { section: 'SPORTS', file: 'darios_bar_reyna_homer_night.png' },
    ]
  };
  // Editions write section headers as "FRONT PAGE" (space) — parser produces
  // section.name = "FRONT PAGE".
  var fp = pdfGen.findPhotoForSection(c94Manifest, 'FRONT PAGE');
  assert.ok(fp, 'C94 FP1 photo MUST be findable after G-PR6 fix');
  assert.strictEqual(fp.file, 'civis_field_baylight_dawn.png');
});

// ---------------------------------------------------------------------------
console.log('\n[engine.25 G-PR6] ' + passed + ' / ' + total + ' assertions passed across 3 groups');
process.exit(passed === total ? 0 : 1);
