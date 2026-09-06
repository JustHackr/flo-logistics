# VPS deploy (radr.nxtdev.xyz)

Target URLs:
- Team site: `https://radr.nxtdev.xyz/flo-logistics/`
- FLO demo: `https://radr.nxtdev.xyz/flo-logistics/demo`

This VPS already runs **osnai** on port 3000 with nginx + Let's Encrypt.
FLO deploys **without Docker** (Node + systemd) to avoid RAM pressure and port conflicts.

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

## Notes

- nginx snippet: `/etc/nginx/snippets/flo-logistics.conf` (included from `osnai` site before the catch-all `/simosnai` redirect)
- `Permissions-Policy` camera set to `(self)` so warehouse CV demos work
- Redeploy re-seeds SQLite in the build dir (`/opt/flo-logistics-src/dev.db`)
