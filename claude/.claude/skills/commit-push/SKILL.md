---
name: commit-push
description: Commit all changes with a descriptive message and push to remote
---

# Commit and Push

Commit all staged and unstaged changes with a descriptive commit message, then push to the remote.

## Steps

1. Run `git status` to see all changes (staged and unstaged)
2. Run `git diff` to understand what changed
3. Run `git log -5 --oneline` to see recent commit message style
4. Stage all relevant changes with `git add` (prefer specific files over `git add .`)
5. Create a commit with a descriptive message that:
   - Summarizes the nature of the changes (feat, fix, refactor, etc.)
   - Focuses on the "why" rather than the "what"
   - Follows the repository's commit message style
   - Ends with: `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`
6. Push to the remote with `git push` (use `-u origin <branch>` if needed)
7. Run `git status` to verify success
