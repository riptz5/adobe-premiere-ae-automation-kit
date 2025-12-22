#!/usr/bin/env bash
set -euo pipefail

# Simple parallel Codex runner to honor "never code alone" by spawning multiple agents.
# Prompts can come from CLI args or a text file (one prompt per line, '#' and blank lines ignored).

usage() {
  cat <<'EOF'
Usage: scripts/run_multi_agents.sh [options] "Prompt A" "Prompt B" ...
Options:
  -f, --file <path>        Read prompts from file (one per line, '#' ignored)
  -o, --outdir <path>      Base output dir (default: notes/multi-agent)
  -m, --model <name>       Model for codex exec (e.g., o4-mini, o3, llama3)
  -s, --sandbox <mode>     Sandbox mode (read-only|workspace-write|danger-full-access)
      --oss                Use open-source provider configured in Codex (adds --oss)
      --local-provider <p> Local provider when using --oss (ollama|lmstudio)
      --codex-arg "<arg>"  Extra arg passed to codex exec (repeatable)
  -h, --help               Show this help
EOF
}

if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI not found. Install with 'npm i -g @openai/codex' or brew." >&2
  exit 1
fi

prompts=()
prompt_file=""
out_base="notes/multi-agent"
model=""
sandbox="workspace-write"
codex_extra=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -f|--file)
      prompt_file="${2:-}"
      shift 2
      ;;
    -o|--outdir)
      out_base="${2:-}"
      shift 2
      ;;
    -m|--model)
      model="${2:-}"
      shift 2
      ;;
    -s|--sandbox)
      sandbox="${2:-}"
      shift 2
      ;;
    --oss)
      codex_extra+=("--oss")
      shift
      ;;
    --local-provider)
      codex_extra+=("--local-provider" "${2:-}")
      shift 2
      ;;
    --codex-arg)
      codex_extra+=("${2:-}")
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      prompts+=("$1")
      shift
      ;;
  esac
done

if [[ -n "$prompt_file" ]]; then
  if [[ ! -f "$prompt_file" ]]; then
    echo "Prompt file not found: $prompt_file" >&2
    exit 1
  fi
  while IFS= read -r line; do
    [[ -z "$line" || "$line" =~ ^# ]] && continue
    prompts+=("$line")
  done <"$prompt_file"
fi

if [[ ${#prompts[@]} -lt 2 ]]; then
  echo "Provide at least two prompts (CLI or --file) to run in parallel." >&2
  usage
  exit 1
fi

run_dir="${out_base}/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$run_dir"

echo "Starting ${#prompts[@]} agents → $run_dir"
echo "Sandbox: $sandbox ${model:+| Model: $model}"

pids=()
names=()
idx=1
for prompt in "${prompts[@]}"; do
  agent_name="agent${idx}"
  logfile="${run_dir}/${agent_name}.log"
  names+=("$agent_name")
  {
    echo "## prompt"
    echo "$prompt"
    echo "----"
    cmd=(codex exec "-s" "$sandbox")
    [[ -n "$model" ]] && cmd+=("-m" "$model")
    cmd+=("${codex_extra[@]}" "$prompt")
    "${cmd[@]}"
  } &> "$logfile" &
  pids+=($!)
  echo "[$agent_name] pid $! → $logfile"
  ((idx++))
done

fail=0
for i in "${!pids[@]}"; do
  pid=${pids[$i]}
  agent=${names[$i]}
  if wait "$pid"; then
    echo "[$agent] completed"
  else
    echo "[$agent] failed (pid $pid)" >&2
    fail=1
  fi
done

echo "Logs stored in $run_dir"
exit $fail
