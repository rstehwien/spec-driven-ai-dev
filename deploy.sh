#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="${SCRIPT_DIR}/skills/human-gated-spec-driven-ai-development"
SKILL_NAME="human-gated-spec-driven-ai-development"

if [[ ! -d "${SOURCE_DIR}" ]]; then
  echo "Source skill directory not found: ${SOURCE_DIR}" >&2
  exit 1
fi

deploy_skill() {
  local tool_root="$1"
  local tool_name="$2"
  local skills_dir="${tool_root}/skills"
  local target_dir="${skills_dir}/${SKILL_NAME}"

  if [[ ! -d "${skills_dir}" ]]; then
    echo "Skipping ${tool_name}: skills directory not found at ${skills_dir}"
    return 0
  fi

  rm -rf "${target_dir}"
  ln -s "${SOURCE_DIR}" "${target_dir}"
  echo "Linked ${target_dir} -> ${SOURCE_DIR}"
}

deploy_skill "${HOME}/.claude" ".claude"
deploy_skill "${HOME}/.codex" ".codex"
# copilot will read the .claude/skills directory, so we don't need to deploy it separately