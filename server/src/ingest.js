import { spawn } from "child_process";

export async function probeMedia(filePath) {
  return new Promise((resolve) => {
    const args = [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      filePath
    ];

    let stdout = "";
    let stderr = "";

    const proc = spawn("ffprobe", args);
    proc.stdout.on("data", chunk => { stdout += chunk.toString(); });
    proc.stderr.on("data", chunk => { stderr += chunk.toString(); });

    proc.on("error", (err) => {
      if (err.code === "ENOENT") {
        return resolve({ ok: false, error: "ffprobe not found" });
      }
      return resolve({ ok: false, error: err.message });
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        return resolve({ ok: false, error: stderr || `ffprobe exited with code ${code}` });
      }
      try {
        const parsed = JSON.parse(stdout);
        return resolve({ ok: true, data: parsed });
      } catch (err) {
        return resolve({ ok: false, error: "Failed to parse ffprobe output" });
      }
    });
  });
}
