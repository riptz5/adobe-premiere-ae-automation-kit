import express from "express";
import morgan from "morgan";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { CONFIG_DIR, listProfiles, loadConfig, readProfile, writeLocalConfig, writeProfile, deleteProfile } from "./config.js";
import { analyzeTranscript } from "./analyze.js";
import { probeMedia } from "./ingest.js";
import { initJobStore, listJobs, newJob, readJob, writeJob } from "./jobs.js";
import { runJob } from "./pipeline.js";
import { startWatchers } from "./watch.js";
import { analyzeMedia } from "./qa.js";
import { normalizeAudio } from "./audio.js";
import { detectScenes } from "./scene.js";
import { suggestBroll } from "./broll.js";
import { reframeAll, reframeMedia } from "./reframe.js";
import { analyzeMusic } from "./music.js";
import { getMetrics } from "./metrics.js";
import { logInfo } from "./logger.js";
import { runAgentChat } from "./agent.js";
import { spawn } from "child_process";
import { buildTimelineContract, timelineToOtio } from "./timeline/contract.js";
import { writeTimelineOutputs } from "./output_otio.js";
import { generateRppForJob } from "./reaper.js";
import { exportKdenliveForJob, exportBlenderVseForJob, exportNatronForJob, generateThumbnailForJob, checkOssTools } from "./oss_export.js";

const app = express();
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:8787";
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Api-Key");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  if (_req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

function requireAdminKey(req, res, next) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) return next(); // no key configured — allow (dev mode)
  const provided = req.headers["x-api-key"] || req.query.apiKey;
  if (provided !== adminKey) return res.status(401).json({ ok: false, error: "Unauthorized" });
  next();
}
app.use(express.json({ limit: "20mb" }));
app.use(morgan("dev"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const publicDir = path.join(repoRoot, "public");

let baseConfig = await loadConfig();
await initJobStore(baseConfig);
let watchers = await startWatchers(baseConfig);

function redactConfig(config) {
  const clone = JSON.parse(JSON.stringify(config));
  if (clone.llm?.apiKey) clone.llm.apiKey = "******";
  return clone;
}

const AnalyzeSchema = z.object({
  transcript: z.string().min(1),
  lang: z.string().optional(),
  style: z.string().optional(),
  maxDurationSec: z.number().int().positive().optional(),
  profile: z.string().optional(),
  removeFillers: z.boolean().optional()
});

const JobCreateSchema = z.object({
  transcript: z.string().optional(),
  mediaPath: z.string().optional(),
  profile: z.string().optional(),
  autoRun: z.boolean().optional(),
  options: z.object({
    maxDurationSec: z.number().int().positive().optional()
  }).passthrough().optional()
}).refine((data) => Boolean(data.transcript || data.mediaPath), {
  message: "transcript or mediaPath is required"
});

const ProbeSchema = z.object({
  path: z.string().min(1)
});

async function checkFfmpeg() {
  return new Promise((resolve) => {
    const proc = spawn("ffmpeg", ["-version"]);
    const t = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve({ ok: false, error: "timeout" });
    }, 3000);
    proc.on("error", () => {
      clearTimeout(t);
      resolve({ ok: false, error: "ffmpeg not found" });
    });
    proc.on("close", (code) => {
      clearTimeout(t);
      resolve({ ok: code === 0 });
    });
  });
}

app.get("/health", async (_req, res) => {
  let jobsQueued = 0;
  let jobsRunning = 0;
  try {
    const jobs = await listJobs(baseConfig, 500);
    for (const j of jobs) {
      if (j.status === "queued") jobsQueued += 1;
      else if (j.status === "running") jobsRunning += 1;
    }
  } catch (_) {}
  const ffmpeg = await checkFfmpeg();
  const llmReachable = baseConfig.llm?.enabled
    ? await fetch(`${baseConfig.llm.baseUrl.replace(/\/$/, "")}/api/tags`, { signal: AbortSignal.timeout(2000) }).then(() => true).catch(() => false)
    : null;
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    profile: baseConfig.profile,
    runMode: baseConfig.runMode,
    autoRun: baseConfig.autoRun,
    watchers: Array.isArray(watchers) ? watchers.length : 0,
    jobs: { queued: jobsQueued, running: jobsRunning },
    deps: { ffmpeg: ffmpeg.ok, llm: llmReachable }
  });
});

app.get("/v1/metrics", (_req, res) => {
  res.json({ ok: true, metrics: getMetrics() });
});

app.use("/", express.static(publicDir));

app.get("/v1/config", async (_req, res) => {
  res.json({ ok: true, config: redactConfig(baseConfig) });
});

app.get("/v1/config/profiles", async (_req, res) => {
  try {
    const profiles = await listProfiles();
    res.json({ ok: true, profiles });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/config/profile/:name", async (req, res) => {
  try {
    const profile = (req.params.name || "").trim();
    if (!profile) return res.status(400).json({ ok: false, error: "name is required" });
    const cfg = await loadConfig({ profileOverride: profile });
    res.json({ ok: true, config: redactConfig(cfg) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/v1/config/profiles", async (req, res) => {
  try {
    const name = (req.body?.name || "").trim();
    if (!name) return res.status(400).json({ ok: false, error: "name is required" });
    const from = (req.body?.from || "").trim();
    const base = from ? await readProfile(from) : {};
    await writeProfile(name, base);
    const profiles = await listProfiles();
    res.json({ ok: true, profile: name, profiles });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.put("/v1/config/profiles/:name", async (req, res) => {
  try {
    const name = (req.params.name || "").trim();
    if (!name) return res.status(400).json({ ok: false, error: "name is required" });
    const payload = req.body;
    if (!payload || typeof payload !== "object") return res.status(400).json({ ok: false, error: "invalid payload" });
    await writeProfile(name, payload);
    const cfg = await loadConfig({ profileOverride: name });
    res.json({ ok: true, profile: name, config: redactConfig(cfg) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.delete("/v1/config/profiles/:name", async (req, res) => {
  try {
    const name = (req.params.name || "").trim();
    if (!name) return res.status(400).json({ ok: false, error: "name is required" });
    await deleteProfile(name);
    const profiles = await listProfiles();
    res.json({ ok: true, profiles });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ ok: false, error: "Profile not found" });
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/config/local", async (_req, res) => {
  try {
    const filePath = path.join(CONFIG_DIR, "local.json");
    let raw = "{}";
    try {
      raw = await fs.readFile(filePath, "utf8");
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
    const local = raw ? JSON.parse(raw) : {};
    res.json({ ok: true, local });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/v1/config/local", requireAdminKey, async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ ok: false, error: "Invalid payload" });
    }
    const saved = await writeLocalConfig(payload);
    baseConfig = await loadConfig();
    if (watchers) {
      for (const watcher of watchers) {
        try { watcher.close(); } catch (e) { /* ignore */ }
      }
    }
    watchers = await startWatchers(baseConfig);
    res.json({ ok: true, local: saved, config: redactConfig(baseConfig) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/v1/analyze/transcript", async (req, res) => {
  const parsed = AnalyzeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  try {
    const config = await loadConfig({ profileOverride: parsed.data.profile });
    const result = await analyzeTranscript(parsed.data, config);
    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      source: result.source,
      chapters: result.chapters,
      segments: result.segments,
      highlights: result.highlights,
      markers: result.markers,
      summary: result.summary
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/v1/jobs", async (req, res) => {
  const parsed = JobCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  try {
    const profile = parsed.data.profile || baseConfig.profile;
    const jobConfig = await loadConfig({ profileOverride: profile });
    await initJobStore(jobConfig);

    const runMode = jobConfig.runMode || "auto";
    const autoRunDefault = runMode === "auto" ? jobConfig.autoRun : false;
    const autoRun = parsed.data.autoRun !== undefined ? parsed.data.autoRun : autoRunDefault;

    const job = newJob({
      transcript: parsed.data.transcript || "",
      media: parsed.data.mediaPath ? { path: parsed.data.mediaPath, kind: "media" } : null,
      profile,
      options: parsed.data.options
    });
    job.runMode = runMode;
    await writeJob(job, jobConfig);

    if (runMode === "dry-run") {
      job.status = "ready";
      job.note = "runMode=dry-run (no se ejecutó pipeline)";
      await writeJob(job, jobConfig);
      return res.json({ ok: true, job });
    }

    if (autoRun) {
      const completed = await runJob(job, jobConfig);
      return res.json({ ok: true, job: completed });
    }

    return res.json({ ok: true, job });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs", async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const sinceDays = req.query.sinceDays ? Number(req.query.sinceDays) : null;
    const jobs = await listJobs(baseConfig, Number.isFinite(limit) ? limit : 50, sinceDays);
    res.json({ ok: true, jobs });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    res.json({ ok: true, job });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id/result", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    if (job.result) return res.json({ ok: true, result: job.result });
    if (job.outputs?.resultPath) {
      const raw = await fs.readFile(job.outputs.resultPath, "utf8");
      return res.json({ ok: true, result: JSON.parse(raw) });
    }
    return res.status(404).json({ ok: false, error: "Result not found" });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id/markers", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    if (job.result?.markers) return res.json({ ok: true, markers: job.result.markers });
    if (job.outputs?.markersPath) {
      const raw = await fs.readFile(job.outputs.markersPath, "utf8");
      return res.json({ ok: true, markers: JSON.parse(raw).markers || [] });
    }
    return res.status(404).json({ ok: false, error: "Markers not found" });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id/segments", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    if (job.result?.segments) return res.json({ ok: true, segments: job.result.segments });
    if (job.outputs?.resultPath) {
      const raw = await fs.readFile(job.outputs.resultPath, "utf8");
      return res.json({ ok: true, segments: JSON.parse(raw).segments || [] });
    }
    return res.status(404).json({ ok: false, error: "Segments not found" });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id/chapters", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    if (job.result?.chapters) return res.json({ ok: true, chapters: job.result.chapters });
    if (job.outputs?.resultPath) {
      const raw = await fs.readFile(job.outputs.resultPath, "utf8");
      return res.json({ ok: true, chapters: JSON.parse(raw).chapters || [] });
    }
    return res.status(404).json({ ok: false, error: "Chapters not found" });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id/summary", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    if (job.result?.summary) return res.json({ ok: true, summary: job.result.summary });
    if (job.outputs?.summaryPath) {
      const raw = await fs.readFile(job.outputs.summaryPath, "utf8");
      return res.json({ ok: true, summary: raw });
    }
    return res.status(404).json({ ok: false, error: "Summary not found" });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id/qa", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    if (job.qa) return res.json({ ok: true, qa: job.qa });
    if (job.outputs?.qaPath) {
      const raw = await fs.readFile(job.outputs.qaPath, "utf8");
      const parsed = JSON.parse(raw);
      return res.json({ ok: true, qa: parsed.qa || parsed });
    }
    return res.status(404).json({ ok: false, error: "QA not found" });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id/qa-markers", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    if (job.qaMarkers) return res.json({ ok: true, markers: job.qaMarkers });
    if (job.outputs?.qaPath) {
      const raw = await fs.readFile(job.outputs.qaPath, "utf8");
      const parsed = JSON.parse(raw);
      return res.json({ ok: true, markers: parsed.markers || [] });
    }
    return res.status(404).json({ ok: false, error: "QA markers not found" });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id/scenes", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    if (job.scenes || job.sceneSegments) return res.json({ ok: true, scenes: job.scenes || [], segments: job.sceneSegments || [] });
    if (job.outputs?.scenesPath) {
      const raw = await fs.readFile(job.outputs.scenesPath, "utf8");
      const parsed = JSON.parse(raw);
      return res.json({ ok: true, scenes: parsed.scenes || [], segments: parsed.segments || [] });
    }
    return res.status(404).json({ ok: false, error: "Scenes not found" });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id/broll", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    if (job.broll) return res.json({ ok: true, broll: job.broll });
    if (job.outputs?.brollPath) {
      const raw = await fs.readFile(job.outputs.brollPath, "utf8");
      return res.json({ ok: true, broll: JSON.parse(raw).broll || [] });
    }
    return res.status(404).json({ ok: false, error: "B-roll not found" });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id/reframe", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    if (job.reframed) return res.json({ ok: true, reframed: job.reframed });
    if (job.outputs?.reframePath) {
      const raw = await fs.readFile(job.outputs.reframePath, "utf8");
      return res.json({ ok: true, reframed: JSON.parse(raw).reframed || [] });
    }
    return res.status(404).json({ ok: false, error: "Reframe not found" });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id/timeline", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    if (!job) return res.status(404).json({ ok: false, error: "Job not found" });
    const contract = buildTimelineContract(job, baseConfig);
    const otio = timelineToOtio(contract);
    const written = await writeTimelineOutputs(job, baseConfig);
    res.json({ ok: true, contract, otio, outputs: written ? { timelinePath: written.timelinePath, otioPath: written.otioPath } : null });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/v1/jobs/:id/run", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    if (job.status === "running") {
      return res.status(409).json({ ok: false, error: "Job is already running" });
    }

    const jobConfig = await loadConfig({ profileOverride: job.profile || baseConfig.profile });
    const completed = await runJob(job, jobConfig);
    res.json({ ok: true, job: completed });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/v1/jobs/:id/retry", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    if (job.status === "running") {
      return res.status(409).json({ ok: false, error: "Job is already running" });
    }
    const jobConfig = await loadConfig({ profileOverride: job.profile || baseConfig.profile });

    job.status = "queued";
    job.updatedAt = new Date().toISOString();
    job.error = undefined;
    job.result = undefined;
    job.qa = undefined;
    job.qaMarkers = undefined;
    job.scenes = undefined;
    job.sceneSegments = undefined;
    job.broll = undefined;
    job.reframed = undefined;
    job.outputs = undefined;
    job.completedAt = undefined;
    job.startedAt = undefined;
    job.events = job.events || [];
    job.events.push({ ts: new Date().toISOString(), type: "retry", message: "Retry requested" });
    await writeJob(job, jobConfig);

    const autoRun = req.body?.autoRun !== false;
    if (autoRun) {
      const completed = await runJob(job, jobConfig);
      return res.json({ ok: true, job: completed });
    }
    res.json({ ok: true, job });
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ ok: false, error: "Job not found" });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/v1/ingest/probe", async (req, res) => {
  const parsed = ProbeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const result = await probeMedia(parsed.data.path);
  if (!result.ok) {
    return res.status(422).json({ ok: false, error: result.error });
  }
  return res.json({ ok: true, data: result.data });
});

app.post("/v1/qa/analyze", async (req, res) => {
  const parsed = ProbeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  const result = await analyzeMedia(parsed.data.path, baseConfig);
  if (!result.ok) return res.status(422).json({ ok: false, error: result.error });
  return res.json({ ok: true, qa: result.qa });
});

app.post("/v1/audio/normalize", async (req, res) => {
  const parsed = ProbeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  const result = await normalizeAudio(parsed.data.path, baseConfig);
  if (!result.ok) return res.status(422).json({ ok: false, error: result.error });
  return res.json({ ok: true, outputPath: result.outputPath });
});

app.post("/v1/scene/detect", async (req, res) => {
  const parsed = ProbeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  const result = await detectScenes(parsed.data.path, baseConfig);
  if (!result.ok) return res.status(422).json({ ok: false, error: result.error });
  return res.json({ ok: true, scenes: result.scenes });
});

app.post("/v1/broll/suggest", async (req, res) => {
  const text = req.body?.text || "";
  const result = await suggestBroll(text, baseConfig);
  if (!result.ok) return res.status(422).json({ ok: false, error: result.error });
  return res.json({ ok: true, broll: result.items });
});

app.post("/v1/reframe", async (req, res) => {
  const parsed = ProbeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  const target = req.body?.target || "9:16";
  const result = await reframeAll(parsed.data.path, { ...baseConfig, reframe: { ...(baseConfig.reframe || {}), targets: [target] } });
  if (!result.ok) return res.status(422).json({ ok: false, error: result.error });
  return res.json({ ok: true, outputs: result.outputs });
});

app.post("/v1/music/analyze", async (req, res) => {
  const parsed = ProbeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  try {
    const profile = (req.body?.profile || baseConfig.profile || "shorts").trim();
    const cfg = await loadConfig({ profileOverride: profile });
    const result = await analyzeMusic(parsed.data.path, cfg);
    if (!result.ok) return res.status(422).json({ ok: false, error: result.error });
    return res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/v1/agent/chat", async (req, res) => {
  const message = (req.body?.message ?? req.body?.content ?? "").trim();
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  if (!message) return res.status(400).json({ ok: false, error: "message is required" });

  const config = await loadConfig();

  const actions = {
    getConfig: async () => ({ config: redactConfig(config) }),
    listProfiles: async () => {
      const list = await listProfiles();
      return { profiles: list };
    },
    getProfile: async (name) => {
      const cfg = await loadConfig({ profileOverride: name || config.profile });
      return { config: redactConfig(cfg) };
    },
    createProfile: async (profileName, fromName) => {
      const base = fromName ? await readProfile(fromName) : {};
      await writeProfile(profileName, base);
      const list = await listProfiles();
      return { profile: profileName, profiles: list };
    },
    saveProfile: async (profileName, payload) => {
      if (!payload || typeof payload !== "object") throw new Error("invalid payload");
      await writeProfile(profileName, payload);
      const cfg = await loadConfig({ profileOverride: profileName });
      return { profile: profileName, config: redactConfig(cfg) };
    },
    deleteProfile: async (profileName) => {
      await deleteProfile(profileName);
      return { profiles: await listProfiles() };
    },
    getLocalConfig: async () => {
      const filePath = path.join(CONFIG_DIR, "local.json");
      let raw = "{}";
      try {
        raw = await fs.readFile(filePath, "utf8");
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
      }
      return { local: raw ? JSON.parse(raw) : {} };
    },
    saveLocalConfig: async (payload) => {
      if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
      const saved = await writeLocalConfig(payload);
      baseConfig = await loadConfig();
      if (watchers) {
        for (const watcher of watchers) {
          try { watcher.close(); } catch (e) { /* ignore */ }
        }
      }
      watchers = await startWatchers(baseConfig);
      return { ok: true, local: saved };
    },
    getHealth: async () => {
      let jobsQueued = 0, jobsRunning = 0;
      try {
        const jobs = await listJobs(config, 500);
        for (const j of jobs) {
          if (j.status === "queued") jobsQueued += 1;
          else if (j.status === "running") jobsRunning += 1;
        }
      } catch (_) {}
      const ffmpeg = await checkFfmpeg();
      const llmReachable = config.llm?.enabled
        ? await fetch(`${(config.llm.baseUrl || "http://127.0.0.1:11434").replace(/\/$/, "")}/api/tags`, { signal: AbortSignal.timeout(2000) }).then(() => true).catch(() => false)
        : null;
      return {
        ok: true,
        ts: new Date().toISOString(),
        profile: config.profile,
        runMode: config.runMode,
        autoRun: config.autoRun,
        watchers: Array.isArray(watchers) ? watchers.length : 0,
        jobs: { queued: jobsQueued, running: jobsRunning },
        deps: { ffmpeg: ffmpeg.ok, llm: llmReachable },
      };
    },
    getMetrics: () => Promise.resolve(getMetrics()),
    listJobs: async () => {
      const list = await listJobs(config, 100);
      return { jobs: list };
    },
    getJob: (id) => readJob(id, config),
    createJob: async (body) => {
      const profile = body?.profile || config.profile;
      const jobConfig = await loadConfig({ profileOverride: profile });
      await initJobStore(jobConfig);
      const runMode = jobConfig.runMode || "auto";
      const autoRun = body?.autoRun !== undefined ? body.autoRun : runMode === "auto";
      const job = newJob({
        transcript: body?.transcript || "",
        media: body?.mediaPath ? { path: body.mediaPath, kind: "media" } : null,
        profile,
      });
      job.runMode = runMode;
      await writeJob(job, jobConfig);
      if (autoRun && runMode !== "dry-run") {
        const completed = await runJob(job, jobConfig);
        return { job: completed };
      }
      return { job };
    },
    runJob: async (id) => {
      const job = await readJob(id, config);
      const jobConfig = await loadConfig({ profileOverride: job.profile || config.profile });
      return await runJob(job, jobConfig);
    },
    retryJob: async (id) => {
      const job = await readJob(id, config);
      const jobConfig = await loadConfig({ profileOverride: job.profile || config.profile });
      job.status = "queued";
      job.updatedAt = new Date().toISOString();
      job.error = undefined;
      job.result = undefined;
      job.qa = undefined;
      job.qaMarkers = undefined;
      job.scenes = undefined;
      job.broll = undefined;
      job.reframed = undefined;
      job.outputs = undefined;
      job.completedAt = undefined;
      job.startedAt = undefined;
      job.events = (job.events || []).concat([{ ts: new Date().toISOString(), type: "retry", message: "Retry requested" }]);
      await writeJob(job, jobConfig);
      const completed = await runJob(job, jobConfig);
      return { job: completed };
    },
    probe: (path) => probeMedia(path).then((r) => (r.ok ? r : Promise.reject(new Error(r.error)))),
    runQa: (path) => analyzeMedia(path, config).then((r) => (r.ok ? { qa: r.qa } : Promise.reject(new Error(r.error)))),
    analyzeTranscript: (body) => analyzeTranscript({ transcript: body.transcript, profile: body.profile }, config),
    normalizeAudio: (path) => normalizeAudio(path, config).then((r) => (r.ok ? { outputPath: r.outputPath } : Promise.reject(new Error(r.error)))),
    sceneDetect: (path) => detectScenes(path, config).then((r) => (r.ok ? { scenes: r.scenes } : Promise.reject(new Error(r.error)))),
    brollSuggest: (text) => suggestBroll(text || "", config).then((r) => (r.ok ? { broll: r.items } : Promise.reject(new Error(r.error)))),
    reframe: (path, target) => {
      const cfg = { ...config, reframe: { ...(config.reframe || {}), targets: [target || "9:16"] } };
      return reframeAll(path, cfg).then((r) => (r.ok ? { outputs: r.outputs } : Promise.reject(new Error(r.error))));
    },
    musicAnalyze: async (path, profile) => {
      const cfg = await loadConfig({ profileOverride: profile || config.profile });
      const result = await analyzeMusic(path, cfg);
      if (!result.ok) throw new Error(result.error);
      return result;
    },
  };

  if (!config.llm?.enabled) {
    return res.status(503).json({
      ok: false,
      error: "LLM not enabled. Enable llm.enabled in config to use the agent.",
      reply: "El agente necesita un LLM (Ollama). Activa llm.enabled en la config.",
    });
  }

  try {
    const { reply, steps } = await runAgentChat(message, history, actions, config);
    res.json({ ok: true, reply, steps });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message, reply: err.message });
  }
});

// ─── OSS Export endpoints ─────────────────────────────────────────────────────

app.get("/v1/oss/health", async (_req, res) => {
  const ossConfig = baseConfig.integrations?.oss || {};
  const tools = await checkOssTools(ossConfig);
  res.json({ ok: true, tools });
});

app.post("/v1/export/reaper", async (req, res) => {
  const jobId = (req.body?.jobId || "").trim();
  if (!jobId) return res.status(400).json({ ok: false, error: "jobId is required" });
  try {
    const job = await readJob(jobId, baseConfig);
    const result = await generateRppForJob(job, baseConfig);
    if (!result.ok) return res.status(422).json({ ok: false, error: result.error });
    return res.json({ ok: true, rppPath: result.rppPath });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ ok: false, error: "Job not found" });
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id/rpp", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    const result = await generateRppForJob(job, baseConfig);
    if (!result.ok) return res.status(422).json({ ok: false, error: result.error });
    const rppContent = await fs.readFile(result.rppPath, "utf8");
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="job_${req.params.id.slice(0, 8)}.rpp"`);
    res.send(rppContent);
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ ok: false, error: "Job not found" });
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/v1/export/kdenlive", async (req, res) => {
  const jobId = (req.body?.jobId || "").trim();
  if (!jobId) return res.status(400).json({ ok: false, error: "jobId is required" });
  try {
    const job = await readJob(jobId, baseConfig);
    const result = await exportKdenliveForJob(job, baseConfig);
    if (!result.ok) return res.status(422).json({ ok: false, error: result.error });
    return res.json({ ok: true, outputPath: result.outputPath });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ ok: false, error: "Job not found" });
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/v1/jobs/:id/mlt", async (req, res) => {
  try {
    const job = await readJob(req.params.id, baseConfig);
    const result = await exportKdenliveForJob(job, baseConfig);
    if (!result.ok) return res.status(422).json({ ok: false, error: result.error });
    const content = await fs.readFile(result.outputPath, "utf8");
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Content-Disposition", `attachment; filename="job_${req.params.id.slice(0, 8)}.mlt"`);
    res.send(content);
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ ok: false, error: "Job not found" });
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/v1/export/blender", async (req, res) => {
  const jobId = (req.body?.jobId || "").trim();
  if (!jobId) return res.status(400).json({ ok: false, error: "jobId is required" });
  try {
    const job = await readJob(jobId, baseConfig);
    const result = await exportBlenderVseForJob(job, baseConfig);
    if (!result.ok) return res.status(422).json({ ok: false, error: result.error });
    return res.json({ ok: true, outputPath: result.outputPath });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ ok: false, error: "Job not found" });
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/v1/export/natron", async (req, res) => {
  const jobId = (req.body?.jobId || "").trim();
  if (!jobId) return res.status(400).json({ ok: false, error: "jobId is required" });
  const label = (req.body?.label || "vfx").trim();
  const dryRun = req.body?.dryRun !== false;
  try {
    const job = await readJob(jobId, baseConfig);
    const result = await exportNatronForJob(job, baseConfig, req.body?.templateNtp, label, dryRun);
    if (!result.ok) return res.status(422).json({ ok: false, error: result.error });
    return res.json({ ok: true, outputDir: result.outputDir, stdout: result.stdout });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ ok: false, error: "Job not found" });
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/v1/export/thumbnail", async (req, res) => {
  const jobId = (req.body?.jobId || "").trim();
  if (!jobId) return res.status(400).json({ ok: false, error: "jobId is required" });
  try {
    const job = await readJob(jobId, baseConfig);
    const result = await generateThumbnailForJob(job, baseConfig, {
      width: req.body?.width || 1280,
      height: req.body?.height || 720
    });
    if (!result.ok) return res.status(422).json({ ok: false, error: result.error });
    return res.json({ ok: true, outputPath: result.outputPath });
  } catch (err) {
    if (err.code === "ENOENT") return res.status(404).json({ ok: false, error: "Job not found" });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── server start ─────────────────────────────────────────────────────────────

const PORT = baseConfig.server.port;
const server = app.listen(PORT, () => {
  console.log(`[autokit-server] Ready at http://localhost:${PORT}`);
});
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[autokit-server] Port ${PORT} already in use. Stop the other process or use a different port.`);
    process.exit(1);
  }
  throw err;
});

process.on("SIGINT", () => {
  for (const watcher of watchers || []) {
    watcher.close();
  }
  process.exit(0);
});
