# Deployment Runbook — throughputx.org

Production deployment of the IBKR dashboard. This documents the live setup so it
can be rebuilt from scratch. **No secrets are stored here** — only config and
procedure. Secrets live in `/opt/ibkrapp/.env.local` on the server.

## Host

| | |
|---|---|
| Provider | DigitalOcean droplet (~512MB RAM + 1GB swap — tight) |
| IP | `157.230.235.12` (hostname `portfolioDashboard`) |
| Domain | `throughputx.org` + `www` → that IP |
| OS | Ubuntu 24.04 (noble) |
| SSH | `ssh root@157.230.235.12` — **key-only** (`PasswordAuthentication no`, `PermitRootLogin prohibit-password`) |

## Stack on the box

- **Node 20.20.2** via fnm at `/root/.local/share/fnm/node-versions/v20.20.2/...`
  (`pm2` is **not** on the non-interactive PATH — invoke as `<that-node> <that-bin>/pm2`).
- **PM2** runs two apps (see `ecosystem.config.js`): `ibkrapp` and `ibkr-gateway`.
  `pm2 save` + `pm2-root.service` enabled → both resurrect on reboot.
- **nginx 1.24** reverse-proxies 80/443 → `127.0.0.1:3000`.
- **certbot** Let's Encrypt cert for apex + www, auto-renew via `certbot.timer`.
- **OpenJDK 17** for the IBKR Client Portal Gateway (Java).
- **ufw** firewall + **fail2ban** (sshd jail).

## App

- Code at `/opt/ibkrapp`, deployed by `git pull` (branch `main`).
- Build on the box is **OOM-prone** (512MB). `next.config.ts` already skips TS/ESLint
  during build; if `next build` still gets killed, build elsewhere and ship `.next`,
  or add more swap.
- Bound to `127.0.0.1:3000` (`-H 127.0.0.1`) so only nginx can reach it.

## Auth model

- `src/middleware.ts` gates every route: redirects to `/login` unless the `session`
  cookie equals `SESSION_SECRET`. `/api/auth/login` checks `APP_PASSWORD`.
- **Both `APP_PASSWORD` and `SESSION_SECRET` MUST be set** in `.env.local`. If either is
  missing, the check becomes `undefined !== undefined` (false) and the gate is silently
  bypassed — the whole dashboard goes public. Verify after any env change.
- Login endpoint is rate-limited at nginx (10 req/min, burst 5) — see `nginx/ratelimit.conf`.

## IBKR Client Portal Gateway

- Lives at `/opt/ibkrapp/ibkr-client`, serves `https://localhost:5010/v1/api`
  (`IBKR_GATEWAY_URL`). Needs Java (OpenJDK 17 installed).
- **Launch only via the shipped `bin/run.sh root/conf.yaml`** from the gateway root.
  Its `--conf ../$config_file` convention is what `GatewayStart` expects; hand-rolling
  `java ... --conf root/conf.yaml` fails with `java.io.IOException: Stream closed`.
  (Managed by PM2 as `ibkr-gateway` with `_JAVA_OPTIONS=-Xmx128m`.)
- **Login is manual** and can't be automated (IBKR creds + 2FA). Start the process, then:
  ```bash
  ssh -L 5010:localhost:5010 root@157.230.235.12
  # then open https://localhost:5010 locally and log in
  ```
  Sessions expire → repeat periodically. Until logged in, the dashboard uses Flex/mock data.

## Firewall (ufw)

Default-deny inbound; only **22, 80, 443** allowed. 3000 and 5010 are NOT reachable from
the internet (loopback still works for nginx→app and the SSH tunnel→gateway).
**Never remove the port-22 rule** or you lose SSH.

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH — allow BEFORE enabling
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Required env vars (`/opt/ibkrapp/.env.local`, values not committed)

```
APP_PASSWORD=                       # dashboard login password
SESSION_SECRET=                     # random; e.g. `openssl rand -hex 32`
IBKR_GATEWAY_URL=https://localhost:5010/v1/api
NEXT_PUBLIC_GATEWAY_LOGIN_URL=https://localhost:5010/sso/Login?forwardTo=22&RL=1&ip2loc=on
IBKR_ACCOUNT_ID=
IBKR_FLEX_TOKEN=
IBKR_FLEX_ACTIVITY_QUERY_ID=
IBKR_FLEX_TRADES_QUERY_ID=
TOTAL_DEPOSITED=
FINNHUB_API_KEY=
```

## Config files in this directory → server paths

| Repo | Server |
|---|---|
| `ecosystem.config.js` | `/opt/ibkrapp/ecosystem.config.js` (or run from repo) |
| `nginx/throughputx.org.conf` | `/etc/nginx/sites-available/ibkrapp` (symlink into `sites-enabled/`) |
| `nginx/ratelimit.conf` | `/etc/nginx/conf.d/ratelimit.conf` |
| `fail2ban/jail.local` | `/etc/fail2ban/jail.local` |

## Common operations

```bash
# deploy new code
cd /opt/ibkrapp && git pull && <node> <pm2> restart ibkrapp

# restart gateway (then re-login via the SSH tunnel)
<node> <pm2> restart ibkr-gateway

# reload nginx after config change
nginx -t && systemctl reload nginx

# check everything
<node> <pm2> list; systemctl status nginx fail2ban; ufw status
```
