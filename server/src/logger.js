/**
 * Central structured logger. No external deps.
 * Fields: jobId, phase, durationMs, profile, status, message, level.
 */
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function getLevel() {
  const env = (process.env.LOG_LEVEL || "info").toLowerCase();
  return LOG_LEVELS[env] ?? LOG_LEVELS.info;
}

function log(level, fields) {
  const levelNum = LOG_LEVELS[level] ?? LOG_LEVELS.info;
  if (levelNum > getLevel()) return;
  const payload = {
    ts: new Date().toISOString(),
    level,
    ...fields
  };
  const out = level === "error" ? process.stderr : process.stdout;
  out.write(JSON.stringify(payload) + "\n");
}

export function logInfo(fields) {
  log("info", fields);
}

export function logWarn(fields) {
  log("warn", fields);
}

export function logError(fields) {
  log("error", fields);
}

export function logDebug(fields) {
  log("debug", fields);
}

export function logJob(jobId, phase, durationMs, profile, status, message = "") {
  logInfo({ jobId, phase, durationMs, profile, status, message });
}
