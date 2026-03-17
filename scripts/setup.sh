#!/usr/bin/env bash
# Minimal setup: install deps, optional whisper, base config.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "[setup] Installing server dependencies..."
(cd server && npm install)

if [ -d "web" ] && [ -f "web/package.json" ]; then
  echo "[setup] Installing web (Next.js) dependencies..."
  (cd web && npm install)
fi

if [ -f "scripts/setup_whisper.sh" ]; then
  echo "[setup] Optional: run ./scripts/setup_whisper.sh to install whisper.cpp and models"
fi

if [ ! -f "config/local.json" ]; then
  echo "[setup] No config/local.json found; using config/default.json (copy to config/local.json to override)"
  mkdir -p config
fi

echo "[setup] Done. Start with: ./scripts/run_autokit.sh or npm run dev in server/"
