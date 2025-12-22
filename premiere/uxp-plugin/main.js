/* UXP main */
const logEl = document.getElementById("log");
function log(m){ logEl.textContent = m + "\n" + logEl.textContent; }

function serverUrl(){ return document.getElementById("serverUrl").value.trim().replace(/\/$/,""); }

async function analyzeTranscript(transcript){
  const res = await fetch(serverUrl()+"/v1/analyze/transcript", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ transcript })
  });
  if(!res.ok) throw new Error(await res.text());
  return await res.json();
}

async function applyMarkers(markers){
  // Premiere DOM via UXP
  const app = require("premierepro");
  const seq = await app.project.getActiveSequence?.(); // API names may differ across versions
  if(!seq) throw new Error("No active sequence (o API distinta).");
  // Try best-effort: create sequence markers if available
  if(!seq.markers || !seq.markers.create) throw new Error("Markers API no disponible en esta build; usa CEP/ExtendScript.");
  for(const m of markers){
    await seq.markers.create({ time: m.timeSec, name: m.name ?? "Marker", comment: m.comment ?? "" });
  }
}

document.getElementById("btnMarkers").onclick = async () => {
  const transcript = document.getElementById("transcript").value.trim();
  if(!transcript) return log("Pega transcript.");
  try{
    const out = await analyzeTranscript(transcript);
    document.getElementById("markersJson").value = JSON.stringify({ markers: out.markers }, null, 2);
    log("OK markers=" + out.markers.length);
  }catch(e){ log("ERR " + e.message); }
};

document.getElementById("btnApply").onclick = async () => {
  try{
    const payload = JSON.parse(document.getElementById("markersJson").value);
    await applyMarkers(payload.markers || []);
    log("Applied markers.");
  }catch(e){
    log("ERR " + e.message);
  }
};
