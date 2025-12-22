# Configuración avanzada (pantalla completa)

A partir del análisis pedí por el cliente, la pantalla de configuración debe:

1. Tener tabs: **General / Ingest / Analyze / Edit / Render / Integrations / Advanced**.
2. Mostrar los perfiles disponibles (`shorts`, `ads`, `longform`, `docu`). Permitir crear, clonar, eliminar. Persistir en `config/profiles/*.json`.
3. Cada tab expone toggles + sliders + selects que modifican el `config` local:
   - `General`: profile activo, modo (auto/manual/dry-run), logging level, env overrides.
   - `Ingest`: watch folders, extensions, mediaExtensions, auto-run.
   - `Analyze`: STT engine/model, chunk size, highlight thresholds, LLM prompts, summary length.
   - `Edit`: segment action defaults, marker colors, execute razor vs cleanup, Premiere template sequence.
   - `Render`: AME preset, naming pattern, output folder.
   - `Integrations`: toggles para Frame.io, Adobe Stock, Adobe Status API, Config API Mesh.
   - `Advanced`: QA thresholds, audio normalize params, hardware concurrency, open logs.

4. Guardar cambios desde la UI en `config/local.json` y recargar config dinámicamente (hot reload).  
5. Registrar en el dashboard el estado actual de config (GET `/v1/config`).  

Próximo paso: implementar la UI (React-lite o vanilla) para controlar `config/local.json`. Mientras lo trabajo, sigo anotando progreso aquí.
