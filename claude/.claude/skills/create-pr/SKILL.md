---
name: create-pr
description: Create a pull request for the current branch
---

# Create Pull Request

Create a pull request for the current branch. Assume the user is happy with the current branch state and wants it up for review — commit and push anything that's missing without asking.

## Steps

1. Run `git status` and `git log @{u}..HEAD --oneline 2>/dev/null` (and `git log main..HEAD --oneline`) in parallel to assess: uncommitted changes, unpushed commits, branch divergence from main.
2. If there are uncommitted changes (staged or unstaged, including untracked files that belong with the work):
   - Stage them with `git add` (specific files — never `.env`, credentials, or large binaries)
   - Create a commit with a concise message describing the why, following the repo's commit style (check `git log --oneline -10` if unsure)
   - Use the Co-Authored-By footer per the global commit guidelines
3. If the branch has no upstream or has unpushed commits, push with `git push -u origin <branch>` (or plain `git push` if upstream exists).
4. Run `git diff main...HEAD` to understand the full scope of changes for the PR description.
5. Create the PR using `gh pr create` with:
   - A short title (under 70 characters)
   - A body containing:
     - `## Summary` with 1-3 bullet points covering all commits in the branch (not just the latest)
     - If there is a linked GitHub issue in the conversation context, add `Closes #<issue_number>` so the issue auto-closes when the PR is merged
     - Footer: `Generated with [Claude Code](https://claude.com/claude-code)`
6. Return the PR URL to the user.

## Notes

- Never use `--no-verify` or skip hooks. If a pre-commit hook fails, fix the underlying issue and create a new commit.
- Never force-push.
- If the current branch is `main` (or the repo's default branch), stop and tell the user — don't create a PR from main.
