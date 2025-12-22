import fs from "fs/promises";
import { loadConfig } from "./config.js";
import { analyzeTranscript } from "./analyze.js";
import { initJobStore, newJob, writeJob } from "./jobs.js";
import { runJob } from "./pipeline.js";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(arg);
    }
  }
  return args;
}

async function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function applyCliOverrides(config, args) {
  if (args["no-llm"]) {
    config.features.useLLM = false;
    if (config.llm) config.llm.enabled = false;
  }
  return config;
}

function printUsage() {
  console.log(`AutoKit CLI

Usage:
  node src/cli.js analyze --file <path> [--profile shorts] [--no-llm]
  node src/cli.js analyze --text "..." [--profile shorts] [--no-llm]
  node src/cli.js analyze --stdin [--profile shorts] [--no-llm]

  node src/cli.js job --file <path> [--profile shorts] [--no-llm]
  node src/cli.js job --media <path> [--profile shorts]
  node src/cli.js job --text "..." [--profile shorts] [--no-llm]
  node src/cli.js job --stdin [--profile shorts] [--no-llm] [--no-run]
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  if (!command || (command !== "analyze" && command !== "job")) {
    printUsage();
    process.exit(1);
  }

  const profile = args.profile;
  const config = applyCliOverrides(await loadConfig({ profileOverride: profile }), args);

  let transcript = "";
  if (args.file) {
    transcript = await fs.readFile(args.file, "utf8");
  } else if (args.text) {
    transcript = String(args.text);
  } else if (args.stdin) {
    transcript = await readStdin();
  } else if (args.media) {
    transcript = "";
  }

  if (!transcript.trim() && !args.media) {
    console.error("No transcript provided.");
    printUsage();
    process.exit(1);
  }

  if (command === "analyze") {
    const result = await analyzeTranscript({ transcript }, config);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  await initJobStore(config);
  const job = newJob({
    transcript,
    profile: config.profile,
    media: args.media ? { path: args.media, kind: "media" } : null,
    source: args.file ? { path: args.file, kind: "transcript" } : null
  });
  await writeJob(job, config);

  const autoRun = !args["no-run"];
  if (autoRun) {
    const finished = await runJob(job, config);
    console.log(JSON.stringify(finished, null, 2));
  } else {
    console.log(JSON.stringify(job, null, 2));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
