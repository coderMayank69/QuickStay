// ecosystem.config.cjs — PM2 process manager config for AWS EC2
// Run with: pm2 start ecosystem.config.cjs --env production
// Save:      pm2 save
// Startup:   pm2 startup  (run the output command it gives)

module.exports = {
  apps: [
    {
      name: 'yoyo-server',
      script: 'server.js',

      // Use fork mode (not cluster) since Socket.io needs sticky sessions for cluster
      instances: 1,
      exec_mode: 'fork',

      // Node.js interpreter — must support ESM (Node 18+)
      interpreter: 'node',
      interpreter_args: '--experimental-vm-modules',

      // Environment
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },

      // Restart policy
      watch: false,                    // don't watch files in production
      max_memory_restart: '400M',      // restart if memory exceeds 400MB (t2.micro has 1GB)
      restart_delay: 4000,             // wait 4s before restarting after crash
      max_restarts: 10,                // stop restarting after 10 consecutive crashes
      min_uptime: '10s',               // must stay up 10s to count as a successful start

      // Logging
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,

      // Graceful shutdown — wait up to 10s for in-flight requests to finish
      kill_timeout: 10000,
      listen_timeout: 8000,

      // Source maps for better error stack traces
      source_map_support: true,
    },
  ],
};
