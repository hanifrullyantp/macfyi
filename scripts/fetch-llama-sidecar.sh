#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/src-tauri/resources/llama"

VERSION="b8148"
ARM_URL="https://github.com/ggml-org/llama.cpp/releases/download/${VERSION}/llama-${VERSION}-bin-macos-arm64.tar.gz"
X64_URL="https://github.com/ggml-org/llama.cpp/releases/download/${VERSION}/llama-${VERSION}-bin-macos-x64.tar.gz"

ARM_SHA256="019e96a3cffcfbaa22d046719450b2c7efd4e6d2423b8212691972f830c8ee71"
X64_SHA256="919d70025654b80bc70e3c1436acd2bbfc34073c907ef3fba8c7c8c45cb3ae00"

ARCH="$(uname -m)"
if [[ "${ARCH}" == "arm64" ]]; then
  URL="${ARM_URL}"
  EXPECTED="${ARM_SHA256}"
elif [[ "${ARCH}" == "x86_64" ]]; then
  URL="${X64_URL}"
  EXPECTED="${X64_SHA256}"
else
  echo "Unsupported arch: ${ARCH}" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

TGZ="${TMP}/llama.tgz"
echo "Downloading llama.cpp sidecar (${VERSION}) for ${ARCH}..."
curl -L -o "${TGZ}" "${URL}"

ACTUAL="$(shasum -a 256 "${TGZ}" | awk '{print $1}')"
if [[ "${ACTUAL}" != "${EXPECTED}" ]]; then
  echo "SHA256 mismatch for llama.cpp archive." >&2
  echo "Expected: ${EXPECTED}" >&2
  echo "Actual:   ${ACTUAL}" >&2
  exit 1
fi

rm -rf "${OUT_DIR:?}/"*
tar -xzf "${TGZ}" -C "${TMP}"

# archive contains ./llama-b8148/*
cp -R "${TMP}/llama-${VERSION}/"* "${OUT_DIR}/"

echo "${VERSION}" > "${OUT_DIR}/VERSION"
echo "OK. Sidecar extracted to ${OUT_DIR}"

