# VPS deploy (radr.nxtdev.xyz)

Target URLs:
- Team site: `https://radr.nxtdev.xyz/flo-logistics/`
- FLO demo: `https://radr.nxtdev.xyz/flo-logistics/demo`
- Sovereign AI: `https://radr.nxtdev.xyz/flo-logistics/demo/sovereign-ai`
- CV tour: `https://radr.nxtdev.xyz/flo-logistics/demo/computer-vision/tour`

This VPS already runs **osnai** on port 3000 with nginx + Let's Encrypt.
FLO deploys **without Docker** (Node + systemd + PostgreSQL) to avoid RAM pressure and port conflicts.

Create `/etc/flo-logistics/demo.env` on the VPS (mode 600, owned by ubuntu) with:

```
DATABASE_URL=postgresql://flo:SECRET@127.0.0.1:5432/flo
FLO_SESSION_SECRET=long-random-string
FLO_BOOTSTRAP_PASSWORD=at-least-10-chars-not-demo1234
```

SSH uses `~/Downloads/lighthouse.pem` when present (`FLO_SSH_KEY` override).

| Service | Port | systemd unit | Working dir |
|---------|------|--------------|-------------|
| Team site | 3010 | `flo-team-site` | `/opt/flo-logistics-src/team-site` |
| FLO demo | 3011 | `flo-demo` | `/opt/flo-logistics-src` |

## Deploy

```bash
chmod +x deploy/deploy-vps.sh
./deploy/deploy-vps.sh ubuntu@43.134.182.44
```

Demo only (skip team-site rebuild):

```bash
./deploy/deploy-vps.sh --demo-only ubuntu@43.134.182.44
```

Hot-fix without reseeding SQLite (keeps judge-created routes):

```bash
./deploy/deploy-vps.sh --demo-only --skip-seed ubuntu@43.134.182.44
```

## Notes

- nginx snippet: `/etc/nginx/snippets/flo-logistics.conf` (included from `osnai` site before the catch-all `/simosnai` redirect)
- `Permissions-Policy` camera set to `(self)` so warehouse CV demos work
- Redeploy runs `prisma migrate deploy`. Seed runs unless `--skip-seed` is set; seed also no-ops if a route plan was updated in the last hour. The only seeded login is `admin@flo.demo`.
- Health: `GET /flo-logistics/demo/api/health`
- Sovereign AI is the default assistant mode (no `AI_API_KEY` on the VPS unit)
