# After Effects – Ejemplo con AutoKit

Ejemplo de uso de los scripts ExtendScript de AE con salidas del servidor AutoKit.

## Contratos (resumen)

- **Markers**: ver `docs/data-contracts.md` (Marker: `timeSec`, `name`, `comment`, `type`).
- **Segments**: `start`, `end`, `label`, `action` (keep/remove).

## Aplicar markers

1. En el dashboard o con la API, obtener markers (por ejemplo `GET /v1/jobs/:id/markers` o analizar transcript).
2. Guardar el JSON con forma `{ "markers": [ { "timeSec": 0, "name": "...", "comment": "...", "type": "chapter" }, ... ] }`.
3. En After Effects: abrir una comp → File → Scripts → Run Script File → elegir `after-effects/extendscript/apply_markers_from_json.jsx` → elegir el archivo JSON.

Puedes usar el `markers-sample.json` de esta carpeta para probar (abre una comp con una duración suficiente para los tiempos indicados).

## Generar comps desde CSV

1. Crear un CSV con columnas como `profile`, `compName`, `title`, `subtitle`, `assetPath` (ver `generate_from_csv.jsx`).
2. Tener una comp llamada `TEMPLATE` o `TEMPLATE_<profile>` con capas de texto TITLE y SUBTITLE.
3. File → Scripts → Run Script File → `generate_from_csv.jsx` → elegir el CSV.

## Archivos de ejemplo

- `markers-sample.json`: lista de markers en formato contrato para probar `apply_markers_from_json.jsx`.
- `example.csv`: CSV de ejemplo para `generate_from_csv.jsx` (columnas: profile, compName, title, subtitle, assetPath). Ajusta las rutas y nombres según tu comp TEMPLATE o TEMPLATE_shorts/ads.
