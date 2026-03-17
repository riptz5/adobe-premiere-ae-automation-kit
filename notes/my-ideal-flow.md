# Mi flujo ideal (día a día) — stack Reaper + OSS

Flujo recomendado con el stack 100% open-source (sin Adobe).

## Arranque

```bash
bash scripts/install_oss.sh   # primera vez: instala FFmpeg, Kdenlive, Blender, GIMP
cd server && npm run dev       # servidor en http://localhost:8787
# En otra terminal (opcional):
ollama serve                   # LLM local en 127.0.0.1:11435
```

Dashboard: http://localhost:8787

## Crear y procesar un job

1. Dashboard → **2 · Crear job** → pega Media path (ruta local) o Transcript (VTT/TXT).
2. Elige **perfil** (shorts, ads, longform) y pulsa **Create + Run**.
3. En **3 · Jobs** → **Open Studio** para ver result, markers, segments, QA, scenes, broll, reframe, music.
4. Los outputs se guardan en `server/data/results/`:
   - `.result.json` — chapters, segments, markers, highlights
   - `.timeline.json` — TimelineContract (multi-track)
   - `.timeline.otio.json` — OTIO (OpenTimelineIO)
   - `.rpp` — **Reaper project** (auto-generado en cada job)

## Reaper (DAW — reemplaza Audition)

1. El `.rpp` se genera automáticamente al final de cada job.
2. También disponible desde dashboard → **6 · OSS Export** → pega Job ID → **→ Reaper .rpp**
3. El `.rpp` contiene: Dialogue, Music (con ducking envelope), Broll, SFX + todos los markers.

## Kdenlive (editor de video — reemplaza Premiere Pro)

1. Dashboard → **6 · OSS Export** → Job ID → **→ Kdenlive .mlt**
2. Abre el `.mlt` en Kdenlive (File → Open)
3. El proyecto incluye clips por segmento con fade in/out y guías desde markers.

## Blender VSE (compositing — reemplaza After Effects)

1. Dashboard → **6 · OSS Export** → Job ID → **→ Blender VSE**
2. La VSE incluye: clips en canal 1, b-roll en canal 2 (alpha over), markers.
3. O desde CLI:
   ```bash
   blender -b -P examples/oss/blender_vse_adapter.py -- \
     --timeline server/data/results/<job>.timeline.json \
     --output /tmp/render.mp4
   ```

## Natron (VFX — reemplaza AE para compositing nodo)

1. Dashboard → **6 · OSS Export** → Job ID → **→ Natron batch** (dry-run por defecto)
2. Para ejecutar:
   ```bash
   python examples/oss/natron_batch.py \
     --timeline server/data/results/<job>.timeline.json \
     --template comps/base.ntp --label vfx --run
   ```

## GIMP / Pillow (imagen — reemplaza Photoshop)

1. Dashboard → **6 · OSS Export** → Job ID → **→ Thumbnail (GIMP)**
   Extrae frame a 2s y genera thumbnail 1280×720.
2. O desde CLI:
   ```bash
   python examples/oss/gimp_batch.py \
     --input frame.jpg --output thumb.jpg --op thumbnail --width 1280 --height 720
   ```
   Operaciones: `thumbnail`, `sharpen`, `normalize`, `export`, `scriptfu`

## Social Export (YouTube · Reels · TikTok · LinkedIn)

1. Dashboard → **7 · Social Export** → elige plataforma → **Export para red social**
2. FFmpeg re-escala, ajusta FPS/codec/bitrate según preset por plataforma.
3. Presets: YouTube 1080p, YouTube Shorts 9:16, Instagram Reels, Feed 1:1, TikTok, Twitter/X, LinkedIn.

## Captions bilingüe

1. Dashboard → **8 · Captions bilingüe** → pega transcript → elige idioma → **Traducir**
2. LLM (Ollama) traduce preservando timecodes VTT/SRT.
3. Copia la traducción como pista de subtítulos secundaria en Kdenlive o Reaper.

## QA

1. Dashboard → **4b · QA** → media path o Job ID → **Run QA** → **Download CSV**
2. O accede desde Job Studio → tab "qa"

## Verificación rápida

```bash
curl http://localhost:8787/health
curl http://localhost:8787/v1/oss/health   # qué herramientas OSS están disponibles
cd server && npm test
```

## Referencias

- Endpoints: README.md → `/v1/*`
- Adaptadores OSS: `examples/oss/`
- Instalación: `scripts/install_oss.sh`
- Contratos: `docs/data-contracts.md`
- Backlog: `notes/master-backlog.md`
