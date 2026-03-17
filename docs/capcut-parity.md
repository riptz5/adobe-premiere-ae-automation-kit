# Paridad con CapCut (MÍNIMO) + visión más allá

**CapCut = MÍNIMO.** Lo de abajo es paridad 1:1 (que no falte ninguna función de CapCut). El motor (Premiere + AE + Photoshop + servidor) permite **mucho más**: este doc también define el techo que debemos exigirnos.

---

## Resumen por estado

| Estado | Significado |
|--------|-------------|
| **Hecho** | Ya está en el kit (servidor, CEP, AE/PS o pipeline). |
| **Parcial** | Existe parte (API, script o flujo) pero falta UI/unificar. |
| **Por hacer** | Hay que implementarlo; se indica dónde (Premiere/AE/PS/servidor). |

---

## 1. Texto y subtítulos (CapCut: AI captions, plantillas, bilingüe, quitar fillers)

| Función CapCut | Estado | Cómo lo tenemos / haremos |
|----------------|--------|----------------------------|
| **Subtítulos/captions con tiempo** | Hecho | Servidor: transcript → markers/chapters/segments. CEP aplica markers en Premiere. AE: `apply_markers_from_json.jsx`. |
| **Captions generadas por IA (speech-to-text)** | Hecho | STT con whisper.cpp; pipeline genera markers por frase. |
| **Plantillas de caption (estilos)** | Parcial | Datos (timecodes) listos; estilos = MOGRT/grafismos en AE o Premiere (manual o por script). |
| **Subtítulos bilingües** | Por hacer | Añadir segundo idioma en análisis (LLM o servicio traducción) y segundo track de texto. |
| **Quitar fillers (um, uh)** | Parcial | LLM puede limpiar transcript; falta paso explícito “remove fillers” en pipeline y opción en UI. |
| **Texto overlay / títulos** | Hecho | Premiere/AE: títulos nativos; markers/JSON pueden drive contenido. Photoshop: texto en capas. |

---

## 2. Audio (CapCut: TTS, voces, mejorar voz, reducir ruido, normalizar)

| Función CapCut | Estado | Cómo lo tenemos / haremos |
|----------------|--------|----------------------------|
| **Normalizar loudness** | Hecho | `POST /v1/audio/normalize` (FFmpeg); pipeline y dashboard. |
| **Reducir ruido** | Parcial | Config `audio.denoise` en servidor; FFmpeg. Exponer en UI y perfiles. |
| **Text-to-speech** | Por hacer | Integrar TTS (OpenAI/elevenlabs/local) y salida a pista de audio; AE/Premiere pueden importar. |
| **Voces personalizadas / clonar voz** | Por hacer | TTS con voz custom (API o modelo local); mismo flujo que TTS. |
| **Mejorar voz (enhance)** | Parcial | Normalize + denoise; falta “voice enhance” dedicado (plugin o API). |
| **Volumen, fade in/out** | Hecho | Premiere/AE: nativo. Servidor puede generar puntos de keyframe si se define contrato. |
| **Extraer audio de video** | Hecho | FFmpeg en pipeline; probe/QA. No hay “export solo audio” one-click aún (script o endpoint). |

---

## 3. Edición en timeline (CapCut: trim, split, cortes, multi-pista)

| Función CapCut | Estado | Cómo lo tenemos / haremos |
|----------------|--------|----------------------------|
| **Cortar / trim / split** | Hecho | Premiere: edición nativa. Segmentos/markers del servidor = guía para cortes (CEP puede aplicar). |
| **Multi-pista (varias pistas)** | Hecho | Premiere y AE: múltiples pistas nativas. |
| **Auto Cut (cortes al ritmo de música/habla)** | Hecho | Music mode: beats/sections/drops. Transcript: pausas y segmentos. Pipeline genera segmentos; CEP/AE aplican. |
| **Invertir clip / freeze frame** | Hecho | Premiere/AE: nativo. |
| **Velocidad (speed ramping, slow-mo)** | Hecho | Premiere/AE: nativo. Servidor puede sugerir puntos (p. ej. highlights) para speed. |
| **Keyframe animation** | Hecho | AE/Premiere: nativo. Datos (markers, segments) pueden drive keyframes vía scripts. |

---

## 4. Efectos, transiciones y creativos (CapCut: efectos, transiciones, filtros, SFX)

| Función CapCut | Estado | Cómo lo tenemos / haremos |
|----------------|--------|----------------------------|
| **Transiciones entre clips** | Hecho | Premiere/AE: biblioteca nativa. Tiempos de corte = segmentos/markers del servidor. |
| **Efectos de video** | Hecho | AE/Premiere: efectos nativos + plugins. |
| **Filtros / color grading** | Hecho | Premiere: Lumetri; AE: efectos color. Photoshop: ajustes. |
| **Sound effects (biblioteca)** | Parcial | B-roll y música en servidor; falta “biblioteca SFX” con búsqueda/etiquetas y enlace a pista en proyecto. |
| **Plantillas de proyecto** | Parcial | Perfiles (shorts/ads/longform) y MOGRT; falta catálogo de “templates” como en CapCut. |

---

## 5. Imagen y video (CapCut: quitar fondo, retoque, mejorar calidad, estabilizar)

| Función CapCut | Estado | Cómo lo tenemos / haremos |
|----------------|--------|----------------------------|
| **Quitar fondo (green screen / chroma)** | Parcial | AE/Premiere: Keylight y herramientas nativas. Servidor: sin “remove background” automático aún. |
| **Remove background (IA)** | Por hacer | API (OpenAI, etc.) o modelo local; salida máscara/alpha; AE/PS importan. |
| **Retoque (beauty, cara)** | Hecho | Photoshop + AE: herramientas nativas. Falta pipeline “retouch batch” desde servidor. |
| **Mejorar calidad / upscale** | Por hacer | Integrar upscaler (Real-ESRGAN, API) y opción en export o pre-render. |
| **Estabilización de video** | Parcial | Premiere: Warp Stabilizer. Servidor: no genera parámetros de estabilización aún. |
| **Reframe (vertical 9:16, etc.)** | Hecho | `POST /v1/reframe`; pipeline y Job Studio. |

---

## 6. Detección y análisis (CapCut: escenas, música, sincronización)

| Función CapCut | Estado | Cómo lo tenemos / haremos |
|----------------|--------|----------------------------|
| **Detección de escenas** | Hecho | `POST /v1/scene/detect`; cortes en timeline; QA markers. |
| **Detección de beats / música** | Hecho | Music mode: beats, sections, drops; FFmpeg. |
| **Sincronizar cortes con música** | Hecho | Beats/sections en JSON; AE/Premiere aplican markers; Auto Cut conceptualmente cubierto. |
| **QA (silencio, negro, loudness)** | Hecho | `POST /v1/qa/analyze`; markers de silencio/negro; CSV; integrado en jobs. |

---

## 7. B-roll y assets (CapCut: biblioteca, sugerencias, stock)

| Función CapCut | Estado | Cómo lo tenemos / haremos |
|----------------|--------|----------------------------|
| **Sugerir B-roll por texto** | Hecho | `POST /v1/broll/suggest`; biblioteca local en `broll/`. |
| **Biblioteca de assets local** | Hecho | B-roll dir; perfiles config. |
| **Stock (imágenes/video)** | Parcial | Config `integrations.adobeStock`; falta flujo completo de búsqueda e inserción. |
| **Frame.io / colaboración** | Parcial | Script ejemplo Frame.io; falta integración completa tipo CapCut Cloud. |

---

## 8. Export y entrega (CapCut: formatos, resoluciones, presets redes)

| Función CapCut | Estado | Cómo lo tenemos / haremos |
|----------------|--------|----------------------------|
| **Export a archivo (MP4, etc.)** | Hecho | Premiere/AE: colas de render nativas. |
| **Presets por red (YouTube, Reels, etc.)** | Parcial | Perfiles (shorts/ads/longform); falta UI “export for YouTube/Instagram” con resolución/ratio. |
| **Varios formatos / resoluciones** | Hecho | Premiere: secuencia y export; reframe 9:16 en servidor. |
| **Export solo audio** | Parcial | FFmpeg puede; falta endpoint/script “export audio only” desde job. |

---

## 9. IA generativa (CapCut: video desde texto, imagen desde texto, avatares)

| Función CapCut | Estado | Cómo lo tenemos / haremos |
|----------------|--------|----------------------------|
| **Video desde texto/imagen** | Por hacer | Integrar generación (Runway, Pippit-style, etc.); salida a proyecto. |
| **Imagen desde texto** | Por hacer | API imagen (OpenAI, etc.); salida a AE/PS o carpeta assets. |
| **Avatares / fotos que hablan** | Por hacer | Servicio tipo D-ID o similar; salida video para timeline. |
| **Script/idea desde IA** | Parcial | LLM en servidor para summary/chapters; falta “generar guion” explícito. |
| **Chat/agente que orquesta** | Hecho | Agente LLM en dashboard: jobs, QA, retry, crear job, analizar transcript, etc. |

---

## 10. Experiencia de producto (CapCut: plantillas, cloud, simple)

| Función CapCut | Estado | Cómo lo tenemos / haremos |
|----------------|--------|----------------------------|
| **Dashboard único (crear job, ver resultados, agente)** | Hecho | Dashboard con agente, jobs, Job Studio, QA, Music, config. |
| **Un comando para arrancar** | Hecho | `./go.sh`: servidor + Ollama + abrir dashboard. |
| **Plantillas “one-click”** | Parcial | Perfiles y presets; falta galería de templates con preview. |
| **Edición en la nube / multi-device** | Por hacer | Opcional: sync proyectos o API remota; hoy todo local. |
| **Trial / gratis** | N/A | Depende de licencias Adobe; kit en sí es local y abierto. |

---

## Checklist “que no falte ninguna” (orden sugerido)

- [ ] **Texto/captions**: quitar fillers en pipeline; opción “bilingual captions” (segundo idioma).
- [ ] **Audio**: TTS (y opcional voz custom); “enhance voice” claro en UI; denoise en UI.
- [ ] **Timeline**: ya cubierto con Premiere/AE + datos del servidor; documentar “Auto Cut” como flujo estándar.
- [ ] **Creativos**: biblioteca SFX con tags; catálogo de plantillas (MOGRT/perfiles) en dashboard.
- [ ] **Imagen/video**: remove background (IA); upscale; estabilización parametrizable desde servidor (opcional).
- [ ] **Export**: presets “Export for YouTube/Instagram” en UI; “export audio only” desde job.
- [ ] **IA generativa**: video desde texto; imagen desde texto; avatares; “generar guion” en agente.
- [ ] **Producto**: galería de templates; opcional cloud/sync.

---

## Cómo usar este doc

- **Prioridad**: primero las filas en **Parcial** y **Por hacer** que más impactan “sentirse como CapCut” (captions, TTS, remove bg, export presets, templates).
- **Implementación**: cada ítem “Por hacer” se puede bajar a tareas en `notes/master-backlog.md` o en issues, con componente (servidor, CEP, AE, PS, dashboard).
- **Integración**: Premiere + AE + Photoshop se usan para todo lo que es “timeline, efectos, texto, color”; el servidor AutoKit para análisis, sugerencias, agente y datos (markers, segments, QA, music, b-roll). Así no falta ninguna función de CapCut y queda más bacán por el ecosistema Adobe + automatización.

- **Techo (mucho más que CapCut)**: ver **`docs/vision-beyond-capcut.md`** — timeline pro, motion/VFX, color, audio pro, batch, QC, integraciones, IA que drive Premiere/AE/PS. Eso es lo mínimo que el motor nos exige.
