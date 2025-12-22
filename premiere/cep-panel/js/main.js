/* global CSInterface */
const cs = window.CSInterface ? new CSInterface() : null;
const logEl = document.getElementById("log");
const profileEl = document.getElementById("profile");

function log(msg) {
  logEl.textContent = `[${new Date().toLocaleTimeString()}] ${msg}\n` + logEl.textContent;
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
    const res = await fetch(getServerUrl() + "/health");
    const j = await res.json();
    log("Server OK: " + JSON.stringify(j));
    await loadProfiles();
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
      log("Media analyze error: " + e.message);
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

document.getElementById("btnExportAME").onclick = () => {
  evalES("AutoKit.exportViaAME()", (res) => log(res));
};

document.getElementById("btnUploadFrameio").onclick = () => {
  log("Subida a Frame.io: usa el script Node en /frameio (requiere token).");
};

loadProfiles();
ensureHostScriptLoaded();
