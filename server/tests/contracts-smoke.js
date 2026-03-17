// Lightweight contract smoke checks for core Job shape.
// This is intentionally minimal and dependency-free.

import { newJob, addJobEvent } from "../src/jobs.js";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const job = newJob({
    transcript: "hola mundo",
    media: { path: "/tmp/fake.mp4", kind: "media" },
    profile: "shorts",
    options: { maxDurationSec: 30 },
    source: { path: "/tmp/fake.vtt" }
  });

  // Basic Job contract fields
  assert(typeof job.id === "string" && job.id.length > 0, "job.id debe ser string no vacío");
  assert(["queued", "running", "ready", "error"].includes(job.status), "job.status debe ser uno de queued|running|ready|error");
  assert(typeof job.createdAt === "string", "job.createdAt debe ser ISO string");
  assert(typeof job.updatedAt === "string", "job.updatedAt debe ser ISO string");
  assert(typeof job.profile === "string", "job.profile debe ser string");

  // Input shape
  assert(job.input && typeof job.input === "object", "job.input debe existir");
  assert(typeof job.input.transcript === "string", "job.input.transcript debe ser string");
  assert(job.input.media && typeof job.input.media.path === "string", "job.input.media.path debe ser string");

  // Events
  assert(Array.isArray(job.events) && job.events.length === 1, "job.events debe tener al menos un evento");
  addJobEvent(job, "test", "Contract smoke test");
  assert(job.events.length === 2, "addJobEvent debe añadir eventos");

  // JSON serialization must be stable
  const json = JSON.stringify(job);
  assert(typeof json === "string" && json.includes("\"id\""), "Job debe serializarse a JSON correctamente");

  // If we got here, consider contract smoke passing.
  // eslint-disable-next-line no-console
  console.log("contracts-smoke: OK");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("contracts-smoke: FAILED", err);
  process.exitCode = 1;
});

