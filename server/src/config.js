import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import fs from "fs/promises";

const ConfigSchema = z.object({
  profile: z.string().default("shorts"),
  autoRun: z.boolean().default(true),
  runMode: z.enum(["auto", "manual", "dry-run"]).default("auto"),
  logLevel: z.enum(["info", "debug", "warn", "error"]).default("info"),
  server: z.object({
    port: z.number().int().positive().default(8787)
  }).default({}),
  paths: z.object({
    dataDir: z.string().default("server/data"),
    jobsDir: z.string().default("server/data/jobs"),
    logsDir: z.string().default("server/data/logs"),
    resultsDir: z.string().default("server/data/results")
  }).default({}),
  features: z.object({
    useLLM: z.boolean().default(true),
    useFallbacks: z.boolean().default(true),
    useScenes: z.boolean().default(true),
    useBroll: z.boolean().default(true),
    useReframe: z.boolean().default(false)
  }).default({}),
  analyze: z.object({
    chapterTargetSec: z.number().int().positive().default(120),
    highlightMax: z.number().int().positive().default(5),
    removeFillers: z.boolean().default(false),
    fillers: z.array(z.string()).default([
      "um",
      "uh",
      "erm",
      "eh",
      "mmm",
      "like",
      "you know",
      "i mean",
      "este",
      "ehh",
      "osea",
      "o sea",
      "vale"
    ])
  }).default({}),
  llm: z.object({
    enabled: z.boolean().default(true),
    provider: z.enum(["ollama", "llama.cpp"]).default("ollama"),
    baseUrl: z.string().default("http://localhost:11434/v1"),
    apiKey: z.string().default("ollama"),
    model: z.string().default("llama3:8b"),
    temperature: z.number().min(0).max(2).default(0.3),
    maxTranscriptChars: z.number().int().positive().default(25000),
    timeoutMs: z.number().int().positive().default(60000)
  }).default({})
  ,
  stt: z.object({
    engine: z.enum(["whisper.cpp", "faster-whisper"]).default("whisper.cpp"),
    modelSize: z.string().default("small"),
    language: z.string().default("auto"),
    vad: z.boolean().default(true),
    format: z.enum(["vtt", "srt", "txt"]).default("vtt"),
    command: z.string().default("whisper.cpp"),
    modelPath: z.string().default("")
  }).default({}),
  output: z.object({
    writeResult: z.boolean().default(true),
    writeMarkers: z.boolean().default(true),
    writeSegments: z.boolean().default(true),
    writeChapters: z.boolean().default(true),
    writeSummary: z.boolean().default(true),
    writeTranscript: z.boolean().default(true),
    writeQa: z.boolean().default(true),
    writeScenes: z.boolean().default(true),
    writeBroll: z.boolean().default(true),
    writeReframe: z.boolean().default(true),
    useSourceName: z.boolean().default(true),
    resultDir: z.string().default("server/data/results")
  }).default({}),
  render: z.object({
    presetPath: z.string().default(""),
    outputDir: z.string().default("")
  }).default({}),
  timeline: z.object({
    fps: z.number().default(25)
  }).default({}),
  integrations: z.object({
    frameio: z.object({
      enabled: z.boolean().default(false),
      token: z.string().default(""),
      projectId: z.string().default(""),
      folderId: z.string().default("")
    }).default({}),
    adobeStock: z.object({
      enabled: z.boolean().default(false),
      apiKey: z.string().default("")
    }).default({}),
    apiMesh: z.object({
      enabled: z.boolean().default(false),
      baseUrl: z.string().default("")
    }).default({}),
    oss: z.object({
      otioEnabled: z.boolean().default(true),
      blenderPath: z.string().default(""),
      reaperPath: z.string().default(""),
      kdenlivePresetPath: z.string().default(""),
      natronTemplatesDir: z.string().default(""),
      timelineResultDir: z.string().default(""),
      debugMode: z.boolean().default(false)
    }).default({})
  }).default({}),
  broll: z.object({
    libraryDir: z.string().default("broll"),
    maxResults: z.number().int().positive().default(8),
    minScore: z.number().int().min(1).default(1)
  }).default({}),
  scene: z.object({
    threshold: z.number().min(0).max(1).default(0.3)
  }).default({}),
  reframe: z.object({
    enabled: z.boolean().default(false),
    targets: z.array(z.string()).default(["9:16"]),
    outputDir: z.string().default("server/data/reframe")
  }).default({}),
  audio: z.object({
    normalize: z.boolean().default(true),
    targetI: z.number().default(-16),
    truePeak: z.number().default(-1.5),
    lra: z.number().default(11),
    denoise: z.boolean().default(false),
    denoiseLevel: z.number().default(0.9),
    highpassHz: z.number().default(0),
    lowpassHz: z.number().default(0),
    voicePresenceDb: z.number().default(0),
    outputDir: z.string().default("server/data/normalized")
  }).default({}),
  qa: z.object({
    enabled: z.boolean().default(true),
    silenceThresholdDb: z.number().default(-40),
    silenceMinSec: z.number().default(1.0),
    blackThreshold: z.number().default(0.1),
    blackMinSec: z.number().default(0.2),
    spectral: z.boolean().default(true)
  }).default({}),
  music: z.object({
    enabled: z.boolean().default(true),
    beat: z.object({
      minGapSec: z.number().min(0).default(0.28),
      thresholdPctl: z.number().min(0).max(100).default(92),
      max: z.number().int().positive().default(400)
    }).default({}),
    sections: z.object({
      minGapSec: z.number().min(0).default(12),
      windowSec: z.number().min(0).default(4),
      deltaDb: z.number().min(0).default(4),
      dropDeltaDb: z.number().min(0).default(6)
    }).default({}),
    assets: z.object({
      waveformSize: z.string().default("1400x280"),
      spectrogramSize: z.string().default("1400x560")
    }).default({})
  }).default({}),
  watch: z.object({
    enabled: z.boolean().default(false),
    folders: z.array(
      z.union([
        z.string(),
        z.object({
          path: z.string(),
          profile: z.string().optional(),
          autoRun: z.boolean().optional()
        }).passthrough()
      ])
    ).default([]),
    extensions: z.array(z.string()).default([".vtt", ".srt", ".txt"]),
    mediaExtensions: z.array(z.string()).default([".mp4", ".mov", ".mxf", ".wav", ".mp3", ".aiff"]),
    debounceMs: z.number().int().positive().default(1500)
  }).default({})
}).passthrough();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CONFIG_DIR = process.env.CONFIG_DIR || path.join(REPO_ROOT, "config");

let cachedSources = null;
const configCache = new Map();
const configLoadingPromises = new Map();

function deepMerge(target, ...sources) {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        target[key] = deepMerge(target[key] || {}, value);
      } else {
        target[key] = value;
      }
    }
  }
  return target;
}

async function readJson(filePath, fallback = {}) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

function applyEnvOverrides(config) {
  if (process.env.PORT) config.server.port = Number(process.env.PORT);
  if (process.env.PROFILE) config.profile = process.env.PROFILE;

  if (process.env.LLM_BASE_URL) config.llm.baseUrl = process.env.LLM_BASE_URL;
  if (process.env.LLM_MODEL) config.llm.model = process.env.LLM_MODEL;
  if (process.env.LLM_API_KEY) config.llm.apiKey = process.env.LLM_API_KEY;
  if (process.env.LLM_TEMPERATURE) config.llm.temperature = Number(process.env.LLM_TEMPERATURE);
  if (process.env.LLM_ENABLED) config.llm.enabled = process.env.LLM_ENABLED === "true";
  return config;
}

function resolvePaths(config) {
  const resolvePath = (p) => path.isAbsolute(p) ? p : path.join(REPO_ROOT, p);
  const dataDir = resolvePath(config.paths.dataDir);
  const jobsDir = resolvePath(config.paths.jobsDir);
  const logsDir = resolvePath(config.paths.logsDir);
  const resultsDir = resolvePath(config.paths.resultsDir || config.output?.resultDir || "server/data/results");
  const normalizedDir = resolvePath(config.audio?.outputDir || "server/data/normalized");
  const brollDir = resolvePath(config.broll?.libraryDir || "broll");
  const reframeDir = resolvePath(config.reframe?.outputDir || "server/data/reframe");
  const timelineDir = resolvePath(config.integrations?.oss?.timelineResultDir || resultsDir);
  const natronTemplatesDir = config.integrations?.oss?.natronTemplatesDir
    ? resolvePath(config.integrations.oss.natronTemplatesDir)
    : "";

  return {
    ...config,
    paths: {
      ...config.paths,
      absDataDir: dataDir,
      absJobsDir: jobsDir,
      absLogsDir: logsDir,
      absResultsDir: resultsDir,
      absNormalizedDir: normalizedDir,
      absBrollDir: brollDir,
      absReframeDir: reframeDir,
      absTimelineDir: timelineDir,
      absNatronTemplatesDir: natronTemplatesDir
    }
  };
}

async function loadSources() {
  if (cachedSources) return cachedSources;
  const defaultConfig = await readJson(path.join(CONFIG_DIR, "default.json"), {});
  const localConfig = await readJson(path.join(CONFIG_DIR, "local.json"), {});
  cachedSources = { defaultConfig, localConfig };
  return cachedSources;
}

async function loadProfileConfig(profile) {
  if (!profile) return {};
  const profilePath = path.join(CONFIG_DIR, "profiles", `${profile}.json`);
  return readJson(profilePath, {});
}

export async function loadConfig({ profileOverride } = {}) {
  const sources = await loadSources();
  const baseProfile = sources.localConfig.profile || sources.defaultConfig.profile || "shorts";
  const profile = profileOverride || process.env.PROFILE || baseProfile;

  if (configCache.has(profile)) return configCache.get(profile);

  // Deduplicate concurrent loads for the same profile
  if (configLoadingPromises.has(profile)) return configLoadingPromises.get(profile);

  const loading = (async () => {
    const profileConfig = await loadProfileConfig(profile);
    const merged = deepMerge({}, sources.defaultConfig, profileConfig, sources.localConfig);
    merged.profile = profile;

    const withEnv = applyEnvOverrides(merged);
    const parsed = ConfigSchema.parse(withEnv);
    const resolved = resolvePaths(parsed);

    configCache.set(profile, resolved);
    configLoadingPromises.delete(profile);
    return resolved;
  })();

  configLoadingPromises.set(profile, loading);
  return loading;
}

export async function writeLocalConfig(payload) {
  const filePath = path.join(CONFIG_DIR, "local.json");
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  cachedSources = null;
  configCache.clear();
  configLoadingPromises.clear();
  return payload;
}

export async function listProfiles() {
  try {
    const dir = path.join(CONFIG_DIR, "profiles");
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
      .map(entry => entry.name.replace(/\.json$/, ""));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function readProfile(name) {
  if (!name) return {};
  const profilePath = path.join(CONFIG_DIR, "profiles", `${name}.json`);
  return readJson(profilePath, {});
}

export async function writeProfile(name, payload = {}) {
  if (!name) throw new Error("Profile name is required");
  const dir = path.join(CONFIG_DIR, "profiles");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${name}.json`);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  cachedSources = null;
  configCache.clear();
  configLoadingPromises.clear();
  return payload;
}

export async function deleteProfile(name) {
  if (!name) throw new Error("Profile name is required");
  const filePath = path.join(CONFIG_DIR, "profiles", `${name}.json`);
  await fs.unlink(filePath);
  cachedSources = null;
  configCache.clear();
  configLoadingPromises.clear();
}

export { REPO_ROOT, CONFIG_DIR };
