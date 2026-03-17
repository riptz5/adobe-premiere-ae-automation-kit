# Ejemplo: Ads

Perfil para spots o anuncios. Parámetros ajustados a duraciones cortas y QA estricta.

## Contenido

- `transcript.vtt`: transcript de ejemplo para un spot.
- Media: usar un clip de prueba (ej. 15–30 s).

## Flujo

1. Dashboard → perfil **ads**
2. Crear job con media path o transcript
3. Revisar QA (silence/black/loudness) en el panel QA o en Job Studio → pestaña QA
4. Export CSV desde el panel "4b · QA" si necesitas reportes

## Salida esperada

- result.json con chapters/segments/markers
- QA con loudness y eventos de silencio/negro
- Opcional: QA CSV descargable desde el dashboard
