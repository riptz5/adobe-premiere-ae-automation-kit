# Master Backlog (consolidado)

> Última actualización: 2026-03-17  
> Fuentes consolidadas: `notes/issues.md`, `docs/capcut-parity.md`, `docs/vision-beyond-capcut.md`, `notes/ideas-18-selected.md`, `notes/AUDIT-BACKLOGS-AND-DOCS.md`, `notes/roadmap.md`

---

## v1.0.0-local-first — COMPLETADO

| Etiqueta | Área | Descripción | Estado |
|----------|------|-------------|--------|
| core-pipeline | Core | Contratos de datos alineados con `docs/data-contracts.md`. | ✅ |
| core-pipeline | Core | `runMode`/`autoRun` consistentes (dashboard, watchers, CEP). | ✅ |
| dashboard-ui | Dashboard | UI de configuración (tabs), editor JSON, snapshot `/v1/config`. | ✅ |
| dashboard-ui | Dashboard | Vistas Music Mode, QA (export CSV), Scenes/B-roll. Kanban + Job Studio. | ✅ |
| premiere-panel | Premiere | CEP alineado con markers/segments/chapters/qa/scenes/broll/reframe/music; UX perfil/estado. | ✅ |
| after-effects | AE | Scripts AE con markers/segments; doc y ejemplos. | ✅ |
| photoshop | PS | `apply_summary.jsx` con result.summary/highlights; doc. | ✅ |
| music-mode | Music | Music Mode (server + waveform/spectrogram), vistas dashboard/CEP. | ✅ |
| qa | QA | QA en dashboard con export CSV; panel dedicado. | ✅ |
| oss-product | OSS | setup.sh, run_all.sh mejorado, ejemplos shorts/ads/longform. | ✅ |
| multiagent-tooling | Proceso | run_codex_trio/nowiswhen en README; presets; notes/multi-agent/. | ✅ |
| agent | Agente | Panel Agent en dashboard (vanilla + Next) con comandos y chat LLM. | ✅ |
| frontend-parity | Frontend | Todos los endpoints backend cubiertos en ambos dashboards (auditoría §2). | ✅ |

**Evidencias**: `notes/release-checklist.completed.md`  
**Issues P0–P4**: Todos cerrados (ver `notes/issues.md`)

---

## Futuras versiones — Backlog consolidado

### Prioridad 1: Features core diferidos (B1–B4)

| ID | Feature | Descripción | Componentes |
|----|---------|-------------|-------------|
| B1 | Highlight reels | Endpoint `/v1/jobs/:id/highlight-segments`; generar cortes tipo highlights sin edición manual. | Server, Dashboard, CEP, AE |
| B2 | Text-based editing | Endpoint `/v1/jobs/:id/text-edit`; instrucciones keep/remove por label; scenes + text-edit. | Server, CEP |
| B3 | B-roll contextual | Mejorar `/v1/broll/suggest` con contexto job (summary, chapters); ranking por relevancia. | Server, Dashboard |
| B4 | Perfil Trailer/Teaser | Perfil `trailer`/`teaser` en `config/profiles/` con highlights agresivos y music mode tuned. | Config, Server, Dashboard |

### Prioridad 2: Mejoras de producto

| ID | Feature | Descripción | Componentes |
|----|---------|-------------|-------------|
| P2-1 | Validación JSON config | Lint + esquema AutokitConfig en editor de config; diff antes/después al guardar. | Dashboard |
| P2-2 | Drag-and-drop Kanban | Cambiar estado de jobs arrastrando (requiere PATCH/API de estado). | Dashboard, Server |
| P2-3 | Frame.io completo | Subir secuencia/proxy, crear review link, bajar comentarios a markers. | Server, Script |
| P2-4 | Adobe Stock completo | Búsqueda desde UI/agente e inserción en timeline o bin. | Config, Server, Dashboard |
| P2-5 | Quitar fillers (um, uh) | Paso explícito "remove fillers" en pipeline y opción en UI. | Server, Dashboard |
| P2-6 | Denoise en UI | Exponer `audio.denoise` como opción en dashboard y perfiles. | Dashboard |
| P2-7 | Export presets por red | UI "Export for YouTube/Instagram/TikTok" con resolución/ratio/codec por destino. | Dashboard, Server |
| P2-8 | Export solo audio | Endpoint/script "export audio only" desde job. | Server |
| P2-9 | Agente conversacional | Chat con LLM que entienda lenguaje natural y decida qué API llamar (no solo comandos). | Server, Dashboard |

### Prioridad 3: Paridad CapCut (ítems pendientes de `docs/capcut-parity.md`)

| ID | Feature | Descripción | Componentes |
|----|---------|-------------|-------------|
| CP-1 | Subtítulos bilingües | Segundo idioma en análisis (LLM o servicio traducción) y segundo track de texto. | Server, AE/Premiere |
| CP-2 | Text-to-speech (TTS) | Integrar TTS (OpenAI/ElevenLabs/local); salida a pista de audio. | Server |
| CP-3 | Voces custom / clonar voz | TTS con voz personalizada (API o modelo local). | Server |
| CP-4 | Voice enhance dedicado | Plugin o API de mejora de voz más allá de normalize+denoise. | Server |
| CP-5 | Biblioteca SFX | Biblioteca de efectos de sonido con búsqueda/etiquetas y enlace a pista. | Server, Dashboard |
| CP-6 | Catálogo de templates | Galería de plantillas (MOGRT/perfiles) con preview en dashboard. | Dashboard |
| CP-7 | Remove background (IA) | API o modelo local para máscara/alpha; AE/PS importan resultado. | Server, AE/PS |
| CP-8 | Upscale video | Integrar Real-ESRGAN o API; opción en export o pre-render. | Server |
| CP-9 | Video desde texto (generativa) | Integrar generación (Runway, etc.); salida a proyecto. | Server |
| CP-10 | Imagen desde texto | API imagen (OpenAI, etc.); salida a AE/PS o carpeta assets. | Server |
| CP-11 | Avatares / fotos que hablan | Servicio tipo D-ID; salida video para timeline. | Server |
| CP-12 | Generar guion desde IA | "Generar guion" y "descripción para redes" desde transcript. | Server, Dashboard |

### Prioridad 4: Visión pro (de `docs/vision-beyond-capcut.md`)

| ID | Feature | Descripción | Componentes |
|----|---------|-------------|-------------|
| VP-1 | Multi-cam script | Script que monte multicam desde lista de fuentes + sync por timecode/audio. | Premiere, Script |
| VP-2 | MOGRT params desde servidor | Servidor o agente rellene parámetros MOGRT desde transcript/metadata. | Server, AE/Premiere |
| VP-3 | Keyframes desde datos | Generar keyframes (posición, opacity, scale) desde beats/chapters/segmentos. | AE, Server |
| VP-4 | LUT por perfil | Aplicar LUT o preset de color por perfil/job desde servidor. | Premiere, Server |
| VP-5 | Broadcast-safe | Límites de saturación/luminancia y presets de export por estándar. | Server, Premiere |
| VP-6 | Ducker música/voz | Reglas "bajar música cuando hay voz" desde detección de voz. | Premiere, Server |
| VP-7 | Reglas watch por carpeta | Más reglas de watch folders (perfil por carpeta, prioridad). | Server |
| VP-8 | Cola con prioridad | Cola explícita de jobs con orden y límite de paralelo. | Server |
| VP-9 | Runbooks por entrega | "Runbook" por tipo (ej. "short para TikTok": ingest → STT → markers → reframe → export). | Scripts, Docs |
| VP-10 | Validación post-export | Analizar archivo exportado (duración, loudness, resolución) y reportar. | Server |
| VP-11 | Nomenclatura estándar | Convención nombre_proyecto_v1_YYYYMMDD y logs por versión. | Server |
| VP-12 | OpenAPI docs | Versionado y documentación OpenAPI para la API REST. | Server, Docs |
| VP-13 | Validación Zod + tests CI | Validación de contratos con Zod en servidor y tests de contrato en CI. | Server |
| VP-14 | Colaboración multi-usuario | Sync de proyecto, locks, o cola compartida (hoy single-tenant local). | Server |

### Backlog opcional: Ideas no seleccionadas (de `notes/ideas-18-selected.md`)

| ID | Idea | Descripción | Componentes |
|----|------|-------------|-------------|
| A6 | Wizard primer uso | Ayude a generar `config/local.json` con defaults recomendados. | Dashboard |
| A7 | Atajos de teclado | Atajos básicos en dashboard (crear job, refrescar, abrir último). | Dashboard |
| B6 | Modo Podcast video | Layout para cortes de silencios largos + QA marcado. | Server, CEP |
| B7 | Subtítulos externos | Hook/documentación para servicios de subtítulos externos. | Docs, Scripts |
| C5 | Export logs/QA zip | Descargar zip con logs y QA de un job para debug. | Server, Dashboard |
| C6 | maxConcurrentJobs | Throttling configurable para paralelo sin saturar máquina. | Server, Config |
| D4 | Batch multiagente | Script para varios análisis batch usando multiagente como supervisor. | Scripts, Server |
| D6 | Tests desde codex trio | Pruebas automatizadas disparadas como paso post-implementer. | Scripts |
| E3 | NPM CLI (`autokit-cli`) | Paquete CLI que envuelva endpoints (`analyze`, `job`, `music`). | Server/CLI |
| E6 | Templates issue/PR | Plantilla de issue/PR en `.github/` adaptada al repo. | .github |

---

## Cómo usar este backlog

1. **Para la próxima versión**: elegir ítems de P1 y P2 como scope.
2. **Para paridad CapCut**: trabajar los CP-* según impacto en UX.
3. **Para crecer el producto**: VP-* definen el techo profesional.
4. **Backlog opcional**: implementar cuando haya tiempo o contribuciones externas.
5. **Cada ítem baja a un issue** con componentes, criterios de aceptación y tests.

**Referencias**:
- Paridad CapCut detallada: `docs/capcut-parity.md`
- Visión pro detallada: `docs/vision-beyond-capcut.md`
- Diseño por idea: `notes/ideas-18-selected.md`
- Plan de implementación: `docs/implementation-plan.md`
- Roadmap técnico: `notes/roadmap.md`
