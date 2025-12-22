# Frame.io upload (Node scripts)

## Ojo con versiones
- Adobe tiene docs actuales en developer.adobe.com/frameio (V4).
- Muchas integraciones siguen usando endpoints V2 (api.frame.io/v2) con developer tokens.

Este ejemplo usa el patrón V2 por simplicidad (bearer token), pero lo dejamos aislado para que lo adaptes a V4/OAuth.

## Uso
```bash
cd frameio
npm i
export FRAMEIO_TOKEN="..."
node upload.js /ruta/al/video.mp4 <PROJECT_ID> <FOLDER_ID>
```
