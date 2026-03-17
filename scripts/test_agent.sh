#!/usr/bin/env bash
# Prueba el agente orquestador: comprueba que el servidor responda y opcionalmente llama a POST /v1/agent/chat.
# Uso: ./scripts/test_agent.sh [message]
# Sin argumentos: solo comprueba /health y que /v1/agent/chat exista.
# Con message: hace POST /v1/agent/chat con ese mensaje (requiere Ollama con el modelo configurado).

set -e
BASE="${BASE_URL:-http://localhost:8787}"
MSG="${1:-}"

echo "=== AutoKit agent test (base: $BASE) ==="

# 1. Health
echo -n "GET /health ... "
health=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health" || true)
if [ "$health" = "200" ]; then
  echo "OK ($health)"
else
  echo "FAIL (code $health). Is the server running? Start with: cd server && npm run dev"
  exit 1
fi

# 2. Config (model)
echo -n "GET /v1/config (model) ... "
model=$(curl -s "$BASE/v1/config" | sed -n 's/.*"model":"\([^"]*\)".*/\1/p' || echo "?")
echo "$model"

# 3. Agent chat
if [ -n "$MSG" ]; then
  echo "POST /v1/agent/chat message=\"$MSG\" ..."
  out=$(curl -s -X POST "$BASE/v1/agent/chat" \
    -H "Content-Type: application/json" \
    -d "{\"message\":$(echo "$MSG" | jq -Rs .)}")
  if echo "$out" | jq -e '.reply' >/dev/null 2>&1; then
    echo "Reply: $(echo "$out" | jq -r '.reply')"
  else
    echo "Response: $out"
  fi
else
  echo "POST /v1/agent/chat (smoke) ..."
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/v1/agent/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"health"}')
  if [ "$code" = "200" ] || [ "$code" = "503" ]; then
    echo "OK (code $code). Use: ./scripts/test_agent.sh \"estado del servidor\" to get a real reply."
  elif [ "$code" = "500" ]; then
    body=$(curl -s -X POST "$BASE/v1/agent/chat" -H "Content-Type: application/json" -d '{"message":"health"}')
    if echo "$body" | grep -q "fetch failed\|LLM\|reply"; then
      echo "OK (500, LLM/Ollama unreachable). Agent route works. Start Ollama for full replies."
    else
      echo "Unexpected 500: $body"
      exit 1
    fi
  elif [ "$code" = "404" ]; then
    echo "404 — Agent route not found. Restart the server (cd server && npm run dev) to load the latest code."
    exit 1
  else
    echo "Unexpected code $code"
    exit 1
  fi
fi

echo "=== done ==="
