#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# AutoKit — OSS tool installer
#
# Installs the open-source Adobe suite replacements:
#   Premiere Pro  → Kdenlive (video editor) + FFmpeg
#   After Effects → Blender (VSE compositor) + Natron (VFX node-based)
#   Photoshop     → GIMP (image editor)
#   Audition      → Reaper (DAW — installed separately, see notes below)
#   STT           → whisper.cpp (speech-to-text)
#   Timeline      → opentimelineio (Python pip package)
#
# Usage:
#   bash scripts/install_oss.sh           # auto-detect OS
#   bash scripts/install_oss.sh --dry-run # print commands only
#   bash scripts/install_oss.sh --macos   # force macOS (Homebrew)
#   bash scripts/install_oss.sh --linux   # force Linux (apt)
#
# Notes on Reaper:
#   Reaper is free to evaluate and $60 for a personal license.
#   macOS: https://www.reaper.fm/download.php
#   Linux: https://www.reaper.fm/download.php (tar.xz installer)
#   After installing, set 'reaperPath' in config/local.json or .env.
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

DRY_RUN=false
FORCE_MACOS=false
FORCE_LINUX=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --macos)   FORCE_MACOS=true ;;
    --linux)   FORCE_LINUX=true ;;
  esac
done

run() {
  if [ "$DRY_RUN" = true ]; then
    echo "  [dry-run] $*"
  else
    "$@"
  fi
}

detect_os() {
  if [ "$FORCE_MACOS" = true ]; then echo "macos"; return; fi
  if [ "$FORCE_LINUX" = true ]; then echo "linux"; return; fi
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux)  echo "linux" ;;
    *) echo "unknown" ;;
  esac
}

OS=$(detect_os)
echo "🔧 AutoKit OSS installer — OS: $OS"
echo ""

# ─── macOS via Homebrew ──────────────────────────────────────────────────────
install_macos() {
  if ! command -v brew &>/dev/null; then
    echo "Homebrew not found. Install it from https://brew.sh and re-run this script."
    exit 1
  fi

  echo "→ Installing FFmpeg..."
  run brew install ffmpeg

  echo "→ Installing Kdenlive (Premiere Pro replacement)..."
  run brew install --cask kdenlive

  echo "→ Installing Blender (After Effects / VSE replacement)..."
  run brew install --cask blender

  echo "→ Installing GIMP (Photoshop replacement)..."
  run brew install --cask gimp

  echo "→ Installing Natron (VFX / AE replacement)..."
  # Natron not in Homebrew Cask; point to the official download
  echo "  ⚠️  Natron is not in Homebrew. Download from:"
  echo "      https://natrongithub.github.io/"
  echo "      After installing, set natronPath in config/local.json."

  echo "→ Installing whisper.cpp (STT)..."
  if command -v cmake &>/dev/null; then
    if [ "$DRY_RUN" = false ]; then
      TMP=$(mktemp -d)
      git clone --depth 1 https://github.com/ggerganov/whisper.cpp "$TMP/whisper.cpp"
      make -C "$TMP/whisper.cpp" -j4
      sudo cp "$TMP/whisper.cpp/main" /usr/local/bin/whisper.cpp
      echo "  whisper.cpp installed at /usr/local/bin/whisper.cpp"
      echo "  Download a model: bash $TMP/whisper.cpp/models/download-ggml-model.sh small"
    else
      echo "  [dry-run] Would build and install whisper.cpp from source"
    fi
  else
    echo "  cmake not found. Install it: brew install cmake"
  fi

  echo "→ Installing Python packages..."
  run pip3 install opentimelineio Pillow
}

# ─── Linux via apt (Ubuntu/Debian) ───────────────────────────────────────────
install_linux() {
  echo "→ Updating apt..."
  run sudo apt-get update -qq

  echo "→ Installing FFmpeg..."
  run sudo apt-get install -y ffmpeg

  echo "→ Installing Kdenlive (Premiere Pro replacement)..."
  run sudo apt-get install -y kdenlive

  echo "→ Installing Blender (After Effects / VSE replacement)..."
  run sudo apt-get install -y blender

  echo "→ Installing GIMP (Photoshop replacement)..."
  run sudo apt-get install -y gimp

  echo "→ Installing Natron (VFX / AE replacement)..."
  # Try snap first, then flatpak, then inform user
  if command -v snap &>/dev/null; then
    run sudo snap install natron || true
  elif command -v flatpak &>/dev/null; then
    run flatpak install -y flathub fr.natron.Natron || true
  else
    echo "  ⚠️  Natron: install via snap (sudo snap install natron)"
    echo "     or download from https://natrongithub.github.io/"
  fi

  echo "→ Installing whisper.cpp dependencies..."
  run sudo apt-get install -y build-essential cmake git

  if [ "$DRY_RUN" = false ]; then
    TMP=$(mktemp -d)
    git clone --depth 1 https://github.com/ggerganov/whisper.cpp "$TMP/whisper.cpp"
    make -C "$TMP/whisper.cpp" -j4
    sudo cp "$TMP/whisper.cpp/main" /usr/local/bin/whisper.cpp
    echo "  whisper.cpp installed at /usr/local/bin/whisper.cpp"
    echo "  Download a model: bash $TMP/whisper.cpp/models/download-ggml-model.sh small"
  else
    echo "  [dry-run] Would build whisper.cpp from source"
  fi

  echo "→ Installing Python packages..."
  run pip3 install opentimelineio Pillow
}

# ─── Reaper notes ─────────────────────────────────────────────────────────────
print_reaper_note() {
  echo ""
  echo "────────────────────────────────────────────────────────"
  echo "  Reaper (DAW — Audition replacement)"
  echo "────────────────────────────────────────────────────────"
  echo "  Reaper must be installed manually (free evaluation, \$60 license)."
  if [ "$OS" = "macos" ]; then
    echo "  macOS: https://www.reaper.fm/download.php"
    echo "  After installing, it will be at:"
    echo "    /Applications/REAPER64.app/Contents/MacOS/REAPER"
  else
    echo "  Linux: https://www.reaper.fm/download.php (tar.xz)"
    echo "  Extract and run the install-reaper.sh script."
  fi
  echo "  Then set reaperPath in config/local.json:"
  echo '    {"integrations":{"oss":{"reaperPath":"/path/to/REAPER"}}}'
  echo ""
}

# ─── Run ─────────────────────────────────────────────────────────────────────
case "$OS" in
  macos) install_macos ;;
  linux) install_linux ;;
  *)
    echo "Unsupported OS. Run with --macos or --linux to override."
    exit 1
    ;;
esac

print_reaper_note

echo "────────────────────────────────────────────────────────"
echo "  Installation complete!"
echo "  Run 'node server/src/index.js' then open http://localhost:8787"
echo "  Go to 'Más opciones → 6 · OSS Export' and click 'Check tools'"
echo "  to verify which tools are available."
echo "────────────────────────────────────────────────────────"
