# Estado actual (v1.0.0-local-first)

> Última actualización: 2026-03-17

## Resumen

**v1.0.0-local-first está completo.** Todo el backlog P0–P4 cerrado. Paridad frontend↔backend confirmada por auditoría. Panel Agent añadido en ambos dashboards.

---

## Qué está hecho

- **Servidor**: Pipeline STT (whisper.cpp) + LLM (Ollama) → segments, markers, chapters, summary, QA, scene, broll, reframe, music. Watch folders, health extendido, métricas, retry, logging estructurado. Agente LLM (`/v1/agent/chat`).
- **Dashboard (vanilla + Next)**: Kanban de jobs, Job Studio (result, markers, segments, chapters, QA, scenes, broll, reframe, music), paneles QA (Download CSV), Music Mode, Config UI (7 tabs + editor JSON), panel Agent. Retry, health en barra.
- **CEP**: Ping/estado (profile, runMode, autoRun), analizar transcript/media/music, aplicar markers+segments, Job summary, QA markers, Scenes.
- **AE/PS**: Scripts alineados con contratos; docs y ejemplos en `docs/after-effects.md`, `docs/photoshop.md`, `examples/ae/`.
- **OSS**: setup.sh, run_all.sh, check_release.sh, go.sh, ejemplos shorts/ads/longform, multi-agent docs.

## Qué queda (futuras versiones)

Ver **`notes/master-backlog.md`** — backlog consolidado con prioridades:

| Prioridad | Qué incluye | Cantidad |
|-----------|-------------|----------|
| **P1** | Features core diferidos (B1–B4: highlight reels, text-edit, b-roll contextual, trailer/teaser). | 4 ítems |
| **P2** | Mejoras de producto (validación JSON, drag Kanban, Frame.io/Stock, quitar fillers, denoise UI, export presets, agente conversacional). | 9 ítems |
| **P3** | Paridad CapCut pendiente (TTS, subtítulos bilingües, remove background, upscale, generativa, templates). | 12 ítems |
| **P4** | Visión pro (multi-cam, MOGRT params, keyframes, LUT, broadcast-safe, OpenAPI, Zod, cola prioridad). | 14 ítems |
| **Opcional** | Ideas no seleccionadas (wizard, atajos, podcast mode, CLI, templates issue/PR). | 10 ítems |

## Referencias clave

- Backlog consolidado: `notes/master-backlog.md`
- Flujo día a día: `notes/my-ideal-flow.md`
- Release checklist con evidencias: `notes/release-checklist.completed.md`
- Auditoría backlogs y docs: `notes/AUDIT-BACKLOGS-AND-DOCS.md`
- Auditoría frontend↔backend: `notes/AUDIT-DEEP-FRONTEND-BACKEND.md`
- Paridad CapCut: `docs/capcut-parity.md`
- Visión pro: `docs/vision-beyond-capcut.md`
- Índice completo de docs: `docs/docs-index.md`
