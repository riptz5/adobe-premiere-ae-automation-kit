# Mi flujo ideal (día a día)

Flujo recomendado para usar el kit después de v1.0.0-local-first.

## Arranque

1. **Servidor**: `./scripts/run_autokit.sh` o `cd server && npm run dev`
2. **Opcional**: Ollama en 127.0.0.1:11435 si usas LLM para análisis de transcript
3. **Dashboard**: http://localhost:8787 (vanilla) o `cd web && npm run dev` para Next

## Crear y procesar un job

1. En el dashboard: sección **2 · Crear job** → pega **Media path** (ruta a un video/audio) o **Transcript** (VTT/texto).
2. Elige **perfil** (shorts, ads, longform, docu) y pulsa **Create + Run** (o Create Only si quieres ejecutar después con Run).
3. En **3 · Jobs** usa **Ver Lista** o **Ver Kanban**; clic en **Open Studio** para ver result, markers, segments, QA, scenes, broll, reframe, music.
4. Para QA solo: sección **4b · QA** → media path o Job ID → **Run QA** → **Download CSV** si necesitas el reporte.

## Premiere (CEP)

1. Carga el panel desde `premiere/cep-panel` (URL del servidor http://localhost:8787).
2. **Ping server** para ver perfil y runMode en la cabecera.
3. **Analizar transcript** → pega VTT → aplica markers en la secuencia activa.
4. **Analizar media** → elige archivo → se crea job en el server y se aplican markers + segments.
5. **Music** → elige archivo de audio → markers de beats/sections/drops.
6. Para un job ya creado: pega **Job ID** (del dashboard) → **QA markers** / **Scenes** / **Job summary** según necesites.

## After Effects / Photoshop

- **AE**: Guarda el JSON de markers (desde dashboard Job Studio → Markers o desde CEP). En AE, File → Scripts → Run Script File → `after-effects/extendscript/apply_markers_from_json.jsx` → elige el JSON. Para batch: usa `generate_from_csv.jsx` con un CSV (ver `examples/ae/example.csv`).
- **PS**: Guarda el `result.json` del job (o respuesta de GET `/v1/jobs/:id/result`). File → Scripts → Run Script File → `photoshop/extendscript/apply_summary.jsx` → elige el JSON. Crea capas con summary e highlights.

## Verificación rápida

- `./scripts/check_release.sh` (con el servidor levantado)
- `cd server && npm test`

## Referencias

- Endpoints: README.md
- runMode × autoRun: notes/configuration.md
- Contratos: docs/data-contracts.md
- Backlog y futuras versiones: notes/master-backlog.md
