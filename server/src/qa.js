import { spawn } from "child_process";

function runFfmpeg(args, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", args);
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve({ ok: false, error: "ffmpeg timed out" });
    }, timeoutMs);

    proc.stderr.on("data", chunk => { stderr += chunk.toString(); });
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

function parseSilence(stderr) {
  const events = [];
  const startRe = /silence_start:\s*([0-9.]+)/g;
  const endRe = /silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/g;
  let match;
  while ((match = startRe.exec(stderr))) {
    events.push({ start: Number(match[1]) });
  }
  while ((match = endRe.exec(stderr))) {
    const end = Number(match[1]);
    const duration = Number(match[2]);
    const last = events.find(e => e.start != null && e.end == null);
    if (last) {
      last.end = end;
      last.duration = duration;
    } else {
      events.push({ end, duration });
    }
  }
  return events;
}

function parseBlack(stderr) {
  const events = [];
  const re = /black_start:\s*([0-9.]+)\s*black_end:\s*([0-9.]+)\s*black_duration:\s*([0-9.]+)/g;
  let match;
  while ((match = re.exec(stderr))) {
    events.push({ start: Number(match[1]), end: Number(match[2]), duration: Number(match[3]) });
  }
  return events;
}

function parseLoudness(stderr) {
  const iRe = /I:\s*(-?[0-9.]+)\s*LUFS/g;
  const lraRe = /LRA:\s*([0-9.]+)/g;
  const maxRe = /max_volume:\s*(-?[0-9.]+)\s*dB/g;
  const meanRe = /mean_volume:\s*(-?[0-9.]+)\s*dB/g;
  let match;
  let integrated = null;
  let lra = null;
  let maxVolume = null;
  let meanVolume = null;
  while ((match = iRe.exec(stderr))) {
    integrated = Number(match[1]);
  }
  while ((match = lraRe.exec(stderr))) {
    lra = Number(match[1]);
  }
  while ((match = maxRe.exec(stderr))) {
    maxVolume = Number(match[1]);
  }
  while ((match = meanRe.exec(stderr))) {
    meanVolume = Number(match[1]);
  }
  return { integrated, lra, maxVolume, meanVolume };
}

export async function analyzeMedia(mediaPath, config) {
  const silenceThreshold = config.qa?.silenceThresholdDb ?? -40;
  const silenceMin = config.qa?.silenceMinSec ?? 1.0;
  const blackThreshold = config.qa?.blackThreshold ?? 0.1;
  const blackMin = config.qa?.blackMinSec ?? 0.2;

  const args = [
    "-hide_banner",
    "-i", mediaPath,
    "-vf", `blackdetect=d=${blackMin}:pic_th=${blackThreshold}`,
    "-af", `silencedetect=noise=${silenceThreshold}dB:d=${silenceMin},ebur128,volumedetect`,
    "-f", "null", "-"
  ];

  const result = await runFfmpeg(args);
  if (!result.ok) return result;

  const silence = parseSilence(result.stderr);
  const black = parseBlack(result.stderr);
  const loudness = parseLoudness(result.stderr);

  let timeStats = null;
  let spectralStats = null;
  if (config.qa?.spectral) {
    const time = await analyzeTimeStats(mediaPath);
    timeStats = time.ok ? time.timeStats : { error: time.error };

    const spectral = await analyzeSpectralStats(mediaPath);
    spectralStats = spectral.ok ? spectral.spectralStats : { error: spectral.error };
  }

  return {
    ok: true,
    qa: {
      silence,
      black,
      loudness,
      timeStats,
      spectralStats
    }
  };
}

export function summarizeQa(qa) {
  const silenceTotal = (qa?.silence || []).reduce((s, e) => s + (e.duration || 0), 0);
  const blackTotal = (qa?.black || []).reduce((s, e) => s + (e.duration || 0), 0);
  return {
    silenceEvents: qa?.silence?.length || 0,
    silenceTotalSec: Number(silenceTotal.toFixed(2)),
    blackEvents: qa?.black?.length || 0,
    blackTotalSec: Number(blackTotal.toFixed(2)),
    loudness: qa?.loudness || null
  };
}

export function qaToCsv(id, qa) {
  const spectral = qa?.spectralStats?.channels?.find((c) => c.channel === 1) || qa?.spectralStats?.channels?.[0];
  const s = spectral?.summary || {};
  const centroidAvg = s.centroid?.avg ?? "";
  const rolloffAvg = s.rolloff?.avg ?? "";
  const flatnessAvg = s.flatness?.avg ?? "";
  const fluxAvg = s.flux?.avg ?? "";
  const rows = [
    ["jobId", "metric", "value"],
    [id, "silence_events", qa?.silence?.length || 0],
    [id, "silence_total_sec", (qa?.silence || []).reduce((s, e) => s + (e.duration || 0), 0)],
    [id, "black_events", qa?.black?.length || 0],
    [id, "black_total_sec", (qa?.black || []).reduce((s, e) => s + (e.duration || 0), 0)],
    [id, "loudness_I", qa?.loudness?.integrated ?? ""],
    [id, "loudness_LRA", qa?.loudness?.lra ?? ""],
    [id, "max_volume", qa?.loudness?.maxVolume ?? ""],
    [id, "spectral_centroid_avg", centroidAvg],
    [id, "spectral_rolloff_avg", rolloffAvg],
    [id, "spectral_flatness_avg", flatnessAvg],
    [id, "spectral_flux_avg", fluxAvg]
  ];
  return rows.map((r) => r.join(",")).join("\n");
}

export function qaToMarkers(qa) {
  const markers = [];
  (qa?.silence || []).forEach((s, idx) => {
    markers.push({
      timeSec: Number(s.start || 0),
      name: `Silence #${idx + 1}`,
      comment: `dur=${s.duration ?? ""}s`
    });
  });
  (qa?.black || []).forEach((b, idx) => {
    markers.push({
      timeSec: Number(b.start || 0),
      name: `Black #${idx + 1}`,
      comment: `dur=${b.duration ?? ""}s`
    });
  });
  return markers.sort((a, b) => (a.timeSec || 0) - (b.timeSec || 0));
}

function parseAstats(stderr) {
  const lines = stderr.split(/\r?\n/);
  const channels = new Map();
  const overall = {};
  const channelRe = /Channel\s+(\d+)\s+(.+?):\s*([-0-9.]+)/i;
  const overallRe = /Overall\s+(.+?):\s*([-0-9.]+)/i;
  for (const line of lines) {
    let m = channelRe.exec(line);
    if (m) {
      const ch = Number(m[1]);
      const key = m[2].trim();
      const val = Number(m[3]);
      if (!channels.has(ch)) channels.set(ch, {});
      channels.get(ch)[key] = val;
      continue;
    }
    m = overallRe.exec(line);
    if (m) {
      const key = m[1].trim();
      const val = Number(m[2]);
      overall[key] = val;
    }
  }
  return {
    channels: Array.from(channels.entries()).map(([channel, stats]) => ({ channel, stats })),
    overall
  };
}

async function analyzeTimeStats(mediaPath) {
  const args = [
    "-hide_banner",
    "-i", mediaPath,
    "-vn",
    "-sn",
    "-dn",
    "-af", "astats=metadata=1:reset=1:measure_overall=1",
    "-f", "null", "-"
  ];
  const res = await runFfmpeg(args, 3 * 60 * 1000);
  if (!res.ok) return res;
  const timeStats = parseAstats(res.stderr);
  return { ok: true, timeStats };
}

function parseAspectralstats(stderr) {
  const re = /lavfi\.aspectralstats\.(\d+)\.([a-zA-Z_]+)=([-0-9.eE]+)/g;
  const valuesByChannel = new Map();

  let match;
  while ((match = re.exec(stderr))) {
    const channel = Number(match[1]);
    const key = match[2];
    const value = Number(match[3]);
    if (!Number.isFinite(channel) || !Number.isFinite(value)) continue;

    if (!valuesByChannel.has(channel)) valuesByChannel.set(channel, new Map());
    const perMetric = valuesByChannel.get(channel);
    if (!perMetric.has(key)) perMetric.set(key, []);
    perMetric.get(key).push(value);
  }

  const channels = [];
  for (const [channel, perMetric] of valuesByChannel.entries()) {
    const summary = {};
    for (const [key, arr] of perMetric.entries()) {
      if (!arr.length) continue;
      let min = arr[0];
      let max = arr[0];
      let sum = 0;
      for (const v of arr) {
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      summary[key] = { avg: sum / arr.length, min, max };
    }
    channels.push({ channel, summary });
  }
  channels.sort((a, b) => a.channel - b.channel);
  return { channels };
}

async function analyzeSpectralStats(mediaPath) {
  const args = [
    "-hide_banner",
    "-i", mediaPath,
    "-vn",
    "-sn",
    "-dn",
    "-af", "aspectralstats,ametadata=mode=print",
    "-f", "null", "-"
  ];
  const res = await runFfmpeg(args, 3 * 60 * 1000);
  if (!res.ok) return res;
  const spectralStats = parseAspectralstats(res.stderr);
  return { ok: true, spectralStats };
}
