"""
AutoKit → Blender VSE adapter.

Objetivo:
- Consumir un TimelineContract (o job/result) y armar una VSE con:
  - Clips recortados según segments/sceneSegments.
  - Markers combinados (result, QA, music, scenes).
  - B-roll en canal superior con fades rápidos.
  - Opcional: render de salida.

Uso rápido (desde línea de comandos):

    blender -b -P blender_vse_adapter.py -- \\
      --job-json /ruta/job.json \\
      --media /ruta/video.mp4 \\
      --output /ruta/salida.mp4

O bien con contrato unificado:

    blender -b -P blender_vse_adapter.py -- \\
      --timeline /ruta/timeline.json \\
      --output /ruta/salida.mp4

Nota: se ejecuta dentro de Blender (bpy). Fuera de Blender el script solo valida argumentos.
"""

import argparse
import json
import os
from dataclasses import dataclass
from typing import List, Optional, Dict, Any


try:
    import bpy  # type: ignore
except ImportError:
    bpy = None


@dataclass
class Marker:
    timeSec: float
    name: str
    comment: Optional[str] = None


@dataclass
class Segment:
    start: float
    end: float
    label: str = ""
    action: str = "keep"


@dataclass
class JobResult:
    markers: List[Marker]
    segments: List[Segment]
    sceneSegments: List[Segment]
    qaMarkers: List[Marker]
    broll: List[Dict[str, Any]]
    media: str
    musicMarkers: List[Marker]


def _parse_markers(arr) -> List[Marker]:
    markers: List[Marker] = []
    for m in arr or []:
        try:
            markers.append(
                Marker(
                    timeSec=float(m.get("timeSec", m.get("t", 0.0))),
                    name=str(m.get("name", m.get("type", \"\"))),
                    comment=m.get("comment"),
                )
            )
        except Exception:
            continue
    return markers


def _parse_segments(arr) -> List[Segment]:
    segs: List[Segment] = []
    for s in arr or []:
        try:
            segs.append(
                Segment(
                    start=float(s.get("start", 0.0)),
                    end=float(s.get("end", 0.0)),
                    label=str(s.get("label", "")),
                    action=str(s.get("action", "keep")),
                )
            )
        except Exception:
            continue
    return segs


def load_contract(path: str) -> JobResult:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Admite /v1/jobs/:id (job completo) o timeline.json
    root = data.get("contract") or data.get("result") or data
    job_input = data.get("input") or {}
    markers = _parse_markers(root.get("markers") or root.get("result", {}).get("markers"))
    qa_markers = _parse_markers(root.get("qaMarkers"))
    music_markers = _parse_markers(root.get("musicMarkers"))
    segments = _parse_segments(root.get("segments") or root.get("result", {}).get("segments"))
    scene_segments = _parse_segments(root.get("sceneSegments") or root.get("scenes"))
    broll = root.get("broll") or []
    media = root.get("media") or job_input.get("media", {}).get("path")

    return JobResult(
        markers=markers,
        segments=segments,
        sceneSegments=scene_segments,
        qaMarkers=qa_markers,
        broll=broll,
        media=media,
        musicMarkers=music_markers,
    )


def ensure_scene(name: str = "AutoKit_VSE"):
    if bpy is None:
        raise RuntimeError("Este script debe ejecutarse dentro de Blender (bpy no disponible).")

    scene = bpy.data.scenes.get(name)
    if scene is None:
        scene = bpy.data.scenes.new(name=name)
    bpy.context.window.scene = scene

    if not scene.sequence_editor:
        scene.sequence_editor_create()

    return scene


def clear_vse(scene):
    seq = scene.sequence_editor
    for s in list(seq.sequences_all):
        seq.sequences.remove(s)


def add_media_strip(scene, media_path: str, channel: int, frame_start: int, start_sec: float, end_sec: float, fps: float):
    seq = scene.sequence_editor
    if not os.path.isfile(media_path):
        raise FileNotFoundError(f"Media not found: {media_path}")

    ext = os.path.splitext(media_path)[1].lower()
    duration_frames = max(1, int(round((end_sec - start_sec) * fps)))
    offset = int(round(start_sec * fps))

    if ext in {".wav", ".mp3", ".aiff", ".flac", ".ogg"}:
        strip = seq.sequences.new_sound(
            name=os.path.basename(media_path),
            filepath=media_path,
            channel=channel,
            frame_start=frame_start,
        )
    else:
        strip = seq.sequences.new_movie(
            name=os.path.basename(media_path),
            filepath=media_path,
            channel=channel,
            frame_start=frame_start,
        )

    strip.frame_offset_start = offset
    strip.frame_final_duration = duration_frames
    return strip


def apply_markers(scene, markers: List[Marker], fps: float):
    for m in markers:
        frame = int(round(m.timeSec * fps))
        marker = scene.timeline_markers.new(m.name or "Marker", frame=frame)
        if m.comment:
            marker.note = m.comment


def apply_segments(scene, media_path: str, segments: List[Segment], fps: float):
    current_start = 1
    for seg in segments:
        if seg.action == "remove":
            continue
        start_frame = int(round(seg.start * fps)) + 1
        strip = add_media_strip(scene, media_path, channel=1, frame_start=start_frame, start_sec=seg.start, end_sec=seg.end, fps=fps)
        strip.name = seg.label or strip.name
        strip.blend_type = "REPLACE"
        strip.select = False
        current_start = start_frame + strip.frame_final_duration


def apply_broll(scene, broll_items: List[Dict[str, Any]], segments: List[Segment], fps: float):
    if not broll_items or not segments:
        return
    seq = scene.sequence_editor
    for idx, b in enumerate(broll_items):
        path = b.get("path")
        if not path or not os.path.isfile(path):
            continue
        seg = segments[min(idx, len(segments) - 1)]
        start_frame = int(round(seg.start * fps)) + 1
        end_frame = int(round(seg.end * fps)) + 1
        duration_frames = max(1, end_frame - start_frame)
        strip = seq.sequences.new_movie(
            name=os.path.basename(path),
            filepath=path,
            channel=2,
            frame_start=start_frame,
        )
        strip.frame_final_duration = duration_frames
        strip.blend_type = "ALPHA_OVER"
        strip.opacity = 1.0
        # Fade in/out simple
        strip.animation_offset_start = 5
        strip.animation_offset_end = 5


def simple_render(scene, output_path: str):
    render = scene.render
    render.filepath = output_path
    # Contenedor y codec razonables para pruebas
    render.image_settings.file_format = "FFMPEG"
    render.ffmpeg.format = "MPEG4"
    render.ffmpeg.codec = "H264"
    render.ffmpeg.constant_rate_factor = "HIGH"
    render.ffmpeg.audio_codec = "AAC"

    # Render único clip (animación completa)
    bpy.ops.render.render(animation=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--job-json", help="Ruta a job.json o result.json de AutoKit")
    parser.add_argument("--timeline", help="Ruta a timeline.json (TimelineContract).")
    parser.add_argument("--media", help="Ruta al clip de vídeo/audio fuente (opcional si timeline tiene media)")
    parser.add_argument("--output", required=False, help="Ruta de salida (mp4). Si no se define, solo arma la timeline.")
    parser.add_argument("--fps", type=float, default=25.0, help="FPS de la timeline (default 25)")
    args = parser.parse_args()

    if not args.job_json and not args.timeline:
        raise SystemExit("Se requiere --job-json o --timeline")

    contract = load_contract(args.timeline or args.job_json)
    media_path = args.media or contract.media
    if not media_path:
        raise SystemExit("No hay media definida (use --media o asegure que timeline.media existe)")

    scene = ensure_scene()
    scene.render.fps = int(args.fps)
    clear_vse(scene)

    target_segments = contract.segments or contract.sceneSegments
    apply_segments(scene, media_path, target_segments, fps=args.fps)
    if not target_segments:
        add_media_strip(scene, media_path, channel=1, frame_start=1, start_sec=0, end_sec=max(1, 60 / args.fps), fps=args.fps)
    apply_broll(scene, contract.broll, target_segments, fps=args.fps)
    combined_markers = contract.markers + contract.qaMarkers + contract.musicMarkers
    apply_markers(scene, combined_markers, fps=args.fps)

    if args.output:
      # Asegurar carpeta
      os.makedirs(os.path.dirname(args.output), exist_ok=True)
      simple_render(scene, args.output)


if __name__ == "__main__":
    main()
