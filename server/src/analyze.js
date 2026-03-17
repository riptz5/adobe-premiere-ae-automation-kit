import { z } from "zod";

const LlmResultSchema = z.object({
  chapters: z.array(z.object({
    start: z.number(),
    end: z.number(),
    title: z.string()
  })).optional(),
  segments: z.array(z.object({
    start: z.number(),
    end: z.number(),
    label: z.string().optional(),
    action: z.enum(["keep", "remove"]).optional()
  })).optional(),
  highlights: z.array(z.object({
    start: z.number(),
    end: z.number(),
    label: z.string(),
    score: z.number().optional()
  })).optional(),
  summary: z.string().optional()
});

export function isVtt(text) {
  const trimmed = text.trim();
  return trimmed.startsWith("WEBVTT") || trimmed.includes("-->");
}

export function parseVttToCues(vtt) {
  const lines = vtt.replace(/\r/g, "").split("\n");
  const cues = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || line === "WEBVTT") { i++; continue; }
    let maybeTime = line;
    if (!line.includes("-->") && i + 1 < lines.length && lines[i + 1].includes("-->")) {
      i++;
      maybeTime = lines[i].trim();
    }
    if (!maybeTime.includes("-->")) { i++; continue; }
    const [a, b] = maybeTime.split("-->").map(s => s.trim());
    const start = toSeconds(a);
    const end = toSeconds(b.split(" ")[0]);
    i++;
    const textLines = [];
    while (i < lines.length && lines[i].trim() !== "") {
      textLines.push(lines[i]);
      i++;
    }
    cues.push({ start, end, text: textLines.join("\n").trim() });
    i++;
  }
  return cues;
}

function toSeconds(ts) {
  const parts = ts.split(":");
  let h = 0, m = 0, s = 0;
  if (parts.length === 3) {
    h = Number(parts[0]);
    m = Number(parts[1]);
    s = Number(parts[2]);
  } else if (parts.length === 2) {
    m = Number(parts[0]);
    s = Number(parts[1]);
  } else {
    s = Number(parts[0]);
  }
  return h * 3600 + m * 60 + s;
}

function buildSystemPrompt(config) {
  if (config.llm?.systemPrompt) return config.llm.systemPrompt;
  return [
    "You are a post-production assistant.",
    "Return ONLY valid JSON. No markdown, no explanations.",
    "",
    "Required JSON shape:",
    "{",
    '  "chapters": [ { "start": number, "end": number, "title": "string" } ],',
    '  "segments": [ { "start": number, "end": number, "label": "string", "action": "keep|remove" } ],',
    '  "highlights": [ { "start": number, "end": number, "label": "string", "score": number } ],',
    '  "summary": "string"',
    "}",
    "",
    "Rules:",
    "- Create chapters based on topic changes.",
    "- Extract highlights for short clips.",
  ].join("\n");
}

function stripFillers(text, config, override) {
  const enabled = typeof override === "boolean" ? override : config.analyze?.removeFillers;
  if (!enabled || !text) return text;
  const fillers = config.analyze?.fillers && config.analyze.fillers.length
    ? config.analyze.fillers
    : ["um", "uh", "erm", "eh", "mmm", "like", "you know", "i mean", "este", "ehh", "mmm", "osea", "o sea", "vale"];
  const escaped = fillers.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
  return text.replace(pattern, " ").replace(/\s+/g, " ").trim();
}

async function runLLM(input, config) {
  if (!config.llm?.enabled || !config.features?.useLLM) return null;

  const apiKey = config.llm.apiKey || "";
  const baseUrl = (config.llm.baseUrl || "http://localhost:11434/v1").replace(/\/$/, "");
  const model = config.llm.model || "llama3:8b";
  const temperature = config.llm.temperature ?? 0.3;
  const timeoutMs = config.llm.timeoutMs ?? 60000;

  const systemPrompt = buildSystemPrompt(config);
  const textSample = input.transcript.slice(0, config.llm.maxTranscriptChars || 25000);
  const userPrompt = `Analyze this transcript:\n\n${textSample}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("LLM response is empty");

    const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    const validated = LlmResultSchema.safeParse(parsed);
    return validated.success ? validated.data : parsed;
  } catch (err) {
    console.error("[runLLM] Failed:", err.message);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function heuristicChapters(cues, maxDurationSec, config) {
  const duration = maxDurationSec ?? (cues.length ? cues[cues.length - 1].end : 0);
  const target = config.analyze?.chapterTargetSec ?? 120;
  const count = Math.max(1, Math.floor(duration / target) || 1);
  const chapters = [];
  for (let k = 0; k < count; k++) {
    const start = Math.floor((duration * k) / count);
    const end = Math.floor((duration * (k + 1)) / count);
    chapters.push({ start, end, title: `Chapter ${k + 1}` });
  }
  return chapters;
}

function pickHighlights(cues, config) {
  const keywords = [
    "important", "tip", "trick", "key", "hack", "summary", "conclusion",
    "importante", "ojo", "truco", "clave", "conclusión", "conclusion"
  ];
  const max = config.analyze?.highlightMax ?? 5;
  const candidates = cues.filter(c => keywords.some(k => c.text.toLowerCase().includes(k)));
  return candidates.slice(0, max).map((c, i) => ({
    start: c.start,
    end: c.end,
    label: `Highlight ${i + 1}`
  }));
}

function normalizeChapters(chapters) {
  if (!Array.isArray(chapters)) return [];
  return chapters
    .filter(ch => Number.isFinite(ch.start) && Number.isFinite(ch.end) && ch.title)
    .map(ch => ({
      start: Number(ch.start),
      end: Number(ch.end),
      title: String(ch.title)
    }));
}

function normalizeHighlights(highlights, max) {
  if (!Array.isArray(highlights)) return [];
  const cleaned = highlights
    .filter(h => Number.isFinite(h.start) && Number.isFinite(h.end) && h.label)
    .map(h => ({
      start: Number(h.start),
      end: Number(h.end),
      label: String(h.label),
      score: Number.isFinite(h.score) ? Number(h.score) : undefined
    }));
  return cleaned.slice(0, max);
}

function normalizeSegments(segments) {
  if (!Array.isArray(segments)) return [];
  return segments
    .filter(s => Number.isFinite(s.start) && Number.isFinite(s.end))
    .map(s => ({
      start: Number(s.start),
      end: Number(s.end),
      label: s.label ? String(s.label) : "",
      action: s.action === "remove" ? "remove" : "keep"
    }))
    .filter(s => s.end > s.start);
}

function buildMarkers(chapters, highlights) {
  const markers = [];
  for (const ch of chapters) {
    markers.push({
      timeSec: ch.start,
      name: ch.title,
      comment: `CHAPTER: ${ch.title}`,
      type: "chapter"
    });
  }
  for (const h of highlights) {
    markers.push({
      timeSec: h.start,
      name: h.label,
      comment: "HIGHLIGHT",
      type: "highlight"
    });
  }
  return markers.sort((a, b) => a.timeSec - b.timeSec);
}

function buildSegmentsFallback(cues) {
  if (!cues.length) return [];
  const start = cues[0].start || 0;
  const end = cues[cues.length - 1].end || 0;
  return [{ start, end, label: "Full", action: "keep" }];
}

function buildSegmentsFromHighlights(highlights, paddingSec = 0.5) {
  if (!highlights.length) return [];
  const segments = highlights.map((h, i) => ({
    start: Math.max(0, h.start - paddingSec),
    end: Math.max(h.start, h.end + paddingSec),
    label: h.label || `Highlight ${i + 1}`,
    action: "keep"
  }));
  segments.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && seg.start <= last.end) {
      last.end = Math.max(last.end, seg.end);
      continue;
    }
    merged.push(seg);
  }
  return merged;
}

function buildHeuristicSummary(cues) {
  if (!cues.length) return "";
  const text = cues.map(c => c.text).join(" ").replace(/\s+/g, " ").trim();
  return text.slice(0, 200);
}

export async function analyzeTranscript(input, config) {
  const transcript = input.transcript?.trim() || "";
  if (!transcript) throw new Error("Transcript is required");

  const effectiveTranscript = stripFillers(transcript, config, input.removeFillers);
  const rawCues = isVtt(transcript)
    ? parseVttToCues(transcript)
    : [{ start: 0, end: 0, text: transcript }];
  const cues = rawCues.map((c) => ({
    ...c,
    text: stripFillers(c.text, config, input.removeFillers)
  }));

  const llmResult = await runLLM({ transcript: effectiveTranscript }, config);
  let chapters = [];
  let highlights = [];
  let segments = [];
  let summary = "";
  let source = "Heuristic";

  if (llmResult) {
    source = "AI";
    chapters = normalizeChapters(llmResult.chapters);
    segments = normalizeSegments(llmResult.segments);
    highlights = normalizeHighlights(llmResult.highlights, config.analyze?.highlightMax ?? 5);
    summary = llmResult.summary || "";
  } else if (config.features?.useFallbacks) {
    chapters = heuristicChapters(cues, input.maxDurationSec, config);
    highlights = pickHighlights(cues, config);
    segments = buildSegmentsFromHighlights(highlights);
    if (!segments.length) segments = buildSegmentsFallback(cues);
    summary = buildHeuristicSummary(cues);
  }

  const markers = buildMarkers(chapters, highlights);
  return { chapters, segments, highlights, markers, summary, source };
}
