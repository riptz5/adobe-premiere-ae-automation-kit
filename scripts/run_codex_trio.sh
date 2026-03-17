#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Uso:
  scripts/run_codex_trio.sh -p "<tarea>" [opciones]
  echo "<tarea>" | scripts/run_codex_trio.sh [opciones]

Corre 3 sesiones de Codex en paralelo (planner/implementer/reviewer) y guarda la
última respuesta de cada una en archivos dentro de OUTDIR.

Opciones:
  -p, --prompt <texto>          Prompt base (si no se provee, lee de stdin)
  -d, --outdir <dir>            Carpeta de salida (default: .codex-agents/<timestamp>)
  -m, --model <modelo>          Modelo para `codex exec`
      --planner-sandbox <modo>  Sandbox planner (default: read-only)
      --impl-sandbox <modo>     Sandbox implementer (default: read-only)
      --review-sandbox <modo>   Sandbox reviewer (default: read-only)
      --codex-arg "<arg>"       Flag extra para `codex exec` (repetible)
      --                       Todo lo que siga se pasa a `codex exec`
  -h, --help                    Ayuda

Ejemplo:
  scripts/run_codex_trio.sh -p "Audita endpoints del server y sugiere fixes" -m o4-mini
EOF
}

prompt=""
outdir=""
model=""
planner_sandbox="read-only"
impl_sandbox="read-only"
review_sandbox="read-only"
codex_extra=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--prompt) prompt="${2:-}"; shift 2 ;;
    -d|--outdir) outdir="${2:-}"; shift 2 ;;
    -m|--model) model="${2:-}"; shift 2 ;;
    --planner-sandbox) planner_sandbox="${2:-}"; shift 2 ;;
    --impl-sandbox) impl_sandbox="${2:-}"; shift 2 ;;
    --review-sandbox) review_sandbox="${2:-}"; shift 2 ;;
    --codex-arg) codex_extra+=("${2:-}"); shift 2 ;;
    --) shift; codex_extra+=("$@"); break ;;
    -h|--help) usage; exit 0 ;;
    *) prompt="$1"; shift ;;
  esac
done

if [[ -z "$prompt" ]]; then
  if [[ -t 0 ]]; then
    usage
    exit 1
  fi
  prompt="$(cat)"
fi

if [[ -z "$outdir" ]]; then
  outdir=".codex-agents/$(date +%Y%m%d-%H%M%S)"
fi

mkdir -p "$outdir"
printf "%s\n" "$prompt" > "${outdir}/task.txt"

agent_pids=()

run_agent() {
  local role="$1"
  local sandbox="$2"
  local outfile="${outdir}/${role}.md"
  local logfile="${outdir}/${role}.log"

  # Disable MCP_DOCKER by default to avoid startup timeouts in environments
  # without Docker MCP gateway; callers can override via --codex-arg "-c ...".
  local -a cmd=(codex exec -s "$sandbox" -o "$outfile" -c 'mcp_servers.MCP_DOCKER.enabled=false')
  [[ -n "$model" ]] && cmd+=(-m "$model")
  if ((${#codex_extra[@]})); then
    cmd+=("${codex_extra[@]}")
  fi
  cmd+=(-)

  {
    case "$role" in
      planner)
        cat <<EOF
Eres el PLANNER. No edites archivos. Entrega un plan corto (pasos) y los archivos/símbolos a tocar.

TAREA:
$prompt
EOF
        ;;
      implementer)
        cat <<EOF
Eres el IMPLEMENTER. Si tu sandbox es read-only, entrega un patch propuesto (en formato diff) y notas de integración.
Si tu sandbox permite escritura, aplica los cambios mínimos necesarios.

TAREA:
$prompt
EOF
        ;;
      reviewer)
        cat <<EOF
Eres el REVIEWER. Señala riesgos, edge cases, y mejoras concretas. No edites archivos.

TAREA:
$prompt
EOF
        ;;
      *)
        printf "%s\n" "$prompt"
        ;;
    esac
  } | "${cmd[@]}" >"$logfile" 2>&1 &
  agent_pids+=("$!")
}

echo "[codex-trio] outdir: $outdir"
run_agent planner "$planner_sandbox"
run_agent implementer "$impl_sandbox"
run_agent reviewer "$review_sandbox"


# Espera a que todos los jobs en background terminen
fail=0
for pid in "${agent_pids[@]}"; do
  wait "$pid" || fail=1
done

echo "[codex-trio] done: ${outdir}/planner.md ${outdir}/implementer.md ${outdir}/reviewer.md"
exit "$fail"
