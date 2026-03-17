"""
AutoKit → Natron batch hooks.

- Lee TimelineContract y dispara renders por segmento filtrado por label.
- Útil para mandar planos VFX rápidamente.

Uso:
    python natron_batch.py --timeline timeline.json --template comps/base.ntp --label vfx --output-dir /tmp/renders --run

Sin --run realiza dry-run (imprime comandos).
"""

import argparse
import json
import os
import subprocess
from typing import Dict, Any, List


def load_contract(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "contract" in data:
        return data["contract"]
    return data


def filter_segments(contract: Dict[str, Any], label: str) -> List[Dict[str, Any]]:
    segs = contract.get("segments") or contract.get("sceneSegments") or []
    return [s for s in segs if str(s.get("label", "")).lower() == label.lower()]


def run_natron(template: str, start: float, end: float, output_path: str, dry_run: bool):
    cmd = ["natronrender", "-w", template, "-o", output_path]
    env = os.environ.copy()
    env["AUTOKIT_SEG_START"] = str(start)
    env["AUTOKIT_SEG_END"] = str(end)
    if dry_run:
        print("DRY:", " ".join(cmd))
        return True
    try:
        res = subprocess.run(cmd, check=True, capture_output=True, text=True, env=env)
        print(res.stdout)
        return True
    except Exception as err:
        print(f"Natron error: {err}")
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--timeline", required=True, help="Ruta a timeline.json")
    ap.add_argument("--template", required=True, help="Plantilla .ntp")
    ap.add_argument("--label", default="vfx", help="Label de segmento a renderizar")
    ap.add_argument("--output-dir", default=None, help="Directorio de salida")
    ap.add_argument("--run", action="store_true", help="Ejecutar natronrender (por defecto dry-run)")
    args = ap.parse_args()

    contract = load_contract(args.timeline)
    segments = filter_segments(contract, args.label)
    if not segments:
        print("No hay segmentos con label", args.label)
        return

    out_dir = args.output_dir or os.path.dirname(os.path.abspath(args.timeline))
    os.makedirs(out_dir, exist_ok=True)

    for idx, seg in enumerate(segments):
        start = float(seg.get("start", 0.0))
        end = float(seg.get("end", start))
        out_path = os.path.join(out_dir, f"{contract.get('id','job')}_{args.label}_{idx+1:02d}.mov")
        run_natron(args.template, start, end, out_path, dry_run=not args.run)


if __name__ == "__main__":
    main()
