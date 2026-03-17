# Ejemplo: Shorts

Perfil típico para clips cortos (ej. 30–60 s). Capítulos densos, highlights acotados.

## Contenido

- `transcript.vtt`: transcript de ejemplo (VTT).
- Rutas de media: usar un MP4/MOV corto local; en el dashboard pon la ruta en "Media Path" o "Crear job".

## Flujo

1. Servidor: `./scripts/run_autokit.sh` o `cd server && npm run dev`
2. Dashboard: http://localhost:8787 → perfil **shorts**
3. Crear job: pegar transcript o indicar media path → Create + Run
4. Resultados: markers, segments, chapters, QA en Job Studio

## Salida esperada

- `result.json` (chapters, segments, markers, summary)
- Markers aplicables en Premiere/CEP desde "QA markers" o "Markers" del job
