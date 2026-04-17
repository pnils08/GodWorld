/**
 * Central dotenv loader — Phase 40.3 credential isolation.
 *
 * All GodWorld scripts load env from /root/.config/godworld/.env
 * (outside the repo working directory). Override with GODWORLD_ENV_FILE
 * if needed for local dev or CI.
 *
 * Usage (scripts replace `require('dotenv').config()` with):
 *   require('/root/GodWorld/lib/env');
 */
const dotenv = require('dotenv');
const fs = require('fs');

const DEFAULT_PATH = '/root/.config/godworld/.env';
const envPath = process.env.GODWORLD_ENV_FILE || DEFAULT_PATH;

if (!fs.existsSync(envPath)) {
  console.warn(`[lib/env] WARN: env file not found at ${envPath} — continuing with process env only`);
} else {
  // override: true so the relocated .env wins over stale shell/PM2-cached env
  // (Phase 40.3 — existing shell had GOOGLE_APPLICATION_CREDENTIALS pointing at
  // the pre-relocation path, which would otherwise shadow the new canonical value).
  dotenv.config({ path: envPath, override: true });
}

module.exports = { envPath };
