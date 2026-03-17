### Matriz idea × componente

IdeaID|Descripción corta|Server|Dashboard|Premiere CEP|AE/PS|Scripts/Docs
---|---|---|---|---|---|---
A1|Vista Kanban de jobs|||X|||
A2|Detalle unificado de job|||X|||
A3|Panel Music Mode|||X||| 
A4|Panel QA dedicado||X|||| 
A5|Selector rápido de perfil||X|X|||
B1|Highlight reels|X|X|X|X||
B2|Scenes + text-based editing|X||X|||
B3|B-roll contextual|X|X||||
B4|Perfil Trailer/Teaser|X|X||||
B5|Timelines ejemplo en `examples/`||||X|X
C1|Logging estructurado|X|||||
C2|Métricas de duración pipeline|X|X|||| 
C3|Retry idempotente de jobs|X|X|X|||
C4|Health check extendido|X|X|X|||
D1|Presets `nowiswhen`||| | |X
D2|Plantillas prompts multiagente|||||X
D3|Registro ligero sesiones multiagente|||||X
D5|Sección “multiagent workflow” en README|||||X
E1|Script `setup.sh` completo|||||X
E2|`run_all.sh` mejorado||| | |X
E4|Tres ejemplos completos en `examples/`||||X|X
E5|Checklist release + “Mi flujo ideal”|||||X

### Fases de implementación (alto nivel)

1. **Infra de datos y docs (COMPLETADA)**  
   - `docs/docs-index.md`, `docs/data-contracts.md`, `notes/master-backlog.md`, `notes/ideas-18-selected.md`, `docs/architecture.md`.

2. **Server: robustez y contratos**  
   - Implementar C1–C4, B1–B3, B2 (sceneSegments), B4.

3. **Dashboard**  
   - Implementar A1–A5, A3, A4, integrar vistas para Music/QA/B-roll/Scenes y selector de perfil.

4. **Premiere/AE/PS**  
   - Cablear B1–B3/B5 en CEP, AE y PS usando los contratos actualizados.

5. **Multiagente + scripts + productización**  
   - Implementar D1–D3, D5, E1–E2, E4–E5.

