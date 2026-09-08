/**
 * mint-pilot.ts — UNDOCKED pilot account minter (plan (a′) piece 1,
 * docs/plans/2026-08-07-spacemolt-game-show.md; builder go 2026-09-08 S438).
 *
 * Bun entry point. The Node wrapper scripts/undockedMintAccount.js owns args,
 * idempotency, and the session path; this file owns the server conversation.
 *
 * Flow: Clerk API key -> ClerkSource.fetchRegistration() (fresh per attempt —
 * the registration code is one-time) -> Account.register() -> write
 * <session-dir>/credentials.json in the exact shape commander's
 * SessionManager.loadCredentials reads: {username, password, empire, playerId}.
 *
 * Hard rules:
 *  - NEVER print the password (stdout carries status + a final JSON result
 *    line only; the password goes straight into credentials.json).
 *  - NEVER overwrite an existing credentials.json.
 *  - A username already owned by this Clerk user but missing local credentials
 *    is unrecoverable (passwords cannot be retrieved) — skip to the next
 *    candidate and say so.
 *
 * Usage: bun run mint-pilot.ts --session-dir <abs> --empire solarian \
 *          --candidates "FirstLast,FirstLast143"
 * Env: SPACEMOLT_CLERK_API_KEY (injected by the wrapper from the godworld env
 * file — never read or printed here beyond presence).
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Account, ClerkSource } from './spacemolt-lib/src/index.ts';

const HTTP_BASE = 'https://game.spacemolt.com';
const WS_URL = 'wss://game.spacemolt.com/ws/v2';

function parseArgs(argv: string[]) {
  const a: { sessionDir?: string; empire: string; candidates: string[] } = { empire: 'solarian', candidates: [] };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--session-dir') { a.sessionDir = v; i++; }
    else if (k === '--empire') { a.empire = v; i++; }
    else if (k === '--candidates') { a.candidates = v.split(',').map(s => s.trim()).filter(Boolean); i++; }
    else { console.error('[mint-pilot] unknown arg: ' + k); process.exit(2); }
  }
  return a;
}

function result(obj: Record<string, unknown>, code: number): never {
  console.log(JSON.stringify(obj));
  process.exit(code);
}

async function main() {
  const a = parseArgs(process.argv);
  if (!a.sessionDir) { console.error('[mint-pilot] --session-dir required'); process.exit(2); }
  if (!a.candidates.length) { console.error('[mint-pilot] --candidates required'); process.exit(2); }

  const credsPath = join(a.sessionDir, 'credentials.json');
  if (existsSync(credsPath)) {
    result({ ok: true, skipped: 'credentials-exist' }, 0);
  }

  const apiKey = process.env.SPACEMOLT_CLERK_API_KEY;
  if (!apiKey) result({ ok: false, error: 'SPACEMOLT_CLERK_API_KEY not in environment' }, 1);

  const clerk = new ClerkSource({ httpBaseUrl: HTTP_BASE, apiKey });

  for (const username of a.candidates) {
    let registration;
    try {
      registration = await clerk.fetchRegistration();
    } catch (e) {
      result({ ok: false, error: 'registration-code fetch failed: ' + (e as Error).message }, 1);
    }
    const owned = registration.players.find(p => p.username.toLowerCase() === username.toLowerCase());
    if (owned) {
      console.error('[mint-pilot] ' + username + ' is already owned by this Clerk user but has no local credentials — password unrecoverable, skipping candidate');
      continue;
    }
    if (!registration.registrationCode) {
      result({ ok: false, error: 'server returned no registration code' }, 1);
    }

    const account = new Account({ url: WS_URL });
    try {
      await account.connect();
      const reg = await account.register({ username, empire: a.empire, registration_code: registration.registrationCode });
      mkdirSync(a.sessionDir, { recursive: true });
      writeFileSync(credsPath, JSON.stringify({
        username,
        password: reg.password,
        empire: a.empire,
        playerId: reg.player_id,
      }, null, 2) + '\n');
      result({ ok: true, username, playerId: reg.player_id, empire: a.empire }, 0);
    } catch (e) {
      console.error('[mint-pilot] register failed for ' + username + ': ' + (e as Error).message);
    } finally {
      try { account.close(); } catch { /* closing a failed connect is fine */ }
    }
  }

  result({ ok: false, error: 'all username candidates exhausted (' + a.candidates.join(', ') + ')' }, 1);
}

main().catch(e => {
  console.error('[mint-pilot] FATAL: ' + ((e && (e as Error).message) || e));
  process.exit(1);
});
