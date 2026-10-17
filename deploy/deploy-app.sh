#!/usr/bin/env bash
# Deploy GoldenBough FLO to a separate VPS path. Does not replace /flo-logistics/demo.
# Usage: ./deploy/deploy-app.sh [user@host]
set -euo pipefail

HOST="${1:-ubuntu@43.134.182.44}"
SSH_KEY="${FLO_SSH_KEY:-$HOME/Downloads/lighthouse.pem}"
SSH=(ssh)
SCP=(scp)
if [[ -f "$SSH_KEY" ]]; then
  chmod 600 "$SSH_KEY" 2>/dev/null || true
  SSH=(ssh -i "$SSH_KEY" -o IdentitiesOnly=yes)
  SCP=(scp -i "$SSH_KEY" -o IdentitiesOnly=yes)
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_SRC="/opt/flo-app-src"

echo "==> Syncing GoldenBough app to ${HOST}:${REMOTE_SRC}"
"${SSH[@]}" "$HOST" "sudo mkdir -p ${REMOTE_SRC} && sudo chown -R ubuntu:ubuntu ${REMOTE_SRC}"

RSYNC_RSH="${SSH[*]}"
rsync -az --delete -e "$RSYNC_RSH" \
  --exclude node_modules \
  --exclude .next \
  --exclude '**/*.db' \
  --exclude '**/*.db-journal' \
  --exclude .git \
  --exclude team-site \
  --exclude android \
  --exclude .worktrees \
  --exclude android/keystores \
  --exclude android/keystore.properties \
  --exclude .env \
  --exclude .env.local \
  --exclude '*.pem' \
  "$ROOT/" "${HOST}:${REMOTE_SRC}/"

echo "==> Installing nginx snippet + flo-app unit (demo unit untouched)"
"${SCP[@]}" "$ROOT/deploy/nginx-flo-logistics.conf" "$HOST:/tmp/flo-logistics.conf"
"${SCP[@]}" "$ROOT/deploy/systemd/flo-app.service" "$HOST:/tmp/flo-app.service"

"${SSH[@]}" "$HOST" bash -s <<'REMOTE'
set -euo pipefail
sudo mkdir -p /etc/nginx/snippets /etc/flo-logistics
sudo mv /tmp/flo-logistics.conf /etc/nginx/snippets/flo-logistics.conf
sudo mv /tmp/flo-app.service /etc/systemd/system/flo-app.service
sudo nginx -t
sudo systemctl reload nginx
REMOTE

echo "==> Ensuring Postgres role/db and app.env"
"${SSH[@]}" "$HOST" python3 - <<'PY'
import os, re, secrets, string, subprocess

def psql(sql, database="postgres"):
    return subprocess.check_output(
        ["sudo", "-u", "postgres", "psql", "-d", database, "-Atc", sql],
        text=True,
    ).strip()

alphabet = string.ascii_letters + string.digits
env_path = "/etc/flo-logistics/app.env"
need_create = True
if os.path.exists(env_path):
    text = open(env_path).read()
    if "DATABASE_URL=" in text and "FLO_SESSION_SECRET=" in text:
        need_create = False

if need_create:
    db_pass = "".join(secrets.choice(alphabet) for _ in range(28))
    session = secrets.token_hex(32)
    if not psql("SELECT 1 FROM pg_roles WHERE rolname='flo_app'"):
        psql(f"CREATE USER flo_app WITH PASSWORD '{db_pass}'")
    else:
        psql(f"ALTER USER flo_app WITH PASSWORD '{db_pass}'")
    if not psql("SELECT 1 FROM pg_database WHERE datname='flo_app'"):
        subprocess.check_call(["sudo", "-u", "postgres", "createdb", "-O", "flo_app", "flo_app"])
    else:
        psql("ALTER DATABASE flo_app OWNER TO flo_app;")
    psql("GRANT ALL ON SCHEMA public TO flo_app;", database="flo_app")
    psql("ALTER SCHEMA public OWNER TO flo_app;", database="flo_app")
    content = "\n".join([
        f"DATABASE_URL=postgresql://flo_app:{db_pass}@127.0.0.1:5432/flo_app",
        f"FLO_SESSION_SECRET={session}",
        "NODE_ENV=production",
        "PORT=3012",
        "NEXT_BASE_PATH=/flo-logistics/app",
        "",
    ])
    tmp = "/tmp/flo-app.env"
    with open(tmp, "w") as f:
        f.write(content)
    os.chmod(tmp, 0o600)
    subprocess.check_call(["sudo", "mv", tmp, env_path])
    subprocess.check_call(["sudo", "chown", "ubuntu:ubuntu", env_path])
    subprocess.check_call(["sudo", "chmod", "600", env_path])
    print("app.env=created")
else:
    print("app.env=kept")
PY

echo "==> Building GoldenBough app on VPS"
"${SSH[@]}" "$HOST" bash -s <<'REMOTE'
set -euo pipefail
export NODE_OPTIONS=--max-old-space-size=768
cd /opt/flo-app-src
NODE_ENV= npm ci --include=dev
set -a
# shellcheck disable=SC1091
source /etc/flo-logistics/app.env
set +a
export NEXT_BASE_PATH=/flo-logistics/app
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts --force
node node_modules/next/dist/bin/next build
sudo systemctl daemon-reload
sudo systemctl enable --now flo-app
sudo systemctl restart flo-app
sleep 4
systemctl is-active flo-app
systemctl is-active flo-demo
curl -sI -o /dev/null -w "app login %{http_code}\n" http://127.0.0.1:3012/flo-logistics/app/login || true
curl -sI -o /dev/null -w "demo login %{http_code}\n" http://127.0.0.1:3011/flo-logistics/demo/login || true
REMOTE

echo "==> Public smoke"
curl -sI -o /dev/null -w "app login %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/app/login"
curl -sI -o /dev/null -w "demo login %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/demo/login"
curl -s -o /dev/null -w "app health %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/app/api/health"
echo "App: https://radr.nxtdev.xyz/flo-logistics/app"
echo "Demo (unchanged): https://radr.nxtdev.xyz/flo-logistics/demo"
