#!/usr/bin/env bash
# Un solo comando: para lo que haya en 8787, instala deps, arranca Ollama + servidor, espera y abre el dashboard.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
PORT=8787
LOG_DIR="${LOG_DIR:-/tmp}"
OLLAMA_PID="${LOG_DIR}/ollama_11435.pid"
AUTOKIT_PID="${LOG_DIR}/autokit_server.pid"
SERVER_LOG="${LOG_DIR}/autokit_server.log"

echo "[autokit] Liberando puerto ${PORT}..."
if [ -f "${AUTOKIT_PID}" ]; then
  kill "$(cat "${AUTOKIT_PID}")" 2>/dev/null || true
  rm -f "${AUTOKIT_PID}"
fi
for pid in $(lsof -i :${PORT} -t 2>/dev/null); do
  kill "$pid" 2>/dev/null || true
done
sleep 1
if lsof -i :${PORT} >/dev/null 2>&1; then
  echo "[autokit] No se pudo liberar el puerto ${PORT}. Cierra el proceso que lo usa y vuelve a ejecutar."
  exit 1
fi

echo "[autokit] Dependencias del servidor..."
if [ ! -d "server/node_modules" ]; then
  (cd server && npm install)
else
  (cd server && npm install --no-save 2>/dev/null || true)
fi

if command -v ollama >/dev/null 2>&1; then
  if [ -f "${OLLAMA_PID}" ] && ps -p "$(cat "${OLLAMA_PID}")" >/dev/null 2>&1; then
    echo "[autokit] Ollama ya está en marcha."
  else
    echo "[autokit] Arrancando Ollama (agente LLM)..."
    nohup env OLLAMA_HOST=127.0.0.1:11435 ollama serve >> "${LOG_DIR}/ollama_11435.log" 2>&1 &
    echo $! > "${OLLAMA_PID}"
    sleep 2
  fi
else
  echo "[autokit] Ollama no instalado; el agente no funcionará, el resto sí."
fi

echo "[autokit] Arrancando servidor en :${PORT}..."
nohup node server/src/index.js >> "$SERVER_LOG" 2>&1 &
echo $! > "${AUTOKIT_PID}"

echo -n "[autokit] Esperando servidor"
for i in {1..30}; do
  if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/health" 2>/dev/null | grep -q 200; then
    echo " listo."
    break
  fi
  echo -n "."
  sleep 0.5
done
if ! curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/health" 2>/dev/null | grep -q 200; then
  echo ""
  echo "[autokit] El servidor no respondió a tiempo. Log: $SERVER_LOG"
  exit 1
fi

echo "[autokit] Dashboard: http://localhost:${PORT}/"
if [[ "$(uname)" == "Darwin" ]]; then
  open "http://localhost:${PORT}/"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:${PORT}/" 2>/dev/null || true
fi
echo "[autokit] Para parar: ./scripts/stop_autokit.sh"
