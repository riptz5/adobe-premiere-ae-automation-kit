"""
Convert TimelineContract/OTIO JSON to a minimal Kdenlive/MLT project.

Usage:
    python otio_to_kdenlive.py --timeline timeline.json --mlt-out job.mlt

This is intentionally simple: one playlist with primary video cuts; markers are exported as guides.
"""

import argparse
import json
import os
import xml.etree.ElementTree as ET
from typing import Dict, Any, List


def load_timeline(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "contract" in data:
        return data["contract"]
    return data


def seg_frames(seg: Dict[str, Any], fps: float):
    start = float(seg.get("start", 0.0))
    end = float(seg.get("end", start))
    return int(round(start * fps)), int(round(end * fps))


def build_mlt(contract: Dict[str, Any]) -> ET.Element:
    fps = float(contract.get("fps", 25))
    root = ET.Element("mlt")
    profile = ET.SubElement(root, "profile", attrib={"frame_rate_num": str(int(fps)), "frame_rate_den": "1"})
    producers = ET.SubElement(root, "producers")
    playlist = ET.SubElement(root, "playlist", attrib={"id": "main"})

    segments: List[Dict[str, Any]] = contract.get("segments") or contract.get("sceneSegments") or []
    media = contract.get("media")
    for idx, seg in enumerate(segments):
        if seg.get("action", "keep") == "remove":
            continue
        start_f, end_f = seg_frames(seg, fps)
        prod_id = f"clip{idx}"
        prod = ET.SubElement(producers, "producer", attrib={"id": prod_id})
        ET.SubElement(prod, "property", name="resource").text = media or ""
        ET.SubElement(prod, "property", name="in").text = str(start_f)
        ET.SubElement(prod, "property", name="out").text = str(max(start_f, end_f))
        entry = ET.SubElement(playlist, "entry", attrib={"producer": prod_id})
        ET.SubElement(entry, "property", name="in").text = str(start_f)
        ET.SubElement(entry, "property", name="out").text = str(max(start_f, end_f))

    # Guides from markers
    guides = ET.SubElement(root, "kdenlivetags")
    for idx, m in enumerate(contract.get("markers") or []):
        guide = ET.SubElement(guides, "tag")
        guide.set("time", str(int(round(float(m.get("timeSec", 0)) * fps))))
        guide.set("name", m.get("name", f"m{idx}"))

    return root


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--timeline", required=True, help="Ruta a timeline.json/otio.json")
    ap.add_argument("--mlt-out", required=False, help="Ruta de salida .mlt/.kdenlive")
    args = ap.parse_args()

    contract = load_timeline(args.timeline)
    mlt_root = build_mlt(contract)
    out_path = args.mlt_out or os.path.splitext(args.timeline)[0] + ".mlt"
    tree = ET.ElementTree(mlt_root)
    tree.write(out_path, encoding="utf-8", xml_declaration=True)
    print(f"MLT escrito en {out_path}")


if __name__ == "__main__":
    main()
