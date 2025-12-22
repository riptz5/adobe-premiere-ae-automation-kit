#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/tmp"
SERVER_LOG="${LOG_DIR}/autokit_server.log"
SERVER_PID="${LOG_DIR}/autokit_server.pid"
WEB_LOG="${LOG_DIR}/autokit_web.log"
WEB_PID="${LOG_DIR}/autokit_web.pid"

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

start_web() {
  if [ -f "$WEB_PID" ] && ps -p "$(cat "$WEB_PID")" > /dev/null 2>&1; then
    echo "[autokit] web already running (pid $(cat "$WEB_PID"))"
    return
  fi
  echo "[autokit] starting web on :3000 ..."
  cd "$ROOT/web"
  export NEXT_PUBLIC_API="http://localhost:8787"
  nohup npm run dev -- --port 3000 > "$WEB_LOG" 2>&1 &
  echo $! > "$WEB_PID"
}

start_server
start_web

echo "[autokit] dashboard: http://localhost:3000"
echo "[autokit] server log: $SERVER_LOG"
echo "[autokit] web log: $WEB_LOG"
