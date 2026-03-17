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

function parseSceneTimes(stderr) {
  const times = [];
  const re = /pts_time:([0-9.]+)/g;
  let match;
  while ((match = re.exec(stderr))) {
    times.push(Number(match[1]));
  }
  const unique = Array.from(new Set(times));
  unique.sort((a, b) => a - b);
  return unique;
}

export async function detectScenes(mediaPath, config) {
  const threshold = config.scene?.threshold ?? 0.3;
  const args = [
    "-hide_banner",
    "-i", mediaPath,
    "-vf", `select='gt(scene,${threshold})',showinfo`,
    "-f", "null", "-"
  ];

  const result = await runFfmpeg(args);
  if (!result.ok) return result;
  const times = parseSceneTimes(result.stderr);
  return { ok: true, scenes: times };
}

export function scenesToSegments(times, minGap = 1.0) {
  const segments = [];
  let prev = 0;
  for (const t of times) {
    if (t - prev >= minGap) segments.push({ start: prev, end: t });
    prev = t;
  }
  // push the final segment from the last cut to the end
  if (times.length > 0) segments.push({ start: prev, end: null });
  return segments;
}
