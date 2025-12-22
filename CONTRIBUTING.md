# Contribuir

Gracias por ayudar. Mantengamos este kit útil y práctico.

## Flujo rápido

1) Abre un issue describiendo el caso de uso y el output esperado.
2) Crea un PR pequeño y enfocado.
3) Incluye pasos de verificación reproducibles.

## Setup de desarrollo

- Node.js 18+
- Servidor:
  - `cd server && npm i && npm run dev`
  - Dashboard: `http://localhost:8787/`

## Buenas prácticas

- No commitees credenciales: usa `.env` (hay ejemplo en `server/.env.example`).
- No commitees artefactos runtime: `server/data/`, `server/models/`, `server/vendor/`, `server/node_modules/` (ya están en `.gitignore`).
- Cambios mínimos y legibles: evita refactors grandes sin motivo.

## Qué incluir en un PR

- Contexto (qué problema resuelve).
- Pasos para probarlo (comandos + inputs).
- Capturas/GIF si toca panel UI.

