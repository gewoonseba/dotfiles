#!/bin/bash
set -e

# Claude Code PostToolUse hook: auto-lint frontend files after Edit/Write
# Reads hook JSON from stdin, checks if the changed file is in services/frontend/,
# and runs eslint --fix on just that file.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only act on frontend source files
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

if [[ ! "$FILE_PATH" == */services/frontend/* ]]; then
  exit 0
fi

if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

# Find project root
PROJECT_ROOT=$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null || true)

if [[ -z "$PROJECT_ROOT" ]] || [[ ! -d "$PROJECT_ROOT/services/frontend" ]]; then
  exit 0
fi

cd "$PROJECT_ROOT"
npx eslint --fix "$FILE_PATH" 2>/dev/null || true
