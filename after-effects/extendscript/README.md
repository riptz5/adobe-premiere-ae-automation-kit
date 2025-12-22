# After Effects ExtendScript: Data-driven / batch

## generate_from_csv.jsx

- Duplica una comp plantilla por cada fila del CSV
- Setea textos (por nombre de capa)
- Reemplaza footage (por nombre de placeholder)
- Encola render (Render Queue)

## apply_markers_from_json.jsx

- Aplica markers desde JSON a la comp activa
- Útil para chapter/highlight markers generados por el server

### Uso
1) Abre AE y tu proyecto con una comp plantilla llamada `TEMPLATE`
2) Crea un CSV con headers, por ejemplo:
   - `compName,title,subtitle,assetPath`
3) File > Scripts > Run Script File... y elige `generate_from_csv.jsx`

> Nota: Exportar .mogrt suele ser un paso de UI (Essential Graphics). Mira `mogrt/ESSENTIAL_GRAPHICS_NOTES.md`.
