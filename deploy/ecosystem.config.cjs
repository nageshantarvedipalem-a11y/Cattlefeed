/**
 * PM2 process manager config for Cattle Feed ERP backend
 * Usage (from project root on server):
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 */
module.exports = {
  apps: [
    {
      name: 'cattlefeed-api',
      cwd: '/var/www/cattlefeed/backend',
      script: 'src/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/www/cattlefeed/backend/logs/pm2-error.log',
      out_file: '/var/www/cattlefeed/backend/logs/pm2-out.log',
      time: true,
    },
  ],
};
