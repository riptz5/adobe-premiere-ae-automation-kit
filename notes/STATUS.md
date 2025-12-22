# Estado actual y plan revisado (sin preguntas)

## 1. Qué se hizo (línea base funcional)
- **Servidor local**: jobs que corren STT (whisper.cpp) + LLM (Ollama) → segments/markers/chapters/summary/qa/audio/transcript. Watch folders permiten ingest de transcripts y media. Outputs en `server/data/results`.
- **Extras IA local**: scene detect, b-roll suggest por libreria local, reframe 9:16 con ffmpeg.
- **Dashboard** (`server/public`): tarjeta de análisis, creación de jobs, listado de jobs, botones para markers/segments/chapters/summary/QA, herramientas de QA+normalize y config snapshot.
- **Dashboard media tools**: scene detect, b-roll suggest, reframe, editor de `config/local.json`.
- **Premiere CEP panel**: botones para importar, aplicar markers, analizar media y auto-editar segments con razor-cuts; maneja errores y CORS.
- **After Effects**: scripts para batch CSV (`generate_from_csv.jsx`) y para aplicar markers JSON (`apply_markers_from_json.jsx`).
- **Photoshop**: script que genera capas con summary/highlights (`apply_summary.jsx`).
- **Scripts de soporte**: setup whisper, run/stop autokit, env defaults/profiles, watch config, README con endpoints/USO.
- **QA/Audio**: `analyzeMedia` (silence/black/loudness) y `normalizeAudio` integrados en pipeline, resultados guardados.

## 2. Qué falta (prioridad alta)
1. **Configuración/Perfiles (UI)**: pantalla full (tabs toggles) + persistencia de cambios, con perfiles `shorts/ads/longform/docu`.
2. **Auto B-roll / reframe / scene detection**: CLIP search, vector database local, auto crop 16:9→9:16/1:1 (baseline ya existe, falta version avanzada).
3. **QA avanzado**: reportes de negros/picos/silencio, checklist exportable (JSON/CSV), visual en dashboard.
4. **Audio cleanup extendido**: denoise RNNoise/noise profile + auto equalización + metadata (EBU).
5. **Premiere/AE/PS refinados**: razor-cuts por tracks, AE export MOGRT, Photoshop templates/branding kit.
6. **Integraciones opcionales**: Frame.io, Adobe Stock, API Mesh toggles con documentación.
7. **OSS/package**: CONTRIBUTING + checklist QA + release scripts + tests.

## 3. Nuevo plan (sin preguntas, ejecuto en paralelo)
1. **Documentar bloque**: este archivo + actualizar `notes/issues.md` (ya tiene).  
2. **Config UI & presets**: crear `notes/config-ui.md` + panel React-like u otra interacción en `server/public` + sync con `config/*`.  
3. **Extend pipeline**: agregar `autoBroll.js`, `reframe.js`, `scene.js` en `server/src`, + endpoints.  
4. **QA/audio dashboards**: extender UI para QA reports, export CSV, y en Premiere panel mostrar summary/QA.  
5. **Docs + packaging**: `README`, `notes/roadmap.md`, `notes/issues.md` al día + `CONTRIBUTING`, `package` release.

Voy directo al paso 2 (config UI + presets). Mientras se ejecuta, sigo actualizando estado sin interrumpirte.
