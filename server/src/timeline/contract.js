import path from "path";

function pickDuration(job) {
  const candidates = [];
  const collect = (arr, field) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((item) => {
      const start = Number(item.start ?? item.timeSec ?? 0);
      const end = Number(item.end ?? start);
      const val = field === "end" ? end : start;
      if (!Number.isNaN(val)) candidates.push(val);
    });
  };
  collect(job.result?.segments, "end");
  collect(job.sceneSegments, "end");
  collect(job.qaMarkers, "end");
  collect(job.result?.markers, "timeSec");
  collect(job.music?.markers, "timeSec");
  if (job.input?.media?.durationSec) candidates.push(Number(job.input.media.durationSec));
  return candidates.length ? Math.max(...candidates) : null;
}

function normalizeMarkers(job) {
  const markers = [];
  (job.result?.markers || []).forEach((m) => markers.push({
    timeSec: Number(m.timeSec || 0),
    name: m.name || "marker",
    comment: m.comment || "",
    type: m.type || "other",
    source: "result"
  }));
  (job.qaMarkers || []).forEach((m) => markers.push({
    timeSec: Number(m.timeSec || m.start || 0),
    name: m.name || m.type || "qa",
    comment: m.comment || m.message || "",
    type: "qa",
    source: "qa"
  }));
  (job.sceneSegments || []).forEach((s, idx) => markers.push({
    timeSec: Number(s.start || 0),
    name: s.label || `scene_${idx + 1}`,
    comment: "scene boundary",
    type: "scene",
    source: "scene"
  }));
  (job.music?.markers || []).forEach((m) => markers.push({
    timeSec: Number(m.timeSec || m.t || 0),
    name: m.name || m.type || "music",
    comment: m.comment || "",
    type: "music",
    source: "music"
  }));
  markers.sort((a, b) => a.timeSec - b.timeSec);
  return markers;
}

function normalizeSegments(segments = []) {
  return segments
    .filter((s) => s && typeof s.start === "number" && typeof s.end === "number")
    .map((s, idx) => ({
      start: Number(s.start),
      end: Number(s.end),
      label: s.label || `segment_${idx + 1}`,
      action: s.action || "keep"
    }))
    .sort((a, b) => a.start - b.start);
}

function toOtioTime(sec, fps) {
  const value = Math.round(sec * fps);
  return { value, rate: fps };
}

function segmentsToOtioClips(segments, mediaPath, fps) {
  return segments.filter((s) => s.action !== "remove").map((s, idx) => {
    const duration = Math.max(0, s.end - s.start);
    return {
      type: "Clip",
      name: s.label || `segment_${idx + 1}`,
      metadata: { autokit: { action: s.action } },
      media_reference: {
        type: "ExternalReference",
        target_url: mediaPath ? `file://${path.resolve(mediaPath)}` : "",
        available_range: {
          start_time: toOtioTime(s.start, fps),
          duration: toOtioTime(duration, fps)
        }
      },
      source_range: {
        start_time: toOtioTime(s.start, fps),
        duration: toOtioTime(duration, fps)
      }
    };
  });
}

function markersToOtio(markers, fps) {
  return markers.map((m) => ({
    name: m.name || "marker",
    color: m.type || "default",
    marked_range: {
      start_time: toOtioTime(m.timeSec || 0, fps),
      duration: toOtioTime(0, fps)
    },
    metadata: { autokit: { source: m.source || "" }, comment: m.comment || "" }
  }));
}

function buildTrack(name, kind, clips = [], markers = []) {
  return { name, kind, clips, markers };
}

function buildTransitions(segments, musicMarkers) {
  const transitions = [];
  const markers = Array.isArray(musicMarkers) ? musicMarkers : [];
  for (let i = 1; i < segments.length; i += 1) {
    const boundary = segments[i].start;
    const near = markers.find((m) => Math.abs((m.timeSec || m.t || 0) - boundary) < 0.25);
    transitions.push({
      at: boundary,
      type: near ? "crossfade" : "cut",
      reason: near ? "music" : "segment"
    });
  }
  return transitions;
}

function buildDuckingCues(musicMarkers) {
  const cues = [];
  (musicMarkers || []).forEach((m) => {
    const t = Number(m.timeSec || m.t || 0);
    if (Number.isFinite(t)) {
      cues.push({ timeSec: t, durationSec: 0.8, targetDb: -6, reason: m.type || "music" });
    }
  });
  return cues;
}

export function buildTimelineContract(job, config = {}) {
  const fps = config.timeline?.fps || 25;
  const segments = normalizeSegments(job.result?.segments || []);
  const sceneSegments = normalizeSegments(job.sceneSegments || []);
  const markers = normalizeMarkers(job);
  const durationSec = pickDuration(job);
  const media = job.input?.media?.path || null;

  const dialogueTrack = buildTrack("dialogue", "audio", segments, markers);
  const musicTrack = buildTrack("music", "audio", [], job.music?.markers || []);
  const brollTrack = buildTrack("broll", "video", [], []);
  const sfxTrack = buildTrack("sfx", "audio", [], []);

  const contract = {
    id: job.id,
    profile: job.profile || config.profile || "default",
    fps,
    media,
    durationSec,
    summary: job.result?.summary || "",
    chapters: job.result?.chapters || [],
    segments,
    sceneSegments,
    qaMarkers: job.qaMarkers || [],
    musicMarkers: job.music?.markers || [],
    broll: job.broll || [],
    markers,
    tracks: [dialogueTrack, musicTrack, brollTrack, sfxTrack],
    transitions: buildTransitions(segments.length ? segments : sceneSegments, job.music?.markers || []),
    duckingCues: buildDuckingCues(job.music?.markers || [])
  };

  return contract;
}

export function timelineToOtio(contract) {
  const fps = contract.fps || 25;
  const clips = segmentsToOtioClips(contract.segments || [], contract.media, fps);
  const otioMarkers = markersToOtio(contract.markers || [], fps);

  return {
    OTIO_SCHEMA: "OpenTimelineIO.1",
    name: contract.id ? `job-${contract.id}` : "autokit",
    global_start_time: toOtioTime(0, fps),
    tracks: [
      {
        type: "Track",
        kind: "Video",
        name: "Primary",
        items: clips,
        markers: otioMarkers
      }
    ],
    metadata: {
      autokit: {
        profile: contract.profile,
        durationSec: contract.durationSec,
        media: contract.media
      }
    }
  };
}
