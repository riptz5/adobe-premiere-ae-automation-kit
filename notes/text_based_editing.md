# Text-based editing (alternativa automatizable)

Premiere tiene edición basada en texto a nivel UI. Si quieres automatizarlo, lo más robusto es:
1) Trabajar con transcript (VTT/SRT) con timecodes
2) Generar una lista de segmentos "keep" o "remove"
3) Aplicar cortes en la secuencia (razor) y borrar segmentos

Este kit NO hace razor-cuts completos porque dependen de clips/trackItems y tu estructura,
pero te deja:
- markers (capítulos/highlights)
- JSON de segmentos (fácil de agregar)
