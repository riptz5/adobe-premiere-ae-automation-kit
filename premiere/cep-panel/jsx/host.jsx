/**
 * Premiere ExtendScript host functions
 * Loaded by CEP panel. Tested patterns are based on public docs and sample panels.
 *
 * NOTE: ExtendScript in Premiere is legacy but supported (plan through Sep 2026 per docs).
 */
var AutoKit = AutoKit || {};
var TARGET_VIDEO_TRACKS = [0];
var TARGET_AUDIO_TRACKS = [0, 1];

function getTracks(seq, kind) {
  var arr = kind === "video" ? seq.videoTracks : seq.audioTracks;
  var idxs = kind === "video" ? TARGET_VIDEO_TRACKS : TARGET_AUDIO_TRACKS;
  var list = [];
  for (var i = 0; i < idxs.length; i++) {
    var idx = idxs[i];
    if (arr && arr.numTracks > idx && arr[idx]) list.push(arr[idx]);
  }
  if (list.length) return list;
  var fallback = [];
  for (var t = 0; t < arr.numTracks; t++) fallback.push(arr[t]);
  return fallback;
}

AutoKit.getProjectInfo = function () {
  try {
    if (!app || !app.project) return "No app.project";
    var p = app.project;
    var name = p.name;
    return "Project: " + name + " | sequences=" + p.sequences.numSequences;
  } catch (e) {
    return "ERR: " + e.toString();
  }
};

AutoKit.importAndOrganize = function () {
  try {
    var folder = Folder.selectDialog("Elige carpeta con media para importar");
    if (!folder) return "Cancelado.";
    var files = folder.getFiles(function (f) {
      return f instanceof File && /\.(mp4|mov|mxf|wav|mp3|png|jpg|jpeg)$/i.test(f.name);
    });
    if (!files || files.length === 0) return "No encontré archivos compatibles en la carpeta.";
    var importPaths = [];
    for (var i=0; i<files.length; i++) importPaths.push(files[i].fsName);

    // Create /AutoKit bin
    var root = app.project.rootItem;
    var bin = null;
    for (var c=0; c<root.children.numItems; c++) {
      var child = root.children[c];
      if (child && child.name === "AutoKit" && child.type === ProjectItemType.BIN) { bin = child; break; }
    }
    if (!bin) bin = root.createBin("AutoKit");

    // Import into project
    // app.project.importFiles(paths, suppressUI, targetBin, importAsNumberedStills)
    var ok = app.project.importFiles(importPaths, 1, bin, 0);
    return "Import result: " + ok + " | files=" + importPaths.length;
  } catch (e) {
    return "ERR: " + e.toString();
  }
};

AutoKit.applyMarkersFromJSONString = function (jsonStr) {
  try {
    var payload = JSON.parse(jsonStr);
    if (!payload || !payload.markers || !payload.markers.length) return "JSON sin markers.";
    var seq = app.project.activeSequence;
    if (!seq) return "No hay secuencia activa.";
    var markers = seq.markers;
    var created = 0;

    for (var i=0; i<payload.markers.length; i++) {
      var m = payload.markers[i];
      var t = new Time();
      t.seconds = Number(m.timeSec || 0);
      var mk = markers.createMarker(t);
      mk.name = String(m.name || "Marker");
      mk.comments = String(m.comment || "");
      // duration (optional)
      if (m.durationSec) {
        var d = new Time();
        d.seconds = Number(m.durationSec);
        mk.end = t; mk.end.seconds = t.seconds + d.seconds;
      }
      created++;
    }
    return "OK: markers creados=" + created;
  } catch (e) {
    return "ERR: " + e.toString();
  }
};

AutoKit.exportViaAME = function () {
  try {
    var seq = app.project.activeSequence;
    if (!seq) return "No hay secuencia activa.";
    if (!app.encoder) return "No encontré app.encoder (Media Encoder).";

    // Ensure AME is available
    app.encoder.launchEncoder();

    // Ask output path
    var outFile = File.saveDialog("Guardar export como...", "*.mp4");
    if (!outFile) return "Cancelado.";
    var outPath = outFile.fsName;

    // Ask preset path (user picks an .epr or .xml preset)
    var preset = File.openDialog("Elige preset de export (EPR/XML)", "*.*");
    if (!preset) return "Cancelado preset.";
    var presetPath = preset.fsName;

    // encodeSequence(sequence, outputPath, presetPath, workArea, removeFromQueue, encodeInAME)
    // workArea: 0=entire, 1=work area
    // removeFromQueue: 1 yes
    // encodeInAME: 1 yes
    var jobID = app.encoder.encodeSequence(seq, outPath, presetPath, 0, 1, 1);

    return "Export encolado en AME. jobID=" + jobID;
  } catch (e) {
    return "ERR: " + e.toString();
  }
};

AutoKit.pickMediaFile = function () {
  try {
    var f = File.openDialog("Elige archivo media (video o audio)");
    if (!f) return "CANCEL";
    return f.fsName;
  } catch (e) {
    return "ERR: " + e.toString();
  }
};

AutoKit.applySegmentsFromJSONString = function (jsonStr) {
  try {
    var payload = JSON.parse(jsonStr);
    if (!payload || !payload.segments || !payload.segments.length) return "JSON sin segments.";
    var seq = app.project.activeSequence;
    if (!seq) return "No hay secuencia activa.";
    var videoTracks = getTracks(seq, "video");
    var audioTracks = getTracks(seq, "audio");
    var segments = payload.segments;
    segments.sort(function(a,b){ return (a.start||0) - (b.start||0); });

    // Determine remove segments (if only keep is provided, invert).
    var removeSegments = [];
    var hasRemove = false;
    for (var i=0; i<segments.length; i++) {
      if (segments[i].action === "remove") { hasRemove = true; break; }
    }
    if (hasRemove) {
      for (var r=0; r<segments.length; r++) {
        if (segments[r].action === "remove") removeSegments.push(segments[r]);
      }
    } else {
      var endSeconds = 0;
      for (var vt=0; vt<videoTracks.length; vt++) {
        var track = videoTracks[vt];
        for (var c=0; c<track.clips.numItems; c++) {
          var clip = track.clips[c];
          if (clip && clip.end && clip.end.seconds > endSeconds) endSeconds = clip.end.seconds;
        }
      }
      var cursor = 0;
      for (var k=0; k<segments.length; k++) {
        var seg = segments[k];
        if (seg.start > cursor) removeSegments.push({ start: cursor, end: seg.start });
        if (seg.end > cursor) cursor = seg.end;
      }
      if (cursor < endSeconds) removeSegments.push({ start: cursor, end: endSeconds });
    }

    app.enableQE();
    if (!qe || !qe.project) return "QE no disponible.";
    var qeSeq = qe.project.getActiveSequence();
    if (!qeSeq) return "QE sequence no disponible.";

    function razorAllTracksAt(sec) {
      var t = new Time();
      t.seconds = sec;
      var razorVideo = function(trackIdx) {
        var vTrack = qeSeq.getVideoTrackAt(trackIdx);
        if (vTrack) vTrack.razor(t.ticks);
      };
      var razorAudio = function(trackIdx) {
        var aTrack = qeSeq.getAudioTrackAt(trackIdx);
        if (aTrack) aTrack.razor(t.ticks);
      };

      if (TARGET_VIDEO_TRACKS.length) {
        for (var v = 0; v < TARGET_VIDEO_TRACKS.length; v++) razorVideo(TARGET_VIDEO_TRACKS[v]);
      } else {
        for (var vv = 0; vv < qeSeq.numVideoTracks; vv++) razorVideo(vv);
      }

      if (TARGET_AUDIO_TRACKS.length) {
        for (var a = 0; a < TARGET_AUDIO_TRACKS.length; a++) razorAudio(TARGET_AUDIO_TRACKS[a]);
      } else {
        for (var aa = 0; aa < qeSeq.numAudioTracks; aa++) razorAudio(aa);
      }
    }

    // Razor at all remove segment boundaries.
    for (var s=0; s<removeSegments.length; s++) {
      var segm = removeSegments[s];
      if (segm.start > 0) razorAllTracksAt(segm.start);
      razorAllTracksAt(segm.end);
    }

    function removeClipsInRange(track, start, end) {
      for (var i = track.clips.numItems - 1; i >= 0; i--) {
        var clip = track.clips[i];
        if (!clip) continue;
        var cs = clip.start.seconds;
        var ce = clip.end.seconds;
        if (cs >= start && ce <= end) {
          try {
            clip.remove(1, 1);
          } catch (e) {
            try { clip.remove(1); } catch (e2) {}
          }
        }
      }
    }

    for (var rs=0; rs<removeSegments.length; rs++) {
      var segr = removeSegments[rs];
      for (var vt2=0; vt2<videoTracks.length; vt2++) {
        removeClipsInRange(videoTracks[vt2], segr.start, segr.end);
      }
      for (var at2=0; at2<audioTracks.length; at2++) {
        removeClipsInRange(audioTracks[at2], segr.start, segr.end);
      }
    }

    return "OK: segments aplicados. removed=" + removeSegments.length;
  } catch (e) {
    return "ERR: " + e.toString();
  }
};
