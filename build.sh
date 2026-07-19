#!/usr/bin/env bash
# Build Netlify / CI — déterministe (conserve package-lock.json).
# Conservé pour compatibilité ; netlify.toml appelle désormais `npm ci && npm run build`.
set -euo pipefail

echo "Node: $(node --version) | npm: $(npm --version)"

if [[ ! -f package-lock.json ]]; then
  echo "ERROR: package-lock.json manquant — commits le lockfile avant de déployer."
  exit 1
fi

npm ci --legacy-peer-deps
npm run build

if [[ ! -f dist/index.html ]]; then
  echo "ERROR: dist/index.html absent après build"
  exit 1
fi

echo "Build OK → dist/"
