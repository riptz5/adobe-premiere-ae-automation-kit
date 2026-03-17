# Índice de documentación

> Última actualización: 2026-03-17  
> Total: 40+ archivos de documentación organizados por categoría.

---

## Raíz del proyecto

| Archivo | Tipo | Resumen | Fuente |
|---------|------|---------|--------|
| `README.md` | Producto | Descripción general, quickstart, endpoints, flujos, multi-agent. | mix |
| `AGENTS.md` | Proceso | Regla "MULTIAGENT FROM MOMENT ZERO" y scripts de agentes. | IA |
| `CONTRIBUTING.md` | Proceso | Guía de contribución y uso de multiagent en el flujo. | mix |
| `SECURITY.md` | Seguridad | Política de seguridad y reporte de vulnerabilidades. | humano |
| `ISSUE_DASHBOARD_ENDPOINTS.md` | Issue (obsoleto) | Problema de routing dashboard; **obsoleto** — el dashboard actual no usa `/v1/dashboard/*`. | IA |

---

## docs/ — Arquitectura y diseño

| Archivo | Tipo | Resumen | Fuente |
|---------|------|---------|--------|
| `docs/architecture.md` | Arquitectura | Diagrama y capas del kit (orquestador, UI, Adobe). | IA |
| `docs/data-contracts.md` | Contratos | Job, JobResult, Chapter, Segment, Marker, QA, Music, Scenes, B-roll, Reframe, AutokitConfig. | IA |
| `docs/implementation-plan.md` | Plan | Matriz idea×componente (A1–E5) y 5 fases de implementación. | IA |
| `docs/capcut-parity.md` | Paridad | Checklist de paridad con CapCut por categoría; estado Hecho/Parcial/Por hacer. | IA |
| `docs/vision-beyond-capcut.md` | Visión | Capacidades pro por encima de CapCut (timeline, VFX, color, audio, batch, QC, IA). | IA |
| `docs/after-effects.md` | Integración AE | Contratos markers/segments y uso de scripts AE con el server. | IA |
| `docs/photoshop.md` | Integración PS | Flujo result.json → apply_summary.jsx y contrato JobResult. | IA |
| `docs/docs-index.md` | Índice | Este archivo — índice completo de toda la documentación. | IA |

---

## notes/ — Estado, backlog y diseño de features

### Estado y backlog

| Archivo | Tipo | Resumen | Fuente |
|---------|------|---------|--------|
| `notes/master-backlog.md` | **Backlog principal** | Backlog consolidado: v1.0 completado + futuras versiones por prioridad (P1–P4 + opcional). | IA |
| `notes/STATUS.md` | Estado | Snapshot del estado actual del proyecto v1.0.0-local-first. | IA |
| `notes/issues.md` | Issues | Issues P0–P4 cerrados; referencia a master-backlog para futuro. | IA |
| `notes/roadmap.md` | Roadmap | Roadmap local-first, tracks 0–5, milestones MVP/v1/v1.5. | IA |
| `notes/ideas-18-selected.md` | Ideas | 30 ideas clusterizadas, 18 seleccionadas (A1–E5), diseño por idea. | IA |

### Release y auditoría

| Archivo | Tipo | Resumen | Fuente |
|---------|------|---------|--------|
| `notes/release-checklist.md` | Checklist | Checklist en blanco para verificación manual de v1.0.0-local-first. | IA |
| `notes/release-checklist.completed.md` | Evidencias | Checklist completado con evidencias de verificación. | IA |
| `notes/AUDIT-BACKLOGS-AND-DOCS.md` | Auditoría | Auditoría de backlogs y docs vs código (2026-03-16); follow-ups resueltos. | IA |
| `notes/AUDIT-DEEP-FRONTEND-BACKEND.md` | Auditoría | Auditoría frontend↔backend; paridad confirmada; panel Agent añadido. | IA |

### Diseño de features

| Archivo | Tipo | Resumen | Fuente |
|---------|------|---------|--------|
| `notes/configuration.md` | Diseño | runMode×autoRun, ubicación de config, pantalla completa por secciones. | IA |
| `notes/config-ui.md` | Diseño UI | Tabs General/Ingest/Analyze/Edit/Render/Integrations/Advanced y campos. | IA |
| `notes/music_mode.md` | Feature | Especificación de Music Mode y contratos de datos. | IA |
| `notes/text_based_editing.md` | Feature | Diseño text-based editing basado en transcripts y segments. | IA |
| `notes/agent-orchestrator.md` | Feature | Agente orquestador: modelo LLM, herramientas, cómo probarlo. | IA |
| `notes/my-ideal-flow.md` | Flujo | Flujo de uso día a día (arranque → jobs → Premiere → AE/PS). | IA |
| `notes/qa-sessions.md` | Plantilla | Template para registrar sesiones QA multiagente. | IA |

### Multiagente

| Archivo | Tipo | Resumen | Fuente |
|---------|------|---------|--------|
| `notes/multi-agent-prompts.example.txt` | Referencia | Ejemplos de prompts para scripts multiagente. | IA |

---

## Integraciones Adobe

| Archivo | Tipo | Resumen | Fuente |
|---------|------|---------|--------|
| `after-effects/extendscript/README.md` | AE | Uso de scripts AE y formatos esperados. | humano |
| `after-effects/mogrt/ESSENTIAL_GRAPHICS_NOTES.md` | AE/MOGRT | Notas sobre MOGRTs y Essential Graphics. | humano |
| `photoshop/extendscript/README.md` | PS | Uso del script PS y cómo consume summaries/JSON. | humano |
| `ame/watch-folders.md` | AME | Configurar watch folders de Adobe Media Encoder. | IA |
| `frameio/README.md` | Frame.io | Script de subida a Frame.io y requisitos. | humano |

---

## Ejemplos

| Archivo | Tipo | Resumen | Fuente |
|---------|------|---------|--------|
| `examples/shorts/README.md` | Ejemplo | Flujo shorts con transcript y dashboard. | IA |
| `examples/ads/README.md` | Ejemplo | Flujo ads con transcript y QA CSV. | IA |
| `examples/longform/README.md` | Ejemplo | Flujo longform con transcript y Job Studio. | IA |
| `examples/ae/README.md` | Ejemplo AE | Markers y flujo para apply_markers_from_json.jsx; CSV para generate_from_csv. | IA |
| `examples/media-tools.md` | Referencia | Cómo probar scene detect, b-roll suggest y reframe. | IA |

---

## GitHub y proceso

| Archivo | Tipo | Resumen | Fuente |
|---------|------|---------|--------|
| `.github/agents/Agent nowiswhen.agent.md` | Agente | Definición del agente nowiswhen para flujo multi-agente. | IA |

---

## Archivos gitignored (no en repo, creados en runtime)

| Ruta | Descripción |
|------|-------------|
| `.codex-agents/<timestamp>/` | Output de `scripts/run_codex_trio.sh` (planner, implementer, reviewer). |
| `notes/multi-agent/<timestamp>/` | Output de `scripts/nowiswhen.sh` (sesiones multiagente). |
| `broll/` | Biblioteca de B-roll para sugerencias. |
| `config/local.json` | Overrides locales de configuración. |
| `server/data/` | Jobs, resultados, logs (datos de runtime). |
