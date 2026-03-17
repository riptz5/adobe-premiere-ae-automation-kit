"""
AutoKit → Reaper adapter (offline friendly).

- Consume TimelineContract JSON (or job.json) and emit a minimal .RPP project.
- Tracks: Dialogue, Music, Broll, SFX.
- Items follow segments; markers include QA/music/scene markers.
- Ducking: adds a basic volume envelope on Music track using duckingCues/music markers.
- Template support: can inject tracks/markers into a .RPP template.
- Multicam: --multicam-media cam1,cam2,... creates one dialogue track per camera.

Usage:
    python reaper_adapter.py --timeline timeline.json --rpp-out job.rpp
    python reaper_adapter.py --timeline timeline.json --template-rpp base.rpp --fxchain mix.RfxChain
    python reaper_adapter.py --multicam-media cam1.mp4,cam2.mp4 --rpp-out multicam.rpp
    python reaper_adapter.py --multicam-media cam1.mp4,cam2.mp4 --timeline timeline.json --rpp-out multicam.rpp
"""

import argparse
import json
import os
from typing import List, Dict, Any

TRACKS = ["Dialogue", "Music", "Broll", "SFX"]


def load_contract(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "contract" in data:
        return data["contract"]
    if data.get("result") or data.get("qaMarkers") or data.get("sceneSegments"):
        # full job.json
        return {
            "id": data.get("id"),
            "media": data.get("input", {}).get("media", {}).get("path"),
            "segments": data.get("result", {}).get("segments", []),
            "markers": data.get("result", {}).get("markers", []),
            "qaMarkers": data.get("qaMarkers", []),
            "sceneSegments": data.get("sceneSegments", []),
            "musicMarkers": data.get("music", {}).get("markers", []),
            "duckingCues": data.get("music", {}).get("markers", []),
            "broll": data.get("broll", []),
        }
    return data


def fmt_marker(idx: int, m: Dict[str, Any]) -> str:
    pos = float(m.get("timeSec", m.get("t", 0.0)))
    name = m.get("name") or m.get("type") or f"marker_{idx}"
    return f"  MARKER {idx} {pos:.3f} \"{name}\" 0 0 1"


def fmt_item(seg: Dict[str, Any], media_path: str) -> List[str]:
    start = float(seg.get("start", 0.0))
    end = float(seg.get("end", start))
    length = max(0.001, end - start)
    label = seg.get("label") or "segment"
    lines = ["    <ITEM",
             f"      POSITION {start:.3f}",
             f"      LENGTH {length:.3f}",
             f"      NAME \"{label}\"",
             "      <SOURCE WAV",
             f"        FILE \"{media_path}\"",
             "      >",
             "    >"]
    return lines


def fmt_volume_env(ducking_cues: List[Dict[str, Any]]) -> List[str]:
    if not ducking_cues:
        return []
    env = ["    <VOLENV", "      ACT 1 -1", "      VIS 1 1 1", "      ARM 0", "      DEFSHAPE 0"]
    for cue in ducking_cues:
        t = float(cue.get("timeSec", cue.get("t", 0.0)))
        dur = float(cue.get("durationSec", 0.8))
        low = 0.5
        env.append(f"      PT {max(0.0, t - 0.1):.3f} 1.000000 0 0")
        env.append(f"      PT {t:.3f} {low:.6f} 0 0")
        env.append(f"      PT {t + dur:.3f} {low:.6f} 0 0")
        env.append(f"      PT {t + dur + 0.1:.3f} 1.000000 0 0")
    env.append("    >")
    return env


def load_fxchain(path: str) -> List[str]:
    if not path:
        return []
    if not os.path.isfile(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        lines = f.read().splitlines()
    return ["    " + line for line in lines]


def inject_into_template(template_text: str, payload: str) -> str:
    marker = ";AUTOKIT_TRACKS"
    if marker in template_text:
        return template_text.replace(marker, payload)
    lines = template_text.splitlines()
    if lines and lines[-1].strip() == ">":
        return "\n".join(lines[:-1] + [payload] + [">"])
    return template_text + "\n" + payload


def build_multicam_rpp(media_paths: List[str], contract: Dict[str, Any] = None, fxchain_path: str = "") -> str:
    """Build a multicam .rpp with one dialogue track per camera + shared Music/SFX."""
    contract = contract or {}
    markers: List[str] = []
    for idx, m in enumerate((contract.get("markers") or []) + (contract.get("qaMarkers") or []) + (contract.get("musicMarkers") or [])):
        markers.append(fmt_marker(idx + 1, m))

    segments = contract.get("segments") or []

    lines = ["<REAPER_PROJECT 0.1 \"Reaper v6\" 45 0 0",
             "  RIPPLE 0",
             "  GROUPOVERRIDE 0 0 0",
             "  AUTOXFADE 1",
             "  DEFPANLAW 1",
             "  PROJOFFS 0 0 0",
             "  <RENDERER",
             "  >"]

    # One dialogue/audio track per camera
    for cam_idx, media_path in enumerate(media_paths):
        cam_name = f"CAM{cam_idx + 1} – {os.path.basename(media_path)}"
        lines.append("  <TRACK")
        lines.append(f"    NAME \"{cam_name}\"")
        # mute all cameras except the first by default
        if cam_idx > 0:
            lines.append("    MUTESOLO 1 0 0")
        if segments:
            for seg in segments:
                if seg.get("action", "keep") == "remove":
                    continue
                lines.extend(fmt_item(seg, media_path))
        else:
            # place one item covering the whole file if no segments
            lines.extend(fmt_item({"start": 0, "end": 3600, "label": cam_name}, media_path))
        lines.append("  >")

    # Shared Music track
    lines.append("  <TRACK")
    lines.append("    NAME \"Music\"")
    fxchain = load_fxchain(fxchain_path)
    if fxchain:
        lines.append("    <FXCHAIN")
        lines.append("      SHOW 0")
        lines.extend(fxchain)
        lines.append("    >")
    lines.extend(fmt_volume_env(contract.get("duckingCues") or contract.get("musicMarkers") or []))
    lines.append("  >")

    # Shared SFX track
    lines.append("  <TRACK")
    lines.append("    NAME \"SFX\"")
    lines.append("  >")

    lines.extend(markers)
    lines.append(">")
    return "\n".join(lines)


def build_rpp(contract: Dict[str, Any], media_path: str, fxchain_path: str = "") -> str:
    markers = []
    for idx, m in enumerate((contract.get("markers") or []) + (contract.get("qaMarkers") or []) + (contract.get("musicMarkers") or [])):
        markers.append(fmt_marker(idx + 1, m))

    segments = contract.get("segments") or contract.get("sceneSegments") or []
    broll = contract.get("broll") or []

    lines = ["<REAPER_PROJECT 0.1 \"Reaper v6\" 45 0 0",
             "  RIPPLE 0",
             "  GROUPOVERRIDE 0 0 0",
             "  AUTOXFADE 1",
             "  DEFPANLAW 1",
             "  PROJOFFS 0 0 0",
             "  <RENDERER",
             "  >"]

    # Dialogue track
    lines.append("  <TRACK")
    lines.append("    NAME \"Dialogue\"")
    for seg in segments:
        if seg.get("action", "keep") == "remove":
            continue
        lines.extend(fmt_item(seg, media_path))
    lines.append("  >")

    # Music track
    lines.append("  <TRACK")
    lines.append("    NAME \"Music\"")
    fxchain = load_fxchain(fxchain_path)
    if fxchain:
        lines.append("    <FXCHAIN")
        lines.append("      SHOW 0")
        lines.extend(fxchain)
        lines.append("    >")
    lines.extend(fmt_volume_env(contract.get("duckingCues") or contract.get("musicMarkers") or []))
    lines.append("  >")

    # Broll track: place broll items aligned to segment start
    lines.append("  <TRACK")
    lines.append("    NAME \"Broll\"")
    for idx, b in enumerate(broll):
        seg = segments[min(idx, len(segments) - 1)] if segments else {"start": 0, "end": 5}
        item = {"start": seg.get("start", 0), "end": seg.get("end", 5), "label": os.path.basename(b.get("path", "broll"))}
        lines.extend(fmt_item(item, b.get("path", "")))
    lines.append("  >")

    # SFX empty track
    lines.append("  <TRACK")
    lines.append("    NAME \"SFX\"")
    lines.append("  >")

    lines.extend(markers)
    lines.append(">")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--timeline", required=False, default=None, help="Ruta a timeline.json o job.json")
    parser.add_argument("--rpp-out", required=False, default=None, help="Ruta de salida .rpp (default: alongside json)")
    parser.add_argument("--template-rpp", required=False, default="", help="Ruta a template .rpp para inyectar tracks")
    parser.add_argument("--fxchain", required=False, default="", help="Ruta a archivo .RfxChain para preset de mezcla")
    parser.add_argument("--multicam-media", required=False, default="", help="Rutas de cámeras separadas por coma para multicam .rpp")
    args = parser.parse_args()

    multicam_paths = [p.strip() for p in args.multicam_media.split(",") if p.strip()] if args.multicam_media else []

    if multicam_paths:
        # multicam mode: one track per camera
        contract: Dict[str, Any] = {}
        if args.timeline and os.path.isfile(args.timeline):
            contract = load_contract(args.timeline)
        rpp = build_multicam_rpp(multicam_paths, contract, fxchain_path=args.fxchain)
        out_path = args.rpp_out or (os.path.splitext(args.timeline)[0] + "_multicam.rpp" if args.timeline else "multicam.rpp")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(rpp)
        print(f"RPP multicam escrito en {out_path}")
        return

    if not args.timeline:
        raise SystemExit("--timeline es requerido salvo que se use --multicam-media")

    contract = load_contract(args.timeline)
    media_path = contract.get("media")
    if not media_path:
        raise SystemExit("TimelineContract no incluye media path")

    rpp = build_rpp(contract, media_path, fxchain_path=args.fxchain)
    if args.template_rpp and os.path.isfile(args.template_rpp):
        with open(args.template_rpp, "r", encoding="utf-8") as f:
            base = f.read()
        rpp = inject_into_template(base, rpp)
    out_path = args.rpp_out or os.path.splitext(args.timeline)[0] + ".rpp"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(rpp)
    print(f"RPP escrito en {out_path}")


if __name__ == "__main__":
    main()
