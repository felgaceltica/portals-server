const os = require('os');

module.exports = {
    apps : [{
      name: "colyseus-app",
      script: 'build/index.js',
      time: true,
      watch: false,
      instances: os.cpus().length,
      exec_mode: 'fork',
      wait_ready: true,
      env_production: {
        NODE_ENV: 'production'
      }
    }],
    deploy : {
      production : {
        "user" : "deploy",
        "host" : ["216.238.112.132"],
        "ref"  : "origin/main",
        "repo" : "git@github.com:felgaceltica/portals-server.git",
        "path" : "/home/deploy",
        "post-deploy" : "npm install && npm run build && npm exec colyseus-post-deploy"
      }
    }
  };