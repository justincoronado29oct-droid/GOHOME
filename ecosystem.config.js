module.exports = {
  apps: [{
    name: 'gohome-server',
    script: 'server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production'
    },
    autorestart: true,
    watch: false
  }]
};
