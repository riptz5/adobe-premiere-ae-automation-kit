# Más allá de CapCut — lo que el motor nos exige

**CapCut es el MÍNIMO** (ver `docs/capcut-parity.md`). Tenemos **Premiere Pro**, **After Effects**, **Photoshop** y un **servidor de orquestación** con STT, LLM, QA, escenas, música, B-roll y reframe. Eso no es un "CapCut con otro nombre": es un pipeline de **postproducción profesional** que puede automatizarse. Lo siguiente es el **mínimo que debemos aspirar** por encima de la paridad CapCut.

---

## 1. Timeline y edición de nivel pro

| Capacidad | Dónde | Estado / meta |
|-----------|--------|----------------|
| **Pistas ilimitadas (no 50)** | Premiere | Nativo. CEP/scripts pueden crear y ordenar pistas desde datos del servidor. |
| **Secuencias anidadas** | Premiere | Nativo. Pipeline puede definir "subproyectos" por segmento o capítulo. |
| **Marcadores con datos (chapters, segments, QA)** | Premiere + CEP | Hecho: JSON → markers. Meta: markers con payload (duración, tipo, comentario) para cortes automáticos. |
| **Edición basada en transcript** | Servidor + CEP | Hecho: segments/markers. Meta: "cortar por frase", "quitar silencios", "alinear a beats" desde un solo flujo. |
| **Multi-cámara (4/9 cámaras)** | Premiere | Nativo. Meta: script que monte multicam desde lista de fuentes + sync por timecode o audio. |
| **Proxy/optimized media** | Premiere | Nativo. Meta: reglas desde perfil (resolución proxy por tipo de job). |

## 2. Motion graphics y VFX (lo que CapCut no tiene a este nivel)

| Capacidad | Dónde | Estado / meta |
|-----------|--------|----------------|
| **Composiciones AE data-driven** | AE + ExtendScript | Hecho: `generate_from_csv.jsx`, markers desde JSON. Meta: cualquier comp parametrizable por CSV/JSON (títulos, lower thirds, listados). |
| **MOGRT con parámetros** | Premiere + AE | Nativo. Meta: servidor o agente que rellene parámetros MOGRT desde transcript o metadata. |
| **Expresiones y keyframes desde datos** | AE | Nativo. Meta: generar keyframes (posición, opacity, scale) desde beats, chapters o segmentos. |
| **Máscaras y tracking** | AE/Premiere | Nativo. Meta: remove background / rotoscopia vía API o script que exporte alpha y lo importe. |
| **Partículas y efectos 3D** | AE | Nativo. Pipeline puede disparar renders por lote con distintos parámetros. |

## 3. Color y luz (broadcast y cine)

| Capacidad | Dónde | Estado / meta |
|-----------|--------|----------------|
| **Lumetri completo (wheels, curves, HSL)** | Premiere | Nativo. Meta: aplicar LUT o preset por perfil/job desde servidor. |
| **Scopes (waveform, vectorscope, parade)** | Premiere | Nativo. QA del servidor puede complementar (loudness, black); no reemplaza scopes en NLE. |
| **Broadcast-safe / legalización** | Premiere + servidor | Parcial: loudness en QA. Meta: límites de saturación/luminancia y presets de export por estándar. |
| **Consistencia entre clips** | Premiere | Nativo. Meta: "match color" o LUT sugerida por servidor según análisis de frame. |

## 4. Audio profesional

| Capacidad | Dónde | Estado / meta |
|-----------|--------|----------------|
| **Normalización a estándar (LUFS, true peak)** | Servidor + Premiere | Hecho: `POST /v1/audio/normalize`. Meta: opción en pipeline por job y perfil. |
| **Multicanal (5.1, ambisonics)** | Premiere/AE | Nativo. Meta: perfiles de export por canal. |
| **Ducker y mezcla por pista** | Premiere | Nativo. Meta: reglas "bajar música cuando hay voz" desde detección de voz (STT/segmentos). |
| **Detección de beats → cortes/transiciones** | Servidor + Premiere/AE | Hecho: music mode (beats, sections, drops). Meta: aplicar cortes o transiciones en tiempos de beat desde JSON. |
| **TTS y voces custom** | Por hacer | Integrar TTS; salida a pista. Premiere/AE importan el archivo. |

## 5. Batch, automatización y flujos

| Capacidad | Dónde | Estado / meta |
|-----------|--------|----------------|
| **Watch folders (auto-ingest)** | Servidor | Hecho: media y transcript crean jobs. Meta: más reglas (perfil por carpeta, prioridad). |
| **Cola de jobs con prioridad y reintentos** | Servidor | Hecho: jobs, retry, status. Meta: cola explícita (orden, límite de paralelo). |
| **Perfiles por tipo (shorts, ads, longform, docu)** | Servidor | Hecho: config/profiles. Meta: UI de perfiles y "aplicar a job" desde dashboard/agente. |
| **Scriptable de punta a punta** | API + CEP + ExtendScript | Hecho: REST, CEP, .jsx. Meta: un "runbook" por tipo de entrega (ej. "short para TikTok": ingest → STT → markers → reframe → export). |
| **Agente en lenguaje natural** | Servidor + dashboard | Hecho: agente LLM que ejecuta acciones. Meta: que cubra el 100% de acciones (config, perfiles, jobs, QA, music, b-roll, etc.). |

## 6. Control de calidad y entrega

| Capacidad | Dónde | Estado / meta |
|-----------|--------|----------------|
| **QA automático (silencio, negro, loudness, spectral)** | Servidor | Hecho: `POST /v1/qa/analyze`, markers, CSV. Meta: bloqueo de export si no pasa QC (opcional por perfil). |
| **Múltiples entregas por proyecto** | Premiere + servidor | Nativo: varias secuencias/export. Meta: "export for YouTube + Instagram + TikTok" en un clic con ratios y codecs por destino. |
| **Validación post-export** | Servidor / script | Parcial: QA sobre fuente. Meta: analizar el archivo exportado (duración, loudness, resolución) y reportar. |
| **Nomenclatura y versionado** | Servidor + paths | Parcial: outputs con nombre. Meta: convención estándar (nombre_proyecto_v1_YYYYMMDD) y logs por versión. |

## 7. Integraciones y ecosistema

| Capacidad | Dónde | Estado / meta |
|-----------|--------|----------------|
| **Frame.io (revisión y aprobación)** | Script / API | Parcial: ejemplo de subida. Meta: subir secuencia o proxy, crear review link, y opcionalmente bajar comentarios a markers. |
| **Adobe Stock (búsqueda e inserción)** | Config + script | Parcial: config. Meta: búsqueda desde UI/agente e inserción en timeline o bin. |
| **APIs propias (API Mesh)** | Config | Parcial: config. Meta: endpoints que llamen a sistemas internos (MAM, PAM, emisión). |
| **Colaboración (multi-usuario)** | Por hacer | Opcional: sync de proyecto, locks, o cola compartida; hoy el servidor es single-tenant local. |

## 8. IA que impulsa herramientas pro (no solo "efectos mágicos")

| Capacidad | Dónde | Estado / meta |
|-----------|--------|----------------|
| **Transcript → estructura (chapters, segments, highlights)** | Servidor | Hecho: LLM/heurística. Meta: más perfiles (podcast, entrevista, publicidad) y opción "quitar fillers". |
| **Sugerencia de B-roll por contexto** | Servidor | Hecho: `POST /v1/broll/suggest`. Meta: ranking por relevancia y duración sugerida por segmento. |
| **Detección de escenas → cortes sugeridos** | Servidor | Hecho: scene detect. Meta: aplicar cortes en Premiere desde JSON (CEP o script). |
| **Música → beats/sections para edición** | Servidor | Hecho: music mode. Meta: transiciones o cortes automáticos en tiempos de drop/section. |
| **Reframe automático (9:16, 1:1, etc.)** | Servidor | Hecho: reframe. Meta: múltiples ratios en un job y enlace a secuencia. |
| **Resumen y guion desde IA** | Servidor | Parcial: summary. Meta: "generar guion" y "generar descripción para redes" desde el mismo transcript. |
| **Remove background / upscale / generación** | Por hacer | Integrar APIs o modelos; salida a AE/PS o bin. |

## 9. Local, extensible y sin vendor lock-in

| Capacidad | Dónde | Estado / meta |
|-----------|--------|----------------|
| **Todo on-prem o local** | Servidor + Adobe | Hecho: servidor, whisper, Ollama. No dependemos de "cloud de CapCut". |
| **STT y LLM intercambiables** | Config | Hecho: engine/model en config. Meta: más proveedores (OpenAI, Azure, local) sin cambiar flujo. |
| **CEP y ExtendScript** | Premiere / AE / PS | Hecho: panel CEP, .jsx. Meta: más acciones desde panel (aplicar LUT, crear secuencia desde perfil). |
| **API REST estable** | Servidor | Hecho: /v1/*. Meta: versionado y documentación OpenAPI. |
| **Contratos de datos (JSON)** | docs/data-contracts.md | Hecho. Meta: validación en servidor (Zod) y tests de contrato en CI. |

---

## Resumen: piso y techo

- **Piso**: todo lo de `docs/capcut-parity.md` (paridad CapCut) implementado y sin huecos.
- **Techo**: todo lo de este documento (timeline pro, motion/VFX, color, audio pro, batch, QC, integraciones, IA que drive Premiere/AE/PS, local y extensible). No es opcional "algún día": es lo que el motor permite y **lo que debemos exigirnos como producto**.
