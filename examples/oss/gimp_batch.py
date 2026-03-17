"""
AutoKit → GIMP batch adapter (Photoshop replacement).

Performs image operations in batch using GIMP's Script-Fu or, when GIMP is
not available, falls back to pure-Python pillow.

Supported operations:
  thumbnail   - resize to --width x --height (letterbox, no stretch)
  sharpen     - apply unsharp-mask sharpening
  normalize   - levels auto-normalize (brightness/contrast)
  export      - convert format (e.g. PNG→JPG) with optional quality
  scriptfu    - pass arbitrary --script to GIMP Script-Fu batch

Usage:
    python gimp_batch.py --input src.jpg --output thumb.jpg --op thumbnail --width 1280 --height 720
    python gimp_batch.py --input src.png --output out.jpg --op export --quality 85
    python gimp_batch.py --input src.jpg --output out.jpg --op scriptfu \\
        --script "(gimp-brightness-contrast (car (gimp-file-load ...)) 20 10)"

Fallback (no GIMP):
    Uses Pillow if installed: pip install Pillow
"""

import argparse
import os
import subprocess
import sys
import tempfile
from typing import Optional


# ─── Pillow fallback ──────────────────────────────────────────────────────────

def _pillow_available() -> bool:
    try:
        import PIL  # noqa
        return True
    except ImportError:
        return False


def _pillow_thumbnail(src: str, dst: str, width: int, height: int, quality: int = 88):
    from PIL import Image
    img = Image.open(src).convert("RGB")
    img.thumbnail((width, height), Image.LANCZOS)
    # pad to exact size (letterbox)
    padded = Image.new("RGB", (width, height), (0, 0, 0))
    x = (width - img.width) // 2
    y = (height - img.height) // 2
    padded.paste(img, (x, y))
    padded.save(dst, quality=quality)


def _pillow_sharpen(src: str, dst: str):
    from PIL import Image, ImageFilter
    img = Image.open(src)
    sharpened = img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=120, threshold=3))
    sharpened.save(dst)


def _pillow_normalize(src: str, dst: str):
    from PIL import Image, ImageOps
    img = Image.open(src)
    if img.mode != "RGB":
        img = img.convert("RGB")
    img = ImageOps.autocontrast(img)
    img.save(dst)


def _pillow_export(src: str, dst: str, quality: int = 88):
    from PIL import Image
    img = Image.open(src).convert("RGB")
    img.save(dst, quality=quality)


# ─── GIMP Script-Fu runner ────────────────────────────────────────────────────

def _gimp_scriptfu(gimp_bin: str, src: str, dst: str, script: str, dry_run: bool = False) -> bool:
    """Run an arbitrary Script-Fu expression in GIMP batch mode."""
    batch = f"""(let* ((image (car (gimp-file-load RUN-NONINTERACTIVE "{src}" "{src}")))
                       (drawable (car (gimp-image-get-active-drawable image))))
               {script}
               (file-jpeg-save RUN-NONINTERACTIVE image drawable "{dst}" "{dst}" 0.88 0 0 0 "" 0 1 0 2 0)
               (gimp-quit 0))"""
    cmd = [gimp_bin, "-i", "-b", batch]
    if dry_run:
        print("DRY:", " ".join(cmd))
        return True
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True, timeout=60)
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"GIMP error: {e.stderr}", file=sys.stderr)
        return False


def _gimp_thumbnail(gimp_bin: str, src: str, dst: str, width: int, height: int) -> bool:
    script = f"""(gimp-image-scale-full image {width} {height} INTERPOLATION-LINEAR)"""
    return _gimp_scriptfu(gimp_bin, src, dst, script)


# ─── main ─────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="AutoKit GIMP batch adapter")
    ap.add_argument("--input", required=True, help="Source image path")
    ap.add_argument("--output", required=True, help="Output image path")
    ap.add_argument("--op", default="thumbnail",
                    choices=["thumbnail", "sharpen", "normalize", "export", "scriptfu"],
                    help="Operation to perform")
    ap.add_argument("--width", type=int, default=1280, help="Target width (thumbnail)")
    ap.add_argument("--height", type=int, default=720, help="Target height (thumbnail)")
    ap.add_argument("--quality", type=int, default=88, help="JPEG quality (1-100)")
    ap.add_argument("--script", default="", help="Custom Script-Fu expression (op=scriptfu)")
    ap.add_argument("--gimp", default="", help="Path to GIMP binary (optional)")
    ap.add_argument("--dry-run", action="store_true", help="Print commands without executing")
    args = ap.parse_args()

    if not os.path.isfile(args.input):
        print(f"Input not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)

    gimp_bin = args.gimp or ""

    # Try GIMP first for scriptfu; fall back to Pillow for everything else
    if args.op == "scriptfu" and gimp_bin:
        ok = _gimp_scriptfu(gimp_bin, args.input, args.output, args.script, dry_run=args.dry_run)
        sys.exit(0 if ok else 1)

    if args.op == "thumbnail" and gimp_bin:
        ok = _gimp_thumbnail(gimp_bin, args.input, args.output, args.width, args.height)
        if ok:
            print(f"Thumbnail saved → {args.output}")
            sys.exit(0)
        # fall through to Pillow

    if not _pillow_available():
        print("Pillow not installed. Run: pip install Pillow", file=sys.stderr)
        print("Or provide --gimp <path-to-gimp> for GIMP-based processing.", file=sys.stderr)
        sys.exit(1)

    if args.op == "thumbnail":
        _pillow_thumbnail(args.input, args.output, args.width, args.height, args.quality)
    elif args.op == "sharpen":
        _pillow_sharpen(args.input, args.output)
    elif args.op == "normalize":
        _pillow_normalize(args.input, args.output)
    elif args.op == "export":
        _pillow_export(args.input, args.output, args.quality)
    elif args.op == "scriptfu":
        print("scriptfu requires --gimp <binary>", file=sys.stderr)
        sys.exit(1)

    print(f"{args.op} → {args.output}")


if __name__ == "__main__":
    main()
