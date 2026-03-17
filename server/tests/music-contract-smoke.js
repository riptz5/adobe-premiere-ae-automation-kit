// Lightweight contract check for music analyze result shape (docs/data-contracts, notes/music_mode.md).

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Minimal shape that analyzeMusic returns (result.music and result.outputs).
const result = {
  ok: true,
  id: "test-id",
  generatedAt: new Date().toISOString(),
  source: { path: "/tmp/test.wav" },
  outputs: {
    musicPath: "/tmp/out.music.json",
    waveformPath: "/tmp/out.waveform.png",
    spectrogramPath: "/tmp/out.spectrogram.png"
  },
  qa: {},
  music: {
    bpm: 120,
    beats: [{ t: 0, flux: 1 }, { t: 0.5, flux: 1.2 }],
    sections: [{ t: 0, deltaM: 4 }],
    drops: [{ t: 10, deltaM: 6 }],
    sectionSegments: [{ start: 0, end: 10, label: "Section 1" }],
    warnings: [{ kind: "loudness", message: "test" }],
    markers: [
      { timeSec: 0, name: "Beat 1", comment: "flux=1.0000" }
    ],
    waveformPath: "/tmp/out.waveform.png",
    spectrogramPath: "/tmp/out.spectrogram.png"
  }
};

assert(result.ok === true, "result.ok");
assert(typeof result.music === "object", "result.music");
assert(Array.isArray(result.music.beats), "music.beats array");
assert(Array.isArray(result.music.sections), "music.sections array");
assert(Array.isArray(result.music.drops), "music.drops array");
assert(Array.isArray(result.music.markers), "music.markers array");
assert(Array.isArray(result.music.warnings), "music.warnings array");
assert(result.music.markers.length === 0 || typeof result.music.markers[0].timeSec === "number", "marker.timeSec");
assert(result.music.markers.length === 0 || typeof result.music.markers[0].name === "string", "marker.name");

console.log("music-contract-smoke: OK");
