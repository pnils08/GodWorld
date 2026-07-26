#!/usr/bin/env node
'use strict';

/**
 * Inventory the configured permanent NotebookLM notebook for builder review.
 *
 * This script is READ-ONLY against NotebookLM. It lists sources and writes a
 * local diagnostic under output/codex/. Review buckets are title-based hints,
 * never canon decisions and never a runtime allowlist.
 *
 * Usage:
 *   node scripts/notebooklmSourceInventory.js
 *   node scripts/notebooklmSourceInventory.js --output-dir output/codex
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'notebooklm.json');
const NLM = path.join(ROOT, '.venv', 'nlm', 'bin', 'nlm');
const DEFAULT_OUTPUT_DIR = path.join(ROOT, 'output', 'codex');

function parseArgs(argv) {
  const args = { outputDir: DEFAULT_OUTPUT_DIR };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--output-dir') {
      if (!argv[i + 1]) throw new Error('--output-dir requires a path');
      args.outputDir = path.resolve(ROOT, argv[++i]);
    } else if (token.startsWith('--output-dir=')) {
      args.outputDir = path.resolve(ROOT, token.slice('--output-dir='.length));
    } else {
      throw new Error('unknown argument: ' + token);
    }
  }
  const relative = path.relative(ROOT, args.outputDir);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('--output-dir must stay inside the repository');
  }
  return args;
}

function classifyTitle(title) {
  const value = String(title || '').trim();
  const lower = value.toLowerCase();

  if (/(?:^|[\s_.-])(draft|sample|unpublished)(?:$|[\s_.-])|\bworking copy\b/.test(lower)) {
    return {
      reviewBucket: 'exclude_candidate',
      reviewReason: 'title signals draft/sample/unpublished material',
    };
  }
  if (
    /(?:^|[\s_.-])world[\s_-]+summary(?:$|[\s_.-])/.test(lower) ||
    /building deep storyline materials/.test(lower)
  ) {
    return {
      reviewBucket: 'nonpublication_candidate',
      reviewReason: 'title signals derived world-state or process/reference material',
    };
  }
  if (
    /(?:^|[\s_-])(edition|dispatch|supplemental|interview)(?:$|[\s_.-])/.test(lower) ||
    /^c\d+\s+[—-]\s+cycle_pulse/.test(lower) ||
    /^bay_tribune_e\d+/.test(lower) ||
    /^cycle_pulse_edition_\d+/.test(lower)
  ) {
    return {
      reviewBucket: 'publication_candidate',
      reviewReason: 'title resembles an Edition or approved off-cycle publication',
    };
  }
  return {
    reviewBucket: 'needs_review',
    reviewReason: 'title alone does not establish publication or exclusion status',
  };
}

function normalizeSources(value) {
  if (!Array.isArray(value)) {
    throw new Error('source list must be a JSON array');
  }
  return value.map((source, index) => {
    if (!source || typeof source !== 'object') {
      throw new Error('source list item ' + index + ' must be an object');
    }
    const id = String(source.id || source.source_id || '').trim();
    const title = String(source.title || source.name || '').trim();
    if (!id || !title) {
      throw new Error('source list item ' + index + ' is missing id or title');
    }
    return Object.assign({
      id,
      title,
      type: String(source.type || 'unknown'),
    }, classifyTitle(title));
  }).sort((a, b) => a.title.localeCompare(b.title));
}

function bucketCounts(sources) {
  const counts = {
    publication_candidate: 0,
    nonpublication_candidate: 0,
    exclude_candidate: 0,
    needs_review: 0,
  };
  for (const source of sources) {
    if (!(source.reviewBucket in counts)) {
      throw new Error('unknown review bucket: ' + source.reviewBucket);
    }
    counts[source.reviewBucket]++;
  }
  return counts;
}

function renderMarkdown(inventory) {
  const lines = [
    '# NotebookLM Permanent-Notebook Source Inventory',
    '',
    'Artifact class: CODEX_DIAGNOSTIC',
    'Canon status: NOT CANON. Review buckets are title-based suggestions only.',
    'Notebook: ' + inventory.notebookName,
    'Notebook ID: ' + inventory.notebookId,
    'Generated: ' + inventory.generatedAt,
    'Total sources: ' + inventory.total,
    '',
    '## Review counts',
    '',
    '| Bucket | Count |',
    '|---|---:|',
  ];
  for (const [bucket, count] of Object.entries(inventory.counts)) {
    lines.push('| `' + bucket + '` | ' + count + ' |');
  }
  lines.push(
    '',
    '## Sources',
    '',
    '| Title | Reported type | Review bucket | Reason | Source ID |',
    '|---|---|---|---|---|'
  );
  for (const source of inventory.sources) {
    const safe = (value) => String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
    lines.push(
      '| ' + safe(source.title) +
      ' | `' + safe(source.type) +
      '` | `' + safe(source.reviewBucket) +
      '` | ' + safe(source.reviewReason) +
      ' | `' + safe(source.id) + '` |'
    );
  }
  lines.push(
    '',
    'No row in this report is admitted to a runtime canon-search allowlist. ' +
      'Every source requires explicit Task 2 review.',
    ''
  );
  return lines.join('\n');
}

function buildInventory(config, sourceList, generatedAt) {
  const notebookId = String(config.notebookId || '').trim();
  if (!notebookId) throw new Error('config/notebooklm.json has no notebookId');
  const sources = normalizeSources(sourceList);
  return {
    artifactClass: 'CODEX_NOTEBOOKLM_SOURCE_INVENTORY',
    canonStatus: 'NOT_CANON',
    generatedAt,
    notebookId,
    notebookName: String(config.notebookName || 'GodWorld'),
    total: sources.length,
    counts: bucketCounts(sources),
    sources,
    warning: 'Review buckets are title-based suggestions only; no source is automatically allowed.',
  };
}

function listSources(notebookId) {
  if (!fs.existsSync(NLM)) throw new Error('nlm CLI missing at ' + NLM);
  const result = spawnSync(NLM, ['source', 'list', notebookId, '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error('nlm source list failed: ' + String(result.stderr || result.stdout || '').trim().slice(0, 500));
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error('nlm source list returned invalid JSON: ' + error.message);
  }
}

function writeInventory(inventory, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'notebooklm-source-inventory.json');
  const mdPath = path.join(outputDir, 'notebooklm-source-inventory.md');
  fs.writeFileSync(jsonPath, JSON.stringify(inventory, null, 2) + '\n');
  fs.writeFileSync(mdPath, renderMarkdown(inventory));
  return { jsonPath, mdPath };
}

function main(argv) {
  const args = parseArgs(argv);
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const sourceList = listSources(config.notebookId);
  const inventory = buildInventory(config, sourceList, new Date().toISOString());
  const paths = writeInventory(inventory, args.outputDir);
  console.log('NotebookLM source inventory: ' + inventory.total + ' sources');
  console.log('JSON: ' + path.relative(ROOT, paths.jsonPath));
  console.log('Markdown: ' + path.relative(ROOT, paths.mdPath));
  console.log('Review buckets are suggestions only; zero sources were authorized.');
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (error) {
    console.error('NotebookLM source inventory failed: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  parseArgs,
  classifyTitle,
  normalizeSources,
  bucketCounts,
  renderMarkdown,
  buildInventory,
  writeInventory,
};
