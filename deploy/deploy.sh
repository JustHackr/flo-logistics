#!/usr/bin/env bash
# Deploy helper — rsync sources to VPS and rebuild docker compose.
# Usage: ./deploy/deploy.sh user@host
set -euo pipefail
HOST="${1:?Usage: $0 user@host}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_DIR="${REMOTE_DIR:-/opt/flo-logistics}"

rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude '**/*.db' \
  --exclude .git \
  --exclude team-site/node_modules \
  --exclude team-site/.next \
  "$ROOT/" "${HOST}:${REMOTE_DIR}/"

ssh "$HOST" "cd ${REMOTE_DIR} && docker compose -f deploy/docker-compose.yml up -d --build"
echo "Deployed. Team site: https://radr.nxtdev.xyz/flo-logistics/"
echo "Demo: https://radr.nxtdev.xyz/flo-logistics/demo/"
