#!/usr/bin/env node
/**
 * diskRefScan.js — Phase 2 Task 2.1 of the /disk-audit pipeline.
 *
 * Reads the latest disk_inventory_<DATE>.json, builds a basename → entries
 * map from the manifest, then makes ONE pass over the ref-search corpus
 * (manifest entries under GodWorld/ or .claude/, per Q2) and produces an
 * inverse basename → [refSites] map. Per-entry refCount + top-5 refSites
 * are written to output/disk_refscan_<DATE>.json.
 *
 * Read-only end-to-end. Never mutates source files.
 *
 * Plan: docs/plans/2026-05-05-disk-inventory-and-dead-file-detection.md
 *       §Advisor steers (S203) — one-pass shape + common-basename flag
 *
 * Usage:
 *   node scripts/diskRefScan.js              # use latest inventory
 *   node scripts/diskRefScan.js --inventory <path>
 *   node scripts/diskRefScan.js --dry-run    # don't write output, print summary
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

// Manifest basename frequency above which we annotate "common: true".
// Common basenames (index.md, README.md, package.json) collide-bomb the
// orphan report — refCount alone can't distinguish "this README is referenced"
// from "the OTHER README is referenced." Downstream consumers should treat
// `common: true` entries with caution.
const COMMON_THRESHOLD = 5;

// Skip binary extensions — they don't contain text references to authored basenames.
const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp',
  '.pdf', '.zip', '.gz', '.tar', '.bz2', '.7z', '.xz',
  '.db', '.sqlite', '.sqlite3',
  '.so', '.o', '.a', '.bin', '.exe', '.dll', '.dylib',
  '.mp4', '.mp3', '.wav', '.flac', '.ogg', '.webm', '.mov',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.psd', '.ai',
]);

// Cap per-file scan size — large data files (e.g. world_summary blobs, dumps)
// rarely contain authored-basename references. Skip past 5 MiB.
const MAX_SCAN_BYTES = 5 * 1024 * 1024;

// Corpus = manifest entries whose path starts with one of these prefixes.
// Per Q2 (resolved S203): /root/GodWorld + /root/.claude only.
const CORPUS_PREFIXES = ['GodWorld/', '.claude/'];

// CORPUS_EXCLUDE_PATTERNS — files inside the corpus prefixes that we DO NOT
// want to scan as reference sites. Three classes:
//   (a) This skill's own outputs (chicken-and-egg — they list every basename)
//   (b) LLM-generated transcripts (recapitulate filenames; not code refs)
//   (c) claude-code/claude-mem observation dumps (AI-output noise)
// First wave fix S203 — pre-fix, 4,412 entries had refCount=2 with both
// disk_inventory + disk_refscan as their only sites.
const CORPUS_EXCLUDE_PATTERNS = [
  // (a) This skill's own outputs
  /^GodWorld\/output\/disk_/,
  /^output\/disk_/,
  // (b) LLM batch transcripts — list filenames but don't authoritatively reference
  /^\.claude\/batches\//,
  /^GodWorld\/\.claude\/batches\//,
  // claude-code shell history — every command typed, including grep / cat / ls
  /^\.claude\/history\.jsonl$/,
  /^GodWorld\/\.claude\/history\.jsonl$/,
  // (c) claude-mem extracted observations — AI summaries, not code
  /^\.claude\/memories\//,
  /^GodWorld\/\.claude\/memories\//,
];

// Tokenizer — splits on anything that isn't a basename-character.
// Keeps dotfiles (.bashrc), extensions (.md), underscores (world_summary), hyphens (claude-mem.db).
const TOKEN_SPLIT = /[^a-zA-Z0-9._-]+/;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { inventory: null, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--inventory') args.inventory = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: node scripts/diskRefScan.js [--inventory PATH] [--dry-run]');
      process.exit(0);
    }
  }
  return args;
}

function findLatestInventory(outDir) {
  const files = fs.readdirSync(outDir).filter(f => f.startsWith('disk_inventory_') && f.endsWith('.json'));
  if (!files.length) throw new Error(`No disk_inventory_*.json found in ${outDir}`);
  files.sort();
  return path.join(outDir, files[files.length - 1]);
}

// ---------------------------------------------------------------------------
// Build basename map from manifest
// ---------------------------------------------------------------------------

// Minimum stem length to index. Below this, stems collide with too many
// common-word tokens in prose (e.g. a 2-char stem matches everywhere).
const STEM_MIN_LENGTH = 3;

function basenameForms(bn) {
  // For 'foo.md' returns ['foo.md', 'foo'] — wiki convention strips extensions
  // ('[[engine/LEDGER_REPAIR_HOUSEHOLDS]]' references LEDGER_REPAIR_HOUSEHOLDS.md).
  // For dotfiles (.bashrc, .gitignore) returns just ['.bashrc'] — no separate stem.
  const parsed = path.parse(bn);
  if (parsed.ext === '' || !parsed.name || parsed.name.length < STEM_MIN_LENGTH) {
    return [bn];
  }
  return [bn, parsed.name];
}

function buildBasenameMap(entries) {
  const map = new Map(); // token (basename or stem) → [manifestEntry, ...]
  for (const entry of entries) {
    const bn = path.basename(entry.path);
    for (const form of basenameForms(bn)) {
      if (!map.has(form)) map.set(form, []);
      map.get(form).push(entry);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Corpus scan
// ---------------------------------------------------------------------------

function scanCorpusFile(absPath, basenameSet) {
  let content;
  try {
    content = fs.readFileSync(absPath, 'utf8');
  } catch {
    return null; // permission / encoding / vanished — skip silently
  }
  const found = new Set();
  for (const tok of content.split(TOKEN_SPLIT)) {
    if (tok && basenameSet.has(tok)) found.add(tok);
  }
  return found;
}

function scanCorpus(corpus, basenameSet, rootAbs) {
  // inverseMap: basename → Set<corpus_file_path>
  const inverseMap = new Map();
  let scanned = 0;
  let skippedBinary = 0;
  let skippedSize = 0;
  let totalBytes = 0;

  for (const entry of corpus) {
    if (BINARY_EXTS.has(entry.ext)) {
      skippedBinary++;
      continue;
    }
    if (entry.size > MAX_SCAN_BYTES) {
      skippedSize++;
      continue;
    }

    const absPath = path.join(rootAbs, entry.path);
    const found = scanCorpusFile(absPath, basenameSet);
    if (!found) continue;

    scanned++;
    totalBytes += entry.size;

    for (const bn of found) {
      if (!inverseMap.has(bn)) inverseMap.set(bn, new Set());
      // Self-reference filter: a file that contains its own basename should not
      // count itself as a reference site.
      if (path.basename(entry.path) !== bn) {
        inverseMap.get(bn).add(entry.path);
      }
    }
  }

  return { inverseMap, scanned, skippedBinary, skippedSize, totalBytes };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv);

  const repoRoot = path.resolve(__dirname, '..');
  const outDir = path.join(repoRoot, 'output');

  const inventoryPath = args.inventory || findLatestInventory(outDir);
  console.log(`[diskRefScan] reading inventory: ${inventoryPath}`);
  const manifest = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const rootAbs = manifest.root;

  const start = Date.now();

  // Step 1: basename → entries map. Identify common basenames.
  const basenameMap = buildBasenameMap(manifest.entries);
  const basenameSet = new Set(basenameMap.keys());
  const commonBasenames = [...basenameMap.entries()]
    .filter(([, entries]) => entries.length > COMMON_THRESHOLD)
    .map(([bn, entries]) => ({ basename: bn, count: entries.length }))
    .sort((a, b) => b.count - a.count);

  // Step 2: corpus = manifest entries under /root/GodWorld or /root/.claude,
  // minus paths matching CORPUS_EXCLUDE_PATTERNS (this skill's own outputs +
  // LLM/AI transcripts that recapitulate filenames without authoritatively
  // referencing them).
  const corpus = manifest.entries.filter(e => {
    if (!CORPUS_PREFIXES.some(p => e.path.startsWith(p))) return false;
    for (const re of CORPUS_EXCLUDE_PATTERNS) {
      if (re.test(e.path)) return false;
    }
    return true;
  });

  console.log(`[diskRefScan] basenames: ${basenameSet.size} unique (${commonBasenames.length} common, >${COMMON_THRESHOLD}×)`);
  console.log(`[diskRefScan] corpus: ${corpus.length} files (filter: GodWorld/ + .claude/)`);

  // Step 3: scan corpus, build inverse map.
  const { inverseMap, scanned, skippedBinary, skippedSize, totalBytes } =
    scanCorpus(corpus, basenameSet, rootAbs);

  // Step 4: per manifest entry, lookup refCount + top-5 refSites.
  // Lookup unions BOTH forms (full basename + stem) — wiki convention strips
  // extensions in [[wikilinks]]; require() drops .js. Self-references already
  // filtered during corpus scan.
  const commonSet = new Set(commonBasenames.map(c => c.basename));
  const refEntries = manifest.entries.map(entry => {
    const bn = path.basename(entry.path);
    const forms = basenameForms(bn);
    const sites = new Set();
    for (const form of forms) {
      const formSites = inverseMap.get(form);
      if (formSites) for (const s of formSites) sites.add(s);
    }
    const sitesArr = [...sites];
    return {
      path: entry.path,
      basename: bn,
      size: entry.size,
      mtime: entry.mtime,
      gitTracked: entry.gitTracked,
      refCount: sitesArr.length,
      refSites: sitesArr.slice(0, 5),
      common: forms.some(f => commonSet.has(f)),
    };
  });

  const elapsedMs = Date.now() - start;

  // Summary stats
  const orphansLikely = refEntries.filter(e => e.refCount === 0 && !e.common).length;
  const commonOrphans = refEntries.filter(e => e.refCount === 0 && e.common).length;
  const referenced = refEntries.filter(e => e.refCount > 0).length;

  const output = {
    generatedAt: new Date().toISOString(),
    inventorySource: path.relative(repoRoot, inventoryPath),
    corpusFilter: CORPUS_PREFIXES,
    corpusFiles: corpus.length,
    corpusScanned: scanned,
    corpusSkippedBinary: skippedBinary,
    corpusSkippedSize: skippedSize,
    corpusBytesScanned: totalBytes,
    elapsedMs,
    basenameUnique: basenameSet.size,
    commonBasenames,
    summary: {
      total: refEntries.length,
      referenced,
      orphansLikely,
      commonOrphans,
    },
    entries: refEntries,
  };

  if (args.dryRun) {
    console.log(`[dry-run] scanned ${scanned} files / ${(totalBytes / 1024 / 1024).toFixed(1)} MB / ${(elapsedMs / 1000).toFixed(1)}s`);
    console.log(`[dry-run] ${referenced} referenced / ${orphansLikely} orphan-likely / ${commonOrphans} common-orphan`);
    console.log(`[dry-run] top common basenames:`);
    commonBasenames.slice(0, 10).forEach(c => console.log(`  ${String(c.count).padStart(4)}× ${c.basename}`));
    return;
  }

  const date = new Date().toISOString().slice(0, 10);
  const outPath = path.join(outDir, `disk_refscan_${date}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`Refscan: ${refEntries.length} entries, ${scanned} corpus files scanned, ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  console.log(`         ${referenced} referenced / ${orphansLikely} orphan-likely / ${commonOrphans} common-orphan`);
  console.log(`         elapsed ${(elapsedMs / 1000).toFixed(1)}s, written to ${outPath}`);
}

if (require.main === module) main();

module.exports = { buildBasenameMap, scanCorpusFile, scanCorpus, COMMON_THRESHOLD };
