# Issues / Tareas ejecutables

## P0 - Pipeline core (local-first)
- [ ] Backend: job pipeline con STT -> LLM -> segments/markers -> outputs versionados.
- [ ] Watch folders: ingest de media + transcripts con auto-run y estado persistente.
- [ ] Dashboard local: crear job desde media path, ver resultados y markers.
- [ ] CEP panel: boton "Analizar media" aplica markers directo en secuencia activa.

## P1 - Integraciones Adobe
- [ ] Premiere: razor-cuts desde `segments` (keep/remove) en secuencia activa.
- [ ] Premiere: importar media + organizar bins por reglas config.
- [ ] AE: batch por CSV + aplicar markers desde JSON.
- [ ] Photoshop: crear composiciones con summary/highlights (texto + capas).

## P2 - Media/Audio/QA
- [ ] STT: presets por perfil (model size, language, VAD).
- [ ] Audio cleanup: normalizacion + denoise (local).
- [ ] QA tecnico: silencios, picos, negros, drift.

## P3 - Config/UX
- [ ] Config UI completa (tabs, toggles, perfiles).
- [ ] Perfiles: shorts/ads/longform/docu con defaults reales.
- [ ] Reportes por job + export de metadata.

## P4 - OSS
- [ ] Licencia MIT + CONTRIBUTING + ejemplo end-to-end.
- [ ] Scripts de setup (LLM + STT) y checklist de QA.
