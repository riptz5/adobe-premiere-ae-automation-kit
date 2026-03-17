### 30 ideas (clusterizadas) y selección de 18

Cluster|ID|Idea|Componentes|Estado
---|---|---|---|---
A|A1|Vista de jobs tipo “tabla Kanban” (queued/running/done/error) con filtros por perfil.|Dashboard web (`public`, `web`)|Seleccionada
A|A2|Detalle de job unificado (result, markers, segments, QA, scenes, music) en una sola pantalla con tabs.|Dashboard web|Seleccionada
A|A3|Panel Music Mode dedicado en dashboard con preview de waveform/spectrograma y lista de markers.|Dashboard web|Seleccionada
A|A4|Panel QA dedicado con gráficos simples (barras para silencio/black/loudness) y export CSV.|Dashboard web|Seleccionada
A|A5|Selector rápido de perfil + resumen de config actual en la cabecera del dashboard y panel CEP.|Dashboard, CEP|Seleccionada
A|A6|Wizard inicial “primer uso” que ayude a generar `config/local.json` con defaults recomendados.|Dashboard|No seleccionada
A|A7|Atajos de teclado básicos en dashboard (crear job, refrescar jobs, abrir último job).|Dashboard|No seleccionada

B|B1|Modo “Highlight reels” que genere solo segments tipo highlights a partir de transcript (sin edición manual).|Server `analyze`, CEP, AE|Seleccionada
B|B2|Integrar scenes+text-based editing: usar `sceneSegments` como base para sugerir cortes en panel CEP.|Server `scene`, CEP|Seleccionada
B|B3|Sugerencias de B-roll contextuales visibles directamente en dashboard y exportables como CSV para bibliotecas.|Server `broll`, dashboard|Seleccionada
B|B4|Perfil “Trailer/Teaser” preconfigurado con highlights agresivos y music mode tuned a drops.|Config perfiles, server, dashboard|Seleccionada
B|B5|Plantillas de timelines (shorts, ads, docu) documentadas en `examples/` con markers/segments predefinidos.|Docs/examples, CEP|Seleccionada
B|B6|Modo “Podcast video” con layout específico para cortes de silencios largos + QA marcado.|Server `qa`, CEP|No seleccionada
B|B7|Integración opcional con servicios de subtítulos externos (solo hook/documentado).|Docs, scripts|No seleccionada

C|C1|Sistema de logging estructurado por job (JSON log por módulo) con niveles (info/debug/warn/error).|Server|Seleccionada
C|C2|Métrica de duración total de pipeline por job y breakdown por etapa (STT, LLM, QA, scenes, music).|Server `pipeline`, dashboard|Seleccionada
C|C3|Retry idempotente de jobs fallidos con reuso de artefactos existentes si es posible.|Server `jobs`, `pipeline`|Seleccionada
C|C4|Health-check extendido que reporte dependencias críticas (ffmpeg, whisper, modelos descargados).|Server `/health`, dashboard|Seleccionada
C|C5|Export sencillo de logs/QA por job en un zip (para debug).|Server, dashboard|No seleccionada
C|C6|Throttling/config fácil de `maxConcurrentJobs` para trabajar en paralelo pero sin saturar máquina.|Server `pipeline`, config|No seleccionada

D|D1|Comando “plan+implement+review” preconfigurado para tareas frecuentes (`nowiswhen` presets en docs).|Scripts, docs|Seleccionada
D|D2|Plantillas de prompts multiagente específicas para QA de export, tuning de perfiles y nuevas features.|Docs `notes/multi-agent-*`|Seleccionada
D|D3|Registro ligero de sesiones multiagente con resumen en `notes/multi-agent/` (qué se decidió y por qué).|Scripts, docs|Seleccionada
D|D4|Script helper para correr varios análisis batch (varios medios) usando multiagente como supervisor.|Scripts, server CLI|No seleccionada
D|D5|Integrar en README una sección clara de “multiagent workflow” paso a paso.|README, CONTRIBUTING|Seleccionada
D|D6|Soporte para ejecutar pruebas automatizadas disparadas desde `run_codex_trio.sh` como paso post-implementer.|Scripts, tests|No seleccionada

E|E1|Script `setup.sh` que instale todas las dependencias (server, web) y prepare config mínima.|Scripts, README|Seleccionada
E|E2|Comando único `run_all.sh` mejorado que arranque server, dashboard web (Next) y watchers coherentemente.|Scripts, server, web|Seleccionada
E|E3|Paquete NPM CLI simple (`autokit-cli`) que envuelva los endpoints básicos (`analyze`, `job`, `music`).|Server/CLI empaquetado|No seleccionada
E|E4|Tres ejemplos completos en `examples/` (shorts, ads, longform/docu) con assets falsos y README detallado.|Examples, docs|Seleccionada
E|E5|Checklist de release y sección “Mi flujo ideal” en docs para fijar cómo se usa el producto día a día.|Docs, README, notes|Seleccionada
E|E6|Plantilla de issue/PR en `.github/` adaptada a este repo (multiagente, QA mínimo, pasos de prueba).|.github, CONTRIBUTING|No seleccionada

### Resumen de las 18 ideas seleccionadas

- **UX/UI (A)**: A1, A2, A3, A4, A5  
- **Creativo (B)**: B1, B2, B3, B4, B5  
- **Robustez (C)**: C1, C2, C3, C4  
- **Multiagente (D)**: D1, D2, D3, D5  
- **Productización (E)**: E1, E2, E4, E5

Las ideas no seleccionadas quedan como backlog opcional, fuera del alcance de la versión “producto terminado” actual.

---

### Diseño resumido por idea seleccionada

#### A1 – Vista Kanban de jobs
- **Objetivo**: ver el estado de todos los jobs de un vistazo (queued/running/done/error) y poder filtrar por perfil.
- **Flujo**: desde el dashboard, pestaña “Jobs”, mostrar columnas por estado alimentadas desde `/v1/jobs`; clic en un job abre el detalle (A2).
- **Cambios**:
  - Dashboard (`public/main.js`, `web/app/page.tsx`): nueva vista y mapping de estados.
  - Sin cambios en server (ya expone `/v1/jobs`).

#### A2 – Detalle de job unificado
- **Objetivo**: consolidar en una página todos los outputs de un job (result, markers, segments, summary, QA, scenes, b-roll, reframe, music).
- **Flujo**: clic en job → vista detalle con tabs (Result, Markers, Segments, QA, Scenes/B-roll, Reframe, Music).
- **Cambios**:
  - Dashboard: nueva pantalla que llama a `/v1/jobs/:id/*` según tab.
  - Docs: enlazar esta vista desde `docs/architecture.md`.

#### A3 – Panel Music Mode en dashboard
- **Objetivo**: explotar bien los outputs de `analyzeMusic` (`music.markers`, waveform, spectrograma).
- **Flujo**: panel “Music” en dashboard donde se selecciona archivo o job, se lanza `/v1/music/analyze` y se listan markers/QA, mostrando paths de waveform/spectrogram.
- **Cambios**:
  - Dashboard: sección dedicada que consume el contrato `Music mode` definido en `docs/data-contracts.md`.

#### A4 – Panel QA dedicado
- **Objetivo**: ver rápidamente problemas de silencio/black/loudness y exportar CSV para análisis externo.
- **Flujo**: tab “QA” en detalle de job (A2) que llama a `/v1/jobs/:id/qa` y permite descargar CSV usando `qaToCsv`.
- **Cambios**:
  - Server: exponer helper de CSV si hacemos un endpoint `/v1/jobs/:id/qa.csv` (opcional).
  - Dashboard: UI con métricas básicas y botón “Export CSV”.

#### A5 – Selector rápido de perfil
- **Objetivo**: cambiar de perfil sin tocar archivos a mano, y ver siempre qué perfil está activo.
- **Flujo**: en header de dashboard y panel CEP, dropdown que usa `/v1/config/profiles` y `/v1/config/profile/:name`.
- **Cambios**:
  - Dashboard + CEP: añadir selector y refresco de snapshot de config.

#### B1 – Modo “Highlight reels”
- **Objetivo**: generar cortes rápidos tipo highlights para redes sociales sin edición manual.
- **Flujo**: opción de job “Highlight only” que pide solo `segments` tipo highlight (desde transcript) y los exporta como JSON para CEP/AE.
- **Cambios**:
  - Server `analyze.js`: soportar flag en opciones para priorizar highlights.
  - Dashboard/panel CEP: toggle “Highlight reels”.

#### B2 – Scenes + text-based editing
- **Objetivo**: usar detección de escenas para ayudar a definir segmentos de edición basados en imagen.
- **Flujo**: al correr `/v1/scene/detect` se rellena `sceneSegments` y el panel CEP permite aplicar esos segmentos como cortes.
- **Cambios**:
  - Server `scene.js`, `pipeline.js`: guardar `sceneSegments` en job.
  - CEP: UI para “Apply scene segments”.

#### B3 – Sugerencias de B-roll contextuales
- **Objetivo**: recomendar clips de B-roll existentes según el texto del job.
- **Flujo**: desde detail de job, tab “B-roll” que muestra items devueltos por `/v1/broll/suggest` (p.ej. usando summary o transcript).
- **Cambios**:
  - Dashboard: usar `suggestBroll` con texto relevante.

#### B4 – Perfil “Trailer/Teaser”
- **Objetivo**: presets de análisis agresivo para trailers/cortes muy dinámicos.
- **Flujo**: nuevo perfil en `config/profiles/trailer.json` ajustando `analyze.highlightMax`, `music.sections`, etc.
- **Cambios**:
  - Config: nuevo perfil + doc en `notes/configuration.md`.

#### B5 – Plantillas de timelines en examples
- **Objetivo**: dar ejemplos concretos de cómo se ve un proyecto real con markers y segments.
- **Flujo**: carpeta `examples/` con JSONs y README que expliquen cómo importarlos en Premiere/AE.
- **Cambios**:
  - `examples/`: nuevos archivos y docs.

#### C1 – Logging estructurado por job
- **Objetivo**: facilitar debug y entender por qué un job falló.
- **Flujo**: cada job genera un log JSON en `paths.absLogsDir` con eventos por etapa.
- **Cambios**:
  - Server: pequeña capa de logging en `pipeline.js`/`jobs.js`.

#### C2 – Métricas de duración de pipeline
- **Objetivo**: ver cuánto tarda cada etapa del pipeline.
- **Flujo**: almacenar timestamps de inicio/fin por etapa en el job y mostrarlos en dashboard.
- **Cambios**:
  - Server: `pipeline.js` añade métricas.
  - Dashboard: sección de “Timing”.

#### C3 – Retry idempotente de jobs
- **Objetivo**: reintentar jobs fallidos sin duplicar artefactos innecesariamente.
- **Flujo**: botón “Retry” en detail de job que llama a `/v1/jobs/:id/run` reusando input/paths.
- **Cambios**:
  - Server: robustecer `runJob` para estados previos.

#### C4 – Health-check extendido
- **Objetivo**: saber rápidamente si ffmpeg, whisper y modelos están disponibles.
- **Flujo**: `/health` devuelve flags de dependencias y dashboard/CEP los muestran.
- **Cambios**:
  - Server: extender payload de `/health`.
  - Dashboard/CEP: UI de estado.

#### D1 – Presets para `nowiswhen`
- **Objetivo**: facilitar uso de multiagente para tareas repetidas.
- **Flujo**: docs con ejemplos de comandos `nowiswhen` para refactors, QA y releases.
- **Cambios**:
  - Docs: sección en `README`/`AGENTS.md`/`notes`.

#### D2 – Plantillas de prompts multiagente
- **Objetivo**: no inventar prompts cada vez que se usa multiagente.
- **Flujo**: ampliar `notes/multi-agent-prompts.example.txt` con secciones específicas (QA, config, nuevas features).
- **Cambios**:
  - Docs: edición del archivo de ejemplos.

#### D3 – Registro ligero de sesiones multiagente
- **Objetivo**: dejar trazabilidad de decisiones clave.
- **Flujo**: scripts multiagente guardan un pequeño resumen `summary.md` en `notes/multi-agent/<timestamp>/`.
- **Cambios**:
  - Scripts: pequeña mejora para generar resumen.

#### D5 – Sección “multiagent workflow” en README
- **Objetivo**: que cualquier persona entienda cómo aplicar la regla MULTIAGENT desde el día 0.
- **Flujo**: nueva sección en `README` que describe paso a paso cuándo usar `run_codex_trio.sh` y `nowiswhen.sh`.
- **Cambios**:
  - Docs: actualización de `README.md`.

#### E1 – Script `setup.sh` completo
- **Objetivo**: instalación en un solo comando en macOS con Node instalado.
- **Flujo**: `./setup.sh` instala deps de `server`/`web`, verifica ffmpeg y crea un `config/local.json` base.
- **Cambios**:
  - Script existente `setup.sh`: completarlo según docs.

#### E2 – `run_all.sh` mejorado
- **Objetivo**: lanzar todo (server + dashboard + watchers) con un solo comando.
- **Flujo**: `./run_all.sh` arranca server y, si se usa Next, el dashboard Next; opcionalmente abre el navegador.
- **Cambios**:
  - Script `run_all.sh`: alinearlo con arquitectura actual.

#### E4 – Tres ejemplos completos
- **Objetivo**: enseñar de forma concreta cómo usar el kit para shorts, ads y longform/docu.
- **Flujo**: subcarpetas en `examples/` con README, assets falsos y comandos recomendados.
- **Cambios**:
  - `examples/`: nuevas carpetas + docs.

#### E5 – Checklist de release y “Mi flujo ideal”
- **Objetivo**: capturar la definición de “producto terminado” y tu flujo personal.
- **Flujo**: `notes/release-checklist.md` y sección “Mi flujo ideal” en `README` o `notes/STATUS.md`.
- **Cambios**:
  - Docs: nuevos/actualizados archivos de checklist y flujo personal.

