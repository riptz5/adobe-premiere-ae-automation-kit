#!/usr/bin/env bash
set -euo pipefail

# nowiswhen.sh
# Multi-agent from moment zero:
# - runs Planner + Reviewer in parallel (read-only)
# - optionally runs Implementer using both outputs
#
# Requires: codex CLI (https://github.com/openai/codex)

usage() {
  cat <<'EOF'
Usage:
  ./scripts/nowiswhen.sh [options] --task "Describe the work"
  ./scripts/nowiswhen.sh [options] "Describe the work"

Options:
  -o, --outdir <path>      Base output dir (default: notes/multi-agent)
  -m, --model <name>       Model passed to `codex exec -m` (optional)
  -s, --sandbox <mode>     Implementer sandbox (default: workspace-write)
      --oss                Use open-source provider configured in Codex
      --local-provider <p> Local provider for --oss (ollama|lmstudio)
      --implement          Run Implementer after Planner+Reviewer
      --final-review       Run a post-implementation Reviewer pass
  -h, --help               Show help

Outputs:
  notes/multi-agent/<timestamp>/
    task.txt
    planner.md, planner.log
    reviewer.md, reviewer.log
    implementer_input.md
    implementer.md, implementer.log (if --implement)
    final_review.md, final_review.log (if --final-review)
EOF
}

if ! command -v codex >/dev/null 2>&1; then
  echo "codex CLI not found. Install with 'npm i -g @openai/codex' or brew." >&2
  exit 1
fi

task=""
out_base="notes/multi-agent"
model=""
impl_sandbox="workspace-write"
use_oss=0
local_provider=""
run_implementer=0
run_final_review=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --task)
      task="${2:-}"
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
      impl_sandbox="${2:-}"
      shift 2
      ;;
    --oss)
      use_oss=1
      shift
      ;;
    --local-provider)
      local_provider="${2:-}"
      shift 2
      ;;
    --implement)
      run_implementer=1
      shift
      ;;
    --final-review)
      run_final_review=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -z "$task" ]]; then
        task="$1"
      else
        task="${task} $1"
      fi
      shift
      ;;
  esac
done

if [[ -z "$task" ]]; then
  echo "Missing task." >&2
  usage
  exit 1
fi

run_dir="${out_base}/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$run_dir"
printf '%s\n' "$task" > "${run_dir}/task.txt"

planner_out="${run_dir}/planner.md"
reviewer_out="${run_dir}/reviewer.md"
planner_log="${run_dir}/planner.log"
reviewer_log="${run_dir}/reviewer.log"
implementer_input="${run_dir}/implementer_input.md"

oss_args=()
if [[ "$use_oss" -eq 1 ]]; then
  oss_args+=(--oss)
fi
if [[ -n "$local_provider" ]]; then
  oss_args+=(--local-provider "$local_provider")
fi

model_args=()
if [[ -n "$model" ]]; then
  model_args+=(-m "$model")
fi

planner_prompt=$(cat <<EOF
You are the Planner agent.
Task: ${task}

Rules:
- Do NOT modify files.
- Do NOT run shell commands.
- Output must be actionable and minimal.

Deliverables (Markdown):
1) Plan (numbered steps)
2) Files to touch (with brief intent)
3) Risks/edge cases
4) How to verify (commands or tests)
EOF
)

reviewer_prompt=$(cat <<EOF
You are the Reviewer agent.
Task: ${task}

Rules:
- Do NOT modify files.
- Do NOT run shell commands.
- Focus on risks, correctness, security, concurrency, and documentation gaps.

Deliverables (Markdown):
1) Key risks
2) Concrete mitigations
3) Verification checklist
EOF
)

echo "nowiswhen: starting Planner + Reviewer in parallel → ${run_dir}"
echo "Sandbox: read-only (planner/reviewer) | Implementer sandbox: ${impl_sandbox}"

pids=()

(
  printf '%s' "$planner_prompt" | codex "${oss_args[@]}" -a never exec -s read-only "${model_args[@]}" -o "$planner_out" -
) &> "$planner_log" &
pids+=($!)

(
  printf '%s' "$reviewer_prompt" | codex "${oss_args[@]}" -a never exec -s read-only "${model_args[@]}" -o "$reviewer_out" -
) &> "$reviewer_log" &
pids+=($!)

fail=0
for pid in "${pids[@]}"; do
  if ! wait "$pid"; then
    fail=1
  fi
done
if [[ "$fail" -ne 0 ]]; then
  echo "nowiswhen: planner/reviewer failed; see logs in ${run_dir}" >&2
  exit 1
fi

{
  echo "# Task"
  echo
  echo "$task"
  echo
  echo "# Planner output"
  echo
  cat "$planner_out"
  echo
  echo "# Reviewer output"
  echo
  cat "$reviewer_out"
} > "$implementer_input"

echo "nowiswhen: wrote ${implementer_input}"

if [[ "$run_implementer" -eq 0 ]]; then
  echo "nowiswhen: done (analysis-only). Re-run with --implement to apply changes."
  exit 0
fi

implementer_out="${run_dir}/implementer.md"
implementer_log="${run_dir}/implementer.log"

implementer_prompt=$(cat <<EOF
You are the Implementer agent.
You MUST use the Planner + Reviewer outputs below before changing anything.

Rules:
- Follow the repo conventions and keep changes minimal.
- Do not add large new dependencies unless absolutely required.
- Do not commit secrets; never print tokens.
- After changes, run the smallest verification commands suggested.

Input:
$(cat "$implementer_input")
EOF
)

echo "nowiswhen: running Implementer (sandbox: ${impl_sandbox})"
(
  printf '%s' "$implementer_prompt" | codex "${oss_args[@]}" -a never exec -s "$impl_sandbox" "${model_args[@]}" -o "$implementer_out" -
) &> "$implementer_log"

if [[ "$run_final_review" -eq 0 ]]; then
  echo "nowiswhen: implementer finished. Outputs in ${run_dir}"
  exit 0
fi

final_out="${run_dir}/final_review.md"
final_log="${run_dir}/final_review.log"

final_prompt=$(cat <<EOF
You are the Reviewer agent (post-implementation).
Task: ${task}

Rules:
- Do NOT modify files.
- Review what changed, flag regressions, missing docs, and verification gaps.
- Recommend follow-ups.
EOF
)

echo "nowiswhen: running Final Reviewer"
(
  printf '%s' "$final_prompt" | codex "${oss_args[@]}" -a never exec -s read-only "${model_args[@]}" -o "$final_out" -
) &> "$final_log"

echo "nowiswhen: completed. Outputs in ${run_dir}"
