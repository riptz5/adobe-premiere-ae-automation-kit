# Fixed Rule: MULTIAGENT FROM MOMENT ZERO

This repo follows a hard rule: **never start work with a single agent**.

## Default workflow (recommended)

1) Run a parallel trio (Planner + Implementer + Reviewer) from the first second:

```bash
./scripts/run_codex_trio.sh -p "Describe the task" -- --oss --local-provider ollama
```

- Outputs go to `.codex-agents/<timestamp>/` (see `.codex-agents/*.{md,log}`).
- Keep the Implementer sandbox as `read-only` until you’re ready to apply changes.

2) If you want a “handoff” flow (Planner + Reviewer → Implementer consumes both):

```bash
./scripts/nowiswhen.sh --task "Describe the task" --implement --final-review
```

## Rules of engagement

- No secrets in commits or agent logs (use `.env`, never track it).
- Prefer minimal, auditable changes; avoid new dependencies unless required.
- Keep API identifiers/routes in English (code + endpoints), docs can be Spanish.
