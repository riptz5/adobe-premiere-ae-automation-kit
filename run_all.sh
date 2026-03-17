#!/usr/bin/env bash
# Start AutoKit server and optionally remind about dashboard / CEP / Next.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${LOG_DIR:-/tmp}"
SERVER_LOG="${LOG_DIR}/autokit_server.log"
SERVER_PID="${LOG_DIR}/autokit_server.pid"

start_server() {
  if [ -f "$SERVER_PID" ] && ps -p "$(cat "$SERVER_PID")" > /dev/null 2>&1; then
    echo "[autokit] server already running (pid $(cat "$SERVER_PID"))"
    return
  fi
  echo "[autokit] starting server on :8787 ..."
  cd "$ROOT"
  nohup node server/src/index.js > "$SERVER_LOG" 2>&1 &
  echo $! > "$SERVER_PID"
}

start_server

echo "[autokit] dashboard: http://localhost:8787/"
echo "[autokit] server log: $SERVER_LOG"
echo "[autokit] Next.js (if needed): cd web && npm run dev"
echo "[autokit] CEP panel: load Premiere extension from premiere/cep-panel and set server URL to http://localhost:8787"
