import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

function normalizeLang(lang) {
  if (!lang || lang === "auto") return null;
  return lang;
}

function buildWhisperArgs(inputPath, config, outputDir) {
  const args = [
    "-m", config.stt.modelPath || "",
    "-f", inputPath,
    "-of", path.join(outputDir, "transcript"),
    "-osrt",
    "-ovtt"
  ];

  const lang = normalizeLang(config.stt.language);
  if (lang) args.push("-l", lang);
  if (config.stt.vad) args.push("-vad");
  return args.filter(Boolean);
}

async function runProcess(command, args, timeoutMs) {
  return new Promise((resolve) => {
    const proc = spawn(command, args);
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve({ ok: false, error: "STT timed out" });
    }, timeoutMs);

    proc.stdout.on("data", chunk => { stdout += chunk.toString(); });
    proc.stderr.on("data", chunk => { stderr += chunk.toString(); });

    proc.on("error", (err) => {
      clearTimeout(timer);
      if (err.code === "ENOENT") {
        return resolve({ ok: false, error: "STT command not found" });
      }
      return resolve({ ok: false, error: err.message });
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        return resolve({ ok: false, error: stderr || `STT exited with ${code}` });
      }
      return resolve({ ok: true, stdout, stderr });
    });
  });
}

async function readTranscriptOutput(outputDir, format) {
  const ext = format === "srt" ? "srt" : format === "txt" ? "txt" : "vtt";
  const filePath = path.join(outputDir, `transcript.${ext}`);
  const transcript = await fs.readFile(filePath, "utf8");
  return { transcript, filePath, ext };
}

async function resolveWhisperCommand(config) {
  const candidates = [
    config.stt.command,
    "server/vendor/whisper.cpp/bin/whisper-cli",
    "server/vendor/whisper.cpp/bin/main",
    "whisper-cli",
    "whisper.cpp",
    "main"
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!candidate) continue;
    if (candidate.includes("/") || candidate.includes("\\")) {
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        continue;
      }
    } else {
      return candidate;
    }
  }
  return candidates[0] || "whisper-cli";
}

function buildFasterWhisperArgs(inputPath, config, outputDir) {
  // faster-whisper CLI: faster-whisper <file> --model <size> --output_dir <dir> --output_format vtt
  const model = config.stt.modelPath || config.stt.modelSize || "small";
  const lang = normalizeLang(config.stt.language);
  const args = [inputPath, "--model", model, "--output_dir", outputDir, "--output_format", "vtt"];
  if (lang) args.push("--language", lang);
  if (config.stt.vad) args.push("--vad_filter", "true");
  return args;
}

async function readFasterWhisperOutput(outputDir, inputPath) {
  // faster-whisper names output after the input file stem
  const stem = path.basename(inputPath, path.extname(inputPath));
  const vttPath = path.join(outputDir, `${stem}.vtt`);
  const transcript = await fs.readFile(vttPath, "utf8");
  return { transcript, filePath: vttPath, ext: "vtt" };
}

export async function runStt(mediaPath, config) {
  const outputDir = path.join(config.paths.absDataDir, "stt");
  await fs.mkdir(outputDir, { recursive: true });

  const timeoutMs = 20 * 60 * 1000;
  const engine = config.stt.engine || "whisper.cpp";

  if (engine === "faster-whisper") {
    const command = "faster-whisper";
    const args = buildFasterWhisperArgs(mediaPath, config, outputDir);
    const result = await runProcess(command, args, timeoutMs);
    if (!result.ok) return result;
    try {
      const output = await readFasterWhisperOutput(outputDir, mediaPath);
      return { ok: true, transcript: output.transcript, transcriptPath: output.filePath, transcriptExt: output.ext };
    } catch (err) {
      return { ok: false, error: "Failed to read faster-whisper output" };
    }
  }

  // Default: whisper.cpp
  const command = await resolveWhisperCommand(config);
  if (!config.stt.modelPath) {
    return { ok: false, error: "Missing stt.modelPath for whisper.cpp. Set it in config or stt.modelPath." };
  }
  const args = buildWhisperArgs(mediaPath, config, outputDir);
  const result = await runProcess(command, args, timeoutMs);
  if (!result.ok) return result;

  try {
    const output = await readTranscriptOutput(outputDir, config.stt.format);
    return { ok: true, transcript: output.transcript, transcriptPath: output.filePath, transcriptExt: output.ext };
  } catch (err) {
    return { ok: false, error: "Failed to read STT output" };
  }
}
