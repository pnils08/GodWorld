/**
 * PM2 Ecosystem Config — Mags' Always-On Services
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 startup && pm2 save   # auto-start on boot
 *
 * App names match the historical PM2 registry so `pm2 delete all &&
 * pm2 start ecosystem.config.js && pm2 save` is a clean replacement,
 * not a rename. Previously only mags-bot / godworld-dashboard / moltbook
 * lived in the live PM2 dump; S156 Phase 40.3 aligned this file.
 *
 * env_file points every app at the relocated /root/.config/godworld/.env
 * (Phase 40.3 credential isolation). Scripts also call lib/env.js which
 * uses override:true so stale shell env never wins.
 */
const GODWORLD_ENV_FILE = '/root/.config/godworld/.env';

module.exports = {
  apps: [{
    name: 'mags-bot',
    script: 'scripts/mags-discord-bot.js',
    cwd: '/root/GodWorld',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      GODWORLD_ENV_FILE: GODWORLD_ENV_FILE
    },
    env_file: GODWORLD_ENV_FILE,
    error_file: 'logs/mags-discord-error.log',
    out_file: 'logs/mags-discord-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }, {
    name: 'godworld-dashboard',
    script: 'dashboard/server.js',
    cwd: '/root/GodWorld',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      GODWORLD_ENV_FILE: GODWORLD_ENV_FILE
    },
    env_file: GODWORLD_ENV_FILE,
    error_file: 'logs/dashboard-error.log',
    out_file: 'logs/dashboard-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }, {
    // moltbook-heartbeat moved to system crontab (S360, 2026-08-07): pm2
    // cron_restart re-fires every 30s tick during the matching window on a
    // one-shot script — mid-run SIGINT before state save caused duplicate
    // upvotes/replies daily since ~Jul 28. One-shot dailies belong in crontab.
    //
    // spacemolt-miner dormant declaration REMOVED (S360, 2026-08-07): process
    // was de-registered live 2026-07-27 (OPERATIONS.md); the block here would
    // have resurrected it on a full ecosystem reload. Successor: research.27
    // (docs/plans/2026-08-07-spacemolt-game-show.md). Script + logs remain.
    // engine.27 Phase A (S242) — wd-* card auto-invalidation daemon.
    // Row-hash polls Simulation_Ledger / Business_Ledger / Cultural_Ledger /
    // Faith_Organizations; dispatches targeted scripts/build*Cards.js rebuilds
    // when an operator backfill or Sheets UI edit changes a row.
    // NOT auto-started — live enable is the gated step (continuous wd-* writes).
    name: 'wd-cards-daemon',
    script: 'scripts/wdCardsDaemon.js',
    cwd: '/root/GodWorld',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
      GODWORLD_ENV_FILE: GODWORLD_ENV_FILE,
      WD_CARDS_POLL_SECONDS: '300'
    },
    env_file: GODWORLD_ENV_FILE,
    error_file: 'logs/wd-cards-daemon-error.log',
    out_file: 'logs/wd-cards-daemon-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
