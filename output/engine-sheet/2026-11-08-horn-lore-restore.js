#!/usr/bin/env node
'use strict';
// pipeline.103 (builder 2026-11-08 "Put it back"): the Danny Horn deep dive that passed the lore gate
// on 2026-10-18 (441f8d89b, source 3824b8b0-…) was deleted from the permanent notebook outside any
// script, and nothing replaced it. Re-adds the same file under the same title through notebooklmPush
// (lore, no audio, no summary), verifies the new id is listed, and moves the canon source policy's lore
// entry to the new id. Nothing else is touched: bay-tribune already holds the piece; no newsroom staging.
//   node output/engine-sheet/2026-11-08-horn-lore-restore.js           dry run: checks only
//   node output/engine-sheet/2026-11-08-horn-lore-restore.js --apply   add, verify, update the policy
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const APPLY = process.argv.includes('--apply');
const FILE = 'output/lore-quarantine/danny_horn_deep_dive.md';
const TAG = 'Y3C7';
const TITLE = 'Lore: danny_horn_deep_dive (Y3C7)';
const OLD_ID = '3824b8b0-910b-4fe5-ad3e-3cc1a181cca1';
const { nlm } = require(path.join(ROOT, 'scripts', 'notebooklmPush'));
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'notebooklm.json'), 'utf8'));
const policyPath = path.join(ROOT, 'scripts', 'notebooklmCanonSources.json');

function list() {
  const r = nlm(['source', 'list', config.notebookId, '--json']);
  if (!r.ok) { console.log('STOP: source list failed: ' + r.out.slice(0, 200)); process.exit(1); }
  return JSON.parse(r.out);
}

const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
if (policy.allowedLoreSourceIds.indexOf(OLD_ID) < 0) { console.log('STOP: ' + OLD_ID + ' is not in the lore bucket'); process.exit(1); }
const before = list();
if (before.some((s) => s.id === OLD_ID)) { console.log('STOP: the old source is still in the notebook'); process.exit(1); }
if (before.some((s) => s.title === TITLE)) { console.log('STOP: a source titled "' + TITLE + '" is already in the notebook'); process.exit(1); }
if (!fs.existsSync(path.join(ROOT, FILE))) { console.log('STOP: ' + FILE + ' missing'); process.exit(1); }
console.log('checks pass: old id not live, title not live, file present (' + before.length + ' sources)');
if (!APPLY) { console.log('(dry run) would push ' + FILE + ' as "' + TITLE + '" and move the policy entry'); process.exit(0); }

const push = spawnSync('node', [path.join(ROOT, 'scripts', 'notebooklmPush.js'), '--file', FILE, '--kind', 'lore', '--tag', TAG, '--no-audio', '--no-summary'],
  { cwd: ROOT, encoding: 'utf8', timeout: 300000 });
const out = String(push.stdout || '') + String(push.stderr || '');
console.log(out.trim());
if (/NOTEBOOKLM PUSH FAILED/.test(out)) { console.log('STOP: push degraded — policy unchanged'); process.exit(1); }
const m = out.match(/Source added: .*\(([0-9a-f-]{36})\)\s*$/m);
if (!m) { console.log('STOP: no source id in the push output — policy unchanged'); process.exit(1); }
const NEW_ID = m[1];
const after = list();
const added = after.find((s) => s.id === NEW_ID);
if (!added || added.title !== TITLE) { console.log('STOP: new source not listed under the expected title — policy unchanged'); process.exit(1); }

const b = policy.allowedLoreSourceIds;
b.splice(b.indexOf(OLD_ID), 1, NEW_ID);
const old = policy.decisions[OLD_ID] || {};
delete policy.decisions[OLD_ID];
policy.decisions[NEW_ID] = { ...old, title: TITLE,
  reason: (old.reason || '') + ' Restored copy (builder 2026-11-08 "Put it back"): the same file re-added; replaces ' + OLD_ID + ', deleted from the notebook outside any script.',
  evidence: [...(old.evidence || []), 'Restore: output/engine-sheet/2026-11-08-horn-lore-restore.js'] };
fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'output', 'engine-sheet', '2026-11-08-horn-lore-restore.json'),
  JSON.stringify({ at: new Date().toISOString(), notebookId: config.notebookId, title: TITLE, file: FILE, oldId: OLD_ID, newId: NEW_ID, status: added.status }, null, 1) + '\n');
console.log('policy: ' + OLD_ID + ' → ' + NEW_ID + ' (status ' + added.status + ', ' + after.length + ' sources)');
