/**
 * PM2 Ecosystem Config — Mags' Discord Bot
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
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/mags-discord-error.log',
    out_file: 'logs/mags-discord-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
