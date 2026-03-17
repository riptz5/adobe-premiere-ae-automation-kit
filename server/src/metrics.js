/**
 * In-memory pipeline phase durations and counts. Exposed via GET /v1/metrics.
 */
const phaseDurations = [];
const JOB_HISTORY_MAX = 200;

export function recordPhase(jobId, phase, durationMs, profile, status) {
  phaseDurations.push({
    ts: Date.now(),
    jobId,
    phase,
    durationMs,
    profile,
    status
  });
  if (phaseDurations.length > JOB_HISTORY_MAX) {
    phaseDurations.shift();
  }
}

export function getMetrics() {
  const byPhase = {};
  const recent = phaseDurations.slice(-50);
  for (const r of recent) {
    if (!byPhase[r.phase]) byPhase[r.phase] = { sum: 0, count: 0 };
    byPhase[r.phase].sum += r.durationMs;
    byPhase[r.phase].count += 1;
  }
  const aggregated = {};
  for (const [phase, data] of Object.entries(byPhase)) {
    aggregated[phase] = {
      totalMs: data.sum,
      count: data.count,
      avgMs: data.count ? Math.round(data.sum / data.count) : 0
    };
  }
  return {
    recentJobCount: recent.length,
    byPhase: aggregated,
    recordedAt: new Date().toISOString()
  };
}
