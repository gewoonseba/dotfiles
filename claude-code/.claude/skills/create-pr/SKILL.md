---
name: create-pr
description: Create a pull request for the current branch
---

# Create Pull Request

Create a pull request for the current branch.

## Steps

1. Run `git status` to check current branch and working tree status
2. Run `git log main..HEAD --oneline` to see all commits that will be in the PR
3. Run `git diff main...HEAD` to understand the full scope of changes
4. Check if the branch is pushed to remote; if not, push with `git push -u origin <branch>`
5. Create the PR using `gh pr create` with:
   - A short title (under 70 characters)
   - A body containing:
     - `## Summary` with 1-3 bullet points
     - If there is a linked GitHub issue in the conversation context, add `Closes #<issue_number>` so the issue auto-closes when the PR is merged
     - Footer: `Generated with [Claude Code](https://claude.com/claude-code)`
6. Return the PR URL to the user
