# Essential Graphics / MOGRT (notes)

## Qué es automatizable vs UI
- Exponer controles (texto, colores, sliders) es totalmente soportado con el panel **Essential Graphics**.
- La *exportación* a `.mogrt` suele ser un paso de UI, porque depende del estado del panel y librerías.
  Este kit asume ese paso manual.

## Workflow recomendado
1) En AE, diseña tu comp (p.ej. `TEMPLATE`).
2) Abre: **Window > Essential Graphics**.
3) **Composition > Open in Essential Graphics**.
4) Arrastra a Essential Graphics:
   - Source Text de TITLE / SUBTITLE
   - Color controls (Fill/Stroke) que quieras editar en Premiere
   - Sliders para timings, offsets, etc.
5) Exporta:
   - Essential Graphics panel > **Export Motion Graphics Template...**
   - Guarda en Local Templates o CC Library

## Tip “chorísimo”
- Diseña tu lower-third como “data-driven”: si tus textos y colores se alimentan desde CSV/JSON, puedes:
  - generar cientos de renders en AE (batch)
  - y también entregar un MOGRT editable para el editor en Premiere
