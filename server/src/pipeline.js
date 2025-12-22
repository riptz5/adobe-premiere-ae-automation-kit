import { analyzeTranscript } from "./analyze.js";
import { addJobEvent, writeJob } from "./jobs.js";
import { writeJobOutputs } from "./output.js";
import { runStt } from "./stt.js";
import { analyzeMedia } from "./qa.js";
import { normalizeAudio } from "./audio.js";
import { detectScenes, scenesToSegments } from "./scene.js";
import { suggestBroll } from "./broll.js";
import { reframeAll } from "./reframe.js";

export async function runJob(job, config) {
  const startTs = new Date().toISOString();
  job.status = "running";
  job.startedAt = startTs;
  addJobEvent(job, "start", "Job started");
  await writeJob(job, config);

  try {
    if (!job.input.transcript && job.input.media?.path) {
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
    }

    const result = await analyzeTranscript({
      transcript: job.input.transcript,
      maxDurationSec: job.options?.maxDurationSec
    }, config);

    job.result = result;
    addJobEvent(job, "analyzed", "Transcript analyzed");

    if (config.features?.useScenes && job.input.media?.path) {
      const scenes = await detectScenes(job.input.media.path, config);
      if (scenes.ok) {
        job.scenes = scenes.scenes;
        job.sceneSegments = scenesToSegments(scenes.scenes);
        addJobEvent(job, "scene", "Scene detection completed");
      } else {
        addJobEvent(job, "scene", `Scene detection failed: ${scenes.error}`);
      }
    }

    if (config.features?.useBroll) {
      const textSource = job.result?.summary || job.input.transcript || "";
      const broll = await suggestBroll(textSource, config);
      if (broll.ok) {
        job.broll = broll.items;
        addJobEvent(job, "broll", "B-roll suggestions ready");
      } else {
        addJobEvent(job, "broll", `B-roll failed: ${broll.error}`);
      }
    }

    if (config.features?.useReframe && config.reframe?.enabled && job.input.media?.path) {
      const reframed = await reframeAll(job.input.media.path, config);
      if (reframed.ok) {
        job.reframed = reframed.outputs.map(out => ({ target: out.target, path: out.outputPath }));
        addJobEvent(job, "reframe", "Reframe completed");
      } else {
        addJobEvent(job, "reframe", `Reframe failed: ${reframed.error}`);
      }
    }

    if (config.qa?.enabled && job.input.media?.path) {
      try {
        const qa = await analyzeMedia(job.input.media.path, config);
        if (qa.ok) {
          job.qa = qa.qa;
          addJobEvent(job, "qa", "QA completed");
        } else {
          addJobEvent(job, "qa", `QA failed: ${qa.error}`);
        }
      } catch (err) {
        addJobEvent(job, "qa", `QA error: ${err.message}`);
      }
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

    job.status = "done";
    job.completedAt = new Date().toISOString();
    addJobEvent(job, "done", "Job completed");
  } catch (err) {
    job.status = "error";
    job.error = { message: err.message };
    addJobEvent(job, "error", err.message);
  }

  job.updatedAt = new Date().toISOString();
  await writeJob(job, config);
  return job;
}
