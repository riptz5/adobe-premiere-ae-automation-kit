#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="/tmp"
OLLAMA_LOG="${LOG_DIR}/ollama_11435.log"
OLLAMA_PID="${LOG_DIR}/ollama_11435.pid"
AUTOKIT_LOG="${LOG_DIR}/autokit_server.log"
AUTOKIT_PID="${LOG_DIR}/autokit_server.pid"

echo "[autokit] starting ollama on 127.0.0.1:11435..."
if [ -f "${OLLAMA_PID}" ] && ps -p "$(cat "${OLLAMA_PID}")" >/dev/null 2>&1; then
  echo "[autokit] ollama already running (pid $(cat "${OLLAMA_PID}"))"
else
  OLLAMA_HOST=127.0.0.1:11435 ollama serve > "${OLLAMA_LOG}" 2>&1 &
  echo $! > "${OLLAMA_PID}"
fi

echo "[autokit] starting autokit server..."
if [ -f "${AUTOKIT_PID}" ] && ps -p "$(cat "${AUTOKIT_PID}")" >/dev/null 2>&1; then
  echo "[autokit] server already running (pid $(cat "${AUTOKIT_PID}"))"
else
  cd "${ROOT_DIR}"
  node server/src/index.js > "${AUTOKIT_LOG}" 2>&1 &
  echo $! > "${AUTOKIT_PID}"
fi

echo "[autokit] dashboard: http://localhost:8787/"
