import fs from "fs/promises";
import path from "path";
import { buildTimelineContract, timelineToOtio } from "./timeline/contract.js";

function buildBaseName(job, config) {
  if (config.output?.useSourceName && job.input?.source?.path) {
    const parsed = path.parse(job.input.source.path);
    if (parsed.name) return `${parsed.name}__${job.id}`;
  }
  return job.id;
}

export async function writeTimelineOutputs(job, config) {
  if (config.integrations?.oss?.otioEnabled === false) return null;
  const dir = config.paths?.absTimelineDir || config.paths?.absResultsDir || config.paths?.absDataDir;
  if (!dir) return null;
  await fs.mkdir(dir, { recursive: true });

  const baseName = buildBaseName(job, config);
  const timelinePath = path.join(dir, `${baseName}.timeline.json`);
  const otioPath = path.join(dir, `${baseName}.timeline.otio.json`);

  const contract = buildTimelineContract(job, config);
  const otio = timelineToOtio(contract);

  await fs.writeFile(timelinePath, JSON.stringify(contract, null, 2), "utf8");
  await fs.writeFile(otioPath, JSON.stringify(otio, null, 2), "utf8");

  return { timelinePath, otioPath, contract, otio };
}
