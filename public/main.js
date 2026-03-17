// AutoKit Dashboard client (served by AutoKit server on :8787)
async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function setLog(el, value) {
  el.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function qaToCsv(id, qa) {
  const rows = [
    ["jobId", "metric", "value"],
    [id, "silence_events", qa?.silence?.length || 0],
    [id, "silence_total_sec", (qa?.silence || []).reduce((s, e) => s + (e.duration || 0), 0)],
    [id, "black_events", qa?.black?.length || 0],
    [id, "black_total_sec", (qa?.black || []).reduce((s, e) => s + (e.duration || 0), 0)],
    [id, "loudness_I", qa?.loudness?.integrated ?? ""],
    [id, "loudness_LRA", qa?.loudness?.lra ?? ""],
    [id, "max_volume", qa?.loudness?.maxVolume ?? ""]
  ];
  return rows.map((r) => r.join(",")).join("\n");
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ":" + String(s).padStart(2, "0");
}

const JOB_STUDIO_TABS = ["overview", "result", "chapters", "segments", "markers", "qa", "scenes", "broll", "reframe", "music", "timeline"];

async function fetchTimeline(jobId) {
  const res = await getJSON("/v1/jobs/" + encodeURIComponent(jobId) + "/timeline");
  return res;
}

function renderJobStudioContent(job, tabId) {
  const el = document.getElementById("jobStudioContent");
  if (!el) return;
  if (tabId === "overview") {
    const parts = [];
    parts.push("Status: " + escapeHtml(job.status) + " · Profile: " + escapeHtml(job.profile || "—"));
    if (job.result?.summary) parts.push("\nSummary: " + escapeHtml(job.result.summary));
    const counts = [];
    if (job.result?.chapters?.length) counts.push("Chapters: " + job.result.chapters.length);
    if (job.result?.segments?.length) counts.push("Segments: " + job.result.segments.length);
    if (job.result?.markers?.length) counts.push("Markers: " + job.result.markers.length);
    if (job.qa) counts.push("QA: yes");
    if (job.qaMarkers?.length) counts.push("QA markers: " + job.qaMarkers.length);
    if (job.scenes?.length) counts.push("Scenes: " + job.scenes.length);
    if (job.broll?.length) counts.push("B-roll: " + job.broll.length);
    if (job.reframed?.length) counts.push("Reframe: " + job.reframed.length);
    parts.push("\n" + counts.join(" · "));
    el.innerHTML = "<pre style='margin:0; white-space:pre-wrap;'>" + parts.join("") + "</pre>";
    return;
  }
  if (tabId === "result") {
    el.innerHTML = "<pre style='margin:0; white-space:pre-wrap;'>" + escapeHtml(JSON.stringify(job.result || {}, null, 2)) + "</pre>";
    return;
  }
  if (tabId === "chapters" && job.result?.chapters?.length) {
    let html = "<table class='job-studio-table'><thead><tr><th>Start</th><th>End</th><th>Title</th></tr></thead><tbody>";
    job.result.chapters.forEach((ch) => {
      html += "<tr><td>" + formatTime(ch.start) + "</td><td>" + formatTime(ch.end) + "</td><td>" + escapeHtml(ch.title || "—") + "</td></tr>";
    });
    html += "</tbody></table>";
    el.innerHTML = html;
    return;
  }
  if (tabId === "segments" && job.result?.segments?.length) {
    let html = "<table class='job-studio-table'><thead><tr><th>Start</th><th>End</th><th>Label</th><th>Action</th></tr></thead><tbody>";
    job.result.segments.forEach((sg) => {
      html += "<tr><td>" + formatTime(sg.start) + "</td><td>" + formatTime(sg.end) + "</td><td>" + escapeHtml(sg.label || "—") + "</td><td>" + escapeHtml(sg.action || "keep") + "</td></tr>";
    });
    html += "</tbody></table>";
    el.innerHTML = html;
    return;
  }
  if (tabId === "markers" && job.result?.markers?.length) {
    let html = "<table class='job-studio-table'><thead><tr><th>Time</th><th>Name</th><th>Type</th><th>Comment</th></tr></thead><tbody>";
    job.result.markers.forEach((m) => {
      html += "<tr><td>" + formatTime(m.timeSec) + "</td><td>" + escapeHtml(m.name || "—") + "</td><td>" + escapeHtml(m.type || "—") + "</td><td>" + escapeHtml(m.comment || "—") + "</td></tr>";
    });
    html += "</tbody></table>";
    el.innerHTML = html;
    return;
  }
  if (tabId === "qa") {
    const qa = job.qa || {};
    let text = "";
    if (qa.silence?.length) text += "Silence: " + qa.silence.length + " events\n";
    if (qa.black?.length) text += "Black: " + qa.black.length + " events\n";
    if (qa.loudness) text += "Loudness I: " + (qa.loudness.integrated ?? "—") + " LRA: " + (qa.loudness.lra ?? "—") + " Max: " + (qa.loudness.maxVolume ?? "—") + "\n";
    el.innerHTML = "<pre style='margin:0; white-space:pre-wrap;'>" + escapeHtml((text || "No QA data.") + "\n\n" + JSON.stringify(qa, null, 2)) + "</pre>";
    return;
  }
  if (tabId === "scenes") {
    const scenes = job.scenes || [];
    const segs = job.sceneSegments || [];
    let html = "";
    if (scenes.length) html += "<p>Cut points: " + scenes.map(formatTime).join(", ") + "</p>";
    if (segs.length) {
      html += "<table class='job-studio-table'><thead><tr><th>Start</th><th>End</th></tr></thead><tbody>";
      segs.forEach((s) => { html += "<tr><td>" + formatTime(s.start) + "</td><td>" + (s.end != null ? formatTime(s.end) : "—") + "</td></tr>"; });
      html += "</tbody></table>";
    }
    el.innerHTML = html || "<p class='muted'>No scenes.</p>";
    return;
  }
  if (tabId === "broll" && job.broll?.length) {
    el.innerHTML = "<ul>" + job.broll.map((b) => "<li>" + escapeHtml(b.path) + " (score: " + escapeHtml(String(b.score)) + ")</li>").join("") + "</ul>";
    return;
  }
  if (tabId === "reframe" && job.reframed?.length) {
    el.innerHTML = "<ul>" + job.reframed.map((r) => "<li>" + escapeHtml(r.target) + ": " + (r.ok ? escapeHtml(r.outputPath || "ok") : escapeHtml(r.error || "failed")) + "</li>").join("") + "</ul>";
    return;
  }
  if (tabId === "music") {
    const m = job.music || {};
    const parts = [];
    if (m.beats?.length) parts.push("<p>Beats: " + m.beats.length + "</p>");
    if (m.sections?.length) parts.push("<p>Sections: " + m.sections.length + "</p>");
    if (m.drops?.length) parts.push("<p>Drops: " + m.drops.length + "</p>");
    if (m.warnings?.length) parts.push("<p>Warnings: " + m.warnings.join(", ") + "</p>");
    if (m.waveformPath) parts.push("<p>Waveform: " + m.waveformPath + "</p>");
    if (m.spectrogramPath) parts.push("<p>Spectrogram: " + m.spectrogramPath + "</p>");
    el.innerHTML = (parts.length ? parts.join("") : "<p class='muted'>No music data.</p>") + "<pre style='margin-top:8px;'>" + JSON.stringify(m, null, 2) + "</pre>";
    return;
  }
  if (tabId === "timeline") {
    const paths = [];
    if (job.outputs?.timelinePath) paths.push("Timeline JSON: " + job.outputs.timelinePath);
    if (job.outputs?.otioPath) paths.push("OTIO: " + job.outputs.otioPath);
    const html = [];
    if (paths.length) html.push("<p>" + paths.join("<br>") + "</p>");
    html.push("<button id='btnFetchTimeline'>Fetch /v1/jobs/" + job.id + "/timeline</button>");
    html.push("<pre id='timelineViewer' style='margin-top:8px; white-space:pre-wrap;'>Pending…</pre>");
    el.innerHTML = html.join("");
    const btn = document.getElementById("btnFetchTimeline");
    const viewer = document.getElementById("timelineViewer");
    if (btn && viewer) {
      btn.onclick = async () => {
        viewer.textContent = "Loading timeline…";
        try {
          const data = await fetchTimeline(job.id);
          viewer.textContent = JSON.stringify(data, null, 2);
        } catch (err) {
          viewer.textContent = "Error: " + err.message;
        }
      };
    }
    return;
  }
  el.innerHTML = "<p class='muted'>No data for this tab.</p>";
}

async function openJobStudio(jobId) {
  const wrap = document.getElementById("jobStudioWrap");
  const idEl = document.getElementById("jobStudioId");
  const tabsEl = document.getElementById("jobStudioTabs");
  const contentEl = document.getElementById("jobStudioContent");
  if (!wrap || !idEl || !tabsEl || !contentEl) return;
  idEl.textContent = jobId;
  wrap.style.display = "block";
  contentEl.textContent = "Loading...";
  try {
    const data = await getJSON("/v1/jobs/" + encodeURIComponent(jobId));
    const job = data.job;
    if (!job) { contentEl.textContent = "Job not found."; return; }
    tabsEl.innerHTML = "";
    let activeTab = "overview";
    JOB_STUDIO_TABS.forEach((tabId) => {
      const btn = document.createElement("button");
      btn.className = "tab" + (tabId === activeTab ? " active" : "");
      btn.dataset.tab = tabId;
      btn.textContent = tabId.charAt(0).toUpperCase() + tabId.slice(1);
      btn.onclick = () => {
        tabsEl.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tabId));
        renderJobStudioContent(job, tabId);
      };
      tabsEl.appendChild(btn);
    });
    renderJobStudioContent(job, activeTab);
  } catch (err) {
    contentEl.textContent = "Error: " + err.message;
  }
}

const sections = {
  general: [
    { key: "profile", label: "Profile activo", type: "select", options: [] },
    { key: "autoRun", label: "Auto-run al detectar media", type: "checkbox" },
    { key: "runMode", label: "Run mode", type: "select", options: ["auto", "manual", "dry-run"] },
    { key: "logLevel", label: "Log level", type: "select", options: ["info", "debug", "warn", "error"] }
  ],
  ingest: [
    { key: "watch.folders", label: "Watch folders (coma)", type: "text", array: true },
    { key: "watch.extensions", label: "Ext transcripts", type: "text", array: true },
    { key: "watch.mediaExtensions", label: "Ext media", type: "text", array: true },
    { key: "watch.enabled", label: "Auto-ingest on", type: "checkbox" }
  ],
  analyze: [
    { key: "stt.engine", label: "STT engine", type: "select", options: ["whisper.cpp", "faster-whisper"] },
    { key: "stt.modelSize", label: "Model size", type: "select", options: ["tiny", "small", "medium", "large"] },
    { key: "analyze.chapterTargetSec", label: "Chapter target (s)", type: "number" },
    { key: "llm.model", label: "LLM model", type: "text" },
    { key: "llm.temperature", label: "LLM temp", type: "number" }
  ],
  edit: [
    { key: "features.useScenes", label: "Scene detect", type: "checkbox" },
    { key: "features.useBroll", label: "Auto b-roll", type: "checkbox" },
    { key: "features.useReframe", label: "Auto reframe", type: "checkbox" },
    { key: "output.writeSegments", label: "Escribir segments", type: "checkbox" }
  ],
  render: [
    { key: "render.presetPath", label: "Preset AME", type: "text" },
    { key: "render.outputDir", label: "Carpeta output", type: "text" }
  ],
  integrations: [
    { key: "integrations.frameio.enabled", label: "Frame.io ON", type: "checkbox" },
    { key: "integrations.frameio.token", label: "Frame.io token", type: "password" },
    { key: "integrations.adobeStock.enabled", label: "Adobe Stock ON", type: "checkbox" },
    { key: "integrations.adobeStock.apiKey", label: "Adobe Stock API Key", type: "password" },
    { key: "integrations.apiMesh.enabled", label: "API Mesh ON", type: "checkbox" },
    { key: "integrations.apiMesh.baseUrl", label: "API Mesh base URL", type: "text" }
  ],
  advanced: [
    { key: "qa.silenceThresholdDb", label: "Silence dB", type: "number" },
    { key: "qa.blackThreshold", label: "Black threshold", type: "number" },
    { key: "qa.spectral", label: "Spectral stats", type: "checkbox" },
    { key: "audio.denoise", label: "Denoise", type: "checkbox" },
    { key: "paths.dataDir", label: "Data dir", type: "text" }
  ]
};

function get(obj, path, fallback) {
  if (!obj) return fallback;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = cur[p];
    } else {
      return fallback;
    }
  }
  return cur;
}

function set(obj, path, value) {
  const parts = path.split(".");
  let cur = obj;
  while (parts.length > 1) {
    const p = parts.shift();
    if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p];
  }
  cur[parts[0]] = value;
}

function cast(value, type) {
  if (type === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return value;
}

let currentConfig = {};
let profileOptions = [];

async function loadProfiles() {
  const data = await getJSON("/v1/config/profiles");
  const profiles = data.profiles || ["shorts"];
  profileOptions = profiles;
  if (sections.general[0]) sections.general[0].options = profiles;
  const selects = [document.getElementById("profileSelect"), document.getElementById("jobProfileSelect"), document.getElementById("musicPanelProfile")];
  for (const select of selects) {
    if (!select) continue;
    select.innerHTML = "";
    for (const p of profiles) {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      select.appendChild(opt);
    }
  }
}

async function analyze() {
  const transcript = document.getElementById("transcriptInput").value.trim();
  const profile = document.getElementById("profileSelect").value;
  if (!transcript) return setLog(document.getElementById("analyzeOutput"), "Paste transcript first.");
  const data = await postJSON("/v1/analyze/transcript", { transcript, profile });
  setLog(document.getElementById("analyzeOutput"), data);
}

async function createJob(autoRun) {
  const profile = document.getElementById("jobProfileSelect").value;
  const mediaPath = document.getElementById("mediaPathInput").value.trim();
  const transcript = document.getElementById("jobTranscriptInput").value.trim();
  const body = { profile, autoRun };
  if (mediaPath) body.mediaPath = mediaPath;
  if (transcript) body.transcript = transcript;
  const data = await postJSON("/v1/jobs", body);
  setLog(document.getElementById("jobOutput"), data);
  await loadJobs();
}

function renderJob(job) {
  const div = document.createElement("div");
  div.className = "job";
  const title = document.createElement("div");
  title.innerHTML = `<strong>${escapeHtml(job.status)}</strong> ${escapeHtml(job.id)}`;
  const meta = document.createElement("div");
  meta.className = "muted";
  meta.textContent = `${job.profile || "default"} | ${job.createdAt || ""} | runMode=${job.runMode || "auto"}`;
  const actions = document.createElement("div");
  actions.className = "actions";

  const mkBtn = (label, handler, secondary = true) => {
    const b = document.createElement("button");
    if (secondary) b.className = "secondary";
    b.textContent = label;
    b.onclick = handler;
    return b;
  };

  actions.appendChild(mkBtn("Open Studio", () => openJobStudio(job.id), false));
  actions.appendChild(mkBtn("Run", async () => {
    const data = await postJSON(`/v1/jobs/${job.id}/run`, {});
    setLog(document.getElementById("jobOutput"), data);
    await loadJobs();
  }));
  actions.appendChild(mkBtn("Retry", async () => {
    const data = await postJSON(`/v1/jobs/${job.id}/retry`, {});
    setLog(document.getElementById("jobOutput"), data);
    await loadJobs();
  }));
  actions.appendChild(mkBtn("Result", async () => setLog(document.getElementById("jobOutput"), await getJSON(`/v1/jobs/${job.id}/result`))));
  actions.appendChild(mkBtn("Markers", async () => setLog(document.getElementById("jobOutput"), await getJSON(`/v1/jobs/${job.id}/markers`))));
  actions.appendChild(mkBtn("Segments", async () => setLog(document.getElementById("jobOutput"), await getJSON(`/v1/jobs/${job.id}/segments`))));
  actions.appendChild(mkBtn("Chapters", async () => setLog(document.getElementById("jobOutput"), await getJSON(`/v1/jobs/${job.id}/chapters`))));
  actions.appendChild(mkBtn("Summary", async () => setLog(document.getElementById("jobOutput"), await getJSON(`/v1/jobs/${job.id}/summary`))));
  actions.appendChild(mkBtn("QA", async () => setLog(document.getElementById("jobOutput"), await getJSON(`/v1/jobs/${job.id}/qa`))));
  actions.appendChild(mkBtn("QA CSV", async () => {
    const data = await getJSON(`/v1/jobs/${job.id}/qa`);
    setLog(document.getElementById("jobOutput"), qaToCsv(job.id, data.qa || {}));
  }));
  actions.appendChild(mkBtn("QA Markers", async () => setLog(document.getElementById("jobOutput"), await getJSON(`/v1/jobs/${job.id}/qa-markers`))));
  actions.appendChild(mkBtn("Scenes", async () => setLog(document.getElementById("jobOutput"), await getJSON(`/v1/jobs/${job.id}/scenes`))));
  actions.appendChild(mkBtn("B-roll", async () => setLog(document.getElementById("jobOutput"), await getJSON(`/v1/jobs/${job.id}/broll`))));
  actions.appendChild(mkBtn("Reframe", async () => setLog(document.getElementById("jobOutput"), await getJSON(`/v1/jobs/${job.id}/reframe`))));

  div.appendChild(title);
  div.appendChild(meta);
  div.appendChild(actions);
  return div;
}

function renderJobCard(job) {
  const status = (job.status === "done" ? "ready" : job.status) || "queued";
  const card = document.createElement("div");
  card.className = "kanban-card";
  const title = document.createElement("div");
  title.innerHTML = `<strong>${escapeHtml(job.id.slice(0, 8))}</strong> · ${escapeHtml(job.profile || "—")}`;
  const meta = document.createElement("div");
  meta.className = "muted";
  meta.textContent = job.createdAt || "";
  const actions = document.createElement("div");
  actions.className = "actions";
  const mkBtn = (label, handler, secondary = true) => {
    const b = document.createElement("button");
    if (secondary) b.className = "secondary";
    b.textContent = label;
    b.onclick = handler;
    return b;
  };
  actions.appendChild(mkBtn("Studio", () => openJobStudio(job.id), false));
  actions.appendChild(mkBtn("Run", async () => {
    await postJSON(`/v1/jobs/${job.id}/run`, {});
    await loadJobs();
  }));
  actions.appendChild(mkBtn("Retry", async () => {
    await postJSON(`/v1/jobs/${job.id}/retry`, {});
    await loadJobs();
  }));
  card.appendChild(title);
  card.appendChild(meta);
  card.appendChild(actions);
  return { card, status };
}

let jobsViewMode = "list";

async function loadJobs() {
  const list = document.getElementById("jobsList");
  const kanban = document.getElementById("jobsKanban");
  const colIds = { queued: "kanbanQueued", running: "kanbanRunning", ready: "kanbanReady", error: "kanbanError" };
  list.innerHTML = "";
  Object.values(colIds).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });
  const sinceEl = document.getElementById("jobsSinceFilter");
  const sinceDays = sinceEl?.value ? Number(sinceEl.value) : null;
  const url = sinceDays ? `/v1/jobs?limit=100&sinceDays=${sinceDays}` : "/v1/jobs?limit=100";
  const data = await getJSON(url);
  const jobs = data.jobs || [];
  if (!jobs.length) {
    list.textContent = "No jobs yet.";
    const kanbanEl = document.getElementById("jobsKanban");
    if (list) list.style.display = jobsViewMode === "list" ? "" : "none";
    if (kanbanEl) kanbanEl.style.display = jobsViewMode === "kanban" ? "" : "none";
    return;
  }
  for (const job of jobs) {
    list.appendChild(renderJob(job));
    const { card, status } = renderJobCard(job);
    const colEl = document.getElementById(colIds[status]);
    if (colEl) colEl.appendChild(card);
  }
  const toggleBtn = document.getElementById("jobsViewToggle");
  if (toggleBtn) {
    toggleBtn.textContent = jobsViewMode === "list" ? "Ver Kanban" : "Ver Lista";
  }
  if (list) list.style.display = jobsViewMode === "list" ? "" : "none";
  if (kanban) kanban.style.display = jobsViewMode === "kanban" ? "" : "none";
}

function toggleJobsView() {
  jobsViewMode = jobsViewMode === "list" ? "kanban" : "list";
  const list = document.getElementById("jobsList");
  const kanban = document.getElementById("jobsKanban");
  const toggleBtn = document.getElementById("jobsViewToggle");
  if (list) list.style.display = jobsViewMode === "list" ? "" : "none";
  if (kanban) kanban.style.display = jobsViewMode === "kanban" ? "" : "none";
  if (toggleBtn) toggleBtn.textContent = jobsViewMode === "list" ? "Ver Kanban" : "Ver Lista";
}

async function loadConfig() {
  const data = await getJSON("/v1/config");
  setLog(document.getElementById("configOutput"), data.config);
  if (data.config?.runMode) {
    const el = document.getElementById("runModeHint");
    if (el) el.textContent = `runMode: ${data.config.runMode}`;
    const ar = document.getElementById("autoRunHint");
    if (ar) ar.textContent = data.config.autoRun ? "autoRun: on" : "autoRun: off";
  }
}

function buildField(field, config) {
  const wrap = document.createElement("div");
  wrap.className = "field";

  const label = document.createElement("label");
  label.textContent = field.label;
  wrap.appendChild(label);

  let input;
  if (field.type === "select") {
    input = document.createElement("select");
    (field.options || []).forEach(opt => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      input.appendChild(o);
    });
  } else if (field.type === "checkbox") {
    input = document.createElement("input");
    input.type = "checkbox";
  } else {
    input = document.createElement("input");
    input.type = field.type || "text";
  }

  const currentVal = get(config, field.key, field.array ? [] : "");
  if (field.type === "checkbox") {
    input.checked = Boolean(currentVal);
  } else if (Array.isArray(currentVal)) {
    input.value = currentVal.join(", ");
  } else if (currentVal !== undefined && currentVal !== null) {
    input.value = currentVal;
  }

  input.onchange = () => {
    if (field.type === "checkbox") {
      set(currentConfig, field.key, input.checked);
    } else if (field.array) {
      const arr = (input.value || "")
        .split(",")
        .map(v => v.trim())
        .filter(Boolean);
      set(currentConfig, field.key, arr);
    } else {
      set(currentConfig, field.key, cast(input.value, field.type));
    }
  };

  wrap.appendChild(input);
  return wrap;
}

function renderTabs(config) {
  const nav = document.getElementById("configTabs");
  const pane = document.getElementById("configPane");
  nav.innerHTML = "";
  pane.innerHTML = "";

  const entries = Object.entries(sections);
  entries.forEach(([id, fields], idx) => {
    const btn = document.createElement("button");
    btn.className = "tab" + (idx === 0 ? " active" : "");
    btn.dataset.id = id;
    btn.textContent = id.toUpperCase();
    btn.onclick = () => {
      document.querySelectorAll(".tab").forEach(el => el.classList.toggle("active", el.dataset.id === id));
      document.querySelectorAll(".tab-panel").forEach(el => el.classList.toggle("active", el.dataset.id === id));
    };
    nav.appendChild(btn);

    const panel = document.createElement("div");
    panel.className = "tab-panel" + (idx === 0 ? " active" : "");
    panel.dataset.id = id;
    fields.forEach(f => panel.appendChild(buildField(f, config)));
    pane.appendChild(panel);
  });
}

async function loadConfigUi() {
  const [configRes, profiles, localRes] = await Promise.all([
    getJSON("/v1/config"),
    getJSON("/v1/config/profiles"),
    getJSON("/v1/config/local")
  ]);
  const base = configRes.config || {};
  const local = localRes.local || {};
  currentConfig = Object.keys(local).length ? { ...base, ...local } : base;
  if (currentConfig.llm && currentConfig.llm.apiKey === "******" && !(local.llm && local.llm.apiKey)) {
    delete currentConfig.llm.apiKey;
  }
  profileOptions = profiles.profiles || ["shorts"];
  if (sections.general[0]) sections.general[0].options = profileOptions;
  renderTabs(currentConfig);
  document.getElementById("configEditorMessage").textContent = "Config UI cargada.";
}

async function saveConfigUi() {
  const res = await postJSON("/v1/config/local", currentConfig);
  document.getElementById("configEditorMessage").textContent = res.ok ? "Guardado." : "Error guardando.";
  await Promise.all([loadConfig(), loadProfiles()]);
}

async function loadProfileConfig() {
  const name = currentConfig.profile || prompt("Perfil a cargar");
  if (!name) return;
  const res = await getJSON(`/v1/config/profile/${encodeURIComponent(name)}`);
  currentConfig = res.config || {};
  renderTabs(currentConfig);
  document.getElementById("configEditorMessage").textContent = `Perfil ${name} cargado.`;
}

async function saveProfileConfig() {
  const name = currentConfig.profile || prompt("Guardar perfil como");
  if (!name) return;
  const res = await fetch(`/v1/config/profiles/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currentConfig)
  });
  if (!res.ok) {
    document.getElementById("configEditorMessage").textContent = await res.text();
    return;
  }
  await loadProfiles();
  document.getElementById("configEditorMessage").textContent = `Perfil ${name} guardado.`;
}

async function newProfile() {
  const name = prompt("Nombre del nuevo perfil:");
  if (!name) return;
  await postJSON("/v1/config/profiles", { name });
  await loadProfiles();
  await loadConfigUi();
}

async function cloneProfile() {
  const source = currentConfig.profile || "shorts";
  const name = prompt(`Clonar perfil ${source} como:`);
  if (!name) return;
  await postJSON("/v1/config/profiles", { name, from: source });
  await loadProfiles();
  await loadConfigUi();
}

async function deleteProfile() {
  const name = currentConfig.profile || "shorts";
  if (!name || !confirm(`Eliminar perfil ${name}?`)) return;
  await fetch(`/v1/config/profiles/${encodeURIComponent(name)}`, { method: "DELETE" });
  await loadProfiles();
  await loadConfigUi();
}

async function loadLocalConfig() {
  try {
    const data = await getJSON("/v1/config/local");
    document.getElementById("configEditor").value = JSON.stringify(data.local || {}, null, 2);
    document.getElementById("configEditorMessage").textContent = "Listo para editar.";
  } catch (err) {
    document.getElementById("configEditorMessage").textContent = err.message;
  }
}

function wireActions() {
  document.getElementById("analyzeBtn").onclick = () => analyze().catch(err => setLog(document.getElementById("analyzeOutput"), err.message));
  document.getElementById("clearAnalyzeBtn").onclick = () => { document.getElementById("transcriptInput").value = ""; };
  document.getElementById("jobCreateBtn").onclick = () => createJob(true).catch(err => setLog(document.getElementById("jobOutput"), err.message));
  document.getElementById("jobCreateOnlyBtn").onclick = () => createJob(false).catch(err => setLog(document.getElementById("jobOutput"), err.message));
  document.getElementById("refreshJobsBtn").onclick = () => loadJobs().catch(err => setLog(document.getElementById("jobOutput"), err.message));
  const jobsSinceFilter = document.getElementById("jobsSinceFilter");
  if (jobsSinceFilter) jobsSinceFilter.onchange = () => loadJobs().catch(err => setLog(document.getElementById("jobOutput"), err.message));
  const jobsViewToggle = document.getElementById("jobsViewToggle");
  if (jobsViewToggle) jobsViewToggle.onclick = () => toggleJobsView();
  document.getElementById("loadConfigBtn").onclick = () => loadConfig().catch(err => setLog(document.getElementById("configOutput"), err.message));
  const studioClose = document.getElementById("jobStudioClose");
  if (studioClose) studioClose.onclick = () => { const w = document.getElementById("jobStudioWrap"); if (w) w.style.display = "none"; };
  const toggleMoreBtn = document.getElementById("toggleMoreBtn");
  const moreToolsWrap = document.getElementById("moreToolsWrap");
  if (toggleMoreBtn && moreToolsWrap) {
    toggleMoreBtn.onclick = () => {
      const visible = moreToolsWrap.style.display !== "none";
      moreToolsWrap.style.display = visible ? "none" : "";
    };
  }

  document.getElementById("qaBtn").onclick = () => {
    const mediaPath = document.getElementById("mediaToolsPath").value.trim();
    if (!mediaPath) return setLog(document.getElementById("mediaOutput"), "Set media path first.");
    postJSON("/v1/qa/analyze", { path: mediaPath })
      .then(data => setLog(document.getElementById("mediaOutput"), data))
      .catch(err => setLog(document.getElementById("mediaOutput"), err.message));
  };
  document.getElementById("normalizeBtn").onclick = () => {
    const mediaPath = document.getElementById("mediaToolsPath").value.trim();
    if (!mediaPath) return setLog(document.getElementById("mediaOutput"), "Set media path first.");
    postJSON("/v1/audio/normalize", { path: mediaPath })
      .then(data => setLog(document.getElementById("mediaOutput"), data))
      .catch(err => setLog(document.getElementById("mediaOutput"), err.message));
  };
  document.getElementById("sceneBtn").onclick = () => {
    const mediaPath = document.getElementById("mediaToolsPath").value.trim();
    if (!mediaPath) return setLog(document.getElementById("mediaOutput"), "Set media path first.");
    postJSON("/v1/scene/detect", { path: mediaPath })
      .then(data => setLog(document.getElementById("mediaOutput"), data))
      .catch(err => setLog(document.getElementById("mediaOutput"), err.message));
  };
  document.getElementById("reframeBtn").onclick = () => {
    const mediaPath = document.getElementById("mediaToolsPath").value.trim();
    if (!mediaPath) return setLog(document.getElementById("mediaOutput"), "Set media path first.");
    postJSON("/v1/reframe", { path: mediaPath, target: "9:16" })
      .then(data => setLog(document.getElementById("mediaOutput"), data))
      .catch(err => setLog(document.getElementById("mediaOutput"), err.message));
  };
  document.getElementById("musicBtn").onclick = () => {
    const mediaPath = document.getElementById("mediaToolsPath").value.trim();
    if (!mediaPath) return setLog(document.getElementById("mediaOutput"), "Set media path first.");
    postJSON("/v1/music/analyze", { path: mediaPath })
      .then(data => setLog(document.getElementById("mediaOutput"), data))
      .catch(err => setLog(document.getElementById("mediaOutput"), err.message));
  };
  document.getElementById("probeBtn").onclick = () => {
    const mediaPath = document.getElementById("mediaToolsPath").value.trim();
    if (!mediaPath) return setLog(document.getElementById("mediaOutput"), "Set media path first.");
    postJSON("/v1/ingest/probe", { path: mediaPath })
      .then(data => setLog(document.getElementById("mediaOutput"), data))
      .catch(err => setLog(document.getElementById("mediaOutput"), err.message));
  };
  document.getElementById("brollBtn").onclick = () => {
    const text = document.getElementById("brollText").value.trim();
    if (!text) return setLog(document.getElementById("mediaOutput"), "Set b-roll text first.");
    postJSON("/v1/broll/suggest", { text })
      .then(data => setLog(document.getElementById("mediaOutput"), data))
      .catch(err => setLog(document.getElementById("mediaOutput"), err.message));
  };

  let lastQaPanelResult = { jobId: "qa-panel", qa: {} };
  const qaPanelRun = document.getElementById("qaPanelRun");
  if (qaPanelRun) {
    qaPanelRun.onclick = async () => {
      const input = document.getElementById("qaPanelInput")?.value?.trim() || "";
      const summaryEl = document.getElementById("qaPanelSummary");
      const rawEl = document.getElementById("qaPanelRaw");
      if (!input) return setLog(summaryEl, "Enter media path or Job ID.");
      try {
        let data;
        if (input.includes("/") || input.includes("\\") || /\.(mp4|mov|wav|mp3|mxf|aiff)$/i.test(input)) {
          data = await postJSON("/v1/qa/analyze", { path: input });
          lastQaPanelResult = { jobId: "media-qa", qa: data.qa || data };
        } else {
          data = await getJSON("/v1/jobs/" + encodeURIComponent(input) + "/qa");
          lastQaPanelResult = { jobId: input, qa: data.qa || {} };
        }
        const qa = lastQaPanelResult.qa;
        const lines = [];
        if (qa.silence?.length) lines.push("Silence: " + qa.silence.length + " events");
        if (qa.black?.length) lines.push("Black: " + qa.black.length + " events");
        if (qa.loudness) lines.push("Loudness I: " + (qa.loudness.integrated ?? "—") + " LRA: " + (qa.loudness.lra ?? "—") + " Max: " + (qa.loudness.maxVolume ?? "—"));
        if (qa.warnings?.length) lines.push("Warnings: " + qa.warnings.join(", "));
        setLog(summaryEl, lines.length ? lines.join("\n") : "No summary.");
        setLog(rawEl, data);
      } catch (err) {
        setLog(summaryEl, err.message);
        setLog(rawEl, err.message);
      }
    };
  }
  const qaPanelDownloadCsv = document.getElementById("qaPanelDownloadCsv");
  if (qaPanelDownloadCsv) {
    qaPanelDownloadCsv.onclick = () => {
      const csv = qaToCsv(lastQaPanelResult.jobId, lastQaPanelResult.qa);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "qa-" + lastQaPanelResult.jobId + ".csv";
      a.click();
      URL.revokeObjectURL(a.href);
    };
  }

  const musicPanelAnalyze = document.getElementById("musicPanelAnalyze");
  if (musicPanelAnalyze) {
    musicPanelAnalyze.onclick = async () => {
      const path = document.getElementById("musicPanelPath")?.value?.trim() || "";
      const profile = document.getElementById("musicPanelProfile")?.value || "shorts";
      const tableEl = document.getElementById("musicPanelTable");
      const assetsEl = document.getElementById("musicPanelAssets");
      const rawEl = document.getElementById("musicPanelRaw");
      if (!path) return setLog(tableEl, "Set media path.");
      try {
        const data = await postJSON("/v1/music/analyze", { path, profile });
        const m = data.music || data;
        let tableHtml = "";
        if (m.beats?.length) tableHtml += "<p>Beats: " + m.beats.length + "</p>";
        if (m.sections?.length) tableHtml += "<p>Sections: " + m.sections.length + "</p>";
        if (m.drops?.length) tableHtml += "<p>Drops: " + m.drops.length + "</p>";
        tableEl.innerHTML = tableHtml || "<p class='muted'>—</p>";
        const assetParts = [];
        if (m.warnings?.length) assetParts.push("Warnings: " + m.warnings.join(", "));
        if (m.waveformPath) assetParts.push("Waveform: " + m.waveformPath);
        if (m.spectrogramPath) assetParts.push("Spectrogram: " + m.spectrogramPath);
        assetsEl.textContent = assetParts.length ? assetParts.join(" · ") : "—";
        setLog(rawEl, data);
      } catch (err) {
        tableEl.textContent = err.message;
        assetsEl.textContent = "";
        setLog(rawEl, err.message);
      }
    };
  }

  document.getElementById("loadLocalConfig").onclick = loadLocalConfig;
  document.getElementById("saveLocalConfig").onclick = async () => {
    try {
      const payload = JSON.parse(document.getElementById("configEditor").value || "{}");
      const data = await postJSON("/v1/config/local", payload);
      document.getElementById("configEditorMessage").textContent = "Guardado.";
      loadConfig();
      loadProfiles();
    } catch (err) {
      document.getElementById("configEditorMessage").textContent = err.message;
    }
  };
  document.getElementById("loadConfigUiBtn").onclick = () => loadConfigUi().catch(err => document.getElementById("configEditorMessage").textContent = err.message);
  document.getElementById("saveConfigUiBtn").onclick = () => saveConfigUi().catch(err => document.getElementById("configEditorMessage").textContent = err.message);
  document.getElementById("loadProfileBtn").onclick = () => loadProfileConfig().catch(err => document.getElementById("configEditorMessage").textContent = err.message);
  document.getElementById("saveProfileBtn").onclick = () => saveProfileConfig().catch(err => document.getElementById("configEditorMessage").textContent = err.message);
  document.getElementById("newProfileBtn").onclick = () => newProfile().catch(err => document.getElementById("configEditorMessage").textContent = err.message);
  document.getElementById("cloneProfileBtn").onclick = () => cloneProfile().catch(err => document.getElementById("configEditorMessage").textContent = err.message);
  document.getElementById("deleteProfileBtn").onclick = () => deleteProfile().catch(err => document.getElementById("configEditorMessage").textContent = err.message);
}

async function refreshHealth() {
  const pill = document.getElementById("statusPill");
  try {
    const h = await getJSON("/health");
    if (pill) {
      const parts = [h.ok ? "ok" : "fail", h.profile || "", h.runMode || "", (h.deps && (h.deps.ffmpeg === false || h.deps.llm === false)) ? "deps:" + [h.deps.ffmpeg === false && "ffmpeg", h.deps.llm === false && "llm"].filter(Boolean).join(",") : ""].filter(Boolean);
      pill.textContent = parts.join(" · ");
    }
  } catch (e) {
    if (pill) pill.textContent = "status: error " + (e.message || "health failed");
  }
}

// --- Agent chat: backend LLM orquestador (POST /v1/agent/chat)
let agentMessages = [];

function renderAgentMessages() {
  const el = document.getElementById("agentMessages");
  if (!el) return;
  el.innerHTML = "";
  for (const m of agentMessages) {
    const div = document.createElement("div");
    div.className = "agent-msg " + m.role;
    if (m.role === "assistant" && m.error) div.innerHTML = "<span class='agent-error'>" + escapeHtml(m.content) + "</span>";
    else div.textContent = m.content;
    el.appendChild(div);
  }
  el.scrollTop = el.scrollHeight;
}

function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

async function sendAgentMessage() {
  const inputEl = document.getElementById("agentInput");
  const text = (inputEl?.value || "").trim();
  if (!text) return;
  if (inputEl) inputEl.value = "";
  agentMessages.push({ role: "user", content: text });
  renderAgentMessages();
  agentMessages.push({ role: "assistant", content: "…", loading: true });
  renderAgentMessages();

  const history = agentMessages.filter((m) => !m.loading).slice(-12).map((m) => ({ role: m.role, content: m.content }));

  try {
    const data = await postJSON("/v1/agent/chat", { message: text, history });
    agentMessages.pop();
    const reply = (data.reply || data.error || "Sin respuesta.").trim();
    agentMessages.push({ role: "assistant", content: reply, error: !!data.error });
    if (data.reply && data.reply.includes("job")) await loadJobs();
  } catch (e) {
    agentMessages.pop();
    agentMessages.push({ role: "assistant", content: (e.message || String(e)), error: true });
  }
  renderAgentMessages();
}

async function init() {
  wireActions();
  await loadProfiles();
  await loadJobs();
  await loadConfig();
  await refreshHealth();
  await loadConfigUi().catch(() => {});
  await loadLocalConfig();
  const refreshHealthBtn = document.getElementById("refreshHealthBtn");
  if (refreshHealthBtn) refreshHealthBtn.onclick = () => refreshHealth();
  const agentSendBtn = document.getElementById("agentSendBtn");
  const agentInput = document.getElementById("agentInput");
  if (agentSendBtn) agentSendBtn.onclick = () => sendAgentMessage();
  if (agentInput) agentInput.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAgentMessage(); } };
  agentMessages.push({ role: "assistant", content: "Hola. Soy el orquestador de AutoKit: entiendo lo que pides y ejecuto las acciones (estado del servidor, jobs, crear job, QA, retry, analizar transcript, etc.). Escribe en español o inglés con naturalidad." });
  renderAgentMessages();
}

init().catch(err => {
  const pill = document.getElementById("statusPill");
  if (pill) pill.textContent = `status: error ${err.message}`;
});

// ─── OSS Export panel ─────────────────────────────────────────────────────────

function getOssJobId() {
  return (document.getElementById("ossJobIdInput")?.value || "").trim();
}

async function ossExport(endpoint, body, successKey) {
  const out = document.getElementById("ossOutput");
  setLog(out, "...");
  try {
    const data = await postJSON(endpoint, body);
    setLog(out, data);
  } catch (e) {
    setLog(out, "Error: " + e.message);
  }
}

(function wireOssPanel() {
  const rppBtn = document.getElementById("ossRppBtn");
  if (rppBtn) rppBtn.onclick = async () => {
    const jobId = getOssJobId();
    if (!jobId) { setLog(document.getElementById("ossOutput"), "Introduce un Job ID"); return; }
    await ossExport("/v1/export/reaper", { jobId });
  };

  const kdenliveBtn = document.getElementById("ossKdenliveBtn");
  if (kdenliveBtn) kdenliveBtn.onclick = async () => {
    const jobId = getOssJobId();
    if (!jobId) { setLog(document.getElementById("ossOutput"), "Introduce un Job ID"); return; }
    await ossExport("/v1/export/kdenlive", { jobId });
  };

  const blenderBtn = document.getElementById("ossBlenderBtn");
  if (blenderBtn) blenderBtn.onclick = async () => {
    const jobId = getOssJobId();
    if (!jobId) { setLog(document.getElementById("ossOutput"), "Introduce un Job ID"); return; }
    await ossExport("/v1/export/blender", { jobId });
  };

  const natronBtn = document.getElementById("ossNatronBtn");
  if (natronBtn) natronBtn.onclick = async () => {
    const jobId = getOssJobId();
    if (!jobId) { setLog(document.getElementById("ossOutput"), "Introduce un Job ID"); return; }
    await ossExport("/v1/export/natron", { jobId, dryRun: true });
  };

  const thumbBtn = document.getElementById("ossThumbnailBtn");
  if (thumbBtn) thumbBtn.onclick = async () => {
    const jobId = getOssJobId();
    if (!jobId) { setLog(document.getElementById("ossOutput"), "Introduce un Job ID"); return; }
    await ossExport("/v1/export/thumbnail", { jobId });
  };

  const healthBtn = document.getElementById("ossHealthBtn");
  if (healthBtn) healthBtn.onclick = async () => {
    const out = document.getElementById("ossOutput");
    const statusEl = document.getElementById("ossToolStatus");
    setLog(out, "Checking OSS tools...");
    try {
      const data = await getJSON("/v1/oss/health");
      const tools = data.tools || {};
      const lines = Object.entries(tools).map(([k, v]) =>
        (v ? "✓ " : "✗ ") + k + (v ? " — disponible" : " — NO encontrado (instalar o configurar path)")
      );
      const summary = lines.join("\n");
      setLog(out, summary);
      if (statusEl) setLog(statusEl, summary);
    } catch (e) {
      setLog(out, "Error: " + e.message);
    }
  };

  const savePathsBtn = document.getElementById("ossPathsSaveBtn");
  if (savePathsBtn) savePathsBtn.onclick = async () => {
    const msg = document.getElementById("ossPathsMsg");
    const reaperPath = (document.getElementById("ossRppPathInput")?.value || "").trim();
    const blenderPath = (document.getElementById("ossBlenderPathInput")?.value || "").trim();
    const gimpPath = (document.getElementById("ossGimpPathInput")?.value || "").trim();
    const ffmpegPath = (document.getElementById("ossFfmpegPathInput")?.value || "").trim();
    setLog(msg, "Guardando...");
    try {
      // Read current local config, merge, save
      const current = await getJSON("/v1/config/local");
      const local = current.local || {};
      const oss = local.integrations?.oss || {};
      if (reaperPath) oss.reaperPath = reaperPath;
      if (blenderPath) oss.blenderPath = blenderPath;
      if (gimpPath) oss.gimpPath = gimpPath;
      if (ffmpegPath) oss.ffmpegPath = ffmpegPath;
      local.integrations = { ...(local.integrations || {}), oss };
      await postJSON("/v1/config/local", local);
      setLog(msg, "Rutas guardadas en config/local.json");
    } catch (e) {
      setLog(msg, "Error: " + e.message);
    }
  };
})();
