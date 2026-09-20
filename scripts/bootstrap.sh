#!/usr/bin/env bash
# One-shot automated install for FLO (clone + npm run install:flo -- --yes).
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/JustHackr/flo-logistics/main/scripts/bootstrap.sh | bash
#
# Or with options forwarded to the installer:
#   curl -fsSL …/bootstrap.sh | bash -s -- --mode=ollama --pull-ollama
#
# Environment:
#   FLO_INSTALL_DIR   Target directory (default: ./flo-logistics)
#   FLO_REPO_URL      Git remote (default: https://github.com/JustHackr/flo-logistics.git)
#   FLO_REPO_REF      Branch or tag (default: main)
set -euo pipefail

REPO_URL="${FLO_REPO_URL:-https://github.com/JustHackr/flo-logistics.git}"
REPO_REF="${FLO_REPO_REF:-main}"
INSTALL_DIR="${FLO_INSTALL_DIR:-flo-logistics}"

echo "FLO bootstrap"
echo "  repo: ${REPO_URL} @ ${REPO_REF}"
echo "  dir:  ${INSTALL_DIR}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required tool: $1" >&2
    exit 1
  fi
}

need git
need node
need npm

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" -lt 20 ]; then
  echo "Node.js 20+ required (found $(node -v))" >&2
  exit 1
fi

if [ -d "${INSTALL_DIR}/.git" ]; then
  echo "→ Updating existing clone in ${INSTALL_DIR}"
  git -C "${INSTALL_DIR}" fetch --depth 1 origin "${REPO_REF}"
  git -C "${INSTALL_DIR}" checkout -q FETCH_HEAD
else
  echo "→ Cloning into ${INSTALL_DIR}"
  git clone --depth 1 --branch "${REPO_REF}" "${REPO_URL}" "${INSTALL_DIR}"
fi

cd "${INSTALL_DIR}"

# Forward args to install.mjs; default to fully automated sovereign install.
if [ "$#" -eq 0 ]; then
  set -- --yes
elif [[ " $* " != *" --yes "* ]] && [[ " $* " != *" -y "* ]]; then
  set -- --yes "$@"
fi

echo "→ npm run install:flo -- $*"
npm run install:flo -- "$@"

echo ""
echo "Bootstrap complete."
echo "  cd ${INSTALL_DIR}"
echo "  npm run dev"
