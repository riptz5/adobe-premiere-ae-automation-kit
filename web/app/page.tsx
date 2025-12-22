"use client";

import useSWR from "swr";
import { useEffect, useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const api = (path: string) => (process.env.NEXT_PUBLIC_API || "") + path;

type Job = {
  id: string;
  status: string;
  profile?: string;
  runMode?: string;
  createdAt?: string;
};

export default function Page() {
  const [transcript, setTranscript] = useState("");
  const [jobTranscript, setJobTranscript] = useState("");
  const [mediaPath, setMediaPath] = useState("");
  const [brollText, setBrollText] = useState("");
  const [mediaToolPath, setMediaToolPath] = useState("");
  const [output, setOutput] = useState("...");
  const { data: config } = useSWR(api("/v1/config"), fetcher);
  const { data: profiles } = useSWR(api("/v1/config/profiles"), fetcher);
  const { data: jobs, mutate } = useSWR(api("/v1/jobs"), fetcher, { refreshInterval: 5000 });
  const [profile, setProfile] = useState("shorts");

  useEffect(() => {
    if (profiles?.profiles?.length) setProfile(profiles.profiles[0]);
  }, [profiles]);

  async function analyzeTranscript() {
    if (!transcript.trim()) return setOutput("Paste transcript first.");
    const res = await fetch(api("/v1/analyze/transcript"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, profile })
    });
    const json = await res.json();
    setOutput(JSON.stringify(json, null, 2));
  }

  async function createJob(autoRun: boolean) {
    const body: Record<string, unknown> = { profile, autoRun };
    if (mediaPath.trim()) body.mediaPath = mediaPath.trim();
    if (jobTranscript.trim()) body.transcript = jobTranscript.trim();
    const res = await fetch(api("/v1/jobs"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    setOutput(JSON.stringify(json, null, 2));
    mutate();
  }

  async function call(path: string, payload: Record<string, unknown>) {
    const res = await fetch(api(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    setOutput(JSON.stringify(json, null, 2));
  }

  async function jobAction(id: string, path: string) {
    const res = await fetch(api(`/v1/jobs/${id}/${path}`));
    const json = await res.json();
    setOutput(JSON.stringify(json, null, 2));
  }

  return (
    <div className="p-6 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AutoKit · Dashboard</h1>
          <p className="text-sm text-muted">Frontend Next.js + TS. API: {process.env.NEXT_PUBLIC_API || "same origin"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full border border-border text-sm text-muted">
            runMode: {config?.config?.runMode || "?"}
          </span>
          <span className="px-3 py-1 rounded-full border border-border text-sm text-muted">
            autoRun: {config?.config?.autoRun ? "on" : "off"}
          </span>
        </div>
      </header>

      <section className="grid md:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl border border-border bg-panel space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">1 · Analizar transcript</h2>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="bg-[#0b1422] border border-border rounded px-2 py-1 text-sm"
            >
              {(profiles?.profiles || ["shorts"]).map((p: string) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full h-32 rounded border border-border bg-[#0a111c] p-2 text-sm"
            placeholder="Pega transcript..."
          />
          <div className="flex gap-2">
            <button onClick={analyzeTranscript} className="flex-1">Analyze</button>
            <button onClick={() => { setTranscript(""); }} className="flex-1 secondary">Clear</button>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-panel space-y-2">
          <h2 className="text-lg font-semibold">2 · Crear job (media o transcript)</h2>
          <input
            value={mediaPath}
            onChange={(e) => setMediaPath(e.target.value)}
            className="w-full rounded border border-border bg-[#0a111c] p-2 text-sm"
            placeholder="/path/media.mp4"
          />
          <textarea
            value={jobTranscript}
            onChange={(e) => setJobTranscript(e.target.value)}
            className="w-full h-24 rounded border border-border bg-[#0a111c] p-2 text-sm"
            placeholder="Pega transcript o deja vacío si hay mediaPath"
          />
          <div className="flex gap-2">
            <button onClick={() => createJob(true)} className="flex-1">Create + Run</button>
            <button onClick={() => createJob(false)} className="flex-1 secondary">Create Only</button>
          </div>
        </div>
      </section>

      <section className="p-4 rounded-xl border border-border bg-panel space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">3 · Jobs</h2>
          <button onClick={() => mutate()} className="secondary px-3 py-2">Refresh</button>
        </div>
        <div className="space-y-2">
          {(jobs?.jobs || []).map((job: Job) => (
            <div key={job.id} className="border border-border rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm"><strong>{job.status}</strong> {job.id}</div>
                  <div className="text-xs text-muted">{job.profile} · {job.createdAt} · runMode={job.runMode}</div>
                </div>
                <button onClick={() => postJSON(api(`/v1/jobs/${job.id}/run`), {}).then(() => mutate())} className="secondary text-xs px-3 py-2">Run</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {["result","markers","segments","chapters","summary","qa","scenes","broll","reframe"].map((k) => (
                  <button key={k} className="secondary text-xs px-3 py-2" onClick={() => jobAction(job.id, k)}>
                    {k.toUpperCase()}
                  </button>
                ))}
                <button className="secondary text-xs px-3 py-2" onClick={async () => {
                  const data = await getJSON(api(`/v1/jobs/${job.id}/qa`));
                  setOutput(qaToCsv(job.id, data.qa || {}));
                }}>QA CSV</button>
              </div>
            </div>
          ))}
          {!(jobs?.jobs?.length) && <div className="text-sm text-muted">No jobs yet.</div>}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl border border-border bg-panel space-y-2">
          <h2 className="text-lg font-semibold">4 · Media tools</h2>
          <input
            value={mediaToolPath}
            onChange={(e) => setMediaToolPath(e.target.value)}
            className="w-full rounded border border-border bg-[#0a111c] p-2 text-sm"
            placeholder="/path/video-or-audio"
          />
          <div className="flex gap-2">
            <button onClick={() => call("/v1/qa/analyze", { path: mediaToolPath })} className="flex-1">Run QA</button>
            <button onClick={() => call("/v1/audio/normalize", { path: mediaToolPath })} className="flex-1 secondary">Normalize</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => call("/v1/scene/detect", { path: mediaToolPath })} className="flex-1 secondary">Scene Detect</button>
            <button onClick={() => call("/v1/reframe", { path: mediaToolPath, target: "9:16" })} className="flex-1 secondary">Reframe 9:16</button>
          </div>
          <input
            value={brollText}
            onChange={(e) => setBrollText(e.target.value)}
            className="w-full rounded border border-border bg-[#0a111c] p-2 text-sm"
            placeholder="keywords o summary..."
          />
          <button onClick={() => call("/v1/broll/suggest", { text: brollText })}>Suggest B-roll</button>
        </div>

        <div className="p-4 rounded-xl border border-border bg-panel space-y-2">
          <h2 className="text-lg font-semibold">5 · Config snapshot</h2>
          <pre className="log text-xs">{JSON.stringify(config?.config || {}, null, 2)}</pre>
        </div>
      </section>

      <section className="p-4 rounded-xl border border-border bg-panel space-y-2">
        <h2 className="text-lg font-semibold">Output / Logs</h2>
        <pre className="log text-xs">{output}</pre>
      </section>
    </div>
  );
}
