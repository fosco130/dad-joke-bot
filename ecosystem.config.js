module.exports = {
  apps: [
    {
      name: 'dad-joke-bot',
      script: './index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '100M',
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
