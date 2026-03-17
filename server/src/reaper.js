/**
 * AutoKit → Reaper integration.
 *
 * Calls examples/oss/reaper_adapter.py via Python to generate a .rpp project
 * from a job's TimelineContract.
 *
 * Config keys (integrations.oss):
 *   reaperPath       - path to REAPER binary (used by adapter as metadata only)
 *   pythonPath       - python3 executable (default: "python3")
 *   fxchainPath      - optional .RfxChain preset for the Music track
 *   templateRppPath  - optional base .rpp template to inject tracks into
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const ADAPTER_PATH = path.join(REPO_ROOT, "examples", "oss", "reaper_adapter.py");

/**
 * Generate a Reaper .rpp file from a written timeline JSON.
 *
 * @param {string} timelinePath  - Path to the timeline.json (TimelineContract)
 * @param {string} rppOutPath    - Destination .rpp path
 * @param {object} ossConfig     - config.integrations.oss
 * @returns {Promise<{ok:boolean, rppPath?:string, error?:string}>}
 */
export async function generateRpp(timelinePath, rppOutPath, ossConfig = {}) {
  const python = ossConfig.pythonPath || "python3";
  const args = [ADAPTER_PATH, "--timeline", timelinePath, "--rpp-out", rppOutPath];

  if (ossConfig.templateRppPath) {
    args.push("--template-rpp", ossConfig.templateRppPath);
  }
  if (ossConfig.fxchainPath) {
    args.push("--fxchain", ossConfig.fxchainPath);
  }

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    const proc = spawn(python, args, { timeout: 30000 });

    proc.stdout.on("data", (d) => { stdout += d.toString(); });
    proc.stderr.on("data", (d) => { stderr += d.toString(); });

    proc.on("error", (err) => {
      resolve({ ok: false, error: `spawn error: ${err.message}` });
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ ok: true, rppPath: rppOutPath, stdout: stdout.trim() });
      } else {
        resolve({ ok: false, error: stderr.trim() || stdout.trim() || `exit code ${code}` });
      }
    });
  });
}

/**
 * High-level: write timeline.json for a job (if not already written),
 * then call generateRpp.
 *
 * @param {object} job    - full job object
 * @param {object} config - full config
 * @returns {Promise<{ok:boolean, rppPath?:string, error?:string}>}
 */
export async function generateRppForJob(job, config) {
  const ossConfig = config.integrations?.oss || {};

  // Find or build the timeline JSON path
  const timelinePath = job.outputs?.timelinePath;
  if (!timelinePath) {
    return { ok: false, error: "No timelinePath in job outputs — run pipeline first" };
  }

  // Make sure the timeline file actually exists
  try {
    await fs.access(timelinePath);
  } catch {
    return { ok: false, error: `Timeline file not found: ${timelinePath}` };
  }

  const rppOutPath = timelinePath.replace(/\.json$/, ".rpp");
  return generateRpp(timelinePath, rppOutPath, ossConfig);
}

/**
 * Open the generated .rpp in Reaper (fire-and-forget, non-blocking).
 *
 * @param {string} rppPath   - path to the .rpp file
 * @param {string} reaperBin - path to REAPER binary
 */
export function openInReaper(rppPath, reaperBin) {
  if (!reaperBin) return;
  const proc = spawn(reaperBin, [rppPath], { detached: true, stdio: "ignore" });
  proc.unref();
}
