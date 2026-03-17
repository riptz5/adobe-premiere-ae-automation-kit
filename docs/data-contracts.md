### Job

```json
{
  "id": "string",
  "status": "queued | running | ready | error",
  "createdAt": "ISO-8601 string",
  "updatedAt": "ISO-8601 string",
  "profile": "string",
  "runMode": "auto | manual | dry-run",
  "input": {
    "transcript": "string | ''",
    "media": {
      "path": "string",
      "kind": "media"
    } | null,
    "source": "any | null"
  },
  "options": {
    "maxDurationSec": "number (opcional)",
    "...": "otros campos passthrough"
  },
  "events": [
    { "ts": "ISO-8601 string", "type": "string", "message": "string opcional" }
  ],
  "result": JobResult | undefined,
  "qa": QaReport | undefined,
  "qaMarkers": [Marker] | undefined,
  "scenes": [number] | undefined,
  "sceneSegments": [Segment] | undefined,
  "broll": [BrollItem] | undefined,
  "reframed": [ReframeOutput] | undefined,
  "outputs": {
    "resultPath"?: "string (ruta JSON)",
    "markersPath"?: "string",
    "summaryPath"?: "string (txt)",
    "qaPath"?: "string",
    "scenesPath"?: "string",
    "brollPath"?: "string",
    "reframePath"?: "string"
  }
}
```

### JobResult

```json
{
  "chapters": [Chapter],
  "segments": [Segment],
  "highlights": [Highlight],
  "markers": [Marker],
  "summary": "string",
  "source": "Heuristic | AI"
}
```

### Chapter

```json
{ "start": number, "end": number, "title": "string" }
```

### Segment

```json
{ "start": number, "end": number, "label": "string", "action": "keep" | "remove" }
```

### Highlight

```json
{ "start": number, "end": number, "label": "string", "score"?: number }
```

### Marker (genérico)

```json
{
  "timeSec": number,
  "name": "string",
  "comment": "string",
  "type"?: "chapter" | "highlight" | "qa" | "music" | "section" | "drop" | "other"
}
```

### QA (analyzeMedia / /v1/qa/analyze)

```json
{
  "ok": true,
  "qa": QaReport
}
```

```json
{
  "silence": [
    { "start": number, "end"?: number, "duration"?: number }
  ],
  "black": [
    { "start": number, "end": number, "duration": number }
  ],
  "loudness": {
    "integrated"?: number,
    "lra"?: number,
    "maxVolume"?: number,
    "meanVolume"?: number,
    "timeline"?: [
      { "t": number, "M"?: number, "S"?: number, "I"?: number, "LRA"?: number }
    ]
  },
  "timeStats"?: {
    "channels": [
      { "channel": number, "stats": { "...": "number|string|null" } }
    ],
    "overall": { "...": "number|string|null" }
  },
  "spectralStats"?: {
    "channels": [
      {
        "channel": number,
        "summary": {
          "centroid"?: { "avg": number, "min": number, "max": number },
          "rolloff"?: { "avg": number, "min": number, "max": number },
          "flatness"?: { "avg": number, "min": number, "max": number },
          "flux"?: { "avg": number, "min": number, "max": number }
        }
      }
    ]
  }
}
```

### Scenes (detectScenes / /v1/scene/detect y /v1/jobs/:id/scenes)

```json
{
  "ok": true,
  "scenes": [number]
}
```

En `/v1/jobs/:id/scenes`:

```json
{
  "ok": true,
  "scenes": [number],
  "segments": [ { "start": number, "end": number } ]
}
```

### B-roll (suggestBroll / /v1/broll/suggest y /v1/jobs/:id/broll)

```json
{
  "ok": true,
  "broll": [BrollItem]
}
```

```json
{ "path": "string (ruta absoluta)", "score": number }
```

### Reframe (reframeAll / /v1/reframe y /v1/jobs/:id/reframe)

```json
{
  "ok": true,
  "outputs": [ReframeOutput]
}
```

```json
{
  "target": "string (p.ej. \"9:16\")",
  "ok": boolean,
  "outputPath"?: "string",
  "error"?: "string"
}
```

En `/v1/jobs/:id/reframe` el campo principal es:

```json
{ "ok": true, "reframed": [ReframeOutput] }
```

### Music mode (analyzeMusic / /v1/music/analyze)

```json
{
  "ok": true,
  "id": "string (uuid)",
  "generatedAt": "ISO-8601 string",
  "source": { "path": "string" },
  "outputs": {
    "musicPath": "string (JSON principal)",
    "waveformPath": "string|null",
    "spectrogramPath": "string|null"
  },
  "qa": QaReport,
  "music": {
    "bpm": number|null,
    "beats": [ { "t": number, "flux": number } ],
    "sections": [ { "t": number, "deltaM": number } ],
    "drops": [ { "t": number, "deltaM": number } ],
    "sectionSegments": [ { "start": number, "end": number, "label": "string" } ],
    "warnings": [
      { "kind": "string", "message": "string" }
    ],
    "markers": [Marker]
  }
}
```

El archivo `*.music.json` guardado en `server/data/results` usa este mismo shape.

### Configuración (/v1/config, /v1/config/profile/:name, /v1/config/local)

```json
{
  "ok": true,
  "config": AutokitConfig
}
```

```json
{
  "profile": "string",
  "autoRun": boolean,
  "runMode": "auto" | "manual" | "dry-run",
  "logLevel": "info" | "debug" | "warn" | "error",
  "server": { "port": number },
  "paths": {
    "dataDir": "string",
    "jobsDir": "string",
    "logsDir": "string",
    "resultsDir": "string",
    "absDataDir": "string",
    "absJobsDir": "string",
    "absLogsDir": "string",
    "absResultsDir": "string",
    "absNormalizedDir": "string",
    "absBrollDir": "string",
    "absReframeDir": "string"
  },
  "features": {
    "useLLM": boolean,
    "useFallbacks": boolean,
    "useScenes": boolean,
    "useBroll": boolean,
    "useReframe": boolean
  },
  "analyze": {
    "chapterTargetSec": number,
    "highlightMax": number
  },
  "llm": {
    "enabled": boolean,
    "provider": "ollama" | "llama.cpp",
    "baseUrl": "string",
    "apiKey": "string",
    "model": "string",
    "temperature": number,
    "maxTranscriptChars": number,
    "timeoutMs": number
  },
  "stt": {
    "engine": "whisper.cpp" | "faster-whisper",
    "modelSize": "string",
    "language": "string",
    "vad": boolean,
    "format": "vtt" | "srt" | "txt",
    "command": "string",
    "modelPath": "string"
  },
  "output": {
    "writeResult": boolean,
    "writeMarkers": boolean,
    "writeSegments": boolean,
    "writeChapters": boolean,
    "writeSummary": boolean,
    "writeTranscript": boolean,
    "writeQa": boolean,
    "writeScenes": boolean,
    "writeBroll": boolean,
    "writeReframe": boolean,
    "useSourceName": boolean,
    "resultDir": "string"
  },
  "render": {
    "presetPath": "string",
    "outputDir": "string"
  },
  "integrations": {
    "frameio": {
      "enabled": boolean,
      "token": "string",
      "projectId": "string",
      "folderId": "string"
    },
    "adobeStock": {
      "enabled": boolean,
      "apiKey": "string"
    },
    "apiMesh": {
      "enabled": boolean,
      "baseUrl": "string"
    }
  },
  "broll": {
    "libraryDir": "string",
    "maxResults": number,
    "minScore": number
  },
  "scene": {
    "threshold": number
  },
  "reframe": {
    "enabled": boolean,
    "targets": [ "string" ],
    "outputDir": "string"
  },
  "audio": {
    "normalize": boolean,
    "targetI": number,
    "truePeak": number,
    "lra": number,
    "denoise": boolean,
    "denoiseLevel": number,
    "highpassHz": number,
    "lowpassHz": number,
    "voicePresenceDb": number,
    "outputDir": "string"
  },
  "qa": {
    "enabled": boolean,
    "silenceThresholdDb": number,
    "silenceMinSec": number,
    "blackThreshold": number,
    "blackMinSec": number,
    "spectral": boolean
  },
  "music": {
    "enabled": boolean,
    "beat": {
      "minGapSec": number,
      "thresholdPctl": number,
      "max": number
    },
    "sections": {
      "minGapSec": number,
      "windowSec": number,
      "deltaDb": number,
      "dropDeltaDb": number
    },
    "assets": {
      "waveformSize": "string",
      "spectrogramSize": "string"
    }
  },
  "watch": {
    "enabled": boolean,
    "folders": [
      "string" | { "path": "string", "profile"?: "string", "autoRun"?: boolean, "...": "otros campos" }
    ],
    "extensions": [ "string" ],
    "mediaExtensions": [ "string" ],
    "debounceMs": number
  }
}
```

`/v1/config/local` devuelve:

```json
{ "ok": true, "local": AutokitConfigPartial }
```

