# Media Encoder Watch Folders (nota)

Esto no es “código” (es UI), pero es clave para automatizar en serio:
- Configuras un **Watch Folder** con preset(s) de export.
- Premiere/tu script deja exports en una carpeta.
- AME detecta y encodea solo.

Pasos:
1) Abre Adobe Media Encoder
2) Window > Watch Folders
3) Add Folder...
4) Asigna preset(s)
5) Listo: todo lo que caiga ahí se encola/renderiza.

Tip:
- Define naming convention: `{project}_{sequence}_{date}_{preset}.mp4`
- Si quieres hacerlo “server-driven”: el servidor genera el nombre y deja un `.json` al lado (metadata).
