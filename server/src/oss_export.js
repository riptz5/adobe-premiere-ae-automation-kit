/**
 * AutoKit → OSS export wrappers.
 *
 * Replaces the Adobe suite with open-source equivalents:
 *   Premiere Pro  → Kdenlive (video editor, MLT/XML project)
 *   After Effects → Blender VSE + Natron (compositing / VFX)
 *   Photoshop     → GIMP (image editing, batch thumbnails)
 *
 * Each function wraps the corresponding Python CLI adapter
 * in examples/oss/ via spawn and returns { ok, outputPath, error }.
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ADAPTERS_DIR = path.join(REPO_ROOT, "examples", "oss");

// ─── helpers ──────────────────────────────────────────────────────────────────

function runPython(python, args, timeoutMs = 60000) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const proc = spawn(python, args, { timeout: timeoutMs });

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });

    proc.on("error", (err) => resolve({ ok: false, error: `spawn: ${err.message}` }));
    proc.on("close", (code) => {
      if (code === 0) resolve({ ok: true, stdout: stdout.trim(), stderr: stderr.trim() });
      else resolve({ ok: false, error: stderr.trim() || stdout.trim() || `exit ${code}` });
    });
  });
}

async function requireFile(p, label) {
  try { await fs.access(p); } catch {
    return { ok: false, error: `${label} not found: ${p}` };
  }
  return null;
}

// ─── Kdenlive / MLT (Premiere Pro replacement) ────────────────────────────────

/**
 * Export a TimelineContract to a Kdenlive/MLT project (.mlt).
 *
 * @param {string} timelinePath  - path to timeline.json (TimelineContract)
 * @param {string} mltOutPath    - destination .mlt path
 * @param {object} ossConfig     - config.integrations.oss
 * @returns {Promise<{ok:boolean, outputPath?:string, error?:string}>}
 */
export async function exportKdenlive(timelinePath, mltOutPath, ossConfig = {}) {
  const err = await requireFile(timelinePath, "timeline");
  if (err) return err;

  const python = ossConfig.pythonPath || "python3";
  const adapter = path.join(ADAPTERS_DIR, "otio_to_kdenlive.py");
  const result = await runPython(python, [adapter, "--timeline", timelinePath, "--mlt-out", mltOutPath]);

  if (result.ok) return { ok: true, outputPath: mltOutPath, stdout: result.stdout };
  return result;
}

/**
 * Export a TimelineContract for job (uses job.outputs.timelinePath).
 */
export async function exportKdenliveForJob(job, config) {
  const timelinePath = job.outputs?.timelinePath;
  if (!timelinePath) return { ok: false, error: "No timelinePath in job outputs" };
  const mltOut = timelinePath.replace(/\.json$/, ".mlt");
  return exportKdenlive(timelinePath, mltOut, config.integrations?.oss || {});
}

// ─── Blender VSE (After Effects replacement — video compositing) ──────────────

/**
 * Build a Blender VSE scene from a TimelineContract and optionally render.
 *
 * Requires Blender to be installed (blenderPath or in PATH).
 *
 * @param {string} timelinePath  - path to timeline.json
 * @param {string|null} output   - render output path (e.g. /tmp/render.mp4); null = no render
 * @param {object} ossConfig     - config.integrations.oss
 * @returns {Promise<{ok:boolean, outputPath?:string, error?:string}>}
 */
export async function exportBlenderVse(timelinePath, output, ossConfig = {}) {
  const err = await requireFile(timelinePath, "timeline");
  if (err) return err;

  const blender = ossConfig.blenderPath || "blender";
  const adapter = path.join(ADAPTERS_DIR, "blender_vse_adapter.py");
  const fps = ossConfig.fps || 25;

  const args = ["-b", "-P", adapter, "--", "--timeline", timelinePath, "--fps", String(fps)];
  if (output) args.push("--output", output);

  const result = await runPython(blender, args, 300000 /* 5 min for render */);
  if (result.ok) return { ok: true, outputPath: output || null, stdout: result.stdout };
  return result;
}

export async function exportBlenderVseForJob(job, config) {
  const timelinePath = job.outputs?.timelinePath;
  if (!timelinePath) return { ok: false, error: "No timelinePath in job outputs" };
  const ossConfig = config.integrations?.oss || {};
  const outputPath = timelinePath.replace(/\.json$/, "_blender.mp4");
  return exportBlenderVse(timelinePath, outputPath, ossConfig);
}

// ─── Natron (After Effects replacement — VFX compositing) ─────────────────────

/**
 * Run Natron batch renders for VFX-labeled segments.
 *
 * @param {string} timelinePath  - path to timeline.json
 * @param {string} templateNtp   - path to Natron .ntp template
 * @param {string} outputDir     - directory for rendered frames
 * @param {string} label         - segment label to filter (default: "vfx")
 * @param {boolean} dryRun       - if true, print commands without running
 * @param {object} ossConfig     - config.integrations.oss
 */
export async function exportNatron(timelinePath, templateNtp, outputDir, label = "vfx", dryRun = true, ossConfig = {}) {
  const err = await requireFile(timelinePath, "timeline");
  if (err) return err;

  const python = ossConfig.pythonPath || "python3";
  const adapter = path.join(ADAPTERS_DIR, "natron_batch.py");
  const args = [adapter, "--timeline", timelinePath, "--template", templateNtp,
    "--label", label, "--output-dir", outputDir];
  if (!dryRun) args.push("--run");

  const result = await runPython(python, args, 300000);
  if (result.ok) return { ok: true, outputDir, stdout: result.stdout };
  return result;
}

export async function exportNatronForJob(job, config, templateNtp, label = "vfx", dryRun = false) {
  const timelinePath = job.outputs?.timelinePath;
  if (!timelinePath) return { ok: false, error: "No timelinePath in job outputs" };
  const ossConfig = config.integrations?.oss || {};
  const tpl = templateNtp || (ossConfig.natronTemplatesDir ? path.join(ossConfig.natronTemplatesDir, "base.ntp") : "");
  if (!tpl) return { ok: false, error: "natronTemplatesDir not set in config" };
  const outputDir = path.join(path.dirname(timelinePath), "natron");
  await fs.mkdir(outputDir, { recursive: true });
  return exportNatron(timelinePath, tpl, outputDir, label, dryRun, ossConfig);
}

// ─── GIMP (Photoshop replacement — thumbnails / batch image ops) ──────────────

/**
 * Run a GIMP Script-Fu batch operation via the gimp_batch.py adapter.
 *
 * @param {string} imagePath     - source image (or video frame via ffmpeg)
 * @param {string} outputPath    - destination image path
 * @param {string} operation     - "thumbnail" | "sharpen" | "normalize" | "export"
 * @param {object} options       - { width, height, quality, script }
 * @param {object} ossConfig     - config.integrations.oss
 */
export async function gimpBatch(imagePath, outputPath, operation = "thumbnail", options = {}, ossConfig = {}) {
  const python = ossConfig.pythonPath || "python3";
  const adapter = path.join(ADAPTERS_DIR, "gimp_batch.py");
  const args = [adapter, "--input", imagePath, "--output", outputPath, "--op", operation];

  if (options.width) args.push("--width", String(options.width));
  if (options.height) args.push("--height", String(options.height));
  if (options.quality) args.push("--quality", String(options.quality));
  if (options.script) args.push("--script", options.script);

  const gimpBin = ossConfig.gimpPath || "";
  if (gimpBin) args.push("--gimp", gimpBin);

  const result = await runPython(python, args, 60000);
  if (result.ok) return { ok: true, outputPath, stdout: result.stdout };
  return result;
}

/**
 * Extract a representative frame from a job's media and generate a thumbnail via GIMP.
 */
export async function generateThumbnailForJob(job, config, options = {}) {
  const mediaPath = job.normalizedMedia || job.input?.media?.path;
  if (!mediaPath) return { ok: false, error: "No media path in job" };

  const ossConfig = config.integrations?.oss || {};
  const outDir = config.paths?.absResultsDir || "server/data/results";
  await fs.mkdir(outDir, { recursive: true });

  // First extract a frame at ~2s using ffmpeg
  const framePath = path.join(outDir, `${job.id}_frame.jpg`);
  const thumbPath = path.join(outDir, `${job.id}_thumb.jpg`);
  const ffmpeg = ossConfig.ffmpegPath || "ffmpeg";

  const frameResult = await runPython(ffmpeg, [
    "-ss", "2", "-i", mediaPath, "-frames:v", "1", "-q:v", "2", "-y", framePath
  ], 30000);

  if (!frameResult.ok) return { ok: false, error: `ffmpeg frame extract: ${frameResult.error}` };

  return gimpBatch(framePath, thumbPath, "thumbnail", { width: 1280, height: 720, ...options }, ossConfig);
}

// ─── health check helper ──────────────────────────────────────────────────────

/**
 * Check which OSS tools are available on this machine.
 *
 * @param {object} ossConfig - config.integrations.oss
 * @returns {Promise<object>} availability map
 */
export async function checkOssTools(ossConfig = {}) {
  const checks = {
    python3: ossConfig.pythonPath || "python3",
    ffmpeg: ossConfig.ffmpegPath || "ffmpeg",
    blender: ossConfig.blenderPath || "blender",
    gimp: ossConfig.gimpPath || "gimp",
    natronrenderer: ossConfig.natronPath || "natronrenderer",
    kdenlive: ossConfig.kdenliveCliPath || "kdenlive",
  };

  const results = {};
  await Promise.all(
    Object.entries(checks).map(async ([name, bin]) => {
      results[name] = await new Promise((resolve) => {
        const proc = spawn(bin, ["--version"]);
        const t = setTimeout(() => { proc.kill(); resolve(false); }, 3000);
        proc.on("error", () => { clearTimeout(t); resolve(false); });
        proc.on("close", (code) => { clearTimeout(t); resolve(code === 0); });
      });
    })
  );
  return results;
}
