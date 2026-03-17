# After Effects – ExtendScript y contratos

Los scripts en `after-effects/extendscript/` consumen salidas del servidor AutoKit. Los formatos deben coincidir con `docs/data-contracts.md`.

## Markers (`apply_markers_from_json.jsx`)

- **Entrada**: archivo JSON con propiedad `markers` (array).
- **Contrato** (cada elemento):
  - `timeSec` (number): tiempo en segundos.
  - `name` (string): nombre del marker.
  - `comment` (string, opcional).
  - `type` (opcional): `chapter` | `highlight` | `qa` | `music` | `section` | `drop` | `other`.

El script aplica los markers a la comp activa. Compatible con el JSON de `/v1/jobs/:id/markers` o con `{ "markers": [ ... ] }` generado por analizar transcript/media/music.

## CSV y generación de comps (`generate_from_csv.jsx`)

- **Entrada**: CSV con columnas (por ejemplo) `profile`, `compName`, `title`, `subtitle`, `assetPath`.
- **Uso**: elegir un CSV; el script duplica la comp `TEMPLATE` o `TEMPLATE_<profile>` por fila, rellena capas de texto TITLE/SUBTITLE y opcionalmente reemplaza un footage placeholder.
- No está ligado a un contrato REST concreto; el CSV es definido por el usuario o por un export desde el dashboard.

## Ejemplo de flujo

1. En el dashboard: crear job con media o transcript → obtener markers/segments.
2. Guardar `GET /v1/jobs/:id/markers` como `markers.json`.
3. En AE: abrir una comp → File → Scripts → Run Script → `apply_markers_from_json.jsx` → elegir `markers.json`.

Ver `examples/ae/` para JSON de ejemplo y pasos detallados.
