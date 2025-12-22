#!/bin/bash
set -e

# Initial local setup for repo automation

echo "[Setup] Checking for GitHub CLI (gh)..."
if ! command -v gh &> /dev/null; then
  echo "[Setup] GitHub CLI not found. Installing..."
  brew install gh || {
    echo "[Setup] Failed to install GitHub CLI. Please install manually."; exit 1;
  }
fi

echo "[Setup] Authenticating GitHub CLI..."
gh auth status || gh auth login

echo "[Setup] Syncing workflows..."
git pull origin main

echo "[Setup] Ensuring workflows are present..."
if [ ! -f .github/workflows/ai-agent-dev.yml ] || [ ! -f .github/workflows/production.yml ]; then
  echo "[Setup] ERROR: Workflow files missing. Please check repository."; exit 1;
fi

echo "[Setup] Installing Node.js dependencies..."
if [ -f package.json ]; then
  npm ci || npm install
fi

echo "[Setup] Ready! All automation workflows are active."
