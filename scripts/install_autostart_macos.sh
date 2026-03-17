#!/usr/bin/env bash
set -euo pipefail

LABEL="com.autokit.server"
PLIST_DIR="${HOME}/Library/LaunchAgents"
PLIST_PATH="${PLIST_DIR}/${LABEL}.plist"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="$(command -v node || true)"

if [ -z "${NODE_BIN}" ]; then
  echo "[autokit] ERROR: node not found in PATH"
  exit 1
fi

mkdir -p "${PLIST_DIR}"

cat > "${PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${LABEL}</string>

    <key>ProgramArguments</key>
    <array>
      <string>${NODE_BIN}</string>
      <string>${REPO_ROOT}/server/src/index.js</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${REPO_ROOT}</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/tmp/autokit_server.log</string>

    <key>StandardErrorPath</key>
    <string>/tmp/autokit_server.log</string>
  </dict>
</plist>
EOF

DOMAIN="gui/${UID}"
if launchctl bootout "${DOMAIN}" "${PLIST_PATH}" 2>/dev/null; then
  true
fi

if launchctl bootstrap "${DOMAIN}" "${PLIST_PATH}" 2>/dev/null; then
  launchctl enable "${DOMAIN}/${LABEL}" 2>/dev/null || true
  launchctl kickstart -k "${DOMAIN}/${LABEL}" 2>/dev/null || true
else
  launchctl unload "${PLIST_PATH}" 2>/dev/null || true
  launchctl load "${PLIST_PATH}"
fi

echo "[autokit] launchd installed: ${PLIST_PATH}"
echo "[autokit] dashboard: http://localhost:8787/"

