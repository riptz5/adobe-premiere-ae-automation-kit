#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="/tmp"
OLLAMA_PID="${LOG_DIR}/ollama_11435.pid"
AUTOKIT_PID="${LOG_DIR}/autokit_server.pid"

if [ -f "${AUTOKIT_PID}" ]; then
  kill "$(cat "${AUTOKIT_PID}")" 2>/dev/null || true
  rm -f "${AUTOKIT_PID}"
  echo "[autokit] server stopped"
fi

if [ -f "${OLLAMA_PID}" ]; then
  kill "$(cat "${OLLAMA_PID}")" 2>/dev/null || true
  rm -f "${OLLAMA_PID}"
  echo "[autokit] ollama stopped"
fi
