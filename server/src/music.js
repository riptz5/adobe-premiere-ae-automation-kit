import { spawn } from "child_process";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import { analyzeMedia, qaToMarkers } from "./qa.js";

function runFfmpeg(args, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", args);
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve({ ok: false, error: "ffmpeg timed out" });
    }, timeoutMs);

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      if (err.code === "ENOENT") return resolve({ ok: false, error: "ffmpeg not found" });
      return resolve({ ok: false, error: err.message });
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return resolve({ ok: false, error: stderr || `ffmpeg exited ${code}` });
      return resolve({ ok: true, stderr });
    });
  });
}

function parseAspectralFrames(stderr, { channel = 1, keepMetrics = ["flux", "centroid", "rolloff", "flatness"] } = {}) {
  const lines = stderr.split(/\r?\n/);
  const frameRe = /frame:\s*\d+\s+pts:\s*\d+\s+pts_time:([0-9.]+)/;
  const metricRe = /lavfi\.aspectralstats\.(\d+)\.([a-zA-Z_]+)=([-0-9.eE]+)/;
  const keep = new Set(keepMetrics);
  const frames = [];

  let currentT = null;
  let current = {};

  const flush = () => {
    if (currentT == null) return;
    frames.push({ t: currentT, ...current });
    currentT = null;
    current = {};
  };

  for (const line of lines) {
    const mFrame = frameRe.exec(line);
    if (mFrame) {
      flush();
      const t = Number(mFrame[1]);
      currentT = Number.isFinite(t) ? t : null;
      continue;
    }
    const mMetric = metricRe.exec(line);
    if (!mMetric) continue;
    const ch = Number(mMetric[1]);
    if (ch !== channel) continue;
    const key = mMetric[2];
    if (!keep.has(key)) continue;
    const val = Number(mMetric[3]);
    if (!Number.isFinite(val)) continue;
    current[key] = val;
  }
  flush();
  return frames;
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
  return sorted[idx];
}

function detectFluxPeaks(frames, { minGapSec = 0.28, thresholdPctl = 92, maxPeaks = 400 } = {}) {
  const points = frames
    .map((f) => ({ t: f.t, flux: f.flux }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.flux));

  if (points.length < 3) return [];
  const fluxVals = points.map((p) => p.flux);
  const thr = percentile(fluxVals, thresholdPctl);
  if (thr == null) return [];

  const peaks = [];
  let lastT = -Infinity;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    if (cur.flux < thr) continue;
    if (!(cur.flux > prev.flux && cur.flux >= next.flux)) continue;
    if (cur.t - lastT < minGapSec) continue;
    peaks.push({ t: cur.t, flux: cur.flux });
    lastT = cur.t;
    if (peaks.length >= maxPeaks) break;
  }
  return peaks;
}

function detectSectionBoundaries(loudnessTimeline, { minGapSec = 10, windowSec = 4, deltaDb = 4 } = {}) {
  const points = (loudnessTimeline || [])
    .map((f) => ({ t: Number(f.t), M: f.M }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.M));

  if (points.length < 3) return [];
  const boundaries = [];
  let lastBoundary = -Infinity;

  let j = 0;
  for (let i = 0; i < points.length; i++) {
    while (j < i && points[i].t - points[j].t > windowSec) j++;
    const jj = Math.max(0, j - 1);
    const delta = points[i].M - points[jj].M;
    if (Math.abs(delta) < deltaDb) continue;
    if (points[i].t - lastBoundary < minGapSec) continue;
    boundaries.push({ t: points[i].t, deltaM: delta });
    lastBoundary = points[i].t;
  }
  return boundaries;
}

function estimateBpmFromPeaks(peaks) {
  if (!peaks || peaks.length < 4) return null;
  const intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    const dt = peaks[i].t - peaks[i - 1].t;
    if (!Number.isFinite(dt)) continue;
    if (dt < 0.25 || dt > 1.2) continue; // 50–240 BPM-ish
    intervals.push(dt);
  }
  if (!intervals.length) return null;
  const med = percentile(intervals, 50);
  if (!med || med <= 0) return null;
  return 60 / med;
}

async function generateWaveform(mediaPath, outPath, size) {
  const waveformSize = size || "1400x280";
  const args = [
    "-hide_banner",
    "-y",
    "-i", mediaPath,
    "-vn",
    "-sn",
    "-dn",
    "-filter_complex", `showwavespic=s=${waveformSize}:colors=22d3ee|38bdf8`,
    "-frames:v", "1",
    outPath
  ];
  return runFfmpeg(args, 3 * 60 * 1000);
}

async function generateSpectrogram(mediaPath, outPath, size) {
  const spectrogramSize = size || "1400x560";
  const args = [
    "-hide_banner",
    "-y",
    "-i", mediaPath,
    "-vn",
    "-sn",
    "-dn",
    "-filter_complex", `showspectrumpic=s=${spectrogramSize}:legend=0:color=fiery`,
    "-frames:v", "1",
    outPath
  ];
  return runFfmpeg(args, 3 * 60 * 1000);
}

export async function analyzeMusic(mediaPath, config) {
  if (config.music?.enabled === false) {
    return { ok: false, error: "music mode disabled in config" };
  }
  const resultsDir = config.paths.absResultsDir || config.paths.absDataDir;
  await fs.mkdir(resultsDir, { recursive: true });

  const id = crypto.randomUUID();
  const parsed = path.parse(mediaPath);
  const baseName = `${parsed.name}__music__${id}`;
  const musicPath = path.join(resultsDir, `${baseName}.music.json`);
  const waveformPath = path.join(resultsDir, `${baseName}.waveform.png`);
  const spectrogramPath = path.join(resultsDir, `${baseName}.spectrogram.png`);

  const qa = await analyzeMedia(mediaPath, config);
  if (!qa.ok) return qa;
  const qaMarkers = qaToMarkers(qa.qa);

  const spectralArgs = [
    "-hide_banner",
    "-i", mediaPath,
    "-vn",
    "-sn",
    "-dn",
    "-af", "aspectralstats=win_size=8192:overlap=0.5,ametadata=mode=print",
    "-f", "null", "-"
  ];
  const spectralRun = await runFfmpeg(spectralArgs, 6 * 60 * 1000);
  if (!spectralRun.ok) return spectralRun;
  const spectralFrames = parseAspectralFrames(spectralRun.stderr);
  const beatPeaks = detectFluxPeaks(spectralFrames, {
    minGapSec: config.music?.beat?.minGapSec ?? 0.28,
    thresholdPctl: config.music?.beat?.thresholdPctl ?? 92,
    maxPeaks: config.music?.beat?.max ?? 400
  });
  const beatMarkers = beatPeaks.map((p, idx) => ({
    timeSec: p.t,
    name: `Beat ${idx + 1}`,
    comment: `flux=${p.flux.toFixed(4)}`
  }));
  const bpm = estimateBpmFromPeaks(beatPeaks);

  const sectionBounds = detectSectionBoundaries(qa.qa?.loudness?.timeline, {
    minGapSec: config.music?.sections?.minGapSec ?? 12,
    windowSec: config.music?.sections?.windowSec ?? 4,
    deltaDb: config.music?.sections?.deltaDb ?? 4
  });
  const sectionMarkers = sectionBounds.map((b, idx) => ({
    timeSec: b.t,
    name: `Section ${idx + 1}`,
    comment: `ΔM=${b.deltaM.toFixed(2)} LUFS`
  }));

  const dropDeltaDb = config.music?.sections?.dropDeltaDb ?? 6;
  const dropMarkers = sectionBounds
    .filter((b) => b.deltaM >= dropDeltaDb)
    .map((b, idx) => ({
      timeSec: b.t,
      name: `DROP ${idx + 1}`,
      comment: `ΔM=${b.deltaM.toFixed(2)} LUFS`
    }));

  const warnings = [];
  const targetI = config.audio?.targetI ?? -16;
  const integrated = qa.qa?.loudness?.integrated;
  if (Number.isFinite(integrated)) {
    const diff = integrated - targetI;
    if (Math.abs(diff) >= 3) {
      warnings.push({
        kind: "loudness.integrated",
        message: `Integrated loudness ${integrated} LUFS vs target ${targetI} (diff ${diff.toFixed(1)} LUFS)`
      });
    }
  }
  const maxVolume = qa.qa?.loudness?.maxVolume;
  if (Number.isFinite(maxVolume) && maxVolume > -1.0) {
    warnings.push({
      kind: "peak",
      message: `max_volume ${maxVolume} dB (cerca de 0 dBFS)`
    });
  }

  const warningMarkers = warnings.map((w, idx) => ({
    timeSec: 0,
    name: `WARN ${idx + 1}`,
    comment: `${w.kind}: ${w.message}`
  }));

  const waveform = await generateWaveform(mediaPath, waveformPath, config.music?.assets?.waveformSize);
  const spectrogram = await generateSpectrogram(mediaPath, spectrogramPath, config.music?.assets?.spectrogramSize);

  const timeline = qa.qa?.loudness?.timeline || [];
  const durationSec = timeline.length
    ? timeline[timeline.length - 1].t
    : 0;
  const sortedBounds = [...sectionBounds].sort((a, b) => a.t - b.t);
  const sectionStarts = [0, ...sortedBounds.map((b) => b.t)];
  const sectionSegments = sectionStarts.map((start, idx) => {
    const end = idx + 1 < sectionStarts.length ? sectionStarts[idx + 1] : durationSec;
    return { start, end, label: `Section ${idx + 1}` };
  });

  const result = {
    ok: true,
    id,
    generatedAt: new Date().toISOString(),
    source: { path: mediaPath },
    outputs: {
      musicPath,
      waveformPath: waveform.ok ? waveformPath : null,
      spectrogramPath: spectrogram.ok ? spectrogramPath : null
    },
    qa: qa.qa,
    music: {
      bpm,
      beats: beatPeaks,
      sections: sectionBounds,
      drops: sectionBounds.filter((b) => b.deltaM >= dropDeltaDb),
      sectionSegments,
      warnings,
      markers: [...warningMarkers, ...qaMarkers, ...sectionMarkers, ...dropMarkers, ...beatMarkers]
        .sort((a, b) => (a.timeSec || 0) - (b.timeSec || 0)),
      waveformPath: waveform.ok ? waveformPath : undefined,
      spectrogramPath: spectrogram.ok ? spectrogramPath : undefined
    }
  };

  await fs.writeFile(musicPath, JSON.stringify(result, null, 2), "utf8");
  return result;
}
