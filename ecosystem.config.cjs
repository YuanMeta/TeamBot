module.exports = {
  apps: [
    {
      name: 'team-bot',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      // out_file: './logs/out.log',
      // log_file: './logs/combined.log',

      // 自动重启配置
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      max_memory_restart: '1G',
      restart_delay: 1000,
      kill_timeout: 5000
    }
  ]
}
