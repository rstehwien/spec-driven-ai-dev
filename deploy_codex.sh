#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/skills/human-gated-spec-driven-ai-development"
TARGET_DIR="${HOME}/.codex/skills/human-gated-spec-driven-ai-development"

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "Source skill directory not found: ${SOURCE_DIR}" >&2
  exit 1
fi

rm -rf "${TARGET_DIR}"
mkdir -p "$(dirname "${TARGET_DIR}")"
cp -R "${SOURCE_DIR}" "${TARGET_DIR}"

echo "Deployed skill to ${TARGET_DIR}"
