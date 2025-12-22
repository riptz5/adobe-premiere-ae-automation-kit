#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR_DIR="${ROOT_DIR}/server/vendor/whisper.cpp"
MODEL_DIR="${ROOT_DIR}/server/models"
MODEL_NAME="ggml-small.bin"
MODEL_PATH="${MODEL_DIR}/${MODEL_NAME}"

echo "[setup] root: ${ROOT_DIR}"
echo "[setup] vendor: ${VENDOR_DIR}"
echo "[setup] model: ${MODEL_PATH}"

mkdir -p "${MODEL_DIR}"

if [ ! -d "${VENDOR_DIR}" ]; then
  echo "[setup] cloning whisper.cpp..."
  git clone https://github.com/ggerganov/whisper.cpp "${VENDOR_DIR}"
fi

if [ ! -f "${MODEL_PATH}" ]; then
  echo "[setup] downloading model ${MODEL_NAME}..."
  curl -L -o "${MODEL_PATH}" "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}"
fi

echo "[setup] building whisper.cpp (metal enabled)..."
cd "${VENDOR_DIR}"
make clean >/dev/null 2>&1 || true
WHISPER_METAL=1 make -j

echo "[setup] done"
