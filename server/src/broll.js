import fs from "fs/promises";
import path from "path";

const MEDIA_EXTS = new Set([".mp4", ".mov", ".mxf", ".mp3", ".wav", ".aiff"]);

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s_-]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreFilename(name, tokens) {
  let score = 0;
  for (const t of tokens) {
    const count = name.split(t).length - 1;
    score += count;
  }
  return score;
}

async function walk(dir, results) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, results);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (MEDIA_EXTS.has(ext)) results.push(full);
    }
  }
}

/**
 * Suggest b-roll clips for a given text query, optionally enriched with
 * job context (summary, chapter titles) for better semantic matching.
 *
 * @param {string} text     - Base query text (segment label, caption, etc.)
 * @param {object} config   - AutoKit config
 * @param {object} [ctx]    - Optional context: { summary, chapters }
 */
export async function suggestBroll(text, config, ctx = {}) {
  // build enriched query: base text + summary snippet + chapter titles
  const parts = [text];
  if (ctx.summary) parts.push(ctx.summary.slice(0, 200));
  if (Array.isArray(ctx.chapters)) {
    parts.push(ctx.chapters.map(ch => ch.title || "").join(" "));
  }
  const combined = parts.join(" ");

  const tokens = tokenize(combined);
  if (!tokens.length) return { ok: true, items: [] };
  const libraryDir = config.paths.absBrollDir;
  let files = [];
  try {
    await walk(libraryDir, files);
  } catch (err) {
    if (err.code === "ENOENT") return { ok: true, items: [] };
    return { ok: false, error: err.message };
  }

  const scored = files.map((file) => {
    const name = path.basename(file).toLowerCase();
    const score = scoreFilename(name, tokens);
    return { path: file, score };
  });

  const minScore = config.broll?.minScore ?? 1;
  const maxResults = config.broll?.maxResults ?? 8;
  const filtered = scored.filter(item => item.score >= minScore);
  filtered.sort((a, b) => b.score - a.score);
  return { ok: true, items: filtered.slice(0, maxResults) };
}
