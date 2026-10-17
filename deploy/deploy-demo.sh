#!/usr/bin/env bash
# Deploy GoldenBough onto the public live demo (/flo-logistics/demo).
# Preserves team-site, /flo-logistics/app, and persona logins.
# Usage: ./deploy/deploy-demo.sh [user@host]
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
REMOTE_SRC="/opt/flo-logistics-src"

echo "==> Syncing GoldenBough into live demo source (team-site excluded)"
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

echo "==> Installing demo systemd unit only (nginx/app/team-site untouched)"
"${SCP[@]}" "$ROOT/deploy/systemd/flo-demo.service" "$HOST:/tmp/flo-demo.service"
"${SSH[@]}" "$HOST" "sudo mv /tmp/flo-demo.service /etc/systemd/system/flo-demo.service"

echo "==> Ensuring Postgres flo_demo + demo.env"
"${SSH[@]}" "$HOST" python3 - <<'PY'
import os, re, secrets, string, subprocess

def psql(sql, database="postgres"):
    return subprocess.check_output(
        ["sudo", "-u", "postgres", "psql", "-d", database, "-Atc", sql],
        text=True,
    ).strip()

alphabet = string.ascii_letters + string.digits
env_path = "/etc/flo-logistics/demo.env"
os.makedirs("/etc/flo-logistics", exist_ok=True)

existing = {}
if os.path.exists(env_path):
    for line in open(env_path):
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        existing[key] = value

unit = open("/etc/systemd/system/flo-demo.service").read() if os.path.exists("/etc/systemd/system/flo-demo.service") else ""
# Prefer existing env AI keys; fall back to whatever the previous unit still has.
for line in unit.splitlines():
    m = re.match(r"^Environment=(AI_[A-Z_]+)=(.*)$", line)
    if m and m.group(1) not in existing:
        existing[m.group(1)] = m.group(2)

db_pass = "".join(secrets.choice(alphabet) for _ in range(28))
if not psql("SELECT 1 FROM pg_roles WHERE rolname='flo_demo'"):
    psql(f"CREATE USER flo_demo WITH PASSWORD '{db_pass}'")
else:
    psql(f"ALTER USER flo_demo WITH PASSWORD '{db_pass}'")
if not psql("SELECT 1 FROM pg_database WHERE datname='flo_demo'"):
    subprocess.check_call(["sudo", "-u", "postgres", "createdb", "-O", "flo_demo", "flo_demo"])
else:
    psql("ALTER DATABASE flo_demo OWNER TO flo_demo;")
psql("GRANT ALL ON SCHEMA public TO flo_demo;", database="flo_demo")
psql("ALTER SCHEMA public OWNER TO flo_demo;", database="flo_demo")

session = existing.get("FLO_SESSION_SECRET") or secrets.token_hex(32)
lines = [
    f"DATABASE_URL=postgresql://flo_demo:{db_pass}@127.0.0.1:5432/flo_demo",
    f"FLO_SESSION_SECRET={session}",
    "NODE_ENV=production",
    "PORT=3011",
    "NEXT_BASE_PATH=/flo-logistics/demo",
]
for key in ("FLO_BOOTSTRAP_PASSWORD", "AI_ALLOW_EXTERNAL", "AI_BASE_URL", "AI_MODEL", "AI_API_KEY",
            "GOOGLE_MAPS_API_KEY", "GOOGLE_DISTANCE_MATRIX_API_KEY", "GOOGLE_MAPS_JS_API_KEY"):
    if key in existing and existing[key]:
        lines.append(f"{key}={existing[key]}")
content = "\n".join(lines) + "\n"
tmp = "/tmp/flo-demo.env"
with open(tmp, "w") as f:
    f.write(content)
os.chmod(tmp, 0o600)
subprocess.check_call(["sudo", "mv", tmp, env_path])
subprocess.check_call(["sudo", "chown", "ubuntu:ubuntu", env_path])
subprocess.check_call(["sudo", "chmod", "600", env_path])
print("demo.env=ready")
print("ai_keys=" + ",".join(sorted(k for k in existing if k.startswith("AI_"))))
PY

echo "==> Building GoldenBough live demo"
"${SSH[@]}" "$HOST" bash -s <<'REMOTE'
set -euo pipefail
export NODE_OPTIONS=--max-old-space-size=768
cd /opt/flo-logistics-src
NODE_ENV= npm ci --include=dev
set -a
# shellcheck disable=SC1091
source /etc/flo-logistics/demo.env
set +a
export NEXT_BASE_PATH=/flo-logistics/demo
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts --force
node node_modules/next/dist/bin/next build
sudo systemctl daemon-reload
sudo systemctl enable --now flo-demo
sudo systemctl restart flo-demo
sleep 5
echo "=== services ==="
systemctl is-active flo-demo
systemctl is-active flo-app
systemctl is-active flo-team-site
curl -sI -o /dev/null -w "demo login %{http_code}\n" http://127.0.0.1:3011/flo-logistics/demo/login || true
curl -sI -o /dev/null -w "app login %{http_code}\n" http://127.0.0.1:3012/flo-logistics/app/login || true
curl -sI -o /dev/null -w "final %{http_code}\n" http://127.0.0.1:3010/flo-logistics/final || true
REMOTE

echo "==> Public smoke"
curl -sI -o /dev/null -w "demo login %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/demo/login"
curl -sI -o /dev/null -w "app login %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/app/login"
curl -sI -o /dev/null -w "final %{http_code}\n" "https://radr.nxtdev.xyz/flo-logistics/final"
echo "Demo: https://radr.nxtdev.xyz/flo-logistics/demo"
