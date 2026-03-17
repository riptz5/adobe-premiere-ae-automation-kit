#!/usr/bin/env bash
# Run server tests in a loop until one fails (or until --max N rounds).
# Usage: ./scripts/run_until_fail.sh [--max N] [--e2e]
#   --max N: stop after N successful rounds (default: no limit, run until failure or Ctrl+C)
#   --e2e: also run Playwright dashboard tests (requires server on :8787; run ./go.sh in another terminal)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
RUN_E2E=false
MAX_RUNS=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --max)   MAX_RUNS="$2" ; shift 2 ;;
    --e2e)   RUN_E2E=true ; shift ;;
    *)       echo "Unknown option: $1" >&2 ; exit 1 ;;
  esac
done

round=0
while true; do
  round=$((round + 1))
  echo "[run_until_fail] Round $round"
  # 1) Server unit/smoke tests
  (cd server && npm run test) || { echo "[run_until_fail] FAIL at round $round (server tests)" ; exit 1 ; }
  # 2) Optional e2e (server must be running)
  if [[ "$RUN_E2E" == "true" ]]; then
    npx playwright test server/tests/dashboard.spec.ts --reporter=list || { echo "[run_until_fail] FAIL at round $round (e2e)" ; exit 1 ; }
  fi
  if [[ -n "${MAX_RUNS:-}" ]] && [[ "$round" -ge "${MAX_RUNS}" ]]; then
    echo "[run_until_fail] Reached $round rounds, stopping."
    exit 0
  fi
done
