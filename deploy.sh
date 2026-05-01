#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/skills/human-gated-spec-driven-ai-development"

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "Source skill directory not found: ${SOURCE_DIR}" >&2
  exit 1
fi

for TARGET_DIR in "${HOME}/.claude/skills/human-gated-spec-driven-ai-development" \
                  "${HOME}/.codex/skills/human-gated-spec-driven-ai-development"; do
  mkdir -p "$(dirname "${TARGET_DIR}")"
  rm -rf "${TARGET_DIR}"
  ln -s "${SOURCE_DIR}" "${TARGET_DIR}"
  echo "Linked ${TARGET_DIR} -> ${SOURCE_DIR}"
done
