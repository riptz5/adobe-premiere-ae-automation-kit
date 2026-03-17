### QA sessions (multiagente)

Usa este archivo para registrar las sesiones de QA guiadas por Planner/Implementer/Reviewer.

#### Ejemplo de entrada

- Fecha: 2026-03-16  
- Alcance: Music mode + QA básico en dashboard + panel CEP  
- Comando usado:  
  - `./scripts/run_codex_trio.sh -p "QA de music mode y dashboard" -- --oss --local-provider ollama`  
  - `./scripts/nowiswhen.sh --task "Revisión final v1.0.0-local-first" --implement --final-review`
- Resultados clave:
  - [ ] Jobs de prueba creados y ejecutados sin errores.
  - [ ] Music mode generó markers coherentes y se aplicaron en Premiere.
  - [ ] Dashboard mostró QA, scenes, b-roll y reframe sin errores.
  - [ ] Scripts AE/PS verificados con ejemplos.

