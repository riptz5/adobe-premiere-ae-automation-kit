# Configuracion: pantalla completa (spec)

## Objetivo
Un solo lugar para activar/desactivar flujos, seleccionar perfiles y ajustar
parametros sin tocar codigo.

## Ubicacion y precedence
- `config/default.json` (versionado)
- `config/local.json` (override local, no se commitea)
- `config/profiles/*.json` (shorts/ads/longform/docu)
- Precedence: local > profile > default

## Pantalla completa (secciones)
### 1) Profile + Run Mode
- Profile activo
- Run mode: auto / manual / dry-run
- Auto-run al detectar media
- Nivel de logs y notificaciones

### 2) Paths + Storage
- Watch folders
- Extensions para auto-ingest (vtt/srt/txt)
- Debounce y reintentos
- Output root
- Cache y temp
- Library path para B-roll

### 3) Premiere
- Template project y sequence
- Reglas de bins/organizacion
- Track mapping y reglas de sync
- Marker colors + types

### 4) After Effects
- Template project path
- Comp name base
- CSV mapping (headers -> layer names)
- Render queue preset

### 5) Analisis (STT + NLP)
- Engine: whisper.cpp / faster-whisper
- Model size (tiny/small/medium)
- Language auto/manual
- VAD on/off + threshold
- Diarization on/off
- Chapter length objetivo
- Highlight scoring thresholds

### 6) LLM local
- Provider: Ollama / llama.cpp
- Model name
- Context length + temperature
- Fallback model (fast)
- System prompt override

### 7) Vision + Scene
- Scene detection threshold
- Auto reframe targets (9:16, 1:1)
- Face tracking on/off
- OCR on/off
- CLIP search on/off

### 8) Audio
- Denoise on/off
- Loudness target (EBU R128)
- Auto EQ preset

### 9) Outputs
- Presets (YouTube/TikTok/IG)
- Bitrate + codec
- Watermark on/off
- File naming pattern

### 10) Integraciones (OFF por defecto)
- Frame.io (token, project, folder)
- Adobe Stock (api key)
- Creative Cloud Libraries (si disponible)
- "Test connection" buttons

### 11) Performance
- Max concurrency
- CPU threads
- Memory budget
- Metal acceleration on/off

### 12) Creative Options (opt-in)
- Allow creative variation
- Auto trailer/teaser
- Auto B-roll mixing
- Safe guardrails (max edits/min)

## Recomendado para MacBook Pro 13 M1 16GB (2020)
- LLM: Ollama + `llama3:8b` o `qwen2:7b`
- Fallback rapido: `phi3:mini`
- STT: whisper.cpp small o medium con Metal
- VAD: simple on por defecto
- Scene detection: threshold medio
- Concurrency: 2-3 jobs max

## UI
- Tabs: General, Ingest, Analyze, Edit, Render, Integrations, Advanced
- Panel embebido en CEP + dashboard local (localhost)
