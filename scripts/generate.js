#!/usr/bin/env node
/**
 * CLI runner for media-generator skill
 *
 * Usage:
 *   node scripts/generate.js
 *
 * Requires .env file with ANTHROPIC_API_KEY
 */

require('dotenv').config();
const path = require('path');
const { execute } = require('../openclaw-skills/media-generator/index.js');

const ROOT = path.join(__dirname, '..');

// Check for API key
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not set');
  console.error('Create a .env file with your API key:');
  console.error('  cp .env.example .env');
  console.error('  # Then edit .env and add your key');
  process.exit(1);
}

// Simple logger
const log = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

// Config
const config = {
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY
  },
  godworld: {
    exportsPath: path.join(ROOT, 'exports'),
    dbPath: path.join(ROOT, 'godworld/godworld.db'),
    mediaOutputPath: path.join(ROOT, 'media')
  }
};

// Run
async function main() {
  console.log('media-generator CLI');
  console.log('====================');
  console.log('Database:', config.godworld.dbPath);
  console.log('Exports:', config.godworld.exportsPath);
  console.log('Output:', config.godworld.mediaOutputPath);
  console.log('');

  const result = await execute({ config, log });

  console.log('');
  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.error) {
    process.exit(1);
  }

  if (result.publishable) {
    console.log('\n✓ Content is publishable (continuity >= 0.9, risk <= 0.4)');
  } else {
    console.log('\n⚠ Content needs review before publishing');
  }

  console.log(`\nOutput saved to: ${result.outputDir}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
