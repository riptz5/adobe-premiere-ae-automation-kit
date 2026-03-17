# Music Mode (audio-first, FFmpeg-only)

Este modo está pensado para cuando el proyecto parte con **solo música** (sin transcript, sin STT, sin LLM) y quieres **marcadores útiles** para editar:
- beats “aprox” (por *spectral flux*)
- secciones / cambios grandes de energía
- “drops” (saltos fuertes de energía)
- QA técnico (silencios, negros si hay video, loudness, picos)
- assets visuales: waveform + spectrogram

## Endpoint

### `POST /v1/music/analyze`

Body:
```json
{ "path": "/path/musica.wav", "profile": "shorts" }
```

Respuesta (resumen):
- `music.markers`: array listo para Premiere (`{timeSec,name,comment}`)
- `music.beats`: peaks detectados (t + flux)
- `music.bpm`: estimación aproximada (derivada de intervalos entre picos)
- `music.sections`: boundaries por cambios de loudness (t + deltaM)
- `music.sectionSegments`: segmentos (start/end/label) construidos desde boundaries
- `music.drops`: subset de sections con delta alto
- `qa`: salida completa de QA (silence/black/loudness + timeline, timeStats, spectralStats)
- `outputs.*Path`: archivos escritos en `server/data/results`

Archivos generados:
- `*.music.json` (resultado completo)
- `*.waveform.png`
- `*.spectrogram.png`

## Qué hace (heurísticas actuales)

### Beats “aprox”
Se calcula *spectral flux* con `aspectralstats` y se buscan picos por percentil (P92) con una separación mínima.
Sirve para **cuts rítmicos** y animación; no es BPM “musical” perfecto.

### Sections / Drops
Se usa el timeline de `ebur128` (momentary `M`) y se marcan boundaries cuando hay un cambio grande de energía en una ventana corta.
Los “drops” se infieren cuando el salto es alto (ΔM ≥ ~6 LUFS).

### QA (técnico)
Se ejecuta:
- `silencedetect` → silencios
- `ebur128` → loudness + timeline
- `volumedetect` → max/mean volume
- `blackdetect` (si hay video) → negros
- `astats` → time-domain stats (si `qa.spectral=true`)
- `aspectralstats` → freq-domain stats (si `qa.spectral=true`)

Además se generan **QA markers** (silence/black) que se pueden aplicar directo en Premiere.

## Uso en Premiere (CEP)

1) Abre el panel `AutoKit (Premiere CEP)`.
2) Asegura server URL `http://localhost:8787`.
3) Click **“Analizar música (FFmpeg) -> QA + beats/sections markers”**.
4) Se aplican markers en la secuencia activa (beats/sections/drops + QA markers).

## Uso en After Effects

- Puedes aplicar el JSON de markers a la comp activa con:
  - `after-effects/extendscript/apply_markers_from_json.jsx`
- Alternativa: usar los markers como guía para animación (cuts/expressions por tiempo).

## Uso en Photoshop

- Los PNG generados (`waveform.png` y `spectrogram.png`) sirven como base para:
  - thumbnails/covers
  - overlays informativos
- El script `photoshop/extendscript/apply_summary.jsx` sigue siendo útil para texto (si tienes summary/highlights).

## Config relevante

- `config/default.json` / `config/local.json`:
  - `qa.spectral`: habilita stats extra (`astats` + `aspectralstats`)
  - `audio.targetI`: target LUFS usado para warnings de loudness (default -16)
  - `music.*`: heurísticas de beats/sections/drops y tamaños de assets (waveform/spectrogram)
  - `paths.resultsDir`: dónde se escriben outputs

## Limitaciones (intencionales por ahora)

- BPM, key/chords, mood/genre “de verdad”: requiere libs dedicadas (aubio/librosa/essentia) o modelos.
- Beat detection actual es heurística basada en flux: funciona para edición práctica, no para análisis musical académico.
