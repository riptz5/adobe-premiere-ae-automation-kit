import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

function runProcess(cmd, args, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args);
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve({ ok: false, error: `${cmd} timed out` });
    }, timeoutMs);

    proc.stdout.on("data", chunk => { stdout += chunk.toString(); });
    proc.stderr.on("data", chunk => { stderr += chunk.toString(); });
    proc.on("error", (err) => {
      clearTimeout(timer);
      if (err.code === "ENOENT") return resolve({ ok: false, error: `${cmd} not found` });
      return resolve({ ok: false, error: err.message });
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return resolve({ ok: false, error: stderr || `${cmd} exited ${code}` });
      return resolve({ ok: true, stdout, stderr });
    });
  });
}

async function probeDimensions(mediaPath) {
  const args = [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height",
    "-of", "csv=p=0:s=x",
    mediaPath
  ];
  const result = await runProcess("ffprobe", args, 20000);
  if (!result.ok) return result;
  const parts = result.stdout.trim().split("x");
  const width = Number(parts[0]);
  const height = Number(parts[1]);
  if (!width || !height) return { ok: false, error: "ffprobe missing dimensions" };
  return { ok: true, width, height };
}

function parseRatio(ratio) {
  const parts = String(ratio).split(":").map(Number);
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return parts[0] / parts[1];
}

function computeCrop(width, height, targetRatio) {
  const current = width / height;
  let cropW = width;
  let cropH = height;
  if (current > targetRatio) {
    cropW = Math.round(height * targetRatio);
  } else if (current < targetRatio) {
    cropH = Math.round(width / targetRatio);
  }
  const x = Math.round((width - cropW) / 2);
  const y = Math.round((height - cropH) / 2);
  return { cropW, cropH, x, y };
}

export async function reframeMedia(mediaPath, target, config) {
  const ratio = parseRatio(target);
  if (!ratio) return { ok: false, error: "Invalid target ratio" };
  const dims = await probeDimensions(mediaPath);
  if (!dims.ok) return dims;

  await fs.mkdir(config.paths.absReframeDir, { recursive: true });
  const parsed = path.parse(mediaPath);
  const outName = `${parsed.name}__${target.replace(":", "x")}.mp4`;
  const outputPath = path.join(config.paths.absReframeDir, outName);

  const crop = computeCrop(dims.width, dims.height, ratio);
  const vf = `crop=${crop.cropW}:${crop.cropH}:${crop.x}:${crop.y}`;
  const args = [
    "-y",
    "-i", mediaPath,
    "-vf", vf,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "18",
    "-c:a", "copy",
    outputPath
  ];
  const result = await runProcess("ffmpeg", args);
  if (!result.ok) return result;
  return { ok: true, outputPath };
}

export async function reframeAll(mediaPath, config) {
  const targets = (config.reframe?.targets && config.reframe.targets.length)
    ? config.reframe.targets.map((t) => String(t).trim())
    : ["9:16"];
  const outputs = [];
  for (const target of targets) {
    const result = await reframeMedia(mediaPath, target, config);
    outputs.push({ target, ...result });
    if (!result.ok) {
      return { ok: false, error: result.error, outputs };
    }
  }
  return { ok: true, outputs };
}
