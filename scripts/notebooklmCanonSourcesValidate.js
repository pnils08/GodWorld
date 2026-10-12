#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_INVENTORY = path.join(ROOT, 'output', 'codex', 'notebooklm-source-inventory.json');
const DEFAULT_POLICY = path.join(__dirname, 'notebooklmCanonSources.json');

const BUCKETS = {
  allowedPublishedSourceIds: 'published',
  allowedCanonReferenceSourceIds: 'canon-reference',
  excludedSourceIds: 'excluded',
  // pipeline.59 — graded lore pieces get their own bucket so dedup/format
  // hygiene is enforced on them exactly as it is on published editions.
  allowedLoreSourceIds: 'lore',
};

function parseArgs(argv) {
  const args = {
    inventoryPath: DEFAULT_INVENTORY,
    policyPath: DEFAULT_POLICY,
  };
  for (let index = 2; index < argv.length; index++) {
    const token = argv[index];
    if (token === '--inventory' || token === '--policy') {
      if (!argv[index + 1]) throw new Error(token + ' requires a path');
      const key = token === '--inventory' ? 'inventoryPath' : 'policyPath';
      args[key] = path.resolve(ROOT, argv[++index]);
    } else {
      throw new Error('unknown argument: ' + token);
    }
  }
  return args;
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(label + ' must be an object');
  }
}

// Strict (default): every notebook source must be classified and decided -- the
// audit the CLI runs. Scoped ({ scoped: true }): what the canon search runs. The
// search only ever reads the published / canon-reference IDs it selects, so a
// source added to the notebook after the last review (unclassified), a renamed
// title, or a deleted excluded/lore source cannot stop a published-lane query;
// those surface in the result instead of throwing. Everything the search will
// actually select is still checked hard: it must exist in the live inventory
// and carry a decision.
function validatePolicy(inventory, policy, options = {}) {
  const scoped = Boolean(options.scoped);
  requireObject(inventory, 'inventory');
  requireObject(policy, 'policy');
  if (policy.policyMode !== 'fail_closed') {
    throw new Error('policyMode must be fail_closed');
  }
  if (!policy.notebookId || policy.notebookId !== inventory.notebookId) {
    throw new Error('policy notebookId does not match inventory');
  }
  if (!Array.isArray(inventory.sources)) {
    throw new Error('inventory.sources must be an array');
  }
  requireObject(policy.decisions, 'policy.decisions');

  const inventoryById = new Map();
  for (const source of inventory.sources) {
    const id = String(source && source.id || '').trim();
    if (!id || inventoryById.has(id)) {
      throw new Error('inventory contains a missing or duplicate source ID');
    }
    inventoryById.set(id, source);
  }

  const assigned = new Map();
  const counts = {};
  for (const [bucket, classification] of Object.entries(BUCKETS)) {
    const ids = policy[bucket];
    if (!Array.isArray(ids)) throw new Error(bucket + ' must be an array');
    counts[classification] = ids.length;
    const seenInBucket = new Set();
    for (const rawId of ids) {
      const id = String(rawId || '').trim();
      if (!id) throw new Error(bucket + ' contains an empty source ID');
      if (seenInBucket.has(id)) throw new Error(bucket + ' contains duplicate ID ' + id);
      seenInBucket.add(id);
      if (!inventoryById.has(id)) {
        const searchable = bucket === 'allowedPublishedSourceIds' || bucket === 'allowedCanonReferenceSourceIds';
        if (scoped && !searchable) continue;
        throw new Error(bucket + ' contains unknown ID ' + id);
      }
      if (assigned.has(id)) {
        throw new Error('source ID ' + id + ' appears in both ' + assigned.get(id) + ' and ' + bucket);
      }
      assigned.set(id, bucket);
    }
  }

  const unclassifiedIds = [...inventoryById.keys()].filter((id) => !assigned.has(id));
  if (unclassifiedIds.length && !scoped) {
    throw new Error('policy leaves inventory IDs unclassified: ' + unclassifiedIds.join(', '));
  }

  const decisionIds = Object.keys(policy.decisions);
  const unknownDecisions = decisionIds.filter((id) => !inventoryById.has(id));
  if (unknownDecisions.length && !scoped) {
    throw new Error('policy.decisions contains unknown IDs: ' + unknownDecisions.join(', '));
  }
  const missingDecisions = [...assigned.keys()].filter((id) => !policy.decisions[id]);
  if (missingDecisions.length) {
    throw new Error('policy.decisions is missing IDs: ' + missingDecisions.join(', '));
  }

  const renamedIds = [];
  for (const [id, source] of inventoryById.entries()) {
    if (!assigned.has(id)) continue;
    const decision = policy.decisions[id];
    requireObject(decision, 'decision ' + id);
    const bucket = assigned.get(id);
    const expectedClass = BUCKETS[bucket];
    if (decision.classification !== expectedClass) {
      throw new Error('decision ' + id + ' classification does not match ' + bucket);
    }
    if (decision.title !== source.title) {
      if (!scoped) throw new Error('decision ' + id + ' title does not match inventory');
      renamedIds.push(id);
    }
    if (!String(decision.reason || '').trim()) {
      throw new Error('decision ' + id + ' has no reason');
    }
    if (!Array.isArray(decision.evidence) || decision.evidence.length === 0) {
      throw new Error('decision ' + id + ' has no evidence');
    }
    // Admission bases for a non-publication canon reference: the Richmond Archive
    // (narrative-memory contract) or a hand-added Supermemory digest — a synthesis of
    // already-canon material added to the notebook for depth (S429, builder-added
    // 'Detailed Weekly Digest 105a'). Anything else is not a canon reference.
    const basis = String(decision.reason).toLowerCase();
    if (
      expectedClass === 'canon-reference' &&
      !basis.includes('richmond archive') && !basis.includes('supermemory digest')
    ) {
      throw new Error('canon reference ' + id + ' lacks its non-publication admission basis');
    }
  }

  return {
    valid: true,
    notebookId: policy.notebookId,
    inventoryCount: inventoryById.size,
    counts,
    crossBucketDuplicates: 0,
    unknownIds: 0,
    unclassifiedIds: unclassifiedIds.length,
    ...(scoped ? { scoped: true, renamedIds } : {}),
  };
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(label + ' could not be read as JSON: ' + error.message);
  }
}

function main(argv) {
  const args = parseArgs(argv);
  const inventory = readJson(args.inventoryPath, 'inventory');
  const policy = readJson(args.policyPath, 'policy');
  const result = validatePolicy(inventory, policy);
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  try {
    main(process.argv);
  } catch (error) {
    console.error('NotebookLM canon-source policy invalid: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  BUCKETS,
  parseArgs,
  validatePolicy,
};
