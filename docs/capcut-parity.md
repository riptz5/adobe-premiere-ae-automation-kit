# Paridad con CapCut (MÍNIMO) — Stack Reaper + OSS

**CapCut = MÍNIMO.** Stack: Reaper (DAW) + Kdenlive (video) + Blender VSE (compositor) + Natron (VFX) + GIMP (imagen) + FFmpeg + whisper.cpp + Ollama. Sin Adobe.

---

## Resumen por estado

| Estado | Significado |
|--------|-------------|
| **Hecho** | Implementado en servidor + dashboard + adaptadores OSS. |
| **Parcial** | API/lógica existe, falta UI o integración completa. |
| **Por hacer** | Pendiente de implementar. |

---

## 1. Texto y subtítulos

| Función CapCut | Estado | OSS / Cómo lo tenemos |
|----------------|--------|-----------------------|
| **Subtítulos/captions con tiempo** | Hecho | Servidor: transcript → markers/chapters/segments. Exportado a `.rpp` (Reaper) y `.mlt` (Kdenlive). |
| **Captions generadas por IA (STT)** | Hecho | whisper-cli (whisper.cpp, modelo small) + faster-whisper como alternativa. |
| **Plantillas de caption (estilos)** | Parcial | Timecodes listos; estilos = manual en Kdenlive/Blender (título text strips). |
| **Subtítulos bilingüe** | Hecho | `POST /v1/captions/bilingual` (LLM Ollama) + panel "8 · Captions bilingüe" en dashboard. |
| **Quitar fillers (um, uh)** | Hecho | `stripFillers()` en analyze.js + checkbox "Quitar fillers" en panel Analizar transcript. |
| **Texto overlay / títulos** | Parcial | Kdenlive: text strips nativo. Blender: texto en VSE. Falta endpoint "generar título" automático. |

---

## 2. Audio

| Función CapCut | Estado | OSS / Cómo lo tenemos |
|----------------|--------|-----------------------|
| **Normalizar loudness** | Hecho | `POST /v1/audio/normalize` (FFmpeg loudnorm); integrado en pipeline y dashboard. |
| **Reducir ruido** | Parcial | Config `audio.denoise=true` activa `afftdn` en FFmpeg. Falta toggle directo en UI (nota en normalize). |
| **Extraer audio** | Hecho | `POST /v1/audio/extract` (WAV/MP3/AAC/FLAC via FFmpeg) + botón en dashboard. |
| **Text-to-speech** | Por hacer | Integrar TTS local (Coqui, piper) o API; salida a pista de audio en Reaper/.rpp. |
| **Voces personalizadas** | Por hacer | TTS con modelo custom; mismo flujo que TTS. |
| **Mejorar voz (enhance)** | Parcial | Normalize + denoise + highpass/lowpass en config audio. Falta "voice enhance" dedicado. |
| **Volumen / ducking** | Hecho | Reaper `.rpp` incluye volume envelope en track Music (ducking en cues de música). |
| **Fade in/out** | Hecho | Kdenlive `.mlt` incluye filtros fade. Reaper: nativo. |

---

## 3. Edición en timeline

| Función CapCut | Estado | OSS / Cómo lo tenemos |
|----------------|--------|-----------------------|
| **Cortar / trim / split** | Hecho | Segmentos/markers del servidor → `.rpp` (Reaper) y `.mlt` (Kdenlive) aplican cortes. |
| **Multi-pista** | Hecho | Reaper `.rpp`: Dialogue/Music/Broll/SFX. Kdenlive `.mlt`: multi-playlist. Blender VSE: canales. |
| **Auto Cut (ritmo de música/habla)** | Hecho | Beats/sections/drops + transcript segments → markers en `.rpp` y `.mlt`. |
| **Invertir clip / freeze frame** | Parcial | Kdenlive/Reaper: nativo. Sin endpoint en servidor. |
| **Velocidad (speed ramping)** | Parcial | Kdenlive/Blender: nativo. Servidor puede marcar highlights para speed (no automatizado). |
| **Keyframe animation** | Parcial | Blender VSE: nativo. Natron: nodo-based. Falta generación automática de keyframes desde beats. |

---

## 4. Efectos, transiciones y creativos

| Función CapCut | Estado | OSS / Cómo lo tenemos |
|----------------|--------|-----------------------|
| **Transiciones entre clips** | Hecho | Kdenlive `.mlt`: fade in/out en cada clip. Blender VSE: cross-fade. |
| **Efectos de video** | Parcial | Blender VSE: efectos nativos. Natron: VFX nodo. Falta "efectos batch" desde servidor. |
| **Filtros / color grading** | Parcial | Kdenlive: Lumetri equivalente. Blender: color balance. Falta preset de LUT desde servidor. |
| **Sound effects (biblioteca)** | Parcial | B-roll dir + sugerencias. Falta biblioteca SFX con tags y búsqueda. |
| **Plantillas de proyecto** | Parcial | Perfiles (shorts/ads/longform) + presets de export social. Falta galería visual de templates. |

---

## 5. Imagen y video

| Función CapCut | Estado | OSS / Cómo lo tenemos |
|----------------|--------|-----------------------|
| **Quitar fondo (chroma/rotoscopia)** | Parcial | Kdenlive: chroma key nativo. Sin endpoint automático en servidor. |
| **Remove background IA** | Por hacer | Integrar rembg (Python OSS) o BG-Matting; salida máscara para Kdenlive/Blender. |
| **Retoque (imagen batch)** | Hecho | GIMP/Pillow: `POST /v1/export/thumbnail` + `examples/oss/gimp_batch.py` (sharpen, normalize, export). |
| **Mejorar calidad / upscale** | Por hacer | Integrar Real-ESRGAN (OSS) o waifu2x; opción en export. |
| **Estabilización de video** | Por hacer | Integrar FFmpeg `vidstabdetect`/`vidstabtransform`; endpoint `/v1/video/stabilize`. |
| **Reframe (vertical 9:16, etc.)** | Hecho | `POST /v1/reframe`; integrado en pipeline y Job Studio. |

---

## 6. Detección y análisis

| Función CapCut | Estado | OSS / Cómo lo tenemos |
|----------------|--------|-----------------------|
| **Detección de escenas** | Hecho | `POST /v1/scene/detect` (FFmpeg); exportado a `.rpp` y `.mlt`. |
| **Detección de beats / música** | Hecho | Music mode: beats, sections, drops (FFmpeg). |
| **Sincronizar cortes con música** | Hecho | Beats en JSON → markers en `.rpp` (Reaper) y `.mlt` (Kdenlive). |
| **QA (silencio, negro, loudness)** | Hecho | `POST /v1/qa/analyze`; markers; CSV export; integrado en jobs y Job Studio. |

---

## 7. B-roll y assets

| Función CapCut | Estado | OSS / Cómo lo tenemos |
|----------------|--------|-----------------------|
| **Sugerir B-roll por texto** | Hecho | `POST /v1/broll/suggest`; biblioteca local en `broll/`. |
| **Biblioteca de assets local** | Hecho | B-roll dir configurable; perfiles. |
| **Stock (imágenes/video OSS)** | Por hacer | Integrar Pexels/Pixabay APIs (gratuitas/OSS) o carpeta de stock local. |
| **Revisión colaborativa** | Por hacer | Frame.io config parcial; alternativa OSS: Loki/Kodi o carpeta compartida con comentarios. |

---

## 8. Export y entrega

| Función CapCut | Estado | OSS / Cómo lo tenemos |
|----------------|--------|-----------------------|
| **Export a archivo (MP4, etc.)** | Hecho | Blender VSE render, Kdenlive export, FFmpeg direct. |
| **Presets por red (YouTube, Reels, etc.)** | Hecho | `POST /v1/export/social` con 7 presets + panel "7 · Social Export" en dashboard. |
| **Varios formatos / resoluciones** | Hecho | Reframe 9:16/1:1; social presets (1920×1080, 1080×1920, 1280×720). |
| **Export solo audio** | Hecho | `POST /v1/audio/extract` (WAV/MP3/AAC/FLAC) + botón en dashboard. |
| **Descarga proyecto .rpp / .mlt** | Hecho | `GET /v1/jobs/:id/rpp`, `GET /v1/jobs/:id/mlt`. |

---

## 9. IA generativa

| Función CapCut | Estado | OSS / Cómo lo tenemos |
|----------------|--------|-----------------------|
| **Video desde texto/imagen** | Por hacer | Integrar AnimateDiff/CogVideo (OSS local) o API. |
| **Imagen desde texto** | Por hacer | Integrar Stable Diffusion (local) → output a GIMP/Blender. |
| **Avatares / fotos que hablan** | Por hacer | SadTalker (OSS) o similar; output video para Kdenlive/Reaper. |
| **Script/guion desde IA** | Parcial | LLM summary + bilingual captions. Falta "generar guion" y "descripción para redes" explícitos. |
| **Chat/agente orquestador** | Hecho | Agente LLM en dashboard: jobs, QA, retry, analizar, config, etc. |

---

## 10. Experiencia de producto

| Función CapCut | Estado | OSS / Cómo lo tenemos |
|----------------|--------|-----------------------|
| **Dashboard único** | Hecho | Dashboard con agente, jobs, Job Studio, QA, Music, OSS Export, Social Export, Captions. |
| **Un comando para arrancar** | Hecho | `cd server && npm run dev` + `bash scripts/install_oss.sh` (primera vez). |
| **Plantillas "one-click"** | Parcial | Perfiles y presets social; falta galería de templates con preview. |
| **Local y sin vendor lock-in** | Hecho | Todo local: servidor, whisper, Ollama, Reaper, Kdenlive, Blender. Sin cloud. |

---

## Checklist restante (Por hacer → siguientes versiones)

- [ ] **TTS** (Coqui/piper local): texto a voz → pista en Reaper
- [ ] **Remove background IA** (rembg OSS): máscara/alpha → Kdenlive/Blender
- [ ] **Upscale** (Real-ESRGAN OSS): mejorar calidad de clips
- [ ] **Estabilización** (FFmpeg vidstab): endpoint `/v1/video/stabilize`
- [ ] **Biblioteca SFX** con tags y búsqueda
- [ ] **Galería de templates** one-click con preview
- [ ] **Stock OSS** (Pexels/Pixabay API gratuita)
- [ ] **Generar guion/descripción** explícito desde LLM
- [ ] **IA generativa**: video desde texto, imagen desde texto
- [ ] **Validación post-export**: QA sobre archivo exportado
