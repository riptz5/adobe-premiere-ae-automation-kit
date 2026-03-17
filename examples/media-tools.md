# Media tools: Scene, B-roll, Reframe

Cómo probar scene detection, b-roll suggest y reframe con el servidor AutoKit.

## Scene detect

- **Endpoint**: `POST /v1/scene/detect`
- **Body**: `{ "path": "/ruta/absoluta/al/video.mp4" }`
- **Salida**: `{ "ok": true, "scenes": [ t1, t2, ... ] }` (tiempos en segundos de cortes detectados).

Requisito: FFmpeg en el PATH. El servidor usa `select='gt(scene,0.3)'` por defecto (config `scene.threshold`).

## B-roll suggest

- **Endpoint**: `POST /v1/broll/suggest`
- **Body**: `{ "text": "keywords o summary del proyecto" }`
- **Salida**: `{ "ok": true, "broll": [ { "path": "...", "score": n }, ... ] }`

Coloca archivos de media en la carpeta `broll/` (o la configurada en `broll.libraryDir`). Los nombres de archivo se comparan con los tokens del texto (ej. "beach sunset" matchea `beach-sunset.mp4`).

## Reframe

- **Endpoint**: `POST /v1/reframe`
- **Body**: `{ "path": "/ruta/video.mp4", "target": "9:16" }`
- **Salida**: `{ "ok": true, "reframed": [ { "target": "9:16", "ok": true, "outputPath": "..." } ] }`

Requiere `reframe.enabled: true` en config. Los outputs se escriben en `paths.absReframeDir` (o `reframe.outputDir`).

## Probar desde el dashboard

1. **Scene**: Sección "4 · Media tools" → Media Path → "Scene Detect". El resultado aparece en Media Output.
2. **B-roll**: Misma sección → B-roll Text → "Suggest B-roll".
3. **Reframe**: Media Path → "Reframe 9:16".

Con un clip de prueba (por ejemplo un MP4 corto en tu disco), usa la ruta absoluta en Media Path y ejecuta cada acción.
