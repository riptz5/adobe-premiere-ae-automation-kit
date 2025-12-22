import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

function isVideoPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return [".mp4", ".mov", ".mxf"].includes(ext);
}

function buildOutputPath(mediaPath, config) {
  const parsed = path.parse(mediaPath);
  const outputDir = config.paths.absNormalizedDir || config.paths.absDataDir;
  const ext = isVideoPath(mediaPath) ? parsed.ext : ".wav";
  const name = `${parsed.name}__normalized${ext}`;
  return path.join(outputDir, name);
}

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
      return resolve({ ok: true });
    });
  });
}

export async function normalizeAudio(mediaPath, config) {
  await fs.mkdir(config.paths.absNormalizedDir, { recursive: true });
  const outPath = buildOutputPath(mediaPath, config);

  const targetI = config.audio?.targetI ?? -16;
  const truePeak = config.audio?.truePeak ?? -1.5;
  const lra = config.audio?.lra ?? 11;
  const denoise = config.audio?.denoise ?? false;
  const denoiseLevel = config.audio?.denoiseLevel ?? 0.9;
  const highpassHz = config.audio?.highpassHz;
  const lowpassHz = config.audio?.lowpassHz;
  const voicePresenceDb = config.audio?.voicePresenceDb;
  const filters = [];
  if (highpassHz) filters.push(`highpass=f=${highpassHz}`);
  if (lowpassHz) filters.push(`lowpass=f=${lowpassHz}`);
  if (denoise) {
    filters.push(`afftdn=nf=${denoiseLevel}`);
  }
  if (voicePresenceDb) {
    filters.push(`equalizer=f=3200:t=q:w=1:g=${voicePresenceDb}`);
  }
  filters.push(`loudnorm=I=${targetI}:TP=${truePeak}:LRA=${lra}`);
  const filter = filters.join(",");

  const args = ["-y", "-i", mediaPath];
  if (isVideoPath(mediaPath)) {
    args.push("-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-af", filter, outPath);
  } else {
    args.push("-vn", "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", "-af", filter, outPath);
  }

  const result = await runFfmpeg(args);
  if (!result.ok) return result;
  return { ok: true, outputPath: outPath };
}
