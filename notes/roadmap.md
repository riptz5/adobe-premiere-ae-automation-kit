# Roadmap local-first (macOS only)

## Decisiones fijas
- macOS only
- Todo local por defecto
- Cloud opcional (off por defecto) y gestionado desde una pantalla completa de configuracion
- 0-click automation; manual solo si se habilita "creative options"
- OSS en GitHub; licencia MIT (por ahora)

## Objetivo
Un pipeline end-to-end que automatice ingest -> analisis -> edicion -> export -> delivery
con perfiles configurables (shorts/ads/longform/docu) y trazabilidad total por job.

## Arquitectura base (resumen)
- Orchestrator local (Node) + workers ML locales (Python)
- UI: CEP panel + CLI/REST local (para 0-click y headless)
- Data contracts versionados:
  - transcript.vtt / transcript.json
  - segments.json (keep/remove)
  - markers.json (chapters/highlights)
  - timeline-manifest.json (timeline build plan)
- Storage: project manifest + cache + outputs por job
- Queue + logs + reportes (con reintentos y estado)

## Tracks (paralelos, con dependencias minimas)
### Track 0: Backbone
- Config schema + perfiles (shorts/ads/longform/docu)
- Job queue + estado + retries
- Logging estructurado + reportes por job
- CLI base (run, dry-run, status)

### Track 1: Ingest
- Watch folders y auto-discovery de media
- Metadata via ffprobe
- Proxies (opcional) y cache local
- Normalizacion basica de audio

### Track 2: Analisis
- STT local (whisper.cpp o faster-whisper)
- VAD + diarizacion (opcional)
- Scene detection (threshold configurable)
- Scoring de highlights + chapters

### Track 3: Edicion
- Segments keep/remove y razor-cuts
- Markers/chapter injection en timeline
- Captions y subtitulos
- MOGRT params (AE -> Premiere)
- Auto B-roll (biblioteca local + CLIP)
- Auto reframe 9:16 / 1:1 con tracking

### Track 4: Render + Delivery
- Export AME con presets por perfil
- Multi-output (YouTube/TikTok/IG)
- Naming/versioning por job
- Frame.io upload (opcional)

### Track 5: QA + OSS
- Checks tecnicos (negros, picos, silencio, drift)
- Tests basicos (unit + integration)
- Docs + examples + templates
- Release GitHub + licencia MIT

## Milestones (incrementales)
### MVP (local, sin cloud)
- Track 0 completo
- Track 1 minimo (ingest + metadata)
- Track 2 minimo (STT + chapters/highlights)
- Track 3 minimo (markers + captions)
- Track 4 minimo (1 preset AME)

### v1
- Track 2: scene detection + scoring avanzado
- Track 3: razor-cuts + segments keep/remove
- Track 4: multi-output + naming
- Track 5: QA basico + docs + examples

### v1.5
- Auto B-roll + CLIP search local
- Auto reframe + tracking
- Integraciones cloud opcionales estables
- UX de configuracion completa

## Integraciones Adobe (solo APIs publicas o hooks)
- Premiere/AE/AME local (ExtendScript/CEP, UXP opcional)
- Frame.io (API)
- Adobe Stock (API)
- Creative Cloud Libraries (si API accesible)
- Adobe Fonts: activacion via Creative Cloud (sin API)

## Ideas "out of the box"
- Auto detect "capitulos por slide changes"
- Auto multi-cam sync por audio fingerprint
- Auto compliance checks (PII/profanity local)
- Auto trailer/teaser con constraints (duracion/ritmo)
- Auto brand kit (color, lower thirds, LUTs)
- Auto sound design (room tone, SFX tags)

## Riesgos y limitaciones (a vigilar)
- APIs Adobe no publicas o con acceso limitado
- Performance local en M1 16GB (tuning por perfil)
- Dependencias ML pesadas (separar workers)
