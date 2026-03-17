/**
 * AutoKit orchestrator agent: understands natural language and runs backend actions via LLM.
 * Uses the same LLM config as transcript analysis (Ollama). Loops: LLM can output TOOL: <json>,
 * we execute the tool and feed the result back until the LLM replies with a final answer.
 */

const MAX_STEPS = 10;
const TOOL_PREFIX = "TOOL:";

const AGENT_SYSTEM = `You are the AutoKit orchestrator. The user speaks Spanish or English. You understand what they want and you have tools to do it.

To call a tool, output exactly one line starting with TOOL: followed by a JSON object. No other text on that line.
After you see the tool result, you can call another tool (output TOOL: again) or reply to the user in natural language. Reply in the same language the user used.

Available tools (action + params). You can do EVERYTHING the backend supports:
- get_health → {}
- get_metrics → {}
- get_config → {} (current server config, redacted)
- list_profiles → {} (profile names)
- get_profile → { "name": "shorts|ads|longform|docu" }
- create_profile → { "name": string, "from"?: string } (clone from existing)
- save_profile → { "name": string, "body": object } (full profile JSON)
- delete_profile → { "name": string }
- get_local_config → {} (config/local.json)
- save_local_config → { "body": object } (writes config/local.json and reloads server)
- list_jobs → {}
- get_job → { "jobId": "uuid" }
- create_job → { "mediaPath"?: string, "transcript"?: string, "profile"?: string, "autoRun"?: boolean }
- run_job → { "jobId": "uuid" }
- retry_job → { "jobId": "uuid" }
- probe_media → { "path": "absolute or relative path to file" }
- run_qa → { "path": "path to video/audio" }
- analyze_transcript → { "transcript": "VTT or plain text", "profile"?: "shorts|ads|longform|docu" }
- normalize_audio → { "path": "path to audio/video" }
- scene_detect → { "path": "path to video" }
- broll_suggest → { "text": "keywords or summary" }
- reframe → { "path": "path to video", "target"?: "9:16" }
- music_analyze → { "path": "path to audio/video", "profile"?: "shorts" }

Examples:
- "¿cómo está el servidor?" → TOOL: {"action":"get_health"}
- "reintenta el último job que falló" → first TOOL: {"action":"list_jobs"}, then from the list pick one with status "error" and TOOL: {"action":"retry_job","jobId":"that-id"}
- "lista de jobs" → TOOL: {"action":"list_jobs"}
- "crea un job con este media /path/to/video.mp4" → TOOL: {"action":"create_job","mediaPath":"/path/to/video.mp4","profile":"shorts","autoRun":true}
- "analiza este transcript" (if user pasted transcript) → TOOL: {"action":"analyze_transcript","transcript":"..."}

If the user's request is ambiguous or you need more info, ask briefly in their language. If you cannot do what they ask, say so.`;

function extractToolCall(content) {
  const line = content.split("\n").find((l) => l.trimStart().startsWith(TOOL_PREFIX));
  if (!line) return null;
  const jsonStr = line.trimStart().slice(TOOL_PREFIX.length).trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

async function callLlm(messages, config) {
  if (!config.llm?.enabled) throw new Error("LLM not enabled in config");

  const baseUrl = (config.llm.baseUrl || "http://localhost:11434/v1").replace(/\/$/, "");
  const model = config.llm.model || "llama3:8b";
  const temperature = config.llm.temperature ?? 0.2;
  const timeoutMs = Math.min((config.llm.timeoutMs || 60000), 90000);
  const apiKey = config.llm.apiKey || "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 1024,
    }),
    signal: controller.signal,
  });
  clearTimeout(timeout);

  if (!res.ok) throw new Error(`LLM API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty content");
  return content.trim();
}

async function runTool(tool, actions) {
  const { action, jobId, path, mediaPath, transcript, profile, autoRun, text, target, name, from, body } = tool;

  switch (action) {
    case "get_health":
      return await actions.getHealth();
    case "get_metrics":
      return await actions.getMetrics();
    case "get_config":
      return await actions.getConfig();
    case "list_profiles":
      return await actions.listProfiles();
    case "get_profile":
      return await actions.getProfile(name);
    case "create_profile":
      return await actions.createProfile(name, from);
    case "save_profile":
      return await actions.saveProfile(name, body);
    case "delete_profile":
      return await actions.deleteProfile(name);
    case "get_local_config":
      return await actions.getLocalConfig();
    case "save_local_config":
      return await actions.saveLocalConfig(body);
    case "list_jobs":
      return await actions.listJobs();
    case "get_job":
      return await actions.getJob(jobId);
    case "create_job":
      return await actions.createJob({ mediaPath, transcript, profile, autoRun });
    case "run_job":
      return await actions.runJob(jobId);
    case "retry_job":
      return await actions.retryJob(jobId);
    case "probe_media":
      return await actions.probe(path);
    case "run_qa":
      return await actions.runQa(path);
    case "analyze_transcript":
      return await actions.analyzeTranscript({ transcript, profile });
    case "normalize_audio":
      return await actions.normalizeAudio(path);
    case "scene_detect":
      return await actions.sceneDetect(path);
    case "broll_suggest":
      return await actions.brollSuggest(text);
    case "reframe":
      return await actions.reframe(path, target);
    case "music_analyze":
      return await actions.musicAnalyze(path, profile);
    default:
      return { error: "Unknown action: " + action };
  }
}

/**
 * Run the agent: userMessage + optional history, loop LLM + tool execution until final reply.
 * @param {string} userMessage
 * @param {{ role: string, content: string }[]} history - previous turns (user/assistant)
 * @param {object} actions - implementations of getHealth, getMetrics, listJobs, getJob, createJob, runJob, retryJob, probe, runQa, analyzeTranscript, etc.
 * @param {object} config - server config (llm, etc.)
 * @returns {{ reply: string, steps?: { tool: object, result: object }[] }}
 */
export async function runAgentChat(userMessage, history, actions, config) {
  const messages = [
    { role: "system", content: AGENT_SYSTEM },
    ...(history || []).flatMap((h) => [
      { role: h.role === "user" ? "user" : "assistant", content: h.content },
    ]),
    { role: "user", content: userMessage },
  ];

  const steps = [];
  let step = 0;

  while (step < MAX_STEPS) {
    step += 1;
    const content = await callLlm(messages, config);
    const toolCall = extractToolCall(content);

    if (!toolCall) {
      return { reply: content, steps: steps.length ? steps : undefined };
    }

    let result;
    try {
      result = await runTool(toolCall, actions);
    } catch (err) {
      result = { error: err.message || String(err) };
    }

    steps.push({ tool: toolCall, result });

    const resultStr = typeof result === "string" ? result : JSON.stringify(result);
    const truncated = resultStr.length > 3000 ? resultStr.slice(0, 3000) + "\n...[truncated]" : resultStr;
    messages.push(
      { role: "assistant", content },
      { role: "user", content: `Tool result:\n${truncated}\n\nNow reply to the user or call another tool (TOOL: {...}).` }
    );
  }

  return {
    reply: "Llegué al límite de pasos. Resumen: " + steps.map((s) => s.tool.action).join(", "),
    steps,
  };
}
