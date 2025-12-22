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
  const selects = [document.getElementById("profileSelect"), document.getElementById("jobProfileSelect")];
  for (const select of selects) {
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
  title.innerHTML = `<strong>${job.status}</strong> ${job.id}`;
  const meta = document.createElement("div");
  meta.className = "muted";
  meta.textContent = `${job.profile || "default"} | ${job.createdAt || ""}`;
  const actions = document.createElement("div");
  actions.className = "row";

  const runBtn = document.createElement("button");
  runBtn.className = "secondary";
  runBtn.textContent = "Run";
  runBtn.onclick = async () => {
    const data = await postJSON(`/v1/jobs/${job.id}/run`, {});
    setLog(document.getElementById("jobOutput"), data);
    await loadJobs();
  };

  const resultBtn = document.createElement("button");
  resultBtn.className = "secondary";
  resultBtn.textContent = "Result";
  resultBtn.onclick = async () => {
    const data = await getJSON(`/v1/jobs/${job.id}/result`);
    setLog(document.getElementById("jobOutput"), data);
  };

  const markersBtn = document.createElement("button");
  markersBtn.className = "secondary";
  markersBtn.textContent = "Markers";
  markersBtn.onclick = async () => {
    const data = await getJSON(`/v1/jobs/${job.id}/markers`);
    setLog(document.getElementById("jobOutput"), data);
  };

  const segmentsBtn = document.createElement("button");
  segmentsBtn.className = "secondary";
  segmentsBtn.textContent = "Segments";
  segmentsBtn.onclick = async () => {
    const data = await getJSON(`/v1/jobs/${job.id}/segments`);
    setLog(document.getElementById("jobOutput"), data);
  };

  const chaptersBtn = document.createElement("button");
  chaptersBtn.className = "secondary";
  chaptersBtn.textContent = "Chapters";
  chaptersBtn.onclick = async () => {
    const data = await getJSON(`/v1/jobs/${job.id}/chapters`);
    setLog(document.getElementById("jobOutput"), data);
  };

  const summaryBtn = document.createElement("button");
  summaryBtn.className = "secondary";
  summaryBtn.textContent = "Summary";
  summaryBtn.onclick = async () => {
    const data = await getJSON(`/v1/jobs/${job.id}/summary`);
    setLog(document.getElementById("jobOutput"), data);
  };

  const qaBtn = document.createElement("button");
  qaBtn.className = "secondary";
  qaBtn.textContent = "QA";
  qaBtn.onclick = async () => {
    const data = await getJSON(`/v1/jobs/${job.id}/qa`);
    setLog(document.getElementById("jobOutput"), data);
  };

  const qaCsvBtn = document.createElement("button");
  qaCsvBtn.className = "secondary";
  qaCsvBtn.textContent = "QA CSV";
  qaCsvBtn.onclick = async () => {
    const data = await getJSON(`/v1/jobs/${job.id}/qa`);
    const csv = qaToCsv(job.id, data.qa || {});
    setLog(document.getElementById("jobOutput"), csv);
  };

  const scenesBtn = document.createElement("button");
  scenesBtn.className = "secondary";
  scenesBtn.textContent = "Scenes";
  scenesBtn.onclick = async () => {
    const data = await getJSON(`/v1/jobs/${job.id}/scenes`);
    setLog(document.getElementById("jobOutput"), data);
  };

  const brollBtn = document.createElement("button");
  brollBtn.className = "secondary";
  brollBtn.textContent = "B-roll";
  brollBtn.onclick = async () => {
    const data = await getJSON(`/v1/jobs/${job.id}/broll`);
    setLog(document.getElementById("jobOutput"), data);
  };

  const reframeBtn = document.createElement("button");
  reframeBtn.className = "secondary";
  reframeBtn.textContent = "Reframe";
  reframeBtn.onclick = async () => {
    const data = await getJSON(`/v1/jobs/${job.id}/reframe`);
    setLog(document.getElementById("jobOutput"), data);
  };

  actions.appendChild(runBtn);
  actions.appendChild(resultBtn);
  actions.appendChild(markersBtn);
  actions.appendChild(segmentsBtn);
  actions.appendChild(chaptersBtn);
  actions.appendChild(summaryBtn);
  actions.appendChild(qaBtn);
  actions.appendChild(qaCsvBtn);
  actions.appendChild(scenesBtn);
  actions.appendChild(brollBtn);
  actions.appendChild(reframeBtn);

  div.appendChild(title);
  div.appendChild(meta);
  div.appendChild(actions);
  return div;
}

async function loadJobs() {
  const list = document.getElementById("jobsList");
  list.innerHTML = "";
  const data = await getJSON("/v1/jobs");
  const jobs = data.jobs || [];
  if (!jobs.length) {
    list.textContent = "No jobs yet.";
    return;
  }
  for (const job of jobs) {
    list.appendChild(renderJob(job));
  }
}

async function loadConfig() {
  const data = await getJSON("/v1/config");
  setLog(document.getElementById("configOutput"), data.config);
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

document.getElementById("analyzeBtn").onclick = () => analyze().catch(err => setLog(document.getElementById("analyzeOutput"), err.message));
document.getElementById("clearAnalyzeBtn").onclick = () => { document.getElementById("transcriptInput").value = ""; };
document.getElementById("jobCreateBtn").onclick = () => createJob(true).catch(err => setLog(document.getElementById("jobOutput"), err.message));
document.getElementById("jobCreateOnlyBtn").onclick = () => createJob(false).catch(err => setLog(document.getElementById("jobOutput"), err.message));
document.getElementById("refreshJobsBtn").onclick = () => loadJobs().catch(err => setLog(document.getElementById("jobOutput"), err.message));
document.getElementById("loadConfigBtn").onclick = () => loadConfig().catch(err => setLog(document.getElementById("configOutput"), err.message));
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
document.getElementById("brollBtn").onclick = () => {
  const text = document.getElementById("brollText").value.trim();
  if (!text) return setLog(document.getElementById("mediaOutput"), "Set b-roll text first.");
  postJSON("/v1/broll/suggest", { text })
    .then(data => setLog(document.getElementById("mediaOutput"), data))
    .catch(err => setLog(document.getElementById("mediaOutput"), err.message));
};

async function loadLocalConfig() {
  try {
    const data = await getJSON("/v1/config/local");
    document.getElementById("configEditor").value = JSON.stringify(data.local || {}, null, 2);
    document.getElementById("configEditorMessage").textContent = "Listo para editar.";
  } catch (err) {
    document.getElementById("configEditorMessage").textContent = err.message;
  }
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

loadProfiles()
  .then(loadJobs)
  .then(loadConfig)
  .catch(err => {
    setLog(document.getElementById("analyzeOutput"), err.message);
  });
loadLocalConfig();
loadConfigUi().catch(() => {});
