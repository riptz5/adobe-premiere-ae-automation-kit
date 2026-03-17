import { analyzeTranscript } from "./analyze.js";
import { addJobEvent, writeJob } from "./jobs.js";
import { writeJobOutputs } from "./output.js";
import { runStt } from "./stt.js";
import { analyzeMedia } from "./qa.js";
import { normalizeAudio } from "./audio.js";
import { detectScenes, scenesToSegments } from "./scene.js";
import { suggestBroll } from "./broll.js";
import { reframeAll } from "./reframe.js";
import { qaToMarkers } from "./qa.js";
import { logJob } from "./logger.js";
import { recordPhase } from "./metrics.js";
import { writeTimelineOutputs } from "./output_otio.js";
import { generateRppForJob } from "./reaper.js";

export async function runJob(job, config) {
  const runStart = Date.now();
  const startTs = new Date().toISOString();
  const runMode = job.runMode ?? config.runMode ?? "auto";
  const isDryRun = runMode === "dry-run";
  const profile = job.profile || config.profile || "default";

  job.status = "running";
  job.startedAt = startTs;
  addJobEvent(job, "start", isDryRun ? "Job started (dry-run)" : "Job started");
  await writeJob(job, config);

  try {
    if (!job.input.transcript && job.input.media?.path) {
      const t0 = Date.now();
      addJobEvent(job, "stt", "STT started");
      const stt = await runStt(job.input.media.path, config);
      if (!stt.ok) {
        throw new Error(`STT failed: ${stt.error}`);
      }
      job.input.transcript = stt.transcript;
      if (stt.transcriptPath) {
        job.input.transcriptPath = stt.transcriptPath;
        job.input.transcriptExt = stt.transcriptExt || null;
      }
      addJobEvent(job, "stt", "STT completed");
      recordPhase(job.id, "stt", Date.now() - t0, profile, "ready");
    }

    const tAnalyze = Date.now();
    const result = await analyzeTranscript({
      transcript: job.input.transcript,
      maxDurationSec: job.options?.maxDurationSec
    }, config);

    job.result = result;
    addJobEvent(job, "analyzed", "Transcript analyzed");
    recordPhase(job.id, "analyze", Date.now() - tAnalyze, profile, "ready");

    if (isDryRun) {
      job.status = "ready";
      job.completedAt = new Date().toISOString();
      addJobEvent(job, "done", "Dry-run: analysis only, no outputs written");
      job.updatedAt = new Date().toISOString();
      await writeJob(job, config);
      logJob(job.id, "pipeline", Date.now() - runStart, profile, "ready", "dry-run");
      return job;
    }

    if (config.features?.useScenes && job.input.media?.path) {
      const t0 = Date.now();
      const scenes = await detectScenes(job.input.media.path, config);
      if (scenes.ok) {
        job.scenes = scenes.scenes;
        job.sceneSegments = scenesToSegments(scenes.scenes);
        addJobEvent(job, "scene", "Scene detection completed");
      } else {
        addJobEvent(job, "scene", `Scene detection failed: ${scenes.error}`);
      }
      recordPhase(job.id, "scenes", Date.now() - t0, profile, job.status);
    }

    if (config.features?.useBroll) {
      const t0 = Date.now();
      const textSource = job.result?.summary || job.input.transcript || "";
      const broll = await suggestBroll(textSource, config);
      if (broll.ok) {
        job.broll = broll.items;
        addJobEvent(job, "broll", "B-roll suggestions ready");
      } else {
        addJobEvent(job, "broll", `B-roll failed: ${broll.error}`);
      }
      recordPhase(job.id, "broll", Date.now() - t0, profile, job.status);
    }

    if (config.features?.useReframe && config.reframe?.enabled && job.input.media?.path) {
      const t0 = Date.now();
      const reframed = await reframeAll(job.input.media.path, config);
      if (reframed.ok) {
        job.reframed = reframed.outputs.map(out => ({ target: out.target, path: out.outputPath }));
        addJobEvent(job, "reframe", "Reframe completed");
      } else {
        addJobEvent(job, "reframe", `Reframe failed: ${reframed.error}`);
      }
      recordPhase(job.id, "reframe", Date.now() - t0, profile, job.status);
    }

    if (config.qa?.enabled && job.input.media?.path) {
      const t0 = Date.now();
      try {
        const qa = await analyzeMedia(job.input.media.path, config);
        if (qa.ok) {
          job.qa = qa.qa;
          job.qaMarkers = qaToMarkers(qa.qa);
          addJobEvent(job, "qa", "QA completed");
        } else {
          addJobEvent(job, "qa", `QA failed: ${qa.error}`);
        }
      } catch (err) {
        addJobEvent(job, "qa", `QA error: ${err.message}`);
      }
      recordPhase(job.id, "qa", Date.now() - t0, profile, job.status);
    }

    if (config.audio?.normalize && job.input.media?.path) {
      try {
        const normalized = await normalizeAudio(job.input.media.path, config);
        if (normalized.ok) {
          job.normalizedMedia = normalized.outputPath;
          addJobEvent(job, "audio", "Audio normalized");
        } else {
          addJobEvent(job, "audio", `Normalize failed: ${normalized.error}`);
        }
      } catch (err) {
        addJobEvent(job, "audio", `Normalize error: ${err.message}`);
      }
    }

    const outCfg = config.output || {};
    const shouldWrite = Object.keys(outCfg).some((key) => key.startsWith("write") && outCfg[key]);
    if (shouldWrite) {
      const outputs = await writeJobOutputs(job, config);
      job.outputs = outputs || null;
      addJobEvent(job, "outputs", "Outputs written");
    }

    const timelineOut = await writeTimelineOutputs(job, config);
    if (timelineOut) {
      job.outputs = { ...(job.outputs || {}), timelinePath: timelineOut.timelinePath, otioPath: timelineOut.otioPath };
      addJobEvent(job, "timeline", "Timeline contract written");
    }

    // Auto-generate Reaper .rpp if reaperPath or pythonPath is configured
    const ossConfig = config.integrations?.oss || {};
    if (ossConfig.reaperPath || ossConfig.pythonPath || ossConfig.otioEnabled) {
      try {
        const rppResult = await generateRppForJob(job, config);
        if (rppResult.ok) {
          job.outputs = { ...(job.outputs || {}), rppPath: rppResult.rppPath };
          addJobEvent(job, "reaper", `Reaper .rpp written: ${rppResult.rppPath}`);
        } else {
          addJobEvent(job, "reaper", `Reaper .rpp skipped: ${rppResult.error}`);
        }
      } catch (err) {
        addJobEvent(job, "reaper", `Reaper step error: ${err.message}`);
      }
    }

    // Contract en docs/data-contracts.md: status final esperado = "ready"
    job.status = "ready";
    job.completedAt = new Date().toISOString();
    addJobEvent(job, "done", "Job completed");
    logJob(job.id, "pipeline", Date.now() - runStart, profile, "ready", "completed");
  } catch (err) {
    job.status = "error";
    job.error = { message: err.message };
    addJobEvent(job, "error", err.message);
    logJob(job.id, "pipeline", Date.now() - runStart, profile, "error", err.message);
  }

  job.updatedAt = new Date().toISOString();
  await writeJob(job, config);
  return job;
}
