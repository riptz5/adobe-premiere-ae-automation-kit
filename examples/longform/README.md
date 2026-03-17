# Ejemplo: Longform / documental

Perfil para piezas largas (documental, entrevistas). Capítulos más largos, más segmentos.

## Contenido

- `transcript.vtt`: transcript largo de ejemplo (extracto).
- Media: usar un video de 5–30 min para probar scene detection y b-roll suggest.

## Flujo

1. Dashboard → perfil **shorts** o crear perfil **longform** en config con `analyze.chapterTargetSec` mayor
2. Crear job con media path (STT + análisis)
3. Revisar Job Studio: Chapters, Segments, Scenes, B-roll
4. CEP: pegar Job ID y usar "Fetch QA markers", "Fetch Scenes", "Job summary"

## Salida esperada

- result.json (chapters, segments, markers, summary)
- scenes (cut points) si el pipeline incluye scene detection
- broll suggestions si hay texto y carpeta broll/ con media
