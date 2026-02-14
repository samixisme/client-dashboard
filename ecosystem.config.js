module.exports = {
  apps: [
    {
      name: 'client-dashboard-api',
      script: './api/server.js',
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
      min_uptime: '10s',
      max_restarts: 10,
      autorestart: true,

      // Logging
      error_file: '/home/clientdash/client-dashboard/logs/api-error.log',
      out_file: '/home/clientdash/client-dashboard/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,

      // Monitoring
      instance_var: 'INSTANCE_ID',

      // Health check
      wait_ready: true,

      // Advanced features
      vizion: true,
      post_update: ['npm install'],

      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',

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

  // Deployment configuration
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
