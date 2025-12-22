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

  return {
    ok: true,
    qa: {
      silence,
      black,
      loudness
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
  const rows = [
    ["jobId", "metric", "value"],
    [id, "silence_events", qa?.silence?.length || 0],
    [id, "silence_total_sec", (qa?.silence || []).reduce((s, e) => s + (e.duration || 0), 0)],
    [id, "black_events", qa?.black?.length || 0],
    [id, "black_total_sec", (qa?.black || []).reduce((s, e) => s + (e.duration || 0), 0)],
    [id, "loudness_I", qa?.loudness?.integrated ?? ""],
    [id, "loudness_LRA", qa?.loudness?.lra ?? ""],
    [id, "max_volume", qa?.loudness?.maxVolume ?? ""]
  ];
  return rows.map((r) => r.join(",")).join("\n");
}
