/**
 * PM2 Ecosystem Config — Mags' Always-On Services
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 startup && pm2 save   # auto-start on boot
 */
module.exports = {
  apps: [{
    name: 'mags-discord-bot',
    script: 'scripts/mags-discord-bot.js',
    cwd: '/root/GodWorld',
    watch: false,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    max_memory_restart: '150M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/mags-discord-error.log',
    out_file: 'logs/mags-discord-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }, {
    name: 'mags-moltbook-heartbeat',
    script: 'scripts/moltbook-heartbeat.js',
    cwd: '/root/GodWorld',
    watch: false,
    autorestart: false,      // cron-style: run and exit
    cron_restart: '*/30 * * * *',  // every 30 minutes
    max_memory_restart: '100M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/moltbook-error.log',
    out_file: 'logs/moltbook-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
