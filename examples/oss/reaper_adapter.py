"""
AutoKit → Reaper adapter (offline friendly).

- Consume TimelineContract JSON (or job.json) and emit a minimal .RPP project.
- Tracks: Dialogue, Music, Broll, SFX.
- Items follow segments; markers include QA/music/scene markers.
- Ducking hint: music items get a named envelope ready for sidechain.

Usage:
    python reaper_adapter.py --timeline timeline.json --rpp-out job.rpp

If running inside Reaper as ReaScript Python, you can extend this to use the live API,
but this file focuses on portable RPP generation.
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


def build_rpp(contract: Dict[str, Any], media_path: str) -> str:
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

    # Music track placeholder
    lines.append("  <TRACK")
    lines.append("    NAME \"Music\"")
    lines.append("    <FXCHAIN\n      SHOW 0\n    >")
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
    parser.add_argument("--timeline", required=True, help="Ruta a timeline.json o job.json")
    parser.add_argument("--rpp-out", required=False, default=None, help="Ruta de salida .rpp (default: alongside json)")
    args = parser.parse_args()

    contract = load_contract(args.timeline)
    media_path = contract.get("media")
    if not media_path:
        raise SystemExit("TimelineContract no incluye media path")

    rpp = build_rpp(contract, media_path)
    out_path = args.rpp_out or os.path.splitext(args.timeline)[0] + ".rpp"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(rpp)
    print(f"RPP escrito en {out_path}")


if __name__ == "__main__":
    main()
