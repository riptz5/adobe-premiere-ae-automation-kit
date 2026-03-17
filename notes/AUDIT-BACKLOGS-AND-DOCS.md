# Auditoría: backlogs y documentación del repo

**Fecha**: 2026-03-16  
**Alcance**: Todos los backlogs, docs de diseño y estado del código frente al plan v1.0.0-local-first.

---

## 1. Resumen ejecutivo

| Área | Estado | Notas |
|------|--------|--------|
| Master backlog | ✅ Alineado | Todo lo de v1.0 marcado completado; B1–B4 y mejoras en "Futuras versiones". |
| Release checklist | ⚠️ Dos versiones | `release-checklist.md` con checkboxes vacíos; `release-checklist.completed.md` con evidencias. |
| Implementation plan | ✅ Reflejado | Matriz idea×componente y fases; implementación cubre A1–A5, C1–C4, D/E. |
| Ideas 18 seleccionadas | ✅ Implementadas | A1–A5, B5, C1–C4, D1–D3/D5, E1–E2/E4–E5 en código/docs. B1–B4 en backlog futuro. |
| Documentación (docs-index) | ⚠️ Desactualizado | Faltan `docs/after-effects.md`, `docs/photoshop.md`, `examples/media-tools.md`, `notes/multi-agent/`, `notes/release-checklist.completed.md`. |
| Issues / STATUS | ⚠️ Desfasados | `notes/issues.md` y `notes/STATUS.md` hablan de "qué falta" ya cubierto por el plan cerrado. |
| Código (TODO/PENDING) | ✅ Limpio | No hay TODO/FIXME en .js/.ts (solo match en package-lock). |

---

## 2. Backlogs revisados

### 2.1 `notes/master-backlog.md`

- **Contenido**: Tabla con 11 ítems (core-pipeline, dashboard-ui, premiere-panel, AE, PS, music-mode, qa, oss-product, multiagent-tooling) todos ✅ Completado.
- **Futuras versiones**: B1 (highlight reels), B2 (text-edit), B3 (b-roll contextual), B4 (perfil trailer/teaser), validación JSON config, drag Kanban, Frame.io/Adobe Stock.
- **Cobertura**: Correcta respecto al plan cerrar-backlog-autokit. No hay endpoints `/v1/jobs/:id/highlight-segments` ni `/v1/jobs/:id/text-edit` en el server (coherente con "futuras versiones").

### 2.2 `notes/release-checklist.md`

- **Contenido**: Lista de ítems con `- [ ]` sin marcar.
- **Problema**: No se actualizó in-place; las evidencias están en `notes/release-checklist.completed.md`.
- **Recomendación**: Mantener ambos: el .md como checklist en blanco para quien haga verificación manual; el .completed.md como registro de lo ya verificado en la implementación.

### 2.3 `docs/implementation-plan.md`

- **Contenido**: Matriz idea×componente (A1–E5) y 5 fases de implementación.
- **Cobertura**: Las fases 1–5 están cubiertas por el trabajo realizado (docs, server C1–C4, dashboards A1–A5, CEP, AE/PS, multiagente, setup/examples). B1–B4 en el plan están en "Futuras versiones" en master-backlog.

### 2.4 `notes/ideas-18-selected.md`

- **Contenido**: 30 ideas, 18 seleccionadas, con diseño por idea (A1–E5).
- **Cobertura**: A1–A5 (Kanban, Job Studio, Music panel, QA panel, perfil), C1–C4 (logger, metrics, retry, health), D1–D3/D5 (presets, multi-agent docs), E1–E2/E4–E5 (setup.sh, run_all, examples, checklist). B1–B4 y B5 parcial (B5 = ejemplos en examples/; B1–B4 diferidos).

---

## 3. Documentación revisada

### 3.1 `docs/docs-index.md`

- **Contenido**: Índice de archivos por tipo (Diseño, Proceso, Integración, etc.).
- **Faltan en el índice**: `docs/after-effects.md`, `docs/photoshop.md`, `docs/architecture.md` (sí está), `examples/media-tools.md`, `examples/ae/README.md`, `examples/shorts/README.md`, `examples/ads/README.md`, `examples/longform/README.md`, `notes/multi-agent/README.md`, `notes/release-checklist.completed.md`, `broll/README.md`, `notes/configuration.md` (sí está), `notes/config-ui.md` (sí está).
- **Recomendación**: Actualizar docs-index con los nuevos archivos de docs, examples y notes.

### 3.2 `docs/data-contracts.md`

- **Contenido**: Contratos Job, JobResult, Chapter, Segment, Highlight, Marker, QA, Music, Scenes, B-roll, Reframe, AutokitConfig.
- **Cobertura**: Alineado con server (jobs.js, pipeline.js, qa.js, music.js, scene.js, broll.js, reframe.js). No documenta aún `highlight-segments` ni `text-edit` (endpoints futuros).

### 3.3 `notes/configuration.md`

- **Contenido**: runMode×autoRun (tabla de verdad), ubicación de config, pantalla completa por secciones.
- **Cobertura**: Coherente con `server/src/config.js`, `watch.js`, `index.js`, `pipeline.js`. Referenciado desde README.

### 3.4 `notes/config-ui.md`

- **Contenido**: Tabs General / Ingest / Analyze / Edit / Render / Integrations / Advanced y campos por tab.
- **Cobertura**: El dashboard vanilla (`public/main.js` sections) implementa esas 7 pestañas con campos representativos. No hay validación JSON ni diff antes/después (en "Futuras versiones").

### 3.5 Otros docs

- **README.md**: Quick start, endpoints, dashboard, CEP, multiagent (§8), presets (§8.4). Actualizado.
- **AGENTS.md**: Regla MULTIAGENT FROM MOMENT ZERO. Actualizado.
- **CONTRIBUTING.md**: Existente; no revisado en detalle.
- **notes/roadmap.md**: Tracks 0–5 (Backbone, Ingest, Análisis, Edición, Render, QA/OSS). Documento de visión; no todo implementado (ej. CLIP, MOGRT export).
- **notes/music_mode.md**: Spec de Music Mode. Implementado en server + dashboards + CEP.
- **notes/text_based_editing.md**: Diseño text-based editing. Endpoint `/v1/jobs/:id/text-edit` en backlog futuro.
- **notes/qa-sessions.md**: Plantilla para registrar sesiones QA multiagente. Sin sesiones completadas documentadas.
- **notes/issues.md**: Lista P0–P4 con checkboxes vacíos. Muchos ítems (pipeline, watch, dashboard, CEP, AE, PS, QA, config UI) ya están hechos; el archivo está desfasado respecto al estado actual.
- **notes/STATUS.md**: "Qué se hizo" y "Qué falta"; "Qué falta" incluye puntos ya cubiertos (config UI, QA export CSV, etc.). Desfasado.

---

## 4. Endpoints y código

### 4.1 Server (`server/src/index.js`)

- **GET**: `/health`, `/v1/metrics`, `/v1/config`, `/v1/config/profiles`, `/v1/config/profile/:name`, `/v1/config/local`, `/v1/jobs`, `/v1/jobs/:id`, `/v1/jobs/:id/result`, `markers`, `segments`, `chapters`, `summary`, `qa`, `qa-markers`, `scenes`, `broll`, `reframe`.
- **POST**: `/v1/config/profiles`, `/v1/config/local`, `/v1/analyze/transcript`, `/v1/jobs`, `/v1/jobs/:id/run`, `/v1/jobs/:id/retry`, `/v1/ingest/probe`, `/v1/qa/analyze`, `/v1/audio/normalize`, `/v1/scene/detect`, `/v1/broll/suggest`, `/v1/reframe`, `/v1/music/analyze`.
- **No existen**: `/v1/jobs/:id/highlight-segments`, `/v1/jobs/:id/text-edit` (plan B1/B2 en futuras versiones). No hay rutas `/v1/dashboard/*` (el issue ISSUE_DASHBOARD_ENDPOINTS.md parece referirse a otro diseño o está obsoleto).

### 4.2 Perfiles

- **config/profiles/**: `shorts.json`, `ads.json`, `longform.json`, `docu.json`. Cuatro perfiles existentes; el release checklist menciona shorts, ads, longform, docu. ✅

### 4.3 Dashboards

- **Vanilla** (`public/`): Kanban, Job Studio (overview, result, chapters, segments, markers, qa, scenes, broll, reframe, music), paneles 4b QA (Download CSV) y 4c Music Mode, config con 7 tabs. ✅
- **Next** (`web/app/page.tsx`): Misma funcionalidad (Kanban, Job Studio con music, QA panel con Download CSV, Music panel). ✅

### 4.4 CEP

- **premiere/cep-panel/**: Barra de estado (Server, Profile, runMode, autoRun), Job summary por ID, Copy Job ID, Last job, Fetch QA markers/Scenes, analizar transcript/media/music. ✅

### 4.5 AE / PS

- **AE**: `apply_markers_from_json.jsx` (contrato markers), `generate_from_csv.jsx`; `docs/after-effects.md`, `examples/ae/` con README y markers-sample.json. Falta CSV de ejemplo en examples/ae/ (plan pedía "CSV de prueba").
- **PS**: `apply_summary.jsx` acepta `result.summary` y `result.highlights` (o `payload.result`). `docs/photoshop.md` actualizado. ✅

---

## 5. Discrepancias y recomendaciones

### 5.1 Actualizar índices y estado

1. **docs/docs-index.md**: Añadir filas para `docs/after-effects.md`, `docs/photoshop.md`, `examples/media-tools.md`, `examples/ae/README.md`, `examples/shorts/README.md`, `examples/ads/README.md`, `examples/longform/README.md`, `notes/multi-agent/README.md`, `notes/release-checklist.completed.md`, `broll/README.md`.
2. **notes/issues.md**: Marcar como hechos los ítems P0–P3 ya cubiertos o mover los no hechos a una sección "Backlog opcional" y dejar claro que el estado de producto es el de master-backlog + release-checklist.completed.
3. **notes/STATUS.md**: Actualizar "Qué falta" para que refleje solo lo que realmente falta (B1–B4, validación JSON, etc.) o enlazar a master-backlog "Futuras versiones".

### 5.2 Ejemplo AE CSV

4. **examples/ae/**: Añadir un `example.csv` para `generate_from_csv.jsx` (columnas por ejemplo: profile, compName, title, subtitle, assetPath) y referenciarlo en README.

### 5.3 ISSUE_DASHBOARD_ENDPOINTS.md

5. El dashboard actual no usa `/v1/dashboard/*`. Si ese issue era para una versión antigua o un dashboard distinto, cerrarlo o marcar como "obsoleto / no aplicable al dashboard actual (public + Next con /v1/jobs, /v1/config, etc.)".

### 5.4 notes/my-ideal-flow.md

6. El plan E5 pide "Mi flujo ideal" en docs. No existe `notes/my-ideal-flow.md`. Opcional: crear un doc corto que describa el flujo día a día (run server → dashboard → crear job → Job Studio → CEP / AE / PS).

---

## 6. Checklist de consistencia (post-auditoría)

- [ ] Actualizar `docs/docs-index.md` con los nuevos archivos listados en §5.1.
- [ ] Ajustar `notes/issues.md` y `notes/STATUS.md` para que no contradigan el estado de master-backlog/release-checklist.completed.
- [ ] Añadir `examples/ae/example.csv` y mencionarlo en `examples/ae/README.md`.
- [ ] Resolver o anotar como obsoleto `ISSUE_DASHBOARD_ENDPOINTS.md`.
- [ ] (Opcional) Crear `notes/my-ideal-flow.md` con el flujo recomendado de uso.

---

**Conclusión**: El repo está alineado con el plan cerrar-backlog-autokit y con master-backlog para v1.0.0-local-first. Los backlogs y la mayoría de la documentación son coherentes con el código. Las principales deudas son: índice de docs desactualizado, issues/STATUS desfasados, ejemplo CSV para AE, y aclarar/cerrar el issue de endpoints dashboard.
