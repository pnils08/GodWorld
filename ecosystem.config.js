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
    cron_restart: '0 14,2 * * *',  // twice daily: 9am + 9pm CDT
    max_memory_restart: '100M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/moltbook-error.log',
    out_file: 'logs/moltbook-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }, {
    name: 'spacemolt-miner',
    script: 'scripts/spacemolt-miner.js',
    cwd: '/root/GodWorld',
    watch: false,
    autorestart: false,      // cron-style: run and exit
    cron_restart: '0 8,16,0 * * *',  // 3x daily: 3am, 11am, 7pm CDT
    max_memory_restart: '100M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/spacemolt-error.log',
    out_file: 'logs/spacemolt-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
