#!/usr/bin/env bash
# Deploy FLO team site + demo to Tencent VPS (Node + systemd; no Docker).
# Usage:
#   ./deploy/deploy-vps.sh [user@host]
#   ./deploy/deploy-vps.sh --demo-only [user@host]
#   ./deploy/deploy-vps.sh --skip-seed [user@host]
#   ./deploy/deploy-vps.sh --demo-only --skip-seed [user@host]
set -euo pipefail

DEMO_ONLY=0
SKIP_SEED=0
HOST="ubuntu@43.134.182.44"
for arg in "$@"; do
  case "$arg" in
    --demo-only) DEMO_ONLY=1 ;;
    --skip-seed) SKIP_SEED=1 ;;
    -*)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
    *) HOST="$arg" ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_SRC="/opt/flo-logistics-src"

echo "==> Syncing source to ${HOST}:${REMOTE_SRC}"
ssh "$HOST" "sudo mkdir -p ${REMOTE_SRC} && sudo chown -R ubuntu:ubuntu ${REMOTE_SRC}"

rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude '**/*.db' \
  --exclude '**/*.db-journal' \
  --exclude .git \
  --exclude team-site/node_modules \
  --exclude team-site/.next \
  "$ROOT/" "${HOST}:${REMOTE_SRC}/"

echo "==> Installing nginx snippet + systemd units"
scp "$ROOT/deploy/nginx-flo-logistics.conf" "$HOST:/tmp/flo-logistics.conf"
scp "$ROOT/deploy/systemd/flo-team-site.service" "$HOST:/tmp/flo-team-site.service"
scp "$ROOT/deploy/systemd/flo-demo.service" "$HOST:/tmp/flo-demo.service"

ssh "$HOST" bash -s <<'REMOTE'
set -euo pipefail
sudo mkdir -p /etc/nginx/snippets
sudo mv /tmp/flo-logistics.conf /etc/nginx/snippets/flo-logistics.conf
sudo mv /tmp/flo-team-site.service /etc/systemd/system/flo-team-site.service
sudo mv /tmp/flo-demo.service /etc/systemd/system/flo-demo.service

if ! grep -q 'snippets/flo-logistics.conf' /etc/nginx/sites-available/osnai; then
  sudo python3 - <<'PY'
from pathlib import Path
path = Path("/etc/nginx/sites-available/osnai")
text = path.read_text()
needle = "    # Legacy root paths — redirect old bookmarks to /simosnai."
include = "    include /etc/nginx/snippets/flo-logistics.conf;\n\n"
if "snippets/flo-logistics.conf" not in text:
    if needle not in text:
        raise SystemExit("Could not find insertion point in nginx osnai config")
    path.write_text(text.replace(needle, include + needle, 1))
    print("Inserted flo-logistics include into osnai nginx config")
PY
fi

sudo sed -i 's/camera=()/camera=(self)/g' /etc/nginx/sites-available/osnai
sudo nginx -t
sudo systemctl reload nginx
REMOTE

if [[ "$DEMO_ONLY" -eq 0 ]]; then
  echo "==> Building team site on VPS"
  ssh "$HOST" bash -s <<'REMOTE'
set -euo pipefail
export NODE_OPTIONS=--max-old-space-size=1536
cd /opt/flo-logistics-src/team-site
npm ci
npm run build
sudo systemctl daemon-reload
sudo systemctl enable --now flo-team-site
sudo systemctl restart flo-team-site
sleep 2
systemctl is-active flo-team-site
curl -sI -o /dev/null -w "team local %{http_code}\n" http://127.0.0.1:3010/flo-logistics/ || true
REMOTE
else
  echo "==> Skipping team site build (--demo-only)"
fi

echo "==> Building FLO demo on VPS"
ssh "$HOST" bash -s <<REMOTE
set -euo pipefail
export NODE_OPTIONS=--max-old-space-size=1536
export NEXT_BASE_PATH=/flo-logistics/demo
export DATABASE_URL=file:./dev.db
export FLO_SESSION_SECRET=flo-prod-change-me-radr-2026
cd /opt/flo-logistics-src
if [[ "${SKIP_SEED}" -eq 1 ]]; then
  export SKIP_SEED=true
  echo "SKIP_SEED=true — keeping existing SQLite (if any)"
else
  # Drop leftover SQLite from prior final-round deploys so migrate/seed match baseline schema
  # (seed itself also no-ops when a route was updated in the last hour unless FORCE_SEED=1)
  rm -f dev.db dev.db-journal prisma/dev.db prisma/dev.db-journal
fi
npm ci
npx prisma generate
npx prisma migrate deploy
npm run db:seed
node node_modules/next/dist/bin/next build
sudo systemctl daemon-reload
sudo systemctl enable --now flo-demo
sudo systemctl restart flo-demo
sleep 3
systemctl is-active flo-demo
curl -sI -o /dev/null -w "demo home %{http_code}\n" http://127.0.0.1:3011/flo-logistics/demo/ || true
curl -sI -o /dev/null -w "demo login %{http_code}\n" http://127.0.0.1:3011/flo-logistics/demo/login || true
curl -s -o /dev/null -w "demo api %{http_code}\n" http://127.0.0.1:3011/flo-logistics/demo/api/vehicles || true
curl -s -o /dev/null -w "demo health %{http_code}\n" http://127.0.0.1:3011/flo-logistics/demo/api/health || true
REMOTE

echo "==> Public smoke checks"
curl -sL -o /dev/null -w "team %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/"
curl -sL -o /dev/null -w "about %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/about"
curl -sL -o /dev/null -w "presentation %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/presentation"
curl -sL -o /dev/null -w "demo home %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/demo"
curl -sI -o /dev/null -w "demo login %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/demo/login"
curl -sL -o /dev/null -w "sovereign %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/demo/sovereign-ai"
curl -sL -o /dev/null -w "cv tour %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/demo/computer-vision/tour"
curl -s -o /dev/null -w "health %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/demo/api/health"
echo "Team: https://radr.nxtdev.xyz/flo-logistics/"
echo "Demo: https://radr.nxtdev.xyz/flo-logistics/demo"
echo "Sovereign AI: https://radr.nxtdev.xyz/flo-logistics/demo/sovereign-ai"
echo "CV tour: https://radr.nxtdev.xyz/flo-logistics/demo/computer-vision/tour"
