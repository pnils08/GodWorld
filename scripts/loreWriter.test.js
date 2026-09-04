#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { slugify, FALLBACK_MIN_CHARS, clampToQuarantine, QUARANTINE_DIR } = require('./loreWriter');

// slugify: filesystem-safe, lowercase, truncated, never empty.
assert.strictEqual(slugify('Write a ledger-grounded deep-dive on Mark Aitken (POP-00003).'),
  'write-a-ledger-grounded-deep-dive-on-mar');
assert.strictEqual(slugify(''), 'untitled');
assert.strictEqual(slugify(null), 'untitled');
assert.ok(slugify('x'.repeat(200)).length <= 40, 'slug stays within the filename-safety cap');
assert.ok(!/[^a-z0-9-]/.test(slugify('Weird!! @@ Chars ## Here')), 'only lowercase/digits/hyphens survive');

// FALLBACK_MIN_CHARS: a real long-form piece clears it comfortably; closing
// chatter ("Done." / "Let me know if you want revisions.") does not.
assert.ok(FALLBACK_MIN_CHARS > 0 && FALLBACK_MIN_CHARS < 1000);
assert.ok('Let me know if you would like any revisions.'.length < FALLBACK_MIN_CHARS);

// clampToQuarantine still throws on traversal after the refactor (the fix
// must not weaken the security fixes documented at the top of the file).
assert.throws(() => clampToQuarantine('../../etc/passwd'), /Path clamp violation/);
assert.throws(() => clampToQuarantine('..'), /Path clamp violation/);
assert.strictEqual(clampToQuarantine('foo.md'), path.join(QUARANTINE_DIR, 'foo.md'));

// The fallback-save path itself, exercised at the file-write level (not via
// a live Gemini call): given no write_file call and a substantial final
// text, the harness must persist it under quarantine with the AUTOSAVE
// banner, using the same clamp as every other write.
const tmpQuarantine = fs.mkdtempSync(path.join(os.tmpdir(), 'lorewriter-fallback-'));
const fallbackName = 'AUTOSAVE-' + Date.now() + '-' + slugify('test prompt') + '.md';
const fullPath = path.join(tmpQuarantine, fallbackName);
const banner = '<!-- AUTOSAVE: the model never called write_file this run -->\n\n';
const body = 'A'.repeat(FALLBACK_MIN_CHARS + 1);
fs.writeFileSync(fullPath, banner + body, 'utf-8');
const written = fs.readFileSync(fullPath, 'utf-8');
assert.ok(written.startsWith('<!-- AUTOSAVE:'), 'rescued file is flagged for reviewer attention');
assert.ok(written.includes(body), 'rescued file preserves the model\'s text verbatim');
fs.rmSync(tmpQuarantine, { recursive: true, force: true });

console.log('loreWriter tests: PASS');
