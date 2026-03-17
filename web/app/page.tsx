"use client";

import useSWR from "swr";
import { useCallback, useEffect, useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const api = (path: string) => (process.env.NEXT_PUBLIC_API || "") + path;

async function getJSON<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function postJSON<T = unknown>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

function qaToCsv(jobId: string, qa: { silence?: { duration?: number }[]; black?: { duration?: number }[]; loudness?: { integrated?: number; lra?: number; maxVolume?: number } }): string {
  const rows = [
    ["jobId", "metric", "value"],
    [jobId, "silence_events", String((qa?.silence ?? []).length)],
    [jobId, "silence_total_sec", String((qa?.silence ?? []).reduce((s, e) => s + (e.duration ?? 0), 0))],
    [jobId, "black_events", String((qa?.black ?? []).length)],
    [jobId, "black_total_sec", String((qa?.black ?? []).reduce((s, e) => s + (e.duration ?? 0), 0))],
    [jobId, "loudness_I", String(qa?.loudness?.integrated ?? "")],
    [jobId, "loudness_LRA", String(qa?.loudness?.lra ?? "")],
    [jobId, "max_volume", String(qa?.loudness?.maxVolume ?? "")],
  ];
  return rows.map((r) => r.join(",")).join("\n");
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// --- Types from data-contracts
type Job = {
  id: string;
  status: string;
  profile?: string;
  runMode?: string;
  createdAt?: string;
};

type JobDetail = Job & {
  result?: {
    chapters?: { start: number; end: number; title: string }[];
    segments?: { start: number; end: number; label: string; action?: string }[];
    highlights?: { start: number; end: number; label: string }[];
    markers?: { timeSec: number; name: string; comment?: string; type?: string }[];
    summary?: string;
    source?: string;
  };
  qa?: {
    silence?: { start: number; end?: number; duration?: number }[];
    black?: { start: number; end: number; duration: number }[];
    loudness?: { integrated?: number; lra?: number; maxVolume?: number };
  };
  qaMarkers?: { timeSec: number; name: string; comment?: string; type?: string }[];
  scenes?: number[];
  sceneSegments?: { start: number; end: number }[];
  broll?: { path: string; score: number }[];
  reframed?: { target: string; ok: boolean; outputPath?: string; error?: string }[];
  music?: {
    beats?: number[];
    sections?: { start: number; end: number }[];
    drops?: number[];
    warnings?: string[];
    waveformPath?: string;
    spectrogramPath?: string;
  };
  outputs?: {
    timelinePath?: string;
    otioPath?: string;
  };
};

type JobStudioTab = "overview" | "result" | "chapters" | "segments" | "markers" | "qa" | "scenes" | "broll" | "reframe" | "music" | "timeline";

export default function Page() {
  const [transcript, setTranscript] = useState("");
  const [jobTranscript, setJobTranscript] = useState("");
  const [mediaPath, setMediaPath] = useState("");
  const [brollText, setBrollText] = useState("");
  const [mediaToolPath, setMediaToolPath] = useState("");
  const [output, setOutput] = useState("...");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobStudioTab, setJobStudioTab] = useState<JobStudioTab>("overview");
  const [jobsViewMode, setJobsViewMode] = useState<"list" | "kanban">("list");
  const [jobsSinceDays, setJobsSinceDays] = useState<number | "">(7);
  const [qaPanelInput, setQaPanelInput] = useState("");
  const [lastQaPanel, setLastQaPanel] = useState<{ jobId: string; qa: Parameters<typeof qaToCsv>[1] }>({ jobId: "qa-panel", qa: {} });
  const [qaPanelSummary, setQaPanelSummary] = useState("");
  const [musicPanelPath, setMusicPanelPath] = useState("");
  const [musicPanelResult, setMusicPanelResult] = useState<Record<string, unknown> | null>(null);

  const jobsUrl = jobsSinceDays ? `/v1/jobs?limit=100&sinceDays=${jobsSinceDays}` : "/v1/jobs?limit=100";
  const { data: config } = useSWR(api("/v1/config"), fetcher);
  const { data: profiles } = useSWR(api("/v1/config/profiles"), fetcher);
  const { data: jobs, mutate } = useSWR(api(jobsUrl), fetcher, { refreshInterval: 5000 });
  const { data: health } = useSWR<{ ok?: boolean; profile?: string; runMode?: string; deps?: { ffmpeg?: boolean; llm?: boolean } }>(api("/health"), fetcher, { refreshInterval: 10000 });
  const [profile, setProfile] = useState("shorts");
  type AgentMsg = { role: "user" | "assistant"; content: string; error?: boolean };
  const [agentMessages, setAgentMessages] = useState<AgentMsg[]>([
    { role: "assistant", content: "Hola. Soy el orquestador de AutoKit: entiendo lo que pides y ejecuto las acciones (estado, jobs, crear job, QA, retry, analizar transcript, etc.). Escribe en español o inglés con naturalidad." },
  ]);
  const [agentInput, setAgentInput] = useState("");

  const { data: jobDetailData, mutate: mutateJobDetail } = useSWR<{ ok: boolean; job: JobDetail }>(
    selectedJobId ? api(`/v1/jobs/${selectedJobId}`) : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  const jobDetail = jobDetailData?.ok ? jobDetailData.job : null;

  useEffect(() => {
    if (profiles?.profiles?.length) setProfile(profiles.profiles[0]);
  }, [profiles]);

  const analyzeTranscript = useCallback(async () => {
    if (!transcript.trim()) return setOutput("Paste transcript first.");
    try {
      const json = await postJSON<{ ok?: boolean }>(api("/v1/analyze/transcript"), { transcript, profile });
      setOutput(JSON.stringify(json, null, 2));
    } catch (e) {
      setOutput(String(e));
    }
  }, [transcript, profile]);

  const createJob = useCallback(async (autoRun: boolean) => {
    const body: Record<string, unknown> = { profile, autoRun };
    if (mediaPath.trim()) body.mediaPath = mediaPath.trim();
    if (jobTranscript.trim()) body.transcript = jobTranscript.trim();
    try {
      const json = await postJSON<{ ok?: boolean }>(api("/v1/jobs"), body);
      setOutput(JSON.stringify(json, null, 2));
      mutate();
    } catch (e) {
      setOutput(String(e));
    }
  }, [profile, mediaPath, jobTranscript, mutate]);

  const call = useCallback(async (path: string, payload: Record<string, unknown>) => {
    try {
      const json = await postJSON(api(path), payload);
      setOutput(JSON.stringify(json, null, 2));
    } catch (e) {
      setOutput(String(e));
    }
  }, []);

  const jobAction = useCallback(async (id: string, path: string) => {
    try {
      const json = await getJSON(api(`/v1/jobs/${id}/${path}`));
      setOutput(JSON.stringify(json, null, 2));
    } catch (e) {
      setOutput(String(e));
    }
  }, []);

  const runJob = useCallback(async (id: string) => {
    try {
      await postJSON(api(`/v1/jobs/${id}/run`), {});
      mutate();
      if (selectedJobId === id) mutateJobDetail();
    } catch (e) {
      setOutput(String(e));
    }
  }, [selectedJobId, mutate, mutateJobDetail]);

  const retryJob = useCallback(async (id: string) => {
    try {
      await postJSON(api(`/v1/jobs/${id}/retry`), {});
      mutate();
      if (selectedJobId === id) mutateJobDetail();
    } catch (e) {
      setOutput(String(e));
    }
  }, [selectedJobId, mutate, mutateJobDetail]);

  const runQaPanel = useCallback(async () => {
    const input = qaPanelInput.trim();
    if (!input) return setQaPanelSummary("Enter media path or Job ID.");
    try {
      let data: { qa?: Parameters<typeof qaToCsv>[1] };
      if (input.includes("/") || input.includes("\\") || /\.(mp4|mov|wav|mp3|mxf|aiff)$/i.test(input)) {
        data = await postJSON<{ qa?: Parameters<typeof qaToCsv>[1] }>(api("/v1/qa/analyze"), { path: input });
        setLastQaPanel({ jobId: "media-qa", qa: data.qa ?? data as unknown as Parameters<typeof qaToCsv>[1] });
      } else {
        data = await getJSON<{ qa?: Parameters<typeof qaToCsv>[1] }>(api(`/v1/jobs/${encodeURIComponent(input)}/qa`));
        setLastQaPanel({ jobId: input, qa: data.qa ?? {} });
      }
      const qa = data.qa ?? {};
      const lines: string[] = [];
      if (qa.silence?.length) lines.push(`Silence: ${qa.silence.length} events`);
      if (qa.black?.length) lines.push(`Black: ${qa.black.length} events`);
      if (qa.loudness) lines.push(`Loudness I: ${qa.loudness.integrated ?? "—"} LRA: ${qa.loudness.lra ?? "—"} Max: ${qa.loudness.maxVolume ?? "—"}`);
      if ((qa as { warnings?: string[] }).warnings?.length) lines.push("Warnings: " + (qa as { warnings: string[] }).warnings.join(", "));
      setQaPanelSummary(lines.length ? lines.join("\n") : "No summary.");
      setOutput(JSON.stringify(data, null, 2));
    } catch (e) {
      setQaPanelSummary(String(e));
    }
  }, [qaPanelInput]);

  const sendAgentMessage = useCallback(async () => {
    const text = agentInput.trim();
    if (!text) return;
    setAgentInput("");
    const newUserMsg = { role: "user" as const, content: text };
    setAgentMessages((prev) => [...prev, newUserMsg, { role: "assistant", content: "…" }]);
    const historyForRequest = agentMessages.slice(-12).map((m) => ({ role: m.role, content: m.content }));
    try {
      const data = await postJSON<{ ok?: boolean; reply?: string; error?: string }>(api("/v1/agent/chat"), { message: text, history: historyForRequest });
      setAgentMessages((prev) => prev.slice(0, -1));
      const reply = (data.reply ?? data.error ?? "Sin respuesta.").trim();
      setAgentMessages((prev) => [...prev, { role: "assistant", content: reply, error: !!data.error }]);
      if (data.reply?.includes("job")) mutate();
    } catch (e) {
      setAgentMessages((prev) => prev.slice(0, -1));
      setAgentMessages((prev) => [...prev, { role: "assistant", content: String(e), error: true }]);
    }
  }, [agentInput, agentMessages, mutate]);

  const downloadQaCsv = useCallback(() => {
    const csv = qaToCsv(lastQaPanel.jobId, lastQaPanel.qa);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `qa-${lastQaPanel.jobId}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [lastQaPanel]);

  const runMusicPanel = useCallback(async () => {
    const path = musicPanelPath.trim();
    if (!path) return setOutput("Set media path.");
    try {
      const data = await postJSON<{ music?: Record<string, unknown> }>(api("/v1/music/analyze"), { path, profile });
      setMusicPanelResult(data.music ?? (data as Record<string, unknown>));
      setOutput(JSON.stringify(data, null, 2));
    } catch (e) {
      setOutput(String(e));
      setMusicPanelResult(null);
    }
  }, [musicPanelPath, profile]);

  const openJobStudio = useCallback((id: string) => {
    setSelectedJobId(id);
    setJobStudioTab("overview");
  }, []);

  const jobList = (jobs?.jobs ?? []) as Job[];
  const tabs: { id: JobStudioTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "result", label: "Result" },
    { id: "chapters", label: "Chapters" },
    { id: "segments", label: "Segments" },
    { id: "markers", label: "Markers" },
    { id: "qa", label: "QA" },
    { id: "scenes", label: "Scenes" },
    { id: "broll", label: "B-roll" },
    { id: "reframe", label: "Reframe" },
    { id: "music", label: "Music" },
    { id: "timeline", label: "Timeline" },
  ];
  const kanbanColumns: { status: string; label: string }[] = [
    { status: "queued", label: "Queued" },
    { status: "running", label: "Running" },
    { status: "ready", label: "Ready" },
    { status: "error", label: "Error" },
  ];
  const jobByStatus = (status: string) =>
    jobList.filter((j) => ((j.status === "done" ? "ready" : j.status) || "queued") === status);

  return (
    <div className="min-h-screen bg-[#050910] text-[#e9f1ff] p-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-4 border-b border-[#1c2740] pb-4">
        <div>
          <h1 className="text-2xl font-bold">AutoKit · Dashboard</h1>
          <p className="text-sm text-[#8da0be]">
            Frontend Next.js. API: {process.env.NEXT_PUBLIC_API || "same origin"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 rounded-full border border-[#1c2740] text-sm text-[#8da0be]">
            {health?.ok ? "health: ok" : "health: …"}
          </span>
          <span className="px-3 py-1 rounded-full border border-[#1c2740] text-sm text-[#8da0be]">
            runMode: {config?.config?.runMode ?? health?.runMode ?? "?"}
          </span>
          <span className="px-3 py-1 rounded-full border border-[#1c2740] text-sm text-[#8da0be]">
            autoRun: {config?.config?.autoRun ? "on" : "off"}
          </span>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-xl border border-[#1c2740] bg-[#0b1220] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">1 · Analizar transcript</h2>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className="bg-[#0a111c] border border-[#1c2740] rounded-lg px-2 py-1.5 text-sm"
            >
              {(profiles?.profiles ?? ["shorts"]).map((p: string) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full h-32 rounded-lg border border-[#1c2740] bg-[#0a111c] p-2 text-sm"
            placeholder="Pega transcript..."
          />
          <div className="flex gap-2">
            <button onClick={analyzeTranscript} className="flex-1 px-4 py-2 rounded-lg bg-[#22d3ee] text-[#03101a] font-semibold hover:opacity-90">
              Analyze
            </button>
            <button onClick={() => setTranscript("")} className="flex-1 px-4 py-2 rounded-lg border border-[#1c2740]">
              Clear
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-[#1c2740] bg-[#0b1220] p-4 space-y-3">
          <h2 className="text-lg font-semibold">2 · Crear job (media o transcript)</h2>
          <input
            value={mediaPath}
            onChange={(e) => setMediaPath(e.target.value)}
            className="w-full rounded-lg border border-[#1c2740] bg-[#0a111c] p-2 text-sm"
            placeholder="/path/media.mp4"
          />
          <textarea
            value={jobTranscript}
            onChange={(e) => setJobTranscript(e.target.value)}
            className="w-full h-24 rounded-lg border border-[#1c2740] bg-[#0a111c] p-2 text-sm"
            placeholder="Pega transcript o deja vacío si hay mediaPath"
          />
          <div className="flex gap-2">
            <button onClick={() => createJob(true)} className="flex-1 px-4 py-2 rounded-lg bg-[#22d3ee] text-[#03101a] font-semibold hover:opacity-90">
              Create + Run
            </button>
            <button onClick={() => createJob(false)} className="flex-1 px-4 py-2 rounded-lg border border-[#1c2740]">
              Create Only
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-[#1c2740] bg-[#0b1220] p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold">3 · Jobs y Job Studio</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-[#8da0be]">Ver:</span>
            <select
              value={jobsSinceDays}
              onChange={(e) => setJobsSinceDays(e.target.value === "" ? "" : Number(e.target.value))}
              className="rounded-lg border border-[#1c2740] bg-[#0a111c] px-2 py-1.5 text-sm min-w-[140px]"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value="">Todos</option>
            </select>
            <button
              onClick={() => setJobsViewMode((m) => (m === "list" ? "kanban" : "list"))}
              className="px-3 py-2 rounded-lg border border-[#1c2740] text-sm"
            >
              {jobsViewMode === "list" ? "Ver Kanban" : "Ver Lista"}
            </button>
            <button onClick={() => mutate()} className="px-3 py-2 rounded-lg border border-[#1c2740] text-sm">
              Refresh
            </button>
          </div>
        </div>
        {jobsViewMode === "list" && (
          <div className="space-y-2">
            {jobList.length === 0 && <div className="text-sm text-[#8da0be]">No jobs yet.</div>}
            {jobList.map((job) => (
              <div key={job.id} className="border border-[#1c2740] rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    <span className="text-[#22d3ee]">{job.status}</span> {job.id}
                  </div>
                  <div className="text-xs text-[#8da0be]">
                    {job.profile} · {job.createdAt} · runMode={job.runMode}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openJobStudio(job.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#22d3ee] text-[#03101a] text-xs font-semibold"
                  >
                    Open Studio
                  </button>
                  <button onClick={() => runJob(job.id)} className="px-3 py-1.5 rounded-lg border border-[#1c2740] text-xs">
                    Run
                  </button>
                  <button onClick={() => retryJob(job.id)} className="px-3 py-1.5 rounded-lg border border-[#1c2740] text-xs">
                    Retry
                  </button>
                  {["result", "markers", "segments", "chapters", "summary", "qa", "qa-markers", "scenes", "broll", "reframe"].map((k) => (
                    <button
                      key={k}
                      onClick={() => jobAction(job.id, k)}
                      className="px-2 py-1 rounded border border-[#1c2740] text-xs"
                    >
                      {k.replace("-", " ")}
                    </button>
                  ))}
                  <button
                    className="px-2 py-1 rounded border border-[#1c2740] text-xs"
                    onClick={async () => {
                      try {
                        const data = await getJSON<{ qa?: unknown }>(api(`/v1/jobs/${job.id}/qa`));
                        setOutput(qaToCsv(job.id, (data.qa ?? {}) as Parameters<typeof qaToCsv>[1]));
                      } catch (e) {
                        setOutput(String(e));
                      }
                    }}
                  >
                    QA CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {jobsViewMode === "kanban" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
            {kanbanColumns.map((col) => (
              <div key={col.status} className="rounded-lg border border-[#1c2740] bg-[#0a111c] p-3 min-h-[120px]">
                <div className="text-xs font-medium text-[#8da0be] uppercase tracking-wide mb-2">{col.label}</div>
                <div className="space-y-2">
                  {jobByStatus(col.status).map((job) => (
                    <div key={job.id} className="rounded border border-[#1c2740] p-2 bg-[#0d1625] text-xs">
                      <div className="font-medium truncate"><span className="text-[#22d3ee]">{job.id.slice(0, 8)}</span> · {job.profile}</div>
                      <div className="text-[#8da0be] truncate">{job.createdAt}</div>
                      <div className="flex gap-1 mt-2">
                        <button onClick={() => openJobStudio(job.id)} className="px-2 py-1 rounded bg-[#22d3ee] text-[#03101a] font-medium">Studio</button>
                        <button onClick={() => runJob(job.id)} className="px-2 py-1 rounded border border-[#1c2740]">Run</button>
                        <button onClick={() => retryJob(job.id)} className="px-2 py-1 rounded border border-[#1c2740]">Retry</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedJobId && (
          <div className="mt-6 rounded-xl border-2 border-[#22d3ee]/40 bg-[#0d1625] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#1c2740] bg-[#0b1220]">
              <span className="font-semibold">Job Studio · {selectedJobId}</span>
              <button
                onClick={() => setSelectedJobId(null)}
                className="px-3 py-1 rounded border border-[#1c2740] text-sm"
              >
                Close
              </button>
            </div>
            <div className="flex border-b border-[#1c2740] overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setJobStudioTab(t.id)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    jobStudioTab === t.id ? "bg-[#22d3ee] text-[#03101a]" : "hover:bg-[#1c2740]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-4 min-h-[200px] max-h-[60vh] overflow-auto">
              {!jobDetail && <p className="text-[#8da0be]">Loading job...</p>}
              {jobDetail && jobStudioTab === "overview" && (
                <div className="space-y-3 text-sm">
                  <p><strong>Status:</strong> {jobDetail.status} · <strong>Profile:</strong> {jobDetail.profile}</p>
                  {jobDetail.result?.summary && (
                    <div>
                      <strong>Summary</strong>
                      <p className="text-[#8da0be] mt-1">{jobDetail.result.summary}</p>
                    </div>
                  )}
                  <ul className="list-disc list-inside text-[#8da0be]">
                    {jobDetail.result?.chapters?.length != null && <li>Chapters: {jobDetail.result.chapters.length}</li>}
                    {jobDetail.result?.segments?.length != null && <li>Segments: {jobDetail.result.segments.length}</li>}
                    {jobDetail.result?.markers?.length != null && <li>Markers: {jobDetail.result.markers.length}</li>}
                    {jobDetail.qa && <li>QA data present</li>}
                    {jobDetail.qaMarkers?.length != null && <li>QA markers: {jobDetail.qaMarkers.length}</li>}
                    {jobDetail.scenes?.length != null && <li>Scenes: {jobDetail.scenes.length} cut points</li>}
                    {jobDetail.broll?.length != null && <li>B-roll: {jobDetail.broll.length} items</li>}
                    {jobDetail.reframed?.length != null && <li>Reframe outputs: {jobDetail.reframed.length}</li>}
                  </ul>
                </div>
              )}
              {jobDetail && jobStudioTab === "result" && (
                <div className="space-y-2 text-sm">
                  {jobDetail.result?.summary && (
                    <div>
                      <strong>Summary</strong>
                      <p className="text-[#8da0be]">{jobDetail.result.summary}</p>
                    </div>
                  )}
                  <pre className="bg-[#0a111c] p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(jobDetail.result ?? {}, null, 2)}
                  </pre>
                </div>
              )}
              {jobDetail && jobStudioTab === "chapters" && (
                <div className="space-y-2">
                  {(jobDetail.result?.chapters ?? []).length === 0 && <p className="text-[#8da0be]">No chapters.</p>}
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[#1c2740]">
                        <th className="text-left py-2">Start</th>
                        <th className="text-left py-2">End</th>
                        <th className="text-left py-2">Title</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(jobDetail.result?.chapters ?? []).map((ch, i) => (
                        <tr key={i} className="border-b border-[#1c2740]/50">
                          <td className="py-1.5">{formatTime(ch.start)}</td>
                          <td>{formatTime(ch.end)}</td>
                          <td>{ch.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {jobDetail && jobStudioTab === "segments" && (
                <div className="space-y-2">
                  {(jobDetail.result?.segments ?? []).length === 0 && <p className="text-[#8da0be]">No segments.</p>}
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[#1c2740]">
                        <th className="text-left py-2">Start</th>
                        <th className="text-left py-2">End</th>
                        <th className="text-left py-2">Label</th>
                        <th className="text-left py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(jobDetail.result?.segments ?? []).map((sg, i) => (
                        <tr key={i} className="border-b border-[#1c2740]/50">
                          <td className="py-1.5">{formatTime(sg.start)}</td>
                          <td>{formatTime(sg.end)}</td>
                          <td>{sg.label}</td>
                          <td>{sg.action ?? "keep"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {jobDetail && jobStudioTab === "markers" && (
                <div className="space-y-2">
                  {(jobDetail.result?.markers ?? []).length === 0 && <p className="text-[#8da0be]">No markers.</p>}
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[#1c2740]">
                        <th className="text-left py-2">Time</th>
                        <th className="text-left py-2">Name</th>
                        <th className="text-left py-2">Type</th>
                        <th className="text-left py-2">Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(jobDetail.result?.markers ?? []).map((m, i) => (
                        <tr key={i} className="border-b border-[#1c2740]/50">
                          <td className="py-1.5">{formatTime(m.timeSec)}</td>
                          <td>{m.name}</td>
                          <td>{m.type ?? "—"}</td>
                          <td className="text-[#8da0be]">{m.comment ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {jobDetail && jobStudioTab === "qa" && (
                <div className="space-y-3 text-sm">
                  {!jobDetail.qa && <p className="text-[#8da0be]">No QA data.</p>}
                  {jobDetail.qa?.silence && jobDetail.qa.silence.length > 0 && (
                    <div>
                      <strong>Silence</strong>
                      <ul className="list-disc list-inside text-[#8da0be]">
                        {jobDetail.qa.silence.slice(0, 20).map((s, i) => (
                          <li key={i}>{formatTime(s.start)} – {s.end != null ? formatTime(s.end) : "?"} ({(s.duration ?? 0).toFixed(1)}s)</li>
                        ))}
                        {jobDetail.qa.silence.length > 20 && <li>… +{jobDetail.qa.silence.length - 20} more</li>}
                      </ul>
                    </div>
                  )}
                  {jobDetail.qa?.black && jobDetail.qa.black.length > 0 && (
                    <div>
                      <strong>Black</strong>
                      <ul className="list-disc list-inside text-[#8da0be]">
                        {jobDetail.qa.black.slice(0, 20).map((b, i) => (
                          <li key={i}>{formatTime(b.start)} – {formatTime(b.end)} ({b.duration.toFixed(1)}s)</li>
                        ))}
                        {jobDetail.qa.black.length > 20 && <li>… +{jobDetail.qa.black.length - 20} more</li>}
                      </ul>
                    </div>
                  )}
                  {jobDetail.qa?.loudness && (
                    <div>
                      <strong>Loudness</strong>
                      <p className="text-[#8da0be]">
                        I: {jobDetail.qa.loudness.integrated ?? "—"} LUFS · LRA: {jobDetail.qa.loudness.lra ?? "—"} · Max: {jobDetail.qa.loudness.maxVolume ?? "—"}
                      </p>
                    </div>
                  )}
                  {jobDetail.qa && (
                    <pre className="bg-[#0a111c] p-3 rounded text-xs overflow-x-auto mt-2">
                      {JSON.stringify(jobDetail.qa, null, 2)}
                    </pre>
                  )}
                </div>
              )}
              {jobDetail && jobStudioTab === "scenes" && (
                <div className="space-y-2">
                  {(!jobDetail.scenes?.length && !jobDetail.sceneSegments?.length) && <p className="text-[#8da0be]">No scenes.</p>}
                  {jobDetail.scenes && jobDetail.scenes.length > 0 && (
                    <p className="text-sm">Cut points: {jobDetail.scenes.map((t) => formatTime(t)).join(", ")}</p>
                  )}
                  {jobDetail.sceneSegments && jobDetail.sceneSegments.length > 0 && (
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-[#1c2740]">
                          <th className="text-left py-2">Start</th>
                          <th className="text-left py-2">End</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobDetail.sceneSegments.map((s, i) => (
                          <tr key={i} className="border-b border-[#1c2740]/50">
                            <td className="py-1.5">{formatTime(s.start)}</td>
                            <td>{formatTime(s.end)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
              {jobDetail && jobStudioTab === "broll" && (
                <div className="space-y-2">
                  {(jobDetail.broll ?? []).length === 0 && <p className="text-[#8da0be]">No B-roll.</p>}
                  <ul className="list-disc list-inside text-sm text-[#8da0be]">
                    {(jobDetail.broll ?? []).map((b, i) => (
                      <li key={i}>{b.path} (score: {b.score})</li>
                    ))}
                  </ul>
                </div>
              )}
              {jobDetail && jobStudioTab === "reframe" && (
                <div className="space-y-2">
                  {(jobDetail.reframed ?? []).length === 0 && <p className="text-[#8da0be]">No reframe outputs.</p>}
                  <ul className="list-sm space-y-1">
                    {(jobDetail.reframed ?? []).map((r, i) => (
                      <li key={i} className="text-[#8da0be]">
                        {r.target}: {r.ok ? r.outputPath ?? "ok" : r.error ?? "failed"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {jobDetail && jobStudioTab === "music" && (
                <div className="space-y-2 text-sm">
                  {!jobDetail.music && <p className="text-[#8da0be]">No music data.</p>}
                  {jobDetail.music?.beats?.length != null && <p>Beats: {jobDetail.music.beats.length}</p>}
                  {jobDetail.music?.sections?.length != null && <p>Sections: {jobDetail.music.sections.length}</p>}
                  {jobDetail.music?.drops?.length != null && <p>Drops: {jobDetail.music.drops.length}</p>}
                  {jobDetail.music?.warnings?.length ? <p className="text-amber-400">Warnings: {jobDetail.music.warnings.join(", ")}</p> : null}
                  {jobDetail.music?.waveformPath && <p className="text-[#8da0be]">Waveform: {jobDetail.music.waveformPath}</p>}
                  {jobDetail.music?.spectrogramPath && <p className="text-[#8da0be]">Spectrogram: {jobDetail.music.spectrogramPath}</p>}
                  {jobDetail.music && (
                    <pre className="bg-[#0a111c] p-3 rounded text-xs overflow-x-auto mt-2">
                      {JSON.stringify(jobDetail.music, null, 2)}
                    </pre>
                  )}
                </div>
              )}
              {jobDetail && jobStudioTab === "timeline" && (
                <div className="space-y-2 text-sm">
                  <p className="text-[#8da0be]">TimelineContract / OTIO outputs.</p>
                  {jobDetail.outputs?.timelinePath && <p>Timeline JSON: {jobDetail.outputs.timelinePath}</p>}
                  {jobDetail.outputs?.otioPath && <p>OTIO: {jobDetail.outputs.otioPath}</p>}
                  <button
                    onClick={() => jobAction(jobDetail.id, "timeline")}
                    className="px-3 py-1 rounded bg-[#22d3ee] text-[#03101a] font-medium"
                  >
                    Fetch /v1/jobs/{jobDetail.id}/timeline
                  </button>
                  <p className="text-xs text-[#8da0be]">Respuesta se mostrará en el panel Output.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#1c2740] bg-[#0b1220] p-4 space-y-3">
          <h2 className="text-lg font-semibold">4 · Media tools</h2>
          <input
            value={mediaToolPath}
            onChange={(e) => setMediaToolPath(e.target.value)}
            className="w-full rounded-lg border border-[#1c2740] bg-[#0a111c] p-2 text-sm"
            placeholder="/path/video-or-audio"
          />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => call("/v1/qa/analyze", { path: mediaToolPath })} className="px-3 py-2 rounded-lg bg-[#22d3ee] text-[#03101a] text-sm font-semibold">Run QA</button>
            <button onClick={() => call("/v1/audio/normalize", { path: mediaToolPath })} className="px-3 py-2 rounded-lg border border-[#1c2740] text-sm">Normalize</button>
            <button onClick={() => call("/v1/scene/detect", { path: mediaToolPath })} className="px-3 py-2 rounded-lg border border-[#1c2740] text-sm">Scene Detect</button>
            <button onClick={() => call("/v1/reframe", { path: mediaToolPath, target: "9:16" })} className="px-3 py-2 rounded-lg border border-[#1c2740] text-sm">Reframe 9:16</button>
            <button onClick={() => call("/v1/music/analyze", { path: mediaToolPath, profile })} className="px-3 py-2 rounded-lg bg-[#22d3ee] text-[#03101a] text-sm font-semibold">Music Analyze</button>
            <button onClick={() => call("/v1/ingest/probe", { path: mediaToolPath })} className="px-3 py-2 rounded-lg border border-[#1c2740] text-sm">Probe</button>
          </div>
          <input
            value={brollText}
            onChange={(e) => setBrollText(e.target.value)}
            className="w-full rounded-lg border border-[#1c2740] bg-[#0a111c] p-2 text-sm"
            placeholder="keywords o summary..."
          />
          <button onClick={() => call("/v1/broll/suggest", { text: brollText })} className="w-full py-2 rounded-lg border border-[#1c2740]">
            Suggest B-roll
          </button>
        </div>
        <div className="rounded-xl border border-[#1c2740] bg-[#0b1220] p-4 space-y-3">
          <h2 className="text-lg font-semibold">4b · QA (media o Job ID)</h2>
          <input
            value={qaPanelInput}
            onChange={(e) => setQaPanelInput(e.target.value)}
            className="w-full rounded-lg border border-[#1c2740] bg-[#0a111c] p-2 text-sm"
            placeholder="/path/video.mp4 o job-uuid"
          />
          <div className="flex gap-2">
            <button onClick={runQaPanel} className="px-3 py-2 rounded-lg bg-[#22d3ee] text-[#03101a] text-sm font-semibold">Run QA</button>
            <button onClick={downloadQaCsv} className="px-3 py-2 rounded-lg border border-[#1c2740] text-sm">Download CSV</button>
          </div>
          <div className="text-sm text-[#8da0be] whitespace-pre-wrap min-h-[60px] rounded bg-[#0a111c] p-2">{qaPanelSummary || "Resumen aquí."}</div>
        </div>
        <div className="rounded-xl border border-[#1c2740] bg-[#0b1220] p-4 space-y-3">
          <h2 className="text-lg font-semibold">4c · Music Mode</h2>
          <input
            value={musicPanelPath}
            onChange={(e) => setMusicPanelPath(e.target.value)}
            className="w-full rounded-lg border border-[#1c2740] bg-[#0a111c] p-2 text-sm"
            placeholder="/path/audio-or-video.mp4"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#8da0be]">Perfil:</span>
            <select value={profile} onChange={(e) => setProfile(e.target.value)} className="bg-[#0a111c] border border-[#1c2740] rounded px-2 py-1 text-sm">
              {(profiles?.profiles ?? ["shorts"]).map((p: string) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button onClick={runMusicPanel} className="w-full py-2 rounded-lg bg-[#22d3ee] text-[#03101a] font-semibold">Music Analyze</button>
          {musicPanelResult && (
            <div className="text-sm space-y-1">
              {musicPanelResult.beats && <p>Beats: {(musicPanelResult.beats as unknown[]).length}</p>}
              {musicPanelResult.sections && <p>Sections: {(musicPanelResult.sections as unknown[]).length}</p>}
              {musicPanelResult.drops && <p>Drops: {(musicPanelResult.drops as unknown[]).length}</p>}
              {musicPanelResult.warnings && <p className="text-amber-400">Warnings: {(musicPanelResult.warnings as string[]).join(", ")}</p>}
              {musicPanelResult.waveformPath && <p className="text-[#8da0be]">Waveform: {String(musicPanelResult.waveformPath)}</p>}
              {musicPanelResult.spectrogramPath && <p className="text-[#8da0be]">Spectrogram: {String(musicPanelResult.spectrogramPath)}</p>}
            </div>
          )}
        </div>
        <div className="rounded-xl border border-[#1c2740] bg-[#0b1220] p-4 flex flex-col min-h-[280px]">
          <h2 className="text-lg font-semibold mb-1">4d · Agente (orquestador LLM)</h2>
          <p className="text-xs text-[#8da0be] mb-2">Entiendo lo que pides y ejecuto todo: jobs, QA, retry, crear job, analizar transcript, etc.</p>
          <div className="flex-1 min-h-[180px] max-h-[320px] overflow-y-auto rounded-lg border border-[#1c2740] bg-[#080f1a] p-3 flex flex-col gap-2 mb-3">
            {agentMessages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[92%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap break-words ${
                  m.role === "user"
                    ? "self-end bg-[#22d3ee]/15 border border-[#22d3ee]/40"
                    : "self-start bg-[#0d1625] border border-[#1c2740]" + (m.error ? " text-[#f87171]" : "")
                }`}
              >
                {m.content}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAgentMessage(); } }}
              placeholder="Ej: reintenta el último job que falló / crea un job con /ruta/video.mp4"
              className="flex-1 rounded-lg border border-[#1c2740] bg-[#0a111c] px-3 py-2 text-sm"
            />
            <button onClick={sendAgentMessage} className="px-4 py-2 rounded-lg bg-[#22d3ee] text-[#03101a] font-semibold">
              Enviar
            </button>
          </div>
        </div>
        <div className="rounded-xl border border-[#1c2740] bg-[#0b1220] p-4 space-y-2">
          <h2 className="text-lg font-semibold">5 · Config snapshot</h2>
          <pre className="text-xs bg-[#0a111c] p-3 rounded-lg overflow-auto max-h-[320px]">
            {JSON.stringify(config?.config ?? {}, null, 2)}
          </pre>
        </div>
      </section>

      <section className="rounded-xl border border-[#1c2740] bg-[#0b1220] p-4">
        <h2 className="text-lg font-semibold mb-2">Output / Logs</h2>
        <pre className="text-xs bg-[#0a111c] p-3 rounded-lg overflow-auto max-h-[280px] whitespace-pre-wrap">
          {output}
        </pre>
      </section>
    </div>
  );
}
