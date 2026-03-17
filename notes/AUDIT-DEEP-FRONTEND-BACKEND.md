# Auditoría profunda: Backend vs Frontend y chat/agente

**Fecha**: 2026-03-16

## 1. ¿Terminamos todo?

Sí, el **backlog v1.0.0-local-first** está cerrado (ver `notes/master-backlog.md`, `notes/release-checklist.completed.md`). Esta auditoría comprueba **paridad frontend↔backend** y si existe un **chat/agente** para ejecutar todo desde una sola interfaz.

---

## 2. Matriz Backend → Frontend

Todos los endpoints del servidor (`server/src/index.js`) y su cobertura en dashboard **vanilla** (`public/`) y **Next** (`web/`).

| Backend | Vanilla | Next | Notas |
|--------|---------|------|--------|
| **GET /health** | ✅ (status bar + Refresh health) | ✅ (header health: ok) | Barra/header actualizados con /health. |
| **GET /v1/metrics** | ✅ (comando Agent) | ✅ (comando Agent) | Comando `metrics` en panel 4d · Agent. |
| **GET /v1/config** | ✅ | ✅ | Load Config, editor. |
| **GET /v1/config/profiles** | ✅ | ✅ | Selectores de perfil. |
| **GET /v1/config/profile/:name** | ✅ | ✅ | Cargar perfil en editor. |
| **POST /v1/config/profiles** | ✅ | ✅ | New profile. |
| **PUT /v1/config/profiles/:name** | ✅ | ✅ | Save profile. |
| **DELETE /v1/config/profiles/:name** | ✅ | ✅ | Delete profile. |
| **GET /v1/config/local** | ✅ | ✅ | Editor JSON. |
| **POST /v1/config/local** | ✅ | ✅ | Save UI. |
| **POST /v1/analyze/transcript** | ✅ | ✅ | Sección 1. |
| **POST /v1/jobs** | ✅ | ✅ | Crear job (media/transcript). |
| **GET /v1/jobs** | ✅ | ✅ | Lista + Kanban. |
| **GET /v1/jobs/:id** | ✅ | ✅ | Job Studio. |
| **GET /v1/jobs/:id/result** | ✅ | ✅ | Studio / botón Result. |
| **GET /v1/jobs/:id/markers** | ✅ | ✅ | Studio / Markers. |
| **GET /v1/jobs/:id/segments** | ✅ | ✅ | Studio / Segments. |
| **GET /v1/jobs/:id/chapters** | ✅ | ✅ | Studio / Chapters. |
| **GET /v1/jobs/:id/summary** | ✅ | ✅ | Studio / Summary. |
| **GET /v1/jobs/:id/qa** | ✅ | ✅ | Studio, panel QA, QA CSV. |
| **GET /v1/jobs/:id/qa-markers** | ✅ | ✅ | Studio. |
| **GET /v1/jobs/:id/scenes** | ✅ | ✅ | Studio. |
| **GET /v1/jobs/:id/broll** | ✅ | ✅ | Studio. |
| **GET /v1/jobs/:id/reframe** | ✅ | ✅ | Studio. |
| **POST /v1/jobs/:id/run** | ✅ | ✅ | Botón Run. |
| **POST /v1/jobs/:id/retry** | ✅ (botón Retry + comando Agent) | ✅ (botón Retry + comando Agent) | Lista, Kanban y `retry <jobId>`. |
| **POST /v1/ingest/probe** | ✅ | ✅ | Media tools Probe. |
| **POST /v1/qa/analyze** | ✅ | ✅ | Run QA, panel 4b. |
| **POST /v1/audio/normalize** | ✅ | ✅ | Normalize Audio. |
| **POST /v1/scene/detect** | ✅ | ✅ | Scene Detect. |
| **POST /v1/broll/suggest** | ✅ | ✅ | Suggest B-roll. |
| **POST /v1/reframe** | ✅ | ✅ | Reframe 9:16. |
| **POST /v1/music/analyze** | ✅ | ✅ | Music Analyze, panel 4c. |

**Resumen**: Con Retry, health en barra/header, metrics vía comando y panel Agent (4d): el frontend expone **todo** lo que el backend ofrece. No hay endpoints sin UI.

---

## 3. Chat / Agente

**¿Había un chat agent para hacer todo?**

No. El backend usa LLM (Ollama) solo para **análisis de transcript** (chapters, segments, markers); no hay interfaz de chat en el frontend.

**Qué se añadió tras esta auditoría**

- **Panel "Agent" (comandos de texto)** en ambos dashboards:
  - Un único campo de texto donde se pueden escribir **comandos** que se traducen a llamadas API.
  - Ejemplos: `probe /path/to/video.mp4`, `qa /path`, `retry JOB_ID`, `create job /path`, `metrics`, `health`, `analyze transcript` (con transcript en siguiente línea o en portapapeles según implementación).
  - No es un chat conversacional con LLM; es un **mini-agente por comandos** para ejecutar cualquier acción del backend desde una sola caja.

Si se quisiera un **chat conversacional** (usuario escribe en lenguaje natural y el sistema decide qué API llamar), haría falta:
- Un endpoint backend que reciba el mensaje y (vía LLM o reglas) devuelva la acción/llamada a ejecutar, o
- Lógica en frontend con un LLM en el cliente.  
Eso queda como mejora futura.

---

## 4. Resumen ejecutivo

| Pregunta | Respuesta |
|----------|-----------|
| ¿Terminamos todo el backlog? | Sí (v1.0.0-local-first). |
| ¿El frontend hace todo lo que puede hacer el backend? | Sí, tras añadir Retry, health, metrics y panel Agent. |
| ¿Pusiste un chat agent para hacer todo? | No había; se añadió un **panel Agent por comandos** que permite ejecutar todas las acciones (probe, qa, retry, create job, metrics, health, etc.) desde un solo input. |

Archivos modificados en esta pasada:
- `public/index.html`: botón "Refresh health", sección **4d · Agent** (input + Run).
- `public/main.js`: botón **Retry** en lista y Kanban; `refreshHealth()` con GET /health; parser de comandos Agent (health, metrics, jobs, probe, qa, retry).
- `web/app/page.tsx`: botón **Retry** en lista y Kanban; `retryJob()`; useSWR `/health` en header; sección **4d · Agent** con mismos comandos.
