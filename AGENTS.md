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
- Use GitHub OSS whenever useful: clone, reference, or copy patterns from open-source projects; no need to ask—prefer reusing over reinventing.

## Learned User Preferences

- Use multiagente and multithread from the start; never start work with a single agent.
- Integrate all components so nothing is isolated; every component should talk to the others.
- Avoid reinventing the wheel; reuse or clone from other repos when possible.
- Prefer finishing the product in the current session (as many turns as needed) over long timelines.
- Prefer minimal terminal commands; assume the user wants to paste the least amount of commands.
- Frontend must expose and support everything the backend can do (full parity).
- Run automated or visual tests yourself; do not treat the user as the tester.
- When implementing a plan: follow the plan as specified, do not edit the plan file, mark todos in progress then complete, and do not stop until all todos are done.
- For an in-app agent: it should orchestrate, understand natural language, and do everything the backend can do without exceptions.

## Learned Workspace Facts

- API identifiers and routes are in English; documentation may be in Spanish.
- Default LLM is Ollama (e.g. llama3:8b); config in `config/default.json` and `config/local.json`.
- Dashboard vanilla is in `public/` and served at http://localhost:8787 when the server runs; Next.js dashboard is in `web/`.

## Cursor Cloud specific instructions

### Services overview

| Service | Dir | Port | Start command |
|---|---|---|---|
| Express API + vanilla dashboard | `server/` | 8787 | `cd server && npm run dev` |
| Next.js dashboard | `web/` | 3000 | `cd web && npm run dev` |

### Running tests and lint

- **Server tests:** `cd server && npm test` (syntax-checks core modules + runs contract smoke tests)
- **Next.js lint:** `cd web && npm run lint`

### Gotchas

- The `web/` directory ships without `.eslintrc.json`. Running `next lint` for the first time prompts interactively. Create `web/.eslintrc.json` with `{"extends":"next/core-web-vitals"}` to make it non-interactive.
- LLM features require Ollama running at `localhost:11434`; without it the server still works fine — transcript analysis falls back to heuristics (`useFallbacks: true` in config).
- FFmpeg/FFprobe must be on `$PATH` for QA, music, scene-detect, reframe, and audio normalization features.
- Both `server/` and `web/` use `package-lock.json` — use `npm ci` or `npm install` (not yarn/pnpm).
- The Express server auto-creates `server/data/` directories on first run; these are gitignored.
