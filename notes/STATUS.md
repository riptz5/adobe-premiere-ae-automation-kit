# Estado actual (v1.0.0-local-first)

## Qué está hecho

- **Servidor**: Pipeline STT (whisper.cpp) + LLM (Ollama) → segments, markers, chapters, summary, QA, scene, broll, reframe, music. Watch folders, health extendido, métricas, retry, logging estructurado.
- **Dashboard (vanilla y Next)**: Analizar transcript, crear job (media/transcript), lista y **Kanban** de jobs, **Job Studio** (result, markers, segments, chapters, QA, scenes, broll, reframe, music), paneles **QA** (Download CSV) y **Music Mode**, config con 7 tabs y editor JSON.
- **CEP**: Ping/estado (profile, runMode, autoRun), analizar transcript/media/music, aplicar markers+segments, Job summary por ID, Copy Job ID, Fetch QA markers/Scenes.
- **AE/PS**: Scripts alineados con contratos; docs y ejemplos en `docs/after-effects.md`, `docs/photoshop.md`, `examples/ae/`.
- **OSS**: setup.sh, run_all.sh, check_release.sh, ejemplos shorts/ads/longform, notes/multi-agent/, presets en README.

## Qué queda (fuera de scope v1.0)

Solo lo listado en **notes/master-backlog.md** → "Futuras versiones": B1–B4, validación JSON config, Kanban drag, Frame.io/Stock completos. Para flujo día a día ver **notes/my-ideal-flow.md**.
