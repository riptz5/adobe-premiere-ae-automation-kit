# Adobe Premiere + After Effects Automation Kit (Starter)

Esto es un *starter kit* (monorepo) para automatizar flujos reales entre:
- **Premiere Pro** (CEP panel + ExtendScript + opcional UXP)
- **After Effects** (ExtendScript para batch/data-driven)
- **Servidor Node** para **LLM/orquestación** (capítulos, highlights, markers, captions, MOGRT params)
- **Frame.io** (script de ejemplo de subida via API)

> Nota honesta: algunas funciones que mencionaste (p.ej. *Generative Extend*, búsquedas visuales internas, o “Text-Based Editing” nativo) **no tienen una API pública estable** para replicarlas 1:1 desde código. En esos casos este kit incluye:
> - una alternativa automatizable (por transcript + timecodes)
> - o un “hook” para ejecutar la parte manual y seguir el pipeline

---

## 0) Requisitos

- Node.js 18+
- Premiere Pro + (si usas CEP) extensión habilitada
- After Effects
- (Opcional) UXP Developer Tool para cargar plugins UXP
- (Opcional) Token de Frame.io y/o credenciales OAuth (según tu setup)

---

## Un solo comando (arrancar todo y abrir dashboard)

```bash
./go.sh
```

Libera el puerto 8787, instala dependencias del servidor, arranca Ollama (si está instalado) y el servidor, espera a que responda y abre el navegador en el dashboard. Para parar: `./scripts/stop_autokit.sh`.

---

## 1) Quick start: servidor LLM/orquestación

```bash
cd server
npm i
# Opcional: export OPENAI_API_KEY="..."
npm run dev
```

- Health: `GET http://localhost:8787/health`
- Generar markers/chapters: `POST http://localhost:8787/v1/analyze/transcript`
- Jobs: `POST /v1/jobs`, `GET /v1/jobs`, `GET /v1/jobs/:id`, `POST /v1/jobs/:id/run`
- Job outputs: `GET /v1/jobs/:id/result`, `GET /v1/jobs/:id/markers`
- More outputs: `GET /v1/jobs/:id/segments`, `GET /v1/jobs/:id/chapters`, `GET /v1/jobs/:id/summary`
- Highlights: `GET /v1/jobs/:id/highlight-segments` (highlights como segmentos listos para exportar)
- Text-based editing: `POST /v1/jobs/:id/text-edit` (keep/remove decisions → re-genera timeline y .rpp)
- QA: `GET /v1/jobs/:id/qa`, `POST /v1/qa/analyze`
- QA markers (silence/black): `GET /v1/jobs/:id/qa-markers`
- Audio normalize: `POST /v1/audio/normalize`
- Config local: `GET /v1/config/local`, `POST /v1/config/local`
- Scene detect: `GET /v1/jobs/:id/scenes`, `POST /v1/scene/detect`
- B-roll suggest (contextual): `GET /v1/jobs/:id/broll`, `POST /v1/broll/suggest`
- Reframe: `GET /v1/jobs/:id/reframe`, `POST /v1/reframe`
- Music mode (FFmpeg, sin transcript): `POST /v1/music/analyze`
- Config: `GET /v1/config`, `GET /v1/config/profiles`
- OSS export: `POST /v1/export/reaper`, `POST /v1/export/reaper/multicam`, `POST /v1/export/kdenlive`, `POST /v1/export/blender`, `POST /v1/export/natron`, `POST /v1/export/thumbnail`
- Probe media: `POST /v1/ingest/probe` (requiere `ffprobe`)
- Jobs desde media: `POST /v1/jobs` con `mediaPath` (requiere STT local)

Config local:
- Defaults: `config/default.json`
- Overrides locales (no commitear): `config/local.json`
- Perfiles: `config/profiles/*.json`
- Resultados: `server/data/results`
- Tabla runMode × autoRun (watcher vs API): ver `notes/configuration.md`.

Dashboard local:
- Abre `http://localhost:8787/` para crear jobs, ver resultados y markers.
- Editor de config local y herramientas media integradas en el dashboard.

Auto-ingest (watch folders):
- Activa en `config/local.json` con `"watch.enabled": true`
- Usa `watch.folders` y `watch.extensions` para leer transcripts y auto-crear jobs
- Usa `watch.mediaExtensions` para media (video/audio) y auto STT

Extras locales:
- B-roll: agrega tu biblioteca en `broll/` (o ajusta `broll.libraryDir`)
- Scene detect y reframe: disponibles via endpoints y dashboard

STT local (whisper.cpp) en macOS:
```bash
./scripts/setup_whisper.sh
```
Config listo en `config/local.json`:
- `stt.command`: `server/vendor/whisper.cpp/bin/whisper-cli`
- `stt.modelPath`: `server/models/ggml-small.bin`

Run/Stop local:
```bash
./scripts/run_autokit.sh
./scripts/stop_autokit.sh
```

Autostart (macOS, opcional):
```bash
bash scripts/install_autostart_macos.sh
# para desinstalar:
bash scripts/uninstall_autostart_macos.sh
```

CLI local:
```bash
cd server
node src/cli.js analyze --file ../examples/sample_transcript.vtt --no-llm
node src/cli.js job --file ../examples/sample_transcript.vtt --no-llm
node src/cli.js job --media /path/video.mp4
```

Music mode (audio-first, sin transcript):
```bash
curl -sS -X POST http://localhost:8787/v1/music/analyze \
  -H "Content-Type: application/json" \
  -d '{"path":"/path/musica.wav","profile":"shorts"}'
```
Outputs en `server/data/results`: `*.music.json`, `*.waveform.png`, `*.spectrogram.png`.

---

## 2) Premiere: CEP Panel

Carpeta: `premiere/cep-panel`

### Instalar (dev)
1) Copia `premiere/cep-panel` a tu carpeta de extensiones CEP.
   - Windows: `%APPDATA%/Adobe/CEP/extensions/`
   - macOS: `~/Library/Application Support/Adobe/CEP/extensions/`
2) Activa “Debugging” de extensiones CEP (según tu versión / OS).
3) Abre Premiere > Window > Extensions > **AutoKit Panel**

El panel:
- Importa/organiza media
- Aplica markers desde JSON (capítulos/highlights)
- Analiza media (STT + LLM local) y aplica markers directo a la secuencia
- Analiza música (FFmpeg) y aplica markers de QA + beats/secciones (sin transcript)
- Exporta via Media Encoder
- (Opcional) sube export a Frame.io

---

## 3) Premiere: UXP (opcional, “nuevo”)

Carpeta: `premiere/uxp-plugin`

Esto es un skeleton mínimo para probar el DOM vía:
```js
const app = require("premierepro");
```

---

## 4) After Effects: batch/data-driven

Carpeta: `after-effects/extendscript`

- `generate_from_csv.jsx`: duplica una comp plantilla por fila de CSV, cambia textos, reemplaza assets, y encola render.
- `apply_markers_from_json.jsx`: aplica markers desde JSON a la comp activa.

MOGRT:
- Mira `after-effects/mogrt/ESSENTIAL_GRAPHICS_NOTES.md` (pasos manuales + qué exponer para editar en Premiere).

---

## 5) Formatos de intercambio

### Markers JSON (para Premiere)
Ver: `examples/sample_markers.json`

### Transcript VTT
Ver: `examples/sample_transcript.vtt`

### Result JSON (segments/markers/summary)
Ver: `examples/sample_result.json`

---

## 6) Seguridad / buenas prácticas
- No hardcodees tokens.
- Usa `.env` (ya hay ejemplo en `server/.env.example`).
- Para producción: valida JSON con Zod (ya está).

---

## 7) Limitaciones conocidas (importante)
- **Generative Extend**: no hay API pública para “invocarlo”; este kit sugiere alternativa por “room tone” + freeze/optical (según caso).
- **Text-Based Editing nativo**: este kit implementa “text-based editing” *propio* desde transcript con timecodes (cortes/selección).
- **Búsqueda visual semántica interna**: no hay acceso directo; alternativa: etiquetado vía modelo externo (CLIP) y metadata.

---

Si quieres, después lo aterrizamos a TU flujo (shorts, YouTube, ads, docu), pero con esto ya tienes una base funcional.

## Photoshop (ExtendScript)
Carpeta: `photoshop/extendscript`
- `apply_summary.jsx`: crea capas de texto con summary/highlights desde result JSON.

## 8) Multi-agent (paralelo, open source listo)

Flujo recomendado (**MULTIAGENT FROM MOMENT ZERO**, ver `AGENTS.md`):

1. **Planner + Implementer + Reviewer en paralelo** para cualquier cambio no trivial.
2. Opcionalmente, usa el flujo `nowiswhen` (Planner + Reviewer → Implementer → Reviewer final) para cambios grandes.

### 8.1) Trio rápido (planner/implementer/reviewer)

Si necesitas cumplir “nunca codifiques solo”, lanza 3 agentes en paralelo con este script (sin dependencias extra):

```bash
# 3 agentes en paralelo y proveedor OSS (opcional)
./scripts/run_codex_trio.sh -p "Revisa el repo, sugiere mejoras y aplica cambios mínimos" -- --oss --local-provider ollama
```

- Salida: `.codex-agents/<timestamp>/{planner,implementer,reviewer}.md` y logs `.log`.
- `--oss` usa proveedor open source configurado en Codex (`ollama`/`lmstudio`); quita el flag si prefieres tu proveedor actual.
- Por defecto corre en `read-only`; ajusta con `--planner-sandbox/--impl-sandbox/--review-sandbox` si quieres permitir escritura.

### 8.2) Flujo `nowiswhen` (handoff completo)

Si quieres un flujo con handoff (Planner + Reviewer en paralelo → Implementer consume ambos → Reviewer final opcional):

```bash
./scripts/nowiswhen.sh --task "Revisa el repo, sugiere mejoras y aplica cambios mínimos" --implement --final-review --oss --local-provider ollama
```

### 8.3) Dónde ver los resultados

- `scripts/run_codex_trio.sh` → `.codex-agents/<timestamp>/{planner,implementer,reviewer}.{md,log}`
- `scripts/nowiswhen.sh` → `notes/multi-agent/<timestamp>/` con:
  - `task.txt`
  - `planner.md`, `reviewer.md`
  - `implementer_input.md`, `implementer.md` (si `--implement`)
  - `final_review.md` (si `--final-review`)

Regla completa y guía: `AGENTS.md`. Ejemplos de prompts por tarea: `notes/multi-agent-prompts.example.txt`. Sesiones de ejemplo y decisiones: `notes/multi-agent/`.

### 8.4) Presets de tarea (nowiswhen)

- Cerrar release: `./scripts/nowiswhen.sh --task "Cerrar v1.0.0-local-first siguiendo notes/release-checklist.md" --implement --final-review`
- Nueva feature dashboard: `./scripts/nowiswhen.sh --task "Añadir panel X al dashboard vanilla y Next" --implement`

## Contribuir
Ver `CONTRIBUTING.md`.

## Reporte de seguridad
Ver `SECURITY.md`.

## Licencia
MIT. Ver `LICENSE`.
