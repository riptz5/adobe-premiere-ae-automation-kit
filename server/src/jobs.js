import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

function jobPath(config, id) {
  return path.join(config.paths.absJobsDir, `${id}.json`);
}

export async function initJobStore(config) {
  await fs.mkdir(config.paths.absJobsDir, { recursive: true });
  await fs.mkdir(config.paths.absLogsDir, { recursive: true });
  if (config.paths.absResultsDir) {
    await fs.mkdir(config.paths.absResultsDir, { recursive: true });
  }
}

export async function writeJob(job, config) {
  const file = jobPath(config, job.id);
  const body = JSON.stringify(job, null, 2);
  await fs.writeFile(file, body, "utf8");
}

export async function readJob(id, config) {
  const file = jobPath(config, id);
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw);
}

export async function listJobs(config, limit = 50, sinceDays = null) {
  const files = await fs.readdir(config.paths.absJobsDir);
  const jobs = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(config.paths.absJobsDir, file), "utf8");
      jobs.push(JSON.parse(raw));
    } catch {
      continue;
    }
  }
  if (sinceDays != null && Number.isFinite(sinceDays) && sinceDays > 0) {
    const cutoff = Date.now() - sinceDays * 24 * 60 * 60 * 1000;
    const filtered = jobs.filter((j) => {
      const t = new Date(j.updatedAt || j.createdAt).getTime();
      return t >= cutoff;
    });
    filtered.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    return filtered.slice(0, limit);
  }
  jobs.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  return jobs.slice(0, limit);
}

export function newJob({ transcript, media, profile, options, source }) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    status: "queued",
    createdAt: now,
    updatedAt: now,
    profile,
    input: {
      transcript,
      media: media || null,
      source: source || null
    },
    options: options || {},
    events: [{ ts: now, type: "queued" }]
  };
}

export function addJobEvent(job, type, message) {
  const ts = new Date().toISOString();
  job.events = job.events || [];
  job.events.push({ ts, type, message });
  job.updatedAt = ts;
}
