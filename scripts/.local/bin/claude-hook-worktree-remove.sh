#!/bin/bash

# Claude Code WorktreeRemove hook: remove a worktree created by the
# WorktreeCreate hook. stdin JSON provides .worktree_path.
#
# Per the hook contract, failures are logged (debug only) and never block
# removal, so this always exits 0.

INPUT=$(cat)
WT_PATH=$(echo "$INPUT" | jq -r '.worktree_path // empty')

[[ -z "$WT_PATH" ]] && exit 0

# Run git from the main worktree, not from inside the one being removed.
COMMON=$(git -C "$WT_PATH" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)
MAIN=""
[[ -n "$COMMON" ]] && MAIN=$(dirname "$COMMON")
RUN_DIR="${MAIN:-$WT_PATH}"

git -C "$RUN_DIR" worktree remove --force "$WT_PATH" 2>/dev/null || true
git -C "$RUN_DIR" worktree prune 2>/dev/null || true

exit 0
