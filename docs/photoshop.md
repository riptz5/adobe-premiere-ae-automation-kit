# Photoshop – ExtendScript y contratos

El script en `photoshop/extendscript/apply_summary.jsx` consume la salida de análisis del servidor AutoKit (`JobResult`).

## Contrato esperado

Acepta un JSON con:

- **Opción A**: forma de `JobResult` en la raíz:
  - `summary` (string): resumen del contenido.
  - `highlights` (array): `[ { "start", "end", "label", "score"? } ]`.
- **Opción B**: forma de respuesta de job (como `GET /v1/jobs/:id/result`):
  - `result.summary`
  - `result.highlights`

El script crea o usa el documento activo y añade capas de texto: una con el summary y otra con la lista de highlights (labels).

## Flujo

1. Obtener el resultado del job: `GET /v1/jobs/:id/result` o usar el archivo `result.json` escrito por el pipeline en `server/data/results/`.
2. Guardar el JSON en disco.
3. En Photoshop: File → Scripts → Run Script File → elegir `apply_summary.jsx` → elegir el JSON guardado.

Si el JSON es la respuesta completa del endpoint (por ejemplo `{ "ok": true, "result": { "summary": "...", "highlights": [ ... ] } }`), el script usa `payload.result` automáticamente.
