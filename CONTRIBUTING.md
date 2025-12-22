# Contribuir

Gracias por ayudar. Mantengamos este kit útil y práctico.

## Flujo rápido

1) **Multi-agent desde momento cero**: antes de tocar código, corre `./scripts/run_codex_trio.sh` (o `./scripts/nowiswhen.sh`) y usa el plan/review como base. No commitees `.codex-agents/` (logs/artefactos runtime).
2) Abre un issue describiendo el caso de uso y el output esperado.
3) Crea un PR pequeño y enfocado.
4) Incluye pasos de verificación reproducibles.

## Setup de desarrollo

- Node.js 18+
- Servidor:
  - `cd server && npm i && npm run dev`
  - Dashboard: `http://localhost:8787/`

## Buenas prácticas

- No commitees credenciales: usa `.env` (hay ejemplo en `server/.env.example`).
- No commitees artefactos runtime: `server/data/`, `server/models/`, `server/vendor/`, `server/node_modules/` (ya están en `.gitignore`).
- Cambios mínimos y legibles: evita refactors grandes sin motivo.
- Mantén rutas/IDs de API en inglés; docs pueden ser español.

## Qué incluir en un PR

- Contexto (qué problema resuelve).
- Pasos para probarlo (comandos + inputs).
- Capturas/GIF si toca panel UI.
