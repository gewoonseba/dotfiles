#!/bin/bash
set -e

# Claude Code WorktreeCreate hook: place worktrees under ~/work/worktrees/<repo>/<name>
# instead of the default in-repo (.cloud) location.
#
# stdin JSON provides: .cwd (repo dir), .name (chosen worktree name).
# Contract: this hook replaces git's default behavior — it must create the
# worktree itself and print the absolute worktree path (and nothing else) on
# stdout. All git chatter is redirected to stderr so stdout stays clean.

INPUT=$(cat)
NAME=$(echo "$INPUT" | jq -r '.name // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')

[[ -z "$NAME" || -z "$CWD" ]] && exit 1

# Resolve the repository root and name from cwd (handles subdirectories).
REPO_ROOT=$(git -C "$CWD" rev-parse --show-toplevel) || exit 1
REPO_NAME=$(basename "$REPO_ROOT")

DEST="$HOME/work/worktrees/$REPO_NAME/$NAME"

# Base new worktrees on origin's default branch (Claude's 'fresh' default),
# falling back through common names and finally the current HEAD.
BASE=$(git -C "$REPO_ROOT" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)
if [[ -z "$BASE" ]]; then
  for cand in origin/main origin/master; do
    if git -C "$REPO_ROOT" rev-parse --verify --quiet "$cand" >/dev/null 2>&1; then
      BASE="$cand"
      break
    fi
  done
fi
[[ -z "$BASE" ]] && BASE=HEAD

mkdir -p "$(dirname "$DEST")"

# Prefer a new branch named "$NAME"; if it already exists, check it out;
# failing that, fall back to a detached worktree.
if git -C "$REPO_ROOT" worktree add -b "$NAME" "$DEST" "$BASE" 1>&2; then
  :
elif git -C "$REPO_ROOT" worktree add "$DEST" "$NAME" 1>&2; then
  :
else
  git -C "$REPO_ROOT" worktree add --detach "$DEST" "$BASE" 1>&2
fi

echo "$DEST"
