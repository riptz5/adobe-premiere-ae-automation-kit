import fs from "fs/promises";
import path from "path";

function buildBaseName(job, config) {
  if (config.output?.useSourceName && job.input?.source?.path) {
    const parsed = path.parse(job.input.source.path);
    if (parsed.name) return `${parsed.name}__${job.id}`;
  }
  return job.id;
}

export async function writeJobOutputs(job, config) {
  const output = config.output || {};
  if (!output.writeResult && !output.writeMarkers && !output.writeSegments && !output.writeChapters && !output.writeSummary && !output.writeTranscript && !output.writeQa && !output.writeScenes && !output.writeBroll && !output.writeReframe) return;

  const dir = config.paths.absResultsDir || config.paths.absDataDir;
  await fs.mkdir(dir, { recursive: true });

  const baseName = buildBaseName(job, config);
  let resultPath = null;
  let markersPath = null;
  let segmentsPath = null;
  let chaptersPath = null;
  let summaryPath = null;
  let transcriptPath = null;
  let qaPath = null;
  let scenesPath = null;
  let brollPath = null;
  let reframePath = null;
  let sceneSegmentsPath = null;
  let qaMarkersPath = null;

  if (output.writeResult) {
    const filePath = path.join(dir, `${baseName}.result.json`);
    await fs.writeFile(filePath, JSON.stringify(job.result || {}, null, 2), "utf8");
    resultPath = filePath;
  }

  if (output.writeMarkers && job.result?.markers) {
    const filePath = path.join(dir, `${baseName}.markers.json`);
    await fs.writeFile(filePath, JSON.stringify({ markers: job.result.markers }, null, 2), "utf8");
    markersPath = filePath;
  }

  if (output.writeSegments && job.result?.segments) {
    const filePath = path.join(dir, `${baseName}.segments.json`);
    await fs.writeFile(filePath, JSON.stringify({ segments: job.result.segments }, null, 2), "utf8");
    segmentsPath = filePath;
  }

  if (output.writeChapters && job.result?.chapters) {
    const filePath = path.join(dir, `${baseName}.chapters.json`);
    await fs.writeFile(filePath, JSON.stringify({ chapters: job.result.chapters }, null, 2), "utf8");
    chaptersPath = filePath;
  }

  if (output.writeSummary && job.result?.summary) {
    const filePath = path.join(dir, `${baseName}.summary.txt`);
    await fs.writeFile(filePath, String(job.result.summary || ""), "utf8");
    summaryPath = filePath;
  }

  if (output.writeTranscript && job.input?.transcript) {
    const ext = job.input.transcriptExt || "vtt";
    const filePath = path.join(dir, `${baseName}.transcript.${ext}`);
    await fs.writeFile(filePath, String(job.input.transcript || ""), "utf8");
    transcriptPath = filePath;
  }

  if (output.writeQa && job.qa) {
    const filePath = path.join(dir, `${baseName}.qa.json`);
    await fs.writeFile(filePath, JSON.stringify({ qa: job.qa, markers: job.qaMarkers || [] }, null, 2), "utf8");
    qaPath = filePath;
  }

  if (output.writeScenes && (job.scenes || job.sceneSegments)) {
    const filePath = path.join(dir, `${baseName}.scenes.json`);
    await fs.writeFile(filePath, JSON.stringify({ scenes: job.scenes || [], segments: job.sceneSegments || [] }, null, 2), "utf8");
    scenesPath = filePath;
    sceneSegmentsPath = filePath;
  }

  if (output.writeBroll && job.broll) {
    const filePath = path.join(dir, `${baseName}.broll.json`);
    await fs.writeFile(filePath, JSON.stringify({ broll: job.broll }, null, 2), "utf8");
    brollPath = filePath;
  }

  if (output.writeReframe && job.reframed) {
    const filePath = path.join(dir, `${baseName}.reframe.json`);
    await fs.writeFile(filePath, JSON.stringify({ reframed: job.reframed }, null, 2), "utf8");
    reframePath = filePath;
  }

  return {
    resultPath,
    markersPath,
    segmentsPath,
    chaptersPath,
    summaryPath,
    transcriptPath,
    qaPath,
    scenesPath,
    sceneSegmentsPath,
    brollPath,
    reframePath,
    qaMarkersPath
  };
}
