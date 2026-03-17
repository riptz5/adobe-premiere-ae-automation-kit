# Agente orquestador (frontend + backend)

## Modelo que corre

El agente usa el **mismo LLM que el análisis de transcript**: el configurado en `config/default.json` (y overrides en `config/local.json`).

- **Por defecto**: `llm.model` = `llama3:8b`, `llm.baseUrl` = `http://localhost:11434/v1` (Ollama).
- Puedes cambiar modelo en Config (dashboard o `config/local.json`), por ejemplo a `llama3.2`, `mistral`, `codellama`, etc., según lo que tengas en Ollama.

Para ver qué modelo está usando el servidor:

```bash
curl -s http://localhost:8787/v1/config | jq '.config.llm.model'
```

## Qué puede hacer (sin excepciones)

El agente tiene **todas** las herramientas que expone el backend:

| Área | Acciones |
|------|----------|
| **Estado** | get_health, get_metrics, get_config |
| **Perfiles** | list_profiles, get_profile, create_profile, save_profile, delete_profile |
| **Config local** | get_local_config, save_local_config |
| **Jobs** | list_jobs, get_job, create_job, run_job, retry_job |
| **Media** | probe_media, run_qa, normalize_audio, scene_detect, reframe, music_analyze |
| **Análisis** | analyze_transcript |
| **B-roll** | broll_suggest |

Puedes pedir en lenguaje natural, por ejemplo:

- "¿Qué perfiles hay?" / "Lista los perfiles"
- "Cambia el perfil a ads" (get_profile + contexto)
- "Estado del servidor" / "¿Cómo está todo?"
- "Reintenta el último job que falló"
- "Crea un job con /ruta/video.mp4"
- "Haz QA de /ruta/video.mp4"

## Cómo probarlo

1. **Ollama en marcha** (mismo modelo que en config, p. ej. `llama3:8b`):

   ```bash
   ollama run llama3:8b
   # o solo: ollama serve
   ```

2. **Servidor AutoKit**:

   ```bash
   cd server && npm run dev
   ```

3. **Probar el agente por API**:

   ```bash
   curl -s -X POST http://localhost:8787/v1/agent/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"¿Cómo está el servidor? Responde en una frase."}' | jq .
   ```

4. **Probar en el dashboard**: abre http://localhost:8787, sección **4d · Agente**, y escribe por ejemplo "estado del servidor" o "lista de jobs".

## Script de prueba

```bash
./scripts/test_agent.sh
```

Comprueba `/health`, imprime el modelo en uso y hace un smoke test a `POST /v1/agent/chat`. Si devuelve **404**, reinicia el servidor para cargar la ruta del agente:

```bash
cd server && npm run dev
```

Para una respuesta real del LLM (requiere Ollama con el modelo configurado):

```bash
./scripts/test_agent.sh "estado del servidor"
```
