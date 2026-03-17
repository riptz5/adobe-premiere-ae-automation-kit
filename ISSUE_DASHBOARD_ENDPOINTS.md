# [BUG] Endpoints del dashboard no funcionan correctamente

> **OBSOLETO / CERRADO** (2026-03-17)  
> El dashboard actual (vanilla en `public/` y Next en `web/`) **no usa** `/v1/dashboard/*`.  
> Usa endpoints REST estándar: `/v1/jobs`, `/v1/config`, `/v1/analyze/transcript`, `/v1/qa/analyze`, `/v1/music/analyze`, etc.  
> Este issue correspondía a un diseño anterior y no aplica al dashboard actual.  
> Paridad frontend↔backend confirmada en `notes/AUDIT-DEEP-FRONTEND-BACKEND.md`.

## Checklist (cerrado — no aplica)

- [x] ~~Reordenar rutas en `server/src/index.js`.~~ No necesario — rutas `/v1/dashboard/*` no existen ni son necesarias.
- [x] ~~Probar manualmente todos los endpoints `/v1/dashboard/*`.~~ No aplica.
- [x] ~~Validar que el dashboard frontend muestre datos reales.~~ Confirmado en auditoría.
- [x] ~~Documentar el fix en el repo.~~ Marcado como obsoleto.
