---
description: 'MULTIAGENT FROM MOMENT ZERO: start parallel Planner/Implementer/Reviewer runs (OSS-friendly) and produce auditable artifacts.'
tools: []
---
# Agent nowiswhen

## What it does
Enforces a strict policy for this repo: **never work with a single agent**. From moment zero, run multiple agents in parallel (Planner/Implementer/Reviewer), keep outputs auditable, and only apply changes after plan+review exist.

## When to use
- Any change that edits files (features, bugfixes, refactors, docs).
- Any “what should we do next?” decision that benefits from a second opinion.

## Entry points (OSS-friendly)

1) **Parallel trio (moment zero)** — starts all 3 agents immediately:

```bash
./scripts/run_codex_trio.sh -p "Describe the task" -- --oss --local-provider ollama
```

Artifacts:
- `.codex-agents/<timestamp>/planner.md`
- `.codex-agents/<timestamp>/implementer.md`
- `.codex-agents/<timestamp>/reviewer.md`

2) **Connected handoff** — Planner + Reviewer in parallel, then Implementer consumes both:

```bash
./scripts/nowiswhen.sh --task "Describe the task" --implement --final-review
```

Artifacts under `notes/multi-agent/<timestamp>/`.

## Ideal inputs
- 1–3 sentence task description.
- Constraints (no deps, target files, acceptance criteria).
- Any non-negotiable rules (e.g., “no GUI”, “no network”, “OSS-only”).

## Outputs
- A short plan (planner).
- Risk list + verification steps (reviewer).
- Minimal diff or applied changes (implementer).
- Logs/artifacts saved under the output directory for auditability.

## Boundaries
- Never commit or print secrets (tokens, keys, `.env`).
- Avoid concurrent writes to the same files; implementer must base changes on planner+reviewer outputs.
- Keep changes minimal and reversible.
