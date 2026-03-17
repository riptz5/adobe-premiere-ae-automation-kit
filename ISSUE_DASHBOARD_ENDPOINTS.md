# [BUG] Endpoints del dashboard no funcionan correctamente

> **Obsoleto / No aplicable.** El dashboard actual (vanilla en `public/` y Next en `web/`) no usa `/v1/dashboard/*`. Usa `/v1/jobs`, `/v1/config`, `/v1/analyze/transcript`, `/v1/qa/analyze`, `/v1/music/analyze`, etc. Puedes cerrar este issue o ignorarlo. (2026-03-16)

## Problema
Los endpoints `/v1/dashboard/agents`, `/v1/dashboard/logs`, `/v1/dashboard/results`, etc. responden con `Cannot GET ...` en el backend Express (Node.js), por lo que el dashboard no puede mostrar datos reales ni enlaces clickeables.

## Diagnóstico
- El backend Express está corriendo y responde a `/v1/config`, pero no a los endpoints del dashboard.
- El registro de rutas en `server/src/index.js` probablemente tiene el `app.use('/', express.static(...))` antes de los endpoints del dashboard, lo que provoca que las rutas sean capturadas por el middleware estático y nunca lleguen a los handlers de API.
- Los subdirectorios y archivos requeridos existen y tienen datos, pero no son accesibles vía API.

## Plan de solución
1. **Reordenar el registro de rutas**
   - Asegurarse de que todos los endpoints `/v1/dashboard/*` se registren antes de cualquier `app.use('/', express.static(...))`.
2. **Verificar subdirectorios**
   - Confirmar que `.codex-agents`, `scripts`, `server/data/results`, etc. existen y tienen permisos de lectura.
3. **Probar endpoints**
   - Usar `curl` o Postman para verificar que `/v1/dashboard/agents` y similares devuelvan JSON válido.
4. **Documentar y dejar comentarios**
   - Explicar en el código el orden correcto de registro de rutas para evitar futuros conflictos.

## Checklist para quien lo tome
- [ ] Reordenar rutas en `server/src/index.js`.
- [ ] Probar manualmente todos los endpoints `/v1/dashboard/*`.
- [ ] Validar que el dashboard frontend muestre datos reales y enlaces clickeables.
- [ ] Documentar el fix en el repo.

---

> Issue generado automáticamente por GitHub Copilot tras auditoría y pruebas exhaustivas.
