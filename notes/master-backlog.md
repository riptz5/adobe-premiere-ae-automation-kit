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
| highlight-reels | OSS/Reaper | `GET /v1/jobs/:id/highlight-segments` + tab Highlights en Job Studio. | ✅ Completado v1.2 |
| text-based-edit | OSS/Reaper | `POST /v1/jobs/:id/text-edit` keep/remove decisions + tab Text-Edit + re-export .rpp. | ✅ Completado v1.2 |
| broll-contextual | B-roll | `suggestBroll` usa summary+chapters como contexto enriquecido. | ✅ Completado v1.2 |
| trailer-profile | Perfiles | Perfil `trailer` en `config/profiles/trailer.json`. | ✅ Completado v1.2 |
| multicam-reaper | OSS/Reaper | `POST /v1/export/reaper/multicam` + `--multicam-media` en adaptador Python. | ✅ Completado v1.2 |

---

### Futuras versiones (fuera de scope v1.2.0)

- **TTS** (texto a voz local o API).
- **Remove background IA** (roto/alpha).
- **Upscale video** (Real-ESRGAN).
- **Estabilización parametrizable** desde servidor.
- **Galería de plantillas** one-click.
- **Validación post-export** (QA sobre archivo exportado).
- **Nomenclatura y versionado estándar**.
- **Drag-and-drop** en vista Kanban (PATCH/API de estado).
- **Validación JSON** en editor de config (lint + esquema + diff).
- **Frame.io / Adobe Stock** integraciones completas (actualmente placeholders en config).
