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

const app = express();
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (_req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use(express.json({ limit: "20mb" }));
app.use(morgan("dev"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

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
  profile: z.string().optional()
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

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    profile: baseConfig.profile
  });
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

app.post("/v1/config/local", async (req, res) => {
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
    const jobs = await listJobs(baseConfig, Number.isFinite(limit) ? limit : 50);
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

const PORT = baseConfig.server.port;
app.listen(PORT, () => {
  console.log(`[autokit-server] Ready at http://localhost:${PORT}`);
});

process.on("SIGINT", () => {
  for (const watcher of watchers || []) {
    watcher.close();
  }
  process.exit(0);
});
