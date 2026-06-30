// PM2 process definitions for the production server (/opt/ibkrapp).
// Apply with:  pm2 start deploy/ecosystem.config.js && pm2 save
//
// Note: paths are absolute to the server's fnm-managed Node 20 install.
// Secrets (APP_PASSWORD, SESSION_SECRET, IBKR_* tokens) live in
// /opt/ibkrapp/.env.local and are read by `next start` at runtime — never commit them.
module.exports = {
  apps: [
    {
      name: 'ibkrapp',
      cwd: '/opt/ibkrapp',
      script: '/root/.local/share/fnm/node-versions/v20.20.2/installation/bin/node',
      // -H 127.0.0.1 keeps the app off the public interface (only nginx reaches it)
      args: '/opt/ibkrapp/node_modules/.bin/next start -p 3000 -H 127.0.0.1',
      env: {
        NODE_ENV: 'production',
        PATH: '/root/.local/share/fnm/node-versions/v20.20.2/installation/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      },
    },
    {
      // IBKR Client Portal Gateway (Java). MUST launch via the shipped run.sh —
      // its `--conf ../$config_file` convention is what GatewayStart expects.
      name: 'ibkr-gateway',
      cwd: '/opt/ibkrapp/ibkr-client',
      script: 'bin/run.sh',
      interpreter: 'bash',
      args: 'root/conf.yaml',
      env: {
        _JAVA_OPTIONS: '-Xmx128m', // cap heap so it can't starve the web app on a 512MB box
      },
    },
  ],
};
