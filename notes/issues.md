# Issues / Tareas ejecutables

**Estado v1.0.0-local-first**: Lo siguiente está **hecho**. Ver `notes/master-backlog.md` para el estado consolidado y `notes/release-checklist.completed.md` para evidencias.

## ✅ Hecho (P0–P4 cubiertos)

- **P0**: Job pipeline STT→LLM→segments/markers/outputs; watch folders; dashboard crear job y ver resultados; CEP "Analizar media" aplica markers.
- **P1**: Premiere segments (razor); AE batch CSV + markers JSON; Photoshop summary/highlights. Importar/organizar bins: parcial (CEP import).
- **P2**: STT por perfil; QA técnico (silence/black/loudness) y export CSV en dashboard. Audio normalize. Denoise: en config, no obligatorio.
- **P3**: Config UI con tabs (General, Ingest, Analyze, Edit, Render, Integrations, Advanced); perfiles shorts/ads/longform/docu; reportes por job vía Job Studio y QA CSV.
- **P4**: Licencia MIT, CONTRIBUTING, setup.sh, run_all.sh, ejemplos en examples/, checklist en release-checklist.completed.

## Backlog opcional (futuras versiones)

Ver `notes/master-backlog.md` sección "Futuras versiones":

- Highlight reels (B1), text-edit (B2), b-roll contextual (B3), perfil trailer/teaser (B4).
- Validación JSON en editor config, diff al guardar.
- Drag-and-drop Kanban (requiere API PATCH estado).
- Frame.io / Adobe Stock integraciones completas.
- CLIP/vector DB para b-roll, MOGRT export AE, etc. (roadmap).
