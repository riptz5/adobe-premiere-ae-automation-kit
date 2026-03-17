### Master backlog (consolidado de planes previos)

**Estado real** tras implementación del plan cerrar-backlog-autokit. Ítems completados marcados; el resto en "Futuras versiones".

| Etiqueta | Área | Descripción | Estado |
|----------|------|-------------|--------|
| core-pipeline | Core | Contratos de datos alineados con `docs/data-contracts.md`. | ✅ Completado |
| core-pipeline | Core | `runMode`/`autoRun` consistentes (dashboard, watchers, CEP). | ✅ Completado |
| dashboard-ui | Dashboard | UI de configuración (tabs), editor JSON, snapshot `/v1/config`. | ✅ Completado |
| dashboard-ui | Dashboard | Vistas Music Mode, QA (export CSV), Scenes/B-roll. | ✅ Completado |
| premiere-panel | Premiere | CEP alineado con markers/segments/chapters/qa/scenes/broll/reframe/music; UX perfil/estado. | ✅ Completado |
| after-effects | AE | Scripts AE con markers/segments; doc y ejemplos. | ✅ Completado |
| photoshop | PS | `apply_summary.jsx` con result.summary/highlights; doc. | ✅ Completado |
| music-mode | Music | Music Mode (server + waveform/spectrogram), vistas dashboard/CEP. | ✅ Completado |
| qa | QA | QA en dashboard con export CSV; panel dedicado. | ✅ Completado |
| oss-product | OSS | setup.sh, run_all.sh mejorado, ejemplos shorts/ads/longform. | ✅ Completado |
| multiagent-tooling | Proceso | run_codex_trio/nowiswhen en README; presets; notes/multi-agent/. | ✅ Completado |

---

### Futuras versiones (fuera de scope v1.0.0-local-first)

- **Highlight reels** (B1): endpoint `/v1/jobs/:id/highlight-segments` y doc en `notes/highlight-reels.md`.
- **Text-based editing** (B2): endpoint `/v1/jobs/:id/text-edit` para instrucciones keep/remove por label.
- **B-roll contextual** (B3): mejorar `/v1/broll/suggest` con contexto job (summary, chapters).
- **Perfil Trailer/Teaser** (B4): perfil `trailer`/`teaser` en config.
- **Validación JSON** en editor de config (lint + esquema AutokitConfig) y diff antes/después al guardar.
- **Drag-and-drop** en vista Kanban para cambiar estado de jobs (requiere PATCH/API de estado).
- **Frame.io / Adobe Stock** integraciones completas (actualmente placeholders en config).
