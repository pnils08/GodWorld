'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const PHOTOS_DIR = path.join(REPO_ROOT, 'output', 'photos');
const INDEX_PATH = path.join(PHOTOS_DIR, 'index.json');

function isEditionDir(name) {
  return /^e\d+$/.test(name);
}

function cycleFromDir(name) {
  return Number(name.slice(1));
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return null;
  }
}

function repoRelative(absolutePath, root) {
  return path.relative(root, absolutePath).split(path.sep).join('/');
}

function buildPhotoIndex(photosDir, indexPath, repoRoot) {
  const root = repoRoot || REPO_ROOT;
  const entries = [];
  let missingFiles = 0;
  let maxGeneratedAt = 0;

  if (!fs.existsSync(photosDir)) {
    throw new Error(`Photos directory not found: ${photosDir}`);
  }

  const dirNames = fs.readdirSync(photosDir).filter((name) => {
    const full = path.join(photosDir, name);
    return fs.statSync(full).isDirectory() && isEditionDir(name);
  });

  for (const dirName of dirNames) {
    const cycleDir = path.join(photosDir, dirName);
    const manifestPath = path.join(cycleDir, 'manifest.json');
    const manifest = readJsonSafe(manifestPath);
    if (!manifest || !Array.isArray(manifest.photos)) {
      continue;
    }

    if (manifest.generatedAt) {
      const ts = new Date(manifest.generatedAt).getTime();
      if (Number.isFinite(ts) && ts > maxGeneratedAt) {
        maxGeneratedAt = ts;
      }
    }

    const cycle = typeof manifest.cycle === 'number' ? manifest.cycle : cycleFromDir(dirName);

    for (const photo of manifest.photos) {
      if (!photo || typeof photo.file !== 'string' || !photo.file) {
        continue;
      }

      const filePath = path.join(cycleDir, photo.file);
      if (!fs.existsSync(filePath)) {
        missingFiles++;
        continue;
      }

      const sidecarPath = typeof photo.sidecar === 'string' && photo.sidecar
        ? path.join(cycleDir, photo.sidecar)
        : null;
      const sidecar = sidecarPath && fs.existsSync(sidecarPath)
        ? readJsonSafe(sidecarPath)
        : null;
      const spec = sidecar && sidecar.spec ? sidecar.spec : null;

      entries.push({
        cycle,
        slug: photo.slug || path.basename(photo.file, path.extname(photo.file)),
        file: photo.file,
        path: repoRelative(filePath, root),
        section: photo.section || (spec && spec.section) || null,
        credit: photo.credit || (spec && spec.credit) || null,
        editorialFlag: Boolean(photo.editorialFlag),
        dropped: Boolean(photo.dropped),
        storyline: spec && spec.storyline ? spec.storyline : null,
        thesis: spec && spec.thesis ? spec.thesis : null,
        mood: spec && spec.mood ? spec.mood : null,
        motifs: spec && Array.isArray(spec.motifs) ? spec.motifs : null,
        dimensions: sidecar && sidecar.dimensions ? sidecar.dimensions : null,
      });
    }
  }

  entries.sort((a, b) => {
    if (a.cycle !== b.cycle) return a.cycle - b.cycle;
    return a.slug.localeCompare(b.slug, 'en');
  });

  const cycles = [...new Set(entries.map((p) => p.cycle))].sort((a, b) => a - b);

  const generatedAt = maxGeneratedAt
    ? new Date(maxGeneratedAt).toISOString()
    : new Date().toISOString();

  const output = {
    generatedAt,
    cycleCount: cycles.length,
    photoCount: entries.length,
    missingFiles,
    cycles,
    photos: entries,
  };

  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, JSON.stringify(output, null, 2) + '\n', 'utf8');

  return output;
}

if (require.main === module) {
  const result = buildPhotoIndex(PHOTOS_DIR, INDEX_PATH);
  console.log(
    `Photo index built: ${result.cycleCount} cycles, ${result.photoCount} photos, ${result.missingFiles} missing files → ${repoRelative(INDEX_PATH, REPO_ROOT)}`
  );
}

module.exports = { buildPhotoIndex };
