#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="/tmp"
OLLAMA_PID="${LOG_DIR}/ollama_11435.pid"
AUTOKIT_PID="${LOG_DIR}/autokit_server.pid"
PORT=8787

if [ -f "${AUTOKIT_PID}" ]; then
  kill "$(cat "${AUTOKIT_PID}")" 2>/dev/null || true
  rm -f "${AUTOKIT_PID}"
  echo "[autokit] server stopped (pid file)"
else
  for pid in $(lsof -i :${PORT} -t 2>/dev/null); do
    kill "$pid" 2>/dev/null || true
  done
  if lsof -i :${PORT} >/dev/null 2>&1; then
    echo "[autokit] could not free port ${PORT}"
  else
    echo "[autokit] server stopped (port ${PORT})"
  fi
fi

if [ -f "${OLLAMA_PID}" ]; then
  kill "$(cat "${OLLAMA_PID}")" 2>/dev/null || true
  rm -f "${OLLAMA_PID}"
  echo "[autokit] ollama stopped"
fi
