import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { REPO_ROOT } from "./config.js";
import { initJobStore, newJob, writeJob } from "./jobs.js";
import { runJob } from "./pipeline.js";

const STATE_FILE = "watch-state.json";

function normalizeExtensions(list) {
  if (!Array.isArray(list)) return [];
  return list.map(ext => ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`);
}

function resolveFolderPath(folderPath) {
  return path.isAbsolute(folderPath) ? folderPath : path.join(REPO_ROOT, folderPath);
}

async function readJson(filePath, fallback = {}) {
  try {
    const raw = await fsp.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson(filePath, payload) {
  const body = JSON.stringify(payload, null, 2);
  await fsp.writeFile(filePath, body, "utf8");
}

async function loadWatchState(config) {
  const filePath = path.join(config.paths.absDataDir, STATE_FILE);
  const state = await readJson(filePath, { processed: {} });
  return { filePath, state };
}

function isProcessed(state, filePath, stats) {
  const record = state.processed[filePath];
  if (!record) return false;
  return record.mtimeMs === stats.mtimeMs && record.size === stats.size;
}

function markProcessed(state, filePath, stats) {
  state.processed[filePath] = {
    mtimeMs: stats.mtimeMs,
    size: stats.size
  };
}

async function readFileWithRetry(filePath, attempts = 3, delayMs = 400) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fsp.readFile(filePath, "utf8");
    } catch (err) {
      lastErr = err;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw lastErr;
}

function normalizeFolders(folders) {
  const normalized = [];
  for (const entry of folders || []) {
    if (typeof entry === "string") {
      normalized.push({ path: entry });
      continue;
    }
    if (entry && typeof entry === "object" && entry.path) {
      normalized.push({
        path: entry.path,
        profile: entry.profile,
        autoRun: entry.autoRun
      });
    }
  }
  return normalized;
}

async function handleTranscriptFile(filePath, folderMeta, config, state) {
  const stats = await fsp.stat(filePath);
  if (stats.isDirectory()) return;

  if (isProcessed(state, filePath, stats)) return;

  const transcript = await readFileWithRetry(filePath);
  const profile = folderMeta.profile || config.profile;
  const job = newJob({
    transcript,
    profile,
    source: {
      path: filePath,
      kind: "transcript",
      size: stats.size,
      mtimeMs: stats.mtimeMs
    }
  });
  job.runMode = config.runMode ?? "auto";
  await writeJob(job, config);

  const autoRun = folderMeta.autoRun ?? config.autoRun;
  if (autoRun) {
    await runJob(job, config);
  }

  markProcessed(state, filePath, stats);
}

async function handleMediaFile(filePath, folderMeta, config, state) {
  const stats = await fsp.stat(filePath);
  if (stats.isDirectory()) return;

  if (isProcessed(state, filePath, stats)) return;

  const profile = folderMeta.profile || config.profile;
  const job = newJob({
    transcript: "",
    media: {
      path: filePath,
      kind: "media",
      size: stats.size,
      mtimeMs: stats.mtimeMs
    },
    profile,
    source: {
      path: filePath,
      kind: "media",
      size: stats.size,
      mtimeMs: stats.mtimeMs
    }
  });
  job.runMode = config.runMode ?? "auto";
  await writeJob(job, config);

  const autoRun = folderMeta.autoRun ?? config.autoRun;
  if (autoRun) {
    await runJob(job, config);
  }

  markProcessed(state, filePath, stats);
}

export async function startWatchers(config) {
  if (!config.watch?.enabled) return [];

  await initJobStore(config);
  const extensions = normalizeExtensions(config.watch.extensions || []);
  const mediaExtensions = normalizeExtensions(config.watch.mediaExtensions || []);
  const folders = normalizeFolders(config.watch.folders || []);
  const debounceMs = config.watch.debounceMs || 1500;

  const { filePath: statePath, state } = await loadWatchState(config);
  const timers = new Map();
  const queue = [];
  let running = false;

  async function saveState() {
    await writeJson(statePath, state);
  }

  async function processQueue() {
    if (running) return;
    running = true;
    while (queue.length > 0) {
      const item = queue.shift();
      try {
        const ext = path.extname(item.filePath).toLowerCase();
        const isTranscript = extensions.includes(ext);
        if (isTranscript) {
          await handleTranscriptFile(item.filePath, item.folderMeta, config, state);
        } else {
          await handleMediaFile(item.filePath, item.folderMeta, config, state);
        }
      } catch (err) {
        console.warn(`[watch] Failed to process ${item.filePath}: ${err.message}`);
      }
      await saveState();
    }
    running = false;
  }

  function schedule(filePath, folderMeta) {
    if (!filePath) return;
    const ext = path.extname(filePath).toLowerCase();
    const isTranscript = extensions.length ? extensions.includes(ext) : false;
    const isMedia = mediaExtensions.length ? mediaExtensions.includes(ext) : false;
    if (!isTranscript && !isMedia) return;

    if (timers.has(filePath)) clearTimeout(timers.get(filePath));
    timers.set(filePath, setTimeout(() => {
      timers.delete(filePath);
      queue.push({ filePath, folderMeta });
      void processQueue();
    }, debounceMs));
  }

  async function scanFolder(folderMeta) {
    const folderPath = resolveFolderPath(folderMeta.path);
    await fsp.mkdir(folderPath, { recursive: true });
    const entries = await fsp.readdir(folderPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      schedule(path.join(folderPath, entry.name), folderMeta);
    }
  }

  const watchers = [];
  for (const folderMeta of folders) {
    const folderPath = resolveFolderPath(folderMeta.path);
    await fsp.mkdir(folderPath, { recursive: true });
    await scanFolder(folderMeta);

    const watcher = fs.watch(folderPath, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      schedule(path.join(folderPath, filename.toString()), folderMeta);
    });

    console.log(`[watch] Watching ${folderPath}`);
    watchers.push(watcher);
  }

  return watchers;
}
