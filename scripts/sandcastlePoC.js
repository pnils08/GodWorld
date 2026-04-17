#!/usr/bin/env node
/**
 * sandcastlePoC.js — Phase 33.13 proof-of-concept
 *
 * Minimum-viable Daytona sandbox round-trip. Creates one sandbox, runs a
 * trivial command, reads the output, destroys the sandbox. Success = Daytona
 * free-tier Tier 1 supports the Sandcastle evaluation path.
 *
 * Usage:
 *   node scripts/sandcastlePoC.js
 *
 * Requires: DAYTONA_API_KEY in .env (loaded via `-r dotenv/config` or env).
 * Does NOT wrap a reporter agent — that comes after the round-trip works.
 */

require('/root/GodWorld/lib/env');

const { Daytona } = require('@daytona/sdk');

async function main() {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    console.error('DAYTONA_API_KEY not set. Aborting.');
    process.exit(1);
  }

  console.log('Initializing Daytona client...');
  const daytona = new Daytona({ apiKey });

  console.log('Creating sandbox...');
  const sandbox = await daytona.create();
  console.log(`  sandbox id: ${sandbox.id}`);

  try {
    console.log('Running echo...');
    const response = await sandbox.process.executeCommand('echo "hello from daytona"');
    console.log(`  exit code: ${response.exitCode}`);
    console.log(`  output: ${response.result}`);

    console.log('Running uname...');
    const unameResp = await sandbox.process.executeCommand('uname -a');
    console.log(`  uname: ${unameResp.result}`);

  } finally {
    console.log('Cleaning up sandbox...');
    await daytona.delete(sandbox);
    console.log('  done.');
  }

  console.log('\nPoC complete — Daytona free tier supports the round-trip.');
}

main().catch(err => {
  console.error('\nPoC FAILED:', err.message || err);
  if (err.code) console.error('  code:', err.code);
  if (err.response?.status) console.error('  http status:', err.response.status);
  process.exit(1);
});
