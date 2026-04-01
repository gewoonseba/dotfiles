---
name: commit-push-pr
description: Commit all changes, push to remote, and create a pull request
---

# Commit, Push, and Create PR

Commit all staged and unstaged changes with a descriptive commit message, push to the remote, and create a pull request — all in one go.

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
6. Push to the remote with `git push -u origin <branch>`
7. Run `git log main..HEAD --oneline` to see all commits that will be in the PR
8. Create the PR using `gh pr create` with:
   - A short title (under 70 characters)
   - A body containing:
     - `## Summary` with 1-3 bullet points
     - If there is a linked GitHub issue in the conversation context, add `Closes #<issue_number>` so the issue auto-closes when the PR is merged
     - Footer: `Generated with [Claude Code](https://claude.com/claude-code)`
9. Return the PR URL to the user
