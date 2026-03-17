#!/usr/bin/env bash
# Smoke check: endpoints and basic flows. Run with server up (e.g. after ./run_all.sh).
set -euo pipefail

BASE="${1:-http://localhost:8787}"
OK=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local method="${3:-GET}"
  if [[ "$method" == "GET" ]]; then
    if curl -sf "${BASE}${url}" > /dev/null 2>&1; then echo "OK $name"; ((OK++)); else echo "FAIL $name"; ((FAIL++)); fi
  else
    if curl -sf -X POST -H "Content-Type: application/json" -d '{}' "${BASE}${url}" > /dev/null 2>&1; then echo "OK $name"; ((OK++)); else echo "FAIL $name"; ((FAIL++)); fi
  fi
}

echo "Checking $BASE ..."
check "health" "/health"
check "config" "/v1/config"
check "config/profiles" "/v1/config/profiles"
check "jobs" "/v1/jobs"
check "metrics" "/v1/metrics"
# POST endpoints (may 400/422 without body; we only check reachability)
curl -sf -X POST -H "Content-Type: application/json" -d '{"transcript":"x","profile":"shorts"}' "${BASE}/v1/analyze/transcript" > /dev/null 2>&1 && { echo "OK analyze/transcript"; ((OK++)); } || { echo "FAIL analyze/transcript"; ((FAIL++)); }
curl -sf -X POST -H "Content-Type: application/json" -d '{"path":"/nonexistent"}' "${BASE}/v1/qa/analyze" > /dev/null 2>&1 && { echo "OK qa/analyze"; ((OK++)); } || { echo "FAIL or 422 qa/analyze"; ((FAIL++)); }

echo "---"
echo "Passed: $OK | Failed: $FAIL"
[[ $FAIL -eq 0 ]] && exit 0 || exit 1
