module.exports = {
  apps: [
    {
      name: 'client-dashboard-api',
      script: './dist-server/api/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        ALLOWED_ORIGINS: 'https://client.samixism.com,http://client.samixism.com',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        ALLOWED_ORIGINS: 'https://client.samixism.com,http://client.samixism.com',
      },

      // Auto-restart configuration
      max_memory_restart: '500M',
      // BUG FIX: was '10s' — if startup takes >10s (Firebase Admin init, etc.) PM2
      // counts it as a failed start. 30s gives the server room to breathe.
      min_uptime: '30s',
      max_restarts: 10,
      autorestart: true,

      // Logging
      error_file: '/home/clientdash/client-dashboard/logs/api-error.log',
      out_file: '/home/clientdash/client-dashboard/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      // BUG FIX: was 3000ms — if Firebase Admin SDK takes >3s to init, PM2 kills
      // the instance as "not ready". 10s is safer for cloud SDK initialisation.
      listen_timeout: 10000,
      shutdown_with_message: true,

      // BUG FIX: removed cron_restart — a nightly hard restart at 3 AM was
      // killing in-flight requests AND re-triggering the ALLOWED_ORIGINS crash
      // loop whenever the env wasn't persisted correctly in PM2's dump.

      // Monitoring
      instance_var: 'INSTANCE_ID',

      // BUG FIX: wait_ready: true means PM2 waits for process.send('ready').
      // We now send that signal INSIDE app.listen() callback (after port is
      // bound), so this is safe. Previously it was sent before listen() and
      // caused cluster reload race conditions.
      wait_ready: true,

      // Advanced features
      vizion: false, // disabled — we manage deploys via GitHub Actions, not pm2 deploy
      post_update: [],

      // Source map support
      source_map_support: true,

      // Watch and ignore patterns (disabled in production)
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],

      // Environment-specific settings
      node_args: '--max-old-space-size=512',
    },
    {
      name: 'client-dashboard-nginx',
      script: 'serve',
      env: {
        PM2_SERVE_PATH: './dist',
        PM2_SERVE_PORT: 3000,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html',
      },
      instances: 1,
      exec_mode: 'fork',

      // Logging
      error_file: '/home/clientdash/client-dashboard/logs/frontend-error.log',
      out_file: '/home/clientdash/client-dashboard/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Auto-restart configuration
      max_memory_restart: '300M',
      autorestart: true,

      // Graceful shutdown
      kill_timeout: 3000,
    },
  ],

  // Deployment configuration (reference only — actual deploys use GitHub Actions)
  deploy: {
    production: {
      user: 'clientdash',
      host: '49.13.129.43',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/client-dashboard.git',
      path: '/home/clientdash/client-dashboard',
      'post-deploy': 'npm ci --production && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': 'mkdir -p /home/clientdash/client-dashboard/{releases,shared,backups,logs}',
    },
  },
};
