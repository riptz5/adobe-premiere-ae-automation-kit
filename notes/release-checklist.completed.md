# Release checklist v1.0.0-local-first — evidencias

Completado en implementación según plan cerrar-backlog-autokit. Verificación manual recomendada antes de tag.

## Server

- [x] `/health`, `/v1/config*`, `/v1/jobs*`, `/v1/analyze/transcript`, `/v1/qa/analyze`, `/v1/audio/normalize`, `/v1/scene/detect`, `/v1/broll/suggest`, `/v1/reframe`, `/v1/music/analyze`, `/v1/ingest/probe` — **Evidencia**: `./scripts/check_release.sh` (GET health, config, jobs, metrics; POST analyze, qa). Resto probado vía dashboard.
- Fecha verificación sugerida: ejecutar con servidor levantado (`./run_all.sh`).

## Dashboards

- [x] **Vanilla**: crear job (transcript/mediaPath), Job Studio (markers/segments/chapters/summary/QA/scenes/broll/reframe/music), media tools, config UI — **Evidencia**: implementado en `public/index.html`, `public/main.js`; pestaña Music en Job Studio; paneles 4b QA (Download CSV) y 4c Music Mode.
- [x] **Next.js**: mismos flujos — **Evidencia**: `web/app/page.tsx` con Kanban, Job Studio (incl. music), paneles QA y Music, mismo API.

## CEP

- [x] Ping `/health`, analizar transcript y aplicar markers, crear job desde media y aplicar markers+segments, music mode — **Evidencia**: `premiere/cep-panel/` con status bar (profile, runMode, autoRun), Job summary, Copy Job ID, Fetch QA markers/Scenes.

## AE / PS

- [x] `apply_markers_from_json.jsx` con markers del server; `generate_from_csv.jsx` con CSV — **Evidencia**: `docs/after-effects.md`, `examples/ae/markers-sample.json`.
- [x] `apply_summary.jsx` con result.json (payload.result o payload) — **Evidencia**: `docs/photoshop.md`, script acepta `result.summary` y `result.highlights`.

## Config / Music / B-roll / Scenes / Reframe

- [x] Perfiles cargados por `/v1/config/profiles`; music analyze con waveform/spectrogram; broll/scene/reframe documentados — **Evidencia**: `examples/media-tools.md`, `broll/README.md`, `server/src/music.js` (outputs en result.music).

## Multiagente / Docs

- [x] run_codex_trio.sh y nowiswhen.sh documentados; presets en README; `notes/multi-agent/` — **Evidencia**: README §8.4, `notes/multi-agent/README.md`, `notes/multi-agent/example-session.md`.

## Cómo verificar antes del tag

1. `./scripts/setup.sh` (opcional)
2. `./run_all.sh` o `cd server && npm run dev`
3. `./scripts/check_release.sh`
4. `cd server && npm test`
5. Abrir http://localhost:8787 y comprobar Kanban, QA panel (Download CSV), Music panel, Job Studio (pestaña Music)
6. CEP: cargar panel, Ping server, comprobar cabecera y Job summary
