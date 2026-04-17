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
    name: 'moltbook',
    script: 'scripts/moltbook-heartbeat.js',
    cwd: '/root/GodWorld',
    watch: false,
    autorestart: false,
    cron_restart: '0 14,2 * * *',
    max_memory_restart: '100M',
    env: {
      NODE_ENV: 'production',
      GODWORLD_ENV_FILE: GODWORLD_ENV_FILE
    },
    env_file: GODWORLD_ENV_FILE,
    error_file: 'logs/moltbook-error.log',
    out_file: 'logs/moltbook-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }, {
    name: 'spacemolt-miner',
    script: 'scripts/spacemolt-miner.js',
    cwd: '/root/GodWorld',
    watch: false,
    autorestart: false,
    cron_restart: '0 8,16,0 * * *',
    max_memory_restart: '100M',
    env: {
      NODE_ENV: 'production',
      GODWORLD_ENV_FILE: GODWORLD_ENV_FILE
    },
    env_file: GODWORLD_ENV_FILE,
    error_file: 'logs/spacemolt-error.log',
    out_file: 'logs/spacemolt-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
