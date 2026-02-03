#!/usr/bin/env node
/**
 * CLI runner for godworld-sync skill
 *
 * Usage:
 *   node scripts/sync.js
 *   node scripts/sync.js --force
 */

const path = require('path');
const { execute } = require('../openclaw-skills/godworld-sync/index.js');

const ROOT = path.join(__dirname, '..');

// Simple logger that mimics OpenClaw context
const log = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

// Config
const config = {
  godworld: {
    exportsPath: path.join(ROOT, 'exports'),
    dbPath: path.join(ROOT, 'godworld/godworld.db')
  }
};

// Run
async function main() {
  console.log('godworld-sync CLI');
  console.log('==================');
  console.log('Exports:', config.godworld.exportsPath);
  console.log('Database:', config.godworld.dbPath);
  console.log('');

  const result = await execute({ config, log });

  console.log('');
  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.error) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
