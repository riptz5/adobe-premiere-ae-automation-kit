#!/usr/bin/env bash
set -euo pipefail

LABEL="com.autokit.server"
PLIST_PATH="${HOME}/Library/LaunchAgents/${LABEL}.plist"

DOMAIN="gui/${UID}"
if [ -f "${PLIST_PATH}" ]; then
  launchctl bootout "${DOMAIN}" "${PLIST_PATH}" 2>/dev/null || true
  launchctl unload "${PLIST_PATH}" 2>/dev/null || true
  rm -f "${PLIST_PATH}"
  echo "[autokit] launchd removed: ${PLIST_PATH}"
else
  echo "[autokit] not installed (${PLIST_PATH} not found)"
fi

