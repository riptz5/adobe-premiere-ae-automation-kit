/* global CSInterface */
const cs = window.CSInterface ? new CSInterface() : null;
const logEl = document.getElementById("log");
const profileEl = document.getElementById("profile");
let lastJobId = null;

function log(msg) {
  if (logEl) logEl.textContent = `[${new Date().toLocaleTimeString()}] ${msg}\n` + logEl.textContent;
}

function updateServerStatus(ok, health, config) {
  const el = document.getElementById("serverStatus");
  if (!el) return;
  if (!ok) {
    el.textContent = "Server: FAIL";
    el.classList.add("fail");
    return;
  }
  el.classList.remove("fail");
  const cfg = config?.config || {};
  el.textContent = [
    "Server: OK",
    "Profile: " + (cfg.profile || "—"),
    "runMode: " + (cfg.runMode || "—"),
    "autoRun: " + (cfg.autoRun ? "on" : "off")
  ].join(" | ");
}

async function refreshServerStatus() {
  try {
    const base = getServerUrl();
    const [healthRes, configRes] = await Promise.all([
      fetch(base + "/health"),
      fetch(base + "/v1/config")
    ]);
    const health = healthRes.ok ? await healthRes.json() : null;
    const config = configRes.ok ? await configRes.json() : null;
    updateServerStatus(true, health, config);
  } catch (e) {
    updateServerStatus(false);
    log("Status refresh: " + e.message);
  }
}

function evalES(script, cb) {
  if (!cs) return log("CSInterface no disponible.");
  cs.evalScript(script, (res) => cb?.(res || ""));
}

function ensureHostScriptLoaded() {
  if (!cs) return;
  try {
    const extPath = cs.getSystemPath(SystemPath.EXTENSION);
    const hostPath = extPath + "/jsx/host.jsx";
    const safe = hostPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    evalES(`$.evalFile("${safe}")`, () => {});
  } catch (e) {
    log("Host load error: " + e.message);
  }
}

function getServerUrl() {
  return document.getElementById("serverUrl").value.trim().replace(/\/$/, "");
}

async function postJSON(url, body) {
  if (window.fetch) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return await res.json();
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({}); }
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.responseText}`));
      }
    };
    xhr.send(JSON.stringify(body));
  });
}

async function loadProfiles() {
  try {
    const res = await fetch(getServerUrl() + "/v1/config/profiles");
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "No profiles");

    const profiles = json.profiles || [];
    profileEl.innerHTML = "";
    for (const profile of profiles) {
      const opt = document.createElement("option");
      opt.value = profile;
      opt.textContent = profile;
      profileEl.appendChild(opt);
    }
    if (!profiles.length) {
      const opt = document.createElement("option");
      opt.value = "shorts";
      opt.textContent = "shorts";
      profileEl.appendChild(opt);
    }
  } catch (e) {
    log("Profiles error: " + e.message);
  }
}

document.getElementById("btnProjectInfo").onclick = () => {
  evalES("AutoKit.getProjectInfo()", (res) => log(res));
};

window.onerror = function (message, source, lineno, colno) {
  log(`UI error: ${message} @ ${lineno}:${colno}`);
};

document.getElementById("btnPingServer").onclick = async () => {
  try {
    await refreshServerStatus();
    await loadProfiles();
    log("Server OK, profiles loaded.");
  } catch (e) {
    log("Server error: " + e.message);
  }
};

document.getElementById("btnImportAndOrganize").onclick = () => {
  evalES("AutoKit.importAndOrganize()", (res) => log(res));
};

document.getElementById("btnApplyMarkersFromJSON").onclick = () => {
  const json = document.getElementById("markersJson").value.trim();
  if (!json) return log("Pega JSON primero.");
  const safe = json.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
  evalES(`AutoKit.applyMarkersFromJSONString("${safe}")`, (res) => log(res));
};

document.getElementById("btnAnalyzeTranscript").onclick = async () => {
  const transcript = document.getElementById("transcript").value.trim();
  if (!transcript) return log("Pega transcript primero.");
  try {
    const out = await postJSON(getServerUrl() + "/v1/analyze/transcript", {
      transcript,
      profile: profileEl.value
    });
    document.getElementById("markersJson").value = JSON.stringify({ markers: out.markers }, null, 2);
    log(`OK: generé ${out.markers.length} markers.`);
    if (out.summary) log(`Summary: ${out.summary}`);
  } catch (e) {
    log("Analyze error: " + e.message);
  }
};

document.getElementById("btnAnalyzeMediaApply").onclick = async () => {
  evalES("AutoKit.pickMediaFile()", async (mediaPath) => {
    if (!mediaPath || mediaPath === "CANCEL") return log("Cancelado.");
    try {
      log("Analizando media con STT + LLM...");
      const out = await postJSON(getServerUrl() + "/v1/jobs", {
        mediaPath: mediaPath,
        profile: profileEl.value,
        autoRun: true
      });
      if (out.job?.id) {
        lastJobId = out.job.id;
        const bar = document.getElementById("lastJobBar");
        const idSpan = document.getElementById("lastJobId");
        if (bar) bar.style.display = "block";
        if (idSpan) idSpan.textContent = lastJobId;
        document.getElementById("jobIdInput").value = lastJobId;
      }
      const markers = out.job?.result?.markers || [];
      const segments = out.job?.result?.segments || [];
      if (!markers.length && !segments.length) return log("Sin markers ni segments.");
      if (markers.length) {
        document.getElementById("markersJson").value = JSON.stringify({ markers: markers }, null, 2);
        const safeMarkers = JSON.stringify({ markers: markers }).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        evalES(`AutoKit.applyMarkersFromJSONString("${safeMarkers}")`, (res) => log(res));
      }
      if (segments.length) {
        const safeSegments = JSON.stringify({ segments: segments }).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
        evalES(`AutoKit.applySegmentsFromJSONString("${safeSegments}")`, (res) => log(res));
      }
} catch (e) {
    log("Media analyze error: " + (e.message || JSON.stringify(e)));
  }
});
};

document.getElementById("btnAnalyzeMusicApply").onclick = async () => {
  evalES("AutoKit.pickMediaFile()", async (mediaPath) => {
    if (!mediaPath || mediaPath === "CANCEL") return log("Cancelado.");
    try {
      log("Analizando música (FFmpeg QA + beats/sections)...");
      const out = await postJSON(getServerUrl() + "/v1/music/analyze", {
        path: mediaPath,
        profile: profileEl.value
      });
      const markers = out.music?.markers || out.markers || [];
      if (!markers.length) return log("Sin markers en la respuesta.");
      document.getElementById("markersJson").value = JSON.stringify({ markers }, null, 2);
      const safeMarkers = JSON.stringify({ markers }).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      evalES(`AutoKit.applyMarkersFromJSONString("${safeMarkers}")`, (res) => log(res));
      log(`OK: apliqué ${markers.length} markers.`);
    } catch (e) {
      log("Music analyze error: " + e.message);
    }
  });
};

document.getElementById("btnApplySegments").onclick = async () => {
  try {
    const serverUrl = getServerUrl();
    const transcript = document.getElementById("transcript").value.trim();
    if (!transcript) return log("Pega transcript primero para generar segments.");
    const out = await postJSON(serverUrl + "/v1/analyze/transcript", {
      transcript,
      profile: profileEl.value
    });
    const segments = out.segments || [];
    if (!segments.length) return log("No hay segments en la respuesta.");
    const payload = JSON.stringify({ segments: segments });
    const safe = payload.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    evalES(`AutoKit.applySegmentsFromJSONString("${safe}")`, (res) => log(res));
  } catch (e) {
    log("Apply segments error: " + e.message);
  }
};

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status + ": " + (await res.text()));
  return res.json();
}

document.getElementById("btnFetchQaMarkers").onclick = async () => {
  const jobId = document.getElementById("jobIdInput").value.trim();
  if (!jobId) return log("Escribe un Job ID (desde el dashboard).");
  try {
    const out = await getJSON(getServerUrl() + "/v1/jobs/" + encodeURIComponent(jobId) + "/qa-markers");
    const markers = out.markers || [];
    document.getElementById("markersJson").value = JSON.stringify({ markers }, null, 2);
    log("QA markers cargados: " + markers.length + ". Pulsa 'Aplicar markers' para aplicar.");
  } catch (e) {
    log("Fetch QA markers error: " + e.message);
  }
};

document.getElementById("btnFetchScenes").onclick = async () => {
  const jobId = document.getElementById("jobIdInput").value.trim();
  if (!jobId) return log("Escribe un Job ID (desde el dashboard).");
  try {
    const out = await getJSON(getServerUrl() + "/v1/jobs/" + encodeURIComponent(jobId) + "/scenes");
    const scenes = out.scenes || [];
    const segments = out.segments || [];
    log("Scenes: " + scenes.length + " cut points. Segments: " + segments.length);
    if (scenes.length) log("Tiempos: " + scenes.slice(0, 15).map(function (t) { return Math.floor(t / 60) + ":" + String(Math.floor(t % 60)).padStart(2, "0"); }).join(", ") + (scenes.length > 15 ? "..." : ""));
  } catch (e) {
    log("Fetch Scenes error: " + e.message);
  }
};

document.getElementById("btnExportAME").onclick = () => {
  evalES("AutoKit.exportViaAME()", (res) => log(res));
};

document.getElementById("btnUploadFrameio").onclick = () => {
  log("Subida a Frame.io: usa el script Node en /frameio (requiere token).");
};

document.getElementById("btnCopyJobId").onclick = () => {
  const id = document.getElementById("jobIdInput").value.trim();
  if (!id) return log("Escribe un Job ID primero.");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(id).then(() => log("Job ID copiado.")).catch(() => log("Copy failed."));
  } else {
    log("Job ID: " + id);
  }
};

document.getElementById("btnCopyLastJobId").onclick = () => {
  if (!lastJobId) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(lastJobId).then(() => log("Job ID copiado.")).catch(() => log("Copy failed."));
  } else {
    log("Job ID: " + lastJobId);
  }
};

document.getElementById("btnFetchJobSummary").onclick = async () => {
  const jobId = document.getElementById("jobIdInput").value.trim();
  if (!jobId) return log("Escribe un Job ID.");
  const box = document.getElementById("jobSummaryBox");
  try {
    const out = await getJSON(getServerUrl() + "/v1/jobs/" + encodeURIComponent(jobId));
    const job = out.job;
    if (!job) {
      box.style.display = "block";
      box.textContent = "Job no encontrado.";
      return;
    }
    const parts = [];
    if (job.result?.summary) parts.push("Summary: " + job.result.summary.slice(0, 200) + (job.result.summary.length > 200 ? "…" : ""));
    const counts = [];
    if (job.result?.chapters?.length) counts.push("Chapters: " + job.result.chapters.length);
    if (job.result?.segments?.length) counts.push("Segments: " + job.result.segments.length);
    if (job.result?.markers?.length) counts.push("Markers: " + job.result.markers.length);
    if (job.qa) counts.push("QA: yes");
    if (job.qaMarkers?.length) counts.push("QA markers: " + job.qaMarkers.length);
    if (job.scenes?.length) counts.push("Scenes: " + job.scenes.length);
    if (job.broll?.length) counts.push("B-roll: " + job.broll.length);
    if (job.reframed?.length) counts.push("Reframe: " + job.reframed.length);
    if (job.music) counts.push("Music: yes");
    parts.push("Counts: " + counts.join(" · "));
    box.style.display = "block";
    box.textContent = parts.join("\n");
  } catch (e) {
    box.style.display = "block";
    box.textContent = "Error: " + e.message;
    log("Fetch Job Summary error: " + e.message);
  }
};

loadProfiles();
ensureHostScriptLoaded();
refreshServerStatus();
