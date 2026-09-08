#!/usr/bin/env node
'use strict';

/**
 * undockedMintAccount.js — UNDOCKED pilot account minting, orchestrator-side
 * (plan (a′) piece 1, docs/plans/2026-08-07-spacemolt-game-show.md; builder go
 * 2026-09-08 S438).
 *
 * Thin Node wrapper around output/kimi/spacemolt-phase0/mint-pilot.ts (bun +
 * @spacemolt/lib). Owns: session-name convention, username candidate
 * derivation, idempotency (existing credentials.json => exit 0), the Clerk key
 * load, and result verification. The runner never self-registers — this is
 * the only path that creates pilot accounts, and it runs from the
 * orchestrator, never from inside an episode.
 *
 * Usage:
 *   node scripts/undockedMintAccount.js --popid POP-01076 --name "First Last" [--empire solarian] [--dry-run]
 *
 * Exit 0 = credentials exist (minted now or already present). Exit 1 = mint
 * failed (caller falls to the next alternate). Never prints credentials.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BUN = '/root/.bun/bin/bun';
const COMMANDER = path.join(ROOT, 'output', 'kimi', 'spacemolt-phase0', 'commander');
const MINT_TS = path.join(ROOT, 'output', 'kimi', 'spacemolt-phase0', 'mint-pilot.ts');

function sessionNameFor(popid) {
  return 'undocked-' + String(popid).toLowerCase().replace(/-/g, '');
}

function sessionDirFor(popid) {
  return path.join(COMMANDER, 'sessions', sessionNameFor(popid));
}

function credentialsExist(popid) {
  return fs.existsSync(path.join(sessionDirFor(popid), 'credentials.json'));
}

// "Clarissa Dane" -> "ClarissaDane"; fallback candidate appends the POPID
// digits ("ClarissaDane143") for the username-taken case.
function usernameCandidates(name, popid) {
  const base = String(name || '').split(/\s+/).map(w => w.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('');
  if (!base) throw new Error('no usable username derivable from name: ' + name);
  const n = Number(String(popid || '').replace(/\D/g, '')) || 0;
  return n > 0 ? [base, base + n] : [base];
}

// S438b: the shared env file carried the key as <ak_…> — literal angle brackets
// from a placeholder paste. `Bearer <…>` is a 401 at the server (kimi read it as
// an expired key). Strip quotes AND brackets so that shape still authenticates.
function cleanClerkKey(v) {
  return String(v == null ? '' : v).trim().replace(/^["']|["']$/g, '').replace(/^<|>$/g, '').trim();
}

function loadClerkKey() {
  for (const envPath of ['/root/.config/godworld/.env', path.join(ROOT, '.env')]) {
    try {
      for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        if (line.startsWith('SPACEMOLT_CLERK_API_KEY=')) {
          return cleanClerkKey(line.split('=').slice(1).join('='));
        }
      }
    } catch (_) { /* try next */ }
  }
  return null;
}

function parseArgs(argv) {
  const a = { popid: null, name: null, empire: 'solarian', dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--popid') { a.popid = v; i++; }
    else if (k === '--name') { a.name = v; i++; }
    else if (k === '--empire') { a.empire = v; i++; }
    else if (k === '--dry-run') { a.dryRun = true; }
    else { console.error('unknown arg: ' + k); process.exit(2); }
  }
  return a;
}

function main() {
  const a = parseArgs(process.argv);
  if (!a.popid || !/^POP-\d+$/.test(a.popid)) { console.error('--popid POP-XXXXX required'); process.exit(2); }
  if (!a.name) { console.error('--name required'); process.exit(2); }

  const session = sessionNameFor(a.popid);
  if (credentialsExist(a.popid)) {
    console.log('[mint] ' + session + ' already has credentials — nothing to do');
    return;
  }
  const candidates = usernameCandidates(a.name, a.popid);

  if (a.dryRun) {
    console.log('[mint] dry-run — would mint session ' + session + ' as username ' +
      candidates.join(' / ') + ' (empire ' + a.empire + ')');
    return;
  }

  const key = loadClerkKey();
  if (!key) { console.error('[mint] SPACEMOLT_CLERK_API_KEY not found in env files'); process.exit(1); }

  let out;
  try {
    out = execFileSync(BUN, ['run', MINT_TS,
      '--session-dir', sessionDirFor(a.popid),
      '--empire', a.empire,
      '--candidates', candidates.join(',')],
      { cwd: path.dirname(MINT_TS), env: { ...process.env, SPACEMOLT_CLERK_API_KEY: key }, encoding: 'utf8' });
  } catch (e) {
    console.error('[mint] FAILED for ' + session + ': ' + ((e.stderr || e.message || e) + '').trim().split('\n').pop());
    process.exit(1);
  }

  let res = null;
  for (const line of out.trim().split('\n')) {
    try { res = JSON.parse(line); } catch (_) { /* status lines */ }
  }
  if (!res || !res.ok) {
    console.error('[mint] FAILED for ' + session + ': ' + ((res && res.error) || 'no result from mint-pilot.ts'));
    process.exit(1);
  }
  if (res.skipped) { console.log('[mint] ' + session + ' — ' + res.skipped); return; }

  // Verify-after-write: the file parses and carries the runner's required keys.
  const written = JSON.parse(fs.readFileSync(path.join(sessionDirFor(a.popid), 'credentials.json'), 'utf8'));
  if (!written.username || !written.password || !written.playerId) {
    console.error('[mint] FAILED for ' + session + ': credentials.json incomplete after mint');
    process.exit(1);
  }
  console.log('[mint] minted ' + session + ' — username ' + written.username +
    ', playerId ' + written.playerId + ', empire ' + written.empire);
}

module.exports = { sessionNameFor, sessionDirFor, credentialsExist, usernameCandidates, loadClerkKey, cleanClerkKey };

if (require.main === module) {
  try { main(); } catch (e) { console.error('[mint] FATAL: ' + (e && e.message || e)); process.exit(1); }
}
