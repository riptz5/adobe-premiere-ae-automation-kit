#!/usr/bin/env bash
set -euo pipefail

LOG_DIR="/tmp"
SERVER_PID="${LOG_DIR}/autokit_server.pid"
WEB_PID="${LOG_DIR}/autokit_web.pid"

stop_proc() {
  local pidfile="$1"
  local name="$2"
  if [ -f "$pidfile" ]; then
    local pid
    pid="$(cat "$pidfile")"
    if kill "$pid" 2>/dev/null; then
      echo "[autokit] stopped $name (pid $pid)"
    fi
    rm -f "$pidfile"
  fi
}

stop_proc "$WEB_PID" "web"
stop_proc "$SERVER_PID" "server"
