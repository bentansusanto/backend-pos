module.exports = {
  apps: [
    {
      name: 'pos-api',
      script: './dist/main.js',

      // Cluster mode for load balancing
      instances: 1, // 2 instances (adjust based on CPU cores)
      exec_mode: 'cluster',

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 8083,
      },

      // Memory management (CRITICAL for shared VPS!)
      max_memory_restart: '400M', // Auto-restart if memory exceeds 400MB
      node_args: '--max-old-space-size=384', // V8 heap limit

      // Auto-restart configuration
      autorestart: true,
      watch: false, // Don't watch files in production
      max_restarts: 10, // Max restart attempts
      min_uptime: '10s', // Min uptime before considered stable
      restart_delay: 4000, // Delay between restarts

      // Logging
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Advanced settings
      kill_timeout: 5000, // Time to wait before force kill
      listen_timeout: 3000, // Time to wait for app to listen
      shutdown_with_message: true,

      // Environment file
      env_file: '.env',

      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',

      // Source map support
      source_map_support: true,

      // Instance variables
      instance_var: 'INSTANCE_ID',
    },
  ],
};
