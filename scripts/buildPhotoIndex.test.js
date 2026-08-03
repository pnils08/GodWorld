'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildPhotoIndex } = require('./buildPhotoIndex');

function makeMeta(slug, overrides) {
  return Object.assign({
    slug,
    cycle: 1,
    spec: {
      slug,
      storyline: `Storyline for ${slug}`,
      thesis: `Thesis for ${slug}`,
      mood: 'somber',
      motifs: ['motif-a', 'motif-b'],
      composition: 'Composition text',
      credit: 'Credit Line',
      section: 'FRONT_PAGE',
      image_prompt: 'prompt',
    },
    dimensions: { width: 1024, height: 768 },
  }, overrides || {});
}

function makeManifest(cycle, photos) {
  return {
    cycle,
    type: 'edition',
    slug: `e${cycle}`,
    provider: 'test',
    model: 'test-model',
    generatedAt: new Date().toISOString(),
    specCount: photos.length,
    successCount: photos.length,
    failureCount: 0,
    photos,
    failures: [],
    qa: { pass: photos.length, flag: 0, fail: 0, errorOrSkip: 0, regenAttempts: 0, runAt: new Date().toISOString() },
  };
}

function writeJson(dir, name, data) {
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2), 'utf8');
}

function touch(dir, name) {
  fs.writeFileSync(path.join(dir, name), Buffer.alloc(0));
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'build-photo-index-'));
const photosDir = path.join(tmpRoot, 'output', 'photos');
const indexPath = path.join(photosDir, 'index.json');

try {
  fs.mkdirSync(path.join(photosDir, 'e1'), { recursive: true });
  fs.mkdirSync(path.join(photosDir, 'e2'), { recursive: true });

  writeJson(path.join(photosDir, 'e1'), 'manifest.json', makeManifest(1, [
    {
      slug: 'alpha_photo',
      file: 'alpha_photo.png',
      sidecar: 'alpha_photo.meta.json',
      credit: 'Alpha Credit',
      section: 'CIVIC',
      elapsedMs: 100,
      dropped: false,
      editorialFlag: false,
    },
    {
      slug: 'missing_file_photo',
      file: 'missing_file_photo.png',
      sidecar: 'missing_file_photo.meta.json',
      credit: 'Missing Credit',
      section: 'SPORTS',
      elapsedMs: 100,
      dropped: false,
      editorialFlag: false,
    },
  ]));
  writeJson(path.join(photosDir, 'e1'), 'alpha_photo.meta.json', makeMeta('alpha_photo'));
  touch(path.join(photosDir, 'e1'), 'alpha_photo.png');

  writeJson(path.join(photosDir, 'e2'), 'manifest.json', makeManifest(2, [
    {
      slug: 'beta_photo',
      file: 'beta_photo.png',
      sidecar: 'beta_photo.meta.json',
      credit: 'Beta Credit',
      section: 'BUSINESS',
      elapsedMs: 200,
      dropped: true,
      editorialFlag: true,
    },
  ]));
  touch(path.join(photosDir, 'e2'), 'beta_photo.png');

  const result = buildPhotoIndex(photosDir, indexPath, tmpRoot);

  assert.strictEqual(result.cycleCount, 2, 'cycleCount');
  assert.strictEqual(result.photoCount, 2, 'photoCount');
  assert.strictEqual(result.missingFiles, 1, 'missingFiles');
  assert.deepStrictEqual(result.cycles, [1, 2], 'cycles sorted numerically');

  const slugs = result.photos.map((p) => p.slug);
  assert.deepStrictEqual(slugs, ['alpha_photo', 'beta_photo'], 'photos sorted by cycle then slug');

  const alpha = result.photos[0];
  assert.strictEqual(alpha.cycle, 1);
  assert.strictEqual(alpha.file, 'alpha_photo.png');
  assert.strictEqual(alpha.path, 'output/photos/e1/alpha_photo.png');
  assert.strictEqual(alpha.section, 'CIVIC');
  assert.strictEqual(alpha.credit, 'Alpha Credit');
  assert.strictEqual(alpha.editorialFlag, false);
  assert.strictEqual(alpha.dropped, false);
  assert.strictEqual(alpha.storyline, 'Storyline for alpha_photo');
  assert.strictEqual(alpha.thesis, 'Thesis for alpha_photo');
  assert.strictEqual(alpha.mood, 'somber');
  assert.deepStrictEqual(alpha.motifs, ['motif-a', 'motif-b']);
  assert.deepStrictEqual(alpha.dimensions, { width: 1024, height: 768 });

  const beta = result.photos[1];
  assert.strictEqual(beta.cycle, 2);
  assert.strictEqual(beta.section, 'BUSINESS');
  assert.strictEqual(beta.dropped, true);
  assert.strictEqual(beta.editorialFlag, true);
  assert.strictEqual(beta.storyline, null, 'missing sidecar yields null storyline');
  assert.strictEqual(beta.motifs, null);
  assert.strictEqual(beta.dimensions, null);

  const firstBytes = fs.readFileSync(indexPath);
  buildPhotoIndex(photosDir, indexPath, tmpRoot);
  const secondBytes = fs.readFileSync(indexPath);
  assert.ok(firstBytes.length > 0, 'index file not empty');
  assert.strictEqual(firstBytes.toString(), secondBytes.toString(), 'deterministic output');

  console.log('buildPhotoIndex.test.js: all assertions passed');
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
