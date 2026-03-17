# Estado actual (v1.1.0-oss-stack)

## Stack de herramientas (100% open-source, sin Adobe)

| Adobe (descartado) | Reemplazo OSS |
|--------------------|---------------|
| Premiere Pro       | **Kdenlive** (editor de video, `.mlt`) + FFmpeg |
| After Effects      | **Blender VSE** (compositing) + **Natron** (VFX nodo) |
| Photoshop          | **GIMP** + Pillow (thumbnails, batch) |
| Audition / DAW     | **Reaper** (DAW, `.rpp`) |
| STT cloud          | **whisper.cpp** / **faster-whisper** (local) |
| LLM cloud          | **Ollama** llama3.1:8b (local) |

## Qué está hecho

### Pipeline principal
- STT: `whisper-cli` (modelo `ggml-small.bin`) y `faster-whisper`
- LLM: Ollama → segments, markers, chapters, summary, highlights
- QA: silencio, negro, loudness, spectral → `POST /v1/qa/analyze`
- Escenas: FFmpeg scene detect → `POST /v1/scene/detect`
- Música: beats, sections, drops → `POST /v1/music/analyze`
- B-roll: sugerencias por texto → `POST /v1/broll/suggest`
- Reframe: 9:16 y otros ratios → `POST /v1/reframe`
- Normalización audio: FFmpeg loudnorm → `POST /v1/audio/normalize`
- Extracción audio: WAV/MP3/AAC/FLAC → `POST /v1/audio/extract`

### OSS Export (v1.1)
- **Reaper** `.rpp` auto-generado en cada pipeline + `POST /v1/export/reaper` + descarga `/v1/jobs/:id/rpp`
- **Kdenlive** `.mlt` → `POST /v1/export/kdenlive` + descarga `/v1/jobs/:id/mlt`
- **Blender VSE** → `POST /v1/export/blender`
- **Natron** batch VFX → `POST /v1/export/natron`
- **GIMP/Pillow** thumbnail → `POST /v1/export/thumbnail`
- Health check herramientas → `GET /v1/oss/health`

### Social Export (v1.1)
- Presets: YouTube 1080p, YouTube Shorts 9:16, Instagram Reels, Instagram Feed 1:1, TikTok, Twitter/X, LinkedIn
- `POST /v1/export/social` + `GET /v1/export/social/presets`
- Panel "7 · Social Export" en dashboard

### Captions y texto (v1.1)
- Quitar fillers: checkbox en panel Analizar transcript
- Captions bilingüe (LLM): `POST /v1/captions/bilingual` + panel "8 · Captions bilingüe"

### Dashboard (vanilla JS)
- Analizar transcript, crear job, lista + **Kanban** de jobs
- **Job Studio**: result, markers, segments, chapters, QA, scenes, broll, reframe, music, timeline
- Paneles **QA** (Download CSV), **Music Mode**, **Config** (7 tabs + editor JSON)
- **OSS Export** (6), **Social Export** (7), **Bilingual Captions** (8)
- Toggles: quitar fillers, denoise, extracción audio

### Config / perfiles
- Perfiles: shorts, ads, longform (en `config/profiles/`)
- Watch folders, health check extendido, métricas, retry, logging
- Rutas OSS: `reaperPath`, `blenderPath`, `gimpPath`, `ffmpegPath`, `natronPath`, `kdenliveCliPath`

## Herramientas instaladas

| Herramienta | Estado |
|-------------|--------|
| FFmpeg 7.0.2 (static) | ✅ `/usr/local/bin/ffmpeg` |
| whisper-cli (whisper.cpp) | ✅ `/usr/local/bin/whisper-cli` |
| Modelo whisper small | ✅ `server/vendor/whisper-models/ggml-small.bin` |
| opentimelineio (Python) | ✅ pip |
| Pillow (Python) | ✅ pip |
| faster-whisper (Python) | ✅ pip |
| yt-dlp (Python) | ✅ pip |
| Reaper | ✅ usuario instalado |
| Kdenlive | instalar: `bash scripts/install_oss.sh` |
| Blender | instalar: `bash scripts/install_oss.sh` |
| GIMP | instalar: `bash scripts/install_oss.sh` |
| Natron | instalar: `bash scripts/install_oss.sh` |

## Qué queda (backlog v1.2+)

Ver `notes/master-backlog.md` y `docs/capcut-parity.md`:
- TTS (texto a voz, local o API)
- Remove background IA (roto/alpha)
- Upscale video (Real-ESRGAN)
- Estabilización parametrizable desde servidor
- Galería de plantillas one-click
- Multicam script (Reaper/Kdenlive)
- Validación post-export (QA sobre archivo exportado)
- Nomenclatura y versionado estándar
